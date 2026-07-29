#!/bin/bash
# Lanceur AtoutMath — double-cliquez ce fichier depuis le Finder.
#
# Il démarre le serveur local et ouvre l'application dans le navigateur.
# Aucun éditeur, aucune ligne de commande à taper.
#
# Pour arrêter : fermez la fenêtre du Terminal, ou faites Ctrl-C dedans.
#
# (Si le double-clic ne fait rien la première fois, c'est que le fichier n'est
#  pas exécutable : ouvrez le Terminal et tapez
#     chmod +x "$(dirname "$0")/AtoutMath.command"
#  Une seule fois, ensuite le double-clic suffit.)

cd "$(dirname "$0")" || exit 1

PORT=8090
# Si le port est déjà pris, on en essaie d'autres plutôt que d'échouer.
for candidate in 8090 8091 8092 8093; do
    if ! lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
        PORT=$candidate
        break
    fi
done

echo "──────────────────────────────────────────"
echo "  AtoutMath"
echo "  http://localhost:$PORT"
echo ""
echo "  Laissez cette fenêtre ouverte."
echo "  Pour arrêter : Ctrl-C, ou fermez la fenêtre."
echo "──────────────────────────────────────────"
echo ""

# On laisse au serveur le temps de répondre avant d'ouvrir le navigateur,
# sinon Safari affiche une erreur de connexion et ne réessaie pas.
( sleep 1 ; open "http://localhost:$PORT" ) &

exec python3 tools/serve.py "$PORT"
