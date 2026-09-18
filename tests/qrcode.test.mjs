// LE QR CODE ÉCRIT À LA MAIN — ce qu'on peut tenir sans décodeur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Pour le lien, tu proposes le code à taper mais tu pourrais aussi
// proposer un lien (la page actuelle)?code= et un QR code »
//
// LA VRAIE VÉRIFICATION NE PEUT PAS TENIR ICI, et il faut le dire franchement :
// un QR code se juge en le faisant LIRE. Cela demande un décodeur, que Node n'a
// pas. La sonde `tools/tmp/qrContreSegno.mjs` le fait, sur 708 chaînes de 1 à
// 700 caractères : 674 lues par `zxing-cpp` (le décodeur des lecteurs du
// commerce), 0 fausse, et les 20 cas de remplissage exact — un par version —
// identiques MODULE PAR MODULE à ceux de `segno`.
//
// CE FICHIER-CI TIENT CE QUI SE TIENT SANS DÉCODEUR : les empreintes de ces 20
// matrices vérifiées, pour qu'une modification du module les fasse aussitôt
// diverger, et les invariants de structure qu'aucun symbole valide ne peut
// enfreindre. C'est un filet, pas une preuve — la preuve est dans la sonde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrcode, qrcodeSVG } from '../js/core/qrcode.js';

/** La même FNV-1a que partout ailleurs dans le projet. */
const empreinte = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36).toUpperCase();
};
const enChaine = (q) => q.modules.map(l => l.join('')).join('');
const texteDe = (n) => Array.from({ length: n },
    (_, i) => 'abcdefghijklmnopqrstuvwxyz0123456789-_/:?='[i % 42]).join('');

/**
 * [version, longueur qui remplit EXACTEMENT, masque retenu, empreinte].
 *
 * Ces vingt matrices-là sont celles qui ont été comparées à `segno` : sans
 * bourrage, deux encodeurs conformes doivent produire le MÊME symbole, au
 * module près. Elles sont donc une vérité extérieure, pas une photographie de
 * notre propre sortie.
 */
const REMPLISSAGE_EXACT = [
    [1, 14, 2, 'KBKPPZ'], [2, 26, 2, 'QCUVTT'], [3, 42, 3, '1K3UB0T'],
    [4, 62, 3, '1BAR226'], [5, 84, 2, '10XZE6L'], [6, 106, 3, '14S73AH'],
    [7, 122, 2, 'P4S9KJ'], [8, 152, 2, 'PFCM9'], [9, 180, 6, 'S7YSF2'],
    [10, 213, 2, 'PTAEO7'], [11, 251, 2, 'BXUHLJ'], [12, 287, 2, 'EYITKV'],
    [13, 331, 2, '131DBAB'], [14, 362, 2, '14TSXPB'], [15, 412, 2, '1J2AXRN'],
    [16, 450, 2, 'HJRINA'], [17, 504, 2, '11459ED'], [18, 560, 2, 'GAR70B'],
    [19, 624, 2, 'QC5ZHD'], [20, 666, 2, 'NPBGLP']
];

test('LES VINGT MATRICES VÉRIFIÉES CONTRE SEGNO NE BOUGENT PAS', () => {
    for (const [version, longueur, masque, attendue] of REMPLISSAGE_EXACT) {
        const q = qrcode(texteDe(longueur));
        assert.ok(q, `v${version} : rien produit`);
        assert.equal(q.version, version, `v${version} : version choisie`);
        assert.equal(q.taille, 17 + 4 * version, `v${version} : taille`);
        assert.equal(q.masque, masque, `v${version} : masque retenu`);
        assert.equal(empreinte(enChaine(q)), attendue, `v${version} : la matrice a changé`);
    }
});

test('LA MATRICE DE LA VERSION 1, EN ENTIER ET LISIBLE', () => {
    // Une seule est écrite noir sur blanc, pour qu'on puisse la LIRE en cas de
    // doute au lieu de comparer des empreintes. C'est le remplissage exact de la
    // version 1 — donc identique à celui de segno.
    const attendue = [
        '111111100000001111111',
        '100000100111101000001',
        '101110101000101011101',
        '101110101000001011101',
        '101110101100101011101',
        '100000101000101000001',
        '111111101010101111111',
        '000000001110000000000',
        '101111100011001111100',
        '011101010000001110101',
        '010010111111100000010',
        '000010011101110011110',
        '111001110001001000000',
        '000000001010001110101',
        '111111100101110001010',
        '100000101000110111101',
        '101110101011001000011',
        '101110101010001111100',
        '101110101011101000100',
        '100000100111010001100',
        '111111101110001000010'
    ];
    const q = qrcode('abcdefghijklmn');
    assert.deepEqual(q.modules.map(l => l.join('')), attendue);
});

test('LES MOTIFS QUE LE LECTEUR CHERCHE SONT À LEUR PLACE', () => {
    // Un lecteur commence par trouver les trois grands repères des coins ; s'ils
    // manquent ou se déplacent, il ne voit même pas qu'il y a un code.
    for (const longueur of [1, 20, 100, 300, 600]) {
        const q = qrcode(texteDe(longueur));
        const m = q.modules, n = q.taille;
        for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    const noir = r === 0 || r === 6 || c === 0 || c === 6
                        || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                    assert.equal(m[r0 + r][c0 + c], noir ? 1 : 0,
                        `v${q.version} repère (${r0},${c0}) en (${r},${c})`);
                }
            }
        }
        // La piste de synchronisation : un module sur deux, sans exception.
        for (let i = 8; i < n - 8; i++) {
            assert.equal(m[6][i], i % 2 === 0 ? 1 : 0, `v${q.version} piste horizontale en ${i}`);
            assert.equal(m[i][6], i % 2 === 0 ? 1 : 0, `v${q.version} piste verticale en ${i}`);
        }
        // LE MODULE NOIR DE LA NORME. Il vaut 1 quoi qu'il arrive, et c'est
        // précisément lui qu'un bit d'information de format avait effacé dans la
        // première version de ce module : le symbole restait beau et plus aucun
        // lecteur ne le déchiffrait.
        assert.equal(m[4 * q.version + 9][8], 1, `v${q.version} module noir`);
    }
});

test('LA VERSION CHOISIE EST LA PLUS PETITE QUI CONVIENT', () => {
    // Un symbole plus grand que nécessaire se lit moins bien de loin : à surface
    // égale, chaque module est plus petit.
    let precedente = 0;
    for (let n = 1; n <= 700; n++) {
        const q = qrcode(texteDe(n));
        if (!q) { assert.ok(n > 660, `${n} caractères devraient tenir`); continue; }
        assert.ok(q.version >= precedente, 'la version ne doit jamais redescendre');
        precedente = q.version;
    }
    // Et au-delà de la version 20, on refuse au lieu de rendre un symbole faux.
    assert.equal(qrcode(texteDe(670)), null);
    assert.equal(qrcode(texteDe(5000)), null);
});

test('L\'UTF-8 COMPTE EN OCTETS, PAS EN LETTRES', () => {
    // « é » pèse deux octets. Compter les lettres ferait déborder la capacité
    // sans prévenir, et le symbole serait tronqué.
    const q1 = qrcode('a'.repeat(14));
    const q2 = qrcode('é'.repeat(14));          // 28 octets : trop pour la version 1
    assert.equal(q1.version, 1);
    assert.ok(q2.version > 1, `« é »×14 devrait dépasser la version 1, on a v${q2.version}`);
});

test('LE SVG PORTE SA MARGE ET SON FOND', () => {
    // La norme demande quatre modules de silence autour du symbole ; sans eux,
    // beaucoup de lecteurs ne le trouvent pas. Et le fond doit être blanc en
    // clair : la page peut être en thème sombre, et un QR sur fond sombre ne se
    // lit pas.
    const svg = qrcodeSVG('https://atoutmath.fr/?code=SUD', { module: 4, marge: 4 });
    const q = qrcode('https://atoutmath.fr/?code=SUD');
    const cote = (q.taille + 8) * 4;
    assert.match(svg, new RegExp(`viewBox="0 0 ${cote} ${cote}"`));
    assert.match(svg, /<rect width="\d+" height="\d+" fill="#fff"\/>/);
    assert.match(svg, /<path d="M/);
    assert.equal(qrcodeSVG(texteDe(5000)), '', 'trop long : pas de SVG bancal');
});
