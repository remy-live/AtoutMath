// LE VOL DES PETITES AILES — les sauts, les montées, et les arrêts.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUXIÈME OUTIL DE CE JEU PERDU DANS `tools/tmp/`. Le commentaire du
// battement d'ailes cite ses chiffres — « MESURÉ, SOIXANTE SECONDES, QUATRE
// FAÇONS DE JOUER (tools/tmp/volAiles.mjs) » — et le fichier n'existe plus.
// Celui-ci est gardé.
//
// ── CE QU'IL MESURE, ET POURQUOI CES TROIS-LÀ ─────────────────────────────
//
// RÉMY, le 17 novembre, en jouant :
//
//   · « il faut que les sauts soient plus spectaculaires » ;
//   · « si l'oiseau s'arrête et bien on a perdu » ;
//   · « là même en montée ça continue à glisser ».
//
// Les trois se tiennent, et aucune ne se lit dans le code : il faut courir.
// Un saut « spectaculaire » est une hauteur et une durée ; « s'arrêter » est
// une vitesse qui tombe et qui y reste ; « glisser en montée » est une vitesse
// qui ne baisse pas quand la pente monte. On mesure donc exactement cela.
//
//     node tools/volDesAiles.mjs           # le premier monde, trois joueurs
//     node tools/volDesAiles.mjs --tous    # les treize mondes
import {
    MONDES, LONGUEUR_MONDE, relief, pas, etatInitial, VX_MIN, departDuMonde, dansLaMer
} from '../js/core/petitesAiles.js';

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;
const JOUEURS = [['au bon moment', PARFAIT], ['jamais', JAMAIS], ['sans arrêt', TOUJOURS]];
const GRAINES = [0.7, 1.9, 3.3];

/**
 * Soixante secondes de vol, et tout ce qu'on peut en dire.
 *
 * ON PART OÙ LE JOUEUR ATTERRIT, pas au début arithmétique du monde : depuis le
 * 18 novembre, `(id − 1) × 6400` est la gueule du vide, et l'oiseau y naissait
 * au-dessus de la mer. Voir `departDuMonde` dans le noyau.
 */
function voler(monde, joue, secondes = 60, graine = 0.7) {
    const depart = departDuMonde(monde.id);
    let e = etatInitial(graine, depart);
    const vols = [];
    let vol = null, auSol = 0, n = 0;
    // UN ARRÊT N'EST PAS UNE IMAGE LENTE : c'est une vitesse basse qui DURE.
    // Sans la durée, le moindre creux compterait pour un arrêt.
    let basDepuis = 0, arrets = 0, enArret = false;
    let montee = { v: 0, n: 0 }, descente = { v: 0, n: 0 };

    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, graine);
        const avant = e;
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
        n++;
        if (e.auSol) {
            auSol++;
            // `pente` est positive quand le sol MONTE vers la droite ; on ne
            // compte que les pentes franches, pour ne pas noyer la mesure dans
            // les plats.
            if (sol.pente > 0.25) { montee.v += e.vx; montee.n++; }
            else if (sol.pente < -0.25) { descente.v += e.vx; descente.n++; }
        }
        if (!avant.auSol && e.auSol && vol) {
            vol.fin = e.x; vol.duree = t - vol.t0;
            if (vol.duree > 0.08) vols.push(vol);
            vol = null;
        }
        if (avant.auSol && !e.auSol) vol = { t0: t, debut: e.x, haut: 0 };
        if (vol) vol.haut = Math.max(vol.haut, e.y - relief(e.x, graine).hauteur);

        if (e.vx < 90) {
            basDepuis += 1 / 60;
            if (basDepuis > 0.6 && !enArret) { arrets++; enArret = true; }
        } else { basDepuis = 0; enArret = false; }
    }
    const moy = (l, f) => (l.length ? l.reduce((s, x) => s + f(x), 0) / l.length : 0);
    return {
        vitesse: (e.x - depart) / secondes,
        vols: vols.length,
        duree: moy(vols, v => v.duree),
        haut: moy(vols, v => v.haut),
        long: moy(vols, v => v.fin - v.debut),
        auSol: auSol / n,
        arrets,
        vMontee: montee.n ? montee.v / montee.n : 0,
        vDescente: descente.n ? descente.v / descente.n : 0
    };
}

/** La moyenne des trois paysages — un seul en dirait trop peu. */
function mesurer(monde, joue) {
    const tout = GRAINES.map(g => voler(monde, joue, 60, g));
    const m = (c) => tout.reduce((s, x) => s + x[c], 0) / tout.length;
    return {
        vitesse: m('vitesse'), vols: m('vols'), duree: m('duree'), haut: m('haut'),
        long: m('long'), auSol: m('auSol'), arrets: m('arrets'),
        vMontee: m('vMontee'), vDescente: m('vDescente')
    };
}

const tous = process.argv.includes('--tous');
const liste = tous ? MONDES : [MONDES[0], MONDES[5], MONDES[MONDES.length - 1]];

console.log(`\n  (plancher de vitesse : ${VX_MIN} px/s)`);
for (const monde of liste) {
    console.log(`\n  ── ${monde.id}. ${monde.nom} ─────────────────────────────────`);
    console.log('     joueur          vitesse  vols  durée  hauteur  longueur  au sol'
        + '  arrêts   v montée  v descente');
    for (const [nom, joue] of JOUEURS) {
        const r = mesurer(monde, joue);
        console.log(`     ${nom.padEnd(14)}${String(Math.round(r.vitesse)).padStart(7)}`
            + `${String(Math.round(r.vols)).padStart(6)}`
            + `${(r.duree.toFixed(2) + ' s').padStart(8)}`
            + `${(Math.round(r.haut) + ' px').padStart(9)}`
            + `${(Math.round(r.long) + ' px').padStart(10)}`
            + `${(Math.round(r.auSol * 100) + ' %').padStart(8)}`
            + `${String(Math.round(r.arrets)).padStart(8)}`
            + `${String(Math.round(r.vMontee)).padStart(11)}`
            + `${String(Math.round(r.vDescente)).padStart(12)}`);
    }
}

console.log('\n  CE QU\'ON LIT :');
console.log('   · « spectaculaire » se lit dans HAUTEUR et DURÉE — un vol de 60 px');
console.log('     et 0,14 s n\'est pas un saut, c\'est une vibration ;');
console.log('   · « il glisse même en montée » se lit en comparant V MONTÉE et');
console.log('     V DESCENTE : si les deux se valent, la côte ne coûte rien ;');
console.log('   · « s\'il s\'arrête, on a perdu » suppose qu\'il PUISSE s\'arrêter —');
console.log('     la colonne ARRÊTS doit cesser d\'être à zéro pour qui joue mal.\n');
