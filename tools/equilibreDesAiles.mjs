// L'ÉQUILIBRE DES PETITES AILES — ce que valent les trois façons de jouer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL REMPLACE `allureDesMondes.mjs` ET `volDesAiles.mjs`, qui mesuraient un jeu
// qui n'existe plus : treize vitesses de nuit à accorder à treize allures. Le
// jour PASSE maintenant, à une seule vitesse, et ce qu'on regagne vient des
// mers franchies. Il n'y a donc plus treize réglages mais trois nombres, et
// c'est eux qu'on imprime.
//
// ── LA SEULE QUESTION QUI COMPTE ───────────────────────────────────────────
//
// RÉMY : « clairement aux petites ailes, je ne peux pas perdre même si je ne
// fais rien ». Le jeu tient tout entier dans l'écart entre celui qui plonge
// dans les descentes et celui qui n'y touche pas. S'il se referme, il n'y a
// plus de geste à apprendre ; s'il s'ouvre trop, le jeu devient injouable pour
// qui n'a pas encore compris.
//
//     node tools/equilibreDesAiles.mjs

import { Relief, etatInitial, pas, nuitTombee, VITESSE_MAX } from '../js/core/petitesAiles.js';

const GRAINES = ['une', 'deux', 'trois'];
const JOUEURS = [
    ['le bon geste  ', (s) => s.pente > 0],
    ['ne rien faire ', () => false],
    ['appuyer sans arrêt', () => true]
];

/** Une partie entière, jusqu'à la nuit. */
function partie(geste, graine) {
    const r = new Relief(graine);
    let e = etatInitial(r);
    let t = 0, vMax = 0, sauts = 0, plusLong = 0, depart = null;
    let ricochets = 0, parfaites = 0, graines = 0;
    for (; t < 400 && !nuitTombee(e.nuit); t += 1 / 60) {
        const av = e;
        e = pas(e, 1 / 60, geste(r.echantillon(e.x)), r);
        vMax = Math.max(vMax, Math.hypot(e.vx, e.vy));
        if (av.auSol && !e.auSol) { sauts++; depart = e.x; }
        if (depart !== null && e.auSol) { plusLong = Math.max(plusLong, e.x - depart); depart = null; }
        if (e.evenement?.quoi === 'ricochet') ricochets++;
        if (e.evenement?.quoi === 'ile') { if (e.evenement.parfaite) parfaites++; }
        for (const b of r.bonus) {
            if (b.pris || Math.abs(b.x - e.x) > 44 || Math.abs(b.y - e.y) > 48) continue;
            b.pris = true; graines++;
        }
    }
    return { t, x: e.x, ile: e.ile, vMax, sauts, plusLong, ricochets, parfaites, graines };
}

console.log('\n\x1b[1m  joueur               durée   îles  distance  v max  sauts  '
    + 'plus long  parfaites  ricochets  graines\x1b[0m');
const moyennes = {};
for (const [nom, geste] of JOUEURS) {
    const t = GRAINES.map((g) => partie(geste, g));
    const moy = (f) => t.reduce((s, r) => s + f(r), 0) / t.length;
    moyennes[nom.trim()] = moy((r) => r.t);
    console.log(`  ${(nom + '                  ').slice(0, 20)}`
        + `${Math.round(moy((r) => r.t)).toString().padStart(5)} s`
        + `${(moy((r) => r.ile) + 1).toFixed(1).padStart(7)}`
        + `${Math.round(moy((r) => r.x / 10)).toString().padStart(9)} m`
        + `${Math.round(moy((r) => r.vMax)).toString().padStart(7)}`
        + `${Math.round(moy((r) => r.sauts)).toString().padStart(7)}`
        + `${Math.round(moy((r) => r.plusLong)).toString().padStart(11)} px`
        + `${moy((r) => r.parfaites).toFixed(1).padStart(10)}`
        + `${moy((r) => r.ricochets).toFixed(1).padStart(11)}`
        + `${Math.round(moy((r) => r.graines)).toString().padStart(9)}`);
}

console.log(`\n  plafond de vitesse au sol : ${VITESSE_MAX} px/s`);
const bon = moyennes['le bon geste'], rien = moyennes['ne rien faire'];
const ecart = bon / rien;
console.log(`  \x1b[1mécart bon geste / ne rien faire : ${ecart.toFixed(1)} ×\x1b[0m`
    + '   \x1b[2m(la garde en exige 2 au moins)\x1b[0m');
const fautes = [];
if (rien >= 90) fautes.push(`ne rien faire tient ${Math.round(rien)} s : plus de 90, on se lasse`);
if (ecart < 2) fautes.push(`l'écart n'est que de ${ecart.toFixed(1)} × : le geste ne se sent plus`);
console.log(fautes.length
    ? `\n\x1b[31m${fautes.join('\n')}\x1b[0m\n`
    : '\n\x1b[32mLE GESTE PAIE, ET NE RIEN FAIRE FAIT PERDRE.\x1b[0m\n');
