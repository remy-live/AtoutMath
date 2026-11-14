// UN EXERCICE SUR LES QUATRE ÉCRANS — et ce qu'on y touche doit être touchable.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CETTE SONDE EXISTE PARCE QU'UNE MESURE A DIT « ÇA FONCTIONNE » D'UN ÉCRAN
// INJOUABLE. Sur 390 × 844, la cascade de loupes tenait dans 76 px de haut : ses
// quatre cases faisaient 12 × 4 PIXELS. Playwright les remplissait toutes et le
// verdict disait « Parfait ! ». Un doigt ne vise pas 4 px de haut.
//
//     node tools/surLesEcrans.mjs num-ranger-le-mot
//     node tools/surLesEcrans.mjs num-cascade-loupes --cibles=.ax-case rect
//     node tools/surLesEcrans.mjs num-ranger-le-mot --params='{"marches":["melees"]}'
//
// CE QU'ELLE RELÈVE, et la quatrième est celle qu'on oublie :
//
//   · la hauteur de la zone de dessin ;
//   · la plus PETITE cible qu'on doit toucher — en pixels d'écran, pas en
//     unités de `viewBox` ;
//   · si le bouton d'action principal tombe dans la fenêtre. C'est la
//     contrainte dure, et elle ne se déduit pas d'une addition de hauteurs : en
//     ajoutant figure + pavé + énoncé j'avais conclu « 337 px libres » quand le
//     bas du pavé était déjà à 828 px sur 844. On mesure le BAS, pas la somme.
//   · si la page déborde en largeur, et si une erreur est montée.
//
// LE SEUIL DE 10 px N'EST PAS UN IDÉAL, C'EST UN PLANCHER. Les recommandations
// d'accessibilité parlent de 24 px pour une cible au doigt ; on ne peut pas le
// tenir dans une figure dessinée, et le dépôt a tranché l'inverse pour protéger
// le clavier. En dessous de 10 px en revanche, ce n'est plus une cible : c'est
// un pixel qu'on atteint par chance.
import { ouvrirSonde } from './sonde.mjs';

const args = process.argv.slice(2);
const exo = args.find(a => !a.startsWith('--'));
const lire = (nom, parDefaut) => {
    const a = args.find(x => x.startsWith(`--${nom}=`));
    return a ? a.slice(nom.length + 3) : parDefaut;
};
if (!exo) {
    console.error('Usage : node tools/surLesEcrans.mjs <exercice> [--cibles=<sélecteur>] '
        + '[--plan=<sélecteur>] [--action=<sélecteur>] [--params=<json>]');
    process.exit(2);
}

// LES SÉLECTEURS PAR DÉFAUT COUVRENT CE QUE LE DÉPÔT EMPLOIE : les cases d'un
// pavé à trous, les jetons d'un plan, les touches d'un pavé. On les donne à la
// main quand l'exercice en a d'autres — et l'on vérifie alors que le sélecteur
// DÉSIGNE QUELQUE CHOSE, parce qu'un sélecteur inventé rend la même réponse
// qu'un logiciel cassé.
const CIBLES = lire('cibles', '.rlm-jeton circle, .ax-case rect, [data-trou], .numpad-key');
const PLAN = lire('plan', '.rlm-plan, .dg-plan, .figure-wrap');
const ACTION = lire('action', '[data-valider], [data-validate], .rlm-btn--fort');
const PARAMS = JSON.parse(lire('params', '{}'));
const SEUIL = Number(lire('seuil', 10));

const ECRANS = [
    [390, 844, 'téléphone haut'], [390, 667, 'téléphone court'],
    [768, 1024, 'tablette'], [1180, 920, 'ordinateur']
];

let fautes = 0;
console.log(`\n  ${exo} — cibles « ${CIBLES} »\n`);

for (const [L, H, nom] of ECRANS) {
    const s = await ouvrirSonde({ largeur: L, hauteur: H });
    await s.ouvrirExercice(exo, PARAMS, { questions: 3 });
    await s.doitExister(CIBLES, 'ce qu’il y a à toucher');

    const vu = await s.page.evaluate(([selCibles, selPlan, selAction]) => {
        const boite = (e) => e.getBoundingClientRect();
        const toutes = [...document.querySelectorAll(selCibles)].map(boite);
        const cibles = toutes.filter(b => b.width > 0 && b.height > 0);
        // UN TRAIT VERTICAL A UNE LARGEUR NULLE, et l'outil rendait alors
        // « 0 cible » — la même réponse qu'un sélecteur inventé, c'est-à-dire
        // la pire. Sur une droite graduée, ce qui se mesure n'est d'ailleurs
        // pas la taille d'une cible mais l'ÉCART entre deux traits : on ne
        // touche pas une graduation, on la compte. On bascule donc sur cet
        // écart dès que les cibles sont plates.
        const plats = toutes.length && !cibles.length;
        let ecart = 0;
        if (plats) {
            const xs = toutes.map(b => b.x).sort((a, b) => a - b);
            ecart = Infinity;
            for (let i = 1; i < xs.length; i++) ecart = Math.min(ecart, xs[i] - xs[i - 1]);
            ecart = Number(ecart.toFixed(2));
        }
        const plan = document.querySelector(selPlan);
        const action = document.querySelector(selAction);
        const ab = action ? boite(action) : null;
        return {
            plan: plan ? Math.round(boite(plan).height) : 0,
            cibles: toutes.length,
            plats, ecart,
            minL: cibles.length ? Math.round(Math.min(...cibles.map(b => b.width))) : 0,
            minH: cibles.length ? Math.round(Math.min(...cibles.map(b => b.height))) : 0,
            actionBas: ab ? Math.round(ab.bottom) : 0,
            fenetre: window.innerHeight,
            deborde: document.documentElement.scrollWidth > window.innerWidth + 1
        };
    }, [CIBLES, PLAN, ACTION]);

    const entier = !vu.actionBas || vu.actionBas <= vu.fenetre + 1;
    // SUR DES TRAITS, LE PLANCHER EST UN ÉCART, PAS UNE SURFACE. Sept pixels
    // entre deux graduations : en dessous, l'oeil ne les sépare plus et on ne
    // peut plus les compter. Mesuré sur « L'Axe au Centième », où l'exercice
    // consiste précisément à les compter.
    const visable = vu.plats ? vu.ecart >= 7 : Math.min(vu.minL, vu.minH) >= SEUIL;
    if (!entier || vu.deborde || !visable || s.erreurs.length) fautes++;
    console.log(`  ${nom.padEnd(16)} ${L}×${H}  plan ${String(vu.plan).padStart(3)} px`
        + ` · ${String(vu.cibles).padStart(3)} cibles, `
        + (vu.plats ? `écart ${String(vu.ecart).padStart(5)} px`
            : `la plus petite ${String(vu.minL).padStart(2)}×${String(vu.minH).padStart(2)}`)
        + `${visable ? '' : vu.plats ? ' TROP SERRÉ' : ' TROP PETITE'}`
        + ` · action ${entier ? 'DANS L’ÉCRAN' : 'COUPÉE de ' + (vu.actionBas - vu.fenetre) + ' px'}`
        + `${vu.deborde ? ' · PAGE QUI DÉBORDE' : ''}`
        + ` · erreurs ${s.erreurs.length}`);
    if (s.erreurs.length) console.log('      ', s.erreurs[0]);
    await s.fermer();
}

console.log(fautes === 0
    ? `\n${exo} TIENT SUR LES QUATRE ÉCRANS.`
    : `\n${fautes} écran(s) en faute.`);
process.exit(fautes === 0 ? 0 : 1);
