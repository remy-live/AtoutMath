// LE RÉGLAGE « AUTORISER LE CLAVIER » PROMET-IL QUELQUE CHOSE QU'IL NE PEUT PAS TENIR ?
//
// Rémy : « dans le mot juste, dans les réglages, le clavier est proposé mais le
// jeu ne propose jamais le clavier non ? » Il avait raison, et la raison est
// dans `js/core/activities/choice.js` :
//
//     const chiffrable = item.answer !== null && item.answer !== ''
//         && Number.isFinite(Number(item.answer));
//     return chiffrable ? './numeric.js' : null;
//
// Le pavé n'arrive QUE si la réponse est un nombre — ou si l'item se déclare
// `composable` (une notation, un tracé, une expression littérale). Les réponses
// du Mot Juste sont « somme », « différence », « produit » : aucune n'est un
// nombre, aucune n'est composable. L'escalier d'aide monte jusqu'aux deux
// propositions et s'arrête là, quoi qu'on coche.
//
// UN RÉGLAGE QUI NE FAIT RIEN EST PIRE QU'UN RÉGLAGE ABSENT : le professeur le
// décoche pour protéger une classe qui découvre, et croit avoir agi.
//
// CE QUE CET OUTIL FAIT : il tire vraiment des questions de chaque exercice qui
// propose ce réglage, et regarde si L'UNE D'ELLES peut atteindre le pavé. On ne
// devine pas d'après le nom du générateur — on demande au générateur.
//
//   node tools/clavierInutile.mjs
//   node tools/clavierInutile.mjs --bavard

import './../tests/helpers.mjs';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { itemPeutAllerAuClavier } from '../js/core/aide.js';
import '../js/core/activities/index.js';

const BAVARD = process.argv.includes('--bavard');
const TIRAGES = 24;

// LA RÈGLE N'EST PAS RECOPIÉE ICI : on importe celle que le jeu applique. Un
// outil qui garde sa propre version de la règle finit par mesurer autre chose
// que ce que l'élève vit.
const peutAtteindreLePave = itemPeutAllerAuClavier;

const concernes = exercices.filter(e =>
    (paramSchemaOf(e) || []).some(c => c && c.id === 'clavier'));

const muets = [];
const vivants = [];
const illisibles = [];

for (const exo of concernes) {
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    if (!gen || typeof gen.generate !== 'function') { illisibles.push(exo.id + ' (pas de générateur)'); continue; }
    let atteint = 0;
    let vus = 0;
    let erreur = '';
    for (let i = 0; i < TIRAGES; i++) {
        let item = null;
        try {
            // LA SIGNATURE EST `generate(params, ctx)`, et le contexte porte le
            // tirage. L'appeler avec un seul argument ne rend pas une erreur
            // parlante : « Cannot read properties of undefined (reading 'rng') »,
            // soixante-dix fois.
            item = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng('clav' + i), weakTables: [], difficulty: null, index: i });
        } catch (e) {
            erreur = String(e && e.message || e).slice(0, 90);
            break;
        }
        if (!item) continue;
        vus++;
        if (peutAtteindreLePave(item)) atteint++;
    }
    if (erreur) { illisibles.push(`${exo.id} (${erreur})`); continue; }
    if (!vus) { illisibles.push(exo.id + ' (aucune question tirée)'); continue; }
    (atteint ? vivants : muets).push({ id: exo.id, titre: exo.title, vus, atteint });
}

console.log(`${concernes.length} exercice(s) proposent « Autoriser le clavier »`
    + ` · ${TIRAGES} questions tirées pour chacun\n`);
if (muets.length) {
    console.log(`LE RÉGLAGE NE PEUT RIEN FAIRE DANS ${muets.length} EXERCICE(S) :`);
    muets.forEach(m => console.log(`  ${m.id.padEnd(28)} ${m.titre}`));
} else {
    console.log('Aucun exercice muet : partout où le réglage est proposé, il agit.');
}
if (BAVARD && vivants.length) {
    console.log(`\nIL AGIT DANS ${vivants.length} EXERCICE(S) :`);
    vivants.forEach(v => console.log(`  ${v.id.padEnd(28)} ${v.atteint}/${v.vus} questions chiffrables`));
}
if (illisibles.length) {
    console.log(`\n${illisibles.length} exercice(s) que cet outil n'a pas su tirer :`);
    illisibles.slice(0, BAVARD ? 999 : 8).forEach(x => console.log('  ' + x));
    if (!BAVARD && illisibles.length > 8) console.log(`  … et ${illisibles.length - 8} autre(s) (--bavard)`);
}
process.exit(muets.length ? 1 : 0);
