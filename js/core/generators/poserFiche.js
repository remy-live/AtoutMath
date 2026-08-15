// LES OPÉRATIONS POSÉES, SUR LE PAPIER.
//
// C'est l'exercice le plus banal d'une feuille de calcul, et celui qui
// manquait : « pose et effectue ». Rémy le demande pour les quatre opérations.
//
// CE QUE LA FICHE DONNE, ET CE QU'ELLE NE DONNE PAS. Elle imprime la potence
// ou les colonnes, avec les nombres déjà ALIGNÉS — l'alignement est un
// exercice à lui seul, il se travaille à l'écran où l'on peut se tromper et
// recommencer ; sur une photocopie, un élève qui aligne mal n'a plus qu'à
// raturer. Elle laisse en revanche toute la place d'écrire : les retenues, les
// produits partiels, les soustractions successives de la division.
//
// Ce module ne calcule RIEN lui-même : tout vient de core/poser.js, le même
// modèle que l'écran. Une fiche qui referait ses colonnes de son côté finirait
// par ne plus dire la même chose que le jeu.

import { makeItem } from '../items.js';
import { poser } from '../poser.js';

const SIGNE = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
const NOM = {
    '+': 'addition', '-': 'soustraction',
    '×': 'multiplication', '÷': 'division'
};

/** Un entier de `n` chiffres, dont le premier n'est jamais zéro. */
function entier(rng, n) {
    if (n <= 1) return rng.int(2, 9);
    let v = rng.int(1, 9);
    for (let i = 1; i < n; i++) v = v * 10 + rng.int(0, 9);
    return v;
}

/**
 * UN TIRAGE QUI POSE VRAIMENT LA QUESTION.
 *
 * Une addition sans une seule retenue ne s'appelle pas « poser une addition » :
 * c'est aligner des chiffres. Une soustraction sans emprunt non plus. On
 * retire donc, et on retire jusqu'à en avoir — mais pas indéfiniment : au bout
 * de quarante essais on accepte ce qu'on a, plutôt que de faire tourner le
 * navigateur pour un cas de bord.
 */
function tirer(rng, operation, chiffres, nombres, avecRetenue) {
    for (let essai = 0; essai < 40; essai++) {
        let ops;
        if (operation === '+') {
            ops = Array.from({ length: nombres }, () => entier(rng, chiffres));
        } else if (operation === '-') {
            // Le grand d'abord : une soustraction posée ne descend pas
            // sous zéro, et le noyau refuse — à juste titre — de la poser.
            const a = entier(rng, chiffres);
            const b = entier(rng, Math.max(1, chiffres - rng.int(0, 1)));
            ops = a >= b ? [a, b] : [b, a];
            if (ops[0] === ops[1]) continue;
        } else if (operation === '×') {
            ops = [entier(rng, chiffres), entier(rng, Math.max(1, chiffres - 1))];
        } else {
            // La division : un diviseur court, et un dividende qui donne un
            // quotient d'au moins deux chiffres — sinon la potence n'a qu'une
            // étape et ne montre rien de la méthode.
            const d = entier(rng, Math.min(2, Math.max(1, chiffres - 1)));
            const q = entier(rng, Math.max(2, chiffres - 1));
            const reste = rng.int(0, Math.max(0, d - 1));
            ops = [q * d + reste, d];
        }
        let table;
        try { table = poser(operation, ops); } catch (e) { continue; }
        if (!avecRetenue) return { ops, table };
        if (operation === '+' && table.colonnes.some(c => c.retenueSortante > 0)) return { ops, table };
        if (operation === '-' && table.colonnes.some(c => c.emprunte)) return { ops, table };
        if (operation === '×' || operation === '÷') return { ops, table };
    }
    // Le filet : on repose le tirage le plus simple qui marche à coup sûr.
    const ops = operation === '÷' ? [144, 6] : [entier(rng, chiffres), entier(rng, chiffres)];
    const rangees = operation === '-' && ops[0] < ops[1] ? [ops[1], ops[0]] : ops;
    return { ops: rangees, table: poser(operation, rangees) };
}

export const poserFicheGenerator = {
    id: 'calc.poser-fiche',
    label: 'Poser une opération (fiche)',
    answerKinds: ['numeric'],
    skills: ['calc.pose'],
    params: [
        {
            id: 'operation', type: 'select', label: 'Opération', default: '+',
            options: [
                { value: '+', label: 'Addition' },
                { value: '-', label: 'Soustraction' },
                { value: '×', label: 'Multiplication' },
                { value: '÷', label: 'Division' }
            ]
        },
        {
            id: 'chiffres', type: 'select', label: 'Taille des nombres', default: 3,
            options: [
                { value: 2, label: '2 chiffres' },
                { value: 3, label: '3 chiffres' },
                { value: 4, label: '4 chiffres' },
                { value: 5, label: '5 chiffres' }
            ]
        },
        {
            id: 'nombres', type: 'select', label: 'Combien de nombres (addition)', default: 2,
            aide: 'À trois nombres, la retenue peut valoir 2 — et c\'est justement ce '
                + 'qu\'on n\'apprend jamais si l\'on n\'additionne que deux nombres.',
            options: [{ value: 2, label: 'Deux' }, { value: 3, label: 'Trois' }]
        },
        {
            id: 'retenue', type: 'checkbox', label: 'Garantir au moins une retenue', default: true,
            aide: 'Une addition sans retenue ne s\'appelle pas « poser une addition » : '
                + 'c\'est aligner des chiffres.'
        }
    ],

    // Les réglages d'abord, le contexte ensuite : c'est la signature du
    // registre, et l'inverser donne « rng.int is not a function » au premier
    // appel réel.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const operation = SIGNE[params.operation] ? params.operation : '+';
        const chiffres = Math.max(2, Math.min(5, Number(params.chiffres) || 3));
        const nombres = operation === '+' ? Math.max(2, Math.min(3, Number(params.nombres) || 2)) : 2;
        const { ops, table } = tirer(rng, operation, chiffres, nombres, params.retenue !== false);

        const texte = ops.join(` ${SIGNE[operation]} `);
        const resultat = operation === '÷' ? table.quotient : table.resultat;
        // Le reste fait partie de la réponse d'une division : « 147 ÷ 4 = 36 »
        // est faux tant qu'on n'a pas dit « il reste 3 ».
        const reponse = operation === '÷' && !table.exacte
            ? `${table.quotient} reste ${table.reste}` : String(resultat);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.poser-fiche',
            skillId: 'calc.pose',
            answerKind: 'numeric',
            prompt: {
                text: `Pose et effectue : ${texte}`,
                papier: texte,
                html: `<div class="game-question">Pose et effectue : ${texte}</div>`
            },
            answer: resultat,
            explanation: `${texte} = ${reponse}`,
            explicationPapier: `${texte} = ${reponse}`,
            difficulty: Math.min(5, chiffres - 1),
            meta: {
                operation, operandes: ops, texte, table, reponse,
                nom: NOM[operation],
                // Ce que la fiche exclura pour le bloc suivant : deux fois la
                // même opération sur une feuille, c'est une question perdue.
                theme: texte
            }
        });
    }
};
