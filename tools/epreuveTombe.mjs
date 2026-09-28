// UNE ÉPREUVE NEUVE DOIT ÊTRE VUE ÉCHOUER AVANT D'ÊTRE CRUE.
//
// DEUX FOIS DANS LA MÊME JOURNÉE, une épreuve écrite pour garder une règle ne
// gardait rien, et passait au vert :
//
//   · celle des dégradés s'arrêtait au premier `)` — celui de `var(--primary)` —
//     et ne voyait donc jamais le second bout du dégradé ;
//   · une autre lisait `querySelector('.auj-go')`, donc le PREMIER de la page,
//     et mesurait un élément qui n'était pas celui qu'on croyait.
//
// Les deux ont été trouvées en remettant EXPRÈS le défaut et en constatant que
// rien ne bronchait. C'est ce geste-là que cet outil automatise.
//
// LE PRINCIPE, ET IL EST BÊTE EXPRÈS : on applique un remplacement au code
// source — celui qui réintroduit le défaut —, on relance l'épreuve, et l'on
// EXIGE qu'elle tombe. Puis on remet le fichier comme il était, quoi qu'il
// arrive. Un outil qui « comprendrait » ce qu'on veut tester deviendrait une
// friction à son tour.
//
//     node tools/epreuveTombe.mjs <fichier-essai> <fichier-source> <ancien> <nouveau>
//
// Exemple, celui qui a servi aujourd'hui :
//
//     node tools/epreuveTombe.mjs tests/contraste.test.mjs css/ui.css \
//       'color-mix(in srgb, var(--primary) 30%, transparent)' 'rgba(79, 70, 229, 0.3)'
//
// Il rend 0 si l'épreuve est verte AVANT et rouge APRÈS — c'est-à-dire si elle
// garde vraiment quelque chose. Tout le reste est un échec, et il dit lequel.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [essai, source, ancien, nouveau] = process.argv.slice(2);

if (!essai || !source || ancien === undefined || nouveau === undefined) {
    console.error('emploi : node tools/epreuveTombe.mjs <essai> <source> <ancien> <nouveau>');
    console.error('  <ancien> → <nouveau> doit RÉINTRODUIRE le défaut que l\'épreuve prétend garder.');
    process.exit(2);
}

/** Lance l'épreuve. Rend `true` si elle passe. */
function verte() {
    try {
        execFileSync('node', ['--test', essai], { encoding: 'utf8', stdio: 'pipe' });
        return true;
    } catch (e) {
        return false;
    }
}

const avant = readFileSync(source, 'utf8');
const combien = avant.split(ancien).length - 1;

// ON EXIGE UNE SEULE OCCURRENCE. Zéro, et l'on n'a rien remis du tout — on
// aurait relancé l'épreuve pour rien et conclu qu'elle est solide. Plusieurs, et
// l'on ne sait pas laquelle a fait tomber l'épreuve.
if (combien !== 1) {
    console.error(`\n« ${ancien.slice(0, 60)} » apparaît ${combien} fois dans ${source}.`);
    console.error('On en veut exactement une : sinon on ne sait pas ce qu\'on a mesuré.');
    process.exit(2);
}

console.log(`épreuve  : ${essai}`);
console.log(`on abîme : ${source}`);
console.log(`           « ${ancien.slice(0, 70)} »`);
console.log(`        → « ${nouveau.slice(0, 70)} »\n`);

if (!verte()) {
    console.error('L\'ÉPREUVE EST DÉJÀ ROUGE avant qu\'on touche à quoi que ce soit.');
    console.error('Il n\'y a rien à conclure : réparer d\'abord, mesurer ensuite.');
    process.exit(1);
}
console.log('  ok    elle est verte sur le dépôt intact');

let tombe = false;
try {
    writeFileSync(source, avant.replace(ancien, nouveau));
    tombe = !verte();
} finally {
    // LE `finally` N'EST PAS UNE POLITESSE. Sans lui, une interruption laisse
    // le défaut DANS LE DÉPÔT, et le prochain commit l'emporte.
    writeFileSync(source, avant);
}

const remis = readFileSync(source, 'utf8') === avant;
console.log(`  ${tombe ? 'ok  ' : 'RATÉ'}  elle ${tombe ? 'TOMBE' : 'reste verte'} quand on remet le défaut`);
console.log(`  ${remis ? 'ok  ' : 'RATÉ'}  ${source} est remis comme il était`);

if (!remis) {
    console.error('\nATTENTION : le fichier source n\'a pas pu être remis. Vérifier à la main.');
    process.exit(1);
}
if (!tombe) {
    console.error('\nCETTE ÉPREUVE NE GARDE RIEN. Elle passe avec et sans le défaut ;');
    console.error('elle donne donc une assurance qui n\'existe pas, ce qui est pire');
    console.error('que pas d\'épreuve du tout. La corriger avant de la croire.');
    process.exit(1);
}
console.log('\nL\'ÉPREUVE GARDE CE QU\'ELLE PRÉTEND GARDER.');
