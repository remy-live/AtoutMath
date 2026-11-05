// BUMPY, JOUÉ POUR DE VRAI — au clavier puis au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/bumpyAuDoigt.mjs
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/bumpy.test.mjs` prouve que le monde est juste et que les trois
// tableaux se finissent. Il ne prouve pas qu'un élève puisse JOUER : entre le
// monde et son doigt il y a une touche à écouter, une boucle d'image à tenir,
// une toile à peindre et un panneau à suivre.
//
// ── ON LIT LA TOILE, ET C'EST VOULU ────────────────────────────────────────
//
// Le jeu ne publie pas sa position : lui demander de le faire serait ajouter
// une porte au logiciel pour le confort de la mesure, et cette porte mentirait
// le jour où le dessin cesserait de suivre l'état. La balle est le seul rose
// du plateau, la porte ouverte le seul vert.
//
// ── ET LES CROCHETS SONT PRÉFIXÉS, parce qu'on s'est fait prendre ──────────
//
// La première version lisait `[data-score]`. Il en existe un AUTRE dans
// `index.html`, hors du jeu — `document.querySelector` rendait donc celui-là,
// et la sonde annonçait tranquillement « score : 0 » pendant que le jeu en
// comptait cent soixante-dix. Un sélecteur qui désigne autre chose ne rend pas
// `null` : il rend une valeur plausible, ce qui est pire.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

/** Le côté d'une case, en pixels de toile. Il vient de core/bumpy.js. */
const CASE = 36;

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 1000 });
await s.identifier();
const raté = await s.ouvrirExercice('jeu-bumpy', {}, { questions: 1 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(1300);

await s.doitExister('.bp-toile', 'la toile du plateau');
await s.doitExister('.bp-panneau', 'le panneau latéral');
await s.doitExister('[data-bp-clefs]', 'le compteur de clés');
await s.doitExister('[data-bp-porte]', 'l\'état de la porte');
await s.doitExister('[data-bp-score]', 'le score');
await s.doitExister('.bp-moitie--g', 'la moitié gauche de l\'écran');
await s.doitExister('.bp-moitie--d', 'la moitié droite de l\'écran');

const panneau = () => s.page.evaluate(() => {
    const q = (sel) => (document.querySelector(sel) || {}).textContent;
    return {
        clefs: q('[data-bp-clefs]'), fruits: q('[data-bp-fruits]'),
        porte: q('[data-bp-porte]'), score: q('[data-bp-score]'),
        tableau: q('[data-bp-tableau]'),
        vies: document.querySelectorAll('.bp-vies i').length,
        mot: (q('[data-bp-mot]') || '').trim()
    };
});

/** Ce que la toile montre : la balle (rose) et la porte ouverte (vert). */
const lire = (dans = '') => s.page.evaluate((ou) => {
    const t = document.querySelector(ou + ' .bp-toile');
    if (!t) return null;
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    let sx = 0, sy = 0, rose = 0, vert = 0;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], v = d[i + 1], b = d[i + 2];
        // #f472b6 la balle : beaucoup de rouge, du bleu, peu de vert. Le rouge
        // clair des pics (#fca5a5) s'en distingue par l'écart bleu-vert — 68
        // contre 0 —, et c'est pour cela qu'on le teste.
        if (r > 200 && b > 140 && v < 160 && b - v > 30) {
            const p = (i / 4) | 0;
            sx += p % t.width; sy += (p / t.width) | 0; rose++;
        } else if (r > 20 && r < 60 && v > 175 && v < 215 && b > 70 && b < 110) vert++;
    }
    return { x: rose ? sx / rose : null, y: rose ? sy / rose : null, rose, vert };
}, dans);

const debut = await panneau();
dire('le panneau s\'ouvre sur le but du tableau, porte fermée',
    debut.clefs === '0 / 2' && debut.porte === 'Fermée' && debut.vies === 3
    && debut.tableau === 'Tableau 1',
    `${debut.tableau} · clés ${debut.clefs} · porte ${debut.porte} · `
    + `${debut.vies} vies · score ${debut.score}`);

const photo = await s.photo('.bp-jeu', 'tools/tmp/bumpy.png', 0);
dire('et la toile est peinte, pas restée vide', !photo.unie && photo.entiere,
    photo.unie ? 'image UNIE' : `${photo.teintes} teintes, cadre entier`);

const premier = await lire();
dire('ON TROUVE LA BALLE SUR LA TOILE', !!premier && premier.rose > 200,
    premier ? `${premier.rose} pixels roses en (${Math.round(premier.x)} ; `
        + `${Math.round(premier.y)})` : 'aucun pixel rose');

// ── LE REBOND SE VOIT ──────────────────────────────────────────────────────
//
// RÉMY : « il faut bien voir le rebond ». C'est la seule information sur
// laquelle l'élève décide, et elle ne vit qu'à l'écran : le noyau peut être
// juste pendant que la boucle d'image saute une image sur deux.
let bas = -1e9, haut = 1e9;
for (let i = 0; i < 36; i++) {
    const p = await lire();
    if (p && p.y !== null) { bas = Math.max(bas, p.y); haut = Math.min(haut, p.y); }
    await dormir(45);
}
// LE SEUIL EST À 2,7 CASE ET NON À 3,33, ET C'EST VOULU : on ÉCHANTILLONNE,
// donc on rate le sommet exact de la courbe et l'on mesure toujours un peu
// MOINS que la vraie amplitude. Mesuré : 108 px relevés pour 120 réels. La
// valeur exacte est gardée par `tests/bumpy.test.mjs`, qui calcule au lieu de
// regarder ; ici on garde seulement que le rebond est AMPLE à l'écran.
dire('LE REBOND SE VOIT — la balle monte de près de quatre cases',
    bas - haut > 2.7 * CASE,
    `elle monte et descend d'au moins ${Math.round(bas - haut)} px, soit `
    + `${((bas - haut) / CASE).toFixed(1)} cases`);

// ── LES FLÈCHES LA DIRIGENT ────────────────────────────────────────────────
const avant = await lire();
await s.page.keyboard.down('ArrowRight');
await dormir(800);
await s.page.keyboard.up('ArrowRight');
const apres = await lire();
dire('LA FLÈCHE DROITE LA POUSSE À DROITE', apres.x > avant.x + CASE,
    `de x ${Math.round(avant.x)} à ${Math.round(apres.x)}`);

await s.page.keyboard.down('ArrowLeft');
await dormir(800);
await s.page.keyboard.up('ArrowLeft');
const apresG = await lire();
dire('et la flèche gauche à gauche', apresG.x < apres.x - CASE,
    `de x ${Math.round(apres.x)} à ${Math.round(apresG.x)}`);

// ── AU DOIGT, DANS UNE SALLE VIDE ─────────────────────────────────────────
//
// ON NE MESURE PAS LE DOIGT SUR LE VRAI TABLEAU, et c'est une leçon : la
// première version poussait la balle à droite au milieu du premier tableau,
// là où une paroi l'attendait — elle ne bougeait pas d'un pixel, et la sonde
// concluait « la moitié d'écran ne fait rien ». `document.elementFromPoint`
// nommait pourtant le bon élément. Une mesure de pilotage se fait dans une
// pièce où rien ne peut arrêter la balle ; sinon on mesure le décor.
const doigt = await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'bp-vide';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;padding:10px';
    document.body.appendChild(d);
    const noyau = await import('./js/core/bumpy.js');
    const jeu = await import('./js/games/bumpy.js');
    const garde = noyau.NIVEAUX[0];
    noyau.NIVEAUX[0] = {
        nom: 'salle vide', clefs: 1,
        lignes: [
            '####################',
            '#........B.........#',
            '#..................#',
            '#.............c....#',
            '#.PP...............#',
            '#==================#',
            '####################'
        ]
    };
    const inst = jeu.engineBumpy(d, false, {});
    const dors = (ms) => new Promise(r => setTimeout(r, ms));
    await dors(500);
    const avant = inst.etat.x;
    // ON TOUCHE VRAIMENT LA MOITIÉ DROITE : un `pointerdown` posé dessus, pas
    // un réglage interne. C'est le chemin du doigt de Rémy, et c'est celui-là
    // qu'on veut mesurer.
    const moitie = d.querySelector('.bp-moitie--d');
    const b = moitie.getBoundingClientRect();
    const opts = { pointerId: 1, bubbles: true, isPrimary: true,
        clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 };
    moitie.dispatchEvent(new PointerEvent('pointerdown', opts));
    await dors(700);
    const pendant = inst.etat.x;
    moitie.dispatchEvent(new PointerEvent('pointerup', opts));
    await dors(300);
    const apres = inst.etat.x;
    inst.destroy();
    d.remove();
    noyau.NIVEAUX[0] = garde;
    return { avant, pendant, apres };
});
dire('AU DOIGT : la moitié droite de l\'écran pousse la balle à droite',
    doigt.pendant > doigt.avant + CASE,
    `de x ${Math.round(doigt.avant)} à ${Math.round(doigt.pendant)}`);
dire('et quand le doigt se lève, elle cesse d\'aller à droite',
    doigt.apres - doigt.pendant < CASE / 2,
    `encore ${Math.round(doigt.apres - doigt.pendant)} px après le lâcher`);

// ── EN JOUANT, LE PANNEAU SUIT ─────────────────────────────────────────────
//
// Le score qui monte est la preuve que la chaîne entière tient : la touche
// écoutée, le monde avancé, le mur abattu ou le fruit pris, le panneau repeint.
let sens = 'ArrowLeft', bouge = false;
const scoreDepart = Number((await panneau()).score);
await s.page.keyboard.down(sens);
for (let i = 0; i < 8 && !bouge; i++) {
    await dormir(1500);
    await s.page.keyboard.up(sens);
    sens = sens === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    await s.page.keyboard.down(sens);
    if (Number((await panneau()).score) > scoreDepart) bouge = true;
}
await s.page.keyboard.up(sens);
const enJeu = await panneau();
dire('EN JOUANT, LE SCORE MONTE — la chaîne entière tient',
    Number(enJeu.score) > scoreDepart,
    `${scoreDepart} → ${enJeu.score} · ${enJeu.mot}`);

// ── LA PORTE S'OUVRE QUAND LA CLÉ EST PRISE ────────────────────────────────
//
// On monte un tableau d'essai où la clé est sous la balle : la porte doit
// passer du gris au vert, et cela se compte en pixels. C'est la promesse que
// Rémy a ajoutée — « tu pense aussi au porte » —, et elle ne se voit que là.
const porte = await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'bp-cle';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;padding:10px';
    document.body.appendChild(d);
    const noyau = await import('./js/core/bumpy.js');
    const jeu = await import('./js/games/bumpy.js');
    const garde = noyau.NIVEAUX[0];
    // LA CLÉ EST LOIN DE LA BALLE, et c'est la correction : posée juste
    // dessous, elle était ramassée avant la première mesure — la porte était
    // donc DÉJÀ verte quand on comptait le « avant », et la sonde annonçait
    // « 626 → 626 » sans qu'aucun défaut n'existe.
    noyau.NIVEAUX[0] = {
        nom: 'essai', clefs: 1,
        lignes: [
            '####################',
            '#..B...............#',
            '#..................#',
            '#...............c..#',
            '#.PP...............#',
            '#==================#',
            '####################'
        ]
    };
    const inst = jeu.engineBumpy(d, false, {});
    const vert = () => {
        const t = d.querySelector('.bp-toile');
        const im = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
        let n = 0;
        for (let i = 0; i < im.length; i += 4) {
            if (im[i] > 20 && im[i] < 60 && im[i + 1] > 175 && im[i + 1] < 215
                && im[i + 2] > 70 && im[i + 2] < 110) n++;
        }
        return n;
    };
    const dors = (ms) => new Promise(r => setTimeout(r, ms));
    await dors(150);
    const avant = vert();
    // ON LA POUSSE AVEC LA MOITIÉ D'ÉCRAN, comme un doigt : c'est le chemin
    // de l'élève, et il est déjà mesuré plus haut.
    const moitie = d.querySelector('.bp-moitie--d');
    const b = moitie.getBoundingClientRect();
    const opts = { pointerId: 2, bubbles: true, isPrimary: true,
        clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 };
    moitie.dispatchEvent(new PointerEvent('pointerdown', opts));
    for (let i = 0; i < 100 && !inst.etat.ouverte; i++) await dors(60);
    moitie.dispatchEvent(new PointerEvent('pointerup', opts));
    await dors(200);
    const apres = vert();
    const clefs = inst.etat.clefs;
    inst.destroy();
    d.remove();
    noyau.NIVEAUX[0] = garde;
    return { avant, apres, clefs };
});
dire('LA CLÉ OUVRE LA PORTE, et la porte VERDIT', porte.apres > porte.avant + 200,
    `${porte.avant} → ${porte.apres} pixels verts, ${porte.clefs} clé(s) prise(s)`);

const fin = await panneau();
console.log(`\n   ${fin.mot}`);
console.log(`erreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.photo('.bp-jeu', 'tools/tmp/bumpy-joue.png', 0);
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
