// LE VOLUME DES SOLIDES — le domaine : tirage, dessins cotés, énoncés, indices.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre, après l'inventaire du programme : « tu me fais les
// volumes ».
//
// C'ÉTAIT LE PLUS GROS TROU DU LOGICIEL : pas une compétence, pas un exercice,
// à aucun niveau. Le seul voisin, « Combien de Cubes ? », DÉNOMBRE un
// empilement et ne calcule aucun volume.
//
// ── LES SEPT MARCHES SONT LES SEPT SOLIDES DU COLLÈGE ─────────────────────
//
//   6ème   le pavé droit, puis le cube
//   5ème   le prisme droit, puis le cylindre
//   4ème   la pyramide, puis le cône
//   3ème   la boule
//
// ET L'ORDRE N'EST PAS CELUI DU PROGRAMME PAR HASARD : il est celui des
// FORMULES. Les quatre premières sont « aire de la base × hauteur » — le pavé
// et le cube en sont le cas où la base est un rectangle. Les deux suivantes
// sont la même chose DIVISÉE PAR TROIS, et c'est tout ce qu'il y a à retenir
// de neuf en 4ème. La boule est seule, et c'est pour cela qu'elle est dernière.
//
// ── POURQUOI π RESTE DANS LA RÉPONSE, POUR TROIS SOLIDES ──────────────────
//
// Cylindre, cône et boule donnent une valeur EXACTE : « 50π cm³ ». C'est le
// choix déjà fait pour « Le Périmètre et l'Aire du Disque », sur la demande de
// Rémy — « quand tu utilises le pavé numérique, demande une valeur exacte
// (rajoute le Pi) en symbole » —, et le pavé porte la touche π pour cela
// (`meta.pi`). Un arrondi ici mesurerait la calculatrice, pas le volume.
//
// ── LES NOMBRES SONT CHOISIS POUR QUE LA RÉPONSE SOIT ENTIÈRE ─────────────
//
// La hauteur d'une pyramide et d'un cône est tirée parmi les MULTIPLES DE
// TROIS, et le rayon d'une boule parmi les multiples de trois aussi. Sans
// cela, « divisé par 3 » rend un tiers, et l'élève se trompe d'erreur : il
// cherche la faute dans sa formule alors qu'elle est dans son écriture.

import { figure } from './figures.js';
// LE CADRE, LES COTES ET LES ÉTIQUETTES vivent dans `core/cotes.js` : les
// aires en ont eu besoin à leur tour, et une règle écrite à deux endroits
// finit par diverger.
import { pt, cote, etiquette, cadreSvg } from './cotes.js';

/* ── LES MARCHES ──────────────────────────────────────────────────────── */

export const MARCHES_VOLUME = [
    { id: 'pave', nom: '1. Le pavé droit (6ème)' },
    { id: 'cube', nom: '2. Le cube (6ème)' },
    { id: 'prisme', nom: '3. Le prisme droit (5ème)' },
    { id: 'cylindre', nom: '4. Le cylindre (5ème)' },
    { id: 'pyramide', nom: '5. La pyramide (4ème)' },
    { id: 'cone', nom: '6. Le cône (4ème)' },
    { id: 'boule', nom: '7. La boule (3ème)' }
];

/** Les trois solides dont la réponse garde son π. */
export const EXACTS_PI = ['cylindre', 'cone', 'boule'];

/** Les trois solides qu'on obtient en divisant par trois. */
export const TIERS = ['pyramide', 'cone'];

export const DIFFICULTE_VOLUME = {
    pave: 1, cube: 1, prisme: 2, cylindre: 2, pyramide: 3, cone: 3, boule: 4
};

const nb = (x) => String(Math.round(Number(x) * 100) / 100).replace('.', ',');

/* ── LE TIRAGE ────────────────────────────────────────────────────────── */

/**
 * Tire un solide et ses dimensions.
 *
 * Rend `{ marche, unite, dims, volume, piK }` où `volume` est le nombre à
 * écrire quand la réponse est un entier, et `piK` le coefficient devant π
 * quand elle est exacte. L'un des deux vaut toujours `null`.
 */
export function tirerVolume(rng, marche = 'pave', { unite = 'cm' } = {}) {
    const t = { marche, unite, dims: {}, volume: null, piK: null };
    switch (marche) {
        case 'pave': {
            // TROIS DIMENSIONS DIFFÉRENTES, ET C'EST VOULU : avec deux arêtes
            // égales, l'élève qui multiplie les deux mauvaises tombe juste, et
            // ni lui ni nous ne l'apprenons.
            const L = rng.int(4, 12);
            let l = rng.int(2, 9), h = rng.int(2, 9);
            while (l === L) l = rng.int(2, 9);
            while (h === L || h === l) h = rng.int(2, 9);
            t.dims = { L, l, h };
            t.volume = L * l * h;
            break;
        }
        case 'cube': {
            const a = rng.int(2, 9);
            t.dims = { a };
            t.volume = a * a * a;
            break;
        }
        case 'prisme': {
            // BASE TRIANGULAIRE, et la base d'un triangle fois sa hauteur est
            // tirée PAIRE : sans cela l'aire de base est un demi, et la faute
            // qu'on mesure n'est plus celle du volume.
            let b = rng.int(3, 10), hb = rng.int(2, 9);
            if ((b * hb) % 2) hb += 1;
            const H = rng.int(3, 12);
            t.dims = { b, hb, H };
            t.volume = (b * hb / 2) * H;
            break;
        }
        case 'cylindre': {
            // LA HAUTEUR NE DÉPASSE PAS TROIS FOIS LE RAYON. Au-delà, le
            // dessin est un tuyau de deux millimètres de large sur toute la
            // hauteur du cadre : la cote du rayon ne se lit plus, et c'est
            // elle qui porte la question.
            const r = rng.int(2, 7);
            const h = rng.int(3, Math.min(12, 3 * r));
            t.dims = { r, h };
            t.piK = r * r * h;
            break;
        }
        case 'pyramide': {
            // HAUTEUR MULTIPLE DE TROIS — voir l'en-tête.
            const c = rng.int(3, 10), h = 3 * rng.int(1, 5);
            t.dims = { c, h };
            t.volume = c * c * h / 3;
            break;
        }
        case 'cone': {
            // Même borne que le cylindre, et pour la même raison. La hauteur
            // reste multiple de trois pour que le ÷ 3 tombe juste.
            const r = rng.int(2, 7);
            const h = 3 * rng.int(1, Math.max(1, Math.min(5, Math.floor(r))));
            t.dims = { r, h };
            t.piK = r * r * h / 3;
            break;
        }
        case 'boule': {
            // RAYON MULTIPLE DE TROIS : 4r³/3 est alors entier. À r = 3 et
            // r = 6 on obtient 36π et 288π, qui restent des nombres qu'on peut
            // écrire ; au-delà la réponse cesse d'être lisible.
            const r = 3 * rng.int(1, 2);
            t.dims = { r };
            t.piK = 4 * r * r * r / 3;
            break;
        }
        default:
            return tirerVolume(rng, 'pave', { unite });
    }
    return t;
}

/* ── CE QU'ON DEMANDE, ET CE QU'ON ATTEND ─────────────────────────────── */

export const NOM_SOLIDE = {
    pave: 'ce pavé droit', cube: 'ce cube', prisme: 'ce prisme droit',
    cylindre: 'ce cylindre', pyramide: 'cette pyramide', cone: 'ce cône',
    boule: 'cette boule'
};

export function enonceDe(t) {
    return EXACTS_PI.includes(t.marche)
        ? `Calcule le volume de ${NOM_SOLIDE[t.marche]}. Donne la valeur EXACTE, avec π.`
        : `Calcule le volume de ${NOM_SOLIDE[t.marche]}.`;
}

/** Sur la feuille il n'y a pas de dessin : « CE pavé » n'y désigne rien. */
const UN_SOLIDE = {
    pave: 'un pavé droit', cube: 'un cube', prisme: 'un prisme droit à base triangulaire',
    cylindre: 'un cylindre', pyramide: 'une pyramide à base carrée', cone: 'un cône',
    boule: 'une boule'
};

/**
 * L'ÉNONCÉ DE LA FEUILLE, qui porte ses dimensions.
 *
 * Un énoncé juste à l'écran peut être SANS RÉPONSE POSSIBLE sur le papier :
 * « Calcule le volume de ce pavé droit » ne désigne rien quand le dessin n'y
 * est pas. C'est arrivé trois fois le 20 octobre, et c'est pour cela que le
 * dépôt demande de REGARDER la fiche imprimée.
 */
export function enoncePapierDe(t) {
    const exact = EXACTS_PI.includes(t.marche) ? ' Donne la valeur EXACTE, avec π.' : '';
    return `Calcule le volume ${UN_SOLIDE[t.marche].replace(/^un(e?) /, (m, e) => (e ? "d'une " : "d'un "))}`
        + ` : ${dimensionsEcrites(t)}.${exact}`;
}

/** Ce que l'élève tape : « 240 » ou « 50π ». L'unité s'affiche à côté. */
export function reponseDe(t) {
    return t.piK === null ? String(t.volume) : `${t.piK === 1 ? '' : nb(t.piK)}π`;
}

/** Ce qui s'écrit à côté du pavé : des centimètres CUBES, toujours. */
export const uniteDe = (t) => `${t.unite}³`;

/** La réponse écrite en entier, pour une correction ou une fiche. */
export const reponseEcrite = (t) => `${reponseDe(t)} ${uniteDe(t)}`;

export const FORMULES = {
    pave: 'Longueur × largeur × hauteur',
    cube: 'côté × côté × côté',
    prisme: 'aire de la base × hauteur',
    cylindre: 'π × r × r × hauteur',
    pyramide: '(aire de la base × hauteur) ÷ 3',
    cone: '(π × r × r × hauteur) ÷ 3',
    boule: '(4 ÷ 3) × π × r × r × r'
};

/* ── LES DIMENSIONS, ÉCRITES ──────────────────────────────────────────── */

/** « L = 7 cm, l = 3 cm, h = 5 cm » — pour la fiche et pour l'explication. */
export function dimensionsEcrites(t) {
    const u = t.unite;
    const d = t.dims;
    switch (t.marche) {
        case 'pave': return `L = ${d.L} ${u}, l = ${d.l} ${u}, h = ${d.h} ${u}`;
        case 'cube': return `a = ${d.a} ${u}`;
        case 'prisme': return `base : b = ${d.b} ${u} et h = ${d.hb} ${u} ; longueur = ${d.H} ${u}`;
        case 'cylindre': return `r = ${d.r} ${u}, h = ${d.h} ${u}`;
        case 'pyramide': return `côté de la base = ${d.c} ${u}, hauteur = ${d.h} ${u}`;
        case 'cone': return `r = ${d.r} ${u}, h = ${d.h} ${u}`;
        case 'boule': return `r = ${d.r} ${u}`;
        default: return '';
    }
}

/* ── L'EXPLICATION : LE CHEMIN, PAS LE RÉSULTAT ───────────────────────── */

export function expliquer(t) {
    const d = t.dims, u = t.unite, R = reponseEcrite(t);
    switch (t.marche) {
        case 'pave':
            return `Volume = L × l × h = ${d.L} × ${d.l} × ${d.h} = ${R}. `
                + `L'ordre des trois ne change rien : c'est le même pavé.`;
        case 'cube':
            return `Un cube n'a qu'une mesure : Volume = a × a × a = ${d.a} × ${d.a} × ${d.a} `
                + `= ${R}. C'est pour cela qu'on dit « ${d.a} au cube ».`;
        case 'prisme': {
            const ab = d.b * d.hb / 2;
            return `On calcule d'abord l'AIRE DE LA BASE, qui est un triangle : `
                + `(${d.b} × ${d.hb}) ÷ 2 = ${ab} ${u}². Puis Volume = aire de la base × `
                + `longueur = ${ab} × ${d.H} = ${R}.`;
        }
        case 'cylindre':
            return `La base est un disque : son aire vaut π × r × r = ${d.r * d.r}π ${u}². `
                + `Puis Volume = aire de la base × hauteur = ${d.r * d.r}π × ${d.h} = ${R}.`;
        case 'pyramide': {
            const ab = d.c * d.c;
            return `La base est un carré de ${ab} ${u}². Une pyramide tient TROIS FOIS dans `
                + `le prisme de même base et même hauteur : Volume = (${ab} × ${d.h}) ÷ 3 = ${R}.`;
        }
        case 'cone': {
            const ab = `${d.r * d.r}π`;
            return `La base est un disque d'aire ${ab} ${u}². Un cône tient TROIS FOIS dans le `
                + `cylindre de même base et même hauteur : Volume = (${ab} × ${d.h}) ÷ 3 = ${R}.`;
        }
        case 'boule':
            return `Volume = (4 ÷ 3) × π × r × r × r = (4 ÷ 3) × π × ${d.r ** 3} = ${R}. `
                + `La boule n'a que son rayon : il n'y a rien d'autre à mesurer.`;
        default: return '';
    }
}

/* ── LES INDICES : TROIS MARCHES VERS LA RÉPONSE ──────────────────────── */

export function indicesDe(t) {
    const d = t.dims, u = t.unite;
    const dernier = `Il reste à poser le calcul : ${FORMULES[t.marche]}.`;
    switch (t.marche) {
        case 'pave': return [
            'Un volume se calcule avec TROIS longueurs. Repère-les sur le dessin : la '
                + 'longueur, la largeur, et la hauteur.',
            `Volume = L × l × h. Ici : ${d.L} × ${d.l} × ${d.h}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'cube': return [
            'Toutes les arêtes d\'un cube ont la même longueur : une seule mesure est '
                + 'écrite, et elle sert trois fois.',
            `Volume = a × a × a = ${d.a} × ${d.a} × ${d.a}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'prisme': return [
            'Un prisme droit, c\'est une base qu\'on fait glisser. Commence donc par l\'AIRE '
                + 'DE LA BASE, et ne t\'occupe de la longueur qu\'ensuite.',
            `La base est un triangle : (${d.b} × ${d.hb}) ÷ 2 = ${d.b * d.hb / 2} ${u}². `
                + `Puis on multiplie par ${d.H}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'cylindre': return [
            'La base d\'un cylindre est un DISQUE. Son aire vaut π × r × r.',
            `Aire de la base = ${d.r * d.r}π ${u}². Puis on multiplie par la hauteur, ${d.h}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'pyramide': return [
            'Une pyramide tient TROIS FOIS dans le prisme de même base et même hauteur. '
                + 'Calcule donc le prisme, puis divise par 3.',
            `Base : ${d.c} × ${d.c} = ${d.c * d.c} ${u}². Prisme : ${d.c * d.c} × ${d.h} = `
                + `${d.c * d.c * d.h}. Reste à diviser par 3.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'cone': return [
            'Un cône tient TROIS FOIS dans le cylindre de même base et même hauteur. '
                + 'Calcule donc le cylindre, puis divise par 3.',
            `Base : ${d.r * d.r}π ${u}². Cylindre : ${d.r * d.r}π × ${d.h} = `
                + `${d.r * d.r * d.h}π. Reste à diviser par 3.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        case 'boule': return [
            'La boule n\'a qu\'une mesure : son rayon. La formule est (4 ÷ 3) × π × r × r × r.',
            `r × r × r = ${d.r ** 3}. Puis (4 ÷ 3) × ${d.r ** 3} = ${4 * d.r ** 3 / 3}.`,
            `Cela fait ${reponseEcrite(t)}.`
        ];
        default: return [dernier];
    }
}

/* ── LES LEURRES : LES FAUTES QU'ON VOIT EN CLASSE ────────────────────── */

export function leurresDe(t) {
    const d = t.dims, u = `${t.unite}³`;
    const ecrire = (v, pi) => (pi ? `${nb(v)}π` : String(v));
    const out = [];
    const pi = EXACTS_PI.includes(t.marche);
    const juste = reponseDe(t);

    if (TIERS.includes(t.marche)) {
        // LA FAUTE DU CHAPITRE : oublier le ÷ 3. Elle donne exactement le
        // prisme ou le cylindre correspondant, donc un nombre parfaitement
        // crédible — c'est pour cela qu'elle doit être proposée.
        const sansTiers = t.marche === 'pyramide' ? d.c * d.c * d.h : d.r * d.r * d.h;
        out.push({ value: ecrire(sansTiers, pi), label: `${ecrire(sansTiers, pi)} ${u}`,
            why: 'Tu as oublié de DIVISER PAR 3. Ce que tu as calculé, c\'est le volume du '
                + (t.marche === 'pyramide' ? 'prisme' : 'cylindre')
                + ' de même base et même hauteur, qui est trois fois plus grand.' });
    }
    if (t.marche === 'prisme') {
        const sansDemi = d.b * d.hb * d.H;
        out.push({ value: String(sansDemi), label: `${sansDemi} ${u}`,
            why: 'Tu as oublié le ÷ 2 de l\'aire du triangle. La base est un TRIANGLE, pas '
                + 'un rectangle.' });
    }
    if (t.marche === 'cylindre' || t.marche === 'cone') {
        // r CONFONDU AVEC LE DIAMÈTRE, ou plutôt l'inverse : on double le
        // rayon « pour avoir tout le disque ». Elle multiplie le volume par 4.
        const double = t.marche === 'cylindre' ? 4 * d.r * d.r * d.h : 4 * d.r * d.r * d.h / 3;
        out.push({ value: ecrire(double, true), label: `${ecrire(double, true)} ${u}`,
            why: 'Tu as pris le DIAMÈTRE à la place du rayon. Dans π × r × r, le r est la '
                + 'moitié du diamètre, et l\'erreur se multiplie par quatre.' });
    }
    if (t.marche === 'cube') {
        const fois3 = 3 * d.a;
        out.push({ value: String(fois3), label: `${fois3} ${u}`,
            why: 'Tu as multiplié par 3 au lieu de multiplier TROIS FOIS. a³, c\'est '
                + `${d.a} × ${d.a} × ${d.a}, pas ${d.a} × 3.` });
        const aire = 6 * d.a * d.a;
        out.push({ value: String(aire), label: `${aire} ${u}`,
            why: 'C\'est l\'aire des six faces, pas le volume. Une aire se compte en cm², un '
                + 'volume en cm³.' });
    }
    if (t.marche === 'pave') {
        const somme = d.L + d.l + d.h;
        out.push({ value: String(somme), label: `${somme} ${u}`,
            why: 'Tu as ADDITIONNÉ les trois longueurs. Un volume se multiplie : c\'est un '
                + 'empilement de petits cubes, pas une somme de côtés.' });
        const deux = d.L * d.l;
        out.push({ value: String(deux), label: `${deux} ${u}`,
            why: 'Tu n\'as multiplié que DEUX longueurs : c\'est l\'aire d\'une face, pas le '
                + 'volume. Il manque la troisième.' });
    }
    if (t.marche === 'boule') {
        const sansTiers = 4 * d.r ** 3;
        out.push({ value: ecrire(sansTiers, true), label: `${ecrire(sansTiers, true)} ${u}`,
            why: 'Tu as oublié de diviser par 3 : la formule est (4 ÷ 3) × π × r × r × r.' });
        const carre = 4 * d.r * d.r;
        out.push({ value: ecrire(carre, true), label: `${ecrire(carre, true)} ${u}`,
            why: 'Tu as mis le rayon au carré au lieu du cube. Une boule est un VOLUME : le '
                + 'rayon y sert trois fois.' });
    }
    return out.filter(l => l.value !== juste);
}

/* ── LES DESSINS ──────────────────────────────────────────────────────── */
//
// PERSPECTIVE CAVALIÈRE, LA MÊME PARTOUT : la face avant est en vraie
// grandeur, et la profondeur file vers le haut à droite, à 45°, réduite de
// moitié. C'est la convention du collège, et c'est celle qu'emploie déjà
// `js/core/solides.js` (`FUYANTE = { angle: 45, k: 0.5 }`). Deux conventions
// différentes dans un même logiciel apprendraient à l'élève que le dessin est
// arbitraire, ce qu'il n'est pas.
//
// ON NE RÉUTILISE PAS `solides.js` POUR AUTANT, et voici pourquoi : ce
// moteur-là dessine des solides NORMALISÉS, de taille fixe, pour qu'on compte
// leurs faces. Ici les longueurs sont l'énoncé — un pavé de 12 sur 2 doit se
// VOIR long et plat — et chaque arête doit porter sa cote. Ce sont deux
// besoins opposés : l'un efface les dimensions, l'autre les montre.

const FUITE = 0.5 * Math.SQRT1_2;        // cos 45° × 0,5, et sin 45° × 0,5

/**
 * Met les longueurs à l'échelle.
 *
 * LE PLAFOND DE 26 N'EST PAS UNE COQUETTERIE : sans lui, un cube de 2 cm
 * occupe autant de place qu'un pavé de 12, et l'élève qui enchaîne les
 * questions voit tous les solides de la même taille. Avec lui, un petit
 * solide est petit — ce qui est la moindre des choses dans un chapitre où
 * l'on apprend qu'un volume grandit vite.
 */
function echelleDe(valeurs, place) {
    const max = Math.max(...valeurs.filter(v => v > 0), 1);
    return Math.min(place / max, 26);
}

/** Le pavé droit et le cube : le même dessin, une ou trois cotes. */
function paveSvg(L, l, h, u, cube = false) {
    const e = echelleDe([L, l * 0.7, h], 150);
    const w = L * e, p = l * e * FUITE, ht = h * e;
    const x0 = 0, y0 = 0;                  // coin avant gauche, en bas
    const A = [x0, y0], B = [x0 + w, y0], C = [x0 + w, y0 - ht], D = [x0, y0 - ht];
    const A2 = [A[0] + p, A[1] - p], B2 = [B[0] + p, B[1] - p];
    const C2 = [C[0] + p, C[1] - p], D2 = [D[0] + p, D[1] - p];
    const P = [A, B, C, D, A2, B2, C2, D2];
    const m = [];
    // ── TROIS FACES, TROIS TEINTES, ET CE N'EST PAS DE LA DÉCORATION ─────
    //
    // Rémy : « mets un peu de couleurs pour les figures et solide ». Un pavé
    // au seul trait noir est un hexagone barré de trois segments : il faut
    // RECONSTRUIRE le solide pour le voir, et c'est exactement l'effort qu'on
    // veut épargner à un élève de sixième qui cherche déjà sa formule.
    //
    // Trois teintes d'un même bleu — le dessus le plus clair, le côté le plus
    // sombre — posent une lumière qui vient d'en haut à gauche, et le solide
    // se lit sans qu'on y pense. Une seule teinte sur les trois faces rendrait
    // une silhouette plate.
    //
    // ELLES SE DESSINENT AVANT LES ARÊTES, sinon elles les recouvriraient : en
    // SVG, ce qui vient après passe devant.
    m.push(`<path class="vol-face vol-face--dessus" d="M ${pt(...D)} L ${pt(...C)}
        L ${pt(...C2)} L ${pt(...D2)} Z"/>`);
    m.push(`<path class="vol-face vol-face--cote" d="M ${pt(...B)} L ${pt(...B2)}
        L ${pt(...C2)} L ${pt(...C)} Z"/>`);
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(...A)} L ${pt(...B)}
        L ${pt(...C)} L ${pt(...D)} Z"/>`);
    // LES ARÊTES CACHÉES EN POINTILLÉS : c'est à cela qu'un élève reconnaît
    // que le dessin est un solide et non un hexagone.
    m.push(`<path class="vol-cache" d="M ${pt(...A2)} L ${pt(...A)} M ${pt(...A2)} L ${pt(...B2)}
        M ${pt(...A2)} L ${pt(...D2)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...A)} L ${pt(...B)} L ${pt(...C)} L ${pt(...D)} Z"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...D)} L ${pt(...D2)} L ${pt(...C2)} L ${pt(...C)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...B)} L ${pt(...B2)} L ${pt(...C2)}"/>`);
    m.push(cote(P, A[0], A[1] + 14, B[0], B[1] + 14, `${L} ${u}`, { dy: 18 }));
    if (!cube) {
        m.push(cote(P, A[0] - 14, A[1], D[0] - 14, D[1], `${h} ${u}`, { dx: -8, ancre: 'end' }));
        // LA PROFONDEUR SE COTE LE LONG DE SON ARÊTE, et non quelque part à
        // droite : c'est la seule des trois qu'on ne voit pas en vraie
        // grandeur, et une étiquette posée loin d'elle se rapporte alors à
        // n'importe quoi.
        m.push(cote(P, B[0] + 7, B[1] - 4, B2[0] + 7, B2[1] - 4, `${l} ${u}`,
            { dx: 10, dy: 12, ancre: 'start' }));
    }
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: 'Un solide coté, dont il faut calculer le volume' });
}

/** Le prisme droit à base triangulaire : le triangle de face, la longueur qui fuit. */
function prismeSvg(b, hb, H, u) {
    const e = echelleDe([b, hb, H * 0.6], 130);
    const w = b * e, ht = hb * e, p = H * e * FUITE;
    const A = [0, 0], B = [w, 0], S = [w * 0.42, -ht];
    const A2 = [A[0] + p, A[1] - p], B2 = [B[0] + p, B[1] - p], S2 = [S[0] + p, S[1] - p];
    const P = [A, B, S, A2, B2, S2];
    const m = [];
    m.push(`<path class="vol-face vol-face--cote" d="M ${pt(...B)} L ${pt(...B2)}
        L ${pt(...S2)} L ${pt(...S)} Z"/>`);
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(...A)} L ${pt(...B)}
        L ${pt(...S)} Z"/>`);
    m.push(`<path class="vol-cache" d="M ${pt(...A2)} L ${pt(...B2)} M ${pt(...A2)} L ${pt(...S2)}
        M ${pt(...A2)} L ${pt(...A)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...A)} L ${pt(...B)} L ${pt(...S)} Z"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...B)} L ${pt(...B2)} L ${pt(...S2)} L ${pt(...S)}"/>`);
    // LA HAUTEUR DU TRIANGLE EST TRACÉE, en pointillés, avec son angle droit :
    // sans elle, « h = 4 cm » ne désigne rien sur le dessin, et l'élève la
    // confond avec un côté.
    m.push(`<line class="vol-hauteur" x1="${S[0].toFixed(1)}" y1="${S[1].toFixed(1)}"
        x2="${S[0].toFixed(1)}" y2="0"/>`);
    m.push(`<path class="vol-droit" d="M ${pt(S[0] - 9, 0)} L ${pt(S[0] - 9, -9)}
        L ${pt(S[0], -9)}"/>`);
    m.push(cote(P, A[0], 14, B[0], 14, `b = ${b} ${u}`, { dy: 18 }));
    // LA HAUTEUR S'ÉCRIT AU-DESSUS DU SOMMET, décalée à gauche.
    //
    // Elle a d'abord été posée à mi-hauteur, à gauche du trait. Regardé : à
    // mi-hauteur, l'arête du triangle est justement là, et l'étiquette lui
    // passait dessus. Au-dessus du sommet, il n'y a rien — c'est le seul
    // endroit du dessin dont on soit sûr, quelles que soient les dimensions.
    m.push(etiquette(P, S[0] - 10, S[1] - 8, `h = ${hb} ${u}`, 'end'));
    m.push(cote(P, B[0] + 7, B[1] - 4, B2[0] + 7, B2[1] - 4, `${H} ${u}`,
        { dx: 10, dy: 12, ancre: 'start' }));
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: 'Un solide coté, dont il faut calculer le volume' });
}

/** Le cylindre : deux ellipses et deux génératrices. */
function cylindreSvg(r, h, u, nu = false) {
    const e = echelleDe([2 * r, h], 140);
    const R = r * e, ht = h * e, ry = Math.max(8, R * 0.32);
    const cx = 0, bas = 0, haut = -ht;
    const P = [[cx - R, bas + ry], [cx + R, bas + ry], [cx - R, haut - ry], [cx + R, haut - ry]];
    const m = [];
    // LE CORPS DU CYLINDRE : le rectangle, fermé en bas par l'arc qu'on VOIT.
    // Le haut se ferme par un trait droit, invisible puisque le disque du
    // dessus se dessine par-dessus.
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(cx - R, haut)} L ${pt(cx - R, bas)}
        A ${R.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${pt(cx + R, bas)} L ${pt(cx + R, haut)} Z"/>`);
    m.push(`<path class="vol-cache" d="M ${pt(cx - R, bas)} A ${R.toFixed(1)} ${ry.toFixed(1)}
        0 0 0 ${pt(cx + R, bas)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(cx - R, bas)} A ${R.toFixed(1)} ${ry.toFixed(1)}
        0 0 1 ${pt(cx + R, bas)}"/>`);
    m.push(`<line class="vol-arete" x1="${(cx - R).toFixed(1)}" y1="${bas}"
        x2="${(cx - R).toFixed(1)}" y2="${haut.toFixed(1)}"/>`);
    m.push(`<line class="vol-arete" x1="${(cx + R).toFixed(1)}" y1="${bas}"
        x2="${(cx + R).toFixed(1)}" y2="${haut.toFixed(1)}"/>`);
    m.push(`<ellipse class="vol-arete vol-face" cx="${cx}" cy="${haut.toFixed(1)}"
        rx="${R.toFixed(1)}" ry="${ry.toFixed(1)}"/>`);
    // LE RAYON EST TRACÉ SUR L'ELLIPSE DU HAUT, du centre vers le bord : « r »
    // posé à côté du solide désignerait aussi bien le diamètre.
    // LE NOMBRE PASSE AU-DESSUS DE TOUTE L'ELLIPSE, et non juste au-dessus du
    // trait : posé là, il chevauchait l'arc du disque sur les grands rayons.
    if (!nu) m.push(cote(P, cx, haut, cx + R, haut, `r = ${r} ${u}`, { dy: -(ry + 12) }));
    if (!nu) m.push(`<circle class="vol-centre" cx="${cx}" cy="${haut.toFixed(1)}" r="2.6"/>`);
    if (!nu) m.push(cote(P, cx + R + 20, haut, cx + R + 20, bas, `h = ${h} ${u}`,
        { dx: 8, ancre: 'start' }));
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: nu ? 'Un solide, à reconnaître' : 'Un solide coté, dont il faut calculer le volume' });
}

/** La pyramide à base carrée : la base en losange, la hauteur en pointillés. */
function pyramideSvg(c, h, u) {
    const e = echelleDe([c, h], 120);
    const w = c * e, ht = h * e, p = c * e * FUITE;
    const A = [0, 0], B = [w, 0];
    const A2 = [A[0] + p, A[1] - p], B2 = [B[0] + p, B[1] - p];
    const O = [(A[0] + B2[0]) / 2, (A[1] + B2[1]) / 2];
    const S = [O[0], O[1] - ht];
    const P = [A, B, A2, B2, S];
    const m = [];
    m.push(`<path class="vol-face vol-face--dessus" d="M ${pt(...A)} L ${pt(...B)}
        L ${pt(...B2)} L ${pt(...A2)} Z"/>`);
    m.push(`<path class="vol-face vol-face--cote" d="M ${pt(...B)} L ${pt(...S)}
        L ${pt(...B2)} Z"/>`);
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(...A)} L ${pt(...B)}
        L ${pt(...S)} Z"/>`);
    m.push(`<path class="vol-cache" d="M ${pt(...A2)} L ${pt(...A)} M ${pt(...A2)} L ${pt(...B2)}
        M ${pt(...A2)} L ${pt(...S)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...A)} L ${pt(...B)} L ${pt(...B2)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(...A)} L ${pt(...S)} L ${pt(...B)}
        M ${pt(...S)} L ${pt(...B2)}"/>`);
    m.push(`<line class="vol-hauteur" x1="${S[0].toFixed(1)}" y1="${S[1].toFixed(1)}"
        x2="${O[0].toFixed(1)}" y2="${O[1].toFixed(1)}"/>`);
    m.push(`<path class="vol-droit" d="M ${pt(O[0] - 9, O[1])} L ${pt(O[0] - 9, O[1] - 9)}
        L ${pt(O[0], O[1] - 9)}"/>`);
    m.push(cote(P, A[0], 14, B[0], 14, `${c} ${u}`, { dy: 18 }));
    // AU-DESSUS DU SOMMET, comme sur le prisme et pour la même raison : à
    // mi-hauteur, de quelque côté qu'on la pose, l'étiquette tombe sur une
    // arête — et l'on croit alors qu'elle mesure CETTE arête, qui est plus
    // longue que la hauteur. C'est exactement la confusion du chapitre.
    m.push(etiquette(P, S[0] - 10, S[1] - 8, `h = ${h} ${u}`, 'end'));
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: 'Un solide coté, dont il faut calculer le volume' });
}

/** Le cône : une ellipse, deux génératrices, la hauteur en pointillés. */
function coneSvg(r, h, u, nu = false) {
    const e = echelleDe([2 * r, h], 130);
    const R = r * e, ht = h * e, ry = Math.max(8, R * 0.32);
    const cx = 0, bas = 0;
    const S = [cx, bas - ht];
    const P = [[cx - R, bas + ry], [cx + R, bas + ry], S];
    const m = [];
    // DEUX MORCEAUX DE LA MÊME TEINTE : le triangle des génératrices, et le
    // croissant du disque de base qu'on voit par en dessous. Les écrire en un
    // seul chemin demanderait de retourner l'arc, ce qui se trompe de sens une
    // fois sur deux et ne se voit qu'à l'image.
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(cx - R, bas)} L ${pt(...S)}
        L ${pt(cx + R, bas)} Z"/>`);
    m.push(`<path class="vol-face vol-face--avant" d="M ${pt(cx - R, bas)}
        A ${R.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${pt(cx + R, bas)} Z"/>`);
    m.push(`<path class="vol-cache" d="M ${pt(cx - R, bas)} A ${R.toFixed(1)} ${ry.toFixed(1)}
        0 0 0 ${pt(cx + R, bas)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(cx - R, bas)} A ${R.toFixed(1)} ${ry.toFixed(1)}
        0 0 1 ${pt(cx + R, bas)}"/>`);
    m.push(`<path class="vol-arete" d="M ${pt(cx - R, bas)} L ${pt(...S)} L ${pt(cx + R, bas)}"/>`);
    if (!nu) m.push(`<line class="vol-hauteur" x1="${S[0]}" y1="${S[1].toFixed(1)}"
        x2="${cx}" y2="${bas}"/>`);
    if (!nu) m.push(`<path class="vol-droit" d="M ${pt(cx - 9, bas)} L ${pt(cx - 9, bas - 9)}
        L ${pt(cx, bas - 9)}"/>`);
    if (!nu) m.push(cote(P, cx, bas + ry, cx + R, bas + ry, `r = ${r} ${u}`, { dy: 22 }));
    if (!nu) m.push(etiquette(P, S[0] - 10, S[1] - 8, `h = ${h} ${u}`, 'end'));
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: nu ? 'Un solide, à reconnaître' : 'Un solide coté, dont il faut calculer le volume' });
}

/** La boule : un cercle et son équateur. */
function bouleSvg(r, u, nu = false) {
    const R = Math.min(r * 16, 76);
    const cx = 0, cy = 0;
    const P = [[cx - R, cy - R], [cx + R, cy + R]];
    const m = [];
    m.push(`<circle class="vol-arete vol-face" cx="${cx}" cy="${cy}" r="${R.toFixed(1)}"/>`);
    // L'ÉQUATEUR : sans lui, le dessin est un disque, et le mot « boule » ne
    // tient qu'à l'énoncé. Sa moitié arrière est en pointillés, comme toute
    // ligne qu'on ne voit pas — c'est ce qui fait tourner la sphère.
    m.push(`<path class="vol-cache" d="M ${pt(cx - R, cy)} A ${R.toFixed(1)} ${(R * 0.3).toFixed(1)}
        0 0 1 ${pt(cx + R, cy)}"/>`);
    m.push(`<path class="vol-equateur" d="M ${pt(cx - R, cy)} A ${R.toFixed(1)} ${(R * 0.3).toFixed(1)}
        0 0 0 ${pt(cx + R, cy)}"/>`);
    // LE RAYON PART DU CENTRE VERS LE HAUT-DROIT, et non à l'horizontale : à
    // l'horizontale il se confond avec l'équateur, et l'étiquette se pose sur
    // lui. Mesuré : « r = 3 cm » était illisible, écrit sur le trait.
    const bx = cx + R * 0.72, by = cy - R * 0.69;
    if (!nu) m.push(cote(P, cx, cy, bx, by, `r = ${r} ${u}`, { dx: 12, dy: -6, ancre: 'start' }));
    if (!nu) m.push(`<circle class="vol-centre" cx="${cx}" cy="${cy}" r="2.6"/>`);
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg',
        aria: nu ? 'Un solide, à reconnaître' : 'Un solide coté, dont il faut calculer le volume' });
}

/**
 * Le dessin du solide tiré, coté.
 *
 * `nu` : SANS COTES NI HAUTEUR, pour les ronds (cylindre, cône, boule) — c'est
 * le dessin qu'emploie « Le Nom des Solides », où l'on reconnaît une forme et
 * où des longueurs écrites dessus feraient croire qu'il y a un calcul à faire.
 */
export function figureVolumeSvg(t, { nu = false } = {}) {
    const d = t.dims, u = t.unite;
    switch (t.marche) {
        case 'pave': return paveSvg(d.L, d.l, d.h, u);
        case 'cube': return paveSvg(d.a, d.a, d.a, u, true);
        case 'prisme': return prismeSvg(d.b, d.hb, d.H, u);
        case 'cylindre': return cylindreSvg(d.r, d.h, u, nu);
        case 'pyramide': return pyramideSvg(d.c, d.h, u);
        case 'cone': return coneSvg(d.r, d.h, u, nu);
        case 'boule': return bouleSvg(d.r, u, nu);
        default: return '';
    }
}

/** Le dessin, enveloppé comme les autres figures du dépôt. */
export const figureVolume = (t) => figure(figureVolumeSvg(t), 'fig-volume');
