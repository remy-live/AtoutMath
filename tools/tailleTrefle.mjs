// LA TAILLE D'UN TRÈFLE SUR LA FEUILLE, EN MILLIMÈTRES, PAR DISPOSITION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Les trèfles prennent toutes une page sur le pdf. »
//
// POURQUOI CE SCRIPT EXISTE. Le commentaire qui défendait « un champ par
// page » annonçait, pour écarter l'autre choix, que deux par page ramèneraient
// les trèfles « à quatre millimètres ». Ce chiffre n'avait jamais été mesuré ;
// il a fait autorité pendant une semaine, et il était faux de moitié — c'est
// 10,2 mm sur le palier par défaut.
//
// La friction est dans `docs/frictions.md` : « un commentaire qui cite une
// mesure fait autorité, et plus personne ne la refait ». Un chiffre qu'on peut
// refaire en deux cents millisecondes ne devrait pas être supposé.
//
//     node tools/tailleTrefle.mjs
//
// Il ne lance pas de navigateur : il REFAIT le calcul de la mise en page
// (`mesuresSlot`, puis l'échelle de `geoTrefles`) sur une A4 paysage. Les
// deux formules sont recopiées ici — c'est le prix à payer pour mesurer sans
// monter un site, et c'est pour cela que ce script DIT ce qu'il suppose : si
// la feuille change, les chiffres d'ici cesseront d'être ceux de la feuille,
// et la sonde `tools/ficheCasseTete.mjs` reste la mesure qui emprunte le
// chemin du professeur.

import { mesuresSlot } from '../js/core/dispositionFiche.js';
import { treflesFicheGenerator } from '../js/core/generators/treflesFiche.js';
import { PALIERS } from '../js/core/champDeTrefles.js';
import { makeRng } from '../js/core/ids.js';

// Ce que `printSheet.js` pose pour une feuille en paysage, et ce que le rendu
// des trèfles déclare dans `RENDUS_CASSETETE.trefles`.
const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
const PROPORTIONS = { w: 4, h: 3 };

/** La boîte d'un bloc, comme `calculerFiche` la remet au rendu. */
const boiteDuBloc = (cols, rows) => {
    const { titreH, slotW, slotH, board, cote } =
        mesuresSlot(PAGE, cols, rows, false, PROPORTIONS);
    const large = Math.min(slotW, Math.max(cote || 0, board));
    return { w: large, h: slotH - titreH };
};

const DISPOSITIONS = [
    ['1 par page', 1, 1], ['2 côte à côte', 2, 1],
    ['2 empilés', 1, 2], ['4 par page', 2, 2]
];

console.log('\n  Diamètre d\'un trèfle sur la feuille, en millimètres.');
console.log('  Un trèfle de revue fait six à huit millimètres.\n');
console.log('  ' + 'palier'.padEnd(16)
    + DISPOSITIONS.map(([nom]) => nom.padStart(15)).join(''));

for (const palier of Object.keys(PALIERS)) {
    const item = treflesFicheGenerator.generate({ palier },
        { rng: makeRng('taille'), index: 0, total: 1, papier: true, themesExclus: [] });
    const m = item.meta;
    // L'ÉTENDUE DESSINÉE, BORDS COMPRIS : `largeur` et `hauteur` bornent les
    // CENTRES, et un trèfle posé au bord déborde d'un rayon. C'est le calcul
    // de `geoTrefles`, et l'oublier faisait sortir les trèfles du cadre.
    const etenduW = m.largeur + 2 * m.rayon, etenduH = m.hauteur + 2 * m.rayon;
    const tailles = DISPOSITIONS.map(([, cols, rows]) => {
        const b = boiteDuBloc(cols, rows);
        const k = Math.min(b.w / etenduW, b.h / etenduH);
        return (2 * m.rayon * k).toFixed(1).padStart(15);
    });
    console.log(`  ${palier.padEnd(16)}${tailles.join('')}`
        + `   ${m.trefles.length} trèfles`);
}

console.log('\n  « 2 empilés » et « 4 par page » donnent le même chiffre : le champ');
console.log('  est plus large que haut, donc à deux rangées c\'est la HAUTEUR qui');
console.log('  borne, et la seconde colonne ne coûte plus rien.\n');
