#!/usr/bin/env node
/**
 * Curio — le contrôle avant production
 * ===========================================================================
 *   node tools/controler.mjs
 *   node tools/controler.mjs --reparer      (met en quarantaine ce qui échoue)
 *
 * Rien ne doit partir en ligne sans être passé par ici. Le contrôle ne juge
 * pas le goût — c'est votre affaire — il vérifie la STRUCTURE, c'est-à-dire
 * tout ce qu'une machine peut constater sans se tromper :
 *
 *   · le texte fait la longueur promise et compte assez de paragraphes ;
 *   · il ne commence pas par une définition ni par « Saviez-vous que » ;
 *   · il a un titre court, une phrase « à raconter », une note ;
 *   · il est dans la bonne langue ;
 *   · il a une image et une source ;
 *   · aucune accroche n'est employée deux fois ;
 *   · le sujet existe bien dans le catalogue maître.
 *
 * Ce qui échoue est mis en QUARANTAINE (`v: "quarantaine"`) : la fiche reste
 * dans le dépôt, elle n'est simplement jamais publiée. Rien n'est supprimé.
 * Corrigez, relancez, elle repasse en vert toute seule.
 * ===========================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i+1]; return (v && !v.startsWith('--')) ? v : true; };
const REPARER = !!opt('reparer', false);
const MIN_CAR = parseInt(opt('longueur-mini', '1600'), 10) || 1600;
const MIN_PAR = parseInt(opt('paragraphes-mini', '3'), 10) || 3;

const OUTDIR = path.join(process.cwd(), 'anecdotes');
const MAITRE = path.join(process.cwd(), 'catalogue-maitre.json');

const lire = async (p, d) => { try{ return JSON.parse(await fs.readFile(p, 'utf8')); }catch{ return d; } };
async function ecrire(p, obj){
  const t = p + '.tmp';
  await fs.writeFile(t, JSON.stringify(obj, null, 1), 'utf8');
  await fs.rename(t, p);
}

/* Les ouvertures interdites. La consigne de rédaction les proscrit déjà ;
   ici on vérifie qu'elle a été suivie. */
const OUVERTURES = [
  /^saviez[- ]vous/i, /^did you know/i, /^imaginez/i, /^imagine /i,
  /^dans cet article/i, /^cet article/i, /^this article/i,
  /^[\wÀ-ÿ'’\- ]{2,40}\s+(est|était)\s+(un|une|le|la|les)\s/i,
  /^[\w' \-]{2,40}\s+(is|was)\s+(a|an|the)\s/i
];

const MOTS_EN = /\b(the|and|of|which|that|with|was|were|is|are|has|have|from|its|his|her|their|been|after|before|only|world|first|known|about|into|until|while)\b/gi;
const MOTS_FR = /\b(le|la|les|des|une|dans|qui|que|pour|avec|est|sont|été|son|ses|leur|plus|par|sur|aux|elle|ne|pas|sans|dont|entre|jusqu)\b/gi;
function langueDe(t){
  const en = (String(t).match(MOTS_EN) || []).length;
  const fr = (String(t).match(MOTS_FR) || []).length;
  if (en >= fr + 3) return 'en';
  if (fr >= en + 3) return 'fr';
  return '';
}

function controler(rec, lang, titre, vus){
  const pb = [];
  const texte = String(rec.x || '');
  const accroche = String(rec.t || '').trim();

  if (texte.length < MIN_CAR) pb.push(`texte trop court (${texte.length} < ${MIN_CAR})`);
  const paras = texte.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
  if (paras.length < MIN_PAR) pb.push(`${paras.length} paragraphe(s), il en faut ${MIN_PAR}`);

  if (!accroche) pb.push('pas de titre');
  else {
    const mots = accroche.split(/\s+/).length;
    if (mots > 12) pb.push(`titre trop long (${mots} mots)`);
    if (/[:：]/.test(accroche)) pb.push('titre avec deux-points');
    const cle = lang + '|' + accroche.toLowerCase();
    if (vus.has(cle)) pb.push(`titre identique à « ${vus.get(cle)} »`);
    else vus.set(cle, titre);
  }

  const debut = paras[0] || texte.slice(0, 200);
  if (OUVERTURES.some(re => re.test(debut.replace(/^\*+/, '').trim()))) pb.push('ouverture interdite (définition ou formule creuse)');

  /* L'accroche est un paragraphe à elle seule, et l'application l'affiche
     dans un corps beaucoup plus grand. Un premier paragraphe de quatre-vingts
     mots y devient un mur : ce n'est plus une accroche, et la fiche est mal
     faite avant même d'être lue. La consigne dit vingt-cinq mots ; on recale
     au-delà de quarante-cinq, pour laisser de la marge sans laisser passer un
     paragraphe entier. */
  const brutAccroche = debut.replace(/^\*+/, '').trim();
  const motsAccroche = brutAccroche.split(/\s+/).filter(Boolean).length;
  if (paras.length > 1 && motsAccroche > 45)
    pb.push(`accroche de ${motsAccroche} mots (25 attendus, 45 tolérés) : ce n'est plus une accroche`);

  /* Le titre et l'accroche s'affichent l'un au-dessus de l'autre. Quand ils
     disent la même chose, le lecteur lit deux fois la même phrase au moment
     précis où on venait de le capter. */
  if (accroche && brutAccroche){
    const nu = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                       .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const t = nu(accroche), a = nu(brutAccroche);
    if (t && a && (a.startsWith(t) || t.startsWith(a)))
      pb.push('le titre répète l\'accroche du texte');
  }

  if (rec.s == null) pb.push('pas de note');
  else if (rec.s < 0 || rec.s > 10) pb.push(`note hors bornes (${rec.s})`);

  if (!String(rec.r || '').trim()) pb.push('pas de phrase « à raconter »');
  else {
    const m = String(rec.r).split(/\s+/).length;
    if (m < 10 || m > 45) pb.push(`phrase « à raconter » de ${m} mots (10 à 45 attendus)`);
  }

  if (!rec.u) pb.push('pas de lien source');
  if (!rec.i) pb.push('pas d’image');

  const l = langueDe(texte);
  if (l && l !== lang) pb.push(`texte en « ${l} » alors qu’on attend « ${lang} »`);

  /* La consigne demande de trois à cinq gras : ils portent les chiffres et
     les noms, et c'est ce qu'on lit quand on parcourt. Au-delà de six, le
     texte devient un surligneur et plus rien ne ressort. */
  const gras = (texte.match(/\*\*/g) || []).length / 2;
  if (gras > 6) pb.push(`${Math.round(gras)} passages en gras (cinq au plus)`);

  return pb;
}

async function main(){
  const fichiers = (await fs.readdir(OUTDIR).catch(() => []))
    .filter(f => f.endsWith('.json') && f !== 'index.json');
  if (!fichiers.length){
    console.log('Aucune fiche à contrôler. Lancez d’abord « 2 · Écrire ».');
    return;
  }

  const maitre = await lire(MAITRE, null);
  const qids = new Set((maitre?.sujets || []).map(s => s.qid));
  const titresMaitre = new Set();
  for (const s of (maitre?.sujets || [])){ if (s.fr) titresMaitre.add(s.fr); if (s.en) titresMaitre.add(s.en); }

  const vus = new Map();
  let total = 0, bons = 0, mauvais = 0, orphelines = 0;
  const rapport = [];
  const compteur = {};

  for (const f of fichiers.sort()){
    const [lang, uni] = f.replace(/\.json$/, '').split(/-(.+)/);
    const chemin = path.join(OUTDIR, f);
    const j = await lire(chemin, { items:{} });
    let modifie = false;

    for (const [titre, rec] of Object.entries(j.items || {})){
      total++;
      const pb = controler(rec, lang, titre, vus);
      if (titresMaitre.size && !titresMaitre.has(titre) && !(rec.q && qids.has(rec.q))){
        pb.push('absente du catalogue maître');
        orphelines++;
      }
      for (const x of pb){
        const k = x.replace(/\(.*?\)/g, '').replace(/«.*?»/g, '').replace(/\d+/g, 'N').trim();
        compteur[k] = (compteur[k] || 0) + 1;
      }
      if (pb.length){
        mauvais++;
        rapport.push({ f, lang, uni, titre, pb });
        if (REPARER && rec.v !== 'quarantaine'){ rec.v = 'quarantaine'; modifie = true; }
      }else{
        bons++;
        if (REPARER && rec.v !== 'ok'){ rec.v = 'ok'; modifie = true; }
      }
    }
    if (modifie) await ecrire(chemin, j);
  }

  console.log(`\n╔══ CONTRÔLE ═══════════════════════════════════════════════`);
  console.log(`║  ${total} fiche(s) examinée(s)`);
  console.log(`║  ${bons} conformes`);
  console.log(`║  ${mauvais} à revoir${REPARER ? ' — mises en quarantaine' : ''}`);
  if (orphelines) console.log(`║  dont ${orphelines} absente(s) du catalogue maître`);
  if (Object.keys(compteur).length){
    console.log(`╠══ ce qui pèche, par fréquence ─────────────────────────────`);
    for (const [k, v] of Object.entries(compteur).sort((a,b) => b[1]-a[1]))
      console.log(`║  ${String(v).padStart(5)}  ${k}`);
  }
  console.log(`╚═══════════════════════════════════════════════════════════`);

  if (rapport.length){
    console.log(`\nLes trente premières :`);
    for (const r of rapport.slice(0, 30))
      console.log(`  · [${r.lang}/${r.uni}] ${r.titre}\n      ${r.pb.join(' ; ')}`);
    if (rapport.length > 30) console.log(`  … et ${rapport.length - 30} autre(s).`);
    await fs.writeFile(path.join(process.cwd(), 'controle.csv'),
      '﻿langue;univers;titre;problemes\n' + rapport.map(r =>
        [r.lang, r.uni, '"' + r.titre.replace(/"/g,'""') + '"', '"' + r.pb.join(' ; ').replace(/"/g,'""') + '"'].join(';')
      ).join('\n') + '\n', 'utf8');
    console.log(`\nLa liste complète est dans controle.csv.`);
  }

  if (!REPARER && mauvais){
    console.log(`\nRelancez avec « réparer » pour mettre ces ${mauvais} fiche(s) en quarantaine :`);
    console.log(`elles resteront dans le dépôt mais ne seront jamais publiées.`);
  }
  if (REPARER) console.log(`\nLes fiches conformes peuvent maintenant partir : action « 4 · Publier ».`);
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
