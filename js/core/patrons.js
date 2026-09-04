// LE PATRON DU CUBE — plier une figure plate, et voir si elle se ferme.
//
// Rémy, sur trois propositions de jeux : « J'adore le 1 et 3. » Voici le 3.
//
// CE QU'ON APPREND ICI, ET POURQUOI ÇA NE S'APPREND PAS AUTREMENT. Un patron
// de cube ne se reconnaît pas à l'œil : il se PLIE. Onze figures de six carrés
// se ferment en cube, trente-cinq existent, et rien dans l'allure d'un
// hexomino ne dit à laquelle des deux familles il appartient — le rectangle
// 2 × 3, qui est la première réponse de tout le monde, n'en est pas un. C'est
// exactement le genre de question où la manipulation bat l'explication : on
// devine, on plie, on voit.
//
// LE MODULE NE CONTIENT AUCUNE LISTE DE PATRONS RECOPIÉE.
//
// C'est la décision qui compte. On aurait pu écrire à la main les onze patrons
// connus — ils traînent dans tous les manuels. Le module ÉNUMÈRE les
// trente-cinq hexominos et PLIE chacun d'eux : la réponse n'est jamais
// recopiée, elle est calculée. Un test vérifie qu'on retrouve bien 35 et 11,
// deux nombres établis depuis longtemps ; s'ils tombent juste, c'est que la
// simulation de pliage est correcte, et pas seulement que la liste est bien
// tapée. Une liste recopiée serait juste sans rien prouver, et fausse en
// silence le jour où on la touche.
//
// COMMENT ON PLIE, SANS TROIS DIMENSIONS. On fait ROULER un cube sur la
// feuille. Il pose une face sur la première case ; passer à la case voisine,
// c'est le basculer par-dessus l'arête commune, et une autre face se retrouve
// dessous. On parcourt ainsi tout l'hexomino en notant quelle face atterrit sur
// quelle case. Si deux cases reçoivent la même face, le patron se recouvre et
// ne se ferme pas ; si les six faces sont différentes, il se ferme.
//
// ET LES FACES OPPOSÉES SORTENT DU MÊME CALCUL. « Quelle case sera en face de
// celle-ci ? » est la question qui reste difficile même quand on sait
// reconnaître un patron, parce qu'on ne peut pas la lire sur le dessin. On la
// répond ici sans effort supplémentaire : le roulement conserve les paires
// opposées, donc `opposee(f) = f ^ 1`.

/**
 * LES SIX FACES, PAR PAIRES OPPOSÉES.
 *
 * L'ordre n'est pas arbitraire : 0/1, 2/3 et 4/5 sont les trois paires, et le
 * roulement les préserve — c'est ce qui rend `opposee` aussi simple.
 */
export const opposee = (f) => f ^ 1;

const DEBUT = { bas: 0, haut: 1, nord: 2, sud: 3, est: 4, ouest: 5 };

/**
 * FAIRE ROULER LE CUBE D'UNE CASE.
 *
 * Basculer vers l'est, c'est pivoter autour de l'arête est du bas : la face qui
 * regardait l'est se retrouve dessous, celle du dessous part à l'ouest. Le nord
 * et le sud ne bougent pas. Les trois autres sens s'en déduisent.
 */
function rouler(o, sens) {
    switch (sens) {
        case 'est': return { bas: o.est, est: o.haut, haut: o.ouest, ouest: o.bas, nord: o.nord, sud: o.sud };
        case 'ouest': return { bas: o.ouest, ouest: o.haut, haut: o.est, est: o.bas, nord: o.nord, sud: o.sud };
        case 'sud': return { bas: o.sud, sud: o.haut, haut: o.nord, nord: o.bas, est: o.est, ouest: o.ouest };
        case 'nord': return { bas: o.nord, nord: o.haut, haut: o.sud, sud: o.bas, est: o.est, ouest: o.ouest };
        default: return o;
    }
}

const VOISINS = [
    { dx: 1, dy: 0, sens: 'est' },
    { dx: -1, dy: 0, sens: 'ouest' },
    { dx: 0, dy: 1, sens: 'sud' },
    { dx: 0, dy: -1, sens: 'nord' }
];

const cle = (x, y) => `${x},${y}`;

/**
 * PLIER UN HEXOMINO, ET DIRE CE QU'IL DEVIENT.
 *
 * @returns {{ ok: boolean, faces: Object, doublons: string[] }}
 *   `faces` associe chaque case à la face du cube qui s'y pose ; `doublons`
 *   nomme les cases qui reçoivent une face déjà prise — ce sont elles qui se
 *   recouvrent, et c'est ce qu'on montre à l'élève quand il s'est trompé.
 */
export function plier(cellules) {
    if (!cellules || !cellules.length) return { ok: false, faces: {}, doublons: [] };
    const dans = new Set(cellules.map(([x, y]) => cle(x, y)));
    const faces = {};
    const prises = new Map();          // face du cube → première case qui l'a prise
    const doublons = [];
    const [x0, y0] = cellules[0];
    const file = [[x0, y0, DEBUT]];
    faces[cle(x0, y0)] = DEBUT.bas;
    prises.set(DEBUT.bas, cle(x0, y0));

    while (file.length) {
        const [x, y, o] = file.shift();
        for (const v of VOISINS) {
            const k = cle(x + v.dx, y + v.dy);
            if (!dans.has(k) || faces[k] !== undefined) continue;
            const suivante = rouler(o, v.sens);
            faces[k] = suivante.bas;
            if (prises.has(suivante.bas)) doublons.push(k);
            else prises.set(suivante.bas, k);
            file.push([x + v.dx, y + v.dy, suivante]);
        }
    }

    // Une figure non connexe laisserait des cases sans face : ce n'est pas un
    // patron non plus, et pour une autre raison — on le dit distinctement.
    const toutes = cellules.every(([x, y]) => faces[cle(x, y)] !== undefined);
    return { ok: toutes && !doublons.length && prises.size === 6, faces, doublons };
}

/** Sur un patron valide : la case qui se retrouvera en face de `case_`. */
export function faceOpposee(cellules, caseCle) {
    const { ok, faces } = plier(cellules);
    if (!ok) return null;
    const cible = opposee(faces[caseCle]);
    return Object.keys(faces).find(k => faces[k] === cible) || null;
}

// --- L'univers complet des hexominos ----------------------------------------

/** Les huit symétries du carré, appliquées à une case. */
const SYMETRIES = [
    ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
    ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x]
];

const range = (cs) => {
    const c = [...cs].sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
    return c;
};

/** Le nom unique d'une forme, à translation et symétrie près. */
export function canonique(cellules) {
    let best = null;
    for (const s of SYMETRIES) {
        const t = cellules.map(s);
        const minX = Math.min(...t.map(c => c[0])), minY = Math.min(...t.map(c => c[1]));
        const nom = range(t.map(([x, y]) => [x - minX, y - minY])).map(c => c.join(',')).join(' ');
        if (best === null || nom < best) best = nom;
    }
    return best;
}

/** La forme normalisée : collée en haut à gauche, cases triées. */
export function normaliser(cellules) {
    const minX = Math.min(...cellules.map(c => c[0])), minY = Math.min(...cellules.map(c => c[1]));
    return range(cellules.map(([x, y]) => [x - minX, y - minY]));
}

/**
 * TOUS LES POLYOMINOS LIBRES DE `n` CASES, par croissance.
 *
 * On part d'une case et l'on ajoute une voisine à chaque tour, en dédoublonnant
 * par le nom canonique — sinon la même forme reviendrait par des dizaines de
 * chemins différents. Pour n = 6, cela donne trente-cinq formes ; c'est un
 * nombre connu, et un test s'en sert pour valider l'énumération.
 */
export function polyominos(n) {
    let courant = new Map([[canonique([[0, 0]]), [[0, 0]]]]);
    for (let taille = 1; taille < n; taille++) {
        const suivant = new Map();
        for (const forme of courant.values()) {
            const dans = new Set(forme.map(([x, y]) => cle(x, y)));
            for (const [x, y] of forme) {
                for (const v of VOISINS) {
                    const nx = x + v.dx, ny = y + v.dy;
                    if (dans.has(cle(nx, ny))) continue;
                    const grand = normaliser([...forme, [nx, ny]]);
                    const nom = canonique(grand);
                    if (!suivant.has(nom)) suivant.set(nom, grand);
                }
            }
        }
        courant = suivant;
    }
    return [...courant.values()];
}

/** Les trente-cinq hexominos, calculés une fois. */
export const HEXOMINOS = polyominos(6);

/** Ceux qui se ferment en cube — onze, et personne ne les a recopiés. */
export const PATRONS = HEXOMINOS.filter(h => plier(h).ok);

/** Ceux qui ne se ferment pas — vingt-quatre. */
export const FAUX = HEXOMINOS.filter(h => !plier(h).ok);

/**
 * LA FAMILLE D'UN PATRON, telle qu'on la nomme au collège.
 *
 * Les onze patrons se rangent en quatre familles selon la longueur de leurs
 * bandes : 1-4-1 (six patrons, les plus faciles à voir), 2-3-1 (trois), 2-2-2
 * et 3-3 (un chacun, les plus déroutants). Cette classification n'est pas
 * décorative : elle donne l'ordre de la progression, et elle donne un mot à
 * l'élève pour dire ce qu'il reconnaît.
 */
export function profil(cellules) {
    const parLigne = {}, parColonne = {};
    normaliser(cellules).forEach(([x, y]) => {
        parLigne[y] = (parLigne[y] || 0) + 1;
        parColonne[x] = (parColonne[x] || 0) + 1;
    });
    const lire = (o) => Object.keys(o).map(Number).sort((a, b) => a - b).map(k => o[k]).join('-');
    // On garde la lecture qui contient la plus longue bande : c'est celle qui
    // se nomme, « une bande de quatre avec une case de chaque côté ».
    const l = lire(parLigne), c = lire(parColonne);
    const plusLong = (s) => Math.max(...s.split('-').map(Number));
    // ET LE SENS DE LECTURE NE DOIT PAS CHANGER LE NOM. Lu par en bas, le
    // patron « 2-3-1 » s'écrivait « 1-3-2 » — deux noms pour une seule famille,
    // et l'élève à qui l'on dit « c'est un 2-3-1 » ne s'y retrouvait plus. On
    // fixe le sens en gardant la lecture qui commence par le plus grand.
    const brut = plusLong(l) >= plusLong(c) ? l : c;
    const envers = brut.split('-').reverse().join('-');
    return brut <= envers ? envers : brut;
}

// --- La progression ---------------------------------------------------------

export const FAMILLES = {
    reconnaitre: {
        label: 'Est-ce un patron de cube ?',
        aide: 'On devine, puis on plie et on voit. La réponse ne se lit pas sur le dessin.'
    },
    opposees: {
        label: 'Quelle face sera en face ?',
        aide: 'Sur un patron valide, retrouver les deux carrés qui se feront face une fois plié.'
    }
};

export const ORDRE_FAMILLES = ['reconnaitre', 'opposees'];

/**
 * L'ORDRE DE DIFFICULTÉ, ET IL EST MESURÉ PLUTÔT QUE DEVINÉ.
 *
 * Un hexomino est d'autant plus facile à trancher qu'il ressemble à ce que
 * l'élève a vu : la grande croix et la bande de quatre se reconnaissent, le
 * rectangle 2 × 3 se refuse d'un coup d'œil une fois qu'on s'est fait avoir.
 * Les cas durs sont ceux dont le profil est 2-2-2 ou 3-3, valides ou non.
 */
export function difficulte(cellules) {
    const p = profil(cellules);
    const plusLongue = Math.max(...p.split('-').map(Number));
    // TROIS PALIERS, ET LE PREMIER EST CELUI DES ÉVIDENCES. Une bande de cinq
    // ou six cases se refuse d'un coup d'œil : elle a sa place au début et
    // nulle part ailleurs. J'avais d'abord rangé toute forme d'au moins quatre
    // cases alignées dans ce palier, et la moitié d'une série se remplissait de
    // bandes droites — la mesure disait 17 formes faciles sur 35, mais ce
    // n'était pas la même facilité.
    if (plusLongue >= 5) return 1;
    if (plusLongue === 4) return 2;
    return 3;
}

/**
 * UNE SÉRIE DE QUESTIONS, DU PLUS SIMPLE AU PLUS RETORS.
 *
 * On ne tire pas au hasard dans le tas : on trie par difficulté et l'on tire
 * DANS chaque palier, en alternant vrais et faux patrons pour qu'aucune série
 * ne réponde « oui » cinq fois de suite — un élève qui repère le rythme cesse
 * de plier, et c'est plier qu'on veut.
 */
export function preparerSerie(rng, { familles = ORDRE_FAMILLES, combien = 8 } = {}) {
    const actives = familles.length ? familles : ORDRE_FAMILLES;
    const questions = [];

    // LE PALIER DES ÉVIDENCES SERT UNE FOIS, PAS QUATRE.
    //
    // Mesuré : sur une série de huit, les quatre intrus tombaient toujours sur
    // les quatre bandes droites — parce que le palier 1 ne contient AUCUN
    // patron valide, si bien que les « oui » commençaient au palier 2 pendant
    // que les « non » épuisaient le palier 1. Un élève passait la moitié de
    // l'exercice à refuser des bâtons de six cases. On en garde UNE, en
    // ouverture, pour dire ce qu'on attend ; le reste se joue sur les formes
    // qui demandent qu'on plie.
    const parPalier = (liste) => {
        const p = { 1: [], 2: [], 3: [] };
        liste.forEach(h => p[difficulte(h)].push(h));
        return [rng.shuffle(p[1]).slice(0, 1), rng.shuffle(p[2]), rng.shuffle(p[3])].flat();
    };

    if (actives.includes('reconnaitre')) {
        const vrais = parPalier(PATRONS), faux = parPalier(FAUX);
        const combienIci = actives.length > 1 ? Math.ceil(combien / 2) : combien;
        // ON ÉQUILIBRE PAR PAIRES, PUIS ON BAT CHAQUE PAIRE.
        //
        // La première version alternait strictement un vrai, un faux : le
        // compte était juste, mais la série répondait oui, non, oui, non — et
        // un élève qui repère ce rythme au deuxième coup répond sans regarder,
        // ce qui est exactement le contraire du but. Chaque paire porte
        // toujours un patron et un intrus, dans un ordre tiré au sort ; la
        // difficulté monte quand même, puisque les paires sont formées dans
        // l'ordre des paliers.
        const suite = [];
        for (let i = 0; suite.length < combienIci; i++) {
            rng.shuffle([vrais[i % vrais.length], faux[i % faux.length]])
                .forEach(f => suite.push(f));
        }
        suite.slice(0, combienIci).forEach(forme => questions.push({
            famille: 'reconnaitre', forme: normaliser(forme),
            reponse: plier(forme).ok, profil: profil(forme)
        }));
    }

    if (actives.includes('opposees')) {
        const vrais = parPalier(PATRONS);
        const combienIci = actives.length > 1 ? Math.floor(combien / 2) : combien;
        for (let i = 0; i < combienIci; i++) {
            const forme = normaliser(vrais[i % vrais.length]);
            const cases = forme.map(([x, y]) => cle(x, y));
            const depart = rng.pick(cases);
            questions.push({
                famille: 'opposees', forme, depart,
                reponse: faceOpposee(forme, depart), profil: profil(forme)
            });
        }
    }

    return questions;
}

/**
 * LA CONSIGNE NE DONNE PAS LA RÉPONSE.
 *
 * Rémy, sur un exercice précédent : « tu donnes les réponses dans l'énoncé ».
 * Elle dit la tâche, jamais la méthode ni le nombre de patrons existants —
 * savoir qu'il y en a onze aiderait à compter au lieu de plier.
 */
export const CONSIGNES = {
    reconnaitre: 'Cette figure se plie-t-elle en cube ? Décide, puis regarde-la se plier.',
    opposees: 'Une fois le cube plié, quel carré se retrouvera en face du carré marqué ?'
};
