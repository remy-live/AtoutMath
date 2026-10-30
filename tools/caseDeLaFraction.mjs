// LA CASE « A ( …/… ) » DE LA DROITE GRADUÉE, MESURÉE AU PIXEL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de la feuille imprimée, 24 octobre :
//
//   « très mal centrée et trop de pointillé pour les points, les parenthèses
//     doivent être plus haute du coup, pour couvrir la fraction »
//
// TROIS DÉFAUTS DANS UNE SEULE CASE, et aucun ne se voit dans le code : chacun
// est un ÉCART entre deux morceaux posés en absolu. MESURÉ AVANT :
//
//   la fraction occupe y=115 à y=137 ; la lettre et les deux parenthèses sont
//   à y=125, hautes de 11 px. Elles couvraient donc la moitié BASSE — celle du
//   dénominateur — et le trait à remplir faisait 41 px pour un chiffre.
//
// POURQUOI UNE SONDE ET PAS UNE ÉPREUVE. `tests/graduationFraction.test.mjs`
// peut lire la chaîne HTML et vérifier qu'il y a bien deux pointillés et une
// parenthèse. Elle ne peut PAS dire où ils TOMBENT : entre le gabarit et le
// pixel il y a une boîte flexible, un `line-height`, et une métrique de
// police. Une parenthèse écrite et une parenthèse mal placée rendent la même
// réponse à l'épreuve.
//
//     node tools/caseDeLaFraction.mjs
//
// Le verdict est un ENCADREMENT : la parenthèse doit couvrir la fraction, et
// les milieux doivent coïncider. Deux nombres, pas une impression.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 1500, hauteur: 2300 });
await s.identifier();

// CET EXERCICE A UN `printable` : il passe par la fiche à grilles (`#fp-…`) et
// non par la liste de questions (`#fq-…`). Ouvert par la mauvaise porte, on
// mesure une modale vide et l'on croit que le rendu est cassé — c'est ce qui
// m'est arrivé en premier.
await s.page.evaluate(async (id) => {
    const ps = await import('/js/ui/printSheet.js');
    const { getExerciseById } = await import('/js/data/catalog.js');
    const e = getExerciseById(id);
    if (!e) throw new Error('exercice inconnu : ' + id);
    ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false, nbItems: 6 });
}, 'frac-graduation');
await dormir(3000);
await s.doitExister('#fp-apercu', 'l\'aperçu de la fiche');

const mesure = await s.page.evaluate(() => {
    const page = document.querySelector('#fp-apercu');
    const base = page.getBoundingClientRect();
    const tous = [...page.querySelectorAll('div, span')]
        .map(d => ({ t: (d.textContent || '').trim(), r: d.getBoundingClientRect(),
            st: d.getAttribute('style') || '' }))
        .filter(o => o.r.width > 0);
    const parens = tous.filter(o => o.t === ')' || o.t === '(');
    const pointilles = tous.filter(o => /dotted/.test(o.st));
    if (!parens.length || pointilles.length < 2) return { vide: true };
    // LA LETTRE DU GROUPE, PAS CELLE DE L'AXE. Les deux disent « A » : la
    // première version relevait l'étiquette posée au-dessus de la croix, à
    // quarante-cinq pixels de là, et annonçait une lettre « mal centrée » qui
    // n'était pas la bonne. On part de la parenthèse ouvrante et l'on prend son
    // voisin de gauche — ils sont dans la même boîte, par construction.
    const ouvrante = [...page.querySelectorAll('span')]
        .find(e => e.textContent.trim() === '(');
    const lettre = ouvrante && ouvrante.previousElementSibling;
    const haut = Math.min(...pointilles.slice(0, 2).map(o => o.r.top));
    const bas = Math.max(...pointilles.slice(0, 2).map(o => o.r.bottom));
    const par = parens[0];
    const lr = lettre && lettre.getBoundingClientRect();
    return {
        fraction: { haut: Math.round(haut - base.top), hauteur: Math.round(bas - haut),
            largeur: Math.round(pointilles[0].r.width) },
        parenthese: { hauteur: Math.round(par.r.height) },
        lettre: lettre ? lettre.textContent.trim() : '—',
        ecartParenthese: Math.round((par.r.top + par.r.bottom) / 2 - (haut + bas) / 2),
        ecartLettre: lr ? Math.round((lr.top + lr.bottom) / 2 - (haut + bas) / 2) : null
    };
});

if (mesure.vide) {
    console.log('\x1b[31mRIEN À MESURER\x1b[0m : ni parenthèse ni pointillé dans l\'aperçu.');
} else {
    console.log(`\n── la case « ${mesure.lettre} ( …/… ) »`);
    console.log(`    la fraction : ${mesure.fraction.hauteur} px de haut, `
        + `${mesure.fraction.largeur} px de pointillé par étage`);
    console.log(`    la parenthèse : ${mesure.parenthese.hauteur} px`);
    console.log(`    écart des milieux — parenthèse ${mesure.ecartParenthese} px, `
        + `lettre ${mesure.ecartLettre} px`);
    const centre = Math.abs(mesure.ecartParenthese) <= 2 && Math.abs(mesure.ecartLettre) <= 2;
    // DEUX PIXELS DE TOLÉRANCE : un demi-pixel de bordure et un arrondi de
    // `line-height` suffisent à faire bouger un milieu, et personne ne le voit.
    console.log(centre
        ? '\n\x1b[32mTout est sur le même milieu.\x1b[0m'
        : '\n\x1b[31mLA FRACTION N\'EST PAS CENTRÉE\x1b[0m dans ses parenthèses.');
}

await s.photo('#fp-apercu', 'tools/tmp/case-fraction.png').catch(() => {});
console.log('erreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 4));
await s.fermer();
