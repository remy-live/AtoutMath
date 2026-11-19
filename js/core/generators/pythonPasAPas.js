// PYTHON PAS À PAS — treize marches pour apprendre à LIRE un programme.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « J'aimerai bien des exercices pour apprendre python.
// Tu peux utiliser des bibliothèques. L'idéal serait de faire des qcm et après
// que l'élève tape, l'aider sur l'indentation. Être hyper hyper hyper
// progressif. »
//
// ── L'ORDRE DES MARCHES EST CELUI DES CONFUSIONS, PAS CELUI D'UN COURS ───
//
// Un sommaire de manuel dirait : les variables, les conditions, les boucles.
// Ce serait un plan, pas une progression. L'ordre suivi ici est celui des
// choses qu'un débutant confond, séparées une par une :
//
//   1-3  print, et la question des GUILLEMETS. Trois marches qui se
//        ressemblent — un texte, un calcul, un calcul entre guillemets — et
//        qui séparent ce qu'un élève confondra toute l'année sinon ;
//   4-6  la variable : ranger, puis remplacer (le dernier gagne), puis
//        calculer avec ;
//   7    input, où ce que l'élève tape entre dans une boîte ;
//   8    le si, et une seule des deux branches ;
//   9-10 la boucle : combien de tours, et qu'elle commence à ZÉRO ;
//   11-12 L'INDENTATION, qui est la demande même de Rémy. D'abord la LIRE
//        (« quelles lignes sont dans la boucle ? »), puis deux programmes qui
//        ne diffèrent QUE par un décalage et ne font pas la même chose ;
//   13   trouver la faute — et les propositions sont les phrases du
//        vérificateur français, celles que l'élève relira à l'écran quand il
//        se mettra à taper.
//
// Le fichier ne fabrique rien : les programmes vivent dans
// `core/python/exercices.js`, leur mise en page dans `core/python/afficher.js`,
// et le jugement des fautes dans `core/python/diagnostic.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { FABRIQUES } from '../python/exercices.js';
import { FABRIQUES_ECRITURE } from '../python/ecrire.js';
import { codeHtml, codePapier } from '../python/afficher.js';
import { canoniqueSortie, lignesDeSortie } from '../python/sortie.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const LIRE = 'algo.python.lire';
const MEMOIRE = 'algo.python.variable';
const BLOC = 'algo.python.bloc';

export const ETAPES = [
    { id: 'afficher', temps: 'A', titre: 'Ce que « print » affiche',
      skill: LIRE, difficulte: 1 },
    { id: 'calcul', temps: 'A', titre: 'Python calcule tout seul',
      skill: LIRE, difficulte: 1 },
    { id: 'texte-ou-calcul', temps: 'A', titre: 'Les guillemets empêchent le calcul',
      skill: LIRE, difficulte: 2 },
    { id: 'variable', temps: 'B', titre: 'Ranger un nombre dans une boîte',
      skill: MEMOIRE, difficulte: 1 },
    { id: 'ordre', temps: 'B', titre: 'Deux rangements : le dernier gagne',
      skill: MEMOIRE, difficulte: 2 },
    { id: 'calcul-variable', temps: 'B', titre: 'Calculer avec deux boîtes',
      skill: MEMOIRE, difficulte: 2 },
    { id: 'saisie', temps: 'B', titre: 'Ce que l’élève tape entre dans la boîte',
      skill: MEMOIRE, difficulte: 3 },
    { id: 'si-alors', temps: 'C', titre: 'Si … sinon : une seule des deux branches',
      skill: BLOC, difficulte: 2 },
    { id: 'sinon-si', temps: 'C', titre: 'Sinon si : on s’arrête à la PREMIÈRE vraie',
      skill: BLOC, difficulte: 3 },
    { id: 'combien-de-tours', temps: 'C', titre: 'Combien de fois la boucle tourne',
      skill: BLOC, difficulte: 2 },
    { id: 'de-zero', temps: 'C', titre: 'Une boucle commence à ZÉRO',
      skill: BLOC, difficulte: 3 },
    { id: 'tant-que', temps: 'C', titre: 'Tant que : on ne sait pas d’avance combien de tours',
      skill: BLOC, difficulte: 3 },
    { id: 'sans-fin', temps: 'C', titre: 'La boucle qui ne s’arrête jamais',
      skill: BLOC, difficulte: 4 },
    { id: 'dans-la-boucle', temps: 'D', titre: 'Quelles lignes sont DANS la boucle ?',
      skill: BLOC, difficulte: 3 },
    { id: 'deux-programmes', temps: 'D', titre: 'Quatre espaces changent tout',
      skill: BLOC, difficulte: 4 },
    { id: 'la-faute', temps: 'D', titre: 'Trouver la faute',
      skill: BLOC, difficulte: 4 },

    // ── ET MAINTENANT L'ÉLÈVE TAPE ───────────────────────────────────────
    //
    // RÉMY, 18 novembre : « des qcm et APRÈS que l'élève tape ». Deux temps,
    // dans cet ordre, et c'est ici que le second commence. Ce qui monte d'une
    // marche à l'autre n'est pas la difficulté du concept — tous ont été vus
    // dans les seize QCM — c'est la QUANTITÉ À PRODUIRE : un mot, une ligne,
    // le décalage seul, deux lignes, un programme.
    { id: 'un-mot', temps: 'E', titre: 'Taper un mot dans le trou',
      skill: LIRE, difficulte: 2, ecrire: true },
    { id: 'une-ligne', temps: 'E', titre: 'Écrire la dernière ligne',
      skill: MEMOIRE, difficulte: 3, ecrire: true },
    { id: 'le-decalage', temps: 'E', titre: 'Poser le décalage, et rien d’autre',
      skill: BLOC, difficulte: 3, ecrire: true },
    { id: 'deux-lignes', temps: 'E', titre: 'Écrire deux lignes',
      skill: MEMOIRE, difficulte: 4, ecrire: true },
    { id: 'petit-programme', temps: 'E', titre: 'Écrire un petit programme',
      skill: BLOC, difficulte: 5, ecrire: true },

    // ── ET L'AUTRE SENS : LIRE UN PROGRAMME ET ÉCRIRE CE QU'IL AFFICHE ───
    //
    // RÉMY, 19 novembre, capture à l'appui. L'éditeur lui avait posé, par
    // erreur, une question de QCM — « Que va afficher ce programme ? » — et il
    // a TAPÉ la réponse, ligne par ligne, au lieu de la chercher parmi quatre :
    // « ça devrait être bon ».
    //
    // Il avait raison, et c'est un meilleur exercice que le QCM : au brevet on
    // ne donne pas quatre sorties au choix, on demande d'écrire ce que le
    // programme affiche. Choisir, c'est reconnaître ; écrire, c'est dérouler
    // la boucle dans sa tête, tour par tour.
    //
    // ON NE LANCE RIEN ICI. Ce que l'élève tape n'est pas un programme, c'est
    // une RÉPONSE : on la compare au texte attendu. L'exécuter reviendrait à
    // ce qui est arrivé à Rémy — ses cinq nombres posés chacun sur sa ligne
    // formaient du Python valide qui n'affiche rien, et le logiciel a comparé
    // ce vide à la bonne réponse. Il a répondu « faux » à une réponse juste.
    { id: 'sortie-deux-lignes', temps: 'F', titre: 'Écrire ce que deux lignes affichent',
      skill: LIRE, difficulte: 2, ecrire: true, genre: 'sortie' },
    { id: 'sortie-boucle', temps: 'F', titre: 'Dérouler une boucle « for »',
      skill: BLOC, difficulte: 3, ecrire: true, genre: 'sortie' },
    { id: 'sortie-tant-que', temps: 'F', titre: 'Dérouler un « while »',
      skill: BLOC, difficulte: 4, ecrire: true, genre: 'sortie' },

    // ── LES FONCTIONS, PUIS LE DESSIN ───────────────────────────────────
    //
    // RÉMY, 19 novembre : « aussi des fonctions et du dessin », puis « des
    // petits jeux simples c'est toujours motivant ».
    //
    // LE JEU EST LE DESSIN LUI-MÊME : un modèle est tracé à côté, et il faut
    // écrire le programme qui le refait. On voit tout de suite si l'on a
    // gagné, sans lire une phrase. Et c'est là que la fonction cesse d'être
    // une formalité : `carre(80)` puis `carre(120)` dessinent deux carrés
    // avec UNE seule définition, ce qu'aucun exercice de calcul ne montre
    // aussi vite.
    { id: 'fonction-appel', temps: 'G', titre: 'Appeler une fonction déjà écrite',
      skill: MEMOIRE, difficulte: 3, ecrire: true },
    { id: 'fonction-retour', temps: 'G', titre: 'Écrire le « return »',
      skill: MEMOIRE, difficulte: 4, ecrire: true },
    { id: 'fonction-ecrire', temps: 'G', titre: 'Écrire une fonction à deux paramètres',
      skill: MEMOIRE, difficulte: 5, ecrire: true },
    { id: 'dessin-trait', temps: 'H', titre: 'Un trait',
      skill: LIRE, difficulte: 2, ecrire: true, genre: 'dessin' },
    { id: 'dessin-angle', temps: 'H', titre: 'Un trait, un quart de tour, un trait',
      skill: LIRE, difficulte: 3, ecrire: true, genre: 'dessin' },
    { id: 'dessin-carre', temps: 'H', titre: 'Un carré, avec une boucle',
      skill: BLOC, difficulte: 3, ecrire: true, genre: 'dessin' },
    { id: 'dessin-polygone', temps: 'H', titre: 'Un polygone régulier',
      skill: BLOC, difficulte: 4, ecrire: true, genre: 'dessin' },
    { id: 'dessin-fonction', temps: 'H', titre: 'Une fonction qui dessine',
      skill: BLOC, difficulte: 5, ecrire: true, genre: 'dessin' }
];

const TEMPS = {
    A: 'A — afficher',
    B: 'B — les boîtes',
    C: 'C — choisir et répéter',
    D: 'D — le décalage, et les fautes',
    E: 'E — à toi de taper',
    F: 'F — écrire ce que ça affiche',
    G: 'G — les fonctions',
    H: 'H — dessiner avec la tortue'
};

const MOT = 'marche';

// ── DEUX LISTES, ET C'EST UNE CORRECTION PAYÉE SUR UNE CAPTURE DE RÉMY ────
//
// Rémy, 19 novembre au soir, photo à l'appui : « je ne comprends pas ce que tu
// demandes ». L'ÉDITEUR lui affichait « Que va afficher ce programme ? » au-
// dessus d'un champ de saisie et de deux boutons de décalage. La question est
// celle d'un QCM ; l'activité est celle où l'on tape. Aucune des deux n'avait
// tort : elles n'auraient jamais dû se rencontrer.
//
// LA CAUSE : un seul générateur déclarait les vingt-et-une marches, et DEUX
// exercices s'en servaient avec deux activités différentes. Le panneau de
// réglages de « à Toi de Taper » proposait donc les seize marches de QCM,
// qu'il ne sait pas servir — et celui de « Pas à Pas » proposait les cinq
// marches d'écriture, que le pavé à choix ne sait pas servir non plus.
// Mesuré dans les deux sens.
//
// Les deux exercices ont maintenant CHACUN LEUR GÉNÉRATEUR, donc chacun sa
// liste de marches : le panneau ne peut plus proposer ce que l'activité ne
// peut pas prendre. C'est la même raison que `generators/oppose.js`, où deux
// générateurs servent deux activités d'un même sujet.
const nommer = (etapes) => etapes.map((e, i) => ({
    id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps
}));
const ETAPES_QCM = ETAPES.filter((e) => !e.ecrire);
const ETAPES_ECRITURE = ETAPES.filter((e) => e.ecrire);
const MARCHES_QCM = nommer(ETAPES_QCM);
const MARCHES_ECRITURE = nommer(ETAPES_ECRITURE);
const TEMPS_QCM = { A: TEMPS.A, B: TEMPS.B, C: TEMPS.C, D: TEMPS.D };
const TEMPS_ECRITURE = { E: TEMPS.E, F: TEMPS.F, G: TEMPS.G, H: TEMPS.H };

/**
 * Le HTML de l'énoncé : le ou les programmes, puis la question.
 *
 * LE PROGRAMME VIENT AVANT LA QUESTION, et c'est une décision. On lit d'abord
 * le code, on se demande ensuite ce qu'on en veut — l'inverse fait chercher la
 * réponse dans le texte de la question au lieu du programme.
 */
function enonceHtml(f) {
    // ON NE SURLIGNE RIEN DANS L'ÉNONCÉ, ET C'EST UNE CORRECTION PAYÉE SUR
    // UNE PHOTO D'ÉCRAN.
    //
    // Le premier jet passait `montrer` à `codeHtml` : la marche « quelles
    // lignes sont RÉPÉTÉES par la boucle ? » s'affichait avec les lignes 2 et
    // 3 déjà peintes en violet. La question donnait sa réponse. Ni les
    // épreuves ni la sonde ne pouvaient le voir — toutes deux vérifiaient que
    // le programme était là, pas qu'il ne répondait pas à sa propre question.
    // Il a fallu REGARDER l'image.
    //
    // `codeHtml` garde l'option : elle servira à désigner la ligne fautive
    // dans l'éditeur, où montrer la ligne EST l'aide demandée. Ici, c'est le
    // contraire d'une aide.
    const blocs = f.sources
        ? f.sources.map((s, k) => '<div class="py-paire">'
            + `<div class="py-paire-nom">Programme ${f.noms[k]}</div>`
            + codeHtml(s) + '</div>').join('')
        : codeHtml(f.source);
    return (f.sources ? `<div class="py-deux">${blocs}</div>` : blocs)
        + `<div class="game-question py-question">${f.question}</div>`;
}

/** Le même énoncé pour la feuille imprimée, qui n'a ni couleur ni filet. */
function enoncePapier(f) {
    const blocs = f.sources
        ? f.sources.map((s, k) => `Programme ${f.noms[k]} :\n${codePapier(s)}`).join('\n\n')
        : codePapier(f.source);
    return `${blocs}\n\n${f.question}`;
}

/**
 * CHOISIR LA MARCHE, DANS SA PROPRE LISTE.
 *
 * `etapes` est celle du générateur qui appelle — jamais les vingt-et-une.
 * C'est ce qui rend impossible la rencontre qui a fait écrire à Rémy « je ne
 * comprends pas ce que tu demandes » : une question de QCM dans l'éditeur.
 */
function choisirLaMarche(etapes, marches, params, ctx) {
    const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, marches),
        totalDe(ctx, params), params);
    return etapes.find((e) => e.id === id) || etapes[0];
}

/** Une marche où l'élève TAPE : l'item part vers l'éditeur. */
function itemEcriture(etape, rng, generatorId) {
    const e = FABRIQUES_ECRITURE[etape.id](rng);
    return makeItem({
        seed: rng.seed,
        generatorId,
        skillId: etape.skill,
        answerKind: 'text',
        prompt: {
            text: e.consigne,
            // LA FEUILLE IMPRIMÉE PORTE LE PROGRAMME DE DÉPART et la
            // consigne : un élève sans tablette écrit son programme à
            // la main, ce qui est exactement ce qu'on lui demandera au
            // brevet. Le décalage s'y dessine (voir `codePapier`).
            // `consignePapier` QUAND IL Y EN A UNE : la marche du
            // décalage parle de deux boutons à l'écran, et le papier
            // n'en a pas (voir `python/ecrire.js`).
            papier: ((e.programme || e.depart)
                ? codePapier(e.programme || e.depart) + '\n\n' : '')
                + (e.consignePapier || e.consigne),
            // LE PROGRAMME À LIRE EST DANS L'ÉNONCÉ, pas dans le champ :
            // c'est toute la différence entre « écris ce programme » et
            // « écris ce que CE programme affiche ».
            html: (e.programme ? codeHtml(e.programme) : '')
                + `<div class="game-question py-question">${e.consigne}</div>`
        },
        // LA RÉPONSE EST CE QUE LE PROGRAMME AFFICHE, pas le texte tapé.
        // Un élève qui écrit print('Bonjour') avec des apostrophes a
        // écrit un programme juste, et Python le lui dira. Comparer les
        // sources reviendrait à noter la façon d'écrire.
        //
        // ET ON LA DONNE SOUS SA FORME CANONIQUE — lignes séparées par
        // « / ». MESURÉ : le comparateur du noyau retire les blancs quand
        // ce qui reste est un nombre (la règle « 62 307 = 62307 »), ce qui
        // ramène « 1\n2\n3 » à « 123 » et déclare JUSTE une sortie écrite
        // tout sur une ligne. Voir `python/sortie.js`.
        // ── TROIS GENRES, TROIS RÉPONSES ────────────────────────────────
        //
        // · « dessin » : C'EST L'ACTIVITÉ QUI JUGE, en comparant la figure de
        //   l'élève au modèle (voir `python/dessin.js`). Le meneur, lui, a
        //   besoin d'une réponse à comparer : on lui donne un JETON propre à
        //   cette question, que l'activité renvoie quand la figure est la
        //   bonne et jamais autrement. C'est le motif que le noyau prévoit —
        //   « ce qui juge n'est pas toujours ce qui se lit », voir
        //   `itemSession.submit` — et `dire` porte la version lisible.
        // · les deux autres : la sortie, sous sa forme canonique.
        answer: e.genre === 'dessin'
            ? `figure/${etape.id}/${rng.seed}`
            : canoniqueSortie(e.sortieAttendue),
        // ── SUR LE PAPIER, LA RÉPONSE EST LE PROGRAMME ───────────
        //
        // À l'écran, la réponse est ce que le programme AFFICHE : on
        // ne note pas la façon d'écrire. Sur la feuille de solutions,
        // c'est l'inverse qu'il faut — Rémy corrige des copies.
        //
        // VU SUR LA FEUILLE, ET NULLE PART AILLEURS : la question 1
        // demandait d'écrire `print("Coucou")` et la solution disait
        // « Coucou ». Le professeur lisait le résultat sans savoir ce
        // qu'il fallait écrire. Pire, `0\n1\n2\n3` s'imprimait
        // « 0 123 », parce que les sauts de ligne disparaissent dans
        // une colonne de solutions.
        // Les sauts de ligne DISPARAISSENT dans une colonne de
        // solutions — mesuré : `0\n1\n2\n3` s'imprimait « 0 123 ».
        // On sépare donc les lignes à la main, et l'on garde le CRAN
        // visible : sans lui, la solution de la marche « le décalage »
        // ne montrerait plus ce qu'on y corrige.
        reponsePapier: (e.solution ? e.solution.trimEnd().split('\n')
            .map((l) => l.replace(/^ {4}/, '> '))
            : lignesDeSortie(e.sortieAttendue)).join(' / '),
        hints: e.indices,
        // DEUX EXPLICATIONS, parce qu'il y a deux exercices : montrer un
        // programme qui marche là où il fallait en écrire un, montrer la
        // sortie là où il fallait la prédire.
        explanation: e.genre === 'sortie'
            ? `Ce programme affiche :\n${e.sortieAttendue.trimEnd()}`
            : `Un programme qui marche :\n${e.solution}`,
        difficulty: etape.difficulte,
        meta: {
            marche: etape.id, temps: etape.temps, titre: etape.titre,
            // `genre` DIT À L'ÉDITEUR CE QU'IL TIENT : un programme à écrire,
            // ou une réponse à comparer. Sans lui, il lancerait la réponse de
            // l'élève comme du Python — ce qui est exactement ce qui a fait
            // répondre « faux » à la bonne réponse de Rémy, le 19 novembre.
            genre: e.genre || 'programme',
            // LE PROGRAMME DU MODÈLE VOYAGE AVEC L'ITEM : l'activité le fait
            // tourner dans le bac à sable pour DESSINER le modèle. Le
            // générateur, lui, ne peut pas dessiner — il n'a pas de
            // navigateur sous la main, et c'est très bien ainsi.
            solution: e.solution,
            depart: e.depart,
            sortieAttendue: e.sortieAttendue,
            entrees: e.entrees || null,
            programme: e.programme || e.solution
        }
    });
}

/** Une marche à choix : l'item part vers le pavé de propositions. */
function itemQcm(etape, rng, generatorId) {
    const f = (FABRIQUES[etape.id] || FABRIQUES.afficher)(rng);

    return makeItem({
        seed: rng.seed,
        generatorId,
        skillId: etape.skill,
        answerKind: 'choice',
        prompt: {
            text: f.question,
            papier: enoncePapier(f),
            html: enonceHtml(f)
        },
        answer: f.reponse,
        choices: finalizeChoices(rng, [
            { value: f.reponse, label: f.reponse, correct: true },
            ...f.leurres.map((l) => ({
                value: l.value, label: l.value, correct: false, why: l.why
            }))
        ], { count: 4 }),
        hints: f.indices,
        explanation: f.explication,
        difficulty: etape.difficulte,
        meta: {
            marche: etape.id, temps: etape.temps, titre: etape.titre,
            // LE PROGRAMME VOYAGE AVEC L'ITEM : le bilan doit pouvoir
            // montrer ce que l'élève avait sous les yeux quand il s'est
            // trompé. « Il bute sur la marche 11 » ne dit rien ; « il a
            // répondu les lignes 2, 3 et 4 sur CE programme » dit tout.
            programme: f.sources ? f.sources.join('\n---\n') : f.source
        }
    });
}

// ── LES SEIZE MARCHES À CHOIX ────────────────────────────────────────────
export const pythonPasAPasGenerator = {
    id: 'algo.python',
    label: 'Python pas à pas',
    skills: [LIRE, MEMOIRE, BLOC],
    // SEULEMENT DES QCM, ET C'EST L'ORDRE DEMANDÉ : « des qcm ET APRÈS que
    // l'élève tape ». La saisie est l'affaire de l'autre générateur, juste en
    // dessous — pas une autre réponse de celui-ci.
    answerKinds: ['choice'],
    // LA FEUILLE PORTE LE PROGRAMME, donc la question tient sur le papier :
    // c'est même le seul endroit où un élève sans tablette peut lire du
    // Python. On garde les espaces de décalage (voir `codePapier`), sans quoi
    // les marches 11 et 12 poseraient une question dont la réponse a disparu.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_QCM).length),
    params: [paramMarches({ marches: MARCHES_QCM, groupes: TEMPS_QCM, mot: MOT })],

    generate(params, ctx) {
        return itemQcm(choisirLaMarche(ETAPES_QCM, MARCHES_QCM, params, ctx),
            ctx.rng, 'algo.python');
    }
};

// ── LES CINQ MARCHES OÙ L'ON TAPE ────────────────────────────────────────
//
// UN GÉNÉRATEUR À PART, et c'est la correction du 19 novembre au soir. Il ne
// connaît que ses cinq marches : son panneau de réglages ne peut donc plus
// proposer une question à choix à l'éditeur, qui ne sait pas la servir.
export const pythonEcrireGenerator = {
    id: 'algo.python.ecrire',
    label: 'Python : à toi de taper',
    skills: [LIRE, MEMOIRE, BLOC],
    answerKinds: ['text'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_ECRITURE).length),
    params: [paramMarches({ marches: MARCHES_ECRITURE, groupes: TEMPS_ECRITURE, mot: MOT })],

    generate(params, ctx) {
        return itemEcriture(choisirLaMarche(ETAPES_ECRITURE, MARCHES_ECRITURE, params, ctx),
            ctx.rng, 'algo.python.ecrire');
    }
};

export default pythonPasAPasGenerator;
