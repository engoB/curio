<script>
(function(){
'use strict';
const $ = s => document.querySelector(s);
const el = (t,c,h)=>{const n=document.createElement(t);if(c)n.className=c;if(h!=null)n.innerHTML=h;return n;};
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---- prix : gardez ces valeurs alignées sur app.html / index.html ---- */
const PRICES = {
  monthly:{fr:['4,99','€ / mois'],en:['4.99','€ / month']},
  yearly:{fr:['39','€ / an'],en:['39','€ / year']},
  lifetime:{fr:['79','€ une fois'],en:['79','€ once']}
};
const CHECKOUT = { monthly:'', yearly:'', lifetime:'' };

const UNIS = [
  {id:'cosmos',h:196,free:1,fr:["Cosmos","Nous tombons vers un point du ciel que personne n'a jamais vu.",28],en:["Cosmos","We are falling towards a point in the sky nobody has ever seen.",28]},
  {id:'vivant',h:148,free:1,fr:["Le Vivant","Certains animaux refusent de mourir. D’autres pilotent les vivants.",28],en:["Living World","Some animals refuse to die. Others drive the living.",28]},
  {id:'histoire',h:28,free:1,fr:["Histoire oubliée","Un pape jugé neuf mois après sa mort. Ce n’est pas une légende.",28],en:["Forgotten History","A pope tried nine months after his death. This is not a legend.",28]},
  {id:'esprit',h:320,free:1,fr:["Corps & Esprit","Des gens voient sans le savoir. D’autres ne voient rien en fermant les yeux.",28],en:["Body & Mind","Some people see without knowing it. Others see nothing when they close their eyes.",28]},
  {id:'sciences',h:262,free:1,fr:["Sciences & Inventions","Il avait raison sur ce qui tuait les mères. On l’a interné.",28],en:["Science & Invention","He was right about what was killing the mothers. They committed him.",28]},
  {id:'mysteres',h:8,free:1,fr:["Mystères","Un homme sur une plage, toutes les étiquettes découpées, aucun nom.",28],en:["Mysteries","A man on a beach, every label cut out, no name.",28]},
  {id:'terre',h:178,free:1,fr:["Terre & Océans","Un lac a soufflé une nuit. Mille sept cent quarante-six personnes dormaient.",28],en:["Earth & Oceans","A lake exhaled one night. One thousand seven hundred and forty-six people were asleep.",28]},
  {id:'arts',h:44,free:1,fr:["Arts & Civilisations","Une couleur que les peintres ont enterrée dans un jardin.",28],en:["Art & Civilisations","A colour painters buried in a garden.",28]}
];

const DEMO_MIN = '2 min';
const DEMO = [
  {id:'cosmos',h:196,
   fr:['Cosmos','Nous tombons vers quelque chose d’invisible',
       "Notre galaxie ne dérive pas au hasard. La Voie lactée, tout le Groupe local et des milliers de galaxies voisines se déplacent dans la même direction, à <b>600 kilomètres par seconde</b>, vers un point unique du ciel situé à 250 millions d’années-lumière.<br><br>Le problème, c’est qu’on ne peut pas le regarder : ce point se trouve derrière le plan de notre propre galaxie, une bande de poussière si dense que les astronomes l’appellent la zone d’évitement."],
   en:['Cosmos','We are falling toward something invisible',
       "Our galaxy is not drifting at random. The Milky Way, the entire Local Group and thousands of neighbouring galaxies are moving in the same direction, at <b>600 kilometres per second</b>, toward a single point 250 million light-years away.<br><br>The problem is that we cannot look at it: the point sits behind the plane of our own galaxy, a band of dust so dense astronomers call it the Zone of Avoidance."]},

  {id:'histoire',h:28,
   fr:['Histoire oubliée','Quatre cents personnes dansent jusqu’à en mourir',
       "En juillet 1518, à Strasbourg, une femme sort dans la rue et se met à danser. Sans musique, sans s’arrêter. En un mois, ils sont <b>quatre cents</b>.<br><br>Les médecins de la ville concluent à un « sang trop chaud » et décident que le remède est de danser davantage. On dégage deux halles, on bâtit une estrade, on engage des musiciens. L’épidémie s’aggrave immédiatement."],
   en:['Forgotten History','Four hundred people danced themselves to death',
       "In July 1518, in Strasbourg, a woman stepped into the street and began to dance. No music, no stopping. Within a month there were <b>four hundred</b>.<br><br>The town physicians diagnosed 'hot blood' and decided the cure was more dancing. Two guild halls were cleared, a stage was built, musicians were hired. The epidemic got worse."]},

  {id:'vivant',h:148,
   fr:['Le Vivant','La méduse qui refuse de vieillir',
       "Turritopsis dohrnii mesure moins de cinq millimètres. Blessée ou affamée, elle se rétracte et ses cellules <b>changent de nature</b> : un muscle peut redevenir un neurone. En quelques jours, elle est redevenue un polype juvénile.<br><br>Le cycle est théoriquement répétable sans fin. Elle est biologiquement immortelle — pas invulnérable : elle est mangée comme tout le monde."],
   en:['Living World','The jellyfish that refuses to age',
       "Turritopsis dohrnii is under five millimetres across. Injured or starved, it contracts and its cells <b>change identity</b>: a muscle cell can become a nerve cell. Within days it is a juvenile polyp again.<br><br>The cycle can in theory repeat forever. It is biologically immortal — not invulnerable: it gets eaten like everything else."]},

  {id:'terre',h:178,
   fr:['Terre & Océans','Le lac qui a soufflé',
       "Sous le lac Nyos, une poche magmatique charge l’eau profonde en gaz carbonique, maintenu dissous par la pression. Le lac se remplit comme un soda que personne n’ouvre.<br><br>Le 21 août 1986, tout sort d’un coup : <b>1,6 million de tonnes</b> en quelques secondes. Le nuage dévale les vallées à 70 km/h, sans bruit et sans odeur, et tue 1 746 personnes dans leur sommeil."],
   en:['Earth & Oceans','The lake that exhaled',
       "Beneath Lake Nyos, a magma pocket loads the deep water with carbon dioxide, held dissolved by pressure. The lake fills like a soda nobody opens.<br><br>On 21 August 1986 it all came out at once: <b>1.6 million tonnes</b> in seconds. The cloud rolled down the valleys at 70 km/h, silent and odourless, and killed 1,746 people in their sleep."]},

  {id:'mysteres',h:8,
   fr:['Mystères','Tamám Shud, c’est fini',
       "Un homme mort sur une plage australienne, 1948. Costume soigné, rasé de frais, aucun papier. <b>Toutes les étiquettes de ses vêtements ont été découpées.</b><br><br>Dans une poche cousue à l’intérieur de sa ceinture, un morceau de papier arraché d’un recueil de poésie persane, portant deux mots : « c’est fini ». Le livre a été retrouvé. La page manquait."],
   en:['Mysteries','Tamám Shud, it is ended',
       "A dead man on an Australian beach, 1948. Well-cut suit, freshly shaved, no papers. <b>Every label had been cut from his clothes.</b><br><br>In a pocket sewn inside his waistband, a scrap torn from a book of Persian poetry bearing two words: 'it is ended'. The book was found. The page was missing."]},

  {id:'sciences',h:262,
   fr:['Sciences & Inventions','La goutte de verre qui explose par la queue',
       "Une goutte de verre en fusion tombée dans l’eau froide encaisse le marteau, la presse hydraulique, <b>et même une balle</b>. Sa surface refroidie comprime son cœur avec une force énorme.<br><br>Pincez la queue, et l’objet entier se pulvérise. La fracture file à 1 900 mètres par seconde, cinq fois la vitesse du son."],
   en:['Science & Invention','The glass drop that explodes by its tail',
       "A bead of molten glass quenched in cold water shrugs off a hammer, a hydraulic press, <b>even a bullet</b>. Its chilled surface compresses the core with enormous force.<br><br>Snip the tail and the whole thing turns to powder. The fracture races at 1,900 metres per second, five times the speed of sound."]}
];

/* ── LES QUESTIONS QU'ON SE POSE VRAIMENT ──────────────────────────────────
   Cinq entrées, pas neuf. Quatre ont été retirées : celle sur la réalité du
   compteur, qui soulevait elle-même un doute que personne n'avait ; celle sur
   la proposition de sujets, qui promettait un échange à assurer ; celle sur
   l'installation, qui répondait « non, et c'est voulu » alors que
   l'application se propose désormais d'elle-même ; et celle sur le hors ligne,
   détail technique qu'on ne se demande pas avant d'avoir essayé.

   Les deux dernières disent maintenant la vérité du modèle : cinq anecdotes
   par jour qui repartent le lendemain, et un abonnement qui, s'il s'arrête,
   ramène à cette version gratuite. */
const FAQ = {
  fr:[
    ["Qui écrit les anecdotes ?",
     "Chaque fiche est écrite pour __MARQUE__ à partir de faits vérifiés, puis relue une par une avant d'être publiée. Ce ne sont pas des extraits recopiés : ce sont des textes, avec une accroche, une explication et une chute."],
    ["Comment sont choisis les sujets ?",
     "Un sujet n'entre dans __MARQUE__ que s'il coche deux cases : il est assez connu pour parler à quelqu'un, et assez étrange pour valoir d'être raconté. Chaque candidat reçoit une note d'insolite ; en dessous d'un certain seuil, il n'est pas écrit. C'est pour cela que vous ne tomberez pas sur une fiche de définition ni sur une biographie plate."],
    ["Que contient la version gratuite ?",
     "Cinq anecdotes par jour, tirées au hasard dans les huit univers — aucun n'est fermé. Elles sont à vous pour la journée : le lendemain, cinq autres arrivent et les précédentes s'en vont. Celles que vous gardez dans votre collection, elles, restent lisibles. Sans compte, sans publicité."],
    ["Quelle différence entre l'abonnement et l'achat à vie ?",
     "L'abonnement se règle au mois ou à l'année et se résilie quand vous voulez, en un clic. L'achat à vie est un paiement unique : le catalogue entier vous reste ouvert pour toujours, y compris tout ce qui sera écrit après votre achat."],
    ["Si je m'abonne aujourd'hui, j'ai accès à tout ?",
     "Oui : tout le catalogue publié, plus tout ce qui paraîtra pendant votre abonnement, sans compteur ni limite de journée. Si vous arrêtez, vous revenez à la version gratuite et à ses cinq anecdotes du jour — rien n'est effacé, votre collection reste, et vous retrouvez le catalogue entier le jour où vous reprenez. L'achat à vie, lui, ne s'arrête pas."]
  ],
  en:[
    ["Who writes the pieces?",
     "Every piece is written for __MARQUE__ from verified facts, then read one by one before it goes live. These are not copied extracts: they are written texts, with an opening, an explanation and a turn."],
    ["How are subjects chosen?",
     "A subject only enters __MARQUE__ if it clears two bars: well known enough to mean something to someone, strange enough to be worth telling. Each candidate gets a strangeness score, and below a threshold it never gets written. That is why you will not land on a dictionary definition or a flat biography."],
    ["What is in the free version?",
     "Five pieces a day, drawn at random from all eight universes — none is closed off. They are yours for the day: tomorrow five others arrive and these are gone. The ones you keep in your collection stay readable. No account, no ads."],
    ["Subscription or lifetime — what changes?",
     "The subscription is billed monthly or yearly and can be cancelled in one click. Lifetime is a single payment: the whole catalogue stays open to you for good, including everything written after you buy."],
    ["If I subscribe today, do I get everything?",
     "Yes: the whole published catalogue, plus everything that appears while you subscribe, with no counter and no daily limit. If you stop, you go back to the free version and its five pieces of the day — nothing is deleted, your collection stays, and the whole catalogue is there again the day you resume. Lifetime does not stop."]
  ]
};


const TXT = {
  fr:{
    tag:'Le monde est plus étrange', nav1:'Univers', nav2:'Tarifs', nav3:'Questions',
    kicker:'Une anecdote à la fois',
    h1:'Le monde est <em>plus étrange</em> que vous ne le pensez.',
    sub:"Des faits vrais, écrits pour être lus : deux minutes par anecdote, une par écran, huit univers. Pas de fil sans fin, pas de publicité, rien à faire défiler pour rien.",
    cta1:'Essayer gratuitement', cta2:'Voir les formules',
    r1:'5 anecdotes offertes chaque jour', r2:'Aucune inscription', r3:'Sans publicité',
    howEye:'Comment ça marche', howTitle:'Trois gestes, et le savoir devient une habitude.',
    howLead:"__MARQUE__ n'est pas une encyclopédie de plus. C'est un rythme : quelque chose de vrai, de court et de mémorable, chaque jour.",
    s1t:'Choisissez vos univers', s1p:"Cosmos, vivant, histoire oubliée, mystères… Vous composez le flux qui vous ressemble, et vous le modifiez quand vous voulez.",
    s2t:'Deux minutes, une histoire entière',
    s2p:"Une anecdote par écran : l'accroche, ce qu'on ne savait pas, la chute. On la lit debout dans le métro, et le soir on la raconte à quelqu'un.",
    s3t:'Gardez ce qui vous marque', s3p:"Un geste pour ajouter à votre collection, un autre pour partager. Votre série de jours consécutifs vous ramène chaque matin.",
    uEye:'Les univers', uTitle:'Huit mondes, des sujets choisis pour ce qu’ils racontent.',
    uLead:"Les huit sont ouverts, dès la version gratuite. Ce qui change avec l'abonnement, c'est la durée : cinq anecdotes qui repartent le lendemain, ou tout le catalogue, quand vous voulez.",
    pEye:'Tarifs', pTitle:'Payez une fois, ou chaque mois. Jamais avec votre attention.',
    pLead:"Pas de publicité, pas de revente de données, pas de flux « recommandé » qui vous garde captif. Juste un abonnement honnête — ou un achat définitif.",
    pNote:"Paiement sécurisé, résiliable à tout moment, sans justification. L'achat à vie inclut les huit univers et toutes les anecdotes à venir. Aucune publicité, aucune revente de données.",
    fEye:'Questions', fTitle:"Ce qu'on nous demande le plus souvent.",
    fin1:"Vous avez appris quelque chose aujourd'hui ?", fin2:"Cinq anecdotes vous attendent aujourd'hui. Elles ne coûtent rien.", fin3:'Ouvrir __MARQUE__',
    foot1:'Anecdotes écrites et vérifiées une par une.',
    planName:{monthly:'Mensuel',yearly:'Annuel',lifetime:'À vie'},
    planTag:'Le meilleur rapport',
    freeName:'Gratuit', freeUnit:'€ pour toujours', freeCta:'Commencer maintenant',
    freeFeat:['5 anecdotes par jour, renouvelées chaque matin','Les 8 univers, aucun fermé','Ce que vous gardez reste relisible','Sans compte, sans publicité'],
    planCta:{monthly:"S'abonner",yearly:"S'abonner",lifetime:'Acheter à vie'},
    feat:{
      monthly:['Lecture illimitée','La pioche : une anecdote au hasard','Nouveautés chaque semaine','Sans engagement'],
      yearly:['Lecture illimitée','La pioche : une anecdote au hasard','Nouveautés chaque semaine','Deux mois offerts'],
      lifetime:['Lecture illimitée, pour toujours','La pioche : une anecdote au hasard','Toutes les anecdotes à venir','Un seul paiement']
    },
    soon:'Lien de paiement à configurer'
  },
  en:{
    tag:'The world is stranger', nav1:'Universes', nav2:'Pricing', nav3:'Questions',
    kicker:'One wonder at a time',
    h1:'The world is <em>stranger</em> than you think.',
    sub:'True things, written to be read: two minutes per piece, one per screen, eight universes. No endless feed, no advertising, nothing to scroll past.',
    cta1:'Try it free', cta2:'See the plans',
    r1:'5 free wonders every day', r2:'No sign-up', r3:'No ads',
    howEye:'How it works', howTitle:'Three gestures, and knowing becomes a habit.',
    howLead:'__MARQUE__ is not another encyclopedia. It is a rhythm: something true, short and memorable, every day.',
    s1t:'Pick your universes', s1p:'Cosmos, living world, forgotten history, mysteries… You compose the stream that suits you, and change it whenever you like.',
    s2t:'Two minutes, a whole story',
    s2p:"One piece per screen: the hook, the thing you did not know, the turn. You read it standing on the train, and that evening you tell someone.",
    s3t:'Keep what strikes you', s3p:'One tap to add to your collection, one to share. Your daily streak brings you back each morning.',
    uEye:'The universes', uTitle:'Eight worlds, subjects picked for what they tell.',
    uLead:'All eight are open, from the free version. What the subscription changes is how long they last: five pieces that are gone tomorrow, or the whole catalogue, whenever you like.',
    pEye:'Pricing', pTitle:'Pay once, or every month. Never with your attention.',
    pLead:'No ads, no data resale, no “recommended” feed engineered to keep you scrolling. Just an honest subscription — or a one-off purchase.',
    pNote:'Secure payment, cancel anytime, no questions asked. Lifetime covers all eight universes and every piece still to come. No advertising, no data resale.',
    fEye:'Questions', fTitle:'What people ask us most.',
    fin1:'Learned something today?', fin2:'Five wonders are waiting today. They cost nothing.', fin3:'Open __MARQUE__',
    foot1:'Written and checked one by one.',
    planName:{monthly:'Monthly',yearly:'Yearly',lifetime:'Lifetime'},
    planTag:'Best value',
    freeName:'Free', freeUnit:'€ forever', freeCta:'Start now',
    freeFeat:['5 pieces a day, renewed every morning','All 8 universes, none locked','What you keep stays readable','No account, no ads'],
    planCta:{monthly:'Subscribe',yearly:'Subscribe',lifetime:'Buy lifetime'},
    feat:{
      monthly:['Unlimited reading','The draw: one piece at random','New pieces every week','No commitment'],
      yearly:['Unlimited reading','The draw: one piece at random','New pieces every week','Two months free'],
      lifetime:['Unlimited reading, forever','The draw: one piece at random','Every piece still to come','One single payment']
    },
    soon:'Checkout link to configure'
  }
};

/* ── LES LANGUES PUBLIÉES, GRAVÉES DANS LA PAGE ────────────────────────────
   Votre réglage « langues » de consignes/publication.txt est inscrit dans
   l'en-tête du document à la construction. La page le connaît donc AVANT
   d'avoir touché le réseau : si vous ne publiez que le français, le bouton
   FR/EN n'apparaît pas une seule seconde, même si index.json est absent,
   même hors ligne. index.json, quand il arrive, peut le corriger — les deux
   viennent du même fichier, ils ne se contredisent pas. */
function metaListe(nom){
  const m = document.querySelector('meta[name="' + nom + '"]');
  const v = m && m.content ? String(m.content).split(',').map(s=>s.trim()).filter(Boolean) : [];
  return v.length ? v : null;
}
const LANGUES_GRAVEES = metaListe('curio-langues');

let lang = (localStorage.getItem('curio.lang') ? JSON.parse(localStorage.getItem('curio.lang')) : ((navigator.language||'fr').toLowerCase().startsWith('fr')?'fr':'en'));
if(LANGUES_GRAVEES && LANGUES_GRAVEES.length === 1) lang = LANGUES_GRAVEES[0];
let theme = (localStorage.getItem('curio.theme') ? JSON.parse(localStorage.getItem('curio.theme')) : 'dark');
/* Le jeu de couleurs — « bleu » ou « origine » — est le MÊME réglage que dans
   l'application : même clé de stockage, donc le site et l'application ne se
   contredisent jamais. */
let palette = 'bleu';
try{ const v = localStorage.getItem('curio.palette'); if(v) palette = JSON.parse(v); }catch(e){}

/* ---------------- art procédural ---------------- */
function paint(cv, hue, seed, dense){
  const w = cv.width = cv.clientWidth * 1.4 || 600, h = cv.height = cv.clientHeight * 1.4 || 800;
  const c = cv.getContext('2d');
  let s = (seed>>>0) || 7;
  const rnd = ()=> (s = (s*1664525 + 1013904223)>>>0) / 4294967296;
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  const L1 = dark ? 13 : 92, L2 = dark ? 5 : 97;
  const H = (hh,ss,ll,a)=> 'hsla(' + ((hh%360+360)%360).toFixed(0) + ',' + ss + '%,' + ll.toFixed(1) + '%,' + a.toFixed(3) + ')';

  const g = c.createLinearGradient(0,0,w*0.6,h);
  g.addColorStop(0, H(hue,46,L1+8,1));
  g.addColorStop(.55, H(hue+22,34,L1,1));
  g.addColorStop(1, H(hue+40,26,L2,1));
  c.fillStyle=g; c.fillRect(0,0,w,h);

  const r = c.createRadialGradient(w*.72,h*.26,10,w*.72,h*.26,w*.95);
  r.addColorStop(0, H(hue,80,dark?58:70,dark?.32:.28));
  r.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=r; c.fillRect(0,0,w,h);

  c.lineWidth = 1;
  for(let i=0;i<26;i++){
    c.strokeStyle = H(hue,60,dark?78:24,0.03+rnd()*0.06);
    c.beginPath(); c.arc(w*.72,h*.26,60+i*46+rnd()*18,0,Math.PI*2); c.stroke();
  }
  const n = dense || 380;
  for(let i=0;i<n;i++){
    c.fillStyle = H(hue,40,dark?96:12,0.05+rnd()*0.4);
    c.beginPath(); c.arc(rnd()*w,rnd()*h,rnd()*1.7,0,Math.PI*2); c.fill();
  }
}

/* ---------------- rendu ---------------- */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', theme);
  if(palette === 'origine') document.documentElement.setAttribute('data-palette','origine');
  else document.documentElement.removeAttribute('data-palette');
  const pb = $('#paletteBtn');
  if(pb) pb.textContent = palette === 'origine' ? 'ENCRE' : 'BLEU';
  $('#thIcon').innerHTML = theme==='dark'
    ? '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>'
    : '<path d="M20 14.4A8.4 8.4 0 019.6 4 8.4 8.4 0 1020 14.4z"/>';
  repaint();
}
function repaint(){
  paint($('#heroBg'), 196, 11, 500);
  paint($('#finalBg'), 44, 23, 420);
  paint($('#phBg'), DEMO[idx].h, 101+idx, 420);
  document.querySelectorAll('.uni canvas').forEach((cv,i)=> paint(cv, UNIS[i].h, 31+i*7, 220));
}

function render(){
  const t = TXT[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(n=>{ const v=t[n.dataset.t]; if(typeof v==='string') n.textContent=v; });
  document.querySelectorAll('[data-th]').forEach(n=>{ const v=t[n.dataset.th]; if(typeof v==='string') n.innerHTML=v; });
  paintCount();
  $('#langBtn').textContent = lang.toUpperCase();
  /* Une seule langue publiée : le bouton n'a nulle part où mener. */
  if(LANGUES_GRAVEES && LANGUES_GRAVEES.length === 1) $('#langBtn').hidden = true;

  // univers
  const g = $('#unis'); g.innerHTML='';
  UNIS.forEach((u,i)=>{
    const d = u[lang];
    const b = el('div','uni');
    b.appendChild(el('canvas'));
    b.appendChild(el('h3',null,esc(d[0])));
    b.appendChild(el('p',null,esc(d[1])));
    // « sujets » d'abord : c'est le nombre de choses, pas de titres
    // ce qui est écrit dans cet univers — rien tant qu'il n'y a rien
    const bloc = COUNTS && COUNTS[u.id];
    const cnt = bloc ? (bloc.sujets ?? bloc[lang]) : null;
    if(cnt) b.appendChild(el('p','n', cnt.toLocaleString(lang==='fr'?'fr-FR':'en-US') + ' ' + (lang==='fr'?'anecdotes':'wonders')));
    // Les huit univers sont ouverts : un tag dirait une chose fausse.
    g.appendChild(b);
  });

  // tarifs
  const p = $('#plans'); p.innerHTML='';

  // Le gratuit a sa place dans la grille : c'est une offre, pas un manque.
  const carteGratuite = el('div','plan plan--free');
  carteGratuite.appendChild(el('h4',null,t.freeName));
  carteGratuite.appendChild(el('div','price','<b>0</b><span>'+t.freeUnit+'</span>'));
  const listeGratuite = el('ul');
  t.freeFeat.forEach(f=> listeGratuite.appendChild(el('li',null,'<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg><span>'+esc(f)+'</span>')));
  carteGratuite.appendChild(listeGratuite);
  const boutonGratuit = el('button','btn btn--ghost btn--block', t.freeCta);
  boutonGratuit.addEventListener('click',()=> window.open('app.html','_blank','noopener'));
  carteGratuite.appendChild(boutonGratuit);
  p.appendChild(carteGratuite);

  ['monthly','yearly','lifetime'].forEach(k=>{
    const card = el('div','plan'+(k==='lifetime'?' feature':''));
    if(k==='lifetime') card.appendChild(el('span','tag',t.planTag));
    card.appendChild(el('h4',null,t.planName[k]));
    card.appendChild(el('div','price','<b>'+PRICES[k][lang][0]+'</b><span>'+PRICES[k][lang][1]+'</span>'));
    const ul = el('ul');
    t.feat[k].forEach(f=> ul.appendChild(el('li',null,'<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg><span>'+esc(f)+'</span>')));
    card.appendChild(ul);
    const btn = el('button','btn '+(k==='lifetime'?'btn--brass':'btn--primary')+' btn--block', t.planCta[k]);
    btn.addEventListener('click',()=>{ if(CHECKOUT[k]) window.open(CHECKOUT[k],'_blank','noopener'); else { btn.textContent = t.soon; setTimeout(()=>btn.textContent=t.planCta[k],1800); } });
    card.appendChild(btn);
    p.appendChild(card);
  });

  // faq
  const f = $('#faqList'); f.innerHTML='';
  FAQ[lang].forEach((q,i)=>{
    const d = el('details'); if(i===0) d.open = true;
    d.innerHTML = '<summary>'+esc(q[0])+'</summary><p>'+esc(q[1])+'</p>';
    f.appendChild(d);
  });

  // points du téléphone
  const dd = $('#phDots'); dd.innerHTML='';
  DEMO.forEach(()=> dd.appendChild(el('i')));
  showDemo(idx, true);
  repaint();
}

let idx = 0;
function showDemo(i, silent){
  idx = i;
  const d = DEMO[i][lang];
  const bd = $('.deck__body');
  $('#phTheme').textContent = d[0];
  $('#phMin').textContent   = DEMO_MIN;
  $('#phTitle').textContent = d[1];
  $('#phText').innerHTML    = d[2];
  Array.from($('#phDots').children).forEach((n,j)=> n.classList.toggle('on', j===i));
  paint($('#phBg'), DEMO[i].h, 101+i, 420);
  if(!silent){ bd.classList.remove('fade-swap'); void bd.offsetWidth; bd.classList.add('fade-swap'); }
}

$('#langBtn').addEventListener('click', ()=>{
  lang = lang==='fr'?'en':'fr';
  try{ localStorage.setItem('curio.lang', JSON.stringify(lang)); }catch(e){}
  render();
});
(function(){
  const b = $('#paletteBtn'); if(!b) return;
  b.addEventListener('click', ()=>{
    palette = palette === 'origine' ? 'bleu' : 'origine';
    try{ localStorage.setItem('curio.palette', JSON.stringify(palette)); }catch(e){}
    applyTheme();
  });
})();

$('#themeBtn').addEventListener('click', ()=>{
  theme = theme==='dark'?'light':'dark';
  try{ localStorage.setItem('curio.theme', JSON.stringify(theme)); }catch(e){}
  applyTheme();
});

/* Un seul chiffre, et il vient d'un seul endroit : anecdotes/index.json,
   c'est-à-dire les textes réellement écrits et publiés — comptés en SUJETS,
   une anecdote rédigée en français et en anglais valant un.

   Le catalogue de sujets n'apparaît nulle part sur cette page. C'est une
   liste d'intentions, pas un stock ; l'annoncer reviendrait à vendre ce qui
   n'existe pas encore. Tant que rien n'est écrit, la page ne promet aucune
   quantité — exactement ce que dit sa propre FAQ.                          */
let VERIFIED = null, COUNTS = null, WEEK = 0;
async function loadCount(){
  // Rien d'autre que les anecdotes réellement écrites. Le catalogue de sujets
  // n'est pas un stock : c'est une liste d'intentions, et l'annoncer serait
  // vendre ce qui n'existe pas. Tant qu'il n'y a rien d'écrit, la page ne
  // promet aucun chiffre — et c'est exactement ce que dit sa FAQ.
  try{
    const r = await fetch('anecdotes/index.json', { cache:'no-cache' });
    if(!r.ok) return;
    const j = await r.json();
    // « sujets » : une anecdote rédigée en français ET en anglais compte pour un
    const n = j?.total?.sujets ?? j?.total?.[lang];
    if(typeof n === 'number' && n > 0){
      VERIFIED = n;
      WEEK = j?.weekly?.sujets ?? j?.weekly?.[lang] ?? 0;
      if(j.byUniverse) COUNTS = j.byUniverse;
    }
    /* Tant qu'une seule langue est publiée, le bouton FR/EN ne mène nulle
       part : le site l'efface et s'aligne sur la langue qui existe. Le
       réglage explicite — « langues » dans consignes/publication.txt, recopié
       ici par les outils — prime, car il vaut avant toute publication. */
    const nFr = Number(j?.total?.fr || 0), nEn = Number(j?.total?.en || 0);
    const reglees = (Array.isArray(j?.langues) && j.langues.length) ? j.langues : LANGUES_GRAVEES;
    const seule = (reglees && reglees.length === 1) ? reglees[0]
                : (nFr > 0 && nEn === 0) ? 'fr'
                : (nEn > 0 && nFr === 0) ? 'en' : '';
    const b = $('#langBtn');
    if(b) b.hidden = !!seule;
    if(seule && lang !== seule){
      lang = seule;
      try{ localStorage.setItem('curio.lang', JSON.stringify(lang)); }catch(e){}
    }
    render();
  }catch(e){}
}
function paintCount(){
  if(!VERIFIED) return;              // on n'annonce rien qu'on ne puisse montrer
  const fr = lang === 'fr';
  const n = VERIFIED.toLocaleString(fr ? 'fr-FR' : 'en-US');
  const k = $('#kicker');
  if(k) k.innerHTML = '<b>' + n + '</b><span>' + (fr ? 'anecdotes' : 'wonders') + '</span>'
    + (WEEK > 0 ? '<i>+' + WEEK + ' ' + (fr ? 'cette semaine' : 'this week') + '</i>' : '');
  const t = document.querySelector('[data-t="uTitle"]');
  if(t) t.textContent = fr ? 'Huit mondes, ' + n + ' anecdotes écrites.'
                           : 'Eight worlds, ' + n + ' written wonders.';
  const s2 = document.querySelector('[data-t="uLead"]');
  if(s2) s2.textContent = fr
    ? "Les huit sont ouverts, dès la version gratuite. Ce qui change avec l'abonnement, c'est la durée : cinq anecdotes qui repartent le lendemain, ou tout le catalogue et son sommaire, quand vous voulez."
    : 'All eight are open, from the free version. What the subscription changes is how long they last — five pieces that are gone tomorrow, or the whole catalogue and its contents list, whenever you like.';
}

$('#yr').textContent = new Date().getFullYear();
document.documentElement.setAttribute('data-theme', theme);
if(palette === 'origine') document.documentElement.setAttribute('data-palette','origine');
render(); applyTheme(); loadCount();

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce) setInterval(()=> showDemo((idx+1)%DEMO.length), 5200);
let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(repaint, 200); });
})();
</script>
