// LE JARDIN, REMPLI EN ENTIER PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// CE QUE CETTE SONDE MESURE, ET QUE RIEN D'AUTRE NE MESURE. Les jardins sont
// composés d'avance par `tools/fabriquerJardins.mjs`, qui se relit lui-même :
// chaque rangée se lit bien comme ses réponses, chaque fleur comme son mot. Ce
// contrôle-là porte sur les DONNÉES. Il ne dit rien de l'écran — ni que les
// hexagones tombent sur les bonnes cases, ni qu'on peut taper dedans, ni que
// les définitions affichées sont celles du jardin affiché.
//
// LE STRIMKO A COÛTÉ DEUX HEURES POUR AVOIR SAUTÉ CETTE ÉTAPE : quatre mille
// épreuves vertes, et quatre défauts qui attendaient l'élève, dont un qui
// rendait toute la saisie tablette muette.
//
// LA SONDE RELIT LA SOLUTION DEPUIS LE SEUL ÉCRAN — les définitions affichées,
// pas les données du jardin. Si une définition était affichée en face de la
// mauvaise rangée, le mot qu'elle désigne ne tiendrait plus dans les cases, et
// le remplissage échouerait : le décalage se voit alors tout seul.
//
//     node tools/jardin.mjs

import { ouvrirSonde } from './sonde.mjs';
import { JARDINS } from '../js/data/jardins.js';
import { LEXIQUE } from '../js/core/motsCaches.js';
import { MOTS_COURANTS } from '../js/data/motsCourants.js';

const dit = (ok, quoi, detail = '') =>
    console.log(`  ${ok ? '\x1b[32mok\x1b[0m  ' : '\x1b[31mNON\x1b[0m '} ${quoi}${detail ? '  — ' + detail : ''}`);
let fautes = 0;
const exige = (ok, quoi, detail) => { if (!ok) fautes++; dit(ok, quoi, detail); };

/** définition → mot, pour relire l'écran sans regarder les données du jardin. */
const PAR_DEFINITION = new Map();
const ranger = (mot, def) => {
    const d = String(def || '').trim();
    if (!d) return;
    if (!PAR_DEFINITION.has(d)) PAR_DEFINITION.set(d, []);
    PAR_DEFINITION.get(d).push(String(mot).toUpperCase());
};
LEXIQUE.forEach(e => ranger(e.mot, e.def));
MOTS_COURANTS.forEach(e => ranger(e.mot, e.def));

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });

const statut = () => s.page.evaluate(() =>
    ((document.querySelector('.ja-status') || {}).textContent || '').trim());
const essais = () => s.page.evaluate(() =>
    ((document.querySelector('.ja-verif-count') || {}).textContent || '?').trim());

console.log(`\n${JARDINS.length} jardin(s) livré(s) — on en joue un en entier`);
console.log('────────────────────────────────────────────────────────────');

const rate = await s.ouvrirExercice('voc-jardin');
if (rate) { exige(false, 'le jardin s\'ouvre', rate); process.exit(1); }

for (const [sel, pourquoi] of [
    ['.ja-cadre', 'le cadre du jardin'],
    ['.ja-case[data-cle]', 'les cases, repérées par leur coordonnée'],
    ['.ja-case input', 'un champ par case'],
    ['.ja-case--centre', 'le cœur des fleurs, qui n\'est dans aucun mot de six'],
    ['.ja-rangees .ja-indice', 'les définitions des rangées'],
    ['.ja-groupe--claire', 'le groupe des fleurs claires'],
    ['[data-verifier]', 'le bouton « Vérifier »'],
    ['[data-valider]', 'le bouton « Valider »']
]) await s.doitExister(sel, pourquoi);

// ── Ce que l'écran dit ───────────────────────────────────────────────────────
const ecran = await s.page.evaluate(() => ({
    cases: [...document.querySelectorAll('.ja-case[data-cle]')].map(el => ({
        cle: el.dataset.cle,
        couleur: (el.className.match(/ja-case--(\w+)/) || [])[1] || null,
        boite: (() => { const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
    })),
    rangees: [...document.querySelectorAll('.ja-rangees .ja-indice')].map(li =>
        [...li.querySelectorAll('span')].map(sp => sp.textContent)
            .join('').split(' · ').map(t => t.trim()).filter(Boolean)),
    groupes: [...document.querySelectorAll('.ja-groupe:not(.ja-groupe--rangees)')].map(g => ({
        titre: g.querySelector('h4').textContent.trim(),
        definitions: [...g.querySelectorAll('li')].map(li => li.textContent.trim())
    }))
}));

// ── Les cases se touchent-elles vraiment ? ───────────────────────────────────
//
// UN HEXAGONE MAL PLACÉ NE SE VOIT PAS DANS LES DONNÉES. On vérifie sur les
// boîtes rendues que deux cases voisines dans le repère axial sont bien
// voisines à l'écran — à un pixel près, et pas à une demi-case.
const parCle = new Map(ecran.cases.map(c => [c.cle, c.boite]));
const VOISINS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
let pires = 0;
for (const c of ecran.cases) {
    const [q, r] = c.cle.split(',').map(Number);
    for (const [dq, dr] of VOISINS) {
        const v = parCle.get(`${q + dq},${r + dr}`);
        if (!v) continue;
        const dx = Math.abs(v.x - c.boite.x), dy = Math.abs(v.y - c.boite.y);
        // Deux voisins se décalent d'une demi-largeur et/ou de trois quarts de
        // hauteur : jamais davantage, jamais d'une case entière.
        const attenduX = dq === 0 ? c.boite.w / 2 : (dr === 0 ? c.boite.w : c.boite.w / 2);
        const attenduY = dr === 0 ? 0 : c.boite.h * 0.75;
        if (Math.abs(dx - attenduX) > 2 || Math.abs(dy - attenduY) > 2) pires++;
    }
}
exige(pires === 0, 'LES HEXAGONES TOMBENT EXACTEMENT SUR LEURS VOISINS',
    `${pires} voisinage(s) décalé(s)`);
dit(true, `${ecran.cases.length} cases`,
    `${ecran.cases.filter(c => c.couleur !== 'centre').length} pétales, `
    + `${ecran.cases.filter(c => c.couleur === 'centre').length} cœurs`);

// ── La solution, relue depuis les DÉFINITIONS AFFICHÉES ──────────────────────
// ON RECONNAÎT LE JARDIN À SES DÉFINITIONS, PAS À SA FORME.
//
// Tous les jardins d'une même forme ont le même nombre de cases et de rangées :
// s'y fier désignait n'importe lequel des six, et les trois mesures suivantes
// rougissaient en accusant le JEU d'un défaut qui était dans la sonde.
const memeDefs = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const jardin = JARDINS.find(j => j.rangees.length === ecran.rangees.length
    && j.rangees.every((rg, i) => memeDefs(rg.reponses.map(r => r.def), ecran.rangees[i])));
exige(!!jardin, 'le jardin affiché se reconnaît à ses définitions',
    jardin ? jardin.id : 'aucun des ' + JARDINS.length + ' ne correspond');
if (!jardin) { await s.fermer(); process.exit(1); }

const lettres = new Map();
let rangeesLues = 0;
ecran.rangees.forEach((defs, i) => {
    const mots = defs.map(d => (PAR_DEFINITION.get(d) || [])[0]);
    if (mots.some(m => !m)) return;
    const rg = jardin.rangees[i];
    if (!rg || mots.join('').length !== rg.cles.length) return;
    rg.cles.forEach((cle, k) => lettres.set(cle, mots.join('')[k]));
    rangeesLues++;
});
exige(rangeesLues === ecran.rangees.length,
    'CHAQUE DÉFINITION AFFICHÉE DÉSIGNE UN MOT QUI TIENT DANS SA RANGÉE',
    `${rangeesLues}/${ecran.rangees.length}`);

// Les cases hors rangée (les rangées trop courtes n'en portent pas) se
// complètent par leur fleur.
jardin.fleurs.forEach(f => {
    f.petales.forEach((cle, k) => {
        if (!lettres.has(cle)) lettres.set(cle, f.mot[(k - f.depart + 6) % 6]);
    });
});
const sansLettre = jardin.cases.filter(c => !lettres.has(c));
exige(sansLettre.length === 0, 'toutes les cases se déduisent de l\'écran',
    sansLettre.join(' '));

// ── Les définitions des fleurs sont-elles bien rangées par couleur ? ─────────
const parCouleur = {};
jardin.fleurs.forEach(f => { (parCouleur[f.couleur] ||= []).push(f.def); });
let groupesJustes = 0;
ecran.groupes.forEach(g => {
    const id = g.titre.toLowerCase().includes('claire') ? 'claire'
        : (g.titre.toLowerCase().includes('moyenne') ? 'moyenne' : 'foncee');
    const attendu = (parCouleur[id] || []).slice().sort();
    if (JSON.stringify(g.definitions.slice().sort()) === JSON.stringify(attendu)) groupesJustes++;
});
exige(groupesJustes === ecran.groupes.length,
    'LES DÉFINITIONS DE FLEURS SONT RANGÉES PAR COULEUR, ET AUCUNE NE MANQUE',
    `${groupesJustes}/${ecran.groupes.length}`);

// ── On joue ──────────────────────────────────────────────────────────────────
const depart = await essais();
await s.page.click('[data-verifier]');
exige(depart === await essais(), 'un jardin vide ne coûte pas une vérification',
    `${depart} → ${await essais()}`);

const cles = jardin.cases;
for (const cle of cles) {
    await s.page.click(`.ja-case[data-cle="${cle}"] input`);
    await s.page.keyboard.type(lettres.get(cle));
}
const relues = await s.page.evaluate(() =>
    [...document.querySelectorAll('.ja-case input')].filter(i => i.value).length);
exige(relues === cles.length, 'TOUTES LES CASES SE REMPLISSENT ET SE RELISENT',
    `${relues}/${cles.length}`);

await s.page.click('[data-verifier]');
const verdict = await statut();
exige(/juste/i.test(verdict) && !/revoir/i.test(verdict),
    'un jardin plein et juste s\'entend dire qu\'il est juste', verdict);
exige((await s.page.evaluate(() => document.querySelectorAll('.ja-faux').length)) === 0,
    'et aucune case n\'est barrée');

// LA MESURE DE FIN NE DOIT PAS POUVOIR ÊTRE VRAIE POUR RIEN.
//
// Elle cherchait `.ja-champ--ok, .ja-case[data-cle]` — c'est-à-dire « la classe
// du succès OU n'importe quelle case », donc toujours vrai. Elle est restée
// verte pendant que `Valider` jugeait FAUX un jardin rempli juste, et c'est
// l'épreuve `tests/jardin.test.mjs` qui a dû le dire. Un sélecteur qui ne peut
// pas rendre faux est une mesure qui ne mesure rien.
await s.page.click('[data-valider]');
await s.page.waitForTimeout(1600);
exige(await s.page.evaluate(() => !!document.querySelector('.ja-champ--ok')),
    '« VALIDER » RECONNAÎT UN JARDIN JUSTE', await statut());

console.log('\n────────────────────────────────────────────────────────────');
exige(s.erreurs.length === 0, 'erreurs de page : 0',
    s.erreurs.slice(0, 3).join(' | ') || '(aucune)');
exige(s.fenetresNatives.length === 0, 'fenêtres natives : 0',
    s.fenetresNatives.slice(0, 3).join(' | ') || '(aucune)');
await s.fermer();

console.log(fautes
    ? `\n\x1b[31m${fautes} MESURE(S) AU ROUGE.\x1b[0m`
    : '\n\x1b[32mLE JARDIN SE REMPLIT ET SE TERMINE.\x1b[0m');
process.exit(fautes ? 1 : 0);
