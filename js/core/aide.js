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
 * Ce qu'il faut faire à la question `rang` (1 pour la première) sur `total`.
 *
 * @returns {{ propositions: number|null, clavier: boolean }}
 *   `propositions` : combien en montrer, `null` pour toutes.
 *   `clavier` : la réponse se tape au lieu de se choisir.
 */
export function aideAuRang(params = {}, rang = 1, total = 10) {
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
