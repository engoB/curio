"""Embarque les fiches de anecdotes/*.json dans parts/20-data.js."""
import json, glob, os

blocks, tot = [], 0
for f in sorted(glob.glob('anecdotes/??-*.json')):
    base = os.path.basename(f)
    lang, uni = base[:2], base[3:-5]
    items = json.load(open(f))['items']
    tot += len(items)
    entries = []
    for art, v in items.items():
        entries.append('  %s: { t:%s, x:%s, s:%d, u:%s }' % (
            json.dumps(art, ensure_ascii=False),
            json.dumps(v['t'], ensure_ascii=False),
            json.dumps(v['x'], ensure_ascii=False),
            v['s'],
            json.dumps(v['u'], ensure_ascii=False)))
    blocks.append(' %s: {\n%s\n }' % (json.dumps(lang + '|' + uni), ',\n'.join(entries)))

builtin = """
/* ---------------- anecdotes intégrées ----------------
   Les 20 fiches de référence, écrites à la main, embarquées dans le code.
   Elles s'affichent immédiatement, même sans le dossier anecdotes/ : c'est ce
   qui permet de juger le format partout, y compris hors ligne.
   Dès qu'un fichier anecdotes/{langue}-{univers}.json existe, il prend le
   dessus pour cet univers.                                                */
const BUILTIN = {
%s
};
""" % (',\n'.join(blocks))

path = 'parts/20-data.js'
s = open(path, encoding='utf-8').read()
anchor = "/* ---------------- collection embarquée (hors ligne / démo) ---------------- */"
assert anchor in s, "ancre introuvable"
start = s.find("\n/* ---------------- anecdotes intégrées")
if start >= 0:
    s = s[:start] + builtin + s[s.index(anchor):]
else:
    s = s.replace(anchor, builtin + '\n' + anchor, 1)
open(path, 'w', encoding='utf-8').write(s)
print('BUILTIN ecrit :', tot, 'fiches')
