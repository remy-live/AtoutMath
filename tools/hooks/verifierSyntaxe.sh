#!/bin/sh
# NODE --CHECK SUR TOUT FICHIER JAVASCRIPT QU'ON VIENT D'ÉCRIRE.
#
# LE PIÈGE DE L'ACCENT GRAVE A ÉTÉ PAYÉ SEPT FOIS DANS CE DÉPÔT. Un accent
# grave dans un commentaire CSS ou HTML, à l'intérieur d'un gabarit, FERME le
# gabarit — et le message d'erreur désigne alors une ligne sans rapport, parfois
# quarante lignes plus loin. Le `CLAUDE.md` le décrit en tête de sa section
# « pièges » depuis le 26 septembre, et il a été repris trois fois depuis.
#
# LE SAVOIR NE SUFFIT PAS : la main écrit l'accent grave toute seule. C'est donc
# le harnais qui doit vérifier, pas la mémoire. Une seconde ici contre le quart
# d'heure qu'on passe sinon à chercher au mauvais endroit.
#
# Il est branché en `PostToolUse` sur `Edit` et `Write` (voir
# `.claude/settings.json`). Il lit le JSON de l'outil sur son entrée standard,
# en tire le chemin du fichier, et ne dit RIEN quand tout va bien : un hook
# bavard finit par être ignoré.

fichier=$(sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

# Rien à faire pour ce qui n'est pas du JavaScript : le CSS et le HTML ne se
# vérifient pas avec `node --check`, et un hook qui se plaint d'un `.md` est
# du bruit.
case "$fichier" in
    *.js|*.mjs|*.cjs) ;;
    *) exit 0 ;;
esac

[ -f "$fichier" ] || exit 0

erreur=$(node --check "$fichier" 2>&1) && exit 0

# EXIT 2 REND LA MAIN À CLAUDE AVEC LE MESSAGE : c'est le seul code que le
# harnais relaie. On y met le diagnostic ET la piste, parce que le message de
# node, lui, désigne souvent la mauvaise ligne.
cat >&2 <<MSG
node --check refuse $fichier :

$erreur

SI CETTE LIGNE N'A RIEN À VOIR AVEC CE QUI VIENT D'ÊTRE ÉCRIT, chercher un
accent grave dans un commentaire à l'intérieur d'un gabarit : il ferme le
gabarit, et l'erreur se déclare bien plus loin. C'est arrivé sept fois ici.
MSG
exit 2
