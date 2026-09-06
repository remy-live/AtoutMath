// LE PÉRIMÈTRE DU TRIANGLE — quatre étapes, et une figure à chaque fois.
//
// Rémy : « nous avons déjà fait un exercice sur les périmètres et les aires du
// rectangle. J'aimerais bien faire un exercice sur le périmètre du triangle. »
//
// LE PÉRIMÈTRE, C'EST LE TOUR, ET ÇA SE VOIT OU ÇA NE SE COMPREND PAS. Sur le
// rectangle, la formule 2 × (L + l) finit par masquer le tour ; sur le
// triangle, il n'y a pas de formule à retenir — on ajoute les trois côtés —,
// et c'est justement ce qui en fait le bon exercice pour installer l'idée. La
// figure est donc dessinée À L'ÉCHELLE, avec ses cotes : un triangle dont un
// côté fait 3 et un autre 9 doit se voir long d'un côté et court de l'autre,
// sinon on lit des nombres au lieu de regarder une forme.
//
// LE CODAGE EST DESSINÉ, PARCE QU'IL EST LA MOITIÉ DE LA LEÇON. Sur l'isocèle,
// les deux côtés égaux portent leurs marques et UNE SEULE mesure est écrite :
// c'est le codage qui dit que l'autre vaut pareil. Un élève à qui l'on écrit
// les trois nombres n'apprend rien de l'isocèle, il additionne.
//
// Module pur : le tracé sort en SVG (une chaîne), rien n'est touché du DOM.

/** L'échelle, du plus simple au plus exigeant. */
export const MARCHES_TRIANGLE = [
    { id: 'quelconque', nom: '1. Trois côtés donnés' },
    { id: 'isocele', nom: '2. Le triangle isocèle' },
    { id: 'equilateral', nom: '3. Le triangle équilatéral' },
    { id: 'manquant', nom: '4. Le côté qui manque' }
];

/** Un nombre à la française. Les côtés sont entiers, mais pas les demi-sommes. */
export const ecrireNombre = (x) => String(Math.round(Number(x) * 100) / 100).replace('.', ',');

/** Une longueur avec son unité. */
export const ecrireLongueur = (x, unite) => `${ecrireNombre(x)} ${unite}`;

/**
 * TROIS LONGUEURS FONT-ELLES UN TRIANGLE ?
 *
 * L'inégalité triangulaire, et elle ne sert pas qu'à la théorie : un tirage qui
 * l'oublie produit une figure impossible à dessiner — les deux petits côtés ne
 * se rejoignent jamais — et l'on s'en aperçoit à l'écran, pas avant.
 */
export const estUnTriangle = (a, b, c) => a + b > c && a + c > b && b + c > a;

/**
 * ET FAIT-IL UN TRIANGLE QU'ON PEUT LIRE ?
 *
 * L'inégalité triangulaire accepte 2, 11, 11 : c'est un triangle, mais dessiné
 * il ressemble à un trait. On exige donc que le plus petit angle dépasse 22° —
 * mesuré sur les premiers tirages, c'est la limite en dessous de laquelle les
 * cotes se chevauchent et où l'on ne voit plus trois côtés.
 */
export function assezOuvert(a, b, c) {
    if (!estUnTriangle(a, b, c)) return false;
    const angle = (x, y, z) => Math.acos((y * y + z * z - x * x) / (2 * y * z));
    return Math.min(angle(a, b, c), angle(b, a, c), angle(c, a, b)) >= 22 * Math.PI / 180;
}

/**
 * TIRER UN TRIANGLE — et n'en tirer qu'un qui existe.
 *
 * @param {Object} rng
 * @param {string} marche
 * @param {{max?: number}} opts  la plus grande longueur autorisée
 * @returns {{marche, a, b, c, perimetre, cache?, unite}}
 *   `a` = BC, `b` = AC, `c` = AB — la convention du collège : chaque côté porte
 *   le nom du sommet opposé.
 */
export function tirerTriangle(rng, marche = 'quelconque', { max = 12, unite = 'cm' } = {}) {
    const M = Math.max(4, Math.round(max) || 12);
    let a, b, c;

    if (marche === 'equilateral') {
        a = b = c = rng.int(2, M);
    } else if (marche === 'isocele') {
        // LES DEUX CÔTÉS ÉGAUX SONT AC ET AB : le triangle est isocèle EN A, et
        // c'est ainsi qu'on le dit en classe. La base peut être plus courte ou
        // plus longue que les côtés — un isocèle n'est pas toujours pointu.
        do {
            b = c = rng.int(3, M);
            a = rng.int(2, Math.min(M, 2 * b - 1));
        } while (!assezOuvert(a, b, c) || a === b);
    } else {
        do {
            a = rng.int(2, M); b = rng.int(2, M); c = rng.int(2, M);
        } while (!assezOuvert(a, b, c) || a === b || b === c || a === c);
    }

    // LE TRIANGLE NE SE POSE PAS TOUJOURS PAREIL. Sans cette rotation, A serait
    // toujours en bas à gauche et l'isocèle pointerait éternellement vers le
    // même coin : on apprendrait la position au lieu de la figure. C'est le
    // même défaut que celui corrigé en trigonométrie, où l'angle droit toujours
    // en bas à gauche enseignait « adjacent = horizontal ».
    const rot = rng.int(0, 11) * 30;

    const perimetre = a + b + c;
    if (marche !== 'manquant') return { marche, a, b, c, perimetre, unite, rot };

    // LE CÔTÉ QUI MANQUE : on donne le périmètre et deux côtés. Le triangle est
    // quelconque — sur un isocèle, le codage donnerait la réponse.
    do {
        a = rng.int(2, M); b = rng.int(2, M); c = rng.int(2, M);
    } while (!assezOuvert(a, b, c) || a === b || b === c || a === c);
    const cache = ['a', 'b', 'c'][rng.int(0, 2)];
    return { marche, a, b, c, perimetre: a + b + c, cache, unite, rot };
}

/** Le côté cherché, quand il en manque un. */
export const cotecache = (t) => t[t.cache];

// --- Ce qu'on demande, ce qu'on répond ---------------------------------------

const NOM_COTE = { a: '[BC]', b: '[AC]', c: '[AB]' };

export function enonceDe(t) {
    switch (t.marche) {
    case 'equilateral':
        return `Ce triangle est équilatéral et son côté mesure ${ecrireLongueur(t.a, t.unite)}. `
            + `Quel est son périmètre ?`;
    case 'isocele':
        return `Ce triangle est isocèle en A. Quel est son périmètre ?`;
    case 'manquant':
        return `Le périmètre de ce triangle vaut ${ecrireLongueur(t.perimetre, t.unite)}. `
            + `Combien mesure le côté ${NOM_COTE[t.cache]} ?`;
    default:
        return 'Quel est le périmètre de ce triangle ?';
    }
}

export const reponseDe = (t) => (t.marche === 'manquant' ? cotecache(t) : t.perimetre);

/**
 * L'EXPLICATION — le calcul, puis la raison. Deux phrases, pas plus.
 */
export function expliquer(t) {
    const u = t.unite;
    switch (t.marche) {
    case 'equilateral':
        return `Les trois côtés sont égaux : ${ecrireNombre(t.a)} × 3 = ${ecrireNombre(t.perimetre)} ${u}. `
            + `Le périmètre, c’est le tour de la figure.`;
    case 'isocele':
        return `Les deux côtés marqués sont égaux : ${ecrireNombre(t.b)} + ${ecrireNombre(t.c)} `
            + `+ ${ecrireNombre(t.a)} = ${ecrireNombre(t.perimetre)} ${u}. `
            + `Le codage dit que [AB] et [AC] ont la même longueur.`;
    case 'manquant': {
        const autres = ['a', 'b', 'c'].filter(k => k !== t.cache).map(k => ecrireNombre(t[k]));
        return `On enlève du périmètre les deux côtés connus : ${ecrireNombre(t.perimetre)} `
            + `− ${autres[0]} − ${autres[1]} = ${ecrireNombre(cotecache(t))} ${u}. `
            + `Le tour est connu, il manque un morceau.`;
    }
    default:
        return `On ajoute les trois côtés : ${ecrireNombre(t.c)} + ${ecrireNombre(t.a)} `
            + `+ ${ecrireNombre(t.b)} = ${ecrireNombre(t.perimetre)} ${u}. `
            + `Le périmètre, c’est le tour de la figure.`;
    }
}

/** Les erreurs qu'on voit vraiment, et ce qu'elles disent. */
export function leurresDe(t) {
    const juste = reponseDe(t);
    const brut = t.marche === 'manquant'
        ? [
            { value: t.perimetre - Math.max(...['a', 'b', 'c'].filter(k => k !== t.cache).map(k => t[k])), why: 'Tu n’as enlevé qu’un seul des deux côtés connus.' },
            { value: t.perimetre, why: 'C’est le périmètre entier, pas le côté qui manque.' },
            { value: Math.round(t.perimetre / 3 * 100) / 100, why: 'Le triangle n’est pas équilatéral : on ne partage pas le périmètre en trois.' }
        ]
        : [
            { value: t.a + t.b, why: 'Tu n’as ajouté que deux côtés : le tour en compte trois.' },
            { value: Math.round(t.a * t.b * 100) / 100, why: 'Le périmètre s’additionne. Multiplier donnerait une aire, pas un tour.' },
            { value: t.marche === 'equilateral' ? t.a * 2 : t.perimetre - Math.min(t.a, t.b, t.c),
                why: 'Il manque un côté dans ton addition.' },
            { value: Math.round(t.perimetre / 2 * 100) / 100, why: 'Le triangle a trois côtés, pas quatre : il n’y a pas de moitié à prendre.' }
        ];

    const vus = new Set([juste]);
    return brut.filter(l => {
        const v = Math.round(Number(l.value) * 100) / 100;
        if (!Number.isFinite(v) || v <= 0 || vus.has(v)) return false;
        vus.add(v);
        return true;
    }).map(l => ({ ...l, value: Math.round(Number(l.value) * 100) / 100 }));
}

// --- La figure ----------------------------------------------------------------

const VUE = 200;      // côté du carré de dessin, en unités de la figure
const MARGE = 26;     // de quoi loger les cotes et les noms de sommets

/**
 * LES TROIS SOMMETS, À L'ÉCHELLE.
 *
 * A à l'origine, B sur l'axe horizontal à la distance c, et C se déduit des
 * deux autres longueurs — c'est le tracé au compas, écrit en coordonnées. La
 * figure est ensuite recadrée pour remplir la vue : un triangle tiré au hasard
 * peut être long et plat ou presque équilatéral, et il doit rester lisible dans
 * les deux cas.
 */
export function sommetsTriangle(t) {
    const { a, b, c } = t;
    const x = (b * b + c * c - a * a) / (2 * c);
    const y = Math.sqrt(Math.max(0, b * b - x * x));
    const pose = [{ n: 'A', x: 0, y: 0 }, { n: 'B', x: c, y: 0 }, { n: 'C', x, y }];
    const th = ((Number(t.rot) || 0) * Math.PI) / 180;
    const brut = pose.map(p => ({
        n: p.n,
        x: p.x * Math.cos(th) - p.y * Math.sin(th),
        y: p.x * Math.sin(th) + p.y * Math.cos(th)
    }));

    const xs = brut.map(p => p.x), ys = brut.map(p => p.y);
    const larg = Math.max(...xs) - Math.min(...xs) || 1;
    const haut = Math.max(...ys) - Math.min(...ys) || 1;
    const k = Math.min((VUE - 2 * MARGE) / larg, (VUE - 2 * MARGE) / haut);
    const dx = (VUE - larg * k) / 2 - Math.min(...xs) * k;
    const dy = (VUE - haut * k) / 2 - Math.min(...ys) * k;
    // L'AXE DES ORDONNÉES EST RETOURNÉ : en SVG, y descend. Sans ce retournement
    // le triangle est dessiné la pointe en bas, ce qui est juste mais se lit mal.
    return brut.map(p => ({ n: p.n, x: p.x * k + dx, y: VUE - (p.y * k + dy) }));
}

/** Le SVG du triangle, coté et codé. */
export function figureTriangleSvg(t) {
    const S = Object.fromEntries(sommetsTriangle(t).map(p => [p.n, p]));
    const T = (v) => v.toFixed(1);
    const centre = { x: (S.A.x + S.B.x + S.C.x) / 3, y: (S.A.y + S.B.y + S.C.y) / 3 };

    // UNE COTE SE POSE DEHORS. Au milieu du côté, poussée à l'opposé du centre
    // de gravité : c'est la règle la plus simple qui marche pour tous les
    // triangles, y compris les très plats.
    const cote = (P, Q, texte, marques) => {
        const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
        const vx = mx - centre.x, vy = my - centre.y;
        const n = Math.hypot(vx, vy) || 1;
        const ecart = 15;
        const tx = mx + (vx / n) * ecart, ty = my + (vy / n) * ecart;
        // Les marques du codage : un, deux ou trois petits traits en travers du
        // côté, au milieu — comme au tableau.
        const dx = Q.x - P.x, dy = Q.y - P.y;
        const l = Math.hypot(dx, dy) || 1;
        const ux = dx / l, uy = dy / l;
        const traits = Array.from({ length: marques || 0 }, (_, i) => {
            const d = (i - (marques - 1) / 2) * 5;
            const cx = mx + ux * d, cy = my + uy * d;
            return `<line x1="${T(cx - uy * 5)}" y1="${T(cy + ux * 5)}"
                x2="${T(cx + uy * 5)}" y2="${T(cy - ux * 5)}" class="tri-marque"/>`;
        }).join('');
        return `${traits}<text x="${T(tx)}" y="${T(ty)}" text-anchor="middle"
            dominant-baseline="central" class="tri-cote">${texte}</text>`;
    };

    // UNE MESURE PAR LONGUEUR DIFFÉRENTE, ET PAS UNE DE PLUS. Sur l'isocèle, le
    // côté [AC] ne porte pas son nombre : ce sont ses marques qui disent qu'il
    // vaut autant que [AB]. Sur l'équilatéral, un seul nombre pour les trois.
    // Écrire partout la même mesure supprimerait le codage de l'exercice — il
    // ne resterait qu'une addition.
    const muet = { isocele: ['b'], equilateral: ['a', 'b'] }[t.marche] || [];
    const dit = (k) => (t.marche === 'manquant' && t.cache === k)
        ? '?'
        : (muet.includes(k) ? '' : ecrireNombre(t[k]));
    // Sur l'isocèle, une seule mesure est écrite : le codage dit le reste.
    // Sur l'équilatéral, les trois marques disent que tout est égal.
    const marques = t.marche === 'isocele' ? { b: 1, c: 1, a: 0 }
        : (t.marche === 'equilateral' ? { a: 1, b: 1, c: 1 } : { a: 0, b: 0, c: 0 });

    return `<svg viewBox="0 0 ${VUE} ${VUE}" class="tri-fig fig-svg" role="img"
        aria-label="${t.marche === 'equilateral' ? 'Triangle équilatéral'
        : t.marche === 'isocele' ? 'Triangle isocèle en A' : 'Triangle'} ABC">
        <style>
            .tri-trait { stroke: #2b6cb0; stroke-width: 2.4; fill: #ebf4ff; stroke-linejoin: round; }
            .tri-marque { stroke: #c05621; stroke-width: 2; }
            .tri-cote { font-size: 15px; font-weight: 800; fill: #2c5282; }
            .tri-nom { font-size: 14px; font-weight: 800; fill: #1a202c; }
        </style>
        <polygon points="${T(S.A.x)},${T(S.A.y)} ${T(S.B.x)},${T(S.B.y)} ${T(S.C.x)},${T(S.C.y)}"
            class="tri-trait"/>
        ${cote(S.B, S.C, dit('a'), marques.a)}
        ${cote(S.A, S.C, dit('b'), marques.b)}
        ${cote(S.A, S.B, dit('c'), marques.c)}
        ${[S.A, S.B, S.C].map(p => {
        const vx = p.x - centre.x, vy = p.y - centre.y;
        const n = Math.hypot(vx, vy) || 1;
        return `<text x="${T(p.x + (vx / n) * 13)}" y="${T(p.y + (vy / n) * 13)}"
            text-anchor="middle" dominant-baseline="central" class="tri-nom">${p.n}</text>`;
    }).join('')}
    </svg>`;
}
