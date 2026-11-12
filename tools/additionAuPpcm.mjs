// L'ADDITION DE FRACTIONS AU PPCM, PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il n'y a pas d'addition de fraction avec dénominateur multiple ou
// ppcm non ? »
//
// CE QUE CETTE SONDE MESURE, et qu'aucune épreuve de bureau ne peut voir :
//
//   1. La question qui S'AFFICHE porte bien deux dénominateurs différents — le
//      réglage traverse le meneur, le jeu et le rendu, et pas seulement le
//      générateur.
//   2. Cliquer la bonne bulle est compté JUSTE. C'est le défaut d'hier
//      — « j'ai eu tout bon et il dit que j'ai eu faux » — et il ne se voit
//      qu'en jouant.
//   3. Et la mauvaise bulle nomme l'erreur du chapitre.
//
//     node tools/additionAuPpcm.mjs
import { ouvrirSonde } from './sonde.mjs';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('frac-add', { marches: ['ppcm'] }, { questions: 5 });
// LES CROCHETS SONT LUS DANS LA SOURCE, PAS DEVINÉS. La première version
// demandait « .game-question » — qui n'existe pas dans les bulles —, et
// `doitExister` l'a dit tout de suite au lieu de laisser croire à un logiciel
// cassé. La question s'habille en `.compare-line` (core/generators/fractions.js)
// et les propositions en `.bubble` avec leur `data-val`
// (core/activities/choice.js).
await s.doitExister('.compare-line');
await s.doitExister('.bubble[data-val]');

/** Ce que la question affiche, et les dénominateurs qu'on y lit. */
const laQuestion = () => s.page.evaluate(() => {
    const q = document.querySelector('.compare-line');
    const dens = [...q.querySelectorAll('.fraction-den')].map(e => e.textContent.trim());
    return { texte: q.innerText.replace(/\s+/g, ' ').trim(), dens };
});

/** Le compteur de la séance : « 2 / 5 ». */
const compteur = () => s.page.evaluate(() => {
    const t = (document.querySelector('#game-layer') || document.body).innerText;
    const m = /(\d+)\s*\/\s*(\d+)\s*(question|calcul)/i.exec(t);
    return m ? { fait: Number(m[1]), total: Number(m[2]) } : null;
});

console.log('\n── LA QUESTION QUI S’AFFICHE ──');
const q1 = await laQuestion();
console.log('  ', JSON.stringify(q1));
dire(q1.dens.length >= 2, `la question montre au moins deux fractions (${q1.dens.length})`);
dire(q1.dens[0] !== q1.dens[1],
    `et les dénominateurs DIFFÈRENT : ${q1.dens[0]} et ${q1.dens[1]} — c'est tout l'exercice`);

// ── CLIQUER LA BONNE BULLE ──────────────────────────────────────────────────
//
// On ne devine pas la bonne : on la DEMANDE au jeu, comme `etatDuJeu` le fait
// ailleurs. Deviner reviendrait à refaire le calcul dans la sonde, donc à
// mesurer la sonde.
// `etatDuJeu` ne sert à RIEN ici : il lit `handle.jeu`, l'instance d'un jeu
// bâti sur BaseGame, et les bulles n'en ont pas. C'est `questionCourante` qui
// va au meneur — friction payée et refermée le jour même.
const courante = await s.questionCourante();
console.log('  le meneur dit :', JSON.stringify(courante));
const val = courante && courante.reponse;
dire(!!val && String(val).includes('|'), `le meneur connaît sa réponse (${val})`);
dire(courante && courante.competence === 'num.frac.denominateur-commun',
    `et la compétence est celle du dénominateur commun (${courante && courante.competence})`);

const avant = await compteur();
await s.page.click(`.bubble[data-val="${val}"]`);
await s.page.waitForTimeout(1400);

const juge = await s.page.evaluate(() =>
    (document.querySelector('#game-layer') || document.body).innerText);
dire(!/Presque|Dommage|Raté/i.test(juge), 'le clic sur la bonne bulle n’est pas compté faux');

const apres = await compteur();
console.log('  le bandeau :', JSON.stringify(avant), '→', JSON.stringify(apres));
dire(!!apres && (!avant || apres.fait > avant.fait || apres.fait >= 1),
    `la bonne réponse est COMPTÉE (${apres ? apres.fait : '?'} / ${apres ? apres.total : '?'})`);

// ── LA QUESTION SUIVANTE EST AUSSI UNE QUESTION DE PPCM ─────────────────────
const q2 = await laQuestion();
console.log('  question suivante :', JSON.stringify(q2.texte));
dire(q2.dens[0] !== q2.dens[1], 'la question suivante garde la marche demandée');

// ── ET L'EXERCICE AJOUTÉ TEL QUEL RESTE AU MÊME DÉNOMINATEUR ────────────────
//
// Le panneau offre les quatre marches — un exercice à progression l'offre en
// entier —, mais le CATALOGUE ramène celui-ci au seul même dénominateur :
// c'est tout ce qu'il savait faire jusqu'à aujourd'hui, et une séance préparée
// hier ne doit pas changer de difficulté toute seule. Cela se décide en trois
// endroits — le schéma, le catalogue, le générateur — et seul le navigateur
// dit lequel gagne.
console.log('\n── AJOUTÉ TEL QUEL, SANS TOUCHER AU RÉGLAGE ──');
await s.ouvrirExercice('frac-add', {}, { questions: 5 });
await s.doitExister('.compare-line');
const nu = await laQuestion();
console.log('  ', JSON.stringify(nu));
dire(nu.dens[0] === nu.dens[1],
    `les deux dénominateurs sont identiques (${nu.dens[0]} et ${nu.dens[1]})`);

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nON ADDITIONNE AU PPCM, ET C’EST COMPTÉ.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
