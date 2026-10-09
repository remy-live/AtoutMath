// COMPTER SUR UN SOLIDE — la fiche.
//
// L'écran fait compter en TOUCHANT ; le papier fait compter avec un crayon, et
// c'est un autre exercice. On imprime donc plusieurs solides et, sous chacun,
// un tableau à trois cases : sommets, arêtes, faces. L'élève écrit trois
// nombres et peut se relire — c'est exactement ce qui manque à l'écran, où le
// compte s'efface avec la marque.
//
// La perspective est celle du cours (core/solides.js) : fuyantes à 45°,
// réduites de moitié, arêtes cachées en pointillés. Ce sont les pointillés qui
// font l'exercice : sans eux on compte ce qu'on voit, et l'on se trompe.

import { makeItem } from '../items.js';
import { construire, famillesDe, compter, euler, expliquer, ASPECTS } from '../solides.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

// ── LA PROGRESSION, EN CASES À COCHER ───────────────────────────────────────
//
// Rémy : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
// pouvoir faire les check box comme pour le calcul littéral, tu ne penses
// pas ? — fais tout, ce serait le plus cohérent non ? »
//
// LES TROIS BANDES SE CONTIENNENT — « jusqu'aux bases pentagonales »
// comprend déjà les solides usuels. Cochées toutes les trois, la série monte
// donc du cube à l'octaèdre au lieu de tirer les treize solides au hasard du
// début à la fin : c'est ce que le menu ne savait pas dire.
//
// LA LISTE S'EXPORTE : le générateur du papier (ici), le jeu de l'écran
// (games/solides.js) et la carte du catalogue en vivent, et la carte la
// recopiait à la main. Deux listes qui ne disent pas tout à fait la même chose
// finissent toujours par diverger.
export const LISTE_MARCHES = [
    { id: 'facile', nom: '1. Les solides usuels' },
    { id: 'moyen', nom: "2. Jusqu'aux bases pentagonales" },
    { id: 'tous', nom: '3. Tous, octaèdre compris' }
];
/** Le réglage d'avant les cases — voir `marchesCochees`. */
export const ANCIEN = { cle: 'niveau' };
/** Le réglage tout fait, pour la carte comme pour le générateur. */
export const casesDeSolides = () =>
    paramMarches({ marches: LISTE_MARCHES, mot: 'niveau', ancien: ANCIEN });

export const solidesGenerator = {
    id: 'geo.solides',
    label: 'Compter sur un solide',
    skills: ['geo.espace.denombrer'],
    answerKinds: ['grid'],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        casesDeSolides()
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const bande = String(marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params) || 'tous');
        const choix = famillesDe(bande);
        const solide = construire(rng.pick(choix));
        const e = euler(solide);
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.solides',
            skillId: 'geo.espace.denombrer',
            answerKind: 'grid',
            prompt: {
                text: `Compte les sommets, les arêtes et les faces de ${solide.nom}.`,
                papier: `${solide.nom.charAt(0).toUpperCase()}${solide.nom.slice(1)}`,
                html: `<div class="game-question">${solide.nom}</div>`
            },
            answer: `${e.S}-${e.A}-${e.F}`,
            explanation: ASPECTS.map(a => expliquer(solide, a.id)).join(' '),
            difficulty: solide.famille === 'autre' ? 3 : (solide.n <= 4 ? 1 : 2),
            meta: {
                id: solide.id, nom: solide.nom, famille: solide.famille, n: solide.n,
                sommets: solide.sommets, faces: solide.faces, aretes: solide.aretes,
                compte: { S: e.S, A: e.A, F: e.F }, marche: bande
            }
        });
    }
};
