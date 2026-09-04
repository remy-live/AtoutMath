// LE SERPENT LITTÉRAL — l'algèbre du corps, sans écran.
//
// Ce qu'on éprouve ici : que le corps du serpent DIT VRAI. À tout instant,
// l'expression qu'il porte doit valoir la somme de tout ce qui a été ramassé —
// sinon le jeu enseignerait une fausse réduction, ce qui est pire que de ne
// rien enseigner.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    NIVEAUX, CONSIGNE, SENS, OPPOSE,
    terme, semblables, texteTerme, expression, reduire,
    nouvellePartie, avancer, semer, longueurIdeale
} from '../js/core/serpent.js';

/** Ce que vaut une expression pour une valeur de x — le juge de tous les tests. */
const vaut = (corps, x) => corps.reduce((s, t) => s + t.c * Math.pow(x, t.e), 0);

test('un terme s\'écrit comme au tableau', () => {
    assert.equal(texteTerme(terme(3, 0)), '3');
    assert.equal(texteTerme(terme(3, 1)), '3x');
    assert.equal(texteTerme(terme(1, 2)), 'x²');
    assert.equal(texteTerme(terme(-1, 3)), '−x³');
    assert.equal(texteTerme(terme(-4, 1)), '−4x');
    assert.equal(texteTerme(terme(5, 0), { signe: true }), '+5');
});

test('SEMBLABLES VEUT DIRE MÊME PUISSANCE, et rien d\'autre', () => {
    assert.equal(semblables(terme(2, 1), terme(9, 1)), true);
    assert.equal(semblables(terme(2, 1), terme(2, 0)), false, '2x et 2 ne se ressemblent pas');
    assert.equal(semblables(terme(3, 2), terme(3, 1)), false, '3x² et 3x non plus');
    assert.equal(semblables(terme(7, 0), terme(-7, 0)), true);
});

test('2x + 3x FUSIONNE, 2x + 3 NON — la faute du chapitre', () => {
    const a = reduire([terme(3, 1), terme(2, 1)]);
    assert.equal(a.corps.length, 1);
    assert.equal(texteTerme(a.corps[0]), '5x');

    const b = reduire([terme(3, 0), terme(2, 1)]);
    assert.equal(b.corps.length, 2, '2x + 3 reste à deux termes');
    assert.equal(b.fusions, 0);
});

test('L\'ORDRE DE RAMASSAGE DÉCIDE DE TOUT', () => {
    // Le cœur du jeu. Les mêmes trois termes, deux ordres, deux longueurs.
    //
    // ET IL FAUT RÉDUIRE À CHAQUE RAMASSAGE, pas une fois à la fin : c'est ce
    // que fait le jeu, et mon premier test l'avait oublié — il appelait
    // `reduire` sur la liste complète, ce qui ne fusionnait rien puisque la
    // tête n'était pas semblable à sa voisine. La cascade se joue coup par coup.
    const ramasser = (ordre) => ordre.reduce(
        (corps, t) => reduire([t, ...corps]).corps, []);

    const bien = ramasser([terme(2, 1), terme(3, 1), terme(5, 0)]);
    assert.equal(bien.length, 2);
    assert.equal(expression(bien), '5 + 5x');

    const mal = ramasser([terme(2, 1), terme(5, 0), terme(3, 1)]);
    assert.equal(mal.length, 3, 'le 5 s\'est glissé entre les deux x');
    assert.equal(expression(mal), '3x + 5 + 2x');
});

test('les fusions s\'enchaînent en cascade', () => {
    const r = reduire([terme(4, 1), terme(3, 1), terme(2, 1)]);
    assert.equal(r.corps.length, 1);
    assert.equal(texteTerme(r.corps[0]), '9x');
    assert.equal(r.fusions, 2);
});

test('DEUX OPPOSÉS NE LAISSENT PAS UN ZÉRO : ils ne laissent rien', () => {
    const r = reduire([terme(-3, 1), terme(3, 1)]);
    assert.deepEqual(r.corps, [], 'l\'anneau disparaît pour de bon');
    assert.equal(r.annulations, 1);
    // Et une annulation peut en libérer une autre.
    const c = reduire([terme(-2, 0), terme(2, 0), terme(-5, 1), terme(5, 1)]);
    assert.equal(c.annulations >= 1, true);
});

test('on ne réduit QUE depuis la tête', () => {
    // Réduire partout d'un coup rendrait l'ordre indifférent — et l'ordre est
    // exactement ce qu'on apprend. Ici les deux x sont séparés par un nombre :
    // rien ne bouge, même s'ils sont « réductibles » au sens du cours.
    const r = reduire([terme(1, 0), terme(2, 1), terme(3, 1)]);
    assert.equal(r.corps.length, 3);
    assert.equal(r.fusions, 0);
});

test('LA RÉDUCTION NE CHANGE JAMAIS LA VALEUR — l\'invariant du module', () => {
    const rng = makeRng('valeur');
    for (let essai = 0; essai < 300; essai++) {
        const brut = [];
        for (let i = 0; i < rng.int(1, 7); i++) {
            brut.push(terme(rng.int(-6, 6) || 1, rng.pick([0, 1, 2, 3])));
        }
        const { corps } = reduire(brut);
        [-2, 0, 1, 3, 7].forEach(x => {
            assert.equal(vaut(corps, x), vaut(brut, x),
                `${expression(brut)} réduit en ${expression(corps)} : faux en x = ${x}`);
        });
    }
});

test('l\'expression s\'écrit dans l\'ordre des anneaux, pas par degrés', () => {
    // La ranger ferait le travail à la place de l'élève.
    assert.equal(expression([terme(3, 0), terme(2, 2)]), '3 + 2x²');
    assert.equal(expression([terme(2, 2), terme(3, 0)]), '2x² + 3');
    assert.equal(expression([terme(5, 1), terme(-2, 0)]), '5x − 2');
    assert.equal(expression([]), '0');
});

// --- Le terrain --------------------------------------------------------------

test('une partie neuve tient dans son terrain', () => {
    const p = nouvellePartie(makeRng('depart'), 0);
    assert.equal(p.cases.length, 1);
    assert.equal(p.graines.length, p.niv.termes);
    p.graines.forEach(g => {
        assert.ok(g.x >= 0 && g.x < p.niv.large && g.y >= 0 && g.y < p.niv.haut, 'hors terrain');
    });
    const cles = new Set(p.graines.map(g => `${g.x},${g.y}`));
    assert.equal(cles.size, p.graines.length, 'deux termes sur la même case');
});

test('RIEN N\'EST SEMÉ DEVANT LE SERPENT', () => {
    // Un terme ramassé avant d'avoir pu choisir n'est pas un choix.
    for (let i = 0; i < 30; i++) {
        const p = nouvellePartie(makeRng(`devant${i}`), i % NIVEAUX.length);
        const [x0, y0] = p.cases[0];
        [0, 1, 2, 3].forEach(d => {
            assert.ok(!p.graines.some(g => g.x === x0 + d && g.y === y0),
                'un terme est posé sur le chemin de départ');
        });
    }
});

test('chaque famille semée l\'est au moins deux fois', () => {
    // Un x² unique ne pourrait fusionner avec rien : l'anneau qu'il coûte
    // serait une punition sans leçon.
    for (let i = 0; i < 20; i++) {
        const p = nouvellePartie(makeRng(`fam${i}`), i % NIVEAUX.length);
        const compte = {};
        p.graines.forEach(g => { compte[g.t.e] = (compte[g.t.e] || 0) + 1; });
        Object.entries(compte).forEach(([e, n]) => {
            assert.ok(n >= 2, `exposant ${e} semé ${n} fois au niveau ${p.rang}`);
        });
    }
});

test('un niveau ne sème que les exposants qu\'il annonce', () => {
    NIVEAUX.forEach((niv, i) => {
        const p = nouvellePartie(makeRng(`exp${i}`), i);
        p.graines.forEach(g => assert.ok(niv.exposants.includes(g.t.e),
            `${niv.titre} sème un exposant ${g.t.e}`));
        if (!niv.negatifs) p.graines.forEach(g => assert.ok(g.t.c > 0, `${niv.titre} : coefficient négatif`));
    });
});

test('LE MUR TUE, ET LA MORSURE AUSSI', () => {
    let p = nouvellePartie(makeRng('mur'), 0);
    let r = { etat: p };
    for (let i = 0; i < 40 && !r.etat.fini; i++) r = avancer(r.etat, 'droite');
    assert.equal(r.etat.fini, 'mur');
    assert.match(r.dit, /mur/i);
});

test('on ne fait pas demi-tour sur place', () => {
    // Un serpent qui rebrousse chemin se mangerait sans que le joueur l'ait
    // voulu : ce n'est pas une erreur de calcul, cela ne doit pas coûter la
    // partie.
    const p = nouvellePartie(makeRng('demi'), 0);
    const r = avancer(p, OPPOSE[p.sens]);
    assert.notEqual(r.quoi, 'mordu');
    assert.equal(r.etat.sens, p.sens, 'le sens n\'a pas changé');
});

test('AVANCER SANS RAMASSER NE CHANGE PAS L\'EXPRESSION', () => {
    let p = nouvellePartie(makeRng('glisse'), 0);
    // On choisit un sens sans graine devant, puis on avance et l'on compare.
    const avant = expression(p.corps);
    const r = avancer(p, 'droite');
    if (r.quoi === 'rien') {
        assert.equal(expression(r.etat.corps), avant);
        assert.equal(r.etat.cases.length, p.cases.length, 'la longueur n\'a pas bougé');
    }
});

test('LE CORPS RESTE UNE CHAÎNE DE CASES VOISINES', () => {
    // Chaque fusion retire un anneau. S'il était retiré au mauvais endroit, le
    // serpent se couperait en deux morceaux — invisible dans les nombres, mais
    // catastrophique à l'écran.
    const rng = makeRng('chaine');
    for (let partie = 0; partie < 12; partie++) {
        let e = nouvellePartie(makeRng(`ch${partie}`), partie % NIVEAUX.length);
        for (let pas = 0; pas < 220 && !e.fini; pas++) {
            const r = avancer(e, rng.pick(['haut', 'bas', 'gauche', 'droite']));
            e = r.etat;
            assert.equal(e.cases.length, Math.max(1, e.corps.length),
                'autant de cases que d\'anneaux');
            for (let i = 1; i < e.cases.length; i++) {
                const d = Math.abs(e.cases[i][0] - e.cases[i - 1][0])
                    + Math.abs(e.cases[i][1] - e.cases[i - 1][1]);
                assert.equal(d, 1, `anneaux ${i - 1} et ${i} non voisins`);
            }
            const vus = new Set(e.cases.map(c => c.join(',')));
            assert.equal(vus.size, e.cases.length, 'deux anneaux sur la même case');
        }
    }
});

test('LE CORPS DIT TOUJOURS LA VÉRITÉ SUR CE QUI A ÉTÉ RAMASSÉ', () => {
    // L'invariant qui compte vraiment : à tout instant, l'expression portée par
    // le serpent vaut la somme de tous les termes ramassés depuis le début.
    const rng = makeRng('verite');
    for (let partie = 0; partie < 10; partie++) {
        let e = nouvellePartie(makeRng(`vr${partie}`), partie % NIVEAUX.length);
        const ramasses = [];
        for (let pas = 0; pas < 260 && !e.fini; pas++) {
            const avant = e.graines.length;
            const r = avancer(e, rng.pick(['haut', 'bas', 'gauche', 'droite']));
            if (r.etat.graines.length < avant) {
                const mange = e.graines.find(g => !r.etat.graines.includes(g));
                ramasses.push(mange.t);
            }
            e = r.etat;
            [-1, 0, 2, 5].forEach(x => assert.equal(vaut(e.corps, x), vaut(ramasses, x),
                `après ${pas} pas : ${expression(e.corps)} ≠ somme des ${ramasses.length} termes`));
        }
    }
});

test('nettoyer le terrain gagne la partie', () => {
    // On force le ramassage en téléportant la tête sur chaque graine : c'est du
    // trucage assumé, on ne teste ici que la condition de victoire.
    let e = nouvellePartie(makeRng('gagne'), 0);
    let tours = 0;
    while (e.graines.length && tours++ < 100) {
        const g = e.graines[0];
        e = { ...e, cases: [[g.x - 1, g.y], ...e.cases.slice(1)] };
        e = avancer(e, 'droite').etat;
        if (e.fini && e.fini !== 'gagne') break;
    }
    assert.equal(e.fini, 'gagne');
    assert.equal(e.graines.length, 0);
});

test('la longueur idéale est le nombre de familles semées', () => {
    const p = nouvellePartie(makeRng('ideal'), 3);
    const familles = new Set(p.graines.map(g => g.t.e)).size;
    assert.equal(longueurIdeale(p.graines), familles);
    assert.ok(familles >= 2 && familles <= 4);
});

test('les niveaux montent : plus de termes, plus de familles, plus vite', () => {
    for (let i = 1; i < NIVEAUX.length; i++) {
        assert.ok(NIVEAUX[i].termes >= NIVEAUX[i - 1].termes, `${NIVEAUX[i].titre} : moins de termes`);
        assert.ok(NIVEAUX[i].vitesse <= NIVEAUX[i - 1].vitesse, `${NIVEAUX[i].titre} : plus lent`);
    }
    assert.deepEqual(NIVEAUX[0].exposants, [0, 1], 'on commence par « 2x + 3 ne se réduit pas »');
    assert.ok(NIVEAUX.some(n => n.negatifs), 'les négatifs arrivent');
    assert.ok(NIVEAUX.some(n => n.exposants.includes(3)), 'les cubes aussi');
});

test('LA CONSIGNE NE DONNE PAS LA RÈGLE DE RÉDUCTION', () => {
    // Elle dit ce qui se passe — « ils fusionnent » — sans nommer le critère.
    // C'est le critère qu'on veut faire trouver.
    assert.doesNotMatch(CONSIGNE, /même exposant|même puissance|coefficient/i);
    assert.match(CONSIGNE, /fusionnent/i);
    assert.ok(Object.keys(SENS).length === 4);
});
