# Curio — comment ça marche, en une page

Ce fichier n'est lu par aucun programme. Il est pour vous.

---

## La chaîne, en cinq actions

```
   1 · Moissonner   →  catalogue-maitre.json   la liste de référence
        ↓                                       gratuit, une demi-heure
   2 · Écrire       →  anecdotes/*.json        une tranche de N euros
        ↓                                       FR + EN, toujours les deux
   3 · Contrôler    →  controle.csv            gratuit, instantané
        ↓                                       ce qui échoue va en quarantaine
   5 · Publier      →  index.json              tous les jours, tout seul
```

Rien n'apparaît sur le site tant que les quatre étapes ne sont pas passées.
Une fiche écrite n'est pas une fiche en ligne : c'est tout le principe.

---

## 1 · Moissonner — le catalogue maître

**Un sujet, c'est un identifiant Wikidata.** Pas un titre. « Pitch drop
experiment » et « Expérience de la goutte de poix » sont le même sujet, et
Wikidata est la seule autorité qui le sache. C'est ce qui rend les doublons
**impossibles**, définitivement.

Trois sources, rapprochées :

| source | ce que c'est |
|---|---|
| `phare` | ce que **vous** avez inscrit dans `consignes/sujets-phares.txt` |
| `insolite` | les listes d'articles insolites tenues par les wikipédiens |
| `saviez` | « Le saviez-vous ? » / *Did you know* |
| `reddit` | les subreddits listés dans `consignes/reddit.txt` |
| `manuel` | un sujet ponctuel posé dans `consignes/ajouts.json` |

Un sujet trouvé dans **deux ou trois** d'entre elles est un sujet sur lequel
deux ou trois jugements humains indépendants se rejoignent. Il monte au
classement, et le CSV vous le dit : la colonne `sources` affiche
`insolite+saviez` ou `phare+insolite+saviez`.

**Ce qui n'entre pas :** ce qui n'a pas d'article vérifié avec une vraie
introduction ; ce dont la phrase n'est qu'une définition (« X est une commune
française du département de… ») ; ce qui est dans `consignes/exclusions.txt` ;
ce qui y est déjà. Ces règles-là ne coûtent rien : elles sont appliquées
**avant** d'interroger Wikipédia, pour que le temps de la passe aille aux
sujets qui ont une chance d'entrer, vos phares en premier.

**Relancer ne détruit rien.** Les sujets déjà présents gardent leur état —
écrit, publié, retiré. Seuls les nouveaux sont ajoutés, et le journal dit
combien. C'est votre outil de comparaison : dans six mois, relancez, et vous
saurez exactement ce que Wikipédia a produit de neuf depuis.

Quatre fichiers sortent :

- **`catalogue-maitre.json`** — la nomenclature. C'est la vérité du projet.
- **`catalogue-maitre.csv`** — la même chose dans un tableur : qid, univers,
  titre FR, titre EN, sources, potentiel, statut, dates, phrase.
- **`catalog.json`** — la vue dont l'application a besoin. Régénérée depuis le
  maître, jamais l'inverse.
- **`rapport-phares.csv`** — une ligne par ligne de votre fichier de sujets
  phares, et ce qu'elle est devenue. Voir plus bas.

---

### Le doute affiché : la colonne « accord »

Une fiche intitulée **Pac-Man** portant l'histoire d'un poulpe. C'est arrivé :
votre ligne disait `Inky`, et Inky est aussi un fantôme de Pac-Man. Wikipédia
y redirigeait sans rien dire.

Deux choses ont changé. La première est une barrière : toute redirection qui
change de sujet est désormais confrontée à votre phrase, et refusée si elle
n'a rien à voir. La seconde est un chiffre, **l'accord** : combien de mots
signifiants votre phrase partage-t-elle avec l'article ?

    poulpe évadé  ×  jeu d'arcade Pac-Man        accord 0
    lac qui souffle × catastrophe du lac Nyos    accord 3

Un accord de zéro n'écarte rien — une phrase peut raconter un épisode que
l'introduction ne mentionne pas. Il **allume un badge** ⚠ à vérifier dans
`console.html` et `catalogue.html`, remplit un filtre du même nom, et donne un
tri « les moins sûrs d'abord ». Vous regardez, vous tranchez.

Pour les sujets entrés avant la version 8.4 : *Entretien → **accorder***
calcule la colonne sur tout le catalogue, instantanément, sans réseau.

---

### L'univers vient de l'article, pas de la page où il a été trouvé

Les listes d'articles insolites ont des sections parlantes — « Science »,
« Animals », « Places » — et le classement en découle. Les archives de « Le
saviez-vous ? », qui apportent les deux tiers du catalogue, ont des sections
**datées** : « Janvier 2015 » ne dit rien du sujet. Tout tombait donc dans
« Mystères » : 12 810 sujets sur 16 185.

Faute de signal dans la section, l'univers est maintenant lu dans l'article
lui-même — titre, votre phrase, introduction. Tout est déjà téléchargé par la
vérification : **aucun appel réseau de plus**. Un article qui ne donne aucun
signal reste en « Mystères », qui redevient un univers plutôt qu'un
fourre-tout.

Pour un catalogue déjà constitué : *Entretien → **ranger***. Instantané, sans
réseau. Il ne touche que les sujets rangés dans « Mystères », **jamais** un
sujet phare — l'univers y est le vôtre — ni une fiche déjà écrite.

---

### La passe qualité, entre la sélection et la dépense

La moisson vérifie des dizaines de milliers de sujets, vite. Ce que vous vous
apprêtez à **payer**, c'est quelques centaines. *Entretien → **auditer***, ou
le bouton **Vérifier les N retenus** dans la console, reprend ces
quelques centaines une par une.

| contrôle | verdict |
|---|---|
| l'article existe-t-il encore sur Wikidata ? | **grave** |
| son introduction est-elle assez fournie ? | **grave** |
| est-ce une page d'homonymie (« peut désigner… ») ? | **grave** |
| la phrase est-elle une définition d'encyclopédie ? | **grave** |
| y a-t-il une phrase, et fait-elle huit mots ? | **grave** |
| le titre est-il en double, ou dans `exclusions.txt` ? | **grave** |
| la phrase partage-t-elle un mot avec l'article ? | doute |
| l'article a-t-il été renommé depuis la moisson ? | doute |

**Grave** veut dire « ce sujet n'a rien à faire dans une tranche payante ».
**Doute** veut dire « c'est peut-être très bien, mais regardez-le ».

Le résultat va dans **`audit-retenus.csv`**, les ennuis en tête, une ligne par
sujet avec son motif. Par défaut **rien n'est modifié** : l'audit ne fait que
dire. Coché *appliquer*, il passe les **graves** en « écarté » dans
`decisions.json` — les sujets restent au catalogue, et un clic dans la console
les reprend.

Au passage il rafraîchit ce qu'il vient de télécharger : l'accord recalculé
sur l'introduction entière, l'aperçu, et les titres renommés depuis la
moisson.

---

### Ne garder que les meilleurs

Le **potentiel** est une note de 1 à 10 posée à la moisson : signal
d'anecdote dans la phrase, sujet phare, nombre de sources qui se rejoignent.
Ce n'est pas la **note**, qui n'existe qu'après écriture et juge le texte.

`console.html` et `catalogue.html` le filtrent : *10 seulement · 9 et plus ·
8 et plus · 7 et plus · 6 et moins*. Sur un catalogue de 16 185 sujets, cela
donne 119, 451, 1 015, 2 449 et 13 736.

La sélection tient alors en trois gestes : filtre **Potentiel 7 et plus**,
bouton **Retenir ces 2 449**, **Enregistrer mes décisions**. Et l'inverse
range le bas du panier hors du chemin sans rien supprimer : filtre **6 et
moins**, **Écarter ces 13 736**.

---

### Votre fichier de sujets phares est nettoyé au passage

Les 2 506 lignes ont été écrites de mémoire : certaines ne désignent aucun
article, d'autres visent un article dont le vrai titre diffère. La moisson les
confronte une par une à Wikipédia, puis **réécrit
`consignes/sujets-phares.txt` avec les seules lignes qui tiennent**, chacune
portant le titre canonique exact.

L'original est conservé en `consignes/sujets-phares.avant-nettoyage.txt`, et
la réécriture est annulée si moins de la moitié survivent — un incident réseau
ne doit pas vider votre fichier.

Après la première moisson, ce fichier est propre : tous les titres existent,
tous sont orthographiés comme Wikipédia les écrit, aucun n'y figure deux fois.

**Et `rapport-phares.csv` vous dit ce qui s'est passé, ligne par ligne :**

| colonne | ce qu'elle dit |
|---|---|
| `ligne_demandee` | ce que vous avez écrit |
| `resolution` | `exact`, `redirection` ou `recherche` |
| `article_retenu` | où ça a abouti |
| `verdict` | retenu · déjà au catalogue · doublon · refusé · introuvable |
| `motif` | pourquoi, quand c'est un refus |

Les ennuis sont **en tête du fichier** : ce sont les seules lignes à relire.
Une ligne refusée ou introuvable se corrige dans `sujets-phares.txt`, et la
moisson suivante la reprend.

---

### Elle ne fait pas tout d'un coup, et c'est voulu

Wikipédia impose une cadence : 260 ms entre deux appels, davantage quand elle
nous freine. Une moisson complète représente des dizaines de milliers
d'appels — plusieurs heures. Une exécution qui tente tout se fait tuer par la
limite de GitHub, et **on perd tout**, parce que l'enregistrement se fait à la
fin.

Chaque passe se donne donc **40 minutes**, enregistre ce qu'elle a fait, et
s'arrête. Le journal le dit :

```
⏱  Les 40 minutes de cette passe sont écoulées.
   On enregistre ce qui est fait ; la prochaine reprendra la suite.
  ⏱ 87 page(s) non lues cette fois — la prochaine passe les prendra.
```

Ce n'est pas une erreur. Le catalogue est additif, le cache des réponses est
conservé, et la passe suivante repart d'où celle-ci s'est arrêtée — plus vite,
puisque ce qui est déjà lu ne coûte plus rien. Le catalogue s'agrandit nuit
après nuit.

Si vous ne voulez pas attendre : relancez-la plusieurs fois de suite, chaque
passe avance. Ou donnez-lui plus de temps en lançant l'action à la main avec
`minutes = 60`.

---

### Reddit, quand vous voudrez

`consignes/reddit.txt` — vide par défaut, rien ne se passe tant que vous ne
listez pas de subreddit. Dès que vous en décommentez un, la moisson les lit
dans le même passage, chaque nuit.

N'entrent que des billets **autoportants** : du texte, pas un lien ; au-dessus
de votre seuil de votes ; entre 1 200 et 9 000 caractères ; ni supprimés, ni
NSFW, ni épinglés. Le texte du billet devient la matière du rédacteur, comme
un article de Wikipédia. L'identifiant Reddit sert de clé : relancer n'ajoute
jamais deux fois le même billet.

Sans rien, l'accès public de Reddit suffit pour quelques centaines de billets
par nuit. Pour un quota confortable, créez une application sur
`reddit.com/prefs/apps` (type *script*) et posez `REDDIT_ID` et
`REDDIT_SECRET` dans les secrets du dépôt : la moisson les détecte seule.

`consignes/ajouts.json` reste là pour le cas ponctuel — un article de presse,
vos notes, une histoire que vous voulez ajouter seul.

---

## 2 · Écrire — une tranche de N euros

**Ce que ça coûte.** Un sujet = deux textes, français et anglais. Avec la
consigne mise en cache (automatique depuis la 8.4.5, −21 %) :

| modèle | par texte | 1 200 sujets = 2 400 textes |
|---|---|---|
| `claude-opus-5` | 0,0335 $ | 80 $ ≈ 74 € |
| `claude-sonnet-5` | 0,0134 $ | 32 $ ≈ 30 € |
| `claude-haiku-4-5-20251001` | 0,0067 $ | 16 $ ≈ 15 € |

Le champ **Modele** de l'action change de modèle à chaque tranche. Et le vrai
levier n'est pas là : c'est de **ne pas tout écrire d'un coup**. Deux cents
sujets, vingt fiches relues, la consigne corrigée si besoin — puis la suite.
Un sujet déjà écrit n'est jamais repayé.

**Deux façons de dimensionner une tranche.** Le champ **`sujets`** — 5 pour un
essai, 300 pour un lot — ou le **budget** en euros. Le premier prime.

**Et le champ `langues`** : `fr,en`, `fr` ou `en`. Le français seul divise la
facture par deux et **ne perd rien**.

Ces sujets-là prennent un état à eux : **« à finir »**, badge doré, avec le
badge `FR` plein et le badge `EN` creux. Un filtre les isole dans la console et
dans le tableau de bord, un compteur les affiche, et la colonne
`langues_ecrites` du CSV les nomme. Ce ne sont ni des sujets vierges, ni des
sujets terminés.

**Rien n'est jamais réécrit.** Avant tout appel payant, la rédaction lit le
fichier de sortie et écarte les titres qui s'y trouvent déjà — pas d'article
téléchargé, pas de jeton dépensé. Une tranche anglaise ne repaiera jamais le
français.

Un seul réglage historique : **le budget**. On prend les meilleurs sujets non encore
écrits, autant que la tranche permet, et on écrit le français **et** l'anglais.

Plus de sélection à coller — GitHub refusait les grandes (« Provided inputs
are too large ») — plus de langue ni d'univers à choisir.

Cochez **estimer seulement** pour voir le plan sans dépenser un centime :

```
╔══ TRANCHE DE 30 € ══════════════════════════════════
║  0.0359 $ par texte, deux textes par sujet.
║  451 sujet(s) → 902 textes → 32.40 $ (~30.00 €)
║  2 174 sujet(s) restent à écrire au total.
╚═════════════════════════════════════════════════════
```

Si l'exécution s'arrête en route, rien n'est perdu : les fiches sont
enregistrées par paquets de dix, et relancer reprend la suite.

---

## 3 · Contrôler — avant toute mise en ligne

Le contrôle ne juge pas le goût, c'est votre affaire. Il vérifie ce qu'une
machine peut constater sans se tromper :

- la longueur et le nombre de paragraphes ;
- l'ouverture : pas de définition, pas de « Saviez-vous que » ;
- le titre : présent, court, sans deux-points, **jamais employé deux fois** ;
- la note, la phrase « à raconter », l'image, la source ;
- **la langue** : un texte français dans un fichier anglais est recalé ;
- l'appartenance au catalogue maître.

Ce qui échoue passe en **quarantaine** : la fiche reste dans le dépôt, elle
n'est simplement jamais publiée. Rien n'est supprimé. Corrigez, relancez, elle
repasse en vert. La liste complète part dans `controle.csv`.

---

## 5 · Publier — le goutte-à-goutte, réglé depuis la console

**Onglet Publication de `console.html`.** Fréquence (tous les jours, une fois
par semaine, certains jours cochés, ou en pause), combien de sujets par
passage, l'ordre, les langues publiées — et, si vous préférez raisonner en
échéance, une date : *« tout sortir d'ici le 31 décembre »*. Le nombre par
passage est alors calculé, et recalculé à chaque exécution : il s'ajuste si
vous écrivez de nouvelles fiches entre-temps.

Tout cela s'écrit dans `consignes/publication.txt`, que vous pouvez aussi
modifier à la main. **L'action tourne tous les jours à 6 h UTC** ; c'est ce
fichier qui décide si aujourd'hui est un jour de publication.

**`langues: fr`** publie le français seul. Les fiches anglaises restent au
dépôt, non publiées. Côté lecteur, le bouton FR/EN disparaît du site et de
l'application — et revient tout seul le jour où vous rallumez l'anglais.

Ce réglage agit **avant même la première publication** : les outils le
recopient dans `catalog.json` et dans `anecdotes/index.json`, que le site lit
au démarrage. Pour l'appliquer sans attendre une moisson :
*Entretien → **recompter***, quelques secondes, gratuit.


Le stock est écrit d'avance ; il sort au compte-gouttes. C'est ce qui donne au
lecteur la sensation d'une application qui vit, alors que tout est déjà dans
le dépôt et qu'aucun appel payant n'est fait.

**L'action tourne toute seule, tous les jours à 6 h UTC.**

Deux réglages, tous deux à votre main :

- **combien** — `consignes/publication.txt`, ligne `parPassage`. Vous changez
  un chiffre sur GitHub, c'est réglé.
- **à quelle fréquence** — la ligne `cron` de
  `.github/workflows/5-publier.yml`. `0 6 * * *` tous les jours,
  `0 6 * * 1` tous les lundis, `0 6,18 * * *` deux fois par jour.

**Un sujet, pas une fiche.** Publier « Lac Nyos » met en ligne le français ET
l'anglais le même jour.

À la main, la même action fait aussi :

| opération | ce qu'elle fait |
|---|---|
| `etat` | où en est le stock, sans rien publier |
| `publier` + un nombre | sortir tout de suite ce que vous voulez |
| `retirer` + un titre | sortir une fiche définitivement, les deux langues |
| `rendre` + un titre | annuler un retrait |

Un retrait inscrit le titre dans `consignes/exclusions.txt` : la moisson ne le
reproposera jamais.

---

## Savoir où on en est

**Dans la curation** (`app.html?curation=1`), chaque ligne porte deux badges :

- sa **provenance** : ★ phare · liste insolite · le saviez-vous · catégorie ;
- son **état** : à écrire · à contrôler · quarantaine · en réserve · en ligne
  · retirée.

Et un filtre pour chacun. « en ligne » vous dit ce que voit le lecteur ; « à
écrire » ce qui reste à faire ; « en réserve » ce qui attend son tour.

**Dans le tableur**, `catalogue-maitre.csv` porte les mêmes colonnes, plus les
dates : quand le sujet a été ajouté, écrit, publié.

**Dans le journal** de chaque action, un encadré résume tout.

---

## Ajouter un univers, plus tard, sans rien refaire

`consignes/univers.txt`. Une ligne :

```
reddit | 16 | Histoires vraies | Ce que les gens racontent quand ils croient que personne ne les lit.
```

et le neuvième univers existe. La moisson l'accepte dans `sujets-phares.txt`,
l'application le découvre toute seule en lisant `catalog.json`. Rien de ce qui
existe n'est touché, aucun fichier à refaire, aucune fiche à réécrire.

---

## Les fichiers qui sont à vous

| fichier | ce qu'il décide |
|---|---|
| `consignes/sujets-phares.txt` | les sujets que vous imposez, avec votre phrase |
| `consignes/publication.txt` | combien de sujets sortent à chaque passage |
| `consignes/exclusions.txt` | ce qui ne doit jamais revenir |
| `consignes/univers.txt` | les univers en plus des huit |
| `consignes/fr.md` et `en.md` | la consigne d'écriture, mot pour mot |

Aucun ne touche au code. Modifiez-les directement sur GitHub : les outils les
relisent à chaque exécution.

---

## Ne supprimez jamais le dépôt

`catalogue-maitre.json` et `anecdotes/` sont vos données. Une mise à jour se
fait par *Add file → Upload files* : GitHub remplace les fichiers de même
chemin et laisse le reste intact.
