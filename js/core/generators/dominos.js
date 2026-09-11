// LES DOMINOS COMME ITEM — et le pont vers les notions qui existent déjà.
//
// Ce module ne fabrique aucune question : il en emprunte. Le professeur
// choisit une notion — les tables, les compléments, les périmètres, les
// écritures d'un nombre — et le jeu en fait une chaîne de dominos. Écrire une
// question de plus aurait été écrire deux fois la même chose.
//
// Toutes les notions ne conviennent pas. Il en faut deux choses :
//   - la question doit s'écrire TELLE QUELLE sur une moitié de pièce (c'est le
//     drapeau `ecrit` du générateur : « 7 × 8 » se photocopie, « quelle heure
//     est-il ? » ne veut rien dire sans le cadran) ;
//   - la notion doit avoir assez de réponses DIFFÉRENTES pour remplir une
//     chaîne. « 8,5 … 8,23 » n'a que trois réponses possibles ; on n'en fait
//     pas dix dominos.
// La liste ci-dessous est donc close, et un test la vérifie une par une.

import { makeItem } from '../items.js';
import { getGenerator } from '../registry.js';
import {
    rassemblerCouples, construireChaine, reserveMelangee, direChaine,
    MIN_COUPLES, MAX_COUPLES
} from '../dominos.js';

/** Les notions dont on sait faire un jeu de dominos, et leur nom en clair. */
export const SOURCES = [
    { id: 'calc.addition', label: 'Additions' },
    { id: 'calc.soustraction', label: 'Soustractions' },
    { id: 'calc.mult.fact', label: 'Tables de multiplication' },
    { id: 'calc.mixte', label: 'Calculs mélangés' },
    { id: 'calc.priorites', label: 'Priorités opératoires' },
    { id: 'frac.add', label: 'Additions de fractions' },
    { id: 'mes.perimetre', label: 'Périmètres' },
    { id: 'mes.aire', label: 'Aires' },
    { id: 'num.chiffre-rang', label: 'Chiffre d\'un rang' },
    { id: 'num.parties', label: 'Partie entière, partie décimale' },
    { id: 'num.zeros', label: 'Zéros inutiles' },
    { id: 'num.conversion', label: 'Conversions' },
    { id: 'num.decomposition', label: 'Décompositions' },
    { id: 'num.lettres', label: 'Des lettres au chiffre' },
    { id: 'num.complement', label: 'Compléments' },
    { id: 'num.relatifs.addition', label: 'Additions de relatifs' }
];
// Écartés à dessein : « Il fait 11 °C, la température baisse de 3 degrés… »
// est un problème, pas une moitié de domino — on ne lit pas trois lignes de
// récit sur une pièce qu'on déplace. Et les comparaisons (« 8,5 … 8,23 ») ou
// la parité n'ont que deux ou trois réponses possibles : impossible d'en
// remplir une chaîne sans que deux pièces deviennent interchangeables.

export const sourceDe = (id) => SOURCES.find(s => s.id === id) || SOURCES[2];

/** Le texte d'un item tel qu'il s'écrit sur une pièce, et sa réponse. */
function coupleDe(item) {
    if (!item) return null;
    const q = (item.prompt && (item.prompt.papier || item.prompt.text)) || '';
    const r = item.answer;
    if (r === null || r === undefined) return null;
    return { q, r: String(r), item };
}

/**
 * Une chaîne de dominos tirée d'une notion.
 * @param {string} sourceId   identifiant du générateur emprunté
 * @param {Object} params     ses réglages (tables retenues, difficulté…)
 * @param {number} voulu      nombre de questions souhaité
 */
export function chaineDepuisGenerateur(sourceId, params, voulu, rng) {
    const gen = getGenerator(sourceId);
    if (!gen) return construireChaine([]);
    let k = 0;
    const tirer = () => {
        try {
            return coupleDe(gen.generate(params || {}, { rng, index: k++ }));
        } catch (e) {
            return null;
        }
    };
    const n = Math.max(MIN_COUPLES, Math.min(MAX_COUPLES, voulu));
    const chaine = construireChaine(rassemblerCouples(tirer, n));
    chaine.source = sourceId;
    // LA COMPÉTENCE, RÉSOLUE — jamais le motif. Rémy, sur ses points forts :
    // « Tu notes num.mult.table, ce n'est pas du tout parlant pour
    // l'utilisateur. » Un générateur déclare parfois un MOTIF
    // ('num.mult.table.*', les dix tables d'un coup) ; en l'enregistrant tel
    // quel, la planche de dominos rangeait ses réussites sous une compétence
    // qui n'existe pas, et le profil affichait l'identifiant brut faute de
    // libellé. `resolvedSkills` a déjà fait le travail.
    chaine.skillId = (gen.resolvedSkills && gen.resolvedSkills[0])
        || (gen.skills && gen.skills[0]) || 'num.calcul';
    return chaine;
}

export const dominosGenerator = {
    id: 'jeu.dominos',
    label: 'Dominos',
    skills: ['num.logique.dominos'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'source', type: 'select', label: 'Notion', default: 'calc.mult.fact',
            options: SOURCES.map(s => ({ value: s.id, label: s.label }))
        },
        {
            id: 'pieces', type: 'select', label: 'Nombre de dominos', default: 9,
            options: [
                { value: 7, label: '7 dominos — 6 calculs' },
                { value: 9, label: '9 dominos — 8 calculs' },
                { value: 11, label: '11 dominos — 10 calculs' },
                { value: 13, label: '13 dominos — 12 calculs' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const src = sourceDe(params && params.source);
        // Le professeur compte en DOMINOS, le noyau en questions : une chaîne
        // de neuf pièces enferme huit calculs.
        const voulu = Math.max(MIN_COUPLES, (Number(params && params.pieces) || 9) - 1);
        const chaine = chaineDepuisGenerateur(src.id, (params && params.sourceParams) || {}, voulu, rng);
        const reserve = reserveMelangee(chaine, rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'jeu.dominos',
            skillId: 'num.logique.dominos',
            answerKind: 'grid',
            prompt: {
                text: `Dominos — ${src.label}`,
                html: `<div class="game-question">Dominos — ${src.label}</div>`
            },
            answer: chaine.pieces.map(p => p.id),
            explanation: direChaine(chaine),
            difficulty: 2,
            meta: { ...chaine, reserve, source: src.id, sourceLabel: src.label }
        });
    }
};
