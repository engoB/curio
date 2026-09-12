#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — LES ICONES DE L'APPLICATION INSTALLEE
 *
 *  ─── le probleme ──────────────────────────────────────────────────────────
 *
 *  Le logo de l'en-tete se change en deposant un fichier : build.sh va
 *  chercher tout seul icones/logo.svg (ou .png) depuis la 8.20.
 *
 *  Mais l'icone de l'application INSTALLEE est autre chose. C'est ce carre
 *  qui reste sur l'ecran d'accueil du telephone, et il vit dans quatre
 *  fichiers de tailles precises :
 *
 *      icones/curio-180.png            l'ecran d'accueil iOS
 *      icones/curio-192.png            Android, et l'onglet
 *      icones/curio-512.png            le grand format
 *      icones/curio-512-maskable.png   Android qui recadre en rond
 *
 *  Les fabriquer a la main demandait un logiciel de dessin. Cet outil les
 *  fabrique a partir de votre logo, aux bons noms et aux bonnes tailles.
 *
 *  ─── ce qu'il fait ────────────────────────────────────────────────────────
 *
 *  Il prend icones/logo.svg (ou .png / .webp / .jpg), le pose au centre d'un
 *  carre couleur d'encre, et ecrit les quatre fichiers.
 *
 *  La version « maskable » recoit une marge plus large : Android rogne les
 *  bords en cercle, et un logo qui touche le bord se retrouve coupe. C'est le
 *  defaut le plus courant des icones d'applications installees.
 *
 *  ─── il ecrase vos icones actuelles ──────────────────────────────────────
 *
 *  C'est pour ca qu'il ne tourne JAMAIS tout seul : uniquement quand vous
 *  choisissez « Entretien -> icones ». Les anciennes sont recopiees dans
 *  icones/avant-logo/ avant d'etre remplacees — si le resultat ne vous plait
 *  pas, vous les remettez a la main.
 *
 *  ─── usage ────────────────────────────────────────────────────────────────
 *
 *      node tools/icones.mjs                fabrique les quatre
 *      node tools/icones.mjs --etat         dit ce qu'il ferait
 *      node tools/icones.mjs --fond '#101820'   une autre couleur de fond
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';

const RACINE  = process.cwd();
const DOSSIER = path.join(RACINE, 'icones');
const LECTURE = process.argv.includes('--etat');

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };

/* Le fond par defaut est celui de l'application : #050E24. Une icone sur fond
   transparent devient noire sur iOS et blanche sur Android — on ne laisse
   jamais le hasard decider de ce qui est sur l'ecran d'accueil. */
const FOND = arg('fond') || '#050E24';
function couleur(hex) {
  const m = String(hex).replace('#', '');
  return { r: parseInt(m.slice(0, 2), 16) || 0,
           g: parseInt(m.slice(2, 4), 16) || 0,
           b: parseInt(m.slice(4, 6), 16) || 0, alpha: 1 };
}

const CANDIDATS = ['logo.svg', 'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg'];
const source = CANDIDATS.map(n => path.join(DOSSIER, n)).find(f => fs.existsSync(f));

if (!source) {
  console.log('Aucun logo trouvé.');
  console.log('');
  console.log('  Déposez votre image dans icones/ par Add file → Upload files,');
  console.log('  nommée exactement  logo.svg  (ou logo.png).');
  console.log('  Puis relancez « Entretien → icones ».');
  process.exit(0);
}

console.log('LES ICÔNES DE L’APPLICATION');
console.log(`  logo trouvé : ${path.relative(RACINE, source)}`);
console.log(`  fond : ${FOND}`);

/* Les quatre formats. « marge » est la part du carre laissee vide autour du
   logo : 12 % pour les icones normales, 26 % pour la maskable, qu'Android
   rogne en cercle. */
const FORMATS = [
  { nom: 'curio-180.png',           taille: 180, marge: 0.12 },
  { nom: 'curio-192.png',           taille: 192, marge: 0.12 },
  { nom: 'curio-512.png',           taille: 512, marge: 0.12 },
  { nom: 'curio-512-maskable.png',  taille: 512, marge: 0.26 }
];

if (LECTURE) {
  console.log('  (lecture seule) fabriquerait :');
  FORMATS.forEach(f => console.log(`    ${f.nom.padEnd(24)} ${f.taille}×${f.taille}, marge ${Math.round(f.marge*100)} %`));
  process.exit(0);
}

let sharp;
try { sharp = (await import('sharp')).default; }
catch (e) {
  console.log('');
  console.log('✗ La bibliothèque d’images « sharp » n’est pas installée.');
  console.log('  Dans l’action, l’étape « npm i --no-save sharp » doit précéder celle-ci.');
  console.log('  Rien n’a été touché.');
  process.exit(1);
}

/* On garde les anciennes. Un logo qu'on regrette, ca arrive ; un logo qu'on
   ne peut plus reprendre, non. */
const SAUVEGARDE = path.join(DOSSIER, 'avant-logo');
let sauvees = 0;
for (const f of FORMATS) {
  const a = path.join(DOSSIER, f.nom);
  if (fs.existsSync(a)) {
    fs.mkdirSync(SAUVEGARDE, { recursive: true });
    fs.copyFileSync(a, path.join(SAUVEGARDE, f.nom));
    sauvees++;
  }
}
if (sauvees) console.log(`  ${sauvees} ancienne(s) icône(s) recopiée(s) dans icones/avant-logo/`);

const brut = fs.readFileSync(source);
for (const f of FORMATS) {
  const dedans = Math.round(f.taille * (1 - f.marge * 2));
  /* Le logo est redimensionne DANS son carre — jamais recadre. « contain »
     garde ses proportions ; un logo ecrase est un logo abime. */
  const logo = await sharp(brut, { density: 384 })
    .resize(dedans, dedans, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({ create: { width: f.taille, height: f.taille, channels: 4, background: couleur(FOND) } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(DOSSIER, f.nom));

  console.log(`  ✓ ${f.nom.padEnd(24)} ${f.taille}×${f.taille}`);
}

console.log('');
console.log('  Fait. Les gens qui ont DÉJÀ installé l’application garderont');
console.log('  l’ancienne icône jusqu’à ce qu’ils la réinstallent — c’est le');
console.log('  système d’exploitation qui décide, pas nous.');
