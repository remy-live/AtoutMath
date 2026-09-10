// LA PORTE D'ENTRÉE — quand s'ouvre-t-elle, et qu'est-ce qu'elle laisse voir ?
//
// Rémy : « quand on va sur le site, il faut un espace d'identification et une
// zone code. Pour le moment, je ne veux pas encore mettre de mode libre. »
//
// Trois règles à tenir, et toutes trois se trompent en silence si on les casse :
// le professeur ne doit pas buter sur sa propre porte, l'élève qui a déjà sa
// séance ne doit pas la revoir chaque matin, et le catalogue ne doit pas
// reparaître par une porte dérobée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { state } from '../js/core/state.js';
import { MODE_LIBRE, modeLibre, portailNecessaire, aUneSeance } from '../js/core/portail.js';

test('LE MODE LIBRE EST ÉTEINT — c\'est ce que Rémy a demandé', () => {
    assert.equal(MODE_LIBRE, false);
    assert.equal(modeLibre(), false);
});

test('LA PORTE S\'OUVRE POUR UN ÉLÈVE QUI N\'A RIEN', () => {
    state.isTeacherMode = false;
    assert.equal(aUneSeance(), false, 'le décor de test n\'a pas de parcours assigné');
    assert.equal(portailNecessaire(), true);
});

test('ELLE NE S\'OUVRE PAS DEVANT LE PROFESSEUR', () => {
    // Son navigateur ne se souvient pas d'un chargement à l'autre qu'il est
    // professeur ; mais dès qu'il l'est, la porte n'a plus lieu d'être.
    state.isTeacherMode = true;
    assert.equal(portailNecessaire(), false);
    state.isTeacherMode = false;
});

test('LA PORTE NE DEMANDE PAS L\'ADRESSE DU SERVEUR', () => {
    // C'était la marche de trop : « http://… » à taper sans faute sur une
    // tablette, dicté à trente élèves. L'adresse se déduit de celle de la page.
    const src = fs.readFileSync('js/ui/portailUI.js', 'utf8');
    assert.match(src, /adresseApiDeduite/, 'l\'adresse doit se déduire');
    const formulaire = src.slice(src.indexOf('portail-portes'), src.indexOf('portail-pied'));
    assert.ok(!/type="url"|placeholder="http/.test(formulaire),
        'la porte redemande une adresse de serveur');
    // Les deux portes de connexion, plus celle du code de séance.
    assert.match(formulaire, /id="portail-login"/);
    assert.match(formulaire, /id="portail-code-eleve"/);
    assert.match(formulaire, /id="portail-classe"/);
    assert.match(formulaire, /id="portail-prenom"/);
    assert.match(formulaire, /id="portail-code"/);
});

test('LA CONNEXION PAR IDENTIFIANT PASSE DEVANT — le code de classe est replié', () => {
    // Les deux marchent, mais elles ne se valent pas : la liste dit QUI
    // travaille, le code de classe laisse chacun se déclarer. La bonne porte
    // doit donc être celle qu'on voit en premier.
    const src = fs.readFileSync('js/ui/portailUI.js', 'utf8');
    const i = src.indexOf('id="portail-login"');
    const j = src.indexOf('id="portail-classe"');
    assert.ok(i > 0 && j > i, 'l\'identifiant doit venir avant le code de classe');
    const entre = src.slice(i, j);
    assert.match(entre, /<details/, 'le code de classe doit être replié');
});

test('SANS MODE LIBRE, LE CATALOGUE DISPARAÎT — ET LE CODE RESTE', () => {
    // Le même raisonnement que pour le verrou de classe : on ferme l'atelier,
    // on laisse la porte par laquelle le travail arrive.
    const css = fs.readFileSync('css/ui.css', 'utf8');
    const bloc = css.slice(css.indexOf('body.sans-mode-libre'),
        css.indexOf('body.sans-mode-libre') + 700);
    for (const ferme of ['#top-btn-grid', '#mob-btn-grid', '#sidebar', '#debug-toolbar']) {
        assert.ok(bloc.includes(ferme), `${ferme} devrait être fermé`);
    }
    for (const ouvert of ['#top-btn-code', '#top-btn-path', '#top-btn-profile']) {
        assert.ok(!bloc.includes(ouvert), `${ouvert} doit rester ouvert`);
    }
});

test('LE MODE LIBRE ET LE VERROU DE CLASSE SONT DEUX CHOSES', () => {
    // Le verrou est une consigne du PROFESSEUR, posée et levée depuis sa
    // console. Le mode libre est un choix de l'APPLICATION. Les confondre — une
    // seule classe CSS pour les deux — ferait rouvrir le catalogue au premier
    // déverrouillage, alors que Rémy n'en veut pas encore.
    const css = fs.readFileSync('css/ui.css', 'utf8');
    assert.match(css, /body\.classe-verrouillee #top-btn-grid/,
        'le verrou de classe doit fermer le catalogue');
    assert.match(css, /body\.sans-mode-libre #top-btn-grid/,
        'et le mode libre éteint aussi, indépendamment');
    const ui = fs.readFileSync('js/ui/portailUI.js', 'utf8');
    assert.match(ui, /classList\.toggle\('sans-mode-libre'/,
        'la classe du mode libre se pose ailleurs que celle du verrou');
    const seance = fs.readFileSync('js/ui/seanceDistanteUI.js', 'utf8');
    assert.ok(!seance.includes('sans-mode-libre'),
        'le verrou de classe ne doit pas toucher à la classe du mode libre');
});

test('L\'APPLICATION N\'OUVRE PLUS SUR LE CATALOGUE', () => {
    // Il serait masqué dans la barre et affiché dans la page : deux
    // affirmations contraires sur le même écran.
    const app = fs.readFileSync('js/app.js', 'utf8');
    assert.match(app, /setTopNavMode\(modeLibre\(\) \|\| state\.isTeacherMode \? 'grid' : 'path'\)/);
});

test('UN CODE DE SÉANCE DANS LA CASE DU BILLET EST RECONNU, PAS REFUSÉ', () => {
    // Rémy s'y est pris lui-même : « ALX-BAB-SPV-… » collé dans la case du
    // billet. Le serveur aurait répondu « Identifiant ou code incorrect » —
    // une phrase vraie et parfaitement inutile, qui envoie vérifier le billet
    // alors que c'est de case qu'on s'est trompé.
    const src = fs.readFileSync(new URL('../js/ui/portailUI.js', import.meta.url), 'utf8');
    assert.match(src, /ressembleAUneSeance/, 'la forme du code doit être reconnue');

    // La règle, telle qu'elle est écrite : un tiret, ou plus de douze signes.
    // Un code de billet ne peut être ni l'un ni l'autre — quatre signes pris
    // dans un alphabet qui n'a pas de tiret.
    const ressemble = (code) => /-/.test(code) || code.length > 12;
    ['ALX-BAB-SPV-', 'M2-abcdefghijklmnop', 'K7QP-2'].forEach(c =>
        assert.ok(ressemble(c), `« ${c} » est un code de séance`));
    ['4KP2', 'ABCD', 'X7Y9', '23456789ABCD'].forEach(c =>
        assert.ok(!ressemble(c), `« ${c} » est un code de billet`));

    // ET ON LE DÉPLACE, on ne se contente pas de le dire : rester devant une
    // case qu'on vient de nous dire fausse, c'est encore du travail pour
    // l'élève — et c'est nous qui avons mal rangé les cases.
    assert.match(src, /portail-code'\)\.value = code/,
        'le code doit être recopié dans la bonne case');
});

test('CHAQUE CASE DIT LA FORME DU CODE QU\'ELLE ATTEND', () => {
    // Les deux portes demandaient « un code », sans jamais dire lequel.
    const src = fs.readFileSync(new URL('../js/ui/portailUI.js', import.meta.url), 'utf8');
    assert.match(src, /4 signes/, 'la case du billet doit annoncer sa forme');
    assert.match(src, /long, avec des tirets/, 'celle de la séance aussi');
});
