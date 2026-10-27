// LES QUATRE DÉCORS DU PENDU, PAR LE CHEMIN DE L'ÉLÈVE — au doigt et à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/decorsAuDoigt.mjs
//
// RÉMY, 27 octobre : « les dessins pour le pendu ne sont vraiment pas beaux »,
// puis, devant trois maquettes : « Les 3, et on peut choisir ».
//
// IL NE REMPLACE PAS `tools/penduAuDoigt.mjs`, QUI JOUE UNE PARTIE ENTIÈRE et
// vérifie que la victoire est comptée juste. Celui-ci ne regarde QUE le
// dessin, aux quatre réglages — deux outils, deux questions.
//
// LA PLANCHE DES DÉCORS (`tools/decorsDuPendu.mjs`) MONTRE LES DESSINS, PAS LE
// JEU. Elle appelle `decorSvg` à la main, dans une page fabriquée pour elle :
// elle ne dit rien de ce que l'élève voit. Trois choses ne se mesurent que par
// son chemin, et chacune a déjà coûté quelque part dans ce dépôt :
//
//   · LE DESSIN EST-IL DANS SA BOÎTE ? L'épreuve garde les coordonnées du SVG ;
//     elle ne sait rien de la feuille de style qui le pose. Un décor qui
//     dépasse de son cadre est rogné sans un mot.
//   · LE DESSIN DIT-IL LE BON NOMBRE D'ERREURS ? L'épreuve mesure `decorSvg`,
//     pas ce que l'activité lui passe. Un décalage d'un cran entre ce que
//     l'élève a joué et ce qu'il voit ne se verrait nulle part ailleurs.
//   · L'ALARME DES DEUX DERNIÈRES ERREURS CHANGE-T-ELLE QUELQUE CHOSE ? Elle
//     repeignait le dessin tant qu'il était à l'encre du thème ; elle repeint
//     maintenant le FOND. Une classe qu'on ajoute et un fond qui ne bouge pas,
//     c'est le même écran avec un nom de plus.

import { ouvrirSonde } from './sonde.mjs';
import { DECORS } from '../js/core/generators/pendu.js';
import { VIF } from '../js/core/penduDecors.js';

const ECRANS = [
    { nom: 'au doigt', largeur: 390, hauteur: 844 },
    { nom: 'sur ordinateur', largeur: 1280, hauteur: 900 }
];

// DES LETTRES RARES EN TÊTE : on cherche à se TROMPER vite. Avec E, A, S en
// premier on trouve le mot avant d'avoir vu le troisième dessin.
const ORDRE = 'ZXWKJYVHGFBPDLCMNRQSTUAEIO'.split('');

const dit = [];
let raté = 0;

/** Le nombre d'erreurs tel que l'ÉCRAN le montre : les touches en rouge. */
const erreursVues = (s) => s.page.evaluate(() =>
    document.querySelectorAll('.pd-touche--ratee').length);

const partieFinie = (s) => s.page.evaluate(() =>
    !!document.querySelector('.pd-haut--ok, .pd-haut--rate'));

/** Joue des lettres jusqu'à atteindre `cible` erreurs, sans finir la partie. */
async function jusqua(s, cible) {
    for (const c of ORDRE) {
        if (await erreursVues(s) >= cible) return true;
        if (await partieFinie(s)) return false;
        await s.page.evaluate((l) => {
            const b = document.querySelector(`.pd-touche[data-lettre="${l}"]`);
            if (b && !b.disabled) b.click();
        }, c);
        await s.page.waitForTimeout(110);
    }
    return await erreursVues(s) >= cible;
}

/** Ce que le décor montre d'allumé, compté SUR LA PAGE. */
const comptePage = (s, couleur) => s.page.evaluate((c) =>
    [...document.querySelectorAll('.pd-decor svg *')]
        .filter(e => (e.getAttribute('fill') || '').toLowerCase() === c).length, couleur);

/** Le fond du cadre du décor, tel que le navigateur le calcule. */
const fondDuCadre = (s) => s.page.evaluate(() => {
    const d = document.querySelector('.pd-decor');
    return d ? getComputedStyle(d).backgroundImage + '|' + getComputedStyle(d).boxShadow : '';
});

for (const ecran of ECRANS) {
    const s = await ouvrirSonde({ largeur: ecran.largeur, hauteur: ecran.hauteur });
    await s.identifier();
    dit.push(`\n── ${ecran.nom.toUpperCase()} (${ecran.largeur} × ${ecran.hauteur}) ──`);

    for (const [cle, nom] of Object.entries(DECORS)) {
        const souci = await s.ouvrirExercice('logi-pendu',
            { theme: 'tout', niveau: '1', indice: 'toujours', decor: cle }, { questions: 6 });
        if (souci) { dit.push(`  ✗ ${cle} : ${souci}`); raté++; continue; }
        await s.doitExister('.pd-decor svg', `le décor « ${cle} » n'est pas dessiné`);

        const avant = await fondDuCadre(s);

        if (!await jusqua(s, 3)) { dit.push(`  ✗ ${cle} : trois erreurs introuvables`); raté++; continue; }

        // ① Le dessin est-il dans sa boîte ?
        const boites = await s.page.evaluate(() => {
            const d = document.querySelector('.pd-decor');
            const g = d && d.querySelector('svg');
            if (!d || !g) return null;
            const a = d.getBoundingClientRect(), b = g.getBoundingClientRect();
            return {
                debord: Math.round(Math.max(0, a.left - b.left, b.right - a.right,
                    a.top - b.top, b.bottom - a.bottom)),
                l: Math.round(b.width), h: Math.round(b.height)
            };
        });
        const place = boites && boites.debord === 0
            ? `${boites.l} × ${boites.h} px, dans sa boîte`
            : `DÉBORDE DE ${boites ? boites.debord : '?'} px`;
        if (!boites || boites.debord > 0) raté++;

        // ② Le dessin dit-il le bon nombre d'erreurs ?
        let compte = 'rien à compter';
        if (cle === 'gateau' || cle === 'fusee') {
            const couleur = cle === 'gateau' ? VIF.flamme : VIF.voyant;
            const vus = await comptePage(s, couleur);
            const attendus = 6 - 3;
            compte = vus === attendus
                ? `${vus} allumé(s) après 3 erreurs, c'est le compte`
                : `${vus} allumé(s) au lieu de ${attendus} — LE DESSIN MENT`;
            if (vus !== attendus) raté++;
        }

        // ③ Le dessin n'est-il pas une image unie ?
        const img = await s.photo('.pd-decor',
            `tools/tmp/pendu-${cle}-${ecran.largeur}.png`, 0);
        const dessine = img && !img.unie;
        if (!dessine) raté++;

        // ④ L'alarme des deux dernières erreurs change-t-elle le cadre ?
        await jusqua(s, 4);
        const chaud = await s.page.evaluate(() =>
            !!document.querySelector('.pd-decor--chaud'));
        const apres = await fondDuCadre(s);
        const alarme = chaud && apres !== avant;
        if (!alarme) raté++;

        dit.push(`  ${nom}`);
        dit.push(`    · ${place}`);
        dit.push(`    · ${compte}`);
        dit.push(`    · ${dessine ? `dessiné (${img.teintes} teintes)` : 'IMAGE UNIE'}`);
        dit.push(`    · ${alarme ? 'le cadre s\'alarme à la 4ᵉ erreur'
            : 'LE CADRE NE S\'ALARME PAS'}`);
    }

    dit.push(`  erreurs de page : ${s.erreurs.length}, `
        + `fenêtres natives : ${s.fenetresNatives.length}`);
    if (s.erreurs.length) { dit.push('    ' + s.erreurs.slice(0, 3).join('\n    ')); raté++; }
    if (s.fenetresNatives.length) raté++;
    await s.fermer();
}

console.log(dit.join('\n'));
console.log(raté ? `\n${raté} POINT(S) À REPRENDRE.` : '\nTOUT PASSE.');
process.exit(raté ? 1 : 0);
