// CE QUE LE CARNET D'ERREURS ÉCRIT SOUS LES DEUX EXERCICES DE TRANSFORMATION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux captures à l'appui : « deux explications compliqués et fausses.
// C'est dans le "Mes erreurs" ».
//
// ── POURQUOI UNE SONDE, ET PAS UNE LECTURE DU CODE ─────────────────────────
//
// Les deux cartes portent des chaînes — `axe:v:8.5`, `7|3/8|3/7|4/8|4/8|5` — et
// il faut savoir DEUX choses qu'on ne lit pas dans le code :
//
//   · ce que l'élève, lui, lit sur la figure au même moment : la droite est
//     nommée (d₁) et s'écrit « x = 9 », pas « 8.5 ». L'écart n'est pas une
//     affaire de goût, c'est un demi-carreau — le passage du repère des CASES
//     à celui de l'ÉLÈVE, et `core/elementSymetrie.js` prévient en tête de
//     fichier qu'une droite « écrite x = 4 par la question et lue x = 4,5 par
//     la correction serait un exercice qui donne tort à qui a raison » ;
//   · si le diagnostic compté en cases dit, ou non, l'erreur que l'élève a
//     faite. Sur sa capture, « 1 case juste, 4 oubliées, 4 en trop » décrit un
//     tracé au hasard — alors que les deux figures se superposent exactement à
//     un carreau près. La phrase est vraie et elle rate l'erreur.
//
// On refabrique donc les deux questions, on joue une réponse fausse, et l'on
// imprime ce que `state.recordAttempt` recevrait — c'est-à-dire exactement ce
// que la carte affiche.
//
//   node tools/carnetDesTransformations.mjs
import '../tests/helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { pavageGenerator } from '../js/core/generators/pavage.js';
import {
    transfoQuadrillageGenerator as QUAD, imageAttendue
} from '../js/core/generators/transfoQuadrillage.js';
import { cleElement, direElement, ecrireElement } from '../js/core/elementSymetrie.js';
import {
    cleFigure, comparer, decalageEntre, direLeDecalage
} from '../js/core/transformations.js';
import { direLesCases } from '../js/core/generators/transfoQuadrillage.js';

const gras = (s) => `\x1b[1m${s}\x1b[0m`;
const pale = (s) => `\x1b[2m${s}\x1b[0m`;

// ── 1. « RECONNAÎTRE LA TRANSFORMATION » ───────────────────────────────────
//
// Ce que `activities/symetrieElement.js` envoie au journal : `cleElement` du
// candidat touché, sans `opts.dire`. Donc la forme canonique, telle quelle.
console.log(gras('\n« Par rapport à quoi ces pièces sont-elles symétriques ? »'));
console.log(pale('  ce que la carte écrit  ·  ce que l\'élève lit sur la figure'));
for (let i = 0; i < 6; i++) {
    const item = pavageGenerator.generate({ taille: 'moyen' }, { rng: makeRng('pav' + i) });
    const m = item.meta;
    const faux = m.candidats.find(c => c.id !== m.idJuste);
    console.log(`  ${i + 1}. la forme qui JUGE : ${cleElement(faux)}`
        + ` / ${item.answer}`);
    // CE QUE LA CARTE ÉCRIT MAINTENANT — et ce que la figure porte au même
    // moment. Les deux doivent être le MÊME nombre, c'est tout l'enjeu.
    console.log(`     la carte : ta réponse : ${gras(direElement(m.hauteur, faux, m.candidats))}`
        + `, attendu : ${gras(direElement(m.hauteur, m.bon, m.candidats))}`);
    console.log(pale(`     la figure : ${faux.nom} ${ecrireElement(m.hauteur, faux)}`
        + `  et  ${m.candidats.find(c => c.id === m.idJuste).nom} `
        + `${ecrireElement(m.hauteur, m.bon)}`));
}

// ── 2. « TRACER L'IMAGE PAR UNE TRANSLATION » ──────────────────────────────
//
// On rejoue l'erreur de sa capture : la bonne forme, décalée d'un carreau. Les
// deux listes de cases de la carte sont exactement dans ce rapport — on le
// vérifie plus bas au lieu de le supposer.
console.log(gras('\n« Colorie l\'image de la figure bleue »'));
const decaler = (f, dx, dy) => f.map(p => ({ x: p.x + dx, y: p.y + dy }));

/**
 * LE COMPTE SEUL — celui que la carte de Rémy affichait. Recopié ici pour le
 * garder sous les yeux : c'est la phrase qu'on remplace, et elle doit rester
 * comparable à celle qu'on écrit à la place.
 */
function compteSeul(bilan) {
    const bouts = [];
    if (bilan.justes) bouts.push(`${bilan.justes} case${bilan.justes > 1 ? 's' : ''} juste${bilan.justes > 1 ? 's' : ''}`);
    if (bilan.oublies.length) bouts.push(`${bilan.oublies.length} oubliée${bilan.oublies.length > 1 ? 's' : ''}`);
    if (bilan.enTrop.length) bouts.push(`${bilan.enTrop.length} en trop`);
    return bouts.length ? `${bouts.join(', ')}. Reprends case par case.` : '';
}

/** Le diagnostic d'aujourd'hui, dans l'ordre de `activities/quadrillage.js`. */
function diagnostic(meta, attendue, posee) {
    const glisse = decalageEntre(attendue, posee);
    if (glisse) {
        return `Ta figure a la bonne forme : elle est seulement posée `
            + `${direLeDecalage(glisse)}. Reprends UNE case, place-la juste, `
            + `et reporte les autres autour d'elle.`;
    }
    const recopiee = meta.genre !== 'translation'
        && decalageEntre(meta.depart || [], posee);
    if (recopiee) return 'Tu as fait GLISSER la figure sans la transformer : […]';
    return compteSeul(comparer(attendue, posee));
}

for (let i = 0; i < 4; i++) {
    const item = QUAD.generate(
        { genres: ['translation'], motsDuVecteur: false, taille: 'moyen' },
        { rng: makeRng('tr' + i), index: i });
    const attendue = imageAttendue(item.meta);
    const posee = decaler(attendue, -1, 1);
    console.log(`  ${i + 1}. la forme qui JUGE : ${cleFigure(posee)} / ${item.answer}`);
    console.log(`     la carte : ta réponse : ${gras(direLesCases(posee))}`);
    console.log(`                attendu    : ${gras(direLesCases(attendue))}`);
    console.log(`     avant : ${pale(compteSeul(comparer(attendue, posee)))}`);
    console.log(`     après : ${diagnostic(item.meta, attendue, posee)}`);
}

// ── 2 bis. ET L'AUTRE ERREUR DE FOND : GLISSER AU LIEU DE RETOURNER ────────
//
// C'est l'erreur de la symétrie, celle qui se voit en classe : l'élève recopie
// la figure plus loin sans la renverser. Le compte de cases la décrivait comme
// un coloriage au hasard, exactement de la même façon.
console.log(gras('\nGLISSER AU LIEU DE RETOURNER'));
let montrees = 0;
for (let i = 0; i < 12 && montrees < 3; i++) {
    const item = QUAD.generate(
        { genres: ['axiale'], obliques: false, taille: 'moyen' },
        { rng: makeRng('ax' + i), index: i });
    const attendue = imageAttendue(item.meta);
    // Il recopie sa figure à la place de l'image, sans la retourner.
    const coin = (f) => ({ x: Math.min(...f.map(p => p.x)), y: Math.min(...f.map(p => p.y)) });
    const a = coin(item.meta.depart), b = coin(attendue);
    const posee = decaler(item.meta.depart, b.x - a.x, b.y - a.y);
    // ET L'ON NE MONTRE QUE DE VRAIES ERREURS. Sur une figure qui porte
    // elle-même la symétrie demandée, la glisser DONNE l'image : la réponse est
    // alors juste, et aucun diagnostic ne sera demandé. Mesuré, et ma première
    // version imprimait « tu as fait glisser » sous une réponse parfaite — le
    // diagnostic n'est appelé que sur un échec, mais la sonde, elle, l'appelait
    // toujours. Une sonde qui ment sur un cas qui n'arrive pas est une sonde
    // qu'on croira le jour où le cas arrivera.
    if (cleFigure(posee) === item.answer) continue;
    montrees++;
    console.log(`  ${montrees}. avant : ${pale(compteSeul(comparer(attendue, posee)))}`);
    console.log(`     après : ${diagnostic(item.meta, attendue, posee)}`);
}

// ── 3. LA CAPTURE DE RÉMY, RELUE ───────────────────────────────────────────
//
// On ne devine pas ce qui s'est passé sur son écran : les deux chaînes de la
// carte suffisent à le dire.
console.log(gras('\nLA CAPTURE DE RÉMY, RELUE'));
const lire = (s) => s.split('/').map(c => {
    const [x, y] = c.split('|').map(Number);
    return { x, y };
});
const sienne = lire('7|3/8|3/7|4/8|4/8|5');
const voulue = lire('8|2/9|2/8|3/9|3/9|4');
const b = comparer(voulue, sienne);
console.log(`  diagnostic affiché : ${compteSeul(b)}`);
// LE DÉCALAGE, CHERCHÉ ET NON SUPPOSÉ : on essaie tous les écarts possibles.
let trouve = null;
for (let dx = -12; dx <= 12 && !trouve; dx++) {
    for (let dy = -12; dy <= 12 && !trouve; dy++) {
        if (!dx && !dy) continue;
        if (cleFigure(decaler(voulue, dx, dy)) === cleFigure(sienne)) trouve = { dx, dy };
    }
}
console.log(`  sa figure est l'image attendue décalée de ${JSON.stringify(trouve)}`
    + ` — c'est-à-dire la BONNE FORME, posée à côté.`);
console.log(gras('  la carte, maintenant :'));
console.log(`    ta réponse : ${gras(direLesCases(sienne))}`);
console.log(`    attendu    : ${gras(direLesCases(voulue))}`);
console.log(`    ${gras(`Ta figure a la bonne forme : elle est seulement posée `
    + `${direLeDecalage(trouve)}.`)}`);
