// « C'EST LA MÊME CHOSE QU'À LA QUESTION D'AVANT » ARRIVE-T-IL À L'ÉLÈVE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « parfois un élève bloque complètement, que faire ? ». Le premier des
// trois gestes est de NOMMER la répétition — ce qu'il fait de vive voix et que
// le logiciel ne faisait pas.
//
// `tests/memoireCourte.test.mjs` éprouve le module qui s'en souvient. IL NE
// PROUVE PAS QUE LA PHRASE ARRIVE : entre la mémoire et l'écran il y a la
// session d'items, la politique du parcours, la carte de retour et ses
// minuteurs. Une mesure qui n'emprunte pas le chemin de l'élève ne mesure pas
// son problème.
//
// ── CE QUE CETTE SONDE FAIT FAIRE À L'ÉLÈVE ────────────────────────────────
//
// Sur « Additions », le distracteur « Tu as soustrait au lieu d'additionner »
// porte une phrase CONSTANTE — c'est pour cela qu'on choisit cet exercice : la
// même erreur sur deux questions différentes rend deux fois exactement le même
// diagnostic, ce qu'aucun énoncé chiffré ne permettrait de vérifier.
//
//   1. question 1 : il répond a − b  → faux, et la carte nomme l'erreur
//   2. question 1 : il répond a + b  → juste, la question SE CONCLUT
//   3. question 2 : il répond a − b  → faux, et la carte doit AJOUTER
//      « C'est la même chose qu'à la question d'avant. »
//
// L'ÉTAPE 2 EST LE CŒUR DE LA MESURE, et c'est le cas qu'on casse le plus
// facilement : l'élève s'est CORRIGÉ. Au moment où la question se conclut, le
// verdict du dernier essai est « juste » et ne porte aucun diagnostic — c'est
// la question qui en a eu un. Un câblage naïf n'inscrirait donc rien, et la
// remarque ne se dirait jamais à l'élève qui écoute.
//
//     node tools/laMemeBetise.mjs

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

// QUATRE PROPOSITIONS, ET C'EST UN RÉGLAGE DE RÉMY, PAS UNE TRICHE.
// L'aide est PROGRESSIVE par défaut : elle commence à deux propositions, et
// le distracteur qu'on veut provoquer n'est alors pas à l'écran. « Toujours 4
// propositions » est l'un des quatre crans du rail que Rémy a dessiné
// (« Qcm 2 · Qcm 4 · Libre »), donc un état que ses élèves connaissent.
const raté = await s.ouvrirExercice('calc-add', { aide: 'propositions' });
if (raté) { console.log('ouverture ratée :', raté); await s.fermer(); process.exit(1); }
await dormir(600);
await s.doitExister('.game-question', 'l\'énoncé de la question');

/** Les deux termes de l'addition affichée, lus à l'écran. */
async function lesTermes() {
    return await s.page.evaluate(() => {
        const q = document.querySelector('#game-layer .game-question');
        const m = (q ? q.textContent : '').match(/(-?\d+)\s*\+\s*(-?\d+)/);
        return m ? { a: Number(m[1]), b: Number(m[2]), texte: q.textContent.trim() } : null;
    });
}

/** Clique la proposition qui porte cette valeur. Rend ce qui a été cliqué. */
async function repondre(valeur) {
    return await s.page.evaluate((v) => {
        // LES PROPOSITIONS NE SONT PAS DES <button> : ce sont des div.bubble
        // portant data-val. Cherchées parmi les seuls boutons, la sonde n'en
        // et rendait « null » — c'est-à-dire la même réponse qu'un logiciel
        // cassé. On a regardé l'écran avant de douter du code.
        const boutons = [...document.querySelectorAll('#game-layer .bubble, #game-layer button')]
            .filter(b => b.getBoundingClientRect().width > 0);
        const cible = boutons.find(b => (b.textContent || '').trim() === String(v));
        if (!cible) return null;
        cible.click();
        return (cible.textContent || '').trim();
    }, valeur);
}

/** Le texte de la carte de retour, s'il y en a une. */
async function laCarte() {
    return await s.page.evaluate(() => {
        const c = document.querySelector('.fb-card, .fb-toast');
        return c ? c.textContent.replace(/\s+/g, ' ').trim() : null;
    });
}

/** Ferme la carte comme l'élève le fait, par son bouton. */
async function fermerLaCarte() {
    await s.page.evaluate(() => {
        const b = document.querySelector('.fb-close');
        if (b) b.click();
    });
    await dormir(500);
}

const PHRASE = 'la même chose qu\'à la question d\'avant';
let verdicts = [];

// --- Question 1 : il se trompe, puis il se corrige ------------------------
const q1 = await lesTermes();
if (!q1) { console.log('énoncé illisible — ce n\'est pas une addition'); await s.fermer(); process.exit(1); }
console.log('question 1 :', q1.texte);

const faux1 = Math.abs(q1.a - q1.b);
console.log('  il répond', faux1, '(il a soustrait) →', await repondre(faux1));
await dormir(700);
const carte1 = await laCarte();
console.log('  carte :', carte1);
verdicts.push(['la première erreur est nommée',
    !!carte1 && /soustrait/i.test(carte1)]);
verdicts.push(['et la remarque de répétition NE s\'y trouve PAS',
    !!carte1 && !carte1.includes(PHRASE)]);
await fermerLaCarte();

console.log('  il se corrige avec', q1.a + q1.b, '→', await repondre(q1.a + q1.b));
await dormir(1600);

// --- Question 2 : il refait la même erreur --------------------------------
const q2 = await lesTermes();
console.log('question 2 :', q2 ? q2.texte : '(illisible)');
if (q2) {
    const faux2 = Math.abs(q2.a - q2.b);
    console.log('  il répond', faux2, '(il a encore soustrait) →', await repondre(faux2));
    await dormir(700);
    const carte2 = await laCarte();
    console.log('  carte :', carte2);
    verdicts.push(['LA RÉPÉTITION EST NOMMÉE À LA DEUXIÈME FOIS',
        !!carte2 && carte2.includes(PHRASE)]);
    verdicts.push(['et la règle est TOUJOURS LÀ, après la remarque',
        !!carte2 && /soustrait/i.test(carte2)]);
}

console.log('\n' + '─'.repeat(66));
let ratés = 0;
for (const [quoi, ok] of verdicts) {
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`);
    if (!ok) ratés++;
}
console.log(`\nfenêtres natives : ${s.fenetresNatives.length} · `
    + `erreurs de page : ${s.erreurs.length}`);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 3));
await s.fermer();
process.exit(ratés ? 1 : 0);
