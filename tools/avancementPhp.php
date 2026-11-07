<?php
/**
 * LE MIROIR, MIS À L'ÉPREUVE.
 *
 * `api/lib/projections.php` promet de calculer l'avancement avec exactement les
 * mêmes règles que `js/core/avancement.js`. Une promesse écrite en commentaire
 * ne tient pas : les deux fichiers se modifient à des mois d'intervalle, et le
 * jour où ils divergent, le professeur lit « étape 3 sur 5 » dans Le direct
 * pendant que l'élève lit autre chose sur son propre écran, à la même seconde.
 * Personne ne sait alors lequel croire — et c'est ainsi qu'on cesse de croire
 * un tableau de bord.
 *
 * Cet outil lit une liste d'événements sur l'entrée standard et rend
 * l'avancement en JSON. `tests/avancement.miroir.test.mjs` lui donne les mêmes
 * événements qu'au module JS et compare les deux réponses.
 *
 * Il ne sert qu'aux essais : il n'est pas dans le paquet déposé.
 */

require_once __DIR__ . '/../api/lib/projections.php';

$brut = stream_get_contents(STDIN);
$entree = json_decode($brut, true);
if (!is_array($entree)) {
    fwrite(STDERR, "entrée illisible\n");
    exit(1);
}

$runs = runsOf($entree['events'] ?? []);
$av = avancementDeRun($runs[0] ?? null, $entree['maintenant'] ?? null);

echo json_encode($av, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
