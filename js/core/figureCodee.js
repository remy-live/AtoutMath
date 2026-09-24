// UNE FIGURE QUI PORTE UN CODAGE — le modèle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, ses exercices 7, 8 et 10 : « Écris les données fournies par le
// codage », et « le nombre de lignes correspond au nombre d'informations
// fournies ». L'application savait POSER un codage sur un quadrilatère ; elle
// ne savait pas demander de le LIRE.
//
// ── LES LONGUEURS SONT ÉGALES, ELLES NE SONT PAS PRESQUE ÉGALES ─────────────
//
// Un codage dit « ces deux segments ont la même longueur ». Si le dessin les
// montre inégaux, il dit le contraire de lui-même, et l'élève a raison de ne
// plus rien y comprendre. Les branches sont donc tirées parmi des vecteurs
// dont on connaît le carré de la longueur EN ENTIER : (3, 1) et (1, 3) valent
// tous deux √10, exactement. Aucun arrondi n'entre dans la décision — et,
// comme pour l'appartenance, c'est la construction qui fait foi, pas une
// comparaison de flottants.
//
// C'est la même exigence que `core/codage.js` pour les quadrilatères, qui
// refuse les dimensions où une demi-diagonale égale un côté par coïncidence :
// l'exercice porte sur ce que le CODAGE dit, pas sur ce qu'un hasard de
// mesures aurait rendu vrai.

/**
 * Les vecteurs de branche, groupés par carré de longueur.
 *
 * Deux branches du même groupe sont exactement de même longueur ; deux
 * branches de groupes différents sont franchement différentes — au moins un
 * rapport de 1,25, sans quoi l'élève verrait deux marques distinctes sur ce
 * qui lui semble deux segments égaux.
 */
const GROUPES = [
    { carre: 9, vecteurs: [{ x: 3, y: 0 }, { x: 0, y: 3 }, { x: -3, y: 0 }, { x: 0, y: -3 }] },
    { carre: 16, vecteurs: [{ x: 4, y: 0 }, { x: 0, y: 4 }, { x: -4, y: 0 }, { x: 0, y: -4 }] },
    { carre: 25, vecteurs: [{ x: 5, y: 0 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: -3, y: 4 },
        { x: -4, y: 3 }, { x: 0, y: 5 }, { x: 3, y: -4 }, { x: -5, y: 0 }, { x: 4, y: -3 }] },
    { carre: 8, vecteurs: [{ x: 2, y: 2 }, { x: -2, y: 2 }, { x: 2, y: -2 }, { x: -2, y: -2 }] },
    { carre: 18, vecteurs: [{ x: 3, y: 3 }, { x: -3, y: 3 }, { x: 3, y: -3 }, { x: -3, y: -3 }] }
];

const LETTRES = 'ABCDEFGHJKLMNPRSTUVZ'.split('');
const carreLong = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

/** L'angle d'une branche, pour écarter deux branches trop rapprochées. */
const angle = (v) => Math.atan2(v.y, v.x);

/**
 * L'ÉTOILE : un centre, des branches, deux longueurs — la figure de son ex. 7.
 *
 * Deux branches par groupe au moins : une marque posée sur un seul segment ne
 * dit rien, puisque le codage exprime une ÉGALITÉ. C'est d'ailleurs ce que sa
 * fiche fait dire à l'élève — « le nombre de lignes correspond au nombre
 * d'informations » —, et une marque solitaire n'en donne aucune.
 *
 * @returns {{points:object, segments:Array, centre:string, classes:Array}|null}
 */
export function etoile(rng, cfg = {}) {
    // `tailles` dit combien de branches par groupe : [2, 2] donne deux paires,
    // [3, 2] une famille de trois et une paire. Le nombre d'ÉGALITÉS qui en
    // découle n'est pas le nombre de branches — trois branches égales donnent
    // trois égalités, deux n'en donnent qu'une —, et c'est justement ce que sa
    // question « combien d'informations ? » fait compter.
    const tailles = cfg.tailles || Array(cfg.groupes || 2).fill(cfg.parGroupe || 2);

    for (let essai = 0; essai < 200; essai++) {
        const groupes = rng.shuffle(GROUPES.slice()).slice(0, tailles.length);
        const centre = { x: 0, y: 0 };
        const branches = [];
        let bon = true;

        for (let gi = 0; gi < groupes.length; gi++) {
            const g = groupes[gi];
            const combien = tailles[gi];
            const pris = rng.shuffle(g.vecteurs.slice()).slice(0, combien);
            if (pris.length < combien) { bon = false; break; }
            pris.forEach(v => branches.push({ v, carre: g.carre }));
        }
        if (!bon) continue;

        // DEUX BRANCHES TROP PROCHES SE CHEVAUCHENT, et l'on ne sait plus quelle
        // marque appartient à laquelle. Trente degrés d'écart au minimum.
        const ok = branches.every((b, i) => branches.every((c, j) =>
            i === j || Math.abs(ecartAngle(angle(b.v), angle(c.v))) > 0.52));
        if (!ok) continue;

        const libres = rng.shuffle(LETTRES.slice());
        const nomCentre = libres[0];
        const points = { [nomCentre]: centre };
        const segments = [];
        branches.forEach((b, i) => {
            const nom = libres[i + 1];
            points[nom] = { x: centre.x + b.v.x, y: centre.y + b.v.y };
            segments.push({ a: nomCentre, b: nom, carre: b.carre });
        });

        // Deux points au même endroit, ou trop près l'un de l'autre : la figure
        // deviendrait illisible.
        const noms = Object.keys(points);
        const colle = noms.some((n, i) => noms.slice(i + 1).some(m =>
            carreLong(points[n], points[m]) < 4));
        if (colle) continue;

        return { points, segments, centre: nomCentre, classes: classesDe(segments) };
    }
    return null;
}

/**
 * LE SEGMENT PARTAGÉ : [AB] et un point dessus — la figure de son ex. 10.
 *
 * `milieu` vrai place le point à égale distance des deux bouts ; faux le place
 * ailleurs sur le segment, ce qui donne deux morceaux de longueurs
 * DIFFÉRENTES — et c'est ce qu'un codage ne doit alors pas prétendre.
 */
export function segmentPartage(rng, { milieu = true } = {}) {
    const dir = rng.pick([{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
        { x: 1, y: -1 }, { x: 2, y: 1 }, { x: 2, y: -1 }]);
    const k = rng.int(2, 4);
    const libres = rng.shuffle(LETTRES.slice());
    const [A, I, B] = [libres[0], libres[1], libres[2]];
    const a = { x: 0, y: 0 };
    // Le point partage : au milieu, ou franchement décalé — jamais « presque
    // au milieu », qui se jouerait à l'œil et non au codage.
    const part = milieu ? k : (rng.bool() ? Math.max(1, k - 1) : k + 1);
    const total = milieu ? 2 * k : part + k + (rng.bool() ? 1 : 2);
    const points = {
        [A]: a,
        [I]: { x: a.x + dir.x * part, y: a.y + dir.y * part },
        [B]: { x: a.x + dir.x * total, y: a.y + dir.y * total }
    };
    const segments = [
        { a: A, b: I, carre: carreLong(points[A], points[I]) },
        { a: I, b: B, carre: carreLong(points[I], points[B]) }
    ];
    return { points, segments, A, I, B, milieu,
        classes: classesDe(segments) };
}

/**
 * DEUX SEGMENTS, CHACUN AVEC UN POINT DESSUS — la figure de son exercice 10.
 *
 * TROIS POINTS NE SUFFISENT PAS À POSER QUATRE PROPOSITIONS, et c'est la
 * mesure qui l'a dit : avec A, I et B seuls, il n'existe que trois triplets
 * (point, segment), donc au plus trois phrases — et le générateur rendait
 * `null` six cents fois sur six cents. Sa fiche, d'ailleurs, ne pose jamais un
 * seul segment : son exercice 10 en aligne quatre, son exercice 14 en fait
 * placer quatre milieux.
 *
 * On pose donc DEUX segments : l'un dont le point intérieur est le milieu,
 * l'autre dont il ne l'est pas. La comparaison est le vrai travail — « sur
 * lequel des deux la marque est-elle la même des deux côtés ? » — et elle
 * n'existait pas avec un segment unique.
 *
 * LES QUATRE MORCEAUX N'ONT PAS DE LONGUEUR COMMUNE PAR HASARD. Une moitié du
 * premier segment qui vaudrait un morceau du second recevrait la même marque,
 * et le codage annoncerait une égalité que la question n'a pas voulue. On
 * rejoue tant que c'est le cas — même discipline que `core/codage.js`, qui
 * refuse les rectangles où une demi-diagonale égale un côté.
 */
export function deuxSegmentsPartages(rng) {
    for (let essai = 0; essai < 200; essai++) {
        const libres = rng.shuffle(LETTRES.slice());
        const [A, I, B, C, J, D] = libres.slice(0, 6);
        const dir1 = rng.pick([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
        const dir2 = rng.pick([{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 2, y: -1 }]);
        const k = rng.int(2, 4);                 // demi-longueur du premier
        // DEUX UNITÉS AU MINIMUM PAR MORCEAU. Avec un morceau d'une seule
        // unité, la figure mise à l'échelle collait deux étiquettes l'une sur
        // l'autre — vu à l'écran, le L et le B se touchaient. Un point qu'on
        // ne sait pas nommer ne sert à rien dans une question qui le nomme.
        const g = rng.int(2, 5), d = rng.int(2, 5);   // morceaux du second
        if (g === d) continue;                   // sinon le second aurait un milieu

        const base2 = { x: 0, y: -(rng.int(4, 6)) };
        const points = {
            [A]: { x: 0, y: 0 },
            [I]: { x: dir1.x * k, y: dir1.y * k },
            [B]: { x: dir1.x * 2 * k, y: dir1.y * 2 * k },
            [C]: base2,
            [J]: { x: base2.x + dir2.x * g, y: base2.y + dir2.y * g },
            [D]: { x: base2.x + dir2.x * (g + d), y: base2.y + dir2.y * (g + d) }
        };
        const segments = [
            { a: A, b: I, carre: carreLong(points[A], points[I]) },
            { a: I, b: B, carre: carreLong(points[I], points[B]) },
            { a: C, b: J, carre: carreLong(points[C], points[J]) },
            { a: J, b: D, carre: carreLong(points[J], points[D]) }
        ];
        // Les deux moitiés du premier sont égales — c'est voulu. Tout autre
        // couple doit être INÉGAL, sinon le codage dit plus que la question.
        const carres = segments.map(s => s.carre);
        if (carres[0] !== carres[1]) continue;
        if (carres[2] === carres[3]) continue;
        if (carres[2] === carres[0] || carres[3] === carres[0]) continue;

        // Les deux segments ne doivent pas se croiser ni se frôler : deux
        // figures superposées ne se lisent plus.
        // Les étiquettes d'une figure codée sont plus grosses que celles d'une
        // scène de droites : il leur faut deux unités d'écart, pas une.
        const tous = Object.values(points);
        const colle = tous.some((p, i) => tous.slice(i + 1)
            .some(q => carreLong(p, q) < 4));
        if (colle) continue;
        if (croisent(points[A], points[B], points[C], points[D])) continue;

        return { points, segments, A, I, B, C, J, D, classes: classesDe(segments) };
    }
    return null;
}

/** Deux segments se coupent-ils ? Test des orientations, en entiers. */
function croisent(p1, p2, p3, p4) {
    const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    const d1 = o(p3, p4, p1), d2 = o(p3, p4, p2);
    const d3 = o(p1, p2, p3), d4 = o(p1, p2, p4);
    return d1 !== d2 && d3 !== d4;
}

/**
 * LE PIÈGE DU MILIEU : un point à égale distance de A et de B, mais PAS sur
 * [AB].
 *
 * Il n'est dans aucun manuel, et c'est exactement pour cela qu'il mérite
 * d'être posé : la définition du milieu tient en DEUX conditions — être sur le
 * segment, et être à égale distance des extrémités — et l'élève n'en retient
 * qu'une. Le codage, ici, dit vrai ; c'est la conclusion qui serait fausse.
 */
export function equidistantHorsSegment(rng) {
    for (let essai = 0; essai < 120; essai++) {
        // A et B symétriques par rapport à l'axe vertical, M dessus : MA = MB
        // par construction, et M n'est pas aligné avec A et B.
        const demi = rng.int(2, 4);
        const haut = rng.int(2, 4);
        const libres = rng.shuffle(LETTRES.slice());
        const [A, B, M] = [libres[0], libres[1], libres[2]];
        const points = {
            [A]: { x: -demi, y: 0 },
            [B]: { x: demi, y: 0 },
            [M]: { x: 0, y: haut }
        };
        if (carreLong(points[A], points[M]) === carreLong(points[A], points[B])) continue;
        // UN QUATRIÈME POINT, ET IL EST LE VRAI MILIEU. Le triangle seul ne
        // donnait que trois triplets — trop peu pour quatre propositions — et
        // surtout il ne montrait pas ce à quoi M ressemblerait s'il était le
        // milieu. Le voilà, sur [AB] : la comparaison est la leçon.
        const N = libres[3];
        points[N] = { x: 0, y: 0 };
        const segments = [
            { a: M, b: A, carre: carreLong(points[M], points[A]) },
            { a: M, b: B, carre: carreLong(points[M], points[B]) },
            { a: A, b: N, carre: carreLong(points[A], points[N]) },
            { a: N, b: B, carre: carreLong(points[N], points[B]) }
        ];
        // [AN] et [NB] sont égaux par construction ; s'ils valaient aussi MA,
        // les quatre segments porteraient la même marque et la figure dirait
        // une égalité que la question n'a pas voulue.
        if (carreLong(points[A], points[N]) === carreLong(points[M], points[A])) continue;
        return { points, segments, A, B, M, N, classes: classesDe(segments) };
    }
    return null;
}

/** Les paquets de segments de même longueur, rangés du plus grand paquet au plus petit. */
export function classesDe(segments) {
    const par = new Map();
    for (const s of segments) {
        if (!par.has(s.carre)) par.set(s.carre, []);
        par.get(s.carre).push(s);
    }
    return [...par.entries()]
        .map(([carre, liste]) => ({ carre, segments: liste }))
        .sort((u, v) => v.segments.length - u.segments.length);
}

/**
 * Le numéro de marque de chaque segment : 1 trait, 2 traits, 3 traits…
 *
 * UN SEGMENT SEUL DANS SA CLASSE NE PORTE AUCUNE MARQUE. Le codage exprime une
 * égalité ; marquer un segment qui n'a pas d'égal serait écrire une phrase
 * sans verbe, et l'élève chercherait en vain ce à quoi il est égal.
 */
export function marquesDe(figure) {
    const out = {};
    let n = 0;
    for (const c of figure.classes) {
        if (c.segments.length < 2) continue;
        n += 1;
        c.segments.forEach(s => { out[`${s.a}${s.b}`] = n; });
    }
    return out;
}

/**
 * CE QUE LE CODAGE DIT, exactement — la liste des égalités qu'il donne.
 *
 * Sa fiche demande « le nombre de lignes correspond au nombre d'informations
 * fournies par le codage » : c'est cette liste, et sa longueur est la réponse
 * à sa question.
 *
 * On écrit UNE égalité par PAIRE de segments d'une même classe. Trois segments
 * égaux donnent trois égalités — AB = CD, AB = EF, CD = EF — et non deux : une
 * information est une comparaison, et l'élève qui les compte doit toutes les
 * voir.
 */
export function egalitesDe(figure) {
    const out = [];
    for (const c of figure.classes) {
        if (c.segments.length < 2) continue;
        for (let i = 0; i < c.segments.length; i++) {
            for (let j = i + 1; j < c.segments.length; j++) {
                out.push([nomSeg(c.segments[i]), nomSeg(c.segments[j])]);
            }
        }
    }
    return out;
}

/** La longueur d'un segment s'écrit sans crochets : AB, et non [AB]. */
export const nomSeg = (s) => `${s.a}${s.b}`;

/** Ces deux segments portent-ils la même marque ? */
export function memeLongueur(figure, u, v) {
    const cu = figure.segments.find(s => memeSeg(s, u));
    const cv = figure.segments.find(s => memeSeg(s, v));
    return !!(cu && cv && cu.carre === cv.carre);
}

const memeSeg = (s, n) => `${s.a}${s.b}` === n || `${s.b}${s.a}` === n;

function ecartAngle(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
}

// ── LE MILIEU, DÉCIDÉ SUR LES COORDONNÉES ───────────────────────────────────
//
// DEUX CONDITIONS, ET TOUTES DEUX EXACTES. X est le milieu de [YZ] s'il est
// SUR le segment et à égale distance de Y et de Z. Les deux se décident en
// entiers : le produit en croix vaut zéro pour l'alignement, les carrés des
// longueurs sont égaux pour l'équidistance. Aucun epsilon, aucune tolérance —
// la même exigence que pour l'appartenance, et pour la même raison : on ne
// marque pas faux un élève qui a bien lu.

/** X est-il ENTRE Y et Z, bornes comprises, et aligné avec eux ? */
export function entre(points, x, y, z) {
    const X = points[x], Y = points[y], Z = points[z];
    if (!X || !Y || !Z) return false;
    const croix = (Z.x - Y.x) * (X.y - Y.y) - (Z.y - Y.y) * (X.x - Y.x);
    if (croix !== 0) return false;
    const scal = (X.x - Y.x) * (Z.x - Y.x) + (X.y - Y.y) * (Z.y - Y.y);
    return scal >= 0 && scal <= carreLongueur(Y, Z);
}

export const carreLongueur = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

/** X est-il le milieu de [YZ] ? Sur le segment, ET à égale distance. */
export function estMilieu(points, x, y, z) {
    if (x === y || x === z || y === z) return false;
    if (!entre(points, x, y, z)) return false;
    return carreLongueur(points[x], points[y]) === carreLongueur(points[x], points[z]);
}
