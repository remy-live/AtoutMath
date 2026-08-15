// CE QUI FLOTTE PAR-DESSUS LE JEU : déplacement, recadrage, mémoire de place.
//
// La palette d'auteur savait déjà se déplacer ; la barre de passe, non — elle
// se posait en bas de l'écran et y restait, exactement là où beaucoup de jeux
// mettent leur pavé de réponse ou leur consigne. On ne va pas écrire deux fois
// le même glissé : ce module le porte une fois pour toutes.
//
// TROIS PROMESSES, et ce sont elles qui font la différence entre un panneau
// flottant et une gêne :
//
//   · il ne sort JAMAIS de l'écran — ni au glissé, ni au redimensionnement de
//     la fenêtre, ni à la rotation d'une tablette. Un outil à moitié hors
//     champ ne se règle pas, il se subit ;
//   · il retrouve sa place à la réouverture, par appareil ;
//   · le geste passe par les Pointer Events : au doigt sur tablette, à la
//     souris sur poste fixe, avec un seul code.

const MARGE = 6;

/**
 * Positionne un élément flottant en le gardant entièrement visible.
 * @param {HTMLElement} el
 * @param {number} x - en pixels depuis le bord gauche de la fenêtre
 * @param {number} y
 */
export function placer(el, x, y) {
    const maxX = Math.max(MARGE, window.innerWidth - el.offsetWidth - MARGE);
    const maxY = Math.max(MARGE, window.innerHeight - el.offsetHeight - MARGE);
    el.style.left = `${Math.min(Math.max(MARGE, x), maxX)}px`;
    el.style.top = `${Math.min(Math.max(MARGE, y), maxY)}px`;
}

/** Retient la place — et la taille quand l'élément se redimensionne. */
export function memoriser(el, cle) {
    try {
        localStorage.setItem(cle, JSON.stringify({
            x: el.offsetLeft, y: el.offsetTop,
            w: el.style.width || '', h: el.style.height || ''
        }));
    } catch (e) { /* navigation privée : la place ne survivra pas, sans plus */ }
}

/**
 * Repose l'élément là où on l'avait laissé.
 * @param {HTMLElement} el
 * @param {string} cle
 * @param {(el:HTMLElement)=>void} [defaut] - où le poser la toute première fois
 */
export function restaurer(el, cle, defaut) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { pos = null; }
    if (pos && pos.w) el.style.width = pos.w;
    if (pos && pos.h) el.style.height = pos.h;
    // Le recadrage s'applique AUSSI à la position mémorisée : elle a pu être
    // enregistrée sur un écran plus grand que celui d'aujourd'hui.
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) placer(el, pos.x, pos.y);
    else if (defaut) defaut(el);
    else placer(el, MARGE, window.innerHeight);
}

/**
 * Rend un élément déplaçable par une poignée.
 *
 * @param {HTMLElement} el     - ce qui bouge
 * @param {HTMLElement} poignee - ce qu'on attrape (souvent un bandeau de titre)
 * @param {string} cle         - où retenir la place
 * @returns {() => void} de quoi débrancher, pour un panneau qu'on détruit
 */
export function rendreDeplacable(el, poignee, cle) {
    const surPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        // Un bouton DANS la poignée reste un bouton : on ne lui vole pas son
        // clic pour commencer un glissé de zéro pixel.
        if (event.target.closest('button, input, textarea, select, a')
            && event.target !== poignee) return;
        event.preventDefault();
        poignee.setPointerCapture(event.pointerId);

        const depart = { x: event.clientX, y: event.clientY };
        const origine = { x: el.offsetLeft, y: el.offsetTop };
        el.classList.add('flot--glisse');

        const onMove = (e) => placer(el,
            origine.x + (e.clientX - depart.x), origine.y + (e.clientY - depart.y));
        const onUp = () => {
            poignee.removeEventListener('pointermove', onMove);
            poignee.removeEventListener('pointerup', onUp);
            poignee.removeEventListener('pointercancel', onUp);
            el.classList.remove('flot--glisse');
            memoriser(el, cle);
        };
        poignee.addEventListener('pointermove', onMove);
        poignee.addEventListener('pointerup', onUp);
        poignee.addEventListener('pointercancel', onUp);
    };

    poignee.addEventListener('pointerdown', surPointerDown);

    // Un changement de taille de fenêtre — ou la rotation d'une tablette —
    // peut laisser l'élément hors champ, donc inatteignable.
    const surResize = () => placer(el, el.offsetLeft, el.offsetTop);
    window.addEventListener('resize', surResize);

    return () => {
        poignee.removeEventListener('pointerdown', surPointerDown);
        window.removeEventListener('resize', surResize);
    };
}

/**
 * UN CHAMP DE TEXTE POSÉ PAR-DESSUS UN JEU DOIT POUVOIR S'ÉCRIRE.
 *
 * Vingt jeux écoutent le clavier sur `document` — les flèches du labyrinthe,
 * l'espace du tir, les lettres du tableur — et beaucoup appellent
 * `preventDefault()`. Quand la barre de passe est ouverte PAR-DESSUS un jeu,
 * ces écouteurs voient chaque touche tapée dans la remarque : la flèche fait
 * bouger le personnage, et surtout le caractère n'arrive jamais dans le champ.
 * Certaines lettres ne s'écrivaient tout simplement pas.
 *
 * On arrête donc l'événement AU CHAMP. Les écouteurs du champ lui-même — la
 * validation par Entrée, les suggestions de recherche — sont sur la cible et
 * s'exécutent normalement ; ceux de `document` et de `window` ne voient plus
 * rien. Et comme on n'appelle pas `preventDefault`, le caractère s'écrit.
 *
 * @param {HTMLElement} racine - le champ, ou un conteneur de champs
 */
export function isolerClavier(racine) {
    const arreter = (e) => {
        if (!estChampTexte(e.target)) return;
        e.stopPropagation();
    };
    ['keydown', 'keyup', 'keypress'].forEach(t => racine.addEventListener(t, arreter));
}

/** Un endroit où l'on écrit : le clavier lui appartient. */
export function estChampTexte(n) {
    if (!n || n.nodeType !== 1) return false;
    const balise = n.tagName;
    if (balise === 'TEXTAREA') return true;
    if (balise === 'SELECT') return true;
    if (n.isContentEditable) return true;
    if (balise !== 'INPUT') return false;
    // Une case à cocher n'écrit rien : l'espace qui la coche n'a pas à être
    // retenu, et c'est le seul geste clavier qu'elle attend.
    return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(n.type);
}
