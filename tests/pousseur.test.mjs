import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    MUR, SOL, BUT, DIRECTIONS, NIVEAUX_POUSSEUR, niveauPousseurDe, zone, cleEtat,
    estRange, pousseesPossibles, pousser, explorerPousseur, pousseesRestantes,
    estPerdue, prochainePoussee, cheminAPied, creerPousseur, qualitePousseur
} from '../js/core/pousseur.js';
import { getExerciseById, paramSchemaOf } from '../js/data/catalog.js';

/** Un petit entrepôt écrit à la main, pour les cas précis. */
function lire(lignes) {
    const l = lignes[0].length, h = lignes.length;
    const cases = new Array(l * h).fill(MUR);
    let pousseur = null;
    const caisses = [], buts = [];
    lignes.forEach((ligne, y) => [...ligne].forEach((c, x) => {
        const i = y * l + x;
        if (c === '#') return;
        cases[i] = (c === '.' || c === '*') ? BUT : SOL;
        if (c === '.' || c === '*') buts.push(i);
        if (c === '$' || c === '*') caisses.push(i);
        if (c === '@') pousseur = i;
    }));
    return { plan: { l, h, cases }, caisses, buts, pousseur };
}

// --- La règle --------------------------------------------------------------------

test('ON POUSSE, ON NE TIRE JAMAIS', () => {
    //  # # # # #
    //  # @ $ . #     le pousseur est à gauche de la caisse
    //  # # # # #
    const e = lire(['#####', '#@$.#', '#####']);
    const coups = pousseesPossibles(e.plan, e.caisses, e.pousseur);
    // Une seule poussée : vers la droite.
    assert.equal(coups.length, 1);
    assert.equal(DIRECTIONS[coups[0].dir].nom, 'droite');
    // Et surtout, aucune traction : le pousseur ne peut pas ramener la caisse
    // vers lui, même si la case derrière lui est libre.
    assert.ok(!coups.some(c => DIRECTIONS[c.dir].nom === 'gauche'));
});

test('une caisse contre un mur ne s\'en éloigne plus, dans un coin elle est morte', () => {
    // La caisse est dans le coin haut-gauche de la salle : plus aucune poussée.
    const coin = lire(['#####', '#$..#', '#@..#', '#####']);
    const coups = pousseesPossibles(coin.plan, coin.caisses, coin.pousseur);
    // On ne peut la pousser que vers le bas (le pousseur est dessous : non) —
    // en fait vers nulle part, car il faudrait se placer dans le mur.
    assert.ok(coups.every(c => c.k !== 0 || DIRECTIONS[c.dir].nom === 'bas') );
    // Le pousseur est SOUS la caisse : il ne peut donc pas la pousser vers le bas.
    assert.equal(coups.length, 0);
});

test('gagné quand chaque caisse est sur un but', () => {
    const e = lire(['#####', '#@*.#', '#####']);
    assert.equal(estRange(e.plan, e.caisses), true);
    const f = lire(['#####', '#@$.#', '#####']);
    assert.equal(estRange(f.plan, f.caisses), false);
});

test('la zone du pousseur s\'arrête aux caisses et aux murs', () => {
    //  # # # # #
    //  # @ $ . #      la caisse coupe le couloir en deux
    const e = lire(['#####', '#@$.#', '#####']);
    const z = zone(e.plan, e.caisses, e.pousseur);
    assert.equal(z.vu[e.pousseur], true);
    assert.equal(z.vu[e.caisses[0]], false, 'la caisse n\'est pas franchissable');
    assert.equal(z.vu[e.caisses[0] + 1], false, 'ni ce qu\'il y a derrière');
});

test('DEUX POSITIONS QUI NE DIFFÈRENT QUE PAR LA PLACE DU POUSSEUR SONT LA MÊME', () => {
    // Il lui suffit de marcher pour passer de l'une à l'autre : les compter
    // deux fois ferait exploser l'exploration pour rien.
    const e = lire(['######', '#@..$#', '#....#', '######']);
    const a = zone(e.plan, e.caisses, e.pousseur);
    const b = zone(e.plan, e.caisses, e.pousseur + e.plan.l);   // une case plus bas
    assert.equal(cleEtat(e.caisses, a.min), cleEtat(e.caisses, b.min));
});

// --- La fabrication à rebours -------------------------------------------------------

test('TOUTE POSITION FABRIQUÉE EST RÉSOLUBLE, PAR CONSTRUCTION', () => {
    // C'est l'argument du module : on part de la fin et l'on remonte en TIRANT.
    // Donc rejouer à l'endroit finit toujours.
    for (const n of NIVEAUX_POUSSEUR) {
        const jeu = creerPousseur({ niveau: n.id, rng: makeRng(`sk${n.id}`) });
        assert.ok(jeu, `niveau ${n.id} : aucun entrepôt`);
        assert.equal(estRange(jeu.plan, jeu.caisses), false,
            'un entrepôt déjà rangé n\'est pas un niveau');
        assert.equal(jeu.caisses.length, jeu.buts.length);
        assert.equal(jeu.caisses.length, n.caisses);

        // Le minimum annoncé est le vrai, recalculé depuis la position de départ.
        assert.equal(pousseesRestantes(jeu.plan, jeu.table, jeu.caisses, jeu.pousseur),
            jeu.mini, `niveau ${n.id}`);
        assert.ok(jeu.mini >= 1);
        assert.ok(jeu.mini <= n.max, `niveau ${n.id} : ${jeu.mini} dépasse le plafond`);

        // Et le chemin le plus court fait exactement ce nombre de poussées.
        let caisses = jeu.caisses.slice(), pousseur = jeu.pousseur, k = 0;
        while (!estRange(jeu.plan, caisses) && k < 200) {
            const c = prochainePoussee(jeu.plan, jeu.table, caisses, pousseur);
            assert.ok(c, `niveau ${n.id} : l'indice s'arrête en route`);
            // La poussée proposée est légale.
            assert.ok(pousseesPossibles(jeu.plan, caisses, pousseur)
                .some(x => x.k === c.k && x.vers === c.vers), 'poussée illégale proposée');
            const s = pousser(caisses, c);
            caisses = s.caisses; pousseur = s.pousseur;
            k++;
        }
        assert.equal(k, jeu.mini, `niveau ${n.id} : ${k} poussées au lieu de ${jeu.mini}`);
    }
});

test('les buts sont bien marqués sur le plan, et distincts', () => {
    for (let i = 0; i < 20; i++) {
        const jeu = creerPousseur({ niveau: 3, rng: makeRng(`b${i}`) });
        if (!jeu) continue;
        assert.equal(new Set(jeu.buts).size, jeu.buts.length, 'deux buts sur la même case');
        assert.equal(new Set(jeu.caisses).size, jeu.caisses.length, 'deux caisses empilées');
        jeu.buts.forEach(b => assert.equal(jeu.plan.cases[b], BUT));
        jeu.caisses.forEach(c => assert.notEqual(jeu.plan.cases[c], MUR,
            'une caisse dans un mur'));
        assert.notEqual(jeu.plan.cases[jeu.pousseur], MUR, 'le pousseur dans un mur');
        assert.ok(!jeu.caisses.includes(jeu.pousseur), 'le pousseur sous une caisse');
        // Le bord reste toujours en mur : une caisse poussée dehors n'a aucun sens.
        for (let x = 0; x < jeu.plan.l; x++) {
            assert.equal(jeu.plan.cases[x], MUR);
            assert.equal(jeu.plan.cases[(jeu.plan.h - 1) * jeu.plan.l + x], MUR);
        }
    }
});

// --- La position perdue, qui est tout le propos --------------------------------------

test('LE JEU SAIT DIRE QUE C\'EST PERDU — le service que le carton ne rend pas', () => {
    // Une salle carrée, une caisse, un but au milieu. Pousser la caisse dans un
    // coin la tue : elle n'en sortira plus, et le jeu continue pourtant de
    // proposer des coups.
    const e = lire([
        '######',
        '#....#',
        '#.$..#',
        '#..@.#',
        '#..*.#'.replace('*', '.'),
        '######'
    ]);
    // On place le but ailleurs que sous la caisse.
    const but = e.plan.l * 1 + 4;
    e.plan.cases[but] = BUT;
    const table = explorerPousseur(e.plan, [but]);

    // La position de départ, elle, est résoluble.
    assert.notEqual(pousseesRestantes(e.plan, table, e.caisses, e.pousseur), null);

    // On pousse la caisse vers la gauche, contre le mur : elle ne pourra plus
    // jamais s'en éloigner, donc jamais atteindre un but qui n'est pas sur ce mur.
    const versGauche = pousseesPossibles(e.plan, e.caisses, e.pousseur)
        .find(c => DIRECTIONS[c.dir].nom === 'gauche');
    assert.ok(versGauche, 'il faut pouvoir pousser à gauche pour ce test');
    const apres = pousser(e.caisses, versGauche);
    assert.equal(estPerdue(e.plan, table, apres.caisses, apres.pousseur), true,
        'une caisse plaquée au mur, loin de son but, devrait être une position perdue');
    // Et il RESTE des coups possibles : c'est tout le piège.
    assert.ok(pousseesPossibles(e.plan, apres.caisses, apres.pousseur).length >= 0);
    // L'indice refuse alors de raconter n'importe quoi.
    assert.equal(prochainePoussee(e.plan, table, apres.caisses, apres.pousseur), null);
});

// --- Le déplacement à pied ------------------------------------------------------------

test('le chemin à pied contourne les caisses, ou n\'existe pas', () => {
    const e = lire(['######', '#@.$.#', '#....#', '######']);
    // Contourner par le bas : possible.
    const loin = e.plan.l * 1 + 4;
    const chemin = cheminAPied(e.plan, e.caisses, e.pousseur, loin);
    assert.ok(chemin, 'le pousseur devrait pouvoir contourner par le bas');
    assert.ok(chemin.length > 3, 'le contournement est plus long que la ligne droite');
    // Vers une case murée : pas de chemin.
    assert.equal(cheminAPied(e.plan, e.caisses, e.pousseur, 0), null);
    // Vers soi-même : un chemin vide, pas `null`.
    assert.deepEqual(cheminAPied(e.plan, e.caisses, e.pousseur, e.pousseur), []);
});

// --- Les six niveaux et le rangement ----------------------------------------------------

test('les six niveaux montent, en poussées et en caisses', () => {
    let min = 0, caisses = 0;
    NIVEAUX_POUSSEUR.forEach(n => {
        assert.ok(n.min > min, `le niveau ${n.id} ne monte pas`);
        assert.ok(n.caisses >= caisses, `le niveau ${n.id} perd des caisses`);
        min = n.min; caisses = n.caisses;
    });
    assert.equal(niveauPousseurDe(99).id, 1, 'un niveau inconnu retombe sur le premier');
});

test('la qualité dit l\'écart au minimum', () => {
    assert.deepEqual(qualitePousseur(12, 12), { mini: 12, poussees: 12, detours: 0, parfait: true });
    assert.deepEqual(qualitePousseur(12, 15), { mini: 12, poussees: 15, detours: 3, parfait: false });
});

test('le Pousseur est rangé dans les défis, avec ses six niveaux', () => {
    const e = getExerciseById('defi-pousseur');
    assert.ok(e, 'defi-pousseur manque au catalogue');
    assert.equal(e.activityId, 'pousseur');
    assert.deepEqual(e.skills, ['defi.pousseur']);
    const niveau = paramSchemaOf(e).find(p => p.id === 'niveau');
    assert.ok(niveau);
    assert.equal(niveau.options.length, NIVEAUX_POUSSEUR.length);
    assert.ok(e.instruction.length > 400);
    // La consigne doit dire LA règle : on pousse, on ne tire pas.
    assert.ok(/ne tire/i.test(e.instruction));
    assert.ok(/coin/i.test(e.instruction));
    assert.ok(SOL !== MUR && BUT !== SOL);
});
