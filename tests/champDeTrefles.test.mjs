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
import { readFileSync } from 'node:fs';
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

// ──────────────────────────── LE PARTERRE EST DENSE, ET ÇA SE COMPTE ────────

/**
 * LA PART DU CHAMP VRAIMENT COUVERTE, en comptant des points.
 *
 * On ne peut PAS la déduire du semis : les trèfles se chevauchent, donc deux
 * disques posés au même endroit comptent deux fois dans le semis et une seule
 * fois sur la page. C'est exactement l'erreur qui a rendu le premier parterre
 * trop clairsemé — « densité 0,62 » voulait dire 52 % de vert, pas 62 %.
 */
function couverture(champ, pas = 3) {
    let total = 0, dedans = 0;
    for (let y = 0; y < champ.hauteur; y += pas) {
        for (let x = 0; x < champ.largeur; x += pas) {
            total++;
            if (champ.trefles.some(t => (t.x - x) ** 2 + (t.y - y) ** 2 < RAYON * RAYON)) dedans++;
        }
    }
    return dedans / total;
}

test('LE PARTERRE EST DENSE — Rémy : « rends le parterre plus dense »', () => {
    // MESURÉ avant la correction, en comptant des points : 38 % de vert à la
    // promenade, 52 % au pré, 61 % au champ, 66 % au grand pré — quand la page
    // de la revue en montre près de 80. Le semis avait été réglé comme si
    // c'était la couverture, et les chevauchements mangeaient la différence.
    //
    // CE QU'ON GARDE ICI EST UN PLANCHER, pas une valeur : on doit pouvoir
    // retoucher le réglage sans casser l'épreuve, mais pas revenir à un pré
    // où l'on voit le fond entre les trèfles.
    const PLANCHERS = { promenade: 0.45, pre: 0.62, champ: 0.76, foret: 0.82 };
    for (const palier of NOMS) {
        assert.ok(PLANCHERS[palier] !== undefined,
            `palier « ${palier} » sans plancher de densité : ajoutez-le ici`);
        const vu = couverture(semerLeChamp({ rng: makeRng('densite-' + palier), palier }));
        assert.ok(vu >= PLANCHERS[palier],
            `${palier} : ${Math.round(vu * 100)} % de vert, il en faut ${
                Math.round(PLANCHERS[palier] * 100)}`);
    }
});

test('ET LE CHAMP PREND LA FORME DE SA PLACE', () => {
    // MESURÉ sur l'écran du professeur : un champ de rapport 4/3 arrivait dans
    // un cadre de 1,84 et le navigateur le posait au milieu — 530 px de blanc
    // de chaque côté sur 1900. Le parterre flottait, et c'est l'autre moitié
    // de ce que Rémy voyait. Le semis ne change pas, la forme suit.
    const large = semerLeChamp({ rng: makeRng('forme'), palier: 'pre', rapport: 1.84 });
    assert.ok(Math.abs(large.largeur / large.hauteur - 1.84) < 0.06,
        `rapport ${(large.largeur / large.hauteur).toFixed(2)} pour 1,84 demandé`);
    const carre = semerLeChamp({ rng: makeRng('forme'), palier: 'pre', rapport: 1 });
    assert.ok(Math.abs(carre.largeur / carre.hauteur - 1) < 0.06);
    // ET L'AIRE NE BOUGE PAS : c'est la densité qu'on garde, pas la largeur.
    assert.ok(Math.abs(large.largeur * large.hauteur
        - carre.largeur * carre.hauteur) / (carre.largeur * carre.hauteur) < 0.02);
    // UN RAPPORT ABSURDE NE PASSE PAS. Une boîte mesurée avant la mise en page
    // rend 0 ; `Math.sqrt(aire × 0)` donnerait un champ de largeur nulle, tous
    // les trèfles au même endroit, et un jeu mort sans aucune erreur affichée.
    for (const fou of [0, -3, 40, NaN, undefined]) {
        const c = semerLeChamp({ rng: makeRng('fou'), palier: 'pre', rapport: fou });
        assert.ok(c.largeur > 50 && c.hauteur > 50, `rapport ${fou} : ${c.largeur}×${c.hauteur}`);
    }
});

test('LE JEU MESURE LA PLACE QU\'IL A AVANT DE SEMER', () => {
    // Le module sait prendre la forme de son cadre ; encore faut-il que
    // quelqu'un la lui donne. Sans cette ligne, la correction ci-dessus ne
    // change rien à l'écran — et c'est le genre d'oubli qu'aucune épreuve de
    // calcul ne voit.
    const JEU = readFileSync(new URL('../js/games/trefles.js', import.meta.url), 'utf8');
    assert.match(JEU, /const page = this\.container\.querySelector\('\.tr-page'\);/);
    assert.match(JEU, /semerLeChamp\(\{ rng: this\.rng, palier: this\.palier, rapport \}\)/);
});
