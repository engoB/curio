# Curio 8.15.0 — ce qui a changé depuis v6

## 8.15.0 — les récits, et le bout de la liste

### La moisson ne lit plus que ce que vous publiez

Elle parcourait les listes anglaises même avec `langues: fr`. Elle ramenait
alors des milliers de sujets qui ne seraient jamais écrits : c'est une bonne
part de ce qui a fait du catalogue une poubelle. Elle lit maintenant
`consignes/publication.txt` et n'ouvre que les listes de vos langues.

Ce n'est pas la langue de l'**article** qui est en jeu — une fiche française
s'écrit très bien à partir d'un article anglais, et `anecdotes/fr-terre.json`
en contient déjà. C'est la langue des **listes** qu'on parcourt.

### Où en est votre liste de sujets phares

Les deux mines de Wikipédia sont sans fond, et c'est très bien : on n'en verra
jamais le bout. Vos sujets phares, eux, sont une liste finie que vous avez
écrite à la main — et rien ne disait où vous en étiez.

*1 · Moisson* porte maintenant la jauge : combien de lignes de
`sujets-phares.txt` sont **en ligne**, **au stock**, **écrites à relire**, **à
écrire**, et combien ne sont **pas au catalogue**. Cette dernière colonne dit
deux choses à la fois — la moisson n'a pas encore eu son tour, ou le titre ne
désigne aucun article — et le texte sous la jauge explique comment trancher.
L'état de chaque ligne est lu par la même fonction que la Sélection : un seul
endroit décide de ce que « écrite » et « en ligne » veulent dire.

### L'univers Reddit s'allume tout seul

Les billets étaient déjà moissonnés, mais ils tombaient dans « Histoire
oubliée » — ce qui les faisait passer pour des faits d'encyclopédie. Dès que
`consignes/reddit.txt` liste un subreddit, l'univers **Histoires vraies**
existe, et les billets y vont. Vider le fichier l'éteint ; un univers qui porte
déjà des sujets reste.

### Une fiche de récit se voit avant d'être lue

Un récit est raconté à la première personne par quelqu'un qui l'a vécu.
L'habiller comme une notice serait le vendre pour ce qu'il n'est pas — et ces
textes se vendent.

Trois marques : la pastille de l'univers devient un **carré**, un **guillemet
ouvrant** suspendu ouvre le premier paragraphe, et la **provenance** est écrite
sous le texte, avec le lien vers le billet d'origine. L'habillage typographique
réservé aux accroches est désactivé : un récit n'a pas d'accroche, il commence.

**Le premier essai était raté** : il donnait au récit un filet à gauche et du
serif — exactement ce que porte déjà toute accroche. Deux choses différentes
qui se ressemblent ne distinguent rien. C'est la mesure du style calculé, sur
une carte de récit et une carte ordinaire côte à côte, qui l'a montré.

*Éprouvé* sur un catalogue à neuf univers : l'univers apparaît dans le choix
des mondes, la carte porte `data-uni="reddit"`, le guillemet et la pastille
carrée sont là, la provenance pointe sur le bon permalien — et la carte
ordinaire n'a rien de tout cela.

### Ce que cette version ne touche pas

Aucune fiche, aucun réglage, aucun fichier de `consignes/` ne part dans le
paquet. La publication, la relecture et la mise en ligne sont inchangées.
Reddit reste inerte tant que vous ne listez pas de subreddit.

## 8.14.0 — vider la poubelle, et choisir sa veine

### Le catalogue se vide, sans rien perdre

« Le saviez-vous ? » compte des milliers de pages et il s'en ajoute une chaque
jour depuis vingt ans. La moisson tourne toutes les nuits. Au bout de quelques
mois, le catalogue porte des dizaines de milliers de sujets dont on n'a rien
dit — et on ne sait plus où regarder. Ce n'est pas une réserve, c'est une
poubelle, et une poubelle ne se trie pas : elle se vide.

*4 · Contrôle → **Repartir à zéro***, et *Entretien → repartir-a-zero* pour qui
préfère l'action. **Ce qui reste, quoi qu'il arrive** : tout sujet qui a une
fiche — écrite, au stock ou en ligne — vos sujets phares, vos ajouts manuels,
et ce que vous aviez retiré. Un seul choix : *ménage* garde aussi vos retenus
pas encore écrits, *table rase* les vide.

**Aucune fiche n'est ouverte, rien de ce qui est en ligne ne bouge, et un sujet
déjà écrit ne peut pas revenir à l'écriture** : un sujet est un identifiant
Wikidata, et le sien reste au catalogue. L'ancien catalogue est recopié dans
`catalogue-maitre.avant-remise-a-zero.json` avant la première écriture. Si le
tri ne garde rien du tout, l'outil s'arrête sans avoir écrit une ligne.

*Éprouvé* sur un catalogue de 59 sujets reproduisant les cas réels — fiche sans
identifiant retrouvée par son titre, fiche française tirée d'un article
anglais-seul, phare que le registre avait oublié de marquer, ajout manuel,
sujet retiré : 14 gardés / 45 sortis en ménage, 8 / 51 en table rase, fiches
inchangées au bit près, décisions devenues sans objet retirées.

**Un défaut trouvé en chemin, et il aurait été grave.** Les fiches du dépôt
sont rangées sous `{ items: { titre: fiche } }`, et l'outil lisait l'objet à
plat : il aurait compté UNE fiche nommée « items » et n'aurait reconnu aucun
sujet écrit. Le garde-fou « si le tri ne garde rien, on n'écrit pas » aurait
sauvé la mise — de justesse. C'est le jeu d'essai au vrai format qui l'a
révélé.

### La console et l'outil comptent enfin pareil

La carte annonce ce qui va rester et ce qui va sortir **avant** de lancer quoi
que ce soit. Elle applique la règle de l'outil mot pour mot — et pour cela elle
lit désormais `consignes/sujets-phares.txt` elle-même, comme lui. Elle
annonçait sinon moins de phares qu'il n'en garderait : deux comptes pour une
seule chose, exactement le défaut qui avait coûté deux versions.

### Moissonner une veine à la fois

Le code savait choisir sa source depuis longtemps ; l'action ne le lui a jamais
demandé, et la moisson prenait tout à chaque fois. *1 · Moisson* offre
maintenant le choix, pour un lancement à la main :

| | |
|---|---|
| **tout** | les trois veines — ce que fait la nuit |
| **les articles insolites seuls** | quatre pages en français, vingt en anglais : très ciblé, et fini une fois lu |
| **« Le saviez-vous ? » seul** | la seule veine qui se renouvelle, et celle qui remplit le plus vite |
| **vos sujets phares seuls** | aucun appel aux listes Wikipédia |

Une valeur inconnue retombe sur « tout » : un réglage mal orthographié ne doit
pas vider une moisson.

### Ce que cette version ne touche pas

Aucune fiche, aucun réglage, aucun fichier de `consignes/` ne part dans le
paquet. La publication, le rythme, la relecture et l'affichage sont inchangés.

## 8.13.0 — votre nom, votre logo, et le droit de vous corriger

### Le nom et le logo se règlent depuis la console

*5 · Publication → **Le nom et le logo***. Trois champs — le nom, la
signature, le chemin du logo — un aperçu qui montre le résultat pendant que
vous tapez, et un bouton. La console écrit `consignes/marque.txt`, puis
**reconstruit le site toute seule** : le changement est en ligne sans qu'on
vous livre quoi que ce soit.

Pour le logo : déposez votre image dans `icones/` par *Add file → Upload
files*, puis écrivez son chemin — `icones/logo.svg`. Champ vide, c'est le nom
en toutes lettres, comme avant. Si le chemin ne mène à rien, la construction
retombe sur le nom plutôt que d'afficher une image cassée : *éprouvé* avec un
fichier absent.

Changer de nom ne coupe personne : la collection, les favoris et la formule de
vos lecteurs sont rangés sous des clés qui ne bougent pas.

### Corriger une fiche déjà en ligne

*6 · En ligne* ouvrait l'aperçu du lecteur ; on ne pouvait qu'en retirer.
Une coquille dans un texte publié n'avait donc qu'une issue : tout refaire.

Il y a maintenant **corriger le texte**. L'accroche, les paragraphes et la
phrase à raconter s'éditent dans l'aperçu, et **Mettre à jour la fiche en
ligne** écrit le nouveau texte. La fiche ne bouge pas : elle reste en ligne,
**à sa place**, sa date de publication intacte — vos lecteurs voient
simplement le texte corrigé. Le fichier est relu juste avant l'écriture, donc
une correction n'écrase jamais les autres fiches du même univers.

*Éprouvé* de bout en bout contre une API simulée : le corps envoyé garde
`p`, la note, l'identifiant et l'image, ne change que le texte, laisse les
sept autres fiches du fichier intactes et pose une trace de correction.

### Le « 5 » a quitté la barre

En gratuit, un compteur annonçait ce qui restait. Compter ce qu'on offre, c'est
rappeler à chaque écran ce qu'on ne donne pas. Il est parti — les cinq
anecdotes du jour sont les mêmes pour tout le monde, elles arrivent, elles
suffisent.

### La pioche laisse le temps de lire

Les phrases défilaient en une seconde et demie. Elles tiennent maintenant
**3,5 secondes** : le temps de les lire.

### Le README

Refait : les six onglets et le métier de chacun, les quatre mots du produit
(*écrite → relue → au stock → en ligne*), le tableau « corriger, retirer,
refaire », que faire quand quelque chose paraît cassé, et la carte du dépôt.

### Ce que cette version ne touche pas

Aucune fiche, aucun réglage, aucun fichier de `consignes/` ne part dans le
paquet. Le rythme, la moisson, vos décisions et vos validations restent les
vôtres.

## 8.12.0 — moins de boutons, et chacun à sa place

### L'application ne se laisse plus pincer

Une application installée n'est pas une page web : le pincement y décale la
mise en page, coupe la barre haute et ne se remet jamais droit. Le double-appui
aussi. Les deux sont désormais bloqués — dans **l'application seulement**.
Le site, lui, reste zoomable : c'est une page, et on doit pouvoir l'agrandir.

Rien n'est perdu pour qui a besoin de plus gros : le réglage de taille du
texte, quatre crans mémorisés, fait le même travail sans casser le cadre.

### « Nouveau cette semaine » se recalcule

Le chiffre venait de `anecdotes/index.json`, écrit par l'action. Tant qu'elle
tourne il est juste — mais un passage manqué suffisait à le laisser sur la
valeur de la semaine d'avant, sans que rien ne le dise.

Deux corrections. Le comptage ne se replie plus sur la date d'**écriture**
quand la date de publication manque : « nouveau » veut dire *récemment mis en
ligne*, et rien d'autre. Et **l'application recalcule elle-même** dès que le
sommaire a été chargé — le fichier ne sert plus que d'avance. *Éprouvé* avec
un `index.json` figé à +99 : il affiche +99 au démarrage, puis **+16** dès
qu'on ouvre le sommaire, tout seul.

### La relecture : on coche, on envoie

Le bouton **valider** faisait double emploi avec la sélection, et le mot
ajoutait un état de plus à retenir. C'est une **case** maintenant, et elle dit
ce qu'elle fait : *garder* — cette fiche part au stock. *À refaire* et
*retirer* restent des boutons : elles ne partent pas au même endroit.

Les gestes de l'onglet sont dans l'onglet, sous les filtres : *Envoyer ces N
au stock*, *Tout cocher*, *Tout décocher*, **Enregistrer ma relecture**.
La barre du bas ne les double plus — elle ne fait que dire où l'on en est —
et son bouton *Publier les validées* a disparu : on ne publie pas depuis un
bureau de relecture.

### « Ouvrir le fonds » est retiré

Il demandait une note dans une fenêtre système et publiait un nombre qu'on ne
voyait pas avant de valider. La liste cochable de *5 · Publication* fait la
même chose, en montrant exactement ce qui va sortir.

### La sélection ne montre plus que ce qui se décide

Elle s'ouvre sur **ce qui n'est pas écrit** — son seul métier : retenir, ou
écarter. Ce qui est déjà écrit a quitté la sélection et vit en Relecture, en
Publication ou En ligne ; il reste atteignable par un filtre, mais il n'est
plus le sujet.

Les états passent de sept à trois : *à écrire*, *déjà écrites*, *tous*. « À
finir » et « à moitié en ligne » ont disparu — deux nuances qui ne changeaient
aucune décision. Les compteurs suivent : *au catalogue · pas décidés · retenus
· écartés · à écrire · déjà écrites · incohérents*.

### Ce que cette version ne touche pas

`consignes/publication.txt`, `moisson.txt`, `marque.txt`, `decisions.json`,
`validations.json`, `anecdotes/`, `catalogue-maitre.json`, `catalog.json` :
**aucun n'est dans le paquet**. Vérifié fichier par fichier avant l'envoi.


## 8.11.2 — un bureau de relecture, un stock, et un seul mot

### Trois onglets, trois métiers, aucun recouvrement

| | ce qu'on y voit | ce qu'on y fait |
|---|---|---|
| **3 · Relecture** | les fiches **écrites**, ni au stock ni en ligne | juger le fond et la forme, envoyer au stock |
| **5 · Publication** | **le stock** — ce qui est jugé et attend | régler le rythme, sortir des sujets choisis |
| **6 · En ligne** | ce que le lecteur voit | retirer |

**On ne publie plus depuis la Relecture.** Le bouton *Mettre en ligne…* en a
été retiré : il est devenu *Ouvrir le fonds à partir d'une note…*, dans
Publication, à côté du stock. Un bureau de relecture ne met rien en ligne.

**Et la Relecture ne montre plus que ce qu'elle a à relire.** Une fiche en
ligne ne se relit pas — elle se retire ou se refait. Une fiche au stock est
jugée — elle appartient à Publication. Les filtres se réduisent donc à ce qui
reste vraiment à traiter : *à relire* (par défaut), *validées — en attente
d'envoi*, *à refaire*, *à retirer*, *en quarantaine*.

**Le stock de Publication est enfin le stock** : les fiches dont le jugement
est enregistré au dépôt et qui ne sont pas encore en ligne — exactement la
définition qu'emploient le compteur et l'outil de publication. Une seule
définition, trois endroits.

### Un mot, pas deux

« Réserve » et « stock » désignaient la même chose, et cohabitaient d'un
onglet à l'autre. **« Stock » l'emporte**, partout : dans les deux pages, dans
les compteurs, dans les confirmations, et jusque dans le journal des actions.
Le mot « réserve » n'apparaît plus à l'écran.

Le chemin, affiché en tête de la Relecture et de la Publication :

> **écrite** — le texte existe → **relue** — vous la jugez en 3 · Relecture →
> **au stock** — *Envoyer au stock* enregistre votre jugement au dépôt →
> **en ligne** — le lecteur la voit.

*Éprouvé de bout en bout* : sur 80 fiches (24 en ligne, 16 au stock, 40 à
relire), la Relecture en montre 40 et aucune autre ; une fiche validée y reste
sous « validées — en attente d'envoi » et n'apparaît pas encore au stock ;
après *Envoyer au stock*, elle quitte la Relecture (39) et rejoint le stock
de Publication (17).


## 8.11.1 — le tiroir sous son propre voile, et quatre mots pour quatre états

### Le panneau s'ouvrait, et plus rien ne répondait

Un bug d'empilement, et il est instructif. `.topbar` porte `z-index:40` :
elle ouvre donc un **contexte d'empilement**, et le tiroir, qui est son
enfant, ne peut pas en sortir — quel que soit son `z-index`. Le voile, lui,
était posé sur `<body>` avec un nombre plus petit. Sur le papier il passait
dessous ; en réalité il passait **par-dessus le tiroir**, et absorbait tous
les clics.

Le voile rejoint la barre : les deux partagent le même contexte, et l'ordre
entre eux redevient celui qu'on écrit. *Éprouvé* commande par commande, en
regardant ce que le doigt atteint vraiment à chaque endroit du panneau :
taille du texte, accroches, thème, couleurs, recherche, collection, pioche,
fermeture — les huit répondent.

### « Pas encore au stock » sur une fiche qu'on vient de valider

Le mot était exact et inutilisable : vous veniez de la valider à l'écran, et
la console répondait qu'elle n'y était pas — sans dire qu'il manquait
seulement l'enregistrement au dépôt.

Le produit n'avait pas de vocabulaire ; il en a un, et le même partout :

> **écrite** — le texte existe → **relue** — vous l'avez jugée, dans ce
> navigateur → **au stock** — votre jugement est enregistré au dépôt, elle
> attend son tour → **en ligne** — le lecteur la voit.

Cette phrase est affichée en tête de *3 · Relecture* et de *5 · Publication*,
mot pour mot. Et l'étiquette de chaque fiche dit désormais laquelle des quatre
marches elle occupe — dont l'état intermédiaire qui manquait :
**« validée — à envoyer »**.

**Et ce qui compte : le stock ne commande que le rythme automatique.** Dans
*Sortir des sujets choisis*, vous passez outre — une fiche peut sortir même si
elle n'est pas encore au stock. Seule la quarantaine reste bloquée, parce que
c'est le contrôle et non le rythme. Le panneau le dit en toutes lettres.


## 8.11.0 — la recherche servait mes fiches de démonstration

### « Le Grand Attracteur » n'a jamais été à vous

C'est la réponse, et elle est gênante. Chercher « grand » remontait *Le Grand
Attracteur*, *Le Vide du Bouvier*, *Le disque d'or des sondes Voyager*, *La
méduse qui rajeunit* — les **trente-deux fiches de démonstration** livrées
dans `demo.json`. Du contenu d'exemple, présenté à vos lecteurs comme le vôtre.

Tout s'explique d'un coup : introuvables dans la console (elles n'ont jamais
été au catalogue), absentes des publiés, jamais rencontrées en faisant
défiler, et mal mises en page — ces textes-là sont d'un seul bloc.

Deux causes, corrigées toutes les deux.

**La recherche interrogeait Wikipédia.** C'était juste au temps où
l'application servait des extraits d'encyclopédie ; depuis la version 8 elle
ne sert que des anecdotes rédigées, et chercher ailleurs ne pouvait donc
remonter que des choses qui n'existent pas dans le produit. Quand l'appel
échouait — un réseau qui bronche suffit — on basculait sur la démonstration.

La recherche lit maintenant **votre catalogue publié**, et rien d'autre :
aucun appel réseau, réponse instantanée, même résultat hors ligne. *Éprouvé* :
« attracteur » et « méduse » ne donnent plus rien, une fiche en réserve ne
donne rien, et « accroche » remonte exactement les 32 fiches en ligne du banc
d'essai — pas une de plus.

**Et la démonstration ne sort plus que d'un dépôt vide.** Elle ne servait
« que de filet hors ligne » — l'intention était bonne, la condition trop
large : « hors ligne » se déclenche sur un seul appel raté. Un catalogue de
mille fiches pouvait donc se voir compléter par du contenu qui n'appartient
pas à son propriétaire. Désormais : s'il y a du texte, on ne bouche aucun trou.

### Tout renvoyer au stock, et repartir proprement

*4 · Contrôle → **Tout renvoyer au stock***. Vos fiches sont dépubliées d'un
trait et repassent en réserve, **avec leur note, leur relecture et leur marque
de contrôle intactes**. Aucun texte n'est effacé : ce n'est pas un retrait —
un retrait sort une fiche pour de bon, ceci la remet dans la file d'attente.
Deux confirmations, parce que le site se vide jusqu'à la publication suivante.

### Choisir ce qui sort maintenant

*5 · Publication → **Sortir des sujets choisis, maintenant***. Votre réserve,
cochable, avec recherche, filtre d'univers et seuil de note. Ce que vous
cochez part en ligne aujourd'hui, quel que soit le rythme. La quarantaine ne
passe pas : validez-la d'abord.

### La barre : cinq choses, et un tiroir

Elle en portait neuf, et sur un téléphone elles ne tenaient plus. Deux lignes
réglaient le débordement mais donnaient une application encombrée avant
d'avoir commencé. On choisit donc au lieu d'empiler.

**Restent dans la barre** : le nom, le compteur, l'univers — on en change en
lisant — et la pioche, le geste du quotidien.

**Passent dans le tiroir** : taille du texte, accroches, thème, couleurs,
langue, recherche, collection. Il glisse **depuis la droite**, prend toute la
hauteur, s'assombrit derrière, et se ferme d'un doigt à côté, par la croix ou
par Échap. Sur grand écran, rien ne change : la rangée dépliée reste.

### Cocher un univers ne redessine plus seize cartes

Chaque clic reconstruisait les deux grilles et repeignait **seize canevas**
d'art procédural. Sur un téléphone, on touchait et il ne se passait rien assez
longtemps pour croire que le clic n'avait pas pris. Un clic ne retourne plus
que la carte touchée : **six clics en 38 ms** au lieu de six reconstructions.


## 8.10.4 — le sommaire, et l'accroche qui n'en était pas une

### Le sommaire ne montre que ce qui est publié

Le filtre existait, mais en amont, trois fonctions plus haut. Il est refait
**à l'endroit où il compte**, sur la date de publication elle-même : une
fiche sans date franche, en quarantaine ou retirée n'entre pas dans le
sommaire, quoi qu'il arrive ailleurs dans le code.

Une fiche de la réserve n'a rien à faire dans une recherche : elle n'est pas
encore à vendre. *Éprouvé* sur 80 fiches dont 48 en réserve : le sommaire en
liste 32, chercher le titre exact d'une fiche en réserve donne zéro résultat.

**Et le chiffre du sommaire est celui de sa liste.** Il venait de
`anecdotes/index.json` — deux sources pour un seul nombre, et rien ne
signalait qu'elles divergent. Le sommaire annonce désormais ce qu'il
contient : si la liste n'a pas ce qu'elle annonce, cela se voit.

### L'habillage d'accroche se mérite

Le premier paragraphe recevait Fraunces 26 px et le filet bleu **quoi qu'il
arrive**. Sur une fiche dont l'ouverture fait dix lignes — la consigne dit
vingt-cinq mots, mais rien ne l'imposait aux fiches écrites avant le contrôle
de structure — c'est un demi-écran en gros caractères derrière une barre, et
la fiche paraît cassée. C'est très exactement ce qu'on voyait.

Au-delà de **quarante-cinq mots** — le seuil qu'emploie déjà *3 · Contrôler*
— ce n'est plus une accroche : c'est un paragraphe, et il se lit comme les
autres. Le texte n'est pas touché ; seul son habillage l'est.

### Et si le sommaire vous déplaît quand même

`sommaire: non` dans `consignes/publication.txt` retire le sommaire **et** la
recherche du produit, gravé dans la page à la construction — dès la première
seconde, hors ligne compris, sans une ligne de JavaScript. C'est votre
catalogue : vous devez pouvoir en fermer la porte sans attendre une version.


## 8.10.3 — il y avait deux définitions de « en ligne »

C'est le défaut le plus grave de la série, et c'est le Grand attracteur qui
l'a révélé : trouvable en cherchant dans le sommaire, lisible en entier,
**absent des publiés** et rangé « en réserve » à la Sélection.

Deux règles cohabitaient, et elles ne disaient pas la même chose :

| | une fiche sans champ `p` est… |
|---|---|
| l'application, le site, le recomptage | **en ligne** — servie au lecteur |
| la console (Sélection, En ligne, stock) | **en réserve** |

Les fiches écrites avant la version 8 n'ont pas ce champ. Les traiter comme
non publiées aurait vidé le site du jour au lendemain : la tolérance était
donc justifiée côté lecteur. Mais la console, elle, exigeait une vraie date —
et ces fiches disparaissaient de tous ses comptes tout en restant lisibles.

**La console adopte la règle de l'application** : celle que le lecteur
éprouve, puisque c'est elle qui décide ce qu'il reçoit. Les quatre endroits
qui comptaient à leur façon — l'onglet En ligne, le stock prêt à publier, les
compteurs de publication, l'aperçu lecteur — passent tous par la même
fonction.

**Et la réparation lève l'ambiguïté dans les données.** *4 · Contrôle →
Remettre le registre d'accord avec les fiches* inscrit désormais une vraie
date sur toute fiche qui n'en a pas — sa date d'écriture si elle l'a,
aujourd'hui sinon. Ces fiches étaient déjà servies au lecteur : elles le
restent, avec la date qu'elles auraient dû porter. Après ce passage, toute
fiche porte une date ou un `null` franc, et la question ne se pose plus.

C'est la seule chose que cette opération écrit dans une fiche. Aucun texte
n'est touché, rien n'est publié ni dépublié.

*Éprouvé* sur 80 fiches dont 24 sans champ `p` : avant, la console comptait
32 en ligne quand l'application en servait 56. Après, les deux disent 56 — et
le sommaire de l'application en liste exactement 56.

### Le tableau « Pourquoi ces chiffres ? » compte aussi ces fiches

Une ligne de plus : *« — dont servies sans date de publication »*. C'est le
nombre qui explique l'écart, et il tombe à zéro après la réparation.


## 8.10.2 — un quart du catalogue était jugé « hors langue »

### 268 fiches en ligne, 171 sujets en ligne

Le correctif de la 8.10.1 était bon mais ne suffisait pas : les deux comptes
se contredisaient toujours. La vraie cause était ailleurs, et elle est nette.

Vos fichiers le montrent : `anecdotes/fr-terre.json` contient
**« Hoba meteorite »**, **« Ball's Pyramid »**, **« Lake Peigneur »**. Ce sont
des fiches **françaises** écrites à partir d'articles qui n'existent qu'en
**anglais** — ce que l'outil d'écriture sait faire depuis la 7.5, et qu'il
fait très bien.

Or je jugeais un sujet sur la langue de son **article**, pas sur celle de sa
**fiche** : les langues publiées étaient croisées avec celles où l'article
existe. Un sujet n'ayant qu'un article anglais n'attendait donc **aucune**
langue, tombait dans « hors langue publiée », et sa fiche française en ligne
ne comptait pas. D'où l'écart, et d'où « 0 incohérent » : rien ne se
contredisait, le sujet était simplement rangé dans un état invisible.

Ce qu'on attend d'un sujet, ce sont **les langues que vous publiez**, un
point c'est tout. « Hors langue publiée » disparaît.

**Le même défaut était dans l'outil de réparation.** Si vous avez lancé
*Remettre le registre d'accord avec les fiches* en 8.10.1, il a retiré leur
date de publication à ces sujets-là dans le registre — **sans toucher à une
seule fiche**, donc sans rien changer pour vos lecteurs. Relancez-le une fois
en 8.10.2 : il repart des fiches et rétablit tout exactement.

### Deux garde-fous, pour que cela ne se reproduise pas

**La console dit sa version**, en petit à côté de son titre, gravée par la
construction. Devant deux chiffres qui se contredisent, la première question
est « quel fichier tourne dans ce navigateur ? » — elle a maintenant une
réponse.

**Un tableau « Pourquoi ces chiffres ? »** ouvre l'onglet *4 · Contrôle*. Il
met côte à côte ce que disent les **fiches** — ce que le lecteur reçoit — et
ce que dit le **catalogue**, compte les fiches qu'aucun sujet ne réclame, et
dit en toutes lettres si les deux concordent. Il ne modifie rien et ne demande
rien au réseau.

Enfin, **tous les états ont leur case** dans les compteurs de la Sélection.
« À moitié en ligne » n'en avait pas : c'est ce qui a permis à un quart du
catalogue de disparaître sans que rien ne l'affiche.


## 8.10.1 — la console ne reconnaissait pas ses propres fiches

### 171 en ligne à la Sélection, 268 dans l'onglet En ligne

Même dépôt, même seconde, deux réponses. La cause est nette : la console
rapprochait une fiche de son sujet par le seul **identifiant Wikidata** que la
fiche porte (`rec.q`). Les fiches écrites avant la 8.5 ne le portent pas.
Elles n'étaient donc rattachées à aucun sujet, et leur sujet paraissait
« en réserve » alors que la fiche était en ligne depuis des semaines — c'est
très exactement ce qu'on voyait sur la méduse qui ne vieillit pas et sur le
Grand attracteur, tous deux publiés, tous deux lisibles depuis le sommaire.

Le rapprochement se fait maintenant par identifiant **quand il existe**, et
par **titre d'article** sinon — le titre est la clé dans `anecdotes/`, il est
toujours là. Les deux comptes disent désormais la même chose, et les sujets
concernés portent la marque `⚠ incohérent` : le registre du catalogue, lui,
ne sait toujours pas qu'ils sont publiés. *4 · Contrôle → Remettre le
registre d'accord avec les fiches* le lui apprend, en une minute et
gratuitement.

*(L'outil de réparation, lui, rapprochait déjà par titre : c'était bien la
console qui se trompait, pas le dépôt.)*

### Une fiche d'un seul paragraphe s'affichait entièrement en accroche

Le premier paragraphe d'une fiche porte l'habillage de l'accroche : Fraunces,
26 px, filet bleu. La règle disait « le premier ». Quand la fiche n'a qu'un
paragraphe, ce premier est aussi le dernier — et le texte entier se retrouvait
en gros caractères derrière un filet, du premier mot au dernier.

Une accroche est une phrase **qui en annonce d'autres**. Seule, elle redevient
du texte.

### La barre haute prend deux lignes sur téléphone

Tout tenait sur une ligne à condition de rétrécir : le nom de l'univers à huit
caractères, le chevron retiré, les boutons à 34 px. Passé un certain point on
ne rétrécit plus, **on coupe** — et c'est ce qui arrivait depuis que le
compteur affiche trois chiffres et que Piocher et Accroches sont venus s'y
ajouter.

La barre respire donc sur deux lignes : ce qu'on lit à gauche — le nom, le
compteur, l'univers — et ce qu'on actionne à droite, en dessous. Rien n'est
caché, rien n'est tronqué, et le pouce atteint tout. Le texte des fiches
descend d'autant : une seule valeur commande la hauteur de barre.

### Le numéro de version quitte la barre

Il s'affichait en clair dans la rangée dépliée du grand écran, à côté de
« Collection embarquée ». Il se pose maintenant **dans le coin en bas à
droite de l'écran**, presque effacé, et s'éclaire au survol.

**« Collection embarquée » est retirée.** Elle annonçait la lecture hors
ligne ; celle-ci est devenue la règle — l'application ne lit plus que des
fiches locales —, l'étiquette n'apprenait donc plus rien.

### Le second compte à rebours

La jauge avait disparu en 8.10.0, mais la pastille de statut portait encore le
reste du jour et le décomptait : « GRATUIT 5 », « GRATUIT 4 »… Elle ne dit
plus que la formule. Le nombre offert vit à côté, et il ne bouge pas.


## 8.10.0 — une édition du jour commune, et des états qui disent vrai

### Les cinq du jour sont les mêmes pour tout le monde

Elles étaient tirées au hasard dans chaque navigateur : deux personnes
n'avaient jamais la même journée. Impossible d'en parler à quelqu'un,
impossible d'annoncer « celle d'aujourd'hui », impossible d'en faire un
rendez-vous. Une édition n'existe que si elle est commune.

Le tirage se **déduit** maintenant de la date, et de rien d'autre : le
catalogue publié est rangé dans un ordre stable, le numéro du jour désigne une
fenêtre de cinq dans cet ordre, et la fenêtre avance de cinq chaque jour. Deux
téléphones, deux pays, deux navigateurs : la même page. Personne ne revoit une
anecdote avant que le catalogue entier ait défilé — la rotation le garantit
d'elle-même. Il n'y a toujours ni compte, ni serveur, ni la moindre donnée qui
sorte de l'appareil.

**La fiche du jour** des abonnés suit la même règle, à une autre position :
c'est un rendez-vous, et « celle d'aujourd'hui » ne veut rien dire si chacun a
la sienne.

### Le catalogue et les fiches ne racontent plus deux histoires

C'était le point le plus gênant. Un sujet s'affichait **EN LIGNE** à la
Sélection, restait introuvable dans les publiés, et manquait sur le site :
trois réponses à la même question, aucune fiable.

La cause : `catalogue-maitre.json` tient un *registre* (« écrit », « en
ligne »), et `anecdotes/` porte la *vérité*, puisque c'est ce que
l'application lit. Quand un passage s'interrompt, les deux divergent.

Trois corrections :

- **L'état d'un sujet se lit désormais dans les fiches**, pas dans le
  registre. La console dit ce que le lecteur voit.
- **Un désaccord se voit** : le sujet porte la marque `⚠ incohérent`, un
  filtre les isole, et un chiffre les compte.
- **Un outil les répare** : *4 · Contrôle → Remettre le registre d'accord avec
  les fiches*. Gratuit, il ne touche aucune fiche, ne publie ni ne dépublie
  rien — il recopie ce que disent les fiches dans le registre.

### « À finir » avait cessé d'avoir un sens

Il voulait dire « une langue sur deux ». Comme vous ne publiez que le
français, des centaines de sujets étaient marqués inachevés parce qu'il leur
manquait un anglais que personne n'attend.

Un sujet est maintenant jugé sur **les langues que vous publiez**, croisées
avec celles où l'article existe. En français seul, « à finir » ne peut plus
apparaître. Et un sujet qui n'existe dans aucune langue publiée n'est ni à
écrire ni inachevé : il est **hors langue publiée**, un état à part, avec son
filtre.

### « Pas encore relues » montrait des fiches publiées

Les fiches mises en ligne par l'ancien chemin — celui où valider publiait — ne
portent aucune trace de relecture. Elles remontaient donc dans « pas encore
relues », déjà publiées.

Le filtre de relecture ne parle plus que de ce qui **n'est pas** en ligne : une
fiche publiée ne se relit plus, elle se retire ou se refait. Et quatre filtres
nouveaux répondent aux questions qu'on se pose vraiment :

| filtre | ce qu'il montre |
|---|---|
| Pas encore relues | écrites, pas en ligne, pas jugées |
| À valider | écrites, pas en ligne, pas encore validées |
| En réserve | tout ce qui n'est pas en ligne |
| Prêtes à publier | dans le stock, en attente du rythme |

### De la relecture au stock, en un bouton

Trois marches, et une seule s'appelait « publier » — ce qui laissait croire
que valider mettait en ligne :

1. **relire** — vous jugez, dans votre navigateur ;
2. **le stock** — vos jugements deviennent une réserve prête ;
3. **la sortie** — *5 · Publication* en tire au rythme réglé.

La marche 2 a maintenant son bouton, *Envoyer au stock prêt à publier*, et son
réglage : `stock: manuel` (le bouton) ou `stock: auto` (chaque passage de
publication prend d'abord vos validées). Dans les deux cas, valider ne met
jamais rien en ligne.

*Au passage :* `consignes/validations.json` n'était pas enregistré par
l'action. L'outil le vidait après l'avoir appliqué, le vidage était perdu, et
la relecture se rejouait à chaque passage.

### Chercher les redites, sur les seules fiches en ligne

*4 · Contrôle → Chercher les redites parmi les fiches EN LIGNE.* Il compare
deux à deux, dans la même langue, ce que le lecteur voit — et rien d'autre :
ce qui dort en réserve ne gêne personne. **Rien n'est retiré** ; vous lisez
`doublons.csv` et vous choisissez, titre par titre.

### Le défilement ne « rafraîchit » plus

Chaque bloc d'une fiche montait de seize pixels en s'allumant, l'un après
l'autre, dès que la fiche devenait active. La fiche arrivait donc **vide** et
se remplissait ensuite ; l'animation se rejouait à chaque passage ; et comme
les blocs étaient décalés séparément, **le texte passait par-dessus le
titre**. C'est exactement ce qu'on voyait à l'écran.

Une fiche n'a pas besoin d'entrer en scène : elle est là. Il reste un fondu
très court sur la carte entière — un seul élément, donc aucun recouvrement
possible.

Une fiche ouverte depuis le sommaire arrive par le même chemin que les autres,
alignée : elle était insérée en tête puis le flux sautait à zéro d'un coup, et
la carte se posait à cheval sur la précédente.

### La barre haute

- **Le nom du produit ramène à l'accueil.** Quinze fiches plus bas, il fallait
  recharger pour rentrer.
- **Plus de compte à rebours en gratuit.** La jauge et « 3 restantes »
  faisaient de la journée une ration. Le chiffre reste — c'est l'offre — mais
  il ne bouge plus.
- **Piocher et Accroches seules sont dans la barre** sur téléphone, pour qui
  paie : deux gestes du quotidien n'ont pas à vivre derrière « … ». Au-dessus
  de 1100 px, la rangée dépliée les porte déjà.
- **« Tout mélanger » est retiré.** Il ne mélangeait rien : il recochait tous
  les univers, et le choix se règle juste à côté.
- **La version se lit, elle ne s'affiche pas** : au pied du panneau, et dans
  l'infobulle du nom.

### L'installation n'est plus un bouton

C'était une ligne de plus dans le panneau, qui parlait d'un geste dont on
n'avait pas encore envie. L'invitation arrive maintenant d'elle-même, **après
trois anecdotes lues et deux minutes de lecture** — et « Plus tard » ne
l'enterre plus pour toujours : elle revient une semaine après, trois fois au
maximum. Passé la troisième, plus jamais.


## 8.9.0 — la console en six étapes, et deux bugs qui expliquaient beaucoup

### Vos réglages étaient écrasés à chaque import

Voilà pourquoi votre rythme « hebdomadaire, le lundi, sept sujets » était
redevenu « quotidien, trois », et votre moisson repassée sur « oui ». **Le
paquet livrait `consignes/publication.txt` et `consignes/moisson.txt`** : les
importer écrasait les vôtres, en silence.

Le paquet ne les livre plus. Il livre des `.exemple.txt`, et tout ce qui les
lit — les trois outils, la construction, l'action de moisson, la console — lit
le vôtre s'il existe, l'exemple sinon. **Vous pouvez importer autant de
versions que vous voulez : vos réglages ne bougeront plus.**

### Le sommaire ne fonctionnait pas du tout

`prets is not defined` : une variable qui n'a jamais existé, dans la boucle qui
construit la liste. Le sommaire s'arrêtait sur cette ligne, sans une seule
entrée cliquable. C'est ce qui donnait l'impression que le texte ouvert
n'était pas le bon — il n'y avait pas d'ouverture du tout.

Et un sujet ouvert depuis le sommaire ou la collection s'affiche désormais
**en entier**, même en mode accroche : on l'a cherché, on ne veut pas d'une
phrase.

### La taille du texte ne bougeait que l'accroche

Deux règles de bureau fixaient la taille du titre et des paragraphes en dur et
écrasaient l'échelle. Seule l'accroche, plus spécifique, y survivait. Un
réglage d'accessibilité qui ne s'applique pas au texte n'est pas un réglage.

### Le gratuit ne choisit plus ses univers

Choisir ses univers est une commande sur ce qu'on lit : elle rejoint la
collection et la pioche du côté payant. Le gratuit reçoit cinq anecdotes
tirées dans **tout** le catalogue — une découverte, pas une bibliothèque qu'on
trie. Le bouton disparaît plutôt que de rester sans effet.

### La console en six étapes numérotées

| | |
|---|---|
| **1 · Moisson** | ce qui est au catalogue, le réglage automatique, le lancement |
| **2 · Sélection** | retenir, écarter, envoyer à l'écriture |
| **3 · Relecture** | lire, filtrer par note, valider vers la réserve |
| **4 · Contrôle** | six outils, chacun avec ce qu'il fait et quand le lancer |
| **5 · Publication** | le rythme, l'ouverture du fonds |
| **6 · En ligne** | ce que vos lecteurs voient, et le retrait fiche par fiche |

Rien n'a été retiré : tout ce qui existait est rangé sous l'étape à laquelle il
appartient. Les outils de contrôle — doublons, structure des fiches, paires
FR/EN, reclassement, nettoyage — vivaient dans un menu déroulant d'action où
il fallait déjà savoir ce qu'on cherchait ; ils ont maintenant leur carte,
leur explication et leur bouton.

### Et aussi

L'installation a une entrée permanente dans le panneau d'options : la bannière
automatique ne se montrait qu'une fois, et « Plus tard » la faisait disparaître
pour de bon. La recherche répond dès la deuxième lettre, sans validation.

## 8.8.2 — le filtre d'univers ne filtrait rien

### Le tirage ignorait vos univers

Le défaut le plus sérieux de la 8.8. En gratuit, les cinq du jour étaient
tirées dans les huit univers **quoi que le lecteur ait coché**. Cocher
« Cosmos » ne changeait rien, et le filtre passait pour cassé — il l'était.

Le tirage pioche maintenant dans les univers retenus. Si ceux-ci n'ont pas de
quoi remplir la journée, on élargit plutôt que de servir trois fiches : une
préférence n'est pas un mur.

**Et le choix par défaut passe de deux univers à huit.** Tant que le tirage
les ignorait, ce choix initial n'avait aucune conséquence ; maintenant qu'il
le respecte, deux univers cochés d'office auraient contredit la promesse de la
page d'accueil — « les huit sont ouverts, dès la version gratuite ».

Enfin, changer d'univers en cours de journée **le dit** au lieu de laisser
croire à une panne : *« C'est noté. Vos cinq du jour sont déjà tirées : votre
choix s'appliquera demain matin. »* Les redistribuer à chaque changement
reviendrait à donner autant d'anecdotes qu'il y a de combinaisons.

### Le nom de l'univers disparaissait de la barre

Sous 560 px, il ne restait qu'une pastille de couleur et un chevron : on ne
savait plus ce qu'on lisait ni sur quoi on allait cliquer, et la barre passait
pour coupée. Il y avait pourtant **cinquante pixels de vide juste à côté**.

Le nom reste, et se contente de ce qu'on lui laisse — il se tronque proprement
plutôt que de s'effacer.

| Barre à 390 px | avant | maintenant |
|---|---|---|
| Bouton d'univers | 50 px, sans nom | **101 px, « Cosmos »** |
| Espace vide | 54 px | 3 px |

## 8.8.1 — le panneau au pouce, la barre à l'écran large

### Deux formes pour un seul balisage

Le panneau à sections répondait à un écran étroit ; sur un ordinateur, cacher
le thème et la pioche derrière un bouton était un recul. La barre retrouve
donc ses commandes dépliées **au-dessus de 1 100 px** — pas 900 : en dessous,
la rangée dépassait du bord et « Piocher » sortait de l'écran. Une barre qui
déborde est pire qu'un panneau.

Les intitulés disparaissent en rangée (chaque commande porte son infobulle),
la recherche redevient une icône seule, et la taille du texte reste au bouton
dédié de la barre plutôt que d'être proposée deux fois.

### Les accroches se suivent

Une fiche ne portant qu'une phrase occupait quand même un écran entier : on
voyait UNE accroche à la fois, c'est-à-dire exactement ce que le mode devait
éviter. Les fiches s'enchaînent maintenant, hauteur libre, séparées d'un
filet.

| | avant | maintenant |
|---|---|---|
| Hauteur d'une accroche | 844 px | 214 px |
| Visibles d'un coup | 1 | **4** |
| Calage magnétique | actif | suspendu |

Déplier rend à la fiche son écran entier, son magnétisme et sa rangée de fin :
on est revenu en lecture, et rien ne la distingue plus d'une autre. Une
accroche repliée ne consomme pas la journée offerte — sinon parcourir vingt
accroches l'aurait épuisée en trois secondes.

### La collection devient payante

Elle n'avait aucun sens en gratuit : les cinq du jour s'en vont le lendemain,
et garder l'une d'elles ne promettait rien qu'on puisse tenir. Le bouton
« Ma collection » et le geste « Garder » disparaissent donc en gratuit, et la
collection rejoint la pioche dans les avantages des trois formules payantes.

## 8.8.0 — valider n'est plus publier, et le nom devient un réglage

**Aucune fiche écrite n'est modifiée.** Les changements portent sur la console,
les deux pages et deux outils — jamais sur vos 1 152 textes.

### Valider ne publie plus

C'était le défaut le plus lourd. Valider une fiche la mettait EN LIGNE le jour
même : relire mille fiches revenait à tout publier d'un coup, sans réserve et
sans rythme. Valider veut désormais dire « je l'ai lue, elle est bonne, elle
rejoint la réserve ». C'est « 5 · Publier » qui décide ensuite quand elle sort.

Et pour constituer un fonds d'un seul geste, un nouveau bouton **Mettre en
ligne…** dans Relecture : il publie toute la réserve validée à partir d'une
note que vous choisissez.

### Choisir par la note

Un filtre de note dans Relecture, avec **l'effectif de chaque seuil** :

```
Toutes les notes — 1 152
Uniquement les 10/10 — … fiche(s)
9/10 et au-dessus — … fiche(s)
```

C'est ce compte qui répond à « combien puis-je ouvrir d'un coup ».

### Le nom du produit est un réglage

`consignes/marque.txt`, une ligne, et la construction le recopie partout où le
lecteur peut le lire — titre des pages, en-tête, FAQ, messages, manifeste
d'installation. Quarante-sept occurrences.

Ce qui ne change PAS, et c'est voulu : les clés de mémoire du navigateur
(`curio.plan`, `curio.favs`…), les noms de fichiers et le cache du service
worker. **Changer de nom ne déconnecte personne de sa collection.** Vérifié en
renommant le produit puis en le remettant.

### Le défilement revient à la verticale

Avec la place gagnée : elle ne venait pas de l'axe mais de `flex:1 1 auto` sur
la zone de lecture et de la phrase à raconter qui défile avec le texte. Les
deux gestes cohabitent par `overscroll-behavior:contain` — tant qu'il reste du
texte, le doigt le fait défiler ; au bout, il emmène la fiche.

### La fin de la journée offerte

Les cinq restent là, entières, relisibles autant qu'on veut. En dessous, une
**sixième fiche bien réelle dont on ne lit que le début**, le reste estompé
derrière le mur. Montrer ce qu'on rate vaut mieux qu'un écran fermé.

Et relire une fiche gardée ne consomme plus la journée : c'est ce qui rendait
la collection inutile en gratuit.

### Le panneau d'options

Sept boutons de formes différentes alignés au hasard de leur arrivée sont
devenus un panneau à sections — Lecture, Apparence, Explorer — chaque réglage
sur sa ligne, intitulé à gauche, commande à droite. Un réglage ne referme plus
le panneau ; seule une action le fait.

### La pioche

La bande de couleurs qui défilait était une animation de machine à sous posée
sur un produit de lecture. À la place : le fond se retire, une phrase paraît
en Fraunces — *« Le monde est plus étrange que vous ne le pensez »*, huit
variantes — un trait se remplit, la fiche arrive. La pioche est annoncée dans
les trois formules payantes.

### La moisson automatique se règle

`consignes/moisson.txt` : `auto: oui|non`. Sur « non », le passage de la nuit
se lance, constate et s'arrête en quelques secondes. Un lancement à la main
passe toujours outre. Réglable depuis l'onglet Publication.

### Essayer les trois formules

Trois liens dans la console : comme un lecteur gratuit, comme un abonné, comme
un achat à vie. Le réglage ne vaut que pour le navigateur qui ouvre le lien.

### Textes

« Dix anecdotes vous attendent » devient « Cinq anecdotes vous attendent
aujourd'hui ». La FAQ ne promet plus qu'un contrôle automatique rejette tout
brouillon reprenant des phrases, ni qu'une anecdote ne reviendra pas avant deux
mois — deux promesses que le code ne peut pas tenir mot pour mot.

## 8.7.0 — la journée offerte, et la lecture reprise à l'endroit

**Aucun outil, aucune consigne, aucun catalogue n'est touché par cette
version.** Elle ne concerne que le site et l'application : vos 276 fiches
écrites et vos lots en cours ne bougent pas d'un octet.

### Le gratuit devient une journée, pas un compteur

Cinq anecdotes, tirées au hasard le matin, à vous jusqu'à minuit. Demain, cinq
autres, et celles d'hier s'en vont. **Une même anecdote ne peut pas revenir
avant deux mois.**

Le tirage est arrêté pour la journée : rouvrir l'application ne rebat pas les
cartes — sans quoi il suffirait de recharger la page. Vérifié sur trois
journées simulées : cinq fiches par jour, aucun chevauchement, tirage stable
d'une ouverture à l'autre, et le mur « C'est tout pour aujourd'hui » exactement
après la cinquième.

Les fiches estompées ont disparu : une anecdote offerte se lit jusqu'au bout,
ou elle n'est pas proposée.

### On change de fiche en balayant sur le côté

Le flux défilait vers le bas, et le texte de chaque fiche défilait vers le bas
lui aussi : deux gestes identiques pour deux actions opposées. Un pouce qui
voulait lire la suite emportait la fiche entière — et on compensait en
rétrécissant la zone de lecture.

Le haut et le bas appartiennent maintenant au **texte**, la gauche et la droite
changent de fiche. Résultat mesuré sur un écran de 390 × 844 : la zone de
lecture passe à **74 % de la hauteur de l'écran**.

La phrase à raconter descend avec elle, à la fin du texte : on la découvre en
arrivant au bout de la fiche, à son moment. Son bouton « copier » a été retiré.
Un chevron discret apparaît sur le bord droit quand on atteint la fin.

### Le mode accroche

Un bouton dans le tiroir « … » : chaque fiche s'arrête à sa phrase d'ouverture,
et un bouton la déplie. De quoi trouver le sujet qui intrigue sans lire huit
fiches en entier.

### La pioche, et la fiche du jour

Réservées à l'abonnement et à l'achat à vie. La **pioche** tire une anecdote au
hasard dans tout le catalogue, avec une roue de couleurs qui ralentit — elle
évite ce qui vient d'être lu. La **fiche du jour** ouvre le flux d'un abonné
sur une anecdote qu'il n'a pas vue, une par jour : celui qui paie a lui aussi
son rendez-vous, mais sans compteur.

### Trois défauts trouvés en vérifiant

| | ce qui n'allait pas |
|---|---|
| Le bouton « … » | `.iconbtn{display:grid}` est écrit plus bas dans la feuille que le `display:none` du grand écran, à spécificité égale : le bouton restait affiché à côté d'un tiroir déjà déplié, et paraissait cassé. Même famille que le bouton FR/EN. |
| La fin d'abonnement | Le flux gardait le catalogue entier jusqu'au prochain rechargement. |
| La fiche du jour | Empilée avant les autres, elle sortait en dernier — un rendez-vous qu'on manquait. |

### Le site

L'étape « Lisez » devient « Deux minutes, une histoire entière », et cesse de
se défendre. Quatre entrées de la FAQ ont été retirées ; deux autres ont été
réécrites parce que les nouvelles règles les rendaient fausses — celle sur la
version gratuite, et celle qui promettait qu'un accès ne se perd jamais.

### L'installation

Elle n'était proposée que sur Chrome Android et sur iPhone. Elle l'est
maintenant partout, avec le mode d'emploi de la machine qu'on a sous les yeux —
ordinateur compris — et après deux fiches lues au lieu de trois.

## 8.6.2 — le menu comptait des sujets déjà écrits

Indispensable avant de travailler par lots, et surtout avant de mélanger deux
modèles.

Un sujet rédigé en français seul reste « à finir » — il lui manque l'anglais.
Le menu du panneau de lancement le comptait donc toujours, quelle que soit la
langue demandée. Après un lot français de quatre cent quarante sujets, il
aurait encore annoncé « 9/10 et au-dessus — 440 sujets » : de quoi croire que
rien ne s'était passé, et relancer pour rien.

Le compte suit maintenant les langues choisies dans le panneau, exactement
comme le fait l'outil d'écriture. Les libellés se réécrivent quand on change
de langue :

| Menu | après un lot français sur les 9/10 et + | en repassant sur « fr,en » |
|---|---|---|
| Uniquement les 10/10 | 0 | 108 |
| 9/10 et au-dessus | 0 | 440 |
| Tous les retenus | 708 | 1 148 |

C'est ce qui permet d'écrire les meilleurs sujets avec un modèle, puis le
reste avec un autre, sans jamais repasser sur les mêmes.

## 8.6.1 — le détecteur de copie se trompait, et il coûtait cher

### Ce qui s'est passé sur *Porte de l'Enfer*

Deux sujets demandés, trois appels facturés, une seule fiche. Le journal
annonçait **0,2062 $ la fiche** et projetait **216 $** sur le catalogue. Trois
défauts distincts, tous corrigés.

**1. La mesure était fausse.** Elle comptait les *positions* où huit mots
consécutifs se retrouvaient à l'identique. Une seule suite de onze mots compte
pour quatre positions : le seuil « plus de cinq » se déclenchait donc dès deux
petites suites — une vingtaine de mots sur cinq cent cinquante, **quatre pour
cent du texte**. Ce n'est pas une copie, c'est ce qu'on obtient forcément en
racontant « un cratère de gaz en feu depuis 1971 dans le désert du Karakoum ».

Et surtout : **le modèle ne voit jamais les phrases de l'article.** On ne lui
transmet qu'une fiche de faits en puces. Il ne peut pas recopier une prose
qu'on ne lui a pas montrée.

La mesure porte désormais sur **la part du texte** réellement identique et sur
**la plus longue suite continue** — deux nombres qu'on peut juger :

| Cas | Part reprise | Plus longue suite | Verdict |
|---|---|---|---|
| Texte neuf | 0 % | — | accepté |
| Faits denses, formulation propre *(le cas Porte de l'Enfer)* | 13 % | 13 mots | **accepté** |
| Deux phrases entières recopiées | 66 % | 40 mots | refusé |
| Article recopié | 100 % | 104 mots | refusé |

Le seuil se resserre automatiquement pour les articles trop courts pour être
réduits en puces : là, le modèle a vu la prose, et la prudence se justifie.

**2. Un texte payé n'est plus jamais jeté sur un soupçon.** Entre « propre » et
« copié » il y a une zone grise. Une fiche qui y reste après sa réécriture est
désormais **conservée en quarantaine**, avec sa raison en clair dans Relecture
(« 16 % du texte repris, plus longue suite 29 mots »). Vous tranchez. Rien ne
se publie depuis la quarantaine. Seule la copie manifeste est refusée — et
elle l'est du premier coup, sans second appel payé : elle était jusqu'ici
traitée comme un incident passager et redemandée une fois de plus.

**3. Le prix par fiche mélangeait tout.** Les appels rejetés sont maintenant
comptés à part, et la projection ne les reproduit plus mille fois :

```
║  0.08 $ (~0.07 €) au total
║  dont 0.04 $ pour les 2 fiche(s) obtenues — 0.0196 $ par fiche
║  et 0.02 $ d'appels rejetés : de l'argent qui n'a produit aucune fiche.
║  à ce rythme, les 20 sujet(s) qui restent coûteraient 0.39 $
```

### Le thème clair rendait les fiches illisibles

L'accroche et les mots en gras prenaient leur couleur **en dur — blanc**. Sur
le thème clair, où le fond de carte est presque blanc lui aussi, ils
disparaissaient : le lecteur voyait des trous dans le texte, exactement là où
se trouvent les chiffres qui portent l'anecdote. La couleur vient maintenant du
jeu de couleurs, comme tout le reste.

### Le bouton FR/EN, troisième et dernière fois

Masqué par le code, il était remis par une règle d'auteur. Corrigé dans la
feuille, il persistait chez qui avait déjà ouvert le site. On ne discute plus :
quand une seule langue est publiée, `build.sh` écrit
`<style>#langBtn{display:none !important}</style>` **dans l'en-tête de la
page**, avant toute feuille de style et sans une ligne de JavaScript.

Si le bouton est encore là après cela, c'est que le fichier servi n'est pas
celui du paquet : le badge de version dans la barre de l'application le dira.

## 8.6.0 — Sonnet par défaut, rien de perdu dans un lot, et l'anglais s'en va

### L'anglais était masqué, et le CSS le remettait

Le code faisait bien `b.hidden = true` sur le bouton FR/EN. Mais la feuille de
style du site donne `display:inline-flex` à ce bouton, et **une règle d'auteur
l'emporte sur le `display:none` que le navigateur applique à `[hidden]`** :
le bouton restait affiché quoi qu'on règle. Une ligne — `[hidden]{display:none
!important}` — et il disparaît.

Deuxième cause, indépendante : le réglage `langues` ne vivait que dans
`anecdotes/index.json`, écrit par une action. Tant qu'aucune action n'avait
tourné, la page ne savait rien. **Le réglage est désormais gravé dans
`index.html` et `app.html` à la construction** : il s'applique dès la première
seconde, hors ligne compris. `publication.txt` passe à `langues: fr`.

### Sonnet devient le défaut

Vous n'avez pas distingué Sonnet d'Opus. Le coût, lui, se distingue très
bien : **0,0196 $ contre 0,049 $ la fiche**, soit 23 $ contre 57 $ pour vos
1 158 sujets. Payer deux fois et demie pour une différence invisible est une
dépense inutile — c'est l'objet de cette version.

Opus reste à un clic, dans le menu du panneau de lancement.

### Un lot ne perd plus rien

Quatre défauts, tous du même genre : du travail payé qui disparaissait.

| | avant | maintenant |
|---|---|---|
| Enregistrement | par paquets de 10 | **à chaque fiche** |
| Crédit épuisé sur 300 sujets | 900 appels refusés | **arrêt au premier** |
| Catalogue après une interruption | faux, à réparer à la main | **remis d'accord au démarrage** |
| Action annulée | coupée en plein vol | **enregistre, puis s'arrête** |

Concrètement : si le crédit tombe au sujet 187 d'un lot de 300, les 186
premières fiches sont sur le disque, le catalogue le sait, **seul le 187e est
à reprendre**, et relancer la même tranche repart exactement de là.

### Le potentiel et le modèle, dans un vrai panneau

Le lancement d'une tranche passait par quatre fenêtres système enchaînées,
sans retour possible et sans jamais montrer le total. C'est maintenant **un
panneau unique** : seuil de potentiel (avec le nombre de sujets disponibles à
chaque seuil), nombre, langues, modèle — et le montant qui se recalcule à
chaque changement, sous les yeux jusqu'au clic.

### Ce qui est payé puis jeté se voit enfin

Les articles trop maigres (écartés **avant** tout appel, donc gratuits) et les
textes trop courts (écartés **après**, donc payés) tombaient dans le même
compteur. Ils sont séparés, et le second annonce la somme perdue.

### Les photos

Elles n'apparaissaient nulle part : le code les enregistrait pour chaque fiche
mais ne les affichait jamais. Elles sont maintenant posées sur l'art dessiné —
qui reste dessous, donc jamais de trou si l'image manque — **sous un voile de
30 %** pour que le texte prime. Nouveau réglage `images` dans la Publication :

* `oui` — la photo voilée (défaut)
* `franches` — la photo à nu
* `non` — aucune photo, l'art dessiné seul

### La réécriture payée (8.5.11)

Sur *Porte de l'Enfer*, un texte trop proche de la source était refusé, puis
redemandé **avec exactement le même message** — donc à peu près le même texte.
Trois appels facturés, zéro fiche. La seconde demande dit désormais ce qu'on
reproche et cite au modèle ses propres passages fautifs. La consigne mise en
cache ne bouge pas : l'économie de cache est intacte.

## 8.5.11 — une réécriture payée qui a une raison d'être différente

Votre test en Sonnet l'a montré sur *Porte de l'Enfer* : le texte reprenait
des passages entiers de l'article, l'outil l'a refusé, a redemandé — **avec
exactement le même message** — et a reçu, sans surprise, à peu près le même
texte. Trois appels facturés, zéro fiche.

Un rappel muet ne corrige rien. Désormais, quand un texte est refusé, la
demande suivante **dit ce qu'on reproche**, et le prouve :

```
· reprise trop proche (6 passages, 11 mots) —
  on réécrit une fois en citant les passages fautifs (appel payé)
```

Le modèle reçoit alors, à la suite de la fiche de faits, ses propres phrases
fautives et l'ordre de n'en réutiliser aucune suite de plus de sept mots. De
même pour une réponse illisible : on lui rappelle la forme exacte attendue au
lieu de répéter la question.

**La consigne mise en cache ne bouge pas** — le reproche s'ajoute au message
du sujet, jamais à la consigne. L'économie de cache est intacte.

## 8.5.10 — l'estimation calibrée sur la facture, pas sur une hypothèse

Le cache s'amorce bien : `3 000 mémorisés, 3 000 relus` sur une tranche de
deux — un appel qui mémorise, un qui relit. Restaient deux constantes fausses.

**Ce que dit vraiment le journal**, par appel : 2 000 jetons d'entrée plein
tarif (la fiche de faits et l'invite), 3 000 mis en cache (la consigne),
1 500 en sortie. J'avais écrit 1 000 et 2 000. D'où un prix annoncé de
0,0435 $ pour une facture à 0,049 $.

| | par fiche | 1 158 sujets en français |
|---|---|---|
| Opus 5 | **0,049 $** | 56,70 $ ≈ **52 €** |
| Sonnet 5 | **0,0196 $** | 22,70 $ ≈ **21 €** |

**Et la projection ne se fait plus sur le coût moyen.** La mise en cache se
paie une fois : sur deux fiches elle pèse un cinquième du prix, sur trois
cents elle ne pèse plus rien. Le journal donne donc le coût **marginal** — ce
que coûte la fiche suivante, cache chaud — et projette là-dessus :

```
║  0.12 $ (~0.11 €)  ·  0.0576 $ par fiche
║  0.0483 $ par fiche une fois le cache chaud (la mise en cache se paie une seule fois).
║  à ce rythme, les 1158 sujet(s) qui restent coûteraient 55.93 $ (~51.79 €).
```

## 8.5.9 — le cache coûtait au lieu de rapporter, et l'estimation était basse d'un quart

## 8.5.9 — le cache coûtait au lieu de rapporter, et l'estimation était basse d'un quart

Deux fiches écrites, `0,0608 $ par fiche` au lieu des `0,0335` annoncés. Les
jetons du journal disent exactement pourquoi.

### 1. `6 000 mémorisés, 0 relu`

Trois requêtes partent **en parallèle**. Toutes arrivent avant que la consigne
soit mémorisée : chacune paie la mise en cache — au tarif majoré de 25 % — et
**aucune n'en profite**. Sur une tranche de deux, le cache coûtait 0,037 $ et
ne rapportait rien.

**Le premier appel part maintenant seul.** Les suivants attendent qu'il ait
fini, puis relisent la consigne à un dixième du prix. Une seconde d'attente au
démarrage, quinze pour cent sur toute la tranche. Le premier appel libère les
autres même s'il échoue, pour qu'une erreur au démarrage ne bloque jamais rien.

Éprouvé sur six fiches, trois ouvriers en parallèle : **2 000 jetons mémorisés
une fois, 10 000 relus**. Avant : 6 000 mémorisés, 0 relu.

### 2. L'estimation supposait 1 100 jetons de sortie. Il en faut 1 500.

C'est le deuxième quart manquant, et c'est ma faute : le chiffre venait d'un
calcul, pas d'une mesure. Corrigé d'après vos tranches réelles.

**Le budget honnête, pour Opus 5 :**

| | par fiche | 1 158 sujets en français |
|---|---|---|
| annoncé jusqu'ici | 0,0335 $ | 38,80 $ ≈ 36 € |
| **réel, cache amorcé** | **0,0435 $** | **50,40 $ ≈ 47 €** |
| sans cache | 0,0525 $ | 60,80 $ ≈ 56 € |

Mesuré après correction : **0,0454 $ par fiche** sur six fiches, l'écart
restant étant l'amorce du cache, qui se dilue sur un gros lot.

### 3. Le journal projette le reste, au rythme constaté

```
║  0.27 $ (~0.25 €)  ·  0.0454 $ par fiche
║  à ce rythme, les 20 sujet(s) qui restent coûteraient 0.91 $ (~0.84 €).
```

C'est le seul chiffre à regarder avant de lancer un gros lot — et il est
calculé sur ce que l'API a réellement facturé, pas sur une hypothèse. Si le
cache n'a pas servi parce que la tranche était trop courte, une ligne le dit
plutôt que de laisser croire à un surcoût durable.

Corrigé aussi : la ligne « aucun jeton relu » s'affichait en même temps que
le décompte du cache — un `else if` accroché à la mauvaise condition.

## 8.5.8 — « rien de neuf » : la tranche reprenait les sujets déjà écrits

## 8.5.8 — « rien de neuf » : la tranche reprenait les sujets déjà écrits

**Le symptôme.** Une tranche de deux sujets, lancée pour valider le coût :

```
▸ fr/vivant : rien de neuf
▸ fr/sciences : rien de neuf
║  0 fiche(s) écrite(s)  ·  0.00 $
```

**La cause.** Un sujet écrit en français seul reste « à écrire » — il lui
manque l'anglais, c'est voulu. Mais le plan de tranche prenait simplement les
mieux notés parmi les « à écrire », donc **les mêmes qu'à la tranche
précédente** : Axolotl et Semmelweis, déjà rédigés. Le garde-fou a joué —
aucun centime dépensé, rien de réécrit — mais la tranche ne servait à rien.

**Le remède.** Le plan écarte d'emblée les sujets dont **toutes les langues
demandées** sont déjà rédigées, d'après le champ `langues` du catalogue
maître. Une tranche en français passe donc aux suivants ; une tranche en
anglais, elle, les reprendra bien puisqu'il leur manque l'anglais.

Le journal le dit : *« 2 sujet(s) déjà écrits en fr sont passés — ils ne seront
jamais repayés. »*

Éprouvé sur dix sujets dont les deux mieux notés déjà écrits en français : la
tranche de deux prend les suivants, écrit deux fiches, **0,0335 $ par fiche**.

Corrigé aussi : la ligne « cache : aucun jeton relu » s'affichait même quand
aucun appel n'avait été fait, ce qui laissait croire à un défaut de cache
alors qu'il n'y avait simplement rien eu à écrire.

## 8.5.7 — l'aperçu lecteur, sans rien publier

## 8.5.7 — l'aperçu lecteur, sans rien publier

« Sur le contenu ça me semble bien, mais je n'ai pas vraiment la mise en
forme, il faut que je publie ? »

**Non.** La relecture montrait le texte, pas la carte : titre en sans-serif,
accroche noyée dans le corps, gras en bleu plat. Rien de faux, mais rien qui
ressemble à ce que le lecteur verra. Deux réponses.

### 1. Un bouton « aperçu lecteur » sur chaque fiche

Il ouvre **la carte, telle qu'elle sera** : la vignette de l'article en fond,
le voile, l'univers et le temps de lecture en surtitre, le titre en Fraunces,
l'accroche détachée avec son filet bleu, le gras surligné, le bloc « à
raconter » — et une mention qui rappelle que rien n'est mis en ligne. Échap ou
un clic à côté referme.

Aucune publication, aucun appel réseau, aucune dépense : tout est déjà dans la
fiche.

### 2. La relecture elle-même se met au format

Même quand l'aperçu est fermé : titre en Fraunces, **accroche en grand avec
son filet**, gras surligné plutôt que bleu plat, italiques, et trois
paragraphes visibles au lieu de deux — puisque le premier est désormais
l'accroche et ne compte pas comme du texte.

**Un défaut trouvé en mesurant plutôt qu'en regardant.** L'aperçu utilisait
une classe `.pied`, déjà employée par la barre du bas de la console — en
position fixe. La ligne de bas de carte se retrouvait donc projetée en bas de
la fenêtre, hors du cadre. Renommée `.notule`. Vérifié par les coordonnées :
la ligne est maintenant à 912-944 px, dans un cadre qui va de 131 à 969.

## 8.5.6 — les deux tiers de la facture partaient en raisonnement

## 8.5.6 — les deux tiers de la facture partaient en raisonnement

**Ce que le journal a fini par dire**, une fois qu'il disait quelque chose :

```
· réponse illisible — arrêt « max_tokens », blocs « thinking+text »
```

**`thinking`.** Opus 5 réfléchit avant de répondre, et ce raisonnement interne
est facturé **en jetons de sortie**, à 25 $ le million. Mesuré sur votre
tranche de deux sujets : **2 750 jetons de sortie par appel** au lieu des
1 100 que fait le texte. Les deux tiers de la facture, invisibles — et, comme
ils comptent dans le plafond de longueur, ils coupaient la réponse en plein
milieu, ce qui provoquait un appel de plus.

D'où votre `0,1720 $ par fiche` au lieu de `0,0335 $`.

**Le remède.** `thinking: { type: "disabled" }` est envoyé avec chaque appel.
Écrire une anecdote de 3 000 signes à partir d'une fiche de faits ne demande
aucun raisonnement caché : la consigne dit exactement quoi faire, et c'est
elle qui porte la qualité. Si un modèle refuse ce réglage, le code s'en passe
et élargit le plafond pour ne pas être coupé — et le journal le dit.
`--avec-pensee` le rétablit.

Mesuré sur une API de substitution reproduisant les deux comportements :

| | sortie par appel | coût par fiche |
|---|---|---|
| avec raisonnement | 2 750 jetons | 0,0735 $ |
| **sans** | **1 100 jetons** | **0,0335 $** |

C'est très exactement l'estimation annoncée. Et le compte rendu affiche
désormais la part de raisonnement quand il y en a :
*« dont 0.006 M de raisonnement interne (59 % de la sortie, facturé plein
tarif) »*.

**Deuxième économie, plus petite.** La détection de « texte trop proche de la
source » se déclenchait à trois suites de huit mots communes. Or la fiche de
faits conserve l'ordre des mots de l'article : quelques suites communes sont
inévitables et ne sont pas des copies. Seuil porté à cinq, et **une seule**
réécriture au lieu de deux — chacune est un appel payé.

**Votre budget redevient celui annoncé** : 1 200 sujets en français,
1 200 textes, **40 $ ≈ 37 €** avec Opus 5.

## 8.5.5 — « réponse illisible » : c'étaient des retours à la ligne

## 8.5.5 — « réponse illisible » : c'étaient des retours à la ligne

**Le symptôme.** Trois sujets, trois échecs, et une facture qui monte :

```
  ! Axolotl : réponse illisible
  ! Ignace Philippe Semmelweis : réponse illisible
  ! Géoglyphes de Nazca : réponse illisible
```

**La cause.** Le modèle répond par un objet JSON dont le champ `texte`
contient une anecdote de six paragraphes — donc des **retours à la ligne**. La
norme JSON exige qu'ils soient écrits `\n` ; un modèle qui rédige les met
souvent tels quels. `JSON.parse` refuse alors la réponse **entière**, et un
texte parfaitement bon partait à la poubelle. Trois fois par sujet, chaque
tentative facturée.

C'est aussi l'explication de votre 0,45 $ puis 1,09 $ : les appels étaient
servis — donc payés — et jetés à la lecture.

**Le remède : on répare avant de renoncer.**

1. `JSON.parse` tel quel ;
2. sinon, on échappe les sauts de ligne **à l'intérieur des chaînes**, et rien
   d'autre — un automate qui suit l'état « dans une chaîne / hors chaîne » ;
3. sinon, on va chercher les quatre champs un par un, à la main, en tolérant
   l'ordre des clés et une accolade manquante.

Éprouvé sur six formes de réponse : JSON correct, sauts de ligne bruts,
préambule et clôture en ```json, accolade finale manquante, guillemets
français dans le texte — **5 lues sur 5**, et la sixième (« je ne sais pas
répondre ») correctement refusée.

**Et le journal dit enfin ce qui s'est passé.** À la première réponse
illisible, il affiche le motif d'arrêt renvoyé par l'API, les types de blocs
reçus, la longueur, et les deux cents premiers caractères tels quels :

```
  · réponse illisible — arrêt « max_tokens », blocs « text », 441 caractères reçus
    début : "{\"titre\": \"Un titre distinct\", \"texte\": \"Une phrase…"
```

**Réponse coupée = budget relevé, une fois.** Si l'arrêt est `max_tokens`, le
texte est vraiment tronqué et aucune réparation n'y peut rien : la limite
passe de 1 800 à 4 000 jetons pour la suite de la tranche, et le journal le
dit. Éprouvé : trois fiches écrites après relèvement, contre zéro avant.

## 8.5.4 — le coût, enfin visible, et plafonné

## 8.5.4 — le coût, enfin visible, et plafonné

**Le constat.** Trois sujets d'essai, 0,45 $ dépensés, la tranche encore en
cours. L'estimation annonçait 0,10 $. Trois défauts se cumulaient, et aucun ne
se voyait.

### 1. Jusqu'à cinq appels facturés pour un seul sujet

`ask()` réessayait **cinq fois**. Deux des trois motifs de reprise sont des
appels **servis, donc facturés** : une réponse illisible, et un texte jugé trop
proche de l'article source. Un sujet récalcitrant pouvait donc coûter cinq
fois son prix, en silence.

Désormais : **trois tentatives au maximum** — la première et deux reprises —
et chaque reprise s'annonce dans le journal en disant que l'appel est payé.
Les erreurs réseau (429, 5xx), elles, ne sont pas facturées et gardent leurs
tentatives.

### 2. `max_tokens` à 2 400 pour un texte qui en fait 1 100

Une réponse bavarde pouvait coûter le double sans rien apporter. Plafond
ramené à **1 800**, largement au-dessus des 3 500 signes demandés.

### 3. Le coût réel ne s'affichait pas

Le bloc « Jetons / Cache / Coût réel » n'existait que dans l'ancien mode de
rédaction, pas dans les tranches — c'est-à-dire nulle part où vous le voyiez.
La tranche termine maintenant par :

```
╠══ ce que cette tranche a coûté ────────────────────────────
║  0.012 M jetons en entrée · 0.013 M en sortie
║  cache : 0.002 M mémorisés, 0.022 M relus à 1/10 du prix
║  0.41 $ (~0.38 €)  ·  0.0345 $ par fiche
```

Et toutes les dix fiches, en cours de route :
`10/12 écrites — 0.35 $ dépensés (0.0347 $ par fiche)`.

Si le cache ne sert pas, la ligne le dit au lieu de laisser croire à
l'économie annoncée.

### 4. Un plafond de dépense, automatique

**C'est le garde-fou qui manquait.** Sans réglage, la tranche se donne un
plafond de **deux fois et demie l'estimation** ; au-delà, elle s'arrête
proprement, enregistre ce qui est écrit, et le dit. Relancer reprend où elle
en était, sans rien repayer.

```
║  12 sujet(s) → 12 texte(s) → 0.40 $ (~0.37 €)
║  plafond de sécurité : 1.01 $ — au-delà, la tranche s'arrête
║  et enregistre ce qu'elle a fait.
```

Le champ **`plafond`** de l'action le remplace par le vôtre. Sur un lot de
300 sujets, c'est la différence entre une surprise à dix euros et une surprise
à cinquante.

Éprouvé sur une API de substitution : plafond à 0,15 $ → arrêt après 7 fiches
sur 12, tout enregistré, relance reprenant les 5 restantes sans repayer les 7.

## 8.5.3 — « `temperature` is deprecated for this model »

## 8.5.3 — « `temperature` is deprecated for this model »

**Le blocage.** Cinq sujets lancés, cinq échecs, zéro fiche :

```
  ! Axolotl : `temperature` is deprecated for this model.
  ! Ignace Philippe Semmelweis : `temperature` is deprecated for this model.
  ! Géoglyphes de Nazca : `temperature` is deprecated for this model.
```

L'appel envoyait `temperature: 0.7`. **Opus 5 refuse ce paramètre**, et rejette
la requête entière. Rien n'a été facturé — un appel refusé n'est pas un appel
servi — mais rien n'a été écrit non plus.

**Le remède.** Le paramètre est retiré de l'appel Anthropic. L'omettre est
valable pour tous les modèles, et il ne nous manque pas : c'est la consigne qui
tient le style, pas un réglage de hasard. Le chemin OpenAI, lui, le garde.

**Deux corrections de lisibilité que cet échec a révélées :**

- Le journal disait `22268 sujet(s) restent à écrire dans le catalogue maître`
  alors que l'écriture ne pioche **que** dans vos retenus — ce qu'elle faisait
  déjà, et que l'encadré du haut annonçait correctement. Il dit maintenant :
  *« Il reste 6 sujet(s) à commencer et 4 à finir dans l'autre langue, parmi
  VOS 1 158 sujets retenus. »*
- Quand **tout** échoue, la cause est une, et elle est désormais affichée en
  clair sous l'encadré, comptée et telle que l'API l'a renvoyée, avec la seule
  chose à savoir : rien n'a été facturé, et relancer la même tranche reprend où
  elle en est.
- Et l'invitation finale renvoyait à « 4 · Publier », qui n'existe pas. C'est
  **5 · Publier**.

Éprouvé sur une API de substitution : refus systématique → 0 écrite, la cause
nommée trois fois, aucun texte perdu ; API acceptante → 3 fiches écrites,
puis, à la relance, une seule nouvelle et les trois précédentes sautées sans un
appel.

## 8.5.2 — l'anglais restait sur le site tant que rien n'était publié

## 8.5.2 — l'anglais restait sur le site tant que rien n'était publié

**Le constat.** « L'anglais est toujours présent sur le site web ? » Oui — et
c'était un défaut de la 8.5.0.

La règle écrite alors était : *cacher le bouton FR/EN quand une langue compte
des fiches en ligne et l'autre zéro*. Elle se déduisait de
`anecdotes/index.json`, donc du **nombre de fiches publiées**. Avec un
catalogue moissonné mais rien d'écrit, les deux comptes valent zéro : aucune
langue ne « gagne », et le bouton reste. Le réglage *Langues publiées =
Français seul* n'avait donc aucun effet visible tant que la première fiche
n'était pas en ligne — c'est-à-dire précisément pendant la période où vous
préparez tout.

**Le remède : le réglage est écrit là où le site le lit.** `langues`, tel que
vous le posez dans la console, est désormais recopié par les outils dans
**`catalog.json`** (à la moisson) et dans **`anecdotes/index.json`** (à chaque
recomptage). L'application et le site le lisent, et il **prime sur le
comptage** : une seule langue réglée, le bouton disparaît immédiatement, même
avec zéro fiche publiée. Le comptage reste en second recours pour les dépôts
qui n'ont pas encore de réglage.

**Pour l'appliquer tout de suite**, sans attendre une moisson :
*Entretien → **recompter*** réécrit `index.json` en quelques secondes,
gratuitement.

Éprouvé au navigateur, sur le site et dans l'application, avec zéro fiche
publiée : `langues: fr` → bouton caché des deux côtés ; `langues: fr,en` →
bouton présent des deux côtés.

## 8.5.1 — « écrit en français seul » se voit enfin

## 8.5.1 — « écrit en français seul » se voit enfin

**La question.** « Les fiches écrites mais qui restent dans *à écrire*, comment
les distinguer ? Et comment fais-tu pour ne pas réécrire dedans ? »

**Comment l'outil, lui, ne s'y trompe pas.** Avant tout appel payant, la
rédaction lit le fichier de sortie et écarte ce qui s'y trouve déjà :

```js
const restants = entrees.filter(e => !store.items[e.titre]);
```

`store`, c'est `anecdotes/fr-cosmos.json` — le fichier réel, pas une mémoire de
l'exécution. Un titre déjà présent n'est même pas mis dans la file : pas
d'article téléchargé, pas de jeton dépensé. C'est ce qui rend une tranche
« français seul » suivie d'une tranche « anglais » strictement additive.

**Ce qui manquait : le voir.** Un sujet écrit en français restait affiché
« à écrire », exactement comme un sujet auquel personne n'avait touché. Trois
choses le distinguent maintenant :

| | avant | maintenant |
|---|---|---|
| état | « à écrire » | **« à finir »**, badge doré |
| badges de langue | `FR` `EN` gris, indiquant seulement que le titre existe | **`FR` plein et vert** quand la fiche est écrite, `EN` creux tant qu'elle ne l'est pas |
| filtre | « À écrire » | « À écrire — rien de fait » **et** « À finir — une langue sur deux » |
| compteur | — | un bloc **« à finir »** en tête de la console |

Le catalogue maître porte désormais un champ **`langues`** — les langues
réellement rédigées, constatées sur le disque après chaque tranche — et
`catalogue-maitre.csv` une colonne **`langues_ecrites`**. La console sait aussi
le déduire des fiches qu'elle a chargées, donc l'affichage est juste même pour
un catalogue écrit avant cette version.

Le bouton **Écrire** compte les « à finir » avec les « à écrire » : ce sont
bien des sujets qui attendent du texte. Il ne repaiera que ce qui manque.

Éprouvé au navigateur sur 50 sujets — 30 vierges, 12 en français seul,
8 complets : les trois filtres donnent 30, 12 et 8, le badge FR est plein et le
badge EN creux sur les douze, et le tableau de bord `catalogue.html` les
retrouve aussi.

## 8.5.0 — écrire par lots, publier à son rythme, et le français seul

### 1. On écrit un NOMBRE DE SUJETS, plus un budget en euros

« Cinq pour mes tests, puis par lots. » C'est le bon raisonnement, et l'action
ne savait parler qu'en euros. Elle a maintenant un champ **`sujets`** qui
prime sur le budget, et le bouton **Écrire** de la console demande simplement
combien.

```
╔══ TRANCHE DE 5 SUJET(S) ══════════════════════════════════
║  modèle : claude-sonnet-5
║  langue(s) : fr  — l'autre langue restera à écrire
║  0.0134 $ par texte, 1 texte(s) par sujet.
║  consigne mise en cache : 21 % de moins (0.0170 $ sans elle).
║  5 sujet(s) → 5 texte(s) → 0.07 $ (~0.06 €)
```

### 2. Le français maintenant, l'anglais plus tard — sans rien perdre

Nouveau champ **`langues`** : `fr,en`, `fr` ou `en`. Écrire le français seul
divise la facture par deux, et **ne perd rien** : un sujet n'est marqué
« écrit » que lorsque ses deux fiches existent **sur le disque**. Un sujet
écrit en français reste donc « à écrire », la tranche anglaise d'un autre jour
le retrouve, et le français n'est jamais repayé — une fiche déjà présente est
sautée avant tout appel.

Le journal le dit : *« 300 sujet(s) écrits dans une seule langue : ils restent
« à écrire » et attendent leur tranche dans l'autre langue. Rien ne sera
repayé. »*

### 3. Le rythme de publication se règle depuis la console

Un troisième onglet, **Publication**. L'action tourne toujours tous les jours
à 6 h UTC ; c'est `consignes/publication.txt` — écrit par la console — qui
décide si aujourd'hui compte.

| réglage | ce qu'il fait |
|---|---|
| **rythme** | `quotidien` · `hebdomadaire` · `jours` (les jours cochés) · `pause` |
| **jours** | lundi…dimanche, à cocher |
| **parPassage** | combien de sujets à chaque sortie |
| **jusqu-au** | *« tout sortir d'ici le 31 décembre »* — le nombre par passage est recalculé à chaque exécution, donc il s'ajuste si vous écrivez de nouvelles fiches |
| **langues** | quelles langues sont publiées |
| **ordre** | potentiel · note · hasard |

Un aperçu, sous les réglages, dit ce que cela donne : *« 2 sujets à chaque
passage (34 prêts répartis sur 17 passages d'ici le 2026-12-31), 1 passage par
semaine. Réserve : 34 sujets prêts — de quoi tenir 17 semaines. »*

Deux boutons de plus : **Publier maintenant…**, qui passe outre le rythme, et
**Voir l'état du stock**.

### 4. Retirer l'anglais du site et de l'application

`langues: fr` suffit. Les fiches anglaises restent au dépôt, simplement non
publiées — et le jour où vous ajoutez `en`, tout ce qui est écrit et contrôlé
sort, **sans réécrire la date de publication du français**.

Côté lecteur, rien à régler : le bouton **FR/EN disparaît** tant qu'une seule
langue est publiée, dans l'application comme sur le site, et la langue
affichée s'aligne d'elle-même. Le bouton revient tout seul le jour où l'autre
langue est en ligne. C'est déduit de `anecdotes/index.json`, pas d'un réglage
de plus à tenir à jour.

**Éprouvé** : rythme hebdomadaire un lundi (aujourd'hui jeudi → rien ne sort),
puis jeudi (3 sujets) ; jours `2,5` puis `2,4,5` ; étalement jusqu'au
31 octobre → 26 passages, 2 par passage ; français seul → seules les fiches FR
sortent ; anglais rallumé → seules les fiches EN sortent, les dates françaises
intactes. Console : les cinq réglages, l'aperçu, l'écriture de
`publication.txt`, et le lancement d'une tranche de 5 sujets en français —
aucune erreur JavaScript.

## 8.4.5 — la consigne était payée deux mille quatre cents fois

**Le constat.** Votre consigne de rédaction fait environ deux mille jetons, et
elle est **identique pour les 2 400 textes** d'une tranche de 1 200 sujets.
Elle était réexpédiée à chaque appel : cinq millions de jetons payés plein
tarif pour dire deux mille quatre cents fois la même chose.

**Le remède.** `cache_control` sur le bloc système. Le premier appel la fait
mémoriser (×1,25), tous les suivants la relisent à **un dixième du prix** tant
que les appels s'enchaînent — ce qui est le cas, trois requêtes en parallèle
sans interruption. Si l'API refuse la mise en cache, le code s'en passe et
continue : c'est une économie, pas une dépendance. `--sans-cache` la coupe.

**Et une correction de vérité au passage.** L'estimation reposait sur
1 800 jetons d'entrée par texte. La réalité : deux mille pour la consigne plus
mille pour la fiche de faits, soit **trois mille**. L'action sous-évaluait
donc la facture d'un tiers. Les constantes sont corrigées, et l'estimation
tient compte du cache.

Pour 1 200 sujets, soit 2 400 textes :

| modèle | ancienne estimation | sans cache (réel) | **avec cache** |
|---|---|---|---|
| Opus 5 | 86 $ | 102 $ | **80 $ ≈ 74 €** |
| Sonnet 5 | 35 $ | 41 $ | **32 $ ≈ 30 €** |
| Haiku 4.5 | 17 $ | 20 $ | **16 $ ≈ 15 €** |

L'encadré d'estimation affiche désormais « consigne mise en cache : 21 % de
moins », et le compte rendu de fin dit ce que la tranche aurait coûté sans
elle, jetons de cache à l'appui.

Conséquence utile : **vous pouvez écrire des consignes riches sans les payer
au mot.** Les quatre règles ajoutées en 8.4.4 ont allongé `consignes/fr.md` de
moitié ; avec le cache, cela ne coûte plus rien.

## 8.4.4 — l'accroche devient un bloc, et le début se comprend du premier coup

Trois remarques sur la fiche d'exemple, toutes justes, et une quatrième
trouvée en regardant le rendu.

### 1. « J'ai eu du mal avec le début »

C'était le vrai défaut. L'ancienne ouverture :

> Le temps de lire cette phrase, vous vous êtes déplacé de douze cents
> kilomètres. Pas autour du Soleil, pas avec la rotation de la Galaxie : en
> plus de tout cela, dans une direction précise du ciel…

Deux négations et une exception avant que le lecteur ait la moindre image en
tête. **On ne peut pas nier ce qui n'a pas encore été posé.** La nouvelle :

> Vous êtes en train de tomber.
>
> Pas vers le sol. Vers un point du ciel, dans la constellation du Centaure,
> et vous ne le sentez pas.

Une section **« Se faire comprendre du premier coup »** entre dans
`consignes/fr.md` et `en.md`, et dans les consignes de secours du code : une
idée par phrase, deux propositions au maximum ; affirmer avant de corriger ;
toute notion technique expliquée dans la phrase où elle apparaît, par une
comparaison familière (« le fond diffus cosmologique » devient « la plus
vieille lumière de l'univers », avec le sifflement du train qui monte quand il
vient vers vous) ; et la première phrase de chaque paragraphe doit se
comprendre hors du texte.

### 2. L'accroche est un paragraphe à elle seule

Elle n'était qu'« un peu plus grosse » que le corps — à l'œil, on entrait dans
l'article sans voir qu'on avait commencé. Elle a maintenant :

- **une règle d'écriture** : un paragraphe isolé, vingt-cinq mots au plus, une
  ou deux phrases courtes, qui pose une chose et une seule ;
- **une typographie** : Fraunces, corps 21 à 26 px, filet bleu à gauche, de
  l'air en dessous (`parts/00-head.html`) ;
- **un contrôle** : au-delà de quarante-cinq mots, `3 · Contrôler` la recale —
  ce n'est plus une accroche, c'est un mur.

### 3. Le gras passe de deux à cinq

« Jamais plus de deux » rendait le texte plat pour qui le parcourt des yeux.
La consigne demande maintenant **trois à cinq** éléments — les chiffres et les
noms qui portent l'histoire —, jamais une phrase entière, jamais deux dans la
même phrase. Le contrôle, qui recalait au-delà de quatre, tolère six.

### 4. Le titre ne répète plus l'accroche

Trouvé en regardant le premier rendu : titre « Nous tombons vers un point
invisible », accroche « Vous êtes en train de tomber. » — la même phrase deux
fois, à deux lignes d'intervalle, au moment précis où le lecteur venait d'être
pris. La règle entre dans les deux consignes, et `3 · Contrôler` la vérifie :
si l'un commence par l'autre, la fiche part en quarantaine.

Éprouvé sur les deux fiches d'exemple (français et anglais, 2 538 et 2 551
signes, accroche + 6 paragraphes, 5 gras, 23 et 26 mots à raconter) : **2
conformes**. Et sur trois fiches fautives fabriquées exprès — titre répété,
accroche de 67 mots, sept gras — **3 recalées**, chacune avec le bon motif.

### Et le déploiement

Un fichier **`.nojekyll`** vide est ajouté à la racine : il empêche GitHub de
faire passer le site dans son moteur de blog avant de le publier. Inutile ici,
et source classique de fichiers qui disparaissent sans explication.

## 8.4.3 — la passe qualité, sur les seuls sujets retenus

**La demande.** « Est-il possible d'avoir encore une passe de vérification de
qualité uniquement sur les sujets retenus ? »

Oui, et c'est le bon endroit pour la mettre. La moisson vérifie des dizaines
de milliers de sujets, vite et grossièrement — c'est ce que permet le budget.
Ce que vous vous apprêtez à **payer**, c'est quelques centaines. Ceux-là
méritent un examen sérieux, et comme ils sont peu nombreux, il tient en
quelques minutes de réseau.

**`Entretien → auditer`**, ou le bouton **« Vérifier les N retenus »** dans la
console, entre *Enregistrer mes décisions* et *Écrire*. Il reprend chaque sujet
retenu à zéro et pose huit questions :

| contrôle | verdict |
|---|---|
| l'article existe-t-il encore sur Wikidata ? | **grave** |
| son introduction est-elle assez fournie, dans au moins une langue ? | **grave** |
| est-ce une page d'homonymie (« peut désigner », « may refer to ») ? | **grave** |
| la phrase est-elle une définition d'encyclopédie ? | **grave** |
| y a-t-il une phrase, et fait-elle huit mots ? | **grave** |
| le titre est-il en double, ou dans `exclusions.txt` ? | **grave** |
| la phrase partage-t-elle un mot avec l'article ? | **doute** |
| l'article a-t-il été renommé depuis la moisson ? | **doute** |

Deux niveaux, et la distinction est délibérée : **grave** veut dire « ce sujet
n'a rien à faire dans une tranche payante » ; **doute** veut dire « c'est
peut-être très bien, mais regardez-le ». Un accord à zéro reste un doute — une
phrase peut légitimement raconter un épisode que l'introduction ne mentionne
pas.

**Rien n'est jamais supprimé.** Par défaut l'audit ne fait que dire : il écrit
`audit-retenus.csv`, les ennuis en tête, une ligne par sujet avec son motif.
Coché **appliquer** (ou *OK* dans la fenêtre du bouton), il fait une seule
chose de plus : passer les **graves** en « écarté » dans `decisions.json`. Les
sujets restent au catalogue, et un clic dans la console les reprend.

Au passage, l'audit **rafraîchit le catalogue** sur ce qu'il vient de
télécharger : l'accord est recalculé sur l'introduction entière — plus fiable
que sur les deux phrases conservées —, l'aperçu et les titres renommés sont
mis à jour.

Éprouvé sur une Wikipédia miniature reproduisant les huit défauts plus trois
sujets sains : **8 graves sur 8 détectés, 3 doutes, 3 sans réserve**, le sujet
non retenu jamais touché, et `--appliquer` écarte exactement les huit.

Corrigé en même temps : **les workflows n'enregistraient pas
`consignes/decisions.json`**. Un audit appliqué — ou toute écriture du fichier
par une action — n'aurait rien laissé dans le dépôt.

## 8.4.2 — quatre sujets sur cinq dans « Mystères », et le filtre qui manquait

### 1. L'univers venait du titre de la section, qui est une date

**Le symptôme, dans votre journal.**

```
mysteres 12810 · arts 1017 · sciences 603 · vivant 523
histoire 395 · esprit 282 · cosmos 279 · terre 276
```

Quatre sujets sur cinq dans un seul univers, et sept univers quasi vides.

**La cause.** L'univers était déduit du **titre de la section** de la page
moissonnée. Sur les listes d'articles insolites, ces titres sont parlants
(« Science », « Animals », « Places ») et le classement marchait. Sur les
archives de « Le saviez-vous ? » — la source qui apporte désormais les deux
tiers du catalogue — les sections sont des **dates** : « Janvier 2015 » ne dit
rien du sujet. Et `universDeSection()` renvoyait `mysteres` faute de mieux.
Le fourre-tout était devenu le dépotoir.

**Le remède : c'est l'article qui décide.** Faute de signal dans la section,
on lit le titre, votre phrase et l'introduction — **tout est déjà téléchargé
par la vérification**, ce classement ne coûte donc pas un seul appel réseau.
Chaque univers a son vocabulaire, français et anglais ; le mieux servi gagne ;
l'égalité ou le silence laissent « Mystères », qui redevient ce qu'il doit
être : un univers, pas un défaut.

Éprouvé sur douze sujets réels, français et anglais : **12/12**.

| sujet | rangé dans |
|---|---|
| Grand Attracteur | cosmos |
| Turritopsis dohrnii · Inky (octopus) | vivant |
| Lac Nyos | terre |
| Concile cadavérique · Emu War | histoire |
| Aphantasie | esprit |
| Expérience de la goutte de poix | sciences |
| Manuscrit de Voynich · Yves Klein | arts |
| Tamám Shud | mystères |

Un texte sans aucun signal renvoie « je ne sais pas » plutôt qu'un rangement
inventé.

**Pour le catalogue que vous avez déjà** : *Entretien → **ranger***.
Instantané, sans réseau, à partir de l'aperçu que le catalogue conserve. Il ne
touche **que** les sujets rangés dans « Mystères », jamais un sujet phare —
l'univers y est le vôtre — ni une fiche déjà écrite, dont les textes vivent
dans le fichier de son univers. Le journal affiche la répartition avant et
après, et `catalog.json` comme `catalogue-maitre.csv` sont régénérés.

Éprouvé sur 640 sujets fabriqués : 381 déplacés, 191 laissés en « Mystères »
faute de signal, 28 intouchables (phares et fiches écrites) — et les 40 déjà
bien rangés n'ont pas bougé.

### 2. Douze minutes utilisées sur quarante

`9168 sur 16141 cette fois — le temps restant ne permet pas plus`, puis
`Passe terminée en 12.6 minute(s) sur 40 allouées`. Vingt-sept minutes
perdues, et 6 973 sujets remis à plus tard sans raison.

**La cause.** Le nombre de sujets à vérifier était **estimé** d'avance —
quatre par seconde restante —, une calibration faite quand le réseau voyait
passer tous les sujets. Depuis que le tri gratuit filtre en amont (8.4.0), la
cadence réelle est trois à quatre fois meilleure. L'estimation était devenue
un plafond arbitraire.

**Le remède : on ne devine plus.** La vérification avance par **tranches de
deux mille**, et en reprend une tant qu'il reste de quoi la finir. Le budget
est rempli, jamais dépassé. Deux garde-fous : la réserve est proportionnelle
au budget — une passe courte lancée à la main doit rapporter quelque chose —
et la première tranche part toujours.

Et une correction de vérité au passage : quand l'échéance tombait au milieu
d'une tranche, les sujets dont le QID n'avait pas été demandé étaient comptés
« sans article utilisable ». Ils n'avaient pas été regardés. Ils retournent à
la file.

Éprouvé sur une Wikipédia miniature (20 archives, 1 200 sujets) : 600
recevables, 600 vérifiés, 400 rangés par leur article, aucun sujet perdu.

### 3. Le filtre par potentiel

« Je ne veux que les meilleurs, et je ne peux pas classer pour n'avoir que les
10, que les 9, 8 et 7. » Il y avait un **tri** par potentiel, pas de
**filtre** : sur 16 185 lignes, trier ne suffit pas.

`console.html` et `catalogue.html` reçoivent donc : **Potentiel 10 seulement ·
9 et plus · 8 et plus · 7 et plus · 6 et moins**. Sur votre catalogue :

| filtre | sujets |
|---|---|
| 10 seulement | 119 |
| 9 et plus | 451 |
| 8 et plus | 1 015 |
| **7 et plus** | **2 449** |
| 6 et moins | 13 736 |

Combiné aux boutons de lot de 8.4.1, la sélection devient un geste :
*Potentiel 7 et plus* → **Retenir ces 2 449** → *Enregistrer mes décisions*.
Et *6 et moins* → **Écarter ces 13 736** met le reste hors du chemin sans rien
supprimer. Éprouvé au navigateur sur la distribution exacte de votre journal :
les cinq filtres donnent les cinq chiffres ci-dessus, et le lot enregistre
2 449 décisions, pas une de plus.

## 8.4.1 — « Retenir ce qui est affiché » dit maintenant combien, et sur quoi

**Le symptôme.** « Si je filtre insolite avec 114 entrées et que je fais
retenir ce qui est affiché, ça m'enregistre toutes les fiches au lieu des 114
filtrées. »

**Ce que la reproduction a montré.** Catalogue synthétique de 928 sujets dont
114 marqués `insolite`, filtre posé, clic sur le bouton : **114 décisions
écrites, pas une de plus**. Le filtre était respecté — le bouton n'a jamais agi
sur autre chose que `S.vueCat`, c'est-à-dire la vue filtrée.

**Ce qui trompait, en revanche, est réel et valait correction :**

- le bouton disait « tout ce qui est affiché », sans chiffre — et la liste ne
  peint que cinquante lignes à la fois, donc « affiché » n'était pas lisible ;
- les six compteurs du haut comptent le **catalogue entier**, pas la vue : 928
  au catalogue, alors que 114 seulement viennent d'être touchés ;
- les décisions d'une session précédente **restent en mémoire dans le
  navigateur** — y compris sans jeton, où rien ne les relit depuis le dépôt. Un
  « écarter tout » posé sans filtre un autre jour est toujours là, invisible ;
- le message de commit annonçait `décisions de curation (928 sujets)` : le
  nombre de **clés du fichier**, retenus et écartés confondus. De quoi croire
  que tout venait d'être sélectionné.

**Le remède — la portée est écrite, pas devinée.**

| | avant | maintenant |
|---|---|---|
| libellé | « Retenir tout ce qui est affiché » | « **Retenir ces 114** » |
| portée | implicite | une ligne sous les boutons : *« agissent sur les 114 sujets du filtre Articles insolites, pas sur les autres »* |
| sans filtre | même bouton, même silence | mention en or *« Aucun filtre »*, et confirmation au-delà de 50 sujets, annonçant combien de décisions déjà prises seront écrasées |
| après le clic | rien | *« 114 sujets retenus — filtre : Articles insolites. Au total : 114 retenus, 0 écartés. »* |
| état courant | invisible | *« Décidé pour l'instant : 114 retenus, 0 écarté, 814 sans décision »* |
| repartir de zéro | impossible | bouton **Tout oublier (N)**, avec confirmation |
| commit | `décisions de curation (928 sujets)` | `console : 114 retenus, 0 écartés` |

L'onglet Relecture reçoit le même traitement : « Valider ces 80 », une
confirmation au-delà de cinquante, et un message qui donne le total des deux
langues.

Éprouvé au navigateur sur 928 sujets synthétiques : filtre à 114 → 114
décisions ; lot sans filtre → confirmation annonçant les 114 décisions
écrasées ; « Tout oublier » → 0. Aucune erreur JavaScript.

**Ce que la mise à jour ne touche pas** : le catalogue maître, les décisions
déjà enregistrées, les fiches écrites, le fichier de sujets phares. Seuls
`console.html` et le numéro de version changent.

## 8.4.0 — la fiche « Pac-Man », et les quatre-vingt-dix mille sujets vérifiés pour rien

### 1. Un poulpe sur une fiche Pac-Man

**Le symptôme.** Dans la curation, une fiche intitulée **Pac-Man**, classée
dans *Le Vivant*, portant cette phrase : « Ce poulpe a soulevé le couvercle de
son bac la nuit, traversé le sol de l'aquarium et plongé dans un tuyau
d'évacuation vers l'océan. »

**La cause.** La ligne 506 de `consignes/sujets-phares.txt` disait `Inky`. Le
poulpe évadé de l'aquarium de Napier s'appelle Inky — mais **Inky est aussi un
des quatre fantômes de Pac-Man**, et Wikipédia y redirige. Le titre demandé
existait, la redirection était silencieuse, et le QID récupéré était celui du
jeu d'arcade.

Ce qui aurait dû l'arrêter — `memeSujet()`, qui confronte votre phrase à
l'introduction de l'article — ne s'appliquait **qu'aux titres devinés par la
recherche**. Le commentaire du code disait : « un titre exact est digne de
confiance ». C'était faux : un titre exact peut mener ailleurs.

**Le remède.** `qidsParTitre()` retient désormais *où* chaque titre a abouti.
Toute redirection qui n'atterrit pas sur un titre voisin (`memeTitre()` pour
les accents et la casse, `titresProches()` pour un synonyme raisonnable) passe
par la même barrière que les titres devinés : la phrase est confrontée à
l'introduction, et le désaccord vaut refus.

Éprouvé sur une Wikipédia miniature reproduisant les quatre cas :

| ligne demandée | aboutit à | verdict |
|---|---|---|
| `Inky` | Pac-Man | **refusé** — l'article ne parle pas de votre phrase |
| `lac nyos` | Lac Nyos | retenu — simple normalisation de casse |
| `Larme batavique` | Goutte du prince Rupert | retenu — redirection légitime, phrase concordante |
| `Turritopsis dohrnii` | lui-même | retenu — titre exact |

La ligne est corrigée en `Inky (octopus)`, et `Pac-Man` est inscrit dans
`consignes/exclusions.txt` pour sortir la fiche de votre catalogue actuel
(*Entretien → purger*).

### 2. `rapport-phares.csv` — parce qu'il y en a d'autres

Une erreur trouvée par hasard veut dire qu'il y en a d'autres. Chaque moisson
écrit maintenant **une ligne par ligne de votre fichier de sujets phares** :

```
ligne_demandee ; resolution ; article_retenu ; univers ; verdict ; motif
"Inky" ; "redirection" ; "Pac-Man" ; "vivant" ; "refusé" ; "article étranger à votre phrase"
```

`resolution` dit comment le titre a été résolu — `exact`, `redirection`,
`recherche` — et les ennuis sont triés **en tête du fichier** : refusés,
introuvables, doublons. Ce sont les seules lignes à relire.

Le fichier compte 386 titres d'un seul mot, dont 110 de six lettres ou moins
(`Inky`, `Dolly`, `Sudan`, `Mir`, `Rage`, `Koko`, `Chaser`…). Ce sont
exactement les titres exposés au piège. Le rapport les nommera.

### 3. La colonne « accord » et le badge ⚠ à vérifier

Le chiffre qui aurait crié « Pac-Man » dès la première curation : **combien de
mots signifiants votre phrase partage-t-elle avec l'article ?** Zéro pour le
poulpe et le jeu d'arcade ; trois pour le lac Nyos et sa catastrophe.

Il est calculé pour chaque sujet à la vérification — sans un seul appel de
plus, l'introduction étant déjà téléchargée —, écrit dans `accord` du
catalogue maître et du CSV, et affiché dans **console.html** et
**catalogue.html** : un badge rouge « ⚠ à vérifier », un filtre du même nom, un
tri « les moins sûrs d'abord », un compteur.

Il ne refuse rien : une phrase peut légitimement raconter un épisode que
l'introduction ne mentionne pas. C'est un doute affiché, pas un verdict.

Pour les sujets déjà entrés avant cette version : *Entretien → **accorder***
le calcule sur tout le catalogue, instantanément, sans réseau.

### 4. Le tri gratuit avant le tri qui coûte le réseau

**Le symptôme, dans votre journal.** `981 sur 101006 cette fois`. À ce
rythme-là, le catalogue demandait une centaine de nuits.

**La cause.** La vérification prenait les `parPasse` premiers sujets **avant**
d'appliquer les règles qui ne coûtent rien. Or sur 88 300 entrées anglaises
« Le saviez-vous ? », **10 263 seulement portent une phrase de contributeur** :
les autres étaient rejetées de toute façon, quelques lignes plus bas, par
`mots < 8`. Le budget réseau partait vérifier des sujets condamnés d'avance.

**Le remède.** Les règles gratuites — définition, phrase absente ou trop
courte — s'appliquent **d'abord**. Le réseau ne voit plus que ce qui a une
chance d'entrer, et les sujets sont triés : vos phares en tête, puis ceux que
deux ou trois sources indépendantes désignent.

Mesuré sur mille sujets dont cent recevables (la proportion de votre dépôt) :

| | appels réseau | sujets ajoutés |
|---|---|---|
| 8.3.2 | 165 | 100 |
| 8.4.0 | **53** | 100 |

Même résultat, un tiers du réseau. Sur votre dépôt, l'horizon passe d'une
centaine de passes à une quinzaine — et si une passe s'arrête en route, ce qui
est entré est ce qui valait le plus.

### 5. Deux corrections de vérité

- `nettoyerPhares` annonçait « c'est probablement un incident réseau » alors
  que la passe avait simplement été écourtée. Il distingue maintenant les deux
  et le dit. Le refus de réécrire le fichier, lui, était correct et le reste.
- **Les workflows n'enregistraient pas `consignes/sujets-phares.txt`.** La
  moisson le réécrivait proprement… et le dépôt n'en gardait rien. Corrigé, en
  même temps que `rapport-phares.csv` et la sauvegarde
  `sujets-phares.avant-nettoyage.txt`.


## 8.3.2 — la moisson ne peut plus s'éterniser

**Le symptôme.** Deux exécutions de `1 · Moissonner` annulées après
5 h 50 min 31 s — c'est-à-dire exactement le `timeout-minutes: 350` du job.
Rien n'était bloqué : la passe n'a simplement jamais eu le droit de finir, et
comme l'enregistrement se fait à la fin, six heures ont été perdues deux fois.

**La cause.** Wikipédia impose une cadence : 260 ms entre deux appels, et
jusqu'à trois secondes dès qu'elle nous freine. Une moisson complète — les
archives de « Le saviez-vous ? » côté FR et EN, la résolution de
2 506 sujets phares dont beaucoup passent par la recherche, puis
l'identification et la vérification de milliers de sujets — représente des
dizaines de milliers d'appels. Plusieurs heures, structurellement. À quoi
s'ajoutait un amplificateur : `api()` réessayait huit fois avec des pauses
croissantes, soit **quarante secondes pour un seul appel en échec**.

**Le remède : un budget de temps, et on s'y tient.** `--minutes` (40 par
défaut) pose une échéance. `tempsEcoule()` est consulté dans toutes les
boucles — file des pages à lire, recherche des titres approximatifs,
`qidsParTitre`, `fromWikidata`, `verify`, Reddit — et dans `api()` avant
chaque nouvelle tentative. Quand l'échéance tombe, la passe **s'arrête
proprement et enregistre**.

Ce n'est pas une dégradation, c'est le bon modèle : le catalogue maître est
additif, le cache des réponses est conservé d'une exécution à l'autre, et la
passe suivante reprend exactement où celle-ci s'est arrêtée. Le journal le dit
en clair plutôt que de laisser croire à une panne.

Éprouvé sur une Wikipédia simulée de 800 pages avec 120 ms de latence :
- budget 0,5 min → passe terminée en 0,5 min, 114 pages lues, « 87 pages non
  lues cette fois », fichiers écrits ;
- passes 2 et 3 : 201 pages FR puis 143 EN, chacune dans son budget. Les pages
  déjà lues ne coûtent rien, le cache faisant son office.

Sans les gardes dans `qidsParTitre` / `verify` / `fromWikidata`, la même passe
débordait à 1,3 min pour 0,5 alloué : les phases d'après-moisson finissaient
leurs lots. Elles sont bornées elles aussi.

**Côté action** : `timeout-minutes` passe de 350 à **75**, une entrée
`minutes` permet de choisir la durée d'une passe lancée à la main, et un
`concurrency: curio-moisson` empêche deux moissons de se marcher dessus et de
se voler le catalogue en s'enregistrant l'une après l'autre.

## 8.3.1 — le jeton n'est plus obligatoire

Sans jeton, la console ne bloque plus : le bouton **Télécharger
decisions.json** (ou **validations.json**) donne le fichier, qu'on dépose sur
GitHub par *Add file → Upload files* dans `consignes/`. Le résultat est
identique — ce sont ces fichiers que les outils lisent, pas la console. Deux
clics de plus, et aucune raison d'être empêché.

Le panneau de réglages porte maintenant le mode d'emploi complet, en sept
étapes dépliables : où aller, quel nom, quelle expiration, quel dépôt, et les
**deux seules permissions** à passer sur *Read and write* — `Contents` et
`Actions`, tout le reste sur *No access*. Avec ce qu'un tel jeton peut et ne
peut pas faire, et comment le révoquer.

Et la consigne qui manquait, en gras : **ne jamais coller un jeton dans une
conversation.**

## 8.3.0 — Reddit comme source, et la moisson à la demande

**La moisson se lance depuis la console.** Un bouton « Moissonner
maintenant » dans la barre haute : `POST /actions/workflows/1-moissonner.yml/dispatches`.
Elle tourne de toute façon chaque nuit à minuit ; le bouton sert aux fois où
l'on vient d'ajouter des sujets phares ou de brancher un subreddit et qu'on ne
veut pas attendre.

**Reddit est une source, pas une corvée.** `passeReddit()` entre dans la même
moisson, au même titre que « Le saviez-vous ? », et alimente le même catalogue
maître avec `sources:['reddit']` et un identifiant `R-<id>` — donc sans
doublon possible, relance après relance.

- `consignes/reddit.txt` : les subreddits (un par ligne, univers optionnel
  après une barre), le seuil de votes, les longueurs mini et maxi, la période,
  le nombre de billets par passage. **Vide par défaut** : rien ne touche à
  Reddit tant qu'aucun subreddit n'est listé.
- Deux chemins d'accès : jeton OAuth « application seule » si les secrets
  `REDDIT_ID` / `REDDIT_SECRET` existent, sinon le point d'entrée public. La
  bascule est automatique et le journal dit lequel a servi.
- Ne passent que les billets **autoportants** : du `selftext`, pas un lien ;
  au-dessus du seuil de votes ; dans la fourchette de longueur ; ni supprimés,
  ni NSFW, ni spoiler, ni épinglés. Éprouvé sur huit cas : 8/8.
- `nettoyerBillet()` défait les entités HTML, aplatit les liens markdown,
  retire les citations — elles ne sont pas de l'auteur — et les titres.
- Le texte du billet devient la matière du rédacteur, exactement comme un
  article de Wikipédia : `write-anecdotes.mjs` le reconnaît déjà par le champ
  `texte`, ajouté en 8.2 pour les ajouts manuels.

Badge orange **REDDIT** et filtre dédié dans la console et dans le catalogue.

**Non vérifié contre l'API réelle** : Wikipédia comme Reddit sont
inaccessibles depuis l'environnement où ce code a été écrit. Le lecteur de
configuration, le filtrage et le nettoyage sont éprouvés sur des fixtures ; le
premier appel réel se fera dans l'action, et son journal dira tout.

## 8.2.0 — la console

Une page, deux vues, et plus rien d'autre à ouvrir. `console.html` parle à
GitHub directement, par l'API REST, avec un jeton à portée fine que
l'utilisateur crée et qui reste dans le `localStorage` de la page.

**Vue Catalogue.** Tous les sujets du maître, avec provenance, potentiel,
état, phrase et aperçu français. Deux gestes par ligne — *à écrire* /
*écarter* — plus les actions de masse sur ce qui est affiché. Deux boutons :

- **Enregistrer mes décisions** → `PUT /contents/consignes/decisions.json`
- **Écrire les retenus** → enregistre, demande le budget, puis
  `POST /actions/workflows/2-ecrire.yml/dispatches`

Écrire par un **fichier du dépôt** plutôt que par un champ de formulaire règle
définitivement « Provided inputs are too large » : la sélection n'est plus une
entrée d'action, c'est un fichier versionné.

**Vue Relecture.** Chaque fiche écrite en entier — accroche, texte (les deux
premiers paragraphes puis « lire la suite »), note, phrase à raconter, lien
vers l'article. Trois gestes : *valider*, *à refaire*, *retirer*, plus
« valider tout ce qui est affiché ». **Publier les validées** écrit
`validations.json` et lance `5-publier.yml` en mode `valider`.

**`--valider`** dans `publier.mjs` applique cette relecture : les validées
partent en ligne le jour même — **les deux langues ensemble** —, les « à
refaire » voient leur texte effacé et leur sujet repasser à `a-ecrire`, les
« à retirer » sortent et s'inscrivent dans `exclusions.txt`. Une fiche validée
mais en quarantaine n'est pas publiée, et le journal le dit nommément plutôt
que de l'avaler. Le fichier est vidé après application : rien n'est rejoué.

**`planDeTranche` obéit aux décisions.** Si des sujets sont retenus, l'écriture
ne prend qu'eux ; les écartés ne sont jamais écrits, retenus ou pas.

**Un filet contre le rechargement.** Les décisions sont recopiées dans le
`localStorage` à chaque clic. Au démarrage, le dépôt fait foi — sauf si le
navigateur porte un brouillon non enregistré, auquel cas il est conservé et
signalé. `beforeunload` prévient avant de fermer sur du travail non sauvé.

**La moisson passe à chaque nuit à minuit** (`0 0 * * *`).

**`consignes/ajouts.json`** — la voie additive pour les sujets qui ne viennent
pas de Wikipédia. Une entrée avec un `texte` entre au catalogue avec la source
`manuel` et un identifiant `M-…` ; la rédaction travaille sur ce texte au lieu
d'aller chercher un article. C'est la porte pour les histoires Reddit, un
article de presse, des notes. `ajouts.LISEZ-MOI.md` documente le format.
`passeAjouts` n'écrit que ce qui n'existe pas : rien de l'existant n'est
touché, aucune fiche n'est réécrite.

Éprouvé sous Chromium : 40 sujets, 9 fiches, les deux vues, compteurs justes,
décisions et validations en masse, dépliage des textes, aucune erreur JS.
Côté outils, `--valider` testé sur une relecture mêlant validation,
réécriture, retrait et fiche en quarantaine.

## 8.1.1 — corriger, sans savoir où chercher

Il manquait un cas. On pouvait retirer un sujet, on ne pouvait pas dire « le
sujet est bon, c'est le texte qui est raté ».

**`--refaire "titre"`** (action **5 · Publier → refaire**) supprime les deux
fiches d'un sujet et le remet à `a-ecrire` dans le catalogue maître. La
tranche suivante le reprend en priorité, avec la consigne telle qu'elle est ce
jour-là. Rien n'est exclu, rien n'est perdu d'autre que le texte raté.
Éprouvé : deux fiches supprimées, statut et dates remis à zéro.

**Le tableau de bord répond à la question sur place.** Un bloc dépliable en
tête de `catalogue.html` — « Un doublon, une erreur, une fiche qui n'a pas sa
place — que faire ? » — couvre les cinq cas, chacun avec l'action exacte :
retirer, refaire, purger, et quoi faire si la consigne d'écriture ne plaît
pas. Le cas du doublon y est nommé pour ce qu'il est : un défaut à signaler,
pas un réglage.

**Un bouton « copier » sur chaque ligne** met le titre exact dans le
presse-papiers. Les actions attendent le titre au caractère près ; le retaper
à la main était la meilleure façon de se tromper d'accent.

## 8.1.0 — deux gestes de moins

Tout ce qui ne coûte rien tourne maintenant tout seul, et il y a **une page**
à ouvrir pour savoir où on en est.

**La moisson est programmée** : `1 · Moissonner` a un `cron` hebdomadaire
(dimanche 5 h UTC) en plus de son déclenchement manuel. Avec la publication
déjà quotidienne, la chaîne gratuite s'entretient seule. Il ne reste à
déclencher que l'écriture — la seule étape qui engage de l'argent.

**`catalogue.html`** — page autonome, sans dépendance, qui lit
`catalogue-maitre.json` et affiche : huit compteurs en tête (total, croisés,
par source, en ligne, en réserve, à écrire), puis la liste complète avec
recherche sans accents et filtres par univers, provenance et état. Chaque
ligne porte les deux titres, les langues, le potentiel, les badges de source
(avec « 3 sources » quand les trois se rejoignent), l'état, et la phrase du
contributeur ou l'aperçu français.

Elle ne fait rien : pas de case à cocher, pas de bouton qui engage. Rendu par
paquets de 120 pour rester fluide à plusieurs milliers de lignes. Éprouvée en
1280 et en 390 px sur 420 sujets : filtres, recherche et compteurs justes,
aucune erreur JS.

## 8.0.2 — le fichier de sujets phares se nettoie tout seul

`nettoyerPhares()` : à la fin de la moisson, `consignes/sujets-phares.txt` est
réécrit avec **les seules lignes dont l'article a été trouvé et vérifié**,
chacune portant le **titre canonique** de Wikipédia — celui que la résolution
a réellement atteint, accents et désambiguïsation compris. Deux lignes
désignant le même article (même QID) sont réduites à une.

Le fichier est trié par univers, avec les compteurs à jour dans les
séparateurs. L'original part en `consignes/sujets-phares.avant-nettoyage.txt`
au premier passage seulement. **La réécriture est annulée si moins de la
moitié des lignes survivent** : un incident réseau ne peut pas vider le
fichier.

Après une moisson, ce fichier est propre par construction : tous les titres
existent, tous sont orthographiés comme Wikipédia les écrit, aucun n'y figure
deux fois. Il n'y a plus à se demander lesquelles valent quelque chose — les
autres ne sont plus là.

## 8.0.1 — regarder avant d'écrire

**Un aperçu français pour chaque sujet, écrit à la moisson.** `verify()`
téléchargeait déjà l'introduction de chaque article pour vérifier qu'il
existe, et la jetait. `construireMaitre` en garde maintenant les deux
premières phrases (`deuxPhrases()`), dans `apercu` / `apercuLang`, et
`vueApplication` les transmet à `catalog.json` (`a` / `al`). La curation
affiche donc du **français pour tous les sujets** — y compris ceux dont la
phrase de contributeur est anglaise — **sans un seul appel réseau**, et avant
d'avoir dépensé un centime. On peut parcourir trois mille lignes d'affilée.

Correction au passage : `curPeindre` mettait en file d'attente toute ligne
sans `apercu` ni `pourquoi`, et l'appel réseau écrasait l'aperçu stocké par
« pas d'introduction disponible ». Le test inclut désormais `apercuCat`.

**La colonne `apercu` dans `catalogue-maitre.csv`** : trois mille sujets se
relisent plus vite dans un tableur que dans une interface.

**Le tri par le refus.** Cocher ce qu'on veut est impraticable à cette
échelle ; cocher ce qu'on ne veut pas l'est. Le bouton **« Copier pour
exclusions.txt »** met dans le presse-papiers les titres cochés, les deux
langues, au format du fichier. Coller, puis **Entretien → purger**
(`--purger`) : les sujets sortent du catalogue maître, `catalog.json` est
régénéré, et la moisson ne les reproposera jamais. Aucune fiche écrite n'est
touchée — pour celles-là, `5 · Publier → retirer`.

**README et `.gitignore`** refaits : les six adresses utiles en tête (site,
application, curation, actions, catalogue, réglages), les liens directs des
cinq actions, la mise en route en quatre points, et un `.gitignore` qui ignore
le cache et les journaux mais **jamais** `catalogue-maitre.json`,
`catalog.json` ni `anecdotes/`.

**`catalogue-phares.csv`** livré tel quel : les 2 506 sujets écrits à la main,
avec univers et phrase, relisibles immédiatement — sans attendre la moisson.

## 8.0.0 — le catalogue maître

Refonte de l'architecture, décidée avec vous. Cinq actions, un fichier de
référence, et une chaîne qui se termine seule.

**`--maitre` : un sujet est un identifiant Wikidata.** `construireMaitre()`
moissonne les trois sources — phares, articles insolites, « Le saviez-vous ? »
—, résout chaque titre en QID par lots de vingt-cinq (`qidsParTitre`), et
regroupe. Deux titres qui désignent le même article deviennent un seul
enregistrement, avec l'union de leurs sources : `phare+insolite+saviez` est
une information, pas un doublon. Les doublons ne sont plus « improbables »,
ils sont impossibles.

Sortie : `catalogue-maitre.json` (la nomenclature), `catalogue-maitre.csv`
(tableur), et `catalog.json` régénéré depuis le maître par `vueApplication()`
— jamais l'inverse. Relancer est **additif** : les statuts existants sont
conservés, seuls les QID inconnus sont vérifiés et ajoutés. C'est le
mécanisme de comparaison demandé.

**La barrière anti-définition.** `estDefinition()` écarte « X est une commune
française du département de… », « X is a species of… », « X is an American
politician » — la source exacte des fiches sans contenu. Un premier essai
exigeait en plus des « marqueurs d'étrangeté » : il jetait 1 387 sujets sur
2 506, dont *Étoile à neutrons* (« une cuillère à café pèse un milliard de
tonnes ») parce que les nombres y étaient écrits en toutes lettres.
`signalAnecdote()` compte désormais les nombres en lettres, et la barrière
s'arrête à : pas de définition, une phrase d'au moins huit mots. La sévérité
s'exerce après écriture, sur un texte réel, pas sur un pressentiment.

**`--budget` remplace la sélection collée.** `planDeTranche()` calcule le coût
au texte selon le modèle, en déduit le nombre de sujets qu'une tranche de N
euros permet, et prend les meilleurs non écrits. `ecrireTranche()` écrit les
deux langues et marque le maître. Plus de CSV dans un champ GitHub : c'est ce
qui provoquait « Provided inputs are too large ».

**`tools/controler.mjs`** — la passe avant production : longueur,
paragraphes, ouverture interdite, titre unique et court, note, phrase « à
raconter », image, source, **langue du texte**, appartenance au maître. Ce qui
échoue passe en quarantaine (`v:"quarantaine"`), reste dans le dépôt et n'est
jamais publié. `controle.csv` liste tout.

**`tools/publier.mjs`** — la publication étalée. Chaque fiche porte `p`, sa
date de publication ; l'application ne sert que `p ≤ aujourd'hui`, et
`buildIndex` ne compte que celles-là (`reserve` dit combien attendent). Le
rythme est dans `consignes/publication.txt` (`parPassage`), la fréquence dans
le `cron` de l'action. Publier un sujet publie ses deux langues le même jour.
`--retirer` sort une fiche définitivement, les deux langues, met à jour le
maître et inscrit le titre dans `consignes/exclusions.txt` ; `--rendre`
annule.

**L'état, partout.** `curFace` lit `p` et `v`, `curSujet` en déduit un état —
`aecrire`, `ecrit`, `quarantaine`, `reserve`, `publie`, `retire` — affiché en
badge et filtrable. Le CSV maître porte les mêmes colonnes avec les dates.

**Cinq actions dédiées** remplacent les huit précédentes : `1-moissonner`,
`2-ecrire` (budget + estimer), `3-controler`, `5-publier` (cron quotidien +
etat/retirer/rendre), `entretien`.

**`consignes/univers.txt`** ajoute des univers sans toucher au code :
`universSupplementaires()` les injecte dans `UNIVERSES`, `vueApplication` les
écrit dans `catalog.json.themes`, et l'application les découvre — elle savait
déjà compléter sa liste avec ce que le catalogue lui apporte. Rien d'existant
n'est touché.

Éprouvé de bout en bout sur des fixtures : contrôle (16 fiches, 12 conformes,
4 en quarantaine dont une pour langue erronée), publication (3 sujets par
passage, FR+EN ensemble), retrait des deux langues, exclusions, index à 8
sujets en ligne et 7 en réserve. Navigateur : le lecteur ne voit que le
publié, la curation voit tout, six filtres d'état corrects, aucune erreur JS.

## 7.6.0 — garantir ce qu'on livre

Trois défauts remontés sur captures, tous graves pour un catalogue destiné à
des clients.

**Un même sujet dans deux univers.** « Expérience de la goutte de poix »
apparaissait en Sciences ET en Mystères : deux lignes de `sujets-phares.txt`
désignaient le même article sous deux noms, et `passePhares` ne dédoublonnait
que par titre. Il dédoublonne maintenant par **identifiant Wikidata**, tient
une carte `ouEstDeja` de tous les titres déjà classés, et refuse un sujet
déjà présent ailleurs. `passeInsolite` fait de même avant d'insérer. Chaque
écart est écrit dans le journal.

**Des titres résolus n'importe comment.** La recherche Wikipédia répond
toujours quelque chose : « Enfants Sodder » → « Markus Söder », « Mort
d'Edgar Allan Poe » → « Prix Edgar-Allan-Poe », « Volcan Havre » → « Le
Volcan (salle) », et une fiche « 8 mm Lebel » portant la phrase d'une
expérience de psychologie sociale. Deux barrières cumulatives :

- `titresProches(demande, trouve)` — mots utiles, parenthèse de
  désambiguïsation retirée, comparaison symétrique (Jaccard ≥ 0,7 ou
  couverture totale avec au plus un mot en trop), et au moins un mot de cinq
  lettres en commun. Éprouvé sur 21 cas réels tirés de votre journal :
  20 corrects, le 21ᵉ étant un refus prudent d'un titre juste.
- `memeSujet(phrase, titre, intro)` — pour les seuls titres rattrapés par
  recherche, l'introduction de l'article doit partager au moins deux mots
  signifiants avec la phrase que vous avez écrite. `verify` accepte désormais
  une carte `intros` pour rendre les introductions déjà téléchargées.

Le réglage est volontairement prudent : un refus coûte une correction
d'orthographe, une acceptation erronée coûte une fiche fausse livrée.

**On ne savait pas d'où venait un sujet.** Les scores portent maintenant `o` :
`phare`, `insolite`, `saviez`, `categorie`. La curation affiche le badge
correspondant et propose deux filtres de plus — « ★ Le saviez-vous ? » et
« Parcours de catégories ». Les catalogues antérieurs retombent sur `c`.

**`--nettoyer`** (action **Entretien → nettoyer**) répare un catalogue déjà
pollué, sans réseau : un titre présent dans deux univers ne reste que dans le
premier, un titre en double dans une liste est réduit à un, un titre anglais
est recollé à l'univers de sa version française, les notes orphelines sont
supprimées. Aucune fiche écrite n'est touchée. Éprouvé sur un catalogue
fabriqué exprès : 3 doublons inter-univers, 1 doublon interne, 1 note
orpheline.

**Quatre actions dédiées** remplacent le formulaire à sept champs :
`1-collecter` (3 champs), `3-estimer` (2), `4-ecrire` (3),
`entretien` (1 : nettoyer / reclasser / recompter / verifier). L'action
tout-en-un `curio.yml` reste disponible.

**Le filtre par note ne ment plus.** « Note 8 et plus » sur un catalogue où
rien n'est encore rédigé affichait « aucun résultat », ce qui ressemblait à
une panne. Il explique maintenant que la note n'existe qu'après `4-ecrire` et
renvoie au tri par potentiel.

**La palette d'origine est aussi sur le site.** Même bouton, même clé de
stockage `curio.palette` : le site et l'application ne peuvent pas se
contredire.

## 7.5.0 — « Le saviez-vous ? », deux textes par sujet, et l'ancienne palette

**Les listes d'articles insolites sont finies.** Votre journal le dit sans
ambiguïté : 505 entrées côté français sur 4 pages, 4 413 côté anglais sur 20,
toutes lues, avec leur phrase de contributeur — puis « +0 FR / +0 EN » partout
et « rien de vérifiable ». Ce n'est pas une panne : c'est un filon épuisé. Le
lecteur de listes fonctionne parfaitement, il n'y a simplement plus rien à
lire là.

**La deuxième mine.** `source = saviez` moissonne « Le saviez-vous ? » et
*Did you know* : `pagesSaviezVous(lang)` découvre les archives par
`list=allpages&apprefix=`, et `moissonInsolite(lang, quoi)` les lit avec le
même analyseur. Le format est celui d'une liste à puces, et le gras que les
wikipédiens posent sur l'article vedette (`* ... que '''[[X]]''' … ?`) est
exactement le signal dont le sélecteur a besoin. `nettoyerWiki` retire
l'amorce « ... que » / « ... that », qui sinon ouvrait chaque phrase par un
mot vide. Éprouvé sur les deux formats : sujet correct dans les huit cas, la
ligne de pur contexte écartée. Ces archives comptent des milliers de pages,
et il s'en ajoute une chaque jour.

**Un sujet coché vaut TOUJOURS deux textes.** `curTextes()` compte
`2 × sujets − déjà écrit` ; `curCsv()` émet systématiquement une ligne `fr` et
une ligne `en`, avec le titre du jumeau quand il existe et le même titre
sinon. Côté rédaction, `ficheArticle(lang, titre, jumeau)` va chercher
l'article dans la langue voulue et, à défaut, dans l'autre ; `ask()` reçoit
`langueFiche` et prévient le modèle que la fiche de faits est dans l'autre
langue mais que le texte doit être entièrement dans la sienne.
`titresDeSelection()` ajoute à la file les titres que la sélection nomme pour
une langue où le catalogue ne les a pas — sans quoi la ligne « en » d'un sujet
franco-français n'aurait jamais été écrite. Une ligne déjà rédigée sort avec
`ecrire;non` : elle ne coûte rien.

**Trois filtres de note.** « Note 10/10 », « Note 9 et plus », « Note 8 et
plus » s'ajoutent à « Notes faibles (≤6) ». Ils portent sur la note obtenue
après écriture — le seul jugement fiable — et c'est avec eux que se
construisent les mille anecdotes.

**La palette d'origine est de retour.** `data-palette="origine"` sur la racine
rétablit l'encre presque noire et le vert-de-gris d'avant la version 7, en
clair comme en sombre. Un bouton dans le tiroir « … » bascule entre BLEU et
ENCRE, indépendamment du clair/sombre, et le choix est mémorisé. Aucun
composant ne connaît une couleur en dur : tout passe par les jetons CSS, donc
le basculement est total, `theme-color` du navigateur compris.

**Le compteur des phares ne ment plus.** « → 0 sujet(s) phare(s) » laissait
croire à un échec alors que les 1 038 étaient déjà entrés à la collecte
précédente. Il distingue maintenant les nouveaux, ceux déjà au catalogue et
ceux dont l'article est trop maigre — et le dit en toutes lettres.

**`sujets-phares.txt` passe de 1 038 à 2 506 sujets** : cosmos 330, vivant
327, histoire 307, esprit 324, sciences 291, mystères 220, terre 316, arts
391. Cent quatre-vingt-neuf doublons écartés à la fusion.

## 7.4.0 — mille trente-huit sujets phares, écrits à la main

`consignes/sujets-phares.txt` passe de 45 à **1 038 sujets**, huit univers,
chacun avec sa phrase française. Répartition : cosmos 136, vivant 135,
histoire 127, esprit 134, sciences 123, mystères 99, terre 134, arts 150.
Soixante-dix-huit doublons écartés à la fusion ; aucune phrase de moins de
huit mots ni de plus de quarante-deux ; aucune formule de notice
(« X est un… »).

**Résolution des titres, refaite.** Mille appels un par un auraient fait deux
mille requêtes : `qidsParTitre(lang, titres)` résout par lots de vingt-cinq
et **remonte les redirections et normalisations jusqu'au titre demandé** —
`toQids` renvoyait le titre d'arrivée, ce qui interdisait de savoir quel sujet
avait répondu. Trois temps : le titre tel quel en français, puis en anglais,
puis la recherche Wikipédia pour ce qui reste.

**`chercherTitre(lang, requete)`** : `list=search&srlimit=1&srnamespace=0`.
Un titre approximatif — accent, pluriel, désambiguïsation, nom populaire au
lieu du nom d'article — n'est plus perdu, et le journal écrit toujours ce
qu'il a résolu :

```
~ « Larme batavique » → « Goutte du prince Rupert » (résolu par recherche fr)
· 902 titre(s) exact(s), 121 rattrapé(s) par la recherche, 15 introuvable(s).
```

**Vérification souple pour les phares.** `verify(lang, titles, souple)` :
introduction ≥ 300 caractères, vignette non exigée. L'application sait
afficher une fiche sans image (`img:''` est déjà un cas prévu du rendu), et
perdre le manuscrit de Voynich faute de photo n'avait aucun sens.

Progression affichée toutes les cinquante recherches : la passe dure cinq à
dix minutes la première fois, quelques secondes ensuite grâce au cache.

## 7.3.0 — le lecteur de listes prenait le décor pour le sujet

**Le défaut.** Les pages « Unusual articles » écrivent leurs tableaux avec une
cellule par ligne :

```
|-
| [[Hiroo Onoda]]
| Soldat japonais de la [[Seconde Guerre mondiale]] qui refusa de croire à la
  fin de la guerre et la continua seul jusqu'en 1974.
```

`entreesDeListe` lisait ligne par ligne. Il en tirait « Hiroo Onoda » sans
phrase, puis « Seconde Guerre mondiale » avec « qui refusa de croire… ».
La curation du 30 août montrait donc *Seconde Guerre mondiale*, *Royal Navy*,
*Broadway (théâtres)*, *Paul McCartney*, tous à 10/10 — la note se calculant
sur ces fragments, où les dates comptaient comme marqueurs d'étrangeté.

**Le correctif** (`tools/build-catalog.mjs`) :

- assemblage des lignes de tableau (`{|`, `|-`, `|`, `!`, `||`, `!!`,
  attributs de cellule, cellules courant sur plusieurs lignes) avant lecture ;
- choix du sujet **différé** : chaque entrée porte tous ses liens candidats,
  et l'on tranche à la fin de la moisson, quand la fréquence est connue. Un
  lien présent dans quatre entrées ou plus est pénalisé, dans huit ou plus il
  est écarté — c'est la signature du contexte. Bonus pour le lien en gras, le
  lien de la première cellule, le lien qui ouvre la ligne ; malus pour une
  date, une « Liste de… », et pour un lien précédé d'une préposition
  (« Pendant la [[…]] », « à [[Strasbourg]] ») ;
- `pourquoi` = la ligne entière du contributeur, et non le fragment qui suit
  le lien ;
- une entrée dont aucun candidat ne survit est écartée et comptée dans le
  journal.

**Le potentiel resserré.** Avec la phrase entière, l'ancien comptage mettait
tout à 10. Nouvelle règle : marqueurs ordinaires × 1, dix marqueurs **forts**
× 3 (« la seule personne à… », « jamais élucidé », « refuse de vieillir »,
« 1 746 morts », « après sa mort »…), seuils 1 / 3 / 6 → +1 / +2 / +3. La
règle « un nombre à deux chiffres vaut un marqueur » est supprimée.

**Sujets phares** (`consignes/sujets-phares.txt`, nouveau). Une passe 0 lit ce
fichier avant tout le reste et impose ses sujets au catalogue, potentiel 10,
marqués `f:1`. Format `titre | univers | phrase`. Quarante-cinq sujets livrés.
`--reclasser` les laisse à 10. Filtre « ★★ Sujets phares » et badge doré dans
la curation ; le tri par potentiel les remonte en tête.

**Plus d'anglais dans la curation française.** Les scores portent désormais
`wl`, la langue de la phrase ; `curFace` n'affiche `w` que si `wl` correspond
à la langue de la face, et pour les catalogues antérieurs devine la langue en
comptant les mots-outils (`langueDeTexte`). Sans phrase utilisable, la ligne
va chercher l'introduction Wikipédia dans sa propre langue.

**La recherche.** `replier()` supprime les accents ; `curFoin()` cherche dans
les deux titres, le nom d'univers, l'accroche, l'aperçu et la phrase du
contributeur, pour les deux faces. « meduse » trouve *Turritopsis dohrnii*,
« nyos » le lac, « galaxie » le Grand Attracteur.

**L'angle envoyé au rédacteur.** `ask()` reçoit la phrase du contributeur (ou
celle de `sujets-phares.txt`) et la place en fin de prompt sous « L'ANGLE »,
avec consigne de suivre la fiche de faits en cas de contradiction.

**`consignes/GUIDE.md`** (nouveau) : quel fichier ouvrir selon ce qui gêne,
POTENTIEL contre NOTE, ce que le journal de collecte doit dire.

Vérifié sous Chromium : six sujets, badges, phrase du contributeur signalée
d'un trait bleu, cinq recherches, filtre phares — aucune erreur JS. Fixtures
du lecteur de listes : tableaux EN multi-lignes et puces FR, sujet correct
dans les six cas.

## 7.2.0 — le lecteur de listes ne lisait qu'un format sur quatre

Votre journal l'a montré sans ambiguïté :

```
· Wikipédia:Articles insolites → 0 sujets
· Wikipedia:Unusual articles → 11 sujets
· Wikipedia:Unusual articles/Death → 0 sujets
· Wikipedia:Unusual articles/Science → 0 sujets
… dix-huit autres sous-pages à 0
```

Ces pages contiennent des milliers d'entrées. Le parseur n'en tirait que 12,
parce qu'il ne reconnaissait qu'une seule forme — la puce `* [[X]] – …` —
alors que **les sous-pages anglaises sont des tableaux** :

```wikitext
| [[Elmer McCurdy]] ★ || An outlaw whose mummified body was used as a
                          funhouse prop for 60 years.
```

Il lit désormais les quatre formes réellement employées — puces, **lignes de
tableau**, listes de définitions, lignes nues — ignore la prose d'introduction,
**suit les transclusions de sous-pages**, et découvre aussi les sous-pages
françaises (`Articles insolites`, `Insolite`). Éprouvé sur les quatre formats :
3, 2, 2 entrées correctement extraites, 0 sur un paragraphe de prose.

**Un filet en dernier recours** : si l'analyse d'une page rapporte moins de
cinq entrées — un format qu'on n'avait pas prévu — on demande à Wikipédia la
liste des articles liés depuis cette page. On perd la phrase du contributeur,
mais ces titres *sont* la sélection curée, et ils entrent au catalogue avec
leur potentiel de 7.

### Les notes s'étalent enfin de 7 à 10

`indiceEtrangete` compte les marqueurs de la phrase du contributeur — et un
**chiffre précis** vaut maintenant un marqueur : « 1 746 personnes », « 60
ans », « 1518 ». C'est ce qui rend un fait racontable.

| Phrase du contributeur | Note |
|---|---:|
| An outlaw whose mummified body was a funhouse prop for **60 years** | 9 |
| Hundreds of people danced for days in **1518**, some to their **death** | 9 |
| An unidentified man found dead on a beach in **1948**, **never** named | 9 |
| The **only** known animal capable of reverting to a juvenile state | 8 |
| A French showman noted for his unusual eating habits | 7 |
| *(aucune phrase — trouvé par les liens)* | 7 |

Les marqueurs de qualité `★` et `✚` ne polluent plus le texte de la phrase.

### La curation n'affiche plus l'anglais faute de français

Une ligne dont le sujet existe dans les deux langues reprenait la phrase
anglaise quand la française manquait : illisible pour juger, **et** cela
empêchait d'aller chercher l'introduction française, qui existe. La vue s'en
tient maintenant à la langue affichée ; sans phrase dans cette langue, elle
demande l'introduction à Wikipédia dans cette langue-là.

---


Tout est vérifié en local : scripts passés à `node --check`, YAML validé,
application rejouée dans Chromium en 390×844 et 1440×900, dépôt vierge et
catalogue de 8 000 sujets, thème clair et thème sombre, français et anglais.

---

## Un numéro de version, enfin

Le fichier **`VERSION`** à la racine porte le numéro lisible (`7.1.0`).
`build.sh` y ajoute l'empreinte des sources et grave le tout :

- dans une balise `<meta name="curio-version">` des deux pages ;
- dans `sw.js`, donc dans le nom des caches ;
- dans **`version.json`**, que l'action lit pour titrer son compte rendu
  (« Curio 7.1.0 (f1543f178b) — étape « 1-collecter » »).

L'application l'affiche dans le menu « … » : **v7.1.0**, l'empreinte complète
en infobulle. Après toute la saga du service worker, c'est la réponse à la
seule question qui compte quand quelque chose cloche — *quelle version tourne
réellement dans ce navigateur ?*

L'empreinte est calculée sur les sources (`parts/`, `VERSION`,
`manifest.webmanifest`), jamais sur les fichiers produits : deux constructions
d'affilée donnent le même numéro, et la moindre modification le change.
Vérifié dans les deux sens.

---

## Le bleu profond

Curio quitte le noir bleuté pour un **bleu de nuit** avec un accent **bleu
électrique**, dans les deux thèmes :

| | Fond | Accent | Texte |
|---|---|---|---|
| Sombre | `#050E24` | `#3FA9FF` | `#EAF1FF` |
| Clair | `#EEF4FE` | `#0B63C4` | `#0A1B3D` |

Les filets et les voiles passent d'un gris neutre à un gris **teinté de bleu**
(`rgba(150,190,255,…)`) : un gris pur à côté d'un bleu profond a l'air sale.
L'or du cadenas est légèrement éclairci (`#F0C46A`) pour tenir sur le bleu —
c'est le seul contraste chaud de l'interface, et il marque exactement ce qui
s'achète. `manifest.webmanifest` et la balise `theme-color` suivent, donc la
barre du navigateur et l'écran de démarrage de l'application installée aussi.

Les huit teintes d'univers sont inchangées : elles restent le seul endroit où
la couleur porte une information.

---

## Trois défauts bloquants

### 1. L'action n'enregistrait jamais rien dans le dépôt

`.github/workflows/curio.yml`, étape « Enregistrer » :

```sh
git add -A catalog.json anecdotes export.csv 2>/dev/null || true
```

Après `1-collecter`, `export.csv` n'existe pas encore. Git refuse alors la
commande **entière** — `fatal: pathspec 'export.csv' did not match any files`,
code 128 — et n'ajoute **rien**, pas même `catalog.json`. `2>/dev/null` avale
le message, `|| true` avale le code d'erreur, l'étape affiche « Rien de nouveau
a enregistrer » et l'exécution se termine en vert.

C'était la cause de tout le reste : sans `catalog.json` sur GitHub Pages, la
vue Curation était vide et le flux tombait sur les fiches de démonstration.

Désormais l'ajout se fait chemin par chemin, en sautant ceux qui n'existent pas.

### 2. Un push refusé ne faisait plus échouer l'action

v4 vérifiait le push et expliquait quoi régler ; v5 l'a remplacé par
`git push || true`. Si les permissions du dépôt ne sont pas en écriture, le
push était refusé sans que rien ne le dise.

Le contrôle de v4 est rétabli : le job échoue, et le compte rendu indique
**Settings → Actions → General → Workflow permissions → Read and write**.

### 3. Le service worker servait éternellement l'ancienne application

`sw.js` portait `const VERSION = 'curio-2026-08-29'`, avec un commentaire
affirmant que `build.sh` la réécrivait — ce qu'il ne faisait pas. En stratégie
« cache d'abord », toute personne ayant ouvert le site une fois recevait
indéfiniment le `app.html` mis en cache ce jour-là.

Deux corrections : `build.sh` grave maintenant l'empreinte réelle de `app.html`
et `index.html` dans `sw.js`, et les documents sont servis **réseau d'abord**.
Le cache reste le filet hors ligne ; il ne décide plus de ce qui s'affiche.

> Sur un navigateur déjà visité, la bascule prend **un rechargement** : le
> nouveau service worker s'installe, prend la main, et à partir de là chaque
> déploiement arrive immédiatement.

---

## Trois défauts majeurs

**Un dépôt vierge servait 32 anecdotes de démonstration.** `resetFeed()`
posait bien la carte « il n'y a rien à lire », puis `setActive()` rappelait
`ensureAhead()` qui empilait des fiches derrière elle. `ensureAhead()` connaît
maintenant cette condition.

**L'accueil annonçait des anecdotes qui n'existaient pas.** `loadCount()` se
rabattait sur `catalog.json.counts` et présentait des *sujets collectés* comme
des *anecdotes écrites* — « 960 anecdotes écrites » alors que zéro l'était,
en contradiction avec la FAQ de la même page. Les deux chiffres sont désormais
distincts et nommés : « 4 000 sujets au catalogue » tant que rien n'est écrit.

**`?curation=1` débloquait l'abonnement à vie, définitivement.** L'appel
`unlock('lifetime')` écrivait `localStorage['curio.plan']`. Le compteur est
maintenant levé **pour la session en cours seulement**.

---

## Les six fonctions perdues, réinjectées

| Fonction | Venait de |
|---|---|
| Moisson des **listes d'articles insolites** (~200 lignes dans `build-catalog.mjs`) | v5 |
| **SCORES** : potentiel mesuré + la phrase qui dit *pourquoi* le sujet étonne | v5 |
| **« À raconter »** : consigne d'écriture, champ `r`, bloc sur la fiche | v5 |
| **Sommaire et recherche** réservés à l'abonnement | v4 |
| Entrée **`source`** de l'action (`tout` / `insolite` / `categories`) | v5 |
| Push qui échoue bruyamment | v4 |

L'univers « Insolite » de v5 n'est pas revenu : le produit annonce huit univers
partout. Ses racines (canulars, curiosités, paradoxes, superlatifs) sont
réparties entre Mystères et Sciences, et la moisson curée couvre ce terrain
bien mieux qu'une catégorie.

---

## Le nouveau modèle gratuit

Dix anecdotes par jour. **Sommaire et recherche appartiennent à
l'abonnement** — leurs boutons portent un **cadenas** de laiton plutôt que
d'être grisés. Une pastille ne dit rien ; un cadenas dit exactement de quoi il
s'agit, et on doit avoir envie de cliquer dessus : c'est la porte, pas un mur.
Le tracé est en SVG, net à toutes les densités, et lisible dans les deux thèmes.

Au-delà du compteur, la fiche suivante n'est plus un mur : ses **deux premiers
paragraphes restent lisibles**, puis le texte s'estompe et se floute, et l'appel
à l'abonnement se pose dessous. On continue de faire défiler, on voit ce qu'on
rate, et on peut remonter relire ce qu'on a déjà ouvert.

Le repli sans `backdrop-filter` (anciens Firefox) est un simple dégradé.

---

## Le classement récompensait la célébrité, pas l'étonnement

C'est le défaut qui explique un catalogue plein de 5 et de 6.

```js
// avant
let p = Math.min(6, Math.round((r.n || 0) / 11));   // n = éditions linguistiques
if (r.cure) p += 3;
```

« Tamám Shud » — un homme mort sur une plage, toutes les étiquettes de ses
vêtements découpées, jamais identifié — existe dans vingt-cinq langues :
`round(25/11)` = 2, plus 3 pour son origine curée, soit **5**. Un sujet
parfaitement banal présent dans deux cents langues obtenait **6**. Le tri par
potentiel remontait donc le second.

Désormais l'origine décide, et la notoriété seule plafonne :

| Sujet | Avant | Après |
|---|---:|---:|
| Tamám Shud (liste insolite, 25 langues) | 5 | **9** |
| La méduse qui rajeunit (liste insolite) | 6 | **9** |
| Les danseurs de 1518 (liste insolite) | 6 | **7** |
| Sujet célèbre et banal (180 langues) | 6 | **5** |
| Sujet moyen des catégories (60 langues) | 5 | **4** |

Un sujet curé démarre à 7, plus zéro à deux points tirés de la phrase que le
contributeur a écrite pour dire pourquoi c'est étrange (mort, seul, jamais,
disparu, interdit, canular, record, impossible…), plus un point pour un label
de qualité. Un sujet trouvé par simple parcours de catégories ne dépasse pas 6.

**Et la rédaction écrit désormais les meilleurs, pas les premiers.** `4-ecrire`
avec `combien = 100` prenait les cent premiers dans l'ordre d'insertion ; elle
trie maintenant par potentiel décroissant.

### Trois outils pour reprendre la main

- Action **`reclasser`** — recalcule tous les potentiels d'un catalogue déjà
  constitué, sans réseau et sans rien dépenser. Vérifié : sur 100 sujets, les
  40 curés remontent de la fourchette 2-9 vers 7-9, et les 60 issus des
  catégories redescendent tous à 4 ou moins.
- Action **`recompter`** — recalcule `anecdotes/index.json`.
- **Le compte rendu affiche l'histogramme des potentiels** et le nombre de
  titres à 7 ou plus. À zéro, il vous dit de relancer avec `source = insolite`.
- **Trois filtres dans la Curation** : ★ Fort potentiel (7+), ★ Listes
  insolites, et Notes faibles (≤6) pour voir ce qui encombre après écriture.
- **`minInsolite` passe de 6 à 7** : une anecdote que le modèle a lui-même
  jugée banale reste dans le dépôt mais n'entre plus dans le flux.

---

## Le catalogue n'est pas le produit

C'est la règle qui gouverne désormais tout ce qui est visible côté lecteur :
**un sujet collecté n'existe pas tant qu'il n'est pas écrit.** La collecte
remplit un carnet d'intentions ; seule la rédaction fabrique quelque chose à
lire. Le site et l'application ne montrent donc rien avant l'étape d'écriture.

Concrètement, après `1-collecter` et avant `4-ecrire` :

| Endroit | Avant | Maintenant |
|---|---|---|
| Bandeau d'accueil | « 4 000 sujets au catalogue » | *rien* |
| Cartes d'univers du site | « 500 sujets » | *rien* |
| Flux de l'application | des extraits de Wikipédia servis comme des fiches | « Il n'y a encore rien à lire » |
| Sommaire | la liste des sujets non écrits | `—`, et une phrase qui renvoie à la Curation |
| Vue Curation | le catalogue | **le catalogue** — c'est l'atelier, il doit tout voir |

L'application ne fait plus **aucun appel à Wikipédia pour lire** : tout vient
des fiches rédigées. Les 32 fiches de démonstration ne sortent plus que si le
réseau tombe — un univers encore vide n'est pas une panne, et on ne bouche pas
le trou avec du contenu qui n'est pas le vôtre.

### Le compteur public compte des sujets

`anecdotes/index.json` porte désormais `total.sujets`, `weekly.sujets` et un
`sujets` par univers, calculés en repliant chaque paire fr↔en grâce aux
`pairs` du catalogue. « Lac Nyos » rédigé en français **et** en anglais, c'est
**un** sujet — pas deux. Vérifié : 3 textes écrits (Lac Nyos FR+EN, Padirac FR)
donnent `{fr:2, en:1, sujets:2}`, et le site annonce « 2 anecdotes ».

`node tools/write-anecdotes.mjs --index` recalcule ce fichier sans rien écrire
ni rien dépenser — utile après avoir ajouté ou retiré des fiches à la main.

### Un choix d'univers ne vide plus l'application

Le choix d'univers par défaut est « Cosmos, Le Vivant ». Si vos premières
anecdotes sont écrites ailleurs, le lecteur voyait « rien à lire » à côté d'un
catalogue pourtant rempli. Un choix est une préférence, pas un filtre : quand
les univers retenus sont encore vides, le flux élargit à ceux qui ont du texte.

---

## Les 32 fiches de démonstration, hors du code

Elles vivent dans `demo.json` à la racine. Elles ne sont chargées que dans un
seul cas — le réseau tombe alors que rien n'a encore été téléchargé — et
n'apparaissent jamais dans un dépôt neuf. **`app.html` passe de 224 Ko à
173 Ko.** Supprimez `demo.json` si vous n'en voulez pas : rien d'autre ne change.

---

## La vue Curation, refaite

- **Liste virtualisée.** Seules les lignes visibles existent dans le DOM :
  ~17 nœuds pour 8 000 lignes, vérifié. Le plafond de 600 a disparu, et
  **« Tout cocher » coche vraiment tout** ce que le filtre affiche.
- **Les deux langues à la fois**, avec un filtre de langue et une étiquette
  FR/EN sur chaque ligne. Un seul CSV pour les deux : la colonne `langue` dit
  à l'action quoi écrire.
- **La phrase « pourquoi c'est étrange »** vient du catalogue, donc s'affiche
  sans un seul appel réseau. Les introductions manquantes ne sont demandées
  que pour les lignes réellement visibles.
- **Habillage entièrement traduit.** Il était en français en dur dans
  `parts/10-body.html` alors que les libellés dynamiques étaient traduits :
  en anglais, l'écran mélangeait les deux langues.
- **Le changement de langue reconstruit la liste.** `CUR.loaded` n'était
  jamais remis à zéro : on basculait en anglais et on voyait encore les
  fiches françaises.
- **Une ligne = un sujet.** C'est le changement de fond. La collecte résout
  chaque article en identifiant Wikidata et en rapporte le titre français *et*
  le titre anglais du même sujet : « Lac Nyos » et « Lake Nyos » sont une seule
  chose. La liste affiche donc une ligne par sujet, avec les drapeaux `FR` `EN`
  de ce qui existe — pleins quand le texte est écrit, creux quand il reste à
  écrire. Cocher cette ligne fait écrire **tout ce qui existe** pour ce sujet :
  les deux langues s'il est dans les deux, une seule s'il n'est que là.
- **Deux compteurs, deux unités, et les deux sont justes.** La sélection compte
  des **sujets** ; la pastille de laiton compte les **textes** que ces sujets
  feront écrire. Un sujet bilingue vaut un sujet et deux textes. C'est le second
  chiffre que l'estimation facture, et il est affiché avant de lancer quoi que
  ce soit.
- **Filtre de langue repensé** : toutes les langues / existe en français /
  existe en anglais / **dans une seule langue**. Ce dernier isole exactement les
  articles qui n'ont pas d'équivalent — ceux qu'on garde parce qu'ils valent le
  coup, même dans une seule langue.
- **La feuille occupe l'écran** : commandes en haut, liste qui défile. Sur un
  téléphone, les filtres et les boutons mangeaient tout et il ne restait pas
  une ligne de visible.

---

## UI

- **`.card__body`** repasse de `justify-content:flex-end` à `margin-top:auto`.
  Avec `flex-end`, un texte agrandi débordait **vers le haut** et passait sous
  la barre ; le commentaire de v5 le déconseillait explicitement.
- **Onboarding sur grand écran** : quatre colonnes sur deux rangées au lieu de
  deux colonnes sur quatre, titres sur une seule ligne, bouton visible sans
  défiler. La réserve de 84 px à droite des titres n'est prise que lorsqu'une
  pastille « payant » existe réellement.
- **Plus de doublons dans le flux** quand le catalogue est encore mince.
- **Collision de classes corrigée** : la ligne de curation utilisait `.uni`,
  déjà la carte d'univers de l'accueil — chaque ligne héritait d'une hauteur
  de 132 px et le rendu partait en morceaux.

---

## Deux bugs trouvés en chemin

**`3-estimer` ignorait purement et simplement la sélection.** La branche
`ESTIMATE` de `write-anecdotes.mjs` ne passait jamais par `selectionHas()` :
elle chiffrait le catalogue entier, quoi que vous ayez collé dans le champ
`selection`. L'aide du workflow promettait pourtant « le coût exact s'affiche ».
Elle applique désormais exactement le même filtre que la rédaction. Vérifié :
4 textes sélectionnés → $0,15, catalogue entier → $0,33.

**Le catalogue comptait des titres là où il annonçait des sujets.**
`counts` ne connaissait que `fr` et `en` — pour un catalogue bilingue, la somme
était le double du nombre de choses réelles. `counts.sujets` a été ajouté, par
univers et au total, en repliant chaque paire fr↔en sur une entrée. C'est lui
que l'accueil, les cartes d'univers et le sommaire affichent maintenant.

---

## Outillage et documentation

- `build.sh` crée `build/`, sort proprement (`set -e`), et grave la version du
  service worker. Il est idempotent.
- `build-catalog.mjs` et `parts/20-data.js` décrivent **les mêmes huit univers**
  — mêmes identifiants, teintes, noms et descriptions. v6 marquait six univers
  `free:false` d'un côté et `free:true` de l'autre.
- README §4, §6, §9 et §11 remis en phase avec l'action réelle
  (`1-collecter`… `entretien`, champ `selection`, plus de champ `liste`).

---

## Ce qui reste ouvert

- La vérification de l'abonnement est toujours **côté client** : un rappel
  poli, pas un verrou. Un vrai contrôle demande une petite fonction serveur
  (README §10).
- La liste virtualisée pose un rail dont la hauteur croît avec le nombre de
  lignes. Au-delà d'environ 100 000 lignes affichées d'un coup, les
  navigateurs plafonnent la hauteur d'un élément ; il faudrait alors paginer.
  À 8 000 lignes — l'ordre de grandeur d'un catalogue complet — c'est sans objet.
