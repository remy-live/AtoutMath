// L'AIRE DES FIGURES — le domaine : tirage, dessins cotés, énoncés, indices.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre : « tu me fais […] les aires et préimètres ».
//
// CE QUI MANQUAIT EXACTEMENT, mesuré avant d'écrire : l'aire du RECTANGLE
// existait (`mes.aire.rectangle`), celle du DISQUE aussi, et le triangle
// n'avait que son PÉRIMÈTRE. L'aire du triangle et celle du parallélogramme
// n'avaient ni compétence ni exercice — alors que ce sont les deux formules de
// cinquième, et les deux seules où intervient une HAUTEUR.
//
// ── LA HAUTEUR EST TOUT LE CHAPITRE, ET ELLE SE TRACE ─────────────────────
//
// Dans « base × hauteur », la hauteur n'est pas un côté : c'est la distance
// entre la base et le sommet opposé, perpendiculairement. Un élève qui prend
// le côté oblique a un calcul juste sur de mauvais nombres, et personne ne le
// voit. Les figures tracent donc la hauteur en pointillés AVEC son angle
// droit, et le côté oblique porte lui aussi sa mesure — c'est le seul moyen de
// rendre la faute possible, donc visible.
//
// ── LA QUATRIÈME MARCHE EST LA CONFUSION DU CHAPITRE ──────────────────────
//
// Sur la MÊME figure, on demande tantôt l'aire, tantôt le périmètre. Tant
// qu'un exercice ne demande qu'une des deux, l'élève applique la formule du
// jour sans jamais se demander laquelle. Et l'unité le dit : des cm pour un
// tour, des cm² pour une surface.

import { figure } from './figures.js';
import { pt, cote, etiquette, cadreSvg } from './cotes.js';

/* ── LES MARCHES ──────────────────────────────────────────────────────── */

export const MARCHES_AIRE = [
    { id: 'rectangle', nom: '1. L’aire du rectangle (6ème)' },
    { id: 'triangle', nom: '2. L’aire du triangle (5ème)' },
    { id: 'parallelogramme', nom: '3. L’aire du parallélogramme (5ème)' },
    { id: 'ou', nom: '4. Aire ou périmètre ? (à ne pas confondre)' }
];

export const DIFFICULTE_AIRE = {
    rectangle: 1, triangle: 2, parallelogramme: 2, ou: 3
};

/* ── LE TIRAGE ────────────────────────────────────────────────────────── */

/**
 * Tire une figure et ses dimensions.
 *
 * Rend `{ marche, quoi, unite, dims, reponse }` où `quoi` vaut 'aire' ou
 * 'perimetre' — il ne vaut 'perimetre' que sur la quatrième marche.
 */
export function tirerAire(rng, marche = 'rectangle', { unite = 'cm' } = {}) {
    const t = { marche, quoi: 'aire', unite, dims: {}, reponse: 0 };
    switch (marche) {
        case 'rectangle': {
            // LA LONGUEUR EST LA PLUS GRANDE DES DEUX, et les deux diffèrent.
            // Sur un carré, l'élève qui multiplie la mauvaise paire tombe
            // juste et nul ne l'apprend ; et une « longueur » plus courte que
            // la « largeur » apprend un mot faux dans un exercice qui sert
            // justement à les nommer.
            const L = rng.int(5, 14);
            const l = rng.int(2, L - 1);
            t.dims = { L, l };
            t.reponse = L * l;
            break;
        }
        case 'triangle': {
            // LA BASE EST PAIRE, ET C'EST LA FAÇON LA PLUS SÛRE.
            //
            // Il fallait que (b × h) ÷ 2 tombe juste — sinon l'aire est un
            // demi et la faute qu'on mesure n'est plus celle de la formule.
            // Mais il fallait AUSSI que (b × oblique) ÷ 2 tombe juste : c'est
            // le leurre du chapitre, et un leurre à virgule se repère sans
            // calculer. Une base paire règle les deux d'un coup.
            // ET LA HAUTEUR NE DÉPASSE PAS LA BASE DE BEAUCOUP. Regardé :
            // une base de 4 et une hauteur de 11 donnent une aiguille, où la
            // cote de la hauteur passe par-dessus les deux côtés et où l'on
            // ne distingue plus l'oblique de la verticale.
            const b = 2 * rng.int(3, 7);
            const h = rng.int(3, Math.min(11, b + 1));
            // LE CÔTÉ OBLIQUE EST PLUS LONG QUE LA HAUTEUR, toujours, et sa
            // mesure est écrite : c'est LUI que prend l'élève qui se trompe.
            // Sans lui sur la figure, la faute est impossible — donc invisible.
            const oblique = h + rng.int(1, 4);
            t.dims = { b, h, oblique };
            t.reponse = b * h / 2;
            break;
        }
        case 'parallelogramme': {
            // BASE PAIRE ici aussi : le leurre « j'ai divisé par 2 » vaut
            // b × h ÷ 2, et il doit tomber juste pour ne pas se trahir.
            const b = 2 * rng.int(3, 6);
            const h = rng.int(3, Math.min(10, b));
            const oblique = h + rng.int(1, 4);
            t.dims = { b, h, oblique };
            t.reponse = b * h;
            break;
        }
        case 'ou': {
            // LA MÊME FIGURE, ET LA QUESTION TIRE L'UNE OU L'AUTRE.
            //
            // SAUF SI LES DEUX DONNENT LE MÊME NOMBRE. Sur un rectangle de
            // 6 sur 3, l'aire vaut 18 et le périmètre aussi : la question
            // « aire ou périmètre ? » ne distingue alors plus rien, celui qui
            // se trompe de formule tombe juste, et le leurre qui dénonce la
            // confusion vaut la bonne réponse — il disparaît. C'est le seul
            // rectangle non carré dans ce cas, et une épreuve l'a trouvé.
            let L = rng.int(5, 14);
            let l = rng.int(2, L - 1);
            while (L * l === 2 * (L + l)) {
                L = rng.int(5, 14);
                l = rng.int(2, L - 1);
            }
            t.dims = { L, l };
            t.quoi = rng.bool() ? 'aire' : 'perimetre';
            t.reponse = t.quoi === 'aire' ? L * l : 2 * (L + l);
            break;
        }
        default:
            return tirerAire(rng, 'rectangle', { unite });
    }
    return t;
}

/* ── CE QU'ON DEMANDE, ET CE QU'ON ATTEND ─────────────────────────────── */

const NOM = {
    rectangle: 'ce rectangle', triangle: 'ce triangle',
    parallelogramme: 'ce parallélogramme', ou: 'ce rectangle'
};
const UN = {
    rectangle: 'un rectangle', triangle: 'un triangle',
    parallelogramme: 'un parallélogramme', ou: 'un rectangle'
};

export function enonceDe(t) {
    return t.quoi === 'perimetre'
        ? `Calcule le PÉRIMÈTRE de ${NOM[t.marche]}.`
        : `Calcule l’AIRE de ${NOM[t.marche]}.`;
}

/** Ce qui s'écrit à côté du pavé : des cm² pour une aire, des cm pour un tour. */
export const uniteDe = (t) => (t.quoi === 'aire' ? `${t.unite}²` : t.unite);

export const reponseEcrite = (t) => `${t.reponse} ${uniteDe(t)}`;

/** « L = 7 cm, l = 3 cm » — pour la feuille, qui n'a pas le dessin. */
export function dimensionsEcrites(t) {
    const u = t.unite, d = t.dims;
    switch (t.marche) {
        case 'triangle':
            return `base ${d.b} ${u}, hauteur ${d.h} ${u} (côté oblique ${d.oblique} ${u})`;
        case 'parallelogramme':
            return `base ${d.b} ${u}, hauteur ${d.h} ${u} (côté oblique ${d.oblique} ${u})`;
        default:
            return `L = ${d.L} ${u}, l = ${d.l} ${u}`;
    }
}

export function enoncePapierDe(t) {
    const quoi = t.quoi === 'perimetre' ? 'le PÉRIMÈTRE' : 'l’AIRE';
    const art = UN[t.marche].startsWith('un p') || UN[t.marche].startsWith('un r')
        || UN[t.marche].startsWith('un t') ? `d’${UN[t.marche]}` : `de ${UN[t.marche]}`;
    return `Calcule ${quoi} ${art} : ${dimensionsEcrites(t)}.`;
}

export const FORMULES = {
    rectangle: 'Longueur × largeur',
    triangle: '(base × hauteur) ÷ 2',
    parallelogramme: 'base × hauteur',
    perimetre: '2 × (Longueur + largeur)'
};

/* ── L'EXPLICATION, LES INDICES, LES LEURRES ──────────────────────────── */

export function expliquer(t) {
    const d = t.dims, R = reponseEcrite(t);
    if (t.quoi === 'perimetre') {
        return `Le PÉRIMÈTRE est le TOUR : 2 × (${d.L} + ${d.l}) = ${R}. Un tour se mesure `
            + `en ${t.unite}, jamais en ${t.unite}².`;
    }
    switch (t.marche) {
        case 'triangle':
            return `Aire = (base × hauteur) ÷ 2 = (${d.b} × ${d.h}) ÷ 2 = ${R}. La hauteur `
                + `est ${d.h}, pas ${d.oblique} : ${d.oblique} est le côté OBLIQUE, et il ne `
                + 'sert jamais au calcul de l’aire.';
        case 'parallelogramme':
            return `Aire = base × hauteur = ${d.b} × ${d.h} = ${R}. Un parallélogramme se `
                + 'découpe et se recolle en RECTANGLE de mêmes base et hauteur — c’est pour '
                + `cela qu’il n’y a pas de ÷ 2. Le côté oblique (${d.oblique}) ne sert pas.`;
        default:
            return `Aire = Longueur × largeur = ${d.L} × ${d.l} = ${R}. Une surface se mesure `
                + `en ${t.unite}², parce qu’on compte des carrés de 1 ${t.unite} de côté.`;
    }
}

export function indicesDe(t) {
    const d = t.dims, u = t.unite;
    if (t.quoi === 'perimetre') {
        return [
            'Lis bien ce qu’on demande : le PÉRIMÈTRE, c’est le TOUR de la figure, pas la '
                + 'place qu’elle occupe.',
            `Périmètre = 2 × (L + l) = 2 × (${d.L} + ${d.l}).`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
    }
    switch (t.marche) {
        case 'triangle': return [
            'Un triangle est la MOITIÉ d’un rectangle de même base et même hauteur. '
                + 'Calcule donc ce rectangle, puis divise par 2.',
            `La hauteur est le trait en pointillés, ${d.h} ${u} — et non le côté oblique, `
                + `qui mesure ${d.oblique} ${u}. (${d.b} × ${d.h}) ÷ 2.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'parallelogramme': return [
            'Découpe le triangle qui dépasse d’un côté et recolle-le de l’autre : tu obtiens '
                + 'un RECTANGLE de même base et même hauteur.',
            `Il n’y a donc pas de ÷ 2 : base × hauteur = ${d.b} × ${d.h}. La hauteur est le `
                + `trait en pointillés, pas le côté oblique.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        default: return [
            'L’aire, c’est le nombre de carrés de 1 ' + u + ' de côté qui remplissent la '
                + 'figure. On peut les compter, ou les multiplier.',
            `Aire = Longueur × largeur = ${d.L} × ${d.l}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
    }
}

export function leurresDe(t) {
    const d = t.dims, u = uniteDe(t);
    const out = [];
    const ajoute = (v, why) => out.push({ value: String(v), label: `${v} ${u}`, why });

    if (t.quoi === 'perimetre') {
        ajoute(d.L * d.l, 'Tu as calculé l’AIRE, pas le périmètre. L’aire est la place '
            + 'occupée (en ' + t.unite + '²) ; le périmètre est le TOUR (en ' + t.unite + ').');
        ajoute(d.L + d.l, 'Tu n’as fait qu’un demi-tour : un rectangle a QUATRE côtés.');
    } else if (t.marche === 'triangle') {
        // LA FAUTE DU CHAPITRE : prendre le côté oblique pour la hauteur. Elle
        // tombe juste parce que la base est paire — voir `tirerAire`.
        ajoute(d.b * d.oblique / 2,
            `Tu as pris le côté OBLIQUE (${d.oblique}) à la place de la hauteur (${d.h}). `
            + 'La hauteur est le trait en pointillés, celui qui fait un angle droit avec '
            + 'la base.');
        ajoute(d.b * d.h, 'Tu as oublié de DIVISER PAR 2. Ce que tu as calculé, c’est l’aire '
            + 'du rectangle de même base et même hauteur — le triangle en est la moitié.');
    } else if (t.marche === 'parallelogramme') {
        ajoute(d.b * d.h / 2,
            'Tu as divisé par 2. C’est la formule du TRIANGLE : un parallélogramme se '
            + 'recolle en rectangle ENTIER, il n’y a rien à couper.');
        ajoute(d.b * d.oblique,
            `Tu as pris le côté OBLIQUE (${d.oblique}) à la place de la hauteur (${d.h}).`);
        ajoute(2 * (d.b + d.oblique), 'C’est le PÉRIMÈTRE, le tour de la figure — pas l’aire.');
    } else {
        ajoute(2 * (d.L + d.l), 'C’est le PÉRIMÈTRE, le tour de la figure. L’aire est la '
            + 'place qu’elle occupe, et elle se compte en ' + t.unite + '².');
        ajoute(d.L + d.l, 'Tu as additionné les deux dimensions. Une aire se MULTIPLIE : '
            + 'on compte des carrés, pas des côtés.');
    }
    return out.filter(l => Number(l.value) !== t.reponse && Number(l.value) > 0);
}

/* ── LES DESSINS ──────────────────────────────────────────────────────── */
//
// LE CADRE SE CALCULE — voir `core/cotes.js`, et la règle qui l'a fait naître.

const ANGLE_DROIT = (P, x, y, dx, dy) => {
    P.push([x, y]);
    return `<path class="fig-droit" d="M ${pt(x + dx * 9, y)} L ${pt(x + dx * 9, y + dy * 9)}
        L ${pt(x, y + dy * 9)}"/>`;
};

const echelle = (valeurs, place) => Math.min(place / Math.max(...valeurs, 1), 26);

function rectangleCoteSvg(L, l, u) {
    const e = echelle([L, l], 170);
    const w = L * e, h = l * e;
    const P = [[0, 0], [w, 0], [w, -h], [0, -h]];
    const m = [`<path class="fig-trait" d="M 0,0 L ${pt(w, 0)} L ${pt(w, -h)} L ${pt(0, -h)} Z"/>`];
    m.push(cote(P, 0, 14, w, 14, `${L} ${u}`, { dy: 18 }));
    m.push(cote(P, -14, 0, -14, -h, `${l} ${u}`, { dx: -8, ancre: 'end' }));
    return cadreSvg(m.join('\n        '), P, { classe: 'air-svg',
        aria: `Un rectangle de ${L} ${u} sur ${l} ${u}` });
}

function triangleAireSvg(b, h, oblique, u) {
    const e = echelle([b, h], 150);
    const w = b * e, ht = h * e;
    // LE SOMMET EST AU-DESSUS DE LA BASE, mais pas au milieu : un triangle
    // isocèle laisse croire que la hauteur est un axe de symétrie, et l'élève
    // la cherche alors toujours au centre.
    const sx = w * 0.34;
    const A = [0, 0], B = [w, 0], S = [sx, -ht];
    const P = [A, B, S];
    const m = [`<path class="fig-trait" d="M ${pt(...A)} L ${pt(...B)} L ${pt(...S)} Z"/>`];
    m.push(`<line class="fig-hauteur" x1="${sx.toFixed(1)}" y1="${(-ht).toFixed(1)}"
        x2="${sx.toFixed(1)}" y2="0"/>`);
    m.push(ANGLE_DROIT(P, sx, 0, -1, -1));
    m.push(cote(P, 0, 14, w, 14, `${b} ${u}`, { dy: 18 }));
    m.push(etiquette(P, sx - 16, -ht / 2, `h = ${h} ${u}`, 'end'));
    // LE CÔTÉ OBLIQUE PORTE SA MESURE : c'est lui que prend l'élève qui se
    // trompe, et sans elle la faute est impossible — donc invisible.
    m.push(etiquette(P, (sx + w) / 2 + 10, -ht / 2, `${oblique} ${u}`, 'start'));
    return cadreSvg(m.join('\n        '), P, { classe: 'air-svg',
        aria: `Un triangle de base ${b} ${u} et de hauteur ${h} ${u}` });
}

function parallelogrammeSvg(b, h, oblique, u) {
    const e = echelle([b, h], 150);
    const w = b * e, ht = h * e, d = ht * 0.55;
    const A = [0, 0], B = [w, 0], C = [w + d, -ht], D = [d, -ht];
    const P = [A, B, C, D];
    const m = [`<path class="fig-trait" d="M ${pt(...A)} L ${pt(...B)} L ${pt(...C)}
        L ${pt(...D)} Z"/>`];
    m.push(`<line class="fig-hauteur" x1="${d.toFixed(1)}" y1="${(-ht).toFixed(1)}"
        x2="${d.toFixed(1)}" y2="0"/>`);
    m.push(ANGLE_DROIT(P, d, 0, 1, -1));
    m.push(cote(P, 0, 14, w, 14, `${b} ${u}`, { dy: 18 }));
    m.push(etiquette(P, d - 16, -ht / 2, `h = ${h} ${u}`, 'end'));
    m.push(etiquette(P, (w + d + w) / 2 + 12, -ht / 2, `${oblique} ${u}`, 'start'));
    return cadreSvg(m.join('\n        '), P, { classe: 'air-svg',
        aria: `Un parallélogramme de base ${b} ${u} et de hauteur ${h} ${u}` });
}

export function figureAireSvg(t) {
    const d = t.dims, u = t.unite;
    switch (t.marche) {
        case 'triangle': return triangleAireSvg(d.b, d.h, d.oblique, u);
        case 'parallelogramme': return parallelogrammeSvg(d.b, d.h, d.oblique, u);
        default: return rectangleCoteSvg(d.L, d.l, u);
    }
}

export const figureAire = (t) => figure(figureAireSvg(t), 'fig-aire');
