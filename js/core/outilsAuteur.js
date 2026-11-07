// LES OUTILS D'AUTEUR — la palette de Rémy, et de personne d'autre par défaut.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI A ÉTÉ MESURÉ. Sur une tablette de 820 × 1180, ouverte en professeur,
// 40 boutons sur 45 sont plus petits que la cible tactile de 44 px — et les DIX
// PREMIERS de la liste sont des boutons `db-*`, c'est-à-dire la palette
// d'outils d'auteur. Sur un téléphone de 390 px, c'est la même chose : la
// poignée fait 16 × 24, la flèche de repli 15 × 24. La palette est, à elle
// seule, la première source d'inconfort tactile du logiciel.
//
// SAUF QUE CE N'EST PAS UN DÉFAUT DE LA PALETTE. Dix-huit icônes de vingt
// pixels posées en petit carré flottant, c'est exactement ce qu'il faut pour un
// outil qu'on garde sous la main en travaillant — et Rémy s'en sert :
// « dans l'Atelier, je perds ma barre de debug, je l'aime bien car on peut
// passer les questions. » L'élargir à 44 px la rendrait inutilisable : elle
// couvrirait le jeu qu'elle sert à regarder.
//
// LE DÉFAUT EST QU'ELLE EST LÀ POUR TOUT LE MONDE. Elle se montrait à tout
// professeur identifié — un seul test la cachait, `body.sans-mode-libre`, et
// cette classe n'est posée que pour un ÉLÈVE hors mode libre. Un collègue à qui
// Rémy montre le logiciel voit donc, dès sa première minute, une palette noire
// avec « vider la sauvegarde locale », « générer des données d'exemple » et
// « compter la question juste ». Trois boutons qui abîment ses données, dans un
// outil dont il ne peut pas deviner qu'il ne lui est pas destiné.
//
// D'OÙ UN INTERRUPTEUR, ÉTEINT PAR DÉFAUT. Rémy l'allume une fois sur chacune
// de ses machines et ne s'en occupe plus ; les autres ne le rencontrent jamais.
// Ce n'est pas une sécurité — on retrouvera la palette en trois clics dans les
// réglages — c'est un RANGEMENT : les outils d'atelier vivent dans l'atelier.
//
// ET UNE ENTRÉE PAR L'ADRESSE, parce que Rémy teste sur son iPhone et qu'on n'y
// ouvre pas de console : `?auteur=1` allume, `?auteur=0` éteint, et le choix se
// retient. C'est la seule façon de rendre l'interrupteur atteignable depuis un
// téléphone avant même d'avoir ouvert les réglages.

const CLE = 'atoutmath-outils-auteur';
const ECOUTEURS = new Set();

/** La palette d'outils d'auteur est-elle demandée ? Non, sauf demande. */
export function outilsAuteur() {
    try { return window.localStorage.getItem(CLE) === '1'; } catch (e) { return false; }
}

/**
 * Allumer ou éteindre, et le retenir.
 *
 * Le corps porte la classe : c'est le CSS qui montre ou cache, pas du JavaScript
 * qui irait chercher la palette — elle n'existe pas encore au moment où l'on
 * lit le réglage la première fois.
 */
export function reglerOutilsAuteur(actif) {
    try { window.localStorage.setItem(CLE, actif ? '1' : '0'); } catch (e) { /* privé */ }
    appliquerOutilsAuteur();
    ECOUTEURS.forEach(fn => { try { fn(!!actif); } catch (e) { /* un abonné mort */ } });
}

/** Prévenir quand l'interrupteur bouge. */
export function surOutilsAuteur(fn) {
    ECOUTEURS.add(fn);
    return () => ECOUTEURS.delete(fn);
}

/**
 * Poser la classe sur le corps du document.
 *
 * Appelée au démarrage ET à chaque changement. Elle lit `?auteur=` au passage :
 * l'adresse gagne sur ce qui était retenu, et ce qu'elle dit est retenu à son
 * tour — sinon le réglage se défferait au premier rechargement de la page.
 */
export function appliquerOutilsAuteur() {
    let demande = null;
    try {
        const v = new URLSearchParams(window.location.search).get('auteur');
        if (v === '1' || v === '0') demande = v === '1';
    } catch (e) { /* pas d'adresse lisible : on s'en tient au souvenir */ }
    if (demande !== null) {
        try { window.localStorage.setItem(CLE, demande ? '1' : '0'); } catch (e) { /* privé */ }
    }
    const actif = demande !== null ? demande : outilsAuteur();
    if (document.body) document.body.classList.toggle('outils-auteur', actif);
    return actif;
}
