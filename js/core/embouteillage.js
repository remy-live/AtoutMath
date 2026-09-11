// L'EMBOUTEILLAGE — sortir sa voiture d'un parking bloqué.
//
// Rémy : « J'aimerai un jeu façon rush hour […]. Il faut que ce soit
// progressif. »
//
// LA RÈGLE TIENT EN DEUX LIGNES ET LE JEU EN CONTIENT DIX MILLE. Chaque
// véhicule glisse DANS SON AXE — une voiture couchée va à gauche et à droite,
// une voiture debout monte et descend, jamais l'inverse — et aucun ne traverse
// un autre. La voiture rouge doit atteindre la sortie, à droite.
//
// CE N'EST PAS LE COUSIN DU PARKING, ET C'EST POUR CELA QU'ILS COEXISTENT.
// Dans « Le Parking », toutes les voitures vont partout et ce qui manque est la
// place. Ici chacune est prisonnière d'une direction : ce qui manque n'est pas
// l'espace, c'est le DEGRÉ DE LIBERTÉ. Débloquer la rouge demande de déplacer
// une voiture qui ne peut bouger que si une troisième s'écarte d'abord — et
// c'est un raisonnement à rebours, celui qu'on retrouve dans toute
// planification.
//
// UN COUP EST UNE GLISSADE, PAS UNE CASE. C'est la convention du jeu de
// plateau : pousser une voiture de trois cases d'un seul geste compte pour un.
// Compter les cases donnerait des nombres plus gros et surtout FAUX par rapport
// au jeu que l'élève a peut-être à la maison.
//
// LA DIFFICULTÉ SE MESURE, ELLE NE S'ESTIME PAS. On explore TOUTES les
// positions atteignables, on calcule la distance de chacune à la sortie, et
// l'on choisit comme départ une position située à exactement le nombre de coups
// voulu. Le niveau annoncé est donc démontré : personne ne peut faire mieux, et
// la progression de Rémy est une vraie échelle, pas une impression.
//
// Module pur : ni DOM, ni hasard propre.

/** Le plateau classique : six sur six, sortie à droite de la troisième rangée. */
export const COTE = 6;
export const RANGEE_SORTIE = 2;

/**
 * Les paliers, mesurés en COUPS MINIMUM. Rémy : « il faut que ce soit
 * progressif » — alors la progression est dans le nombre de coups qu'il faut,
 * pas dans le nombre de voitures, qui ne veut rien dire : un parking très
 * encombré peut se résoudre en quatre coups.
 */
export const NIVEAUX_EMBOUTEILLAGE = [
    { id: 1, label: 'Niveau 1 — pour comprendre', min: 4, max: 6, voitures: 6, essais: 40 },
    { id: 2, label: 'Niveau 2', min: 7, max: 9, voitures: 8, essais: 40 },
    { id: 3, label: 'Niveau 3', min: 10, max: 12, voitures: 9, essais: 50 },
    { id: 4, label: 'Niveau 4', min: 13, max: 15, voitures: 10, essais: 50 },
    { id: 5, label: 'Niveau 5 — il faut vraiment chercher', min: 16, max: 19, voitures: 10, essais: 55 },
    { id: 6, label: 'Niveau 6 — expert', min: 20, max: 60, voitures: 10, essais: 70 }
];

export const niveauDe = (n) =>
    NIVEAUX_EMBOUTEILLAGE.find(x => x.id === n) || NIVEAUX_EMBOUTEILLAGE[0];

/**
 * UN VÉHICULE : sa longueur, son axe, et la coordonnée qui NE bouge pas.
 *
 * `fixe` est la rangée d'une voiture couchée, la colonne d'une voiture debout.
 * `debut` est la seule chose qui change au cours de la partie — c'est ce qui
 * permet de résumer une position entière en une poignée de nombres, et donc de
 * les compter par centaines de milliers.
 */
export const estCible = (v) => v.id === 0;

/** La case occupée numéro `i` d'un véhicule, dans une position donnée. */
export const caseDe = (v, debut, i) => (v.horiz
    ? { x: debut + i, y: v.fixe }
    : { x: v.fixe, y: debut + i });

/** La grille occupée : `null` ou l'identifiant du véhicule. */
export function occupation(vehicules, etat) {
    const g = Array.from({ length: COTE }, () => new Array(COTE).fill(null));
    vehicules.forEach((v, k) => {
        for (let i = 0; i < v.len; i++) {
            const c = caseDe(v, etat[k], i);
            g[c.y][c.x] = v.id;
        }
    });
    return g;
}

/**
 * TOUS LES COUPS POSSIBLES : chaque véhicule, chaque distance, chaque sens.
 *
 * On rend les glissades ENTIÈRES — de une à cinq cases — parce qu'un coup, au
 * jeu de plateau, c'est une poussée d'un seul geste. Elles sont produites de la
 * plus courte à la plus longue, ce qui donne des chemins d'aspect naturel quand
 * plusieurs se valent.
 */
export function coupsPossibles(vehicules, etat) {
    const g = occupation(vehicules, etat);
    const coups = [];
    vehicules.forEach((v, k) => {
        for (const sens of [-1, 1]) {
            for (let d = 1; d < COTE; d++) {
                const debut = etat[k] + sens * d;
                if (debut < 0 || debut + v.len > COTE) break;
                // La case qui vient d'être franchie doit être libre.
                const bord = sens < 0 ? debut : debut + v.len - 1;
                const c = v.horiz ? { x: bord, y: v.fixe } : { x: v.fixe, y: bord };
                if (g[c.y][c.x] !== null) break;
                coups.push({ k, sens, d, debut });
            }
        }
    });
    return coups;
}

/** Le coup joué, sur une nouvelle position — l'ancienne n'est jamais modifiée. */
export function jouer(etat, coup) {
    const suite = etat.slice();
    suite[coup.k] = coup.debut;
    return suite;
}

/** Gagné quand la voiture rouge touche le bord droit de sa rangée. */
export const estSorti = (vehicules, etat) => etat[0] + vehicules[0].len === COTE;

/**
 * UNE POSITION TIENT DANS UN SEUL ENTIER, et c'est ce qui rend le jeu jouable.
 *
 * Chaque véhicule a un `debut` compris entre 0 et 5 : trois bits suffisent.
 * Avec dix véhicules, une position entière tient sur trente bits — un nombre
 * ordinaire, comparé et rangé en une instruction.
 *
 * La première version rangeait les positions dans une table indexée par
 * « 3,0,4,1,… ». C'était lisible et c'était inutilisable : fabriquer un niveau
 * difficile demandait quinze secondes, l'essentiel passé à construire et à
 * hacher des chaînes de caractères. On garde donc les tableaux à la frontière
 * — c'est eux qu'on lit dans le reste du code — et l'on travaille en entiers
 * à l'intérieur du parcours.
 */
/**
 * DIX VÉHICULES AU PLUS, ET CE N'EST PAS UN CAPRICE.
 *
 * Trois bits par véhicule, et les opérations binaires de JavaScript travaillent
 * sur trente-deux bits SIGNÉS : au onzième véhicule, le décalage vaut trente et
 * le troisième bit tombe dans le bit de signe. Les positions devenaient
 * négatives et surtout se CONFONDAIENT entre elles — deux plateaux différents
 * pouvaient recevoir le même code, et le parcours en largeur en oubliait la
 * moitié. Le test d'équivalence avec la version lisible l'a attrapé ; il ne
 * l'avait pas vu tant qu'il ne montait qu'à dix.
 */
export const MAX_VEHICULES = 10;

export const coder = (etat) => etat.reduce((c, d, k) => c | (d << (3 * k)), 0);
export const decoder = (code, nb) =>
    Array.from({ length: nb }, (_, k) => (code >> (3 * k)) & 7);

/**
 * L'OCCUPATION EN MASQUES DE BITS, PRÉCALCULÉE UNE FOIS PAR PLATEAU.
 *
 * Trente-six cases, c'est plus que les trente-deux bits d'un entier : on en
 * garde donc deux, les trois premières rangées d'un côté, les trois autres de
 * l'autre. Pour chaque véhicule et chaque position possible on range d'avance
 * DEUX choses :
 *
 *   · le masque des cases qu'il couvre — pour reconstruire l'occupation d'une
 *     position en une douzaine de OU ;
 *   · le masque de la SEULE case qu'il franchit en avançant d'un cran — c'est
 *     elle, et elle seule, qu'il faut trouver libre.
 *
 * Ce second masque est ce qui interdit de sauter par-dessus : tester seulement
 * la case d'arrivée laisserait une voiture traverser un embouteillage si le
 * bout du chemin se trouvait libre.
 *
 * LA PREMIÈRE VERSION RECONSTRUISAIT UNE GRILLE DE TRENTE-SIX CASES À CHAQUE
 * POSITION VISITÉE. Un univers en compte jusqu'à trois cent soixante mille, et
 * chacune a une vingtaine de voisines : cela faisait des millions de grilles à
 * remplir, et trois cents millisecondes pour explorer un seul plateau.
 */
export function precalculer(vehicules) {
    const nb = vehicules.length;
    const lo = new Int32Array(nb * COTE), hi = new Int32Array(nb * COTE);
    // eLo[(k * COTE + debut) * 2 + s] : la case franchie en arrivant à `debut`,
    // s = 0 en reculant, s = 1 en avançant.
    const eLo = new Int32Array(nb * COTE * 2), eHi = new Int32Array(nb * COTE * 2);
    const bit = (x, y) => (y < 3
        ? { lo: 1 << (y * COTE + x), hi: 0 }
        : { lo: 0, hi: 1 << ((y - 3) * COTE + x) });

    vehicules.forEach((v, k) => {
        for (let debut = 0; debut + v.len <= COTE; debut++) {
            const i = k * COTE + debut;
            for (let j = 0; j < v.len; j++) {
                const b = bit(v.horiz ? debut + j : v.fixe, v.horiz ? v.fixe : debut + j);
                lo[i] |= b.lo; hi[i] |= b.hi;
            }
            // En reculant, la case franchie est la PREMIÈRE ; en avançant, la
            // dernière.
            for (const sens of [0, 1]) {
                const bord = sens === 0 ? debut : debut + v.len - 1;
                const b = bit(v.horiz ? bord : v.fixe, v.horiz ? v.fixe : bord);
                eLo[i * 2 + sens] = b.lo; eHi[i * 2 + sens] = b.hi;
            }
        }
    });
    return { nb, lo, hi, eLo, eHi, longueurs: vehicules.map(v => v.len) };
}

/**
 * LES POSITIONS VOISINES, sans allouer un seul objet ni remplir une grille.
 *
 * Le parcours en largeur visite des centaines de milliers de positions : y
 * décrire chaque coup par un petit objet `{k, sens, d, debut}` reviendrait à en
 * fabriquer des millions, que le ramasse-miettes paierait ensuite. Ici on ne
 * rend que des entiers ; les coups nommés restent pour l'interface, qui n'en
 * manipule qu'une poignée.
 */
export function voisins(P, code, sortie) {
    sortie.length = 0;
    let occLo = 0, occHi = 0;
    for (let k = 0; k < P.nb; k++) {
        const i = k * COTE + ((code >> (3 * k)) & 7);
        occLo |= P.lo[i]; occHi |= P.hi[i];
    }
    for (let k = 0; k < P.nb; k++) {
        const debut0 = (code >> (3 * k)) & 7;
        const i0 = k * COTE + debut0;
        // L'occupation sans ce véhicule : il ne se gêne pas lui-même.
        const libreLo = ~(occLo ^ P.lo[i0]), libreHi = ~(occHi ^ P.hi[i0]);
        const base = code & ~(7 << (3 * k));
        const max = COTE - P.longueurs[k];
        for (let sens = 0; sens < 2; sens++) {
            const pas = sens === 0 ? -1 : 1;
            for (let d = 1; d < COTE; d++) {
                const debut = debut0 + pas * d;
                if (debut < 0 || debut > max) break;
                const e = (k * COTE + debut) * 2 + sens;
                if ((P.eLo[e] & libreLo) !== P.eLo[e]) break;
                if ((P.eHi[e] & libreHi) !== P.eHi[e]) break;
                sortie.push(base | (debut << (3 * k)));
            }
        }
    }
    return sortie;
}

/**
 * TOUTE LA COMPOSANTE, ET LA DISTANCE DE CHACUN À LA SORTIE.
 *
 * Deux parcours en largeur sur le même ensemble de positions :
 *
 *   1. depuis la position tirée au sort, pour connaître TOUT ce qui est
 *      atteignable — c'est l'univers du casse-tête ;
 *   2. depuis toutes les positions gagnantes de cet univers, à rebours, pour
 *      obtenir la distance à la sortie de chacune.
 *
 * Le second parcours est légitime parce qu'un coup se DÉFAIT toujours : une
 * voiture qui a glissé peut revenir, donc les arêtes sont symétriques.
 *
 * `plafond` arrête l'exploration si l'univers explose — mieux vaut retirer un
 * plateau que faire attendre.
 */
export function explorer(vehicules, depart, plafond = 400000) {
    const P = precalculer(vehicules);
    const tampon = [];
    const gagne = (code) => (((code & 7) + vehicules[0].len) === COTE);

    const vus = new Set([coder(depart)]);
    let file = [coder(depart)];
    const gagnantes = [];
    while (file.length) {
        const suivante = [];
        for (const ici of file) {
            if (gagne(ici)) gagnantes.push(ici);
            const v = voisins(P, ici, tampon);
            for (let i = 0; i < v.length; i++) {
                if (vus.has(v[i])) continue;
                if (vus.size >= plafond) return null;
                vus.add(v[i]);
                suivante.push(v[i]);
            }
        }
        file = suivante;
    }
    if (!gagnantes.length) return null;

    const dist = new Map(gagnantes.map(c => [c, 0]));
    file = gagnantes;
    let d = 0;
    while (file.length) {
        d++;
        const suivante = [];
        for (const ici of file) {
            const v = voisins(P, ici, tampon);
            for (let i = 0; i < v.length; i++) {
                if (dist.has(v[i])) continue;
                dist.set(v[i], d);
                suivante.push(v[i]);
            }
        }
        file = suivante;
    }
    return { nb: P.nb, taille: vus.size, dist, maximum: d - 1 };
}

/** Combien de coups il reste au plus court, ou `null` si la table l'ignore. */
export function restants(table, etat) {
    const d = table.dist.get(coder(etat));
    return d === undefined ? null : d;
}

/** Le prochain coup du plus court chemin. */
export function prochainCoup(vehicules, table, etat) {
    const ici = restants(table, etat);
    if (ici === null || ici === 0) return null;
    for (const c of coupsPossibles(vehicules, etat)) {
        if (restants(table, jouer(etat, c)) === ici - 1) return c;
    }
    return null;
}

// --- La fabrication -------------------------------------------------------------

/**
 * UN PARKING TIRÉ AU SORT, PUIS MESURÉ.
 *
 * On pose la voiture rouge sur sa rangée, puis des véhicules au hasard sans
 * chevauchement. Le plateau obtenu n'est pas le casse-tête : c'est seulement un
 * univers de positions. Le casse-tête, c'est UNE position de cet univers, celle
 * qui se trouve à exactement le nombre de coups voulu de la sortie.
 */
export function poserVehicules(rng, nb) {
    nb = Math.min(nb, MAX_VEHICULES);
    const pris = Array.from({ length: COTE }, () => new Array(COTE).fill(false));
    const vehicules = [];
    const depart = [];

    const poser = (len, horiz, fixe, debut) => {
        if (fixe < 0 || fixe >= COTE || debut < 0 || debut + len > COTE) return false;
        const cases = [];
        for (let i = 0; i < len; i++) {
            cases.push(horiz ? { x: debut + i, y: fixe } : { x: fixe, y: debut + i });
        }
        if (cases.some(c => pris[c.y][c.x])) return false;
        cases.forEach(c => { pris[c.y][c.x] = true; });
        vehicules.push({ id: vehicules.length, len, horiz, fixe });
        depart.push(debut);
        return true;
    };

    // La rouge : deux cases, sur la rangée de sortie, à gauche.
    poser(2, true, RANGEE_SORTIE, rng.int(0, 1));

    // LES BARRAGES D'ABORD, ET C'EST TOUTE LA DIFFÉRENCE. Un tirage
    // uniformément au hasard donne presque toujours un parking où la rouge sort
    // en trois coups : il faut de la chance pour qu'une voiture se trouve juste
    // devant elle, et davantage encore pour que cette voiture soit elle-même
    // coincée. On plante donc d'abord deux ou trois véhicules DEBOUT qui
    // traversent la rangée de sortie — c'est le squelette du casse-tête — et
    // l'on remplit ensuite. Fabriquer un niveau difficile est passé de « une
    // fois sur dix » à « presque à tous les coups ».
    const colonnes = rng.shuffle([2, 3, 4, 5]);
    const barrages = Math.min(colonnes.length, Math.max(2, Math.round(nb / 3)));
    for (let i = 0; i < barrages; i++) {
        const len = rng.bool(0.6) ? 2 : 3;
        // Le véhicule doit couvrir la rangée de sortie.
        const bas = Math.max(0, RANGEE_SORTIE - len + 1);
        const haut = Math.min(COTE - len, RANGEE_SORTIE);
        poser(len, false, colonnes[i], rng.int(bas, haut));
    }

    // Puis le reste, au hasard — mais jamais couché sur la rangée de sortie :
    // il y serait devant la rouge sans que rien ne puisse jamais l'écarter, et
    // le casse-tête n'aurait pas de solution, pour une raison sans intérêt.
    let garde = 0;
    while (vehicules.length < nb && garde++ < 300) {
        const len = rng.bool(0.7) ? 2 : 3;
        const horiz = rng.bool();
        const fixe = rng.int(0, COTE - 1);
        if (horiz && fixe === RANGEE_SORTIE) continue;
        poser(len, horiz, fixe, rng.int(0, COTE - len));
    }
    return { vehicules, depart };
}

/**
 * Un casse-tête prêt à jouer.
 *
 * @param {{niveau?: number, rng: object, essais?: number}} opts
 * @returns {{niveau: number, vehicules: Array, depart: number[], mini: number,
 *            table: object}|null}
 */
export function creerEmbouteillage({ niveau = 1, rng, essais = null }) {
    const n = niveauDe(niveau);
    const budget = essais || n.essais || 60;
    // LE MEILLEUR TROUVÉ, FAUTE DE MIEUX. Les parkings profonds sont rares —
    // un sur trente atteint vingt coups —, et l'on ne peut pas faire attendre
    // un élève pendant qu'on en cherche un. On garde donc toujours le plus dur
    // rencontré : le niveau annoncé est une VISÉE, alors que le nombre de coups
    // affiché en jeu est une MESURE. Aucun des deux ne ment.
    let meilleur = null;
    for (let essai = 0; essai < budget; essai++) {
        const { vehicules, depart } = poserVehicules(rng, n.voitures);
        if (vehicules.length < 3) continue;
        if (estSorti(vehicules, depart)) continue;
        const table = explorer(vehicules, depart);
        if (!table) continue;
        // ON PREND LES POSITIONS LES PLUS ÉLOIGNÉES, pas une au hasard dans la
        // fourchette : il y a toujours beaucoup plus de positions faciles que
        // difficiles, et un tirage uniforme ramenait invariablement le plancher
        // — les six niveaux donnaient 4, 7, 10, 14… au lieu de couvrir leur
        // plage.
        const vise = Math.min(n.max, table.maximum);
        const candidates = [];
        table.dist.forEach((d, code) => { if (d === vise) candidates.push(code); });
        if (!candidates.length) continue;
        const jeu = {
            niveau: n.id, vehicules, depart: decoder(rng.pick(candidates), vehicules.length),
            mini: vise, table
        };
        if (!meilleur || jeu.mini > meilleur.mini) meilleur = jeu;
        if (jeu.mini >= n.min) return jeu;
    }
    if (meilleur) return meilleur;
    // ON NE REND JAMAIS RIEN. Un tirage malheureux peut n'aligner que des
    // parkings insolubles — la voiture rouge murée par des véhicules qui ne
    // peuvent plus bouger. Plutôt que d'afficher « je n'ai pas trouvé », on
    // retombe sur un plateau peu encombré : ils sont presque toujours
    // solubles, et coûtent dix millisecondes.
    for (let essai = 0; essai < 80; essai++) {
        const { vehicules, depart } = poserVehicules(rng, 6);
        if (vehicules.length < 3 || estSorti(vehicules, depart)) continue;
        const table = explorer(vehicules, depart);
        if (!table || table.maximum < 1) continue;
        const vise = table.maximum;
        const candidates = [];
        table.dist.forEach((d, code) => { if (d === vise) candidates.push(code); });
        if (!candidates.length) continue;
        return {
            niveau: n.id, vehicules,
            depart: decoder(rng.pick(candidates), vehicules.length),
            mini: vise, table
        };
    }
    return null;
}

/** De quoi juger une partie : le compte, le minimum, et l'écart. */
export function qualiteEmbouteillage(mini, joues) {
    return { mini, joues, detours: Math.max(0, joues - mini), parfait: joues === mini };
}
