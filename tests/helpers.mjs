// Utilitaires de test.
//
// Les modules du noyau sont écrits pour le navigateur mais ne dépendent du DOM
// que par `document.dispatchEvent`. On fournit ici le strict minimum pour les
// charger sous Node, ce qui permet de tester les fonctions pures sans
// navigateur ni outil de build.

import fs from 'node:fs';

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        addEventListener() { },
        dispatchEvent() { return true; },
        getElementById() { return null; },
        querySelectorAll() { return []; },
        createElement() { return { style: {}, classList: { add() { }, remove() { }, toggle() { } }, appendChild() { } }; }
    };
}
if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    };
}
if (typeof globalThis.window === 'undefined') {
    globalThis.window = { addEventListener() { }, location: { origin: '', pathname: '' } };
}

let counter = 0;

/** Fabrique un événement de tentative, avec des valeurs par défaut sensées. */
export function attempt(overrides = {}) {
    counter++;
    return {
        id: `ev_${counter}`,
        type: 'attempt',
        ts: overrides.ts ?? Date.now(),
        profileId: 'p_test',
        deviceId: 'd_test',
        payload: {
            runId: 'run_1',
            stepId: 's1',
            exerciseId: 'calc-mult-flash',
            exerciseTitle: 'Flash Mult',
            skillId: 'num.mult.table.7',
            itemSeed: `seed_${counter}`,
            questionText: '7 × 8',
            given: '56',
            expected: 56,
            correct: true,
            attemptIndex: 0,
            msElapsed: 2000,
            hintsUsed: 0,
            points: 10,
            ...overrides
        }
    };
}

export function event(type, payload = {}, ts = Date.now()) {
    counter++;
    return { id: `ev_${counter}`, type, ts, profileId: 'p_test', deviceId: 'd_test', payload };
}

export const DAY = 86400000;

/**
 * LE CODE DES FICHES, EN UN SEUL TEXTE.
 *
 * Plusieurs tests inspectent la SOURCE des rendus — « ce rendu lit-il bien le
 * rang depuis son emplacement ? », « le corrigé se mesure-t-il encore sur son
 * contenu ? ». Ce sont de bonnes questions et il n'y a pas d'autre façon de les
 * poser : elles portent sur la manière d'écrire, pas sur un résultat.
 *
 * Elles lisaient `printSheet.js`. Le fichier faisait seize mille lignes ; il a
 * été découpé par famille (voir `tools/decouperPrintSheet.mjs`), et ces tests
 * se sont mis à lire une façade vide — ils passaient au vert en ne trouvant
 * rien, ce qui est la pire façon de passer.
 *
 * On lit donc TOUT le dossier. Un rendu qui déménagerait demain d'une famille
 * à l'autre ne fera pas mentir ces tests.
 */
export function sourceDesFiches() {
    const dossier = new URL('../js/ui/fiches/', import.meta.url);
    const morceaux = fs.readdirSync(dossier)
        .filter(f => f.endsWith('.js')).sort()
        .map(f => fs.readFileSync(new URL(f, dossier), 'utf8'));
    morceaux.push(fs.readFileSync(new URL('../js/ui/printSheet.js', import.meta.url), 'utf8'));
    return morceaux.join('\n');
}

/**
 * UN FICHIER SOURCE SANS SES COMMENTAIRES.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * QUATRE FOIS DANS LA MÊME SOIRÉE, une épreuve qui lit du code source s'est
 * trompée en lisant un COMMENTAIRE :
 *
 *   · celle du `+` de PHP accusait le commentaire qui explique la correction,
 *     puisqu'il cite `$r + ['data' => ...]` ;
 *   · celle de l'ORDRE de deux appels restait VERTE en inversant les appels,
 *     parce que le commentaire au-dessus les nomme dans le bon ordre — trouvée
 *     par `epreuveTombe.mjs`, pas par la relecture ;
 *   · celle de la police s'accusait elle-même, le correctif citant 'Inter' ;
 *   · celle du mot du professeur refusait le mot « canvas », écrit dans la
 *     phrase qui explique précisément pourquoi on n'y touche pas.
 *
 * LA CAUSE EST STRUCTURELLE, PAS DISTRAITE. Ce dépôt explique chaque décision
 * à la place où elle se prend, et un bon commentaire CITE le défaut qu'il
 * ferme. Une épreuve qui lit la prose comme du code rend donc l'explication
 * dangereuse — c'est-à-dire qu'elle punit exactement ce qu'on veut encourager.
 *
 * ON NE PRÉTEND PAS ANALYSER LE LANGAGE. Les lignes qui COMMENCENT par `//`,
 * `*`, `/*` ou `#` partent, et les blocs `/* … *‌/` aussi. Une chaîne de
 * caractères qui contiendrait `/*` resterait mal coupée ; cela n'est jamais
 * arrivé ici, et le jour où cela arrivera, l'épreuve tombera au lieu de
 * mentir — ce qui est le bon sens de l'erreur.
 *
 * @param {string} texte  le contenu du fichier
 * @returns {string} le même, sans ses commentaires
 */
export function sansCommentaires(texte) {
    return String(texte)
        // UN « /* » N'OUVRE UN COMMENTAIRE QUE S'IL EN A LE DROIT.
        //
        // MESURÉ dans `js/ui/atelier.js` : l'attribut `accept="image/*"` d'un
        // champ de fichier ouvrait un commentaire qui courait jusqu'au `*/`
        // suivant — QUATRE-VINGT-QUINZE lignes avalées, toute la fin du
        // gabarit du panneau et le début des branchements. Trois identifiants
        // qui existent bel et bien dans le fichier (`atl-jouer`,
        // `atl-controler-tout`, `atl-tout-effacer`) étaient donc invisibles à
        // toute épreuve lisant `sansCommentaires`.
        //
        // ET LE DANGER N'EST PAS CELUI QU'ON CROIT. Une épreuve POSITIVE
        // écrite sur cette zone échoue, on la voit, on cherche. Une épreuve
        // NÉGATIVE — « ce motif ne doit PAS être là » — passe au vert sans
        // rien garder, et personne ne le saura jamais.
        //
        // Un vrai début de commentaire est en tête de ligne ou suit une
        // espace, une parenthèse, une virgule, un `=`, un `{`, un `;` ou un
        // `:` ; celui d'un chemin ou d'un type MIME suit une lettre.
        .replace(/(^|[\s(,={};:])\/\*[\s\S]*?\*\//g, '$1')
        .split('\n')
        .filter(l => !/^\s*(\/\/|\*|#)/.test(l))
        .join('\n');
}
