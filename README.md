# Curio

Une anecdote vraie par écran, en français et en anglais, tirée de Wikipédia et
réécrite pour être lue. Site statique, hébergé par GitHub Pages, sans serveur.

---

## Vos liens

Remplacez `VOTRE-COMPTE` par votre nom d'utilisateur GitHub et gardez cette
section en favori — c'est tout ce dont vous vous servez au quotidien.

| | adresse |
|---|---|
| **Le site** | `https://VOTRE-COMPTE.github.io/curio/` |
| **L'application** | `https://VOTRE-COMPTE.github.io/curio/app.html` |
| **LA CONSOLE** — à mettre en favori | `https://VOTRE-COMPTE.github.io/curio/console.html` |
| Le catalogue en lecture seule | `https://VOTRE-COMPTE.github.io/curio/catalogue.html` |
| **La curation** *(privé)* | `https://VOTRE-COMPTE.github.io/curio/app.html?curation=1` |
| **Les actions** | `https://github.com/VOTRE-COMPTE/curio/actions` |
| **Le catalogue maître** | `https://github.com/VOTRE-COMPTE/curio/blob/main/catalogue-maitre.csv` |
| **Le rapport sur vos sujets phares** | `https://github.com/VOTRE-COMPTE/curio/blob/main/rapport-phares.csv` |
| **Vos réglages** | `https://github.com/VOTRE-COMPTE/curio/tree/main/consignes` |

Les cinq actions, directement :

```
.../actions/workflows/1-moissonner.yml     construire le catalogue maître
.../actions/workflows/2-ecrire.yml         écrire une tranche de N euros
.../actions/workflows/3-controler.yml      contrôler avant mise en ligne
.../actions/workflows/5-publier.yml        publier — tourne seule chaque jour
.../actions/workflows/entretien.yml        ranger, accorder, purger, recompter…
```

Sur chacune : bouton **Run workflow**, en haut à droite.

> La curation n'est pas protégée par un mot de passe : elle est simplement non
> référencée. C'est un atelier, pas un coffre. Ne diffusez pas l'adresse.

---

## La console — l'endroit où tout se passe

`console.html`. Une page, deux vues, et vous n'ouvrez rien d'autre.

**Catalogue** — tout ce que la moisson a trouvé (elle tourne chaque nuit à
minuit, toute seule). Vous lisez, vous retenez ou vous écartez, à la main.
Deux boutons en bas : **Enregistrer mes décisions**, qui les écrit dans le
dépôt, et **Écrire les retenus**, qui lance l'écriture avec le budget que vous
indiquez.

**Six filtres, dont le potentiel.** Univers, provenance, décision, état,
**potentiel** (*10 seulement · 9 et plus · 8 et plus · 7 et plus · 6 et
moins*) et recherche. C'est le potentiel qui répond à « je ne veux que les
meilleurs » : sur 16 185 sujets, *7 et plus* en garde 2 449, *9 et plus* en
garde 451.

**Les boutons de lot agissent sur le filtre en cours, et le disent.** Filtrez
sur *Articles insolites*, et le bouton devient **Retenir ces 114** ; la ligne
sous les boutons nomme le filtre et rappelle où en est la sélection —
« 114 retenus, 0 écarté, 814 sans décision ». Sans filtre, un lot de plus de
cinquante sujets demande confirmation. **Tout oublier** efface toutes les
décisions si une manœuvre ancienne a brouillé le compte : le catalogue et les
fiches écrites ne bougent pas.

**Relecture** — les fiches écrites, en entier : titre, texte complet, note,
phrase à raconter. Vous validez une par une ou d'un bloc, et **Publier les
validées** les met en ligne. Ce que vous marquez « à refaire » repasse à
écrire ; « à retirer » sort définitivement.

Elle parle à GitHub avec un jeton que vous créez et qui **ne quitte jamais
votre navigateur**. Réglages → un jeton à portée fine, limité à ce dépôt,
permissions `Contents: Read and write` et `Actions: Read and write`.

**Vous pouvez vous en passer.** Sans jeton, la console montre tout et garde
vos décisions dans le navigateur ; le bouton *Télécharger decisions.json* vous
donne le fichier, que vous déposez sur GitHub par *Add file → Upload files*
dans `consignes/`. Le résultat est identique — ce sont ces fichiers que les
outils lisent. Vous lancez alors les actions depuis l'onglet Actions.

**Ne collez jamais un jeton dans une conversation**, avec moi ou avec qui que
ce soit. S'il vous échappe, révoquez-le : rien n'est cassé, vous en refaites
un en une minute.

---

## La chaîne, en cinq gestes

```
   1 · Moissonner   →  catalogue-maitre.json     gratuit, ~30 min, une fois
        ↓
   [ vous regardez ]  catalogue-maitre.csv, ou la curation
        ↓
   2 · Écrire       →  une tranche de N euros    FR + EN, toujours les deux
        ↓
   3 · Contrôler    →  quarantaine               gratuit, instantané
        ↓
   5 · Publier      →  tous les jours, tout seul
```

Rien n'apparaît sur le site tant que les quatre étapes ne sont pas passées.
Une fiche écrite n'est pas une fiche en ligne : c'est tout le principe.

Le détail de chaque étape est dans **`consignes/GUIDE.md`**.

---

## Regarder avant d'écrire

Deux façons, aucune ne coûte un centime.

**Sur une page** — ouvrez **`catalogue.html`**. C'est le tableau de bord :
les compteurs en haut, la liste complète en dessous, une recherche qui ignore
les accents, et un filtre par univers, par provenance, par état et par
**potentiel**. Elle ne
fait rien — pas de case à cocher, pas de bouton qui engage — elle montre.
C'est la page à mettre en favori.

**Dans un tableur** — ouvrez `catalogue-maitre.csv`. Une ligne par sujet :
identifiant, univers, titre français, titre anglais, sources, potentiel,
**accord**, statut, dates, la phrase du contributeur et un **aperçu français**
de l'article. Trois mille lignes se parcourent vite avec un filtre.

**La colonne `accord`** compte les mots signifiants que votre phrase partage
avec l'article. **Zéro veut dire qu'ils ne parlent peut-être pas de la même
chose** — c'est ce chiffre qui aurait signalé la fiche « Pac-Man » portant
l'histoire d'un poulpe évadé. Filtrez dessus : `console.html` et
`catalogue.html` ont le badge ⚠ **à vérifier**, le filtre et le tri « les moins
sûrs d'abord ». Rien n'est retiré pour autant : c'est un doute, pas un verdict.

**Et `rapport-phares.csv`** dit, ligne par ligne de votre fichier de sujets
phares, comment elle a été résolue (`exact`, `redirection`, `recherche`), où
elle a abouti et ce qu'elle est devenue. Les ennuis sont en tête du fichier :
ce sont les seules lignes à relire.

**Dans la curation** — `app.html?curation=1`. Chaque ligne porte sa provenance
(★ phare · liste insolite · le saviez-vous), son potentiel, son état, et deux
lignes de français. Tout est déjà téléchargé : le défilement ne demande rien
au réseau.

**Pour écarter ce qui ne va pas** : cochez les quelques sujets dont vous ne
voulez pas — pas ceux que vous voulez, ils sont bien trop nombreux — puis
**« Copier pour exclusions.txt »**. Collez dans `consignes/exclusions.txt`,
lancez **Entretien → purger**. Ils sortent du catalogue et ne reviendront
jamais.

---

## Les fichiers qui sont à vous

Aucun ne touche au code. Modifiez-les directement sur GitHub, les outils les
relisent à chaque exécution.

| fichier | ce qu'il décide |
|---|---|
| `consignes/sujets-phares.txt` | les sujets que vous imposez, avec votre phrase |
| `consignes/publication.txt` | combien de sujets sortent à chaque passage |
| `consignes/exclusions.txt` | ce qui ne doit jamais revenir |
| `consignes/univers.txt` | les univers en plus des huit |
| `consignes/reddit.txt` | les subreddits à moissonner, et les seuils. Vide par défaut |
| `consignes/ajouts.json` | un sujet ponctuel, de n'importe quelle source — voir `ajouts.LISEZ-MOI.md` |
| `consignes/decisions.json` | écrit par la console : ce que vous retenez |
| `consignes/validations.json` | écrit par la console : ce que vous validez |
| `consignes/fr.md`, `en.md` | la consigne d'écriture, mot pour mot |

---

## Ce que produisent les outils

| fichier | qui l'écrit | ce que c'est |
|---|---|---|
| `catalogue-maitre.json` | 1 · Moissonner | **la vérité du projet** : un enregistrement par sujet, identifié par Wikidata |
| `catalogue-maitre.csv` | 1 · Moissonner | la même chose, pour votre tableur |
| `rapport-phares.csv` | 1 · Moissonner | vos sujets phares, ligne par ligne, et ce qu'ils sont devenus |
| `catalogue.html` | *(livré)* | le tableau de bord : il lit le maître, il ne l'écrit pas |
| `catalog.json` | 1 · Moissonner | la vue dont l'application a besoin |
| `anecdotes/*.json` | 2 · Écrire | les fiches, une par langue et par univers |
| `anecdotes/index.json` | 5 · Publier | les chiffres du site — ne compte que le **publié** |
| `controle.csv` | 3 · Contrôler | ce qui ne passe pas, et pourquoi |

**Ne supprimez jamais le dépôt.** `catalogue-maitre.json` et `anecdotes/` sont
vos données : une demi-heure de moisson et tout votre budget d'écriture. Une
mise à jour se fait par *Add file → Upload files* — GitHub remplace les
fichiers de même chemin et laisse le reste intact.

---

## Mise en route, une seule fois

1. **Settings → Pages** → Source : *Deploy from a branch*, branche `main`,
   dossier `/ (root)`. Le site est en ligne une minute plus tard.
2. **Settings → Actions → General → Workflow permissions** →
   *Read and write permissions*. Sans cela, les actions ne peuvent rien
   enregistrer et vous ne verrez jamais un résultat.
3. **Settings → Secrets and variables → Actions → New repository secret** →
   nom `ANTHROPIC_API_KEY`, valeur votre clé. Seule l'étape 2 s'en sert.
4. Lancez **1 · Moissonner** une première fois. Ensuite elle tourne toute
   seule **chaque dimanche à 5 h**, et la publication chaque matin à 6 h.
   Vous ne déclenchez plus que l'écriture, parce qu'elle seule coûte.

---

## Ce que ça coûte

Tout est gratuit sauf l'écriture. Une fiche revient à environ quatre centimes
avec Claude Opus ; un sujet en vaut deux, français et anglais. Une tranche de
trente euros écrit à peu près quatre cent cinquante sujets.

L'action **2 · Écrire** avec « estimer seulement » affiche le compte exact
avant d'engager quoi que ce soit.

---

## Structure du dépôt

```
index.html              le site — assemblé, ne pas éditer à la main
app.html                l'application — idem
console.html            LA CONSOLE — décider, écrire, relire, publier
catalogue.html          le catalogue en lecture seule, sans jeton
sw.js                   le service worker (cache hors ligne)
build.sh                assemble index.html et app.html depuis parts/
VERSION                 le numéro de version, lisible

parts/                  LES SOURCES. C'est ici qu'on modifie le code.
  00-head.html            styles de l'application
  10-body.html            structure de l'application
  20-data.js              univers, traductions
  30-app.js               tout le comportement
  L0/L1/L2                les mêmes trois pour le site

tools/
  build-catalog.mjs       moisson, catalogue maître, purge, entretien
  write-anecdotes.mjs     écriture par tranches, index
  controler.mjs           le contrôle avant production
  publier.mjs             la publication étalée, le retrait d'une fiche

consignes/              vos réglages (voir plus haut)
icones/                 les icônes de l'application installée
.github/workflows/      les cinq actions
```

Après toute modification dans `parts/`, lancez `bash build.sh` : il
reconstruit `index.html`, `app.html`, `version.json` et grave le numéro de
version dans le service worker. Sans cela, rien ne change pour personne.

---

## Si quelque chose cloche

**L'application affiche une vieille version.** Le menu « … » affiche le numéro
qui tourne réellement. Rechargez deux fois : le service worker sert le réseau
d'abord, mais la bascule demande un passage.

**Une action se termine en vert sans rien changer.** Regardez le résumé : il
dit « Rien de nouveau à enregistrer ». C'est souvent normal — une moisson
relancée n'ajoute que le neuf.

**Le site n'annonce aucune anecdote.** C'est voulu tant que rien n'est publié.
Un sujet collecté n'est pas un produit.

**Une fiche ne va pas.** *5 · Publier → retirer*, avec son titre. Elle sort,
les deux langues, et son titre s'inscrit dans `exclusions.txt`.
