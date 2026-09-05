// PRIORITÉS ET NOMBRES RELATIFS — les deux chapitres qui se piègent l'un l'autre.
//
// Rémy : « on va coupler deux exercices, celui de priorités opératoires et
// aussi les nombres relatifs. Tu le rajoutes en exercice à part. »
//
// CE N'EST PAS LA SOMME DE DEUX EXERCICES, C'EST UN TROISIÈME. Un élève peut
// savoir que « × passe avant − », savoir que « − (−6) = + 6 », et se tromper
// quand même sur « 5 − 3 × (−2) ». Parce qu'il faut faire les trois pas dans
// l'ordre : voir que la multiplication passe avant, PUIS que 3 × (−2) vaut −6,
// PUIS que soustraire −6 revient à ajouter 6. Le résultat est 11, et il
// surprend tout le monde la première fois.
//
// C'EST POURQUOI L'EXERCICE EST À PART. Ajouté comme une case à cocher du
// premier, il se serait mêlé aux séries de priorités pures et l'on n'aurait
// jamais su ce qui coince : la règle de priorité, la règle des signes, ou leur
// rencontre. Séparé, il a sa compétence, son bilan, sa place dans un parcours —
// et le professeur voit lequel des deux il doit reprendre.
//
// LES DISTRACTEURS SONT LES TROIS FAUTES DU CHAPITRE, et ils ne sont pas tirés
// au hasard : chacun est un raisonnement complet, mené jusqu'au bout, à partir
// d'une règle manquante. C'est ce qui les rend instructifs — l'élève qui
// reconnaît SA réponse dans un distracteur apprend où il a dérapé.
//
// TOUTE LA MÉCANIQUE VIENT DE core/priorites.js : le tirage, la cascade, la
// critique. On n'a écrit ici que ce qui est propre au couplage.

import { makeItem, finalizeChoices } from '../items.js';
import { tirerExpression, operationPrioritaire, naif, critiquer, ecrire } from '../priorites.js';
import { paramParMarche, rangMarche, parMarcheDe } from '../progression.js';

const SKILL = 'num.prio.relatifs';
const OPTS = { relatifs: true };

/**
 * LE VRAI SIGNE MOINS DANS CE QUI S'AFFICHE — U+2212, pas le trait d'union.
 *
 * La VALEUR d'une proposition reste un nombre : c'est elle qu'on compare, et
 * c'est elle que l'élève tape au pavé quand l'aide passe au clavier. Seule
 * l'ÉTIQUETTE change. Sur un chapitre où le signe EST le sujet, un « -6 » plus
 * court que le « − » de l'expression fait douter l'œil : le même signe doit
 * s'écrire pareil des deux côtés de l'écran. C'est la convention des autres
 * exercices de relatifs (`nb` dans generators/relatifs.js).
 */
const nb = (v) => String(v).replace('-', '\u2212');

/** Les morceaux « a op b » de l'expression, comme les propose l'écran. */
function fragmentsDe(jetons) {
    const out = [];
    jetons.forEach((j, i) => {
        if (j.type !== 'op') return;
        const g = jetons[i - 1], d = jetons[i + 1];
        if (!g || !d || g.type === '(' || d.type === ')') return;
        out.push({ index: i, texte: ecrire([g, j, d]) });
    });
    return out;
}

/**
 * LE RÉSULTAT DE CELUI QUI OUBLIE LE SIGNE DU PRODUIT.
 *
 * C'est LA faute du chapitre, et elle mérite d'être calculée jusqu'au bout
 * plutôt que devinée : on refait la cascade entière en prenant la valeur
 * ABSOLUE de chaque produit et de chaque quotient. « 5 − 3 × (−2) » donne alors
 * 5 − 6 = −1, qui est exactement ce que la moitié de la classe écrit.
 */
function sansSigneDuProduit(jetons) {
    let courant = jetons;
    for (let garde = 0; garde < 40; garde++) {
        if (courant.length === 1 && courant[0].type === 'n') return courant[0].valeur;
        const p = operationPrioritaire(courant, OPTS);
        if (!p || p.valeur === null) return null;
        const v = (p.op === '×' || p.op === '÷') ? Math.abs(p.valeur) : p.valeur;
        courant = courant.slice(0, p.index - 1)
            .concat([{ type: 'n', valeur: v }])
            .concat(courant.slice(p.index + 2));
        // Les parenthèses devenues inutiles : « (7) » ne se calcule pas deux fois.
        if (courant.length >= 3 && courant[0].type === '(' && courant[2].type === ')') {
            courant = [courant[1], ...courant.slice(3)];
        }
    }
    return null;
}

/**
 * LE RÉSULTAT DE CELUI QUI SOUSTRAIT AU LIEU D'AJOUTER.
 *
 * « 5 − (−6) » vaut 11, et l'on écrit −1 quand on n'a pas vu que les deux moins
 * s'annulent. On refait donc la cascade en traitant « − (−x) » comme « − x ».
 */
function moinsQuiNeSAnnulePas(jetons) {
    let courant = jetons;
    for (let garde = 0; garde < 40; garde++) {
        if (courant.length === 1 && courant[0].type === 'n') return courant[0].valeur;
        const p = operationPrioritaire(courant, OPTS);
        if (!p || p.valeur === null) return null;
        const rate = p.op === '-' && p.droite < 0;
        const v = rate ? p.gauche - Math.abs(p.droite) : p.valeur;
        courant = courant.slice(0, p.index - 1)
            .concat([{ type: 'n', valeur: v }])
            .concat(courant.slice(p.index + 2));
        if (courant.length >= 3 && courant[0].type === '(' && courant[2].type === ')') {
            courant = [courant[1], ...courant.slice(3)];
        }
    }
    return null;
}

/** Les propositions gardent leur valeur, et changent d'habit. */
const etiqueter = (choix) => choix.map(c => ({ ...c, label: nb(c.value) }));

/** La cascade, telle qu'on l'écrit au tableau — pour le corrigé papier. */
const cascadePapier = (lignes) => (lignes || []).map(l => l.texte).join(' = ');

export const prioritesRelatifsGenerator = {
    id: 'calc.priorites-relatifs',
    label: 'Priorités et nombres relatifs',
    skills: [SKILL],
    answerKinds: ['choice'],
    ecrit: true,
    // « Commencer plus facile » est une progression : il faut assez de
    // questions pour atteindre le niveau réglé. Voir core/duree.js.
    conseil: (p) => ((p && p.progressif) !== false)
        ? Math.max(1, Math.min(4, Number(p && p.niveau) || 2)) * parMarcheDe(p, 4) : 10,
    params: [
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
            aide: 'Attention : les parenthèses d\'un nombre négatif — « (−2) » — sont '
                + 'toujours là, elles font partie de son écriture. Cette case parle des '
                + 'parenthèses qui GROUPENT un calcul, comme dans « 3 × (−4 + 5) ».'
        },
        {
            id: 'mode', type: 'select', label: 'Question posée', default: 'resultat',
            options: [
                { value: 'resultat', label: 'Calculer le résultat' },
                { value: 'operation', label: 'Désigner l\'opération prioritaire' }
            ],
            aide: 'Désigner l\'opération est plus facile : on ne calcule rien, on '
                + 'applique seulement la règle de priorité. C\'est le bon départ quand '
                + 'les signes brouillent déjà la lecture.'
        },
        {
            id: 'progressif', type: 'checkbox', label: 'Commencer plus facile', default: true,
            aide: 'Les premières questions restent à trois nombres, puis la '
                + 'difficulté monte d\'un cran — au rythme réglé juste en dessous. Sur ce '
                + 'chapitre-là, deux règles se rencontrent : il vaut mieux les voir '
                + 'arriver une à une.'
        },
        paramParMarche({ defaut: 4, mot: 'cran' })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const plafond = Math.max(1, Math.min(4, Number(params.niveau) || 2));
        const niveau = params.progressif === false
            ? plafond
            : Math.min(plafond, 1 + rangMarche(Number(ctx.index) || 0, plafond, params, 4));

        const e = tirerExpression({
            rng, niveau, relatifs: true,
            parentheses: !!params.parentheses,
            imposer: !!params.parentheses,
            max: 9, plafond: 200
        });
        const p = operationPrioritaire(e.jetons, OPTS);
        const tous = fragmentsDe(e.jetons);
        const bon = tous.find(f => f.index === (p && p.index));
        const prioritaire = bon ? bon.texte : (tous[0] && tous[0].texte) || e.texte;
        const valeurPrio = p && p.valeur !== null ? p.valeur : null;
        const marque = e.texte.replace(prioritaire, `<span data-vise>${prioritaire}</span>`);

        const commun = {
            seed: rng.seed, generatorId: 'calc.priorites-relatifs', skillId: SKILL,
            answerKind: 'choice',
            meta: {
                eq: e.texte, right: prioritaire, value: e.resultat,
                etapes: e.etapes, avecParentheses: e.avecParentheses, theme: e.texte,
                // LA TOUCHE « ± » DU PAVÉ, POUR TOUTES LES QUESTIONS — y compris
                // celles dont la réponse est positive. Quand l'aide passe au
                // clavier, une réponse négative doit pouvoir s'écrire ; et si la
                // touche n'apparaissait que sur les réponses négatives, elle
                // donnerait le signe avant qu'on ait rien calculé.
                signe: true
            }
        };

        if (params.mode === 'operation') {
            const autres = tous.filter(f => f.texte !== prioritaire)
                .map(f => ({ value: f.texte, why: pourquoiPas(e.jetons, f.index) }));
            return makeItem({
                ...commun,
                prompt: {
                    text: `Quelle opération est prioritaire dans ${e.texte} ?`,
                    papier: `Dans ${e.texte}, quelle opération d'abord ?`,
                    html: `<div class="game-question">Priorité ?<br>`
                        + `<span data-vise style="color:var(--primary)">${e.texte}</span></div>`
                },
                answer: prioritaire,
                choices: finalizeChoices(rng,
                    [{ value: prioritaire, correct: true }, ...autres],
                    { count: Math.min(4, 1 + autres.length) }),
                hints: [
                    // LE SIGNE D'UN NOMBRE N'EST PAS UNE OPÉRATION : c'est la
                    // confusion propre à ce couplage, et elle vient en premier.
                    'Le « − » collé à un nombre entre parenthèses est son SIGNE, pas une soustraction.',
                    e.avecParentheses ? 'Regarde d\'abord les groupes de parenthèses.'
                        : 'Cherche la multiplication ou la division.',
                    `C'est ${prioritaire}.`
                ],
                explanation: `${p ? p.raison : ''} On calcule d'abord ${prioritaire}.`.trim(),
                difficulty: e.avecParentheses ? 5 : 4
            });
        }

        // LES TROIS FAUTES DU CHAPITRE, chacune menée jusqu'au bout.
        const naive = naif(e.jetons, OPTS);
        const sansSigne = sansSigneDuProduit(e.jetons);
        const deuxMoins = moinsQuiNeSAnnulePas(e.jetons);
        const pieges = [
            naive !== null && naive !== e.resultat ? {
                value: naive,
                why: 'Tu as calculé de gauche à droite : la multiplication et la '
                    + 'division passent avant l\'addition et la soustraction.'
            } : null,
            sansSigne !== null && sansSigne !== e.resultat ? {
                value: sansSigne,
                why: 'Le SIGNE du produit a été oublié : un facteur négatif rend le '
                    + 'produit négatif, et cela change tout ce qui suit.'
            } : null,
            deuxMoins !== null && deuxMoins !== e.resultat ? {
                value: deuxMoins,
                why: 'Soustraire un nombre NÉGATIF revient à AJOUTER son opposé : '
                    + '5 − (−6) = 5 + 6 = 11.'
            } : null
        ].filter(Boolean);

        // Deux distracteurs identiques n'en font qu'un : on dédoublonne, sinon
        // l'élève choisit entre trois cases dont deux disent la même chose.
        const vus = new Set();
        const distincts = pieges.filter(d => !vus.has(d.value) && vus.add(d.value));

        return makeItem({
            ...commun,
            prompt: {
                text: `${e.texte} = ?`,
                papier: `${e.texte} =`,
                html: `<div class="game-question">${marque} = ?</div>`
            },
            answer: e.resultat,
            choices: etiqueter(finalizeChoices(rng,
                [{ value: e.resultat, correct: true }, ...distincts], {
                    count: 4,
                    // LE REMPLISSAGE PEUT ÊTRE NÉGATIF ICI, et c'est tout le
                    // contraire de l'exercice de priorités pures — qui les
                    // interdit parce qu'il s'apprend avant les relatifs. Sur ce
                    // chapitre-ci, ne proposer que des positifs révélerait le
                    // signe de la réponse sans qu'on ait rien calculé.
                    filler: (r) => {
                        const d = r.int(1, 12);
                        return r.bool(0.5) ? e.resultat - d : e.resultat + d;
                    }
                })),
            hints: [
                'D\'abord la règle de priorité, ensuite seulement la règle des signes.',
                `Commence par ${prioritaire}.`,
                valeurPrio !== null ? `${prioritaire} = ${nb(valeurPrio)}.` : (p ? p.raison : '')
            ].filter(Boolean),
            explanation: valeurPrio !== null
                ? `On calcule d'abord ${prioritaire} = ${nb(valeurPrio)}, `
                    + `donc ${e.texte} = ${nb(e.resultat)}.`
                : `${e.texte} = ${nb(e.resultat)}.`,
            difficulty: Math.min(5, 3 + e.etapes),
            explicationPapier: cascadePapier(e.lignes)
        });
    }
};

/**
 * POURQUOI PAS CELLE-LÀ — la critique, avec le cas propre aux relatifs.
 *
 * `critiquer` du noyau connaît les priorités ; il ne connaît pas la confusion
 * entre le SIGNE d'un nombre et l'opération qui le précède, parce qu'elle
 * n'existe que dans ce chapitre-ci.
 */
function pourquoiPas(jetons, index) {
    const bonne = operationPrioritaire(jetons, OPTS);
    if (!bonne) return '';
    const j = jetons[index];
    const droite = jetons[index + 1];
    if (j && j.type === 'op' && droite && droite.type === 'n' && droite.valeur < 0
        && (j.op === '+' || j.op === '-') && (bonne.op === '×' || bonne.op === '÷')) {
        return 'Attention : le « − » entre parenthèses est le SIGNE du nombre, pas une '
            + 'opération. Et il reste une multiplication ou une division, qui passe avant.';
    }
    // Pour tout le reste, le noyau dit déjà les choses mieux que nous.
    return critiquer(jetons, index, OPTS) || '';
}

export { sansSigneDuProduit, moinsQuiNeSAnnulePas, fragmentsDe };
