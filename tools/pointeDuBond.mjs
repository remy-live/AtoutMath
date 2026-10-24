// LA POINTE DE LA FLÈCHE ET LE POINT QU'ELLE VISE, MESURÉS EN UNITÉS DU DESSIN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en choisissant la maquette C du schéma des durées :
//
//   « le C très bien, par contre l'extrémité de la pointe de la flèche arrive
//     sur le cercle »
//
// POURQUOI ÇA NE SE VOIT PAS DANS LE CODE. La courbe s'arrête à une distance
// qu'on LIT dans la source — « x2 - 10 » —, mais la POINTE n'est pas le bout de
// la courbe : c'est un `marker`, et il DÉBORDE. Avec `markerUnits` par défaut,
// le marqueur est mis à l'échelle de l'épaisseur du trait — six fois deux, donc
// douze unités —, et `refX="9"` sur un gabarit de dix place l'ancrage aux neuf
// dixièmes : un dixième de douze, soit 1,2 unité, passe DEVANT la fin de la
// courbe. Et la courbe arrive de biais, donc ce débord se projette.
//
// CETTE SONDE NE DEVINE RIEN : elle demande au navigateur le dernier point de
// chaque chemin (`getPointAtLength`), sa tangente, ajoute le débord du marqueur,
// et retranche le rayon du point visé. Ce qu'elle imprime est l'AIR qui reste
// entre la pointe et le cercle, dans les unités du dessin.
//
//     node tools/pointeDuBond.mjs
//
// ON MESURE DEUX FOIS, ET LES DEUX SONT NÉCESSAIRES :
//
//   · SUR LE CHEMIN DE L'ÉLÈVE — on ouvre « Heures et Minutes » réglé sur la
//     soustraction, on demande un indice, et l'on ferme la carte. C'est la
//     seule mesure qui dit que le dessin RESTE sous l'énoncé quand la carte
//     s'en va, et que les bulles tombent sur leurs arcs avec la vraie police
//     et la vraie largeur.
//   · SUR LES DEUX FORMES DU DESSIN — un bond et deux bonds. Une question tirée
//     au hasard n'en montre qu'une, et c'est l'arc COURT qui arrive le plus de
//     biais : le débord de la pointe s'y projette le moins horizontalement.
//     Les deux schémas sont demandés au générateur lui-même et posés dans la
//     page réelle, donc avec la même feuille de style.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

// LE DÉBORD DU MARQUEUR, écrit une fois. markerWidth × épaisseur = sa largeur
// en unités du dessin ; ce qui dépasse `refX` passe devant la courbe.
const MARQUEUR = { largeur: 6, epaisseur: 2, refX: 9, gabarit: 10 };
const DEBORD = (MARQUEUR.largeur * MARQUEUR.epaisseur)
    * (1 - MARQUEUR.refX / MARQUEUR.gabarit);

/**
 * Ce que le navigateur sait dire d'un `.md-bonds-bloc` déjà posé dans la page.
 * Elle part d'un SÉLECTEUR et non d'un élément : Playwright ne peut pas passer
 * un nœud du navigateur à une fonction qu'il y injecte.
 */
const LIRE = ([sel, debord]) => {
    const racine = document.querySelector(sel);
    const svg = racine && racine.querySelector('svg.md-bonds');
    if (!svg) return { vide: true };
    const vb = svg.viewBox.baseVal;
    const points = [...svg.querySelectorAll('circle')].map(c => ({
        x: c.cx.baseVal.value, y: c.cy.baseVal.value, r: c.r.baseVal.value
    }));
    // LE `path` DU `<defs>` EST LA POINTE ELLE-MÊME et ne compte pas comme un
    // arc. On a déjà compté des pointes pour des secteurs ailleurs dans ce
    // dépôt, et l'épreuve annonçait « 12 dessinés pour 11 annoncés ».
    const arcs = [...svg.querySelectorAll('path')].filter(p => !p.closest('defs'));
    const ecarts = arcs.map((p, i) => {
        const L = p.getTotalLength();
        const bout = p.getPointAtLength(L);
        const avant = p.getPointAtLength(Math.max(0, L - 0.5));
        const dx = bout.x - avant.x, dy = bout.y - avant.y;
        const n = Math.hypot(dx, dy) || 1;
        const pointe = { x: bout.x + (dx / n) * debord, y: bout.y + (dy / n) * debord };
        const vise = points[i + 1];
        if (!vise) return null;
        return {
            air: Math.hypot(pointe.x - vise.x, pointe.y - vise.y) - vise.r,
            sommetX: p.getPointAtLength(L / 2).x,
            sommetY: p.getPointAtLength(L / 2).y
        };
    }).filter(Boolean);
    // LES BULLES : leur centre doit tomber sur le sommet de son arc, et leur
    // haut ne doit pas sortir de la scène — c'est ce débordement-là qui a
    // décidé de la hauteur de la boîte.
    const scene = racine.querySelector('.md-scene');
    const boite = scene.getBoundingClientRect();
    const echelle = boite.width / vb.width;
    const bulles = [...racine.querySelectorAll('.md-bulle')].map((b, i) => {
        const r = b.getBoundingClientRect();
        const e = ecarts[i];
        return {
            ecartAuSommet: e
                ? Math.round((r.left + r.right) / 2 - boite.left - e.sommetX * echelle)
                : null,
            horsScene: Math.round(boite.top - r.top),
            // LE BAS DE LA BULLE DOIT ÊTRE AU-DESSUS DU SOMMET DE L'ARC : une
            // bulle posée SOUS son sommet couvre la courbe qu'elle désigne.
            sousLeSommet: e
                ? Math.round(r.bottom - boite.top - e.sommetY * echelle)
                : null
        };
    });
    return {
        unites: vb.width, echelle,
        largeurVue: Math.round(boite.width), hauteurVue: Math.round(boite.height),
        arrets: points.length, arcs: arcs.length, ecarts, bulles,
        cases: racine.querySelectorAll('.md-case').length,
        entoure: racine.querySelectorAll('.md-entoure').length
    };
};

const dire = (m) => {
    if (m.vide) { console.log('    \x1b[31mpas de schéma ici\x1b[0m'); return; }
    console.log(`    ${m.arrets} arrêts, ${m.arcs} arc(s), ${m.cases} case(s), `
        + `${m.entoure} résultat entouré · scène ${m.largeurVue}×${m.hauteurVue} px`);
    m.ecarts.forEach((e, i) => console.log(
        `    arc ${i + 1} : ${e.air.toFixed(1)} unités d'air avant le cercle `
        + `(${(e.air * m.echelle).toFixed(1)} px à l'écran)`));
    m.bulles.forEach((b, i) => console.log(
        `    bulle ${i + 1} : ${b.ecartAuSommet > 0 ? '+' : ''}${b.ecartAuSommet} px `
        + `du sommet de son arc, bas à ${b.sousLeSommet} px du sommet`
        + (b.horsScene > 0 ? ` · \x1b[31mdéborde de ${b.horsScene} px\x1b[0m` : '')));
};

const s = await ouvrirSonde({ largeur: 1180, hauteur: 920 });
await s.identifier();

// ── 1. LE CHEMIN DE L'ÉLÈVE ──────────────────────────────────────────────────
const raté = await s.ouvrirExercice('mes-duree', { marches: ['difference'] },
    { questions: 6 });
if (raté) {
    console.log('\x1b[31mexercice non ouvert\x1b[0m :', raté);
    await s.fermer();
    process.exit(1);
}

console.log(`\n── sur le chemin de l'élève`);
const calcul = await s.page.$eval('.game-question', q => q.textContent.trim());
console.log(`    « ${calcul} » · on demande un indice`);
await s.cliquer('[data-hint]', 'le bouton « Un indice »');
await dormir(700);
// ON FERME LA CARTE, ET C'EST LA MOITIÉ DE LA MESURE : le dessin doit rester.
// C'est la plainte que Rémy a faite deux fois — « je ne vois pas le schéma » —
// et elle ne se voit QUE si l'on referme.
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.fb-close')]
        .find(x => x.getBoundingClientRect().width > 0);
    if (b) b.click();
});
await dormir(600);
await s.doitExister('.hint-schema--pose .md-bonds-bloc',
    'le schéma posé sous l\'énoncé, carte fermée');
const combien = await s.page.evaluate(() =>
    document.querySelectorAll('.md-bonds-bloc').length);
console.log(`    schémas à l'écran : ${combien}`
    + (combien === 1 ? '' : '  \x1b[31m← il n\'en faut qu\'un\x1b[0m'));
const vrai = await s.page.evaluate(LIRE, ['.hint-schema--pose', DEBORD]);
dire(vrai);
await s.photo('.hint-schema--pose', 'tools/tmp/bond-pose.png', 14).catch(() => {});

// ── 2. LES DEUX FORMES, POSÉES DANS LA PAGE RÉELLE ───────────────────────────
//
// On demande au générateur de fabriquer l'item, exactement comme le meneur le
// fait, et l'on pose son outil dans un panneau de la page. La feuille de style
// est celle de l'application : c'est la seule façon d'avoir la même mesure.
console.log(`\n── les deux formes du dessin`);
const formes = [];
for (const voulu of [2, 3]) {
    const trouve = await s.page.evaluate(async (combien) => {
        const { dureesGenerator, arretsDesBonds } =
            await import('/js/core/generators/durees.js');
        const { makeRng } = await import('/js/core/ids.js');
        let html = '';
        for (let i = 0; i < 400 && !html; i++) {
            const it = dureesGenerator.generate({ marches: ['difference'] },
                { index: i, rng: makeRng('pointe-' + i) });
            const dessin = it && it.meta && it.meta.schemaPose;
            if (!dessin) continue;
            if (arretsDesBonds(it.meta.y, it.meta.x).length === combien) html = dessin;
        }
        if (!html) return false;
        let bac = document.querySelector('#sonde-bac');
        if (!bac) {
            bac = document.createElement('div');
            bac.id = 'sonde-bac';
            bac.className = 'np-outil';
            bac.style.cssText = 'position:fixed; left:12px; top:12px; width:340px;'
                + ' z-index:99999; background:var(--bg-panel); padding:10px; border-radius:12px';
            document.body.appendChild(bac);
        }
        bac.innerHTML = html;
        return true;
    }, voulu);
    console.log(`  ${voulu - 1} bond(s) :`);
    if (!trouve) { console.log('    \x1b[31maucun item de cette forme en 400 tirages\x1b[0m'); continue; }
    const m = await s.page.evaluate(LIRE, ['#sonde-bac', DEBORD]);
    dire(m);
    formes.push(m);
    await s.photo('#sonde-bac', `tools/tmp/bond-${voulu - 1}arc.png`).catch(() => {});
}

// ── LE VERDICT ───────────────────────────────────────────────────────────────
//
// DEUX UNITÉS AU MOINS, ET PAS PLUS DE QUINZE. En dessous, la pointe touche le
// cercle — c'est ce que Rémy a vu. Au-dessus, la flèche n'atteint plus son
// arrêt, et le dessin ne dit plus « on arrive ICI ».
//
// ET AUCUNE BULLE NE DÉBORDE DE LA SCÈNE : une bulle coupée par le haut de la
// carte est pire qu'un pointillé, parce qu'on ne sait pas qu'il y a une case.
const mesures = [vrai, ...formes].filter(m => !m.vide);
const airs = mesures.flatMap(m => m.ecarts.map(e => e.air));
const deborde = mesures.flatMap(m => m.bulles).filter(b => b.horsScene > 0).length;
const ok = airs.length && airs.every(a => a >= 2 && a <= 15) && !deborde && combien === 1;
console.log(ok
    ? `\n\x1b[32mLa pointe laisse de l'air\x1b[0m sans lâcher son arrêt, `
        + `et les ${mesures.flatMap(m => m.bulles).length} bulles tiennent dans la scène.`
    : `\n\x1b[31mÀ REVOIR\x1b[0m : air de ${Math.min(...airs).toFixed(1)} à `
        + `${Math.max(...airs).toFixed(1)} unités (on veut 2 à 15), `
        + `${deborde} bulle(s) hors scène.`);
console.log('erreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 4));
await s.fermer();
