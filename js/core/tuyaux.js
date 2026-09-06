// LE CIRCUIT D'EAU — on tourne les tuyaux jusqu'à ce que tout soit relié.
//
// Rémy, capture d'écran d'un jeu mobile à l'appui : « j'aimerais bien avoir un
// jeu dans ce style-là, il faut tourner des tuyaux pour faire un chemin. »
//
// UN TUYAU EST UN ENSEMBLE DE BRAS, ET TOURNER, C'EST DÉCALER LES BRAS.
// Toute la géométrie du jeu tient dans cette phrase. Une case porte quatre bits
// — nord, est, sud, ouest —, un quart de tour dans le sens des aiguilles fait
// glisser chaque bras sur le suivant, et quatre quarts de tour ramènent la
// pièce d'où elle vient. Il n'y a donc ni « type de pièce » ni « angle » à
// tenir à jour : le coude, le T, la croix et le bout ne sont que des ensembles
// de bras différents, et `formeDe` les NOMME au lieu de les définir. C'est ce
// qui rend le module testable sans écran, et court.
//
// CE QUI FAIT GAGNER : QUE L'EAU AILLE PARTOUT SANS FUIR.
// On ne compare pas la grille à une solution — il y en a souvent plusieurs, et
// refuser un circuit qui marche parce qu'il n'est pas CELUI qu'on avait en tête
// serait injuste. La règle est donc physique et se vérifie sur place : l'eau
// part de la source, traverse tout bras qui en rencontre un autre, et FUIT dès
// qu'une case pleine tend un bras dans le vide. Gagner, c'est mouiller toutes
// les cases sans une fuite.
//
// POURQUOI UN ARBRE, ET PAS N'IMPORTE QUEL RÉSEAU.
// La grille se fabrique en tirant un arbre couvrant : toutes les cases, aucun
// circuit fermé. Deux conséquences, et ce sont elles qui rendent le jeu juste.
// D'abord une solution existe toujours, par construction. Ensuite chaque case
// a au moins un bras, donc aucune case n'est décorative : ce qu'on voit est ce
// qu'il faut relier.
//
// Aucun DOM ici : on reçoit une grille, on rend un état. Le dessin est dans
// core/activities/tuyaux.js, et lui seul.

export const NORD = 1, EST = 2, SUD = 4, OUEST = 8;
export const DIRECTIONS = [NORD, EST, SUD, OUEST];

/** Le déplacement (ligne, colonne) que fait un bras. */
export const PAS = { [NORD]: [-1, 0], [EST]: [0, 1], [SUD]: [1, 0], [OUEST]: [0, -1] };

/** Le bras qu'il faut trouver en face pour que l'eau passe. */
export const OPPOSE = { [NORD]: SUD, [EST]: OUEST, [SUD]: NORD, [OUEST]: EST };

/** Pour les libellés lus par les lecteurs d'écran, et par les élèves. */
export const NOM_DIRECTION = { [NORD]: 'le haut', [EST]: 'la droite', [SUD]: 'le bas', [OUEST]: 'la gauche' };

/** Les deux sens, nommés comme en classe. */
export const HORAIRE = 1, ANTIHORAIRE = -1;
export const NOM_SENS = {
    [HORAIRE]: 'dans le sens des aiguilles d’une montre',
    [ANTIHORAIRE]: 'dans le sens inverse des aiguilles d’une montre'
};

/**
 * UN QUART DE TOUR DANS LE SENS DES AIGUILLES DÉCALE LES BRAS D'UN CRAN.
 *
 * Nord devient est, est devient sud, et ainsi de suite : c'est une rotation
 * circulaire des quatre bits. Le nombre de quarts peut être négatif — c'est
 * l'autre sens — et il se ramène toujours entre 0 et 3, puisque quatre quarts
 * de tour ne changent rien. C'est la première chose qu'on apprend en sixième
 * sur les quarts de tour, et ici c'est aussi ce qui économise du code.
 */
export function tourner(dirs, quarts = 1) {
    const d = Number(dirs) & 15;
    const k = ((Math.round(Number(quarts) || 0) % 4) + 4) % 4;
    return ((d << k) | (d >> (4 - k))) & 15;
}

/** Combien de bras porte cette pièce. */
export function compterBras(dirs) {
    return DIRECTIONS.reduce((n, d) => n + ((dirs & d) ? 1 : 0), 0);
}

/**
 * LE NOM DE LA PIÈCE — pour le dessin et pour la consigne, jamais pour la règle.
 *
 * Un « droit » est un tuyau dont les deux bras sont opposés ; un « coude », un
 * tuyau dont les deux bras ne le sont pas. La forme se LIT donc sur les bras,
 * elle n'est pas une donnée de plus qu'il faudrait garder cohérente.
 */
export function formeDe(dirs) {
    const n = compterBras(dirs);
    if (n === 0) return 'vide';
    if (n === 1) return 'bout';
    if (n === 3) return 'te';
    if (n === 4) return 'croix';
    return (dirs === (NORD | SUD) || dirs === (EST | OUEST)) ? 'droit' : 'coude';
}

/**
 * COMBIEN D'ORIENTATIONS DIFFÉRENTES CETTE PIÈCE A-T-ELLE ?
 *
 * Une croix en a UNE : la tourner ne la change pas. Un tuyau droit en a DEUX,
 * pas quatre — couché ou debout, un demi-tour le ramène sur lui-même. Tout le
 * reste en a quatre.
 *
 * CE N'EST PAS UN DÉTAIL D'AFFICHAGE, c'est ce qui rend le comptage des quarts
 * de tour honnête : demander de tourner une croix, ou compter deux quarts de
 * tour sur un tuyau droit qui était déjà bon, serait faire payer un geste qui
 * ne sert à rien.
 */
export function periodeDe(dirs) {
    for (let k = 1; k <= 4; k++) if (tourner(dirs, k) === (Number(dirs) & 15)) return k;
    return 4;
}

/**
 * LE PLUS COURT CHEMIN D'UNE ORIENTATION À L'AUTRE, EN QUARTS DE TOUR.
 *
 * On compte le nombre de quarts de tour dans le sens le plus court : aller de
 * la position 3 à la position 0 coûte UN quart de tour à l'envers, pas trois à
 * l'endroit. C'est exactement la remarque qu'on veut faire faire à l'élève
 * quand les quarts de tour sont comptés — et c'est pourquoi le jeu donne les
 * deux sens.
 *
 * @returns {number} 0, 1 ou 2 ; `null` si les deux pièces n'ont pas la même forme.
 */
export function quartsMini(depart, cible) {
    let mieux = null;
    for (let k = 0; k < 4; k++) {
        if (tourner(depart, k) !== (Number(cible) & 15)) continue;
        const cout = Math.min(k, 4 - k);
        if (mieux === null || cout < mieux) mieux = cout;
    }
    return mieux;
}

/** Le sens qui coûte le moins cher pour aller de `depart` à `cible`. */
export function sensMini(depart, cible) {
    for (let k = 1; k <= 2; k++) {
        if (tourner(depart, k) === (Number(cible) & 15)) return HORAIRE;
        if (tourner(depart, -k) === (Number(cible) & 15)) return ANTIHORAIRE;
    }
    return HORAIRE;
}

/** Le coût total pour amener une grille sur une solution donnée. */
export function coutMinimum(cases, solution) {
    return (cases || []).reduce((somme, dirs, i) => somme + (quartsMini(dirs, solution[i]) || 0), 0);
}

// --- LE RÉSEAU --------------------------------------------------------------

/** L'index d'une case, et l'inverse. Les grilles sont plates : une seule liste. */
export const indexDe = (r, c, colonnes) => r * colonnes + c;
export const ligneDe = (i, colonnes) => Math.floor(i / colonnes);
export const colonneDe = (i, colonnes) => i % colonnes;

/**
 * LA CASE VOISINE DANS CETTE DIRECTION, ou `-1` si l'on sort de la grille.
 *
 * Le test de bord se fait sur la LIGNE ET LA COLONNE, pas sur l'index : en
 * plat, la case à droite de la dernière colonne est la première de la ligne
 * suivante, et un circuit se refermerait par le bord sans que rien ne le dise.
 */
export function voisine(i, dir, lignes, colonnes) {
    const [dr, dc] = PAS[dir];
    const r = ligneDe(i, colonnes) + dr;
    const c = colonneDe(i, colonnes) + dc;
    if (r < 0 || r >= lignes || c < 0 || c >= colonnes) return -1;
    return indexDe(r, c, colonnes);
}

/**
 * TIRER UN CIRCUIT COMPLET — un arbre couvrant, en marche au hasard.
 *
 * On part d'une case et l'on creuse au hasard tant qu'on peut, en revenant sur
 * ses pas quand on est bloqué. C'est le tirage classique d'un labyrinthe, et il
 * donne ce qu'on veut ici : de longs serpents, donc beaucoup de coudes, donc
 * beaucoup de pièces à tourner. Un tirage « en buisson » (Prim) donnerait des
 * étoiles courtes, plus faciles et moins jolies.
 *
 * LA SOURCE EST UN BOUT DE TUYAU. On la choisit parmi les cases à un seul bras
 * — celles qui ressemblent à une arrivée d'eau —, et à défaut la moins fournie.
 * Une source au milieu d'une croix se verrait mal et se comprendrait moins.
 *
 * @returns {{lignes, colonnes, cases: number[], source: number}}
 */
export function tirerReseau(rng, { lignes = 4, colonnes = 4 } = {}) {
    const L = Math.max(2, Math.round(lignes) || 2);
    const C = Math.max(2, Math.round(colonnes) || 2);
    const total = L * C;
    const cases = new Array(total).fill(0);
    const vues = new Array(total).fill(false);

    const depart = rng.int(0, total - 1);
    vues[depart] = true;
    const pile = [depart];
    while (pile.length) {
        const i = pile[pile.length - 1];
        const possibles = rng.shuffle(DIRECTIONS.filter(d => {
            const j = voisine(i, d, L, C);
            return j >= 0 && !vues[j];
        }));
        if (!possibles.length) { pile.pop(); continue; }
        const d = possibles[0];
        const j = voisine(i, d, L, C);
        cases[i] |= d;
        cases[j] |= OPPOSE[d];
        vues[j] = true;
        pile.push(j);
    }

    const bouts = cases.map((dirs, i) => ({ i, n: compterBras(dirs) }));
    const mini = Math.min(...bouts.map(b => b.n));
    const candidates = bouts.filter(b => b.n === mini).map(b => b.i);
    return { lignes: L, colonnes: C, cases, source: candidates[rng.int(0, candidates.length - 1)] };
}

/**
 * MÉLANGER — et garantir qu'il y a quelque chose à faire.
 *
 * `combien` limite le nombre de pièces déplacées : c'est ce qui permet de
 * poser un circuit presque fini, où seules trois ou quatre pièces sont de
 * travers. On s'en sert pour la marche où les quarts de tour sont comptés — un
 * budget de trente quarts de tour ne se planifie pas, un budget de six, si.
 *
 * ON NE TOURNE QUE CE QUI PEUT TOURNER. Une croix a une seule orientation : la
 * « mélanger » ne ferait rien, et la compter comme une pièce déplacée
 * annoncerait un désordre qui n'existe pas.
 *
 * ET LE MÉLANGE NE REND JAMAIS LA GRILLE DÉJÀ FINIE : c'est le seul cas où le
 * jeu n'aurait aucun sens, et il est d'autant plus probable que la grille est
 * petite. On retourne alors une pièce de plus, ce qui la casse à coup sûr.
 */
export function melanger(rng, reseau, { combien = Infinity } = {}) {
    const cases = [...reseau.cases];
    const mobiles = cases.map((dirs, i) => i).filter(i => periodeDe(cases[i]) > 1);
    const choisies = combien >= mobiles.length ? mobiles : rng.shuffle(mobiles).slice(0, Math.max(1, Math.round(combien)));

    choisies.forEach(i => {
        const p = periodeDe(cases[i]);
        cases[i] = tourner(cases[i], rng.int(1, p - 1));
    });

    if (mobiles.length && cases.every((d, i) => d === reseau.cases[i])) {
        const i = choisies[0] !== undefined ? choisies[0] : mobiles[0];
        cases[i] = tourner(cases[i], 1);
    }
    return { ...reseau, cases };
}

/**
 * L'ÉTAT DU CIRCUIT : où l'eau va, et où elle fuit.
 *
 * L'eau part de la source et passe d'une case à l'autre quand DEUX bras se
 * font face — un bras seul ne suffit pas, c'est un tuyau ouvert sur rien. Elle
 * remplit donc une composante connexe, et le reste attend au sec.
 *
 * UNE FUITE EST UN BRAS DE CASE MOUILLÉE QUI NE TROUVE PERSONNE EN FACE. C'est
 * la règle qu'on voit à l'écran — la goutte qui tombe —, et c'est aussi celle
 * qui apprend quelque chose : un tuyau sec qui pointe dans le vide n'est pas
 * encore un problème, un tuyau plein, si.
 *
 * @returns {{remplies: boolean[], fuites: Array<{case:number, dir:number}>,
 *            nbRemplies: number, complet: boolean}}
 */
export function etatReseau(reseau) {
    const { lignes: L, colonnes: C, cases, source } = reseau;
    const remplies = new Array(cases.length).fill(false);
    const relie = (i, d) => {
        const j = voisine(i, d, L, C);
        return (j >= 0 && (cases[j] & OPPOSE[d])) ? j : -1;
    };

    if (cases[source]) {
        remplies[source] = true;
        const file = [source];
        while (file.length) {
            const i = file.pop();
            for (const d of DIRECTIONS) {
                if (!(cases[i] & d)) continue;
                const j = relie(i, d);
                if (j >= 0 && !remplies[j]) { remplies[j] = true; file.push(j); }
            }
        }
    }

    const fuites = [];
    remplies.forEach((pleine, i) => {
        if (!pleine) return;
        for (const d of DIRECTIONS) {
            if ((cases[i] & d) && relie(i, d) < 0) fuites.push({ case: i, dir: d });
        }
    });

    const nbRemplies = remplies.filter(Boolean).length;
    return { remplies, fuites, nbRemplies, complet: nbRemplies === cases.length && !fuites.length };
}

/**
 * LA MARCHE SUIVANTE POUR QUI SÈCHE — la pièce à tourner, et de combien.
 *
 * On donne la case mouillée la plus proche de la source qui fuit, avec le
 * geste exact qui la répare. C'est l'indice le plus honnête qu'on puisse
 * donner : il ne révèle pas le circuit, il montre PAR OÙ on avance, ce qui est
 * la vraie méthode — l'eau ne saute pas, on suit le courant.
 */
export function prochaineReparation(reseau, solution) {
    const { remplies } = etatReseau(reseau);
    const ordre = reseau.cases.map((_, i) => i)
        .filter(i => reseau.cases[i] !== solution[i])
        .sort((a, b) => (remplies[b] ? 1 : 0) - (remplies[a] ? 1 : 0) || a - b);
    const i = ordre[0];
    if (i === undefined) return null;
    return {
        case: i,
        quarts: quartsMini(reseau.cases[i], solution[i]),
        sens: sensMini(reseau.cases[i], solution[i])
    };
}
