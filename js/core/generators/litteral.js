// SIMPLIFIER ET RÉDUIRE UNE EXPRESSION LITTÉRALE — la progression pas à pas.
//
// Rémy : « j'aimerais bien un exercice qui entraîne à simplifier et à réduire
// des expressions littérales (d'abord 2*x = 2x) — ATTENTION ON UTILISE LE SIGNE
// FOIS. »
//
// LA MAJUSCULE EST DE LUI, ET ELLE COMMANDE TOUT LE FICHIER. L'énoncé s'écrit
// « 2 × x », jamais « 2x » ni « 2*x » : c'est précisément le signe qu'on
// apprend à faire disparaître, et l'exercice n'aurait plus d'objet si la
// question l'avait déjà supprimé. L'astérisque, lui, n'existe qu'au clavier
// d'un ordinateur — l'écrire au tableau serait enseigner une faute.
//
// DEUX GESTES DIFFÉRENTS, QU'ON CONFOND TOUT LE TEMPS, et c'est la raison
// d'être de la progression en trois temps :
//
//   A. SIMPLIFIER L'ÉCRITURE — 3 × x s'écrit 3x. Rien n'est calculé, rien n'est
//      regroupé : on enlève un signe, et on range le nombre devant la lettre.
//      C'est une convention, pas un calcul.
//   B. REGROUPER DES FACTEURS — 3 × x × 4 devient 12x. Là on calcule : les
//      nombres se multiplient entre eux parce que la multiplication est
//      commutative. C'est déjà autre chose.
//   C. RÉDUIRE UNE SOMME — 2x + 3x devient 5x. Là on AJOUTE les coefficients,
//      et c'est le contraire du temps B. L'élève qui a bien retenu « les
//      nombres se multiplient » écrit 6x, et il a tort ; celui qui a retenu
//      « x + x = x² » confond la somme et le produit. Ces deux erreurs-là sont
//      les distracteurs de chaque question du temps C, parce qu'elles SONT la
//      leçon.
//
// ET UNE EXPRESSION PEUT ÊTRE DÉJÀ RÉDUITE. « 2x + 3 » ne se réduit pas : un
// nombre de x et un nombre tout court ne se rangent pas dans le même sac. C'est
// la faute la plus tenace du chapitre, et le seul moyen de la travailler est de
// poser la question dont la réponse est « on ne peut pas aller plus loin ».
//
// Module pur : ni DOM, ni horloge. Il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';

const SKILL = 'num.litteral.reduire';
const LETTRES = ['x', 'a', 'y', 'n', 'b', 't'];

/** Le vrai signe moins (U+2212), pas le trait d'union du clavier. */
const MOINS = '−';

/**
 * UN TERME, ÉCRIT COMME AU CAHIER.
 *
 * Trois conventions, et chacune est un piège classique :
 *   · le coefficient 1 ne s'écrit pas — on écrit x, jamais 1x ;
 *   · le coefficient −1 ne garde que son signe — on écrit −x, jamais −1x ;
 *   · le coefficient 0 fait disparaître le terme entier.
 */
export function ecrireTerme(coef, part) {
    if (!part) return String(coef);
    if (coef === 0) return '0';
    if (coef === 1) return part;
    if (coef === -1) return MOINS + part;
    return `${coef < 0 ? MOINS : ''}${Math.abs(coef)}${part}`;
}

/**
 * UNE SOMME DE TERMES, avec ses signes bien placés.
 *
 * On n'écrit jamais « 3x + −2 » : le signe du terme devient le signe de
 * l'opération. C'est la même règle que pour les relatifs, et c'est bien la
 * même chose.
 */
export function ecrireSomme(termes) {
    const vivants = termes.filter(t => t.coef !== 0);
    if (!vivants.length) return '0';
    return vivants.map((t, i) => {
        if (i === 0) return ecrireTerme(t.coef, t.part);
        const signe = t.coef < 0 ? MOINS : '+';
        return ` ${signe} ${ecrireTerme(Math.abs(t.coef), t.part)}`;
    }).join('');
}

/** L'ordre de rangement d'une réponse : les x avant les nombres. */
const RANG = (part) => (part === '' ? 9 : part.length);

/**
 * RÉDUIT UNE SOMME : on regroupe ce qui porte la MÊME partie littérale.
 *
 * `x` et `x²` ne se regroupent pas, `x` et `y` non plus, `x` et un nombre non
 * plus. C'est la seule règle, et elle explique à elle seule toutes les fautes
 * du chapitre.
 */
export function reduire(termes) {
    const sacs = new Map();
    termes.forEach(t => {
        sacs.set(t.part, (sacs.get(t.part) || 0) + t.coef);
    });
    return [...sacs.entries()]
        .map(([part, coef]) => ({ part, coef }))
        .filter(t => t.coef !== 0)
        .sort((a, b) => RANG(a.part) - RANG(b.part) || (a.part < b.part ? -1 : 1));
}

/** L'écriture d'un produit, avec ses signes × bien visibles. */
export function ecrireProduit(facteurs) {
    return facteurs.join(' × ');
}

/** `x`, `x²`, `ab`… — la partie littérale d'un produit de lettres. */
export function partLitterale(lettres) {
    const compte = new Map();
    lettres.forEach(l => compte.set(l, (compte.get(l) || 0) + 1));
    return [...compte.entries()].sort()
        .map(([l, n]) => (n === 1 ? l : n === 2 ? `${l}²` : `${l}${exposant(n)}`))
        .join('');
}

const CHIFFRES_HAUT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function exposant(n) {
    return String(n).split('').map(c => CHIFFRES_HAUT[Number(c)]).join('');
}

// --- LES TREIZE MARCHES -----------------------------------------------------

export const ETAPES = [
    { id: 'nombre-lettre', temps: 'A', titre: 'Un nombre fois une lettre' },
    { id: 'lettre-nombre', temps: 'A', titre: 'Une lettre fois un nombre' },
    { id: 'facteur-un', temps: 'A', titre: 'Le facteur 1 disparaît' },
    { id: 'deux-lettres', temps: 'A', titre: 'Deux lettres différentes' },
    { id: 'meme-lettre', temps: 'A', titre: 'La même lettre deux fois' },
    { id: 'trois-facteurs', temps: 'B', titre: 'Trois facteurs à regrouper' },
    { id: 'facteur-carre', temps: 'B', titre: 'Un nombre et un carré' },
    { id: 'nombre-deux-lettres', temps: 'B', titre: 'Des nombres et des lettres' },
    { id: 'somme-lettres', temps: 'C', titre: 'Additionner des lettres' },
    { id: 'somme-termes', temps: 'C', titre: 'Additionner deux termes' },
    { id: 'difference-termes', temps: 'C', titre: 'Soustraire deux termes' },
    { id: 'melange', temps: 'C', titre: 'Nombres et lettres mêlés' },
    { id: 'melange-signes', temps: 'C', titre: 'Avec des soustractions' }
];

/**
 * UNE QUESTION D'UNE MARCHE : son énoncé, sa réponse, et les fautes qu'on
 * attend. Les distracteurs ne sont jamais du bruit — chacun est LA faute que
 * cette marche-là provoque, et son `why` la nomme.
 */
export function question(etape, rng) {
    const q = questionBrute(etape, rng);
    // UN PIÈGE QUI VAUT LA BONNE RÉPONSE N'EN EST PAS UN. Le cas arrive pour de
    // vrai : « 9y + 9 » avec les nombres et les y échangés redonne « 9y + 9 »,
    // et la question aurait alors deux bonnes réponses. On le retire ici, à la
    // source, plutôt que dans chaque branche — et le corrigé reste juste.
    return { ...q, pieges: q.pieges.filter(p => String(p.value) !== String(q.reponse)) };
}

function questionBrute(etape, rng) {
    const l = rng.pick(LETTRES);
    const l2 = rng.pick(LETTRES.filter(x => x !== l));
    const n = () => rng.int(2, 9);

    switch (etape.id) {
        case 'nombre-lettre': {
            const a = n();
            return {
                enonce: ecrireProduit([a, l]),
                reponse: `${a}${l}`,
                pieges: [
                    { value: `${l}${a}`, why: `Le nombre s'écrit DEVANT la lettre : ${a}${l}.` },
                    { value: `${a} + ${l}`, why: 'Le signe × ne devient pas un +, il disparaît.' },
                    { value: `${a}${l}²`, why: 'Il n\'y a qu\'une seule lettre : pas de carré.' }
                ],
                pourquoi: `On n'écrit pas le signe × devant une lettre : ${a} × ${l} s'écrit ${a}${l}. `
                    + 'Rien n\'est calculé, c\'est seulement l\'écriture qui change.'
            };
        }
        case 'lettre-nombre': {
            const a = n();
            return {
                enonce: ecrireProduit([l, a]),
                reponse: `${a}${l}`,
                pieges: [
                    { value: `${l}${a}`, why: `On RANGE le nombre devant : ${a}${l}, pas ${l}${a}.` },
                    { value: `${a} + ${l}`, why: 'Le signe × ne devient pas un +.' }
                ],
                pourquoi: `${l} × ${a} et ${a} × ${l} valent la même chose : on écrit toujours le `
                    + `nombre devant, donc ${a}${l}.`
            };
        }
        case 'facteur-un': {
            const gauche = rng.bool();
            return {
                enonce: gauche ? ecrireProduit([1, l]) : ecrireProduit([l, 1]),
                reponse: l,
                pieges: [
                    { value: `1${l}`, why: 'On n\'écrit jamais le 1 devant une lettre : c\'est inutile.' },
                    { value: '1', why: `La lettre ne disparaît pas : 1 × ${l}, c'est ${l}.` }
                ],
                pourquoi: `Multiplier par 1 ne change rien : 1 × ${l} = ${l}. Et le coefficient 1 `
                    + `ne s'écrit pas — on écrit ${l}, jamais 1${l}.`
            };
        }
        case 'deux-lettres': {
            const [p, q] = [l, l2].sort();
            return {
                enonce: ecrireProduit([l, l2]),
                reponse: `${p}${q}`,
                pieges: [
                    { value: `${l}+${l2}`, why: 'Le signe × disparaît, il ne devient pas un +.' },
                    { value: `${p}²`, why: 'Les deux lettres sont DIFFÉRENTES : pas de carré.' }
                ],
                pourquoi: `${l} × ${l2} s'écrit ${p}${q} : on colle les deux lettres, dans l'ordre `
                    + 'de l\'alphabet par habitude.'
            };
        }
        case 'meme-lettre': {
            return {
                enonce: ecrireProduit([l, l]),
                reponse: `${l}²`,
                pieges: [
                    { value: `2${l}`, why: `2${l} c'est ${l} + ${l}, pas ${l} × ${l}. Attention : somme ou produit ?` },
                    { value: `${l}${l}`, why: `On note ${l}² quand la lettre est écrite deux fois.` },
                    { value: `${l}³`, why: `La lettre paraît DEUX fois, l'exposant est donc 2.` }
                ],
                pourquoi: `${l} × ${l} = ${l}², et cela se lit « ${l} au carré ». À ne pas confondre `
                    + `avec ${l} + ${l} = 2${l}, qui est une somme.`
            };
        }
        case 'trois-facteurs': {
            const a = n(), b = rng.int(2, 5);
            return {
                enonce: ecrireProduit([a, l, b]),
                reponse: `${a * b}${l}`,
                pieges: [
                    { value: `${a + b}${l}`, why: `Ce sont des FACTEURS : on multiplie ${a} et ${b}, on ne les ajoute pas.` },
                    { value: `${a}${b}${l}`, why: `${a} et ${b} se multiplient : ${a} × ${b} = ${a * b}.` },
                    { value: `${a * b}${l}²`, why: 'Il n\'y a qu\'une lettre dans le produit.' }
                ],
                pourquoi: `On peut changer l'ordre d'un produit : ${a} × ${l} × ${b} = ${a} × ${b} × ${l} `
                    + `= ${a * b}${l}.`
            };
        }
        case 'facteur-carre': {
            const a = n();
            return {
                enonce: ecrireProduit([a, l, l]),
                reponse: `${a}${l}²`,
                pieges: [
                    { value: `${a * 2}${l}`, why: `${l} × ${l} donne ${l}², pas 2${l}.` },
                    { value: `${a}${l}`, why: `Les DEUX ${l} comptent : ${l} × ${l} = ${l}².` },
                    { value: `${a}²${l}²`, why: `Le ${a} n'est écrit qu'une fois : il ne se met pas au carré.` }
                ],
                pourquoi: `${a} × ${l} × ${l} = ${a} × ${l}² = ${a}${l}².`
            };
        }
        case 'nombre-deux-lettres': {
            const a = rng.int(2, 6), b = rng.int(2, 5);
            const [p, q] = [l, l2].sort();
            return {
                enonce: ecrireProduit([a, l, b, l2]),
                reponse: `${a * b}${p}${q}`,
                pieges: [
                    { value: `${a + b}${p}${q}`, why: `Les nombres se MULTIPLIENT : ${a} × ${b} = ${a * b}.` },
                    { value: `${a * b}${p}`, why: 'Les deux lettres restent : aucune ne disparaît.' },
                    { value: `${a * b}${p}²`, why: `${l} et ${l2} sont différentes : pas de carré.` }
                ],
                pourquoi: `On regroupe les nombres d'un côté et les lettres de l'autre : `
                    + `${a} × ${b} = ${a * b}, et ${l} × ${l2} = ${p}${q}. Donc ${a * b}${p}${q}.`
            };
        }
        case 'somme-lettres': {
            const k = rng.int(2, 4);
            return {
                enonce: Array(k).fill(l).join(' + '),
                reponse: `${k}${l}`,
                pieges: [
                    { value: k === 2 ? `${l}²` : `${l}${exposant(k)}`, why: `C'est une SOMME : ${l} + ${l} = 2${l}. Le carré, c'est le produit.` },
                    { value: String(k), why: `La lettre ne disparaît pas : il reste ${k} fois ${l}.` }
                ],
                pourquoi: `${Array(k).fill(l).join(' + ')} : on a ${k} fois ${l}, donc ${k}${l}. `
                    + `C'est une somme — le produit ${l} × ${l} donnerait ${l}², ce n'est pas la même chose.`
            };
        }
        case 'somme-termes': {
            const a = n(), b = n();
            return {
                enonce: `${ecrireTerme(a, l)} + ${ecrireTerme(b, l)}`,
                reponse: `${a + b}${l}`,
                pieges: [
                    { value: `${a * b}${l}`, why: `Ce sont des TERMES qu'on ajoute : ${a} + ${b} = ${a + b}.` },
                    { value: `${a + b}${l}²`, why: 'La lettre ne change pas de puissance dans une somme.' },
                    { value: String(a + b), why: `La lettre reste : ${a + b}${l}.` }
                ],
                pourquoi: `${a}${l} + ${b}${l}, c'est ${a} fois ${l} plus ${b} fois ${l}, donc `
                    + `${a + b} fois ${l} : ${a + b}${l}. On ajoute les nombres, la lettre ne bouge pas.`
            };
        }
        case 'difference-termes': {
            const b = rng.int(2, 6);
            const a = b + rng.int(1, 6);
            return {
                enonce: `${ecrireTerme(a, l)} ${MOINS} ${ecrireTerme(b, l)}`,
                reponse: `${a - b}${l}`,
                pieges: [
                    { value: `${a + b}${l}`, why: 'C\'est une soustraction : on retire, on n\'ajoute pas.' },
                    { value: String(a - b), why: `La lettre reste : ${a - b}${l}.` },
                    { value: `${a - b}`, why: `La lettre reste : ${a - b}${l}.` }
                ],
                pourquoi: `${a}${l} ${MOINS} ${b}${l} = ${a - b}${l} : on retire ${b} fois ${l} `
                    + `à ${a} fois ${l}.`
            };
        }
        case 'melange':
        case 'melange-signes': {
            const dur = etape.id === 'melange-signes';
            // UNE FOIS SUR TROIS, L'EXPRESSION EST DÉJÀ RÉDUITE. « 2x + 3 » ne
            // se réduit pas, et c'est la faute la plus tenace du chapitre : le
            // seul moyen de la travailler est de poser la question dont la
            // réponse est « on ne peut pas aller plus loin ».
            const irreductible = rng.int(1, 3) === 1;
            const a = n(), c = n();
            if (irreductible) {
                const termes = [{ coef: a, part: l }, { coef: c, part: '' }];
                const texte = ecrireSomme(termes);
                return {
                    enonce: texte,
                    reponse: texte,
                    dejaReduite: true,
                    pieges: [
                        { value: `${a + c}${l}`, why: `${a}${l} et ${c} ne se regroupent pas : l'un compte des ${l}, l'autre non.` },
                        { value: String(a + c), why: `On ne peut pas ajouter ${a}${l} et ${c}.` },
                        { value: `${a * c}${l}`, why: 'Il n\'y a pas de multiplication ici.' }
                    ],
                    pourquoi: `${texte} est DÉJÀ réduite : ${a}${l} compte des ${l}, ${c} est un `
                        + 'nombre tout seul. On ne peut pas les mettre dans le même sac.'
                };
            }
            // EN « AVEC DES SOUSTRACTIONS », ON NE FAIT PAS DISPARAÎTRE LA
            // LETTRE. « 2a + 8 − 2a − 5 = 3 » est juste, mais c'est une AUTRE
            // question — celle de l'expression qui n'a plus de lettre du tout,
            // et elle mérite sa propre marche plutôt que de tomber au hasard
            // ici, où l'élève croirait s'être trompé.
            const aa = dur ? Math.max(3, a) : a;
            const cc = dur ? Math.max(3, c) : c;
            const b = dur ? -rng.int(1, aa - 1) : n();
            const d = dur ? -rng.int(1, cc - 1) : n();
            const termes = [
                { coef: aa, part: l }, { coef: cc, part: '' },
                { coef: b, part: l }, { coef: d, part: '' }
            ];
            const reduit = reduire(termes);
            const reponse = ecrireSomme(reduit);
            const somL = aa + b, somN = cc + d;
            return {
                enonce: ecrireSomme(termes),
                reponse,
                pieges: [
                    { value: ecrireTerme(somL + somN, l), why: `On ne mêle pas les ${l} et les nombres : ${somL}${l} d'un côté, ${somN} de l'autre.` },
                    { value: ecrireSomme([{ coef: somN, part: l }, { coef: somL, part: '' }]), why: `Les nombres et les ${l} ont été échangés.` },
                    { value: String(somL + somN), why: 'La lettre ne disparaît pas.' }
                ],
                pourquoi: `On range : les ${l} avec les ${l}, les nombres avec les nombres. `
                    + `${ecrireTerme(aa, l)} et ${ecrireTerme(b, l)} donnent ${ecrireTerme(somL, l)} ; `
                    + `${cc} et ${ecrireTerme(d, '')} donnent ${somN}. Donc ${reponse}.`
            };
        }
        default:
            return questionBrute(ETAPES[0], rng);
    }
}

// --- Le générateur ----------------------------------------------------------

export const litteralReduireGenerator = {
    id: 'num.litteral.reduire',
    label: 'Simplifier et réduire une expression littérale',
    skills: [SKILL],
    answerKinds: ['choice'],
    // La question se photocopie telle quelle : « 3 × x = ? » n'a besoin
    // d'aucune figure.
    ecrit: true,
    // Deux questions par marche : le temps de s'installer avant de monter.
    conseil: (p) => {
        const choix = (p && p.etape) || 'progressif';
        if (['A', 'B', 'C'].includes(choix)) return ETAPES.filter(e => e.temps === choix).length * 2;
        return choix === 'progressif' ? ETAPES.length * 2 : 6;
    },
    params: [
        {
            id: 'etape', type: 'select', label: 'Étape', echelle: true,
            aide: 'En « progressif », les treize marches s\'enchaînent, deux questions chacune. '
                + 'Le temps A ne fait qu\'ENLEVER le signe × ; le temps B regroupe des facteurs '
                + '(3 × x × 4 = 12x, on multiplie) ; le temps C réduit une somme '
                + '(2x + 3x = 5x, on ajoute). Confondre B et C est LA faute du chapitre.',
            options: [
                { value: 'progressif', label: 'Progressif (les 13 marches à la suite)', court: 'Tout' },
                { value: 'A', label: 'A — enlever le signe × (marches 1 à 5)', court: 'A' },
                { value: 'B', label: 'B — regrouper des facteurs (marches 6 à 8)', court: 'B' },
                { value: 'C', label: 'C — réduire une somme (marches 9 à 13)', court: 'C' },
                ...ETAPES.map((e, i) => ({ value: e.id, label: `${i + 1}. ${e.titre}`, court: String(i + 1) }))
            ],
            default: 'progressif'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const index = ctx.index ?? 0;
        const choix = params?.etape || 'progressif';

        let liste = ETAPES;
        if (['A', 'B', 'C'].includes(choix)) liste = ETAPES.filter(e => e.temps === choix);
        else if (choix !== 'progressif') liste = [ETAPES.find(e => e.id === choix) || ETAPES[0]];
        const rang = Math.min(liste.length - 1, Math.floor(index / 2));
        const etape = liste[rang];
        const rangGlobal = ETAPES.findIndex(e => e.id === etape.id);

        const q = question(etape, rng);
        const consigne = q.dejaReduite || etape.temps === 'C'
            ? 'Réduis cette expression'
            : 'Écris cette expression plus simplement';

        const choices = finalizeChoices(rng, [
            { value: q.reponse, correct: true },
            ...q.pieges.filter(p => p.value !== q.reponse)
        ], {
            count: 4,
            // Un remplissage qui reste une EXPRESSION : un nombre nu au milieu
            // de quatre écritures littérales se repère sans réfléchir.
            filler: (r) => `${r.int(2, 12)}${LETTRES[0]}`
        });

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.litteral.reduire',
            skillId: SKILL,
            answerKind: 'choice',
            prompt: {
                text: `${consigne} : ${q.enonce}`,
                papier: `${q.enonce} =`,
                html: `<div class="game-question"><span class="lit-consigne">${consigne}</span>`
                    + `<span class="lit-expr">${q.enonce}</span></div>`
            },
            answer: q.reponse,
            choices,
            hints: [
                etape.temps === 'A'
                    ? 'Le signe × DISPARAÎT devant une lettre — il ne devient rien d\'autre. '
                        + 'Et le nombre se range devant la lettre.'
                    : etape.temps === 'B'
                        ? 'Ce sont des FACTEURS : on peut changer leur ordre, et les nombres se '
                            + 'multiplient entre eux.'
                        : 'Ce sont des TERMES : on regroupe ce qui porte la même lettre, et l\'on '
                            + 'AJOUTE les nombres qui sont devant.',
                q.dejaReduite
                    ? 'Compte ce qui porte la lettre et ce qui n\'en porte pas : peux-tu vraiment '
                        + 'les mettre ensemble ?'
                    : q.pourquoi.split('.')[0] + '.'
            ],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                etape: etape.id, temps: etape.temps, titre: etape.titre,
                marche: rangGlobal + 1, marches: ETAPES.length,
                dejaReduite: !!q.dejaReduite
            }
        });
    }
};

export default litteralReduireGenerator;
