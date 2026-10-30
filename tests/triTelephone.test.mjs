// LE TRI AU POUCE — ce qu'on ne veut pas voir se défaire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais me faire, pour la revue du catalogue, sur téléphone, un
// fonctionnement pratique pour que je t'envoie ce que l'on garde ou non. »
//
// Cet écran écrit dans le MÊME carnet que le tableau, et ce qu'il écrit finit
// dans le CODE : la consigne qu'il sort, je la reporte dans les descripteurs.
// Un défaut ici ne se voit donc pas sur l'écran — il se voit trois jours plus
// tard, dans un catalogue où quarante exercices que personne n'a regardés sont
// passés « validés pour les élèves ».
//
// C'EST EXACTEMENT LA FAUTE QUE TIENT LA PREMIÈRE ÉPREUVE.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    dejaTranche, pileDuTri, avancement, REPONSES, triTelephoneHtml
} from '../js/ui/triTelephone.js';
import { nouvelleRevue, decider, statutRevu, consigneStatuts, ficheDe } from '../js/core/revue.js';
import { STATUS } from '../js/data/status.js';

/** Trois exercices qui ressemblent à ceux du catalogue, et rien de plus. */
const EXOS = [
    { id: 'a', title: 'Alpha', instruction: 'Compte.', status: STATUS.TEST, tags: { chemin: ['Nombres'] } },
    { id: 'b', title: 'Bêta', instruction: 'Mesure.', status: STATUS.TEST, tags: { chemin: ['Grandeurs'] } },
    { id: 'c', title: 'Gamma', instruction: 'Trace.', status: STATUS.VALIDE, tags: { chemin: ['Espace'] } }
];

const carnetNeuf = () => nouvelleRevue({ version: 'v958', date: 0 });

// ── 1. LA FAUTE QUI COÛTERAIT LE PLUS CHER ──────────────────────────────────

test('UN EXERCICE QU\'ON N\'A PAS TRANCHÉ N\'EST PAS « on garde »', () => {
    // QUATRE VALEURS, PAS TROIS : on garde, à revoir, on retire, et « pas
    // encore lu ». Confondre la quatrième avec la première validerait en bloc
    // tout ce que personne n'a regardé — et c'est la consigne qui part dans le
    // code, donc la faute serait silencieuse jusqu'au catalogue.
    let r = carnetNeuf();
    assert.equal(dejaTranche(r, EXOS[0]), false, 'un carnet vide ne tranche rien');

    // MÊME AVEC UNE REMARQUE : écrire « à surveiller » sous une carte, c'est
    // justement ne pas avoir tranché.
    r = decider(r, 'a', { remarque: 'à surveiller' });
    assert.equal(dejaTranche(r, EXOS[0]), false,
        'une remarque n\'est pas une décision : on écrit sous une carte qu\'on laisse pour plus tard');

    // ET LA CONSIGNE NE DIT RIEN DE LUI : elle ne porte que ce qui CHANGE.
    assert.equal(consigneStatuts(r, EXOS), '',
        'une remarque seule ne doit pas faire bouger un statut dans le code');
});

// ── 2. LES TROIS RÉPONSES ÉCRIVENT TROIS CHOSES DIFFÉRENTES ─────────────────

test('chacune des trois réponses mène au statut qu\'elle annonce', () => {
    // L'ÉCRAN PROMET UNE COULEUR ET UN MOT ; le carnet doit écrire le statut
    // correspondant. Sans cette épreuve, « on retire » pourrait écrire « en
    // test » et l'écran afficherait quand même son bouton rouge rempli.
    REPONSES.forEach(rep => {
        const r = decider(carnetNeuf(), 'a', rep.quoi);
        assert.equal(statutRevu(EXOS[0], ficheDe(r, 'a')), rep.statut,
            `« ${rep.nom} » doit mener au statut ${rep.statut}`);
        assert.equal(dejaTranche(r, EXOS[0]), true, `« ${rep.nom} » tranche`);
    });

    // LES TROIS STATUTS SONT BIEN TROIS : trois réponses qui mèneraient deux
    // fois au même statut ne serviraient à rien.
    assert.equal(new Set(REPONSES.map(r => r.statut)).size, 3);
});

// ── 3. LA PILE, ET CE QU'ELLE RETIRE ────────────────────────────────────────

test('la pile « ce qui reste » ne garde que ce qui n\'est pas tranché', () => {
    const r = decider(carnetNeuf(), 'b', { retirer: false, enTest: true });
    assert.deepEqual(pileDuTri(EXOS, r, { reste: true }).map(e => e.id), ['a', 'c']);
    assert.deepEqual(pileDuTri(EXOS, r, { reste: false }).map(e => e.id), ['a', 'b', 'c'],
        'sans le filtre, la pile est le catalogue entier, dans son ordre');
});

test('l\'avancement compte les tranchés, et seulement eux', () => {
    let r = carnetNeuf();
    assert.deepEqual(avancement(EXOS, r).faits, 0);
    assert.deepEqual(avancement(EXOS, r).reste, 3);

    r = decider(r, 'a', { retirer: true, enTest: null });
    r = decider(r, 'c', { retirer: false, enTest: false });
    const a = avancement(EXOS, r);
    assert.equal(a.faits, 2);
    assert.equal(a.reste, 1);
    assert.equal(a.total, 3);
});

// ── 4. L'ALLER-RETOUR JUSQU'AU CODE ─────────────────────────────────────────

test('LA CONSIGNE PORTE LES TROIS SEAUX, chacun avec les bons exercices', () => {
    // C'EST LE SEUL PONT ENTRE LE TÉLÉPHONE ET LE CODE. Rémy trie dans une
    // salle d'attente, me colle trois lignes, et je reporte. Un seau manquant,
    // c'est une partie du tri qui n'arrive jamais.
    let r = carnetNeuf();
    r = decider(r, 'a', { retirer: false, enTest: false });   // a était en test → validé
    r = decider(r, 'b', { retirer: true, enTest: null });     // b était en test → retiré
    r = decider(r, 'c', { retirer: false, enTest: true });    // c était validé → en test

    const c = consigneStatuts(r, EXOS);
    assert.match(c, /valide = a\b/, 'le seau « valide » porte a');
    assert.match(c, /brouillon = b\b/, 'le seau « brouillon » porte b — c\'est « on retire »');
    assert.match(c, /test = c\b/, 'le seau « test » porte c');
});

// ── 5. L'ÉCRAN LUI-MÊME ────────────────────────────────────────────────────

test('la carte échappe ce qui vient du catalogue', () => {
    // Le catalogue est écrit à la main : un titre avec un chevron n'est pas une
    // attaque, c'est une faute de frappe — et elle casserait quand même la
    // carte entière.
    const html = triTelephoneHtml([
        { id: 'x', title: '<b>Dé</b> & "pile"', instruction: 'a > b', status: STATUS.TEST, tags: { chemin: [] } }
    ], carnetNeuf());
    assert.ok(!html.includes('<b>Dé</b>'), 'le balisage du titre est échappé');
    assert.match(html, /&lt;b&gt;D/);
    assert.match(html, /a &gt; b/);
});

test('l\'écran dit ce qu\'il reste, et les trois réponses sont là', () => {
    const html = triTelephoneHtml(EXOS, carnetNeuf());
    REPONSES.forEach(r => assert.match(html, new RegExp(`data-reponse="${r.id}"`),
        `le bouton « ${r.nom} » est dans la carte`));
    // LES CROCHETS QUE LA REVUE BRANCHE : un sélecteur qui ne désigne rien rend
    // la même réponse qu'un logiciel cassé. On les nomme ici pour que leur
    // disparition tombe en deux cents millisecondes et non en vingt minutes.
    //
    // ET « tt- » DEVANT DEUX D'ENTRE EUX : la tête de la revue porte déjà un
    // bouton `data-consigne` et un bouton `data-copier`, et elle reste à
    // l'écran au-dessus des cartes. Les laisser sans préfixe faisait désigner
    // le BOUTON de la tête au lieu de la zone de texte de la carte.
    ['data-reste', 'data-pas="-1"', 'data-pas="1"', 'data-tt-consigne', 'data-tt-copier',
        'data-remarque=', 'data-essayer='].forEach(crochet =>
        assert.ok(html.includes(crochet), `le crochet ${crochet} existe`));
});

test('quand tout est tranché, l\'écran le dit au lieu de montrer une carte vide', () => {
    let r = carnetNeuf();
    EXOS.forEach(e => { r = decider(r, e.id, { retirer: false, enTest: false }); });
    const html = triTelephoneHtml(EXOS, r);
    assert.match(html, /Tout est tranché/);
    assert.ok(!html.includes('data-reponse='), 'il n\'y a plus de carte à répondre');
});
