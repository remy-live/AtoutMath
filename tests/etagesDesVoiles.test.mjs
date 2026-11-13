// CE QUI S'OUVRE PAR-DESSUS L'EXERCICE DOIT PASSER DEVANT LUI.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « le plateau ne s'est lancé que sur qqs élèves ». Puis,
// interrogé sur ce que faisaient les autres : « Ils étaient en plein exercices
// dans la salle informatique chacun ayant un ordi ».
//
// C'ÉTAIT TOUT. À z-index 9000, le voile du plateau passait DERRIÈRE
// `#game-layer` (10000). L'élève en exercice recevait la partie, la
// rejoignait, son rond bougeait sur le terrain des autres — et il voyait son
// exercice. Ceux qui n'étaient pas dans un exercice la voyaient.
//
// ── C'EST LA DEUXIÈME FOIS, ET LA PREMIÈRE EST ÉCRITE DANS LE CSS ─────────
//
// Le commentaire de `.defi-voile` porte déjà la leçon, mot pour mot : « le
// sélecteur répondait il est là, le compteur montait, les contrôles étaient
// tous verts — et l'élève voyait son exercice. C'est la famille de défauts la
// plus chère du dépôt : tout fonctionne, rien ne se voit. » La correction
// d'alors n'a monté QU'UN des quatre voiles. Celui-ci est le filet qui
// couvre les quatre.
//
// ── CE QUE CETTE ÉPREUVE NE PEUT PAS DIRE ─────────────────────────────────
//
// Qu'un voile se VOIT. Un `z-index` plus grand ne gagne qu'entre frères : un
// parent qui crée un contexte d'empilement enferme tout ce qu'il contient, et
// aucune lecture de CSS ne le dira. C'est `tools/plateauSurTousLesEcrans.mjs`
// qui le mesure, en demandant à `elementFromPoint` QUI répond au centre de
// l'écran — et c'est la seule mesure qui distingue « monté » de « vu ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/** Le `z-index` déclaré par une règle, lue par son sélecteur exact. */
function etageDe(css, selecteur) {
    const i = css.indexOf(`\n${selecteur} {`);
    assert.notEqual(i, -1, `la règle « ${selecteur} » a disparu`);
    const corps = css.slice(i, css.indexOf('}', i));
    const m = /z-index:\s*(\d+)/.exec(corps);
    assert.ok(m, `« ${selecteur} » ne déclare plus d'étage`);
    return Number(m[1]);
}

test('TOUT CE QUI PREND L\'ÉCRAN PASSE DEVANT L\'EXERCICE', () => {
    const MODULES = lire('css/modules.css');
    const EXERCICE = etageDe(lire('css/layout.css'), '#game-layer');
    assert.ok(EXERCICE > 0, 'l’exercice n’a plus d’étage : le reste n’a plus de sens');
    // LES QUATRE VOILES QUI S'OUVRENT PAR-DESSUS CE QUE L'ÉLÈVE FAISAIT.
    // Chacun est lancé par le professeur, à un moment qu'il ne choisit pas —
    // donc, toujours, pendant que quelqu'un travaille.
    for (const voile of ['.pdn-voile', '.jv-voile', '.jdc-voile', '.defi-voile']) {
        assert.ok(etageDe(MODULES, voile) > EXERCICE,
            `« ${voile} » est à l’étage ${etageDe(MODULES, voile)}, sous l’exercice `
            + `(${EXERCICE}) : l’élève qui travaille ne le verra pas, et tout le reste `
            + 'paraîtra marcher');
    }
});

test('ET L\'ORDRE ENTRE EUX EST CELUI QUI A ÉTÉ DÉCIDÉ', () => {
    // L'ordre est écrit au-dessus de `.defi-voile` : le plateau et les jeux
    // vifs, puis le défi, puis la pause du professeur. Un professeur qui met
    // la classe en pause pendant une partie arrête tout le monde — et « tout
    // le monde » veut dire tout le monde, le plateau compris.
    const M = lire('css/modules.css');
    const jeu = etageDe(M, '.pdn-voile');
    assert.equal(etageDe(M, '.jv-voile'), jeu,
        'les jeux vifs et le plateau s’ouvrent de la même façon : même étage');
    // L'ANNONCE COUVRE LE TERRAIN QU'ELLE ANNONCE, et rien de plus.
    assert.ok(etageDe(M, '.jdc-voile') > jeu, 'l’annonce doit couvrir le terrain');
    assert.ok(etageDe(M, '.jdc-voile') < etageDe(M, '.defi-voile'),
        'et rester sous le défi');
    // LA PAUSE VIT DANS UN AUTRE FICHIER (`css/ui.css`) : elle n'est pas un
    // écran de jeu, c'est le geste par lequel le professeur reprend la classe.
    assert.ok(etageDe(M, '.defi-voile') < etageDe(lire('css/ui.css'), '.moment-pause'),
        'la pause du professeur gagne sur tout : « tout le monde s’arrête » '
        + 'veut dire tout le monde');
});
