// L'APERÇU DU PROFESSEUR MONTRE-T-IL CE QUE L'ÉLÈVE VOIT ?
//
// RÉMY, le 13 octobre : « idem c'est petit — est-ce manière générale car c'est
// le mode aperçu pour prof ? »
//
// C'est LA question à trancher avant de corriger quoi que ce soit : si son
// aperçu ment, il signale depuis ce matin des défauts que ses élèves n'ont
// pas ; s'il dit vrai, chacune de ses remarques vaut pour trente téléphones.
//
// ON MESURE LE MÊME EXERCICE PAR LES DEUX CHEMINS, sur la même fenêtre, et
// l'on compare ce qui se regarde : la part de l'écran que prend le dessin.
//
//     node tools/apercuContreEleve.mjs [exercice...]
//
// L'aperçu « mobile » du professeur pose au jeu un cadre fixe :
//
//     #game-layer.device-simulator { height: 90vh; width: 400px; max-height: 850px; }
//
// Ces deux lignes ont été écrites pour un ORDINATEUR, où simuler un téléphone
// demande un cadre étroit dans un grand écran. Sur un vrai téléphone, le cadre
// est plus large que l'écran — et c'est exactement ce qu'il faut mesurer.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const EXERCICES = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['geo-relier-points', 'don-tableau-croise', 'geo-codage-lire', 'num-rang'];

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

/** Monte un exercice par le meneur, dans le mode d'affichage demandé. */
async function monter(id, deviceMode) {
    await s.page.evaluate(async ([exoId, mode]) => {
        if (window.__sondeRunner) { try { window.__sondeRunner.exit(); } catch (e) {} }
        await new Promise(ok => setTimeout(ok, 280));
        const { getExerciseById } = await import('./js/data/catalog.js');
        const { makeStep, makePath } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        const { Runner } = await import('./js/core/runner.js');
        const exo = getExerciseById(exoId);
        if (!exo) return;
        const pas = makeStep(exo.id, {}, { stepId: 's1', nbItems: 8, threshold: 0 });
        window.__sondeRunner = new Runner({
            path: makePath('Sonde', [pas], politiquePerso()), deviceMode: mode });
        window.__sondeRunner.start();
    }, [id, deviceMode]);
    await dormir(1700);
    // Les jeux à canevas s'ouvrent sur un écran « JOUER ».
    await s.page.evaluate(() => {
        const b = [...document.querySelectorAll('#game-layer button')]
            .filter(x => x.getBoundingClientRect().width > 0)
            .find(x => /^(jouer|commencer|c'est parti|démarrer|go)/i
                .test((x.textContent || '').trim()));
        if (b) b.click();
    });
    await dormir(1100);
}

/** Ce qui se regarde : le plus grand dessin de la zone de jeu, et sa part. */
async function mesurer() {
    return s.page.evaluate(() => {
        const couche = document.getElementById('game-layer');
        const board = document.getElementById('game-board');
        if (!board) return null;
        const rb = board.getBoundingClientRect();
        const rc = couche.getBoundingClientRect();
        // LE DESSIN, quelle que soit sa nature : un SVG, un canevas ou une
        // grille. On prend le plus grand — c'est lui qu'on vient regarder.
        const candidats = [...board.querySelectorAll('svg, canvas, table, .rp-grille, [class*="grille"]')]
            .map(e => ({ e, r: e.getBoundingClientRect() }))
            .filter(o => o.r.width > 30 && o.r.height > 30)
            .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
        const d = candidats[0];
        return {
            fenetre: { l: window.innerWidth, h: window.innerHeight },
            couche: { l: +rc.width.toFixed(0), h: +rc.height.toFixed(0),
                droite: +rc.right.toFixed(0) },
            plateau: { l: +rb.width.toFixed(0), h: +rb.height.toFixed(0) },
            dessin: d ? {
                quoi: d.e.tagName.toLowerCase()
                    + (typeof d.e.className === 'string' && d.e.className
                        ? '.' + d.e.className.trim().split(/\s+/)[0] : ''),
                l: +d.r.width.toFixed(0), h: +d.r.height.toFixed(0)
            } : null,
            // LE VIDE SOUS LE DESSIN, en pixels : c'est ce que Rémy voit et
            // appelle « c'est petit ».
            videEnBas: d ? +(rb.bottom - d.r.bottom).toFixed(0) : null
        };
    });
}

console.log('\nMême exercice, même fenêtre de 390 × 844, deux chemins.\n');
for (const id of EXERCICES) {
    console.log(`\x1b[1m${id}\x1b[0m`);
    const lignes = [];
    for (const [nom, mode] of [['l\'élève', 'none'], ['l\'aperçu « mobile »', 'mobile'],
        ['l\'aperçu « tablette »', 'tablet']]) {
        await monter(id, mode);
        const v = await mesurer();
        if (!v) { console.log(`  ${nom.padEnd(22)} (pas de plateau)`); continue; }
        const part = v.dessin
            ? (100 * v.dessin.l * v.dessin.h / (v.plateau.l * v.plateau.h)).toFixed(0)
            : null;
        lignes.push({ nom, v, part });
        const sort = v.couche.droite - v.fenetre.l;
        console.log(`  ${nom.padEnd(22)} couche ${String(v.couche.l).padStart(4)}×${String(v.couche.h).padStart(3)}`
            + ` · plateau ${String(v.plateau.l).padStart(3)}×${String(v.plateau.h).padStart(3)}`
            + ` · dessin ${v.dessin ? `${String(v.dessin.l).padStart(3)}×${String(v.dessin.h).padStart(3)}` : '   —   '}`
            + (part !== null ? ` = \x1b[1m${String(part).padStart(2)} %\x1b[0m du plateau` : '')
            + ` · ${String(v.videEnBas).padStart(4)} px de vide dessous`
            + (sort > 1 ? ` · \x1b[31m${sort} px hors écran\x1b[0m` : ''));
    }
    // LE VERDICT QUE RÉMY ATTEND : son aperçu rapetisse-t-il, ou non ?
    const eleve = lignes.find(l => l.nom === 'l\'élève');
    const apercu = lignes.find(l => l.nom.includes('mobile'));
    if (eleve && apercu && eleve.dessin !== null && eleve.part && apercu.part) {
        const ecart = Number(apercu.part) - Number(eleve.part);
        console.log('  ' + (Math.abs(ecart) < 3
            ? `\x1b[32ml'aperçu montre la même chose que l'élève\x1b[0m (${ecart > 0 ? '+' : ''}${ecart} point(s))`
            : ecart < 0
                ? `\x1b[31mL'APERÇU RAPETISSE\x1b[0m de ${-ecart} points de pourcentage`
                : `\x1b[33ml'aperçu AGRANDIT de ${ecart} points\x1b[0m`));
    }
    console.log('');
}
await s.fermer();
