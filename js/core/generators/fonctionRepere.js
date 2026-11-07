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

/**
 * LES TROIS ABSCISSES DU TABLEAU DE VALEURS, TOUJOURS LES MÊMES.
 *
 * Un négatif, le zéro, un positif : le zéro donne b sans calcul — c'est la
 * colonne qui se vérifie d'un coup d'œil —, et le négatif est celui où l'on
 * se trompe. Les tirer au hasard ne travaillerait rien de plus et ferait
 * perdre ce repère d'une question à l'autre.
 */
const XS_TABLEAU = [-2, 0, 3];

// ── LES SIX MARCHES ────────────────────────────────────────────────────────

// LA MARCHE DU PAS A ÉTÉ RETIRÉE, ET C'EST RÉMY QUI L'A TRANCHÉ.
//
// Elle disait : « On part du point (0 ; 1), où la droite coupe l'axe vertical,
// et l'on avance de 1 vers la droite. Place le point de la droite où l'on
// arrive. » Son verdict : « incompréhensible. ne le fait pas ».
//
// IL A RAISON, ET L'IDÉE RESTE JUSTE. Le coefficient directeur EST un pas —
// un carreau à droite, a carreaux en haut —, et c'est ce qui permet de tracer
// une droite affine en dix secondes. Mais ce geste SE MONTRE au tableau en une
// seconde, et l'écrire demandait trois lignes de consigne pour une question
// dont la réponse est un seul clic. Une consigne plus longue que son geste est
// une consigne qu'on ne lit pas.
//
// L'idée n'est pas perdue : elle reste dans l'instruction de l'exercice, où
// elle est une MÉTHODE à employer, et non une question à répondre.
//
// ET L'ANTÉCÉDENT A SON PETIT BAIN. Rémy, sur « f(x) = −3x − 1, place le point
// dont l'ordonnée est 5 » : « il faut résoudre une équation, c'est dur quand
// même ». Défaire DEUX opérations dans le bon ordre quand on vient d'apprendre
// à en faire deux, c'est en effet une marche de trop. La première remontée ne
// défait donc qu'UNE opération : f(x) = 3x, l'ordonnée vaut 6, on divise.
export const ETAPES = [
    // LE TABLEAU VIENT AVANT LE POINT, et c'est l'étape qu'on saute.
    //
    // RÉMY : « pour tracer une fonction, ce serait bien de pouvoir aussi
    // avoir des questions avec remplissage de tableau ». Pour tracer, on
    // calcule d'abord f(−2), f(0), f(3) — et c'est ce calcul-là qui se
    // travaille ; l'exercice ne posait que le POINT, c'est-à-dire ce qui
    // vient après. Sur la feuille imprimée le tableau existait déjà.
    //
    // ELLE SE RÉPOND AU CLAVIER, pas au doigt : un tableau ne se pointe pas.
    // L'activité « repère » passe la main au pavé pour cette marche-là, et la
    // reprend à la suivante (voir `meta.cases` dans `activities/repere.js`).
    { id: 'tableau', temps: 'A', titre: 'Compléter le tableau de valeurs', skill: S_IMAGE },
    { id: 'image', temps: 'A', titre: 'Calculer l\'image, puis la placer', skill: S_IMAGE },
    { id: 'image-relatifs', temps: 'A', titre: 'Un point dans les négatifs', skill: S_IMAGE },
    { id: 'ordonnee-origine', temps: 'B', titre: 'Où la droite coupe l\'axe vertical', skill: S_GRAPHIQUE },
    { id: 'antecedent-simple', temps: 'C', titre: 'Remonter d\'un seul pas', skill: S_ANTECEDENT },
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

    if (etape.id === 'tableau') {
        // TROIS COLONNES, PAS QUATRE : trois points suffisent pour tracer une
        // droite — deux la déterminent, le troisième VÉRIFIE — et trois cases
        // tiennent sur un téléphone sans que le pavé passe sous le pli.
        //
        // ET LES TROIS VALEURS TOMBENT DANS LA GRILLE, parce que c'est ce
        // tableau-là qu'on reportera sur le repère à la marche suivante. Un
        // f(x) à 14 dans un repère qui s'arrête à 6 apprendrait que le tableau
        // et le dessin n'ont rien à voir.
        const { a, b } = tirerFonction(rng, (a2, b2) =>
            XS_TABLEAU.every(x2 => dansLaGrille(a2 * x2 + b2)));
        const ys = XS_TABLEAU.map(x => a * x + b);
        return {
            a, b, x: XS_TABLEAU[0], y: ys[0],
            xs: XS_TABLEAU, ys,
            question: `On donne f(x) = ${ecrireAffine(a, b)}. Complète le tableau.`,
            pourquoi: XS_TABLEAU.map((x, i) => `f(${relatif(x)}) = ${calculEcrit(a, b, x)}`)
                .join(' ; ') + '.',
            aide: 'UNE COLONNE À LA FOIS : on remplace x par le nombre du haut, on calcule, '
                + 'on écrit le résultat en dessous.'
        };
    }

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

    // ── LA MARCHE DU PAS N'EXISTE PLUS ─────────────────────────────────────
    //
    // RÉMY, sur « On part du point (0 ; 1) […] et l'on avance de 1 vers la
    // droite. Place le point de la droite où l'on arrive. » : « incompréhensible.
    // ne le fait pas ». Trois lignes de consigne pour un geste qui se montre
    // en une seconde au tableau — une consigne plus longue que son geste est
    // une consigne qu'on ne lit pas. L'idée reste dans l'instruction de
    // l'exercice, où elle est une MÉTHODE et non une question.

    // ── TEMPS C : REMONTER VERS L'ABSCISSE ─────────────────────────────────

    if (etape.id === 'antecedent-simple') {
        // ON NE DÉFAIT QU'UNE SEULE OPÉRATION. RÉMY, sur la marche d'à côté :
        // « il faut résoudre une équation, c'est dur quand même ». Défaire DEUX
        // opérations dans le bon ordre quand on vient d'apprendre à en faire
        // deux, c'est une marche de trop — et l'ordre est justement ce qui se
        // rate. Ici la fonction n'a pas de terme constant : f(x) = 3x, on donne
        // l'ordonnée, on divise. Un seul geste, et c'est l'inverse d'un seul.
        const a = choisir([-3, -2, 2, 3], rng);
        const xs = [-3, -2, -1, 1, 2, 3].filter(v => dansLaGrille(a * v));
        const x = choisir(xs, rng);
        const y = a * x;
        return {
            a, b: 0, x, y,
            question: `On donne f(x) = ${ecrireAffine(a, 0)}. Place le point de la droite `
                + `dont l'ordonnée est ${relatif(y)}.`,
            pourquoi: `On cherche le nombre dont l'image est ${relatif(y)}. Il n'y a qu'une `
                + `opération à défaire : multiplier par ${relatif(a)} se défait en DIVISANT `
                + `par ${relatif(a)}. Donc x = ${relatif(y)} ÷ ${relatif(a)} = ${relatif(x)}, `
                + `et le point est (${relatif(x)} ; ${relatif(y)}).`,
            aide: 'ICI LA FONCTION NE FAIT QU\'UNE CHOSE : elle multiplie. Pour remonter, on '
                + 'fait le contraire — on divise. Et l\'on vérifie en redescendant : la '
                + 'multiplication doit retomber sur l\'ordonnée donnée.'
        };
    }

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
    // DEUX GENRES DE RÉPONSE DEPUIS LE TABLEAU DE VALEURS.
    //
    // Ce commentaire disait le contraire, et il avait raison tant que
    // l'activité « repère » ne savait que poser des points : une marche qui
    // rendait un `numeric` fabriquait une question que l'écran ne savait pas
    // afficher. Elle sait maintenant passer la main au pavé sur `meta.cases`,
    // et la reprendre après — voir `activities/repere.js`.
    answerKinds: ['point', 'numeric'],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);

        // ── LE TABLEAU DE VALEURS : TROIS CASES, UN SEUL ENVOI ─────────────
        //
        // Le pavé compte les `[data-trou]` qu'il trouve dans l'énoncé et rend
        // « a|b|c » : la réponse s'écrit donc de la même façon, sinon trois
        // cases justes seraient comptées fausses.
        if (q.ys) {
            const cases = q.ys.map((_, i) =>
                `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`);
            return makeItem({
                seed: rng.seed,
                generatorId: 'alg.fonction-repere',
                skillId: etape.skill,
                answerKind: 'numeric',
                prompt: {
                    text: `${q.question} x : ${q.xs.map(relatif).join(' | ')}`,
                    papier: `${q.question}`,
                    html: `<div class="game-question">${q.question}</div>`
                        + '<table class="fn-valeurs"><tbody>'
                        + `<tr><th>x</th>${q.xs.map(x => `<td>${relatif(x)}</td>`).join('')}</tr>`
                        + `<tr><th>f(x)</th>${cases.map(c => `<td>${c}</td>`).join('')}</tr>`
                        + '</tbody></table>',
                    // SUR LE PAPIER, LE TABLEAU EST LA PLACE POUR RÉPONDRE :
                    // la seconde ligne est vide, et la fiche ne pose donc
                    // aucun pointillé dessous.
                    tableau: {
                        lignes: [['x', ...q.xs.map(relatif)], ['f(x)', ...q.xs.map(() => '')]]
                    }
                },
                answer: q.ys.join('|'),
                hints: [
                    q.aide,
                    `La colonne du milieu se lit sans calculer : f(0) = ${relatif(q.b)}, `
                        + 'c\'est le nombre tout seul de l\'écriture.',
                    'ATTENTION AUX SIGNES : un x négatif multiplié par un coefficient négatif '
                        + 'donne un résultat POSITIF.'
                ],
                explanation: q.pourquoi,
                difficulty: DIFFICULTE[etape.temps] || 3,
                meta: {
                    a: q.a, b: q.b, max: MAX, relatifs: true,
                    marche: etape.id, temps: etape.temps, titre: etape.titre,
                    // CE QUI FAIT PASSER LA MAIN AU PAVÉ. Voir `auPave` dans
                    // `activities/repere.js`.
                    cases: true,
                    // UNE IMAGE PEUT ÊTRE NÉGATIVE : sans cette touche, la
                    // moitié des tableaux seraient impossibles à remplir.
                    signe: true, decimal: false
                }
            });
        }

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
