// LA FICHE D'UN ÉLÈVE, PENDANT L'HEURE.
//
// Rémy : « dans le direct, il faut aussi pouvoir cliquer sur l'élève, voir où
// il en est, rendre facultatif un exercice. En fait s'il bloque il risque de
// passer trop de temps. »
//
// CE QUI SE VÉRIFIE ICI EST CE QU'ON LIT EN DIX SECONDES, DEBOUT. Une fiche qui
// se trompe d'étape fait dire « continue » à quelqu'un qui devrait revenir en
// arrière ; une fiche qui ne distingue pas « lent » de « planté » fait aller
// voir le mauvais élève. Ce sont les deux erreurs que cet écran doit empêcher.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ficheDeLEleve, gestesPossibles, pourquoiDebloquer, ETATS
} from '../js/core/ficheEleve.js';

const MAINTENANT = 1_700_000_000;          // en secondes, comme le serveur

/** Un élève du direct, avec son avancement déjà projeté par le serveur. */
const unEleve = (o = {}) => ({
    id: o.id || 'e1',
    prenom: o.prenom || 'Léa',
    vu: o.vu === undefined ? MAINTENANT - 5 : o.vu,
    ecarte: !!o.ecarte,
    exo: o.exo === undefined ? 'calc-add' : o.exo,
    justes: o.justes || 0,
    total: o.total || 0,
    quand: o.quand === undefined ? (MAINTENANT - 20) * 1000 : o.quand,
    avancement: o.avancement === undefined ? {
        pathName: 'Devoir du mardi',
        etat: 'en-cours',
        etapes: 5,
        faites: 2,
        detailEtapes: [true, false],
        etapeEnCours: { rang: 2, titre: 'Le Serpent Littéral', posees: 4, prevues: 8, justes: 3 },
        questions: 12, prevues: 30, justes: 9,
        fraction: 0.4
    } : o.avancement
});

// ──────────────────────────────────────────────────────── OÙ IL EN EST ──────

test('LA FICHE DIT L\'ÉTAPE, SUR COMBIEN, ET LAQUELLE', () => {
    // C'est ce dont on parle en arrivant près de lui : « tu en es où ? — étape
    // trois ». Un pourcentage ne se dit pas à voix haute.
    const f = ficheDeLEleve(unEleve(), MAINTENANT);
    assert.equal(f.ou, 'Étape 3 sur 5 — Le Serpent Littéral');
    assert.equal(f.parcours, 'Devoir du mardi');
    assert.equal(f.question, '4 questions sur 8 · 3 justes');
});

test('`rang` COMPTE LES ÉTAPES CLOSES : la courante est la suivante', () => {
    // Le piège du décalage. Avec deux étapes closes, il est à la TROISIÈME —
    // annoncer « étape 2 » l'enverrait refaire ce qu'il vient de finir.
    const f = ficheDeLEleve(unEleve({
        avancement: {
            pathName: 'P', etat: 'en-cours', etapes: 3, faites: 0, detailEtapes: [],
            etapeEnCours: { rang: 0, titre: 'Additions', posees: 1, prevues: 6, justes: 1 }
        }
    }), MAINTENANT);
    assert.equal(f.ou, 'Étape 1 sur 3 — Additions');
});

test('les trois états sans étape en cours se disent chacun', () => {
    assert.equal(ficheDeLEleve(unEleve({ avancement: null }), MAINTENANT).ou, 'Pas commencé');
    assert.equal(ficheDeLEleve(unEleve({
        avancement: { etat: 'fini', etapes: 4, faites: 4, detailEtapes: [true, true, true, true] }
    }), MAINTENANT).ou, 'A terminé');
    assert.equal(ficheDeLEleve(unEleve({
        avancement: { etat: 'abandonne', etapes: 4, faites: 1, detailEtapes: [true] }
    }), MAINTENANT).ou, 'A quitté en cours de route');
});

// ─────────────────────────────────────────────────────── CE QU'IL A FAIT ────

test('UNE ÉTAPE RATÉE NE SE CONFOND PAS AVEC UNE RÉUSSIE', () => {
    // Sur une barre, les deux se ressemblent. Dire « continue » à un élève qui
    // vient de rater l'étape d'avant, c'est l'enfoncer — et c'est exactement ce
    // que le professeur fait s'il ne voit qu'un pourcentage.
    const f = ficheDeLEleve(unEleve(), MAINTENANT);
    assert.deepEqual(f.etapes.map(e => e.etat), [
        ETATS.REUSSIE, ETATS.RATEE, ETATS.EN_COURS, ETATS.A_VENIR, ETATS.A_VENIR
    ]);
    assert.deepEqual(f.etapes.map(e => e.rang), [1, 2, 3, 4, 5]);
});

test('ON MONTRE TOUTES LES CASES, y compris celles à venir', () => {
    // « Étape 3 sur 5 » ne veut rien dire si l'on ne voit pas les cinq cases :
    // c'est la longueur du chemin restant qui décide si l'on dispense ou non.
    const f = ficheDeLEleve(unEleve(), MAINTENANT);
    assert.equal(f.etapes.length, 5);
    assert.equal(ficheDeLEleve(unEleve({ avancement: null }), MAINTENANT).etapes.length, 0);
});

// ──────────────────────────────────────── DEPUIS COMBIEN DE TEMPS, ET TROP ──

test('« IL RISQUE DE PASSER TROP DE TEMPS » EST UN BOOLÉEN, pas une impression', () => {
    // La demande de Rémy, littéralement. On reprend le seuil de la vigilance —
    // dix minutes — plutôt que d'en inventer un second : deux seuils pour la
    // même idée finissent par se contredire.
    const calme = ficheDeLEleve(unEleve(), MAINTENANT);
    assert.equal(calme.trop, false, '20 secondes de silence, ce n\'est rien');

    const plante = ficheDeLEleve(
        unEleve({ quand: (MAINTENANT - 11 * 60) * 1000 }), MAINTENANT);
    assert.equal(plante.trop, true);
    assert.equal(plante.etat, 'bloque');
    assert.match(plante.silenceDit, /min/);
});

test('UNE CLASSE EN PAUSE NE BLOQUE PERSONNE', () => {
    // Le professeur explique au tableau : personne ne répond, c'est le but.
    // Trente élèves « bloqués » à ce moment-là feraient éteindre la fonction.
    const f = ficheDeLEleve(unEleve({ quand: (MAINTENANT - 20 * 60) * 1000 }),
        MAINTENANT, { enPause: true });
    assert.equal(f.trop, false);
    assert.equal(f.etat, 'ok');
});

test('un élève qui a fini n\'est jamais « bloqué »', () => {
    // Son dernier événement date de l'heure d'avant : sans cette garde, tout
    // élève ayant terminé finirait en alarme rouge.
    const f = ficheDeLEleve(unEleve({
        quand: (MAINTENANT - 30 * 60) * 1000,
        avancement: { etat: 'fini', etapes: 2, faites: 2, detailEtapes: [true, true] }
    }), MAINTENANT);
    assert.equal(f.trop, false);
    assert.equal(f.fini, true);
});

// ───────────────────────────────────────────────── CE QU'ON PEUT FAIRE ──────

test('ON NE PROPOSE PAS UN GESTE QUI N\'AURAIT PAS D\'OBJET', () => {
    // « Laisse tomber cet exercice » sans exercice en cours ne dispense de
    // rien, et un bouton qui ne fait rien fait douter de tout l'écran.
    const surUnExo = gestesPossibles(ficheDeLEleve(unEleve(), MAINTENANT));
    assert.deepEqual(surUnExo, { mot: true, indice: true, debloquer: true, rouvrir: false });

    const sansExo = gestesPossibles(ficheDeLEleve(
        unEleve({ exo: null, avancement: null }), MAINTENANT));
    assert.equal(sansExo.mot, true, 'on peut toujours écrire à quelqu\'un');
    assert.equal(sansExo.indice, false);
    assert.equal(sansExo.debloquer, false);
});

test('ROUVRIR L\'ACCÈS SE PROPOSE LÀ OÙ ON SE POSE LA QUESTION', () => {
    // C'est en le voyant à l'arrêt dans le direct qu'on se souvient qu'on l'a
    // mis de côté.
    const f = ficheDeLEleve(unEleve({ ecarte: true }), MAINTENANT);
    assert.equal(f.ecarte, true);
    assert.equal(gestesPossibles(f).rouvrir, true);
});

test('ON DIT POURQUOI ON PROPOSERAIT DE LE DISPENSER — ou l\'on se tait', () => {
    // Le bouton existe toujours ; la phrase n'apparaît que quand la situation
    // la justifie. On dit ce qu'on a vu, on ne décide pas à sa place.
    assert.equal(pourquoiDebloquer(ficheDeLEleve(unEleve(), MAINTENANT)), '');
    const plante = ficheDeLEleve(unEleve({ quand: (MAINTENANT - 12 * 60) * 1000 }), MAINTENANT);
    assert.match(pourquoiDebloquer(plante), /^Bloqué depuis .+ sur le même exercice\.$/);
});

test('une fiche vide ne casse pas l\'écran', () => {
    const f = ficheDeLEleve(null, MAINTENANT);
    assert.equal(f.ou, 'Pas commencé');
    assert.deepEqual(f.etapes, []);
    assert.equal(f.question, '');
    assert.deepEqual(gestesPossibles(null), {
        mot: false, indice: false, debloquer: false, rouvrir: false
    });
    assert.equal(pourquoiDebloquer(null), '');
});
