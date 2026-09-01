// L'ORGANIGRAMME DES QUADRILATÈRES, SUR PAPIER.
//
// Rémy, sur sa fiche : cinq cases de figures, treize cartes de conditions, et
// plusieurs flèches qui arrivent sur la même case. Il l'a demandé pour le PDF —
// c'est la feuille qu'on colle dans le cahier de leçons, et celle qu'on remplit
// une fois pour l'année.
//
// À L'ÉCRAN ON GLISSE DES CARTES ; SUR LE PAPIER ON ÉCRIT UNE LETTRE. Découper
// treize étiquettes et les coller n'est pas une leçon de géométrie, c'est une
// heure de ciseaux. Chaque condition porte donc une lettre dans une liste
// donnée en désordre, et l'élève reporte la lettre dans la petite case posée
// sur la flèche. La correction se lit d'un coup d'œil, et la feuille se refait.
//
// ET LES LETTRES CHANGENT D'UNE COPIE À L'AUTRE. Rémy : « l'organigramme des
// quadrilatères est toujours le même ». Il l'est — c'est une hiérarchie, elle
// ne se tire pas au sort —, mais l'ORDRE de la liste, lui, se mélange. Deux
// voisins n'ont donc pas les mêmes lettres aux mêmes endroits, et la feuille de
// l'un ne se recopie pas sur celle de l'autre.

import { makeItem } from '../items.js';
import { FLECHES, FAMILLES, cleFleche, familleDe } from '../quadrilateres.js';

/** A, B, C… — autant de lettres que de conditions. */
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const organigrammeQuadriGenerator = {
    id: 'geo.quadrilateres.organigramme',
    label: 'L\'organigramme des quadrilatères',
    skills: ['geo.quadrilateres.familles'],
    answerKinds: ['figure'],
    params: [
        {
            id: 'noms', type: 'checkbox', label: 'Donner le nom des figures',
            default: true,
            aide: 'Décoché, les cinq cases sont vides elles aussi : l\'élève doit les nommer '
                + 'avant de placer les conditions. C\'est la même feuille, en plus exigeant — '
                + 'et c\'est ainsi qu\'on la donne en révision.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};

        // NEUF CONDITIONS POUR TREIZE FLÈCHES, ET C'EST TOUT L'INTÉRÊT.
        //
        // « Un angle droit » mène du parallélogramme au rectangle ET du losange
        // au carré ; « les diagonales ont la même longueur » fait la paire
        // symétrique. Quatre des treize conditions servent donc deux fois. La
        // liste ne les répète pas : elle donne les NEUF énoncés distincts, et
        // une même lettre se reporte à deux endroits.
        //
        // Une liste de treize aurait été plus simple à écrire et FAUSSE à
        // corriger : l'élève qui met la lettre de l'un des deux jumeaux aurait
        // eu juste, et l'exercice aurait eu deux réponses. Surtout, elle aurait
        // laissé croire à une correspondance une-pour-une, alors que le fait
        // qu'une condition serve deux fois est précisément ce que
        // l'organigramme enseigne.
        const distincts = [];
        FLECHES.forEach(f => { if (!distincts.includes(f.ajoute)) distincts.push(f.ajoute); });
        const liste = rng.shuffle(distincts.slice()).map((texte, rang) => ({
            lettre: LETTRES[rang], texte,
            // Toutes les flèches que cette condition ouvre : le corrigé s'en sert.
            cles: FLECHES.filter(f => f.ajoute === texte).map(cleFleche)
        }));
        const parCle = {};
        liste.forEach(l => l.cles.forEach(c => { parCle[c] = l.lettre; }));

        const avecNoms = p.noms !== false;
        const doublons = liste.filter(l => l.cles.length > 1).length;
        const consigne = (avecNoms
            ? 'Reporte la lettre de chaque condition dans la case posée sur sa flèche.'
            : 'Écris d\'abord le nom des cinq figures, puis reporte la lettre de chaque '
                + 'condition dans la case posée sur sa flèche.')
            + ` Attention : il y a ${liste.length} conditions pour ${FLECHES.length} flèches`
            + `${doublons ? ' — certaines lettres servent DEUX FOIS' : ''}.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.quadrilateres.organigramme',
            skillId: 'geo.quadrilateres.familles',
            answerKind: 'figure',
            prompt: { text: consigne, papier: consigne },
            // La réponse écrite : les treize lettres, dans l'ordre de lecture de
            // l'organigramme. Elle ne sert qu'au journal ; la vraie correction
            // est la feuille de solutions, qui redessine la figure remplie.
            answer: FLECHES.map(f => parCle[cleFleche(f)]).join(''),
            explanation: 'Chaque flèche descend d\'un cran en ajoutant UNE condition. '
                + 'Plusieurs conditions peuvent mener au même endroit : trois façons '
                + 'd\'être un parallélogramme, deux d\'être un rectangle. Et l\'on arrive '
                + 'au carré par deux chemins, chacun apportant ce que l\'autre avait déjà.',
            difficulty: avecNoms ? 3 : 4,
            meta: {
                liste, parCle, avecNoms,
                familles: FAMILLES.map(f => f.id),
                // De quoi écrire la correction sans relire le noyau.
                solution: FLECHES.map(f => ({
                    cle: cleFleche(f), lettre: parCle[cleFleche(f)],
                    de: familleDe(f.de).nom, vers: familleDe(f.vers).nom
                }))
            }
        });
    }
};
