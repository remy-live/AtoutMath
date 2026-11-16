// L'AIRE DES FIGURES — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre : « tu me fais […] les aires et préimètres ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · L'AIRE EST LA BONNE, recalculée depuis les cotes que le dessin affiche.
//   · LE CÔTÉ OBLIQUE EST SUR LA FIGURE, ET IL EST PLUS LONG QUE LA HAUTEUR.
//     C'est lui que prend l'élève qui confond. Sans lui, la faute du chapitre
//     est impossible à commettre — donc invisible, et l'exercice ne mesure
//     plus rien.
//   · L'UNITÉ CHANGE AVEC LA QUESTION, et la compétence enregistrée aussi :
//     un périmètre raté ne doit pas se ranger sous « aire du rectangle ».
//   · TOUT TOMBE JUSTE — la réponse ET les leurres. Un leurre à virgule se
//     repère sans calculer.
//   · LA FEUILLE PORTE SES DIMENSIONS. « Calcule l'aire de CE triangle » ne
//     désigne rien quand le dessin n'y est pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { airesGenerator as G } from '../js/core/generators/aires.js';
import { MARCHES_AIRE, tirerAire, figureAireSvg, leurresDe } from '../js/core/aires.js';

const MARCHES = MARCHES_AIRE.map(m => m.id);
const item = (marche, i, opts = {}) => G.generate({ marches: [marche], ...opts },
    { rng: makeRng(`air-${marche}-${i}`), index: 0, total: 4 });

/** L'aire recalculée depuis les seules cotes que le dessin affiche. */
function attendu(t) {
    const d = t.dims;
    if (t.quoi === 'perimetre') return 2 * (d.L + d.l);
    switch (t.marche) {
        case 'triangle': return d.b * d.h / 2;
        case 'parallelogramme': return d.b * d.h;
        default: return d.L * d.l;
    }
}

test('L’AIRE EST LA BONNE, recalculée depuis les cotes', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 40; i++) {
            const t = tirerAire(makeRng(`a-${m}-${i}`), m);
            assert.equal(t.reponse, attendu(t),
                `${m} #${i} : ${t.reponse} au lieu de ${attendu(t)} (${JSON.stringify(t.dims)})`);
            // ET LA LONGUEUR EST LA PLUS GRANDE DES DEUX. Une « longueur »
            // plus courte que la « largeur » apprend un mot faux dans un
            // exercice qui sert justement à les nommer.
            if (t.dims.L !== undefined) {
                assert.ok(t.dims.L > t.dims.l,
                    `${m} #${i} : L = ${t.dims.L} et l = ${t.dims.l}`);
            }
        }
    }
});

test('LE CÔTÉ OBLIQUE EST SUR LA FIGURE, ET PLUS LONG QUE LA HAUTEUR', () => {
    // SANS LUI, LA FAUTE DU CHAPITRE EST IMPOSSIBLE. Un élève ne peut prendre
    // le côté oblique pour la hauteur que s'il est écrit ; et s'il était plus
    // court qu'elle, la figure mentirait — un côté oblique est toujours plus
    // long que la hauteur qu'il surplombe.
    for (const m of ['triangle', 'parallelogramme']) {
        for (let i = 0; i < 40; i++) {
            const t = tirerAire(makeRng(`o-${m}-${i}`), m);
            assert.ok(t.dims.oblique > t.dims.h,
                `${m} #${i} : oblique ${t.dims.oblique} ≤ hauteur ${t.dims.h}`);
            const svg = figureAireSvg(t);
            assert.ok(svg.includes(`${t.dims.oblique} cm`),
                `${m} #${i} : le côté oblique n’est pas écrit sur la figure`);
            assert.ok(svg.includes(`h = ${t.dims.h} cm`),
                `${m} #${i} : la hauteur n’est pas écrite`);
            // ET ELLE EST TRACÉE, avec son angle droit : « h = 5 cm » posé à
            // côté d'un triangle ne désigne rien, et l'élève le lit comme le
            // côté oblique.
            assert.match(svg, /class="fig-hauteur"/,
                `${m} #${i} : la hauteur n’est pas tracée`);
            assert.match(svg, /class="fig-droit"/,
                `${m} #${i} : l’angle droit de la hauteur n’est pas marqué`);
        }
    }
});

test('L’UNITÉ CHANGE AVEC LA QUESTION, ET LA COMPÉTENCE AUSSI', () => {
    let aires = 0, tours = 0;
    for (let i = 0; i < 60; i++) {
        const it = item('ou', i);
        const ou = `ou #${i}`;
        if (it.meta.quoi === 'perimetre') {
            tours += 1;
            assert.equal(it.meta.unit, 'cm', `${ou} : un périmètre en ${it.meta.unit}`);
            assert.equal(it.skillId, 'mes.perimetre.rectangle',
                `${ou} : un périmètre rangé sous « ${it.skillId} »`);
            assert.match(it.prompt.text, /PÉRIMÈTRE/, `${ou} : l’énoncé ne le dit pas`);
        } else {
            aires += 1;
            assert.equal(it.meta.unit, 'cm²', `${ou} : une aire en ${it.meta.unit}`);
            assert.equal(it.skillId, 'mes.aire.rectangle', `${ou} : « ${it.skillId} »`);
            assert.match(it.prompt.text, /AIRE/, `${ou} : l’énoncé ne le dit pas`);
        }
    }
    // ET LA MARCHE TIRE VRAIMENT LES DEUX. C'est toute sa raison d'être : tant
    // qu'un exercice ne demande qu'une des deux, l'élève applique la formule
    // du jour sans jamais se demander laquelle.
    assert.ok(aires >= 10 && tours >= 10,
        `la marche « ou » tire ${aires} aires et ${tours} périmètres sur 60`);
    // LES TROIS AUTRES MARCHES NE DEMANDENT QUE DES AIRES.
    for (const m of ['rectangle', 'triangle', 'parallelogramme']) {
        for (let i = 0; i < 20; i++) {
            assert.equal(item(m, i).meta.quoi, 'aire', `${m} #${i} : ce n’est pas une aire`);
        }
    }
});

test('TOUT TOMBE JUSTE — la réponse ET les leurres', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const t = tirerAire(makeRng(`j-${m}-${i}`), m);
            assert.equal(t.reponse, Math.round(t.reponse),
                `${m} #${i} : réponse ${t.reponse}`);
            for (const l of leurresDe(t)) {
                const v = Number(l.value);
                // UN LEURRE À VIRGULE SE REPÈRE SANS CALCULER, et le QCM ne
                // mesure alors plus rien. C'est ce qui a fait choisir une base
                // PAIRE pour le triangle et le parallélogramme.
                assert.equal(v, Math.round(v),
                    `${m} #${i} : le leurre « ${l.value} » n’est pas entier`);
                assert.notEqual(v, t.reponse, `${m} #${i} : un leurre vaut la réponse`);
                assert.ok(l.why && l.why.length > 20,
                    `${m} #${i} : le leurre « ${l.value} » n’explique rien`);
            }
        }
    }
    // ET LE QCM EN PROPOSE QUATRE, TOUTES DIFFÉRENTES.
    for (const m of MARCHES) {
        for (let i = 0; i < 20; i++) {
            const it = item(m, i, { reponse: 'choix' });
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(vals.length, 4, `${m} #${i} : ${vals.length} propositions`);
            assert.equal(new Set(vals).size, 4, `${m} #${i} : deux propositions identiques`);
            assert.equal((it.choices || []).filter(c => c.correct).length, 1,
                `${m} #${i} : pas une seule bonne réponse`);
        }
    }
});

test('LA CONFUSION AIRE / PÉRIMÈTRE EST PROPOSÉE, AVEC SON EXPLICATION', () => {
    // C'EST LA FAUTE DU CHAPITRE, et elle donne un nombre parfaitement
    // crédible : sur un rectangle de 6 sur 4, l'aire vaut 24 et le périmètre
    // 20. Rien dans le nombre ne dit lequel on a calculé — seule l'unité le
    // dit, et c'est ce qu'on apprend ici.
    let vues = 0;
    for (let i = 0; i < 40; i++) {
        const it = item('ou', i, { reponse: 'choix' });
        const d = it.meta.dims;
        const autre = it.meta.quoi === 'aire' ? 2 * (d.L + d.l) : d.L * d.l;
        const l = (it.choices || []).find(c => Number(c.value) === autre);
        if (!l) continue;              // l'autre peut coïncider avec la réponse
        assert.match(l.why || '', /PÉRIMÈTRE|AIRE|aire|périmètre/,
            `ou #${i} : le leurre ${autre} n’explique pas la confusion`);
        vues += 1;
    }
    assert.ok(vues >= 25, `seulement ${vues} questions proposent l’autre grandeur`);
});

test('LE DESSIN NE SORT PAS DE SON CADRE', () => {
    // UN SVG QUI DÉBORDE NE LÈVE AUCUNE ERREUR : il coupe. On mesure la BOÎTE
    // de chaque étiquette, pas son point d'ancrage — c'est la leçon payée sur
    // les volumes, où l'épreuve écrite d'abord restait verte quand on retirait
    // les textes du calcul du cadre.
    for (const m of MARCHES) {
        for (let i = 0; i < 25; i++) {
            const svg = figureAireSvg(tirerAire(makeRng(`c-${m}-${i}`), m));
            const [x, y, w, h] = svg.match(/viewBox="([\d.\s-]+)"/)[1]
                .trim().split(/\s+/).map(Number);
            const textes = [...svg.matchAll(
                /<text[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*text-anchor="([a-z]+)"[^>]*>([^<]*)</g)];
            assert.ok(textes.length >= 2, `${m} #${i} : ${textes.length} cote(s) écrite(s)`);
            for (const [, sx, sy, ancre, texte] of textes) {
                const tx = Number(sx), lg = texte.length * 9;
                const g = ancre === 'end' ? tx - lg : ancre === 'start' ? tx : tx - lg / 2;
                assert.ok(g >= x && g + lg <= x + w,
                    `${m} #${i} : « ${texte} » sort du cadre en largeur`);
                assert.ok(Number(sy) - 13 >= y && Number(sy) + 5 <= y + h,
                    `${m} #${i} : « ${texte} » sort du cadre en hauteur`);
            }
        }
    }
});

test('LA FEUILLE PORTE SES DIMENSIONS', () => {
    assert.equal(G.ecrit, true, 'le générateur ne promet aucune fiche');
    for (const m of MARCHES) {
        for (let i = 0; i < 15; i++) {
            const it = G.generate({ marches: [m] },
                { rng: makeRng(`p-${m}-${i}`), index: 0, total: 4, papier: true });
            const p = it.prompt.papier, ou = `${m} #${i}`;
            assert.ok(p, `${ou} : aucune consigne papier`);
            // IL N'Y A PAS DE DESSIN SUR LA FEUILLE : « CE triangle » n'y
            // désigne rien. Payé trois fois le 20 octobre.
            assert.ok(!/\bce |cette |ces /.test(p),
                `${ou} : la feuille désigne un dessin absent — « ${p} »`);
            for (const v of Object.values(it.meta.dims)) {
                assert.ok(new RegExp(`\\b${v}\\b`).test(p),
                    `${ou} : la cote ${v} manque dans « ${p} »`);
            }
            assert.ok(!p.includes(` ${it.answer} `),
                `${ou} : la réponse est écrite dans « ${p} »`);
        }
    }
});
