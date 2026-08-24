// CODER UNE FIGURE — le noyau, sans une ligne de DOM.
//
// Rémy : « Un exercice sur le codage : on a une figure, soit un carré soit un
// rectangle soit un parallélogramme soit un losange, et les diagonales sont
// tracées. Le but est de coder la figure par glisser de codage sur les
// segments (les diagonales sont coupées en deux pour mettre un symbole d'un
// côté et de l'autre) et on peut faire un glisser d'angle droit soit sur les
// diagonales soit sur les sommets. »
//
// CE QUE CODER VEUT DIRE, ET POURQUOI C'EST UN EXERCICE. Coder, ce n'est pas
// décorer : c'est ÉCRIRE les propriétés de la figure avec les seules marques
// que la géométrie accepte. Deux segments portent la même marque quand ils ont
// la même longueur — et seulement dans ce cas. Un petit carré à un sommet dit
// que l'angle y est droit — et il ne se pose pas ailleurs.
//
// D'où la seule chose qui compte pour corriger : le PARTAGE des segments en
// paquets de même longueur, jamais le symbole choisi. Un élève qui met un trait
// sur les côtés et deux sur les demi-diagonales a exactement aussi raison que
// celui qui fait l'inverse. C'est pourquoi la réponse est canonisée avant
// d'être comparée : on renumérote les marques dans leur ordre d'apparition, et
// deux codages équivalents deviennent la même chaîne.
//
// TOUT SE DÉDUIT DES COORDONNÉES. Rien n'est écrit en dur, pas même « le
// losange a ses diagonales perpendiculaires » : on mesure. Une figure fausse
// se corrigerait donc toute seule, et surtout on ne peut pas mentir à l'élève —
// ce qu'on lui demande de coder est ce que la figure EST.

const EPS = 1e-7;

export const TYPES_CODAGE = ['carre', 'rectangle', 'losange', 'parallelogramme'];

export const NOM_TYPE = {
    carre: 'un carré',
    rectangle: 'un rectangle',
    losange: 'un losange',
    parallelogramme: 'un parallélogramme'
};

/** L'ordre de référence : côtés d'abord, puis les quatre demi-diagonales. */
export const ORDRE_SEGMENTS = ['AB', 'BC', 'CD', 'DA', 'AO', 'OC', 'BO', 'OD'];
export const ORDRE_COTES = ['AB', 'BC', 'CD', 'DA'];
/** Là où un angle droit peut se poser : les quatre sommets, et le centre. */
export const POINTS_ANGLE = ['A', 'B', 'C', 'D', 'O'];

/** Les segments d'une figure, avec ou sans ses diagonales. */
export function segmentsDe(avecDiagonales = true) {
    return avecDiagonales ? ORDRE_SEGMENTS : ORDRE_COTES;
}

export function pointsAngleDe(avecDiagonales = true) {
    return avecDiagonales ? POINTS_ANGLE : POINTS_ANGLE.filter(p => p !== 'O');
}

// --- Construire la figure ---------------------------------------------------

/**
 * Les quatre sommets, dans le sens du parcours A → B → C → D.
 *
 * Repère mathématique : y monte. Le rendu SVG le retournera, mais tout ce qui
 * se calcule ici — longueurs, angles — se moque du sens de l'axe.
 */
function sommetsBruts(type, d) {
    if (type === 'carre') {
        const c = d.cote;
        return [{ x: 0, y: 0 }, { x: c, y: 0 }, { x: c, y: c }, { x: 0, y: c }];
    }
    if (type === 'rectangle') {
        return [{ x: 0, y: 0 }, { x: d.L, y: 0 }, { x: d.L, y: d.l }, { x: 0, y: d.l }];
    }
    if (type === 'losange') {
        // Par ses diagonales : elles sont perpendiculaires, et c'est justement
        // ce que l'élève doit coder.
        return [
            { x: -d.p / 2, y: 0 }, { x: 0, y: -d.q / 2 },
            { x: d.p / 2, y: 0 }, { x: 0, y: d.q / 2 }
        ];
    }
    // Parallélogramme : une base, une hauteur, et un décalage qui le penche.
    return [
        { x: 0, y: 0 }, { x: d.base, y: 0 },
        { x: d.base + d.decalage, y: d.hauteur }, { x: d.decalage, y: d.hauteur }
    ];
}

const tourner = (p, a) => ({
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a)
});

const milieu = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/**
 * @param {string} type - carre | rectangle | losange | parallelogramme
 * @param {Object} dims - selon le type : {cote} {L,l} {p,q} {base,hauteur,decalage}
 * @param {number} [rotation] - en radians, pour une figure penchée
 */
export function construireFigure(type, dims, rotation = 0) {
    const bruts = sommetsBruts(type, dims);
    const points = {};
    ['A', 'B', 'C', 'D'].forEach((nom, i) => { points[nom] = tourner(bruts[i], rotation); });
    // Les quatre familles sont des parallélogrammes : leurs diagonales se
    // coupent en leur milieu. Un seul centre suffit donc, et il est exact.
    points.O = milieu(points.A, points.C);
    return { type, points, rotation, dims };
}

/** Les deux extrémités d'un segment, par son identifiant. */
export function bornesDe(id) {
    return { de: id[0], a: id[1] };
}

export function longueur(fig, id) {
    const { de, a } = bornesDe(id);
    const p = fig.points[de], q = fig.points[a];
    return Math.hypot(q.x - p.x, q.y - p.y);
}

// --- Ce que la figure DIT -----------------------------------------------------

/**
 * Les paquets de segments de même longueur — le codage attendu, mesuré.
 * Chaque paquet est trié dans l'ordre de référence, et les paquets entre eux
 * aussi : deux figures identiques donnent la même liste.
 */
export function classesDeLongueur(fig, ids = ORDRE_SEGMENTS) {
    const paquets = [];
    ids.forEach(id => {
        const L = longueur(fig, id);
        const trouve = paquets.find(p => Math.abs(p.L - L) < EPS * Math.max(1, L));
        if (trouve) trouve.ids.push(id); else paquets.push({ L, ids: [id] });
    });
    return paquets.map(p => p.ids);
}

/** Les voisins d'un point : ceux avec qui il fait l'angle qu'on peut coder. */
function brasDe(point) {
    if (point === 'O') return ['A', 'B'];   // l'angle des deux diagonales
    return { A: ['B', 'D'], B: ['C', 'A'], C: ['D', 'B'], D: ['A', 'C'] }[point];
}

/** L'angle en ce point est-il droit ? Mesuré, jamais supposé. */
export function estAngleDroit(fig, point) {
    const [u, v] = brasDe(point).map(n => fig.points[n]);
    const s = fig.points[point];
    const a = { x: u.x - s.x, y: u.y - s.y };
    const b = { x: v.x - s.x, y: v.y - s.y };
    const norme = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
    if (norme < EPS) return false;
    return Math.abs((a.x * b.x + a.y * b.y) / norme) < 1e-6;
}

export function anglesDroitsDe(fig, points = POINTS_ANGLE) {
    return points.filter(p => estAngleDroit(fig, p));
}

// --- Le codage de l'élève, et sa correction ----------------------------------

/**
 * La forme canonique d'un codage : les marques renumérotées dans leur ordre
 * d'apparition, puis les angles droits posés.
 *
 * « 11112222/ABCDO » — un carré codé. Le même carré codé avec deux traits sur
 * les côtés et un seul sur les demi-diagonales donne la MÊME chaîne : c'est
 * tout l'intérêt. Un `0` marque un segment laissé nu.
 */
export function canoniser(pose, ids = ORDRE_SEGMENTS, points = POINTS_ANGLE) {
    const marques = (pose && pose.marques) || {};
    const angles = (pose && pose.angles) || {};
    const vu = new Map();
    const suite = ids.map(id => {
        const m = marques[id];
        if (m === null || m === undefined || m === '') return '0';
        if (!vu.has(m)) vu.set(m, String(vu.size + 1));
        return vu.get(m);
    }).join('');
    return `${suite}/${points.filter(p => angles[p]).join('')}`;
}

/** Le codage juste, sous la même forme — c'est la réponse attendue de l'item. */
export function codageAttendu(fig, ids = ORDRE_SEGMENTS, points = POINTS_ANGLE) {
    const marques = {};
    classesDeLongueur(fig, ids).forEach((classe, i) => {
        classe.forEach(id => { marques[id] = i + 1; });
    });
    const angles = {};
    anglesDroitsDe(fig, points).forEach(p => { angles[p] = true; });
    return canoniser({ marques, angles }, ids, points);
}

const nomSegment = (id) => `[${id[0]}${id[1]}]`;

/**
 * Ce qui cloche, dit en français, dans l'ordre où l'on veut l'entendre : ce
 * qui manque d'abord — on ne reproche pas une erreur à qui n'a pas fini —,
 * puis ce qui est faux.
 *
 * @returns {{correct:boolean, problemes:Array<{genre:string, message:string, cibles:string[]}>}}
 */
export function verifierCodage(fig, pose, ids = ORDRE_SEGMENTS, points = POINTS_ANGLE) {
    const marques = (pose && pose.marques) || {};
    const angles = (pose && pose.angles) || {};
    const problemes = [];

    const nus = ids.filter(id => marques[id] === null || marques[id] === undefined || marques[id] === '');
    if (nus.length) {
        problemes.push({
            genre: 'manque',
            cibles: nus,
            message: nus.length === ids.length
                ? 'Rien n\'est codé pour l\'instant : chaque segment doit porter une marque.'
                : `Il reste ${nus.length} segment${nus.length > 1 ? 's' : ''} sans marque : `
                    + `${nus.map(nomSegment).join(', ')}.`
        });
    }

    // Même marque, longueurs différentes : le codage AFFIRME une égalité fausse.
    const parMarque = new Map();
    ids.forEach(id => {
        const m = marques[id];
        if (m === null || m === undefined || m === '') return;
        if (!parMarque.has(m)) parMarque.set(m, []);
        parMarque.get(m).push(id);
    });
    parMarque.forEach((groupe) => {
        for (let i = 1; i < groupe.length; i++) {
            if (Math.abs(longueur(fig, groupe[0]) - longueur(fig, groupe[i])) > EPS * 100) {
                problemes.push({
                    genre: 'faux-egal',
                    cibles: [groupe[0], groupe[i]],
                    message: `${nomSegment(groupe[0])} et ${nomSegment(groupe[i])} portent la même `
                        + 'marque, mais ils n\'ont pas la même longueur.'
                });
                break;
            }
        }
    });

    // Longueurs égales, marques différentes : l'égalité est vraie et tue.
    classesDeLongueur(fig, ids).forEach(classe => {
        const codes = classe
            .map(id => marques[id])
            .filter(m => m !== null && m !== undefined && m !== '');
        if (codes.length > 1 && new Set(codes).size > 1) {
            problemes.push({
                genre: 'egalite-oubliee',
                cibles: classe,
                message: `${classe.map(nomSegment).join(', ')} ont la même longueur : ils doivent `
                    + 'porter la même marque.'
            });
        }
    });

    const droits = anglesDroitsDe(fig, points);
    const enTrop = points.filter(p => angles[p] && !droits.includes(p));
    const oublies = droits.filter(p => !angles[p]);
    if (enTrop.length) {
        problemes.push({
            genre: 'faux-angle',
            cibles: enTrop,
            message: enTrop.includes('O')
                ? 'Les diagonales ne se coupent pas à angle droit dans cette figure.'
                : `L'angle en ${enTrop[0]} n'est pas droit.`
        });
    }
    if (oublies.length) {
        problemes.push({
            genre: 'angle-oublie',
            cibles: oublies,
            message: oublies.includes('O') && oublies.length === 1
                ? 'Il manque l\'angle droit au point où les diagonales se croisent.'
                : `Il manque l'angle droit en ${oublies.join(', ')}.`
        });
    }

    return { correct: problemes.length === 0, problemes };
}

// --- Ce qu'il fallait comprendre ---------------------------------------------

/**
 * La propriété que le codage écrit, dite en une phrase. C'est la correction :
 * l'élève ne doit pas retenir « quatre traits », mais « les quatre côtés d'un
 * losange ont la même longueur ».
 */
export const PROPRIETES = {
    carre: [
        'les quatre côtés ont la même longueur',
        'les quatre angles sont droits',
        'les diagonales ont la même longueur, se coupent en leur milieu et sont perpendiculaires'
    ],
    rectangle: [
        'les côtés opposés ont la même longueur',
        'les quatre angles sont droits',
        'les diagonales ont la même longueur et se coupent en leur milieu'
    ],
    losange: [
        'les quatre côtés ont la même longueur',
        'les diagonales se coupent en leur milieu et sont perpendiculaires',
        'mais les diagonales n\'ont pas la même longueur, et les angles ne sont pas droits'
    ],
    parallelogramme: [
        'les côtés opposés ont la même longueur',
        'les diagonales se coupent en leur milieu',
        'ni angle droit, ni diagonales de même longueur : c\'est ce qui le distingue des autres'
    ]
};
