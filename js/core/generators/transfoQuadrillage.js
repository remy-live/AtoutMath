// TRACER L'IMAGE D'UNE FIGURE SUR LE QUADRILLAGE.
//
// Rémy, sur sa fiche de 4ᵉ : « je ne suis pas très chaud pour la géométrie
// [aux instruments], il faut les manipuler en vrai, pas à l'ordi. Je suis pour
// le quadrillage. » Cet exercice est la moitié de sa fiche : les exercices ②,
// ④, ⑥, ⑩, ⑪ et ⑫ demandent tous la même chose — une figure, une
// transformation, dessine l'image.
//
// AUX CARREAUX, UNE RÉPONSE EST JUSTE OU FAUSSE. C'est ce qui rend l'exercice
// corrigeable sans jamais mentir : pas de tolérance à régler, pas de « c'est
// presque ça » à trancher. Au compas, il faudrait décider à quelle distance un
// trait est encore bon, et ce débat n'a pas sa place devant un élève.
//
// CE QUE LE GÉNÉRATEUR REFUSE DE PRODUIRE, et pourquoi :
//
//   · une image qui SORT du quadrillage — l'élève n'aurait nulle part où la
//     poser, et croirait s'être trompé ;
//   · une image qui CHEVAUCHE la figure de départ — on ne saurait plus quelle
//     case appartient à quoi, ni sur le dessin ni dans la tête ;
//   · une image ÉGALE à la figure de départ — cela arrive dès que la figure a
//     elle-même la symétrie demandée, et la question n'a alors plus d'objet ;
//   · une figure NON CONNEXE — un tas de cases éparses ne se retient pas, et
//     la contrôler case par case devient un exercice de patience.
//
// La difficulté ne vient pas de la taille du quadrillage mais de la NATURE de
// la transformation, et l'ordre est celui du collège : l'axe vertical d'abord
// (on compte à gauche, on reporte à droite), puis l'horizontal, puis la
// translation, puis le centre, puis l'axe oblique, et le quart de tour en
// dernier — c'est celui qui résiste le plus longtemps.

import { makeItem } from '../items.js';
import {
    NOMS, appliquer, cleFigure, direVecteur, imageFigure, memeFigure, nommerAxe
} from '../transformations.js';
import { quadrillageSvg } from '../quadrillageSvg.js';
import { figure } from '../figures.js';

/** Les genres proposables, du plus abordable au plus coriace. */
export const GENRES = ['axiale', 'translation', 'centrale', 'rotation'];

/**
 * LE RÉGLAGE, QUELLE QUE SOIT LA FORME SOUS LAQUELLE IL ARRIVE.
 *
 * Un réglage à choix multiples vaut normalement un tableau. Il n'en vaut pas
 * toujours un : un `type` mal orthographié dans le manifeste faisait rendre au
 * panneau un simple champ de texte, qui renvoyait « axiale,translation » — et
 * `.filter` sur une chaîne lève une TypeError. L'exercice ne s'affichait plus
 * du tout, ni à l'écran ni sur la feuille, sans le moindre message.
 *
 * Le type est corrigé ; cette fonction reste, parce qu'un générateur ne doit
 * pas disparaître pour une virgule. Un réglage vide ou incompréhensible
 * retombe sur les quatre transformations : mieux vaut une question de trop
 * qu'un écran blanc.
 */
export function listeDeGenres(brut) {
    const liste = Array.isArray(brut) ? brut
        : (typeof brut === 'string' ? brut.split(',') : []);
    const gardes = liste.map(g => String(g).trim()).filter(g => GENRES.includes(g));
    return gardes.length ? gardes : [...GENRES];
}

const DIFFICULTE = { axiale: 2, translation: 2, centrale: 3, rotation: 4 };

const TAILLES = {
    petit: { l: 8, h: 8, cases: 4 },
    moyen: { l: 10, h: 10, cases: 5 },
    grand: { l: 12, h: 12, cases: 6 }
};

// --- La figure de départ ------------------------------------------------------

const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Un polyomino de `n` cases, tiré au hasard mais TOUJOURS D'UN SEUL TENANT.
 *
 * On part d'une case et on croît par les bords : c'est la façon la plus courte
 * de garantir la connexité, et elle donne les formes anguleuses des fiches —
 * des L, des T, des escaliers — plutôt que des pavés réguliers, qui ont trop
 * de symétries pour faire un bon exercice.
 */
export function figureAuHasard(rng, n, boite) {
    const cases = [{ x: rng.int(boite.x0, boite.x1), y: rng.int(boite.y0, boite.y1) }];
    const vues = new Set([`${cases[0].x}|${cases[0].y}`]);
    let garde = 0;
    while (cases.length < n && garde++ < 400) {
        const base = rng.pick(cases);
        const [dx, dy] = rng.pick(VOISINS);
        const p = { x: base.x + dx, y: base.y + dy };
        if (p.x < boite.x0 || p.x > boite.x1 || p.y < boite.y0 || p.y > boite.y1) continue;
        const k = `${p.x}|${p.y}`;
        if (vues.has(k)) continue;
        vues.add(k);
        cases.push(p);
    }
    return cases;
}

const bornes = (f) => ({
    x0: Math.min(...f.map(p => p.x)), x1: Math.max(...f.map(p => p.x)),
    y0: Math.min(...f.map(p => p.y)), y1: Math.max(...f.map(p => p.y))
});

const dansLaGrille = (f, L, H) =>
    f.every(p => Number.isInteger(p.x) && Number.isInteger(p.y)
        && p.x >= 0 && p.x < L && p.y >= 0 && p.y < H);

const disjointes = (a, b) => {
    const vues = new Set(a.map(p => `${p.x}|${p.y}`));
    return b.every(p => !vues.has(`${p.x}|${p.y}`));
};

// --- La transformation --------------------------------------------------------

/**
 * Une transformation candidate, tirée AUTOUR de la figure.
 *
 * On ne tire pas au hasard dans tout le quadrillage : un axe posé à l'autre
 * bout enverrait l'image dehors une fois sur deux, et l'on tournerait
 * longtemps avant de tomber sur une question valable. On la tire donc là où
 * elle a une chance d'aboutir — juste à côté de la figure —, et l'on vérifie
 * ensuite.
 */
function transfoAuHasard(rng, genre, f, L, H, obliques) {
    const b = bornes(f);
    // Un axe se pose SUR une colonne, ou ENTRE deux colonnes : ce demi-carreau
    // d'écart est exactement ce qui distingue les deux cas, et les deux se
    // rencontrent en classe. Le premier laisse une colonne vide au milieu, le
    // second colle l'image contre la figure.
    const demi = () => (rng.bool() ? 0 : 0.5);

    if (genre === 'axiale') {
        // L'AXE OBLIQUE EST UN AUTRE EXERCICE, et il se règle à part.
        //
        // Face à un axe vertical, on compte des colonnes ; face à une diagonale
        // à 45°, on ne compte plus ni lignes ni colonnes, et l'élève qui a
        // compris le miroir droit se retrouve sans méthode. En sixième, la
        // symétrie axiale s'apprend sur les axes droits ; l'oblique arrive
        // après, et le professeur choisit quand.
        const type = rng.pick(obliques ? ['v', 'v', 'h', 'h', 'd', 'a'] : ['v', 'h']);
        if (type === 'v') {
            return { genre, axe: { type, a: rng.bool() ? b.x1 + 1 - demi() : b.x0 - 1 + demi() } };
        }
        if (type === 'h') {
            return { genre, axe: { type, a: rng.bool() ? b.y1 + 1 - demi() : b.y0 - 1 + demi() } };
        }
        // Les obliques passent près d'un coin de la figure, décalées d'un
        // carreau ou deux pour que l'image ne la recouvre pas.
        const d = rng.int(1, 2);
        if (type === 'd') return { genre, axe: { type, a: (b.y0 - b.x0) + (rng.bool() ? d : -d) } };
        return { genre, axe: { type, a: (b.y0 + b.x1) + (rng.bool() ? d : -d) } };
    }

    if (genre === 'translation') {
        // Un vecteur nul ne translate rien : on repousse la figure du côté où
        // il reste de la place.
        let dx = rng.pick([-1, 0, 1]) * rng.int(2, 5);
        let dy = rng.pick([-1, 0, 1]) * rng.int(2, 5);
        if (!dx && !dy) dx = b.x0 > L / 2 ? -3 : 3;
        void H;
        return { genre, vecteur: { x: dx, y: dy } };
    }

    if (genre === 'centrale') {
        // Le centre tombe souvent au MILIEU d'une case ou sur un coin : les
        // deux sont au programme, et les demi-carreaux sont exacts.
        const x = rng.pick([b.x1 + 1, b.x0 - 1, b.x1 + 0.5, b.x0 - 0.5]);
        const y = rng.pick([b.y1 + 1, b.y0 - 1, b.y1 + 0.5, b.y0 - 0.5, (b.y0 + b.y1) / 2]);
        return { genre, centre: { x, y } };
    }

    // La rotation : un quart de tour, jamais un demi — un demi-tour EST une
    // symétrie centrale, et la question aurait deux bonnes réponses.
    const x = rng.pick([b.x0 - 1, b.x1 + 1, b.x0, b.x1]);
    const y = rng.pick([b.y0 - 1, b.y1 + 1, b.y0, b.y1]);
    return { genre: 'rotation', centre: { x, y }, quarts: rng.bool() ? 1 : 3 };
}

/**
 * Une question complète, ou `null` si ce tirage-là ne donne rien de propre.
 * L'appelant retente : c'est plus court, et surtout plus lisible, que de
 * tordre le tirage jusqu'à ce qu'il ne puisse plus échouer.
 */
export function tirerQuestion(rng, { genre, l, h, cases, obliques = true }) {
    const marge = 1;
    const depart = figureAuHasard(rng, cases, {
        x0: marge, x1: l - 1 - marge, y0: marge, y1: h - 1 - marge
    });
    if (depart.length < cases) return null;

    const t = transfoAuHasard(rng, genre, depart, l, h, obliques);
    const image = imageFigure(depart, t);

    if (!dansLaGrille(image, l, h)) return null;
    if (!disjointes(depart, image)) return null;
    // Une figure qui a déjà la symétrie demandée se retrouve sur elle-même :
    // la question n'aurait plus d'objet.
    if (memeFigure(depart, image)) return null;

    return { depart, image, transfo: t };
}

// --- Les mots -----------------------------------------------------------------

/** La consigne, dans les termes de la fiche de Rémy. */
export function consigneDe(t) {
    if (t.genre === 'axiale') {
        return `Colorie l'image de la figure bleue par la symétrie d'axe (d).`;
    }
    if (t.genre === 'centrale') {
        return `Colorie l'image de la figure bleue par la symétrie de centre O.`;
    }
    if (t.genre === 'translation') {
        return `Colorie l'image de la figure bleue par la translation qui la fait glisser de `
            + `${direVecteur(t.vecteur)}.`;
    }
    return `Colorie l'image de la figure bleue par le quart de tour `
        + `${t.quarts === 1 ? 'vers la gauche' : 'vers la droite'} autour de O.`;
}

/** L'aide qui apprend la MÉTHODE, pas la réponse. */
function indices(t) {
    if (t.genre === 'axiale') {
        const axe = t.axe.type;
        if (axe === 'v' || axe === 'h') {
            const sens = axe === 'v' ? 'horizontalement' : 'verticalement';
            return [
                `Prends les cases UNE PAR UNE. Pour chacune, compte les carreaux qui la séparent de l'axe.`,
                `Reporte le même nombre de carreaux de l'autre côté de l'axe, ${sens}.`,
                `La case la plus proche de l'axe devient la plus proche de l'autre côté : le miroir INVERSE l'ordre.`
            ];
        }
        return [
            'Sur un axe oblique à 45°, on ne compte plus en lignes ni en colonnes : on compte EN DIAGONALE.',
            'Pour chaque case, avance en diagonale jusqu\'à l\'axe, puis continue du même nombre de pas de l\'autre côté.',
            'Une astuce sûre : un axe à 45° ÉCHANGE la ligne et la colonne. Ce qui était couché devient debout.'
        ];
    }
    if (t.genre === 'centrale') {
        return [
            'Le demi-tour : chaque case part vers le centre O, et continue de l\'autre côté, de la même distance.',
            `Compte pour chaque case : combien de carreaux à droite ou à gauche de O ? combien au-dessus ou au-dessous ? Puis reporte à l'opposé.`,
            'La figure se retrouve à l\'ENVERS dans les deux sens à la fois — c\'est ce qui la distingue du miroir.'
        ];
    }
    if (t.genre === 'translation') {
        return [
            `Toutes les cases font le MÊME déplacement : ${direVecteur(t.vecteur)}.`,
            'Commence par une seule case, déplace-la, puis redessine la figure autour d\'elle : elle ne change ni de forme ni de sens.',
            'La translation ne retourne rien et ne tourne rien : la figure garde exactement son allure.'
        ];
    }
    return [
        'Un quart de tour fait basculer la figure : ce qui était couché se met debout.',
        `Prends la case la plus proche de O : à combien de carreaux est-elle, en largeur puis en hauteur ? Après un quart de tour, ces deux nombres S'ÉCHANGENT.`,
        `On tourne ${t.quarts === 1 ? 'vers la gauche' : 'vers la droite'} : suis la flèche autour de O.`
    ];
}

/**
 * La correction : ce qu'il fallait faire, et où.
 *
 * Les cases sont données EN COLONNE ET LIGNE COMPTÉES À PARTIR DE 1 — c'est
 * ainsi qu'on les désigne à voix haute devant une grille (« troisième colonne,
 * deuxième ligne »), et non par les indices du programme, qui commencent à
 * zéro et ne veulent rien dire pour un élève.
 */
function explication(t, image) {
    const ou = [...image]
        .sort((a, b) => (a.y - b.y) || (a.x - b.x))
        .map(p => `(${p.x + 1} ; ${p.y + 1})`).join(', ');
    const quoi = t.genre === 'axiale' ? `par rapport à ${nommerAxe(t.axe)}`
        : t.genre === 'centrale' ? 'par rapport au centre O'
            : t.genre === 'translation' ? `en glissant de ${direVecteur(t.vecteur)}`
                : `d'un quart de tour ${t.quarts === 1 ? 'vers la gauche' : 'vers la droite'} autour de O`;
    return `L'image se trace ${quoi}. Elle occupe les cases ${ou} `
        + '(colonne ; ligne, en comptant à partir de 1).';
}

// --- Le générateur ------------------------------------------------------------

export const transfoQuadrillageGenerator = {
    id: 'geo.transfo.quadrillage',
    label: 'Tracer l\'image sur le quadrillage',
    skills: ['geo.transfo.axiale', 'geo.transfo.centrale', 'geo.transfo.translation', 'geo.transfo.rotation'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'genres', type: 'multiselect', label: 'Transformations', default: [...GENRES],
            options: GENRES.map(g => ({ value: g, label: NOMS[g] }))
        },
        {
            id: 'obliques', type: 'checkbox', label: 'Autoriser les axes obliques (à 45°)',
            default: true,
            aide: 'Devant un axe vertical, on compte des colonnes. Devant une diagonale, '
                + 'on ne compte plus ni lignes ni colonnes, et la méthode apprise ne sert '
                + 'plus : c\'est un autre exercice. En sixième, décochez.'
        },
        {
            id: 'taille', type: 'select', label: 'Le quadrillage', default: 'moyen',
            options: [
                { value: 'petit', label: '8 × 8 — figures de 4 cases' },
                { value: 'moyen', label: '10 × 10 — figures de 5 cases' },
                { value: 'grand', label: '12 × 12 — figures de 6 cases' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const genres = listeDeGenres(p.genres);
        const t = TAILLES[p.taille] || TAILLES.moyen;
        const obliques = p.obliques !== false;

        const genre = rng.pick(genres);

        // On retente jusqu'à tomber sur une question propre ; si le genre tiré
        // n'aboutit décidément pas dans ce quadrillage, on retombe sur la
        // symétrie axiale, qui aboutit toujours.
        let q = null;
        for (let i = 0; i < 60 && !q; i++) {
            q = tirerQuestion(rng, { genre, l: t.l, h: t.h, cases: t.cases, obliques });
        }
        for (let i = 0; i < 60 && !q; i++) {
            q = tirerQuestion(rng, { genre: 'axiale', l: t.l, h: t.h, cases: t.cases, obliques });
        }
        if (!q) {
            // Dernier recours, entièrement déterministe : un L translaté.
            const depart = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }];
            const transfo = { genre: 'translation', vecteur: { x: 4, y: 2 } };
            q = { depart, image: imageFigure(depart, transfo), transfo };
        }

        const consigne = consigneDe(q.transfo);
        // L'ancre de la flèche : une case libre, en haut à gauche du
        // quadrillage, pour que le vecteur ne se confonde pas avec la figure.
        const ancre = q.transfo.genre === 'translation' ? ancreLibre(q, t) : null;

        const svg = quadrillageSvg({
            largeur: t.l, hauteur: t.h,
            figures: [{ cases: q.depart, classe: 'qd-depart' }],
            transfo: q.transfo, ancre
        });

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.transfo.quadrillage',
            skillId: `geo.transfo.${q.transfo.genre}`,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                html: `<div class="game-question">${consigne}</div>${figure(svg)}`,
                papier: consigne
            },
            answer: cleFigure(q.image),
            hints: indices(q.transfo),
            explanation: explication(q.transfo, q.image),
            difficulty: DIFFICULTE[q.transfo.genre] || 2,
            meta: {
                largeur: t.l, hauteur: t.h,
                depart: q.depart, image: q.image,
                transfo: q.transfo, ancre,
                genre: q.transfo.genre
            }
        });
    }
};

/**
 * Où poser la flèche du vecteur.
 *
 * La première case libre venue ne suffit pas : la flèche est un SEGMENT, et
 * celle qu'on obtenait en balayant depuis le coin traversait la zone où l'élève
 * doit dessiner. On garde donc, parmi toutes les positions dont les deux bouts
 * tiennent dans le quadrillage, celle dont le TRAJET ENTIER passe le plus loin
 * des deux figures — c'est un simple maximum, et il suffit.
 */
function ancreLibre(q, t) {
    const v = q.transfo.vecteur;
    const cases = [...q.depart, ...q.image];
    const l = Math.max(Math.abs(v.x), Math.abs(v.y)) || 1;

    let meilleure = { x: 0, y: 0 }, mieux = -1;
    for (let y = 0; y < t.h; y++) {
        for (let x = 0; x < t.l; x++) {
            const bx = x + v.x, by = y + v.y;
            if (bx < 0 || bx >= t.l || by < 0 || by >= t.h) continue;
            // La distance du trajet aux figures : on échantillonne le segment
            // case par case, et l'on retient son point le plus exposé.
            let pire = Infinity;
            for (let i = 0; i <= l; i++) {
                const px = x + (v.x * i) / l, py = y + (v.y * i) / l;
                cases.forEach(c => {
                    pire = Math.min(pire, Math.abs(c.x - px) + Math.abs(c.y - py));
                });
            }
            if (pire > mieux) { mieux = pire; meilleure = { x, y }; }
        }
    }
    return meilleure;
}

/**
 * L'image attendue, recalculée depuis les données de l'item.
 *
 * Le robot en a besoin case par case pour montrer le tracé, et la recalculer
 * vaut mieux que la recopier : si un jour la transformation change de forme,
 * c'est le noyau qui tranche, pas une liste figée dans un `meta`.
 */
export function imageAttendue(meta) {
    return (meta.depart || []).map(p => appliquer(p, meta.transfo));
}
