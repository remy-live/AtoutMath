// LE MOT JUSTE — le vocabulaire du calcul.
//
// Somme, différence, produit, quotient ; termes et facteurs ; dividende,
// diviseur, reste. Rien de tout cela ne se calcule : cela se SAIT, et un élève
// qui ne le sait pas perd des points sur des questions qu'il aurait su faire —
// « calcule la différence de 12 et 5 » est un exercice d'addition raté pour
// cause de vocabulaire.
//
// C'est le seul chapitre de l'application où la bonne réponse ne s'obtient par
// aucun raisonnement. On l'installe donc comme on installe une table : par des
// allers-retours courts, dans les DEUX SENS — du calcul vers la phrase, et de
// la phrase vers le calcul. Un élève qui sait traduire « la somme de 12 et 5 »
// mais bloque sur « 8 × 5 se dit… » n'a appris qu'une moitié du mot.
//
// TROIS PIÈGES SONT ENCODÉS EXPRÈS :
//
//   1. « ET » CONTRE « PAR ». On dit la somme de 3 ET 2, la différence de 3 ET
//      2, mais le produit de 3 PAR 2 et le quotient de 3 PAR 2. La fiche de
//      Rémy surligne ces deux mots ; ici ils sont dans les distracteurs.
//
//   2. TERMES CONTRE FACTEURS. Les nombres d'une addition ou d'une
//      soustraction sont des termes, ceux d'une multiplication des facteurs.
//      C'est la confusion la plus fréquente, et elle a son distracteur.
//
//   3. LE MOT DÉSIGNE LE RÉSULTAT, PAS L'OPÉRATION. « 3 + 2 est une addition,
//      son résultat est la somme » : deux phrases, deux mots, et l'élève qui
//      répond « une somme » à « qu'est-ce que 3 + 2 ? » se trompe d'objet.
//
// Le générateur est pur : aucun DOM, tout vient de `ctx.rng`.

import { makeItem, finalizeChoices } from '../items.js';

/** Les quatre opérations, avec tout ce qui se dit à leur sujet. */
const OPERATIONS = [
    {
        id: 'addition', signe: '+', nom: 'une addition', resultat: 'la somme',
        nombres: 'les termes', liaison: 'et', calc: (a, b) => a + b
    },
    {
        id: 'soustraction', signe: '−', nom: 'une soustraction', resultat: 'la différence',
        nombres: 'les termes', liaison: 'et', calc: (a, b) => a - b
    },
    {
        id: 'multiplication', signe: '×', nom: 'une multiplication', resultat: 'le produit',
        nombres: 'les facteurs', liaison: 'par', calc: (a, b) => a * b
    },
    {
        id: 'division', signe: '÷', nom: 'une division', resultat: 'le quotient',
        nombres: 'le dividende et le diviseur', liaison: 'par', calc: (a, b) => a / b
    }
];

const RESULTATS = OPERATIONS.map(o => o.resultat);
const NOMS = OPERATIONS.map(o => o.nom);

/** Les mots qui multiplient ou divisent sans le dire. */
const MULTIPLES = [
    { mot: 'le double', k: 2, op: '×', dit: 'multiplier par 2' },
    { mot: 'le triple', k: 3, op: '×', dit: 'multiplier par 3' },
    { mot: 'le quadruple', k: 4, op: '×', dit: 'multiplier par 4' },
    { mot: 'la moitié', k: 2, op: '÷', dit: 'diviser par 2' },
    { mot: 'le tiers', k: 3, op: '÷', dit: 'diviser par 3' },
    { mot: 'le quart', k: 4, op: '÷', dit: 'diviser par 4' }
];

/** Les quatre noms de la division posée. */
const POSEE = [
    { role: 'le dividende', quoi: 'le nombre qu\'on partage' },
    { role: 'le diviseur', quoi: 'le nombre de parts' },
    { role: 'le quotient', quoi: 'le résultat de la division' },
    { role: 'le reste', quoi: 'ce qui ne se partage plus' }
];

const VOLETS = ['resultat', 'nombres', 'phrase-vers-calcul', 'calcul-vers-phrase', 'multiples', 'posee'];

/** L'écriture d'un calcul, du côté des maths et non du côté du clavier. */
const ecrire = (a, op, b) => `${a} ${op.signe} ${b}`;

// --- Les six familles de questions ------------------------------------------

/** « Le résultat de 3 + 2 s'appelle… » — le mot du RÉSULTAT. */
function questionResultat(rng) {
    const op = rng.pick(OPERATIONS);
    const a = rng.int(2, 12), b = rng.int(2, 9);
    const calcul = ecrire(a, op, b);
    return {
        skill: 'num.vocabulaire.resultat',
        texte: `Le résultat de ${calcul} s'appelle…`,
        choix: [
            { value: op.resultat, label: op.resultat, correct: true },
            // Le nom de l'OPÉRATION, et non de son résultat : c'est la
            // confusion que la question vise.
            { value: op.nom, label: op.nom, why: `${calcul} EST ${op.nom} ; son RÉSULTAT est ${op.resultat}.` },
            ...RESULTATS.filter(r => r !== op.resultat).map(r => ({
                value: r, label: r,
                why: `${r} est le résultat d'une autre opération. Ici on a ${op.signe}.`
            }))
        ],
        explication: `${calcul} est ${op.nom} : son résultat est ${op.resultat} de ${a} ${op.liaison} ${b}.`,
        indices: [
            `Le signe est « ${op.signe} » : quelle opération est-ce ?`,
            `${op.nom.charAt(0).toUpperCase() + op.nom.slice(1)} a pour résultat ${op.resultat}.`
        ],
        theme: `resultat-${op.id}`
    };
}

/** « Dans 3 × 2, comment appelle-t-on 3 et 2 ? » — termes ou facteurs. */
function questionNombres(rng) {
    // La division n'entre pas dans cette famille : ses deux nombres ont chacun
    // leur nom, ce que la famille « division posée » traite pour elle-même.
    const op = rng.pick(OPERATIONS.filter(o => o.id !== 'division'));
    const a = rng.int(2, 12), b = rng.int(2, 9);
    const calcul = ecrire(a, op, b);
    const autre = op.nombres === 'les termes' ? 'les facteurs' : 'les termes';
    return {
        skill: 'num.vocabulaire.nombres',
        texte: `Dans ${calcul}, comment appelle-t-on ${a} et ${b} ?`,
        choix: [
            { value: op.nombres, label: op.nombres, correct: true },
            {
                value: autre, label: autre,
                why: autre === 'les facteurs'
                    ? 'Les facteurs sont les nombres d\'une MULTIPLICATION.'
                    : 'Les termes sont les nombres d\'une addition ou d\'une soustraction.'
            },
            { value: op.resultat, label: op.resultat, why: `${op.resultat} est le RÉSULTAT, pas les nombres de départ.` },
            { value: 'les quotients', label: 'les quotients', why: 'Un quotient est le résultat d\'une division.' }
        ],
        explication: `${calcul} est ${op.nom} : ${a} et ${b} sont ${op.nombres}.`,
        indices: [
            'Les nombres d\'une addition ou d\'une soustraction sont les TERMES.',
            'Ceux d\'une multiplication sont les FACTEURS.'
        ],
        theme: `nombres-${op.id}`
    };
}

/** « La somme de 12 et 5 » → 12 + 5. La phrase donne le calcul. */
function questionPhraseVersCalcul(rng) {
    const op = rng.pick(OPERATIONS);
    // LA DIVISION DOIT TOMBER JUSTE. « Le quotient de 7 par 2 » vaut 3,5 :
    // l'élève quitte alors la question de vocabulaire pour une question de
    // calcul, et se trompe sur celle qu'on ne lui posait pas. On tire donc le
    // diviseur d'abord, et le dividende comme un de ses multiples.
    const b = op.id === 'division' ? rng.int(2, 5) : rng.int(2, 9);
    const a = op.id === 'division' ? b * rng.int(2, 8) : rng.int(2, 20);
    const bon = ecrire(a, op, b);
    return {
        skill: 'num.vocabulaire.traduire',
        texte: `${op.resultat.charAt(0).toUpperCase() + op.resultat.slice(1)} de ${a} ${op.liaison} ${b}, c'est…`,
        choix: [
            { value: bon, label: bon, correct: true },
            ...OPERATIONS.filter(o => o.id !== op.id).map(o => ({
                value: ecrire(a, o, b), label: ecrire(a, o, b),
                why: `${ecrire(a, o, b)} donne ${o.resultat}, pas ${op.resultat}.`
            }))
        ],
        explication: `${op.resultat} de ${a} ${op.liaison} ${b} s'écrit ${bon} = ${op.calc(a, b)}.`,
        indices: [
            `${op.resultat.charAt(0).toUpperCase() + op.resultat.slice(1)}, c'est le résultat ${op.nom.replace('une ', 'd\'une ').replace('un ', 'd\'un ')}.`,
            `Le signe à écrire est « ${op.signe} ».`
        ],
        theme: `traduire-${op.id}`
    };
}

/** « 8 × 5, ça se dit… » → le produit de 8 PAR 5. Le calcul donne la phrase. */
function questionCalculVersPhrase(rng) {
    const op = rng.pick(OPERATIONS);
    const a = rng.int(2, 20), b = rng.int(2, 9);
    const calcul = ecrire(a, op, b);
    const bon = `${op.resultat} de ${a} ${op.liaison} ${b}`;
    // LE PIÈGE DU « ET » ET DU « PAR ». On dit la somme de 3 et 2, mais le
    // produit de 3 par 2 : le distracteur ne change QUE ce mot-là.
    const liaisonFausse = op.liaison === 'et' ? 'par' : 'et';
    const autre = rng.pick(OPERATIONS.filter(o => o.id !== op.id));
    return {
        skill: 'num.vocabulaire.traduire',
        texte: `${calcul}, ça se dit…`,
        choix: [
            { value: bon, label: bon, correct: true },
            {
                value: `${op.resultat} de ${a} ${liaisonFausse} ${b}`,
                label: `${op.resultat} de ${a} ${liaisonFausse} ${b}`,
                why: `Le mot est juste, la liaison non : on dit ${op.resultat} de ${a} ${op.liaison.toUpperCase()} ${b}.`
            },
            {
                value: `${autre.resultat} de ${a} ${autre.liaison} ${b}`,
                label: `${autre.resultat} de ${a} ${autre.liaison} ${b}`,
                why: `${autre.resultat} est le résultat d'${autre.nom}, or ici le signe est « ${op.signe} ».`
            },
            {
                value: `${op.nom} de ${a} ${op.liaison} ${b}`,
                label: `${op.nom} de ${a} ${op.liaison} ${b}`,
                why: `${calcul} EST ${op.nom} ; ce qu'on nomme ici, c'est son résultat.`
            }
        ],
        explication: `${calcul} se lit « ${bon} ». On dit « ${op.liaison} » avec ${op.resultat}.`,
        indices: [
            `Le signe « ${op.signe} » donne ${op.resultat}.`,
            'Attention au petit mot : somme et différence vont avec « et », produit et quotient avec « par ».'
        ],
        theme: `dire-${op.id}`
    };
}

/** « Le double de 5 », « le tiers de 30 » : multiplier ou diviser sans le dire. */
function questionMultiples(rng) {
    const m = rng.pick(MULTIPLES);
    // Au moins 6 pour une division : la moitié de 2, c'est 1, et 1, 2, 4 se
    // télescopent avec les distracteurs — la question n'aurait plus quatre
    // propositions distinctes.
    const n = m.op === '×' ? rng.int(3, 25) : rng.int(3, 12) * m.k;
    const bon = m.op === '×' ? n * m.k : n / m.k;
    const inverse = m.op === '×' ? n / m.k : n * m.k;
    // Plus de candidats qu'il n'en faut : `finalizeChoices` écarte les doublons
    // et garde les trois premiers survivants, dans cet ordre de pertinence.
    const candidats = [
        {
            value: Number.isInteger(inverse) ? inverse : null,
            why: `Là, tu as fait l'inverse : ${m.mot}, c'est ${m.dit}.`
        },
        { value: n + m.k, why: `${m.mot}, ça ne s'ajoute pas : c'est ${m.dit}.` },
        { value: n, why: `${m.mot} de ${n} n'est pas ${n} : il faut ${m.dit}.` },
        { value: n - m.k, why: `${m.mot}, ça ne se soustrait pas : c'est ${m.dit}.` },
        { value: bon + 1, why: `Presque : ${m.mot} de ${n}, c'est exactement ${bon}.` }
    ].filter(c => c.value !== null && c.value > 0 && Number.isInteger(c.value));
    return {
        skill: 'num.vocabulaire.multiples',
        texte: `${m.mot.charAt(0).toUpperCase() + m.mot.slice(1)} de ${n}, c'est…`,
        choix: [
            { value: bon, label: String(bon), correct: true },
            ...candidats.map(c => ({ value: c.value, label: String(c.value), why: c.why }))
        ],
        explication: `${m.mot} de ${n}, c'est ${m.dit} : ${m.op === '×' ? `${n} × ${m.k}` : `${n} ÷ ${m.k}`} = ${bon}.`,
        indices: [
            `${m.mot.charAt(0).toUpperCase() + m.mot.slice(1)}, cela veut dire ${m.dit}.`,
            `${m.op === '×' ? `${n} × ${m.k}` : `${n} ÷ ${m.k}`} = ?`
        ],
        theme: `multiple-${m.mot}`
    };
}

/** La division posée : dividende, diviseur, quotient, reste. */
function questionPosee(rng) {
    const diviseur = rng.int(2, 9);
    const quotient = rng.int(2, 12);
    const reste = rng.int(1, diviseur - 1);
    const dividende = diviseur * quotient + reste;
    const valeurs = {
        'le dividende': dividende, 'le diviseur': diviseur,
        'le quotient': quotient, 'le reste': reste
    };
    const cible = rng.pick(POSEE);
    const n = valeurs[cible.role];
    // Un nombre qui apparaîtrait deux fois rendrait la question ambiguë.
    const distincts = Object.values(valeurs).filter(v => v === n).length === 1;
    if (!distincts) return questionPosee(rng);
    return {
        skill: 'num.vocabulaire.division',
        texte: `Dans la division de ${dividende} par ${diviseur}, on obtient ${quotient} et il reste ${reste}. `
            + `Que représente ${n} ?`,
        choix: POSEE.map(p => ({
            value: p.role, label: p.role, correct: p.role === cible.role,
            why: p.role === cible.role ? undefined
                : `${p.role.charAt(0).toUpperCase() + p.role.slice(1)}, c'est ${p.quoi} : ici ${valeurs[p.role]}.`
        })),
        explication: `${n} est ${cible.role} : ${cible.quoi}. `
            + `On écrit ${dividende} = ${diviseur} × ${quotient} + ${reste}.`,
        indices: [
            'Le dividende est le nombre qu\'on partage, le diviseur le nombre de parts.',
            `Ici : ${dividende} = ${diviseur} × ${quotient} + ${reste}.`
        ],
        theme: 'posee'
    };
}

const FABRIQUES = {
    'resultat': questionResultat,
    'nombres': questionNombres,
    'phrase-vers-calcul': questionPhraseVersCalcul,
    'calcul-vers-phrase': questionCalculVersPhrase,
    'multiples': questionMultiples,
    'posee': questionPosee
};

export const vocabulaireGenerator = {
    id: 'num.vocabulaire',
    label: 'Le vocabulaire du calcul',
    skills: ['num.vocabulaire'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'volets', type: 'multiselect', label: 'Ce qu\'on demande',
            aide: 'Le nom du résultat (somme, différence, produit, quotient), le nom des nombres '
                + '(termes, facteurs), la traduction dans les deux sens entre une phrase et un calcul, '
                + 'les mots qui cachent une opération (double, tiers), et les quatre noms de la division posée.',
            options: [
                { value: 'resultat', label: 'Le nom du résultat' },
                { value: 'nombres', label: 'Termes ou facteurs' },
                { value: 'phrase-vers-calcul', label: 'De la phrase au calcul' },
                { value: 'calcul-vers-phrase', label: 'Du calcul à la phrase' },
                { value: 'multiples', label: 'Double, triple, moitié, tiers' },
                { value: 'posee', label: 'La division posée' }
            ],
            default: VOLETS
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const demandes = (params && Array.isArray(params.volets) && params.volets.length)
            ? params.volets.filter(v => VOLETS.includes(v)) : VOLETS;
        const choisis = demandes.length ? demandes : VOLETS;
        // On TOURNE au lieu de tirer au sort : sur dix questions, un tirage
        // aléatoire dans six familles en oublie régulièrement deux, et le volet
        // oublié est toujours celui que l'élève ne sait pas.
        const volet = choisis[(Number(ctx.index) || 0) % choisis.length];
        const q = FABRIQUES[volet](rng);

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.vocabulaire',
            skillId: q.skill,
            answerKind: 'choice',
            prompt: {
                text: q.texte,
                html: `<div class="game-question">${q.texte}</div>`,
                papier: q.texte
            },
            answer: q.choix.find(c => c.correct).value,
            choices: finalizeChoices(rng, q.choix, { count: 4 }),
            hints: q.indices,
            explanation: q.explication,
            difficulty: volet === 'posee' || volet === 'calcul-vers-phrase' ? 3 : 2,
            meta: { volet, theme: q.theme }
        });
    }
};
