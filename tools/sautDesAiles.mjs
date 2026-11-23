// LE SAUT DE FIN D'ÎLE — le profil du tremplin, et ce qu'on en tire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 22 novembre : « Avant la fin d'un monde je veux juste une plus longue
// descente et un tremplin qui permet de faire un super long saut. »
//
// ── POURQUOI CET OUTIL EXISTE, ALORS QUE LES ÉPREUVES MESURENT DÉJÀ ─────────
//
// `tests/petitesAiles.test.mjs` tient des BORNES : le saut porte à plus de
// 2 400 pixels, celui qui ne fait rien n'en porte pas autant. Elles disent
// qu'on n'a rien cassé. Elles ne disent pas CE QU'ON VOIT — et la phrase de
// Rémy parle de ce qu'on voit.
//
// Quatre nombres y répondent, et aucun n'est dans une garde : la hauteur du
// sommet, la pente de la méga-descente, la vitesse à laquelle on arrive au
// tremplin, et la PORTÉE du vol comparée à la largeur de la mer.
//
// ── ET LA LARGEUR DE LA MER EST LE RÉGLAGE, PAS LA PORTÉE ──────────────────
//
// C'est elle qui sépare les deux joueurs : entre 1 910 (celui qui se laisse
// rouler) et 2 780 (celui qui a plongé), le même détroit fait retomber l'un
// dans l'eau et l'autre sur l'île d'en face. En dehors de cette fenêtre, la
// descente de 1 900 pixels ne mesure plus rien.
//
//     node tools/sautDesAiles.mjs

import * as A from '../js/core/petitesAiles.js';
const { Relief, etatInitial, pas, NIVEAU_MER, MEGA_DESCENTE, LONGUEUR_TREMPLIN } = A;

const GRAINES = ['une', 'deux', 'trois'];
const deg = (p) => `${(Math.atan(Math.abs(p)) * 180 / Math.PI).toFixed(0)}°`;

/* ── LE PROFIL DU TERRAIN ────────────────────────────────────────────────
 *
 * On lit la fin d'île SUR LE RELIEF, jamais sur les seules constantes :
 * `echantillon` lisse les points de contrôle, et deux réglages se sont
 * trompés d'un tiers pour avoir raisonné sur les constantes.
 */
const r0 = new Relief('une');
r0.assurerJusqua(30000);
const i0 = r0.iles[0];
let plonge = 0, rampe = 0;
for (let x = i0.sommetX; x < i0.levreX; x += 4) {
    const s = r0.echantillon(x);
    plonge = Math.max(plonge, s.pente);
    rampe = Math.min(rampe, s.pente);
}
const sommet = r0.echantillon(i0.sommetX).y;
const bas = r0.echantillon(i0.basDescenteX).y;
const levre = r0.echantillon(i0.levreX).y;

console.log('\n\x1b[1mLA FIN D\'UNE ÎLE, SUR LE TERRAIN\x1b[0m');
console.log(`  sommet .................. y = ${Math.round(sommet)}`);
console.log(`  méga-descente ........... ${MEGA_DESCENTE} px pour ${Math.round(bas - sommet)}`
    + ` de dénivelé, au plus raide ${deg(plonge)}`);
console.log(`  tremplin ................ ${LONGUEUR_TREMPLIN} px, remonte de `
    + `${Math.round(bas - levre)} px, au plus raide ${deg(rampe)}`);
console.log(`  lèvre ................... y = ${Math.round(levre)}`
    + `   \x1b[2m(le niveau de la mer est à ${NIVEAU_MER})\x1b[0m`);

/* ── CE QU'ON EN TIRE, SUR LES DEUX JOUEURS ──────────────────────────────
 *
 * DEUX JOUEURS, PARCE QU'UN SEUL NE DIT RIEN. Si celui qui ne fait rien
 * franchissait aussi bien, on aurait payé l'immobilité — c'est la faute que ce
 * jeu a déjà commise trois fois, et une garde est tombée dessus la quatrième.
 */
const JOUEURS = [
    ['LE BON GESTE  ', (s) => s.pente > 0],
    ['NE RIEN FAIRE ', () => false]
];

for (const [nom, geste] of JOUEURS) {
    let n = 0, somme = 0, court = 1e9, long = 0, vSomme = 0, secs = 0, dureeMax = 0;
    for (const g of GRAINES) {
        const relief = new Relief(g);
        let e = etatInitial(relief);
        let vol = null;
        for (let t = 0; t < 260 && !A.nuitTombee(e.nuit) && n < 60; t += 1 / 60) {
            const av = e;
            e = pas(e, 1 / 60, geste(relief.echantillon(e.x)), relief);
            if (e.evenement?.quoi === 'catapulte') {
                vol = { x0: e.x, t0: t, v: e.evenement.vitesse, mouille: false };
            } else if (vol && e.evenement?.quoi === 'ricochet') vol.mouille = true;
            if (vol && !av.auSol && e.auSol) {
                const portee = e.x - vol.x0;
                n++; somme += portee; vSomme += vol.v;
                court = Math.min(court, portee); long = Math.max(long, portee);
                dureeMax = Math.max(dureeMax, t - vol.t0);
                if (!vol.mouille) secs++;
                vol = null;
            }
        }
    }
    if (!n) { console.log(`\n\x1b[1m${nom}\x1b[0m  aucun saut mesuré`); continue; }
    console.log(`\n\x1b[1m${nom}\x1b[0m  (${n} sauts)`);
    console.log(`  vitesse à la catapulte .. ${Math.round(vSomme / n)} px/s`);
    console.log(`  portée .................. ${Math.round(court)} à ${Math.round(long)} px, `
        + `moyenne \x1b[1m${Math.round(somme / n)}\x1b[0m`);
    console.log(`  plus long temps en l'air  ${dureeMax.toFixed(2)} s`);
    console.log(`  retombe à sec ........... ${secs} / ${n}`);
}

// ── ET LA LARGEUR DES MERS, QUI EST LE VRAI RÉGLAGE ────────────────────
console.log('\n\x1b[1mLES MERS À FRANCHIR\x1b[0m');
const r = new Relief('une');
r.assurerJusqua(50000);
for (let k = 0; k + 1 < Math.min(5, r.iles.length); k++) {
    const a = r.iles[k], b = r.iles[k + 1];
    console.log(`  mer ${k + 1} : de la lèvre à la rive d'en face, `
        + `\x1b[1m${Math.round(b.rivageEntreeX - a.levreX)}\x1b[0m px`);
}
console.log('');
