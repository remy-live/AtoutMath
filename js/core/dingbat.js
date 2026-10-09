// LES DINGBATS — une expression cachée dans la FAÇON dont les mots sont posés.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats, idéalement dans le thème
// mathématique mais dans les réglages on peut avoir le choix. Une centaine
// serait bien. Classe aussi par niveau. »
//
// UN DINGBAT N'EST PAS UN REBUS EN IMAGES. Rien n'y est dessiné : ce sont des
// MOTS, et c'est leur DISPOSITION qui parle. « RACINE » écrit dans un carré se
// lit « racine carrée ». Le mot ne change pas ; sa place dit le reste.
//
// ── POURQUOI ÇA A SA PLACE DANS UN LOGICIEL DE MATHÉMATIQUES ───────────────
//
// PARCE QUE LE VOCABULAIRE DE LA GÉOMÉTRIE EST SPATIAL, et qu'il se perd
// justement là : « médiatrice », « bissectrice », « périmètre », « diamètre »
// ne sont pas des mots à retenir, ce sont des POSITIONS. Un élève qui a vu
// « MÈTRE » écrit AUTOUR d'un carré ne confondra plus périmètre et aire ; celui
// qui a vu « MÈTRE » TRAVERSER un cercle tient le diamètre.
//
// Et c'est pour cela que les deux thèmes ne se valent pas : les dingbats de
// culture générale sont un jeu, ceux de mathématiques sont une leçon. D'où le
// réglage que Rémy demande — le thème mathématique par défaut, le reste au
// choix.
//
// ── UNE GRAMMAIRE, ET NON CENT DESSINS ─────────────────────────────────────
//
// LA DÉCISION QUI TIENT TOUT LE FICHIER : on ne dessine pas cent énigmes, on
// écrit une VINGTAINE DE DISPOSITIONS et chaque énigme en est une instance.
//
// Sans cela, cent dingbats auraient été cent morceaux de HTML écrits à la main :
// impossibles à relire, impossibles à éprouver, et le jour où une couleur change
// il faut les reprendre un par un. Avec la grammaire, une énigme tient en une
// ligne de données, le rendu se corrige à un seul endroit, et une épreuve peut
// vérifier les cent d'un coup — c'est ce que fait `tests/dingbat.test.mjs`.
//
// CE MODULE NE CONNAÎT PAS LE DOCUMENT. Il rend des CHAÎNES, et c'est ce qui le
// rend éprouvable sous Node. La leçon de `core/ligneEtape.js`, payée une fois :
// une règle qu'aucune épreuve ne peut atteindre se casse en silence.

import { rendreLibre } from './dingbatLibre.js';

/** Le HTML est fabriqué ici : tout ce qui vient des données est échappé. */
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Les lettres d'un mot, chacune dans sa boîte — pour les espacer ou les semer. */
const lettres = (mot) => [...String(mot)];

/**
 * LA GRAMMAIRE DES DISPOSITIONS.
 *
 * Chacune dit TROIS choses :
 *
 *   · `nom`     — comment on l'appelle entre nous, et dans les messages d'erreur ;
 *   · `lit`     — CE QU'ELLE SE LIT, en français. C'est la moitié pédagogique du
 *                 jeu : l'indice de deuxième niveau est fabriqué avec, et il
 *                 doit nommer le geste sans donner la réponse — « un mot est
 *                 écrit DANS une forme », pas « racine est dans un carré » ;
 *   · `rendre`  — le HTML, à partir des `mots` et des options de l'énigme.
 *
 * `mots` EST TOUJOURS UN TABLEAU, même à un seul mot : une disposition qui
 * recevrait tantôt une chaîne tantôt un tableau finirait par se tromper, et le
 * jour où cela arrive c'est l'affichage d'une énigme sur cent qui casse — celle
 * qu'on ne regarde jamais.
 */
export const DISPOSITIONS = {

    // ── Les empilements ────────────────────────────────────────────────────

    sur: {
        nom: 'l\'un sur l\'autre',
        lit: 'un mot est posé SUR un autre',
        rendre: (d) => `<div class="dg-pile">${
            d.mots.map(m => `<span class="dg-mot">${esc(m)}</span>`).join('')}</div>`
    },

    sous: {
        nom: 'l\'un sous l\'autre, et c\'est le second qu\'on nomme',
        lit: 'un mot est glissé SOUS un autre',
        rendre: (d) => `<div class="dg-pile">${
            d.mots.map(m => `<span class="dg-mot">${esc(m)}</span>`).join('')}</div>`
    },

    // ── Le dedans et l'autour ──────────────────────────────────────────────

    dans: {
        nom: 'dans une forme',
        lit: 'un mot est enfermé DANS une forme',
        rendre: (d) => `<div class="dg-forme dg-forme--${esc(d.cadre || 'carre')}">
            <span class="dg-mot">${esc(d.mots[0])}</span></div>`
    },

    autour: {
        nom: 'autour d\'une forme',
        lit: 'un mot fait le TOUR d\'une forme',
        // LES QUATRE CÔTÉS PORTENT LE MÊME MOT, et c'est ce qui se lit : il
        // ENTOURE. Un seul exemplaire posé à côté ne dirait rien du tout.
        rendre: (d) => `<div class="dg-autour">
            <span class="dg-autour-h dg-autour-haut">${esc(d.mots[0])}</span>
            <span class="dg-autour-v dg-autour-gauche">${esc(d.mots[0])}</span>
            <div class="dg-forme dg-forme--${esc(d.cadre || 'carre')} dg-forme--vide"></div>
            <span class="dg-autour-v dg-autour-droite">${esc(d.mots[0])}</span>
            <span class="dg-autour-h dg-autour-bas">${esc(d.mots[0])}</span>
        </div>`
    },

    traverse: {
        nom: 'qui traverse une forme',
        lit: 'un mot TRAVERSE une forme de part en part',
        // `biais` : la traversée se fait d'un coin à l'autre et non à plat.
        // C'est ce qui distingue un diamètre d'une diagonale, et c'est tout
        // l'écart entre deux énigmes qui se ressemblent.
        rendre: (d) => `<div class="dg-traverse">
            <div class="dg-forme dg-forme--${esc(d.cadre || 'cercle')} dg-forme--vide"></div>
            <span class="dg-mot dg-traverse-mot${d.biais ? ' dg-biais' : ''}">${esc(d.mots[0])}</span>
        </div>`
    },

    // ── Les répétitions ────────────────────────────────────────────────────

    repete: {
        nom: 'répété',
        lit: 'un mot est écrit PLUSIEURS FOIS — compte-les',
        rendre: (d) => `<div class="dg-serie">${
            Array.from({ length: d.combien || 2 },
                () => `<span class="dg-mot">${esc(d.mots[0])}</span>`).join('')}</div>`
    },

    paralleles: {
        nom: 'deux fois, l\'un sous l\'autre et bien alignés',
        lit: 'le même mot est écrit deux fois, PARFAITEMENT ALIGNÉ',
        rendre: (d) => `<div class="dg-pile dg-paralleles">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <span class="dg-mot">${esc(d.mots[0])}</span></div>`
    },

    croisent: {
        nom: 'qui se croisent à angle droit',
        lit: 'deux mots se CROISENT à angle droit',
        rendre: (d) => `<div class="dg-croix">
            <span class="dg-mot dg-croix-h">${esc(d.mots[0])}</span>
            <span class="dg-mot dg-croix-v">${esc(d.mots[1] || d.mots[0])}</span></div>`
    },

    // ── Les transformations : elles se lisent, et elles s'enseignent ───────

    miroir: {
        nom: 'en miroir',
        lit: 'un mot est RETOURNÉ comme dans un miroir',
        rendre: (d) => `<div class="dg-serie">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <span class="dg-axe" aria-hidden="true"></span>
            <span class="dg-mot dg-miroir">${esc(d.mots[0])}</span></div>`
    },

    demiTour: {
        nom: 'tourné d\'un demi-tour',
        lit: 'un mot a fait un DEMI-TOUR autour d\'un point',
        rendre: (d) => `<div class="dg-serie">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <span class="dg-centre" aria-hidden="true">·</span>
            <span class="dg-mot dg-demi-tour">${esc(d.mots[0])}</span></div>`
    },

    glisse: {
        nom: 'glissé, sans tourner',
        lit: 'un mot a GLISSÉ : même sens, même taille, juste plus loin',
        rendre: (d) => `<div class="dg-glisse">
            <span class="dg-mot dg-pale">${esc(d.mots[0])}</span>
            <span class="dg-fleche" aria-hidden="true">→</span>
            <span class="dg-mot">${esc(d.mots[0])}</span></div>`
    },

    tourne: {
        nom: 'tourné d\'un quart de tour',
        lit: 'un mot a TOURNÉ',
        rendre: (d) => `<div class="dg-serie">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <span class="dg-mot dg-tourne">${esc(d.mots[0])}</span></div>`
    },

    tailles: {
        nom: 'deux tailles',
        // LE SENS EST LA MOITIÉ DE L'ÉNIGME, et c'est pour cela qu'il est dans
        // les données : grand → petit se lit « réduction », petit → grand se
        // lit « agrandissement ». Deux dispositions séparées auraient recopié
        // le même rendu pour en changer l'ordre.
        lit: 'le même mot est écrit en DEUX TAILLES — regarde dans quel sens',
        rendre: (d) => {
            const grandissant = d.sens === 'agrandissement';
            const a = grandissant ? 'dg-petit' : 'dg-grand';
            const b = grandissant ? 'dg-grand' : 'dg-petit';
            return `<div class="dg-serie dg-serie--bas">
            <span class="dg-mot ${a}">${esc(d.mots[0])}</span>
            <span class="dg-fleche" aria-hidden="true">→</span>
            <span class="dg-mot ${b}">${esc(d.mots[0])}</span></div>`;
        }
    },

    // ── Ce qu'on fait au mot lui-même ──────────────────────────────────────

    ecarte: {
        nom: 'lettres écartées',
        lit: 'les lettres sont ÉCARTÉES les unes des autres',
        rendre: (d) => `<div class="dg-ecarte">${
            lettres(d.mots[0]).map(l => `<span class="dg-mot">${esc(l)}</span>`).join('')}</div>`
    },

    serre: {
        nom: 'lettres serrées',
        lit: 'les lettres sont SERRÉES les unes contre les autres',
        rendre: (d) => `<div class="dg-serre"><span class="dg-mot">${esc(d.mots[0])}</span></div>`
    },

    coupe: {
        nom: 'coupé en deux',
        lit: 'un mot est COUPÉ',
        rendre: (d) => `<div class="dg-serie">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <span class="dg-coupure" aria-hidden="true"></span>
            <span class="dg-mot">${esc(d.mots[1] || '')}</span></div>`
    },

    manque: {
        nom: 'une lettre manque',
        lit: 'il MANQUE quelque chose au mot — regarde quoi',
        rendre: (d) => `<div class="dg-serie"><span class="dg-mot">${
            lettres(d.mots[0]).map((l, i) => (i === d.ou
                ? `<span class="dg-trou">${esc(l)}</span>` : esc(l))).join('')}</span></div>`
    },

    desordre: {
        nom: 'lettres en désordre',
        lit: 'les lettres sont EN DÉSORDRE',
        // L'ORDRE EST ÉCRIT DANS LES DONNÉES, il n'est pas tiré au sort : une
        // énigme qui change de forme à chaque affichage n'est plus la même
        // énigme, et l'élève qui revient sur sa feuille ne la reconnaît pas.
        rendre: (d) => `<div class="dg-desordre">${
            lettres(d.melange || d.mots[0]).map((l, i) => `<span class="dg-mot"
                style="--dg-tour:${(i % 2 ? 1 : -1) * (6 + (i * 5) % 14)}deg;--dg-haut:${
    ((i * 7) % 12) - 6}px">${esc(l)}</span>`).join('')}</div>`
    },

    // ── Les positions dans une suite ───────────────────────────────────────

    rang: {
        nom: 'un mot à une place précise dans une file',
        lit: 'regarde à QUELLE PLACE se trouve le mot mis en avant',
        rendre: (d) => `<div class="dg-serie">${
            d.mots.map((m, i) => `<span class="dg-mot${
                i === d.ou ? ' dg-vedette' : ' dg-pale'}">${esc(m)}</span>`).join('')}</div>`
    },

    entre: {
        nom: 'entre deux autres',
        lit: 'un mot est ENTRE deux autres',
        rendre: (d) => `<div class="dg-serie">
            <span class="dg-mot dg-pale">${esc(d.mots[1])}</span>
            <span class="dg-mot dg-vedette">${esc(d.mots[0])}</span>
            <span class="dg-mot dg-pale">${esc(d.mots[2] || d.mots[1])}</span></div>`
    },

    exposant: {
        nom: 'écrit en exposant',
        lit: 'quelque chose est écrit EN HAUT, en petit',
        rendre: (d) => `<div class="dg-serie dg-serie--bas">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <sup class="dg-mot dg-petit">${esc(d.mots[1])}</sup></div>`
    },

    indice: {
        nom: 'écrit en indice',
        lit: 'quelque chose est écrit EN BAS, en petit',
        rendre: (d) => `<div class="dg-serie dg-serie--bas">
            <span class="dg-mot">${esc(d.mots[0])}</span>
            <sub class="dg-mot dg-petit">${esc(d.mots[1])}</sub></div>`
    },

    // ── Et le brut : on écrit, et c'est la LECTURE qui fait tout ──────────

    tel: {
        nom: 'écrit tel quel',
        lit: 'tout est écrit — c\'est ce qu\'on LIT à voix haute qui compte',
        rendre: (d) => `<div class="dg-serie">${
            d.mots.map(m => `<span class="dg-mot">${esc(m)}</span>`).join('')}</div>`
    },

    // ── Et la vingt-deuxième : celle dont le dessin vient des DONNÉES ──────
    //
    // LES VINGT-ET-UNE AU-DESSUS SONT DES TOURNURES, écrites une fois pour
    // toutes : « un mot DANS une forme » dessine toujours la même chose, et
    // c'est ce qui les rend vérifiables et explicables. Celle-ci est l'inverse :
    // elle ne connaît aucune tournure, elle pose ce qu'on lui donne.
    //
    // Rémy : « qqch pour éditer des dingbats et les transformer en json.
    // Globalement un éditeur de lettre où on peut choisir l'orientation la
    // couleur rajouter des traits des formes. » Aucune liste de tournures ne
    // couvre le geste de quelqu'un qui INVENTE un dessin — c'est justement
    // pourquoi il demandait un éditeur, et pas vingt dispositions de plus.
    //
    // Le dessin vit dans `core/dingbatLibre.js`, en SVG : poser librement
    // demande un système de coordonnées et une rotation autour d'un point, que
    // le HTML ne donne qu'en réécrivant le SVG en moins bien.
    libre: {
        nom: 'une composition libre',
        // CE QUE L'INDICE PEUT DIRE, ET PAS PLUS. Il serait tentant de décrire la
        // scène — « le mot MOITIÉ coupé en deux » — mais la description nomme les
        // mots, et un mot de la scène EST parfois la réponse : l'indice la
        // donnerait. `indices()` l'interdit et l'épreuve le vérifie, donc cette
        // phrase reste générale à dessein.
        lit: 'des mots posés, orientés, entourés — c\'est leur DISPOSITION qui se lit',
        rendre: (d) => rendreLibre(d)
    }
};

/**
 * LE DESSIN D'UNE ÉNIGME.
 *
 * @param {object} d  l'énigme, telle qu'elle est écrite dans `data/dingbats.js`
 * @returns {string}  du HTML, et rien d'autre : ce module ne touche pas au document
 */
export function dessiner(d) {
    const forme = DISPOSITIONS[d && d.forme];
    // ON JETTE PLUTÔT QUE DE RENDRE UNE BOÎTE VIDE. Une disposition inconnue
    // donnerait une énigme muette — c'est-à-dire la même chose qu'un logiciel
    // cassé, et l'élève chercherait la réponse d'un dessin qui n'existe pas.
    if (!forme) throw new Error(`dingbat « ${d && d.id} » : disposition inconnue « ${d && d.forme} »`);
    return `<div class="dg-scene dg-scene--${esc(d.forme)}">${forme.rendre(d)}</div>`;
}

// ── JUGER LA RÉPONSE ────────────────────────────────────────────────────────
//
// UN DINGBAT SE RÉPOND EN FRANÇAIS, et le français s'écrit de vingt façons.
// « racine carrée », « la racine carrée », « racine carree », « Racine Carrée »
// sont la même réponse, et refuser la troisième à un élève qui n'a pas trouvé
// l'accent sur son clavier serait corriger le clavier plutôt que les
// mathématiques — la règle de la maison, écrite dans `opposeParentheses.js`.
//
// ON NE TOLÈRE PAS TOUT POUR AUTANT : le PLURIEL est accepté, les ARTICLES sont
// facultatifs, mais un mot différent reste un mot différent. « droites
// parallèles » n'est pas « droites perpendiculaires », et c'est justement ce que
// le jeu enseigne.

/** Les articles qu'on laisse tomber : ils ne disent rien de la réponse. */
const ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l'];

/**
 * RAMENER UNE RÉPONSE À SA FORME NUE.
 *
 * Sans accents, sans ponctuation, sans articles, sans pluriels, en un seul mot.
 * C'est volontairement brutal : ce qui distingue deux réponses de ce jeu, ce
 * sont les RACINES des mots, jamais leur orthographe de surface.
 */
export function normaliser(texte) {
    const nu = String(texte == null ? '' : texte)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // les accents partent
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .replace(/['-]/g, ' ');
    return nu.split(/\s+/)
        .filter(Boolean)
        .filter(m => !ARTICLES.includes(m))
        // LE PLURIEL EST LE MÊME MOT. « droites paralleles » et « droite
        // parallele » disent la même chose ; exiger l'un des deux serait une
        // question d'orthographe posée au milieu d'une question de géométrie.
        .map(m => (m.length > 3 && m.endsWith('s') ? m.slice(0, -1) : m))
        .join('');
}

/**
 * LA RÉPONSE DONNÉE EST-ELLE L'UNE DES RÉPONSES ATTENDUES ?
 *
 * @param {string} donnee
 * @param {object} d        l'énigme (on lit `reponse` et `variantes`)
 */
export function juste(donnee, d) {
    const n = normaliser(donnee);
    if (!n) return false;
    return attendues(d).some(a => normaliser(a) === n);
}

/** Toutes les écritures acceptées d'une énigme, la principale en tête. */
export function attendues(d) {
    return [d.reponse, ...(d.variantes || [])].filter(Boolean);
}

/**
 * LES INDICES, DU PLUS DISCRET AU PLUS PARLANT.
 *
 * TROIS MARCHES, ET LA PREMIÈRE NE DIT RIEN DE LA RÉPONSE : elle nomme le
 * GESTE. C'est la seule façon d'aider sans résoudre — l'élève qui lit « un mot
 * est enfermé DANS une forme » sait quoi regarder, pas quoi répondre.
 *
 * LA DERNIÈRE DONNE LA PREMIÈRE LETTRE ET LE NOMBRE DE MOTS, jamais la réponse
 * entière : `itemSession` tient déjà la règle « on ne donne pas la réponse tant
 * qu'il lui reste un essai », et un indice qui la donnerait la contournerait.
 */
export function indices(d) {
    const forme = DISPOSITIONS[d.forme];
    const mots = String(d.reponse).trim().split(/\s+/);
    const suite = [];
    // UN INDICE OU PLUSIEURS, ET LES DEUX ÉCRITURES COHABITENT.
    //
    // Rémy : « et on peut mettre des indices ». Les cent neuf énigmes écrites à
    // la main n'en portent qu'un, nommé `aide`, et les réécrire toutes pour
    // ajouter un « s » serait cent neuf lignes changées pour rien. Celles qui
    // sortent de l'atelier en portent autant qu'il veut, sous `aides`.
    //
    // L'ORDRE EST CELUI QU'IL A ÉCRIT : du plus discret au plus parlant, comme
    // la suite entière. Un indice qui donnerait trop tôt casserait la marche.
    const siennes = Array.isArray(d.aides) ? d.aides : (d.aide ? [d.aide] : []);
    siennes.map(x => String(x == null ? '' : x).trim()).filter(Boolean)
        .forEach(x => suite.push(x));
    if (forme) suite.push(`Ce qu'il faut voir : ${forme.lit}.`);
    suite.push(mots.length === 1
        ? `La réponse est UN seul mot, et il commence par « ${mots[0][0].toUpperCase()} ».`
        : `La réponse a ${mots.length} mots. Le premier commence par « ${
            mots[0][0].toUpperCase()} », le dernier par « ${
            mots[mots.length - 1][0].toUpperCase()} ».`);
    return suite;
}

// ── LE CHOIX DES ÉNIGMES ────────────────────────────────────────────────────

/** Les thèmes, et leur nom à l'écran. Rémy : « dans les réglages on peut avoir le choix. » */
export const THEMES = [
    { id: 'maths', label: 'Mathématiques' },
    { id: 'general', label: 'Culture générale' }
];

/** Les niveaux, du plus simple au plus retors. Rémy : « classe aussi par niveau ». */
export const NIVEAUX = [
    { id: 1, nom: '1. Pour commencer' },
    { id: 2, nom: '2. Il faut regarder' },
    { id: 3, nom: '3. Il faut chercher' },
    { id: 4, nom: '4. Les coriaces' }
];

/**
 * CHOISIR LES ÉNIGMES QUI CONVIENNENT, et dire NON plutôt que de mentir.
 *
 * Un professeur qui coche « niveau 4 » et « culture générale » peut tomber sur
 * un lot vide. On rend alors un tableau vide, et c'est à l'appelant de le dire —
 * jamais de retomber en douce sur autre chose : un réglage qui ne fait pas ce
 * qu'il annonce est pire qu'un réglage absent.
 */
export function choisir(toutes, { themes = ['maths'], niveaux = null } = {}) {
    return toutes.filter(d => themes.includes(d.theme)
        && (!niveaux || !niveaux.length || niveaux.includes(d.niveau)));
}
