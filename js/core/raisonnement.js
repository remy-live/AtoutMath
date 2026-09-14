// LES TROIS TEMPS D'UNE JUSTIFICATION — le schéma que l'élève doit imprimer.
//
// Rémy : « Dans mon cours, je fais je sais que, or et donc. Ça pourrait être un
// moteur commun et au niveau de la présentation, mettre des couleurs et garder
// une cohérence. » Puis, sans ambiguïté : « il faut avoir le Je sais que : /
// Or : / Donc : . Il faut que l'élève imprime ce schéma. »
//
// C'EST UN SCHÉMA, PAS UNE MISE EN FORME. Un élève de sixième qui rédige une
// justification ne bute pas sur la géométrie : il bute sur l'ORDRE. Il conclut
// avant d'avoir cité la propriété, ou il cite la propriété sans jamais dire ce
// qu'il lit sur la figure. Les trois amorces imprimées ne sont pas un gabarit
// de présentation — elles sont l'exercice. C'est pourquoi elles sont TOUJOURS
// là, TOUJOURS dans cet ordre, et TOUJOURS écrites pareil.
//
// D'OÙ CE MODULE. Les droites parallèles, Pythagore et Thalès rédigeaient
// chacun les leurs : « Je sais que : » avec deux-points ici, « Je sais que »
// sans rien là, en gris d'un côté, en noir de l'autre. Trois chapitres, trois
// présentations — donc, pour l'élève, trois choses à reconnaître au lieu d'une.
// Le schéma ne s'imprime que s'il est identique partout.
//
// CE QUE CHAQUE CHAPITRE GARDE. Le nombre de lignes à écrire : la propriété des
// droites parallèles tient en trois lignes, le calcul de Pythagore en quatre.
// Ce module porte les MOTS et les COULEURS ; les chapitres portent la place.
//
// Aucun DOM, aucune dépendance : on rend des données, l'écran et le PDF les
// dessinent chacun à leur façon.

/**
 * Les trois temps, dans l'ordre — et l'ordre est le fond du sujet.
 *
 * LES COULEURS SONT CHOISIES POUR LA PHOTOCOPIE. Une feuille de maths finit en
 * noir et blanc dans la moitié des salles : les trois teintes sont donc prises
 * assez sombres pour rester lisibles une fois grisées, et l'amorce est en gras
 * — c'est le gras, pas la couleur, qui la détache sur une photocopie. La
 * couleur est un CONFORT quand elle survit, jamais l'information elle-même.
 */
export const ETAPES = [
    {
        id: 'sais',
        mot: 'Je sais que',
        // Bleu : ce qu'on LIT — les données de l'énoncé, les codages de la figure.
        rgb: [29, 78, 216],
        role: 'ce que dit l\'énoncé ou la figure, et rien de plus'
    },
    {
        id: 'or',
        mot: 'Or',
        // Rouge sombre : la propriété du COURS. C'est la ligne qu'on saute, et
        // celle qui vaut les points.
        rgb: [180, 52, 33],
        role: 'la propriété du cours, écrite en entier'
    },
    {
        id: 'donc',
        mot: 'Donc',
        // Vert : la conclusion, celle qui répond à la question posée.
        rgb: [21, 128, 61],
        role: 'la conclusion, qui répond à la question posée'
    }
];

/** Les trois temps par leur identifiant, pour un chapitre qui en cible un. */
export const ETAPE = Object.fromEntries(ETAPES.map(e => [e.id, e]));

/**
 * L'amorce imprimée. LE DEUX-POINTS EN FAIT PARTIE : Rémy l'écrit ainsi au
 * tableau, et « Or » tout seul en début de ligne ne se lit pas comme une amorce
 * à compléter — il se lit comme un mot oublié.
 */
export const amorce = (etape) => `${etape.mot} :`;

/** La couleur pour une feuille de style ou un attribut SVG. */
export const couleurCss = (etape) => `rgb(${etape.rgb.join(', ')})`;

/**
 * La place à laisser, temps par temps.
 *
 * @param {number[]} lignes  Une entrée par temps, dans l'ordre d'`ETAPES`.
 * @returns {{etape, mot, amorce, rgb, couleur, lignes, debut}[]}
 *   `debut` est le rang de la première ligne d'écriture du temps, ce dont la
 *   mise en page a besoin pour poser ses pointillés sans les recompter.
 */
export function trame(lignes) {
    const n = ETAPES.map((_, i) => Math.max(1, Math.round(Number(lignes?.[i]) || 1)));
    let debut = 0;
    return ETAPES.map((etape, i) => {
        const bloc = {
            etape: etape.id,
            mot: etape.mot,
            amorce: amorce(etape),
            rgb: etape.rgb,
            couleur: couleurCss(etape),
            lignes: n[i],
            debut
        };
        debut += n[i];
        return bloc;
    });
}

/** Le nombre total de lignes d'écriture d'une trame. */
export const totalLignes = (lignes) => trame(lignes).reduce((t, b) => t + b.lignes, 0);

/**
 * La justification rédigée d'un bout à l'autre, pour un corrigé ou une
 * explication. On la fabrique ICI pour que le corrigé emploie exactement les
 * mots que la feuille a imprimés.
 *
 * @param {string[]} contenus  Un texte par temps, dans l'ordre d'`ETAPES`.
 */
export function rediger(contenus) {
    return ETAPES
        .map((e, i) => `${amorce(e)} ${String(contenus?.[i] ?? '').trim()}`)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
