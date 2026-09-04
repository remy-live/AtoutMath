// LE PROGRAMME DE CONSTRUCTION — on donne la figure, l'élève écrit la recette.
//
// Rémy : « j'aimerais bien un exercice où on a un tracé (points, segments,
// cercle) et il faut faire le programme de construction. Comment pourrait-on
// faire cela ? »
//
// ON N'ÉVALUE PAS DES MOTS, ON EXÉCUTE UN PROGRAMME.
//
// C'est la seule règle tenable, et c'est aussi la bonne mathématiquement : un
// programme de construction a PLUSIEURS formes justes. « Trace la médiatrice de
// [AB] » et « trace la perpendiculaire à (AB) passant par le milieu de [AB] »
// donnent la même droite ; l'ordre des deux premiers tracés est souvent libre.
// Corriger une rédaction reviendrait à choisir une formulation et à refuser les
// autres. On exécute donc ce que l'élève a écrit, et l'on regarde LA FIGURE
// OBTENUE — exactement ce que font déjà le Chat Géomètre (« c'est le tracé
// obtenu qui compte, pas la forme du programme ») et l'atelier d'instruments
// (« c'est la figure obtenue qui est jugée, pas l'outil choisi »). Trois
// exercices, une seule idée.
//
// LES BLOCS SONT LA LEÇON, PAS L'EMBALLAGE. « La perpendiculaire à (AB) passant
// par C » est une phrase que l'élève doit apprendre à dire, avec ses crochets et
// ses parenthèses — [AB] le segment, (AB) la droite. Un bloc l'oblige à la dire
// juste, là où une rédaction libre laisse écrire « la droite qui coupe ».
//
// LE PROGRAMME COMMENCE PAR POSER SES POINTS, ET C'EST RÉMY QUI L'A REDRESSÉ.
//
// « On commence par un point A. Les phrases acceptables sont "Place un point
// A". Puis on a deux points A et B : "Place 2 points A et B". Tolérable :
// dessine ou trace. Si 3 points non alignés : "Place 3 points A, B et C non
// alignés". Puis après les segments. »
//
// La première version donnait les points d'avance, pour que la figure de
// l'élève coïncide avec le modèle. C'était commode et c'était FAUX : un
// programme de construction commence toujours par placer ce dont il part, et
// escamoter cette ligne-là, c'est escamoter la première phrase du chapitre.
//
// ON PLACE DONC, ET C'EST L'APPLICATION QUI CHOISIT OÙ. « Place un point A »
// ne dit pas de coordonnées — aucun programme de construction n'en donne. La
// figure modèle porte un ATLAS : quand l'élève place A, A va où le modèle l'a
// mis. Le programme reste jugé sur la figure obtenue, et l'élève n'a jamais à
// viser un pixel.
//
// CE QU'ON EXIGE ET CE QU'ON TOLÈRE. Les objets attendus doivent tous être là ;
// les autres sont admis. Un vrai devoir de construction dit « laisse tes traits
// de construction apparents » — les deux cercles qui donnent le triangle
// équilatéral sont la preuve du travail, pas une faute. Cela laisse aussi
// plusieurs chemins ouverts vers la même figure, ce qui est le fait même d'une
// construction.

/** La tolérance de comparaison. Les constructions sont CALCULÉES, pas tracées à
 *  la main : l'écart n'est que celui des flottants. */
const EPS = 1e-6;

/** Le monde où vivent les figures, en unités arbitraires. */
export const MONDE = { w: 100, h: 70 };

// ---------------------------------------------------------------------------
// LES FAMILLES DE BLOCS — c'est par elles que le professeur règle l'exercice.
//
// Rémy : « on peut avoir ce que l'on veut mettre (segments, parallèles,
// perpendiculaires, cercles) ». Une famille, c'est un paragraphe du cours : on
// la coche quand on l'a faite en classe, et la palette suit.
// ---------------------------------------------------------------------------

export const FAMILLES = [
    { id: 'points', nom: 'Placer des points', court: 'points' },
    { id: 'traits', nom: 'Segments et droites', court: 'traits' },
    { id: 'cercles', nom: 'Cercles', court: 'cercles' },
    { id: 'milieux', nom: 'Milieu et médiatrice', court: 'milieux' },
    { id: 'perpendiculaires', nom: 'Perpendiculaires', court: 'perpendiculaires' },
    { id: 'paralleles', nom: 'Parallèles', court: 'parallèles' },
    { id: 'intersections', nom: 'Points d\'intersection', court: 'intersections' }
];

export const ORDRE_FAMILLES = FAMILLES.map(f => f.id);

// ---------------------------------------------------------------------------
// LE VOCABULAIRE
//
// Chaque bloc dit ce qu'il prend (`prend`), ce qu'il trace, et ce qu'il crée.
// `prend` est une liste de sortes d'arguments : 'point' ou 'objet'. C'est elle
// qui remplit les menus déroulants du bloc à l'écran, et c'est elle qui permet
// de dire « il manque un point » plutôt que de planter.
// ---------------------------------------------------------------------------

export const OPERATIONS = {
    // PLACER LES POINTS DE DÉPART — la première phrase de tout programme.
    //
    // Ses arguments sont les LETTRES, et rien d'autre : « Place 2 points A et
    // B ». Où ils atterrissent est l'affaire de l'atlas du niveau, pas de
    // l'élève — voir l'en-tête.
    points: {
        id: 'points', famille: 'points', prend: [], bouton: 'des points',
        gabarit: ['Place les points '],
        libelle: (a) => {
            const n = (a || []).length;
            if (!n) return 'Place des points';
            const liste = n === 1 ? a[0] : `${a.slice(0, -1).join(', ')} et ${a[n - 1]}`;
            return `Place ${n === 1 ? 'un point' : `${n} points`} ${liste}`;
        },
        place: true
    },
    segment: {
        id: 'segment', famille: 'traits', prend: ['point', 'point'],
        // LES CROCHETS ET LES PARENTHÈSES SONT LA MOITIÉ DE LA LEÇON. On les
        // écrit partout, y compris dans le libellé du bloc : [AB] le segment,
        // (AB) la droite, AB la longueur. Un élève qui manipule le bloc pendant
        // vingt minutes les a lus vingt fois.
        // LE GABARIT : la phrase avec ses trous, pour que l'écran monte le bloc
        // sans réécrire le libellé de son côté. Un nombre est un trou, une
        // chaîne est du texte — et les crochets sont DU TEXTE, donc l'élève les
        // lit à chaque bloc sans pouvoir les effacer.
        gabarit: ['Trace le segment [', 0, 1, ']'],
        bouton: 'un segment',
        libelle: (a) => `Trace le segment [${a[0]}${a[1]}]`,
        trace: (p, a) => ({ genre: 'segment', a: p[a[0]], b: p[a[1]] })
    },
    droite: {
        id: 'droite', famille: 'traits', prend: ['point', 'point'],
        gabarit: ['Trace la droite (', 0, 1, ')'],
        bouton: 'une droite',
        libelle: (a) => `Trace la droite (${a[0]}${a[1]})`,
        trace: (p, a) => ({ genre: 'droite', a: p[a[0]], b: p[a[1]] })
    },
    cercle: {
        id: 'cercle', famille: 'cercles', prend: ['point', 'point'],
        gabarit: ['Trace le cercle de centre ', 0, ' passant par ', 1],
        bouton: 'un cercle',
        libelle: (a) => `Trace le cercle de centre ${a[0]} passant par ${a[1]}`,
        trace: (p, a) => ({ genre: 'cercle', c: p[a[0]], r: dist(p[a[0]], p[a[1]]) })
    },
    milieu: {
        id: 'milieu', famille: 'milieux', prend: ['point', 'point'],
        gabarit: ['Place le milieu de [', 0, 1, ']'],
        bouton: 'un milieu',
        libelle: (a, nom) => `Place le milieu de [${a[0]}${a[1]}]${nom ? ` : ${nom}` : ''}`,
        cree: (p, a) => [{ x: (p[a[0]].x + p[a[1]].x) / 2, y: (p[a[0]].y + p[a[1]].y) / 2 }]
    },
    mediatrice: {
        id: 'mediatrice', famille: 'milieux', prend: ['point', 'point'],
        gabarit: ['Trace la médiatrice de [', 0, 1, ']'],
        bouton: 'une médiatrice',
        libelle: (a) => `Trace la médiatrice de [${a[0]}${a[1]}]`,
        trace: (p, a) => {
            const m = { x: (p[a[0]].x + p[a[1]].x) / 2, y: (p[a[0]].y + p[a[1]].y) / 2 };
            const u = { x: p[a[1]].x - p[a[0]].x, y: p[a[1]].y - p[a[0]].y };
            return { genre: 'droite', a: m, b: { x: m.x - u.y, y: m.y + u.x } };
        }
    },
    perpendiculaire: {
        id: 'perpendiculaire', famille: 'perpendiculaires', prend: ['point', 'point', 'point'],
        gabarit: ['Trace la perpendiculaire à (', 0, 1, ') passant par ', 2],
        bouton: 'une perpendiculaire',
        libelle: (a) => `Trace la perpendiculaire à (${a[0]}${a[1]}) passant par ${a[2]}`,
        trace: (p, a) => {
            const u = { x: p[a[1]].x - p[a[0]].x, y: p[a[1]].y - p[a[0]].y };
            const c = p[a[2]];
            return { genre: 'droite', a: c, b: { x: c.x - u.y, y: c.y + u.x } };
        }
    },
    parallele: {
        id: 'parallele', famille: 'paralleles', prend: ['point', 'point', 'point'],
        gabarit: ['Trace la parallèle à (', 0, 1, ') passant par ', 2],
        bouton: 'une parallèle',
        libelle: (a) => `Trace la parallèle à (${a[0]}${a[1]}) passant par ${a[2]}`,
        trace: (p, a) => {
            const u = { x: p[a[1]].x - p[a[0]].x, y: p[a[1]].y - p[a[0]].y };
            const c = p[a[2]];
            return { genre: 'droite', a: c, b: { x: c.x + u.x, y: c.y + u.y } };
        }
    },
    intersection: {
        id: 'intersection', famille: 'intersections', prend: ['objet', 'objet'],
        // DEUX CERCLES SE COUPENT EN DEUX POINTS, ET ON LES CRÉE TOUS LES DEUX.
        //
        // C'est ce que dit un énoncé honnête : « l'UN des deux points
        // d'intersection ». Faire choisir avant de voir serait un pile ou face ;
        // les poser tous les deux laisse l'élève prendre celui qu'il veut, et
        // celui qu'il n'utilise pas reste un point de construction — ce qu'il
        // est aussi sur le papier.
        gabarit: ['Place le point d\'intersection de ', 0, ' et ', 1],
        bouton: 'un point d\'intersection',
        // « DE LE CERCLE » NE SE DIT PAS. Les noms d'objets commencent par leur
        // article — « le cercle de centre A », « la médiatrice de [AB] » — et
        // l'élision doit suivre, sinon la phrase qu'on donne en modèle est
        // fautive. Sur une feuille de français-mathématiques, cela se voit.
        libelle: (a, nom) => `Place le point d'intersection ${elider(a[0])} et ${elider(a[1])}`
            + (nom ? ` : ${nom}` : ''),
        creeDepuisObjets: (o1, o2) => intersections(o1, o2)
    }
};

export const ORDRE_OPERATIONS = [
    'points', 'segment', 'droite', 'cercle', 'milieu', 'mediatrice',
    'perpendiculaire', 'parallele', 'intersection'
];

/** Les blocs d'une liste de familles, dans l'ordre où on les enseigne. */
export function operationsDe(familles) {
    const voulues = new Set(familles && familles.length ? familles : ORDRE_FAMILLES);
    return ORDRE_OPERATIONS.map(id => OPERATIONS[id]).filter(op => voulues.has(op.famille));
}

// ---------------------------------------------------------------------------
// LA GÉOMÉTRIE — le peu qu'il en faut, et rien de plus.
// ---------------------------------------------------------------------------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** « le cercle… » → « du cercle… », « la médiatrice… » → « de la médiatrice… ». */
const elider = (nom) => {
    const t = String(nom ?? '');
    if (/^le /.test(t)) return `du ${t.slice(3)}`;
    if (/^les /.test(t)) return `des ${t.slice(4)}`;
    if (/^l'/.test(t)) return `de ${t}`;
    return `de ${t}`;
};

/** La forme normale d'une droite : a x + b y = c, avec (a, b) unitaire et orienté. */
function normaliserDroite(p, q) {
    let a = q.y - p.y, b = -(q.x - p.x);
    const n = Math.hypot(a, b);
    if (n < EPS) return null;          // deux points confondus : pas de droite
    a /= n; b /= n;
    // Un signe unique, sinon (AB) et (BA) auraient deux formes normales.
    if (a < -EPS || (Math.abs(a) < EPS && b < 0)) { a = -a; b = -b; }
    return { a, b, c: a * p.x + b * p.y };
}

/**
 * LA CLÉ D'UN OBJET — deux tracés identiques ont la même, quels que soient les
 * points qui les ont produits.
 *
 * C'est le cœur de la correction : le segment [AB] tracé depuis A puis B ou
 * depuis B puis A est le MÊME segment, et la médiatrice de [AB] est la même
 * droite qu'on l'obtienne au compas ou à l'équerre. Sans cette normalisation,
 * on corrigerait la façon d'écrire au lieu de la figure.
 */
export function cleObjet(o) {
    const r = (v) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(6);
    if (o.genre === 'cercle') return `cercle|${r(o.c.x)}|${r(o.c.y)}|${r(o.r)}`;
    if (o.genre === 'droite') {
        const d = normaliserDroite(o.a, o.b);
        return d ? `droite|${r(d.a)}|${r(d.b)}|${r(d.c)}` : 'droite|degeneree';
    }
    // Un segment est orienté par ses extrémités : on les range toujours pareil.
    const [p, q] = [o.a, o.b].sort((u, v) => (u.x - v.x) || (u.y - v.y));
    return `segment|${r(p.x)}|${r(p.y)}|${r(q.x)}|${r(q.y)}`;
}

/** Le nom lisible d'un objet, pour les menus et pour la correction. */
export function nomObjet(o, points) {
    // Ce que l'objet dit de lui-même passe avant tout : c'est la phrase du bloc
    // qui l'a produit, donc celle que l'élève vient d'écrire.
    if (o && o.dit) return o.dit;
    const nomDe = (p) => {
        const t = Object.entries(points || {}).find(([, q]) => dist(p, q) < EPS);
        return t ? t[0] : null;
    };
    if (o.genre === 'cercle') {
        const c = nomDe(o.c);
        return c ? `le cercle de centre ${c}` : 'un cercle';
    }
    const a = nomDe(o.a), b = nomDe(o.b);
    if (o.genre === 'segment') return a && b ? `[${a}${b}]` : 'un segment';
    return a && b ? `(${a}${b})` : 'une droite';
}

/** Les points communs à deux objets — zéro, un ou deux. */
export function intersections(o1, o2) {
    const enDroite = (o) => normaliserDroite(o.a, o.b);
    if (o1.genre === 'cercle' && o2.genre === 'cercle') return cercleCercle(o1, o2);
    if (o1.genre === 'cercle') return droiteCercle(enDroite(o2), o1, o2);
    if (o2.genre === 'cercle') return droiteCercle(enDroite(o1), o2, o1);
    return droiteDroite(enDroite(o1), enDroite(o2), o1, o2);
}

function droiteDroite(d1, d2, o1, o2) {
    if (!d1 || !d2) return [];
    const det = d1.a * d2.b - d2.a * d1.b;
    if (Math.abs(det) < EPS) return [];        // parallèles ou confondues
    const p = {
        x: (d1.c * d2.b - d2.c * d1.b) / det,
        y: (d1.a * d2.c - d2.a * d1.c) / det
    };
    // UN SEGMENT S'ARRÊTE À SES BOUTS. Le point d'intersection de deux segments
    // qui ne se croisent pas n'existe pas, même si leurs droites se coupent —
    // et le dire évite de construire sur du vent.
    return (surObjet(p, o1) && surObjet(p, o2)) ? [p] : [];
}

function droiteCercle(d, cer, oDroite) {
    if (!d) return [];
    // La distance du centre à la droite, puis la demi-corde.
    const dc = d.a * cer.c.x + d.b * cer.c.y - d.c;
    const h2 = cer.r * cer.r - dc * dc;
    if (h2 < -EPS) return [];
    const h = Math.sqrt(Math.max(0, h2));
    const pied = { x: cer.c.x - d.a * dc, y: cer.c.y - d.b * dc };
    if (h < EPS) return surObjet(pied, oDroite) ? [pied] : [];
    const u = { x: -d.b, y: d.a };
    return [
        { x: pied.x + u.x * h, y: pied.y + u.y * h },
        { x: pied.x - u.x * h, y: pied.y - u.y * h }
    ].filter(p => surObjet(p, oDroite));
}

function cercleCercle(c1, c2) {
    const d = dist(c1.c, c2.c);
    if (d < EPS) return [];                                  // concentriques
    if (d > c1.r + c2.r + EPS || d < Math.abs(c1.r - c2.r) - EPS) return [];
    const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
    const m = {
        x: c1.c.x + (a / d) * (c2.c.x - c1.c.x),
        y: c1.c.y + (a / d) * (c2.c.y - c1.c.y)
    };
    if (h < EPS) return [m];
    const u = { x: -(c2.c.y - c1.c.y) / d, y: (c2.c.x - c1.c.x) / d };
    return [
        { x: m.x + u.x * h, y: m.y + u.y * h },
        { x: m.x - u.x * h, y: m.y - u.y * h }
    ];
}

/**
 * UNE DROITE N'A PAS DE BOUTS : on la coupe au cadre du monde.
 *
 * Un trait dessiné a besoin de deux extrémités, et une droite n'en propose
 * aucune de naturelle : la tracer entre les deux points qui l'ont définie la
 * ferait lire comme un SEGMENT. Or la confusion segment / droite est justement
 * ce que l'exercice travaille — la dessiner de travers enseignerait le
 * contraire. Le calcul vit ici, dans le noyau, pour que l'écran et la feuille
 * coupent au même endroit.
 */
export function couperAuMonde(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const ts = [];
    if (Math.abs(dx) > 1e-9) ts.push((0 - a.x) / dx, (MONDE.w - a.x) / dx);
    if (Math.abs(dy) > 1e-9) ts.push((0 - a.y) / dy, (MONDE.h - a.y) / dy);
    const dedans = ts.filter(t => {
        const x = a.x + dx * t, y = a.y + dy * t;
        return x >= -0.01 && x <= MONDE.w + 0.01 && y >= -0.01 && y <= MONDE.h + 0.01;
    }).sort((u, v) => u - v);
    if (dedans.length < 2) return null;
    const t0 = dedans[0], t1 = dedans[dedans.length - 1];
    return [{ x: a.x + dx * t0, y: a.y + dy * t0 }, { x: a.x + dx * t1, y: a.y + dy * t1 }];
}

/** Le point tombe-t-il vraiment SUR l'objet (et pas seulement sur sa droite) ? */
function surObjet(p, o) {
    if (!o || o.genre !== 'segment') return true;
    const t = ((p.x - o.a.x) * (o.b.x - o.a.x) + (p.y - o.a.y) * (o.b.y - o.a.y))
        / (dist(o.a, o.b) ** 2 || 1);
    return t > -EPS && t < 1 + EPS;
}

// ---------------------------------------------------------------------------
// L'EXÉCUTION
// ---------------------------------------------------------------------------

/** Les lettres des points créés, dans l'ordre — les données prennent les premières. */
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * ON EXÉCUTE LE PROGRAMME, ET L'ON DIT OÙ ÇA COINCE.
 *
 * Un bloc dont les objets manquent ne s'exécute pas — et c'est la vraie
 * difficulté de l'exercice, celle qu'aucun questionnaire ne travaille : on ne
 * trace pas [AB] avant d'avoir A et B, on ne prend pas le milieu d'un segment
 * qui n'existe pas. L'ordre n'est pas une contrainte de forme, c'est la
 * dépendance des objets les uns aux autres. On le DIT plutôt que de le compter
 * faux : « il manque le point D » enseigne, « raté » n'enseigne rien.
 *
 * @param {Array} programme  - la suite d'instructions { op, args }
 * @param {Object} depart    - les points donnés, { A: {x,y}, … }
 */
export function executer(programme, atlas) {
    const points = {};
    const objets = [];
    const vus = new Set();
    const lignes = [];
    let erreur = null;

    const libre = () => LETTRES.find(l => !(l in points)) || `P${Object.keys(points).length}`;

    (programme || []).forEach((ins, rang) => {
        if (erreur) { lignes.push({ rang, etat: 'jamais' }); return; }
        const op = OPERATIONS[ins.op];
        if (!op) { erreur = { rang, dit: 'Ce bloc n\'existe pas.' }; return; }
        const args = ins.args || [];

        // PLACER DES POINTS : l'atlas dit où, la phrase dit lesquels.
        if (op.place) {
            const inconnus = args.filter(l => !(atlas && atlas[l]));
            if (!args.length) {
                erreur = { rang, dit: 'Cette phrase ne nomme aucun point.' };
                lignes.push({ rang, etat: 'bloque' });
                return;
            }
            if (inconnus.length) {
                // ON LE DIT SANS TRAHIR LA SUITE. Nommer le point attendu
                // donnerait la figure ; dire combien il en faut, non.
                erreur = {
                    rang,
                    dit: `Cette figure ne se construit pas à partir ${inconnus.length > 1
                        ? `des points ${inconnus.join(', ')}` : `du point ${inconnus[0]}`}. `
                        + `Elle part de ${Object.keys(atlas || {}).length} point`
                        + `${Object.keys(atlas || {}).length > 1 ? 's' : ''}.`
                };
                lignes.push({ rang, etat: 'bloque' });
                return;
            }
            const deja = args.filter(l => l in points);
            if (deja.length) {
                erreur = { rang, dit: `${deja.join(' et ')} ${deja.length > 1 ? 'sont' : 'est'} `
                    + 'déjà placé' + (deja.length > 1 ? 's' : '') + '.' };
                lignes.push({ rang, etat: 'bloque' });
                return;
            }
            args.forEach(l => { points[l] = { ...atlas[l] }; });
            lignes.push({ rang, etat: 'fait', noms: args.slice() });
            return;
        }

        // Les arguments manquants, nommés un par un.
        const manque = [];
        op.prend.forEach((sorte, i) => {
            const v = args[i];
            if (v === undefined || v === null || v === '') { manque.push(`le ${sorte} n° ${i + 1}`); return; }
            if (sorte === 'point' && !(v in points)) manque.push(`le point ${v}`);
            if (sorte === 'objet' && !objets.some(o => cleObjet(o) === v)) manque.push('un tracé');
        });
        if (manque.length) {
            erreur = {
                rang,
                dit: manque.length === 1
                    ? `Il manque ${manque[0]} : cette phrase ne peut pas s'exécuter encore.`
                    : `Il manque ${manque.join(' et ')} : cette phrase ne peut pas s'exécuter encore.`
            };
            lignes.push({ rang, etat: 'bloque' });
            return;
        }

        const nes = [];
        if (op.trace) {
            const o = op.trace(points, args);
            // CHAQUE TRACÉ RETIENT COMMENT ON L'A OBTENU — voir `nomObjet`.
            o.dit = op.libelle(args).replace(/^Trace /, '');
            const cle = cleObjet(o);
            // Retracer le même trait n'est pas une faute : c'est inutile, et
            // l'on n'en garde qu'un pour que la comparaison reste une
            // comparaison d'ensembles.
            if (!vus.has(cle)) { vus.add(cle); objets.push(o); }
        }
        if (op.cree) op.cree(points, args).forEach(p => nes.push(p));
        if (op.creeDepuisObjets) {
            const o1 = objets.find(o => cleObjet(o) === args[0]);
            const o2 = objets.find(o => cleObjet(o) === args[1]);
            const trouves = op.creeDepuisObjets(o1, o2);
            if (!trouves.length) {
                erreur = { rang, dit: 'Ces deux tracés ne se coupent pas : il n\'y a pas de point à placer ici.' };
                lignes.push({ rang, etat: 'bloque' });
                return;
            }
            trouves.forEach(p => nes.push(p));
        }

        // LE NOM DONNÉ PAR L'ÉLÈVE PASSE AVANT CELUI QU'ON INVENTE. « Place le
        // milieu I de [AB] » est une phrase de cours ; refuser le I et appeler
        // ce point C apprendrait le contraire de ce qu'on veut.
        const noms = [];
        nes.forEach((p, k) => {
            const deja = Object.entries(points).find(([, q]) => dist(p, q) < 1e-6);
            if (deja) { noms.push(deja[0]); return; }
            const voulu = ins.nomme && ins.nomme[k];
            const n = (voulu && !(voulu in points)) ? voulu : libre();
            points[n] = { x: p.x, y: p.y };
            noms.push(n);
        });
        lignes.push({ rang, etat: 'fait', noms });
    });

    return { points, objets, lignes, erreur };
}

// ---------------------------------------------------------------------------
// LIRE UNE PHRASE ÉCRITE PAR UN ÉLÈVE
//
// Rémy : « je veux qu'il tape et qu'il rédige ».
//
// C'EST DONC UN LECTEUR, PAS UN QUESTIONNAIRE. La première version faisait
// choisir des blocs dans des menus déroulants : la phrase était donnée, l'élève
// ne posait que les lettres. Ce n'est pas rédiger — et Rémy l'a dit d'un mot,
// « il n'y a pas de rédaction ». On lit maintenant ce qu'il tape.
//
// TOLÉRANT SUR LA FORME, EXIGEANT SUR LE FOND. Ce qu'on corrige, c'est la
// GÉOMÉTRIE : quel objet, à partir de quoi. Le reste est de la langue, et l'on
// n'a pas à faire échouer une construction juste sur un accent ou un pluriel.
// On accepte donc « place / pose / trace / dessine / construis / marque », avec
// ou sans accents, majuscules ou non, crochets ou non, « qui passe par » ou
// « passant par ». Rémy l'a demandé explicitement : « tolérable, dessine ou
// trace ».
//
// CE QU'ON N'ACCEPTE PAS, en revanche, c'est l'à-peu-près qui ferait dire au
// programme autre chose que ce qu'il dit : « le cercle de centre A et B » n'est
// pas un cercle, « la droite AB » écrite pour un segment n'est pas le même
// objet. Là, on refuse — et l'on dit ce qu'on attendait.
//
// ON NE DEVINE JAMAIS. Une phrase à moitié comprise est refusée avec un exemple
// de ce qu'on sait lire, jamais interprétée au plus proche : construire sur une
// supposition ferait une figure fausse que l'élève ne saurait pas expliquer.

/** Sans accents, sans majuscules, sans ponctuation parasite. */
const aplatir = (t) => String(t ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Les verbes qu'on accepte pour « poser » et pour « tracer ». */
const VERBES = '(?:place|pose|placer|poser|marque|marquer|nomme|nommer|prends|prendre'
    + '|trace|tracer|dessine|dessiner|construis|construire|joins|joindre|relie|relier)';

/** « a et b », « a, b et c », « a b c » → ['A','B','C'] */
function lireLettres(t) {
    const brut = String(t || '')
        .replace(/\bet\b/g, ' ').replace(/,/g, ' ')
        .trim().split(/\s+/).filter(Boolean);
    if (!brut.length || brut.some(x => !/^[a-z]$/.test(x))) return null;
    return brut.map(x => x.toUpperCase());
}

const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 };

/** Une référence à un tracé déjà fait : « [ab] », « (ab) », « le cercle de centre a »… */
function lireObjet(t, etat) {
    const p = aplatir(t).replace(/^(?:de |du |des |la |le |l')+/, '');
    const trouve = (test) => {
        const cands = (etat.objets || []).filter(test);
        return cands.length === 1 ? cleObjet(cands[0]) : null;
    };
    let m = /^\[?([a-z])\s*([a-z])\]$|^\[([a-z])\s*([a-z])\]?$/.exec(p);
    if (m) {
        const [x, y] = [m[1] || m[3], m[2] || m[4]].map(c => c.toUpperCase());
        return trouve(o => o.genre === 'segment' && memeSegment(o, etat.points, x, y));
    }
    m = /^\(([a-z])\s*([a-z])\)$/.exec(p);
    if (m) {
        const [x, y] = [m[1], m[2]].map(c => c.toUpperCase());
        return trouve(o => o.genre === 'droite' && surLaDroite(o, etat.points[x])
            && surLaDroite(o, etat.points[y]));
    }
    // Sinon, on compare à la phrase que le tracé porte : « la mediatrice de [ab] ».
    const memeMot = (etat.objets || []).filter(o => aplatir(o.dit || '')
        .replace(/^(?:la |le |l')/, '') === p);
    if (memeMot.length === 1) return cleObjet(memeMot[0]);
    // « le cercle de centre a » suffit s'il n'y en a qu'un.
    m = /^cercle de centre ([a-z])/.exec(p);
    if (m) {
        const c = etat.points[m[1].toUpperCase()];
        return c ? trouve(o => o.genre === 'cercle' && Math.hypot(o.c.x - c.x, o.c.y - c.y) < 1e-6) : null;
    }
    return null;
}

const memeSegment = (o, pts, x, y) => {
    const a = pts[x], b = pts[y];
    if (!a || !b) return false;
    const d2 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;
    return (d2(o.a, a) && d2(o.b, b)) || (d2(o.a, b) && d2(o.b, a));
};
const surLaDroite = (o, p) => !!p
    && Math.abs((p.x - o.a.x) * (o.b.y - o.a.y) - (p.y - o.a.y) * (o.b.x - o.a.x))
        / (Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y) || 1) < 1e-6;

/**
 * LA PHRASE → UNE INSTRUCTION, OU UN REFUS QUI ENSEIGNE.
 *
 * @param {string} phrase
 * @param {{points:Object, objets:Array}} etat  ce qui existe déjà
 * @returns {{ins?:Object, dit?:string, note?:string}}
 */
export function lireInstruction(phrase, etat = { points: {}, objets: [] }) {
    const t = aplatir(phrase);
    if (!t) return {};
    const sansVerbe = t.replace(new RegExp(`^${VERBES}\\s+`), '');
    const corps = sansVerbe.replace(/^(?:le |la |les |l'|un |une |des |deux |trois )/, '');
    let m;

    // ① L'INTERSECTION PASSE EN PREMIER, et ce n'est pas un détail d'ordre.
    //
    // « Place LE POINT d'intersection O de … » commence exactement comme
    // « Place les points A et B » : dès qu'on a accepté le déterminant devant
    // « point », la règle des points avalait la phrase et se plaignait de ne
    // pas y trouver de lettres. Une grammaire se lit du plus précis au plus
    // général.
    m = /^points?\s+d.?intersection\s+(?:([a-z])\s+)?(?:de\s+|des\s+|du\s+)?(.+?)\s+et\s+(?:de\s+|du\s+|des\s+)?(.+)$/
        .exec(corps);
    if (m) {
        const o1 = lireObjet(m[2], etat), o2 = lireObjet(m[3], etat);
        if (!o1 || !o2) {
            return { dit: 'Je ne retrouve pas les deux tracés qui se coupent. Désigne-les '
                + 'comme tu les as écrits — « [AB] », « le cercle de centre A », '
                + '« la médiatrice de [AB] ».' };
        }
        return { ins: { op: 'intersection', args: [o1, o2], nomme: m[1] ? [m[1].toUpperCase()] : null } };
    }

    // ② PLACER DES POINTS — « place un point a », « place 2 points a et b »,
    //    « place 3 points a, b et c non alignes ».
    // L'ARTICLE EST FACULTATIF, ET « les » EST DU BON FRANÇAIS. « Place les
    // points A et B » était refusé faute d'avoir prévu le déterminant : on
    // corrigeait la grammaire au lieu de la géométrie.
    m = /^(?:(?:les|des|le|la|l')\s*)?(?:(\d+|un|une|deux|trois|quatre|cinq)\s+)?points?\s+(.+)$/
        .exec(sansVerbe);
    if (m) {
        const reste = m[2].replace(/\s+non\s+alignes?$/, '');
        const nonAlignes = /\s+non\s+alignes?$/.test(m[2]);
        const lettres = lireLettres(reste);
        if (!lettres) {
            return { dit: 'Je lis bien « place … point(s) », mais pas les lettres. '
                + 'Écris-les comme dans « Place 2 points A et B ».' };
        }
        const annonce = m[1] ? (NOMBRES[m[1]] || Number(m[1])) : null;
        if (annonce !== null && annonce !== lettres.length) {
            return { dit: `Tu annonces ${annonce} point${annonce > 1 ? 's' : ''} et tu en `
                + `nommes ${lettres.length} : ${lettres.join(', ')}.` };
        }
        return {
            ins: { op: 'points', args: lettres, nonAlignes },
            // LA PRÉCISION « NON ALIGNÉS » N'EST PAS UN DÉTAIL, et ce n'est pas
            // non plus une faute de l'oublier : on la SIGNALE.
            note: (lettres.length >= 3 && !nonAlignes)
                ? 'On précise « non alignés » quand la figure l\'exige : sans cela, rien '
                    + 'n\'empêche les trois points d\'être sur une même droite.'
                : null
        };
    }

    // ③ LES TRACÉS.
    m = /^segments?\s*\[?\s*([a-z])\s*([a-z])\s*\]?$/.exec(corps);
    if (m) return { ins: { op: 'segment', args: [m[1].toUpperCase(), m[2].toUpperCase()] } };

    m = /^droites?\s*\(?\s*([a-z])\s*([a-z])\s*\)?$/.exec(corps);
    if (m) return { ins: { op: 'droite', args: [m[1].toUpperCase(), m[2].toUpperCase()] } };

    m = /^cercles?\s+de\s+centre\s+([a-z])\s+(?:qui\s+)?pass(?:ant|e)\s+par\s+([a-z])$/.exec(corps);
    if (m) return { ins: { op: 'cercle', args: [m[1].toUpperCase(), m[2].toUpperCase()] } };
    if (/^cercles?\b/.test(corps)) {
        return { dit: 'Un cercle se donne par son CENTRE et par un point de son bord : '
            + '« Trace le cercle de centre A passant par B ».' };
    }

    m = /^milieux?\s+(?:([a-z])\s+)?de\s*\[?\s*([a-z])\s*([a-z])\s*\]?$/.exec(corps);
    if (m) {
        return {
            ins: {
                op: 'milieu',
                args: [m[2].toUpperCase(), m[3].toUpperCase()],
                nomme: m[1] ? [m[1].toUpperCase()] : null
            }
        };
    }

    m = /^mediatrices?\s+(?:de\s*)?\[?\s*([a-z])\s*([a-z])\s*\]?$/.exec(corps);
    if (m) return { ins: { op: 'mediatrice', args: [m[1].toUpperCase(), m[2].toUpperCase()] } };

    m = /^(perpendiculaire|parallele)s?\s+(?:a|à)\s*\(?\s*([a-z])\s*([a-z])\s*\)?\s+(?:qui\s+)?pass(?:ant|e)\s+par\s+([a-z])$/
        .exec(corps);
    if (m) {
        return {
            ins: {
                op: m[1] === 'perpendiculaire' ? 'perpendiculaire' : 'parallele',
                args: [m[2].toUpperCase(), m[3].toUpperCase(), m[4].toUpperCase()]
            }
        };
    }
    if (/^(perpendiculaire|parallele)/.test(corps)) {
        return { dit: 'Il manque par où elle passe : « Trace la perpendiculaire à (AB) '
            + 'passant par C ».' };
    }

    return { dit: 'Je ne comprends pas cette phrase. Une phrase, un objet : '
        + '« Place 2 points A et B », « Trace le segment [AB] », « Trace le cercle de '
        + 'centre A passant par B ».' };
}

/** Un programme entier, ligne à ligne — chaque ligne est lue dans l'état atteint. */
export function lireProgramme(texte, atlas) {
    const brut = String(texte ?? '').split('\n');
    const ins = [];
    const lignes = [];
    brut.forEach((ligne, i) => {
        // Les numéros que l'élève écrit devant sa phrase ne sont pas de la
        // géométrie : « 1. Place 2 points A et B » se lit comme la phrase.
        const nette = ligne.replace(/^\s*\d+\s*[.)°-]?\s*/, '');
        if (!aplatir(nette)) { lignes.push({ i, vide: true }); return; }
        const etat = executer(ins, atlas);
        const lu = lireInstruction(nette, etat);
        if (lu.ins) { ins.push(lu.ins); lignes.push({ i, ok: true, note: lu.note }); }
        else lignes.push({ i, ok: false, dit: lu.dit });
    });
    return { instructions: ins, lignes };
}

// ---------------------------------------------------------------------------
// LA CORRECTION
// ---------------------------------------------------------------------------

/**
 * LA FIGURE EST-ELLE LÀ ?
 *
 * On exige les objets attendus, on tolère les autres. Un devoir de construction
 * dit « laisse tes traits de construction apparents » : les deux cercles qui
 * donnent le triangle équilatéral sont la preuve du travail, pas une faute. Et
 * la tolérance laisse plusieurs chemins vers la même figure, ce qui est le
 * propre d'une construction.
 */
export function comparer(objets, attendus, points = null, exiges = null) {
    const faits = new Set((objets || []).map(cleObjet));
    const manquants = (attendus || []).filter(o => !faits.has(cleObjet(o)));
    // LES POINTS POSÉS COMPTENT AUSSI.
    //
    // Les trois premiers niveaux ne tracent rien : leur figure EST une croix,
    // ou deux, ou trois. Sans cette vérification, « Place un point A » et un
    // programme vide se vaudraient. Et partout ailleurs elle ne coûte rien —
    // un tracé suppose ses points.
    const sansPoint = (exiges || []).filter(l => !(points && l in points));
    return {
        ok: manquants.length === 0 && sansPoint.length === 0,
        manquants,
        sansPoint,
        enTrop: (objets || []).filter(o =>
            !(attendus || []).some(a => cleObjet(a) === cleObjet(o)))
    };
}

// ---------------------------------------------------------------------------
// LES DOUZE NIVEAUX
//
// Rémy : « sois progressif dans la difficulté et dans les réglages ».
//
// LA PROGRESSION N'EST PAS UN NOMBRE DE BLOCS, C'EST UN VOCABULAIRE QUI
// S'ÉTEND. Chaque niveau n'introduit qu'une chose : le segment, puis le cercle,
// puis le milieu, puis la médiatrice… Un niveau qui demanderait deux mots
// nouveaux à la fois ne dirait pas lequel des deux a manqué.
//
// LE MODÈLE EST LE SUJET. On n'écrit pas la figure attendue à la main : on écrit
// un programme MODÈLE, on l'exécute, et ce qu'il trace devient la cible. Une
// figure écrite à part vieillirait toute seule et mentirait au premier
// changement ; ici, si le modèle ne construit pas ce qu'il annonce, le test le
// dit.
//
// ET « aide: true » MARQUE LES TRAITS DE CONSTRUCTION. Les deux cercles qui
// donnent le triangle équilatéral sont exigés du modèle mais pas de l'élève :
// il peut y arriver autrement. C'est la différence entre corriger une figure et
// corriger une méthode.
// ---------------------------------------------------------------------------

const P = (x, y) => ({ x, y });

export const NIVEAUX = [
    // LES TROIS PREMIERS BARREAUX SONT DE RÉMY, MOT POUR MOT : « on commence par
    // un point A […] puis on a deux points A et B […] si 3 points non alignés
    // […] puis après les segments ». Ils ne tracent rien, et c'est le sujet :
    // la première phrase d'un programme de construction pose ce dont il part,
    // et l'escamoter escamote la première phrase du chapitre.
    {
        id: 'un-point', titre: 'Un point',
        atlas: { A: P(50, 35) },
        modele: [{ op: 'points', args: ['A'] }]
    },
    {
        id: 'deux-points', titre: 'Deux points',
        atlas: { A: P(30, 35), B: P(70, 35) },
        modele: [{ op: 'points', args: ['A', 'B'] }]
    },
    {
        id: 'trois-points', titre: 'Trois points non alignés',
        atlas: { A: P(22, 52), B: P(78, 48), C: P(48, 16) },
        nonAlignes: true,
        modele: [{ op: 'points', args: ['A', 'B', 'C'] }]
    },
    {
        id: 'segment', titre: 'Un segment',
        atlas: { A: P(25, 45), B: P(75, 45) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'segment', args: ['A', 'B'] }
        ]
    },
    {
        id: 'triangle', titre: 'Un triangle',
        atlas: { A: P(20, 55), B: P(80, 55), C: P(50, 15) },
        // La figure ne le crie pas : trois points alignés ne feraient pas de
        // triangle, et c'est la précision qu'on attend dans la phrase.
        nonAlignes: true,
        modele: [
            { op: 'points', args: ['A', 'B', 'C'] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', 'C'] },
            { op: 'segment', args: ['C', 'A'] }
        ]
    },
    {
        id: 'cercle', titre: 'Un cercle',
        atlas: { A: P(50, 35), B: P(78, 35) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'cercle', args: ['A', 'B'] }
        ]
    },
    {
        id: 'cercle-rayon', titre: 'Un cercle et un rayon',
        atlas: { A: P(45, 35), B: P(80, 35) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'cercle', args: ['A', 'B'] },
            { op: 'segment', args: ['A', 'B'] }
        ]
    },
    {
        id: 'milieu', titre: 'Un cercle de diamètre donné',
        atlas: { A: P(20, 40), B: P(80, 40) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'milieu', args: ['A', 'B'] },
            { op: 'cercle', args: ['C', 'A'] }
        ]
    },
    {
        id: 'mediatrice', titre: 'Un segment et sa médiatrice',
        atlas: { A: P(25, 50), B: P(75, 25) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'mediatrice', args: ['A', 'B'] }
        ]
    },
    {
        id: 'perpendiculaire', titre: 'Deux droites perpendiculaires',
        atlas: { A: P(15, 50), B: P(85, 50), C: P(60, 18) },
        modele: [
            { op: 'points', args: ['A', 'B', 'C'] },
            { op: 'droite', args: ['A', 'B'] },
            { op: 'perpendiculaire', args: ['A', 'B', 'C'] }
        ]
    },
    {
        id: 'parallele', titre: 'Deux droites parallèles',
        atlas: { A: P(15, 52), B: P(85, 38), C: P(45, 15) },
        modele: [
            { op: 'points', args: ['A', 'B', 'C'] },
            { op: 'droite', args: ['A', 'B'] },
            { op: 'parallele', args: ['A', 'B', 'C'] }
        ]
    },
    {
        id: 'hauteur', titre: 'Un triangle et une hauteur',
        atlas: { A: P(18, 55), B: P(85, 55), C: P(45, 15) },
        nonAlignes: true,
        modele: [
            { op: 'points', args: ['A', 'B', 'C'] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', 'C'] },
            { op: 'segment', args: ['C', 'A'] },
            { op: 'perpendiculaire', args: ['A', 'B', 'C'] }
        ]
    },
    {
        id: 'equilateral', titre: 'Un triangle équilatéral',
        atlas: { A: P(30, 55), B: P(70, 55) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'cercle', args: ['A', 'B'], aide: true },
            { op: 'cercle', args: ['B', 'A'], aide: true },
            { op: 'intersection', args: [1, 2], aide: true },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', 'C'] },
            { op: 'segment', args: ['C', 'A'] }
        ]
    },
    {
        id: 'losange', titre: 'Un losange',
        atlas: { A: P(28, 50), B: P(62, 50) },
        modele: [
            { op: 'points', args: ['A', 'B'] },
            { op: 'cercle', args: ['A', 'B'], aide: true },
            { op: 'cercle', args: ['B', 'A'], aide: true },
            { op: 'intersection', args: [1, 2], aide: true },
            { op: 'cercle', args: ['C', 'A'], aide: true },
            { op: 'intersection', args: [2, 4], aide: true },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', 'E'] },
            { op: 'segment', args: ['E', 'C'] },
            { op: 'segment', args: ['C', 'A'] }
        ]
    },
    {
        id: 'circonscrit', titre: 'Un triangle et son cercle circonscrit',
        atlas: { A: P(22, 55), B: P(80, 50), C: P(52, 16) },
        nonAlignes: true,
        modele: [
            { op: 'points', args: ['A', 'B', 'C'] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', 'C'] },
            { op: 'segment', args: ['C', 'A'] },
            { op: 'mediatrice', args: ['A', 'B'], aide: true },
            { op: 'mediatrice', args: ['B', 'C'], aide: true },
            { op: 'intersection', args: [4, 5], aide: true },
            { op: 'cercle', args: ['D', 'A'] }
        ]
    }
];

/**
 * L'ÉNONCÉ NE DONNE PLUS LA MÉTHODE — Rémy : « j'ai l'impression que tu donnes
 * les réponses dans l'énoncé ».
 *
 * Il avait raison, et c'était flagrant : « Trace [AB], place son milieu, puis
 * trace le cercle qui a ce milieu pour centre et qui passe par A » — c'est le
 * programme, écrit en toutes lettres, au-dessus de la case où l'on demande de
 * l'écrire. Il ne restait qu'à recopier.
 *
 * La consigne est donc la MÊME partout, et elle ne dit que la tâche. Ce que
 * l'élève doit lire, il le lit sur la figure. Seule exception : quand la figure
 * ne peut pas dire une contrainte — trois points non alignés se voient, mais
 * rien ne prouve qu'ils ne DOIVENT pas l'être —, on l'ajoute d'un mot.
 */
export const CONSIGNE = 'Écris le programme qui construit cette figure : '
    + 'une phrase par ligne.';

export const consigneDe = (niv) => CONSIGNE
    + (niv && niv.nonAlignes ? ' Les points de départ ne sont pas alignés.' : '');

/**
 * LE NIVEAU, PRÊT À JOUER : sa figure cible et les familles qu\'il réclame.
 *
 * Les arguments d\'intersection du modèle sont écrits en RANGS d\'instruction
 * (« le tracé du bloc 0 et celui du bloc 1 ») et non en clés d\'objets, qu\'on ne
 * peut pas connaître avant d\'exécuter. On les résout ici.
 */
export function preparerNiveau(n) {
    const niv = typeof n === 'number' ? NIVEAUX[n] : NIVEAUX.find(x => x.id === n);
    if (!niv) return null;

    // ON RÉSOUT EN EXÉCUTANT LE PRÉFIXE. Une intersection désigne des TRACÉS, et
    // un tracé n'a de clé qu'une fois produit : impossible de la connaître avant
    // d'avoir exécuté ce qui précède. On rejoue donc le début à chaque fois —
    // dix phrases au plus, c'est gratuit.
    const resolu = [];
    const parRang = {};
    let combien = 0;
    niv.modele.forEach((ins, rang) => {
        resolu.push({
            op: ins.op,
            args: ins.op === 'intersection' ? ins.args.map(rg => parRang[rg]) : ins.args
        });
        const r = executer(resolu, niv.atlas);
        if (r.erreur) throw new Error(`niveau ${niv.id}, phrase ${rang} : ${r.erreur.dit}`);
        if (r.objets.length > combien) parRang[rang] = cleObjet(r.objets[r.objets.length - 1]);
        combien = r.objets.length;
    });

    const fin = executer(resolu, niv.atlas);
    const cles = new Set();
    niv.modele.forEach((ins, rang) => {
        if (!ins.aide && parRang[rang]) cles.add(parRang[rang]);
    });

    // LES POINTS DONNÉS, ce sont ceux que le programme PLACE — pas ceux qu'il
    // construit. C'est ce qu'on montre sur la figure : les autres se déduisent,
    // et les afficher donnerait la méthode.
    const donnes = {};
    niv.modele.filter(i2 => i2.op === 'points')
        .forEach(i2 => i2.args.forEach(l => { donnes[l] = { ...niv.atlas[l] }; }));

    return {
        ...niv,
        dit: consigneDe(niv),
        modeleResolu: resolu,
        donnes,
        exiges: Object.keys(donnes),
        points: fin.points,
        objets: fin.objets,
        attendus: fin.objets.filter(o => cles.has(cleObjet(o))),
        familles: [...new Set(niv.modele.map(i2 => OPERATIONS[i2.op].famille))]
    };
}

/** Les niveaux jouables avec les familles cochées, dans l\'ordre de difficulté. */
export function niveauxDisponibles(familles) {
    const voulues = new Set(familles && familles.length ? familles : ORDRE_FAMILLES);
    return NIVEAUX
        .map((n, i) => ({ i, familles: [...new Set(n.modele.map(x => OPERATIONS[x.op].famille))] }))
        .filter(x => x.familles.every(f => voulues.has(f)))
        .map(x => x.i);
}
