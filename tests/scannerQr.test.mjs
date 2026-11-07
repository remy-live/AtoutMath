// LE SCANNER DE QR CODE, DANS L'APPLICATION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour les tablettes hors ligne de sa sœur institutrice :
//
//   « Mais du coup on ne peut pas ne pas passer par l application du qr code
//     et avoir une fenêtre intégré dans l appli ce serait le mieux »
//
// MESURÉ DE BOUT EN BOUT (`tools/tmp/sonde-scanner.mjs`), avec une vraie
// caméra remplacée par un fichier qui montre un QR que nous avons fabriqué :
//
//   le bouton paraît              « Scanner le QR code », visible
//   la fenêtre s'ouvre            vidéo 640 × 480, viseur, décodeur chargé
//   le QR est lu, le parcours s'ouvre   « Séance du jour », couche de jeu
//   du doigt au parcours          561 ms
//   à la fermeture                le flux est COUPÉ
//   erreurs de page 0             fenêtres natives 0
//
// Et avec un QR qui n'est PAS d'AtoutMath : « Ce QR code ne vient pas
// d'AtoutMath. Vise celui du tableau. », et la fenêtre reste ouverte.
//
// ── CE QU'ON GARDE ICI, ET POURQUOI CES QUATRE-LÀ ──────────────────────────
//
// Les quatre défauts possibles sont tous SILENCIEUX. Aucun ne jette, aucun ne
// s'écrit dans la console ; chacun donne une application qui a l'air d'aller
// bien et qui ne marche pas là où il faut.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { poserUnDocumentDeSecours } from '../tools/fauxPdf.mjs';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';
import { Shortcodes } from '../js/core/shortcodes.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

poserUnDocumentDeSecours();
const { laCameraEstPossible } = await import('../js/ui/scannerQr.js');

test('LE QR DU TABLEAU PORTE UNE ADRESSE, ET LE SCANNER Y TROUVE LE CODE', () => {
    // LE DÉFAUT QU'ON GARDE : le QR que le professeur projette est fabriqué
    // par `shareUrl`, donc c'est une ADRESSE. Un scanner qui n'accepterait
    // qu'un code nu lirait parfaitement ce QR et refuserait le parcours — en
    // disant « code invalide » sur un code qui n'a rien d'invalide.
    const C = Shortcodes.codeDansLeTexte.bind(Shortcodes);
    assert.equal(C('https://atout-math.fr/?code=M2-abc'), 'M2-abc');
    assert.equal(C('https://atout-math.fr/index.html?code=SUD-12#haut'), 'SUD-12');
    // `shareUrl` encode le code : un `+` ou un `/` de base64 y arrive en %XX.
    assert.equal(C('https://atout-math.fr/?v=3&code=M2%2Dabc'), 'M2-abc');
    // Un code nu passe tel quel — c'est le QR d'un autre jour, ou un collage.
    assert.equal(C('M2-abc'), 'M2-abc');
    assert.equal(C('  SUD-12 '), 'SUD-12');
    // ET LES ESPACES NE SE COUPENT PAS : la fenêtre de saisie promet à l'élève
    // que « les majuscules, les espaces et les tirets n'ont pas d'importance »,
    // et c'est la normalisation du décodeur qui tient cette promesse. Couper
    // ici la retirerait au seul scanner.
    assert.equal(C('SUD 12'), 'SUD 12');
    // Ce qui n'est pas une adresse à code revient entier : `decodePath` est le
    // seul juge, comme pour un code tapé à la main.
    assert.equal(C('https://exemple.fr/promo'), 'https://exemple.fr/promo');
    assert.equal(C(''), '');
    assert.equal(C(null), '');
});

test('LE DÉCODEUR EST DANS LE NOYAU HORS LIGNE — sans quoi il manque le jour où il sert', () => {
    // LE DÉFAUT LE PLUS CRUEL DE TOUS : le scanner existe POUR les salles sans
    // réseau. Un décodeur chargé à la demande s'y chargerait… depuis le
    // réseau. L'élève verrait « Le lecteur de QR code n'a pas pu se charger »
    // exactement là où il n'y a aucun recours.
    const SW = lire('sw.js');
    const noyau = SW.slice(SW.indexOf('const NOYAU = ['), SW.indexOf('];', SW.indexOf('const NOYAU = [')));
    assert.match(noyau, /'\.\/vendor\/jsqr\/jsQR\.js'/,
        'le décodeur de QR n\'est pas pré-mis en cache : le scanner sera muet hors ligne');
    // Et le fichier existe vraiment : une ligne dans le NOYAU qui ne désigne
    // rien fait échouer `cache.addAll` EN ENTIER, donc l'installation du
    // service worker — c'est-à-dire tout le hors ligne.
    assert.ok(lire('vendor/jsqr/jsQR.js').length > 10000,
        'vendor/jsqr/jsQR.js est absent ou vide : `addAll` échouera et il n\'y '
        + 'aura plus AUCUN hors ligne');
});

test('LA FENÊTRE DU SCANNER PASSE AU-DESSUS DE CELLE QUI L\'OUVRE', () => {
    // MESURÉ, ET C'EST AINSI QU'ON L'A VU : la caméra tournait, la vidéo
    // faisait 640 × 480, le viseur était là, le décodeur lisait — et la photo
    // montrait la fenêtre du code. Tout marchait, sauf qu'on ne voyait rien.
    //
    // LA CAUSE : le scanner s'ouvre DEPUIS « J'ai un code », qui est une
    // `.modal-overlay` déclarée dans la page. La feuille de style la met à
    // 100 000 ; `showModal` pose 9 999 EN LIGNE, et l'inline l'emporte sur la
    // classe. Le scanner se rangeait donc dessous.
    //
    // ON COMPARE LES DEUX NOMBRES, et non l'un à une constante écrite ici :
    // le jour où `.modal-overlay` monte, l'épreuve suivra.
    const CSS = lireFeuille(new URL('../css/components.css', import.meta.url));
    const voile = corpsDeLaRegle(CSS, '.modal-overlay', { ou: 'components.css' });
    const etageDesFenetres = Number(valeurDe(voile, 'z-index'));
    assert.ok(etageDesFenetres > 0, 'la feuille ne déclare plus d\'étage pour les fenêtres');

    const S = lire('js/ui/scannerQr.js');
    const m = /zIndex:\s*(\d+)/.exec(S);
    assert.ok(m, 'le scanner ne demande plus d\'étage : il retombera à 9 999, sous son appelant');
    assert.ok(Number(m[1]) > etageDesFenetres,
        `le scanner s'ouvre à ${m[1]} et les fenêtres de la page sont à `
        + `${etageDesFenetres} : il sera derrière, et tout aura pourtant l'air de marcher`);
});

test('LA CAMÉRA S\'ÉTEINT, ET LE BOUTON NE PARAÎT QUE S\'IL PEUT SERVIR', () => {
    // UNE DIODE ALLUMÉE SUR VINGT-CINQ TABLETTES n'est pas un défaut
    // technique, c'est un défaut de confiance — et il ne se voit pas depuis
    // le code, seulement depuis le fond de la salle. On garde les deux
    // morceaux : la fermeture appelle l'arrêt, et l'arrêt coupe les pistes.
    const S = lire('js/ui/scannerQr.js');
    assert.match(S, /onClose:\s*\(\)\s*=>\s*arreter\(\)/,
        'fermer la fenêtre n\'arrête plus la caméra');
    assert.match(S, /flux\.getTracks\(\)\.forEach\(p => p\.stop\(\)\)/,
        'les pistes du flux ne sont plus coupées une par une');

    // ET LE BOUTON NE MENT PAS. Hors contexte sécurisé, `getUserMedia`
    // n'existe PAS — le navigateur retire l'API, il ne refuse pas la
    // permission. Un bouton qui ouvre une fenêtre pour y annoncer
    // « impossible » est un bouton qu'il ne fallait pas montrer.
    const avecCadre = (cadre, faire) => {
        const anciens = { nav: globalThis.navigator, win: globalThis.window };
        Object.defineProperty(globalThis, 'navigator', {
            value: cadre.navigator, configurable: true, writable: true });
        globalThis.window = cadre.window;
        try { return faire(); } finally {
            Object.defineProperty(globalThis, 'navigator', {
                value: anciens.nav, configurable: true, writable: true });
            globalThis.window = anciens.win;
        }
    };
    const camera = { mediaDevices: { getUserMedia: () => {} } };
    assert.equal(avecCadre({ navigator: camera, window: { isSecureContext: true } },
        laCameraEstPossible), true, 'une tablette qui PEUT scanner est refusée');
    assert.equal(avecCadre({ navigator: camera, window: { isSecureContext: false } },
        laCameraEstPossible), false,
    'hors contexte sécurisé, le bouton paraîtrait pour rien');
    assert.equal(avecCadre({ navigator: {}, window: { isSecureContext: true } },
        laCameraEstPossible), false, 'sans caméra, le bouton paraîtrait pour rien');
});
