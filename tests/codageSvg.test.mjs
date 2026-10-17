// LE DESSIN D'UNE FIGURE À CODER — ET LA PROMESSE QU'IL DOIT TENIR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/codageSvg.js` montre une figure que l'élève doit coder : marquer les
// côtés de même longueur, et les angles droits. Son en-tête annonce la seule
// chose qui compte :
//
//   « LA FIGURE EST À L'ÉCHELLE. Un rectangle 12 x 5 doit ressembler à un
//     rectangle 12 x 5 : on met la figure à l'échelle sans la déformer, sinon
//     l'élève coderait des égalités que le dessin dément. »
//
// C'EST LA PIRE FAMILLE DE DÉFAUTS DE TOUT LE LOGICIEL, et pas seulement du
// module : une figure déformée demande à l'élève de coder ce qu'il VOIT, et le
// logiciel lui répond qu'il a tort en se fondant sur ce que la figure VAUT. Il
// a raison et on lui dit qu'il a tort — c'est la situation d'où personne ne
// revient : l'élève cesse de croire l'écran.
//
// ON NE LIT PAS LE TEXTE DU SVG, ON MESURE LA GÉOMÉTRIE. Une épreuve qui
// comparerait des chaînes de `<line x1="…">` tomberait au premier espace
// déplacé et ne dirait rien du dessin. On passe donc par les fonctions qui
// calculent — `projeterDans`, `pointsProjetes`, `traitsDeMarque`,
// `pointsAngleDroit`, `cadreDe` — et l'on vérifie des PROPRIÉTÉS : les rapports
// conservés, la perpendicularité, l'appartenance au cadre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    projeterDans, projeter, pointsProjetes,
    traitsDeMarque, marqueSvg, pointsAngleDroit, angleDroitSvg,
    cadreDe, jetonSvg, jetonAngleSvg
} from '../js/core/codageSvg.js';
import { construireFigure, longueur, ORDRE_SEGMENTS } from '../js/core/codage.js';

const dist = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
const proche = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/** Les figures du catalogue, dans des proportions que Rémy donne vraiment. */
const FIGURES = [
    ["carré", construireFigure("carre", { cote: 6 })],
    ["rectangle 12 × 5", construireFigure("rectangle", { L: 12, l: 5 })],
    ["rectangle très plat 20 × 3", construireFigure("rectangle", { L: 20, l: 3 })],
    ["rectangle debout 3 × 14", construireFigure("rectangle", { L: 3, l: 14 })],
    ["losange", construireFigure("losange", { p: 10, q: 6 })],
    ["parallélogramme", construireFigure("parallelogramme", { base: 9, hauteur: 5, decalage: 3 })],
    ["rectangle tourné de 20°", construireFigure("rectangle", { L: 10, l: 4 }, 20 * Math.PI / 180)]
];

test('LA FIGURE EST À L\'ÉCHELLE : LES RAPPORTS DE LONGUEUR SONT CONSERVÉS', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE EXISTE POUR EMPÊCHER. Si le dessin étirait un
    // axe plus que l'autre, un rectangle 12 × 5 apparaîtrait carré — et l'élève
    // qui coderait ses quatre côtés égaux aurait raison de le faire, pendant que
    // le logiciel lui compterait une faute.
    for (const [nom, fig] of FIGURES) {
        const P = pointsProjetes(fig);
        // On prend le premier segment comme étalon et l'on vérifie que TOUS les
        // autres gardent leur rapport avec lui.
        const etalonVrai = longueur(fig, ORDRE_SEGMENTS[0]);
        const etalonVu = dist(P[ORDRE_SEGMENTS[0][0]], P[ORDRE_SEGMENTS[0][1]]);
        const k = etalonVu / etalonVrai;

        for (const id of ORDRE_SEGMENTS) {
            const vrai = longueur(fig, id);
            const vu = dist(P[id[0]], P[id[1]]);
            assert.ok(proche(vu, vrai * k, 1e-6),
                `${nom} : le segment ${id} vaut ${vrai.toFixed(3)} et se dessine ${vu.toFixed(3)} — rapport ${(vu / vrai).toFixed(6)} au lieu de ${k.toFixed(6)}`);
        }
    }
});

test('DEUX SEGMENTS ÉGAUX SE DESSINENT ÉGAUX', () => {
    // La formulation que l'élève vit : dans un carré, les quatre côtés doivent
    // se MESURER pareil à l'écran, pas seulement valoir pareil en théorie.
    const carre = construireFigure('carre', { cote: 6 });
    const P = pointsProjetes(carre);
    const cotes = ['AB', 'BC', 'CD', 'DA'].map(id => dist(P[id[0]], P[id[1]]));
    for (const c of cotes) assert.ok(proche(c, cotes[0], 1e-6), `${c} ≠ ${cotes[0]}`);

    // Et dans un rectangle, les côtés opposés sont égaux, les adjacents non —
    // sinon le codage attendu n'aurait aucun sens.
    const rect = construireFigure('rectangle', { L: 12, l: 5 });
    const R = pointsProjetes(rect);
    assert.ok(proche(dist(R.A, R.B), dist(R.C, R.D), 1e-6));
    assert.ok(!proche(dist(R.A, R.B), dist(R.B, R.C), 1),
        'un rectangle 12 × 5 ne doit pas apparaître carré');
});

test('LA FIGURE TIENT DANS SON CADRE, MARGE COMPRISE', () => {
    // La marge « laisse passer les noms des sommets, posés à dix-sept unités
    // vers l'extérieur ». Un sommet sur le bord emporte sa lettre hors du
    // dessin, et l'élève ne sait plus de quel point on parle.
    for (const [nom, fig] of FIGURES) {
        const boite = cadreDe(fig);
        const P = pointsProjetes(fig, boite);
        for (const [n, p] of Object.entries(P)) {
            assert.ok(p.x >= boite.x && p.x <= boite.x + boite.w,
                `${nom} : ${n} sort du cadre en largeur (${p.x.toFixed(1)} hors de 0..${boite.w})`);
            assert.ok(p.y >= boite.y && p.y <= boite.y + boite.h,
                `${nom} : ${n} sort du cadre en hauteur (${p.y.toFixed(1)} hors de 0..${boite.h})`);
            // Et il reste DANS la marge, à un dixième de pixel près.
            assert.ok(p.x >= boite.pad - 0.1 && p.x <= boite.w - boite.pad + 0.1,
                `${nom} : ${n} mord sur la marge de gauche ou de droite`);
        }
    }
});

test('LA FIGURE EST CENTRÉE DANS SON CADRE', () => {
    // Une figure collée en haut d'un cadre à moitié vide donne l'impression
    // qu'il manque quelque chose — et sur un téléphone, la moitié perdue est
    // précisément celle qu'on voulait donner au dessin.
    for (const [nom, fig] of FIGURES) {
        const boite = cadreDe(fig);
        const P = Object.values(pointsProjetes(fig, boite));
        const xs = P.map(p => p.x), ys = P.map(p => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        assert.ok(Math.abs(cx - boite.w / 2) < 0.5, `${nom} : décentré en x (${cx.toFixed(1)} pour ${boite.w / 2})`);
        assert.ok(Math.abs(cy - boite.h / 2) < 0.5, `${nom} : décentré en y`);
    }
});

test('LE REPÈRE DE L\'ÉCRAN DESCEND, CELUI DES MATHÉMATIQUES MONTE', () => {
    // LA CONVERSION SE FAIT ICI, UNE FOIS. Un `y` oublié retourne la figure du
    // haut en bas : un trapèze posé devient un trapèze suspendu, et l'énoncé ne
    // décrit plus ce qu'on voit.
    const fig = construireFigure('rectangle', { L: 10, l: 4 });
    const haut = Object.entries(fig.points).reduce((m, [n, p]) => (p.y > m[1].y ? [n, p] : m), ['A', fig.points.A]);
    const bas = Object.entries(fig.points).reduce((m, [n, p]) => (p.y < m[1].y ? [n, p] : m), ['A', fig.points.A]);
    const P = pointsProjetes(fig);
    assert.ok(P[haut[0]].y < P[bas[0]].y,
        'le point le plus HAUT en mathématiques doit avoir le plus PETIT y à l\'écran');
});

test('LE CADRE ÉPOUSE LA FIGURE, SANS DEVENIR UN FIL', () => {
    const plat = cadreDe(construireFigure('rectangle', { L: 20, l: 3 }));
    const carre = cadreDe(construireFigure('carre', { cote: 6 }));
    const debout = cadreDe(construireFigure('rectangle', { L: 3, l: 14 }));

    // Une figure large reçoit un cadre large : c'est tout l'intérêt.
    assert.ok(plat.w > carre.w, 'un rectangle très plat doit avoir un cadre plus large qu\'un carré');
    // La hauteur ne bouge JAMAIS : « c'est elle qui fixe l'échelle des marques
    // et des lettres ». Un cadre qui changerait de hauteur ferait grossir les
    // marques d'une figure à l'autre.
    assert.equal(plat.h, carre.h);
    assert.equal(debout.h, carre.h);
    // Et les bornes tiennent : ni fil, ni bandeau sans fin.
    for (const c of [plat, carre, debout]) {
        assert.ok(c.w >= 200, `un cadre de ${c.w} serait un fil`);
        assert.ok(c.w <= (300 - 60) * 3 + 60, `un cadre de ${c.w} déborderait de tout écran`);
    }
});

test('LA MARQUE D\'ÉGALITÉ EST AU MILIEU DU SEGMENT, ET PERPENDICULAIRE À LUI', () => {
    // Une marque penchée ou décalée est illisible : l'élève ne sait plus quel
    // segment elle désigne, et sur une diagonale elle peut même sembler
    // appartenir au côté voisin.
    const p = { x: 10, y: 20 }, q = { x: 70, y: 60 };
    const traits = traitsDeMarque(p, q, 1);
    assert.equal(traits.length, 1, 'un trait pour « une marque »');

    const [a, b] = traits[0];
    const milieuTrait = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const milieuSeg = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    assert.ok(dist(milieuTrait, milieuSeg) < 1e-6, 'la marque est centrée sur le segment');

    // Perpendiculaire : le produit scalaire des deux directions est nul.
    const dSeg = { x: q.x - p.x, y: q.y - p.y };
    const dTrait = { x: b.x - a.x, y: b.y - a.y };
    const scal = dSeg.x * dTrait.x + dSeg.y * dTrait.y;
    assert.ok(Math.abs(scal) < 1e-6, `produit scalaire ${scal} : la marque n'est pas perpendiculaire`);
});

test('DEUX, TROIS MARQUES SE DISTINGUENT — ET QUATRE DEVIENT UNE CROIX', () => {
    // « Un trait, deux traits, trois traits — puis une croix. Quatre symboles
    // suffisent. » Si deux et trois rendaient le même dessin, le
    // parallélogramme quelconque deviendrait impossible à coder : il a besoin
    // des quatre.
    const p = { x: 0, y: 50 }, q = { x: 100, y: 50 };
    const rendus = [1, 2, 3, 4].map(n => traitsDeMarque(p, q, n));

    assert.equal(rendus[0].length, 1);
    assert.equal(rendus[1].length, 2, 'deux marques, deux traits');
    assert.equal(rendus[2].length, 3, 'trois marques, trois traits');

    // Et les quatre symboles sont RÉELLEMENT différents, mesuré sur les points.
    const signature = (t) => JSON.stringify(t.map(([a, b]) =>
        [a.x, a.y, b.x, b.y].map(v => Math.round(v * 100) / 100)));
    assert.equal(new Set(rendus.map(signature)).size, 4,
        'les quatre symboles doivent se distinguer à l\'œil, donc d\'abord au point');

    // Les traits multiples restent groupés autour du milieu du segment.
    for (const t of rendus[2]) {
        const m = { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };
        assert.ok(Math.abs(m.x - 50) < 12, `un trait à ${m.x} s'éloigne trop du milieu`);
    }
});

test('LE PETIT CARRÉ DE L\'ANGLE DROIT EST DANS L\'ANGLE, PAS DEHORS', () => {
    // UN CARRÉ POSÉ À L'EXTÉRIEUR désigne l'angle complémentaire : il dit
    // exactement le contraire de ce qu'on veut dire. Sur une figure tournée, le
    // signe de la projection est ce qui décide.
    for (const [nom, fig] of FIGURES) {
        const P = pointsProjetes(fig);
        // En A, les bras vont vers B et vers D.
        const [p1, p2, p3] = pointsAngleDroit(P.A, P.B, P.D, 13);

        // Chacun des trois points doit se trouver du MÊME côté que le centre de
        // la figure : c'est la définition de « dans l'angle ».
        const uB = { x: P.B.x - P.A.x, y: P.B.y - P.A.y };
        const uD = { x: P.D.x - P.A.x, y: P.D.y - P.A.y };
        for (const [i, pt] of [p1, p2, p3].entries()) {
            const v = { x: pt.x - P.A.x, y: pt.y - P.A.y };
            // Les coordonnées de `v` dans la base (uB, uD) doivent être
            // positives : le point est dans le secteur, pas à l'opposé.
            const det = uB.x * uD.y - uB.y * uD.x;
            const a = (v.x * uD.y - v.y * uD.x) / det;
            const b = (uB.x * v.y - uB.y * v.x) / det;
            assert.ok(a >= -1e-9 && b >= -1e-9,
                `${nom} : le point ${i + 1} du carré est hors de l'angle (${a.toFixed(3)}, ${b.toFixed(3)})`);
        }

        // Et le carré est à l'ÉCHELLE demandée, pas collé au sommet.
        assert.ok(dist(P.A, p1) > 1, `${nom} : le carré est collé au sommet`);
    }
});

test('LE CARRÉ DE L\'ANGLE DROIT EST BIEN UN CARRÉ', () => {
    // Sur un vrai angle droit, les trois points forment deux côtés égaux et
    // perpendiculaires. Un parallélogramme à la place ferait un losange penché
    // qu'aucun élève ne reconnaîtrait comme le signe de l'angle droit.
    const sommet = { x: 100, y: 100 };
    const [p1, p2, p3] = pointsAngleDroit(sommet, { x: 160, y: 100 }, { x: 100, y: 40 }, 13);
    assert.ok(proche(dist(p1, p2), dist(p2, p3), 1e-6), 'les deux côtés du carré sont égaux');
    assert.ok(proche(dist(sommet, p1), 13, 1e-6), 'le côté vaut la taille demandée');
    const v1 = { x: p1.x - sommet.x, y: p1.y - sommet.y };
    const v2 = { x: p3.x - sommet.x, y: p3.y - sommet.y };
    assert.ok(Math.abs(v1.x * v2.x + v1.y * v2.y) < 1e-6, 'et les deux bras sont perpendiculaires');
});

test('LE SVG RENDU EST COMPLET, ET SES NOMBRES SONT FINIS', () => {
    // On ne compare pas des chaînes ; on vérifie seulement qu'aucun `NaN` ni
    // `undefined` ne traverse. Un seul `NaN` dans un attribut, et le navigateur
    // n'affiche RIEN du tout — sans message.
    const sorties = [
        marqueSvg({ x: 0, y: 0 }, { x: 10, y: 10 }, 2),
        angleDroitSvg({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }),
        jetonSvg(1), jetonSvg(2), jetonSvg(3), jetonSvg(4), jetonAngleSvg()
    ];
    for (const s of sorties) {
        assert.ok(s.length > 0, 'un rendu vide ne montre rien');
        assert.ok(!/NaN|undefined|Infinity/.test(s), `un nombre non fini dans : ${s.slice(0, 80)}`);
    }
});

test('UNE FIGURE TOUTE PLATE NE FAIT PAS DIVISER PAR ZÉRO', () => {
    // Cas de garde du code (`Math.max(x1 - x0, 1e-9)`), et il arrive : un
    // générateur mal réglé, ou une figure dégénérée pendant une mise au point.
    // Mieux vaut un dessin bizarre qu'un SVG rempli de `NaN`, qui n'affiche
    // rien et ne dit pas pourquoi.
    const plate = {
        type: 'rectangle',
        points: { A: { x: 0, y: 0 }, B: { x: 10, y: 0 }, C: { x: 10, y: 0 }, D: { x: 0, y: 0 }, O: { x: 5, y: 0 } }
    };
    const P = pointsProjetes(plate, cadreDe(plate));
    for (const [n, p] of Object.entries(P)) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${n} donne ${p.x}, ${p.y}`);
    }
});

test('LA PROJECTION PAR DÉFAUT ET CELLE DU CADRE SONT LA MÊME FONCTION', () => {
    // La feuille imprimée appelle `projeterDans` sur son cadre en millimètres,
    // l'écran sur sa zone de 320 × 300. « D'où le même dessin des deux côtés » —
    // c'est la garantie que ce qu'on voit est ce qui sort de l'imprimante, et
    // elle repose sur le fait qu'il n'y a qu'UNE fonction.
    const fig = construireFigure('rectangle', { L: 12, l: 5 });
    const a = projeter(fig)(fig.points.A);
    const b = projeterDans(fig)(fig.points.A);
    assert.deepEqual(a, b);

    // Et sur un cadre deux fois plus grand, les rapports sont les mêmes.
    const grand = projeterDans(fig, { x: 0, y: 0, w: 640, h: 600, pad: 60 });
    const petit = projeterDans(fig, { x: 0, y: 0, w: 320, h: 300, pad: 30 });
    const rapportGrand = dist(grand(fig.points.A), grand(fig.points.B))
        / dist(grand(fig.points.B), grand(fig.points.C));
    const rapportPetit = dist(petit(fig.points.A), petit(fig.points.B))
        / dist(petit(fig.points.B), petit(fig.points.C));
    assert.ok(proche(rapportGrand, rapportPetit, 1e-9),
        'la même figure doit avoir les mêmes proportions à l\'écran et sur le papier');
});
