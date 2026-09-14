// UN PANNEAU QUI MONTE DU BAS SE REFERME EN LE POUSSANT.
//
// Rémy, capture des réglages d'un exercice sur son téléphone : « Les tiroirs ne
// se glissent pas en bas, il faut appuyer sur Annuler. »
//
// Le panneau avait déjà l'air d'un tiroir : il monte du bas, ses coins du haut
// sont arrondis, et une petite barre grise en marque la poignée. Cette barre
// était un DÉCOR — un pseudo-élément, qu'aucun doigt ne pouvait attraper. Un
// affordance qui ment coûte plus cher que pas d'affordance du tout : on essaie,
// il ne se passe rien, et l'on finit par chercher le bouton en bas de l'écran.
//
// TROIS GESTES FERMENT DÉSORMAIS UN TIROIR, et ce sont les trois qu'on essaie :
// le pousser vers le bas, toucher à côté, et le bouton qui était déjà là.
//
// CE MODULE NE DÉCIDE PAS DE LA FERMETURE, il la demande : c'est l'appelant qui
// sait ce que « fermer » veut dire chez lui — masquer, oublier des écouteurs,
// rendre la main. On lui passe donc sa propre fonction.

/** Le tirage au-delà duquel on lâche : plus court, on croit avoir raté. */
const SEUIL = 90;
/** Une poussée franche ferme même sans avoir atteint le seuil. */
const VITESSE = 0.55;   // pixels par milliseconde

/**
 * Rend un panneau tirable vers le bas.
 *
 * @param {HTMLElement} panneau  - la feuille elle-même
 * @param {Function} fermer      - ce qu'il faut faire pour fermer
 * @param {Object} [opts]
 * @param {HTMLElement} [opts.fond] - le voile, quand il y en a un : le toucher
 *   ferme aussi. Le panneau des propriétés, lui, occupe tout l'écran.
 * @param {Function} [opts.actif] - dit si le tiroir est en mode « feuille »
 *   (sur grand écran, la fenêtre est centrée : rien à tirer)
 */
export function rendreTirable(panneau, fermer, opts = {}) {
    if (!panneau) return null;
    const fond = opts.fond || null;

    // LA POIGNÉE SE REPOSE À CHAQUE RENDU. Deux de ces panneaux se réécrivent
    // entièrement (`innerHTML = …`) à chaque ouverture : une poignée branchée
    // une seule fois disparaîtrait au deuxième affichage, avec ses écouteurs.
    // On la cherche, et on la refait s'il le faut.
    let poignee = panneau.querySelector(':scope > .tiroir-poignee');
    if (poignee) return null;

    poignee = document.createElement('div');
    poignee.className = 'tiroir-poignee';
    poignee.setAttribute('aria-hidden', 'true');
    panneau.insertBefore(poignee, panneau.firstChild);

    const enFeuille = () => (opts.actif ? !!opts.actif() : true);

    let depart = null, t0 = 0, dy = 0;

    /** L'état de repos : sans quoi le tiroir rouvrirait déjà poussé en bas. */
    const remettre = () => {
        panneau.style.transition = '';
        panneau.style.transform = '';
        if (fond) fond.style.opacity = '';
        dy = 0;
    };

    const glisser = (y) => {
        dy = Math.max(0, y - depart);
        panneau.style.transition = 'none';
        panneau.style.transform = `translateY(${dy}px)`;
        // Le voile s'éclaircit avec le tirage : on voit qu'on est en train de
        // partir, et l'on sait qu'on peut revenir en remontant.
        if (fond) fond.style.opacity = String(Math.max(0.25, 1 - dy / 320));
    };

    const relacher = () => {
        if (depart === null) return;
        const vitesse = dy / Math.max(1, performance.now() - t0);
        depart = null;
        panneau.style.transition = 'transform .22s ease-out';
        if (dy > SEUIL || vitesse > VITESSE) {
            // On finit le mouvement avant de fermer : un panneau qui disparaît
            // au milieu du geste donne l'impression d'un bogue, pas d'un tiroir.
            panneau.style.transform = `translateY(${panneau.offsetHeight}px)`;
            setTimeout(() => {
                // FERMER D'ABORD, RANGER ENSUITE. Le panneau des propriétés se
                // ferme en perdant une classe qui le renvoie à translateY(100 %)
                // — c'est-à-dire exactement là où le doigt vient de le poser.
                // Ranger avant remettrait le panneau en place pour une image.
                fermer();
                requestAnimationFrame(remettre);
            }, 180);
        } else {
            panneau.style.transform = '';
            if (fond) fond.style.opacity = '';
        }
    };

    poignee.addEventListener('pointerdown', (e) => {
        if (!enFeuille()) return;
        depart = e.clientY;
        t0 = performance.now();
        dy = 0;
        try { poignee.setPointerCapture(e.pointerId); } catch (err) { /* Safari ancien */ }
    });
    poignee.addEventListener('pointermove', (e) => { if (depart !== null) glisser(e.clientY); });
    poignee.addEventListener('pointerup', relacher);
    poignee.addEventListener('pointercancel', () => { depart = null; remettre(); });

    // TOUCHER À CÔTÉ FERME AUSSI, quand il y a un « à côté » : c'est le second
    // geste qu'on essaie, et c'est déjà ce que fait toute autre fenêtre de
    // l'application. On ne ferme que si le doigt s'est posé SUR le voile,
    // jamais sur un clic parti du panneau et fini dehors.
    if (fond && fond.dataset.tirableFond !== '1') {
        fond.dataset.tirableFond = '1';
        fond.addEventListener('pointerdown', (e) => {
            fond.dataset.deFond = e.target === fond ? '1' : '';
        });
        fond.addEventListener('click', (e) => {
            if (e.target !== fond || fond.dataset.deFond !== '1') return;
            remettre();
            fermer();
        });
    }

    return { remettre };
}
