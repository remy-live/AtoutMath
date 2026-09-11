// LE TABLEAU DE PROPORTIONNALITÉ — et le coefficient qu'on ne voit pas.
//
// Un élève qui complète un tableau de proportionnalité fait presque toujours la
// même chose : il regarde la colonne d'à côté et il AJOUTE. « 4 stylos coûtent
// 6 €, donc 5 stylos coûtent 7 € » — il a ajouté 1 des deux côtés. Le
// raisonnement additif est le raisonnement par défaut, et il donne juste assez
// souvent (quand on passe de 4 à 5, l'erreur est petite) pour ne pas alerter.
//
// Ce qu'il faut installer à la place tient en une phrase : DANS UN TABLEAU DE
// PROPORTIONNALITÉ, ON PASSE D'UNE LIGNE À L'AUTRE EN MULTIPLIANT TOUJOURS PAR
// LE MÊME NOMBRE. Ce nombre est le coefficient, et il est invisible tant que
// personne ne le calcule. D'où le bouton qui le fait apparaître — avec la
// colonne de l'unité, qui est l'autre chemin, celui qui marche toujours.
//
// Le module fabrique les tableaux, place les trous en garantissant qu'ils sont
// TOUS déductibles, et diagnostique les erreurs classiques : l'écart additif,
// le coefficient pris pour la réponse, la multiplication au lieu de la
// division. Il ne connaît ni le DOM ni le clavier.

// LES CONTEXTES, et leurs coefficients PLAUSIBLES.
//
// Chaque contexte porte sa propre liste de coefficients, et ce n'est pas du
// zèle : un coefficient tiré au hasard donne « 14 h de route pour 16,8 km »,
// soit une voiture à 1,2 km/h. L'élève qui lit ça n'apprend pas la
// proportionnalité, il apprend que les énoncés de maths ne veulent rien dire.
// Le prix d'un stylo se compte en euros, une vitesse en dizaines de km/h, une
// dose de farine en grammes par personne : ce sont trois ordres de grandeur
// différents, et ils ne se mélangent pas.
//
// `aMax` borne la ligne du haut pour la même raison : on ne roule pas 40 heures
// d'affilée, et on n'achète pas 40 mètres de tissu.
export const CONTEXTES = [
    { id: 'stylos', a: 'Nombre de stylos', b: 'Prix', uB: '€', sujet: 'l\'achat de stylos',
      coefs: [0.5, 0.8, 1.2, 1.5, 2, 2.5, 3, 4], aMax: 12 },
    { id: 'cahiers', a: 'Nombre de cahiers', b: 'Prix', uB: '€', sujet: 'l\'achat de cahiers',
      coefs: [1.5, 2, 2.5, 3, 3.5, 4, 5], aMax: 12 },
    { id: 'farine', a: 'Nombre de personnes', b: 'Farine', uB: 'g', sujet: 'une recette de crêpes',
      coefs: [50, 60, 75, 80, 100, 120, 125, 150], aMax: 12 },
    { id: 'essence', a: 'Essence', uA: 'L', b: 'Prix', uB: '€', sujet: 'un plein d\'essence',
      coefs: [1.5, 1.6, 1.75, 1.8, 2], aMax: 40 },
    { id: 'tissu', a: 'Tissu', uA: 'm', b: 'Prix', uB: '€', sujet: 'l\'achat de tissu',
      coefs: [3, 4, 5, 6, 7.5, 8, 12], aMax: 12 },
    { id: 'sirop', a: 'Sirop', uA: 'cL', b: 'Eau', uB: 'cL', sujet: 'une menthe à l\'eau toujours dosée pareil',
      coefs: [3, 4, 5, 6, 7, 8], aMax: 12 },
    { id: 'peinture', a: 'Surface', uA: 'm²', b: 'Peinture', uB: 'L', sujet: 'un mur à peindre',
      coefs: [0.2, 0.25, 0.5], aMax: 40 },
    { id: 'route', a: 'Durée', uA: 'h', b: 'Distance', uB: 'km', sujet: 'un trajet à vitesse constante',
      coefs: [40, 50, 60, 70, 80, 90, 100, 110], aMax: 8 },
    { id: 'billes', a: 'Nombre de sachets', b: 'Nombre de billes', uB: '', sujet: 'des sachets de billes tous identiques',
      coefs: [5, 6, 8, 10, 12, 15, 20, 25], aMax: 12 },
    { id: 'plan', a: 'Sur le plan', uA: 'cm', b: 'En vrai', uB: 'm', sujet: 'un plan à l\'échelle',
      coefs: [0.5, 2, 2.5, 5, 10], aMax: 20 }
];

/**
 * Écrit un nombre à la française, sans zéro inutile.
 * « 7,5 » et non « 7.50 » ; « 12 » et non « 12,00 ».
 */
export function ecrire(x) {
    if (x == null) return '';
    const r = Math.round(x * 100) / 100;
    return (Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '')).replace('.', ',');
}

/** Lit ce que l'élève a tapé : la virgule vaut le point. */
export function lire(texte) {
    const t = String(texte ?? '').trim().replace(',', '.').replace(/\s/g, '');
    if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
}

const arrondi = (x) => Math.round(x * 100) / 100;
const exact = (x) => Math.abs(x - arrondi(x)) < 1e-9;

// Ce que chaque niveau accepte comme coefficient — parmi ceux que le contexte
// juge plausibles. Un coefficient entier se devine ; un coefficient à une
// décimale oblige à le calculer ; un coefficient plus petit que 1 casse l'idée
// fausse que « multiplier, ça fait plus grand ».
const NIVEAUX = {
    facile: {
        convient: (c) => Number.isInteger(c) && c >= 2 && c <= 12,
        cols: 4, trous: 2, plafondA: 12, deuxLignes: false
    },
    moyen: {
        convient: (c) => c >= 0.5 && c <= 25 && Math.abs(c * 10 - Math.round(c * 10)) < 1e-9,
        cols: 4, trous: 3, plafondA: 20, deuxLignes: true
    },
    difficile: {
        convient: () => true,
        cols: 5, trous: 4, plafondA: 40, deuxLignes: true
    }
};

export const IDS_NIVEAUX = Object.keys(NIVEAUX);

/**
 * Tire un tableau à compléter.
 *
 * Deux invariants, et ils ne sont pas décoratifs :
 *
 *   AU MOINS UNE COLONNE COMPLÈTE. Sans elle, le coefficient est indéterminé
 *   et l'élève ne peut rien déduire — il aurait tort en ayant raison.
 *   JAMAIS LES DEUX CASES D'UNE MÊME COLONNE. Même raison, vue de l'autre
 *   bout : une colonne vide des deux côtés ne se remplit qu'en supposant.
 */
export function tirerTableau(niveau, rng) {
    const N = NIVEAUX[niveau] || NIVEAUX.facile;

    // Les contextes qui ont au moins un coefficient acceptable à ce niveau.
    const possibles = CONTEXTES.filter(c => c.coefs.some(N.convient));
    const pool = possibles.length ? possibles : CONTEXTES;

    for (let essai = 0; essai < 300; essai++) {
        const ctx = rng.pick(pool);
        const bons = ctx.coefs.filter(N.convient);
        if (!bons.length) continue;
        const coef = rng.pick(bons);
        const aMax = Math.min(ctx.aMax, N.plafondA);

        // Des valeurs distinctes, croissantes, et qui donnent des résultats
        // écrivables : trois décimales dans une case de tableau, personne ne
        // les recopie.
        const vus = new Set();
        const a = [];
        for (let i = 0; i < N.cols && a.length < N.cols; i++) {
            for (let k = 0; k < 40; k++) {
                const v = rng.int(1, aMax);
                if (vus.has(v) || !exact(v * coef)) continue;
                vus.add(v); a.push(v); break;
            }
        }
        if (a.length < N.cols) continue;
        a.sort((x, y) => x - y);
        const b = a.map(v => arrondi(v * coef));

        // Les trous. On tire les colonnes creusées d'abord — jamais toutes —
        // puis, pour chacune, la ligne à masquer.
        const cols = rng.shuffle(a.map((_, i) => i)).slice(0, Math.min(N.trous, N.cols - 1));
        const trous = cols.map(i => ({
            col: i,
            ligne: N.deuxLignes ? (rng.bool() ? 'a' : 'b') : 'b'
        }));
        // Au moins un trou sur la ligne du bas : c'est le sens direct
        // (multiplier par le coefficient), celui qu'il faut avoir d'abord.
        if (!trous.some(t => t.ligne === 'b')) trous[0].ligne = 'b';
        // Et une valeur à trouver ne doit pas être ridicule à écrire.
        if (trous.some(t => !exact(t.ligne === 'a' ? a[t.col] : b[t.col]))) continue;

        return {
            contexte: ctx, coef, a, b, trous,
            unitaire: arrondi(coef),          // la valeur de la ligne du bas pour 1
            niveau
        };
    }

    // Filet de sécurité : le tableau le plus simple qui soit.
    const ctx = CONTEXTES[0];
    return {
        contexte: ctx, coef: 3, a: [1, 2, 4, 6], b: [3, 6, 12, 18],
        trous: [{ col: 2, ligne: 'b' }, { col: 3, ligne: 'b' }], unitaire: 3, niveau
    };
}

/** La valeur attendue dans un trou. */
export function attendu(t, trou) {
    return trou.ligne === 'a' ? t.a[trou.col] : t.b[trou.col];
}

/** Les colonnes entièrement connues au départ : celles où l'on peut lire le lien. */
export function colonnesCompletes(t) {
    const creuses = new Set(t.trous.map(x => x.col));
    return t.a.map((_, i) => i).filter(i => !creuses.has(i));
}

/**
 * Vérifie une case, et NOMME l'erreur quand il y en a une.
 *
 * Trois erreurs valent d'être distinguées, parce qu'elles n'appellent pas la
 * même phrase :
 *
 *   ADDITIF.     L'élève a reporté l'écart de la colonne voisine au lieu de
 *                multiplier. C'est L'erreur du chapitre, celle qui survit
 *                jusqu'au lycée si personne ne la nomme.
 *   INVERSÉ.     Il a multiplié là où il fallait diviser (ou l'inverse) —
 *                il a le bon coefficient mais pas le bon sens.
 *   COEFFICIENT. Il a écrit le coefficient lui-même à la place du résultat.
 */
export function verifierCase(t, trou, valeur) {
    if (valeur === null) {
        return { ok: false, faute: 'vide', message: 'Écris un nombre — la virgule est acceptée.' };
    }
    const bon = attendu(t, trou);
    if (Math.abs(valeur - bon) < 1e-9) return { ok: true };

    const { col, ligne } = trou;
    const inverse = ligne === 'a' ? arrondi(t.b[col] * t.coef) : arrondi(t.a[col] / t.coef);
    if (Math.abs(valeur - inverse) < 1e-9) {
        return {
            ok: false, faute: 'inverse',
            message: ligne === 'a'
                ? `Le coefficient va du HAUT vers le bas : pour remonter, on divise. ${ecrire(t.b[col])} ÷ ${ecrire(t.coef)}.`
                : `On descend du haut vers le bas : on MULTIPLIE par ${ecrire(t.coef)}, on ne divise pas.`
        };
    }
    if (Math.abs(valeur - t.coef) < 1e-9) {
        return {
            ok: false, faute: 'coefficient',
            message: `${ecrire(t.coef)} est le coefficient, pas la réponse : c'est par lui qu'il faut multiplier.`
        };
    }
    // L'écart additif : on compare à ce qu'on obtiendrait en reportant la
    // différence d'une colonne voisine connue.
    for (const j of colonnesCompletes(t)) {
        const parAddition = ligne === 'a'
            ? t.a[j] + (t.b[col] - t.b[j])
            : t.b[j] + (t.a[col] - t.a[j]);
        if (Math.abs(valeur - parAddition) < 1e-9) {
            return {
                ok: false, faute: 'additif',
                message: 'Tu as ajouté l\'écart au lieu de multiplier. Dans un tableau de proportionnalité, on passe d\'une ligne à l\'autre en MULTIPLIANT — toujours par le même nombre.'
            };
        }
    }
    return {
        ok: false, faute: 'autre',
        message: `Ce n'est pas ça. Repère une colonne complète : elle donne le lien entre les deux lignes.`
    };
}

/** Le tableau est-il entièrement et correctement rempli ? */
export function termine(t, saisies) {
    return t.trous.every((trou, i) => {
        const v = saisies[i];
        return v != null && Math.abs(v - attendu(t, trou)) < 1e-9;
    });
}

/**
 * La correction d'un trou, en deux chemins.
 *
 * Le coefficient est le plus rapide ; le retour à l'unité est le plus sûr, et
 * c'est le seul qui reste praticable quand le coefficient tombe mal. Les
 * montrer tous les deux, c'est dire qu'il y a plusieurs façons de raisonner —
 * ce qui est vrai, et rarement dit.
 */
export function expliquer(t, trou) {
    const { col, ligne } = trou;
    const ref = colonnesCompletes(t)[0] ?? 0;
    const bon = attendu(t, trou);
    if (ligne === 'b') {
        return [
            `Une colonne complète : ${ecrire(t.a[ref])} → ${ecrire(t.b[ref])}.`,
            `Le coefficient : ${ecrire(t.b[ref])} ÷ ${ecrire(t.a[ref])} = ${ecrire(t.coef)}.`,
            `On l'applique : ${ecrire(t.a[col])} × ${ecrire(t.coef)} = ${ecrire(bon)}.`
        ];
    }
    return [
        `Une colonne complète : ${ecrire(t.a[ref])} → ${ecrire(t.b[ref])}.`,
        `Le coefficient : ${ecrire(t.b[ref])} ÷ ${ecrire(t.a[ref])} = ${ecrire(t.coef)}.`,
        `On remonte, donc on divise : ${ecrire(t.b[col])} ÷ ${ecrire(t.coef)} = ${ecrire(bon)}.`
    ];
}

/** L'énoncé, en une phrase : ce que le tableau raconte. */
export function direContexte(t) {
    const c = t.contexte;
    return `Ce tableau décrit ${c.sujet}. Les deux grandeurs sont proportionnelles.`;
}

/** L'en-tête d'une ligne, unité comprise. */
export function titreLigne(t, ligne) {
    const c = t.contexte;
    const u = ligne === 'a' ? c.uA : c.uB;
    return u ? `${ligne === 'a' ? c.a : c.b} (${u})` : (ligne === 'a' ? c.a : c.b);
}
