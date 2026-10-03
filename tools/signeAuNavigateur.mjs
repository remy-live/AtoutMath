// LE SIGNE, DU RÉGLAGE JUSQU'À L'ÉCRAN DE L'ÉLÈVE.
// On change le réglage comme le professeur le fait, puis on ouvre des exercices
// et l'on LIT ce qui est écrit — pas ce que le code prétend écrire.
//
// LA PREMIÈRE VERSION DE CETTE SONDE NE MESURAIT RIEN. Elle demandait « l'écran
// n'affiche pas une AUTRE notation », ce qui passe au vert quand l'écran
// n'affiche AUCUNE multiplication — et c'était le cas : l'extrait lu valait
// « Priorités : ligne par ligne 0 / 8 0 calcul mené au bout 💡 Pourq ».
// Une assertion qui passe faute de sujet est une assurance qui n'existe pas.
//
// DONC ON EXIGE D'ABORD UN SUJET : on ne juge la notation qu'après avoir trouvé
// une vraie multiplication à l'écran (« 4 × 5 », « 4·5 »…), quitte à retirer
// plusieurs questions jusqu'à en tomber sur une.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

/** Un produit écrit : un nombre ou une parenthèse, un signe, un nombre. */
const PRODUIT = /[0-9)]\s*[×·*]\s*[0-9(−-]/g;

for (const [id, glyphe] of [['fois', '×'], ['point', '·'], ['etoile', '*']]) {
    console.log(`\n\x1b[1mNotation « ${glyphe} »\x1b[0m`);
    await s.page.evaluate(async (x) => {
        const { state } = await import('./js/core/state.js');
        await state.setSigneFois(x);
    }, id);

    // ON RETIRE JUSQU'À TROUVER UNE MULTIPLICATION : toutes les expressions
    // tirées n'en portent pas, et juger l'écran sans produit ne juge rien.
    let vu = null;
    for (let essai = 0; essai < 6 && !vu; essai++) {
        await s.ouvrirExercice('calc-prio-cascade');
        await dormir(1100);
        const lu = await s.page.evaluate(() => ({
            ecran: (document.getElementById('game-layer').innerText || '').replace(/\n+/g, ' '),
            attribut: document.documentElement.dataset.signeFois || '(aucun)'
        }));
        if (lu.ecran.match(PRODUIT)) vu = lu;
    }
    if (!vu) { dire('une multiplication finit par s\'afficher', false, '6 tirages sans produit'); continue; }

    dire('la page porte le réglage', vu.attribut === id, vu.attribut);
    const produits = vu.ecran.match(PRODUIT) || [];
    const bons = produits.filter(p => p.includes(glyphe));
    dire(`les ${produits.length} produit(s) affichés portent « ${glyphe} »`,
        bons.length === produits.length, produits.join(' / '));
    // LE PAVÉ SE MESURE AILLEURS : la cascade se joue au clic, elle n'a pas de
    // champ de saisie littérale. « Développer pas à pas » en a un, avec la
    // touche « multiplication » — c'est là que se lit la moitié « input ».
    await s.ouvrirExercice('dev-pas');
    await dormir(1100);
    const touches = await s.page.evaluate(() => [...document.querySelectorAll('.ls-t')]
        .map(b => (b.dataset.t || b.textContent || '').trim())
        .filter(t => /^[×·*]$/.test(t)));
    dire('la touche du pavé porte la même notation',
        touches.length > 0 && touches.every(t => t === glyphe),
        touches.length ? touches.join(' ') : 'aucune touche de multiplication trouvée');
}

await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    await state.setSigneFois('fois');
});
console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 3).forEach(e => console.log('   ' + e));
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mLE SIGNE SUIT PARTOUT\x1b[0m');
await s.fermer();
