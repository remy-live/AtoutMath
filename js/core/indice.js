// L'INDICE CIBLÉ — souffler à un élève, sans arrêter la classe.
//
// Rémy : « la possibilité de […] envoyer un indice ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UN INDICE N'EST PAS UN MOT, ET C'EST TOUT LE PROPOS.
//
// Le mot du professeur prend l'écran : une fenêtre, un bouton « J'ai lu », et
// l'élève doit s'arrêter pour l'acquitter. C'est exactement ce qu'il faut pour
// « Arrêtez tout, on corrige au tableau ». C'est exactement ce qu'il ne faut
// pas pour « regarde la retenue » : on interromprait la pensée qu'on veut
// aider, et l'élève reviendrait à sa question en ayant perdu le fil.
//
// L'indice se pose donc À CÔTÉ de la question, discrètement, et il attend.
//
// ET IL NE DONNE PAS LA RÉPONSE. C'est la règle de fond, celle qui distingue
// aider de dépanner : un élève à qui l'on donne le résultat a fini sa
// question et n'a rien appris. Les indices tout prêts proposés ici sortent de
// la LEÇON de la compétence travaillée — ils disent comment s'y prendre,
// jamais ce qu'il faut écrire. Le professeur garde évidemment le droit d'écrire
// ce qu'il veut : c'est lui qui connaît son élève, et ce module lui fait gagner
// les vingt secondes qu'il n'a pas.
//
// Module pur : pas de DOM, pas de réseau. C'est ce qui permet de l'éprouver.

import { phrases } from './aideExercice.js';

/** Un indice doit se lire d'un coup d'œil, par-dessus une question. */
export const LONGUEUR_MAX = 180;

/**
 * TROIS COUPS DE POUCE QUI MARCHENT PARTOUT.
 *
 * Ils ne parlent d'aucune notion, et c'est pour cela qu'ils servent : les trois
 * quarts des blocages d'un cours de mathématiques ne sont pas des blocages de
 * mathématiques. L'élève n'a pas relu l'énoncé, il calcule de tête ce qui se
 * pose, ou il ne sait pas que l'aide existe.
 */
export const UNIVERSELS = [
    'Relis l\'énoncé à voix basse, jusqu\'au bout.',
    'Pose l\'opération sur ton cahier — de tête, on se trompe.',
    'Ouvre l\'aide (le « ? » en haut) : il y a un exemple fait en entier.'
];

/** Coupe proprement, sur un mot, et pose des points de suspension. */
export function raccourcir(texte, max = LONGUEUR_MAX) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const coupe = t.slice(0, max);
    const espace = coupe.lastIndexOf(' ');
    return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[,;:]$/, '') + '…';
}

/**
 * CE QU'ON PROPOSE AU PROFESSEUR, DANS L'ORDRE OÙ IL LE VOUDRA.
 *
 * D'abord ce qui parle de LA notion sur laquelle l'élève bute — tiré de la
 * leçon de la compétence, donc écrit une seule fois et jamais désynchronisé —
 * puis les trois coups de pouce universels.
 *
 * ON NE PROPOSE PAS LA LEÇON ENTIÈRE. Elle fait dix lignes ; posée sur une
 * question, elle recouvre le travail et ne se lit pas. On en prend les
 * premières phrases : une leçon bien écrite dit l'essentiel d'abord — c'est le
 * cas de celles-ci, elles commencent par la règle en capitales.
 *
 * @param {object|null} skill  la compétence travaillée (js/data/skills.js)
 * @param {number} combien     combien de phrases de leçon au plus
 */
export function indicesProposes(skill, combien = 3) {
    const sortis = [];
    const vus = new Set();
    const ajouter = (texte, source) => {
        const t = raccourcir(texte);
        if (!t || t.length < 12) return;
        const clef = t.toLowerCase();
        if (vus.has(clef)) return;
        vus.add(clef);
        sortis.push({ texte: t, source });
    };

    if (skill) {
        // Le descripteur d'abord : c'est la phrase la plus courte qui dise ce
        // qu'on fait. Puis la leçon, phrase par phrase.
        for (const p of phrases(skill.lesson || '').slice(0, combien)) ajouter(p, 'lecon');
        if (!sortis.length) ajouter(skill.descriptor || '', 'lecon');
    }
    for (const u of UNIVERSELS) ajouter(u, 'universel');
    return sortis;
}

/**
 * CE QU'ON ACCEPTE D'ENVOYER.
 *
 * Un indice vide ne s'envoie pas — le professeur croirait avoir aidé. Et l'on
 * borne la longueur ici plutôt qu'au moment de dessiner : un texte tronqué à
 * l'affichage part quand même en entier sur le réseau, dort en base, et
 * réapparaît entier le jour où quelqu'un le relit ailleurs.
 */
export function preparerIndice(texte) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (!t) return { ok: false, pourquoi: 'vide', texte: '' };
    return { ok: true, pourquoi: '', texte: raccourcir(t, 300) };
}
