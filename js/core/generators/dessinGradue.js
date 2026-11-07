// LE DESSIN GRADUÉ — on place les points, le dessin apparaît.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « Tu pourrais créer ce genre d'exercice pour vec des
// dessins simplifiées pour téléphone portable et évidemment on peut relier
// les points etc… »
//
// LE PARTAGE DU TRAVAIL EST LA SEULE DÉCISION QUI COMPTE ICI : l'élève PLACE
// les points — c'est là qu'est la mathématique — et le dessin se trace tout
// seul au fur et à mesure. Le tracé est la récompense, jamais le travail. Cela
// garde aussi la ligne rouge à distance : on ne donne aucun outil de tracé,
// on révèle une image.
//
// Le reste — les dessins, les échelles, les habits d'un nombre — vit dans
// `dessinsGradues.js`, qui ne connaît ni le DOM ni le catalogue.

import { makeItem } from '../items.js';
import {
    DESSINS, ECHELLES, COLONNES, abscisseDe, maxDeLaLigne, nombreFr, ecrireAbscisse
} from '../dessinsGradues.js';

// `num.dec.graduations` EXISTE DÉJÀ, et c'est exactement cette compétence —
// « on compte les INTERVALLES depuis le grand trait de gauche, jamais les
// traits ». On n'en crée pas une nouvelle : le bilan par compétence doit
// réunir ce dessin et les lectures de graduations, pas les séparer. Le
// premier jet citait `num.dec.droite-graduee`, qui n'existe pas — un
// identifiant fantôme ne lève aucune erreur, il rend la remédiation muette.
const SKILL = 'num.dec.graduations';

export const ECRITURES = {
    nombre: 'Le nombre, écrit simplement',
    varie: 'Toutes les écritures — mots, fractions, calculs'
};

/** La réponse attendue, et ce que l'écran enverra : chaque point à sa place. */
export const ecrirePlacements = (points) => 'd' + points
    .map(p => `${p.nom}:${p.ligne}.${p.colonne}`).join(';');

export const dessinGradueGenerator = {
    id: 'num.dessin-gradue',
    label: 'Le Dessin Gradué',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'dessin', type: 'select', label: 'Le dessin', default: 'tous',
            options: [{ value: 'tous', label: 'Au hasard parmi tous' }]
                .concat(Object.entries(DESSINS).map(([value, d]) => ({ value, label: d.nom })))
        },
        {
            id: 'echelles', type: 'select', label: 'Les échelles', default: 'entiers',
            aide: 'C\'est le cœur de l\'exercice : placer 0,4 sur une droite de 0 à 1 et 40 '
                + 'sur une droite de 0 à 100, c\'est le même geste et deux nombres différents.',
            options: Object.entries(ECHELLES).map(([value, e]) => ({ value, label: e.nom }))
        },
        {
            id: 'ecriture', type: 'select', label: 'Comment l\'abscisse est écrite',
            default: 'nombre',
            options: Object.entries(ECRITURES).map(([value, label]) => ({ value, label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const cles = Object.keys(DESSINS);
        // ON TOURNE SUR LE RANG quand le dessin est « au hasard » : une feuille
        // de quatre dessins doit en raconter quatre. Même raison que les
        // costumes de la Traversée — des graines voisines donnent des premiers
        // tirages voisins, et l'on servait cinq fois la même histoire.
        const cle = DESSINS[p.dessin] ? p.dessin
            : cles[(rng.int(0, cles.length - 1) + (ctx.index || 0)) % cles.length];
        const dessin = DESSINS[cle];
        const echelle = ECHELLES[p.echelles] || ECHELLES.entiers;
        const varie = p.ecriture === 'varie';

        const droites = Array.from({ length: dessin.lignes }, (_, i) => {
            const e = echelle.lignes[i % echelle.lignes.length];
            return { min: e.min, pas: e.pas, max: maxDeLaLigne(e) };
        });

        const points = Object.entries(dessin.points).map(([nom, [colonne, ligne]]) => {
            const abscisse = abscisseDe(colonne, ligne, { lignes: droites });
            return {
                nom, ligne, colonne, abscisse,
                enonce: ecrireAbscisse(abscisse, { varie, rng })
            };
        });

        const consigne = 'Place chaque point sur sa droite, puis valide. '
            + 'Le dessin se trace tout seul.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.dessin-gradue',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                // SUR LE PAPIER, LA CONSIGNE DOIT DIRE CE QUE LES PARENTHÈSES
                // VEULENT DIRE : « A (3) : 5 » ne se devine pas, et une fiche
                // qu'on ne comprend pas sans explication orale est une fiche
                // qui ne sert qu'en présence du professeur.
                papier: 'Place chaque point sur la droite dont le numéro est entre '
                    + 'parenthèses, puis relie les points indiqués en bas et colorie.',
                html: `<div class="game-question dg-consigne">${consigne}</div>`
            },
            answer: ecrirePlacements(points),
            hints: [
                'Regarde D\'ABORD les deux nombres écrits aux bouts de la droite : ce sont eux '
                    + 'qui disent ce que vaut un intervalle, et ils changent d\'une ligne à l\'autre.',
                `Sur la ligne 1, il y a ${COLONNES} intervalles entre ${nombreFr(droites[0].min)} `
                    + `et ${nombreFr(droites[0].max)} : un intervalle vaut donc `
                    + `${nombreFr(droites[0].pas)}.`,
                'Compte les intervalles À PARTIR DU BOUT GAUCHE, pas les traits : entre deux '
                    + 'traits voisins il y a un intervalle, et le premier trait vaut déjà le '
                    + 'nombre de gauche.'
            ],
            explanation: `${dessin.nom} — chaque point se place en comptant les intervalles `
                + 'depuis le bord gauche de sa droite.',
            difficulty: p.echelles === 'entiers' ? 1 : p.echelles === 'decimaux' ? 2 : 3,
            meta: {
                dessin: cle, titre: dessin.nom,
                droites, points,
                formes: dessin.formes, traits: dessin.traits || [],
                colonnes: COLONNES,
                titreCourt: 'Dessin gradué',
                texteLecon: 'Les deux nombres des bouts disent ce que vaut un intervalle, '
                    + 'et ils changent à chaque ligne.'
            }
        });
    }
};

export default dessinGradueGenerator;
