// OÙ L'ON POSE LE TABLEAU DES RECORDS — ET CE QUI NE DOIT JAMAIS EMPÊCHER DE
// JOUER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `core/tableauScores.js` sait CLASSER et il est déjà éprouvé ; `js/core/
// scoresLocaux.js` sait où poser le résultat. La séparation « n'est pas de la
// coquetterie », dit son en-tête : c'est elle qui permettra de brancher un jour
// le tableau d'établissement en ne remplaçant QUE ce fichier.
//
// CINQUANTE-NEUF LIGNES, ET TROIS DÉCISIONS QUI SE CASSENT EN SILENCE :
//
//   1. UN STOCKAGE INDISPONIBLE NE DOIT PAS EMPÊCHER DE JOUER. Le module
//      attrape tout : « le tableau est un agrément ; la partie, elle, doit se
//      dérouler ». Une exception qui remonte ici fait un écran de fin de partie
//      blanc — et l'élève perd son score ET sa partie.
//   2. ON RANGE LE TABLEAU CLASSÉ, PAS LA LISTE BRUTE. « Une partie par ligne
//      finirait par faire des milliers d'entrées dont neuf cent quatre-vingt-dix-
//      neuf ne s'afficheront jamais » — et sur un poste de classe partagé par
//      trente élèves pendant une année, c'est le stockage qui sature.
//   3. LE TABLEAU EST GLOBAL, PAS PAR PROFIL. C'est délibéré : « un tableau des
//      records n'a d'intérêt que s'il montre les autres ». Rangé dans l'espace
//      d'un élève, chacun n'y verrait que lui-même.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { nomDuJoueur, lireTableau, enregistrerScore } from '../js/core/scoresLocaux.js';
import { TAILLE_TABLEAU } from '../js/core/tableauScores.js';
import { globalStore } from '../js/core/store.js';
import { initIdentity, createProfile, setActiveProfile, renameProfile, getActiveProfile } from '../js/core/profile.js';

const QUAND = 1_700_000_000_000;

test('UN SCORE ENREGISTRÉ SE RELIT', async () => {
    await initIdentity();
    await enregistrerScore('jeu-epreuve-1', 1200, QUAND);
    const table = await lireTableau('jeu-epreuve-1');
    assert.equal(table.length, 1);
    assert.equal(table[0].score, 1200);
    assert.ok(table[0].qui, 'une ligne sans nom ne dit rien à personne');
});

test('LE TABLEAU EST CELUI DU POSTE, PAS CELUI D\'UN ÉLÈVE', async () => {
    // LA DÉCISION LA PLUS FACILE À CASSER « POUR BIEN FAIRE ». Si le tableau
    // était rangé par profil, chaque élève n'y verrait que lui-même — ce qui
    // est exactement le contraire de ce qu'on demande à un tableau des records.
    await initIdentity();
    const lea = await createProfile('Léa');
    const tom = await createProfile('Tom');

    await setActiveProfile(lea.id);
    await enregistrerScore('jeu-epreuve-2', 900, QUAND);
    await setActiveProfile(tom.id);
    await enregistrerScore('jeu-epreuve-2', 1500, QUAND + 1000);

    const table = await lireTableau('jeu-epreuve-2');
    const noms = table.map(e => e.qui);
    assert.ok(noms.includes('Léa'), 'Tom doit voir le score de Léa');
    assert.ok(noms.includes('Tom'));
    assert.equal(table[0].qui, 'Tom', 'et le meilleur est en haut');
});

test('CHAQUE JEU A SON PROPRE TABLEAU', async () => {
    // Un seul tableau pour tous les jeux mettrait côte à côte des scores qui ne
    // se comparent pas — 40 000 au canon contre 12 au mémory.
    await initIdentity();
    await enregistrerScore('jeu-epreuve-3a', 100, QUAND);
    await enregistrerScore('jeu-epreuve-3b', 999, QUAND);
    const a = await lireTableau('jeu-epreuve-3a');
    const b = await lireTableau('jeu-epreuve-3b');
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.equal(a[0].score, 100);
    assert.equal(b[0].score, 999);
});

test('ON RANGE LE TABLEAU CLASSÉ, PAS LA LISTE BRUTE DES PARTIES', async () => {
    // Trente élèves, une année de cours : la liste brute saturerait le
    // stockage du poste avec des lignes que personne ne verra jamais.
    await initIdentity();
    const jeu = 'jeu-epreuve-4';
    for (let i = 0; i < 40; i++) {
        await enregistrerScore(jeu, 100 + i, QUAND + i * 1000);
    }
    const range = await globalStore.get(`scores:${jeu}`);
    assert.ok(Array.isArray(range), 'ce qui est rangé doit être une liste');
    assert.ok(range.length <= TAILLE_TABLEAU,
        `quarante parties ne doivent pas faire quarante lignes rangées (${range.length})`);
});

test('LE RANG ET LE RECORD SONT RENDUS À L\'ÉCRAN DE FIN DE PARTIE', async () => {
    // C'est ce que l'élève lit : « 3ᵉ au tableau » ou « nouveau record ». Un
    // rang absent fait un écran de fin muet juste au moment où il compte.
    await initIdentity();
    const jeu = 'jeu-epreuve-5';
    const premier = await enregistrerScore(jeu, 500, QUAND);
    assert.ok(premier.table, 'le tableau résultant doit revenir');
    assert.equal(premier.rang, 1, 'seul au tableau, on est premier');

    // UN PREMIER SCORE N'EST PAS UN RECORD, et c'est voulu : « on ne crie pas
    // victoire sur une partie sans adversaire », dit `tableauScores.js`. Mon
    // épreuve prétendait d'abord le contraire — c'est elle qui avait tort, pas
    // le code.
    assert.equal(premier.record, false);

    const moins = await enregistrerScore(jeu, 100, QUAND + 1000);
    assert.equal(moins.record, false, 'un score plus bas ne bat rien');

    const mieux = await enregistrerScore(jeu, 900, QUAND + 2000);
    assert.equal(mieux.record, true, 'battre son propre score, en revanche, se dit');
    assert.equal(mieux.rang, 1);
});

test('LE NOM DU JOUEUR SUIT LE PROFIL ACTIF', async () => {
    await initIdentity();
    const p = await createProfile('Léa');
    await setActiveProfile(p.id);
    assert.equal(nomDuJoueur(), 'Léa');

    await renameProfile(p.id, 'Léa D.');
    assert.equal(nomDuJoueur(), 'Léa D.');
});

test('UN PROFIL SANS NOM N\'ENTRE PAS AU TABLEAU SOUS UNE LIGNE VIDE', async () => {
    // Un nom vide — ou fait d'espaces — ferait une ligne anonyme dans le
    // tableau de la classe, et l'élève ne se reconnaîtrait pas.
    await initIdentity();
    const p = await createProfile('   ');
    await setActiveProfile(p.id);
    assert.equal(nomDuJoueur(), 'Élève');
    assert.ok(getActiveProfile(), 'le profil existe quand même');
});

test('UN STOCKAGE QUI JETTE N\'EMPÊCHE PAS DE JOUER', async () => {
    // « Le tableau est un agrément ; la partie, elle, doit se dérouler. »
    //
    // On casse le stockage pour de vrai — c'est le mode privé de Safari, le
    // quota dépassé, le stockage coupé par l'école. Rien ne doit remonter
    // jusqu'au jeu : une exception ici fait un écran de fin de partie blanc, et
    // l'élève perd son score ET sa partie.
    await initIdentity();
    const vraiGet = globalStore.get;
    const vraiSet = globalStore.set;
    try {
        globalStore.get = async () => { throw new Error('stockage refusé'); };
        globalStore.set = async () => { throw new Error('stockage refusé'); };

        const table = await lireTableau('jeu-epreuve-6');
        assert.deepEqual(table, [], 'au pire, le tableau est vide');

        const r = await enregistrerScore('jeu-epreuve-6', 700, QUAND);
        assert.ok(r.table, 'et l\'écran de fin de partie a quand même de quoi s\'afficher');
        assert.ok(r.table.some(e => e.score === 700),
            'la partie qu\'on vient de jouer doit au moins s\'y voir');
    } finally {
        globalStore.get = vraiGet;
        globalStore.set = vraiSet;
    }
});

test('UN TABLEAU JAMAIS ÉCRIT SE LIT COMME VIDE', async () => {
    await initIdentity();
    assert.deepEqual(await lireTableau('jeu-qui-na-jamais-ete-joue'), []);
});

test('UNE TAILLE DEMANDÉE EST RESPECTÉE À LA LECTURE', async () => {
    // L'écran d'un téléphone n'affiche pas dix lignes : les jeux demandent
    // moins. En rendre dix de toute façon pousse le bouton « rejouer » hors de
    // l'écran.
    await initIdentity();
    const jeu = 'jeu-epreuve-7';
    for (let i = 0; i < 8; i++) {
        const p = await createProfile(`Élève ${i}`);
        await setActiveProfile(p.id);
        await enregistrerScore(jeu, 100 + i * 10, QUAND + i * 1000);
    }
    assert.ok((await lireTableau(jeu)).length > 3, 'il doit y avoir de quoi couper');
    assert.equal((await lireTableau(jeu, 3)).length, 3);
});
