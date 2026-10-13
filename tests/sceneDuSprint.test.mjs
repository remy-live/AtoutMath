// LA SCÈNE DU CONTRE-LA-MONTRE NE DÉBORDE PAS PAR LE HAUT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'iPhone du 13 octobre : il regarde un parcours depuis son
// aperçu, sur son téléphone. La jauge dorée du Sprint des Notations passe
// ENTRE les deux lignes de la question — « Quelle est la » au-dessus, « bonne
// écriture ? » en dessous.
//
// Reproduit à 390 × 440 : la barre TRANCHE les lettres de « Comment note-t-on »
// par le milieu, parce que la question sortait de sa scène par le haut de
// 32,6 px et que le fond de la jauge est opaque.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ÇA NE SE DEVINE PAS ───────────
//
// Un contenu CENTRÉ qui ne tient pas dans sa boîte déborde des DEUX côtés. Le
// haut passe alors sous ce qui le précède, et il n'est atteignable par aucun
// défilement — c'est le piège connu du centrage flex. Le mot-clé « safe »
// existe exactement pour lui : il abandonne le centrage plutôt que de faire
// sortir par le haut.
//
// Le danger est qu'il se retire SANS RIEN CASSER DE VISIBLE : sur un écran
// assez haut — celui de l'élève, celui du développeur — le résultat est
// identique au pixel près. MESURÉ : à 844 px, 102,4 px de marge au-dessus
// comme au-dessous, avec ou sans « safe ». Le défaut ne revient qu'à l'étroit.
//
// ── CE QU'ELLE NE REMPLACE PAS ────────────────────────────────────────────
//
// `tools/tmp/sprintPeuDeHauteur.mjs` ouvre l'exercice sur quatre hauteurs de
// fenêtre et dans les deux modes d'aperçu, et MESURE si la jauge croise la
// question. C'est lui qui a trouvé le défaut — en faisant varier la seule
// dimension que les trois mesures précédentes avaient laissée fixe.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle as aideCorps } from './aidesCss.mjs';

// L'AIDE VIT DANS `tests/aidesCss.mjs` : elle était écrite trois fois.
const CSS = lireFeuille('css/modules.css');
const corpsDeLaRegle = (selecteur) => aideCorps(CSS, selecteur, { ou: 'css/modules.css' });

test('LA SCÈNE DU SPRINT CENTRE « SAFE »', () => {
    const scene = corpsDeLaRegle('.sprint-scene');
    const centrage = (scene.match(/justify-content\s*:\s*([^;]+)/) || [])[1];
    assert.ok(centrage, '`.sprint-scene` ne déclare plus de `justify-content`.');
    assert.ok(/\bsafe\b/.test(centrage),
        'la scène du contre-la-montre centre sans « safe ».\n'
        + 'Quand la question ne tient pas, un contenu centré déborde des DEUX\n'
        + 'côtés : le haut passe sous la jauge, dont le fond est opaque, et la\n'
        + 'barre tranche les lettres de l\'énoncé (Rémy, capture du 13 octobre).\n'
        + 'Sur un grand écran le résultat est identique au pixel près : ce défaut\n'
        + 'ne se verra qu\'au téléphone, ou dans l\'aperçu du professeur.\n'
        + `      justify-content: ${centrage.trim()}`);
});

test('ET CE QUI DÉPASSE RESTE ATTEIGNABLE', () => {
    // « safe » ne crée pas de place : il déplace vers le bas les pixels qui
    // sortaient par le haut. À 390 × 440, le contenu dépasse de 160 px — les
    // quatre réponses passent en UNE colonne sous 420 px — et sans
    // défilement la dernière réponse deviendrait inatteignable. Les deux
    // déclarations ne valent que l'une par l'autre.
    const scene = corpsDeLaRegle('.sprint-scene');
    assert.ok(/overflow-y\s*:\s*auto/.test(scene),
        'la scène du contre-la-montre ne défile plus. Avec « safe center », ce\n'
        + 'qui ne tient pas sort désormais par le BAS, là où sont les réponses :\n'
        + 'mesuré à 390 × 440, 160 px de contenu en trop et la dernière réponse\n'
        + 'hors de la fenêtre.');
});
