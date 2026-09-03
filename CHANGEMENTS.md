# Curio 8.4.2 — ce qui a changé depuis v6

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
