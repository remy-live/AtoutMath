// LE PAVÉ À LA DEMANDE, ET RIEN NE BOUGE TANT QU'ON NE LE DEMANDE PAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le prio-bot relatifs pourrait on éventuellement avoir une
// touche qui affiche un pavé numérique avec + - et () mais si on ne demande
// rien ne change pas le design car c'est parfait telle quel ».
//
// La dernière moitié de la phrase est la contrainte, et c'est elle qu'on garde
// ici : l'écran ne bouge pas d'un pixel tant que personne n'appuie.
//
// ── CE QUI EXISTAIT DÉJÀ, ET CE QUI MANQUAIT ────────────────────────────────
//
// Le pavé existe depuis que Rémy a écrit « on ne peut écrire les − pour le prio
// bot relatifs à la calculatrice » — mais seulement AU DOIGT, sous 768 px. Là,
// il est obligatoire : le champ porte `inputmode: none`, le clavier du système
// ne s'ouvre pas, et le pavé est la SEULE façon d'écrire.
//
// Sur un ordinateur, l'élève tape au clavier — sauf que le signe moins des
// relatifs est au mauvais endroit sur un AZERTY, et qu'un poste de salle n'a
// pas toujours de pavé numérique. D'où la touche.
//
// ── POURQUOI PAS DE « ( » NI DE « + » ───────────────────────────────────────
//
// Rémy les nomme, et on ne les met pas : le champ de la cascade attend UN
// NOMBRE — `expected: String(p.valeur)` —, pas une expression. Une touche « ( »
// ne pourrait produire que des réponses fausses, et la règle de la maison est
// écrite deux fois dans ce fichier-là : « une touche dont on SAIT qu'elle
// donnera une réponse fausse ne doit pas exister ». Le « − », lui, sert : une
// ligne de relatifs descend sous zéro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/** Un `localStorage` de poche, et un qui refuse — la navigation privée. */
function poserStockage(quiRefuse = false) {
    const boite = new Map();
    const avant = globalThis.localStorage;
    globalThis.localStorage = quiRefuse ? {
        getItem() { throw new Error('refusé'); },
        setItem() { throw new Error('refusé'); },
        removeItem() { throw new Error('refusé'); }
    } : {
        getItem: (k) => (boite.has(k) ? boite.get(k) : null),
        setItem: (k, v) => boite.set(k, String(v)),
        removeItem: (k) => boite.delete(k)
    };
    return { boite, rendre: () => { globalThis.localStorage = avant; } };
}

test('SANS RIEN DEMANDER, LE PAVÉ N\'EST PAS VOULU', async () => {
    const st = poserStockage();
    try {
        const { paveVoulu } = await import('../js/core/reglagesDuPoste.js');
        assert.equal(paveVoulu(), false);
    } finally { st.rendre(); }
});

test('UNE FOIS DEMANDÉ, L\'APPAREIL S\'EN SOUVIENT', async () => {
    // Seize questions dans une série : redemander le pavé à chaque fois, c'est
    // le refuser.
    const st = poserStockage();
    try {
        const { paveVoulu, seSouvenirDuPave } = await import('../js/core/reglagesDuPoste.js');
        seSouvenirDuPave(true);
        assert.equal(paveVoulu(), true);
        seSouvenirDuPave(false);
        assert.equal(paveVoulu(), false);
        // ON EFFACE LA CLEF plutôt que d'écrire « 0 » : une clef qui traîne
        // finit par signifier quelque chose pour quelqu'un d'autre.
        assert.equal(st.boite.has('atoutmath.pave.voulu'), false);
    } finally { st.rendre(); }
});

test('UN STOCKAGE QUI REFUSE N\'EMPÊCHE PAS DE JOUER', async () => {
    // En navigation privée, `localStorage` jette à la simple LECTURE. Une
    // exception ici viderait l'exercice au montage.
    const st = poserStockage(true);
    try {
        const { paveVoulu, seSouvenirDuPave } = await import('../js/core/reglagesDuPoste.js');
        assert.equal(paveVoulu(), false);
        assert.doesNotThrow(() => seSouvenirDuPave(true));
        // Le pavé s'ouvrira quand même pour cette séance-ci : c'est le code de
        // l'écran qui l'ouvre, pas le souvenir.
        assert.equal(seSouvenirDuPave(true), true);
    } finally { st.rendre(); }
});

test('AU DOIGT, LE PAVÉ RESTE OBLIGATOIRE — il n\'y a pas d\'autre clavier', () => {
    // Le champ porte `inputmode: none` : sans le pavé, l'élève regarde un
    // curseur clignoter sans pouvoir écrire. Ce n'est pas un confort, c'est la
    // seule façon d'écrire, et aucune touche ne doit pouvoir l'éteindre.
    const SRC = lire('js/games/priorites.js');
    assert.match(SRC, /if \(auDoigt\(\) \|\| paveVoulu\(\)\) \{\s*\n\s*this\.monterLePave\(\);/);
    assert.match(SRC, /sansClavierSysteme\(trou\);/);
});

test('AILLEURS, L\'ÉCRAN NE BOUGE PAS TANT QUE PERSONNE N\'APPUIE', () => {
    // MESURÉ dans un vrai navigateur à 1280 px — donc pas « au doigt » :
    //   AVANT  { pave: 0, touche: visible, mot: « ⌨ Pavé » }
    //   APRÈS  { pave: 1, touche: cachée, touches: 1 2 3 4 5 − 6 7 8 9 0 ⌫ OK }
    const SRC = lire('js/games/priorites.js');
    // La touche naît CACHÉE : au doigt, le pavé est déjà là et elle n'aurait
    // rien à ouvrir.
    assert.match(SRC, /<button type="button" class="pr-btn" data-pave hidden>/);
    // Et elle ne se montre que dans l'autre branche.
    assert.match(SRC, /\} else if \(bouton\) \{\s*\n\s*bouton\.hidden = false;/);
});

test('LE PAVÉ NE SE MONTE PAS DEUX FOIS', () => {
    // La touche reste dans le document ; deux pavés empilés sous la cascade,
    // c'est l'écran de l'élève coupé en deux.
    const SRC = lire('js/games/priorites.js');
    const i = SRC.indexOf('this.monterLePave = () => {');
    assert.ok(i > 0, 'le montage du pavé a disparu');
    assert.match(SRC.slice(i, i + 120), /if \(this\.pave\) return;/);
    // Et la touche s'efface dès que le pavé est là : un bouton qui n'ouvre
    // plus rien est un bouton cassé.
    const bloc = SRC.slice(i, SRC.indexOf('const bouton =', i));
    assert.match(bloc, /btn\.hidden = true;/);
});

test('AUCUNE TOUCHE QUI NE PEUT QUE DONNER UNE RÉPONSE FAUSSE', () => {
    // Rémy demande « + - et () ». Le champ de la cascade attend UN NOMBRE :
    // une parenthèse n'y produirait que des réponses fausses, et c'est la règle
    // écrite deux fois dans ce fichier-là.
    const SRC = lire('js/games/priorites.js');
    const i = SRC.indexOf('this.monterLePave = () => {');
    const bloc = SRC.slice(i, SRC.indexOf('const bouton =', i));
    assert.ok(bloc.length > 200, 'tranche vide : le test ne vérifierait rien');
    assert.ok(!/touches:\s*\[/.test(bloc),
        'des touches d\'expression sur un champ qui attend un nombre');
    // Le signe, lui, sert — et seulement sur les relatifs.
    assert.match(bloc, /signe: this\.relatifs,/);
});
