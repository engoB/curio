# `ajouts.json` — vos sujets à vous, de n'importe quelle source

Ce fichier est **purement additif**. Ce qu'on y met entre au catalogue à la
moisson suivante ; rien de ce qui existe n'est touché, aucune fiche n'est
réécrite, aucun fichier n'est refait.

## Deux cas

### 1. Le sujet a un article Wikipédia

N'utilisez pas ce fichier : ajoutez une ligne à `consignes/sujets-phares.txt`.
C'est fait pour ça, c'est plus court, et le titre y est vérifié.

### 2. Le sujet n'a pas d'article — une histoire Reddit, un article de presse, vos notes

C'est ici. Donnez le texte de départ vous-même :

```json
[
  {
    "titre": "L'homme qui a vécu dix-huit ans dans un aéroport",
    "uni": "histoire",
    "phrase": "Il est entré à Roissy en 1988 avec des papiers volés. Il en est ressorti en 2006.",
    "url": "https://www.reddit.com/r/…",
    "texte": "Le récit complet, tel que vous l'avez trouvé. Trois cents caractères au minimum, sept mille au maximum. C'est CE texte que le rédacteur lira pour écrire l'anecdote — il n'ira rien chercher ailleurs. Donnez-lui les faits, les dates, les noms, les chiffres : il n'inventera rien."
  }
]
```

| champ | obligatoire | ce que c'est |
|---|---|---|
| `titre` | oui | le nom du sujet, tel qu'il apparaîtra |
| `uni` | oui | l'un des univers — voir `consignes/univers.txt` pour en ajouter |
| `texte` | oui | **le texte de départ**, au moins 300 caractères |
| `phrase` | conseillé | pourquoi c'est étonnant. S'affiche dans la console et sert d'angle |
| `url` | conseillé | la source, citée sur la fiche |
| `titreEn` | non | le titre anglais, si vous en voulez un différent |
| `id` | non | un identifiant à vous. Sinon il est dérivé du titre |

## Ce qui se passe ensuite

Le sujet apparaît dans la console avec le badge **MANUEL**, potentiel 10. Vous
le retenez comme les autres, l'écriture produit une fiche française et une
anglaise **à partir de votre texte**, et la suite est identique : contrôle,
relecture, publication.

## Un point important

Retirer une entrée d'ici ne retire pas le sujet du catalogue — il y est déjà
entré. Pour l'en sortir : la console, ou `consignes/exclusions.txt` puis
**Entretien → purger**.

## Pour un nouvel univers

Une ligne dans `consignes/univers.txt` :

```
reddit | 16 | Histoires vraies | Ce que les gens racontent quand ils croient que personne ne les lit.
```

et `"uni": "reddit"` devient valide ici. L'application découvre le nouvel
univers toute seule.
