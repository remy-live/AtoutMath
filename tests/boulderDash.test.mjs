// BOULDER DASH — ce qui doit rester vrai de la mine.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « et j'adorai aussi boulder dash », puis « B — la
// partie ».
//
// ── CE QU'ON GARDE, ET POURQUOI CELA ───────────────────────────────────────
//
// TOUT LE JEU TIENT DANS UNE SEULE RÈGLE, et elle a trois faces :
//
//   · on passe SOUS un rocher sans rien risquer — c'est nous qui le retenons ;
//   · on s'écarte SUR LE CÔTÉ et il tombe derrière nous, sans dommage ;
//   · on descend DE SOUS LUI et il nous suit, et il écrase.
//
// Si l'une des trois lâche, le jeu cesse d'être un jeu d'anticipation : ou
// bien plus rien ne tue, ou bien l'on meurt sans l'avoir déclenché. Les trois
// sont donc gardées ensemble.
//
// ET L'ON A DÉJÀ PAYÉ CE DÉFAUT-LÀ : le joueur n'est pas dans `n.cases` — sa
// case y est VIDE —, de sorte qu'une pierre posée au-dessus de lui y tombait
// et qu'il se retrouvait À L'INTÉRIEUR du rocher, vivant. Mesuré avant
// correction : la grille rendait « #..o...# » sur la ligne du joueur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    DIRECTIONS, NIVEAUX, TUILE, avancer, etatInitial, lireNiveau
} from '../js/core/boulderDash.js';
import { faireJouer } from '../js/core/boulderRobot.js';

/** Un tableau d'essai, lu comme les vrais. */
const essai = (lignes, diamants = 0) =>
    lireNiveau({ nom: 'essai', diamants, secondes: 60, lignes });

/** Joue une suite de coups et rend l'état et le tableau. */
function jouer(n, coups) {
    let e = etatInitial(n);
    const faits = [];
    for (const c of coups) {
        const r = avancer(e, n, c);
        e = r.etat;
        faits.push(...r.faits);
    }
    return { e, n, faits };
}

const { gauche, droite, haut, bas } = DIRECTIONS;

test('ON CREUSE LA TERRE, et elle ne revient pas', () => {
    const n = essai([
        '########',
        '#P.....#',
        '#......#',
        '########'
    ]);
    const { e, faits } = jouer(n, [droite, droite]);
    assert.equal(e.c, 3);
    assert.ok(faits.includes('creuse'));
    assert.equal(n.cases[1][2], TUILE.VIDE, 'la terre creusée est encore là');
});

test('UN ROCHER PRIVÉ D\'APPUI TOMBE ; POSÉ, IL NE BOUGE PAS', () => {
    // Celui de gauche repose sur de la terre : il doit rester. Celui de droite
    // est au-dessus du vide : il doit descendre jusqu'au sol.
    const n = essai([
        '########',
        '#o..o..#',
        '#...   #',
        '#P.....#',
        '########'
    ]);
    const avant = n.cases[1][1];
    jouer(n, [null, null, null]);
    assert.equal(n.cases[1][1], avant, 'le rocher posé sur la terre a bougé');
    assert.equal(n.cases[1][4], TUILE.VIDE, 'le rocher sans appui n\'est pas tombé');
    assert.equal(n.cases[2][4], TUILE.ROCHER, 'il n\'est pas arrivé où il fallait');
});

test('ON PASSE SOUS UN ROCHER SANS RIEN RISQUER — c\'est nous qui le retenons', () => {
    const n = essai([
        '########',
        '#..o...#',
        '#..P...#',
        '#......#',
        '########'
    ]);
    const { e } = jouer(n, [null, null, null]);
    assert.equal(e.mort, false, 'le rocher posé a tué le joueur');
    // ET IL N'EST PAS DESCENDU DANS SA CASE : c'est exactement le défaut qu'on
    // a corrigé — un joueur vivant, mais à l'intérieur de la pierre.
    assert.equal(n.cases[2][3], TUILE.VIDE,
        `la case du joueur contient « ${n.cases[2][3]} »`);
    assert.equal(n.cases[1][3], TUILE.ROCHER, 'le rocher n\'est plus au-dessus de lui');
});

test('ON S\'ÉCARTE SUR LE CÔTÉ, ET LE ROCHER TOMBE DERRIÈRE SOI', () => {
    const n = essai([
        '########',
        '#..o...#',
        '#..P...#',
        '#......#',
        '########'
    ]);
    const { e } = jouer(n, [droite, null, null]);
    assert.equal(e.mort, false, 'le rocher l\'a suivi sur le côté');
    assert.equal(e.c, 4);
    assert.equal(n.cases[2][3], TUILE.ROCHER,
        'le rocher n\'est pas tombé dans la case quittée');
});

test('MAIS ON NE DESCEND PAS DE SOUS UN ROCHER : il suit, et il écrase', () => {
    const n = essai([
        '########',
        '#..o...#',
        '#..P...#',
        '#......#',
        '#......#',
        '########'
    ]);
    const { e, faits } = jouer(n, [bas, null, null]);
    assert.equal(e.mort, true, 'descendre de sous un rocher ne coûte rien');
    assert.ok(faits.includes('ecrase'));
});

test('UN ROCHER ROULE SUR UN ROCHER, pas sur un mur carré', () => {
    // À gauche, une pierre sur une pierre : elle doit glisser de côté.
    // À droite, une pierre sur un mur : elle doit rester.
    // LES DEUX PIERRES ONT LA MÊME PLACE LIBRE À CÔTÉ ET EN DIAGONALE : la
    // SEULE chose qui les sépare est ce qu'elles ont sous elles. Sans cette
    // précaution, l'épreuve ne garderait rien — la première version laissait
    // de la terre à côté de la pierre de droite, qui ne pouvait donc pas
    // rouler de toute façon, et l'on mesurait le décor au lieu de la règle.
    const n = essai([
        '##########',
        '#o    o..#',
        '#o    #..#',
        '#.......P#',
        '##########'
    ]);
    jouer(n, [null, null, null]);
    assert.equal(n.cases[1][1], TUILE.VIDE,
        'la pierre posée sur une pierre n\'a pas roulé');
    assert.equal(n.cases[1][6], TUILE.ROCHER, 'la pierre posée sur le mur a roulé');
});

test('ON POUSSE UN ROCHER À L\'HORIZONTALE, jamais vers le haut ni le bas', () => {
    // ON NE POUSSE PAS UN ROCHER DANS LA TERRE : il faut du vide derrière.
    // C'est la règle de 1984, et elle est juste — sinon on creuserait avec
    // une pierre, et un couloir bouché ne serait plus jamais un obstacle.
    const n = essai([
        '########',
        '#......#',
        '#P o  .#',
        '#......#',
        '########'
    ]);
    // Le joueur avance dans le vide, puis pousse.
    const a = jouer(n, [droite, droite]);
    assert.ok(a.faits.includes('pousse'), 'le rocher n\'a pas été poussé');
    assert.equal(n.cases[2][4], TUILE.ROCHER, 'le rocher n\'a pas avancé');
    assert.equal(a.e.c, 3, 'le joueur n\'a pas pris sa place');

    // Et un rocher adossé à un mur ne se pousse pas.
    const m = essai([
        '######',
        '#....#',
        '#P o##',
        '#....#',
        '######'
    ]);
    const b = jouer(m, [droite, droite]);
    assert.ok(b.faits.includes('bloque'), 'le rocher collé au mur s\'est poussé');
    assert.equal(b.e.c, 2, 'le joueur est passé à travers');

    // NI UN ROCHER ADOSSÉ À DE LA TERRE, et c'est le cas qui manquait : sans
    // lui, l'épreuve passait aussi bien avec la règle « on pousse partout sauf
    // dans la roche », qui laisserait creuser à coups de pierre et ôterait
    // tout sens aux couloirs bouchés.
    const t = essai([
        '########',
        '#......#',
        '#P o...#',
        '#......#',
        '########'
    ]);
    const d2 = jouer(t, [droite, droite]);
    assert.ok(d2.faits.includes('bloque'), 'le rocher s\'est poussé dans la terre');
    assert.equal(t.cases[2][3], TUILE.ROCHER, 'le rocher a avancé dans la terre');
    assert.equal(d2.e.c, 2, 'le joueur est passé à travers le rocher');
});

test('LA PORTE NE S\'OUVRE QU\'AU NOMBRE DE DIAMANTS DEMANDÉ', () => {
    const n = essai([
        '########',
        '#Pdd..E#',
        '#......#',
        '########'
    ], 2);
    let e = etatInitial(n);
    let r = avancer(e, n, droite);
    e = r.etat;
    assert.equal(e.pris, 1);
    assert.equal(e.ouverte, false, 'la porte s\'ouvre avant le compte');
    // ET LA PORTE FERMÉE NE SE FRANCHIT PAS : sinon le compteur ne servirait
    // à rien, et l'on sortirait du tableau sans l'avoir joué.
    const bloque = jouer(essai([
        '######',
        '#P..E#',
        '######'
    ], 1), [droite, droite, droite, droite]);
    assert.equal(bloque.e.fini, false, 'on sort par une porte fermée');

    r = avancer(e, n, droite);
    e = r.etat;
    assert.equal(e.pris, 2);
    assert.equal(e.ouverte, true, 'la porte ne s\'ouvre pas au bon compte');
    assert.ok(r.faits.includes('ouverte'));
});

test('CHAQUE TABLEAU EST BIEN FORMÉ, et porte plus de diamants qu\'il n\'en faut', () => {
    NIVEAUX.forEach((def, i) => {
        const n = lireNiveau(def);
        assert.ok(def.nom, `tableau ${i + 1} sans nom`);
        assert.ok(n.depart, `tableau ${i + 1} sans départ (${TUILE.DEPART})`);
        assert.ok(n.sortie, `tableau ${i + 1} sans sortie (${TUILE.SORTIE})`);
        const l = def.lignes[0].length;
        def.lignes.forEach((ligne, r) => assert.equal(ligne.length, l,
            `tableau ${i + 1}, ligne ${r} : ${ligne.length} cases au lieu de ${l}`));
        // DAVANTAGE DE DIAMANTS QU'IL N'EN FAUT, et c'est une règle de jeu :
        // il faut pouvoir laisser ceux qui sont sous un rocher. Exiger tous
        // les diamants ferait de chaque tableau un chemin unique à retrouver.
        assert.ok(n.diamants > n.ilEnFaut,
            `tableau ${i + 1} : ${n.diamants} diamants pour ${n.ilEnFaut} exigés — `
            + 'aucun ne peut être laissé');
        assert.ok(def.secondes >= 60,
            `tableau ${i + 1} : ${def.secondes} s, c'est trop court pour explorer`);
    });
});

test('ET LES TROIS TABLEAUX SE FINISSENT VRAIMENT', () => {
    // LA SEULE ÉPREUVE QUI DIT QUE LE JEU EST JOUABLE. Un robot qui ne regarde
    // pas plus loin que le diamant suivant doit y arriver — voir
    // `js/core/boulderRobot.js` pour pourquoi c'est une condition suffisante
    // et non nécessaire, et pourquoi c'est la bonne exigence ici.
    NIVEAUX.forEach((def, i) => {
        const r = faireJouer(def);
        assert.equal(r.gagne, true,
            `tableau ${i + 1} — ${def.nom} : ${r.pourquoi}`);
        // ET IL RESTE DU TEMPS : un robot qui gagne à la dernière seconde veut
        // dire qu'un élève, lui, n'y arrivera pas.
        const sec = r.pas * 0.15;
        assert.ok(sec < def.secondes * 0.5,
            `tableau ${i + 1} : le robot met ${sec.toFixed(0)} s sur ${def.secondes} — `
            + 'il ne reste pas de marge pour un élève qui cherche');
    });
});
