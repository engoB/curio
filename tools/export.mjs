#!/usr/bin/env node
/**
 * Curio — export du catalogue en un seul fichier
 * ===========================================================================
 * Produit `export.csv` : une ligne par sujet, tous univers et toutes langues
 * confondus, avec son rang de notoriété, sa note insolite si elle existe, et
 * une colonne vide « ecrire » que vous remplissez vous-même.
 *
 *   node tools/export.mjs                    # tout
 *   node tools/export.mjs --langue fr        # une seule langue
 *   node tools/export.mjs --tri insolite     # trier par note insolite
 *   node tools/export.mjs --non-rediges      # seulement ce qui reste à écrire
 *
 * Le fichier s'ouvre dans Excel, Numbers ou Google Sheets (séparateur « ; »).
 * Triez, filtrez, écrivez « oui » dans la colonne « ecrire » sur les lignes
 * qui vous intéressent, réenregistrez, remettez le fichier dans le dépôt,
 * puis lancez la rédaction avec l'option « liste » réglée sur export.csv.
 * ===========================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i+1]; return (v && !v.startsWith('--')) ? v : true; };

const LANGS   = String(opt('langue', 'fr,en')).split(',').map(s => s.trim()).filter(Boolean);
const TRI     = String(opt('tri', 'notoriete'));      // notoriete | insolite | titre | univers
const RESTE   = !!opt('non-rediges', false);
const OUT     = String(opt('sortie', 'export.csv'));

const CATALOG = path.join(process.cwd(), 'catalog.json');
const ANECDIR = path.join(process.cwd(), 'anecdotes');

const readJson = async (p, d) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return d; } };
const csv = v => {
  const s = String(v == null ? '' : v);
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

async function main(){
  const cat = await readJson(CATALOG, null);
  if (!cat || !cat.sources){
    console.error('✗ catalog.json introuvable. Lancez d\'abord l\'action « Catalogue ».');
    process.exit(1);
  }

  const rows = [];
  for (const uni of Object.keys(cat.sources)){
    for (const lang of LANGS){
      const list = cat.sources[uni]?.[lang] || [];
      if (!list.length) continue;
      const written = (await readJson(path.join(ANECDIR, lang + '-' + uni + '.json'), { items:{} })).items || {};
      list.forEach((titre, i) => {
        const w = written[titre];
        if (RESTE && w) return;
        rows.push({
          langue: lang,
          univers: uni,
          titre,
          notoriete: i + 1,                        // rang dans la liste, classée à la génération
          insolite: w && w.s != null ? w.s : '',
          accroche: w ? w.t : '',
          redige: w ? 'oui' : 'non',
          signes: w && w.x ? w.x.length : '',
          date: w && w.d ? w.d : '',
          ecrire: ''
        });
      });
    }
  }

  const tri = {
    notoriete: (a, b) => a.univers.localeCompare(b.univers) || a.notoriete - b.notoriete,
    insolite:  (a, b) => (Number(b.insolite) || -1) - (Number(a.insolite) || -1),
    titre:     (a, b) => a.titre.localeCompare(b.titre, 'fr'),
    univers:   (a, b) => a.univers.localeCompare(b.univers) || a.titre.localeCompare(b.titre, 'fr')
  }[TRI] || null;
  if (tri) rows.sort(tri);

  const cols = ['langue','univers','titre','notoriete','insolite','accroche','redige','signes','date','ecrire'];
  const out = '﻿' + [cols.join(';')].concat(rows.map(r => cols.map(c => csv(r[c])).join(';'))).join('\n') + '\n';
  await fs.writeFile(path.join(process.cwd(), OUT), out);

  const nRed = rows.filter(r => r.redige === 'oui').length;
  console.log(`✓ ${OUT} — ${rows.length} lignes (${nRed} déjà rédigées, ${rows.length - nRed} à écrire), triées par ${TRI}.`);
  console.log('  Ouvrez-le dans un tableur, écrivez « oui » dans la colonne « ecrire »,');
  console.log('  réenregistrez, puis lancez la rédaction avec liste = export.csv.');
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
