// LA TRIGONOMÉTRIE QUI CALCULE — cinq marches, et la calculatrice ouverte.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// le disait depuis le 16 : « Trigonométrie (3ème) — on nomme, on ne calcule
// pas. Il manque ensuite tout : choisir entre cosinus, sinus et tangente,
// calculer une longueur, calculer un angle. »
//
// ── L'ORDRE DES MARCHES EST CELUI DES GESTES ──────────────────────────────
//
//   1. CHOISIR LE RAPPORT, sans rien calculer. C'est la décision qui porte
//      tout le chapitre, et la mélanger au calcul la rend invisible : un élève
//      qui se trompe de rapport ET qui pose bien son calcul obtient un nombre
//      faux sans savoir LAQUELLE des deux choses il a ratée.
//   2. CALCULER, LE CHERCHÉ EN HAUT — on multiplie.
//   3. CALCULER, LE CHERCHÉ EN BAS — on DIVISE. C'est le seul moment du
//      chapitre où le geste change, et il a sa marche.
//   4. LES DEUX AU HASARD : c'est là qu'on découvre si la différence est
//      comprise ou si l'on applique celle de la marche précédente.
//   5. CALCULER L'ANGLE, avec la touche « seconde » de la machine.
//
// Tout le tirage, le dessin et les diagnostics sont dans `core/trigoCalcul.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { figure } from '../figures.js';
import { FONCTIONS, sommetVise } from '../trigonometrie.js';
import {
    tirerCalcul, enonceDe, enonceChoix, expliquer, indicesDe, diagnosticsDe,
    triangleSvg, planTriangle
} from '../trigoCalcul.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const CHOISIR = 'geo.trigo.choisir';
const LONGUEUR = 'geo.trigo.longueur';
const ANGLE = 'geo.trigo.angle';

export const ETAPES = [
    { id: 'choisir', titre: 'Choisir le rapport — sans calculer',
      genre: 'melange', skill: CHOISIR, difficulte: 2 },
    { id: 'longueur-produit', titre: 'Une longueur, le cherché en HAUT (on multiplie)',
      genre: 'produit', skill: LONGUEUR, difficulte: 3 },
    { id: 'longueur-quotient', titre: 'Une longueur, le cherché en BAS (on divise)',
      genre: 'quotient', skill: LONGUEUR, difficulte: 4 },
    { id: 'longueur-melange', titre: 'Une longueur, les deux au hasard',
      genre: 'melange', skill: LONGUEUR, difficulte: 4 },
    { id: 'angle', titre: 'Calculer un angle (touche « seconde »)',
      genre: 'angle', skill: ANGLE, difficulte: 4 }
];

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}` }));

/** Pourquoi tel rapport ne convient pas — nommé côté par côté. */
function pourquoiPas(c, cle) {
    const f = FONCTIONS[cle];
    const A = sommetVise(c.t);
    return `${f.nom}(${A}) met en jeu ${c.roles[f.haut]} et ${c.roles[f.bas]}. `
        + `Or on te donne ${c.nomConnu} et l'on cherche ${c.nomCherche} : ce n'est `
        + 'pas le bon rapport.';
}

export const trigoCalculGenerator = {
    id: 'geo.trigo.calcul',
    label: 'Trigonométrie : la longueur et l’angle',
    skills: [CHOISIR, LONGUEUR, ANGLE],
    answerKinds: ['numeric', 'choice'],
    // `ecrit` RESTE FAUX : « calcule la longueur MP » ne veut rien dire sans la
    // figure — c'est elle qui dit quel côté est l'hypoténuse. C'est `printable`
    // qui ouvre la feuille, et elle, porte le dessin (voir `planTriangle`).
    ecrit: false,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const c = tirerCalcul(rng, { genre: etape.genre });
        const svg = triangleSvg(c);
        const A = sommetVise(c.t);

        if (etape.id === 'choisir') {
            const f = FONCTIONS[c.situation.fonction];
            const texte = enonceChoix(c);
            return makeItem({
                seed: rng.seed, generatorId: 'geo.trigo.calcul', skillId: CHOISIR,
                answerKind: 'choice',
                prompt: {
                    text: texte, papier: texte, figure: planTriangle(c),
                    html: `<div class="game-question tc-question">${texte}</div>`
                        + figure(svg, 'fig-trigo')
                },
                answer: f.cle,
                choices: finalizeChoices(rng, ['cos', 'sin', 'tan'].map(cle => ({
                    value: cle,
                    label: `${FONCTIONS[cle].nom}(${A}) = ${c.roles[FONCTIONS[cle].haut]}`
                        + ` / ${c.roles[FONCTIONS[cle].bas]}`,
                    correct: cle === f.cle,
                    why: cle === f.cle ? null : pourquoiPas(c, cle)
                })), { count: 3 }),
                hints: [
                    `Entoure au brouillon les DEUX côtés en jeu : ${c.nomConnu}, qu'on te `
                    + `donne, et ${c.nomCherche}, que tu cherches.`,
                    'Le rapport à écrire est celui qui porte ces deux côtés-là, et il n’y '
                    + 'en a qu’un : CAH · SOH · TOA.'
                ],
                explanation: `On connaît ${c.nomConnu} et l'on cherche ${c.nomCherche} : `
                    + `c'est ${f.libelle} (${f.memo}), donc ${f.nom}(${A}) = `
                    + `${c.roles[f.haut]} / ${c.roles[f.bas]}.`,
                difficulty: etape.difficulte,
                meta: { marche: etape.id, titre: etape.titre, figure: svg,
                    degres: c.degres, fonction: f.cle }
            });
        }

        const texte = enonceDe(c);
        return makeItem({
            seed: rng.seed, generatorId: 'geo.trigo.calcul', skillId: etape.skill,
            answerKind: 'numeric',
            prompt: {
                text: texte, papier: texte, figure: planTriangle(c),
                html: `<div class="game-question tc-question">${texte}</div>`
                    + figure(svg, 'fig-trigo')
            },
            answer: c.reponse,
            diagnostics: diagnosticsDe(c),
            hints: indicesDe(c),
            explanation: expliquer(c),
            difficulty: etape.difficulte,
            meta: {
                marche: etape.id, titre: etape.titre, figure: svg,
                degres: c.degres, genre: c.genre,
                // LE PAVÉ MONTRE L'UNITÉ, et ce n'est pas la même selon la
                // marche : des centimètres pour une longueur, un degré pour un
                // angle. Un élève qui lit « cm » sous une question d'angle
                // répond à une autre question.
                unit: c.unite,
                // ET LA VIRGULE N'EST AU CLAVIER QUE POUR LES LONGUEURS : un
                // angle s'arrondit au degré, donc il n'a pas de décimale.
                decimal: c.genre !== 'angle'
            }
        });
    }
};

export default trigoCalculGenerator;
