// L'AIDE À LA RÉPONSE — la progressivité qui ne dépend d'aucune notion.
//
// Il y a deux progressivités dans un exercice, et les confondre est ce qui a
// fait qu'il n'y en a presque nulle part :
//
//   · L'ÉTAPE — quel contenu, quelle difficulté. Seul le générateur le sait :
//     personne d'autre ne peut décider que 7 × 8 est plus dur que 7 × 2. Ça
//     s'écrit à la main, générateur par générateur, et sur soixante-six
//     générateurs quatre seulement ont pris la peine de le faire.
//
//   · L'AIDE — combien de propositions, et quand on passe au clavier. Ça ne
//     dépend de RIEN : c'est vrai pour la table de 7 comme pour la notation
//     d'un segment. Donc ça s'écrit UNE fois, ici, et tous les exercices à
//     propositions l'ont d'un coup.
//
// Ce module ne connaît ni les nombres ni les figures : il répond à une seule
// question, « à la question numéro n sur N, combien de propositions, et
// est-ce qu'on tape la réponse ? ».
//
// POURQUOI DEUX PROPOSITIONS AU DÉBUT, ET PAS TROIS.
// Les générateurs écrivent leurs distracteurs du plus instructif au plus
// anodin — le premier porte presque toujours un « pourquoi » qui nomme
// l'erreur classique (« tu as additionné : ici il faut chercher ce qu'il
// manque »). Réduire à deux, c'est donc garder LA bonne réponse contre L'erreur
// du chapitre. Ce n'est pas un QCM appauvri, c'est un vrai/faux ciblé — et
// c'est souvent la meilleure question des trois.

/**
 * Les modes d'aide. `debut` et `fin` sont des nombres de propositions ;
 * `saisie` dit à quel moment le pavé numérique prend la main.
 *
 * `null` en `debut`/`fin` veut dire « toutes celles que le générateur donne » :
 * certains en fournissent douze à dessein (le tableau de Pythagore), les
 * tronquer à quatre casserait l'exercice.
 */
export const MODES = {
    progressive: { debut: 2, fin: 4, saisie: 'quart' },
    propositions: { debut: 4, fin: 4, saisie: 'jamais' },
    deux: { debut: 2, fin: 2, saisie: 'jamais' },
    toutes: { debut: null, fin: null, saisie: 'jamais' },
    clavier: { debut: 4, fin: 4, saisie: 'toujours' }
};

/** Les seuils de passage au clavier, en fraction de l'exercice. */
export const SEUILS_SAISIE = { moitie: 0.5, quart: 0.75, tiers: 1 / 3 };

const MODE_PAR_DEFAUT = 'progressive';

/** Combien de questions à deux propositions avant d'ouvrir à quatre. */
export const DEBUT_FACILE = 3;

/**
 * Le mode retenu, réglages en main.
 *
 * `aide` est un PRÉRÉGLAGE : il pose d'un coup le nombre de propositions et le
 * moment du clavier. Un professeur qui veut affiner touche `propositions` ou
 * `saisie`, qui l'emportent alors — sans invalider le reste du préréglage.
 * C'est le seul agencement qui tienne les deux promesses à la fois : un seul
 * réglage pour qui ne veut qu'un seul réglage, deux vis pour qui sait où il va.
 */
export function modeDe(params = {}) {
    return MODES[params.aide] ? params.aide : MODE_PAR_DEFAUT;
}

/** Vrai si un réglage fin s'écarte du préréglage : l'interface doit le dire. */
export function affine(params = {}) {
    return (params.propositions !== undefined && params.propositions !== 'auto')
        || (params.saisie !== undefined && params.saisie !== 'auto');
}

/**
 * LA RÉPARTITION EXPLICITE — « sur 10 questions, 2 à deux propositions, 3 à
 * quatre, le reste au clavier ».
 *
 * Rémy, après trois essais sur ce panneau : « soit il faut expliquer au prof
 * que l'exercice s'adapte, soit on définit vraiment par exemple sur 10
 * questions on fait 2 questions de qcm de 2 puis 3 de qcm de 4 ».
 *
 * Il a raison, et le préréglage était le problème : « Progressif » est un NOM.
 * Il ne dit ni combien de questions sont faciles, ni quand le clavier arrive —
 * et le professeur qui prépare sa séance a besoin de ces deux nombres, pas
 * d'un adjectif. On lui donne donc les nombres, et il les écrit lui-même.
 *
 * DEUX NOMBRES SUFFISENT, ET LE TROISIÈME SE DÉDUIT. Combien de questions à
 * deux propositions, combien à quatre — le reste se tape au clavier. C'est
 * exactement la phrase de Rémy, et c'est aussi ce qui rend la somme toujours
 * juste : on ne peut pas se tromper sur un total qu'on ne saisit pas.
 *
 * `'auto'` garde le comportement des préréglages, qui reste le défaut : un
 * professeur qui ne veut rien régler n'a rien à régler.
 *
 * @returns {{deux: number, quatre: number, clavier: number}|null}
 */
export function repartitionDe(params = {}, total = 10) {
    const brut = params.repartition;
    if (brut === undefined || brut === null || brut === 'auto' || brut === '') return null;
    const n = Math.max(1, Math.round(Number(total) || 10));
    const [a, b] = String(brut).split('-').map(v => Math.max(0, Math.round(Number(v) || 0)));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    // BORNÉE PAR LE TOTAL, ET DANS L'ORDRE. Le nombre de questions se règle
    // ailleurs et peut descendre APRÈS qu'on a écrit la répartition : sans
    // cette borne, « 3 et 5 » sur un exercice ramené à 4 questions promettrait
    // huit questions qui n'existent pas.
    const deux = Math.min(a, n);
    const quatre = Math.min(b, n - deux);
    return { deux, quatre, clavier: n - deux - quatre };
}

/** La répartition telle qu'on l'écrit dans les réglages : « 3-5 ». */
export const ecrireRepartition = (deux, quatre) =>
    `${Math.max(0, Math.round(deux))}-${Math.max(0, Math.round(quatre))}`;

/**
 * La répartition qu'un préréglage produit, pour AMORCER la saisie du
 * professeur : il ouvre le panneau, voit trois nombres qui décrivent ce que
 * l'exercice fait déjà, et les corrige. Partir de zéro l'obligerait à
 * reconstruire une progression que le logiciel connaît.
 */
export function repartitionDuMode(params = {}, total = 10) {
    const n = Math.max(1, Math.round(Number(total) || 10));
    let deux = 0, quatre = 0, clavier = 0;
    for (let r = 1; r <= n; r++) {
        const a = aideAuRang({ ...params, repartition: 'auto' }, r, n);
        if (a.clavier) clavier++;
        else if (a.propositions === 2) deux++;
        else quatre++;
    }
    return { deux, quatre, clavier };
}

/**
 * Ce qu'il faut faire à la question `rang` (1 pour la première) sur `total`.
 *
 * @returns {{ propositions: number|null, clavier: boolean }}
 *   `propositions` : combien en montrer, `null` pour toutes.
 *   `clavier` : la réponse se tape au lieu de se choisir.
 */
export function aideAuRang(params = {}, rang = 1, total = 10) {
    // LA RÉPARTITION ÉCRITE À LA MAIN PASSE AVANT TOUT LE RESTE — voir
    // `repartitionDe`. C'est le professeur qui a décidé ; aucun préréglage
    // n'a d'avis à donner par-dessus.
    const rep = repartitionDe(params, total);
    if (rep) {
        const r0 = Math.max(1, Number(rang) || 1);
        if (r0 <= rep.deux) return { propositions: 2, clavier: false };
        if (r0 <= rep.deux + rep.quatre) return { propositions: 4, clavier: false };
        return { propositions: 4, clavier: true };
    }
    return aideAuRangAuto(params, rang, total);
}

function aideAuRangAuto(params = {}, rang = 1, total = 10) {
    const m = MODES[modeDe(params)];
    const n = Math.max(2, Number(total) || 10);
    const r = Math.max(1, Number(rang) || 1);

    // Le réglage fin l'emporte sur le préréglage, et seulement lui.
    const forceN = params.propositions !== undefined && params.propositions !== 'auto'
        ? (params.propositions === 'toutes' ? null : Number(params.propositions))
        : undefined;
    const quandSaisie = params.saisie !== undefined && params.saisie !== 'auto'
        ? params.saisie : m.saisie;

    let clavier = false;
    if (quandSaisie === 'toujours') clavier = true;
    else if (SEUILS_SAISIE[quandSaisie]) {
        // `n - 1` en garde-fou : sur un exercice de trois questions, le dernier
        // quart ne contient aucune question entière, et l'escalier s'arrêtait
        // une marche avant la fin — on ne tapait jamais la réponse. Un exercice
        // court reste un escalier ; il a juste des marches plus hautes.
        const seuil = Math.min(n - 1, Math.ceil(n * SEUILS_SAISIE[quandSaisie]));
        clavier = r > seuil;
    }

    // TROIS QUESTIONS, ET PAS UN TIERS.
    //
    // Le tiers semblait plus élégant, il est faux : Rémy donne volontiers
    // vingt additions, et un tiers de vingt fait sept vrai/faux d'affilée —
    // l'élève s'installe alors dans l'élimination au lieu de chercher. La
    // marche du début sert à METTRE EN CONFIANCE, pas à occuper le début de
    // l'exercice : c'est une longueur en questions, pas une proportion.
    //
    // Bornée par la longueur de l'exercice, faute de quoi un exercice de
    // trois questions n'aurait plus que la marche facile.
    let propositions = forceN !== undefined ? forceN
        : (r <= Math.min(DEBUT_FACILE, Math.max(1, n - 1)) ? m.debut : m.fin);
    if (propositions !== null && !(propositions >= 2)) propositions = null;

    return { propositions, clavier };
}

/**
 * Réduit une liste de propositions à `n`, en gardant la bonne réponse et les
 * distracteurs les plus instructifs.
 *
 * L'ORDRE D'ORIGINE EST CE QUI COMPTE. `finalizeChoices` mélange les
 * propositions avant de les rendre — il le faut, sinon la bonne réponse serait
 * toujours au même endroit — mais il note au passage le rang qu'elles avaient
 * dans la liste écrite par l'auteur. Tronquer sans ce rang reviendrait à
 * garder deux distracteurs au hasard, c'est-à-dire à jeter une fois sur deux
 * celui qui portait l'explication.
 *
 * L'ordre affiché, lui, n'est pas retouché : les survivants gardent leurs
 * places relatives, donc la bonne réponse reste où le mélange l'avait mise.
 */
export function reduireChoix(choix, n) {
    if (!Array.isArray(choix) || !choix.length) return choix || [];
    if (n === null || n === undefined || !(n >= 2) || choix.length <= n) return choix;

    const bonne = choix.find(c => c.correct);
    if (!bonne) return choix;

    const gardes = new Set([bonne]);
    choix.filter(c => !c.correct)
        .slice()
        .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99))
        .slice(0, n - 1)
        .forEach(c => gardes.add(c));

    return choix.filter(c => gardes.has(c));
}

// --- L'ESCALIER QUI SUIT L'ÉLÈVE --------------------------------------------
//
// Rémy : « peut-être est-ce à toi de décider en fonction des réussites de
// l'élève ». Oui — et c'est mieux que le calendrier fixe, pour une raison
// précise : le calendrier décrit l'élève MOYEN. Trois questions faciles, puis
// quatre propositions, puis le clavier, c'est juste pour la plupart, trop
// rapide pour celui qui bloque, et trois questions de trop pour celui qui
// savait déjà. Les deux extrémités de la classe sont justement celles qu'on
// voulait aider.
//
// COMBIEN DE PREUVES POUR MONTER — et pourquoi pas le même nombre partout.
// À deux propositions, répondre au hasard tombe juste une fois sur deux : deux
// réussites d'affilée s'obtiennent par chance une fois sur quatre. On demande
// donc TROIS preuves pour quitter la marche du bas (une chance sur huit), et
// deux ensuite (une sur seize à quatre propositions). Plus la marche est
// facile, plus il faut de preuves — c'est l'inverse de l'intuition, et c'est
// la seule façon de ne pas promouvoir un élève qui clique.
//
// CE QUI COMPTE COMME PREUVE : juste, du premier coup, sans indice. Une bonne
// réponse au deuxième essai n'est pas une faute — mais ce n'est pas une preuve
// non plus : elle remet le compteur à zéro sans faire redescendre.
//
// ET ON REDESCEND. Deux questions ratées d'affilée rendent la marche
// précédente. Ce n'est pas une punition, c'est le filet : reconnaître 42 parmi
// quatre nombres et produire 42 sont deux choses différentes, et un élève qui
// vient de passer au clavier peut très bien avoir besoin des propositions.
// L'inverse — ne jamais redescendre — laisse un élève échouer jusqu'au bout
// d'un exercice dont il avait réussi la première moitié.

export const ECHELONS = [
    { propositions: 2, clavier: false },
    { propositions: 4, clavier: false },
    { propositions: null, clavier: true }
];

export const PREUVES = [3, 2, 2];
export const RATES_POUR_DESCENDRE = 2;

/** L'élève entre par le bas : deux propositions, la bonne et l'erreur classique. */
export function etatDepart() {
    return { echelon: 0, preuves: 0, rates: 0 };
}

/**
 * L'état après une réponse.
 *
 * @param {{echelon:number,preuves:number,rates:number}} etat
 * @param {{reussi:boolean, duPremierCoup?:boolean, avecIndice?:boolean}} reponse
 */
export function apresReponse(etat, reponse = {}) {
    const e = etat && Number.isInteger(etat.echelon) ? etat : etatDepart();
    const echelon = Math.max(0, Math.min(ECHELONS.length - 1, e.echelon));
    const { reussi, duPremierCoup = true, avecIndice = false } = reponse;

    if (reussi === false) {
        const rates = (e.rates || 0) + 1;
        if (rates >= RATES_POUR_DESCENDRE && echelon > 0) {
            return { echelon: echelon - 1, preuves: 0, rates: 0, vient: 'descendu' };
        }
        return { echelon, preuves: 0, rates };
    }

    // Réussi, mais pas seul : ni preuve, ni raté.
    if (!duPremierCoup || avecIndice) return { echelon, preuves: 0, rates: 0 };

    const preuves = (e.preuves || 0) + 1;
    if (preuves >= PREUVES[echelon] && echelon < ECHELONS.length - 1) {
        return { echelon: echelon + 1, preuves: 0, rates: 0, vient: 'monte' };
    }
    return { echelon, preuves, rates: 0 };
}

/** Ce que l'échelon courant demande d'afficher. */
export function echelonDe(etat) {
    const i = etat && Number.isInteger(etat.echelon) ? etat.echelon : 0;
    return ECHELONS[Math.max(0, Math.min(ECHELONS.length - 1, i))];
}

/**
 * L'aide à la question suivante, réglages ET parcours de l'élève en main.
 *
 * Les modes fixes (« toujours 4 propositions », « directement au clavier ») et
 * les réglages fins l'emportent : un professeur qui a posé une valeur veut
 * cette valeur, pas une valeur qui bouge. L'adaptation ne joue que là où le
 * réglage dit « progressive », c'est-à-dire là où l'on a demandé un escalier.
 */
export function aideSelonEtat(params = {}, etat, rang = 1, total = 10) {
    if (modeDe(params) !== 'progressive' || affine(params) || !etat) {
        return aideAuRang(params, rang, total);
    }
    return { ...echelonDe(etat) };
}
