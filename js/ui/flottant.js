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

// --- ANCRÉE OU DÉTACHÉE : LES DEUX, AU CHOIX ---------------------------------
//
// Une modale BLOQUE : elle assombrit la page, prend tous les clics, et il faut
// la refermer pour faire autre chose. C'est ce qu'on veut quand on prépare UNE
// fiche : rien d'autre à l'écran, tout l'espace pour la regarder. Et c'est
// exactement ce qu'on ne veut pas pendant une passe de test, où l'on regarde
// cent fiches à la suite — ouvrir, lire, refermer, avancer, rouvrir.
//
// Les deux ont raison, alors la fenêtre fait les deux, et le bouton est DANS
// son titre. DÉTACHÉE, c'est la même fiche : mêmes réglages, même aperçu, même
// PDF. On ne lui retire que ce qui bloque — le fond sombre et la capture des
// clics —, et on lui ajoute une poignée, un coin qu'on tire, et la mémoire des
// deux.
//
// ET LES RÉGLAGES SE REPLIENT. Dans une fenêtre de soixante centimètres
// carrés, huit réglages en tête repoussent la feuille sous le bord bas : on
// ouvre un aperçu pour ne voir que des menus. Repliés, la feuille prend toute
// la fenêtre — et ils reviennent d'un bouton, sans rien perdre de ce qu'on
// avait choisi.

const ICONE_DETACHER = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><rect x="3" y="7" width="12" height="12" rx="2"/>
    <path d="M9 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/></svg>`;
const ICONE_ANCRER = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M3 9h18"/></svg>`;
const CHEVRON_HAUT = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>`;
const CHEVRON_BAS = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

/** La fenêtre est-elle posée à côté, plutôt qu'en travers ? */
export const estDetache = (overlay) => !!overlay && overlay.classList.contains('flot-detache');

/**
 * Équipe une modale des deux commandes : ancrer / détacher, et replier les
 * réglages. À n'appeler qu'UNE FOIS par modale, à sa création.
 *
 * @param {HTMLElement} overlay - la couche `.modal-overlay`
 * @param {string} cle          - où retenir place, taille, mode et repli
 * @returns {{detacher:Function, ancrer:Function, basculer:Function,
 *            replier:Function, estDetache:Function}}
 */
export function equiperFenetre(overlay, cle) {
    // REDESSINER APRÈS COUP. L'aperçu calcule son échelle sur la largeur
    // DISPONIBLE au moment où il se dessine : détacher, replier ou tirer le
    // coin change cette largeur sans que personne le lui dise, et la feuille
    // restait coupée à droite. La modale dépose ici de quoi se redessiner.
    const retracer = () => {
        try { if (typeof overlay._flotRendre === 'function') overlay._flotRendre(); }
        catch (e) { /* la fenêtre s'est refermée entre-temps */ }
    };
    const panneau = overlay.querySelector('.glass-panel');
    const titre = panneau && (panneau.querySelector('.modal-title') || panneau.firstElementChild);
    if (!panneau || !titre || panneau.dataset.flotEquipe) return commandesVides();
    panneau.dataset.flotEquipe = '1';

    const cmd = document.createElement('span');
    cmd.className = 'flot-cmd';
    cmd.innerHTML = `
        <button type="button" data-flot-replier></button>
        <button type="button" data-flot-mode></button>`;
    titre.appendChild(cmd);
    const bReplier = cmd.querySelector('[data-flot-replier]');
    const bMode = cmd.querySelector('[data-flot-mode]');

    let defaire = null;

    const majBoutons = () => {
        const off = estDetache(overlay);
        bMode.innerHTML = off ? ICONE_ANCRER : ICONE_DETACHER;
        bMode.title = off
            ? 'Ancrer la fenêtre au centre, comme une fiche qu\'on prépare'
            : 'Détacher la fenêtre : elle se pose à côté et ne bloque plus rien';
        bMode.setAttribute('aria-label', bMode.title);
        const replie = panneau.classList.contains('flot-replie');
        bReplier.innerHTML = replie ? CHEVRON_BAS : CHEVRON_HAUT;
        bReplier.title = replie ? 'Montrer les réglages' : 'Replier les réglages pour voir la feuille';
        bReplier.setAttribute('aria-label', bReplier.title);
        bReplier.setAttribute('aria-expanded', String(!replie));
    };

    const detacherIci = () => {
        if (estDetache(overlay)) return;
        defaire = poserFlottante(overlay, panneau, titre, cle, retracer);
        retenir(`${cle}-mode`, 'detache');
        majBoutons();
        retracer();
    };
    const ancrerIci = () => {
        if (!estDetache(overlay)) return;
        if (defaire) { defaire(); defaire = null; }
        retenir(`${cle}-mode`, 'ancre');
        majBoutons();
        retracer();
    };
    const replier = (veut) => {
        const replie = veut === undefined ? !panneau.classList.contains('flot-replie') : !!veut;
        panneau.classList.toggle('flot-replie', replie);
        retenir(`${cle}-replie`, replie ? '1' : '0');
        majBoutons();
        retracer();
    };

    bMode.onclick = () => (estDetache(overlay) ? ancrerIci() : detacherIci());
    bReplier.onclick = () => replier();

    // Ce qu'on avait choisi la dernière fois : le repli suit l'auteur d'une
    // fiche à l'autre, c'est un réglage de confort et pas une propriété de
    // l'exercice.
    replier(lire(`${cle}-replie`) === '1');
    majBoutons();

    return {
        detacher: detacherIci, ancrer: ancrerIci,
        basculer: () => (estDetache(overlay) ? ancrerIci() : detacherIci()),
        replier, estDetache: () => estDetache(overlay)
    };
}

const commandesVides = () => ({
    detacher() {}, ancrer() {}, basculer() {}, replier() {}, estDetache: () => false
});

function retenir(cle, valeur) {
    try { localStorage.setItem(cle, valeur); } catch (e) { /* privé */ }
}
function lire(cle) {
    try { return localStorage.getItem(cle); } catch (e) { return null; }
}

/**
 * Le passage effectif en fenêtre posée à côté. Interne : on y entre par
 * `equiperFenetre`, qui tient le bouton et la mémoire du mode.
 *
 * @returns {() => void} de quoi la rattacher au centre
 */
function poserFlottante(overlay, panneau, titre, cle, retracer) {
    overlay.classList.add('flot-detache');
    panneau.classList.add('flot-fenetre');
    if (titre) titre.classList.add('flot-poignee');

    // À droite, et haut : la barre de passe vit en bas, le jeu au milieu.
    restaurer(panneau, cle, (el) => placer(el, window.innerWidth - el.offsetWidth - 16, 16));

    const debrancher = titre ? rendreDeplacable(panneau, titre, cle) : () => {};

    // LA TAILLE SE RETIENT AUSSI. `resize: both` est une poignée du navigateur :
    // elle ne prévient personne, seul un observateur la voit passer. Sans cela,
    // la fenêtre qu'on vient d'agrandir pour lire une consigne redevient petite
    // à l'exercice suivant.
    let obs = null;
    if (typeof ResizeObserver !== 'undefined') {
        let minuteur = null;
        obs = new ResizeObserver(() => {
            clearTimeout(minuteur);
            minuteur = setTimeout(() => {
                panneau.style.width = `${panneau.offsetWidth}px`;
                panneau.style.height = `${panneau.offsetHeight}px`;
                memoriser(panneau, cle);
                placer(panneau, panneau.offsetLeft, panneau.offsetTop);
                if (retracer) retracer();
            }, 250);
        });
        obs.observe(panneau);
    }

    return () => {
        if (obs) obs.disconnect();
        debrancher();
        overlay.classList.remove('flot-detache');
        panneau.classList.remove('flot-fenetre');
        if (titre) titre.classList.remove('flot-poignee');
        panneau.style.left = panneau.style.top = '';
        panneau.style.width = panneau.style.height = '';
    };
}
