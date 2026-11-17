// LA MÉDIANE AU DOIGT — ranger, puis barrer par les deux bouts.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « et pour la médiane, on peut ranger dans l'ordre
// croissant par drag drop », puis « et on peut sélectionner ou barrer des
// valeurs qui s'affichent ».
//
// ── CE QUI SE GARDE ICI, ET CE QUI SE GARDE LÀ-BAS ────────────────────────
//
// ICI : les trois DÉCISIONS, qui sont pures — où ça coince dans un rangement,
// qui a le droit d'être barré, et quand la série paire pose sa question. Plus
// le montage de l'exercice au catalogue, dont un seul point de travers rendrait
// toute l'activité injoignable sans lever la moindre erreur.
//
// LÀ-BAS (`node tools/medianeAuDoigt.mjs`) : le GESTE, dans un vrai navigateur
// — le glisser qui range vraiment, les bouts qui se désignent, le refus de
// barrer au milieu, et la médiane qui sort. Un glisser-déposer ne se lit pas,
// il se fait : `touch-action`, les écouteurs sur le document, le recalage du
// point de référence — chacune de ces lignes rend le rangement IMPOSSIBLE si
// elle manque, et aucune ne lève d'erreur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { premiereDescente, estUnBout, phaseApres } from '../js/core/activities/medianeAuDoigt.js';
import { donneesExercises } from '../js/data/donnees.js';
import { getActivity } from '../js/core/registry.js';
import '../js/core/activities/index.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
// SANS SES COMMENTAIRES, ET L'AIDE EXISTAIT DÉJÀ. Ce dépôt explique chaque
// règle à l'endroit où elle se prend : chercher un motif interdit dans une
// source commentée le trouve dans la phrase qui l'INTERDIT. Mon premier jet
// lisait `setPointerCapture` dans le paragraphe qui raconte pourquoi on ne
// s'en sert plus — l'épreuve tombait sur du code sain, et pour la quatrième
// fois de la journée.
const MD = sansCommentaires(lire('js/core/activities/medianeAuDoigt.js'));

test('ON DIT OÙ ÇA COINCE, PAS SEULEMENT QUE ÇA COINCE', () => {
    // RANGER EST UN MOYEN, PAS LA QUESTION POSÉE : on aide. « C'est faux »
    // seul laisserait relire sept nombres sans savoir lequel reprendre.
    assert.equal(premiereDescente([8, 11, 12, 13]), -1, 'rangée : rien à dire');
    assert.equal(premiereDescente([13, 16, 12, 15]), 1, 'le 16 dépasse son voisin de droite');
    assert.equal(premiereDescente([5]), -1);
    assert.equal(premiereDescente([]), -1);
    // DEUX VALEURS ÉGALES NE SONT PAS UNE DESCENTE. Une série statistique
    // répète ses valeurs — « 12 ; 15 ; 17 ; 14 ; 13 ; 13 » est un tirage
    // ordinaire —, et refuser 13 ; 13 rendrait le rangement impossible.
    assert.equal(premiereDescente([12, 13, 13, 14]), -1);
});

test('ON NE BARRE QUE PAR LES BOUTS', () => {
    // C'EST TOUTE LA MÉTHODE. Barrer au milieu ferait disparaître la médiane
    // elle-même sans que rien ne le signale : l'élève arriverait à un
    // « dernier debout » faux, en croyant avoir suivi la règle.
    const debout = [0, 1, 2, 3, 4];
    assert.equal(estUnBout(debout, 0), true, 'le plus petit');
    assert.equal(estUnBout(debout, 4), true, 'le plus grand');
    assert.equal(estUnBout(debout, 2), false, 'le milieu, jamais');
    assert.equal(estUnBout(debout, 1), false);
    // ET QUAND IL N'EN RESTE QU'UN, ON NE BARRE PLUS : c'est la réponse.
    assert.equal(estUnBout([7], 7), false);
    assert.equal(estUnBout([], 0), false);
});

test('UNE SÉRIE IMPAIRE PASSE PAR DEUX DEBOUT, ET CE N\'EST PAS LA FIN', () => {
    // LE DÉFAUT MESURÉ SUR LE CHEMIN DE L'ÉLÈVE, et il bloquait l'exercice :
    // sur 160 · 161 · 167 · 168 · 169, on s'arrêtait à « 167 et 168 ». On
    // barre un jeton À LA FOIS — c'est un doigt, pas une paire —, donc une
    // série impaire a forcément un moment où il en reste deux. Y poser la
    // question du milieu arrêtait tout : plus rien ne se barrait.
    assert.equal(phaseApres(5, 2), 'barrer', 'cinq valeurs : deux debout est une ÉTAPE');
    assert.equal(phaseApres(7, 2), 'barrer');
    assert.equal(phaseApres(5, 1), 'barrer', 'un seul debout : c\'est la médiane, on valide');
    // ET SUR UNE SÉRIE PAIRE, DEUX DEBOUT EST LA FIN — le seul moment de
    // l'exercice où l'on choisit.
    assert.equal(phaseApres(6, 2), 'choisir');
    assert.equal(phaseApres(6, 4), 'barrer');
});

test('LE GLISSER N\'EST PAS CELUI DU NAVIGATEUR, ET IL ÉCOUTE LE DOCUMENT', () => {
    // DEUX RÈGLES PAYÉES, ET AUCUNE DES DEUX NE LÈVE D'ERREUR QUAND ELLE SAUTE.
    //
    // 1. L'API « drag and drop » du navigateur ne répond pas au doigt, et
    //    l'application est utilisée sur tablette. On n'emploie donc que des
    //    événements de pointeur — la règle déjà posée dans `choice.js`.
    assert.ok(!/\bdragstart\b|\bondragover\b|\bdataTransfer\b/.test(MD),
        'un glisser au doigt ne passe pas par l\'API « drag and drop »');
    // 2. LES ÉCOUTEURS VIVENT SUR LE DOCUMENT, ET C'EST LA CORRECTION QUI A
    //    COÛTÉ LE PLUS CHER. Premier jet : `setPointerCapture` sur le jeton,
    //    puis `insertBefore` pour le déplacer. MESURÉ dans le navigateur en
    //    comptant les événements : les deux premiers `pointermove` arrivaient
    //    sur le jeton tenu, tous les suivants sur ses voisins, et le
    //    `pointerup` jamais. Déplacer un nœud, c'est d'abord le RETIRER — et
    //    un élément retiré perd sa capture. Le geste se détruisait au moment
    //    où il réussissait.
    assert.ok(!/setPointerCapture/.test(MD),
        'la capture du pointeur ne survit pas à `insertBefore`');
    assert.match(MD, /document\.addEventListener\('pointermove', pendantLeGlisse\)/);
    assert.match(MD, /document\.addEventListener\('pointerup', lacher\)/);
    // ET ON LES DÉCROCHE. Partis avec `innerHTML = ''`, ils resteraient là
    // pour toute la vie de la page.
    assert.match(MD, /document\.removeEventListener\('pointermove', pendantLeGlisse\)/);
    const i = MD.indexOf('destroy()');
    assert.match(MD.slice(i, i + 400), /if \(glisse\) lacher\(\);/,
        'un glissé en cours doit se décrocher quand l\'activité s\'efface');
});

test('LE CLAVIER RANGE AUSSI', () => {
    // UN GLISSER NE SE FAIT NI AU CLAVIER NI AU LECTEUR D'ÉCRAN, et le
    // rangement est la moitié de l'exercice : sans les flèches, cette moitié
    // serait inaccessible. Ce n'est pas un supplément, c'est la condition pour
    // que l'exercice existe pour tout le monde.
    assert.match(MD, /ArrowLeft/);
    assert.match(MD, /ArrowRight/);
    assert.match(MD, /tabindex|<button/, 'les jetons doivent pouvoir recevoir le focus');
});

test('L\'EXERCICE EST MONTÉ, ET SUR LES TROIS MARCHES DE MÉDIANE', () => {
    // QUATRE FICHIERS DOIVENT S'ACCORDER, et rien ne les y oblige : le
    // catalogue, le registre des activités, les codes dictés, et le fichier
    // de l'activité. Une faute dans l'un des quatre ne lève aucune erreur —
    // l'exercice est simplement injouable.
    const exo = donneesExercises.find(e => e.id === 'don-mediane-doigt');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'medianeAuDoigt');
    assert.equal(exo.generatorId, 'don.statistiques',
        'le même générateur que « Moyenne, Médiane, Étendue » : même tirage, autre geste');
    const act = getActivity('medianeAuDoigt');
    assert.ok(act, 'l\'activité doit être inscrite au registre');
    assert.ok(act.accepts.includes('numeric'),
        'la réponse reste un NOMBRE : c\'est le chemin pour y arriver qui change');
    // LES TROIS MARCHES DE MÉDIANE, ET ELLES SEULES. « Pas à pas » demande
    // trois nombres dans une phrase à trous : ce n'est pas une médiane qu'on
    // isole en barrant, c'est un compte, une somme et une division — et le
    // geste de cette activité n'aurait aucun sens dessus.
    assert.deepEqual(exo.params.marches,
        ['mediane-rangee', 'mediane-desordre', 'mediane-paire']);
    // LA CALCULATRICE EST FERMÉE, et c'est le seul endroit du chapitre où on
    // peut l'écrire : une médiane ne se calcule pas, elle se cherche.
    assert.equal(exo.calculatrice, false);
});
