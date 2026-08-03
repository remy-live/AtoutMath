// La parole du robot.
//
// Une démonstration muette ne montre que le RÉSULTAT : le pointeur va sur la
// bonne case, la grille se remplit, et l'élève apprend au mieux où cliquer.
// Ce qui s'enseigne, c'est le chemin — pourquoi cette case, pourquoi pas
// l'autre, ce qu'on savait déjà et ce qu'on en déduit.
//
// Ce module fournit une bulle de parole que les activités font parler pendant
// qu'elles montrent. Deux règles s'y appliquent :
//
//   — elle est ANCRÉE : sa pointe désigne exactement ce dont elle parle (une
//     case, une cage, une proposition). Une phrase qui commente « celle-ci »
//     sans montrer laquelle ne vaut rien ;
//   — elle DURE le temps de sa lecture, calculé sur sa longueur, et cette
//     attente passe par le minuteur de la démonstration : la pause l'arrête,
//     le ralenti la double.

import { attendreDemo } from './demoPointer.js';

// Vitesse de lecture retenue : ~17 caractères par seconde, soit un peu moins
// qu'un lecteur adulte à voix haute. Le plancher compte autant que le reste :
// une phrase courte doit rester assez longtemps pour être vue apparaître.
const MS_PAR_CARACTERE = 58;
const LECTURE_MIN = 1700;
const LECTURE_MAX = 7000;

const MARGE = 12;   // du bord de la fenêtre
const ECART = 14;   // entre la bulle et ce qu'elle désigne

const ICONE_ROBOT = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M10 10v.01"/><path d="M14 10v.01"/>
    <path d="M8 14h8"/><path d="M12 3v-2"/></svg>`;

export function tempsDeLecture(texte) {
    return Math.min(LECTURE_MAX, Math.max(LECTURE_MIN, String(texte || '').length * MS_PAR_CARACTERE));
}

/**
 * Crée un narrateur. Un seul suffit pour toute une démonstration : la bulle est
 * réutilisée d'une phrase à l'autre, elle ne clignote pas entre deux.
 */
export function creerNarrateur() {
    const el = document.createElement('div');
    el.className = 'demo-bulle';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="demo-bulle-qui">${ICONE_ROBOT}</span><span class="demo-bulle-texte"></span>`;
    document.body.appendChild(el);

    const texteEl = el.querySelector('.demo-bulle-texte');
    let detruit = false;
    let attente = null;   // l'attente de lecture en cours, pour la dénouer

    /** Place la bulle près de sa cible, pointe alignée sur le centre de celle-ci. */
    function placer(cible) {
        el.classList.remove('demo-bulle--bas', 'demo-bulle--libre');

        if (!cible || !cible.getBoundingClientRect) {
            // Sans cible : en bas de l'écran, sans pointe. Une pointe qui ne
            // désigne rien vaut moins que pas de pointe.
            el.classList.add('demo-bulle--libre');
            el.style.left = `${Math.round((window.innerWidth - el.offsetWidth) / 2)}px`;
            el.style.top = `${Math.round(window.innerHeight - el.offsetHeight - 24)}px`;
            return;
        }

        const r = cible.getBoundingClientRect();
        const b = el.getBoundingClientRect();

        // Au-dessus par défaut, en dessous s'il n'y a pas la place.
        let dessous = r.top - b.height - ECART < MARGE;
        let top = dessous ? r.bottom + ECART : r.top - b.height - ECART;
        top = Math.max(MARGE, Math.min(top, window.innerHeight - b.height - MARGE));

        const centre = r.left + r.width / 2;
        let left = centre - b.width / 2;
        left = Math.max(MARGE, Math.min(left, window.innerWidth - b.width - MARGE));

        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
        el.classList.toggle('demo-bulle--bas', dessous);

        // La pointe suit la cible et non le centre de la bulle : quand celle-ci
        // est ramenée dans la fenêtre, les deux ne coïncident plus.
        const fleche = Math.max(16, Math.min(centre - left, b.width - 16));
        el.style.setProperty('--fleche', `${Math.round(fleche)}px`);
    }

    return {
        /**
         * Dit une phrase et attend qu'elle soit lue.
         * @param {string} texte
         * @param {Element} [cible] - ce que la pointe doit désigner
         * @param {{duree?:number}} [opts]
         * @returns {Promise<boolean>} false si la démonstration a été interrompue
         */
        async dire(texte, cible = null, opts = {}) {
            if (detruit || !texte) return !detruit;
            texteEl.textContent = texte;
            el.classList.add('demo-bulle--visible');
            // Mesurée APRÈS le texte : la hauteur d'une bulle dépend de ce
            // qu'elle dit, et se placer avant reviendrait à viser à l'ancienne
            // taille.
            placer(cible);
            const ok = await attendreDemo(opts.duree || tempsDeLecture(texte), a => { attente = a; });
            attente = null;
            return ok && !detruit;
        },

        /** Silence, sans effacer ce qui est à l'écran. */
        taire() {
            el.classList.remove('demo-bulle--visible');
        },

        detruire() {
            detruit = true;
            if (attente) attente.fin(false);
            el.remove();
        }
    };
}
