// LES PETITS PROBLÈMES D'ARGENT — payer, rendre la monnaie, compter ce qui reste.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « et après tu peux faire des petits problèmes avec calcul », puis,
// sur les quatre lectures possibles : « Dans la même catégorie que les
// billets, l'argent et les prix. »
//
// ── POURQUOI UN EXERCICE DE PLUS, ALORS QUE « HISTOIRES EN PAGAILLE » EXISTE
//
// Vérifié avant d'écrire une ligne : « Histoires en Pagaille » porte ONZE
// familles rangées selon la typologie de Vergnaud, trois niveaux de CM2 à 5ᵉ,
// un schéma gratuit sous chaque énoncé et une feuille papier. L'exercice est
// complet et il est bon. Il ne fallait pas l'écrire une seconde fois.
//
// CE QU'IL NE FAIT PAS, ET QUI EST TOUT LE SUJET : ses onze familles
// travaillent des prix ENTIERS. Or la monnaie rendue sur un billet de 10 €
// pour un article à 7,40 € est exactement l'endroit où un élève de sixième
// écrit 3,60 au lieu de 2,60 — ou 2,6 au lieu de 2,60. C'est le même rang
// décimal que « Compter l'Argent », mais dans un problème.
//
// ── TOUT SE COMPTE EN CENTIMES, ET LA RAISON N'EST PAS LA PRÉCISION ────────
//
// 0,1 + 0,2 ne fait pas 0,3 en virgule flottante. Un problème d'argent qui
// calculerait en euros rendrait, une fois sur cent, une réponse attendue de
// 2,5999999999999996 — et l'élève qui écrit 2,60 serait compté faux sans que
// personne ne comprenne pourquoi. On additionne donc des entiers, et l'on ne
// divise par cent qu'au tout dernier moment.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import { enEuros, enNombre, rendreEnPieces, tasSvg, billetSvg } from './argent.js';

const SKILL = 'num.probleme.transformation';

// ── CE QU'ON ACHÈTE ────────────────────────────────────────────────────────
//
// LES PRIX SONT VRAIS, ET C'EST UTILE : un élève qui lit « un cahier à 47 € »
// cesse de penser au problème pour se moquer de l'énoncé. Chaque article
// porte son genre, sans quoi « un gomme » ou « une sandwich » traîne dans la
// moitié des phrases.
export const ARTICLES = [
    { nom: 'cahier', genre: 'm', prix: 240 },
    { nom: 'stylo', genre: 'm', prix: 115 },
    { nom: 'gomme', genre: 'f', prix: 80 },
    { nom: 'règle', genre: 'f', prix: 150 },
    { nom: 'classeur', genre: 'm', prix: 390 },
    { nom: 'trousse', genre: 'f', prix: 650 },
    { nom: 'bouteille d\'eau', genre: 'f', prix: 95 },
    { nom: 'sandwich', genre: 'm', prix: 360 },
    { nom: 'part de pizza', genre: 'f', prix: 275 },
    { nom: 'magazine', genre: 'm', prix: 420 },
    { nom: 'paquet de gâteaux', genre: 'm', prix: 235 },
    { nom: 'carnet', genre: 'm', prix: 185 }
];

// LES PRÉNOMS PORTENT LEUR GENRE, et ce n'est pas un détail de politesse :
// sans lui, l'énoncé écrivait « Léa achète […] Combien paie-t-il ? ». Un
// énoncé mal accordé fait trébucher la lecture au moment précis où l'on
// demande de lire avec attention — et c'est la lecture qui fait échouer un
// problème, pas le calcul.
export const PRENOMS = [
    { nom: 'Léa', genre: 'f' }, { nom: 'Tom', genre: 'm' },
    { nom: 'Inès', genre: 'f' }, { nom: 'Hugo', genre: 'm' },
    { nom: 'Jade', genre: 'f' }, { nom: 'Noah', genre: 'm' },
    { nom: 'Lina', genre: 'f' }, { nom: 'Sacha', genre: 'm' }
];

/** « un cahier », « une gomme ». */
export const unArticle = (a) => `${a.genre === 'f' ? 'une' : 'un'} ${a.nom}`;

/**
 * LA PREMIÈRE LETTRE EN MAJUSCULE, ET ELLE SEULE.
 *
 * `replace(/^un(e?)/, m => m.toUpperCase())` écrivait « UNE trousse coûte » :
 * la mise en majuscules portait sur tout l'article, pas sur son initiale. Vu
 * en lisant les énoncés produits, pas en relisant le code.
 */
export const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Les billets qu'on peut tendre à la caisse, en centimes. */
const COUPURES = [500, 1000, 2000, 5000];

/** Le plus petit billet qui couvre le montant — celui qu'on tend vraiment. */
export function billetPour(centimes) {
    return COUPURES.find(c => c >= centimes) || COUPURES[COUPURES.length - 1];
}

/** Deux articles différents, tirés sans remise. */
function articles(rng, combien) {
    const pioche = rng.shuffle([...ARTICLES]);
    return pioche.slice(0, combien);
}

// ── LES HUIT FAMILLES ──────────────────────────────────────────────────────
//
// CHACUNE A SON GESTE, et c'est le geste qu'on travaille — pas l'habillage.
// L'ordre des marches est celui des opérations : d'abord une seule, puis la
// multiplication et le partage, puis deux étapes.

export const ETAPES = [
    { id: 'total', temps: 'A', titre: 'Le total à payer', op: '+' },
    { id: 'reste', temps: 'A', titre: 'Ce qu\'il me reste', op: '−' },
    { id: 'monnaie', temps: 'A', titre: 'La monnaie rendue', op: '−' },
    { id: 'plusieurs', temps: 'B', titre: 'Plusieurs articles identiques', op: '×' },
    { id: 'un-seul', temps: 'B', titre: 'Le prix d\'un seul', op: '÷' },
    { id: 'combien', temps: 'B', titre: 'Combien puis-je en acheter ?', op: '÷' },
    { id: 'deux-etapes', temps: 'C', titre: 'Deux étapes : j\'achète, puis je paie', op: '+−' },
    { id: 'manque', temps: 'C', titre: 'Combien me manque-t-il ?', op: '−' }
];

const TEMPS = {
    A: 'A — une seule opération',
    B: 'B — multiplier et partager',
    C: 'C — deux étapes'
};

/**
 * UNE QUESTION D'UNE MARCHE.
 *
 * Rend l'énoncé, la réponse ATTENDUE, l'unité de cette réponse, le dessin de
 * l'argent en jeu, et la phrase de correction.
 */
export function question(etape, rng) {
    const p = PRENOMS[rng.int(0, PRENOMS.length - 1)];
    const qui = p.nom;
    const il = p.genre === 'f' ? 'elle' : 'il';
    // « un seul » ou « une seule », selon l'article dont on parle.
    const unSeul = (a) => (a.genre === 'f' ? 'une seule' : 'un seul');

    if (etape.id === 'total') {
        const [a, b] = articles(rng, 2);
        const somme = a.prix + b.prix;
        return {
            enonce: `${qui} achète ${unArticle(a)} à ${enEuros(a.prix)} € et `
                + `${unArticle(b)} à ${enEuros(b.prix)} €.`,
            question: `Combien paie-t-${il} en tout ?`,
            reponse: enNombre(somme), unite: '€',
            argent: null,
            pourquoi: `${enEuros(a.prix)} + ${enEuros(b.prix)} = ${enEuros(somme)} €.`
        };
    }

    if (etape.id === 'reste') {
        const [a] = articles(rng, 1);
        // ON PART D'UN BILLET ENTIER : « j'avais 7,43 € » ne se rencontre pas.
        const avait = billetPour(a.prix + rng.int(100, 800));
        const reste = avait - a.prix;
        return {
            enonce: `${qui} a ${enEuros(avait)} € et achète ${unArticle(a)} `
                + `à ${enEuros(a.prix)} €.`,
            question: 'Combien lui reste-t-il ?',   // « lui » : le genre ne joue pas
            reponse: enNombre(reste), unite: '€',
            argent: billet(avait),
            pourquoi: `${enEuros(avait)} − ${enEuros(a.prix)} = ${enEuros(reste)} €.`
        };
    }

    if (etape.id === 'monnaie') {
        const [a] = articles(rng, 1);
        // `+ 1` : LE BILLET DOIT ÊTRE STRICTEMENT PLUS GRAND QUE LE PRIX.
        //
        // Trouvé par une épreuve, pas par une lecture : un article à 5,00 €
        // payé avec un billet de 5 € donnait « Combien la caissière lui
        // rend-elle ? » avec zéro pour réponse. La question n'est pas fausse,
        // elle est absurde — et un élève qui écrit 0 sans comprendre pourquoi
        // n'a rien appris.
        const billetDonne = billetPour(a.prix + 1);
        const rendu = billetDonne - a.prix;
        return {
            enonce: `${majuscule(unArticle(a))} coûte ${enEuros(a.prix)} €. `
                + `${qui} paie avec un billet de ${enEuros(billetDonne)} €.`,
            question: 'Combien la caissière lui rend-elle ?',
            reponse: enNombre(rendu), unite: '€',
            argent: billet(billetDonne),
            pourquoi: `${enEuros(billetDonne)} − ${enEuros(a.prix)} = ${enEuros(rendu)} €.`
        };
    }

    if (etape.id === 'plusieurs') {
        const [a] = articles(rng, 1);
        const n = rng.int(3, 6);
        const total = a.prix * n;
        return {
            enonce: `${qui} achète ${n} ${pluriel(a)} à ${enEuros(a.prix)} € pièce.`,
            question: `Combien paie-t-${il} en tout ?`,
            reponse: enNombre(total), unite: '€',
            argent: null,
            pourquoi: `${n} × ${enEuros(a.prix)} = ${enEuros(total)} €.`
        };
    }

    if (etape.id === 'un-seul') {
        // ON PART DU PRIX UNITAIRE ET ON MULTIPLIE : c'est la seule façon
        // d'avoir une division qui tombe juste à coup sûr. Partir du total et
        // chercher un diviseur donnerait un jour 7,43 € ÷ 3.
        const [a] = articles(rng, 1);
        const n = rng.int(3, 6);
        const total = a.prix * n;
        return {
            enonce: `${n} ${pluriel(a)} identiques coûtent ${enEuros(total)} € en tout.`,
            question: `Combien coûte ${unSeul(a)} ?`,
            reponse: enNombre(a.prix), unite: '€',
            argent: null,
            pourquoi: `${enEuros(total)} ÷ ${n} = ${enEuros(a.prix)} €.`
        };
    }

    if (etape.id === 'combien') {
        const [a] = articles(rng, 1);
        const n = rng.int(2, 5);
        // UN RESTE EXPRÈS : sans lui, « combien puis-je en acheter » est une
        // division ordinaire. Avec, il faut s'arrêter AVANT de manquer
        // d'argent — et c'est cela qu'on travaille.
        const avait = a.prix * n + rng.int(10, Math.max(11, a.prix - 10));
        return {
            enonce: `${qui} a ${enEuros(avait)} €. ${majuscule(unArticle(a))} coûte `
                + `${enEuros(a.prix)} €.`,
            question: `Combien de ${pluriel(a)} peut-${il} acheter ?`,
            reponse: n, unite: '',
            argent: tas(avait, rng),
            pourquoi: `${n} × ${enEuros(a.prix)} = ${enEuros(a.prix * n)} €, et il resterait `
                + `${enEuros(avait - a.prix * n)} € — pas assez pour un de plus.`
        };
    }

    if (etape.id === 'deux-etapes') {
        const [a, b] = articles(rng, 2);
        const somme = a.prix + b.prix;
        // Même raison qu'à la marche « monnaie » : 1,50 + 3,50 payés avec un
        // billet de 5 € ne rendent rien du tout.
        const billetDonne = billetPour(somme + 1);
        const rendu = billetDonne - somme;
        return {
            enonce: `${qui} achète ${unArticle(a)} à ${enEuros(a.prix)} € et `
                + `${unArticle(b)} à ${enEuros(b.prix)} €. ${majuscule(il)} paie avec un billet de `
                + `${enEuros(billetDonne)} €.`,
            question: 'Combien lui rend-on ?',   // « on » : le genre ne joue pas
            reponse: enNombre(rendu), unite: '€',
            argent: billet(billetDonne),
            pourquoi: `Il paie ${enEuros(a.prix)} + ${enEuros(b.prix)} = ${enEuros(somme)} €. `
                + `Puis ${enEuros(billetDonne)} − ${enEuros(somme)} = ${enEuros(rendu)} €.`
        };
    }

    // --- « Combien me manque-t-il ? » ---------------------------------------
    const [a] = articles(rng, 1);
    // IL EN MANQUE VRAIMENT : un énoncé où l'élève a assez d'argent rendrait
    // la question absurde, et la réponse serait zéro.
    const manque = rng.int(25, Math.max(26, a.prix - 20));
    const avait = a.prix - manque;
    return {
        enonce: `${majuscule(unArticle(a))} coûte ${enEuros(a.prix)} €, et ${qui} `
            + `n'a que ${enEuros(avait)} €.`,
        question: 'Combien lui manque-t-il ?',
        reponse: enNombre(manque), unite: '€',
        argent: tas(avait, rng),
        pourquoi: `${enEuros(a.prix)} − ${enEuros(avait)} = ${enEuros(manque)} €.`
    };
}

/** « 3 cahiers », « 3 bouteilles d'eau » — le pluriel du premier mot seulement. */
export function pluriel(a) {
    const mots = a.nom.split(' ');
    mots[0] = mots[0].endsWith('s') || mots[0].endsWith('x') ? mots[0] : `${mots[0]}s`;
    return mots.join(' ');
}

/** Le billet qu'on tend, dessiné. */
function billet(centimes) {
    return `<svg class="ap-argent" viewBox="0 0 120 64" width="100%" `
        + `style="max-width:150px" role="img" aria-label="un billet de ${centimes / 100} euros">`
        + billetSvg(centimes, 60, 32, 'p') + '</svg>';
}

/** Ce qu'on a dans la poche, dessiné. */
function tas(centimes, rng) {
    return tasSvg(rendreEnPieces(centimes, rng, true));
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

export const argentProblemesGenerator = {
    id: 'num.argent-problemes',
    label: 'Petits problèmes d\'argent',
    skills: [SKILL],
    answerKinds: ['numeric'],
    // LA FEUILLE PORTE L'ÉNONCÉ, et c'est l'essentiel : un problème se relit,
    // se souligne, se pose dans la marge. Le dessin de l'argent est un appui
    // d'écran, pas la question.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const enEuro = q.unite === '€';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.argent-problemes',
            skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: `${q.enonce} ${q.question}`,
                papier: `${q.enonce} ${q.question}`,
                // L'ÉNONCÉ D'ABORD, LA QUESTION ENSUITE, ET EN GRAS.
                //
                // Rémy : « tes phrases sont tellement longues et compliquées
                // elles ne seront pas lues ». Un problème EST une phrase à
                // lire — on ne peut pas la raccourcir — mais on peut séparer
                // ce qu'on lit UNE fois de ce qu'on relit : la situation
                // dessus, la question dessous, et l'argent entre les deux.
                html: '<div class="game-question ap-probleme">'
                    + `<span class="ap-situation">${q.enonce}</span>`
                    + (q.argent ? `<span class="ap-sous">${q.argent}</span>` : '')
                    + `<span class="ap-question">${q.question}</span></div>`
            },
            answer: q.reponse,
            hints: [
                // LE PREMIER INDICE NE DONNE PAS L'OPÉRATION : il fait relire.
                // C'est la seule aide qui apprenne quelque chose — un élève à
                // qui l'on dit « c'est une soustraction » ne cherchera plus
                // jamais.
                aideDeLaMarche(etape),
                `Pose le calcul : ${q.pourquoi.split('=')[0].trim()} = ?`
            ],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                operation: etape.op,
                // LE PAVÉ DOIT PORTER LA VIRGULE quand la réponse est un prix
                // — et PAS quand c'est un nombre d'articles : une virgule
                // proposée là où elle n'a pas de sens est une invitation à la
                // faute.
                decimal: enEuro,
                unite: q.unite
            }
        });
    }
};

/** Ce qu'il faut VOIR dans l'énoncé — jamais l'opération à faire. */
function aideDeLaMarche(etape) {
    switch (etape.id) {
        case 'total': return 'On met ensemble deux dépenses : relis ce qu\'il achète.';
        case 'reste': return 'Il avait une somme, il en dépense une partie. Que garde-t-il ?';
        case 'monnaie': return 'Il donne PLUS que le prix : la caissière lui rend la différence.';
        case 'plusieurs': return 'Le même prix, plusieurs fois.';
        case 'un-seul': return 'Le total se partage entre tous les articles, à parts égales.';
        case 'combien': return 'Compte de combien en combien, sans dépasser ce qu\'il a.';
        case 'deux-etapes': return 'DEUX calculs : ce qu\'il paie en tout, puis ce qu\'on lui rend.';
        default: return 'Compare ce qu\'il a et ce que ça coûte : l\'écart est ce qui manque.';
    }
}

export default argentProblemesGenerator;
