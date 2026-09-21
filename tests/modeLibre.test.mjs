// LE MODE LIBRE EST UN RÉGLAGE DE SITE, PAS UNE CONSTANTE DU CODE.
//
// Rémy : « le mode libre, mets-le en bouton dans ma zone prof (qui est admin
// aussi du coup) ».
//
// AVANT : une constante `MODE_LIBRE = false` et une dérogation `localStorage`.
// Les deux ne valaient que pour UN navigateur — Rémy pouvait regarder à quoi
// ressemblerait le mode libre chez lui, mais l'allumer pour ses élèves
// demandait de republier le site. Un réglage qui ne franchit pas le réseau
// n'est pas un réglage de site.
//
// Le chemin complet — professeur qui bascule, élève d'un autre navigateur qui
// voit la porte apparaître — est vérifié au navigateur
// (tools/tmp/verifModeLibre.mjs). Ici on tient l'ORDRE DES AUTORITÉS, qui est
// le fond du sujet et que rien ne signalerait s'il s'inversait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

/** Un stockage local de poche. */
function poser(stockage) {
    const boite = new Map(Object.entries(stockage || {}));
    globalThis.window.localStorage = {
        getItem: (k) => (boite.has(k) ? boite.get(k) : null),
        setItem: (k, v) => boite.set(k, String(v)),
        removeItem: (k) => boite.delete(k)
    };
    return boite;
}

const charger = () => import('../js/core/portail.js?t=' + Math.random());
const chargerReglages = () => import('../js/core/reglagesSite.js?t=' + Math.random());

test('SANS SERVEUR, C\'EST LA CONSTANTE DU CODE QUI RÉPOND', () => {
    // Un AtoutMath posé sur une clé USB, un poste hors ligne au premier
    // démarrage : il n'y a personne à qui demander.
    poser({});
    return charger().then(({ modeLibre, MODE_LIBRE }) => {
        assert.equal(MODE_LIBRE, false, 'le repli reste « éteint »');
        assert.equal(modeLibre(), false);
    });
});

test('LE SERVEUR L\'EMPORTE SUR LA CONSTANTE', async () => {
    poser({ 'atoutmath-reglages-site': JSON.stringify({ modeLibre: true }) });
    const { modeLibre } = await charger();
    assert.equal(modeLibre(), true, 'le réglage du serveur a été lu');
});

test('MAIS LA DÉROGATION LOCALE L\'EMPORTE SUR LE SERVEUR', async () => {
    // C'est l'outil de celui qui essaie : Rémy regarde l'écran de l'élève sans
    // changer ce que trente élèves voient. S'il n'était pas prioritaire, il ne
    // servirait à rien.
    poser({
        'atoutmath-reglages-site': JSON.stringify({ modeLibre: true }),
        'atoutmath-mode-libre': '0'
    });
    const { modeLibre } = await charger();
    assert.equal(modeLibre(), false, 'la dérogation locale ferme');

    poser({
        'atoutmath-reglages-site': JSON.stringify({ modeLibre: false }),
        'atoutmath-mode-libre': '1'
    });
    const m2 = await charger();
    assert.equal(m2.modeLibre(), true, 'et elle ouvre aussi');
});

test('UN SERVEUR QUI N\'A JAMAIS RÉPONDU N\'EST PAS UN SERVEUR QUI DIT NON', async () => {
    // `reglageSite` rend `null` — pas `false`. Confondre les deux ferait de
    // toute panne de réseau une réponse, et l'on ne pourrait plus retomber sur
    // la valeur par défaut.
    poser({});
    const { reglageSite } = await chargerReglages();
    assert.equal(reglageSite('modeLibre'), null);
});

test('la dernière réponse connue survit à la perte du réseau', async () => {
    // Un élève qui ouvre l'application dans le train ne doit pas voir
    // l'interface changer parce qu'il n'y a pas de réseau.
    poser({ 'atoutmath-reglages-site': JSON.stringify({ modeLibre: true }) });
    const { reglageSite, chargerReglagesSite } = await chargerReglages();
    assert.equal(reglageSite('modeLibre'), true);
    // Sans adresse, on ne demande rien et l'on ne casse rien.
    assert.equal(await chargerReglagesSite(''), null);
    assert.equal(reglageSite('modeLibre'), true, 'ce qu\'on savait est toujours là');
});

test('LA PORTE NE SE REDESSINE QUE SI LE RÉGLAGE A CHANGÉ', () => {
    // Elle se dessine AVANT que le serveur ait répondu — c'est délibéré :
    // attendre un aller-retour réseau pour afficher un écran d'accueil ferait
    // payer à tout le monde, hors ligne compris, un booléen. Quand la réponse
    // arrive, il faut donc pouvoir redessiner — mais pas pour rien : cela
    // effacerait l'identifiant que l'élève est en train de taper.
    const src = readFileSync(new URL('../js/ui/portailUI.js', import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    //
    // DEUX RÉGLAGES DÉCIDENT MAINTENANT DE SA FORME : le mode libre AJOUTE une
    // porte (« Explorer les exercices »), l'inscription libre en RETIRE une
    // (« Je n'ai pas de billet »). La garde compare donc les deux — surveiller
    // le seul mode libre laisserait la seconde figée dans l'état où la page a
    // été ouverte.
    assert.match(src, /let dessineeAvec = null;/);
    assert.match(src, /const signatureDesPortes = \(\) => `\$\{modeLibre\(\)\}\|\$\{inscriptionLibre\(\)\}`;/);
    assert.match(src, /if \(dessineeAvec === signatureDesPortes\(\)\) return false;/);
    assert.match(src, /dessineeAvec = signatureDesPortes\(\);/);
});

test('LE SERVEUR TIENT LE RÉGLAGE, ET LE REND SANS JETON', () => {
    // La porte d'entrée décide de ce qu'elle montre AVANT que le visiteur ait
    // le moindre jeton : une route protégée ne pourrait jamais lui répondre.
    const api = readFileSync(new URL('../api/index.php', import.meta.url), 'utf8');
    assert.match(api, /case '\/reglages':\s+handleReglages\(\); break;/);
    assert.match(api, /case '\/teacher\/reglages': handleTeacherReglages\(\); break;/);
    const lecture = api.slice(api.indexOf('function handleReglages'),
        api.indexOf('function handleTeacherReglages'));
    assert.ok(!/requireTeacher|requireStudent/.test(lecture), 'la lecture est publique');
    const ecriture = api.slice(api.indexOf('function handleTeacherReglages'),
        api.indexOf('function handleTeacherReglages') + 700);
    assert.match(ecriture, /requireTeacher\(\);/, 'l\'écriture ne l\'est pas');
});

test('l\'interrupteur du professeur croit le serveur, pas le bouton', () => {
    // On pourrait inverser la valeur localement et redessiner tout de suite ;
    // l'écran dirait alors « ouvert » même si le serveur a refusé, et le
    // professeur croirait avoir ouvert le catalogue à trente élèves.
    const ec = readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.match(ec, /data-mode-libre=/);
    assert.match(ec, /await fait\(reglagesDuSite\(\{ modeLibre: cible \}\)/);
    assert.match(ec, /vue\.reglagesSite = r\.reglages \|\| vue\.reglagesSite;/);
    assert.match(ec, /noterReglagesSite\(vue\.reglagesSite\);/);
});
