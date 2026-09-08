# Curio

Une anecdote vraie par écran, tirée de Wikipédia et réécrite pour être lue.
Site statique hébergé par GitHub Pages, sans serveur, sans compte lecteur.

**Vous n'ouvrez qu'une page pour travailler : `console.html`.**

---

## Vos liens

Remplacez `VOTRE-COMPTE` par votre nom d'utilisateur GitHub, et gardez la
console en favori.

| | adresse |
|---|---|
| **LA CONSOLE** — à mettre en favori | `https://VOTRE-COMPTE.github.io/curio/console.html` |
| Le site | `https://VOTRE-COMPTE.github.io/curio/` |
| L'application | `https://VOTRE-COMPTE.github.io/curio/app.html` |
| Le catalogue en lecture seule | `https://VOTRE-COMPTE.github.io/curio/catalogue.html` |
| Les actions | `https://github.com/VOTRE-COMPTE/curio/actions` |
| Vos réglages | `https://github.com/VOTRE-COMPTE/curio/tree/main/consignes` |

**Pour essayer l'application comme un lecteur** : ajoutez `?pro=0` (gratuit),
`?pro=sub` (abonné) ou `?pro=1` (achat à vie) à l'adresse de `app.html`. Le
réglage ne vaut que pour le navigateur qui ouvre le lien. Les trois liens sont
aussi dans la console, onglet *Publication*.

---

## Le chemin d'une fiche — les quatre mots du produit

C'est le vocabulaire de toute l'interface. Il ne varie jamais.

> **écrite** — le texte existe
> → **relue** — vous l'avez jugée, dans votre navigateur
> → **au stock** — votre jugement est enregistré au dépôt, elle attend son tour
> → **en ligne** — le lecteur la voit

---

## Les six onglets de la console

| | ce qu'on y voit | ce qu'on y fait |
|---|---|---|
| **1 · Moisson** | ce qui est au catalogue | agrandir le catalogue — **gratuit** |
| **2 · Sélection** | les sujets **pas encore écrits** | retenir, écarter, envoyer à l'écriture — **payant** |
| **3 · Relecture** | les fiches **écrites**, ni au stock ni en ligne | juger le texte, cocher, envoyer au stock |
| **4 · Contrôle** | l'état de santé du catalogue | des outils qui lisent et rapportent, sans rien détruire |
| **5 · Publication** | **le stock** | le rythme, le nom et le logo, sortir des sujets choisis |
| **6 · En ligne** | ce que le lecteur voit | corriger un texte, retirer une fiche |

Aucun onglet n'empiète sur le métier d'un autre. **On ne publie jamais depuis
la Relecture.**

### Le jeton — utile, pas obligatoire

Sans jeton, la console lit tout et vous laisse **télécharger** vos décisions
pour les déposer vous-même dans `consignes/`. Avec un jeton à portée fine, elle
écrit et lance les actions à votre place. Le panneau *réglages*, en haut à
droite, explique comment en créer un et quelles deux permissions suffisent
(`Contents` et `Actions`, en lecture-écriture).

> **Ne collez jamais un jeton dans une conversation, avec qui que ce soit.**

---

## La chaîne, du sujet au lecteur

```
1 · Moissonner   →  le catalogue maître (gratuit, chaque nuit si vous voulez)
2 · Écrire       →  les fiches            ← LA SEULE ÉTAPE QUI COÛTE DE L'ARGENT
3 · Contrôler    →  la forme est vérifiée, ce qui échoue part en quarantaine
   (relecture)   →  vous jugez, vous envoyez au stock
5 · Publier      →  le stock sort au rythme réglé — tourne seule chaque jour
```

Une seule étape est payante : **l'écriture**. Tout le reste ne coûte que du
temps de machine.

**Coût mesuré, par fiche** : Sonnet **0,0177 $** · Opus **0,0442 $**.
Sonnet est le défaut, et la différence ne se voit pas à la lecture.

---

## Les réglages — tout est dans `consignes/`

Le paquet ne livre **jamais** vos fichiers de réglage : il livre des
`*.exemple.txt`. Tout ce qui les lit prend le vôtre s'il existe, l'exemple
sinon. **Importer une nouvelle version n'écrase donc aucun de vos réglages.**

| fichier | ce qu'il commande |
|---|---|
| `publication.txt` | le rythme, les langues publiées, les photos, le sommaire, le passage au stock |
| `marque.txt` | le nom du produit, la signature, le logo |
| `moisson.txt` | la moisson automatique de la nuit |
| `sujets-phares.txt` | vos sujets imposés, une ligne par sujet |
| `exclusions.txt` | ce qui ne doit jamais revenir — *5 · Publier → retirer* y écrit tout seul |
| `fr.md`, `en.md` | les consignes d'écriture — c'est là que se règle le style |
| `reddit.txt` | les subreddits à moissonner (vide = Reddit ignoré) |
| `ajouts.json` | des sujets qui ne viennent pas de Wikipédia |

Le rythme, le nom, le logo, les langues et le sommaire se règlent **depuis la
console**, sans toucher à un fichier.

### Changer le nom, la signature ou le logo

*5 · Publication → **Le nom et le logo***. Vous écrivez, vous enregistrez, et
la console reconstruit le site toute seule.

Pour un logo : déposez votre image dans `icones/` par **Add file → Upload
files**, puis écrivez son chemin — `icones/logo.svg` par exemple. Vide, c'est
le nom en toutes lettres. Une image nette de 400 px de large suffit ; le SVG
est idéal.

**L'icône de l'application installée** est un fichier à part. Remplacez
`icones/curio-192.png`, `curio-512.png`, `curio-512-maskable.png` et
`curio-180.png` par les vôtres, **aux mêmes noms et aux mêmes tailles**.

Changer de nom ne casse rien pour vos lecteurs : leur collection, leurs
favoris et leur formule sont rangés sous des clés qui ne changent pas.

---

## Corriger, retirer, refaire

| ce qui ne va pas | ce qu'on fait |
|---|---|
| une coquille dans une fiche **en ligne** | *6 · En ligne → **corriger le texte***. La fiche reste en ligne, à sa place. |
| le sujet est bon, le **texte** est raté | *5 · Publier → **refaire***. Les fiches sont effacées, le sujet repasse « à écrire ». |
| le sujet n'a pas sa place | *5 · Publier → **retirer***. Il sort, et son titre entre dans `exclusions.txt` : il ne reviendra pas. |
| vous voulez **reprendre la main** sur toute la mise en ligne | *4 · Contrôle → **Tout renvoyer au stock***. Rien n'est effacé. |
| deux fiches racontent la même chose | *4 · Contrôle → **Chercher les redites***. Elle rapporte, vous tranchez. |
| les chiffres se contredisent | *4 · Contrôle → **Pourquoi ces chiffres ?*** puis **Remettre le registre d'accord**. |

---

## Quand quelque chose paraît cassé

**Regardez d'abord la version.** La console l'affiche à côté de son titre,
l'application en bas à droite de l'écran. Si elle ne correspond pas à ce que
vous venez d'importer, c'est le cache : rechargement forcé.

Ensuite, *4 · Contrôle → **Pourquoi ces chiffres ?***. Ce tableau met côte à
côte ce que disent vos **fiches** — ce que le lecteur reçoit — et ce que dit le
**catalogue**. Il conclut par « Les deux comptes concordent », ou vous dit
combien il en manque.

---

## Ce que la version gratuite donne

**Cinq anecdotes par jour, les mêmes pour tout le monde** — elles sont déduites
de la date, pas tirées au hasard : une édition du jour n'existe que si elle est
commune. La barre de lecture n'affiche aucun compteur.

Les formules payantes ouvrent l'accès illimité, le sommaire, la recherche, la
collection, le choix des univers et la pioche au hasard.

> La vérification de la formule est **côté navigateur** : c'est un rappel poli,
> pas un verrou. Un vrai contrôle demande un serveur — c'est le prochain
> chantier.

---

## Le dépôt, en un coup d'œil

```
parts/          les sources — 00/10/20/30 pour l'application, L0/L1/L2 pour le site
build.sh        recompose app.html et index.html, grave la version partout
console.html    la console de pilotage        ← votre outil
catalogue.html  un tableau de bord en lecture seule
tools/          moisson, écriture, contrôle, publication
consignes/      vos réglages et vos consignes d'écriture
anecdotes/      les fiches écrites, un fichier par langue et par univers
icones/         l'icône de l'application installée, et votre logo
github-workflows/  à recopier dans .github/workflows/
```

**Après toute modification d'un fichier de `parts/`, il faut reconstruire.**
La console le fait pour vous quand vous enregistrez le nom ou le rythme ;
sinon, *Actions → Entretien → reconstruire*.

`CHANGEMENTS.md` raconte l'histoire version par version : les défauts trouvés,
et pourquoi ils existaient. C'est la meilleure lecture pour comprendre le
produit avant d'y toucher.

---

## Installation, si vous repartez de zéro

1. Créez un dépôt **public** nommé `curio`.
2. Déposez tout le contenu du paquet à la racine — *Add file → Upload files*.
3. *Settings → Pages* → Source : **Deploy from a branch**, branche `main`,
   dossier `/ (root)`.
4. *Settings → Actions → General → Workflow permissions* : **Read and write**.
5. *Settings → Secrets and variables → Actions* : ajoutez `ANTHROPIC_API_KEY`.
   **Elle ne va nulle part ailleurs — jamais dans un fichier du dépôt.**
6. Ouvrez `console.html` et lancez **1 · Moissonner**.
