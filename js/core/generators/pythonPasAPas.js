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
      skill: BLOC, difficulte: 5, ecrire: true }
];

const TEMPS = {
    A: 'A — afficher',
    B: 'B — les boîtes',
    C: 'C — choisir et répéter',
    D: 'D — le décalage, et les fautes',
    E: 'E — à toi de taper'
};

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({
    id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps
}));

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

export const pythonPasAPasGenerator = {
    id: 'algo.python',
    label: 'Python pas à pas',
    skills: [LIRE, MEMOIRE, BLOC],
    // SEULEMENT DES QCM, ET C'EST L'ORDRE DEMANDÉ : « des qcm ET APRÈS que
    // l'élève tape ». La saisie viendra avec l'éditeur, qui est une autre
    // activité — pas une autre réponse du même générateur.
    // DEUX GENRES DE RÉPONSE, ET DEUX ACTIVITÉS : les seize premières marches
    // sont des QCM qui passent par le pavé ; les cinq dernières demandent
    // d'ÉCRIRE, et c'est l'éditeur qui les prend. C'est le `answerKind` de
    // l'item qui décide, comme partout ailleurs dans le dépôt.
    answerKinds: ['choice', 'text'],
    // LA FEUILLE PORTE LE PROGRAMME, donc la question tient sur le papier :
    // c'est même le seul endroit où un élève sans tablette peut lire du
    // Python. On garde les espaces de décalage (voir `codePapier`), sans quoi
    // les marches 11 et 12 poseraient une question dont la réponse a disparu.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find((e) => e.id === id) || ETAPES[0];

        // ── LES MARCHES OÙ L'ON TAPE ─────────────────────────────────────
        if (etape.ecrire) {
            const e = FABRIQUES_ECRITURE[etape.id](rng);
            return makeItem({
                seed: rng.seed,
                generatorId: 'algo.python',
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
                    papier: (e.depart ? codePapier(e.depart) + '\n\n' : '')
                        + (e.consignePapier || e.consigne),
                    html: `<div class="game-question py-question">${e.consigne}</div>`
                },
                // LA RÉPONSE EST CE QUE LE PROGRAMME AFFICHE, pas le texte tapé.
                // Un élève qui écrit print('Bonjour') avec des apostrophes a
                // écrit un programme juste, et Python le lui dira. Comparer les
                // sources reviendrait à noter la façon d'écrire.
                answer: e.sortieAttendue,
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
                reponsePapier: e.solution.split('\n')
                    .map((l) => l.replace(/^ {4}/, '> ')).join(' / '),
                hints: e.indices,
                explanation: `Un programme qui marche :\n${e.solution}`,
                difficulty: etape.difficulte,
                meta: {
                    marche: etape.id, temps: etape.temps, titre: etape.titre,
                    depart: e.depart,
                    sortieAttendue: e.sortieAttendue,
                    entrees: e.entrees || null,
                    programme: e.solution
                }
            });
        }

        const f = (FABRIQUES[etape.id] || FABRIQUES.afficher)(rng);

        return makeItem({
            seed: rng.seed,
            generatorId: 'algo.python',
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
};

export default pythonPasAPasGenerator;
