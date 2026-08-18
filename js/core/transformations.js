// LES TRANSFORMATIONS DU PLAN, SUR QUADRILLAGE.
//
// Rémy, sur sa fiche de 4ᵉ : « je suis pour le quadrillage ». Et sur les
// instruments : « il faut les manipuler en vrai, pas à l'ordi ». Le partage est
// juste, et il est déjà celui de sa fiche — la moitié de ses exercices se font
// AUX CARREAUX (symétriques d'une figure, déplacements de quatre cases), et
// l'autre au compas.
//
// AUX CARREAUX, TOUT EST EXACT. Une case est juste ou fausse, il n'y a pas de
// tolérance à régler ni de « c'est presque ça » à trancher — c'est ce qui rend
// l'exercice corrigeable par la machine sans jamais mentir. Au compas, il
// faudrait décider à quelle distance un trait est encore bon ; c'est un débat
// qui n'a pas sa place devant un élève de quatrième.
//
// TROIS TRANSFORMATIONS, ET UNE QUATRIÈME QU'ON NOMME SANS LA CONFONDRE :
//
//   SYMÉTRIE AXIALE    le reflet. L'axe est une droite du quadrillage —
//                      verticale, horizontale — ou une diagonale à 45°. Un axe
//                      oblique quelconque ne tombe pas sur les carreaux : il
//                      appartient au compas, donc au papier.
//   SYMÉTRIE CENTRALE  le demi-tour autour d'un point.
//   TRANSLATION        le glissement, sans tourner ni retourner.
//   ROTATION           le quart de tour. JAMAIS le demi-tour : une rotation de
//                      180° EST une symétrie centrale, et une question qui les
//                      oppose aurait deux bonnes réponses.
//
// LES DEMI-CARREAUX COMPTENT. Un centre de symétrie se pose souvent au MILIEU
// d'une case, et un axe entre deux colonnes : ce sont les cas les plus
// fréquents sur une fiche, et les exclure aurait forcé des figures
// artificielles. Les centres et les axes sont donc des multiples de 0,5, et
// l'on vérifie que l'image retombe sur des entiers.
//
// Le module est pur : ni DOM, ni dessin. Il rend des points, et c'est l'écran
// qui les peint.

/** Les quatre transformations que l'élève doit savoir nommer. */
export const TRANSFORMATIONS = ['axiale', 'centrale', 'translation', 'rotation'];

export const NOMS = {
    axiale: 'symétrie axiale',
    centrale: 'symétrie centrale',
    translation: 'translation',
    rotation: 'rotation'
};

/** Ce qu'elle fait, en une phrase — le vocabulaire de la fiche de Rémy. */
export const GESTES = {
    axiale: 'l\'image miroir',
    centrale: 'un demi-tour',
    translation: 'un déplacement',
    rotation: 'un quart de tour'
};

// --- Les axes ----------------------------------------------------------------
//
// Quatre familles, et quatre seulement. Chacune se décrit par UN nombre :
//
//   { type: 'v', a }   la verticale d'équation x = a
//   { type: 'h', a }   l'horizontale d'équation y = a
//   { type: 'd', a }   la diagonale montante, y = x + a
//   { type: 'a', a }   la diagonale descendante, y = -x + a

export const TYPES_AXE = ['v', 'h', 'd', 'a'];

/** « 3 », « 3,5 » — jamais « 3.5 » : on écrit en français. */
export function ecrireDemi(x) {
    return String(x).replace('.', ',');
}

export function nommerAxe(axe) {
    if (!axe) return '';
    if (axe.type === 'v') return `l'axe vertical x = ${ecrireDemi(axe.a)}`;
    if (axe.type === 'h') return `l'axe horizontal y = ${ecrireDemi(axe.a)}`;
    if (axe.type === 'd') return 'l\'axe oblique montant (à 45°)';
    return 'l\'axe oblique descendant (à 45°)';
}

// --- Les transformations elles-mêmes -----------------------------------------

/** Le symétrique d'un point par rapport à un axe du quadrillage. */
export function parAxe(p, axe) {
    const a = axe.a;
    if (axe.type === 'v') return { x: 2 * a - p.x, y: p.y };
    if (axe.type === 'h') return { x: p.x, y: 2 * a - p.y };
    // y = x + a : on échange les coordonnées, décalées de a.
    if (axe.type === 'd') return { x: p.y - a, y: p.x + a };
    // y = -x + a.
    return { x: a - p.y, y: a - p.x };
}

/** Le symétrique d'un point par rapport à un centre : le demi-tour. */
export function parCentre(p, centre) {
    return { x: 2 * centre.x - p.x, y: 2 * centre.y - p.y };
}

/** Le translaté d'un point : on glisse, on ne tourne pas. */
export function parVecteur(p, v) {
    return { x: p.x + v.x, y: p.y + v.y };
}

/**
 * L'image d'un point par un quart de tour autour d'un centre.
 * `quarts` compte les quarts de tour dans le sens direct.
 */
export function parRotation(p, centre, quarts) {
    let { x, y } = p;
    const n = ((Math.round(quarts) % 4) + 4) % 4;
    for (let i = 0; i < n; i++) {
        const dx = x - centre.x, dy = y - centre.y;
        x = centre.x - dy;
        y = centre.y + dx;
    }
    return { x, y };
}

/**
 * Applique n'importe laquelle des quatre à un point.
 * @param {{genre: string, axe?, centre?, vecteur?, quarts?}} t
 */
export function appliquer(p, t) {
    if (!t) return { ...p };
    if (t.genre === 'axiale') return parAxe(p, t.axe);
    if (t.genre === 'centrale') return parCentre(p, t.centre);
    if (t.genre === 'translation') return parVecteur(p, t.vecteur);
    if (t.genre === 'rotation') return parRotation(p, t.centre, t.quarts);
    return { ...p };
}

/** L'image d'une figure : la liste de ses cases, transformée case par case. */
export function imageFigure(figure, t) {
    return (figure || []).map(p => appliquer(p, t));
}

// --- Comparer des figures -----------------------------------------------------

const cle = (p) => `${p.x}|${p.y}`;

function depuisCle(k) {
    const [x, y] = k.split('|').map(Number);
    return { x, y };
}

/**
 * Deux figures sont-elles la MÊME ? L'ordre des cases ne compte pas : on ne
 * demande pas à l'élève de les poser dans un ordre, on lui demande un dessin.
 */
export function memeFigure(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    const gauche = new Set(a.map(cle));
    if (gauche.size !== a.length) return false;      // doublons : figure mal formée
    return b.every(p => gauche.has(cle(p)));
}

/** Toutes les cases tombent-elles sur le quadrillage (des entiers) ? */
export function surLeQuadrillage(figure) {
    return (figure || []).every(p => Number.isInteger(p.x) && Number.isInteger(p.y));
}

/**
 * Ce qui manque et ce qui est en trop — de quoi corriger sans dire « faux ».
 * @returns {{justes: number, oublies: Array, enTrop: Array}}
 */
export function comparer(attendue, posee) {
    const veut = new Set((attendue || []).map(cle));
    const mis = new Set((posee || []).map(cle));
    return {
        justes: [...mis].filter(k => veut.has(k)).length,
        oublies: [...veut].filter(k => !mis.has(k)).map(depuisCle),
        enTrop: [...mis].filter(k => !veut.has(k)).map(depuisCle)
    };
}

// --- Reconnaître la transformation entre deux pièces --------------------------
//
// C'est l'exercice 9 de la fiche — le damier — généralisé à n'importe quel
// pavage : « la pièce 7 est l'image de la pièce 3 par quelle transformation ? »
//
// On ne devine pas : on ESSAIE. Les candidates se déduisent des figures
// elles-mêmes — le vecteur, c'est l'écart des centres ; le centre de symétrie,
// leur milieu ; les axes passent par ce milieu. Chercher au hasard aurait été
// un piège à cas particuliers.

function demiEntier(x) {
    return Number.isInteger(2 * x);
}

/**
 * Le centre de gravité d'une figure — EXACT, sans arrondi.
 *
 * L'arrondir au demi-carreau paraissait raisonnable (c'est la précision des
 * centres et des axes) et rendait la recherche aveugle : le centre du L vaut
 * 1,25 ; arrondi à 1,5, le milieu des deux centres tombait à 4,25 au lieu de
 * 4, et l'on rejetait la symétrie qu'on cherchait. Ce sont les CANDIDATES
 * qu'on filtre ensuite sur les demi-carreaux, pas les mesures qui les
 * produisent.
 */
export function centreDe(figure) {
    const n = (figure || []).length;
    if (!n) return { x: 0, y: 0 };
    return {
        x: figure.reduce((s, p) => s + p.x, 0) / n,
        y: figure.reduce((s, p) => s + p.y, 0) / n
    };
}

/**
 * Le centre d'un quart de tour n'est pas le milieu des deux figures : on le
 * cherche dans le voisinage, en demi-carreaux, du plus proche au plus loin —
 * il est presque toujours à un ou deux carreaux.
 */
function centresPossibles(ca, cb) {
    const out = [];
    // LE BALAYAGE EST ANCRÉ SUR LES DEMI-CARREAUX, pas sur le milieu.
    //
    // Parti du milieu exact des deux centres — 1,75 pour le L tourné d'un quart
    // de tour — un pas de 0,5 ne rencontrait que 2,25, 2,75, 3,25… et jamais 3,
    // qui était pourtant le centre cherché. On ne trouvait donc AUCUNE rotation,
    // et rien ne le disait : la liste rendue était simplement vide.
    const mx = Math.round((ca.x + cb.x)) / 2;
    const my = Math.round((ca.y + cb.y)) / 2;
    const R = 6;
    for (let dx = -R; dx <= R; dx += 0.5) {
        for (let dy = -R; dy <= R; dy += 0.5) {
            out.push({ x: mx + dx, y: my + dy, d: Math.abs(dx) + Math.abs(dy) });
        }
    }
    out.sort((p, q) => p.d - q.d);
    return out.map(({ x, y }) => ({ x, y }));
}

/**
 * TOUTES les transformations qui mènent de `depart` à `arrivee`.
 *
 * Il peut y en avoir plusieurs, et c'est une propriété du problème et non un
 * défaut : deux carrés voisins sont l'image l'un de l'autre par une
 * translation ET par une symétrie. C'est précisément ce que le générateur doit
 * savoir pour ÉCARTER les questions à deux réponses.
 *
 * @param {Array} depart
 * @param {Array} arrivee
 * @param {{quarts?: boolean}} [options]
 * @returns {Array} les transformations trouvées
 */
export function transfosEntre(depart, arrivee, options = {}) {
    const out = [];
    if (!depart || !arrivee || depart.length !== arrivee.length || !depart.length) return out;

    const ca = centreDe(depart), cb = centreDe(arrivee);
    const marche = (t) => memeFigure(imageFigure(depart, t), arrivee);

    // La translation : un seul candidat, l'écart des centres.
    const v = { x: cb.x - ca.x, y: cb.y - ca.y };
    if (Number.isInteger(v.x) && Number.isInteger(v.y)) {
        const t = { genre: 'translation', vecteur: v };
        if (marche(t)) out.push(t);
    }

    // La symétrie centrale : un seul candidat, le milieu des deux centres.
    const mil = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
    if (demiEntier(mil.x) && demiEntier(mil.y)) {
        const t = { genre: 'centrale', centre: mil };
        if (marche(t)) out.push(t);
    }

    // Les axes : quatre familles, chacune passant par le milieu.
    [
        { type: 'v', a: mil.x },
        { type: 'h', a: mil.y },
        { type: 'd', a: mil.y - mil.x },      // y = x + a
        { type: 'a', a: mil.y + mil.x }       // y = -x + a
    ].forEach(axe => {
        if (!demiEntier(axe.a)) return;
        const t = { genre: 'axiale', axe };
        if (marche(t)) out.push(t);
    });

    // Les quarts de tour, dans les deux sens.
    if (options.quarts !== false) {
        for (const quarts of [1, 3]) {
            for (const c of centresPossibles(ca, cb)) {
                const t = { genre: 'rotation', centre: c, quarts };
                if (marche(t)) { out.push(t); break; }
            }
        }
    }

    return out;
}

/**
 * LA QUESTION A-T-ELLE UNE SEULE RÉPONSE ?
 *
 * Une figure qui a elle-même des symétries brouille tout : un carré translaté
 * est aussi un carré réfléchi. Le générateur ne garde une paire que si un seul
 * GENRE de transformation la relie — sinon l'élève a raison quoi qu'il réponde,
 * et la correction lui donne tort.
 */
export function genresEntre(depart, arrivee, options) {
    return [...new Set(transfosEntre(depart, arrivee, options).map(t => t.genre))];
}

// --- Le dire ------------------------------------------------------------------

/**
 * « 4 carreaux vers la droite et 3 vers le bas » — les mots de la fiche.
 *
 * L'ordonnée DESCEND, comme sur une grille qu'on lit de haut en bas : un `y`
 * positif va vers le bas. C'est le seul endroit du module qui le sait, et c'est
 * voulu — les mathématiques ne changent pas, seule la phrase change.
 */
export function direVecteur(v) {
    const bouts = [];
    if (v.x) bouts.push(`${Math.abs(v.x)} carreau${Math.abs(v.x) > 1 ? 'x' : ''} vers la ${v.x > 0 ? 'droite' : 'gauche'}`);
    if (v.y) bouts.push(`${Math.abs(v.y)} vers le ${v.y > 0 ? 'bas' : 'haut'}`);
    return bouts.length ? bouts.join(' et ') : 'aucun déplacement';
}

/** La transformation, telle qu'on l'écrit dans une consigne ou une correction. */
export function decrire(t) {
    if (!t) return '';
    if (t.genre === 'axiale') return `la symétrie par rapport à ${nommerAxe(t.axe)}`;
    if (t.genre === 'centrale') {
        return `la symétrie de centre (${ecrireDemi(t.centre.x)} ; ${ecrireDemi(t.centre.y)})`;
    }
    if (t.genre === 'translation') return `la translation de ${direVecteur(t.vecteur)}`;
    if (t.genre === 'rotation') {
        return `le quart de tour ${t.quarts === 1 ? 'vers la gauche' : 'vers la droite'}`
            + ` autour de (${ecrireDemi(t.centre.x)} ; ${ecrireDemi(t.centre.y)})`;
    }
    return '';
}
