// LA MOSAÏQUE : SES CARREAUX, SA TAILLE, ET SES POINTS SELON L'OPTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant l'écran : « il faudrait des carreaux, une figure plus grande et
// que les points soient des croix, pixel ou rond selon l'option ».
//
// ── CE QU'ON MESURE, ET POURQUOI PAS LA SOURCE ─────────────────────────────
//
// « Il y a des carreaux » ne se vérifie pas en lisant le code : un `<line>`
// écrit dans le SVG peut être caché par une règle CSS, couvert par les fonds
// opaques des pièces, ou tracé en blanc sur blanc. On compte donc ce que le
// NAVIGATEUR rend : des traits présents, visibles, et dans le bon ordre de
// superposition.
//
// ET LES TROIS MARQUES DE POINT SE MESURENT PAR BASCULE : `marqueurPoint` écrit
// les trois écritures dans le SVG et le CSS en montre une selon
// `html[data-point]`. Une sonde qui compterait les `<line>` du marqueur les
// trouverait TOUJOURS, réglage ou pas — c'est le piège exact de ce mécanisme.
// On lit donc `getComputedStyle(...).display` de chacune, pour les trois
// réglages, et l'on exige qu'il en paraisse EXACTEMENT une à la fois.
//
//   node tools/mosaiqueCarreaux.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await s.ouvrirExercice('geo-mosaique');
await dormir(1600);

let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} ${quoi}${detail ? '  — ' + detail : ''}`);
};

// LES CROCHETS SONT LUS DANS LA SOURCE : `.pv-svg`, `.pv-carreau`, `.pv-sommet`
// (js/core/activities/pavageImage.js). Un sélecteur inventé rendrait 0, la même
// réponse qu'un dessin sans carreaux.
await s.doitExister('.pv-svg', 'le dessin de la mosaïque');

const dessin = await s.page.evaluate(() => {
    const svg = document.querySelector('.pv-svg');
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const carreaux = [...document.querySelectorAll('.pv-carreau')];
    const vu = (e) => {
        const st = getComputedStyle(e);
        return st.display !== 'none' && st.visibility !== 'hidden'
            && Number(st.opacity) > 0.05;
    };
    // L'ORDRE DE SUPERPOSITION COMPTE : les fonds des pièces sont opaques, un
    // carreau dessiné AVANT eux serait écrit puis recouvert — présent dans le
    // document, invisible à l'écran, et la mesure naïve le compterait.
    const groupes = [...svg.children].map(g => g.getAttribute('class'));
    const cases = [...document.querySelectorAll('.pv-case')];
    return {
        largeurVue: Math.round(svg.getBoundingClientRect().width),
        viewBox: { w: vb[2], h: vb[3] },
        cote: cases.length ? Math.round(cases[0].getBoundingClientRect().width) : 0,
        carreaux: carreaux.length,
        carreauxVus: carreaux.filter(vu).length,
        ordre: groupes,
        sommets: document.querySelectorAll('.pv-sommet').length
    };
});

console.log(`         viewBox ${dessin.viewBox.w}×${dessin.viewBox.h}, rendu ${dessin.largeurVue} px`);
dire(dessin.carreaux > 0, 'le dessin porte des carreaux', `${dessin.carreaux} traits`);
dire(dessin.carreauxVus === dessin.carreaux,
    'et ils sont tous visibles à l\'écran', `${dessin.carreauxVus}/${dessin.carreaux}`);
// LES CARREAUX APRÈS LES FONDS, SINON ILS SONT COUVERTS.
const iFonds = dessin.ordre.indexOf('pv-fonds');
const iCarr = dessin.ordre.indexOf('pv-carreaux');
dire(iCarr > iFonds && iFonds >= 0,
    'ils passent PAR-DESSUS les couleurs des pièces',
    `ordre ${JSON.stringify(dessin.ordre)}`);
// UNE CASE SE COMPTE À L'ŒIL : en dessous d'une quarantaine de pixels, deux
// carreaux voisins ne se distinguent plus à bout de bras.
dire(dessin.cote >= 40, 'la case est assez grande pour qu\'on la compte',
    `${dessin.cote} px de côté`);
dire(dessin.sommets > 0, 'les sommets nommés sont là', `${dessin.sommets}`);

// ── LES TROIS MARQUES, PAR BASCULE DU RÉGLAGE ──────────────────────────────
console.log('\n  Les points, réglage par réglage :');
for (const style of ['croix', 'plus', 'disque']) {
    const vu = await s.page.evaluate((st) => {
        document.documentElement.setAttribute('data-point', st);
        const m = document.querySelector('.pv-sommet');
        if (!m) return null;
        const visible = (sel) => [...m.querySelectorAll(sel)]
            .filter(e => getComputedStyle(e).display !== 'none').length;
        return {
            croix: visible('.pt-croix'), plus: visible('.pt-plus'),
            disque: visible('.pt-disque')
        };
    }, style);
    if (!vu) { dire(false, `réglage « ${style} »`, 'aucune marque trouvée'); continue; }
    // EXACTEMENT UNE ÉCRITURE À LA FOIS. Deux marques superposées se verraient
    // comme un point gras et l'élève croirait à un autre objet.
    const attendu = { croix: [2, 0, 0], plus: [0, 2, 0], disque: [0, 0, 1] }[style];
    const obtenu = [vu.croix, vu.plus, vu.disque];
    dire(JSON.stringify(obtenu) === JSON.stringify(attendu),
        `réglage « ${style} »`,
        `croix ${vu.croix}, plus ${vu.plus}, disque ${vu.disque}`);
}
await s.page.evaluate(() => document.documentElement.setAttribute('data-point', 'croix'));

console.log('\n' + '─'.repeat(70));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mDES CARREAUX, UNE GRANDE FIGURE, ET DES POINTS QUI SUIVENT L\'OPTION.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.photo('.pv-cadre', 'tools/tmp/mosaique.png');
await s.fermer();
