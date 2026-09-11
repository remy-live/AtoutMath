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

/**
 * Vrai si le professeur a posé une valeur qui s'écarte du préréglage :
 * l'interface doit le dire, et surtout l'ADAPTATION doit s'effacer.
 *
 * LA RÉPARTITION ÉCRITE EN FAIT PARTIE, et l'oublier a coûté un bug : un
 * professeur écrivait « les deux premières questions à deux propositions », et
 * l'élève dont l'échelle était montée recevait le clavier dès la première.
 * L'adaptation passait devant une consigne explicite — exactement ce qu'elle ne
 * doit jamais faire. Quand on a décidé pour l'élève, on a décidé.
 */
export function affine(params = {}) {
    return (params.propositions !== undefined && params.propositions !== 'auto')
        || (params.saisie !== undefined && params.saisie !== 'auto')
        || (params.repartition !== undefined && params.repartition !== 'auto'
            && params.repartition !== '');
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

/** La répartition telle qu'on l'écrivait : « 3-5 ». Voir `ecrireZones`. */
export const ecrireRepartition = (deux, quatre) =>
    `${Math.max(0, Math.round(deux))}-${Math.max(0, Math.round(quatre))}`;

// --- LES ZONES : LA RÉPARTITION, GÉNÉRALISÉE --------------------------------
//
// Rémy, sixième passage sur ce réglage : « quand on clique sur une zone, on a
// au-dessus l'aperçu, et un bouton pour ajouter ou enlever le nombre de
// propositions. On peut aussi enlever la zone, et on a un bouton pour en
// rajouter. »
//
// C'EST UNE DEMANDE DE FOND, PAS UNE DEMANDE D'INTERFACE. Le modèle d'avant
// tenait en deux nombres parce qu'il supposait TROIS phases fixes — deux
// propositions, quatre, puis le clavier. Cette hypothèse était commode et
// fausse : rien n'interdit de commencer à trois propositions, de faire deux
// paliers de quatre séparés par du clavier, ou de ne jamais en proposer que
// six. Un professeur qui veut cela n'a pas un besoin exotique ; il a un besoin
// que la structure de données lui refusait.
//
// UNE ZONE EST DONC UN COUPLE : combien de questions, et comment on y répond.
// Les zones se suivent dans l'ordre, et LA DERNIÈRE ABSORBE LE RESTE — c'est
// ce qui garde la somme juste sans jamais la faire saisir, exactement comme la
// troisième phase le faisait avant.

/** Les façons de répondre qu'une zone peut demander, de la plus aidée à la moins. */
export const MODES_ZONE = [
    { cle: '2', nom: '2 propositions', propositions: 2, clavier: false },
    { cle: '3', nom: '3 propositions', propositions: 3, clavier: false },
    { cle: '4', nom: '4 propositions', propositions: 4, clavier: false },
    { cle: '6', nom: '6 propositions', propositions: 6, clavier: false },
    { cle: 't', nom: 'Toutes les propositions', propositions: null, clavier: false },
    { cle: 'k', nom: 'Au clavier', propositions: null, clavier: true }
];

/** Au-delà, on ne lit plus une progression : on lit un tableau de bord. */
export const ZONES_MAX = 6;

export const modeZone = (cle) =>
    MODES_ZONE.find(m => m.cle === String(cle)) || MODES_ZONE[0];

/** Le mode SUIVANT dans l'échelle d'aide — ce que fait le bouton « + ». */
export function modeVoisin(cle, sens) {
    const i = MODES_ZONE.findIndex(m => m.cle === String(cle));
    const j = Math.max(0, Math.min(MODES_ZONE.length - 1, (i < 0 ? 0 : i) + sens));
    return MODES_ZONE[j].cle;
}

/** Les zones telles qu'on les écrit dans les réglages : « 3:2,5:4,2:k ». */
export const ecrireZones = (zones) => (zones || [])
    .filter(z => z && z.n > 0)
    .map(z => `${Math.max(0, Math.round(z.n))}:${modeZone(z.mode).cle}`)
    .join(',');

/**
 * LES ZONES ÉCRITES, NORMALISÉES SUR LE TOTAL.
 *
 * Deux formes acceptées, et la seconde n'est pas de la complaisance : les
 * parcours déjà enregistrés portent l'ancienne écriture à deux nombres, et
 * les relire faux effacerait sans prévenir un réglage que le professeur a
 * posé. « 3-5 » veut dire trois zones : trois questions à deux propositions,
 * cinq à quatre, le reste au clavier.
 *
 * LA DERNIÈRE ZONE ABSORBE LE RESTE, et les zones qui débordent disparaissent.
 * Le nombre de questions se règle ailleurs et peut baisser APRÈS : sans cette
 * normalisation, « 3, 5 et 2 » sur un exercice ramené à quatre questions
 * promettrait six questions qui n'existent pas.
 *
 * @returns {Array<{n:number, mode:string}>|null} `null` si rien n'est écrit.
 */
export function lireZones(params = {}, total = 10) {
    const brut = params.repartition;
    if (brut === undefined || brut === null || brut === 'auto' || brut === '') return null;
    const n = Math.max(1, Math.round(Number(total) || 10));
    const texte = String(brut).trim();

    let zones;
    if (/^\d+\s*-\s*\d+$/.test(texte)) {
        const [a, b] = texte.split('-').map(v => Math.max(0, Math.round(Number(v) || 0)));
        zones = [{ n: a, mode: '2' }, { n: b, mode: '4' }, { n: Math.max(0, n - a - b), mode: 'k' }];
    } else {
        zones = texte.split(',').map(part => {
            const [c, m] = part.split(':');
            return { n: Math.max(0, Math.round(Number(c) || 0)), mode: modeZone(m).cle };
        }).filter(z => Number.isFinite(z.n));
    }
    if (!zones.length) return null;
    return normaliserZones(zones, n);
}

/**
 * Coupe les zones sur le total, et donne le reste à la dernière.
 *
 * ON NE REND JAMAIS UNE LISTE VIDE. Une répartition écrite qui ne couvrirait
 * aucune question laisserait l'élève sans aucune façon de répondre.
 */
export function normaliserZones(zones, total) {
    const n = Math.max(1, Math.round(Number(total) || 1));
    const out = [];
    let pris = 0;
    for (const z of zones || []) {
        if (pris >= n) break;
        const part = Math.max(0, Math.min(Math.round(z.n) || 0, n - pris));
        if (part === 0 && out.length) continue;
        out.push({ n: part, mode: modeZone(z.mode).cle });
        pris += part;
    }
    if (!out.length) out.push({ n: 0, mode: '2' });
    // Le reste à la dernière : c'est la règle qui rend la somme infaillible.
    out[out.length - 1].n += n - pris;
    // ON NE FOND PLUS DEUX ZONES VOISINES DE MÊME MODE.
    //
    // Rémy : « ne fusionne pas les zones de la frise. Exemple : j'ai une zone à
    // deux, je rajoute une zone, je clique sur 2 — elle fusionne avec la
    // précédente, du coup je dois en recréer une pour faire un autre réglage. »
    //
    // LA FUSION DÉTRUISAIT UN GESTE QU'ON VENAIT DE FAIRE. Elle avait sa raison
    // quand je l'ai écrite : deux rectangles collés de la même couleur ne se
    // distinguaient pas, et un découpage qui ne découpe rien n'est pas un
    // découpage. Mais c'était vrai d'une frise SANS POIGNÉES. Depuis qu'une
    // borne blanche se tient entre chaque paire de zones, la limite se voit —
    // et deux zones de même mode sont un état de travail parfaitement
    // légitime : on ajoute, puis on règle, dans cet ordre.
    //
    // Entre « la frise est momentanément redondante » et « le professeur perd
    // la zone qu'il vient de créer », le choix n'est pas discutable. Une
    // interface ne défait pas ce qu'on lui demande au motif qu'elle ferait
    // mieux.
    return out.filter(z => z.n > 0);
}

/** À quelle zone appartient la question `rang` ? */
/**
 * LES MODÈLES DE FRISE — la forme entière d'un coup, pas zone par zone.
 *
 * Rémy : « on peut avoir un petit bouton réglage au-dessus de la frise pour
 * avoir des templates pour l'ensemble de la frise, genre QCM 2 ou QCM 4,
 * QCM 2-4, QCM 2-4-Clavier, qui donne alors des proportions à la frise. »
 *
 * DÉCOUPER À LA MAIN EST LE CAS RARE. Un professeur qui prépare une heure sait
 * ce qu'il veut — « tout en deux propositions », « on finit au clavier » — et
 * ne devrait pas avoir à poser trois bornes pour le dire. Les quatre modèles
 * couvrent ce qu'on demande vraiment ; les bornes restent, pour le jour où
 * l'on veut autre chose.
 *
 * LES PROPORTIONS SONT DES PARTS, PAS DES NOMBRES. « 1, 2, 1 » veut dire un
 * quart, la moitié, un quart : le modèle vaut pour huit questions comme pour
 * cinquante, ce qu'une liste de nombres écrits ne saurait pas faire.
 */
export const MODELES_FRISE = [
    { cle: 'q2', nom: 'QCM 2', parts: [[1, '2']] },
    { cle: 'q4', nom: 'QCM 4', parts: [[1, '4']] },
    { cle: 'q24', nom: 'QCM 2 puis 4', parts: [[1, '2'], [2, '4']] },
    { cle: 'q24k', nom: 'QCM 2, 4, puis clavier', parts: [[1, '2'], [2, '4'], [1, 'k']] }
];

/**
 * Les zones qu'un modèle donne pour ce nombre de questions.
 *
 * LA SOMME FAIT TOUJOURS LE TOTAL, par construction et non par table
 * d'arrondis : chaque zone prend sa part arrondie en réservant une question à
 * chacune de celles qui suivent, et la dernière ramasse ce qui reste. On ne
 * peut donc ni perdre ni inventer une question, quel que soit le total.
 */
export function zonesDuModele(cle, total) {
    const m = MODELES_FRISE.find(x => x.cle === cle);
    if (!m) return null;
    const n = Math.max(1, Math.round(Number(total) || 10));
    // Pas plus de zones que de questions : une zone de zéro question n'existe
    // pas, et un modèle à trois phases sur deux questions n'en a que deux.
    const parts = m.parts.slice(0, n);
    const somme = parts.reduce((s, x) => s + x[0], 0);
    let reste = n;
    const zones = parts.map(([part, mode], i) => {
        const apres = parts.length - 1 - i;
        const pris = i === parts.length - 1
            ? reste
            : Math.max(1, Math.min(reste - apres, Math.round(part / somme * n)));
        reste -= pris;
        return { n: pris, mode };
    });
    return normaliserZones(zones, n);
}

export function zoneDuRang(zones, rang) {
    let debut = 1;
    for (let i = 0; i < zones.length; i++) {
        const fin = debut + zones[i].n - 1;
        if (rang <= fin) return { i, de: debut, a: fin, zone: zones[i] };
        debut = fin + 1;
    }
    const i = Math.max(0, zones.length - 1);
    return { i, de: debut, a: debut, zone: zones[i] };
}

/** Les zones qu'un préréglage produit, pour AMORCER la saisie du professeur. */
export function zonesDuMode(params = {}, total = 10) {
    const n = Math.max(1, Math.round(Number(total) || 10));
    const out = [];
    for (let r = 1; r <= n; r++) {
        const a = aideAuRang({ ...params, repartition: 'auto' }, r, n);
        const cle = a.clavier ? 'k'
            : (a.propositions === null ? 't' : modeZone(String(a.propositions)).cle);
        // On regroupe les rangs voisins qui demandent la même chose : c'est
        // cela, une zone.
        if (out.length && out[out.length - 1].mode === cle) out[out.length - 1].n++;
        else out.push({ n: 1, mode: cle });
    }
    return out;
}

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
    const zones = lireZones(params, total);
    if (zones) {
        const n = Math.max(1, Math.round(Number(total) || 10));
        const r0 = Math.max(1, Math.min(n, Number(rang) || 1));
        const m = modeZone(zoneDuRang(zones, r0).zone.mode);
        // AU CLAVIER, ON GARDE QUATRE PROPOSITIONS SOUS LE PAVÉ. Un exercice
        // qui ne sait pas se répondre au clavier a besoin de quelque chose à
        // montrer, et c'est ce que faisait déjà l'ancienne troisième phase.
        return m.clavier
            ? { propositions: 4, clavier: true }
            : { propositions: m.propositions, clavier: false };
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

    // LE PLAFOND VAUT AUSSI HORS ADAPTATIF. Un professeur qui décoche « le
    // clavier » ne dit pas « seulement quand l'échelle décide » : il dit que
    // ses élèves ne taperont pas de réponse dans cet exercice-là.
    return plafonnerClavier({ propositions, clavier }, params);
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
    return plafonnerClavier({ ...echelonDe(etat) }, params);
}

/**
 * L'ÉCHELLE S'ARRÊTE AVANT LE CLAVIER SI ON LE LUI DEMANDE.
 *
 * Rémy : « l'exercice s'adapte (par défaut), mais là c'est un peu configurable
 * en autorisant ou non le clavier ». C'est la seule vis que la frise ne peut
 * pas remplacer, parce qu'elle ne parle que du mode adaptatif : la frise dit
 * « voici les zones », l'échelle dit « je monte tant que ça réussit ». Borner
 * sa montée est donc une question à part entière, et une question fréquente —
 * une classe qui découvre une notion peut rester en propositions du début à la
 * fin sans que cela soit un renoncement.
 *
 * On rend alors le dernier barreau AVANT le clavier, et non « le clavier sans
 * le clavier » : l'élève voit quatre propositions, ce qui est un vrai palier,
 * pas un palier estropié.
 */
export function plafonnerClavier(aide, params = {}) {
    if (!aide.clavier || params.clavier !== false) return aide;
    const dernier = [...ECHELONS].reverse().find(e => !e.clavier) || ECHELONS[0];
    return { ...dernier };
}
