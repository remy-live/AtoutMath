// LE QUADRILATÈRE QUI SE TRANSFORME — une propriété est une CONTRAINTE.
//
// Rémy : « on a un quadrilatère qui n'a rien de particulier, et on a des
// vignettes que l'on peut faire glisser sur le quadrilatère du genre côté
// opposé parallèle, et on voit le quadrilatère se transformer en absorbant la
// nouvelle propriété et on doit deviner ce que ça va devenir. »
//
// C'EST L'ORGANIGRAMME À L'ENVERS, et c'est ce qui en fait le meilleur point
// d'entrée du chapitre. L'organigramme demande de CLASSER des figures finies :
// c'est un exercice de lecture de l'arbre. Celui-ci demande de le CONSTRUIRE.
// Une propriété n'y est plus une étiquette, c'est une contrainte — et l'élève
// voit de ses yeux qu'ajouter une contrainte RÉTRÉCIT la famille. C'est l'idée
// que les élèves n'ont pas, et qu'aucun manuel ne peut montrer, parce qu'il
// faudrait que la figure bouge.
//
// AUCUNE IMPASSE N'EST POSSIBLE, et c'est ce qui rend l'exploration libre :
// toutes les vignettes sont des propriétés « en plus », et le carré les vérifie
// TOUTES. N'importe quelle combinaison a donc une solution, et l'élève ne peut
// jamais se coincer.
//
// LE VRAI TRAVAIL EST QUE LA FIGURE NE TRICHE PAS. Quand on lâche « quatre
// côtés égaux », il faut un losange qu'on VOIT ne pas être un carré — sinon
// l'élève répond « carré », et il a raison de le répondre. Le solveur porte
// donc deux forces : il annule ce qu'on lui demande, et il REPOUSSE ce qu'on ne
// lui a pas demandé. La figure se pose alors sur le cas le plus générique de sa
// famille, et c'est cela qui rend l'exercice honnête.
//
// Aucun DOM ici : on reçoit quatre points et une liste de propriétés, on rend
// quatre points et un nom. C'est ce qui permet de le tester.

import { makeRng } from './ids.js';
// Les figures de référence des six familles vivent avec l'organigramme : ce
// sont les mêmes qu'on montre dans l'autre exercice, et elles servent ici de
// point de départ de secours quand la déformation ne trouve pas son chemin.
import { FAMILLES } from './quadrilateres.js';

/** Le repère de travail : un carré de 100, comme les figures de l'organigramme. */
export const CADRE = 100;

// --- Les quatre caractères qui décident de tout --------------------------------
//
// Toute la hiérarchie du collège tient à quatre questions, et à elles seules :
// la première paire de côtés est-elle parallèle, la seconde aussi, les quatre
// côtés sont-ils égaux, y a-t-il un angle droit. Le reste — les diagonales, les
// côtés opposés égaux — est une AUTRE FAÇON de dire ces quatre-là, et c'est
// justement ce que l'exercice fait découvrir.

const CARACTERES = ['par1', 'par2', 'egaux', 'droit'];

/**
 * LES VIGNETTES. Chacune porte une propriété, et dit ce qu'elle IMPLIQUE.
 *
 * `implique(c, actives)` reçoit les caractères déjà acquis et les complète.
 * C'est là que vit la géométrie du chapitre : quatre côtés égaux font un
 * losange (donc un parallélogramme), et des diagonales perpendiculaires ne
 * disent rien... sauf dans un parallélogramme, où elles font un losange. Un
 * élève qui découvre cette dépendance a compris quelque chose.
 */
export const PROPRIETES = [
    {
        id: 'unePaireParallele',
        nom: 'Deux côtés opposés parallèles',
        court: '2 côtés parallèles',
        dit: 'une paire de côtés opposés est parallèle',
        implique: (c) => { c.par1 = true; }
    },
    {
        id: 'opposesParalleles',
        nom: 'Les côtés opposés parallèles deux à deux',
        court: 'côtés opposés parallèles',
        dit: 'les deux paires de côtés opposés sont parallèles',
        implique: (c) => { c.par1 = true; c.par2 = true; }
    },
    {
        id: 'cotesOpposesEgaux',
        nom: 'Les côtés opposés de même longueur',
        court: 'côtés opposés égaux',
        dit: 'chaque côté a la même longueur que celui d\'en face',
        // Un quadrilatère dont les côtés opposés sont égaux deux à deux EST un
        // parallélogramme : c'est un théorème du programme, et le voir arriver
        // vaut mieux que l'apprendre.
        implique: (c) => { c.par1 = true; c.par2 = true; },
        surprise: 'Des côtés opposés égaux suffisent : la figure est forcément un '
            + 'parallélogramme. C\'est un théorème, et tu viens de le voir se produire.'
    },
    {
        id: 'diagonalesMilieu',
        nom: 'Les diagonales se coupent en leur milieu',
        court: 'diagonales : même milieu',
        dit: 'les deux diagonales se coupent en leur milieu',
        implique: (c) => { c.par1 = true; c.par2 = true; },
        surprise: 'Des diagonales qui se coupent en leur milieu font, elles aussi, un '
            + 'parallélogramme. Trois chemins différents mènent donc au même endroit.'
    },
    {
        id: 'quatreCotesEgaux',
        nom: 'Les quatre côtés de même longueur',
        court: '4 côtés égaux',
        dit: 'les quatre côtés ont la même longueur',
        implique: (c) => { c.par1 = true; c.par2 = true; c.egaux = true; }
    },
    {
        id: 'unAngleDroit',
        nom: 'Un angle droit',
        court: 'un angle droit',
        dit: 'l\'un des angles est droit',
        implique: (c) => { c.droit = true; }
    },
    {
        id: 'diagonalesEgales',
        nom: 'Les diagonales de même longueur',
        court: 'diagonales égales',
        dit: 'les deux diagonales ont la même longueur',
        // SEULE, elle ne dit rien. Dans un parallélogramme, elle fait un
        // rectangle — et c'est précisément ce qu'on veut faire remarquer.
        implique: (c) => { if (c.par1 && c.par2) c.droit = true; },
        seule: 'Des diagonales de même longueur, dans un quadrilatère quelconque, '
            + 'ne donnent rien de particulier. Réessaie sur un parallélogramme.'
    },
    {
        id: 'diagonalesPerpendiculaires',
        nom: 'Les diagonales perpendiculaires',
        court: 'diagonales perpendiculaires',
        dit: 'les deux diagonales se coupent à angle droit',
        implique: (c) => { if (c.par1 && c.par2) c.egaux = true; },
        seule: 'Des diagonales perpendiculaires, toutes seules, ne donnent pas de figure '
            + 'du cours. Dans un parallélogramme, en revanche, elles font un losange.'
    }
];

export const proprieteDe = (id) => PROPRIETES.find(p => p.id === id) || null;

/**
 * Les caractères acquis après avoir posé ces vignettes-là.
 *
 * ON REPASSE JUSQU'À CE QUE PLUS RIEN NE BOUGE, et ce n'est pas une précaution
 * d'écriture : l'ordre de pose compte. « Diagonales perpendiculaires » puis
 * « côtés opposés parallèles » doit donner un losange, comme l'ordre inverse —
 * la géométrie ne se souvient pas de la chronologie.
 */
export function caracteresDe(actives) {
    const c = { par1: false, par2: false, egaux: false, droit: false };
    for (let tour = 0; tour < PROPRIETES.length; tour++) {
        const avant = CARACTERES.map(k => c[k]).join('');
        actives.forEach(id => { const p = proprieteDe(id); if (p) p.implique(c); });
        if (CARACTERES.map(k => c[k]).join('') === avant) break;
    }
    return c;
}

/** Le nom de la famille, à partir des quatre caractères. */
export function familleDeCaracteres(c) {
    if (c.par1 && c.par2) {
        if (c.egaux && c.droit) return 'carre';
        if (c.droit) return 'rectangle';
        if (c.egaux) return 'losange';
        return 'parallelogramme';
    }
    return c.par1 ? 'trapeze' : 'quadrilatere';
}

/** Ce que devient la figure une fois ces vignettes posées. */
export const familleApres = (actives) => familleDeCaracteres(caracteresDe(actives));

// --- Mesurer une figure --------------------------------------------------------

const sous = (p, q) => [p[0] - q[0], p[1] - q[1]];
const norme = (u) => Math.hypot(u[0], u[1]);
const croix = (u, v) => u[0] * v[1] - u[1] * v[0];
const scal = (u, v) => u[0] * v[0] + u[1] * v[1];

/** Le sinus de l'angle entre deux directions : nul quand elles sont parallèles. */
const sinus = (u, v) => {
    const n = norme(u) * norme(v);
    return n < 1e-9 ? 0 : croix(u, v) / n;
};
/** Le cosinus : nul quand elles sont perpendiculaires. */
const cosinus = (u, v) => {
    const n = norme(u) * norme(v);
    return n < 1e-9 ? 0 : scal(u, v) / n;
};

/**
 * LES ÉCARTS QU'ON MESURE SUR UNE FIGURE, tous ramenés à la même échelle : un
 * sinus pour les angles, une fraction du cadre pour les longueurs. Sans cela,
 * « 3 degrés » et « 3 millimètres » pèseraient le même poids dans la somme, et
 * la figure choisirait au hasard laquelle des deux contraintes trahir.
 */
export function ecarts(P) {
    const [A, B, C, D] = P;
    const AB = sous(B, A), BC = sous(C, B), CD = sous(D, C), DA = sous(A, D);
    const cotes = [norme(AB), norme(BC), norme(CD), norme(DA)];
    const moyen = cotes.reduce((a, b) => a + b, 0) / 4 || 1;
    return {
        // AB parallèle à DC (et non à CD : les côtés opposés se parcourent en
        // sens inverse, et le sinus ne s'en soucie pas — mais le lecteur, si).
        par1: sinus(AB, sous(C, D)),
        par2: sinus(BC, sous(D, A)),
        // Les quatre côtés égaux : le plus grand écart à la moyenne suffit.
        egaux: Math.max(...cotes.map(l => (l - moyen) / CADRE)),
        droit: cosinus(AB, sous(D, A)),
        // Les côtés opposés deux à deux, et les diagonales.
        opposes: Math.max(Math.abs(cotes[0] - cotes[2]), Math.abs(cotes[1] - cotes[3])) / CADRE,
        diagEgales: (norme(sous(C, A)) - norme(sous(D, B))) / CADRE,
        diagPerp: cosinus(sous(C, A), sous(D, B)),
        diagMilieu: Math.max(
            Math.abs((A[0] + C[0]) - (B[0] + D[0])),
            Math.abs((A[1] + C[1]) - (B[1] + D[1]))) / CADRE
    };
}

/** Les tolérances : au-delà, l'œil voit la différence. */
const TOL = { angle: 0.035, longueur: 0.02 };

/**
 * LE NOM DE CE QUI EST DESSINÉ — et non de ce qu'on a demandé.
 *
 * C'est la garantie de l'exercice : la réponse attendue est LUE sur la figure
 * finale, pas déduite des vignettes posées. Si le solveur ratait sa cible, le
 * jeu demanderait le nom de ce qu'il montre, jamais celui de ce qu'il visait.
 */
export function nommerFigure(P) {
    const e = ecarts(P);
    const c = {
        par1: Math.abs(e.par1) < TOL.angle,
        par2: Math.abs(e.par2) < TOL.angle,
        egaux: Math.abs(e.egaux) < TOL.longueur,
        droit: Math.abs(e.droit) < TOL.angle
    };
    // Une seule paire suffit au trapèze, quelle que soit laquelle.
    if (!c.par1 && c.par2) return familleDeCaracteres({ ...c, par1: true, par2: false });
    return familleDeCaracteres(c);
}

// --- Le solveur ----------------------------------------------------------------

/** Les contraintes à annuler, pour ces caractères-là. */
function contraintes(c, actives) {
    const g = [];
    if (c.par1) g.push((e) => e.par1);
    if (c.par2) g.push((e) => e.par2);
    if (c.egaux) g.push((e) => e.egaux * 6);      // une longueur pèse moins qu'un angle
    if (c.droit) g.push((e) => e.droit);
    // Les vignettes de diagonales sont satisfaites par la famille, mais on les
    // écrit quand même : la figure doit MONTRER ce que l'élève a posé, même
    // quand elle l'obtiendrait par ailleurs.
    if (actives.includes('diagonalesEgales')) g.push((e) => e.diagEgales * 6);
    if (actives.includes('diagonalesPerpendiculaires')) g.push((e) => e.diagPerp);
    if (actives.includes('diagonalesMilieu')) g.push((e) => e.diagMilieu * 6);
    if (actives.includes('cotesOpposesEgaux')) g.push((e) => e.opposes * 6);
    return g;
}

/** Ce qu'il faut au contraire TENIR À DISTANCE — sinon la figure triche. */
function repulsions(c) {
    const r = [];
    // MARGE : un demi-sinus de 0,22 fait douze degrés, une longueur de 0,10
    // fait dix unités sur cent. En dessous, l'œil hésite — et un losange qui
    // « a l'air » carré rend la question injuste.
    if (!c.par1) r.push({ lire: (e) => e.par1, marge: 0.22 });
    if (!c.par2) r.push({ lire: (e) => e.par2, marge: 0.22 });
    if (!c.egaux) r.push({ lire: (e) => e.egaux, marge: 0.10 });
    if (!c.droit) r.push({ lire: (e) => e.droit, marge: 0.22 });
    return r;
}

/**
 * L'ÉNERGIE D'UNE FIGURE : ce qu'elle doit annuler, ce qu'elle doit fuir, et ce
 * qui la garde dessinable.
 *
 * Le dernier terme n'est pas une commodité : sans lui, la façon la moins
 * coûteuse de rendre deux côtés parallèles est de les faire disparaître, et le
 * solveur aplatit la figure jusqu'au segment. On lui interdit donc les côtés
 * trop courts, l'aire trop petite, et la sortie du cadre.
 */
function energie(P, buts, repousse, ancre) {
    const e = ecarts(P);
    let E = 0;
    for (const g of buts) { const v = g(e); E += v * v; }
    for (const r of repousse) {
        const v = Math.abs(r.lire(e));
        if (v < r.marge) { const d = r.marge - v; E += 3 * d * d; }
    }
    // Rester dessinable : des côtés d'au moins 22, une aire d'au moins 1 200.
    const cotes = P.map((p, i) => norme(sous(P[(i + 1) % 4], p)));
    cotes.forEach(l => { if (l < 22) { const d = (22 - l) / CADRE; E += 8 * d * d; } });
    const aire = Math.abs(croix(sous(P[1], P[0]), sous(P[3], P[0]))
        + croix(sous(P[3], P[2]), sous(P[1], P[2]))) / 2;
    if (aire < 1200) { const d = (1200 - aire) / (CADRE * CADRE); E += 12 * d * d; }
    // Et rester dans le cadre, avec une marge pour les étiquettes.
    P.forEach(p => p.forEach(v => {
        if (v < 8) E += 4 * ((8 - v) / CADRE) ** 2;
        if (v > CADRE - 8) E += 4 * ((v - CADRE + 8) / CADRE) ** 2;
    }));
    // LA FIGURE NE PART PAS SE PROMENER. On la veut RECONNAISSABLE d'un état à
    // l'autre : c'est la même figure qui se déforme, pas une autre qui la
    // remplace. Un rappel faible vers la position de départ suffit.
    if (ancre) {
        P.forEach((p, i) => {
            const d = norme(sous(p, ancre[i])) / CADRE;
            E += 0.05 * d * d;
        });
    }
    return E;
}

/**
 * LA FIGURE SE POSE : descente de gradient, gradient calculé aux différences
 * finies. Huit inconnues et une trentaine d'itérations par pas — c'est
 * instantané, et cela évite d'écrire à la main la dérivée de huit contraintes
 * dont chacune changerait au premier ajout de vignette.
 */
export function poserFigure(depart, actives, opts = {}) {
    const c = caracteresDe(actives);
    const vise = familleDeCaracteres(c);
    const buts = contraintes(c, actives);
    const repousse = repulsions(c);

    // PLUSIEURS DÉPARTS, ET L'ON VÉRIFIE L'ARRIVÉE.
    //
    // Une descente de gradient tombe dans le creux le plus proche, et le plus
    // proche n'est pas toujours le bon : mesuré sur les 111 combinaisons de
    // vignettes, trois s'arrêtaient à mi-chemin — un trapèze dont les côtés
    // faisaient encore quatorze degrés d'écart, un rectangle dont l'angle
    // n'était droit qu'à deux degrés près. On repart donc d'ailleurs, et l'on
    // RELIT la figure obtenue : la première qui porte vraiment le bon nom est
    // la bonne. Les départs de secours sont les figures de référence de la
    // famille visée — un rectangle cherche son chemin plus vite en partant
    // d'un rectangle.
    const secours = FAMILLES.find(f => f.id === vise);
    const departs = [depart];
    for (let k = 1; k <= 3; k++) departs.push(bouger(depart, k * 5, k));
    if (secours) for (let k = 0; k < 3; k++) departs.push(bouger(secours.figure, 4 + k * 4, 7 + k));

    let meilleur = null, meilleureE = Infinity;
    for (const d of departs) {
        const P = descendre(d, buts, repousse, opts);
        const E = energie(P, buts, repousse, d);
        if (nommerFigure(P) === vise) return arrondir(P);
        if (E < meilleureE) { meilleureE = E; meilleur = P; }
    }
    return arrondir(meilleur || depart);
}

/** Un départ voisin, déterministe : la même figure, poussée du coude. */
function bouger(P, ampleur, graine) {
    let n = graine * 2654435761 % 2147483647;
    const suivant = () => { n = (n * 48271) % 2147483647; return n / 2147483647 - 0.5; };
    return P.map(p => [
        Math.max(10, Math.min(CADRE - 10, p[0] + suivant() * ampleur * 2)),
        Math.max(10, Math.min(CADRE - 10, p[1] + suivant() * ampleur * 2))
    ]);
}

const arrondir = (P) => P.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);

function descendre(depart, buts, repousse, { tours = 1400, pas = 3.2 } = {}) {
    const ancre = depart.map(p => [...p]);
    let P = depart.map(p => [...p]);
    let h = pas;

    for (let t = 0; t < tours; t++) {
        const E0 = energie(P, buts, repousse, ancre);
        if (E0 < 1e-7) break;
        // Le gradient, coordonnée par coordonnée.
        const G = [];
        const eps = 0.02;
        for (let i = 0; i < 4; i++) {
            for (let k = 0; k < 2; k++) {
                P[i][k] += eps;
                const Ep = energie(P, buts, repousse, ancre);
                P[i][k] -= 2 * eps;
                const Em = energie(P, buts, repousse, ancre);
                P[i][k] += eps;
                G.push((Ep - Em) / (2 * eps));
            }
        }
        const Q = P.map((p, i) => [p[0] - h * G[i * 2], p[1] - h * G[i * 2 + 1]]);
        // UN PAS QUI AGGRAVE EST UN PAS TROP GRAND : on le réduit au lieu de le
        // jouer. C'est ce qui évite l'oscillation autour de la solution.
        if (energie(Q, buts, repousse, ancre) < E0) { P = Q; h = Math.min(h * 1.08, 8); }
        else h *= 0.55;
        if (h < 1e-5) break;
    }
    return P;
}

// --- L'exercice ----------------------------------------------------------------

/**
 * LA FIGURE DE DÉPART : un quadrilatère qui n'a VRAIMENT rien de particulier.
 *
 * Rémy : « on a un quadrilatère qui n'a rien de particulier ». Tiré au hasard,
 * il tombe une fois sur cinq sur deux côtés presque parallèles — et l'élève
 * croit alors voir un trapèze avant d'avoir rien posé. On le fait donc passer
 * par le solveur, avec zéro contrainte : les répulsions l'écartent de tout.
 */
export function figureDeDepart(rng) {
    const brut = [
        [12 + rng.int(0, 10), 16 + rng.int(0, 12)],
        [72 + rng.int(0, 14), 10 + rng.int(0, 10)],
        [76 + rng.int(0, 14), 62 + rng.int(0, 14)],
        [14 + rng.int(0, 14), 70 + rng.int(0, 14)]
    ];
    return poserFigure(brut, []);
}

export const PALIERS = {
    decouverte: {
        label: 'Une seule propriété à la fois — les côtés',
        cartes: ['unePaireParallele', 'opposesParalleles', 'quatreCotesEgaux', 'unAngleDroit'],
        poses: 1
    },
    chemin: {
        label: 'Deux propriétés à la suite — on descend l\'arbre',
        cartes: ['unePaireParallele', 'opposesParalleles', 'quatreCotesEgaux', 'unAngleDroit'],
        poses: 2
    },
    diagonales: {
        label: 'Les diagonales aussi disent la figure',
        cartes: ['opposesParalleles', 'diagonalesMilieu', 'diagonalesEgales',
            'diagonalesPerpendiculaires', 'cotesOpposesEgaux'],
        poses: 2
    },
    tout: {
        label: 'Toutes les propriétés, jusqu\'au carré',
        cartes: PROPRIETES.map(p => p.id),
        poses: 3
    }
};

/**
 * UN DÉFI : la figure de départ, les vignettes offertes, et de quoi juger.
 *
 * L'état est TOUT ce qui a été posé, jamais la figure seule : c'est en
 * rejouant la liste qu'on retrouve la figure, et c'est ce qui permet de revenir
 * en arrière — retirer une vignette est aussi instructif que la poser.
 */
export function genererDefi({ rng = makeRng(1), palier = 'decouverte' } = {}) {
    const P = PALIERS[palier] || PALIERS.decouverte;
    const depart = figureDeDepart(rng);
    return {
        palier,
        depart,
        points: depart,
        posees: [],
        cartes: rng.shuffle([...P.cartes]),
        aPoser: P.poses,
        famille: 'quadrilatere'
    };
}

/**
 * ON POSE UNE VIGNETTE : la figure d'après, et ce qu'il faut en dire.
 *
 * @returns {{points, famille, avant, nouveau, mot}}
 *   `nouveau` est faux quand la propriété ne change RIEN — parce qu'elle était
 *   déjà vraie. Ce n'est pas une erreur, c'est une découverte : « un carré a
 *   déjà ses côtés opposés parallèles », et il faut le dire au lieu de laisser
 *   croire que le clic n'a pas marché.
 */
export function poser(etat, propId) {
    const prop = proprieteDe(propId);
    if (!prop) return null;
    const avant = etat.famille;
    const posees = [...etat.posees, propId];
    const points = poserFigure(etat.points, posees);
    const famille = nommerFigure(points);
    return {
        posees, points, famille, avant,
        nouveau: famille !== avant,
        mot: motDeLaPose(prop, avant, famille)
    };
}

/**
 * CE QU'ON DIT À L'ÉLÈVE APRÈS LA TRANSFORMATION — et il y a trois cas, qui
 * enseignent trois choses différentes.
 */
function motDeLaPose(prop, avant, apres) {
    if (avant === apres) {
        return `La figure ne change pas : ${prop.dit} — mais c'était DÉJÀ vrai. `
            + 'Une propriété qu\'on a déjà ne rétrécit plus rien.';
    }
    if (apres === 'quadrilatere' && prop.seule) return prop.seule;
    if (prop.surprise) return prop.surprise;
    return `${prop.nom} : la famille se rétrécit.`;
}

/** Le chemin parcouru dans l'arbre, pour le dessiner à mesure. */
export function cheminDe(posees) {
    const etapes = ['quadrilatere'];
    for (let i = 1; i <= posees.length; i++) {
        const f = familleApres(posees.slice(0, i));
        if (f !== etapes[etapes.length - 1]) etapes.push(f);
    }
    return etapes;
}
