import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    construirePyramide, triangles, propager, creerPyramideNombres, saisieInitialePN,
    estResoluePN, casesFaussesPN, prochaineCase, qualitePN, TAILLES_PN, DIFFICULTES_PN
} from '../js/core/pyramideNombres.js';
import { pyramideNombresFicheGenerator as G } from '../js/core/generators/pyramideNombresFiche.js';

const TAILLES = Object.keys(TAILLES_PN);
const DIFFS = Object.keys(DIFFICULTES_PN);

test('chaque case est la somme des deux du dessous', () => {
    const l = construirePyramide([1, 2, 3, 4]);
    assert.deepEqual(l, [[1, 2, 3, 4], [3, 5, 7], [8, 12], [20]]);
    // Le sommet d'une base de quatre vaut a + 3b + 3c + d : 1 + 6 + 9 + 4 = 20.
    assert.equal(l[3][0], 1 + 3 * 2 + 3 * 3 + 4);
    assert.deepEqual(construirePyramide([5]), [[5]]);
});

test('les petits triangles sont bien ceux de la règle', () => {
    const l = construirePyramide([1, 2, 3]);
    const t = triangles(l);
    assert.equal(t.length, 3, 'deux triangles au premier étage, un au second');
    t.forEach(tr => {
        const g = l[tr.gauche[0]][tr.gauche[1]];
        const d = l[tr.droite[0]][tr.droite[1]];
        const h = l[tr.haut[0]][tr.haut[1]];
        assert.equal(g + d, h, `${g} + ${d} ≠ ${h}`);
    });
});

test('la propagation monte en additionnant ET descend en soustrayant', () => {
    const l = construirePyramide([2, 5, 3]);   // [[2,5,3],[7,8],[15]]
    // Seule la base : tout se déduit vers le haut.
    const versLeHaut = [[2, 5, 3], [null, null], [null]];
    assert.equal(propager(l, versLeHaut), 'fini');
    assert.deepEqual(versLeHaut, l);
    // Le sommet et un côté : il faut soustraire pour redescendre.
    const versLeBas = [[2, null, null], [7, null], [15]];
    assert.equal(propager(l, versLeBas), 'fini');
    assert.deepEqual(versLeBas, l);
    // Trop peu : la propagation reste bloquée sans inventer de valeur.
    const maigre = [[null, null, null], [null, null], [15]];
    assert.equal(propager(l, maigre), 'bloque');
});

test('une saisie contradictoire est signalée, pas rafistolée', () => {
    // Trois cases connues d'un même triangle qui ne s'accordent pas : c'est
    // une faute de l'élève, et la propagation doit le dire plutôt que
    // d'écraser silencieusement l'une des trois.
    const l = construirePyramide([2, 5]);
    assert.equal(propager(l, [[2, 5], [99]]), 'impossible');
});

test('toute grille tirée se déduit ENTIÈREMENT, sans jamais tâtonner', () => {
    // C'est la règle de la maison pour tous les puzzles : un élève qui doit
    // essayer un nombre pour voir n'apprend pas ce qu'on voulait lui apprendre.
    for (const taille of TAILLES) {
        for (const difficulte of DIFFS) {
            for (let i = 0; i < 8; i++) {
                const p = creerPyramideNombres({
                    taille, difficulte, rng: makeRng(`d-${taille}-${difficulte}-${i}`)
                });
                const connu = saisieInitialePN(p);
                assert.equal(propager(p.lignes, connu), 'fini',
                    `${taille}/${difficulte} #${i} : la propagation reste bloquée`);
                assert.deepEqual(connu, p.lignes,
                    `${taille}/${difficulte} #${i} : elle trouve autre chose`);
            }
        }
    }
});

test('aucune case donnée n\'est inutile', () => {
    // Une case donnée dont on peut se passer fait travailler pour rien, et
    // laisse croire que l'énoncé en dit plus qu'il n'en dit.
    for (const taille of TAILLES) {
        for (const difficulte of ['melange', 'soustraction']) {
            for (let i = 0; i < 5; i++) {
                const p = creerPyramideNombres({
                    taille, difficulte, rng: makeRng(`m-${taille}-${difficulte}-${i}`)
                });
                p.donnes.forEach((l, k) => l.forEach((donne, j) => {
                    if (!donne) return;
                    const connu = p.lignes.map((ll, kk) => ll.map((v, jj) =>
                        (p.donnes[kk][jj] && !(kk === k && jj === j) ? v : null)));
                    assert.notEqual(propager(p.lignes, connu), 'fini',
                        `${taille}/${difficulte} #${i} : la case (${k},${j}) ne sert à rien`);
                }));
            }
        }
    }
});

test('les trois difficultés font vraiment trois exercices différents', () => {
    // « Mélange » et « surtout le haut » ont longtemps donné des grilles
    // indiscernables : les deux pesaient les étages de la même façon, et
    // l'élève à qui l'on annonçait le réglage plus facile recevait l'autre.
    const moyenne = (difficulte) => {
        let s = 0;
        for (let i = 0; i < 20; i++) {
            s += qualitePN(creerPyramideNombres({
                taille: 'moyenne', difficulte, rng: makeRng(`s-${difficulte}-${i}`)
            })).soustractions;
        }
        return s / 20;
    };
    const add = moyenne('addition'), mel = moyenne('melange'), sous = moyenne('soustraction');
    assert.equal(add, 0, 'la base donnée ne doit demander aucune soustraction');
    assert.ok(mel > 2, `« mélange » ne fait soustraire que ${mel} fois`);
    assert.ok(sous > mel + 1, `« surtout le haut » (${sous}) ne se distingue pas de « mélange » (${mel})`);
});

test('« la base est donnée » donne exactement la base', () => {
    for (const taille of TAILLES) {
        const p = creerPyramideNombres({ taille, difficulte: 'addition', rng: makeRng('a' + taille) });
        assert.ok(p.donnes[0].every(Boolean), 'toute la base doit être donnée');
        assert.ok(p.donnes.slice(1).every(l => l.every(v => !v)), 'et rien d\'autre');
    }
});

test('tous les nombres restent positifs, et le sommet raisonnable', () => {
    // Un nombre négatif au milieu d'une pyramide de sixième n'est pas une
    // difficulté, c'est une erreur ; et un sommet à quatre chiffres transforme
    // l'exercice en travail de retenues.
    for (const taille of TAILLES) {
        for (let i = 0; i < 10; i++) {
            const p = creerPyramideNombres({ taille, rng: makeRng(`p-${taille}-${i}`) });
            p.lignes.flat().forEach(v => assert.ok(v > 0, `valeur ${v}`));
            assert.ok(qualitePN(p).sommet <= 250, `sommet ${qualitePN(p).sommet}`);
        }
    }
});

test('la saisie de départ n\'est jamais gagnante, et la solution l\'est toujours', () => {
    for (let i = 0; i < 10; i++) {
        const p = creerPyramideNombres({ rng: makeRng('g' + i) });
        assert.equal(estResoluePN(p, saisieInitialePN(p)), false);
        assert.equal(estResoluePN(p, p.lignes.map(l => l.slice())), true);
        assert.deepEqual(casesFaussesPN(p, saisieInitialePN(p)), [],
            'une case donnée passe pour fausse');
    }
});

test('les cases fausses sont celles qui sont écrites ET différentes', () => {
    const p = creerPyramideNombres({ taille: 'petite', rng: makeRng('f') });
    const s = saisieInitialePN(p);
    // Une case vide n'est pas une faute : elle n'est pas encore remplie.
    assert.equal(casesFaussesPN(p, s).length, 0);
    const k = p.donnes.findIndex(l => l.some(v => !v));
    const i = p.donnes[k].findIndex(v => !v);
    s[k][i] = p.lignes[k][i] + 1;
    assert.deepEqual(casesFaussesPN(p, s), [[k, i]]);
    s[k][i] = p.lignes[k][i];
    assert.deepEqual(casesFaussesPN(p, s), []);
});

test('l\'indice montre un triangle et écrit son calcul', () => {
    const p = creerPyramideNombres({ taille: 'moyenne', difficulte: 'addition', rng: makeRng('i') });
    const s = saisieInitialePN(p);
    const c = prochaineCase(p, s);
    assert.ok(c, 'aucune case déductible sur une grille jouable');
    // La base est donnée : la première déduction monte forcément.
    assert.equal(c.sens, 'monter');
    assert.match(c.calcul, /^\d+ \+ \d+ = \d+$/);
    assert.equal(c.valeur, p.lignes[c.ou[0]][c.ou[1]]);

    // Sur une grille à trous, il finit par falloir descendre.
    const q = creerPyramideNombres({ taille: 'moyenne', difficulte: 'soustraction', rng: makeRng('i2') });
    const sq = saisieInitialePN(q);
    let vuDescendre = false;
    for (let n = 0; n < 40; n++) {
        const d = prochaineCase(q, sq);
        if (!d) break;
        if (d.sens === 'descendre') {
            vuDescendre = true;
            assert.match(d.calcul, /^\d+ − \d+ = \d+$/, 'le vrai signe moins, pas un tiret');
        }
        assert.equal(d.valeur, q.lignes[d.ou[0]][d.ou[1]], 'l\'indice donne une valeur fausse');
        sq[d.ou[0]][d.ou[1]] = d.valeur;
    }
    assert.ok(vuDescendre, 'aucune soustraction sur une grille « surtout le haut »');
    assert.ok(estResoluePN(q, sq), 'les indices seuls ne finissent pas la pyramide');
});

test('l\'indice ne rend rien quand tout est rempli', () => {
    const p = creerPyramideNombres({ taille: 'petite', rng: makeRng('z') });
    assert.equal(prochaineCase(p, p.lignes.map(l => l.slice())), null);
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ taille: 'moyenne', difficulte: 'melange' },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.lignes.length, 5);
    assert.equal(m.lignes[0].length, 5);
    assert.equal(m.lignes[4].length, 1);
    assert.equal(Number(it.answer), m.sommet);
    // Le corrigé donne la BASE : elle suffit à tout reconstruire, et c'est
    // justement ce qu'on veut faire remarquer.
    assert.ok(it.explanation.includes(m.base.join(' · ')));
    assert.deepEqual(construirePyramide(m.base), m.lignes);
});

test('un réglage farfelu retombe sur la pyramide par défaut', () => {
    const it = G.generate({ taille: 'énorme', difficulte: 'impossible' },
        { rng: makeRng('bof'), index: 0 });
    assert.equal(it.meta.taille, 'moyenne');
    assert.equal(it.meta.difficulte, 'melange');
});

test('deux graines donnent deux pyramides différentes', () => {
    const vues = new Set(Array.from({ length: 12 }, (_, i) =>
        JSON.stringify(creerPyramideNombres({ rng: makeRng('v' + i) }).lignes[0])));
    assert.ok(vues.size >= 10, `${vues.size} bases différentes sur douze`);
});
