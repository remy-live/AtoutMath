// DÉNOMBRER LES SOMMETS, LES ARÊTES ET LES FACES D'UN SOLIDE.
//
// L'exercice a l'air simple et ne l'est pas : sur une PERSPECTIVE CAVALIÈRE,
// une partie du solide est derrière. L'élève qui compte ce qu'il voit trouve
// systématiquement moins d'arêtes qu'il n'y en a, et il ne peut pas s'en
// apercevoir tout seul. C'est pour cela que ce module dessine les arêtes
// cachées EN POINTILLÉS plutôt que de les taire : le pointillé est la seule
// chose qui dise « il y a quelque chose ici que tu ne vois pas ».
//
// TROIS CHOSES ONT COMMANDÉ CE MODULE.
//
//   1. LA PERSPECTIVE EST CELLE DU COURS. Face avant en vraie grandeur,
//      fuyantes à 45°, coefficient de réduction 0,5. C'est la convention
//      française, celle que l'élève trace à la règle sur son cahier.
//   2. CE QUI EST CACHÉ SE CALCULE, IL NE SE DÉCLARE PAS. Écrire à la main
//      quelles arêtes sont derrière, c'est se tromper au premier solide qu'on
//      ajoute. Tous les solides d'ici sont CONVEXES : une face est visible si
//      sa normale sortante regarde vers l'observateur, et une arête est cachée
//      quand ses DEUX faces sont tournées de l'autre côté. C'est exact, et ça
//      vaut pour n'importe quel solide convexe qu'on ajoutera.
//   3. LA RELATION D'EULER SERT DE FILET. S − A + F = 2 sur tout polyèdre
//      convexe : un test la vérifie pour chaque solide du catalogue, et
//      l'élève peut s'en servir pour contrôler son propre décompte.

/** La convention française : fuyantes à 45°, réduites de moitié. */
export const FUYANTE = { angle: 45, k: 0.5 };

// --- Le catalogue -----------------------------------------------------------
//
// Chaque solide donne ses sommets et ses faces (les indices de leurs sommets,
// dans l'ordre du tour). Les arêtes s'en déduisent — les écrire à la main
// serait une deuxième source de vérité, donc une occasion de se contredire.
//
// La FAMILLE et le nombre de côtés de la base servent aux explications : un
// prisme à base n a 2n sommets, 3n arêtes et n + 2 faces, et c'est ce
// raisonnement-là qu'on veut laisser à l'élève, pas un résultat appris.

const polygone = (n, rayon = 1, depart = 0) => Array.from({ length: n }, (_, i) => {
    const a = depart + (i * 2 * Math.PI) / n;
    return [rayon * Math.cos(a), rayon * Math.sin(a)];
});

/** Un prisme droit : deux bases superposées, reliées côté à côté. */
function prisme(base, hauteur) {
    const n = base.length;
    const sommets = [
        ...base.map(([x, y]) => [x, y, 0]),
        ...base.map(([x, y]) => [x, y, hauteur])
    ];
    const faces = [
        base.map((_, i) => i),                                   // le dessous
        base.map((_, i) => n + n - 1 - i),                        // le dessus
        ...base.map((_, i) => {
            const j = (i + 1) % n;
            return [i, j, n + j, n + i];                          // les côtés
        })
    ];
    return { sommets, faces };
}

/** Une pyramide : une base, un sommet au-dessus de son centre. */
function pyramide(base, hauteur) {
    const n = base.length;
    const sommets = [...base.map(([x, y]) => [x, y, 0]), [0, 0, hauteur]];
    const faces = [
        base.map((_, i) => i),
        ...base.map((_, i) => [i, (i + 1) % n, n])
    ];
    return { sommets, faces };
}

export const SOLIDES = [
    {
        id: 'cube', genre: 'm', nom: 'un cube', famille: 'prisme', n: 4, forme: 'carrée',
        ...prisme(polygone(4, Math.SQRT1_2 * 2, Math.PI / 4), 2)
    },
    {
        id: 'pave', genre: 'm', nom: 'un pavé droit', famille: 'prisme', n: 4, forme: 'rectangulaire',
        ...prisme([[-1.4, -0.8], [1.4, -0.8], [1.4, 0.8], [-1.4, 0.8]], 1.7)
    },
    {
        id: 'prisme3', genre: 'm', nom: 'un prisme droit à base triangulaire', famille: 'prisme', n: 3,
        forme: 'triangulaire', ...prisme(polygone(3, 1.25, Math.PI / 2), 2)
    },
    {
        id: 'prisme5', genre: 'm', nom: 'un prisme droit à base pentagonale', famille: 'prisme', n: 5,
        forme: 'pentagonale', ...prisme(polygone(5, 1.15, Math.PI / 2), 1.9)
    },
    {
        id: 'prisme6', genre: 'm', nom: 'un prisme droit à base hexagonale', famille: 'prisme', n: 6,
        forme: 'hexagonale', ...prisme(polygone(6, 1.15), 1.8)
    },
    {
        id: 'tetraedre', genre: 'm', nom: 'un tétraèdre', famille: 'pyramide', n: 3, forme: 'triangulaire',
        ...pyramide(polygone(3, 1.3, Math.PI / 2), 2)
    },
    {
        id: 'pyramide4', genre: 'f', nom: 'une pyramide à base carrée', famille: 'pyramide', n: 4,
        forme: 'carrée', ...pyramide(polygone(4, 1.35, Math.PI / 4), 2.1)
    },
    {
        id: 'pyramide5', genre: 'f', nom: 'une pyramide à base pentagonale', famille: 'pyramide', n: 5,
        forme: 'pentagonale', ...pyramide(polygone(5, 1.25, Math.PI / 2), 2.1)
    },
    {
        id: 'pyramide6', genre: 'f', nom: 'une pyramide à base hexagonale', famille: 'pyramide', n: 6,
        forme: 'hexagonale', ...pyramide(polygone(6, 1.2), 2)
    },
    {
        // L'octaèdre casse la routine « base + côtés » : ici il faut vraiment
        // regarder le dessin, et la relation d'Euler devient un vrai secours.
        id: 'octaedre', genre: 'm', nom: 'un octaèdre', famille: 'autre', n: 0, forme: '',
        sommets: [[1.3, 0, 0], [0, 1.3, 0], [-1.3, 0, 0], [0, -1.3, 0], [0, 0, 1.5], [0, 0, -1.5]],
        faces: [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4],
            [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]]
    }
];

/** Les arêtes, déduites des faces : chaque paire de sommets voisins, une fois. */
export function aretesDe(faces) {
    const vues = new Map();
    faces.forEach(f => f.forEach((s, i) => {
        const t = f[(i + 1) % f.length];
        const clef = s < t ? `${s}-${t}` : `${t}-${s}`;
        if (!vues.has(clef)) vues.set(clef, [Math.min(s, t), Math.max(s, t)]);
    }));
    return [...vues.values()];
}

/** Le solide complet, arêtes comprises. */
export function construire(id) {
    const modele = SOLIDES.find(s => s.id === id) || SOLIDES[0];
    return { ...modele, aretes: aretesDe(modele.faces) };
}

// --- La perspective cavalière ------------------------------------------------

/**
 * (x, y, z) → (X, Y) à l'écran. La face avant — le plan (x, z) — est en vraie
 * grandeur ; la profondeur y file vers le haut à droite, réduite de moitié.
 * L'écran ayant son Y vers le bas, la hauteur z s'y écrit en négatif.
 */
export function projeter([x, y, z], { angle = FUYANTE.angle, k = FUYANTE.k } = {}) {
    const a = (angle * Math.PI) / 180;
    return [x + k * y * Math.cos(a), -z - k * y * Math.sin(a)];
}

/**
 * La DIRECTION DU REGARD, déduite de la projection elle-même : c'est le seul
 * vecteur que la projection écrase en un point. Le recalculer à partir de
 * l'angle et du coefficient évite qu'il se désaccorde du dessin le jour où
 * l'on change la fuyante.
 */
export function regard({ angle = FUYANTE.angle, k = FUYANTE.k } = {}) {
    const a = (angle * Math.PI) / 180;
    // Le seul vecteur que la projection écrase : celui qui annule à la fois
    // X = x + k·y·cos a et Y = −z − k·y·sin a. On regarde donc le solide d'un
    // peu au-dessus et un peu à gauche — le dessus du cube se voit, son
    // dessous non.
    return [-k * Math.cos(a), 1, -k * Math.sin(a)];
}

const moins = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const croix = (u, v) => [
    u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]
];
const scalaire = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/** Le centre d'un nuage de points. */
export function centre(points) {
    const s = points.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    return s.map(v => v / points.length);
}

/**
 * La normale SORTANTE d'une face. On ne se fie pas au sens dans lequel la face
 * a été écrite : on la retourne au besoin pour qu'elle s'éloigne du centre du
 * solide. Une face décrite à l'envers passait sinon pour cachée, et l'erreur
 * ne se voyait que sur le dessin.
 */
export function normaleSortante(solide, face) {
    const p = face.map(i => solide.sommets[i]);
    const n = croix(moins(p[1], p[0]), moins(p[2], p[0]));
    const c = centre(solide.sommets);
    return scalaire(n, moins(centre(p), c)) < 0 ? n.map(v => -v) : n;
}

/** Quelles faces regardent l'observateur ? (Vrai pour un solide CONVEXE.) */
export function facesVisibles(solide, opts) {
    const d = regard(opts);
    return solide.faces.map(f => scalaire(normaleSortante(solide, f), d) < 0);
}

/**
 * Quelles arêtes sont cachées ? Celles dont les DEUX faces sont tournées de
 * l'autre côté : personne ne les voit, elles se dessinent en pointillés.
 */
export function aretesCachees(solide, opts) {
    const vues = facesVisibles(solide, opts);
    const aretes = solide.aretes || aretesDe(solide.faces);
    return aretes.map(([a, b]) => {
        const touche = solide.faces
            .map((f, i) => ({ f, i }))
            .filter(({ f }) => f.includes(a) && f.includes(b)
                && f.some((s, k) => (s === a && f[(k + 1) % f.length] === b)
                    || (s === b && f[(k + 1) % f.length] === a)));
        return touche.length > 0 && touche.every(({ i }) => !vues[i]);
    });
}

/** Un sommet est caché quand toutes les faces qui s'y rejoignent le sont. */
export function sommetsCaches(solide, opts) {
    const vues = facesVisibles(solide, opts);
    return solide.sommets.map((_, s) =>
        solide.faces.every((f, i) => !f.includes(s) || !vues[i]));
}

/**
 * Le dessin : les sommets projetés, recadrés dans une boîte de `cote`, plus le
 * centre de chaque face — c'est là qu'on pose la pastille sur laquelle on
 * clique pour compter une face, y compris une face de derrière.
 */
export function dessiner(solide, cote = 100, marge = 12, opts) {
    const bruts = solide.sommets.map(p => projeter(p, opts));
    const xs = bruts.map(p => p[0]), ys = bruts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const utile = cote - 2 * marge;
    const echelle = Math.min(utile / (maxX - minX || 1), utile / (maxY - minY || 1));
    const dx = marge + (utile - (maxX - minX) * echelle) / 2;
    const dy = marge + (utile - (maxY - minY) * echelle) / 2;
    const points = bruts.map(([x, y]) => [
        dx + (x - minX) * echelle, dy + (y - minY) * echelle
    ]);
    const centres = solide.faces.map(f => {
        const p = f.map(i => points[i]);
        return [p.reduce((s, q) => s + q[0], 0) / p.length,
            p.reduce((s, q) => s + q[1], 0) / p.length];
    });
    return { points, centres, echelle };
}

// --- Ce qu'on demande, et ce qu'on répond ------------------------------------

export const ASPECTS = [
    { id: 'sommets', label: 'sommets', singulier: 'sommet', genre: 'm' },
    { id: 'aretes', label: 'arêtes', singulier: 'arête', genre: 'f' },
    { id: 'faces', label: 'faces', singulier: 'face', genre: 'f' }
];

/**
 * « 3 arêtes marquées », « 1 arête marquée », « 0 arête marquée ». Le français
 * n'est pas un détail dans un exercice de mathématiques : un accord fautif
 * affiché en permanence sous les yeux d'un élève finit par s'apprendre.
 */
export function accorder(n, aspect, participe = 'marqué') {
    const a = ASPECTS.find(x => x.id === aspect);
    const pluriel = n > 1;
    return `${n} ${pluriel ? a.label : a.singulier} `
        + `${participe}${a.genre === 'f' ? 'e' : ''}${pluriel ? 's' : ''}`;
}

/** « de sommets », mais « d'arêtes » : la voyelle mange la voyelle. */
export const elider = (mot) => (/^[aeiouâàéèêîôùûyh]/i.test(mot) ? `d'${mot}` : `de ${mot}`);

/** Combien le solide en a-t-il ? */
export function compter(solide, aspect) {
    if (aspect === 'sommets') return solide.sommets.length;
    if (aspect === 'faces') return solide.faces.length;
    return (solide.aretes || aretesDe(solide.faces)).length;
}

/** S − A + F : deux sur tout polyèdre convexe. C'est le filet de l'élève. */
export function euler(solide) {
    const S = compter(solide, 'sommets');
    const A = compter(solide, 'aretes');
    const F = compter(solide, 'faces');
    return { S, A, F, valeur: S - A + F, verifie: S - A + F === 2 };
}

/**
 * LE RAISONNEMENT, pas le résultat.
 *
 * « Une pyramide à base carrée a 8 arêtes » ne s'apprend pas : ça se retient
 * mal et ça ne resservira pas au pentagone. « Les 4 côtés de la base, plus les
 * 4 arêtes qui montent au sommet » se retrouve à chaque fois, sur n'importe
 * quelle base. C'est cette phrase-là qu'on rend.
 */
export function expliquer(solide, aspect) {
    const n = solide.n;
    const e = euler(solide);
    const filet = `On peut vérifier : sommets − arêtes + faces = ${e.S} − ${e.A} + ${e.F} = 2, `
        + 'et cela vaut pour tous les solides de ce genre.';

    if (solide.famille === 'prisme') {
        if (aspect === 'sommets') {
            return `Un prisme a DEUX bases identiques. La base a ${n} sommets, `
                + `donc le solide en a ${n} en bas et ${n} en haut : 2 × ${n} = ${e.S}. ${filet}`;
        }
        if (aspect === 'aretes') {
            return `Trois paquets d'arêtes : les ${n} côtés de la base du bas, les ${n} côtés `
                + `de celle du haut, et les ${n} arêtes verticales qui les relient. `
                + `3 × ${n} = ${e.A}. ${filet}`;
        }
        return `Les deux bases, plus une face par côté de la base : ${n} faces latérales `
            + `+ 2 bases = ${e.F}. ${filet}`;
    }

    if (solide.famille === 'pyramide') {
        if (aspect === 'sommets') {
            return `Les ${n} sommets de la base, plus LE sommet de la pyramide, tout en haut : `
                + `${n} + 1 = ${e.S}. ${filet}`;
        }
        if (aspect === 'aretes') {
            return `Les ${n} côtés de la base, plus les ${n} arêtes qui montent vers le sommet : `
                + `2 × ${n} = ${e.A}. ${filet}`;
        }
        return `La base, plus un triangle par côté de la base : ${n} + 1 = ${e.F}. ${filet}`;
    }

    // L'octaèdre : deux pyramides à base carrée collées par leur base.
    if (aspect === 'sommets') {
        return `Un octaèdre, ce sont deux pyramides à base carrée collées base contre base. `
            + `Les 4 sommets du carré du milieu, plus la pointe du haut et celle du bas : ${e.S}. ${filet}`;
    }
    if (aspect === 'aretes') {
        return `Les 4 côtés du carré du milieu, puis 4 arêtes qui montent vers la pointe du `
            + `haut et 4 qui descendent vers celle du bas : 4 + 4 + 4 = ${e.A}. ${filet}`;
    }
    return `Chaque pyramide apporte 4 faces triangulaires, et le carré du milieu n'est pas une `
        + `face : il est à l'intérieur. 4 + 4 = ${e.F}. ${filet}`;
}

/** Ce que le robot dit quand il montre comment on compte. */
export function direMethode(solide, aspect) {
    const quoi = ASPECTS.find(a => a.id === aspect).label;
    return `Je compte les ${quoi} en les touchant une par une : la marque reste, `
        + 'donc je ne compte jamais deux fois la même — et surtout je n\'en oublie pas. '
        + 'Les traits en POINTILLÉS sont les arêtes de derrière : elles existent, '
        + 'même si on ne les voit pas.';
}

// --- Le tirage ---------------------------------------------------------------

/** Les solides qu'un réglage autorise, du plus simple au moins courant. */
export function famillesDe(niveau = 'tous') {
    if (niveau === 'facile') return ['cube', 'pave', 'prisme3', 'pyramide4', 'tetraedre'];
    if (niveau === 'moyen') {
        return ['cube', 'pave', 'prisme3', 'prisme5', 'pyramide4', 'pyramide5', 'tetraedre'];
    }
    return SOLIDES.map(s => s.id);
}

/**
 * Une question : un solide, et UNE chose à compter. On ne demande pas les
 * trois d'un coup — l'élève qui se trompe saurait alors seulement qu'il s'est
 * trompé quelque part, et la correction ne pourrait plus rien montrer.
 */
export function tirerQuestion(rng, { niveau = 'tous', aspect = 'tous', eviter = null } = {}) {
    const choix = famillesDe(niveau).filter(id => id !== eviter);
    const id = rng.pick(choix.length ? choix : famillesDe(niveau));
    const solide = construire(id);
    const quoi = aspect === 'tous' ? rng.pick(ASPECTS.map(a => a.id)) : aspect;
    return {
        solide, aspect: quoi,
        reponse: compter(solide, quoi),
        question: `Combien ${solide.nom} a-t-${solide.genre === 'f' ? 'elle' : 'il'} `
            + `${elider(ASPECTS.find(a => a.id === quoi).label)} ?`,
        explication: expliquer(solide, quoi)
    };
}
