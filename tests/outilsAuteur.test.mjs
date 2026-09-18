// LA PALETTE D'AUTEUR EST ÉTEINTE TANT QU'ON NE L'A PAS DEMANDÉE.
//
// Mesuré au navigateur : sur une tablette de 820 × 1180, ouverte en professeur,
// 40 cibles tactiles sur 45 faisaient moins de 44 px — et les DIX PREMIÈRES
// étaient des boutons de la palette d'outils d'auteur, qui s'affichait pour
// tout professeur identifié. Un collègue à qui Rémy montre le logiciel y
// rencontrait, dès sa première minute, « vider la sauvegarde locale » et
// « compter la question juste ».
//
// Ce que ces épreuves tiennent, c'est la RÈGLE DE DÉFAUT et la mémoire du
// choix. Ce que fait la classe une fois posée — montrer ou cacher — est du
// ressort du CSS, et c'est vérifié au navigateur (tools/tmp/verifOutilsAuteur).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

/** Un stockage local de poche, qu'on peut vider entre deux épreuves. */
function poser(stockage, adresse) {
    const boite = new Map(Object.entries(stockage || {}));
    globalThis.window.localStorage = {
        getItem: (k) => (boite.has(k) ? boite.get(k) : null),
        setItem: (k, v) => boite.set(k, String(v)),
        removeItem: (k) => boite.delete(k)
    };
    globalThis.window.location = { search: adresse || '', origin: '', pathname: '' };
    const classes = new Set();
    globalThis.document.body = {
        classList: {
            toggle: (c, oui) => { if (oui) classes.add(c); else classes.delete(c); },
            contains: (c) => classes.has(c)
        }
    };
    return { boite, classes };
}

const charger = async () => {
    // Le module ne retient rien entre deux appels : on peut le réimporter sans
    // se soucier du cache d'import.
    const m = await import('../js/core/outilsAuteur.js?t=' + Math.random());
    return m;
};

test('AU PREMIER LANCEMENT, LA PALETTE EST ÉTEINTE', async () => {
    const { classes } = poser({});
    const { outilsAuteur, appliquerOutilsAuteur } = await charger();
    assert.equal(outilsAuteur(), false);
    assert.equal(appliquerOutilsAuteur(), false);
    assert.equal(classes.has('outils-auteur'), false);
});

test('allumée, elle se retient — et la classe est posée', async () => {
    const { boite, classes } = poser({});
    const { reglerOutilsAuteur, outilsAuteur } = await charger();
    reglerOutilsAuteur(true);
    assert.equal(outilsAuteur(), true);
    assert.equal(boite.get('atoutmath-outils-auteur'), '1');
    assert.equal(classes.has('outils-auteur'), true);
    reglerOutilsAuteur(false);
    assert.equal(classes.has('outils-auteur'), false);
    assert.equal(boite.get('atoutmath-outils-auteur'), '0');
});

test('L\'ADRESSE L\'EMPORTE — c\'est la seule entrée depuis un iPhone', async () => {
    // Rémy teste sur son téléphone, où l'on n'ouvre pas de console. `?auteur=1`
    // est ce qui rend l'interrupteur atteignable avant d'avoir trouvé les
    // réglages.
    const { boite } = poser({ 'atoutmath-outils-auteur': '0' }, '?auteur=1');
    const { appliquerOutilsAuteur } = await charger();
    assert.equal(appliquerOutilsAuteur(), true);
    // …ET ELLE EST RETENUE : sans cela le réglage se déferait au premier
    // rechargement, c'est-à-dire au premier exercice ouvert.
    assert.equal(boite.get('atoutmath-outils-auteur'), '1');
});

test('?auteur=0 éteint, même si c\'était allumé', async () => {
    const { boite } = poser({ 'atoutmath-outils-auteur': '1' }, '?auteur=0');
    const { appliquerOutilsAuteur } = await charger();
    assert.equal(appliquerOutilsAuteur(), false);
    assert.equal(boite.get('atoutmath-outils-auteur'), '0');
});

test('une adresse qui ne dit rien laisse le souvenir tranquille', async () => {
    const { boite } = poser({ 'atoutmath-outils-auteur': '1' }, '?code=4KP2');
    const { appliquerOutilsAuteur } = await charger();
    assert.equal(appliquerOutilsAuteur(), true);
    assert.equal(boite.get('atoutmath-outils-auteur'), '1');
    // Et une valeur qui n'est ni 1 ni 0 ne veut rien dire : on n'invente pas.
    poser({ 'atoutmath-outils-auteur': '1' }, '?auteur=peut-etre');
    const m2 = await charger();
    assert.equal(m2.appliquerOutilsAuteur(), true);
});

test('un stockage refusé ne fait pas tomber le logiciel', async () => {
    // Navigation privée, site data bloqué : lire ou écrire lève. Le pire qui
    // doive arriver, c'est que la palette reste éteinte.
    poser({});
    globalThis.window.localStorage = {
        getItem() { throw new Error('refusé'); },
        setItem() { throw new Error('refusé'); }
    };
    const { outilsAuteur, reglerOutilsAuteur, appliquerOutilsAuteur } = await charger();
    assert.equal(outilsAuteur(), false);
    assert.doesNotThrow(() => reglerOutilsAuteur(true));
    assert.equal(appliquerOutilsAuteur(), false);
});

test('les abonnés sont prévenus, et un abonné mort n\'arrête pas les autres', async () => {
    poser({});
    const { reglerOutilsAuteur, surOutilsAuteur } = await charger();
    const vus = [];
    surOutilsAuteur(() => { throw new Error('celui-ci est mort'); });
    const partir = surOutilsAuteur(v => vus.push(v));
    reglerOutilsAuteur(true);
    reglerOutilsAuteur(false);
    assert.deepEqual(vus, [true, false]);
    partir();
    reglerOutilsAuteur(true);
    assert.deepEqual(vus, [true, false], 'désabonné, on ne reçoit plus rien');
});
