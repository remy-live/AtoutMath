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
// ET DANS UN FICHIER QUI PORTE VINGT ÉPREUVES, ON DIT LAQUELLE DOIT TOMBER :
//
//     node tools/epreuveTombe.mjs <essai> <source> --epreuve "<nom>" <ancien> <nouveau>
//
// SANS CE NOM, L'OUTIL MESURE « LE FICHIER ROUGIT » — ce qui est une garantie
// beaucoup plus faible que celle qu'il annonce, et il annonçait la forte. Cas
// réel : le défaut remis faisait tomber l'épreuve n° 3 du fichier, la n° 17 que
// je venais d'écrire restait verte, et l'outil répondait « L'ÉPREUVE GARDE CE
// QU'ELLE PRÉTEND GARDER ». Vingt minutes à l'établir à la main.
//
// Avec le nom, il exige trois choses : que CETTE épreuve existe (un nom inventé
// ne tombe jamais — c'est la même friction que `doitExister` ferme ailleurs),
// qu'elle soit verte avant, et que ce soit ELLE qui tombe après. Il dit en plus
// quelles autres sont tombées en même temps : un défaut qui en fait tomber six
// n'est pas le défaut qu'on croyait remettre.
//
// Il rend 0 si l'épreuve est verte AVANT et rouge APRÈS — c'est-à-dire si elle
// garde vraiment quelque chose. Tout le reste est un échec, et il dit lequel.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
let nomVoulu = null;
const iNom = args.indexOf('--epreuve');
if (iNom >= 0) {
    nomVoulu = args[iNom + 1];
    if (!nomVoulu) {
        console.error('« --epreuve » attend le nom de l\'épreuve qui doit tomber.');
        process.exit(2);
    }
    args.splice(iNom, 2);
}
const [essai, source, ancien, nouveau] = args;

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

/**
 * Lance le fichier d'épreuves. Rend ce que le harnais a dit : s'il est vert, et
 * le NOM de chacune — celles qui sont tombées, et toutes celles qu'on a vues.
 *
 * ON LIT LES NOMS, et pas seulement le code de sortie, parce qu'un fichier qui
 * rougit ne dit pas LAQUELLE a rougi (voir l'en-tête). `node --test` imprime
 * « ok N - <nom> » et « not ok N - <nom> » ; on ne lit que cela.
 */
function lancer() {
    let sortie = '';
    let verte = true;
    try {
        sortie = execFileSync('node', ['--test', essai], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
        verte = false;
        sortie = `${e.stdout || ''}${e.stderr || ''}`;
    }
    const vues = new Set(), tombees = new Set();
    for (const ligne of sortie.split('\n')) {
        const m = /^(not ok|ok) \d+ - (.*)$/.exec(ligne.trim());
        if (!m) continue;
        vues.add(m[2]);
        if (m[1] === 'not ok') tombees.add(m[2]);
    }
    return { verte, vues, tombees };
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

const intact = lancer();

// UN NOM INVENTÉ NE TOMBE JAMAIS, et l'outil conclurait « elle ne garde rien »
// en désignant le code alors que la faute est dans l'argument. On le dit avant
// de toucher au fichier.
if (nomVoulu && !intact.vues.has(nomVoulu)) {
    console.error(`AUCUNE ÉPREUVE DE ${essai} NE S'APPELLE :`);
    console.error(`  « ${nomVoulu} »`);
    // LA SUGGESTION SE CHERCHE SUR UN TEXTE DÉPOUILLÉ, sans quoi elle ne sert
    // JAMAIS. La première faute de frappe qu'on fait sur ces noms-là est « 6e »
    // pour « 6ᵉ » — et l'exposant ne se réduit PAS à un « e » par `normalize` :
    // il n'a pas de décomposition. Sans la table ci-dessous, « 6e » tombait d'un
    // côté et « 6ᵉ » devenait « 6 » de l'autre, donc aucune suggestion jamais.
    // Les cinq exposants sont ceux des ordinaux français : 1ᵉʳ, 2ᵈ, 6ᵉ, nᵗ, ⁿ.
    const EXPOSANTS = { 'ᵉ': 'e', 'ʳ': 'r', 'ᵈ': 'd', 'ᵗ': 't', 'ⁿ': 'n' };
    const nu = (s) => s.toLowerCase().replace(/[ᵉʳᵈᵗⁿ]/g, (c) => EXPOSANTS[c])
        .normalize('NFD').replace(/[^a-z0-9]/g, '');
    const cible = nu(nomVoulu).slice(0, 15);
    const proche = [...intact.vues].filter(n => nu(n).includes(cible));
    if (proche.length) console.error('\nVoulais-tu dire :\n  ' + proche.join('\n  '));
    process.exit(2);
}
if (!intact.verte) {
    console.error('L\'ÉPREUVE EST DÉJÀ ROUGE avant qu\'on touche à quoi que ce soit.');
    console.error('Il n\'y a rien à conclure : réparer d\'abord, mesurer ensuite.');
    if (nomVoulu) console.error('  tombées : ' + [...intact.tombees].join(', '));
    process.exit(1);
}
console.log(`  ok    elle est verte sur le dépôt intact${nomVoulu ? ` (${intact.vues.size} épreuves dans le fichier)` : ''}`);

let tombe = false;
let avecElle = [];
try {
    writeFileSync(source, abime());
    const abimee = lancer();
    tombe = nomVoulu ? abimee.tombees.has(nomVoulu) : !abimee.verte;
    avecElle = [...abimee.tombees].filter(n => n !== nomVoulu);
} finally {
    // LE `finally` N'EST PAS UNE POLITESSE. Sans lui, une interruption laisse
    // le défaut DANS LE DÉPÔT, et le prochain commit l'emporte.
    writeFileSync(source, avant);
}

const remis = readFileSync(source, 'utf8') === avant;
console.log(`  ${tombe ? 'ok  ' : 'RATÉ'}  ${nomVoulu ? `« ${nomVoulu} » ` : 'elle '}${tombe ? 'TOMBE' : 'reste verte'} quand on remet le défaut`);
// CE QUI EST TOMBÉ AVEC ELLE EST UNE MESURE, pas un bavardage : un défaut qui
// en fait tomber six n'est pas celui qu'on croyait remettre, et une garde qui
// est SEULE à voir son défaut est une garde qui sert.
if (nomVoulu) {
    console.log(avecElle.length
        ? `  ····  ${avecElle.length} autre(s) épreuve(s) tombent avec elle : ${avecElle.join(', ')}`
        : '  ok    et elle est SEULE à le voir');
}
console.log(`  ${remis ? 'ok  ' : 'RATÉ'}  ${source} est remis comme il était`);

if (!remis) {
    console.error('\nATTENTION : le fichier source n\'a pas pu être remis. Vérifier à la main.');
    process.exit(1);
}
if (!tombe) {
    console.error('\nCETTE ÉPREUVE NE GARDE RIEN. Elle passe avec et sans le défaut ;');
    console.error('elle donne donc une assurance qui n\'existe pas, ce qui est pire');
    console.error('que pas d\'épreuve du tout. La corriger avant de la croire.');
    if (nomVoulu && avecElle.length) {
        console.error(`\n(Le défaut n'est pas passé inaperçu pour autant : ${avecElle.join(', ')}`);
        console.error('tombent. Mais ce n\'est pas CELLE-LÀ qu\'on voulait voir tomber.)');
    }
    process.exit(1);
}
console.log('\nL\'ÉPREUVE GARDE CE QU\'ELLE PRÉTEND GARDER.');
