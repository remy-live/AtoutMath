// L'ÉCRAN D'ACCUEIL D'UN ÉLÈVE NE SE RÉPÈTE PAS.
//
// Rémy, capture d'un élève arrivé par `?code=SDY-FGU` : le même nom de séance
// y était écrit TROIS FOIS en deux cents pixels — le fil en haut de la
// fenêtre, l'en-tête du jeu juste dessous, et la carte une troisième fois en
// violet — pendant qu'un bandeau posé par-dessus le tout le redisait une
// quatrième, avec la règle de la séance que la carte écrivait déjà.
//
// « Même le toast est redondant. »
//
// MESURÉ APRÈS CORRECTION, sur son code exactement : le nom est écrit deux
// fois — le fil et l'en-tête, qui existent sur TOUS les écrans du jeu —, il n'y
// a plus de bandeau, et la première ligne de la carte est la seule information
// qu'elle porte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

// ON LIT LE CODE, PAS SES COMMENTAIRES. Une suppression s'explique dans un
// commentaire — qui nomme donc ce qu'on vient de retirer. Un test qui cherche
// « describePolicy » dans le fichier entier trouverait la phrase qui dit
// pourquoi il n'y est plus.
const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const CODE_UI = sansCommentaires(lire('js/ui/studentCodeUI.js'));
const RUNNER_BRUT = lire('js/core/runner.js');
const RUNNER = sansCommentaires(RUNNER_BRUT);
const CSS = sansCommentaires(lire('css/modules.css'));

test('PAS DE BANDEAU POUR DIRE CE QUE L\'ÉCRAN SUIVANT VA DIRE', () => {
    // Il annonçait le nom du parcours — que la carte écrit dans la seconde —
    // et la règle de la séance, que cette même carte pose juste en dessous.
    // Cinq secondes de bandeau par-dessus l'écran qu'il recouvrait.
    assert.ok(!/showToast\(`Parcours/.test(CODE_UI),
        'le bandeau de confirmation est revenu');
    assert.ok(!/describePolicy/.test(CODE_UI),
        'la règle de la séance est redite au chargement du code');
    // L'AVERTISSEMENT RESTE : « 3 exercices de ce parcours n'existent plus »
    // n'est écrit nulle part ailleurs.
    assert.match(CODE_UI, /n'existent plus\.`, 'error'\)/);
});

test('LE NOM DE LA SÉANCE N\'EST PAS ÉCRIT TROIS FOIS', () => {
    // La copie de la carte est celle qu'on retire : les deux autres existent
    // sur tous les écrans du jeu, celle-ci sur celui-ci seulement.
    assert.ok(!/run-carte-nom/.test(RUNNER), 'la carte reprend le nom du parcours');
    assert.ok(!/\.run-carte-nom/.test(CSS), 'le style d\'un élément disparu reste');
    // L'en-tête, lui, continue de le porter : c'est lui qu'on garde.
    assert.match(RUNNER, /titreEl\.textContent = this\.path\.name \|\| 'Mon parcours'/);
    // Et la ligne qui reste prend le poids qu'avait le titre.
    assert.match(CSS, /\.run-carte-sous \{[^}]*font-weight: 600/);
});

test('UN TITRE QUI FINIT PAR « ? » NE REÇOIT PAS DE POINT', () => {
    // « Prochaine étape : Segment, Droite ou Demi-droite ?. » — vu à l'écran.
    assert.match(RUNNER, /\.replace\(\/\(\[\^\.!\?…\]\)\$\/, '\$1\.'\)/);
});
