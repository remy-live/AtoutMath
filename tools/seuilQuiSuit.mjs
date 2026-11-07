// LA RÉUSSITE EXIGÉE SUIT LE NOMBRE DE QUESTIONS — en PART, pas en nombre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/seuilQuiSuit.mjs
//
// RÉMY : « le taux de réussite n'a pas de rapport, il peut rester à 70 % et ne
// devrait pas bouger si on change le nombre de questions. »
//
// ── CE QU'IL A VU, ET CE QUE C'ÉTAIT ──────────────────────────────────────
//
// RÉMY, 5 novembre : « quand je veux changer le nombre de questions du le
// détour du nombre rond, ca change dans les paramètres mais dans le parcours ca
// remet 4/4 ». Son parcours « Révisions - 6ème », relu ligne à ligne, portait
// bien `nbItems: 4, threshold: 4` sur cette étape — et sur SIX AUTRES. En
// passant à vingt, la pastille affichait « ✔ 4/20 » : le 4 restait à gauche de
// la barre oblique, et c'est lui qu'on lit en diagonale comme le nombre de
// questions qui serait revenu.
//
// Le quatre n'était pas un total ressuscité : c'était l'EXIGENCE restée sur
// place. « Il faut tout réussir » devenait « 4 sur 20 », soit 20 %, en silence.
//
// ── ET IL Y AVAIT DEUX RÈGLES POUR LA MÊME DÉCISION ───────────────────────
//
// La barre « Pour ces 7 étapes » gardait la PART (`core/reglagesGroupes.js`) ;
// le panneau d'une étape gardait le NOMBRE. La même action donnait donc deux
// résultats selon l'écran par lequel on passait — 20/20 par la barre, 4/20 par
// l'étape. C'est ce que cette sonde garde : UNE règle, et elle tient à l'écran.
//
// ── POURQUOI UNE SONDE ET PAS SEULEMENT UNE ÉPREUVE ───────────────────────
//
// `majDuo` ne calcule rien toute seule : elle lit un champ, reborne un rail,
// repose une poignée, et c'est le panneau qui réécrit l'étape. Une épreuve de
// noyau garderait `seuilPourPart` — qui n'a jamais eu tort — sans rien dire de
// ce que le professeur obtient en tapant un nombre.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 1000 });
await s.identifier();

/**
 * Pose une étape à `nb`/`seuil`, ouvre ses réglages, tape `vers`, et rend ce
 * que l'étape porte alors. C'est le chemin du professeur, bouton par bouton.
 */
async function essai(nb, seuil, vers) {
    await s.page.evaluate(async ([n, t]) => {
        const { state } = await import('./js/core/state.js');
        const { makePath, makeStep } = await import('./js/core/path.js');
        const { defaultPolicy } = await import('./js/core/policy.js');
        const { renderTeacherPath } = await import('./js/ui/builder.js');
        state.currentPathId = null;
        state.currentPath = makePath('Essai seuil',
            [makeStep('calc-detour-rond', {}, { nbItems: n, threshold: t })], defaultPolicy());
        renderTeacherPath();
    }, [nb, seuil]);
    await dormir(700);
    await s.page.evaluate(() => {
        const c = document.querySelector('.path-step');
        if (c) c.click();
    });
    await dormir(1400);
    await s.page.evaluate((v) => {
        const c = document.getElementById('cfg-nbitems');
        if (!c) return;
        c.value = String(v);
        c.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('change', { bubbles: true }));
    }, vers);
    await dormir(800);
    const lu = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const st = state.currentPath.steps[0];
        const pas = document.querySelector('.path-step-seuil');
        return {
            nbItems: st.nbItems, threshold: st.threshold,
            pastille: pas ? pas.textContent.trim() : null
        };
    });
    await s.page.evaluate(() => {
        const x = document.querySelector('.modal-close-btn');
        if (x) x.click();
    });
    await dormir(700);
    return lu;
}

console.log('\nLA PART RESTE LA PART');
console.log('─'.repeat(64));

// ── LE CAS DE RÉMY : « il faut TOUT réussir », à quatre puis à vingt ──────
const tout = await essai(4, 4, 20);
dire('4 SUR 4 — « il faut tout réussir » — RESTE « tout » à vingt questions',
    tout.nbItems === 20 && tout.threshold === 20,
    `✔ ${tout.threshold}/${tout.nbItems}`);

// ── LES SOIXANTE-DIX POUR CENT DE RÉMY, à la main et non conseillés ───────
//
// 11 sur 15 fait 73 % ; à vingt questions cela fait 15. Ce n'est PAS le
// conseil de vingt (14) : c'est bien sa part à lui qu'on a reportée.
const part = await essai(15, 11, 20);
dire('11 SUR 15 (73 %) DEVIENT 15 SUR 20 — sa part, pas le conseil',
    part.nbItems === 20 && part.threshold === 15,
    `✔ ${part.threshold}/${part.nbItems} (le conseil de 20 serait 14)`);

// ── ET LE CONSEIL ORDINAIRE SUIT COMME AVANT ─────────────────────────────
const conseil = await essai(10, 7, 20);
dire('10 SUR 7 (70 %) DEVIENT 14 SUR 20, comme avant',
    conseil.nbItems === 20 && conseil.threshold === 14,
    `✔ ${conseil.threshold}/${conseil.nbItems}`);

// ── ET EN RACCOURCISSANT AUSSI ────────────────────────────────────────────
//
// L'exigence ne doit pas rester au-dessus du nouveau total — c'était déjà vrai,
// et c'est ce qui donnait « il faut TOUT réussir » par accident.
const court = await essai(20, 14, 8);
dire('ON RACCOURCIT À HUIT : 70 % font 6, et non « tout réussir »',
    court.nbItems === 8 && court.threshold === 6,
    `✔ ${court.threshold}/${court.nbItems}`);

// ── UNE ÉTAPE SANS EXIGENCE N'EN GAGNE PAS AU PASSAGE ────────────────────
//
// `threshold: null` est l'absence d'exigence — ce dont l'évaluation et les jeux
// de récompense ont besoin. Changer la longueur ne doit pas leur en poser une.
const sans = await essai(10, null, 20);
dire('UNE ÉTAPE SANS QUOTA N\'EN GAGNE PAS EN CHANGEANT DE LONGUEUR',
    sans.nbItems === 20 && sans.threshold === null,
    `seuil ${JSON.stringify(sans.threshold)}`);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
