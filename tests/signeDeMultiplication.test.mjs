// LE SIGNE DE MULTIPLICATION EST UN RÉGLAGE, ET IL NE TOUCHE QUE L'AFFICHAGE.
//
// Rémy : « dans les paramètres d'affichage, propose aussi le x (le signe fois
// français) ou l'astérisque […] il y a 3 notations, je pense le point du milieu
// pour la notation américaine, l'astérisque ou le fois à la française […] et
// évidemment ce rendu est valable dans les écritures et input ».
//
// COMPTÉ AVANT DE COMMENCER : 1 001 chaînes portent un « × », dans 166
// fichiers — des générateurs, des jeux, et beaucoup d'énoncés écrits à la main.
// Les retoucher une à une, c'est mille occasions de se tromper aujourd'hui et
// la certitude qu'un exercice écrit l'an prochain oubliera la règle.
//
// ON SUBSTITUE DONC À L'AFFICHAGE, en UN endroit : `makeItem`, par où tout item
// passe. Le dépôt continue d'écrire « × », qui reste sa notation canonique.
//
// ── LES DEUX MOITIÉS DE LA RÈGLE ────────────────────────────────────────────
//
// CE QUI S'AFFICHE SUIT LE RÉGLAGE : l'énoncé, l'explication, les indices, le
// libellé des propositions, les lignes d'une cascade, la touche du pavé.
//
// CE QUI SE COMPARE N'Y TOUCHE JAMAIS : `answer`, la valeur d'une proposition,
// la réponse du corrigé papier. Les retoucher ferait refuser la bonne réponse
// d'un élève dont le professeur a choisi l'astérisque, ou rendrait illisible un
// travail déjà enregistré sur un appareil réglé autrement.
//
// ET LES TROIS NOTATIONS SE TAPENT TOUJOURS, quel que soit le réglage : un
// élève sur un clavier d'ordinateur tape une étoile, un autre recopie le point
// médian de son écran, les deux ont raison.
//
// MESURÉ, une fois les trois branchés :
//
//     fois    touche « × » · saisie « 3×4 » → lue · comparée à « 3×4 » : JUSTE
//     point   touche « · » · saisie « 3·4 » → lue · comparée à « 3×4 » : JUSTE
//     etoile  touche « * » · saisie « 3*4 » → lue · comparée à « 3×4 » : JUSTE

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    SIGNES_FOIS, SIGNE_PAR_DEFAUT, avecSigne, sansSigne,
    glypheFois, signeChoisi, poserSigneFois
} from '../js/core/signeFois.js';
import { makeItem, sameAnswer } from '../js/core/items.js';
import { lire, ecrire, etapes } from '../js/core/priorites.js';
import * as fx from '../js/core/maths/formule.js';

/** On repart toujours du défaut : ce module garde un état. */
const auDefaut = () => poserSigneFois(SIGNE_PAR_DEFAUT);

test('LES TROIS NOTATIONS, ET LE DÉFAUT EST CELUI DES MANUELS', () => {
    assert.deepEqual(SIGNES_FOIS.map(s => s.glyphe), ['×', '·', '*']);
    assert.equal(SIGNE_PAR_DEFAUT, 'fois');
    auDefaut();
    assert.equal(glypheFois(), '×');
    // UNE VALEUR INCONNUE NE CASSE PAS L'AFFICHAGE. Elle vient d'un stockage
    // qu'un navigateur peut rendre dans n'importe quel état.
    assert.equal(poserSigneFois('nawak'), SIGNE_PAR_DEFAUT);
    assert.equal(poserSigneFois(undefined), SIGNE_PAR_DEFAUT);
});

test('AU DÉFAUT, LA SUBSTITUTION NE FAIT RIEN DU TOUT', () => {
    // LE CHEMIN RAPIDE EST LA MOITIÉ DU MODULE : c'est lui qui permet
    // d'appeler `avecSigne` partout sans se demander ce que cela coûte, et
    // c'est lui qui fait que ce chantier ne peut rien casser pour qui n'y
    // touche pas.
    //
    // ON NE PEUT PAS LE VOIR DEPUIS L'EXTÉRIEUR, et l'avoir cru a coûté une
    // épreuve fausse : `assert.ok(avecSigne(t) === t)` passait AVEC ET SANS le
    // chemin rapide, parce que `===` sur deux chaînes compare la VALEUR et non
    // l'objet — `split('×').join('×')` rend une chaîne neuve et parfaitement
    // égale. `tools/epreuveTombe.mjs` l'a refusée.
    //
    // On lit donc la ligne dans la source. C'est moins élégant, et c'est la
    // seule chose qui tombe quand elle disparaît.
    auDefaut();
    const t = 'Calcule 7 × 8';
    assert.equal(avecSigne(t), t);
    assert.equal(avecSigne(null), null);
    assert.equal(avecSigne(undefined), undefined);
    const SRC = readFileSync(new URL('../js/core/signeFois.js', import.meta.url), 'utf8');
    assert.match(SRC, /if \(choisi === SIGNE_PAR_DEFAUT \|\| texte == null\) return texte;/,
        'au défaut, on rend l\'argument sans même le lire');
    assert.match(
        readFileSync(new URL('../js/core/items.js', import.meta.url), 'utf8'),
        /if \(signeChoisi\(\) === SIGNE_PAR_DEFAUT\) return item;/,
        'et `makeItem` n\'entre même pas dans la substitution');
});

test('UN ÉNONCÉ SUIT LE RÉGLAGE, UNE RÉPONSE NON', () => {
    const faire = () => makeItem({
        seed: 1, generatorId: 'essai', answerKind: 'numeric',
        prompt: { text: 'Calcule 7 × 8' }, answer: '7 × 8',
        explanation: '7 × 8 = 56', hints: ['Pense à 7 × 4 doublé'],
        reponsePapier: '7 × 8'
    });
    for (const [id, g] of [['point', '·'], ['etoile', '*']]) {
        poserSigneFois(id);
        const it = faire();
        assert.equal(it.prompt.text, `Calcule 7 ${g} 8`, 'l\'énoncé suit');
        assert.equal(it.prompt.html, `<div class="game-question">Calcule 7 ${g} 8</div>`);
        assert.equal(it.explanation, `7 ${g} 8 = 56`, 'l\'explication aussi');
        assert.equal(it.hints[0], `Pense à 7 ${g} 4 doublé`, 'les indices aussi');
        // ET CE QUI SE COMPARE RESTE INTACT.
        assert.equal(it.answer, '7 × 8',
            'la réponse attendue est une VALEUR : la toucher refuserait la '
            + 'bonne réponse d\'un élève, ou rendrait illisible un travail '
            + 'enregistré sur un appareil réglé autrement');
        assert.equal(it.reponsePapier, '7 × 8', 'le corrigé se compare lui aussi');
    }
    auDefaut();
});

test('LE LIBELLÉ D\'UNE PROPOSITION SUIT, SA VALEUR NON', () => {
    poserSigneFois('etoile');
    const it = makeItem({
        seed: 1, generatorId: 'essai', answerKind: 'choice',
        prompt: { text: 'Lequel ?' }, answer: 'ok',
        choices: [
            { value: 'ok', label: '3 × 4', texte: '3 × 4', correct: true },
            { value: 'faux0', label: '3 × 5', texte: '3 × 5', correct: false,
                why: 'on demandait 3 × 4' }
        ]
    });
    assert.equal(it.choices[0].label, '3 * 4');
    assert.equal(it.choices[0].texte, '3 * 4',
        '`texte` est ce qu\'imprime la fiche : c\'est de l\'affichage lui aussi');
    assert.equal(it.choices[1].why, 'on demandait 3 * 4');
    assert.equal(it.choices[0].value, 'ok', 'la valeur ne bouge pas');
    auDefaut();
});

test('LA CASCADE SUIT AUSSI, PARCE QU\'ELLE S\'ÉCRIT TOUTE SEULE', () => {
    // Elle réécrit ses lignes sans repasser par `makeItem` : sans son propre
    // branchement, l'énoncé aurait le signe choisi et les lignes en dessous
    // garderaient le « × » — deux notations dans le même calcul.
    const j = lire('3+4*5');
    const suite = () => etapes(j, {}).map(x => ecrire(x.jetons)).join(' = ');
    auDefaut();
    assert.equal(suite(), '3 + 4 × 5 = 3 + 20 = 23');
    poserSigneFois('point');
    assert.equal(suite(), '3 + 4 · 5 = 3 + 20 = 23');
    auDefaut();
});

test('LES TROIS SE TAPENT ET SE LISENT, QUEL QUE SOIT LE RÉGLAGE', () => {
    // C'est la moitié « input » de la demande — et elle ne dépend PAS du
    // réglage : le choix décide de ce qu'on écrit, jamais de ce qu'on comprend.
    for (const regle of ['fois', 'point', 'etoile']) {
        poserSigneFois(regle);
        for (const g of ['×', '·', '*']) {
            assert.doesNotThrow(() => fx.analyser(`3${g}4`),
                `« 3${g}4 » doit se lire même quand le réglage dit « ${regle} »`);
            assert.equal(sameAnswer(`3${g}4`, '3×4'), true,
                `« 3${g}4 » doit valoir « 3×4 » à la comparaison`);
        }
    }
    auDefaut();
    assert.equal(sansSigne('3 * 4'), '3 × 4');
    assert.equal(sansSigne('3 · 4'), '3 × 4');
});

test('LA TOUCHE DU PAVÉ PORTE CE QU\'ELLE ÉCRIT', () => {
    // Une touche qui montre « · » et écrit « × » ferait mentir le champ de
    // saisie d'un caractère — celui que l'élève est en train d'apprendre.
    const LS = readFileSync(
        new URL('../js/core/activities/litteralSaisie.js', import.meta.url), 'utf8');
    assert.match(LS, /\{ t: glypheFois\(\), cls: 'ls-t--signe'/,
        'la touche prend la notation du moment');
    assert.match(LS, /taper\(glypheFois\(\)\)/,
        'et l\'astérisque du clavier écrit la même chose qu\'elle');
});

test('LE RÉGLAGE EST DANS LES PARAMÈTRES D\'AFFICHAGE, AVEC SON APERÇU', () => {
    const APP = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    assert.match(APP, /data-signe-fois="\$\{s\.id\}"/,
        'les trois notations se choisissent d\'un bouton');
    assert.match(APP, /state\.setSigneFois\(btn\.dataset\.signeFois\)/,
        'et le choix est rangé dans le profil');
    // L'APERÇU MONTRE LE SIGNE À LA TAILLE OÙ ON LE LIRA : c'est tout ce qu'on
    // demande à l'aperçu d'une notation.
    assert.match(APP, /7 \$\{s\.glyphe\} 8/,
        'chaque bouton montre le signe dans un vrai calcul');
});
