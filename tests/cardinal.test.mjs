// LA GAUCHE DE QUI SE DÉPLACE N'EST PAS LA GAUCHE DE L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/cardinal.js` tient en quarante-cinq lignes et porte l'idée la plus
// facile à se tromper de tout le dépôt : quand on DESCEND, sa gauche est à
// l'est, c'est-à-dire à DROITE du dessin. Deux exercices en dépendent — la
// ville (on y suit un itinéraire) et l'automate (un robot exécute un
// programme) —, et le module existe justement parce que le second allait les
// recopier.
//
// POURQUOI UNE ÉPREUVE ICI ALORS QUE LE CODE EST SI COURT. Parce qu'une
// inversion gauche/droite est le défaut parfait : elle ne jette jamais, elle
// produit un itinéraire parfaitement cohérent, et l'élève arrive à une case qui
// n'est pas la bonne sans qu'aucune alarme ne sonne. Le professeur conclut que
// l'élève s'est trompé.
//
// ON NE RECOPIE PAS LA TABLE DU MODULE. Une épreuve qui réécrit `N → E → S → O`
// à côté du code ne vérifie que ma capacité à recopier. On mesure donc des
// PROPRIÉTÉS : quatre quarts de tour reviennent au départ, un demi-tour est
// deux quarts, tourner puis tourner en sens inverse ne bouge pas, et avancer
// dans un sens puis dans l'opposé revient sur place.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { CAPS, VECTEURS, tourner, sensEntre, devant, nomCap } from '../js/core/cardinal.js';

test('LES QUATRE CAPS SONT DANS LE SENS DES AIGUILLES D\'UNE MONTRE', () => {
    // On ne le vérifie pas sur les lettres mais sur la GÉOMÉTRIE : à l'écran,
    // tourner dans le sens des aiguilles fait passer du haut à la droite, puis
    // au bas, puis à la gauche. C'est l'ordre du tableau, et c'est ce dont
    // `tourner` dépend entièrement.
    assert.equal(CAPS.length, 4);
    const attendus = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    CAPS.forEach((cap, i) => {
        assert.deepEqual(VECTEURS[cap], attendus[i],
            `${cap} est en position ${i} : son vecteur doit être celui-là`);
    });
});

test('QUATRE QUARTS DE TOUR RAMÈNENT AU DÉPART', () => {
    for (const cap of CAPS) {
        for (const sens of ['gauche', 'droite']) {
            let c = cap;
            for (let i = 0; i < 4; i++) c = tourner(c, sens);
            assert.equal(c, cap, `quatre fois « ${sens} » depuis ${cap}`);
        }
    }
});

test('TOURNER PUIS REVENIR NE BOUGE PAS', () => {
    // C'est la propriété qu'un échange gauche/droite dans le code casserait
    // IMMÉDIATEMENT, alors qu'elle est invisible dans une table recopiée.
    for (const cap of CAPS) {
        assert.equal(tourner(tourner(cap, 'gauche'), 'droite'), cap);
        assert.equal(tourner(tourner(cap, 'droite'), 'gauche'), cap);
    }
});

test('UN DEMI-TOUR VAUT DEUX QUARTS DE TOUR, DANS N\'IMPORTE QUEL SENS', () => {
    for (const cap of CAPS) {
        const demi = tourner(cap, 'demi-tour');
        assert.equal(demi, tourner(tourner(cap, 'droite'), 'droite'));
        assert.equal(demi, tourner(tourner(cap, 'gauche'), 'gauche'));
        assert.notEqual(demi, cap, 'un demi-tour change de cap');
    }
});

test('QUAND ON DESCEND, SA GAUCHE EST À DROITE DU DESSIN', () => {
    // LA PHRASE QUI JUSTIFIE TOUT LE MODULE, mesurée au vecteur.
    //
    // Un élève qui descend la rue et tourne à gauche va vers l'EST, donc vers
    // la droite de l'écran. C'est l'inversion que chaque exercice refaisait à
    // la main, et c'est elle qu'on garde ici une fois pour toutes.
    assert.equal(tourner('S', 'gauche'), 'E');
    assert.deepEqual(VECTEURS[tourner('S', 'gauche')], [1, 0], 'vers la droite de l\'écran');
    assert.equal(tourner('S', 'droite'), 'O');
    assert.deepEqual(VECTEURS[tourner('S', 'droite')], [-1, 0], 'vers la gauche de l\'écran');

    // Et quand on MONTE, la gauche est bien la gauche. C'est le cas facile, et
    // le fait que les deux coexistent est exactement ce qui piège.
    assert.equal(tourner('N', 'gauche'), 'O');
    assert.deepEqual(VECTEURS[tourner('N', 'gauche')], [-1, 0]);
});

test('UN SENS INCONNU NE FAIT PAS TOURNER', () => {
    // Un robot dont le programme contient un ordre qu'on ne comprend pas doit
    // s'arrêter d'avancer droit, pas partir au hasard.
    assert.equal(tourner('N', 'avance'), 'N');
    assert.equal(tourner('N', ''), 'N');
    assert.equal(tourner('N', undefined), 'N');
    // Et un cap inconnu se rend tel quel, sans devenir `undefined` — ce qui
    // traverserait ensuite `VECTEURS[cap]` et jetterait beaucoup plus loin.
    assert.equal(tourner('X', 'droite'), 'X');
    assert.equal(tourner(null, 'droite'), null);
});

test('LE SENS ENTRE DEUX CAPS EST L\'INVERSE DU TOUR QUI LES RELIE', () => {
    // `sensEntre` et `tourner` sont les deux faces d'une même chose. S'ils
    // divergent, un exercice qui DIT le virage et un exercice qui le FAIT ne
    // montreront pas la même route.
    for (const depart of CAPS) {
        for (const sens of ['tout-droit', 'droite', 'demi-tour', 'gauche']) {
            const arrivee = sens === 'tout-droit' ? depart : tourner(depart, sens);
            assert.equal(sensEntre(depart, arrivee), sens,
                `de ${depart} à ${arrivee}`);
        }
    }
});

test('AVANCER D\'UN PAS, PUIS D\'UN PAS DANS L\'AUTRE SENS, REVIENT SUR PLACE', () => {
    for (const cap of CAPS) {
        const un = devant(3, 7, cap);
        const retour = devant(un.x, un.y, tourner(cap, 'demi-tour'));
        assert.deepEqual(retour, { x: 3, y: 7 }, `aller et revenir au cap ${cap}`);
    }
    // Et un pas ne déplace que d'une case, jamais en diagonale.
    for (const cap of CAPS) {
        const p = devant(0, 0, cap);
        assert.equal(Math.abs(p.x) + Math.abs(p.y), 1, `un pas au cap ${cap}`);
    }
});

test('LE NOM DIT À L\'ÉLÈVE CE QU\'IL VOIT, PAS UN POINT CARDINAL', () => {
    // Un élève de sixième à qui l'on dit « va vers le nord » cherche le nord.
    // On lui parle donc de l'écran — et c'est pour cela que ces libellés
    // existent plutôt qu'une simple lettre.
    assert.equal(nomCap('N'), 'le haut du plan');
    assert.equal(nomCap('S'), 'le bas du plan');
    assert.equal(nomCap('E'), 'la droite du plan');
    assert.equal(nomCap('O'), 'la gauche du plan');
    // Et les quatre sont des phrases distinctes : deux caps qui se diraient
    // pareil rendraient l'énoncé impossible à suivre.
    assert.equal(new Set(CAPS.map(nomCap)).size, 4);
    // Un cap inconnu se dit tel quel plutôt que « undefined » à l'écran.
    assert.equal(nomCap('X'), 'X');
});
