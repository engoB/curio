# PASSER EN LIGNE POUR DE BON

Le plan complet : nom, domaine, Cloudflare, dépôt privé, paiement Polar,
blog, réseaux sociaux, tableau de bord.

Écrit le 8 septembre 2026, à partir de la version 8.16.1 et du dépôt
`engoB/curio` lu en ligne le même jour.

---

## AVANT TOUT — trois choses que j'ai trouvées dans ton dépôt

Elles ne sont pas des détails d'affichage. Deux d'entre elles touchent
directement à ce que tu vends.

### 1. Ton stock entier est téléchargeable par n'importe qui, aujourd'hui

J'ai ouvert `anecdotes/fr-cosmos.json` depuis mon bac à sable, sans compte,
sans rien. Il fait 884 ko et contient **268 fiches complètes**, texte
intégral. Or `index.json` dit que **21** seulement sont en ligne pour Cosmos.

Le tri entre « en ligne » et « au stock » se fait dans le navigateur, à la
ligne 718 de `parts/30-app.js` (`filtrerPubliees`). C'est un filtre
d'affichage, pas une serrure. Il suffit d'ouvrir l'adresse du fichier pour
lire les 1 152 fiches, y compris les 883 du stock.

**Conséquence commerciale.** L'abonnement vend l'accès illimité à un corpus
qui est déjà entièrement public. Et le jour où le blog attirera du monde,
quelqu'un finira par regarder.

**Le correctif** (livré) : deux dossiers, deux métiers.

- `anecdotes/` reste **la vérité** — toutes tes fiches, stock compris — et
  n'est plus servie au lecteur. Aucun outil n'a changé d'habitude.
- `fiches/` est **ce que le site sert** : uniquement les fiches en ligne, sans
  tes champs internes (`v`, ton jugement, et `d`, la date d'écriture, ne
  sortent pas).

`tools/servir.mjs` fabrique le second à partir du premier, à chaque
publication. Sa règle de tri est copiée **mot pour mot** sur
`filtrerPubliees()` : il ne peut pas exister deux définitions de « en ligne »
dans le produit. Rien ne change pour le lecteur, et l'application charge plus
vite — 28 ko de stock deviennent 18 ko servis, sur mon jeu d'essai.

La vue Curation, elle, lit toujours `anecdotes/` : c'est l'atelier, il doit
tout montrer. Cloudflare Access la garde ouverte pour toi et fermée pour le
reste du monde.

Note au passage : `filtrerPubliees` laisse passer toute fiche sans champ `p`
(`v.p === undefined`). C'est volontaire et c'est bien — mais après le
correctif ces fiches-là ne seront de toute façon plus dans le fichier public.

### 2. `console.html` est en accès libre

Elle ne contient pas ton jeton GitHub — il vit dans ton navigateur, c'est
correct. Mais la page elle-même, son vocabulaire, tes réglages et le
`catalogue.html` en lecture seule sont lisibles par le premier venu qui
devine l'adresse. Sur un produit qu'on vend, ça se ferme.

**Le correctif** : Cloudflare Access, gratuit jusqu'à 50 personnes. Une règle
sur `/console.html`, `/catalogue.html`, `/atelier.html` et `/anecdotes/*`, un
code à six chiffres
envoyé à ton adresse, et c'est fini. Aucun code à écrire.

### 3. `weekly.fr` = 269 = le total

Tu le savais déjà. La cause : `tools/publier.mjs` recopie le total dans
`weekly` quand toutes les fiches en ligne portent la même date de publication
— ce qui est le cas depuis la remise à plat. Le compteur « nouveau cette
semaine » du site est donc faux tant que les dates ne sont pas réétalées.

**Le correctif** est dans le zip 8.18 — mais pas là où je le croyais. Le calcul
de `write-anecdotes.mjs` est **juste** : il compte les fiches publiées depuis
moins de sept jours, ce qui est exactement ce qu'il faut. Ce sont les *données*
qui mentent. `tools/reetaler.mjs` soigne donc la cause : il réétale les dates
de publication des fiches déjà en ligne, en arrière, au rythme de
`publication.txt`. Rien ne sort, rien ne rentre — seules les dates deviennent
vraisemblables. Il demande le mot **REETALER** pour écrire quoi que ce soit.

---

# 1 · LE NOM ET LE DOMAINE

## Pourquoi changer de nom est une bonne décision

`Curio` est joli mais très occupé : il existe un Curio en électronique, un
Curio en logiciel de découpe, un Curio en librairie ancienne, et
`curio.com` appartient à un tiers protégé par MarkMonitor — autant dire une
marque défendue. Tu ne gagneras jamais la première page de Google sur ton
propre nom, et c'est le premier trafic qu'un produit reçoit.

## Comment j'ai vérifié

J'ai interrogé les serveurs de noms de **106 domaines** (`.com`, `.fr`,
`.app`). Un domaine qui ne répond pas du tout (NXDOMAIN) n'est presque
jamais enregistré ; un domaine qui répond l'est. Ce n'est pas une preuve
juridique : **vérifie au registrar avant d'acheter**, ça prend dix secondes.

## Nimbe — ce que j'ai trouvé

Tu as choisi Nimbe, et je dois te donner une mauvaise nouvelle avant que tu
sortes ta carte : **`nimbe.com` n'est pas libre, et il n'est pas à vendre.**

C'est une entreprise brésilienne active — une plateforme financière pour
cliniques médicales. Le domaine est servi par Cloudflare et reçoit du courrier
sur Google Workspace : ce n'est pas un domaine parqué qu'on rachète, c'est une
société qui s'en sert tous les jours. `nimbe.fr`, `nimbe.co`, `nimbe.net` et
`nimbe.eu` sont pris eux aussi.

Le secteur est très différent du tien, donc **le nom Nimbe reste utilisable** —
il n'y a pas de conflit de marque entre une application d'anecdotes et un
logiciel de facturation hospitalière au Brésil. C'est le `.com` qui est fermé,
pas le nom.

### Ce qui est libre autour de Nimbe

| domaine | avis |
|---|---|
| **`nimbe.app`** | **Mon choix.** Extension moderne, forcée en HTTPS, faite pour une application. Aucune différence de référencement avec un `.com`. |
| `nimbe.io` | Libre. Plus « technique », un peu daté pour du grand public. |
| `nimbe.me` | Libre. Personnel, moins sérieux. |
| `lenimbe.com` · `getnimbe.com` | Libres, mais un article ou un « get » collé devant est le signe qu'on n'a pas eu le bon domaine. Je déconseille. |

**Prends `nimbe.app`.** Un nimbe, c'est le halo autour d'une source de
lumière : cinq lettres, une image, et personne d'autre ne s'en sert.

### Et si tu changes d'avis

Rien n'est gravé. Le nom vit dans `consignes/marque.txt` et se change depuis la
console, onglet *6 · Publication* : tu écris, tu enregistres, le site se
reconstruit. Le logo pareil — depuis la 8.20 il suffit de déposer
`icones/logo.svg`.

**Une seule chose ne se rattrape pas : le domaine**, une fois que des pages
sont indexées et que des liens de paiement pointent dessus. Le nom peut
changer cent fois ; l'adresse, une seule, et le plus tôt possible.

Les autres noms libres, si tu veux les garder sous le coude : `sidere.app`
(*sidérer* — stupéfier, du latin *sidus*, l'étoile), `astre.app`,
`ebahia.com` (libre en `.com`, `.fr`, `.app` et `.co`), `ravir.app`.

## Où acheter

**Cloudflare Registrar** vend les domaines **au prix coûtant**, sans marge et
sans hausse au renouvellement — environ 10,50 $ par an pour un `.com`, contre
15 à 25 $ ailleurs à partir de la deuxième année. La confidentialité WHOIS est
incluse et gratuite. Adresse : `domains.cloudflare.com`.

Le `.fr` n'est pas toujours proposé par Cloudflare. S'il ne l'est pas :
prends-le chez **OVH** ou **Gandi** (7 à 12 € par an), puis dans leur
interface change les **serveurs de noms** pour ceux que Cloudflare t'indique.
Le domaine reste acheté chez eux, mais c'est Cloudflare qui le pilote — c'est
tout ce qui compte.

**Ordre à respecter** : achète le domaine *avant* de configurer Cloudflare
Pages. L'inverse marche aussi mais te fera refaire une étape.

---

# 2 · CLOUDFLARE — METTRE LE SITE EN LIGNE

## Ce que tu gagnes en partant de GitHub Pages

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| dépôt privé | payant (GitHub Pro) | **inclus, gratuit** |
| domaine sur mesure | oui | oui |
| protection par mot de passe d'une page | non | **oui, Access, gratuit** |
| en-têtes de cache réglables | non | **oui, fichier `_headers`** |
| redirections | non | **oui, fichier `_redirects`** |
| petits programmes côté serveur | non | **oui, Workers — c'est ce qui portera le paiement** |
| vitesse hors États-Unis / Europe | correcte | meilleure |

La raison décisive n'est pas la vitesse : c'est **Access** (fermer la console)
et **Workers** (vérifier une clé de licence sans exposer ton jeton Polar).

## Les étapes, dans l'ordre, clic par clic

**a. Créer le compte.** `dash.cloudflare.com` → *Sign up*. Gratuit, pas de
carte bancaire.

**b. Ajouter le domaine.** *Add a site* → tape `entrefilet.com` (ou ton nom)
→ plan **Free** → Cloudflare te donne deux serveurs de noms. Si tu as acheté
chez Cloudflare, c'est déjà fait. Sinon, va chez OVH/Gandi et remplace les
serveurs de noms par ceux-là. Compte de 5 minutes à 2 heures pour que ça
prenne.

**c. Créer le projet Pages.** Menu de gauche → *Workers & Pages* → *Create*
→ onglet **Pages** → *Connect to Git* → autorise GitHub → choisis `engoB/curio`.

Réglages de construction :

```
Framework preset ........ None
Build command ........... (vide)
Build output directory .. /
Root directory .......... (vide)
```

C'est tout. Ton site n'a pas d'étape de construction : `app.html`,
`index.html` et le reste sont déjà des fichiers finis dans le dépôt. Le
`build.sh` tourne **dans GitHub Actions**, pas chez Cloudflare.

*Deploy*. Deux minutes plus tard tu as une adresse en `.pages.dev`.
Vérifie-la avant d'aller plus loin.

**d. Brancher le domaine.** Dans le projet Pages → *Custom domains* → *Set up
a custom domain* → `entrefilet.com`, puis recommence avec `www.entrefilet.com`.
Cloudflare crée les enregistrements DNS tout seul.

**e. Rediriger `www` vers le nu** (ou l'inverse, mais choisis-en un et tiens-t'y :
deux adresses qui servent le même contenu, c'est une pénalité SEO).
Menu *Rules* → *Redirect Rules* → *Create rule* :

```
Si   Hostname égal à   www.entrefilet.com
Alors  Dynamic redirect  →  concat("https://entrefilet.com", http.request.uri.path)
Statut : 301
```

**f. Le fichier `_headers`.** Je te le livre dans le zip. Il règle un vrai
problème : sans lui, Cloudflare met en cache `sw.js` et `index.html`, et tes
lecteurs restent bloqués sur l'ancienne version — exactement le défaut que
`build.sh` passe déjà tant de temps à éviter côté navigateur. Contenu :

```
/sw.js
  Cache-Control: no-cache
/*.html
  Cache-Control: no-cache
/anecdotes/*
  Cache-Control: public, max-age=300
/icones/*
  Cache-Control: public, max-age=31536000, immutable
/console.html
  X-Robots-Tag: noindex
```

**g. Fermer la console.** Menu de gauche → *Zero Trust* → première visite :
choisis le plan **Free** (50 utilisateurs). Puis *Access* → *Applications* →
*Add an application* → **Self-hosted** :

```
Nom .................. Console Curio
Domaine .............. entrefilet.com   Chemin : console.html
Politique ............ Nom : moi
                       Action : Allow
                       Include : Emails → ton@adresse
```

Répète pour `catalogue.html` et pour `atelier/*`. À partir de là, ouvrir la
console demande un code à six chiffres reçu par e-mail, valable 24 heures.
Ton téléphone ne le redemandera pas tous les jours.

**h. Éteindre GitHub Pages.** Dépôt → *Settings* → *Pages* → Source : *None*.
À faire **en dernier**, une fois que le nouveau domaine sert bien.

## Deux avertissements

**L'application installée sur ton téléphone ne suivra pas.** Une PWA est liée
à son origine. `engob.github.io/curio` et `entrefilet.com` sont deux origines
différentes : ta collection, ton compteur, ton thème sont dans le stockage de
la première et n'iront pas dans la seconde. Désinstalle et réinstalle depuis
le nouveau domaine. Tu n'as pas encore de lecteurs installés — c'est
maintenant qu'il faut le faire, pas dans six mois.

**Les liens `github.io` que tu as pu partager cesseront de marcher.** Si tu en
as diffusé, laisse GitHub Pages allumé un mois et remplace le contenu de
`index.html` par une redirection. Dis-le-moi et je le prépare.

## Pages ou Workers ?

Cloudflare pousse aujourd'hui les nouveaux projets vers **Workers avec
« static assets »** plutôt que Pages. Pour toi, **Pages reste le bon choix** :
l'intégration Git se règle entièrement à la souris, alors que Workers demande
un fichier de configuration et, dans les cas courants, un outil en ligne de
commande. Pages n'est pas abandonné, il est en maintenance active. Le jour où
il le serait, la migration est une case à cocher.

---

# 3 · PASSER LE DÉPÔT EN PRIVÉ

## Ce que ça change, vraiment

**Ce qui continue de marcher sans rien toucher :**

- Cloudflare Pages déploie les dépôts privés, y compris sur le plan gratuit.
- La console : elle ne lit rien en public, elle passe par
  `api.github.com` avec ton jeton (ligne 984 de `console.html`). Rien à
  changer.
- `catalogue.html` : il lit `catalogue-maitre.json` **en chemin relatif**,
  donc servi par Cloudflare. Rien à changer.
- Toutes tes actions GitHub.

**Ce qui casse :**

- `raw.githubusercontent.com/engoB/curio/...` ne répond plus. Si tu as des
  liens vers ça quelque part, ils meurent. Je n'en ai trouvé aucun dans le
  code.
- Moi, je ne peux plus lire ton dépôt pour t'aider. Ce n'est pas rien : deux
  fois sur trois, quand un chiffre ne correspondait pas, la réponse était dans
  la forme réelle de tes données. **Garde l'habitude de me joindre le zip**,
  et si un jour un compteur déraille, envoie-moi aussi le fichier concerné.

**Ce qui coûte :**

- Les **minutes d'Actions** deviennent payantes au-delà du quota. Dépôt
  public : illimité. Dépôt privé, compte gratuit : **2 000 minutes par
  mois**, puis 0,008 $ la minute.

  Ton usage, estimé sur tes workflows : la publication tourne tous les jours
  (~1 min), l'entretien à la demande (~2 min), la moisson quand tu la lances
  (5 à 20 min), l'écriture par tranches (10 à 30 min selon le nombre de
  sujets). Un mois normal : **150 à 400 minutes**. Un mois où tu écris
  1 000 fiches : peut-être 600. **Tu es très loin du plafond.** Surveille
  quand même : *Settings → Billing → Actions*.

## Faut-il vraiment le passer en privé ?

Oui, mais **pas pour la raison qu'on croit**. Le code ne vaut pas d'être
caché. Ce qui vaut d'être caché, c'est `catalogue-maitre.json` — ton catalogue
de 1 900 sujets, tes notes d'insolite, tes décisions — et le contenu de
`anecdotes/`. C'est ça, les mois de travail.

Et il faut être clair sur une limite : **passer le dépôt en privé ne protège
pas le stock**, parce que Cloudflare Pages *sert publiquement tout le contenu
du dépôt*. `entrefilet.com/anecdotes/fr-cosmos.json` serait aussi ouvert que
l'était `raw.githubusercontent.com`. C'est pour ça que le point 1 en tête de
ce document — séparer les fiches en ligne du stock — vient **avant** le
passage en privé. Fais les deux, dans cet ordre.

**Comment** : dépôt → *Settings* → tout en bas, *Danger Zone* → *Change
repository visibility* → *Make private*. Cloudflare Pages garde la connexion.

---

# 4 · POLAR — BRANCHER LE PAIEMENT

## Ce que Polar fait pour toi

Polar est **marchand de référence** (*merchant of record*). Autrement dit :
c'est Polar qui vend, pas toi. Polar encaisse, collecte et reverse la TVA de
chaque pays européen, gère les factures, les remboursements et les litiges.
Tu n'as ni numéro de TVA intracommunautaire à obtenir, ni déclaration OSS à
remplir. Pour quelqu'un qui vend 4,99 € à des particuliers dans 27 pays,
c'est la seule chose qui rende l'affaire tenable.

## Les frais, en clair — et pourquoi ils changent ton prix

Tarifs Polar 2026, plan **Starter** (gratuit) : **5 % + 0,50 $** par
transaction, **+1,5 %** si la carte est hors États-Unis (donc : toutes tes
cartes françaises), **15 $** par litige, et pour les virements **2 $ par mois
actif + 0,25 % + 0,25 $** par versement.

Applique ça à tes trois formules :

| formule | prix | ce que Polar prélève | il te reste | perte |
|---|---|---|---|---|
| mensuel | 4,99 € | ~0,50 € + 0,32 € | **~4,17 €** | **16 %** |
| annuel | 39 € | ~0,50 € + 2,54 € | **~35,96 €** | **8 %** |
| à vie | 79 € | ~0,50 € + 5,14 € | **~73,36 €** | **7 %** |

*(TVA mise à part : elle est prélevée sur le prix affiché avant les frais.)*

**Ce que ça veut dire.** Les 50 centimes fixes écrasent le petit montant. Un
abonnement mensuel à 4,99 € te laisse 4,17 € ; le même client en annuel te
laisse 35,96 €, soit **sept mois de mensuel pour douze mois d'accès**.

**Ta décision : 4,99 € et les 16 % assumés comme un coût d'acquisition.**
C'est défendable, et je ne vais pas y revenir. Un prix rond et bas fait plus
d'abonnés qu'un prix optimisé, et 4,17 € nets par mois restent 4,17 € par mois.

Deux choses à surveiller quand même :

- **Mets l'annuel en avant.** À 39 €, tu gardes 35,96 € — l'équivalent de neuf
  mois de mensuel pour douze mois d'accès. L'encadré annuel porte déjà la
  mention « deux mois offerts » ; c'est celui qu'il faut faire choisir.
- **À partir de 350 $ de ventes mensuelles**, le plan Pro de Polar (20 $ par
  mois, 3,8 % + 0,40 $) devient rentable. Ce jour-là, préviens-moi.

Note aussi le plan **Pro** de Polar : 20 $ par mois pour descendre à
3,8 % + 0,40 $. Il devient rentable à partir d'environ **350 $ de ventes
mensuelles**. Pas avant.

## Le problème que le paiement doit résoudre chez toi

Ton produit n'a **aucun compte lecteur** et **aucun serveur**. C'est une force
— rien à faire fuiter, rien à héberger — et c'est le nœud du paiement : après
l'achat, comment l'application sait-elle que ce navigateur-là a payé ?

Aujourd'hui elle ne le sait pas : `unlock()` écrit `curio.plan` dans le
stockage du navigateur, et voilà. `?pro=1` dans l'adresse déverrouille tout.
C'est un rappel poli, pas un verrou — tu le sais déjà.

## La solution : clé de licence Polar + retour automatique

**La clé de licence.** Dans Polar, on attache à chaque produit un « bénéfice »
de type *License Keys*. À l'achat, Polar fabrique une clé du genre
`CURIO_3f8a…`, l'affiche au client et la lui envoie par e-mail. L'application
vérifie cette clé auprès de Polar. Si l'abonnement est annulé, **Polar révoque
la clé automatiquement** — et l'application revient au gratuit à la
vérification suivante.

**Le lien magique — mieux qu'un e-mail.** Tu as choisi le lien magique ; je te
propose plus simple et plus sûr que l'e-mail. Polar permet de définir une
*adresse de retour* après paiement, avec l'identifiant de la commande dedans.
On y met un petit programme Cloudflare (un *Worker*) qui :

1. reçoit `?checkout_id=…` ;
2. demande à Polar, avec ton jeton secret, quelle clé vient d'être créée ;
3. renvoie l'acheteur vers `https://entrefilet.com/app.html#cle=CURIO_3f8a…`

L'application lit la clé dans l'adresse, la vérifie, se déverrouille, affiche
« C'est ouvert » **et montre la clé en gros avec un bouton copier**, pour ses
autres appareils. Le client n'a **rien à taper**. C'est le meilleur moment de
tout le parcours, et c'est celui que la plupart des produits ratent.

Pour un deuxième appareil, ou une clé perdue : le **portail client Polar**
(`polar.sh/<ton-org>/portal`) renvoie la clé après une connexion par code
e-mail. Zéro ligne de code, c'est fourni.

**Pourquoi un Worker et pas un appel direct depuis la page ?** Deux raisons.
La documentation de Polar demande explicitement de ne pas mettre
l'`organization_id` dans une application cliente ; et l'API de Polar n'est pas
faite pour être appelée depuis un navigateur (restrictions CORS que je n'ai
pas pu tester — l'accès à `api.polar.sh` est bloqué depuis mon bac à sable,
je te le dis plutôt que de te laisser croire le contraire). Le Worker règle
les deux d'un coup, et il te coûte 0 € : le plan gratuit donne 100 000
requêtes par jour.

## L'essai de trois jours

Livré dans la 8.20, et c'est **le levier de conversion le plus important du
produit**.

Un bouton sur l'écran d'achat : *« Essayez trois jours »*. **Sans carte
bancaire, sans compte, sans rien.** On appuie, et le catalogue entier s'ouvre —
avec la recherche, le sommaire, les univers et la pioche. Trois jours plus
tard, ça se referme tout seul, en le disant.

**Sauf la collection**, et c'est ta remarque : elle reste fermée. Un essayeur
qui met vingt anecdotes de côté pendant trois jours les perdrait toutes le
quatrième — une fin d'essai qui efface un travail personnel laisse un bien plus
mauvais souvenir qu'une fin d'essai qui rend simplement le catalogue. Elle
reste **visible dans le menu, avec un cadenas**, et y toucher explique
pourquoi : la cacher laisserait croire qu'elle n'existe pas, la montrer fermée
donne une raison de s'abonner.

**Pourquoi pas l'essai de Polar ?** Parce qu'il demande la carte bancaire avant
d'avoir rien montré. C'est très exactement le geste que quelqu'un qui vient de
découvrir l'application ne fera pas. Le tien ne coûte rien à personne : le
catalogue est déjà dans le navigateur du lecteur, l'ouvrir trois jours ne
consomme aucune ressource et n'appelle aucun serveur.

L'essai se prend **une fois par navigateur**. Quelqu'un qui efface ses données
peut le reprendre : c'est le prix de n'avoir aucun compte lecteur, et il est
dérisoire.

La durée se règle dans la console, onglet *6 · Publication* → « Le paiement ».
`0` l'éteint.

## Installer l'application — et ce que Polar n'a rien à voir là-dedans

Tu m'as demandé si Polar gère l'installation sur mobile et sur ordinateur.
**Non, et personne d'autre non plus : c'est le navigateur qui installe.**

Ton produit est une *PWA* — une page web que le navigateur sait poser sur
l'écran d'accueil comme une application. Il n'y a ni App Store, ni Play Store,
ni téléchargement, ni compte. C'est une force : rien à faire valider par
personne, et une mise à jour est en ligne en une minute.

Le geste diffère selon l'appareil, et c'est la seule difficulté :

| appareil | le geste |
|---|---|
| **iPhone / iPad** | Safari → le bouton *Partager* → *Sur l'écran d'accueil* |
| **Android** | Chrome propose *Installer* tout seul, ou menu → *Installer l'application* |
| **Ordinateur** | Chrome ou Edge : l'icône d'installation dans la barre d'adresse |

La 8.20 ajoute **un bouton « Installer sur cet appareil » dans le menu**, qui
affiche la marche à suivre de *cet* appareil-là. Et il est proposé **juste
après le paiement**, sur l'écran qui montre la clé : c'est le meilleur moment
du parcours, et la plupart des produits le ratent.

**Combien d'appareils ?** Celui que tu règles dans Polar — bénéfice *License
Keys*, champ *Limit activations*. Trois est un bon chiffre : un téléphone, une
tablette, un ordinateur. Chaque appareil consomme une activation à la première
utilisation de la clé ; au-delà, Polar refuse, et le lecteur libère un appareil
depuis son espace client, tout seul, sans t'écrire.

Mets **le même nombre** dans la console : celui-là ne sert qu'au message
affiché au lecteur, et un message qui ment sur une limite est pire que pas de
message du tout.

## Le comportement exact que je vais coder

- La clé et sa date d'expiration sont gardées dans le navigateur.
- **Revérification tous les 7 jours.** Entre deux, l'application ne demande
  rien au réseau — elle marche hors ligne, comme aujourd'hui.
- Réponse « révoquée » ou « expirée » → retour au gratuit, avec un message
  qui explique, pas un simple verrouillage.
- **Une panne de réseau ne verrouille jamais.** Si le vérificateur ne répond
  pas, l'accès est gardé et on redemandera au prochain lancement. On ne punit
  jamais un client qui a payé parce que son Wi-Fi est mauvais. Seule une
  réponse claire — révoquée, expirée, inconnue — referme. Une **date
  d'expiration passée**, elle, referme sans réseau : c'est un calendrier, pas
  un jugement.
- `?pro=1` disparaît du produit livré et devient `?essai=…` avec un mot que
  tu choisis dans `consignes/paiement.txt` — tu gardes ton essai, les
  curieux ne l'ont plus.

## Ce que tu auras à faire, toi

Dans **Polar** :

1. Créer trois produits (mensuel, annuel, à vie) avec tes prix.
2. Créer un bénéfice *License Keys*, préfixe au choix, et l'attacher aux trois.
3. Créer trois *Checkout Links*, un par produit, avec comme adresse de retour
   `https://entrefilet.com/api/retour?checkout_id={CHECKOUT_ID}`.
4. Créer un *Organization Access Token* avec les droits `checkouts:read`,
   `license_keys:read` et `customer_sessions:write`.

Dans **Cloudflare** :

5. *Workers & Pages* → *Create* → *Worker* → coller le fichier que je livre.
6. Dans les réglages du Worker : *Variables and Secrets* → ajouter
   `POLAR_TOKEN` (le jeton de l'étape 4, en **Secret**) et `POLAR_ORG`
   (ton identifiant d'organisation, en variable simple).
7. *Routes* → `entrefilet.com/api/*`.

Dans le **dépôt** :

8. Créer `consignes/paiement.txt` à partir de l'exemple livré, y coller tes
   trois liens de paiement et l'adresse du Worker.
9. Lancer *Entretien → reconstruire*.

**À aucun moment tu ne me colles un jeton.** Le jeton Polar va dans les
secrets Cloudflare, exactement comme `ANTHROPIC_API_KEY` va dans les secrets
GitHub.

---

# 5 · LE BLOG — LA STRATÉGIE SEO

## L'idée

Une page web publique par fiche **déjà en ligne**, à l'adresse
`entrefilet.com/histoires/le-signal-wow/`, avec le texte entier, l'image, la
source, et un lien vers l'application. Aujourd'hui : 269 pages possibles.

Tu as choisi **une fiche par jour**. Je respecte ce choix, mais je te dois
l'honnêteté d'une nuance.

**Le compromis, en clair.** Publier une page par jour donne à Google un signal
de fraîcheur régulier, ce qui est bon. Mais 269 pages à une par jour, c'est
**neuf mois** avant que ton corpus entier soit indexé, et le référencement
d'un site neuf met déjà trois à six mois à démarrer. Tu partirais donc en
retard sur ton propre contenu.

**Ce que je te propose** — et c'est réglable dans un fichier, tu changeras
d'avis quand tu voudras :

```
demarrage: 40      # 40 pages publiées le premier jour, pour exister
rythme: 1          # puis une par jour
```

Quarante pages d'un coup, c'est assez pour que Google comprenne de quoi parle
le site, et assez peu pour ne pas ressembler à un dépotoir généré. Ensuite une
par jour, tous les jours, pendant sept mois.

## Ce que chaque page contiendra

Ce n'est pas de la décoration : chacun de ces éléments correspond à une chose
que Google lit.

- **Titre de l'onglet** = ta phrase d'accroche (le champ `r`). C'est ta plus
  grande force SEO et tu ne le sais peut-être pas. Regarde celle du signal
  Wow : *« En 1977, un radiotélescope de l'Ohio a capté pendant exactement
  72 secondes un signal radio trente fois plus fort que le bruit de fond… »*.
  C'est mot pour mot une requête de longue traîne. Tes 1 152 accroches sont
  1 152 requêtes.
- **`<h1>`** = le titre de la fiche (`t`), qui est court et intrigant.
- Le texte entier, en vrai HTML : `<h2>`, paragraphes, gras — pas un bloc.
- **Données structurées** `Article` (JSON-LD) : titre, date, image, auteur,
  éditeur. C'est ce qui donne les vignettes dans les résultats.
- **`<link rel="canonical">`** vers elle-même. Indispensable : sans ça,
  `?utm_source=instagram` crée un doublon aux yeux de Google.
- **Cartes de partage** (Open Graph + Twitter) : c'est l'aperçu quand tu
  colles le lien sur Instagram, WhatsApp ou Discord. Sans elles, tes partages
  n'ont pas d'image.
- **L'image**, servie depuis Wikimedia, avec **le crédit et la licence**
  (voir l'avertissement plus bas).
- **La source Wikipédia**, en lien, nommée.
- **Trois fiches voisines** du même univers, en lien. Le maillage interne est
  la moitié du référencement d'un site de contenu.
- **Un appel à l'application**, discret, en bas.

Et à côté des pages : `sitemap.xml`, `robots.txt`, un flux **RSS**, et huit
pages d'univers (`/histoires/cosmos/`) qui listent leurs fiches. Ces
huit pages-là sont ce que Google appelle des *pages piliers* : ce sont elles
qui se classent sur les requêtes larges.

## Un avertissement que je dois te donner : les images

Tes fiches stockent l'image comme une simple adresse
(`upload.wikimedia.org/…`). **Elles ne stockent ni l'auteur, ni la licence.**

Or les images de Wikimedia Commons ne sont pas libres de droits : elles sont
sous licence — CC BY, CC BY-SA, parfois domaine public — et la plupart
**exigent la mention de l'auteur et de la licence**. Tant que l'image
n'apparaissait que dans une application non vendue, le risque était
théorique. À partir du moment où tu vends, où tu publies un blog indexé et où
tu postes sur Instagram, il devient réel — et une réclamation d'ayant droit
sur une photo se règle en centaines d'euros.

**Ce que je propose**, dans le zip du blog :

1. La moisson enregistre, pour chaque image, l'auteur, la licence et le lien
   vers la page de description (l'API de Wikipédia le donne en une requête,
   champ `extmetadata`). Je ne peux pas le tester : Wikipédia est injoignable
   depuis mon bac à sable. Tu le vérifieras sur une moisson de dix sujets.
2. Le blog affiche le crédit sous chaque image.
3. **Pour les réseaux sociaux, l'atelier n'utilise l'image que si la licence
   est connue et compatible**, et retombe sinon sur une mise en page purement
   typographique — qui, soit dit en passant, marche souvent mieux sur
   Instagram.

Pour ton **texte**, en revanche, tu es tranquille : les faits ne sont pas
protégés, et tes fiches sont des textes originaux écrits à partir de ces
faits. Cite Wikipédia comme source par honnêteté et pour le SEO, pas par
obligation.

## Ce qu'il faudra faire à la main (une fois)

- **Google Search Console** : ajouter le domaine, prouver que c'est le tien
  (Cloudflare le fait en un clic via DNS), déposer `sitemap.xml`.
- **Bing Webmaster Tools** : même chose, ça prend trois minutes et Bing
  alimente aussi ChatGPT.
- Attendre. Trois mois avant les premiers signes, six avant que ça compte.
  Il n'y a pas de raccourci et méfie-toi de qui t'en vend un.

---

# 6 · SE FAIRE CONNAÎTRE — LE PLAN COMPLET

Tu m'as demandé le meilleur plan, pas seulement le SEO et les réseaux. Le
voici, classé par ce que ça rapporte divisé par ce que ça coûte. Les deux
premiers valent tous les autres réunis.

## Rang 1 — le référencement, mais pas seulement des fiches

Le blog par fiche est en place. Il lui manque deux choses, et ce sont elles
qui font la différence.

**Les pages de listes.** Une fiche répond à une question très précise (« le
signal Wow »). Personne ne tape ça sans déjà le connaître. Ce que les gens
tapent, c'est *« anecdotes insolites espace »*, *« faits étonnants histoire »*,
*« le saviez-vous science »* — des requêtes à gros volume auxquelles une fiche
seule ne peut pas répondre.

La réponse, c'est une page qui rassemble **vingt fiches** sur un thème, avec
leurs accroches, et qui renvoie vers chacune. Elle capte la requête large et
distribue son trafic vers vingt pages de détail. C'est le mécanisme central du
référencement d'un site de contenu, et tu as déjà tout le matériau : 1 152
accroches classées en huit univers et notées de 0 à 10.

Trente à quarante pages de listes, générées automatiquement à partir de ton
catalogue. C'est le prochain zip.

**Google Discover.** C'est le canal le plus puissant en France pour ce type de
contenu — le fil d'articles suggérés sur les téléphones Android et dans
l'application Google. Il envoie des pics de dizaines de milliers de visites, et
il adore exactement ton format : un fait surprenant, un titre clair, une image.

Il demande une **grande image** (1 200 px de large minimum) et l'autorisation
de l'afficher en grand. Or on vient d'éteindre les photos de Wikimedia, pour
de bonnes raisons.

La sortie est élégante : **l'atelier fabrique déjà des visuels typographiques
1080 × 1350 à partir de tes propres textes.** Ces images-là sont les tiennes,
sans aucun ayant droit, et elles sont belles. On en génère une par fiche, on la
pose sur la page, et Discover a ce qu'il attend. Zéro risque juridique, et une
identité visuelle cohérente d'un bout à l'autre. C'est aussi le prochain zip.

**Search Console et Bing**, une fois, cinq minutes. Bing alimente aussi
ChatGPT — ce qui n'est plus anecdotique.

## Rang 2 — une lettre quotidienne

C'est ma recommandation la plus forte, et celle à laquelle tu ne penses
peut-être pas.

Ton produit est **une anecdote par jour**. C'est très exactement le format
d'une lettre d'information. Et une liste d'adresses est le seul public que tu
**possèdes** : Instagram peut changer son algorithme demain et diviser ta
portée par dix, Google peut te déclasser, mais une liste de 3 000 adresses
reste une liste de 3 000 adresses.

Le mécanisme : une anecdote par jour, gratuite, par courriel. En bas, une
ligne : *« les 1 152 autres sont dans l'application »*. Les gens qui lisent
tous les jours finissent par vouloir choisir eux-mêmes quoi lire — c'est
exactement ce que l'abonnement vend.

**Substack** est le choix évident au démarrage : gratuit, aucune installation,
et surtout il a son propre réseau de recommandations entre lettres — c'est un
canal d'acquisition en soi, pas seulement un outil d'envoi. Ton flux RSS
(`/histoires/rss.xml`) peut l'alimenter automatiquement.

Compte trois mois pour les mille premiers inscrits, et un taux de passage à
l'abonnement de 1 à 3 % — sur 3 000 inscrits, cela fait 30 à 90 abonnés.

## Rang 3 — Pinterest

Très sous-estimé, et particulièrement adapté ici.

Une publication Instagram vit **vingt-quatre heures**. Une épingle Pinterest
envoie du trafic pendant **deux ans**. Le public français y est nombreux, et
« le saviez-vous » y marche très bien.

**C'est fait.** Depuis la 8.21, l'atelier fabrique une sixième planche :
l'épingle en **1000 × 1500**, le format 2:3 — le seul que Pinterest affiche en
entier. Elle porte l'adresse du site en bas, parce qu'une épingle republiée par
quelqu'un d'autre perd son lien mais pas ce qui est écrit dessus.

Et une **description d'épingle** séparée de la légende Instagram, parce que ce
ne sont pas les mêmes règles : Pinterest est un moteur de recherche déguisé en
tableau d'images. Ce qui compte est la phrase et les mots qu'on cherche, pas
les mots-dièse. Elle porte le lien vers la page publique de la fiche.

**La marche à suivre**, une fois le compte ouvert :

1. Un compte **professionnel** Pinterest (gratuit, deux minutes) — il donne les
   statistiques, et l'épinglage enrichi.
2. **Un tableau par univers** : Cosmos, Le Vivant, Histoire oubliée… Pinterest
   classe par tableau, et un tableau thématique se référence bien mieux qu'un
   fourre-tout.
3. **Dix épingles par semaine**, déposées d'un coup. Elles se diffusent toutes
   seules pendant des mois — c'est le seul réseau où publier à la main n'est
   pas une corvée quotidienne.
4. Ne republie pas la même image deux fois : Pinterest le voit et l'étouffe.
   L'atelier en fabrique une différente par fiche, tu en as 1 152.

Compte trois mois avant les premiers résultats, comme pour le référencement —
c'est le même mécanisme, et c'est pour ça que ça dure.

## Rang 4 — le partage entre lecteurs

Il était **cassé**, et je viens de le réparer.

Le bouton « partager » envoyait l'adresse de l'application. Celui qui recevait
le lien tombait sur le flux du jour, pas sur l'anecdote dont on venait de lui
parler — et il n'avait aucune raison de rester. Depuis la 8.20, le partage
envoie **la page publique de cette anecdote-là**, avec son accroche : une page
lisible sans rien installer, indexée, et qui porte un bouton « ouvrir
l'application ».

C'est le canal le moins cher qui existe, et il ne demande aucun travail : il
suffisait qu'il fonctionne.

## Rang 5 — Instagram et TikTok, à la main

Tu as un compte creator et rien du côté développeur. **Ne fais rien de ce
côté-là pour l'instant** : la déclaration chez Meta, la revue avec vidéo de
démonstration et le jeton à renouveler tous les soixante jours ne se justifient
pas avant d'avoir un compte qui marche.

L'atelier fabrique les visuels et la légende ; tu télécharges et tu publies.
Deux minutes par jour. Les trois premiers mois d'un compte se jouent de toute
façon sur ce qu'on apprend en publiant à la main : quel format arrête le pouce,
quel univers accroche, quelle heure. Le jour où tu le sauras, l'automatiser
prendra une journée — et tes images seront déjà à une adresse publique, ce que
l'API de Meta exige.

Sur **TikTok**, une application non auditée ne peut publier qu'en privé ou en
brouillon. Même conclusion, en plus net.

## Rang 6 — Reddit et les forums, sans lien

`r/france`, `r/AskFrance`, les forums d'histoire et de sciences. La règle
absolue : **poste l'anecdote, pas le lien.** Un lien dans un premier message
est supprimé et le compte marqué. Le nom du site dans la signature suffit ; les
curieux cherchent.

C'est lent, ça ne se mesure pas, et ça construit la seule chose que le
référencement ne donne pas : des gens qui connaissent le nom.

## Ce que je ne recommande pas

- **La publicité payante** avant d'avoir un taux de conversion mesuré. Tu
  paierais pour découvrir ce qu'un mois de trafic gratuit t'apprendra.
- **Les échanges de liens et les annuaires.** Google les a neutralisés il y a
  quinze ans, et certains sont pénalisés.
- **Publier les 1 152 fiches d'un coup** sur le blog. Google se méfie d'un site
  neuf qui sort mille pages en un jour — et tu vides ton abonnement.

## L'ordre, sur six mois

| quand | quoi |
|---|---|
| mois 1 | domaine, Cloudflare, paiement. Le blog allumé, 40 pages. |
| mois 1 | Search Console, Bing. La lettre ouverte, une anecdote par jour. |
| mois 2 | les pages de listes. Pinterest, dix épingles par semaine. |
| mois 2 | Instagram à la main, une publication par jour, depuis l'atelier. |
| mois 3 | premiers résultats de référencement. On regarde ce qui remonte. |
| mois 4 | on double ce qui marche, on arrête ce qui ne marche pas. |
| mois 6 | si Instagram a pris : demande d'autorisation Meta. |

Un chiffre pour fixer les idées : un blog de 300 pages bien faites, en
français, sur un sujet grand public, atteint couramment **5 000 à 20 000
visites par mois au bout d'un an**. À 1 % de conversion et 4,99 €, cela fait
250 à 1 000 € par mois. Ce n'est ni une fortune ni rien.

# 7 · L'ATELIER — LE TABLEAU DE BORD

Une page à part, `atelier.html`, **jamais mêlée à la console**. La console
gère le catalogue et les fiches ; l'atelier gère la diffusion. Ce sont deux
métiers, et tu as déjà écrit dans tes propres règles qu'un onglet n'empiète
jamais sur le métier d'un autre.

Elle se connecte avec le même jeton GitHub, gardé dans le même endroit du
navigateur — tu le saisis une fois pour les deux pages.

| onglet | ce qu'on y voit | ce qu'on y fait |
|---|---|---|
| **1 · Aujourd'hui** | la fiche du jour au blog, les visuels du jour | télécharger, copier la légende, marquer « publié » |
| **2 · Blog** | les 269 fiches en ligne et leur état (publiée au blog / programmée / pas encore) | avancer une fiche, en retirer une, changer le rythme |
| **3 · Visuels** | l'aperçu en direct, fiche par fiche | choisir la mise en page, retoucher la phrase, télécharger le carrousel ou la story |
| **4 · Légendes** | le texte prêt à coller | modifier, copier |
| **5 · File** | le calendrier des sept prochains jours | réordonner, sauter un jour |
| **6 · Mesures** | ce qui est publié, où, depuis quand | rien, c'est une lecture |

L'aperçu est un vrai rendu, pas une approximation : la page d'aperçu **est**
la page que Playwright photographiera. Ce que tu vois est ce qui sortira.

---

# 8 · CE QUE ÇA COÛTE

| poste | par an | remarque |
|---|---|---|
| domaine `.com` chez Cloudflare | ~10 € | au prix coûtant, pas de hausse au renouvellement |
| domaine `.fr` (optionnel) | ~8 € | à prendre en même temps |
| Cloudflare Pages | **0 €** | requêtes et bande passante illimitées |
| Cloudflare Access | **0 €** | jusqu'à 50 personnes |
| Cloudflare Workers | **0 €** | 100 000 requêtes par jour |
| GitHub, dépôt privé | **0 €** | 2 000 minutes d'Actions par mois |
| Polar | **0 €** | prélevé sur les ventes uniquement |
| écriture des fiches | selon toi | 0,0177 $ la fiche en Sonnet |
| **total fixe** | **~18 €/an** | |

Ce qui coûtera vraiment, c'est ton temps. Compte, en jours de travail à toi :
une demi-journée pour Cloudflare et le domaine, une demi-journée pour Polar,
et deux minutes par jour pour les réseaux.

---

# 9 · L'ORDRE, ET CE QUE JE LIVRE

Fais-les dans cet ordre. Chaque étape suppose la précédente.

**Le code est livré.** Le zip **8.19.0** contient tout : le paiement, le blog
et l'atelier. C'est le seul à importer — les 8.17 et 8.18 sont dedans.

Tout ce qui est neuf part **éteint**. Tant que tu n'as pas écrit
`consignes/paiement.txt` et `consignes/blog.txt`, le produit se comporte
exactement comme aujourd'hui. Tu allumes quand tu es prêt, dans cet ordre :

| # | ce que tu fais | où |
|---|---|---|
| **0** | choisir le nom, acheter le domaine | Cloudflare Registrar |
| **1** | importer le zip 8.19.0, lancer *Entretien → reconstruire* puis *→ servir* | GitHub |
| **2** | compte Cloudflare, domaine, projet Pages, domaine sur mesure | Cloudflare |
| **3** | Access sur `/console.html`, `/catalogue.html`, `/atelier.html`, `/anecdotes/*` | Cloudflare |
| **4** | régler le nom et le logo | console, *6 · Publication* |
| **5** | Polar : trois produits, le bénéfice *License Keys*, trois liens, un jeton | Polar |
| **6** | coller le Worker, ses trois secrets, sa route | Cloudflare |
| **7** | écrire `consignes/paiement.txt`, *Entretien → reconstruire* | GitHub |
| **8** | **vérifier un achat de bout en bout** dans le bac à sable de Polar | Polar |
| **9** | passer le dépôt en privé, éteindre GitHub Pages | GitHub |
| **10** | *Entretien → credits* (les crédits d'images), puis *→ reetaler* | GitHub |
| **11** | écrire `consignes/blog.txt` avec `actif: oui`, *Entretien → blog* | GitHub |
| **12** | déposer `sitemap.xml` dans Search Console et Bing | Google, Bing |
| **13** | ouvrir la lettre quotidienne (Substack), alimentée par le RSS | Substack |
| **14** | Pinterest : dix épingles par semaine, depuis l'atelier | Pinterest |
| **15** | Instagram à la main, deux minutes par jour | `atelier.html` |
| **16** | les pages de listes et les images de couverture — **zip 8.21.0** | — |
| **17** | si Instagram a pris : demander l'autorisation Meta | Meta |

**Ne saute pas l'étape 8.** Un paiement qui marche à moitié, on ne s'en aperçoit
qu'au premier vrai client, et c'est le pire moment.

**Sur le nom** : ne fais pas les étapes 1 à 6 avant d'avoir tranché. Changer
de domaine après avoir vendu, c'est réémettre les liens de paiement, refaire
les redirections et perdre le référencement acquis.

---

*Dis-moi le nom que tu retiens, et je grave la marque partout — nom, logo,
manifeste, métadonnées du blog, visuels de l'atelier.*
