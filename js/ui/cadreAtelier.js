// QUEL EXERCICE LA PALETTE D'AUTEUR PILOTE-T-ELLE ?
//
// Rémy : « synchronise la barre de debug et l'Atelier. »
//
// LE DÉFAUT, MOT POUR MOT. L'Atelier joue l'exercice dans des `<iframe>` — c'est
// sa raison d'être : un cadre EST un écran, le jeu s'y déploie exactement comme
// sur un appareil de cette taille. Mais les boutons de la palette d'auteur — ◀ ▶
// pour changer de question, « Réglages », « Solution », « Étapes » — lisent
// `state.activeSequenceRunner` dans la page MÈRE, où il n'y a plus rien depuis
// que le jeu est parti dans un cadre. Résultat : on ouvre l'Atelier, on clique
// sur « question suivante », et l'on obtient « Aucun exercice en cours » — sur
// un écran où l'exercice est là, sous les yeux, en train de tourner.
//
// Six boutons de mise au point devenaient inertes exactement à l'endroit où
// l'on met au point.
//
// COMMENT ON LE RÉPARE. Les cadres sont de même origine : la page mère peut
// atteindre leur `window`. Mais pas leurs MODULES — chaque document a sa propre
// copie, et un `import()` depuis le parent rendrait le module du PARENT, dont le
// runner est vide. L'Atelier connaît déjà ce piège et l'a résolu deux fois de la
// même façon : `window.__journalAtelier` pour la console, `window.__sessionAtelier`
// pour le pilote. On ajoute donc `window.__runnerAtelier`, exposé par le volet
// lui-même, et rien d'autre.
//
// CE MODULE EST MINUSCULE À DESSEIN. `planEtapes.js` en a besoin autant que la
// palette, et lui faire importer `atelier.js` — mille cinq cents lignes, tout
// le catalogue, la revue — pour une question d'une ligne serait cher payé. Il ne
// dépend de rien : il regarde le DOM, et c'est tout.

/** L'identifiant du cadre où l'Atelier fait JOUER l'exercice. */
const CADRE_JEU = 'atl-jeu';

/**
 * La fenêtre du volet « jeu » de l'Atelier, si l'Atelier est ouvert.
 *
 * C'est CE volet-là et pas celui du robot : le robot joue tout seul, on le
 * regarde ; le volet « jeu » est celui qu'on pilote.
 */
export function fenetreDuJeu() {
    const cadre = document.getElementById(CADRE_JEU);
    if (!cadre || !cadre.src) return null;
    try { return cadre.contentWindow || null; } catch (e) { return null; }
}

/**
 * L'exercice que la palette d'auteur doit piloter.
 *
 * La page mère d'abord — quand on joue normalement, c'est elle qui a le
 * runner —, puis le cadre de l'Atelier. Jamais l'inverse : un exercice ouvert
 * en plein écran par-dessus l'Atelier est celui qu'on regarde.
 *
 * @param {Object} local  le runner de la page mère (`state.activeSequenceRunner`)
 */
export function runnerEnJeu(local) {
    if (local) return local;
    const w = fenetreDuJeu();
    try {
        return (w && typeof w.__runnerAtelier === 'function') ? (w.__runnerAtelier() || null) : null;
    } catch (e) {
        // Un cadre en cours de rechargement n'a pas encore de fenêtre lisible.
        return null;
    }
}
