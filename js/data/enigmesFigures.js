// LES PETITES IMAGES DES ÉNIGMES.
//
// Rémy : « tu peux faire des énigmes à petites images vectorielles ».
//
// TROIS RÈGLES, et elles tiennent au fait qu'une énigme du jour se lit debout.
//
//   1. L'IMAGE NE REMPLACE JAMAIS LE TEXTE. Une énigme doit pouvoir se lire à
//      voix haute et se résoudre sans regarder l'écran — c'est même ce qui en
//      fait une énigme du jour plutôt qu'un exercice. Le dessin évite à
//      l'énoncé de décrire ce qu'un coup d'œil dit ; il ne porte aucune
//      information qui ne soit dans la phrase.
//
//   2. ELLE NE DONNE PAS LA RÉPONSE. Dessiner les quatorze carrés d'un
//      échiquier 3 × 3, c'est répondre. On dessine la SITUATION, pas la
//      solution : la grille nue, les six personnes, le carré à découper.
//
//   3. ELLE TIENT DANS UN TIMBRE. Cent vingt pixels de côté, deux couleurs, un
//      trait épais. À cette taille, un dessin détaillé devient une tache — et
//      sur le téléphone de Rémy, l'encart du jour fait deux centimètres de
//      haut.
//
// PAS DE COULEUR EN DUR : `currentColor` et une teinte d'accent héritée. Les
// figures vivent dans l'encart du jour, dans le banc d'essai et sur fond clair
// ou sombre selon le thème — trois contextes, un seul dessin.

const CADRE = 'viewBox="0 0 120 120" role="img" class="enig-fig"';

/**
 * Chaque entrée rend le SVG complet. Une fonction plutôt qu'une chaîne : les
 * figures répétitives — une grille, une rangée de personnages — se décrivent
 * par leur règle, et une règle se relit.
 */
export const FIGURES = {
    /** Six ronds en cercle : les poignées de main. */
    'poignees': () => {
        const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            return [60 + 40 * Math.cos(a), 60 + 40 * Math.sin(a)];
        });
        // ON NE TRACE PAS LES QUINZE TRAITS : ce serait donner la réponse. Six
        // ronds disent « six personnes », et c'est tout ce que la phrase dit.
        return `<svg ${CADRE} aria-label="Six personnes disposées en cercle">
            ${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10"
                fill="none" stroke="currentColor" stroke-width="3"/>`).join('')}
        </svg>`;
    },

    /** Une grille de 2 sur 3 : les rectangles à compter. */
    'grille-2x3': () => {
        const x0 = 15, y0 = 30, w = 30, h = 20;
        let g = '';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                g += `<rect x="${x0 + i * w}" y="${y0 + j * h}" width="${w}" height="${h}"
                    fill="none" stroke="currentColor" stroke-width="3"/>`;
            }
        }
        return `<svg ${CADRE} aria-label="Une grille de deux cases sur trois">${g}</svg>`;
    },

    /** L'échiquier 3 × 3 des carrés à compter. */
    'grille-3x3': () => {
        const x0 = 15, c = 30;
        let g = '';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                g += `<rect x="${x0 + i * c}" y="${x0 + j * c}" width="${c}" height="${c}"
                    fill="none" stroke="currentColor" stroke-width="3"/>`;
            }
        }
        return `<svg ${CADRE} aria-label="Une grille de trois cases sur trois">${g}</svg>`;
    },

    /** Un octogone : les diagonales à compter. */
    'octogone': () => {
        const pts = Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            return `${(60 + 45 * Math.cos(a)).toFixed(1)},${(60 + 45 * Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        return `<svg ${CADRE} aria-label="Un octogone">
            <polygon points="${pts}" fill="none" stroke="currentColor" stroke-width="3"/>
        </svg>`;
    },

    /** L'escalier à dix marches. */
    'escalier': () => {
        let d = 'M 12 108';
        for (let i = 0; i < 10; i++) d += ` v -9.6 h 9.6`;
        return `<svg ${CADRE} aria-label="Un escalier de dix marches">
            <path d="${d}" fill="none" stroke="currentColor" stroke-width="3"
                  stroke-linejoin="round" stroke-linecap="round"/>
        </svg>`;
    },

    /** La ficelle et ses coupures. */
    'ficelle': () => `<svg ${CADRE} aria-label="Une ficelle tendue">
        <line x1="10" y1="60" x2="110" y2="60" stroke="currentColor" stroke-width="4"
              stroke-linecap="round"/>
        ${[30, 50, 70, 90].map(x => `<line x1="${x}" y1="46" x2="${x}" y2="74"
            stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" opacity=".55"/>`).join('')}
    </svg>`,

    /** Le carré et sa diagonale : la racine de deux. */
    'carre-diagonale': () => `<svg ${CADRE} aria-label="Un carré et sa diagonale">
        <rect x="22" y="22" width="76" height="76" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="22" y1="98" x2="98" y2="22" stroke="currentColor" stroke-width="3"
              stroke-dasharray="7 5"/>
    </svg>`,

    /** Deux verres : le problème du transvasement. */
    'deux-verres': () => `<svg ${CADRE} aria-label="Deux verres, l'un plus grand que l'autre">
        <path d="M 18 30 L 26 96 L 52 96 L 60 30 Z" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linejoin="round"/>
        <path d="M 68 46 L 74 96 L 94 96 L 100 46 Z" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linejoin="round"/>
    </svg>`,

    /** L'horloge : les aiguilles qui se superposent. */
    'horloge': () => `<svg ${CADRE} aria-label="Le cadran d'une horloge">
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="3"/>
        ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return `<line x1="${(60 + 38 * Math.cos(a)).toFixed(1)}" y1="${(60 + 38 * Math.sin(a)).toFixed(1)}"
                x2="${(60 + 44 * Math.cos(a)).toFixed(1)}" y2="${(60 + 44 * Math.sin(a)).toFixed(1)}"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`;
    }).join('')}
        <line x1="60" y1="60" x2="60" y2="32" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="60" y1="60" x2="84" y2="60" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,

    /** Le cube peint : les petits cubes d'une arête. */
    'cube': () => `<svg ${CADRE} aria-label="Un cube en perspective">
        <path d="M 26 44 L 26 96 L 74 96 L 74 44 Z" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M 26 44 L 46 26 L 94 26 L 74 44" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linejoin="round"/>
        <path d="M 74 96 L 94 78 L 94 26" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linejoin="round"/>
        ${[1, 2].map(i => `<line x1="${26 + i * 16}" y1="44" x2="${26 + i * 16}" y2="96"
            stroke="currentColor" stroke-width="1.5" opacity=".5"/>
            <line x1="26" y1="${44 + i * 17.3}" x2="74" y2="${44 + i * 17.3}"
            stroke="currentColor" stroke-width="1.5" opacity=".5"/>`).join('')}
    </svg>`,

    /** Le triangle rectangle des énigmes de Pythagore. */
    'triangle-rectangle': () => `<svg ${CADRE} aria-label="Un triangle rectangle">
        <polygon points="20,100 100,100 20,32" fill="none" stroke="currentColor" stroke-width="3"
                 stroke-linejoin="round"/>
        <path d="M 20 88 L 32 88 L 32 100" fill="none" stroke="currentColor" stroke-width="2.5"/>
    </svg>`,

    /** Les allumettes du carré à déplacer. */
    'allumettes': () => `<svg ${CADRE} aria-label="Quatre allumettes formant un carré">
        ${[[30, 30, 90, 30], [90, 30, 90, 90], [90, 90, 30, 90], [30, 90, 30, 30]]
        .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"
            stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`).join('')}
    </svg>`,

    /** Les deux plateaux d'une balance. */
    'balance': () => `<svg ${CADRE} aria-label="Une balance à deux plateaux">
        <line x1="60" y1="26" x2="60" y2="96" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <line x1="20" y1="36" x2="100" y2="36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M 8 48 L 32 48 L 20 66 Z" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linejoin="round"/>
        <path d="M 88 48 L 112 48 L 100 66 Z" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linejoin="round"/>
        <line x1="20" y1="36" x2="20" y2="48" stroke="currentColor" stroke-width="2"/>
        <line x1="100" y1="36" x2="100" y2="48" stroke="currentColor" stroke-width="2"/>
        <line x1="40" y1="96" x2="80" y2="96" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    </svg>`
};

/** Le SVG d'une figure, ou une chaîne vide si le nom n'existe pas. */
export function figureSvg(nom) {
    const f = FIGURES[nom];
    return typeof f === 'function' ? f() : '';
}
