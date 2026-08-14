// RELIER LES POINTS — des paires à joindre, et toute la grille à remplir.
//
// Deux points de même marque, un chemin de l'un à l'autre, et la règle qui
// fait tout le jeu : LES CHEMINS NE SE CROISENT PAS et, à la fin, PLUS UNE
// SEULE CASE N'EST VIDE. La seconde moitié de la règle est celle qu'on oublie,
// et c'est elle qui rend le jeu intéressant : relier deux points est facile,
// les relier de façon que tous les autres puissent encore passer ne l'est pas.
//
// TROIS CHOSES ONT COMMANDÉ CE MODULE.
//
//   1. UNE GRILLE PROPOSÉE EST UNE GRILLE RÉSOLUBLE. On ne pose pas des points
//      au hasard en espérant que ça tombe juste : on trace d'abord un chemin
//      qui passe UNE fois par chaque case — un chemin hamiltonien — puis on le
//      COUPE en morceaux. Chaque morceau devient une paire, et la réunion des
//      morceaux remplit la grille par construction. La solution existe donc
//      avant l'énoncé, et l'élève ne peut pas tomber sur une grille impossible.
//   2. LE HASARD PASSE PAR LE MORDILLEMENT. Un chemin hamiltonien régulier —
//      le serpentin — donnerait toujours la même grille. On le brasse par des
//      « backbites » : on prend un bout, on le raccroche à un voisin, ce qui
//      retourne une partie du chemin sans jamais cesser de couvrir la grille.
//      Quelques centaines de ces morsures suffisent à rendre le tracé
//      méconnaissable, et la grille reste résoluble à chaque instant.
//   3. LA COULEUR N'EST JAMAIS SEULE. Une paire porte une couleur ET un
//      symbole. Sur un polycopié en noir et blanc, sur une photocopie, ou pour
//      un élève qui distingue mal le rouge du vert, le symbole reste lisible —
//      et l'exercice ne se joue pas à qui a la meilleure imprimante.

/**
 * Les couleurs. Elles viennent de la palette catégorielle usuelle : ce sont
 * celles qui restent distinctes les unes des autres, y compris en luminosité —
 * ce qui les rend encore séparables une fois photocopiées en gris.
 */
export const COULEURS = [
    '#d62728', '#1f77b4', '#2ca02c', '#ff7f0e',
    '#9467bd', '#17a2b8', '#8c564b', '#e377c2'
];

/**
 * Les symboles. Des formes PLEINES, franches, qui tiennent dans un rond de
 * quelques millimètres à l'impression — pas des caractères fins qui
 * disparaissent au photocopieur.
 */
export const SYMBOLES = ['●', '■', '▲', '◆', '★', '✚', '♥', '⬢'];

export const MAX_PAIRES = COULEURS.length;

/**
 * LES MARQUES SE DESSINENT, ELLES NE S'ÉCRIVENT PAS.
 *
 * « ● ■ ▲ ◆ ★ » posés comme du texte ne s'alignent jamais : chaque glyphe a
 * son propre centre optique, ses propres approches, et sa propre hauteur dans
 * le cadratin. Le disque paraît trop haut, le triangle trop bas, l'étoile
 * décalée à droite — et aucun réglage de police ne rattrape cela, puisque
 * c'est la police qui décide.
 *
 * Une forme TRACÉE, elle, est centrée sur le point qu'on lui donne. C'est déjà
 * ce que fait le PDF (les polices standard n'ont pas ces caractères) : l'écran
 * et le papier dessinent maintenant la même chose, de la même façon.
 *
 * @returns {string} le contenu SVG de la marque, centré sur (cx, cy).
 */
export function marqueSvg(index, cx, cy, r, { fond = 'currentColor', trait = 'none', ep = 0 } = {}) {
    const style = `fill="${fond}" stroke="${trait}" stroke-width="${ep}" stroke-linecap="round"`;
    const pts = (liste) => liste.map(([x, y]) => `${cx + x * r},${cy + y * r}`).join(' ');
    switch (index % 8) {
    case 0:   // le disque
        return `<circle cx="${cx}" cy="${cy}" r="${r * 0.92}" ${style}/>`;
    case 1:   // le carré
        return `<rect x="${cx - r * 0.82}" y="${cy - r * 0.82}" width="${r * 1.64}"
            height="${r * 1.64}" rx="${r * 0.12}" ${style}/>`;
    case 2:   // le triangle, posé sur sa base et centré sur son CENTRE DE
        //     GRAVITÉ, pas sur le milieu de sa boîte : sinon il paraît haut.
        return `<polygon points="${pts([[0, -1.05], [0.95, 0.62], [-0.95, 0.62]])}" ${style}/>`;
    case 3:   // le losange
        return `<polygon points="${pts([[0, -1.05], [1.05, 0], [0, 1.05], [-1.05, 0]])}" ${style}/>`;
    case 4:   // la croix droite
        return `<path d="M${cx - r} ${cy} H${cx + r} M${cx} ${cy - r} V${cy + r}"
            fill="none" stroke="${fond}" stroke-width="${r * 0.62}" stroke-linecap="round"/>`;
    case 5:   // la croix oblique
        return `<path d="M${cx - r * 0.8} ${cy - r * 0.8} L${cx + r * 0.8} ${cy + r * 0.8}
            M${cx - r * 0.8} ${cy + r * 0.8} L${cx + r * 0.8} ${cy - r * 0.8}"
            fill="none" stroke="${fond}" stroke-width="${r * 0.62}" stroke-linecap="round"/>`;
    case 6:   // l'anneau
        return `<circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="none"
            stroke="${fond}" stroke-width="${r * 0.5}"/>`;
    default:  // l'hexagone
        return `<polygon points="${pts([[0.55, -0.95], [1.05, 0], [0.55, 0.95],
            [-0.55, 0.95], [-1.05, 0], [-0.55, -0.95]])}" ${style}/>`;
    }
}

export const clef = (x, y) => `${x},${y}`;
export const voisines = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
export const dedans = ([x, y], l, h) => x >= 0 && y >= 0 && x < l && y < h;
export const memeCase = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
export const adjacentes = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/** Le serpentin : un chemin qui passe une fois par chaque case, sans surprise. */
export function serpentin(l, h) {
    const chemin = [];
    for (let y = 0; y < h; y++) {
        for (let i = 0; i < l; i++) chemin.push([y % 2 ? l - 1 - i : i, y]);
    }
    return chemin;
}

/**
 * LE MORDILLEMENT (backbite). On prend une extrémité du chemin, on choisit une
 * case voisine dans la grille, et l'on raccroche l'extrémité à cette case : la
 * portion coupée se retourne. Le chemin couvre toujours toutes les cases —
 * seul son ordre change. C'est la façon la plus simple de tirer un chemin
 * hamiltonien vraiment quelconque sur un rectangle.
 */
export function mordre(chemin, l, h, rng) {
    const parQuelBout = rng.int(0, 1) === 1;
    const p = parQuelBout ? chemin.slice().reverse() : chemin.slice();
    const tete = p[0];
    const candidates = voisines(tete).filter(v => dedans(v, l, h) && !memeCase(v, p[1]));
    if (!candidates.length) return chemin;
    const cible = candidates[rng.int(0, candidates.length - 1)];
    const j = p.findIndex(c => memeCase(c, cible));
    if (j < 2) return chemin;
    // On retourne le début jusqu'à la case visée : la nouvelle tête est la
    // case qui la précédait, et le chemin reste continu.
    const debut = p.slice(0, j).reverse();
    const suite = p.slice(j);
    const neuf = debut.concat(suite);
    return parQuelBout ? neuf.reverse() : neuf;
}

/** Un chemin hamiltonien quelconque : le serpentin, longuement mordillé. */
export function cheminHamiltonien(l, h, rng, morsures = 0) {
    let chemin = serpentin(l, h);
    const n = morsures || l * h * 12;
    for (let k = 0; k < n; k++) chemin = mordre(chemin, l, h, rng);
    return chemin;
}

/**
 * Coupe le chemin en `k` morceaux, chacun d'au moins `minLong` cases.
 *
 * Deux refus, et ce sont eux qui font la qualité de la grille :
 *   · un morceau trop court ne demande aucun travail ;
 *   · un morceau dont les deux bouts se touchent déjà dans la grille se relie
 *     d'un trait droit — l'élève le fait sans réfléchir, et la grille perd sa
 *     seule solution complète.
 */
export function couper(chemin, k, rng, minLong = 3) {
    if (k < 1 || chemin.length < k * minLong) return null;
    for (let essai = 0; essai < 60; essai++) {
        const coupes = new Set();
        while (coupes.size < k - 1) coupes.add(rng.int(1, chemin.length - 1));
        const bornes = [0, ...[...coupes].sort((a, b) => a - b), chemin.length];
        const morceaux = [];
        for (let i = 0; i < bornes.length - 1; i++) {
            morceaux.push(chemin.slice(bornes[i], bornes[i + 1]));
        }
        const bon = morceaux.every(m => m.length >= minLong
            && !adjacentes(m[0], m[m.length - 1]));
        if (bon) return morceaux;
    }
    return null;
}

/**
 * Une grille jouable : des paires, et la solution qui les accompagne.
 * @returns {{l, h, paires: Array<{id, a, b, couleur, symbole, solution}>}}
 */
export function genererGrille({ l = 6, h = 6, paires = 4, rng, minLong = 3 }) {
    const k = Math.max(2, Math.min(paires, MAX_PAIRES));
    for (let essai = 0; essai < 40; essai++) {
        const chemin = cheminHamiltonien(l, h, rng);
        const morceaux = couper(chemin, k, rng, minLong);
        if (!morceaux) continue;
        return {
            l, h,
            paires: morceaux.map((m, i) => ({
                id: i, a: m[0], b: m[m.length - 1],
                couleur: COULEURS[i % COULEURS.length],
                symbole: SYMBOLES[i % SYMBOLES.length],
                solution: m
            }))
        };
    }
    return null;
}

/** Toutes les extrémités, par case : c'est ce qu'on dessine sur la grille. */
export function bornes(grille) {
    const m = new Map();
    grille.paires.forEach(p => {
        m.set(clef(...p.a), { id: p.id, bout: 'a' });
        m.set(clef(...p.b), { id: p.id, bout: 'b' });
    });
    return m;
}

// --- Ce que trace l'élève ---------------------------------------------------

/** Rien n'est tracé : chaque paire a son chemin, vide au départ. */
export const traceVide = (grille) => ({ traces: grille.paires.map(() => []) });

/** Quelle paire occupe cette case, ou −1. */
export function occupant(etat, x, y) {
    for (let i = 0; i < etat.traces.length; i++) {
        if (etat.traces[i].some(c => c[0] === x && c[1] === y)) return i;
    }
    return -1;
}

/**
 * Pose le tracé d'une paire, et LIBÈRE ce qu'il recouvre.
 *
 * Passer sur le chemin d'une autre paire ne doit pas être refusé : c'est le
 * geste normal du jeu — on repasse par-dessus, et l'autre chemin est coupé à
 * cet endroit. Refuser obligerait à effacer d'abord, ce qui double chaque
 * correction.
 */
export function poserTrace(grille, etat, id, cases) {
    const propre = nettoyer(grille, etat, id, cases);
    const traces = etat.traces.map((t, i) => {
        if (i === id) return propre;
        // L'autre paire est coupée AVANT la première case reprise : le début
        // de son tracé reste valable, la suite est effacée.
        const heurte = t.findIndex(c => propre.some(p => memeCase(p, c)));
        return heurte < 0 ? t : t.slice(0, heurte);
    });
    return { traces };
}

/**
 * Ce qui est gardé d'un tracé proposé : il doit partir d'un bout de SA paire,
 * avancer de case voisine en case voisine, et s'arrêter au premier
 * franchissement interdit — le bord, une borne d'une autre paire, ou un
 * retour sur lui-même.
 */
export function nettoyer(grille, etat, id, cases) {
    const paire = grille.paires[id];
    if (!cases.length) return [];
    const depart = cases[0];
    if (!memeCase(depart, paire.a) && !memeCase(depart, paire.b)) return [];
    const bouts = bornes(grille);
    const gardees = [depart];
    for (let i = 1; i < cases.length; i++) {
        const c = cases[i];
        if (!dedans(c, grille.l, grille.h)) break;
        if (!adjacentes(c, gardees[gardees.length - 1])) break;
        if (gardees.some(g => memeCase(g, c))) break;      // pas de boucle
        const b = bouts.get(clef(...c));
        if (b && b.id !== id) break;                        // borne d'un autre
        gardees.push(c);
        // Arrivé à l'autre extrémité de sa propre paire, le chemin est fini :
        // ce qui suivrait ne serait plus un chemin, mais un détour inutile.
        const autre = memeCase(depart, paire.a) ? paire.b : paire.a;
        if (memeCase(c, autre)) break;
    }
    return gardees;
}

/** Cette paire est-elle reliée d'un bout à l'autre ? */
export function reliee(grille, etat, id) {
    const t = etat.traces[id];
    const p = grille.paires[id];
    if (t.length < 2) return false;
    const d = t[0], f = t[t.length - 1];
    return (memeCase(d, p.a) && memeCase(f, p.b)) || (memeCase(d, p.b) && memeCase(f, p.a));
}

/**
 * LE CONTRÔLE DE FIN. Toutes les paires reliées ne suffisent pas : il reste à
 * n'avoir laissé aucune case vide. C'est la moitié de la règle qu'on oublie,
 * et celle qui fait chercher.
 */
export function verifier(grille, etat) {
    const reliees = grille.paires.map(p => reliee(grille, etat, p.id));
    const occupees = new Set();
    etat.traces.forEach(t => t.forEach(c => occupees.add(clef(...c))));
    const vides = [];
    for (let y = 0; y < grille.h; y++) {
        for (let x = 0; x < grille.l; x++) if (!occupees.has(clef(x, y))) vides.push([x, y]);
    }
    return {
        reliees, vides,
        toutesReliees: reliees.every(Boolean),
        rempli: vides.length === 0,
        gagne: reliees.every(Boolean) && vides.length === 0
    };
}

/** La solution, telle qu'on la pose : chaque paire suit son morceau de chemin. */
export const solutionComplete = (grille) => ({ traces: grille.paires.map(p => p.solution.slice()) });

// --- Ce que dit le robot, et l'aide -----------------------------------------

/** La première paire encore incomplète, et le prochain pas de sa solution. */
export function prochainPas(grille, etat) {
    for (const p of grille.paires) {
        const t = etat.traces[p.id];
        if (reliee(grille, etat, p.id)) continue;
        const sol = p.solution;
        // On reprend la solution là où le tracé de l'élève la suit encore.
        let commun = 0;
        while (commun < t.length && commun < sol.length && memeCase(t[commun], sol[commun])) commun++;
        return { id: p.id, jusqua: Math.max(commun + 1, 2), solution: sol };
    }
    return null;
}

/**
 * Ce que dit l'aide : la MÉTHODE, jamais le tracé. Les bords et les coins sont
 * la clef de ce jeu — une case de coin n'a que deux voisines, donc le chemin
 * qui y passe est presque toujours forcé.
 */
export function conseil(grille, etat) {
    const bilan = verifier(grille, etat);
    if (bilan.gagne) return 'Tout est relié, et il ne reste aucune case vide.';
    if (bilan.toutesReliees && !bilan.rempli) {
        return `Toutes les paires sont reliées, mais ${bilan.vides.length} case`
            + `${bilan.vides.length > 1 ? 's restent vides' : ' reste vide'}. `
            + 'Il faut donc allonger un chemin pour y passer : reprends celui qui '
            + 'longe la case vide et fais-lui faire le détour.';
    }
    const reste = grille.paires.filter(p => !reliee(grille, etat, p.id));
    return `Il reste ${reste.length} paire${reste.length > 1 ? 's' : ''} à relier, et `
        + 'la grille doit finir SANS case vide. Commence par les coins : un coin n\'a '
        + 'que deux voisines, le chemin qui y passe est donc presque toujours obligé.';
}

/** La règle, dite en une phrase — c'est elle qui accompagne le polycopié. */
export const CONSIGNE = 'Relie les deux points de même marque par un chemin qui suit les '
    + 'cases, sans diagonale. Les chemins ne se croisent jamais, et à la fin il ne doit '
    + 'rester AUCUNE case vide : c\'est cette dernière règle qui fait chercher.';
