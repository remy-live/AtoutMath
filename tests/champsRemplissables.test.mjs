// « TOUS LES EXERCICES QUI PEUVENT PRÉTENDRE À UN CHAMP REMPLISSABLE »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 12 octobre : « je voudrais que tous les exercices qui peuvent
// prétendre à un champ remplissable puissent y avoir le droit ».
//
// Vingt-cinq exercices sur quatre-vingt-treize en posaient ; cinquante-neuf en
// posent. Ce qui suit garde ce nombre — mais pas comme un compteur : une
// épreuve qui dit « au moins cinquante-neuf » ne dit RIEN de l'exercice qu'on
// vient de casser, et c'est l'exercice qui intéresse Rémy.
//
// ── CE QU'ON GARDE, ET COMMENT ────────────────────────────────────────────
//
// On nomme les rendus un par un, avec la FAÇON dont chacun pose ses champs —
// une ligne tracée, une case de tableau, un trou dans une phrase, une case à
// cocher. Si l'un d'eux cesse d'en poser, l'épreuve le nomme, et le message
// dit ce qu'il posait.
//
// L'outil complet vit dans `tools/champsRemplissables.mjs` (qui en pose, qui
// n'en pose pas) et `tools/ouEcritLEleve.mjs` (qui le PEUT, mesuré en
// comparant la feuille de l'élève et le corrigé). Ici, on garde le résultat.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { generateurDeFiche } from '../js/core/registry.js';
import { exercices } from '../js/data/catalog.js';
import { fauxPdf, poserUnDocumentDeSecours, SLOT_ESSAI } from '../tools/fauxPdf.mjs';

poserUnDocumentDeSecours();
const { RENDUS } = await import('../js/ui/printSheet.js');

/**
 * Combien de champs ce rendu pose-t-il, et de quelle sorte ?
 *
 * Le crayon espion a les DEUX métiers du vrai : écrire et cocher. Sans le
 * second, un QCM dessiné — « Le point est-il dessus ? » — compterait zéro
 * alors qu'il pose quatre cases.
 */
function champsDe(cle, exoId, params = {}) {
    const rendu = RENDUS[cle];
    assert.ok(rendu, `le rendu « ${cle} » n'existe plus`);
    // ON NE DEVINE PAS L'IDENTIFIANT DU GÉNÉRATEUR : on demande au catalogue
    // par quelle porte cet exercice s'imprime. Deux noms inventés ici ont fait
    // rougir l'épreuve pour une raison qui n'avait rien à voir avec le sujet.
    const exo = exercices.find(e => e.id === exoId);
    assert.ok(exo, `l'exercice « ${exoId} » a disparu du catalogue`);
    const gen = generateurDeFiche(exo);
    assert.ok(gen, `« ${exoId} » n'a plus de générateur de fiche`);
    const reglages = { ...(exo.printParams || {}), ...(exo.params || {}), ...params };
    const item = gen.generate(reglages, { index: 0, total: 4,
        rng: makeRng(`champs-${exoId}`), papier: true, themesExclus: [] });
    let saisies = 0, coches = 0;
    const champ = () => { saisies++; };
    champ.coche = () => { coches++; };
    rendu.pdfGrille(fauxPdf(), item, SLOT_ESSAI, false, champ);
    // On rend l'item avec le compte : une épreuve qui veut dire « DEUX champs
    // par point » a besoin de savoir combien il y avait de points.
    return { saisies, coches, total: saisies + coches, item };
}

// --- 1. Chaque rendu équipé, nommé, avec ce qu'il remplit -------------------

// cle du rendu, exercice, params, ce que l'élève y écrit
const EQUIPES = [
    ['pose', 'calc-poser-multiplication', { operation: '×' },
        'les cases vides de l\'opération posée'],
    ['priorites', 'calc-prio-cascade', {},
        'les lignes de la cascade'],
    ['conversion', 'mes-conversion', {},
        'les cases du tableau ET le trou de l\'énoncé'],
    ['pyramideNombres', 'calc-pyramide-nombres', {},
        'les cases que l\'énoncé ne donne pas'],
    ['pyramide', 'voc-pyramide', {},
        'les cases de lettres'],
    ['compte', 'calc-compte-est-bon', {},
        'les lignes de brouillon'],
    ['graduation', 'num-graduations', {},
        'le pointillé entre les parenthèses'],
    ['cercleVocabulaire', 'geo-cercle-vocabulaire', {},
        'la ligne sous chaque tracé nommé'],
    ['mosaique', 'geo-mosaique', {},
        'la ligne de réponse de chaque question'],
    ['anglesManquants', 'geo-angles-manquants', {},
        'la ligne « ? = »'],
    ['angles', 'geo-angles', {},
        'le trou de « L\'angle mesure ....... ° »'],
    ['notation', 'geo-notation', {},
        'les lignes sous la figure'],
    ['solides', 'geo-solides-denombrer', {},
        'les cases « sommets / arêtes / faces »'],
    ['programme-construction', 'geo-programme-construction', {},
        'les lignes du programme'],
    ['hexagrille', 'logi-hexagrille', {},
        'les alvéoles vides'],
    ['tableau-croise', 'don-tableau-croise', {},
        'les cases que l\'énoncé ne donne pas'],
    ['organigramme-quadri', 'geo-quadrilateres', {},
        'le nom des figures et les conditions'],
    ['enquete', 'logi-enquete', {},
        'les cases du plan'],
    ['pythagore', 'geo-pythagore', {},
        'les lignes de rédaction'],
    ['thales', 'geo-thales', {},
        'les lignes de rédaction et l\'égalité'],
    ['thales-redaction', 'geo-thales-redaction', {},
        'les lignes de chaque boîte'],
    ['trigo-cotes', 'geo-trigo-cotes', {},
        'le pointillé après chaque libellé'],
    ['pizza', 'frac-pizza', {},
        'le trou de « = ....... parts »'],
    ['mastermind', 'log-mastermind', {},
        'les cases du code à trouver']
];

test('CHAQUE RENDU ÉQUIPÉ POSE ENCORE SES CHAMPS', () => {
    const muets = [];
    for (const [cle, exoId, params, quoi] of EQUIPES) {
        const n = champsDe(cle, exoId, params);
        if (n.total === 0) muets.push(`  · ${cle} (${exoId}) ne pose plus rien — il posait ${quoi}`);
    }
    assert.equal(muets.length, 0,
        'des rendus ont cessé de poser leurs champs remplissables :\n' + muets.join('\n'));
});

// --- 2. Un QCM dessiné porte des CASES À COCHER, pas des saisies ------------

test('UN QCM DESSINÉ SE COCHE, IL NE S\'ÉCRIT PAS', () => {
    // Rémy : « pour les QCM, il faut que le champ remplissable soit une
    // checkbox ». Celui-ci n'arrive pas par la porte des QUESTIONS — il
    // dessine sa figure, puis ses quatre affirmations avec leurs carrés — et
    // passait donc à côté de la règle.
    const n = champsDe('geoElements', 'geo-appartenance', {});
    assert.ok(n.coches > 0,
        `« Le point est-il dessus ? » ne pose aucune case à cocher (${n.saisies} saisie(s))`);
    assert.equal(n.saisies, 0,
        'un QCM ne doit PAS porter de case de saisie à côté de ses cases à cocher :'
        + ' l\'élève aurait deux endroits où répondre, et deux réponses qui se contredisent');
});

// --- 3. Le trou au milieu d'une phrase, et les phrases à deux trous ---------

test('UNE LIGNE À DEUX TROUS REÇOIT DEUX CHAMPS', () => {
    // « A ( ...... ; ...... ) » du repère : l'abscisse PUIS l'ordonnée. Un
    // seul champ sur les deux, et l'élève tape ses deux nombres au même
    // endroit — ce n'est pas la question posée.
    //
    // On mesure ici le rendu, pas la fonction : c'est ce que Rémy imprime.
    const n = champsDe('repere', 'geo-repere-lire', { mode: 'lire' });
    const points = (n.item.meta.points || []).length;
    assert.ok(points > 0, 'le tirage n\'a aucun point à lire');
    // DEUX PAR POINT, ET ON LE COMPTE SUR LES POINTS. Première écriture :
    // « au moins deux, et un nombre pair ». Elle restait VERTE quand on ne
    // posait qu'un champ par point — six points donnent six, qui est pair.
    // `epreuveTombe` l'a dit : « cette épreuve ne garde rien ».
    assert.equal(n.saisies, points * 2,
        `${points} point(s) à lire devraient donner ${points * 2} champs`
        + ` (l'abscisse ET l'ordonnée), on en compte ${n.saisies}`);

    // ET LE MÊME RENDU N'EN POSE AUCUN quand on PLACE les points : on y trace
    // une croix à la règle, et un champ de PDF ne trace pas. Ce n'est pas un
    // oubli, c'est la ligne rouge du logiciel.
    const place = champsDe('repere', 'geo-repere-placer', { mode: 'placer' });
    assert.equal(place.total, 0,
        'placer un point se fait au crayon : aucun champ ne doit y être posé');
});
