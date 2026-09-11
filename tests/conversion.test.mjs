import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    FAMILLES, NOMS_FAMILLES, familleDe, uniteDe, melangerUnites, verifierUnites,
    chiffresDansLeTableau, apercuPlacement, verifierNombre,
    convertir, reponse, tirerConversion
} from '../js/core/conversion.js';

// --- Les familles ------------------------------------------------------------------

test('chaque famille descend d\'une colonne à la fois, sans trou', () => {
    for (const nom of NOMS_FAMILLES) {
        const f = FAMILLES[nom];
        const rangs = f.unites.map(u => u.rang);
        // Les colonnes se suivent de gauche à droite, une puissance de dix par
        // colonne : c'est ce qui fait que la conversion est un glissement.
        for (let i = 1; i < rangs.length; i++) {
            assert.equal(rangs[i], rangs[i - 1] - 1,
                `${nom} : trou entre ${f.unites[i - 1].symbole} et ${f.unites[i].symbole}`);
        }
        assert.ok(rangs.includes(0), `${nom} n'a pas d'unité de base`);
        assert.equal(f.unites.find(u => u.rang === 0).symbole, f.base);
        // Pas deux symboles identiques : « dag » et « dg » se ressemblent déjà
        // assez comme ça.
        assert.equal(new Set(f.unites.map(u => u.symbole)).size, f.unites.length);
    }
});

test('l\'ordre des préfixes est le bon — kilo, hecto, déca', () => {
    // « hecto avant déca » se trompe une fois sur deux : c'est justement ce que
    // la première étape fait travailler.
    assert.deepEqual(FAMILLES.longueur.unites.map(u => u.symbole),
        ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']);
    assert.equal(uniteDe('longueur', 'km').rang, 3);
    assert.equal(uniteDe('longueur', 'mm').rang, -3);
    assert.equal(uniteDe('longueur', 'lieue'), null);
});

// --- Étape 1 : placer les unités ------------------------------------------------------

test('les étiquettes se mélangent, et le placement juste est accepté', () => {
    const m = melangerUnites('longueur', makeRng('u1'));
    assert.equal(m.etiquettes.length, 7);
    assert.deepEqual(m.etiquettes.slice().sort(),
        FAMILLES.longueur.unites.map(u => u.symbole).sort());
    assert.deepEqual(m.colonnes, [3, 2, 1, 0, -1, -2, -3]);

    const bon = {};
    FAMILLES.longueur.unites.forEach(u => { bon[u.rang] = u.symbole; });
    assert.deepEqual(verifierUnites('longueur', bon), { ok: true, fautes: [] });
});

test('deux unités interverties sont signalées, chacune à sa colonne', () => {
    const pose = {};
    FAMILLES.longueur.unites.forEach(u => { pose[u.rang] = u.symbole; });
    pose[2] = 'dam'; pose[1] = 'hm';           // l'erreur classique
    const v = verifierUnites('longueur', pose);
    assert.equal(v.ok, false);
    assert.equal(v.fautes.length, 2);
    assert.ok(v.fautes.some(f => f.rang === 2 && f.attendu === 'hm' && f.recu === 'dam'));
    assert.ok(v.fautes.some(f => f.rang === 1 && f.attendu === 'dam' && f.recu === 'hm'));
});

test('une colonne laissée vide est une faute, pas un oubli silencieux', () => {
    const v = verifierUnites('longueur', { 3: 'km' });
    assert.equal(v.ok, false);
    assert.equal(v.fautes.length, 6);
    assert.ok(v.fautes.every(f => f.rang === 3 ? false : f.recu === null));
});

// --- Étape 2 : placer le nombre --------------------------------------------------------

test('LE CHIFFRE DES UNITÉS VA DANS LA COLONNE DE SON UNITÉ', () => {
    // 3,45 m : le 3 en m, le 4 en dm, le 5 en cm.
    const c = chiffresDansLeTableau(3.45, 'longueur', 'm');
    assert.deepEqual(c, [
        { colonne: 0, chiffre: 3, rangDansLeNombre: 0 },
        { colonne: -1, chiffre: 4, rangDansLeNombre: -1 },
        { colonne: -2, chiffre: 5, rangDansLeNombre: -2 }
    ]);
    // Le même nombre en km glisse de trois colonnes, sans changer de forme.
    const k = chiffresDansLeTableau(3.45, 'longueur', 'km');
    assert.deepEqual(k.map(x => x.colonne), [3, 2, 1]);
    assert.deepEqual(k.map(x => x.chiffre), [3, 4, 5]);
});

test('le fantôme montre où tomberait le nombre, colonne par colonne', () => {
    // C'est ce qu'on affiche en transparence sous le doigt avant de lâcher.
    assert.deepEqual(apercuPlacement(3.45, 0).map(x => x.colonne), [0, -1, -2]);
    assert.deepEqual(apercuPlacement(3.45, 2).map(x => x.colonne), [2, 1, 0]);
    // Et les chiffres ne changent jamais : seule la colonne bouge.
    assert.deepEqual(apercuPlacement(3.45, 2).map(x => x.chiffre),
        apercuPlacement(3.45, -1).map(x => x.chiffre));
});

test('un placement décalé dit de combien de dizaines on s\'est trompé', () => {
    assert.deepEqual(verifierNombre(3.45, 'longueur', 'm', 0), { ok: true, attendu: 0, ecart: 0 });
    const rate = verifierNombre(3.45, 'longueur', 'm', 1);
    assert.equal(rate.ok, false);
    assert.equal(rate.ecart, 1, 'une colonne de trop, c\'est un facteur dix');
});

// --- Étape 3 : la virgule, puis les zéros ------------------------------------------------

test('L\'EXEMPLE DE RÉFÉRENCE : 3,45 m vers cm, sans aucun zéro', () => {
    const c = convertir(3.45, 'longueur', 'm', 'cm');
    assert.equal(c.valeur, 345);
    // La virgule se pose après la colonne des cm — et il n'y a rien après.
    assert.equal(c.colonneVirgule, -2);
    assert.deepEqual(c.zeros, [], 'aucune colonne à combler');
    assert.equal(c.entier, true);
    assert.equal(c.texte, '345 cm');
});

test('vers le kilomètre : la virgule recule, et les zéros apparaissent', () => {
    const c = convertir(3.45, 'longueur', 'm', 'km');
    assert.ok(Math.abs(c.valeur - 0.00345) < 1e-12);
    assert.equal(c.colonneVirgule, 3);
    // Les colonnes km, hm, dam sont vides et doivent porter un zéro : c'est le
    // « 0,00 » de 0,00345. Un seul oublié fait perdre un facteur dix.
    assert.deepEqual(c.zeros, [3, 2, 1]);
    assert.equal(c.entier, false);
    assert.equal(c.texte, '0,00345 km');
});

test('les zéros ne se posent QU\'ENTRE les chiffres et la virgule', () => {
    // 25 m vers dm : il faut un zéro à droite (250), et c'est tout.
    const d = convertir(25, 'longueur', 'm', 'dm');
    assert.equal(d.valeur, 250);
    assert.deepEqual(d.zeros, [-1], 'la colonne des dm est vide et se comble');
    // 25 m vers m : rien à combler du tout.
    const m = convertir(25, 'longueur', 'm', 'm');
    assert.deepEqual(m.zeros, []);
    assert.equal(m.valeur, 25);
});

test('un zéro final ne s\'écrit pas : ce n\'est pas la bonne écriture', () => {
    // 3,45 m vers mm = 3450 mm — le mm est comblé. Mais vers dm = 34,5 dm :
    // la colonne des cm porte un vrai chiffre, rien à combler à droite.
    assert.deepEqual(convertir(3.45, 'longueur', 'm', 'mm').zeros, [-3]);
    assert.equal(convertir(3.45, 'longueur', 'm', 'mm').valeur, 3450);
    const dm = convertir(3.45, 'longueur', 'm', 'dm');
    assert.deepEqual(dm.zeros, []);
    assert.ok(Math.abs(dm.valeur - 34.5) < 1e-12);
});

test('la conversion tombe juste sur toutes les paires d\'unités', () => {
    for (const nom of NOMS_FAMILLES) {
        const f = familleDe(nom);
        for (const uD of f.unites) {
            for (const uA of f.unites) {
                for (const v of [1, 7, 25, 340, 3.45, 0.8, 12.06]) {
                    const c = convertir(v, nom, uD.symbole, uA.symbole);
                    const attendu = v * Math.pow(10, uD.rang - uA.rang);
                    assert.ok(Math.abs(c.valeur - attendu) < Math.max(1e-9, Math.abs(attendu) * 1e-12),
                        `${v} ${uD.symbole} → ${uA.symbole} : ${c.valeur} au lieu de ${attendu}`);
                    assert.equal(reponse(v, nom, uD.symbole, uA.symbole), c.valeur);
                }
            }
        }
    }
});

test('le tableau écrit RELIT bien le nombre annoncé', () => {
    // La vraie garantie : chiffres posés + zéros comblés + virgule = la valeur.
    for (const nom of NOMS_FAMILLES) {
        const f = familleDe(nom);
        for (const uD of f.unites) {
            for (const uA of f.unites) {
                for (const v of [7, 25, 340, 3.45, 12.06]) {
                    const c = convertir(v, nom, uD.symbole, uA.symbole);
                    let lu = 0;
                    for (let col = c.colonneHaute; col >= c.colonneBasse; col--) {
                        const ch = c.chiffres[col] !== undefined ? c.chiffres[col] : 0;
                        lu += ch * Math.pow(10, col - c.colonneVirgule);
                    }
                    assert.ok(Math.abs(lu - c.valeur) < Math.max(1e-9, Math.abs(c.valeur) * 1e-12),
                        `${v} ${uD.symbole} → ${uA.symbole} : le tableau lit ${lu}, on annonce ${c.valeur}`);
                    // Toute colonne vide de l'étendue est bien listée en zéro.
                    for (let col = c.colonneHaute; col >= c.colonneBasse; col--) {
                        if (c.chiffres[col] === undefined) {
                            assert.ok(c.zeros.includes(col), `colonne ${col} vide et non comblée`);
                        }
                    }
                }
            }
        }
    }
});

// --- Le tirage ------------------------------------------------------------------------------

test('un exercice tiré est lisible, jamais vers lui-même', () => {
    for (const nom of NOMS_FAMILLES) {
        for (let i = 0; i < 120; i++) {
            const e = tirerConversion({ rng: makeRng(`c_${nom}_${i}`), famille: nom });
            assert.notEqual(e.depart, e.arrivee, 'convertir vers soi-même n\'apprend rien');
            assert.ok(uniteDe(nom, e.depart) && uniteDe(nom, e.arrivee));
            assert.ok(Math.abs(e.attendu) >= 0.0001 && Math.abs(e.attendu) <= 999999,
                `résultat illisible : ${e.attendu}`);
            assert.equal(e.attendu, reponse(e.valeur, nom, e.depart, e.arrivee));
            assert.match(e.enonce, /………/);
        }
    }
});

test('le sens du glissement est annoncé, et il est juste', () => {
    for (let i = 0; i < 200; i++) {
        const e = tirerConversion({ rng: makeRng('sens' + i), famille: 'longueur' });
        const d = uniteDe('longueur', e.depart).rang, a = uniteDe('longueur', e.arrivee).rang;
        // D'une grande unité vers une petite, le nombre grandit.
        assert.equal(e.sens, d > a ? 'multiplie' : 'divise');
        if (e.sens === 'multiplie') assert.ok(e.attendu > e.valeur);
        else assert.ok(e.attendu < e.valeur);
        assert.equal(e.facteur, Math.pow(10, Math.abs(d - a)));
    }
});

test('l\'écart borne vraiment le saut de colonnes', () => {
    for (let i = 0; i < 150; i++) {
        const e = tirerConversion({ rng: makeRng('ec' + i), famille: 'longueur', ecart: 1 });
        const d = uniteDe('longueur', e.depart).rang, a = uniteDe('longueur', e.arrivee).rang;
        assert.equal(Math.abs(d - a), 1, 'une seule colonne d\'écart au niveau facile');
    }
});

test('sans le réglage décimal, les nombres de départ sont entiers', () => {
    for (let i = 0; i < 150; i++) {
        const e = tirerConversion({ rng: makeRng('ent' + i), famille: 'masse' });
        assert.equal(e.valeur, Math.round(e.valeur), `${e.valeur} n'est pas entier`);
    }
    let vus = 0;
    for (let i = 0; i < 150; i++) {
        const e = tirerConversion({ rng: makeRng('dec' + i), famille: 'masse', decimales: true });
        if (e.valeur !== Math.round(e.valeur)) vus++;
    }
    assert.ok(vus > 60, `seulement ${vus} nombres à virgule sur 150`);
});

test('la même graine redonne le même exercice', () => {
    const a = tirerConversion({ rng: makeRng('g'), famille: 'capacite', decimales: true });
    const b = tirerConversion({ rng: makeRng('g'), famille: 'capacite', decimales: true });
    assert.deepEqual(a, b);
});
