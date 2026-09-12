#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — LE BLOG
 *
 *  Il fabrique un site de lecture publique a partir des fiches DEJA EN LIGNE,
 *  une par jour, avec tout ce qu'un moteur de recherche attend.
 *
 *  ─── pourquoi une page par fiche ──────────────────────────────────────────
 *
 *  L'application est une seule adresse. Google n'a rien a indexer : pas de
 *  titre par sujet, pas de texte a lire, rien qui puisse remonter sur une
 *  recherche. Une application ne se refere pas ; des pages, si.
 *
 *  Et vous avez, sans le savoir, la meilleure matiere qui soit : le champ `r`
 *  de chaque fiche — l'accroche — est mot pour mot une requete de longue
 *  traine. « En 1977, un radiotelescope de l'Ohio a capte pendant exactement
 *  72 secondes un signal radio trente fois plus fort que le bruit de fond »
 *  n'est pas une phrase de presentation : c'est ce que quelqu'un tape.
 *
 *  ─── ce qu'il ne fait pas ─────────────────────────────────────────────────
 *
 *  Il ne publie QUE ce qui est deja en ligne dans l'application, c'est-a-dire
 *  ce que le lecteur gratuit peut deja lire. Le stock — la vraie valeur de
 *  l'abonnement — n'entre jamais ici. C'est le reglage `source: fiches`, et
 *  il vaut mieux ne pas y toucher.
 *
 *  ─── le rythme ───────────────────────────────────────────────────────────
 *
 *  Une par jour, apres un premier lot. Le premier lot compte : un site neuf
 *  avec trois pages n'apprend rien a Google sur ce dont il parle. Quarante
 *  pages, oui. Ensuite une par jour, ce qui donne un signal de fraicheur
 *  regulier pendant des mois.
 *
 *  Le calendrier est ECRIT une fois pour toutes dans blog/etat.json : une
 *  fiche a une date de parution, et elle ne bouge plus. Sans quoi l'ordre
 *  changerait a chaque passage et les adresses avec.
 *
 *  ─── usage ───────────────────────────────────────────────────────────────
 *
 *      node tools/blog.mjs            fabrique ce qui est du
 *      node tools/blog.mjs --etat     dit ce qu'il ferait, sans rien ecrire
 *      node tools/blog.mjs --tout     ignore le calendrier, publie tout
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';

const RACINE  = process.cwd();
const LECTURE = process.argv.includes('--etat');
const TOUT    = process.argv.includes('--tout');
const AUJ     = new Date().toISOString().slice(0, 10);

/* ════════════════════ les reglages ════════════════════ */

function fichierReglage(nom) {
  const mien = path.join(RACINE, 'consignes', nom + '.txt');
  const exemple = path.join(RACINE, 'consignes', nom + '.exemple.txt');
  return fs.existsSync(mien) ? mien : (fs.existsSync(exemple) ? exemple : null);
}
function lireReglages(nom) {
  const f = fichierReglage(nom);
  const out = {};
  if (!f) return out;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
    if (m && !l.trim().startsWith('#')) out[m[1]] = m[2].trim();
  }
  return out;
}

const B  = lireReglages('blog');
const MQ = lireReglages('marque');
const PA = lireReglages('paiement');

const ACTIF     = /^(oui|yes|true|1)$/i.test(B.actif || 'non');
const NOM       = MQ.nom || 'Curio';
const BASELINE  = MQ.baseline || '';
const SITE      = String(PA.site || '').replace(/\/+$/, '');
const CHEMIN    = (B.chemin || 'histoires').replace(/^\/+|\/+$/g, '');
const SOURCE    = B.source || 'fiches';
const LANGUE    = B.langue || 'fr';
const DEMARRAGE = Math.max(0, parseInt(B.demarrage || '40', 10) || 0);
const RYTHME    = Math.max(1, parseInt(B.rythme || '1', 10) || 1);
const ORDRE     = B.ordre || 'potentiel';
const TITRE     = B.titre || NOM;
const DESC      = B.description || BASELINE || '';
const AUTEUR    = B.auteur || NOM;
const VOISINES  = Math.max(0, parseInt(B.voisines || '3', 10) || 0);
/* LES PHOTOS. Elles partent ETEINTES depuis la 8.20.
   Deux raisons, et la premiere suffit :
   · les images de Wikimedia Commons ne sont pas libres de droits, la plupart
     exigent l'auteur et la licence, et une reclamation d'ayant droit sur un
     site marchand se regle en centaines d'euros ;
   · une page de texte pur, sans photo empruntee, se charge instantanement et
     ne ressemble a aucun agregateur — ce qui, pour un texte original, est
     plutot un avantage.
   « images: oui » les rallume, et seules les fiches CREDITEES en portent. */
const IMAGES = /^(oui|yes|true|1)$/i.test(B.images || 'non');

const SORTIE = path.join(RACINE, CHEMIN);

/* ════════════════════ les univers ════════════════════ */
/* Les huit du produit, plus ceux que consignes/univers.txt ajoute. Les noms
   sont ceux de parts/20-data.js : deux listes qui se contredisent, c'est un
   defaut qui finit toujours par se voir. */
const UNIVERS = {
  cosmos:   { nom: 'Cosmos',                hue: 196 },
  vivant:   { nom: 'Le Vivant',             hue: 148 },
  histoire: { nom: 'Histoire oubliée',      hue: 28  },
  esprit:   { nom: 'Corps & Esprit',        hue: 320 },
  sciences: { nom: 'Sciences & Inventions', hue: 262 },
  mysteres: { nom: 'Mystères',              hue: 8   },
  terre:    { nom: 'Terre & Océans',        hue: 178 },
  arts:     { nom: 'Arts & Civilisations',  hue: 44  },
  recits:   { nom: 'Histoires vraies',      hue: 96  }
};
(function universEnPlus() {
  const f = path.join(RACINE, 'consignes', 'univers.txt');
  if (!fs.existsSync(f)) return;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (/^\s*#/.test(l) || !l.includes('|')) continue;
    const p = l.split('|').map(s => s.trim());
    if (p[0] && p[2]) UNIVERS[p[0]] = { nom: p[2], hue: parseInt(p[1], 10) || 200 };
  }
})();
const nomUnivers = u => (UNIVERS[u] && UNIVERS[u].nom) || u;
const teinte     = u => (UNIVERS[u] && UNIVERS[u].hue) || 200;

/* ════════════════════ outils de texte ════════════════════ */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* Copie MOT POUR MOT de md() dans parts/30-app.js. Deux mises en forme qui
   different, c'est le meme texte qui ne se lit pas pareil selon l'endroit. */
function md(s) {
  return esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«"'—-])\*([^*\n]+)\*(?=$|[\s.,;:!?)»"'—-])/g, '$1<em>$2</em>');
}

/* L'adresse d'une fiche. Elle ne doit JAMAIS changer une fois publiee : une
   adresse qui bouge, c'est un lien mort et un referencement perdu. Elle est
   donc calculee sur le titre du sujet — l'identite stable — et gardee dans
   blog/etat.json. */
function slug(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'"«»]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'anecdote';
}

/* Coupe a un mot entier, pas au milieu. Une description tronquee en plein
   mot fait amateur dans les resultats de recherche. */
function court(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const c = t.slice(0, n);
  return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:—-]$/, '') + '…';
}

const jourFr = (d) => {
  const [a, m, j] = String(d).split('-');
  const mois = ['janvier','février','mars','avril','mai','juin','juillet',
                'août','septembre','octobre','novembre','décembre'];
  return `${parseInt(j, 10)} ${mois[parseInt(m, 10) - 1]} ${a}`;
};

/* ════════════════════ les fiches ════════════════════ */

function lireFiches() {
  const dossier = path.join(RACINE, SOURCE);
  const repli   = path.join(RACINE, 'anecdotes');
  const dir = fs.existsSync(dossier) ? dossier : repli;
  if (!fs.existsSync(dir)) return [];

  const out = [];
  for (const nom of fs.readdirSync(dir).filter(n => n.endsWith('.json') && n !== 'index.json')) {
    const [lang, uni] = nom.replace(/\.json$/, '').split(/-(.+)/);
    if (lang !== LANGUE) continue;
    let j = null;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, nom), 'utf8')); } catch (e) { continue; }
    const items = (j && j.items) || {};
    for (const [sujet, f] of Object.entries(items)) {
      if (!f || !f.t || !f.x) continue;
      /* Si l'on a du se replier sur anecdotes/, on refait le tri nous-memes :
         le blog ne publie jamais le stock. */
      if (dir === repli) {
        if (f.v === 'retire' || f.v === 'quarantaine') continue;
        if (f.p === null) continue;
        if (f.p !== undefined && String(f.p) > AUJ) continue;
      }
      out.push({ sujet, uni, ...f });
    }
  }
  return out;
}

/* ════════════════════ le calendrier ════════════════════ */
/* Il est ecrit une fois et ne se rejoue pas. Une fiche deja parue garde sa
   date ; une fiche nouvelle prend la premiere place libre. */

function calendrier(fiches) {
  const f = path.join(SORTIE, 'etat.json');
  let etat = { parutions: {}, adresses: {} };
  if (fs.existsSync(f)) {
    try { etat = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  }
  etat.parutions = etat.parutions || {};
  etat.adresses  = etat.adresses  || {};

  /* Une adresse deja attribuee ne change plus, meme si le titre change.
     Les identifiants d'univers sont reserves : « cosmos » est deja le dossier
     de la page d'univers, une fiche ne peut pas s'appeler comme lui sans
     ecraser l'autre. Deux jours a chercher pourquoi une page d'univers a
     disparu, et on ne saurait meme pas ou regarder. */
  const prises = new Set([...Object.values(etat.adresses), ...Object.keys(UNIVERS),
                          'etat.json', 'rss.xml', 'index.html']);
  for (const fi of fiches) {
    if (!etat.adresses[fi.sujet]) {
      let s = slug(fi.sujet), n = 2;
      while (prises.has(s)) s = slug(fi.sujet) + '-' + (n++);
      etat.adresses[fi.sujet] = s; prises.add(s);
    }
    fi.slug = etat.adresses[fi.sujet];
  }

  const aPlacer = fiches.filter(fi => !etat.parutions[fi.sujet]);
  if (aPlacer.length) {
    if (ORDRE === 'date')        aPlacer.sort((a, b) => String(a.p || '').localeCompare(String(b.p || '')));
    else if (ORDRE === 'hasard') aPlacer.sort(() => Math.random() - 0.5);
    else                         aPlacer.sort((a, b) => (b.s || 0) - (a.s || 0));   // potentiel

    const deja = Object.values(etat.parutions);
    let jour, restantes;

    if (!deja.length) {
      /* Le tout premier passage : le lot de demarrage. Un site neuf avec
         trois pages n'apprend rien a Google sur ce dont il parle. */
      jour = AUJ;
      restantes = Math.max(DEMARRAGE, RYTHME);
    } else {
      /* On reprend apres le dernier jour deja programme — jamais avant,
         sinon deux lots se retrouvent le meme jour. Si tout le calendrier
         est deja passe, on repart d'aujourd'hui. */
      const dernier = deja.sort().slice(-1)[0];
      if (dernier < AUJ) { jour = AUJ; restantes = RYTHME; }
      else {
        jour = dernier;
        restantes = Math.max(0, RYTHME - deja.filter(d => d === dernier).length);
      }
    }

    const lendemain = (d) => new Date(new Date(d + 'T12:00:00Z').getTime() + 864e5)
                             .toISOString().slice(0, 10);

    for (const fi of aPlacer) {
      while (restantes === 0) { jour = lendemain(jour); restantes = RYTHME; }
      etat.parutions[fi.sujet] = jour;
      restantes--;
    }
  }
  for (const fi of fiches) fi.parution = etat.parutions[fi.sujet];
  return etat;
}

/* ════════════════════ le gabarit ════════════════════ */

const POLICES = '<link rel="preconnect" href="https://fonts.googleapis.com" />'
  + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
  + 'family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&family=Archivo:wght@400;500;600;700&display=swap" />';

const CSS = `
:root{
  --ink:#050E24;--ink-2:#0B1B3D;--line:rgba(150,190,255,.15);
  --text:#EAF1FF;--text-2:#9DB4D8;--text-3:#6A82A8;
  --accent:#3FA9FF;--brass:#F0C46A;--r:14px;--hue:200;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--text);
  font:17px/1.75 Archivo,"Helvetica Neue",Arial,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.enveloppe{max-width:44rem;margin:0 auto;padding:0 20px 72px}
header.haut{border-bottom:1px solid var(--line);margin-bottom:34px;
  position:sticky;top:0;background:rgba(5,14,36,.9);backdrop-filter:blur(10px);z-index:5}
header.haut .dedans{max-width:44rem;margin:0 auto;padding:14px 20px;
  display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.marque{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:21px;color:var(--text)}
.marque img{height:26px;width:auto;display:block}
header.haut nav{margin-left:auto;display:flex;gap:16px;font-size:14px}
header.haut nav a{color:var(--text-2)}
h1{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:clamp(28px,5vw,40px);
  line-height:1.18;margin:0 0 14px;letter-spacing:-.01em}
h2{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:24px;margin:44px 0 10px}
.fil{font-size:13px;color:var(--text-3);margin:26px 0 14px}
.fil a{color:var(--text-3)}
.chapo{font-family:Fraunces,Georgia,serif;font-size:19px;line-height:1.6;
  color:var(--text-2);margin:0 0 26px;border-left:2px solid hsl(var(--hue) 80% 60%/.55);padding-left:16px}
.meta{font-size:13px;color:var(--text-3);margin:0 0 26px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pastille{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;
  background:hsl(var(--hue) 80% 60%/.14);color:hsl(var(--hue) 80% 76%);border:1px solid hsl(var(--hue) 80% 60%/.3)}
figure{margin:0 0 30px}
figure img{width:100%;height:auto;border-radius:var(--r);display:block;
  filter:saturate(1.06) contrast(1.04)}
figcaption{font-size:12px;color:var(--text-3);margin-top:8px;line-height:1.5}
article p{margin:0 0 20px}
.source{font-size:14px;color:var(--text-2);border-top:1px solid var(--line);
  padding-top:20px;margin-top:38px}
.appel{margin:40px 0 0;padding:22px;border:1px solid var(--line);border-radius:var(--r);
  background:var(--ink-2)}
.appel h3{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:20px;margin:0 0 8px}
.appel p{margin:0 0 14px;color:var(--text-2);font-size:15px}
.bouton{display:inline-block;padding:11px 20px;border-radius:12px;background:var(--accent);
  color:#04162E;font-weight:600;font-size:15px}
.bouton:hover{text-decoration:none;filter:brightness(1.08)}
.liste{list-style:none;padding:0;margin:0}
.liste li{border-bottom:1px solid var(--line);padding:20px 0}
.liste li:last-child{border-bottom:0}
.liste a{color:var(--text);font-family:Fraunces,Georgia,serif;font-size:20px;
  font-weight:500;line-height:1.3;display:block;margin-bottom:6px}
.liste p{margin:0;color:var(--text-2);font-size:15px;line-height:1.6}
.liste .quand{font-size:12px;color:var(--text-3);margin-top:8px}
.grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin:0;padding:0;list-style:none}
.grille a{display:block;padding:16px;border:1px solid var(--line);border-radius:var(--r);
  background:var(--ink-2);color:var(--text);font-family:Fraunces,Georgia,serif;font-size:17px}
.grille span{display:block;font-family:Archivo,sans-serif;font-size:13px;color:var(--text-3);margin-top:4px}
footer{border-top:1px solid var(--line);margin-top:60px;padding-top:22px;
  font-size:13px;color:var(--text-3)}
footer a{color:var(--text-3)}
@media(max-width:600px){ body{font-size:16px} .enveloppe{padding:0 16px 56px} }
`;

/* Un texte de fiche qui contiendrait « </script> » sortirait du bloc de
   donnees structurees et casserait la page — ou pire. On echappe le chevron
   ouvrant a la source : JSON l'accepte, le navigateur aussi, et plus rien ne
   peut s'echapper. */
function jsonSur(o) {
  return JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g,
    m => m === '\u2028' ? '\\u2028' : '\\u2029');
}

function page(o) {
  const url = SITE ? SITE + o.chemin : o.chemin;
  const marque = MQ.logo && fs.existsSync(path.join(RACINE, MQ.logo))
    ? `<img src="${SITE}/${esc(MQ.logo)}" alt="${esc(NOM)}" />`
    : esc(NOM);
  return `<!doctype html>
<html lang="${LANGUE}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(o.titre)}</title>
<meta name="description" content="${esc(o.desc)}" />
<meta name="theme-color" content="#050E24" />
${SITE ? `<link rel="canonical" href="${esc(url)}" />` : ''}
<meta property="og:type" content="${o.type || 'website'}" />
<meta property="og:title" content="${esc(o.titre)}" />
<meta property="og:description" content="${esc(o.desc)}" />
<meta property="og:site_name" content="${esc(NOM)}" />
${SITE ? `<meta property="og:url" content="${esc(url)}" />` : ''}
${o.image ? `<meta property="og:image" content="${esc(o.image)}" />` : ''}
<meta name="twitter:card" content="${o.image ? 'summary_large_image' : 'summary'}" />
${o.publie ? `<meta property="article:published_time" content="${o.publie}" />` : ''}
${SITE ? `<link rel="alternate" type="application/rss+xml" title="${esc(NOM)}" href="${SITE}/${CHEMIN}/rss.xml" />` : ''}
${POLICES}
<style>${CSS}</style>
${o.jsonld ? `<script type="application/ld+json">${jsonSur(o.jsonld)}</script>` : ''}
</head>
<body${o.hue ? ` style="--hue:${o.hue}"` : ''}>
<header class="haut"><div class="dedans">
  <a class="marque" href="${SITE || ''}/">${marque}</a>
  <nav>
    <a href="${SITE || ''}/${CHEMIN}/">Les histoires</a>
    <a href="${SITE || ''}/app.html">L’application</a>
  </nav>
</div></header>
<div class="enveloppe">
${o.corps}
<footer>
  <p>${esc(NOM)}${BASELINE ? ' — ' + esc(BASELINE) : ''}.
     Textes originaux écrits à partir de <a href="https://fr.wikipedia.org" rel="nofollow">Wikipédia</a>.
     <a href="${SITE || ''}/${CHEMIN}/rss.xml">Flux RSS</a></p>
</footer>
</div>
</body>
</html>`;
}

/* ════════════════════ la page d'une fiche ════════════════════ */

function pageFiche(f, voisines) {
  const paras = String(f.x).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const uni   = nomUnivers(f.uni);
  const titre = `${f.sujet} — ${f.t} | ${NOM}`;
  const desc  = court(f.r || paras[0] || '', 155);

  /* Le credit d'image. Les images de Wikimedia Commons ne sont pas libres de
     droits : la plupart exigent l'auteur et la licence. Tant que
     tools/credits.mjs n'a pas tourne, on n'affiche pas l'image plutot que de
     l'afficher sans credit. C'est prudent, et c'est reparable en une action. */
  const credite = IMAGES && f.i && (f.ic || f.il);
  const figure = credite ? `
<figure>
  <img src="${esc(f.i)}" alt="${esc(f.sujet)}" loading="lazy" />
  <figcaption>${esc(f.ic || 'auteur inconnu')}${f.il ? ' — ' + esc(f.il) : ''}${
    f.ip ? ` — <a href="${esc(f.ip)}" rel="nofollow noopener">Wikimedia Commons</a>` : ''}</figcaption>
</figure>` : '';

  const corps = `
<p class="fil"><a href="${SITE || ''}/${CHEMIN}/">Les histoires</a> ›
   <a href="${SITE || ''}/${CHEMIN}/${f.uni}/">${esc(uni)}</a></p>
<h1>${esc(f.t)}</h1>
<p class="meta"><span class="pastille">${esc(uni)}</span>
   <span>${jourFr(f.parution)}</span></p>
${f.r ? `<p class="chapo">${md(f.r)}</p>` : ''}
${figure}
<article>
${paras.map(p => `<p>${md(p)}</p>`).join('\n')}
</article>
<p class="source">Sujet : <b>${esc(f.sujet)}</b>.
   Écrit à partir de l’article <a href="${esc(f.u || '#')}" rel="nofollow noopener">${esc(f.sujet)}</a>
   de Wikipédia, sous licence CC BY-SA.</p>
${voisines.length ? `
<h2>À lire ensuite</h2>
<ul class="liste">
${voisines.map(v => `  <li><a href="${SITE || ''}/${CHEMIN}/${v.slug}/">${esc(v.t)}</a>
    <p>${esc(court(v.r || '', 130))}</p></li>`).join('\n')}
</ul>` : ''}
<div class="appel">
  <h3>Une anecdote par jour, sur votre téléphone</h3>
  <p>${esc(NOM)} est une application de lecture : cinq anecdotes offertes chaque matin,
     tout le catalogue pour les abonnés. Rien à installer, rien à créer.</p>
  <a class="bouton" href="${SITE || ''}/app.html">Ouvrir ${esc(NOM)}</a>
</div>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: f.t,
    alternativeHeadline: f.sujet,
    description: desc,
    datePublished: f.parution,
    dateModified: f.parution,
    inLanguage: LANGUE,
    articleSection: uni,
    author:    { '@type': 'Organization', name: AUTEUR },
    publisher: { '@type': 'Organization', name: NOM },
    ...(credite ? { image: f.i } : {}),
    ...(SITE ? { mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/${CHEMIN}/${f.slug}/` } } : {}),
    isBasedOn: f.u || undefined
  };

  /* Le fil d'Ariane, en donnees structurees. C'est lui qui remplace
     l'adresse brute par « Les histoires › Cosmos › … » dans les resultats de
     Google : trois lignes, et le lien a l'air d'un vrai article de site. */
  const fil = SITE ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: TITRE, item: `${SITE}/${CHEMIN}/` },
      { '@type': 'ListItem', position: 2, name: uni,   item: `${SITE}/${CHEMIN}/${f.uni}/` },
      { '@type': 'ListItem', position: 3, name: f.t }
    ]
  } : null;

  return page({ chemin: `/${CHEMIN}/${f.slug}/`, titre, desc, corps,
                jsonld: fil ? [jsonld, fil] : jsonld,
                publie: f.parution,
                type: 'article', image: credite ? f.i : null, hue: teinte(f.uni) });
}

/* ════════════════════ les pages de liste ════════════════════ */

function pageAccueil(parues) {
  const recentes = parues.slice(0, 30);
  const unis = [...new Set(parues.map(f => f.uni))];
  const corps = `
<h1>${esc(TITRE)}</h1>
${DESC ? `<p class="chapo">${esc(DESC)}</p>` : ''}
<h2>Les univers</h2>
<ul class="grille">
${unis.map(u => `  <li><a href="${SITE || ''}/${CHEMIN}/${u}/">${esc(nomUnivers(u))}
    <span>${parues.filter(f => f.uni === u).length} histoire(s)</span></a></li>`).join('\n')}
</ul>
<h2>Les dernières</h2>
<ul class="liste">
${recentes.map(f => `  <li><a href="${SITE || ''}/${CHEMIN}/${f.slug}/">${esc(f.t)}</a>
    <p>${esc(court(f.r || '', 165))}</p>
    <p class="quand">${esc(nomUnivers(f.uni))} — ${jourFr(f.parution)}</p></li>`).join('\n')}
</ul>`;
  return page({ chemin: `/${CHEMIN}/`, titre: `${TITRE} | ${NOM}`,
                desc: court(DESC || `Des anecdotes vraies et étonnantes, une par jour.`, 155), corps });
}

function pageUnivers(u, fiches) {
  const corps = `
<p class="fil"><a href="${SITE || ''}/${CHEMIN}/">Les histoires</a></p>
<h1>${esc(nomUnivers(u))}</h1>
<p class="chapo">${fiches.length} histoire(s) vraies, écrites à partir de Wikipédia.</p>
<ul class="liste">
${fiches.map(f => `  <li><a href="${SITE || ''}/${CHEMIN}/${f.slug}/">${esc(f.t)}</a>
    <p>${esc(court(f.r || '', 165))}</p>
    <p class="quand">${jourFr(f.parution)}</p></li>`).join('\n')}
</ul>`;
  return page({ chemin: `/${CHEMIN}/${u}/`,
                titre: `${nomUnivers(u)} — ${fiches.length} histoires vraies | ${NOM}`,
                desc: court(`${fiches.length} anecdotes vraies et étonnantes sur ${nomUnivers(u)}, `
                          + `écrites à partir de Wikipédia.`, 155),
                corps, hue: teinte(u) });
}

/* ════════════════════ sitemap, RSS, robots ════════════════════ */

function sitemap(parues, unis) {
  const url = (c, d, prio) =>
    `  <url><loc>${SITE}${c}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}` +
    `<priority>${prio}</priority></url>`;
  const dernier = parues.length ? parues[0].parution : AUJ;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${url('/', dernier, '1.0')}
${url(`/${CHEMIN}/`, dernier, '0.9')}
${unis.map(u => url(`/${CHEMIN}/${u}/`, dernier, '0.7')).join('\n')}
${parues.map(f => url(`/${CHEMIN}/${f.slug}/`, f.parution, '0.6')).join('\n')}
</urlset>
`;
}

function rss(parues) {
  const items = parues.slice(0, 50).map(f => `  <item>
    <title>${esc(f.t)}</title>
    <link>${SITE}/${CHEMIN}/${f.slug}/</link>
    <guid isPermaLink="true">${SITE}/${CHEMIN}/${f.slug}/</guid>
    <pubDate>${new Date(f.parution + 'T08:00:00Z').toUTCString()}</pubDate>
    <category>${esc(nomUnivers(f.uni))}</category>
    <description>${esc(court(f.r || '', 400))}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(TITRE)}</title>
  <link>${SITE}/${CHEMIN}/</link>
  <description>${esc(DESC || 'Des anecdotes vraies et étonnantes.')}</description>
  <language>${LANGUE}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel></rss>
`;
}

function robots() {
  return `# ${NOM}
User-agent: *
Allow: /
Disallow: /console.html
Disallow: /catalogue.html
Disallow: /anecdotes/
Disallow: /consignes/
Disallow: /tools/
Disallow: /parts/
Disallow: /worker/
Disallow: /api/
${SITE ? `\nSitemap: ${SITE}/sitemap.xml` : ''}
`;
}

/* ════════════════════ execution ════════════════════ */

function ecrire(rel, contenu) {
  if (LECTURE) return;
  const f = path.join(RACINE, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, contenu);
}

const fiches = lireFiches();
if (!ACTIF) {
  console.log('BLOG — éteint (« actif: non » dans consignes/blog.txt). Rien fait.');
  console.log(`  ${fiches.length} fiche(s) en ligne attendent, le jour où vous l'allumerez.`);
  process.exit(0);
}
if (!fiches.length) {
  console.log('BLOG — aucune fiche en ligne à publier.');
  console.log(`  Vérifiez que ${SOURCE}/ existe : c'est tools/servir.mjs qui le fabrique.`);
  process.exit(0);
}
if (!SITE) {
  console.log('! « site: » n\'est pas réglé dans consignes/paiement.txt.');
  console.log('  Les pages seront fabriquées, mais SANS adresse canonique ni sitemap —');
  console.log('  c\'est-à-dire sans la moitié de ce qui sert au référencement.');
}

const etat = calendrier(fiches);

const parues = fiches
  .filter(f => TOUT || f.parution <= AUJ)
  .sort((a, b) => b.parution.localeCompare(a.parution) || (b.s || 0) - (a.s || 0));
const aVenir = fiches.length - parues.length;

/* Les voisines : meme univers, les mieux notees, jamais elle-meme. */
function voisinesDe(f) {
  return parues.filter(v => v.uni === f.uni && v.slug !== f.slug)
               .sort((a, b) => (b.s || 0) - (a.s || 0))
               .slice(0, VOISINES);
}

for (const f of parues) ecrire(`${CHEMIN}/${f.slug}/index.html`, pageFiche(f, voisinesDe(f)));

const unis = [...new Set(parues.map(f => f.uni))].sort();
for (const u of unis) {
  ecrire(`${CHEMIN}/${u}/index.html`,
         pageUnivers(u, parues.filter(f => f.uni === u)));
}
ecrire(`${CHEMIN}/index.html`, pageAccueil(parues));
if (SITE) {
  ecrire(`${CHEMIN}/rss.xml`, rss(parues));
  ecrire('sitemap.xml', sitemap(parues, unis));
}
ecrire('robots.txt', robots());
ecrire(`${CHEMIN}/etat.json`, JSON.stringify(etat, null, 1));

/* ── L'ADRESSE DE LA PAGE, RENDUE A LA FICHE ─────────────────────────────
   Quand un lecteur partage une anecdote depuis l'application, il envoyait
   jusqu'ici l'adresse de l'application elle-meme. Celui qui recoit le lien
   tombe donc sur le flux du jour, et pas sur ce dont on lui a parle.

   On ecrit donc dans chaque fiche servie l'adresse de SA page de blog. Le
   partage devient un lien vers une page publique, lisible sans rien
   installer, indexee, et qui porte un bouton « ouvrir l'application ». C'est
   la seule boucle de bouche-a-oreille du produit — elle etait cassee.

   L'adresse vient de histoires/etat.json, pas d'un calcul refait ici : deux
   facons de fabriquer une meme adresse finissent toujours par diverger. */
if (!LECTURE) {
  const parLaquelle = new Map(parues.map(f => [f.sujet, f.slug]));
  /* On l'ecrit dans les DEUX dossiers, et ce n'est pas une redondance :

     · anecdotes/ est la verite. Sans elle, servir.mjs — qui tourne AVANT le
       blog au passage suivant — refabriquerait fiches/ sans l'adresse, et
       le partage retomberait sur l'application. Le defaut n'aurait ete
       visible qu'au lendemain.
     · fiches/ pour que ce soit vrai des maintenant, sans attendre un jour. */
  let touches = 0;
  for (const dossier of [path.join(RACINE, 'anecdotes'), path.join(RACINE, SOURCE)]) {
    if (!fs.existsSync(dossier)) continue;
    for (const nom of fs.readdirSync(dossier).filter(n => n.endsWith('.json') && n !== 'index.json')) {
      const chemin = path.join(dossier, nom);
      let j = null;
      try { j = JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch (e) { continue; }
      let change = false;
      for (const [sujet, f] of Object.entries((j && j.items) || {})) {
        const s = parLaquelle.get(sujet);
        if (s && f.b !== s) { f.b = s; change = true; touches++; }
      }
      if (change) fs.writeFileSync(chemin, JSON.stringify(j));
    }
  }
  if (touches) console.log(`  ${touches} fiche(s) portent maintenant l'adresse de leur page.`);
}

console.log(LECTURE ? 'BLOG — lecture seule, rien n\'a été écrit' : 'BLOG — pages fabriquées');
console.log(`  ${parues.length} page(s) en ligne, ${aVenir} programmée(s).`);
console.log(`  ${unis.length} page(s) d'univers, un sitemap, un flux RSS.`);
if (aVenir) {
  const prochaine = fiches.filter(f => f.parution > AUJ)
                          .sort((a, b) => a.parution.localeCompare(b.parution))[0];
  const derniere  = fiches.map(f => f.parution).sort().slice(-1)[0];
  console.log(`  Prochaine : « ${prochaine.t} », le ${prochaine.parution}.`);
  console.log(`  Le calendrier va jusqu'au ${derniere}.`);
}
if (!IMAGES) {
  console.log('  Pages sans photo (« images: non »). C\'est le réglage prudent :');
  console.log('  les images de Wikimedia ne sont pas libres de droits.');
} else {
  const sansCredit = parues.filter(f => f.i && !(f.ic || f.il)).length;
  if (sansCredit) {
    console.log(`  ! ${sansCredit} fiche(s) ont une image SANS crédit : elle n'est pas affichée.`);
    console.log(`    Lancez « Entretien → credits » pour aller chercher auteur et licence.`);
  }
}
