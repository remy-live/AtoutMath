// TESTER UNE SOLUTION, ET LES PROGRAMMES DE CALCUL — niveau quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Equations (tester et retour - Résolution
// et programme de calcul (Exercices type de brevet)) ».
//
// Mesuré avant d'écrire : « La Balance des Équations » RÉSOUT — on retire des
// jetons des deux plateaux jusqu'à isoler la boîte. Elle ne fait pas les deux
// autres choses que Rémy nomme, et qui sont pourtant celles du brevet :
// TESTER si un nombre est solution, et lire un PROGRAMME DE CALCUL.
//
// ── TESTER N'EST PAS UNE PETITE RÉSOLUTION ─────────────────────────────────
//
// C'est la décision qui ouvre ce fichier. Résoudre demande d'isoler
// l'inconnue — une technique, avec un ordre de gestes à respecter. Tester ne
// demande RIEN de tout cela : on remplace x par le nombre, on calcule les deux
// côtés, on regarde s'ils sont égaux. Aucun calcul littéral, aucune règle à
// retenir.
//
// C'est donc le petit bain parfait, et c'est aussi le geste qui VÉRIFIE une
// résolution — celui qu'on ne fait jamais, et qui attrape l'erreur de signe.
//
// ── ET « ×3 PUIS +4 » N'EST PAS « +4 PUIS ×3 » ─────────────────────────────
//
// Tout le chapitre des programmes de calcul tient dans cette confusion :
// 3x + 4 et 3(x + 4) se ressemblent, s'écrivent presque pareil, et ne valent
// jamais la même chose. Les quatre programmes de ce fichier sont choisis pour
// que les deux formes se croisent sans cesse — et la marche qui demande
// l'expression propose toujours les deux.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const S_TESTER = 'alg.equation.tester';
const S_PROGRAMME = 'alg.equation.programme';
const S_RESOUDRE = 'alg.equation.resoudre';

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/**
 * LES QUATRE PROGRAMMES, ET ILS VONT PAR PAIRES.
 *
 * « multiplier puis ajouter » donne ax + b ; « ajouter puis multiplier » donne
 * a(x + b). Les deux se lisent presque pareil et ne valent jamais la même
 * chose — c'est la confusion que tout le chapitre travaille, et c'est pour
 * cela qu'on ne garde que des programmes qui s'opposent deux à deux.
 *
 * `valeur` calcule, `ecrire` donne l'expression, et `retour` fait le chemin
 * inverse — il est écrit à la main plutôt que déduit, parce qu'une division
 * posée au mauvais endroit rend un résultat faux sans rien casser.
 */
export const PROGRAMMES = [
    {
        id: 'mult-add',
        lignes: (a, b) => [`Multiplie-le par ${a}.`, `Ajoute ${b}.`],
        valeur: (x, a, b) => a * x + b,
        retour: (r, a, b) => (r - b) / a,
        ecrire: (a, b) => `${a}x + ${b}`
    },
    {
        id: 'add-mult',
        lignes: (a, b) => [`Ajoute ${b}.`, `Multiplie le résultat par ${a}.`],
        valeur: (x, a, b) => a * (x + b),
        retour: (r, a, b) => r / a - b,
        ecrire: (a, b) => `${a}(x + ${b})`
    },
    {
        id: 'mult-sous',
        lignes: (a, b) => [`Multiplie-le par ${a}.`, `Retire ${b}.`],
        valeur: (x, a, b) => a * x - b,
        retour: (r, a, b) => (r + b) / a,
        ecrire: (a, b) => `${a}x − ${b}`
    },
    {
        id: 'sous-mult',
        lignes: (a, b) => [`Retire ${b}.`, `Multiplie le résultat par ${a}.`],
        valeur: (x, a, b) => a * (x - b),
        retour: (r, a, b) => r / a + b,
        ecrire: (a, b) => `${a}(x − ${b})`
    }
];

/**
 * LES QUATRE EXPRESSIONS PROPOSÉES, pour la marche qui demande d'écrire le
 * programme. Les trois leurres ne sont pas pris au hasard : ce sont les trois
 * AUTRES programmes, avec les mêmes nombres. L'élève doit donc lire l'ordre
 * des lignes, et rien d'autre ne le départage.
 */
const quatreExpressions = (a, b) => PROGRAMMES.map(p => p.ecrire(a, b));

/** Des situations où l'équation sort d'un énoncé, comme au brevet. */
const SITUATIONS = [
    { qui: 'Un taxi', fixe: 'de prise en charge', par: 'par kilomètre',
        unite: 'kilomètres', total: 'La course a coûté',
        question: 'Combien de kilomètres a-t-il parcourus ?' },
    { qui: 'Une salle d\'escalade', fixe: 'pour la carte d\'adhérent', par: 'par séance',
        unite: 'séances', total: 'Léa a dépensé en tout',
        question: 'Combien de séances a-t-elle faites ?' },
    { qui: 'Un loueur de vélos', fixe: 'de frais de dossier', par: 'par heure',
        unite: 'heures', total: 'La location a coûté',
        question: 'Combien d\'heures le vélo a-t-il été loué ?' }
];

// ── LES SEPT MARCHES ───────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'tester', temps: 'A', titre: 'Ce nombre est-il solution ?', skill: S_TESTER },
    { id: 'lequel', temps: 'A', titre: 'Lequel des quatre est solution ?', skill: S_TESTER },
    { id: 'programme-direct', temps: 'B', titre: 'Dérouler un programme', skill: S_PROGRAMME },
    { id: 'programme-retour', temps: 'B', titre: 'Remonter un programme', skill: S_PROGRAMME },
    { id: 'programme-ecrire', temps: 'B', titre: 'Écrire le programme avec x', skill: S_PROGRAMME },
    { id: 'resoudre', temps: 'C', titre: 'Résoudre une équation', skill: S_RESOUDRE },
    { id: 'probleme', temps: 'C', titre: 'Problème : poser l\'équation', skill: S_RESOUDRE }
];

const TEMPS = {
    A: 'A — tester, sans résoudre',
    B: 'B — les programmes de calcul',
    C: 'C — résoudre'
};

/** Une question d'une marche. */
export function question(etape, rng) {

    // ── TEMPS A : TESTER, SANS RÉSOUDRE ────────────────────────────────────

    if (etape.id === 'tester') {
        // AUCUN CALCUL LITTÉRAL ICI : on remplace, on calcule, on compare.
        // C'est le geste qui vérifie une résolution — celui qu'on ne fait
        // jamais, et qui attrape l'erreur de signe.
        const a = rng.int(2, 6), b = rng.int(1, 12), x = rng.int(2, 9);
        const c = a * x + b;
        const oui = rng.int(0, 1) === 1;
        // Un essai FAUX reste proche : « 4 » quand la solution est 3. Un nombre
        // éloigné se rejette au flair, et la marche n'apprend plus à calculer.
        const essai = oui ? x : x + choisir([-2, -1, 1, 2], rng);
        const gauche = a * essai + b;
        return {
            // LE NOMBRE NE S'ÉCRIT QU'UNE FOIS. Lu sur la feuille : « On teste si 4
            // est solution de l'équation 2x + 10 = 18. 4 est-il solution ? » — l'écran
            // lit les deux champs séparément et n'y voyait rien ; le papier les met
            // bout à bout, et le 4 revient deux fois en douze mots.
            enonce: `On considère l'équation ${a}x + ${b} = ${c}.`,
            question: `Le nombre ${essai} est-il solution ?`,
            kind: 'choice', reponse: gauche === c ? 'oui' : 'non', choix: ['oui', 'non'],
            pourquoi: `On remplace x par ${essai} : ${a} × ${essai} + ${b} = ${gauche}. `
                + (gauche === c
                    ? `C'est bien égal à ${c}, donc ${essai} EST solution.`
                    : `Or on attendait ${c}, et ${gauche} ≠ ${c} : ${essai} n'est PAS solution.`),
            aide: 'TESTER NE DEMANDE AUCUNE TECHNIQUE : on remplace x par le nombre, on '
                + 'calcule le membre de gauche, et on regarde s\'il tombe sur celui de droite.'
        };
    }

    if (etape.id === 'lequel') {
        const a = rng.int(2, 6), b = rng.int(1, 12), x = rng.int(2, 9);
        const c = a * x + b;
        // LES TROIS LEURRES SONT PROCHES, et distincts de la solution.
        const leurres = [];
        for (const d of rng.shuffle([-3, -2, -1, 1, 2, 3])) {
            if (leurres.length < 3 && x + d > 0) leurres.push(x + d);
        }
        const quatre = [x, ...leurres].sort((p, q) => p - q);
        return {
            enonce: '',
            question: `Parmi ${quatre.slice(0, 3).join(', ')} et ${quatre[3]}, lequel est `
                + `solution de ${a}x + ${b} = ${c} ?`,
            kind: 'choice', reponse: String(x), choix: quatre.map(String),
            pourquoi: `On essaie chacun. Avec ${x} : ${a} × ${x} + ${b} = ${c} — c'est le bon. `
                + `Avec ${quatre.find(v => v !== x)} : ${a} × ${quatre.find(v => v !== x)} + `
                + `${b} = ${a * quatre.find(v => v !== x) + b}, ce qui ne fait pas ${c}.`,
            aide: 'ON N\'EST PAS OBLIGÉ DE RÉSOUDRE : il suffit d\'essayer les quatre. '
                + 'C\'est plus long, mais c\'est sûr — et au contrôle, cela sauve une question.'
        };
    }

    // ── TEMPS B : LES PROGRAMMES DE CALCUL ─────────────────────────────────

    if (etape.id === 'programme-direct' || etape.id === 'programme-retour'
        || etape.id === 'programme-ecrire') {
        const p = choisir(PROGRAMMES, rng);
        const a = rng.int(2, 6);
        // LE FACTEUR ET LE TERME NE SONT JAMAIS LE MÊME NOMBRE. Lu sur la feuille :
        // « Multiplie-le par 4. Ajoute 4. » puis « Parmi 4x + 4 ; 4(x + 4) ; 4x − 4
        // et 4(x − 4) ». La question reste résoluble — ce sont les parenthèses qui
        // tranchent —, mais l'élève ne peut plus dire QUEL 4 vient de QUELLE ligne,
        // et c'est exactement ce que cette marche lui demande de lire.
        const b = choisir([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== a), rng);
        // LE TITRE EST COURT, parce qu'il revient à CHAQUE question du temps B : sur
        // la feuille imprimée, neuf lignes sur vingt commençaient par les mêmes sept
        // mots. « Programme de calcul » dit la même chose et tient sur une ligne de
        // moins. À l'écran cela ne se voyait pas : l'énoncé y est en petit et à part.
        //
        // ON CHOISIT LE NOMBRE DE DÉPART, puis on calcule : le chemin inverse
        // tombe alors toujours sur un entier, par construction.
        const x = p.id === 'sous-mult' ? rng.int(b + 1, b + 9) : rng.int(1, 9);
        const r = p.valeur(x, a, b);
        const programme = ['Choisis un nombre.', ...p.lignes(a, b)];
        const ecrit = `« ${programme.join(' ')} »`;

        if (etape.id === 'programme-direct') {
            return {
                enonce: `Programme de calcul : ${ecrit}`,
                question: `On choisit ${x}. Quel résultat obtient-on ?`,
                kind: 'numeric', reponse: r,
                pourquoi: `On part de ${x}, et l'on suit les lignes DANS L'ORDRE : `
                    + `${p.id.startsWith('mult')
                        ? `${a} × ${x} = ${a * x}, puis ${a * x} ${p.id === 'mult-add' ? '+' : '−'} ${b} = ${r}.`
                        : `${x} ${p.id === 'add-mult' ? '+' : '−'} ${b} = ${p.id === 'add-mult' ? x + b : x - b}, puis ${a} × ${p.id === 'add-mult' ? x + b : x - b} = ${r}.`}`,
                aide: 'ON SUIT LES LIGNES DANS L\'ORDRE OÙ ELLES SONT ÉCRITES. « Multiplie '
                    + 'puis ajoute » et « ajoute puis multiplie » ne donnent pas le même '
                    + 'résultat — c\'est toute la difficulté du chapitre.'
            };
        }
        if (etape.id === 'programme-retour') {
            return {
                enonce: `Programme de calcul : ${ecrit}`,
                question: `On obtient ${r}. Quel nombre avait-on choisi ?`,
                kind: 'numeric', reponse: x,
                pourquoi: `On REMONTE le programme en faisant l'inverse de chaque ligne, `
                    + `et en commençant par la DERNIÈRE. On retrouve ${x} — et l'on vérifie `
                    + `en redescendant : le programme appliqué à ${x} donne bien ${r}.`,
                aide: 'ON REMONTE À L\'ENVERS, EN PARTANT DE LA FIN. L\'inverse d\'« ajoute 4 » '
                    + 'est « retire 4 », l\'inverse de « multiplie par 3 » est « divise par 3 » '
                    + '— et la dernière ligne du programme se défait en premier.'
            };
        }
        const options = quatreExpressions(a, b);
        return {
            enonce: `Programme de calcul : ${ecrit}`,
            question: `Parmi ${options.slice(0, 3).join(' ; ')} et ${options[3]}, `
                + 'quelle expression traduit ce programme ?',
            kind: 'choice', reponse: p.ecrire(a, b), choix: options,
            // LES TROIS LEURRES SONT LES TROIS AUTRES PROGRAMMES, avec les
            // mêmes nombres : rien d'autre que l'ORDRE DES LIGNES ne départage
            // les quatre réponses. C'est exactement ce qu'on veut faire lire.
            pourquoi: `${p.ecrire(a, b)}. ${p.id.startsWith('mult')
                ? 'On multiplie D\'ABORD, donc le nombre est seul contre le facteur, sans parenthèses.'
                : 'On ajoute ou retire D\'ABORD, donc il faut des PARENTHÈSES : la multiplication '
                    + 'porte sur tout ce qui précède.'}`,
            aide: 'LES PARENTHÈSES DISENT L\'ORDRE. Si l\'on multiplie en premier, il n\'en '
                + 'faut pas ; si l\'on multiplie en dernier, il en faut — sinon la '
                + 'multiplication ne porterait que sur x.'
        };
    }

    // ── TEMPS C : RÉSOUDRE ─────────────────────────────────────────────────

    if (etape.id === 'resoudre') {
        const a = rng.int(2, 7), x = rng.int(2, 12);
        const plus = rng.int(0, 1) === 1;
        // LE SECOND MEMBRE RESTE POSITIF. Avec « 2x − 15 = −11 », l'équation est
        // juste et parfaitement résoluble — les relatifs sont au programme —
        // mais elle ajoute une difficulté de signe à une marche qui travaille
        // l'ORDRE DES GESTES, et une seule chose à la fois.
        // ET IL RESTE PETIT DES DEUX CÔTÉS. Sans le plafond, « 7x − 39 = 3 » sort
        // — juste, résoluble, et lu sur la feuille imprimée : 39 n'apprend rien de
        // plus que 9 sur l'ORDRE DES GESTES, qui est tout ce que cette marche
        // travaille, et il fait hésiter sur le calcul mental.
        const b = plus ? rng.int(1, 15) : rng.int(1, Math.min(15, a * x - 1));
        const c = plus ? a * x + b : a * x - b;
        return {
            enonce: '',
            question: `Résous l'équation ${a}x ${plus ? '+' : '−'} ${b} = ${c}.`,
            kind: 'numeric', reponse: x,
            // « DE CHAQUE CÔTÉ », et non « des deux côtés » : on dit « retirer
            // des deux côtés », mais « ajouter DES deux côtés » ne se dit pas.
            // La même phrase sert aux deux cas, donc elle doit marcher pour les
            // deux — lu sur la sortie : « On ajoute 1 des deux côtés ».
            pourquoi: `On ${plus ? 'retire' : 'ajoute'} ${b} de chaque côté : ${a}x = `
                + `${a * x}. Puis on partage chaque côté par ${a} : x = ${x}. `
                + `On vérifie dans l'équation de DÉPART : ${a} × ${x} ${plus ? '+' : '−'} `
                + `${b} = ${c}.`,
            aide: 'L\'ORDRE N\'EST PAS LIBRE : on enlève D\'ABORD le nombre qui accompagne '
                + 'les x, et l\'on divise EN DERNIER. Diviser avant ne tomberait pas juste.'
        };
    }

    // 'probleme'
    //
    // L'ÉQUATION SORT D'UN ÉNONCÉ, et c'est l'exercice du brevet. Le travail
    // n'est pas de résoudre — on sait — mais de reconnaître ce qui est FIXE et
    // ce qui se répète, puis de l'écrire.
    const s = choisir(SITUATIONS, rng);
    const fixe = rng.int(2, 6), par = rng.int(2, 5), n = rng.int(3, 12);
    const total = fixe + par * n;
    return {
        enonce: `${s.qui} demande ${fixe} € ${s.fixe}, puis ${par} € ${s.par}. `
            + `${s.total} ${total} €.`,
        question: s.question,
        kind: 'numeric', reponse: n, unite: s.unite,
        pourquoi: `Si l'on appelle x le nombre de ${s.unite}, le prix s'écrit `
            + `${par}x + ${fixe}. On résout ${par}x + ${fixe} = ${total} : `
            + `${par}x = ${total - fixe}, donc x = ${n}.`,
        aide: 'ON CHERCHE CE QUI EST FIXE ET CE QUI SE RÉPÈTE. Le montant fixe se paie UNE '
            + 'fois, quel que soit le nombre ; l\'autre se multiplie. L\'équation s\'écrit '
            + 'toute seule une fois les deux repérés.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 1, B: 2, C: 3 };

export const equationsGenerator = {
    id: 'alg.equations',
    label: 'Tester, programmes et équations',
    skills: [S_TESTER, S_PROGRAMME, S_RESOUDRE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c,
                label: c === 'oui' ? 'Oui' : c === 'non' ? 'Non' : String(c),
                correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        const enonce = q.enonce || '';
        return makeItem({
            seed: rng.seed,
            generatorId: 'alg.equations',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                text: `${enonce} ${q.question}`.trim(),
                papier: `${enonce} ${q.papier || q.question}`.trim(),
                html: '<div class="game-question ap-probleme">'
                    + (enonce ? `<span class="ap-situation">${enonce}</span>` : '')
                    + `<span class="ap-question">${q.question}</span></div>`
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                q.aide,
                'Vérifie toujours en remplaçant dans l\'équation de DÉPART : c\'est gratuit, '
                    + 'et cela attrape l\'erreur de signe, qui est la plus fréquente.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                decimal: false,
                ...(q.unite ? { unite: q.unite } : {})
            }
        });
    }
};

export default equationsGenerator;
