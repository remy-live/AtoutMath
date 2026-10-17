// LE CHAMP DE TRÈFLES — ce qui doit être vrai pour que le jeu soit jouable.
//
// RÉMY : « J'ai pensé à des mini jeux pour une pause comme la grenouille ou le
// parking, je pensais aussi à des choses sympas comme cela », avec la page
// d'une revue : « Encoure les trèfles à 4 feuilles ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DANGER DE CE JEU TIENT EN UNE PHRASE : un trèfle à quatre feuilles
// recouvert par ceux qu'on dessine après lui est INTROUVABLE, et surtout
// INCLIQUABLE. Le joueur cherche quelque chose qui n'existe pas à l'écran, et
// la partie ne se termine jamais — sans rien pour le dire, puisque « pas encore
// trouvé » et « impossible à trouver » se ressemblent exactement.
//
// C'est la même famille de défaut que la virgule qu'on ne pouvait pas poser
// dans le tableau de conversion, et que le sélecteur inventé qui rend `false` :
// DEUX ÉTATS QUI NE SE DISTINGUENT PAS. On ne les corrige pas en regardant
// l'écran — on les empêche là où le champ se sème.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    PALIERS, RAYON, TROP_PRES, semerLeChamp, cachesParLaSuite, tailleDuChamp,
    ordreDeDessin, cheminsDunTrefle, motDeFin, distance
} from '../js/core/champDeTrefles.js';

const NOMS = Object.keys(PALIERS);
const champs = (palier, combien = 60) => Array.from({ length: combien },
    (_, i) => semerLeChamp({ rng: makeRng(`${palier}-${i}`), palier }));

// ───────────────────────────────── CE QUI REND LE JEU FINISSABLE ────────────

test('AUCUN TRÈFLE À QUATRE FEUILLES N\'EST RECOUVERT', () => {
    // LA GARANTIE QUI PORTE TOUT LE JEU. Un trèfle caché sous un autre dessiné
    // après lui ne se clique pas : la partie ne finit jamais, et rien ne
    // distingue cet état de « je n'ai pas encore trouvé ».
    for (const palier of NOMS) {
        for (const champ of champs(palier)) {
            for (const t of cachesParLaSuite(champ)) {
                assert.equal(t.caches, 0,
                    `${palier} : le trèfle ${t.i} est recouvert par ${t.caches} voisin(s)`);
            }
        }
    }
});

test('IL Y EN A EXACTEMENT LE NOMBRE ANNONCÉ', () => {
    // « Trouve les 3 trèfles » avec deux trèfles dans le champ, et l'élève
    // cherche le troisième jusqu'à la fin de la récréation.
    for (const palier of NOMS) {
        for (const champ of champs(palier)) {
            const quatre = champ.trefles.filter(t => t.feuilles === 4);
            assert.equal(quatre.length, PALIERS[palier].aTrouver, palier);
            assert.equal(champ.aTrouver, PALIERS[palier].aTrouver);
        }
    }
});

test('ET LES AUTRES EN ONT BIEN TROIS', () => {
    // Un trèfle à cinq feuilles passé par erreur serait un piège parfait :
    // l'élève le compterait comme « quatre et quelque », et il aurait raison
    // de douter.
    for (const champ of champs('champ', 30)) {
        assert.ok(champ.trefles.every(t => t.feuilles === 3 || t.feuilles === 4));
    }
});

test('LES TRÈFLES À TROUVER NE SONT PAS CÔTE À CÔTE', () => {
    // Deux trèfles à quatre feuilles voisins se trouvent d'un seul coup d'œil :
    // on en voit un, le second est dans le même regard, et le champ perd la
    // moitié de sa durée.
    for (const palier of NOMS) {
        for (const champ of champs(palier, 40)) {
            const q = champ.trefles.filter(t => t.feuilles === 4);
            for (let i = 0; i < q.length; i++) {
                for (let j = i + 1; j < q.length; j++) {
                    assert.ok(distance(q[i], q[j]) >= RAYON * 2,
                        `${palier} : deux trèfles à ${distance(q[i], q[j]).toFixed(1)} l'un de l'autre`);
                }
            }
        }
    }
});

test('rien ne tombe hors du champ', () => {
    // Un trèfle à moitié dehors est à moitié cliquable, et s'il a quatre
    // feuilles on ne les compte même pas.
    for (const palier of NOMS) {
        for (const champ of champs(palier, 30)) {
            for (const t of champ.trefles) {
                assert.ok(t.x >= -RAYON && t.x <= champ.largeur + RAYON, `x = ${t.x}`);
                assert.ok(t.y >= -RAYON && t.y <= champ.hauteur + RAYON, `y = ${t.y}`);
            }
        }
    }
});

// ──────────────────────────────────────── CE QUI FAIT LA DIFFICULTÉ ─────────

test('LA DENSITÉ EST CELLE QU\'ON DEMANDE', () => {
    // LE DÉFAUT DU PREMIER JET, vu à l'écran et non dans un calcul : le champ
    // était joli et deux fois trop aéré — 42 % de couverture là où la page de
    // la revue en montre près de 80. La taille du champ se déduit donc de la
    // densité voulue, et non l'inverse.
    for (const palier of NOMS) {
        const P = PALIERS[palier];
        const { largeur, hauteur } = tailleDuChamp(P);
        const couverture = P.combien * Math.PI * RAYON * RAYON / (largeur * hauteur);
        assert.ok(Math.abs(couverture - P.densite) < 0.02,
            `${palier} : ${Math.round(couverture * 100)} % pour ${Math.round(P.densite * 100)} % demandés`);
    }
});

test('LES PALIERS MONTENT VRAIMENT', () => {
    // Quatre paliers qui se ressemblent ne servent à rien. Le nombre de
    // trèfles ET la densité montent ensemble ; la promenade est le seul où les
    // trèfles sont droits, et c'est ce qui la rend facile.
    for (let i = 1; i < NOMS.length; i++) {
        const a = PALIERS[NOMS[i - 1]], b = PALIERS[NOMS[i]];
        assert.ok(b.combien > a.combien, `${NOMS[i]} : ${b.combien} contre ${a.combien}`);
        assert.ok(b.densite > a.densite, `${NOMS[i]} : densité ${b.densite} contre ${a.densite}`);
    }
    assert.equal(PALIERS.promenade.rotation, 0, 'la promenade garde ses trèfles droits');
    assert.ok(NOMS.slice(1).every(n => PALIERS[n].rotation === 1),
        'partout ailleurs, ils tournent — c\'est le vrai levier');
});

test('LA ROTATION EST BIEN UNE ROTATION, ET NON TROIS ANGLES', () => {
    // Tirer parmi quelques angles seulement remettrait des silhouettes
    // reconnaissables, et l'œil cesserait de compter les feuilles.
    const angles = new Set();
    for (const champ of champs('pre', 10)) {
        champ.trefles.forEach(t => angles.add(Math.round(t.angle)));
    }
    assert.ok(angles.size > 100, `${angles.size} angles distincts seulement`);
    for (const champ of champs('promenade', 10)) {
        assert.ok(champ.trefles.every(t => t.angle === 0), 'la promenade ne tourne pas');
    }
});

test('l\'ordre de dessin est tiré, et il est complet', () => {
    // C'est lui qui décide qui recouvre qui. Semés dans l'ordre de la grille,
    // les trèfles se tuileraient toujours de haut en bas, et l'image aurait un
    // sens de lecture que la page de la revue n'a pas.
    const champ = semerLeChamp({ rng: makeRng('ordre'), palier: 'champ' });
    const ordres = champ.trefles.map(t => t.ordre).sort((a, b) => a - b);
    assert.deepEqual(ordres, ordres.map((_, i) => i), 'chaque rang une fois et une seule');
    assert.equal(ordreDeDessin(champ).length, champ.trefles.length);
    const commeLaGrille = champ.trefles.every(t => t.ordre === t.i);
    assert.ok(!commeLaGrille, 'l\'ordre de dessin ne suit pas celui de la grille');
});

test('le champ est reproductible à graine égale', () => {
    // Deux élèves sur la même séance doivent voir le même champ : sinon on ne
    // peut pas en parler, ni dire « celui du bas à gauche ».
    const a = semerLeChamp({ rng: makeRng('pareil'), palier: 'pre' });
    const b = semerLeChamp({ rng: makeRng('pareil'), palier: 'pre' });
    assert.deepEqual(a.trefles, b.trefles);
});

// ───────────────────────────────────────────────────── LE DESSIN ────────────

test('TROIS FEUILLES À 120°, QUATRE À 90°', () => {
    const trois = cheminsDunTrefle(3);
    assert.equal(trois.length, 3);
    assert.deepEqual(trois.map(f => f.rotation), [0, 120, 240]);
    const quatre = cheminsDunTrefle(4);
    assert.equal(quatre.length, 4);
    // LE DÉCALAGE DE 45° N'EST PAS DÉCORATIF : sans lui, un trèfle à quatre
    // feuilles a une feuille pile en bas, là où part le pédoncule, et les deux
    // se confondent — on croit voir trois feuilles et une tige épaisse.
    assert.deepEqual(quatre.map(f => f.rotation), [45, 135, 225, 315]);
    assert.ok(trois.every(f => f.d.startsWith('M0,0')), 'la pointe est au centre');
});

// ──────────────────────────────────────────────────── LE MOT DE FIN ─────────

test('ON NE DIT PAS « PARFAIT » À QUI A CLIQUÉ PARTOUT', () => {
    // C'est une pause : on ne sermonne pas. Mais féliciter quelqu'un qui a
    // cliqué trente fois au hasard lui apprend que cliquer au hasard marche.
    const propre = motDeFin({ secondes: 24, erreurs: 0, aTrouver: 3 });
    assert.match(propre, /sans une seule erreur/);
    const sale = motDeFin({ secondes: 24, erreurs: 18, aTrouver: 3 });
    assert.doesNotMatch(sale, /sans une seule erreur/);
    // ET LA PHRASE NOMME LE GESTE QUI FAIT GAGNER DU TEMPS, parce que c'est la
    // seule chose à apprendre ici et qu'elle sert ailleurs.
    assert.match(sale, /ligne par ligne/);
});

test('le temps se dit en minutes au-delà de soixante secondes', () => {
    assert.match(motDeFin({ secondes: 42, erreurs: 0, aTrouver: 2 }), /42 s/);
    assert.match(motDeFin({ secondes: 95, erreurs: 0, aTrouver: 2 }), /1 min 35/);
});

// ────────────────────────────────────────── LE SEUIL, NOMMÉ UNE FOIS ────────

test('le seuil de recouvrement est celui qu\'on mesure', () => {
    // `cachesParLaSuite` et le choix des trèfles doivent employer LE MÊME
    // seuil. Deux constantes voisines qui divergent d'un dixième, et la
    // garantie ne garantit plus rien — tout en restant verte.
    const champ = semerLeChamp({ rng: makeRng('seuil'), palier: 'foret' });
    const seuil = RAYON * TROP_PRES;
    for (const t of champ.trefles.filter(x => x.feuilles === 4)) {
        const apres = champ.trefles.filter(a => a !== t && a.ordre > t.ordre);
        assert.ok(apres.every(a => distance(t, a) >= seuil),
            `un voisin à ${Math.min(...apres.map(a => distance(t, a))).toFixed(1)}`);
    }
});
