<script>
/* =========================================================================
   CURIO — configuration
   Branchez vos liens de paiement ici (Stripe Payment Links, Lemon Squeezy,
   Gumroad, Paddle…). Voir README.md.
   ========================================================================= */
const CONFIG = {
  // ── LA JOURNÉE OFFERTE ──────────────────────────────────────────────
  // Cinq anecdotes, tirées au hasard chaque matin dans les huit univers, à
  // lire jusqu'à minuit. Le lendemain, cinq autres, et celles de la veille
  // ne sont plus accessibles. Une même anecdote ne peut pas revenir avant
  // deux mois (MEMOIRE_JOURS, dans 30-app.js).
  //
  // Ce n'est plus un compteur qu'on épuise, c'est une journée qu'on habite :
  // le gratuit donne une vraie raison de revenir demain, et l'abonnement une
  // vraie raison de ne pas attendre.
  freeDaily: 5,
  freeThemes: ['cosmos','vivant','histoire','esprit','sciences','mysteres','terre','arts'],
  // Catalogue étendu généré par tools/build-catalog.mjs (facultatif).
  // Absent => l'app utilise uniquement les listes SOURCES ci-dessous.
  catalogUrl: 'catalog.json',
  // Longueur visée de l'aperçu immédiat (l'introduction), en caractères.
  textTarget: 1700,
  textMin: 320,
  // Longueur visée du repli extractif, quand aucune anecdote rédigée n'existe.
  fullTarget: 4200,
  // Anecdotes rédigées, produites par tools/write-anecdotes.mjs.
  // Un fichier par langue et par univers : anecdotes/fr-cosmos.json
  anecdotesDir: 'anecdotes',
  // Note minimale « insolite » (0 à 10) pour qu'une anecdote entre dans le flux.
  // 7 est le seuil du « tiens donc » : en dessous, c'est intéressant mais
  // attendu, et ce n'est pas ce qu'on vient chercher ici. Le texte reste
  // dans le dépôt — vous ne perdez rien, vous ne le servez plus.
  minInsolite: 7,
  checkout: {
    monthly:  '',   // ex. https://buy.stripe.com/xxxx
    yearly:   '',
    lifetime: ''
  },
  prices: {
    monthly:  { amount: '4,99', unit: '€ / mois',  amountEn: '4.99', unitEn: '€ / month' },
    yearly:   { amount: '39',   unit: '€ / an',    amountEn: '39',   unitEn: '€ / year'  },
    lifetime: { amount: '79',   unit: '€ une fois', amountEn: '79',  unitEn: '€ once'    }
  }
};

/* ---------------- univers ----------------
   Une description d'univers n'énumère pas : elle donne envie d'ouvrir.
   Une phrase, une image concrète, et on s'arrête là.                    */
const THEMES = [
  { id:'cosmos', hue:196, free:true,
    fr:{name:'Cosmos', desc:"Nous tombons vers un point du ciel que personne n'a jamais vu."},
    en:{name:'Cosmos', desc:'We are falling towards a point in the sky nobody has ever seen.'} },
  { id:'vivant', hue:148, free:true,
    fr:{name:'Le Vivant', desc:'Certains animaux refusent de mourir. D’autres pilotent les vivants.'},
    en:{name:'Living World', desc:'Some animals refuse to die. Others drive the living.'} },
  { id:'histoire', hue:28, free:true,
    fr:{name:'Histoire oubliée', desc:'Un pape jugé neuf mois après sa mort. Ce n’est pas une légende.'},
    en:{name:'Forgotten History', desc:'A pope tried nine months after his death. This is not a legend.'} },
  { id:'esprit', hue:320, free:true,
    fr:{name:'Corps & Esprit', desc:'Des gens voient sans le savoir. D’autres ne voient rien en fermant les yeux.'},
    en:{name:'Body & Mind', desc:'Some people see without knowing it. Others see nothing when they close their eyes.'} },
  { id:'sciences', hue:262, free:true,
    fr:{name:'Sciences & Inventions', desc:'Il avait raison sur ce qui tuait les mères. On l’a interné.'},
    en:{name:'Science & Invention', desc:'He was right about what was killing the mothers. They committed him.'} },
  { id:'mysteres', hue:8, free:true,
    fr:{name:'Mystères', desc:'Un homme sur une plage, toutes les étiquettes découpées, aucun nom.'},
    en:{name:'Mysteries', desc:'A man on a beach, every label cut out, no name.'} },
  { id:'terre', hue:178, free:true,
    fr:{name:'Terre & Océans', desc:'Un lac a soufflé une nuit. Mille sept cent quarante-six personnes dormaient.'},
    en:{name:'Earth & Oceans', desc:'A lake exhaled one night. One thousand seven hundred and forty-six people were asleep.'} },
  { id:'arts', hue:44, free:true,
    fr:{name:'Arts & Civilisations', desc:'Une couleur que les peintres ont enterrée dans un jardin.'},
    en:{name:'Art & Civilisations', desc:'A colour painters buried in a garden.'} }
];

/* ---------------- graines : sujets Wikipédia intégrés ----------------
   Ces listes sont la base garantie de l'application : elles sont dans le code,
   donc jamais perdues, et fonctionnent même sans catalog.json.
   Le catalogue généré (catalog.json) vient S'AJOUTER à ces listes.
   Un titre inexistant est ignoré silencieusement à l'exécution.          */
const SOURCES = {
  /* Vide, volontairement. Ce dépôt ne contient aucun sujet pré-écrit : le
     catalogue est celui que VOUS constituez avec l'action « 1-collecter ».
     Chaque exécution ajoute ses sujets dans catalog.json, que l'application
     charge au démarrage et fusionne ici.                                  */
  cosmos:   { fr:[], en:[] },
  vivant:   { fr:[], en:[] },
  histoire: { fr:[], en:[] },
  esprit:   { fr:[], en:[] },
  sciences: { fr:[], en:[] },
  mysteres: { fr:[], en:[] },
  terre:    { fr:[], en:[] },
  arts:     { fr:[], en:[] }
};


/* ---------------- anecdotes intégrées ----------------
   Dépôt vierge : aucune fiche n'a encore été écrite.                     */
const BUILTIN = {};

/* ---------------- collection embarquée (hors ligne) ----------------
   Les 32 fiches de démonstration ne sont plus dans le code : elles vivent
   dans demo.json, à la racine, et ne sont chargées que dans un seul cas —
   le réseau tombe alors qu'aucune anecdote n'a encore été téléchargée.

   Elles n'apparaissent JAMAIS dans un dépôt vierge : un catalogue vide doit
   avoir l'air vide. Supprimez demo.json si vous n'en voulez pas du tout ;
   l'application s'en passe sans rien casser.                            */
const OFFLINE = [];
const OFFLINE_URL = 'demo.json';

/* ---------------- i18n ---------------- */
const I18N = {
  fr:{
    tagline:'Le monde est plus étrange que vous ne le pensez', scroll:'Faire défiler', shuffle:'Tout mélanger',
    offline:'Collection embarquée',
    'ob.kicker':'Une anecdote à la fois',
    'ob.title':'Le monde est <em>plus étrange</em> que vous ne le pensez.',
    'ob.sub':"Des faits vrais, écrits pour être lus : deux minutes par anecdote, une par écran. Choisissez vos univers pour commencer.",
    'ob.cta':'Commencer à explorer',
    'ob.note':'5 anecdotes offertes chaque jour, renouvel\u00e9es chaque matin. Aucune inscription requise.',
    'uni.title':'Vos univers','uni.sub':'Sélectionnez les mondes qui alimentent votre flux. Vous pouvez en combiner autant que vous voulez.',
    'uni.apply':'Appliquer','uni.all':'Tout sélectionner',
    'pay.title':'Passez en illimité','pay.sub':"Plus de compteur quotidien. Vous lisez autant que vous voulez, et les nouveautés arrivent chaque semaine.",
    'pay.fine':"Paiement sécurisé. Résiliable à tout moment, sans justification. L'achat à vie inclut les huit univers et toutes les anecdotes à venir.",
    'pay.key':'Activer ma clé',
    'lib.title':'Ma collection','lib.sub':'Les anecdotes que vous avez mises de côté.',
    'find.title':'Chercher un sujet','find.sub':"Un mot, un nom, un lieu — __MARQUE__ remonte ce qu'il a de plus surprenant sur le sujet.",
    'find.go':'Chercher',
    'toc.title':'Sommaire','toc.sub':"Les anecdotes disponibles. Touchez-en une pour la lire.",
    'toc.total':'anecdotes disponibles',
    'toc.subjects':'sujets au catalogue',
    'toc.pending':"Aucune anecdote n'a encore été rédigée dans cette langue. Le catalogue de sujets, lui, attend dans la vue Curation.",
    'read.more':'Lire la suite',
    'cur.pot':'potentiel','cur.potTip':"Potentiel estim\u00e9 avant \u00e9criture. 7 et plus : rep\u00e9r\u00e9 comme insolite par un contributeur. 6 et moins : trouv\u00e9 par simple parcours de cat\u00e9gories.",
    'cur.done':'fait','cur.mine':'ma source',
    'cur.sDone':' sujets faits','cur.sTodo':' \u00e0 \u00e9crire','cur.sMine':' mes sources','cur.sShown':' affich\u00e9s',
    'cur.sTexts':' textes \u00e0 r\u00e9diger',
    'cur.noSrc':"Aucune source ajout\u00e9e. Collez l'adresse d'un article ci-dessus.",
    'cur.rmSrc':'Retirer','cur.badUrl':'Adresse invalide : elle doit commencer par http.',
    'cur.addedSrc':n=>`${n} source${n>1?'s':''} ajout\u00e9e${n>1?'s':''}`,
    'cur.empty':"Le catalogue est vide. Lancez l'action \u00ab 1-collecter \u00bb sur GitHub pour rassembler des sujets, ou ajoutez vos propres adresses dans l'onglet \u00ab Mes sources \u00bb.",
    /* --- curation : l'habillage, traduit comme le reste --- */
    'cur.title':'Curation',
    'cur.cure':'liste insolite',
    'cur.close':'Fermer',
    'cur.tabCat':'Catalogue','cur.tabSrc':'Mes sources',
    'cur.filter':'Chercher : m\u00e9duse, nyos, galaxie\u2026','cur.filterLb':'Filtrer',
    'cur.uniLb':'Univers','cur.stateLb':'\u00c9tat','cur.sortLb':'Tri','cur.langLb':'Langue',
    'cur.stAll':'Toutes les fiches','cur.stTodo':'\u00c0 \u00e9crire','cur.stDone':'D\u00e9j\u00e0 r\u00e9dig\u00e9es',
    'cur.stStrong':'\u2605 Fort potentiel (7+)','cur.stCure':'\u2605 Listes insolites',
    'cur.stPhare':'\u2605\u2605 Sujets phares (les v\u00f4tres)','cur.phare':'phare',
    'cur.stN10':'Note 10/10','cur.stN9':'Note 9 et plus','cur.stN8':'Note 8 et plus',
    'cur.stSaviez':'\u2605 Le saviez-vous ?','cur.saviez':'le saviez-vous',
    'cur.refus':'Copier pour exclusions.txt',
    'cur.refusOk':n=>n+' titre(s) copi\u00e9s. Collez-les dans consignes/exclusions.txt, puis lancez Entretien \u2192 purger.',
    'cur.et.publie':'en ligne','cur.et.reserve':'en r\u00e9serve','cur.et.ecrit':'\u00e0 contr\u00f4ler',
    'cur.et.quarantaine':'quarantaine','cur.et.retire':'retir\u00e9e','cur.et.aecrire':'\u00e0 \u00e9crire',
    'cur.stCateg':'Parcours de cat\u00e9gories','cur.categ':'cat\u00e9gorie',
    'cur.noNote':'Aucune fiche n\u2019est encore r\u00e9dig\u00e9e : la note n\u2019existe qu\u2019apr\u00e8s l\u2019\u00e9tape 4-ecrire. Avant cela, triez par POTENTIEL.',
    'cur.stWeak':'Notes faibles (\u22646)',
    'cur.sortPot':'Trier par potentiel','cur.sortNote':'Trier par note obtenue',
    'cur.sortState':'Trier par \u00e9tat','cur.sortTitle':'Trier par titre','cur.sortUni':'Trier par univers',
    'cur.langAll':'Toutes les langues','cur.langHasFr':'Existe en fran\u00e7ais',
    'cur.langHasEn':'Existe en anglais','cur.langSolo':'Dans une seule langue',
    'cur.selAll':'Tout cocher','cur.selNone':'Tout d\u00e9cocher',
    'cur.copyBtn':'Copier la s\u00e9lection','cur.dlBtn':'T\u00e9l\u00e9charger selection.csv',
    'cur.srcHelp':"Collez l'adresse d'un article \u2014 d'o\u00f9 qu'il vienne \u2014 et il entrera dans la r\u00e9daction au m\u00eame titre que les sujets du catalogue. Une adresse par ligne.",
    'cur.srcUrlLb':"Adresse de l'article",'cur.srcUniLb':'Univers de la source','cur.srcAdd':'Ajouter',
    'cur.filtered':n=>n.toLocaleString('fr-FR') + (n>1?' fiches affich\u00e9es':' fiche affich\u00e9e'),
    'vide.eyebrow':'Catalogue vide',
    'vide.title':"Il n'y a encore rien \u00e0 lire",
    'vide.body':"C'est normal : ce d\u00e9p\u00f4t est neuf. Ouvrez GitHub, onglet Actions, lancez \u00ab 1-collecter \u00bb pour rassembler des sujets, puis choisissez-les dans la vue Curation et faites-les \u00e9crire avec \u00ab 4-ecrire \u00bb. Les anecdotes appara\u00eetront ici toutes seules.",
    'plan.free':'Gratuit','plan.paid':'Illimit\u00e9','plan.life':'\u00c0 vie',
    'plan.freeTip':'5 anecdotes par jour, les 8 univers','plan.paidTip':'Lecture illimit\u00e9e',
    'plan.back':'Abonnement termin\u00e9 : retour aux 5 anecdotes du jour. Votre collection est conserv\u00e9e.',
    'toc.locked':"Le sommaire fait partie de l'abonnement",
    'search.locked':"La recherche fait partie de l'abonnement",
    'dire.label':'\u00c0 raconter','dire.copy':'Copier','dire.done':'Copi\u00e9 \u2014 pr\u00eat \u00e0 raconter',
    /* l'aper\u00e7u bloqu\u00e9 : on lit le d\u00e9but, puis le texte s'estompe */
    'tease.eyebrow':'Aper\u00e7u',
    'tease.title':'La suite fait partie de l\u2019abonnement',
    'tease.body':"Vous avez lu vos 5 anecdotes du jour. Revenez demain, ou lisez sans compteur d\u00e8s maintenant.",
    'tease.cta':'Voir les tarifs',
    'tease.alt':'Revenir demain',
    'size.label':'Taille du texte',
    'act.keep':'Garder', 'act.share':'Partager',
    'act.next':'Continuez pour la suivante',
    'opt.titre':'Options','opt.lecture':'Lecture','opt.apparence':'Apparence',
    'opt.explorer':'Explorer','opt.taille':'Taille du texte','opt.theme':'Th\u00e8me',
    'opt.palette':'Jeu de couleurs','opt.langue':'Langue','opt.chercher':'Rechercher un sujet',
    'opt.clair':'Clair','opt.sombre':'Sombre',
    'acc.mode':'Accroches seules',
    'acc.on':'Accroches seules : une phrase par fiche, d\u00e9pliez celles qui intriguent.',
    'acc.off':'Fiches enti\u00e8res.',
    'acc.open':'D\u00e9plier cette anecdote',
    'pio.cta':'Piocher',
    'pio.wait':'On tire\u2026',
    'pio.none':'Rien de neuf \u00e0 piocher pour l\u2019instant.',
    'jour.badge':'La fiche du jour',
    'inst.title':'Mettre __MARQUE__ sur votre \u00e9cran d\u2019accueil',
    'inst.body':'Il s\u2019ouvre en plein \u00e9cran et se lit hors ligne.',
    'inst.ios':'Menu de partage, puis \u00ab Sur l\u2019\u00e9cran d\u2019accueil \u00bb.',
    'inst.titleBureau':'Installer __MARQUE__ sur cet ordinateur',
    'inst.bureau':'Dans la barre d\u2019adresse, l\u2019ic\u00f4ne d\u2019installation \u2014 ou le menu du navigateur, \u00ab Installer __MARQUE__ \u00bb. Il s\u2019ouvre alors dans sa propre fen\u00eatre.',
    'inst.autre':'Le menu de votre navigateur propose d\u2019ajouter __MARQUE__ \u00e0 l\u2019\u00e9cran d\u2019accueil.',
    'inst.cta':'Installer',
    'inst.later':'Plus tard',
    'cur.loading':'chargement de l\u2019introduction\u2026',
    'cur.noPreview':'pas d\u2019introduction disponible',
    'cur.dl':'Fichier prêt — le texte ci-dessous est aussi copiable',
    'toc.week':n=>`${n} nouvelle${n>1?'s':''} cette semaine`,
    'toc.weekShort':'cette semaine',
    'toc.more':n=>`Afficher ${n} sujet${n>1?'s':''} de plus`,
    'full.loading':'Résumé complet en cours…',
    'cur.sub':"Une ligne = un sujet. Cochez ceux qui méritent d'être écrits, puis « Copier la sélection » et collez-la dans « 3-estimer » pour le coût, puis « 4-ecrire ». Un sujet coché donne TOUJOURS deux textes, français et anglais : si Wikipédia ne l'a que dans une langue, l'autre est écrite à partir du même article.",
    'cur.count':(n,t)=>`${n} sujet${n>1?'s':''} · ${t} texte${t>1?'s':''}`,
    'cur.allUni':'Tous les univers','cur.todo':'à écrire',
    'cur.more':n=>`${n} fiches supplémentaires — affinez le filtre pour les voir.`,
    'cur.copied':'Sélection copiée','cur.copyFail':'Copie impossible — utilisez le téléchargement',
    'audit.ok':'sujets vérifiés et utilisables',
    'audit.dead':n=>`${n} sujet${n>1?'s':''} introuvable${n>1?'s':''} ou sans image`,
    'audit.done':"Vérification terminée. Lancez l'action « Ajouter des anecdotes » sur GitHub : elle nettoie ces entrées et complète le catalogue.",
    notLoaded:"Impossible de charger ce sujet pour le moment. Réessayez dans un instant.",
    quota:n=>`<b>${n}</b><em> restante${n>1?'s':''} aujourd'hui</em>`,
    unlimited:'Illimité',
    credit:(t,u)=>`Sujet : ${t}`,
    'ob.source':"Chaque anecdote est écrite pour __MARQUE__ à partir de faits vérifiés, puis relue avant publication.",
    lockTitle:'Cette anecdote fait partie de __MARQUE__ Illimité',
    lockTitleQuota:'C\u2019est tout pour aujourd\u2019hui',
    lockBody:"Passez en lecture illimitée : plus de compteur, et toutes les nouveautés dès leur sortie.",
    lockBodyQuota:"Vos 5 anecdotes du jour sont lues. Demain matin, 5 autres vous attendent — tir\u00e9es au hasard, et jamais les m\u00eames qu\u2019il y a deux mois. Ou bien ouvrez tout le catalogue, tout de suite.",
    lockCta:'Voir les formules', lockAlt:'Continuer avec les univers gratuits',
    saved:'Ajouté à votre collection', unsaved:'Retiré de votre collection',
    copied:'Lien copié', emptyLib:"Votre collection est vide. Touchez le cœur sur une anecdote pour la garder ici.",
    noResult:'Aucun résultat. Essayez un autre mot.',
    searching:'Recherche…', loading:'Chargement…',
    activated:'__MARQUE__ Illimité activé. Merci !', badkey:'Clé non reconnue.',
    picked:n=>`${n} univers actif${n>1?'s':''}`,
    plansTitle:{monthly:'Mensuel',yearly:'Annuel',lifetime:'À vie'},
    planTag:'Le meilleur rapport',
    planFeat:{
      monthly:['Lecture illimitée','La pioche : une anecdote au hasard','Le sommaire et la recherche','Sans engagement'],
      yearly:['Lecture illimitée','La pioche : une anecdote au hasard','Le sommaire et la recherche','Deux mois offerts'],
      lifetime:['Lecture illimitée, pour toujours','La pioche : une anecdote au hasard','Toutes les anecdotes à venir','Un seul paiement']
    },
    planCta:{monthly:"S'abonner",yearly:"S'abonner",lifetime:'Acheter à vie'},
    demo:'Lien de paiement non configuré — voir README.md'
  },
  en:{
    tagline:'The world is stranger than you think', scroll:'Scroll', shuffle:'Shuffle all',
    offline:'Built-in collection',
    'ob.kicker':'One wonder at a time',
    'ob.title':'The world is <em>stranger</em> than you think.',
    'ob.sub':'True things, written to be read: two minutes per piece, one per screen. Pick your universes to begin.',
    'ob.cta':'Start exploring',
    'ob.note':'5 free wonders every day, renewed each morning. No sign-up.',
    'uni.title':'Your universes','uni.sub':'Choose the worlds that feed your stream. Combine as many as you like.',
    'uni.apply':'Apply','uni.all':'Select all',
    'pay.title':'Go unlimited','pay.sub':'No more daily counter. Read as much as you want, and new pieces arrive every week.',
    'pay.fine':'Secure payment. Cancel anytime, no questions asked. Lifetime covers all eight universes and every piece still to come.',
    'pay.key':'Activate key',
    'lib.title':'My collection','lib.sub':'The wonders you set aside.',
    'find.title':'Search a subject','find.sub':'A word, a name, a place — __MARQUE__ brings back the most surprising thing it holds on the subject.',
    'find.go':'Search',
    'toc.title':'Contents','toc.sub':'Everything available to read. Tap one to open it.',
    'toc.total':'wonders available',
    'toc.subjects':'subjects catalogued',
    'toc.pending':'No pieces have been written in this language yet. The catalogue of subjects is waiting in the Curation view.',
    'read.more':'Keep reading',
    'cur.pot':'potential','cur.potTip':'Estimated potential before writing. 7 and up: flagged as unusual by a contributor. 6 and below: found by category crawling.',
    'cur.done':'done','cur.mine':'my source',
    'cur.sDone':' subjects done','cur.sTodo':' to write','cur.sMine':' my sources','cur.sShown':' shown',
    'cur.sTexts':' texts to write',
    'cur.noSrc':'No sources added. Paste an article address above.',
    'cur.rmSrc':'Remove','cur.badUrl':'Invalid address: it must start with http.',
    'cur.addedSrc':n=>`${n} source${n>1?'s':''} added`,
    'cur.empty':'The catalogue is empty. Run the \u00ab 1-collecter \u00bb action on GitHub to gather subjects, or add your own addresses in the \u00ab My sources \u00bb tab.',
    /* --- curation : the chrome, translated like everything else --- */
    'cur.title':'Curation',
    'cur.cure':'unusual list',
    'cur.close':'Close',
    'cur.tabCat':'Catalogue','cur.tabSrc':'My sources',
    'cur.filter':'Search: jellyfish, nyos, galaxy\u2026','cur.filterLb':'Filter',
    'cur.uniLb':'Universe','cur.stateLb':'State','cur.sortLb':'Sort','cur.langLb':'Language',
    'cur.stAll':'All cards','cur.stTodo':'To write','cur.stDone':'Already written',
    'cur.stStrong':'★ High potential (7+)','cur.stCure':'★ Unusual lists',
    'cur.stPhare':'★★ Flagship subjects (yours)','cur.phare':'flagship',
    'cur.stN10':'Scored 10/10','cur.stN9':'Scored 9+','cur.stN8':'Scored 8+',
    'cur.stSaviez':'★ Did you know','cur.saviez':'did you know',
    'cur.refus':'Copy for exclusions.txt',
    'cur.refusOk':n=>n+' title(s) copied. Paste them into consignes/exclusions.txt, then run Entretien → purger.',
    'cur.et.publie':'live','cur.et.reserve':'in reserve','cur.et.ecrit':'to check',
    'cur.et.quarantaine':'quarantined','cur.et.retire':'removed','cur.et.aecrire':'to write',
    'cur.stCateg':'Category crawl','cur.categ':'category',
    'cur.noNote':'Nothing has been written yet: a score only exists after step 4-ecrire. Until then, sort by POTENTIAL.',
    'cur.stWeak':'Low scores (≤6)',
    'cur.sortPot':'Sort by potential','cur.sortNote':'Sort by score obtained',
    'cur.sortState':'Sort by state','cur.sortTitle':'Sort by title','cur.sortUni':'Sort by universe',
    'cur.langAll':'All languages','cur.langHasFr':'Exists in French',
    'cur.langHasEn':'Exists in English','cur.langSolo':'In one language only',
    'cur.selAll':'Tick all','cur.selNone':'Untick all',
    'cur.copyBtn':'Copy selection','cur.dlBtn':'Download selection.csv',
    'cur.srcHelp':'Paste the address of an article \u2014 from anywhere \u2014 and it joins the writing queue alongside the catalogued subjects. One address per line.',
    'cur.srcUrlLb':'Article address','cur.srcUniLb':'Universe for this source','cur.srcAdd':'Add',
    'cur.filtered':n=>n.toLocaleString('en-US') + (n>1?' cards shown':' card shown'),
    'vide.eyebrow':'Empty catalogue',
    'vide.title':'There is nothing to read yet',
    'vide.body':"That is expected: this repository is new. Open GitHub, the Actions tab, run \u00ab 1-collecter \u00bb to gather subjects, pick them in the Curation view, and have them written with \u00ab 4-ecrire \u00bb. The pieces will appear here on their own.",
    'plan.free':'Free','plan.paid':'Unlimited','plan.life':'Lifetime',
    'plan.freeTip':'5 pieces a day, all 8 universes','plan.paidTip':'Unlimited reading',
    'plan.back':'Subscription ended: back to the 5 pieces of the day. Your collection is kept.',
    'toc.locked':'The contents list is part of the subscription',
    'search.locked':'Search is part of the subscription',
    'dire.label':'To tell','dire.copy':'Copy','dire.done':'Copied — ready to tell',
    /* the blocked preview: you read the opening, then the text fades out */
    'tease.eyebrow':'Preview',
    'tease.title':'The rest is part of the subscription',
    'tease.body':'You have read your 5 pieces for today. Come back tomorrow, or read without a counter right now.',
    'tease.cta':'See the plans',
    'tease.alt':'Come back tomorrow',
    'size.label':'Text size',
    'act.keep':'Keep', 'act.share':'Share',
    'act.next':'Keep going for the next one',
    'opt.titre':'Options','opt.lecture':'Reading','opt.apparence':'Appearance',
    'opt.explorer':'Explore','opt.taille':'Text size','opt.theme':'Theme',
    'opt.palette':'Colour set','opt.langue':'Language','opt.chercher':'Search a subject',
    'opt.clair':'Light','opt.sombre':'Dark',
    'acc.mode':'Hooks only',
    'acc.on':'Hooks only: one line per piece, unfold the ones that catch you.',
    'acc.off':'Full pieces.',
    'acc.open':'Unfold this piece',
    'pio.cta':'Draw one',
    'pio.wait':'Drawing\u2026',
    'pio.none':'Nothing new to draw right now.',
    'jour.badge':'Piece of the day',
    'inst.title':'Put __MARQUE__ on your home screen',
    'inst.body':'It opens full screen and reads offline.',
    'inst.ios':'Share menu, then \u201cAdd to Home Screen\u201d.',
    'inst.titleBureau':'Install __MARQUE__ on this computer',
    'inst.bureau':'The install icon in the address bar \u2014 or your browser menu, \u201cInstall __MARQUE__\u201d. It then opens in its own window.',
    'inst.autre':'Your browser menu offers to add __MARQUE__ to your home screen.',
    'inst.cta':'Install',
    'inst.later':'Later',
    'cur.loading':'loading the opening\u2026',
    'cur.noPreview':'no opening available',
    'cur.dl':'File ready — the text below can also be copied',
    'toc.week':n=>`${n} new this week`,
    'toc.weekShort':'this week',
    'toc.more':n=>`Show ${n} more subject${n>1?'s':''}`,
    'full.loading':'Loading the full summary…',
    'cur.sub':'One row, one subject. Tick the ones worth writing, then Copy selection and paste it into 3-estimer for the cost, then 4-ecrire. A ticked subject ALWAYS yields two texts, French and English: if Wikipedia only has it in one language, the other is written from the same article.',
    'cur.count':(n,t)=>`${n} subject${n>1?'s':''} · ${t} text${t>1?'s':''}`,
    'cur.allUni':'All universes','cur.todo':'to write',
    'cur.more':n=>`${n} more cards — narrow the filter to see them.`,
    'cur.copied':'Selection copied','cur.copyFail':'Copy failed — use the download instead',
    'audit.ok':'subjects verified and usable',
    'audit.dead':n=>`${n} subject${n>1?'s':''} missing or without an image`,
    'audit.done':'Check complete. Run the “Add wonders” action on GitHub: it cleans these entries and tops up the catalogue.',
    notLoaded:'This subject could not be loaded right now. Try again in a moment.',
    quota:n=>`<b>${n}</b><em> left today</em>`,
    unlimited:'Unlimited',
    credit:(t,u)=>`Subject: ${t}`,
    'ob.source':"Every piece is written for __MARQUE__ from verified facts, then read again before it goes live.",
    lockTitle:'This piece is part of __MARQUE__ Unlimited',
    lockTitleQuota:'That is all for today',
    lockBody:'Go unlimited: no more counter, and every new piece the day it lands.',
    lockBodyQuota:'Your 5 pieces for today are read. Tomorrow morning, 5 more — drawn at random, and never the same as two months ago. Or open the whole catalogue, right now.',
    lockCta:'See the plans', lockAlt:'Continue with free universes',
    saved:'Added to your collection', unsaved:'Removed from your collection',
    copied:'Link copied', emptyLib:'Your collection is empty. Tap the heart on a card to keep it here.',
    noResult:'No results. Try another word.',
    searching:'Searching…', loading:'Loading…',
    activated:'__MARQUE__ Unlimited activated. Thank you!', badkey:'Key not recognised.',
    picked:n=>`${n} universe${n>1?'s':''} on`,
    plansTitle:{monthly:'Monthly',yearly:'Yearly',lifetime:'Lifetime'},
    planTag:'Best value',
    planFeat:{
      monthly:['Unlimited reading','The draw: one piece at random','Contents list and search','No commitment'],
      yearly:['Unlimited reading','The draw: one piece at random','Contents list and search','Two months free'],
      lifetime:['Unlimited reading, forever','The draw: one piece at random','Every piece still to come','One single payment']
    },
    planCta:{monthly:'Subscribe',yearly:'Subscribe',lifetime:'Buy lifetime'},
    demo:'Checkout link not configured — see README.md'
  }
};
</script>
