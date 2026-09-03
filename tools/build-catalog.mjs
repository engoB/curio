#!/usr/bin/env node
/**
 * Curio — catalogue d'anecdotes
 * ===========================================================================
 * Ce script ne remplace jamais votre catalogue : il l'AGRANDIT.
 *
 *   node tools/build-catalog.mjs --add 500
 *      → ajoute 500 nouveaux sujets par univers, vérifiés, sans doublon,
 *        en conservant intégralement ce qui existe déjà.
 *
 *   node tools/build-catalog.mjs --add 800 --univers mysteres
 *      → n'agrandit qu'un seul univers.
 *
 *   node tools/build-catalog.mjs --verifier
 *      → recontrôle tout le catalogue existant et retire les articles
 *        supprimés de Wikipédia (rare). Aucun ajout.
 *
 * Garde-fous
 * ---------------------------------------------------------------------------
 *  · Le catalogue existant est relu et réinjecté au début de chaque exécution.
 *  · L'écriture est atomique : le fichier n'est remplacé qu'une fois complet.
 *  · Le script REFUSE d'écrire un catalogue plus petit que l'ancien, sauf en
 *    mode --verifier explicite. Une exécution ratée ne peut rien effacer.
 *  · Tout est versionné dans Git : chaque génération est un commit annulable.
 *
 * Classement
 * ---------------------------------------------------------------------------
 * Les sujets sont classés par notoriété : le nombre d'éditions linguistiques
 * de Wikipédia qui possèdent un article dessus (via Wikidata). « Toungouska »
 * existe dans une soixantaine de langues, un astéroïde quelconque dans trois.
 * Gratuit, récupérable par lots de 50, stable dans le temps.
 * L'option --vues affine ensuite avec les consultations réelles sur 12 mois.
 *
 * Chaque sujet retenu est vérifié avant d'entrer au catalogue : l'article
 * existe, son introduction fait au moins 420 caractères, et il a une image.
 * Le compte affiché est donc un compte réel, utilisable en argument de vente.
 * ===========================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const CONTACT = process.env.CURIO_CONTACT || 'https://github.com/votre-compte/curio';
const UA      = 'CurioCatalogBuilder/2.1 (' + CONTACT + ')';
const CACHE = path.join(process.cwd(), 'tools', '.cache');
const OUT   = path.join(process.cwd(), 'catalog.json');

/* ------------------------------------------------------------------ options */
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i+1]; return (v && !v.startsWith('--')) ? v : true; };
const ADD        = parseInt(opt('add', '0'), 10) || 0;
const VERIFY_ALL = !!opt('verifier', false);
const WITH_VIEWS = !!opt('vues', false);
const DEPTH      = parseInt(opt('profondeur', '2'), 10);   // 3 explose le nombre de branches
const MAX_POOL   = parseInt(opt('pool', '6000'), 10);      // borne du bassin de candidats
const ONLY       = opt('univers', null);
const EXTRA_CATS = (opt('categories', '') || '').toString().split(',').map(s => s.trim()).filter(Boolean);
/* D'où viennent les sujets :
 *   insolite   — uniquement les listes d'articles insolites (rapide, très ciblé)
 *   saviez     — uniquement « Le saviez-vous ? » / Did you know (la mine la
 *                plus profonde : des milliers d'accroches écrites à la main)
 *   categories — uniquement le parcours des catégories (large, notoriété)
 *   tout       — les deux, les listes d'abord (défaut)                        */
const SOURCE = String(opt('source', 'tout') || 'tout');
const RECLASSER = !!opt('reclasser', false);   // recalculer les potentiels, sans reseau
const NETTOYER  = !!opt('nettoyer', false);   // retirer les doublons deja entres, sans reseau
const MODE_MAITRE = !!opt('maitre', false);   // construire le catalogue maitre (la reference)
const PURGER    = !!opt('purger', false);     // sortir du maitre tout ce qui est dans exclusions.txt
const ACCORDER  = !!opt('accorder', false);   // (re)mesurer l accord phrase/article, sans reseau
const RANGER    = !!opt('ranger', false);     // remettre chaque sujet dans son univers, sans reseau
const AUDITER   = !!opt('auditer', false);    // passe qualite sur les seuls sujets RETENUS
const APPLIQUER = !!opt('appliquer', false);  // ... et ecarter ceux qui echouent

/* ------------------------------------------------------- univers & racines
   Huit univers, les mêmes que dans parts/20-data.js — identifiants, teintes,
   noms et descriptions compris. Ces deux listes décrivent la même chose ;
   quand elles divergent, l'application et le catalogue ne parlent plus du
   même produit. Toute modification ici doit être reportée là-bas.

   Les racines des anciennes listes « insolite » (canulars, curiosités,
   paradoxes, superlatifs) sont réparties entre Mystères et Sciences : la
   moisson curée ci-dessous couvre ce terrain bien mieux qu'une catégorie. */
const UNIVERSES = [
  { id:'cosmos',   hue:196, free:true,
    fr:{name:'Cosmos', desc:"Nous tombons vers un point du ciel que personne n'a jamais vu."},
    en:{name:'Cosmos', desc:'We are falling towards a point in the sky nobody has ever seen.'},
    roots:['Astronomical objects','Space exploration','Astrophysics','Planetary science','Cosmology'] },

  { id:'vivant',   hue:148, free:true,
    fr:{name:'Le Vivant', desc:'Certains animaux refusent de mourir. D’autres pilotent les vivants.'},
    en:{name:'Living World', desc:'Some animals refuse to die. Others drive the living.'},
    roots:['Zoology','Botany','Marine biology','Ethology','Evolutionary biology','Mycology'] },

  { id:'histoire', hue:28, free:true,
    fr:{name:'Histoire oubliée', desc:'Un pape jugé neuf mois après sa mort. Ce n’est pas une légende.'},
    en:{name:'Forgotten History', desc:'A pope tried nine months after his death. This is not a legend.'},
    roots:['Historical eras','Ancient history','Middle Ages','Early modern period','Disasters by type','Hoaxes'] },

  { id:'esprit',   hue:320, free:true,
    fr:{name:'Corps & Esprit', desc:'Des gens voient sans le savoir. D’autres ne voient rien en fermant les yeux.'},
    en:{name:'Body & Mind', desc:'Some people see without knowing it. Others see nothing when they close their eyes.'},
    roots:['Neuroscience','Cognitive science','Human body','Psychological theories','Neurological disorders'] },

  { id:'sciences', hue:262, free:true,
    fr:{name:'Sciences & Inventions', desc:'Il avait raison sur ce qui tuait les mères. On l’a interné.'},
    en:{name:'Science & Invention', desc:'He was right about what was killing the mothers. They committed him.'},
    roots:['Physics','Chemistry','Inventions','History of science','Materials','Eponymous laws','Paradoxes'] },

  { id:'mysteres', hue:8, free:true,
    fr:{name:'Mystères', desc:'Un homme sur une plage, toutes les étiquettes découpées, aucun nom.'},
    en:{name:'Mysteries', desc:'A man on a beach, every label cut out, no name.'},
    roots:['Unexplained disappearances','Unsolved deaths','Undeciphered writing systems','Cryptids',
           'Paranormal','Unsolved problems','Curiosities','Superlatives'] },

  { id:'terre',    hue:178, free:true,
    fr:{name:'Terre & Océans', desc:'Un lac a soufflé une nuit. Mille sept cent quarante-six personnes dormaient.'},
    en:{name:'Earth & Oceans', desc:'A lake exhaled one night. One thousand seven hundred and forty-six people were asleep.'},
    roots:['Earth sciences','Geology','Oceanography','Volcanology','Meteorology','Landforms'] },

  { id:'arts',     hue:44, free:true,
    fr:{name:'Arts & Civilisations', desc:'Une couleur que les peintres ont enterrée dans un jardin.'},
    en:{name:'Art & Civilisations', desc:'A colour painters buried in a garden.'},
    roots:['Art history','Archaeology','Architectural history','Ancient civilizations','Cultural heritage'] }
];

/* ═══════════════ ajouter un univers sans rien casser ═══════════════════════
   Les huit univers ci-dessus sont écrits dans le code, mais ils ne sont pas
   une limite : consignes/univers.txt en ajoute autant que vous voulez, et
   l'application les découvre toute seule — elle lit la liste des univers dans
   catalog.json et complète la sienne. Rien de ce qui existe n'est touché.

       reddit | 268 | Histoires vraies | Ce que les gens racontent quand ils
       croient que personne ne les lit. | True Stories | What people tell when
       they think nobody is reading.

   soit : identifiant | teinte (0-360) | nom FR | description FR | nom EN |
   description EN. Les deux derniers champs sont facultatifs.
   L'identifiant devient utilisable dans sujets-phares.txt le jour même.   */
async function universSupplementaires(){
  let brut = '';
  try{ brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'univers.txt'), 'utf8'); }
  catch{ return 0; }
  let n = 0;
  for (const l of brut.split(/\r?\n/)){
    const t = l.trim();
    if (!t || t.startsWith('#') || !t.includes('|')) continue;
    const c = t.split('|').map(x => x.trim());
    const id = (c[0] || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    if (!id || UNIVERSES.some(u => u.id === id)) continue;
    UNIVERSES.push({
      id, hue: parseInt(c[1], 10) || 200, free: true,
      fr: { name: c[2] || id, desc: c[3] || '' },
      en: { name: c[4] || c[2] || id, desc: c[5] || c[3] || '' }
    });
    n++;
    console.log(`  + univers « ${id} » ajouté depuis consignes/univers.txt`);
  }
  return n;
}

/* Le graphe des catégories de Wikipédia part très vite en vrille : à trois
   niveaux de « Zoology » on tombe sur « Songs about invertebrates ». Ce filtre
   coupe les branches biographiques, géographiques, œuvres et maintenance. */
const SKIP_CAT = new RegExp([
  'stub','by year','by decade','by century','by country','by nationality','by continent','by city','by state',
  'births','deaths','people','biography','biographies','writers','scientists','artists','painters','architects',
  'historians','geologists','astronomers','biologists','physicians','engineers','photographers','sculptors',
  'songs','albums','novels','films','movies','television','video games','comics','fiction','literature about',
  'awards','competitions','organizations','institutes','societies','journals','magazines','museums of',
  'universities','schools','companies','manufacturers','sports','olympic','military units',
  'Wikipedia','Articles','template','redirect','disambiguation','maintenance','images','media',
  'lists of','list of','categories','navigational','portals','WikiProject','terminology','glossaries'
].join('|'), 'i');
const SKIP_ART = /^(List of|Lists of|Index of|Outline of|Timeline of|Glossary of|Bibliography of|Comparison of|Portal:|Category:|Template:|Draft:)/i;

/* ---------------------------------------------------------------- réseau */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const cacheKey = s => s.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);

let calls = 0, waited = 0;

/* Limiteur de débit : Wikimedia renvoie HTTP 429 dès qu'on va trop vite.
   On sérialise tous les appels avec un intervalle minimum, ajusté à la hausse
   dès qu'un 429 apparaît, et redescendu doucement quand tout va bien. */
let interval = parseInt(opt('intervalle', '260'), 10) || 260;   // ms entre deux appels

/* ═══════════════ LE BUDGET DE TEMPS ═══════════════════════════════════════
   Wikipédia impose une cadence — 260 ms entre deux appels, et jusqu'à trois
   secondes quand elle nous freine. Une moisson complète, c'est des dizaines
   de milliers d'appels : elle NE PEUT PAS tenir dans une exécution, et il ne
   faut surtout pas la laisser essayer. Une exécution de six heures tuée par
   la limite de GitHub, c'est six heures perdues et rien d'enregistré.

   On se donne donc un temps, et on s'y tient. Ce qui n'a pas été fait sera
   fait à la prochaine passe : le catalogue maître est ADDITIF, et la nuit
   suivante reprend là où on s'est arrêté. Trois nuits valent mieux qu'une
   exécution qui n'aboutit jamais.

   Le cache des réponses, lui, est conservé d'une exécution à l'autre : la
   deuxième nuit ne refait pas le travail de la première, elle le prolonge. */
const MINUTES = parseFloat(opt('minutes', '40')) || 40;
const DEPART  = Date.now();
const ECHEANCE = DEPART + MINUTES * 60000;
let budgetAnnonce = false;
/* Vrai dès que quoi que ce soit a été remis à la passe suivante — temps
   écoulé, plafond de vérification, recherches reportées. Le nettoyage du
   fichier de sujets phares s'en sert pour ne pas confondre « passe
   écourtée », qui est normal, et « incident réseau », qui ne l'est pas. */
let passePartielle = false;

function tempsRestant(){ return ECHEANCE - Date.now(); }
function tempsEcoule(){
  if (Date.now() < ECHEANCE) return false;
  passePartielle = true;
  if (!budgetAnnonce){
    budgetAnnonce = true;
    console.log(`\n⏱  Les ${MINUTES} minutes de cette passe sont écoulées.`);
    console.log(`   On enregistre ce qui est fait ; la prochaine reprendra la suite.`);
    console.log(`   Ce n'est pas une erreur : c'est ainsi qu'une grosse moisson se fait,`);
    console.log(`   en plusieurs nuits, sans jamais rien perdre.`);
  }
  return true;
}
function minutesFaites(){ return ((Date.now() - DEPART) / 60000).toFixed(1); }
let lastCall = 0;
async function gate(){
  const wait = Math.max(0, lastCall + interval - Date.now());
  if (wait > 0){ waited += wait; await sleep(wait); }
  lastCall = Date.now();
}

async function api(url, tries = 8){
  let last = 'inconnue';
  for (let i = 0; i < tries; i++){
    /* Huit tentatives espacées, c'est quarante secondes pour UN appel qui
       échoue. Multiplié par quelques centaines d'appels malheureux, c'est là
       que passaient les heures. Quand le budget est épuisé, on renonce tout
       de suite : l'appelant enregistrera ce qu'il a. */
    if (i > 0 && tempsEcoule()) break;
    await gate();
    try{
      const r = await fetch(url, { headers:{ 'User-Agent': UA, 'Accept':'application/json' } });

      if (r.status === 429){
        // on ralentit durablement, et on respecte le délai demandé s'il est donné
        interval = Math.min(3000, Math.round(interval * 1.8));
        const ra = parseInt(r.headers.get('retry-after') || '0', 10);
        const pause = ra > 0 ? Math.min(120000, ra * 1000) : Math.min(60000, 4000 * (i + 1));
        console.log(`    · limite atteinte, pause de ${Math.round(pause/1000)} s (cadence ramenée à ${interval} ms)`);
        await sleep(pause);
        last = 'HTTP 429';
        continue;
      }
      if (r.status === 403 || r.status >= 500){
        last = 'HTTP ' + r.status;
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status + ' sur ' + url.slice(0, 140));

      calls++;
      // tout va bien : on accélère très progressivement vers la cadence de base
      if (calls % 40 === 0 && interval > 260) interval = Math.max(260, Math.round(interval * 0.9));

      const j = await r.json();
      if (j && j.error) throw new Error('API : ' + (j.error.info || j.error.code));
      return j;
    }catch(e){
      last = e.message;
      if (i === tries - 1) break;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(last + ' — ' + url.slice(0, 140));
}

async function cached(key, fn){
  const f = path.join(CACHE, cacheKey(key) + '.json');
  try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch {}
  const v = await fn();
  if (v !== undefined && v !== null){
    try { await fs.writeFile(f, JSON.stringify(v)); } catch {}
  }
  return v;
}

/* ------------------------------------------------ 1. parcours des catégories */
async function crawl(root, depth, seenCats, pool, level = 0){
  if (depth < 0 || pool.size >= MAX_POOL) return;
  const members = await cached('cat_' + root + '_' + depth, async () => {
    const acc = []; let cont = '';
    do{
      const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
        + '&list=categorymembers&cmtitle=' + encodeURIComponent('Category:' + root)
        + '&cmlimit=500&cmtype=page|subcat' + (cont ? '&cmcontinue=' + encodeURIComponent(cont) : '');
      const j = await api(url);
      (j?.query?.categorymembers || []).forEach(m => acc.push({ ns:m.ns, title:m.title }));
      cont = j?.continue?.cmcontinue || '';
    } while (cont && acc.length < 3000);
    return acc;
  });

  const subs = [];
  for (const m of members){
    if (m.ns === 14){
      const name = m.title.replace(/^Category:/, '');
      if (!SKIP_CAT.test(name) && !seenCats.has(name)){ seenCats.add(name); subs.push(name); }
    } else if (m.ns === 0 && !SKIP_ART.test(m.title)){
      // on garde la profondeur à laquelle le sujet a été trouvé : plus c'est
      // proche de la racine, plus le sujet est central pour cet univers
      if (!pool.has(m.title)) pool.set(m.title, level);
    }
  }
  for (const sub of subs){
    if (pool.size >= MAX_POOL) break;
    await crawl(sub, depth - 1, seenCats, pool, level + 1);
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
 * SOURCE CURÉE : les listes d'articles insolites tenues par les wikipédiens
 * ───────────────────────────────────────────────────────────────────────────
 * Le parcours par catégories trouve des sujets NOTOIRES. Il ne sait pas dire
 * si un sujet est ÉTONNANT. Ces listes-là, si : ce sont des pages que des
 * contributeurs entretiennent à la main depuis des années, avec un critère
 * d'entrée explicite — « quelque chose qu'une personne raisonnable ne
 * s'attendrait pas à trouver dans une encyclopédie ».
 *
 * Chaque entrée arrive avec, en prime, la phrase que le contributeur a écrite
 * pour expliquer POURQUOI c'est étrange. C'est le meilleur signal disponible,
 * et il ne coûte qu'une dizaine de requêtes.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Les sections de ces listes portent des noms parlants : on s'en sert pour
   ranger chaque sujet dans le bon univers. Ce qui ne tombe dans aucun va
   dans « Mystères », qui est le fourre-tout assumé des huit. */
const SECTION_UNIVERS = [
  [/scien|math|nombre|numbers|physi|chimi|chemis|invention|objet|technolog|informatique|internet/i, 'sciences'],
  [/animal|animaux|plante|botan|zoolog|biolog|nourriture|food|drink|boisson|vivant/i,             'vivant'],
  [/place|lieu|infrastructure|g[ée]ograph|toponym|geolog|earth|terre|oc[ée]an|nature/i,           'terre'],
  [/histoi|history|militaire|military|guerre|war|personnalit|people|antiquit/i,                   'histoire'],
  [/soci[ée]t|society|economy|[ée]conomi|law|justice|politi|religion|folklore|croyance/i,          'mysteres'],
  [/culture|art|music|musique|cin[ée]ma|film|t[ée]l[ée]|language|langue|litt[ée]rature/i,          'arts'],
  [/esprit|mind|psycho|cerveau|brain|corps|body|m[ée]dec|health/i,                                'esprit']
];
/* Rien trouvé = on ne sait pas. Surtout pas « mystères » par défaut : les
   archives de « Le saviez-vous ? » ont des sections datées (« Janvier 2015 »),
   qui ne disent rien du sujet. Renvoyer le fourre-tout ici, c'était y verser
   les dizaines de milliers d'entrées de cette source — 12 810 sujets sur
   16 185 dans un seul univers, et sept univers vides. On renvoie une chaîne
   vide, et c'est l'article lui-même qui décidera, plus bas. */
function universDeSection(titre){
  for (const [re, id] of SECTION_UNIVERS) if (re.test(titre || '')) return id;
  return '';
}

/* ═══════════ ranger un sujet d'après l'article, pas d'après la page ═══════
   Quand la section ne dit rien, on lit ce qu'on a déjà sous la main : le
   titre, la phrase du contributeur et l'introduction de l'article — tout est
   déjà téléchargé par la vérification, donc ce classement ne coûte pas un
   seul appel réseau.

   Chaque univers a son vocabulaire, français et anglais. On compte les mots
   trouvés, l'univers le mieux servi gagne, et l'égalité ou le silence
   renvoient une chaîne vide : mieux vaut « je ne sais pas » qu'un rangement
   inventé. Les mots sont volontairement spécifiques — « étoile » range dans
   le cosmos, « musée » dans les arts — et les mots trop courants (« monde »,
   « premier », « année ») en sont absents : ils ne discriminent rien.      */
const MOTS_UNIVERS = {
  cosmos: /\b(?:astronom|astrophys|cosmolog|galaxie|galax|[ée]toile|stellar|star|plan[èe]te|planet|com[èe]te|comet|ast[ée]ro[ïi]d|asteroid|m[ée]t[ée]orite|meteor|nébuleuse|nebula|trou noir|black hole|supernova|quasar|pulsar|satellite|orbit|lunaire|lunar|solaire|solar|spatial|spacecraft|space|nasa|telescope|t[ée]lescope|univers|universe|big bang|voie lact[ée]e|milky way|exoplan)/i,
  vivant:  /\b(?:esp[èe]ce|species|animal|animaux|mammif[èe]re|mammal|oiseau|bird|poisson|fish|insecte|insect|araign[ée]e|spider|reptile|amphibien|serpent|snake|requin|shark|baleine|whale|poulpe|octopus|m[ée]duse|jellyfish|primate|singe|monkey|plante|plant|arbre|tree|champignon|fungus|fungi|bact[ée]rie|bacteri|virus|[ée]volution|evolution|g[ée]n[ée]tique|genetic|zoo|botani|plumage|pr[ée]dateur|predator|parasite|nid|nest|migration|reproduction|habitat)/i,
  histoire:/\b(?:guerre|war|bataille|battle|arm[ée]e|army|soldat|soldier|empire|roi\b|king\b|reine|queen|empereur|emperor|dynastie|dynasty|r[ée]volution|si[èe]cle|century|m[ée]di[ée]val|medieval|moyen [aâ]ge|antiquit|ancient rome|romain|roman empire|napol[ée]on|trait[ée]|treaty|colonie|colonial|esclav|slave|nazi|ss\b|wehrmacht|1[0-9]{3}\b|18[0-9]{2}|19[0-4][0-9]|pape\b|pope\b|croisade|crusade|r[ée]publique|monarch|assassinat|assassinat)/i,
  esprit:  /\b(?:cerveau|brain|neurolog|neurone|neuron|psycholog|psychiatr|m[ée]moire|memory|conscience|consciousness|perception|hallucination|sommeil|sleep|r[êe]ve|dream|maladie|disease|patient|m[ée]decin|physician|chirurg|surgery|sympt[ôo]me|symptom|diagnostic|diagnosis|syndrome|virus humain|[ée]pid[ée]mi|epidemi|vaccin|anesth[ée]si|douleur|pain|corps humain|human body|sang|blood|c[œoe]ur\b|heart\b|placebo|phobie|phobia|amn[ée]si|autis|d[ée]pression)/i,
  sciences:/\b(?:physique|physics|quantique|quantum|chimie|chemistr|mol[ée]cule|molecul|atome|atom|[ée]lectron|electron|math[ée]mati|mathemat|th[ée]or[èe]me|theorem|[ée]quation|equation|algorithme|algorithm|ordinateur|computer|informatique|logiciel|software|internet|invention|invent|brevet|patent|ing[ée]nieur|engineer|machine|moteur|engine|[ée]lectricit|electricit|laser|radioactiv|nucl[ée]aire|nuclear|exp[ée]rience de|experiment|laboratoire|laborator|prix nobel|nobel prize|mat[ée]riau|alliage|robot)/i,
  mysteres:/\b(?:disparition|disappear|disparu|missing|non [ée]lucid|unsolved|unexplained|inexpliqu|myst[èe]re|myster|[ée]nigme|enigma|canular|hoax|l[ée]gende|legend|folklore|surnaturel|supernatural|fant[ôo]me|ghost|paranormal|conspiration|conspirac|secret|cach[ée]|hidden|code non|undeciphered|ind[ée]chiffr|cryptid|monstre du|rumeur|rumour|rumor|jamais identifi|never identified|jamais retrouv|culte|cult\b|rituel|ritual|superstition|malédiction|curse)/i,
  terre:   /\b(?:volcan|volcano|s[ée]isme|earthquake|tsunami|g[ée]olog|geolog|min[ée]ral|mineral|roche|rock formation|montagne|mountain|glacier|iceberg|d[ée]sert|desert|oc[ée]an|ocean|mer\b|sea\b|lac\b|lake\b|rivi[èe]re|river|[îi]le\b|island|grotte|cave|cavern|climat|climate|m[ée]t[ée]orolog|meteorolog|ouragan|hurricane|tornade|tornado|temp[êe]te|storm|s[ée]cheresse|drought|inondation|flood|atmosph[èe]re|antarcti|arctique|arctic|foss[ii]le|fossil|tectoni)/i,
  arts:    /\b(?:peintre|painter|peinture|painting|tableau|sculpture|sculpteur|mus[ée]e|museum|galerie|gallery|artiste|artist|architecte|architect|architectur|cath[ée]drale|cathedral|temple|monument|arch[ée]olog|archaeolog|archeolog|fouille|excavation|manuscrit|manuscript|litt[ée]rat|literatur|roman\b|novel\b|po[èe]me|poem|po[ée]sie|poetr|[ée]crivain|writer|musique|music|compositeur|composer|symphonie|symphony|op[ée]ra|chanson|song|film\b|cin[ée]ma|cinema|acteur|actor|th[ée][âa]tre|theatre|theater|danse|dance|photograph)/i
};
function universDeTexte(texte){
  const t = String(texte || '');
  if (t.length < 20) return '';
  let meilleur = '', score = 0, exaequo = false;
  for (const [id, re] of Object.entries(MOTS_UNIVERS)){
    const g = new RegExp(re.source, 'gi');
    const n = (t.match(g) || []).length;
    if (n > score){ meilleur = id; score = n; exaequo = false; }
    else if (n === score && n > 0 && id !== meilleur) exaequo = true;
  }
  return (score > 0 && !exaequo) ? meilleur : '';
}

/* Récupère le wikitexte d'une page, quel que soit son espace de noms. */
async function wikitexte(lang, page){
  const j = await cached('wt_' + lang + '_' + page, () => api(
    'https://' + lang + '.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2'
    + '&prop=wikitext&page=' + encodeURIComponent(page)));
  return j?.parse?.wikitext || '';
}

/* ═══════════════════════ lecture des listes d'articles insolites ═══════════
   Trois pièges, tous rencontrés pour de vrai, tous visibles dans la curation
   du 30 août : des sujets nommés « Seconde Guerre mondiale », « Royal Navy »,
   « Broadway », et des phrases coupées en plein milieu.

   1. LES TABLEAUX ÉCRIVENT UNE CELLULE PAR LIGNE.
          |-
          | [[Hiroo Onoda]]
          | Soldat japonais de la [[Seconde Guerre mondiale]] qui refusa de
            croire à la fin de la guerre et la continua seul jusqu'en 1974.
      Lu ligne à ligne, cela donne deux entrées : « Hiroo Onoda » sans phrase,
      et « Seconde Guerre mondiale » avec la phrase amputée « qui refusa de
      croire… ». On recompose donc la LIGNE DE TABLEAU entière avant de la
      lire.

   2. LE PREMIER LIEN EST SOUVENT LE DÉCOR.
      « * Pendant la [[Seconde Guerre mondiale]], [[Hiroo Onoda]]… »
      On ne tranche plus ligne par ligne : on note tous les liens candidats,
      et on choisit à la fin, quand on sait lesquels reviennent partout. Un
      lien présent dans quarante entrées est du contexte, jamais un sujet.

   3. LA PHRASE DU CONTRIBUTEUR, C'EST TOUTE LA LIGNE.
      Pas ce qui suit le lien. C'est elle qui dit pourquoi le sujet est
      extraordinaire ; c'est elle qu'on veut lire en curation.             */

const NS_INTERNE = /^(Wikip[ée]dia|Wikipedia|Category|Cat[ée]gorie|File|Fichier|Image|Portail|Portal|Help|Aide|Template|Mod[èe]le|Special|Sp[ée]cial|Talk|Discussion|User|Utilisateur):/i;

function nettoyerWiki(t){
  return String(t)
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[([^\]|#]+?)(?:#[^\]|]*)?\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]|#]+?)(?:#[^\]]*)?\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/[★✚]/g, ' ')
    .replace(/\s*\|\|\s*/g, ' — ')
    .replace(/^[\s|!*#;:–—-]+/, '')
    /* « Le saviez-vous ? » ouvre chaque accroche par « ... que » ou
       « ... that ». Gardé tel quel, chaque phrase commencerait par un mot
       vide et la curation serait illisible. */
    .replace(/^(?:\.{3}|…)\s*(?:that\s+|qu[e’']\s*)?/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/^[,.;:—–\s]+/, '')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

/* Une cellule de tableau peut porter des attributs : « style="…" | texte ». */
function sansAttributs(c){
  const s = String(c);
  const i = s.indexOf('|');
  if (i > 0 && /=/.test(s.slice(0, i)) && !/\[\[/.test(s.slice(0, i))) return s.slice(i + 1);
  return s;
}

/* Un lien précédé d'une préposition est presque toujours du décor :
   « Pendant la [[Seconde Guerre mondiale]] », « En 1518, à [[Strasbourg]] ».
   Le sujet, lui, arrive derrière un article ou en tête de phrase.          */
const PREPOSITION = /(?:^|[\s(«"'’,;:—–-])(?:[àa]|au|aux|en|dans|sur|sous|vers|chez|pr[èe]s|lors|pendant|durant|depuis|entre|contre|par|parmi|autour|le long|[àa] c[ôo]t[ée]|in|at|on|near|during|from|by|with|after|before|under|around|between|among|inside|outside|across|throughout)\s+(?:la|le|les|l['’]|du|de|des|d['’]|the|a|an|his|her|its|their)?\s*$/i;

/* Tous les liens d'un fragment, avec ce qu'on sait d'eux sur place. */
function liensDe(txt, base){
  const out = [];
  const re = /\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
  let m;
  while ((m = re.exec(txt))){
    const cible = (m[1] || '').trim();
    if (!cible || NS_INTERNE.test(cible)) continue;
    if (/^[a-z-]{2,3}:/.test(cible)) continue;             // liens interlangues
    const contexte = txt.slice(Math.max(0, m.index - 24), m.index);
    const apres = txt.slice(m.index + m[0].length, m.index + m[0].length + 4);
    let s = base || 0;
    if (/'''/.test(contexte.slice(-4)) || /'''/.test(apres) || /'''/.test(m[2] || '')) s += 6;
    if (!out.length) s += (m.index <= 2 ? 4 : 1);           // le lien qui ouvre
    if (PREPOSITION.test(contexte)) s -= 3;                 // « à Strasbourg » : du décor
    out.push({ cible, score: s });
  }
  return out;
}

/* Ce qui disqualifie un candidat : une date, une liste, et surtout le fait
   de revenir dans beaucoup d'entrées — c'est la signature du contexte. */
function penaliteCandidat(t, freq){
  let s = 0;
  if (/^\d{1,4}$/.test(t) || /^\d{4}s$/.test(t)) s -= 9;
  if (/^\d{1,2}\s*(e|er|ème|th|st|nd|rd)?\s*(si[èe]cle|century|mill[ée]naire|millennium)/i.test(t)) s -= 9;
  if (/^(Liste|List|Chronologie|Timeline)\s+(de|des|du|of)\b/i.test(t)) s -= 5;
  const f = (freq && freq.get(t)) || 0;
  if (f >= 8) s -= 10; else if (f >= 4) s -= 6; else if (f >= 2) s -= 3;
  return s;
}

function choisirSujet(cands, freq){
  let best = null;
  (cands || []).forEach((c, i) => {
    const s = (c.score || 0) + penaliteCandidat(c.cible, freq) - i * 0.01;
    if (!best || s > best.score) best = { cible: c.cible, score: s };
  });
  return best;
}

/* Une ligne de tableau recomposée : première cellule = le sujet, tout = la
   phrase. On garde tous les liens comme candidats, ceux de la première
   cellule nettement favorisés. */
function entreeDeCellules(cells, brutRow, section){
  const nettes = cells.map(c => String(c).trim()).filter(c => c !== '');
  if (!nettes.length) return null;
  let cands = [];
  nettes.forEach((c, i) => { cands = cands.concat(liensDe(c, i === 0 ? 5 : 0)); });
  if (!cands.length) return null;
  const phrase = nettes.map(nettoyerWiki).filter(x => x.length > 1).join(' — ');
  return {
    cands,
    section,
    univers: universDeSection(section),
    pourquoi: phrase.length >= 12 ? phrase.slice(0, 320) : '',
    qualite: brutRow.includes('★') ? 2 : (brutRow.includes('✚') ? 1 : 0)
  };
}

function entreesDeListe(wikitext, sectionParDefaut){
  const out = [];
  let section = sectionParDefaut || '';
  let dansTable = 0;
  let cellules = null;
  let brutRow = '';

  const finLigne = () => {
    if (cellules && cellules.length){
      const e = entreeDeCellules(cellules, brutRow, section);
      if (e) out.push(e);
    }
    cellules = null; brutRow = '';
  };

  for (const brut of String(wikitext).split(/\r?\n/)){
    const ligne = brut.trim();

    const titre = ligne.match(/^={2,6}\s*(.+?)\s*={2,6}$/);
    if (titre){ finLigne(); section = titre[1].replace(/\[\[|\]\]|'{2,}/g, '').trim(); continue; }

    if (/^\{\|/.test(ligne)){ finLigne(); dansTable++; continue; }
    if (/^\|\}/.test(ligne)){ finLigne(); dansTable = Math.max(0, dansTable - 1); continue; }

    if (dansTable){
      if (/^\|-/.test(ligne)){ finLigne(); cellules = []; continue; }
      if (/^\|\+/.test(ligne)) continue;                    // légende du tableau
      if (/^[|!]/.test(ligne)){
        if (!cellules) cellules = [];
        brutRow += ' ' + ligne;
        const corps = ligne.replace(/^[|!]+\s?/, '');
        for (const c of corps.split(/\|\||!!/)) cellules.push(sansAttributs(c));
        continue;
      }
      // une cellule peut courir sur plusieurs lignes
      if (cellules && cellules.length && ligne){
        cellules[cellules.length - 1] += ' ' + ligne;
        brutRow += ' ' + ligne;
      }
      continue;
    }

    if (!ligne) continue;
    if (!/^[*#;]/.test(ligne)) continue;                    // la prose n'est pas une entrée
    const corps = ligne.replace(/^[*#;:]+\s*/, '');
    const cands = liensDe(corps, 0);
    if (!cands.length) continue;
    const phrase = nettoyerWiki(corps);

    out.push({
      cands,
      section,
      univers: universDeSection(section),
      pourquoi: phrase.length >= 12 ? phrase.slice(0, 320) : '',
      qualite: ligne.includes('★') ? 2 : (ligne.includes('✚') ? 1 : 0)
    });
  }
  finLigne();
  return out;
}

/* Les pages de listes transcluent souvent leurs sous-pages :
   « {{Wikipédia:Articles insolites/Sciences}} ». Sans les suivre, on lit une
   page qui ne contient presque rien. */
function transclusions(wikitext, prefixe){
  const out = new Set();
  const re = /\{\{\s*((?:Wikip[ée]dia|Wikipedia):[^}|]+?)\s*(?:\||\}\})/g;
  let m;
  while ((m = re.exec(String(wikitext)))){
    const t = m[1].trim();
    if (prefixe && !t.toLowerCase().startsWith(prefixe.toLowerCase())) continue;
    if (/\/(Removed|Archive)/i.test(t)) continue;
    out.add(t);
  }
  return [...out];
}

/* Les pages à lire, par langue. Elles sont découvertes, pas écrites en dur :
   les deux projets réorganisent régulièrement leurs sous-pages. */
async function pagesInsolites(lang){
  const prefixes = lang === 'fr'
    ? ['Articles insolites', 'Insolite']
    : ['Unusual articles'];
  const racines = lang === 'fr'
    ? ['Wikipédia:Articles insolites']
    : ['Wikipedia:Unusual articles'];

  const vues = new Set(racines);
  for (const prefixe of prefixes){
    try{
      const j = await cached('ap_' + lang + '_' + prefixe, () => api(
        'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
        + '&list=allpages&apnamespace=4&apprefix=' + encodeURIComponent(prefixe)
        + '&aplimit=200'));
      for (const p of (j?.query?.allpages || [])){
        if (/\/(Removed|Archive|Retir)/i.test(p.title)) continue;
        vues.add(p.title);
      }
    }catch(e){ /* la découverte échoue : les racines suffisent */ }
  }
  return [...vues];
}

/* Filet de sécurité : quand l'analyse ligne à ligne ne rapporte presque rien
   — un format de page qu'on n'avait pas prévu —, on demande à Wikipédia la
   liste des articles liés depuis la page. On perd la phrase du contributeur,
   mais on garde l'essentiel : ces titres SONT la sélection curée. */
async function liensDePage(lang, page){
  const j = await cached('lk_' + lang + '_' + page, () => api(
    'https://' + lang + '.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2'
    + '&prop=links&page=' + encodeURIComponent(page)));
  return (j?.parse?.links || [])
    .filter(l => l.ns === 0 && l.exists !== false)
    .map(l => l.title || l['*'])
    .filter(Boolean);
}

/* ═══════════════ « Le saviez-vous ? » — la deuxième mine ═══════════════════
   Les listes d'articles insolites finissent par être épuisées : quatre pages
   côté français, vingt côté anglais, et une fois lues il n'y a plus rien à
   en tirer. « Le saviez-vous ? » (Did you know) est une autre veine, plus
   profonde et surtout renouvelée chaque jour depuis vingt ans : des milliers
   d'accroches écrites à la main, chacune bâtie pour surprendre.

       * ... que '''[[Turritopsis dohrnii]]''' peut rajeunir indéfiniment ?

   Même format qu'une liste à puces, même lecteur, même choix du sujet — et
   le gras que les wikipédiens mettent sur l'article vedette est précisément
   le signal dont le sélecteur a besoin.                                    */
async function pagesSaviezVous(lang){
  const prefixes = lang === 'fr'
    ? ['Le saviez-vous ?', 'Le saviez-vous']
    : ['Recent additions', 'Did you know'];
  const racines = lang === 'fr'
    ? ['Wikipédia:Le saviez-vous ?']
    : ['Wikipedia:Recent additions'];

  const vues = new Set(racines);
  for (const prefixe of prefixes){
    try{
      const j = await cached('sv_' + lang + '_' + prefixe, () => api(
        'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
        + '&list=allpages&apnamespace=4&apprefix=' + encodeURIComponent(prefixe)
        + '&aplimit=500'));
      for (const p of (j?.query?.allpages || [])){
        // les pages de discussion, de règles et de mise en page n'ont pas
        // d'anecdotes : seulement les listes et les archives datées
        if (/\/(Discussion|Talk|R[èe]gles|Mode d'emploi|Aide|Image|Nomination|Preparation|Queue|Template|Mod[èe]le)/i.test(p.title)) continue;
        vues.add(p.title);
      }
    }catch(e){ /* la découverte échoue : les racines suffisent */ }
  }
  return [...vues];
}

/* Rassemble toutes les entrées curées d'une langue.
   `quoi` vaut « insolite » (les listes d'articles insolites) ou « saviez »
   (Le saviez-vous ? / Did you know). Même lecteur, mêmes règles de choix du
   sujet : seules les pages de départ changent. */
async function moissonInsolite(lang, quoi){
  const saviez = quoi === 'saviez';
  const racine = saviez
    ? (lang === 'fr' ? 'Wikipédia:Le saviez-vous ?' : 'Wikipedia:Recent additions')
    : (lang === 'fr' ? 'Wikipédia:Articles insolites' : 'Wikipedia:Unusual articles');
  const etiquette = saviez ? 'Le saviez-vous ?' : 'insolites';
  const pages = saviez ? await pagesSaviezVous(lang) : await pagesInsolites(lang);
  const file = [...pages];
  const lues = new Set();
  const brutes = [];          // entrées non tranchées : plusieurs candidats chacune
  const out = [];

  let coupee = false;
  while (file.length){
    if (tempsEcoule()){ coupee = true; break; }
    const page = file.shift();
    if (lues.has(page)) continue;
    lues.add(page);

    let wt = '';
    try{ wt = await wikitexte(lang, page); }
    catch(e){ console.log(`  ! ${page} illisible : ${e.message}`); continue; }

    // la page transclut-elle des sous-pages ? on les lit aussi
    for (const t of transclusions(wt, racine)){
      if (!lues.has(t) && !file.includes(t)) file.push(t);
    }

    // le nom de la sous-page est deja un bon classement : « /Science »,
    // « /Death », « /Food »… on s'en sert comme section par defaut.
    const sousPage = page.includes('/') ? page.slice(page.lastIndexOf('/') + 1) : '';
    let entrees = entreesDeListe(wt, sousPage);

    // presque rien ? on passe par les liens de la page
    if (entrees.length < 5){
      try{
        const liens = await liensDePage(lang, page);
        const NS = /^(Wikip[ée]dia|Wikipedia|Category|Cat[ée]gorie|File|Fichier|Image|Portail|Portal|Help|Aide|Template|Mod[èe]le|Special|Sp[ée]cial|Talk|Discussion|User|Utilisateur):/i;
        const parLiens = liens
          .filter(t => t && !NS.test(t))
          .map(t => ({ cands:[{ cible:t, score:5 }], section:sousPage, univers:universDeSection(sousPage), pourquoi:'', qualite:0 }));
        if (parLiens.length > entrees.length){
          console.log(`  · ${page} → ${parLiens.length} sujets (par les liens : format de liste non reconnu)`);
          entrees = parLiens;
        }
      }catch(e){ /* tant pis, on garde ce qu'on a */ }
    } else {
      console.log(`  · ${page} → ${entrees.length} entrées`);
    }

    for (const e of entrees) brutes.push(e);
  }

  /* ---- on tranche maintenant, et pas avant -------------------------------
     Une entrée porte plusieurs liens ; le sujet est celui qui ne revient pas
     ailleurs. « Seconde Guerre mondiale » apparaît dans quarante entrées :
     c'est du décor. « Hiroo Onoda » dans une seule : c'est le sujet.       */
  const freq = new Map();
  for (const e of brutes){
    const dejaVu = new Set();
    for (const c of (e.cands || [])){
      if (dejaVu.has(c.cible)) continue;
      dejaVu.add(c.cible);
      freq.set(c.cible, (freq.get(c.cible) || 0) + 1);
    }
  }

  const vues = new Set();
  let ecartes = 0;
  for (const e of brutes){
    const b = choisirSujet(e.cands, freq);
    if (!b || b.score < -3){ ecartes++; continue; }   // ligne de pur contexte
    if (vues.has(b.cible)) continue;
    vues.add(b.cible);
    out.push({ titre:b.cible, section:e.section, univers:e.univers,
               pourquoi:e.pourquoi, qualite:e.qualite, lang });
  }
  if (ecartes) console.log(`  · ${ecartes} ligne(s) écartée(s) : aucun sujet identifiable, seulement du contexte.`);

  /* Une moisson vide n'est pas un détail : c'est toute la qualité du
     catalogue qui disparaît, et l'ancienne version le laissait passer sans
     rien dire. On le crie, et l'action le remonte dans son compte rendu. */
  if (!out.length){
    console.log(`::warning::Aucun sujet « ${etiquette} » trouvé en « ${lang} » (${lues.size} page(s) lue(s)).`);
    console.log(`  ! Sans ces listes, le catalogue n'aura que du parcours de catégories — des sujets connus, pas des sujets étonnants.`);
  } else {
    const avecPhrase = out.filter(e => e.pourquoi).length;
    console.log(`  ✓ ${lang} : ${out.length} sujets « ${etiquette} » sur ${lues.size} page(s), dont ${avecPhrase} avec la phrase du contributeur.`);
    if (coupee) console.log(`  ⏱ ${file.length} page(s) non lues cette fois — la prochaine passe les prendra.`);
  }
  return out;
}

async function toQids(titles, lang = 'en'){
  const map = new Map();
  for (const batch of chunk(titles, 25)){
    const j = await cached('pp_' + lang + '_' + batch[0] + '_' + batch.length, () => api(
      'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1'
      + '&prop=pageprops&ppprop=wikibase_item|disambiguation'
      + '&titles=' + batch.map(encodeURIComponent).join('%7C')));
    (j?.query?.pages || []).forEach(p => {
      if (p.missing || !p.pageprops || 'disambiguation' in p.pageprops) return;
      if (p.pageprops.wikibase_item) map.set(p.title, p.pageprops.wikibase_item);
    });
  }
  return map;
}

/* -------------------------- 3. Wikidata : notoriété + titres FR/EN appariés */
async function fromWikidata(qids){
  const rows = [];
  for (const batch of chunk(qids, 40)){
    if (tempsEcoule()) break;
    const j = await cached('wd_' + batch[0] + '_' + batch.length, () => api(
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=' + batch.join('%7C')));
    const ents = j?.entities || {};
    for (const qid of Object.keys(ents)){
      const sl = ents[qid].sitelinks || {};
      const wikis = Object.keys(sl).filter(k => /wiki$/.test(k) && !/(quote|source|voyage|news|books|versity)/.test(k));
      const en = sl.enwiki?.title || null, fr = sl.frwiki?.title || null;
      if (!en && !fr) continue;
      rows.push({ qid, n: wikis.length, en, fr });
    }
  }
  return rows;
}

/* ------------------------- 4. vérification : l'article tient-il une anecdote ? */
/* `souple` : pour vos sujets phares. Un article sans photo reste un excellent
   sujet — l'application sait afficher une fiche sans image — et il serait
   absurde de perdre le manuscrit de Voynich parce que Wikipédia n'en publie
   pas de vignette. On garde donc l'article dès qu'il existe et que son
   introduction est substantielle. */
async function verify(lang, titles, souple, intros){
  const keep = new Set();
  for (const batch of chunk(titles, 20)){
    if (tempsEcoule()) break;
    let j;
    try{
      j = await cached('v_' + lang + '_' + batch[0] + '_' + batch.length, () => api(
        'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1'
        + '&prop=extracts|pageimages&explaintext=1&exintro=1&exlimit=20&pilimit=20&piprop=thumbnail&pithumbsize=400'
        + '&titles=' + batch.map(encodeURIComponent).join('%7C')));
    }catch{ batch.forEach(t => keep.add(t)); continue; }   // en cas d'échec réseau, on garde
    (j?.query?.pages || []).forEach(p => {
      if (p.missing) return;
      const len = (p.extract || '').replace(/\s+/g, ' ').trim().length;
      if (intros) intros.set(p.title, (p.extract || '').slice(0, 1200));
      if (souple ? (len < 300) : (len < 420 || !p.thumbnail)) return;
      keep.add(p.title);
    });
    // les titres normalisés par Wikipédia (redirections) restent valides
    (j?.query?.normalized || []).forEach(n => { if (keep.has(n.to)) keep.add(n.from); });
    (j?.query?.redirects  || []).forEach(n => { if (keep.has(n.to)) keep.add(n.from); });
  }
  return keep;
}

/* -------------------------------------------------- 5. option : vues réelles */
async function pageviews(lang, title){
  const end = new Date(); end.setUTCDate(1);
  const start = new Date(end); start.setUTCFullYear(start.getUTCFullYear() - 1);
  const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'') + '00';
  try{
    const j = await api('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/'
      + lang + '.wikipedia/all-access/user/' + encodeURIComponent(title.replace(/ /g,'_'))
      + '/monthly/' + fmt(start) + '/' + fmt(end), 2);
    return (j?.items || []).reduce((s, i) => s + (i.views || 0), 0);
  }catch{ return 0; }
}


/* Comme toQids, mais la clé est le titre DEMANDÉ et non celui que Wikipédia
   a renvoyé. Avec mille sujets phares à résoudre, un appel par titre ferait
   deux mille requêtes ; celui-ci en fait quarante. Les redirections et les
   normalisations sont remontées jusqu'au titre d'origine. */
async function qidsParTitre(lang, titres, cibles){
  const out = new Map();
  for (const batch of chunk(titres, 25)){
    // le budget prime : ce qui n'est pas identifié ce soir le sera demain
    if (tempsEcoule()) break;
    let j;
    try{
      j = await cached('ppq_' + lang + '_' + batch[0] + '_' + batch.length, () => api(
        'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1'
        + '&prop=pageprops&ppprop=wikibase_item|disambiguation'
        + '&titles=' + batch.map(encodeURIComponent).join('%7C')));
    }catch(e){ continue; }
    const parTitre = new Map();
    (j?.query?.pages || []).forEach(p => {
      if (p.missing || !p.pageprops || 'disambiguation' in p.pageprops) return;
      if (p.pageprops.wikibase_item) parTitre.set(p.title, p.pageprops.wikibase_item);
    });
    const alias = new Map();
    (j?.query?.normalized || []).forEach(n => alias.set(n.from, n.to));
    (j?.query?.redirects  || []).forEach(n => alias.set(n.from, n.to));
    for (const t of batch){
      let cur = t, n = 0;
      while (alias.has(cur) && n++ < 5) cur = alias.get(cur);
      const q = parTitre.get(cur);
      /* On retient AUSSI où la redirection a mené. « Inky » existe sur
         Wikipédia, mais c'est un fantôme de Pac-Man : le titre est exact,
         l'article n'est pas le bon. Sans cette information, l'erreur est
         indétectable — c'est elle qui a mis un poulpe sur une fiche
         « Pac-Man ». */
      if (q){ out.set(t, q); if (cibles) cibles.set(t, cur); }
    }
  }
  return out;
}

/* Un titre approximatif ne doit pas coûter un sujet. Quand l'article exact
   n'existe pas — « Larme batavique » au lieu de « Goutte du prince Rupert »,
   une majuscule, un accent, un pluriel — on demande à Wikipédia de chercher,
   et on prend son premier résultat. Le journal dit toujours ce qu'il a résolu
   et comment, pour que vous puissiez le relire. */
async function chercherTitre(lang, requete){
  try{
    const j = await cached('srch_' + lang + '_' + requete, () => api(
      'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
      + '&list=search&srlimit=1&srnamespace=0&srsearch=' + encodeURIComponent(requete)));
    const t = j?.query?.search?.[0]?.title;
    return t || null;
  }catch(e){ return null; }
}

/* ═══════════ garde-fous de la résolution par recherche ════════════════════
   La recherche Wikipédia répond toujours quelque chose. « Enfants Sodder »
   a donné « Markus Söder », « 8 mm Lebel » a récupéré la phrase d'une
   expérience de psychologie, « Volcan Havre » est devenu une salle de
   spectacle. Un catalogue vendu à des clients ne peut pas contenir ça.

   Deux barrières, et il faut passer les deux :
     1. le titre trouvé doit ressembler au titre demandé ;
     2. l'article trouvé doit parler de la même chose que VOTRE phrase.
   Ce qui ne passe pas est refusé et écrit dans le journal, ligne par ligne,
   pour que vous puissiez corriger le fichier.                              */

const VIDES = new Set(('le la les un une des du de d au aux et ou en dans sur sous pour par avec sans '
  + 'the a an of in on at to for and or with from is are was were that which this these those his her its '
  + 'qui que quoi dont ou est sont etait etaient ce cet cette ces son sa ses leur leurs plus moins tres '
  + 'film movie roman livre book article page liste list histoire history').split(/\s+/));

function motsDe(t){
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(m => m && !VIDES.has(m));
}

/* Le titre trouvé ressemble-t-il assez au titre demandé ? On compare les mots
   utiles, parenthèse de désambiguïsation retirée, dans les deux sens : un
   mot en trop d'un côté est tolérable, la moitié du titre qui change ne
   l'est pas. */
function titresProches(demande, trouve){
  const sansParenthese = (x) => String(x).replace(/\s*\([^)]*\)\s*$/, '');
  const a = new Set(motsDe(sansParenthese(demande)));
  const b = new Set(motsDe(sansParenthese(trouve)));
  if (!a.size || !b.size) return false;
  let commun = 0;
  for (const m of a) if (b.has(m)) commun++;
  const union = new Set([...a, ...b]).size;
  const jaccard = commun / union;
  const couverture = commun / a.size;
  // il faut au moins un mot long en commun : « Rio » seul ne suffit pas
  let mLong = false;
  for (const m of a) if (m.length >= 5 && b.has(m)) mLong = true;
  return (jaccard >= 0.7 || (couverture === 1 && b.size - a.size <= 1)) && (mLong || a.size === b.size);
}

/* Combien de mots signifiants la phrase et l'article ont-ils en commun ?
   Zéro, c'est le signe qu'ils ne parlent pas de la même chose. Ce chiffre
   ne refuse rien : il se range dans le catalogue, s'affiche dans le CSV, et
   sert à trier ce qui mérite un coup d'œil avant d'être écrit.            */
function motsPartages(phrase, intro){
  if (!phrase || !intro) return 0;
  const attendu = new Set(motsDe(phrase).filter(m => m.length >= 5 || /^\d{3,}$/.test(m)));
  if (!attendu.size) return 0;
  const dans = new Set(motsDe(intro));
  let n = 0;
  for (const m of attendu) if (dans.has(m)) n++;
  return n;
}

/* Deux écritures du même titre ? Accents, majuscules, tirets, underscores :
   Wikipédia normalise, et cette normalisation-là n'est pas un déplacement.
   « lac nyos » et « Lac Nyos » sont le même titre ; « Inky » et « Pac-Man »
   ne le sont pas. */
function memeTitre(a, b){
  return motsDe(a).join(' ') === motsDe(b).join(' ');
}

/* L'article trouvé parle-t-il de la même chose que votre phrase ? On compte
   les mots signifiants partagés — noms propres, termes rares, nombres — entre
   ce que VOUS avez écrit et l'introduction de l'article. Zéro recoupement,
   c'est que la recherche est partie ailleurs. */
function memeSujet(phrase, titre, intro){
  if (!intro) return true;                       // pas d'intro : on ne juge pas
  const attendu = new Set([...motsDe(phrase), ...motsDe(titre)].filter(m => m.length >= 5 || /^\d{3,}$/.test(m)));
  if (attendu.size < 2) return true;             // trop peu pour juger
  const dans = new Set(motsDe(intro));
  let n = 0;
  for (const m of attendu) if (dans.has(m)) n++;
  return n >= 2;
}

/* ═══════════════════ passe 0 : vos sujets phares, imposés ═══════════════════
   Un fichier que VOUS tenez : consignes/sujets-phares.txt. Une ligne, un
   sujet, et ce sujet entre au catalogue quoi qu'il arrive — même si aucune
   liste ne le mentionne, même s'il est déjà connu. C'est le seul endroit du
   projet où vous décidez à la main, et il passe avant tout le reste.

       Turritopsis dohrnii | vivant | La méduse qui refuse de vieillir.

   Le titre est celui de l'article Wikipédia, en français ou en anglais : la
   version dans l'autre langue est retrouvée toute seule par Wikidata.      */
async function passePhares(ctx){
  const { sources, index, pairs, claimed, scores } = ctx;

  let brut = '';
  try{ brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'sujets-phares.txt'), 'utf8'); }
  catch{ return 0; }

  const demandes = brut.split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'))
    .map(l => {
      const p = l.split('|').map(x => x.trim());
      const uni = p[1] && UNIVERSES.some(u => u.id === p[1]) ? p[1] : 'mysteres';
      return { titre: p[0], uni, phrase: p[2] || '' };
    })
    .filter(d => d.titre);

  if (!demandes.length) return 0;
  console.log(`\n▸ sujets phares — ${demandes.length} imposés par consignes/sujets-phares.txt`);

  /* Résolution en trois temps : le titre tel quel en français, puis en
     anglais, puis — seulement pour ce qui reste — la recherche Wikipédia.
     Les deux premiers temps sont groupés par vingt-cinq. */
  const qid = new Map();
  const restants = () => demandes.filter(d => !qid.has(d.titre)).map(d => d.titre);

  /* Où chaque titre a réellement abouti. Un titre peut exister et pointer
     ailleurs : c'est une redirection, et Wikipédia en compte des millions. */
  const cible = new Map();
  const detourne = new Map();              // titre demandé → titre d'arrivée

  for (const lang of ['fr', 'en']){
    const reste = restants();
    if (!reste.length) break;
    const m = await qidsParTitre(lang, reste, cible);
    for (const [t, q] of m) if (!qid.has(t)) qid.set(t, q);
  }
  const exacts = qid.size;
  console.log(`  · ${exacts}/${demandes.length} résolus directement.`);

  /* ---- les redirections qui changent de sujet -------------------------
     « Inky » existe : c'est un fantôme de Pac-Man. La ligne visait le
     poulpe évadé de l'aquarium de Napier. Le titre était exact, l'article
     était faux, et rien ne le voyait : la deuxième barrière ne s'appliquait
     qu'aux titres devinés par la recherche. Elle s'applique désormais à
     toute redirection qui n'atterrit pas sur un titre voisin.            */
  for (const d of demandes){
    const arrivee = cible.get(d.titre);
    if (!arrivee) continue;
    if (memeTitre(d.titre, arrivee) || titresProches(d.titre, arrivee)) continue;
    detourne.set(d.titre, arrivee);
  }
  if (detourne.size)
    console.log(`  · ${detourne.size} titre(s) redirigés vers un autre article : leur phrase sera confrontée à l'introduction.`);

  /* Le compte rendu, ligne à ligne. Une erreur trouvée par hasard veut dire
     qu'il y en a d'autres : ce fichier les montre toutes, d'un coup d'œil,
     sans qu'il faille relire le journal. */
  const rapport = [];

  let repeches = 0, refuses = 0;
  const parRecherche = new Set();          // ces titres-là seront re-vérifiés
  const aChercher = restants();
  if (aChercher.length) console.log(`  · ${aChercher.length} titre(s) sans article exact : recherche en cours…`);
  let vus = 0, reportes = 0;
  for (const t of aChercher){
    /* Chaque recherche coûte deux à quatre appels. Sur mille cinq cents
       titres approximatifs, c'est une heure. On en fait ce qu'on peut, le
       reste attend demain — et le cache fera que demain ira vite. */
    if (tempsEcoule() || tempsRestant() < 5 * 60000){ reportes = aChercher.length - vus; passePartielle = true; break; }
    if (++vus % 50 === 0) console.log(`    … ${vus}/${aChercher.length}  (${minutesFaites()} min)`);
    for (const lang of ['fr', 'en']){
      const trouve = await chercherTitre(lang, t);
      if (!trouve || trouve.toLowerCase() === String(t).toLowerCase()) continue;
      /* Première barrière : le titre doit ressembler au titre demandé.
         Sans elle, « Enfants Sodder » devenait « Markus Söder ». */
      if (!titresProches(t, trouve)){
        console.log(`  ✗ « ${t} » → « ${trouve} » : trop loin du titre demandé, refusé.`);
        rapport.push([t, 'recherche ' + lang, trouve, '', 'refusé', 'titre trop éloigné']);
        refuses++;
        continue;
      }
      const m = await qidsParTitre(lang, [trouve]);
      const v = [...m.values()][0];
      if (v){
        qid.set(t, v); repeches++; parRecherche.add(t);
        console.log(`  ~ « ${t} » → « ${trouve} » (résolu par recherche ${lang})`);
        break;
      }
    }
  }

  const trouves = demandes.filter(d => qid.has(d.titre)).map(d => ({ ...d, qid: qid.get(d.titre) }));
  const manquants = restants();
  for (const t of manquants){
    console.log(`  ! « ${t} » : introuvable, même par recherche. Corrigez la ligne.`);
    rapport.push([t, '—', '', '', 'introuvable', 'aucun article de ce nom']);
  }
  console.log(`  · ${exacts} titre(s) exact(s), ${repeches} rattrapé(s) par la recherche, ${refuses} refusé(s) comme hors sujet, ${manquants.length} introuvable(s).`);
  if (reportes) console.log(`  ⏱ ${reportes} titre(s) reportés à la prochaine passe, faute de temps.`);
  if (!trouves.length) return 0;

  const rows = await fromWikidata([...new Set(trouves.map(t => t.qid))]);
  const parQid = new Map(rows.map(r => [r.qid, r]));

  const introFr = new Map(), introEn = new Map();
  const frKeep = await verify('fr', rows.map(r => r.fr).filter(Boolean), true, introFr);
  const enKeep = await verify('en', rows.map(r => r.en).filter(Boolean), true, introEn);

  /* Où se trouve DÉJÀ chaque titre, tous univers confondus. C'est ce qui
     empêche « Expérience de la goutte de poix » d'apparaître à la fois en
     Sciences et en Mystères parce que deux lignes du fichier désignent le
     même article sous deux noms. */
  const ouEstDeja = new Map();
  for (const u of Object.keys(sources)){
    for (const lang of ['fr', 'en']){
      for (const t of (sources[u][lang] || [])) ouEstDeja.set(lang + '|' + t, u);
    }
  }

  let n = 0, deja = 0, rejetes = 0, horsSujet = 0, doublons = 0;
  const vusQid = new Set();
  const voie = (t) => detourne.has(t) ? 'redirection' : parRecherche.has(t) ? 'recherche' : 'exact';
  for (const d of trouves){
    const r = parQid.get(d.qid);
    if (!r){ console.log(`  ! « ${d.titre} » : introuvable côté Wikidata.`); continue; }

    /* ---- un sujet, une seule fois, dans un seul univers ---------------- */
    if (vusQid.has(r.qid)){
      console.log(`  = « ${d.titre} » : même article qu'une ligne précédente (${r.fr || r.en}). Ignoré.`);
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, d.uni, 'doublon', 'une autre ligne désigne le même article']);
      doublons++; continue;
    }
    vusQid.add(r.qid);
    const ailleurs = (r.fr && ouEstDeja.get('fr|' + r.fr)) || (r.en && ouEstDeja.get('en|' + r.en)) || null;
    if (ailleurs && ailleurs !== d.uni){
      console.log(`  = « ${r.fr || r.en} » est déjà dans « ${ailleurs} » : on ne le met pas aussi dans « ${d.uni} ».`);
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, ailleurs, 'doublon', `déjà classé dans « ${ailleurs} »`]);
      doublons++; continue;
    }
    if (claimed.has(r.qid) && !ailleurs){
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, d.uni, 'déjà au catalogue', '']);
      deja++; continue;
    }

    /* ---- deuxième barrière : l'article parle-t-il de votre sujet ? ------
       Elle ne s'applique qu'aux titres rattrapés par la recherche : un titre
       exact est digne de confiance, un titre deviné ne l'est pas. */
    if (parRecherche.has(d.titre) || detourne.has(d.titre)){
      const intro = [introFr.get(r.fr) || '', introEn.get(r.en) || ''].join(' ');
      if (!memeSujet(d.phrase, d.titre, intro)){
        const via = detourne.has(d.titre) ? 'redirection' : 'recherche';
        console.log(`  ✗ « ${d.titre} » → « ${r.fr || r.en} » (${via}) : l'article ne parle pas de ce que dit votre phrase. Refusé.`);
        rapport.push([d.titre, via, r.fr || r.en, d.uni, 'refusé', 'article étranger à votre phrase']);
        horsSujet++; continue;
      }
    }

    if (!sources[d.uni]) sources[d.uni] = { fr:[], en:[] };
    const listeFr = sources[d.uni].fr, listeEn = sources[d.uni].en;

    let pris = false;
    // un phare vaut 10 : c'est vous qui l'avez choisi, pas une heuristique
    if (r.fr && frKeep.has(r.fr) && !listeFr.includes(r.fr)){
      listeFr.push(r.fr);
      scores['fr|' + r.fr] = { p:10, w:d.phrase, wl:d.phrase ? 'fr' : '', c:1, f:1, o:'phare' };
      ouEstDeja.set('fr|' + r.fr, d.uni);
      pris = true;
    }
    if (r.en && enKeep.has(r.en) && !listeEn.includes(r.en)){
      listeEn.push(r.en);
      scores['en|' + r.en] = { p:10, w:'', wl:'', c:1, f:1, o:'phare' };
      ouEstDeja.set('en|' + r.en, d.uni);
      pris = true;
    }
    if (r.fr && r.en) pairs.set(r.fr, r.en);
    if (pris){
      claimed.add(r.qid);
      index[d.uni] = (index[d.uni] || []).concat([r.qid]);
      n++;
      console.log(`  ★ ${d.uni} : ${r.fr || r.en}`);
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, d.uni, 'retenu', '']);
    } else if ((r.fr && listeFr.includes(r.fr)) || (r.en && listeEn.includes(r.en))){
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, d.uni, 'déjà au catalogue', '']);
      deja++;
    } else {
      rapport.push([d.titre, voie(d.titre), r.fr || r.en, d.uni, 'refusé', 'article trop maigre ou introuvable dans les deux langues']);
      rejetes++;
    }
  }
  console.log(`  → ${n} nouveau(x), ${deja} déjà au catalogue, ${doublons} doublon(s) écarté(s), `
            + `${horsSujet} hors sujet refusé(s), ${rejetes} sans article assez fourni.`);
  if (!n && deja) console.log(`  · Rien de neuf : vos sujets phares sont déjà tous là. C'est normal à partir de la deuxième collecte.`);
  await ecrireRapportPhares(rapport);
  return n;
}

/* Le compte rendu des sujets phares, en tableur. Une ligne par ligne de
   votre fichier, et la colonne « verdict » dit ce qu'elle est devenue. On
   trie les ennuis en premier : ce sont les seules lignes à relire.        */
async function ecrireRapportPhares(rapport){
  if (!rapport.length) return;
  const rang = { 'refusé':0, 'introuvable':1, 'doublon':2, 'retenu':3, 'déjà au catalogue':4 };
  rapport.sort((a, b) => (rang[a[4]] ?? 9) - (rang[b[4]] ?? 9)
                      || String(a[0]).localeCompare(String(b[0]), 'fr'));
  const esc = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const csv = ['﻿ligne_demandee;resolution;article_retenu;univers;verdict;motif']
    .concat(rapport.map(l => l.map(esc).join(';')))
    .join('\n') + '\n';
  try{
    await fs.writeFile(path.join(process.cwd(), 'rapport-phares.csv'), csv, 'utf8');
    const ennuis = rapport.filter(l => l[4] === 'refusé' || l[4] === 'introuvable' || l[4] === 'doublon').length;
    console.log(`  ✎ rapport-phares.csv écrit — ${rapport.length} ligne(s), dont ${ennuis} à relire (en tête du fichier).`);
  }catch(e){ console.log(`  ! rapport-phares.csv non écrit : ${e.message}`); }
}

/* ─── passe 1 : les sujets curés, ceux dont on sait déjà qu'ils étonnent ─── */
async function passeInsolite(ctx, quoi){
  const { sources, index, pairs, claimed, scores, per } = ctx;
  const origine = quoi === 'saviez' ? 'saviez' : 'insolite';
  console.log(quoi === 'saviez'
    ? '\n▸ sources curées — « Le saviez-vous ? » / Did you know'
    : '\n▸ sources curées — listes d\'articles insolites');

  const parUnivers = new Map();     // univers -> Map(titre -> entrée)
  for (const lang of ['fr', 'en']){
    let entrees = [];
    try{ entrees = await moissonInsolite(lang, quoi); }
    catch(e){ console.log(`  ! moisson ${lang} impossible : ${e.message}`); continue; }
    for (const e of entrees){
      if (!parUnivers.has(e.univers)) parUnivers.set(e.univers, new Map());
      parUnivers.get(e.univers).set(lang + '|' + e.titre, { ...e, lang });
    }
  }

  let ajoutes = 0;
  for (const [uid, m] of parUnivers){
    const entrees = [...m.values()];
    const parLangue = { fr: entrees.filter(e => e.lang === 'fr'), en: entrees.filter(e => e.lang === 'en') };
    const info = new Map();          // titre -> entrée, pour retrouver le « pourquoi »

    let rows = [];
    for (const lang of ['fr', 'en']){
      const titres = parLangue[lang].map(e => e.titre);
      if (!titres.length) continue;
      parLangue[lang].forEach(e => info.set(e.titre, e));
      const qmap = await toQids(titres, lang);
      const qids = [...new Set(qmap.values())].filter(q => !claimed.has(q));
      if (!qids.length) continue;
      const r = await fromWikidata(qids);
      // on rattache l'entrée d'origine (le « pourquoi ») à la ligne
      for (const x of r){
        const src = info.get(x.fr) || info.get(x.en);
        if (src){ x.pourquoi = src.pourquoi; x.qualite = src.qualite; x.wlang = src.lang || lang; }
        x.cure = true;
      }
      rows = rows.concat(r);
    }
    if (!rows.length) continue;

    // dédoublonnage par identifiant Wikidata
    const vus = new Set();
    rows = rows.filter(r => (vus.has(r.qid) ? false : (vus.add(r.qid), true)));

    const enKeep = await verify('en', rows.map(r => r.en).filter(Boolean));
    const frKeep = await verify('fr', rows.map(r => r.fr).filter(Boolean));
    rows = rows.filter(r => (r.en && enKeep.has(r.en)) || (r.fr && frKeep.has(r.fr)));
    if (!rows.length){ console.log(`  ${uid} : rien de vérifiable`); continue; }

    rows.sort((a, b) => potentiel(b) - potentiel(a));
    rows = rows.slice(0, Math.max(per, 200));

    if (!sources[uid]) sources[uid] = { fr:[], en:[] };
    /* Un titre déjà présent AILLEURS ne doit pas réapparaître ici : deux
       univers pour un même sujet, c'est un doublon pour le lecteur. */
    const ailleurs = new Set();
    for (const autre of Object.keys(sources)){
      if (autre === uid) continue;
      for (const lang of ['fr','en']) for (const t of (sources[autre][lang] || [])) ailleurs.add(lang + '|' + t);
    }
    rows = rows.filter(r => !((r.fr && ailleurs.has('fr|' + r.fr)) || (r.en && ailleurs.has('en|' + r.en))));
    if (!rows.length){ console.log(`  ${uid} : tout est déjà classé ailleurs`); continue; }
    const seenFr = new Set(sources[uid].fr), seenEn = new Set(sources[uid].en);
    let aFr = 0, aEn = 0;
    for (const r of rows){
      const p = potentiel(r);
      if (r.fr && frKeep.has(r.fr) && !seenFr.has(r.fr)){
        sources[uid].fr.push(r.fr); seenFr.add(r.fr); aFr++;
        // la phrase n'est montrée que dans SA langue : une explication
        // anglaise dans une fiche française est illisible pour qui curate.
        scores['fr|' + r.fr] = { p, w: r.pourquoi || '', wl: r.wlang || '', c: 1, o: origine };
      }
      if (r.en && enKeep.has(r.en) && !seenEn.has(r.en)){
        sources[uid].en.push(r.en); seenEn.add(r.en); aEn++;
        scores['en|' + r.en] = { p, w: r.pourquoi || '', wl: r.wlang || '', c: 1, o: origine };
      }
      if (r.fr && r.en) pairs.set(r.fr, r.en);
      claimed.add(r.qid);
    }
    index[uid] = (index[uid] || []).concat(rows.map(r => r.qid));
    ajoutes += aFr + aEn;
    console.log(`  ✓ ${uid} : +${aFr} FR / +${aEn} EN`);
  }
  if (ajoutes) console.log(`  → ${ajoutes} sujets curés ajoutés`);
  else console.log(`::warning::Aucun sujet curé n'est entré au catalogue. Verifiez les lignes « · Wikipédia:Articles insolites → N sujets » ci-dessus : si elles affichent 0 ou sont absentes, la moisson a echoue.`);
  return ajoutes;
}

/* Le potentiel d'un sujet AVANT écriture, sur 10. Ce n'est pas une note
   d'insolite — seule la rédaction peut la donner — mais une estimation
   honnête, faite de trois signaux vérifiables :
     · la notoriété : combien d'éditions linguistiques ont un article dessus ;
     · l'appartenance à une liste d'articles insolites tenue à la main ;
     · le label de qualité (article de qualité, bon article).            */
/* Les mots que les wikipédiens emploient quand un sujet est vraiment étrange.
   Ils écrivent la phrase d'explication à la main : « le seul homme à… »,
   « morts en dansant », « personne n'a jamais su ». Ces marqueurs-là valent
   mieux que n'importe quelle statistique. */
const MARQUEURS = [
  /\bseule?s?\b|\bonly\b|\bunique\b|\bsole\b/i,
  /jamais|never|inexpliqu|unexplain|unsolved|myst[èe]r|mystery/i,
  /mort|tu[ée]s?\b|kill|died|death|fatal|asphyx|suicide/i,
  /impossible|absurde|absurd|bizarre|[ée]trange|strange|weird|odd\b/i,
  /disparu|disparition|vanish|missing|introuvable/i,
  /interdit|banned|forbidden|censur|ill[ée]gal|illegal/i,
  /canular|hoax|faux|forgery|fraude|fraud|supercherie/i,
  /record|plus grand|plus petit|largest|smallest|longest|oldest|heaviest/i,
  /accident|catastrophe|d[ée]sastre|disaster|explos/i,
  /refus|survi|surviv|immortel|immortal|ressuscit/i
];

/* Les marqueurs FORTS ne décrivent pas un mot, ils décrivent un fait qu'on
   raconte au dîner. Ils valent trois marqueurs ordinaires. C'est là que se
   trouvent les fiches « whouuu » : la méduse qui refuse de vieillir, l'homme
   sans nom sur la plage, les quatre cents danseurs de 1518.               */
const MARQUEURS_FORTS = [
  /\b(la |le |l['’])?seule? (personne|homme|femme|animal|esp[èe]ce|endroit|lieu|cas|fois|objet)\b|\bthe only (person|man|woman|animal|species|place|case|time|one)\b|seul au monde|only one in the world/i,
  /immortel|immortal|ne meurt jamais|refuse de (mourir|vieillir)|refuses? to (die|age)|rajeun|revert(s|ing)? to its (juvenile|younger)/i,
  /jamais (été )?(expliqu|[ée]lucid|identifi|retrouv|d[ée]chiffr)|toujours (pas|jamais) (expliqu|[ée]lucid)|personne ne sait|nul ne sait|never been (explained|identified|solved|deciphered)|remains? (unexplained|unidentified|unsolved|undeciphered)|no ?(one|body) knows/i,
  /disparu sans (laisser de )?trace|vanished without a trace|sans jamais [êe]tre retrouv|never (been )?found|jamais revu/i,
  /canular|hoax|supercherie|forgery|fabriqu[ée] de toutes pi[èe]ces|entirely fabricated/i,
  /le plus \w+ (du monde|de tous les temps|jamais)|the (largest|smallest|longest|shortest|oldest|heaviest|deepest|loudest|rarest|fastest|slowest|most \w+) (in the world|ever|known|on record)|record du monde|world record/i,
  /\d[\d   ]{2,}\s*(personnes|morts|victimes|habitants|people|deaths|victims|casualties)|asphyxi|extermin|an[ée]anti/i,
  /apr[èe]s sa mort|posthum|after (his|her) death|de son vivant jamais/i,
  /[ée]pid[ée]mie (dansante|de rire)|hyst[ée]rie collective|mass (hysteria|psychogenic)|contagion sociale/i,
  /pendant (plus de )?\d+ ans? sans|for \d+ years without|during \d+ years without|jusqu'en \d{4} sans/i
];

/* 0 à 3, donc un potentiel de 7 à 10 pour un sujet curé.
   Le comptage est volontairement exigeant : depuis que la phrase récupérée
   est la phrase ENTIÈRE du contributeur, un comptage naïf mettait tout le
   monde à 10/10 et le classement ne servait plus à rien. */
function indiceEtrangete(phrase){
  if (!phrase) return 0;                      // pas de phrase : on ne suppose rien
  let n = 0;
  for (const re of MARQUEURS)       if (re.test(phrase)) n += 1;
  for (const re of MARQUEURS_FORTS) if (re.test(phrase)) n += 3;
  if (n >= 6) return 3;
  if (n >= 3) return 2;
  if (n >= 1) return 1;
  return 0;
}

/* Le potentiel d'un sujet AVANT écriture, sur 10.
 *
 * L'ancienne formule partait de la notoriété — le nombre d'éditions
 * linguistiques — et n'ajoutait que trois points pour un sujet repéré comme
 * insolite. Résultat : « Tamám Shud », bizarre mais présent dans vingt-cinq
 * langues, obtenait 5 ; un sujet célèbre et parfaitement banal en obtenait 6.
 * Le classement récompensait la célébrité alors que Curio vend l'étonnement.
 *
 * Désormais l'origine décide :
 *   · repéré par un contributeur dans une liste d'articles insolites → 7 au
 *     moins, plus l'indice tiré de la phrase qu'il a écrite pour dire
 *     pourquoi, plus le label de qualité ;
 *   · trouvé par simple parcours de catégories → 6 au maximum, quelle que
 *     soit sa notoriété.
 * Un tri par potentiel décroissant remonte donc d'abord ce qui étonne.        */
function potentiel(r){
  let p;
  if (r.cure){
    p = 7;
    p += indiceEtrangete(r.pourquoi);                 // 0 à 3 → 7 à 10
    if (r.qualite) p += 1;                            // article de qualité / bon article
  } else {
    // la notoriété seule ne dit pas qu'un sujet est intéressant : elle plafonne
    p = 1 + Math.min(4, Math.round((r.n || 0) / 22));
    if (r.qualite) p += 1;
  }
  if (r.views) p += Math.min(1, Math.max(0, Math.round(Math.log10(Math.max(1, r.views)) - 4)));
  return Math.max(1, Math.min(10, p));
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LE CATALOGUE MAÎTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *  node tools/build-catalog.mjs --maitre
 *
 *  Une seule moisson, exhaustive, qui produit LA liste de référence :
 *
 *      catalogue-maitre.json   la nomenclature, un enregistrement par sujet
 *      catalogue-maitre.csv    la même chose, ouvrable dans un tableur
 *      catalog.json            la vue dont l'application a besoin
 *
 *  Un sujet, c'est un identifiant Wikidata. Pas un titre : « Pitch drop
 *  experiment » et « Expérience de la goutte de poix » sont le même sujet, et
 *  Wikidata est la seule autorité qui le sache. C'est ce qui rend les
 *  doublons impossibles, définitivement.
 *
 *  Trois sources, rapprochées :
 *      phare     vous l'avez inscrit dans consignes/sujets-phares.txt
 *      insolite  les listes d'articles insolites tenues par les wikipédiens
 *      saviez    « Le saviez-vous ? » / Did you know
 *  Un sujet trouvé dans deux ou trois d'entre elles est un sujet sur lequel
 *  deux ou trois jugements humains indépendants se rejoignent : il monte.
 *
 *  Ce qui n'entre pas :
 *      · ce qui n'a pas d'article vérifié, avec une vraie introduction ;
 *      · ce dont la phrase n'est qu'une définition ;
 *      · ce que vous avez retiré (consignes/exclusions.txt) ;
 *      · ce qui y est déjà.
 *
 *  RELANCER CETTE COMMANDE NE DÉTRUIT RIEN. Les sujets déjà présents gardent
 *  leur état — écrit, publié, retiré — et seuls les nouveaux sont ajoutés.
 *  Le journal dit exactement combien, et lesquels.
 * ======================================================================== */

const MAITRE = path.join(process.cwd(), 'catalogue-maitre.json');

/* Une phrase qui ne fait que définir n'a rien à faire ici. « X est une
   commune française du département de… » n'étonnera personne, et c'est
   précisément ce que les listes ramassent quand on ne les surveille pas. */
const DEFINITION = [
  /^[\wÀ-ÿ'’\- ]{2,40}\s+(est|était|sont|étaient)\s+(un|une|le|la|les|l['’])/i,
  /^[\w' \-]{2,40}\s+(is|was|are|were)\s+(a|an|the)\s/i,
  /^(le|la|les|l['’]|un|une)\s+[\wÀ-ÿ'’\- ]{2,40}\s+(désigne|est le nom|se réfère)/i,
  /\b(commune|municipalité|village|hameau|census-designated place|unincorporated community)\b.*\b(située?|located|dans le département|du département)\b/i,
  /\b(is|was)\s+(a|an)\s+(species|genus|album|song|film|village|town|commune|municipality|footballer|politician|American|British|French)\b/i
];

/* Et ce qui vaut vraiment le détour porte une trace : un marqueur d'étrangeté,
   un chiffre précis, un superlatif. On ne demande pas beaucoup — un seul
   signal suffit — mais on demande quelque chose. */
function signalAnecdote(phrase){
  if (!phrase) return 0;
  let n = indiceEtrangete(phrase);
  if (/\d[\d  ]{2,}/.test(phrase)) n++;                       // « 1 746 personnes »
  /* Les nombres écrits en toutes lettres comptent autant : une phrase soignée
     dit « quatre millions de soleils », pas « 4 000 000 ». Les oublier
     revenait à jeter les meilleures. */
  if (/\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|trente|quarante|cinquante|cent|cents|mille|million|millions|milliard|milliards|two|three|four|five|ten|twenty|hundred|thousand|million|billion)\b/i.test(phrase)) n++;
  if (/\b(premi[èe]re?|dernier|derni[èe]re|unique|jamais|toujours|encore|first|last|oldest|only|never|still)\b/i.test(phrase)) n++;
  if (/\b(plus \w+ (du monde|jamais|que)|le seul|la seule|sans que|personne|nul)\b/i.test(phrase)) n++;
  return n;
}

/* Les deux premières phrases d'une introduction : de quoi juger un sujet
   d'un coup d'oeil, pas une de plus. */
function deuxPhrases(t){
  const x = String(t || '').replace(/\s+/g, ' ').trim();
  if (!x) return '';
  const m = x.match(/^[\s\S]{20,340}?[.!?](?=\s|$)/);
  let r = m ? m[0] : x.slice(0, 300);
  if (r.length < 160){
    const m2 = x.slice(r.length).match(/^\s*[\s\S]{10,240}?[.!?](?=\s|$)/);
    if (m2) r += m2[0];
  }
  return r.trim().slice(0, 400);
}

function estDefinition(phrase){
  if (!phrase) return false;
  return DEFINITION.some(re => re.test(phrase));
}

/* Le titre commence par un numéro de catalogue (« 10199 Chariklo ») ou par
   une année (« 1908 Messina earthquake ») : ce n'est pas disqualifiant en
   soi, mais il faut alors que la phrase, elle, dise quelque chose. */
function titreNumerique(t){ return /^\d/.test(String(t || '').trim()); }

async function lireExclusions(){
  const hors = new Set();
  try{
    const brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'exclusions.txt'), 'utf8');
    for (const l of brut.split(/\r?\n/)){
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      hors.add(t.toLowerCase());
    }
  }catch{ /* pas de fichier : rien d'exclu */ }
  return hors;
}

async function lireMaitre(){
  try{ return JSON.parse(await fs.readFile(MAITRE, 'utf8')); }
  catch{ return { version:1, genere:null, sujets:[] }; }
}

const DECISIONS = path.join(process.cwd(), 'consignes', 'decisions.json');
async function lireDecisions(){
  try{ return JSON.parse(await fs.readFile(DECISIONS, 'utf8')) || {}; }
  catch{ return {}; }
}

/* Les entrées brutes des trois sources, ramenées à une seule liste.
   Chaque entrée porte : titre, langue, univers, phrase, origine. */
async function rassembler(){
  const brut = [];
  const phares = [];          // les lignes du fichier, dans l'ordre

  /* --- 1. vos sujets phares ---------------------------------------------- */
  try{
    const texte = await fs.readFile(path.join(process.cwd(), 'consignes', 'sujets-phares.txt'), 'utf8');
    let n = 0;
    for (const l of texte.split(/\r?\n/)){
      const s = l.trim();
      if (!s || s.startsWith('#') || !s.includes('|')) continue;
      const p = s.split('|').map(x => x.trim());
      if (!p[0]) continue;
      const uni = p[1] && UNIVERSES.some(u => u.id === p[1]) ? p[1] : 'mysteres';
      brut.push({ titre:p[0], lang:null, uni, phrase:p[2] || '', phraseLang:'fr', origine:'phare' });
      phares.push({ titre:p[0], uni, phrase:p[2] || '' });
      n++;
    }
    console.log(`  · phares    : ${n} ligne(s) dans consignes/sujets-phares.txt`);
  }catch{ console.log('  · phares    : consignes/sujets-phares.txt absent'); }

  /* --- 2 et 3. les deux moissons ----------------------------------------- */
  for (const quoi of ['insolite', 'saviez']){
    for (const lang of ['fr', 'en']){
      let e = [];
      try{ e = await moissonInsolite(lang, quoi); }
      catch(err){ console.log(`  ! moisson ${quoi}/${lang} impossible : ${err.message}`); continue; }
      for (const x of e){
        brut.push({ titre:x.titre, lang, uni:x.univers, phrase:x.pourquoi || '',
                    phraseLang:lang, origine:quoi, qualite:x.qualite || 0 });
      }
    }
  }
  return { brut, phares };
}

/* ═══════════ le fichier de sujets phares, nettoyé ═════════════════════════
   Vos 2 506 lignes ont été écrites de mémoire : certaines ne désignent aucun
   article, d'autres visent un article dont le vrai titre est différent. Une
   fois la moisson passée, on SAIT lesquelles tiennent — et sous quel titre
   exact. On réécrit donc le fichier avec ces seules lignes, chacune portant
   le titre canonique de Wikipédia.

   L'original est conservé en consignes/sujets-phares.avant-nettoyage.txt, et
   la réécriture est annulée si moins de la moitié des lignes survivent : un
   incident réseau ne doit pas vider votre fichier.                        */
async function nettoyerPhares(phares, qidDe, retenus){
  if (!phares.length) return;
  const dossier = path.join(process.cwd(), 'consignes');
  const fichier = path.join(dossier, 'sujets-phares.txt');
  const NOMS = {};
  for (const u of UNIVERSES) NOMS[u.id] = u.fr.name;

  const gardees = [];
  const vus = new Set();
  for (const l of phares){
    const q = qidDe.fr.get(l.titre) || qidDe.en.get(l.titre);
    if (!q) continue;
    const r = retenus.get(q);
    if (!r) continue;
    if (vus.has(q)) continue;              // deux lignes, un seul article
    vus.add(q);
    gardees.push({ titre: r.fr || r.en, uni: r.uni, phrase: l.phrase });
  }

  const part = gardees.length / phares.length;
  console.log(`\n▸ nettoyage de consignes/sujets-phares.txt`);
  console.log(`  · ${gardees.length} ligne(s) vérifiée(s) sur ${phares.length}.`);
  if (part < 0.5){
    console.log(`  ! Moins de la moitié ont survécu : le fichier n'est PAS réécrit.`);
    if (passePartielle){
      console.log(`    Rien d'anormal : cette passe s'est arrêtée avant d'avoir tout vérifié.`);
      console.log(`    Le fichier ne sera réécrit que le jour où une passe ira jusqu'au bout,`);
      console.log(`    pour ne jamais effacer des lignes qui n'ont simplement pas eu leur tour.`);
    } else {
      console.log(`    La passe est pourtant allée jusqu'au bout : c'est un incident réseau.`);
      console.log(`    Relancez la moisson.`);
    }
    return;
  }

  try{
    const sauvegarde = path.join(dossier, 'sujets-phares.avant-nettoyage.txt');
    await fs.access(sauvegarde).catch(async () => {
      await fs.copyFile(fichier, sauvegarde);
      console.log(`  · original conservé : consignes/sujets-phares.avant-nettoyage.txt`);
    });
  }catch(e){ /* pas grave */ }

  gardees.sort((a, b) => (a.uni < b.uni ? -1 : a.uni > b.uni ? 1 : 0)
                      || a.titre.localeCompare(b.titre, 'fr'));

  const tete = `# ═══════════════════════════════════════════════════════════════════════════
# SUJETS PHARES — ${gardees.length} lignes, toutes vérifiées
# ═══════════════════════════════════════════════════════════════════════════
#
# Chaque titre ci-dessous EXISTE sur Wikipédia et porte son orthographe
# exacte : la moisson les a confrontés un par un, et n'a gardé que ceux qui
# tiennent. Les lignes qui ne désignaient aucun article, ou un article
# étranger à leur phrase, ont été retirées.
#
# Ce fichier a été réécrit par « 1 · Moissonner ». L'original est en
# consignes/sujets-phares.avant-nettoyage.txt.
#
# FORMAT     titre de l'article Wikipédia | univers | pourquoi
#
# POUR AJOUTER  une ligne, n'importe où, puis « 1 · Moissonner ».
# POUR RETIRER  un # devant la ligne.
# ═══════════════════════════════════════════════════════════════════════════
`;

  const sortie = [tete];
  let courant = null;
  for (const g of gardees){
    if (g.uni !== courant){
      courant = g.uni;
      const n = gardees.filter(x => x.uni === courant).length;
      sortie.push(`\n# ── ${NOMS[courant] || courant} — ${n} sujets ${'─'.repeat(Math.max(3, 56 - (NOMS[courant] || courant).length))}\n`);
    }
    sortie.push(`${g.titre} | ${g.uni} | ${g.phrase}\n`);
  }
  await fs.writeFile(fichier + '.tmp', sortie.join(''), 'utf8');
  await fs.rename(fichier + '.tmp', fichier);
  console.log(`  ✓ consignes/sujets-phares.txt réécrit : ${gardees.length} lignes propres.`);
}

/* ═══════════ vos ajouts à vous, de n'importe quelle source ════════════════
   consignes/ajouts.json — un tableau, une entrée par sujet :

     [{ "titre": "Le type qui a vécu 10 ans dans un aéroport",
        "uni":   "histoire",
        "phrase":"Ce qu'il a raconté, et pourquoi personne ne l'a cru.",
        "texte": "Le texte de départ, s'il ne vient pas de Wikipédia…",
        "url":   "https://…" }]

   Deux cas, et le fichier les distingue tout seul :
     · avec un « texte » → le sujet n'a pas besoin de Wikipédia. Il entre au
       catalogue tel quel, et la rédaction travaillera sur VOTRE texte. C'est
       la porte pour les histoires Reddit, un article de presse, vos notes.
     · sans « texte » → le titre est cherché sur Wikipédia comme un phare.

   C'est purement ADDITIF. Une entrée déjà présente n'est jamais réécrite,
   et rien de l'existant n'est touché. Supprimer une ligne d'ici ne retire
   pas le sujet du catalogue : pour cela, la console ou exclusions.txt.   */
async function lireAjouts(){
  try{
    const t = await fs.readFile(path.join(process.cwd(), 'consignes', 'ajouts.json'), 'utf8');
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : (Array.isArray(j.ajouts) ? j.ajouts : []);
  }catch{ return []; }
}

function idManuel(titre){
  return 'M-' + String(titre).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function passeAjouts(deja){
  const ajouts = await lireAjouts();
  if (!ajouts.length) return 0;
  console.log(`\n▸ ajouts manuels — ${ajouts.length} entrée(s) dans consignes/ajouts.json`);
  let n = 0, vus = 0;
  for (const a of ajouts){
    if (!a || !a.titre) continue;
    const uni = a.uni && UNIVERSES.some(u => u.id === a.uni) ? a.uni : 'mysteres';
    const texte = String(a.texte || '').trim();
    if (!texte) continue;              // sans texte : c'est un phare, traité ailleurs
    const id = a.id || idManuel(a.titre);
    if (deja.has(id)){ vus++; continue; }
    deja.set(id, {
      qid: id,
      fr: String(a.titre), en: String(a.titreEn || ''),
      uni,
      sources: ['manuel'],
      phrase: String(a.phrase || ''), phraseLang: 'fr',
      apercu: texte.slice(0, 340), apercuLang: 'fr',
      texte,                            // la rédaction s'en servira telle quelle
      url: String(a.url || ''),
      potentiel: 10,
      editions: 0,
      ajoute: new Date().toISOString().slice(0, 10),
      statut: 'a-ecrire', ecrit: null, publie: null
    });
    n++;
    console.log(`  + ${uni.padEnd(10)} ${a.titre}`);
  }
  console.log(`  → ${n} ajout(s) au catalogue, ${vus} déjà présent(s).`);
  return n;
}

/* ═══════════════════════ REDDIT — une source, pas une corvée ══════════════
   Les histoires vraies de Reddit ne s'ajoutent pas à la main : c'est une
   SOURCE, au même titre que « Le saviez-vous ? ». Elle tourne dans la même
   moisson, chaque nuit, et alimente le même catalogue maître.

   Elle ne fait rien tant que consignes/reddit.txt ne liste pas de subreddit :
   le fichier livré est vide, avec le mode d'emploi en commentaires.

   Deux façons d'appeler Reddit, la meilleure d'abord :
     · avec un identifiant d'application (secrets REDDIT_ID et REDDIT_SECRET
       du dépôt) : jeton OAuth « application seule », quota confortable ;
     · sans : le point d'entrée public en .json, qui suffit pour quelques
       centaines de billets par nuit mais se fait limiter si on insiste.

   Ce qui entre : un billet AUTOPORTANT — assez long pour qu'on puisse en
   tirer une anecdote sans rien aller chercher ailleurs, assez voté pour
   qu'on sache que d'autres l'ont trouvé remarquable. Son texte devient la
   matière du rédacteur, exactement comme un article de Wikipédia.

   Ce qui n'entre pas : les liens sans texte, les images, les billets
   supprimés, ceux marqués NSFW ou spoiler, ceux trop courts, et tout ce que
   vous avez déjà — l'identifiant Reddit sert de clé, donc relancer
   n'ajoute jamais deux fois le même billet.                                */

async function reglagesReddit(){
  let brut = '';
  try{ brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'reddit.txt'), 'utf8'); }
  catch{ return null; }
  const r = { subs:[], votes:500, minCar:900, maxCar:9000, periode:'year', parSub:100, uni:'histoire' };
  for (const l of brut.split(/\r?\n/)){
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([\w-]+)\s*[:=]\s*(.+)$/);
    if (m){
      const c = m[1].toLowerCase(), v = m[2].trim();
      if (c === 'votes')   r.votes   = parseInt(v, 10) || r.votes;
      else if (c === 'longueurmini') r.minCar = parseInt(v, 10) || r.minCar;
      else if (c === 'longueurmaxi') r.maxCar = parseInt(v, 10) || r.maxCar;
      else if (c === 'periode') r.periode = v.toLowerCase();
      else if (c === 'parsub')  r.parSub  = Math.min(100, parseInt(v, 10) || r.parSub);
      else if (c === 'univers') r.uni = v;
      continue;
    }
    // une ligne nue est un subreddit, avec ou sans « r/ », avec un univers optionnel
    const p = t.split('|').map(x => x.trim());
    const nom = p[0].replace(/^\/?r\//i, '').replace(/[^\w-]/g, '');
    if (nom) r.subs.push({ nom, uni: (p[1] && UNIVERSES.some(u => u.id === p[1])) ? p[1] : null });
  }
  return r.subs.length ? r : null;
}

/* Jeton « application seule ». Sans secrets, on renvoie null et l'appel se
   fera sur le point d'entrée public. */
async function jetonReddit(){
  const id = process.env.REDDIT_ID, secret = process.env.REDDIT_SECRET;
  if (!id || !secret) return null;
  try{
    const r = await fetch('https://www.reddit.com/api/v1/access_token', {
      method:'POST',
      headers:{
        'Authorization': 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA
      },
      body: 'grant_type=client_credentials'
    });
    if (!r.ok){ console.log(`  ! jeton Reddit refusé (HTTP ${r.status}) — on passe par l'accès public.`); return null; }
    const j = await r.json();
    return j.access_token || null;
  }catch(e){ return null; }
}

async function billetsDe(sub, reg, jeton){
  const base = jeton ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
  const url = base + '/r/' + encodeURIComponent(sub) + '/top.json'
            + '?t=' + encodeURIComponent(reg.periode) + '&limit=' + reg.parSub;
  const entetes = { 'User-Agent': UA, 'Accept':'application/json' };
  if (jeton) entetes.Authorization = 'Bearer ' + jeton;

  for (let i = 0; i < 4; i++){
    try{
      const r = await fetch(url, { headers: entetes });
      if (r.status === 429 || r.status >= 500){ await sleep(3000 * (i + 1)); continue; }
      if (!r.ok){ console.log(`  ! r/${sub} : HTTP ${r.status}`); return []; }
      const j = await r.json();
      return (j?.data?.children || []).map(x => x.data).filter(Boolean);
    }catch(e){ await sleep(1500 * (i + 1)); }
  }
  console.log(`  ! r/${sub} : injoignable.`);
  return [];
}

/* Un billet Reddit lisible : du texte, pas un lien ; assez long ; assez voté ;
   ni supprimé, ni NSFW, ni spoiler. */
function billetUtilisable(b, reg){
  if (!b || b.stickied || b.over_18 || b.spoiler || b.is_video) return false;
  if (b.removed_by_category || b.author === '[deleted]') return false;
  const t = String(b.selftext || '').trim();
  if (t === '[removed]' || t === '[deleted]') return false;
  if (t.length < reg.minCar || t.length > reg.maxCar) return false;
  if ((b.score || 0) < reg.votes) return false;
  return true;
}

function nettoyerBillet(t){
  return String(t || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/^>.*$/gm, '')          // les citations : elles ne sont pas de l'auteur
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*|__|~~/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function passeReddit(deja){
  const reg = await reglagesReddit();
  if (!reg) return 0;
  console.log(`\n▸ Reddit — ${reg.subs.length} subreddit(s), billets de plus de ${reg.votes} votes`);
  const jeton = await jetonReddit();
  console.log(jeton ? '  · jeton d\'application obtenu.' : '  · accès public (sans secrets REDDIT_ID / REDDIT_SECRET).');

  let ajoutes = 0, vus = 0, ecartes = 0;
  for (const sub of reg.subs){
    if (tempsEcoule()){ console.log(`  ⏱ subreddits suivants reportés.`); break; }
    const billets = await billetsDe(sub.nom, reg, jeton);
    let n = 0;
    for (const b of billets){
      if (!billetUtilisable(b, reg)){ ecartes++; continue; }
      const id = 'R-' + b.id;
      if (deja.has(id)){ vus++; continue; }
      const texte = nettoyerBillet(b.selftext);
      if (texte.length < reg.minCar){ ecartes++; continue; }
      const titre = String(b.title || '').trim().slice(0, 200);
      if (!titre) continue;
      deja.set(id, {
        qid: id,
        fr: titre, en: '',
        uni: sub.uni || reg.uni,
        sources: ['reddit'],
        phrase: '', phraseLang: '',
        apercu: texte.slice(0, 340), apercuLang: 'en',
        texte,
        url: 'https://www.reddit.com' + (b.permalink || ''),
        votes: b.score || 0,
        sub: sub.nom,
        potentiel: Math.max(6, Math.min(10, 6 + Math.floor(Math.log10(Math.max(10, b.score || 0))))),
        editions: 0,
        ajoute: new Date().toISOString().slice(0, 10),
        statut: 'a-ecrire', ecrit: null, publie: null
      });
      ajoutes++; n++;
    }
    console.log(`  · r/${sub.nom} : ${billets.length} lus, +${n} retenus`);
  }
  console.log(`  → ${ajoutes} billet(s) ajouté(s), ${vus} déjà présent(s), ${ecartes} écarté(s) (trop court, trop peu voté, sans texte).`);
  if (!ajoutes && !vus)
    console.log(`  ! Rien n'est entré. Vérifiez consignes/reddit.txt : les seuils sont peut-être trop hauts.`);
  return ajoutes;
}

async function construireMaitre(){
  console.log('\n▸ moisson des trois sources');
  const { brut, phares } = await rassembler();
  console.log(`  → ${brut.length} entrée(s) brute(s) au total.`);
  if (!brut.length){
    console.log('::error::Aucune entrée moissonnée. Vérifiez le réseau et consignes/sujets-phares.txt.');
    return;
  }

  /* ---- identité : chaque titre devient un identifiant Wikidata ---------- */
  console.log('\n▸ identification (Wikidata)');
  const parLangue = { fr: new Set(), en: new Set() };
  for (const e of brut){
    if (e.lang) parLangue[e.lang].add(e.titre);
    else { parLangue.fr.add(e.titre); parLangue.en.add(e.titre); }
  }
  const qidDe = { fr:new Map(), en:new Map() };
  for (const lang of ['fr', 'en']){
    const titres = [...parLangue[lang]];
    if (!titres.length) continue;
    console.log(`  · ${lang} : ${titres.length} titre(s) à identifier…`);
    qidDe[lang] = await qidsParTitre(lang, titres);
    console.log(`    ${qidDe[lang].size} identifié(s).`);
  }

  /* ---- regroupement par sujet ------------------------------------------ */
  const sujets = new Map();          // qid -> enregistrement en construction
  let sansQid = 0;
  for (const e of brut){
    const q = e.lang ? qidDe[e.lang].get(e.titre)
                     : (qidDe.fr.get(e.titre) || qidDe.en.get(e.titre));
    if (!q){ sansQid++; continue; }
    let s = sujets.get(q);
    if (!s){
      s = { qid:q, uni:e.uni, sources:new Set(), phrase:'', phraseLang:'', qualite:0, titres:new Set() };
      sujets.set(q, s);
    }
    s.sources.add(e.origine);
    s.titres.add(e.titre);
    s.qualite = Math.max(s.qualite, e.qualite || 0);
    /* L'univers : le phare décide — c'est le vôtre —, sinon la première
       source qui en propose un. Une source qui n'en propose aucun (les
       archives « Le saviez-vous ? », dont les sections sont des dates)
       laisse la place vide : l'article la remplira à la vérification. */
    if (e.origine === 'phare') s.uni = e.uni;
    else if (!s.uni && e.uni) s.uni = e.uni;
    /* La phrase : celle du phare d'abord (c'est la vôtre), puis la française,
       puis la plus longue. Une phrase vaut mieux qu'aucune. */
    const mieux = (e.origine === 'phare' && s.phraseSource !== 'phare')
               || (!s.phrase)
               || (s.phraseLang !== 'fr' && e.phraseLang === 'fr' && s.phraseSource !== 'phare')
               || (e.phraseLang === s.phraseLang && e.phrase.length > s.phrase.length && s.phraseSource !== 'phare');
    if (mieux && e.phrase){
      s.phrase = e.phrase; s.phraseLang = e.phraseLang; s.phraseSource = e.origine;
    }
  }
  console.log(`  → ${sujets.size} sujet(s) distinct(s) ; ${sansQid} entrée(s) sans article identifiable.`);

  /* ---- ce qu'on a déjà, ce qu'on refuse -------------------------------- */
  const maitre = await lireMaitre();
  const deja = new Map((maitre.sujets || []).map(s => [s.qid, s]));
  const hors = await lireExclusions();
  const nouveaux = [...sujets.values()].filter(s => !deja.has(s.qid));
  console.log(`\n▸ comparaison avec le catalogue maître`);
  console.log(`  · ${deja.size} sujet(s) déjà connus, ${nouveaux.length} nouveau(x) à trier.`);
  if (!nouveaux.length){
    console.log('  → Rien de neuf. Votre catalogue maître est à jour.');
  }

  /* ---- vérification : l'article existe-t-il vraiment ? ------------------ */
  let ajoutes = 0, refusDef = 0, refusFaible = 0, refusArticle = 0, refusExclu = 0, sansAccord = 0;
  let rangesParArticle = 0;
  if (nouveaux.length){
    console.log('\n▸ vérification des articles');
    /* Vérifier coûte un appel par vingt articles, dans chaque langue. Sur
       vingt mille nouveaux sujets, c'est deux mille appels — dix minutes au
       mieux, une heure si Wikipédia nous freine. On en prend autant que le
       temps restant permet, et le reste attend la prochaine passe : ils sont
       déjà identifiés, ils ne se perdront pas. */
    /* ---- le tri qui ne coûte rien, AVANT celui qui coûte le réseau ------
       Sur cent mille sujets identifiés, quatre-vingt-dix mille n'ont aucune
       phrase de contributeur : ils seront écartés de toute façon, plus bas,
       par la même règle. Les vérifier d'abord revenait à dépenser tout le
       budget réseau pour finir par les jeter — cent nuits pour un catalogue
       qui en demande trois. On applique donc les règles gratuites en
       premier, et le réseau ne voit que ce qui a une chance d'entrer.   */
    const recevable = (s) => {
      if (estDefinition(s.phrase)) return 'definition';
      const m = String(s.phrase || '').trim().split(/\s+/).filter(Boolean).length;
      if (s.sources.has('phare')) return s.phrase ? '' : 'sans-phrase';
      return m < 8 ? 'sans-phrase' : '';
    };
    let ecarteDef = 0, ecarteFaible = 0;
    const eligibles = [];
    for (const s of nouveaux){
      const r = recevable(s);
      if (r === 'definition'){ ecarteDef++; continue; }
      if (r === 'sans-phrase'){ ecarteFaible++; continue; }
      eligibles.push(s);
    }
    if (ecarteDef + ecarteFaible)
      console.log(`  · ${ecarteDef + ecarteFaible} sujet(s) écartés sans un seul appel réseau `
                + `(${ecarteDef} définitions, ${ecarteFaible} sans phrase exploitable).`);

    /* Et on commence par les meilleurs : vos phares, puis les sujets que
       deux ou trois sources indépendantes désignent. Si une passe s'arrête
       en route, ce qui est entré est ce qui valait le plus. */
    eligibles.sort((a, b) => (b.sources.has('phare') - a.sources.has('phare'))
                          || (b.sources.size - a.sources.size)
                          || ((b.qualite || 0) - (a.qualite || 0)));

    /* ---- par tranches, tant que le temps le permet ----------------------
       Une estimation du nombre de sujets qu'on aurait le temps de vérifier
       était forcément fausse : elle valait 4 sujets par seconde restante,
       calibrée quand le réseau voyait tout passer. Depuis que le tri gratuit
       filtre en amont, la vraie cadence est trois à quatre fois meilleure —
       et la passe s'arrêtait à 9 168 sujets sur 16 141 après 12 minutes sur
       40 allouées, en laissant 27 minutes inutilisées.

       On ne devine plus : on traite par tranches de deux mille, et on en
       reprend une tant qu'il reste de quoi la finir. Le budget est rempli,
       jamais dépassé, et le reste attend la passe suivante.              */
    const TRANCHE = 2000;
    /* La réserve : de quoi finir une tranche et enregistrer. Proportionnelle
       au budget — sinon une passe courte, celle qu'on lance à la main pour
       voir, n'entrerait jamais dans la boucle et ne rapporterait rien. Et la
       première tranche part toujours : une tranche entamée puis interrompue
       enregistre ce qu'elle a fait, ce qui vaut mieux que rien. */
    const RESERVE = Math.min(4 * 60000, MINUTES * 60000 * 0.25);
    let traites = 0, numTranche = 0;
    if (eligibles.length) console.log(`  · ${eligibles.length} sujet(s) recevables à vérifier.`);

    while (traites < eligibles.length){
      if (tempsEcoule() || (traites && tempsRestant() < RESERVE)){
        passePartielle = true;
        break;
      }
      let aVerifier = eligibles.slice(traites, traites + TRANCHE);
      numTranche++;
      if (eligibles.length > TRANCHE)
        console.log(`  ▪ tranche ${numTranche} : ${aVerifier.length} sujet(s)  (${minutesFaites()} min)`);

    const qids = aVerifier.map(s => s.qid);
    const lignes = [];
    let interroges = 0;
    for (let i = 0; i < qids.length; i += 400){
      if (tempsEcoule()) break;
      const lot = await fromWikidata(qids.slice(i, i + 400));
      lignes.push(...lot);
      interroges = Math.min(i + 400, qids.length);
      console.log(`  · Wikidata ${interroges}/${qids.length}  (${minutesFaites()} min)`);
    }
    /* Si l'échéance tombe au milieu, les sujets dont le QID n'a pas été
       demandé ne sont pas « sans article » : ils n'ont pas été regardés. On
       les rend à la file au lieu de les compter en refus — sans quoi le
       journal accuserait Wikipédia d'un manque qui n'est que le nôtre. */
    if (interroges < qids.length){
      aVerifier = aVerifier.slice(0, interroges);
      passePartielle = true;
    }
    const parQid = new Map(lignes.map(r => [r.qid, r]));

    const introFr = new Map(), introEn = new Map();
    const frKeep = await verify('fr', lignes.map(r => r.fr).filter(Boolean), true, introFr);
    const enKeep = await verify('en', lignes.map(r => r.en).filter(Boolean), true, introEn);
    console.log(`  · ${frKeep.size} article(s) FR et ${enKeep.size} EN utilisables.  (${minutesFaites()} min)`);

    for (const s of aVerifier){
      const r = parQid.get(s.qid);
      if (!r){ refusArticle++; continue; }
      const okFr = r.fr && frKeep.has(r.fr), okEn = r.en && enKeep.has(r.en);
      if (!okFr && !okEn){ refusArticle++; continue; }

      const titre = (okFr && r.fr) || r.en;
      if (hors.has(String(titre).toLowerCase()) || (r.fr && hors.has(r.fr.toLowerCase()))
          || (r.en && hors.has(r.en.toLowerCase()))){ refusExclu++; continue; }

      const estPhare = s.sources.has('phare');
      /* Une définition n'est pas une anecdote. On l'écarte, phare ou pas :
         c'est la promesse du produit qui est en jeu. */
      if (estDefinition(s.phrase)){ refusDef++; continue; }
      /* Et il faut une phrase. Un sujet sans explication n'est pas un sujet :
         c'est un titre, et personne ne sait pourquoi il serait étonnant.
         La barre s'arrête là — exiger en plus des « marqueurs » jetait les
         meilleures phrases, celles qui écrivent leurs nombres en toutes
         lettres. La sévérité, c'est le contrôle après écriture qui l'exerce,
         sur un texte réel plutôt que sur un pressentiment. */
      const mots = String(s.phrase || '').trim().split(/\s+/).filter(Boolean).length;
      if (!estPhare && mots < 8){ refusFaible++; continue; }
      if (estPhare && !s.phrase){ refusFaible++; continue; }
      void titreNumerique;

      const p = Math.max(1, Math.min(10,
        4 + Math.min(3, signalAnecdote(s.phrase)) + (estPhare ? 2 : 0)
          + (s.sources.size >= 3 ? 2 : s.sources.size >= 2 ? 1 : 0)
          + (s.qualite ? 1 : 0)));

      /* L'introduction française est déjà téléchargée par la vérification :
         la jeter serait absurde. On en garde les deux premières phrases, et
         la curation a de quoi montrer du FRANÇAIS pour tous les sujets — y
         compris ceux dont la phrase de contributeur est anglaise — sans un
         seul appel réseau de plus, et avant d'avoir dépensé un centime. */
      const brutIntro = introFr.get(r.fr) || '';
      const apercu = deuxPhrases(brutIntro) || deuxPhrases(introEn.get(r.en) || '');
      const apercuLang = brutIntro ? 'fr' : (introEn.get(r.en) ? 'en' : '');

      /* L'accord : combien de mots signifiants la phrase partage-t-elle avec
         l'article ? C'est ce chiffre qui aurait crié « Pac-Man » — la phrase
         parlait d'un poulpe, l'article d'un jeu d'arcade, zéro mot commun.
         On ne refuse rien là-dessus : une phrase peut légitimement raconter
         un épisode que l'introduction ne mentionne pas. On le MESURE, on
         l'écrit dans le CSV et dans le catalogue, et vous triez dessus.  */
      const accord = motsPartages(s.phrase, brutIntro + ' ' + (introEn.get(r.en) || ''));
      if (!accord) sansAccord++;

      /* L'univers, quand la source n'en désignait aucun : on le lit dans
         l'article. Le titre, votre phrase et les deux introductions sont là,
         déjà téléchargés. Faute de signal, « mystères » reste le fourre-tout
         — mais il ne l'est plus par défaut, seulement en dernier recours. */
      const uni = s.uni
              || universDeTexte([r.fr, r.en, s.phrase, brutIntro, introEn.get(r.en) || ''].join(' '))
              || 'mysteres';
      if (!s.uni) rangesParArticle += (uni === 'mysteres' ? 0 : 1);

      deja.set(s.qid, {
        qid: s.qid,
        fr: okFr ? r.fr : '',
        en: okEn ? r.en : '',
        uni,
        sources: [...s.sources].sort(),
        phrase: s.phrase,
        phraseLang: s.phraseLang,
        apercu, apercuLang,
        accord,
        potentiel: p,
        editions: r.n || 0,
        ajoute: new Date().toISOString().slice(0, 10),
        statut: 'a-ecrire',      // a-ecrire → ecrit → controle → publie
        ecrit: null, publie: null
      });
      ajoutes++;
    }
      traites += aVerifier.length;
    }   /* fin de la tranche */

    const reste = eligibles.length - traites;
    console.log(`\n  → ${ajoutes} sujet(s) ajouté(s) au catalogue maître.`);
    if (rangesParArticle)
      console.log(`     ${rangesParArticle} rangé(s) dans leur univers d'après l'article lui-même `
                + `(la source ne le disait pas).`);
    if (reste > 0) console.log(`     ${reste} sujet(s) recevables pas encore vérifiés : la prochaine passe s'en charge.`);
    console.log(`     ${refusArticle} sans article utilisable, ${refusDef} définitions écartées, `
              + `${refusFaible} sans signal d'anecdote, ${refusExclu} exclus par vos soins.`);
    if (sansAccord)
      console.log(`     ${sansAccord} dont la phrase ne partage AUCUN mot avec l'article : colonne « accord » `
                + `du CSV à 0, à regarder en premier.`);
  }

  await passeAjouts(deja);
  try{ await passeReddit(deja); }
  catch(e){ console.log('  ! Reddit interrompu : ' + e.message + ' — le reste du catalogue est intact.'); }

  /* ---- écriture des trois fichiers -------------------------------------- */
  const liste = [...deja.values()].sort((a, b) => (b.potentiel - a.potentiel)
                                              || String(a.fr || a.en).localeCompare(String(b.fr || b.en), 'fr'));
  const doc = { version:1, genere:new Date().toISOString(), total:liste.length, sujets:liste };
  await fs.writeFile(MAITRE + '.tmp', JSON.stringify(doc, null, 1), 'utf8');
  await fs.rename(MAITRE + '.tmp', MAITRE);

  await ecrireCsvMaitre(liste);
  await vueApplication(liste);
  await nettoyerPhares(phares, qidDe, deja);

  /* ---- le compte rendu -------------------------------------------------- */
  const parSource = {}, parUni = {}, parStatut = {}, parPot = {};
  for (const s of liste){
    const cle = (s.sources || []).join('+') || '?';
    parSource[cle] = (parSource[cle] || 0) + 1;
    parUni[s.uni] = (parUni[s.uni] || 0) + 1;
    parStatut[s.statut] = (parStatut[s.statut] || 0) + 1;
    parPot[s.potentiel] = (parPot[s.potentiel] || 0) + 1;
  }
  const bilingues = liste.filter(s => s.fr && s.en).length;
  console.log(`\n╔══ CATALOGUE MAÎTRE ═══════════════════════════════════════`);
  console.log(`║  ${liste.length} sujets, tous vérifiés, aucun doublon.`);
  console.log(`║  ${bilingues} existent dans les deux langues, `
            + `${liste.filter(s => s.fr && !s.en).length} en français seul, `
            + `${liste.filter(s => !s.fr && s.en).length} en anglais seul.`);
  console.log(`╠══ provenance ─────────────────────────────────────────────`);
  for (const [k, v] of Object.entries(parSource).sort((a,b) => b[1]-a[1]))
    console.log(`║  ${String(k).padEnd(24)} ${String(v).padStart(6)}`);
  console.log(`╠══ univers ────────────────────────────────────────────────`);
  for (const [k, v] of Object.entries(parUni).sort((a,b) => b[1]-a[1]))
    console.log(`║  ${String(k).padEnd(24)} ${String(v).padStart(6)}`);
  console.log(`╠══ état ───────────────────────────────────────────────────`);
  for (const [k, v] of Object.entries(parStatut))
    console.log(`║  ${String(k).padEnd(24)} ${String(v).padStart(6)}`);
  console.log(`╠══ potentiel ──────────────────────────────────────────────`);
  console.log(`║  ` + [10,9,8,7,6,5,4,3,2,1].map(n => n + ':' + (parPot[n] || 0)).join('  '));
  console.log(`╚═══════════════════════════════════════════════════════════`);
  console.log(`\nÉcrit : catalogue-maitre.json, catalogue-maitre.csv, catalog.json`);
  console.log(`Passe terminée en ${minutesFaites()} minute(s) sur ${MINUTES} allouées.`);
  if (budgetAnnonce){
    console.log(`\n⏱ CETTE PASSE N'A PAS TOUT FAIT, ET C'EST NORMAL.`);
    console.log(`  Le catalogue s'agrandit à chaque nuit. Rien n'est perdu, rien n'est`);
    console.log(`  à refaire : ce qui est ci-dessus est enregistré, et la passe suivante`);
    console.log(`  reprend exactement là où celle-ci s'arrête — plus vite, grâce au cache.`);
    console.log(`  Relancez à la main si vous ne voulez pas attendre minuit.`);
  }
}

/* Le catalogue maître est la vérité ; catalog.json n'en est que la vue dont
   l'application a besoin. On le régénère intégralement à partir du maître,
   jamais l'inverse. */
/* Le tableur du catalogue maître. Sorti de construireMaitre pour que les
   opérations d'entretien qui changent le catalogue — ranger, purger — le
   régénèrent elles aussi, au lieu de laisser un CSV qui dit autre chose que
   le catalogue. */
async function ecrireCsvMaitre(liste){
  const esc = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const csv = ['﻿qid;univers;titre_fr;titre_en;sources;potentiel;accord;statut;ajoute;ecrit;publie;phrase;apercu']
    .concat(liste.map(s => [s.qid, s.uni, esc(s.fr), esc(s.en), esc((s.sources || []).join('+')),
                            s.potentiel, (s.accord == null ? '' : s.accord),
                            s.statut, s.ajoute || '', s.ecrit || '', s.publie || '',
                            esc(s.phrase), esc(s.apercu)].join(';')));
  await fs.writeFile(path.join(process.cwd(), 'catalogue-maitre.csv'), csv.join('\n') + '\n', 'utf8');
}

async function vueApplication(liste){
  const sources = {}, scores = {}, index = {}, pairs = [];
  for (const s of liste){
    if (s.statut === 'retire') continue;
    const u = s.uni;
    if (!sources[u]) sources[u] = { fr:[], en:[] };
    if (!index[u]) index[u] = [];
    index[u].push(s.qid);
    const o = (s.sources || []).includes('phare') ? 'phare'
            : (s.sources || []).includes('insolite') ? 'insolite'
            : (s.sources || []).includes('saviez') ? 'saviez' : 'categorie';
    /* `a` : l'aperçu français, écrit une fois pour toutes à la moisson. La
       curation n'a donc plus rien à demander à Wikipédia, et vous lisez du
       français même quand la phrase du contributeur est anglaise. */
    if (s.fr){
      sources[u].fr.push(s.fr);
      scores['fr|' + s.fr] = { p:s.potentiel, w:s.phraseLang === 'fr' ? s.phrase : '', wl:s.phraseLang,
                               a:s.apercuLang === 'fr' ? (s.apercu || '') : '', al:s.apercuLang || '',
                               c:1, f:o === 'phare' ? 1 : 0, o, n:(s.sources || []).length };
    }
    if (s.en){
      sources[u].en.push(s.en);
      scores['en|' + s.en] = { p:s.potentiel, w:s.phraseLang === 'en' ? s.phrase : '', wl:s.phraseLang,
                               a:s.apercuLang === 'en' ? (s.apercu || '') : '', al:s.apercuLang || '',
                               c:1, f:o === 'phare' ? 1 : 0, o, n:(s.sources || []).length };
    }
    if (s.fr && s.en) pairs.push({ fr:s.fr, en:s.en });
  }
  const paires = new Map(pairs.map(p => [p.fr, p.en]));
  const cat = {
    generated: new Date().toISOString(),
    maitre: true,
    themes: UNIVERSES.map(u => ({ id:u.id, hue:u.hue, free:u.free, fr:u.fr, en:u.en })),
    sources, index, pairs, scores,
    counts: counts(sources, paires)
  };
  await writeAtomic(cat);
}

/* -------------------------------------------------------------- catalogue */
async function readCatalog(){
  try{ return JSON.parse(await fs.readFile(OUT, 'utf8')); }
  catch{ return { themes:[], sources:{}, index:{} }; }
}
function total(sources){
  return Object.values(sources).reduce((s, v) => s + (v.fr?.length || 0) + (v.en?.length || 0), 0);
}
async function writeAtomic(obj){
  const tmp = OUT + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj));
  await fs.rename(tmp, OUT);                       // remplacement atomique
}

/* -------------------------------------------------------------------- main */
async function main(){
  await fs.mkdir(CACHE, { recursive:true });
  await universSupplementaires();

  const previous = await readCatalog();
  const before   = total(previous.sources || {});
  const sources  = JSON.parse(JSON.stringify(previous.sources || {}));
  const claimed  = new Set(Object.values(previous.index || {}).flat());   // QID déjà pris
  const pairs    = new Map((previous.pairs || []).map(p => [p.fr, p.en]));  // FR ↔ EN
  const scores   = Object.assign({}, previous.scores || {});   // potentiel avant écriture

  const wanted = ONLY && ONLY !== 'tous' ? String(ONLY).split(',').map(s => s.trim()) : null;
  const universes = UNIVERSES.filter(u => !wanted || wanted.includes(u.id));

  /* ---- LE MODE PRINCIPAL : construire le catalogue maître ---- */
  if (MODE_MAITRE){
    await construireMaitre();
    return;
  }

  /* ═══════════ accorder : mesurer l'accord phrase / article ══════════════
     Pour les sujets entrés AVANT la version 8.4 : ils n'ont pas de note
     d'accord, donc rien ne les signale dans la console. On la calcule ici à
     partir de l'aperçu que le catalogue conserve déjà — instantané, gratuit,
     sans un seul appel réseau. Un accord de 0 ne retire rien : il allume le
     badge « ⚠ à vérifier » et remplit le filtre du même nom.             */
  if (ACCORDER){
    const maitre = await lireMaitre();
    if (!maitre.sujets || !maitre.sujets.length){
      console.log('Aucun catalogue maître. Lancez « 1 · Moissonner ».');
      return;
    }
    let zero = 0, calcules = 0;
    const exemples = [];
    for (const s of maitre.sujets){
      /* L'aperçu, ce sont les deux premières phrases de l'article : moins
         que l'introduction entière, mais c'est ce que le catalogue garde,
         et c'est là que l'article dit de quoi il parle. */
      s.accord = motsPartages(s.phrase, s.apercu || '');
      calcules++;
      if (s.accord === 0){
        zero++;
        if (exemples.length < 25) exemples.push(`${(s.uni || '').padEnd(10)} ${s.fr || s.en}`);
      }
    }
    maitre.genere = new Date().toISOString();
    await fs.writeFile(MAITRE + '.tmp', JSON.stringify(maitre, null, 1), 'utf8');
    await fs.rename(MAITRE + '.tmp', MAITRE);
    console.log(`\n✓ ${calcules} sujet(s) mesurés. ${zero} n'ont AUCUN mot en commun entre votre phrase et l'article.`);
    if (exemples.length){
      console.log(`\n  Les premiers à regarder — console.html → « ⚠ À vérifier » :`);
      for (const e of exemples) console.log('   · ' + e);
      if (zero > exemples.length) console.log(`   … et ${zero - exemples.length} autre(s).`);
    }
    console.log(`\n  Rien n'a été retiré. Un accord à 0 est un doute, pas un verdict :`);
    console.log(`  une phrase peut raconter un épisode que l'introduction ne mentionne pas.`);
    console.log(`  Pour sortir vraiment un sujet : consignes/exclusions.txt puis « purger ».`);
    return;
  }

  /* ═══════════ auditer : la passe qualité sur les seuls RETENUS ══════════
     La moisson vérifie des dizaines de milliers de sujets, vite. Ce que vous
     vous apprêtez à PAYER, c'est quelques centaines. Ceux-là méritent un
     examen sérieux — et comme ils sont peu nombreux, il tient en trois
     minutes de réseau.

     On reprend chaque sujet retenu à zéro : l'article existe-t-il toujours,
     son introduction est-elle assez fournie, n'est-ce pas une page
     d'homonymie, la phrase parle-t-elle bien de cet article-là, n'est-ce pas
     une définition d'encyclopédie, le titre a-t-il été renommé depuis la
     moisson ?

     Deux niveaux de verdict, et c'est délibéré :
       · GRAVE  — le sujet n'a rien à faire dans une tranche payante ;
       · DOUTE  — c'est peut-être très bien, mais regardez-le.
     Rien n'est jamais supprimé. Sans --appliquer, l'audit ne fait que dire ;
     avec, les GRAVES passent en « écarté » dans decisions.json — c'est-à-dire
     que l'écriture ne les prendra pas, et rien d'autre.                   */
  if (AUDITER){
    const maitre = await lireMaitre();
    if (!maitre.sujets || !maitre.sujets.length){
      console.log('Aucun catalogue maître. Lancez « 1 · Moissonner ».');
      return;
    }
    const decisions = await lireDecisions();
    const retenus = maitre.sujets.filter(s => decisions[s.qid] === 'retenu');
    if (!retenus.length){
      console.log('Aucun sujet retenu dans consignes/decisions.json.');
      console.log('Ouvrez console.html, filtrez (par exemple « Potentiel 9 et plus »),');
      console.log('cliquez « Retenir ces N », puis « Enregistrer mes décisions ».');
      return;
    }
    console.log(`\n▸ audit qualité de ${retenus.length} sujet(s) retenu(s)`);
    console.log(`  (le reste du catalogue n'est pas touché, et rien n'est supprimé)`);

    const hors = await lireExclusions();
    const verdicts = new Map();     // qid -> { niveau, motif }
    const noter = (q, niveau, motif) => {
      const v = verdicts.get(q);
      if (!v || (v.niveau === 'doute' && niveau === 'grave')) verdicts.set(q, { niveau, motif });
    };

    /* ---- 1. ce qui se voit sans réseau ---------------------------------- */
    const vus = new Map();          // titre normalisé -> premier qid vu
    for (const s of retenus){
      const mots = String(s.phrase || '').trim().split(/\s+/).filter(Boolean).length;
      if (!s.fr && !s.en)                     noter(s.qid, 'grave', 'aucun titre');
      else if (!s.phrase)                     noter(s.qid, 'grave', 'aucune phrase : on ne saurait pas quoi raconter');
      else if (estDefinition(s.phrase))       noter(s.qid, 'grave', 'la phrase est une définition, pas une anecdote');
      else if (mots < 8)                      noter(s.qid, 'grave', `phrase trop courte (${mots} mots)`);
      const t = String(s.fr || s.en).toLowerCase();
      if (hors.has(t) || (s.fr && hors.has(s.fr.toLowerCase())) || (s.en && hors.has(s.en.toLowerCase())))
        noter(s.qid, 'grave', 'présent dans consignes/exclusions.txt');
      if (vus.has(t)) noter(s.qid, 'grave', 'doublon de titre avec ' + vus.get(t));
      else vus.set(t, s.qid);
      if ((s.potentiel || 0) <= 5)            noter(s.qid, 'doute', `potentiel faible (${s.potentiel || '?'})`);
      if (s.statut && s.statut !== 'a-ecrire') noter(s.qid, 'doute', 'déjà écrit : l\'écriture le sautera');
    }

    /* ---- 2. ce que seul le réseau peut dire ----------------------------- */
    const qids = retenus.map(s => s.qid);
    const lignes = [];
    let interroges = 0;
    for (let i = 0; i < qids.length; i += 400){
      if (tempsEcoule()) break;
      lignes.push(...await fromWikidata(qids.slice(i, i + 400)));
      interroges = Math.min(i + 400, qids.length);
      console.log(`  · Wikidata ${interroges}/${qids.length}  (${minutesFaites()} min)`);
    }
    const parQid = new Map(lignes.map(r => [r.qid, r]));
    const introFr = new Map(), introEn = new Map();
    const frKeep = await verify('fr', lignes.map(r => r.fr).filter(Boolean), true, introFr);
    const enKeep = await verify('en', lignes.map(r => r.en).filter(Boolean), true, introEn);
    console.log(`  · ${frKeep.size} article(s) FR et ${enKeep.size} EN utilisables.  (${minutesFaites()} min)`);

    /* Une page d'homonymie n'est pas un sujet : son introduction le dit. */
    const HOMONYMIE = /(peut (?:d[ée]signer|faire r[ée]f[ée]rence)|may refer to|can refer to|est un (?:nom|pr[ée]nom) (?:de famille|port[ée])|is a (?:surname|given name))/i;

    let vusReseau = 0, renommes = 0;
    for (const s of retenus){
      if (interroges < qids.length && qids.indexOf(s.qid) >= interroges) continue;  // pas regardé
      vusReseau++;
      const r = parQid.get(s.qid);
      if (!r){ noter(s.qid, 'grave', 'article introuvable sur Wikidata (supprimé ou fusionné)'); continue; }
      const okFr = r.fr && frKeep.has(r.fr), okEn = r.en && enKeep.has(r.en);
      if (!okFr && !okEn){ noter(s.qid, 'grave', 'article trop maigre ou disparu dans les deux langues'); continue; }

      const iFr = introFr.get(r.fr) || '', iEn = introEn.get(r.en) || '';
      if (HOMONYMIE.test(iFr) || HOMONYMIE.test(iEn))
        noter(s.qid, 'grave', 'page d\'homonymie : ce n\'est pas un sujet');

      /* le titre a pu changer depuis la moisson — on le remet à jour */
      if ((r.fr && r.fr !== s.fr) || (r.en && r.en !== s.en)){
        renommes++;
        noter(s.qid, 'doute', `renommé depuis la moisson → « ${r.fr || r.en} »`);
        s.fr = okFr ? r.fr : s.fr; s.en = okEn ? r.en : s.en;
      }

      /* l'accord, recalculé sur l'introduction ENTIÈRE — plus fiable que sur
         les deux phrases que le catalogue conserve. C'est la barrière qui
         aurait crié « Pac-Man ». */
      const accord = motsPartages(s.phrase, iFr + ' ' + iEn);
      s.accord = accord;
      s.apercu = deuxPhrases(iFr) || deuxPhrases(iEn) || s.apercu;
      s.apercuLang = iFr ? 'fr' : (iEn ? 'en' : s.apercuLang);
      if (accord === 0)
        noter(s.qid, 'doute', 'la phrase ne partage aucun mot avec l\'article');
    }

    /* ---- 3. le rapport --------------------------------------------------- */
    const rang = { grave:0, doute:1, ok:2 };
    const lignesCsv = retenus.map(s => {
      const v = verdicts.get(s.qid) || { niveau:'ok', motif:'' };
      return [s.qid, s.fr || '', s.en || '', s.uni, s.potentiel, (s.accord == null ? '' : s.accord),
              v.niveau, v.motif];
    }).sort((a, b) => (rang[a[6]] - rang[b[6]]) || (b[4] - a[4])
                   || String(a[1] || a[2]).localeCompare(String(b[1] || b[2]), 'fr'));
    const esc = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
    const csv = ['﻿qid;titre_fr;titre_en;univers;potentiel;accord;verdict;motif']
      .concat(lignesCsv.map(l => l.map(esc).join(';'))).join('\n') + '\n';
    await fs.writeFile(path.join(process.cwd(), 'audit-retenus.csv'), csv, 'utf8');

    const graves = lignesCsv.filter(l => l[6] === 'grave');
    const doutes = lignesCsv.filter(l => l[6] === 'doute');
    const parMotif = {};
    for (const l of graves.concat(doutes)) parMotif[l[7]] = (parMotif[l[7]] || 0) + 1;

    /* le catalogue garde les accords et les titres rafraîchis */
    maitre.genere = new Date().toISOString();
    await fs.writeFile(MAITRE + '.tmp', JSON.stringify(maitre, null, 1), 'utf8');
    await fs.rename(MAITRE + '.tmp', MAITRE);
    await vueApplication(maitre.sujets);
    await ecrireCsvMaitre(maitre.sujets);

    console.log(`\n╔══ AUDIT DES SUJETS RETENUS ═══════════════════════════════`);
    console.log(`║  ${retenus.length} retenu(s), ${vusReseau} passé(s) au réseau.`);
    console.log(`║  ${retenus.length - graves.length - doutes.length} sans réserve`
              + `  ·  ${doutes.length} à regarder  ·  ${graves.length} à écarter`);
    if (renommes) console.log(`║  ${renommes} article(s) renommé(s) depuis la moisson : titres mis à jour.`);
    console.log(`╠══ motifs ─────────────────────────────────────────────────`);
    for (const [m, n] of Object.entries(parMotif).sort((a, b) => b[1] - a[1]))
      console.log(`║  ${String(n).padStart(5)}  ${m}`);
    console.log(`╚═══════════════════════════════════════════════════════════`);
    if (interroges < qids.length)
      console.log(`\n  ⏱ ${qids.length - interroges} sujet(s) non regardés faute de temps : relancez l'audit.`);

    if (graves.length){
      console.log(`\n  Les premiers à écarter :`);
      for (const l of graves.slice(0, 20)) console.log(`   · ${(l[1] || l[2])} — ${l[7]}`);
      if (graves.length > 20) console.log(`   … et ${graves.length - 20} autre(s), dans audit-retenus.csv.`);
    }

    if (APPLIQUER && graves.length){
      for (const l of graves) decisions[l[0]] = 'ecarte';
      await fs.writeFile(DECISIONS, JSON.stringify(decisions, null, 1), 'utf8');
      console.log(`\n✓ ${graves.length} sujet(s) passés en « écarté » dans consignes/decisions.json.`);
      console.log(`  Il reste ${retenus.length - graves.length} sujet(s) retenus. Rien n'est supprimé :`);
      console.log(`  ils restent au catalogue, et vous pouvez les reprendre dans la console.`);
    } else if (graves.length){
      console.log(`\n  Pour les écarter d'un coup : relancez avec « appliquer » coché.`);
      console.log(`  Sans cela, l'audit ne fait que dire — vos décisions sont intactes.`);
    }
    console.log(`\n  Le détail complet, ligne par ligne : audit-retenus.csv`);
    return;
  }

  /* ═══════════ ranger : remettre chaque sujet dans son univers ═══════════
     Les archives « Le saviez-vous ? » ont des sections datées — « Janvier
     2015 » ne dit rien du sujet. Jusqu'en 8.4.1, faute de signal, tout
     tombait dans « Mystères » : 12 810 sujets sur 16 185 dans un seul
     univers, et sept univers vides.

     Ceci répare un catalogue déjà constitué, à partir de l'aperçu et de la
     phrase que le catalogue conserve : instantané, sans un seul appel
     réseau. On ne touche QUE les sujets rangés dans « Mystères », jamais un
     sujet phare — l'univers y est le vôtre —, jamais un sujet déjà écrit ou
     publié : ses fiches vivent dans le fichier de son univers, les déplacer
     casserait le lien.                                                    */
  if (RANGER){
    const maitre = await lireMaitre();
    if (!maitre.sujets || !maitre.sujets.length){
      console.log('Aucun catalogue maître. Lancez « 1 · Moissonner ».');
      return;
    }
    const avant = {}, apres = {};
    let deplaces = 0, gardes = 0, intouchables = 0;
    for (const s of maitre.sujets){
      avant[s.uni] = (avant[s.uni] || 0) + 1;
      const phare = (s.sources || []).includes('phare');
      const ecrit = s.statut && s.statut !== 'a-ecrire';
      if (s.uni !== 'mysteres' || phare || ecrit){
        if (s.uni === 'mysteres' && (phare || ecrit)) intouchables++;
        apres[s.uni] = (apres[s.uni] || 0) + 1;
        continue;
      }
      const u = universDeTexte([s.fr, s.en, s.phrase, s.apercu].filter(Boolean).join(' '));
      if (u && u !== 'mysteres'){ s.uni = u; deplaces++; }
      else gardes++;
      apres[s.uni] = (apres[s.uni] || 0) + 1;
    }
    maitre.genere = new Date().toISOString();
    await fs.writeFile(MAITRE + '.tmp', JSON.stringify(maitre, null, 1), 'utf8');
    await fs.rename(MAITRE + '.tmp', MAITRE);
    await vueApplication(maitre.sujets);
    await ecrireCsvMaitre(maitre.sujets);
    console.log(`\n✓ ${deplaces} sujet(s) rangés dans leur univers d'après leur article.`);
    console.log(`  ${gardes} restent en « Mystères » : l'article ne donne aucun signal, `
              + `et c'est souvent justifié (disparitions, énigmes, canulars).`);
    if (intouchables)
      console.log(`  ${intouchables} laissés tels quels : sujets phares (l'univers est le vôtre) `
                + `ou fiches déjà écrites.`);
    const cles = [...new Set([...Object.keys(avant), ...Object.keys(apres)])]
      .sort((a, b) => (apres[b] || 0) - (apres[a] || 0));
    console.log(`\n  univers          avant     après`);
    for (const k of cles)
      console.log(`  ${String(k).padEnd(14)} ${String(avant[k] || 0).padStart(6)} ${String(apres[k] || 0).padStart(9)}`);
    console.log(`\n  catalog.json et catalogue-maitre.csv sont régénérés : la console et `
              + `l'application voient le nouveau classement tout de suite.`);
    return;
  }

  /* ═══════════ purger : sortir ce que vous avez refusé ═══════════════════
     Vous cochez en curation les quelques sujets dont vous ne voulez pas, vous
     copiez, vous collez dans consignes/exclusions.txt, vous lancez ceci. Les
     sujets sortent du catalogue maître et de la vue de l'application. Aucune
     fiche écrite n'est touchée — pour celles-là, « 5 · Publier → retirer ».
     Gratuit, sans réseau, et la moisson ne les reproposera jamais. */
  if (PURGER){
    const maitre = await lireMaitre();
    if (!maitre.sujets || !maitre.sujets.length){
      console.log('Aucun catalogue maître. Lancez « 1 · Moissonner ».');
      return;
    }
    const hors = await lireExclusions();
    if (!hors.size){
      console.log('consignes/exclusions.txt est vide : rien à purger.');
      return;
    }
    let sortis = 0;
    const restants = [];
    for (const x of maitre.sujets){
      const vise = (x.fr && hors.has(x.fr.toLowerCase())) || (x.en && hors.has(x.en.toLowerCase()));
      if (vise){
        sortis++;
        console.log(`  ✗ ${x.uni.padEnd(10)} ${x.fr || x.en}`);
        continue;
      }
      restants.push(x);
    }
    maitre.sujets = restants;
    maitre.total = restants.length;
    maitre.genere = new Date().toISOString();
    await fs.writeFile(MAITRE + '.tmp', JSON.stringify(maitre, null, 1), 'utf8');
    await fs.rename(MAITRE + '.tmp', MAITRE);
    await vueApplication(restants);
    console.log(`\n✓ ${sortis} sujet(s) sorti(s) du catalogue maître. Il en reste ${restants.length}.`);
    console.log('catalog.json a été régénéré. Les titres restent dans exclusions.txt : ils ne reviendront pas.');
    return;
  }

  /* ---- mode reclassement : recalculer les potentiels, sans un seul appel ----
     La formule a changé : elle récompense désormais l'étrangeté, plus la
     notoriété. Plutôt que de tout recollecter, on recalcule les notes à
     partir de ce que le catalogue garde déjà — l'origine du sujet (`c`) et
     la phrase du contributeur (`w`). Instantané, gratuit, sans réseau. */
  if (RECLASSER){
    let cures = 0, autres = 0;
    const avant = {}, apres = {};
    for (const k of Object.keys(scores)){
      const sc = scores[k];
      const p0 = sc.p || 1;
      avant[p0] = (avant[p0] || 0) + 1;
      let p;
      if (sc.f){
        p = 10;                       // un sujet phare reste un sujet phare
        cures++;
      }else if (sc.c){
        p = Math.min(10, 7 + indiceEtrangete(sc.w));
        cures++;
      }else{
        // l'ancienne note valait min(6, editions/11) : on retrouve l'ordre
        p = Math.max(1, Math.min(5, 1 + Math.round(p0 / 2)));
        autres++;
      }
      sc.p = p;
      apres[p] = (apres[p] || 0) + 1;
    }
    const cat = { ...previous, sources, scores, reclasse: new Date().toISOString(), counts: counts(sources, pairs) };
    await writeAtomic(cat);
    const ligne = (o) => Array.from({length:10}, (_,i)=>i+1)
      .map(n => o[n] ? n + ':' + o[n] : null).filter(Boolean).join('  ');
    console.log(`\n✓ ${cures} sujet(s) curé(s) et ${autres} autre(s) reclassés.`);
    console.log(`  avant : ${ligne(avant)}`);
    console.log(`  après : ${ligne(apres)}`);
    console.log('\nOuvrez la Curation, triez par potentiel : les 7 et plus sont les fiches à écrire en premier.');
    return;
  }

  /* ═══════════ mode nettoyage : retirer les doublons déjà entrés ═══════════
     Les versions antérieures pouvaient classer un même sujet dans deux
     univers — « Expérience de la goutte de poix » en Sciences ET en
     Mystères — parce que deux lignes du fichier de phares le désignaient
     sous deux noms différents. Le mal est fait dans catalog.json ; cette
     passe le répare sans un seul appel réseau et sans rien écrire d'autre.

     Trois règles, dans cet ordre :
       1. un titre présent dans plusieurs univers ne reste que dans le
          premier, celui qui a le plus de sujets écrits — à défaut, le premier
          rencontré ;
       2. une paire fr↔en ne peut pas être éclatée sur deux univers : le
          français décide ;
       3. un titre présent deux fois dans la même liste est réduit à un.     */
  if (NETTOYER){
    const jumeauEn = new Map(), jumeauFr = new Map();
    for (const pr of (previous.pairs || [])){
      if (!pr || !pr.fr || !pr.en) continue;
      jumeauEn.set(pr.fr, pr.en); jumeauFr.set(pr.en, pr.fr);
    }

    const unis = Object.keys(sources);
    const proprio = new Map();     // "lang|titre" -> univers retenu
    let dedans = 0, retires = 0, memeListe = 0, recolles = 0;

    // 1 & 3 : un titre, un univers, une seule occurrence
    for (const u of unis){
      for (const lang of ['fr','en']){
        const liste = sources[u][lang] || [];
        const garde = [];
        const vus = new Set();
        for (const t of liste){
          dedans++;
          if (vus.has(t)){ memeListe++; continue; }
          const cle = lang + '|' + t;
          const ou = proprio.get(cle);
          if (ou && ou !== u){ retires++; continue; }
          proprio.set(cle, u); vus.add(t); garde.push(t);
        }
        sources[u][lang] = garde;
      }
    }

    // 2 : le titre anglais suit son français
    for (const u of unis){
      const listeEn = sources[u].en || [];
      const garde = [];
      for (const t of listeEn){
        const fr = jumeauFr.get(t);
        const uFr = fr ? proprio.get('fr|' + fr) : null;
        if (uFr && uFr !== u){
          // il appartient à l'univers de son français : on l'y déplace
          if (!sources[uFr]) sources[uFr] = { fr:[], en:[] };
          if (!sources[uFr].en.includes(t)){ sources[uFr].en.push(t); recolles++; }
          proprio.set('en|' + t, uFr);
          continue;
        }
        garde.push(t);
      }
      sources[u].en = garde;
    }

    // les scores orphelins ne servent plus à rien : ils gonflent le fichier
    const vivants = new Set();
    for (const u of Object.keys(sources))
      for (const lang of ['fr','en'])
        for (const t of (sources[u][lang] || [])) vivants.add(lang + '|' + t);
    let orphelins = 0;
    for (const k of Object.keys(scores)) if (!vivants.has(k)){ delete scores[k]; orphelins++; }

    const cat = { ...previous, sources, scores, pairs: [...pairs].map(([fr,en]) => ({fr,en})),
                  nettoye: new Date().toISOString(), counts: counts(sources, pairs) };
    await writeAtomic(cat);
    console.log(`\n✓ Nettoyage terminé sur ${dedans} entrée(s).`);
    console.log(`  · ${retires} titre(s) présent(s) dans deux univers : retiré(s) du second.`);
    console.log(`  · ${memeListe} doublon(s) dans une même liste.`);
    console.log(`  · ${recolles} titre(s) anglais recollé(s) à l'univers de leur version française.`);
    console.log(`  · ${orphelins} note(s) orpheline(s) supprimée(s).`);
    console.log(`\nCatalogue : ${cat.counts.fr} FR / ${cat.counts.en} EN / ${cat.counts.sujets} sujets.`);
    console.log('Aucun appel réseau, aucune fiche écrite supprimée.');
    return;
  }

  /* ---- mode vérification seule ---- */
  if (VERIFY_ALL && !ADD){
    console.log('Vérification du catalogue existant…');
    let removed = 0;
    for (const id of Object.keys(sources)){
      for (const lang of ['fr','en']){
        const list = sources[id][lang] || [];
        const keep = await verify(lang, list);
        const next = list.filter(t => keep.has(t));
        removed += list.length - next.length;
        sources[id][lang] = next;
      }
      process.stdout.write('.');
    }
    const cat = { ...previous, sources, verified: new Date().toISOString(), counts: counts(sources, pairs) };
    await writeAtomic(cat);
    console.log(`\n✓ ${removed} article(s) obsolète(s) retiré(s). Total : ${total(sources)} entrées.`);
    return;
  }

  const per = ADD || 500;
  const index = { ...(previous.index || {}) };

  let failed = 0;

  // Passe 1 — les listes d'articles insolites. Peu de requêtes, beaucoup de
  // valeur : ce sont des sujets dont des contributeurs ont déjà jugé qu'ils
  // étonnent, avec la phrase qui explique pourquoi.
  if (SOURCE === 'tout' || SOURCE === 'insolite' || SOURCE === 'saviez'){
    try{
      await passePhares({ sources, index, pairs, claimed, scores });
    }catch(e){
      console.error('  ✗ sujets phares interrompus : ' + e.message);
    }
    if (SOURCE !== 'saviez'){
      try{
        await passeInsolite({ sources, index, pairs, claimed, scores, per }, 'insolite');
        if (total(sources) > before) await save(sources, index, pairs, scores);
      }catch(e){
        console.error('  ✗ sources curées interrompues : ' + e.message);
      }
    }
    /* « Le saviez-vous ? » : la deuxième mine, et la seule qui se renouvelle.
       Les listes d'articles insolites sont finies — quatre pages en français,
       vingt en anglais — et une fois lues elles ne donneront plus rien. Les
       archives de « Le saviez-vous ? » comptent des milliers de pages, et il
       s'en ajoute une chaque jour depuis vingt ans. */
    if (SOURCE !== 'insolite'){
      try{
        await passeInsolite({ sources, index, pairs, claimed, scores, per }, 'saviez');
        if (total(sources) > before) await save(sources, index, pairs, scores);
      }catch(e){
        console.error('  ✗ « Le saviez-vous ? » interrompu : ' + e.message);
      }
    }
  }
  if (SOURCE === 'insolite' || SOURCE === 'saviez'){
    const cat = await save(sources, index, pairs, scores);
    console.log(`\nCatalogue : ${cat.counts.fr} sujets FR / ${cat.counts.en} EN.`);
    return;
  }

  // Passe 2 — le parcours des catégories : large, classé par notoriété.
  // Chaque univers est traité isolément : une panne réseau sur l'un n'annule
  // pas le travail déjà fait sur les autres, et le catalogue est enregistré
  // après chaque univers terminé.
  for (const u of universes){
    const t0 = Date.now();
    try{
      const roots = u.roots.concat(EXTRA_CATS);
      console.log(`\n▸ ${u.id}`);
      const pool = new Map(); const seenCats = new Set(roots);
      for (const root of roots){
        try{ await crawl(root, DEPTH, seenCats, pool, 0); }
        catch(e){ console.log(`  ! catégorie « ${root} » ignorée : ${e.message}`); }
      }
      console.log(`  catégories parcourues → ${pool.size} candidats bruts`);
      if (!pool.size){ console.log('  aucun candidat, univers ignoré'); continue; }

      // On ne teste pas 16 000 sujets pour en garder 500 : on trie par
      // centralité (profondeur de découverte) et on n'examine que le nécessaire.
      const budget = Math.min(pool.size, Math.max(600, per * 6));
      const shortlist = [...pool.entries()].sort((a, b) => a[1] - b[1]).slice(0, budget).map(e => e[0]);
      console.log(`  présélection par centralité → ${shortlist.length} sujets examinés`);

      const qmap = await toQids(shortlist);
      console.log(`  identifiants Wikidata → ${qmap.size}`);
      const qids = [...new Set(qmap.values())].filter(q => !claimed.has(q));
      console.log(`  dont nouveaux → ${qids.length}`);
      if (!qids.length){ console.log('  rien de neuf ici'); continue; }

      let rows = await fromWikidata(qids);
      rows.sort((a, b) => b.n - a.n);
      rows = rows.slice(0, Math.ceil(per * 2.4));
      console.log(`  classés par notoriété → ${rows.length} présélectionnés`);

      const enKeep = await verify('en', rows.map(r => r.en).filter(Boolean));
      const frKeep = await verify('fr', rows.map(r => r.fr).filter(Boolean));
      rows = rows.filter(r => (r.en && enKeep.has(r.en)) || (r.fr && frKeep.has(r.fr)));
      console.log(`  vérifiés → ${rows.length} retenus`);

      if (WITH_VIEWS){
        for (const r of rows) r.views = await pageviews('en', r.en || r.fr);
        rows.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
      rows = rows.slice(0, per);

      if (!sources[u.id]) sources[u.id] = { fr:[], en:[] };
      const seenFr = new Set(sources[u.id].fr);
      const seenEn = new Set(sources[u.id].en);
      let addedFr = 0, addedEn = 0;
      for (const r of rows){
        const p = potentiel(r);
        if (r.fr && frKeep.has(r.fr) && !seenFr.has(r.fr)){
          sources[u.id].fr.push(r.fr); seenFr.add(r.fr); addedFr++;
          scores['fr|' + r.fr] = { p, w:'', c:0, o:'categorie' };
        }
        if (r.en && enKeep.has(r.en) && !seenEn.has(r.en)){
          sources[u.id].en.push(r.en); seenEn.add(r.en); addedEn++;
          scores['en|' + r.en] = { p, w:'', c:0, o:'categorie' };
        }
        // le meme article dans les deux langues : l'application s'en sert pour
        // garder le sujet affiche quand on bascule FR/EN
        if (r.fr && r.en) pairs.set(r.fr, r.en);
        claimed.add(r.qid);
      }
      index[u.id] = (index[u.id] || []).concat(rows.map(r => r.qid));
      console.log(`  ✓ +${addedFr} FR / +${addedEn} EN — total ${sources[u.id].fr.length} FR (${Math.round((Date.now()-t0)/1000)} s)`);

      // enregistrement immédiat : ce qui est acquis est acquis
      if (total(sources) > before) await save(sources, index, pairs, scores);
    }catch(e){
      failed++;
      console.error(`  ✗ univers « ${u.id} » interrompu : ${e.message}`);
      console.error('    (les univers déjà terminés sont conservés)');
    }
  }

  const after = total(sources);
  if (after < before){
    console.error(`\n✗ Le nouveau catalogue (${after}) serait plus petit que l'ancien (${before}). Rien n'a été écrit.`);
    process.exit(1);
  }
  if (after === before){
    console.error(`\n✗ Aucun sujet n'a pu être ajouté (${failed} univers en échec). Consultez les lignes « ✗ » ci-dessus.`);
    process.exit(1);
  }

  const cat = await save(sources, index, pairs, scores);

  console.log('\n' + Object.entries(cat.counts.byUniverse)
    .map(([k, v]) => `  ${k.padEnd(9)} ${String(v.fr).padStart(5)} FR   ${String(v.en).padStart(5)} EN`).join('\n'));
  console.log(`\n✓ catalog.json — ${cat.counts.fr} sujets FR, ${cat.counts.en} sujets EN (avant : ${before} entrées, après : ${after}).`);
  console.log(`  ${calls} requêtes, ${Math.round(waited/1000)} s d'attente volontaire, cadence finale ${interval} ms.`);
  if (failed) console.log(`  ${failed} univers n'ont pas abouti — relancez l'action, elle reprendra là où elle s'est arrêtée.`);
}

/* Écrit le catalogue complet (atomique). Appelé après chaque univers. */
async function save(sources, index, pairs, scores){
  const cat = {
    generated: new Date().toISOString(),
    ranking: WITH_VIEWS ? 'notoriété (éditions linguistiques) + consultations 12 mois' : 'notoriété (nombre d’éditions linguistiques)',
    themes: UNIVERSES.map(({ id, hue, free, fr, en }) => ({ id, hue, free, fr, en })),
    counts: counts(sources, pairs),
    index,
    pairs: pairs ? [...pairs].map(([fr, en]) => ({ fr, en })) : [],
    scores: scores || {},
    sources
  };
  await writeAtomic(cat);
  return cat;
}

/* Trois chiffres, qui ne disent pas la même chose :
     fr / en   — combien de titres dans chaque langue ;
     sujets    — combien de CHOSES distinctes, un sujet bilingue comptant
                 pour un. C'est celui qu'on annonce : « 4 000 sujets », pas
                 4 000 français plus 4 000 anglais qui seraient les mêmes.
   Les deux premiers restent utiles : ils disent combien de textes il y a à
   écrire, et donc ce que ça coûtera.                                       */
function counts(sources, pairs){
  const jumeau = new Map();          // titre anglais -> titre français
  if (pairs) for (const [fr, en] of (pairs instanceof Map ? pairs : new Map(pairs))) jumeau.set(en, fr);

  const byUniverse = {};
  let fr = 0, en = 0, sujets = 0;
  for (const k of Object.keys(sources)){
    const a = sources[k].fr || [], b = sources[k].en || [];
    const distincts = new Set(a);
    for (const t of b) distincts.add(jumeau.get(t) || t);
    byUniverse[k] = { fr:a.length, en:b.length, sujets:distincts.size };
    fr += a.length; en += b.length; sujets += distincts.size;
  }
  return { fr, en, sujets, byUniverse };
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
