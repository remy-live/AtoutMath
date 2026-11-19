// ÉCRIRE CE QUE LE PROGRAMME AFFICHE — et la mise en page EST la réponse.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : devant « Que va afficher ce programme ? », il a tapé
// « 54321 » sur une seule ligne, puis « 5 / 4 / 3 / 2 / 1 » une par ligne, et
// a écrit : « ça devrait être bon ». Il avait raison, et la marche existe
// maintenant pour de bon.
//
// ── LE DÉFAUT QUE CE FICHIER GARDE, ET QU'AUCUNE AUTRE ÉPREUVE NE VOIT ───
//
// Le comparateur du noyau (`sameAnswer`) retire les blancs d'une réponse quand
// ce qui reste est un NOMBRE. La règle est bonne et elle a sa raison : « 62 307 »
// et « 62307 » sont le même nombre. Mais sur une sortie multiligne, elle
// ramène « 1\n2\n3 » à « 123 » — et le logiciel déclarait JUSTE la réponse
// écrite tout sur une ligne, c'est-à-dire exactement la faute qu'on veut faire
// voir. Mesuré à l'écran, pas déduit.
//
// ── ET LA DEUXIÈME MOITIÉ, QUI EST PIRE QUE LA PREMIÈRE ──────────────────
//
// L'activité juge AUSSI, pour écrire son message. Si les deux verdicts
// divergent, l'élève lit « ce n'est pas ce que ce programme affiche » et gagne
// son point, ou l'inverse. DEUX AVIS SUR LA MÊME RÉPONSE EST PIRE QUE LE
// MAUVAIS AVIS : il n'y a plus rien à comprendre. La première épreuve
// ci-dessous ne vérifie donc pas que le verdict est bon, elle vérifie que les
// deux sont LE MÊME.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { sameAnswer } from '../js/core/items.js';
import { sortieJuste, canoniqueSortie } from '../js/core/python/sortie.js';
import { pythonEcrireGenerator } from '../js/core/generators/pythonPasAPas.js';

const MARCHES_SORTIE = ['sortie-deux-lignes', 'sortie-boucle', 'sortie-tant-que'];

/** Un item d'une marche « écris la sortie ». */
const tirer = (marche, k) => pythonEcrireGenerator.generate({ marches: [marche] },
    { rng: makeRng(`${marche}/${k}`), index: 0, total: 1 });

test('NOTRE VERDICT ET CELUI DU MENEUR NE DIVERGENT JAMAIS', () => {
    const attendu = '1\n2\n3\n';
    const essais = ['123', '1\n2\n3', '1\n2\n3\n', '1 2 3', ' 1 \n2\n3 ',
        '1\n2\n3\n\n', '1\n2', '1\n2\n3\n4', '', '3\n2\n1'];
    const divergent = essais.filter((e) =>
        sortieJuste(e, attendu) !== sameAnswer(canoniqueSortie(e), canoniqueSortie(attendu)));
    assert.deepEqual(divergent, [],
        'l’activité et le meneur ne disent pas la même chose — l’élève lirait '
        + 'un message et récolterait l’autre verdict');
});

test('ET SUR TOUTES LES SORTIES QUE LE CATALOGUE PRODUIT', () => {
    // Le cas ci-dessus est écrit à la main ; celui-ci balaie ce qui sortira
    // vraiment, et les trois fautes qu'un élève fait : tout coller, oublier la
    // dernière ligne, intervertir.
    const divergent = [];
    for (const m of MARCHES_SORTIE) {
        for (let k = 0; k < 15; k++) {
            const att = tirer(m, k).meta.sortieAttendue;
            const lignes = att.trimEnd().split('\n');
            for (const essai of [att, att.trimEnd(), lignes.join(''),
                lignes.slice(0, -1).join('\n'), [...lignes].reverse().join('\n')]) {
                const nous = sortieJuste(essai, att);
                const eux = sameAnswer(canoniqueSortie(essai), canoniqueSortie(att));
                if (nous !== eux) divergent.push(`${m} : ${JSON.stringify(essai)}`);
            }
        }
    }
    assert.deepEqual(divergent, []);
});

test('UNE SORTIE SUR UNE SEULE LIGNE N’EST PAS LA BONNE RÉPONSE', () => {
    // ── LA FAUTE DE RÉMY, ET CELLE QU'ON VEUT FAIRE VOIR ─────────────────
    //
    // C'est l'épreuve la plus courte du fichier et la plus importante : si
    // elle tombe, l'exercice ne mesure plus rien. Un élève qui écrit « 54321 »
    // n'a pas compris que `print` va à la ligne, et c'est précisément ce que
    // cette marche enseigne.
    for (const m of MARCHES_SORTIE) {
        for (let k = 0; k < 10; k++) {
            const it = tirer(m, k);
            const lignes = it.meta.sortieAttendue.trimEnd().split('\n');
            if (lignes.length < 2) continue;
            const colle = lignes.join('');
            assert.ok(!sortieJuste(colle, it.meta.sortieAttendue),
                `${m} : « ${colle} » tout sur une ligne est accepté`);
            assert.ok(!sameAnswer(canoniqueSortie(colle), it.answer),
                `${m} : le meneur accepte « ${colle} » tout sur une ligne`);
        }
    }
});

test('LES MARCHES « SORTIE » NE DONNENT RIEN À LANCER', () => {
    for (const m of MARCHES_SORTIE) {
        const it = tirer(m, 0);
        assert.equal(it.meta.genre, 'sortie', `${m} n’est pas marquée`);
        assert.equal(it.answerKind, 'text');
        // PAS DE PROGRAMME DE DÉPART : le champ porte une RÉPONSE. S'il en
        // portait un, l'éditeur le lancerait — et c'est exactement ce qui a
        // fait répondre « faux » à la bonne réponse de Rémy.
        assert.equal(it.meta.depart, undefined, `${m} porte un programme de départ`);
        assert.ok(it.meta.programme, `${m} n’a pas de programme à lire`);
        assert.ok(it.meta.sortieAttendue, `${m} n’annonce aucune sortie`);
        // ET LE PROGRAMME EST DANS L'ÉNONCÉ, sans quoi il n'y a rien à lire.
        assert.match(it.prompt.html, /py-bloc/);
        assert.match(it.prompt.papier, /print/);
    }
});

test('L’ÉDITEUR NE MONTRE JAMAIS LA SORTIE ATTENDUE EN MODE RÉPONSE', async () => {
    // ── LE PIÈGE DÉJÀ PAYÉ UNE FOIS, LE 18 NOVEMBRE ──────────────────────
    //
    // Un énoncé qui surlignait lui-même les lignes répétées sous la question
    // « quelles lignes sont répétées ? ». Ici, le rappel « Ton programme doit
    // afficher » porte la sortie attendue : il aide quand il faut ÉCRIRE un
    // programme, il donne la réponse quand il faut PRÉDIRE la sortie.
    const { sansCommentaires } = await import('./helpers.mjs');
    const { readFileSync } = await import('node:fs');
    const S = sansCommentaires(readFileSync(
        new URL('../js/core/activities/pythonEditeur.js', import.meta.url), 'utf8'));
    const bloc = /pe-attendu/.exec(S);
    assert.ok(bloc, 'le rappel a disparu du fichier : cette épreuve ne garde plus rien');
    // Le rappel doit être conditionné à « pas en mode sortie ».
    assert.match(S, /attendu\(\)\s*&&\s*!sortie/,
        'le rappel « doit afficher » n’est plus conditionné : il montre la '
        + 'réponse sous la question qui la demande');
});
