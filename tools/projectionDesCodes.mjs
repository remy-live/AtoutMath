// « UN SEUL ÉCRAN QUE JE PEUX PROJETER » — ET ON LE MESURE SUR UN ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « ce qui serait bien pour les codes liés aux identifiants, c'est
// d'afficher un tableau avec identifiant et code (on retrouve le nom prénom,
// donc c'est facile), qui s'affichent sur un seul écran que je peux projeter
// […] en mode paysage du coup (donc peut être 2 colonnes avec des couleurs
// pour pas confondre) ».
//
// CE QU'AUCUNE ÉPREUVE DE `npm test` NE PEUT DIRE. « Tient sur un écran » n'est
// pas une propriété du HTML : c'est une propriété du HTML, de la feuille de
// style, de la taille de l'écran ET du nombre d'élèves, ensemble. Les quatre ne
// se rencontrent que dans un navigateur, à la taille d'un vidéoprojecteur.
//
// ET LE DÉFAUT QU'ON CHERCHE EST MUET. `overflow: hidden` garantit qu'aucune
// barre de défilement ne paraîtra — c'est-à-dire qu'un élève de la fin de la
// liste peut être COUPÉ EN BAS sans que rien ne le signale. Personne ne compte
// trente lignes du fond de la salle : l'élève sans code s'en apercevrait seul,
// au moment de se connecter. On mesure donc le bas de CHAQUE ligne.
//
// TROIS ÉCRANS, PARCE QU'UNE SALLE DE COLLÈGE N'EST PAS UN BUREAU : le
// vidéoprojecteur courant (1280 × 720), l'écran moderne (1920 × 1080) et le
// vieux projecteur 4/3 (1024 × 768), dont la proportion change tout quand les
// tailles sont en vh et en vw.
//
//   node tools/projectionDesCodes.mjs
//
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { htmlDesBillets, reglageDeProjection } from '../js/ui/billets.js';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

mkdirSync('tools/tmp', { recursive: true });

/** Une classe plausible : des noms français, et l'identifiant qu'en tire le serveur. */
const NOMS = ['dupont.emma', 'nguyen.maelle', 'martin.lucas', 'petit.zoe', 'bernard.tom',
    'moreau.jade', 'laurent.hugo', 'simon.lina', 'michel.noah', 'leroy.chloe',
    'roux.gabin', 'david.anna', 'bertrand.ethan', 'morel.mila', 'fournier.sacha',
    'girard.romy', 'bonnet.nino', 'dupuy.alice', 'lambert.theo', 'fontaine.iris',
    'rousseau.adam', 'vincent.eva', 'muller.jules', 'lefevre.nina', 'faure.liam',
    'andre.lou', 'mercier.aaron', 'blanc.manon', 'guerin.kais', 'boyer.ambre',
    'chevalier.timeo', 'robin.luna', 'gauthier.enzo', 'perrin.rose', 'clement.nael',
    'morin.lola'];
const CODE = ['NWXS', 'FB72', 'VHRQ', 'K3M7', 'PT49', 'ZC8D', 'RJ2W', 'XM56'];
const classe = (n, long = 0) => Array.from({ length: n }, (_, i) => ({
    prenom: 'Élève ' + (i + 1),
    login: long ? ('de-la-tour-du-pin.jean-baptiste-' + i).slice(0, long) : NOMS[i % NOMS.length],
    code: CODE[i % CODE.length]
}));

/**
 * CE QUE LA PAGE DEVIENT UNE FOIS PEINTE.
 *
 * LE CONTRASTE SE CALCULE SUR LES COULEURS RÉSOLUES, et c'est licite ICI :
 * cette page n'a ni `color-mix` ni transparence — le fond d'une ligne et
 * l'encre de son code sont deux hexadécimaux opaques, donc la couleur calculée
 * EST le pixel peint. (Dans l'application, où les teintes se mélangent, on
 * passe par `s.contrasteRendu`, qui lit les pixels.)
 */
const mesurer = (page) => page.evaluate(() => {
    const lum = (c) => {
        const [r, v, b] = (c.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number)
            .map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * v + 0.0722 * b;
    };
    const contraste = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
    };
    const lignes = [...document.querySelectorAll('.pr-ligne')];
    const hauteur = window.innerHeight;
    return {
        lignes: lignes.length,
        blocs: document.querySelectorAll('.pr-bloc').length,
        // LE DÉFILEMENT, ET CE QUI DÉBORDE MALGRÉ `overflow: hidden`.
        defile: document.documentElement.scrollHeight > hauteur + 1
            || document.body.scrollHeight > hauteur + 1,
        coupees: lignes.filter((l) => l.getBoundingClientRect().bottom > hauteur + 1).length,
        // UN IDENTIFIANT EN POINTS DE SUSPENSION N'EST PLUS UN IDENTIFIANT.
        tronques: lignes.map((l) => l.querySelector('.pr-id'))
            .filter((e) => e && e.scrollWidth > e.clientWidth + 1).length,
        taille: lignes.length
            ? Math.round(parseFloat(getComputedStyle(lignes[0]).fontSize)) : 0,
        tailleCode: lignes.length
            ? Math.round(parseFloat(getComputedStyle(lignes[0].querySelector('.pr-code')).fontSize)) : 0,
        hauteurLigne: lignes.length ? Math.round(lignes[0].getBoundingClientRect().height) : 0,
        // Le pire contraste code/fond des trois blocs, et le pire identifiant.
        contraste: Math.min(...lignes.map((l) => contraste(
            getComputedStyle(l.querySelector('.pr-code')).color,
            getComputedStyle(l).backgroundColor))),
        contrasteId: Math.min(...lignes.map((l) => contraste(
            getComputedStyle(l.querySelector('.pr-id')).color,
            getComputedStyle(l).backgroundColor))),
        // DES COULEURS QUI DISTINGUENT VRAIMENT LES BLOCS. Rémy : « avec des
        // couleurs pour pas confondre ». Si les trois blocs sortaient de la
        // même teinte, la règle serait écrite et sans effet.
        teintes: [...new Set([...document.querySelectorAll('.pr-bloc')]
            .map((b) => getComputedStyle(b.querySelector('.pr-ligne')).backgroundColor))].length
    };
});

const ECRANS = [[1280, 720, 'vidéoprojecteur'], [1920, 1080, 'écran moderne'], [1024, 768, 'projecteur 4/3']];

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];

for (const [n, long, quoi] of [[12, 0, 'petit groupe'], [24, 0, 'classe ordinaire'],
    [30, 0, 'classe pleine'], [31, 0, 'classe pleine + 1'], [36, 0, 'la plus grosse'],
    [30, 31, 'noms à rallonge']]) {
    const eleves = classe(n, long);
    const r = reglageDeProjection(eleves);
    const fichier = `tools/tmp/projection-${n}${long ? '-longs' : ''}.html`;
    writeFileSync(fichier, htmlDesBillets({ eleves, nom: '6e B', origine: 'https://atoutmath.fr/' }));
    console.log(`\n\x1b[1m${n} élèves — ${quoi}\x1b[0m`
        + gris(`  ${r.blocs} blocs × ${r.lignes} lignes · ${r.taille} / ${r.tailleLargeur}`));

    for (const [l, h, nom] of ECRANS) {
        const page = await nav.newPage({ viewport: { width: l, height: h } });
        page.on('pageerror', (e) => erreurs.push(e.message));
        await page.goto('file://' + process.cwd() + '/' + fichier);
        // LA VUE DE DÉPART EST « BILLETS » : on clique comme Rémy cliquera.
        // Mesurer la projection sans la choisir, c'est mesurer une page cachée
        // — toutes les largeurs y valent zéro, et tout semble tenir.
        await page.evaluate(() => { document.body.dataset.vue = 'projection'; });
        await page.waitForTimeout(150);
        const m = await mesurer(page);
        const ok = !m.defile && !m.coupees && !m.tronques;
        console.log(`   ${ok ? vert('✓') : rouge('✗')} ${nom.padEnd(18)} ${l}×${h}  `
            + `${m.lignes} lignes de ${m.hauteurLigne} px · texte ${m.taille} px, code ${m.tailleCode} px`
            + (m.defile ? rouge(' · DÉFILE') : '')
            + (m.coupees ? rouge(` · ${m.coupees} LIGNE(S) COUPÉE(S)`) : '')
            + (m.tronques ? rouge(` · ${m.tronques} IDENTIFIANT(S) TRONQUÉ(S)`) : ''));
        if (!ok) ratés++;
        if (l === 1280 && h === 720) {
            await page.screenshot({ path: `tools/tmp/projection-${n}${long ? '-longs' : ''}.png` });
            dire(`${n} élèves : contraste du code ${m.contraste.toFixed(1)}:1`
                + `, de l'identifiant ${m.contrasteId.toFixed(1)}:1`,
                m.contraste >= 4.5 && m.contrasteId >= 4.5,
                'sous 4,5:1 on ne lit plus un texte projeté dans une salle éclairée');
            dire(`${n} élèves : ${m.teintes} teinte(s) pour ${m.blocs} bloc(s)`,
                m.teintes >= Math.min(2, m.blocs),
                'une couleur par bloc, sans quoi on confond les colonnes');
            // LA TAILLE N'EST PAS UN CONFORT : c'est la différence entre lire
            // sa ligne du fond de la salle et venir devant le tableau. 20 px
            // sur 720 de haut, c'est 2,8 % de la hauteur de l'image projetée —
            // soit environ 3 cm sur un écran d'un mètre, lisible à 8 m.
            dire(`${n} élèves : ${m.taille} px de texte sur 720`, m.taille >= 20,
                'en dessous, on ne lit plus du fond de la salle');
        }
        await page.close();
    }
}

await nav.close();
console.log(`\nerreurs de page : ${erreurs.length}`);
erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
console.log(ratés || erreurs.length ? rouge(`\n${ratés} mesure(s) en échec.`) : vert('\nTout tient sur un écran.'));
process.exit(ratés || erreurs.length ? 1 : 0);
