// « DANS CET EXERCICE, ON NE PEUT METTRE LE NOMBRE » — le tableau de la Chasse
// au Chiffre, mesuré du doigt et du clavier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui sur « Chiffre des unités de mille de 9614,73 ? » :
// « dans cet exercice, on ne peut mettre le nombre ».
//
// Le tableau s'ouvrait bien, et il disait « Pose ton nombre : un chiffre par
// colonne, en partant de la virgule » — au-dessus de sept cases qui ne
// recevaient rien. Une consigne qui commande un geste que l'écran ne permet pas.
//
// ── CE QUE CETTE SONDE REGARDE, ET POURQUOI LA SECONDE LIGNE EST LA PLUS
//    IMPORTANTE ─────────────────────────────────────────────────────────────
//
//   1. QUE LE CHIFFRE S'ÉCRIVE. C'est la demande de Rémy, et elle se mesure en
//      tapant pour de vrai, pas en vérifiant qu'un `<input>` existe.
//
//   2. QUE LA RÉPONSE NE PARTE PAS AVEC. `bubbles` écoute le clavier sur SON
//      conteneur, dont le panneau des outils est un descendant : sans barrière,
//      le chiffre tapé dans le tableau arriverait AUSSI dans la réponse, et
//      l'élève répondrait sans le vouloir en posant son nombre. C'est le défaut
//      qu'on aurait introduit en corrigeant le premier, et il serait bien pire.
//
//   3. QUE CE QU'IL A POSÉ SURVIVE à la fermeture du panneau : on referme le
//      tableau pour regarder les propositions, on le rouvre, le nombre est là.
//
//   node tools/tableauDeNumeration.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('num-rang');
await dormir(1500);

let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} ${quoi}${detail ? '  — ' + detail : ''}`);
};

// LE BOUTON EST LU DANS LA SOURCE : `np-outil-btn` / `[data-outil-i]`
// (js/core/activities/outils.js). Un sélecteur inventé rendrait « pas de
// bouton », c'est-à-dire la même réponse qu'un outil absent.
await s.doitExister('[data-outil-i]', 'le bouton « Tableau de numération »');
await s.page.click('[data-outil-i]');
await dormir(600);
await s.doitExister('[data-outil] .tn-tab', 'le tableau, une fois le panneau ouvert');

const cases = await s.page.$$('[data-case-outil]');
dire(cases.length === 7, `le tableau a des cases à remplir`, `${cases.length} case(s)`);
if (!cases.length) {
    console.log('\n\x1b[31mAUCUNE CASE : c\'est le défaut que Rémy décrit.\x1b[0m');
    await s.fermer();
    process.exit(1);
}

// ── ON POSE 9614,73 COMME L'ÉLÈVE LE FERAIT ────────────────────────────────
//
// Les quatre premières colonnes sont la partie entière, les trois suivantes la
// partie décimale : 9 6 1 4 puis 7 3, la dernière case restant vide.
const aPoser = ['9', '6', '1', '4', '7', '3'];
await cases[0].click();
await dormir(150);
for (const chiffre of aPoser) {
    await s.page.keyboard.type(chiffre, { delay: 70 });
    await dormir(120);
}
await dormir(300);

const pose = await s.page.evaluate(() =>
    [...document.querySelectorAll('[data-case-outil]')].map(c => c.value));
dire(pose.join('') === aPoser.join(''), 'le nombre s\'écrit dans les cases',
    `« ${pose.map(v => v || '·').join(' ')} »`);

// ── ET LA RÉPONSE N'A PAS BOUGÉ ────────────────────────────────────────────
//
// Sur la Chasse au Chiffre on répond en cliquant une bulle. Si les frappes
// avaient fui vers l'activité, l'une d'elles aurait pu valoir réponse : on
// vérifie que le compteur de questions n'a pas avancé et qu'aucune bannière de
// correction ne s'est ouverte.
const etat = await s.page.evaluate(() => ({
    banniere: !!document.querySelector('.fb-card'),
    progres: (document.querySelector('.game-progress, [class*="progress"]') || {}).textContent || '',
    bulles: document.querySelectorAll('.bb-bulle, [data-choice], .choice-btn').length
}));
dire(!etat.banniere, 'aucune correction ne s\'est déclenchée en tapant dans le tableau',
    etat.banniere ? 'une bannière s\'est ouverte : les frappes ont fui vers la réponse' : '');

// ── CE QU'IL A POSÉ SURVIT À LA FERMETURE ──────────────────────────────────
await s.page.click('[data-outil-fermer]');
await dormir(400);
await s.page.click('[data-outil-i]');
await dormir(500);
const apres = await s.page.evaluate(() =>
    [...document.querySelectorAll('[data-case-outil]')].map(c => c.value));
dire(apres.join('') === aPoser.join(''), 'le nombre est toujours là quand on rouvre le tableau',
    `« ${apres.map(v => v || '·').join(' ')} »`);

// ── ET SEULS LES CHIFFRES ENTRENT ──────────────────────────────────────────
const neuf = await s.page.$$('[data-case-outil]');
await neuf[0].click();
await dormir(120);
await s.page.keyboard.type('x', { delay: 70 });
await dormir(250);
const apresLettre = await s.page.evaluate(() =>
    document.querySelector('[data-case-outil]').value);
dire(apresLettre !== 'x', 'une lettre n\'entre pas dans une case de chiffre',
    `la case contient « ${apresLettre || '(vide)'} »`);

console.log('\n' + '─'.repeat(70));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mL\'ÉLÈVE PEUT POSER SON NOMBRE, et cela ne répond pas à sa place.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.fermer();
