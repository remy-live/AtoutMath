// TOUCHER UNE CIBLE QUI BOUGE — Les Amis de Dix, et Le Canon des Compléments.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les amis de 10, le clic est complexe car ca sélectionne le
// texte que de sélectionner la case qui bouge ».
//
// La règle et son pourquoi sont dans `js/core/cibleQuiBouge.js`. Ce que cette
// sonde ajoute, et qu'aucune épreuve sous Node ne peut dire : le GESTE. On pose
// le pointeur au centre de la cible, on attend qu'elle ait QUITTÉ ce point, et
// l'on relâche — exactement ce que fait l'élève. Avec `onclick`, rien ne se
// passe : le navigateur délivre le clic à l'ancêtre commun de l'appui et du
// relâchement, c'est-à-dire au plateau.
//
//     node tools/clicQuiBouge.mjs
//
// DEUX JEUX, PARCE QUE LE DÉFAUT ÉTAIT DANS LES DEUX. Rémy n'a signalé que les
// cartes ; le canon a été trouvé en mesurant.
//
// CE QU'ELLE NE PEUT PAS MESURER, ET IL FAUT LE DIRE : le conteneur n'a que
// Chromium. La sélection de texte sur l'iPad de la classe tient aussi à des
// propriétés PRÉFIXÉES que WebKit seul respecte ; on les pose, on ne peut pas
// les éprouver ici.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

/**
 * Marque une cible et rend sa position. La MARQUE n'est pas un confort : sans
 * elle on interrogerait « la première carte du plateau », qui peut être une
 * AUTRE une seconde plus tard — on mesurerait la position de l'une et le geste
 * sur l'autre.
 */
const viser = (selecteur) => s.page.evaluate((sel) => {
    document.querySelectorAll('[data-sonde]').forEach(e => e.removeAttribute('data-sonde'));
    const el = document.querySelector(sel);
    if (!el) return null;
    el.dataset.sonde = '1';
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, texte: el.textContent.trim() };
}, selecteur);

/** La cible marquée couvre-t-elle encore ce point ? `null` si elle a disparu. */
const couvre = (x, y) => s.page.evaluate(([px, py]) => {
    const el = document.querySelector('[data-sonde]');
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
}, [x, y]);

/**
 * LE GESTE DE RÉMY : on appuie, la cible s'en va, on relâche.
 *
 * Rend `{ partie, disparue }` — et les deux comptent. Une cible qui DISPARAÎT
 * ne couvre plus le point non plus : confondre les deux ferait passer au vert
 * une mesure qui n'a rien mesuré.
 */
async function appuyerPuisLaisserPartir(x, y, patience = 80) {
    await s.page.mouse.move(x, y);
    await s.page.mouse.down();
    let partie = false, disparue = false;
    for (let k = 0; k < patience && !partie && !disparue; k++) {
        await dormir(80);
        const dessus = await couvre(x, y);
        if (dessus === null) disparue = true;
        else partie = !dessus;
    }
    await s.page.mouse.up();
    await dormir(400);
    return { partie, disparue };
}

const selection = () => s.page.evaluate(() => String(window.getSelection() || ''));

/** Les déclarations qui coupent la sélection, telles que le navigateur les rend. */
const styleDe = (sel) => s.page.evaluate((s2) => {
    const el = document.querySelector(s2);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { select: c.userSelect, webkit: c.webkitUserSelect, touch: c.touchAction };
}, sel);

// ═══ LES AMIS DE DIX — celui que Rémy a signalé ════════════════════════════
console.log('\n\x1b[1mLES AMIS DE DIX — une carte qui dérive\x1b[0m');
// « toujours » : la dérive dès la première table. C'est un réglage du
// professeur, pas une porte dérobée — et sans lui il faudrait vider deux
// tables avant que le défaut puisse se produire.
let raté = await s.ouvrirExercice('num-amis-de-dix',
    { cible: [10], vies: 5, mouvement: 'toujours' });
if (raté) throw new Error('ouverture des Amis de Dix : ' + raté);
await s.doitExister('.dx-table--mouvante', 'la table qui dérive');
await s.doitExister('.dx-carte', 'les cartes');

const prises = () => s.page.evaluate(() =>
    document.querySelectorAll('.dx-carte--prise').length);

const carte = await viser('.dx-carte:not(.dx-carte--partie)');
const avantPrises = await prises();
const geste = await appuyerPuisLaisserPartir(carte.x, carte.y);
dire(geste.partie && !geste.disparue,
    `la carte « ${carte.texte} » a quitté le point d'appui avant le relâchement`
    + `${geste.disparue ? ' — ELLE A DISPARU, la mesure ne vaut rien' : ''}`);
dire(await prises() > avantPrises, 'la carte est quand même PRISE');
dire(await selection() === '', `rien n'est sélectionné (« ${await selection()} »)`);

const styleCarte = await styleDe('.dx-carte');
console.log(`  user-select: ${styleCarte.select} · -webkit-user-select: ${styleCarte.webkit}`
    + ` · touch-action: ${styleCarte.touch}`);
dire(styleCarte.select === 'none' && styleCarte.webkit === 'none',
    'la carte refuse la sélection dans les deux écritures');

// ET LA PAIRE SE FAIT EN ENTIER : prendre une carte ne sert à rien si la
// seconde ne se prend pas, ou si la paire ne s'envole pas.
const valeur = Number(carte.texte);
const amie = await s.page.evaluate((v) => {
    const el = [...document.querySelectorAll('.dx-carte:not(.dx-carte--partie)')]
        .find(x => Number(x.dataset.v) === 10 - v && !x.classList.contains('dx-carte--prise'));
    if (!el) return null;
    el.dataset.sonde = '1';
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, texte: el.textContent.trim() };
}, valeur);
if (amie) {
    await appuyerPuisLaisserPartir(amie.x, amie.y, 20);
    await dormir(500);
    const envolees = await s.page.evaluate(() =>
        document.querySelectorAll('.dx-carte--partie').length);
    dire(envolees >= 2, `la paire ${carte.texte} + ${amie.texte} s'envole (${envolees} cartes parties)`);
} else {
    dire(false, 'aucune carte amie trouvée : la mesure de la paire n\'a pas eu lieu');
}

await s.photo('.dx-table', 'tools/tmp/amis-de-dix.png', 0);

// ═══ LE CANON DES COMPLÉMENTS — le même défaut, trouvé en mesurant ═════════
console.log('\n\x1b[1mLE CANON — un astéroïde qui avance\x1b[0m');
raté = await s.ouvrirExercice('num-canon-complements',
    { cible: 10, vies: 5, vitesse: 'normale' });
if (raté) throw new Error('ouverture du Canon : ' + raté);
await s.doitExister('.cn-terrain', 'le terrain du canon');
await s.page.waitForSelector('.cn-boulet:not(.cn-boulet--mien)', { timeout: 20000 });

const tirs = () => s.page.evaluate(() =>
    document.querySelectorAll('.cn-boulet--mien').length);
/** Position RELUE après la frappe au pavé : charger prend une seconde, et la
 *  roche avance pendant ce temps. Viser l'ancienne position, c'est appuyer à
 *  côté — et conclure que le tir ne part pas alors qu'on n'a rien touché. */
async function viserEtCharger() {
    const v = await viser('.cn-boulet:not(.cn-boulet--mien)');
    if (!v) return null;
    for (const c of String(10 - Number(v.texte))) await s.page.click(`[data-v="${c}"]`);
    const p = await s.page.evaluate(() => {
        const el = document.querySelector('[data-sonde]');
        if (!el || !el.isConnected) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    return p ? { ...p, texte: v.texte } : null;
}

/** La partie tourne-t-elle encore ? Finie, elle refuse tous les tirs. */
const partieFinie = () => s.page.evaluate(() => !!document.querySelector('[data-neuf]'));

/**
 * LA MESURE DU GESTE, REPRISE TANT QU'ELLE N'A PAS EU LIEU.
 *
 * MESURÉ : une fois sur quatre, la partie se terminait pendant les secondes où
 * le pointeur reste appuyé — les roches continuent d'arriver — et la sonde
 * annonçait alors que le tir ne partait pas. C'est vrai, et cela ne dit RIEN
 * du geste : un jeu fini refuse tous les tirs. Une sonde qui échoue une fois
 * sur quatre est une sonde que plus personne ne lit.
 *
 * ON REJOUE PLUTÔT QUE DE BAISSER LE SEUIL, et l'on DIT combien d'essais il a
 * fallu : si la mesure devenait difficile à obtenir, c'est encore un fait.
 */
async function mesurerLeGeste(essais = 3) {
    for (let k = 1; k <= essais; k++) {
        const r = await viserEtCharger();
        if (r) {
            const n = await tirs();
            const g = await appuyerPuisLaisserPartir(r.x, r.y);
            const finie = await partieFinie();
            if (g.partie && !g.disparue && !finie) {
                return { ok: true, texte: r.texte, tire: await tirs() > n, essais: k };
            }
            if (k < essais) {
                console.log(`  (essai ${k} perdu : ${g.disparue ? 'la roche a disparu'
                    : finie ? 'la partie s\'est terminée' : 'elle n\'a pas bougé'})`);
            }
        }
        if (k === essais) break;
        raté = await s.ouvrirExercice('num-canon-complements',
            { cible: 10, vies: 5, vitesse: 'normale' });
        if (raté) throw new Error('réouverture du Canon : ' + raté);
        await s.page.waitForSelector('.cn-boulet:not(.cn-boulet--mien)', { timeout: 20000 });
    }
    return { ok: false, raison: `${essais} essais sans qu'une mesure soit possible` };
}

const gesteCanon = await mesurerLeGeste();
dire(gesteCanon.ok, gesteCanon.ok
    ? `la roche « ${gesteCanon.texte} » a quitté le point d'appui avant le relâchement`
        + `${gesteCanon.essais > 1 ? ` (au ${gesteCanon.essais}e essai)` : ''}`
    : `la mesure n'a pas pu avoir lieu : ${gesteCanon.raison}`);
if (gesteCanon.ok) dire(gesteCanon.tire, 'le tir part quand même');
const styleRoche = await styleDe('.cn-boulet');
dire(styleRoche.select === 'none' && styleRoche.webkit === 'none',
    'la roche refuse la sélection dans les deux écritures');

// ═══ ET LE CLIC NET MARCHE TOUJOURS ════════════════════════════════════════
//
// « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
// cassé. » Agir à l'appui ne doit pas défaire le geste de l'élève qui tape net.
console.log('\n\x1b[1mCE QU\'ON NE DOIT PAS AVOIR CASSÉ\x1b[0m');
// ON REPART D'UNE PARTIE NEUVE, et ce n'est pas une politesse : les mesures
// précédentes laissent le pointeur appuyé une dizaine de secondes pendant que
// les roches continuent d'arriver. Mesuré : la partie était PERDUE avant
// d'arriver ici, `tirer()` sortait sur `!this.isRunning`, et la sonde
// accusait la correction d'avoir cassé le clic net. Un jeu qui s'est terminé
// ne mesure plus rien.
raté = await s.ouvrirExercice('num-canon-complements',
    { cible: 10, vies: 5, vitesse: 'tranquille' });
if (raté) throw new Error('réouverture du Canon : ' + raté);
await s.page.waitForSelector('.cn-boulet:not(.cn-boulet--mien)', { timeout: 20000 });
const nette = await viserEtCharger();
if (nette) {
    const n = await tirs();
    await s.page.mouse.click(nette.x, nette.y);
    await dormir(450);
    dire(await tirs() > n, 'un appui net sur une roche immobile tire aussi');
}

// ET LE CLAVIER, qu'on ferme très facilement en passant à `pointerdown` seul :
// un bouton activé à Entrée émet un `click` SANS pointeur.
const pourClavier = await viserEtCharger();
const auClavier = pourClavier && await s.page.evaluate(() => {
    const el = document.querySelector('[data-sonde]');
    if (!el || !el.isConnected) return null;
    const avant = document.querySelectorAll('.cn-boulet--mien').length;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    return { avant, apres: document.querySelectorAll('.cn-boulet--mien').length };
});
if (auClavier) {
    dire(auClavier.apres > auClavier.avant,
        'un clic SANS pointeur (clavier) touche encore la cible');
}

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('  ' + e));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : '\x1b[32mUNE CIBLE QUI BOUGE SE TOUCHE, ET RIEN NE SE SÉLECTIONNE.\x1b[0m');
await s.fermer();
process.exitCode = manques || s.fenetresNatives.length || s.erreurs.length ? 1 : 0;
