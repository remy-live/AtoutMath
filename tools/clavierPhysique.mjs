// CE QUE LE PAVÉ MONTRE, LE CLAVIER DOIT L'ÉCRIRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on ne peut pas écrire les parenthèses au clavier ».
//
// C'ÉTAIT VRAI, ET SUR UN ORDINATEUR C'ÉTAIT BLOQUANT. Au barreau qui demande
// « −(−9) », la ligne attendue ne pouvait tout simplement PAS être tapée : la
// liste des touches acceptées, écrite à la main, ne connaissait ni « ( » ni
// « ) ». Il fallait viser les boutons à la souris, sur un écran où l'on a un
// clavier sous les doigts.
//
// ET C'EST LA DEUXIÈME FOIS QUE CETTE LISTE DÉRIVE : « il faut que quand je
// tape l'astérisque, cela affiche le fois », disait Rémy pour le signe ×. Une
// liste tenue à la main à côté d'une autre liste finit toujours par s'en
// écarter. Elle se déduit maintenant du PAVÉ.
//
// CE QUE CETTE SONDE GARDE, ET C'EST LE POINT : pour chaque exercice qui
// s'écrit au clavier, TOUTE touche du pavé doit s'obtenir au clavier physique —
// sauf celles qu'aucune touche de clavier ne porte (√, ², ³). On ne compare pas
// à une liste écrite ici : on lit le pavé À L'ÉCRAN et on tape.
//
//   node tools/clavierPhysique.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

// LA TOUCHE DU CLAVIER QUI DONNE CE GLYPHE. Deux ne se ressemblent pas : le
// signe moins de la typographie se tape avec le trait d'union, le signe fois
// avec l'astérisque. Et trois n'existent sur aucun clavier — on ne les compte
// pas contre le logiciel.
const TOUCHE = { '−': '-', '×': '*', '·': '*', '*': '*' };
const SANS_TOUCHE = new Set(['√', '²', '³']);

const CAS = [
    { id: 'calc-oppose-enlever', params: { marches: ['dedansDabord'] },
      nom: 'Enlever les parenthèses — la parenthèse de la capture de Rémy' },
    { id: 'calc-oppose-enlever', params: { marches: ['deuxNombres'] },
      nom: 'Enlever les parenthèses — deux nombres' },
    { id: 'num-litteral-puissances', params: {},
      nom: 'Puissances : la lettre et l\'exposant' }
];

const s = await ouvrirSonde({ largeur: 900, hauteur: 950 });
await s.identifier();

for (const cas of CAS) {
    const raté = await s.ouvrirExercice(cas.id, cas.params);
    await dormir(1400);
    console.log(`\n\x1b[1m${cas.nom}\x1b[0m`);
    if (raté) { dire('l\'exercice s\'ouvre', false, raté); continue; }

    const pave = await s.page.evaluate(() =>
        [...document.querySelectorAll('.ls-t')].map((b) => b.dataset.t));
    if (!pave.length) { dire('l\'exercice porte un pavé', false); continue; }
    console.log(gris(`     le pavé porte : ${pave.join(' ')}`));

    let manquantes = [];
    for (const glyphe of pave) {
        if (SANS_TOUCHE.has(glyphe)) continue;
        // On vide, on frappe UNE touche, on lit ce qui s'est écrit.
        for (let k = 0; k < 20; k++) {
            const reste = await s.page.evaluate(() =>
                ((document.querySelector('[data-texte]') || {}).textContent || '').length);
            if (!reste) break;
            const eff = await s.page.$('[data-eff]');
            if (!eff) break;
            await eff.click();
        }
        await s.page.keyboard.press(TOUCHE[glyphe] || glyphe);
        await dormir(90);
        const ecrit = await s.page.evaluate(() =>
            (document.querySelector('[data-texte]') || {}).textContent || '');
        if (ecrit !== glyphe) manquantes.push(`${glyphe} (tapé « ${TOUCHE[glyphe] || glyphe} » → « ${ecrit}  »)`);
    }
    dire('toute touche du pavé s\'écrit au clavier', manquantes.length === 0,
        manquantes.join(' · '));

    // ET LE CLAVIER N'ÉCRIT PAS CE QUE LE PAVÉ NE PORTE PAS. La règle de la
    // maison, dans l'autre sens : une touche dont on sait qu'elle donnera une
    // réponse fausse ne doit pas exister — pas même sur le clavier physique.
    const interdites = ['(', ')', '/', '^'].filter((c) => !pave.includes(c));
    if (interdites.length) {
        for (let k = 0; k < 20; k++) {
            const reste = await s.page.evaluate(() =>
                ((document.querySelector('[data-texte]') || {}).textContent || '').length);
            if (!reste) break;
            const eff = await s.page.$('[data-eff]');
            if (!eff) break;
            await eff.click();
        }
        for (const c of interdites) await s.page.keyboard.press(c);
        await dormir(120);
        const ecrit = await s.page.evaluate(() =>
            (document.querySelector('[data-texte]') || {}).textContent || '');
        dire(`et il n'écrit pas ${interdites.join(' ')}, absents du pavé`, ecrit === '',
            `« ${ecrit} »`);
    }
}

dire('aucune erreur de page, aucune fenêtre native',
    s.erreurs.length === 0 && s.fenetresNatives.length === 0,
    `${s.erreurs.length} / ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log(gris('      ' + e)));
await s.fermer();
console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nLE CLAVIER ÉCRIT CE QUE LE PAVÉ MONTRE.'));
process.exit(ratés ? 1 : 0);
