// DEUX RÔLES DANS LE MÊME NAVIGATEUR.
//
// Rémy : « comment je pourrais simuler un mode élève et prof simultané, pour
// être sûr que ça fonctionne ».
//
// Ce qui se vérifie ici, c'est l'aller-retour du billet : le professeur clique
// sur « son écran », une adresse se fabrique, la seconde fenêtre la relit. Si
// les deux ne s'accordent pas, le professeur tombe sur une porte vide sans
// savoir pourquoi — et croit que le rattachement est cassé.
//
// L'ISOLATION DU STOCKAGE, elle, ne se teste pas ici : elle vit dans
// `index.html`, avant tout module, et c'est `tools/boutEnBout.mjs` qui la
// mesure sur un vrai navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billetDeLAdresse, adresseDuPoste } from '../js/ui/posteEleve.js';

test('l\'adresse fabriquée se relit telle quelle', () => {
    const eleve = { login: 'leo.r', code: '2024' };
    const url = adresseDuPoste(eleve);
    assert.match(url, /\?poste=1/, 'le drapeau qui déclenche le tiroir à part');
    const lu = billetDeLAdresse(url.slice(url.indexOf('#')));
    assert.deepEqual(lu, eleve);
});

test('LE BILLET VOYAGE DANS LE FRAGMENT, JAMAIS DANS LA REQUÊTE', () => {
    // Un fragment n'est pas envoyé au serveur : le code de l'élève ne peut
    // donc pas se retrouver dans les journaux d'Apache. C'est la seule raison
    // de ce découpage, et une régression le ferait glisser côté requête sans
    // que rien ne s'en aperçoive.
    const url = adresseDuPoste({ login: 'emma.d', code: '7719' });
    const requete = url.slice(url.indexOf('?'), url.indexOf('#'));
    assert.ok(!requete.includes('7719'), 'le code ne doit pas être dans la requête');
    assert.ok(!requete.includes('emma'), "ni l'identifiant");
    assert.ok(url.slice(url.indexOf('#')).includes('7719'), 'il est dans le fragment');
});

test('un prénom ou un code exotique survit au voyage', () => {
    // Les identifiants viennent d'une liste collée depuis Pronote : on y trouve
    // des points, des tirets, et parfois des caractères accentués.
    for (const billet of [
        { login: 'maëlle.n', code: 'été2024' },
        { login: 'jean-luc.p', code: 'a b' },
        { login: 'x.y', code: '' }
    ]) {
        const url = adresseDuPoste(billet);
        assert.deepEqual(billetDeLAdresse(url.slice(url.indexOf('#'))), billet,
            'aller-retour pour ' + billet.login);
    }
});

test('une adresse sans billet ne prétend rien', () => {
    assert.equal(billetDeLAdresse(''), null);
    assert.equal(billetDeLAdresse('#'), null);
    assert.equal(billetDeLAdresse('#autrechose=1'), null);
    // Sans barre oblique, il n'y a pas de billet : mieux vaut une porte vide
    // qu'une tentative de connexion avec un code inventé.
    assert.equal(billetDeLAdresse('#billet=leo.r'), null);
    // Un identifiant vide non plus.
    assert.equal(billetDeLAdresse('#billet=/2024'), null);
});

test('un code contenant une barre oblique n\'est pas coupé en deux', () => {
    // On coupe à la PREMIÈRE barre, et le reste est le code — quoi qu'il
    // contienne. Couper à la dernière donnerait un identifiant faux.
    const lu = billetDeLAdresse('#billet=' + encodeURIComponent('leo.r/a/b'));
    assert.deepEqual(lu, { login: 'leo.r', code: 'a/b' });
});

test('le billet se lit aussi après un autre paramètre de fragment', () => {
    assert.deepEqual(billetDeLAdresse('#vue=accueil&billet=' + encodeURIComponent('zoe.m/1234')),
        { login: 'zoe.m', code: '1234' });
});

test('sans élève, on ouvre un poste vierge', () => {
    // Le bouton « Ouvrir un poste élève » sert à éprouver la PORTE : l'entrée
    // par le code de la classe, et les messages quand on se trompe. Il ne doit
    // donc pas traîner un fragment vide derrière lui.
    assert.equal(adresseDuPoste(null), 'index.html?poste=1');
    assert.equal(adresseDuPoste({ login: '', code: '' }), 'index.html?poste=1');
});

test('LE BANDEAU N\'EXÉCUTE PAS CE QU\'ON LUI GLISSE', async () => {
    // L'identifiant vient du fragment de l'adresse. Il arrive normalement du
    // bouton « son écran », donc du serveur — mais rien n'empêche d'envoyer à
    // un professeur un lien dont le fragment porte du HTML. Il s'exécuterait
    // dans l'origine du site, avec son jeton à portée.
    const mauvais = '<img src=x onerror=alert(1)>';
    const lu = billetDeLAdresse('#billet=' + encodeURIComponent(mauvais + '/1'));
    assert.equal(lu.login, mauvais, 'on le lit tel quel…');

    // …et le bandeau ne le rend jamais tel quel. On vérifie par la fonction
    // exportée plutôt que par le DOM : il n'y a pas de navigateur ici.
    const { bandeauPourEssai } = await import('../js/ui/posteEleve.js');
    const html = bandeauPourEssai(mauvais);
    assert.ok(!html.includes('<img'), 'aucune balise ne passe');
    assert.ok(html.includes('&lt;img'), 'elle est bien échappée');
});
