#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — REETALER LES DATES DE PUBLICATION
 *
 *  ─── le probleme, tel qu'il se voit ───────────────────────────────────────
 *
 *  anecdotes/index.json annonce  weekly.fr = 269  et  total.fr = 269.
 *  Autrement dit : « 269 nouveautes cette semaine » sur un catalogue de 269.
 *
 *  Le calcul n'est pas faux. write-anecdotes.mjs compte les fiches dont la
 *  date de publication a moins de sept jours, et c'est exactement ce qu'il
 *  faut. Ce sont LES DONNEES qui mentent : une remise en ligne massive — un
 *  « tout depublier » suivi d'un « publier », une reprise en main, une
 *  migration — a pose la MEME date sur tout le catalogue.
 *
 *  La 8.16.1 a mis un garde-fou dans l'application : quand la « semaine »
 *  represente la moitie du catalogue, elle n'affiche rien plutot qu'un
 *  chiffre qui ne veut rien dire. C'est un pansement honnete. Cet outil-ci
 *  soigne la cause.
 *
 *  ─── ce qu'il fait ────────────────────────────────────────────────────────
 *
 *  Il reecrit le champ `p` des fiches DEJA EN LIGNE, en les repartissant en
 *  arriere depuis aujourd'hui, au rythme de consignes/publication.txt.
 *
 *  Rien ne sort et rien ne rentre : les memes fiches restent en ligne, dans
 *  le meme ordre. Seule leur date de mise en ligne devient vraisemblable.
 *
 *  Les deux langues d'un meme sujet recoivent la MEME date : une fiche
 *  francaise et sa jumelle anglaise ne sont pas deux nouveautes.
 *
 *  ─── ce qu'il ne touche pas ───────────────────────────────────────────────
 *
 *  Le stock (`p: null`), les fiches programmees (`p` futur), les retirees et
 *  les quarantaines. Ni aucun autre champ.
 *
 *  ─── usage ────────────────────────────────────────────────────────────────
 *
 *      node tools/reetaler.mjs                    dit ce qu'il ferait
 *      node tools/reetaler.mjs --confirmer REETALER   le fait
 *      node tools/reetaler.mjs --par 7 --confirmer REETALER
 *
 *  Sans le mot exact, il ne modifie rien. C'est une operation qui touche a
 *  vos donnees : elle se demande deux fois.
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const RACINE = process.cwd();
const SOURCE = path.join(RACINE, 'anecdotes');
const AUJ    = new Date().toISOString().slice(0, 10);

const arg = (nom) => {
  const i = process.argv.indexOf('--' + nom);
  return i > 0 ? process.argv[i + 1] : null;
};
const CONFIRME = arg('confirmer') === 'REETALER';

/* Le rythme : le votre s'il existe, l'exemple sinon — comme partout. */
async function reglages() {
  for (const f of ['consignes/publication.txt', 'consignes/publication.exemple.txt']) {
    try {
      const t = await fs.readFile(path.join(RACINE, f), 'utf8');
      const lire = (k) => {
        const m = t.match(new RegExp('^\\s*' + k + '\\s*:\\s*(.*)$', 'm'));
        return m ? m[1].trim() : '';
      };
      return { rythme: lire('rythme') || 'quotidien',
               jours:  lire('jours')  || '1',
               par:    parseInt(lire('parPassage') || lire('par-passage') || '3', 10) || 3,
               fichier: f };
    } catch (e) {}
  }
  return { rythme: 'quotidien', jours: '1', par: 3, fichier: '(défaut)' };
}

const R   = await reglages();
const PAR = Math.max(1, parseInt(arg('par') || R.par, 10) || R.par);

/* Les jours de passage. « hebdomadaire » + « jours: 1 » = le lundi.
   1 = lundi … 7 = dimanche, comme dans publication.txt. */
const JOURS = new Set(String(R.jours).split(/[,;\s]+/).map(n => parseInt(n, 10)).filter(Boolean));
function estUnPassage(d) {
  if (/hebdo|semaine/i.test(R.rythme) || /jours/i.test(R.rythme)) {
    if (!JOURS.size) return true;
    const j = d.getUTCDay() === 0 ? 7 : d.getUTCDay();   // 1 = lundi
    return JOURS.has(j);
  }
  return true;                                            // quotidien
}

const fichiers = (await fs.readdir(SOURCE).catch(() => []))
  .filter(n => n.endsWith('.json') && n !== 'index.json').sort();
if (!fichiers.length) { console.log('anecdotes/ est vide.'); process.exit(0); }

const contenu = new Map();
const sujets  = new Map();          // "uni|titre" -> [ {fic, titre, fiche} ]

for (const nom of fichiers) {
  const [, uni] = nom.replace(/\.json$/, '').split(/-(.+)/);
  let j = null;
  try { j = JSON.parse(await fs.readFile(path.join(SOURCE, nom), 'utf8')); }
  catch (e) { console.log(`  ! ${nom} illisible — ignoré`); continue; }
  contenu.set(nom, j);
  for (const [titre, f] of Object.entries((j && j.items) || {})) {
    if (!f) continue;
    if (f.v === 'retire' || f.v === 'quarantaine') continue;
    if (f.p === undefined || f.p === null) continue;      // vieille fiche, ou stock
    if (String(f.p) > AUJ) continue;                      // programmée : on la laisse
    const cle = uni + '|' + titre;
    if (!sujets.has(cle)) sujets.set(cle, []);
    sujets.get(cle).push({ fic: nom, titre, fiche: f });
  }
}

const cles = [...sujets.keys()].sort((a, b) => {
  const pa = sujets.get(a)[0].fiche.p, pb = sujets.get(b)[0].fiche.p;
  return String(pa).localeCompare(String(pb)) || a.localeCompare(b);
});

if (!cles.length) { console.log('Aucune fiche en ligne à réétaler.'); process.exit(0); }

/* On remonte le temps : les derniers de la liste sortent aujourd'hui, les
   premiers il y a longtemps. */
const jours = [];
{
  const d = new Date(AUJ + 'T12:00:00Z');
  const besoin = Math.ceil(cles.length / PAR);
  let garde = 0;
  while (jours.length < besoin && garde++ < 4000) {
    if (estUnPassage(d)) jours.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
}

const nouvelles = new Map();
for (let i = 0; i < cles.length; i++) {
  const passage = Math.floor((cles.length - 1 - i) / PAR);
  nouvelles.set(cles[i], jours[passage] || jours[jours.length - 1]);
}

let change = 0;
for (const [cle, date] of nouvelles) {
  for (const ou of sujets.get(cle)) if (String(ou.fiche.p) !== date) change++;
}

console.log('RÉÉTALER LES DATES DE PUBLICATION');
console.log(`  rythme lu dans ${R.fichier} : ${R.rythme}, ${PAR} par passage`
          + (JOURS.size ? `, jours ${[...JOURS].join(',')}` : ''));
console.log(`  ${cles.length} sujet(s) en ligne, répartis sur ${jours.length} passage(s).`);
console.log(`  du ${jours[jours.length - 1]} au ${jours[0]}.`);
console.log(`  ${change} fiche(s) verraient leur date changer.`);

if (!CONFIRME) {
  console.log('');
  console.log('  Rien n’a été écrit. Pour le faire :');
  console.log('    Actions → Entretien → reetaler, en écrivant REETALER dans « confirmer ».');
  process.exit(0);
}

for (const [cle, date] of nouvelles) {
  for (const ou of sujets.get(cle)) ou.fiche.p = date;
}
for (const [nom, j] of contenu) {
  const dest = path.join(SOURCE, nom);
  const temp = dest + '.tmp';
  await fs.writeFile(temp, JSON.stringify(j));
  await fs.rename(temp, dest);
}
console.log('');
console.log(`  ${change} date(s) réécrite(s). Relancez « recompter » : index.json dira enfin vrai.`);
