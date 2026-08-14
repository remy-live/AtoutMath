// POSER UNE OPÉRATION — le noyau : les colonnes, les retenues, le résultat.
//
// Une opération posée n'est pas un calcul écrit en plus petit : c'est un
// ALGORITHME DE COLONNES, et tout s'y joue sur une seule idée — deux chiffres
// ne se rencontrent que s'ils ont le même RANG. Les unités sous les unités,
// les dixièmes sous les dixièmes. C'est pour cela que l'alignement est ici un
// exercice à part entière, évalué avant qu'un seul chiffre de résultat soit
// écrit : un élève qui pose 324,5 + 12,4 en collant les nombres à droite
// obtient 336,9 au lieu de 336,9… ou pire, 324,5 + 12,4 = 448,5, et le calcul
// n'y est pour rien.
//
// LE RANG, PAS LA COLONNE. Tout ce module raisonne en puissances de dix : les
// unités valent 0, les dizaines 1, les dixièmes −1. Numéroter les colonnes de
// la droite marcherait pour des entiers et se casserait à la première virgule,
// puisque la colonne des unités se déplacerait selon le nombre de décimales.
// Avec le rang, la virgule tombe toujours entre 0 et −1, et elle n'a plus
// besoin d'être placée : elle EST la frontière.
//
// LES RETENUES SE NOTENT DIFFÉREMMENT SELON L'OPÉRATION, et c'est fidèle à ce
// qu'on écrit au tableau :
//
//   · À L'ADDITION, la retenue se pose EN HAUT de la colonne suivante — elle
//     s'ajoute aux chiffres du dessus. Avec deux nombres elle vaut 0 ou 1 ;
//     avec trois, elle peut valoir 2.
//   · À LA SOUSTRACTION, méthode française par compensation : on ajoute dix au
//     chiffre du haut ET un au chiffre du bas de la colonne suivante. La
//     retenue se note donc À CÔTÉ DU CHIFFRE DU BAS, jamais en haut. C'est ce
//     que demande le programme, et c'est ce que les élèves voient en classe.
//
// Le module ne connaît ni le DOM ni le glisser-déposer : il dit ce qu'il faut
// écrire et où, et l'activité vérifie ce que l'élève a écrit.

/** Combien de décimales porte un nombre écrit à la française ou en machine. */
export function decimales(v) {
    const s = String(v);
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
}

/**
 * Le chiffre d'un nombre à un rang donné.
 * `rang` 0 = unités, 1 = dizaines, −1 = dixièmes.
 */
export function chiffreAuRang(v, rang) {
    const entier = Math.round(Math.abs(v) * Math.pow(10, PRECISION));
    const decale = Math.floor(entier / Math.pow(10, rang + PRECISION));
    return decale % 10;
}

// Six décimales suffisent très largement à une opération posée d'école, et
// travailler en entiers évite les 0,1 + 0,2 = 0,30000000000000004 qui feraient
// apparaître des chiffres fantômes dans les colonnes.
const PRECISION = 6;
const enEntier = (v) => Math.round(v * Math.pow(10, PRECISION));
const enDecimal = (n) => n / Math.pow(10, PRECISION);

/** Les rangs occupés par un nombre, du plus fort au plus faible. */
export function rangsDe(v) {
    const bas = -decimales(v);
    const haut = v === 0 ? 0 : Math.max(0, Math.floor(Math.log10(Math.abs(v))));
    const out = [];
    for (let r = haut; r >= bas; r--) out.push(r);
    return out;
}

/**
 * Le PLACEMENT ATTENDU : pour chaque opérande, quel chiffre va à quel rang.
 *
 * C'est la première moitié de l'exercice, et la seule qui compte vraiment pour
 * un élève qui « sait calculer mais rate ses opérations ».
 */
export function placementAttendu(operandes) {
    return operandes.map((v, i) => ({
        operande: i,
        valeur: v,
        chiffres: rangsDe(v).map(rang => ({ rang, chiffre: chiffreAuRang(v, rang) }))
    }));
}

/**
 * L'étendue des colonnes de la feuille : du rang le plus fort du résultat au
 * rang le plus faible de tout ce qui est écrit.
 */
export function etendue(operandes, resultat) {
    const tous = [...operandes, resultat];
    const bas = Math.min(...tous.map(v => -decimales(v)));
    const haut = Math.max(...tous.map(v => rangsDe(v)[0]));
    const rangs = [];
    for (let r = haut; r >= bas; r--) rangs.push(r);
    return { haut, bas, rangs, virgule: bas < 0 };
}

// --- L'ADDITION ---------------------------------------------------------------------

/**
 * Les colonnes d'une addition, du rang le plus faible au plus fort.
 *
 * La retenue posée SUR une colonne est celle qui vient de la colonne juste
 * plus faible : c'est ainsi qu'on l'écrit au tableau, en petit, au-dessus.
 */
export function colonnesAddition(operandes) {
    const somme = enDecimal(operandes.reduce((s, v) => s + enEntier(v), 0));
    const { rangs } = etendue(operandes, somme);
    const bas = rangs[rangs.length - 1];
    const haut = rangs[0];
    const colonnes = [];
    let retenue = 0;
    for (let r = bas; r <= haut; r++) {
        const chiffres = operandes.map(v => (aLeRang(v, r) ? chiffreAuRang(v, r) : null));
        const total = chiffres.reduce((s, c) => s + (c || 0), 0) + retenue;
        colonnes.push({
            rang: r,
            chiffres,
            // La retenue ENTRANTE : celle qu'on lit au-dessus de cette colonne.
            retenueEntrante: retenue,
            total,
            resultat: total % 10,
            // La retenue SORTANTE : celle qu'on écrit au-dessus de la colonne
            // suivante. Avec deux nombres elle vaut 0 ou 1 ; avec trois, 2.
            retenueSortante: Math.floor(total / 10)
        });
        retenue = Math.floor(total / 10);
    }
    return { operation: '+', operandes, resultat: somme, colonnes, retenueMax: maxRetenue(colonnes) };
}

// --- LA SOUSTRACTION ------------------------------------------------------------------

/**
 * Les colonnes d'une soustraction, méthode française par compensation.
 *
 * Quand le chiffre du haut est trop petit, on lui ajoute dix — et pour ne pas
 * changer la différence, on ajoute un au chiffre du bas de la colonne
 * suivante. LA RETENUE SE NOTE DONC EN BAS, contre le chiffre du soustracteur,
 * et jamais au-dessus comme à l'addition.
 */
export function colonnesSoustraction(a, b) {
    // UNE SOUSTRACTION POSÉE NE VA QUE DU GRAND VERS LE PETIT. Sans ce refus,
    // 27 − 52 rendait des colonnes de chiffres pris en valeur absolue : un
    // tableau d'apparence normale, entièrement faux, et rien pour le dire.
    if (enEntier(a) < enEntier(b)) {
        throw new Error(`soustraction impossible à poser : ${a} − ${b} est négatif`);
    }
    const reste = enDecimal(enEntier(a) - enEntier(b));
    const { rangs } = etendue([a, b], reste);
    const bas = rangs[rangs.length - 1];
    const haut = rangs[0];
    const colonnes = [];
    let retenue = 0;                 // ce qu'on ajoute au chiffre du BAS
    for (let r = bas; r <= haut; r++) {
        const hautC = aLeRang(a, r) ? chiffreAuRang(a, r) : 0;
        const basC = (aLeRang(b, r) ? chiffreAuRang(b, r) : 0) + retenue;
        const emprunte = hautC < basC;
        colonnes.push({
            rang: r,
            chiffreHaut: aLeRang(a, r) ? chiffreAuRang(a, r) : null,
            chiffreBas: aLeRang(b, r) ? chiffreAuRang(b, r) : null,
            // La retenue écrite CONTRE le chiffre du bas de cette colonne.
            retenueBas: retenue,
            emprunte,
            resultat: (hautC + (emprunte ? 10 : 0)) - basC,
            retenueSortante: emprunte ? 1 : 0
        });
        retenue = emprunte ? 1 : 0;
    }
    return { operation: '-', operandes: [a, b], resultat: reste, colonnes, retenueMax: 1 };
}

const aLeRang = (v, r) => rangsDe(v).includes(r);

function maxRetenue(colonnes) {
    return colonnes.reduce((m, c) => Math.max(m, c.retenueSortante), 0);
}

// --- LA MULTIPLICATION ------------------------------------------------------------------

/**
 * Une multiplication posée : un produit partiel par chiffre du multiplicateur,
 * décalé d'un rang à chaque ligne, puis l'addition de ces lignes.
 *
 * LA VIRGULE NE SE POSE PAS EN COLONNES ICI, et c'est la difficulté propre à
 * la multiplication décimale : on multiplie comme si de rien n'était, et l'on
 * place la virgule à la fin en comptant les décimales des deux facteurs. On
 * rend donc les produits partiels en ENTIERS, avec le décalage à appliquer.
 */
export function colonnesMultiplication(a, b) {
    const dA = decimales(a), dB = decimales(b);
    const entA = Math.round(a * Math.pow(10, dA));
    const entB = Math.round(b * Math.pow(10, dB));
    const chiffresB = String(entB).split('').reverse().map(Number);

    const partiels = chiffresB.map((c, i) => ({
        chiffre: c, decalage: i, valeur: entA * c,
        // Ce qu'on écrit sur la ligne, décalage compris.
        pose: entA * c * Math.pow(10, i)
    }));
    const produitEntier = entA * entB;
    return {
        operation: '×', operandes: [a, b],
        entiers: [entA, entB],
        decimales: dA + dB,
        partiels,
        produitEntier,
        // La virgule se place à la fin : autant de décimales que les deux
        // facteurs réunis. C'est LA règle du chapitre.
        resultat: produitEntier / Math.pow(10, dA + dB),
        // Une seule ligne de produits partiels : pas d'addition à poser.
        simple: chiffresB.length === 1
    };
}

/**
 * LE DÉTAIL D'UNE LIGNE DE PRODUIT PARTIEL — celui qu'on écrit vraiment.
 *
 * `colonnesMultiplication` donne la valeur de chaque ligne ; il faut de plus
 * savoir comment on l'écrit CHIFFRE PAR CHIFFRE, avec ses retenues, parce que
 * c'est là que ça se joue : 7 × 8 = 56, on pose 6 et on retient 5, et la
 * retenue de la multiplication S'AJOUTE APRÈS le produit suivant (d × c + r),
 * elle ne s'ajoute pas au chiffre du multiplicande comme à l'addition. C'est
 * l'erreur classique, et une activité qui ne montrerait que le total ne la
 * verrait jamais.
 *
 * Les positions sont comptées EN ENTIER, depuis les unités du produit : la
 * virgule ne se pose qu'à la fin, en comptant les décimales des deux facteurs.
 */
export function lignesMultiplication(a, b) {
    const base = colonnesMultiplication(a, b);
    const [entA] = base.entiers;
    const chiffresA = String(entA).split('').reverse().map(Number);

    const lignes = base.partiels.map(p => {
        const cases = [];
        let retenue = 0;
        chiffresA.forEach((d, k) => {
            const total = d * p.chiffre + retenue;
            cases.push({
                position: k + p.decalage,
                chiffreA: d,
                retenueEntrante: retenue,
                total,
                chiffre: total % 10,
                retenueSortante: Math.floor(total / 10)
            });
            retenue = Math.floor(total / 10);
        });
        // LA DERNIÈRE RETENUE S'ÉCRIT TELLE QUELLE : il n'y a plus de chiffre
        // du multiplicande en face, et l'oublier ampute le produit d'un rang.
        if (retenue) {
            cases.push({
                position: chiffresA.length + p.decalage,
                chiffreA: null, retenueEntrante: retenue,
                total: retenue, chiffre: retenue, retenueSortante: 0
            });
        }
        return { ...p, cases, retenueMax: cases.reduce((m, c) => Math.max(m, c.retenueSortante), 0) };
    });

    // Les lignes utiles : un chiffre nul du multiplicateur donne une ligne de
    // zéros qu'on n'écrit pas au tableau — mais le DÉCALAGE, lui, reste.
    return {
        ...base, lignes,
        largeur: String(base.produitEntier).length,
        // L'addition finale ne se pose que s'il y a plusieurs lignes.
        sommeAPoser: lignes.length > 1
    };
}

// --- LA DIVISION (la potence) --------------------------------------------------------

/**
 * UNE DIVISION POSÉE, pas à pas.
 *
 * L'algorithme n'est pas en colonnes : c'est une SUITE D'ÉTAPES, chacune
 * identique à la précédente — j'abaisse un chiffre, je cherche combien de fois
 * le diviseur tient dedans, je multiplie, je soustrais. Le noyau rend donc une
 * liste d'étapes, et l'écran n'a plus qu'à les faire remplir dans l'ordre.
 *
 * LE RANG EST L'INVARIANT, ici aussi, et il explique la règle qu'on récite
 * sans la comprendre : le chiffre du quotient obtenu en abaissant le chiffre
 * de rang r EST le chiffre de rang r du quotient. C'est pour cela que la
 * virgule du quotient tombe exactement quand on abaisse celle du dividende —
 * ce n'est pas une convention, c'est une conséquence.
 *
 * `decimalesMax` : au-delà du dividende, on continue en abaissant des zéros.
 * À zéro, on s'arrête sur le quotient entier et son reste.
 */
export function colonnesDivision(dividende, diviseur, { decimalesMax = 0 } = {}) {
    if (!diviseur) throw new Error('division par zéro');
    if (!Number.isInteger(diviseur) || diviseur <= 0) {
        // On ne pose pas une division par un décimal : à l'école, on commence
        // par déplacer la virgule des DEUX nombres, et c'est un autre exercice.
        throw new Error(`diviseur entier attendu, reçu ${diviseur}`);
    }
    if (dividende < 0) throw new Error('dividende négatif');

    const rangs = rangsDe(dividende);
    const basDividende = rangs[rangs.length - 1];
    const etapes = [];
    let courant = 0;
    let commence = false;          // a-t-on écrit un premier chiffre du quotient ?
    let quotient = 0;

    const derniere = basDividende - decimalesMax;
    for (let r = rangs[0]; r >= derniere; r--) {
        const abaisse = r >= basDividende ? chiffreAuRang(dividende, r) : 0;
        const avant = courant;
        courant = courant * 10 + abaisse;
        const chiffre = Math.floor(courant / diviseur);
        const produit = chiffre * diviseur;
        const reste = courant - produit;
        // UN ZÉRO DE TÊTE NE S'ÉCRIT PAS : 12 ÷ 5 donne « 2 », pas « 02 ». Mais
        // un zéro à l'intérieur s'écrit — 816 ÷ 4 = 204, et l'oublier fait
        // perdre un facteur dix.
        if (chiffre > 0) commence = true;
        etapes.push({
            rang: r,
            chiffreAbaisse: abaisse,
            avant,                       // le reste de l'étape précédente
            courant,                     // ce sur quoi on divise à cette étape
            chiffre,
            ecrit: commence,
            produit,
            reste,
            // Le premier chiffre du quotient qui vaut moins que le diviseur :
            // c'est là qu'on prend « les deux premiers chiffres » du dividende.
            apresVirgule: r < 0
        });
        if (commence) quotient += chiffre * Math.pow(10, r);
        courant = reste;
    }

    return {
        operation: '÷', operandes: [dividende, diviseur],
        etapes,
        // Un quotient calculé par sommes de puissances de dix traîne des
        // flottants : on le rend au rang le plus fin qu'on a écrit.
        quotient: Number(quotient.toFixed(Math.max(0, -derniere))),
        reste: Number((courant * Math.pow(10, derniere)).toFixed(PRECISION)),
        exacte: courant === 0,
        decimalesQuotient: Math.max(0, -derniere),
        rangVirgule: basDividende
    };
}

// --- L'aiguillage ------------------------------------------------------------------------

/** Le tableau complet d'une opération posée, quelle qu'elle soit. */
export function poser(operation, operandes, options = {}) {
    if (operation === '+') return colonnesAddition(operandes);
    if (operation === '-') return colonnesSoustraction(operandes[0], operandes[1]);
    if (operation === '×') return lignesMultiplication(operandes[0], operandes[1]);
    if (operation === '÷') return colonnesDivision(operandes[0], operandes[1], options);
    throw new Error(`opération inconnue : ${operation}`);
}

// --- La correction ------------------------------------------------------------------------

/**
 * L'alignement proposé est-il juste ?
 *
 * `pose` est ce que l'élève a construit : pour chaque opérande, la liste des
 * rangs où il a déposé ses chiffres, dans l'ordre de lecture. On ne compare
 * pas des colonnes mais des RANGS — deux chiffres au même rang sont l'un sous
 * l'autre, quel que soit le nombre de colonnes affichées.
 */
export function verifierPlacement(operandes, pose) {
    const attendu = placementAttendu(operandes);
    const fautes = [];
    attendu.forEach((att, i) => {
        const mis = (pose && pose[i]) || [];
        att.chiffres.forEach(c => {
            const trouve = mis.find(m => m.chiffre === c.chiffre && m.rang === c.rang);
            if (!trouve) fautes.push({ operande: i, rang: c.rang, chiffre: c.chiffre });
        });
        // Un chiffre posé où il n'a rien à faire compte aussi : c'est
        // exactement l'erreur de l'élève qui cale tout à droite.
        mis.forEach(m => {
            if (!att.chiffres.some(c => c.rang === m.rang && c.chiffre === m.chiffre)) {
                fautes.push({ operande: i, rang: m.rang, chiffre: m.chiffre, enTrop: true });
            }
        });
    });
    return { ok: fautes.length === 0, fautes };
}

/**
 * Ce qu'on attend dans une case du tableau, pour la correction au fil de l'eau.
 * `quoi` vaut 'resultat' ou 'retenue'.
 */
export function attenduEn(tableau, rang, quoi) {
    const c = tableau.colonnes && tableau.colonnes.find(x => x.rang === rang);
    if (!c) return null;
    if (quoi === 'resultat') return c.resultat;
    // La retenue lue sur cette colonne : au-dessus pour une addition, contre
    // le chiffre du bas pour une soustraction.
    return tableau.operation === '+' ? c.retenueEntrante : c.retenueBas;
}

/**
 * Le rang de la colonne par laquelle il faut commencer : la plus à droite.
 * Une opération posée se calcule des unités vers les grands rangs, et une
 * activité qui laisserait remplir dans n'importe quel ordre n'enseignerait pas
 * l'algorithme.
 */
export const premierRang = (tableau) => tableau.colonnes[0].rang;

/** Le rang suivant dans l'ordre de calcul, ou null si l'opération est finie. */
export function rangSuivant(tableau, rang) {
    const i = tableau.colonnes.findIndex(c => c.rang === rang);
    if (i < 0 || i + 1 >= tableau.colonnes.length) return null;
    return tableau.colonnes[i + 1].rang;
}
