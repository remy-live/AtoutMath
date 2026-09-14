// JEZZBALL — le noyau : la grille, les balles, les murs, le territoire.
//
// Le jeu : des balles rebondissent dans un rectangle ; on construit des murs
// qui poussent des deux côtés à la fois ; un mur touché par une balle pendant
// qu'il pousse est perdu (et une vie avec) ; un mur terminé fige ses cases, et
// toute région SANS balle devient du territoire conquis. On gagne à 75 %.
//
// Ce qui en fait un jeu de mathématiques sans le déguiser : le score EST un
// pourcentage d'aire. L'élève passe la partie à lire « 62 % », à estimer ce
// que rapporterait une coupe, à comprendre qu'enfermer la moitié du reste
// rapporte moitié moins à chaque fois. La proportion devient un instrument.
//
// Le noyau ne connaît ni le canvas ni l'horloge : une grille de cellules
// (0 libre, 1 pleine), des balles en coordonnées continues, des murs en
// croissance. Le jeu (games/jezzball.js) ne fait que dessiner et cadencer.

export function creerPartie(cols, lignes, nbBalles, rng) {
    const cellules = new Array(cols * lignes).fill(0);
    const balles = [];
    for (let k = 0; k < nbBalles; k++) {
        const angle = rng.next() * Math.PI * 2;
        balles.push({
            x: 1.5 + rng.next() * (cols - 3),
            y: 1.5 + rng.next() * (lignes - 3),
            vx: Math.cos(angle) * 0.22,
            vy: Math.sin(angle) * 0.22,
            rayon: 0.42
        });
    }
    return { cols, lignes, cellules, balles, murs: [], pleines: 0 };
}

const pleine = (p, x, y) => x < 0 || y < 0 || x >= p.cols || y >= p.lignes
    || p.cellules[y * p.cols + x] === 1;

/** Avance une balle d'un pas, avec rebonds sur les cases pleines et les bords. */
export function avancerBalle(p, b) {
    // Deux axes séparés : c'est ce qui donne les rebonds francs du jeu
    // d'origine, sans jamais traverser un coin.
    let nx = b.x + b.vx;
    if (pleine(p, Math.floor(nx + Math.sign(b.vx) * b.rayon), Math.floor(b.y))) {
        b.vx = -b.vx;
        nx = b.x;
    }
    b.x = nx;
    let ny = b.y + b.vy;
    if (pleine(p, Math.floor(b.x), Math.floor(ny + Math.sign(b.vy) * b.rayon))) {
        b.vy = -b.vy;
        ny = b.y;
    }
    b.y = ny;
}

/**
 * Lance un mur en (x, y) : deux têtes qui poussent en sens opposés.
 * `vertical` dit son orientation. Refusé sur une case pleine.
 */
export function lancerMur(p, x, y, vertical) {
    if (pleine(p, x, y) || p.murs.length) return null;   // un seul mur à la fois
    const mur = { x, y, vertical, a: 0, b: 0, faites: [{ x, y }] };
    p.murs.push(mur);
    return mur;
}

/**
 * Fait pousser le mur d'une case de chaque côté. Renvoie :
 *   'pousse'  il continue ;
 *   'fini'    les deux têtes ont atteint du plein — ses cases se figent.
 */
export function pousserMur(p, mur) {
    const dx = mur.vertical ? 0 : 1, dy = mur.vertical ? 1 : 0;
    let vivant = false;
    for (const [cle, sens] of [['a', -1], ['b', 1]]) {
        if (mur[cle] === null) continue;
        const pas = mur[cle] + 1;
        const x = mur.x + dx * pas * sens, y = mur.y + dy * pas * sens;
        if (pleine(p, x, y)) { mur[cle] = null; continue; }
        mur[cle] = pas;
        mur.faites.push({ x, y });
        vivant = true;
    }
    if (vivant) return 'pousse';
    // Les deux têtes sont arrivées : le mur se fige.
    mur.faites.forEach(c => { p.cellules[c.y * p.cols + c.x] = 1; });
    p.murs = p.murs.filter(m => m !== mur);
    fermerRegions(p);
    p.pleines = p.cellules.filter(v => v === 1).length;
    return 'fini';
}

/** Une balle touche-t-elle le mur en construction ? */
export function murTouche(p, mur) {
    return p.balles.some(b => mur.faites.some(c =>
        Math.abs(b.x - (c.x + 0.5)) < b.rayon + 0.5 && Math.abs(b.y - (c.y + 0.5)) < b.rayon + 0.5));
}

/** Abandonne le mur (touché) : ses cases redeviennent libres. */
export function casserMur(p, mur) {
    p.murs = p.murs.filter(m => m !== mur);
}

/** Remplit toute région que plus aucune balle n'habite. */
export function fermerRegions(p) {
    const marque = new Array(p.cols * p.lignes).fill(false);
    const pile = [];
    for (const b of p.balles) {
        const i = Math.floor(b.y) * p.cols + Math.floor(b.x);
        if (!marque[i] && p.cellules[i] === 0) { marque[i] = true; pile.push(i); }
    }
    while (pile.length) {
        const i = pile.pop();
        const x = i % p.cols, y = (i - x) / p.cols;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            if (nx < 0 || ny < 0 || nx >= p.cols || ny >= p.lignes) continue;
            const j = ny * p.cols + nx;
            if (!marque[j] && p.cellules[j] === 0) { marque[j] = true; pile.push(j); }
        }
    }
    for (let i = 0; i < p.cellules.length; i++) {
        if (p.cellules[i] === 0 && !marque[i]) p.cellules[i] = 1;
    }
}

/** Le pourcentage conquis, entier — c'est LE nombre que le jeu enseigne. */
export const pourcentage = (p) =>
    Math.floor(100 * p.cellules.filter(v => v === 1).length / p.cellules.length);
