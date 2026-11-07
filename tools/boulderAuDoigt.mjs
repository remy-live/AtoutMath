// BOULDER DASH, JOUÉ POUR DE VRAI — au clavier puis au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/boulderAuDoigt.mjs
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/boulderDash.test.mjs` prouve que la mine obéit à ses règles et que
// les trois tableaux se finissent. Il ne prouve pas qu'un élève puisse
// JOUER : entre le monde et son doigt il y a quatre touches à écouter, une
// horloge à tenir, une toile à peindre et quatre compteurs à suivre.
//
// ── ON LIT LA TOILE, ET C'EST VOULU ────────────────────────────────────────
//
// Le jeu ne publie pas sa position : lui demander de le faire serait ajouter
// une porte au logiciel pour le confort de la mesure, et cette porte mentirait
// le jour où le dessin cesserait de suivre l'état. On compte donc les pixels
// de chaque couleur — la terre ocre, le diamant cyan, le casque orange — et
// l'on regarde ce qui change.
//
// LA MESURE QUI COMPTE LE PLUS EST LA DERNIÈRE : un rocher doit GLISSER d'une
// case à l'autre, pas y apparaître. C'est la chose que l'élève doit apprendre
// à anticiper, et s'il ne voit jamais la chute il ne l'anticipera jamais. On
// relève donc la position du rocher AU MILIEU de sa chute, et l'on exige
// qu'elle soit strictement entre le départ et l'arrivée. Leçon payée sur le
// Pont et la lampe — Rémy : « il faudrait peut être voir les animations ».

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

/** Le côté d'une case, en pixels de toile. Il vient de core/boulderDash.js. */
const CASE = 36;

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1080 });
await s.identifier();
const raté = await s.ouvrirExercice('jeu-boulder-dash', {}, { questions: 1 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(1200);

await s.doitExister('.bd-toile', 'la toile de la mine');
await s.doitExister('[data-diamants]', 'le compteur de diamants');
await s.doitExister('[data-temps]', 'le chronomètre');
await s.doitExister('[data-vies]', 'le compteur de vies');
await s.doitExister('[data-dir="haut"]', 'la flèche du haut');
await s.doitExister('[data-dir="bas"]', 'la flèche du bas');

const hud = () => s.page.evaluate(() => ({
    tableau: (document.querySelector('[data-tableau]') || {}).textContent,
    diamants: (document.querySelector('[data-diamants]') || {}).textContent,
    temps: (document.querySelector('[data-temps]') || {}).textContent,
    vies: (document.querySelector('[data-vies]') || {}).textContent,
    mot: ((document.querySelector('[data-mot]') || {}).textContent || '').trim()
}));

/** Ce que la toile montre, couleur par couleur. */
const lire = () => s.page.evaluate(() => {
    const t = document.querySelector('.bd-toile');
    if (!t) return null;
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    let terre = 0, diamant = 0, casque = 0, cx = 0, cy = 0, vert = 0;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], v = d[i + 1], b = d[i + 2];
        // #a16207 la terre · #22d3ee le diamant · #f59e0b le casque
        // · #22c55e la porte ouverte. Quatre couleurs choisies pour ne pas se
        // confondre : une couleur qu'on confond est une mesure qui ment.
        if (r > 140 && r < 185 && v > 80 && v < 120 && b < 40) terre++;
        else if (r < 90 && v > 180 && b > 200) diamant++;
        else if (r > 230 && v > 140 && v < 180 && b < 40) {
            casque++;
            const p = (i / 4) | 0;
            cx += p % t.width; cy += (p / t.width) | 0;
        } else if (r < 80 && v > 170 && v < 215 && b > 70 && b < 115) vert++;
    }
    return {
        terre, diamant, vert,
        x: casque ? cx / casque : null, y: casque ? cy / casque : null, casque
    };
});

const debut = await hud();
dire('la mine s\'ouvre sur le premier tableau, trois vies',
    debut.tableau === '1' && debut.diamants === '0 / 5' && debut.vies === '3',
    `tableau ${debut.tableau} · ${debut.diamants} diamants · ${debut.vies} vies · `
    + `${debut.temps} s`);

const photo = await s.photo('.bd-cadre', 'tools/tmp/boulder.png', 0);
dire('et la toile est peinte, pas restée vide', !photo.unie && photo.entiere,
    photo.unie ? 'image UNIE' : `${photo.teintes} teintes, cadre entier`);

const premier = await lire();
dire('ON TROUVE LE MINEUR SUR LA TOILE', !!premier && premier.casque > 60,
    premier ? `${premier.casque} pixels de casque en (${Math.round(premier.x)} ; `
        + `${Math.round(premier.y)})` : 'aucun pixel de casque');

// ── LE CHRONOMÈTRE TOURNE ──────────────────────────────────────────────────
//
// C'est la seule promesse de la forme que Rémy a choisie — « B, la partie » —
// et elle ne vit qu'à l'écran : le noyau ne connaît pas le temps.
const t0 = Number((await hud()).temps);
await dormir(2500);
const t1 = Number((await hud()).temps);
dire('LE CHRONOMÈTRE TOURNE', t1 < t0 && t0 - t1 <= 4, `${t0} s → ${t1} s`);

// ── LES QUATRE FLÈCHES CREUSENT ────────────────────────────────────────────
const terreAvant = (await lire()).terre;
await s.page.keyboard.down('ArrowDown');
await dormir(900);
await s.page.keyboard.up('ArrowDown');
const apresBas = await lire();
dire('LA FLÈCHE DU BAS FAIT DESCENDRE, et creuse la terre',
    apresBas.y > premier.y + CASE && apresBas.terre < terreAvant - 400,
    `le mineur descend de ${Math.round(apresBas.y - premier.y)} px, `
    + `${terreAvant - apresBas.terre} pixels de terre en moins`);

await s.page.keyboard.down('ArrowRight');
await dormir(900);
await s.page.keyboard.up('ArrowRight');
const apresDroite = await lire();
dire('et la flèche de droite fait aller à droite',
    apresDroite.x > apresBas.x + CASE,
    `de x ${Math.round(apresBas.x)} à ${Math.round(apresDroite.x)}`);

// ── AU DOIGT, SUR LE PAVÉ ──────────────────────────────────────────────────
//
// La tablette de Rémy n'a pas de flèches. Quatre directions ne se devinent
// pas sur un écran coupé en quartiers : il lui faut des flèches qu'on VOIT.
const boite = await (await s.page.$('[data-dir="gauche"]')).boundingBox();
const avantDoigt = await lire();
await s.page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
await s.page.mouse.down();
await dormir(900);
await s.page.mouse.up();
const apresDoigt = await lire();
dire('AU DOIGT AUSSI : la flèche de gauche fait aller à gauche',
    apresDoigt.x < avantDoigt.x - CASE,
    `de x ${Math.round(avantDoigt.x)} à ${Math.round(apresDoigt.x)}`);

// ── UN ROCHER GLISSE, IL N'APPARAÎT PAS AILLEURS ───────────────────────────
//
// On monte un tableau d'essai : un seul rocher, deux cases de vide sous lui,
// et l'on relève sa position au tiers, au milieu et à la fin de sa chute.
const chute = await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'bd-chute';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;padding:12px';
    document.body.appendChild(d);
    const noyau = await import('./js/core/boulderDash.js');
    const jeu = await import('./js/games/boulderDash.js');
    // ON REMPLACE LE PREMIER TABLEAU LE TEMPS DE LA MESURE : un rocher seul,
    // haut perché, et le mineur loin de sa trajectoire.
    const garde = noyau.NIVEAUX[0];
    noyau.NIVEAUX[0] = {
        nom: 'chute', diamants: 1, secondes: 60,
        lignes: [
            '####################',
            '#    o             #',
            '#                  #',
            '#                  #',
            '#                  #',
            '#         d       P#',
            '####################'
        ]
    };
    const g = jeu.engineBoulderDash(d, false, {});
    const ouEst = () => {
        const t = d.querySelector('.bd-toile');
        const im = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
        let sy = 0, n = 0;
        for (let i = 0; i < im.length; i += 4) {
            // #64748b, le gris du rocher.
            if (im[i] > 85 && im[i] < 110 && im[i + 1] > 105 && im[i + 1] < 130
                && im[i + 2] > 125 && im[i + 2] < 150) {
                sy += ((i / 4) | 0) / t.width; n++;
            }
        }
        return n ? sy / n : null;
    };
    const dors = (ms) => new Promise(r => setTimeout(r, ms));
    await dors(120);
    const depart = ouEst();
    await dors(75);          // un demi-pas : il doit être ENTRE deux cases
    const milieu = ouEst();
    await dors(600);
    const arrivee = ouEst();
    g.destroy();
    d.remove();
    noyau.NIVEAUX[0] = garde;
    return { depart, milieu, arrivee };
});
const glisse = chute.depart !== null && chute.milieu !== null
    && chute.milieu > chute.depart + 3 && chute.milieu < chute.arrivee - 3;
dire('LE ROCHER GLISSE — on le voit tomber, il ne se téléporte pas', glisse,
    `départ ${Math.round(chute.depart)} · à mi-chute ${Math.round(chute.milieu)} · `
    + `arrivée ${Math.round(chute.arrivee)}`);

// ── L'APERÇU DU PROFESSEUR ─────────────────────────────────────────────────
//
// Quand Rémy met « aperçu » sur une étape, c'est le robot de
// `js/core/boulderRobot.js` qu'il regarde jouer. S'il se faisait écraser au
// vingtième pas — ce qui lui arrivait avant qu'il apprenne à ne pas descendre
// de sous une pierre —, Rémy verrait un jeu qui perd, ce qui ressemble
// beaucoup à un jeu cassé. Cette mesure est aussi la seule qui fait tourner ce
// robot DANS UN VRAI NAVIGATEUR.
const fin = await hud();
console.log(`\n   ${fin.mot}`);

await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'bd-apercu';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;padding:12px';
    document.body.appendChild(d);
    const { engineBoulderDash } = await import('./js/games/boulderDash.js');
    window.__apercu = engineBoulderDash(d, true, {});
});
await dormir(900);
const vus = new Set();
for (let i = 0; i < 80; i++) {
    const h = await s.page.evaluate(() => ({
        t: (document.querySelector('#bd-apercu [data-tableau]') || {}).textContent,
        v: (document.querySelector('#bd-apercu [data-vies]') || {}).textContent
    }));
    if (h.t) vus.add(`${h.t}/${h.v}`);
    await dormir(350);
}
const liste = [...vus].sort();
dire('L\'APERÇU TRAVERSE LES TROIS TABLEAUX SANS JAMAIS MOURIR',
    liste.every(x => x.endsWith('/3')) && liste.some(x => x.startsWith('3')),
    `tableau/vies vus : ${liste.join(' ')}`);
await s.photo('#bd-apercu', 'tools/tmp/boulder-apercu.png', 0);
console.log(`erreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.photo('.bd-wrap', 'tools/tmp/boulder-joue.png', 0);
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
