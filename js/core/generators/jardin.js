// LE JARDIN — un Rows Garden en français, avec des mots de maths au centre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// LA RÈGLE. Un champ d'hexagones. Chaque RANGÉE se lit de gauche à droite et
// porte DEUX réponses bout à bout — on ne dit pas où la première finit. Chaque
// FLEUR est la COURONNE des six hexagones qui entourent un hexagone coloré :
// elle porte un mot de six lettres lu dans le sens horaire, et l'on ne dit pas
// par quel pétale il commence. Les définitions des fleurs sont rangées PAR
// COULEUR et mélangées : trouver laquelle va où fait partie du jeu.
//
// ET LES COURONNES SE CHEVAUCHENT. Rémy, sur la première livraison : « pour les
// fleurs, tu as plutôt faux car ce sont les pétales communes qui créent des
// mots, c'est en rond en fait ». J'avais pavé le champ de fleurs DISJOINTES —
// chaque case dans une seule fleur. Dans son jeu, un hexagone blanc appartient
// à DEUX fleurs, et c'est ce qui les fait s'entraider : une lettre trouvée pour
// l'une sert aussitôt à l'autre.
//
// LA COULEUR EST DONC SUR LE CŒUR, PAS SUR LES PÉTALES, et c'est une
// conséquence mécanique de la correction : un pétale qui appartient à deux
// fleurs ne peut pas porter « la » couleur de sa fleur — il en aurait deux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE GÉNÉRATEUR NE GÉNÈRE RIEN, ET C'EST LA DÉCISION QUI TIENT TOUT.
//
// Un Strimko se tire en dix millisecondes, un Approxdoku en soixante : on les
// fabrique devant l'élève. Un jardin, MESURÉ avec les 786 mots du dépôt, demande
// de deux à quarante secondes — sur cette machine-ci, qui n'est pas une tablette
// de collège. On ne fait pas attendre une classe devant un écran blanc.
//
// Les jardins sont donc COMPOSÉS D'AVANCE par `tools/fabriquerJardins.mjs` et
// livrés dans `js/data/jardins.js`. C'est exactement ce que fait le magazine
// dont Rémy parle : un Rows Garden est composé, puis imprimé.
//
// POURQUOI IL EN A FALLU TANT DE MOTS. Chaque case appartient à une RANGÉE et
// à une ou deux FLEURS : une lettre est donc contrainte deux ou trois fois.
// Avec les 237 mots que le dépôt portait, la recherche EXHAUSTIVE ne trouvait
// AUCUN remplissage, même sur le plus petit jardin possible.
// `js/data/motsCourants.js` a porté le stock à 786, et le même jardin se
// remplit alors. Tout se remesure par `node tools/fabriquerJardins.mjs
// --mesurer`.
//
// L'ARRIVÉE EST EN MATHS, LE CHEMIN EST EN FRANÇAIS — la règle de la pyramide.
// Le fabricant exige qu'au moins la moitié des fleurs soient des mots de cours :
// une fleur est au centre du dessin, c'est elle qu'on retient.

import { makeItem } from '../items.js';
import { JARDINS } from '../../data/jardins.js';

/** Les trois couleurs de fleurs, dans l'ordre où les définitions se rangent. */
export const COULEURS = [
    { id: 'claire', label: 'Fleurs claires' },
    { id: 'moyenne', label: 'Fleurs moyennes' },
    { id: 'foncee', label: 'Fleurs foncées' }
];

/**
 * LES LETTRES DU JARDIN, PAR CASE — LES RANGÉES *ET* LES FLEURS.
 *
 * IL A FALLU LES DEUX, et la première version n'avait que les rangées. Elle
 * laissait quatre cases sans lettre sur vingt-huit : celles des rangées TROP
 * COURTES, qui ne portent pas de réponse — il n'existe pas de mot de deux
 * lettres, donc la rangée du haut et celle du bas n'ont pas d'indice et ne se
 * déduisent QUE par leur fleur.
 *
 * CE QUE ÇA COÛTAIT : `solution` était incomplète, et « Valider » comparait la
 * case de l'élève à `undefined`. Un jardin rempli JUSTE s'entendait répondre
 * qu'il était faux — le pire défaut possible pour un exercice.
 *
 * Trouvé par l'épreuve, pas par la sonde : la sonde terminait sur une mesure
 * vide de sens (elle cherchait un sélecteur qui existe toujours).
 */
export function lettresDuJardin(jardin) {
    const out = new Map();
    for (const rg of jardin.rangees) {
        const mot = rg.reponses.map(r => r.mot).join('');
        rg.cles.forEach((cle, i) => out.set(cle, mot[i]));
    }
    // Les fleurs complètent : un pétale hors rangée tient sa lettre de son mot,
    // lu dans le sens horaire depuis `depart`.
    for (const f of jardin.fleurs) {
        f.petales.forEach((cle, k) => {
            if (!out.has(cle)) out.set(cle, f.mot[(k - f.depart + 6) % 6]);
        });
    }
    return out;
}

/**
 * LES DÉFINITIONS DES FLEURS, RANGÉES PAR COULEUR ET MÉLANGÉES DEDANS.
 *
 * C'est la signature du jeu : on sait qu'une définition va sur une fleur
 * CLAIRE, pas laquelle. Si on les donnait dans l'ordre des fleurs, il ne
 * resterait qu'à écrire ; c'est le rangement par couleur qui demande de
 * croiser avec les rangées.
 */
export function definitionsParCouleur(jardin, rng) {
    return COULEURS.map(c => {
        const dedans = jardin.fleurs.filter(f => f.couleur === c.id);
        const melangees = rng ? rng.shuffle([...dedans]) : dedans;
        return { ...c, definitions: melangees.map(f => f.def) };
    }).filter(c => c.definitions.length);
}

/** Les rangées, nommées A, B, C… comme dans le jeu d'origine. */
export const nomDeRangee = (i) => String.fromCharCode(65 + i);

export const jardinGenerator = {
    id: 'jeu.jardin',
    skills: ['voc.mathematique'],
    answerKind: 'grid',
    params: [],

    generate(params, ctx) {
        const rng = ctx.rng;
        // ON TIRE AU SORT, ET C'EST LA SESSION QUI ÉVITE LES REPRISES.
        //
        // Il y avait ici `(rng.int(…) + ctx.index) % JARDINS.length`, sous un
        // commentaire affirmant qu'on ne reprenait pas deux fois le même jardin
        // dans une séance. C'ÉTAIT FAUX : chaque question tire une graine
        // neuve, donc `rng.int` repart de zéro et ajouter le rang ne décale
        // rien du tout. Deux questions de suite pouvaient tomber sur le même.
        //
        // Le dépôt a déjà ce qu'il faut — `session.clefDeQuestion`, écrite pour
        // la Table de Pythagore quand Rémy a signalé les répétitions. L'activité
        // la déclare sur l'identifiant du jardin ; ici, on tire simplement.
        const jardin = JARDINS[rng.int(0, JARDINS.length - 1)];

        return makeItem({
            seed: rng.seed,
            generatorId: 'jeu.jardin',
            skillId: 'voc.mathematique',
            answerKind: 'grid',
            prompt: {
                text: 'Remplis le jardin : chaque rangée porte deux réponses, chaque fleur un mot de six lettres.'
            },
            // LA RÉPONSE EST LE JARDIN ENTIER, case par case et dans l'ordre
            // de `cases` : c'est la seule forme qui ne laisse aucune case
            // dehors, quelle que soit la forme du champ (voir l'activité).
            answer: jardin.cases.map(c => lettresDuJardin(jardin).get(c)).join(''),
            hints: [
                'Commence par les RANGÉES : leurs deux définitions sont données dans '
                    + 'l\'ordre, de gauche à droite. Tu ne sais pas où la première réponse '
                    + 's\'arrête — mais tu connais le nombre total de cases.',
                'Une FLEUR se lit dans le sens horaire, et on ne dit pas par quel pétale. '
                    + 'Place d\'abord les lettres que les rangées te donnent : il ne restera '
                    + 'souvent qu\'une seule façon de poser le mot.'
            ],
            explanation: 'Les définitions des fleurs sont rangées par couleur, pas par '
                + 'position : savoir qu\'une définition va sur une fleur claire ne dit pas '
                + 'laquelle. Ce sont les rangées qui tranchent.',
            meta: {
                jardin,
                couleurs: definitionsParCouleur(jardin, rng),
                solution: lettresDuJardin(jardin)
            }
        });
    }
};
