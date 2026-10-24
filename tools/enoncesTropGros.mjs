// LES ÉNONCÉS SONT-ILS À LEUR TAILLE, SUR TOUT LE CATALOGUE ?
//
// RÉMY, capture d'iPhone du 13 octobre : « sur téléphone le texte est gros le
// schéma minuscule ». Déjà, au banc du Mac : « globalement les énoncés ont une
// police énorme ».
//
// `ui/enonce.js` range les énoncés en quatre paliers de longueur — « la
// question doit dominer, pas régner » —, et l'on a trouvé DEUX façons dont ce
// travail restait lettre morte :
//
//   · une ligne de `css/games.css` les annulait tous sous 600 px de large ;
//   · l'observateur qui les POSE n'était installé que pour les jeux, jamais
//     pour les activités — un exercice sur deux.
//
// Cet outil ouvre chaque exercice du catalogue sur un téléphone et MESURE ce
// que l'élève voit : la taille de l'énoncé, le palier posé, celui qu'il
// devrait être, et — quand il y a une figure — la part de l'écran qu'elle
// occupe. C'est lui qui trouvera le prochain chemin oublié.
//
//     node tools/enoncesTropGros.mjs [combien]

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

// En dessous, un énoncé n'est plus lisible au doigt. Au-dessus de la seconde
// borne, sur un téléphone, il règne au lieu de dominer.
//
// 12 ET NON 14, ET C'EST MESURÉ : les jeux de grille — Sudoku, Binairo, Garam,
// Mathdoku, Le Circuit d'Eau, Le Jardin — posent leur consigne à 12,5 ou
// 13,4 px par une règle qui leur est propre, et qui est VOULUE : leur grille
// est ce qu'on regarde, la consigne ne se lit qu'une fois. Vérifié en rangeant
// les correctifs d'un côté : ces six-là mesuraient déjà cela avant. Un outil
// qui crie sur du code sain finit par ne plus être lancé.
const TROP_PETIT = 12;
const TROP_GROS = 30;

const combien = Number(process.argv[2]) || 0;

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

const aOuvrir = await s.page.evaluate(async () => {
    const { exercices } = await import('./js/data/catalog.js');
    return exercices.map(e => ({ id: e.id, titre: e.title }));
});
const liste = combien ? aOuvrir.slice(0, combien) : aOuvrir;
console.log(`${liste.length} exercice(s) à ouvrir sur un téléphone de 390 × 844.\n`);

const soucis = [];
let mesures = 0;
let avecFigure = 0;

for (const exo of liste) {
    try {
        const raté = await s.ouvrirExercice(exo.id);
        if (raté) continue;
        await dormir(700);
    } catch (e) { continue; }

    const vu = await s.page.evaluate(async () => {
        const { palierEnonce } = await import('./js/ui/enonce.js');
        const q = document.querySelector('.game-question');
        if (!q) return null;
        const texte = q.textContent.replace(/\s+/g, ' ').trim();
        if (!texte) return null;
        const board = document.getElementById('game-board');
        const rq = q.getBoundingClientRect();
        const svg = [...board.querySelectorAll('.figure-wrap svg')]
            .map(e => ({ e, r: e.getBoundingClientRect() }))
            .filter(o => o.r.width > 20 && o.r.height > 20)[0];
        let figure = null;
        if (svg) {
            const vb = (svg.e.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
            figure = {
                h: +svg.r.height.toFixed(0),
                echelle: vb.length === 4 && vb[2] && vb[3]
                    ? +Math.min(svg.r.width / vb[2], svg.r.height / vb[3]).toFixed(2) : null
            };
        }
        const plateau = board.getBoundingClientRect().height || 1;
        return {
            longueur: texte.length,
            police: +parseFloat(getComputedStyle(q).fontSize).toFixed(1),
            hauteur: +rq.height.toFixed(0),
            partEcran: +(100 * rq.height / plateau).toFixed(0),
            voulu: palierEnonce(texte) || '(base)',
            // `\w+` S'ARRÊTE AU TRAIT D'UNION : il lisait « --tres » là où la
            // classe est « --tres-long », et l'outil accusait onze exercices
            // sains. Un outil de mesure qui crie sur du code sain finit
            // désactivé — c'est la troisième fois ce mois-ci.
            pose: (q.className.match(/game-question--[\w-]+/) || ['(base)'])[0],
            figure
        };
    });
    if (!vu) continue;
    mesures++;
    if (vu.figure) avecFigure++;

    const ennuis = [];
    if (vu.pose !== vu.voulu) ennuis.push(`palier ${vu.pose} au lieu de ${vu.voulu}`);
    if (vu.police < TROP_PETIT) ennuis.push(`énoncé à ${vu.police} px — illisible`);
    if (vu.police > TROP_GROS) ennuis.push(`énoncé à ${vu.police} px — il règne`);
    // UNE FIGURE RÉDUITE À MOINS DE LA MOITIÉ n'est plus un support de
    // lecture. C'est le seuil que la capture de Rémy donne : il criait à ×0,24.
    if (vu.figure && vu.figure.echelle !== null && vu.figure.echelle < 0.5) {
        ennuis.push(`figure à ×${vu.figure.echelle}`);
    }
    if (ennuis.length) soucis.push({ exo, vu, ennuis });
}

console.log(`${mesures} énoncé(s) mesuré(s), dont ${avecFigure} avec une figure.\n`);
if (!soucis.length) {
    console.log('\x1b[32mTOUS LES ÉNONCÉS SONT À LEUR PALIER, ET AUCUNE FIGURE N\'EST ÉCRASÉE.\x1b[0m');
} else {
    console.log(`\x1b[31m${soucis.length} exercice(s) à regarder :\x1b[0m\n`);
    for (const { exo, vu, ennuis } of soucis) {
        console.log(`  ${exo.titre}  (${exo.id})`);
        console.log(`    ${vu.longueur} car. · ${vu.police} px · ${vu.hauteur} px de haut`
            + ` (${vu.partEcran} % de l'écran)`
            + (vu.figure ? ` · figure ${vu.figure.h} px (×${vu.figure.echelle})` : ''));
        console.log(`    \x1b[33m${ennuis.join(' · ')}\x1b[0m`);
    }
}
await s.fermer();
