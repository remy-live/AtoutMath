import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { fenVersEtat, coups, jouer, enEchec } from '../js/core/echecs.js';
import {
    PROBLEMES, preparer, matsEn, matsEnUn, estMat, nommerCoup,
    defense, piecesDe, nomCase, indiceDe, tirerProbleme, critiquer
} from '../js/core/mat.js';

// --- Ce que « mat » veut dire ---------------------------------------------------

test('mat = aucun coup légal ET en échec ; sans échec, c\'est un pat', () => {
    // Le mat du couloir, joué.
    const e = fenVersEtat('6k1/5ppp/8/8/8/8/8/R5K1 w - -');
    const ta8 = coups(e).find(c => nommerCoup(e, c) === 'Ta8#');
    assert.ok(ta8, 'Ta8 n\'est pas trouvé parmi les coups légaux');
    assert.equal(estMat(jouer(e, ta8)), true);

    // Le pat : les Noirs n'ont plus un coup, mais ne sont pas en échec.
    const pat = fenVersEtat('7k/5Q2/6K1/8/8/8/8/8 b - -');
    assert.equal(coups(pat).length, 0);
    assert.equal(enEchec(pat, 'N'), false);
    assert.equal(estMat(pat), false, 'un pat compté comme un mat serait un mensonge');
});

// --- LA BIBLIOTHÈQUE ------------------------------------------------------------

test('CHAQUE PROBLÈME A UNE SOLUTION, ET UNE SEULE', () => {
    // C'est l'invariant qui rend la bibliothèque écrivable à la main : un
    // problème à deux solutions donnerait tort à l'élève qui trouve l'autre.
    for (const p of PROBLEMES) {
        const q = preparer(p);
        assert.equal(q.solutions.length, 1,
            `« ${p.theme} » (${p.id}) : ${q.solutions.length} solutions — ${q.notations.join(', ')}`);
    }
});

test('la longueur annoncée est la vraie longueur', () => {
    for (const p of PROBLEMES) {
        const etat = fenVersEtat(p.fen);
        if (p.coups === 2) {
            // Un « mat en deux » ne doit pas se résoudre en un seul coup :
            // l'énoncé serait faux, et l'élève qui trouve le mat en un aurait
            // raison contre la correction.
            assert.equal(matsEnUn(etat).length, 0,
                `« ${p.theme} » se mate en UN coup, pas en deux`);
        }
        assert.ok(matsEn(etat, p.coups).length > 0, `« ${p.theme} » n'a pas de mat en ${p.coups}`);
    }
});

test('toutes les positions sont LÉGALES : les Noirs n\'y sont pas déjà en échec', () => {
    // Une position où le camp qui ne joue pas est en échec ne peut pas exister
    // dans une partie — et le « mat » qu'on y trouve prend le roi.
    for (const p of PROBLEMES) {
        const etat = fenVersEtat(p.fen);
        assert.equal(etat.trait, 'B', `${p.id} : ce n'est pas aux Blancs de jouer`);
        assert.equal(enEchec(etat, 'N'), false, `${p.id} : position illégale, les Noirs sont en échec`);
        assert.ok(coups(etat).length > 0, `${p.id} : les Blancs n'ont aucun coup`);
    }
});

test('chaque problème porte un thème et une leçon', () => {
    const ids = new Set();
    for (const p of PROBLEMES) {
        assert.ok(!ids.has(p.id), `id en double : ${p.id}`);
        ids.add(p.id);
        assert.ok(p.theme && p.theme.length > 3, `${p.id} sans thème`);
        assert.ok(p.lecon && p.lecon.length > 60, `${p.id} sans leçon digne de ce nom`);
        assert.ok([1, 2].includes(p.coups));
    }
    assert.ok(PROBLEMES.filter(p => p.coups === 1).length >= 5);
    assert.ok(PROBLEMES.filter(p => p.coups === 2).length >= 3);
});

// --- La recherche ----------------------------------------------------------------

test('un mat en deux ne se contente pas d\'UNE défense : il les bat toutes', () => {
    const p = PROBLEMES.find(x => x.id === 'cage-tour');
    const etat = fenVersEtat(p.fen);
    const [premier] = matsEn(etat, 2);
    const apres = jouer(etat, premier);
    const reponses = coups(apres);
    assert.ok(reponses.length > 0, 'les Noirs n\'ont plus de coup : ce serait un pat');
    reponses.forEach(r => {
        assert.ok(matsEnUn(jouer(apres, r)).length > 0,
            `après ${nommerCoup(apres, r)}, il n'y a pas de mat en un`);
    });
});

test('un coup qui mate tout de suite ne compte pas comme mat en deux', () => {
    const etat = fenVersEtat('6k1/5ppp/8/8/8/8/8/R5K1 w - -');
    assert.equal(matsEnUn(etat).length, 1);
    // Ta8 mate immédiatement : ce n'est pas une solution du « mat en deux ».
    const deux = matsEn(etat, 2).map(c => nommerCoup(etat, c));
    assert.ok(!deux.includes('Ta8#'));
});

// --- La notation ------------------------------------------------------------------

test('la notation française nomme la pièce, la prise, l\'échec et le mat', () => {
    const e = fenVersEtat('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq -');
    const c = matsEnUn(e)[0];
    assert.equal(nommerCoup(e, c), 'Dxf7#', 'la dame prend en f7 et mate');
});

test('deux pièces sur la même case : la notation précise LAQUELLE', () => {
    // Deux tours peuvent aller en d7 : « Td7 » serait ambigu, donc faux.
    const e = fenVersEtat('k7/1R2R3/8/8/8/K7/8/8 w - -');
    const versD7 = coups(e).filter(c => nomCase(c.vers) === 'd7');
    assert.equal(versD7.length, 2);
    const noms = versD7.map(c => nommerCoup(e, c)).sort();
    assert.deepEqual(noms, ['Tbd7', 'Ted7']);
});

test('les cases se nomment comme un repère : la lettre puis le chiffre', () => {
    assert.equal(nomCase(0), 'a8');
    assert.equal(nomCase(63), 'h1');
    assert.equal(indiceDe('a8'), 0);
    assert.equal(indiceDe('e4'), 36);
    for (let i = 0; i < 64; i++) assert.equal(indiceDe(nomCase(i)), i);
});

// --- Jouer ------------------------------------------------------------------------

test('la défense noire choisie est celle qui laisse le plus de jeu', () => {
    const p = preparer(PROBLEMES.find(x => x.id === 'cage-dame'));
    const apres = jouer(p.etat, p.solutions[0]);
    const d = defense(apres);
    assert.ok(d, 'aucune défense trouvée');
    const combien = (c) => coups(jouer(apres, c)).length;
    const meilleur = Math.max(...coups(apres).map(combien));
    assert.equal(combien(d), meilleur);
});

test('les pièces se listent avec leur case, pour l\'écran comme pour la fiche', () => {
    const p = preparer(PROBLEMES.find(x => x.id === 'baiser-dame'));
    const pieces = piecesDe(p.etat);
    assert.equal(pieces.length, 3);
    const roiNoir = pieces.find(x => x.type === 'K' && x.noir);
    assert.equal(roiNoir.case, 'a8');
    assert.deepEqual([roiNoir.x, roiNoir.y], [0, 0]);
    assert.equal(pieces.find(x => x.type === 'Q').noir, false);
});

test('le tirage rend un problème du bon type, et sait éviter ceux déjà vus', () => {
    const a = tirerProbleme({ rng: makeRng('a'), coups: 2 });
    assert.equal(a.coups, 2);
    assert.equal(a.solutions.length, 1);
    const vus = PROBLEMES.filter(p => p.coups === 1).map(p => p.id).slice(0, -1);
    const b = tirerProbleme({ rng: makeRng('b'), coups: 1, exclus: vus });
    assert.ok(!vus.includes(b.id), 'un problème déjà vu est ressorti');
});

// --- La critique d'un coup raté ----------------------------------------------------

test('un coup raté est CRITIQUÉ, pas seulement refusé', () => {
    const p = preparer(PROBLEMES.find(x => x.id === 'couloir-tour'));
    const nomme = (t) => coups(p.etat).find(c => nommerCoup(p.etat, c) === t);

    // Un coup qui n'attaque rien.
    const rien = critiquer(p.etat, nomme('Rf1') || nomme('Rf2') || coups(p.etat)[0], 1);
    assert.ok(['pas-echec', 'pat'].includes(rien.raison));

    // Ta8 : c'est LE mat.
    assert.equal(critiquer(p.etat, nomme('Ta8#'), 1).raison, 'bon');
});

test('« il s\'échappe » nomme la case de fuite', () => {
    // Roi noir en h8 sans pions : un échec sur la rangée le laisse filer.
    const e = fenVersEtat('7k/8/8/8/8/8/8/R5K1 w - -');
    const ta8 = coups(e).find(c => nommerCoup(e, c) === 'Ta8+');
    const c = critiquer(e, ta8, 1);
    assert.equal(c.raison, 'fuite');
    // On n'impose pas LAQUELLE des cases : on exige qu'elle en soit vraiment
    // une. Figer « h7 » ferait échouer le test le jour où l'ordre des coups
    // change, sans que rien ne soit cassé.
    const apres = jouer(e, ta8);
    const fuites = coups(apres).map(r => nomCase(r.vers));
    assert.ok(fuites.includes(c.detail), `${c.detail} n'est pas une case de fuite (${fuites})`);
});

test('le PAT est nommé pour ce qu\'il est : une nulle, pas un mat', () => {
    // Les Noirs n'auront plus de coup et ne seront pas en échec.
    const e = fenVersEtat('7k/8/6K1/8/8/8/8/5Q2 w - -');
    const df7 = coups(e).find(c => nommerCoup(e, c) === 'Df7');
    assert.ok(df7);
    assert.equal(critiquer(e, df7, 1).raison, 'pat');
});

test('dans un mat en deux, on nomme LA défense qui tient', () => {
    const p = preparer(PROBLEMES.find(x => x.id === 'cage-tour'));
    const mauvais = coups(p.etat).find(c => c !== p.solutions[0]
        && nommerCoup(p.etat, c).startsWith('T'));
    const c = critiquer(p.etat, mauvais, 2);
    assert.equal(c.raison, 'defense');
    assert.ok(c.detail && c.detail.length > 1, 'la défense doit être écrite');
});

// --- LA BIBLIOTHÈQUE DE CENT POSITIONS ------------------------------------------

test('les cent neuf positions tiennent leurs trois promesses', async () => {
    // Légale, solution unique, longueur exacte. On les repasse TOUTES au
    // solveur à chaque exécution : un fichier de données ne peut pas se
    // dégrader en silence, et une position fausse est pire qu'une absente.
    const { POSITIONS_MAT, FAMILLES_MAT, COMBIEN_MAT } = await import('../js/data/matProblemes.js');
    assert.ok(POSITIONS_MAT.length >= 100, `${POSITIONS_MAT.length} positions seulement`);
    assert.equal(COMBIEN_MAT.total, POSITIONS_MAT.length);

    const ids = new Set();
    for (const p of POSITIONS_MAT) {
        assert.ok(!ids.has(p.id), `id en double : ${p.id}`);
        ids.add(p.id);
        assert.ok(FAMILLES_MAT[p.famille], `${p.id} : famille inconnue`);

        const etat = fenVersEtat(p.fen);
        assert.equal(etat.trait, 'B', `${p.id} : ce n'est pas aux Blancs de jouer`);
        assert.equal(enEchec(etat, 'N'), false, `${p.id} : illégale, les Noirs sont déjà en échec`);
        if (p.coups === 2) {
            assert.equal(matsEnUn(etat).length, 0, `${p.id} : annoncée en deux, se mate en un`);
        }
        const s = matsEn(etat, p.coups);
        assert.equal(s.length, 1, `${p.id} : ${s.length} solutions`);
        assert.equal(nommerCoup(etat, s[0]), p.solution,
            `${p.id} : la solution écrite ne correspond pas`);
    }
});

test('la progression va du plus simple au plus fourni, sans trou de niveau', async () => {
    const { POSITIONS_MAT, FAMILLES_MAT } = await import('../js/data/matProblemes.js');
    const niveaux = POSITIONS_MAT.map(p => p.niveau);
    // Rangées : on ne redescend jamais de niveau au fil de la liste.
    for (let i = 1; i < niveaux.length; i++) {
        assert.ok(niveaux[i] >= niveaux[i - 1], `niveau qui redescend à la position ${i}`);
    }
    // Les mats en un viennent tous avant les mats en deux.
    const dernierUn = POSITIONS_MAT.map(p => p.coups).lastIndexOf(1);
    const premierDeux = POSITIONS_MAT.map(p => p.coups).indexOf(2);
    assert.ok(dernierUn < premierDeux, 'un mat en deux se glisse avant la fin des mats en un');
    // Chaque famille porte une leçon digne de ce nom.
    Object.entries(FAMILLES_MAT).forEach(([id, f]) => {
        assert.ok(f.lecon.length > 80, `${id} : leçon trop courte`);
        assert.ok(f.titre.length > 5, `${id} : titre trop court`);
    });
});
