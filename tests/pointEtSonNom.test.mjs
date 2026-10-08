// UN POINT, SA MARQUE, ET LA LETTRE QUI LE NOMME.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux phrases du même envoi :
//
//   « en détail, il faut se fier au paramètre, sur le pdf un point est
//     représenté par un point alors que dans mes options j'avais mis une
//     croix. »
//
//   « Pour lire un codage, pour la version imprimée, le label du point est loin
//     du point. Vérifie aussi cela pour la version interactive. Idem pour les
//     milieux. »
//
// Deux défauts différents, un seul sujet : ce qui, sur une figure, désigne un
// point. Le premier le dessinait sans écouter le professeur ; le second posait
// son nom si loin qu'on ne savait plus lequel il nommait.
//
// ── POURQUOI CES ÉPREUVES-LÀ, ET SOUS CETTE FORME ─────────────────────────
//
// LA MARQUE : le réglage n'a AUCUN autre effet sur la fiche. Rien ne le
// rattraperait s'il redevenait muet — la feuille sortirait, les figures
// seraient justes, et seul Rémy verrait que ce n'est pas ce qu'il a demandé.
// C'est exactement l'état dans lequel il l'a trouvée.
//
// LE NOM : on ne mesure pas une DISTANCE, on mesure un RAPPORT. Une distance
// se compare à un nombre qu'il faut deviner, et une épreuve qui compare à un
// nombre deviné ne mesure que la devinette. Le rapport, lui, pose la question
// de l'élève : cette lettre est-elle plus près de son point que du voisin ?

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { traitsDuPoint, marqueurPoint } from '../js/core/figures.js';
import { planDeLaScene, planFigureCodee } from '../js/core/pointsDroitesSvg.js';
import { elementsGeometrieGenerator as G } from '../js/core/generators/elementsGeometrie.js';
import {
    elementsGeoPreviewHtml, dessinerElementsGeoPdf
} from '../js/ui/fiches/elementsGeo.js';

// ── LE DÉCOR : un item, un bloc de feuille, un faux jsPDF ───────────────────

const unItem = (notion, i = 0) => G.generate({ notion },
    { rng: makeRng('pt' + i), index: i, total: 8, papier: true, themesExclus: [] });

const BLOC = { boite: { x: 10, y: 20, w: 80, h: 60 } };

/**
 * UN FAUX jsPDF QUI NOTE CE QU'ON LUI DEMANDE DE TRACER.
 *
 * On ne regarde pas un PDF : on regarde les ORDRES. C'est la seule façon de
 * distinguer un disque d'une croix sans ouvrir le fichier, et c'est aussi la
 * seule qui ne dépende pas de la version de jsPDF.
 */
function faussePage() {
    const vu = { cercles: [], traits: [], textes: [] };
    const rien = () => {};
    return {
        vu,
        setDrawColor: rien, setFillColor: rien, setTextColor: rien,
        setLineWidth: rien, setLineCap: rien, setFont: rien, setFontSize: rien,
        rect: rien,
        circle: (x, y, r) => vu.cercles.push({ x, y, r }),
        line: (x1, y1, x2, y2) => vu.traits.push({ x1, y1, x2, y2 }),
        text: (t, x, y) => vu.textes.push({ t, x, y })
    };
}

/** Pose le réglage là où le CSS le lit, et le rend à son état d'avant. */
function avecLeReglage(style, faire) {
    const avait = typeof globalThis.document !== 'undefined';
    const ancien = avait ? globalThis.document.documentElement.dataset.point : null;
    if (!avait) globalThis.document = { documentElement: { dataset: {} } };
    globalThis.document.documentElement.dataset.point = style;
    try { return faire(); } finally {
        if (!avait) delete globalThis.document;
        else globalThis.document.documentElement.dataset.point = ancien;
    }
}

// ── LA MARQUE DU POINT ──────────────────────────────────────────────────────

test('LA FICHE DESSINE LA MARQUE QUE LE PROFESSEUR A CHOISIE', () => {
    // « il faut se fier au paramètre » — et les trois réglages doivent donner
    // trois dessins DIFFÉRENTS, sans quoi le réglage ment.
    const item = unItem('codage');
    const combien = (m => m.figure ? planFigureCodee(m.figure).points.length
        : planDeLaScene(m.scene).points.length)(item.meta);
    assert.ok(combien >= 3, `${combien} point(s) : la figure est trop pauvre pour mesurer`);

    for (const [style, cercles, traitsParPoint] of
        [['disque', combien, 0], ['croix', 0, 2], ['plus', 0, 2]]) {
        const doc = faussePage();
        avecLeReglage(style, () => dessinerElementsGeoPdf(doc, item, BLOC, false));
        assert.equal(doc.vu.cercles.length, cercles,
            `« ${style} » : ${doc.vu.cercles.length} disque(s) pour ${cercles} attendu(s)`);
        // Les traits de la figure elle-même s'ajoutent à ceux des marques : on
        // compte donc la DIFFÉRENCE avec le réglage « disque », qui n'en pose
        // aucun. C'est la seule part qui vienne des points.
        const sansMarques = (() => {
            const d = faussePage();
            avecLeReglage('disque', () => dessinerElementsGeoPdf(d, item, BLOC, false));
            return d.vu.traits.length;
        })();
        assert.equal(doc.vu.traits.length - sansMarques, combien * traitsParPoint,
            `« ${style} » : ${doc.vu.traits.length - sansMarques} trait(s) de marque `
            + `pour ${combien * traitsParPoint} attendu(s)`);
    }
});

test('L\'APERÇU DE LA FICHE SUIT LE MÊME RÉGLAGE QUE SON PDF', () => {
    // L'aperçu est ce que Rémy REGARDE avant d'imprimer. S'il montrait une
    // croix là où le PDF pose un disque, il croirait le défaut corrigé.
    const item = unItem('milieu', 3);
    const apercu = (style) => avecLeReglage(style,
        () => elementsGeoPreviewHtml(item, BLOC, 3, false));
    const disques = (h) => (h.match(/<circle/g) || []).length;
    assert.ok(disques(apercu('disque')) > 0, 'le réglage « disque » ne pose aucun cercle');
    assert.equal(disques(apercu('croix')), 0,
        'le réglage « croix » laisse des disques dans l\'aperçu');
    assert.notEqual(apercu('croix'), apercu('plus'),
        'la croix et le plus donnent le même aperçu : le réglage ne passe pas');
});

test('SANS RÉGLAGE, C\'EST LA CROIX — la convention des manuels', () => {
    // Le défaut de 2026 était un disque EN DUR. Qu'on retombe sur un disque
    // quand le réglage manque serait le même défaut, en plus discret.
    const item = unItem('codage', 5);
    const doc = faussePage();
    avecLeReglage('', () => dessinerElementsGeoPdf(doc, item, BLOC, false));
    assert.equal(doc.vu.cercles.length, 0,
        'sans réglage lisible, la fiche retombe sur le disque');
});

test('L\'ÉCRAN ET LE PAPIER TRACENT LA MÊME MARQUE', () => {
    // `marqueurPoint` (l'écran) et `traitsDuPoint` (le papier) doivent sortir
    // du même calcul. Deux fois les mêmes nombres recopiés, c'est deux dessins
    // qui divergeront : c'est l'histoire entière de ce défaut.
    const svg = marqueurPoint(50, 40, '', 7);
    for (const [style, cls] of [['croix', 'pt-croix'], ['plus', 'pt-plus']]) {
        traitsDuPoint(50, 40, style, 7).traits.forEach(s => {
            const attendu = `<line class="${cls}" x1="${s.x1.toFixed(2)}" `
                + `y1="${s.y1.toFixed(2)}" x2="${s.x2.toFixed(2)}" y2="${s.y2.toFixed(2)}"/>`;
            assert.ok(svg.includes(attendu),
                `l'écran ne trace pas le trait « ${style} » que le papier trace : ${attendu}`);
        });
    }
    const rond = traitsDuPoint(50, 40, 'disque', 7);
    assert.ok(svg.includes(`r="${rond.rayon.toFixed(2)}"`),
        'le disque de l\'écran n\'a pas le rayon de celui du papier');
});

// ── LA LETTRE QUI NOMME LE POINT ────────────────────────────────────────────

/** Chaque étiquette : sa distance à SON point, et au point le plus proche. */
function lesEtiquettes(combien = 60) {
    const out = [];
    for (let i = 0; i < combien; i++) {
        const item = unItem(i % 2 ? 'codage' : 'milieu', 'nom' + i);
        const m = item.meta || {};
        const plan = m.scene ? planDeLaScene(m.scene)
            : m.figure ? planFigureCodee(m.figure) : null;
        if (!plan || plan.points.length < 2) continue;
        plan.points.forEach(p => {
            const n = plan.noms[p.nom];
            if (!n) return;
            out.push({
                nom: p.nom,
                sien: Math.hypot(n.x - p.x, n.y - p.y),
                voisin: Math.min(...plan.points.filter(q => q.nom !== p.nom)
                    .map(q => Math.hypot(n.x - q.x, n.y - q.y)))
            });
        });
    }
    return out;
}

test('UNE LETTRE EST NETTEMENT PLUS PRÈS DE SON POINT QUE DU VOISIN', () => {
    // LE RAPPORT, PAS LA DISTANCE. Une figure peut être grande ou serrée ; ce
    // qui décide si la lettre nomme encore son point est ce qui la sépare de
    // l'autre.
    //
    // MESURÉ AVANT, sur 670 étiquettes : rapport médian 0,35, et un pire cas à
    // 0,99 — la lettre touchait l'autre point. APRÈS : 0,35 → 0,15, et 0,99 →
    // 0,38. Le seuil est posé à la moitié : au-delà, un élève n'a plus de
    // raison de rattacher la lettre à l'un plutôt qu'à l'autre.
    const tout = lesEtiquettes();
    assert.ok(tout.length > 200, `${tout.length} étiquettes seulement`);
    const pire = tout.reduce((a, b) => a.sien / a.voisin > b.sien / b.voisin ? a : b);
    assert.ok(pire.sien / pire.voisin < 0.5,
        `« ${pire.nom} » est à ${pire.sien.toFixed(0)} px de son point et à `
        + `${pire.voisin.toFixed(0)} px du voisin : on ne sait plus lequel elle nomme`);
});

test('ET LE TOUR LE PLUS ÉTROIT SERT DÈS QU\'IL EST LIBRE', () => {
    // C'est l'autre moitié de la correction, et elle ne se voit pas dans le
    // rapport ci-dessus : les trois tours sont essayés du plus près au plus
    // loin, et l'on S'ARRÊTE au premier qui dégage assez. Sans cet arrêt, le
    // score — qui croît avec la distance — faisait gagner le plus large
    // presque à chaque fois, quel que soit le rayon.
    //
    // MESURÉ : 659 étiquettes sur 670 sur le tour étroit après, zéro avant.
    const tout = lesEtiquettes();
    const etroit = tout.filter(e => e.sien < 11 * 1.4).length;
    assert.ok(etroit / tout.length > 0.8,
        `${etroit} étiquettes sur ${tout.length} au plus près : le tour large gagne encore`);
});
