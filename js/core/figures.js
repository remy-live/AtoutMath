// Figures géométriques, en SVG.
//
// Pourquoi du SVG plutôt que des grilles CSS : `.canvas-area` centre ses
// enfants, qui se réduisent donc à leur contenu. Une grille en `1fr` s'y
// effondrait en bandeau vertical, et une figure en `width:100%` devenait
// minuscule. Un SVG porte son propre `viewBox` : il se dimensionne
// correctement quel que soit le conteneur, et reste net à toute taille.
//
// Ces fonctions sont pures (paramètres -> chaîne SVG) et partagées entre les
// générateurs (qui affichent une figure dans l'énoncé) et les activités (qui
// la rendent cliquable).

const UNIT = 34;      // pixels par unité du repère
const PAD = 30;       // marge pour les graduations et les flèches

/**
 * Repère du plan, avec axes fléchés, origine et graduations entières.
 *
 * @param {Object} cfg
 * @param {number} cfg.max               - valeur maximale des axes
 * @param {boolean} [cfg.relatifs]       - false = premier quadrant seulement
 * @param {{x:number,y:number,label?:string}} [cfg.point] - point à tracer
 * @param {boolean} [cfg.interactive]    - ajoute une cible cliquable par nœud
 * @returns {string}
 */
export function repereSvg({ max = 5, relatifs = false, point = null, interactive = false } = {}) {
    const min = relatifs ? -max : 0;
    const span = max - min;
    const size = span * UNIT;
    const W = size + PAD * 2;
    const H = size + PAD * 2;

    const sx = x => PAD + (x - min) * UNIT;
    const sy = y => PAD + (max - y) * UNIT;

    const parts = [];

    // Quadrillage léger : il guide la lecture sans concurrencer les axes.
    for (let i = min; i <= max; i++) {
        parts.push(`<line class="rep-grid" x1="${sx(i)}" y1="${sy(min)}" x2="${sx(i)}" y2="${sy(max)}"/>`);
        parts.push(`<line class="rep-grid" x1="${sx(min)}" y1="${sy(i)}" x2="${sx(max)}" y2="${sy(i)}"/>`);
    }

    // Axes, prolongés jusqu'à la flèche.
    parts.push(`<line class="rep-axis" x1="${sx(min) - 6}" y1="${sy(0)}" x2="${sx(max) + 16}" y2="${sy(0)}" marker-end="url(#rep-arrow)"/>`);
    parts.push(`<line class="rep-axis" x1="${sx(0)}" y1="${sy(min) + 6}" x2="${sx(0)}" y2="${sy(max) - 16}" marker-end="url(#rep-arrow)"/>`);

    // Graduations chiffrées. Le 0 est remplacé par le O de l'origine.
    for (let i = min; i <= max; i++) {
        if (i === 0) continue;
        parts.push(`<line class="rep-tick" x1="${sx(i)}" y1="${sy(0) - 4}" x2="${sx(i)}" y2="${sy(0) + 4}"/>`);
        parts.push(`<text class="rep-num" x="${sx(i)}" y="${sy(0) + 18}" text-anchor="middle">${i}</text>`);
        parts.push(`<line class="rep-tick" x1="${sx(0) - 4}" y1="${sy(i)}" x2="${sx(0) + 4}" y2="${sy(i)}"/>`);
        parts.push(`<text class="rep-num" x="${sx(0) - 9}" y="${sy(i) + 4}" text-anchor="end">${i}</text>`);
    }
    parts.push(`<text class="rep-num rep-origin" x="${sx(0) - 9}" y="${sy(0) + 18}" text-anchor="end">O</text>`);
    parts.push(`<text class="rep-axis-name" x="${sx(max) + 18}" y="${sy(0) + 16}">x</text>`);
    parts.push(`<text class="rep-axis-name" x="${sx(0) + 10}" y="${sy(max) - 16}">y</text>`);

    if (point) {
        const px = sx(point.x), py = sy(point.y);
        // Traits de rappel : c'est ce qui rend la lecture des coordonnées
        // évidente, et c'est la méthode qu'on veut voir reproduite.
        parts.push(`<line class="rep-helper" x1="${sx(0)}" y1="${py}" x2="${px}" y2="${py}"/>`);
        parts.push(`<line class="rep-helper" x1="${px}" y1="${sy(0)}" x2="${px}" y2="${py}"/>`);
        parts.push(`<circle class="rep-point" cx="${px}" cy="${py}" r="6"/>`);
        parts.push(`<text class="rep-point-label" x="${px + 11}" y="${py - 10}">${point.label || 'A'}</text>`);
    }

    if (interactive) {
        for (let x = min; x <= max; x++) {
            for (let y = min; y <= max; y++) {
                parts.push(
                    `<circle class="rep-hit" data-c="${x},${y}" cx="${sx(x)}" cy="${sy(y)}" r="13"
                             tabindex="0" role="button" aria-label="Point ${x} ; ${y}"></circle>`
                );
            }
        }
    }

    return `
    <svg class="rep-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
         role="img" aria-label="Repère du plan gradué de ${min} à ${max}">
        <defs>
            <marker id="rep-arrow" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
            </marker>
        </defs>
        ${parts.join('\n        ')}
    </svg>`;
}

/**
 * Rectangle coté. Le dessin est proportionnel aux dimensions réelles, mais
 * borné : un rectangle 12 × 1 doit rester lisible sans devenir un trait.
 */
export function rectangleSvg(L, l, unit = 'cm') {
    // Le dessin est volontairement plus large que haut : un SVG est mis à
    // l'échelle par sa plus petite dimension disponible, et une figure haute
    // se retrouve fortement réduite — les cotes deviennent alors illisibles.
    // On borne donc la hauteur assez bas et on écrit les cotes en gros dans
    // le repère du viewBox, pour qu'elles restent lisibles après réduction.
    const maxW = 300, maxH = 118, minH = 52;
    const scale = Math.min(maxW / L, maxH / Math.max(l, 1));
    const w = Math.round(L * scale);
    const h = Math.max(minH, Math.round(l * scale));
    const padX = 56, padY = 16, padBottom = 48;
    const W = w + padX * 2;
    const H = h + padY + padBottom;

    const dimY = padY + h + 16;   // ligne de cote horizontale
    const dimX = padX - 18;       // ligne de cote verticale
    const midY = padY + h / 2;

    // La cote verticale est écrite le long de sa ligne, dans le sens de
    // lecture ascendant : c'est la convention de cotation, et cela évite que
    // le texte déborde à gauche quand il est grossi sur petit écran.
    return `
    <svg class="fig-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
         role="img" aria-label="Rectangle de ${L} ${unit} sur ${l} ${unit}">
        <defs>
            <marker id="fig-arrow" viewBox="0 0 10 10" refX="9.5" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path class="fig-arrow-head" d="M 0 0 L 10 5 L 0 10 z"/>
            </marker>
        </defs>

        <rect class="fig-shape" x="${padX}" y="${padY}" width="${w}" height="${h}" rx="3"/>

        <!-- Lignes d'attache puis ligne de cote à double flèche. -->
        <line class="fig-ext" x1="${padX}" y1="${padY + h}" x2="${padX}" y2="${dimY + 6}"/>
        <line class="fig-ext" x1="${padX + w}" y1="${padY + h}" x2="${padX + w}" y2="${dimY + 6}"/>
        <line class="fig-dim" x1="${padX}" y1="${dimY}" x2="${padX + w}" y2="${dimY}"
              marker-start="url(#fig-arrow)" marker-end="url(#fig-arrow)"/>
        <text class="fig-label" x="${padX + w / 2}" y="${dimY + 27}" text-anchor="middle">${L} ${unit}</text>

        <line class="fig-ext" x1="${padX}" y1="${padY}" x2="${dimX - 6}" y2="${padY}"/>
        <line class="fig-ext" x1="${padX}" y1="${padY + h}" x2="${dimX - 6}" y2="${padY + h}"/>
        <line class="fig-dim" x1="${dimX}" y1="${padY}" x2="${dimX}" y2="${padY + h}"
              marker-start="url(#fig-arrow)" marker-end="url(#fig-arrow)"/>
        <text class="fig-label" x="${dimX - 9}" y="${midY}" text-anchor="middle"
              transform="rotate(-90 ${dimX - 9} ${midY})">${l} ${unit}</text>
    </svg>`;
}

// --- Numération égyptienne --------------------------------------------------
//
// Les glyphes sont dessinés en SVG plutôt que pris dans le bloc Unicode
// « Egyptian Hieroglyphs » : ce dernier n'est présent dans presque aucune
// police système, et un carré blanc à la place d'un symbole rend l'exercice
// impossible. Des tracés simples, reconnaissables et de taille homogène.

/**
 * Les cinq glyphes, en TRACÉS PLEINS dans une case de 24 × 32.
 *
 * Ils étaient dessinés au trait fin : à trente-quatre pixels, une anse et une
 * corde enroulée se ressemblaient, le lotus n'était qu'un gribouillis, et il
 * fallait deviner au lieu de compter. Or l'exercice ne demande pas de
 * reconnaître un hiéroglyphe d'archéologue : il demande de voir d'un coup
 * d'œil « trois de ceux-là, deux de ceux-ci », puis d'additionner. Des formes
 * PLEINES et franchement différentes les unes des autres — une barre, une
 * arche, une spirale, une fleur, un doigt — servent ce comptage ; un trait de
 * 2 px ne le servait pas.
 *
 * Chaque glyphe déclare lui-même s'il se remplit ou s'il se trace : la spirale
 * de la centaine n'a de sens qu'en trait continu, tout le reste gagne à être
 * plein.
 */
const GLYPHES = {
    // Bâton : une unité. Une simple barre, légèrement arrondie.
    1: '<rect x="9.4" y="3" width="5.2" height="26" rx="2.6" />',

    // Anse (entrave à bétail) : une dizaine. Une arche épaisse, à pieds droits
    // — c'est le contraste plein/vide au centre qui la distingue du bâton.
    10: '<path d="M2 29 V15 C2 7 6.4 2.5 12 2.5 C17.6 2.5 22 7 22 15 V29 H16.5 V15'
        + ' C16.5 10.2 14.6 8 12 8 C9.4 8 7.5 10.2 7.5 15 V29 Z" />',

    // Corde enroulée : une centaine. Une VRAIE spirale, échantillonnée point
    // par point — deux arcs de cercle emboîtés donnaient un « C » suivi d'une
    // boucle, qui ne ressemblait à aucune corde. Presque deux tours, du bord
    // vers le centre, avec un pas régulier : c'est ce qui se lit comme un
    // enroulement plutôt que comme un disque.
    100: '<path class="egy-trait egy-spirale" d="M12.0 5.6 L14.3 6.0 L16.4 6.9 L18.3 8.1'
        + ' L19.8 9.7 L21.0 11.6 L21.7 13.7 L21.9 15.8 L21.7 17.9 L21.1 19.9 L20.1 21.7'
        + ' L18.7 23.2 L17.1 24.3 L15.3 25.1 L13.4 25.4 L11.5 25.4 L9.7 24.9 L8.1 24.1'
        + ' L6.6 23.0 L5.5 21.7 L4.7 20.1 L4.3 18.5 L4.2 16.8 L4.5 15.2 L5.1 13.7 L6.0 12.4'
        + ' L7.1 11.3 L8.5 10.5 L9.9 10.0 L11.3 9.9 L12.7 10.0 L14.1 10.5 L15.2 11.2'
        + ' L16.2 12.1 L16.9 13.2 L17.4 14.4 L17.6 15.6 L17.6 16.8 L17.3 17.9 L16.7 18.9'
        + ' L16.0 19.8 L15.2 20.5 L14.2 20.9 L13.2 21.1 L12.2 21.2 L11.3 20.9 L10.4 20.6'
        + ' L9.7 20.0 L9.1 19.3 L8.7 18.6 L8.5 17.8 L8.5 17.0 L8.6 16.3 L8.9 15.6 L9.3 15.1'
        + ' L9.8 14.6 L10.4 14.3" />',

    // Fleur de lotus : un millier. Une tige, deux feuilles à mi-hauteur, et
    // une fleur à trois pétales — le pétale central droit, les deux autres
    // ouverts. Le dessin précédent, deux gros lobes en cœur, se lisait comme
    // un germe de haricot.
    1000: '<path class="egy-trait" d="M12 30.5 C11.3 26 11.4 23 12 19.5" />'
        + '<path d="M11.6 24.4 C8.6 24.2 6.4 22.4 5.6 19.6 C8.6 19.4 10.8 21.2 11.6 24.4 Z" />'
        + '<path d="M12.4 24.4 C13.2 21.2 15.4 19.4 18.4 19.6 C17.6 22.4 15.4 24.2 12.4 24.4 Z" />'
        + '<path d="M12 20 C10.6 15.6 10.6 9.4 12 3.4 C13.4 9.4 13.4 15.6 12 20 Z" />'
        + '<path d="M11.8 20.2 C8.2 17.4 6 12.8 6.2 7.6 C9.6 10 11.4 14.6 11.8 20.2 Z" />'
        + '<path d="M12.2 20.2 C12.6 14.6 14.4 10 17.8 7.6 C18 12.8 15.8 17.4 12.2 20.2 Z" />',

    // Doigt : dix milliers. COUCHÉ, ongle à droite, deux plis de phalange —
    // c'est ainsi qu'il est gravé, et surtout c'est ce qui le distingue d'un
    // coup d'œil du bâton des unités, avec lequel on le confondait quand il
    // était dessiné debout.
    10000: '<path d="M2.8 13.8 L2.8 22.2 C7 22.9 11.4 23.1 15.6 22.6 C19.2 22.2 21.6 20.1 21.6 17'
        + ' C21.6 13.9 19.2 11.8 15.6 12.3 C11.4 12.8 7 13.1 2.8 13.8 Z" />'
        + '<path class="egy-creux" d="M17.2 14 C19.2 14.8 20.2 15.9 20.2 17.2'
        + ' C20.2 18.5 19.2 19.6 17.3 20.4 C18.4 19.4 18.9 18.3 18.9 17.2'
        + ' C18.9 16.1 18.3 14.9 17.2 14 Z" />'
        + '<path class="egy-creux" d="M11.6 12.9 L12.4 22.9 H11.2 L10.4 13.0 Z" />'
        + '<path class="egy-creux" d="M7.2 13.5 L8.0 23.2 H6.8 L6.0 13.7 Z" />'
};

/**
 * @param {Array<{value:number, n:number}>} symboles - déjà triés par valeur décroissante
 */
export function egyptianSvg(symboles) {
    // Un rang par ligne, du plus grand au plus petit. Deux raisons : la
    // figure reste étroite, donc chaque glyphe est rendu plus grand ; et
    // l'élève voit d'un coup d'œil « 2 lotus, 3 anses, 1 bâton », ce qui est
    // exactement le découpage du calcul à faire.
    // Des cases de 44 px : l'exercice consiste à COMPTER des symboles, ce qui
    // suppose de les distinguer sans se pencher. La feuille reste bornée en
    // hauteur par le CSS, qui la réduira si le plateau est court.
    const CELL = 44, GAP = 9, PAD = 12;
    const colonnes = Math.max(...symboles.map(s => s.n));
    const W = colonnes * CELL + (colonnes - 1) * GAP + PAD * 2;
    const H = symboles.length * CELL + (symboles.length - 1) * GAP + PAD * 2;

    // Les tracés sont dessinés dans une case de 24 × 32 ; on les met à
    // l'échelle de la cellule plutôt que de réécrire chaque chemin.
    const echelle = (CELL / 32).toFixed(3);

    const contenu = symboles.map((s, ligne) => {
        const y = PAD + ligne * (CELL + GAP);
        return Array.from({ length: s.n }, (_, i) =>
            `<g class="egy-glyph" transform="translate(${PAD + i * (CELL + GAP)}, ${y}) scale(${echelle})">${GLYPHES[s.value]}</g>`
        ).join('');
    }).join('');

    const description = symboles.map(s => `${s.n} × ${s.value}`).join(', ');
    return `
    <svg class="fig-svg egy-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
         role="img" aria-label="Nombre en hiéroglyphes égyptiens : ${description}">
        ${contenu}
    </svg>`;
}

/** Enveloppe une figure pour qu'elle occupe une largeur stable et centrée. */
export function figure(svg) {
    return `<div class="figure-wrap">${svg}</div>`;
}
