// SOMME OU PRODUIT ? — l'exercice qui fait CHOISIR la règle, pas l'appliquer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « en ce moment avec mes 4ᵉ, je fais les additions, soustractions,
// simplification et multiplications de nombres relatifs, c'est pas simple pour
// eux. Quel type d'exercice pourrait-on faire pour bien les entraîner ».
//
// CE QUI EXISTAIT DÉJÀ, ET QU'ON NE REFAIT PAS. Neuf exercices touchent les
// relatifs : l'ascenseur et le thermomètre, « Additionner des Relatifs, pas à
// pas », « Multiplier des Relatifs, pas à pas », le Ninja, Prio-Bot, et les
// trois marches du moins devant la parenthèse. Le calcul est couvert.
//
// LE TROU EST AILLEURS : CHACUN DE CES EXERCICES ANNONCE SON OPÉRATION. On
// entre dans « Multiplier », donc on multiplie ; on entre dans « Additionner »,
// donc on additionne. Or l'erreur reine de la 4ᵉ n'est pas d'ignorer une règle,
// c'est d'appliquer CELLE DU PRODUIT À UNE SOMME :
//
//     (−3) + (−5) = +8     « moins et moins font plus »
//
// La règle citée est juste. Elle est au mauvais endroit. Et un élève qui ne
// rencontre jamais les deux opérations dans la même minute ne peut pas
// s'entraîner à les distinguer — il s'entraîne à appliquer celle qu'on lui a
// annoncée.
//
// D'OÙ LA PREMIÈRE MARCHE, ET C'EST TOUT L'EXERCICE : les MÊMES DEUX NOMBRES,
// avec + et avec ×, côte à côte, et une seule question — lequel est positif ?
// On ne calcule rien. Les deux propositions sont les deux écritures, donc la
// discrimination est le geste lui-même, et non une conséquence du calcul.
//
//     −3 et −5 : lequel donne un résultat POSITIF ?
//        (−3) + (−5)              (−3) × (−5)
//
// LE TIRAGE EST CONTRAINT POUR QUE LA QUESTION AIT TOUJOURS UNE RÉPONSE, et
// une seule. Deux cas, et deux seulement :
//
//   · DEUX NÉGATIFS — la somme descend, le produit remonte. C'est le cas du
//     contresens, on le tire deux fois sur trois ;
//   · UN NÉGATIF ET UN POSITIF PLUS ÉLOIGNÉ DE ZÉRO — la somme remonte au-delà
//     de zéro, le produit est négatif. Les rôles s'échangent, et c'est
//     précisément ce qui empêche d'apprendre « la somme est celle du bas ».
//
// Deux positifs donneraient deux résultats positifs, et un négatif plus gros
// que le positif deux résultats négatifs : la question n'aurait pas de réponse.
//
// ENSUITE ON DEMANDE LE RÉSULTAT — Rémy : « et après on peut aussi demander le
// résultat ». Les pièges du calcul ne sont pas tirés au hasard : LE PREMIER EST
// LE RÉSULTAT DE L'AUTRE OPÉRATION. Devant « (−3) + (−5) », la proposition
// « +15 » est exactement la faute qu'on travaille, et son « pourquoi » la
// nomme.
//
// ET LA DERNIÈRE MARCHE DE CHAQUE TEMPS RETIRE LES PARENTHÈSES, parce que
// c'est là que les deux écritures se ressemblent le plus :
//
//     −3 − 5     (une somme)          −3 × (−5)     (un produit)
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import { ecrire, nb, signe } from './relatifs.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL_SOMME = 'num.relatifs.somme';
const SKILL_PRODUIT = 'num.relatifs.produit';
const SKILL_SENS = 'num.relatifs.sens';

// ── LES DEUX ÉCRITURES ─────────────────────────────────────────────────────

/** Une somme avec ses parenthèses : (−3) + (−5). */
export function sommeComplete(a, b) {
    return `${ecrire(a)} + ${ecrire(b)}`;
}

/** Un produit avec ses parenthèses : (−3) × (−5). */
export function produitComplet(a, b) {
    return `${ecrire(a)} × ${ecrire(b)}`;
}

/**
 * La même somme, SANS parenthèses : −3 − 5.
 *
 * C'est l'écriture qui porte toute la confusion du chapitre : « −3 − 5 » se lit
 * « moins trois moins cinq », deux moins se suivent, et la règle du produit
 * vient toute seule à l'esprit.
 */
export function sommeSimple(a, b) {
    return `${nb(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
}

/**
 * Le même produit, SANS parenthèses : −3 × 5, ou −3 × (−5).
 *
 * On ne garde de parenthèses que là où deux signes se suivraient — et c'est
 * justement le cas où elles sont obligatoires : « 3 × −5 » ne s'écrit pas.
 */
export function produitSimple(a, b) {
    return `${nb(a)} × ${b < 0 ? `(${nb(b)})` : nb(b)}`;
}

/** L'écriture d'une opération, avec ou sans parenthèses. */
export function ecrireCalcul(a, b, op, simple) {
    if (op === '×') return simple ? produitSimple(a, b) : produitComplet(a, b);
    return simple ? sommeSimple(a, b) : sommeComplete(a, b);
}

/** Ce que vaut le calcul. */
export function valeur(a, b, op) {
    return op === '×' ? a * b : a + b;
}

/** Le signe du résultat, tel qu'on le dit à l'élève. */
export function signeDe(v) {
    return v < 0 ? 'négatif' : 'positif';
}

// ── LE TIRAGE ──────────────────────────────────────────────────────────────

/**
 * UN COUPLE DONT LA SOMME ET LE PRODUIT ONT DES SIGNES CONTRAIRES.
 *
 * C'est la condition pour que « lequel est positif ? » ait une réponse, et une
 * seule. Voir l'en-tête : deux négatifs (deux fois sur trois, c'est le cas du
 * contresens), ou un négatif et un positif plus éloigné de zéro.
 */
export function couplePourLaPaire(rng) {
    if (rng.int(1, 3) <= 2) {
        return [-rng.int(2, 9), -rng.int(2, 9)];
    }
    // LE POSITIF DOIT L'EMPORTER, sinon la somme est négative elle aussi et la
    // question perd sa réponse. On tire donc le petit d'abord.
    const petit = rng.int(2, 6);
    const grand = rng.int(petit + 1, 9);
    return rng.bool() ? [-petit, grand] : [grand, -petit];
}

/**
 * UN COUPLE ORDINAIRE, pour les marches qui ne montrent qu'une opération.
 *
 * ON ÉCARTE LA SOMME NULLE : zéro n'est ni positif ni négatif, et demander son
 * signe est une question sans réponse. Elle mérite une leçon, pas un piège au
 * milieu d'une série.
 */
export function couple(rng) {
    let a = rng.int(2, 9) * (rng.bool() ? 1 : -1);
    let b = rng.int(2, 9) * (rng.bool() ? 1 : -1);
    // AU MOINS UN NÉGATIF, ET C'EST LA PREMIÈRE CORRECTION : deux positifs ne
    // travaillent aucune des deux règles, et une série qui en tire un quart du
    // temps dilue l'exercice.
    if (a > 0 && b > 0) { if (rng.bool()) a = -a; else b = -b; }
    // PUIS LA SOMME NULLE, ET L'ORDRE EST TOUT. La première écriture corrigeait
    // le zéro AVANT de forcer le signe, si bien que forcer le signe le
    // RECRÉAIT : (+5, +5) devenait (+5, −5), et l'élève lisait « (+5) + (−5),
    // positif ou négatif ? » — une question sans réponse. C'est une épreuve de
    // ce fichier qui l'a dit, pas une relecture.
    if (a + b === 0) b += b < 0 ? 1 : -1;
    return [a, b];
}

// ── LES MARCHES ────────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'paire-positif', temps: 'A', titre: 'Lequel est positif ?', paire: 'positif' },
    { id: 'paire-negatif', temps: 'A', titre: 'Lequel est négatif ?', paire: 'négatif' },
    { id: 'paire-simple', temps: 'A', titre: 'Sans les parenthèses', paire: 'positif', simple: true },
    { id: 'signe-somme', temps: 'B', titre: 'Le signe d\'une somme', op: '+' },
    { id: 'signe-produit', temps: 'B', titre: 'Le signe d\'un produit', op: '×' },
    { id: 'signe-melange', temps: 'B', titre: 'Le signe, somme ou produit' },
    { id: 'signe-simple', temps: 'B', titre: 'Le signe, sans les parenthèses', simple: true },
    { id: 'calcul-somme', temps: 'C', titre: 'Calcule une somme', op: '+', calcul: true },
    { id: 'calcul-produit', temps: 'C', titre: 'Calcule un produit', op: '×', calcul: true },
    { id: 'calcul-melange', temps: 'C', titre: 'Calcule, somme ou produit', calcul: true },
    { id: 'calcul-simple', temps: 'C', titre: 'Calcule, sans les parenthèses', calcul: true, simple: true }
];

const TEMPS = {
    A: 'A — les deux écritures côte à côte',
    B: 'B — le signe, sans calculer',
    C: 'C — le résultat'
};

/**
 * LA PHRASE QUI NOMME LA CONFUSION, et elle est la même partout : ce n'est pas
 * la règle qui est fausse, c'est l'opération qu'on n'a pas regardée.
 */
export function pourquoiCeN_estPasPareil(a, b) {
    return `${sommeComplete(a, b)} = ${nb(a + b)}, mais ${produitComplet(a, b)} = ${nb(a * b)}. `
        + 'Regarde l\'opération AVANT les signes.';
}

/** Une question d'une marche. */
export function question(etape, rng) {
    // --- Temps A : LES DEUX ÉCRITURES CÔTE À CÔTE --------------------------
    if (etape.paire) {
        const [a, b] = couplePourLaPaire(rng);
        const somme = ecrireCalcul(a, b, '+', etape.simple);
        const produit = ecrireCalcul(a, b, '×', etape.simple);
        const cherche = etape.paire;
        const sommeEstJuste = signeDe(a + b) === cherche;
        const juste = sommeEstJuste ? somme : produit;
        const autre = sommeEstJuste ? produit : somme;
        return {
            paire: true,
            // LES DEUX NOMBRES PORTENT LEUR SIGNE, le plus comme le moins.
            // Vu sur la photo : l'énoncé disait « −3 et 9 » au-dessus de deux
            // boutons qui écrivent « (+9) ». Sur un chapitre où le signe est
            // le sujet, le même nombre ne s'écrit pas de deux façons dans le
            // même écran.
            enonce: `${signe(a)} et ${signe(b)}`,
            question: `Lequel donne un résultat ${cherche.toUpperCase()} ?`,
            reponse: juste,
            choix: [somme, produit],
            pieges: [{
                value: autre,
                why: sommeEstJuste
                    ? `${produit} est un PRODUIT : deux facteurs de signes contraires donnent `
                        + 'un résultat négatif.'
                    : `${somme} est une SOMME : « moins et moins font plus » est la règle du `
                        + 'produit, pas celle de la somme.'
            }],
            pourquoi: pourquoiCeN_estPasPareil(a, b),
            a, b, op: sommeEstJuste ? '+' : '×'
        };
    }

    const [a, b] = couple(rng);
    const op = etape.op || (rng.bool() ? '+' : '×');
    const ecrit = ecrireCalcul(a, b, op, etape.simple);
    const v = valeur(a, b, op);
    const autre = valeur(a, b, op === '×' ? '+' : '×');

    // --- Temps B : LE SIGNE, SANS CALCULER ---------------------------------
    if (!etape.calcul) {
        const juste = signeDe(v);
        return {
            enonce: ecrit,
            question: 'Positif ou négatif ?',
            reponse: juste,
            choix: ['positif', 'négatif'],
            pieges: [{
                value: juste === 'positif' ? 'négatif' : 'positif',
                why: op === '×'
                    ? 'Dans un PRODUIT, deux facteurs négatifs donnent un résultat positif.'
                    : 'Dans une SOMME, c\'est le nombre le plus éloigné de zéro qui donne le signe.'
            }],
            pourquoi: `${ecrit} = ${nb(v)}, donc ${juste}.`,
            a, b, op
        };
    }

    // --- Temps C : LE RÉSULTAT ---------------------------------------------
    //
    // LE PREMIER PIÈGE EST LE RÉSULTAT DE L'AUTRE OPÉRATION. C'est la faute
    // qu'on travaille, et la seule dont le « pourquoi » apprend quelque chose.
    return {
        enonce: ecrit,
        question: 'Calcule.',
        reponse: v,
        pieges: [
            {
                value: autre,
                why: op === '×'
                    ? `${nb(autre)}, c'est ${sommeComplete(a, b)} : tu as ADDITIONNÉ.`
                    : `${nb(autre)}, c'est ${produitComplet(a, b)} : tu as MULTIPLIÉ.`
            },
            {
                value: -v,
                why: op === '×'
                    ? 'Le nombre est juste, le signe non : compte les facteurs négatifs.'
                    : 'Le nombre est juste, le signe non : garde celui du plus éloigné de zéro.'
            }
        ],
        pourquoi: `${ecrit} = ${nb(v)}.`,
        a, b, op
    };
}

const MOT = 'marche';
// LE NUMÉRO EST DANS LE NOM, comme pour les autres progressions : la case à
// cocher se lit « 5. Le signe, somme ou produit », et Rémy prépare sa séance
// en lisant cette liste.
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

export const relatifsMelangeGenerator = {
    id: 'num.relatifs.melange',
    label: 'Somme ou produit ?',
    skills: [SKILL_SOMME, SKILL_PRODUIT, SKILL_SENS],
    answerKinds: ['choice'],
    // La question se photocopie telle quelle : aucune figure à dessiner.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const rangGlobal = ETAPES.findIndex(e => e.id === etape.id);

        const q = question(etape, rng);
        // LES ÉTIQUETTES PORTENT LE VRAI SIGNE MOINS (U+2212), jamais le trait
        // d'union du clavier : sur un chapitre où le signe EST le sujet, un
        // « -12 » plus court que le « − » de l'énoncé casse le lien de l'œil.
        const etiquette = (v) => (typeof v === 'number' ? nb(v) : v);
        const choices = finalizeChoices(rng, [
            { value: q.reponse, label: etiquette(q.reponse), correct: true },
            ...q.pieges.filter(p => String(p.value) !== String(q.reponse))
                .map(p => ({ ...p, label: etiquette(p.value) }))
        ], etape.calcul
            ? { count: 4, filler: (r) => q.reponse + r.int(1, 9) * (r.bool() ? 1 : -1) }
            : { count: 2 })
            // LE BOUCHE-TROU PASSE AUSSI PAR L'ÉTIQUETTE, et il a failli ne pas
            // le faire : `filler` rend un NOMBRE, dont le label sort en
            // « -54 » avec le trait d'union du clavier. Mesuré sur un tirage :
            // « 56 | −56 | -54 | 1 » — deux moins différents dans la même
            // rangée de boutons, sur le chapitre où le signe EST le sujet.
            .map(c => ({ ...c, label: etiquette(c.label) }));

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.relatifs.melange',
            // LA COMPÉTENCE SUIT L'OPÉRATION TIRÉE, pas la marche : une série
            // mêlée nourrit les deux carnets, et c'est ce qu'on veut voir au
            // bilan — « il sait multiplier, il confond quand on mélange ».
            skillId: etape.calcul
                ? (q.op === '×' ? SKILL_PRODUIT : SKILL_SOMME)
                : SKILL_SENS,
            answerKind: 'choice',
            prompt: {
                text: `${q.enonce} — ${q.question}`,
                // SUR LE PAPIER, LA QUESTION DOIT SE SUFFIRE : il n'y a pas de
                // boutons pour dire ce qu'on attend. La paire s'y écrit donc en
                // entier, les deux calculs à la suite.
                papier: q.paire
                    ? `${q.choix[0]} ou ${q.choix[1]} : lequel est ${q.question.includes('POSITIF') ? 'positif' : 'négatif'} ?`
                    : (etape.calcul ? `${q.enonce} =` : `Signe de ${q.enonce} :`),
                html: `<div class="game-question"><span class="lit-expr">${q.enonce}`
                    + (etape.calcul ? ' = ?' : '') + '</span>'
                    + (etape.calcul ? '' : `<span class="rel-q">${q.question}</span>`)
                    + '</div>'
            },
            answer: q.reponse,
            choices,
            hints: [
                q.paire
                    ? 'Ne calcule pas. Regarde l\'OPÉRATION : la règle n\'est pas la même.'
                    : (etape.calcul
                        ? 'Deux gestes séparés : le signe d\'abord, le nombre ensuite.'
                        : 'Regarde l\'opération avant les signes.'),
                q.op === '×'
                    ? 'Un produit : deux facteurs négatifs donnent un résultat positif.'
                    : 'Une somme : le signe est celui du nombre le plus éloigné de zéro.'
            ],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                rang: rangGlobal + 1, total_etapes: ETAPES.length,
                a: q.a, b: q.b, operation: q.op, paire: !!q.paire,
                // LE PAVÉ DOIT PORTER LA TOUCHE « ± » : au temps C, la réponse
                // attendue est souvent négative, et sans elle la question n'a
                // pas de réponse possible quand l'aide passe au clavier.
                signe: true
            }
        });
    }
};

export default relatifsMelangeGenerator;
