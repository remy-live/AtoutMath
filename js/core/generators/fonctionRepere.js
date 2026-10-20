// PLACER UN POINT DE LA DROITE — la fonction dans un repère, niveau quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, bloc 12 de sa progression de quatrième : « Tracé de fonction ». Et la
// question que je lui ai posée, parce qu'elle touche LA LIGNE ROUGE — l'écran
// a-t-il le droit de faire placer un point, ou le tracé doit-il rester sur la
// feuille ?
//
// SA RÉPONSE : « les deux ». Elle se tient, et elle commande ce fichier :
//
//   · À L'ÉCRAN, l'élève CALCULE puis CLIQUE un point. Ce n'est pas de la
//     construction géométrique — ni règle, ni compas, ni tracé à la souris —
//     et « Placer un Point » fait déjà exactement ce geste depuis la sixième.
//     Ce qui se travaille ici est le CALCUL de l'image, pas le tracé.
//   · SUR LA FEUILLE, le repère est imprimé avec son quadrillage, l'élève
//     complète un tableau de valeurs, place ses croix et TIRE LA DROITE À LA
//     RÈGLE. C'est là que le geste reste entier, et c'est pour cela que la
//     feuille n'est pas une consolation : elle est l'autre moitié.
//
// ── UN SEUL GESTE, SIX MARCHES ─────────────────────────────────────────────
//
// Toutes les questions se répondent de la même façon : on clique un nœud du
// repère. Ce qui change, c'est le CHEMIN pour y arriver — et c'est lui qui
// monte. On calcule une image ; puis on LIT l'écriture de la fonction, où b et
// a se voient directement sur le dessin ; puis on REMONTE, de l'ordonnée vers
// l'abscisse.
//
// ── POURQUOI b ET a ONT CHACUN LEUR MARCHE ─────────────────────────────────
//
// Parce que ce sont les deux choses que le dessin DIT, et que l'élève croit
// devoir calculer. « f(x) = 2x − 3 » : le −3 est l'endroit où la droite coupe
// l'axe des ordonnées, on le lit sans rien faire ; le 2 est le PAS — un carreau
// à droite, deux carreaux en haut. Un élève qui a vu cela une fois trace une
// droite affine en dix secondes, et sans tableau de valeurs.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';
import { relatif, relatifEnPar } from '../signeMoins.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const S_IMAGE = 'alg.fonction.image';
const S_ANTECEDENT = 'alg.fonction.antecedent';
const S_GRAPHIQUE = 'alg.fonction.graphique';

// LE REPÈRE VA DE −6 À 6, ET LES QUATRE QUADRANTS SERVENT.
//
// Une fonction affine descend sous l'axe dès que son coefficient est négatif,
// et l'antécédent d'un nombre est souvent négatif. Un repère coupé au premier
// quadrant interdirait la moitié des questions du chapitre — et surtout, il
// apprendrait une fausse habitude : que la droite « commence » à l'origine.
const MAX = 6;

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/** « 2x − 3 », « −x + 4 », « 3x » — l'écriture d'une fonction affine. */
export function ecrireAffine(a, b) {
    const partA = a === 1 ? 'x' : a === -1 ? '−x' : `${a < 0 ? '−' : ''}${Math.abs(a)}x`;
    if (b === 0) return partA;
    return `${partA} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
}

/**
 * Le détail du calcul de f(x₀), écrit comme on l'écrit au tableau.
 *
 * TOUS LES NOMBRES PASSENT PAR `relatif` : un `${a * x}` nu rendrait « -6 » au
 * trait d'union, à côté du « − » de l'expression. Voir `signeMoins.js`.
 */
function calculEcrit(a, b, x) {
    const produit = `${relatif(a)} × ${relatifEnPar(x)}`;
    if (b === 0) return `${produit} = ${relatif(a * x)}`;
    return `${produit} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${relatif(a * x)} `
        + `${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${relatif(a * x + b)}`;
}

/**
 * UNE FONCTION DONT LE POINT DEMANDÉ TOMBE DANS LE REPÈRE.
 *
 * On tire jusqu'à ce que `garder` accepte : écrire les contraintes à la main
 * (« si a = 3 alors x ≤ 2 ») reviendrait à les recopier six fois, et une seule
 * oubliée sort un point hors de la grille — que l'élève ne peut alors PAS
 * cliquer. Un point hors grille et un logiciel cassé se ressemblent beaucoup.
 */
function tirerFonction(rng, garder) {
    for (let essai = 0; essai < 300; essai++) {
        const a = choisir([-3, -2, -1, 1, 2, 3], rng);
        const b = rng.int(-5, 5);
        const x = rng.int(-4, 4);
        if (garder(a, b, x)) return { a, b, x };
    }
    // Un repli qui tient toujours dans la grille, pour qu'aucune question ne
    // puisse sortir vide : f(x) = x, et le point (1 ; 1).
    return { a: 1, b: 0, x: 1 };
}

const dansLaGrille = (v) => Math.abs(v) <= MAX;

// ── LES SIX MARCHES ────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'image', temps: 'A', titre: 'Calculer l\'image, puis la placer', skill: S_IMAGE },
    { id: 'image-relatifs', temps: 'A', titre: 'Un point dans les négatifs', skill: S_IMAGE },
    { id: 'ordonnee-origine', temps: 'B', titre: 'Où la droite coupe l\'axe vertical', skill: S_GRAPHIQUE },
    { id: 'le-pas', temps: 'B', titre: 'Le pas de la droite', skill: S_GRAPHIQUE },
    { id: 'antecedent', temps: 'C', titre: 'Remonter : on donne l\'ordonnée', skill: S_ANTECEDENT },
    { id: 'zero', temps: 'C', titre: 'Où la droite coupe l\'axe horizontal', skill: S_ANTECEDENT }
];

const TEMPS = {
    A: 'A — calculer une image et la placer',
    B: 'B — ce que l\'écriture montre sur le dessin',
    C: 'C — remonter vers l\'abscisse'
};

/** Une question d'une marche : la fonction, le point attendu, et ce qui s'en dit. */
export function question(etape, rng) {

    // ── TEMPS A : CALCULER UNE IMAGE, PUIS LA PLACER ───────────────────────

    if (etape.id === 'image' || etape.id === 'image-relatifs') {
        // LA PREMIÈRE MARCHE RESTE DANS LE PREMIER QUADRANT. Calculer 2 × 3 + 1
        // et cliquer en haut à droite est déjà deux gestes ; y ajouter un signe
        // en ferait trois, et l'on ne saurait plus lequel a manqué.
        const facile = etape.id === 'image';
        const { a, b, x } = tirerFonction(rng, (a2, b2, x2) => {
            const y2 = a2 * x2 + b2;
            if (!dansLaGrille(y2)) return false;
            if (facile) return a2 > 0 && b2 >= 0 && x2 > 0 && y2 > 0;
            // Au moins UNE coordonnée négative, sinon la marche ne travaille
            // rien de plus que la précédente.
            return x2 < 0 || y2 < 0;
        });
        const y = a * x + b;
        return {
            a, b, x, y,
            question: `On donne f(x) = ${ecrireAffine(a, b)}. Place le point de la droite `
                + `dont l'abscisse est ${relatif(x)}.`,
            pourquoi: `f(${relatif(x)}) = ${calculEcrit(a, b, x)}. Le point cherché est donc `
                + `(${relatif(x)} ; ${relatif(y)}) : `
                + `on part de ${relatif(x)} sur l'axe horizontal, et l'on `
                + `${y < 0 ? 'descend' : 'monte'} jusqu'à ${relatif(y)}.`,
            aide: 'ON CALCULE D\'ABORD, ON CLIQUE ENSUITE. L\'abscisse est donnée : c\'est le '
                + 'nombre qu\'on remplace dans f(x). Le résultat du calcul est l\'ORDONNÉE du '
                + 'point — le second nombre, celui de la hauteur.'
        };
    }

    // ── TEMPS B : CE QUE L'ÉCRITURE MONTRE SUR LE DESSIN ───────────────────

    if (etape.id === 'ordonnee-origine') {
        // b SE LIT, IL NE SE CALCULE PAS. C'est l'ordonnée du point d'abscisse
        // zéro, et f(0) = a × 0 + b = b : le calcul existe, mais il se fait
        // une fois dans sa vie. Ensuite on lit.
        const { a, b } = tirerFonction(rng, (a2, b2) => b2 !== 0 && dansLaGrille(b2));
        return {
            a, b, x: 0, y: b,
            question: `On donne f(x) = ${ecrireAffine(a, b)}. Place le point où la droite `
                + 'coupe l\'axe des ordonnées (l\'axe vertical).',
            pourquoi: `Sur l'axe des ordonnées, l'abscisse vaut 0. Or f(0) = ${relatif(a)} × 0 `
                + `${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${relatif(b)}. La droite coupe donc `
                + `l'axe vertical en (0 ; ${relatif(b)}) — et ce ${relatif(b)} est justement le `
                + 'nombre tout seul dans l\'écriture de f.',
            aide: 'LE NOMBRE TOUT SEUL SE LIT SUR LE DESSIN. Dans « f(x) = 2x − 3 », le −3 '
                + 'est l\'endroit où la droite croise l\'axe vertical. Il n\'y a rien à '
                + 'calculer : on le lit dans l\'écriture, et on le pose sur l\'axe.'
        };
    }

    if (etape.id === 'le-pas') {
        // a EST UN PAS, PAS UN NOMBRE ABSTRAIT : un carreau à droite, a carreaux
        // vers le haut. C'est la seule façon de tracer une droite affine sans
        // tableau de valeurs, et c'est ce qui rend le coefficient visible.
        const { a, b } = tirerFonction(rng, (a2, b2) =>
            dansLaGrille(b2) && dansLaGrille(a2 + b2));
        return {
            a, b, x: 1, y: a + b,
            question: `On donne f(x) = ${ecrireAffine(a, b)}. On part du point (0 ; ${relatif(b)}), `
                + 'où la droite coupe l\'axe vertical, et l\'on avance de 1 vers la droite. '
                + 'Place le point de la droite où l\'on arrive.',
            pourquoi: `Avancer de 1 vers la droite fait passer de l'abscisse 0 à l'abscisse 1. `
                + `Et f(1) = ${relatif(a)} × 1 ${b < 0 ? '−' : '+'} ${Math.abs(b)} = `
                + `${relatif(a + b)}. On arrive donc en (1 ; ${relatif(a + b)}) : on a `
                + `${a < 0 ? 'descendu' : 'monté'} de ${Math.abs(a)} `
                + `carreau${Math.abs(a) > 1 ? 'x' : ''}. Ce ${relatif(a)} est le nombre qui `
                + 'accompagne le x.',
            aide: 'LE NOMBRE DEVANT LE x EST UN PAS. Un carreau vers la droite, et la droite '
                + 'monte de ce nombre de carreaux — ou DESCEND, s\'il est négatif. Avec ce pas '
                + 'et le point de départ sur l\'axe vertical, on trace la droite sans aucun calcul.'
        };
    }

    // ── TEMPS C : REMONTER VERS L'ABSCISSE ─────────────────────────────────

    if (etape.id === 'antecedent') {
        // ON CHOISIT L'ABSCISSE, PUIS ON CALCULE L'ORDONNÉE QU'ON ANNONCE. En
        // tirant l'ordonnée d'abord, l'antécédent tomberait sur 3,5 — que
        // l'élève ne pourrait pas cliquer, et qui n'est pas la question.
        const { a, b, x } = tirerFonction(rng, (a2, b2, x2) =>
            x2 !== 0 && dansLaGrille(a2 * x2 + b2));
        const y = a * x + b;
        return {
            a, b, x, y,
            question: `On donne f(x) = ${ecrireAffine(a, b)}. Place le point de la droite `
                + `dont l'ordonnée est ${relatif(y)}.`,
            pourquoi: `On cherche le nombre dont l'image est ${relatif(y)}, c'est-à-dire `
                + `l'ANTÉCÉDENT de ${relatif(y)}. On remonte le calcul à l'envers : `
                + `${relatif(y)} ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${relatif(a * x)}, puis `
                + `${relatif(a * x)} ÷ ${relatif(a)} = ${relatif(x)}. Le point est `
                + `(${relatif(x)} ; ${relatif(y)}), et l'on vérifie : `
                + `f(${relatif(x)}) = ${calculEcrit(a, b, x)}.`,
            aide: 'ICI C\'EST LA HAUTEUR QUI EST DONNÉE, et l\'on cherche où aller sur l\'axe '
                + 'horizontal. On défait le calcul dans l\'ordre INVERSE : on enlève d\'abord '
                + 'le nombre tout seul, on divise ensuite par celui qui accompagne le x.'
        };
    }

    // 'zero'
    //
    // LA DROITE COUPE L'AXE HORIZONTAL LÀ OÙ f(x) = 0, et c'est le premier
    // endroit du programme où une équation sert à lire un dessin. On construit
    // donc b à partir de l'abscisse voulue, pour que la réponse tombe sur un
    // nœud du repère : b = −a × x.
    const a = choisir([-3, -2, -1, 1, 2, 3], rng);
    const xs = [-4, -3, -2, -1, 1, 2, 3, 4].filter(v => dansLaGrille(a * v));
    const x = choisir(xs, rng);
    const b = -a * x;
    return {
        a, b, x, y: 0,
        question: `On donne f(x) = ${ecrireAffine(a, b)}. Place le point où la droite coupe `
            + 'l\'axe des abscisses (l\'axe horizontal).',
        pourquoi: `Sur l'axe des abscisses, l'ordonnée vaut 0 : on cherche donc le nombre dont `
            + `l'image est 0. ${relatif(a)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = 0 donne `
            + `${relatif(a)}x = ${relatif(-b)}, donc x = ${relatif(x)}. La droite coupe l'axe `
            + `horizontal en (${relatif(x)} ; 0).`,
        aide: 'SUR L\'AXE HORIZONTAL, L\'ORDONNÉE EST NULLE — c\'est la seule chose à savoir, '
            + 'et elle transforme la question en équation : on résout f(x) = 0. Attention à ne '
            + 'pas confondre avec l\'autre axe, où c\'est l\'ABSCISSE qui est nulle.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 2, B: 3, C: 3 };

export const fonctionRepereGenerator = {
    id: 'alg.fonction-repere',
    label: 'Placer un point de la droite',
    skills: [S_IMAGE, S_ANTECEDENT, S_GRAPHIQUE],
    // UN SEUL GENRE DE RÉPONSE, ET C'EST VOULU. L'activité « repère » n'accepte
    // que `point` ; une marche qui rendrait un `numeric` fabriquerait une
    // question que l'activité affichée ne sait pas poser. Les six marches
    // demandent donc toutes le même geste — ce qui monte est le chemin pour y
    // arriver, pas la façon de répondre.
    answerKinds: ['point'],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);

        return makeItem({
            seed: rng.seed,
            generatorId: 'alg.fonction-repere',
            skillId: etape.skill,
            answerKind: 'point',
            prompt: {
                text: q.question,
                html: `<div class="game-question">${q.question}</div>`
            },
            answer: `${q.x},${q.y}`,
            hints: [
                q.aide,
                'LE PREMIER NOMBRE EST L\'ABSCISSE : de combien on avance vers la droite. Le '
                    + 'second est l\'ordonnée : de combien on monte. Les inverser est l\'erreur '
                    + 'la plus fréquente du chapitre, et elle se voit tout de suite sur le dessin.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 3,
            // `max` et `relatifs` sont LUS PAR L'ACTIVITÉ « repère » : c'est elle
            // qui dessine le repère et pose les cibles cliquables. Les omettre
            // rendrait un repère vide, sans que rien ne crie.
            meta: {
                x: q.x, y: q.y, a: q.a, b: q.b, max: MAX, relatifs: true,
                marche: etape.id, temps: etape.temps, titre: etape.titre
            }
        });
    }
};

export default fonctionRepereGenerator;
