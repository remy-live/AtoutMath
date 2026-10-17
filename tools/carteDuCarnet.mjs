// LA CARTE DU CARNET D'ERREURS, PHOTOGRAPHIÉE APRÈS AVOIR JOUÉ FAUX.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux captures à l'appui : « deux explications compliqués et fausses.
// C'est dans le "Mes erreurs" ».
//
// ── CE QUE `tools/carnetDesTransformations.mjs` NE PEUT PAS DIRE ───────────
//
// Celui-là fabrique les phrases et les compare : il prouve que le texte est
// juste. Il ne prouve pas qu'il ARRIVE sur la carte, et la chaîne compte trois
// maillons qu'on n'a pas le droit de supposer :
//
//     l'activité → `session.submit(…, { dire })` → `state.recordAttempt`
//     → le journal → `errorBody` dans ui/profileUI.js
//
// Un `dire` oublié dans un seul des deux chemins de réponse, un champ qui ne
// voyage pas, et la carte continue d'afficher la clé canonique sans que rien ne
// le signale. On joue donc faux pour de vrai, on ouvre « Mes erreurs », et on
// REGARDE la carte.
//
//   node tools/carteDuCarnet.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

// LES DEUX CODES DICTÉS SONT LUS AU CATALOGUE, pas devinés : `geo-pavage` porte
// l'activité « symetrie-element », `geo-translation-fleche » l'activité
// « quadrillage » avec la flèche et sans les mots du vecteur — c'est-à-dire
// exactement la question de sa seconde capture.
const PAVAGE = 'geo-pavage';
const FLECHE = 'geo-translation-fleche';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1100 });
await s.identifier();

/** Les cartes du carnet, telles qu'elles se lisent. */
const lesCartes = () => s.page.evaluate(() =>
    [...document.querySelectorAll('.error-item-detail')]
        .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));

/** Les diagnostics affichés sous les cartes. */
const lesDiagnostics = () => s.page.evaluate(() =>
    [...document.querySelectorAll('.error-why')]
        .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));

/**
 * LE VOILE DU RETOUR, REFERMÉ.
 *
 * MESURÉ, et c'est la friction la plus chère de cette sonde : après une réponse
 * fausse, la correction s'ouvre en carte BLOQUANTE — `.fb-veil` couvre la page
 * jusqu'à « J'ai compris ». Playwright dit alors, trente secondes durant,
 * « <div class="fb-veil"></div> intercepts pointer events » sur une case
 * parfaitement visible et parfaitement cliquable. Et le voile SURVIT à la
 * fermeture du jeu : il gênait l'exercice SUIVANT.
 */
async function fermerLeVoile() {
    for (let i = 0; i < 4; i++) {
        const reste = await s.page.evaluate(() => {
            const b = document.querySelector('.fb-close, .fb-card--blocking .fb-close');
            if (b) { b.click(); return true; }
            const v = document.querySelector('.fb-veil');
            if (v) { v.remove(); return true; }
            return false;
        });
        if (!reste) return;
        await dormir(500);
    }
}

async function ouvrirLeCarnet() {
    await s.cliquer('#top-btn-profile', 'l\'onglet « Mon profil »');
    await dormir(1500);
    await s.cliquer('[data-onglet="erreurs"]', 'l\'onglet « Mes erreurs »');
    await dormir(1500);
}

// ── 1. « SYMÉTRIQUE PAR RAPPORT À QUOI ? » ─────────────────────────────────
//
// La première marche est « choisir » : quatre boutons nommés (d₁), (d₂), O₃…
// On en touche un, et l'activité marque elle-même le bouton `.sy-faux` ou
// `.sy-juste` — c'est ce marquage qui dit si l'on a obtenu une erreur, et non
// un pari sur le hasard du tirage.
console.log('\n\x1b[1mIL SE TROMPE SUR « PAR RAPPORT À QUOI ? »\x1b[0m');
const raté = await s.ouvrirExercice(PAVAGE);
dire('l\'exercice s\'ouvre', !raté, raté || PAVAGE);
await s.doitExister('.sy-btn[data-el]', 'les boutons des candidats');

let faux = false;
for (let i = 0; i < 6 && !faux; i++) {
    faux = await s.page.evaluate(() => {
        const b = document.querySelector('.sy-btn[data-el]');
        if (!b) return false;
        b.click();
        return b.classList.contains('sy-faux');
    });
    await dormir(1800);
    // Une réponse juste enchaîne sur la question suivante : on retouche le
    // premier bouton, et trois fois sur quatre il sera faux.
    if (!faux) await dormir(1200);
}
dire('UNE RÉPONSE FAUSSE EST ENREGISTRÉE', faux, faux ? '' : 'six essais, tous justes');

await fermerLeVoile();
await s.page.evaluate(() => {
    const b = document.getElementById('btn-close-game');
    if (b) b.click();
});
await dormir(1500);
await ouvrirLeCarnet();

let cartes = await lesCartes();
cartes.forEach(c => console.log(`   « ${c} »`));
const carteElement = cartes.find(c => /symétrique de la pièce/i.test(c));
dire('LA CARTE EST LÀ', !!carteElement, `${cartes.length} carte(s)`);
// LE DÉFAUT, NOMMÉ : plus aucune clé canonique sous les yeux de l'élève.
dire('ELLE N\'ÉCRIT PLUS « axe:v:8.5 »', !!carteElement && !/axe:|point:\d/.test(carteElement),
    carteElement || '');
// ET ELLE ÉCRIT CE QUE LA FIGURE PORTE : un nom de candidat, et une équation.
dire('elle nomme la droite ou le point, et l\'écrit comme en classe',
    !!carteElement && /\((d[₁₂₃₄₅₆]|O)|O[₁₂₃₄₅₆]/.test(carteElement)
        && /(x|y) = \d|\(\d+ ; \d+\)/.test(carteElement),
    carteElement || '');
await s.photo('.error-item-card', 'tools/tmp/carte-element.png');

// ── 2. « LA FLÈCHE QUI GLISSE » ────────────────────────────────────────────
//
// On rejoue l'erreur de sa capture : la bonne figure, un carreau à côté.
//
// POUR CONNAÎTRE L'IMAGE ATTENDUE, ON PASSE PAR LE BOUTON D'INDICE — celui qui
// trace une case —, puis on efface et l'on recopie décalé. C'est le seul moyen
// de la connaître SANS la demander au code : on lit ce que l'écran a tracé.
console.log('\n\x1b[1mIL COLORIE LA BONNE FIGURE, UN CARREAU À CÔTÉ\x1b[0m');
const raté2 = await s.ouvrirExercice(FLECHE);
dire('l\'exercice s\'ouvre', !raté2, raté2 || FLECHE);
await s.doitExister('.qd-hit[data-c]', 'les cases du quadrillage');
await fermerLeVoile();

/** On appuie sur l'indice jusqu'à ce qu'il ait tout tracé. */
const attendue = await (async () => {
    for (let i = 0; i < 14; i++) {
        const reste = await s.page.evaluate(() => {
            const b = document.querySelector('[data-hint]');
            if (!b || b.disabled) return false;
            b.click();
            return true;
        });
        await dormir(350);
        if (!reste) break;
    }
    return s.page.evaluate(() =>
        [...document.querySelectorAll('.qd-posee[data-c]')]
            .map(e => e.dataset.c.split(',').map(Number)).map(([x, y]) => ({ x, y })));
})();
dire('l\'indice trace l\'image attendue', attendue.length >= 4, JSON.stringify(attendue));
// LES PREMIERS APPUIS SUR L'INDICE DONNENT LES PHRASES, et une phrase d'aide
// s'affiche dans une carte BLOQUANTE : le voile revient donc APRÈS la boucle
// d'indices, et c'est là qu'il arrête tous les clics suivants.
await fermerLeVoile();

// ON EFFACE, ET L'ON RECOPIE DÉCALÉ. Les quatre décalages d'un carreau sont
// essayés dans l'ordre : le premier qui tienne entièrement dans le quadrillage
// ET hors de la figure de départ gagne. Une case de la figure de départ refuse
// le clic (elle est la donnée de l'énoncé), et c'est ainsi qu'on la reconnaît.
//
// ET L'ON CLIQUE AVEC LA SOURIS DE PLAYWRIGHT, pas avec `element.click()` :
// les cases sont des `<rect>` SVG, et un SVGElement n'a PAS de méthode
// `click()` — « h.click is not a function », mesuré. Un `<button>` HTML en a
// une, ce qui rend le piège discret : le bouton d'indice juste au-dessus
// marchait très bien.
const pose = await (async () => {
    for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1], [1, 0], [0, 1]]) {
        await s.page.evaluate(() => {
            const b = document.querySelector('[data-effacer]');
            if (b) b.click();
        });
        await dormir(200);
        const cibles = attendue.map(c => ({ x: c.x + dx, y: c.y + dy }));
        let toutes = true;
        for (const c of cibles) {
            const sel = `.qd-hit[data-c="${c.x},${c.y}"]`;
            if (!await s.page.locator(sel).count()) { toutes = false; break; }
            await s.page.locator(sel).click();
            await dormir(120);
        }
        if (!toutes) continue;
        const posees = await s.page.locator('.qd-posee[data-c]').count();
        if (posees === attendue.length) return { dx, dy, posees };
    }
    return null;
})();
dire('il pose la figure décalée', !!pose, JSON.stringify(pose));

await s.cliquer('[data-valider]', 'le bouton « Valider »');
await dormir(2200);
const surLEcran = await s.page.evaluate(() => {
    const el = document.querySelector('.fb-card, .feedback-card, .qd-compte');
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
});
console.log(`   à l'écran : « ${surLEcran} »`);

await fermerLeVoile();
await s.page.evaluate(() => {
    const b = document.getElementById('btn-close-game');
    if (b) b.click();
});
await dormir(1500);
await ouvrirLeCarnet();

cartes = await lesCartes();
const diagnostics = await lesDiagnostics();
cartes.forEach(c => console.log(`   « ${c} »`));
diagnostics.forEach(d => console.log(`   \x1b[2m${d}\x1b[0m`));
const carteFigure = cartes.find(c => /Colorie l'image/i.test(c));
dire('LA CARTE DE LA TRANSLATION EST LÀ', !!carteFigure, `${cartes.length} carte(s)`);
dire('ELLE N\'ÉCRIT PLUS « 7|3/8|3/… »', !!carteFigure && !/\d\|\d/.test(carteFigure),
    carteFigure || '');
dire('elle désigne les cases en colonne et ligne', !!carteFigure && /\(\d+ ; \d+\)/.test(carteFigure),
    carteFigure || '');
// ET LE DIAGNOSTIC DIT L'ERREUR FAITE, pas un compte de cases.
dire('LE DIAGNOSTIC DIT « LA BONNE FORME, MAL POSÉE »',
    diagnostics.some(d => /bonne forme/i.test(d) && /trop (à (gauche|droite)|bas|haut)/i.test(d)),
    diagnostics.join(' · '));
dire('et il ne dit plus « n oubliées, n en trop » sur ce cas-là',
    !diagnostics.some(d => /en trop/.test(d) && /Colorie/.test(carteFigure || '')
        && /oubliée/.test(d)),
    diagnostics.join(' · '));
await s.photo('.error-item-card', 'tools/tmp/carte-figure.png');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
