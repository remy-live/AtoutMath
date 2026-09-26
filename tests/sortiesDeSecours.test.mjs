// TROIS EXERCICES OÙ L'ON POUVAIT RESTER COINCÉ.
//
// Rémy, sur « Code la figure » : « dans ce genre d'exercice on peut se
// retrouver bloqué, qu'en penses-tu ? » Puis, sur l'École du Tableur :
// « comment fonctionne la notation sur le tableur car il attend toujours la
// bonne réponse ».
//
// LES DEUX ONT LA MÊME FORME. Une validation refusée AVANT d'appeler le noyau
// ne consomme pas d'essai, ne montre pas de correction, n'avance pas. Tous les
// filets pendent à cet appel-là ; tant qu'on ne le fait pas, il n'y a
// simplement aucune sortie. En entraînement les indices finissent par sortir
// l'élève de là ; en ÉVALUATION la politique les coupe (`hints: false`), et il
// ne reste plus rien.
//
// Mesuré avant correction, dix appuis sur « Valider » sans rien coder : une
// seule figure servie, toujours la même. Après : trois figures, avec leur
// correction entre les deux.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const CODAGE = sansCommentaires(lire('js/core/activities/codage.js'));
const TABLEUR = sansCommentaires(lire('js/games/spreadsheet.js'));

test('CODER UNE FIGURE : LE SECOND REFUS COMPTE', async () => {
    // Le premier reste gratuit — une figure inachevée est une phrase
    // inachevée. Au second, l'exercice redevient un exercice.
    assert.match(CODAGE, /inacheve \+= 1;/);
    assert.match(CODAGE, /if \(inacheve < 2\) return;/);
    // Et le compteur repart à zéro avec la figure suivante : sinon la
    // deuxième figure n'aurait plus droit à son refus gratuit.
    assert.match(CODAGE, /inacheve = 0;/);
});

test('LE MESSAGE NOMME LES SEGMENTS NUS, MÊME QUAND ILS LE SONT TOUS', async () => {
    // Sur un losange avec ses diagonales, « chaque segment » veut dire HUIT
    // segments — les quatre côtés ET les quatre demi-diagonales. Rien ne le
    // disait, et c'est ce qui bloque : on code les côtés, on valide, on ne
    // comprend pas le refus.
    const { verifierCodage, construireFigure } = await import('../js/core/codage.js');
    const fig = construireFigure('losange', { p: 16, q: 12 });
    const ids = ['AB', 'BC', 'CD', 'DA', 'AO', 'OC', 'BO', 'OD'];
    const rien = verifierCodage(fig, { marques: {}, angles: {} }, ids);
    const manque = rien.problemes.find(p => p.genre === 'manque');
    assert.ok(manque, 'une figure vide doit signaler ce qui manque');
    ids.forEach(id => assert.match(manque.message, new RegExp(`\\[${id[0]}${id[1]}\\]`),
        `le segment ${id} n'est pas nommé : ${manque.message}`));
    // Et quand une partie est codée, il ne nomme que ce qui reste.
    const moitie = verifierCodage(fig,
        { marques: { AB: 1, BC: 1, CD: 1, DA: 1 }, angles: {} }, ids);
    const reste = moitie.problemes.find(p => p.genre === 'manque');
    assert.match(reste.message, /\[AO\]/);
    assert.ok(!/\[AB\]/.test(reste.message), 'un segment codé est encore réclamé');
});

test('LE TABLEUR : UNE CASE REFUSÉE SE RESÉLECTIONNE', async () => {
    // RÉMY, capture : `=A1+B1` avec A1 = 0 et B1 = 9 — la formule même de
    // l'exemple — et « Ta formule donne Erreur ». Mesuré : cette formule-là
    // donne bien 9, et soixante questions d'affilée n'ont produit aucune
    // « Erreur ». Ce qui la produit, au mot près : `=A1+B1=A1+B1` — la saisie
    // qu'on obtient en retapant par-dessus une formule refusée, puisque la
    // case gardait son texte et que le curseur se posait au bout.
    assert.match(TABLEUR, /inp\.focus\(\); inp\.select\(\);/);
    // Et le doublon s'explique au lieu de s'appeler « Erreur ».
    assert.match(TABLEUR, /val\.indexOf\('=', 1\) > 0/);
    assert.match(TABLEUR, /la formule est écrite deux fois/);
});

test('LE TABLEUR : TROIS REFUS SUR LA MÊME CASE, ON MONTRE ET L\'ON PASSE', () => {
    // La note est honnête — chaque refus est une question fausse — mais la
    // case ne se refermait jamais : un élève perdu accumulait les faux sans
    // plafond, et la séance ne pouvait plus finir (l'étape se clôt à
    // vingt-sept réussites).
    assert.match(TABLEUR, /this\.refus < 3/);
    assert.match(TABLEUR, /La formule attendue était \$\{modele\}/);
    // La formule attendue voyage avec la tâche : on ne la redevine pas depuis
    // la consigne au moment de la montrer.
    assert.match(TABLEUR, /modele: `=\$\{a\}\+\$\{b\}`/);
    assert.match(TABLEUR, /modele: `=\$\{fonction\}\(\$\{plage\}\)`/);
    // Et ce n'est PAS une réussite : rien ne l'ajoute au compte.
    const bloc = TABLEUR.slice(TABLEUR.indexOf('aiderEtPasser(inp, tache)'),
        TABLEUR.indexOf('aiderEtPasser(inp, tache)') + 700);
    assert.ok(!/miniVictoire|reussirSaisie/.test(bloc),
        'une formule donnée est comptée comme une réussite');
});

test('THALÈS : LA DÉMONSTRATION POSE SA FIGURE AVANT DE PARLER', () => {
    // Rémy : « thalès n'a pas d'aperçu ». `start()` appelle
    // `runDemoSequence()` À LA PLACE de `startGameLoop()` : en démonstration,
    // `poserDefi()` n'était jamais appelé. Mesuré : la vignette montait ONZE
    // nœuds — l'enveloppe et sa feuille de style — sans un seul `svg`. Après :
    // 57 nœuds et le dessin. Ce n'était pas que l'aperçu : la démonstration
    // plein écran expliquait elle aussi une figure absente.
    const thales = sansCommentaires(lire('js/games/thalesRedaction.js'));
    const i = thales.indexOf('async runDemoSequence()');
    assert.ok(i > 0, 'la séquence de démonstration a disparu');
    assert.match(thales.slice(i, i + 200), /if \(!this\.f\) this\.poserDefi\(\);/,
        'la démonstration ne pose toujours pas sa figure');
});
