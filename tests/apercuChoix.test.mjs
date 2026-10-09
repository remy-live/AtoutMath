// LE TEXTE D'UNE PROPOSITION — ce que la bulle d'aperçu doit montrer.
//
// RÉMY, capture de la bulle de la frise du QCM : « pas très clair sous le
// développe et réduis, il y a du html ».
//
// Il y en avait. La bulle prenait le `label` d'une proposition — qui est du
// BALISAGE, « 4<i class="fx-var">x</i> + 36 » — et l'échappait pour
// l'afficher. Le professeur lisait une balise à la place d'une réponse.
//
// ON PRÉFÈRE `texte`, que les générateurs posent déjà pour la fiche papier :
// il vient du même arbre que le libellé, donc il ne peut pas le démentir.
// Quand il manque, on LIT le balisage plutôt que de l'effacer — mesuré, deux
// générateurs sur cent trente-et-un sont dans ce cas, et ce sont des fractions
// EMPILÉES, que l'effacement des balises rendait « 7 8 » au lieu de « 7/8 ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteDeChoix } from '../js/core/apercuChoix.js';

const frac = (n, d) => `<span class="fraction"><span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

test('LE TEXTE DÉJÀ ÉCRIT GAGNE TOUJOURS', () => {
    assert.equal(texteDeChoix({ label: '4<i class="fx-var">x</i> + 36', texte: '4x + 36' }),
        '4x + 36');
    // Même quand le libellé est propre : c'est `texte` qui fait foi.
    assert.equal(texteDeChoix({ label: '12', texte: 'douze' }), 'douze');
});

test('SANS TEXTE, ON LIT LE BALISAGE — ET PLUS AUCUNE BALISE NE PASSE', () => {
    assert.equal(texteDeChoix({ label: '4<i class="fx-var">x</i> + 36' }), '4x + 36');
    assert.equal(texteDeChoix({ label: '<b>2</b>&nbsp;<em>fois</em>' }), '2 fois');
    // ET LES CHEVRONS QUI SONT DES RÉPONSES SURVIVENT : « < » et « > » sont
    // ce qu'on demande d'écrire dans « comparer deux fractions ».
    assert.equal(texteDeChoix({ label: '<' }), '<');
    assert.equal(texteDeChoix({ label: '3 < 5 > 2' }), '3 < 5 > 2');
    // Le test qui compte : plus rien qui ressemble à une balise.
    for (const l of ['4<i class="fx-var">x</i> + 36', frac(7, 8),
        '<i>x</i><sup class="fx-exp">2</sup> − 9', '<div><span>3</span></div>']) {
        const t = texteDeChoix({ label: l });
        assert.ok(!/<\/?[a-z]/i.test(t), `« ${t} » porte encore du balisage`);
    }
});

test('UNE FRACTION EMPILÉE SE LIT EN LIGNE, PAS EN DEUX NOMBRES', () => {
    // C'est le défaut que l'effacement des balises aurait créé : « 7 8 »
    // n'est pas 7/8, et un aperçu faux est pire qu'un aperçu vide.
    assert.equal(texteDeChoix({ label: frac(7, 8) }), '7/8');
    assert.equal(texteDeChoix({ label: `${frac(7, 8)} + ${frac(1, 2)}` }), '(7/8) + (1/2)');
    // ET ELLE PREND SES PARENTHÈSES QUAND ELLE N'EST PAS SEULE — mesuré au
    // banc : « 2 » suivi de 35/12 donnait « 235/12 », c'est-à-dire un AUTRE
    // nombre. Seule, elle s'écrit sans rien : « 7/8 » se lit sans hésiter.
    assert.equal(texteDeChoix({ label: `2${frac(35, 12)} + 1` }), '2(35/12) + 1');
});

test('UN EXPOSANT REDEVIENT UN CHIFFRE HAUT', () => {
    // « x2 » ne se lit pas comme « x² », et c'est la faute que le chapitre
    // des puissances passe son temps à combattre.
    assert.equal(texteDeChoix({ label: '<i class="fx-var">x</i><sup class="fx-exp">2</sup> − 9' }),
        'x² − 9');
    assert.equal(texteDeChoix({ label: '10<sup>-3</sup>' }), '10⁻³');
    // Un exposant qui n'est pas un nombre garde le signe qu'on tape.
    assert.equal(texteDeChoix({ label: '2<sup>n</sup>' }), '2^n');
});

test('CE QUI N\'A NI TEXTE NI LIBELLÉ RETOMBE SUR SA VALEUR', () => {
    assert.equal(texteDeChoix({ value: 'ok' }), 'ok');
    assert.equal(texteDeChoix(null), '');
    assert.equal(texteDeChoix({}), '');
    assert.equal(texteDeChoix('déjà du texte'), 'déjà du texte');
});

test('TOUT LE CATALOGUE PASSE : aucune proposition ne montre de balise', async () => {
    // LE VRAI TEST, celui qui aurait attrapé le défaut de Rémy : on tire une
    // question de CHAQUE générateur et l'on regarde ce que la bulle écrirait.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    let vus = 0;
    const fautifs = [];
    for (const g of allGenerators()) {
        let it;
        try { it = g.generate({}, { rng: makeRng(`bulle-${g.id}`), index: 0, total: 4 }); }
        catch (e) { continue; }
        for (const c of (it && it.choices) || []) {
            const t = texteDeChoix(c);
            vus += 1;
            // ON CHERCHE UNE BALISE, PAS UN CHEVRON : « < » et « > » sont
            // les BONNES RÉPONSES de « comparer deux fractions ». Ce test-ci
            // les a signalées comme des fautes à sa première écriture, et il
            // avait tort — mais il m'a fait voir que le nettoyeur, lui,
            // avalait « < 5 > » au milieu de « 3 < 5 > 2 ».
            if (/<\/?[a-z]/i.test(t) || /&[a-z]+;/.test(t)) {
                fautifs.push(`${g.id} : « ${t.slice(0, 40)} »`);
            }
        }
    }
    // Le seuil ne garde qu'une chose : que le balayage a bien eu lieu.
    assert.ok(vus > 150, `seulement ${vus} propositions lues`);
    assert.deepEqual(fautifs, [], 'ces propositions montreraient du balisage dans la bulle');
});
