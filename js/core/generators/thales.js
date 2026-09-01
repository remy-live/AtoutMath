// THALÈS — trois marches, et la deuxième seulement est un calcul.
//
// Rémy : « Un exercice sur le théorème de Thalès. »
//
// ON NE COMMENCE PAS PAR CALCULER, ET C'EST TOUT LE PROPOS. La faute ordinaire
// n'est pas une erreur de calcul : c'est d'écrire AE/EB au lieu de AE/AB — le
// petit morceau sur le RESTE au lieu du TOUT. Le calcul qui suit tombe alors
// parfaitement juste sur une égalité fausse, et rien ne prévient l'élève. On
// fait donc CHOISIR l'égalité avant de laisser calculer quoi que ce soit.
//
// IL Y AVAIT UNE MARCHE DE PLUS, ET ELLE NE SERVAIT À RIEN. Rémy : « On se
// fiche si c'est en papillon ou en triangle imbriqué. Ne mets pas cette
// partie. » Il a raison, et le module de calcul le disait déjà sans qu'on
// l'écoute : un seul signe sépare les deux configurations, et le théorème
// s'écrit pareil dans les deux. Nommer la figure ne fait pas partie de ce
// qu'on apprend ; la reconnaître, oui — et c'est ce que fait la marche
// suivante, qui demande l'égalité SUR la figure qu'on a sous les yeux.
// La figure, elle, continue de prendre les deux formes : c'est le réglage
// « Configuration ».
//
// LA RÉCIPROQUE EST UNE MARCHE À PART, parce que c'est une autre question. Les
// trois premières marches partent de « les droites sont parallèles » ; la
// quatrième demande de le DÉMONTRER, en comparant deux rapports. C'est le seul
// endroit du chapitre où l'on compare des fractions, et c'est là qu'on écrit
// 0,333 au lieu de 1/3 — d'où la comparaison en produits en croix.
//
// LA FIGURE EST DESSINÉE, PAS À L'ÉCHELLE, et c'est ce que font tous les
// manuels : une figure à l'échelle se mesure à la règle, et l'élève cesse
// d'appliquer le théorème. Seul le RAPPORT est respecté, parce que c'est lui
// qu'on doit voir.

import { makeItem, finalizeChoices } from '../items.js';
import {
    CONFIGURATIONS, creerThales, longueurTexte, egaliteThales, FAUSSES_EGALITES,
    sontParalleles, rapportsCompares, calculThales, pointsReels,
    placeNoms, ancrageNom, ECART_NOM
} from '../thales.js';

/** Les trois marches, dans l'ordre où on les gravit. */
export const ETAPES_THALES = {
    egalite: { id: 'egalite', rang: 1, label: '1 · Écrire la bonne égalité' },
    calculer: { id: 'calculer', rang: 2, label: '2 · Calculer une longueur' },
    reciproque: { id: 'reciproque', rang: 3, label: '3 · La réciproque : est-ce parallèle ?' }
};

export const ORDRE_THALES = Object.values(ETAPES_THALES)
    .sort((a, b) => a.rang - b.rang).map(e => e.id);

/** Combien de questions on passe sur une marche avant de monter. */
const PAR_MARCHE = 3;

/**
 * LA FIGURE, EN SVG — la même à l'écran et (redessinée) sur la fiche.
 *
 * `cotes` dit quelles longueurs sont écrites sur le dessin : une figure qui
 * porte toutes ses mesures ne demande plus rien, une figure qui n'en porte
 * aucune ne demande pas la bonne chose.
 */
// LES DEUX TAILLES DE TEXTE DE LA FIGURE, en unités de la figure. Au niveau du
// module parce que le tracé (SVG ou PDF) et le calcul de mise en page les
// lisent tous les deux : une cote se place en fonction de la place que son
// nombre occupe.
const TAILLE_NOM = 7, TAILLE_COTE = 6;

export function figureThalesSvg(f, cotes = []) {
    const e = figureThalesElements(f, cotes);
    const T = (v) => v.toFixed(1);

    const doubleFleche = (c) => {
        const dx = c.q1.x - c.p1.x, dy = c.q1.y - c.p1.y;
        const n = Math.hypot(dx, dy) || 1;
        const vx = dx / n, vy = dy / n;
        const pointe = (P0, sx, sy) => `<path d="M${T(P0.x)} ${T(P0.y)}
            L${T(P0.x - sx * POINTE - (-sy) * LARGE_POINTE)} ${T(P0.y - sy * POINTE + sx * -LARGE_POINTE)}
            L${T(P0.x - sx * POINTE + (-sy) * LARGE_POINTE)} ${T(P0.y - sy * POINTE + sx * LARGE_POINTE)} Z"
            class="th-pointe"/>`;
        const attache = (P0, P1) => {
            const ex = P1.x - P0.x, ey = P1.y - P0.y;
            const l = Math.hypot(ex, ey) || 1;
            const gx = ex / l, gy = ey / l;
            return `<line x1="${T(P0.x + gx * ATTACHE_DEBUT)}" y1="${T(P0.y + gy * ATTACHE_DEBUT)}"
                x2="${T(P1.x + gx * ATTACHE_FIN)}" y2="${T(P1.y + gy * ATTACHE_FIN)}" class="th-attache"/>`;
        };
        return attache(c.p, c.p1) + attache(c.q, c.q1)
            + `<line x1="${T(c.p1.x)}" y1="${T(c.p1.y)}" x2="${T(c.q1.x)}" y2="${T(c.q1.y)}"
                class="th-ligne-cote"/>`
            + pointe(c.p1, -vx, -vy) + pointe(c.q1, vx, vy);
    };

    return `<svg viewBox="${T(e.vue.x0)} ${T(e.vue.y0)} ${T(e.vue.w)} ${T(e.vue.h)}"
        class="th-fig fig-svg" role="img"
        aria-label="Figure de Thalès, ${CONFIGURATIONS[f.config].label}">
        <style>
            .th-droite { stroke: #4a5568; stroke-width: .8; fill: none; }
            .th-para { stroke: #2f855a; stroke-width: 1.5; fill: none; }
            .th-base { stroke: #2b6cb0; stroke-width: 1.5; fill: none; }
            .th-nom { font-size: ${TAILLE_NOM}px; font-weight: 800; fill: #1a202c; }
            .th-cote { font-size: ${TAILLE_COTE}px; font-weight: 700; fill: #2c5282; }
            /* La cote est du dessin technique : trait fin, pointe pleine. */
            .th-ligne-cote { stroke: #2c5282; stroke-width: .55; }
            .th-attache { stroke: #2c5282; stroke-width: .35; opacity: .6; }
            .th-pointe { fill: #2c5282; }
        </style>
        ${e.traits.map(t => `<line x1="${T(t.p.x)}" y1="${T(t.p.y)}" x2="${T(t.q.x)}" y2="${T(t.q.y)}" class="th-${t.genre}"/>`).join('\n        ')}
        ${e.cotes.map(doubleFleche).join('\n        ')}
        ${e.noms.map(t => `<text x="${T(t.x)}" y="${T(t.yBase)}" text-anchor="${t.ancre}" class="th-nom">${t.texte}</text>`).join('\n        ')}
        ${e.cotes.map(c => `<text x="${T(c.x)}" y="${T(c.y)}" transform="rotate(${c.angle.toFixed(1)} ${T(c.x)} ${T(c.y)})" text-anchor="middle" dominant-baseline="central" class="th-cote">${c.texte}</text>`).join('\n        ')}
    </svg>`;
}

/** Les mesures de la double flèche, partagées par l'écran et le papier. */
const POINTE = 2.6, LARGE_POINTE = 1.15, ATTACHE_DEBUT = 1.6, ATTACHE_FIN = 1.4;

/**
 * LA FIGURE, EN ÉLÉMENTS — ce que l'écran dessine en SVG et le papier en PDF.
 *
 * La mise en page d'une cote coûte cher : deux côtés, sept écarts, un score qui
 * pèse le dégagement de la ligne, celui du texte tourné, et de quel côté est le
 * dehors. L'écrire deux fois — une pour le navigateur, une pour l'imprimante —
 * aurait donné deux figures qui divergent au premier réglage, et Rémy verrait
 * sur sa feuille une cote posée ailleurs qu'à l'écran. Le calcul vit donc ici,
 * une seule fois, et rend des coordonnées que chacun trace à sa façon.
 *
 * @returns {{vue, traits, noms, cotes}} tout en unités de la figure
 */
export function figureThalesElements(f, cotes = []) {
    const P = f.points;
    const dirs = placeNoms(P);
    // L'ORDRE DES DEUX LETTRES EST CELUI DE LA COTE : la clé cherchée est
    // « DE », pas « ED ». Les lire à l'envers revient à ne pas trouver la
    // longueur, et la cote disparaît en silence.
    const SEGMENTS = [['A', 'B'], ['A', 'C'], ['A', 'E'], ['A', 'D'], ['B', 'C'], ['D', 'E']];

    /** Distance d'un point à un segment — la vraie, pas celle à la droite. */
    const distSegment = (c, p, q) => {
        const dx = q.x - p.x, dy = q.y - p.y;
        const l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, ((c.x - p.x) * dx + (c.y - p.y) * dy) / l2)) : 0;
        return Math.hypot(c.x - (p.x + t * dx), c.y - (p.y + t * dy));
    };

    // UNE ÉTIQUETTE EST UNE BOÎTE, PAS UN POINT. « AB = 20 » fait vingt unités
    // de large : c'est son BOUT qui touche le trait, jamais son centre, et
    // c'est exactement l'erreur qui laissait les cotes barrées d'un trait
    // malgré un décalage. On la mesure donc par sa boîte, ancrage compris —
    // une étiquette ancrée à droite s'étend vers la GAUCHE de son point.
    const ancre = (a) => a.h > 0 ? 'start' : a.h < 0 ? 'end' : 'middle';
    const ligneBase = (a, taille) => (a.v > 0 ? 0.82 : a.v < 0 ? -0.10 : 0.34) * taille;
    // LA BOÎTE EST CELLE DE L'ENCRE, pas celle du point d'ancrage. Un texte
    // SVG se pose par le PIED de ses lettres : mesurer la boîte avant ce
    // décalage revenait à mesurer un rectangle situé jusqu'à cinq unités plus
    // haut que le texte réel — donc à déclarer dégagé ce qui ne l'était pas.
    const boite = (x, y, texte, taille, anc) => {
        const base = y + ligneBase(anc, taille);
        const large = texte.length * taille * 0.56;
        const gauche = anc.h > 0 ? x : anc.h < 0 ? x - large : x - large / 2;
        return {
            x0: gauche, x1: gauche + large,
            y0: base - taille * 0.72, y1: base + taille * 0.2
        };
    };
    // LES COTES DÉJÀ TRACÉES SONT DES OBSTACLES, elles aussi. Deux doubles
    // flèches parallèles posées au même écart se superposeraient — et c'est le
    // cas ordinaire, puisque [AE] est un morceau de [AB].
    const lignesPosees = [];

    /**
     * Ce qui reste de libre autour d'un RECTANGLE TOURNÉ — la boîte d'une cote
     * couchée le long de sa flèche.
     *
     * Il faut la boîte entière et pas seulement sa ligne médiane : le texte fait
     * six unités de haut, donc un trait qui passe à deux unités de son axe le
     * traverse. Mesuré avant de le comprendre : une cote à 0,01 unité d'un trait,
     * déclarée dégagée.
     */
    const degagementBoite = (coins, saufSegment, dejaPosees) => {
        let libre = Infinity;
        const [A, B, C, D] = coins;
        const pts = [];
        for (let i = 0; i <= 8; i++) {
            for (let j = 0; j <= 3; j++) {
                const u = i / 8, v = j / 3;
                const haut = { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u };
                const bas = { x: D.x + (C.x - D.x) * u, y: D.y + (C.y - D.y) * u };
                pts.push({ x: haut.x + (bas.x - haut.x) * v, y: haut.y + (bas.y - haut.y) * v });
            }
        }
        for (const [u, v] of SEGMENTS) {
            if ((u === saufSegment[0] && v === saufSegment[1])
                || (u === saufSegment[1] && v === saufSegment[0])) continue;
            pts.forEach(c => { libre = Math.min(libre, distSegment(c, P[u], P[v])); });
        }
        lignesPosees.forEach(l => {
            pts.forEach(c => { libre = Math.min(libre, distSegment(c, l.p, l.q)); });
        });
        // LES ÉTIQUETTES DÉJÀ ÉCRITES COMPTENT AUSSI, et il a fallu le voir pour
        // y penser : [AE] est un morceau de [AB], donc leurs deux cotes sont
        // portées par la MÊME droite. Décalées l'une de l'autre, leurs lignes ne
        // se touchaient plus — mais « AE = 8 » et « AB = 16 » s'écrivaient l'un
        // sur l'autre, et par-dessus la lettre E.
        (dejaPosees || []).forEach(b => {
            pts.forEach(c => {
                const dx = Math.max(b.x0 - c.x, c.x - b.x1, 0);
                const dy = Math.max(b.y0 - c.y, c.y - b.y1, 0);
                libre = Math.min(libre, Math.hypot(dx, dy));
            });
        });
        return libre;
    };

    /** Ce qui reste de libre autour d'une LIGNE de cote, sur toute sa longueur. */
    const degagementLigne = (p1, q1, saufSegment) => {
        let libre = Infinity;
        const pts = [];
        for (let i = 0; i <= 8; i++) {
            pts.push({ x: p1.x + (q1.x - p1.x) * i / 8, y: p1.y + (q1.y - p1.y) * i / 8 });
        }
        for (const [u, v] of SEGMENTS) {
            if ((u === saufSegment[0] && v === saufSegment[1])
                || (u === saufSegment[1] && v === saufSegment[0])) continue;
            pts.forEach(c => { libre = Math.min(libre, distSegment(c, P[u], P[v])); });
        }
        lignesPosees.forEach(l => {
            pts.forEach(c => { libre = Math.min(libre, distSegment(c, l.p, l.q)); });
        });
        return libre;
    };
    // LES LETTRES D'ABORD : elles sont fixées par la géométrie du point (voir
    // `placeNoms`), les cotes s'arrangeront autour d'elles.
    const posees = [];
    const textes = [];
    const noms = [];
    for (const nom of ['A', 'B', 'C', 'E', 'D']) {
        const d = dirs[nom], a = ancrageNom(d);
        const x = P[nom].x + d.x * ECART_NOM;
        const y = P[nom].y + d.y * ECART_NOM;
        const b = boite(x, y, nom, TAILLE_NOM, a);
        posees.push(b);
        textes.push({ b });
        noms.push({ x, yBase: y + ligneBase(a, TAILLE_NOM), ancre: ancre(a), texte: nom });
    }

    // UNE LONGUEUR SE COTE À LA DOUBLE FLÈCHE — c'est ce qui manquait.
    //
    // Rémy, deux fois : « les longueurs ne sont pas claires, mets des doubles
    // flèches ». Une cote n'était qu'un texte posé à côté du segment, et
    // « AB = 20 » flottant près de deux traits qui se croisent ne dit pas
    // lequel des deux il mesure — surtout ici, où [AE] est un MORCEAU de [AB]
    // et où les deux cotes se ressemblent. La convention du dessin technique
    // règle exactement ce problème : une ligne de cote décalée, deux lignes
    // d'attache qui la rattachent aux extrémités, et une flèche à chaque bout
    // qui dit « d'ici à là ». On lit alors l'étendue avant de lire le nombre.
    //
    // OÙ LA POSER : CONTRE LE SEGMENT, ET DEHORS.
    //
    // Rémy, devant le premier jet : « ton dessin est correct mais c'est bizarre,
    // colle les flèches aux côtés, écris les longueurs dont la direction est la
    // même que les flèches, et c'est centré. »
    //
    // Il décrit la convention du dessin technique, et le premier jet s'en était
    // écarté pour une mauvaise raison. On cherchait alors la place la plus LIBRE
    // — deux côtés, six écarts, trois positions le long de la flèche, et l'on
    // gardait le meilleur score. Le nombre étant écrit à l'horizontale, il lui
    // fallait un vrai carré de blanc ; le seul moyen d'en trouver était de
    // pousser la cote loin de la figure. D'où ces flèches qui flottaient à deux
    // centimètres de leur segment, reliées par de longues lignes d'attache : on
    // ne voyait plus ce qu'elles mesuraient.
    //
    // LE NOMBRE COUCHÉ LE LONG DE SA FLÈCHE N'A PLUS BESOIN DE CE CARRÉ. Il
    // occupe la bande de la cote elle-même, qui est déjà dégagée puisque la cote
    // y est. On peut donc coller la ligne au segment — trois unités —, et il ne
    // reste qu'un seul choix à faire : DE QUEL CÔTÉ. Dehors, toujours : à
    // l'intérieur l'étiquette se retrouve entre deux traits et l'on ne sait plus
    // lequel elle mesure.
    //
    // Le second écart n'est là que pour les cotes PARALLÈLES — [AE] est un
    // morceau de [AB], leurs deux flèches se superposeraient au même écart.
    const D_COTE = 3;
    const centre = {
        x: Object.values(P).reduce((t, p) => t + p.x, 0) / 5,
        y: Object.values(P).reduce((t, p) => t + p.y, 0) / 5
    };
    const fleches = [];
    for (const [a, b, nom] of SEGMENTS) {
        if (!cotes.includes(nom) && !cotes.includes(a + b)) continue;
        const cle = cotes.includes(nom) ? nom : a + b;
        const p = P[a], q = P[b];
        const dx = q.x - p.x, dy = q.y - p.y;
        const n = Math.hypot(dx, dy) || 1;
        // UN SEGMENT TROP COURT NE PORTE PAS SA COTE : la flèche et le nombre
        // se poseraient sur les lettres de ses deux extrémités.
        if (n < 14) continue;
        const texte = `${cle} = ${longueurTexte(f[cle])}`;
        let mieux = null;
        for (const sens of [1, -1]) {
            // LE PREMIER ÉCART QUI TIENT GAGNE, mais il faut aller jusqu'au bout
            // de la liste : sur un papillon, quatre droites se croisent en A, et
            // une cote courte porte une étiquette PLUS LONGUE que son segment —
            // elle dépasse des deux côtés et va se poser sur la droite voisine.
            // Seule la distance l'en écarte.
            for (const ecart of [D_COTE, D_COTE + 4, D_COTE + 8, D_COTE + 13,
                D_COTE + 19, D_COTE + 26, D_COTE + 34]) {
                const ux = -dy / n * sens, uy = dx / n * sens;
                const p1 = { x: p.x + ux * ecart, y: p.y + uy * ecart };
                const q1 = { x: q.x + ux * ecart, y: q.y + uy * ecart };
                // Le nombre au MILIEU de la cote, poussé d'un demi-corps vers
                // l'extérieur : il longe la flèche sans la couper.
                const x = (p1.x + q1.x) / 2 + ux * TAILLE_COTE * 0.62;
                const y = (p1.y + q1.y) / 2 + uy * TAILLE_COTE * 0.62;
                const libreLigne = degagementLigne(p1, q1, [a, b]);
                // De quel côté est le dehors ? On le mesure sur le rayon qui va
                // du centre de la figure au milieu du segment.
                const mx = p.x + dx / 2, my = p.y + dy / 2;
                const rx = mx - centre.x, ry = my - centre.y;
                const r = Math.hypot(rx, ry) || 1;
                const dehors = (((p1.x + q1.x) / 2 - mx) * rx
                    + ((p1.y + q1.y) / 2 - my) * ry) / r;
                // LA BOÎTE DU TEXTE, TOURNÉE COMME LUI. C'est un rectangle
                // couché le long de la cote, et c'est lui qu'il faut mesurer :
                // sa ligne médiane seule laissait passer des traits qui le
                // traversent par le travers.
                const vx = dx / n, vy = dy / n;
                const demiL = texte.length * TAILLE_COTE * 0.28;
                const demiH = TAILLE_COTE * 0.5;
                const coin = (sl, sh) => ({
                    x: x + vx * demiL * sl + ux * demiH * sh,
                    y: y + vy * demiL * sl + uy * demiH * sh
                });
                const coins = [coin(-1, -1), coin(1, -1), coin(1, 1), coin(-1, 1)];
                const libreTexte = degagementBoite(coins, [a, b], posees);
                // NE PAS TOUCHER UN TRAIT PASSE AVANT TOUT LE RESTE.
                // UN TRAIT TOUCHÉ NE S'ACHÈTE PAS. La pénalité doit dépasser
                // tout ce que la proximité peut rapporter, sinon une cote bien
                // collée se paie d'une étiquette barrée — mesuré à 0,03 unité
                // d'un trait sur un papillon, où quatre droites se croisent en A.
                const trop = (libreLigne < 2.2 ? (2.2 - libreLigne) * 30 : 0)
                    + (libreTexte < 2.2 ? (2.2 - libreTexte) * 30 : 0);
                // COLLÉE D'ABORD, DEHORS ENSUITE. L'écart pèse lourd — c'est la
                // demande —, et le dehors tranche entre deux positions également
                // collées.
                const score = Math.min(libreLigne, 5) + Math.min(libreTexte, 5)
                    - trop - ecart * 1.1 + Math.max(-1, Math.min(1, dehors / 3)) * 3;
                if (!mieux || score > mieux.score) {
                    mieux = { score, x, y, p1, q1, ux, uy, coins };
                }
            }
        }
        lignesPosees.push({ p: mieux.p1, q: mieux.q1 });
        fleches.push({ ...mieux, p, q });

        // LE TEXTE TOURNE AVEC LA FLÈCHE, ET JAMAIS LA TÊTE EN BAS. Au-delà du
        // quart de tour on ajoute un demi-tour : le nombre se lit toujours de
        // gauche à droite, comme sur un plan. Il pivote autour de son point
        // d'ancrage, donc ce demi-tour ne le déplace pas.
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle > 90 || angle < -90) angle += 180;
        // La boîte du texte, pour le cadrage de la figure : couché, il s'étend
        // le long du segment. On la prend généreuse — elle ne sert qu'à ne rien
        // laisser dépasser du cadre.
        const bt = {
            x0: Math.min(...mieux.coins.map(c => c.x)), x1: Math.max(...mieux.coins.map(c => c.x)),
            y0: Math.min(...mieux.coins.map(c => c.y)), y1: Math.max(...mieux.coins.map(c => c.y))
        };
        posees.push(bt);
        textes.push({ b: bt });
        fleches[fleches.length - 1].texte = texte;
        fleches[fleches.length - 1].angle = angle;
    }

    // LA BOÎTE ÉPOUSE TOUT CE QU'ON A DESSINÉ, figure ET étiquettes. Un carré
    // fixe laissait tantôt la moitié d'un papillon dehors, tantôt un tiers de
    // blanc à droite d'un emboîté ; une boîte calculée sur les seuls points
    // coupait les cotes, qui sortent de la figure.
    const bx = [...Object.values(P).map(p => p.x), ...textes.map(t => t.b.x0),
        ...textes.map(t => t.b.x1),
        ...fleches.flatMap(c => [c.p1.x, c.q1.x])];
    const by = [...Object.values(P).map(p => p.y), ...textes.map(t => t.b.y0),
        ...textes.map(t => t.b.y1),
        ...fleches.flatMap(c => [c.p1.y, c.q1.y])];
    const m = 2;
    const x0 = Math.min(...bx) - m, x1 = Math.max(...bx) + m;
    const y0 = Math.min(...by) - m, y1 = Math.max(...by) + m;

    const trait = (a, b, genre) => ({ p: P[a], q: P[b], genre });

    return {
        vue: { x0, y0, w: x1 - x0, h: y1 - y0 },
        traits: [
            trait('A', 'B', 'droite'), trait('A', 'C', 'droite'),
            trait('A', 'E', 'droite'), trait('A', 'D', 'droite'),
            trait('B', 'C', 'base'), trait('D', 'E', 'para')
        ],
        noms, cotes: fleches,
        tailleNom: TAILLE_NOM, tailleCote: TAILLE_COTE
    };
}

// --- LES FRACTIONS S'ÉCRIVENT EN COLONNE ----------------------------------------
//
// Rémy : « Ecris les fraction en colonne. »
//
// « AE/AB », c'est une commodité de clavier, pas une écriture mathématique.
// Or c'est justement l'ÉCRITURE qu'on travaille sur cette marche : l'élève
// doit reconnaître que le petit segment est au NUMÉRATEUR et le grand au
// DÉNOMINATEUR, et la barre oblique ne montre ni l'un ni l'autre — elle les
// met côte à côte. Une barre horizontale les met l'un SUR l'autre, et la
// faute qu'on traque (AE sur EB) devient visible sans lire.
//
// ON TRADUIT LE TEXTE PLUTÔT QUE DE DOUBLER LES DONNÉES. Les quatre fausses
// égalités sont écrites une fois, en texte, avec leur diagnostic ; en écrire
// une seconde version en HTML les aurait fait diverger au premier ajout.
// Cette fonction lit « AE/AB = AD/AC = DE/BC » et le dessine — donc toute
// égalité nouvelle est dessinée sans qu'on y pense.

/** Une fraction à deux étages, comme au tableau. */
const fracHtml = (n, d) => `<span class="fraction"><span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

/** « AE/AB = AD/AC = DE/BC » dessiné en trois fractions et deux signes égal. */
export function egaliteEnColonnes(texte) {
    const morceaux = String(texte).split('=').map(x => x.trim());
    return `<span class="th-eg">` + morceaux.map(m => {
        const [n, d] = m.split('/');
        // Un morceau sans barre — une longueur seule — se pose tel quel : la
        // fonction sert aussi aux rapports d'une réciproque.
        return d === undefined ? `<span>${m}</span>` : fracHtml(n.trim(), d.trim());
    }).join('<span class="th-eg-signe">=</span>') + `</span>`;
}

// --- Les trois marches -----------------------------------------------------------

function etapeEgalite(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    const fausses = rng.shuffle(FAUSSES_EGALITES.slice()).slice(0, 3);
    return {
        f,
        // UN ÉNONCÉ TIENT SUR UNE LIGNE. Rémy, sur son iPhone : « dépasse un
        // peu verticalement ; de manière générale, tu peux réduire un peu
        // l'énoncé. » Sur 375 px, « Quelle égalité donne le théorème de Thalès
        // ici ? » passait sur DEUX lignes de gros caractères — soixante pixels
        // pris à la figure et aux réponses pour dire ce que le titre de
        // l'exercice dit déjà. Il s'appelle « Le Théorème de Thalès ».
        prompt: 'Quelle égalité de Thalès ?',
        html: '<div class="game-question">Quelle égalité de <b>Thalès</b> ?</div>'
            + `<div class="figure-wrap">${figureThalesSvg(f)}</div>`,
        papier: 'Les droites (DE) et (BC) sont parallèles. Écris l\'égalité des trois '
            + 'rapports donnée par le théorème de Thalès.',
        answer: egaliteThales(),
        // `value` reste le TEXTE — c'est la clé de la réponse, elle est
        // comparée à `answer` et enregistrée dans le carnet d'erreurs.
        // `label` est ce qu'on montre, `texte` ce que le robot lit à voix
        // haute : trois rôles, trois champs, aucun qui empiète sur l'autre.
        choices: [{
            value: egaliteThales(), label: egaliteEnColonnes(egaliteThales()),
            texte: egaliteThales(), correct: true
        }].concat(fausses.map(x => ({
            value: x.texte, label: egaliteEnColonnes(x.texte), texte: x.texte,
            why: x.pourquoi
        }))),
        explanation: `${egaliteThales()}. Chaque petit segment se compare au segment ENTIER `
            + 'qui le contient — AE avec AB, pas avec EB — et les trois rapports vont tous '
            + 'dans le même sens.',
        hints: ['Chaque rapport compare un petit segment au GRAND segment qui le contient.',
            'AE va avec AB (et non avec EB), AD va avec AC, DE va avec BC.'],
        difficulty: 3
    };
}

function etapeCalculer(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    // On cherche une longueur du petit triangle : c'est le sens direct, celui
    // qu'on rencontre d'abord.
    const cherche = rng.pick(['AD', 'DE', 'AE']);
    const calc = calculThales(f, cherche);
    const cotes = calc.donnees;
    const L = longueurTexte;
    const donnees = cotes.map(n => `${n} = ${L(f[n])} cm`).join(', ');
    return {
        f,
        prompt: `(DE) et (BC) sont parallèles. ${donnees}. Calcule ${cherche}, en cm.`,
        html: `<div class="game-question">(DE) // (BC). Calcule <b>${cherche}</b> (en cm).</div>`
            + `<div class="figure-wrap">${figureThalesSvg(f, cotes)}</div>`,
        papier: `Les droites (DE) et (BC) sont parallèles, ${donnees}. Calcule ${cherche}, en cm.`,
        answer: calc.valeur,
        numerique: true,
        explanation: calc.lignes.join(' '),
        hints: ['Commence par écrire l\'égalité de Thalès : ' + egaliteThales() + '.',
            `Garde les deux rapports qui contiennent ${cherche} et une longueur connue, `
                + 'puis fais le produit en croix.'],
        cotes,
        difficulty: 3
    };
}

function etapeReciproque(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    // UNE FOIS SUR DEUX C'EST FAUX, et il faut que ce soit faux de PEU : si le
    // décalage saute aux yeux, l'élève répond sans calculer et n'apprend rien.
    const paralleles = rng.bool(0.5);
    const g = { ...f };
    if (!paralleles) {
        const ecart = rng.pick([1, -1, 2, -2]);
        g.AD = Math.max(1, Math.round((f.AD + ecart) * 10) / 10);
        if (sontParalleles(g)) g.AD = Math.round((g.AD + 1) * 10) / 10;
    }
    // La figure suit les longueurs DONNÉES, pas le rapport d'origine : sans
    // cela, elle dessinerait (DE) parallèle à (BC) alors que la réponse est
    // « non ».
    g.points = pointsReels(g);
    const vrai = sontParalleles(g);
    const r = rapportsCompares(g);
    const L = longueurTexte;
    const donnees = `AE = ${L(g.AE)} cm, AB = ${L(g.AB)} cm, AD = ${L(g.AD)} cm, `
        + `AC = ${L(g.AC)} cm`;
    return {
        f: g,
        prompt: `${donnees}. Les droites (DE) et (BC) sont-elles parallèles ?`,
        // LES QUATRE LONGUEURS VONT SUR LA FIGURE, PAS DANS L'ÉNONCÉ. Rémy :
        // « Le texte des boutons est petit. » Elles y étaient pour deux : un
        // énoncé de quatre-vingts caractères prend deux lignes en très gros
        // caractères, pousse la figure vers le bas et écrase tout ce qui
        // suit — c'est ce qui rendait les propositions minuscules. Et c'est
        // par ailleurs la présentation de tous les manuels : une figure de
        // réciproque PORTE ses mesures, sinon on ne sait pas quoi comparer.
        html: '<div class="game-question">Les droites (DE) et (BC) sont-elles '
            + '<b>parallèles</b> ?</div>'
            + `<div class="figure-wrap">${figureThalesSvg(g, ['AE', 'AB', 'AD', 'AC'])}</div>`,
        papier: `${donnees}. Les droites (DE) et (BC) sont-elles parallèles ? Justifie.`,
        answer: vrai ? 'Oui, elles sont parallèles' : 'Non, elles ne sont pas parallèles',
        choices: [
            { value: vrai ? 'Oui, elles sont parallèles' : 'Non, elles ne sont pas parallèles',
                correct: true },
            { value: vrai ? 'Non, elles ne sont pas parallèles' : 'Oui, elles sont parallèles',
                why: vrai
                    ? `Refais le calcul : ${r.premier} et ${r.second} sont bien la même fraction.`
                    : `Les deux rapports valent ${r.premier} et ${r.second} : ce n'est pas `
                        + 'la même fraction, donc les droites ne sont pas parallèles.' },
            { value: 'On ne peut pas savoir',
                why: 'Si : la réciproque de Thalès tranche. Il suffit de comparer AE/AB et '
                    + 'AD/AC — s\'ils sont égaux, c\'est parallèle.' }
        ],
        nbChoix: 3,
        explanation: `AE/AB = ${r.premier} et AD/AC = ${r.second}. `
            + (vrai
                ? 'Les deux rapports sont ÉGAUX, et les points sont dans le même ordre : '
                    + 'd\'après la réciproque du théorème de Thalès, (DE) et (BC) sont parallèles.'
                : 'Les deux rapports sont DIFFÉRENTS, donc (DE) et (BC) ne sont pas '
                    + 'parallèles. Attention : compare des fractions, pas des valeurs '
                    + 'arrondies — 1/3 n\'est pas 0,33.'),
        hints: ['Calcule les deux rapports AE/AB et AD/AC, avec les longueurs '
            + 'écrites sur la figure.',
            'Compare-les en FRACTIONS (produit en croix), pas en valeurs approchées.'],
        cotes: [],
        difficulty: 4
    };
}

const MARCHES = {
    egalite: etapeEgalite,
    calculer: etapeCalculer,
    reciproque: etapeReciproque
};

/** La marche à travailler pour la question numéro `index`. */
export function marcheThales(etape, index) {
    if (etape && etape !== 'progressif' && MARCHES[etape]) return etape;
    const rang = Math.floor((index || 0) / PAR_MARCHE);
    // Arrivé en haut on recommence en bas : sur une fiche de vingt questions,
    // plafonner donnerait onze fois la même.
    return ORDRE_THALES[rang % ORDRE_THALES.length];
}

export const thalesGenerator = {
    id: 'geo.thales',
    label: 'Le théorème de Thalès',
    skills: ['geo.thales'],
    // Trois marches sur quatre sont des propositions, la troisième est un
    // nombre : l'item déclare donc ce qu'il est, question par question.
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        {
            id: 'etape', type: 'select', label: 'Marche à travailler', default: 'progressif',
            aide: '« Tout en ordre » monte d\'une marche toutes les trois questions : '
                + 'écrire l\'égalité, calculer une longueur, puis la réciproque. On ne '
                + 'commence pas par le calcul, et c\'est voulu : la faute ordinaire est '
                + 'd\'écrire AE/EB au lieu de AE/AB, et le calcul qui suit tombe alors '
                + 'parfaitement juste sur une égalité fausse.',
            options: [{ value: 'progressif', label: 'Tout en ordre, du plus simple au plus dur' }]
                .concat(ORDRE_THALES.map(e => ({ value: e, label: ETAPES_THALES[e].label })))
        },
        {
            id: 'config', type: 'select', label: 'Configuration', default: 'melange',
            aide: 'Le papillon est le même théorème avec le point A entre les deux '
                + 'parallèles. Le travailler à part aide ceux qui ne le reconnaissent pas.',
            options: [
                { value: 'melange', label: 'Les deux, mélangées' },
                { value: 'emboites', label: 'Triangles emboîtés seulement' },
                { value: 'papillon', label: 'Papillon seulement' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const marche = marcheThales(p.etape, ctx.index);
        // « Mélange » tire à chaque question ; un réglage explicite s'impose,
        // ce qui permet de ne travailler que le papillon — celui que les élèves
        // ne reconnaissent pas.
        const config = CONFIGURATIONS[p.config] ? p.config
            : rng.pick(['emboites', 'papillon']);
        let q = null;
        // La figure peut être impossible (inégalité triangulaire) : on retire.
        for (let essai = 0; essai < 30 && !q; essai++) q = MARCHES[marche](rng, config);
        if (!q) return null;
        const numerique = !!q.numerique;
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.thales',
            skillId: 'geo.thales',
            answerKind: numerique ? 'numeric' : 'choice',
            prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
            answer: q.answer,
            choices: numerique ? null
                : finalizeChoices(rng, q.choices, { count: q.nbChoix || 4 }),
            hints: q.hints,
            explanation: q.explanation,
            difficulty: q.difficulty,
            meta: {
                etape: marche, rang: ETAPES_THALES[marche].rang,
                config: q.f.config,
                // La fiche redessine la figure : il lui faut les points et les
                // longueurs, pas le SVG de l'écran.
                points: q.f.points,
                longueurs: ['AB', 'AC', 'BC', 'AE', 'AD', 'DE']
                    .reduce((o, n) => ({ ...o, [n]: q.f[n] }), {}),
                cotes: q.cotes || []
            }
        });
    }
};
