#!/usr/bin/env node
// COMBIEN DE FOIS LA MÊME QUESTION DANS UNE SÉRIE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur la Table de Pythagore : « essaie d'eviter les mêmes questions ».
//
// On ne le voit pas en jouant : il faut vingt questions d'affilée et un peu de
// mémoire pour s'apercevoir que le 12 est déjà passé deux fois. Un élève, lui,
// le voit tout de suite — c'est lui qui joue.
//
// CE QUE CET OUTIL MESURE, ET PAR QUEL CHEMIN. Il monte une VRAIE
// `ItemSession`, celle que le meneur monte, avec le générateur et les réglages
// que le catalogue porte pour l'exercice — pas une boucle qui appellerait le
// générateur à la main. « Une mesure qui n'emprunte pas le chemin de
// l'utilisateur ne mesure pas son problème » : le dédoublonnage vit DANS la
// session, une boucle sur le générateur ne le verrait donc jamais.
//
// LA CLEF EST CE QUE L'ÉLÈVE LIT. Par défaut l'énoncé, ce qui est vrai de
// presque tous les exercices. Mais la Table de Pythagore ne montre QUE le
// résultat (« Où se cache 42 dans la table ? ») : « 7 × 6 = ? » et
// « 6 × 7 = ? » y sont une seule et même question. D'où `--clef reponse`, qui
// est ce que l'activité déclare elle-même par `session.clefDeQuestion`.
//
//   node tools/repetitionsDUneSerie.mjs calc-pythagore --clef reponse
//   node tools/repetitionsDUneSerie.mjs calc-mult-missing --questions 20
//   node tools/repetitionsDUneSerie.mjs calc-pythagore --series 2000
//
// Il rend 1 quand une série moyenne repose plus d'une question : de quoi le
// mettre dans un harnais si l'envie vient.

import '../tests/helpers.mjs';
import { ItemSession } from '../js/core/itemSession.js';
import { getGenerator } from '../js/core/registry.js';
// Les générateurs s'inscrivent au registre en s'important : sans cette ligne,
// `getGenerator` rend null pour tout le catalogue.
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { defaultPolicy } from '../js/core/policy.js';

const args = process.argv.slice(2);
const lireOption = (nom, defaut) => {
    const i = args.indexOf(nom);
    return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const identifiant = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--clef'
    && args[args.indexOf(a) - 1] !== '--questions' && args[args.indexOf(a) - 1] !== '--series');

if (!identifiant) {
    console.error('usage : node tools/repetitionsDUneSerie.mjs <identifiant> '
        + '[--clef enonce|reponse] [--questions 20] [--series 500]');
    process.exit(2);
}

const exercise = exercices.find(e => e.id === identifiant);
if (!exercise) {
    console.error(`Aucun exercice « ${identifiant} » au catalogue.`);
    process.exit(2);
}
const generator = getGenerator(exercise.generatorId);
if (!generator) {
    console.error(`L'exercice « ${identifiant} » n'a pas de générateur `
        + `(${exercise.generatorId || 'aucun'}) : rien à mesurer ici.`);
    process.exit(2);
}

const quelleClef = lireOption('--clef', 'enonce');
const nbQuestions = Math.max(2, Number(lireOption('--questions', 0))
    || Number(exercise.params && exercise.params.nbItems) || 20);
const nbSeries = Math.max(1, Number(lireOption('--series', 500)));

// La clef telle que l'activité la déclarerait.
const clefs = {
    enonce: (it) => (it && it.prompt && it.prompt.text) || '',
    reponse: (it) => String(it && it.answer)
};
if (!clefs[quelleClef]) {
    console.error(`--clef attend « enonce » ou « reponse », pas « ${quelleClef} ».`);
    process.exit(2);
}

/** Une série, comme le meneur la fait jouer. Rend les questions lues. */
function serie() {
    const session = new ItemSession({
        generator,
        params: { ...(exercise.params || {}) },
        policy: { ...defaultPolicy, ...(exercise.policy || {}) },
        exercise,
        nbItems: nbQuestions,
        sansTrace: true
    });
    // C'est exactement ce que fait `js/core/activities/pythagore.js` au montage.
    if (quelleClef !== 'enonce') session.clefDeQuestion(clefs[quelleClef]);
    const lues = [];
    for (let i = 0; i < nbQuestions; i++) lues.push(clefs[quelleClef](session.next()));
    return lues;
}

let total = 0, auMoinsUne = 0, pire = 0;
let exemple = null;
for (let n = 0; n < nbSeries; n++) {
    const v = serie();
    const rep = v.length - new Set(v).size;
    total += rep;
    if (rep > 0) { auMoinsUne++; if (rep > pire) { pire = rep; exemple = v; } }
}
const moyenne = total / nbSeries;

console.log(`${exercise.title} (${identifiant}) — ${nbSeries} séries de ${nbQuestions} questions`);
console.log(`la question lue : ${quelleClef === 'reponse' ? 'le RÉSULTAT' : "l'ÉNONCÉ"}`);
console.log('');
console.log(`  déjà posées, en moyenne   : ${moyenne.toFixed(2)} sur ${nbQuestions}`);
console.log(`  séries qui en comptent    : ${(100 * auMoinsUne / nbSeries).toFixed(1)} %`);
console.log(`  pire série                : ${pire}`);
if (exemple) console.log(`  elle, pour voir           : ${exemple.join('  ')}`);
console.log('');
// LE SEUIL EST À UNE QUESTION, pas à zéro : un exercice qui n'a que six
// questions possibles et qui en pose vingt DOIT se répéter, et ce n'est pas un
// défaut. Au-dessus d'une par série, en revanche, l'élève le remarque.
if (moyenne > 1) {
    console.log('IL SE RÉPÈTE : plus d\'une question déjà posée par série.');
    process.exit(1);
}
console.log('Rien à signaler.');
