// LE VOLUME DES SOLIDES — le générateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 16 novembre : « tu me fais les volumes ».
//
// C'ÉTAIT LE PLUS GROS TROU DU LOGICIEL — pas une compétence, pas un exercice,
// à aucun niveau. Le domaine entier (tirage, dessins cotés, énoncés, indices,
// leurres, explications) vit dans `js/core/volumes.js` ; ce fichier-ci ne fait
// que l'assembler, comme `generators/disque.js` le fait pour `core/disque.js`.
//
// ── UNE SEULE CHOSE SE DÉCIDE ICI : COMMENT ON RÉPOND ─────────────────────
//
// Au clavier de nombres, ou parmi quatre propositions. Le réglage est le même
// mot à mot que celui du disque, et pour la même raison : en contrôle on écrit
// un volume, on ne le reconnaît pas dans une liste — mais une classe qui
// découvre le chapitre a besoin des quatre propositions, parce que ce sont
// elles qui portent les fautes et leur explication.
//
// ── LA TOUCHE π N'APPARAÎT QUE LÀ OÙ ELLE SERT ────────────────────────────
//
// Cylindre, cône et boule donnent une valeur exacte — « 50π cm³ » — et le pavé
// porte alors sa touche π (`meta.pi`). Sur un pavé droit, elle laisserait
// croire qu'on attend un π dans la réponse. Payé une fois sur le disque.

import { makeItem, finalizeChoices } from '../items.js';
import { figure } from '../figures.js';
import {
    MARCHES_VOLUME, EXACTS_PI, DIFFICULTE_VOLUME, tirerVolume, enonceDe, reponseDe,
    uniteDe, reponseEcrite, dimensionsEcrites, enoncePapierDe, expliquer, indicesDe, leurresDe,
    figureVolumeSvg
} from '../volumes.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

// QUATRE COMPÉTENCES POUR SEPT SOLIDES — ce sont les quatre FORMULES, et
// c'est ce qu'un bilan doit dire. Voir `js/data/skills.js`.
const SKILL_DE = {
    pave: 'mes.volume.pave', cube: 'mes.volume.pave',
    prisme: 'mes.volume.prisme', cylindre: 'mes.volume.prisme',
    pyramide: 'mes.volume.pyramide', cone: 'mes.volume.pyramide',
    boule: 'mes.volume.boule'
};
const MOT = 'solide';

export const volumesGenerator = {
    id: 'mes.volumes',
    label: 'Le Volume des Solides',
    skills: [...new Set(Object.values(SKILL_DE))],
    answerKinds: ['numeric', 'choice'],
    // LA FICHE PAPIER DONNE LES DIMENSIONS EN TOUTES LETTRES, pas le dessin.
    //
    // « Un pavé droit mesure 12 cm de long, 2 cm de large et 5 cm de haut » est
    // une question de manuel parfaitement ordinaire, et elle a même un mérite
    // que le dessin n'a pas : l'élève doit se représenter le solide lui-même.
    //
    // ON AURAIT PU DESSINER LES SEPT SOLIDES EN PDF — c'est ce que fait
    // `printable: 'disque'` pour les cercles. On ne l'a pas fait aujourd'hui,
    // et il vaut mieux l'écrire que le laisser croire : redessiner la
    // perspective cavalière en jsPDF est un travail à part entière, et une
    // fiche à moitié dessinée serait pire qu'une fiche honnêtement écrite.
    // Si Rémy veut le dessin sur la feuille, c'est un rendu à ajouter dans
    // `js/ui/fiches/figures.js`, à côté de `disque`.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_VOLUME).length, 7),
    params: [
        paramMarches({ marches: MARCHES_VOLUME, mot: MOT }),
        {
            id: 'reponse', type: 'select', label: 'Réponse', parMarche: true,
            aide: 'Au clavier, l’élève ÉCRIT le volume, comme en contrôle. Les quatre '
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
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_VOLUME),
            totalDe(ctx, params), params, MARCHES_VOLUME.length);
        const t = tirerVolume(rng, id);

        const auChoix = valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        const exact = EXACTS_PI.includes(id);
        const juste = reponseDe(t);
        const unite = uniteDe(t);
        const etiquette = (v) => `${v} ${unite}`;

        const enonce = enonceDe(t);
        const figureSvg = figureVolumeSvg(t);

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.volumes',
            skillId: SKILL_DE[id],
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                // SUR LA FEUILLE, IL N'Y A PAS DE DESSIN : les dimensions
                // s'écrivent donc dans la question, sans quoi elle n'a aucune
                // réponse possible. C'est la faute qui est arrivée trois fois
                // le 20 octobre — un énoncé juste à l'écran, muet sur le
                // papier.
                papier: enoncePapierDe(t),
                html: `<div class="game-question vol-question">${enonce}</div>`
                    + figure(figureSvg, 'fig-volume')
            },
            answer: juste,
            reponsePapier: reponseEcrite(t),
            // ON PASSE PAR `finalizeChoices` ET NON PAR UN `slice(0, 3)`.
            //
            // Deux fautes du chapitre peuvent tomber sur le MÊME nombre — sur
            // un pavé, « j'ai additionné les trois longueurs » et « je n'en ai
            // multiplié que deux » se croisent pour certaines dimensions. Le
            // QCM proposait alors deux fois la même valeur, dont une marquée
            // fausse et l'autre aussi : l'élève y perd son latin, et rien ne
            // le signalait. `finalizeChoices` déduplique et complète à quatre.
            choices: auChoix ? finalizeChoices(rng, [
                { value: juste, label: etiquette(juste), correct: true },
                ...leurresDe(t).map(l => ({
                    value: l.value, label: etiquette(l.value), correct: false, why: l.why
                }))
            ], {
                count: 4,
                filler: (r) => {
                    // UN VOISIN PLAUSIBLE, et du même genre que la réponse :
                    // un nombre sans π à côté d'une réponse en π se repère
                    // sans calculer, et le QCM ne mesure plus rien.
                    const base = t.piK === null ? t.volume : t.piK;
                    const d = r.int(1, 4) * (r.int(0, 1) ? 1 : -1);
                    const v = Math.max(1, base + d * (base > 40 ? 10 : 1));
                    const s = t.piK === null ? String(v) : `${v}π`;
                    return { value: s, label: etiquette(s) };
                }
            }) : null,
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE_VOLUME[id] || 2,
            meta: {
                marche: id, titre: (MARCHES_VOLUME.find(m => m.id === id) || {}).nom,
                dims: t.dims, volume: t.volume, piK: t.piK, exact,
                dimensions: dimensionsEcrites(t),
                // LA TOUCHE π, SUR LES TROIS SOLIDES OÙ ELLE SERT. Voir
                // l'en-tête : ailleurs elle serait un piège.
                pi: !auChoix && exact,
                // CE QUI S'ÉCRIT À CÔTÉ DU PAVÉ : des centimètres CUBES.
                unit: unite,
                // ET CE QUI S'ÉCRIT SUR LA FIGURE : des centimètres tout court.
                // Un rayon de dix-huit centimètres cubes n'existe pas — c'est
                // la faute qui a coûté une relecture de fiche sur le disque, et
                // le chapitre des volumes travaille précisément à séparer les
                // deux.
                uniteLongueur: t.unite,
                // UN VOLUME EST ENTIER ICI : les dimensions sont choisies pour
                // cela (hauteurs multiples de trois, aire de base paire). Pas
                // de virgule au pavé, donc pas de touche virgule.
                decimal: false,
                figure: figureSvg,
                theme: `${id}-${Object.values(t.dims).join('-')}`
            }
        });
    }
};

export default volumesGenerator;
