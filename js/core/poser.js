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
 * ON DÉPOSE LE NOMBRE ENTIER, PAS SES CHIFFRES UN PAR UN.
 *
 * Poser une opération, ce n'est pas ranger quatre chiffres : c'est décider OÙ
 * VA LE NOMBRE. Le faire glisser chiffre par chiffre transforme une décision
 * unique en quatre gestes, et l'élève peut « réussir » l'alignement en plaçant
 * trois chiffres au hasard et le quatrième bien.
 *
 * Le nombre se prend donc d'un bloc, par n'importe lequel de ses chiffres :
 * celui qu'on tient tombe dans la colonne survolée, et les autres suivent. On
 * rend ici ce que donnerait le lâcher — c'est ce qu'affiche le fantôme, et
 * c'est aussi ce qu'on vérifie au dépôt : les deux lisent la même fonction, ils
 * ne peuvent donc pas se contredire.
 *
 * @param {number} valeur
 * @param {number} indexPris - le rang du chiffre saisi dans l'écriture (0 = à gauche)
 * @param {number} rangCible - le rang de la colonne survolée
 * @returns {{rang:number, chiffre:number, index:number}[]}
 */
export function apercuPose(valeur, indexPris, rangCible) {
    const rangs = rangsDe(valeur);
    const i = Math.max(0, Math.min(rangs.length - 1, indexPris));
    const decalage = rangCible - rangs[i];
    return rangs.map((r, j) => ({
        rang: r + decalage,
        chiffre: chiffreAuRang(valeur, r),
        index: j
    }));
}

/**
 * Le nombre est-il tombé juste ?
 * `ecart` compte les colonnes de décalage — c'est ce qu'on dit à l'élève,
 * parce que « décalé d'une colonne » se comprend, pas « faux ».
 */
export function verifierPose(valeur, indexPris, rangCible) {
    const rangs = rangsDe(valeur);
    const i = Math.max(0, Math.min(rangs.length - 1, indexPris));
    const ecart = rangCible - rangs[i];
    return { ok: ecart === 0, ecart };
}

/**
 * UN NOMBRE ÉCRIT À LA FRANÇAISE : 12,5 et non 12.5.
 *
 * `String(12.5)` donne un POINT, et un point sur une feuille de mathématiques
 * française n'est pas une virgule mal dessinée : c'est une autre notation, que
 * l'élève n'a jamais vue. La conversion se fait ici, une fois, à côté de la
 * définition du rang — pas à chaque endroit qui écrit un nombre.
 */
export const enFrancais = (v) => String(v).replace('.', ',');

/**
 * LES CHIFFRES D'UN NOMBRE, AVEC LEUR RANG — et sans la virgule.
 *
 * Poser une opération, c'est ranger des chiffres par rang ; la virgule n'est
 * pas un chiffre, elle marque une frontière. Découper la chaîne « 12.5 » en
 * caractères donnait quatre cases dont une contenant un point, alignées sur le
 * bord droit : exactement l'erreur qu'on passe l'année à corriger chez les
 * élèves.
 *
 * @returns {Array<{rang:number, chiffre:number}>} du rang le plus fort au plus faible
 */
export function chiffresParRang(v) {
    return rangsDe(v).map(rang => ({ rang, chiffre: chiffreAuRang(v, rang) }));
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
 * LES DEUX MÉTHODES DE RETENUE DE LA SOUSTRACTION POSÉE.
 *
 * RÉMY : « pour la soustraction posée, il faut que si il y a une retenue en
 * haut, la mettre et actualisé le +1 en bas dans le rang après. mais j'ai des
 * élèves qui font une autre méthode où pour 53 − 17, il mette le 1 à 3 et au
 * lieu du 5, il barre et mette 4 ».
 *
 * LES DEUX S'ENSEIGNENT EN FRANCE, et les deux donnent 36 :
 *
 *   COMPENSATION   13 − 7 = 6, puis le 1 de 17 devient 2 : 5 − 2 = 3.
 *                  On ajoute dix EN HAUT et dix EN BAS ; la différence ne
 *                  change pas. Le chiffre du haut n'est jamais touché.
 *
 *   EMPRUNT        13 − 7 = 6, puis on BARRE le 5 et l'on écrit 4 : 4 − 1 = 3.
 *                  On casse une dizaine du 53 pour la donner aux unités. Le
 *                  chiffre du bas n'est jamais touché.
 *
 * CE N'EST PAS UNE PRÉFÉRENCE, C'EST UN BLOCAGE. Le logiciel n'enseignait que
 * la première ; un élève qui applique CORRECTEMENT la seconde — celle qu'on
 * lui a enseignée au primaire — ne pouvait pas l'écrire dans la grille.
 */
export const METHODES_SOUSTRACTION = ['compensation', 'emprunt'];

/**
 * Les colonnes d'une soustraction, dans l'une ou l'autre méthode.
 *
 * @param {'compensation'|'emprunt'} methode
 */
export function colonnesSoustraction(a, b, methode = 'compensation') {
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
    const parEmprunt = methode === 'emprunt';
    const colonnes = [];
    let reporte = 0;                 // ce que la colonne précédente a pris
    for (let r = bas; r <= haut; r++) {
        const hautBrut = aLeRang(a, r) ? chiffreAuRang(a, r) : 0;
        const basBrut = aLeRang(b, r) ? chiffreAuRang(b, r) : 0;
        // LÀ EST TOUTE LA DIFFÉRENCE ENTRE LES DEUX MÉTHODES, et elle tient en
        // deux lignes : par emprunt c'est le chiffre du HAUT qui perd un, par
        // compensation c'est celui du BAS qui en gagne un.
        const hautC = parEmprunt ? hautBrut - reporte : hautBrut;
        const basC = parEmprunt ? basBrut : basBrut + reporte;
        const emprunte = hautC < basC;
        colonnes.push({
            rang: r,
            chiffreHaut: aLeRang(a, r) ? chiffreAuRang(a, r) : null,
            chiffreBas: aLeRang(b, r) ? chiffreAuRang(b, r) : null,
            // LE PETIT 1 DEVANT LE CHIFFRE DU HAUT, et il appartient aux DEUX
            // méthodes.
            //
            // RÉMY, devant 307 − 260 : « logiquement la retenue devrait être
            // à l'endroit où il y a une retenue, en l'occurrence à côté du 0
            // en haut et à côté du 2 en bas ». Il a raison, et le logiciel
            // n'écrivait que la seconde : le « 1 » qui fait du 0 un 10 était
            // sous-entendu, alors que c'est LUI qu'on écrit en premier au
            // crayon.
            //
            // PAR EMPRUNT, IL CÈDE LA PLACE AU CHIFFRE RÉÉCRIT. Une colonne
            // qui a PRÊTÉ une dizaine ne porte pas un petit 1 : elle porte
            // son chiffre barré et refait — on n'écrit pas les deux.
            retenueHaut: emprunte && !(parEmprunt && reporte) ? 1 : 0,
            // La retenue écrite CONTRE le chiffre du bas de la colonne
            // suivante : la compensation, et elle seule.
            retenueBas: parEmprunt ? 0 : reporte,
            // CE QUE L'ÉLÈVE ÉCRIT AU-DESSUS DU CHIFFRE DU HAUT, méthode par
            // emprunt : le chiffre barré et réécrit, plus les dix empruntés
            // s'il en emprunte à son tour. 53 − 17 donne 13 aux unités et 4
            // aux dizaines ; 503 − 17 donne 13, puis 9, puis 4 — c'est le cas
            // du zéro qui devient neuf, et il tombe tout seul.
            //
            // `null` quand il n'y a RIEN à écrire : ni emprunt reçu, ni
            // emprunt fait. Sans ce null, la grille demanderait une marque
            // dans une colonne où le cahier n'en porte aucune.
            hautCorrige: parEmprunt && reporte
                ? hautC + (emprunte ? 10 : 0) : null,
            emprunte,
            resultat: (hautC + (emprunte ? 10 : 0)) - basC,
            retenueSortante: emprunte ? 1 : 0
        });
        reporte = emprunte ? 1 : 0;
    }
    return {
        operation: '-', operandes: [a, b], resultat: reste, colonnes,
        retenueMax: parEmprunt ? 19 : 1, methode
    };
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
    if (operation === '-') {
        return colonnesSoustraction(operandes[0], operandes[1], options.methode);
    }
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
 * CETTE COLONNE PEUT-ELLE PORTER UNE RETENUE ?
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, capture à l'appui, sur 554 + 448 : « normalement, il ne devrait pas
 * pour l'addition avoir une retenue sur la première colonne non ? »
 *
 * Non, et c'est une règle, pas une préférence : la retenue d'une colonne
 * VIENT de la colonne à sa droite. La colonne des unités n'a rien à sa
 * droite — aucune retenue ne peut y entrer, jamais, quelle que soit
 * l'opération. Le petit rond qu'on y dessinait était donc une case qu'on ne
 * remplit pas ; et un élève qui cherche quoi y écrire cherche quelque chose
 * qui n'existe pas.
 *
 * LE MÊME RAISONNEMENT VAUT POUR LA SOUSTRACTION. La compensation qu'on écrit
 * contre le chiffre du bas vient de l'emprunt fait à la colonne de droite :
 * `retenueBas` du rang le plus faible vaut 0 par construction (la boucle part
 * de `retenue = 0`). Une seule règle, donc, et elle se lit ici.
 *
 * ON LA MET DANS LE NOYAU et non dans le jeu : c'est une propriété de
 * l'opération posée, pas une décision d'affichage. La feuille imprimée, elle,
 * ne dessine aucun rond — Rémy : « pour le pdf, ne mets pas le rond des
 * retenues » — mais le jour où un autre écran les redessinera, il trouvera la
 * règle ici plutôt que de la redécouvrir.
 */
export function porteUneRetenue(tableau, rang) {
    const colonnes = (tableau && tableau.colonnes) || [];
    if (!colonnes.length) return false;
    // UNE SOUSTRACTION NE MARQUE QUE LÀ OÙ IL Y A UNE RETENUE, et c'est Rémy
    // qui l'a relevé devant 307 − 260 : « logiquement la retenue devrait être
    // à l'endroit où il y a une retenue ». Le logiciel posait un petit rond
    // vide sous CHAQUE colonne sauf les unités, y compris là où rien ne se
    // passe — un rond à remplir avec zéro n'est pas une retenue, c'est du
    // bruit, et il apprend à ne plus regarder les autres.
    if (tableau.operation === '-') {
        const c = colonnes.find(x => x.rang === rang);
        return !!c && !!(c.retenueHaut || c.retenueBas || c.hautCorrige !== null);
    }
    // Les colonnes sont rangées du rang le plus faible au plus fort.
    return rang > colonnes[0].rang;
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
    // le chiffre du bas pour une soustraction. `null` là où il ne peut PAS y
    // en avoir — voir `porteUneRetenue` : c'est ce qui retire le petit rond
    // de la colonne des unités.
    if (!porteUneRetenue(tableau, rang)) return null;
    if (tableau.operation === '+') return c.retenueEntrante;
    // UNE SOUSTRACTION PORTE DEUX MARQUES DE NATURES DIFFÉRENTES, et elles ne
    // sont pas au même endroit du cahier :
    //
    //   EN HAUT   le petit 1 devant le chiffre du haut — ou, par emprunt, ce
    //             chiffre barré et réécrit (le 0 qui devient 9) ;
    //   EN BAS    le +1 contre le chiffre du bas de la colonne suivante,
    //             qui n'existe que dans la compensation.
    //
    // `quoi` les distingue. « retenue » tout court rend celle du haut : c'est
    // la seule des deux que les deux méthodes écrivent.
    if (quoi === 'retenue-bas') return c.retenueBas || null;
    return c.hautCorrige !== null ? c.hautCorrige : (c.retenueHaut || null);
}

/**
 * Le rang de la colonne par laquelle il faut commencer : la plus à droite.
 * Une opération posée se calcule des unités vers les grands rangs, et une
 * activité qui laisserait remplir dans n'importe quel ordre n'enseignerait pas
 * l'algorithme.
 */
export const premierRang = (tableau) => tableau.colonnes[0].rang;

/**
 * LA DERNIÈRE COLONNE QU'ON DEMANDE À L'ÉLÈVE : celle où le résultat s'arrête.
 *
 * RÉMY : « et si on fait 1000 - 3 par exemple ». 1000 − 3 = 997, et AUCUN
 * cahier n'écrit 0997 : la colonne des milliers reste vide. Les colonnes, elles,
 * existent toutes — ce sont celles des opérandes — et le tableau y calcule bien
 * un zéro ; c'est l'ÉCRITURE qui s'arrête avant.
 *
 * JAMAIS SOUS LES UNITÉS : 7,2 − 6,7 = 0,5 s'écrit AVEC son zéro. Le rang des
 * unités se demande toujours, fût-il nul.
 */
export function dernierRangDemande(tableau) {
    // `rangsDe` PART DES UNITÉS AU MINIMUM — 0,5 rend [0, −1] — si bien que le
    // zéro devant la virgule est compris sans qu'on ait à l'ajouter. Vérifié à
    // `epreuveTombe`, qui a montré qu'un `Math.max(0, …)` autour ne gardait
    // rien : il ne pouvait pas changer une seule réponse.
    return rangsDe(tableau.resultat)[0];
}

/** Le rang suivant dans l'ordre de calcul, ou null si l'opération est finie. */
export function rangSuivant(tableau, rang) {
    const i = tableau.colonnes.findIndex(c => c.rang === rang);
    if (i < 0 || i + 1 >= tableau.colonnes.length) return null;
    return tableau.colonnes[i + 1].rang;
}
