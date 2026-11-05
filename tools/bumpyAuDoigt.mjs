// BUMPY, JOUÉ POUR DE VRAI — au clavier puis au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/bumpyAuDoigt.mjs
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/bumpy.test.mjs` prouve que le monde est juste et que les quatre
// tableaux se finissent. Il ne prouve pas qu'un élève puisse JOUER : entre le
// monde et son doigt il y a une touche à écouter, une boucle d'image à tenir,
// une toile à peindre et trois compteurs à suivre. Chacun peut casser sans
// qu'une seule épreuve rougisse.
//
// ── ON TROUVE LA BALLE DANS LES PIXELS, ET C'EST VOULU ─────────────────────
//
// Le jeu ne publie pas sa position : lui demander de le faire serait ajouter
// une porte au logiciel pour le confort de la mesure, et cette porte mentirait
// le jour où le dessin cesserait de suivre l'état. ON LIT DONC LA TOILE. La
// balle est le seul rose, le cadre d'aperçu le seul blanc, les blocs le seul
// bleu clair — trois couleurs choisies pour être reconnaissables, et une
// couleur qu'on confond est une mesure qui ment. (Le rose de la balle se
// distingue du rouge clair des pics par l'écart bleu-vert : 68 contre 0.)

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

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1000 });
await s.identifier();
const raté = await s.ouvrirExercice('jeu-bumpy', {}, { questions: 1 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(1200);

await s.doitExister('.bp-toile', 'la toile du plateau');
await s.doitExister('[data-bonus]', 'le compteur de bonus');
await s.doitExister('[data-vies]', 'le compteur de vies');
await s.doitExister('.bp-moitie--g', 'la moitié gauche de l\'écran');
await s.doitExister('.bp-moitie--d', 'la moitié droite de l\'écran');

const hud = () => s.page.evaluate(() => ({
    tableau: (document.querySelector('[data-tableau]') || {}).textContent,
    bonus: (document.querySelector('[data-bonus]') || {}).textContent,
    vies: (document.querySelector('[data-vies]') || {}).textContent,
    mot: ((document.querySelector('[data-mot]') || {}).textContent || '').trim()
}));

/** Ce que la toile montre : la balle, le cadre d'aperçu, les blocs. */
const lire = () => s.page.evaluate(() => {
    const t = document.querySelector('.bp-toile');
    if (!t) return null;
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    let sx = 0, sy = 0, rose = 0, blanc = 0, blocs = 0;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], v = d[i + 1], b = d[i + 2];
        if (r > 200 && b > 140 && v < 160 && b - v > 30) {
            const p = (i / 4) | 0;
            sx += p % t.width; sy += (p / t.width) | 0; rose++;
        } else if (r > 235 && v > 235 && b > 235) blanc++;
        else if (r > 80 && r < 115 && v > 150 && v < 180 && b > 235) blocs++;
    }
    return { x: rose ? sx / rose : null, y: rose ? sy / rose : null, rose, blanc, blocs };
});

const debut = await hud();
// ON NE REGARDE PAS LE COMPTEUR DE BONUS ICI : le premier rebond du premier
// tableau en ramasse un, et la sonde arrive forcément après. Exiger zéro
// serait exiger que la sonde soit plus rapide que le jeu.
dire('le plateau s\'ouvre sur le premier tableau, trois vies',
    debut.tableau === '1' && debut.vies === '3',
    `tableau ${debut.tableau} · ${debut.bonus} bonus · ${debut.vies} vies`);

/**
 * REMET LA PARTIE EN JEU SI ELLE EST FINIE.
 *
 * Les tableaux 2 à 4 demandent de vrais choix : une sonde qui tient une
 * flèche au hasard y meurt, et au bout de trois vies le voile de fin recouvre
 * le plateau. Les mesures suivantes liraient alors une balle immobile et
 * diraient « la flèche ne fait rien » — ce qui serait faux, et ce qui est
 * exactement le genre de conclusion qu'une sonde doit refuser de tirer.
 */
const remettre = async () => {
    const fini = await s.page.evaluate(() =>
        !!document.querySelector('.bp-fin--vu'));
    if (!fini) return;
    await s.page.click('[data-neuf]');
    await dormir(600);
};

const photo = await s.photo('.bp-cadre', 'tools/tmp/bumpy.png', 0);
dire('et la toile est peinte, pas restée vide', !photo.unie && photo.entiere,
    photo.unie ? 'image UNIE' : `${photo.teintes} teintes, cadre entier`);

const premier = await lire();
dire('ON TROUVE LA BALLE SUR LA TOILE', !!premier && premier.rose > 150,
    premier ? `${premier.rose} pixels roses en (${Math.round(premier.x)} ; `
        + `${Math.round(premier.y)})` : 'aucun pixel rose');

// ── ON VOIT OÙ L'ON VA RETOMBER ────────────────────────────────────────────
//
// Le cadre pointillé est la promesse du jeu : l'arrivée est connue d'avance.
// S'il disparaissait, le jeu deviendrait subi, et rien d'autre ne le dirait.
// ON PREND LE MAXIMUM SUR PLUSIEURS RELEVÉS, et c'est une leçon payée : le
// jeu se fige une seconde entre deux tableaux, et pendant cette pause il ne
// dessine pas le cadre — il n'y a plus de coup suivant à montrer. Un relevé
// unique tombait pile là, trois fois de suite, et annonçait « zéro pixel
// blanc » pendant que le cadre s'affichait parfaitement le reste du temps.
let blancMax = 0;
for (let i = 0; i < 12; i++) {
    blancMax = Math.max(blancMax, (await lire()).blanc);
    await dormir(120);
}
dire('LE CADRE POINTILLÉ EST LÀ — on voit son coup avant de le jouer',
    blancMax > 40, `${blancMax} pixels blancs sur la toile`);

// ── ELLE REBONDIT TOUTE SEULE ──────────────────────────────────────────────
let bas = -1e9, haut = 1e9, gauche = 1e9, droite = -1e9;
for (let i = 0; i < 18; i++) {
    const p = await lire();
    if (p && p.y !== null) {
        bas = Math.max(bas, p.y); haut = Math.min(haut, p.y);
        gauche = Math.min(gauche, p.x); droite = Math.max(droite, p.x);
    }
    await dormir(90);
}
dire('ELLE REBONDIT TOUTE SEULE, sans qu\'on touche à rien', bas - haut > CASE,
    `elle monte et descend de ${Math.round(bas - haut)} px`);
// ── LE PREMIER TABLEAU SE GAGNE, ET LE SUIVANT ARRIVE ──────────────────────
//
// Le premier tableau part pile au-dessus de la porte : sans rien toucher, la
// balle creuse et sort. C'est une promesse qu'aucune épreuve de noyau ne peut
// tenir — l'enchaînement des tableaux vit à l'écran — et c'est le premier
// contact d'un élève avec le jeu.
let passe = null;
for (let i = 0; i < 40 && !passe; i++) {
    const h = await hud();
    if (h.tableau !== '1') passe = h;
    await dormir(250);
}
dire('LE PREMIER TABLEAU SE GAGNE SANS RIEN TOUCHER, et le suivant arrive',
    !!passe && passe.vies === '3',
    passe ? `on passe au tableau ${passe.tableau} avec ${passe.vies} vies`
        : 'on reste au tableau 1');

// ── UN REBOND, UNE COLONNE ─────────────────────────────────────────────────
//
// C'est la règle que Rémy a corrigée. On la mesure en pixels : le déplacement
// doit être un MULTIPLE de la case, pas une valeur quelconque.
const auRepos = async () => {
    // On attend qu'elle soit posée : son abscisse ne bouge plus d'une image à
    // l'autre. Mesurer en plein vol donnerait une position intermédiaire, et
    // l'on conclurait que le pas n'est pas un multiple de la case.
    //
    // ET L'ON IGNORE LES RELEVÉS SANS BALLE : entre deux tableaux, et sous le
    // voile de fin, la toile n'a aucun pixel rose. Rendre `null` ferait tomber
    // la mesure suivante sur « Cannot read properties of null », c'est-à-dire
    // une panne de sonde déguisée en défaut du jeu.
    let p = null, q = null, dernier = null;
    for (let i = 0; i < 40; i++) {
        q = await lire();
        if (q && q.x !== null) {
            dernier = q;
            if (p && Math.abs(q.x - p.x) < 1.5) return q;
            p = q;
        }
        await dormir(70);
    }
    return dernier;
};
await remettre();
const avant = await auRepos();
await s.page.keyboard.down('ArrowRight');
await dormir(1400);
await s.page.keyboard.up('ArrowRight');
const apres = await auRepos();
if (!avant || !apres) throw new Error('la balle est introuvable sur la toile');
const pas = apres.x - avant.x;
const cases = pas / CASE;
dire('LA FLÈCHE DROITE LA DÉPLACE D\'UN NOMBRE ENTIER DE COLONNES',
    pas > CASE * .8 && Math.abs(cases - Math.round(cases)) < .25,
    `${Math.round(pas)} px, soit ${cases.toFixed(2)} case(s)`);

await remettre();
const avantG = await auRepos();
await s.page.keyboard.down('ArrowLeft');
await dormir(1400);
await s.page.keyboard.up('ArrowLeft');
const apresG = await auRepos();
dire('et la flèche gauche dans l\'autre sens', apresG.x < avantG.x - CASE * .8,
    `${Math.round(apresG.x - avantG.x)} px`);

// ── ET LES BLOCS SE CASSENT ────────────────────────────────────────────────
//
// Le compteur de bonus peut rester à zéro pendant toute une partie ; les blocs,
// eux, disparaissent à CHAQUE atterrissage. C'est donc eux qui disent que la
// chaîne entière tient : touche écoutée, coup joué, tableau modifié, toile
// repeinte.
// ON CHERCHE UNE BAISSE ENTRE DEUX RELEVÉS CONSÉCUTIFS, et non entre le
// premier et le dernier : un tableau fini remet un plateau neuf, donc plus de
// blocs qu'avant, et la mesure d'ensemble dirait le contraire de la vérité.
await remettre();
let baisse = 0, suite = (await lire()).blocs;
for (let i = 0; i < 14; i++) {
    await dormir(320);
    const n2 = (await lire()).blocs;
    if (n2 < suite - 100) baisse = Math.max(baisse, suite - n2);
    suite = n2;
}
dire('EN JOUANT, LES BLOCS DISPARAISSENT — la chaîne entière tient',
    baisse > 100, `le plus gros bloc cassé d'un coup : ${baisse} pixels`);

// ── AU DOIGT, SUR LA MOITIÉ DE L'ÉCRAN ─────────────────────────────────────
//
// La tablette de Rémy n'a pas de flèches. Les deux moitiés sont invisibles :
// si elles cessaient d'écouter, rien à l'écran ne le dirait.
await remettre();
const boite = await (await s.page.$('.bp-moitie--d')).boundingBox();
const avantD = await auRepos();
await s.page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
await s.page.mouse.down();
await dormir(2000);
await s.page.mouse.up();
const apresD = await auRepos();
dire('AU DOIGT AUSSI : la moitié droite de l\'écran la pousse à droite',
    apresD.x > avantD.x + CASE * .8, `${Math.round(apresD.x - avantD.x)} px`);

// ── L'APERÇU DU PROFESSEUR ─────────────────────────────────────────────────
//
// Quand Rémy met « aperçu » sur une étape, c'est un robot qui joue. S'il
// mourait au premier pic, Rémy verrait un jeu qui perd — ce qui ressemble
// beaucoup à un jeu cassé. LE ROBOT JOUE DONC LE CHEMIN QUE LE CHERCHEUR A
// TROUVÉ, et cette mesure est aussi la seule qui rejoue ces quatre chemins
// DANS UN VRAI NAVIGATEUR : si l'un d'eux cessait d'être jouable, le robot
// mourrait ici avant que personne ne s'en aperçoive.
const fin = await hud();
console.log(`\n   ${fin.mot}`);

await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'bp-apercu';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;padding:16px';
    document.body.appendChild(d);
    const { engineBumpy } = await import('./js/games/bumpy.js');
    window.__apercu = engineBumpy(d, true, {});
});
await dormir(900);
const vus = new Set();
for (let i = 0; i < 70; i++) {
    const h = await s.page.evaluate(() => ({
        t: (document.querySelector('#bp-apercu [data-tableau]') || {}).textContent,
        v: (document.querySelector('#bp-apercu [data-vies]') || {}).textContent
    }));
    if (h.t) vus.add(`${h.t}/${h.v}`);
    await dormir(400);
}
const liste = [...vus].sort();
dire('L\'APERÇU TRAVERSE LES QUATRE TABLEAUX SANS JAMAIS MOURIR',
    liste.every(x => x.endsWith('/3')) && liste.some(x => x.startsWith('4')),
    `tableau/vies vus : ${liste.join(' ')}`);
await s.photo('#bp-apercu', 'tools/tmp/bumpy-apercu.png', 0);
console.log(`erreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.photo('.bp-wrap', 'tools/tmp/bumpy-joue.png', 0);
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
