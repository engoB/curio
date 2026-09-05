#!/usr/bin/env node
/**
 * Curio — la publication étalée
 * ===========================================================================
 * Le stock est écrit d'avance ; il ne sort qu'au compte-gouttes. C'est ce qui
 * donne au lecteur la sensation d'une application qui vit, alors que tout est
 * déjà dans le dépôt et qu'aucun appel payant n'est fait.
 *
 *   node tools/publier.mjs                    lit consignes/publication.txt
 *   node tools/publier.mjs --combien 12       publie douze sujets, maintenant
 *   node tools/publier.mjs --etat             ne publie rien, dit où on en est
 *   node tools/publier.mjs --retirer "Titre"  retire une fiche, définitivement
 *   node tools/publier.mjs --rendre "Titre"   annule un retrait
 *   node tools/publier.mjs --refaire "Titre"  le sujet est bon, le texte non :
 *                                             on efface et on réécrira
 *
 * UN SUJET, PAS UNE FICHE. Publier « Lac Nyos » met en ligne le français ET
 * l'anglais le même jour : le lecteur anglophone et le francophone voient la
 * même nouveauté. Seules les fiches contrôlées conformes sont éligibles.
 *
 * Le rythme se règle dans consignes/publication.txt, un fichier que vous
 * modifiez sur GitHub en dix secondes. L'action programmée le relit à chaque
 * passage : changer de cadence ne demande aucune modification de code.
 * ===========================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i+1]; return (v && !v.startsWith('--')) ? v : true; };

const OUTDIR   = path.join(process.cwd(), 'anecdotes');
const MAITRE   = path.join(process.cwd(), 'catalogue-maitre.json');
const REGLAGE  = path.join(process.cwd(), 'consignes', 'publication.txt');
const EXCLUS   = path.join(process.cwd(), 'consignes', 'exclusions.txt');

const ETAT     = !!opt('etat', false);
const RETIRER  = opt('retirer', null);
const RENDRE   = opt('rendre', null);
const REFAIRE  = opt('refaire', null);
const VALIDER  = !!opt('valider', false);   // appliquer consignes/validations.json
const VALIDS   = path.join(process.cwd(), 'consignes', 'validations.json');
const FORCE    = opt('combien', null);
/* ── PUBLIER TOUT CE QUI VAUT UNE CERTAINE NOTE ───────────────────────────
   « --note-mini 9 » met en ligne, d'un seul coup, toute la réserve notée 9
   ou plus. C'est la façon de constituer un fonds : on ouvre d'emblée ce
   qu'on a de meilleur, et on garde le reste pour l'alimenter semaine après
   semaine. Sans seuil, on reste au rythme du fichier de réglage. */
const NOTE_MINI = parseInt(opt('note-mini', '0'), 10) || 0;

const lire = async (p, d) => { try{ return JSON.parse(await fs.readFile(p, 'utf8')); }catch{ return d; } };
async function ecrire(p, obj){
  const t = p + '.tmp';
  await fs.writeFile(t, JSON.stringify(obj, null, 1), 'utf8');
  await fs.rename(t, p);
}
const jour = (d = new Date()) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------- le réglage à vous */
async function reglage(){
  const par = { parPassage: 3, ordre: 'potentiel', quarantaine: false,
                rythme: 'quotidien', jours: [], jusquAu: '', langues: ['fr', 'en'] };
  let brut = '';
  try{ brut = await fs.readFile(REGLAGE, 'utf8'); }catch{ return par; }
  for (const l of brut.split(/\r?\n/)){
    const s = l.trim();
    if (!s || s.startsWith('#')) continue;
    const m = s.match(/^([\w-]+)\s*[:=]\s*(.+)$/);
    if (!m) continue;
    const cle = m[1].toLowerCase(), val = m[2].trim();
    if (cle === 'parpassage' || cle === 'par-passage' || cle === 'nombre') par.parPassage = Math.max(0, parseInt(val, 10) || 0);
    if (cle === 'ordre') par.ordre = val.toLowerCase();
    if (cle === 'quarantaine') par.quarantaine = /^(oui|yes|true|1)$/i.test(val);
    /* Le rythme. L'action tourne tous les jours ; c'est ce réglage qui dit
       si aujourd'hui est un jour de publication. Le régler ici plutôt que
       dans le « cron » du workflow permet de le changer depuis la console,
       sans toucher à un fichier de code. */
    if (cle === 'rythme') par.rythme = val.toLowerCase();
    if (cle === 'jours')
      par.jours = val.split(/[,\s]+/).map(x => parseInt(x, 10)).filter(n => n >= 1 && n <= 7);
    if (cle === 'jusqu-au' || cle === 'jusquau' || cle === 'jusqu_au')
      par.jusquAu = /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : '';
    if (cle === 'langues')
      par.langues = val.split(/[,\s+]+/).map(x => x.trim().toLowerCase())
                       .filter(x => x === 'fr' || x === 'en');
  }
  if (!par.langues.length) par.langues = ['fr', 'en'];
  return par;
}

/* Lundi = 1 … dimanche = 7, comme dans le fichier de réglage. */
function jourSemaine(d){ return d.getUTCDay() === 0 ? 7 : d.getUTCDay(); }

function estJourDePublication(par, d = new Date()){
  const r = par.rythme;
  if (r === 'pause' || r === 'jamais' || r === 'non') return false;
  if (r === 'hebdomadaire' || r === 'hebdo')
    return jourSemaine(d) === (par.jours[0] || 1);
  if (r === 'jours' || r === 'choisis')
    return par.jours.length ? par.jours.includes(jourSemaine(d)) : true;
  return true;                                  // quotidien
}

/* Combien de passages de publication entre aujourd'hui et la date visée,
   celui d'aujourd'hui compris. Sert à étaler une réserve jusqu'à une date
   sans avoir à calculer soi-même le nombre par passage. */
function passagesJusqua(par, fin, d = new Date()){
  const stop = new Date(fin + 'T00:00:00Z');
  if (isNaN(stop) || stop < d) return 0;
  let n = 0;
  const cur = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  while (cur <= stop && n < 4000){
    if (estJourDePublication(par, cur)) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

/* ------------------------------------------------- lecture de toutes les fiches */
async function charger(){
  const fichiers = (await fs.readdir(OUTDIR).catch(() => []))
    .filter(f => f.endsWith('.json') && f !== 'index.json');
  const paquets = new Map();     // chemin -> { j, modifie }
  const fiches = [];             // { chemin, lang, uni, titre, rec }
  for (const f of fichiers){
    const [lang, uni] = f.replace(/\.json$/, '').split(/-(.+)/);
    const chemin = path.join(OUTDIR, f);
    const j = await lire(chemin, { items:{} });
    paquets.set(chemin, { j, modifie:false });
    for (const [titre, rec] of Object.entries(j.items || {}))
      fiches.push({ chemin, lang, uni, titre, rec });
  }
  return { paquets, fiches };
}

async function sauver(paquets){
  for (const [chemin, p] of paquets) if (p.modifie) await ecrire(chemin, p.j);
}

/* Un sujet regroupe ses deux langues. La clé est l'identifiant du catalogue
   maître quand on l'a, le titre sinon — c'est ce qui garantit qu'on publie
   « Lac Nyos » et « Lake Nyos » le même jour. */
function grouper(fiches, maitre){
  const parTitre = new Map();
  for (const s of (maitre?.sujets || [])){
    if (s.fr) parTitre.set(s.fr, s);
    if (s.en) parTitre.set(s.en, s);
  }
  const sujets = new Map();
  for (const f of fiches){
    const s = f.rec.q ? (maitre?.sujets || []).find(x => x.qid === f.rec.q) : parTitre.get(f.titre);
    const cle = (s && s.qid) || (f.uni + '|' + f.titre);
    if (!sujets.has(cle)) sujets.set(cle, { cle, sujet:s || null, uni:f.uni, fiches:[] });
    sujets.get(cle).fiches.push(f);
  }
  return [...sujets.values()];
}

/* ═══════════ appliquer la relecture faite dans la console ═══════════════
   consignes/validations.json dit, pour chaque fiche, ce que vous en avez
   décidé en la lisant :

       "fr|Lac Nyos": "valide"    → elle part en ligne aujourd'hui
       "fr|Machin":   "refaire"   → le texte est effacé, le sujet à réécrire
       "fr|Truc":     "retire"    → il sort, et n'est jamais reproposé

   Les fiches non mentionnées ne bougent pas : la relecture est incrémentale,
   vous pouvez en faire trente aujourd'hui et trente demain.               */
async function appliquerValidations(){
  let v = {};
  try{ v = JSON.parse(await fs.readFile(VALIDS, 'utf8')) || {}; }
  catch{ console.log('Aucune relecture à appliquer (consignes/validations.json absent).'); return; }
  const cles = Object.keys(v);
  if (!cles.length){ console.log('consignes/validations.json est vide.'); return; }

  const { paquets, fiches } = await charger();
  const maitre = await lire(MAITRE, null);
  const parCle = new Map(fiches.map(f => [f.lang + '|' + f.titre, f]));
  const aujourdhui = jour();

  let valides = 0, refaites = 0, retirees = 0, inconnues = 0, bloquees = 0;
  const aRetirer = [];

  /* On regroupe par sujet : valider le français d'un sujet publie aussi
     l'anglais. Un lecteur anglophone et un francophone voient la même
     nouveauté le même jour. */
  const groupes = grouper(fiches, maitre);
  const groupeDe = new Map();
  groupes.forEach(g => g.fiches.forEach(f => groupeDe.set(f.lang + '|' + f.titre, g)));

  const traites = new Set();
  for (const cle of cles){
    const f = parCle.get(cle);
    if (!f){ inconnues++; continue; }
    const g = groupeDe.get(cle);
    const lot = g ? g.fiches : [f];
    const decision = v[cle];
    const idg = g ? g.cle : cle;
    if (traites.has(idg + '|' + decision)) continue;
    traites.add(idg + '|' + decision);

    if (decision === 'valide'){
      /* ── VALIDER N'EST PAS PUBLIER ──────────────────────────────────────
         Valider mettait la fiche EN LIGNE le jour même. Relire mille fiches
         revenait donc à tout publier d'un coup : plus de réserve, plus de
         rythme, et aucun moyen de dire « celle-ci est bonne, je la sors plus
         tard ».

         Valider veut dire : je l'ai lue, elle est bonne, elle rejoint la
         RÉSERVE. C'est « 5 · Publier » qui décide ensuite quand elle sort, au
         rythme de consignes/publication.txt — ou d'un coup, par l'opération
         « publier » si vous le demandez. */
      let n = 0, mur = false;
      for (const x of lot){
        /* Une fiche recalée par le contrôle ne rejoint pas la réserve, même
           validée à la lecture : la structure prime sur le goût. */
        if (x.rec.v === 'retire' || x.rec.v === 'quarantaine'){ mur = true; continue; }
        if (x.rec.p && x.rec.p <= aujourdhui) continue;   // déjà en ligne
        if (x.rec.v === 'ok') continue;                   // déjà dans la réserve
        x.rec.v = 'ok';
        paquets.get(x.chemin).modifie = true; n++;
      }
      if (!n && mur){
        bloquees++;
        console.log(`  ! ${lot[0].rec.t || lot[0].titre} — validée, mais en quarantaine : écartée.`);
      }
      if (n){
        valides++;
        console.log(`  ✓ ${lot.map(x => x.lang.toUpperCase()).join('+')}  ${lot[0].rec.t || lot[0].titre}`);
      }
    } else if (decision === 'refaire'){
      for (const x of lot){ delete paquets.get(x.chemin).j.items[x.titre]; paquets.get(x.chemin).modifie = true; }
      if (g && g.sujet){ g.sujet.statut = 'a-ecrire'; g.sujet.ecrit = null; g.sujet.publie = null; }
      refaites++;
      console.log(`  ↺ ${lot[0].rec.t || lot[0].titre} — à réécrire`);
    } else if (decision === 'retire'){
      for (const x of lot){ x.rec.v = 'retire'; x.rec.p = null; paquets.get(x.chemin).modifie = true; aRetirer.push(x.titre); }
      if (g && g.sujet){ g.sujet.statut = 'retire'; g.sujet.publie = null; }
      retirees++;
      console.log(`  ✗ ${lot[0].rec.t || lot[0].titre} — retiré`);
    }
  }

  await sauver(paquets);
  if (maitre) await ecrire(MAITRE, maitre);

  if (aRetirer.length){
    let brut = '';
    try{ brut = await fs.readFile(EXCLUS, 'utf8'); }
    catch{ brut = '# Sujets retirés à la main. Un titre par ligne.\n'; }
    const lignes = new Set(brut.split(/\r?\n/));
    aRetirer.forEach(t => lignes.add(t));
    await fs.mkdir(path.dirname(EXCLUS), { recursive:true });
    await fs.writeFile(EXCLUS, [...lignes].join('\n').replace(/\n{3,}/g, '\n\n') + '\n', 'utf8');
  }

  /* La relecture appliquée n'a plus lieu d'être : on la vide, pour que la
     console reparte d'une page blanche et que rien ne soit rejoué. */
  await fs.writeFile(VALIDS, '{}\n', 'utf8');

  console.log(`\n╔══ RELECTURE APPLIQUÉE ════════════════════════════════════`);
  console.log(`║  ${valides} sujet(s) validé(s) — ils rejoignent la RÉSERVE.`);
  console.log(`║  Ils sortiront au rythme de consignes/publication.txt, ou tout de suite`);
  console.log(`║  avec l’opération « publier ».`);
  console.log(`║  ${refaites} remis à écrire`);
  console.log(`║  ${retirees} retiré(s) définitivement`);
  if (bloquees) console.log(`║  ${bloquees} validée(s) mais retenue(s) par le contrôle — voir controle.csv`);
  if (inconnues) console.log(`║  ${inconnues} entrée(s) sans fiche correspondante (ignorées)`);
  console.log(`╚═══════════════════════════════════════════════════════════`);
}

/* ------------------------------------------------------------- refaire ---
   Le sujet est bon, c'est le TEXTE qui ne va pas. On supprime les fiches et
   on remet le sujet à « à écrire » : la prochaine tranche le réécrira, avec
   la consigne telle qu'elle est ce jour-là. Rien n'est exclu, rien n'est
   perdu d'autre que le texte raté. */
async function refaire(titre){
  const { paquets, fiches } = await charger();
  const maitre = await lire(MAITRE, null);
  const cible = String(titre).trim().toLowerCase();

  const noms = new Set([cible]);
  for (const s of (maitre?.sujets || [])){
    const f = String(s.fr || '').toLowerCase(), e = String(s.en || '').toLowerCase();
    if (f === cible || e === cible){ if (f) noms.add(f); if (e) noms.add(e); }
  }
  for (const f of fiches){
    if (String(f.rec.t || '').toLowerCase() !== cible) continue;
    const s = (maitre?.sujets || []).find(x => x.qid === f.rec.q);
    if (s){ if (s.fr) noms.add(s.fr.toLowerCase()); if (s.en) noms.add(s.en.toLowerCase()); }
    noms.add(f.titre.toLowerCase());
  }

  const touchees = fiches.filter(f => noms.has(f.titre.toLowerCase())
                                   || String(f.rec.t || '').toLowerCase() === cible);
  if (!touchees.length){
    console.log(`Aucune fiche ne porte le titre « ${titre} ».`);
    console.log('Le titre attendu est celui de l’article Wikipédia, ou l’accroche de la fiche.');
    return;
  }
  for (const f of touchees){
    const p = paquets.get(f.chemin);
    delete p.j.items[f.titre];
    p.modifie = true;
    console.log(`  ↺ [${f.lang}/${f.uni}] ${f.titre} — texte supprimé, à réécrire`);
  }
  await sauver(paquets);

  if (maitre){
    for (const s of maitre.sujets){
      if (touchees.some(f => f.titre === s.fr || f.titre === s.en)){
        s.statut = 'a-ecrire'; s.ecrit = null; s.publie = null;
      }
    }
    await ecrire(MAITRE, maitre);
  }
  console.log(`\n${touchees.length} fiche(s) supprimée(s). Le sujet repasse « à écrire ».`);
  console.log('La prochaine tranche de « 2 · Écrire » le reprendra en priorité.');
}

/* --------------------------------------------------------------- retirer */
async function retirer(titre, rendre){
  const { paquets, fiches } = await charger();
  const maitre0 = await lire(MAITRE, null);
  const cible = String(titre).trim().toLowerCase();

  /* Un sujet, pas une fiche : retirer « Lac Nyos » retire aussi « Lake Nyos ».
     Les deux titres du sujet sont demandés au catalogue maître ; sans lui, on
     s'en tient au titre donné. */
  const noms = new Set([cible]);
  for (const s of (maitre0?.sujets || [])){
    const f = String(s.fr || '').toLowerCase(), e = String(s.en || '').toLowerCase();
    if (f === cible || e === cible){ if (f) noms.add(f); if (e) noms.add(e); }
  }
  const parAccroche = fiches.filter(f => String(f.rec.t || '').toLowerCase() === cible);
  for (const f of parAccroche){
    const s = (maitre0?.sujets || []).find(x => x.qid === f.rec.q);
    if (s){ if (s.fr) noms.add(s.fr.toLowerCase()); if (s.en) noms.add(s.en.toLowerCase()); }
    noms.add(f.titre.toLowerCase());
  }

  const touchees = fiches.filter(f => noms.has(f.titre.toLowerCase())
                                   || String(f.rec.t || '').toLowerCase() === cible);
  if (!touchees.length){
    console.log(`Aucune fiche ne porte le titre « ${titre} ».`);
    console.log('Le titre attendu est celui de l’article Wikipédia, ou l’accroche de la fiche.');
    return;
  }
  for (const f of touchees){
    const p = paquets.get(f.chemin);
    if (rendre){ f.rec.v = ''; f.rec.p = null; }
    else { f.rec.v = 'retire'; f.rec.p = null; }
    p.modifie = true;
    console.log(`  ${rendre ? '↩' : '✗'} [${f.lang}/${f.uni}] ${f.titre}`);
  }
  await sauver(paquets);

  // le catalogue maître doit le savoir, sinon la moisson le remettrait
  const maitre = maitre0;
  if (maitre){
    for (const s of maitre.sujets){
      if (touchees.some(f => f.titre === s.fr || f.titre === s.en)){
        s.statut = rendre ? 'ecrit' : 'retire';
        s.publie = rendre ? s.publie : null;
      }
    }
    await ecrire(MAITRE, maitre);
  }

  // et la liste d'exclusion, pour que ça ne revienne jamais
  if (!rendre){
    let brut = '';
    try{ brut = await fs.readFile(EXCLUS, 'utf8'); }catch{
      brut = '# Sujets retirés à la main. Un titre par ligne.\n'
           + '# La moisson ne les reproposera jamais, et la publication les ignore.\n';
    }
    const lignes = new Set(brut.split(/\r?\n/));
    for (const f of touchees) lignes.add(f.titre);
    await fs.mkdir(path.dirname(EXCLUS), { recursive:true });
    await fs.writeFile(EXCLUS, [...lignes].join('\n').replace(/\n{3,}/g, '\n\n') + '\n', 'utf8');
  }

  console.log(`\n${touchees.length} fiche(s) ${rendre ? 'rendue(s) au stock' : 'retirée(s)'}.`);
  if (!rendre) console.log('Le titre est inscrit dans consignes/exclusions.txt : il ne reviendra pas.');
  console.log('Lancez « recompter » pour rafraîchir les chiffres du site.');
}

/* ------------------------------------------------------------------ état */
function bilan(groupes){
  const b = { publies:0, prets:0, quarantaine:0, retires:0, nonControles:0 };
  for (const g of groupes){
    const f0 = g.fiches[0];
    if (g.fiches.some(f => f.rec.v === 'retire')) { b.retires++; continue; }
    if (g.fiches.some(f => f.rec.v === 'quarantaine')) { b.quarantaine++; continue; }
    const publie = g.fiches.every(f => f.rec.p && f.rec.p <= jour());
    if (publie) { b.publies++; continue; }
    if (g.fiches.every(f => f.rec.v === 'ok')) b.prets++;
    else b.nonControles++;
    void f0;
  }
  return b;
}

async function main(){
  if (VALIDER) return appliquerValidations();
  if (REFAIRE && REFAIRE !== true) return refaire(REFAIRE);
  if (RETIRER && RETIRER !== true) return retirer(RETIRER, false);
  if (RENDRE  && RENDRE  !== true) return retirer(RENDRE, true);

  const par = await reglage();
  const maitre = await lire(MAITRE, null);
  const { paquets, fiches } = await charger();
  if (!fiches.length){
    console.log('Aucune fiche dans anecdotes/. Lancez « 2 · Écrire » puis « 3 · Contrôler ».');
    return;
  }
  let groupes = grouper(fiches, maitre);

  /* Les langues que l'on publie. Écrire l'anglais et ne pas le publier est un
     état parfaitement valable : les fiches restent au dépôt, elles sortiront
     le jour où vous ajouterez « en » à cette ligne. */
  if (par.langues.length < 2){
    for (const g of groupes) g.fiches = g.fiches.filter(f => par.langues.includes(f.lang));
    groupes = groupes.filter(g => g.fiches.length);
  }

  const b = bilan(groupes);

  console.log(`\n╔══ LE STOCK ═══════════════════════════════════════════════`);
  console.log(`║  ${b.publies} sujet(s) EN LIGNE`);
  console.log(`║  ${b.prets} prêt(s) à publier`);
  console.log(`║  ${b.nonControles} écrit(s) mais pas encore contrôlé(s)`);
  console.log(`║  ${b.quarantaine} en quarantaine`);
  console.log(`║  ${b.retires} retiré(s)`);
  console.log(`╠══ réglages ───────────────────────────────────────────────`);
  console.log(`║  rythme : ${par.rythme}${par.jours.length ? ' (' + par.jours.join(',') + ')' : ''}`
            + `  ·  ${par.parPassage} par passage  ·  ordre : ${par.ordre}`);
  console.log(`║  langue(s) publiée(s) : ${par.langues.join(' + ')}`
            + (par.jusquAu ? `  ·  étalement jusqu'au ${par.jusquAu}` : ''));
  console.log(`╚═══════════════════════════════════════════════════════════`);

  if (b.prets){
    const parJour = FORCE ? (parseInt(FORCE, 10) || 0) : par.parPassage;
    if (parJour > 0){
      const jours = Math.floor(b.prets / parJour);
      console.log(`\nAu rythme de ${parJour} par passage, la réserve tient ${jours} passage(s).`);
    }
  }

  if (ETAT) return;

  /* ── LE RYTHME ────────────────────────────────────────────────────────
     L'action tourne tous les jours ; c'est ici qu'on décide si aujourd'hui
     compte. Une publication lancée à la main (« publier » + un nombre) passe
     outre : c'est vous qui décidez, pas le calendrier. */
  if (!FORCE && !NOTE_MINI && !estJourDePublication(par)){
    console.log(`\nRythme « ${par.rythme}${par.jours.length ? ' ' + par.jours.join(',') : ''} » : `
              + `aujourd'hui n'est pas un jour de publication. Rien n'est publié.`);
    return;
  }

  let combien = FORCE ? (parseInt(FORCE, 10) || 0) : par.parPassage;

  /* « Tout sortir d'ici le 31 décembre » : on compte les passages restants
     et on répartit. Le nombre par passage se recalcule à chaque exécution,
     donc il s'ajuste tout seul si vous écrivez de nouvelles fiches. */
  if (!FORCE && !NOTE_MINI && par.jusquAu){
    const passages = passagesJusqua(par, par.jusquAu);
    if (passages > 0){
      combien = Math.max(1, Math.ceil(b.prets / passages));
      console.log(`\nÉtalement demandé jusqu'au ${par.jusquAu} : ${passages} passage(s) restant(s), `
                + `${b.prets} sujet(s) prêts → ${combien} par passage.`);
    } else {
      console.log(`\nLa date « jusqu-au: ${par.jusquAu} » est passée : on publie tout ce qui est prêt.`);
      combien = b.prets;
    }
  }

  if (combien <= 0 && !NOTE_MINI){
    console.log('\nRythme réglé à zéro dans consignes/publication.txt : rien n’est publié.');
    return;
  }

  /* Les candidats : contrôlés conformes, pas encore publiés, pas retirés. */
  let candidats = groupes.filter(g =>
       !g.fiches.some(f => f.rec.v === 'retire' || f.rec.v === 'quarantaine')
    && !g.fiches.every(f => f.rec.p)
    && (par.quarantaine || g.fiches.every(f => f.rec.v === 'ok')));

  if (!candidats.length){
    console.log('\nRien à publier : soit tout est en ligne, soit rien n’a encore été contrôlé.');
    console.log('Lancez « 3 · Contrôler » avec l’option « réparer », puis revenez ici.');
    return;
  }

  const note = (g) => Math.max(...g.fiches.map(f => (f.rec.s == null ? -1 : f.rec.s)));
  const pot  = (g) => (g.sujet && g.sujet.potentiel) || 0;

  /* Le seuil de note : on ne publie que ce qui l'atteint, et on publie TOUT
     ce qui l'atteint. Le nombre par passage ne s'applique plus — c'est une
     ouverture de fonds, pas un passage quotidien. */
  if (NOTE_MINI){
    const avant = candidats.length;
    candidats = candidats.filter(g => note(g) >= NOTE_MINI);
    combien = candidats.length;
    console.log(`\n▸ Ouverture du fonds : note ${NOTE_MINI}/10 minimum.`);
    console.log(`  ${candidats.length} sujet(s) sur ${avant} de la réserve atteignent ce seuil.`);
    if (!candidats.length){
      console.log('  Rien à ce niveau : relisez et validez d’abord, ou baissez le seuil.');
      return;
    }
  }
  if (par.ordre === 'note')      candidats.sort((a, b2) => note(b2) - note(a));
  else if (par.ordre === 'hasard') candidats.sort(() => Math.random() - 0.5);
  else                            candidats.sort((a, b2) => pot(b2) - pot(a) || note(b2) - note(a));

  const choisis = candidats.slice(0, combien);
  const aujourdhui = jour();
  console.log(`\n▸ publication du ${aujourdhui} — ${choisis.length} sujet(s)\n`);
  for (const g of choisis){
    /* Une fiche déjà en ligne garde sa date : on ne réécrit pas l'histoire
       parce qu'on vient d'ajouter l'autre langue. */
    const neuves = g.fiches.filter(f => !f.rec.p);
    for (const f of neuves){
      f.rec.p = aujourdhui;
      paquets.get(f.chemin).modifie = true;
    }
    const titres = neuves.map(f => f.lang.toUpperCase()).sort().join('+');
    console.log(`  ● [${titres}] ${g.fiches[0].rec.t || g.fiches[0].titre}`);
    if (g.sujet){ g.sujet.statut = 'publie'; g.sujet.publie = aujourdhui; }
  }
  await sauver(paquets);
  if (maitre) await ecrire(MAITRE, maitre);

  const reste = candidats.length - choisis.length;
  console.log(`\n${choisis.length} sujet(s) publié(s). ${reste} encore en réserve.`);
  console.log('Lancez « recompter » (ou laissez l’action le faire) pour rafraîchir les chiffres.');
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
