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
import {
    planDeLaScene, planFigureCodee, TYPO, demiDuNom
} from '../js/core/pointsDroitesSvg.js';
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

/**
 * Chaque étiquette : sa distance à SON point, au point le plus proche, et le
 * BLANC qui reste entre son bord et le bord de la marque.
 *
 * Le blanc se calcule avec `demiDuNom`, la fonction même dont le plan se sert :
 * une épreuve qui recopierait la formule mesurerait sa propre copie.
 */
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
            const d = Math.hypot(n.x - p.x, n.y - p.y) || 1;
            const dir = { x: (n.x - p.x) / d, y: (n.y - p.y) / d };
            out.push({
                nom: p.nom,
                sien: d,
                blanc: d - TYPO.marque - demiDuNom(dir, TYPO),
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
    // 0,99 — la lettre touchait l'autre point. APRÈS : 0,35 → 0,17, et 0,99 →
    // 0,45. Le seuil est posé à la moitié : au-delà, un élève n'a plus de
    // raison de rattacher la lettre à l'un plutôt qu'à l'autre.
    const tout = lesEtiquettes();
    assert.ok(tout.length > 200, `${tout.length} étiquettes seulement`);
    const pire = tout.reduce((a, b) => a.sien / a.voisin > b.sien / b.voisin ? a : b);
    assert.ok(pire.sien / pire.voisin < 0.5,
        `« ${pire.nom} » est à ${pire.sien.toFixed(0)} px de son point et à `
        + `${pire.voisin.toFixed(0)} px du voisin : on ne sait plus lequel elle nomme`);
});

test('ET LE BLANC ENTRE LA LETTRE ET SA MARQUE EST LE MÊME PARTOUT', () => {
    // CE QUE RÉMY VOIT N'EST PAS UNE DISTANCE DE CENTRE À CENTRE, c'est le
    // BLANC entre le bord de la lettre et le bord de la croix. Et il l'a dit
    // deux fois, parce que la première correction n'avait traité qu'une
    // moitié : « le label du point est loin du point », puis « c'est encore
    // bien éloigné le libellé du point dans le codage ».
    //
    // MESURÉ SUR LA FEUILLE À QUATRE FIGURES PAR PAGE, avant cette épreuve :
    // blanc de −0,7 px pour les lettres du tour le plus proche — elles
    // mordaient sur la croix — et de 5,6 px pour celles qui avaient dû
    // s'écarter d'un tour, soit plus d'une demi-hauteur de lettre. Les deux
    // défauts sur la même page, en sens contraire, parce que l'écart se
    // comptait en unités de FIGURE et la lettre en unités de PAGE.
    //
    // L'ÉPREUVE EST DONC CELLE DE L'UNIFORMITÉ, pas celle d'une valeur : le
    // blanc d'une lettre posée en biais doit valoir celui d'une lettre posée
    // au-dessus. C'est ce qu'aucune distance fixe ne donne.
    const tout = lesEtiquettes();
    const blancs = tout.map(e => e.blanc);
    const trie = [...blancs].sort((a, b) => a - b);
    const median = trie[trie.length >> 1];
    assert.ok(Math.abs(median - TYPO.blanc) < TYPO.corps * 0.1,
        `blanc médian ${median.toFixed(1)} pour ${TYPO.blanc} voulu`);
    // AUCUNE LETTRE À PLUS D'UN TIERS DE SA HAUTEUR DE SA MARQUE. Au-delà, on
    // la voit flotter — c'est le « bien éloigné » de Rémy.
    const loin = tout.filter(e => e.blanc > TYPO.blanc + TYPO.corps * 0.33);
    assert.ok(loin.length / tout.length < 0.03,
        `${loin.length} étiquettes sur ${tout.length} flottent loin de leur marque, `
        + `par exemple « ${(loin[0] || {}).nom } » à ${(loin[0] || {}).blanc}`);
    // ET AUCUNE NE MORD SUR LA CROIX. Collée est un défaut comme écartée.
    const dessus = tout.filter(e => e.blanc < -TYPO.corps * 0.1);
    assert.equal(dessus.length, 0,
        `${dessus.length} étiquettes recouvrent la marque de leur point`);
});

test('ET LA FEUILLE POSE SES LETTRES À LA TAILLE DE SES LETTRES, PAS DE SA FIGURE', () => {
    // LE DÉFAUT QUE RÉMY A VU DEUX FOIS, dans sa forme exacte.
    //
    // La figure se réduit pour entrer dans son bloc ; la lettre, elle, est
    // écrite en millimètres de page et ne se réduit pas. Un écart compté en
    // unités de FIGURE suit donc l'une et pas l'autre : sur une feuille à
    // quatre figures par page, les lettres mordaient sur leur croix, et sur
    // une feuille à une figure elles flottaient.
    //
    // ON CONFRONTE DONC DEUX BLOCS de tailles très différentes. Le blanc,
    // rapporté à la hauteur de la lettre, doit être LE MÊME — c'est ce qu'un
    // écart fixe ne peut pas donner, et c'est la seule forme d'épreuve qui le
    // voie : mesurer un seul bloc laisserait passer le défaut entier.
    const item = unItem('codage', 7);
    const mesure = (boite) => {
        const svg = avecLeReglage('croix',
            () => elementsGeoPreviewHtml(item, { boite }, 1, false));
        const corps = Number(/<text[^>]*font-size="([\d.]+)"/.exec(svg)[1]);
        // Les deux traits d'une croix encadrent leur point : leur milieu EST
        // le point. Les textes sortent dans le même ordre que les points.
        const traits = [...svg.matchAll(
            /class="eg-point"\s+x1="([\d.-]+)"\s+y1="([\d.-]+)"\s+x2="([\d.-]+)"\s+y2="([\d.-]+)"/g)]
            .map(m => m.slice(1).map(Number));
        const points = [];
        for (let i = 0; i + 1 < traits.length; i += 2) {
            points.push({ x: (traits[i][0] + traits[i][2]) / 2,
                y: (traits[i][1] + traits[i][3]) / 2 });
        }
        const textes = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"/g)]
            .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
        assert.equal(points.length, textes.length,
            `${points.length} croix pour ${textes.length} noms`);
        const t = { corps, encreH: TYPO.encreH, encreL: TYPO.encreL };
        const blancs = points.map((p, i) => {
            // `+1.3` : la ligne de base du texte, que l'aperçu décale — on la
            // retire pour retrouver le CENTRE de la lettre.
            const n = { x: textes[i].x, y: textes[i].y - 1.3 };
            const d = Math.hypot(n.x - p.x, n.y - p.y) || 1;
            const dir = { x: (n.x - p.x) / d, y: (n.y - p.y) / d };
            return (d - (0.85 * 0.72 + 0.16) - demiDuNom(dir, t)) / corps;
        });
        return blancs.sort((a, b) => a - b)[blancs.length >> 1];
    };
    const grand = mesure({ x: 10, y: 10, w: 240, h: 160 });
    const petit = mesure({ x: 10, y: 10, w: 62, h: 46 });
    assert.ok(Math.abs(grand - petit) < 0.06,
        `blanc relatif : ${grand.toFixed(3)} dans un grand bloc contre `
        + `${petit.toFixed(3)} dans un petit — l'écart suit la figure et non la lettre`);
    assert.ok(grand > 0 && grand < 0.33,
        `blanc relatif ${grand.toFixed(3)} : la lettre est collée ou flotte`);
});

test('ET LE PDF POSE SES LETTRES EXACTEMENT OÙ L\'APERÇU LES MET', () => {
    // RÉMY, en voyant la correction : « et pour l'impression aussi ! ».
    //
    // Les deux rendus partent du même `plantDeLaFigure`, donc du même plan —
    // mais c'est une CROYANCE tant que rien ne la confronte. Ce dépôt a payé
    // deux fois un rendu qui recalculait de son côté : la racine carrée, puis
    // la pointe de flèche de l'axe, écrite en dur à l'écran pendant que le
    // papier la lisait dans le plan.
    //
    // ON COMPARE DONC LES COORDONNÉES, pas les intentions : chaque lettre du
    // PDF doit tomber à la même place que celle de l'aperçu, au centième de
    // millimètre.
    const item = unItem('codage', 11);
    const slot = { boite: { x: 12, y: 18, w: 120, h: 84 } };

    const doc = faussePage();
    avecLeReglage('croix', () => dessinerElementsGeoPdf(doc, item, slot, false));
    const svg = avecLeReglage('croix', () => elementsGeoPreviewHtml(item, slot, 1, false));

    const duSvg = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"/g)]
        .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
    const duPdf = doc.vu.textes.filter(t => /^[A-Z]'?$/.test(t.t));
    assert.ok(duPdf.length >= 3, `${duPdf.length} lettre(s) dans le PDF`);
    assert.equal(duSvg.length, duPdf.length,
        `${duSvg.length} lettres à l'aperçu pour ${duPdf.length} au PDF`);
    duPdf.forEach((t, i) => {
        assert.ok(Math.abs(t.x - duSvg[i].x) < 0.01 && Math.abs(t.y - duSvg[i].y) < 0.01,
            `« ${t.t} » : le PDF l'écrit en (${t.x.toFixed(2)} ; ${t.y.toFixed(2)}) `
            + `et l'aperçu en (${duSvg[i].x.toFixed(2)} ; ${duSvg[i].y.toFixed(2)})`);
    });

    // ET LES MARQUES DE POINT AUSSI : une lettre bien posée à côté d'une croix
    // mal posée reste une lettre mal posée.
    const traitsSvg = [...svg.matchAll(
        /class="eg-point"\s+x1="([\d.-]+)"\s+y1="([\d.-]+)"\s+x2="([\d.-]+)"\s+y2="([\d.-]+)"/g)]
        .map(m => m.slice(1).map(Number));
    // Les marques sont tracées EN DERNIER des deux côtés, après les droites et
    // les marques de codage : on confronte donc les N derniers traits.
    assert.equal(traitsSvg.length, duPdf.length * 2,
        `${traitsSvg.length} traits de marque pour ${duPdf.length} points`);
    assert.ok(doc.vu.traits.length >= traitsSvg.length,
        `le PDF ne trace que ${doc.vu.traits.length} traits en tout`);
    const debut = doc.vu.traits.length - traitsSvg.length;
    traitsSvg.forEach((t, i) => {
        const p = doc.vu.traits[debut + i];
        assert.ok(Math.abs(t[0] - p.x1) < 0.01 && Math.abs(t[1] - p.y1) < 0.01,
            `la marque ${i} tombe ailleurs au PDF : (${p.x1}, ${p.y1}) contre (${t[0]}, ${t[1]})`);
    });
});
