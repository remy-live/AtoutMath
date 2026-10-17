// CE QU'ON PROPOSE DOIT POUVOIR S'ÉCRIRE DANS LE TABLEAU.
//
// RÉMY : « dans le tableau de conversion, quand tu proposes 18km ça sort du
// tableau (et on ne voit pas tout) ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MESURÉ AVANT DE CORRIGER, sur 400 tirages par famille : 81 débordaient en
// longueur et en masse, 91 en contenances ; avec les décimales, 100 et 116.
// Un tirage sur cinq, et jusqu'à un sur quatre.
//
// CE QUE ÇA DONNAIT À L'ÉCRAN, mesuré aussi : pour « 187 km = ……… m », le
// tableau affichait « 7 ». Un chiffre sur trois, et rien pour dire que les
// deux autres étaient tombés hors du tableau — ni message, ni marque, ni
// moyen de s'en douter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ON N'ÉLARGIT PAS LE TABLEAU, ON ÉCARTE LE TIRAGE. Un tableau de conversion a
// sept colonnes parce que le système décimal en a sept ; y ajouter une colonne
// pour loger 187 km inventerait une unité qui n'existe pas. Et rapetisser les
// nombres donnerait des conversions toujours timides. Le générateur tire déjà
// deux cents fois avant d'abandonner : il peut se permettre de retirer.
//
// CE QUE CES ÉPREUVES GARDENT, et qui ne se voit pas à l'œil :
//
//   · qu'AUCUN tirage ne déborde, dans les trois familles, avec et sans
//     décimales, pour tous les écarts ;
//   · que le tirage ne se soit pas APPAUVRI en échange — une règle qui écarte
//     peut vider le chapeau, et l'on s'en aperçoit trois semaines plus tard
//     quand les élèves voient six fois la même conversion.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    FAMILLES, familleDe, tirerConversion, chiffresDansLeTableau, convertir,
    tientDansLeTableau
} from '../js/core/conversion.js';

const FAMILLES_NOMMEES = Object.keys(FAMILLES);

/** Les colonnes réellement dessinées pour une famille. */
function bornes(famille) {
    const rangs = familleDe(famille).unites.map(u => u.rang);
    return { haut: Math.max(...rangs), bas: Math.min(...rangs) };
}

// ────────────────────────────────────────────── LA RÈGLE, SEULE ─────────────

test('UN NOMBRE QUI N\'A PAS DE COLONNE NE TIENT PAS', () => {
    // 187 km occupe les colonnes 5, 4 et 3 ; le tableau s'arrête à km, qui est
    // la colonne 3. C'est le cas exact que Rémy a vu.
    assert.equal(tientDansLeTableau(187, 'longueur', 'km', 'm'), false);
    assert.equal(tientDansLeTableau(18, 'longueur', 'km', 'm'), false);
    // Le même nombre, posé plus bas, tient parfaitement.
    assert.equal(tientDansLeTableau(187, 'longueur', 'dam', 'm'), true);
    assert.equal(tientDansLeTableau(18, 'longueur', 'hm', 'm'), true);
});

test('LES DÉCIMALES DÉBORDENT PAR LA DROITE, ET ÇA COMPTE AUSSI', () => {
    // 1,87 mm : les décimales demandent deux colonnes sous mm, qui est la
    // dernière. Le même nombre posé plus haut tient.
    assert.equal(tientDansLeTableau(1.87, 'longueur', 'mm', 'cm'), false);
    assert.equal(tientDansLeTableau(1.87, 'longueur', 'cm', 'm'), false);
    assert.equal(tientDansLeTableau(1.87, 'longueur', 'dm', 'm'), true);
    assert.equal(tientDansLeTableau(187, 'longueur', 'mm', 'cm'), true);
});

test('LA COLONNE DE LA VIRGULE EST TOUJOURS DANS LE TABLEAU', () => {
    // CE N'EST PAS UNE ÉVIDENCE, C'EST LA RAISON POUR LAQUELLE UNE SEULE
    // VÉRIFICATION SUFFIT. J'avais écrit une seconde garde sur l'étendue
    // ÉCRITE — virgule et zéros de comblement —, croyant qu'elle pouvait
    // déborder là où les chiffres tiennent. `epreuveTombe.mjs` a refusé
    // l'épreuve : elle restait verte sans cette seconde garde. La virgule se
    // pose après la colonne de l'unité DEMANDÉE, qui est une unité de la
    // famille : elle est donc toujours dessinée. Si cela changeait un jour, ce
    // qui suit tomberait, et `tientDansLeTableau` redeviendrait trop faible.
    for (const famille of FAMILLES_NOMMEES) {
        const { haut, bas } = bornes(famille);
        const f = familleDe(famille);
        for (const uD of f.unites) {
            for (const uA of f.unites) {
                if (uA === uD) continue;
                const c = convertir(345, famille, uD.symbole, uA.symbole);
                assert.ok(c.colonneVirgule <= haut && c.colonneVirgule >= bas,
                    `${famille} ${uD.symbole}→${uA.symbole} : virgule en ${c.colonneVirgule}`);
            }
        }
    }
});

test('une unité inconnue ne tient nulle part', () => {
    assert.equal(tientDansLeTableau(12, 'longueur', 'parsec', 'm'), false);
    assert.equal(tientDansLeTableau(12, 'longueur', 'm', 'parsec'), false);
});

// ──────────────────────────────────────── LE TIRAGE, SUR LA DURÉE ───────────

test('AUCUN TIRAGE NE SORT DU TABLEAU — trois familles, tous les écarts', () => {
    // C'est l'épreuve qui garde la correction. Avant elle : 81 à 116 tirages
    // sur 400 débordaient.
    for (const famille of FAMILLES_NOMMEES) {
        const { haut, bas } = bornes(famille);
        for (const ecart of [1, 2, 3, 6]) {
            for (const decimales of [false, true]) {
                for (let seed = 1; seed <= 150; seed++) {
                    const ex = tirerConversion({
                        rng: makeRng(`t${seed}`), famille, ecart, decimales
                    });
                    const ou = `${famille} écart=${ecart} déc=${decimales} graine=${seed} : ${ex.enonce}`;
                    const cols = chiffresDansLeTableau(ex.valeur, famille, ex.depart)
                        .map(p => p.colonne);
                    assert.ok(Math.max(...cols) <= haut, `déborde à gauche — ${ou}`);
                    assert.ok(Math.min(...cols) >= bas, `déborde à droite — ${ou}`);
                    // ET LA LECTURE AUSSI : la virgule et les zéros s'écrivent.
                    const c = convertir(ex.valeur, famille, ex.depart, ex.arrivee);
                    assert.ok(c.colonneHaute <= haut, `la lecture déborde à gauche — ${ou}`);
                    assert.ok(c.colonneBasse >= bas, `la lecture déborde à droite — ${ou}`);
                }
            }
        }
    }
});

test('LE CHAPEAU NE S\'EST PAS VIDÉ EN ÉCHANGE', () => {
    // UNE RÈGLE QUI ÉCARTE PEUT TOUT ÉCARTER, et le générateur a un filet qui
    // rend toujours la même conversion : « 1 km = ……… hm ». Si la règle était
    // trop serrée, les élèves verraient cette ligne-là six fois de suite, et
    // l'on ne s'en apercevrait qu'en classe.
    const f = familleDe('longueur');
    const enonces = new Set(), couples = new Set();
    let filet = 0;
    for (let seed = 1; seed <= 300; seed++) {
        const ex = tirerConversion({ rng: makeRng(`v${seed}`), famille: 'longueur', ecart: 3 });
        enonces.add(ex.enonce);
        couples.add(`${ex.depart}→${ex.arrivee}`);
        if (ex.valeur === 1 && ex.depart === f.unites[0].symbole
            && ex.arrivee === f.unites[1].symbole) filet++;
    }
    assert.ok(enonces.size > 240, `${enonces.size} énoncés distincts sur 300 tirages`);
    assert.ok(couples.size >= 12, `${couples.size} couples d'unités`);
    assert.ok(filet <= 3, `le filet de secours a servi ${filet} fois sur 300`);
});

test('les conversions les plus serrées restent possibles', () => {
    // Un écart de 1 ne laisse qu'un pas entre les deux unités : c'est le
    // réglage d'une classe de sixième, et c'est celui qui souffrirait le plus
    // d'une règle trop stricte.
    for (const famille of FAMILLES_NOMMEES) {
        const couples = new Set();
        for (let seed = 1; seed <= 200; seed++) {
            const ex = tirerConversion({ rng: makeRng(`e${seed}`), famille, ecart: 1 });
            couples.add(`${ex.depart}→${ex.arrivee}`);
        }
        assert.ok(couples.size >= 6, `${famille} : seulement ${couples.size} couples à l'écart 1`);
    }
});

test('le tirage reste reproductible à graine égale', () => {
    // Deux élèves sur la même séance doivent voir la même conversion : c'est
    // ce qui permet d'en parler au tableau.
    const a = tirerConversion({ rng: makeRng('pareil'), famille: 'masse', ecart: 3 });
    const b = tirerConversion({ rng: makeRng('pareil'), famille: 'masse', ecart: 3 });
    assert.equal(a.enonce, b.enonce);
    assert.equal(a.attendu, b.attendu);
});
