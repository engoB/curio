#!/bin/sh
# =============================================================================
#  Recompose app.html et index.html depuis parts/, puis grave dans sw.js
#  l'empreinte reelle des deux fichiers produits.
#
#  Cette derniere etape n'est pas cosmetique : sans elle, le service worker
#  garde le meme nom de cache d'une version a l'autre et les gens qui ont
#  deja ouvert le site continuent d'executer l'ancienne application.
# =============================================================================
set -e
cd "$(dirname "$0")"
mkdir -p build

# --- numero de version -------------------------------------------------------
# VERSION contient la version lisible (7.1.0). L'empreinte du contenu s'y
# ajoute a la construction. Ce numero est grave dans les deux pages, dans le
# service worker et dans version.json : quand vous ouvrez le site, vous savez
# exactement quelle version tourne — c'est ce qui manquait le plus.
LISIBLE=$(cat VERSION 2>/dev/null | tr -d '[:space:]')
[ -n "$LISIBLE" ] || LISIBLE="0.0.0"

# --- les reglages du lecteur, graves dans la page ---------------------------
# « langues » et « images » vivent dans consignes/publication.txt. Les outils
# les recopient dans anecdotes/index.json, mais ce fichier n'existe qu'apres
# une action, et une page servie sans lui gardait l'ancien reglage : c'est
# ainsi que le bouton FR/EN a survecu a sa mise a l'arret.
#
# On les grave donc AUSSI dans la page, a la construction. La page connait le
# reglage des la premiere seconde, sans reseau ; index.json, quand il arrive,
# garde le dernier mot — les deux viennent du meme fichier.
reglage() {
  sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" consignes/publication.txt 2>/dev/null \
    | head -1 | tr -d '[:space:]'
}
# --- le nom du produit ------------------------------------------------------
# Il vit dans consignes/marque.txt, et nulle part ailleurs. Les sources
# portent le jeton __MARQUE__ ; la construction le remplace partout ou le
# lecteur peut le lire. Les cles de memoire du navigateur, les noms de
# fichiers et le cache du service worker gardent « curio » : changer de nom
# ne doit deconnecter personne de sa collection.
marque() {
  sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" consignes/marque.txt 2>/dev/null | head -1 \
    | sed 's/[[:space:]]*$//'
}
NOM=$(marque nom);            [ -n "$NOM" ] || NOM="Curio"
BASELINE=$(marque baseline)
LANGUES=$(reglage langues); [ -n "$LANGUES" ] || LANGUES="fr,en"
IMAGES=$(reglage images);   [ -n "$IMAGES" ]   || IMAGES="oui"

# Le bouton FR/EN, quand une seule langue est publiee.
#
# Il a resiste a deux corrections successives : masque par le code, il etait
# remis par une regle d'auteur (display:inline-flex l'emporte sur le
# display:none par defaut de [hidden]) ; puis corrige dans la feuille, il
# restait affiche chez qui avait deja ouvert le site. On ne discute plus : si
# une seule langue est publiee, la page part avec le bouton eteint, dans son
# en-tete, avant toute feuille de style et sans une ligne de JavaScript. Il n y
# a plus rien qui puisse le rallumer.
case "$LANGUES" in
  *,*) CACHE_LANGUE="" ;;
  *)   CACHE_LANGUE='<style>#langBtn,#ligneLangue{display:none !important}</style>' ;;
esac

doc_head() {
cat <<EOF
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#050E24" />
<meta name="curio-version" content="$PLEINE" />
<meta name="curio-langues" content="$LANGUES" />
<meta name="curio-images" content="$IMAGES" />
$CACHE_LANGUE
EOF
}

# L'empreinte porte sur les SOURCES seules — jamais sur app.html, index.html
# ni sw.js, ou elle est elle-meme inscrite : elle changerait alors a chaque
# construction, et le service worker se croirait perime a chaque fois.
SRC="parts VERSION manifest.source.webmanifest consignes/marque.txt"
if command -v sha1sum >/dev/null 2>&1; then
  EMPREINTE=$(find $SRC -type f | sort | xargs cat | sha1sum | cut -c1-10)
elif command -v shasum >/dev/null 2>&1; then
  EMPREINTE=$(find $SRC -type f | sort | xargs cat | shasum | cut -c1-10)
else
  EMPREINTE=$(date -u +%Y%m%d%H%M%S)
fi
PLEINE="$LISIBLE+$EMPREINTE"

# --- le manifeste d'installation porte le nom du produit ---
sed "s/__MARQUE__/$NOM/g" manifest.source.webmanifest > manifest.webmanifest

# --- application ---
{ doc_head; cat parts/00-head.html; echo "</head>"; echo "<body>"; \
  cat parts/10-body.html parts/20-data.js parts/30-app.js; echo "</body>"; echo "</html>"; } \
  | sed "s/__MARQUE__/$NOM/g" > app.html

# --- site vitrine ---
{ doc_head; cat parts/L0-head.html; echo "</head>"; echo "<body>"; \
  cat parts/L1-body.html parts/L2-app.js; echo "</body>"; echo "</html>"; } \
  | sed "s/__MARQUE__/$NOM/g" > index.html

# --- versions Artifact (sans squelette de document) ---
cat parts/00-head.html parts/10-body.html parts/20-data.js parts/30-app.js \
  | sed "s/__MARQUE__/$NOM/g" > build/curio-app.artifact.html
cat parts/L0-head.html parts/L1-body.html parts/L2-app.js \
  | sed "s/__MARQUE__/$NOM/g" > build/curio-site.artifact.html


# --- version du service worker ----------------------------------------------
# Le nom du cache doit changer des que le contenu change, sinon activate() ne
# nettoie rien et le navigateur reste sur l'ancienne coquille.
SWV="curio-$PLEINE"

# On reecrit la seule ligne marquee /* BUILD:VERSION */ ; le reste est intact.
awk -v v="$SWV" '
  /\/\* BUILD:VERSION \*\//{ print "const VERSION = \x27" v "\x27;   /* BUILD:VERSION */"; next }
  { print }
' sw.js > sw.js.tmp && mv sw.js.tmp sw.js

# --- version.json : lu par l'action pour afficher la version dans son rapport
printf '{"version":"%s","build":"%s","date":"%s"}\n' \
  "$LISIBLE" "$EMPREINTE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > version.json

echo "Curio $PLEINE — app.html, index.html, version.json, service worker"
