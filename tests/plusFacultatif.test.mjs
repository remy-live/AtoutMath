// LE « + » D'UNE ÉLÈVE DE RÉMY, QUI AVAIT BON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur « Enlever les parenthèses » :
//
//   « une élève, au −(3 − 5) + (−2 + 9), elle a mis −(−2) + (+7) et le logiciel
//     a dit qu'elle avait faux car elle aurait dû mettre −(−2) + (7). Mais elle
//     a bon en fait. »
//
// MESURÉ AVANT (tools/tmp/reproPlus.mjs, graine 61897 : c'est SON énoncé mot
// pour mot) : `jugerEtape` rendait `false` sur sa réponse et `true` sur la
// ligne que le logiciel pose lui-même. Le juge ne refusait pas une faute, il
// refusait une écriture.
//
// LA RÈGLE QUI LUI DONNAIT RAISON ÉTAIT DÉJÀ ÉCRITE, et deux fois : « le + de
// tête est une trace utile au tableau, pas une condition de justesse ». Mais
// chacun des deux juges en avait SA copie, et les deux ne regardaient que le
// PREMIER caractère de la chaîne. Le « + » de son élève était dans une
// parenthèse.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI CHAQUE PARTIE EST LÀ ────────────
//
// 1. SA RÉPONSE EXACTE, par le chemin exact : le générateur fabrique l'item,
//    et c'est `jugerEtape` — celui que `litteralSaisie` appelle — qui tranche.
//    Une épreuve qui appellerait `sansPlusFacultatif` toute seule serait verte
//    même si plus personne ne l'appelait.
//
// 2. LES DEUX JUGES, séparément. La ligne FINALE passe par `reponseJuste`, les
//    lignes INTERMÉDIAIRES par `jugerEtape` → `memeReponse`. Corriger l'un et
//    pas l'autre laissait la moitié des lignes refuser la même réponse : c'est
//    le défaut de forme qu'on a payé trois fois en deux jours — une correction
//    posée sur un seul des chemins qui mènent au même endroit ne ferme rien.
//
// 3. CE QUI RESTE FAUX. Sans ce témoin, la plus permissive des corrections —
//    « accepte tout » — rendrait les deux premières parties vertes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { sansPlusFacultatif } from '../js/core/plusFacultatif.js';
import { reponseJuste } from '../js/core/opposeParentheses.js';
import { memeReponse } from '../js/core/reductionPuissances.js';
import { jugerEtape } from '../js/core/ligneEtape.js';
import { makeRng } from '../js/core/ids.js';
import { opposeEnleverGenerator } from '../js/core/generators/oppose.js';

/** SA GRAINE. Celle qui redonne « −(3 − 5) + (−2 + 9) », cherchée pour cela. */
const SA_GRAINE = 61897;
const SON_ENONCE = '−(3 − 5) + (−2 + 9) = ?';

/** L'item du barreau 4, celui où une ligne porte deux parenthèses. */
function itemBarreau4(graine) {
    return opposeEnleverGenerator.generate(
        { marches: ['deuxParentheses'] },
        { rng: makeRng(graine), index: 0, total: 1 });
}

test('UN « + » DE SIGNE S\'EFFACE ; UN « + » D\'OPÉRATION RESTE', () => {
    // LES DEUX SEULES PLACES OÙ UN « + » NE DIT RIEN : en tête de l'écriture,
    // et en tête d'une parenthèse. Partout ailleurs il ajoute.
    assert.equal(sansPlusFacultatif('+4-5'), '4-5');
    assert.equal(sansPlusFacultatif('-(-2)+(+7)'), '-(-2)+(7)');
    assert.equal(sansPlusFacultatif('(+3)+(+4)'), '(3)+(4)');
    // L'OPÉRATEUR NE BOUGE PAS. Si celui-ci partait, « 2 + 7 » deviendrait
    // « 27 » et le juge accepterait n'importe quoi.
    assert.equal(sansPlusFacultatif('2+7'), '2+7');
    assert.equal(sansPlusFacultatif('-(4)+(3)'), '-(4)+(3)');
    // ET JAMAIS UN MOINS : −(+2) et −(2) ne sont pas la même chose, c'est tout
    // le chapitre.
    assert.equal(sansPlusFacultatif('-(-2)'), '-(-2)');
    // Les espaces autour sont tolérés : la fonction doit être juste qu'on
    // l'appelle avant ou après que l'appelant ait retiré les blancs.
    assert.equal(sansPlusFacultatif('+ 4 − 5'), '4 − 5');
    assert.equal(sansPlusFacultatif(null), '');
});

test('SA RÉPONSE EST ACCEPTÉE, PAR LE JUGE QUE L\'ÉCRAN APPELLE', () => {
    const item = itemBarreau4(SA_GRAINE);
    // ON VÉRIFIE QUE C'EST BIEN SA QUESTION. Le jour où le tirage changera, cette
    // ligne tombera au lieu de laisser l'épreuve mesurer autre chose en silence.
    assert.equal(item.prompt.text, SON_ENONCE,
        'cette graine ne redonne plus l\'énoncé de Rémy : la mesure est à refaire');
    const etape = item.meta.etapes[0];
    assert.equal(etape.montrer, '−(−2) + (7)',
        'c\'est l\'écriture que le logiciel exigeait, et qu\'il a nommée dans son message');

    assert.equal(jugerEtape(etape, '-(-2)+(+7)'), true,
        'la réponse de son élève : le « + » de (+7) ne fait que redire que 7 est positif');
    // ET LES ÉCRITURES VOISINES, qu'un élève produit avec le même raisonnement.
    assert.equal(jugerEtape(etape, '−(−2) + (+7)'), true, 'avec les vrais signes moins');
    assert.equal(jugerEtape(etape, '−(−2) + (7)'), true, 'la ligne du logiciel lui-même');
});

test('LES DEUX JUGES DE CET EXERCICE DISENT LA MÊME CHOSE', () => {
    // LE DÉFAUT DE FORME QU'ON A PAYÉ TROIS FOIS EN DEUX JOURS. `reponseJuste`
    // juge la ligne FINALE, `memeReponse` les lignes INTERMÉDIAIRES. Corriger
    // l'un sans l'autre laissait une élève comptée fausse une ligne sur deux.
    const paires = [
        ['-(-2)+(+7)', '−(−2) + (7)'],
        ['+4-5', '4 − 5'],
        ['(+3)', '(3)']
    ];
    for (const [ecrit, attendu] of paires) {
        assert.equal(reponseJuste(ecrit, [attendu]), true,
            `la ligne finale refuse « ${ecrit} »`);
        assert.equal(memeReponse(ecrit, attendu), true,
            `la ligne intermédiaire refuse « ${ecrit} »`);
    }
});

test('AUCUN DES DEUX JUGES NE GARDE SA COPIE DE LA RÈGLE', () => {
    // UNE RÈGLE RECOPIÉE EST UNE RÈGLE QUI DIVERGERA. C'est précisément ce qui
    // s'est passé : deux `replace(/^\+/)` écrits séparément, trop petits tous
    // les deux du même caractère. On garde donc le FAIT qu'il n'y en a plus
    // qu'un seul endroit — ce qu'aucune épreuve de comportement ne peut dire.
    for (const f of ['js/core/opposeParentheses.js', 'js/core/reductionPuissances.js']) {
        const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
            // L'en-tête de chacun CITE l'ancienne forme pour expliquer ce qu'elle
            // a coûté. On ne s'accuse pas de ce qu'on documente.
            .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
        assert.match(src, /from '\.\/plusFacultatif\.js'/,
            `${f} doit appeler la règle, pas en garder une copie`);
        assert.doesNotMatch(src, /replace\(\/\^\\\+\/|startsWith\('\+'\)/,
            `${f} refait la règle à la main : elle finira par ne plus dire la même `
            + 'chose que l\'autre juge');
    }
});

test('CE QUI EST FAUX RESTE FAUX — sur trente tirages', () => {
    // LE TÉMOIN, ET IL EST INDISPENSABLE : « accepte tout » rendrait les trois
    // épreuves précédentes vertes d'un coup.
    //
    // On parcourt trente questions du barreau 4 — celui qui a deux parenthèses
    // par ligne — et sur chacune on vérifie deux choses de sens opposé : que le
    // « + » ajouté dans chaque parenthèse ne change rien, et qu'un signe changé
    // change tout.
    let avecPlus = 0;
    for (let graine = 1; graine <= 30; graine++) {
        const item = itemBarreau4(graine);
        const etape = item.meta.etapes[0];
        const ligne = String(etape.montrer);
        assert.equal(jugerEtape(etape, ligne), true, `${ligne} : sa propre ligne refusée`);

        // « −(4) + (3) » devient « −(+4) + (+3) » : le même nombre, dit deux fois.
        const signee = ligne.replace(/\((?=\d)/g, '(+');
        if (signee !== ligne) {
            avecPlus += 1;
            assert.equal(jugerEtape(etape, signee), true,
                `${ligne} refuse l'écriture signée ${signee}`);
        }

        // ET LE MÊME GESTE AVEC UN MOINS DOIT ÊTRE REFUSÉ : « (3) » et « (−3) »
        // ne sont pas le même nombre. Si l'épreuve ci-dessus passait pour une
        // mauvaise raison — un juge devenu aveugle aux signes —, celle-ci tombe.
        const faussee = ligne.replace(/\((?=\d)/g, '(−');
        if (faussee !== ligne) {
            assert.equal(jugerEtape(etape, faussee), false,
                `${ligne} accepte ${faussee}, où un nombre a changé de signe`);
        }

        // Et la valeur finale n'est pas la ligne demandée : c'est un SAUT, que
        // le générateur nomme `inacheve`, pas une ligne juste.
        assert.equal(jugerEtape(etape, item.answer), false,
            `${ligne} accepte le résultat ${item.answer} à la place de la ligne`);
    }
    // On a bien mesuré ce qu'on croit mesurer : sans parenthèse à signer, les
    // assertions du milieu ne se seraient jamais exécutées.
    assert.ok(avecPlus >= 20,
        `seulement ${avecPlus} tirages sur 30 avaient une parenthèse à signer`);
});
