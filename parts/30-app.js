<script>
(function(){
'use strict';

/* ============================ état & stockage ============================ */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v===null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ prune(); } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
function prune(){
  try{
    const keys = Object.keys(localStorage).filter(k=>k.startsWith('curio.c.'));
    keys.slice(0, Math.ceil(keys.length/2)).forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}
const today = () => new Date().toISOString().slice(0,10);

const S = {
  lang:      LS.get('curio.lang', (navigator.language||'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'),
  theme:     LS.get('curio.theme', 'dark'),
  // « bleu » (par défaut) ou « origine » — le jeu de teintes d'avant, encre
  // presque noire et vert-de-gris. Indépendant du clair/sombre.
  palette:   LS.get('curio.palette', 'bleu'),
  plan:      LS.get('curio.plan', 'free'),
  picked:    LS.get('curio.picked', ['cosmos','vivant']),
  day:       LS.get('curio.day', today()),
  used:      LS.get('curio.used', 0),
  streak:    LS.get('curio.streak', 1),
  lastDay:   LS.get('curio.lastDay', null),
  favs:      LS.get('curio.favs', []),
  seen:      LS.get('curio.seen', []),
  onboarded: LS.get('curio.onboarded', false)
};
if(S.day !== today()){ S.day = today(); S.used = 0; LS.set('curio.day', S.day); LS.set('curio.used', 0); }
(function streak(){
  const t = today();
  if(S.lastDay !== t){
    const y = new Date(Date.now()-864e5).toISOString().slice(0,10);
    S.streak = (S.lastDay === y) ? S.streak + 1 : 1;
    S.lastDay = t;
    LS.set('curio.streak', S.streak); LS.set('curio.lastDay', t);
  }
})();

const T = () => I18N[S.lang];
let offlineMode = false, netFails = 0;

/* ============================ raccourcis DOM ============================ */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (tag, cls, html) => { const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; };
const themeById = id => THEMES.find(t=>t.id===id);

const feed = $('#feed');

/* ============================ thème clair / sombre ============================ */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', S.theme);
  if(S.palette === 'origine') document.documentElement.setAttribute('data-palette', 'origine');
  else document.documentElement.removeAttribute('data-palette');
  const pb = $('#paletteBtn');
  if(pb){
    pb.textContent = S.palette === 'origine' ? 'ENCRE' : 'BLEU';
    pb.setAttribute('aria-pressed', S.palette === 'origine' ? 'true' : 'false');
  }
  const on = S.theme === 'dark';
  $('#themeIcon').innerHTML = on
    ? '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>'
    : '<path d="M20 14.4A8.4 8.4 0 019.6 4 8.4 8.4 0 1020 14.4z"/>';
}
/* Le jeu de couleurs. Ce n'est pas le clair/sombre : c'est le choix entre le
   bleu profond de la version 7 et l'encre d'origine. Les deux existent en
   clair et en sombre, et le réglage est mémorisé. */
(function palette(){
  const b = $('#paletteBtn'); if(!b) return;
  b.addEventListener('click', ()=>{
    S.palette = S.palette === 'origine' ? 'bleu' : 'origine';
    LS.set('curio.palette', S.palette);
    applyTheme(); repaintCanvases();
    const m = document.querySelector('meta[name="theme-color"]');
    if(m) m.setAttribute('content', S.palette === 'origine'
      ? (S.theme === 'light' ? '#F4F3F0' : '#080B11')
      : (S.theme === 'light' ? '#EEF4FE' : '#050E24'));
  });
})();

$('#themeBtn').addEventListener('click', ()=>{
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  const keep = current();
  LS.set('curio.theme', S.theme); applyTheme(); repaintCanvases();
  // on réaffirme la position : un changement de thème ne doit rien faire défiler
  if(keep) requestAnimationFrame(()=>{ keep.scrollIntoView({ block:'start' }); setActive(keep); });
});
function repaintCanvases(){
  document.querySelectorAll('.uni canvas').forEach((cv,i)=>{ if(THEMES[i]) paintCanvas(cv, THEMES[i], hash(THEMES[i].id)); });
  Array.from(feed.children).forEach(c=>{
    const cv = c.querySelector('.card__media canvas');
    if(cv){ const t = themeById(c._item ? c._item.theme : 'cosmos') || THEMES[0]; paintCanvas(cv, t, hash((c._item&&c._item.title)||'x')); }
  });
}

/* ============================ i18n ============================ */
function applyLang(){
  document.documentElement.lang = S.lang;
  $$('[data-i18n]').forEach(n=>{ const v = T()[n.dataset.i18n]; if(typeof v === 'string') n.textContent = v; });
  $$('[data-i18n-html]').forEach(n=>{ const v = T()[n.dataset.i18nHtml]; if(typeof v === 'string') n.innerHTML = v; });
  $('#langBtn').textContent = S.lang.toUpperCase();
  $('#qInput').placeholder = S.lang === 'fr' ? 'Antikythère, tardigrade, Voynich…' : 'Antikythera, tardigrade, Voynich…';
  renderQuota(); renderUniverses(); renderPlans(); renderTocCount(); updateActive();
}
/* Passer de FR a EN ne doit pas changer de sujet : on retrouve le meme
   article dans l'autre langue et on le rouvre. Les listes de sujets sont
   appariees index par index ; le catalogue peut fournir ses propres paires. */
const TWINS = new Map();          // "fr:Titre" -> "Titre anglais"
function indexTwins(){
  Object.keys(SOURCES).forEach(k=>{
    const a = (SOURCES[k] && SOURCES[k].fr) || [], b = (SOURCES[k] && SOURCES[k].en) || [];
    const n = Math.min(a.length, b.length);
    for(let i=0;i<n;i++){
      if(!a[i] || !b[i]) continue;
      if(!TWINS.has('fr:'+a[i])) TWINS.set('fr:'+a[i], b[i]);
      if(!TWINS.has('en:'+b[i])) TWINS.set('en:'+b[i], a[i]);
    }
  });
}
indexTwins();

function twinOf(lang, title){ return TWINS.get(lang + ':' + title) || null; }

$('#langBtn').addEventListener('click', ()=>{
  const cur  = current();
  const item = cur && cur._item;
  const from = S.lang;

  S.lang = S.lang === 'fr' ? 'en' : 'fr';
  LS.set('curio.lang', S.lang);
  applyLang();
  if(typeof curLangueChangee === 'function') curLangueChangee();
  resetFeed();

  // on rouvre le meme sujet dans la nouvelle langue, s'il a un equivalent
  if(item && item.theme){
    const t = twinOf(from, item.article || item.title);
    if(t) setTimeout(()=> openSubject(item.theme, t, false), 60);
  }
});

/* ============================ fonds par univers ============================
   Chaque univers a son propre langage graphique : le cosmos a un ciel, la
   terre a des courbes de niveau, l'histoire a du papier gravé, les sciences
   ont un tracé technique. Le fond reste discret — c'est le texte qui compte —
   mais il ne doit jamais donner l'impression d'être le même partout.
   Le dessin est déterministe : un même sujet redonne toujours le même fond. */
function paintCanvas(cv, theme, seed){
  const th   = (theme && typeof theme === 'object') ? theme : { id:'cosmos', hue:(theme|0)||200 };
  const hue  = th.hue == null ? 200 : th.hue;
  const kind = th.id || 'cosmos';
  const w = cv.width = 900, h = cv.height = 1400;
  const c = cv.getContext('2d');
  let s = (seed >>> 0) || 1;
  const rnd = () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296;
  const rr  = (a,b) => a + (b-a)*rnd();
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  const H = (hh,ss,ll,a) =>
    'hsla(' + (((hh%360)+360)%360).toFixed(0) + ',' + Math.max(0,Math.min(100,ss)).toFixed(0) + '%,'
            + Math.max(0,Math.min(100,ll)).toFixed(1) + '%,' + a.toFixed(3) + ')';

  /* --- socle commun : une teinte profonde, jamais criarde --- */
  const L0 = dark ? 10 : 96;      // fond
  const L1 = dark ? 23 : 87;      // haut de dégradé
  const S0 = dark ? 34 : 18;
  const ink = dark ? 88 : 22;     // clarté du trait
  const g = c.createLinearGradient(0, 0, w*0.35, h);
  g.addColorStop(0,   H(hue,      S0,      L1, 1));
  g.addColorStop(0.52,H(hue + 12, S0*0.72, (L0+L1)/2, 1));
  g.addColorStop(1,   H(hue - 16, S0*0.5,  L0, 1));
  c.fillStyle = g; c.fillRect(0,0,w,h);

  const soft = (x,y,r,hh,a,ll)=>{
    const rg = c.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0, H(hh, S0+20, ll==null?(dark?34:80):ll, a));
    rg.addColorStop(1, H(hh, S0+20, ll==null?(dark?34:80):ll, 0));
    c.fillStyle = rg; c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill();
  };
  const line = (a,width)=>{ c.strokeStyle = H(hue, dark?26:22, ink, a*1.7); c.lineWidth = width; };

  /* --- motif propre à l'univers --- */
  if(kind === 'cosmos'){
    for(let i=0;i<7;i++) soft(rr(0,w), rr(0,h), rr(240,620), hue + rr(-40,60), dark?0.26:0.16);
    for(let i=0;i<520;i++){
      const x=rnd()*w, y=rnd()*h, r=Math.pow(rnd(),3.2)*2.1+0.25;
      c.fillStyle = H(hue + rr(-30,50), 18, dark?rr(72,100):rr(30,52), rr(0.10,0.62));
      c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill();
    }
  }

  else if(kind === 'terre'){
    // courbes de niveau : un relief lu de haut
    const cx = rr(0.25,0.75)*w, cy = rr(0.3,0.7)*h;
    for(let k=0;k<26;k++){
      const rad = 60 + k*54;
      line(dark ? 0.11 - k*0.0025 : 0.13 - k*0.003, k%5===0 ? 2.1 : 1);
      c.beginPath();
      for(let a=0;a<=64;a++){
        const t = a/64*6.2832;
        const wob = 1 + 0.20*Math.sin(t*3 + k*0.5) + 0.12*Math.sin(t*5 - k*0.31);
        const x = cx + Math.cos(t)*rad*wob, y = cy + Math.sin(t)*rad*wob*0.72;
        a ? c.lineTo(x,y) : c.moveTo(x,y);
      }
      c.closePath(); c.stroke();
    }
    soft(cx, cy, 520, hue + 14, dark?0.22:0.14);
  }

  else if(kind === 'histoire'){
    // papier ancien : trame gravée, réglure, tache d'encre
    c.save(); c.translate(w/2,h/2); c.rotate(-0.32); c.translate(-w/2,-h/2);
    for(let y=-h; y<h*2; y+=9){
      line(dark?0.045:0.055, 1);
      c.beginPath(); c.moveTo(-200,y); c.lineTo(w+200,y+38); c.stroke();
    }
    c.restore();
    for(let i=0;i<3;i++) soft(rr(0.15,0.85)*w, rr(0.15,0.85)*h, rr(300,560), hue + rr(-14,14), dark?0.26:0.17);
    line(dark?0.16:0.18, 1.4);
    for(let i=0;i<2;i++){ const y = h*(i?0.86:0.14); c.beginPath(); c.moveTo(w*0.08,y); c.lineTo(w*0.92,y); c.stroke(); }
  }

  else if(kind === 'sciences'){
    // épure technique : grille, cercles de construction, cotes
    line(dark?0.055:0.065, 1);
    for(let x=0;x<=w;x+=64){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
    for(let y=0;y<=h;y+=64){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
    const cx = rr(0.3,0.7)*w, cy = rr(0.3,0.7)*h;
    for(let k=1;k<=6;k++){
      line(dark?0.17:0.19, k===3?2:1.1);
      c.beginPath(); c.arc(cx,cy,k*86,0,6.2832); c.stroke();
    }
    line(dark?0.20:0.22, 1.1);
    for(let k=0;k<6;k++){
      const a = k*Math.PI/3 + rr(0,0.5);
      c.beginPath(); c.moveTo(cx,cy);
      c.lineTo(cx+Math.cos(a)*540, cy+Math.sin(a)*540); c.stroke();
    }
    soft(cx, cy, 480, hue, dark?0.22:0.13);
  }

  else if(kind === 'vivant'){
    // matière organique : cellules et filaments
    for(let i=0;i<9;i++) soft(rr(0,w), rr(0,h), rr(180,460), hue + rr(-26,34), dark?0.24:0.16);
    for(let i=0;i<34;i++){
      const x = rnd()*w, y = rnd()*h, r = rr(26,110);
      line(dark?0.10:0.12, 1.2);
      c.beginPath();
      for(let a=0;a<=40;a++){
        const t=a/40*6.2832, wob = 1 + 0.22*Math.sin(t*4 + i);
        const px = x + Math.cos(t)*r*wob, py = y + Math.sin(t)*r*wob;
        a ? c.lineTo(px,py) : c.moveTo(px,py);
      }
      c.closePath(); c.stroke();
    }
  }

  else if(kind === 'esprit'){
    // réseau : des chemins qui se croisent, des points où ils se rencontrent
    const pts = [];
    for(let i=0;i<26;i++) pts.push([rnd()*w, rnd()*h]);
    line(dark?0.13:0.15, 1);
    pts.forEach((a,i)=>{
      pts.slice(i+1).forEach(b=>{
        const d = Math.hypot(a[0]-b[0], a[1]-b[1]);
        if(d > 300) return;
        c.globalAlpha = 1 - d/300;
        c.beginPath(); c.moveTo(a[0],a[1]);
        c.quadraticCurveTo((a[0]+b[0])/2 + rr(-40,40), (a[1]+b[1])/2 + rr(-40,40), b[0],b[1]);
        c.stroke();
      });
    });
    c.globalAlpha = 1;
    pts.forEach(pt=>{
      c.fillStyle = H(hue, 42, dark?76:34, 0.30);
      c.beginPath(); c.arc(pt[0],pt[1],rr(2,5),0,6.2832); c.fill();
    });
    for(let i=0;i<4;i++) soft(rr(0,w), rr(0,h), rr(260,520), hue + rr(-24,24), dark?0.24:0.15);
  }

  else if(kind === 'mysteres'){
    // brume : peu de matière, beaucoup de vide, une forme qu'on devine
    for(let i=0;i<16;i++){
      const y = rr(0,h);
      const rg = c.createLinearGradient(0,y-90,0,y+90);
      rg.addColorStop(0,   H(hue + rr(-20,20), S0, dark?22:86, 0));
      rg.addColorStop(0.5, H(hue + rr(-20,20), S0, dark?32:84, dark?0.17:0.11));
      rg.addColorStop(1,   H(hue + rr(-20,20), S0, dark?22:86, 0));
      c.fillStyle = rg; c.fillRect(0, y-90, w, 180);
    }
    soft(rr(0.3,0.7)*w, rr(0.25,0.6)*h, 420, hue, dark?0.30:0.18);
    line(dark?0.07:0.09, 1);
    for(let k=0;k<9;k++){
      c.beginPath();
      const y0 = rr(0,h);
      c.moveTo(0, y0);
      c.bezierCurveTo(w*0.3, y0+rr(-120,120), w*0.7, y0+rr(-120,120), w, y0+rr(-80,80));
      c.stroke();
    }
  }

  else { /* arts */
    // pigment : larges aplats posés au couteau, puis la trame de la toile
    for(let i=0;i<6;i++){
      c.save();
      c.translate(rr(0,w), rr(0,h)); c.rotate(rr(-0.8,0.8));
      const gw = rr(320,700), gh = rr(90,240);
      const lg = c.createLinearGradient(-gw/2,0,gw/2,0);
      const hh = hue + rr(-40,50);
      lg.addColorStop(0,   H(hh, S0+22, dark?26:84, 0));
      lg.addColorStop(0.5, H(hh, S0+22, dark?34:82, dark?0.26:0.17));
      lg.addColorStop(1,   H(hh, S0+22, dark?26:84, 0));
      c.fillStyle = lg; c.fillRect(-gw/2,-gh/2,gw,gh);
      c.restore();
    }
    line(dark?0.05:0.06, 1);
    for(let x=0;x<=w;x+=7){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
    for(let y=0;y<=h;y+=7){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
  }

  /* --- vignette : le regard revient au centre, le texte se détache --- */
  const vg = c.createRadialGradient(w*0.42, h*0.40, h*0.16, w*0.5, h*0.55, h*0.92);
  vg.addColorStop(0, H(hue, 20, dark?8:96, 0));
  vg.addColorStop(1, H(hue, 28, dark?5:99, dark?0.46:0.30));
  c.fillStyle = vg; c.fillRect(0,0,w,h);

  /* --- grain : une matière, pas un aplat numérique --- */
  try{
    const im = c.getImageData(0,0,w,h), d = im.data;
    for(let i=0;i<d.length;i+=4){
      const n = (rnd()-0.5) * (dark ? 13 : 10);
      d[i] += n; d[i+1] += n; d[i+2] += n;
    }
    c.putImageData(im,0,0);
  }catch(e){}
}

/* ============================ Wikipédia ============================ */
const mem = new Map();
const sized = (u,w) => u ? u.replace(/\/(\d+)px-/, '/'+w+'px-') : '';

/* Coupe strictement à la fin d'une phrase. Jamais au milieu d'une information :
   si aucune fin de phrase ne tombe dans la fenêtre, on garde la phrase entière. */
const ABBR = /(?:\b(?:M|MM|Mme|Dr|St|Ste|av|ap|J\.-C|env|cf|ex|etc|vol|no|op|éd|ill|p|pp|Mr|Mrs|Ms|Prof|Jr|Sr|Inc|Ltd|approx|ca|fig|Vol|No|Ed)\.)$/;

function sentenceEnds(t){
  const ends = [];
  const re = /[.!?…](?=[\s ]|$)/g;
  let m;
  while((m = re.exec(t)) !== null){
    const before = t.slice(Math.max(0, m.index - 12), m.index + 1);
    if(ABBR.test(before)) continue;
    if(/\s[A-ZÀ-Þ]\.$/.test(before)) continue;
    const after = t.slice(m.index + 1, m.index + 3);
    if(/^\s*[a-zà-ÿ0-9]/.test(after)) continue;
    ends.push(m.index + 1);
  }
  return ends;
}

function split(t){
  return t.split(/\n\n+/).map(p=>p.trim()).filter(p=>p.length > 1);
}

function shape(txt){
  if(!txt) return [];
  let t = String(txt)
    .replace(/\r/g,'')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]+/g,' ')
    .replace(/\(\s*(?:écouter|listen|prononciation|pronunciation)[^)]*\)/gi,'')
    .replace(/\(\s*\/[^)]*\/\s*\)/g,'')
    .replace(/\s+([,;:.!?])/g,'$1')
    .trim();
  if(!t) return [];

  const target = CONFIG.textTarget || 1700;
  if(t.length <= target) return split(t);

  const paras = t.split(/\n\n+/);
  let acc = '';
  for(const p of paras){
    const next = acc ? acc + '\n\n' + p : p;
    if(next.length > target) break;
    acc = next;
  }
  if(acc.length >= target * 0.5) return split(acc);

  const ends = sentenceEnds(t);
  let cut = 0;
  for(const e of ends){ if(e <= target) cut = e; else break; }
  if(!cut) cut = ends.length ? ends[0] : t.length;
  return split(t.slice(0, cut).trim());
}

/* Une seule requête pour un lot de titres : intro + image + description + URL. */
async function wikiBatch(lang, titles){
  const out = [];
  const need = [];
  titles.forEach(t=>{
    const c = mem.get(lang+':'+t) || LS.get('curio.c.' + lang + ':' + t, null);
    if(c && c.v && Date.now() - c.at < 30*864e5){ mem.set(lang+':'+t, c); out.push(c.v); }
    else if(c && c.title){ out.push(c); }
    else need.push(t);
  });
  if(!need.length) return out;

  const url = 'https://' + lang + '.wikipedia.org/w/api.php'
    + '?action=query&format=json&formatversion=2&origin=*&redirects=1'
    + '&prop=extracts|pageimages|description|info&inprop=url'
    + '&explaintext=1&exintro=1&exlimit=20&pilimit=20&piprop=thumbnail&pithumbsize=1400'
    + '&titles=' + need.slice(0,20).map(t=>encodeURIComponent(t)).join('%7C');

  let res;
  try{ res = await fetch(url); }
  catch(e){ netFails++; if(netFails >= 2) goOffline(); throw e; }
  netFails = 0;
  if(!res.ok) throw new Error('http ' + res.status);
  const j = await res.json();
  const pages = (j.query && j.query.pages) || [];

  pages.forEach(p=>{
    if(p.missing || p.invalid) return;
    if(p.description && /^(page d.homonymie|disambiguation page|homonymie)/i.test(p.description)) return;
    const paras = shape(p.extract);
    const len = paras.join(' ').length;
    if(len < (CONFIG.textMin || 320)) return;
    const thumb = p.thumbnail && p.thumbnail.source;
    const v = {
      title:  p.title,
      paras:  paras,
      extract: paras.join('\n\n'),
      desc:   p.description || '',
      img:    thumb ? sized(thumb, 1400) : '',
      thumb:  thumb ? sized(thumb, 200) : '',
      url:    p.fullurl || ('https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g,'_')))
    };
    mem.set(lang+':'+p.title, { at: Date.now(), v });
    LS.set('curio.c.' + lang + ':' + p.title, { at: Date.now(), v });
    out.push(v);
  });
  return out;
}

/* ================= repli extractif =================
   Utilisé uniquement quand aucune anecdote rédigée n'existe pour le sujet :
   introduction complète, puis premier paragraphe de chaque section utile. */
const SKIP_SECTION = /^(references?|see also|external links?|further reading|bibliography|notes?|sources?|footnotes?|citations?|gallery|works cited|publications|filmography|discography|honou?rs|awards|in popular culture|voir aussi|notes et r[ée]f[ée]rences|r[ée]f[ée]rences|annexes?|bibliographie|liens externes|articles connexes|sources et bibliographie|galerie|filmographie|discographie|distinctions|dans la culture populaire)$/i;

function digest(raw){
  const text = String(raw || '').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n');
  const parts = text.split(/\n(={2,6})\s*(.+?)\s*\1\n/);
  const budget = CONFIG.fullTarget || 4200;
  const blocks = [];
  let used = 0;

  const clean = p => p.replace(/[ \t]+/g,' ')
                      .replace(/\(\s*(?:écouter|listen|prononciation|pronunciation)[^)]*\)/gi,'')
                      .replace(/\(\s*\/[^)]*\/\s*\)/g,'')
                      .replace(/\s+([,;:.!?])/g,'$1')
                      .trim();

  const take = (title, body, maxP) => {
    if(used >= budget) return;
    const ps = String(body||'').split(/\n+/).map(clean).filter(p => p.length > 60);
    if(!ps.length) return;
    const kept = [];
    for(const p of ps.slice(0, maxP)){
      if(used >= budget) break;
      let t = p;
      if(used + t.length > budget){
        const ends = sentenceEnds(t);
        let cut = 0;
        for(const e of ends){ if(used + e <= budget) cut = e; else break; }
        if(!cut) cut = ends.length ? ends[0] : 0;
        if(!cut) break;
        t = t.slice(0, cut).trim();
      }
      kept.push(t); used += t.length;
    }
    if(kept.length) blocks.push({ h: title, p: kept });
  };

  take(null, parts[0], 5);
  for(let i = 1; i < parts.length; i += 3){
    const level = parts[i] || '', title = (parts[i+1] || '').trim(), body = parts[i+2] || '';
    if(level.length > 2) continue;
    if(!title || SKIP_SECTION.test(title)) continue;
    take(title, body, 1);
    if(used >= budget) break;
  }
  return blocks;
}

const fullMem = new Map();
async function wikiFull(lang, title){
  const k = lang + '|' + title;
  if(fullMem.has(k)) return fullMem.get(k);
  const c = LS.get('curio.f.' + k, null);
  if(c && c.v && Date.now() - c.at < 30*864e5){ fullMem.set(k, c.v); return c.v; }

  const url = 'https://' + lang + '.wikipedia.org/w/api.php'
    + '?action=query&format=json&formatversion=2&origin=*&redirects=1'
    + '&prop=extracts&explaintext=1&exsectionformat=wiki'
    + '&titles=' + encodeURIComponent(title);
  const r = await fetch(url);
  if(!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const p = ((j.query && j.query.pages) || [])[0];
  if(!p || p.missing || !p.extract) throw new Error('vide');
  const v = digest(p.extract);
  if(!v.length) throw new Error('vide');
  fullMem.set(k, v);
  LS.set('curio.f.' + k, { at: Date.now(), v });
  return v;
}

/* Complète un item avec le repli extractif. Silencieux en cas d'échec. */
async function enrich(item){
  if(offlineMode || item.offline || item.wrote || item.blocks || item._enriching) return;
  item._enriching = true;
  try{
    item.blocks = await wikiFull(S.lang, item.title);
    if(item._node) fillText(item._node, item);
  }catch(e){ /* on garde l'aperçu */ }
  finally{ item._enriching = false; }
}

function goOffline(){
  if(offlineMode) return;
  offlineMode = true;
  $('#offlineTag').classList.add('show');
}

/* ================= compteurs publics ================= */
let STATS = null;
async function loadStats(){
  if(!CONFIG.anecdotesDir) return;
  try{
    const r = await fetch(CONFIG.anecdotesDir + '/index.json', { cache:'no-cache' });
    if(!r.ok) return;
    const j = await r.json();
    if(j && j.total){ STATS = j; renderTocCount(); }
  }catch(e){}
}
/* Le chiffre public est un nombre de SUJETS écrits, pas de textes : une
   anecdote rédigée en français et en anglais, c'est un sujet. `sujets` est
   produit par tools/write-anecdotes.mjs ; le total par langue sert de repli
   pour les index.json d'avant cette version. */
function statTotal(){
  if(STATS && STATS.total){
    if(typeof STATS.total.sujets === 'number') return STATS.total.sujets;
    if(typeof STATS.total[S.lang] === 'number') return STATS.total[S.lang];
  }
  return builtinTotal(S.lang);
}
function statWeek(){
  if(!STATS || !STATS.weekly) return 0;
  return (typeof STATS.weekly.sujets === 'number' ? STATS.weekly.sujets : STATS.weekly[S.lang]) || 0;
}

/* ================= anecdotes rédigées =================
   Produites une fois par tools/write-anecdotes.mjs et servies telles quelles.
   Un fichier par langue et par univers, chargé à la demande.
   Absentes : l'application retombe sur le résumé extractif de Wikipédia. */
const written = new Map();          // "fr|cosmos" -> { titre: {t,x,s} } ou null
const CURATION = new URLSearchParams(location.search).get('curation') === '1';

/* ═══════════ ce que le lecteur a le droit de voir ═══════════════════════
   Une fiche écrite n'est pas une fiche en ligne. Le stock est constitué
   d'avance et sort au compte-gouttes : c'est ce qui donne à l'application
   l'air de vivre alors que tout est déjà dans le dépôt.

     p   date de publication. null = en réserve. Future = programmée.
     v   'ok' contrôlée · 'quarantaine' recalée · 'retire' retirée par vous

   Les fiches d'avant la version 8 n'ont pas ces champs : elles sont
   considérées publiées, sans quoi une mise à jour viderait l'application.

   En vue Curation, on garde TOUT : c'est l'atelier, il doit tout montrer. */
function filtrerPubliees(items){
  if(CURATION) return items;
  const auj = new Date().toISOString().slice(0,10);
  const out = {};
  for(const [k, v] of Object.entries(items)){
    if(v.v === 'retire' || v.v === 'quarantaine') continue;
    if(v.p === undefined || (v.p !== null && String(v.p) <= auj)) out[k] = v;
  }
  return out;
}

async function loadWritten(lang, uni){
  const k = lang + '|' + uni;
  if(written.has(k)) return written.get(k);
  let map = null;
  if(CONFIG.anecdotesDir){
    try{
      const r = await fetch(CONFIG.anecdotesDir + '/' + lang + '-' + uni + '.json', { cache:'default' });
      if(r.ok){
        const j = await r.json();
        if(j && j.items && Object.keys(j.items).length) map = filtrerPubliees(j.items);
      }
    }catch(e){}
  }
  // Aucun fichier : on sert les fiches embarquées dans le code, s'il y en a
  // pour cet univers. C'est ce qui rend la démonstration autonome.
  if(!map && typeof BUILTIN !== 'undefined' && BUILTIN[k]) map = BUILTIN[k];
  written.set(k, map);
  return map;
}

/* Totaux repliés sur les fiches embarquées quand anecdotes/index.json est absent. */
function builtinTotal(lang){
  if(typeof BUILTIN === 'undefined') return 0;
  return Object.keys(BUILTIN)
    .filter(k => k.startsWith(lang + '|'))
    .reduce((n, k) => n + Object.keys(BUILTIN[k]).length, 0);
}
function writtenFor(lang, uni, title){
  const m = written.get(lang + '|' + uni);
  return m ? m[title] : null;
}

/* ============================ catalogue étendu ============================ */
/* catalog.json (facultatif, produit par tools/build-catalog.mjs) :
   { "themes":[ {id,hue,free,fr:{name,desc},en:{name,desc}} ],
     "sources":{ "cosmos":{"fr":[...],"en":[...]}, ... },
     "scores":{ "fr|Lac Nyos":{ p:9, w:"la phrase qui dit pourquoi", c:1 } } }
   Un format plat { "cosmos":{"fr":[...]} } est également accepté.        */
let catalogCount = 0;
/* Le potentiel calculé à la collecte, et la phrase écrite par le contributeur
   qui explique pourquoi le sujet est étrange. Les deux servent à trier et à
   décider dans la vue Curation, sans un seul appel réseau de plus.        */
const SCORES = {};          // "langue|titre" -> { p:potentiel, w:pourquoi, c:curé }
async function loadCatalog(){
  if(!CONFIG.catalogUrl) return;
  let j;
  try{
    const r = await fetch(CONFIG.catalogUrl, { cache:'default' });
    if(!r.ok) return;
    j = await r.json();
  }catch(e){ return; }

  const themes  = Array.isArray(j.themes) ? j.themes : [];
  const sources = j.sources || j;

  if(j.scores && typeof j.scores === 'object') Object.assign(SCORES, j.scores);

  themes.forEach(t=>{
    if(!t || !t.id) return;
    if(!THEMES.some(x=>x.id === t.id)) THEMES.push(t);
  });

  Object.keys(sources).forEach(k=>{
    if(k === 'themes' || k === 'sources') return;
    const blk = sources[k];
    if(!blk || typeof blk !== 'object') return;
    if(!SOURCES[k]) SOURCES[k] = { fr:[], en:[] };
    ['fr','en'].forEach(l=>{
      if(!Array.isArray(blk[l])) return;
      const merged = (SOURCES[k][l] || []).concat(blk[l]);
      SOURCES[k][l] = Array.from(new Set(merged));
      catalogCount += blk[l].length;
    });
  });
  if(Array.isArray(j.pairs)){
    j.pairs.forEach(pr=>{
      if(!pr || !pr.fr || !pr.en) return;
      TWINS.set('fr:' + pr.fr, pr.en);
      TWINS.set('en:' + pr.en, pr.fr);
    });
  }else{
    indexTwins();
  }
  bag = {};
  renderUniverses(); renderTocCount();
}

/* ============================ file d'anecdotes ============================ */
let bag = {};            // themeId -> titres restants (mélangés)
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* Le flux ne sert QUE des anecdotes rédigées.
   Un sujet collecté n'est pas un produit : c'est une intention. Tant que le
   texte n'est pas écrit, il n'apparaît nulle part côté public — ni dans le
   flux, ni dans le sommaire, ni dans les compteurs. La vue Curation est la
   seule à voir le catalogue, et c'est normal : c'est l'atelier. */
function refill(themeId){
  const w = written.get(S.lang + '|' + themeId);
  if(!w){ bag[themeId] = []; return; }
  // on ne garde que les fiches jugées assez insolites
  const good = Object.keys(w).filter(t => (w[t].s == null) || w[t].s >= (CONFIG.minInsolite || 0));
  const src = good.length ? good : Object.keys(w);
  const seen = new Set(S.seen);
  let arr = src.filter(t => !seen.has(S.lang + ':' + t));
  if(arr.length < 8) arr = src.slice();     // tout a été vu : on recommence
  bag[themeId] = shuffle(arr);
}
function activeThemes(){
  let ids = S.picked.slice();
  if(S.plan === 'free') ids = ids.filter(id => themeById(id) && themeById(id).free);
  if(!ids.length) ids = S.plan === 'free' ? CONFIG.freeThemes.slice() : THEMES.map(t=>t.id);
  return ids;
}
function markSeen(title){
  const k = S.lang + ':' + title;
  if(S.seen.includes(k)) return;
  S.seen.push(k);
  if(S.seen.length > 4000) S.seen = S.seen.slice(-3000);
  LS.set('curio.seen', S.seen);
}

/* Les fiches de démonstration ne pèsent plus dans le code : elles sont dans
   demo.json et ne descendent qu'au moment où on en a besoin — c'est-à-dire
   quand le réseau tombe. Un dépôt vierge ne les charge jamais : il n'a rien
   à lire, et le dire est la seule réponse honnête. */
let offlinePool = [], demoCharge = false;
async function chargerDemo(){
  if(demoCharge || !OFFLINE_URL) return;
  demoCharge = true;
  try{
    const r = await fetch(OFFLINE_URL, { cache:'default' });
    if(!r.ok) return;
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (Array.isArray(j.pieces) ? j.pieces : []);
    arr.forEach(o => { if(o && o.t && o.fr && o.en) OFFLINE.push(o); });
  }catch(e){ /* pas de demo.json : c'est un cas normal, pas une erreur */ }
}

function nextOffline(){
  if(!OFFLINE.length) return null;
  const ids = activeThemes();
  if(!offlinePool.length){
    offlinePool = OFFLINE.filter(o => ids.includes(o.t));
    if(!offlinePool.length) offlinePool = OFFLINE.slice();
    shuffle(offlinePool);
  }
  const o = offlinePool.pop();
  if(!o) return null;
  return {
    theme:o.t, title:o[S.lang].ti,
    paras:o[S.lang].tx.split(/\n\n+/), extract:o[S.lang].tx,
    img:'', url:'https://'+S.lang+'.wikipedia.org/wiki/'+encodeURIComponent(o.k),
    desc:'', offline:true
  };
}

/* File d'attente : on récupère un lot de 14 titres d'un même univers en une requête. */
let ready = [], filling2 = false;
/* Les univers choisis qui contiennent vraiment des textes dans cette langue.
   Piocher au hasard parmi les huit alors qu'un seul est rédigé, c'est tomber
   sept fois sur rien — et finir par servir des fiches de démonstration. */
function themesAvecTexte(){
  const plein = (id)=>{
    if(STATS && STATS.byUniverse && STATS.byUniverse[id]){
      const n = STATS.byUniverse[id][S.lang];
      if(typeof n === 'number') return n > 0;
    }
    const w = written.get(S.lang + '|' + id);
    return !!(w && Object.keys(w).length);
  };
  const choisis = activeThemes().filter(plein);
  if(choisis.length) return choisis;

  // Les univers choisis sont encore vides, mais d'autres ne le sont pas :
  // un choix est une préférence, pas un filtre qui doit vider l'application.
  // On élargit plutôt que d'afficher « rien à lire » à côté d'un catalogue
  // rempli — c'est le début du projet, tous les univers ne se remplissent
  // pas en même temps.
  const tous = (S.plan === 'free' ? CONFIG.freeThemes : THEMES.map(t => t.id)).filter(plein);
  return tous;
}

async function topUp(){
  if(filling2 || ready.length >= 5) return;
  filling2 = true;
  try{
    // on parcourt les univers qui ont du texte, dans un ordre mélangé, et on
    // s'arrête dès qu'on a de quoi remplir l'avance
    const ids = shuffle(themesAvecTexte().slice());
    for(const tid of ids){
      if(ready.length >= 5) break;
      await loadWritten(S.lang, tid);
      if(!bag[tid] || bag[tid].length < 1) refill(tid);
      const picks = (bag[tid] || []).splice(-14);
      if(!picks.length) continue;

      // Tout est dans le fichier : aucun appel réseau pour lire Curio.
      const w = written.get(S.lang + '|' + tid);
      if(!w) continue;
      const already = new Set(ready.map(i => i.article || i.title));
      picks.forEach(title=>{
        const rec = w[title];
        if(!rec || !rec.x || already.has(title)) return;
        already.add(title);
        markSeen(title);
        ready.push(itemFromWritten(tid, title, rec));
      });
      shuffle(ready);
    }
  }catch(e){ /* rien à rattraper : la lecture ne dépend plus du réseau */ }
  finally{ filling2 = false; }
}

/* Construit une carte entièrement à partir d'une anecdote rédigée. */
function itemFromWritten(uni, article, rec){
  const paras = String(rec.x).split(/\n\n+/).map(p=>p.trim()).filter(Boolean);
  return {
    theme: uni,
    title: rec.t || article,
    article: article,
    paras: paras,
    blocks: [{ h:null, p: paras }],
    extract: paras.join(' '),
    img: rec.i || '',
    url: rec.u || ('https://' + S.lang + '.wikipedia.org/wiki/' + encodeURIComponent(String(article).replace(/ /g,'_'))),
    desc: '',
    raconter: rec.r || '',
    wrote: true
  };
}

/* Si une anecdote a été rédigée pour ce sujet, elle remplace le texte
   extractif et donne son titre d'accroche à la carte. */
function applyWritten(item, uni){
  const w = writtenFor(S.lang, uni || item.theme, item.title);
  if(!w || !w.x) return false;
  item.article = item.title;                    // le titre Wikipédia d'origine
  if(w.t) item.title = w.t;                     // l'accroche devient le titre
  item.blocks = [{ h:null, p: String(w.x).split(/\n\n+/).map(p=>p.trim()).filter(Boolean) }];
  item.paras = item.blocks[0].p;
  item.extract = item.paras.join(' ');
  if(w.r) item.raconter = w.r;
  item.wrote = true;
  return true;
}

async function fetchNext(){
  if(!ready.length) await topUp();
  if(!ready.length){
    // Les fiches de démonstration ne servent QUE de filet hors ligne. Un
    // univers sans texte n'est pas une panne : on ne bouche pas le trou avec
    // du contenu qui n'est pas le vôtre.
    if(!offlineMode) return null;
    await chargerDemo();
    return nextOffline();
  }
  const item = ready.pop();
  enrich(item);                          // résumé complet, en tâche de fond
  ready.slice(-2).forEach(enrich);       // et pour les deux suivants
  if(ready.length < 3) topUp();
  return item;
}

/* ============================ rendu des cartes ============================ */
const ICON = {
  ext:'<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 018 0v2.7"/></svg>'
};

/* Le fond d'une fiche est toujours dessiné par Curio : rien n'est emprunté
   à un tiers, rien ne peut manquer, et chaque univers a sa propre matière. */
function mediaFor(item, node){
  const wrap = el('div','card__media');
  const cv = el('canvas');
  wrap.appendChild(cv);
  paintCanvas(cv, themeById(item.theme) || THEMES[0], hash(item.article || item.title));
  node.appendChild(wrap);
}
function hash(s){ let h=2166136261; for(let i=0;i<(s||'').length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619);} return h>>>0; }

/* Remplit (ou re-remplit) la zone de lecture d'une carte. */
function fillText(node, item){
  const read = node.querySelector('.lede');
  if(!read) return;
  read.innerHTML = '';

  // Fiche au-delà du quota : on pose les deux premiers paragraphes et rien
  // de plus. Le CSS les fait s'estomper ; le lecteur voit ce qu'il rate au
  // lieu de heurter un mur, et le reste du texte ne descend pas dans la page.
  if(node.dataset.apercu === '1'){
    const paras = (item.blocks && item.blocks.length ? item.blocks[0].p
                : (item.paras && item.paras.length ? item.paras : [item.extract || '']));
    paras.slice(0, 2).forEach(p => read.appendChild(el('p', null, md(p))));
    read.classList.remove('more');
    const c0 = node.querySelector('.readmore'); if(c0) c0.hidden = true;
    read.onscroll = null;
    return;
  }

  let words = 0;
  if(item.blocks && item.blocks.length){
    item.blocks.forEach(b=>{
      if(b.h) read.appendChild(el('h3','sec', esc(b.h)));
      b.p.forEach(p=>{ read.appendChild(el('p', null, md(p))); words += p.split(/\s+/).length; });
    });
  }else{
    const paras = (item.paras && item.paras.length) ? item.paras : [item.extract || ''];
    paras.forEach(p=>{ read.appendChild(el('p', null, md(p))); words += p.split(/\s+/).length; });
  }
  read.scrollTop = 0;

  // Le texte est long : on le dit. Un texte qui s'estompe sans rien annoncer
  // se lit comme un texte coupe. Ici on affiche une invite explicite, qui
  // fait defiler la suite et disparait quand on est arrive au bout.
  const cue = node.querySelector('.readmore');
  const sync = ()=>{
    const over = read.scrollHeight > read.clientHeight + 4;
    const end  = read.scrollTop + read.clientHeight >= read.scrollHeight - 6;
    read.classList.toggle('more', over && !end);
    if(cue) cue.hidden = !(over && !end);
  };
  read.onscroll = sync;
  requestAnimationFrame(sync);
  if(cue && !cue._wired){
    cue._wired = true;
    cue.addEventListener('click', e=>{
      e.stopPropagation();
      read.scrollBy({ top: Math.round(read.clientHeight * 0.82), behavior:'smooth' });
    });
  }
}

function buildCard(item){
  const node = el('article','card');
  node.dataset.kind = 'fact';
  node._item = item;
  item._node = node;
  mediaFor(item, node);
  node.appendChild(el('div','card__scrim'));

  const th = themeById(item.theme) || THEMES[0];
  const body = el('div','card__body');
  body.appendChild(el('p','eyebrow',
    '<span class="dot"></span>' + esc(th[S.lang].name) +
    (item.article ? ' <span class="sep">·</span> <span class="subj">' + esc(item.article) + '</span>'
                  : (item.desc ? ' <span class="sep">·</span> <span class="subj">' + esc(item.desc.slice(0,46)) + '</span>' : '')) +
''));
  body.appendChild(el('h2', null, esc(item.title)));

  body.appendChild(el('div','lede'));
  const cue = el('button','readmore',
    '<span>' + T()['read.more'] + '</span>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"'
    + ' stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>');
  cue.hidden = true;
  body.appendChild(cue);

  // La version courte : la phrase qu'on dira à voix haute. C'est elle qu'on
  // retient, et c'est pour elle qu'on lit. Elle ferme l'article.
  if(item.raconter){
    const dire = el('div','dire');
    dire.appendChild(el('span','dire__lb', T()['dire.label']));
    dire.appendChild(el('p','dire__tx', esc(item.raconter)));
    const cp = el('button','dire__cp', T()['dire.copy']);
    cp.addEventListener('click', async e=>{
      e.stopPropagation();
      try{ await navigator.clipboard.writeText(item.raconter); toast(T()['dire.done']); }
      catch(err){ toast(T()['cur.copyFail']); }
    });
    dire.appendChild(cp);
    body.appendChild(dire);
  }

  // Garder et partager sont au bout de l'article, la ou on arrive quand on a
  // fini de lire — pas dans une colonne flottante posee sur le texte.
  const row = el('div','endrow');

  const bFav = el('button','ebtn ebtn--fav',
      '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h11a1.5 1.5 0 011.5 1.5v15.2l-7-3.6-7 3.6V5a1.5 1.5 0 011.5-1.5z"/></svg>'
    + '<span class="lb">' + T()['act.keep'] + '</span>');
  bFav.addEventListener('click', e=>{ e.stopPropagation(); basculerFavori(item, node); });

  const bShare = el('button','ebtn',
      '<svg viewBox="0 0 24 24"><circle cx="18" cy="5.5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="18.5" r="2.4"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4"/></svg>'
    + '<span class="lb">' + T()['act.share'] + '</span>');
  bShare.addEventListener('click', e=>{ e.stopPropagation(); partager(item); });

  row.appendChild(bFav);
  row.appendChild(bShare);
  row.appendChild(el('span','ehint', T()['act.next']));
  body.appendChild(row);
  node._fav = bFav;
  node.appendChild(body);

  fillText(node, item);   // après l'attache : fillText interroge le DOM de la carte
  return node;
}

/* Dépôt neuf, catalogue vide : plutôt qu'un écran qui tourne dans le vide,
   on explique quoi faire. C'est le premier écran que verra quelqu'un qui
   vient d'installer le projet. */
/* « Il n'y a rien à lire » veut dire : aucune anecdote n'est écrite dans cette
   langue. Le catalogue peut être plein — ce sont des sujets en attente, pas
   des fiches. */
function catalogueVide(){
  return !ecritesLangue() && !builtinTotal(S.lang);
}
/* Combien de textes existent dans la langue affichée. anecdotes/index.json
   fait foi : il est chargé au démarrage, alors que les fichiers par univers
   ne descendent qu'à la demande — s'en remettre à eux ici afficherait
   « rien à lire » sur un catalogue pourtant écrit. */
function ecritesLangue(){
  if(STATS && STATS.total && typeof STATS.total[S.lang] === 'number') return STATS.total[S.lang];
  return ecritesDe(null);
}
/* Combien d'anecdotes écrites, pour un univers ou pour tous, dans la langue
   affichée. Lu dans les fichiers déjà chargés : aucun appel réseau. */
function ecritesDe(uni){
  const compte = (id)=>{
    const w = written.get(S.lang + '|' + id);
    return w ? Object.keys(w).length : 0;
  };
  if(uni) return compte(uni);
  return THEMES.reduce((n, t) => n + compte(t.id), 0);
}
function buildVide(){
  const card = el('article','card');
  card.dataset.kind = 'lock';
  const wrap = el('div','lockwrap');
  wrap.appendChild(el('p','eyebrow','<span class="dot"></span>' + esc(T()['vide.eyebrow'])));
  wrap.appendChild(el('h3', null, T()['vide.title']));
  wrap.appendChild(el('p', null, T()['vide.body']));
  card.appendChild(wrap);
  return card;
}

function buildLock(reason){
  const node = el('article','card locked');
  node.dataset.kind = 'lock';
  const th = themeById(S.picked.find(id => !((themeById(id)||{}).free)) || 'histoire') || THEMES[2];
  const wrapMedia = el('div','card__media');
  const cv = el('canvas'); wrapMedia.appendChild(cv);
  node.appendChild(wrapMedia);
  paintCanvas(cv, th, 99);
  node.appendChild(el('div','card__scrim'));

  const wrap = el('div','lockwrap');
  const card = el('div','lockcard');
  card.appendChild(el('div','seal', ICON.lock));
  card.appendChild(el('h3', null, reason === 'quota' ? T().lockTitleQuota : T().lockTitle));
  card.appendChild(el('p', null, reason === 'quota' ? T().lockBodyQuota : T().lockBody));
  const cta = el('button','btn btn--brass btn--block', T().lockCta);
  cta.addEventListener('click', ()=> open('#paywall'));
  card.appendChild(cta);
  if(reason === 'theme'){
    const alt = el('button','btn btn--ghost btn--block', T().lockAlt);
    alt.style.marginTop = '10px';
    alt.addEventListener('click', ()=>{ S.picked = CONFIG.freeThemes.slice(); LS.set('curio.picked', S.picked); resetFeed(); });
    card.appendChild(alt);
  }
  wrap.appendChild(card);
  node.appendChild(wrap);
  return node;
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* Mise en forme minimale et sûre : **gras** et *italique*, rien d'autre.
   Le texte est échappé d'abord : aucune balise ne peut passer. */
function md(s){
  return esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«"'—-])\*([^*\n]+)\*(?=$|[\s.,;:!?)»"'—-])/g, '$1<em>$2</em>');
}

/* ============================ flux ============================ */
let filling = false, locked = false;

async function ensureAhead(){
  if(filling || locked) return;
  // Dépôt neuf : la carte « rien à lire » est la seule réponse honnête. Sans
  // ce garde-fou, setActive rappelait ensureAhead et empilait des fiches de
  // démonstration juste derrière elle — un catalogue vide qui a l'air plein.
  if(catalogueVide()) return;
  filling = true;
  try{
    // Deux fois le même sujet à la suite, c'est le défaut le plus visible d'un
    // catalogue encore mince : on saute ce qui est déjà dans le flux, et on
    // n'insiste pas au-delà de quelques tentatives.
    const deja = new Set(Array.from(feed.children)
      .map(c => c._item && (c._item.article || c._item.title)).filter(Boolean));
    let vains = 0;
    while(feed.children.length < activeIndex() + 4){
      if(S.plan === 'free'){
        const paidOnly = S.picked.length && S.picked.every(id => !(themeById(id)||{}).free);
        if(paidOnly){ feed.appendChild(buildLock('theme')); locked = true; break; }
      }
      const item = await fetchNext();
      // rien à servir (réseau coupé, aucune fiche de secours) : on s'arrête
      // plutôt que d'empiler des cartes vides
      if(!item){ if(!feed.children.length) feed.appendChild(buildVide()); break; }

      const cle = item.article || item.title;
      if(cle && deja.has(cle)){
        if(++vains >= 8) break;     // le catalogue ne peut plus rien proposer
        continue;
      }
      if(cle) deja.add(cle);
      vains = 0;

      const carte = buildCard(item);
      // quota épuisé : la fiche arrive directement en aperçu, jamais bloquée
      if(quotaEpuise()){
        carte.dataset.apercu = '1';
        carte.classList.add('apercu');
        carte._counted = true;
        fillText(carte, item);
        poserCadenas(carte);
      }
      feed.appendChild(carte);
    }
  } finally { filling = false; }
}

/* La journée offerte est-elle finie ? Une seule définition, partout. */
function quotaEpuise(){ return S.plan === 'free' && S.used >= CONFIG.freeDaily; }

/* Ferme les fiches non encore lues, sans en supprimer aucune : on continue de
   faire défiler, on voit le début de chaque sujet, et on peut remonter relire
   celles déjà ouvertes. Un mur opaque, lui, fait fermer l'application. */
function verrouillerSuite(){
  Array.from(feed.children).forEach(c=>{
    if(c.dataset.kind !== 'fact') return;
    if(c._counted || c.dataset.apercu === '1') return;
    c.dataset.apercu = '1';
    c.classList.add('apercu');
    if(c._item) fillText(c, c._item);
    poserCadenas(c);
  });
}

/* Le cadenas et l'appel à l'abonnement, posés sous l'aperçu estompé. */
function poserCadenas(node){
  if(node.querySelector('.gate')) return;
  const body = node.querySelector('.card__body');
  if(!body) return;
  ['.readmore','.dire','.endrow'].forEach(sel=>{ const e = body.querySelector(sel); if(e) e.remove(); });

  const g = el('div','gate');
  g.appendChild(el('span','gate__ico', ICON.lock));
  const tx = el('div','gate__tx');
  tx.appendChild(el('b', null, T()['tease.title']));
  tx.appendChild(el('span', null, T()['tease.body']));
  g.appendChild(tx);
  const cta = el('button','btn btn--brass btn--sm', T()['tease.cta']);
  cta.addEventListener('click', e=>{ e.stopPropagation(); open('#paywall'); });
  g.appendChild(cta);
  body.appendChild(g);
}

function activeIndex(){
  const cards = Array.from(feed.children);
  const i = cards.findIndex(c => c.classList.contains('is-active'));
  return i < 0 ? 0 : i;
}

function resetFeed(){
  feed.innerHTML = ''; locked = false; bag = {}; offlinePool = []; ready = [];
  feed.scrollTop = 0;
  if(catalogueVide()){ feed.appendChild(buildVide()); setActive(feed.firstElementChild); return; }
  ensureAhead().then(()=>{ const f = feed.firstElementChild; if(f) setActive(f); });
}

const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting && e.intersectionRatio > 0.6) setActive(e.target); });
}, { threshold:[0.6] });

const mo = new MutationObserver(muts=>{
  muts.forEach(m => Array.from(m.addedNodes).forEach(n => { if(n.nodeType===1) io.observe(n); }));
});
mo.observe(feed, { childList:true });

function setActive(node){
  Array.from(feed.children).forEach(c => c.classList.toggle('is-active', c === node));
  // une fiche en aperçu n'a pas été lue : elle ne consomme rien
  if(S.onboarded && node.dataset.kind === 'fact' && !node._counted && node.dataset.apercu !== '1'){
    node._counted = true;
    if(S.plan === 'free'){ S.used++; LS.set('curio.used', S.used); renderQuota(); }
    if(typeof peutEtreInstall === 'function') peutEtreInstall();
  }
  // le compteur est atteint : la suite passe en aperçu, on ne coupe pas le flux
  if(quotaEpuise()) verrouillerSuite();
  updateActive();
  if(node._item) enrich(node._item);
  const nx = node.nextElementSibling;
  if(nx && nx._item) enrich(nx._item);
  if(feed.children.length && Array.from(feed.children).indexOf(node) >= feed.children.length - 3) ensureAhead();
  // décharge les images lointaines
  const idx = Array.from(feed.children).indexOf(node);
  Array.from(feed.children).forEach((c,i)=>{
    const img = c.querySelector('.card__media img');
    if(!img) return;
    if(Math.abs(i - idx) > 4){ if(img.src){ img.dataset.src = img.src; img.removeAttribute('src'); img.classList.remove('ready'); } }
    else if(!img.getAttribute('src') && img.dataset.src){ img.src = img.dataset.src; }
  });
}

function current(){ return Array.from(feed.children).find(c => c.classList.contains('is-active')) || feed.firstElementChild; }

function updateActive(){
  const c = current();
  const it = c && c._item;
  if(c && c._fav && it) c._fav.classList.toggle('on', estFavori(it));
  const th = it ? themeById(it.theme) : themeById(activeThemes()[0]);
  if(th){
    $('#uniLabel').textContent = th[S.lang].name;
    $('#uniSw').style.background = `hsl(${th.hue} 62% 55%)`;
  }
}

/* ============================ quota ============================ */
/* Le statut du compte, affiché en clair à côté du nom. Trois états, et un
   seul mot pour chacun : on sait toujours où on en est. */
function renderPlanTag(){
  const n = $('#planTag'); if(!n) return;
  const p = S.plan;
  const nom = p === 'lifetime' ? T()['plan.life']
            : p === 'free'     ? T()['plan.free']
            :                    T()['plan.paid'];
  // En gratuit, la pastille porte aussi le reste du jour : sur un téléphone
  // c'est le seul endroit où l'information tient, et elle répond aux deux
  // questions à la fois — quelle formule, et combien il me reste.
  const reste = Math.max(0, CONFIG.freeDaily - S.used);
  n.innerHTML = esc(nom) + (p === 'free' ? '<i>' + reste + '</i>' : '');
  n.classList.toggle('paye', p === 'monthly' || p === 'yearly');
  n.classList.toggle('vie',  p === 'lifetime');
  n.classList.toggle('bas',  p === 'free' && reste <= 3);
  n.title = p === 'free' ? T()['plan.freeTip'] : T()['plan.paidTip'];
  // la jauge n'a plus de sens quand la lecture est illimitée
  const q = $('#quota'); if(q) q.hidden = (p !== 'free');
}

function renderQuota(){
  renderPlanTag();
  marquerVerrous();
  const box = $('#quota'), txt = $('#quotaTxt'), fill = $('#gaugeFill');
  if(S.plan !== 'free'){
    txt.innerHTML = '<b>' + T().unlimited + '</b>';
    fill.style.width = '100%'; box.classList.remove('low');
    return;
  }
  const left = Math.max(0, CONFIG.freeDaily - S.used);
  txt.innerHTML = T().quota(left);
  fill.style.width = (left / CONFIG.freeDaily * 100) + '%';
  box.classList.toggle('low', left <= 3);
}

/* Le sommaire et la recherche appartiennent à l'abonnement. En gratuit ils
   restent visibles, avec une pastille : on doit avoir envie de cliquer
   dessus — c'est la porte, pas un bouton grisé. */
function marquerVerrous(){
  const p = S.plan;
  const toc = $('#tocBtn'), rech = $('#searchBtn');
  if(toc){
    toc.classList.toggle('verrou', p === 'free');
    toc.title = T()[p === 'free' ? 'toc.locked' : 'toc.title'];
  }
  if(rech){
    rech.classList.toggle('verrou', p === 'free');
    rech.title = T()[p === 'free' ? 'search.locked' : 'find.title'];
  }
}

/* Une seule porte pour les deux : si l'accès est gratuit, on ouvre l'offre
   et on renvoie faux ; l'appelant n'a rien d'autre à décider. */
function abonnementRequis(){
  if(S.plan === 'free'){ open('#paywall'); return false; }
  return true;
}

/* ============================ univers ============================ */
function uniCard(t, container){
  const b = el('button','uni' + (S.picked.includes(t.id) ? ' sel' : ''));
  b.type = 'button';
  const cv = el('canvas'); b.appendChild(cv);
  b.appendChild(el('h3', null, esc(t[S.lang].name)));
  b.appendChild(el('p', null, esc(t[S.lang].desc)));
  // ce qui est écrit, pas ce qui est collecté — et rien tant qu'il n'y a rien
  const n = (STATS && STATS.byUniverse && STATS.byUniverse[t.id]
             && (STATS.byUniverse[t.id].sujets ?? STATS.byUniverse[t.id][S.lang])) || ecritesDe(t.id);
  if(n) b.appendChild(el('p','n', n + ' ' + (S.lang==='fr'?'anecdotes':'wonders')));
  b.addEventListener('click', ()=>{
    const i = S.picked.indexOf(t.id);
    if(i >= 0){ if(S.picked.length > 1) S.picked.splice(i,1); }
    else S.picked.push(t.id);
    LS.set('curio.picked', S.picked);
    renderUniverses();
  });
  container.appendChild(b);
  requestAnimationFrame(()=> paintCanvas(cv, t, hash(t.id)));
}
function renderUniverses(){
  ['#uniGrid','#obUniverses'].forEach(sel=>{
    const g = $(sel); if(!g) return;
    g.innerHTML = '';
    THEMES.forEach(t => uniCard(t, g));
  });
}
$('#uniAll').addEventListener('click', ()=>{
  if(S.plan === 'free'){ open('#paywall'); return; }
  S.picked = THEMES.map(t=>t.id); LS.set('curio.picked', S.picked); renderUniverses();
});
let pickedSnapshot = '';
$('#uniBtn').addEventListener('click', ()=>{ pickedSnapshot = S.picked.slice().sort().join(','); open('#uniSheet'); });
function applyPickedIfChanged(){
  if(!pickedSnapshot) return;
  const now = S.picked.slice().sort().join(',');
  if(now !== pickedSnapshot){ pickedSnapshot = now; resetFeed(); }
  pickedSnapshot = '';
}
$('#shuffleBtn').addEventListener('click', ()=>{
  S.picked = (S.plan === 'free') ? CONFIG.freeThemes.slice() : THEMES.map(t=>t.id);
  LS.set('curio.picked', S.picked); renderUniverses(); resetFeed();
  toast(T().picked(S.picked.length));
});

/* ============================ tarifs ============================ */
function renderPlans(){
  const box = $('#plans'); box.innerHTML = '';
  ['monthly','yearly','lifetime'].forEach(k=>{
    const p = CONFIG.prices[k];
    const card = el('div','plan' + (k==='lifetime' ? ' feature' : ''));
    if(k === 'lifetime') card.appendChild(el('span','tag', T().planTag));
    card.appendChild(el('h4', null, T().plansTitle[k]));
    card.appendChild(el('div','price',
      '<b>' + (S.lang==='fr' ? p.amount : p.amountEn) + '</b><span>' + (S.lang==='fr' ? p.unit : p.unitEn) + '</span>'));
    const ul = el('ul');
    T().planFeat[k].forEach(f => ul.appendChild(el('li', null,
      '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg><span>' + esc(f) + '</span>')));
    card.appendChild(ul);
    const btn = el('button','btn ' + (k==='lifetime' ? 'btn--brass' : 'btn--primary') + ' btn--block', T().planCta[k]);
    btn.addEventListener('click', ()=>{
      const link = CONFIG.checkout[k];
      if(link) window.open(link, '_blank', 'noopener');
      else toast(T().demo);
    });
    card.appendChild(btn);
    box.appendChild(card);
  });
}
$('#keyBtn').addEventListener('click', ()=>{
  const v = ($('#keyInput').value || '').trim().toUpperCase();
  if(/^CURIO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v)){
    unlock('lifetime');
    close(); resetFeed(); toast(T().activated);
  } else toast(T().badkey);
});

/* ============================ panneaux ============================ */
function open(sel){ $(sel).classList.add('open'); document.body.style.overflow='hidden'; }
function close(){
  const uniWasOpen = $('#uniSheet').classList.contains('open');
  $$('.sheet.open').forEach(s=>s.classList.remove('open'));
  document.body.style.overflow='';
  if(uniWasOpen && typeof applyPickedIfChanged === 'function') applyPickedIfChanged();
}
document.addEventListener('click', e=>{ if(e.target.closest('[data-close]')) close(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });

/* ============================ favoris ============================ */
function cleFavori(it){ return (it.theme || '') + '|' + (it.article || it.title); }
function estFavori(it){ return S.favs.some(f => (f.cle || f.url) === (cleFavori(it) || it.url)); }

function basculerFavori(it, node){
  if(!it) return;
  const cle = cleFavori(it);
  const i = S.favs.findIndex(f => (f.cle || f.url) === (cle || it.url));
  if(i >= 0){ S.favs.splice(i,1); toast(T().unsaved); }
  else {
    S.favs.unshift({
      cle, theme: it.theme,
      article: it.article || it.title,      // le sujet, pour rouvrir la fiche dans Curio
      title: it.title,
      extract: String(it.extract || '').slice(0, 220)
    });
    toast(T().saved);
  }
  LS.set('curio.favs', S.favs);
  if(node && node._fav) node._fav.classList.toggle('on', estFavori(it));
  majCollection();
}

async function partager(it){
  if(!it) return;
  const lien = location.origin + location.pathname;
  const payload = { title: 'Curio — ' + it.title, text: it.title, url: lien };
  try{
    if(navigator.share){ await navigator.share(payload); return; }
    await navigator.clipboard.writeText(it.title + ' — ' + lien);
    toast(T().copied);
  }catch(e){ /* annule */ }
}

function majCollection(){
  const d = $('#libDot');
  if(d) d.hidden = !S.favs.length;
}
$('#libBtn').addEventListener('click', ()=>{ renderLib(); open('#libSheet'); });
function renderLib(){
  const l = $('#libList'); l.innerHTML='';
  if(!S.favs.length){ l.appendChild(el('div','empty', T().emptyLib)); return; }
  S.favs.forEach(f=>{
    // On rouvre la fiche dans Curio. Le lecteur ne quitte jamais l'application.
    const b = el('button','item');
    const hue = (themeById(f.theme) || { hue:200 }).hue;
    b.innerHTML = '<span class="thumb" style="background:linear-gradient(135deg,hsl('+hue+' 40% 30%),hsl('+((hue+34)%360)+' 34% 16%))"></span>'
      + '<span class="tx"><h4>'+esc(f.title)+'</h4><p>'+esc(f.extract)+'</p></span>';
    b.addEventListener('click', ()=> openSubject(f.theme, f.article || f.title, false));
    l.appendChild(b);
  });
}

/* ============================ partage ============================ */


/* ============================ recherche ============================ */
$('#searchBtn').addEventListener('click', ()=>{
  if(!abonnementRequis()) return;
  open('#searchSheet'); setTimeout(()=>$('#qInput').focus(), 120);
});

/* La taille de lecture. Trois crans, mémorisés : quelqu'un qui a besoin de
   plus gros ne doit pas le redemander à chaque visite. */
(function tailleTexte(){
  const box = $('#sizer'), pop = $('#sizePop'), btn = $('#sizeBtn');
  if(!box) return;

  const appliquer = (v)=>{
    document.documentElement.style.setProperty('--lecture', String(v));
    box.querySelectorAll('button').forEach(b=> b.classList.toggle('on', b.dataset.size === String(v)));
    // le texte a changé de taille : l'invite « lire la suite » doit suivre
    requestAnimationFrame(()=> Array.from(feed.children).forEach(c=>{
      if(c._item) fillText(c, c._item);
    }));
  };
  appliquer(LS.get('curio.taille', '1'));

  box.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    LS.set('curio.taille', b.dataset.size);
    appliquer(b.dataset.size);
  });

  if(!pop || !btn) return;
  const fermer = ()=>{ pop.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };
  btn.addEventListener('click', e=>{
    e.stopPropagation();
    const ouvert = pop.classList.toggle('open');
    btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    if(ouvert){ const m = $('#tbMore'); if(m) m.classList.remove('open'); }
  });
  document.addEventListener('click', e=>{ if(!pop.contains(e.target) && !btn.contains(e.target)) fermer(); });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') fermer(); });
})();

/* La barre haute mesure sa propre hauteur : le titre d'une fiche ne peut
   plus passer dessous, quelle que soit la taille de l'écran ou du texte. */
(function hauteurBarre(){
  const tb = $('#topbar'); if(!tb) return;
  const maj = ()=> document.documentElement.style.setProperty('--barre', Math.ceil(tb.getBoundingClientRect().height) + 'px');
  maj();
  if(window.ResizeObserver) new ResizeObserver(maj).observe(tb);
  window.addEventListener('resize', maj);
  window.addEventListener('orientationchange', ()=> setTimeout(maj, 200));
})();

/* Le tiroir « … » de la barre haute : langue, thème, mélange, série. */
(function tiroir(){
  const b = $('#moreBtn'), m = $('#tbMore');
  if(!b || !m) return;
  const fermer = ()=>{ m.classList.remove('open'); b.setAttribute('aria-expanded','false'); };
  b.addEventListener('click', e=>{
    e.stopPropagation();
    const ouvert = m.classList.toggle('open');
    b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  });
  // le clic peut atterrir sur l'icône : on teste l'ancêtre, pas la cible exacte
  document.addEventListener('click', e=>{ if(!m.contains(e.target) && !b.contains(e.target)) fermer(); });
  m.addEventListener('click', e=>{ if(e.target.closest('button')) fermer(); });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') fermer(); });
})();
$('#qBtn').addEventListener('click', doSearch);
$('#qInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });

async function doSearch(){
  const q = $('#qInput').value.trim(); if(!q) return;
  const list = $('#qList'); list.innerHTML = '<div class="empty">'+T().searching+'</div>';
  if(offlineMode){
    await chargerDemo();
    const hits = OFFLINE.filter(o => (o[S.lang].ti+' '+o[S.lang].tx).toLowerCase().includes(q.toLowerCase()));
    list.innerHTML='';
    if(!hits.length){ list.appendChild(el('div','empty', T().noResult)); return; }
    hits.forEach(o => list.appendChild(resultRow({ theme:o.t, title:o[S.lang].ti, extract:o[S.lang].tx, img:'', url:'https://'+S.lang+'.wikipedia.org/wiki/'+encodeURIComponent(o.k), desc:'' })));
    return;
  }
  const url = 'https://' + S.lang + '.wikipedia.org/w/api.php?action=query&format=json&origin=*'
            + '&generator=search&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=10'
            + '&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=400';
  try{
    const r = await fetch(url); const j = await r.json();
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    list.innerHTML = '';
    if(!pages.length){ list.appendChild(el('div','empty', T().noResult)); return; }
    pages.sort((a,b)=>(a.index||0)-(b.index||0)).forEach(p=>{
      list.appendChild(resultRow({
        theme: activeThemes()[0], title:p.title, extract:trim(p.extract||''),
        img: p.thumbnail ? sized(p.thumbnail.source, 1280) : '',
        url: 'https://' + S.lang + '.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g,'_')),
        desc:''
      }));
    });
  }catch(e){
    goOffline();
    list.innerHTML = '<div class="empty">'+T().noResult+'</div>';
  }
}
function resultRow(item){
  const b = el('button','item');
  const hue = (themeById(item.theme)||{hue:200}).hue;
  b.innerHTML = '<span class="thumb" style="background:linear-gradient(135deg,hsl('+hue+' 40% 30%),hsl('+((hue+34)%360)+' 34% 16%))"></span>'
    + '<span class="tx"><h4>'+esc(item.title)+'</h4><p>'+esc(item.extract)+'</p></span>';
  b.addEventListener('click', ()=>{
    close();
    const card = buildCard(item);
    feed.insertBefore(card, feed.firstElementChild);
    feed.scrollTop = 0; setActive(card);
  });
  return b;
}

/* ============================ sommaire ============================ */
/* Rien ici ne compte le catalogue : ces chiffres n'ont plus de place côté
   lecteur. Le nombre de sujets collectés vit dans la vue Curation, qui est
   l'atelier, et nulle part ailleurs. */
function renderTocCount(){
  // Le grand chiffre ne compte QUE des anecdotes écrites, en sujets : « Lac
  // Nyos » rédigé en français et en anglais, c'est un. Tant que rien n'est
  // écrit, il n'y a pas de chiffre — on ne remplit pas le vide avec le
  // catalogue, qui n'est qu'une liste d'intentions.
  const n = statTotal();
  const loc = S.lang === 'fr' ? 'fr-FR' : 'en-US';
  $('#tocCount').textContent = n ? n.toLocaleString(loc) : '—';
  const lab = $('#tocLabel');
  if(lab) lab.textContent = T()['toc.total'];
  const w = statWeek();
  const badge = $('#tocNew');
  if(badge){
    if(w > 0){ badge.textContent = '+' + w; badge.hidden = false; badge.title = T()['toc.week'](w); }
    else badge.hidden = true;
  }
  $('#tocBtn').title = T()['toc.title'];
}

let tocShown = {};
/* Le sommaire ne liste QUE ce qui est réellement lisible : les anecdotes
   écrites. Jamais les sujets du catalogue — un lecteur ne doit pas voir neuf
   cents entrées quand il n'y a que vingt textes. */
let tocPrets = new Map();          // univers -> [{titre, accroche}]
async function tocCharger(){
  tocPrets = new Map();
  for(const t of THEMES){
    await loadWritten(S.lang, t.id);
    const w = written.get(S.lang + '|' + t.id);
    if(!w) continue;
    const items = Object.keys(w)
      .filter(k => w[k] && w[k].x && (w[k].s == null || w[k].s >= (CONFIG.minInsolite || 0)))
      .map(k => ({ titre:k, accroche: w[k].t || k }));
    if(items.length) tocPrets.set(t.id, items);
  }
}

function renderToc(){
  const q = ($('#tocQ').value || '').trim().toLowerCase();
  const box = $('#tocBody'); box.innerHTML = '';

  const loc = S.lang === 'fr' ? 'fr-FR' : 'en-US';
  const ecrites = statTotal();
  const w = statWeek();
  box.appendChild(el('p','toctotal',
    '<b>' + ecrites.toLocaleString(loc) + '</b><span>' + T()['toc.total'] + '</span>'
    + (w > 0 ? '<i class="fresh">+' + w + ' ' + T()['toc.weekShort'] + '</i>' : '')));

  if(!ecrites){ box.appendChild(el('p','tocnote', T()['toc.pending'])); return; }

  let hits = 0;
  THEMES.forEach(t=>{
    // uniquement ce qui est écrit
    const source = tocPrets.get(t.id) || [];

    const list = q
      ? source.filter(x => (x.titre + ' ' + x.accroche).toLowerCase().includes(q))
      : source;
    if(!list.length) return;
    hits += list.length;

    const g = el('div','tocgroup');
    const h = el('div','tochead');
    h.innerHTML = '<span class="sw" style="background:hsl('+t.hue+' 62% 55%)"></span>'
      + '<b>' + esc(t[S.lang].name) + '</b>'
      + '<span class="n">' + list.length + '</span>';
    g.appendChild(h);

    const cap = q ? 400 : (tocShown[t.id] || (prets ? 400 : 24));
    const wrap = el('div','toclist' + (prets ? ' toclist--rich' : ''));
    list.slice(0, cap).forEach(x=>{
      const b = el('button','toc', esc(x.accroche));
      b.addEventListener('click', ()=> openSubject(t.id, x.titre, false));
      wrap.appendChild(b);
    });
    g.appendChild(wrap);

    if(!q && list.length > cap){
      const more = el('button','tocmore', T()['toc.more'](list.length - cap));
      more.addEventListener('click', ()=>{ tocShown[t.id] = cap + 300; renderToc(); });
      g.appendChild(more);
    }
    box.appendChild(g);
  });

  if(!hits) box.appendChild(el('div','empty', T().noResult));
}

async function openSubject(themeId, title, lockedU){
  if(lockedU){ open('#paywall'); return; }
  close();
  toast(T().loading);
  let item = null;

  // 1) une anecdote redigee existe pour ce sujet : elle prime, meme hors ligne
  await loadWritten(S.lang, themeId);
  const w = writtenFor(S.lang, themeId, title);
  if(w && w.x){
    item = { theme:themeId, title:title, paras:[], extract:'', img:'', url:w.u || '', desc:'' };
    applyWritten(item, themeId);
  }

  if(!item && !offlineMode){
    try{
      const r = await wikiBatch(S.lang, [title]);
      if(r && r.length){
        item = { theme:themeId, title:r[0].title, paras:r[0].paras, extract:r[0].extract, img:r[0].img, url:r[0].url, desc:r[0].desc };
        await loadWritten(S.lang, themeId);
        applyWritten(item, themeId);
      }
    }catch(e){}
  }
  if(!item){
    const o = OFFLINE.find(x => x[S.lang].ti === title || x.k === title);
    item = o
      ? { theme:o.t, title:o[S.lang].ti, paras:o[S.lang].tx.split(/\n\n+/), extract:o[S.lang].tx, img:'', url:'https://'+S.lang+'.wikipedia.org/wiki/'+encodeURIComponent(o.k), desc:'' }
      : { theme:themeId, title:title, paras:[T().notLoaded], extract:T().notLoaded, img:'',
          url:'https://'+S.lang+'.wikipedia.org/wiki/'+encodeURIComponent(title.replace(/ /g,'_')), desc:'' };
  }
  markSeen(item.title);
  const card = buildCard(item);
  feed.insertBefore(card, feed.firstElementChild);
  feed.scrollTop = 0; setActive(card);
  enrich(item);
}

/* Le sommaire est la carte au trésor : il montre tout ce qui existe et permet
   d'aller droit sur n'importe quelle fiche. C'est précisément ce qu'on achète.
   En gratuit le chiffre reste visible — il donne envie — mais la liste ouvre
   sur l'offre. */
$('#tocBtn').addEventListener('click', async ()=>{
  if(!abonnementRequis()) return;
  tocShown = {}; $('#tocQ').value='';
  open('#tocSheet'); await tocCharger(); renderToc();
});
$('#tocQ').addEventListener('input', renderToc);

/* ============================ curation (accès privé) ============================
   app.html?curation=1 — la liste des SUJETS à faire écrire.

   L'unité est le sujet, pas la langue. La collecte résout chaque article en
   identifiant Wikidata et en rapporte le titre français et le titre anglais du
   même sujet : « Lac Nyos » et « Lake Nyos » sont une seule chose. La liste
   affiche donc **une ligne par sujet**, et cocher cette ligne fait écrire tout
   ce qui existe pour lui — les deux langues s'il est dans les deux, une seule
   s'il n'existe que là.

   Le compteur de sélection compte des sujets. L'estimation, elle, compte des
   textes : un sujet bilingue coûte deux rédactions. Les deux chiffres sont
   justes et ne disent pas la même chose.                                    */

let CUR = { rows: [], sel: new Set(), loaded: '', vue: [] };
let curRendu = new Map();            // index de ligne -> nœud posé dans le DOM
const curCache = new Map();          // "langue|titre" -> première phrase
let curBusy = false, curFile = [];

/* La clé d'un sujet : son univers et son titre canonique (le français quand il
   existe, l'anglais sinon). Elle ne dépend pas de la langue d'affichage. */
function curKey(r){ return r.cle; }

/* Dans quelle langue est écrite une phrase ? On compte les mots-outils : ils
   sont trop fréquents pour se tromper. Cela évite d'afficher dans la curation
   française une explication anglaise, qu'on ne peut pas juger. Les catalogues
   d'avant 7.3 ne notaient pas la langue de la phrase ; celui-ci le fait
   (champ `wl`), et pour les anciens on la devine. */
const MOTS_EN = /\b(the|and|of|which|that|with|was|were|is|are|has|have|from|its|his|her|their|been|after|before|only|world|first|known|about|into|until|while)\b/gi;
const MOTS_FR = /\b(le|la|les|des|une|dans|qui|que|pour|avec|est|sont|été|son|ses|leur|plus|par|sur|aux|elle|ne|pas|sans|dont|entre|jusqu)\b/gi;
function langueDeTexte(t){
  if(!t) return '';
  const en = (String(t).match(MOTS_EN) || []).length;
  const fr = (String(t).match(MOTS_FR) || []).length;
  if(en >= fr + 2) return 'en';
  if(fr >= en + 2) return 'fr';
  return '';
}

/* Une « face » : ce que l'on sait du sujet dans une langue donnée. */
function curFace(lang, titre, w, rang, n){
  const rec = w[titre];
  const sc  = SCORES[lang + '|' + titre] || null;
  const i   = rang.has(titre) ? rang.get(titre) : n;
  const phrase  = (sc && sc.w) || '';
  const lphrase = (sc && sc.wl) || langueDeTexte(phrase);
  return {
    lang, titre,
    redige: !!rec,
    // où en est cette fiche : rien / écrite / contrôlée / en ligne
    pub:    rec ? (rec.p || null) : null,
    ctrl:   rec ? (rec.v || '') : '',
    note: rec && rec.s != null ? rec.s : null,
    accroche: rec ? (rec.t || '') : '',
    apercu: rec ? String(rec.x).replace(/\*\*?/g,'').replace(/\s+/g,' ').slice(0, 190) : '',
    // pas de phrase, ou une phrase dans l'autre langue : on n'affiche rien,
    // et la ligne ira chercher l'introduction Wikipédia dans SA langue.
    pourquoi: (phrase && (!lphrase || lphrase === lang)) ? phrase : '',
    /* L'introduction gardée par la moisson. Elle est en français quand
       l'article français existe, et elle évite tout appel réseau : on peut
       juger trois mille sujets d'affilée, hors ligne, avant d'avoir dépensé
       le moindre centime. */
    apercuCat: (sc && sc.a && (!sc.al || sc.al === lang)) ? sc.a : '',
    cure: !!(sc && sc.c),
    phare: !!(sc && sc.f),
    // d'où vient ce sujet : phare (vous), insolite, saviez, categorie.
    // Les catalogues d'avant 7.6 ne le disent pas : on retombe sur `c`.
    origine: (sc && sc.o) || (sc && sc.c ? 'insolite' : 'categorie'),
    potentiel: sc ? sc.p : Math.max(1, Math.round(10 - 9 * (i / n)))
  };
}

/* Assemble une ligne à partir d'une face française, d'une face anglaise, ou
   des deux. Tout ce que la liste affiche en est dérivé. */
function curSujet(t, fr, en, source){
  const langs = [];
  if(fr) langs.push('fr');
  if(en) langs.push('en');
  const faces = langs.map(l => (l === 'fr' ? fr : en));
  // on montre le sujet dans la langue de l'interface quand il y existe
  const pref = (S.lang === 'fr' ? (fr || en) : (en || fr));
  const notes = faces.filter(f => f.note != null).map(f => f.note);

  return {
    uni: t.id, uniName: t[S.lang].name, hue: t.hue,
    cle: t.id + '|' + ((fr && fr.titre) || (en && en.titre)),
    fr, en, langs,
    titre:    pref.titre,
    accroche: pref.accroche,
    /* On ne montre QUE la langue affichée. Reprendre la phrase anglaise faute
       de française donnait des lignes qu'on ne peut pas juger — et pire, elle
       empêchait d'aller chercher l'introduction française, qui existe. Sans
       phrase dans la bonne langue, le champ reste vide et la ligne demande
       l'introduction à Wikipédia dans cette langue-là. */
    apercu:   pref.apercu   || '',
    pourquoi: pref.pourquoi || '',
    apercuCat: pref.apercuCat || (faces.map(f => f.apercuCat).filter(Boolean)[0] || ''),
    cure:      faces.some(f => f.cure),
    phare:     faces.some(f => f.phare),
    origine:   (faces.find(f => f.origine === 'phare') || faces.find(f => f.origine === 'saviez')
             || faces.find(f => f.origine === 'insolite') || faces[0] || {}).origine || 'categorie',
    potentiel: faces.reduce((m, f) => Math.max(m, f.potentiel || 0), 0),
    note:      notes.length ? Math.max.apply(null, notes) : null,
    redige:    faces.every(f => f.redige),        // tout ce qui existe est écrit
    /* L'état d'un sujet, du plus avancé au moins :
         publie      en ligne, le lecteur le voit
         reserve     écrit et contrôlé, il attend son tour
         quarantaine le contrôle l'a recalé
         retire      vous l'avez retiré
         ecrit       écrit mais pas encore contrôlé
         aecrire     rien encore                                          */
    etat: (function(){
      const aujd = new Date().toISOString().slice(0,10);
      if(!faces.some(f => f.redige)) return 'aecrire';
      if(faces.some(f => f.ctrl === 'retire')) return 'retire';
      if(faces.some(f => f.ctrl === 'quarantaine')) return 'quarantaine';
      if(faces.filter(f => f.redige).every(f => f.pub && String(f.pub) <= aujd)) return 'publie';
      if(faces.filter(f => f.redige).every(f => f.ctrl === 'ok')) return 'reserve';
      return 'ecrit';
    })(),
    reste:     langs.filter(l => !(l === 'fr' ? fr : en).redige),
    disp:      { lang: pref.lang, titre: pref.titre },
    source:    source || ''
  };
}

async function curLoad(){
  const signature = S.lang + ':' + SRC.length + ':' + CUR.rows.length;
  if(CUR.loaded === signature && CUR.rows.length) return;

  // Seize requêtes (huit univers × deux langues) : en série, cela fait une
  // bonne seconde d'attente sur un vrai réseau. En parallèle, une fraction.
  await Promise.all(THEMES.flatMap(t => [loadWritten('fr', t.id), loadWritten('en', t.id)]));

  CUR.rows = [];
  for(const t of THEMES){
    const wfr = written.get('fr|' + t.id) || {};
    const wen = written.get('en|' + t.id) || {};
    const lfr = (SOURCES[t.id] && SOURCES[t.id].fr) || [];
    const len = (SOURCES[t.id] && SOURCES[t.id].en) || [];

    const titresFr = new Set(lfr); Object.keys(wfr).forEach(x => titresFr.add(x));
    const titresEn = new Set(len); Object.keys(wen).forEach(x => titresEn.add(x));
    if(!titresFr.size && !titresEn.size) continue;

    // Le catalogue est trié par notoriété : à défaut de note mesurée, la
    // position dans la liste donne un ordre de grandeur.
    const rFr = new Map(lfr.map((x, i) => [x, i])), nFr = Math.max(1, lfr.length);
    const rEn = new Map(len.map((x, i) => [x, i])), nEn = Math.max(1, len.length);

    const apparies = new Set();
    titresFr.forEach(tf=>{
      const te = twinOf('fr', tf);
      let en = null;
      if(te && titresEn.has(te)){ apparies.add(te); en = curFace('en', te, wen, rEn, nEn); }
      CUR.rows.push(curSujet(t, curFace('fr', tf, wfr, rFr, nFr), en));
    });
    // les sujets que Wikipédia n'a qu'en anglais : une ligne, une langue
    titresEn.forEach(te=>{
      if(apparies.has(te)) return;
      CUR.rows.push(curSujet(t, null, curFace('en', te, wen, rEn, nEn)));
    });
  }

  // Vos propres adresses entrent dans la même liste, dans la langue affichée.
  SRC.forEach(x=>{
    const th = themeById(x.uni) || { id:x.uni, hue:200, fr:{name:x.uni}, en:{name:x.uni} };
    const face = { lang:S.lang, titre:x.titre, redige:false, note:null, accroche:'',
                   apercu:x.apercu || '', pourquoi:'', cure:false, potentiel:10 };
    CUR.rows.push(curSujet(th, S.lang === 'fr' ? face : null, S.lang === 'en' ? face : null, x.url));
  });

  CUR.loaded = S.lang + ':' + SRC.length + ':' + CUR.rows.length;
}

/* ---- vos propres sources : une adresse, un univers, et c'est dans la file ---- */
let SRC = LS.get('curio.sources', []);
function srcSauver(){ LS.set('curio.sources', SRC); }
function srcTitre(url){
  try{
    const u = new URL(url);
    const dernier = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(dernier).replace(/[_+-]+/g, ' ').replace(/\.\w{2,5}$/, '').trim() || u.hostname;
  }catch(e){ return url; }
}
function srcRender(){
  const box = $('#curSrcList'); if(!box) return;
  box.innerHTML = '';
  if(!SRC.length){ box.appendChild(el('div','empty', T()['cur.noSrc'])); return; }
  SRC.forEach((x, i)=>{
    const r = el('div','cursrc');
    r.innerHTML = '<span class="sw" style="background:hsl('+((themeById(x.uni)||{hue:200}).hue)+' 62% 55%)"></span>'
      + '<span class="tx"><b>' + esc(x.titre) + '</b><i>' + esc(x.url) + '</i></span>';
    const del = el('button','cursrc__x', '&times;');
    del.setAttribute('aria-label', T()['cur.rmSrc']);
    del.addEventListener('click', ()=>{ SRC.splice(i,1); srcSauver(); CUR.loaded = ''; srcRender(); });
    r.appendChild(del);
    box.appendChild(r);
  });
}

/* ---------------- la recherche ----------------
   « meduse » doit trouver « méduse », « nyos » doit trouver « Lac Nyos », et
   chercher « galaxie » doit remonter le Grand Attracteur même si le mot n'est
   pas dans son titre. On replie donc les accents, et on cherche dans TOUT ce
   qu'on sait du sujet : les deux titres, l'accroche, l'aperçu, la phrase du
   contributeur — dans les deux langues — et le nom de l'univers. */
function replier(t){
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .toLowerCase();
}
function curFoin(r){
  const bouts = [r.titre, r.uniName, r.accroche, r.pourquoi, r.apercuCat];
  [r.fr, r.en].forEach(x => { if(x) bouts.push(x.titre, x.accroche, x.apercu, x.pourquoi, x.apercuCat); });
  return replier(bouts.filter(Boolean).join(' '));
}

/* ---------------- filtrage et tri : produit la vue courante ---------------- */
function curFiltrer(){
  const q   = replier(($('#curQ').value || '').trim());
  const lg  = $('#curLang').value;
  const u   = $('#curUni').value;
  const et  = $('#curEtat').value;
  const tri = $('#curTri').value;

  let rows = CUR.rows.filter(r=>{
    if(u !== 'tous' && r.uni !== u) return false;
    // le filtre de langue porte sur l'EXISTENCE du sujet, pas sur l'affichage
    if(lg === 'fr'   && !r.fr) return false;
    if(lg === 'en'   && !r.en) return false;
    if(lg === 'solo' && r.langs.length !== 1) return false;
    if(et === 'redige' && !r.redige) return false;
    if(et === 'vierge' &&  r.redige) return false;
    if(et === 'phare'  && !r.phare)  return false;
    // les notes obtenues après écriture : c'est le seul jugement fiable
    if(et === 'n10' && !(r.note === 10)) return false;
    if(et === 'n9'  && !(r.note != null && r.note >= 9))  return false;
    if(et === 'n8'  && !(r.note != null && r.note >= 8))  return false;
    if(et === 'cure'   && r.origine !== 'insolite') return false;
    if(et === 'saviez' && r.origine !== 'saviez')   return false;
    if(et === 'categ'  && r.origine !== 'categorie') return false;
    if(et.startsWith('e-') && r.etat !== et.slice(2)) return false;
    if(et === 'fort'   && (r.potentiel || 0) < 7) return false;
    if(et === 'faible' && !(r.note != null && r.note <= 6)) return false;
    if(q){
      if(!curFoin(r).includes(q)) return false;
    }
    return true;
  });

  const parTitre = (a,b)=> a.titre.localeCompare(b.titre, S.lang);
  rows.sort(
    tri === 'titre'    ? parTitre
  : tri === 'univers'  ? (a,b)=> a.uniName.localeCompare(b.uniName) || parTitre(a,b)
  : tri === 'etat'     ? (a,b)=> (a.redige === b.redige ? (b.potentiel||0)-(a.potentiel||0) : (a.redige ? 1 : -1))
  : tri === 'insolite' ? (a,b)=> (b.note==null?-1:b.note) - (a.note==null?-1:a.note) || (b.potentiel||0)-(a.potentiel||0)
  :                      (a,b)=> (b.phare?1:0)-(a.phare?1:0) || (b.potentiel||0) - (a.potentiel||0) || parTitre(a,b)
  );
  return rows;
}

/* ---------------- la liste virtualisée ----------------
   Une ligne a toujours la même hauteur, fixée par le CSS (--curh) : la
   position de chacune se calcule, et le DOM ne porte que la fenêtre visible. */
const CUR_MARGE = 6;
let curH = 0;

function curMesurer(){
  if(curH) return curH;
  const list = $('#curList');
  const st = list ? getComputedStyle(list) : null;
  const h  = st ? parseFloat(st.getPropertyValue('--curh')) : NaN;
  const g  = st ? parseFloat(st.getPropertyValue('--curgap')) : NaN;
  curH = (h > 0 ? h : 118) + (g > 0 ? g : 8);
  return curH;
}

function curRender(){
  CUR.vue = curFiltrer();
  const list = $('#curList'), rail = $('#curRail');
  if(!list || !rail) return;

  rail.innerHTML = '';
  curRendu.clear();
  curFile.length = 0;
  curStats(CUR.vue.length);
  curCount();

  if(!CUR.vue.length){
    rail.style.height = 'auto';
    /* Un filtre de note qui ne rend rien alors qu'AUCUNE fiche n'est encore
       rédigée n'est pas un filtre cassé : la note n'existe qu'après
       l'écriture. Le dire, plutôt que d'afficher « aucun résultat » et de
       laisser chercher une panne qui n'existe pas. */
    const etat = ($('#curEtat') || {}).value;
    const surNote = etat === 'n8' || etat === 'n9' || etat === 'n10' || etat === 'faible';
    const rienEcrit = !CUR.rows.some(r => r.note != null);
    rail.appendChild(el('div','empty',
      (surNote && rienEcrit) ? T()['cur.noNote']
      : CUR.rows.length ? T().noResult : T()['cur.empty']));
    return;
  }

  curH = 0;
  const h = curMesurer();
  // entier : une hauteur en notation scientifique n'est pas une longueur CSS
  rail.style.height = Math.round(CUR.vue.length * h) + 'px';
  list.scrollTop = 0;
  curPeindre();
}

/* La feuille s'ouvre avec une animation : au premier rendu sa hauteur utile
   est encore nulle. On repeint dès que la taille réelle est connue. */
if(window.ResizeObserver){
  const ro = new ResizeObserver(()=>{ if(CUR.vue.length) curPeindre(); });
  const cible = $('#curList');
  if(cible) ro.observe(cible);
}

function curPeindre(){
  const list = $('#curList'), rail = $('#curRail');
  if(!list || !rail || !CUR.vue.length) return;
  const h = curH || curMesurer();

  // plancher : au premier rendu la feuille n'a pas encore sa hauteur
  const vue = Math.max(list.clientHeight, 360);
  const premier = Math.max(0, Math.floor(list.scrollTop / h) - CUR_MARGE);
  const combien = Math.ceil(vue / h) + CUR_MARGE * 2;
  const dernier = Math.min(CUR.vue.length - 1, premier + combien);

  curRendu.forEach((noeud, i)=>{
    if(i < premier || i > dernier){ noeud.remove(); curRendu.delete(i); }
  });
  const manquants = [];
  for(let i = premier; i <= dernier; i++){
    if(curRendu.has(i)) continue;
    const noeud = curLigne(CUR.vue[i], i);
    noeud.style.top = (i * h) + 'px';
    rail.appendChild(noeud);
    curRendu.set(i, noeud);
    /* On ne demande une introduction à Wikipédia que si on n'a VRAIMENT rien :
       depuis la version 8, la moisson garde déjà un aperçu français pour
       chaque sujet. Sans ce test, l'appel réseau écrasait l'aperçu stocké
       par « pas d'introduction disponible ». */
    if(!CUR.vue[i].apercu && !CUR.vue[i].pourquoi && !CUR.vue[i].apercuCat) manquants.push(noeud);
  }
  if(manquants.length) curFetchPreviews(manquants);
}

function curLigne(r, i){
  const key = curKey(r);
  const row = el('label','cur' + (CUR.sel.has(key) ? ' on' : ''));
  row.dataset.i = i;

  const box = el('span','curcheck');
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = CUR.sel.has(key);
  cb.addEventListener('change', ()=>{
    if(cb.checked) CUR.sel.add(key); else CUR.sel.delete(key);
    row.classList.toggle('on', cb.checked);
    curCount();
  });
  box.appendChild(cb);
  row.appendChild(box);

  // Les langues du sujet, l'une à côté de l'autre : pleine si le texte est
  // écrit, creuse s'il reste à écrire. Un sujet qui n'existe que dans une
  // langue n'en montre qu'une — et c'est l'information la plus utile ici.
  const drapeaux = r.langs.map(l=>{
    const f = (l === 'fr' ? r.fr : r.en);
    return '<b class="lg' + (f.redige ? ' lg--on' : '') + '" title="'
         + esc(f.titre) + '">' + l.toUpperCase() + '</b>';
  }).join('');

  const tx = el('span','curtx');
  tx.appendChild(el('span','curmeta',
      '<i class="sw" style="background:hsl('+r.hue+' 62% 55%)"></i>'
    + '<span class="curuni">' + esc(r.uniName) + '</span>'
    + drapeaux
    + (r.note != null ? '<b class="note">' + r.note + '/10</b>'
                      : '<b class="pot" title="' + esc(T()['cur.potTip']) + '"><span class="w">'
                        + T()['cur.pot'] + ' </span>' + (r.potentiel||1) + '/10</b>')
    + (r.phare  ? '<b class="phare">\u2605 ' + T()['cur.phare'] + '</b>' : '')
    + (r.origine === 'saviez'   ? '<b class="cure said">' + T()['cur.saviez'] + '</b>'
     : r.origine === 'insolite' ? '<b class="cure">' + T()['cur.cure'] + '</b>'
     : r.origine === 'categorie' && !r.phare ? '<b class="categ">' + T()['cur.categ'] + '</b>' : '')
    + '<b class="et et--' + r.etat + '">' + (T()['cur.et.' + r.etat] || r.etat) + '</b>'
    + (r.source ? '<b class="ext">' + T()['cur.mine'] + '</b>' : '')));
  tx.appendChild(el('h4', null, esc(r.accroche || r.titre)));
  if(r.accroche) tx.appendChild(el('p','curart', esc(r.titre)));

  // La phrase du contributeur, quand on l'a, vaut mieux qu'un aller-retour
  // réseau : elle dit pourquoi le sujet est étrange.
  // Quand la phrase vient du contributeur (et non de l'introduction de
  // Wikip\u00e9dia), on le montre : c'est elle qui dit pourquoi le sujet est
  // extraordinaire, et c'est elle qu'on lit pour trancher.
  const duContrib = !r.apercu && !!r.pourquoi;
  /* Ce qu'on lit sur la ligne, dans cet ordre : la fiche écrite si elle
     existe, sinon la phrase du contributeur — c'est elle qui dit pourquoi le
     sujet étonne —, sinon l'introduction gardée par la moisson. Tout est en
     français, tout est déjà là, rien n'est demandé au réseau. */
  const texte = r.apercu || r.pourquoi || r.apercuCat;
  const prev = el('p','curprev' + (duContrib ? ' curprev--w' : ''),
                  texte ? esc(texte) + (r.apercu ? '\u2026' : '')
                        : '<i class="curload">' + T()['cur.loading'] + '</i>');
  prev._row = r;
  tx.appendChild(prev);
  row._prev = prev;

  row.appendChild(tx);
  return row;
}

/* Les introductions manquantes sont chargées pour les seules lignes visibles,
   par paquets de vingt, et gardées en mémoire. */
async function curFetchPreviews(noeuds){
  noeuds.forEach(n => curFile.push(n._prev || n));
  if(curBusy) return;
  curBusy = true;
  try{
    while(curFile.length){
      const lot = curFile.splice(0, 20).filter(n => n && n.isConnected && n._row);
      if(!lot.length) continue;

      const reste = [];
      lot.forEach(n=>{
        const d = n._row.disp;
        if(curCache.has(d.lang + '|' + d.titre)) curShow(n, curCache.get(d.lang + '|' + d.titre));
        else reste.push(n);
      });
      if(!reste.length || offlineMode){ reste.forEach(n => curShow(n, '')); continue; }

      for(const lang of ['fr','en']){
        const pour = reste.filter(n => n._row.disp.lang === lang);
        if(!pour.length) continue;
        let by = new Map();
        try{ by = await curIntro(lang, pour.map(n => n._row.disp.titre)); }catch(e){}
        pour.forEach(n=>{
          const txt = by.get(n._row.disp.titre) || '';
          curCache.set(lang + '|' + n._row.disp.titre, txt);
          n._row.apercu = txt;
          curShow(n, txt);
        });
      }
    }
  } finally { curBusy = false; }
}

/* Requête légère : juste le début de l'article, sans image ni longueur
   minimale — un sujet court doit lui aussi pouvoir être jugé. */
async function curIntro(lang, titles){
  const by = new Map();
  const url = 'https://' + lang + '.wikipedia.org/w/api.php'
    + '?action=query&format=json&formatversion=2&origin=*&redirects=1'
    + '&prop=extracts&explaintext=1&exintro=1&exchars=320&exlimit=20'
    + '&titles=' + titles.slice(0,20).map(t=>encodeURIComponent(t)).join('%7C');
  const r = await fetch(url);
  if(!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const pages = (j.query && j.query.pages) || [];
  const list = Array.isArray(pages) ? pages : Object.keys(pages).map(k=>pages[k]);
  const back = new Map();
  ((j.query && j.query.redirects) || []).forEach(rd => back.set(rd.to, rd.from));
  list.forEach(pg=>{
    if(!pg || pg.missing || pg.invalid) return;
    const txt = String(pg.extract || '').replace(/\s+/g,' ').replace(/\.\.\.$/,'').trim();
    if(!txt) return;
    by.set(pg.title, txt);
    if(back.has(pg.title)) by.set(back.get(pg.title), txt);
  });
  return by;
}

function curShow(node, txt){
  if(!node.isConnected) return;
  node.innerHTML = txt ? esc(txt) + '…'
                       : '<i class="curload">' + T()['cur.noPreview'] + '</i>';
}

/* Le bandeau de tête. Tout est compté en SUJETS — sauf la dernière pastille,
   qui annonce le nombre de textes que la sélection fera écrire : c'est ce
   chiffre-là, et pas le nombre de sujets, que l'estimation facturera. */
function curStats(affichees){
  const box = $('#curStats'); if(!box) return;
  const total  = CUR.rows.length;
  const faits  = CUR.rows.filter(r => r.redige).length;
  const loc = S.lang === 'fr' ? 'fr-FR' : 'en-US';
  const bloc = (n, lab, cls) =>
    '<span class="cs ' + (cls||'') + '"><b>' + n.toLocaleString(loc) + '</b>' + lab + '</span>';
  box.innerHTML =
      bloc(faits, T()['cur.sDone'], 'cs--ok')
    + bloc(total - faits, T()['cur.sTodo'], '')
    + bloc(SRC.length, T()['cur.sMine'], '')
    + bloc(affichees, T()['cur.sShown'], 'cs--soft')
    + bloc(curTextes(), T()['cur.sTexts'], 'cs--brass');
}

/* Combien de textes la sélection représente. UN SUJET COCHÉ VAUT DEUX TEXTES,
   toujours : le français et l'anglais. Si Wikipédia ne l'a que dans une
   langue, l'autre est écrite à partir du même article — les faits sont les
   mêmes, seule la langue de rédaction change. On ne compte évidemment pas ce
   qui est déjà écrit. C'est l'unité de coût, et c'est ce que l'estimation
   facture. */
function curTextes(){
  let n = 0;
  CUR.rows.forEach(r=>{
    if(!CUR.sel.has(curKey(r))) return;
    n += 2;
    if(r.fr && r.fr.redige) n--;
    if(r.en && r.en.redige) n--;
  });
  return n;
}

function curCount(){
  $('#curCount').textContent = T()['cur.count'](CUR.sel.size, curTextes());
  curStats(CUR.vue.length);
}

/* Un CSV, une ligne par texte à écrire. Le sujet sélectionné y apparaît une
   fois par langue qui lui reste : c'est ce que l'action consomme. */
/* Deux lignes par sujet coché, toujours : « fr » et « en ». Quand l'article
   n'existe que dans une langue, la ligne de l'autre porte le même titre — la
   rédaction saura aller chercher l'article là où il est et écrire dans la
   langue demandée. Une ligne déjà rédigée porte « ecrire;non » : elle ne
   coûte rien et n'est pas réécrite. */
function curCsv(){
  const head = 'langue;univers;titre;insolite;potentiel;accroche;redige;source;ecrire';
  const lignes = [];
  CUR.rows.forEach(r=>{
    if(!CUR.sel.has(curKey(r))) return;
    ['fr','en'].forEach(l=>{
      const f = (l === 'fr' ? r.fr : r.en);
      const autre = (l === 'fr' ? r.en : r.fr);
      const titre = (f && f.titre) || (autre && autre.titre) || r.titre;
      lignes.push([
        l, r.uni, '"' + String(titre).replace(/"/g,'""') + '"',
        (f && f.note != null) ? f.note : '',
        (f && f.potentiel != null) ? f.potentiel : (r.potentiel || ''),
        '"' + ((f && f.accroche) || '').replace(/"/g,'""') + '"',
        (f && f.redige) ? 'oui' : 'non',
        r.source || '',
        (f && f.redige) ? 'non' : 'oui'
      ].join(';'));
    });
  });
  return '\ufeff' + [head].concat(lignes).join('\n') + '\n';
}

/* ---------------- l'habillage, traduit comme le reste ---------------- */
function curTraduire(){
  const t = T();
  const set = (sel, val)=>{ const n = $(sel); if(n) n.textContent = val; };
  const att = (sel, a, val)=>{ const n = $(sel); if(n) n.setAttribute(a, val); };

  set('#curTitle', t['cur.title']);
  set('#curSub',   t['cur.sub']);
  att('#curClose', 'aria-label', t['cur.close']);
  set('#curTabCat', t['cur.tabCat']);
  set('#curTabSrc', t['cur.tabSrc']);
  set('#curSrcHelp', t['cur.srcHelp']);
  set('#curSrcAdd', t['cur.srcAdd']);
  set('#curAll',  t['cur.selAll']);
  set('#curNone', t['cur.selNone']);
  set('#curCopy', t['cur.copyBtn']);
  set('#curDl',   t['cur.dlBtn']);

  const q = $('#curQ');
  if(q){ q.placeholder = t['cur.filter']; q.setAttribute('aria-label', t['cur.filterLb']); }
  att('#curSrcUrl', 'aria-label', t['cur.srcUrlLb']);
  att('#curSrcUni', 'aria-label', t['cur.srcUniLb']);
  att('#curUni', 'aria-label', t['cur.uniLb']);
  att('#curLang','aria-label', t['cur.langLb']);
  att('#curEtat','aria-label', t['cur.stateLb']);
  att('#curTri', 'aria-label', t['cur.sortLb']);

  const remplir = (sel, paires)=>{
    const n = $(sel); if(!n) return;
    const garde = n.value;
    n.innerHTML = paires.map(([v, lb]) => '<option value="'+v+'">'+esc(lb)+'</option>').join('');
    if(garde) n.value = garde;
  };
  remplir('#curLang', [['tous', t['cur.langAll']], ['fr', t['cur.langHasFr']],
                       ['en', t['cur.langHasEn']], ['solo', t['cur.langSolo']]]);
  remplir('#curEtat', [['tous', t['cur.stAll']], ['phare', t['cur.stPhare']], ['fort', t['cur.stStrong']], ['cure', t['cur.stCure']],
                       ['saviez', t['cur.stSaviez']], ['categ', t['cur.stCateg']],
                       ['e-publie', t['cur.et.publie']], ['e-reserve', t['cur.et.reserve']],
                       ['e-ecrit', t['cur.et.ecrit']], ['e-quarantaine', t['cur.et.quarantaine']],
                       ['e-aecrire', t['cur.et.aecrire']], ['e-retire', t['cur.et.retire']],
                       ['n10', t['cur.stN10']], ['n9', t['cur.stN9']], ['n8', t['cur.stN8']],
                       ['vierge', t['cur.stTodo']], ['redige', t['cur.stDone']], ['faible', t['cur.stWeak']]]);
  remplir('#curTri',  [['potentiel', t['cur.sortPot']], ['insolite', t['cur.sortNote']],
                       ['etat', t['cur.sortState']], ['titre', t['cur.sortTitle']], ['univers', t['cur.sortUni']]]);

  const uni = $('#curUni');
  if(uni){
    const garde = uni.value;
    uni.innerHTML = '<option value="tous">' + esc(t['cur.allUni']) + '</option>'
      + THEMES.map(x => '<option value="' + x.id + '">' + esc(x[S.lang].name) + '</option>').join('');
    if(garde) uni.value = garde;
  }
  const uniSrc = $('#curSrcUni');
  if(uniSrc) uniSrc.innerHTML = THEMES.map(x => '<option value="' + x.id + '">' + esc(x[S.lang].name) + '</option>').join('');
}

async function openCuration(){
  toast(T().loading);
  curTraduire();
  await curLoad();
  srcRender();
  curRender();
  open('#curSheet');
  requestAnimationFrame(()=>{ curH = 0; curRender(); });
}

/* Le changement de langue ne change plus quels sujets existent — seulement
   la langue dans laquelle on les lit. On reconstruit pour réafficher les
   titres et les univers dans la bonne langue ; la sélection est conservée,
   puisque sa clé ne dépend pas de la langue. */
function curLangueChangee(){
  curTraduire();
  CUR.loaded = '';
  const ouverte = $('#curSheet') && $('#curSheet').classList.contains('open');
  if(ouverte) curLoad().then(()=>{ srcRender(); curH = 0; curRender(); });
}

['curQ','curLang','curUni','curEtat','curTri'].forEach(id=>{
  const n = $('#' + id);
  if(n) n.addEventListener(id === 'curQ' ? 'input' : 'change', ()=>{ curH = 0; curRender(); });
});
$('#curList').addEventListener('scroll', ()=>{
  if(curPeindre._t) return;
  curPeindre._t = requestAnimationFrame(()=>{ curPeindre._t = 0; curPeindre(); });
});
window.addEventListener('resize', ()=>{
  if(!$('#curSheet').classList.contains('open')) return;
  curH = 0; curRender();
});

/* « Tout cocher » agit sur la vue entière, pas sur les lignes affichées. */
$('#curAll').addEventListener('click', ()=>{
  CUR.vue.forEach(r => CUR.sel.add(curKey(r)));
  curRendu.forEach(n=>{
    const cb = n.querySelector('input');
    if(cb){ cb.checked = true; n.classList.add('on'); }
  });
  curCount();
});
$('#curNone').addEventListener('click', ()=>{
  CUR.sel.clear();
  curRendu.forEach(n=>{
    const cb = n.querySelector('input');
    if(cb){ cb.checked = false; n.classList.remove('on'); }
  });
  curCount();
});

(function ongletsCuration(){
  const a = $('#curTabCat'), b = $('#curTabSrc');
  const pa = $('#curPanCat'), pb = $('#curPanSrc'), liste = $('#curList');
  if(!a || !b) return;
  const aller = (versSources)=>{
    a.classList.toggle('on', !versSources); b.classList.toggle('on', versSources);
    a.setAttribute('aria-selected', String(!versSources));
    b.setAttribute('aria-selected', String(versSources));
    pa.hidden = versSources; pb.hidden = !versSources;
    liste.hidden = versSources;
    if(versSources) srcRender();
  };
  a.addEventListener('click', async ()=>{
    aller(false);
    await curLoad();
    curH = 0; curRender();
  });
  b.addEventListener('click', ()=>aller(true));

  const ajouter = ()=>{
    const champ = $('#curSrcUrl');
    const brut = (champ.value || '').trim();
    if(!brut) return;
    const uni = $('#curSrcUni').value || THEMES[0].id;
    const urls = brut.split(/\s+/).filter(u => /^https?:\/\//i.test(u));
    if(!urls.length){ toast(T()['cur.badUrl']); return; }
    urls.forEach(u=>{
      if(SRC.some(x => x.url === u)) return;
      SRC.push({ url:u, uni, titre: srcTitre(u), apercu:'' });
    });
    srcSauver(); champ.value = '';
    CUR.loaded = '';
    srcRender();
    toast(T()['cur.addedSrc'](urls.length));
  };
  $('#curSrcAdd').addEventListener('click', ajouter);
  $('#curSrcUrl').addEventListener('keydown', e=>{ if(e.key === 'Enter') ajouter(); });
})();

/* Le chemin inverse de la sélection : vous ne cochez pas ce que vous voulez,
   vous cochez les quelques sujets dont vous ne voulez PAS. Un clic les met
   dans le presse-papiers au format de consignes/exclusions.txt — un titre par
   ligne, les deux langues — et « Entretien → purger » les sort du catalogue
   maître. C'est la façon rapide de trier trois mille sujets : on ne valide
   pas, on écarte. */
function curRefuses(){
  const out = [];
  CUR.rows.forEach(r=>{
    if(!CUR.sel.has(curKey(r))) return;
    if(r.fr && r.fr.titre) out.push(r.fr.titre);
    if(r.en && r.en.titre && (!r.fr || r.en.titre !== r.fr.titre)) out.push(r.en.titre);
  });
  return out;
}
(function(){
  const b = $('#curRefus'); if(!b) return;
  b.addEventListener('click', async ()=>{
    const l = curRefuses();
    if(!l.length){ toast(T()['cur.none'] || '—'); return; }
    const texte = l.join('\n') + '\n';
    try{ await navigator.clipboard.writeText(texte); }
    catch(e){
      const z = $('#curRaw'); if(z){ z.hidden = false; z.value = texte; z.focus(); z.select(); }
    }
    toast(T()['cur.refusOk'](l.length));
  });
})();

$('#curCopy').addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(curCsv()); toast(T()['cur.copied']); }
  catch(e){ toast(T()['cur.copyFail']); }
});
$('#curDl').addEventListener('click', ()=>{
  const csv = curCsv();
  // Certains contextes (aperçu en ligne, iPhone) refusent le téléchargement.
  // On tente, puis on propose systématiquement le texte à copier.
  let ok = false;
  try{
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'selection.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    ok = true;
  }catch(e){}
  const box = $('#curRaw');
  if(box){
    box.value = csv;
    box.hidden = false;
    box.focus(); box.select();
  }
  toast(ok ? T()['cur.dl'] : T()['cur.copyFail']);
});

/* ============================ navigation ============================ */
function go(dir){
  const cards = Array.from(feed.children);
  const i = cards.indexOf(current());
  const n = cards[i + dir];
  if(n) n.scrollIntoView({ behavior:'smooth', block:'start' });
}
document.addEventListener('keydown', e=>{
  if($$('.sheet.open').length) return;
  if(e.target.tagName === 'INPUT') return;
  if(e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown'){ e.preventDefault(); go(1); }
  if(e.key === 'ArrowUp' || e.key === 'PageUp'){ e.preventDefault(); go(-1); }
  const c0 = current();
  if((e.key === 'f' || e.key === 'F') && c0) basculerFavori(c0._item, c0);
  if((e.key === 's' || e.key === 'S') && c0) partager(c0._item);
});

/* ============================ audit du catalogue ============================
   app.html?audit=1 — vérifie chaque sujet du catalogue auprès de Wikipédia et
   affiche le nombre réellement utilisable. Aucune écriture : c'est une mesure. */
async function runAudit(){
  const box = $('#tocBody');
  $('#tocSheet').classList.add('open'); document.body.style.overflow='hidden';
  $('#tocQ').style.display = 'none';

  const groups = THEMES.map(t=>({ id:t.id, name:t[S.lang].name, hue:t.hue,
                                  list:((SOURCES[t.id]||{})[S.lang]||[]) }));
  const totalN = groups.reduce((n,g)=>n+g.list.length,0);
  let done = 0, ok = 0;
  const dead = [];

  const draw = () => {
    box.innerHTML = '';
    box.appendChild(el('p','toctotal',
      '<b>' + ok + '</b><span>' + T()['audit.ok'] + ' — ' + done + ' / ' + totalN + '</span>'));
    const g = el('div','gauge'); g.style.width='100%'; g.style.height='4px';
    g.innerHTML = '<i style="width:' + Math.round(done/totalN*100) + '%"></i>';
    box.appendChild(g);
    if(dead.length){
      const d = el('div','tocgroup');
      d.appendChild(el('div','tochead','<b>' + T()['audit.dead'](dead.length) + '</b>'));
      const w = el('div','toclist');
      dead.slice(0,300).forEach(x => w.appendChild(el('span','toc', esc(x))));
      d.appendChild(w); box.appendChild(d);
    }
  };
  draw();

  for(const g of groups){
    for(let i=0;i<g.list.length;i+=20){
      const batch = g.list.slice(i,i+20);
      try{
        const url = 'https://' + S.lang + '.wikipedia.org/w/api.php'
          + '?action=query&format=json&formatversion=2&origin=*&redirects=1'
          + '&prop=extracts|pageimages&explaintext=1&exintro=1&exlimit=20&pilimit=20'
          + '&piprop=thumbnail&pithumbsize=200'
          + '&titles=' + batch.map(encodeURIComponent).join('%7C');
        const j = await (await fetch(url)).json();
        const good = new Set();
        (j.query && j.query.pages || []).forEach(p=>{
          if(p.missing) return;
          const len = (p.extract||'').replace(/\s+/g,' ').trim().length;
          if(len < 320 || !p.thumbnail) return;
          good.add(p.title);
        });
        const back = new Map();
        ((j.query&&j.query.normalized)||[]).forEach(n=>back.set(n.to,n.from));
        ((j.query&&j.query.redirects)||[]).forEach(n=>back.set(n.to,n.from));
        good.forEach(t=>{ if(back.has(t)) good.add(back.get(t)); });
        batch.forEach(t=>{ if(good.has(t)) ok++; else dead.push(g.name + ' · ' + t); });
      }catch(e){
        batch.forEach(t=>dead.push(g.name + ' · ' + t));
      }
      done += batch.length;
      draw();
      await new Promise(r=>setTimeout(r,60));
    }
  }
  draw();
  box.appendChild(el('p','fineprint', T()['audit.done']));
}

/* ============================ démarrage ============================ */
$('#obStart').addEventListener('click', ()=>{
  S.onboarded = true; LS.set('curio.onboarded', true);
  close(); resetFeed();
});

let toastT;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 2400);
}

function unlock(plan){
  S.plan = plan || 'lifetime'; LS.set('curio.plan', S.plan);
  S.picked = THEMES.map(t=>t.id); LS.set('curio.picked', S.picked);
  renderQuota(); renderUniverses(); renderTocCount();
}

/* Fin d'abonnement : on revient au gratuit, et rien d'autre ne bouge.
   La collection est conservée, les fiches déjà ouvertes restent lisibles
   hors ligne, et le compteur quotidien repart de zéro. */
function relock(){
  S.plan = 'free'; LS.set('curio.plan', 'free');
  S.used = 0; LS.set('curio.used', 0);
  renderQuota(); renderUniverses(); renderTocCount(); renderPlans();
  toast(T()['plan.back']);
}
// ?pro=1 débloque tout (test) — ?pro=0 revient à la version gratuite
(function testUnlock(){
  const q = new URLSearchParams(location.search).get('pro');
  if(q === '1' || q === 'true'){ unlock('lifetime'); }
  else if(q === '0'){ relock(); }
})();

/* La version est gravée dans une balise <meta> par build.sh : on l'affiche
   telle quelle. Le numéro lisible suffit à l'écran, l'empreinte complète
   reste dans l'infobulle pour un diagnostic précis. */
(function afficherVersion(){
  const m = document.querySelector('meta[name="curio-version"]');
  const v = m && m.getAttribute('content');
  const n = $('#tbVer');
  if(!n || !v) return;
  n.textContent = 'v' + v.split('+')[0];
  n.title = 'Curio ' + v;
})();

$('#streakN').textContent = S.streak;
applyTheme(); applyLang(); renderPlans(); renderUniverses(); renderQuota(); renderTocCount();

const AUDIT = new URLSearchParams(location.search).get('audit') === '1';
/* déplacé en tête : filtrerPubliees() en a besoin dès le premier chargement */
if(CURATION){
  // accès privé : le compteur ouvre la curation au lieu du sommaire
  $('#tocBtn').addEventListener('click', e=>{ e.stopImmediatePropagation(); openCuration(); }, true);
}

/* ==================== installation sur l'écran d'accueil ====================
   Curio n'est pas distribué par un magasin d'applications : il s'installe
   depuis le navigateur. Le service worker rend l'ouverture instantanée et la
   lecture possible hors ligne ; le bandeau ci-dessous explique le geste, une
   seule fois, et seulement aux gens qui ne l'ont pas déjà fait.           */
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

const installe = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let promptInstall = null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); promptInstall = e; proposerInstall();
});

function proposerInstall(){
  if(installe() || LS.get('curio.install', false)) return;
  if(document.querySelector('.install')) return;

  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  if(!promptInstall && !iOS) return;             // rien à proposer sur ce navigateur

  const box = el('div','install');
  box.innerHTML =
      '<div class="install__tx"><b>' + T()['inst.title'] + '</b>'
    + '<span>' + (promptInstall ? T()['inst.body'] : T()['inst.ios']) + '</span></div>';

  const ferme = el('button','install__x');
  ferme.setAttribute('aria-label', T()['inst.later']);
  ferme.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"'
                  + ' stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  ferme.addEventListener('click', ()=>{ LS.set('curio.install', true); box.remove(); });

  if(promptInstall){
    const go = el('button','install__go', T()['inst.cta']);
    go.addEventListener('click', async ()=>{
      const p = promptInstall; promptInstall = null;
      LS.set('curio.install', true);
      box.remove();
      try{ await p.prompt(); }catch(e){}
    });
    box.appendChild(go);
  }
  box.appendChild(ferme);
  document.body.appendChild(box);
}

// on ne dérange personne au premier écran : la proposition arrive après
// quelques anecdotes lues, quand l'intérêt est établi.
function peutEtreInstall(){
  if(S.onboarded && S.used >= 3) proposerInstall();
}

// Les deux fichiers d'état sont attendus avant le premier remplissage :
// index.json dit ce qui est écrit, catalog.json ce qui est collecté. Décider
// sans le premier revient à afficher « rien à lire » sur un site pourtant
// alimenté.
Promise.all([loadStats(), loadCatalog()]).finally(()=>{
  if(AUDIT){ S.onboarded = true; LS.set('curio.onboarded', true); resetFeed(); runAudit(); return; }
  // Accès privé : on lève le compteur pour CETTE session seulement. L'ancienne
  // version appelait unlock('lifetime'), qui écrivait le plan « à vie » dans
  // le navigateur : une seule visite ici et on ne revoyait plus jamais
  // l'expérience gratuite, ni le paywall, sur cet appareil.
  if(CURATION){
    S.onboarded = true; LS.set('curio.onboarded', true);
    S.plan = 'lifetime';                       // en mémoire, pas dans localStorage
    renderQuota(); renderPlans();
    resetFeed(); openCuration(); return;
  }
  if(!S.onboarded){ open('#onboard'); ensureAhead(); }
  else { resetFeed(); }
});
})();
</script>
