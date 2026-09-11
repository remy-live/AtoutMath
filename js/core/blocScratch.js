// LA SILHOUETTE D'UN BLOC SCRATCH, UNE SEULE FOIS, POUR TROIS DESSINS.
//
// Rémy : « pour le chat géomètre, les blocs rendus en PDF ne sont pas les
// mêmes que les vrais ». Ils ne l'étaient pas, en effet : l'atelier de l'écran
// trace un chemin SVG avec le tenon, la mortaise et les coins arrondis de
// Scratch, pendant que la fiche redessinait de son côté un polygone à angles
// vifs, avec un cran trapézoïdal et sans les gélules blanches des nombres.
// Deux dessins pour une même chose, donc deux chances de diverger — et l'élève
// qui compare sa feuille à son écran ne reconnaît plus ses blocs.
//
// Ce module ne dessine rien : il donne LA FORME, en segments. L'atelier en
// fait un attribut `d`, l'aperçu de la fiche aussi, et le PDF en fait des
// `doc.lines`. Trois rendus, une géométrie.
//
// L'UNITÉ est celle de l'atelier : une pièce simple fait 40 de haut, et tout
// le reste en découle. Chaque rendu multiplie par ce qu'il veut — des pixels
// d'écran, des millimètres de papier.

export const U = {
    ligne: 40,          // hauteur d'une pièce simple
    chapeau: 48,        // hauteur du bloc « quand ⚑ est cliqué »
    dome: 22,           // hauteur de sa bosse
    r: 4,               // rayon des coins
    retrait: 14,        // décalage du contenu dans la bouche d'une boucle
    boucheVide: 28,     // hauteur d'une bouche vide
    basBoucle: 24,      // barre inférieure d'une boucle
    margeG: 12,         // retrait du texte à gauche
    champH: 26,         // hauteur d'une gélule de nombre
    texte: 13           // corps du texte d'un bloc
};

// Le tenon, à la lettre : la bosse du bas qui s'emboîte dans le creux du bloc
// suivant. Elle commence à x = 12 et s'achève à x = 48 — trente-six unités.
const CRAN_DEBUT = 12;
const CRAN_FIN = 48;

/** Le quart de cercle d'un coin, en cubique : 0,5523 est la constante du cercle. */
const K = 0.5523;

/**
 * Un chemin en construction. On y pousse des segments ABSOLUS ; `versSvg` et
 * `versPdf` s'occupent de la conversion, chacun dans sa langue.
 */
class Chemin {
    constructor(x, y) { this.debut = [x, y]; this.pas = []; this.p = [x, y]; }
    l(x, y) { this.pas.push(['L', x, y]); this.p = [x, y]; return this; }
    c(x1, y1, x2, y2, x, y) { this.pas.push(['C', x1, y1, x2, y2, x, y]); this.p = [x, y]; return this; }
    /** Un segment relatif au point courant — la façon dont Scratch écrit ses crans. */
    rl(dx, dy) { return this.l(this.p[0] + dx, this.p[1] + dy); }
    rc(dx1, dy1, dx2, dy2, dx, dy) {
        const [x, y] = this.p;
        return this.c(x + dx1, y + dy1, x + dx2, y + dy2, x + dx, y + dy);
    }
    /**
     * Un coin arrondi, du point courant vers (x, y) EN CONTOURNANT le sommet
     * (ex, ey) — le coin vif qu'on adoucit.
     *
     * On donne le sommet plutôt qu'un sens de rotation : il n'y a alors rien à
     * deviner, ni pour un coin de rectangle, ni pour le rentrant d'une bouche
     * de boucle, où la courbure s'inverse. Les deux points de contrôle sont à
     * K fois la distance au sommet — c'est la constante qui fait d'une cubique
     * un quart de cercle indiscernable.
     */
    coin(ex, ey, x, y) {
        const [ax, ay] = this.p;
        return this.c(ax + (ex - ax) * K, ay + (ey - ay) * K,
            x + (ex - x) * K, y + (ey - y) * K, x, y);
    }
}

/** Le tenon (vers la droite) et la mortaise (vers la gauche), depuis le point courant. */
function tenon(ch, sens) {
    const s = sens;
    ch.rc(2 * s, 0, 3 * s, 1, 4 * s, 2);
    ch.rl(4 * s, 4);
    ch.rc(1 * s, 1, 2 * s, 2, 4 * s, 2);
    ch.rl(12 * s, 0);
    ch.rc(2 * s, 0, 3 * s, -1, 4 * s, -2);
    ch.rl(4 * s, -4);
    ch.rc(1 * s, -1, 2 * s, -2, 4 * s, -2);
}

/**
 * La silhouette d'un bloc, en unités d'atelier, coin haut-gauche à l'origine.
 *
 * @param {Object} bloc
 *   `genre`   : 'simple' | 'boucle' | 'chapeau'
 *   `largeur` : la largeur du bloc
 *   `bouche`  : pour une boucle, la hauteur de ce qu'elle enveloppe
 * @returns {{debut: number[], pas: Array}} le chemin, prêt à convertir.
 */
export function silhouette({ genre = 'simple', largeur, bouche = U.boucheVide }) {
    const w = largeur, r = U.r;
    const h = genre === 'chapeau' ? U.chapeau : U.ligne;

    if (genre === 'chapeau') {
        // LE DÔME, à la lettre de Scratch : une cubique dont les points de
        // contrôle sont à 26 % et 74 % de la largeur. Elle donne des épaules
        // franches et un sommet presque plat — une parabole faisait une colline.
        const ch = new Chemin(0, U.dome);
        ch.c(w * 0.26, 0, w * 0.74, 0, w, U.dome);
        ch.l(w, h - r);
        ch.coin(w, h, w - r, h);
        ch.l(CRAN_FIN, h);
        tenon(ch, -1);                       // le tenon du bas, tracé à l'envers
        ch.l(r, h);
        ch.coin(0, h, 0, h - r);
        return { debut: ch.debut, pas: ch.pas, hauteur: h };
    }

    if (genre === 'boucle') {
        const yb = h + bouche;               // le haut du bras du bas
        const bas = yb + U.basBoucle;        // le bas du bloc entier
        const ch = new Chemin(0, r);
        ch.coin(0, 0, r, 0);
        ch.l(CRAN_DEBUT, 0);
        tenon(ch, 1);
        ch.l(w - r, 0);
        ch.coin(w, 0, w, r);
        ch.l(w, h - r);
        ch.coin(w, h, w - r, h);
        // L'INTÉRIEUR DE LA BOUCHE. Le cran y est décalé du retrait : c'est là
        // que viendra s'emboîter le premier bloc enveloppé. Les deux coins
        // rentrants tournent dans l'autre sens — d'où le sommet donné à part.
        ch.l(U.retrait + CRAN_FIN, h);
        tenon(ch, -1);
        ch.l(U.retrait + r, h);
        ch.coin(U.retrait, h, U.retrait, h + r);
        ch.l(U.retrait, yb - r);
        ch.coin(U.retrait, yb, U.retrait + r, yb);
        ch.l(U.retrait + CRAN_DEBUT, yb);
        tenon(ch, 1);
        ch.l(w - r, yb);
        ch.coin(w, yb, w, yb + r);
        ch.l(w, bas - r);
        ch.coin(w, bas, w - r, bas);
        ch.l(CRAN_FIN, bas);
        tenon(ch, -1);
        ch.l(r, bas);
        ch.coin(0, bas, 0, bas - r);
        return { debut: ch.debut, pas: ch.pas, hauteur: bas };
    }

    const ch = new Chemin(0, r);
    ch.coin(0, 0, r, 0);
    ch.l(CRAN_DEBUT, 0);
    tenon(ch, 1);
    ch.l(w - r, 0);
    ch.coin(w, 0, w, r);
    ch.l(w, h - r);
    ch.coin(w, h, w - r, h);
    ch.l(CRAN_FIN, h);
    tenon(ch, -1);
    ch.l(r, h);
    ch.coin(0, h, 0, h - r);
    return { debut: ch.debut, pas: ch.pas, hauteur: h };
}

/** La gélule blanche d'un nombre — c'est elle qui dit « ce nombre se change ». */
export function gelule(w, h) {
    const r = h / 2;
    const ch = new Chemin(r, 0);
    ch.l(w - r, 0);
    ch.coin(w, 0, w, r);
    ch.coin(w, h, w - r, h);
    ch.l(r, h);
    ch.coin(0, h, 0, r);
    ch.coin(0, 0, r, 0);
    return { debut: ch.debut, pas: ch.pas };
}

/** Le chemin en attribut `d` SVG, mis à l'échelle et translaté. */
export function versSvg(chemin, { x = 0, y = 0, u = 1 } = {}) {
    const X = (v) => (x + v * u).toFixed(2), Y = (v) => (y + v * u).toFixed(2);
    let d = `M ${X(chemin.debut[0])} ${Y(chemin.debut[1])}`;
    for (const s of chemin.pas) {
        d += s[0] === 'L'
            ? ` L ${X(s[1])} ${Y(s[2])}`
            : ` C ${X(s[1])} ${Y(s[2])} ${X(s[3])} ${Y(s[4])} ${X(s[5])} ${Y(s[6])}`;
    }
    return `${d} Z`;
}

/**
 * Le chemin en segments RELATIFS, la seule langue que parle `doc.lines` de
 * jsPDF : `[dx, dy]` pour un trait, `[dx1, dy1, dx2, dy2, dx3, dy3]` pour une
 * cubique. On renvoie aussi le point de départ, que jsPDF demande à part.
 */
export function versPdf(chemin, { x = 0, y = 0, u = 1 } = {}) {
    const suite = [];
    let px = chemin.debut[0], py = chemin.debut[1];
    for (const s of chemin.pas) {
        if (s[0] === 'L') {
            suite.push([(s[1] - px) * u, (s[2] - py) * u]);
            px = s[1]; py = s[2];
        } else {
            suite.push([(s[1] - px) * u, (s[2] - py) * u,
                (s[3] - px) * u, (s[4] - py) * u,
                (s[5] - px) * u, (s[6] - py) * u]);
            px = s[5]; py = s[6];
        }
    }
    return { x: x + chemin.debut[0] * u, y: y + chemin.debut[1] * u, suite };
}

/** Largeur approchée d'un texte de bloc, sans mesurer dans le DOM. */
export const largeurTexte = (txt) => String(txt).length * 7.1 + 2;

/** La largeur d'une gélule qui doit contenir `val`. */
export const largeurChamp = (val) => Math.max(30, largeurTexte(String(val)) + 18);
