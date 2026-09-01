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
    NOMS, appliquer, cleFigure, direLeSens, direVecteur, imageFigure, memeFigure,
    nommerAxe
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
    // TOUT SE POSE SUR LES TRAITS DU QUADRILLAGE, jamais au milieu d'une case.
    //
    // Rémy : « peux-tu faire que l'axe ou le point ait leur origine sur des
    // intersections du quadrillage ». Un axe qui coupait une colonne en deux
    // et un centre posé au milieu d'un carreau sont justes mathématiquement,
    // mais on ne les trace pas ainsi sur un cahier : on suit les traits. Et
    // surtout ils se COMPTENT mal — « à deux carreaux et demi de l'axe » n'est
    // pas ce qu'on veut faire dire à un élève de sixième.
    //
    // En coordonnées de case, un trait du quadrillage est un demi-entier : la
    // case `a` a son centre en `a`, donc le trait à sa droite est en `a + 0,5`.
    // C'est pourquoi tout ce qui suit est décalé d'un demi.
    const ecart = () => rng.int(0, 2);

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
            return { genre, axe: { type, a: rng.bool() ? b.x1 + 0.5 + ecart() : b.x0 - 0.5 - ecart() } };
        }
        if (type === 'h') {
            return { genre, axe: { type, a: rng.bool() ? b.y1 + 0.5 + ecart() : b.y0 - 0.5 - ecart() } };
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

    // Le centre se pose sur un NŒUD du quadrillage — le croisement de deux
    // traits —, donc en demi-entiers dans le repère des cases.
    const noeudX = () => rng.pick([b.x1 + 0.5, b.x0 - 0.5, b.x1 - 0.5, b.x0 + 0.5]) + rng.pick([0, 1, -1]);
    const noeudY = () => rng.pick([b.y1 + 0.5, b.y0 - 0.5, b.y1 - 0.5, b.y0 + 0.5]) + rng.pick([0, 1, -1]);

    if (genre === 'centrale') {
        return { genre, centre: { x: noeudX(), y: noeudY() } };
    }

    // La rotation : un quart de tour, jamais un demi — un demi-tour EST une
    // symétrie centrale, et la question aurait deux bonnes réponses.
    return {
        genre: 'rotation',
        centre: { x: noeudX(), y: noeudY() },
        quarts: rng.bool() ? 1 : 3
    };
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

/**
 * La consigne, dans les termes de la fiche de Rémy.
 *
 * `motsDuVecteur` à faux fait TAIRE le déplacement : la flèche devient alors la
 * seule donnée. Sur un exercice qui mêle les quatre transformations, les mots
 * sont indispensables — il faut d'abord reconnaître de laquelle il s'agit. Sur
 * un exercice de translations SEULES, ils rendent la flèche décorative : on lit
 * « 2 carreaux vers la gauche », on compte, et l'on n'a jamais regardé le
 * dessin. Or c'est précisément lire la flèche qu'on veut faire travailler.
 */
export function consigneDe(t, { motsDuVecteur = true } = {}) {
    if (t.genre === 'axiale') {
        return `Colorie l'image de la figure bleue par la symétrie d'axe (d).`;
    }
    if (t.genre === 'centrale') {
        return `Colorie l'image de la figure bleue par la symétrie de centre O.`;
    }
    if (t.genre === 'translation') {
        if (!motsDuVecteur) {
            return 'Colorie l\'image de la figure bleue par la translation que montre '
                + 'la flèche rouge.';
        }
        return `Colorie l'image de la figure bleue par la translation qui la fait glisser de `
            + `${direVecteur(t.vecteur)}.`;
    }
    return 'Colorie l\'image de la figure bleue par le quart de tour dans '
        + `${direLeSens(t.quarts)}, autour de O.`;
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
        `On tourne dans ${direLeSens(t.quarts)} : suis la flèche autour de O.`
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
                : `d'un quart de tour dans ${direLeSens(t.quarts)} autour de O`;
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
            // Un axe, il n'y en a que dans la symétrie AXIALE. Sur une fiche de
            // translations et de rotations, ce bouton ne changeait rien.
            visibleSi: (r) => !r.genres || !r.genres.length || r.genres.includes('axiale'),
            aide: 'Devant un axe vertical, on compte des colonnes. Devant une diagonale, '
                + 'on ne compte plus ni lignes ni colonnes, et la méthode apprise ne sert '
                + 'plus : c\'est un autre exercice. En sixième, décochez.'
        },
        {
            id: 'motsDuVecteur', type: 'checkbox', label: 'Écrire le déplacement dans la consigne',
            default: true,
            visibleSi: (r) => !r.genres || !r.genres.length || r.genres.includes('translation'),
            aide: 'Décoché, la consigne dit seulement « la translation que montre la flèche » : '
                + 'la flèche devient la seule donnée. Coché, elle annonce « 2 carreaux vers la '
                + 'gauche et 2 vers le haut », et l\'élève peut compter sans jamais regarder le '
                + 'dessin. Gardez-le coché quand plusieurs transformations se mêlent — il faut '
                + 'd\'abord reconnaître laquelle —, décochez-le pour travailler la flèche.'
        },
        {
            id: 'fleche', type: 'select', label: 'D\'où part la flèche', default: 'melange',
            options: [
                { value: 'sommet', label: 'D\'un sommet de la figure' },
                { value: 'ailleurs', label: 'Posée ailleurs sur le quadrillage' },
                { value: 'melange', label: 'Les deux, en alternance' }
            ],
            // Une flèche, il n'y en a que dans la TRANSLATION.
            visibleSi: (r) => !r.genres || !r.genres.length || r.genres.includes('translation'),
            aide: 'Rémy : « j\'aimerais bien un exercice juste avec les translations où la '
                + 'flèche démarre d\'un sommet de la figure, puis après à un autre endroit. » '
                + 'Partant d\'un sommet, la flèche MONTRE où va ce sommet-là, et il n\'y a '
                + 'qu\'à recopier. Posée ailleurs, elle ne touche plus rien : il faut avoir '
                + 'compris qu\'un vecteur est un déplacement, pas un trajet entre deux points '
                + 'précis. C\'est la marche la plus difficile de la translation.'
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

        const consigne = consigneDe(q.transfo, { motsDuVecteur: p.motsDuVecteur !== false });
        // OÙ PART LA FLÈCHE. Sur un mélange, l'alternance suit le rang de la
        // question et non un tirage : deux questions de suite au même endroit
        // n'apprennent rien de plus qu'une, et l'élève doit VOIR la différence
        // entre les deux poses pour comprendre ce qu'elle change.
        const depuisSommet = p.fleche === 'sommet'
            || (p.fleche !== 'ailleurs' && (ctx.index || 0) % 2 === 0);
        const ancre = q.transfo.genre === 'translation'
            ? (depuisSommet ? ancreSurUnSommet(q, t) : null) || ancreLibre(q, t)
            : null;

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
 * LA FLÈCHE POSÉE SUR UN SOMMET DE LA FIGURE — le premier palier.
 *
 * Rémy : « j'aimerais bien un exercice juste avec les translations où la flèche
 * démarre d'un sommet de la figure puis après à un autre endroit. »
 *
 * C'est une progression, et elle porte tout l'enjeu de la notion. Partant d'un
 * sommet, la flèche MONTRE où va ce sommet-là : on suit la pointe, on pose la
 * première case, et le reste se recopie. Posée ailleurs, elle ne touche plus
 * rien — il faut alors avoir compris qu'un vecteur est un DÉPLACEMENT et non un
 * trajet entre deux points donnés. C'est la marche que les élèves ratent.
 *
 * UN SOMMET, PAS UN COIN QUELCONQUE : on ne garde que les nœuds SAILLANTS —
 * ceux qui n'appartiennent qu'à une seule case de la figure. Un nœud pris entre
 * deux cases est au milieu d'un côté, et une flèche qui en part semble sortir
 * du bord, pas d'un sommet.
 *
 * @returns {{x:number,y:number}|null} null si aucun sommet ne convient — la
 *          flèche irait alors hors du quadrillage, et l'appelant reprend la
 *          pose libre.
 */
function ancreSurUnSommet(q, t) {
    const v = q.transfo.vecteur;
    // Chaque nœud, avec le nombre de cases de la figure qui le touchent.
    const compte = new Map();
    q.depart.forEach(c => {
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => {
            const cle = `${c.x + dx}|${c.y + dy}`;
            compte.set(cle, (compte.get(cle) || 0) + 1);
        });
    });

    let meilleur = null, mieux = -Infinity;
    for (const [cle, n] of compte) {
        if (n !== 1) continue;
        const [x, y] = cle.split('|').map(Number);
        const bx = x + v.x, by = y + v.y;
        if (bx < 0 || bx > t.l || by < 0 || by > t.h) continue;
        // À sommets égaux, celui dont la flèche passe le plus loin des DEUX
        // figures : une flèche qui traverse la zone à colorier gêne le tracé.
        const l = Math.max(Math.abs(v.x), Math.abs(v.y)) || 1;
        let pire = Infinity;
        for (let i = 1; i < l; i++) {
            const px = x + (v.x * i) / l, py = y + (v.y * i) / l;
            [...q.depart, ...q.image].forEach(c => {
                pire = Math.min(pire, Math.abs(c.x + 0.5 - px) + Math.abs(c.y + 0.5 - py));
            });
        }
        if (pire === Infinity) pire = 0;   // une flèche d'un seul carreau
        if (pire > mieux) { mieux = pire; meilleur = { x, y }; }
    }
    return meilleur;
}

/**
 * Où poser la flèche du vecteur, quand elle ne part PAS d'un sommet.
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

    // L'ANCRE EST UN NŒUD DU QUADRILLAGE, pas une case : la flèche se pose sur
    // les traits (voir `marquesDeLaTransfo` dans core/quadrillageSvg.js et
    // `qNoeud` dans ui/printSheet.js). Les nœuds vont donc de 0 à t.l INCLUS,
    // et la distance se mesure au CENTRE des cases, décalé d'un demi-carreau.
    // LE BORD EXTÉRIEUR NE COMPTE PAS COMME UN TRAIT : la flèche s'y confond
    // avec le cadre du quadrillage, et son étiquette « v » sort de la figure.
    // On cherche donc d'abord parmi les traits INTÉRIEURS ; les bords ne
    // servent que de repli, pour un vecteur si long qu'il ne tient nulle part
    // ailleurs.
    const chercher = (marge) => {
        let meilleure = null, mieux = -Infinity;
        for (let y = marge; y <= t.h - marge; y++) {
            for (let x = marge; x <= t.l - marge; x++) {
                const bx = x + v.x, by = y + v.y;
                if (bx < marge || bx > t.l - marge || by < marge || by > t.h - marge) continue;
                // La distance du trajet aux figures : on échantillonne le
                // segment case par case, et l'on retient son point le plus
                // exposé. Les cases se mesurent à leur CENTRE — un demi-carreau
                // plus loin que leur coin, qui est l'unité des nœuds.
                let pire = Infinity;
                for (let i = 0; i <= l; i++) {
                    const px = x + (v.x * i) / l, py = y + (v.y * i) / l;
                    cases.forEach(c => {
                        pire = Math.min(pire, Math.abs(c.x + 0.5 - px) + Math.abs(c.y + 0.5 - py));
                    });
                }
                if (pire > mieux) { mieux = pire; meilleure = { x, y }; }
            }
        }
        return meilleure;
    };
    return chercher(1) || chercher(0) || { x: 0, y: 0 };
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
