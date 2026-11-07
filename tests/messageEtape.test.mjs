// LE MOT DU PROFESSEUR : ce qu'il tape, et ce que l'élève lit.
//
// RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
// message entre les exercices, pour expliquer un peu », et sur la mise en
// forme : « du texte, des retours à la ligne, du gras ».
//
// CE QUE CES ÉPREUVES GARDENT EN PREMIER, ET POURQUOI ELLES EXISTENT AVANT LE
// RESTE DU CHANTIER : c'est le SEUL endroit du logiciel où du texte écrit par
// un professeur devient du HTML affiché à trente élèves. Une balise qui passe
// s'exécute. L'ordre — échapper TOUT d'abord, reconnaître la mise en forme
// ENSUITE — est la seule garantie, et c'est elle qu'on éprouve.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    messageEnHtml, texteNettoye, titreNettoye, apercuDuMessage,
    LONGUEUR_MAX, TITRE_MAX
} from '../js/core/messageEtape.js';

// ───────────────────────────────────────── CE QUI NE DOIT JAMAIS PASSER ─────

test('AUCUNE BALISE ÉCRITE PAR LE PROFESSEUR N\'ARRIVE VIVANTE CHEZ L\'ÉLÈVE', () => {
    const html = messageEnHtml('<script>alert(1)</script>');
    assert.doesNotMatch(html, /<script/i, 'une balise écrite dans le champ s\'exécuterait');
    assert.match(html, /&lt;script&gt;/);

    // Les attributs aussi : un `onerror` sur une image suffit.
    const img = messageEnHtml('<img src=x onerror="alert(1)">');
    assert.doesNotMatch(img, /<img/i);
    assert.match(img, /&lt;img/);

    // Et les guillemets, qui serviraient à sortir d'un attribut.
    assert.match(messageEnHtml('il a dit "non"'), /&quot;non&quot;/);
    assert.match(messageEnHtml("l'aire"), /l&#39;aire/);
});

test('L\'ÉCHAPPEMENT NE SE MANGE PAS LA QUEUE', () => {
    // `&` DOIT PASSER EN PREMIER. Dans l'autre ordre, le `&` de `&lt;` serait
    // ré-échappé et l'élève lirait « &amp;lt; » au lieu de « < ».
    assert.match(messageEnHtml('a < b'), /a &lt; b/);
    assert.doesNotMatch(messageEnHtml('a < b'), /&amp;lt;/);
    // Une esperluette seule reste une esperluette, une fois.
    const html = messageEnHtml('Pierre & Marie');
    assert.match(html, /Pierre &amp; Marie/);
    assert.doesNotMatch(html, /&amp;amp;/);
});

test('LES SEULES BALISES DE LA SORTIE SONT CELLES QUE LE MODULE ÉCRIT', () => {
    // On ramasse toutes les balises produites par un texte piégé, et on exige
    // qu'il n'en reste que les trois qu'on s'autorise.
    const html = messageEnHtml('Avant <b>gras</b> et *vrai gras*\nligne\n\nparagraphe <i>i</i>');
    const balises = (html.match(/<\/?[a-zA-Z][^>]*>/g) || []).map((b) => b.toLowerCase());
    for (const b of balises) {
        assert.ok(['<p>', '</p>', '<br>', '<b>', '</b>'].includes(b),
            `balise inattendue dans la sortie : ${b}`);
    }
    // Le `<b>` tapé à la main est devenu du texte ; l'étoile a fait le gras.
    assert.match(html, /&lt;b&gt;gras&lt;\/b&gt;/);
    assert.match(html, /<b>vrai gras<\/b>/);
});

// ──────────────────────────────────────────── LA MISE EN FORME QU'ON VEUT ───

test('UNE LIGNE VIDE FAIT UN PARAGRAPHE, UN RETOUR SIMPLE UN RETOUR', () => {
    const html = messageEnHtml('Premier.\nMême paragraphe.\n\nSecond paragraphe.');
    assert.equal((html.match(/<p>/g) || []).length, 2);
    assert.equal((html.match(/<br>/g) || []).length, 1);
    assert.match(html, /<p>Premier\.<br>Même paragraphe\.<\/p>/);
    // Trois lignes vides ne font pas trois paragraphes vides.
    assert.equal((messageEnHtml('a\n\n\n\nb').match(/<p>/g) || []).length, 2);
});

test('`*gras*` MET EN GRAS, ET UNE ÉTOILE DE MULTIPLICATION RESTE UNE ÉTOILE', () => {
    assert.match(messageEnHtml('*Attention* au piège'), /<b>Attention<\/b> au piège/);
    // LE CAS QUI COMPTE DANS UN LOGICIEL DE MATHÉMATIQUES : une étoile isolée
    // ne doit pas ouvrir un gras qui ne se referme jamais.
    const calcul = messageEnHtml('Calcule 3 * 4 * 5 pour voir.');
    assert.doesNotMatch(calcul, /<b>/, 'une multiplication écrite avec des étoiles devient du gras');
    assert.match(calcul, /3 \* 4 \* 5/);
    // Une étoile ouverte et jamais fermée ne met pas tout en gras.
    assert.doesNotMatch(messageEnHtml('*oubliée ici\net la suite'), /<b>/);
    // ET LE GRAS NE TRAVERSE PAS UNE LIGNE VIDE : sans cela, une étoile en haut
    // du message mettrait tout le reste en gras.
    assert.doesNotMatch(messageEnHtml('*en haut\n\nen bas*'), /<b>/);
    // Deux gras sur la même ligne, chacun le sien.
    assert.equal((messageEnHtml('*un* et *deux*').match(/<b>/g) || []).length, 2);
});

// ──────────────────────────────────────────────────── LES BORNES ET LE NOM ──

test('LE TEXTE EST BORNÉ : UN MESSAGE N\'EST PAS UN COURS', () => {
    const long = 'a'.repeat(LONGUEUR_MAX + 500);
    assert.equal(texteNettoye(long).length, LONGUEUR_MAX);
    // ET LE TITRE TIENT SUR UNE LIGNE, sans retour à la ligne possible.
    assert.equal(titreNettoye('x'.repeat(TITRE_MAX + 20)).length, TITRE_MAX);
    assert.equal(titreNettoye('Avant\nde commencer'), 'Avant de commencer');
    // Les fins de ligne de Windows ne fabriquent pas des lignes vides partout.
    assert.equal(texteNettoye('a\r\nb'), 'a\nb');
    assert.equal((messageEnHtml('a\r\nb').match(/<p>/g) || []).length, 1);
    // Rien du tout ne rend rien du tout — pas un paragraphe vide.
    assert.equal(messageEnHtml(''), '');
    assert.equal(messageEnHtml('   \n  '), '');
    assert.equal(messageEnHtml(null), '');
});

test('CHAQUE MESSAGE A UN NOM DANS LA LISTE, MÊME SANS TITRE', () => {
    // Sans cela, Rémy verrait « Message » trois fois dans son atelier et ne
    // saurait pas lequel il ouvre.
    assert.equal(apercuDuMessage({ titre: 'Avant de commencer', texte: 'peu importe' }),
        'Avant de commencer');
    assert.equal(apercuDuMessage({ texte: 'On change de méthode ici.' }),
        'On change de méthode ici.');
    // Un texte long est coupé, et l'on voit qu'il est coupé.
    const coupe = apercuDuMessage({ texte: 'z'.repeat(80) });
    assert.ok(coupe.length <= 48);
    assert.match(coupe, /…$/);
    // Les retours à la ligne ne cassent pas la ligne de la liste.
    assert.equal(apercuDuMessage({ texte: 'une\nligne' }), 'une ligne');
    // Et un message vide a quand même un nom.
    assert.equal(apercuDuMessage({}), 'Message');
    assert.equal(apercuDuMessage(null), 'Message');
});
