// MULTIPLIER DES NOMBRES RELATIFS — la progression pas à pas.
//
// Rémy : « j'aimerais bien des exercices sur les produits de nombres
// relatifs ».
//
// LA DIFFICULTÉ N'EST PAS LE CALCUL, C'EST LA RÈGLE DES SIGNES — et surtout
// le fait qu'elle ne ressemble PAS à celle de l'addition, qu'on vient
// d'apprendre. Un élève qui sait que (−3) + (−4) = −7 écrit tout naturellement
// (−3) × (−4) = −12, et il a tort : le produit de deux négatifs est POSITIF.
// C'est le contresens du chapitre, il est universel, et il vient de ce que
// l'élève applique une règle juste au mauvais endroit.
//
// D'OÙ LA PREMIÈRE MARCHE, qui ne demande PAS de calculer : elle demande le
// SIGNE, et rien d'autre. Séparer les deux gestes — trouver le signe, puis
// multiplier les distances à zéro — est ce qui permet de travailler celui qui
// coince sans le noyer dans l'autre.
//
// LA PROGRESSION, en trois temps :
//
//   A. LE SIGNE SEUL     — « (−3) × (+4) sera-t-il positif ou négatif ? »
//                          Puis les quatre cas, un par un : + × +, − × +,
//                          + × −, − × −.
//   B. LE PRODUIT ENTIER — les quatre cas, avec le calcul. Puis l'écriture
//                          simplifiée : −3 × 4, sans les parenthèses.
//   C. PLUS DE DEUX      — (−2) × (−3) × (−4). Là, ce n'est plus une règle
//                          qu'on récite, c'est un COMPTE : on compte les
//                          facteurs négatifs, et leur parité décide. Puis les
//                          cas particuliers — le zéro, le 1, le −1, le carré.
//
// LE CARRÉ D'UN NÉGATIF MÉRITE SA MARCHE. (−4)² = +16, mais −4² = −16 : le
// premier élève au carré le nombre −4, le second met 4 au carré puis change le
// signe. Deux écritures qui se ressemblent, deux résultats opposés, et une
// parenthèse pour toute différence.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import { ecrire, nb } from './relatifs.js';
import { paramRepartition, rangMarche, conseilProgression, totalDe } from '../progression.js';

const SKILL = 'num.relatifs.produit';
const SKILL_SENS = 'num.relatifs.sens';

/**
 * Un produit écrit avec ses parenthèses : (−3) × (+4).
 *
 * ZÉRO N'A PAS DE SIGNE. « (+0) » ne s'écrit nulle part, et le voir apprendrait
 * une faute : zéro n'est ni positif ni négatif.
 */
export function produitComplet(facteurs) {
    return facteurs.map(v => (v === 0 ? '0' : ecrire(v))).join(' × ');
}

/**
 * Le même produit, ÉCRITURE SIMPLIFIÉE : −3 × 4.
 *
 * On ne garde de parenthèses que là où deux signes se suivraient — et c'est
 * justement le cas où elles sont obligatoires : « 3 × −4 » ne s'écrit pas.
 */
export function produitSimple(facteurs) {
    return facteurs.map((v, i) => {
        if (i === 0) return nb(v);
        return v < 0 ? `(${nb(v)})` : nb(v);
    }).join(' × ');
}

/** Combien de facteurs sont négatifs — c'est ce nombre qui décide du signe. */
export function negatifs(facteurs) {
    return facteurs.filter(v => v < 0).length;
}

/**
 * LE SIGNE D'UN PRODUIT, et la phrase qui l'explique.
 *
 * Un produit est nul dès qu'un facteur l'est : c'est le seul cas où compter
 * les négatifs ne sert à rien, et l'oublier fait dire « négatif » devant un
 * résultat qui vaut zéro.
 */
export function signeDuProduit(facteurs) {
    if (facteurs.some(v => v === 0)) return 'nul';
    return negatifs(facteurs) % 2 === 0 ? 'positif' : 'négatif';
}

/** Le produit lui-même. */
export function valeur(facteurs) {
    return facteurs.reduce((p, v) => p * v, 1);
}

/**
 * LA PHRASE DE LA RÈGLE, adaptée au nombre de facteurs.
 *
 * À deux facteurs on récite la règle des signes ; au-delà, on COMPTE — et le
 * passage de l'un à l'autre est justement ce que le temps C enseigne.
 */
export function regle(facteurs) {
    const k = negatifs(facteurs);
    if (facteurs.some(v => v === 0)) {
        return 'Un facteur vaut 0 : le produit entier vaut 0, quels que soient les autres.';
    }
    if (facteurs.length === 2) {
        return k === 0 ? 'Deux facteurs positifs : le produit est positif.'
            : k === 1 ? 'Un seul facteur négatif : le produit est négatif.'
                : 'DEUX facteurs négatifs : le produit est POSITIF. C\'est le piège du chapitre — '
                    + 'la règle de l\'addition dirait le contraire, mais ce n\'est pas la même règle.';
    }
    return `On compte les facteurs négatifs : il y en a ${k}. `
        + (k % 2 === 0
            ? 'Un nombre PAIR de facteurs négatifs : ils s\'annulent deux par deux, le produit est positif.'
            : 'Un nombre IMPAIR de facteurs négatifs : il en reste un, le produit est négatif.');
}

// --- LES DOUZE MARCHES -------------------------------------------------------

export const ETAPES = [
    { id: 'signe-pp', temps: 'A', titre: 'Le signe : positif × positif', signes: [1, 1] },
    { id: 'signe-np', temps: 'A', titre: 'Le signe : négatif × positif', signes: [-1, 1] },
    { id: 'signe-pn', temps: 'A', titre: 'Le signe : positif × négatif', signes: [1, -1] },
    { id: 'signe-nn', temps: 'A', titre: 'Le signe : négatif × négatif', signes: [-1, -1] },
    { id: 'signe-melange', temps: 'A', titre: 'Le signe, au hasard', signes: null },
    { id: 'produit-np', temps: 'B', titre: 'Un négatif et un positif', signes: [-1, 1] },
    { id: 'produit-nn', temps: 'B', titre: 'Deux négatifs', signes: [-1, -1] },
    { id: 'produit-melange', temps: 'B', titre: 'Les deux cas mêlés', signes: null },
    { id: 'produit-simple', temps: 'B', titre: 'Sans les parenthèses', signes: null, simple: true },
    { id: 'trois-facteurs', temps: 'C', titre: 'Trois facteurs', taille: 3 },
    { id: 'quatre-facteurs', temps: 'C', titre: 'Quatre facteurs', taille: 4 },
    { id: 'particuliers', temps: 'C', titre: 'Zéro, un, moins un, et le carré' }
];

/** Les facteurs d'une question, selon sa marche. */
function tirerFacteurs(etape, rng) {
    const petit = () => rng.int(2, 9);
    if (etape.taille) {
        const k = etape.taille;
        // DE PLUS PETITS FACTEURS DÈS QU'IL Y EN A TROIS. Ce qu'on travaille
        // ici, c'est le COMPTE des facteurs négatifs ; « (−9) × (+8) × (+6) »
        // remplace ce comptage par un calcul de tête à trois chiffres, et
        // l'élève rate la question pour une raison qui n'est pas celle du
        // chapitre.
        const menu = () => rng.int(2, k === 3 ? 6 : 4);
        const f = Array.from({ length: k }, () => menu() * (rng.bool() ? 1 : -1));
        if (!negatifs(f)) f[rng.int(0, k - 1)] *= -1;
        return f;
    }
    const s = etape.signes || [rng.bool() ? 1 : -1, rng.bool() ? 1 : -1];
    return [petit() * s[0], petit() * s[1]];
}

/**
 * UNE QUESTION D'UNE MARCHE. Les distracteurs sont, un par un, les fautes que
 * cette marche-là provoque — et leur `why` les nomme, parce que « faux » n'a
 * jamais rien appris à personne.
 */
export function question(etape, rng) {
    const q = questionBrute(etape, rng);
    // UN PIÈGE QUI VAUT LA BONNE RÉPONSE N'EN EST PAS UN. Le cas arrive pour de
    // vrai : « tu as oublié le signe » propose le produit des distances à zéro,
    // qui EST la bonne réponse quand le produit est positif. On le retire ici,
    // à la source, plutôt que dans chaque branche.
    return { ...q, pieges: q.pieges.filter(p => String(p.value) !== String(q.reponse)) };
}

function questionBrute(etape, rng) {
    // --- Temps A : LE SIGNE SEUL, sans calculer -----------------------------
    if (etape.temps === 'A') {
        const f = tirerFacteurs(etape, rng);
        const juste = signeDuProduit(f);
        const contraire = juste === 'positif' ? 'négatif' : 'positif';
        return {
            enonce: produitComplet(f),
            question: 'Ce produit sera-t-il positif ou négatif ?',
            reponse: juste,
            pieges: [{
                value: contraire,
                why: negatifs(f) === 2
                    ? 'Deux négatifs donnent un POSITIF. C\'est la règle du produit, pas celle '
                        + 'de la somme.'
                    : 'Compte les facteurs négatifs : leur nombre décide.'
            }],
            choix: ['positif', 'négatif'],
            pourquoi: `${produitComplet(f)} : ${regle(f)} Le résultat est ${nb(valeur(f))}.`,
            facteurs: f
        };
    }

    // --- Temps C, dernière marche : les cas particuliers --------------------
    if (etape.id === 'particuliers') {
        const cas = rng.int(1, 4);
        const a = rng.int(2, 9);
        if (cas === 1) {
            const f = [-a, 0];
            return {
                enonce: produitComplet(f), question: 'Calcule.',
                reponse: 0,
                pieges: [
                    { value: -a, why: 'Multiplier par 0 donne 0, pas l\'autre facteur.' },
                    { value: a, why: 'Multiplier par 0 donne 0.' }
                ],
                pourquoi: `${produitComplet(f)} = 0. ${regle(f)}`,
                facteurs: f
            };
        }
        if (cas === 2) {
            const f = [-a, -1];
            return {
                enonce: produitComplet(f), question: 'Calcule.',
                reponse: a,
                pieges: [
                    { value: -a, why: 'Multiplier par −1 change le SIGNE : le résultat devient positif.' },
                    { value: -a - 1, why: 'C\'est un produit, pas une somme.' }
                ],
                pourquoi: `Multiplier par −1, c'est prendre l'OPPOSÉ : ${produitComplet(f)} = ${a}.`,
                facteurs: f
            };
        }
        if (cas === 3) {
            // LE CARRÉ D'UN NÉGATIF. (−4)² = +16 : la parenthèse dit que c'est
            // le nombre −4 qu'on élève au carré.
            const f = [-a, -a];
            return {
                enonce: `(${nb(-a)})²`, question: 'Calcule.',
                reponse: a * a,
                pieges: [
                    { value: -(a * a), why: `La parenthèse compte : (${nb(-a)})² = (${nb(-a)}) × (${nb(-a)}), `
                        + `et deux négatifs donnent un positif. C'est ${nb(-a)}² sans parenthèse qui vaut ${nb(-(a * a))}.` },
                    { value: -2 * a, why: 'Le carré est un PRODUIT, pas un double.' },
                    { value: 2 * a, why: 'Le carré est un produit : on multiplie le nombre par lui-même.' }
                ],
                pourquoi: `(${nb(-a)})² = (${nb(-a)}) × (${nb(-a)}) = ${a * a}. Deux facteurs négatifs, `
                    + `donc un résultat positif. Attention : SANS parenthèse, ${nb(-a)}² vaut ${nb(-(a * a))}.`,
                facteurs: f
            };
        }
        const f = [-a, 1];
        return {
            enonce: produitComplet(f), question: 'Calcule.',
            reponse: -a,
            pieges: [
                { value: a, why: 'Multiplier par +1 ne change RIEN, pas même le signe.' },
                { value: -a + 1, why: 'C\'est un produit, pas une somme.' }
            ],
            pourquoi: `Multiplier par 1 ne change rien : ${produitComplet(f)} = ${nb(-a)}.`,
            facteurs: f
        };
    }

    // --- Temps B et C : le produit entier -----------------------------------
    const f = tirerFacteurs(etape, rng);
    const v = valeur(f);
    const abs = f.reduce((p, x) => p * Math.abs(x), 1);
    const pieges = [
        { value: -v, why: signeDuProduit(f) === 'positif'
            ? `Le signe : il y a ${negatifs(f)} facteur${negatifs(f) > 1 ? 's' : ''} négatif${negatifs(f) > 1 ? 's' : ''}, `
                + 'un nombre PAIR — le produit est positif.'
            : `Le signe : il y a ${negatifs(f)} facteur${negatifs(f) > 1 ? 's' : ''} négatif${negatifs(f) > 1 ? 's' : ''}, `
                + 'un nombre IMPAIR — le produit est négatif.' },
        { value: f.reduce((s, x) => s + x, 0), why: 'Tu as additionné au lieu de multiplier.' },
        { value: abs, why: 'La valeur est bonne, mais tu as oublié le signe.' }
    ];
    return {
        enonce: etape.simple ? produitSimple(f) : produitComplet(f),
        question: 'Calcule.',
        reponse: v,
        pieges,
        pourquoi: `${produitComplet(f)} : ${regle(f)} On multiplie les distances à zéro — `
            + `${f.map(x => Math.abs(x)).join(' × ')} = ${abs} — et l'on pose le signe : ${nb(v)}.`,
        facteurs: f
    };
}

// --- Le générateur ------------------------------------------------------------

export const relatifsProduitGenerator = {
    id: 'num.relatifs.produit',
    label: 'Multiplier des relatifs, pas à pas',
    skills: [SKILL, SKILL_SENS],
    answerKinds: ['choice', 'numeric'],
    // La question se photocopie telle quelle : « (−3) × (+4) = ? » n'a besoin
    // d'aucune figure.
    ecrit: true,
    marches: (p) => {
        const choix = (p && p.etape) || 'progressif';
        if (['A', 'B', 'C'].includes(choix)) return ETAPES.filter(e => e.temps === choix).length;
        return choix === 'progressif' ? ETAPES.length : 1;
    },
    conseil: (p) => {
        const choix = (p && p.etape) || 'progressif';
        if (['A', 'B', 'C'].includes(choix)) {
            return conseilProgression(ETAPES.filter(e => e.temps === choix).length, p);
        }
        return choix === 'progressif' ? conseilProgression(ETAPES.length, p) : 6;
    },
    params: [
        {
            id: 'etape', type: 'select', label: 'Étape', echelle: true,
            aide: 'En « progressif », les douze marches s\'enchaînent, deux questions chacune. '
                + 'Le temps A ne demande QUE le signe, sans calculer : c\'est là que se joue le '
                + 'contresens du chapitre — (−3) × (−4) est POSITIF, alors que (−3) + (−4) est '
                + 'négatif. Le temps B calcule, le temps C compte les facteurs négatifs.',
            options: [
                { value: 'progressif', label: 'Progressif (les 12 marches à la suite)', court: 'Tout' },
                { value: 'A', label: 'A — le signe seul, sans calculer', court: 'A' },
                { value: 'B', label: 'B — le produit de deux relatifs', court: 'B' },
                { value: 'C', label: 'C — plusieurs facteurs, cas particuliers', court: 'C' },
                ...ETAPES.map((e, i) => ({ value: e.id, label: `${i + 1}. ${e.titre}`, court: String(i + 1) }))
            ],
            default: 'progressif'
        },
        paramRepartition({ marches: ETAPES.length })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const index = ctx.index ?? 0;
        const choix = params?.etape || 'progressif';

        let liste = ETAPES;
        if (['A', 'B', 'C'].includes(choix)) liste = ETAPES.filter(e => e.temps === choix);
        else if (choix !== 'progressif') liste = [ETAPES.find(e => e.id === choix) || ETAPES[0]];
        const rang = rangMarche(index, liste.length, params, undefined, totalDe(ctx, params));
        const etape = liste[rang];
        const rangGlobal = ETAPES.findIndex(e => e.id === etape.id);

        const q = question(etape, rng);
        const surLeSigne = etape.temps === 'A';

        // LES ÉTIQUETTES PORTENT LE VRAI SIGNE MOINS (U+2212), jamais le trait
        // d'union du clavier. Sur un chapitre où le signe EST le sujet, un
        // « -12 » plus court que le « − » de l'énoncé n'est pas un détail de
        // typographie : c'est l'œil qui ne fait plus le lien.
        const etiquette = (v) => (typeof v === 'number' ? nb(v) : v);
        const choices = finalizeChoices(rng, [
            { value: q.reponse, label: etiquette(q.reponse), correct: true },
            ...q.pieges.filter(p => p.value !== q.reponse)
                .map(p => ({ ...p, label: etiquette(p.value) }))
        ], surLeSigne
            ? { count: 2 }
            : { count: 4, filler: (r) => q.reponse + r.int(1, 9) * (r.bool() ? 1 : -1) })
            .map(c => ({ ...c, label: etiquette(c.label) }));

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.relatifs.produit',
            // La première marche travaille le SENS du signe, pas le calcul :
            // c'est la compétence qu'elle doit alimenter.
            skillId: surLeSigne ? SKILL_SENS : SKILL,
            // Le signe se CHOISIT (deux réponses possibles, pas un nombre à
            // taper) ; le produit se saisit ou se choisit, au gré de l'activité.
            answerKind: 'choice',
            prompt: {
                text: `${q.enonce} — ${q.question}`,
                // SUR LE PAPIER, LA QUESTION DOIT SE SUFFIRE. À l'écran, deux
                // boutons « positif / négatif » disent ce qu'on attend ; sur
                // une feuille où les marches se suivent, « (+6) × (+5) » tout
                // seul se lit comme un calcul à faire. Et les points de
                // suspension sont de trop : la fiche trace elle-même la ligne
                // où l'on écrit.
                papier: surLeSigne ? `Signe de ${q.enonce} :` : `${q.enonce} =`,
                html: `<div class="game-question"><span class="lit-expr">${q.enonce}`
                    + (surLeSigne ? '' : ' = ?') + '</span>'
                    + (surLeSigne ? `<span class="rel-q">${q.question}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices,
            hints: [
                surLeSigne
                    ? 'Ne calcule pas : compte seulement combien de facteurs sont négatifs.'
                    : 'Deux gestes séparés : d\'abord le SIGNE (compte les facteurs négatifs), '
                        + 'ensuite le nombre (multiplie les distances à zéro).',
                regle(q.facteurs)
            ],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                etape: etape.id, temps: etape.temps, titre: etape.titre,
                marche: rangGlobal + 1, marches: ETAPES.length,
                facteurs: q.facteurs, surLeSigne,
                // LE PAVÉ DOIT PORTER LA TOUCHE « ± ». Quand l'aide passe au
                // clavier, (−3) × (+4) attend −12 : sans elle la question
                // n'avait pas de réponse possible. Et elle est là pour TOUTES
                // les marches, sinon sa présence annoncerait le signe.
                signe: true
            }
        });
    }
};

export default relatifsProduitGenerator;
