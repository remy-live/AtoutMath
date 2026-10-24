// SÉLECTIONNER DANS UNE LISTE — les règles que tout le monde connaît, et que
// personne n'écrit juste du premier coup.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu peux pas faire mieux ou ouvrir une modale, je trouve que c'est un
// peu bricolé, on ne peut faire des cadre de sélection, utiliser shift ou cmd ».
//
// POURQUOI CES RÈGLES MÉRITENT DES ÉPREUVES ALORS QU'ON LES CONNAÎT PAR CŒUR :
// justement parce qu'on les connaît par cœur. On sait ce qu'on ATTEND d'un
// Maj-clic ; on ne sait pas, de mémoire, que l'ancre ne doit PAS bouger — et
// c'est la différence entre une plage qu'on peut rétrécir et une plage qui
// repart de zéro à chaque clic. Chacune de ces règles se vérifie en trois
// lignes ici, et se verrait à peine dans un navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    apresUnClic, apresUneTouche, dansLeCadre, direLaSelection
} from '../js/core/selectionListe.js';

const IDS = ['a', 'b', 'c', 'd', 'e'];
const pris = (r) => [...r.selection].sort().join('');

test('UN CLIC SIMPLE PREND CELLE-LÀ, ET ELLE SEULE', () => {
    const r = apresUnClic({ ids: IDS, id: 'c', selection: new Set(['a', 'b']) });
    assert.equal(pris(r), 'c');
    assert.equal(r.ancre, 'c', 'l\'ancre suit le clic simple : c\'est d\'elle que partira la plage');
});

test('MAJ PREND LA PLAGE, DANS LES DEUX SENS', () => {
    const depart = apresUnClic({ ids: IDS, id: 'b', selection: new Set() });
    const versLeBas = apresUnClic({ ids: IDS, id: 'd', selection: depart.selection,
        ancre: depart.ancre, maj: true });
    assert.equal(pris(versLeBas), 'bcd');
    // ET VERS LE HAUT : l'ordre des deux bornes ne doit rien changer.
    const versLeHaut = apresUnClic({ ids: IDS, id: 'a', selection: depart.selection,
        ancre: depart.ancre, maj: true });
    assert.equal(pris(versLeHaut), 'ab');
});

test('L\'ANCRE NE BOUGE PAS SOUS UN MAJ-CLIC, ET C\'EST TOUT L\'INTÉRÊT', () => {
    // ─────────────────────────────────────────────────────────────────────
    // LA RÈGLE QU'ON ÉCRIT FAUX. Si l'ancre suivait, chaque Maj-clic
    // repartirait d'où l'on vient : on pourrait AGRANDIR une plage, jamais la
    // RÉTRÉCIR. Or ajuster la fin de la plage par petits coups est exactement
    // ce qu'on fait quand on sélectionne quarante parcours pour en jeter
    // trente-sept.
    let e = apresUnClic({ ids: IDS, id: 'a', selection: new Set() });
    e = apresUnClic({ ids: IDS, id: 'e', selection: e.selection, ancre: e.ancre, maj: true });
    assert.equal(pris(e), 'abcde');
    assert.equal(e.ancre, 'a');
    // On resserre : la plage DIMINUE, elle ne s'ajoute pas.
    e = apresUnClic({ ids: IDS, id: 'c', selection: e.selection, ancre: e.ancre, maj: true });
    assert.equal(pris(e), 'abc', 'la plage ne se rétrécit pas : on ne peut que l\'agrandir');
});

test('MAJ REMPLACE LA PLAGE PRÉCÉDENTE, IL NE L\'EMPILE PAS', () => {
    // Deux Maj-clics successifs ne doivent pas laisser derrière eux la
    // première plage, que personne n'a demandé de garder.
    let e = apresUnClic({ ids: IDS, id: 'd', selection: new Set(['a', 'b']) });
    e = apresUnClic({ ids: IDS, id: 'e', selection: e.selection, ancre: e.ancre, maj: true });
    assert.equal(pris(e), 'de');
});

test('CTRL OU CMD BASCULE UNE SEULE LIGNE, SANS TOUCHER AU RESTE', () => {
    let e = apresUnClic({ ids: IDS, id: 'b', selection: new Set(['a']), meta: true });
    assert.equal(pris(e), 'ab');
    assert.equal(e.ancre, 'b', 'la ligne qu\'on vient de prendre devient le départ de la suite');
    // Et un second Ctrl-clic la relâche.
    e = apresUnClic({ ids: IDS, id: 'b', selection: e.selection, ancre: e.ancre, meta: true });
    assert.equal(pris(e), 'a');
});

test('MAJ + CTRL AJOUTE LA PLAGE À CE QUI EST DÉJÀ PRIS', () => {
    // C'est ce qui permet de prendre deux paquets séparés, et c'est ce que
    // font les explorateurs.
    let e = apresUnClic({ ids: IDS, id: 'a', selection: new Set(), meta: true });
    e = apresUnClic({ ids: IDS, id: 'd', selection: e.selection, ancre: e.ancre,
        maj: true, meta: true });
    assert.equal(pris(e), 'abcd');
});

test('UN MAJ-CLIC SANS ANCRE SE COMPORTE COMME UN CLIC SIMPLE', () => {
    // Premier geste de la session, ou liste redessinée : il n'y a rien d'où
    // partir. Prendre « de la première ligne jusqu'ici » serait une surprise.
    const e = apresUnClic({ ids: IDS, id: 'c', selection: new Set(), maj: true });
    assert.equal(pris(e), 'c');
});

test('UN IDENTIFIANT QUI N\'EST PLUS DANS LA LISTE NE CASSE RIEN', () => {
    // La liste se refiltre pendant qu'on coche : l'ancre peut désigner une
    // ligne disparue.
    const e = apresUnClic({ ids: IDS, id: 'zz', selection: new Set(['a']) });
    assert.equal(pris(e), 'a', 'cliquer un fantôme ne doit rien changer');
    const f = apresUnClic({ ids: IDS, id: 'c', selection: new Set(['a']),
        ancre: 'disparue', maj: true });
    assert.equal(pris(f), 'c', 'une ancre disparue retombe sur le clic simple');
});

// ──────────────────────────────────────────────── LE CLAVIER ───────────────

test('CTRL+A PREND TOUT', () => {
    const e = apresUneTouche({ ids: IDS, touche: 'a', selection: new Set(['b']), meta: true });
    assert.equal(pris(e), 'abcde');
});

test('LES FLÈCHES DÉPLACENT, ET MAJ + FLÈCHE ÉTEND', () => {
    let e = apresUnClic({ ids: IDS, id: 'b', selection: new Set() });
    e = apresUneTouche({ ids: IDS, touche: 'ArrowDown', selection: e.selection, ancre: e.ancre });
    assert.equal(pris(e), 'c');
    e = apresUneTouche({ ids: IDS, touche: 'ArrowDown', selection: e.selection,
        ancre: e.ancre, maj: true });
    assert.equal(pris(e), 'cd');
    // ET L'ON NE SORT PAS DE LA LISTE par le bas.
    let f = apresUnClic({ ids: IDS, id: 'e', selection: new Set() });
    f = apresUneTouche({ ids: IDS, touche: 'ArrowDown', selection: f.selection, ancre: f.ancre });
    assert.equal(pris(f), 'e');
});

// ──────────────────────────────────────────── LE CADRE DE SÉLECTION ────────

test('LE CADRE PREND CE QU\'IL TOUCHE, PAS CE QU\'IL CONTIENT', () => {
    // ─────────────────────────────────────────────────────────────────────
    // Une ligne de liste est large. Exiger qu'elle tienne TOUT ENTIÈRE dans le
    // rectangle obligerait à traverser toute la hauteur de chaque ligne pour
    // l'attraper — et l'on en manquerait une sur deux en tirant vite. Tous les
    // explorateurs prennent ce que le cadre touche.
    const lignes = [
        { id: 'a', haut: 0, bas: 40 },
        { id: 'b', haut: 40, bas: 80 },
        { id: 'c', haut: 80, bas: 120 }
    ];
    assert.deepEqual(dansLeCadre(lignes, { haut: 30, bas: 50 }), ['a', 'b'],
        'un cadre qui mord deux lignes les prend toutes les deux');
    assert.deepEqual(dansLeCadre(lignes, { haut: 85, bas: 110 }), ['c']);
    // ET IL MARCHE EN TIRANT VERS LE HAUT : on ne commence pas toujours par le
    // haut de la liste.
    assert.deepEqual(dansLeCadre(lignes, { haut: 110, bas: 85 }), ['c']);
    // Un cadre qui ne touche rien ne prend rien — et ne se plaint pas.
    assert.deepEqual(dansLeCadre(lignes, { haut: 200, bas: 240 }), []);
    assert.deepEqual(dansLeCadre(null, { haut: 0, bas: 10 }), []);
});

test('ON NE PREND PAS UNE LIGNE QUE LE CADRE EFFLEURE SANS LA TOUCHER', () => {
    // Le bord exact ne compte pas : sans cela, un simple clic — un cadre de
    // zéro pixel — attraperait la ligne du dessous.
    const lignes = [{ id: 'a', haut: 0, bas: 40 }, { id: 'b', haut: 40, bas: 80 }];
    assert.deepEqual(dansLeCadre(lignes, { haut: 40, bas: 40 }), []);
});

// ─────────────────────────────────────────────────── LA PHRASE ─────────────

test('LA PHRASE S\'ACCORDE, ET DISPARAÎT À ZÉRO', () => {
    // « 1 parcours sélectionnés » est la faute qu'on ne voit plus au bout de
    // trois jours, et que Rémy verra le premier jour.
    assert.equal(direLaSelection(0), '');
    assert.equal(direLaSelection(1), '1 parcours sélectionné');
    assert.equal(direLaSelection(12), '12 parcours sélectionnés');
});
