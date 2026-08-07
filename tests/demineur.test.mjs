import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CACHE, OUVERT, DRAPEAU, NIVEAUX, niveauDe, creerGrille, voisins, idx, xy,
    poserMines, ouvrir, ouvrirAutour, basculerDrapeau, drapeauxPoses, gagnee,
    contraintes, deduire, deductionsVisibles, resoudre, poserMinesDeductibles
} from '../js/core/demineur.js';
import { makeRng } from '../js/core/ids.js';

/** Une grille montée à la main : `#` une mine, `.` une case vide. */
function depuisTexte(lignes) {
    const cols = lignes[0].length;
    const g = creerGrille({ id: 'test', cols, lignes: lignes.length, mines: 0 });
    let mines = 0;
    lignes.forEach((l, y) => [...l].forEach((c, x) => {
        if (c === '#') { g.bombe[idx(g, x, y)] = 1; mines++; }
    }));
    g.mines = mines;
    for (let i = 0; i < g.bombe.length; i++) {
        g.voisines[i] = g.bombe[i] ? 0 : voisins(g, i).reduce((s, v) => s + g.bombe[v], 0);
    }
    g.posee = true;
    return g;
}

test('les voisines sont les huit cases autour, jamais celles d\'à côté sur la ligne suivante', () => {
    const g = creerGrille({ id: 't', cols: 4, lignes: 4, mines: 0 });
    assert.equal(voisins(g, idx(g, 0, 0)).length, 3, 'un coin a trois voisines');
    assert.equal(voisins(g, idx(g, 1, 0)).length, 5, 'un bord en a cinq');
    assert.equal(voisins(g, idx(g, 1, 1)).length, 8, 'le centre en a huit');
    // Le piège classique : la case 3 de la ligne 0 et la case 0 de la ligne 1
    // sont voisines dans le tableau, pas sur le plateau.
    assert.ok(!voisins(g, idx(g, 3, 0)).includes(idx(g, 0, 1)));
});

test('les chiffres comptent bien les mines voisines', () => {
    const g = depuisTexte([
        '#..',
        '.#.',
        '..#'
    ]);
    assert.equal(g.voisines[idx(g, 1, 0)], 2);
    assert.equal(g.voisines[idx(g, 2, 0)], 1);
    assert.equal(g.voisines[idx(g, 0, 2)], 1);
    assert.equal(g.voisines[idx(g, 2, 1)], 2);
});

test('le premier clic ne peut jamais toucher une mine, ni ses voisines', () => {
    for (let k = 0; k < 40; k++) {
        const g = creerGrille('debutant');
        const depart = k % (g.cols * g.lignes);
        poserMines(g, depart, makeRng('p' + k));
        assert.equal(g.bombe[depart], 0, 'une mine sous le premier clic');
        voisins(g, depart).forEach(v => assert.equal(g.bombe[v], 0, 'une mine collée au premier clic'));
        let n = 0;
        for (let i = 0; i < g.bombe.length; i++) n += g.bombe[i];
        assert.equal(n, g.mines, 'le compte de mines a changé');
    }
});

test('ouvrir une case vide déplie toute la zone jusqu\'aux chiffres', () => {
    const g = depuisTexte([
        '....',
        '....',
        '...#'
    ]);
    const r = ouvrir(g, idx(g, 0, 0));
    assert.equal(r.perdu, false);
    // Tout s'ouvre sauf la mine elle-même.
    assert.equal(r.ouvertes.length, 11);
    assert.equal(g.etat[idx(g, 3, 2)], CACHE, 'la mine s\'est ouverte');
    assert.equal(g.etat[idx(g, 2, 2)], OUVERT, 'le chiffre au bord de la zone doit s\'ouvrir');
});

test('ouvrir une mine perd la partie, et rien d\'autre ne s\'ouvre', () => {
    const g = depuisTexte(['#.', '..']);
    const r = ouvrir(g, idx(g, 0, 0));
    assert.equal(r.perdu, true);
    assert.deepEqual(r.ouvertes, [idx(g, 0, 0)]);
});

test('le drapeau protège la case d\'une ouverture', () => {
    const g = depuisTexte(['#.', '..']);
    basculerDrapeau(g, idx(g, 0, 0));
    assert.equal(drapeauxPoses(g), 1);
    const r = ouvrir(g, idx(g, 0, 0));
    assert.equal(r.perdu, false);
    assert.equal(r.ouvertes.length, 0);
    assert.equal(basculerDrapeau(g, idx(g, 0, 0)), CACHE, 'le drapeau doit s\'enlever');
});

test('la partie est gagnée quand toutes les cases sans mine sont ouvertes', () => {
    const g = depuisTexte(['#.', '..']);
    ouvrir(g, idx(g, 1, 0));
    ouvrir(g, idx(g, 0, 1));
    assert.equal(gagnee(g), false);
    ouvrir(g, idx(g, 1, 1));
    assert.equal(gagnee(g), true, 'la mine n\'a pas à être ouverte pour gagner');
});

test('le coup double n\'ouvre que si le compte des drapeaux est atteint', () => {
    const g = depuisTexte([
        '#..',
        '...',
        '...'
    ]);
    const centre = idx(g, 1, 1);
    ouvrir(g, centre);                       // un 1
    assert.equal(ouvrirAutour(g, centre).ouvertes.length, 0, 'sans drapeau, rien ne doit s\'ouvrir');
    basculerDrapeau(g, idx(g, 0, 0));
    const r = ouvrirAutour(g, centre);
    assert.equal(r.perdu, false);
    assert.equal(r.ouvertes.length, 7, 'les sept autres voisines s\'ouvrent');
});

test('le coup double sur un drapeau mal placé fait perdre — c\'est son prix', () => {
    const g = depuisTexte([
        '#..',
        '...',
        '...'
    ]);
    const centre = idx(g, 1, 1);
    ouvrir(g, centre);
    basculerDrapeau(g, idx(g, 2, 2));        // drapeau au mauvais endroit
    assert.equal(ouvrirAutour(g, centre).perdu, true);
});

test('règle 1 : un chiffre servi libère ses voisines', () => {
    const g = depuisTexte([
        '#..',
        '...',
        '...'
    ]);
    ouvrir(g, idx(g, 1, 1));
    basculerDrapeau(g, idx(g, 0, 0));
    const d = deduire(g);
    assert.equal(d.type, 'sur');
    assert.equal(d.regle, 'compte');
    assert.ok(d.cases.length >= 1);
    assert.ok(d.cases.every(c => !g.bombe[c]), 'une case annoncée sûre porte une mine');
});

test('règle 2 : il ne reste que des mines', () => {
    const g = depuisTexte([
        '##',
        '#.'
    ]);
    ouvrir(g, idx(g, 1, 1));                 // un 3, trois voisines cachées
    const d = deduire(g);
    assert.equal(d.type, 'mine');
    assert.equal(d.cases.length, 3);
    assert.ok(d.cases.every(c => g.bombe[c] === 1));
});

test('règle 3 : l\'inclusion conclut par soustraction', () => {
    // Le fameux « 1-2-1 » : ni le compte des drapeaux ni celui des cases
    // cachées ne conclut, seule l'inclusion d'un 1 dans un autre le fait.
    const g = depuisTexte([
        '.#.#.',
        '.....',
        '.....'
    ]);
    ouvrir(g, idx(g, 0, 2));                 // la zone du bas se déplie
    assert.equal(deduire(g).regle, 'inclusion');
    const d = deduire(g);
    assert.equal(d.type, 'sur');
    assert.deepEqual(d.cases, [idx(g, 2, 0)], 'la case du milieu est celle qui se déduit');
    assert.equal(d.sources.length, 2, 'deux chiffres portent le raisonnement');
    assert.match(d.texte, /comprises/);
});

test('une déduction ne se trompe jamais, sur mille situations tirées au hasard', () => {
    for (let k = 0; k < 120; k++) {
        const g = creerGrille('debutant');
        const depart = makeRng('r' + k).int(0, g.cols * g.lignes - 1);
        poserMines(g, depart, makeRng('m' + k));
        ouvrir(g, depart);
        for (let pas = 0; pas < 40; pas++) {
            const d = deduire(g);
            if (!d) break;
            d.cases.forEach(c => {
                assert.equal(!!g.bombe[c], d.type === 'mine',
                    `déduction fausse (${d.regle}) : ${JSON.stringify(xy(g, c))}`);
            });
            if (d.type === 'mine') d.cases.forEach(c => { if (g.etat[c] === CACHE) g.etat[c] = DRAPEAU; });
            else d.cases.forEach(c => ouvrir(g, c));
        }
    }
});

test('deductionsVisibles ne dit jamais le contraire de la carte', () => {
    for (let k = 0; k < 60; k++) {
        const g = creerGrille('confirme');
        const depart = 40 + k;
        poserMines(g, depart, makeRng('v' + k));
        ouvrir(g, depart);
        const { surs, mines } = deductionsVisibles(g);
        surs.forEach((_, c) => assert.equal(g.bombe[c], 0, 'une case dite sûre porte une mine'));
        mines.forEach((_, c) => assert.equal(g.bombe[c], 1, 'une case dite minée est vide'));
    }
});

test('chaque déduction porte une explication lisible', () => {
    const g = depuisTexte([
        '##',
        '#.'
    ]);
    ouvrir(g, idx(g, 1, 1));
    const d = deduire(g);
    assert.ok(d.texte.length > 30);
    assert.ok(/A1|B1|A2/.test(d.texte), 'l\'explication doit nommer les cases');
    const { mines } = deductionsVisibles(g);
    mines.forEach(t => assert.ok(typeof t === 'string' && t.length > 20));
});

test('les contraintes ignorent les cases déjà ouvertes et les zéros', () => {
    const g = depuisTexte([
        '#..',
        '...',
        '...'
    ]);
    ouvrir(g, idx(g, 2, 2));                 // une zone entière s'ouvre
    const cs = contraintes(g);
    assert.ok(cs.length > 0);
    cs.forEach(c => {
        assert.ok(g.voisines[c.source] > 0, 'un zéro n\'est pas une contrainte');
        assert.ok(c.cases.length > 0, 'une contrainte sans case cachée est inutile');
        c.cases.forEach(x => assert.equal(g.etat[x], CACHE));
    });
});

test('les grilles proposées se terminent par le raisonnement seul', () => {
    for (const n of NIVEAUX) {
        for (let k = 0; k < 6; k++) {
            const g = creerGrille(n);
            const depart = Math.floor(g.cols * g.lignes / 2) + k;
            const r = poserMinesDeductibles(g, depart, makeRng(`${n.id}_${k}`), 400);
            assert.equal(r.garanti, true, `${n.id} : aucune grille déductible en 400 essais`);
            assert.equal(resoudre(g, depart).fini, true, `${n.id} : la grille rendue n'est pas résoluble`);
        }
    }
});

test('les trois niveaux gardent les proportions du démineur d\'origine', () => {
    NIVEAUX.forEach(n => {
        const densite = n.mines / (n.cols * n.lignes);
        assert.ok(densite > 0.1 && densite < 0.25, `${n.id} : densité ${densite.toFixed(3)} hors des clous`);
        assert.ok(n.mines < n.cols * n.lignes - 9, 'il faut de la place pour le premier clic');
    });
    assert.equal(niveauDe('inconnu').id, 'debutant', 'un niveau inconnu retombe sur le plus simple');
});

test('même graine, même grille', () => {
    const a = creerGrille('debutant'), b = creerGrille('debutant');
    poserMines(a, 40, makeRng('z'));
    poserMines(b, 40, makeRng('z'));
    assert.deepEqual([...a.bombe], [...b.bombe]);
});
