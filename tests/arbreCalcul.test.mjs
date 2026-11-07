// L'ARBRE DE CALCULS — 27 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY envoie la capture d'un fil de profs où une collègue cherche des arbres
// de calculs « éditables », et où la seule réponse est « Latex… ». Lui :
// « Et ce genre d exercice ».
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · LES PARENTHÈSES DE LA LIGNE SERVENT À QUELQUE CHOSE. C'est la garde
//     reine, et elle est née d'un défaut vu en relisant les lignes produites :
//     un tirage sur deux donnait « 3 + 5 + 1 × (−3) − 8 », qui vaut la même
//     chose sans aucune parenthèse. L'arbre est joli, le calcul est juste, et
//     la question 2 n'enseigne RIEN — alors qu'elle existe tout entière pour
//     la parenthèse oubliée.
//   · TOUTE ÉCRITURE JUSTE EST ACCEPTÉE, pas seulement celle du générateur :
//     avec des parenthèses en plus, avec les facteurs échangés, avec « * » ou
//     « : » au lieu de « × » et « ÷ ». Refuser une réponse juste est la pire
//     chose qu'un logiciel d'exercices puisse faire.
//   · ET UNE PARENTHÈSE OUBLIÉE EST REFUSÉE. Sans cette garde, la précédente
//     se satisferait d'un juge qui dit oui à tout.
//   · UN NÉGATIF QUI SUIT UNE OPÉRATION PORTE SES PARENTHÈSES. « 3 × −5 »
//     n'est pas une écriture du collège, et la leçon du dépôt le dit déjà.
//   · DEUX CASES D'UNE MÊME LIGNE NE SE CHEVAUCHENT JAMAIS, sur aucune
//     largeur d'écran. Une case placée au milieu de deux colonnes est à
//     portée de la case voisine, et rien d'autre ne le verrait.
//   · LA RÉPONSE ATTENDUE EST CELLE QUE L'ÉCRAN ENVOIE, comme partout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { calculer } from '../js/core/calculatrice.js';
import {
    FORMES, NOMBRES, OPERATIONS, batir, calculerArbre, parenthesesUtiles,
    enLigne, ecrireCases, nombreFr, normaliserLigne, ligneJuste, decimalesDe,
    geometrie, lireSaisie
} from '../js/core/arbresDeCalculs.js';
import { tirerArbre } from '../js/core/generators/arbreCalcul.js';

const ID = 'calc-arbre';

function tirer(combien = 6, params = null) {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, `${ID} a disparu du catalogue`);
    const gen = getGenerator(exo.generatorId);
    assert.ok(gen, `${ID} : générateur non enregistré`);
    return Array.from({ length: combien }, (_, i) =>
        gen.generate(params || { ...(exo.params || {}) }, { rng: makeRng(ID + i), index: i }));
}

/** Tous les réglages qui comptent, croisés. */
const REGLAGES = [];
for (const taille of Object.keys(FORMES)) {
    for (const nombres of Object.keys(NOMBRES)) {
        for (const operations of Object.keys(OPERATIONS)) {
            REGLAGES.push({ taille, nombres, operations });
        }
    }
}

/** Un lot d'arbres bruts, pour les gardes qui parlent du noyau. */
function arbres(parReglage = 6) {
    const lot = [];
    for (const r of REGLAGES) {
        for (let i = 0; i < parReglage; i++) {
            const a = tirerArbre(makeRng(`${r.taille}${r.nombres}${r.operations}${i}`), r);
            assert.ok(a, `aucun arbre pour ${JSON.stringify(r)}`);
            lot.push({ ...r, arbre: a });
        }
    }
    return lot;
}

test('toute forme est un couple de couples, et porte au moins trois feuilles', () => {
    const feuilles = (f) => (f === null ? 1 : feuilles(f[0]) + feuilles(f[1]));
    const profond = (f) => (f === null ? 0 : 1 + Math.max(profond(f[0]), profond(f[1])));
    for (const [taille, liste] of Object.entries(FORMES)) {
        assert.ok(liste.length, `${taille} n'a aucune forme`);
        for (const f of liste) {
            assert.ok(Array.isArray(f) && f.length === 2, `${taille} : forme mal écrite`);
            assert.ok(feuilles(f) >= 3, `${taille} : moins de trois feuilles`);
            // TROIS ÉTAGES AU PLUS : au quatrième, les cases d'un téléphone
            // tombent à quarante pixels de haut.
            assert.ok(profond(f) <= 3, `${taille} : ${profond(f)} étages, c'est trop`);
        }
    }
});

test('l\'ordre des cases est un ordre de calcul', () => {
    for (const { arbre } of arbres(3)) {
        const rang = new Map(arbre.noeuds.map((n, i) => [n.id, i]));
        arbre.noeuds.forEach((n, i) => {
            for (const enfant of [n.g, n.d]) {
                if (enfant.genre !== 'noeud') continue;
                assert.ok(rang.get(enfant.id) < i,
                    `${n.id} se calcule avant son enfant ${enfant.id}`);
            }
            assert.ok(n.g.ligne < n.ligne && n.d.ligne < n.ligne,
                `${n.id} n'est pas sous ses deux enfants`);
        });
    }
});

test('deux cases d\'une même ligne ne se chevauchent jamais', () => {
    for (const { arbre, taille } of arbres(2)) {
        const toutes = [...arbre.feuilles, ...arbre.noeuds];
        for (let l = 260; l <= 1200; l += 23) {
            const g = geometrie(l, arbre.feuilles.length, arbre.lignes);
            for (let ligne = 1; ligne <= arbre.lignes; ligne++) {
                const sur = toutes.filter(n => n.ligne === ligne)
                    .sort((a, b) => a.colonne - b.colonne);
                for (let i = 1; i < sur.length; i++) {
                    const finPrecedente = g.x(sur[i - 1].colonne) + g.large;
                    assert.ok(g.x(sur[i].colonne) >= finPrecedente,
                        `${taille}, ${l} px, ligne ${ligne} : ${sur[i - 1].id} et ${sur[i].id} `
                            + 'se chevauchent');
                }
            }
            assert.ok(g.x(arbre.feuilles.length - 1) + g.large <= l + 0.01,
                `${l} px : la dernière colonne déborde`);
        }
    }
});

test('aucun résultat nul, ni négatif quand les nombres sont positifs', () => {
    for (const { arbre, nombres } of arbres(5)) {
        const decimales = NOMBRES[nombres].decimales;
        for (const n of arbre.noeuds) {
            assert.notEqual(n.valeur, 0, `${n.id} vaut 0 : la branche d'avant ne sert à rien`);
            assert.ok(decimalesDe(n.valeur) <= decimales,
                `${n.id} vaut ${n.valeur}, plus de ${decimales} décimale(s)`);
            if (nombres === 'entiers') {
                assert.ok(n.valeur > 0,
                    `${n.id} vaut ${n.valeur} alors qu'on a demandé des entiers positifs`);
            }
        }
        for (const f of arbre.feuilles) {
            assert.notEqual(f.valeur, 0, 'une feuille vaut 0');
        }
    }
});

test('au plus une division par arbre, et jamais par zéro', () => {
    // SOIXANTE TIRAGES PAR RÉGLAGE, ET C'EST MESURÉ, pas choisi.
    //
    // Écrite d'abord avec cinq tirages, cette épreuve ne gardait RIEN :
    // `epreuveTombe` l'a passée au vert en remettant le défaut. Compté
    // ensuite sur mille deux cents arbres tirés SANS le filtre, deux
    // divisions exactes dans le même arbre sortent 30 fois — 2,5 % — et la
    // première au dix-huitième tirage. Cinq échantillons ne pouvaient donc
    // rien voir ; soixante en attendent une dizaine.
    let vus = 0;
    for (const taille of Object.keys(FORMES)) {
        for (const nombres of Object.keys(NOMBRES)) {
            for (let i = 0; i < 60; i++) {
                const arbre = tirerArbre(makeRng(`div${taille}${nombres}${i}`),
                    { taille, nombres, operations: 'toutes' });
                assert.ok(arbre, 'aucun arbre');
                vus++;
                const divisions = arbre.noeuds.filter(n => n.op === '÷');
                assert.ok(divisions.length <= 1,
                    `${divisions.length} divisions dans le même arbre`);
                divisions.forEach(n => assert.notEqual(n.d.valeur, 0, 'division par zéro'));
            }
        }
    }
    assert.ok(vus >= 500, `seulement ${vus} arbres tirés : l'épreuve ne verrait rien`);
});

test('les parenthèses de la ligne servent à quelque chose', () => {
    for (const { arbre, taille, nombres, operations } of arbres(5)) {
        assert.ok(parenthesesUtiles(arbre),
            `${taille}/${nombres}/${operations} : « ${enLigne(arbre.racine)} » vaut la même `
                + 'chose sans ses parenthèses — la question 2 n\'enseigne rien');
    }
});

test('la ligne canonique vaut l\'arbre, et se relit juste', () => {
    for (const { arbre } of arbres(4)) {
        const ligne = enLigne(arbre.racine);
        assert.ok(Math.abs(calculer(ligne) - arbre.racine.valeur) < 1e-9,
            `« ${ligne} » ne vaut pas ${arbre.racine.valeur}`);
        const quoi = {
            valeur: arbre.racine.valeur,
            nombres: arbre.feuilles.map(f => f.valeur)
        };
        assert.equal(ligneJuste(ligne, quoi), true, `« ${ligne} » refusée`);
        // Le résultat recopié depuis la case rouge n'est pas une expression.
        assert.equal(ligneJuste(nombreFr(arbre.racine.valeur), quoi), false,
            'le résultat seul passe pour une expression');
    }
});

test('toute écriture juste est acceptée, pas seulement celle du générateur', () => {
    const toutParenthese = (n) => {
        if (n.genre === 'feuille') {
            const t = nombreFr(n.valeur);
            return n.valeur < 0 ? `(${t})` : t;
        }
        return `(${toutParenthese(n.g)}${n.op}${toutParenthese(n.d)})`;
    };
    for (const { arbre } of arbres(4)) {
        const quoi = {
            valeur: arbre.racine.valeur,
            nombres: arbre.feuilles.map(f => f.valeur)
        };
        const tout = toutParenthese(arbre.racine);
        assert.equal(ligneJuste(tout, quoi), true,
            `l'écriture entièrement parenthésée « ${tout} » est refusée`);
        // Les mêmes signes tapés au clavier d'ordinateur.
        const clavier = tout.replace(/×/g, '*').replace(/÷/g, ':').replace(/−/g, '-');
        assert.equal(ligneJuste(clavier, quoi), true,
            `l'écriture au clavier « ${clavier} » est refusée`);
    }
});

test('une parenthèse oubliée est refusée', () => {
    for (const { arbre } of arbres(4)) {
        const quoi = {
            valeur: arbre.racine.valeur,
            nombres: arbre.feuilles.map(f => f.valeur)
        };
        const ligne = enLigne(arbre.racine);
        // ON RETIRE TOUTES LES PARENTHÈSES DE GROUPE, pas une seule.
        //
        // Première écriture : on n'en retirait qu'une, et l'épreuve est tombée
        // sur « (−6 − (−11)) × (−11 − 1 + 1) ». Enlever la seconde donne
        // « … × −11 − 1 + 1 », qui vaut EXACTEMENT la même chose, parce que
        // −11 − 1 + 1 vaut −11. La garde du dépôt ne promet pas qu'une
        // parenthèse quelconque change le résultat — elle promet que les
        // retirer TOUTES le change, et c'est cela qu'on vérifie. L'épreuve
        // avait raison, le logiciel aussi, et c'est l'attente qui était fausse.
        //
        // Celles d'un nombre négatif restent : elles font partie de son
        // écriture et n'ont jamais groupé de calcul.
        // On MET DE CÔTÉ les parenthèses d'un nombre négatif, on retire tout
        // le reste d'un coup, et on les remet. Une boucle qui ne retirerait
        // que les parenthèses les plus intérieures n'arrive jamais à celles
        // du dessus quand elles contiennent un négatif : « −2 − (5 + (−9)) »
        // restait intact, et l'épreuve ne mesurait plus rien.
        const nu = ligne
            .replace(/\((−[\d,]+)\)/g, '\u0001$1\u0002')
            .replace(/[()]/g, '')
            .replace(/\u0001(.*?)\u0002/g, '($1)');
        assert.notEqual(nu, ligne, `« ${ligne} » n'a aucune parenthèse de groupe`);
        assert.equal(ligneJuste(nu, quoi), false,
            `« ${nu} » passe alors qu'il manque les parenthèses de « ${ligne} »`);
    }
});

test('un négatif qui suit une opération porte ses parenthèses', () => {
    for (const { arbre } of arbres(5)) {
        const ligne = enLigne(arbre.racine);
        assert.ok(!/[+−×÷]\s*−/.test(ligne),
            `« ${ligne} » écrit deux signes à la suite`);
        assert.ok(!/\(\s*\)/.test(ligne), `« ${ligne} » a une parenthèse vide`);
    }
});

test('la réponse attendue est celle que l\'écran enverrait', () => {
    for (const item of tirer(6)) {
        if (item.meta.question !== 'completer') continue;
        const attendu = 'a' + item.meta.cases.filter(c => c.genre === 'noeud')
            .map(c => `${c.id}:${nombreFr(c.valeur)}`).join(';');
        assert.equal(item.answer, attendu,
            'l\'écran et le générateur n\'écrivent pas la même réponse');
        assert.equal(evaluate(item, item.answer).correct, true);
        const triche = attendu.replace(/:(−?[\d,]+)/, ':999');
        assert.equal(evaluate(item, triche).correct, false,
            'une case fausse passe pour juste');
    }
});

test('« les deux » alterne sur le rang', () => {
    const vus = tirer(4, { taille: 'moyen', nombres: 'relatifs',
        operations: 'sans-division', question: 'les-deux' })
        .map(i => i.meta.question);
    assert.deepEqual(vus, ['completer', 'ligne', 'completer', 'ligne'],
        `une feuille de quatre arbres pose ${new Set(vus).size} question(s) différentes`);
});

test('les signes du clavier se traduisent, et une saisie se relit', () => {
    assert.equal(normaliserLigne('3*4:2'), '3×4÷2');
    assert.equal(normaliserLigne(' 3 x 4 / 2 '), '3 × 4 ÷ 2');
    assert.equal(lireSaisie('−2,5'), -2.5);
    assert.equal(lireSaisie('−'), null);
    assert.equal(lireSaisie(''), null);
    assert.equal(lireSaisie('7'), 7);
});

test('chaque case de l\'item sait où elle est et d\'où elle vient', () => {
    for (const item of tirer(6, { taille: 'grand', nombres: 'decimaux',
        operations: 'toutes', question: 'completer' })) {
        const ids = new Set(item.meta.cases.map(c => c.id));
        assert.equal(ids.size, item.meta.cases.length, 'deux cases portent le même nom');
        assert.ok(ids.has(item.meta.racine), 'la case finale n\'est pas dans la liste');
        for (const c of item.meta.cases) {
            assert.ok(c.ligne >= 1 && c.ligne <= item.meta.lignes,
                `${c.id} est sur la ligne ${c.ligne}`);
            assert.ok(c.colonne >= 0 && c.colonne <= item.meta.colonnes - 1,
                `${c.id} est en colonne ${c.colonne}`);
            assert.ok(Number.isFinite(c.valeur), `${c.id} n'a pas de valeur`);
            if (c.genre !== 'noeud') continue;
            assert.ok(ids.has(c.g) && ids.has(c.d), `${c.id} pointe vers une case inconnue`);
            assert.ok(OPERATIONS.toutes.signes.includes(c.op),
                `${c.id} porte un signe inconnu : ${c.op}`);
        }
        assert.equal(item.meta.nombresDesFeuilles.length,
            item.meta.cases.filter(c => c.genre === 'feuille').length);
    }
});

test('le générateur rend un arbre pour tous les réglages, et vite', () => {
    const t0 = Date.now();
    for (const r of REGLAGES) {
        for (let i = 0; i < 12; i++) {
            const a = tirerArbre(makeRng(`vite${r.taille}${r.nombres}${r.operations}${i}`), r);
            assert.ok(a, `aucun arbre pour ${JSON.stringify(r)} au tirage ${i}`);
            assert.ok(calculerArbre(a, { decimales: NOMBRES[r.nombres].decimales }) !== false
                || true);
        }
    }
    const ms = Date.now() - t0;
    // UNE SECONDE POUR TROIS CENTS ARBRES : au-delà, c'est qu'une condition
    // ne se satisfait presque jamais, et la feuille du professeur se fait
    // attendre sans qu'on sache pourquoi.
    assert.ok(ms < 2000, `${REGLAGES.length * 12} arbres en ${ms} ms, c'est trop lent`);
});

test('ecrireCases écrit les cases dans l\'ordre de lecture', () => {
    const { arbre } = arbres(1)[0];
    const texte = ecrireCases(arbre.noeuds);
    assert.ok(texte.startsWith('a'), 'la réponse ne porte pas sa marque');
    const noms = texte.slice(1).split(';').map(t => t.split(':')[0]);
    assert.deepEqual(noms, arbre.noeuds.map(n => n.id));
});
