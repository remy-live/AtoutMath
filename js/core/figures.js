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
/**
 * LES SEPT HIÉROGLYPHES, DESSINÉS PAR RÉMY.
 *
 * Ils ne sont pas redessinés à la main dans le code : ce sont ses tracés,
 * exportés depuis son dessin (`icons/hieroglyphes-source.svg`) et simplement
 * remis à l'échelle d'une case de 24 × 32. UNE SEULE échelle pour les sept,
 * pas une par glyphe : il les a dessinés à la bonne taille les uns par rapport
 * aux autres, et un bâton normalisé à la hauteur d'un têtard n'est plus un
 * bâton — c'est un mât.
 *
 * Chaque tracé garde son propre `fill` et son propre trait ; la couleur passe
 * par `currentColor`, que le thème fixe. Pour retoucher un glyphe, on retouche
 * le dessin et on ré-exporte : le fichier source est là pour ça.
 */
export const GLYPHES = {
    //  Le bâton : une unité. Un trait, rien de plus — et c'est ce qui le rend
    //  reconnaissable à côté de tous les autres.
    1: '<g transform="translate(-518.52 -650.92) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10493,12904 C 10493,13018 10493,13302 10493,13415 10493,13425 10444,13425 10444,13415 10444,13302 10444,13018 10444,12904 10444,12895 10493,12895 10493,12904 Z "/></g>',

    //  L'anse (l'entrave à bétail) : une dizaine. Une arche à pieds droits,
    //  avec les deux œillets de la corde.
    10: '<g transform="translate(-521.11 -712.59) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10657,14239 C 10649,14239 10644,14245 10644,14252 10644,14259 10649,14264 10657,14264 10664,14264 10669,14259 10669,14252 10669,14245 10664,14239 10657,14239 Z M 10395,14252 C 10395,14245 10390,14239 10383,14239 10376,14239 10370,14245 10370,14252 10370,14259 10376,14264 10383,14264 10390,14264 10395,14259 10395,14252 Z M 10395,14629 C 10395,14637 10370,14637 10370,14629 L 10370,14286 C 10355,14281 10345,14268 10345,14252 10345,14235 10355,14222 10370,14217 L 10370,14191 C 10370,14137 10464,14118 10520,14118 10576,14118 10669,14137 10669,14191 L 10669,14217 C 10684,14222 10694,14235 10694,14252 10694,14268 10684,14281 10669,14286 L 10669,14629 C 10669,14637 10644,14637 10644,14629 L 10644,14286 C 10630,14281 10619,14268 10619,14252 10619,14235 10630,14222 10644,14217 L 10644,14215 C 10644,14167 10568,14142 10520,14142 10472,14142 10395,14168 10395,14215 L 10395,14217 C 10409,14222 10420,14235 10420,14252 10420,14268 10409,14281 10395,14286 L 10395,14629 Z M 10669,14252 L 10669,14254 C 10669,14253 10670,14252 10670,14252 10670,14252 10669,14251 10669,14250 L 10669,14252 Z M 10395,14252 L 10395,14253 10395,14252 C 10395,14251 10395,14251 10395,14250 L 10395,14252 Z "/></g>',

    //  La corde enroulée : une centaine. La spirale part du centre et se
    //  déroule en une longue queue — c'est bien une corde qu'on enroule.
    100: '<g transform="translate(-520.27 -747.86) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10503,14896 C 10509,14903 10517,14950 10529,14956 10537,14960 10547,14960 10556,14956 10568,14950 10578,14938 10583,14926 10589,14907 10589,14885 10583,14867 10578,14854 10567,14843 10556,14837 10549,14833 10502,14808 10447,14867 10435,14885 10424,14905 10419,14926 10417,14936 10417,14946 10419,14956 10424,14977 10435,14997 10447,15014 10462,15037 10487,15052 10503,15074 10514,15092 10522,15112 10529,15133 10542,15171 10551,15211 10555,15251 10559,15280 10555,15311 10555,15340 10555,15350 10528,15350 10528,15340 10528,15311 10532,15280 10528,15251 10524,15211 10515,15171 10503,15133 10495,15112 10487,15092 10475,15074 10460,15052 10434,15037 10419,15014 10407,14997 10396,14977 10392,14956 10389,14946 10389,14936 10392,14926 10418,14837 10451,14818 10475,14808 10500,14796 10531,14796 10556,14808 10580,14818 10601,14841 10611,14867 10618,14885 10618,14907 10611,14926 10600,14951 10580,14974 10556,14985 10547,14989 10537,14989 10529,14985 10505,14974 10485,14951 10475,14926 10471,14917 10469,14903 10475,14896 10481,14889 10496,14889 10503,14896 Z "/> <path fill="none" stroke="currentColor" d="M 10503,14896 C 10509,14903 10517,14950 10529,14956 10537,14960 10547,14960 10556,14956 10568,14950 10578,14938 10583,14926 10589,14907 10589,14885 10583,14867 10578,14854 10567,14843 10556,14837 10549,14833 10502,14808 10447,14867 10435,14885 10424,14905 10419,14926 10417,14936 10417,14946 10419,14956 10424,14977 10435,14997 10447,15014 10462,15037 10487,15052 10503,15074 10514,15092 10522,15112 10529,15133 10542,15171 10551,15211 10555,15251 10559,15280 10555,15311 10555,15340 10555,15350 10528,15350 10528,15340 10528,15311 10532,15280 10528,15251 10524,15211 10515,15171 10503,15133 10495,15112 10487,15092 10475,15074 10460,15052 10434,15037 10419,15014 10407,14997 10396,14977 10392,14956 10389,14946 10389,14936 10392,14926 10418,14837 10451,14818 10475,14808 10500,14796 10531,14796 10556,14808 10580,14818 10601,14841 10611,14867 10618,14885 10618,14907 10611,14926 10600,14951 10580,14974 10556,14985 10547,14989 10537,14989 10529,14985 10505,14974 10485,14951 10475,14926 10471,14917 10469,14903 10475,14896 10481,14889 10496,14889 10503,14896 Z "/></g>',

    //  La fleur de lotus : un millier. La fleur en haut, la tige, et la base
    //  évasée.
    1000: '<g transform="translate(-519.61 -681.09) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10575,13652 C 10556,13670 10530,13682 10501,13684 L 10501,13923 10544,13898 10555,13918 10518,13942 C 10571,13953 10609,13996 10609,14051 L 10599,14051 10587,14051 10393,14051 10383,14051 10372,14051 C 10372,13996 10410,13953 10463,13942 L 10426,13918 10436,13898 10479,13923 10479,13684 C 10418,13679 10372,13633 10372,13572 10372,13508 10423,13460 10491,13460 10524,13460 10553,13472 10575,13492 L 10560,13507 10491,13572 10560,13637 10575,13652 Z M 10491,13480 C 10435,13480 10393,13520 10393,13572 10393,13624 10435,13664 10491,13664 10509,13664 10527,13659 10542,13651 L 10458,13572 10542,13493 C 10527,13485 10509,13480 10491,13480 Z M 10491,13959 C 10443,13959 10405,13989 10396,14030 L 10585,14030 C 10576,13989 10538,13959 10491,13959 Z "/></g>',

    //  Le doigt : dix milliers. Dressé, légèrement recourbé, avec son ongle —
    //  c'est l'ongle qui le distingue du bâton d'un coup d'œil.
    10000: '<g transform="translate(-519.79 -789.52) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10503,15893 L 10503,16179 10503,16181 10569,16179 10573,16016 10573,15940 10571,15864 C 10571,15864 10553,15816 10542,15790 10537,15780 10524,15753 10524,15753 L 10510,15725 10495,15701 10479,15679 10459,15657 10436,15636 10427,15656 10437,15742 10442,15750 10496,15836 10497,15840 10499,15843 10503,15893 Z "/><path class="egy-creux" stroke="none" d="M 10476,15685 C 10476,15685 10471,15687 10468,15687 10447,15687 10431,15670 10431,15670 L 10429,15662 10427,15653 C 10427,15653 10428,15633 10441,15622 10447,15632 10460,15653 10460,15653 L 10470,15667 10472,15671 10472,15672 10473,15674 10474,15678 10476,15685 Z "/> <path fill="none" stroke="currentColor" stroke-width="25" stroke-linejoin="round" d="M 10476,15685 C 10476,15685 10471,15687 10468,15687 10447,15687 10431,15670 10431,15670 L 10429,15662 10427,15653 C 10427,15653 10428,15633 10441,15622 10447,15632 10460,15653 10460,15653 L 10470,15667 10472,15671 10472,15672 10473,15674 10474,15678 10476,15685 Z "/></g>',

    //  Le têtard : cent milliers. Le Nil en charriait par milliers après la
    //  crue ; c'est de là que vient le symbole.
    100000: '<g transform="translate(-523.14 -817.99) scale(0.05068)"><path fill="currentColor" stroke="none" d="M 10425,16193 C 10401,16194 10364,16216 10363,16243 10362,16275 10412,16304 10425,16322 10438,16339 10456,16351 10447,16370 10440,16386 10440,16414 10458,16445 10477,16476 10497,16475 10497,16475 10497,16475 10491,16484 10494,16490 10496,16496 10499,16503 10514,16503 10526,16503 10668,16502 10668,16502 10671,16505 10695,16537 10703,16570 10712,16608 10717,16657 10724,16678 10734,16706 10758,16724 10756,16720 10759,16554 10735,16518 10712,16473 10689,16428 10680,16428 10666,16390 10651,16352 10637,16337 10617,16323 10597,16308 10549,16294 10528,16267 10507,16238 10515,16241 10491,16219 10467,16196 10449,16193 10425,16193 Z M 10429,16206 C 10448,16206 10465,16211 10486,16231 10505,16250 10507,16257 10527,16281 10545,16302 10585,16316 10603,16330 10622,16343 10635,16351 10650,16385 10663,16413 10675,16429 10696,16470 10718,16512 10747,16538 10745,16690 10743,16689 10731,16670 10728,16644 10726,16622 10718,16577 10708,16550 10699,16523 10678,16496 10674,16490 L 10674,16489 10673,16488 C 10666,16478 10641,16451 10641,16451 10641,16451 10637,16445 10633,16449 10629,16454 10640,16466 10658,16489 10637,16490 10533,16491 10523,16491 10509,16491 10507,16492 10505,16486 10503,16483 10504,16481 10505,16480 10514,16480 10570,16480 10584,16479 10600,16479 10606,16482 10606,16473 10605,16465 10593,16464 10582,16456 10570,16449 10556,16436 10551,16421 10543,16400 10551,16386 10557,16382 10564,16378 10569,16368 10565,16363 10561,16359 10556,16364 10546,16376 10536,16387 10527,16409 10540,16431 10547,16446 10573,16467 10573,16467 10573,16467 10512,16468 10506,16465 10506,16465 10489,16465 10470,16439 10449,16410 10451,16382 10458,16368 10466,16349 10447,16329 10435,16313 10431,16307 10422,16300 10411,16292 10412,16291 10412,16290 10415,16286 10420,16280 10429,16276 10424,16272 10421,16269 10412,16275 10400,16282 10390,16272 10376,16257 10376,16244 10377,16219 10410,16206 10429,16206 Z "/> <path fill="none" stroke="currentColor" stroke-width="11" stroke-linejoin="miter" d="M 10425,16193 C 10401,16194 10364,16216 10363,16243 10362,16275 10412,16304 10425,16322 10438,16339 10456,16351 10447,16370 10440,16386 10440,16414 10458,16445 10477,16476 10497,16475 10497,16475 10497,16475 10491,16484 10494,16490 10496,16496 10499,16503 10514,16503 10526,16503 10668,16502 10668,16502 10671,16505 10695,16537 10703,16570 10712,16608 10717,16657 10724,16678 10734,16706 10758,16724 10756,16720 10759,16554 10735,16518 10712,16473 10689,16428 10680,16428 10666,16390 10651,16352 10637,16337 10617,16323 10597,16308 10549,16294 10528,16267 10507,16238 10515,16241 10491,16219 10467,16196 10449,16193 10425,16193 Z "/> <path fill="none" stroke="currentColor" stroke-width="11" stroke-linejoin="miter" d="M 10429,16206 C 10448,16206 10465,16211 10486,16231 10505,16250 10507,16257 10527,16281 10545,16302 10585,16316 10603,16330 10622,16343 10635,16351 10650,16385 10663,16413 10675,16429 10696,16470 10718,16512 10747,16538 10745,16690 10743,16689 10731,16670 10728,16644 10726,16622 10718,16577 10708,16550 10699,16523 10678,16496 10674,16490 L 10674,16489 10673,16488 C 10666,16478 10641,16451 10641,16451 10641,16451 10637,16445 10633,16449 10629,16454 10640,16466 10658,16489 10637,16490 10533,16491 10523,16491 10509,16491 10507,16492 10505,16486 10503,16483 10504,16481 10505,16480 10514,16480 10570,16480 10584,16479 10600,16479 10606,16482 10606,16473 10605,16465 10593,16464 10582,16456 10570,16449 10556,16436 10551,16421 10543,16400 10551,16386 10557,16382 10564,16378 10569,16368 10565,16363 10561,16359 10556,16364 10546,16376 10536,16387 10527,16409 10540,16431 10547,16446 10573,16467 10573,16467 10573,16467 10512,16468 10506,16465 10506,16465 10489,16465 10470,16439 10449,16410 10451,16382 10458,16368 10466,16349 10447,16329 10435,16313 10431,16307 10422,16300 10411,16292 10412,16291 10412,16290 10415,16286 10420,16280 10429,16276 10424,16272 10421,16269 10412,16275 10400,16282 10390,16272 10376,16257 10376,16244 10377,16219 10410,16206 10429,16206 Z "/></g>',

    //  Le dieu Heh, bras levés : un million. Il tient les années dans ses mains
    //  — l'infini des Égyptiens.
    1000000: '<g transform="translate(-523.41 -850.96) scale(0.05068)"><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10594,16973 C 10580,16973 10566,16993 10554,16984 10542,16975 10514,16973 10528,16952 10536,16938 10552,16932 10568,16930 10582,16930 10594,16936 10608,16941 10625,16949 10627,16965 10628,16979 10628,16994 10635,17012 10615,17024 10606,17028 10580,17051 10579,17024 10579,17007 10589,16995 10592,16981 L 10598,16972 10594,16973 Z "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10531,16969 C 10519,16978 10500,16992 10512,17007 10531,17034 10561,17019 10545,17047 10537,17060 10518,17054 10503,17054 10490,17054 10425,17063 10428,17037 10429,17021 10425,17008 10421,16994 10418,16980 10425,16931 10414,16952 10393,16989 10401,16936 10403,16922 10408,16902 10408,16906 10402,16903 10387,16915 10383,16934 10386,16948 10387,16963 10393,16976 10395,16991 10398,17006 10393,17021 10394,17036 10397,17051 10385,17071 10408,17075 10425,17082 10485,17074 10499,17080 10512,17085 10533,17094 10539,17107 10549,17126 10541,17138 10543,17153 10545,17168 10546,17181 10546,17196 10542,17235 10563,17231 10578,17220 10589,17212 10604,17208 10618,17206 10633,17205 10641,17188 10637,17173 10635,17158 10631,17098 10637,17085 10646,17071 10666,17082 10681,17081 10696,17080 10712,17082 10728,17081 10738,17080 10746,17087 10758,17067 10754,17053 10756,17034 10757,17019 10758,17005 10754,16987 10754,16973 10754,16957 10746,16893 10735,16910 10727,16922 10749,16965 10739,16954 10720,16932 10704,16929 10731,16976 10731,16989 10734,17004 10732,17018 10729,17032 10734,17054 10713,17054 L 10670,17054 C 10656,17054 10592,17062 10596,17037 L 10598,17028 "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10635,17200 C 10654,17211 10651,17224 10652,17238 10655,17251 10657,17275 10633,17273 10619,17271 10524,17289 10514,17301 10514,17301 10497,17309 10494,17323 "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10552,17227 C 10546,17216 10520,17234 10511,17219 10501,17204 10446,17180 10433,17179 10420,17177 10400,17167 10397,17190 10396,17205 10401,17219 10403,17234 10405,17249 10410,17263 10413,17278 10416,17292 10417,17307 10412,17321 10405,17339 10373,17330 10372,17350 10393,17370 10425,17360 10447,17353 10446,17338 10437,17322 10442,17310 10452,17294 10454,17280 10453,17265 10453,17251 10438,17230 10449,17223 10464,17214 10516,17273 10531,17256 10531,17256 10556,17238 10552,17227 Z "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10446,17307 C 10445,17286 10520,17260 10520,17260 "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10443,17355 C 10456,17361 10472,17370 10487,17366 10553,17335 10600,17333 10612,17323 10622,17314 10641,17311 10642,17333 10644,17354 10597,17351 10635,17362 10654,17369 10660,17344 10665,17331 10671,17318 10682,17304 10675,17288 L 10661,17276 10648,17269 "/><path fill="none" stroke="currentColor" stroke-width="30" stroke-linejoin="round" d="M 10566,16930 C 10565,16915 10564,16902 10566,16887 10567,16874 10560,16842 10581,16849 10605,16857 10579,16864 10578,16908 L 10578,16922 10579,16930 "/></g>'
};

/**
 * @param {Array<{value:number, n:number}>} symboles - déjà triés par valeur décroissante
 */
/**
 * LA PLACE DE CHAQUE HIÉROGLYPHE, en cases.
 *
 * Les symboles s'écrivent À LA SUITE, comme des caractères — parce que c'est
 * ce qu'ils sont. On mettait un rang par ligne : deux lotus, retour à la
 * ligne, trois anses, retour à la ligne… Cela donnait au nombre l'allure d'un
 * tableau de numération, c'est-à-dire exactement la chose que ce système n'a
 * pas : un hiéroglyphe vaut ce qu'il vaut, où qu'il soit posé, et c'est toute
 * la leçon.
 *
 * Le groupement reste visible sans retour à la ligne : un blanc plus large
 * entre deux valeurs différentes. On lit toujours « deux lotus, trois anses,
 * un bâton » — le découpage du calcul — mais sur une ligne.
 *
 * Les positions sont en CASES (1 = une case pleine), à charge de l'appelant de
 * les multiplier par la taille qu'il donne à une case.
 *
 * @param {Array<{value:number, n:number}>} symboles - du plus fort au plus faible
 * @param {Object} [o]
 * @param {number} [o.gap]        - blanc entre deux symboles de même valeur
 * @param {number} [o.gapGroupe]  - blanc entre deux valeurs différentes
 * @param {number} [o.maxParLigne]
 * @returns {{cases: Array<{value:number, col:number, ligne:number}>,
 *            lignes:number, largeur:number}}
 */
export function placerGlyphes(symboles, o = {}) {
    // ON AVANCE DE LA LARGEUR DU DESSIN, PAS DE CELLE DE LA CASE. Les tracés
    // sont cadrés dans une boîte de 24 sur 32 : avancer d'une case entière
    // laissait un quart de blanc à droite de CHAQUE signe, avant même d'ajouter
    // l'écart. Rémy : « colle les caractères, il y a trop d'espaces ». Le pas
    // vaut donc 24/32, et l'écart qui s'y ajoute est celui d'une écriture
    // serrée — les hiéroglyphes se touchent presque, comme sur une stèle.
    const PAS = o.pas ?? 0.75;
    const gap = o.gap ?? 0.05;
    const gapGroupe = o.gapGroupe ?? 0.28;
    const maxParLigne = o.maxParLigne ?? 12;

    const suite = [];
    (symboles || []).forEach((s, rang) => {
        for (let i = 0; i < s.n; i++) {
            suite.push({ value: s.value, avant: i === 0 && rang > 0 ? gapGroupe : gap });
        }
    });

    const cases = [];
    let ligne = 0, col = 0, dansLaLigne = 0, largeur = 0;
    suite.forEach((g) => {
        if (dansLaLigne >= maxParLigne) { ligne++; col = 0; dansLaLigne = 0; }
        if (dansLaLigne > 0) col += g.avant;
        cases.push({ value: g.value, col, ligne });
        // La dernière case compte sa largeur PLEINE : c'est elle qui borne le
        // dessin, et un cadre trop court rognerait le dernier signe.
        col += PAS;
        largeur = Math.max(largeur, col);
        dansLaLigne++;
    });
    return { cases, lignes: Math.max(1, ligne + 1), largeur: Math.max(1, largeur) };
}

export function egyptianSvg(symboles) {
    // Des cases de 44 px : l'exercice consiste à COMPTER des symboles, ce qui
    // suppose de les distinguer sans se pencher. La feuille reste bornée en
    // hauteur par le CSS, qui la réduira si le plateau est court.
    const CELL = 44, PAD = 12, INTERLIGNE = 0.16;
    const plan = placerGlyphes(symboles);
    const W = plan.largeur * CELL + PAD * 2;
    const H = (plan.lignes + (plan.lignes - 1) * INTERLIGNE) * CELL + PAD * 2;

    // Les tracés sont dessinés dans une case de 24 × 32 ; on les met à
    // l'échelle de la cellule plutôt que de réécrire chaque chemin.
    const echelle = (CELL / 32).toFixed(3);
    const contenu = plan.cases.map(c => {
        const x = PAD + c.col * CELL;
        const y = PAD + c.ligne * (1 + INTERLIGNE) * CELL;
        return `<g class="egy-glyph" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${echelle})">${GLYPHES[c.value]}</g>`;
    }).join('');

    const description = (symboles || []).map(s => `${s.n} × ${s.value}`).join(', ');
    return `
    <svg class="fig-svg egy-svg" viewBox="0 0 ${+W.toFixed(1)} ${+H.toFixed(1)}" width="${+W.toFixed(1)}" height="${+H.toFixed(1)}"
         role="img" aria-label="Nombre en hiéroglyphes égyptiens : ${description}">
        ${contenu}
    </svg>`;
}

/** Enveloppe une figure pour qu'elle occupe une largeur stable et centrée. */
export function figure(svg) {
    return `<div class="figure-wrap">${svg}</div>`;
}
