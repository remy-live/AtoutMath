// LE GÉNÉRATEUR DES DINGBATS — il choisit, il ne fabrique pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats, idéalement dans le thème
// mathématique mais dans les réglages on peut avoir le choix. Une centaine
// serait bien. Classe aussi par niveau. »
//
// ── IL NE GÉNÈRE RIEN, ET C'EST LA SEULE DÉCISION POSSIBLE ─────────────────
//
// Un dingbat est une TROUVAILLE. « RACINE dans un carré » ne se calcule pas :
// quelqu'un a vu que le mot et la forme se lisaient ensemble. Une machine qui
// combinerait au hasard un mot et une disposition produirait mille énigmes dont
// aucune ne voudrait rien dire — et l'élève apprendrait que ce jeu n'a pas de
// solution, ce qui est la pire chose qu'un exercice puisse enseigner.
//
// Les 109 énigmes sont donc écrites à la main dans `js/data/dingbats.js`. C'est
// la même décision que pour le Jardin, et pour une raison voisine : ce qui ne se
// calcule pas se compose.
//
// ── LES DEUX RÉGLAGES, ET POURQUOI CET ORDRE-LÀ ────────────────────────────
//
// LE THÈME EST UN CHOIX MULTIPLE, pas un menu. Rémy veut « le choix » : on doit
// pouvoir prendre les maths seules — le défaut —, la culture générale seule, ou
// les deux mélangées. Un menu à choix unique ne peut pas dire « les deux ».
//
// LES NIVEAUX SONT DES MARCHES À COCHER, la convention de la maison : trente-huit
// générateurs passent par `paramMarches`, et le professeur y règle aussi le
// PARTAGE des questions entre les marches cochées. « Classe aussi par niveau »
// ne demandait qu'un classement ; les marches donnent en plus la progression,
// gratuitement.
//
// ── CE QUI ARRIVE QUAND LE LOT EST VIDE ────────────────────────────────────
//
// Cocher « niveau 4 » et décocher les deux thèmes laisse zéro énigme. On ne
// retombe PAS en douce sur le lot complet : un réglage qui ne fait pas ce qu'il
// annonce est pire qu'un réglage absent. L'item le dit, et l'écran l'affiche.

import { makeItem } from '../items.js';
import { DINGBATS } from '../../data/dingbats.js';
import { THEMES, NIVEAUX, choisir, juste, indices, dessiner, attendues } from '../dingbat.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'voc.mathematique';

/** Les niveaux, dits comme des marches. L'identifiant est le RANG, pas le nom. */
const LISTE_MARCHES = NIVEAUX.map(n => ({ id: `n${n.id}`, nom: n.nom }));
const NIVEAU_DE = Object.fromEntries(NIVEAUX.map(n => [`n${n.id}`, n.id]));
const MOT = 'niveau';

export const dingbatGenerator = {
    id: 'jeu.dingbat',
    label: 'Dingbats',
    skills: [COMPETENCE],
    answerKinds: ['text'],

    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),

    params: [
        {
            id: 'themes', type: 'multiselect',
            label: 'Les thèmes proposés',
            // LE « ? » DIT CE QUE LE RÉGLAGE CHANGE, EN DEUX PHRASES, et une
            // épreuve du dépôt le garde à 200 caractères (`aidesReglages`).
            // Elle m'a repris ici, à 334 : j'y avais mis le POURQUOI, qui va
            // dans un commentaire — c'est-à-dire ici.
            //
            // CE QUE LE PROFESSEUR GAGNE À SAVOIR : les dingbats de
            // MATHÉMATIQUES enseignent quelque chose — « périmètre » veut dire
            // « la mesure autour », et l'énigme le montre. Ceux de culture
            // générale sont un jeu : ils apprennent à LIRE une disposition, ce
            // qui rend les autres accessibles. Mélanger les deux fait une
            // récréation ; garder les maths seules fait une leçon de
            // vocabulaire.
            aide: 'Maths seules, culture générale seule, ou les deux mélangées.',
            options: THEMES.map(t => ({ value: t.id, label: t.label })),
            // LE THÈME MATHÉMATIQUE EST LE DÉFAUT — « idéalement dans le thème
            // mathématique », dit Rémy. Le choix existe ; il n'est pas imposé.
            default: ['maths']
        },
        paramMarches({ marches: LISTE_MARCHES, mot: MOT })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        // « PAS RÉGLÉ » ET « VIDÉ EXPRÈS » NE SONT PAS LA MÊME CHOSE, et les
        // confondre faisait mentir le commentaire ci-dessus. Un réglage ABSENT
        // — l'exercice ouvert sans y toucher — prend le défaut, c'est-à-dire
        // les mathématiques. Une liste VIDE est un choix du professeur : il a
        // décoché les deux cases, et l'on ne lui sert pas autre chose en
        // silence. Mesuré : sans cette distinction, décocher tout rendait des
        // dingbats de maths, et le réglage paraissait cassé.
        const regle = params && params.themes;
        const themes = Array.isArray(regle) ? regle : ['maths'];

        // LA MARCHE VIENT DU RANG DE LA QUESTION : c'est ce qui fait monter
        // l'élève au fil de la série, dans les niveaux que le professeur a
        // cochés et selon le partage qu'il a tiré sur la barre.
        const cochees = marchesCochees(params, LISTE_MARCHES);
        const idMarche = marcheAuRang(ctx.index ?? 0, cochees, totalDe(ctx, params), params);
        const niveau = NIVEAU_DE[idMarche] || 1;

        // ON CHERCHE D'ABORD AU NIVEAU DEMANDÉ ; s'il n'y a rien là (un thème
        // seul peut ne rien avoir à ce niveau), on prend dans les niveaux
        // cochés, puis dans le thème entier. On ne sort JAMAIS des thèmes
        // choisis : le thème est le réglage que Rémy a demandé, le niveau n'est
        // qu'un rangement.
        const niveauxCoches = cochees.map(m => NIVEAU_DE[m.id]).filter(Boolean);
        const lot = premierLotNonVide([
            choisir(DINGBATS, { themes, niveaux: [niveau] }),
            choisir(DINGBATS, { themes, niveaux: niveauxCoches }),
            choisir(DINGBATS, { themes })
        ]);

        if (!lot.length) return itemVide(rng, themes);

        const d = lot[rng.int(0, lot.length - 1)];

        return makeItem({
            seed: rng.seed, generatorId: 'jeu.dingbat', skillId: COMPETENCE,
            answerKind: 'text',
            prompt: {
                text: 'Que lis-tu ?',
                html: `<div class="game-question">Que lis-tu ?</div>`
            },
            // LA RÉPONSE PRINCIPALE EST CELLE QU'ON ÉCRIT AU TABLEAU. Les
            // variantes sont acceptées par le juge, mais c'est celle-ci qu'on
            // montre à la correction et qui part au bilan.
            answer: d.reponse,
            reponsePapier: d.reponse,
            verifieTexte: (saisie) => (juste(saisie, d)
                ? { juste: true }
                : { juste: false }),
            hints: indices(d),
            explanation: d.explication,
            difficulty: d.niveau,
            meta: {
                dingbat: d,
                dessin: dessiner(d),
                // DEUX FAÇONS DE DIRE LE NIVEAU, ET IL FAUT LES DEUX.
                //
                // `niveau` est le NOMBRE — 1 à 4 —, qui sert à la feuille et au
                // bilan. `marche` est l'IDENTIFIANT de la marche cochée dans les
                // réglages, c'est-à-dire « n3 », et c'est le seul nom que la
                // frise sait lire. Je n'avais mis que le nombre, et l'épreuve
                // `progression` a déclaré les quatre marches « jamais jouées en
                // 16 questions » : elle cherchait « n1 » et trouvait « 1 ».
                //
                // ON LE PREND SUR L'ÉNIGME TIRÉE, pas sur la marche demandée :
                // quand un thème n'a rien au niveau voulu, le repli descend d'un
                // cran, et annoncer la marche demandée ferait mentir la frise
                // sur ce que l'élève a réellement joué.
                marche: `n${d.niveau}`,
                niveau: d.niveau,
                theme: d.theme,
                // TOUTES LES ÉCRITURES ACCEPTÉES voyagent avec l'item : l'écran
                // les montre à la correction, et l'élève qui avait « proba »
                // apprend que « probabilité » s'écrit en entier.
                acceptees: attendues(d),
                // LE CLAVIER DE CE JEU EST CELUI DU SYSTÈME : on répond en
                // français, pas en chiffres. Aucun pavé ne s'ouvre.
                saisieSeule: true
            }
        });
    }
};

/** Le premier lot non vide d'une liste de replis. */
function premierLotNonVide(lots) {
    for (const l of lots) if (l && l.length) return l;
    return [];
}

/**
 * CE QU'ON REND QUAND LE RÉGLAGE NE LAISSE RIEN.
 *
 * Décocher les deux thèmes est possible — l'écran des réglages ne l'interdit
 * pas — et il faut bien rendre quelque chose. On rend une question qui DIT le
 * problème au lieu d'afficher une boîte vide : c'est le professeur qui lit cet
 * écran-là, et c'est lui qui peut le réparer.
 */
function itemVide(rng, themes) {
    return makeItem({
        seed: rng.seed, generatorId: 'jeu.dingbat', skillId: COMPETENCE,
        answerKind: 'text',
        prompt: {
            text: 'Aucun dingbat ne correspond aux réglages.',
            html: `<div class="game-question">Aucun dingbat ne correspond aux réglages.</div>`
        },
        answer: '',
        verifieTexte: () => ({ juste: false }),
        hints: ['Ouvre les réglages de l\'exercice et coche au moins un thème.'],
        explanation: 'Les thèmes cochés étaient : '
            + (themes.length ? themes.join(', ') : 'aucun') + '.',
        difficulty: 1,
        meta: { vide: true, saisieSeule: true }
    });
}
