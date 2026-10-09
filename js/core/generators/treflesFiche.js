// LE CHAMP DE TRÈFLES SUR LE PAPIER — et c'est là qu'il est né.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY a apporté ce jeu avec la page d'une REVUE : un champ de trèfles à trois
// feuilles, et « Encoure les trèfles à 4 feuilles ». L'écran l'a imité ; la
// feuille le rend à sa forme d'origine. C'est le seul exercice du catalogue
// dont la version papier est l'original et l'écran la copie.
//
// ON GARDE LE GESTE : quand on en trouve un, on l'ENTOURE. À l'écran le cercle
// se dessine à l'encre autour du trèfle ; sur la feuille, c'est l'élève qui le
// trace au crayon. Rien à changer — le jeu n'a jamais demandé autre chose.
//
// C'EST UN GÉNÉRATEUR À PART (`printGeneratorId`) parce que le jeu n'existe
// qu'à l'écran : il n'a pas de générateur, il a une activité. Comme la
// balance, les Serpents et l'Enquête.
//
// ── CE QUE LA FEUILLE DOIT GARDER DU JEU ──────────────────────────────────
//
// L'ORDRE DE DESSIN. C'est lui qui décide qui recouvre qui, et le
// recouvrement EST la difficulté du palier « champ ». Dessiner les trèfles
// dans l'ordre de la grille donnerait une image en tuiles, avec un sens de
// lecture que la page de la revue n'a pas.
//
// LA ROTATION. « Ce n'est pas le nombre de trèfles qui fait la difficulté » —
// c'est qu'un trèfle à trois feuilles tourné de 40° ressemble à un trèfle à
// quatre feuilles tourné de 10°, et qu'il faut alors COMPTER les feuilles.

import { makeItem } from '../items.js';
import { PALIERS, RAYON, semerLeChamp, ordreDeDessin } from '../champDeTrefles.js';

const SKILL = 'defi.trefles';

export const treflesFicheGenerator = {
    id: 'defi.trefles-fiche',
    label: 'Le Trèfle à Quatre Feuilles (fiche)',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[(params || {}).palier] ? (params || {}).palier : 'pre';
        const champ = semerLeChamp({ rng, palier });

        return makeItem({
            seed: rng.seed,
            generatorId: 'defi.trefles-fiche',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: `Entoure les ${champ.aTrouver} trèfles à quatre feuilles.`
            },
            answer: champ.trefles.filter(t => t.feuilles === 4).map(t => t.i).join('.'),
            hints: [
                'BALAIE LIGNE PAR LIGNE, de gauche à droite, au lieu de sauter d\'un '
                    + 'point à l\'autre : au hasard, on repasse vingt fois au même endroit '
                    + 'et l\'on finit par en oublier un.',
                'Un trèfle tourné de quarante degrés ressemble beaucoup à un trèfle à '
                    + 'quatre feuilles : il faut COMPTER, pas reconnaître.'
            ],
            explanation: 'Ce qui se travaille ici est le balayage organisé — le geste exact '
                + 'qui manque à qui compte une collection en désordre et en oublie.',
            difficulty: { promenade: 1, pre: 2, champ: 3, foret: 4 }[palier] || 2,
            meta: {
                palier,
                aTrouver: champ.aTrouver,
                largeur: champ.largeur,
                hauteur: champ.hauteur,
                rayon: RAYON,
                // DANS L'ORDRE DE DESSIN, et non dans celui du semis : c'est
                // cet ordre qui décide qui recouvre qui, et le recouvrement
                // est la difficulté même du palier « champ ».
                trefles: ordreDeDessin(champ).map(t => ({
                    // `i` EST LE RANG DE SEMIS, et il ne sert qu'à la garde :
                    // c'est le seul moyen de vérifier, sans navigateur, que la
                    // liste sort bien dans l'ordre de DESSIN et non dans celui
                    // du semis. Sans lui, `epreuveTombe` a montré que
                    // l'épreuve restait verte en remplaçant l'un par l'autre.
                    i: t.i,
                    x: t.x, y: t.y, angle: t.angle, feuilles: t.feuilles
                }))
            }
        });
    }
};
