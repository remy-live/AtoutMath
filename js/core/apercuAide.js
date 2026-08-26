// L'APERÇU DE L'AIDE — ce que le réglage va PRODUIRE, question par question.
//
// Rémy : « il faut un apercu de ce que cela donne ».
//
// « Progressive (recommandé) », c'est un nom, pas une promesse vérifiable : le
// professeur ne peut pas savoir, en lisant ces deux mots, qu'un exercice de dix
// questions donnera trois vrai/faux, cinq questions à quatre propositions, puis
// deux réponses tapées au clavier. Il le découvre en classe, ou jamais.
//
// Ce module répond exactement à cette question, sans rien afficher lui-même :
// il déroule l'exercice entier avec les réglages en main et rend les PALIERS,
// c'est-à-dire les tranches de questions qui présentent la même chose. Trois
// paliers, ce sont trois vignettes à dessiner ; un seul palier — « toujours 4
// propositions » —, c'est une seule vignette, et l'aperçu dit alors la vérité
// tout aussi bien : il ne se passe rien.
//
// POURQUOI DÉROULER PLUTÔT QUE RECOPIER LES RÈGLES. `aideAuRang` connaît déjà
// les seuils, les garde-fous des exercices courts, la priorité des réglages
// fins sur le préréglage. Réécrire ici « trois questions faciles puis le
// reste » ferait un aperçu qui MENT dès que l'une de ces règles change — et
// c'est le seul défaut qu'un aperçu ne peut pas se permettre.

import { aideAuRang } from './aide.js';

/**
 * Les paliers d'un exercice de `total` questions, réglages en main.
 *
 * @returns {Array<{de:number, a:number, propositions:number|null, clavier:boolean}>}
 *   `de` et `a` sont des rangs de questions, bornes comprises et à partir de 1.
 *   `propositions` vaut `null` pour « toutes celles de l'exercice » ; il n'est
 *   pas regardé quand `clavier` est vrai.
 */
export function paliersAide(params = {}, total = 10) {
    const n = Math.max(1, Math.min(200, Math.round(Number(total) || 10)));
    const paliers = [];
    for (let r = 1; r <= n; r++) {
        const { propositions, clavier } = aideAuRang(params, r, n);
        const dernier = paliers[paliers.length - 1];
        // Au clavier, le nombre de propositions n'existe plus : deux questions
        // tapées d'affilée sont le MÊME palier même si le préréglage aurait
        // affiché des nombres différents derrière. Sans cette précaution,
        // « Directement au clavier » se serait découpé en deux vignettes
        // identiques.
        const meme = dernier && dernier.clavier === clavier
            && (clavier || dernier.propositions === propositions);
        if (meme) dernier.a = r;
        else paliers.push({ de: r, a: r, propositions, clavier });
    }
    return paliers;
}

/**
 * Le palier en toutes lettres — « Questions 4 à 8 ».
 *
 * Un palier d'une seule question se dit au singulier : « Question 9 ». Écrire
 * « Questions 9 à 9 » est le genre de détail qui fait passer une interface
 * pour une sortie de machine.
 */
export function rangsEnMots(p, total) {
    if (p.de === 1 && p.a === total) return `Les ${total} questions`;
    if (p.de === p.a) return `Question ${p.de}`;
    return `Questions ${p.de} à ${p.a}`;
}

/** Ce que le palier demande, en une ligne. */
export function palierEnMots(p) {
    if (p.clavier) return 'la réponse se tape au clavier';
    if (p.propositions === null) return 'toutes les propositions de l\'exercice';
    if (p.propositions === 2) return '2 propositions — la bonne et l\'erreur classique';
    return `${p.propositions} propositions`;
}
