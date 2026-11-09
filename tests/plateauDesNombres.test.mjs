// LE PLATEAU DES NOMBRES — la règle du jeu de Rémy, gardée sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on est sur un plateau avec des nombres aux extrémités et on
// fonctionne par équipe, et sur le plateau chaque joueur porte un chiffre (qui
// peut changer) exemple un joueur de l'équipe rouge porte 7 et un autre 8 et il
// y a un 56 sur le plateau et il faut qu'il se retrouve pour prendre le 56 […]
// Si c'est un rouge et un bleu qui se rejoignent les points sont partagés. »
//
// ── CE QUE CES ÉPREUVES GARDENT ───────────────────────────────────────────
//
// LA RÈGLE, et elle seule : qui prend quoi, avec qui, et pour combien. Tout
// `js/core/plateau.js` est pur — aucune fonction n'y lit l'heure, n'y touche au
// document ni au réseau —, donc la règle entière se mesure en millisecondes.
//
// CE QU'ELLES NE PEUVENT PAS GARDER : que trente pions bougent vraiment sur un
// écran, et que deux élèves se retrouvent. C'est le travail de la sonde. Une
// règle juste branchée nulle part ne ferait prendre aucun 56.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    NOMBRES, PIONS_MAX, RAYON, VITESSE, pointsDeLaPrise, prendLaCible,
    decompositions, valeursPossibles, nombresUtiles, dessinerLePlateau, placeDeDepart,
    avancer, caseSous, cibleEn, cibleSous, quiPrend, repartirLesPoints,
    coupDuRobot, PENALITES, coutDeLErreur, scoreApresPenalite
} from '../js/core/plateau.js';

/* ─────────────────────────── PRENDRE UNE CIBLE ─────────────────────────── */

test('LE 7 ET LE 8 PRENNENT LE 56 — l\'exemple de Rémy, mot pour mot', () => {
    assert.equal(prendLaCible(56, [7, 8], '×'), true);
    assert.equal(prendLaCible(56, [8, 7], '×'), true, 'l\'ordre d\'arrivée ne compte pas');
    assert.equal(prendLaCible(56, [7, 9], '×'), false);
});

test('ET À TROIS AUSSI : 56 = 2 × 4 × 7', () => {
    // LE CHOIX DE RÉMY : « Deux ou trois ». C'est de la décomposition en
    // facteurs déguisée — et c'est pour cela qu'elle vaut le double.
    assert.equal(prendLaCible(56, [2, 4, 7], '×'), true);
    assert.equal(prendLaCible(56, [2, 2, 7], '×'), false);
});

test('UN PION SEUL NE PREND RIEN, ET C\'EST TOUT LE JEU', () => {
    // « il faut qu'il se retrouve pour prendre le 56 ». Sans cette règle, le
    // plateau serait une course au ramassage, et personne ne chercherait
    // personne.
    assert.equal(prendLaCible(7, [7], '×'), false);
    assert.equal(prendLaCible(56, [], '×'), false);
});

test('ET JAMAIS À QUATRE : la règle s\'arrête à trois', () => {
    // 2 × 2 × 2 × 7 = 56 serait juste en arithmétique, et faux dans ce jeu-ci.
    assert.equal(prendLaCible(56, [2, 2, 2, 7], '×'), false);
    assert.equal(PIONS_MAX, 3);
});

test('L\'ADDITION MARCHE PAREIL — « on peut aussi faire cela pour l\'addition »', () => {
    assert.equal(prendLaCible(15, [7, 8], '+'), true);
    assert.equal(prendLaCible(15, [3, 5, 7], '+'), true);
    assert.equal(prendLaCible(15, [7, 8], '×'), false, 'l\'opération du plateau décide');
});

test('AUCUN PION NE PORTE 1, ET C\'EST UNE RÈGLE DE JEU', () => {
    // Un pion qui porte 1 prendrait n'importe quelle cible avec n'importe quel
    // partenaire — 1 × 56 = 56 — et la décomposition ne servirait plus à rien.
    assert.ok(!NOMBRES.includes(1), 'le 1 rendrait toute décomposition inutile');
    assert.ok(!NOMBRES.includes(0));
    assert.equal(prendLaCible(56, [1, 56], '×'), false, '56 n\'est pas un nombre portable');
});

/* ──────────────────────────── CE QUE ÇA RAPPORTE ───────────────────────── */

test('LA PRISE VAUT LE NOMBRE, ET LE DOUBLE À TROIS PIONS', () => {
    // RÉMY : « trois pions, plus de points ? ». Oui — et le DOUBLE, parce que
    // réunir trois élèves au même endroit au même moment coûte largement plus
    // du double d'une rencontre à deux. À une fois et demie, personne ne
    // tenterait deux fois.
    assert.equal(pointsDeLaPrise(56, 2), 56);
    assert.equal(pointsDeLaPrise(56, 3), 112);
    // ET LA VALEUR FAIT LE PRIX : sans cela, tout le monde camperait sur le 4,
    // qui ne demande qu'un 2 et un 2.
    assert.ok(pointsDeLaPrise(81, 2) > pointsDeLaPrise(4, 2) * 10);
});

test('DEUX COULEURS QUI SE REJOIGNENT PARTAGENT — la règle de Rémy', () => {
    const pions = [
        { id: 'a', nombre: 7, equipe: 0, depuis: 1 },
        { id: 'b', nombre: 8, equipe: 1, depuis: 2 }
    ];
    const prise = quiPrend(56, pions, '×');
    assert.ok(prise, 'le 7 et le 8 ne prennent pas le 56');
    assert.equal(prise.partage, true);
    // LA MOITIÉ À CHACUNE, et non la moitié à l'une et rien à l'autre : sinon
    // l'un des deux élèves se sacrifierait, et il ne le ferait pas deux fois.
    assert.deepEqual(repartirLesPoints(prise), { 0: 28, 1: 28 });
});

test('ET DEUX DE LA MÊME COULEUR PRENNENT TOUT', () => {
    const pions = [
        { id: 'a', nombre: 7, equipe: 0, depuis: 1 },
        { id: 'b', nombre: 8, equipe: 0, depuis: 2 }
    ];
    const prise = quiPrend(56, pions, '×');
    assert.equal(prise.partage, false);
    assert.deepEqual(repartirLesPoints(prise), { 0: 56 });
});

test('À CINQ SUR LA CASE, C\'EST LA PRISE À TROIS QUI L\'EMPORTE', () => {
    // LE CAS QUI SE PRODUIRA À CHAQUE PARTIE : un attroupement sur une grosse
    // cible. Si l'on prenait la première paire venue, l'attroupement rendrait
    // IMPOSSIBLE la prise à trois — qui vaut pourtant le double, et que trois
    // élèves viennent justement de réussir à coordonner.
    const pions = [
        { id: 'a', nombre: 7, equipe: 0, depuis: 1 },
        { id: 'b', nombre: 8, equipe: 0, depuis: 2 },
        { id: 'c', nombre: 2, equipe: 0, depuis: 3 },
        { id: 'd', nombre: 4, equipe: 0, depuis: 4 },
        { id: 'e', nombre: 3, equipe: 1, depuis: 5 }
    ];
    const prise = quiPrend(56, pions, '×');
    assert.equal(prise.pions.length, 3, 'la prise à trois a été ignorée');
    assert.equal(prise.points, 112);
    assert.deepEqual(prise.pions.map(p => p.nombre).sort(), [2, 4, 7]);
});

test('ET PERSONNE NE PREND QUAND LE COMPTE N\'Y EST PAS', () => {
    const pions = [
        { id: 'a', nombre: 3, equipe: 0, depuis: 1 },
        { id: 'b', nombre: 3, equipe: 0, depuis: 2 }
    ];
    assert.equal(quiPrend(56, pions, '×'), null);
});

/* ──────────────────────────── LE PLATEAU LUI-MÊME ──────────────────────── */

test('LA MÊME GRAINE DONNE LE MÊME PLATEAU, au pixel près', () => {
    // C'EST CE QUI PERMET DE NE RIEN RANGER DE LA GRILLE : les trente ardoises
    // et le vidéoprojecteur la recalculent chacun de leur côté. Une grille
    // rangée en base serait une seconde vérité à tenir d'accord — c'est la
    // décision déjà prise pour les questions du défi.
    const a = dessinerLePlateau({ graine: 'zoe', combien: 10 });
    const b = dessinerLePlateau({ graine: 'zoe', combien: 10 });
    assert.deepEqual(a, b);
    const c = dessinerLePlateau({ graine: 'tom', combien: 10 });
    assert.notDeepEqual(a.cibles, c.cibles, 'deux graines donnent le même plateau');
});

test('TOUTE CIBLE POSÉE EST PRENABLE À DEUX', () => {
    // UN PLATEAU AVEC UNE CIBLE IMPRENABLE serait pire qu'un plateau vide :
    // des élèves y passeraient la minute à chercher un partenaire qui ne peut
    // pas exister. On tire donc les valeurs PARMI les produits de deux
    // nombres portables, et cette épreuve garde ce lien.
    for (const op of ['×', '+']) {
        const p = dessinerLePlateau({ graine: 'tout-prenable', combien: 12, operation: op });
        for (const c of p.cibles) {
            const voies = decompositions(c.valeur, op);
            assert.ok(voies.some(v => v.length === 2),
                `la cible ${c.valeur} (${op}) ne se prend pas à deux`);
        }
    }
});

test('DEUX CIBLES NE SE TOUCHENT JAMAIS', () => {
    // Sans cette distance, deux nombres voisins se prendraient d'un même
    // attroupement : la classe se masserait à un endroit, et le plateau ne
    // servirait plus à rien.
    const p = dessinerLePlateau({ graine: 'ecart', combien: 14 });
    for (const a of p.cibles) {
        for (const b of p.cibles) {
            if (a.i === b.i) continue;
            assert.ok(Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1,
                `les cibles ${a.valeur} et ${b.valeur} se touchent`);
        }
    }
});

test('ON NE TOURNE JAMAIS SANS FIN sur un plateau trop petit', () => {
    // UNE BOUCLE INFINIE DANS UN JEU DE CLASSE est pire qu'un plateau
    // clairsemé : l'écran de trente élèves se fige, et personne ne sait
    // pourquoi. On rend moins de cibles, et on le rend vite.
    const parti = Date.now();
    const p = dessinerLePlateau({ graine: 'serre', largeur: 3, hauteur: 3, combien: 40 });
    assert.ok(Date.now() - parti < 200, 'le tirage s\'éternise');
    assert.ok(p.cibles.length < 40, 'un plateau de neuf cases ne porte pas 40 cibles');
    assert.ok(p.cibles.length >= 1);
});

/* ──────────────── SE DÉPLACER LIBREMENT, EN RONDS ─────────────────────── */

// RÉMY, après avoir vu la première version : « je voyais plus les joueurs comme
// des ronds qui se déplacent librement pas case par case et quand on recouvre
// un carré, le carré s'éclaire ».

test('UN ROND NE SORT JAMAIS DU TERRAIN', () => {
    const p = dessinerLePlateau({ graine: 'bords' });
    // ON LE POUSSE LOIN, DANS LES QUATRE COINS, et il reste dedans — à son
    // rayon près, parce qu'un rond à demi dehors est un rond qu'on ne voit plus.
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]]) {
        const q = avancer(p, p.largeur / 2, p.hauteur / 2, dx, dy, 100);
        assert.ok(q.x >= RAYON && q.x <= p.largeur - RAYON, `x = ${q.x}`);
        assert.ok(q.y >= RAYON && q.y <= p.hauteur - RAYON, `y = ${q.y}`);
    }
    // UNE DIRECTION NULLE NE BOUGE RIEN, plutôt que de rendre `NaN` : au repos,
    // c'est le cas le plus fréquent de tous, soixante fois par seconde.
    assert.deepEqual(avancer(p, 3, 3, 0, 0, 0.016), { x: 3, y: 3 });
});

test('LA DIAGONALE NE VA PAS PLUS VITE — on norme la direction', () => {
    // SANS CELA, aller en diagonale irait une fois et demie plus vite que le
    // long d'un bord, et toute la classe jouerait en diagonale. C'est le
    // premier défaut de tous les jeux de déplacement libre.
    const p = dessinerLePlateau({ graine: 'diag', largeur: 40, hauteur: 40 });
    const droit = avancer(p, 20, 20, 1, 0, 1);
    const biais = avancer(p, 20, 20, 1, 1, 1);
    const parcouruDroit = Math.hypot(droit.x - 20, droit.y - 20);
    const parcouruBiais = Math.hypot(biais.x - 20, biais.y - 20);
    assert.ok(Math.abs(parcouruDroit - parcouruBiais) < 1e-9,
        `${parcouruDroit} contre ${parcouruBiais}`);
    assert.ok(Math.abs(parcouruDroit - VITESSE) < 1e-9, 'la vitesse n\'est pas celle annoncée');
});

test('ET C\'EST LE TEMPS QUI COMMANDE, pas le nombre d\'images', () => {
    // Une tablette à trente images par seconde doit avancer d'autant qu'un
    // ordinateur à soixante, sinon le jeu récompense le matériel.
    const p = dessinerLePlateau({ graine: 'temps', largeur: 40, hauteur: 40 });
    let a = { x: 5, y: 5 };
    for (let i = 0; i < 60; i++) a = avancer(p, a.x, a.y, 1, 0, 1 / 60);
    let b = { x: 5, y: 5 };
    for (let i = 0; i < 30; i++) b = avancer(p, b.x, b.y, 1, 0, 1 / 30);
    assert.ok(Math.abs(a.x - b.x) < 1e-9, `${a.x} contre ${b.x}`);
});

test('LE CARRÉ RECOUVERT EST CELUI DE LA PARTIE ENTIÈRE', () => {
    // C'est la définition la plus simple de « recouvrir », et surtout la seule
    // qui soit la MÊME pour l'élève et pour l'arbitre : un chevauchement
    // partiel se discuterait, un centre dans le carré ne se discute pas.
    assert.deepEqual(caseSous(3.9, 2.1), { x: 3, y: 2 });
    assert.deepEqual(caseSous(3.0, 2.0), { x: 3, y: 2 });
    const p = dessinerLePlateau({ graine: 'dessous' });
    const c = p.cibles[0];
    assert.equal(cibleSous(p, c.x + 0.5, c.y + 0.5).valeur, c.valeur);
    assert.equal(cibleSous(p, c.x + 0.99, c.y + 0.01).valeur, c.valeur,
        'un rond au coin du carré le recouvre quand même');
    assert.equal(cibleSous(p, c.x + 1.2, c.y + 0.5), null,
        'un rond sur le carré voisin ne recouvre plus celui-ci');
});

test('LES DEUX ÉQUIPES ENTRENT PAR DEUX BORDS OPPOSÉS', () => {
    // Un départ au hasard mélangerait les couleurs dès la première seconde, et
    // la classe ne verrait jamais ses équipes — or c'est la première chose
    // qu'elle doit lire sur l'écran du tableau.
    const p = dessinerLePlateau({ graine: 'depart' });
    assert.ok(placeDeDepart(p, 0, 0).x < 1, 'les bleus n\'entrent pas par la gauche');
    assert.ok(placeDeDepart(p, 1, 0).x > p.largeur - 2, 'les orange n\'entrent pas par la droite');
    // AU CENTRE D'UNE CASE, et non sur son coin : ce sont des ronds.
    assert.equal(placeDeDepart(p, 0, 0).x % 1, 0.5);
    assert.equal(placeDeDepart(p, 0, 0).y % 1, 0.5);
    // ET QUINZE ÉLÈVES PAR ÉQUIPE TIENNENT, en débordant sur une seconde
    // colonne : une classe de trente sur huit lignes ne tient pas sur un bord.
    const places = Array.from({ length: 15 }, (_, i) => placeDeDepart(p, 0, i));
    assert.equal(new Set(places.map(q => q.x + ':' + q.y)).size, 15,
        'deux élèves démarrent au même endroit');
    for (const q of places) {
        assert.ok(q.x > 0 && q.x < p.largeur && q.y > 0 && q.y < p.hauteur);
    }
});

/* ──────────────────────────── LE MODE DÉMO ─────────────────────────────── */

// RÉMY : « et j'aimerai bien un mode démo ». Il est indispensable et pas
// seulement confortable : un jeu à trente ne se regarde pas tout seul, et sans
// robots Rémy ne peut PAS voir son propre jeu avant de le lancer en classe.

test('LE ROBOT VISE UNE CIBLE ET S\'EN APPROCHE', () => {
    const p = dessinerLePlateau({ graine: 'robot', combien: 6 });
    const robot = { id: 'r', x: 0, y: 0, nombre: 2, equipe: 0 };
    // D'ABORD IL PREND LE BON NOMBRE, ensuite il marche. Les deux coups sont
    // séparés exprès : dans le style « question », c'est le moment où l'élève
    // doit répondre pour mériter son nombre.
    let coup = coupDuRobot(robot, p, [], [], () => 0);
    assert.ok(coup, 'le robot ne joue pas');
    if (coup.devenir) {
        assert.ok(NOMBRES.includes(coup.devenir));
        robot.nombre = coup.devenir;
        robot.vise = coup.vise;
        coup = coupDuRobot(robot, p, [], [], () => 0);
    }
    assert.ok(coup.vers || coup.attendre, JSON.stringify(coup));
    // ET IL ARRIVE. Deux cents images suffisent largement sur douze cases de
    // large : s'il n'arrive pas, c'est qu'il tourne en rond, et la démo
    // montrerait un jeu que personne ne joue.
    for (let n = 0; n < 400 && !coup.attendre; n++) {
        if (coup.vers) {
            Object.assign(robot,
                avancer(p, robot.x, robot.y, coup.vers.dx, coup.vers.dy, 1 / 60));
        }
        if (coup.vise !== undefined) robot.vise = coup.vise;
        coup = coupDuRobot(robot, p, [], [], () => 0);
        if (coup && coup.devenir) robot.nombre = coup.devenir;
    }
    assert.equal(coup.attendre, true, 'le robot n\'atteint jamais sa cible');
    assert.ok(cibleSous(p, robot.x, robot.y),
        'le robot s\'arrête ailleurs que sur un carré à prendre');
});

test('LE ROBOT NE VISE PAS UNE CIBLE DÉJÀ PRISE', () => {
    // Un robot qui camperait sur un nombre disparu ferait une démo figée —
    // et c'est exactement ce qu'on vient montrer à Rémy.
    const p = dessinerLePlateau({ graine: 'prises', combien: 4 });
    const toutesSaufUne = p.cibles.slice(0, -1).map(c => c.i);
    const restante = p.cibles[p.cibles.length - 1];
    const robot = { id: 'r', x: 0, y: 0, nombre: 2, equipe: 0 };
    const coup = coupDuRobot(robot, p, [], toutesSaufUne, () => 0);
    assert.ok(coup, 'le robot abandonne alors qu\'il reste une cible');
    assert.equal(coup.vise, restante.i);
});

test('ET QUAND TOUT EST PRIS, IL NE JOUE PLUS', () => {
    const p = dessinerLePlateau({ graine: 'fini', combien: 4 });
    const robot = { id: 'r', x: 0, y: 0, nombre: 2, equipe: 0 };
    assert.equal(coupDuRobot(robot, p, [], p.cibles.map(c => c.i), () => 0), null);
});

test('LE ROBOT REGARDE QUI EST DÉJÀ SUR LA CASE, comme l\'élève', () => {
    // S'il ignorait les présents, il deviendrait un nombre déjà porté et la
    // prise n'arriverait jamais — on verrait trois pions attendre sur un 56
    // sans que rien ne se passe, ce qui est le pire écran possible.
    const p = { graine: 'x', largeur: 9, hauteur: 5, operation: '×',
                cibles: [{ i: 0, x: 4, y: 2, valeur: 56 }] };
    const robot = { id: 'r', x: 4.5, y: 2.5, nombre: 3, equipe: 0, vise: 0 };
    const dejaLa = [{ id: 'a', x: 4.2, y: 2.8, nombre: 7, equipe: 0 }];
    const coup = coupDuRobot(robot, p, dejaLa, [], () => 0);
    assert.equal(coup.devenir, 8, 'le robot ne complète pas le 7 présent');
});

test('LES VALEURS POSSIBLES SONT CELLES DES TABLES, pas des nombres de fantaisie', () => {
    const fois = valeursPossibles('×');
    assert.ok(fois.includes(56) && fois.includes(81) && fois.includes(4));
    assert.ok(!fois.includes(11), '11 n\'est le produit d\'aucun couple de 2 à 9');
    const plus = valeursPossibles('+');
    assert.equal(plus[0], 4, 'la plus petite somme est 2 + 2');
    assert.equal(plus[plus.length - 1], 18, 'la plus grande est 9 + 9');
});

/* ──────────────────── SUR QUOI ON JOUE : LE CHAPITRE ───────────────────── */

// RÉMY, quand je lui ai demandé par quoi améliorer le jeu : « Choisir ce qu'on
// travaille ». C'était le manque le plus coûteux — dans tout le reste du
// logiciel il choisit le chapitre, et le plateau tirait dans les huit tables
// mélangées. Un jeu qu'on ne peut pas accorder à sa séance reste une
// récréation.

test('LA TABLE DE 7 NE POSE QUE DES MULTIPLES DE 7', () => {
    const p = dessinerLePlateau({ graine: 'sept', combien: 12, quoi: { tables: [7] } });
    assert.ok(p.cibles.length >= 6, `${p.cibles.length} carré(s) seulement`);
    // ET PLUSIEURS VALEURS DIFFÉRENTES. Sans cette ligne, un filtre qui
    // exigerait que les DEUX facteurs soient dans la table passerait : il ne
    // laisserait que 49, qui est bien un multiple de 7 — et le plateau entier
    // ne porterait qu'un seul nombre, huit fois. `epreuveTombe` l'a dit.
    assert.ok(new Set(p.cibles.map(c => c.valeur)).size >= 3,
        `un seul nombre sur tout le plateau : ${JSON.stringify(p.cibles.map(c => c.valeur))}`);
    for (const c of p.cibles) {
        assert.equal(c.valeur % 7, 0, `${c.valeur} n'est pas dans la table de 7`);
        // ET IL RESTE PRENABLE À DEUX : 7 × k, avec k entre 2 et 9.
        assert.ok(decompositions(c.valeur, '×').some(v => v.length === 2 && v.includes(7)),
            `${c.valeur} ne se prend pas avec un 7`);
    }
});

test('ET « LES TABLES DURES » EN POSE DE TROIS TABLES À LA FOIS', () => {
    const p = dessinerLePlateau({ graine: 'dures', combien: 14, quoi: { tables: [6, 7, 8] } });
    for (const c of p.cibles) {
        assert.ok([6, 7, 8].some(t => c.valeur % t === 0 && c.valeur / t >= 2 && c.valeur / t <= 9),
            `${c.valeur} n'appartient à aucune des trois tables`);
    }
});

test('« LES GRANDS NOMBRES » NE POSE RIEN SOUS LE SEUIL', () => {
    const p = dessinerLePlateau({ graine: 'gros', combien: 10, quoi: { mini: 50 } });
    assert.ok(p.cibles.length >= 5);
    for (const c of p.cibles) assert.ok(c.valeur >= 50, `${c.valeur} est sous le seuil`);
});

test('UN FILTRE QUI NE LAISSE RIEN NE REND PAS UN PLATEAU VIDE', () => {
    // LA GARDE LA MOINS INTÉRESSANTE À ÉCRIRE ET LA PLUS COÛTEUSE À OUBLIER :
    // un plateau sans un seul carré, c'est trente élèves devant un damier mort,
    // et aucune erreur nulle part pour le dire.
    const p = dessinerLePlateau({ graine: 'vide', combien: 10, quoi: { mini: 9999 } });
    assert.ok(p.cibles.length >= 5, 'le plateau est vide');
    // ET CE SONT DE VRAIS NOMBRES. C'est ici que l'épreuve mordait dans le
    // vide : sans ce contrôle, un plateau de dix carrés portant `undefined`
    // passait — il avait le bon NOMBRE de carrés, et pas un seul lisible.
    for (const c of p.cibles) {
        assert.ok(Number.isFinite(c.valeur) && c.valeur >= 4,
            `carré illisible : ${JSON.stringify(c)}`);
    }
    assert.deepEqual(valeursPossibles('×', { tables: [] }), valeursPossibles('×'),
        'une liste de tables vide doit valoir « toutes »');
});

test('DEUX RÉGLAGES DIFFÉRENTS NE DONNENT PAS LE MÊME TERRAIN', () => {
    // LA GRAINE PORTE LE FILTRE. Sans cela, « Rejouer » après avoir changé de
    // table rendrait exactement le même plateau, et le professeur croirait le
    // réglage cassé.
    const a = dessinerLePlateau({ graine: 'x', quoi: { tables: [7] } });
    const b = dessinerLePlateau({ graine: 'x', quoi: { tables: [8] } });
    // LES VALEURS CHANGERAIENT DE TOUTE FAÇON, puisqu'on ne tire pas dans la
    // même liste : ce n'est donc PAS ce qu'il faut mesurer, et l'épreuve ne
    // gardait rien tant qu'elle s'en contentait. Ce que la graine achète, ce
    // sont les PLACES : sans elle, deux réglages donnent le même terrain avec
    // d'autres nombres dessus, et le professeur croit le réglage cassé.
    const places = (p) => p.cibles.map(c => `${c.x},${c.y}`).join(' ');
    assert.notEqual(places(a), places(b),
        'les deux réglages posent leurs carrés exactement aux mêmes endroits');
});

test('LES NOMBRES DE DÉPART SERVENT SUR CE PLATEAU-LÀ', () => {
    // Sur un plateau de grands nombres, démarrer avec un 2 n'ouvre presque
    // rien : la partie commencerait par trente changements de nombre avant le
    // premier geste.
    const p = dessinerLePlateau({ graine: 'utiles', combien: 10, quoi: { mini: 50 } });
    const utiles = nombresUtiles(p);
    assert.ok(utiles.length >= 2, JSON.stringify(utiles));
    for (const n of utiles) assert.ok(NOMBRES.includes(n));
    // ET CHACUN SERT VRAIMENT : il compose au moins un carré posé.
    for (const n of utiles) {
        assert.ok(p.cibles.some(c =>
            decompositions(c.valeur, '×').some(v => v.includes(n))),
            `${n} ne compose aucun carré`);
    }
    // LE CLAVIER DES « deviens », LUI, GARDE TOUT : qu'un 5 ne serve à rien sur
    // la table de 7 est une découverte qui vaut mieux qu'un bouton grisé.
    assert.equal(NOMBRES.length, 8);
});

/* ─────────────────────── SE TROMPER COÛTE QUELQUE CHOSE ────────────────── */

// RÉMY : « si on se trompe on a une pénalité ».

test('LES QUATRE PÉNALITÉS DISENT CE QU\'ELLES COÛTENT', () => {
    assert.deepEqual(coutDeLErreur('aucune'), { fige: 0, points: 0 });
    assert.deepEqual(coutDeLErreur('fige'), { fige: 4, points: 0 });
    assert.deepEqual(coutDeLErreur('points'), { fige: 0, points: 20 });
    assert.deepEqual(coutDeLErreur('deux'), { fige: 4, points: 20 });
    // UN RÉGLAGE INCONNU NE PUNIT PAS. Une valeur mal recopiée dans un
    // déroulant ne doit pas figer toute la classe pour une durée inventée.
    assert.deepEqual(coutDeLErreur('n\'importe quoi'), PENALITES.aucune);
    assert.deepEqual(coutDeLErreur(undefined), PENALITES.aucune);
});

test('UN SCORE NE DESCEND JAMAIS SOUS ZÉRO', () => {
    // CE N'EST PAS DE LA GENTILLESSE : une équipe à −40 au tableau, devant la
    // classe, désigne un groupe d'élèves comme étant en dessous de rien. Zéro
    // dit la même chose sans l'humilier — et c'est la règle que Rémy a déjà
    // posée pour le défi, où l'on n'écrit jamais « perdu ».
    assert.equal(scoreApresPenalite(100, 20), 80);
    assert.equal(scoreApresPenalite(10, 20), 0);
    assert.equal(scoreApresPenalite(0, 20), 0);
    assert.equal(scoreApresPenalite(50, 0), 50);
});
