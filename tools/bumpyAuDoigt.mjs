// BUMPY, JOUÉ POUR DE VRAI — au clavier puis au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/bumpyAuDoigt.mjs
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ».
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/bumpy.test.mjs` prouve que le monde est juste et que les quatre
// tableaux se finissent. Il ne prouve pas qu'un élève puisse JOUER : entre le
// monde et son doigt il y a une touche à écouter, une boucle d'image à tenir,
// une toile à peindre et trois compteurs à suivre. Chacun peut casser sans
// qu'une seule épreuve rougisse — et c'est arrivé : la première version de
// cette sonde tenait la flèche droite deux secondes et concluait « le jeu ne
// ramasse rien », alors que le défaut était dans le monde, pas à l'écran.
//
// ── ON TROUVE LA BALLE DANS LES PIXELS, ET C'EST VOULU ─────────────────────
//
// Le jeu ne publie pas sa position : lui demander de le faire serait ajouter
// une porte au logiciel pour le confort de la mesure, et cette porte mentirait
// le jour où le dessin cesserait de suivre l'état. ON LIT DONC LA TOILE : la
// balle est le seul rose du tableau. Si le dessin décroche, la sonde le voit ;
// une sonde qui lirait l'état ne verrait rien.
//
// ── ET LE VA-ET-VIENT N'EST PAS CHOISI AU HASARD ───────────────────────────
//
// Une sonde ne sait pas jouer finement : elle tient une touche, puis l'autre.
// MESURÉ sous Node, avant d'écrire cette ligne : une touche tenue dix secondes
// ne ramasse RIEN — la balle bute contre le flanc de la plateforme et n'arrive
// jamais dessus. Un va-et-vient d'une seconde sept ramasse le premier objet à
// 1,84 s, et toutes les demi-périodes de 1,5 à 1,8 s y arrivent : c'est donc un
// réglage large, pas une coïncidence.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1000 });
await s.identifier();
const raté = await s.ouvrirExercice('jeu-bumpy', {}, { questions: 1 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(1200);

await s.doitExister('.bp-toile', 'la toile du plateau');
await s.doitExister('[data-restants]', 'le compteur d\'objets');
await s.doitExister('[data-vies]', 'le compteur de vies');
await s.doitExister('.bp-moitie--g', 'la moitié gauche de l\'écran');
await s.doitExister('.bp-moitie--d', 'la moitié droite de l\'écran');

const hud = () => s.page.evaluate(() => ({
    tableau: (document.querySelector('[data-tableau]') || {}).textContent,
    restants: (document.querySelector('[data-restants]') || {}).textContent,
    vies: (document.querySelector('[data-vies]') || {}).textContent,
    mot: ((document.querySelector('[data-mot]') || {}).textContent || '').trim()
}));

/** Où est la balle, en pixels de toile ? Elle est le seul rose du tableau. */
const ouEstElle = () => s.page.evaluate(() => {
    const t = document.querySelector('.bp-toile');
    if (!t) return null;
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], v = d[i + 1], b = d[i + 2];
        // #f472b6 à sec, #38bdf8 mouillée. On cherche le rose : beaucoup de
        // rouge, du bleu, peu de vert — aucune tuile ne ressemble à cela.
        if (r > 200 && b > 140 && v < 160 && r - v > 60) {
            const p = (i / 4) | 0;
            sx += p % t.width; sy += (p / t.width) | 0; n++;
        }
    }
    return n ? { x: sx / n, y: sy / n, pixels: n } : null;
});

const debut = await hud();
dire('le plateau s\'ouvre sur le premier tableau, tout à ramasser',
    debut.tableau === '1' && debut.restants === '4' && debut.vies === '3',
    `tableau ${debut.tableau} · ${debut.restants} à ramasser · ${debut.vies} vies`);

const photo = await s.photo('.bp-cadre', 'tools/tmp/bumpy.png', 0);
dire('et la toile est peinte, pas restée vide', !photo.unie && photo.entiere,
    photo.unie ? 'image UNIE' : `${photo.teintes} teintes, cadre entier`);

const premier = await ouEstElle();
dire('ON TROUVE LA BALLE SUR LA TOILE', !!premier && premier.pixels > 80,
    premier ? `${premier.pixels} pixels roses en (${Math.round(premier.x)} ; `
        + `${Math.round(premier.y)})` : 'aucun pixel rose');

// ── ELLE REBONDIT TOUTE SEULE ──────────────────────────────────────────────
//
// C'est la promesse du jeu, et la seule qu'un élève vérifie sans y penser : on
// ne touche à rien, et la balle monte et descend. Un plateau immobile serait
// un jeu mort, et le compteur ne dirait rien.
let bas = -1e9, haut = 1e9;
for (let i = 0; i < 14; i++) {
    const p = await ouEstElle();
    if (p) { bas = Math.max(bas, p.y); haut = Math.min(haut, p.y); }
    await dormir(110);
}
dire('ELLE REBONDIT TOUTE SEULE, sans qu\'on touche à rien', bas - haut > 64,
    `elle monte et descend de ${Math.round(bas - haut)} px`);

// ── LA FLÈCHE LA DIRIGE ────────────────────────────────────────────────────
const avant = await ouEstElle();
await s.page.keyboard.down('ArrowRight');
await dormir(700);
await s.page.keyboard.up('ArrowRight');
const apres = await ouEstElle();
dire('LA FLÈCHE DROITE LA POUSSE À DROITE', apres.x > avant.x + 60,
    `de x ${Math.round(avant.x)} à ${Math.round(apres.x)}`);

const avantG = await ouEstElle();
await s.page.keyboard.down('ArrowLeft');
await dormir(700);
await s.page.keyboard.up('ArrowLeft');
const apresG = await ouEstElle();
dire('et la flèche gauche à gauche', apresG.x < avantG.x - 60,
    `de x ${Math.round(avantG.x)} à ${Math.round(apresG.x)}`);

// ── ET L'ON RAMASSE VRAIMENT ───────────────────────────────────────────────
//
// Le compteur qui descend est la seule preuve que la chaîne entière tient :
// la touche écoutée, le monde avancé, l'objet retiré, le compteur repeint.
await s.page.click('[data-neuf]').catch(() => {});
await dormir(400);
const motDepart = await hud();
let sens = 'ArrowLeft';
await s.page.keyboard.down(sens);
let ramassé = false;
for (let i = 0; i < 12 && !ramassé; i++) {
    await dormir(1700);
    await s.page.keyboard.up(sens);
    sens = sens === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    await s.page.keyboard.down(sens);
    const h = await hud();
    if (Number(h.restants) < Number(motDepart.restants)) ramassé = true;
}
await s.page.keyboard.up(sens);
const apresJeu = await hud();
dire('EN JOUANT, LE COMPTEUR DESCEND — la chaîne entière tient',
    Number(apresJeu.restants) < Number(motDepart.restants),
    `${motDepart.restants} → ${apresJeu.restants} à ramasser · ${apresJeu.mot}`);

// ── AU DOIGT, SUR LA MOITIÉ DE L'ÉCRAN ─────────────────────────────────────
//
// La tablette de Rémy n'a pas de flèches. Les deux moitiés sont invisibles :
// si elles cessaient d'écouter, rien à l'écran ne le dirait.
const cadre = await s.page.$('.bp-moitie--d');
const boite = await cadre.boundingBox();
const avantD = await ouEstElle();
await s.page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
await s.page.mouse.down();
await dormir(700);
await s.page.mouse.up();
const apresD = await ouEstElle();
dire('AU DOIGT AUSSI : la moitié droite de l\'écran la pousse à droite',
    apresD.x > avantD.x + 60, `de x ${Math.round(avantD.x)} à ${Math.round(apresD.x)}`);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.photo('.bp-wrap', 'tools/tmp/bumpy-joue.png', 0);
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
