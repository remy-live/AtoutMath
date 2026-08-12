// 2048 — le jeu des doublements.
//
// On glisse, tout se tasse d'un côté, et deux tuiles égales FUSIONNENT en leur
// somme. C'est un jeu de puissances de deux qui n'a pas besoin qu'on le
// déguise : l'élève y manipule les doublements (2, 4, 8, …, 2048) plus
// intensément que dans n'importe quel exercice, et il ANTICIPE — quelle
// fusion, où, et qu'est-ce qui se libère derrière.
//
// La règle de fusion, exactement celle de l'original :
//   · chaque tuile ne fusionne qu'UNE FOIS par coup ([2,2,4] → [4,4], pas [8]) ;
//   · les fusions se font DU CÔTÉ DU MOUVEMENT ([4,4,4] à gauche → [8,4]) ;
//   · un coup qui ne change rien n'est pas un coup : rien n'apparaît.
//
// Ce module ne connaît pas le DOM. La grille est un tableau de n×n nombres,
// 0 pour vide ; il rend aussi le JOURNAL du coup (déplacements, fusions,
// apparition), c'est lui qui permet d'animer et au robot d'expliquer.

/** Une grille vide de n × n. */
export const grilleVide = (n = 4) => Array.from({ length: n * n }, () => 0);

/**
 * Tasse et fusionne UNE ligne vers la gauche. Renvoie la ligne obtenue, les
 * points gagnés et les fusions ([{valeur, arrivee}]).
 * C'est la seule fonction qui connaisse la règle ; les quatre directions s'y
 * ramènent par lecture de la grille dans le bon ordre.
 */
export function tasserLigne(ligne) {
    const pleines = ligne.filter(v => v !== 0);
    const sortie = [];
    const fusions = [];
    let points = 0;
    for (let i = 0; i < pleines.length; i++) {
        if (i + 1 < pleines.length && pleines[i] === pleines[i + 1]) {
            const double = pleines[i] * 2;
            fusions.push({ valeur: double, arrivee: sortie.length });
            sortie.push(double);
            points += double;
            i++;                       // la tuile absorbée ne resservira pas
        } else {
            sortie.push(pleines[i]);
        }
    }
    while (sortie.length < ligne.length) sortie.push(0);
    return { ligne: sortie, points, fusions };
}

// Les quatre lectures d'une grille : chaque direction devient « tasser chaque
// ligne vers la gauche » dans le bon ordre d'indices.
const LECTURES = {
    gauche: (n, r, i) => r * n + i,
    droite: (n, r, i) => r * n + (n - 1 - i),
    haut: (n, r, i) => i * n + r,
    bas: (n, r, i) => (n - 1 - i) * n + r
};

/**
 * Joue un coup. Renvoie null si RIEN ne bouge (ce n'est pas un coup), sinon
 * { grille, points, fusions, bouge } — sans tuile nouvelle : elle s'ajoute
 * par `apparaitre`, pour que le robot puisse s'arrêter entre les deux.
 */
export function glisser(grille, direction) {
    const n = Math.sqrt(grille.length);
    const lire = LECTURES[direction];
    if (!lire) return null;
    const sortie = grille.slice();
    let bouge = false;
    let points = 0;
    const fusions = [];
    for (let r = 0; r < n; r++) {
        const avant = Array.from({ length: n }, (_, i) => grille[lire(n, r, i)]);
        const res = tasserLigne(avant);
        points += res.points;
        res.fusions.forEach(f => fusions.push({ valeur: f.valeur, case: lire(n, r, f.arrivee) }));
        for (let i = 0; i < n; i++) {
            const idx = lire(n, r, i);
            if (sortie[idx] !== res.ligne[i]) bouge = true;
            sortie[idx] = res.ligne[i];
        }
    }
    return bouge ? { grille: sortie, points, fusions } : null;
}

/** Fait apparaître une tuile (2, parfois 4) sur une case vide. */
export function apparaitre(grille, rng) {
    const vides = grille.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
    if (!vides.length) return { grille, case: -1 };
    const ou = rng.pick(vides);
    const sortie = grille.slice();
    sortie[ou] = rng.bool(0.1) ? 4 : 2;
    return { grille: sortie, case: ou, valeur: sortie[ou] };
}

/** Encore un coup possible ? (case vide, ou deux voisines égales) */
export function peutJouer(grille) {
    const n = Math.sqrt(grille.length);
    for (let i = 0; i < grille.length; i++) {
        if (grille[i] === 0) return true;
        const x = i % n, y = (i - x) / n;
        if (x + 1 < n && grille[i] === grille[i + 1]) return true;
        if (y + 1 < n && grille[i] === grille[i + n]) return true;
    }
    return false;
}

export const plusGrande = (grille) => Math.max(...grille, 0);

/**
 * Le conseil du robot : le coup qui rapporte le plus de points tout de suite,
 * et à défaut celui qui garde le plus de cases vides. Ce n'est pas une IA de
 * compétition — c'est une explication : « à droite, les deux 8 se retrouvent ».
 */
export function conseiller(grille) {
    let meilleur = null;
    for (const dir of ['gauche', 'droite', 'haut', 'bas']) {
        const coup = glisser(grille, dir);
        if (!coup) continue;
        const vides = coup.grille.filter(v => v === 0).length;
        const score = coup.points * 4 + vides;
        if (!meilleur || score > meilleur.score) {
            meilleur = { direction: dir, score, points: coup.points, fusions: coup.fusions };
        }
    }
    return meilleur;
}

const DIRS_FR = { gauche: 'à gauche', droite: 'à droite', haut: 'vers le haut', bas: 'vers le bas' };

/** Ce que le robot dit d'un coup conseillé. */
export function direConseil(conseil) {
    if (!conseil) return 'Plus aucun coup ne change la grille : la partie est finie.';
    const ou = DIRS_FR[conseil.direction];
    if (!conseil.fusions.length) {
        return `Aucune fusion possible pour l'instant : je glisse ${ou} pour regrouper les tuiles et libérer de la place.`;
    }
    const f = conseil.fusions[0];
    return `En glissant ${ou}, deux ${f.valeur / 2} se touchent : ${f.valeur / 2} + ${f.valeur / 2} = ${f.valeur}.`
        + (conseil.fusions.length > 1 ? ` Et ce n'est pas la seule fusion de ce coup !` : '');
}
