// LES AIRES ET LES VOLUMES DANS LE TABLEAU DE CONVERSION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième : « ← À voir 1 m = 100 cm,
// 1 m² = 100 dm² ». C'est là que les élèves se trompent le plus : ils
// appliquent au carré la règle du simple, et perdent un facteur dix par
// colonne.
//
// ── CE QUE LE MODÈLE A COÛTÉ, ET CE QU'IL N'A PAS COÛTÉ ────────────────────
//
// `core/conversion.js` portait en tête : « les aires et les volumes ne sont
// pas ici […] c'est un second tableau, pas un réglage ». C'était vrai de
// l'AFFICHAGE et faux du CALCUL. Le rang est une puissance de dix absolue : le
// décimètre carré vaut −2, le centimètre carré −4, et toute l'arithmétique du
// fichier tient sans une ligne de plus. Ce qui change, et seulement cela : une
// unité occupe `echelon` colonnes au lieu d'une.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// La distinction entre LES COLONNES et LES RANGS DES UNITÉS. En longueur les
// deux listes sont la même — et c'est précisément ce qui rend la confusion
// indétectable là-bas : tout passe au vert, et le jour où quelqu'un ajoute une
// famille à deux colonnes, la moitié des chiffres disparaît sans message.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    FAMILLES, colonnesDuTableau, echelonDe, uniteDeLaColonne,
    reponse, tientDansLeTableau, tirerConversion, chiffresDansLeTableau
} from '../js/core/conversion.js';
import { conversionFicheGenerator } from '../js/core/generators/conversionFiche.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('UNE UNITÉ COIFFE UNE, DEUX OU TROIS COLONNES', () => {
    assert.equal(echelonDe('longueur'), 1);
    assert.equal(echelonDe('aire'), 2);
    assert.equal(echelonDe('volume'), 3);
    // SEPT UNITÉS, QUATORZE COLONNES. Le km² est au rang 6, mais le tableau
    // monte jusqu'à la colonne 7 : c'est la colonne des dizaines de km².
    assert.deepEqual(colonnesDuTableau('longueur'), [3, 2, 1, 0, -1, -2, -3]);
    assert.equal(colonnesDuTableau('aire').length, 14);
    assert.equal(colonnesDuTableau('aire')[0], 7);
    assert.equal(colonnesDuTableau('volume').length, 12);
    // ET CHAQUE COLONNE SAIT QUI LA COIFFE.
    assert.equal(uniteDeLaColonne('aire', 7).symbole, 'km²');
    assert.equal(uniteDeLaColonne('aire', 6).symbole, 'km²');
    assert.equal(uniteDeLaColonne('aire', 0).symbole, 'm²');
    // ET LA COLONNE JUSTE EN DESSOUS APPARTIENT DÉJÀ À L'UNITÉ SUIVANTE.
    // Une unité de rang r occupe r…r+e−1 : le mètre carré prend 0 et 1, le
    // décimètre carré −2 et −1. J'avais écrit l'inverse dans cette épreuve,
    // et c'est l'épreuve qui avait tort — mais c'est exactement l'erreur d'un
    // cran qui ferait tomber chaque chiffre dans la colonne d'à côté.
    assert.equal(uniteDeLaColonne('aire', -1).symbole, 'dm²');
    assert.equal(uniteDeLaColonne('aire', -2).symbole, 'dm²');
    assert.equal(uniteDeLaColonne('volume', 2).symbole, 'm³');
    assert.equal(uniteDeLaColonne('volume', -1).symbole, 'dm³');
    assert.equal(uniteDeLaColonne('volume', -3).symbole, 'dm³');
});

test('ON PASSE D\'UNE UNITÉ À LA SUIVANTE EN MULTIPLIANT PAR CENT, PAS PAR DIX', () => {
    // LA PHRASE DE RÉMY, VÉRIFIÉE : 1 m = 100 cm et 1 m² = 100 dm².
    assert.equal(reponse(1, 'longueur', 'm', 'cm'), 100);
    assert.equal(reponse(1, 'aire', 'm²', 'dm²'), 100);
    assert.equal(reponse(1, 'aire', 'm²', 'cm²'), 10000);
    assert.equal(reponse(3.45, 'aire', 'm²', 'cm²'), 34500);
    assert.equal(reponse(1, 'volume', 'm³', 'dm³'), 1000);
    assert.equal(reponse(1, 'volume', 'm³', 'cm³'), 1000000);
    // ET DANS L'AUTRE SENS, la virgule descend de deux (ou trois) rangs.
    assert.equal(reponse(250, 'aire', 'cm²', 'dm²'), 2.5);
    assert.equal(reponse(32, 'aire', 'cm²', 'm²'), 0.0032);
});

test('CE QUI TIENT DANS LE TABLEAU SE MESURE SUR LES COLONNES', () => {
    // LE DÉFAUT QUE CE GARDE EXISTE POUR EMPÊCHER, et il est muet : si l'on
    // compare aux RANGS DES UNITÉS au lieu des colonnes, la colonne des
    // dizaines de km² (la 7) sort du tableau — et l'on écarte des tirages
    // parfaitement écrivables, un sur deux dans les grandes unités.
    //
    // 90 km² occupe les colonnes 7 et 6 : il tient, puisque le tableau monte
    // à 7. Le rang du km², lui, vaut 6.
    assert.deepEqual(
        chiffresDansLeTableau(90, 'aire', 'km²').map(c => c.colonne), [7, 6]);
    assert.equal(tientDansLeTableau(90, 'aire', 'km²', 'hm²'), true);
    // Et ce qui déborde VRAIMENT est refusé : 900 km² demanderait la colonne 8.
    assert.equal(tientDansLeTableau(900, 'aire', 'km²', 'hm²'), false);
});

test('LE TIRAGE NE PROPOSE JAMAIS CE QUI NE S\'ÉCRIT PAS', () => {
    // MESURÉ SUR DEUX CENTS TIRAGES PAR FAMILLE. C'est la même garantie que
    // pour les longueurs — Rémy : « quand tu proposes 18 km ça sort du tableau
    // (et on ne voit pas tout) » —, et elle vaut d'autant plus ici que le
    // tableau d'une aire est deux fois plus long.
    for (const famille of ['aire', 'volume']) {
        const rng = makeRng('aires-' + famille);
        for (let i = 0; i < 200; i++) {
            const c = tirerConversion({ rng, famille, ecart: 3 });
            assert.ok(tientDansLeTableau(c.valeur, famille, c.depart, c.arrivee),
                `${famille} : ${c.enonce} déborde du tableau`);
            assert.notEqual(c.depart, c.arrivee);
            assert.ok(Number.isFinite(c.attendu));
        }
    }
});

test('LA FICHE INDEXE LES CASES SUR LES COLONNES, PAS SUR LES UNITÉS', () => {
    // LE DÉFAUT MESURÉ : `findIndex(u => u.rang === rang)` rend −1 pour toute
    // colonne de DIZAINES — c'est-à-dire une case sur deux en aire. Le
    // générateur écarte ensuite les cases à −1 : la moitié des chiffres du
    // corrigé disparaissait, sans un message.
    const it = conversionFicheGenerator.generate(
        { famille: 'aire', lignes: 6, ecart: 2 }, { rng: makeRng('fiche-aire') });
    assert.equal(it.meta.echelon, 2);
    assert.equal(it.meta.nColonnes, 14);
    assert.equal(it.meta.unites.length, 7);
    assert.ok(it.meta.conversions.length >= 3);
    for (const cv of it.meta.conversions) {
        assert.ok(cv.cases.length >= 2, `${cv.enonce} n'a qu'une case`);
        for (const c of cv.cases) {
            assert.ok(c.col >= 0 && c.col < 14,
                `${cv.enonce} : case hors du tableau (${c.col})`);
        }
        // LES CASES SONT CONSÉCUTIVES : un nombre s'écrit d'un seul tenant.
        const cols = cv.cases.map(c => c.col).sort((a, b) => a - b);
        assert.equal(cols[cols.length - 1] - cols[0], cols.length - 1,
            `${cv.enonce} : les chiffres ne se suivent pas`);
        assert.ok(cv.virguleApres >= 0 && cv.virguleApres < 14);
    }
});

test('LE TABLEAU DESSINE `echelon` CASES PAR UNITÉ, À L\'ÉCRAN COMME SUR LA FEUILLE', () => {
    // CES DEUX LIGNES SONT TOUT CE QUI SÉPARE un tableau d'aires juste d'un
    // tableau qui montre sept colonnes là où il en faut quatorze — et qui
    // placerait donc chaque chiffre une colonne trop à gauche.
    const J = sansCommentaires(lire('js/games/conversion.js'));
    assert.match(J, /for \(let k = e - 1; k >= 0; k--\)/,
        'le jeu ne dessine plus qu\'une case par unité');
    assert.match(J, /if \(e > 1\) th\.colSpan = e;/,
        'l\'étiquette d\'unité ne coiffe plus ses colonnes');
    const N = sansCommentaires(lire('js/ui/fiches/nombres.js'));
    assert.match(N, /const nCol = m\.unites\.length \* ech;/,
        'la feuille compte une colonne par unité : les chiffres du corrigé '
        + 'tomberont tous à côté');
});

test('UN TABLEAU LARGE S\'IMPRIME SEUL SUR SA RANGÉE', () => {
    // MESURÉ DANS LA GÉOMÉTRIE : à deux blocs de front, le bloc fait 93 mm,
    // l'énoncé en prend 26 au plancher, et il reste 4,6 mm par case pour les
    // quatorze colonnes d'une aire. On n'écrit pas un chiffre à la main dans
    // 4,6 mm. Seul sur sa rangée : 190 mm de bloc, 9,4 mm de case.
    const N = lire('js/ui/fiches/nombres.js');
    assert.match(N, /parLigneDefaut: \(items, exo\) => \(tableauLarge\(items, exo\) \? 1 : 2\)/);
    assert.match(N, /function tableauLarge\(items, exo\)/);
    // ET LE RENDU A LE DROIT DE RÉPONDRE PAR UNE FONCTION : sans ce passage,
    // `parLigneDefaut` rendait la fonction elle-même, `> 0` était faux, et la
    // mise en page retombait sur un défaut qui n'a rien à voir.
    const D = sansCommentaires(lire('js/core/dispositionFiche.js'));
    assert.match(D, /typeof v === 'function' \? v\(items \|\| \[\], exo \|\| null\) : v/);
});
