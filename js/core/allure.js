// L'ALLURE D'UN EXERCICE CHRONOMÉTRÉ — une seule table, trois jeux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour détour express, c'est sympa mais comment régler la durée sur
// chaque question ? (est-ce le cas pour d'autres exercices) ».
//
// LA RÉPONSE ÉTAIT NON, ET POUR DEUX EXERCICES SUR TROIS. Le contre-la-montre
// partait de neuf secondes et se resserrait tout seul jusqu'à 2,6 ; les taupes
// sortaient 2 600 ms et revenaient toutes les 850. Les deux étaient écrits en
// dur, sans une vis. Seul le Ninja avait son « Allure » — et c'est elle qu'on
// déménage ici, mot pour mot, pour que les trois répondent au même réglage
// avec les mêmes mots.
//
// LE BON RYTHME N'EST PAS LE MÊME POUR TOUS, et aucun réglage automatique ne
// peut le savoir : celui qui lit vite s'ennuie, celui qui pose « −7 + 4 » dans
// sa tête n'a pas fini que la question est passée. La classe, elle, le sait.
//
// LE NOMBRE MULTIPLIE LE TEMPS ACCORDÉ : 1,6 veut dire « plus de moitié en
// plus ». C'est un facteur et non une durée, parce que les trois jeux n'ont
// pas le même tempo de départ — neuf secondes pour une question de sprint,
// 2,6 pour une taupe — et qu'un professeur ne règle pas un tempo, il dit
// « plus lentement ».

export const ALLURES = {
    tranquille: 1.6,
    posee: 1.3,
    normale: 1,
    rapide: 0.75,
    // LES NOMS DE L'ANCIEN RÉGLAGE « rythme » DU NINJA DES NOMBRES : il ne
    // faisait rien du tout, faute d'être lu. Les garder évite qu'un parcours
    // déjà enregistré change d'allure sans prévenir.
    lent: 1.6,
    normal: 1
};

/**
 * Le facteur à appliquer au temps, d'après les réglages d'un exercice.
 *
 * ON LIT TROIS NOMS, et ce n'est pas de la générosité : `allure` est le nom
 * neuf, `vitesse` celui du Ninja, `rythme` celui d'avant lui. Un parcours
 * enregistré l'an dernier continue de dire ce qu'il disait.
 */
export function allureDe(params = {}) {
    const p = params || {};
    return ALLURES[p.allure] || ALLURES[p.vitesse] || ALLURES[p.rythme] || 1;
}

/**
 * LE RÉGLAGE LUI-MÊME, prêt à poser sur une activité.
 *
 * Il n'a PAS la marque `groupe: 'aide'` : l'allure n'est pas une aide, c'est
 * une condition de l'exercice — au même rang que « Dimension maximale » ou
 * « Unité ». Rangée sous « L'aide », elle répondrait à une question qu'on ne
 * pose pas là.
 */
export const PARAM_ALLURE = {
    id: 'allure', type: 'select', label: 'Allure', default: 'normale',
    papier: false,
    aide: 'Le temps accordé à chaque question, pas la difficulté du calcul. '
        + '« Posée » en laisse un tiers de plus : c\'est souvent ce qu\'il faut '
        + 'la première fois.',
    options: [
        { value: 'tranquille', label: 'Tranquille — tout le temps de réfléchir' },
        { value: 'posee', label: 'Posée — un tiers de temps en plus' },
        { value: 'normale', label: 'Normale' },
        { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
    ]
};
