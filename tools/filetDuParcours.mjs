// LE FILET SUR LA FEUILLE D'UN PARCOURS, ET L'AFFINAGE EXERCICE PAR EXERCICE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet du 24 octobre : « on peut faire un réglage globale et affiner
// selon l'exercice ».
//
// LE GLOBAL SE MESURE COMME AILLEURS — `tools/filetDuTableau.mjs` le fait sur
// la fiche d'un exercice seul, PDF compris. L'AFFINAGE, lui, n'existe QUE sur
// cette feuille-ci : il se règle dans la ROUE d'une étape, et une épreuve de
// `node:test` ne peut pas l'ouvrir. Sans cet outil, on garderait le correctif
// — `styleTableau` fusionne, et une épreuve le prouve — sans jamais savoir si
// la roue sait l'écrire.
//
//     node tools/filetDuParcours.mjs
//
// LE VERDICT EST UN COMPTE PAR COULEUR. Deux exercices de huit questions
// donnent seize cases ; les voir se séparer en huit orange et huit bleues, PUIS
// tomber à huit quand on retire le filet du premier, c'est la phrase de Rémy
// mesurée en entier.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1400 });
await s.identifier();

await s.page.evaluate(async () => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 8 }),
        makeStep('calc-sub', {}, { stepId: 'b', nbItems: 8 })
    ];
    pp.ouvrirFicheParcours(makePath('Le filet, essai', pas, politiquePerso()));
});
await dormir(3500);

// LES CROCHETS QU'ON N'A PAS LUS DANS LA SOURCE SE DÉCLARENT : un sélecteur
// inventé rend `false`, c'est-à-dire la même réponse qu'un logiciel cassé.
await s.doitExister('#pp-tableau', 'le menu « Présentation » du parcours');
await s.doitExister('#pp-trait', 'le menu « Épaisseur du filet » du parcours');

/** Les cases du tableau, rangées par allure de filet. */
const cadres = () => s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('.fq-cellule')];
    const parAllure = {};
    cases.forEach(c => {
        // À DROITE, PAS EN HAUT : `border-top: 0` est une abréviation qui remet
        // aussi la couleur à `currentColor`. Un côté supprimé rendrait la
        // couleur du TEXTE, et la mesure accuserait le réglage de couleur.
        const st = getComputedStyle(c);
        const cle = `${st.borderRightWidth} ${st.borderRightColor}`;
        parAllure[cle] = (parAllure[cle] || 0) + 1;
    });
    return { total: cases.length, parAllure };
});

const dire = async (quoi) => console.log('──', quoi, JSON.stringify(await cadres()));

// EN COULEUR, SINON ON NE MESURE QUE DU GRIS. Le défaut est le noir et blanc,
// et `teindreHtml` réécrit CHAQUE couleur de l'aperçu — le style calculé sort
// gris, et l'on croit dix minutes que le réglage n'arrive pas.
await s.deplier('#pp-couleur');
await s.page.selectOption('#pp-couleur', 'couleur');
await dormir(1500);
await dire('au départ (en liste)');

await s.page.selectOption('#pp-tableau', 'zebre');
await dormir(1500);
await s.page.selectOption('#pp-filet', 'bleu');
await dormir(1500);
await dire('toute la feuille en zébré bleu');

// ── LA ROUE DU PREMIER EXERCICE — « affiner selon l'exercice » ─────────────
const roues = await s.page.$$('.fx-roue');
if (!roues.length) throw new Error('aucune roue d\'étape : .fx-roue');
console.log('   roues d\'étape :', roues.length);
await roues[0].click();
await dormir(900);
await s.doitExister('#ppx-presence', 'le menu « Présentation » de la roue');
await s.doitExister('#ppx-filet', 'le menu « Couleur du filet » de la roue');

await s.page.selectOption('#ppx-filet', 'orange');
await dormir(1600);
await dire('premier exercice en orange, le second reste bleu');

await s.page.selectOption('#ppx-presence', 'sans');
await dormir(1600);
await dire('premier exercice sans filet');

console.log('\nerreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 5));
await s.fermer();
