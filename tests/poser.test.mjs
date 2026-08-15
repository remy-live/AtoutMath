import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    decimales, chiffreAuRang, rangsDe, placementAttendu, etendue,
    colonnesAddition, colonnesSoustraction, colonnesMultiplication, poser,
    lignesMultiplication, colonnesDivision, apercuPose, verifierPose,
    verifierPlacement, attenduEn, premierRang, rangSuivant
} from '../js/core/poser.js';

// --- Les rangs -------------------------------------------------------------------

test('le rang, pas la colonne : les unités valent toujours zéro', () => {
    assert.equal(decimales(324.5), 1);
    assert.equal(decimales(12), 0);
    assert.equal(decimales(3.14), 2);

    // 324,5 : le 4 est aux unités (rang 0), le 5 aux dixièmes (rang −1).
    assert.equal(chiffreAuRang(324.5, 2), 3);
    assert.equal(chiffreAuRang(324.5, 1), 2);
    assert.equal(chiffreAuRang(324.5, 0), 4);
    assert.equal(chiffreAuRang(324.5, -1), 5);

    assert.deepEqual(rangsDe(324.5), [2, 1, 0, -1]);
    assert.deepEqual(rangsDe(12.4), [1, 0, -1]);
    assert.deepEqual(rangsDe(7), [0]);
    assert.deepEqual(rangsDe(0), [0]);
});

test('l\'exemple de la demande : 324,5 et 12,4 s\'alignent sur la virgule', () => {
    const p = placementAttendu([324.5, 12.4]);
    // Le 4 de 324,5 et le 2 de 12,4 sont tous deux aux unités : l'un sous
    // l'autre. C'est cela qu'un élève rate quand il colle à droite.
    assert.deepEqual(p[0].chiffres, [
        { rang: 2, chiffre: 3 }, { rang: 1, chiffre: 2 },
        { rang: 0, chiffre: 4 }, { rang: -1, chiffre: 5 }
    ]);
    assert.deepEqual(p[1].chiffres, [
        { rang: 1, chiffre: 1 }, { rang: 0, chiffre: 2 }, { rang: -1, chiffre: 4 }
    ]);
});

test('l\'étendue couvre tout ce qui s\'écrit, résultat compris', () => {
    // 95 + 8 = 103 : le résultat déborde d'un rang vers la gauche.
    const e = etendue([95, 8], 103);
    assert.deepEqual(e.rangs, [2, 1, 0]);
    assert.equal(e.virgule, false);
    const d = etendue([324.5, 12.4], 336.9);
    assert.deepEqual(d.rangs, [2, 1, 0, -1]);
    assert.equal(d.virgule, true);
});

// --- L'addition ---------------------------------------------------------------------

test('une addition décimale : les colonnes, les retenues, le résultat', () => {
    const t = colonnesAddition([324.5, 12.4]);
    assert.equal(t.resultat, 336.9);
    // Les colonnes vont du rang le plus faible au plus fort — l'ordre du calcul.
    assert.deepEqual(t.colonnes.map(c => c.rang), [-1, 0, 1, 2]);
    assert.deepEqual(t.colonnes.map(c => c.resultat), [9, 6, 3, 3]);
    assert.deepEqual(t.colonnes.map(c => c.retenueSortante), [0, 0, 0, 0]);
});

test('la retenue s\'écrit au-dessus de la colonne suivante', () => {
    // 27 + 15 = 42 : 7 + 5 = 12, on pose 2 et l'on retient 1.
    const t = colonnesAddition([27, 15]);
    assert.equal(t.resultat, 42);
    const unites = t.colonnes[0], dizaines = t.colonnes[1];
    assert.equal(unites.rang, 0);
    assert.equal(unites.total, 12);
    assert.equal(unites.resultat, 2);
    assert.equal(unites.retenueSortante, 1);
    // Et c'est bien celle qu'on lit AU-DESSUS des dizaines.
    assert.equal(dizaines.retenueEntrante, 1);
    assert.equal(dizaines.resultat, 4);
});

test('à deux nombres la retenue vaut 0 ou 1, à trois elle peut valoir 2', () => {
    // C'est exactement la distinction demandée pour les petits ronds.
    for (let i = 0; i < 300; i++) {
        const a = 1 + (i * 37) % 900, b = 1 + (i * 53) % 900;
        assert.ok(colonnesAddition([a, b]).retenueMax <= 1, `${a} + ${b}`);
    }
    const trois = colonnesAddition([9, 9, 9]);
    assert.equal(trois.resultat, 27);
    assert.equal(trois.colonnes[0].total, 27);
    assert.equal(trois.colonnes[0].retenueSortante, 2, 'trois neufs retiennent 2');
    assert.equal(trois.retenueMax, 2);
});

test('l\'addition tombe juste, sur mille tirages, décimales comprises', () => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.round(((i * 7.3) % 900 + 0.5) * 10) / 10;
        const b = Math.round(((i * 11.7) % 400 + 0.5) * 10) / 10;
        const t = colonnesAddition([a, b]);
        assert.ok(Math.abs(t.resultat - (a + b)) < 1e-9, `${a} + ${b} = ${t.resultat}`);
        // Et les chiffres des colonnes recomposent bien le résultat.
        assert.ok(Math.abs(recomposer(t.colonnes) - t.resultat) < 1e-9,
            `les colonnes de ${a} + ${b} ne recomposent pas ${t.resultat}`);
    }
});

/** Reconstruit le nombre écrit par les chiffres de résultat des colonnes. */
function recomposer(colonnes) {
    return colonnes.reduce((s, c) => s + c.resultat * Math.pow(10, c.rang), 0);
}

// --- La soustraction --------------------------------------------------------------------

test('la retenue de soustraction se note EN BAS, contre le soustracteur', () => {
    // 52 − 27 : aux unités 2 < 7, on emprunte. Méthode française : on ajoute
    // dix en haut ET un au chiffre du bas de la colonne des dizaines.
    const t = colonnesSoustraction(52, 27);
    assert.equal(t.resultat, 25);
    const unites = t.colonnes[0], dizaines = t.colonnes[1];
    assert.equal(unites.emprunte, true);
    assert.equal(unites.resultat, 5, '12 − 7 = 5');
    assert.equal(unites.retenueSortante, 1);
    // LA RETENUE EST PORTÉE PAR LA COLONNE DES DIZAINES, côté bas.
    assert.equal(dizaines.retenueBas, 1);
    assert.equal(dizaines.resultat, 2, '5 − (2 + 1) = 2');
    // Et jamais de retenue « en haut » comme à l'addition.
    assert.equal(dizaines.retenueEntrante, undefined);
});

test('une soustraction décimale s\'aligne aussi sur la virgule', () => {
    const t = colonnesSoustraction(324.5, 12.4);
    assert.equal(t.resultat, 312.1);
    assert.deepEqual(t.colonnes.map(c => c.rang), [-1, 0, 1, 2]);
    assert.deepEqual(t.colonnes.map(c => c.resultat), [1, 2, 1, 3]);
});

test('la soustraction tombe juste, sur mille tirages', () => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.round(((i * 13.1) % 900 + 100.5) * 10) / 10;
        const b = Math.round(((i * 7.9) % 90 + 1.4) * 10) / 10;
        const t = colonnesSoustraction(a, b);
        assert.ok(Math.abs(t.resultat - (a - b)) < 1e-9, `${a} − ${b} = ${t.resultat}`);
        assert.ok(Math.abs(recomposer(t.colonnes) - t.resultat) < 1e-9,
            `les colonnes de ${a} − ${b} ne recomposent pas ${t.resultat}`);
        // Un chiffre de résultat est toujours un chiffre.
        t.colonnes.forEach(c => assert.ok(c.resultat >= 0 && c.resultat <= 9,
            `${a} − ${b} : chiffre ${c.resultat} au rang ${c.rang}`));
    }
});

test('une soustraction où l\'emprunt se propage', () => {
    // 1000 − 1 : l'emprunt traverse toute la ligne.
    const t = colonnesSoustraction(1000, 1);
    assert.equal(t.resultat, 999);
    assert.deepEqual(t.colonnes.map(c => c.resultat), [9, 9, 9, 0]);
    assert.deepEqual(t.colonnes.map(c => c.retenueBas), [0, 1, 1, 1]);
});

// --- La multiplication ---------------------------------------------------------------------

test('la multiplication : un produit partiel par chiffre, décalé', () => {
    const t = colonnesMultiplication(123, 45);
    assert.equal(t.resultat, 5535);
    assert.equal(t.partiels.length, 2);
    // Le chiffre des unités du multiplicateur d'abord, sans décalage.
    assert.deepEqual(t.partiels[0], { chiffre: 5, decalage: 0, valeur: 615, pose: 615 });
    assert.deepEqual(t.partiels[1], { chiffre: 4, decalage: 1, valeur: 492, pose: 4920 });
    assert.equal(t.partiels[0].pose + t.partiels[1].pose, 5535);
    assert.equal(t.simple, false);
});

test('la virgule du produit se compte, elle ne s\'aligne pas', () => {
    // C'EST LA DIFFICULTÉ PROPRE À LA MULTIPLICATION DÉCIMALE : on multiplie
    // comme si les virgules n'existaient pas, puis on en compte le total.
    const t = colonnesMultiplication(1.2, 0.3);
    assert.deepEqual(t.entiers, [12, 3]);
    assert.equal(t.decimales, 2, 'une décimale plus une décimale');
    assert.equal(t.produitEntier, 36);
    assert.ok(Math.abs(t.resultat - 0.36) < 1e-9);
    assert.equal(t.simple, true, 'un seul chiffre au multiplicateur : pas d\'addition à poser');
});

test('la multiplication tombe juste, sur mille tirages', () => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.round(((i * 3.7) % 200 + 1.3) * 10) / 10;
        const b = 2 + (i % 97);
        const t = colonnesMultiplication(a, b);
        assert.ok(Math.abs(t.resultat - a * b) < 1e-6, `${a} × ${b} = ${t.resultat}`);
        assert.equal(t.partiels.reduce((s, p) => s + p.pose, 0), t.produitEntier);
    }
});

// --- L'alignement, qui est la moitié de l'exercice --------------------------------------------

test('un alignement juste est accepté', () => {
    const bon = [
        [{ rang: 2, chiffre: 3 }, { rang: 1, chiffre: 2 }, { rang: 0, chiffre: 4 }, { rang: -1, chiffre: 5 }],
        [{ rang: 1, chiffre: 1 }, { rang: 0, chiffre: 2 }, { rang: -1, chiffre: 4 }]
    ];
    assert.deepEqual(verifierPlacement([324.5, 12.4], bon), { ok: true, fautes: [] });
});

test('L\'ERREUR CLASSIQUE : coller les nombres à droite est refusée', () => {
    // L'élève pose 12,4 décalé d'un rang — le 4 sous le 5 au lieu du 2 sous le 4.
    const colleADroite = [
        [{ rang: 2, chiffre: 3 }, { rang: 1, chiffre: 2 }, { rang: 0, chiffre: 4 }, { rang: -1, chiffre: 5 }],
        [{ rang: 2, chiffre: 1 }, { rang: 1, chiffre: 2 }, { rang: 0, chiffre: 4 }]
    ];
    const v = verifierPlacement([324.5, 12.4], colleADroite);
    assert.equal(v.ok, false);
    // On sait dire QUELS chiffres manquent à leur rang, pour le montrer.
    assert.ok(v.fautes.some(f => f.operande === 1 && f.rang === -1 && f.chiffre === 4),
        'le 4 des dixièmes n\'est pas signalé manquant');
    assert.ok(v.fautes.some(f => f.enTrop), 'aucun chiffre signalé en trop');
});

test('un chiffre oublié est signalé, un chiffre en trop aussi', () => {
    const oubli = [[{ rang: 1, chiffre: 2 }], [{ rang: 0, chiffre: 3 }]];
    const v = verifierPlacement([25, 3], oubli);
    assert.equal(v.ok, false);
    assert.ok(v.fautes.some(f => f.operande === 0 && f.rang === 0 && f.chiffre === 5));
});

// --- La correction au fil de l'eau ---------------------------------------------------------

test('on sait dire ce qu\'attend chaque case, résultat comme retenue', () => {
    const t = poser('+', [27, 15]);
    assert.equal(attenduEn(t, 0, 'resultat'), 2);
    assert.equal(attenduEn(t, 1, 'resultat'), 4);
    assert.equal(attenduEn(t, 1, 'retenue'), 1, 'la retenue se lit sur les dizaines');
    assert.equal(attenduEn(t, 0, 'retenue'), 0);
    assert.equal(attenduEn(t, 9, 'resultat'), null, 'pas de colonne à ce rang');

    const s = poser('-', [52, 27]);
    assert.equal(attenduEn(s, 0, 'resultat'), 5);
    assert.equal(attenduEn(s, 1, 'retenue'), 1, 'la retenue du bas, sur les dizaines');
});

test('l\'ordre de calcul va des unités vers la gauche', () => {
    const t = poser('+', [324.5, 12.4]);
    // On commence par le rang le plus faible : les dixièmes.
    assert.equal(premierRang(t), -1);
    assert.equal(rangSuivant(t, -1), 0);
    assert.equal(rangSuivant(t, 0), 1);
    assert.equal(rangSuivant(t, 1), 2);
    assert.equal(rangSuivant(t, 2), null, 'l\'opération est finie');
});

test('« poser » aiguille vers la bonne opération, et refuse l\'inconnue', () => {
    assert.equal(poser('+', [2, 3]).operation, '+');
    assert.equal(poser('-', [5, 3]).operation, '-');
    assert.equal(poser('×', [5, 3]).operation, '×');
    assert.equal(poser('÷', [6, 3]).operation, '÷');
    assert.throws(() => poser('^', [6, 3]), /opération inconnue/);
});

test('une soustraction négative est refusée, pas maquillée', () => {
    // Sans ce refus, 27 − 52 rendait des colonnes prises en valeur absolue :
    // un tableau d'apparence normale, entièrement faux.
    assert.throws(() => colonnesSoustraction(27, 52), /impossible à poser/);
    assert.throws(() => poser('-', [12.4, 324.5]), /impossible à poser/);
    // Et l'égalité passe : 52 − 52 = 0 se pose très bien.
    assert.equal(colonnesSoustraction(52, 52).resultat, 0);
});

// --- La multiplication, ligne à ligne ------------------------------------------------

test('chaque ligne de produit partiel s\'écrit chiffre par chiffre, retenues comprises', () => {
    const m = lignesMultiplication(347, 26);
    assert.equal(m.resultat, 9022);
    assert.equal(m.lignes.length, 2);

    // 347 × 6 : 7×6 = 42 → j'écris 2, je retiens 4 ; 4×6 + 4 = 28 → 8, retenue 2 ;
    // 3×6 + 2 = 20 → 0, retenue 2 ; puis la retenue seule : 2.
    const l6 = m.lignes[0];
    assert.equal(l6.chiffre, 6);
    assert.equal(l6.decalage, 0);
    assert.deepEqual(l6.cases.map(c => c.chiffre), [2, 8, 0, 2]);
    assert.deepEqual(l6.cases.map(c => c.position), [0, 1, 2, 3]);
    assert.deepEqual(l6.cases.map(c => c.retenueEntrante), [0, 4, 2, 2]);
    // LA RETENUE FINALE N'A PAS DE CHIFFRE EN FACE : c'est ce qu'on oublie.
    assert.equal(l6.cases[3].chiffreA, null);

    // La deuxième ligne est DÉCALÉE d'un rang : 347 × 2 s'écrit à partir des dizaines.
    const l2 = m.lignes[1];
    assert.equal(l2.decalage, 1);
    assert.equal(l2.cases[0].position, 1);
    assert.equal(l2.pose, 6940);
});

test('la retenue de la multiplication s\'ajoute APRÈS le produit, pas avant', () => {
    // 25 × 4 : 5×4 = 20 → 0 retenue 2 ; puis 2×4 = 8, PLUS 2 = 10.
    // Un élève qui ajoute la retenue au chiffre écrirait (2+2)×4 = 16 : faux.
    const m = lignesMultiplication(25, 4);
    const c = m.lignes[0].cases;
    assert.equal(c[0].chiffre, 0);
    assert.equal(c[1].total, 10, '2 × 4 + 2 = 10, et non (2 + 2) × 4');
    assert.equal(m.resultat, 100);
});

test('les décimales du produit sont celles des deux facteurs réunies', () => {
    const m = lignesMultiplication(3.4, 1.2);
    assert.deepEqual(m.entiers, [34, 12]);
    assert.equal(m.decimales, 2);
    assert.equal(m.resultat, 4.08);
    // On multiplie 34 par 12 : les lignes ne connaissent aucune virgule.
    assert.equal(m.produitEntier, 408);
});

test('un seul chiffre au multiplicateur : pas d\'addition à poser', () => {
    assert.equal(lignesMultiplication(128, 7).sommeAPoser, false);
    assert.equal(lignesMultiplication(128, 47).sommeAPoser, true);
});

// --- La division posée ------------------------------------------------------------

test('la potence rend une étape par chiffre abaissé', () => {
    const d = colonnesDivision(936, 4);
    assert.equal(d.quotient, 234);
    assert.equal(d.reste, 0);
    assert.equal(d.exacte, true);
    assert.deepEqual(d.etapes.map(e => e.chiffre), [2, 3, 4]);
    // LE RANG DU CHIFFRE DU QUOTIENT EST CELUI DU CHIFFRE ABAISSÉ.
    assert.deepEqual(d.etapes.map(e => e.rang), [2, 1, 0]);
    assert.deepEqual(d.etapes.map(e => e.produit), [8, 12, 16]);
    assert.deepEqual(d.etapes.map(e => e.reste), [1, 1, 0]);
});

test('un zéro DANS le quotient s\'écrit ; un zéro de tête, non', () => {
    // 816 ÷ 4 = 204 : le zéro du milieu est indispensable.
    const a = colonnesDivision(816, 4);
    assert.equal(a.quotient, 204);
    assert.deepEqual(a.etapes.map(e => e.ecrit), [true, true, true]);
    assert.equal(a.etapes[1].chiffre, 0);

    // 12 ÷ 5 : 1 ÷ 5 ne donne rien, on ne l'écrit pas — le quotient est « 2 »,
    // pas « 02 ». C'est le « on prend les deux premiers chiffres » de l'école.
    const b = colonnesDivision(12, 5, { decimalesMax: 1 });
    assert.deepEqual(b.etapes.map(e => e.ecrit), [false, true, true]);
    assert.equal(b.quotient, 2.4);
});

test('LA VIRGULE DU QUOTIENT TOMBE OÙ CELLE DU DIVIDENDE EST ABAISSÉE', () => {
    // Ce n'est pas une convention à retenir : c'est la conséquence du rang.
    const d = colonnesDivision(9.36, 4);
    assert.equal(d.quotient, 2.34);
    assert.equal(d.rangVirgule, -2);
    const apres = d.etapes.filter(e => e.apresVirgule).map(e => e.chiffre);
    assert.deepEqual(apres, [3, 4]);
});

test('on prolonge en abaissant des zéros, et le reste suit le rang atteint', () => {
    const exact = colonnesDivision(12, 5, { decimalesMax: 2 });
    assert.equal(exact.quotient, 2.4);
    assert.equal(exact.exacte, true);
    assert.equal(exact.reste, 0);

    const sansFin = colonnesDivision(7, 3, { decimalesMax: 3 });
    assert.equal(sansFin.quotient, 2.333);
    assert.equal(sansFin.exacte, false);
    // Le reste vaut ce qui traîne AU RANG ATTEINT, pas un entier nu.
    assert.equal(sansFin.reste, 0.001);
});

test('la division entière garde son reste', () => {
    const d = colonnesDivision(47, 6);
    assert.equal(d.quotient, 7);
    assert.equal(d.reste, 5);
    assert.equal(d.exacte, false);
    assert.equal(d.decimalesQuotient, 0);
});

test('ce qu\'on ne pose pas : diviser par zéro, par un décimal, un dividende négatif', () => {
    // Diviser par 0,4 se fait en déplaçant la virgule des DEUX nombres : c'est
    // un autre exercice, et le faire silencieusement enseignerait une méthode
    // que l'élève ne verra nulle part ailleurs.
    assert.throws(() => colonnesDivision(12, 0), /zéro/);
    assert.throws(() => colonnesDivision(12, 0.4), /entier/);
    assert.throws(() => colonnesDivision(-12, 4), /négatif/);
});

test('poser() aiguille vers les quatre opérations', () => {
    assert.equal(poser('×', [347, 26]).lignes.length, 2);
    assert.equal(poser('÷', [936, 4]).quotient, 234);
    assert.equal(poser('÷', [7, 2], { decimalesMax: 1 }).quotient, 3.5);
    assert.throws(() => poser('^', [2, 3]), /inconnue/);
});

test('la potence tombe juste sur cent divisions tirées au hasard', () => {
    // Une vérification par le résultat : quotient × diviseur + reste = dividende.
    // C'est l'égalité euclidienne, et elle ne pardonne rien.
    let graine = 7;
    const suivant = (n) => (graine = (graine * 1103515245 + 12345) % 2147483648) % n;
    for (let i = 0; i < 100; i++) {
        const a = suivant(9000) + 10;
        const b = suivant(20) + 2;
        const d = colonnesDivision(a, b);
        assert.equal(d.quotient * b + d.reste, a, `${a} ÷ ${b}`);
        assert.ok(d.reste >= 0 && d.reste < b, `reste hors bornes pour ${a} ÷ ${b}`);
    }
});

// --- Le nombre se dépose ENTIER ------------------------------------------------

test('le nombre se prend par n\'importe lequel de ses chiffres, et les autres suivent', () => {
    // 324,5 tenu par son « 3 » (index 0) lâché sur la colonne des centaines :
    // tout tombe à sa place.
    assert.deepEqual(apercuPose(324.5, 0, 2).map(c => [c.rang, c.chiffre]),
        [[2, 3], [1, 2], [0, 4], [-1, 5]]);
    // Le même nombre tenu par son « 5 » (index 3) sur la colonne des unités :
    // il est décalé d'un rang — c'est l'erreur du « collé à droite ».
    assert.deepEqual(apercuPose(324.5, 3, 0).map(c => [c.rang, c.chiffre]),
        [[3, 3], [2, 2], [1, 4], [0, 5]]);
});

test('l\'aperçu et la vérification disent la MÊME chose', () => {
    // Ce serait le pire des bogues : un fantôme qui montre juste et un dépôt
    // qui refuse. Les deux lisent la même fonction, on le vérifie.
    for (const v of [324.5, 12, 7.25, 1000]) {
        const n = String(v).replace('.', '').length;
        for (let i = 0; i < n; i++) {
            for (let r = -3; r <= 4; r++) {
                const pose = apercuPose(v, i, r);
                const verdict = verifierPose(v, i, r);
                const justes = pose.every(c => chiffreAuRang(v, c.rang) === c.chiffre
                    && rangsDe(v).includes(c.rang));
                assert.equal(verdict.ok, justes, `${v} pris en ${i}, lâché en ${r}`);
            }
        }
    }
});

test('l\'écart se compte en colonnes : c\'est ce qu\'on dit à l\'élève', () => {
    assert.equal(verifierPose(324.5, 3, -1).ecart, 0);
    assert.equal(verifierPose(324.5, 3, 1).ecart, 2);
    assert.equal(verifierPose(324.5, 0, 0).ecart, -2);
});

test('un index de prise aberrant est ramené dans les bornes, pas planté', () => {
    // Le doigt peut tomber au bord de l'étiquette : mieux vaut le premier ou
    // le dernier chiffre qu'une exception au milieu d'un geste.
    assert.deepEqual(apercuPose(12, -5, 1), apercuPose(12, 0, 1));
    assert.deepEqual(apercuPose(12, 99, 0), apercuPose(12, 1, 0));
});
