// Le logigramme : une seule solution, atteignable sans jamais deviner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    THEMES, NIVEAUX, genererLogigramme, resoudre, verifierSaisie,
    creerEtats, lire, OUI, NON, INCONNU, direIndice, etiquette
} from '../js/core/logigramme.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (niveau, graine) => genererLogigramme({ niveau }, makeRng(graine));

/** La grille attendue, déduite de la solution du puzzle. */
const attendu = (p, a, i, b, j) =>
    p.solution.findIndex(e => e[a] === i) === p.solution.findIndex(e => e[b] === j) ? OUI : NON;

test('chaque niveau se résout par déduction pure, et sur LA bonne solution', () => {
    // C'est l'exigence centrale : si le solveur — qui ne fait que propager, sans
    // jamais essayer une hypothèse — remplit toute la grille, alors la solution
    // est unique ET un élève peut la trouver sans deviner.
    for (const niv of NIVEAUX) {
        for (let g = 0; g < 12; g++) {
            const p = tirer(niv.id, `n${niv.id}-${g}`);
            const r = resoudre(p);
            assert.ok(r.complet, `niveau ${niv.id}, graine ${g} : grille non résolue`);
            const n = p.categories[0].valeurs.length;
            for (let a = 0; a < p.categories.length; a++) {
                for (let b = a + 1; b < p.categories.length; b++) {
                    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                        assert.equal(lire(r.etats, a, i, b, j), attendu(p, a, i, b, j),
                            `niveau ${niv.id}, graine ${g} : la déduction ne tombe pas sur la solution`);
                    }
                }
            }
        }
    }
});

test('aucun indice n\'est de trop', () => {
    // Un indice dont on peut se passer est une déduction volée à l'élève.
    for (const niv of NIVEAUX) {
        const p = tirer(niv.id, `min-${niv.id}`);
        assert.ok(p.indices.length >= 1);
        p.indices.forEach((_, k) => {
            const sans = p.indices.filter((__, x) => x !== k);
            assert.ok(!resoudre({ categories: p.categories, indices: sans }).complet,
                `niveau ${niv.id} : l'indice ${k + 1} ne sert à rien`);
        });
    }
});

test('la difficulté monte vraiment', () => {
    // Trois choses la font monter, et le générateur doit les respecter : la
    // taille de la grille, le nombre de colonnes à croiser, le type d'indices.
    const tailles = NIVEAUX.map(n => n.entites * n.categories);
    for (let i = 1; i < tailles.length; i++) {
        assert.ok(tailles[i] >= tailles[i - 1], 'la grille ne doit jamais rétrécir');
    }
    // Le premier niveau donne au moins une réponse toute faite ; le troisième
    // n'en donne plus aucune.
    const facile = tirer(1, 'd1');
    assert.ok(facile.indices.some(i => i.type === 'egal'));
    const dur = tirer(3, 'd3');
    assert.ok(!dur.indices.some(i => i.type === 'egal'),
        'à partir du niveau 3, aucune réponse n\'est donnée directement');
});

test('le même tirage donne le même logigramme', () => {
    const a = tirer(4, 'stable');
    const b = tirer(4, 'stable');
    assert.deepEqual(a.solution, b.solution);
    assert.deepEqual(a.indices.map(i => i.texte), b.indices.map(i => i.texte));
});

test('les énoncés sont en français correct', () => {
    for (const niv of NIVEAUX) {
        for (let g = 0; g < 10; g++) {
            const p = tirer(niv.id, `fr${niv.id}-${g}`);
            for (const ind of p.indices) {
                const t = ind.texte;
                assert.ok(t && t.length > 8, `indice vide : « ${t} »`);
                assert.match(t, /\.$/, `pas de point final : « ${t} »`);
                assert.match(t[0], /[A-ZÀÉÈÊÎÔÇ]/, `pas de majuscule : « ${t} »`);
                // « plus âgé que Adam » ne s'écrit pas.
                assert.ok(!/\bque [aeiouyâàéèêîôùûAEIOUYÀÂÉÈÊÎÔÙÛ]/.test(t), `élision manquée : « ${t} »`);
                // Après une négation, le partitif tombe : « pas de judo ».
                assert.ok(!/pas (du|de la|de l'|des) /.test(t), `partitif après négation : « ${t} »`);
                assert.ok(!t.includes('undefined') && !t.includes('NaN'), `trou dans la phrase : « ${t} »`);
            }
        }
    }
});

test('aucun énoncé glauque : ni vol, ni crime, ni disparition', () => {
    // Demande explicite, et elle n'est pas cosmétique : un exercice de logique
    // n'a pas besoin d'un cadavre pour être intéressant.
    const INTERDIT = /vol|voleur|meurtr|crime|mort|tué|cadavre|assassin|disparu|enquêt|coupable|suspect|police|arme|poison/i;
    for (const theme of THEMES) {
        const mots = [theme.titre, theme.decor,
            ...theme.attributs.flatMap(a => [...(a.valeurs || []), a.verbe, a.verbeNeg])].join(' ');
        assert.ok(!INTERDIT.test(mots), `thème « ${theme.id} » : vocabulaire à proscrire`);
    }
    for (const niv of NIVEAUX) {
        for (let g = 0; g < 6; g++) {
            const p = tirer(niv.id, `g${niv.id}-${g}`);
            p.indices.forEach(i => assert.ok(!INTERDIT.test(i.texte), `indice glauque : « ${i.texte} »`));
        }
    }
});

test('la vérification accepte la grille juste et refuse la fausse', () => {
    const p = tirer(3, 'verif');
    const n = p.categories[0].valeurs.length;
    const nc = p.categories.length;

    // Une grille remplie exactement comme la solution.
    const juste = creerEtats(nc, n);
    for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            juste[`${a}|${b}`][i][j] = attendu(p, a, i, b, j);
        }
    }
    assert.ok(verifierSaisie(p, juste).ok);

    // Une grille à moitié faite : juste, mais pas finie.
    const partielle = creerEtats(nc, n);
    partielle['0|1'][0][p.solution[0][1]] = OUI;
    const bilan = verifierSaisie(p, partielle);
    assert.ok(!bilan.ok);
    assert.equal(bilan.fautes.length, 0, 'une case non remplie n\'est pas une faute');

    // Un rond au mauvais endroit.
    const fausse = creerEtats(nc, n);
    const mauvais = (p.solution[0][1] + 1) % n;
    fausse['0|1'][0][mauvais] = OUI;
    assert.equal(verifierSaisie(p, fausse).fautes.length, 1);
});

test('le journal des déductions explique chaque case', () => {
    // C'est lui qui permet au robot de montrer, et à l'élève bloqué de
    // recevoir la déduction suivante plutôt que la réponse.
    const p = tirer(2, 'journal');
    const r = resoudre(p);
    assert.ok(r.etapes.length > 5);
    r.etapes.forEach(e => {
        assert.ok(e.raison && e.raison.length > 10, 'une déduction sans raison n\'explique rien');
        assert.ok(e.val === OUI || e.val === NON);
    });
    // La première déduction vient forcément d'un indice, pas d'une règle de grille.
    assert.match(r.etapes[0].raison, /indice/);
});

test('les en-têtes de la grille tiennent en peu de place', () => {
    // Une colonne de grille fait quelques millimètres : « la glace à la
    // vanille » n'y entre pas, « vanille » oui.
    for (const theme of THEMES) {
        for (const at of theme.attributs) {
            const cat = { ...at };
            (cat.valeurs || cat.nombres).forEach((_, i) => {
                assert.ok(etiquette(cat, i).length <= 14,
                    `étiquette trop longue : « ${etiquette(cat, i)} »`);
            });
        }
    }
});

test('un indice se relit tout seul', () => {
    const p = tirer(5, 'relire');
    p.indices.forEach(ind => {
        assert.equal(direIndice(ind, p.categories), ind.texte);
    });
    assert.ok([INCONNU, OUI, NON].every(Number.isInteger));
});

// --- Sur le papier ----------------------------------------------------------

import { logigrammeGenerator } from '../js/core/generators/logigramme.js';

test('le générateur pose un logigramme complet sur la feuille', () => {
    for (let g = 1; g <= 12; g++) {
        const it = logigrammeGenerator.generate({ niveau: (g % 6) + 1 }, { rng: makeRng(`pap${g}`), index: g });
        const p = it.meta;
        assert.ok(p.categories && p.indices.length, 'le puzzle voyage avec l\'item');
        assert.ok(resoudre(p).complet, 'et il reste résoluble par déduction pure');
        // La correction imprimée doit lister la solution, ligne par ligne.
        assert.equal(it.explanation.split(' ; ').length, p.categories[0].valeurs.length);
        assert.ok(!/undefined/.test(it.explanation));
    }
});
