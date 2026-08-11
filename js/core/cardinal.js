// LES QUATRE DIRECTIONS, ET CE QUE « TOURNER » VEUT DIRE.
//
// Une poignée de fonctions, mais elles portent une idée qui revient dans
// plusieurs exercices : LA GAUCHE DE QUI SE DÉPLACE N'EST PAS LA GAUCHE DE
// L'ÉCRAN. Quand on descend, sa gauche est à l'est — donc à droite du dessin.
//
// Elles vivaient dans core/ville.js, qui les avait écrites en premier. Un
// second exercice en a eu besoin (l'automate, où un robot exécute un
// programme) : plutôt que de les recopier — et de les laisser diverger — elles
// sont ici, et ville.js les réexporte pour ne rien casser chez lui.

/** Les quatre caps, dans l'ordre des aiguilles d'une montre. */
export const CAPS = ['N', 'E', 'S', 'O'];

export const VECTEURS = { N: [0, -1], E: [1, 0], S: [0, 1], O: [-1, 0] };

/** Tourner : la gauche retire un quart de tour, la droite en ajoute un. */
export function tourner(cap, sens) {
    const i = CAPS.indexOf(cap);
    if (i < 0) return cap;
    if (sens === 'gauche') return CAPS[(i + 3) % 4];
    if (sens === 'droite') return CAPS[(i + 1) % 4];
    if (sens === 'demi-tour') return CAPS[(i + 2) % 4];
    return cap;
}

/** Le sens relatif qui mène du cap `a` au cap `b`. */
export function sensEntre(a, b) {
    const d = (CAPS.indexOf(b) - CAPS.indexOf(a) + 4) % 4;
    return ['tout-droit', 'droite', 'demi-tour', 'gauche'][d];
}

/** La case atteinte en avançant d'un pas depuis (x, y) au cap donné. */
export function devant(x, y, cap) {
    const [dx, dy] = VECTEURS[cap];
    return { x: x + dx, y: y + dy };
}

/** Le nom du cap tel qu'on le dit à un élève : en termes d'ÉCRAN. */
export function nomCap(cap) {
    return {
        N: 'le haut du plan', E: 'la droite du plan',
        S: 'le bas du plan', O: 'la gauche du plan'
    }[cap] || cap;
}
