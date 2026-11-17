// L'ALLURE DE CHAQUE MONDE DES PETITES AILES — et la nuit qu'il peut porter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CET OUTIL A DÉJÀ EXISTÉ, DANS `tools/tmp/`, ET IL A DISPARU. Le commentaire
// de `core/petitesAiles.js` le cite pourtant comme la source des six vitesses
// de nuit : « Les six valeurs sont reposées sur les allures MESURÉES monde par
// monde (tools/tmp/allureMondes.mjs) ». Le jour où Rémy a demandé sept mondes
// de plus, il a fallu le réécrire — et le dépôt dit exactement quoi faire de
// ces outils-là : « on garde ceux qui mesurent quelque chose qu'on voudra
// remesurer ».
//
// ── CE QU'IL MESURE, ET POURQUOI ON NE PEUT PAS LE DEVINER ────────────────
//
// Un monde plus haut et plus serré n'est pas seulement plus beau : il RALENTIT
// l'oiseau. La vitesse qu'on y atteint dépend du relief, de la gravité, du
// moment où l'on plonge — c'est une simulation, pas une formule. Fixer la
// vitesse de la nuit sans l'avoir mesurée, c'est tirer au sort si le monde est
// jouable.
//
// TROIS JOUEURS, LES MÊMES PAYSAGES :
//
//   · PARFAIT  plonge dans chaque descente et lâche dans chaque montée ;
//   · JAMAIS   ne touche à rien ;
//   · TOUJOURS appuie sans arrêt.
//
// TROIS RÈGLES, QUE LE JEU DOIT TENIR DANS CHAQUE MONDE :
//
//   1. la nuit reste sous 90 % de l'allure PARFAITE — sinon le monde est
//      impossible, même en jouant bien ;
//   2. le PREMIER monde pardonne : sa nuit est plus lente que JAMAIS, on y
//      apprend le geste sans perdre ;
//   3. le DERNIER ne pardonne plus : sa nuit est plus rapide que JAMAIS,
//      l'immobilité s'y paie.
//
//     node tools/allureDesMondes.mjs            # le tableau et le verdict
//     node tools/allureDesMondes.mjs --loin     # jusqu'où va une partie
//     node tools/allureDesMondes.mjs --nuits    # les `nuit:` à recopier
//
// ── POURQUOI `--nuits` EXISTE ──────────────────────────────────────────────
//
// LES TREIZE VITESSES DE NUIT SONT DÉRIVÉES, PAS CHOISIES. Elles valent une
// fraction de l'allure MESURÉE du bon joueur — donc toute retouche à la
// physique les périme toutes en même temps, et le tableau se couvre de « NUIT
// TROP RAPIDE » sans qu'aucun monde ait changé. On les a recalculées à la main
// deux fois ; la deuxième, treize lignes à reporter une par une.
//
// La pression monte de 60 % au premier monde à 86 % au SIXIÈME, puis s'y
// tient : c'est la difficulté, et elle ne peut pas venir du relief seul, qui
// doit rester franchissable. Voir `MONTEE` dans le noyau. Le premier monde
// garde en plus une borne dure — sa nuit reste sous l'allure de qui ne touche
// à rien, car on y apprend le geste.
import {
    MONDES, LONGUEUR_MONDE, relief, pas, etatInitial, penteMax, MONTEE
} from '../js/core/petitesAiles.js';

/** L'angle le plus raide d'un monde, en degrés. Au-delà de 65°, c'est un mur. */
const degres = (m) => Math.atan(penteMax(m)) * 180 / Math.PI;

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;
const GRAINES = [0.7, 1.9, 3.3];

/** Une course de `secondes` dans un monde, et la vitesse moyenne obtenue. */
function courir(monde, joue, secondes = 30, graine = 0.7) {
    let e = etatInitial(graine, (monde.id - 1) * LONGUEUR_MONDE);
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
    }
    const depart = (monde.id - 1) * LONGUEUR_MONDE;
    return (e.x - depart) / secondes;
}

/** L'allure moyenne sur les trois paysages — un seul en dirait trop peu. */
const allure = (monde, joue) =>
    GRAINES.reduce((s, g) => s + courir(monde, joue, 30, g), 0) / GRAINES.length;

/**
 * JUSQU'OÙ VA UNE PARTIE, en vrai.
 *
 * LA QUESTION QUI DÉCIDE S'IL FAUT AJOUTER DES MONDES OU LES RACCOURCIR : un
 * monde que personne n'atteint est un décor qu'on n'a pas dessiné. On fait
 * donc courir le bon joueur, la nuit à ses trousses, et l'on regarde où il en
 * est quand elle le rattrape.
 */
function jusquOu(joue, graine = 0.7) {
    let e = etatInitial(graine, 0);
    let nuit = -600;                      // elle commence derrière l'oiseau
    for (let t = 0; t < 600; t += 1 / 60) {
        const sol = relief(e.x, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
        const m = MONDES[Math.max(0, Math.min(MONDES.length - 1,
            Math.floor(e.x / LONGUEUR_MONDE)))];
        nuit += m.nuit / 60;
        if (nuit >= e.x) return { x: e.x, t, monde: m.id };
    }
    return { x: e.x, t: 600, monde: MONDES.length };
}

const loin = process.argv.includes('--loin');
const nuits = process.argv.includes('--nuits');
let fautes = 0;

// ── CE QU'UNE NUIT DOIT FAIRE, ET CE N'EST PLUS UNE SEULE CHOSE ───────────
//
// RÉMY : « clairement aux petites ailes, je ne peux pas perdre même si je ne
// fais rien ». La nuit était réglée sur la seule allure du BON joueur — une
// fraction de ce qu'il fait —, et comme l'oiseau qu'on abandonne croisait à
// 82 % de cette allure, elle ne le rattrapait jamais.
//
// UNE NUIT EST MAINTENANT PRISE EN SANDWICH :
//
//   · au-dessus de ce que fait l'oiseau abandonné, sinon ne rien faire gagne ;
//   · au-dessous de ce que fait le bon joueur, sinon le monde est impossible.
//
// Ce sandwich n'existait pas avant : l'écart entre les deux valait 1,19, et
// une nuit qui rattrape l'un rattrape l'autre. Il a fallu changer le
// BATTEMENT D'AILES pour l'ouvrir — voir `VITESSE_BATTEMENT`. L'écart vaut
// maintenant 1,5, et il y a de la place entre les deux.
//
// LE PREMIER MONDE RESTE LA SEULE EXCEPTION : on y apprend le geste, et l'on
// n'y perd pas en apprenant.
const pressionVoulue = (rang) =>
    rang >= MONTEE - 1 ? 0.78 : 0.56 + 0.22 * rang / (MONTEE - 1);
/** Ce que la nuit doit dépasser pour que ne rien faire fasse perdre. */
const PLANCHER_JAMAIS = 1.18;
/** Et ce qu'elle ne doit pas dépasser pour que bien jouer suffise. */
const PLAFOND_PARFAIT = 0.88;

console.log('\n  monde                     ampl.  pér.   nuit  pente  ·  PARFAIT  JAMAIS  TOUJOURS'
    + '  ·  nuit max  pression');
for (const m of MONDES) {
    const p = allure(m, PARFAIT), j = allure(m, JAMAIS), tj = allure(m, TOUJOURS);
    const plafond = Math.floor(p * 0.9);
    const ennuis = [];
    if (m.nuit >= p * 0.9) ennuis.push('NUIT TROP RAPIDE');
    if (p <= j * 1.1) ennuis.push('ne rien faire vaut bien jouer');
    if (p <= tj * 1.05) ennuis.push('appuyer sans arrêt bat le jeu parfait');
    if (m.id === 1 && m.nuit >= j) ennuis.push('le premier monde ne pardonne pas');
    if (m.id === MONDES.length && m.nuit <= j) ennuis.push('le dernier monde pardonne encore');
    // LA PENTE EST UNE BORNE DURE, et elle s'oublie : « on ne glisse pas sur
    // un mur, quelle que soit la façon dont on écrit la gravité ». Elle monte
    // avec amplitude ÷ période, et c'est elle qui interdit de durcir sans fin.
    const d = degres(m);
    if (d >= 65) ennuis.push(`${d.toFixed(0)}° : c'est une falaise`);
    if (d <= 30) ennuis.push(`${d.toFixed(0)}° : c'est une plaine`);
    if (ennuis.length) fautes++;
    console.log(`  ${String(m.id).padStart(2)}. ${m.nom.padEnd(22)}`
        + `${String(m.amplitude).padStart(4)}${String(m.periode).padStart(7)}`
        + `${String(m.nuit).padStart(7)}${(d.toFixed(0) + '°').padStart(7)}`
        + `  ·  ${String(Math.round(p)).padStart(7)}`
        + `${String(Math.round(j)).padStart(8)}${String(Math.round(tj)).padStart(10)}`
        + `  ·  ${String(plafond).padStart(8)}`
        + `${(Math.round(100 * m.nuit / p) + ' %').padStart(10)}`
        + (ennuis.length ? '   ← ' + ennuis.join(' ; ') : ''));
}

if (loin) {
    console.log('\n  JUSQU\'OÙ VA UNE PARTIE, avant que la nuit rattrape :');
    for (const g of GRAINES) {
        const bon = jusquOu(PARFAIT, g);
        const rien = jusquOu(JAMAIS, g);
        // LE TEMPS DIT CE QUE LA DISTANCE CACHE. « Rattrapé au monde 6 » peut
        // vouloir dire trente secondes ou trois minutes, et ce n'est pas le
        // même jeu — Rémy, en jouant : « je ne peux pas perdre même si je ne
        // fais rien ».
        console.log(`    paysage ${g} · bien joué : monde ${bon.monde}, `
            + `${Math.round(bon.x)} px en ${bon.t.toFixed(0)} s`
            + `   ·   sans rien faire : monde ${rien.monde}, ${Math.round(rien.x)} px`
            + ` en ${rien.t.toFixed(0)} s`);
    }
    console.log(`\n    (il y a ${MONDES.length} mondes de ${LONGUEUR_MONDE} px, `
        + `soit ${MONDES.length * LONGUEUR_MONDE} px en tout)`);
}

if (nuits) {
    console.log(`\n  LES \`nuit:\` À RECOPIER dans \`MONDES\` (60 % → 86 % au monde ${MONTEE},`
        + ' puis 86 %) :');
    // DEUX CONTRAINTES, PAS UNE, SUR LA MONTÉE — et elles ne disent pas la même
    // chose. L'allure BAISSE quand le relief se raidit, donc une pression qui
    // monte peut donner une nuit plus LENTE que celle du monde précédent. Or on
    // veut les deux : la nuit plus rapide en valeur brute (on la voit courir) ET
    // plus serrée en proportion (c'est elle, la difficulté). On prend donc, à
    // chaque pas, le plus contraignant des trois. Le tableau dira « NUIT TROP
    // RAPIDE » si la borne des 90 % ne tient plus.
    let avant = 0, pressionAvant = 0;
    MONDES.forEach((m, rang) => {
        const p = allure(m, PARFAIT);
        const j = allure(m, JAMAIS);
        let n = Math.round(p * pressionVoulue(rang) / 5) * 5;
        // NE RIEN FAIRE DOIT PERDRE, dès le second monde. Le premier pardonne.
        if (rang > 0) n = Math.max(n, Math.ceil(j * PLANCHER_JAMAIS / 5) * 5);
        if (rang > 0 && rang < MONTEE) {
            // UN POINT DE POURCENTAGE DE MARGE, PAS UN PIXEL : à `+ 5 px`, deux
            // mondes voisins sortaient à 86,43 % et 86,46 % — l'épreuve passait,
            // et le moindre nouveau réglage la faisait tomber sans rien dire de
            // vrai sur le jeu. On demande donc que la nuit serre VISIBLEMENT
            // plus fort qu'au monde d'avant.
            //
            // ET LA VALEUR BRUTE N'EST PLUS CONTRAINTE. Elle l'était — « on la
            // voit courir » —, et c'est cette contrainte-là qui poussait les
            // mondes 4, 5 et 6 jusqu'à 88 % pendant que les suivants restaient
            // à 78 % : une difficulté en bosse au milieu du jeu, que personne
            // n'avait voulue. Les allures BAISSENT quand le relief se raidit ;
            // exiger une nuit plus rapide en pixels revient à exiger une nuit
            // bien plus serrée en proportion, ce qui n'est pas la même chose.
            n = Math.max(n, Math.ceil((pressionAvant + 0.01) * p / 5) * 5);
        }
        // LE PREMIER MONDE PARDONNE, ET C'EST UNE BORNE DURE : sa nuit reste
        // sous l'allure de qui ne touche à rien. Le DERNIER ne pardonne plus.
        if (rang === 0) n = Math.min(n, Math.floor(allure(m, JAMAIS) * 0.95 / 5) * 5);
        if (rang === MONDES.length - 1) n = Math.max(n, Math.ceil(j * 1.05 / 5) * 5);
        // ── LE PLAFOND SE POSE EN DERNIER, ET C'EST TOUT CE QUI COMPTE ─────
        //
        // Écrit d'abord au milieu des autres bornes, il était ensuite écrasé
        // par celles qui montent — la nuit du sixième monde ressortait à 90 %
        // de l'allure parfaite alors qu'on venait de la plafonner à 88. Une
        // borne qui ne vient pas en dernier n'est pas une borne.
        n = Math.min(n, Math.floor(p * PLAFOND_PARFAIT / 5) * 5);
        avant = n; pressionAvant = n / p;
        console.log(`    ${String(m.id).padStart(2)}. ${m.nom.padEnd(22)} nuit: ${String(n).padStart(4)},`
            + `   (${m.nuit} aujourd'hui, soit ${Math.round(100 * m.nuit / p)} % au lieu de `
            + `${Math.round(100 * n / p)} %)`);
    });
    console.log('');
}

// ── ET LA RÈGLE QUI MANQUAIT : NE RIEN FAIRE DOIT PERDRE ──────────────────
//
// RÉMY, en jouant : « clairement aux petites ailes, je ne peux pas perdre même
// si je ne fais rien ».
//
// CET OUTIL LE DISAIT DÉJÀ, ET JE NE L'AVAIS PAS LU COMME IL FALLAIT. Il
// imprimait « sans rien faire : monde 6, 36 928 px », et je m'en étais
// contenté : la nuit finit par rattraper, donc la règle tient. Mais une
// DISTANCE ne dit pas une DURÉE. En secondes, c'était quatre-vingt-treize — une
// minute et demie à ne toucher à rien avant de perdre, et aucun élève ne va
// jusque-là : il repose la tablette en disant « on ne perd pas ».
//
// UNE OBSERVATION QU'ON LIT NE VAUT RIEN TANT QU'ELLE N'EST PAS UNE RÈGLE.
// Celle-ci en est une maintenant, avec son chiffre : quatre-vingt-dix secondes,
// c'est déjà long pour un élève de sixième qui essaie « et si je ne fais
// rien ? » — au-delà, il ne voit pas la fin.
const PATIENCE = 90;
const abandons = GRAINES.map(g => jusquOu(JAMAIS, g));
const pire = Math.max(...abandons.map(a => a.t));
if (pire >= PATIENCE) fautes++;
console.log(`\n  NE RIEN FAIRE PERD EN ${abandons.map(a => Math.round(a.t)).join(', ')} s `
    + `(au plus tard ${Math.round(pire)} s, pour ${PATIENCE} de patience)`
    + (pire >= PATIENCE ? '   ← ON NE PERD PAS ASSEZ VITE' : ''));

console.log(fautes === 0
    ? `\nLES ${MONDES.length} MONDES SONT JOUABLES, ET NE RIEN FAIRE Y FAIT PERDRE.\n`
    : `\n${fautes} faute(s).\n`);
process.exit(fautes === 0 ? 0 : 1);
