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
// ET QUAND LE DÉFAUT TIENT SUR PLUSIEURS LIGNES, on l'écrit dans un fichier,
// exactement comme pour `remplacer.mjs` — la ligne de commande ne sait pas
// porter un texte multiligne, et un commentaire y arrive amputé sans que rien
// ne le signale :
//
//     node tools/epreuveTombe.mjs <essai> <source> --depuis <paires.json>
//
// où le fichier contient un tableau de paires `[ancien, nouveau]`. On en
// applique plusieurs d'un coup quand un seul défaut se répare à deux endroits.
//
// Il rend 0 si l'épreuve est verte AVANT et rouge APRÈS — c'est-à-dire si elle
// garde vraiment quelque chose. Tout le reste est un échec, et il dit lequel.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [essai, source, ancien, nouveau] = process.argv.slice(2);

// UN DÉFAUT TIENT PARFOIS SUR PLUSIEURS LIGNES, et la ligne de commande ne sait
// pas les porter — l'interpréteur exécute ce qui est entre accents graves, et un
// commentaire arrive alors amputé sans que rien ne le signale. C'est la raison
// pour laquelle `remplacer.mjs` a `--depuis` ; cet outil-ci écrit par les mêmes
// moyens et le refusait, ce qui coûtait deux essais à chaque défaut multiligne.
//
// MÊME FICHIER, MÊME FORME : un tableau de paires `[ancien, nouveau]`. Les deux
// outils prennent donc les mêmes arguments de la même façon.
let paires = [];
if (ancien === '--depuis') {
    if (!nouveau) {
        console.error('« --depuis » attend un fichier de paires JSON.');
        process.exit(2);
    }
    try {
        paires = JSON.parse(readFileSync(nouveau, 'utf8'));
    } catch (e) {
        console.error(`${nouveau} ne se lit pas : ${e.message}`);
        process.exit(2);
    }
    if (!Array.isArray(paires) || !paires.length
        || paires.some((p) => !Array.isArray(p) || p.length !== 2
            || typeof p[0] !== 'string' || typeof p[1] !== 'string')) {
        console.error(`${nouveau} doit contenir un tableau de paires [ancien, nouveau].`);
        process.exit(2);
    }
} else if (!essai || !source || ancien === undefined || nouveau === undefined) {
    console.error('emploi : node tools/epreuveTombe.mjs <essai> <source> <ancien> <nouveau>');
    console.error('         node tools/epreuveTombe.mjs <essai> <source> --depuis <paires.json>');
    console.error('  <ancien> → <nouveau> doit RÉINTRODUIRE le défaut que l\'épreuve prétend garder.');
    process.exit(2);
} else {
    paires = [[ancien, nouveau]];
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

// ON EXIGE UNE SEULE OCCURRENCE, PAIRE PAR PAIRE. Zéro, et l'on n'a rien remis
// du tout — on aurait relancé l'épreuve pour rien et conclu qu'elle est solide.
// Plusieurs, et l'on ne sait pas laquelle a fait tomber l'épreuve.
for (const [vieux] of paires) {
    const combien = avant.split(vieux).length - 1;
    if (combien !== 1) {
        console.error(`\n« ${vieux.slice(0, 60)} » apparaît ${combien} fois dans ${source}.`);
        console.error('On en veut exactement une : sinon on ne sait pas ce qu\'on a mesuré.');
        process.exit(2);
    }
}

/** Le fichier, avec le défaut remis. */
const abime = () => paires.reduce((t, [vieux, neuf]) => t.replace(vieux, neuf), avant);

console.log(`épreuve  : ${essai}`);
console.log(`on abîme : ${source}`);
for (const [vieux, neuf] of paires) {
    console.log(`           « ${vieux.slice(0, 70).replace(/\n/g, '⏎')} »`);
    console.log(`        → « ${neuf.slice(0, 70).replace(/\n/g, '⏎')} »`);
}
console.log('');

if (!verte()) {
    console.error('L\'ÉPREUVE EST DÉJÀ ROUGE avant qu\'on touche à quoi que ce soit.');
    console.error('Il n\'y a rien à conclure : réparer d\'abord, mesurer ensuite.');
    process.exit(1);
}
console.log('  ok    elle est verte sur le dépôt intact');

let tombe = false;
try {
    writeFileSync(source, abime());
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
