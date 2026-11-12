// « J'AI EU TOUT BON ET IL DIT QUE J'AI EU FAUX ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'écran à l'appui : après avoir rangé UNE frise entière sans une
// erreur, « Tu as 1 bonne réponse, il en faut 4 » — et l'exercice en demandait
// cinq.
//
// ── LA CAUSE, ET POURQUOI ELLE EST PIÉGEUSE ────────────────────────────────
//
// `BaseGame.terminerPartie` fait DEUX choses : elle compte une réussite, et
// elle appelle `runner.partieTerminee`, qui CLÔT L'ÉTAPE. Elle porte en plus
// un garde-fou, `_partieClose`, qui l'empêche de compter deux fois.
//
// Elle convient donc aux jeux qui ont une VRAIE fin — un échec et mat, un
// plateau rempli. Elle ne convient pas à ceux dont l'unité se répète : un
// tableau de paires, une frise rangée. Ceux-là doivent compter une QUESTION
// PLEINE (`onCorrectAnswer` sans `partiel`) et laisser le runner compter les
// manches, comme le fait déjà le Pousseur — « il prépare l'entrepôt suivant
// deux secondes après la victoire ».
//
// ── CE QUE CETTE ÉPREUVE PEUT, ET CE QU'ELLE NE PEUT PAS ───────────────────
//
// Elle LIT LE CODE. Elle ne joue pas : ces jeux ont besoin d'un navigateur, et
// le compte d'une séance se mesure dans le bandeau. C'est le rôle de
// `tools/deuxFrisesDeSuite.mjs`, qui range deux frises et vérifie que le
// compteur passe à 2 / 5.
//
// Une épreuve qui lit le code vaut ce qu'elle vaut — mais celle-ci garde deux
// règles qu'on ne retrouverait pas en relisant : un appel à `terminerPartie`
// est une erreur DANS CES JEUX-LÀ, et l'état d'une manche doit être remis à
// zéro quand la suivante s'ouvre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => sansCommentaires(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

/** Les jeux dont l'unité se répète : un tableau, une frise. */
const A_MANCHES = [
    ['js/games/apparier.js', 'relies', 'Relier les Puissances'],
    ['js/games/frisePuissances.js', 'poses', 'L’Échelle des Tailles']
];

test('UN JEU À MANCHES NE CLÔT PAS L’ÉTAPE À LA PREMIÈRE', () => {
    for (const [chemin, , nom] of A_MANCHES) {
        const src = lire(chemin);
        assert.ok(!/this\.terminerPartie\s*\(/.test(src),
            `${nom} : « terminerPartie » clôt l’étape (elle appelle partieTerminee, `
            + 'donc endStep). Un exercice réglé sur cinq manches s’arrêterait à la '
            + 'première, et compterait une bonne réponse sur les quatre exigées.');
        // ET IL COMPTE UNE QUESTION PLEINE : `onCorrectAnswer` sans `partiel`
        // est ce qui fait avancer le compteur de la séance.
        assert.ok(/onCorrectAnswer\(/.test(src), `${nom} : rien ne compte la manche finie`);
    }
});

test('ET IL REPART D’UNE MANCHE VIDE', () => {
    // L'ÉTAT D'UNE MANCHE SURVIVAIT À LA SUIVANTE. `poses` et `relies` sont
    // créés dans le constructeur et `render()` ne les vidait pas : à la
    // deuxième frise, `poses` contenait déjà les cinq objets de la première,
    // si bien que « tout est rangé » n'était plus JAMAIS vrai. La frise se
    // rangeait en entier sans être comptée — mesuré : « 1 / 5 » après deux.
    for (const [chemin, champ, nom] of A_MANCHES) {
        const src = lire(chemin);
        const i = src.indexOf('render() {');
        assert.ok(i > 0, `${nom} : pas de render()`);
        const debut = src.slice(i, i + 900);
        assert.match(debut, new RegExp(`this\\.${champ}\\s*=\\s*new Set\\(\\)`),
            `${nom} : « ${champ} » doit être remis à zéro au début de render(), `
            + 'sinon la manche suivante part avec l’état de la précédente');
    }
});

test('LE MINEUR PART AU DOIGT, ET LE ROCHER SE VOIT', () => {
    // RÉMY : « je trouve que boulder dash pour les touches c'est laborieux et
    // peu fluide » — puis « quand un boulet tombe sur nous, il faut qqch de
    // visuel ».
    //
    // MESURÉ AVANT (tools/fluiditeBoulder.mjs) : jusqu'à 156 ms entre l'appui
    // et le départ, parce qu'une touche pressée juste après un tic attendait
    // le suivant. APRÈS : 26 ms au pire.
    const jeu = lire('js/games/boulderDash.js');
    assert.match(jeu, /reveiller\(\)\s*\{/,
        'une direction qui arrive à l’arrêt doit armer le tic, pas attendre le suivant');
    assert.match(jeu, /dessinerChoc\(/,
        'l’écrasement doit se VOIR : une phrase sous la grille arrive là où '
        + 'l’élève ne regarde pas');
    // ET L'ÉCRAN PEUT RESTER CALME pour qui l'a demandé : on perd la secousse,
    // jamais l'éclat ni le liseré.
    assert.match(jeu, /prefers-reduced-motion/,
        'la secousse doit se taire pour qui a demandé un écran sans mouvement');

    const noyau = lire('js/core/boulderDash.js');
    const m = /TIC_MS = (\d+)/.exec(noyau);
    assert.ok(m, 'la cadence doit être déclarée');
    const tic = Number(m[1]);
    assert.ok(tic <= 130 && tic >= 90,
        `un pas toutes les ${tic} ms : au-dessus de 130 le jeu traîne, en dessous `
        + 'de 90 l’élève n’a plus le temps de LIRE la grille, qui est ce qu’on lui demande');
});

test('LE MODE RIGOLO A TROIS VITESSES, ET ELLES DIFFÈRENT VRAIMENT', () => {
    // RÉMY : « j'aimerai des cases qui bougent plus vite et partout (on peut
    // régler la vitesse) ». LA COURSE change avec la vitesse, et c'est elle
    // qui fait le « partout » : une carte rapide qui ne bouge que de six
    // pixels frétille sur place.
    const src = lire('js/games/apparier.js');
    const bloc = /const VITESSES = \{([\s\S]*?)\};/.exec(src);
    assert.ok(bloc, 'les trois vitesses doivent être déclarées');
    const courses = [...bloc[1].matchAll(/course:\s*(\d+)/g)].map(x => Number(x[1]));
    assert.equal(courses.length, 3, 'trois vitesses');
    assert.equal(new Set(courses).size, 3, 'trois courses différentes');
    assert.ok(Math.min(...courses) >= 12,
        `la plus petite course est ${Math.min(...courses)} px : en dessous d’une douzaine, `
        + 'la carte frétille sur place au lieu de voyager');
    // `matchAll` rend des TABLEAUX de capture, pas des chaînes : `.map(Number)`
    // donnait trois NaN, et la comparaison était fausse à coup sûr. Une épreuve
    // qui tombe pour une raison qui n'est pas la sienne ne garde rien.
    const durees = [...bloc[1].matchAll(/duree:\s*([\d.]+)/g)].map(x => Number(x[1]));
    assert.ok(durees[0] > durees[durees.length - 1], 'le « lent » doit être plus lent que le « rapide »');
});
