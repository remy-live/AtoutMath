// L'ARRONDI — et les trois mots qu'on confond.
//
// Rémy, à propos du disque : « tu feras un exercice d'arrondi avec valeur par
// excès, valeur par défaut, valeur approchée (au dixième, centième,
// millième). »
//
// TROIS MOTS POUR DEUX BORNES ET UN CHOIX. Un nombre décimal qui ne s'arrête
// pas — 3,1416 — est coincé entre deux nombres à deux décimales : 3,14 et 3,15.
// Le premier est sa valeur approchée PAR DÉFAUT au centième, le second sa
// valeur approchée PAR EXCÈS, et l'ARRONDI est celle des deux dont il est le
// plus près. Trois questions, un seul encadrement : c'est pour cela qu'elles
// vont ensemble, et c'est pour cela qu'on les mélange.
//
// CE QUI SE RATE, ET C'EST MESURABLE. « Par défaut » se calcule en COUPANT ;
// « arrondir » ne se calcule pas en coupant, sauf par accident — une fois sur
// deux. Un élève qui tronque partout a donc juste la moitié du temps, et rien
// dans son résultat ne dit qu'il a la mauvaise méthode. Séparer les trois mots
// et les mélanger dans le même exercice est le seul moyen de le voir.
//
// ON N'ÉCRIT JAMAIS UN NOMBRE QUI TOMBE JUSTE. Si le nombre de départ a
// exactement le bon nombre de décimales — 3,14 au centième —, ses trois
// réponses valent 3,14 : la question n'a plus de sens et l'élève qui coupe a
// raison. Le tirage l'écarte, il ne le corrige pas.

/** Les rangs, dans l'ordre où on les enseigne. */
export const RANGS = [
    { id: 'unite', nom: 'à l’unité', decimales: 0, pas: '1' },
    { id: 'dixieme', nom: 'au dixième', decimales: 1, pas: '0,1' },
    { id: 'centieme', nom: 'au centième', decimales: 2, pas: '0,01' },
    { id: 'millieme', nom: 'au millième', decimales: 3, pas: '0,001' }
];

export const rangDe = (id) => RANGS.find(r => r.id === id) || RANGS[1];

/** Les trois questions. `mot` est ce que l'énoncé demande. */
export const SORTES = {
    defaut: {
        mot: 'la valeur approchée par DÉFAUT',
        court: 'par défaut',
        aide: 'Par défaut : on garde ce qu’il y a devant, on COUPE le reste. '
            + 'C’est la plus petite des deux.'
    },
    exces: {
        mot: 'la valeur approchée par EXCÈS',
        court: 'par excès',
        aide: 'Par excès : on prend celle du dessus. C’est la plus grande des deux.'
    },
    arrondi: {
        mot: 'la valeur ARRONDIE',
        court: 'arrondie',
        aide: 'Arrondir : on prend celle des deux dont le nombre est le plus PROCHE.'
    }
};

export const ORDRE_SORTES = ['defaut', 'exces', 'arrondi'];

/** Les marches : un rang par marche, puis le mélange. */
export const MARCHES_ARRONDI = [
    { id: 'unite', nom: '1. À l’unité' },
    { id: 'dixieme', nom: '2. Au dixième' },
    { id: 'centieme', nom: '3. Au centième' },
    { id: 'millieme', nom: '4. Au millième' },
    { id: 'melange', nom: '5. Tous les rangs mélangés' }
];

// LE CALCUL SE FAIT EN ENTIERS, ET C'EST NÉCESSAIRE.
//
// `Math.floor(2.675 * 100) / 100` rend 2,67 — pas parce que la règle est
// fausse, mais parce que 2,675 n'existe pas en binaire : la machine tient
// 2,67499999999999982. Sur un exercice qui porte EXACTEMENT sur le chiffre
// qu'on garde et celui qu'on jette, c'est la seule erreur qui compte.
//
// On travaille donc sur l'écriture décimale, chiffre par chiffre, comme au
// tableau. Le nombre est fabriqué à partir de ses chiffres, il n'est jamais
// relu d'un flottant.

/** Un nombre décimal, gardé comme on l'écrit : sa partie entière et ses chiffres. */
export function nombreDecimal(entier, chiffres) {
    return { entier, chiffres: chiffres.slice() };
}

/** « 3,1416 » — l'écriture française, celle du cahier. */
export function ecrire(n) {
    return n.chiffres.length ? `${n.entier},${n.chiffres.join('')}` : String(n.entier);
}

/** Sa valeur numérique, pour comparer — jamais pour arrondir. */
export const valeur = (n) => Number(`${n.entier}.${n.chiffres.join('') || '0'}`);

/**
 * LA VALEUR PAR DÉFAUT : on coupe après le rang demandé.
 *
 * @param {{entier:number, chiffres:number[]}} n
 * @param {number} d - le nombre de décimales gardées
 */
export function parDefaut(n, d) {
    return nombreDecimal(n.entier, n.chiffres.slice(0, d));
}

/**
 * LA VALEUR PAR EXCÈS : la suivante, d'un pas de 10^−d.
 *
 * L'addition se fait avec les retenues, à la main : c'est la même opération
 * qu'au tableau, et elle est juste au dernier chiffre près — ce que les
 * flottants ne garantissent pas.
 */
export function parExces(n, d) {
    const c = n.chiffres.slice(0, d);
    let entier = n.entier;
    let i = d - 1;
    let retenue = 1;
    while (i >= 0 && retenue) {
        const v = (c[i] || 0) + retenue;
        c[i] = v % 10;
        retenue = v >= 10 ? 1 : 0;
        i -= 1;
    }
    if (retenue) entier += 1;
    return nombreDecimal(entier, c);
}

/**
 * L'ARRONDI : celle des deux bornes dont on est le plus près.
 *
 * On regarde le chiffre du rang SUIVANT, et rien d'autre — « 2,4999 » arrondi
 * à l'unité vaut 2, pas 3 : on n'arrondit pas de proche en proche. C'est la
 * seconde faute du chapitre, et elle vient de ceux qui ont compris la
 * première.
 *
 * À 5, on prend celle du dessus : c'est la convention, et elle se dit.
 */
export function arrondi(n, d) {
    const suivant = n.chiffres[d];
    return suivant >= 5 ? parExces(n, d) : parDefaut(n, d);
}

/** La réponse attendue, selon la sorte demandée. */
export function reponseDe(t) {
    const d = rangDe(t.rang).decimales;
    if (t.sorte === 'defaut') return parDefaut(t.n, d);
    if (t.sorte === 'exces') return parExces(t.n, d);
    return arrondi(t.n, d);
}

/**
 * TIRER UN NOMBRE À ARRONDIR.
 *
 * Deux exigences. La première : il faut qu'il reste quelque chose à couper —
 * un nombre qui tombe juste au rang demandé rend les trois réponses égales.
 * La seconde : les deux bornes doivent être DIFFÉRENTES, sinon « par défaut »
 * et « par excès » désignent le même nombre.
 */
export function tirerArrondi(rng, marche = 'centieme', { sortes = ORDRE_SORTES } = {}) {
    const liste = (sortes && sortes.length ? sortes : ORDRE_SORTES);
    const sorte = liste[rng.int(0, liste.length - 1)];
    const rang = marche === 'melange'
        ? RANGS[rng.int(0, RANGS.length - 1)].id
        : marche;
    const d = rangDe(rang).decimales;

    // Autant de décimales que le rang demandé, plus deux : il faut de quoi
    // couper, et de quoi que le chiffre suivant décide.
    const total = d + 2;
    const entier = rng.int(1, 99);
    let chiffres = [];
    for (let essai = 0; essai < 40; essai++) {
        chiffres = [];
        for (let i = 0; i < total; i++) chiffres.push(rng.int(0, 9));
        // Ce qu'on coupe ne peut pas être nul — sinon le nombre tombe juste —
        // et il ne se termine pas par un zéro : « 85,50 » n'est pas une
        // écriture qu'on donne à lire, on écrit « 85,5 ». Le dernier chiffre
        // est celui qu'on regarde, et un zéro final ferait croire à une
        // décimale de plus.
        if (chiffres.slice(d).some(c => c !== 0) && chiffres[total - 1] !== 0) break;
    }
    const n = nombreDecimal(entier, chiffres);
    return { marche, rang, sorte, n, decimales: d };
}

/**
 * L'ÉNONCÉ, DANS LES MOTS DU COURS — et le nombre en tête.
 *
 * « Donne la valeur approchée par excès au centième de 3,1416 » se lit deux
 * fois : le nombre arrive après quatre groupes de mots, et l'on a perdu de
 * quoi l'on parlait. Le nombre d'abord, la question ensuite — c'est aussi ce
 * qui range le mieux une colonne de fiche, où l'œil descend sur les nombres.
 */
export function enonceDe(t) {
    return `${ecrire(t.n)} : quelle est ${SORTES[t.sorte].mot} ${rangDe(t.rang).nom} ?`;
}

/** L'encadrement, qui est toute la leçon : « 3,14 < 3,1416 < 3,15 ». */
export function encadrementDe(t) {
    const d = rangDe(t.rang).decimales;
    return `${ecrire(parDefaut(t.n, d))} < ${ecrire(t.n)} < ${ecrire(parExces(t.n, d))}`;
}

/** Trois indices : le rang, l'encadrement, puis la règle du mot demandé. */
export function indicesDe(t) {
    const r = rangDe(t.rang);
    return [
        r.decimales
            ? `${r.nom.replace('au ', 'Au ').replace('à l’', 'À l’')}, il y a ${r.decimales} chiffre`
                + `${r.decimales > 1 ? 's' : ''} après la virgule.`
            : 'À l’unité, il n’y a plus de virgule du tout.',
        `${ecrire(t.n)} est entre ${ecrire(parDefaut(t.n, r.decimales))} et `
            + `${ecrire(parExces(t.n, r.decimales))}.`,
        SORTES[t.sorte].aide
    ];
}

/** L'explication : l'encadrement, puis pourquoi c'est celle-là. */
export function expliquer(t) {
    const d = rangDe(t.rang).decimales;
    const bas = ecrire(parDefaut(t.n, d));
    const haut = ecrire(parExces(t.n, d));
    const rep = ecrire(reponseDe(t));
    const tete = `${bas} < ${ecrire(t.n)} < ${haut}. `;
    if (t.sorte === 'defaut') {
        return `${tete}La valeur par défaut est celle du DESSOUS : ${rep}. `
            + `On garde les chiffres jusqu’au rang demandé, on coupe le reste.`;
    }
    if (t.sorte === 'exces') {
        return `${tete}La valeur par excès est celle du DESSUS : ${rep}. `
            + `C’est la précédente augmentée de ${rangDe(t.rang).pas}.`;
    }
    const suivant = t.n.chiffres[d];
    return `${tete}Le chiffre qui suit le rang est ${suivant} : `
        + `${suivant >= 5 ? 'il est 5 ou plus, on monte' : 'il est plus petit que 5, on reste en dessous'}, `
        + `donc ${rep}. Arrondir, c’est choisir la plus PROCHE des deux — pas couper.`;
}

/**
 * LES FAUSSES RÉPONSES — les trois mots pris l'un pour l'autre, et rien d'autre.
 *
 * Chacune est la BONNE réponse à une AUTRE des trois questions : c'est
 * exactement la confusion qu'on travaille, et le « pourquoi » la nomme.
 */
export function leurresDe(t) {
    const d = rangDe(t.rang).decimales;
    const bas = parDefaut(t.n, d), haut = parExces(t.n, d), rond = arrondi(t.n, d);
    const juste = valeur(reponseDe(t));
    const dit = {
        defaut: 'C’est la valeur par DÉFAUT : celle du dessous, obtenue en coupant.',
        exces: 'C’est la valeur par EXCÈS : celle du dessus.',
        arrondi: 'C’est la valeur ARRONDIE : la plus proche des deux.'
    };
    const trop = `Il y a un chiffre de trop : on demandait ${rangDe(t.rang).nom}.`;
    const manque = `Il manque un chiffre : on demandait ${rangDe(t.rang).nom}.`;
    // LES TROIS MOTS D'ABORD — ce sont eux qu'un QCM doit montrer —, puis les
    // fautes de rang, EN RÉSERVE ET EN NOMBRE.
    //
    // Les candidats se doublent beaucoup : « par excès » et « arrondi » tombent
    // sur le même nombre une fois sur deux, et « un chiffre de trop » se confond
    // avec « par défaut » dès que le chiffre en question est un zéro. Mesuré sur
    // « 25,009 » au dixième : six candidats, trois valeurs distinctes, et le QCM
    // à quatre n'avait plus que trois cases. On en propose donc huit, dont
    // le nombre LUI-MÊME — recopier sans arrondir est une faute pour de bon,
    // et elle mérite d'être nommée.
    const brut = [
        { n: bas, why: dit.defaut }, { n: haut, why: dit.exces }, { n: rond, why: dit.arrondi },
        { n: t.n, why: 'C’est le nombre de départ, recopié : on demandait une valeur approchée.' },
        { n: parDefaut(t.n, d + 1), why: trop },
        { n: parExces(t.n, d + 1), why: trop },
        ...(d > 0
            ? [{ n: parDefaut(t.n, d - 1), why: manque }, { n: parExces(t.n, d - 1), why: manque }]
            : [{ n: parExces(t.n, d + 2), why: trop }])
    ];
    const vus = new Set([juste]);
    const out = [];
    for (const b of brut) {
        const v = valeur(b.n);
        if (vus.has(v)) continue;
        vus.add(v);
        out.push({ value: v, texte: ecrire(b.n), why: b.why });
    }
    return out;
}
