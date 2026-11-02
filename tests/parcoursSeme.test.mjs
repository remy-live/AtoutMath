// LES PARCOURS SEMÉS — 31 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Quand je change le nom d'une épreuve ca le duplique ».
//
// MESURÉ avant d'écrire une ligne, par son chemin à lui : on renomme « Tout sur
// papier » en « Ma feuille de contrôle », on recharge, et la bibliothèque en
// contient DEUX. Le doublon n'apparaît pas au renommage mais à l'ouverture
// suivante — d'où l'impression que le logiciel fait n'importe quoi tout seul.
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · UN PARCOURS SEMÉ RENOMMÉ NE REVIENT PAS EN DOUBLE. C'est la demande.
//   · ET IL GARDE LE NOM QUE LE PROFESSEUR LUI A DONNÉ. Le remettre d'office
//     à chaque démarrage serait une autre façon de ne pas pouvoir renommer.
//   · SON CONTENU, LUI, SE REMET À JOUR : « Tout sur papier » n'a de sens que
//     s'il suit le catalogue.
//   · ET UNE BIBLIOTHÈQUE D'AVANT LA MARQUE EST ADOPTÉE, pas doublée — sans
//     quoi la correction elle-même aurait fabriqué le doublon qu'elle évite,
//     chez les seuls gens qui ont des données : ceux qui s'en servent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marqueDe, reposerUnParcoursSeme } from '../js/core/parcoursSeme.js';

/** Un état de bibliothèque réduit à ce que la règle touche. */
function faireUnEtat(entrees = []) {
    let n = 0;
    return {
        teacherPaths: entrees,
        saveTeacherPath(name, data, folderId = 'root') {
            const e = { id: `path_essai_${++n}`, name, data, folderId, timestamp: n };
            this.teacherPaths.unshift(e);
            return e;
        },
        updateTeacherPath(id, name, data) {
            const p = this.teacherPaths.find(x => x.id === id);
            if (!p) return;
            if (name) p.name = name;
            if (data) p.data = data;
            if (name && p.data && typeof p.data === 'object') p.data.name = name;
        }
    };
}

const papierDe = (combien) => ({
    id: 'path_papier', version: 2, name: `Tout sur papier (${combien} exercices)`,
    policy: {}, steps: Array.from({ length: combien }, (_, i) => ({ exerciseId: `e${i}` }))
});

test('UN PARCOURS SEMÉ SE POSE UNE FOIS, PUIS SE REMET À JOUR', () => {
    const state = faireUnEtat();
    const a = reposerUnParcoursSeme(state, {
        semence: 'papier', parcours: papierDe(3), motifHistorique: /^Tout sur papier/
    });
    assert.equal(a.quoi, 'cree');
    assert.equal(state.teacherPaths.length, 1);
    assert.equal(marqueDe(state.teacherPaths[0]), 'papier');

    // Le catalogue grandit : le contenu suit, et le nom aussi tant que c'est
    // le nom semé.
    const b = reposerUnParcoursSeme(state, {
        semence: 'papier', parcours: papierDe(5), motifHistorique: /^Tout sur papier/
    });
    assert.equal(b.quoi, 'remis');
    assert.equal(state.teacherPaths.length, 1, 'le semeur a fabriqué un doublon');
    assert.equal(state.teacherPaths[0].name, 'Tout sur papier (5 exercices)');
    assert.equal(state.teacherPaths[0].data.steps.length, 5);
});

test('RENOMMÉ, IL NE REVIENT PAS EN DOUBLE — ET IL GARDE SON NOM', () => {
    const state = faireUnEtat();
    reposerUnParcoursSeme(state, {
        semence: 'papier', parcours: papierDe(3), motifHistorique: /^Tout sur papier/
    });
    // LE GESTE DE RÉMY : il renomme la feuille, comme n'importe quelle séance.
    state.updateTeacherPath(state.teacherPaths[0].id, 'Ma feuille de contrôle', null);

    // ET LE LENDEMAIN MATIN, le démarrage repose la feuille.
    const r = reposerUnParcoursSeme(state, {
        semence: 'papier', parcours: papierDe(7), motifHistorique: /^Tout sur papier/
    });
    assert.equal(r.quoi, 'remis');
    assert.equal(state.teacherPaths.length, 1,
        `la bibliothèque contient ${state.teacherPaths.length} lignes : `
            + state.teacherPaths.map(p => p.name).join(' / '));
    assert.equal(state.teacherPaths[0].name, 'Ma feuille de contrôle',
        'le démarrage a rendu au parcours son nom semé, donc annulé le renommage');
    // Son contenu, lui, a bien suivi le catalogue.
    assert.equal(state.teacherPaths[0].data.steps.length, 7);
    assert.equal(state.teacherPaths[0].data.name, 'Ma feuille de contrôle',
        'le nom du parcours et celui de l\'enveloppe ont divergé');
});

test('ET UNE BIBLIOTHÈQUE D\'AVANT LA MARQUE EST ADOPTÉE, PAS DOUBLÉE', () => {
    // CE CAS EST CELUI DE RÉMY LE JOUR DE LA MISE À JOUR : sa feuille existe,
    // elle ne porte aucune marque. Si on ne l'adoptait pas, la correction
    // poserait une seconde feuille — le doublon qu'elle vient corriger, livré
    // par la correction elle-même.
    const ancienne = {
        id: 'path_vieux', name: 'Tout sur papier (210 exercices)', folderId: 'root',
        data: { id: 'p', version: 2, name: 'Tout sur papier (210 exercices)', steps: [] }
    };
    const state = faireUnEtat([ancienne]);
    const r = reposerUnParcoursSeme(state, {
        semence: 'papier', parcours: papierDe(215), motifHistorique: /^Tout sur papier/
    });
    assert.equal(r.quoi, 'adopte');
    assert.equal(r.id, 'path_vieux', 'la ligne adoptée n\'est pas celle qui existait');
    assert.equal(state.teacherPaths.length, 1, 'la correction a elle-même fait un doublon');
    assert.equal(marqueDe(state.teacherPaths[0]), 'papier');
});

test('LE PARCOURS D\'EXEMPLE SE POSE S\'IL MANQUE, ET NE S\'ÉCRASE PLUS', () => {
    // Un parcours d'exemple est fait pour être retouché : on ne récrit pas
    // par-dessus le travail du professeur à chaque démarrage.
    const state = faireUnEtat();
    const exemple = (n) => ({ id: 'p_d', version: 2, name: 'Parcours découverte',
        policy: {}, steps: Array.from({ length: n }, (_, i) => ({ exerciseId: `d${i}` })) });

    reposerUnParcoursSeme(state, {
        semence: 'decouverte', parcours: exemple(4),
        motifHistorique: /^Parcours découverte$/, seulementSiAbsent: true
    });
    assert.equal(state.teacherPaths.length, 1);
    // Le professeur y ajoute une étape à lui.
    state.teacherPaths[0].data.steps.push({ exerciseId: 'a-moi' });

    const r = reposerUnParcoursSeme(state, {
        semence: 'decouverte', parcours: exemple(4),
        motifHistorique: /^Parcours découverte$/, seulementSiAbsent: true
    });
    assert.equal(r.quoi, 'laisse');
    assert.equal(state.teacherPaths[0].data.steps.length, 5,
        'le démarrage a effacé l\'étape ajoutée par le professeur');
});

test('ET LA MARQUE VOYAGE DANS LE PARCOURS, PAS DANS L\'ENVELOPPE', () => {
    // POURQUOI CE DÉTAIL A SA PROPRE GARDE : le rapatriement du serveur
    // reconstruit l'enveloppe à partir d'une liste close de champs — id, name,
    // data, folderId, timestamp — et jette tout le reste. Une marque posée sur
    // l'enveloppe aurait tenu sur le poste de Rémy et disparu au premier
    // aller-retour avec le serveur : le défaut serait revenu en paraissant
    // corrigé, ce qui est le pire des deux mondes.
    const state = faireUnEtat();
    reposerUnParcoursSeme(state, { semence: 'papier', parcours: papierDe(3) });
    const e = state.teacherPaths[0];
    assert.equal(e.data.semence, 'papier',
        'la marque n\'est pas dans le parcours : elle ne survivrait pas au serveur');
    // Ce que le serveur rend : l'enveloppe refaite, `data` recopié tel quel.
    const revenue = {
        id: e.id, name: e.name, data: { ...e.data }, folderId: 'root', timestamp: 1
    };
    assert.equal(marqueDe(revenue), 'papier',
        'la marque ne survit pas à l\'aller-retour avec le serveur');
});

// ── ET LE NOM DE LA SÉANCE, DANS L'ONGLET DE LA CLASSE ─────────────────────

import { ETATS, suivreLeRenommage } from '../js/core/seances.js';

test('RENOMMER UN PARCOURS RENOMME LA SÉANCE EN COURS', () => {
    // RÉMY : « le nom de la séance dans l'onglet la classe, le nom ne change
    // pas tout de suite ». Il ne changeait pas du tout : la séance garde une
    // COPIE du nom qu'avait le parcours le jour où elle a été donnée.
    const maintenant = 1_000_000;
    const seances = [
        { id: 's1', titre: 'Fractions', classeId: 'c1' },
        { id: 's2', titre: 'Fractions', classeId: 'c2', ouvreLe: maintenant + 86400000 }
    ];
    const apres = suivreLeRenommage(seances, 'Fractions', 'Fractions — révisions', maintenant);
    assert.equal(apres[0].titre, 'Fractions — révisions',
        'la séance en cours garde l\'ancien nom');
    assert.equal(apres[1].titre, 'Fractions — révisions',
        'la séance à venir garde l\'ancien nom');
});

test('MAIS UNE SÉANCE CLOSE GARDE LE SIEN, ET UN TITRE ÉCRIT À LA MAIN AUSSI', () => {
    // LA PROTECTION D'ORIGINE RESTE, et elle est écrite dans `donnerSeance` :
    // « le renommer ensuite ne doit pas réécrire l'histoire de la classe ». Un
    // bilan de novembre intitulé d'après un parcours remanié en mars ne dit
    // plus de quoi il parle. La frontière est la CLÔTURE, pas le renommage.
    const maintenant = 1_000_000;
    const seances = [
        { id: 's1', titre: 'Fractions', closeLe: maintenant - 1 },
        { id: 's2', titre: 'Contrôle n° 3' },
        { id: 's3', titre: 'Fractions' }
    ];
    const apres = suivreLeRenommage(seances, 'Fractions', 'Autre chose', maintenant);
    assert.equal(apres[0].titre, 'Fractions',
        'une séance close a été renommée : son bilan ne dit plus de quoi il parle');
    assert.equal(apres[1].titre, 'Contrôle n° 3',
        'un titre écrit à la main par le professeur a été écrasé');
    assert.equal(apres[2].titre, 'Autre chose');
    assert.equal(ETATS.CLOSE, 'close');
});

test('ET RIEN NE BOUGE QUAND RIEN NE CHANGE', () => {
    // La liste rendue est la MÊME quand aucun titre ne bouge : c'est ce qui
    // permet à l'appelant de n'écrire sur le disque que s'il y a lieu.
    const seances = [{ id: 's1', titre: 'Fractions' }];
    assert.equal(suivreLeRenommage(seances, 'Autre', 'Neuf'), seances);
    assert.equal(suivreLeRenommage(seances, 'Fractions', 'Fractions'), seances);
    assert.equal(suivreLeRenommage(seances, '', 'Neuf'), seances);
});
