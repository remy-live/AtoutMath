// LES PETITES AILES SUR LE CHEMIN DE L'ÉLÈVE — le geste, la nuit, le tremplin.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 22 novembre : « Tu refais tout le jeu à partir de ce que j'ai donné.
// Avant la fin d'un monde je veux juste une plus longue descente et un tremplin
// qui permet de faire un super long saut. Ne mets pas le son. »
//
// ── POURQUOI UNE SONDE, ALORS QUE LES ÉPREUVES MESURENT DÉJÀ ───────────────
//
// `tests/petitesAiles.test.mjs` simule `pas()` en boucle : il dit que la
// PHYSIQUE est juste. Il ne peut rien dire des trois choses qui décident de
// l'avis de Rémy, parce qu'aucune ne vit dans la physique :
//
//   · le jeu se MONTE dans une page, avec son canevas, son HUD et sa boucle
//     d'animation — et un moteur qui jette une erreur au premier dessin
//     laisse un rectangle blanc, pas un jeu ;
//   · l'appui passe par le DOIGT ou la BARRE D'ESPACE, donc par `surTouche`,
//     `demarre` et le reste du chemin ;
//   · la fin se DIT, avec son remède en une phrase.
//
// Et surtout : « ne rien faire » n'a de sens que sur le chemin de l'élève. Dans
// une boucle, c'est `() => false` ; sur une tablette, c'est un élève qui pose
// le doigt une fois pour lancer la partie, puis le retire — et c'est CELA qui
// doit perdre.
//
//     node tools/volPlaneDesAiles.mjs
//     node tools/volPlaneDesAiles.mjs --photos

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 1180, hauteur: 860 });
await s.identifier();

/** On monte le moteur directement : le jeu est une récompense, et son chemin
 *  dans l'interface passe par un menu qu'on n'a pas à traverser pour mesurer
 *  ce qu'il fait une fois ouvert. */
const monter = (graine) => s.page.evaluate(async (g) => {
    document.getElementById('plateau-aile')?.remove();
    const d = document.createElement('div');
    d.id = 'plateau-aile';
    d.style.cssText = 'position:fixed;top:0;left:0;width:1120px;height:720px;z-index:9999';
    document.body.appendChild(d);
    const m = await import('./js/games/petitesAiles.js');
    window.__jeu = m.enginePetitesAiles(d, false, { seed: g });
}, graine);

/** Les mètres affichés au tableau de bord — c'est ce que l'élève lit. */
const metres = () => s.page.evaluate(() => {
    const t = (document.getElementById('pa-score') || {}).textContent || '';
    const m = t.match(/(-?\d+)\s*m/);
    return m ? Number(m[1]) : null;
});

/** Le titre de l'écran de fin, s'il est affiché. */
const ecranDeFin = () => s.page.evaluate(() => {
    const e = document.getElementById('pa-fin');
    if (!e || !e.classList.contains('pa-fin--vu')) return null;
    return {
        titre: (document.getElementById('pa-fin-titre') || {}).textContent || '',
        texte: (document.getElementById('pa-fin-texte') || {}).textContent || ''
    };
});

console.log('\n\x1b[1mLE JEU SE MONTE, ET IL DESSINE\x1b[0m');
await monter('sonde');
await dormir(900);
dire('le canevas existe et il est peint', await s.page.evaluate(() => {
    const t = document.getElementById('pa-toile');
    if (!t || !t.width) return false;
    // UN CANEVAS PEINT N'EST PAS UNIFORME. S'il l'était, on aurait un aplat —
    // c'est-à-dire un jeu qui a planté au premier dessin sans rien dire.
    const c = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    const p = new Set();
    for (let i = 0; i < c.length; i += 4 * 977) p.add(`${c[i]},${c[i + 1]},${c[i + 2]}`);
    return p.size > 12;
}), 'plus de douze couleurs à l\'écran');
dire('le tableau de bord nomme l\'île', /Île 1/.test(
    await s.page.evaluate(() => (document.getElementById('pa-ile') || {}).textContent || '')));
dire('l\'écran de départ explique le geste', await s.page.evaluate(() =>
    /plonger/i.test((document.getElementById('pa-depart') || {}).textContent || '')));
if (photos) await s.photo('#plateau-aile', 'tools/tmp/ailes-depart.png');

console.log('\n\x1b[1mNE RIEN FAIRE DOIT FAIRE PERDRE, ET SE VOIR\x1b[0m');
// Un seul appui — celui qui lance la partie — puis plus rien, comme un élève
// qui pose la tablette.
await s.page.mouse.move(560, 400);
await s.page.mouse.down();
await dormir(120);
await s.page.mouse.up();
let fin = null, tenu = 0;
for (let i = 0; i < 100 && !fin; i++) { await dormir(1000); tenu++; fin = await ecranDeFin(); }
dire('la partie s\'arrête toute seule', !!fin, `au bout de ${tenu} s`);
dire('et avant qu\'on se lasse', tenu < 95, `${tenu} s, pour 90 de patience`);
if (fin) {
    dire('l\'écran de fin dit la cause', /nuit/i.test(fin.titre), `« ${fin.titre} »`);
    dire('et il dit quoi faire la prochaine fois', /plonge/i.test(fin.texte),
        `« ${fin.texte.slice(0, 110)}… »`);
}
if (photos) await s.photo('#plateau-aile', 'tools/tmp/ailes-nuit.png');

console.log('\n\x1b[1mL\'APPUI EST UNE VRAIE ACCÉLÉRATION\x1b[0m');
/** On joue `secondes` à la même graine, avec ou sans le bon geste. */
const courir = async (bonGeste, secondes) => {
    await monter('course');
    await dormir(500);
    await s.page.mouse.move(560, 400);
    await s.page.mouse.down(); await dormir(90); await s.page.mouse.up();
    if (bonGeste) {
        await s.page.evaluate(() => {
            const j = window.__jeu;
            j.__robot = setInterval(() => {
                j.appuie = j.relief.echantillon(j.etat.x).pente > 0;
            }, 16);
        });
    }
    await dormir(secondes * 1000);
    await s.page.evaluate(() => {
        clearInterval(window.__jeu.__robot); window.__jeu.appuie = false;
    });
    return metres();
};
// ── SEIZE SECONDES, ET PAS HUIT ──────────────────────────────────────────
//
// À huit secondes, l'écart mesuré valait 1,30 — juste sur la borne. Ce n'est
// pas un défaut du jeu : en huit secondes on franchit UNE colline, et l'avance
// du bon geste s'accumule colline après colline. Sur la partie entière,
// `node tools/equilibreDesAiles.mjs` la mesure à 2,8 fois. Une fenêtre trop
// courte ne mesure pas ce qu'on croit qu'elle mesure — c'est la même leçon que
// la fenêtre qui suivait la longueur du tremplin, en novembre.
const DUREE = 16;
const sans = await courir(false, DUREE);
const avec = await courir(true, DUREE);
dire('le tableau de bord compte les mètres', sans !== null && avec !== null,
    `${sans} m contre ${avec} m`);
dire('et le bon geste mène VISIBLEMENT plus loin, à durée égale', avec > sans * 1.3,
    `${avec} m contre ${sans} m en ${DUREE} s, `
    + `soit ${(avec / Math.max(1, sans)).toFixed(2)} fois`);

console.log('\n\x1b[1mLE TREMPLIN DE FIN D\'ÎLE LANCE POUR DE BON\x1b[0m');
await monter('tremplin');
await dormir(400);
// On pose l'oiseau juste avant le grand sommet, et on le fait plonger.
await s.page.evaluate(() => {
    const j = window.__jeu;
    j.demarre = true;
    const i = j.relief.iles[0];
    j.etat.x = i.sommetX - 400;
    j.etat.y = j.relief.echantillon(j.etat.x).y - 20;
    j.etat.auSol = true; j.etat.vx = 620; j.etat.vy = 0;
    j.__vu = { catapulte: false, ile: false, altitude: 0 };
    const voir = j.surEvenement.bind(j);
    j.surEvenement = (ev) => {
        if (ev.quoi === 'catapulte') j.__vu.catapulte = true;
        if (ev.quoi === 'ile') j.__vu.ile = true;
        voir(ev);
    };
    j.__suivi = setInterval(() => {
        const sol = j.relief.echantillon(j.etat.x);
        if (!sol.ocean) return;
        j.__vu.altitude = Math.max(j.__vu.altitude, 560 - j.etat.y);
    }, 16);
    j.__robot = setInterval(() => {
        j.appuie = j.relief.echantillon(j.etat.x).pente > 0;
    }, 16);
});
await dormir(9000);
const vu = await s.page.evaluate(() => {
    clearInterval(window.__jeu.__robot); clearInterval(window.__jeu.__suivi);
    window.__jeu.appuie = false;
    return window.__jeu.__vu;
});
dire('la catapulte part', vu.catapulte);
dire('et l\'oiseau franchit la mer', vu.ile);
dire('en passant haut au-dessus de l\'eau', vu.altitude > 300,
    `${Math.round(vu.altitude)} px au-dessus des vagues`);
if (photos) await s.photo('#plateau-aile', 'tools/tmp/ailes-tremplin.png');

console.log('\n\x1b[1mET RIEN NE CASSE\x1b[0m');
dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));

console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n\x1b[31m${rates} POINT(S) À REVOIR.\x1b[0m\n`
    : '\n\x1b[32mLE GESTE PAIE, LE TREMPLIN LANCE, ET LA NUIT TOMBE.\x1b[0m\n');
await s.fermer();
process.exit(rates ? 1 : 0);
