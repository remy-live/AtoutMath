// QUELLE VERSION DU LOGICIEL EST-ON EN TRAIN D'UTILISER ?
//
// Personne ne pouvait répondre, et cela a coûté une demi-journée.
//
// Rémy voyait un écran, je lui décrivais un bouton, et le bouton n'y était pas.
// Ni lui ni moi ne pouvions dire pourquoi : rien, nulle part, n'affichait le
// numéro. Il a fallu déduire sa version d'un DÉTAIL DE MISE EN PAGE — un
// sous-titre qui disait « On regarde… » au-dessus d'un corps qui disait
// « Créez votre première classe », combinaison que le code corrigé ne peut plus
// produire. C'est une belle preuve, et c'est un aveu : on ne devrait pas avoir
// à faire de l'archéologie pour savoir ce qu'on exécute.
//
// LE NUMÉRO N'EST PAS RECOPIÉ ICI, ET C'EST TOUT L'INTÉRÊT. Une constante
// `VERSION = 689` dans un fichier serait fausse au premier oubli, et elle
// mentirait avec aplomb — c'est-à-dire de la pire façon. On lit à la place le
// `?v=` que portent les feuilles de style de la page, c'est-à-dire le numéro
// RÉELLEMENT servi par le serveur à ce navigateur-là, à cette seconde-là.
//
// Il répond donc aux deux questions qui comptent, et qui ne sont pas la même :
// « qu'ai-je déposé sur le serveur ? » et « qu'est-ce que mon navigateur a
// vraiment chargé ? ». Un cache récalcitrant fait diverger les deux.

/**
 * @returns {string} par ex. `689`, ou `''` si la page ne le dit pas
 */
export function versionDuSite(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc || !doc.querySelectorAll) return '';
    const liens = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const l of liens) {
        const href = l.getAttribute ? l.getAttribute('href') : '';
        const m = /[?&]v=(\d+)/.exec(String(href || ''));
        if (m) return m[1];
    }
    return '';
}

/** « v689 », ou une chaîne vide — jamais « v » tout seul. */
export function versionLisible(doc) {
    const v = versionDuSite(doc);
    return v ? 'v' + v : '';
}
