// DÉCOMPOSER, PGCD ET PPCM — l'arithmétique de troisième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd et
// ppcm niveau 3ème. Des exercices d'application direct et des petits
// problèmes ».
//
// ── « APPLICATION DIRECTE » ET « PETIT PROBLÈME » NE SONT PAS DEUX NIVEAUX ──
//
// C'est la décision qui commande tout ce fichier. Calculer PGCD(84 ; 120) est
// une TECHNIQUE : on décompose, on prend les facteurs communs au plus petit
// exposant, on multiplie. Elle s'apprend en une séance et elle s'automatise.
//
// Savoir que « le plus grand nombre de bouquets identiques, sans qu'il reste
// de fleurs » appelle le PGCD, et que « dans combien de minutes repartiront-
// ils ensemble » appelle le PPCM, est une AUTRE compétence — et c'est celle
// qui manque au contrôle. Un élève qui sait calculer les deux et ne sait pas
// lequel on lui demande a zéro, exactement comme celui qui ne sait rien.
//
// Les deux ne sont donc pas « facile » et « difficile » du même exercice :
// ce sont des marches distinctes, et le temps C les MÉLANGE délibérément.
// Ranger les problèmes de PGCD ensemble puis ceux de PPCM ensemble
// apprendrait à lire le titre du paragraphe, pas l'énoncé.
//
// ── CE QUI DISTINGUE LES DEUX, EN UNE PHRASE ───────────────────────────────
//
// On PARTAGE ce qu'on a en parts égales → on cherche un DIVISEUR commun, donc
// le PGCD, et la réponse est plus PETITE que les nombres de départ.
// On ATTEND que deux cycles retombent ensemble, ou l'on AGRANDIT jusqu'à ce
// que ça tombe juste → un MULTIPLE commun, donc le PPCM, et la réponse est
// plus GRANDE. C'est cette phrase-là que porte le premier indice.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    pgcd, ppcm, facteursGroupes, ecrireDecomposition, ecrireAPlat,
    irreductible, pgcdExplique, ppcmExplique, enExposant
} from '../arithmetique.js';

const S_DECOMP = 'num.arith.decomposition';
const S_PGCD = 'num.arith.pgcd';
const S_PPCM = 'num.arith.ppcm';

// ── LES COUPLES DE NOMBRES ─────────────────────────────────────────────────
//
// ILS SONT ÉCRITS, PAS TIRÉS AU HASARD, et c'est le cœur de l'exercice.
//
// Deux nombres pris au hasard entre 20 et 200 sont premiers entre eux six fois
// sur dix : le PGCD vaut 1, le PPCM vaut le produit, et l'élève apprend qu'on
// ne décompose jamais pour rien. Pire, un PGCD de 1 rend le problème des
// bouquets absurde — « un bouquet par fleur ».
//
// Chaque couple ci-dessous a donc un PGCD qui vaut la peine d'être cherché, et
// un PPCM nettement plus petit que le produit. Les derniers portent un facteur
// 7, 11 ou 13 : les critères de divisibilité n'y suffisent plus, et c'est là
// que la décomposition cesse d'être une formalité.
export const COUPLES = [
    [12, 18], [24, 36], [20, 30], [16, 24], [30, 45], [28, 42],
    [36, 48], [40, 60], [54, 72], [45, 75], [50, 80], [60, 84],
    [84, 120], [90, 126], [96, 144], [63, 84],
    [110, 132], [78, 117], [132, 198], [91, 143]
];

/**
 * LES PETITS COUPLES — pour les problèmes où les nombres sont des MINUTES.
 *
 * MESURÉ en lisant les énoncés engendrés : « Le car bleu part toutes les 132
 * minutes » — deux heures douze. L'énoncé est mathématiquement juste et
 * personne n'y croit, et un élève qui ne croit pas à l'énoncé cesse de le
 * lire. Les rythmes se prennent donc dans le bas de la liste.
 */
export const COUPLES_PETITS = COUPLES.filter(([a, b]) => Math.max(a, b) <= 75);

/** Les nombres à décomposer : jamais premiers, toujours instructifs. */
export const A_DECOMPOSER = [
    36, 48, 60, 72, 84, 90, 96, 120, 126, 132, 140, 150,
    168, 180, 198, 200, 210, 225, 240, 252, 280, 300, 315, 360
];

/** Des nombres dont la primalité ne se devine pas — 91 est le piège du chapitre. */
export const A_TESTER = [
    { n: 91, premier: false },   // 7 × 13 — qui s'arrête à 5 le croit premier
    { n: 87, premier: false },   // 3 × 29 — la somme des chiffres fait 15
    { n: 51, premier: false },   // 3 × 17 — même piège, en plus petit
    { n: 57, premier: false },   // 3 × 19
    { n: 119, premier: false },  // 7 × 17
    { n: 143, premier: false },  // 11 × 13
    { n: 97, premier: true },
    { n: 83, premier: true },
    { n: 101, premier: true },
    { n: 113, premier: true },
    { n: 127, premier: true },
    { n: 149, premier: true }
];

// ── LES DIX MARCHES ────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'premier', temps: 'A', titre: 'Ce nombre est-il premier ?', skill: S_DECOMP },
    { id: 'decomposer', temps: 'A', titre: 'Décomposer en facteurs premiers', skill: S_DECOMP },
    { id: 'recomposer', temps: 'A', titre: 'Lire une décomposition', skill: S_DECOMP },
    { id: 'pgcd', temps: 'B', titre: 'Calculer un PGCD', skill: S_PGCD },
    { id: 'ppcm', temps: 'B', titre: 'Calculer un PPCM', skill: S_PPCM },
    { id: 'entre-eux', temps: 'B', titre: 'Premiers entre eux ?', skill: S_PGCD },
    { id: 'irreductible', temps: 'B', titre: 'Rendre une fraction irréductible', skill: S_PGCD },
    { id: 'paquets', temps: 'C', titre: 'Problème : des paquets identiques', skill: S_PGCD },
    { id: 'ensemble', temps: 'C', titre: 'Problème : quand se retrouvent-ils ?', skill: S_PPCM },
    { id: 'carre', temps: 'C', titre: 'Problème : le plus petit carré', skill: S_PPCM }
];

const TEMPS = {
    A: 'A — décomposer',
    B: 'B — PGCD et PPCM, directement',
    C: 'C — les petits problèmes'
};

// ── LES HABILLAGES DES PROBLÈMES ───────────────────────────────────────────
//
// TROIS SITUATIONS PAR TYPE, et pas une seule déclinée. Un élève qui voit
// trois fois « des bouquets de fleurs » apprend le mot « bouquet », pas le
// raisonnement — et le jour du contrôle l'énoncé parle de paquets de bonbons.
//
// CHAQUE NOM PORTE SON GENRE, et ce n'est pas une politesse. MESURÉ en lisant
// les énoncés engendrés : « en utilisant toutes ses stylos et toutes ses
// cahiers », et « des trousses TOUS IDENTIQUES ». Un énoncé mal accordé fait
// trébucher la lecture au moment précis où l'on demande de lire avec
// attention — et c'est la lecture qui fait rater un problème, pas le calcul.
const PAQUETS = [
    { a: 'roses', ga: 'f', b: 'tulipes', gb: 'f', paquet: 'bouquets', gp: 'm',
        un: 'bouquet', qui: 'Un fleuriste', il: 'il' },
    { a: 'billes rouges', ga: 'f', b: 'billes bleues', gb: 'f', paquet: 'sachets', gp: 'm',
        un: 'sachet', qui: 'Un marchand', il: 'il' },
    { a: 'stylos', ga: 'm', b: 'cahiers', gb: 'm', paquet: 'trousses', gp: 'f',
        un: 'trousse', qui: 'Un libraire', il: 'il' },
    { a: 'bonbons', ga: 'm', b: 'chocolats', gb: 'm', paquet: 'sachets', gp: 'm',
        un: 'sachet', qui: 'Une pâtissière', il: 'elle' }
];

/** « tous ses » / « toutes ses », selon ce qu'on compte. */
const tousSes = (genre) => (genre === 'f' ? 'toutes ses' : 'tous ses');

//
// CHAQUE SITUATION ÉCRIT SON PROPRE DÉPART. Première version : une phrase
// commune, « À midi pile, ils sont ensemble ». Elle marche pour deux cars et
// ne veut rien dire pour deux phares — lus sur le PDF imprimé : « Le phare du
// port s'allume toutes les 20 secondes […] À midi pile, ils sont ensemble. »
const ENSEMBLE = [
    { a: 'Le car bleu', b: 'Le car vert', unite: 'minutes', verbe: 'part de la gare',
        debut: 'À midi pile, ils partent ensemble.',
        repart: 'repartiront-ils en même temps' },
    { a: 'Le phare du port', b: 'La bouée du large', unite: 'secondes', verbe: 's\'allume',
        debut: 'À minuit pile, ils s\'allument en même temps.',
        repart: 's\'allumeront-ils de nouveau ensemble' },
    { a: 'La grande roue', b: 'Le petit engrenage', unite: 'secondes',
        verbe: 'passe par sa marque',
        debut: 'Au départ, tous les deux sont à leur marque.',
        repart: 'seront-ils de nouveau tous les deux à leur marque' }
];

//
// LE GENRE, ENCORE. Lu sur le PDF : « des carreaux rectangulaires […] toutes
// posées dans le même sens, sans en couper aucune ». Deux accords faux dans
// la même phrase, sur le seul habillage masculin des trois.
const CARRES = [
    { objet: 'dalles', genre: 'f', lieu: 'une terrasse' },
    { objet: 'carreaux', genre: 'm', lieu: 'un mur' },
    { objet: 'briques', genre: 'f', lieu: 'une allée' }
];

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/**
 * UNE CASE À REMPLIR, DANS L'ÉNONCÉ.
 *
 * ── LE DÉFAUT QUE CECI CORRIGE, ET QUI NE DISAIT RIEN ──────────────────────
 *
 * Une réponse « 3|4 » ne fabrique PAS deux champs toute seule : le pavé
 * numérique compte les `[data-trou]` que l'ÉNONCÉ déclare, et n'en allume
 * plusieurs que s'il en trouve plus d'un (voir `aTrous` dans
 * `core/activities/numeric.js`). Sans eux, l'élève n'a qu'un seul écran et
 * devrait y taper « 3|4 » — ce que le pavé ne permet même pas.
 *
 * MESURÉ en ouvrant l'exercice, pas en relisant le code : rien ne plante,
 * rien ne prévient, et la question est simplement impossible.
 */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

/**
 * UNE QUESTION D'UNE MARCHE.
 *
 * Rend l'énoncé, la question, la réponse attendue, la façon de répondre, et la
 * phrase de correction — jamais un morceau de HTML : c'est l'appelant qui
 * décide de la forme, et la feuille imprimée lit les mêmes champs.
 */
export function question(etape, rng) {
    if (etape.id === 'premier') {
        const c = choisir(A_TESTER, rng);
        return {
            enonce: '', question: `${c.n} est-il un nombre premier ?`,
            kind: 'choice', reponse: c.premier ? 'oui' : 'non',
            choix: ['oui', 'non'],
            pourquoi: c.premier
                ? `${c.n} est premier : aucun nombre de 2 à ${Math.floor(Math.sqrt(c.n))} ne le divise.`
                : `${c.n} n'est pas premier : ${ecrireAPlat(c.n)}.`,
            aide: 'On essaie 2, 3, 5, 7, 11… et l\'on s\'arrête quand le carré du diviseur '
                + `dépasse ${c.n}. S'arrêter plus tôt, c'est déclarer premier un nombre qui ne l'est pas.`
        };
    }

    if (etape.id === 'decomposer') {
        const n = choisir(A_DECOMPOSER, rng);
        const g = facteursGroupes(n);
        // ON DEMANDE LES EXPOSANTS, et c'est la seule façon honnête de faire
        // décomposer sur un pavé numérique.
        //
        // PREMIÈRE VERSION : « combien de facteurs en tout ? ». Elle obligeait
        // bien à décomposer — on ne compte pas sans avoir écrit — mais elle
        // posait une question que personne ne pose, et dont la réponse ne
        // s'écrit nulle part dans un cahier. Les exposants, eux, SONT la
        // décomposition : donner 3, 2 et 1 pour 360, c'est avoir écrit
        // 2³ × 3² × 5.
        //
        // LES NOMBRES PREMIERS SONT DONNÉS dans l'énoncé, et c'est voulu :
        // chercher QUELS premiers interviennent est le travail de la marche
        // « Ce nombre est-il premier ? », celle d'avant. Ici on compte
        // combien de fois chacun.
        // LA QUESTION NE RÉPÈTE PAS L'ÉCRITURE. Première version : « 150 =
        // 2ᵃ × 3ᵇ × 5ᶜ. Donne a, b, c. » — et l'écriture à remplir s'affichait
        // juste en dessous, la même, avec les trous à la place des lettres.
        // Lue à l'écran : deux fois la même ligne, dont une inutile. Les trous
        // disent l'ordre mieux que trois lettres.
        return {
            enonce: '', question: `Complète la décomposition de ${n} en facteurs premiers.`,
            papier: `Décompose ${n} en produit de facteurs premiers.`,
            // LES TROUS SONT LES EXPOSANTS, À LEUR PLACE. L'élève remplit
            // l'écriture elle-même — ce qui EST la décomposition — au lieu de
            // reporter trois nombres dans des cases anonymes.
            htmlReponse: `<span class="pp-ecriture">${n} = ${
                g.map(({ p: pr }, i) => `${pr}<sup>${trou(i)}</sup>`).join(' × ')}</span>`,
            kind: 'numeric', reponse: g.map(x => x.e).join('|'), cases: g.length,
            pourquoi: `${n} = ${ecrireAPlat(n)} = ${ecrireDecomposition(n)}.`,
            aide: 'On divise par 2 tant que c\'est possible, puis par 3, puis par 5, puis par 7… '
                + 'L\'exposant compte COMBIEN DE FOIS on a divisé par ce facteur-là.'
        };
    }

    if (etape.id === 'recomposer') {
        const n = choisir(A_DECOMPOSER, rng);
        return {
            enonce: '', question: `Un nombre s'écrit ${ecrireDecomposition(n)}. Quel est ce nombre ?`,
            kind: 'numeric', reponse: n,
            pourquoi: `${ecrireDecomposition(n)} = ${ecrireAPlat(n)} = ${n}.`,
            aide: `L'exposant dit COMBIEN DE FOIS le facteur apparaît : ${
                enExposant(3)} veut dire trois fois, pas « fois trois ».`
        };
    }

    if (etape.id === 'pgcd' || etape.id === 'ppcm') {
        const [a, b] = choisir(COUPLES, rng);
        const estPgcd = etape.id === 'pgcd';
        const val = estPgcd ? pgcd(a, b) : ppcm(a, b);
        const ex = estPgcd ? pgcdExplique(a, b) : ppcmExplique(a, b);
        return {
            // « et », ET SURTOUT PAS UN POINT MÉDIAN. Première version :
            // « 110 = 2 × 5 × 11 · 132 = 2² × 3 × 11 ». Sur une feuille de
            // MATHÉMATIQUES, « · » est un signe de multiplication : l'élève
            // lit « 11 × 132 ». Vu sur le PDF imprimé, pas à l'écran — où les
            // deux décompositions sont dans des blocs séparés.
            //
            // ET LE POINT FINAL N'EST PAS UNE COQUETTERIE : sur le papier,
            // l'énoncé et la question sont collés bout à bout, et l'on lisait
            // « … = 2⁴ × 3 Quel est le PGCD ».
            enonce: `${a} = ${ecrireDecomposition(a)} et ${b} = ${ecrireDecomposition(b)}.`,
            question: `Quel est le ${estPgcd ? 'PGCD' : 'PPCM'} de ${a} et ${b} ?`,
            kind: 'numeric', reponse: val, nombres: [a, b],
            // LES DEUX DÉCOMPOSITIONS SONT DONNÉES, et c'est voulu : la marche
            // travaille la RÈGLE DES EXPOSANTS, pas la décomposition — celle-ci
            // a ses deux marches à elle, juste avant.
            pourquoi: estPgcd
                ? `On garde les facteurs COMMUNS, au plus PETIT exposant : ${ex.ecrit} = ${val}.`
                : `On garde TOUS les facteurs, au plus GRAND exposant : ${ex.ecrit} = ${val}.`,
            aide: estPgcd
                ? 'Le PGCD est un DIVISEUR des deux : il est forcément plus petit qu\'eux. '
                    + 'On ne garde que les facteurs présents des DEUX côtés.'
                : 'Le PPCM est un MULTIPLE des deux : il est forcément plus grand qu\'eux. '
                    + 'On garde tous les facteurs, même ceux qui ne sont que d\'un côté.'
        };
    }

    if (etape.id === 'entre-eux') {
        // UNE FOIS SUR DEUX VRAI, et tiré sur l'index plutôt que sur le
        // hasard : sur une fiche de douze questions, le hasard donne parfois
        // dix « non » d'affilée, et l'élève répond « non » sans lire.
        const oui = rng.int(0, 1) === 1;
        const [a, b] = oui
            ? choisir([[8, 9], [15, 28], [21, 20], [35, 24], [25, 42], [16, 27]], rng)
            : choisir(COUPLES, rng);
        const d = pgcd(a, b);
        return {
            enonce: '', question: `${a} et ${b} sont-ils premiers entre eux ?`,
            kind: 'choice', reponse: d === 1 ? 'oui' : 'non',
            choix: ['oui', 'non'],
            pourquoi: d === 1
                ? `Oui : PGCD(${a} ; ${b}) = 1 — ils n'ont aucun facteur en commun.`
                : `Non : PGCD(${a} ; ${b}) = ${d}, car ${a} et ${b} ont ${
                    d === 2 ? 'le facteur 2' : `le facteur ${d}`} en commun.`,
            aide: 'ATTENTION AU MOT : aucun des deux n\'a besoin d\'être premier. 8 et 9 sont '
                + 'premiers ENTRE EUX, et ni l\'un ni l\'autre n\'est premier. Il suffit que leur '
                + 'PGCD vaille 1.'
        };
    }

    if (etape.id === 'irreductible') {
        const [a, b] = choisir(COUPLES, rng);
        const [n, d] = irreductible(a, b);
        return {
            enonce: '', question: `Rends la fraction ${a}/${b} irréductible.`,
            papier: `Rends la fraction ${a}/${b} irréductible.`,
            // LA FRACTION SE REMPLIT EN PLACE, numérateur au-dessus du trait.
            // « Donne le numérateur, puis le dénominateur » était une consigne
            // de saisie, pas une question de mathématiques — et elle n'aurait
            // de toute façon servi à rien : sans trous, il n'y avait qu'un
            // seul champ.
            htmlReponse: `<span class="fraction fraction--grande">`
                + `<span class="fraction-num">${trou(0)}</span>`
                + `<span class="fraction-den">${trou(1)}</span></span>`,
            kind: 'numeric', reponse: `${n}|${d}`, cases: 2, nombres: [a, b],
            pourquoi: `PGCD(${a} ; ${b}) = ${pgcd(a, b)}, donc ${a}/${b} = ${n}/${d}.`,
            aide: 'On divise le haut ET le bas par leur PGCD. Diviser par un diviseur commun '
                + 'plus petit marche aussi, mais il faudra recommencer.'
        };
    }

    // ── LES PETITS PROBLÈMES ───────────────────────────────────────────────

    if (etape.id === 'paquets') {
        const h = choisir(PAQUETS, rng);
        const [a, b] = choisir(COUPLES, rng);
        const d = pgcd(a, b);
        const identiques = h.gp === 'f' ? 'TOUTES IDENTIQUES' : 'TOUS IDENTIQUES';
        return {
            enonce: `${h.qui} a ${a} ${h.a} et ${b} ${h.b}. ${
                h.il === 'elle' ? 'Elle' : 'Il'} veut faire des ${h.paquet} `
                + `${identiques}, en utilisant ${tousSes(h.ga)} ${h.a} et ${tousSes(h.gb)} ${h.b}.`,
            question: `Quel est le plus grand nombre de ${h.paquet} qu'${h.il} puisse faire ?`,
            kind: 'numeric', reponse: d, nombres: [a, b],
            pourquoi: `Le nombre de ${h.paquet} divise ${a} ET ${b} : c'est un diviseur commun. `
                + `Le plus grand est le PGCD : ${pgcdExplique(a, b).ecrit} = ${d}. `
                + `Chaque ${h.un} contient alors ${a / d} ${h.a} et ${b / d} ${h.b}.`,
            aide: 'On PARTAGE ce qu\'on a en parts égales, sans reste : le nombre de parts '
                + 'DIVISE les deux quantités. On cherche donc un diviseur commun — et « le plus '
                + 'grand possible » dit lequel.'
        };
    }

    if (etape.id === 'ensemble') {
        const h = choisir(ENSEMBLE, rng);
        const [a, b] = choisir(COUPLES_PETITS, rng);
        const m = ppcm(a, b);
        return {
            enonce: `${h.a} ${h.verbe} toutes les ${a} ${h.unite}, ${
                h.b.toLowerCase()} toutes les ${b} ${h.unite}. ${h.debut}`,
            question: `Dans combien de ${h.unite} ${h.repart} ?`,
            kind: 'numeric', reponse: m, unite: h.unite, nombres: [a, b],
            pourquoi: `Le moment cherché est un multiple de ${a} ET de ${b}. Le premier est le `
                + `PPCM : ${ppcmExplique(a, b).ecrit} = ${m} ${h.unite}.`,
            aide: 'On ATTEND que deux rythmes retombent ensemble : le moment cherché est un '
                + 'MULTIPLE des deux. Il est donc plus GRAND que chacun — si votre réponse est '
                + 'plus petite, c\'est un PGCD que vous avez calculé.'
        };
    }

    // 'carre'
    const h = choisir(CARRES, rng);
    // LES PETITS COUPLES ICI AUSSI. Lu sur le PDF imprimé : « des briques
    // rectangulaires de 91 cm sur 143 cm » — une brique d'un mètre quarante.
    // Le calcul est juste, l'objet n'existe pas, et l'élève décroche.
    const [a, b] = choisir(COUPLES_PETITS, rng);
    const m = ppcm(a, b);
    return {
        enonce: `On pave ${h.lieu} avec des ${h.objet} rectangulaires de ${a} cm sur ${b} cm, `
            + `${h.genre === 'f' ? 'toutes posées' : 'tous posés'} dans le même sens, `
            + `sans en couper ${h.genre === 'f' ? 'aucune' : 'aucun'}.`,
        question: 'Quel est le côté, en cm, du plus petit carré qu\'on puisse ainsi paver ?',
        kind: 'numeric', reponse: m, unite: 'cm', nombres: [a, b],
        pourquoi: `Le côté doit être un multiple de ${a} et de ${b} : le plus petit est le PPCM, `
            + `${ppcmExplique(a, b).ecrit} = ${m} cm. Il faudra ${(m / a) * (m / b)} ${h.objet}.`,
        aide: 'On AGRANDIT jusqu\'à ce que ça tombe juste dans les deux sens : le côté est un '
            + 'MULTIPLE des deux longueurs. Plus grand qu\'elles, donc — pas plus petit.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

export const pgcdPpcmGenerator = {
    id: 'num.pgcd-ppcm',
    label: 'Décomposer, PGCD et PPCM',
    // LES TROIS COMPÉTENCES, et non une seule : le bilan doit pouvoir dire
    // « il décompose, mais il confond les deux » — c'est le diagnostic utile.
    skills: [S_DECOMP, S_PGCD, S_PPCM],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. « 96/144 » est une commodité d'écran,
    // et une feuille qui l'imprime enseigne le contraire du cours. Le rendu
    // sait empiler ; ce drapeau lui dit qu'il y a de quoi. Une épreuve du
    // catalogue l'a réclamé — la marche « fraction irréductible » l'écrivait
    // à la barre oblique.
    fractions: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        // DEUX CASES ET PAS QUATRE : la question est fermée, « oui » ou
        // « non ». `finalizeChoices` complète jusqu'à quatre par défaut, et il
        // n'y a rien pour compléter — on le lui dit.
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c, label: c === 'oui' ? 'Oui' : 'Non', correct: c === q.reponse
            })), { count: 2 })
            : null;

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.pgcd-ppcm',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                text: `${q.enonce} ${q.question}`.trim(),
                papier: `${q.enonce} ${q.papier || q.question}`.trim(),
                // L'ÉNONCÉ D'ABORD, LA QUESTION ENSUITE ET EN GRAS — comme pour
                // les petits problèmes d'argent, et pour la même raison : un
                // problème EST une phrase à lire, on ne peut pas la raccourcir,
                // mais on peut séparer ce qu'on lit UNE fois de ce qu'on relit.
                html: '<div class="game-question ap-probleme">'
                    + (q.enonce ? `<span class="ap-situation">${q.enonce}</span>` : '')
                    + `<span class="ap-question">${q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                // LE PREMIER INDICE NE DONNE PAS L'OPÉRATION : il dit ce qu'il
                // faut VOIR dans l'énoncé. C'est la seule aide qui apprenne
                // quelque chose — « c'est un PPCM » ne s'apprend pas, il se
                // reconnaît.
                q.aide,
                etape.temps === 'C'
                    ? 'Décompose les deux nombres, puis relis la phrase : partage-t-on, ou attend-on ?'
                    : 'Écris les deux décompositions l\'une sous l\'autre, facteur par facteur.'
            ],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                // LE PAVÉ N'A PAS DE VIRGULE : toutes les réponses de ce
                // chapitre sont des ENTIERS, et proposer une virgule là où
                // elle n'a aucun sens est une invitation à la faute.
                decimal: false,
                // LES DEUX NOMBRES DE LA QUESTION, à part. L'énoncé d'un PGCD
                // porte aussi les facteurs des décompositions : les relire au
                // passage d'une expression régulière rend « 2 » pour le plus
                // petit nombre de l'énoncé, et toute vérification de bon sens
                // s'effondre. Mesuré par une épreuve, pas par une lecture.
                ...(q.nombres ? { nombres: q.nombres } : {}),
                ...(q.unite ? { unite: q.unite } : {}),
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default pgcdPpcmGenerator;
