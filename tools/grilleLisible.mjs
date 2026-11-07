// LES QUATRE GRILLES DE CHIFFRES SE LISENT-ELLES, DANS LES CINQ THÈMES ?
//
// Rémy, capture du mathdoku en thème Forêt : « pas lisible ». Le défaut n'était
// pas la géométrie — la grille est carrée dans les onze conditions balayées —
// mais le QUADRILLAGE, qui prenait `--border`, un jeton fait pour border un
// panneau. Mesuré alors, contraste du trait de case sur le fond de la case :
//
//     clair 1,23 · sombre 1,41 · océan 1,56 · forêt 1,34 · couchant 1,44
//
// Un pixel à 1,3 ne se voit pas : les cases fondaient en blocs, et les cages
// se lisaient comme si elles étaient les cases. En thème sombre, même le trait
// de cage disparaissait (1,33 sur le fond de panneau).
//
// POURQUOI CET OUTIL EXISTE ALORS QUE `tests/grillePapier.test.mjs` GARDE DÉJÀ
// LES CHIFFRES : l'épreuve lit la feuille de style, cet outil lit ce que le
// NAVIGATEUR REND. Les deux ne voient pas la même chose — un thème qui
// redéclare un jeton, une règle plus spécifique ajoutée ailleurs, un
// `color-mix` que Chromium rend en `oklab()` : tout cela passe sous une
// épreuve de texte et se voit ici.
//
//     node tools/grilleLisible.mjs [identifiant-d-exercice]
//
// Sans argument, les quatre grilles. Il rend 1 si un trait passe sous 3, ce
// qu'un objet graphique demande pour être vu.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const GRILLES = [
    ['calc-mathodu', 'mathdoku'],
    ['calc-binairo', 'binairo'],
    ['calc-sudoku', 'sudoku'],
    ['calc-garam', 'garam']
];
const THEMES = [null, 'dark', 'ocean', 'forest', 'sunset'];
// LES TAILLES DE FENÊTRE OÙ UNE GRILLE SE CASSE. Ce ne sont pas des tailles
// choisies pour faire joli : ce sont celles qui serrent le plateau entre la
// consigne, la palette et les deux boutons. 375 × 600 est celle qui a mangé
// six cases du binairo.
const TAILLES = [
    [390, 844, 'téléphone'],
    [375, 600, 'iPhone court'],
    [360, 640, 'Android'],
    [320, 568, 'le plus petit'],
    [844, 390, 'couché'],
    [1280, 900, 'ordinateur']
];
/** Le plancher d'un objet graphique : en dessous, le trait n'est pas vu. */
const PLANCHER_TRAIT = 3;
/** Un chiffre est du texte : il se lit à 4,5. */
const PLANCHER_ENCRE = 4.5;

// CE QUI TOURNE DANS LA PAGE.
//
// ON NOMME CE QU'ON MESURE. Une première version choisissait ses éléments par
// leur TAILLE — « ce qui fait plus de huit pixels dans le plateau » — et
// ramassait trente-huit décorations pour seize cases : elle a rendu sept
// verdicts « RATÉ » sur sept, dont deux dont j'avais la capture correcte sous
// les yeux. Les jeux écrivent `kk-cell`, `su-cell`, `ga-cell` sur leurs cases ;
// c'est ce sélecteur-là qui mesure des cases.
//
// TROIS COUPLES, ET PAS UN DE PLUS : le trait fin sur le fond de la case, le
// trait épais qui porte les cages ou les blocs, l'encre sur le fond. Ce sont
// les trois qui manquaient.
const MESURE = () => {
    const rgb = (v) => (String(v).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
        const c = [r, g, b].map(x => x / 255)
            .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
    };
    const plateau = document.querySelector('.kk-board, .su-board, .ga-board');
    if (!plateau) return { erreur: 'plateau absent' };
    const cases = [...plateau.querySelectorAll('.kk-cell, .su-cell, .ga-cell')];
    if (!cases.length) return { erreur: 'aucune case' };

    // LE FOND D'UNE CASE PEUT ÊTRE TRANSPARENT : c'est alors celui du plateau
    // qu'on voit, et le mesurer noir inventerait un contraste qui n'existe pas.
    const transparent = (v) => !v || /rgba?\([^)]*,\s*0\)/.test(v) || v === 'transparent';
    const fondPlateau = rgb(getComputedStyle(plateau).backgroundColor);
    const fondDe = (el) => {
        const v = getComputedStyle(el).backgroundColor;
        return transparent(v) ? fondPlateau : rgb(v);
    };

    // Les deux épaisseurs de trait, prises sur les cases telles qu'elles sont
    // dessinées : on ne suppose pas quel côté porte quoi.
    const bords = cases.flatMap(el => {
        const st = getComputedStyle(el);
        return ['Top', 'Right', 'Bottom', 'Left'].map(c => ({
            w: parseFloat(st['border' + c + 'Width']) || 0,
            couleur: st['border' + c + 'Color'],
            style: st['border' + c + 'Style'], el
        }));
    // ON NE JUGE QUE LES TRAITS PLEINS. Le garam sépare les dizaines des
    // unités d'un même nombre par un POINTILLÉ, et il est discret exprès :
    // « on lit UN nombre à deux chiffres, pas deux cases ». Le mesurer comme
    // un trait de grille condamnait un choix délibéré — l'outil réclamait 3
    // là où le dessin demande le contraire.
    }).filter(b => b.w > 0 && b.style === 'solid');
    // LE PIRE COUPLE, PAS LE PREMIER VENU. Les cases n'ont pas toutes le même
    // fond : une case DONNÉE est grise, et le même trait y perd un demi-point
    // de contraste. La première version prenait la case que le tri sortait en
    // tête — elle a rendu 3,13 sur le mathdoku et 2,86 sur le sudoku alors que
    // les deux portent le même trait sur les mêmes fonds. Un balayage annonce
    // ce qu'un élève peut rencontrer de pire, pas ce qu'on a tiré au sort.
    const pire = (l) => l.sort((a, b) => ratio(rgb(a.couleur), fondDe(a.el))
        - ratio(rgb(b.couleur), fondDe(b.el)))[0];
    const fin = pire(bords.filter(b => b.w < 2));
    // UNE SEULE ÉPAISSEUR EST UNE GRILLE VALABLE, et la première version de cet
    // outil l'appelait une erreur : le binairo n'a pas de cages, le garam pose
    // des cases séparées. Deux jeux sur quatre étaient refusés faute d'un trait
    // qu'ils n'ont aucune raison d'avoir.
    const epais = pire(bords.filter(b => b.w >= 2));
    if (!fin && !epais) return { erreur: 'la grille n\'a aucun trait' };

    // L'ENCRE : la couleur du texte d'une case VIDE, celle que l'élève verra
    // quand il posera son chiffre. Une case donnée a son propre couple.
    const vide = cases.find(el => !el.classList.contains('kk-given')) || cases[0];
    return {
        trait: fin ? ratio(rgb(fin.couleur), fondDe(fin.el)) : null,
        cage: epais ? ratio(rgb(epais.couleur), fondDe(epais.el)) : null,
        encre: ratio(rgb(getComputedStyle(vide).color), fondDe(vide))
    };
};

// LA GÉOMÉTRIE : autant de cases que la grille en annonce, carrées, et AUCUNE
// hors du plateau. Le nombre attendu se lit sur le plateau lui-même (`--kk-n`,
// `--su-n`) ou, à défaut, sur ce que le jeu a écrit — on ne le suppose pas.
const GEOMETRIE = () => {
    const plateau = document.querySelector('.kk-board, .su-board, .ga-board');
    if (!plateau) return { erreur: 'plateau absent' };
    const st = getComputedStyle(plateau);
    const r = plateau.getBoundingClientRect();
    const cases = [...plateau.querySelectorAll('.kk-cell, .su-cell, .ga-cell')];
    if (!cases.length) return { erreur: 'aucune case' };
    const rects = cases.map(e => e.getBoundingClientRect());
    const n = Number(st.getPropertyValue('--kk-n')) || Number(st.getPropertyValue('--su-n')) || 0;
    const rapports = rects.map(x => x.width / x.height).filter(x => isFinite(x) && x > 0);
    return {
        plateau: `${Math.round(r.width)}×${Math.round(r.height)}`,
        cases: cases.length,
        // Le garam n'est pas carré : son nombre de cases ne se déduit pas d'un n.
        attendu: n ? n * n : cases.length,
        pire: rapports.length
            ? Math.max(...rapports.map(x => Math.max(x, 1 / x))) : 99,
        // CE QUI DÉBORDE NE SE VOIT PAS : le plateau est en `overflow: hidden`.
        coupees: rects.filter(x => x.bottom > r.bottom + 1 || x.right > r.right + 1).length
    };
};

const voulu = process.argv[2];
const aFaire = voulu ? GRILLES.filter(([id]) => id === voulu) : GRILLES;
if (!aFaire.length) {
    console.error(`aucune grille nommée « ${voulu} » — ` + GRILLES.map(g => g[0]).join(', '));
    process.exit(2);
}

let manques = 0;
for (const [id, nom] of aFaire) {
    const s = await ouvrirSonde({ largeur: 900, hauteur: 900 });
    await s.identifier();
    const raté = await s.ouvrirExercice(id);
    if (raté) { console.log(`  ${nom} : ${raté}`); await s.fermer(); manques++; continue; }
    await dormir(1300);

    for (const t of THEMES) {
        await s.theme(t);
        await dormir(260);
        const vu = await s.page.evaluate(MESURE);
        if (vu.erreur) { console.log(`  ${nom} : ${vu.erreur}`); manques++; continue; }
        // UN TRAIT ABSENT N'EST PAS UN TRAIT RATÉ : on ne juge que ce qui est
        // dessiné, sans quoi l'outil condamne un jeu pour ce qu'il ne fait pas.
        const sous = (v, p) => v !== null && v < p;
        const mal = sous(vu.trait, PLANCHER_TRAIT) || sous(vu.cage, PLANCHER_TRAIT)
            || sous(vu.encre, PLANCHER_ENCRE);
        if (mal) manques++;
        const dis = (v) => (v === null ? '   — ' : v.toFixed(2).padStart(5));
        console.log(`  ${mal ? 'RATÉ' : 'ok  '}  ${nom.padEnd(9)} ${(t || 'clair').padEnd(8)}`
            + ` trait ${dis(vu.trait)} · cage ${dis(vu.cage)} · encre ${dis(vu.encre)}`);
    }
    await s.fermer();
}

// --- ET LA GRILLE TIENT-ELLE ENTIÈRE ? --------------------------------------
//
// UNE GRILLE PEUT ÊTRE PARFAITEMENT LISIBLE ET AMPUTÉE. `overflow: hidden` sur
// le plateau coupe les rangées qui débordent SANS RIEN DIRE : à 375 × 600, le
// binairo perdait six de ses trente-six cases, et la capture de Rémy montrait
// six colonnes de cases trois fois trop hautes. Le contraste, lui, était
// impeccable. Les deux mesures sont donc nécessaires, et aucune ne remplace
// l'autre.
console.log('');
for (const [id, nom] of aFaire) {
    const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
    await s.identifier();
    const raté = await s.ouvrirExercice(id);
    if (raté) { console.log(`  ${nom} : ${raté}`); await s.fermer(); manques++; continue; }
    await dormir(1300);
    for (const [l, h, quoi] of TAILLES) {
        await s.page.setViewportSize({ width: l, height: h });
        await dormir(420);
        const vu = await s.page.evaluate(GEOMETRIE);
        if (vu.erreur) { console.log(`  ${nom} : ${vu.erreur}`); manques++; continue; }
        const mal = vu.coupees > 0 || vu.pire > 1.15 || vu.cases !== vu.attendu;
        if (mal) manques++;
        console.log(`  ${mal ? 'RATÉ' : 'ok  '}  ${nom.padEnd(9)} ${quoi.padEnd(13)}`
            + ` ${String(l + '×' + h).padStart(8)} · plateau ${vu.plateau}`
            + ` · ${vu.cases}/${vu.attendu} cases · rapport ${vu.pire.toFixed(2)}`
            + ` · coupées ${vu.coupees}`);
    }
    await s.fermer();
}

console.log(manques
    ? `\n${manques} mesure(s) ratée(s) (trait ${PLANCHER_TRAIT}, encre ${PLANCHER_ENCRE}, case carrée et entière).`
    : '\nLES QUATRE GRILLES SE LISENT ET TIENNENT ENTIÈRES.');
process.exit(manques ? 1 : 0);

// (la fonction MESURE est déclarée en tête du fichier, avant l'emploi)
