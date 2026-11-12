// L'ÉCHELLE DES TAILLES, SUR LE PAPIER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Oui fais les deux » — la fraction, et la frise sur papier.
//
// ── CE QUI CHANGE ENTRE L'ÉCRAN ET LA FEUILLE ──────────────────────────────
//
// À L'ÉCRAN ON DÉPOSE, SUR LE PAPIER ON ÉCRIT. L'élève ne peut pas glisser une
// carte sur une feuille : il écrit la LETTRE de l'objet dans la case. C'est le
// même travail — lire une écriture décimale, trouver sa puissance de 10 — avec
// le geste que le papier permet.
//
// PAS DE DESSINS SUR LA FEUILLE, et c'est une décision, pas un oubli. Le dépôt
// l'a tranché ailleurs, et l'argument tient ici : « une image tramée sur une
// photocopie donne des traits gris et baveux, alors qu'un trait vectoriel sort
// net à n'importe quelle échelle » (`fiches/elementsGeo.js`). Porter les vingt
// et un dessins en vectoriel dans le PDF est un vrai chantier ; le nom et la
// mesure suffisent à faire l'exercice, et ils se photocopient.
//
// ── PLUS DE CASES QUE D'OBJETS, ENCORE ─────────────────────────────────────
//
// Neuf cases, cinq ou six objets, comme à l'écran : si la frise était pleine,
// les dernières lettres se placeraient par élimination.

import {
    MONDES, mondeDe, casesDuMonde, tirerDesObjets,
    puissanceTexte, ecritureDecimale
} from '../echelleDesTailles.js';

/** A, B, C… — la lettre qu'on écrit dans la case. */
const LETTRES = 'ABCDEFGH';

export const echelleFicheGenerator = {
    id: 'num.echelle-fiche',
    titre: 'L’Échelle des Tailles',
    paramSchema: [
        {
            id: 'monde', type: 'select', label: 'Quel monde',
            options: [
                { value: 'nous', label: 'Autour de nous' },
                { value: 'petit', label: 'L’infiniment petit' },
                { value: 'univers', label: 'L’Univers' }
            ],
            default: 'nous'
        },
        {
            id: 'objets', type: 'select', label: 'Combien d’objets à placer',
            options: [
                { value: 4, label: '4 objets' },
                { value: 5, label: '5 objets' },
                { value: 6, label: '6 objets' }
            ],
            default: 5
        }
    ],

    // Les réglages d'abord, le contexte ensuite : signature du registre.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const monde = MONDES[params.monde] ? params.monde : 'nous';
        const combien = Math.max(3, Math.min(6, Number(params.objets) || 5));
        const objets = tirerDesObjets({ monde, combien }, rng);

        // LES OBJETS SONT MÉLANGÉS DANS LA LISTE, jamais rangés par taille :
        // une liste déjà triée se recopierait de haut en bas sans rien lire.
        const liste = rng.shuffle(objets.slice()).map((o, i) => ({
            lettre: LETTRES[i],
            nom: o.nom,
            mesure: `≈ ${ecritureDecimale(o.exposant)} m`,
            exposant: o.exposant
        }));

        const cases = casesDuMonde(monde).map(e => ({
            exposant: e,
            etiquette: `${puissanceTexte(e)} m`,
            // La lettre attendue, ou rien si la case reste vide. C'est elle
            // qu'on écrit sur la page des solutions.
            lettre: (liste.find(l => l.exposant === e) || {}).lettre || ''
        }));

        const m = mondeDe(monde);
        return {
            prompt: {
                text: `Place les ${liste.length} objets sur l’échelle.`,
                papier: 'Écris la lettre de chaque objet dans la case de sa taille.'
            },
            answer: cases.filter(c => c.lettre).map(c => `${c.lettre} → ${c.etiquette}`).join(' · '),
            explanation: liste.map(l =>
                `${l.lettre} ${l.nom} : ${l.mesure} = ${puissanceTexte(l.exposant)} m`).join(' · '),
            difficulty: 3,
            meta: {
                monde, nomDuMonde: m.nom, cases, liste,
                // Ce que la fiche exclura pour la frise suivante.
                theme: liste.map(l => l.nom).join('|')
            }
        };
    }
};
