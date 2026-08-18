// LE QUADRILLAGE DESSINÉ : figures coloriées, axe, centre, vecteur.
//
// Un seul dessin sert trois usages, et c'est voulu : l'énoncé de l'écran, la
// grille cliquable de l'activité, et la figure imprimée sur la feuille. Les
// trois doivent montrer EXACTEMENT la même chose — un axe qui se déplacerait
// d'un demi-carreau entre l'écran et le papier rendrait la correction fausse
// sans que personne ne comprenne pourquoi.
//
// DEUX SYSTÈMES DE COORDONNÉES, ET UN SEUL ENDROIT QUI LES RELIE.
//
// Le noyau (`core/transformations.js`) travaille en COORDONNÉES DE CASE : la
// case de la colonne 3, ligne 2, c'est le point (3 ; 2). C'est le système qui
// rend les calculs exacts — une case est juste ou fausse, il n'y a rien à
// arrondir.
//
// Le dessin, lui, a besoin du CENTRE de la case : la case (3 ; 2) occupe le
// carré allant de (3 ; 2) à (4 ; 3), et son centre est en (3,5 ; 2,5). Un axe
// d'équation x = 3 en coordonnées de case passe donc, sur le papier, par la
// verticale d'abscisse 3,5.
//
// Ce demi-carreau d'écart est la seule subtilité du module, il est ici et
// nulle part ailleurs : `versDessin`. Tout le reste en découle.

/** Du repère des cases à celui du dessin : le centre de la case. */
export const versDessin = (v) => v + 0.5;

const COTE = 30;        // pixels par carreau
const MARGE = 6;        // pour que les traits du bord ne soient pas rognés

/**
 * L'équation, en coordonnées de DESSIN, de la droite qui porte un axe.
 * Rendue à part pour être testable sans DOM : c'est elle qui porte le
 * demi-carreau, donc c'est elle qu'il faut pouvoir vérifier.
 *
 * @returns {{a: number, b: number, verticale: boolean}} y = a·x + b,
 *   ou x = b si `verticale`.
 */
export function droiteDeLAxe(axe) {
    if (!axe) return null;
    if (axe.type === 'v') return { verticale: true, a: 0, b: versDessin(axe.a) };
    if (axe.type === 'h') return { verticale: false, a: 0, b: versDessin(axe.a) };
    // y = x + a en cases : les deux demi-carreaux se compensent.
    if (axe.type === 'd') return { verticale: false, a: 1, b: axe.a };
    // y = −x + a en cases : ils s'ajoutent.
    return { verticale: false, a: -1, b: axe.a + 1 };
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * La case d'une figure la plus proche de son centre de gravité.
 *
 * Le centre de gravité lui-même ne convient pas : pour un L ou un U, il tombe
 * DANS LE CREUX, donc en dehors de la pièce — et la lettre irait s'écrire sur
 * la voisine. On prend donc la case réelle la plus proche.
 */
export function caseCentrale(cases) {
    const n = cases.length;
    const cx = cases.reduce((s, p) => s + p.x, 0) / n;
    const cy = cases.reduce((s, p) => s + p.y, 0) / n;
    return cases.reduce((meilleure, p) => {
        const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        const dm = (meilleure.x - cx) ** 2 + (meilleure.y - cy) ** 2;
        return d < dm ? p : meilleure;
    }, cases[0]);
}

/**
 * Le quadrillage complet.
 *
 * @param {Object} cfg
 * @param {number} cfg.largeur           - nombre de colonnes
 * @param {number} cfg.hauteur           - nombre de lignes
 * @param {Array<{cases: Array, classe: string, etiquette?: string}>} [cfg.figures]
 * @param {Object} [cfg.transfo]         - la transformation à MONTRER (axe, centre, vecteur)
 * @param {{x: number, y: number}} [cfg.ancre] - d'où part la flèche d'une translation
 * @param {boolean} [cfg.interactive]    - une cible cliquable par case
 * @param {number} [cfg.cote]            - pixels par carreau
 * @param {string} [cfg.prefixe]         - pour que deux dessins d'une même page
 *                                         n'aient pas le même id de flèche
 * @returns {string}
 */
export function quadrillageSvg(cfg = {}) {
    const L = Math.max(1, cfg.largeur || 10);
    const H = Math.max(1, cfg.hauteur || 10);
    const u = cfg.cote || COTE;
    const p = cfg.prefixe || 'qd';
    const W = L * u + MARGE * 2;
    const Ht = H * u + MARGE * 2;
    const px = (v) => (MARGE + v * u).toFixed(2);

    const parts = [];

    // Le quadrillage. Les traits sont ceux du cahier : ils portent la figure
    // sans la concurrencer.
    for (let i = 0; i <= L; i++) {
        parts.push(`<line class="qd-grille" x1="${px(i)}" y1="${px(0)}" x2="${px(i)}" y2="${px(H)}"/>`);
    }
    for (let j = 0; j <= H; j++) {
        parts.push(`<line class="qd-grille" x1="${px(0)}" y1="${px(j)}" x2="${px(L)}" y2="${px(j)}"/>`);
    }

    // Les figures, sous la transformation : un axe passant sur une case doit
    // rester visible.
    (cfg.figures || []).forEach((f, n) => {
        (f.cases || []).forEach(c => {
            parts.push(`<rect class="qd-case ${f.classe || ''}" x="${px(c.x)}" y="${px(c.y)}"
                width="${u}" height="${u}"/>`);
        });
        // L'ÉTIQUETTE SE POSE AU MILIEU DE LA PIÈCE, pas sur sa première case.
        // Sur un pavage, la première case est souvent un bout de bras : la
        // lettre se retrouvait au bord, collée à la pièce voisine, et l'on ne
        // savait plus laquelle des deux elle nommait.
        if (f.etiquette && (f.cases || []).length) {
            const c = caseCentrale(f.cases);
            parts.push(`<text class="qd-etiquette" x="${px(c.x + 0.5)}" y="${px(c.y + 0.5)}"
                text-anchor="middle" dominant-baseline="central">${esc(f.etiquette)}</text>`);
        }
        void n;
    });

    // LES MARQUES SONT GROUPÉES, et le groupe a un nom : l'activité colorie
    // par-dessus les figures mais SOUS l'axe, sinon la case posée sur l'axe le
    // masquerait — et c'est justement celle-là qu'on regarde.
    const marques = marquesDeLaTransfo(cfg.transfo, { L, H, px, u, p, ancre: cfg.ancre });
    if (marques.length) parts.push(`<g class="qd-marques">${marques.join('\n            ')}</g>`);

    // Les cibles cliquables passent EN DERNIER : posées avant, les rectangles
    // des figures les auraient recouvertes et la moitié de la grille aurait
    // cessé de répondre.
    if (cfg.interactive) {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < L; x++) {
                parts.push(`<rect class="qd-hit" data-c="${x},${y}" x="${px(x)}" y="${px(y)}"
                    width="${u}" height="${u}" tabindex="0" role="button"
                    aria-label="Colonne ${x + 1}, ligne ${y + 1}"/>`);
            }
        }
    }

    return `
    <svg class="qd-svg" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}"
         role="img" aria-label="Quadrillage de ${L} sur ${H} carreaux">
        <defs>
            <clipPath id="${p}-clip"><rect x="${px(0)}" y="${px(0)}" width="${L * u}" height="${H * u}"/></clipPath>
            <!-- LA POINTE EST ROUGE EN DUR, et non héritée de la couleur
                 courante : un marqueur est dessiné dans le contexte de sa
                 DÉFINITION, pas dans celui du trait qui l'utilise. La couleur
                 courante y valait celle du SVG — du noir —, et la flèche du
                 vecteur se terminait par une pointe noire sur un trait rouge. -->
            <marker id="${p}-fleche" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/>
            </marker>
        </defs>
        ${parts.join('\n        ')}
    </svg>`;
}

/** L'axe, le centre ou le vecteur — ce que l'énoncé DONNE, en rouge. */
function marquesDeLaTransfo(t, { L, H, px, u, p, ancre }) {
    const out = [];
    if (!t) return out;

    if (t.genre === 'axiale' && t.axe) {
        const d = droiteDeLAxe(t.axe);
        // La droite est tracée large et RABOTÉE au quadrillage : calculer les
        // deux intersections à la main aurait fait quatre cas de plus, et une
        // diagonale qui sort d'un carreau ne se voit pas.
        const grand = Math.max(L, H) + 4;
        const [x1, y1, x2, y2] = d.verticale
            ? [d.b, -grand, d.b, H + grand]
            : [-grand, d.a * -grand + d.b, L + grand, d.a * (L + grand) + d.b];
        out.push(`<line class="qd-axe" clip-path="url(#${p}-clip)"
            x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}"/>`);
        // La lettre de l'axe, posée au bord, du côté où il y a la place.
        const [ex, ey] = d.verticale ? [d.b, 0.45] : [0.45, d.a * 0.45 + d.b];
        out.push(`<text class="qd-marque-nom" x="${px(ex + 0.42)}" y="${px(ey - 0.3)}">(d)</text>`);
    }

    if ((t.genre === 'centrale' || t.genre === 'rotation') && t.centre) {
        const cx = versDessin(t.centre.x), cy = versDessin(t.centre.y);
        out.push(`<g class="qd-centre">`
            + `<line x1="${px(cx - 0.22)}" y1="${px(cy - 0.22)}" x2="${px(cx + 0.22)}" y2="${px(cy + 0.22)}"/>`
            + `<line x1="${px(cx - 0.22)}" y1="${px(cy + 0.22)}" x2="${px(cx + 0.22)}" y2="${px(cy - 0.22)}"/>`
            + `</g>`);
        out.push(`<text class="qd-marque-nom" x="${px(cx + 0.3)}" y="${px(cy - 0.3)}">O</text>`);
        if (t.genre === 'rotation') out.push(arcDeRotation(t, { px, u, p }));
    }

    if (t.genre === 'translation' && t.vecteur && ancre) {
        const ax = versDessin(ancre.x), ay = versDessin(ancre.y);
        out.push(`<line class="qd-vecteur" marker-end="url(#${p}-fleche)"
            x1="${px(ax)}" y1="${px(ay)}" x2="${px(ax + t.vecteur.x)}" y2="${px(ay + t.vecteur.y)}"/>`);
        out.push(`<text class="qd-marque-nom" x="${px(ax + t.vecteur.x / 2)}"
            y="${px(ay + t.vecteur.y / 2 - 0.35)}" text-anchor="middle">v</text>`);
    }

    return out;
}

/**
 * Le petit arc qui dit DANS QUEL SENS on tourne — sans lui, deux réponses.
 *
 * Le rayon de l'arc s'écrit en PIXELS, pas en carreaux : `A 0.85 0.85` aurait
 * donné un arc plus petit que le trait qui le dessine, donc invisible.
 */
function arcDeRotation(t, { px, u, p }) {
    const cx = versDessin(t.centre.x), cy = versDessin(t.centre.y);
    const r = 0.85;
    const rp = (r * u).toFixed(2);
    // Le sens direct (quarts = 1) tourne vers la GAUCHE à l'écran, puisque
    // l'ordonnée descend : l'arc part de la droite et monte.
    const sens = t.quarts === 1 ? 0 : 1;
    const [dx1, dy1, dx2, dy2] = t.quarts === 1 ? [r, 0, 0, -r] : [r, 0, 0, r];
    return `<path class="qd-arc" marker-end="url(#${p}-fleche)"
        d="M ${px(cx + dx1)} ${px(cy + dy1)} A ${rp} ${rp} 0 0 ${sens} ${px(cx + dx2)} ${px(cy + dy2)}"/>`;
}
