// LE VOLUME DES SOLIDES — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre : « tu me fais les volumes ». C'était le plus gros trou
// du logiciel : ni compétence ni exercice, à aucun niveau.
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · LE VOLUME EST LE BON. Sept formules, sept occasions de se tromper d'une
//     division — et une formule fausse rend un nombre parfaitement crédible,
//     que rien ne signale.
//   · LA RÉPONSE EST ENTIÈRE. Les dimensions sont tirées pour cela (hauteurs
//     multiples de trois, aire de base paire). Sans cette garantie, l'élève
//     cherche sa faute dans son écriture au lieu de sa formule.
//   · LE π N'EST LÀ QUE LÀ OÙ IL SERT. Une touche π sur un pavé droit
//     laisserait croire qu'on attend un π dans la réponse.
//   · LES LEURRES SONT LES FAUTES DU CHAPITRE, et jamais la bonne réponse.
//   · LE DESSIN NE SORT PAS DE SON CADRE. Un SVG qui déborde ne lève aucune
//     erreur : il coupe, en silence.
//   · LA FEUILLE PORTE SES DIMENSIONS. « Calcule le volume de ce pavé droit »
//     ne désigne rien quand le dessin n'y est pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { CADRE_L, CADRE_H } from '../js/core/cotes.js';
import { volumesGenerator as G } from '../js/core/generators/volumes.js';
import {
    MARCHES_VOLUME, EXACTS_PI, tirerVolume, figureVolumeSvg
} from '../js/core/volumes.js';

const MARCHES = MARCHES_VOLUME.map(m => m.id);
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`vol-${marche}-${i}`), index: 0, total: 7 });

/** Le volume recalculé AUTREMENT que par le générateur, à partir des cotes. */
function volumeAttendu(marche, d) {
    switch (marche) {
        case 'pave': return { n: d.L * d.l * d.h, pi: false };
        case 'cube': return { n: d.a ** 3, pi: false };
        case 'prisme': return { n: d.b * d.hb * d.H / 2, pi: false };
        case 'cylindre': return { n: d.r ** 2 * d.h, pi: true };
        case 'pyramide': return { n: d.c ** 2 * d.h / 3, pi: false };
        case 'cone': return { n: d.r ** 2 * d.h / 3, pi: true };
        case 'boule': return { n: 4 * d.r ** 3 / 3, pi: true };
        default: throw new Error(`marche inconnue : ${marche}`);
    }
}

test('LE VOLUME EST LE BON, et il est recalculé depuis les COTES', () => {
    // ON NE COMPARE PAS LE GÉNÉRATEUR À LUI-MÊME. Le calcul est refait ici à
    // partir des seules dimensions que le DESSIN affiche : si le générateur
    // tirait une dimension et en dessinait une autre, la question serait sans
    // réponse possible et rien d'autre ne le dirait.
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const { dims, volume, piK } = it.meta;
            const attendu = volumeAttendu(m, dims);
            const ou = `${m} #${i} (${JSON.stringify(dims)})`;
            if (attendu.pi) {
                assert.equal(volume, null, `${ou} : un volume sans π pour un solide rond`);
                assert.equal(piK, attendu.n, `${ou} : ${piK}π au lieu de ${attendu.n}π`);
            } else {
                assert.equal(piK, null, `${ou} : un π là où il n’y en a pas`);
                assert.equal(volume, attendu.n, `${ou} : ${volume} au lieu de ${attendu.n}`);
            }
        }
    }
});

test('LA RÉPONSE EST ENTIÈRE, toujours', () => {
    // LES DIMENSIONS SONT TIRÉES POUR CELA : hauteurs multiples de trois pour
    // la pyramide et le cône, rayon multiple de trois pour la boule, aire de
    // base paire pour le prisme. Un élève qui tombe sur 85,333 cherche sa
    // faute dans son écriture — et il n'y en a pas.
    for (const m of MARCHES) {
        for (let i = 0; i < 40; i++) {
            const it = item(m, i);
            const v = it.meta.volume === null ? it.meta.piK : it.meta.volume;
            assert.equal(v, Math.round(v), `${m} #${i} : la réponse vaut ${v}`);
            assert.ok(v > 0, `${m} #${i} : un volume nul ou négatif (${v})`);
            // ET ELLE S'ÉCRIT COMME ON L'ÉCRIT AU TABLEAU.
            assert.match(it.answer, /^\d+π?$/, `${m} #${i} : « ${it.answer} » s’écrit mal`);
        }
    }
});

test('LE π N’EST LÀ QUE LÀ OÙ IL SERT', () => {
    for (const m of MARCHES) {
        const rond = EXACTS_PI.includes(m);
        for (let i = 0; i < 20; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            // LA TOUCHE π DU PAVÉ. Sur un pavé droit, elle laisserait croire
            // qu'on attend un π dans la réponse — payé une fois sur le disque.
            assert.equal(it.meta.pi, rond, `${ou} : touche π ${it.meta.pi ? 'offerte' : 'absente'}`);
            assert.equal(it.answer.includes('π'), rond, `${ou} : « ${it.answer} »`);
            // L'UNITÉ EST UN CENTIMÈTRE CUBE, et celle de la figure un
            // centimètre tout court. Un rayon de dix-huit centimètres cubes
            // n'existe pas, et tout le chapitre travaille à séparer les deux.
            assert.equal(it.meta.unit, 'cm³', `${ou} : unité « ${it.meta.unit} »`);
            assert.equal(it.meta.uniteLongueur, 'cm', `${ou} : cote en « ${it.meta.uniteLongueur} »`);
        }
    }
});

test('LES LEURRES SONT LES FAUTES DU CHAPITRE, jamais la bonne réponse', () => {
    const vues = new Set();
    for (const m of MARCHES) {
        for (let i = 0; i < 20; i++) {
            const it = G.generate({ marches: [m], reponse: 'choix' },
                { rng: makeRng(`vc-${m}-${i}`), index: 0, total: 7 });
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer, `${ou} : la bonne n’est pas la réponse`);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length, `${ou} : deux propositions identiques`);
            (it.choices || []).forEach(c => { if (c.why) vues.add(c.why); });

            // LA FAUTE DU CHAPITRE EST PROPOSÉE, SUR LA MARCHE OÙ ELLE VIT :
            // oublier le ÷ 3 d'une pyramide ou d'un cône. Elle donne
            // exactement le prisme ou le cylindre correspondant — un nombre
            // parfaitement crédible —, et c'est pour cela qu'elle doit être
            // là, avec son explication.
            //
            // ON LA CHERCHE SUR SA MARCHE, ET NON DANS L'ENSEMBLE DES
            // EXPLICATIONS. En la cherchant partout, l'épreuve restait verte
            // quand on retirait le leurre de la pyramide ET du cône :
            // `epreuveTombe.mjs` l'a montré. Le mot « diviser par 3 » se
            // trouvait toujours — dans l'explication de la BOULE.
            if (m === 'pyramide' || m === 'cone') {
                const d = it.meta.dims;
                const sans = m === 'pyramide' ? `${d.c * d.c * d.h}` : `${d.r * d.r * d.h}π`;
                const l = (it.choices || []).find(c => String(c.value) === sans);
                assert.ok(l, `${ou} : le volume sans le ÷ 3 (${sans}) n’est pas proposé`);
                assert.match(l.why || '', /diviser par 3/i,
                    `${ou} : le leurre du ÷ 3 ne dit pas pourquoi`);
            }
        }
    }
    assert.ok(vues.size >= 6, `seulement ${vues.size} explications différentes`);
});

test('LE DESSIN NE SORT PAS DE SON CADRE', () => {
    // UN SVG QUI DÉBORDE NE LÈVE AUCUNE ERREUR : il coupe, en silence. Mesuré
    // sur la première version — le « h = 8 cm » du cylindre perdait sa
    // dernière lettre, et le prisme sortait par le haut. Le cadre se calcule
    // donc depuis les points, étiquettes comprises ; cette épreuve garde ce
    // calcul.
    for (const m of MARCHES) {
        for (let i = 0; i < 25; i++) {
            const t = tirerVolume(makeRng(`f-${m}-${i}`), m);
            const svg = figureVolumeSvg(t);
            const vb = svg.match(/viewBox="([\d.\s-]+)"/);
            assert.ok(vb, `${m} #${i} : pas de viewBox`);
            const [x, y, w, h] = vb[1].trim().split(/\s+/).map(Number);
            assert.ok(w > 0 && h > 0, `${m} #${i} : cadre vide (${w} × ${h})`);
            // TOUS LES NOMBRES DU DESSIN SONT DANS LE CADRE, EN ENTIER.
            //
            // ON MESURE LA BOÎTE DU TEXTE, PAS SON POINT D'ANCRAGE. La
            // première écriture de cette épreuve ne vérifiait que le point :
            // `epreuveTombe.mjs` a retiré les coins des étiquettes du calcul
            // du cadre, et elle est restée VERTE — un point d'ancrage reste
            // près des traits, c'est le texte qui dépasse. Or c'est
            // exactement le défaut qu'on avait vu de ses yeux : le « h = 8 cm »
            // du cylindre amputé de sa dernière lettre.
            const textes = [...svg.matchAll(
                /<text[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*text-anchor="([a-z]+)"[^>]*>([^<]*)</g)];
            assert.ok(textes.length >= 1, `${m} #${i} : aucune cote écrite`);
            for (const [, sx, sy, ancre, texte] of textes) {
                const tx = Number(sx), ty = Number(sy);
                const lg = texte.length * 9;
                const g = ancre === 'end' ? tx - lg : ancre === 'start' ? tx : tx - lg / 2;
                assert.ok(g >= x && g + lg <= x + w,
                    `${m} #${i} : « ${texte} » va de ${g.toFixed(0)} à `
                    + `${(g + lg).toFixed(0)}, hors du cadre [${x} ; ${x + w}]`);
                assert.ok(ty - 13 >= y && ty + 5 <= y + h,
                    `${m} #${i} : « ${texte} » est à y = ${ty}, hors du cadre [${y} ; ${y + h}]`);
            }
        }
    }
});

test('LES SOLIDES GARDENT DES TAILLES COMPARABLES', () => {
    // RECADRER AU PLUS JUSTE A RÉGLÉ LES DÉBORDEMENTS ET CRÉÉ L'INVERSE : un
    // cube de 3 cm s'affichait PLUS GROS qu'un pavé de 12, parce qu'un petit
    // dessin recadré au plus juste est ensuite étiré à la largeur de son
    // emplacement. Dans un chapitre dont toute la leçon est qu'un volume
    // grandit vite, c'est exactement le contraire de ce qu'il faut montrer.
    const cadres = [];
    for (const m of MARCHES) {
        for (let i = 0; i < 12; i++) {
            const svg = figureVolumeSvg(tirerVolume(makeRng(`t-${m}-${i}`), m));
            const [, , w, h] = svg.match(/viewBox="([\d.\s-]+)"/)[1].trim().split(/\s+/).map(Number);
            // LES DEUX NOMBRES NE SONT PLUS ÉCRITS ICI, ils sont lus. Ils ont
            // changé le 17 novembre — Rémy : « le rectangle est petit » — parce
            // que le plancher était PORTRAIT (320 × 260) dans un emplacement
            // PAYSAGE (538 × 189) : un SVG s'inscrit en entier dans sa place,
            // donc il était bridé par la hauteur et les 306 px de largeur qui
            // restaient ne servaient à personne. Une épreuve qui recopie les
            // chiffres d'une constante tombe à chaque réglage sans rien dire
            // de vrai sur la règle qu'elle garde — et la règle, ici, est qu'il
            // y A un plancher.
            assert.ok(w >= CADRE_L, `${m} #${i} : cadre large de ${w}, sous le plancher`);
            assert.ok(h >= CADRE_H, `${m} #${i} : cadre haut de ${h}, sous le plancher`);
            cadres.push(w);
        }
    }
    // ET LE PLUS GRAND NE FAIT PAS DEUX FOIS LE PLUS PETIT : au-delà, l'élève
    // qui enchaîne les questions voit le dessin sauter d'une taille à l'autre.
    assert.ok(Math.max(...cadres) < 2 * Math.min(...cadres),
        `les cadres vont de ${Math.min(...cadres)} à ${Math.max(...cadres)}`);
});

test('LA FEUILLE PORTE SES DIMENSIONS', () => {
    // UN ÉNONCÉ JUSTE À L'ÉCRAN PEUT ÊTRE SANS RÉPONSE POSSIBLE SUR LE PAPIER.
    // Il n'y a pas de dessin sur la feuille : « Calcule le volume de CE pavé
    // droit » n'y désigne rien. C'est arrivé trois fois le 20 octobre, et
    // c'est pourquoi le dépôt demande de REGARDER la fiche imprimée.
    assert.equal(G.ecrit, true, 'le générateur ne promet aucune fiche');
    for (const m of MARCHES) {
        for (let i = 0; i < 10; i++) {
            const it = G.generate({ marches: [m] },
                { rng: makeRng(`pp-${m}-${i}`), index: 0, total: 7, papier: true });
            const p = it.prompt.papier;
            const ou = `${m} #${i}`;
            assert.ok(p, `${ou} : aucune consigne papier`);
            assert.ok(!/\bce |cette |ces /.test(p),
                `${ou} : la feuille désigne un dessin absent — « ${p} »`);
            // CHAQUE DIMENSION TIRÉE EST ÉCRITE. Il suffit d'en oublier une
            // pour que la question n'ait plus de réponse, et le texte reste
            // parfaitement lisible.
            for (const v of Object.values(it.meta.dims)) {
                assert.ok(new RegExp(`\\b${v}\\b`).test(p),
                    `${ou} : la cote ${v} manque dans « ${p} »`);
            }
            // ET ELLE NE DIT PAS LA RÉPONSE. Un énoncé qui la contient
            // s'imprime tel quel sur la feuille de l'élève — payé une fois
            // sur « L'Axe au Centième », dont le `prompt.text` portait
            // « (le point vaut 8,2) ».
            assert.ok(!p.includes(it.answer),
                `${ou} : la réponse « ${it.answer} » est écrite dans « ${p} »`);
        }
    }
});
