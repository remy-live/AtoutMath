// LA VOIX — ET CE QUI ARRIVE QUAND ELLE N'EST PAS LÀ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/voix.js` fait dire un nombre à haute voix. Son en-tête donne les
// trois raisons de son existence, et chacune est un défaut déjà vécu :
//
//   · la synthèse peut être ABSENTE (navigateur ancien, mode restreint) — « un
//     exercice de dictée qui s'ouvre sans voix est un cul-de-sac » ;
//   · la liste des voix arrive de façon ASYNCHRONE sur Chrome, vide au premier
//     appel — et sans l'attente, « la première dictée de la séance se dit avec
//     l'accent du système, ce qui rend quatre-vingts incompréhensible » ;
//   · le débit par défaut est trop rapide pour une dictée de nombres.
//
// CE QU'ON PEUT ÉPROUVER SOUS NODE, ET CE QU'ON NE PEUT PAS. On ne fera pas
// parler une machine ici. Mais les trois décisions ci-dessus sont des décisions
// de CODE, et toutes trois se mesurent avec une fausse synthèse — y compris la
// plus importante, qui est l'ABSENCE de synthèse : c'est le cas que personne ne
// teste à la main, parce que le navigateur du développeur en a toujours une.
//
// ON INSTALLE DONC `window.speechSynthesis` NOUS-MÊMES, et l'on commence par le
// cas où il n'existe pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

// ─── Un stockage local, pour le réglage de débit ──────────────────────────────
const rangé = new Map();
globalThis.localStorage = {
    getItem: (k) => (rangé.has(k) ? rangé.get(k) : null),
    setItem: (k, v) => rangé.set(k, String(v)),
    removeItem: (k) => rangé.delete(k)
};

/**
 * Une fausse synthèse vocale.
 *
 * @param {Array} voix la liste que `getVoices()` rendra
 * @param {Object} opts `muette` pour une synthèse qui n'appelle jamais `onend`
 */
function monterSynthese(voix = [], opts = {}) {
    const dites = [];
    globalThis.window.SpeechSynthesisUtterance = class {
        constructor(texte) { this.text = texte; }
    };
    globalThis.window.speechSynthesis = {
        getVoices: () => voix,
        addEventListener() { },
        cancel() { dites.push('[coupé]'); },
        speak(u) {
            dites.push(u);
            if (!opts.muette) setTimeout(() => u.onend && u.onend(), 0);
        }
    };
    return dites;
}

function demonterSynthese() {
    delete globalThis.window.speechSynthesis;
    delete globalThis.window.SpeechSynthesisUtterance;
}

const voix = () => import('../js/core/voix.js');

test('SANS SYNTHÈSE, ON LE SAIT AVANT D\'OUVRIR L\'EXERCICE', async () => {
    // C'EST LA RAISON D'ÊTRE DU MODULE. « Un exercice de dictée qui s'ouvre sans
    // voix est un cul-de-sac : il faut pouvoir le savoir AVANT de le proposer. »
    // Un élève devant un exercice muet n'a aucun moyen de répondre, et il ne le
    // signalera pas — il croira que c'est lui qui n'a pas compris.
    demonterSynthese();
    const { voixDisponible } = await voix();
    assert.equal(voixDisponible(), false);
});

test('UNE SYNTHÈSE À MOITIÉ PRÉSENTE COMPTE POUR ABSENTE', async () => {
    // Cas réel des navigateurs en mode restreint : `speechSynthesis` existe
    // mais `SpeechSynthesisUtterance` non. Conclure « disponible » sur le seul
    // premier ferait jeter `new window.SpeechSynthesisUtterance` au moment où
    // l'élève appuie sur « Écouter ».
    const { voixDisponible } = await voix();

    // Le contrôleur sans le constructeur : `new window.SpeechSynthesisUtterance`
    // jetterait au moment où l'élève appuie sur « Écouter ».
    demonterSynthese();
    globalThis.window.speechSynthesis = { getVoices: () => [] };
    assert.equal(voixDisponible(), false, 'il faut les DEUX pour parler');

    // ET L'INVERSE, qui est le cas qu'on oublie : le constructeur sans le
    // contrôleur. `window.speechSynthesis.cancel()` jetterait alors — et
    // `parler` fait un `cancel` AVANT de parler, donc l'exercice tomberait au
    // premier appui, pas au second.
    demonterSynthese();
    globalThis.window.SpeechSynthesisUtterance = class { };
    assert.equal(voixDisponible(), false, 'un constructeur seul ne sait pas parler');

    demonterSynthese();
});

test('SANS SYNTHÈSE, « parler » REND LA MAIN TOUT DE SUITE', async () => {
    // « Pour que l'appelant n'ait jamais à attendre dans le vide. » Un exercice
    // qui attendrait une promesse jamais résolue resterait figé sur place : pas
    // de question suivante, pas de bouton, rien.
    demonterSynthese();
    const { parler, taire } = await voix();
    assert.equal(await parler('quatre mille cinq cents'), false);
    assert.doesNotThrow(() => taire(), 'et se taire quand il n\'y a pas de voix ne doit pas jeter');
});

test('ON CHOISIT LE FRANÇAIS, PUIS LA VOIX LOCALE', async () => {
    // L'ACCENT DÉCIDE DE TOUT dans une dictée de nombres : « quatre-vingts » dit
    // avec l'accent du système est incompréhensible pour un élève de sixième.
    //
    // Et la voix LOCALE plutôt que distante : « elle démarre sans délai réseau,
    // ce qui compte quand on réécoute dix fois de suite » — et en salle de
    // classe sans réseau, une voix distante ne démarre pas du tout.
    //
    // ON PASSE PAR `chercherVoixFr` ET NON PAR `parler`, parce que la voix
    // trouvée est mémorisée pour toute la session : par `parler`, on ne pourrait
    // mesurer QU'UNE des deux règles, la seconde lisant la voix retenue par la
    // première.
    const { chercherVoixFr } = await voix();
    const anglaise = { lang: 'en-US', name: 'Anglais', localService: true };
    const fraDistante = { lang: 'fr-FR', name: 'Français distant', localService: false };
    const fraLocale = { lang: 'fr_FR', name: 'Français local', localService: true };

    // La règle 1 : du français, jamais de l'anglais.
    monterSynthese([anglaise, fraDistante]);
    assert.equal(chercherVoixFr().name, 'Français distant',
        'une voix anglaise LOCALE ne doit pas gagner contre une voix française distante');

    // La règle 2 : parmi les françaises, la locale.
    monterSynthese([anglaise, fraDistante, fraLocale]);
    assert.equal(chercherVoixFr().name, 'Français local');

    // `fr_FR` avec un tiret bas doit compter comme du français : « les deux
    // écritures circulent selon le moteur ».
    monterSynthese([anglaise, fraLocale]);
    assert.equal(chercherVoixFr().name, 'Français local');

    // Et une liste sans français ne doit pas rendre une voix anglaise : c'est
    // `parler` qui décide alors de parler quand même, pas ce choix-ci.
    monterSynthese([anglaise]);
    assert.equal(chercherVoixFr(), null);

    // Une liste vide — l'état de Chrome au premier appel — ne jette pas.
    monterSynthese([]);
    assert.equal(chercherVoixFr(), null);
    demonterSynthese();
});

test('LA LANGUE DE L\'ÉNONCÉ EST TOUJOURS ANNONCÉE EN FRANÇAIS', async () => {
    // Certains moteurs s'en servent même sans voix française installée : mieux
    // vaut un nombre dit avec un mauvais accent qu'un bouton « Écouter » qui ne
    // fait rien. L'élève peut alors au moins deviner.
    const dites = monterSynthese([{ lang: 'fr-FR', name: 'Fr', localService: true }]);
    const { parler } = await voix();
    assert.equal(await parler('4500'), true);
    const u = dites.find(x => x && x.text);
    assert.ok(u, 'quelque chose doit avoir été dit');
    assert.equal(u.lang, 'fr-FR');
    assert.equal(u.text, '4500');
    assert.ok(u.rate > 0.5 && u.rate <= 1.4, `le débit doit être borné (${u.rate})`);
    demonterSynthese();
});

test('ON COUPE CE QUI RESTE À DIRE AVANT DE DIRE AUTRE CHOSE', async () => {
    // Sans ce `cancel`, un élève qui appuie deux fois sur « Écouter » entend
    // deux nombres se superposer — et aucun des deux n'est compréhensible.
    const dites = monterSynthese([{ lang: 'fr-FR', name: 'Fr', localService: true }]);
    const { parler } = await voix();
    await parler('4500');
    assert.equal(dites[0], '[coupé]', 'on coupe d\'abord, on parle ensuite');
    demonterSynthese();
});

test('LE DÉBIT EST RALENTI PAR DÉFAUT, ET BORNÉ', async () => {
    // Le débit du navigateur est « trop rapide pour une dictée de nombres ».
    // Et les bornes comptent : un débit à 0,1 rend l'exercice interminable, un
    // débit à 3 le rend inécoutable — et une valeur abîmée dans le stockage
    // (mode privé, réglage d'un autre logiciel) ne doit pas pouvoir faire ça.
    const { debit, setDebit } = await voix();
    rangé.clear();
    const parDefaut = debit();
    assert.ok(parDefaut > 0.5 && parDefaut < 1,
        `le défaut doit être plus lent que la normale (${parDefaut})`);

    setDebit(1.2);
    assert.equal(debit(), 1.2, 'un réglage valide est respecté');

    for (const abime of ['0.1', '3', 'oui', '', 'NaN', '-1']) {
        rangé.set('mathbox-voix-debit', abime);
        assert.equal(debit(), parDefaut, `« ${abime} » doit retomber sur le défaut`);
    }
});

test('ÉCRIRE LE DÉBIT DANS UN STOCKAGE REFUSÉ NE FAIT PAS TOMBER L\'EXERCICE', async () => {
    // Mode privé de Safari. Le réglage est perdu — c'est acceptable — mais
    // l'exercice doit continuer.
    const { setDebit } = await voix();
    const vrai = globalThis.localStorage.setItem;
    try {
        globalThis.localStorage.setItem = () => { throw new Error('mode privé'); };
        assert.doesNotThrow(() => setDebit(1.1));
    } finally {
        globalThis.localStorage.setItem = vrai;
    }
});

test('LES ESPACES DES MILLIERS NE SE DISENT PAS', async () => {
    // LE DÉFAUT MESURÉ, ET IL EST DOCUMENTÉ DANS LE CODE : « 4 500 » se dit
    // « quatre, cinq cents ». La synthèse lit l'espace comme une virgule.
    const { aDire } = await voix();
    assert.equal(aDire('4 500'), '4500', 'espace ordinaire');
    assert.equal(aDire('4 500'), '4500', 'espace insécable');
    assert.equal(aDire('4 500'), '4500', 'espace insécable fine — celle que le logiciel écrit');
    assert.equal(aDire('1 234 567'), '1234567', 'plusieurs groupes');

    // ET LA VIRGULE DÉCIMALE RESTE. La synthèse lit « 4,5 » comme « quatre
    // virgule cinq », ce qui est juste : la retirer dirait « quarante-cinq ».
    assert.equal(aDire('4,5'), '4,5');
    assert.equal(aDire('0,25'), '0,25');
    assert.equal(aDire('12 345,67'), '12345,67');

    // Un nombre arrive parfois comme un nombre, pas comme une chaîne.
    assert.equal(aDire(4500), '4500');
    assert.equal(aDire(0), '0');
});

test('ON NE PARLE PAS DANS LE VIDE', async () => {
    const dites = monterSynthese([{ lang: 'fr-FR', name: 'Fr', localService: true }]);
    const { parler } = await voix();
    assert.equal(await parler(''), false);
    assert.equal(await parler(null), false);
    assert.equal(dites.length, 0, 'rien ne doit avoir été envoyé à la synthèse');
    demonterSynthese();
});

test('UNE SYNTHÈSE QUI ÉCHOUE REND « false », ELLE NE FIGE PAS L\'EXERCICE', async () => {
    const dites = monterSynthese([{ lang: 'fr-FR', name: 'Fr', localService: true }]);
    globalThis.window.speechSynthesis.speak = (u) => {
        dites.push(u);
        setTimeout(() => u.onerror && u.onerror(new Error('coupé')), 0);
    };
    const { parler } = await voix();
    assert.equal(await parler('4500'), false,
        'un échec doit se dire : l\'exercice propose alors de réécouter plutôt que d\'attendre');
    demonterSynthese();
});

test('UNE SYNTHÈSE QUI JETTE NE FIGE PAS L\'EXERCICE NON PLUS', async () => {
    monterSynthese([{ lang: 'fr-FR', name: 'Fr', localService: true }]);
    globalThis.window.speechSynthesis.speak = () => { throw new Error('refusé'); };
    const { parler } = await voix();
    assert.equal(await parler('4500'), false);
    demonterSynthese();
});
