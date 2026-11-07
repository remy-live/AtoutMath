// LA FLEUR QU'ON REGARDE, ET LA RÉPONSE QU'ON DEMANDE À LA BARRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les fleurs, c'est pas clair, on ne sait pas où mettre les
// définitions, pourrais-tu dans la barre de debug me mettre une option réponse
// (de manière générale) pour voir si. Il faudrait aller sur une fleur,
// connaître au moins le début du mot, le sens (dans un premier temps) ».
//
// ── CE QU'ON MESURE, ET POURQUOI PAS LA SOURCE ─────────────────────────────
//
// « Les pétales se numérotent » ne se vérifie pas en lisant le code : un badge
// écrit dans le document peut être caché par la découpe de l'hexagone, couvert
// par le champ de saisie, ou posé sur la mauvaise case. On clique donc un cœur
// pour de vrai, et l'on relève ce que le navigateur montre.
//
// ET L'ON VÉRIFIE LE SENS, PAS SEULEMENT LA PRÉSENCE : six chiffres affichés
// dans le désordre seraient « six badges », et l'épreuve passerait. On lit donc
// la POSITION de chaque pétale numéroté et l'on exige que 1, 2, 3… tournent
// dans le sens des aiguilles d'une montre autour du cœur.
//
//   node tools/jardinFleurChoisie.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 1000 });
await s.identifier();
await s.ouvrirExercice('voc-jardin');
await dormir(1800);

let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} ${quoi}${detail ? '  — ' + detail : ''}`);
};

// LES CROCHETS SONT LUS DANS LA SOURCE (js/core/activities/jardin.js) :
// `.ja-coeur`, `.ja-rang`, `.ja-indice--fleur`, `[data-fleur-info]`.
await s.doitExister('.ja-case', 'les alvéoles du jardin');
await s.doitExister('.ja-coeur', 'le cœur d\'une fleur');
await s.doitExister('.ja-indice--fleur', 'une définition de fleur, cliquable');

const avant = await s.page.evaluate(() => ({
    rangs: document.querySelectorAll('.ja-rang').length,
    info: !document.querySelector('[data-fleur-info]').hidden
}));
dire(avant.rangs === 0 && !avant.info,
    'au départ, rien n\'est montré', `${avant.rangs} badge(s)`);

// ── ON VA SUR UNE FLEUR ────────────────────────────────────────────────────
await s.page.click('.ja-coeur');
await dormir(400);

const vu = await s.page.evaluate(() => {
    const coeur = document.querySelector('.ja-coeur--choisi');
    const badges = [...document.querySelectorAll('.ja-rang')];
    const milieu = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const c = coeur ? milieu(coeur) : null;
    // L'ANGLE DE CHAQUE PÉTALE AUTOUR DU CŒUR. `y` descend à l'écran : un angle
    // qui CROÎT tourne donc dans le sens des aiguilles d'une montre.
    const petales = badges.map(b => {
        const p = milieu(b.closest('.ja-case'));
        return { rang: Number(b.textContent), angle: Math.atan2(p.y - c.y, p.x - c.x) };
    }).sort((a, b) => a.rang - b.rang);
    const info = document.querySelector('[data-fleur-info]');
    return {
        coeur: !!coeur,
        badges: badges.map(b => b.textContent).sort().join(''),
        visibles: badges.filter(b => getComputedStyle(b).display !== 'none').length,
        eclairees: document.querySelectorAll('.ja-case--fleur').length,
        depart: document.querySelectorAll('.ja-case--depart').length,
        info: info.hidden ? '' : (info.textContent || '').trim(),
        choisie: document.querySelectorAll('.ja-indice--choisie').length,
        angles: petales.map(p => p.angle)
    };
});

dire(vu.coeur, 'le cœur cliqué se marque');
dire(vu.badges === '123456', 'les six pétales sont numérotés 1 à 6', `« ${vu.badges} »`);
dire(vu.visibles === 6, 'et les six chiffres sont visibles', `${vu.visibles}/6`);
dire(vu.eclairees === 6, 'la couronne entière s\'éclaire', `${vu.eclairees} case(s)`);
dire(vu.depart === 1, 'le pétale de DÉPART est marqué, et un seul', `${vu.depart}`);

// LE SENS, ET C'EST LA MOITIÉ DE SA DEMANDE. On déroule les angles : s'ils
// montent en continu, on tourne dans le sens des aiguilles.
let croissant = true;
for (let i = 1; i < vu.angles.length; i++) {
    let d = vu.angles[i] - vu.angles[i - 1];
    while (d <= 0) d += Math.PI * 2;          // le tour peut repasser par −π
    if (d > Math.PI) croissant = false;        // un saut en arrière
}
dire(croissant, 'et les numéros tournent dans le sens des aiguilles d\'une montre',
    vu.angles.map(a => `${Math.round(a * 180 / Math.PI)}°`).join(' → '));

dire(/aiguilles/.test(vu.info) && vu.info.length > 60,
    'la phrase dit le départ et le sens', `« ${vu.info.slice(0, 90)}… »`);
dire(vu.choisie === 1, 'et sa définition est désignée dans la liste', `${vu.choisie}`);

// ── ON REVIENT PAR LA DÉFINITION ───────────────────────────────────────────
await s.page.click('.ja-coeur--choisi');
await dormir(300);
const ferme = await s.page.evaluate(() => document.querySelectorAll('.ja-rang').length);
dire(ferme === 0, 'un second clic referme la fleur', `${ferme} badge(s)`);

await s.page.click('.ja-indice--fleur');
await dormir(400);
const parLaDef = await s.page.evaluate(() => ({
    badges: document.querySelectorAll('.ja-rang').length,
    coeur: document.querySelectorAll('.ja-coeur--choisi').length
}));
dire(parLaDef.badges === 6 && parLaDef.coeur === 1,
    'cliquer une DÉFINITION montre sa fleur — c\'est le sens que Rémy nomme',
    JSON.stringify(parLaDef));

// ── ET LA RÉPONSE, DEPUIS LA BARRE DE DÉBOGAGE ─────────────────────────────
//
// `#db-solution` existait et demandait `montrerSolution()` à l'exercice ; le
// Jardin ne savait pas répondre, et le bouton se taisait.
console.log('\n  La barre de débogage :');
const barre = await s.page.$('#db-solution');
dire(!!barre, 'le bouton « Solution » existe dans la barre');
if (barre) {
    await s.page.evaluate(() => document.getElementById('db-solution').click());
    await dormir(900);
    const apres = await s.page.evaluate(() => {
        const champs = [...document.querySelectorAll('.ja-case input')];
        return {
            remplies: champs.filter(c => c.value).length,
            total: champs.length,
            statut: (document.querySelector('.ja-status') || {}).textContent || ''
        };
    });
    dire(apres.remplies === apres.total && apres.total > 0,
        'il remplit le jardin entier', `${apres.remplies}/${apres.total}`);
    dire(/auteur/i.test(apres.statut), 'et il dit que c\'est un outil d\'auteur',
        `« ${apres.statut.trim()} »`);
}

console.log('\n' + '─'.repeat(70));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mON SAIT OÙ VA CHAQUE DÉFINITION, PAR OÙ LE MOT COMMENCE, ET DE QUEL CÔTÉ.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.photo('.jardin-layout', 'tools/tmp/jardin.png');
await s.fermer();
