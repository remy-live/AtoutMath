// LE PARKING — la fiche à découper.
//
// Comme pour les grenouilles et la tour, il n'y a presque rien à tirer au
// sort : un jeu à découper est TOUJOURS le même. Ce que l'item porte, c'est la
// taille choisie, la forme exacte du plateau et le minimum — parce que c'est
// ce que le bloc imprimé doit dessiner et ce que le corrigé doit annoncer.
//
// LE MINIMUM N'EST PAS ÉCRIT À LA MAIN. Il sort de la table des distances,
// calculée une fois pour toutes au premier appel. C'est la seule manière
// honnête de l'annoncer sur une feuille qu'un élève va garder : personne ne
// peut faire mieux, et ce n'est pas une estimation.

import { makeItem } from '../items.js';
import { TAILLES_PARKING, plateauParking, minimumParking } from '../parking.js';

export const parkingFicheGenerator = {
    id: 'defi.parking-fiche',
    label: 'Le Parking — jeu à découper',
    skills: ['defi.parking'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Voitures de chaque côté', default: 'moyen',
            aide: 'Le plateau de la revue est le 4 contre 4. Attention : le nombre de coups grimpe très vite — 36, 62, 104, 146 — parce que tout doit passer par une voie où l\'on ne se double pas.',
            options: Object.values(TAILLES_PARKING).map(t => ({ value: t.id, label: t.label }))
        }
    ],

    generate(params, ctx) {
        const p = params || {};
        const t = TAILLES_PARKING[p.taille] || TAILLES_PARKING.moyen;
        const plateau = plateauParking(t.n);
        const mini = minimumParking(t.n);
        return makeItem({
            seed: ctx.rng.seed,
            generatorId: 'defi.parking-fiche',
            skillId: 'defi.parking',
            answerKind: 'grid',
            prompt: {
                text: `Le parking, ${t.n} contre ${t.n} — ${mini} coups au minimum.`,
                papier: 'Le parking — jeu à découper.',
                html: `<div class="game-question">Le parking, ${t.n} contre ${t.n} — ${mini} coups au minimum.</div>`
            },
            answer: `${mini} coups`,
            explanation: `Il faut au moins ${mini} coups, et c'est démontré : l'ordinateur a exploré `
                + `TOUTES les positions du plateau et compté la plus courte route. La clef est la place `
                + `sous la voie — c'est la seule où une voiture peut se ranger pour en laisser passer `
                + `une autre. Sans elle, rien ne se croise et le jeu est impossible.`,
            difficulty: Math.min(4, Math.max(1, t.n - 1)),
            // Le rendu imprimé redessine le plateau case par case : il lui faut
            // la forme, pas seulement la taille. On la lui passe ici plutôt que
            // de la recalculer à l'impression, pour que la feuille et l'écran
            // ne puissent pas diverger.
            meta: {
                taille: t.id, n: t.n, mini,
                cases: plateau.cases.map(c => ({ x: c.x, y: c.y, zone: c.zone })),
                hauteur: plateau.hauteur
            }
        });
    }
};
