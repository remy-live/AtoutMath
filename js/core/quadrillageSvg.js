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
 * @param {boolean} [cfg.interactive]    - une cible cliquable par CASE
 * @param {boolean} [cfg.elementsCliquables] - une cible cliquable par CANDIDAT
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
    // GRADUÉ ET NOMMÉ, LE QUADRILLAGE A BESOIN DE QUATRE MARGES.
    //
    // Les nombres se posent sous la grille et à sa gauche ; les noms des
    // droites candidates au-dessus (pour les verticales) et à droite (pour les
    // horizontales). Sans place réservée, ils sortaient du viewBox et le
    // navigateur les rognait : on voyait le sommet des lettres de « (d₁) », et
    // les noms des droites horizontales disparaissaient purement et simplement.
    const marge = (quand, part) => (quand ? Math.max(MARGE, u * part) : MARGE);
    const mG = marge(cfg.repere, 0.85);
    const mB = marge(cfg.repere, 1.05);
    const aDesNoms = (cfg.elements || []).some(el => el && el.nom);
    const mH = marge(aDesNoms, 0.75);
    const mD = marge(aDesNoms, 1.35);
    const W = L * u + mG + mD;
    const Ht = H * u + mH + mB;
    // ELLES RENDENT DES NOMBRES, PAS DES CHAÎNES. Arrondies en chaîne, elles
    // se CONCATÉNAIENT à la moindre addition : `px(L) + u * 0.15` donnait
    // « 325.504.5 », que le navigateur refuse — les graduations du bas et le
    // nom des droites horizontales allaient se poser en haut à gauche.
    const arrondi = (v) => Math.round(v * 100) / 100;
    const px = (v) => arrondi(mG + v * u);
    const py = (v) => arrondi(mH + v * u);

    const parts = [];

    // Le quadrillage. Les traits sont ceux du cahier : ils portent la figure
    // sans la concurrencer.
    for (let i = 0; i <= L; i++) {
        parts.push(`<line class="qd-grille" x1="${px(i)}" y1="${py(0)}" x2="${px(i)}" y2="${py(H)}"/>`);
    }
    for (let j = 0; j <= H; j++) {
        parts.push(`<line class="qd-grille" x1="${px(0)}" y1="${py(j)}" x2="${px(L)}" y2="${py(j)}"/>`);
    }

    // LES GRADUATIONS, ET L'ORDONNÉE QUI MONTE.
    //
    // Les lignes d'un quadrillage se comptent de haut en bas ; l'ordonnée d'un
    // repère monte. Écrire les numéros de ligne tels quels aurait donné un
    // repère à l'envers — et l'élève à qui l'on demande « x = 4 » ou
    // « (4 ; 7) » lit le repère qu'il connaît, pas celui du programme.
    if (cfg.repere) {
        for (let i = 0; i <= L; i++) {
            parts.push(`<text class="qd-gradu" x="${px(i)}" y="${py(H) + u * 0.5}"
                text-anchor="middle" dominant-baseline="hanging">${i}</text>`);
        }
        for (let j = 0; j <= H; j++) {
            parts.push(`<text class="qd-gradu" x="${px(0) - u * 0.22}" y="${py(H - j)}"
                text-anchor="end" dominant-baseline="central">${j}</text>`);
        }
    }

    // Les figures, sous la transformation : un axe passant sur une case doit
    // rester visible.
    (cfg.figures || []).forEach((f, n) => {
        (f.cases || []).forEach(c => {
            parts.push(`<rect class="qd-case ${f.classe || ''}" x="${px(c.x)}" y="${py(c.y)}"
                width="${u}" height="${u}"/>`);
        });
        // L'ÉTIQUETTE SE POSE AU MILIEU DE LA PIÈCE, pas sur sa première case.
        // Sur un pavage, la première case est souvent un bout de bras : la
        // lettre se retrouvait au bord, collée à la pièce voisine, et l'on ne
        // savait plus laquelle des deux elle nommait.
        if (f.etiquette && (f.cases || []).length) {
            const c = caseCentrale(f.cases);
            parts.push(`<text class="qd-etiquette" x="${px(c.x + 0.5)}" y="${py(c.y + 0.5)}"
                text-anchor="middle" dominant-baseline="central">${esc(f.etiquette)}</text>`);
        }
        void n;
    });

    // LES MARQUES SONT GROUPÉES, et le groupe a un nom : l'activité colorie
    // par-dessus les figures mais SOUS l'axe, sinon la case posée sur l'axe le
    // masquerait — et c'est justement celle-là qu'on regarde.
    const marques = marquesDeLaTransfo(cfg.transfo, { L, H, px, py, u, p, ancre: cfg.ancre });
    if (marques.length) parts.push(`<g class="qd-marques">${marques.join('\n            ')}</g>`);

    // LES CANDIDATS : plusieurs axes et plusieurs centres, tous nommés, parmi
    // lesquels un seul convient. C'est ce qui fait la question « par rapport à
    // quoi ? » — un seul élément tracé n'aurait rien à chercher.
    // LES ZONES CLIQUABLES PASSENT APRÈS TOUS LES TRACÉS, ET LES POINTS EN
    // DERNIER.
    //
    // Une droite se vise par une BANDE, sinon on ne l'atteint pas au doigt ; or
    // deux bandes perpendiculaires se croisent, et un point posé sur une droite
    // est entièrement recouvert par sa bande. Entrelacées, ces zones se volaient
    // les clics : on visait un centre, c'est la droite qui répondait. L'ordre
    // tranche — le plus petit au-dessus du plus grand, comme partout.
    const visuels = [], bandes = [], pastilles = [];
    (cfg.elements || []).forEach((el, i) => {
        const rendu = dessinerCandidat(el, i, { L, H, px, py, u, p, interactive: cfg.elementsCliquables });
        visuels.push(...rendu.visuel);
        (el.genre === 'point' ? pastilles : bandes).push(...rendu.cible);
    });
    parts.push(...visuels, ...bandes, ...pastilles);

    // LES CASES CLIQUABLES ET LES CANDIDATS CLIQUABLES SONT DEUX CHOSES, et
    // les avoir confondus sous un seul réglage cassait l'exercice : la nappe de
    // cases recouvre toute la grille, donc elle attrapait TOUS les clics
    // destinés aux droites. On visait une droite, c'est une case qui répondait
    // — et il ne se passait rien, sans le moindre message.
    //
    // « Tracer l'image » veut les cases ; « Par rapport à quoi ? » veut les
    // candidats. Aucun exercice ne veut les deux.
    if (cfg.interactive) {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < L; x++) {
                parts.push(`<rect class="qd-hit" data-c="${x},${y}" x="${px(x)}" y="${py(y)}"
                    width="${u}" height="${u}" tabindex="0" role="button"
                    aria-label="Colonne ${x + 1}, ligne ${y + 1}"/>`);
            }
        }
    }

    return `
    <svg class="qd-svg" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}"
         role="img" aria-label="Quadrillage de ${L} sur ${H} carreaux">
        <defs>
            <clipPath id="${p}-clip"><rect x="${px(0)}" y="${py(0)}" width="${L * u}" height="${H * u}"/></clipPath>
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

/**
 * UN CANDIDAT : une droite ou un point parmi lesquels l'élève doit choisir.
 *
 * Ils sont tous dessinés de la même façon, et c'est essentiel : si le bon se
 * distinguait par la couleur ou l'épaisseur, il n'y aurait plus rien à
 * chercher. Ce qui les distingue est leur NOM — (d₁), (d₂), O₁ — et rien
 * d'autre.
 *
 * La zone cliquable d'une droite est une bande large de deux tiers de carreau :
 * viser un trait de deux pixels au doigt est impossible, et l'exercice porte
 * sur la symétrie, pas sur l'adresse.
 */
function dessinerCandidat(el, i, { L, H, px, py, u, interactive }) {
    const out = [];
    const cible = [];
    const id = el.id ?? i;
    const nom = esc(el.nom || '');
    const large = u * 0.5;

    if (el.genre === 'axe' && el.axe) {
        const vert = el.axe.type === 'v';
        const q = versDessin(el.axe.a);
        const [x1, y1, x2, y2] = vert ? [q, 0, q, H] : [0, q, L, q];
        out.push(`<line class="qd-candidat" x1="${px(x1)}" y1="${py(y1)}"
            x2="${px(x2)}" y2="${py(y2)}"/>`);
        // Le nom se pose au bout de la droite, hors de la zone des figures.
        out.push(vert
            ? `<text class="qd-candidat-nom" x="${px(q)}" y="${py(0) - u * 0.18}"
                text-anchor="middle">${nom}</text>`
            : `<text class="qd-candidat-nom" x="${px(L) + u * 0.15}" y="${py(q)}"
                dominant-baseline="central">${nom}</text>`);
        if (interactive) {
            cible.push(`<rect class="qd-el-hit" data-el="${esc(id)}" tabindex="0" role="button"
                aria-label="La droite ${nom}"
                x="${vert ? px(q) - large / 2 : px(0)}" y="${vert ? py(0) : py(q) - large / 2}"
                width="${vert ? large : L * u}" height="${vert ? H * u : large}"/>`);
        }
        return { visuel: out, cible };
    }

    if (el.genre === 'point' && el.centre) {
        const cx = versDessin(el.centre.x), cy = versDessin(el.centre.y);
        out.push(`<g class="qd-candidat-point">`
            + `<line x1="${px(cx - 0.26)}" y1="${py(cy - 0.26)}" x2="${px(cx + 0.26)}" y2="${py(cy + 0.26)}"/>`
            + `<line x1="${px(cx - 0.26)}" y1="${py(cy + 0.26)}" x2="${px(cx + 0.26)}" y2="${py(cy - 0.26)}"/>`
            + `</g>`);
        out.push(`<text class="qd-candidat-nom" x="${px(cx + 0.32)}" y="${py(cy - 0.32)}">${nom}</text>`);
        if (interactive) {
            cible.push(`<circle class="qd-el-hit" data-el="${esc(id)}" tabindex="0" role="button"
                aria-label="Le point ${nom}"
                cx="${px(cx)}" cy="${py(cy)}" r="${large * 0.75}"/>`);
        }
    }
    return { visuel: out, cible };
}

/** L'axe, le centre ou le vecteur — ce que l'énoncé DONNE, en rouge. */
function marquesDeLaTransfo(t, { L, H, px, py, u, p, ancre }) {
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
            x1="${px(x1)}" y1="${py(y1)}" x2="${px(x2)}" y2="${py(y2)}"/>`);
        // La lettre de l'axe, posée au bord, du côté où il y a la place.
        const [ex, ey] = d.verticale ? [d.b, 0.45] : [0.45, d.a * 0.45 + d.b];
        out.push(`<text class="qd-marque-nom" x="${px(ex + 0.42)}" y="${py(ey - 0.3)}">(d)</text>`);
    }

    if ((t.genre === 'centrale' || t.genre === 'rotation') && t.centre) {
        const cx = versDessin(t.centre.x), cy = versDessin(t.centre.y);
        out.push(`<g class="qd-centre">`
            + `<line x1="${px(cx - 0.22)}" y1="${py(cy - 0.22)}" x2="${px(cx + 0.22)}" y2="${py(cy + 0.22)}"/>`
            + `<line x1="${px(cx - 0.22)}" y1="${py(cy + 0.22)}" x2="${px(cx + 0.22)}" y2="${py(cy - 0.22)}"/>`
            + `</g>`);
        out.push(`<text class="qd-marque-nom" x="${px(cx + 0.3)}" y="${py(cy - 0.3)}">O</text>`);
        if (t.genre === 'rotation') out.push(arcDeRotation(t, { px, py, u, p }));
    }

    if (t.genre === 'translation' && t.vecteur && ancre) {
        const ax = versDessin(ancre.x), ay = versDessin(ancre.y);
        out.push(`<line class="qd-vecteur" marker-end="url(#${p}-fleche)"
            x1="${px(ax)}" y1="${py(ay)}" x2="${px(ax + t.vecteur.x)}" y2="${py(ay + t.vecteur.y)}"/>`);
        out.push(`<text class="qd-marque-nom" x="${px(ax + t.vecteur.x / 2)}"
            y="${py(ay + t.vecteur.y / 2 - 0.35)}" text-anchor="middle">v</text>`);
    }

    return out;
}

/**
 * Le petit arc qui dit DANS QUEL SENS on tourne — sans lui, deux réponses.
 *
 * Le rayon de l'arc s'écrit en PIXELS, pas en carreaux : `A 0.85 0.85` aurait
 * donné un arc plus petit que le trait qui le dessine, donc invisible.
 */
function arcDeRotation(t, { px, py, u, p }) {
    const cx = versDessin(t.centre.x), cy = versDessin(t.centre.y);
    const r = 0.85;
    const rp = (r * u).toFixed(2);
    // Le sens direct (quarts = 1) tourne vers la GAUCHE à l'écran, puisque
    // l'ordonnée descend : l'arc part de la droite et monte.
    const sens = t.quarts === 1 ? 0 : 1;
    const [dx1, dy1, dx2, dy2] = t.quarts === 1 ? [r, 0, 0, -r] : [r, 0, 0, r];
    return `<path class="qd-arc" marker-end="url(#${p}-fleche)"
        d="M ${px(cx + dx1)} ${py(cy + dy1)} A ${rp} ${rp} 0 0 ${sens} ${px(cx + dx2)} ${py(cy + dy2)}"/>`;
}
