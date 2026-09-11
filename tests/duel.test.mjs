import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    creerPartie, servir, repondre, manquer, pointSuivant, dureeVol, frappe,
    longueurReponse, tablesValides, composerFrappe,
    VOL_DEPART, VOL_MINIMUM, ACCELERATION, ECHAUFFEMENT, RYTHMES, RYTHME_DEFAUT
} from '../js/core/duel.js';
import { makeRng } from '../js/core/ids.js';

const alea = (graine) => { const r = makeRng(graine); return () => r.next(); };

function partie(opts = {}, graine = 'd') {
    const p = creerPartie({ tables: [7], cible: 3, ...opts });
    return { p, rng: alea(graine) };
}

test('les tables données par le professeur sont nettoyées, jamais vides', () => {
    assert.deepEqual(tablesValides([7, 3, 7, 99, 'x', 5]), [3, 5, 7]);
    assert.deepEqual(tablesValides([]), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(tablesValides(null), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('le service part vers l\'adversaire, jamais vers soi', () => {
    const { p, rng } = partie();
    p.serveur = 0;
    servir(p, 7, rng);
    assert.equal(p.defenseur, 1);
    assert.equal(p.phase, 'echange');
    assert.ok(p.balle && typeof p.balle.reponse === 'number');
});

test('une bonne réponse renvoie la balle à l\'autre : les deux calculent', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);
    const cotes = [p.defenseur];
    for (let i = 0; i < 6; i++) {
        const r = repondre(p, p.balle.reponse, rng);
        assert.equal(r.bon, true);
        assert.equal(r.point, null);
        cotes.push(p.defenseur);
    }
    assert.deepEqual(cotes, [1, 0, 1, 0, 1, 0, 1], 'la balle doit alterner à chaque frappe');
    assert.equal(p.echange, 6);
});

test('chaque énoncé se calcule bien dans la table demandée', () => {
    for (const ops of [['mul'], ['div'], ['mul', 'div']]) {
        const { p, rng } = partie({ tables: [8], operations: ops }, 'o' + ops.join());
        servir(p, 8, rng);
        for (let i = 0; i < 40; i++) {
            const { texte, reponse } = p.balle;
            const m = texte.match(/^(\d+) ([×÷]) (\d+)$/);
            assert.ok(m, `énoncé illisible : ${texte}`);
            const [, g, signe, d] = m;
            const attendu = signe === '×' ? Number(g) * Number(d) : Number(g) / Number(d);
            assert.equal(reponse, attendu, `${texte} devrait valoir ${attendu}`);
            assert.ok(Number.isInteger(reponse) && reponse > 0, `réponse impossible : ${texte}`);
            repondre(p, reponse, rng);
        }
    }
});

test('jamais deux fois le même énoncé d\'affilée', () => {
    const { p, rng } = partie({ tables: [2] }, 'r');
    servir(p, 2, rng);
    let precedent = p.balle.texte;
    for (let i = 0; i < 60; i++) {
        repondre(p, p.balle.reponse, rng);
        assert.notEqual(p.balle.texte, precedent, 'un énoncé répété se recopie au lieu de se calculer');
        precedent = p.balle.texte;
    }
});

test('une réponse fausse donne le point à l\'attaquant, avec le détail de l\'erreur', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);            // défenseur = 1
    const attendu = p.balle.reponse;
    const r = repondre(p, attendu + 1, rng);
    assert.equal(r.bon, false);
    assert.equal(r.point.pour, 0);
    assert.equal(r.point.contre, 1);
    assert.equal(r.point.raison, 'faux');
    assert.equal(r.point.attendu, attendu);
    assert.equal(r.point.donne, attendu + 1);
    assert.deepEqual(p.score, [1, 0]);
});

test('une balle non renvoyée à temps donne aussi le point', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);
    const pt = manquer(p);
    assert.equal(pt.raison, 'trop lent');
    assert.equal(pt.pour, 0);
    assert.deepEqual(p.score, [1, 0]);
    assert.equal(manquer(p), null, 'un point ne se marque pas deux fois');
});

test('le perdant du point sert : le duel se rattrape', () => {
    const { p, rng } = partie();
    p.serveur = 0;
    servir(p, 7, rng);
    repondre(p, -1, rng);                     // le joueur 1 se trompe
    assert.equal(p.serveur, 1, 'le perdant reprend la main');
    pointSuivant(p);
    assert.equal(p.phase, 'service');
    servir(p, 7, rng);
    assert.equal(p.defenseur, 0);
});

test('la partie se termine au score cible, et rien ne bouge après', () => {
    const { p, rng } = partie({ cible: 2 });
    servir(p, 7, rng); manquer(p);
    pointSuivant(p); servir(p, 7, rng);
    // Le perdant sert : c'est donc le joueur 1 qui sert et le 0 qui défend.
    manquer(p);
    assert.deepEqual(p.score, [1, 1]);
    pointSuivant(p); servir(p, 7, rng); manquer(p);
    assert.equal(p.phase, 'fini');
    assert.ok(p.gagnant === 0 || p.gagnant === 1);
    assert.equal(p.score[p.gagnant], 2);
    const fige = [...p.score];
    servir(p, 7, rng);
    assert.deepEqual(p.score, fige, 'une partie finie ne se rejoue pas toute seule');
});

test('la balle accélère à chaque frappe, sans jamais devenir indevinable', () => {
    const { p, rng } = partie();
    const r = RYTHMES[p.rythme];
    // Score vierge : c'est le point d'échauffement, la balle part plus lentement.
    servir(p, 7, rng);
    assert.equal(dureeVol(p), Math.round(r.depart * ECHAUFFEMENT));
    const vols = [dureeVol(p)];
    for (let i = 0; i < 60; i++) { repondre(p, p.balle.reponse, rng); vols.push(dureeVol(p)); }
    for (let i = 1; i < vols.length; i++) {
        assert.ok(vols[i] <= vols[i - 1], 'la balle ne doit jamais ralentir dans un échange');
    }
    assert.equal(vols[1], Math.round(r.depart * ECHAUFFEMENT * r.acceleration));
    assert.equal(vols[vols.length - 1], r.minimum, 'le plancher doit être atteint et tenu');
});

test('l\'échauffement ne dure que le premier point', () => {
    const { p, rng } = partie();
    const r = RYTHMES[p.rythme];
    servir(p, 7, rng);
    const auDepart = dureeVol(p);
    // Un point marqué, et le duel prend son rythme.
    manquer(p);
    pointSuivant(p);
    servir(p, 7, rng);
    assert.equal(dureeVol(p), r.depart);
    assert.ok(auDepart > r.depart, 'la toute première balle doit être la plus lente');
    // Et la première balle reste largement au-dessus du plancher : le début
    // d'un point se calcule, il ne se devine pas.
    assert.ok(r.depart >= 2.5 * r.minimum);
});

// --- LE RYTHME EST UN RÉGLAGE -----------------------------------------------
//
// « C'est hyper rapide au départ ! ralentis » — deux fois. Une constante bien
// choisie ne peut pas convenir à tous les élèves : le rythme se règle, et le
// réglage par défaut est le plus lent.

test('TROIS RYTHMES ORDONNÉS, ET LE PLUS LENT PAR DÉFAUT', () => {
    const noms = ['tranquille', 'normal', 'rapide'];
    noms.forEach(n => assert.ok(RYTHMES[n], `rythme « ${n} » absent`));
    for (let i = 1; i < noms.length; i++) {
        const a = RYTHMES[noms[i - 1]], b = RYTHMES[noms[i]];
        assert.ok(b.depart < a.depart, `« ${noms[i]} » doit partir plus vite que « ${noms[i - 1]} »`);
        assert.ok(b.minimum < a.minimum, `« ${noms[i]} » doit descendre plus bas`);
        assert.ok(b.acceleration < a.acceleration, `« ${noms[i]} » doit accélérer plus fort`);
    }
    assert.equal(RYTHME_DEFAUT, 'tranquille');
    assert.equal(creerPartie({}).rythme, 'tranquille');
});

test('un rythme inconnu retombe sur le rythme par défaut', () => {
    const p = creerPartie({ rythme: 'supersonique' });
    assert.equal(p.rythme, RYTHME_DEFAUT);
    assert.equal(dureeVol(p), Math.round(RYTHMES[RYTHME_DEFAUT].depart * ECHAUFFEMENT));
});

test('le même échange va plus vite en « rapide » qu\'en « tranquille »', () => {
    const lent = creerPartie({ tables: [7], rythme: 'tranquille', serveur: 0 });
    const vif = creerPartie({ tables: [7], rythme: 'rapide', serveur: 0 });
    [lent, vif].forEach(p => servir(p, 7, alea('r')));
    assert.ok(dureeVol(vif) < dureeVol(lent));
});

// --- LE MODE COMPOSÉ ---------------------------------------------------------
//
// « Un mode où l'élève choisit son calcul genre 7×8 avec un clavier : on voit
// la brique qui se prépare et il la lance façon Pong ; l'autre en face doit
// mettre le résultat, sa brique se prépare, et même chose. »

test('EN MODE COMPOSÉ, C\'EST LE JOUEUR QUI FABRIQUE LA BRIQUE', () => {
    const p = creerPartie({ tables: [7, 8], envoi: 'compose', serveur: 0 });
    assert.equal(p.phase, 'composer', 'on commence par fabriquer, pas par choisir une table');
    assert.equal(p.attaquant, 0);
    const r = composerFrappe(p, 7, 8);
    assert.ok(r.ok);
    assert.equal(p.balle.texte, '7 × 8');
    assert.equal(p.balle.reponse, 56);
    assert.equal(p.phase, 'echange');
    assert.equal(p.defenseur, 1, 'la brique part vers l\'autre camp');
});

test('celui qui renvoie devient celui qui compose', () => {
    const p = creerPartie({ tables: [7, 8], envoi: 'compose', serveur: 0 });
    composerFrappe(p, 7, 8);
    const r = repondre(p, 56);
    assert.ok(r.bon);
    assert.equal(r.aComposer, true);
    assert.equal(p.phase, 'composer');
    assert.equal(p.attaquant, 1, 'celui qui vient de répondre attaque à son tour');
    assert.equal(p.balle, null, 'plus rien ne vole tant que la brique n\'est pas faite');
});

test('une brique se refuse hors des bornes ou hors des tables travaillées', () => {
    const p = creerPartie({ tables: [7], envoi: 'compose', serveur: 0 });
    assert.equal(composerFrappe(p, 1, 7).ok, false, '1 × n n\'est pas un calcul');
    assert.equal(composerFrappe(p, 13, 7).ok, false, 'au-delà des bornes');
    assert.equal(composerFrappe(p, 'x', 7).ok, false, 'ce qui n\'est pas un nombre');
    assert.equal(composerFrappe(p, 3, 4).ok, false, 'ni 3 ni 4 n\'est la table travaillée');
    assert.equal(p.phase, 'composer', 'un refus ne fait rien partir');
    assert.ok(composerFrappe(p, 4, 7).ok, 'il suffit qu\'UN des deux facteurs soit la table');
});

test('une faute en mode composé donne le point, et le perdant reprend la main', () => {
    const p = creerPartie({ tables: [7], envoi: 'compose', serveur: 0, cible: 5 });
    composerFrappe(p, 7, 8);
    const r = repondre(p, 54);
    assert.equal(r.bon, false);
    assert.equal(r.point.pour, 0);
    assert.equal(p.phase, 'point');
    pointSuivant(p);
    assert.equal(p.phase, 'composer', 'pas d\'écran de table en mode composé');
    assert.equal(p.attaquant, 1, 'le perdant du point sert, donc il compose');
});

test('en mode automatique, rien ne change : on choisit une table', () => {
    const p = creerPartie({ tables: [7], serveur: 0 });
    assert.equal(p.envoi, 'auto');
    assert.equal(p.phase, 'service');
    assert.equal(composerFrappe(p, 7, 8).ok, false, 'composer n\'a pas cours ici');
});

test('L\'ATTAQUANT EST TOUJOURS DÉSIGNABLE — c\'est lui que l\'écran montre', () => {
    // « Il faudrait aussi avoir un repère de l'élève qui envoie le calcul. »
    // L'écran ne peut le montrer que si l'état le dit : en mode automatique
    // aussi, et à chaque renvoi.
    const { p, rng } = partie();
    servir(p, 7, rng);
    assert.equal(p.attaquant, 0);
    assert.equal(p.defenseur, 1);
    for (let i = 0; i < 6; i++) {
        const avant = p.defenseur;
        repondre(p, p.balle.reponse, rng);
        assert.equal(p.attaquant, avant, 'celui qui vient de renvoyer est celui qui envoie');
        assert.equal(p.defenseur, 1 - avant);
    }
});

test('le pavé sait combien de chiffres attendre', () => {
    const { p, rng } = partie({ tables: [10] }, 'L');
    servir(p, 10, rng);
    assert.equal(longueurReponse(p), String(p.balle.reponse).length);
    manquer(p);
    assert.equal(longueurReponse(p), 0, 'sans balle, rien à valider');
});

test('une réponse arrivée hors échange ne change rien', () => {
    const { p, rng } = partie();
    assert.deepEqual(repondre(p, 42, rng), { bon: false, point: null });
    assert.deepEqual(p.score, [0, 0]);
});

test('la table servie est toujours l\'une de celles autorisées', () => {
    const { p, rng } = partie({ tables: [3, 9] }, 't');
    servir(p, 7, rng);            // 7 n'est pas autorisée
    assert.ok([3, 9].includes(p.table));
    servir(p, 9, rng);
    assert.equal(p.table, 9);
});

test('même graine, même suite d\'énoncés', () => {
    const a = partie({}, 'z'), b = partie({}, 'z');
    servir(a.p, 7, a.rng); servir(b.p, 7, b.rng);
    for (let i = 0; i < 10; i++) {
        assert.equal(a.p.balle.texte, b.p.balle.texte);
        repondre(a.p, a.p.balle.reponse, a.rng);
        repondre(b.p, b.p.balle.reponse, b.rng);
    }
});

test('frappe respecte la table courante quelle que soit l\'opération', () => {
    const p = creerPartie({ tables: [6], operations: ['mul', 'div'] });
    p.table = 6;
    const rng = alea('f');
    for (let i = 0; i < 50; i++) {
        const f = frappe(p, rng);
        const [g, , d] = f.texte.split(' ');
        assert.ok(Number(g) % 6 === 0 || Number(g) === 6,
            `${f.texte} ne relève pas de la table de 6`);
        assert.ok(Number(d) === 6 || Number(g) === 6);
    }
});
