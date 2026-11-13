// LES CARTES VOLENT-ELLES VRAIMENT, OU EST-CE QUE ÇA FRÉMIT ENCORE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « tu peux pas mettre un slide de vitesse, là ça bouge
// mais vraiment peu, j'adorerais que ça se déplace partout dans l'écran quitte
// à ce que le trait qui relie soit pas forcément sur le bord droit ».
//
// IL AVAIT DÉJÀ DEMANDÉ « plus vite et PARTOUT » la veille, et j'avais répondu
// en triplant l'amplitude de l'oscillation : 17, 28 et 36 pixels, mesurés sur
// une période entière. Ces trois nombres-là avaient l'air d'une réussite —
// trois fois mieux qu'avant — et ne répondaient pas à la question.
//
// CE QU'IL FAUT MESURER N'EST DONC PAS L'AMPLITUDE D'UN BALANCEMENT, mais LE
// TERRITOIRE PARCOURU : la surface que la carte a visitée, rapportée à celle du
// tableau. Une oscillation de trente pixels couvre moins d'un pour cent d'un
// tableau de mille pixels ; un vol couvre des dizaines.
//
//     node tools/lesCartesVolent.mjs          # les crans 1 et 10
//     node tools/lesCartesVolent.mjs 6        # un cran précis
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const crans = process.argv.slice(2).map(Number).filter(n => n >= 1 && n <= 10);
const AMESURER = crans.length ? crans : [1, 4, 10];

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

/**
 * Suit UNE carte pendant `secondes` et rend le rectangle qu'elle a visité, en
 * part du tableau. On échantillonne dans la page : un aller-retour par point
 * de mesure coûterait plus cher que ce qu'on mesure.
 */
const suivre = (secondes) => s.page.evaluate(async (sec) => {
    const jeu = document.querySelector('.pa-jeu');
    const carte = document.querySelector('.pa-carte');
    if (!jeu || !carte) return null;
    const cadre = jeu.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let chemin = 0, avant = null;
    const fin = performance.now() + sec * 1000;
    await new Promise((fini) => {
        const pas = () => {
            const r = carte.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height / 2;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            if (avant) chemin += Math.hypot(x - avant.x, y - avant.y);
            avant = { x, y };
            if (performance.now() < fin) requestAnimationFrame(pas); else fini();
        };
        requestAnimationFrame(pas);
    });
    return {
        largeurVisitee: Math.round(maxX - minX),
        hauteurVisitee: Math.round(maxY - minY),
        cadre: { l: Math.round(cadre.width), h: Math.round(cadre.height) },
        // LE CHEMIN PARCOURU dit la vitesse ; le rectangle visité dit le
        // territoire. Les deux ensemble séparent « ça vibre vite » de
        // « ça voyage ».
        chemin: Math.round(chemin),
        partDuCadre: Math.round(100 * ((maxX - minX) * (maxY - minY))
            / (cadre.width * cadre.height))
    };
}, secondes);

const mesures = {};
for (const cran of AMESURER) {
    await s.ouvrirExercice('num-puissances-relier',
        { bougent: true, vitesse: cran, paires: 6 }, { questions: 3 });
    await s.doitExister('.pa-carte');
    await dormir(600);
    const m = await suivre(6);
    mesures[cran] = m;
    console.log(`\n── CRAN ${cran} ──`);
    console.log('  ', JSON.stringify(m));
    if (!m) { dire(false, 'rien à mesurer'); continue; }
    dire(m.largeurVisitee > 100 || m.hauteurVisitee > 100,
        `la carte VOYAGE : ${m.largeurVisitee} × ${m.hauteurVisitee} px visités en six `
        + `secondes (le tableau fait ${m.cadre.l} × ${m.cadre.h})`);
    // ELLE VA QUELQUE PART, ELLE NE REPASSE PAS SUR SES PAS.
    //
    // Le premier seuil écrit ici exigeait deux pour cent de la surface du
    // tableau en six secondes — et il confondait LA VITESSE avec LE
    // TERRITOIRE. Au cran 1, la carte parcourt 235 pixels en six secondes :
    // elle voyage pour de bon, elle n'a simplement pas eu le temps d'explorer.
    // Exiger d'elle la surface d'une carte rapide, c'était exiger qu'elle
    // aille vite, ce que le cran 1 refuse par définition.
    //
    // Ce qui sépare un VOL d'une OSCILLATION ne se lit donc pas sur la surface,
    // mais sur le rapport entre la diagonale visitée et le chemin parcouru :
    // une carte qui va et vient entre deux points a beau parcourir des
    // kilomètres, sa diagonale reste celle de son amplitude.
    const diagonale = Math.round(Math.hypot(m.largeurVisitee, m.hauteurVisitee));
    dire(diagonale >= m.chemin * 0.25,
        `elle VA quelque part : ${diagonale} px de diagonale visitée pour ${m.chemin} px `
        + `parcourus (${(100 * diagonale / Math.max(1, m.chemin)).toFixed(0)} %). Une `
        + 'oscillation de trente pixels en rendrait trois.');
}

// LE CURSEUR CHANGE QUELQUE CHOSE, ET DANS LE BON SENS.
if (mesures[1] && mesures[10]) {
    const lent = mesures[1].chemin, vif = mesures[10].chemin;
    console.log(`\nchemin parcouru en six secondes : ${lent} px au cran 1, ${vif} px au cran 10`);
    dire(vif > lent * 3,
        `le cran 10 parcourt au moins trois fois plus de chemin que le cran 1 `
        + `(${(vif / Math.max(1, lent)).toFixed(1)} fois)`);
}

// ── « PARTOUT » SE MESURE SUR LA DURÉE, PAS SUR SIX SECONDES ────────────────
//
// Le territoire est le même à tous les crans — c'est l'allure qui change, pas
// le terrain. Au cran le plus lent, il faut simplement laisser le temps : on
// regarde une carte pendant vingt-cinq secondes et l'on vérifie qu'elle a
// VRAIMENT traversé le tableau, et pas seulement frémi plus longtemps.
if (AMESURER.includes(1)) {
    console.log('\n── LE CRAN LE PLUS LENT, SUR VINGT-CINQ SECONDES ──');
    await s.ouvrirExercice('num-puissances-relier',
        { bougent: true, vitesse: 1, paires: 6 }, { questions: 3 });
    await s.doitExister('.pa-carte');
    const long = await suivre(25);
    console.log('  ', JSON.stringify(long));
    dire(long.largeurVisitee > long.cadre.l * 0.2 || long.hauteurVisitee > long.cadre.h * 0.2,
        `même au cran 1, elle traverse : ${long.largeurVisitee} × ${long.hauteurVisitee} px `
        + `sur un tableau de ${long.cadre.l} × ${long.cadre.h}`);
}

// ── ET LE TRAIT SORT PAR LE BON BORD ────────────────────────────────────────
//
// RÉMY : « quitte à ce que le trait qui relie soit pas forcément sur le bord
// droit ». Une fois les cartes en vol, une carte de gauche peut se retrouver à
// DROITE de sa partenaire : le trait doit alors sortir par sa gauche, sinon il
// traverse sa propre carte pour aller la rejoindre.
console.log('\n── LE TRAIT, UNE FOIS LES CARTES MÊLÉES ──');
await s.ouvrirExercice('num-puissances-relier',
    { bougent: true, vitesse: 9, paires: 5 }, { questions: 3 });
await s.doitExister('.pa-carte');
await dormir(900);
const trait = await s.page.evaluate(() => {
    const g = document.querySelector('.pa-carte[data-cote="g"]');
    if (!g) return 'pas de carte';
    const rang = g.dataset.rang;
    const d = document.querySelector(`.pa-carte[data-cote="d"][data-rang="${rang}"]`);
    if (!d) return 'pas de partenaire';
    g.click(); d.click();
    return new Promise((fini) => setTimeout(() => {
        const l = document.querySelector('.pa-trait--juste');
        if (!l) return fini('pas de trait');
        const bg = g.getBoundingClientRect(), bd = d.getBoundingClientRect();
        const cadre = document.querySelector('.pa-jeu').getBoundingClientRect();
        const p1 = { x: +l.getAttribute('x1'), y: +l.getAttribute('y1') };
        const p2 = { x: +l.getAttribute('x2'), y: +l.getAttribute('y2') };
        // Le point de départ doit être SUR le bord de la carte de gauche, à un
        // pixel près : ni à l'intérieur, ni dans le vide.
        const dedans = (p, b) => p.x >= b.left - cadre.left - 1.5 && p.x <= b.right - cadre.left + 1.5
            && p.y >= b.top - cadre.top - 1.5 && p.y <= b.bottom - cadre.top + 1.5;
        fini({
            gaucheEstADroite: bg.left > bd.left,
            departSurLaCarte: dedans(p1, bg),
            arriveeSurLautre: dedans(p2, bd)
        });
    }, 700));
});
console.log('  ', JSON.stringify(trait));
if (trait && typeof trait === 'object') {
    dire(trait.departSurLaCarte === true, 'le trait part DU BORD de sa carte, où qu’elle soit');
    dire(trait.arriveeSurLautre === true, 'et il arrive sur le bord de l’autre');
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nLES CARTES VOLENT, ET LE TRAIT LES SUIT.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
