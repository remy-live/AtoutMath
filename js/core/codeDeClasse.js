// LE CODE DE CLASSE DIT-IL LA VÉRITÉ ?
//
// LE PIÈGE, MESURÉ DEUX FOIS. L'écran du professeur affiche le code de chaque
// classe en gros, avec un bouton pour le copier et l'étiquette « code de
// classe » — parce qu'on l'a voulu ainsi : « C'est ce qu'on dicte à trente
// élèves debout devant un tableau ; il n'a rien à faire en petites capitales
// grises. » Mais le champ pour le TAPER n'existe chez l'élève que si
// l'inscription libre est allumée, et elle est FERMÉE par défaut — Rémy :
// « je pense qu'il faut le fermer, mais permettre la réouverture ».
//
// Les deux décisions sont bonnes séparément. Ensemble, elles font une rentrée
// ratée : le professeur dicte un code, trente élèves cherchent où l'écrire, et
// personne ne peut deviner que la réponse est dans un interrupteur d'un autre
// écran. Le serveur, lui, répond `inscription_fermee` — ce qu'aucun élève ne
// voit, puisque la porte n'est même pas affichée.
//
// CE QU'ON NE FAIT PAS. On ne rouvre pas la porte chez l'élève « au cas où » :
// le commentaire de `js/ui/portailUI.js` explique pourquoi une porte qui refuse
// est pire qu'une porte absente — « l'élève tape son prénom trois fois avant de
// lever la main » —, et cette décision-là tient. On ne rallume pas non plus
// l'inscription libre par défaut : elle crée des élèves, et un prénom tapé de
// travers crée un doublon vierge à côté du vrai.
//
// CE QU'ON FAIT. C'est l'ÉCRAN DU PROFESSEUR qui cesse de promettre. Le code
// porte son état, la raison est écrite là où le code est affiché, et le geste
// qui l'ouvre est à côté — pas dans un autre écran qu'il faut connaître.

/**
 * L'ÉTAT DU CODE DE CLASSE, en une règle pure.
 *
 * @param {boolean|null|undefined} inscriptionLibre `null` = on ne sait pas encore
 * @returns {{ouvert: boolean|null, etiquette: string, dit: string,
 *   quoiFaire: string|null}}
 */
export function etatDuCodeDeClasse(inscriptionLibre) {
    // ON NE SAIT PAS ENCORE — les réglages du site n'ont pas répondu.
    //
    // ET ALORS ON NE DIT RIEN. Afficher « porte fermée » pendant le chargement
    // ferait clignoter un avertissement faux une fois sur deux, et un
    // avertissement qui clignote est un avertissement qu'on n'écoute plus.
    if (inscriptionLibre === null || inscriptionLibre === undefined) {
        return {
            ouvert: null,
            etiquette: 'code de classe',
            dit: 'Copier le code',
            quoiFaire: null
        };
    }
    if (inscriptionLibre === true) {
        return {
            ouvert: true,
            etiquette: 'code de classe',
            dit: 'Copier le code. Vos élèves peuvent le taper dans « Je n’ai pas '
                + 'de billet », sur la page d’accueil.',
            quoiFaire: null
        };
    }
    return {
        ouvert: false,
        etiquette: 'code de classe · porte fermée',
        dit: 'CE CODE N’OUVRE RIEN POUR L’INSTANT. Le champ pour le taper n’existe '
            + 'pas chez l’élève tant que l’inscription libre est fermée : '
            + 'seuls les billets ouvrent la porte. C’est le bon réglage si votre liste '
            + 'vient de Pronote.',
        quoiFaire: 'Ouvrir la porte'
    };
}

/**
 * CE QU'ON DIT APRÈS AVOIR COPIÉ.
 *
 * « Code copié » tout court est le même petit mensonge que l'étiquette : on
 * vient de mettre dans le presse-papiers quelque chose dont on ne dit pas qu'il
 * n'ouvre rien. Le professeur colle ce code dans son cahier de textes le soir ;
 * c'est le dernier moment où l'avertissement sert encore à quelque chose.
 */
export function motApresCopie(code, inscriptionLibre) {
    const e = etatDuCodeDeClasse(inscriptionLibre);
    if (e.ouvert === false) {
        return {
            texte: `Code copié : ${code} — mais la porte est fermée, `
                + 'aucun élève ne peut encore s’en servir.',
            genre: 'info'
        };
    }
    return { texte: 'Code copié : ' + code, genre: 'success' };
}
