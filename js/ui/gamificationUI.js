// Célébration des médailles.
//
// Une modale par badge était tenable tant qu'ils tombaient un par un. Avec
// quatre paliers dans chaque famille, une bonne séance en décroche parfois
// cinq d'un coup — et cinq modales empilées, ce n'est plus une récompense,
// c'est un péage. On REGROUPE donc ce qui arrive dans la même seconde en une
// seule annonce.

import { badgesCatalog } from '../core/gamification.js';
import { deposerBadges } from './finDeSerie.js';

const attente = [];
let minuteur = null;

export function initGamificationUI() {
    document.addEventListener('badge_unlocked', (e) => {
        const def = badgesCatalog[e.detail];
        if (!def) return;
        attente.push(def);
        clearTimeout(minuteur);
        minuteur = setTimeout(annoncer, 260);
    });
}

/**
 * LES RÉCOMPENSES N'OUVRENT PLUS LEUR PROPRE FENÊTRE.
 *
 * Elles en ouvraient une, et le bilan de maîtrise en ouvrait une autre, au
 * même instant, par-dessus l'écran de fin du parcours. Trois panneaux
 * empilés : l'élève devait en fermer deux pour atteindre « Voir mon bilan »,
 * qui était dessous. À la sonnerie, il fermait tout au réflexe.
 *
 * On DÉPOSE donc le lot, et `ui/finDeSerie` décide s'il ouvre une carte pour
 * lui seul ou s'il le pose au-dessus du bilan dans la même. Ce module n'a pas
 * à savoir ce qu'est un bilan de maîtrise — c'est justement pourquoi il ne
 * pouvait pas s'en arranger tout seul.
 */
function annoncer() {
    const lot = attente.splice(0, attente.length);
    if (!lot.length) return;
    // Les confettis partent AVEC la carte, pas avant : lancés ici, ils
    // tombaient derrière la fenêtre qui s'ouvrait juste après.
    deposerBadges(lot, confettis);
}

function confettis() {
    if (typeof confetti === 'undefined') return;
    const fin = Date.now() + 2200;
    (function image() {
        const couleurs = ['#3b82f6', '#10b981', '#f59e0b'];
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: couleurs });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: couleurs });
        if (Date.now() < fin) requestAnimationFrame(image);
    }());
}

// `echapper` vivait ici : il est parti avec le gabarit, dans `finDeSerie`,
// qui est désormais le seul à écrire du HTML de récompense. Deux échappements
// pour un même texte, c'est un échappement qu'on oublie de corriger.
