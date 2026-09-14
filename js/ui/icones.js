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

// --- LES ICÔNES DES FENÊTRES D'IMPRESSION ------------------------------------
//
// Rémy : « les icônes sont pas belles, fais mieux ». Elles étaient des émojis —
// 📝, 📄, 🎲, ⬇️ — posés en tête de trois fenêtres et de six boutons. Un émoji
// n'est pas un dessin : c'est un caractère, rendu par la police du SYSTÈME. Le
// même 🎲 est un dé rouge sur un iPhone, un dé blanc sur Windows, un dessin
// plat sur Android — et à côté d'icônes au trait, il fait tache quel que soit
// l'appareil. C'est ce que Rémy voyait sans forcément le nommer : trois styles
// graphiques dans la même barre.
//
// On les redessine donc au trait, dans la ligne du robot et de l'ampoule
// ci-dessus : 24 × 24, sans remplissage, 1,8 d'épaisseur, bouts arrondis.

const TRAIT = (taille, classe, corps) => `<svg class="ico ${classe}"
    xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;

/** La feuille d'exercices : une page avec ses lignes. */
export const ficheSvg = (t = 20, c = '') => TRAIT(t, c,
    `<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
     <path d="M14 3v5h5"/><path d="M8.5 12.5h7"/><path d="M8.5 16h4.5"/>`);

/** Le crayon de la fiche d'exercices : on la fabrique, on ne la subit pas. */
export const crayonSvg = (t = 20, c = '') => TRAIT(t, c,
    `<path d="M12 20h9"/>
     <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>`);

/**
 * LE TIRAGE AU SORT : deux flèches en boucle, et non un dé.
 *
 * Le dé disait « hasard » ; ce bouton ne tire pas au hasard, il REFAIT — on
 * redemande d'autres questions du même exercice, avec les mêmes réglages. La
 * boucle dit le geste, le dé disait l'ingrédient.
 */
export const refaireSvg = (t = 20, c = '') => TRAIT(t, c,
    `<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/>
     <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>`);

/** Le téléchargement : une flèche qui descend sur un socle. */
export const telechargerSvg = (t = 20, c = '') => TRAIT(t, c,
    `<path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/>
     <path d="M4 20h16"/>`);

/** L'engrenage des réglages d'un exercice. */
export const reglagesSvg = (t = 18, c = '') => TRAIT(t, c,
    `<circle cx="12" cy="12" r="3.2"/>
     <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"/>`);

/** La croix qui retire un champ de l'en-tête. */
export const croixSvg = (t = 14, c = '') => TRAIT(t, c, `<path d="m6 6 12 12M18 6 6 18"/>`);
