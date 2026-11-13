// LA CASCADE SUR LES QUATRE ÉCRANS, ET LE PAVÉ DOIT RESTER ENTIER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CETTE SONDE EXISTE PARCE QU'UNE MESURE A DIT « ÇA FONCTIONNE » D'UN ÉCRAN
// INJOUABLE. Sur 390 × 844, la cascade à quatre étages tenait dans 76 px : les
// quatre cases faisaient 12 × 4 PIXELS. Playwright les remplissait toutes et le
// verdict disait « Parfait ! ». Un doigt ne vise pas 4 px de haut.
//
// Elle relève donc quatre choses, et la quatrième est celle qu'on oublie :
//
//   · la hauteur de la figure ;
//   · la taille du `rect` d'une case — l'encre, pas le nœud ;
//   · si le BAS DU PAVÉ tombe dans la fenêtre. C'est la contrainte dure, et
//     elle ne se déduit pas d'une addition de hauteurs : ma première tentative
//     ajoutait figure + pavé + énoncé et concluait « 337 px libres », quand le
//     bas du pavé était déjà à 828 px sur 844. Mesurer le bas, pas la somme.
//   · si la page déborde en largeur, et si une erreur est montée.
//
// On la relance après TOUTE retouche aux plafonds de figure de `modules.css`.
import { ouvrirSonde } from './sonde.mjs';

const ECRANS = [
    [390, 844, 'téléphone haut'], [390, 667, 'téléphone court'],
    [768, 1024, 'tablette'], [1180, 920, 'ordinateur']
];

let fautes = 0;
for (const [L, H, nom] of ECRANS) {
    const s = await ouvrirSonde({ largeur: L, hauteur: H });
    await s.ouvrirExercice('num-cascade-loupes', { marches: ['quatre'] }, { questions: 3 });
    await s.doitExister('.casc-svg', 'le dessin de la cascade');
    const vu = await s.page.evaluate(() => {
        const fig = document.querySelector('.figure-wrap').getBoundingClientRect();
        // LA CASE, C'EST SON `rect` : le `<text>` ne mesure que le « ? ».
        const r = document.querySelector('.ax-case rect, .casc-svg rect');
        const rb = r ? r.getBoundingClientRect() : null;
        const p = document.querySelector('.numpad, .numpad-keys');
        const pb = p ? p.getBoundingClientRect() : null;
        return {
            figure: Math.round(fig.height),
            caseL: rb ? Math.round(rb.width) : 0, caseH: rb ? Math.round(rb.height) : 0,
            paveBas: pb ? Math.round(pb.bottom) : 0, fenetre: window.innerHeight,
            deborde: document.documentElement.scrollWidth > window.innerWidth + 1
        };
    });
    const entier = vu.paveBas <= vu.fenetre + 1;
    // LE SEUIL DE 6 px DE HAUT N'EST PAS UN IDÉAL, C'EST UN PLANCHER : en
    // dessous, on ne LIT plus « 7,689 » dans la case, et c'est pourtant ce
    // qu'on demande d'y écrire.
    const lisible = vu.caseH >= 6;
    if (!entier || vu.deborde || !lisible || s.erreurs.length) fautes++;
    console.log(`  ${nom.padEnd(16)} ${L}×${H}  figure ${String(vu.figure).padStart(3)} px`
        + ` · case ${String(vu.caseL).padStart(2)}×${String(vu.caseH).padStart(2)}`
        + `${lisible ? '' : ' TROP PETITE'}`
        + ` · pavé ${entier ? 'ENTIER' : 'COUPÉ de ' + (vu.paveBas - vu.fenetre) + ' px'}`
        + ` (${vu.paveBas}/${vu.fenetre})`
        + `${vu.deborde ? ' · PAGE QUI DÉBORDE' : ''}`
        + ` · erreurs ${s.erreurs.length}`);
    if (s.erreurs.length) console.log('      ', s.erreurs[0]);
    await s.fermer();
}
console.log(fautes === 0
    ? '\nLA CASCADE TIENT SUR LES QUATRE ÉCRANS.'
    : `\n${fautes} écran(s) en faute.`);
process.exit(fautes === 0 ? 0 : 1);
