// LES LEÇONS DES TRANSFORMATIONS SONT-ELLES VISUELLES ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/leconsVisuelles.mjs
//
// RÉMY, devant l'espace d'un de ses élèves de 4e :
//
//   « c'est pas clair pour les transformations […] Et tracer l'image par quart
//     de tour ce n'est pas clair. Il faut que tant que faire se peut que ce
//     soit visuel pour les explications. »
//
// MESURÉ AVANT : les trois leçons de transformations de son plan de révision
// faisaient 254 mots, 22 lignes, et ZÉRO figure. Un quart de tour expliqué en
// mots reste un quart de tour expliqué en mots.
//
// CE QUE CETTE SONDE MESURE, et pourquoi chaque ligne y est :
//
//   · LE NOMBRE DE FIGURES, parce que c'est la demande, mot pour mot ;
//   · LA HAUTEUR DE LA CARTE, parce qu'une figure mal bornée coûte cher :
//     `.qd-svg { width: 100% }` — juste là où le quadrillage EST l'exercice —
//     étirait le croquis sur les 667 px de la carte, qui passait de 165 px de
//     haut à 745. Une leçon de trois paragraphes devenait une page ;
//   · LA LARGEUR AU TÉLÉPHONE, parce qu'un dessin de 228 px dans une carte de
//     271 ne tient que si on le lui a dit ;
//   · ET LES DEUX ENDROITS, parce que la leçon paraît aussi DANS l'exercice,
//     sous « La leçon » — c'est là qu'on la lit quand on bloque.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

/** Les quatre transformations, ratées, pour que le plan les propose. */
const donnerUnPasse = (s) => s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    for (const id of ['geo.transfo.rotation', 'geo.transfo.centrale',
        'geo.transfo.axiale', 'geo.transfo.translation']) {
        for (let i = 0; i < 8; i++) {
            state.recordAttempt({ correct: false, skillId: id, attemptIndex: 0,
                questionText: 'q', given: 'x', expected: 'y' });
        }
    }
});

/** Les badges gagnés se posent devant l'écran : on referme, comme l'élève. */
const fermerLesBadges = async (s) => {
    await s.page.evaluate(() => {
        [...document.querySelectorAll('button')]
            .filter(b => b.offsetParent && /Super/.test(b.textContent || ''))
            .forEach(b => b.click());
    });
    await dormir(600);
};

// ── 1. DANS LE PLAN DE RÉVISION, SUR DEUX ÉCRANS ────────────────────────────

for (const [largeur, hauteur, quoi] of [[780, 1100, 'ordinateur'], [390, 844, 'téléphone']]) {
    console.log(`\nLE PLAN DE RÉVISION — ${quoi} (${largeur} px)\n` + '─'.repeat(64));
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    await donnerUnPasse(s);
    await dormir(500);
    await s.cliquer('#mob-btn-profile', 'l\'espace élève');
    await dormir(900);
    await fermerLesBadges(s);
    await s.doitExister('.plan-card', 'une carte du plan de révision');
    // LE REPLI S'OUVRE COMME L'ÉLÈVE L'OUVRE : la leçon vit dans un `<details>`.
    await s.page.evaluate(() => {
        document.querySelectorAll('.plan-detail').forEach(d => { d.open = true; });
    });
    await dormir(500);

    const m = await s.page.evaluate(() => [...document.querySelectorAll('.plan-card')].map(c => {
        const lecon = c.querySelector('.plan-lecon');
        const svg = lecon && lecon.querySelector('svg');
        const txt = lecon ? (lecon.textContent || '').trim().replace(/\s+/g, ' ') : '';
        return {
            notion: ((c.querySelector('.plan-titre') || {}).textContent || '').trim(),
            figures: lecon ? lecon.querySelectorAll('svg').length : 0,
            hauteur: lecon ? Math.round(lecon.getBoundingClientRect().height) : 0,
            dessin: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
            carte: Math.round(c.getBoundingClientRect().width),
            mots: txt ? txt.split(/\s+/).length : 0
        };
    }));

    for (const c of m) {
        console.log(gris(`  ${c.notion} : ${c.figures} figure(s), ${c.mots} mots,`
            + ` carte ${c.hauteur} px, dessin ${c.dessin} px dans ${c.carte}`));
    }
    dire('chaque leçon de transformation porte un croquis',
        m.length > 0 && m.every(c => c.figures === 1));
    // LA BORNE DU DESSIN : sans elle, il s'étire sur toute la carte.
    dire('le croquis garde sa taille de croquis',
        m.every(c => c.dessin > 0 && c.dessin <= 230),
        m.map(c => c.dessin + ' px').join(' · '));
    dire('et il ne déborde jamais de sa carte',
        m.every(c => c.dessin <= c.carte));
    dire('la carte reste lisible d\'un coup d\'œil',
        m.every(c => c.hauteur < 520), m.map(c => c.hauteur + ' px').join(' · '));

    if (largeur === 780) {
        console.log(await s.photo('.plan-card:nth-of-type(3)', 'tools/tmp/lecon-quart-de-tour.png', 0));
    }
    dire('aucune erreur de page', s.erreurs.length === 0 && s.fenetresNatives.length === 0);
    await s.fermer();
}

// ── 2. DANS L'EXERCICE, SOUS « LA LEÇON » ───────────────────────────────────
//
// C'est l'autre endroit où la leçon se lit, et le plus utile : on y est quand
// on bloque. Elle y passait par `leconsDe`, qui ne gardait que la PHRASE et
// jetait donc le croquis avant même l'affichage.

console.log('\nDANS L\'EXERCICE, SOUS « LA LEÇON »\n' + '─'.repeat(64));
const s = await ouvrirSonde({ largeur: 900, hauteur: 1450 });
await s.identifier();
await s.ouvrirExercice('geo-transfo-quadrillage');
await dormir(1200);

// LE PANNEAU D'AIDE S'OUVRE PAR SON BOUTON — `#btn-show-instruction`, LU
// dans `js/app.js`. Deviné « le bouton dont l'étiquette contient aide ou ? »,
// on ouvrait « Que font ces icônes ? », un AUTRE panneau : la sonde annonçait
// alors « pas de leçon affichée » sur un logiciel parfaitement sain.
await s.cliquer('#btn-show-instruction', 'le panneau d\'aide de l\'exercice');
await dormir(900);
await s.doitExister('#aide-onglets', 'les onglets du panneau d\'aide');
dire('le panneau d\'aide s\'ouvre', await s.page.evaluate(() =>
    getComputedStyle(document.getElementById('instruction-modal')).display !== 'none'));

// L'ONGLET « La leçon » n'existe QUE si l'exercice a des leçons — voir
// `ongletsPour` : « un onglet vide est pire qu'un onglet absent ».
const aide = await s.page.evaluate(() => {
    const o = document.querySelector('#aide-onglets [data-onglet="lecon"]');
    if (o) o.click();
    return !!o;
});
await dormir(700);
dire('l\'onglet « La leçon » existe', aide);

const vu = await s.page.evaluate(() => {
    const z = document.querySelector('.aide-lecons');
    return z ? {
        lecons: z.querySelectorAll('.lc').length,
        figures: z.querySelectorAll('svg').length,
        legendes: z.querySelectorAll('.lc-croquis-dit').length
    } : null;
});
dire('la leçon y porte son croquis', !!vu && vu.figures >= 1,
    vu ? `${vu.lecons} leçon(s), ${vu.figures} figure(s), ${vu.legendes} légende(s)` : 'pas de leçon affichée');
if (vu && vu.figures) {
    console.log(await s.photo('.aide-lecons .lc', 'tools/tmp/lecon-dans-exercice.png', 0));
}
dire('aucune erreur de page', s.erreurs.length === 0 && s.fenetresNatives.length === 0);
await s.fermer();

console.log('\n' + '─'.repeat(64));
console.log(ratés === 0 ? vert('LES EXPLICATIONS SONT VISUELLES.')
    : rouge(`${ratés} mesure(s) manquée(s).`));
process.exit(ratés === 0 ? 0 : 1);
