// CONSTRUIRE AUX INSTRUMENTS — ce qu'on demande, et comment on juge.
//
// L'atelier de géométrie (js/games/geometrie.js) fait tourner GéoMaster dans
// un cadre : c'est lui qui porte la règle, l'équerre, le compas et le
// rapporteur. Ce module-ci ne touche à rien de tout ça. Il fait deux choses,
// et elles sont toutes deux du ressort des mathématiques, pas de l'interface :
//
//   · IL POSE LA FIGURE DE DÉPART. « Trace la médiatrice de [AB] » n'a de sens
//     que si A et B sont déjà là. Chaque consigne sait donc dessiner son point
//     de départ, aux dimensions de la feuille qu'on lui donne.
//   · IL JUGE LA CONSTRUCTION. On reçoit l'état de la feuille — la liste des
//     objets, avec leurs coordonnées — et on répond : est-ce que la médiatrice
//     y est ? Le jugement est GÉOMÉTRIQUE : on ne regarde pas quel outil a
//     servi, on regarde la figure obtenue. Un élève qui trouve la médiatrice
//     au compas, à l'équerre ou en pliant sa feuille a construit la même
//     droite, et elle vaut autant.
//
// Et quand c'est faux, on dit POURQUOI. « Ta droite est bien perpendiculaire à
// (AB), mais elle ne passe pas par le milieu » vaut dix fois « raté » : la
// première phrase apprend quelque chose, la seconde apprend qu'on a raté.
//
// Aucun DOM ici, aucun accès à GéoMaster : tout est calculable et testable.

// Le pas de GéoMaster : 50 pixels pour un centimètre. On raisonne en
// centimètres, comme sur le cahier, et on convertit une seule fois.
export const UNITE = 50;

const TOL_ANGLE = 4;          // degrés de tolérance sur un parallélisme
const RAD = Math.PI / 180;

// --- Petite géométrie -------------------------------------------------------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const milieuDe = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Vecteur unitaire de a vers b, ou null si les deux points sont confondus. */
function unitaire(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy);
    return n < 1e-6 ? null : { x: dx / n, y: dy / n };
}

const normale = (u) => ({ x: -u.y, y: u.x });

/** Distance d'un point à la DROITE portée par (p, u) — pas au segment. */
function distanceDroite(P, p, u) {
    return Math.abs((P.x - p.x) * u.y - (P.y - p.y) * u.x);
}

/** Angle non orienté entre deux directions, en degrés, dans [0, 90]. */
function ecartAngulaire(u, v) {
    const c = Math.min(1, Math.abs(u.x * v.x + u.y * v.y));
    return Math.acos(c) / RAD;
}

const paralleles = (u, v, tol = TOL_ANGLE) => ecartAngulaire(u, v) <= tol;
const perpendiculaires = (u, v, tol = TOL_ANGLE) => ecartAngulaire(u, v) >= 90 - tol;

// --- Lire l'état d'une feuille ---------------------------------------------

/** Un objet vient-il de la figure de départ (donc : pas de l'élève) ? */
export const estDepart = (id) => typeof id === 'string' && id.startsWith('dep-');

const LINEAIRES = ['Segment', 'Line', 'Ray', 'ParallelLine', 'PerpendicularLine'];

/**
 * Traduit l'état sérialisé de GéoMaster en objets géométriques utilisables.
 *
 * @param {string|Array} etat  le JSON rendu par `serialize()`
 * @returns {{points: Array, droites: Array, cercles: Array}}
 *   points  : {id, x, y, label}
 *   droites : {id, type, p, u}  — un point du support et sa direction
 *   cercles : {id, centre, rayon}
 */
export function analyser(etat) {
    let brut;
    if (Array.isArray(etat)) brut = etat;
    else { try { brut = JSON.parse(etat || '[]'); } catch { brut = []; } }
    if (!Array.isArray(brut)) brut = [];

    const parId = new Map();
    brut.forEach(o => { if (o && o.id) parId.set(o.id, o); });

    const coord = (id) => {
        const o = parId.get(id);
        return (o && o.type === 'Point' && Number.isFinite(o.x) && Number.isFinite(o.y))
            ? { x: o.x, y: o.y } : null;
    };

    // Une parallèle (ou une perpendiculaire) tracée à l'outil ne stocke pas
    // deux points : elle stocke le point par où elle passe et la droite dont
    // elle dérive. On remonte donc la chaîne — avec un garde-fou, une figure
    // abîmée pourrait boucler.
    const support = (o, profondeur = 0) => {
        if (!o || profondeur > 8) return null;
        if (o.type === 'ParallelLine' || o.type === 'PerpendicularLine') {
            const p = coord(o.p1Id);
            const ref = support(parId.get(o.refLineId), profondeur + 1);
            if (!p || !ref) return null;
            return { p, u: o.type === 'ParallelLine' ? ref.u : normale(ref.u) };
        }
        const a = coord(o.p1Id), b = coord(o.p2Id);
        if (!a || !b) return null;
        const u = unitaire(a, b);
        return u ? { p: a, u } : null;
    };

    const points = [], droites = [], cercles = [];
    brut.forEach(o => {
        if (!o || !o.type) return;
        if (o.type === 'Point') {
            const c = coord(o.id);
            if (c) points.push({ id: o.id, x: c.x, y: c.y, label: o.label || '' });
        } else if (LINEAIRES.includes(o.type)) {
            const s = support(o);
            if (s) droites.push({ id: o.id, type: o.type, p: s.p, u: s.u });
        } else if (o.type === 'Circle') {
            const c = coord(o.p1Id), b = coord(o.p2Id);
            if (c && b) cercles.push({ id: o.id, centre: c, rayon: dist(c, b) });
        } else if (o.type === 'CompassArc' && Number.isFinite(o.radius)) {
            // Un arc de compas laissé tel quel n'est pas un cercle tracé : on
            // le garde à part, il ne sert qu'à comprendre une figure ratée.
            const c = o.centerId ? coord(o.centerId)
                : (Number.isFinite(o.cx) ? { x: o.cx, y: o.cy } : null);
            if (c) cercles.push({ id: o.id, centre: c, rayon: o.radius, arc: true });
        }
    });
    return { points, droites, cercles };
}

/** Où se trouve MAINTENANT un point de la figure de départ (l'élève a pu le déplacer). */
function repere(fig, id, defaut) {
    const p = fig.points.find(x => x.id === id);
    return p ? { x: p.x, y: p.y } : defaut;
}

// --- Fabrique d'objets sérialisés ------------------------------------------

const ENCRE = '#1f2937';

const objPoint = (id, x, y, label, opts = {}) => ({
    type: 'Point', id, x, y, label: label || '',
    showLabel: !!label, visible: opts.visible !== false,
    parentIds: [], subType: null, pointStyle: opts.style || 'cross',
    labelAngle: opts.labelAngle !== undefined ? opts.labelAngle : -Math.PI / 2,
    fontSize: 15, color: opts.couleur || ENCRE, dash: [], lineWidth: 2
});

const objLineaire = (type, id, p1Id, p2Id, opts = {}) => ({
    type, id, p1Id, p2Id,
    color: opts.couleur || ENCRE, dash: opts.pointille ? [6, 5] : [],
    lineWidth: opts.epaisseur || 2.4
});

const objSegment = (id, a, b, opts) => objLineaire('Segment', id, a, b, opts);
const objDroite = (id, a, b, opts) => objLineaire('Line', id, a, b, opts);

const objCercle = (id, centreId, borddId, opts = {}) => ({
    type: 'Circle', id, p1Id: centreId, p2Id: borddId,
    fillMode: 'none', opacity: 0.2, fillColor: null,
    color: opts.couleur || ENCRE, dash: [], lineWidth: opts.epaisseur || 2.2
});

const objArc = (id, centreId, rayon, debut, fin, opts = {}) => ({
    type: 'CompassArc', id, centerId: centreId, radius: rayon,
    startA: debut, endA: fin, counterClockwise: false,
    color: opts.couleur || '#2563eb', dash: [], lineWidth: 1.6
});

// --- Poser une figure de départ --------------------------------------------

/**
 * Le cadre utile d'une feuille : on tient les points à distance des bords, et
 * on rabat la longueur demandée si la feuille est petite (un téléphone en
 * portrait n'offre pas 6 cm de large).
 */
function cadre(taille) {
    const w = Math.max(240, Number(taille && taille.w) || 640);
    const h = Math.max(200, Number(taille && taille.h) || 420);
    // La feuille de GéoMaster est plus grande que ce qu'on en voit, et elle
    // se déplace : le coin haut-gauche VISIBLE n'est donc pas l'origine.
    const ox = Number(taille && taille.x) || 0;
    const oy = Number(taille && taille.y) || 0;
    const marge = Math.min(70, Math.max(34, Math.min(w, h) * 0.12));
    return {
        w, h, marge, cx: ox + w / 2, cy: oy + h / 2,
        utileW: w - 2 * marge, utileH: h - 2 * marge
    };
}

/** Une longueur en cm, ramenée à ce que la feuille peut contenir. */
const longueur = (cm, maxi) => Math.min(cm * UNITE, maxi);

// --- Les consignes ----------------------------------------------------------
//
// Chacune sait : ce qu'elle demande, comment poser sa figure, comment juger,
// et quoi dire quand c'est raté. C'est le seul endroit à toucher pour en
// ajouter une.

export const CONSIGNES = [
    {
        id: 'milieu',
        titre: 'Le milieu d\'un segment',
        enonce: 'Place le point I, milieu du segment [AB].',
        aide: 'Le milieu est à égale distance de A et de B — et il est SUR le segment. '
            + 'À la règle graduée : mesure AB, puis reporte la moitié depuis A.',
        depart(t, rng) {
            const c = cadre(t);
            const L = longueur(6, c.utileW);
            const incl = (rng ? rng.int(-18, 18) : 0) * RAD;
            const A = { x: c.cx - Math.cos(incl) * L / 2, y: c.cy - Math.sin(incl) * L / 2 };
            const B = { x: c.cx + Math.cos(incl) * L / 2, y: c.cy + Math.sin(incl) * L / 2 };
            return {
                reperes: { A, B },
                objets: [
                    objPoint('dep-A', A.x, A.y, 'A'),
                    objPoint('dep-B', B.x, B.y, 'B'),
                    objSegment('dep-AB', 'dep-A', 'dep-B')
                ]
            };
        },
        verifier(fig, r) {
            const A = repere(fig, 'dep-A', r.A), B = repere(fig, 'dep-B', r.B);
            const M = milieuDe(A, B);
            const tol = Math.max(9, dist(A, B) * 0.05);
            const candidats = fig.points.filter(p => !estDepart(p.id));
            if (!candidats.length) return { ok: false, message: 'Aucun point placé : il faut poser le point I sur le segment.' };
            const bon = candidats.find(p => dist(p, M) <= tol);
            if (bon) return { ok: true, message: 'Le point est bien au milieu de [AB].', trouve: bon.label || 'I' };
            // Le plus proche dit ce qui a manqué.
            const proche = candidats.reduce((m, p) => (dist(p, M) < dist(m, M) ? p : m));
            const surSegment = distanceDroite(proche, A, unitaire(A, B)) <= tol;
            return {
                ok: false,
                message: surSegment
                    ? 'Ton point est bien sur la droite (AB), mais pas au milieu : il doit être à la même distance de A et de B.'
                    : 'Ton point n\'est pas sur le segment [AB]. Le milieu, lui, est dessus.'
            };
        }
    },
    {
        id: 'mediatrice',
        titre: 'La médiatrice d\'un segment',
        enonce: 'Trace la médiatrice du segment [AB].',
        aide: 'La médiatrice passe par le milieu de [AB] ET lui est perpendiculaire. '
            + 'Au compas : même écartement depuis A et depuis B, les deux arcs se croisent en deux points — la droite qui les joint est la médiatrice.',
        depart(t, rng) {
            const c = cadre(t);
            const L = longueur(6, Math.min(c.utileW, c.utileH * 1.6));
            const incl = (rng ? rng.int(-22, 22) : 0) * RAD;
            const A = { x: c.cx - Math.cos(incl) * L / 2, y: c.cy - Math.sin(incl) * L / 2 };
            const B = { x: c.cx + Math.cos(incl) * L / 2, y: c.cy + Math.sin(incl) * L / 2 };
            return {
                reperes: { A, B },
                objets: [
                    objPoint('dep-A', A.x, A.y, 'A'),
                    objPoint('dep-B', B.x, B.y, 'B'),
                    objSegment('dep-AB', 'dep-A', 'dep-B')
                ]
            };
        },
        verifier(fig, r) {
            const A = repere(fig, 'dep-A', r.A), B = repere(fig, 'dep-B', r.B);
            const M = milieuDe(A, B), u = unitaire(A, B);
            const tol = Math.max(10, dist(A, B) * 0.07);
            const tracees = fig.droites.filter(d => !estDepart(d.id));
            if (!tracees.length) return { ok: false, message: 'Rien de tracé : la médiatrice est une DROITE, il faut la tracer.' };

            const perp = tracees.filter(d => perpendiculaires(d.u, u));
            const passe = tracees.filter(d => distanceDroite(M, d.p, d.u) <= tol);
            if (perp.some(d => passe.includes(d))) {
                return { ok: true, message: 'Perpendiculaire à (AB) et passant par son milieu : c\'est bien la médiatrice.' };
            }
            if (perp.length) return { ok: false, message: 'Ta droite est bien perpendiculaire à (AB), mais elle ne passe pas par le MILIEU de [AB].' };
            if (passe.length) return { ok: false, message: 'Ta droite passe bien par le milieu de [AB], mais elle n\'est pas PERPENDICULAIRE à (AB).' };
            return { ok: false, message: 'La médiatrice doit passer par le milieu de [AB] et être perpendiculaire à (AB). Ta droite ne fait ni l\'un ni l\'autre.' };
        }
    },
    {
        id: 'perpendiculaire',
        titre: 'Une perpendiculaire par un point',
        enonce: 'Trace la droite perpendiculaire à (d) qui passe par le point A.',
        aide: 'À l\'équerre : un côté de l\'angle droit posé le long de (d), on fait glisser jusqu\'à toucher A, et on trace le long de l\'autre côté.',
        depart(t, rng) {
            const c = cadre(t);
            const L = longueur(7, c.utileW);
            const incl = (rng ? rng.int(-25, 25) : 12) * RAD;
            const y = c.cy + c.utileH * 0.18;
            const P = { x: c.cx - Math.cos(incl) * L / 2, y: y - Math.sin(incl) * L / 2 };
            const Q = { x: c.cx + Math.cos(incl) * L / 2, y: y + Math.sin(incl) * L / 2 };
            const ecart = Math.max(60, Math.min(c.utileH * 0.32, 2.6 * UNITE));
            const n = normale(unitaire(P, Q));
            const A = { x: c.cx - n.x * ecart, y: y - n.y * ecart };
            return {
                reperes: { A, P, Q },
                objets: [
                    objPoint('dep-P', P.x, P.y, '', { visible: false }),
                    objPoint('dep-Q', Q.x, Q.y, '', { visible: false }),
                    objDroite('dep-d', 'dep-P', 'dep-Q'),
                    objPoint('dep-A', A.x, A.y, 'A')
                ]
            };
        },
        verifier(fig, r) {
            const A = repere(fig, 'dep-A', r.A);
            const P = repere(fig, 'dep-P', r.P), Q = repere(fig, 'dep-Q', r.Q);
            const u = unitaire(P, Q);
            const tol = Math.max(10, dist(P, Q) * 0.06);
            const tracees = fig.droites.filter(d => !estDepart(d.id));
            if (!tracees.length) return { ok: false, message: 'Rien de tracé : il faut une droite qui passe par A.' };

            const parA = tracees.filter(d => distanceDroite(A, d.p, d.u) <= tol);
            const perp = tracees.filter(d => perpendiculaires(d.u, u));
            if (parA.some(d => perp.includes(d))) {
                return { ok: true, message: 'Angle droit avec (d), et ta droite passe par A : c\'est la bonne.' };
            }
            if (perp.length) return { ok: false, message: 'L\'angle droit est bon, mais ta droite ne passe pas par A.' };
            if (parA.length) return { ok: false, message: 'Ta droite passe bien par A, mais elle ne fait pas un angle droit avec (d).' };
            return { ok: false, message: 'Ta droite doit passer par A ET couper (d) à angle droit.' };
        }
    },
    {
        id: 'parallele',
        titre: 'Une parallèle par un point',
        enonce: 'Trace la droite parallèle à (d) qui passe par le point A.',
        aide: 'Deux parallèles gardent partout le même écart. À l\'équerre : on trace d\'abord la perpendiculaire à (d) passant par A, puis la perpendiculaire à celle-là, toujours par A.',
        depart(t, rng) {
            const c = cadre(t);
            const L = longueur(7, c.utileW);
            const incl = (rng ? rng.int(-25, 25) : -10) * RAD;
            const y = c.cy + c.utileH * 0.20;
            const P = { x: c.cx - Math.cos(incl) * L / 2, y: y - Math.sin(incl) * L / 2 };
            const Q = { x: c.cx + Math.cos(incl) * L / 2, y: y + Math.sin(incl) * L / 2 };
            const ecart = Math.max(60, Math.min(c.utileH * 0.34, 2.8 * UNITE));
            const n = normale(unitaire(P, Q));
            const A = { x: c.cx - n.x * ecart, y: y - n.y * ecart };
            return {
                reperes: { A, P, Q },
                objets: [
                    objPoint('dep-P', P.x, P.y, '', { visible: false }),
                    objPoint('dep-Q', Q.x, Q.y, '', { visible: false }),
                    objDroite('dep-d', 'dep-P', 'dep-Q'),
                    objPoint('dep-A', A.x, A.y, 'A')
                ]
            };
        },
        verifier(fig, r) {
            const A = repere(fig, 'dep-A', r.A);
            const P = repere(fig, 'dep-P', r.P), Q = repere(fig, 'dep-Q', r.Q);
            const u = unitaire(P, Q);
            const tol = Math.max(10, dist(P, Q) * 0.06);
            const tracees = fig.droites.filter(d => !estDepart(d.id));
            if (!tracees.length) return { ok: false, message: 'Rien de tracé : il faut une droite qui passe par A.' };

            const parA = tracees.filter(d => distanceDroite(A, d.p, d.u) <= tol);
            const para = tracees.filter(d => paralleles(d.u, u));
            if (parA.some(d => para.includes(d))) {
                return { ok: true, message: 'Même direction que (d) et passage par A : les deux droites sont bien parallèles.' };
            }
            if (para.length) return { ok: false, message: 'Ta droite a bien la même direction que (d), mais elle ne passe pas par A.' };
            if (parA.length) return { ok: false, message: 'Ta droite passe bien par A, mais elle finirait par couper (d) : elle n\'a pas la même direction.' };
            return { ok: false, message: 'Ta droite doit passer par A et garder partout le même écart avec (d).' };
        }
    },
    {
        id: 'cercle',
        titre: 'Un cercle de centre donné',
        enonce: 'Trace le cercle de centre O qui passe par le point A.',
        aide: 'La pointe du compas sur O, le crayon sur A : l\'écartement EST le rayon. On tourne sans le changer.',
        depart(t, rng) {
            const c = cadre(t);
            const r = Math.min(longueur(3, c.utileW / 2), c.utileH / 2);
            const angle = (rng ? rng.int(0, 359) : 210) * RAD;
            const O = { x: c.cx, y: c.cy };
            const A = { x: O.x + Math.cos(angle) * r, y: O.y + Math.sin(angle) * r };
            return {
                reperes: { O, A },
                objets: [
                    objPoint('dep-O', O.x, O.y, 'O'),
                    objPoint('dep-A', A.x, A.y, 'A')
                ]
            };
        },
        verifier(fig, r) {
            const O = repere(fig, 'dep-O', r.O), A = repere(fig, 'dep-A', r.A);
            const rayon = dist(O, A);
            const tol = Math.max(9, rayon * 0.07);
            const traces = fig.cercles.filter(c => !estDepart(c.id) && !c.arc);
            if (!traces.length) {
                const arcs = fig.cercles.filter(c => c.arc);
                return {
                    ok: false,
                    message: arcs.length
                        ? 'Il y a un arc de compas, mais pas de cercle entier : termine le tour.'
                        : 'Aucun cercle tracé.'
                };
            }
            const bon = traces.find(c => dist(c.centre, O) <= tol && Math.abs(c.rayon - rayon) <= tol);
            if (bon) return { ok: true, message: 'Centre en O et passage par A : le rayon est le bon.' };
            const centre = traces.find(c => dist(c.centre, O) <= tol);
            if (centre) {
                return {
                    ok: false,
                    message: centre.rayon > rayon
                        ? 'Ton cercle est bien centré en O, mais trop grand : il doit passer exactement par A.'
                        : 'Ton cercle est bien centré en O, mais trop petit : il doit passer exactement par A.'
                };
            }
            return { ok: false, message: 'Ton cercle n\'est pas centré en O. La pointe du compas se pose sur le centre.' };
        }
    }
];

export const consigneDe = (id) => CONSIGNES.find(c => c.id === id) || null;

/**
 * Tire la consigne à travailler. `choix` vaut l'identifiant d'une consigne,
 * 'aleatoire', ou une liste d'identifiants — le professeur peut donc n'ouvrir
 * que ce qu'il a enseigné.
 */
export function tirerConsigne(choix, rng, precedente) {
    let lot = CONSIGNES;
    if (Array.isArray(choix) && choix.length) {
        lot = CONSIGNES.filter(c => choix.includes(c.id));
    } else if (typeof choix === 'string' && choix && choix !== 'aleatoire') {
        const seule = consigneDe(choix);
        if (seule) return seule;
    }
    if (!lot.length) lot = CONSIGNES;
    // Deux fois la même consigne d'affilée est décourageant quand il y en a
    // cinq à voir : on retire la précédente du tirage — sauf s'il n'y a qu'elle.
    const sans = lot.length > 1 ? lot.filter(c => c.id !== precedente) : lot;
    const i = rng ? rng.int(0, sans.length - 1) : Math.floor(Math.random() * sans.length);
    return sans[i] || sans[0];
}

/** La figure de départ, prête à être chargée dans GéoMaster. */
export function departDe(consigne, taille, rng) {
    const d = consigne.depart(taille, rng);
    return { json: JSON.stringify(d.objets), objets: d.objets, reperes: d.reperes };
}

/** Le verdict sur une feuille, pour une consigne et sa figure de départ. */
export function juger(consigne, etat, reperes) {
    const fig = analyser(etat);
    const v = consigne.verifier(fig, reperes || {});
    return { ...v, figure: fig };
}

// --- La démonstration du robot ---------------------------------------------

/**
 * La médiatrice au compas, en cinq temps. Chaque temps porte une phrase et
 * l'état de la feuille à ce moment-là : le robot n'imite pas des gestes, il
 * MONTRE la construction en train de se faire, et dit ce qui la justifie.
 *
 * C'est la seule construction que le robot montre, et c'est voulu : elle
 * contient les deux idées dont vivent toutes les autres — l'écartement du
 * compas qui garde une distance, et deux points à égale distance de A et de B
 * qui suffisent à tenir une droite.
 */
export function demoMediatrice(reperes) {
    const A = reperes.A, B = reperes.B;
    const M = milieuDe(A, B);
    const AB = dist(A, B);
    const r = AB * 0.72;                       // franchement plus que la moitié
    const h = Math.sqrt(Math.max(1, r * r - (AB / 2) * (AB / 2)));
    const n = normale(unitaire(A, B));
    const H = { x: M.x + n.x * h, y: M.y + n.y * h };
    const K = { x: M.x - n.x * h, y: M.y - n.y * h };
    const vers = (o, c) => Math.atan2(c.y - o.y, c.x - o.x);

    const base = [
        objPoint('dep-A', A.x, A.y, 'A'),
        objPoint('dep-B', B.x, B.y, 'B'),
        objSegment('dep-AB', 'dep-A', 'dep-B')
    ];
    const arcA = objArc('demo-arcA', 'dep-A', r, vers(A, B) - 1.15, vers(A, B) + 1.15);
    const arcB = objArc('demo-arcB', 'dep-B', r, vers(B, A) - 1.15, vers(B, A) + 1.15);
    const croix = [
        objPoint('demo-H', H.x, H.y, 'H', { couleur: '#2563eb' }),
        objPoint('demo-K', K.x, K.y, 'K', { couleur: '#2563eb', labelAngle: Math.PI / 2 })
    ];
    const mediatrice = objDroite('demo-med', 'demo-H', 'demo-K', { couleur: '#dc2626', epaisseur: 2.8 });

    return [
        {
            note: 'On cherche la médiatrice de [AB] : la droite qui coupe [AB] en son milieu, à angle droit.',
            objets: base
        },
        {
            note: 'J\'écarte le compas de plus de la moitié de AB, je pique en A, et je trace un arc.',
            objets: [...base, arcA]
        },
        {
            note: 'SANS toucher à l\'écartement, je pique en B et je trace le deuxième arc. Le même écartement : c\'est ce qui fait tout.',
            objets: [...base, arcA, arcB]
        },
        {
            note: 'Les arcs se croisent en deux points. Chacun est à la même distance de A et de B — puisque c\'est le même écartement de compas.',
            objets: [...base, arcA, arcB, ...croix]
        },
        {
            note: 'Deux points à égale distance de A et de B : la droite qui les joint est la médiatrice. Elle passe bien par le milieu, et bien à angle droit.',
            objets: [...base, arcA, arcB, ...croix, mediatrice]
        }
    ].map(e => ({ ...e, json: JSON.stringify(e.objets) }));
}
