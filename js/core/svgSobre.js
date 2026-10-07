// UN SVG IMPORTÉ, RAMENÉ À CE QU'ON ACCEPTE DE MONTRER À UNE CLASSE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faudrait pouvoir importer des svg ».
//
// ── POURQUOI CE MODULE EXISTE, ET POURQUOI IL EST SÉVÈRE ───────────────────
//
// UN SVG EST DU CODE. Ce n'est pas une image : c'est un document qui peut porter
// un `<script>`, un `onload=`, un lien vers un serveur extérieur. Collé dans
// `js/data/dingbats.js`, il serait servi à chaque élève de chaque classe, et il
// s'exécuterait dans la page où vit leur session.
//
// Rémy importera des dessins qu'il a faits ou trouvés, sans y penser — c'est
// normal, c'est le but. C'est donc ICI que ça se joue, pas dans sa vigilance.
//
// ── DEUX GESTES, ET LE SECOND EST LE GARDE-FOU ─────────────────────────────
//
//   · `nettoyerSvg` RETIRE ce qui ne doit pas rester. Il fait de son mieux.
//   · `verifierSvg` REFUSE tout ce qu'il ne reconnaît pas. Il ne fait pas de son
//     mieux : il travaille sur une LISTE BLANCHE, donc ce qu'il n'a pas prévu
//     est refusé plutôt qu'accepté.
//
// Le premier seul serait dangereux : un nettoyeur ne voit que les tours qu'on
// lui a appris. Le second seul serait inutilisable : il refuserait tous les
// fichiers réels, qui portent toujours un `<title>` ou un commentaire. Ensemble,
// ils laissent passer un dessin et rien d'autre.
//
// ON N'EMPLOIE PAS `DOMParser` : ce module doit tourner sous Node pour être
// éprouvé, et une règle de sécurité qu'aucune épreuve ne peut atteindre se casse
// en silence — la leçon de `core/ligneEtape.js`, payée une fois.

/** Ce qu'un dessin au trait a le droit de contenir. Le reste est refusé. */
export const BALISES_PERMISES = [
    'svg', 'g', 'defs', 'symbol', 'use', 'path', 'rect', 'circle', 'ellipse',
    'line', 'polyline', 'polygon', 'text', 'tspan', 'clipPath', 'mask',
    'linearGradient', 'radialGradient', 'stop', 'marker', 'pattern'
];

/** Ce qu'une balise a le droit de porter. */
export const ATTRIBUTS_PERMIS = [
    'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fr',
    'width', 'height', 'points', 'transform', 'gradientTransform', 'patternTransform',
    'viewBox', 'preserveAspectRatio', 'overflow',
    'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'stroke-opacity',
    'fill-rule', 'fill-opacity', 'clip-rule', 'clip-path', 'mask', 'opacity',
    'vector-effect', 'paint-order', 'shape-rendering',
    'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'patternUnits',
    'spreadMethod', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient',
    'marker-start', 'marker-mid', 'marker-end', 'markerUnits',
    'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor',
    'dominant-baseline', 'letter-spacing', 'dx', 'dy',
    'class', 'id', 'style', 'href', 'xlink:href'
];

/** Au-delà, le JSON d'une énigme devient illisible et le fichier de données double. */
export const TAILLE_MAX = 60000;

const BALISE = /<\s*\/?\s*([A-Za-z_][\w:.-]*)/g;
const ATTRIBUT = /([A-Za-z_:][\w:.-]*)\s*=/g;

/**
 * CE QU'ON REFUSE, ET C'EST UNE LISTE BLANCHE.
 *
 * @returns {{ok: boolean, dit: string}}
 */
export function verifierSvg(markup) {
    const s = String(markup == null ? '' : markup);
    if (!s.trim()) return { ok: false, dit: 'le dessin est vide' };
    if (s.length > TAILLE_MAX) {
        return { ok: false, dit: `le dessin fait ${s.length} caractères, le maximum est ${TAILLE_MAX}` };
    }
    for (const m of s.matchAll(BALISE)) {
        const nom = m[1];
        if (!BALISES_PERMISES.includes(nom)) {
            return { ok: false, dit: `la balise « ${nom} » n'est pas permise dans un dessin importé` };
        }
    }
    for (const m of s.matchAll(ATTRIBUT)) {
        const nom = m[1];
        // `on…=` EST LE CAS QUI COMPTE : `onload`, `onclick`, et les quarante
        // autres. On les nomme à part pour que le message soit clair.
        if (/^on/i.test(nom)) return { ok: false, dit: `l'attribut « ${nom} » exécuterait du code` };
        if (!ATTRIBUTS_PERMIS.includes(nom)) {
            return { ok: false, dit: `l'attribut « ${nom} » n'est pas permis dans un dessin importé` };
        }
    }
    // UN LIEN NE SORT PAS DU DESSIN. `href="#truc"` désigne un dégradé défini
    // juste au-dessus ; tout le reste va chercher ailleurs, c'est-à-dire chez
    // quelqu'un qui saura alors quel élève a ouvert quelle page.
    for (const m of s.matchAll(/(?:xlink:)?href\s*=\s*"([^"]*)"/g)) {
        if (!m[1].startsWith('#')) {
            return { ok: false, dit: `le lien « ${m[1].slice(0, 40)} » sort du dessin` };
        }
    }
    // `url(` DANS UN STYLE fait la même chose par un autre chemin.
    if (/style\s*=\s*"[^"]*(url\s*\(|expression|javascript:)/i.test(s)) {
        return { ok: false, dit: 'un style va chercher quelque chose à l\'extérieur' };
    }
    if (/javascript:/i.test(s)) return { ok: false, dit: 'le dessin porte un « javascript: »' };
    return { ok: true, dit: '' };
}

/** Le `viewBox` d'un SVG, ou, à défaut, sa largeur et sa hauteur. */
function vueBoiteDe(entete) {
    const vb = entete.match(/viewBox\s*=\s*"([^"]*)"/i);
    if (vb) {
        const n = vb[1].trim().split(/[\s,]+/).map(Number);
        if (n.length === 4 && n.every(Number.isFinite)) return n;
    }
    // SANS `viewBox`, ON LE FABRIQUE à partir de la taille déclarée : un SVG qui
    // n'a ni l'un ni l'autre ne peut pas être mis à l'échelle, et il sortirait
    // minuscule ou énorme sans qu'on sache pourquoi.
    const nombre = (quoi) => {
        const m = entete.match(new RegExp(`${quoi}\\s*=\\s*"([\\d.]+)`, 'i'));
        return m ? Number(m[1]) : 0;
    };
    const l = nombre('width'), h = nombre('height');
    if (l > 0 && h > 0) return [0, 0, l, h];
    return null;
}

/**
 * TEINDRE UN DESSIN POUR QU'IL SUIVE L'ENCRE DU THÈME.
 *
 * L'APPLICATION A CINQ THÈMES. Un dessin au trait noir, importé tel quel,
 * DISPARAÎT sur le thème sombre — et personne ne le verra, parce qu'on compose
 * en clair. C'est le même piège que les couleurs des compositions, et il se
 * règle de la même façon : on remplace les couleurs par `currentColor`, et le
 * dessin prend l'encre que le thème lui donne.
 *
 * ON NE TOUCHE PAS À `none` : c'est une absence de peinture, pas une couleur.
 * Le confondre remplirait de noir toutes les formes creuses d'un dessin.
 */
export function teindre(markup) {
    return String(markup)
        .replace(/(\s(?:fill|stroke))\s*=\s*"(?!none"|url\()[^"]*"/gi, '$1="currentColor"')
        .replace(/((?:^|[;\s"])(?:fill|stroke))\s*:\s*(?!none|url\()[^;"]+/gi, '$1: currentColor');
}

/**
 * PRÉFIXER LES IDENTIFIANTS, pour que deux dessins ne se volent pas leurs dégradés.
 *
 * Deux SVG importés d'affilée portent souvent tous deux `id="a"`. Posés sur la
 * même page, le second gagne, et le premier se peint avec le dégradé du second —
 * une image qui change de couleur toute seule, sans rien dans le code qui le
 * dise.
 */
export function prefixerLesIds(markup, prefixe) {
    const ids = [...String(markup).matchAll(/\sid\s*=\s*"([^"]+)"/g)].map(m => m[1]);
    let s = String(markup);
    for (const id of new Set(ids)) {
        const nu = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        s = s.replace(new RegExp(`(\\sid\\s*=\\s*")${nu}(")`, 'g'), `$1${prefixe}${id}$2`);
        s = s.replace(new RegExp(`url\\(#${nu}\\)`, 'g'), `url(#${prefixe}${id})`);
        s = s.replace(new RegExp(`((?:xlink:)?href\\s*=\\s*")#${nu}(")`, 'g'), `$1#${prefixe}${id}$2`);
    }
    return s;
}

/**
 * NETTOYER UN FICHIER SVG, ET RENDRE DE QUOI LE DESSINER.
 *
 * @param {string} texte      le contenu du fichier, tel qu'il arrive
 * @param {object} [opts]     `prefixe` pour les identifiants, `encre` pour teindre
 * @returns {{contenu: string, vueBoite: number[], retires: string[]}}
 * @throws  si ce n'est pas un SVG, ou s'il reste quelque chose qu'on refuse
 */
export function nettoyerSvg(texte, opts = {}) {
    let s = String(texte == null ? '' : texte);
    const retires = [];
    const oter = (regex, nom) => {
        const avant = s;
        s = s.replace(regex, '');
        if (s !== avant) retires.push(nom);
    };

    // L'ORDRE COMPTE : on retire les blocs entiers AVANT les attributs, sinon on
    // nettoie soigneusement l'intérieur d'un `<script>` qu'on allait supprimer.
    oter(/<!--[\s\S]*?-->/g, 'commentaires');
    oter(/<\?[\s\S]*?\?>/g, 'déclaration XML');
    oter(/<!DOCTYPE[^>]*>/gi, 'doctype');
    oter(/<script[\s\S]*?<\/script\s*>/gi, 'scripts');
    oter(/<style[\s\S]*?<\/style\s*>/gi, 'feuilles de style');
    oter(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, 'contenu étranger');
    oter(/<(title|desc|metadata)[\s\S]*?<\/\1\s*>/gi, 'titre et notes');
    oter(/<(animate|animateTransform|animateMotion|set)\b[^>]*\/?>/gi, 'animations');
    oter(/\son[a-z]+\s*=\s*"[^"]*"/gi, 'gestionnaires d\'événements');
    oter(/\son[a-z]+\s*=\s*'[^']*'/gi, 'gestionnaires d\'événements');

    const ouverture = s.match(/<svg\b[^>]*>/i);
    if (!ouverture) throw new Error('ce fichier ne contient pas de balise <svg>');
    const vueBoite = vueBoiteDe(ouverture[0]);
    if (!vueBoite) {
        throw new Error('ce SVG n\'a ni « viewBox » ni taille : impossible de le mettre à l\'échelle');
    }

    // ON NE GARDE QUE L'INTÉRIEUR : l'enveloppe sera la nôtre, avec notre
    // position, notre taille et notre rotation.
    const debut = s.indexOf(ouverture[0]) + ouverture[0].length;
    const fin = s.lastIndexOf('</svg');
    // `>=` ET NON `>`, et c'est l'épreuve qui l'a dit. Sur un `<svg …></svg>`
    // vide, les deux bornes se confondent : avec un `>` strict, on tombait dans
    // le repli et l'on rendait « </svg> » COMME CONTENU. Le tamis le laissait
    // passer — « svg » est une balise permise — et l'énigme aurait affiché un
    // cadre nu, c'est-à-dire la même chose qu'un logiciel cassé.
    s = (fin >= debut ? s.slice(debut, fin) : s.slice(debut)).trim();
    if (!s) throw new Error('ce SVG est vide : il n\'y a rien à dessiner');

    // Les attributs du XML qui ne servent qu'à l'enveloppe, et que des éditeurs
    // laissent traîner sur les enfants.
    oter(/\sxmlns(:\w+)?\s*=\s*"[^"]*"/g, 'déclarations d\'espace de noms');

    if (opts.encre !== false) s = teindre(s);
    if (opts.prefixe) s = prefixerLesIds(s, opts.prefixe);

    const verdict = verifierSvg(s);
    if (!verdict.ok) throw new Error(`après nettoyage, ${verdict.dit}`);

    return { contenu: s, vueBoite, retires: [...new Set(retires)] };
}
