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
ce qui y est déjà.

**Relancer ne détruit rien.** Les sujets déjà présents gardent leur état —
écrit, publié, retiré. Seuls les nouveaux sont ajoutés, et le journal dit
combien. C'est votre outil de comparaison : dans six mois, relancez, et vous
saurez exactement ce que Wikipédia a produit de neuf depuis.

Trois fichiers sortent :

- **`catalogue-maitre.json`** — la nomenclature. C'est la vérité du projet.
- **`catalogue-maitre.csv`** — la même chose dans un tableur : qid, univers,
  titre FR, titre EN, sources, potentiel, statut, dates, phrase.
- **`catalog.json`** — la vue dont l'application a besoin. Régénérée depuis le
  maître, jamais l'inverse.

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

Un seul réglage : **le budget**. On prend les meilleurs sujets non encore
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

## 5 · Publier — le goutte-à-goutte

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
