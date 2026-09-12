#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — SERVIR
 *
 *  Il prepare les fichiers que le SITE PUBLIC a le droit de servir.
 *
 *  ─── pourquoi cet outil existe ────────────────────────────────────────────
 *
 *  Jusqu'a la 8.16, `anecdotes/fr-cosmos.json` contenait TOUTES les fiches
 *  ecrites de l'univers — 268 — alors que 21 seulement etaient en ligne. Le
 *  tri se faisait dans le navigateur, dans filtrerPubliees(). C'etait un
 *  filtre d'affichage, pas une serrure : n'importe qui pouvait ouvrir
 *  l'adresse du fichier et lire le stock entier, texte compris.
 *
 *  Sur un produit qu'on vend, c'est le probleme numero un : l'abonnement
 *  donne acces a un corpus deja public.
 *
 *  ─── ce qu'il fait ────────────────────────────────────────────────────────
 *
 *      anecdotes/          la VERITE. Toutes les fiches, stock compris.
 *                          Elle ne bouge pas : tous les outils la lisent et
 *                          l'ecrivent comme avant.
 *
 *      fiches/             ce que le site sert. Uniquement les fiches EN
 *                          LIGNE, sans les champs internes.
 *
 *  L'application lit `fiches/`. La vue Curation (?curation=1), elle, lit
 *  `anecdotes/` — c'est l'atelier, il doit tout montrer. Sur Cloudflare, on
 *  ferme `/anecdotes/*` avec une regle Access : la Curation reste ouverte
 *  pour vous, et fermee pour le reste du monde.
 *
 *  ─── la regle de tri ──────────────────────────────────────────────────────
 *
 *  Exactement celle de filtrerPubliees(), a la lettre, pour qu'on ne puisse
 *  jamais avoir deux definitions de « en ligne » :
 *
 *      v === 'retire' ou 'quarantaine'   -> jamais
 *      p absent (fiche d'avant la v8)    -> en ligne
 *      p === null                        -> au stock
 *      p <= aujourd'hui                  -> en ligne
 *      p  >  aujourd'hui                 -> programmee, pas encore
 *
 *  ─── usage ────────────────────────────────────────────────────────────────
 *
 *      node tools/servir.mjs             prepare fiches/
 *      node tools/servir.mjs --etat      dit ce qu'il ferait, sans ecrire
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';

const RACINE  = process.cwd();
const SOURCE  = path.join(RACINE, 'anecdotes');
const PUBLIC  = path.join(RACINE, 'fiches');
const LECTURE = process.argv.includes('--etat');

/* Les champs qui sortent. Tout le reste reste au depot.
   `v` (votre jugement) et `d` (date d'ecriture) ne regardent que vous. */
const CHAMPS = ['t', 'x', 'r', 's', 'i', 'u', 'q', 'p', 'ic', 'il', 'ip', 'b'];

const auj = new Date().toISOString().slice(0, 10);

function enLigne(f) {
  if (!f || typeof f !== 'object') return false;
  if (f.v === 'retire' || f.v === 'quarantaine') return false;
  if (f.p === undefined) return true;
  if (f.p === null) return false;
  return String(f.p) <= auj;
}

function lireJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.log(`  ! ${path.basename(p)} illisible (${e.message}) — ignore`); return null; }
}

if (!fs.existsSync(SOURCE)) {
  console.log('anecdotes/ est absent : rien a servir.');
  process.exit(0);
}

const fichiers = fs.readdirSync(SOURCE)
  .filter(n => n.endsWith('.json') && n !== 'index.json')
  .sort();

if (!fichiers.length) {
  console.log('anecdotes/ ne contient aucune fiche.');
  process.exit(0);
}

if (!LECTURE) fs.mkdirSync(PUBLIC, { recursive: true });

let totalEcrites = 0, totalServies = 0, octets = 0, octetsAvant = 0;
const lignes = [];

for (const nom of fichiers) {
  const src = lireJson(path.join(SOURCE, nom));
  if (!src) continue;

  /* Les fichiers sont ranges sous { items: { titre: fiche } }. Lire l'objet
     a plat compterait une fiche nommee « items » — c'est un defaut deja
     paye une fois, on ne le refait pas. */
  const items = (src && src.items && typeof src.items === 'object') ? src.items : {};
  const sortie = {};
  let n = 0;

  for (const [titre, fiche] of Object.entries(items)) {
    if (!enLigne(fiche)) continue;
    const propre = {};
    for (const c of CHAMPS) if (fiche[c] !== undefined && fiche[c] !== null) propre[c] = fiche[c];
    sortie[titre] = propre;
    n++;
  }

  const texte = JSON.stringify({ generated: new Date().toISOString(), items: sortie });
  const avant = fs.statSync(path.join(SOURCE, nom)).size;

  totalEcrites += Object.keys(items).length;
  totalServies += n;
  octets       += Buffer.byteLength(texte);
  octetsAvant  += avant;

  lignes.push(`  ${nom.padEnd(18)} ${String(n).padStart(4)} en ligne / ${String(Object.keys(items).length).padStart(4)} ecrites`);
  if (!LECTURE) fs.writeFileSync(path.join(PUBLIC, nom), texte);
}

/* Le sommaire des compteurs suit les fiches : meme dossier, meme verite. */
const idx = path.join(SOURCE, 'index.json');
if (fs.existsSync(idx)) {
  if (!LECTURE) fs.copyFileSync(idx, path.join(PUBLIC, 'index.json'));
  lignes.push('  index.json         recopie');
}

/* Un fichier temoin, pour qu'on sache d'ou vient ce dossier et qu'on ne le
   modifie jamais a la main. */
if (!LECTURE) {
  fs.writeFileSync(path.join(PUBLIC, 'LISEZ-MOI.txt'),
`Ce dossier est FABRIQUE par tools/servir.mjs. Ne le modifiez pas a la main :
il est reecrit a chaque publication.

Il ne contient que les fiches EN LIGNE. Le stock complet vit dans anecdotes/,
qui ne doit pas etre servi publiquement (regle Cloudflare Access sur
/anecdotes/*).

Derniere fabrication : ${new Date().toISOString()}
`);
}

console.log(LECTURE ? 'SERVIR — lecture seule, rien n\'a ete ecrit' : 'SERVIR — fiches/ prepare');
console.log(lignes.join('\n'));
console.log(`  ─────`);
console.log(`  ${totalServies} fiche(s) en ligne servies sur ${totalEcrites} ecrites.`);
console.log(`  ${(octetsAvant / 1024).toFixed(0)} ko de stock -> ${(octets / 1024).toFixed(0)} ko servis.`);
if (totalServies === 0) {
  console.log('  ! Aucune fiche en ligne : le site n\'aura rien a montrer.');
  console.log('    Verifiez le champ p des fiches (5 · Publication).');
}
