// LE SAUT DE FIN DE MONDE — le profil du tremplin, et ce qu'on en tire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 20 novembre, quatre captures de Tiny Wings à l'appui : « à la fin d'un
// monde, ça descend FORT et on saute et ça peut aller SUPER HAUT, comme si le
// poussin était super lourd ».
//
// ── POURQUOI CET OUTIL EXISTE, ALORS QUE LES ÉPREUVES MESURENT DÉJÀ ─────────
//
// `tests/petitesAiles.test.mjs` tient des BORNES : la rampe entre 37° et 50°,
// la portion raide sous 400 pixels, le vol plané au-dessus d'une seconde. Elles
// disent qu'on n'a rien cassé. Elles ne disent pas CE QU'ON VOIT — et la phrase
// de Rémy parle de ce qu'on voit : est-ce que ça descend fort, est-ce que ça
// monte haut.
//
// Trois nombres y répondent, et aucun n'est dans une garde :
//
//   · la PROFONDEUR du creux, qui est la sensation de poids ;
//   · l'APEX au-dessus de la lèvre, qui est le « super haut » ;
//   · le TEMPS EN L'AIR, qui est ce qui rend le vol plané lisible.
//
// ── ET LE RÉGLAGE SE FAIT EN TROIS NOMBRES QUI SE TIENNENT ─────────────────
//
// Creuser la plongée fait descendre la lèvre, donc le trou cesse d'être un
// trou ; relever la rampe pour la rattraper la raidit, donc on retombe dans le
// mur que Rémy a refusé le 19 novembre ; allonger la rampe pour l'adoucir fait
// grandir sa portion raide, que la garde borne à 400 pixels. Les trois se
// payent l'un l'autre, et c'est pourquoi on les imprime ENSEMBLE.
//
//     node tools/sautDesAiles.mjs

// ON IMPORTE LE MODULE ENTIER, ET C'EST VOLONTAIRE.
//
// Cette sonde doit pouvoir tourner sur la version D'AVANT — `git stash`, on
// mesure, on dépile — parce qu'« un rouge ancien ressemble à un rouge neuf »
// et qu'un chiffre sans son avant ne dit rien. Avec des imports nommés, une
// constante qui n'existait pas encore (`IMPULSION_TREMPLIN`) fait échouer le
// chargement du fichier entier, et la comparaison devient impossible au moment
// précis où l'on en a besoin.
import * as A from '../js/core/petitesAiles.js';
const { pas, etatInitial, relief, MONDES, bordsDuVide,
    LONGUEUR_TREMPLIN, TREMPLIN, SAUT_TREMPLIN, VX_MAX } = A;

const GRAINES = [0.7, 1.9, 3.3];

/**
 * LA FENÊTRE OÙ L'ON REGARDE, ET ELLE NE SUIT PAS LE TREMPLIN.
 *
 * Premier jet : on regardait « les `LONGUEUR_TREMPLIN` derniers pixels ». En
 * allongeant le tremplin de 980 à 1 300, la fenêtre a donc grandi avec lui — et
 * les deux mesures, celle d'avant et celle d'après, ne parlaient plus du même
 * morceau de terrain. On a cru à un réglage raté pendant un quart d'heure.
 *
 * UNE MESURE QUI CHANGE AVEC CE QU'ELLE MESURE NE COMPARE RIEN. Quinze cents
 * pixels, fixes, quoi qu'on fasse du tremplin.
 */
const FENETRE = 1500;
const deg = (p) => `${(Math.atan(Math.abs(p)) * 180 / Math.PI).toFixed(0)}°`;

/* ── LE PROFIL DU TERRAIN ────────────────────────────────────────────────
 *
 * On lit le tremplin SUR LE RELIEF, jamais sur les constantes : `relief`
 * mélange le tremplin au reste du paysage, et deux essais de réglage se sont
 * trompés d'un tiers en raisonnant sur les seules constantes.
 */
const b0 = bordsDuVide(0);
let plonge = 0, rampe = 0, raide = 0, creux = 0;
const levre = relief(b0.debut - 2, 0.7).hauteur;
const plateau = relief(b0.debut - LONGUEUR_TREMPLIN - 2, 0.7).hauteur;
for (let x = b0.debut - LONGUEUR_TREMPLIN; x < b0.debut; x += 2) {
    const s = relief(x, 0.7);
    plonge = Math.min(plonge, s.pente);
    rampe = Math.max(rampe, s.pente);
    creux = Math.min(creux, s.hauteur - plateau);
    if (s.pente > 0.4) raide += 2;
}

console.log('\n\x1b[1mLE TREMPLIN, SUR LE TERRAIN\x1b[0m');
console.log(`  longueur ................ ${LONGUEUR_TREMPLIN} px`
    + `   (plongée ${TREMPLIN}, rampe ${SAUT_TREMPLIN})`);
console.log(`  plongée ................. ${deg(plonge)}   creux de ${Math.round(-creux)} px`);
console.log(`  rampe ................... ${deg(rampe)}   \x1b[2m(garde : entre 37° et 50°)\x1b[0m`);
console.log(`  portion raide ........... ${raide} px   \x1b[2m(garde : moins de 400)\x1b[0m`);
console.log(`  lèvre ................... ${Math.round(levre - plateau)} px sous le plateau`);

/* ── CE QU'ON EN TIRE, SUR LES DOUZE FRONTIÈRES ──────────────────────────
 *
 * DEUX JOUEURS, PARCE QU'UN SEUL NE DIT RIEN. Le coup d'ailes de la frontière
 * s'achète dans la plongée (`elanDuTremplin`) : si celui qui ne fait rien
 * sautait aussi haut, on aurait payé l'immobilité — c'est la faute que ce
 * fichier a déjà commise trois fois, et une garde est tombée dessus.
 */
const JOUEURS = [
    ['LE BON GESTE   ', (x, g) => relief(x, g).pente < 0],
    ['NE RIEN FAIRE  ', () => false]
];

for (const [nom, geste] of JOUEURS) {
    let somme = 0, n = 0, bas = 1e9, haut = -1e9, vite = 0, lent = 1e9, tMax = 0;
    for (const g of GRAINES) {
        for (let k = 0; k < MONDES.length - 1; k++) {
            const b = bordsDuVide(k);
            const lev = relief(b.debut - 2, g).hauteur;
            let e = etatInitial(g, b.debut - FENETRE - 1600);
            let apex = -1e9, vole = 0, vLevre = 0, vu = false;
            for (let t = 0; t < 40 && e.x < b.fin + 3000; t += 1 / 60) {
                const avant = e;
                e = pas(e, 1 / 60, geste(e.x, g), g);
                if (e.x > b.debut - FENETRE) {
                    // LA VITESSE QUI COMPTE EST CELLE DU DÉCOLLAGE, pas celle
                    // de la lèvre : le coup d'ailes se donne là, et l'oiseau
                    // est déjà en l'air quand il passe le bord. Mesurer au
                    // bord disait 239 px/s là où le décollage en voyait 850,
                    // et ce seul décalage a fait croire à un réglage raté.
                    if (avant.auSol && !e.auSol) vLevre = e.vx;
                    if (!e.auSol) { vole += 1 / 60; apex = Math.max(apex, e.y); vu = true; }
                    if (vu && e.auSol && e.x > b.debut) break;
                }
            }
            const h = apex - lev;
            somme += h; n++;
            bas = Math.min(bas, h); haut = Math.max(haut, h);
            vite = Math.max(vite, vLevre); lent = Math.min(lent, vLevre);
            tMax = Math.max(tMax, vole);
        }
    }
    console.log(`\n\x1b[1m${nom}\x1b[0m  (${n} frontières × graines)`);
    console.log(`  apex au-dessus de la lèvre ... ${Math.round(bas)} à ${Math.round(haut)} px, `
        + `moyenne \x1b[1m${Math.round(somme / n)}\x1b[0m`);
    console.log(`  vitesse au décollage ........ ${Math.round(lent)} à ${Math.round(vite)} px/s`
        + `   \x1b[2m(plafond ${VX_MAX})\x1b[0m`);
    console.log(`  plus long temps en l'air .... ${tMax.toFixed(2)} s`);
}

console.log(A.IMPULSION_TREMPLIN === undefined
    ? '\n\x1b[2mCette version n\u2019a pas encore de coup d\u2019ailes de frontière.\x1b[0m\n'
    : `\n\x1b[2mCoup d'ailes de la frontière : ${A.IMPULSION_TREMPLIN} à partir de `
        + `${A.VITESSE_TREMPLIN_PLEIN} px/s, 200 sous ${A.VITESSE_TREMPLIN}.\x1b[0m\n`);
