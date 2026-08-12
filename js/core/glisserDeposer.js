// GLISSER-DÉPOSER — le geste attendu partout où l'on remplit des cases.
//
// Devant une étiquette et une case vide, un élève ESSAIE DE GLISSER. Ne rien
// obtenir donne l'impression que l'écran est cassé — et le clic seul, lui,
// n'apprend rien de plus. Ce module donne donc le geste à tous les exercices
// à trous, avec les trois comportements qu'on attend d'un vrai glisser :
//
//   · UN FANTÔME suit le doigt (on doit voir ce qu'on déplace) ;
//   · LA CIBLE SURVOLÉE S'ALLUME, et elle seule ;
//   · UN BLOC DÉJÀ POSÉ QU'ON RELÂCHE DANS LE VIDE RETOURNE AU STOCK. C'est
//     le comportement normal, et sans lui l'élève qui s'est trompé de case ne
//     sait plus comment revenir en arrière.
//
// L'APPUI SIMPLE CONTINUE DE MARCHER : c'est le geste le plus sûr, le seul au
// clavier, et le plus rapide quand il n'y a qu'un trou libre.
//
// Le tactile passe par les événements TOUCH bruts, pas par les événements
// pointeur : Safari émet un `pointercancel` dès qu'il décide qu'un geste est
// un défilement, et le glissement mourait à mi-chemin. `touch-action: none`
// sur l'étiquette ne suffit pas.

/** La feuille de style commune — à injecter une fois par jeu. */
export const CSS_GLISSER = `
    .gd-glissable { touch-action: none; cursor: grab; }
    .gd-source { opacity: .32; }
    .gd-fantome {
        position: fixed; z-index: 12000; pointer-events: none;
        transform: translate(-50%, -50%); opacity: .95;
        box-shadow: 0 10px 26px rgba(0,0,0,.32); cursor: grabbing;
    }
    .gd-survol {
        border-color: var(--primary) !important; border-style: solid !important;
        background: color-mix(in srgb, var(--primary) 18%, transparent) !important;
    }
    /* La zone de retour s'annonce dès qu'un bloc POSÉ est en vol : c'est elle
       qui dit « relâche ici pour reprendre ». */
    .gd-retour--vise {
        outline: 2.5px dashed var(--primary); outline-offset: 3px; border-radius: 10px;
    }
`;

/**
 * Rend un élément glissable.
 *
 * @param {HTMLElement} el          ce qu'on déplace
 * @param {Object} opts
 * @param {string} opts.cibles      sélecteur des cases où déposer
 * @param {(cible:HTMLElement)=>void} opts.deposer   appelé sur une cible valide
 * @param {()=>void} [opts.retirer] appelé quand on relâche AILLEURS que sur une
 *        cible : c'est le retour au stock. Absent, le lâcher dans le vide ne
 *        fait rien (le comportement d'une étiquette encore en réserve).
 * @param {HTMLElement} [opts.zoneRetour] la zone à souligner pendant le vol
 *        d'un bloc posé — la réserve, en général.
 * @param {()=>boolean} [opts.actif] pour geler le geste (démonstration du robot)
 * @param {(v:boolean)=>void} [opts.marquerGlissement] prévient l'appelant qu'un
 *        glissement vient d'avoir lieu, pour que le clic qui suit ne
 *        re-sélectionne pas l'étiquette déposée.
 */
export function rendreGlissable(el, opts) {
    const { cibles, deposer, retirer, zoneRetour, actif, marquerGlissement } = opts;
    el.classList.add('gd-glissable');
    let fantome = null, cible = null;

    const viser = (x, y) => {
        const sous = document.elementFromPoint(x, y);
        const c = sous && sous.closest(cibles);
        if (c === cible) return;
        if (cible) cible.classList.remove('gd-survol');
        cible = c;
        if (cible) cible.classList.add('gd-survol');
    };

    const bouger = (x, y) => {
        if (!fantome) {
            const r = el.getBoundingClientRect();
            fantome = el.cloneNode(true);
            fantome.classList.add('gd-fantome');
            fantome.classList.remove('gd-source');
            fantome.style.width = `${r.width}px`;
            fantome.style.height = `${r.height}px`;
            document.body.appendChild(fantome);
            el.classList.add('gd-source');
            if (retirer && zoneRetour) zoneRetour.classList.add('gd-retour--vise');
        }
        fantome.style.left = `${x}px`;
        fantome.style.top = `${y}px`;
        viser(x, y);
    };

    const lacher = () => {
        el.classList.remove('gd-source');
        if (fantome) fantome.remove();
        fantome = null;
        if (zoneRetour) zoneRetour.classList.remove('gd-retour--vise');
        const c = cible;
        if (cible) cible.classList.remove('gd-survol');
        cible = null;
        if (marquerGlissement) marquerGlissement(true);
        setTimeout(() => { if (marquerGlissement) marquerGlissement(false); }, 350);
        if (c) deposer(c);
        else if (retirer) retirer();     // relâché dans le vide : retour au stock
    };

    el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;          // le doigt : plus bas
        if (actif && !actif()) return;
        e.preventDefault();
        const move = (m) => bouger(m.clientX, m.clientY);
        const up = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            if (fantome) lacher();
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
    });

    el.addEventListener('touchstart', (e) => {
        if (actif && !actif()) return;
        const d = e.touches[0];
        const depart = { x: d.clientX, y: d.clientY };
        let parti = false;
        const move = (m) => {
            const p = m.touches[0];
            // Huit pixels de marge : en dessous, c'est un appui qui tremble,
            // pas un glissement — et l'appui a déjà son propre effet.
            if (!parti && Math.hypot(p.clientX - depart.x, p.clientY - depart.y) < 8) return;
            parti = true;
            m.preventDefault();                          // on prend la main sur le défilement
            bouger(p.clientX, p.clientY);
        };
        const fin = () => {
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', fin);
            document.removeEventListener('touchcancel', fin);
            if (parti) lacher();
        };
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', fin);
        document.addEventListener('touchcancel', fin);
    }, { passive: true });
}
