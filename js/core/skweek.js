// SKWEEK — repeindre le sol, mais seulement les bonnes dalles.
//
// Le jeu de Loriciels : une petite bête rose court sur un sol de dalles
// bleues et les repeint en marchant dessus ; le niveau est fini quand tout est
// rose. Ici, CHAQUE DALLE PORTE UN CALCUL, et le niveau annonce sa règle :
// « repeins les multiples de 3 », « repeins les résultats plus grands que 30 ».
//
//   · Une dalle qui vérifie la règle se repeint quand on marche dessus.
//   · Une dalle qui ne la vérifie PAS s'effrite : elle devient un trou, on
//     perd du terrain — c'est la dalle piégée de l'original, devenue une
//     erreur de calcul.
//
// L'élève ne calcule donc pas « à la demande » : il TRIE en se déplaçant, et
// il doit lire son chemin avant de s'y engager. Soixante dalles par niveau,
// c'est soixante calculs — sans une seule question posée.
//
// L'EXIGENCE DE FABRICATION, celle qui rend le jeu jouable : les dalles à
// repeindre forment TOUJOURS une région d'un seul tenant contenant le départ.
// On n'a donc jamais besoin de traverser une mauvaise dalle pour finir, et un
// élève prudent peut gagner sans jamais perdre une dalle.
//
// Ce module ne connaît ni le DOM ni le canvas : la grille, la règle, les
// déplacements, les ennemis, la victoire.

export const TROU = 0;      // pas de dalle : on n'y va pas
export const BLEUE = 1;     // à repeindre… si elle vérifie la règle
export const ROSE = 2;      // repeinte
export const CASSEE = 3;    // effritée par une erreur : devenue un trou

/** Les règles de tri, une par niveau. Chacune sait dire ce qu'elle demande. */
export const REGLES = [
    { id: 'pairs', consigne: 'les résultats PAIRS', test: (v) => v % 2 === 0 },
    { id: 'impairs', consigne: 'les résultats IMPAIRS', test: (v) => v % 2 === 1 },
    { id: 'mult3', consigne: 'les multiples de 3', test: (v) => v % 3 === 0 },
    { id: 'mult5', consigne: 'les multiples de 5', test: (v) => v % 5 === 0 },
    { id: 'mult4', consigne: 'les multiples de 4', test: (v) => v % 4 === 0 },
    { id: 'grands', consigne: 'les résultats plus grands que 30', test: (v) => v > 30 },
    { id: 'petits', consigne: 'les résultats plus petits que 20', test: (v) => v < 20 },
    { id: 'dizaine', consigne: 'les résultats entre 20 et 40', test: (v) => v >= 20 && v <= 40 }
];

export const regleDe = (id) => REGLES.find(r => r.id === id) || REGLES[0];

/** Les niveaux : la grille grandit, les ennemis arrivent, la règle change. */
export const NIVEAUX = [
    { id: 1, cols: 11, lignes: 8, regle: 'pairs', ennemis: 0, secondes: 90 },
    { id: 2, cols: 13, lignes: 9, regle: 'mult3', ennemis: 1, secondes: 90 },
    { id: 3, cols: 15, lignes: 10, regle: 'mult5', ennemis: 1, secondes: 100 },
    { id: 4, cols: 15, lignes: 11, regle: 'grands', ennemis: 2, secondes: 110 },
    { id: 5, cols: 17, lignes: 12, regle: 'mult4', ennemis: 2, secondes: 120 },
    { id: 6, cols: 19, lignes: 13, regle: 'dizaine', ennemis: 3, secondes: 130 }
];

export const niveauDe = (n) => NIVEAUX.find(x => x.id === Number(n)) || NIVEAUX[0];

/**
 * Une écriture calculée qui vaut exactement `v`.
 * On varie les opérations pour que le sol ne soit pas une table de
 * multiplication déguisée — mais on reste dans ce qui se calcule de tête en
 * marchant : c'est un jeu d'arcade, pas une interrogation.
 */
export function calculPour(v, rng) {
    const choix = [];
    // Un produit, quand v se factorise dans les tables.
    for (let a = 2; a <= 10; a++) {
        if (v % a === 0 && v / a >= 2 && v / a <= 10) choix.push(`${a} × ${v / a}`);
    }
    // Une somme et une différence, toujours possibles.
    if (v >= 2) {
        const a = rng.int(1, Math.max(1, v - 1));
        choix.push(`${a} + ${v - a}`);
    }
    const b = rng.int(1, 20);
    choix.push(`${v + b} − ${b}`);
    return rng.pick(choix);
}

/**
 * Fabrique un niveau.
 *
 * La région à repeindre est CULTIVÉE depuis le départ, case voisine par case
 * voisine : elle est donc connexe par construction, et c'est cette propriété
 * qui garantit qu'on peut finir sans marcher sur une seule mauvaise dalle.
 */
export function genererNiveau(params, rng) {
    const niv = niveauDe(params && params.niveau);
    const regle = regleDe(niv.regle);
    const { cols, lignes } = niv;
    const total = cols * lignes;
    const idx = (x, y) => y * cols + x;

    // 1. La région à repeindre : une culture depuis le centre.
    const depart = { x: Math.floor(cols / 2), y: Math.floor(lignes / 2) };
    const aPeindre = new Set([idx(depart.x, depart.y)]);
    const front = [depart];
    const voulu = Math.round(total * 0.5);
    while (aPeindre.size < voulu && front.length) {
        const p = front[rng.int(0, front.length - 1)];
        const dirs = rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        let pousse = false;
        for (const [dx, dy] of dirs) {
            const nx = p.x + dx, ny = p.y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= lignes) continue;
            if (aPeindre.has(idx(nx, ny))) continue;
            aPeindre.add(idx(nx, ny));
            front.push({ x: nx, y: ny });
            pousse = true;
            break;
        }
        if (!pousse) front.splice(front.indexOf(p), 1);
    }

    // 2. Le reste : des dalles PIÉGÉES (qui ne vérifient pas la règle) et
    //    quelques trous, pour que le terrain ait une forme.
    const cases = [];
    for (let i = 0; i < total; i++) {
        const bonne = aPeindre.has(i);
        if (!bonne && rng.bool(0.25)) { cases.push({ etat: TROU, valeur: null, calcul: '' }); continue; }
        // Une valeur qui vérifie la règle (dalle à peindre) ou non (piège).
        let v = 0, essais = 0;
        do { v = rng.int(2, 60); essais++; } while (regle.test(v) !== bonne && essais < 200);
        cases.push({ etat: BLEUE, valeur: v, calcul: calculPour(v, rng), bonne });
    }

    // 3. Les ennemis, loin du départ, sur des dalles praticables.
    const libres = cases.map((c, i) => c.etat !== TROU && i !== idx(depart.x, depart.y) ? i : -1)
        .filter(i => i >= 0)
        .filter(i => Math.abs((i % cols) - depart.x) + Math.abs(Math.floor(i / cols) - depart.y) > 4);
    const ennemis = rng.shuffle(libres).slice(0, niv.ennemis).map(i => ({
        x: i % cols, y: Math.floor(i / cols),
        dx: rng.pick([1, -1, 0]), dy: rng.pick([1, -1, 0])
    }));
    ennemis.forEach(e => { if (!e.dx && !e.dy) e.dx = 1; });

    // SKWEEK SE TIENT DÉJÀ SUR SA DALLE : elle est peinte au départ. Sans
    // cela, la case sous ses pieds resterait bleue jusqu'à ce qu'il en sorte
    // et y revienne — un détail, mais l'élève le voit.
    const sousLuiIdx = idx(depart.x, depart.y);
    const sousLui = cases[sousLuiIdx];
    const aRepeindre = cases.filter(c => c.bonne).length;
    let repeintes = 0;
    if (sousLui.bonne) { sousLui.etat = ROSE; repeintes = 1; }

    return {
        niveau: niv.id, cols, lignes, cases, regle,
        joueur: { ...depart, dir: 'droite' },
        ennemis, tirs: [],
        secondes: niv.secondes,
        aRepeindre, repeintes
    };
}

const dansLaGrille = (e, x, y) => x >= 0 && y >= 0 && x < e.cols && y < e.lignes;
export const caseDe = (e, x, y) => dansLaGrille(e, x, y) ? e.cases[y * e.cols + x] : null;

/** On peut marcher là où il y a une dalle — peinte ou non. */
export const praticable = (e, x, y) => {
    const c = caseDe(e, x, y);
    return !!c && c.etat !== TROU && c.etat !== CASSEE;
};

const DIRS = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] };

/**
 * Déplace Skweek d'une case. Renvoie ce qui s'est passé — c'est ce compte
 * rendu qui fait l'affichage, le son et la note de l'élève.
 * @returns {{bouge:boolean, peint?:boolean, casse?:boolean, case?:Object, gagne?:boolean}}
 */
export function deplacer(etat, direction) {
    const d = DIRS[direction];
    if (!d) return { bouge: false };
    etat.joueur.dir = direction;
    const nx = etat.joueur.x + d[0], ny = etat.joueur.y + d[1];
    if (!praticable(etat, nx, ny)) return { bouge: false, mur: true };
    etat.joueur.x = nx; etat.joueur.y = ny;
    const c = caseDe(etat, nx, ny);
    if (c.etat === ROSE) return { bouge: true, case: c };
    if (c.bonne) {
        c.etat = ROSE;
        etat.repeintes++;
        return { bouge: true, peint: true, case: c, gagne: etat.repeintes >= etat.aRepeindre };
    }
    // LA MAUVAISE DALLE S'EFFRITE : on perd du terrain, et Skweek recule sur
    // la case d'où il vient — il ne tombe pas dans le trou qu'il vient de faire.
    c.etat = CASSEE;
    etat.joueur.x -= d[0]; etat.joueur.y -= d[1];
    return { bouge: false, casse: true, case: c };
}

/** Un pas des ennemis : ils rebondissent sur les trous et les bords. */
export function avancerEnnemis(etat, rng) {
    for (const e of etat.ennemis) {
        if (praticable(etat, e.x + e.dx, e.y + e.dy)) {
            e.x += e.dx; e.y += e.dy;
            // Un virage de temps en temps : sans lui, ils font la navette.
            if (rng.bool(0.12)) {
                const dirs = rng.shuffle(Object.values(DIRS))
                    .filter(([dx, dy]) => praticable(etat, e.x + dx, e.y + dy));
                if (dirs.length) { e.dx = dirs[0][0]; e.dy = dirs[0][1]; }
            }
        } else {
            const dirs = rng.shuffle(Object.values(DIRS))
                .filter(([dx, dy]) => praticable(etat, e.x + dx, e.y + dy));
            if (dirs.length) { e.dx = dirs[0][0]; e.dy = dirs[0][1]; }
            else { e.dx = -e.dx; e.dy = -e.dy; }
        }
    }
}

/** Un ennemi est-il sur Skweek ? */
export const toucheJoueur = (etat) =>
    etat.ennemis.some(e => e.x === etat.joueur.x && e.y === etat.joueur.y);

/** Skweek tire dans la direction où il regarde. */
export function tirer(etat) {
    const d = DIRS[etat.joueur.dir];
    etat.tirs.push({ x: etat.joueur.x, y: etat.joueur.y, dx: d[0], dy: d[1] });
}

/** Un pas des projectiles ; renvoie le nombre d'ennemis touchés. */
export function avancerTirs(etat) {
    let touches = 0;
    for (const t of [...etat.tirs]) {
        t.x += t.dx; t.y += t.dy;
        // Il file au-dessus des trous mais s'arrête au bord.
        if (!dansLaGrille(etat, t.x, t.y)) { etat.tirs = etat.tirs.filter(x => x !== t); continue; }
        const pris = etat.ennemis.filter(e => e.x === t.x && e.y === t.y);
        if (pris.length) {
            etat.ennemis = etat.ennemis.filter(e => !pris.includes(e));
            etat.tirs = etat.tirs.filter(x => x !== t);
            touches += pris.length;
        }
    }
    return touches;
}

/** Le pourcentage repeint — c'est la jauge du joueur. */
export const avancement = (etat) =>
    etat.aRepeindre ? Math.floor(100 * etat.repeintes / etat.aRepeindre) : 100;

/**
 * Les dalles à repeindre encore accessibles depuis Skweek, sans traverser une
 * mauvaise dalle. Sert à l'aide (« va par là ») et à vérifier que le niveau
 * reste gagnable après des erreurs.
 */
export function accessibles(etat) {
    const vus = new Set();
    const pile = [[etat.joueur.x, etat.joueur.y]];
    vus.add(etat.joueur.y * etat.cols + etat.joueur.x);
    const out = [];
    while (pile.length) {
        const [x, y] = pile.pop();
        for (const [dx, dy] of Object.values(DIRS)) {
            const nx = x + dx, ny = y + dy;
            const k = ny * etat.cols + nx;
            if (!praticable(etat, nx, ny) || vus.has(k)) continue;
            const c = caseDe(etat, nx, ny);
            // On ne PASSE que par ce qui est sûr : dalle bonne ou déjà peinte.
            if (!c.bonne && c.etat !== ROSE) continue;
            vus.add(k);
            pile.push([nx, ny]);
            if (c.bonne && c.etat !== ROSE) out.push({ x: nx, y: ny, case: c });
        }
    }
    return out;
}
