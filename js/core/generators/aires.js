// L'AIRE DES FIGURES — le générateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre : « tu me fais […] les aires et préimètres ».
//
// CE QUI MANQUAIT EXACTEMENT : l'aire du rectangle existait, celle du disque
// aussi, et le triangle n'avait que son PÉRIMÈTRE. L'aire du triangle et celle
// du parallélogramme n'avaient ni compétence ni exercice — ce sont pourtant
// les deux formules de cinquième, et les deux seules où intervient une
// HAUTEUR.
//
// Le domaine entier vit dans `js/core/aires.js` ; ce fichier-ci l'assemble,
// comme `generators/volumes.js` le fait pour `core/volumes.js`.
//
// ── L'UNITÉ CHANGE AVEC LA QUESTION, ET C'EST LA LEÇON ────────────────────
//
// Des cm² pour une aire, des cm pour un périmètre. Le pavé l'affiche, et la
// quatrième marche tire l'une ou l'autre sur la MÊME figure : tant qu'un
// exercice ne demande qu'une des deux, l'élève applique la formule du jour
// sans jamais se demander laquelle.

import { makeItem, finalizeChoices } from '../items.js';
import { figure } from '../figures.js';
import { planAire } from '../planPapier.js';
import {
    MARCHES_AIRE, DIFFICULTE_AIRE, tirerAire, enonceDe, uniteDe,
    reponseEcrite, dimensionsEcrites, expliquer, indicesDe, leurresDe, figureAireSvg
} from '../aires.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL_DE = {
    rectangle: 'mes.aire.rectangle',
    triangle: 'mes.aire.triangle',
    parallelogramme: 'mes.aire.parallelogramme',
    ou: 'mes.aire.rectangle'
};
const MOT = 'figure';

export const airesGenerator = {
    id: 'mes.aires',
    label: 'L’Aire des Figures',
    skills: [...new Set(Object.values(SKILL_DE)), 'mes.perimetre.rectangle'],
    answerKinds: ['numeric', 'choice'],
    // LA FEUILLE DONNE LES DIMENSIONS EN TOUTES LETTRES — comme les volumes, et
    // pour la même raison : dessiner la hauteur et son angle droit en jsPDF est
    // un travail à part, et une fiche à moitié dessinée serait pire qu'une
    // fiche honnêtement écrite. « base 8 cm, hauteur 5 cm (côté oblique 7 cm) »
    // garde d'ailleurs le piège du chapitre, qui est tout ce qui compte ici.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_AIRE).length, 4),
    params: [
        paramMarches({ marches: MARCHES_AIRE, mot: MOT }),
        {
            id: 'reponse', type: 'select', label: 'Réponse', parMarche: true,
            aide: 'Au clavier, l’élève ÉCRIT l’aire, comme en contrôle. Les quatre '
                + 'propositions portent les fautes du chapitre et leur explication : mieux '
                + 'pour une première séance.',
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)', court: 'Clavier',
                    clavier: true },
                { value: 'choix', label: 'À choisir parmi quatre', court: '4' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_AIRE),
            totalDe(ctx, params), params, MARCHES_AIRE.length);
        const t = tirerAire(rng, id);

        const auChoix = valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        const unite = uniteDe(t);
        const etiquette = (v) => `${v} ${unite}`;
        const enonce = enonceDe(t);
        const figureSvg = figureAireSvg(t);
        // UNE QUESTION DE PÉRIMÈTRE N'EST PAS UNE QUESTION D'AIRE, même sur la
        // même figure : la compétence enregistrée doit le dire, sinon le bilan
        // range un périmètre raté sous « aire du rectangle ».
        const skill = t.quoi === 'perimetre' ? 'mes.perimetre.rectangle' : SKILL_DE[id];

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.aires',
            skillId: skill,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                // ── L'ÉNONCÉ PAPIER NE RÉCITE PLUS LES DIMENSIONS ─────────
                //
                // RÉMY : « et il faut la fiche pdf », puis « avec des shémas
                // évidemment ». La feuille écrivait « Calcule l'AIRE d'un
                // triangle : base 7 cm, hauteur 4 cm (côté oblique 5 cm) ».
                // C'était honnête tant qu'elle n'avait pas le dessin, et c'est
                // devenu NUISIBLE depuis qu'elle l'a : LA HAUTEUR EST TOUT LE
                // CHAPITRE, et un élève qui lit le mot « hauteur » suivi d'un
                // nombre ne peut plus se tromper de longueur. La faute que les
                // trois marches existent pour rendre visible redevenait
                // impossible, et la feuille mesurait autre chose que l'écran.
                papier: enonceDe(t),
                figure: planAire(t),
                html: `<div class="game-question air-question">${enonce}</div>`
                    + figure(figureSvg, 'fig-aire')
            },
            answer: String(t.reponse),
            reponsePapier: reponseEcrite(t),
            choices: auChoix ? finalizeChoices(rng, [
                { value: String(t.reponse), label: etiquette(t.reponse), correct: true },
                ...leurresDe(t).map(l => ({
                    value: l.value, label: l.label, correct: false, why: l.why
                }))
            ], {
                count: 4,
                // LE BOUCHE-TROU N'A PAS LE DROIT DE TOMBER SUR UNE FAUTE
                // QUI A UN NOM.
                //
                // Tiré au hasard autour de la réponse, il atterrissait parfois
                // pile sur l'autre grandeur — l'aire quand on demande le
                // périmètre — et s'affichait alors SANS explication, à côté
                // d'un leurre qui, lui, l'aurait expliquée. L'élève qui clique
                // dessus apprend qu'il s'est trompé et rien d'autre ; c'est
                // une occasion manquée, et une épreuve l'a attrapée.
                filler: (r) => {
                    const d = t.dims;
                    const nommees = new Set([
                        d.L * d.l, 2 * (d.L + d.l), d.L + d.l,
                        d.b * d.h, d.b * d.h / 2, d.b * d.oblique, d.b * d.oblique / 2,
                        ...Object.values(d)
                    ].filter(Number.isFinite));
                    let v = t.reponse;
                    for (let essai = 0; essai < 12 && (v === t.reponse || nommees.has(v));
                        essai++) {
                        const pas = r.int(1, 5) * (r.int(0, 1) ? 1 : -1);
                        v = Math.max(1, t.reponse + pas * (t.reponse > 40 ? 3 : 1));
                    }
                    return { value: String(v), label: etiquette(v) };
                }
            }) : null,
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE_AIRE[id] || 2,
            meta: {
                marche: id, quoi: t.quoi, dims: t.dims,
                dimensions: dimensionsEcrites(t),
                // CE QUI S'ÉCRIT À CÔTÉ DU PAVÉ — et c'est la leçon : des cm²
                // pour une surface, des cm pour un tour.
                unit: unite,
                // ET CE QUI S'ÉCRIT SUR LA FIGURE : des centimètres tout court.
                uniteLongueur: t.unite,
                decimal: false,
                figure: figureSvg,
                theme: `${id}-${Object.values(t.dims).join('-')}`
            }
        });
    }
};

export default airesGenerator;
