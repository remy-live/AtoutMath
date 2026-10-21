// DÉCOMPOSER, PGCD ET PPCM — l'arithmétique de troisième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd et
// ppcm niveau 3ème. Des exercices d'application direct et des petits
// problèmes ». Puis, une heure après la livraison :
//
//   « le décomposer pgcd et ppcm est bien trop difficile ! »
//
// ── IL AVAIT RAISON, ET LE DÉFAUT A UN NOM : IL N'Y AVAIT PAS DE PETIT BAIN ──
//
// MESURÉ en engendrant les dix marches et en les LISANT une par une, pas en
// relisant le code. Chacune était au niveau d'un exercice de fin de chapitre,
// et la PREMIÈRE était la plus dure de toutes :
//
//   · « 91 est-il premier ? » en question d'ouverture — c'est-à-dire LE piège
//     du chapitre (7 × 13, il faut essayer jusqu'à 9) avant toute leçon ;
//   · PPCM(91 ; 143) = 1001, trois facteurs premiers à multiplier sans
//     brouillon ;
//   · un problème sur 78 et 117, où il faut voir que 39 = 3 × 13 ;
//   · et PAS UNE MARCHE ne demandait « 12 est-il divisible par 3 ? » ni « cite
//     un diviseur de 20 ».
//
// Une progression qui commence par la fin n'est pas une progression, c'est un
// contrôle. Les quatre marches du temps A, les deux premières du temps B et les
// deux premières du temps C existent pour cela : on y répond SANS MÉTHODE, par
// ce qu'on sait déjà de la table de multiplication.
//
// ── UN SEUL EXERCICE, ET C'EST LA MÉCANIQUE DU DÉPÔT QUI LE PERMET ──────────
//
// La question s'est posée : garder les marches dures derrière les faciles, ou
// les sortir dans un second exercice ? Un seul exercice, parce que
// `decoupeMarches` (core/progression.js) partage les questions DANS L'ORDRE de
// la progression, et que `partageEgal` en donne une chacune aux PREMIÈRES quand
// il y en a moins que de marches. Un parcours de dix questions sur dix-sept
// marches joue donc les dix premières — le petit bain — sans qu'on ait rien à
// régler ; et le professeur qui veut le haut de l'escalier coche le temps D
// d'un seul geste.
//
// ── « APPLICATION DIRECTE » ET « PETIT PROBLÈME » NE SONT PAS DEUX NIVEAUX ──
//
// C'est l'autre décision qui commande ce fichier. Calculer PGCD(84 ; 120) est
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
// ce sont des marches distinctes, et le temps D les MÉLANGE délibérément.
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
    pgcd, ppcm, estPremier, diviseurs, facteursPremiers, facteursGroupes,
    ecrireDecomposition, ecrireAPlat, irreductible, pgcdExplique, ppcmExplique,
    enExposant
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
 * LES COUPLES DES PROBLÈMES — et ils sont PLUS PETITS que les autres.
 *
 * RÉMY : « bien trop difficile ». Les problèmes du temps D empilaient trois
 * difficultés : lire l'énoncé, CHOISIR la notion, puis calculer. Sur 78 et 117
 * la troisième mangeait les deux autres — il faut voir que 39 = 3 × 13 avant
 * de pouvoir se demander si l'on partage ou si l'on attend.
 *
 * Or la notion EST la difficulté de ces trois marches ; l'arithmétique n'a pas
 * à s'y ajouter. Elle a ses sept marches à elle, juste avant.
 */
export const COUPLES_FACILES = [
    [6, 8], [8, 12], [9, 12], [10, 15], [12, 18], [12, 20], [14, 21], [15, 20],
    [15, 25], [16, 24], [18, 24], [20, 30], [21, 28], [22, 33], [24, 36],
    [28, 42], [30, 45], [36, 48]
];

/**
 * LES COUPLES DES RYTHMES — filtrés sur LA RÉPONSE, et non sur les nombres.
 *
 * MESURÉ en lisant les énoncés engendrés : « Le car bleu part toutes les 132
 * minutes » — deux heures douze. La première correction filtrait les NOMBRES
 * de l'énoncé, ce qui n'était pas le bon critère : ce qui doit rester crédible,
 * c'est le TEMPS D'ATTENTE, c'est-à-dire le PPCM. Deux phares de 36 et 48
 * secondes sont parfaitement plausibles ; se retrouver au bout de 144 secondes,
 * soit deux minutes vingt-quatre à regarder la mer, l'est beaucoup moins.
 *
 * Et un élève qui ne croit pas à l'énoncé cesse de le lire.
 */
export const COUPLES_RYTHME = COUPLES_FACILES.filter(([a, b]) => ppcm(a, b) <= 90);

/** Les nombres à décomposer : jamais premiers, toujours instructifs. */
/**
 * LES NOMBRES QU'ON POSE EN COLONNE : trois ou quatre facteurs premiers, pas
 * plus. Cinq feraient neuf cases à remplir sur un pavé numérique, et c'est la
 * longueur qui deviendrait l'exercice.
 */
export const A_POSER = [
    12, 18, 20, 24, 28, 30, 36, 40, 42, 44, 45, 50, 52, 54, 56,
    63, 66, 68, 70, 75, 76, 78, 81, 88, 92, 98, 99, 102, 105, 110
];

export const A_DECOMPOSER = [
    36, 48, 60, 72, 84, 90, 96, 120, 126, 132, 140, 150,
    168, 180, 198, 200, 210, 225, 240, 252, 280, 300, 315, 360
];

/**
 * LES PETITS, POUR LA PREMIÈRE DÉCOMPOSITION ENTIÈRE.
 *
 * Deux facteurs premiers chacun, et tous sous cent : la décomposition tient en
 * trois divisions, et l'élève voit l'escalier en entier sur une seule ligne.
 * 360 = 2³ × 3² × 5 est le même travail fait trois fois, et c'est la marche
 * d'après.
 */
export const A_DECOMPOSER_PETIT = [
    12, 18, 20, 24, 28, 36, 40, 45, 50, 54, 63, 75, 98, 99
];

/**
 * LES NOMBRES DE L'ESCALIER — ceux dont on cherche le plus petit facteur.
 *
 * LE PLUS PETIT PREMIER N'EST PAS TOUJOURS 2, et c'est tout l'intérêt : si la
 * liste n'avait que des nombres pairs, la marche s'apprendrait par cœur en deux
 * questions. Chacun des quatre premiers critères — 2, 3, 5, 7 — est le bon pour
 * au moins trois nombres de la liste.
 */
/**
 * LES NOMBRES PAR LESQUELS ON OUVRE L'ESCALIER.
 *
 * Deux chiffres, et leur plus petit facteur premier est 2, 3 ou 5 — c'est-à-
 * dire l'un des trois critères qu'on vient d'apprendre. Les trois cas sont
 * représentés : pairs, multiples de 3 mais impairs, et multiples de 5 ni
 * pairs ni multiples de 3. Sans ce dernier, le critère de 5 ne servirait
 * jamais à cette marche.
 */
export const A_OUVRIR = [
    12, 18, 24, 28, 32, 34, 38, 46, 52, 58, 62, 68, 74, 82, 86, 94,
    21, 27, 33, 39, 51, 57, 63, 69, 87, 93, 99,
    25, 35, 55, 65, 85, 95
];

export const A_ESCALADER = [
    84, 90, 132, 198,            // 2
    45, 63, 75, 81, 105, 135,    // 3
    125, 175, 275, 325,          // 5
    49, 77, 91, 119              // 7
];

/**
 * LES NOMBRES DONT ON LISTE LES DIVISEURS.
 *
 * HUIT DIVISEURS AU PLUS, et c'est une contrainte de LECTURE : la liste est
 * écrite en entier dans l'énoncé, et celle de 60 en compte douze — une ligne et
 * demie de chiffres avant même d'arriver à la question.
 */
export const A_DIVISER = [12, 18, 20, 24, 28, 30, 32, 40, 42, 45, 50, 54];

/**
 * LES COUPLES QU'ON COMPARE EN LISTANT — sans décomposer du tout.
 *
 * C'est la marche qui donne le SENS avant la technique : le PGCD est le plus
 * grand nombre qui est dans les deux listes de diviseurs, le PPCM le premier
 * qui est dans les deux listes de multiples. Un élève qui a fait cela deux fois
 * sait ce qu'il cherche quand on lui demande ensuite de décomposer.
 */
export const COUPLES_A_LISTER = [
    [12, 18], [20, 30], [16, 24], [18, 24], [12, 20],
    [15, 20], [10, 15], [21, 28], [14, 21], [12, 16]
];

/** Les mêmes, pour les multiples : le PPCM doit tenir en quelques termes. */
export const COUPLES_A_MULTIPLIER = [
    [4, 6], [6, 8], [4, 10], [6, 9], [8, 12],
    [6, 10], [9, 12], [10, 15], [6, 15], [8, 10]
];

/**
 * LES COUPLES QUI FONT VOIR LA RÈGLE DES EXPOSANTS.
 *
 * Chacun porte un nombre premier présent DES DEUX CÔTÉS avec deux exposants
 * DIFFÉRENTS — sans quoi « le plus petit » et « le plus grand » désignent la
 * même chose et la question ne veut rien dire. Ce n'est pas automatique :
 * 90 = 2 × 3² × 5 et 126 = 2 × 3² × 7 ont les mêmes exposants partout où ils se
 * rencontrent, et ce couple a été retiré pour cela.
 */
export const COUPLES_EXPOSANT = [
    [12, 18], [24, 36], [20, 30], [16, 24], [54, 72],
    [40, 60], [36, 48], [84, 120], [96, 144]
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

/**
 * LES PETITS, POUR LA PREMIÈRE QUESTION DE PRIMALITÉ.
 *
 * Sous trente, la réponse se LIT : on reconnaît 21 dans la table de 3 et 25
 * dans celle de 5, sans méthode ni racine carrée. C'est exactement ce qui
 * manquait — la marche d'avant demandait 91.
 *
 * ON NE MET PAS 1. C'est un vrai piège du chapitre (il n'est pas premier,
 * puisqu'il n'a qu'UN diviseur), mais un piège n'a rien à faire dans la marche
 * qui ouvre la progression : il appartient à « Ce nombre est-il premier ? »,
 * trois marches plus loin.
 */
export const PREMIERS_SOUS_30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
export const COMPOSES_SOUS_30 = [4, 6, 9, 10, 12, 14, 15, 18, 20, 21, 22, 25, 26, 27, 28];

// ── LES DIX-SEPT MARCHES ───────────────────────────────────────────────────

export const ETAPES = [
    { id: 'divisible', temps: 'A', titre: 'Divisible, oui ou non ?', skill: S_DECOMP },
    { id: 'qui-divise', temps: 'A', titre: 'Lequel divise ce nombre ?', skill: S_DECOMP },
    { id: 'liste-diviseurs', temps: 'A', titre: 'La liste des diviseurs', skill: S_DECOMP },
    { id: 'premier-petit', temps: 'A', titre: 'Premier, sous trente', skill: S_DECOMP },
    { id: 'par-quoi', temps: 'B', titre: 'Par quel premier commencer ?', skill: S_DECOMP },
    { id: 'le-quotient', temps: 'B', titre: 'La première division', skill: S_DECOMP },
    { id: 'decomposer-petit', temps: 'B', titre: 'Décomposer un petit nombre', skill: S_DECOMP },
    { id: 'premier', temps: 'B', titre: 'Ce nombre est-il premier ?', skill: S_DECOMP },
    { id: 'potence', temps: 'B', titre: 'Poser la décomposition en colonne', skill: S_DECOMP },
    { id: 'decomposer', temps: 'B', titre: 'Décomposer en facteurs premiers', skill: S_DECOMP },
    { id: 'recomposer', temps: 'B', titre: 'Lire une décomposition', skill: S_DECOMP },
    { id: 'pgcd-liste', temps: 'C', titre: 'Le PGCD, en listant', skill: S_PGCD },
    { id: 'ppcm-liste', temps: 'C', titre: 'Le PPCM, en listant', skill: S_PPCM },
    { id: 'exposant', temps: 'C', titre: 'Quel exposant garde-t-on ?', skill: S_PGCD },
    { id: 'pgcd', temps: 'C', titre: 'Calculer un PGCD', skill: S_PGCD },
    { id: 'ppcm', temps: 'C', titre: 'Calculer un PPCM', skill: S_PPCM },
    { id: 'entre-eux', temps: 'C', titre: 'Premiers entre eux ?', skill: S_PGCD },
    { id: 'irreductible', temps: 'C', titre: 'Rendre une fraction irréductible', skill: S_PGCD },
    { id: 'melange', temps: 'D', titre: 'Problème : lequel des deux ?', skill: S_PGCD },
    { id: 'paquets', temps: 'D', titre: 'Problème : des paquets identiques', skill: S_PGCD },
    { id: 'ensemble', temps: 'D', titre: 'Problème : quand se retrouvent-ils ?', skill: S_PPCM },
    { id: 'carre', temps: 'D', titre: 'Problème : le plus petit carré', skill: S_PPCM }
];

const TEMPS = {
    A: 'A — pour commencer : diviseurs et multiples',
    B: 'B — décomposer',
    C: 'C — PGCD et PPCM, directement',
    D: 'D — les petits problèmes'
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
 * LA POTENCE — LA DÉCOMPOSITION POSÉE EN COLONNE.
 *
 * RÉMY, photo de son cahier à l'appui : « Il faudrait plutôt le faire en
 * colonne. » Sa photo montre exactement cela — le nombre à gauche, le diviseur
 * à droite d'un trait vertical, et l'on descend :
 *
 *     120 │ 2
 *      60 │ 2
 *      30 │ 2
 *      15 │
 *
 * ON REMPLIT LES DEUX COLONNES, et c'est la différence entre poser une
 * division et lire une réponse. Montrer les quotients tout faits donnerait les
 * diviseurs par simple division ; ne montrer que le premier nombre et le 1
 * final oblige à faire ce que le cahier fait faire — choisir le premier qui
 * divise, poser le quotient, recommencer.
 *
 * L'ORDRE DES TROUS EST L'ORDRE DE LECTURE : diviseur, puis quotient, puis
 * diviseur… C'est aussi l'ordre dans lequel on les écrit à la main.
 *
 * LE 1 FINAL EST ÉCRIT, et il n'est pas décoratif : c'est le signal d'arrêt.
 * Un élève qui ne sait pas où s'arrêter divise encore, ou s'arrête trop tôt.
 */
function potenceHtml(n, facteurs) {
    let reste = n, i = 0;
    const lignes = facteurs.map((f, k) => {
        const gauche = k === 0 ? String(n) : trou(i++);
        const droite = trou(i++);
        reste /= f;
        return `<tr><td class="pp-pot-n">${gauche}</td><td class="pp-pot-d">${droite}</td></tr>`;
    });
    lignes.push('<tr><td class="pp-pot-n">1</td><td class="pp-pot-d"></td></tr>');
    return `<table class="pp-potence"><tbody>${lignes.join('')}</tbody></table>`;
}

/** Les cases de la potence, dans l'ordre où on les remplit. */
function potenceReponse(n, facteurs) {
    const cases = [];
    let reste = n;
    facteurs.forEach((f, k) => {
        if (k > 0) cases.push(String(reste));
        cases.push(String(f));
        reste /= f;
    });
    return cases.join('|');
}

/** « 4 + 5 » — la somme des chiffres, écrite comme on la pose. */
const chiffresAdditionnes = (n) => String(n).split('').join(' + ');
const sommeDesChiffres = (n) => String(n).split('').reduce((s, c) => s + Number(c), 0);

/**
 * CE QUI SE REGARDE POUR CHAQUE CRITÈRE, dit en mots d'élève.
 *
 * ON NE RÉCITE PAS « n ≡ 0 mod d ». Un critère de divisibilité est une
 * OBSERVATION : on regarde le dernier chiffre, ou l'on additionne les chiffres.
 * C'est ce geste-là que la phrase doit nommer.
 */
const CRITERES = {
    2: 'se termine par 0, 2, 4, 6 ou 8',
    3: 'a une somme de chiffres qui est dans la table de 3',
    5: 'se termine par 0 ou par 5',
    10: 'se termine par 0'
};

/**
 * POURQUOI CE PREMIER-LÀ EST LE PLUS PETIT — en descendant les critères.
 *
 * La phrase énumère ce qu'on a ÉLIMINÉ avant d'arriver au bon : c'est l'ordre
 * de l'escalier, et c'est la seule chose à retenir de la marche. « 2 divise
 * 84 » n'apprend rien ; « 84 est pair, donc on commence par 2 » si.
 */
function pourquoiCePremier(n, p) {
    const avant = [];
    if (p > 2) avant.push(`${n} est impair, donc 2 ne le divise pas`);
    if (p > 3) {
        avant.push(`${chiffresAdditionnes(n)} = ${sommeDesChiffres(n)}, qui n'est pas dans la table de 3`);
    }
    if (p > 5) avant.push('il ne se termine ni par 0 ni par 5, donc 5 ne le divise pas');
    const trouve = p === 2
        ? `${n} est pair`
        : p === 3
            ? `${chiffresAdditionnes(n)} = ${sommeDesChiffres(n)} est dans la table de 3`
            : p === 5
                ? `il se termine par ${n % 10}`
                : 'reste 7';
    // ON JOINT PAR UN POINT-VIRGULE, et non par une virgule. « 325 est impair,
    // donc 2 ne le divise pas, 3 + 2 + 5 = 10, qui n'est pas dans la table de
    // 3 » : quatre virgules de rangs différents dans une seule phrase, et l'œil
    // ne sait plus où la première raison s'arrête. Lu sur la correction
    // engendrée, pas déduit.
    return `${avant.length ? avant.join(' ; ') + '. ' : ''}${
        trouve.charAt(0).toUpperCase()}${trouve.slice(1)} : ${n} = ${p} × ${n / p}.`;
}

/**
 * UNE QUESTION D'UNE MARCHE.
 *
 * Rend l'énoncé, la question, la réponse attendue, la façon de répondre, et la
 * phrase de correction — jamais un morceau de HTML : c'est l'appelant qui
 * décide de la forme, et la feuille imprimée lit les mêmes champs.
 *
 * `skill` est optionnel, et une seule marche s'en sert : voir `exposant`.
 */
export function question(etape, rng) {

    // ── TEMPS A : CE QUI SE RÉPOND SANS MÉTHODE ────────────────────────────

    if (etape.id === 'divisible') {
        // LE 3 EST LÀ POUR LA TROISIÈME, PAS POUR LA SIXIÈME. Rémy écrit
        // « Critère de divisibilité (2-5-10) » dans sa progression de sixième,
        // et c'est son chapitre. On ajoute le 3 ICI parce que la marche
        // `par-quoi`, deux crans plus loin, demande le plus petit premier qui
        // divise 45 : sans le critère de 3, elle est infaisable.
        const d = choisir([2, 3, 5, 10], rng);
        const k = rng.int(3, 12);
        // UNE FOIS SUR DEUX VRAI. Le hasard pur donne parfois sept « oui »
        // d'affilée, et l'élève répond sans regarder — ce qui est exactement
        // l'inverse de ce que la marche travaille.
        const ecart = rng.int(0, 1) === 1 ? 0 : (d === 2 ? 1 : rng.int(1, d - 1));
        const n = d * k + ecart;
        const juste = n % d === 0;
        return {
            enonce: '', question: `${n} est-il divisible par ${d} ?`,
            kind: 'choice', reponse: juste ? 'oui' : 'non', choix: ['oui', 'non'],
            pourquoi: d === 3
                ? `${chiffresAdditionnes(n)} = ${sommeDesChiffres(n)}, qui ${
                    juste ? 'est' : 'n\'est pas'} dans la table de 3 : ${
                    juste ? `${n} = 3 × ${n / 3}` : `${n} n'est pas divisible par 3`}.`
                : `Un nombre divisible par ${d} ${CRITERES[d]}. ${n} se termine par ${
                    n % 10} : ${juste ? `oui, ${n} = ${d} × ${n / d}` : 'non'}.`,
            aide: 'ON NE REGARDE PAS TOUT LE NOMBRE. Pour 2, 5 et 10, le CHIFFRE DES '
                + 'UNITÉS suffit. Pour 3, on additionne les chiffres.'
        };
    }

    if (etape.id === 'qui-divise') {
        const n = choisir(A_DIVISER, rng);
        // ON ÉVITE 2 COMME BONNE RÉPONSE quand on peut. Il divise les deux
        // tiers de la liste : s'il était tiré librement, la marche
        // s'apprendrait par cœur en trois questions — « réponds 2 ».
        const petits = diviseurs(n).filter(x => x > 2 && x <= 12);
        const bon = choisir(petits.length ? petits : [2], rng);
        const dehors = [];
        for (let x = 2; x <= 12; x++) if (n % x) dehors.push(x);
        const leurres = [];
        while (leurres.length < 3 && dehors.length) {
            leurres.push(dehors.splice(rng.int(0, dehors.length - 1), 1)[0]);
        }
        const temoin = leurres[0];
        // SUR LE PAPIER, LES QUATRE NOMBRES SONT DANS L'ÉNONCÉ.
        //
        // VU SUR LE PDF, et invisible à l'écran : « Lequel de ces nombres
        // divise 50 ? » — et aucun nombre nulle part. Les quatre propositions
        // sont des BOUTONS, et une feuille imprimée n'a pas de boutons. La
        // question n'était pas difficile, elle était sans réponse possible.
        //
        // On les range dans l'ordre croissant plutôt que dans celui du tirage :
        // sur l'écran le mélange empêche d'apprendre la place de la bonne
        // réponse, sur le papier il n'empêche rien et gêne la lecture.
        const quatre = [bon, ...leurres].sort((x, y) => x - y);
        return {
            enonce: '', question: `Lequel de ces nombres divise ${n} ?`,
            papier: `Parmi ${quatre.slice(0, 3).join(', ')} et ${quatre[3]}, `
                + `lequel divise ${n} ?`,
            kind: 'choice', reponse: String(bon),
            choix: [String(bon), ...leurres.map(String)],
            pourquoi: `${n} ÷ ${bon} = ${n / bon}, il ne reste rien : ${bon} divise ${n}. `
                + `Les autres laissent un reste — ${n} ÷ ${temoin} donne ${
                    Math.floor(n / temoin)} et il reste ${n % temoin}.`,
            aide: 'DIVISER, C\'EST PARTAGER SANS RESTE. On essaie les tables : le nombre '
                + 'est-il dans la table de 3 ? de 4 ? de 6 ?'
        };
    }

    if (etape.id === 'liste-diviseurs') {
        const n = choisir(A_DIVISER, rng);
        const d = diviseurs(n);
        // NI LE PREMIER NI LE DERNIER. Cacher 1 ou n donnerait la réponse sans
        // rien chercher — tout nombre a ces deux-là, et l'élève le sait avant
        // d'avoir lu la liste.
        const i = rng.int(1, d.length - 2);
        const cache = d[i];
        const liste = d.map((x, k) => (k === i ? '?' : String(x))).join(', ');
        const paires = d.filter(x => x * x <= n).map(x => `${x} et ${n / x}`);
        return {
            enonce: `Les diviseurs de ${n} sont : ${liste}.`,
            question: 'Quel nombre a-t-on caché ?',
            kind: 'numeric', reponse: cache,
            pourquoi: `Il manquait ${cache}, car ${n} = ${cache} × ${n / cache}. Les diviseurs `
                + `vont PAR PAIRES : ${paires.join(', ')}.`,
            aide: 'LES DIVISEURS VONT PAR PAIRES : dès qu\'on en trouve un, le quotient en '
                + 'est un aussi. On monte 1, 2, 3, 4… jusqu\'à ce que les deux se croisent.'
        };
    }

    if (etape.id === 'premier-petit') {
        const n = choisir(rng.int(0, 1) === 1 ? PREMIERS_SOUS_30 : COMPOSES_SOUS_30, rng);
        const oui = estPremier(n);
        return {
            enonce: '', question: `${n} est-il un nombre premier ?`,
            kind: 'choice', reponse: oui ? 'oui' : 'non', choix: ['oui', 'non'],
            pourquoi: oui
                ? `${n} n'a que deux diviseurs, 1 et ${n} : il est premier.`
                : `${n} = ${ecrireAPlat(n)}. Il a d'autres diviseurs que 1 et lui-même : `
                    + 'il n\'est pas premier.',
            aide: 'UN NOMBRE PREMIER A EXACTEMENT DEUX DIVISEURS : 1 et lui-même. On cherche '
                + 'donc s\'il entre dans une table — celle de 2, de 3, de 5…'
        };
    }

    // ── TEMPS B : DÉCOMPOSER ───────────────────────────────────────────────

    if (etape.id === 'par-quoi' || etape.id === 'le-quotient') {
        // CETTE MARCHE OUVRE L'ESCALIER : elle tire dans SA liste, pas dans
        // celle du sommet.
        //
        // RÉMY : « Quel est le plus petit nombre premier qui divise 91 ? <-
        // c'est pas facile. Quel est le plus petit nombre premier qui divise
        // 198 ? idem. » Elle tirait dans `A_ESCALADER`, la liste de la marche
        // « décomposer » — celle du HAUT de l'escalier —, où l'on trouve 49,
        // 77, 91 et 119, dont le plus petit facteur est 7 ou 11. Or l'aide de
        // cette marche dit « on essaie dans l'ordre : 2, puis 3, puis 5, puis
        // 7 » : elle décrit un réflexe, et on la faisait travailler sur les
        // nombres qui mettent ce réflexe EN DÉFAUT.
        //
        // ET 198 EST DU MÊME TONNEAU, même si sa réponse est 2 : trois chiffres
        // à la première marche de l'escalier, cela arrête un élève avant qu'il
        // ait regardé le chiffre des unités.
        //
        // La leçon « quand 2, 3 et 5 échouent, il faut essayer 7 » n'est pas
        // perdue : c'est exactement ce que travaille la marche « ce nombre
        // est-il premier ? », deux crans plus loin, sur 49, 77, 91 et 119.
        const n = choisir(etape.id === 'par-quoi' ? A_OUVRIR : A_ESCALADER, rng);
        const p = facteursPremiers(n)[0];
        if (etape.id === 'par-quoi') {
            return {
                enonce: '',
                question: `Quel est le plus petit nombre premier qui divise ${n} ?`,
                // LES QUATRE MÊMES CHOIX À CHAQUE FOIS, et c'est voulu : ce sont
                // les quatre premiers critères, dans l'ordre où on les essaie.
                // La liste est le COURS, pas un jeu de leurres.
                //
                // ET LA QUESTION DIT « LE PLUS PETIT ». Sans ces trois mots,
                // 84 aurait trois bonnes réponses sur quatre — 2, 3 et 7 le
                // divisent tous les trois.
                kind: 'choice', reponse: String(p), choix: ['2', '3', '5', '7'],
                pourquoi: pourquoiCePremier(n, p),
                aide: 'ON ESSAIE DANS L\'ORDRE, et l\'ordre est toujours le même : 2 (est-il '
                    + 'pair ?), puis 3 (la somme des chiffres est-elle dans la table de 3 ?), '
                    + 'puis 5 (finit-il par 0 ou 5 ?), puis 7.'
            };
        }
        const q = n / p;
        return {
            enonce: `${n} est divisible par ${p}.`,
            question: `Combien vaut ${n} ÷ ${p} ?`,
            kind: 'numeric', reponse: q,
            pourquoi: `${n} ÷ ${p} = ${q}. C'est la deuxième ligne de l'escalier${
                estPremier(q) ? `, et ${q} est premier : l'escalier s'arrête là, ${n} = ${p} × ${q}`
                    : ` : on recommence maintenant sur ${q}`}.`,
            aide: 'ON DIVISE PAR LE PLUS PETIT PREMIER, puis on RECOMMENCE sur le quotient. '
                + 'L\'escalier s\'arrête quand le quotient est lui-même premier.'
        };
    }

    if (etape.id === 'potence') {
        // RÉMY, PHOTO DE SON CAHIER À L'APPUI : « Il faudrait plutôt le faire en
        // colonne. » La marche d'à côté demande les EXPOSANTS — c'est le
        // résultat écrit, et c'est juste. Mais le geste qui y mène, celui
        // qu'on fait au tableau et dans le cahier, est la POTENCE : on divise,
        // on pose le quotient, on recommence.
        //
        // LES DEUX RESTENT, DANS CET ORDRE. Poser la colonne est COMMENT on
        // trouve ; écrire 2³ × 3 × 5 est COMMENT on l'écrit. Une marche qui
        // donne le résultat sans le geste laisse l'élève sans méthode ; une
        // marche qui fait le geste sans l'écriture le laisse sans réponse.
        //
        // TROIS OU QUATRE FACTEURS : cinq feraient neuf cases à remplir sur un
        // pavé numérique, et la longueur deviendrait l'exercice.
        const n = choisir(A_POSER, rng);
        const facteurs = facteursPremiers(n);
        const etapes = [];
        let reste = n;
        for (const f of facteurs) { etapes.push(`${reste} ÷ ${f} = ${reste / f}`); reste /= f; }
        return {
            enonce: '',
            question: `Pose la décomposition de ${n} en colonne.`,
            papier: `Décompose ${n} en colonne, puis écris le produit de facteurs premiers.`,
            htmlReponse: potenceHtml(n, facteurs),
            // `cases` EST UNE DÉCLARATION QU'UNE ÉPREUVE CONFRONTE À L'ÉNONCÉ.
            //
            // J'avais commencé par le retirer, en écrivant que personne ne le
            // lisait : le pavé, lui, COMPTE les `[data-trou]` du HTML
            // (`activities/numeric.js`), et ma recherche n'avait regardé que
            // `js/`. Elle est lue dans `tests/` — « une réponse à plusieurs
            // nombres déclare ses cases » compare les trois : le nombre de
            // morceaux de la réponse, le nombre de trous du HTML, et ce champ.
            // Trois sources qui doivent dire la même chose, et une épreuve qui
            // rougit dès que l'une dérive. Le retirer n'enlevait pas une
            // redite : cela enlevait la vérification.
            kind: 'numeric', reponse: potenceReponse(n, facteurs),
            cases: facteurs.length * 2 - 1,
            pourquoi: `On divise, on pose le quotient, on recommence tant qu'on peut : `
                + `${etapes.join(' ; ')}. On s'arrête à 1. Les diviseurs de la colonne de `
                + `droite SONT la décomposition : ${n} = ${facteurs.join(' × ')}.`,
            aide: 'À CHAQUE LIGNE, LA MÊME QUESTION : quel est le plus petit nombre premier '
                + 'qui divise celui de gauche ? On l\'écrit à droite du trait, on pose le '
                + 'quotient en dessous, et l\'on recommence. ON S\'ARRÊTE QUAND ON TOMBE '
                + 'SUR 1 — et l\'on peut diviser PLUSIEURS FOIS par le même premier. Si le '
                + 'nombre de gauche est lui-même PREMIER, on le divise par lui-même : il '
                + 'descend à 1 et c\'est fini.'
        };
    }

    if (etape.id === 'decomposer' || etape.id === 'decomposer-petit') {
        const petit = etape.id === 'decomposer-petit';
        const n = choisir(petit ? A_DECOMPOSER_PETIT : A_DECOMPOSER, rng);
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
        // LES NOMBRES PREMIERS SONT DONNÉS dans l'écriture à remplir, et c'est
        // voulu : chercher QUELS premiers interviennent est le travail des deux
        // marches d'avant — `par-quoi` et `le-quotient`. Ici on compte combien
        // de fois chacun.
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

    // ── TEMPS C : PGCD ET PPCM ─────────────────────────────────────────────

    if (etape.id === 'pgcd-liste') {
        const [a, b] = choisir(COUPLES_A_LISTER, rng);
        const d = pgcd(a, b);
        const communs = diviseurs(a).filter(x => b % x === 0);
        return {
            // LE SENS AVANT LA TECHNIQUE. Les deux listes sont ÉCRITES : il n'y
            // a rien à décomposer, rien à multiplier. Reste la seule chose que
            // la marche enseigne — ce qu'est un diviseur COMMUN, et que le PGCD
            // est le plus grand d'entre eux. Un élève qui a fait cela deux fois
            // sait ce qu'il cherche quand la règle des exposants arrive.
            enonce: `Les diviseurs de ${a} sont ${diviseurs(a).join(', ')}. `
                + `Ceux de ${b} sont ${diviseurs(b).join(', ')}.`,
            question: `Quel est le PGCD de ${a} et ${b} ?`,
            kind: 'numeric', reponse: d, nombres: [a, b],
            pourquoi: `Les diviseurs COMMUNS aux deux sont ${communs.join(', ')}. Le plus grand `
                + `est ${d} : PGCD(${a} ; ${b}) = ${d}.`,
            aide: 'RIEN À DÉCOMPOSER ICI : les deux listes sont écrites. On souligne ce qui '
                + 'est dans LES DEUX, puis on garde le plus grand.'
        };
    }

    if (etape.id === 'ppcm-liste') {
        const [a, b] = choisir(COUPLES_A_MULTIPLIER, rng);
        const m = ppcm(a, b);
        // DEUX TERMES AU-DELÀ DU PPCM, et ce n'est pas un détail : si chaque
        // liste s'arrêtait PILE sur le PPCM, il serait le dernier des deux
        // lignes et se lirait sans rien chercher. On apprendrait à regarder la
        // fin d'une liste, pas à comparer deux listes.
        const multiples = (x) => {
            const out = [];
            for (let k = x; out.length < m / x + 2; k += x) out.push(k);
            return out;
        };
        return {
            enonce: `Les multiples de ${a} sont ${multiples(a).join(', ')}, etc. `
                + `Ceux de ${b} sont ${multiples(b).join(', ')}, etc.`,
            question: `Quel est le PPCM de ${a} et ${b} ?`,
            kind: 'numeric', reponse: m, nombres: [a, b],
            pourquoi: `${m} est dans les deux listes, et c'est le PREMIER qui y soit : `
                + `PPCM(${a} ; ${b}) = ${m}. ${2 * m} y est aussi, mais il est plus grand.`,
            aide: 'RIEN À DÉCOMPOSER ICI : on descend les deux listes en même temps et l\'on '
                + 's\'arrête au PREMIER nombre qu\'elles ont en commun.'
        };
    }

    if (etape.id === 'exposant') {
        const [a, b] = choisir(COUPLES_EXPOSANT, rng);
        const ga = facteursGroupes(a), gb = facteursGroupes(b);
        const candidats = ga.filter(x => {
            const y = gb.find(z => z.p === x.p);
            return y && y.e !== x.e;
        });
        const { p } = choisir(candidats, rng);
        const ea = ga.find(x => x.p === p).e;
        const eb = gb.find(x => x.p === p).e;
        const petit = Math.min(ea, eb), grand = Math.max(ea, eb);
        const ecrit = (e) => (e === 1 ? String(p) : `${p}${enExposant(e)}`);
        const pourPgcd = rng.int(0, 1) === 1;
        // LA MARCHE QUI FAIT LIRE LA RÈGLE AU LIEU DE L'APPLIQUER.
        //
        // Les deux marches suivantes demandent le PGCD et le PPCM de deux
        // décompositions données : il faut y choisir les facteurs, choisir les
        // exposants, ET multiplier. Trois gestes, dont un seul est le cours.
        // Celle-ci n'en demande qu'un — et c'est celui qui se trompe.
        //
        // ELLE PORTE LA COMPÉTENCE DE LA RÈGLE QU'ELLE FAIT LIRE, et non celle
        // déclarée dans ETAPES : un élève qui tient la règle du PGCD et rate
        // celle du PPCM doit le lire sur son bilan, pas voir une moyenne des
        // deux.
        return {
            enonce: `${a} = ${ecrireDecomposition(a)} et ${b} = ${ecrireDecomposition(b)}.`,
            question: `Pour calculer le ${pourPgcd ? 'PGCD' : 'PPCM'}, quel facteur `
                + `garde-t-on pour le nombre premier ${p} ?`,
            kind: 'choice', reponse: pourPgcd ? ecrit(petit) : ecrit(grand),
            choix: [ecrit(petit), ecrit(grand)],
            skill: pourPgcd ? S_PGCD : S_PPCM,
            nombres: [a, b],
            pourquoi: pourPgcd
                ? `Le PGCD doit DIVISER les deux nombres. ${ecrit(grand)} ne divise pas ${
                    ea < eb ? a : b}, qui ne contient que ${ecrit(petit)}. On garde donc le plus `
                    + `PETIT exposant : ${ecrit(petit)}.`
                : `Le PPCM doit être MULTIPLE des deux nombres. ${ecrit(petit)} ne suffit pas `
                    + `pour ${ea > eb ? a : b}, qui contient ${ecrit(grand)}. On garde donc le `
                    + `plus GRAND exposant : ${ecrit(grand)}.`,
            aide: 'LES DEUX RÈGLES SONT OPPOSÉES, et c\'est tout le chapitre. Le PGCD prend le '
                + 'plus PETIT exposant, parce qu\'il doit diviser les deux. Le PPCM prend le '
                + 'plus GRAND, parce qu\'il doit être multiple des deux.'
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
            // a ses marches à elle, dans le temps d'avant.
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
        // LA FRACTION DE L'ÉNONCÉ S'EMPILE ELLE AUSSI.
        //
        // RÉMY : « ecris toujours les fractions en colonne ». L'énoncé écrivait
        // « Rends la fraction 91/143 irréductible » À LA BARRE, pendant que la
        // réponse juste en dessous s'empilait, numérateur sur dénominateur. Le
        // même écran enseignait les deux écritures à la fois — et celle qu'on
        // lit en premier était la mauvaise.
        //
        // `text` ET `papier` GARDENT LA BARRE, et ce n'est pas un oubli : le
        // premier sert à la lecture à voix haute et aux comparaisons, le second
        // est empilé par le rendu de la feuille, qui sait reconnaître « a/b »
        // quand le générateur déclare `fractions: true`. Mettre du HTML dans
        // l'un ou l'autre y ferait apparaître des balises.
        const enColonne = (n, d) => '<span class="fraction frac-dans-texte">'
            + `<span class="fraction-num">${n}</span>`
            + `<span class="fraction-den">${d}</span></span>`;
        return {
            enonce: '', question: `Rends la fraction ${a}/${b} irréductible.`,
            questionHtml: `Rends la fraction ${enColonne(a, b)} irréductible.`,
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

    // ── TEMPS D : LES PETITS PROBLÈMES ─────────────────────────────────────

    if (etape.id === 'melange') {
        // LA MARCHE QUI MÉLANGE VRAIMENT LES TROIS, et sans elle la promesse de
        // l'exercice est fausse.
        //
        // VU SUR LA FEUILLE IMPRIMÉE : six problèmes de paquets à la file, puis
        // sept de rythmes, puis sept de carrés. C'est la mécanique des marches
        // qui le veut — `decoupeMarches` partage les questions DANS L'ORDRE de
        // la progression, et c'est exactement ce que Rémy avait demandé pour
        // les progressions. Mais ces trois-là n'en sont pas une : ce sont trois
        // HABILLAGES d'une même question, « partage-t-on, ou attend-on ? ».
        //
        // Groupées, elles enseignent à lire le titre du paragraphe : après deux
        // énoncés de paquets, on sait que le troisième est encore un PGCD sans
        // l'avoir lu — c'est-à-dire précisément ce que l'exercice existe pour
        // empêcher. Et c'est ce que son instruction au catalogue promettait
        // déjà : « ils sont MÉLANGÉS exprès ».
        //
        // LES TROIS RESTENT COCHABLES À PART : un professeur qui veut faire
        // travailler le seul problème des paquets doit pouvoir le demander.
        // C'est le mélange qui devient le défaut de l'exercice, pas le seul
        // choix possible.
        // ON TIRE D'ABORD, ON CHERCHE ENSUITE. Écrit
        // `ETAPES.find(e => e.id === choisir([…], rng))`, le tirage se refait
        // à CHAQUE élément parcouru : la comparaison portait sur un nom
        // différent à chaque tour et ne tombait presque jamais juste.
        // `find` rendait alors `undefined`, et six épreuves se sont arrêtées
        // sur « Cannot read properties of undefined ».
        const quoi = choisir(['paquets', 'ensemble', 'carre'], rng);
        const sous = ETAPES.find(e => e.id === quoi);
        return { ...question(sous, rng), skill: sous.skill };
    }

    //
    // ET LES NOMBRES Y SONT PETITS. Rémy : « bien trop difficile ». Ces trois
    // marches empilent trois difficultés — lire, CHOISIR la notion, calculer —
    // et sur 78 et 117 la troisième mangeait les deux autres. La notion EST la
    // difficulté ici ; l'arithmétique a ses sept marches à elle, juste avant.

    if (etape.id === 'paquets') {
        const h = choisir(PAQUETS, rng);
        const [a, b] = choisir(COUPLES_FACILES, rng);
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
        const [a, b] = choisir(COUPLES_RYTHME, rng);
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
    const [a, b] = choisir(COUPLES_FACILES, rng);
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

/** Le temps le plus facile vaut 1, le plus dur 3 — l'escalier en a quatre. */
const DIFFICULTE = { A: 1, B: 2, C: 2, D: 3 };

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
        // AUTANT DE BOUTONS QUE LA MARCHE EN PROPOSE, ET LE LIBELLÉ EST LA
        // VALEUR.
        //
        // Les deux étaient écrits en dur — `count: 2` et « Oui » / « Non » —
        // du temps où toute question fermée de ce fichier était un oui-non.
        // « Lequel de ces nombres divise 24 ? » en a quatre, et ils se
        // seraient tous affichés « Non » sauf un.
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c,
                label: c === 'oui' ? 'Oui' : c === 'non' ? 'Non' : String(c),
                correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.pgcd-ppcm',
            // LA MARCHE PEUT CHOISIR SA COMPÉTENCE. Une seule le fait —
            // `exposant`, qui fait lire tantôt la règle du PGCD, tantôt celle
            // du PPCM. Sans cela, la moitié de ses questions seraient comptées
            // sur la mauvaise des deux.
            skillId: q.skill || etape.skill,
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
                    // `questionHtml` QUAND LA MARCHE EN A UN : c'est le même
                    // texte, avec ses fractions empilées. `question` reste du
                    // texte nu pour `prompt.text` et pour le papier.
                    + `<span class="ap-question">${q.questionHtml || q.question}</span>`
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
                etape.temps === 'D'
                    ? 'Décompose les deux nombres, puis relis la phrase : partage-t-on, ou attend-on ?'
                    : etape.temps === 'A'
                        // LE DEUXIÈME INDICE DU TEMPS A NE PARLE PAS DE
                        // DÉCOMPOSITION : elle n'a pas encore été vue, et lui
                        // dire « écris les deux décompositions » le renverrait
                        // à une leçon qui n'existe pas pour lui.
                        ? 'Récite les tables : 2, 3, 4, 5… Le nombre y apparaît-il ?'
                        : 'Écris les deux décompositions l\'une sous l\'autre, facteur par facteur.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
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
