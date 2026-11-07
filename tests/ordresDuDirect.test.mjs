// DANS QUEL ORDRE LE MUR RANGE LES ÉLÈVES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois fois sur le même écran :
//
//   « pour le direct ce serait bien de pouvoir faire le tri au nom et pas à
//     celui qui est connecté »
//   « le tri n'arrête pas de changer sur le mur c'est compliqué de s'y
//     retrouver il faudrait qqch de fixe »
//   « pour le mur en direct as tu mis les options de tri ? (soit progression,
//     soit actualisation, ou nom) »
//
// MESURÉ avant d'y toucher : il y en avait DEUX — « par nom » et « ceux qu'il
// faut voir ». Les deux qu'il nomme aujourd'hui, progression et actualisation,
// n'existaient pas.
//
// ── CE QU'ON GARDE, ET POURQUOI CHAQUE LIGNE EST LÀ ────────────────────────
//
// LA STABILITÉ AVANT TOUT. « Il faudrait qqch de fixe » n'est pas un confort :
// un mur qui se réarrange sous les yeux pendant qu'on y cherche un prénom est
// un mur qu'on cesse de regarder. Chaque ordre doit donc départager ses
// égalités — sans quoi vingt élèves à zéro permutent à chaque battement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    ORDRES_DU_DIRECT, trieurDuDirect,
    trierParNom, trierParProgression, trierParActualisation
} from '../js/core/vigilance.js';

// LES UNITÉS SONT CELLES DU SERVEUR, ET ELLES NE SONT PAS LES MÊMES.
//
// `maintenant` est en SECONDES (c'est l'heure du serveur), `eleve.vu` aussi, et
// `eleve.quand` en MILLISECONDES — `silenceDe` fait la division. Ma première
// fixture posait `vu` et un `derniereActivite` inventé : `silenceDe` les
// ignorait, tous les silences valaient 0, et l'ordre retombait sur le nom.
// L'épreuve accusait le code d'un défaut qui était dans la mesure.
const MAINTENANT = 1_700_000_000;          // secondes
const MIN = 60;                            // secondes

/** Un élève du mur, tel que le serveur le rend. */
function eleve(prenom, { fraction = 0, etat = 'en-cours', silence = 0 } = {}) {
    return {
        id: 'e_' + prenom.toLowerCase(),
        prenom,
        vu: MAINTENANT - silence,
        quand: (MAINTENANT - silence) * 1000,
        avancement: etat === 'rien' ? null : { etat, fraction, etapes: 4, faites: Math.round(fraction * 4) }
    };
}

test('LES QUATRE ORDRES QUE RÉMY NOMME SONT LÀ', () => {
    const cles = ORDRES_DU_DIRECT.map(o => o.cle);
    for (const attendu of ['nom', 'progression', 'actualisation']) {
        assert.ok(cles.includes(attendu),
            `« ${attendu} » manque : Rémy l'a nommé, l'écran doit l'offrir`);
    }
    // « Ceux qu'il faut voir » existait avant et ne part pas : c'est le seul
    // qui range par ce qui APPELLE un geste.
    assert.ok(cles.includes('urgence'));

    // Chaque ordre a un mot en français : c'est le texte du bouton, et un
    // bouton sans mot est un bouton qu'on ne clique pas.
    for (const o of ORDRES_DU_DIRECT) {
        assert.equal(typeof o.mot, 'string');
        assert.ok(o.mot.length > 3, `« ${o.cle} » n'a pas de libellé lisible`);
        assert.equal(typeof o.trier, 'function', `« ${o.cle} » n'a pas de trieur`);
    }
});

test('LE DÉFAUT RESTE « PAR NOM » — c\'est Rémy qui l\'a tranché', () => {
    // `trieurDuDirect` retombe sur le PREMIER de la liste quand la clef est
    // inconnue (un réglage d'une version précédente, un stockage abîmé). Ce
    // premier doit donc être celui qui ne bouge pas.
    assert.equal(ORDRES_DU_DIRECT[0].cle, 'nom',
        'le repli doit être l\'ordre fixe : « le tri n\'arrête pas de changer »');
    assert.equal(trieurDuDirect('clef-inconnue'), trierParNom);
    assert.equal(trieurDuDirect(undefined), trierParNom);
});

test('CHAQUE CLEF REND SON PROPRE TRIEUR', () => {
    assert.equal(trieurDuDirect('nom'), trierParNom);
    assert.equal(trieurDuDirect('progression'), trierParProgression);
    assert.equal(trieurDuDirect('actualisation'), trierParActualisation);
    // Et deux clefs différentes ne rendent pas le même : un bouton qui ne
    // change rien est pire qu'un bouton absent.
    const vus = new Set(ORDRES_DU_DIRECT.map(o => trieurDuDirect(o.cle)));
    assert.equal(vus.size, ORDRES_DU_DIRECT.length, 'deux ordres partagent un trieur');
});

test('PAR PROGRESSION : DU PLUS AVANCÉ AU MOINS AVANCÉ', () => {
    // LE SENS EST UTILE, et il n'est pas arbitraire : en fin d'heure, le
    // professeur cherche qui a fini pour lui donner la suite. L'ordre inverse
    // mettrait en haut les absents, qui n'appellent aucun geste — le défaut
    // qu'on avait déjà corrigé sur « ceux qu'il faut voir ».
    const liste = [
        eleve('Alice', { fraction: 0.2 }),
        eleve('Bruno', { etat: 'fini', fraction: 1 }),
        eleve('Chloé', { etat: 'rien' }),
        eleve('David', { fraction: 0.75 })
    ];
    const ordre = trierParProgression(liste, MAINTENANT).map(v => v.eleve.prenom);
    assert.deepEqual(ordre, ['Bruno', 'David', 'Alice', 'Chloé']);
});

test('PAR ACTIVITÉ RÉCENTE : LE PLUS FRAIS EN HAUT', () => {
    const liste = [
        eleve('Alice', { silence: 12 * MIN }),
        eleve('Bruno', { silence: 30 }),
        eleve('Chloé', { silence: 5 * MIN })
    ];
    const ordre = trierParActualisation(liste, MAINTENANT).map(v => v.eleve.prenom);
    assert.deepEqual(ordre, ['Bruno', 'Chloé', 'Alice']);
});

test('AUCUN ORDRE NE PERMUTE DEUX ÉLÈVES À ÉGALITÉ', () => {
    // LE DÉFAUT QUE RÉMY A SIGNALÉ EN CLASSE : « le tri n'arrête pas de changer
    // sur le mur ». Vingt élèves à zéro, et un `sort` qui ne les départage pas,
    // c'est un mur qui se réarrange à chaque battement — toutes les cinq
    // secondes — pendant qu'on y cherche un prénom.
    //
    // On mesure sur le cas réel : une classe qui n'a pas encore commencé.
    const classe = ['Zoé', 'Alice', 'Noé', 'Bruno', 'Maïa']
        .map(p => eleve(p, { etat: 'rien' }));
    for (const o of ORDRES_DU_DIRECT) {
        const une = o.trier(classe, MAINTENANT).map(v => v.eleve.prenom);
        // On remet la liste dans un autre ordre d'arrivée — c'est ce que fait
        // le serveur d'un rafraîchissement à l'autre — et l'on doit retrouver
        // exactement le même rangement.
        const deux = o.trier([...classe].reverse(), MAINTENANT).map(v => v.eleve.prenom);
        assert.deepEqual(deux, une,
            `« ${o.mot} » range différemment la même classe selon l'ordre d'arrivée`);
    }
});

test('UN ÉLÈVE SANS AVANCEMENT NE FAIT TOMBER AUCUN ORDRE', () => {
    // Un élève qui n'a rien ouvert, un autre dont le serveur n'a pas encore
    // envoyé l'avancement : c'est l'état de toute la classe à la minute où
    // l'heure commence, et c'est là que le professeur regarde le mur.
    const bancals = [
        eleve('Alice', { etat: 'rien' }),
        { id: 'e_vide', prenom: 'Vide' },
        { id: 'e_nul', prenom: 'Nul', avancement: null, vu: null, quand: null }
    ];
    for (const o of ORDRES_DU_DIRECT) {
        const rangee = o.trier(bancals, MAINTENANT);
        assert.equal(rangee.length, 3, `« ${o.mot} » a perdu un élève`);
        assert.ok(rangee.every(v => v.eleve && v.eleve.prenom), `« ${o.mot} » rend une ligne vide`);
    }
});

test('CHAQUE ORDRE REND LA MÊME CLASSE, SANS EN PERDRE NI EN INVENTER', () => {
    // Un tri n'est pas un filtre. Le jour où l'un d'eux écarterait les absents
    // « pour faire propre », un élève disparaîtrait du mur de son professeur.
    const classe = [
        eleve('Alice', { fraction: 0.5 }),
        eleve('Bruno', { etat: 'rien', silence: 40 * MIN }),
        eleve('Chloé', { etat: 'fini', fraction: 1 }),
        eleve('David', { fraction: 0.1, silence: 9 * MIN })
    ];
    const attendus = classe.map(e => e.prenom).sort();
    for (const o of ORDRES_DU_DIRECT) {
        const noms = o.trier(classe, MAINTENANT).map(v => v.eleve.prenom).sort();
        assert.deepEqual(noms, attendus, `« ${o.mot} » ne rend pas toute la classe`);
    }
});
