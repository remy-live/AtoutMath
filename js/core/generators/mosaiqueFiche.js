// LA MOSAÏQUE DES TRANSFORMATIONS SUR LE PAPIER — un tableau, plusieurs questions.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : il voulait « un imprimé avec plusieurs
// questions pour un même tableau de mosaïque ».
//
// MESURÉ AVANT : la feuille écrivait « Quelle est l'image de la pièce 10 par la
// symétrie de centre K ? » suivi d'un pointillé — et RIEN d'autre. Pas de
// mosaïque, pas de pièces, pas de point K. Une question dont l'énoncé entier a
// disparu n'est pas incomplète, elle est INSOLUBLE, et elle occupait quand même
// sa place. C'est exactement le défaut qu'il avait relevé sur les quatre fiches
// de géométrie : « tu oublies toutes les figures sur la version imprimé ».
//
// ── POURQUOI PLUSIEURS QUESTIONS PAR MOSAÏQUE, ET NON UNE ────────────────
//
// Une mosaïque est un GRAND dessin : seize pièces, quinze points nommés. En
// imprimer une par question en met quatre par page, chacune réduite à un
// timbre où l'on ne distingue plus les pièces. Quatre questions sur LA MÊME
// mosaïque tiennent dans un dessin deux fois plus grand — et c'est aussi ce
// que fait un manuel, pour une raison qui n'est pas que d'encre : relire la
// même figure sous quatre transformations différentes est l'exercice.
//
// Le rendu `pavage` a fait ce chemin avant nous, et le commentaire de son
// `geoPavage` porte la phrase de Rémy qui l'a causé : « attention à ce que le
// texte n'aille pas sur le quadrillage ».
//
// ── CE QUI REND LA CHOSE POSSIBLE : LES LETTRES ──────────────────────────
//
// Une question dit « par la symétrie d'axe (OD) », « de centre G », « de
// vecteur IB ». Ces lettres sont celles des SOMMETS de la mosaïque, qui sont
// dessinés. Vérifié sur quarante tirages : aucune lettre citée ne manque au
// dessin. Il n'y a donc RIEN à tracer de plus par question — pas un axe, pas
// un centre —, et c'est ce qui permet à quatre questions de partager une
// figure sans qu'elle devienne illisible.

import { makeItem } from '../items.js';
import { MOSAIQUES } from '../../data/mosaiques.js';
import { direTransformation } from '../mosaique.js';
import { lireMosaique } from './pavageImage.js';

const GENRES = ['axiale', 'centrale', 'translation', 'rotation'];
const NOMS = {
    axiale: 'Symétrie axiale', centrale: 'Symétrie centrale',
    translation: 'Translation', rotation: 'Rotation'
};
const SKILL = 'geo.transfo.axiale';

const listeDeGenres = (v) => {
    const l = (Array.isArray(v) ? v : GENRES).filter(g => GENRES.includes(g));
    return l.length ? l : [...GENRES];
};

export const mosaiqueFicheGenerator = {
    id: 'geo.mosaique-fiche',
    label: 'La mosaïque des transformations (fiche)',
    skills: ['geo.transfo.axiale', 'geo.transfo.centrale',
        'geo.transfo.translation', 'geo.transfo.rotation'],
    answerKinds: ['piece'],
    params: [
        {
            id: 'genres', type: 'multiselect', label: 'Transformations', default: [...GENRES],
            options: GENRES.map(g => ({ value: g, label: NOMS[g] }))
        },
        {
            // LE RÉGLAGE QUE RÉMY A DEMANDÉ EN TOUTES LETTRES : combien de
            // questions sur la même mosaïque. Quatre par défaut — c'est ce qui
            // tient à côté du dessin sans le rétrécir.
            id: 'parMosaique', type: 'select', label: 'Questions par mosaïque',
            default: '4',
            options: [
                { value: '2', label: '2 — une grande mosaïque' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '6', label: '6 — on relit beaucoup la même figure' }
            ],
            aide: 'Toutes les questions portent sur LE MÊME dessin : les axes, les centres '
                + 'et les vecteurs sont nommés par les lettres des sommets, qui sont déjà '
                + 'tracés. Relire la même figure sous plusieurs transformations est '
                + 'l\u2019exercice — et c\'est ce qui permet de l\'imprimer en grand. '
                + 'C\'est un MAXIMUM : si vous ne cochez qu\'une transformation, une '
                + 'mosaïque n\'en porte pas toujours six, et la feuille sert alors le '
                + 'plus grand nombre qu\'elle trouve.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const genres = listeDeGenres(params.genres);
        const combien = Math.max(2, Math.min(6, Number(params.parMosaique) || 4));

        // ON CHOISIT LA MOSAÏQUE PARMI CELLES QUI PEUVENT PORTER LE COMPTE.
        //
        // Tirer d'abord puis chercher assez de questions dedans donnerait, sur
        // une mosaïque pauvre, trois questions là où le professeur en a demandé
        // six — sans que rien ne le dise. On trie donc AVANT, et l'on ne retombe
        // sur un tirage libre que s'il n'existe aucune mosaïque assez riche.
        const combienDe = (p) => p.relations.filter(r => genres.includes(r.t.genre)).length;
        const assez = MOSAIQUES.filter(p => combienDe(p) >= combien);
        // AUCUNE MOSAÏQUE N'EST ASSEZ RICHE ? ON PREND LES PLUS RICHES.
        //
        // MESURÉ : avec le seul genre « symétrie axiale » coché et six
        // questions demandées, le professeur en recevait UNE, DEUX ou QUATRE
        // selon le tirage — aucune mosaïque ne porte six symétries axiales, et
        // le repli tirait au hasard parmi toutes celles qui en ont au moins
        // une. Sa feuille sortait avec un bloc à une question et un autre à
        // quatre, sans que rien ne le dise.
        //
        // On ne peut pas inventer des relations qui n'existent pas ; on peut
        // servir le MIEUX disponible, et c'est ce que fait ce tri. Avec un seul
        // genre, le compte devient le maximum de ce que le catalogue porte —
        // ce que l'aide du réglage dit en toutes lettres.
        let possibles = assez;
        if (!possibles.length) {
            const avec = MOSAIQUES.filter(p => combienDe(p) > 0);
            const mieux = avec.reduce((n, p) => Math.max(n, combienDe(p)), 0);
            possibles = avec.filter(p => combienDe(p) === mieux);
        }
        if (!possibles.length) possibles = MOSAIQUES;
        const brut = possibles[rng.int(0, possibles.length - 1)];
        const mosaique = lireMosaique(brut);

        const candidates = mosaique.relations.filter(r => genres.includes(r.t.genre));
        const liste = candidates.length ? candidates : mosaique.relations;
        // MÉLANGÉES, PUIS COUPÉES : prendre les premières rendrait toujours les
        // mêmes questions pour une mosaïque donnée, et deux feuilles tirées le
        // même jour seraient identiques.
        const tirees = rng.shuffle([...liste]).slice(0, Math.min(combien, liste.length));

        const questions = tirees.map(q => ({
            depuis: q.depuis,
            vers: q.vers,
            transfo: q.t,
            genre: q.t.genre,
            texte: `Quelle est l'image de la pièce ${q.depuis} par ${direTransformation(q.t)} ?`
        }));

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.mosaique-fiche',
            skillId: `geo.transfo.${questions[0] ? questions[0].genre : 'axiale'}` || SKILL,
            answerKind: 'piece',
            prompt: {
                text: `${questions.length} questions sur la même mosaïque.`
            },
            answer: questions.map(q => q.vers).join('.'),
            hints: [
                'Ne suis pas la pièce entière : choisis UN de ses coins et cherche où il '
                    + 'tombe. Le reste se recopie.',
                'L\'axe, le centre et le vecteur sont nommés par des lettres qui sont sur '
                    + 'le dessin — repère-les d\'abord.'
            ],
            explanation: questions
                .map(q => `Pièce ${q.depuis} → pièce ${q.vers}.`).join(' '),
            difficulty: 3,
            meta: {
                mosaique: brut.graine,
                boite: mosaique.boite,
                pieces: mosaique.pieces,
                sommets: mosaique.sommets,
                questions,
                // Ce que la feuille exclura pour le bloc suivant : deux fois la
                // même mosaïque sur une page ferait deux fois le même dessin.
                theme: String(brut.graine)
            }
        });
    }
};
