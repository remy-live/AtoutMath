// Générateurs du domaine numérique.
//
// Chaque générateur est une fonction pure (params, ctx) -> Item. Aucun DOM,
// aucun accès à l'état global : le tirage aléatoire vient de `ctx.rng`, qui
// est ensemencé, donc une question est intégralement reproductible à partir
// de sa graine (rejeu à l'identique pour le plan de révisions, et côté
// serveur pour vérifier une évaluation).
//
// Point didactique important : les distracteurs ne sont pas du bruit. Chacun
// porte un `why` décrivant l'erreur qu'il piège. C'est ce qui permet de
// remplacer « Faux ! » par « tu as additionné au lieu de multiplier ».

import { makeItem, finalizeChoices } from '../items.js';
import { tirerExpression, operationPrioritaire, naif, critiquer, ecrire } from '../priorites.js';
import { souligner } from '../fiche.js';

// --- Addition ---------------------------------------------------------------

export const additionGenerator = {
    id: 'calc.addition',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Addition de deux entiers',
    skills: ['num.add.entiers'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'max', type: 'number', label: 'Plus grand terme', default: 10, min: 5, max: 100 },
        { id: 'retenue', type: 'select', label: 'Retenue', options: ['libre', 'avec', 'sans'], default: 'libre' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const max = params.max || 10;
        let a, b, guard = 0;
        do {
            a = rng.int(1, max);
            b = rng.int(1, max);
            guard++;
        } while (guard < 50 && !retenueOk(a, b, params.retenue));

        const target = a + b;
        const choices = finalizeChoices(rng, [
            { value: target, correct: true },
            { value: target - 1, why: 'Il manque 1 : vérifie ton comptage.' },
            { value: target + 1, why: 'Un de trop : attention en comptant sur les doigts.' },
            { value: Math.abs(a - b), why: 'Tu as soustrait au lieu d\'additionner.' }
        ], { count: 4, filler: r => target + r.int(2, 6) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.addition', skillId: 'num.add.entiers',
            answerKind: 'choice',
            prompt: { text: `${a} + ${b} = ?`, html: `<div class="game-question">${a} + ${b} = ?</div>` },
            answer: target,
            choices,
            hints: [
                `Décompose : ${a} + ${b}, c'est ${a} puis on avance de ${b}.`,
                b >= 5 ? `Passe par 10 : ${a} + ${10 - a} = 10, il reste ${b - (10 - a)} à ajouter.`
                    : `Compte à partir de ${a} : ${Array.from({ length: Math.min(b, 5) }, (_, i) => a + i + 1).join(', ')}…`
            ],
            explanation: `${a} + ${b} = ${target}.`,
            difficulty: max > 20 ? 3 : 1,
            meta: { a, b }
        });
    }
};

function retenueOk(a, b, mode) {
    if (!mode || mode === 'libre') return true;
    const hasRetenue = (a % 10) + (b % 10) >= 10;
    return mode === 'avec' ? hasRetenue : !hasRetenue;
}

// --- Soustraction -----------------------------------------------------------

export const soustractionGenerator = {
    id: 'calc.soustraction',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Soustraction de deux entiers',
    skills: ['num.sub.entiers'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'max', type: 'number', label: 'Plus grand nombre', default: 20, min: 10, max: 100 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const max = params.max || 20;
        const a = rng.int(Math.floor(max / 2), max);
        const b = rng.int(1, a);
        const target = a - b;

        const choices = finalizeChoices(rng, [
            { value: target, correct: true },
            { value: a + b, why: 'Tu as additionné au lieu de soustraire.' },
            { value: target + 1, why: 'Un de trop : recompte l\'écart.' },
            { value: target - 1, why: 'Il manque 1 : recompte l\'écart.' }
        ].filter(c => c.correct || c.value >= 0), { count: 4, filler: r => target + r.int(2, 8) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.soustraction', skillId: 'num.sub.entiers',
            answerKind: 'choice',
            prompt: { text: `${a} − ${b} = ?`, html: `<div class="game-question">${a} − ${b} = ?</div>` },
            answer: target,
            choices,
            hints: [
                `Cherche ce qu'il faut ajouter à ${b} pour atteindre ${a}.`,
                `${b} + ? = ${a}`
            ],
            explanation: `${a} − ${b} = ${target}, car ${b} + ${target} = ${a}.`,
            difficulty: 2,
            meta: { a, b }
        });
    }
};

// --- Fait multiplicatif -----------------------------------------------------

export const multFactGenerator = {
    id: 'calc.mult.fact',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Table de multiplication',
    skills: ['num.mult.table.*'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        // « FACTEUR MAXIMUM » N'A PLUS DE CHAMP. Rémy : « pas la peine de mettre
        // le nombre de facteur maximum, juste les cases à cocher. »
        //
        // Il a raison, et la preuve était déjà dans le fichier : le générateur
        // voisin — « Facteur manquant », le même exercice à l'envers — n'a
        // jamais eu ce réglage, et personne ne l'a jamais réclamé. Une table
        // de multiplication VA DE UN À DIX ; c'est ce que l'élève apprend par
        // cœur et ce que le professeur veut faire réviser. Douze ne sert
        // qu'aux tables anglo-saxonnes, cinq ne sert à rien.
        //
        // Le réglage reste, caché : il vaut dix, le générateur le lit, et un
        // parcours ancien qui portait onze continue de fonctionner.
        { id: 'maxFacteur', type: 'number', label: 'Facteur maximum', default: 10,
            min: 5, max: 12, cache: true }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const t = pickWeighted(rng, allowed, ctx.weakTables || []);
        const m = rng.int(1, params.maxFacteur || 10);
        const ans = t * m;

        // Distracteurs typés : chacun correspond à une erreur classique.
        const choices = finalizeChoices(rng, [
            { value: ans, correct: true },
            { value: t * (m + 1), why: `Tu as compté une fois de trop : c'est ${m} fois ${t}, pas ${m + 1}.` },
            { value: t * (m - 1), why: `Il manque un ${t} : c'est ${m} fois ${t}.` },
            { value: t + m, why: 'Tu as additionné au lieu de multiplier.' }
        ].filter(c => c.correct || c.value > 0), { count: 4, filler: r => t * r.int(1, 10) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.mult.fact', skillId: `num.mult.table.${t}`,
            answerKind: 'choice',
            prompt: { text: `${t} × ${m} = ?`, html: `<div class="game-question">${t} &times; ${m} = ?</div>` },
            answer: ans,
            choices,
            hints: [
                `${t} × ${m}, c'est ${m} paquets de ${t}.`,
                m > 1 ? `Appuie-toi sur ${t} × ${m - 1} = ${t * (m - 1)}, puis ajoute ${t}.`
                    : `Multiplier par 1 ne change rien.`,
                `${t} × ${m} = ${ans}.`
            ],
            explanation: `${t} × ${m} = ${ans}.`,
            difficulty: t >= 6 && m >= 6 ? 3 : 2,
            meta: { t, m, ans }
        });
    }
};

// Biaise le tirage vers les tables que l'élève rate (renforcement ciblé),
// tout en gardant du hasard pour ne pas enfermer l'élève dans ses échecs.
function pickWeighted(rng, allowed, weak) {
    const usable = weak.filter(t => allowed.includes(t));
    if (usable.length > 0 && rng.bool(0.6)) return rng.pick(usable);
    return rng.pick(allowed);
}

// --- Facteur manquant -------------------------------------------------------

export const multMissingGenerator = {
    id: 'calc.mult.missing',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Facteur manquant',
    skills: ['num.mult.facteur-manquant'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const known = pickWeighted(rng, allowed, ctx.weakTables || []);
        const missing = rng.int(2, 10);
        const product = known * missing;
        const firstMissing = rng.bool();
        const eq = firstMissing ? `? × ${known} = ${product}` : `${known} × ? = ${product}`;

        // Le digicode affiche 12 cases : les distracteurs typés d'abord, puis
        // les valeurs restantes de 1 à 12 pour remplir la grille.
        let next = 0;
        const choices = finalizeChoices(rng, [
            { value: missing, correct: true },
            { value: product - known, why: 'Tu as soustrait : ici il faut diviser.' },
            { value: missing + 1, why: `Un de trop : ${known} × ${missing + 1} = ${known * (missing + 1)}.` },
            { value: missing - 1, why: `Trop petit : ${known} × ${missing - 1} = ${known * (missing - 1)}.` }
        ].filter(c => c.correct || (c.value >= 1 && c.value <= 12)), {
            count: 12,
            filler: () => (next < 12 ? ++next : null)
        });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.mult.missing', skillId: 'num.mult.facteur-manquant',
            answerKind: 'choice',
            prompt: {
                text: eq.replace('?', '...'),
                // `data-vise` désigne l'ÉGALITÉ, pas le titre : c'est elle que
                // la démonstration doit cercler en disant « combien de fois 4
                // tient-il dans 24 ? ». Sans repère, le robot entourait
                // « Facteur Manquant » — le nom du jeu.
                html: `<div class="game-question" style="margin-bottom:0;">Facteur Manquant</div>
                       <div data-vise style="font-size:2.2rem; font-weight:bold; color:var(--primary);">${eq}</div>`
            },
            answer: missing,
            choices,
            hints: [
                `Combien de fois ${known} tient-il dans ${product} ?`,
                `Calcule ${product} ÷ ${known}.`,
                `${known} × ${missing} = ${product}.`
            ],
            explanation: `${product} ÷ ${known} = ${missing}, donc ${known} × ${missing} = ${product}.`,
            difficulty: 3,
            meta: { known, missing, product, firstMissing }
        });
    }
};

// --- Division ---------------------------------------------------------------

export const divisionGenerator = {
    id: 'calc.division',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Division (quotient exact)',
    skills: ['num.div.quotient'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Diviseurs', options: [2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const d = pickWeighted(rng, allowed, ctx.weakTables || []);
        const q = rng.int(2, 10);
        const n = d * q;

        return makeItem({
            seed: rng.seed, generatorId: 'calc.division', skillId: 'num.div.quotient',
            answerKind: 'choice',
            prompt: { text: `${n} ÷ ${d} = ?`, html: `<div class="game-question">${n} ÷ ${d} = ?</div>` },
            answer: q,
            choices: finalizeChoices(rng, [
                { value: q, correct: true },
                { value: n - d, why: 'Tu as soustrait au lieu de diviser.' },
                { value: q + 1, why: `Trop grand : ${d} × ${q + 1} = ${d * (q + 1)}.` },
                { value: q - 1, why: `Trop petit : ${d} × ${q - 1} = ${d * (q - 1)}.` }
            ].filter(c => c.correct || c.value >= 1), { count: 4, filler: r => q + r.int(2, 9) }),
            hints: [
                `Combien de paquets de ${d} peut-on faire avec ${n} ?`,
                `Cherche dans la table de ${d} : ${d} × ? = ${n}.`
            ],
            explanation: `${n} ÷ ${d} = ${q}, car ${d} × ${q} = ${n}.`,
            difficulty: 3,
            meta: { n, d, q }
        });
    }
};

// --- Priorités opératoires --------------------------------------------------
//
// LES EXPRESSIONS VIENNENT DU NOYAU, plus de gabarits écrits ici.
//
// Cet exercice ne connaissait que quatre formes — « a + b × c » et ses trois
// sœurs — avec des nombres de 2 à 9. Ni parenthèses, ni quatre termes, ni
// division : trois réglages de moins que la fiche papier du même sujet, qui
// s'appuie, elle, sur core/priorites.js depuis toujours. Rémy : « avoir la
// possibilité d'avoir des calculs plus grands, et tu m'en fais un autre avec
// des parenthèses ».
//
// On tire donc par `tirerExpression`, comme la fiche : même moteur, mêmes
// garanties (toutes les étapes tombent juste, aucun négatif en cours de
// route, et sans parenthèses le calcul de gauche à droite donne toujours une
// AUTRE réponse — sinon l'élève qui ignore la règle tombe juste par hasard).

/**
 * Les opérations lisibles dans l'expression, chacune avec ses deux opérandes
 * TELS QU'ILS SONT ÉCRITS.
 *
 * Un opérande n'est pas toujours un nombre : dans « (2 × 7) + 8 », le membre
 * gauche du « + » est le groupe entier. En n'acceptant que des nombres, on ne
 * trouvait qu'UNE opération dans une expression parenthésée — et le QCM
 * n'avait plus qu'une seule case à cocher.
 */
function bornerGauche(jetons, i) {
    const j = jetons[i - 1];
    if (!j) return -1;
    if (j.type === 'n') return i - 1;
    if (j.type !== ')') return -1;
    let prof = 0;
    for (let k = i - 1; k >= 0; k--) {
        if (jetons[k].type === ')') prof++;
        else if (jetons[k].type === '(' && --prof === 0) return k;
    }
    return -1;
}

function bornerDroite(jetons, i) {
    const j = jetons[i + 1];
    if (!j) return -1;
    if (j.type === 'n') return i + 1;
    if (j.type !== '(') return -1;
    let prof = 0;
    for (let k = i + 1; k < jetons.length; k++) {
        if (jetons[k].type === '(') prof++;
        else if (jetons[k].type === ')' && --prof === 0) return k;
    }
    return -1;
}

function fragmentsDe(jetons) {
    const out = [];
    for (let i = 0; i < jetons.length; i++) {
        if (jetons[i].type !== 'op') continue;
        const g = bornerGauche(jetons, i), d = bornerDroite(jetons, i);
        if (g < 0 || d < 0) continue;
        out.push({ index: i, texte: ecrire(jetons.slice(g, d + 1)) });
    }
    return out;
}

/**
 * LA CASCADE DU CAHIER, EN COLONNE ET AVEC DES « = ».
 *
 * Rémy : « des = et non des flèches, souligner le calcul prioritaire, les
 * calculs en colonne ». Le corrigé écrivait tout sur une ligne, séparé par des
 * flèches — « 9 + 2 × 5 − 7 -> 9 + 10 − 7 -> 19 − 7 -> 12 ». Ce n'est pas ce
 * qu'on demande d'écrire : au cahier, chaque étape va à la ligne, sous la
 * précédente, précédée d'un signe égal — parce que ces expressions SONT égales,
 * et que c'est toute la leçon. Sur chaque ligne, l'opération qu'on va faire est
 * soulignée : c'est elle qui est prioritaire, et c'est tout ce que la règle
 * demande de voir.
 */
function cascadePapier(lignes) {
    if (!lignes || !lignes.length) return '';
    const nombre = (v) => String(v).replace('.', ',');
    const signe = (op) => (op === '-' ? '−' : op);
    return lignes.map((l, i) => {
        let texte = l.texte;
        const f = lignes[i + 1] && lignes[i + 1].fait;
        if (f && f.gauche !== null && f.droite !== null) {
            const morceau = `${nombre(f.gauche)} ${signe(f.op)} ${nombre(f.droite)}`;
            const ou = texte.indexOf(morceau);
            // Introuvable : on n'invente pas de soulignement. Une ligne sans
            // marque vaut mieux qu'une marque au mauvais endroit.
            if (ou >= 0) {
                texte = texte.slice(0, ou) + souligner(morceau)
                    + texte.slice(ou + morceau.length);
            }
        }
        return (i === 0 ? '' : '= ') + texte;
    }).join('\n');
}

export const prioriteGenerator = {
    id: 'calc.priorites',
    label: 'Priorités opératoires',
    skills: ['num.prio'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'mode', type: 'select', label: 'Question posée', options: ['operation', 'resultat'], default: 'operation' },
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 2,
            options: [
                { value: 1, label: '1 — Trois nombres, deux opérations' },
                { value: 2, label: '2 — Jusqu\'à quatre nombres' },
                { value: 3, label: '3 — Les parenthèses arrivent' },
                { value: 4, label: '4 — Deux groupes de parenthèses' }
            ]
        },
        {
            id: 'parentheses', type: 'checkbox', label: 'Avec des parenthèses', default: false,
            aide: 'Sans elles, seule la règle « × et ÷ avant + et − » est en jeu. '
                + 'Elles n\'apparaissent qu\'à partir de la difficulté 3.'
        },
        {
            id: 'grands', type: 'checkbox', label: 'Des calculs plus grands', default: false,
            aide: 'Les nombres montent jusqu\'à 20 et le résultat jusqu\'à 2 000 : '
                + 'la règle est la même, mais elle ne se devine plus de tête.'
        },
        {
            id: 'progressif', type: 'checkbox', label: 'Commencer plus facile', default: false,
            aide: 'Les quatre premières questions restent à trois nombres et deux opérations, '
                + 'puis la difficulté monte d\'un cran toutes les quatre questions jusqu\'à celle '
                + 'réglée ci-dessus. On installe la règle avant de la compliquer.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const grands = !!params.grands;
        // LA DIFFICULTÉ MONTE. Rémy : « je trouve les calculs un peu durs quand
        // même dès le départ ». La première question d'une série sert à
        // reconnaître la règle — « × avant + » — pas à la manier sur quatre
        // nombres ; on part donc du cran le plus simple et l'on rejoint le
        // niveau réglé au bout de quelques questions.
        const plafondNiveau = Math.max(1, Math.min(4, Number(params.niveau) || 2));
        const niveau = params.progressif
            ? Math.min(plafondNiveau, 1 + Math.floor((Number(ctx.index) || 0) / 4))
            : plafondNiveau;
        const e = tirerExpression({
            rng,
            niveau,
            parentheses: !!params.parentheses,
            imposer: !!params.parentheses,
            max: grands ? 20 : 9,
            plafond: grands ? 2000 : 400
        });
        const p = operationPrioritaire(e.jetons);
        const tous = fragmentsDe(e.jetons);
        const bon = tous.find(f => f.index === (p && p.index));
        const prioritaire = bon ? bon.texte : tous[0].texte;
        const valeurPrio = p && p.valeur !== null ? p.valeur : null;
        // Le morceau d'énoncé que le robot montrera. `data-vise` ne change
        // rien à l'affichage : c'est la démonstration qui le fait ressortir,
        // au moment exact où elle en parle.
        const marque = e.texte.replace(prioritaire, `<span data-vise>${prioritaire}</span>`);
        const commun = {
            seed: rng.seed, generatorId: 'calc.priorites', skillId: 'num.prio',
            answerKind: 'choice',
            meta: {
                eq: e.texte, right: prioritaire, value: e.resultat,
                etapes: e.etapes, avecParentheses: e.avecParentheses,
                theme: e.texte
            }
        };

        // Deux façons d'interroger la même compétence : identifier l'opération
        // prioritaire, ou calculer le résultat. La seconde est plus exigeante.
        if (params.mode === 'resultat') {
            // Le distracteur le plus instructif est le résultat de celui qui
            // calcule de gauche à droite : il révèle exactement la règle
            // manquante. Avec des parenthèses il n'existe pas — on ne lit pas
            // « (3 + 4) × 5 » de gauche à droite —, et le remplissage prend le
            // relais.
            const naive = naif(e.jetons);
            return makeItem({
                ...commun,
                prompt: {
                    text: `${e.texte} = ?`,
                    papier: `${e.texte} =`,
                    html: `<div class="game-question">${marque} = ?</div>`
                },
                answer: e.resultat,
                choices: finalizeChoices(rng, [
                    { value: e.resultat, correct: true },
                    naive !== null && naive !== e.resultat
                        ? { value: naive, why: 'Tu as calculé de gauche à droite : la multiplication et la division passent avant.' }
                        : null
                ].filter(Boolean), {
                    count: 3,
                    // JAMAIS DE DISTRACTEUR NÉGATIF. Les priorités s'apprennent
                    // avant les relatifs : proposer « −7 » comme réponse
                    // possible à « 7 − 2 × 2 + 2 » introduit une notion qui
                    // n'est pas encore là, et n'apprend rien de la règle.
                    filler: (r) => {
                        const d = r.int(1, 12);
                        return (e.resultat - d >= 1 && r.bool(0.5)) ? e.resultat - d : e.resultat + d;
                    }
                }),
                hints: [
                    `Commence par ${prioritaire}.`,
                    valeurPrio !== null ? `${prioritaire} = ${valeurPrio}.` : (p ? p.raison : '')
                ].filter(Boolean),
                explanation: valeurPrio !== null
                    ? `On calcule d'abord ${prioritaire} = ${valeurPrio}, donc ${e.texte} = ${e.resultat}.`
                    : `${e.texte} = ${e.resultat}.`,
                difficulty: Math.min(5, 2 + e.etapes),
                explicationPapier: cascadePapier(e.lignes)
            });
        }

        // Les autres opérations de l'expression font les distracteurs : elles
        // sont VISIBLES dans l'énoncé, donc chacune est une réponse qu'un
        // élève donne vraiment. Un nombre tiré au hasard ne l'est pas.
        // Et chacune porte SA raison, pas une raison générique : « il reste des
        // parenthèses », « elle passe avant les additions », « à priorité
        // égale on va de gauche à droite ». C'est le noyau qui la donne — les
        // trois phrases SONT la leçon.
        const autres = tous.filter(f => f.texte !== prioritaire)
            .map(f => ({ value: f.texte, why: critiquer(e.jetons, f.index) || '' }));
        return makeItem({
            ...commun,
            prompt: {
                text: `Quelle opération est prioritaire dans ${e.texte} ?`,
                papier: `Dans ${e.texte}, quelle opération d'abord ?`,
                // Ici, l'opération prioritaire EST la réponse : on ne désigne
                // que l'expression entière, jamais le morceau cherché.
                html: `<div class="game-question">Priorité ?<br><span data-vise style="color:var(--primary)">${e.texte}</span></div>`
            },
            answer: prioritaire,
            choices: finalizeChoices(rng,
                [{ value: prioritaire, correct: true }, ...autres],
                { count: Math.min(4, 1 + autres.length) }),
            hints: [
                e.avecParentheses ? 'Regarde d\'abord les parenthèses.' : 'Cherche la multiplication ou la division.',
                `C'est ${prioritaire}.`
            ],
            explanation: `${p ? p.raison : ''} On calcule d'abord ${prioritaire}.`.trim(),
            difficulty: e.avecParentheses ? 4 : 3
        });
    }
};

// --- Générateur composite ---------------------------------------------------
// Certains jeux (arcade) veulent alterner les opérations dans une même partie.
// Plutôt que de recoder ce mélange dans chaque jeu — ce que faisait l'ancien
// code — on compose les générateurs existants. La compétence tracée reste
// celle de la question réellement posée.

const MIXTE_SOURCES = {
    '+': additionGenerator,
    '-': soustractionGenerator,
    '*': multFactGenerator,
    '/': divisionGenerator
};

export const mixteGenerator = {
    id: 'calc.mixte',
    // RÉFLEXE : la répétition EST l'exercice. Voir core/duree.js — vingt
    // questions, pas dix, parce qu'un automatisme ne se construit pas en dix.
    duree: 'reflexe',
    label: 'Calcul mental varié',
    skills: ['num.add.entiers', 'num.sub.entiers', 'num.div.quotient', 'num.mult.table.*'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'operations', type: 'multiselect', label: 'Opérations', options: [
            // Le SYMBOLE seul, et le nom en infobulle. Écrits en toutes
            // lettres, les quatre opérations prenaient deux rangées à elles
            // seules et repoussaient les tables hors de l'écran. « + − × ÷ »
            // sont les signes que l'élève lit dans l'exercice : ils n'ont
            // besoin d'aucune traduction.
            { value: '+', label: '+', aide: 'Addition' },
            { value: '-', label: '−', aide: 'Soustraction' },
            { value: '*', label: '×', aide: 'Multiplication' },
            { value: '/', label: '÷', aide: 'Division' }
        ], default: ['+', '-'] },
        {
            id: 'tables', type: 'multiselect', label: 'Tables',
            options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10],
            // « (si × ou ÷) » : la condition tenait dans le libellé, à charge
            // pour le lecteur de la vérifier lui-même. Elle se vérifie ici.
            visibleSi: (r) => (r.operations || ['+', '-']).some(o => o === '*' || o === '/')
        },
        {
            id: 'max', type: 'number', label: 'Plus grand terme', default: 20, min: 5, max: 100,
            visibleSi: (r) => (r.operations || ['+', '-']).some(o => o === '+' || o === '-')
        }
    ],
    generate(params, ctx) {
        const ops = (params.operations && params.operations.length) ? params.operations : ['+', '-'];
        const op = ctx.rng.pick(ops);
        const source = MIXTE_SOURCES[op] || additionGenerator;
        const item = source.generate(params, ctx);
        // On conserve l'identité du générateur composite pour la configuration,
        // mais la compétence reste celle de la question posée.
        return { ...item, generatorId: 'calc.mixte', meta: { ...item.meta, op } };
    }
};

