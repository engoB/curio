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
/* ── LE MODÈLE PAR DÉFAUT : SONNET ─────────────────────────────────────────
   À l'aveugle, sur neuf fiches, l'auteur de Curio n'a pas distingué Sonnet
   d'Opus. Or Opus coûte deux fois et demie plus cher : 0,049 $ la fiche
   contre 0,0196 $, soit 57 $ contre 23 $ pour mille cent cinquante sujets.
   Payer deux fois et demie pour une différence qu'on ne voit pas est
   exactement le genre de dépense inutile qu'on cherche à supprimer.

   Sonnet devient donc le défaut. Opus reste à une ligne de distance —
   « modele » dans l'action, ou le menu de la console — et rien n'oblige à
   choisir le même modèle pour tous les lots. */
let   MODEL    = String(opt('modele', process.env.CURIO_MODEL ||
                   (PROVIDER === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-5')));
/* Si le modèle demandé n'existe pas sur le compte, on descend cette liste. */
const FALLBACKS = PROVIDER === 'openai'
  ? ['gpt-4o-mini']
  : ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'];

/* Tarifs officiels en dollars par million de jetons (vérifiés en août 2026).
   Mettez-les à jour si Anthropic change sa grille. */
const PRIX = {
  'claude-opus-5':              { in: 5,  out: 25 },
  'claude-sonnet-5':            { in: 2,  out: 10 },
  'claude-haiku-4-5-20251001':  { in: 1,  out: 5  },
  'gpt-4o-mini':                { in: 0.15, out: 0.6 }
};
/* Moyennes mesurées pour un texte : l'entrée, c'est votre consigne (environ
   deux mille jetons, identique à chaque appel) plus la fiche de faits (mille
   environ, différente à chaque fois). L'ancienne estimation de 1 800 jetons
   d'entrée sous-évaluait la facture d'un bon tiers.

   Avec la mise en cache de la consigne, seule la fiche de faits est payée
   plein tarif ; la consigne est relue à un dixième du prix. C'est ce que
   traduit ENTREE_CACHE.                                                  */
/* CALIBRÉ SUR DES TRANCHES RÉELLES, Opus 5, journal à l'appui :
     · la consigne mise en cache        ~3 000 jetons  (relus à 1/10)
     · la fiche de faits + l'invite     ~2 000 jetons  (plein tarif)
     · le texte produit                 ~1 500 jetons  (sortie)
   Les deux premières valeurs étaient sous-évaluées d'un tiers et de moitié :
   l'estimation annonçait 0,0435 $ là où la facture disait 0,049 $. */
const JETONS_CONSIGNE = 3000, JETONS_FICHE = 2000, JETONS_SORTIE = 1500;
const JETONS_ENTREE = JETONS_CONSIGNE + JETONS_FICHE;
const ENTREE_CACHE  = JETONS_FICHE + Math.round(JETONS_CONSIGNE * 0.1);
const PARALLEL = Math.max(1, Math.min(8, parseInt(opt('parallele', '3'), 10) || 3));
/* Une tranche de budget, en euros. C'est la seule chose à régler pour
   écrire : plus de sélection à coller — GitHub refusait d'ailleurs les
   grandes (« Provided inputs are too large ») — plus de langue ni d'univers
   à choisir. On prend les meilleurs sujets non écrits du catalogue maître,
   jusqu'à épuisement de la tranche, et on écrit le français ET l'anglais. */
const BUDGET  = parseFloat(opt('budget', '0')) || 0;
/* Le nombre de sujets. Plus lisible qu'un budget en euros quand on veut
   « cinq pour voir », puis « trois cents ». S'il est donné, il commande ; le
   budget ne sert plus alors qu'à afficher le coût. */
const SUJETS  = parseInt(opt('sujets', '0'), 10) || 0;
/* Le potentiel minimum d'un sujet, de 0 à 10. « --potentiel 9 » n'écrit que
   les 9 et les 10 : c'est la façon d'attaquer un catalogue de vingt mille
   sujets par le haut, sans avoir à trier vingt mille lignes à la main.
   0 — le défaut — ne filtre rien, l'ordre par potentiel suffit. */
const POTENTIEL_MINI = Math.max(0, Math.min(10, parseInt(opt('potentiel', '0'), 10) || 0));
/* Un plafond de dépense, en dollars. Au-delà, la tranche s'arrête proprement
   et enregistre ce qu'elle a fait. C'est le garde-fou qui manquait : une
   consigne mal comprise, un modèle qui bavarde, et un lot de trois cents
   sujets peut coûter bien plus que prévu sans que personne ne l'arrête. */
let PLAFOND = parseFloat(opt('plafond', '0')) || 0;
/* La longueur maximale d'une réponse. Un texte de 3 500 signes plus son
   titre et sa phrase à raconter tiennent dans 1 800 jetons ; on monte
   automatiquement si le modèle se fait couper. */
let MAX_SORTIE = parseInt(opt('max-sortie', '1800'), 10) || 1800;
/* Le raisonnement interne du modèle est facturé en sortie. Pour de la
   rédaction sous consigne stricte, il ne sert à rien : on le coupe.
   --avec-pensee le rétablit. */
let SANS_PENSEE = !opt('avec-pensee', false);
/* Les langues de CETTE tranche. « fr » seul écrit le français maintenant et
   laisse l'anglais pour plus tard, sans rien perdre : le sujet reste
   « à écrire » tant que toutes ses langues ne sont pas faites, et une
   deuxième tranche en anglais ne repaiera jamais le français. */
const LANGUES = String(opt('langues', 'fr,en')).split(',')
                  .map(x => x.trim().toLowerCase()).filter(x => x === 'fr' || x === 'en');
const LANGUES_TRANCHE = LANGUES.length ? LANGUES : ['fr', 'en'];
const EUR_USD = 1.08;
const MAITRE  = path.join(process.cwd(), 'catalogue-maitre.json');

function coutParTexte(){
  const t = PRIX[MODEL] || PRIX['claude-opus-5'];
  const entree = (CACHE && PROVIDER !== 'openai') ? ENTREE_CACHE : JETONS_ENTREE;
  return (entree * t.in + JETONS_SORTIE * t.out) / 1e6;   // en dollars
}

/* Les langues publiées, lues dans consignes/publication.txt. Par défaut les
   deux : ne rien régler ne doit rien retirer. */
async function languesPubliees(){
  try{
    const brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'publication.txt'), 'utf8');
    for (const l of brut.split(/\r?\n/)){
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^langues\s*[:=]\s*(.+)$/i);
      if (!m) continue;
      const v = m[1].split(/[,\s+]+/).map(x => x.trim().toLowerCase())
                    .filter(x => x === 'fr' || x === 'en');
      if (v.length) return [...new Set(v)];
    }
  }catch{}
  return ['fr', 'en'];
}

/* Le réglage « images » de consignes/publication.txt, recopié dans les
   fichiers que le site et l'application lisent au démarrage. Il est aussi
   gravé dans les pages à la construction ; celui-ci permet de le changer
   sans reconstruire : « Entretien → recompter » suffit.
     oui (défaut) · franches · non                                        */
async function imagesPubliees(){
  try{
    const brut = await fs.readFile(path.join(process.cwd(), 'consignes', 'publication.txt'), 'utf8');
    for (const l of brut.split(/\r?\n/)){
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^images\s*[:=]\s*(\S+)/i);
      if (m && /^(oui|non|franches)$/i.test(m[1])) return m[1].toLowerCase();
    }
  }catch{}
  return 'oui';
}

async function lireMaitre(){
  try{ return JSON.parse(await fs.readFile(MAITRE, 'utf8')); }
  catch{ return null; }
}

/* ═══ REMETTRE LE CATALOGUE MAÎTRE D'ACCORD AVEC LE DISQUE ═════════════════
   Le catalogue maître dit quelles langues sont écrites pour chaque sujet.
   Il était mis à jour à la toute fin d'une tranche : si l'exécution
   s'arrêtait avant — crédit épuisé, temps de l'action dépassé, exécution
   annulée — les fiches restaient sur le disque, bel et bien payées, mais le
   catalogue continuait de les annoncer « à écrire ». La console les comptait
   comme du travail à faire, et la tranche suivante les reprenait pour
   constater qu'elles étaient là : « rien de neuf », zéro fiche.

   On remet donc les compteurs d'aplomb AVANT chaque tranche, en lisant les
   fichiers eux-mêmes. Les fichiers sont la vérité ; le catalogue n'en est que
   le résumé. Aucun appel, aucune dépense — et quoi qu'il arrive à une
   exécution, la suivante repart juste.                                      */
async function synchroniserMaitre(maitre){
  const cache = new Map();
  const titresDe = async (lang, uni) => {
    const cle = lang + '|' + uni;
    if (!cache.has(cle)){
      const j = await readJson(path.join(OUTDIR, lang + '-' + uni + '.json'), { items:{} });
      cache.set(cle, new Set(Object.keys(j.items || {})));
    }
    return cache.get(cle);
  };
  const aujourdhui = new Date().toISOString().slice(0, 10);
  let corriges = 0, acheves = 0;
  for (const s of maitre.sujets || []){
    if (!s || !s.uni) continue;
    const tfr = s.fr || s.en, ten = s.en || s.fr;
    const faites = [];
    if (tfr && (await titresDe('fr', s.uni)).has(tfr)) faites.push('fr');
    if (ten && (await titresDe('en', s.uni)).has(ten)) faites.push('en');
    const avant = (s.langues || []).join(',');
    if (avant === faites.join(',')) continue;
    s.langues = faites;
    corriges++;
    if (faites.length === 2 && s.statut !== 'ecrit'){
      s.statut = 'ecrit'; s.ecrit = s.ecrit || aujourdhui; acheves++;
    }
  }
  if (corriges){
    maitre.genere = new Date().toISOString();
    await writeAtomic(MAITRE, maitre);
    console.log(`▸ Catalogue remis d'accord avec le disque : ${corriges} sujet(s) corrigé(s)`
              + (acheves ? `, dont ${acheves} désormais complet(s).` : '.'));
    console.log(`  (des fiches payées lors d'une exécution interrompue — rien n'est perdu.)`);
  }
}

/* ═══ CE QUI DOIT ARRÊTER LA TRANCHE SUR-LE-CHAMP ═════════════════════════
   Un crédit épuisé, une clé refusée, un compte suspendu : ces erreurs-là ne
   se réparent pas en réessayant. Avant, chacun des trois cents sujets d'un
   lot allait quand même frapper à la porte trois fois — neuf cents appels
   refusés, une action qui tourne dix minutes pour rien, et un journal où
   l'on ne voit plus la vraie cause au milieu de trois cents lignes d'échec.

   Désormais on s'arrête au premier. Ce qui est écrit est déjà enregistré ;
   SEUL LE SUJET EN COURS est à reprendre, et la relance le retrouvera de
   lui-même puisque le catalogue vient d'être remis d'accord avec le disque. */
const FATALES = /credit balance|insufficient|quota|billing|payment|invalid x-api-key|authentication|unauthorized|permission|suspended|organization has been disabled/i;
function estFatale(message){ return FATALES.test(String(message || '')); }
let ARRET = false, raisonArret = '';

/* Ce que cette exécution a coûté jusqu'ici, en dollars, d'après les jetons
   que l'API a elle-même comptés. C'est la vérité, pas une estimation. */
function coutCourant(){
  const p = PRIX[MODEL];
  if (!p) return 0;
  return (tokIn/1e6)*p.in + (tokEcrit/1e6)*p.in*1.25 + (tokRelu/1e6)*p.in*0.1 + (tokOut/1e6)*p.out;
}

/* Les sujets que la tranche permet d'écrire : les meilleurs d'abord, jamais
   deux fois le même, et toujours les deux langues. */
function planDeTranche(maitre, budgetEuros, decisions){
  const cout = coutParTexte();
  const parSujet = LANGUES_TRANCHE.length;          // 1 ou 2 textes par sujet
  const textesPossibles = Math.floor((budgetEuros * EUR_USD) / cout);
  const sujetsPossibles = SUJETS > 0
    ? SUJETS
    : Math.max(0, Math.floor(textesPossibles / parSujet));

  /* Vos décisions, prises dans la console, commandent. Si vous avez retenu
     des sujets, on n'écrit QUE ceux-là — et jamais ce que vous avez écarté.
     Sans décision, on prend simplement les meilleurs. */
  const dec = decisions || {};
  const retenusExplicites = Object.keys(dec).filter(k => dec[k] === 'retenu').length;

  let candidats = (maitre.sujets || [])
    .filter(s => s.statut === 'a-ecrire' && (s.fr || s.en) && dec[s.qid] !== 'ecarte');
  if (retenusExplicites) candidats = candidats.filter(s => dec[s.qid] === 'retenu');

  /* Un sujet écrit en français reste « à écrire » — il lui manque l'anglais —
     mais une tranche EN FRANÇAIS n'a plus rien à y faire. Sans ce filtre, une
     tranche de deux sujets reprenait les deux mieux notés, constatait qu'ils
     étaient déjà écrits, et ne faisait rien : « rien de neuf », zéro fiche,
     zéro dépense. Correct, mais inutile. On écarte donc d'emblée les sujets
     dont TOUTES les langues demandées sont déjà rédigées. */
  const dejaFait = (s) => {
    const l = s.langues || [];
    return l.length && LANGUES_TRANCHE.every(x => l.includes(x));
  };
  const complets = candidats.filter(dejaFait).length;
  candidats = candidats.filter(s => !dejaFait(s));

  /* Le seuil de potentiel. Trier par potentiel met les meilleurs devant, mais
     ne dit pas où s'arrêter : sur une tranche de trois cents, on finit
     forcément dans les 6/10. Le seuil, lui, ferme la porte. */
  let sousLeSeuil = 0;
  if (POTENTIEL_MINI > 0){
    const avant = candidats.length;
    candidats = candidats.filter(s => (s.potentiel || 0) >= POTENTIEL_MINI);
    sousLeSeuil = avant - candidats.length;
  }

  candidats.sort((a, b) => (b.potentiel - a.potentiel)
               || ((b.sources || []).length - (a.sources || []).length)
               || (b.editions || 0) - (a.editions || 0));
  return { cout, sujetsPossibles, parSujet, retenus: candidats.slice(0, sujetsPossibles),
           restants: candidats.length, complets, sousLeSeuil,
           surDecision: retenusExplicites > 0 };
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

L'ACCROCHE : UN PARAGRAPHE À ELLE SEULE
Le texte commence par une accroche ISOLÉE, séparée du reste par une ligne vide, de VINGT-CINQ MOTS AU PLUS. Une ou deux phrases courtes. L'application l'affiche plus grande, avec un filet à gauche : c'est elle qui décide si on lit la suite. Elle pose une chose, une seule ; elle n'explique pas et ne résume pas.
Elle doit être impossible à ne pas finir. Trois façons : jeter le lecteur dans la scène (un lieu, une date, quelqu'un qui fait quelque chose) ; poser l'anomalie sans l'expliquer (une phrase courte qui ne peut pas être vraie, et qui l'est) ; prendre le lecteur à témoin (une chose qu'il croit savoir, et qui est fausse).
Interdit : une définition, une date de naissance, « Saviez-vous que », « Imaginez un instant », un résumé de ce qui va suivre.

SE FAIRE COMPRENDRE DU PREMIER COUP
Le lecteur lit sur un téléphone, une seule fois, sans revenir en arrière. Une idée par phrase, deux propositions au maximum. Jamais « pas ceci, pas cela, mais en plus de tout ça… » au début : on ne peut pas nier ce que le lecteur n'a pas encore en tête — affirme d'abord, corrige ensuite. Toute notion technique est expliquée dans la phrase où elle apparaît, par une comparaison familière. La première phrase de chaque paragraphe doit se comprendre seule.

IMPLIQUER LE LECTEUR
Le texte s'adresse à quelqu'un. Deux ou trois fois — pas plus — tu peux lui faire faire un geste mental (« fermez les yeux »), lui donner une échelle qu'il connaît (« à peine plus qu'un grain de riz » plutôt que « 5 mm »), ou nommer ce qu'il est en train de penser (« on se dit que quelqu'un aurait fini par le remarquer. C'est ce que tout le monde a pensé. »). Avec parcimonie : le « vous » ne doit jamais devenir un tic.

RÈGLES
- **2 500 à 3 500 caractères** : l'accroche, puis 5 à 7 paragraphes séparés par une ligne vide. 2 500 est un minimum : un texte plus court est refusé.
- Raconte, et développe. Chiffres précis, dates, noms, lieux — uniquement ceux présents dans la fiche de faits.
- Structure : l'accroche, puis le contexte, puis le mécanisme ou l'enquête, puis les conséquences, puis le détail final. Chaque paragraphe apporte quelque chose de neuf ; ne redis jamais la même information.
- N'invente rien. Si une information manque, ne la mentionne pas.
- Termine sur le détail qui reste en tête, pas sur une morale ni sur une question.
- Mets en **gras** de TROIS À CINQ éléments par texte, jamais plus : les chiffres et les noms qui frappent. Jamais une phrase entière, jamais deux gras dans la même phrase. Celui qui parcourt le texte des yeux doit en tirer l'essentiel rien qu'avec eux.
- Mets en *italique* les termes techniques que tu introduis et les titres d'oeuvres.
- Pas de titres internes, pas de listes, pas d'emoji.
- Français naturel, phrases courtes, aucun jargon non expliqué.

TITRE
- Une accroche de 3 à 8 mots, évocatrice, sans deux-points ni sous-titre.
- LE TITRE NE RÉPÈTE PAS L'ACCROCHE DU TEXTE. Ils sont affichés l'un au-dessus de l'autre : lire deux fois la même phrase perd le lecteur. Le titre pose, l'accroche frappe.
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

THE HOOK: A PARAGRAPH OF ITS OWN
The piece opens with a hook STANDING ALONE, separated from the rest by a blank line, TWENTY-FIVE WORDS AT MOST. One or two short sentences. The app renders it larger, with a rule down its left side: it decides whether the reader goes on. It states one thing, and one only; it does not explain and does not summarise.
It must be impossible not to finish. Three ways: drop the reader into the scene (a place, a date, someone doing something); state the anomaly without explaining it (a short sentence that cannot be true, and is); make the reader a witness (something they think they know, which is wrong).
Forbidden: a definition, a birth date, "Did you know", "Imagine for a moment", a summary of what follows.

BEING UNDERSTOOD THE FIRST TIME
The reader is on a phone, reading once, not going back. One idea per sentence, two clauses at most. Never open with "not this, not that, but on top of all that…": you cannot negate what the reader has not yet pictured — state first, correct after. Every technical notion is explained in the sentence where it appears, with a familiar comparison. The first sentence of each paragraph must make sense on its own.

INVOLVING THE READER
The text speaks to someone. Two or three times — no more — you may ask for a mental gesture ("close your eyes"), give a scale they know ("barely larger than a grain of rice" rather than "5 mm"), or name the thought they are having ("you would think someone would have noticed. That is exactly what everyone thought."). Sparingly: "you" must never become a tic.

RULES
- **2,500 to 3,500 characters**: the hook, then 5 to 7 paragraphs separated by a blank line. 2,500 is a floor: a shorter text is rejected.
- Tell it as a story, and develop it. Precise figures, dates, names, places — only those present in the fact sheet.
- Structure: the hook, then the context, then the mechanism or the investigation, then the consequences, then the closing detail. Every paragraph adds something new; never restate the same fact.
- Invent nothing. If something is missing, leave it out.
- End on the detail that sticks, not on a moral or a question.
- Put THREE TO FIVE elements per piece in **bold**, never more: the figures and names that land. Never a whole sentence, never two in the same sentence. A reader skimming should get the essentials from those alone.
- Use *italics* for technical terms you introduce and for work titles.
- No internal headings, no lists, no emoji.
- Natural English, short sentences, no unexplained jargon.

TITLE
- A 3 to 8 word hook, evocative, no colon, no subtitle.
- THE TITLE MUST NOT REPEAT THE OPENING HOOK. They are shown one above the other: reading the same sentence twice loses the reader. The title sets up, the hook lands.
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
/* Les jetons de cache : ceux qu'on a fait mémoriser une fois, et ceux qu'on
   a relus à un dixième du prix. C'est là que se voit l'économie. */
let tokEcrit = 0, tokRelu = 0;
/* Combien de fois on a redemandé un texte — chaque reprise est un appel
   facturé. C'est la première explication d'une facture plus lourde que prévu. */
let reprises = 0;
let tokPensee = 0;                  // jetons de raisonnement, facturés en sortie
/* La mise en cache est active par défaut ; --sans-cache la coupe, et l'API
   peut la refuser d'elle-même — on continue alors sans. */
let CACHE = !opt('sans-cache', false);

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
  let communs = 0, courant = 0, max = 0, debut = 0;
  /* On garde aussi les passages fautifs eux-mêmes : sans eux, une réécriture
     est un coup d'épée dans l'eau — le modèle ne sait pas ce qu'on lui
     reproche et réécrit la même chose. Avec eux, il sait quoi éviter. */
  const extraits = [];
  const fermer = (i) => {
    if (courant) extraits.push({ n: courant + n - 1, mots: out.slice(debut, i + n - 1).join(' ') });
    courant = 0;
  };
  for (let i = 0; i + n <= out.length; i++){
    if (grammes.has(out.slice(i, i + n).join(' '))){
      if (!courant) debut = i;
      communs++; courant++; max = Math.max(max, courant + n - 1);
    } else fermer(i);
  }
  fermer(out.length - n + 1);
  extraits.sort((a, b) => b.n - a.n);
  return { max, communs, extraits: extraits.slice(0, 3).map(e => e.mots) };
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
/* ── LIRE LA RÉPONSE, MÊME MAL FORMÉE ────────────────────────────────────
   Un texte de six paragraphes tient dans un champ JSON, et il contient des
   retours à la ligne. La norme JSON exige qu'ils soient écrits « \n » ; un
   modèle qui rédige une anecdote les met souvent tels quels. `JSON.parse`
   refuse alors la réponse entière — et chaque refus coûtait un nouvel appel,
   facturé, pour un résultat identique.

   On répare donc avant de renoncer : on échappe les sauts de ligne qui se
   trouvent À L'INTÉRIEUR d'une chaîne, et rien d'autre. Si cela ne suffit
   pas, on va chercher les quatre champs à la main.                       */
function reparerJson(t){
  let out = '', dans = false, echap = false;
  for (const c of t){
    if (echap){ out += c; echap = false; continue; }
    if (c === '\\'){ out += c; echap = true; continue; }
    if (c === '"'){ dans = !dans; out += c; continue; }
    if (dans && (c === '\n' || c === '\r' || c === '\t')){
      out += c === '\n' ? '\\n' : c === '\r' ? '\\r' : '\\t';
      continue;
    }
    out += c;
  }
  return out;
}

/* Dernier recours : les quatre champs, extraits un par un. Tolère les
   retours à la ligne bruts, l'ordre des clés, et une accolade manquante. */
function champsALaMain(t){
  const texte = (cle) => {
    const re = new RegExp('"' + cle + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"', 's');
    const m = t.match(re);
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '';
  };
  const titre = texte('titre'), corps = texte('texte'), raconter = texte('raconter');
  const n = t.match(/"insolite"\s*:\s*(\d+)/);
  if (!corps) return null;
  return { titre, texte: corps, raconter, insolite: n ? Number(n[1]) : 0 };
}

function parseJson(txt){
  if (!txt) return null;
  let t = String(txt).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) return champsALaMain(t);
  const brut = t.slice(a, b + 1);
  try { return JSON.parse(brut); } catch {}
  try { return JSON.parse(reparerJson(brut)); } catch {}
  return champsALaMain(brut);
}

/* ── AMORCER LE CACHE AVANT DE PARALLÉLISER ──────────────────────────────
   Trois requêtes lancées en même temps arrivent toutes avant que la consigne
   soit mémorisée : chacune paie la mise en cache (×1,25) et aucune n'en
   profite. Mesuré sur une tranche de deux : 6 000 jetons mémorisés, ZÉRO relu
   — le cache coûtait au lieu de rapporter.

   Le premier appel part donc seul ; les autres attendent qu'il ait fini, et
   relisent la consigne à un dixième du prix. Une seconde d'attente au début,
   quinze pour cent sur toute la tranche.                                  */
let amorce = null, libererAmorce = null;
async function attendreAmorce(){
  if (!CACHE || PROVIDER === 'openai') return false;
  if (!amorce){
    amorce = new Promise(r => { libererAmorce = r; });
    return true;                     // c'est moi qui amorce
  }
  await amorce;
  return false;
}

async function ask(lang, title, text, pourquoi, langueFiche){
  const system = await consigne(lang);
  let arret = '', blocs = '';        // pourquoi le modèle s'est arrêté, et ce qu'il a renvoyé
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

  /* ── LE REPROCHE ────────────────────────────────────────────────────────
     Quand un texte est refusé — illisible, ou trop proche de la source — on
     rappelait le modèle avec EXACTEMENT le même message. Il produisait donc,
     sans surprise, à peu près le même texte, et l'appel était payé pour
     rien : c'est ce qu'a montré le test Sonnet sur « Porte de l'Enfer »,
     trois appels facturés, zéro fiche.

     On lui dit maintenant ce qu'on lui reproche, en lui citant ses propres
     passages fautifs. La consigne mise en cache, elle, ne bouge pas : le
     reproche s'ajoute au message de l'utilisateur, l'économie est intacte. */
  let reproche = '';

  const jAmorce = await attendreAmorce();
  try{
  for (let i = 0; i < 5; i++){
    try{
      let res, out;
      const message = user + reproche;
      if (PROVIDER === 'openai'){
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + KEY },
          body: JSON.stringify({ model: MODEL, temperature: 0.7, max_tokens: 2400,
            messages:[{ role:'system', content: system }, { role:'user', content: message }] })
        });
        if (res.status === 429 || res.status >= 500){ await sleep(2500 * (i+1)); continue; }
        const j = await res.json();
        if (j.error) throw new Error(j.error.message || 'erreur API');
        out = j.choices?.[0]?.message?.content;
        tokIn += j.usage?.prompt_tokens || 0; tokOut += j.usage?.completion_tokens || 0;
      } else {
        /* ── LA CONSIGNE EST MISE EN CACHE ────────────────────────────────
           Votre consigne de rédaction fait deux mille jetons, et elle est
           identique pour les 2 400 textes d'une grande tranche : la
           réexpédier à chaque appel, c'est payer cinq millions de jetons
           pour dire cinq cents fois la même chose.

           `cache_control` la fait mémoriser par l'API : le premier appel la
           paie un peu plus cher (×1,25), tous les suivants la relisent à un
           dixième du prix tant que les appels s'enchaînent. Sur une tranche
           complète, c'est environ 15 % de la facture — et cela vous permet
           d'écrire des consignes riches sans les payer au mot.          */
        /* Pas de « temperature » : Opus 5 la refuse — « `temperature` is
           deprecated for this model » — et l'omettre est valable pour tous
           les modèles. Le réglage ne nous manque pas : la consigne, elle,
           est très précise. */
        /* 1 800 jetons : un texte de 3 500 signes en fait environ 1 100.
           L'ancien plafond de 2 400 laissait une réponse bavarde coûter le
           double sans rien apporter. */
        /* ── PAS DE RAISONNEMENT ─────────────────────────────────────────
           Opus 5 réfléchit avant de répondre, et ce raisonnement est FACTURÉ
           en jetons de sortie — à 25 $ le million. Sur une tranche réelle il
           représentait les deux tiers de la facture (2 750 jetons de sortie
           par appel au lieu de 1 100), et il débordait du plafond, coupant
           la réponse en plein milieu : « arrêt max_tokens, blocs
           thinking+text ».

           Écrire une anecdote de 3 000 signes à partir d'une fiche de faits
           ne demande pas de raisonnement caché : la consigne dit exactement
           quoi faire. On le désactive donc explicitement. Si l'API refuse ce
           réglage, on s'en passe et on élargit le plafond pour ne pas être
           coupé — mieux vaut payer un peu plus que jeter la réponse. */
        const corps = { model: MODEL, max_tokens: MAX_SORTIE,
          system: CACHE ? [{ type:'text', text: system, cache_control:{ type:'ephemeral' } }] : system,
          messages:[{ role:'user', content: message }] };
        if (SANS_PENSEE) corps.thinking = { type: 'disabled' };
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'x-api-key': KEY, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify(corps)
        });
        if (res.status === 429 || res.status >= 500){ await sleep(2500 * (i+1)); continue; }
        const j = await res.json();
        /* Si l'API refuse la mise en cache — compte trop ancien, modèle qui
           ne la gère pas — on renonce au cache et on continue : c'est une
           économie, pas une dépendance. */
        if (j.error && SANS_PENSEE && /thinking/i.test(String(j.error.message || ''))){
          SANS_PENSEE = false;
          MAX_SORTIE = Math.max(MAX_SORTIE, 4000);
          console.log(`  · ce modèle n'accepte pas « thinking: disabled » : on le laisse `
                    + `réfléchir,\n    et on porte le plafond à ${MAX_SORTIE} jetons pour ne pas être coupé.`);
          continue;
        }
        if (j.error && CACHE && /cache/i.test(String(j.error.message || ''))){
          CACHE = false;
          console.log('  · mise en cache refusée par l’API : on continue sans elle.');
          continue;
        }
        if (j.error) throw new Error(j.error.message || 'erreur API');
        out = (j.content || []).map(c => c.text || '').join('');
        arret = j.stop_reason || '';
        blocs = (j.content || []).map(c => c.type).join('+');
        const u = j.usage || {};
        tokPensee += (u.output_tokens_details && u.output_tokens_details.thinking_tokens) || 0;
        tokIn  += (u.input_tokens || 0);
        tokOut += (u.output_tokens || 0);
        tokEcrit += (u.cache_creation_input_tokens || 0);
        tokRelu  += (u.cache_read_input_tokens || 0);
      }
      const parsed = parseJson(out);
      if (!parsed || !parsed.texte){
        /* Une réponse illisible sans explication ne se corrige pas. On dit
           donc POURQUOI : arrêté sur la limite de longueur, blocs reçus, et
           les premiers caractères tels quels. Une fois suffit. */
        if (!ask._dit){
          ask._dit = true;
          console.log(`  · réponse illisible — arrêt « ${arret || '?'} », blocs « ${blocs || '?'} », `
                    + `${(out || '').length} caractères reçus`);
          console.log(`    début : ${JSON.stringify(String(out || '').slice(0, 220))}`);
        }
        if (arret === 'max_tokens' && MAX_SORTIE < 4000){
          MAX_SORTIE = 4000;
          console.log(`  · réponse coupée par la limite de longueur : on repasse à ${MAX_SORTIE} jetons.`);
          reprises++; continue;
        }
        if (i < 2){
          reprises++;
          reproche = (lang === 'fr')
            ? "\n\nATTENTION — ta réponse précédente n'a pas pu être lue par la machine."
              + " Réponds UNIQUEMENT par l'objet JSON demandé : rien avant, rien après,"
              + " pas de bloc de code, et jamais de retour à la ligne brut à l'intérieur"
              + " d'une chaîne — écris \\n."
            : "\n\nWARNING — your previous answer could not be parsed."
              + " Answer ONLY with the requested JSON object: nothing before, nothing after,"
              + " no code fence, and never a raw line break inside a string — write \\n.";
          console.log(`  · on redemande en disant ce qui n'allait pas (appel payé)`);
          await sleep(600); continue;
        }
        throw new Error(`réponse illisible (arrêt « ${arret || '?'} »)`);
      }
      const produit = String(parsed.texte).replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();

      // Contrôle de reprise : si le texte partage de longues suites de mots
      // avec l'article, ce n'est pas une écriture, c'est une copie. On refuse.
      /* La fiche de faits conserve l'ordre des mots de l'article : quelques
         suites communes sont donc inévitables, et n'ont rien d'une copie. Le
         seuil était à trois, il passe à cinq, et on ne réécrit qu'UNE fois —
         chaque réécriture est un appel payé, et deux coûtaient plus cher
         qu'elles ne rapportaient. */
      const rec = recouvrement(produit, text, 8);
      if (rec.communs > 5){
        if (i < 1){
          reprises++;
          const cites = (rec.extraits || []).map(m => '« … ' + m + ' … »').join('\n');
          reproche = (lang === 'fr')
            ? "\n\nATTENTION — ta version précédente reprenait mot pour mot des passages"
              + " entiers de la source. Recommence : raconte les mêmes faits, mais"
              + " construis TOUTES tes phrases autrement — autre ordre, autre vocabulaire,"
              + " autres coupes. Ne reprends aucune suite de plus de sept mots.\n"
              + "Passages à ne pas réutiliser :\n" + cites
            : "\n\nWARNING — your previous version reused whole passages of the source"
              + " word for word. Start again: same facts, but build EVERY sentence"
              + " differently — different order, different words, different breaks."
              + " Never reuse a run of more than seven words.\n"
              + "Passages you must not reuse:\n" + cites;
          console.log(`  · reprise trop proche (${rec.communs} passages, ${rec.max} mots) — `
                    + `on réécrit une fois en citant les passages fautifs (appel payé)`);
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
      /* Crédit épuisé, clé refusée : on ne réessaie pas. Trois tentatives par
         sujet sur un lot de trois cents, ce sont neuf cents appels refusés et
         un journal illisible — pour une cause qui ne changera pas. */
      if (estFatale(e.message)) throw e;
      if (/model/i.test(e.message) && /not|introuvable|invalid|does not exist|unknown|unsupported/i.test(e.message)){
        const next = FALLBACKS[FALLBACKS.indexOf(MODEL) + 1];
        if (next){
          console.log(`  · modèle « ${MODEL} » indisponible, bascule sur « ${next} »`);
          MODEL = next;
          continue;
        }
        throw new Error('Aucun modèle disponible sur votre compte. Indiquez-en un avec --modele.');
      }
      /* Deux tentatives de plus au maximum : au-delà, on renonce. Un appel
         qui échoue côté réseau n'est pas facturé, mais un appel servi puis
         jugé mauvais l'est — inutile d'en payer cinq. */
      if (i >= 2) throw e;
      await sleep(1500 * (i+1));
    }
  }
  }finally{
    /* Qu'il ait réussi ou échoué, le premier appel libère les autres : sans
       cela une erreur au démarrage bloquerait toute la tranche. */
    if (jAmorce && libererAmorce){ libererAmorce(); libererAmorce = null; }
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
    for (const lang of LANGUES_TRANCHE){
      const titre = lang === 'fr' ? (s.fr || s.en) : (s.en || s.fr);
      if (!titre) continue;
      const cle = lang + '|' + s.uni;
      if (!paquets.has(cle)) paquets.set(cle, []);
      paquets.get(cle).push({ s, titre });
    }
  }

  const faites = new Map();           // qid -> nombre de langues écrites
  const causes = new Map();           // message d'erreur -> combien de fois
  let plafondAtteint = false;
  let done = 0, maigres = 0, jetees = 0, failed = 0, interrompus = 0;
  const total = [...paquets.values()].reduce((n, v) => n + v.length, 0);

  /* ── VOUS AVEZ ARRÊTÉ L'ACTION ────────────────────────────────────────────
     GitHub prévient d'abord, tue ensuite. Cette poignée de secondes suffit à
     poser le drapeau : les ouvriers se retirent, et la tranche passe à son
     enregistrement final au lieu d'être coupée en plein vol. */
  const surSignal = () => {
    if (ARRET) return;
    ARRET = true;
    raisonArret = 'exécution interrompue';
    console.log(`\n  ⛔ interruption demandée — on enregistre ce qui est écrit et on s'arrête.`);
  };
  process.on('SIGINT',  surSignal);
  process.on('SIGTERM', surSignal);

  for (const [cle, entrees] of paquets){
    if (ARRET) break;
    const [lang, uni] = cle.split('|');
    const fichier = path.join(OUTDIR, lang + '-' + uni + '.json');
    const store = await readJson(fichier, { items:{} });
    if (!store.items) store.items = {};

    const restants = entrees.filter(e => !store.items[e.titre]);
    if (!restants.length){ console.log(`▸ ${lang}/${uni} : rien de neuf`); continue; }
    console.log(`▸ ${lang}/${uni} : ${restants.length} fiche(s) à écrire`);

    /* Trois ouvriers travaillent de front sur le même fichier. Sans file
       d'attente, deux enregistrements simultanés se marcheraient dessus et le
       second écraserait le premier. On les met à la queue leu leu : chacun
       attend que le précédent ait fini. C'est une attente de millisecondes. */
    let file = Promise.resolve();
    const enregistrer = () => {
      file = file.then(() => writeAtomic(fichier,
        { generated:new Date().toISOString(), model:MODEL, items:store.items })).catch(e => {
          console.log(`  ! enregistrement de ${lang}/${uni} : ${e.message}`);
        });
      return file;
    };

    let curseur = 0;
    const ouvrier = async () => {
      while (curseur < restants.length){
        /* Une raison d'arrêter net : crédit épuisé, ou vous avez interrompu
           l'action. Les ouvriers se retirent, chacun finit l'appel qu'il a
           engagé, et la tranche va droit à l'enregistrement. */
        if (ARRET) return;
        /* Le plafond : on s'arrête AVANT d'engager un nouvel appel. Ce qui
           est écrit est déjà enregistré ; la tranche suivante reprendra. */
        if (PLAFOND > 0 && coutCourant() >= PLAFOND){
          if (!ouvrier._dit){
            ouvrier._dit = true;
            console.log(`\n  ⛔ plafond de ${PLAFOND} $ atteint (${coutCourant().toFixed(2)} $ dépensés).`);
            console.log(`     On s'arrête ici et on enregistre. Relancez pour continuer.`);
          }
          plafondAtteint = true;
          return;
        }
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
          /* Écarté AVANT tout appel : l'article est trop maigre pour qu'on en
             tire quoi que ce soit. Ne coûte rien, et c'est très bien ainsi. */
          if (!d || d.text.length < 400){ maigres++; continue; }
          const angle = s.phrase || '';
          const a = await ask(lang, titre, d.text, angle, d.source);
          /* Écarté APRÈS l'appel : le texte est payé et jeté. C'est la seule
             dépense de la chaîne qui ne rapporte rien, et elle était noyée
             dans le même compteur que les articles trop maigres, qui eux ne
             coûtent rien. On les sépare : ce qui se voit se corrige. */
          if (!a || a.x.length < 1600){
            jetees++;
            console.log(`  · ${titre} : texte trop court (${a ? a.x.length : 0} signes) — payé et écarté`);
            continue;
          }
          if (a.s < MIN_SCORE_KEEP){
            jetees++;
            console.log(`  · ${titre} : le rédacteur se note ${a.s}/10 — payé et écarté`);
            continue;
          }
          a.i = d.img; a.u = d.url;
          a.d = new Date().toISOString().slice(0, 10);
          a.q = s.qid;                     // le lien vers le catalogue maître
          a.p = null;                      // pas encore publiée
          a.v = '';                        // pas encore contrôlée
          store.items[titre] = a;
          faites.set(s.qid, (faites.get(s.qid) || 0) + 1);
          done++;
          /* ── ENREGISTRÉE DÈS QU'ÉCRITE ────────────────────────────────
             On enregistrait par paquets de dix. Une action interrompue au
             mauvais moment — crédit épuisé, temps dépassé, exécution
             annulée — jetait donc jusqu'à neuf fiches DÉJÀ PAYÉES.
             Écrire le fichier coûte quelques millisecondes, un appel à
             l'API coûte deux centimes et vingt secondes : le calcul est
             vite fait. */
          await enregistrer();
          if (done % 10 === 0)
            console.log(`  ${done}/${total} écrites — ${coutCourant().toFixed(2)} $ dépensés `
                      + `(${(coutCourant()/done).toFixed(4)} $ par fiche)`);
        }catch(e){
          causes.set(e.message, (causes.get(e.message) || 0) + 1);
          if (estFatale(e.message)){
            /* Ce n'est pas un échec du sujet : c'est le compte qui a dit non.
               Les deux ou trois appels déjà engagés par les autres ouvriers
               reçoivent le même refus — ils ne sont pas facturés, et leurs
               sujets sont simplement à reprendre. On les compte à part pour
               ne pas les faire passer pour des sujets défectueux. */
            interrompus++;
            /* La seule erreur qui arrête tout. Le sujet en cours est le SEUL
               à reprendre : tout ce qui précède est enregistré, et le
               catalogue sera remis d'accord avec le disque avant la relance. */
            if (!ARRET){
              ARRET = true;
              raisonArret = e.message;
              console.log(`\n  ⛔ ${e.message}`);
              console.log(`     On s'arrête ici. Les ${done} fiche(s) déjà écrites sont enregistrées ;`);
              console.log(`     seul « ${titre} » est à reprendre. Rechargez du crédit et relancez :`);
              console.log(`     la tranche repartira exactement là où elle s'est arrêtée.`);
            }
            return;
          }
          failed++;
          if (failed <= 3) console.log(`  ! ${titre} : ${e.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, ouvrier));
    await enregistrer();
  }
  process.off('SIGINT',  surSignal);
  process.off('SIGTERM', surSignal);

  /* ---- le catalogue maître enregistre ce qui est fait ------------------- */
  const aujourdhui = new Date().toISOString().slice(0, 10);
  let marques = 0;
  /* Un sujet n'est « écrit » que lorsque ses DEUX langues existent sur le
     disque. Une tranche en français seul le laisse donc « à écrire », et la
     tranche anglaise d'un autre jour le retrouvera — sans jamais repayer le
     français, puisqu'une fiche déjà présente est sautée. On regarde les
     fichiers, pas ce que cette exécution a fait : c'est la seule vérité. */
  const vusFichier = new Map();
  const aFiche = async (lang, uni, titre) => {
    const cle = lang + '|' + uni;
    if (!vusFichier.has(cle)){
      const j = await readJson(path.join(OUTDIR, lang + '-' + uni + '.json'), { items:{} });
      vusFichier.set(cle, new Set(Object.keys(j.items || {})));
    }
    return vusFichier.get(cle).has(titre);
  };
  let incomplets = 0;
  for (const s of maitre.sujets){
    if (!faites.has(s.qid)) continue;
    const tfr = s.fr || s.en, ten = s.en || s.fr;
    const okFr = await aFiche('fr', s.uni, tfr), okEn = await aFiche('en', s.uni, ten);
    /* On INSCRIT les langues déjà rédigées dans le catalogue maître. Sans
       cela, un sujet écrit en français seul reste « à écrire » — ce qui est
       exact — mais rien ne le distingue d'un sujet auquel personne n'a
       touché, ni dans la console, ni dans le tableur. */
    s.langues = [okFr ? 'fr' : null, okEn ? 'en' : null].filter(Boolean);
    if (okFr && okEn){
      s.statut = 'ecrit'; s.ecrit = aujourdhui; marques++;
    } else incomplets++;
  }
  maitre.genere = new Date().toISOString();
  await writeAtomic(MAITRE, maitre);

  await buildIndex();

  /* Ce qui reste À VOUS : si vous avez retenu des sujets dans la console,
     c'est ce compte-là qui vous intéresse, pas les vingt-deux mille du
     catalogue entier — l'écriture ne pioche que dans vos retenus. */
  const dec = await lireDecisions();
  const retenusExplicites = Object.keys(dec).filter(k => dec[k] === 'retenu').length;
  const enJeu = maitre.sujets.filter(x => x.statut === 'a-ecrire'
      && (!retenusExplicites || dec[x.qid] === 'retenu'));
  const aFinir     = enJeu.filter(x => (x.langues || []).length === 1).length;
  const aCommencer = enJeu.length - aFinir;
  console.log(`\n╔══ TRANCHE TERMINÉE ═══════════════════════════════════════`);
  console.log(`║  ${done} fiche(s) écrite(s), ${marques} sujet(s) complet(s).`);
  if (incomplets)
    console.log(`║  ${incomplets} sujet(s) écrits dans une seule langue : ils restent `
              + `« à écrire »\n║  et attendent leur tranche dans l'autre langue. Rien ne sera repayé.`);
  console.log(`║  ${maigres} sujet(s) écartés sans appel (article trop maigre) — gratuit.`);
  if (jetees){
    const px0 = PRIX[MODEL];
    const perdu = px0 ? jetees * ((2300 * px0.in + 1500 * px0.out) / 1e6) : 0;
    console.log(`║  ${jetees} texte(s) PAYÉS PUIS ÉCARTÉS (trop courts ou mal notés)`
              + (perdu ? ` — environ ${perdu.toFixed(2)} $ perdus.` : '.')
              + `\n║  Si ce nombre grimpe, c'est la consigne qu'il faut revoir, pas le modèle.`);
  }
  console.log(`║  ${failed} en échec.`);
  if (reprises)
    console.log(`║  ${reprises} réécriture(s) demandée(s) — chacune est un appel facturé.`);
  /* LE CHIFFRE QUI MANQUAIT : ce que cette tranche a réellement coûté,
     d'après les jetons comptés par l'API elle-même. Il n'apparaissait que
     dans l'ancien mode, pas dans les tranches. */
  const px = PRIX[MODEL];
  if (px){
    console.log(`╠══ ce que cette tranche a coûté ────────────────────────────`);
    console.log(`║  ${(tokIn/1e6).toFixed(3)} M jetons en entrée · ${(tokOut/1e6).toFixed(3)} M en sortie`);
    if (tokRelu || tokEcrit)
      console.log(`║  cache : ${(tokEcrit/1e6).toFixed(3)} M mémorisés, ${(tokRelu/1e6).toFixed(3)} M relus à 1/10 du prix`);
    else if (CACHE && done)
      console.log(`║  cache : aucun jeton mémorisé ni relu.`);
    if (tokPensee)
      console.log(`║  dont ${(tokPensee/1e6).toFixed(3)} M de raisonnement interne `
                + `(${Math.round(tokPensee / Math.max(1, tokOut) * 100)} % de la sortie, facturé plein tarif)`);
    const c = coutCourant();
    console.log(`║  ${c.toFixed(2)} $ (~${(c / EUR_USD).toFixed(2)} €)`
              + (done ? `  ·  ${(c/done).toFixed(4)} $ par fiche` : ''));
    /* La projection. Elle ne se fait PAS sur le coût moyen de la tranche :
       la mise en cache de la consigne se paie une fois, et sur deux fiches
       elle pèse un cinquième du prix alors que sur trois cents elle ne pèse
       plus rien. On projette donc sur le coût MARGINAL — ce que coûte la
       fiche suivante, cache déjà chaud. */
    if (done && enJeu.length){
      const marginal = ((tokIn/1e6)*px.in + (tokRelu/1e6)*px.in*0.1 + (tokOut/1e6)*px.out) / done;
      const reste = enJeu.length * marginal;
      if (tokEcrit && Math.abs(marginal - c/done) > 0.002)
        console.log(`║  ${marginal.toFixed(4)} $ par fiche une fois le cache chaud `
                  + `(la mise en cache se paie une seule fois).`);
      console.log(`║  à ce rythme, les ${enJeu.length} sujet(s) qui restent coûteraient `
                + `${reste.toFixed(2)} $ (~${(reste / EUR_USD).toFixed(2)} €).`);
      if (tokEcrit && !tokRelu)
        console.log(`║  ⚠ le cache n'a pas servi sur une tranche aussi courte : sur un gros`
                  + `\n║    lot, la consigne est mémorisée une fois et le prix baisse.`);
    }
  }
  if (plafondAtteint)
    console.log(`║  ⛔ arrêt sur plafond : relancez la même tranche pour continuer.`);
  if (interrompus)
    console.log(`║  ${interrompus} appel(s) déjà engagés ont reçu le même refus : non facturés,`
              + `\n║  leurs sujets sont simplement à reprendre.`);
  if (ARRET)
    console.log(`║  ⛔ arrêt net — ${raisonArret}.`
              + `\n║  Tout ce qui est écrit ci-dessus est enregistré et ne sera pas repayé.`
              + `\n║  Relancez la même tranche quand ce sera réglé : elle reprend d'elle-même.`);
  console.log(`║  Il reste ${aCommencer} sujet(s) à commencer`
            + (aFinir ? ` et ${aFinir} à finir dans l'autre langue` : '')
            + (retenusExplicites ? `,\n║  parmi VOS ${retenusExplicites} sujets retenus.` : `\n║  dans le catalogue maître.`));
  console.log(`╚═══════════════════════════════════════════════════════════`);

  /* Quand tout échoue, la cause est une, et il faut la dire en clair plutôt
     que de laisser chercher dans le journal. */
  if (!done && failed){
    console.log(`\n::error::Aucune fiche écrite : les ${failed} appels ont échoué.`);
    if (causes.size){
      console.log(`\nLa ou les causes, telles que l'API les a renvoyées :`);
      for (const [m, n] of [...causes.entries()].sort((a,b) => b[1]-a[1]).slice(0,3))
        console.log(`  · ${n} fois — ${m}`);
    }
    console.log(`\nRien n'a été facturé pour un appel refusé. Corrigez, puis relancez `
              + `la même tranche : elle reprendra exactement où elle en est.`);
    return;
  }
  if (done)
    console.log(`\nAucune fiche n'est encore VISIBLE : lancez « 3 · Contrôler » puis « 5 · Publier ».`);
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
  if (BUDGET > 0 || SUJETS > 0){
    const maitre = await lireMaitre();
    if (!maitre || !maitre.sujets || !maitre.sujets.length){
      console.error('✗ catalogue-maitre.json introuvable ou vide. Lancez d\'abord l\'action « 1 · Moissonner ».');
      process.exit(1);
    }
    /* Avant tout : le catalogue et le disque doivent dire la même chose.
       C'est ce qui rend une relance sûre après n'importe quelle interruption. */
    await synchroniserMaitre(maitre);
    const decisions = await lireDecisions();
    const plan = planDeTranche(maitre, BUDGET, decisions);
    const coutReel = plan.retenus.length * plan.parSujet * plan.cout;
    const entete = SUJETS > 0 ? `TRANCHE DE ${SUJETS} SUJET(S)` : `TRANCHE DE ${BUDGET} €`;
    console.log(`\n╔══ ${entete} ══════════════════════════════════`);
    console.log(`║  modèle : ${MODEL}`);
    console.log(`║  langue(s) : ${LANGUES_TRANCHE.join(' + ')}`
              + (plan.parSujet === 1 ? '  — l\'autre langue restera à écrire' : ''));
    console.log(`║  ${plan.cout.toFixed(4)} $ par texte, ${plan.parSujet} texte(s) par sujet.`);
    if (CACHE && PROVIDER !== 'openai'){
      const t = PRIX[MODEL] || PRIX['claude-opus-5'];
      const sans = (JETONS_ENTREE * t.in + JETONS_SORTIE * t.out) / 1e6;
      console.log(`║  consigne mise en cache : ${Math.round((1 - plan.cout / sans) * 100)} % de moins `
                + `(${sans.toFixed(4)} $ sans elle).`);
    }
    console.log(`║  ${plan.retenus.length} sujet(s) → ${plan.retenus.length * plan.parSujet} texte(s) → `
              + `${coutReel.toFixed(2)} $ (~${(coutReel / EUR_USD).toFixed(2)} €)`);
    /* Un plafond automatique, deux fois et demie l'estimation. Il ne sert
       jamais quand tout se passe bien ; il évite qu'une réécriture en boucle
       ou un modèle bavard transforme une tranche de dix euros en cinquante.
       « plafond » dans l'action le remplace par le vôtre. */
    if (PLAFOND <= 0 && coutReel > 0) PLAFOND = Math.max(0.5, coutReel * 2.5);
    console.log(`║  plafond de sécurité : ${PLAFOND.toFixed(2)} $ — au-delà, la tranche s'arrête`);
    console.log(`║  et enregistre ce qu'elle a fait.`);
    console.log(`║  ${plan.restants} sujet(s) restent à écrire au total.`);
    if (plan.surDecision)
      console.log(`║  Ce sont VOS sujets retenus dans la console — les autres attendent.`);
    if (plan.complets)
      console.log(`║  ${plan.complets} sujet(s) déjà écrits en ${LANGUES_TRANCHE.join('+')} sont passés — `
                + `ils ne\n║  seront jamais repayés.`);
    if (POTENTIEL_MINI > 0)
      console.log(`║  potentiel ${POTENTIEL_MINI}/10 minimum — ${plan.sousLeSeuil} sujet(s) sous le seuil `
                + `sont\n║  laissés de côté pour un autre jour.`);
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
      console.log('Si le montant vous convient, relancez « 2 · Écrire » avec la même tranche,');
      console.log('sans cocher « estimer seulement ».');
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
  if (tokRelu || tokEcrit)
    console.log(`  Cache : ${(tokEcrit/1e6).toFixed(3)} M mémorisés une fois, `
              + `${(tokRelu/1e6).toFixed(3)} M relus à un dixième du prix.`);
  if (p){
    /* Facturation réelle : l'écriture du cache coûte 1,25 fois le tarif
       d'entrée, sa relecture un dixième. */
    const cout = (tokIn/1e6)*p.in + (tokEcrit/1e6)*p.in*1.25 + (tokRelu/1e6)*p.in*0.1
               + (tokOut/1e6)*p.out;
    console.log(`  Coût réel de cette exécution : $${cout.toFixed(2)} (modèle ${MODEL}).`);
    if (tokRelu){
      const sans = cout + (tokRelu/1e6)*p.in*0.9 - (tokEcrit/1e6)*p.in*0.25;
      console.log(`  Sans la mise en cache, la même tranche aurait coûté $${sans.toFixed(2)}.`);
    }
  }
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
    { generated:new Date().toISOString().slice(0,10),
      /* Les langues publiées : le site s'en sert pour retirer le bouton FR/EN
         avant même qu'une fiche soit en ligne. */
      langues: await languesPubliees(),
      images:  await imagesPubliees(),
      total, weekly, byUniverse, reserve:enReserve });
  console.log(`  index.json : ${sujets.size} sujet(s) EN LIGNE — ${JSON.stringify({fr:total.fr||0, en:total.en||0})} textes`
            + (enReserve ? `, ${enReserve} en réserve.` : '.'));
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
