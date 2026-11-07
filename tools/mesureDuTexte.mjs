// MESURER CE QU'UN ÉLÈVE DOIT LIRE — les quatre fonctions, et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI UN MODULE À PART. `tools/cequilFautLire.mjs` MESURE EN S'EXÉCUTANT :
// il ouvre le catalogue et imprime un classement. On ne peut donc pas
// l'importer depuis une épreuve — l'importer, c'est le lancer.
//
// Or c'est exactement ce qu'il faut faire : une fois le catalogue ramené à
// zéro pavé, c'est une épreuve qui doit empêcher le prochain d'arriver, et
// elle doit compter EXACTEMENT comme l'outil. Deux comptes séparés dérivent,
// et le jour où ils diffèrent, c'est l'épreuve qui a tort sans le dire.
//
// Ces fonctions sont PURES : aucune n'ouvre quoi que ce soit.

import { aerer as aererTexte } from '../js/core/aideExercice.js';

/** Le texte nu : sans balise, sans dessin, sans espace en trop. */
export function nu(t) {
    return String(t == null ? '' : t)
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Combien de mots l'élève doit traverser. */
export function mots(t) {
    const s = nu(t);
    return s ? s.split(' ').length : 0;
}

// ── COMPTER LES MOTS NE SUFFIT PAS, ET CELA S'EST VU DÈS LA PREMIÈRE MESURE ─
//
// « Temps, Distance, Vitesse » sortait à 44 mots, tout en haut du classement.
// Lu : c'est une BONNE aide — une phrase, puis les trois formules sur trois
// lignes, puis une phrase. Un élève la traverse en diagonale. À côté, un pavé
// de trente mots d'un seul tenant se lit deux fois plus mal.
//
// CE QUI FATIGUE N'EST PAS LE TOTAL, C'EST LE PLUS LONG MORCEAU D'UN TRAIT.
// On coupe donc aux retours à la ligne et aux puces — ce que l'œil voit comme
// des respirations — et l'on garde le plus gros bloc. C'est lui que l'élève
// doit avaler sans reprendre son souffle.
/**
 * Le plus long bloc d'un seul tenant, en mots — APRÈS AÉRATION, c'est-à-dire
 * tel que la carte de retour l'affichera vraiment (`aerer`, dans le noyau,
 * appelée par js/ui/gameFeedbackUI.js). Mesurer le texte brut dirait le
 * contraire de ce que voit l'élève.
 */
export function pave(t) {
    return aererTexte(String(t == null ? '' : t))
        .replace(/<svg[\s\S]*?<\/svg>/gi, '\n')
        .replace(/<br\s*\/?>|<\/(p|li|div|h\d)>/gi, '\n')
        .split(/\n+|(?:^|\s)[·•—-]\s/)
        .reduce((max, bloc) => Math.max(max, mots(bloc)), 0);
}

/**
 * LA MÊME PHRASE, DEUX FOIS DANS LA MÊME AIDE. Ce n'est pas une longueur,
 * c'est un défaut : « Compter sur un solide » répétait « on peut vérifier :
 * sommets − arêtes + faces = 2, et cela vaut pour tous les solides de ce
 * genre » TROIS fois dans la même explication, parce qu'elle recolle les
 * explications de ses trois sous-questions.
 */
export function repetee(t) {
    const vues = new Map();
    for (const p of nu(t).split(/(?<=[.!?])\s+/)) {
        const clef = p.toLowerCase().replace(/\d+/g, '#').replace(/[^a-zà-ÿ# ]/g, '').trim();
        // ON N'ACCUSE PAS UNE PHRASE FAITE DE NOMBRES, et il a fallu TROIS
        // écritures pour poser la bonne règle. Le faux positif à écarter :
        // « 5/8 = 45/72 (× 9 en haut et en bas). 5/9 = 40/72 (× 8 en haut et
        // en bas). » — deux ÉTAPES différentes dont la part française est la
        // même, donc identiques une fois les chiffres effacés.
        //
        // LA DEUXIÈME ÉCRITURE COMPTAIT MAL : `clef.split(' ')` rend dix
        // éléments sur cette phrase-là, parce que chaque nombre effacé laisse
        // une chaîne vide qui compte pour un mot. On ne compte donc que ce qui
        // porte une lettre.
        //
        // ET LA TROISIÈME — « les mots doivent faire 60 % de la phrase » —
        // ÉTAIT UN PIÈGE : elle écartait aussi le vrai défaut, à deux dixièmes
        // de mot près. La phrase d'Euler de « Compter sur un solide », celle
        // que ce détecteur existe pour attraper, fait 16 mots français sur 27
        // jetons : 16 < 16,2, écartée. L'épreuve restait VERTE sur le défaut
        // remis (tools/epreuveTombe.mjs l'a dit ; je ne l'avais pas vu).
        //
        // LA LONGUEUR SUFFIT À LES SÉPARER, et elle ne dépend d'aucun calcul :
        // le faux positif fait 5 mots français (« en haut et en bas »), le vrai
        // en fait 16. Une phrase de moins de huit mots qui revient n'est pas un
        // pavé, c'est une tournure.
        const motsFr = clef.split(/\s+/).filter(m => /[a-zà-ÿ]/.test(m)).length;
        if (motsFr < 8) continue;
        vues.set(clef, (vues.get(clef) || 0) + 1);
    }
    let max = 0, laquelle = '';
    vues.forEach((n, clef) => { if (n > max) { max = n; laquelle = clef; } });
    return max > 1 ? { fois: max, phrase: laquelle } : null;
}
