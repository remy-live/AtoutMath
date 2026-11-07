// « ATTRAPE LE DÉTOUR » RÉPOND ENCORE QUAND ON SE TROMPE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/attrapeQuiRepond.mjs
//
// RÉMY, 6 novembre, après l'avoir lancé en classe : « pour le attrape le
// détour, j'avais mis option lente, et au bout de la 3ème question, des élèves
// ont été bloqué, ca ne réagisssait plus ».
//
// ── LES RÉGLAGES SONT LES SIENS, LUS DANS SON PROPRE FICHIER ──────────────
//
// Son parcours « Révisions - 6ème » porte, pour `calc-detour-arcade` :
// `overrides: { marches: ['calcul-plus'], allure: 'ralenti' }`. On les reprend
// tels quels plutôt que des réglages de laboratoire : c'est SON écran qu'on
// mesure, pas un écran plausible.
//
// ── ET L'ÉLÈVE SE TROMPE EXPRÈS, PARCE QUE C'EST LE CHEMIN QUI CASSAIT ────
//
// Une sonde qui frappe toujours le bon disque ne voit RIEN : j'ai commencé par
// là, et tout passait. Le noyau n'accorde que deux tentatives par question ; à
// la seconde erreur il montre la réponse et ferme la question. L'activité
// n'enchaînait que sur une bonne réponse — l'élève restait donc sur le même
// calcul POUR TOUJOURS, avec des disques qui continuaient de sortir et un
// écran qui avait l'air vivant.
//
// MESURÉ AVANT LA CORRECTION : six frappes de suite sur « 390 + 99 = ? ».
// L'énoncé ne changeait jamais.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1100, hauteur: 950 });
await s.identifier();
const raté = await s.ouvrirExercice('calc-detour-arcade',
    { marches: ['calcul-plus'], allure: 'ralenti' }, { questions: 8 });
if (raté) throw new Error('ouverture : ' + raté);
await dormir(1200);
await s.doitExister('.moles-grid', 'la grille des disques');
await s.doitExister('[data-question]', 'l\'énoncé du calcul');

/** L'énoncé du moment, et ce qui est dehors. */
const ecran = () => s.page.evaluate(() => ({
    question: ((document.querySelector('[data-question]') || {}).textContent || '')
        .replace(/\s+/g, ' ').trim(),
    dehors: [...document.querySelectorAll('.mole--up')].map(m => m.dataset.val),
    fini: !!document.querySelector('.run-report, [data-bilan]')
}));

/**
 * On frappe un MAUVAIS disque, et le bon seulement s'il n'y a que lui.
 *
 * La bonne réponse se recalcule depuis l'énoncé, comme un élève : la sonde ne
 * demande rien au logiciel, elle lit l'écran.
 */
const seTromper = () => s.page.evaluate(() => {
    const q = ((document.querySelector('[data-question]') || {}).textContent || '')
        .replace(/\s+/g, ' ');
    const m = q.match(/(-?\d+)\s*([+−-])\s*(\d+)/);
    if (!m) return { erreur: 'énoncé illisible : ' + q.slice(0, 40) };
    const vise = String(m[2] === '+' ? Number(m[1]) + Number(m[3])
        : Number(m[1]) - Number(m[3]));
    const dehors = [...document.querySelectorAll('.mole-hole')].filter((t) => {
        const d = t.querySelector('[data-mole]');
        return d && d.classList.contains('mole--up');
    });
    const choisi = dehors.find(t => t.querySelector('[data-mole]').dataset.val !== vise)
        || dehors[0];
    if (!choisi) return { rien: true, vise };
    const quoi = choisi.querySelector('[data-mole]').dataset.val;
    choisi.click();
    return { frappe: quoi, juste: quoi === vise };
});

/** Ferme la carte de correction, comme l'élève. */
const fermer = () => s.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
        .find(x => /continuer|suivant|ok|compris/i.test(x.textContent || '')
            && x.offsetParent !== null);
    if (b) b.click();
});

// ── ON SE TROMPE HUIT FOIS DE SUITE ───────────────────────────────────────
//
// Deux tentatives par question : huit erreurs doivent donc faire tourner
// QUATRE énoncés. S'il n'y en a qu'un, c'est le blocage de Rémy.
const vus = [];
let muet = 0;
for (let n = 0; n < 8; n++) {
    let frappe = null;
    for (let attente = 0; attente < 12 && !frappe; attente++) {
        const r = await seTromper();
        if (r.frappe) { frappe = r; break; }
        await dormir(700);
    }
    if (!frappe) { muet++; break; }
    const e = await ecran();
    if (!vus.length || vus[vus.length - 1] !== e.question) vus.push(e.question);
    console.log(`  frappe ${n + 1} : ${frappe.frappe}${frappe.juste ? ' (juste)' : ''}`
        + `  ·  « ${e.question} »`);
    if (e.fini) break;
    await dormir(600);
    await fermer();
    await dormir(900);
}

dire('L\'ÉCRAN RÉPOND ENCORE APRÈS HUIT FRAPPES', muet === 0,
    muet ? 'plus aucun disque ne réagit' : 'chaque frappe a été prise');
// LE CŒUR DE LA MESURE. Deux tentatives par question : huit erreurs ne peuvent
// pas tenir sur un seul énoncé.
dire('ET L\'ÉNONCÉ A TOURNÉ — on ne reste pas sur le même calcul', vus.length >= 3,
    `${vus.length} énoncé(s) : ${JSON.stringify(vus.slice(0, 5))}`);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
