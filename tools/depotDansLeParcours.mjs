// LE GESTE LE PLUS FRÉQUENT DU PROFESSEUR : glisser un exercice dans sa séance.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/depotDansLeParcours.mjs
//
// RÉMY, capture de l'atelier à l'appui :
//
//   « dans la zone de création de parcours, la zone ou on dragge pourrait aller
//     jusqu'en bas mais le cadre autour des exercices restent tel quel, est ce
//     clair, c'est juste que sous le cadre qui a les exercices du parcours, ca
//     ne réagit pas quand on glisse un exercice »
//
// POURQUOI CETTE SONDE RESTE. `tests/zoneDeDepotParcours.test.mjs` garde le
// TEXTE du code — qui écoute quoi, quelle règle est partagée. Il ne peut rien
// dire de la GÉOMÉTRIE : une marge ajoutée ailleurs, un `overflow` qui change,
// une colonne qui cesse de grandir, et la zone redevient le cadre sans qu'une
// seule ligne de JavaScript ait bougé. Seule la vitre répond à « où puis-je
// lâcher ? », et c'est la question de Rémy.
//
// CE QU'ELLE MESURE, dans cet ordre :
//
//   1. QUI ÉCOUTE à trois hauteurs — dans le cadre, juste dessous, tout en bas.
//      `elementFromPoint` nomme qui est là ; on remonte ses parents jusqu'au
//      premier qui porte un `ondrop`. Un « AUCUN » est le défaut d'origine.
//   2. LE GESTE ENTIER, à la souris, depuis la bibliothèque jusqu'au vide sous
//      le cadre — et l'on compte les étapes avant et après. C'est la seule
//      mesure qui ne se discute pas : soit l'exercice tombe, soit il ne tombe
//      pas.
//   3. LE CADRE RESTE TEL QUEL : sa hauteur, avant et après la correction,
//      parce que c'est l'autre moitié de la demande.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde({ largeur: 1440, hauteur: 900 });
await s.identifier();

// DEUX ÉTAPES AU PARCOURS, et non zéro : un parcours vide affiche un cadre à
// l'état vide, qui n'a pas la même hauteur. Le cas de Rémy est celui d'une
// séance commencée.
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    state.currentPath = makePath('Essai', [
        makeStep('calc-add', {}, { stepId: 's1' }),
        makeStep('calc-sub', {}, { stepId: 's2' })
    ], politiquePerso());
    const { renderTeacherPath } = await import('./js/ui/builder.js');
    renderTeacherPath();
});
await dormir(600);
await s.doitExister('#path-container', 'le cadre des exercices du parcours');
await s.doitExister('#builder-center-col', 'la colonne du milieu');

// ── 1. QUI ÉCOUTE, ET OÙ ────────────────────────────────────────────────────

console.log('\nQUI ÉCOUTE LE DÉPÔT\n' + '─'.repeat(64));

const geo = await s.page.evaluate(() => {
    const cadre = document.getElementById('path-container');
    const col = document.getElementById('builder-center-col');
    const zone = document.getElementById('path-collapsible-wrapper');
    const rc = cadre.getBoundingClientRect();
    const rk = col.getBoundingClientRect();
    const x = Math.round(rc.left + rc.width / 2);
    // QUI PORTE UN `ondrop` SOUS CE POINT — soi-même ou un parent. Un dépôt
    // remonte la branche, donc la question se pose sur toute la branche.
    const accepte = (y) => {
        for (let e = document.elementFromPoint(x, y); e && e !== document.body; e = e.parentElement) {
            if (e.ondrop) return e.id ? '#' + e.id : '.' + e.className;
        }
        return 'AUCUN';
    };
    return {
        x,
        cadre: { bas: Math.round(rc.bottom), hauteur: Math.round(rc.height) },
        colonne: { bas: Math.round(rk.bottom) },
        zone: zone ? Math.round(zone.getBoundingClientRect().bottom) : null,
        videSousLeCadre: Math.round(rk.bottom - rc.bottom),
        dedans: accepte(Math.round(rc.bottom - 20)),
        justeDessous: accepte(Math.round(rc.bottom + 20)),
        enBas: accepte(Math.round(rc.bottom + (rk.bottom - rc.bottom) / 2))
    };
});

console.log(gris(`  le cadre s'arrête à ${geo.cadre.bas} px, la colonne descend à ${geo.colonne.bas}`
    + ` — ${geo.videSousLeCadre} px dessous`));
dire('dans le cadre, quelqu\'un écoute', geo.dedans !== 'AUCUN', geo.dedans);
dire('vingt pixels SOUS le cadre aussi', geo.justeDessous !== 'AUCUN', geo.justeDessous);
dire('et à mi-hauteur du vide aussi', geo.enBas !== 'AUCUN', geo.enBas);

// ── 2. LE GESTE ENTIER ──────────────────────────────────────────────────────

console.log('\nLE GESTE, DE LA BIBLIOTHÈQUE AU VIDE SOUS LE CADRE\n' + '─'.repeat(64));

const titres = await s.chercherDansLeCatalogue('addition');
const combien = () => s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.currentPath.steps.length;
});
const avant = await combien();

const carte = s.page.locator('#drill-content .exo-list-item').first();
await carte.hover();
await s.page.mouse.down();
// EN DEUX TEMPS, ET ON REGARDE AU MILIEU : une fois lâché, le cadre s'est
// déjà éteint. C'est la règle du mur blanc des QR codes — « pour mesurer un
// écran, il faut une entrée qui ne le fasse pas changer ».
await s.page.mouse.move(geo.x, geo.cadre.bas - 100, { steps: 8 });
await s.page.mouse.move(geo.x, geo.cadre.bas + 20, { steps: 8 });
await dormir(200);
const allume = await s.page.evaluate(() =>
    document.getElementById('path-container').classList.contains('drag-over'));
await s.page.mouse.up();
await dormir(400);

const apres = await combien();
dire(`« ${titres[0]} » tombe quand on la lâche sous le cadre`, apres === avant + 1,
    `${avant} étape(s) → ${apres}`);
dire('et le cadre s\'allume pendant le vol, pour dire où elle tombera', allume);

// ── 3. LE CADRE RESTE TEL QUEL ──────────────────────────────────────────────

console.log('\nLE CADRE, QUE RÉMY VEUT « TEL QUEL »\n' + '─'.repeat(64));

const apresCadre = await s.page.evaluate(() => {
    const r = document.getElementById('path-container').getBoundingClientRect();
    return { hauteur: Math.round(r.height), bas: Math.round(r.bottom) };
});
// IL A GRANDI D'UNE ÉTAPE, et c'est normal — on vient d'en déposer une. Ce
// qu'on interdit, c'est qu'il se remplisse de la COLONNE : un cadre qui
// descend jusqu'au bas de la vitre, c'est la correction facile qu'on ne veut
// pas (« le cadre autour des exercices restent tel quel »).
dire('il ne s\'étire pas jusqu\'au bas de la colonne',
    apresCadre.bas < geo.colonne.bas - 40,
    `bas du cadre ${apresCadre.bas} px, bas de la colonne ${geo.colonne.bas}`);
dire('il garde la hauteur de son contenu',
    apresCadre.hauteur < geo.cadre.hauteur + 200,
    `${geo.cadre.hauteur} px → ${apresCadre.hauteur} px (une étape de plus)`);

console.log(await s.photo('#builder-center-col', 'tools/tmp/depot-colonne.png', 0));

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
console.log(ratés === 0 ? vert('\nON PEUT DÉPOSER JUSQU\'EN BAS.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
