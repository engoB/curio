#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — LES CREDITS D'IMAGES
 *
 *  ─── le probleme ──────────────────────────────────────────────────────────
 *
 *  Vos fiches stockent l'image comme une simple adresse :
 *
 *      "i": "https://upload.wikimedia.org/wikipedia/commons/d/d3/Wow_signal.jpg"
 *
 *  Elles ne stockent NI L'AUTEUR, NI LA LICENCE.
 *
 *  Or les images de Wikimedia Commons ne sont pas libres de droits. Elles
 *  sont sous licence — CC BY, CC BY-SA, parfois domaine public — et la
 *  plupart EXIGENT la mention de l'auteur et de la licence.
 *
 *  Tant que l'image n'apparaissait que dans une application qu'on ne vendait
 *  pas, le risque etait theorique. A partir du moment ou vous vendez, ou vous
 *  publiez un blog indexe et ou vous postez sur Instagram, il devient reel —
 *  et une reclamation d'ayant droit sur une photo se regle en centaines
 *  d'euros.
 *
 *  ─── ce que fait cet outil ────────────────────────────────────────────────
 *
 *  Il demande a Wikimedia, pour chaque image, son champ `extmetadata`, et
 *  ecrit trois champs de plus dans la fiche :
 *
 *      ic   le credit : l'auteur, en texte nu
 *      il   la licence, en abrege (CC BY-SA 4.0, Domaine public…)
 *      ip   l'adresse de la page de description sur Commons
 *
 *  Il ne touche a RIEN d'autre. Les fiches sans image sont ignorees, celles
 *  qui ont deja leur credit aussi (sauf --refaire).
 *
 *  Le blog n'affiche une image QUE si elle a son credit : tant que cet outil
 *  n'a pas tourne, les pages sortent sans photo. C'est prudent, et ca se
 *  repare en une action.
 *
 *  ─── usage ────────────────────────────────────────────────────────────────
 *
 *      node tools/credits.mjs              completer ce qui manque
 *      node tools/credits.mjs --refaire    tout redemander
 *      node tools/credits.mjs --etat       compter, sans rien demander
 *      node tools/credits.mjs --max 200    s'arreter apres 200 images
 *
 *  ─── AVERTISSEMENT ───────────────────────────────────────────────────────
 *
 *  Je n'ai PAS pu essayer cet outil : Wikipedia est injoignable depuis mon
 *  bac a sable. Il est ecrit sur la documentation de l'API. Lancez-le d'abord
 *  avec --max 10 et regardez le resultat dans une fiche avant de le lacher
 *  sur les 1 152.
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const RACINE  = process.cwd();
const SOURCE  = path.join(RACINE, 'anecdotes');
const REFAIRE = process.argv.includes('--refaire');
const LECTURE = process.argv.includes('--etat');
const MAX     = (() => {
  const i = process.argv.indexOf('--max');
  return i > 0 ? (parseInt(process.argv[i + 1], 10) || Infinity) : Infinity;
})();

const CONTACT = process.env.CURIO_CONTACT || 'https://github.com/curio';
const UA = `CurioBot/1.0 (${CONTACT}) node-fetch`;

/* Le nom du fichier, tel que Commons le connait, extrait de l'adresse.
   Les vignettes ont une forme differente des originaux :
     .../commons/d/d3/Wow_signal.jpg
     .../commons/thumb/d/d3/Wow_signal.jpg/330px-Wow_signal.jpg      */
function nomDeFichier(url) {
  try {
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname);
    const m = p.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//)
           || p.match(/\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}

function texteNu(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 160);
}

/* Une seule requete pour cinquante fichiers : l'API l'accepte, et cela evite
   de marteler Wikimedia pendant une heure. */
async function demander(fichiers) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json'
            + '&prop=imageinfo&iiprop=extmetadata&origin=*'
            + '&titles=' + fichiers.map(f => encodeURIComponent('File:' + f)).join('|');
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('Commons a répondu ' + r.status);
  const j = await r.json();
  const pages = (j && j.query && j.query.pages) || {};
  const out = new Map();
  for (const p of Object.values(pages)) {
    const ii = p.imageinfo && p.imageinfo[0];
    const m  = ii && ii.extmetadata;
    if (!m) continue;
    const nom = String(p.title || '').replace(/^File:/, '');
    out.set(nom, {
      ic: texteNu(m.Artist && m.Artist.value) || 'Wikimedia Commons',
      il: texteNu((m.LicenseShortName && m.LicenseShortName.value)
               || (m.License && m.License.value)) || '',
      ip: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title || '')
    });
  }
  return out;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

const fichiers = (await fs.readdir(SOURCE).catch(() => []))
  .filter(n => n.endsWith('.json') && n !== 'index.json').sort();

if (!fichiers.length) {
  console.log('anecdotes/ est vide : rien à créditer.');
  process.exit(0);
}

/* On rassemble d'abord TOUTES les images a traiter, tous fichiers confondus :
   une meme photo sert souvent deux fiches, et on ne la demande qu'une fois. */
const contenu = new Map();
const aFaire  = new Map();          // nom de fichier Commons -> [ {fic, titre} ]
let avecImage = 0, dejaCredit = 0, sansNom = 0;

for (const nom of fichiers) {
  let j = null;
  try { j = JSON.parse(await fs.readFile(path.join(SOURCE, nom), 'utf8')); }
  catch (e) { console.log(`  ! ${nom} illisible — ignoré`); continue; }
  contenu.set(nom, j);
  for (const [titre, f] of Object.entries((j && j.items) || {})) {
    if (!f || !f.i) continue;
    avecImage++;
    if (f.ic && !REFAIRE) { dejaCredit++; continue; }
    const cle = nomDeFichier(f.i);
    if (!cle) { sansNom++; continue; }
    if (!aFaire.has(cle)) aFaire.set(cle, []);
    aFaire.get(cle).push({ fic: nom, titre });
  }
}

console.log('CRÉDITS D’IMAGES');
console.log(`  ${avecImage} fiche(s) avec une image, dont ${dejaCredit} déjà créditée(s).`);
console.log(`  ${aFaire.size} image(s) distincte(s) à demander à Wikimedia Commons.`);
if (sansNom) console.log(`  ${sansNom} adresse(s) d'image non reconnue(s) — laissées telles quelles.`);

if (LECTURE || !aFaire.size) process.exit(0);

const cles = [...aFaire.keys()].slice(0, MAX === Infinity ? undefined : MAX);
let obtenus = 0, echecs = 0;

for (let i = 0; i < cles.length; i += 50) {
  const lot = cles.slice(i, i + 50);
  try {
    const rep = await demander(lot);
    for (const [nom, cred] of rep) {
      for (const ou of (aFaire.get(nom) || [])) {
        const f = contenu.get(ou.fic).items[ou.titre];
        f.ic = cred.ic; f.il = cred.il; f.ip = cred.ip;
      }
      obtenus++;
    }
  } catch (e) {
    echecs += lot.length;
    console.log(`  ! lot ${i / 50 + 1} : ${e.message}`);
  }
  process.stdout.write(`\r  ${Math.min(i + 50, cles.length)}/${cles.length}…`);
  await dormir(400);           // on ne martèle pas Wikimedia
}
process.stdout.write('\r');

/* Ecriture atomique : un fichier de fiches a moitie ecrit, c'est un mois de
   budget perdu. On ecrit a cote, puis on renomme. */
for (const [nom, j] of contenu) {
  const dest = path.join(SOURCE, nom);
  const temp = dest + '.tmp';
  await fs.writeFile(temp, JSON.stringify(j));
  await fs.rename(temp, dest);
}

console.log(`  ${obtenus} image(s) créditée(s), ${echecs} en échec.`);
console.log('  Les fiches sont enregistrées. Relancez « Entretien → servir » puis le blog.');
