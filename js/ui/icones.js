// LES ICÔNES DE L'APPLICATION, à un seul endroit.
//
// Le robot est le personnage de MathBox : c'est lui qui montre les exercices,
// lui qui explique, lui qui parle à l'élève quand il arrive. Il a un dessin —
// un SVG au trait, celui du bouton « Mode Démonstration » — et ce dessin doit
// être le MÊME partout. Un emoji 🤖 posé à sa place dans une modale donne un
// autre robot, d'un autre style, et l'élève ne reconnaît plus qui lui parle.
//
// D'où ce module : on ne recopie pas un chemin SVG dans trois fichiers, on
// l'appelle.

/** Le robot de MathBox. `taille` en pixels. */
export function robotSvg(taille = 44, classe = '') {
    return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M10 10v.01" /><path d="M14 10v.01" /><path d="M8 14h8" />
        <path d="M9 18v3" /><path d="M15 18v3" />
        <path d="M2 14h1" /><path d="M21 14h1" /><path d="M12 3v-2" />
    </svg>`;
}

/** L'ampoule des indices — même raison, même règle. */
export function ampouleSvg(taille = 20, classe = '') {
    return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>`;
}
