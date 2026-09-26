// LE TEXTE D'UNE PROPOSITION — pour un aperçu, une fiche, une voix.
//
// Ni DOM ni horloge : tout se teste sous Node.

/**
 * LE TEXTE D'UNE PROPOSITION, POUR UN APERÇU.
 *
 * RÉMY, capture de la bulle de la frise : « pas très clair sous le développe
 * et réduis, il y a du html ». Il y en avait : la bulle prenait le `label`,
 * qui est du BALISAGE — « 4<i class="fx-var">x</i> + 36 » — et l'échappait
 * pour l'afficher. L'élève y aurait lu une balise ; le professeur y lisait une
 * balise.
 *
 * ON PRÉFÈRE `texte`, que les générateurs posent déjà pour la fiche papier :
 * c'est « la réponse telle qu'on l'écrit », et elle ne peut pas se démentir
 * puisqu'elle vient du même arbre que le libellé.
 *
 * QUAND IL MANQUE, ON LIT LE BALISAGE PLUTÔT QUE DE L'EFFACER. Mesuré : deux
 * générateurs sur cent trente-et-un posent des propositions en HTML sans
 * texte, et ce sont des fractions EMPILÉES. Retirer les balises rendait
 * « 7 8 » là où il fallait lire « 7/8 » — un aperçu faux est pire qu'un aperçu
 * vide. La colonne se relit donc en ligne, et l'exposant redevient un chiffre
 * haut.
 */
const HAUTS_APERCU = { '-': '\u207b', '\u2212': '\u207b', 0: '\u2070', 1: '\u00b9',
    2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077',
    8: '\u2078', 9: '\u2079' };
export function texteDeChoix(c) {
    if (c && typeof c === 'object' && c.texte) return String(c.texte).trim();
    let t = String((c && typeof c === 'object' ? (c.label ?? c.value) : c) ?? '');
    // Les fractions, de la plus intérieure à la plus extérieure.
    const FRAC = /<span class="fraction"><span class="fraction-num">((?:(?!<\/?span)[\s\S])*?)<\/span><span class="fraction-den">((?:(?!<\/?span)[\s\S])*?)<\/span><\/span>/;
    // UNE COLONNE MISE EN LIGNE PREND SES PARENTHÈSES quand elle n'est pas
    // seule. Mesuré sur mon propre banc : « 2 » suivi de la fraction 35/12
    // donnait « 235/12 », c'est-à-dire un autre nombre. Seule, la fraction
    // s'écrit sans rien — « 7/8 » se lit sans hésiter.
    for (let tour = 0; tour < 6 && FRAC.test(t); tour++) {
        t = t.replace(new RegExp(FRAC.source, 'g'), (m0, n, d, decalage, entier) =>
            (m0.length === entier.length ? `${n}/${d}` : `(${n}/${d})`));
    }
    t = t.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/g, (m0, e) => {
        const nu = e.replace(/<[^>]*>/g, '').trim();
        return /^[-\u22120-9]+$/.test(nu)
            ? [...nu].map(ch => HAUTS_APERCU[ch] || ch).join('') : `^${nu}`;
    });
    // ON NE RETIRE QUE DE VRAIES BALISES, ET C'EST NÉCESSAIRE : « < » et
    // « > » SONT des réponses, dans « comparer deux fractions ». Le motif
    // large `<[^>]*>` avalait « < 5 > » au milieu de « 3 < 5 > 2 ». Une balise
    // commence par une lettre ou une barre oblique.
    return t.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>]*>/gi, '')
        .replace(/&nbsp;/g, ' ').replace(/&minus;/g, '\u2212')
        .replace(/\s+/g, ' ').trim();
}
