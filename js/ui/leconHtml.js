// LA LEÇON, HABILLÉE — le pendant visible de `core/lecon.js`.
//
// Rémy : « quand tu vois l'explication, ça donne pas envie de lire, il faut une
// belle mise en page, du retour à la ligne, de la couleur ».
//
// Le découpage vit dans le noyau, où il se teste sans navigateur ; ce fichier
// ne fait que poser des balises dessus. La séparation n'est pas de la
// coquetterie : c'est elle qui permet d'affirmer, par un test, qu'aucune leçon
// ne perd un mot en chemin — ce qu'on ne pourrait pas vérifier sur du HTML.

import { decouperLecon } from '../core/lecon.js';
// LE CROQUIS EST DESSINÉ PAR LE MÊME MODULE QUE L'EXERCICE, et son image est
// calculée par le même code que la correction. Voir `croquisHtml`.
import { quadrillageSvg } from '../core/quadrillageSvg.js';
import { imageFigure, appliquer } from '../core/transformations.js';

const echapper = (t) => String(t).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Les morceaux d'un paragraphe : texte ordinaire, mot fort, calcul. */
const morceauxHtml = (liste) => liste.map(m => {
    if (m.genre === 'fort') return `<b class="lc-fort">${echapper(m.texte)}</b>`;
    if (m.genre === 'calcul') return `<span class="lc-calc">${echapper(m.texte)}</span>`;
    return echapper(m.texte);
}).join('');

const pt = ([x, y]) => ({ x, y });
const memeCase = (a, b) => a && b && a.x === b.x && a.y === b.y;

/**
 * UN NOM D'IDENTIFIANT QUI NE DÉPEND QUE DU CROQUIS.
 *
 * `quadrillageSvg` met des identifiants dans ses `<defs>` — la pointe de la
 * flèche, la fenêtre de découpe — et prévient que « deux dessins d'une même
 * page n'aient pas le même id ». Or trois leçons paraissent côte à côte dans le
 * plan de révision.
 *
 * ON NE COMPTE PAS LES APPELS : un compteur ferait rendre deux HTML différents
 * pour la même leçon, ce qui rend toute épreuve impossible à écrire. On dérive
 * le nom du CONTENU — deux croquis identiques partagent alors leurs
 * définitions, ce qui est sans conséquence puisqu'elles sont identiques.
 */
function nomDuCroquis(c) {
    const brut = [c.transfo && c.transfo.genre, c.largeur, c.hauteur,
        ...(c.depart || []).flat()].join('');
    return 'lcq' + brut.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * LE CROQUIS D'UNE TRANSFORMATION — un exemple fait, et non décrit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, devant l'espace d'un de ses élèves : « Et tracer l'image par quart de
 * tour ce n'est pas clair. Il faut que tant que faire se peut que ce soit
 * visuel pour les explications. »
 *
 * MESURÉ (tools/leconsVisuelles.mjs) : les trois leçons de transformations de
 * son plan faisaient 254 mots, 22 lignes, et ZÉRO figure. Un quart de tour
 * expliqué en mots reste un quart de tour expliqué en mots.
 *
 * ── L'IMAGE NE S'ÉCRIT PAS À LA MAIN, ELLE SE CALCULE ──────────────────────
 *
 * Le croquis déclare la figure de DÉPART et la TRANSFORMATION ; son image sort
 * d'`imageFigure`, c'est-à-dire du code qui corrige l'exercice. Des
 * coordonnées recopiées à la main dans `data/skills.js` finiraient un jour par
 * contredire la correction — et c'est la leçon qui aurait l'air d'avoir
 * raison. Même raison pour le demi-carreau : le dessin passe par
 * `quadrillageSvg`, le seul endroit qui sache où tombe un axe.
 *
 * ── LA CASE REPÈRE ─────────────────────────────────────────────────────────
 *
 * Une figure entière qui se déplace montre QUE ça bouge, pas COMMENT. La règle
 * du quart de tour se lit sur UNE case : « 3 à gauche et 2 au-dessus de O »
 * devient « 2 à droite et 3 au-dessus ». On marque donc une case au départ et
 * son image, et la légende dit ces deux nombres. C'est le geste du professeur
 * au tableau, qui pointe une case avant de compter.
 */
function croquisHtml(c) {
    if (!c || !c.depart || !c.transfo) return '';
    const depart = c.depart.map(pt);
    const image = imageFigure(depart, c.transfo);
    const repere = c.repere ? pt(c.repere) : null;
    const repereImage = repere ? appliquer(repere, c.transfo) : null;
    const sauf = (liste, p) => (p ? liste.filter(q => !memeCase(q, p)) : liste);
    const svg = quadrillageSvg({
        largeur: c.largeur, hauteur: c.hauteur, cote: 24,
        prefixe: nomDuCroquis(c),
        transfo: c.transfo,
        // LA FLÈCHE D'UNE TRANSLATION PART DE LA CASE REPÈRE : posée ailleurs,
        // elle décrit le même glissement mais sur une case dont on ne parle
        // pas, et l'œil doit faire le rapprochement tout seul.
        ancre: repere || undefined,
        figures: [
            { cases: sauf(depart, repere), classe: 'qd-depart' },
            { cases: sauf(image, repereImage), classe: 'qd-attendue' },
            ...(repere ? [{ cases: [repere], classe: 'qd-depart lc-repere' }] : []),
            ...(repereImage ? [{ cases: [repereImage], classe: 'qd-attendue lc-repere' }] : [])
        ]
    });
    return `<figure class="lc-croquis">${svg}`
        + (c.legende ? `<figcaption class="lc-croquis-dit">${echapper(c.legende)}</figcaption>` : '')
        + '</figure>';
}

/**
 * La leçon en HTML.
 *
 * UN CAS PORTE SON NOM COMME UN INTERTITRE. « MÊME SIGNE », « SIGNES
 * DIFFÉRENTS » : c'est exactement la question que l'élève se pose devant son
 * exercice — « je suis dans quel cas ? » —, et la réponse doit se trouver en
 * balayant la page, sans lire la phrase qui précède.
 *
 * ON ACCEPTE LE TEXTE SEUL **OU** LA COMPÉTENCE ENTIÈRE. Les quatre endroits
 * qui affichent une leçon ne tiennent pas tous la compétence en main — le
 * meneur et le panneau d'aide n'en gardaient que la phrase. Prendre les deux
 * formes évite de remuer quatre chemins pour ajouter une figure, et celui qui
 * a la compétence sous la main obtient le croquis sans rien faire d'autre que
 * de la passer.
 *
 * @param {string|{lesson: string, croquis?: Object}} lecon
 * @returns {string} du HTML, ou une chaîne vide s'il n'y a rien à dire
 */
export function leconHtml(lecon) {
    const texte = (lecon && lecon.lesson !== undefined) ? lecon.lesson : lecon;
    const blocs = decouperLecon(texte);
    if (!blocs.length) return '';
    // LE CROQUIS EN TÊTE, et non en pied. Rémy demande que ce soit VISUEL : une
    // figure qu'on ne rencontre qu'après neuf lignes de texte arrive après
    // l'abandon.
    const dessin = (lecon && lecon.croquis) ? croquisHtml(lecon.croquis) : '';
    return `<div class="lc">${dessin}${blocs.map(b => (b.genre === 'cas'
        ? `<div class="lc-cas"><span class="lc-cas-nom">${echapper(b.titre)}</span>
             <span class="lc-cas-corps">${morceauxHtml(b.morceaux)}</span></div>`
        : `<p class="lc-p">${morceauxHtml(b.morceaux)}</p>`)).join('')}</div>`;
}
