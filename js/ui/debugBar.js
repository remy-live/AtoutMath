// Palette d'outils d'auteur : déplacement et repli.
//
// En bandeau fixe occupant toute la largeur, elle recouvrait l'en-tête du jeu —
// donc précisément ce qu'elle sert à tester. Devenue une petite palette
// flottante, elle se pousse là où elle ne gêne pas, et se replie sur sa
// poignée quand on veut voir l'écran tel que l'élève le verra.
//
// Le glissé lui-même vit dans ui/flottant.js : la barre de passe du banc
// d'essai en a besoin aussi, et deux implémentations du même geste finissent
// toujours par ne plus se comporter pareil.

import { placer, restaurer, rendreDeplacable } from './flottant.js';

const CLE = 'mathbox-debug-pos';
const MARGE = 6;

export function initDebugBar() {
    const bar = document.getElementById('debug-toolbar');
    const grip = document.getElementById('db-grip');
    const fold = document.getElementById('db-fold');
    if (!bar || !grip) return;

    // En bas à gauche par défaut, et non en haut : le haut de l'écran porte
    // l'en-tête du jeu — titre, progression, chronomètre — c'est-à-dire ce
    // qu'on regarde en testant. Le bas à gauche est le coin le plus vide.
    restaurer(bar, CLE, (el) => placer(el, MARGE, window.innerHeight));
    rendreDeplacable(bar, grip, CLE);

    if (fold) {
        fold.onclick = () => {
            const replie = bar.classList.toggle('dbg--folded');
            fold.textContent = replie ? '›' : '‹';
            fold.title = replie ? 'Déplier la palette' : 'Replier la palette';
            fold.setAttribute('aria-label', fold.title);
            fold.setAttribute('aria-expanded', String(!replie));
            // La largeur change : sans recadrage, une palette dépliée près du
            // bord droit sortirait de l'écran.
            placer(bar, bar.offsetLeft, bar.offsetTop);
        };
    }
}
