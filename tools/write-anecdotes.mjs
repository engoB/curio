#!/usr/bin/env node
/**
 * Curio — rédaction des anecdotes
 * ===========================================================================
 * Transforme les sujets du catalogue en anecdotes réellement écrites : une
 * accroche, un texte de 900 à 1500 signes, et une note « insolite » de 0 à 10
 * qui sert à écarter les articles trop techniques.
 *
 *   node tools/write-anecdotes.mjs --langue fr --domaine tous --combien 200
 *   node tools/write-anecdotes.mjs --langue fr,en --domaine mysteres
 *   node tools/write-anecdotes.mjs --estimer            # coût, sans rien écrire
 *
 * Il faut une clé API dans l'environnement :
 *   ANTHROPIC_API_KEY   (fournisseur « anthropic », par défaut)
 *   OPENAI_API_KEY      (fournisseur « openai », avec --fournisseur openai)
 *
 * Résultat : anecdotes/{langue}-{univers}.json
 *   { "items": { "Lac Nyos": { "t":"Le lac qui a soufflé", "x":"…", "s":9,
 *                              "i":"https://upload.wikimedia…", "u":"https://fr.wikipedia…" } } }
 *
 * L'image et le lien sont enregistrés avec le texte : à l'exécution, l'app n'a
 * plus aucun appel à faire à Wikipédia pour ces sujets.
 *
 * Garde-fous
 * ---------------------------------------------------------------------------
 *  · Reprise automatique : un sujet déjà rédigé n'est jamais repayé.
 *  · Écriture atomique, fichier par fichier, toutes les 10 anecdotes.
 *  · Le modèle ne travaille QUE sur le texte de l'article fourni. S'il ne peut
 *    rien affirmer, il note bas et le sujet est écarté du flux.
 *  · Les textes produits dérivent de Wikipédia (CC BY-SA) : chaque carte
 *    continue de citer et de lier l'article source.
 * ===========================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/* ------------------------------------------------------------------ options */
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i+1]; return (v && !v.startsWith('--')) ? v : true; };

const LANGS    = String(opt('langue', 'fr,en')).split(',').map(s => s.trim()).filter(Boolean);
const DOMAINE  = String(opt('domaine', 'tous'));
const COMBIEN  = parseInt(opt('combien', '250'), 10) || 250;
const PROVIDER = String(opt('fournisseur', process.env.CURIO_PROVIDER || 'anthropic'));
let   MODEL    = String(opt('modele', process.env.CURIO_MODEL ||
                   (PROVIDER === 'openai' ? 'gpt-4o-mini' : 'claude-opus-5')));
/* Si le modèle demandé n'existe pas sur le compte, on descend cette liste. */
const FALLBACKS = PROVIDER === 'openai'
  ? ['gpt-4o-mini']
  : ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'];

/* Tarifs officiels en dollars par million de jetons (vérifiés en août 2026).
   Mettez-les à jour si Anthropic change sa grille. */
const PRIX = {
  'claude-opus-5':              { in: 5,  out: 25 },
  'claude-sonnet-5':            { in: 2,  out: 10 },
  'claude-haiku-4-5-20251001':  { in: 1,  out: 5  },
  'gpt-4o-mini':                { in: 0.15, out: 0.6 }
};
const JETONS_ENTREE = 1800, JETONS_SORTIE = 1100;  // moyennes pour un texte de 2 min
const PARALLEL = Math.max(1, Math.min(8, parseInt(opt('parallele', '3'), 10) || 3));
/* Une tranche de budget, en euros. C'est la seule chose à régler pour
   écrire : plus de sélection à coller — GitHub refusait d'ailleurs les
   grandes (« Provided inputs are too large ») — plus de langue ni d'univers
   à choisir. On prend les meilleurs sujets non écrits du catalogue maître,
   jusqu'à épuisement de la tranche, et on écrit le français ET l'anglais. */
const BUDGET  = parseFloat(opt('budget', '0')) || 0;
const EUR_USD = 1.08;
const MAITRE  = path.join(process.cwd(), 'catalogue-maitre.json');

function coutParTexte(){
  const t = PRIX[MODEL] || PRIX['claude-opus-5'];
  return (JETONS_ENTREE * t.in + JETONS_SORTIE * t.out) / 1e6;   // en dollars
}

async function lireMaitre(){
  try{ return JSON.parse(await fs.readFile(MAITRE, 'utf8')); }
  catch{ return null; }
}

/* Les sujets que la tranche permet d'écrire : les meilleurs d'abord, jamais
   deux fois le même, et toujours les deux langues. */
function planDeTranche(maitre, budgetEuros, decisions){
  const cout = coutParTexte();
  const textesPossibles = Math.floor((budgetEuros * EUR_USD) / cout);
  const sujetsPossibles = Math.max(0, Math.floor(textesPossibles / 2));

  /* Vos décisions, prises dans la console, commandent. Si vous avez retenu
     des sujets, on n'écrit QUE ceux-là — et jamais ce que vous avez écarté.
     Sans décision, on prend simplement les meilleurs. */
  const dec = decisions || {};
  const retenusExplicites = Object.keys(dec).filter(k => dec[k] === 'retenu').length;

  let candidats = (maitre.sujets || [])
    .filter(s => s.statut === 'a-ecrire' && (s.fr || s.en) && dec[s.qid] !== 'ecarte');
  if (retenusExplicites) candidats = candidats.filter(s => dec[s.qid] === 'retenu');

  candidats.sort((a, b) => (b.potentiel - a.potentiel)
               || ((b.sources || []).length - (a.sources || []).length)
               || (b.editions || 0) - (a.editions || 0));
  return { cout, sujetsPossibles, retenus: candidats.slice(0, sujetsPossibles),
           restants: candidats.length, surDecision: retenusExplicites > 0 };
}

async function lireDecisions(){
  try{
    const t = await fs.readFile(path.join(process.cwd(), 'consignes', 'decisions.json'), 'utf8');
    return JSON.parse(t) || {};
  }catch{ return {}; }
}
const ESTIMATE = !!opt('estimer', false);
const INDEX_SEUL = !!opt('index', false);   // recompter index.json sans rien ecrire
const MIN_SCORE_KEEP = parseInt(opt('note-mini', '0'), 10) || 0;   // 0 = on écrit tout, l'app filtre
const LISTE    = opt('liste', null);      // export.csv : n'écrire que les lignes cochées
const COLLE    = process.env.CURIO_SELECTION || '';   // sélection collée dans l'action GitHub

const OUTDIR  = path.join(process.cwd(), 'anecdotes');
const CATALOG = path.join(process.cwd(), 'catalog.json');
const UA = 'CurioAnecdoteWriter/1.0 (' + (process.env.CURIO_CONTACT || 'https://github.com/votre-compte/curio') + ')';

const KEY = PROVIDER === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;

/* ---------------------------------------------------------------- consignes
 * La consigne vit dans consignes/fr.md et consignes/en.md : deux fichiers
 * texte que vous modifiez directement sur GitHub, sans toucher au code.
 * Le bloc d'explication en tete du fichier (tout ce qui precede la ligne
 * « --- ») est ignore : il est la pour vous, pas pour le modele.
 * Si le fichier n'existe pas, la consigne integree ci-dessous prend le relais.
 */
const DOSSIER_CONSIGNES = path.join(process.cwd(), 'consignes');
async function consigne(lang){
  try{
    const brut = await fs.readFile(path.join(DOSSIER_CONSIGNES, lang + '.md'), 'utf8');
    const i = brut.indexOf('\n---\n');
    const texte = (i >= 0 ? brut.slice(i + 5) : brut).trim();
    if (texte.length > 400){
      if (!consigne._dit){ console.log('▸ Consigne lue dans consignes/' + lang + '.md'); consigne._dit = true; }
      return texte;
    }
  }catch(e){}
  return BRIEF[lang] || BRIEF.fr;
}

const BRIEF = {
  fr: `Tu écris pour Curio, une application d'anecdotes. Ton lecteur découvre le sujet ; il n'est pas spécialiste.

On te donne une FICHE DE FAITS : des noms, des dates, des chiffres, des
relations, extraits d'un article encyclopédique. Écris une anecdote autonome
à partir de ces faits.

Tu n'as pas la prose d'origine sous les yeux, et c'est voulu : le texte doit
être entièrement de toi. Les faits appartiennent à tout le monde, la façon de
les raconter doit appartenir à Curio.

LA PREMIÈRE PHRASE
C'est la seule chose qui compte vraiment. Elle doit être impossible à ne pas finir. Trois façons : jeter le lecteur dans la scène (un lieu, une date, quelqu'un qui fait quelque chose) ; poser l'anomalie sans l'expliquer (une phrase courte qui ne peut pas être vraie, et qui l'est) ; prendre le lecteur à témoin (une chose qu'il croit savoir, et qui est fausse).
Interdit : une définition, une date de naissance, « Saviez-vous que », « Imaginez un instant », un résumé de ce qui va suivre.

IMPLIQUER LE LECTEUR
Le texte s'adresse à quelqu'un. Deux ou trois fois — pas plus — tu peux lui faire faire un geste mental (« fermez les yeux »), lui donner une échelle qu'il connaît (« à peine plus qu'un grain de riz » plutôt que « 5 mm »), ou nommer ce qu'il est en train de penser (« on se dit que quelqu'un aurait fini par le remarquer. C'est ce que tout le monde a pensé. »). Avec parcimonie : le « vous » ne doit jamais devenir un tic.

RÈGLES
- **2 500 à 3 500 caractères**, en 5 à 7 paragraphes séparés par une ligne vide. C'est un minimum : un texte plus court est refusé.
- Raconte, et développe. Chiffres précis, dates, noms, lieux — uniquement ceux présents dans la fiche de faits.
- Structure : l'accroche, puis le contexte, puis le mécanisme ou l'enquête, puis les conséquences, puis le détail final. Chaque paragraphe apporte quelque chose de neuf ; ne redis jamais la même information.
- N'invente rien. Si une information manque, ne la mentionne pas.
- Termine sur le détail qui reste en tête, pas sur une morale ni sur une question.
- Mets en **gras** un ou deux éléments par texte : le chiffre ou le fait qui frappe. Jamais plus de deux.
- Tu peux mettre en *italique* un terme technique ou un titre d'oeuvre. Avec parcimonie.
- Pas de titres internes, pas de listes, pas d'emoji.
- Français naturel, phrases courtes, aucun jargon non expliqué.

TITRE
- Une accroche de 3 à 8 mots, évocatrice, sans deux-points ni sous-titre.
- Exemples de ton : « Le lac qui a soufflé », « La guerre perdue contre des oiseaux », « Le vert qui tuait ».

NOTE INSOLITE (0 à 10)
- 9-10 : stupéfiant, on a envie de le raconter le soir même.
- 7-8 : franchement surprenant.
- 5-6 : intéressant mais attendu.
- 0-4 : sujet encyclopédique, technique ou administratif, sans surprise.
Sois sévère : la plupart des articles méritent moins de 7.

À RACONTER
Après le texte, donne une phrase unique : celle qu'un lecteur dira à voix haute le soir même, à quelqu'un qui ne connaît pas le sujet. Une seule phrase de 15 à 30 mots, contenant le fait qui surprend et le détail concret qui le rend crédible, et se suffisant à elle-même. Ce n'est pas le titre : le titre intrigue, celle-ci raconte.

Réponds UNIQUEMENT par un objet JSON : {"titre": "...", "texte": "...", "raconter": "...", "insolite": 0}`,

  en: `You write for Curio, an app of wonders. Your reader is discovering the subject; they are not a specialist.

You are given a FACT SHEET: names, dates, figures and relations extracted
from an encyclopaedic article. Write a self-contained piece from those facts.

You do not have the original prose in front of you, and that is deliberate:
the writing must be entirely yours. Facts belong to everyone; the telling
must belong to Curio.

THE FIRST SENTENCE
It is the only thing that really matters. It must be impossible not to finish. Three ways: drop the reader into the scene (a place, a date, someone doing something); state the anomaly without explaining it (a short sentence that cannot be true, and is); make the reader a witness (something they think they know, which is wrong).
Forbidden: a definition, a birth date, "Did you know", "Imagine for a moment", a summary of what follows.

INVOLVING THE READER
The text speaks to someone. Two or three times — no more — you may ask for a mental gesture ("close your eyes"), give a scale they know ("barely larger than a grain of rice" rather than "5 mm"), or name the thought they are having ("you would think someone would have noticed. That is exactly what everyone thought."). Sparingly: "you" must never become a tic.

RULES
- **2,500 to 3,500 characters**, in 5 to 7 paragraphs separated by a blank line. This is a floor: a shorter text is rejected.
- Tell it as a story, and develop it. Precise figures, dates, names, places — only those present in the fact sheet.
- Structure: the hook, then the context, then the mechanism or the investigation, then the consequences, then the closing detail. Every paragraph adds something new; never restate the same fact.
- Invent nothing. If something is missing, leave it out.
- End on the detail that sticks, not on a moral or a question.
- Put one or two elements per piece in **bold**: the figure or fact that lands. Never more than two.
- You may use *italics* for a technical term or a work title. Sparingly.
- No internal headings, no lists, no emoji.
- Natural English, short sentences, no unexplained jargon.

TITLE
- A 3 to 8 word hook, evocative, no colon, no subtitle.
- Tone examples: "The lake that exhaled", "The war lost to birds", "The green that killed".

WONDER SCORE (0 to 10)
- 9-10: astonishing, you want to tell someone tonight.
- 7-8: genuinely surprising.
- 5-6: interesting but expected.
- 0-4: encyclopedic, technical or administrative, no surprise.
Be strict: most articles deserve under 7.

THE LINE TO TELL
After the text, give one single sentence: the one a reader will say out loud that evening, to someone who does not know the subject. One sentence of 15 to 30 words, carrying the surprising fact and the concrete detail that makes it credible, standing on its own. It is not the title: the title intrigues, this one tells.

Reply ONLY with a JSON object: {"titre": "...", "texte": "...", "raconter": "...", "insolite": 0}`
};

/* ---------------------------------------------------------------- utilitaires */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tokIn = 0, tokOut = 0, done = 0, skipped = 0, failed = 0;

async function readJson(p, d){ try{ return JSON.parse(await fs.readFile(p, 'utf8')); }catch{ return d; } }
async function writeAtomic(p, obj){
  await fs.mkdir(path.dirname(p), { recursive:true });
  const tmp = p + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj));
  await fs.rename(tmp, p);
}

/* ------------------------------- article source : texte, image et lien ------- */
const sized = (u, w) => u ? u.replace(/\/(\d+)px-/, '/' + w + 'px-') : '';

/* Wikipédia limite les clients trop rapides et répond alors HTTP 429. Tous les
   appels passent par ce sas, quel que soit le nombre de rédactions menées en
   parallèle, et la cadence se ralentit d'elle-même en cas de refus. */
let wikiInterval = 260, wikiLast = 0;
async function wikiGate(){
  const wait = Math.max(0, wikiLast + wikiInterval - Date.now());
  if (wait > 0) await sleep(wait);
  wikiLast = Date.now();
}

/* ---------------------------------------------------------------------------
 * De la prose aux faits
 * ---------------------------------------------------------------------------
 * On ne transmet jamais les phrases de l'article au modèle : on lui transmet
 * ce qu'elles contiennent. Chaque phrase est réduite à ses éléments porteurs
 * — noms propres, nombres, dates, unités, verbes d'action — et présentée en
 * puces. Les faits ne sont protégés par aucun droit ; la formulation, si.
 * Écrire depuis les faits met le texte produit du bon côté de cette ligne.
 * ------------------------------------------------------------------------- */
const MOTS_VIDES = new Set(('le la les un une des du de d au aux et ou mais donc or ni car que qui quoi dont ou '
  + 'a ans est sont etait etaient ete avoir avait ont son sa ses leur leurs ce cet cette ces il elle ils elles on '
  + 'dans sur sous pour par avec sans vers chez entre depuis pendant apres avant plus moins tres tout tous toute '
  + 'the a an of in on at to for from by with and or but as is are was were be been has have had it its this that '
  + 'these those which who whom whose not no nor so than then there their his her they them he she').split(' '));

function factSheet(text){
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const phrases = clean.split(/(?<=[.!?])\s+/).filter(p => p.length > 25);
  const faits = [];
  const vus = new Set();

  for (const p of phrases){
    const jetons = p.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-\u00b0%.,]*/gu) || [];
    const gardes = [];
    for (let i = 0; i < jetons.length; i++){
      const j = jetons[i];
      const bas = j.toLowerCase().replace(/[.,]$/, '');
      const estNombre = /[0-9]/.test(j);
      const estPropre = /^[\p{Lu}]/u.test(j) && i > 0;      // pas le premier mot
      const estLong   = bas.length > 5 && !MOTS_VIDES.has(bas);
      if (estNombre || estPropre || estLong) gardes.push(j.replace(/[.,]$/, ''));
    }
    if (gardes.length < 3) continue;
    // on limite chaque puce : c'est une note, pas une phrase reformulable
    const ligne = gardes.slice(0, 14).join(' · ');
    const cle = ligne.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    faits.push('- ' + ligne);
    if (faits.length >= 45) break;
  }
  return faits.length ? faits.join('\n')
                      : clean.slice(0, 1200);   // article très court : rien à réduire
}

/* Combien de suites de N mots le texte produit partage-t-il avec la source ?
 * Au-delà de quelques-unes, ce n'est plus une réécriture, c'est une reprise :
 * on refuse et on redemande. */
function motsNormalises(s){
  return String(s || '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
}
function recouvrement(produit, source, n = 8){
  const src = motsNormalises(source), out = motsNormalises(produit);
  if (out.length < n || src.length < n) return { max: 0, communs: 0 };
  const grammes = new Set();
  for (let i = 0; i + n <= src.length; i++) grammes.add(src.slice(i, i + n).join(' '));
  let communs = 0, courant = 0, max = 0;
  for (let i = 0; i + n <= out.length; i++){
    if (grammes.has(out.slice(i, i + n).join(' '))){ communs++; courant++; max = Math.max(max, courant + n - 1); }
    else courant = 0;
  }
  return { max, communs };
}

async function articleData(lang, title){
  const url = 'https://' + lang + '.wikipedia.org/w/api.php'
    + '?action=query&format=json&formatversion=2&redirects=1'
    + '&prop=extracts|pageimages|info&inprop=url'
    + '&explaintext=1&exsectionformat=plain&piprop=thumbnail&pithumbsize=1400'
    + '&titles=' + encodeURIComponent(title);
  for (let i = 0; i < 6; i++){
    await wikiGate();
    try{
      const r = await fetch(url, { headers:{ 'User-Agent': UA } });
      if (r.status === 429){
        wikiInterval = Math.min(2000, Math.round(wikiInterval * 1.8));
        const ra = parseInt(r.headers.get('retry-after') || '0', 10);
        await sleep(ra > 0 ? Math.min(120000, ra * 1000) : Math.min(60000, 4000 * (i + 1)));
        continue;
      }
      if (!r.ok){ await sleep(1200 * (i+1)); continue; }
      const j = await r.json();
      const p = ((j.query && j.query.pages) || [])[0];
      if (!p || p.missing || !p.extract) return null;
      return {
        text: String(p.extract).replace(/\n{3,}/g, '\n\n').slice(0, 7000),
        img:  p.thumbnail ? sized(p.thumbnail.source, 1400) : '',
        url:  p.fullurl || ('https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g,'_')))
      };
    }catch{ await sleep(900 * (i+1)); }
  }
  return null;
}

/* Un sujet coché en curation doit donner DEUX textes, français et anglais,
   même si Wikipédia ne l'a que dans une langue. On va donc chercher l'article
   dans la langue voulue, et à défaut dans l'autre : les faits sont les mêmes,
   seule la langue d'écriture change. Le rédacteur est prévenu.            */
async function ficheArticle(lang, titre, jumeau){
  const d = await articleData(lang, titre);
  if (d) return { ...d, source: lang };
  const autre = lang === 'fr' ? 'en' : 'fr';
  for (const essai of [jumeau, titre]){
    if (!essai) continue;
    const e = await articleData(autre, essai);
    if (e) return { ...e, source: autre };
  }
  return null;
}

/* ------------------------------------------------------------ appel du modèle */
function parseJson(txt){
  if (!txt) return null;
  let t = String(txt).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

async function ask(lang, title, text, pourquoi, langueFiche){
  const system = await consigne(lang);
  /* La fiche de faits vient parfois de l'autre édition de Wikipédia : le
     sujet n'existe que là. Les faits valent, la langue d'écriture ne change
     pas pour autant. */
  const traduire = (langueFiche && langueFiche !== lang)
    ? (lang === 'fr'
        ? "\n\nATTENTION : la fiche de faits ci-dessous est en anglais, car l'article n'existe que dans cette langue. Ton texte, lui, doit être ENTIÈREMENT EN FRANÇAIS. Traduis les noms propres selon l'usage français quand il existe."
        : "\n\nNOTE: the fact sheet below is in French, because the article only exists in that language. Your text must be ENTIRELY IN ENGLISH.")
    : '';
  /* La phrase du contributeur — ou la vôtre, si le sujet vient de
     consignes/sujets-phares.txt — dit en une ligne pourquoi ce sujet mérite
     d'exister. C'est l'angle. Sans elle, le modèle choisit le sien, et
     retombe souvent sur le plus encyclopédique. */
  const angle = pourquoi
    ? (lang === 'fr'
        ? "\n\nL'ANGLE (ce qui rend ce sujet extraordinaire, selon celui qui l'a repéré) :\n"
          + pourquoi + "\nÉcris autour de cela. Si la fiche de faits ne le confirme pas, écris ce que la fiche dit."
        : "\n\nTHE ANGLE (what makes this subject extraordinary, according to whoever spotted it):\n"
          + pourquoi + "\nWrite around this. If the fact sheet does not support it, follow the fact sheet.")
    : '';
  const user = 'Sujet : ' + title + traduire + '\n\nFiche de faits :\n\n' + factSheet(text) + angle;

  for (let i = 0; i < 5; i++){
    try{
      let res, out;
      if (PROVIDER === 'openai'){
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + KEY },
          body: JSON.stringify({ model: MODEL, temperature: 0.7, max_tokens: 2400,
            messages:[{ role:'system', content: system }, { role:'user', content: user }] })
        });
        if (res.status === 429 || res.status >= 500){ await sleep(2500 * (i+1)); continue; }
        const j = await res.json();
        if (j.error) throw new Error(j.error.message || 'erreur API');
        out = j.choices?.[0]?.message?.content;
        tokIn += j.usage?.prompt_tokens || 0; tokOut += j.usage?.completion_tokens || 0;
      } else {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'x-api-key': KEY, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify({ model: MODEL, max_tokens: 2400, temperature: 0.7,
            system, messages:[{ role:'user', content: user }] })
        });
        if (res.status === 429 || res.status >= 500){ await sleep(2500 * (i+1)); continue; }
        const j = await res.json();
        if (j.error) throw new Error(j.error.message || 'erreur API');
        out = (j.content || []).map(c => c.text || '').join('');
        tokIn += j.usage?.input_tokens || 0; tokOut += j.usage?.output_tokens || 0;
      }
      const parsed = parseJson(out);
      if (!parsed || !parsed.texte) throw new Error('réponse illisible');
      const produit = String(parsed.texte).replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();

      // Contrôle de reprise : si le texte partage de longues suites de mots
      // avec l'article, ce n'est pas une écriture, c'est une copie. On refuse.
      const rec = recouvrement(produit, text, 8);
      if (rec.communs > 2){
        if (i < 4){
          console.log(`  · reprise trop proche (${rec.communs} passages, ${rec.max} mots) — on réécrit`);
          await sleep(600);
          continue;
        }
        throw new Error(`texte trop proche de la source (${rec.communs} passages repris)`);
      }

      return {
        t: String(parsed.titre || title).trim().replace(/^["'«»\s]+|["'«»\s]+$/g, ''),
        x: produit,
        r: String(parsed.raconter || '').trim().replace(/^["'«»\s]+|["'«»\s]+$/g, ''),
        s: Math.max(0, Math.min(10, Math.round(Number(parsed.insolite) || 0)))
      };
    }catch(e){
      if (/model/i.test(e.message) && /not|introuvable|invalid|does not exist|unknown|unsupported/i.test(e.message)){
        const next = FALLBACKS[FALLBACKS.indexOf(MODEL) + 1];
        if (next){
          console.log(`  · modèle « ${MODEL} » indisponible, bascule sur « ${next} »`);
          MODEL = next;
          continue;
        }
        throw new Error('Aucun modèle disponible sur votre compte. Indiquez-en un avec --modele.');
      }
      if (i === 4) throw e;
      await sleep(1500 * (i+1));
    }
  }
}

/* -------------------------------------------------------------------- main */
/* Lit un export.csv et renvoie l'ensemble « langue|univers|titre » à écrire,
   c'est-à-dire les lignes dont la colonne « ecrire » est renseignée.        */
/* Une sélection peut arriver de deux façons, et les deux doivent marcher
   sans que vous ayez à manipuler un fichier :
     · le texte copié depuis l'écran Curation, collé directement dans l'action ;
     · un fichier CSV déposé dans le dépôt (export.csv, selection.csv…).
   Dans les deux cas on accepte aussi une simple liste de titres, un par
   ligne, ce qui permet de coller n'importe quoi de lisible.               */
function parseSelection(raw, source){
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const set = new Set();
  if (!lines.length) return set;

  const head = lines[0].split(';').map(s => s.trim().toLowerCase());
  const iL = head.indexOf('langue'), iU = head.indexOf('univers'),
        iT = head.indexOf('titre'),  iE = head.indexOf('ecrire');

  if (iL >= 0 && iU >= 0 && iT >= 0){
    for (const line of lines.slice(1)){
      const c = line.split(';');
      if (iE >= 0){
        const flag = (c[iE] || '').trim().toLowerCase();
        if (!flag || flag === 'non' || flag === '0' || flag === 'no') continue;
      }
      const t = (c[iT] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      if (!t) continue;
      set.add((c[iL]||'').trim() + '|' + (c[iU]||'').trim() + '|' + t);
    }
  } else {
    // liste de titres bruts : on laissera la langue et l'univers libres
    for (const l of lines){
      const t = l.replace(/^["']|["']$/g, '').trim();
      if (t && !/^#/.test(t)) set.add('*|*|' + t);
    }
  }
  console.log(`Sélection : ${set.size} ligne(s) retenue(s) — autant de textes (${source})`);
  return set;
}

async function readSelection(file){
  let raw;
  try{ raw = await fs.readFile(file, 'utf8'); }
  catch{ console.error('✗ Fichier de sélection introuvable : ' + file); process.exit(1); }
  return parseSelection(raw, path.basename(file));
}

/* Vrai si le sujet fait partie de la sélection, quelle que soit la forme
   dans laquelle elle a été fournie. */
/* Un sujet coché vaut deux textes. Si Wikipédia ne l'a qu'en français, la
   ligne « en » de votre CSV ne correspond à aucun titre de sources[u].en :
   il faut quand même l'écrire. On ajoute donc à la liste de travail tout ce
   que la sélection nomme pour cette langue et cet univers.               */
function titresDeSelection(set, lang, uni){
  const out = [];
  for (const cle of set){
    const i = cle.indexOf('|'), j = cle.indexOf('|', i + 1);
    if (i < 0 || j < 0) continue;
    const l = cle.slice(0, i), u = cle.slice(i + 1, j), t = cle.slice(j + 1);
    if (!t) continue;
    if (l === '*' || l === lang){
      if (u === '*' || u === uni) out.push(t);
    }
  }
  return out;
}

function selectionHas(set, lang, uni, titre){
  return set.has(lang + '|' + uni + '|' + titre) || set.has('*|*|' + titre);
}

/* ═══════════════ écrire une tranche du catalogue maître ═══════════════════
   Un sujet donne toujours DEUX fiches : française et anglaise. Quand
   Wikipédia ne l'a que dans une langue, l'autre est écrite depuis le même
   article — les faits sont les mêmes, seule la langue de rédaction change.

   Rien n'est perdu si l'exécution s'arrête en route : les fiches sont
   enregistrées par paquets de dix, et le catalogue maître n'est marqué
   « écrit » que pour ce qui l'est réellement. Relancer reprend la suite. */
async function ecrireTranche(retenus, maitre){
  await fs.mkdir(OUTDIR, { recursive:true });
  console.log(`\nFournisseur : ${PROVIDER} · modèle : ${MODEL} · ${PARALLEL} en parallèle\n`);

  // on regroupe par fichier de sortie : une langue, un univers
  const paquets = new Map();          // "lang|uni" -> [ {sujet, titre} ]
  for (const s of retenus){
    for (const lang of ['fr', 'en']){
      const titre = lang === 'fr' ? (s.fr || s.en) : (s.en || s.fr);
      if (!titre) continue;
      const cle = lang + '|' + s.uni;
      if (!paquets.has(cle)) paquets.set(cle, []);
      paquets.get(cle).push({ s, titre });
    }
  }

  const faites = new Map();           // qid -> nombre de langues écrites
  let done = 0, skipped = 0, failed = 0;
  const total = [...paquets.values()].reduce((n, v) => n + v.length, 0);

  for (const [cle, entrees] of paquets){
    const [lang, uni] = cle.split('|');
    const fichier = path.join(OUTDIR, lang + '-' + uni + '.json');
    const store = await readJson(fichier, { items:{} });
    if (!store.items) store.items = {};

    const restants = entrees.filter(e => !store.items[e.titre]);
    if (!restants.length){ console.log(`▸ ${lang}/${uni} : rien de neuf`); continue; }
    console.log(`▸ ${lang}/${uni} : ${restants.length} fiche(s) à écrire`);

    let curseur = 0, depuis = 0;
    const ouvrier = async () => {
      while (curseur < restants.length){
        const { s, titre } = restants[curseur++];
        try{
          /* Un sujet venu de VOUS porte son propre texte : il n'y a rien à
             aller chercher, et la rédaction travaille dessus directement.
             C'est la voie des histoires Reddit et de toute source non
             encyclopédique. */
          let d;
          if (s.texte && String(s.texte).trim().length > 300){
            d = { text: String(s.texte).trim().slice(0, 7000), img:'', url: s.url || '', source: 'fr' };
          }else{
            const jumeau = lang === 'fr' ? (s.en || s.fr) : (s.fr || s.en);
            d = await ficheArticle(lang, titre, jumeau);
          }
          if (!d || d.text.length < 400){ skipped++; continue; }
          const angle = s.phrase || '';
          const a = await ask(lang, titre, d.text, angle, d.source);
          if (!a || a.x.length < 1600){ skipped++; continue; }
          if (a.s < MIN_SCORE_KEEP){ skipped++; continue; }
          a.i = d.img; a.u = d.url;
          a.d = new Date().toISOString().slice(0, 10);
          a.q = s.qid;                     // le lien vers le catalogue maître
          a.p = null;                      // pas encore publiée
          a.v = '';                        // pas encore contrôlée
          store.items[titre] = a;
          faites.set(s.qid, (faites.get(s.qid) || 0) + 1);
          done++; depuis++;
          if (depuis >= 10){
            depuis = 0;
            await writeAtomic(fichier, { generated:new Date().toISOString(), model:MODEL, items:store.items });
          }
          if (done % 20 === 0) process.stdout.write(`  ${done}/${total} écrites…\n`);
        }catch(e){
          failed++;
          if (failed <= 3) console.log(`  ! ${titre} : ${e.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, ouvrier));
    await writeAtomic(fichier, { generated:new Date().toISOString(), model:MODEL, items:store.items });
  }

  /* ---- le catalogue maître enregistre ce qui est fait ------------------- */
  const aujourdhui = new Date().toISOString().slice(0, 10);
  let marques = 0;
  for (const s of maitre.sujets){
    if (!faites.has(s.qid)) continue;
    if (faites.get(s.qid) >= 2 || (!s.fr || !s.en)){
      s.statut = 'ecrit'; s.ecrit = aujourdhui; marques++;
    }
  }
  maitre.genere = new Date().toISOString();
  await writeAtomic(MAITRE, maitre);

  await buildIndex();

  const restantes = maitre.sujets.filter(x => x.statut === 'a-ecrire').length;
  console.log(`\n╔══ TRANCHE TERMINÉE ═══════════════════════════════════════`);
  console.log(`║  ${done} fiche(s) écrite(s), ${marques} sujet(s) complet(s).`);
  console.log(`║  ${skipped} écartée(s) (article trop maigre ou note trop basse), ${failed} en échec.`);
  console.log(`║  ${restantes} sujet(s) restent à écrire dans le catalogue maître.`);
  console.log(`╚═══════════════════════════════════════════════════════════`);
  console.log(`\nAucune fiche n'est encore VISIBLE : lancez « 3 · Contrôler » puis « 4 · Publier ».`);
}

async function main(){
  const cat = await readJson(CATALOG, null);
  const selection = COLLE.trim() ? parseSelection(COLLE, 'collée dans l\'action')
                  : LISTE ? await readSelection(String(LISTE)) : null;
  /* Recompter n'a besoin de rien d'autre que des fiches : on le fait avant
     d'exiger un catalogue. C'est l'action qu'on lance justement quand le
     reste est cassé. */
  if (INDEX_SEUL){
    await buildIndex();
    return;
  }
  if (!cat || !cat.sources){
    console.error('✗ catalog.json introuvable. Lancez d\'abord l\'action « 1 · Moissonner ».');
    process.exit(1);
  }
  const unis = DOMAINE === 'tous' ? Object.keys(cat.sources) : DOMAINE.split(',').map(s => s.trim());

  /* Sans sélection, `--combien 100` prenait les CENT PREMIERS de la liste,
     c'est-à-dire l'ordre où la collecte les a trouvés. On écrivait donc au
     hasard de l'insertion, pas au mérite. On classe désormais par potentiel
     décroissant : à budget égal, ce sont les sujets les plus étonnants qui
     partent en rédaction. */
  const SC = cat.scores || {};
  const parPotentiel = (lang) => (a, b) => {
    const pa = (SC[lang + '|' + a] || {}).p || 0;
    const pb = (SC[lang + '|' + b] || {}).p || 0;
    if (pb !== pa) return pb - pa;
    // à potentiel égal, ce qui vient d'une liste d'articles insolites d'abord
    const ca = (SC[lang + '|' + a] || {}).c ? 1 : 0;
    const cb = (SC[lang + '|' + b] || {}).c ? 1 : 0;
    return cb - ca;
  };

  // Les paires fr↔en produites par la collecte : elles servent à compter des
  // SUJETS là où les listes comptent des titres.
  const pairs = new Map(), inverses = new Map();
  // et, séparément, le vrai va-et-vient d'un titre à son équivalent :
  // c'est lui qui permet d'écrire l'anglais depuis l'article français.
  const versEn = new Map(), versFr = new Map();
  for (const p of (cat.pairs || [])){
    if (!p || !p.fr || !p.en) continue;
    pairs.set(p.fr, p.fr);          // le titre français est le canonique
    inverses.set(p.en, p.fr);
    versEn.set(p.fr, p.en);
    versFr.set(p.en, p.fr);
  }

  /* ═══════ TRANCHE DE BUDGET — le mode normal depuis la version 8 ═══════
     `--budget 30` : on prend les meilleurs sujets non écrits du catalogue
     maître, autant que trente euros permettent d'en écrire, français et
     anglais. `--estimer` avec la même tranche affiche le plan sans dépenser
     un centime. */
  if (BUDGET > 0){
    const maitre = await lireMaitre();
    if (!maitre || !maitre.sujets || !maitre.sujets.length){
      console.error('✗ catalogue-maitre.json introuvable ou vide. Lancez d\'abord l\'action « 1 · Moissonner ».');
      process.exit(1);
    }
    const decisions = await lireDecisions();
    const plan = planDeTranche(maitre, BUDGET, decisions);
    const coutReel = plan.retenus.length * 2 * plan.cout;
    console.log(`\n╔══ TRANCHE DE ${BUDGET} € ══════════════════════════════════`);
    console.log(`║  modèle : ${MODEL}`);
    console.log(`║  ${plan.cout.toFixed(4)} $ par texte, deux textes par sujet.`);
    console.log(`║  ${plan.retenus.length} sujet(s) → ${plan.retenus.length * 2} textes → `
              + `${coutReel.toFixed(2)} $ (~${(coutReel / EUR_USD).toFixed(2)} €)`);
    console.log(`║  ${plan.restants} sujet(s) restent à écrire au total.`);
    if (plan.surDecision)
      console.log(`║  Ce sont VOS sujets retenus dans la console — les autres attendent.`);
    if (plan.retenus.length){
      const parUni = {};
      for (const x of plan.retenus) parUni[x.uni] = (parUni[x.uni] || 0) + 1;
      console.log(`╠══ répartition ─────────────────────────────────────────`);
      for (const [k, v] of Object.entries(parUni).sort((a,b)=>b[1]-a[1]))
        console.log(`║  ${k.padEnd(12)} ${String(v).padStart(5)}`);
      console.log(`╠══ les cinq premiers ───────────────────────────────────`);
      for (const x of plan.retenus.slice(0, 5))
        console.log(`║  ${String(x.potentiel).padStart(2)}/10  ${(x.fr || x.en).slice(0, 46)}`);
    }
    console.log(`╚═════════════════════════════════════════════════════════`);

    if (ESTIMATE){
      console.log('\nAucun appel payant n\'a été fait.');
      console.log('Si le montant vous convient, relancez « 2 · Écrire » avec la même tranche.');
      return;
    }
    if (!plan.retenus.length){
      console.log('\nRien à écrire : tout le catalogue maître est déjà rédigé.');
      return;
    }
    await ecrireTranche(plan.retenus, maitre);
    return;
  }

  /* --- estimation seule ---
     L'estimation DOIT porter sur la sélection : sinon elle chiffre le
     catalogue entier et annonce un coût sans rapport avec ce que vous
     alliez lancer. Elle applique donc exactement le même filtre que la
     rédaction, à l'appel payant près. */
  if (ESTIMATE){
    let n = 0, sujets = 0;
    const vus = new Set();
    for (const lang of LANGS) for (const u of unis){
      const list = cat.sources[u]?.[lang] || [];
      const existing = await readJson(path.join(OUTDIR, lang + '-' + u + '.json'), { items:{} });
      let todo = list.filter(t => !existing.items[t]);
      if (selection){
        todo = todo.filter(t => selectionHas(selection, lang, u, t));
        // les sujets que Wikipédia n'a pas dans cette langue : on les écrit
        // quand même, depuis l'article de l'autre langue
        const dejaLa = new Set(todo);
        for (const t of titresDeSelection(selection, lang, u)){
          if (dejaLa.has(t)) continue;
          if (typeof store !== 'undefined' && store.items && store.items[t]) continue;
          dejaLa.add(t); todo.push(t);
        }
      }
      todo.sort(parPotentiel(lang));
      todo = todo.slice(0, COMBIEN);
      n += todo.length;
      // un sujet bilingue compte pour deux textes, mais pour un seul sujet
      for (const t of todo){
        const jumeau = lang === 'fr' ? (pairs.get(t) || t) : (inverses.get(t) || t);
        vus.add(u + '|' + jumeau);
      }
    }
    sujets = vus.size;
    const kIn = n * JETONS_ENTREE / 1e6, kOut = n * JETONS_SORTIE / 1e6;
    if (selection) console.log(`\nVotre sélection porte sur ${sujets} sujet(s) distinct(s).`);
    console.log(`\n${n} anecdote(s) à écrire.`);
    console.log(`Volume : ${kIn.toFixed(2)} M jetons en entrée, ${kOut.toFixed(2)} M en sortie.\n`);
    console.log('Modèle                       Entrée   Sortie        COÛT ESTIMÉ');
    for (const [m, p] of Object.entries(PRIX)){
      const c = kIn * p.in + kOut * p.out;
      const mark = m === MODEL ? ' ←' : '';
      console.log(`${m.padEnd(28)} $${String(p.in).padStart(5)}  $${String(p.out).padStart(5)}   ${('$' + c.toFixed(2)).padStart(12)}${mark}`);
    }
    console.log('\nTarifs en dollars par million de jetons, relevés en août 2026.');
    console.log('Aucun appel payant n\'a été fait.');
    return;
  }

  /* --- recompter, sans rien écrire ---
     Utile après avoir ajouté ou retiré des fiches à la main : recalcule
     anecdotes/index.json, donc les chiffres que le site affiche. Gratuit. */
  if (INDEX_SEUL){
    await buildIndex();
    return;
  }

  if (!KEY){
    console.error('✗ Aucune clé API. Définissez ANTHROPIC_API_KEY (ou OPENAI_API_KEY avec --fournisseur openai).');
    process.exit(1);
  }
  await fs.mkdir(OUTDIR, { recursive:true });
  console.log(`Fournisseur : ${PROVIDER} · modèle : ${MODEL} · ${PARALLEL} en parallèle`);

  for (const lang of LANGS){
    for (const u of unis){
      const list = cat.sources[u]?.[lang] || [];
      if (!list.length) continue;
      const file = path.join(OUTDIR, lang + '-' + u + '.json');
      const store = await readJson(file, { items:{} });
      if (!store.items) store.items = {};

      let todo = list.filter(t => !store.items[t]);
      if (selection){
        todo = todo.filter(t => selectionHas(selection, lang, u, t));
        // les sujets que Wikipédia n'a pas dans cette langue : on les écrit
        // quand même, depuis l'article de l'autre langue
        const dejaLa = new Set(todo);
        for (const t of titresDeSelection(selection, lang, u)){
          if (dejaLa.has(t)) continue;
          if (typeof store !== 'undefined' && store.items && store.items[t]) continue;
          dejaLa.add(t); todo.push(t);
        }
      }
      todo.sort(parPotentiel(lang));
      todo = todo.slice(0, COMBIEN);
      if (!todo.length){ console.log(`▸ ${lang}/${u} : déjà complet (${Object.keys(store.items).length})`); continue; }
      const hauts = todo.filter(t => ((SC[lang + '|' + t] || {}).p || 0) >= 7).length;
      console.log(`▸ ${lang}/${u} : ${todo.length} à écrire, dont ${hauts} à fort potentiel (${Object.keys(store.items).length} déjà là)`);

      let cursor = 0, since = 0;
      const worker = async () => {
        while (cursor < todo.length){
          const title = todo[cursor++];
          try{
            const jumeau = lang === 'fr' ? (versEn.get(title) || versFr.get(title) || title)
                                        : (versFr.get(title) || versEn.get(title) || title);
            const d = await ficheArticle(lang, title, jumeau);
            if (!d || d.text.length < 400){ skipped++; continue; }
            const sc = SC[lang + '|' + title] || SC[(lang === 'fr' ? 'en' : 'fr') + '|' + title] || {};
            const angle = sc.w || '';
            const a = await ask(lang, title, d.text, angle, d.source);
            if (!a || a.x.length < 1600){ skipped++; continue; }   // trop court : on écarte
            if (a.s < MIN_SCORE_KEEP){ skipped++; continue; }
            a.i = d.img; a.u = d.url;          // l'app n'aura plus besoin de Wikipédia
            a.d = new Date().toISOString().slice(0,10);   // pour le compteur « nouveautés »
            store.items[title] = a;
            done++; since++;
            if (since >= 10){ since = 0; await writeAtomic(file, { generated:new Date().toISOString(), model:MODEL, items:store.items }); }
            if (done % 25 === 0) process.stdout.write(`  ${done} écrites…\n`);
          }catch(e){
            failed++;
            if (/indisponible sur votre compte/.test(e.message)){ console.error('\n✗ ' + e.message); process.exit(1); }
            if (failed <= 5) console.error(`  ! ${title} : ${e.message}`);
          }
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      await writeAtomic(file, { generated:new Date().toISOString(), model:MODEL, items:store.items });
      console.log(`  ✓ ${lang}/${u} → ${Object.keys(store.items).length} anecdotes`);
    }
  }

  await buildIndex();

  const p = PRIX[MODEL];
  console.log(`\n✓ ${done} anecdotes écrites, ${skipped} sujets écartés, ${failed} échecs.`);
  console.log(`  Jetons : ${(tokIn/1e6).toFixed(3)} M en entrée, ${(tokOut/1e6).toFixed(3)} M en sortie.`);
  if (p) console.log(`  Coût réel de cette exécution : $${(tokIn/1e6*p.in + tokOut/1e6*p.out).toFixed(2)} (modèle ${MODEL}).`);
}

/* anecdotes/index.json : ce que le site a le droit d'annoncer.
 *
 * Le chiffre public est un nombre de SUJETS écrits : « Lac Nyos » rédigé en
 * français et en anglais, c'est UN sujet, pas deux. Les totaux par langue
 * restent là pour l'outillage, mais ce n'est pas ce qu'on affiche.
 *
 * Et rien ici ne vient du catalogue : un sujet collecté mais pas encore écrit
 * ne compte pas, n'apparaît pas, n'existe pas pour le public.            */
async function buildIndex(){
  const files = (await fs.readdir(OUTDIR).catch(()=>[])).filter(f => f.endsWith('.json') && f !== 'index.json');
  const cat = await readJson(CATALOG, { pairs: [] });
  // titre anglais -> titre français : c'est ce qui replie une paire sur un sujet
  const versFr = new Map((cat.pairs || []).filter(p => p && p.fr && p.en).map(p => [p.en, p.fr]));

  const total = {}, weekly = {}, byUniverse = {};
  const sujets = new Set(), sujetsSemaine = new Set(), sujetsUni = {};
  const cut = new Date(Date.now() - 7*864e5).toISOString().slice(0,10);
  const aujourdhui = new Date().toISOString().slice(0,10);
  /* Le chiffre public ne compte QUE ce qui est publié. Une fiche écrite mais
     gardée en réserve n'existe pas encore pour le lecteur : c'est tout le
     principe de la publication étalée. Les fiches d'avant la version 8 n'ont
     pas de date de publication ; on les considère publiées. */
  const enLigne = (v) => v.p === undefined || (v.p !== null && String(v.p) <= aujourdhui);
  let enReserve = 0;

  for (const f of files){
    const [lang, uni] = f.replace(/\.json$/,'').split(/-(.+)/);
    const j = await readJson(path.join(OUTDIR, f), { items:{} });
    const toutes = Object.entries(j.items || {});
    enReserve += toutes.filter(([, v]) => !enLigne(v)).length;
    const entrees = toutes.filter(([, v]) => enLigne(v));
    const items = entrees.map(([, v]) => v);

    total[lang]  = (total[lang]  || 0) + items.length;
    // « nouveau » = récemment PUBLIÉ. C'est ce que voit le lecteur.
    weekly[lang] = (weekly[lang] || 0) + items.filter(i => ((i.p || i.d) || '') >= cut).length;
    byUniverse[uni] = byUniverse[uni] || {};
    byUniverse[uni][lang] = items.length;

    sujetsUni[uni] = sujetsUni[uni] || new Set();
    for (const [titre, v] of entrees){
      const cle = uni + '|' + (lang === 'en' ? (versFr.get(titre) || titre) : titre);
      sujets.add(cle);
      sujetsUni[uni].add(cle);
      if (((v.p || v.d) || '') >= cut) sujetsSemaine.add(cle);
    }
  }

  total.sujets  = sujets.size;
  weekly.sujets = sujetsSemaine.size;
  for (const uni of Object.keys(byUniverse)) byUniverse[uni].sujets = (sujetsUni[uni] || new Set()).size;

  await writeAtomic(path.join(OUTDIR, 'index.json'),
    { generated:new Date().toISOString().slice(0,10), total, weekly, byUniverse, reserve:enReserve });
  console.log(`  index.json : ${sujets.size} sujet(s) EN LIGNE — ${JSON.stringify({fr:total.fr||0, en:total.en||0})} textes`
            + (enReserve ? `, ${enReserve} en réserve.` : '.'));
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
