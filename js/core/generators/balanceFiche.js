// LE POLYCOPIÉ D'ÉQUATIONS — ce que la balance laisse sur le cahier.
//
// Rémy, sur « La Balance des Équations » : « Tu peux faire un polycopé
// d'équations. Plusieurs colonnes et 3 lignes de pointillés en dessous. »
//
// POURQUOI UNE FICHE POUR UN JEU QUI N'EN AVAIT PAS. La balance enseigne un
// geste — on fait la même chose des deux côtés — et elle l'enseigne bien
// justement parce qu'on le FAIT. Mais le jour du contrôle il n'y a pas de
// plateaux : il y a une équation, une copie, et trois lignes à écrire. Le
// polycopié est ce passage-là, et il ne demande rien d'autre que ce que la
// balance vient de montrer. Les trois lignes de pointillés ne sont pas de la
// place perdue : ce sont les trois lignes de la solution — l'équation, le geste
// appliqué aux deux membres, et « x = … ».
//
// LES ÉQUATIONS SONT CELLES DU JEU, PAS D'AUTRES. `preparerNiveau` fabrique la
// même chose des deux côtés de l'écran : mêmes treize formes, mêmes bornes,
// même garantie — solution entière, membre de droite positif, boîtes
// rassemblables. Écrire un second tirage « pour le papier » aurait fait deux
// exercices qui se ressemblent au lieu d'un exercice avec deux faces.
//
// ET C'EST UN GÉNÉRATEUR À PART (`printGeneratorId`) parce que la balance
// n'existe qu'à l'écran : elle n'a pas de générateur du tout, elle a une
// activité. Le catalogue sait déjà lire ce cas — le repérage joue un point et
// en imprime six.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    NIVEAUX, FAMILLES, ORDRE_FAMILLES, preparerNiveau, enSymboles, etatInitial
} from '../balance.js';

const SKILL = 'alg.equation.resoudre';
const MOT = 'forme';

// LES MARCHES SONT LES TREIZE NIVEAUX DU JEU, groupés par famille — c'est le
// groupement du jeu, et treize cases à la file seraient illisibles sur un
// téléphone (voir l'en-tête de `core/progression.js`).
const MARCHES = NIVEAUX.map((n, i) => ({
    id: String(i), nom: `${i + 1}. ${n.titre}`, groupe: n.famille
}));
const GROUPES = ORDRE_FAMILLES.reduce((g, f) => {
    g[f] = FAMILLES[f].label;
    return g;
}, {});

/**
 * LA SOLUTION ÉCRITE COMME ON L'ÉCRIT AU CAHIER — et c'est le corrigé.
 *
 * Trois lignes, exactement celles que la feuille réserve : l'équation, le geste
 * porté sur LES DEUX MEMBRES, puis la valeur. Le geste est écrit en toutes
 * lettres à droite (« − 6 des deux côtés »), comme le journal de bord de la
 * balance le fait à l'écran : la fiche et le jeu doivent raconter la même
 * histoire, sinon l'élève apprend deux méthodes.
 */
export function redactionEquation({ a, b, c, d }) {
    const lignes = [];
    const eq = (A, B, C, D) => enSymboles(etatInitial({ a: A, b: B, c: C, d: D }));
    let [A, B, C, D] = [a, b, c, d];
    lignes.push(eq(A, B, C, D));

    // ON RASSEMBLE LES BOÎTES D'ABORD. C'est l'ordre que la balance impose par
    // un refus — « 2x + 5 = 17 » ne se partage pas tant que le 5 est là — et le
    // corrigé ne peut pas donner l'exemple inverse.
    if (C) {
        lignes.push(`${eq(A - C, B, 0, D)}   (on enlève ${C === 1 ? 'x' : `${C}x`} des deux côtés)`);
        A -= C; C = 0;
    }
    if (B) {
        const mot = B < 0 ? `on ajoute ${Math.abs(B)}` : `on enlève ${B}`;
        lignes.push(`${eq(A, 0, 0, D - B)}   (${mot} des deux côtés)`);
        D -= B; B = 0;
    }
    // ON NE RÉÉCRIT PAS UNE LIGNE DÉJÀ ÉCRITE. Quand il ne reste qu'une boîte,
    // le geste précédent a DÉJÀ produit « x = 7 » : ajouter une conclusion
    // identique en dessous ferait croire à une quatrième étape, et la fiche en
    // réserve trois. Mesuré sur « x − 6 = 1 » : le corrigé disait « x = 7 »
    // deux fois de suite.
    if (A !== 1) lignes.push(`x = ${D / A}   (on partage les deux côtés en ${A})`);
    else if (!lignes[lignes.length - 1].startsWith('x =')) lignes.push(`x = ${D}`);
    return lignes;
}

export const balanceFicheGenerator = {
    id: 'alg.equation-fiche',
    label: 'Résoudre une équation (fiche)',
    skills: [SKILL],
    answerKinds: ['numeric'],
    // `ecrit` est ce qui donne une fiche à l'exercice : la mise en page
    // générique compose les questions en colonnes et trace les lignes.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES).length),
    params: [paramMarches({ marches: MARCHES, groupes: GROUPES, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES),
            totalDe(ctx, params), params);
        const niveau = preparerNiveau(Number(id) || 0, rng);
        const equation = enSymboles(niveau.etat);
        const redaction = redactionEquation(niveau.equation);

        return makeItem({
            seed: rng.seed, generatorId: 'alg.equation-fiche', skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                // LA QUESTION EST L'ÉQUATION, ET RIEN D'AUTRE. « Résous »
                // appartient à la consigne en tête de fiche ; le répéter
                // vingt fois volerait la moitié de chaque colonne.
                text: equation,
                papier: equation
            },
            answer: niveau.solution,
            hints: [
                'Commence par rassembler les x d\'un seul côté.',
                'Puis règle les nombres : ce que tu fais d\'un côté, fais-le de l\'autre.',
                `Il ne reste qu'à partager, et x = ${niveau.solution}.`
            ],
            // LE CORRIGÉ EST LA RÉDACTION, PAS LE NOMBRE. Une feuille de
            // solutions qui dirait « x = 5 » ne corrigerait rien : c'est le
            // chemin qu'on note, et c'est lui que l'élève doit pouvoir comparer
            // au sien, ligne par ligne.
            // La première ligne de la rédaction est l'équation de départ, et le
            // corrigé l'imprime déjà en tête : on ne la redit pas. Restent les
            // GESTES, un par ligne, comme au cahier.
            explanation: redaction.slice(1).join('\n'),
            difficulty: Math.min(5, 1 + Math.floor((Number(id) || 0) / 3)),
            meta: {
                marche: id, titre: niveau.titre, famille: niveau.famille,
                equation: niveau.equation, solution: niveau.solution,
                redaction, decimal: false
            }
        });
    }
};
