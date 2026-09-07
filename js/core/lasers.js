// LE RAYON ET LES MIROIRS — poser des miroirs pour amener un rayon sur sa cible.
//
// Rémy, capture d'un jeu à l'appui : « j'aimerai bien un jeu dans ce style avec
// des lasers et des miroirs, je ne connais pas le nom. C'est un exercice bonus
// comme le sudoku. »
//
// CE QU'ON APPREND, ET POURQUOI ÇA NE SE RÉCITE PAS. Un miroir posé à 45°
// change un déplacement horizontal en déplacement vertical : c'est un QUART DE
// TOUR, et c'est la seule règle du jeu. Elle s'énonce en une phrase et ne
// s'applique correctement qu'après l'avoir vue jouer — « le rayon part vers la
// droite, il touche un miroir « / », il repart vers le haut » demande de tenir
// deux choses à la fois, la direction d'avant et l'orientation du miroir. Les
// élèves qui se trompent ne se trompent jamais sur la règle, ils se trompent
// sur la composition : deux miroirs de suite, et il faut refaire le
// raisonnement au lieu de le deviner.
//
// D'OÙ LE BUDGET, QUI EST TOUT LE JEU. Sans lui, on couvrirait la grille de
// miroirs jusqu'à ce que ça marche, et le raisonnement disparaîtrait derrière
// l'essai. Le nombre de miroirs est donc COMPTÉ, et c'est exactement celui
// qu'il faut : on ne peut plus tâtonner, il faut prévoir le trajet.
//
// LE TRAJET N'EST PAS COMPARÉ À UNE SOLUTION. Comme pour le circuit d'eau, la
// grille tirée n'est qu'UNE réponse possible ; refuser un trajet qui atteint la
// cible sous prétexte qu'il n'est pas celui qu'on avait en tête serait injuste
// et incompréhensible. On simule le rayon, et l'on regarde s'il arrive.
//
// CE MODULE NE DESSINE RIEN : il fait avancer un rayon dans une grille. C'est
// ce qui permet de le tester sans navigateur — et il le faut, parce qu'un
// rayon qui tourne du mauvais côté est une erreur qu'on ne voit pas en lisant.

/** Les quatre directions, en pas de grille. `y` descend, comme à l'écran. */
export const PAS = { E: [1, 0], O: [-1, 0], N: [0, -1], S: [0, 1] };
export const SENS = ['E', 'S', 'O', 'N'];

/** Ce qu'une case peut contenir. */
export const VIDE = '.';
export const MUR = '#';
/**
 * LA MINE — la case que le rayon ne doit pas traverser.
 *
 * Rémy, après avoir joué : « les rayons et les miroirs sont hyper faciles, tu
 * ne peux pas compliquer un peu ». Les murs ne compliquaient rien : ils
 * arrêtent le rayon, donc ils se contentent d'annuler un trajet qu'on n'avait
 * pas choisi. La mine, elle, se met SUR le trajet qu'on serait tenté de
 * prendre — celui qu'on obtient en oubliant de tourner — et rend la faute
 * visible au lieu de la rendre stérile.
 */
export const MINE = 'x';
export const MIROIRS = ['/', '\\'];

/**
 * LE REBOND, ET IL TIENT DANS DEUX LIGNES.
 *
 * Le miroir « / » va du coin bas-gauche au coin haut-droit : un rayon qui part
 * vers l'EST le frappe par en dessous et repart vers le NORD. Le miroir « \ »
 * est l'autre diagonale, et échange donc EST et SUD.
 *
 * On l'écrit comme une TABLE plutôt qu'avec des formules sur les composantes :
 * une table se lit, se vérifie du doigt, et ne peut pas se tromper de signe.
 */
const REBOND = {
    '/': { E: 'N', N: 'E', O: 'S', S: 'O' },
    '\\': { E: 'S', S: 'E', O: 'N', N: 'O' }
};

/** La direction après le miroir — ou la même s'il n'y en a pas. */
export function refleter(sens, contenu) {
    const table = REBOND[contenu];
    return table ? table[sens] : sens;
}

/**
 * FAIRE COURIR LE RAYON, ET DIRE OÙ IL S'ARRÊTE.
 *
 * PLUSIEURS CRISTAUX, ET UN SEUL TRAJET POUR LES ALLUMER TOUS.
 *
 * Rémy, après avoir joué : « les rayons et les miroirs sont hyper faciles, tu
 * ne peux pas compliquer un peu ». Avec une seule cible, il suffit de regarder
 * par où elle peut être atteinte et de remonter — c'est un exercice à une
 * inconnue. Avec deux ou trois cristaux, il faut trouver un trajet qui passe
 * par TOUS, dans un ordre qu'on ne choisit pas : le rayon ne revient pas en
 * arrière, donc l'ordre est imposé par la géométrie, et c'est là qu'il y a
 * quelque chose à chercher.
 *
 * LE RAYON TRAVERSE DONC LES CRISTAUX au lieu de s'arrêter au premier. Un
 * cristal n'est pas un mur : il s'allume au passage. C'est ce qui rend
 * l'enchaînement possible, et c'est aussi ce qui se voit — trois cristaux
 * allumés d'un seul trait.
 *
 * Cinq fins possibles, et l'écran les distingue toutes : tous les cristaux
 * allumés, le rayon sort de la grille, il se perd dans un mur, il touche une
 * mine, ou il tourne en rond. La dernière est impossible (voir le test), mais
 * sans le compteur de pas la boucle serait infinie.
 *
 * @param {Object} g - { n, cases, source: {x, y, sens}, cibles: [{x, y}] }
 * @returns {{chemin: Array, fin: string, touche: boolean, allumees: Set}}
 *   `chemin` liste les segments parcourus : de quoi tracer le trait à l'écran.
 */
export function tracer(g) {
    const chemin = [];
    const cibles = listeCibles(g);
    const allumees = new Set();
    let sens = g.source.sens;
    let x = g.source.x;
    let y = g.source.y;
    const vus = new Set();
    const rendre = (fin) => ({ chemin, fin, allumees, touche: allumees.size === cibles.length });
    // Une case peut être traversée deux fois — une fois à l'horizontale, une
    // fois à la verticale —, et ce n'est PAS une boucle. C'est le couple
    // (case, direction) qui doit rester unique.
    for (let pas = 0; pas < g.n * g.n * 4 + 8; pas++) {
        if (x < 0 || y < 0 || x >= g.n || y >= g.n) return rendre('sortie');
        const cle = `${x},${y},${sens}`;
        if (vus.has(cle)) return rendre('boucle');
        vus.add(cle);
        const i = y * g.n + x;
        const quoi = g.cases[i];
        if (quoi === MUR) return rendre('mur');
        // LA MINE ARRÊTE TOUT, ET ELLE ANNULE CE QUI PRÉCÈDE. Un trajet qui
        // allume deux cristaux puis explose n'est pas à moitié réussi : c'est
        // exactement la faute qu'on veut faire voir.
        if (quoi === MINE) { allumees.clear(); return rendre('mine'); }
        const avant = sens;
        sens = refleter(sens, quoi);
        chemin.push({ x, y, entre: avant, sort: sens });
        // UN CRISTAL S'ALLUME AU PASSAGE, avant tout rebond : un miroir posé
        // sur un cristal n'aurait aucun sens, et l'écran l'interdit.
        const k = cibles.findIndex(c => c.x === x && c.y === y);
        if (k >= 0) {
            allumees.add(k);
            if (allumees.size === cibles.length) return rendre('cible');
        }
        const [dx, dy] = PAS[sens];
        x += dx; y += dy;
    }
    return rendre('boucle');
}

/**
 * LES CRISTAUX D'UNE GRILLE, toujours sous forme de liste.
 *
 * Les premières grilles n'en avaient qu'un, écrit `cible` au singulier. Le
 * garder ferait deux formes pour la même chose, et un jour l'une des deux
 * serait oubliée quelque part.
 */
export const listeCibles = (g) => (g.cibles && g.cibles.length ? g.cibles
    : (g.cible ? [g.cible] : []));

/** Cette case porte-t-elle un cristal ? */
export const estCible = (g, x, y) => listeCibles(g).some(c => c.x === x && c.y === y);

/** Combien de miroirs l'élève a posés (les fixes ne comptent pas). */
export const miroirsPoses = (cases, fixes) =>
    cases.filter((c, i) => MIROIRS.includes(c) && !fixes[i]).length;

/**
 * SEPT NIVEAUX, ET CHACUN AJOUTE UNE SEULE CHOSE.
 *
 * Rémy, après avoir joué la première version : « les rayons et les miroirs sont
 * hyper faciles, tu ne peux pas compliquer un peu ». Il avait raison, et la
 * raison est précise : avec UN cristal, on regarde par où il peut être atteint
 * et l'on remonte — c'est un problème à une inconnue, qui se voit d'un coup
 * d'œil sur cinq cases de côté. Quatre choses le rendent difficile, et elles
 * arrivent une par une :
 *
 *   · LE NOMBRE DE VIRAGES, jusqu'à six : après le deuxième rebond, on ne
 *     devine plus, on suit.
 *   · PLUSIEURS CRISTAUX dans le MÊME trajet. C'est le vrai saut. Le rayon ne
 *     revient jamais en arrière : l'ordre dans lequel il les rencontre est
 *     imposé par la géométrie, et il faut le trouver avant de poser quoi que
 *     ce soit.
 *   · LES MINES, posées là où l'on file tout droit si l'on oublie de tourner.
 *     Un mur annule un trajet qu'on n'avait pas choisi ; une mine punit
 *     exactement l'erreur qu'on allait faire.
 *   · LES MIROIRS VISSÉS, qu'on ne peut pas bouger : il faut composer avec le
 *     rebond d'un autre, ce qui est la vraie difficulté du genre.
 *
 * Les grilles montent à neuf de côté. Ce n'est pas la taille qui fait la
 * difficulté — on l'a vu avec le circuit d'eau —, mais elle est nécessaire :
 * six virages ne tiennent pas dans cinq cases.
 */
export const MARCHES_LASER = [
    { id: 'un', nom: '1. Un miroir', n: 5, virages: 1, cibles: 1 },
    { id: 'deux', nom: '2. Deux miroirs', n: 6, virages: 2, cibles: 1 },
    { id: 'trois', nom: '3. Trois miroirs', n: 7, virages: 3, cibles: 1, murs: 3 },
    { id: 'deuxCristaux', nom: '4. Deux cristaux', n: 7, virages: 3, cibles: 2, murs: 3 },
    { id: 'mines', nom: '5. Attention aux mines', n: 8, virages: 4, cibles: 2, murs: 3, mines: 3 },
    { id: 'troisCristaux', nom: '6. Trois cristaux', n: 8, virages: 5, cibles: 3, murs: 4, mines: 3 },
    { id: 'fixes', nom: '7. Des miroirs vissés', n: 9, virages: 6, cibles: 3, murs: 5, mines: 4, fixes: 2 }
];

/**
 * LE MIROIR QU'IL FAUT POUR TOURNER D'ICI VERS LÀ.
 *
 * C'est la table de rebond lue à l'envers, et c'est le générateur qui en a
 * besoin : il choisit d'abord le trajet, puis les miroirs qui le produisent.
 */
export function miroirPour(entre, sort) {
    for (const m of MIROIRS) if (REBOND[m][entre] === sort) return m;
    return null;
}

/**
 * TIRER UNE GRILLE — EN TRAÇANT LE TRAJET D'ABORD.
 *
 * On ne tire pas des miroirs au hasard en espérant qu'un trajet existe : on
 * DESSINE le trajet — droite, virage, droite, virage — et l'on en déduit les
 * miroirs. La grille est donc soluble par construction, et le budget est exact
 * puisqu'il vaut le nombre de virages.
 *
 * @returns {Object|null} la grille prête à jouer, ou `null` si le tirage a
 *   échoué (grille trop petite pour le nombre de virages demandé) — l'appelant
 *   réessaie, ce qui est plus simple qu'un algorithme qui ne rate jamais.
 */
export function tirerNiveau(rng, marche) {
    const n = marche.n;
    for (let essai = 0; essai < 60; essai++) {
        const g = unTirage(rng, marche, n);
        if (g) return g;
    }
    return null;
}

function unTirage(rng, marche, n) {
    // La source est sur un bord, et regarde vers l'intérieur.
    const bord = SENS[rng.int(0, 3)];
    let sens = { E: 'E', O: 'O', N: 'N', S: 'S' }[bord];
    let x = bord === 'E' ? 0 : bord === 'O' ? n - 1 : rng.int(1, n - 2);
    let y = bord === 'S' ? 0 : bord === 'N' ? n - 1 : rng.int(1, n - 2);
    if (bord === 'E' || bord === 'O') y = rng.int(0, n - 1);
    else x = rng.int(0, n - 1);

    const source = { x, y, sens };
    const cases = new Array(n * n).fill(VIDE);
    const surLeTrajet = new Set();
    const marques = [];
    // LES CANDIDATS À DEVENIR CRISTAUX : chaque case DROITE du trajet, virages
    // exclus. Un cristal sur un virage se poserait sur le miroir, ce que
    // l'écran interdit — et ce serait de toute façon une case qu'on ne peut
    // pas rater, donc un cristal qui n'apprend rien.
    const droites = [];
    // Et les cases où l'on part tout droit au lieu de tourner : c'est là que
    // les mines valent quelque chose.
    const toutDroit = [];

    for (let v = 0; v <= marche.virages; v++) {
        const dernier = v === marche.virages;
        // La longueur du segment : au moins un pas, et jamais jusqu'au bord —
        // un virage collé au bord laisse le rayon sortir au coup suivant.
        const place = jusquAuBord(x, y, sens, n);
        if (place < 1) return null;
        const long = rng.int(1, Math.min(place, dernier ? place : place - 1));
        for (let k = 0; k < long; k++) {
            surLeTrajet.add(`${x},${y}`);
            if (k > 0 || v === 0) droites.push({ x, y });
            const [dx, dy] = PAS[sens];
            x += dx; y += dy;
        }
        if (x < 0 || y < 0 || x >= n || y >= n) return null;
        if (surLeTrajet.has(`${x},${y}`)) return null;      // le trajet se recoupe
        if (dernier) break;
        // LA CASE D'APRÈS, DANS LE MÊME SENS : celle où l'on file si l'on
        // oublie de poser le miroir. Une mine posée là punit l'oubli au lieu
        // de le laisser sans conséquence.
        const [ax, ay] = PAS[sens];
        toutDroit.push({ x: x + ax, y: y + ay });
        // Le virage : on tourne d'un quart de tour, à droite ou à gauche.
        const suivant = tourner(sens, rng.int(0, 1) ? 1 : -1);
        const m = miroirPour(sens, suivant);
        if (!m) return null;
        cases[y * n + x] = m;
        marques.push({ i: y * n + x, m });
        surLeTrajet.add(`${x},${y}`);
        sens = suivant;
    }

    const fin = { x, y };
    if (fin.x === source.x && fin.y === source.y) return null;

    // LES CRISTAUX : le dernier est au bout du trajet, les autres se prennent
    // sur les portions droites, dans l'ordre où le rayon les rencontre. Cet
    // ordre EST la difficulté : le rayon ne revient pas en arrière, donc il
    // n'y a qu'un enchaînement possible, et il faut le trouver.
    const combien = Math.max(1, marche.cibles || 1);
    const cibles = [fin];
    const pool = droites.filter(c => !surLeVirage(c, marques, n) && !memeCase(c, source));
    for (let k = 1; k < combien && pool.length; k++) {
        const c = pool.splice(rng.int(0, pool.length - 1), 1)[0];
        if (!cibles.some(z => memeCase(z, c))) cibles.push(c);
    }
    if (cibles.length < combien) return null;

    const surUneCible = (cx, cy) => cibles.some(c => c.x === cx && c.y === cy);

    // LES MURS ET LES MINES SE POSENT HORS DU TRAJET. Les mines d'abord, et
    // sur les cases « tout droit » : ce sont elles qui ont un sens.
    const cases2 = cases.slice();
    const libre = (cx, cy) => cx >= 0 && cy >= 0 && cx < n && cy < n
        && !surLeTrajet.has(`${cx},${cy}`) && !surUneCible(cx, cy)
        && cases2[cy * n + cx] === VIDE;
    let posees = 0;
    for (const c of toutDroit) {
        if (posees >= (marche.mines || 0)) break;
        if (!libre(c.x, c.y)) continue;
        cases2[c.y * n + c.x] = MINE;
        posees += 1;
    }
    if ((marche.mines || 0) && !posees) return null;   // des mines qui ne gênent rien

    if (marche.murs) {
        const libres = [];
        for (let i = 0; i < n * n; i++) {
            if (libre(i % n, Math.floor(i / n))) libres.push(i);
        }
        for (let k = 0; k < marche.murs && libres.length; k++) {
            cases2[libres.splice(rng.int(0, libres.length - 1), 1)[0]] = MUR;
        }
    }

    // Ce que l'élève trouve posé : rien, ou les premiers miroirs du trajet.
    const fixes = new Array(n * n).fill(false);
    const depart = cases2.slice();
    marques.forEach(({ i }) => { depart[i] = VIDE; });
    // `fixes` peut être absent d'un niveau : sans ce zéro, `Math.min` rendait
    // NaN et le budget n'était plus un nombre — mesuré sur six niveaux sur
    // sept, et l'écran affichait « NaN miroir à poser ».
    const vissés = Math.max(0, Math.min(marche.fixes || 0, marques.length - 1));
    for (let k = 0; k < vissés; k++) {
        depart[marques[k].i] = marques[k].m;
        fixes[marques[k].i] = true;
    }

    const budget = marques.length - vissés;
    const grille = { n, cases: depart, fixes, source, cibles, budget, solution: cases2 };
    // GARDE-FOU : la grille tirée DOIT se résoudre avec sa propre solution. Le
    // trajet a été construit pas à pas, mais un mur mal placé, une mine ou un
    // virage au ras du bord peuvent l'avoir cassé — mieux vaut le voir ici que
    // devant un élève.
    if (!tracer({ ...grille, cases: cases2 }).touche) return null;
    // Et le rayon ne doit PAS déjà tout allumer sans rien poser, sauf s'il n'y
    // a rien à poser.
    if (budget > 0 && tracer(grille).touche) return null;
    return grille;
}

const memeCase = (a, b) => a.x === b.x && a.y === b.y;
const surLeVirage = (c, marques, n) => marques.some(m => m.i === c.y * n + c.x);

/** La distance au bord dans cette direction, en cases. */
function jusquAuBord(x, y, sens, n) {
    if (sens === 'E') return n - 1 - x;
    if (sens === 'O') return x;
    if (sens === 'S') return n - 1 - y;
    return y;
}

/** Un quart de tour : `+1` dans le sens des aiguilles, `−1` dans l'autre. */
export function tourner(sens, sens2) {
    const i = SENS.indexOf(sens);
    return SENS[(i + (sens2 > 0 ? 1 : 3)) % 4];
}

/**
 * POSER, TOURNER, RETIRER — un seul geste, et il tourne en rond.
 *
 * Vide → « / » → « \ » → vide. Trois états sur un seul appui : c'est le geste
 * du circuit d'eau, et il a la même vertu — rien à sélectionner d'abord, rien
 * à faire glisser, et l'on revient toujours en arrière du même doigt.
 *
 * @returns {{cases: Array, refus: string}|{cases: Array}}
 */
export function poserMiroir(g, i) {
    if (g.fixes[i]) return { cases: g.cases, refus: 'Ce miroir-là est vissé : il ne bouge pas.' };
    if (g.solution[i] === MUR || g.cases[i] === MUR) {
        return { cases: g.cases, refus: 'Un mur ne renvoie rien : le rayon s\'y perd.' };
    }
    if (i === g.source.y * g.n + g.source.x) {
        return { cases: g.cases, refus: 'C\'est la case de départ du rayon.' };
    }
    if (estCible(g, i % g.n, Math.floor(i / g.n))) {
        return { cases: g.cases, refus: 'C\'est un cristal : le rayon le traverse, il n\'y rebondit pas.' };
    }
    if (g.cases[i] === MINE || g.solution[i] === MINE) {
        return { cases: g.cases, refus: 'Une mine : le rayon ne doit pas passer par là.' };
    }
    const cases = g.cases.slice();
    const suite = { [VIDE]: MIROIRS[0], [MIROIRS[0]]: MIROIRS[1], [MIROIRS[1]]: VIDE };
    const apres = suite[cases[i]] ?? VIDE;
    // LE BUDGET SE VÉRIFIE AVANT DE POSER, PAS APRÈS. Laisser poser puis
    // annoncer « trop de miroirs » ferait un état interdit qui existe quand
    // même, et l'élève devrait défaire lui-même.
    if (apres !== VIDE && cases[i] === VIDE
        && miroirsPoses(cases, g.fixes) >= g.budget) {
        return {
            cases,
            refus: `Tu n'as que ${g.budget} miroir${g.budget > 1 ? 's' : ''} : `
                + 'retires-en un avant d\'en poser un autre.'
        };
    }
    cases[i] = apres;
    return { cases };
}

/** Ce qu'on dit du trajet quand il n'arrive pas. */
export const DIT_LA_FIN = {
    sortie: 'Le rayon sort de la grille.',
    mur: 'Le rayon se perd dans un mur.',
    mine: 'Le rayon touche une mine : tout est à refaire.',
    boucle: 'Le rayon tourne en rond : il ne sortira jamais de sa boucle.',
    cible: 'Tous les cristaux sont allumés.'
};

/** Ce qui reste à allumer, dit en français. */
export function ditLeReste(g, r) {
    const total = listeCibles(g).length;
    const faits = r.allumees ? r.allumees.size : 0;
    if (total <= 1 || !faits) return DIT_LA_FIN[r.fin] || '';
    return `${DIT_LA_FIN[r.fin] || ''} ${faits} ${faits > 1 ? 'cristaux' : 'cristal'} `
        + `sur ${total} allumé${faits > 1 ? 's' : ''}.`;
}

export const CONSIGNE = 'Pose les miroirs pour allumer tous les cristaux.';
