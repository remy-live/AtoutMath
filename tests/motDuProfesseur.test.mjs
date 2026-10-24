// L'ASTUCE DU MOT NE S'ÉCRIT QU'UNE FOIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour l'aide pour le parcours de prof, dès que je glisse le texte,
// l'aide réapparait, ne la fait apparaitre qu'une fois. »
//
// MESURÉ AVANT, au navigateur : trois mots glissés, trois fois la même phrase
// de cent six caractères l'une sous l'autre — « Ce que l'élève lira ici. Une
// ligne vide fait un paragraphe, *un mot entre étoiles* s'affiche en gras. »
// Elle enseigne quelque chose la première fois ; les suivantes, elle occupe
// dans la colonne plus de place que les mots eux-mêmes.
//
// ── CE QUE CES ÉPREUVES TIENNENT, ET CE QU'ELLES NE TIENNENT PAS ──────────
//
// Ce qui se tient ici : la RÈGLE, qui est du calcul pur — quel champ porte
// l'astuce, quels champs portent la phrase courte.
//
// Ce qui ne s'y tient pas et qui est dans `tools/tmp/inviteMot.mjs` : qu'elle
// arrive jusqu'à l'attribut `placeholder` du vrai champ. C'est la raison pour
// laquelle la règle vit dans `core/messageEtape.js` et non dans
// `ui/builder.js` — ce dernier ne s'importe pas sans `document`, et une règle
// qu'aucune épreuve ne peut atteindre finit par être crue sur parole.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASTUCE_MOT, INVITE_MOT, inviteDuMot } from '../js/core/messageEtape.js';
import { estUnMessage, makeStep, makeMessage } from '../js/core/path.js';

/** Un parcours : « m » pour un mot, « x » pour un exercice. */
const parcours = (forme) => [...forme].map((c, i) => (c === 'm'
    ? { ...makeMessage({}), stepId: `m${i}` }
    : { ...makeStep('calc-add', {}, { stepId: `x${i}` }) }));

const invites = (steps) => steps.filter(estUnMessage)
    .map(s => inviteDuMot(s, steps, estUnMessage));

test('UN SEUL CHAMP PORTE L\'ASTUCE, QUEL QUE SOIT LE NOMBRE DE MOTS', () => {
    // La demande de Rémy, mot pour mot : « ne la fait apparaitre qu'une fois ».
    for (const forme of ['m', 'mm', 'mmm', 'xmxmxm', 'mmmmmm']) {
        const vu = invites(parcours(forme));
        const combien = vu.filter(p => p === ASTUCE_MOT).length;
        assert.equal(combien, 1,
            `« ${forme} » : ${combien} astuce(s) pour ${vu.length} mot(s)`);
        assert.ok(vu.slice(1).every(p => p === INVITE_MOT),
            `« ${forme} » : un mot autre que le premier porte encore l'astuce`);
    }
});

test('ET C\'EST LE PREMIER MOT QUI LA PORTE, MÊME PRÉCÉDÉ D\'EXERCICES', () => {
    // Un parcours commence presque toujours par un exercice : si l'astuce
    // suivait le premier ÉLÉMENT et non le premier MOT, elle n'apparaîtrait
    // jamais.
    const steps = parcours('xxmxm');
    const mots = steps.filter(estUnMessage);
    assert.equal(inviteDuMot(mots[0], steps, estUnMessage), ASTUCE_MOT);
    assert.equal(inviteDuMot(mots[1], steps, estUnMessage), INVITE_MOT);
});

test('UN PARCOURS SANS LE MOINDRE MOT NE JETTE PAS', () => {
    // `inviteDuMot` est appelée en dessinant une ligne ; une liste vide ou
    // sans mot arrive au premier rendu, avant que rien ne soit posé.
    const vide = { stepId: 'seul', ...makeMessage({}) };
    assert.equal(inviteDuMot(vide, [], estUnMessage), INVITE_MOT);
    assert.equal(inviteDuMot(vide, undefined, estUnMessage), INVITE_MOT);
    assert.equal(inviteDuMot(vide, parcours('xx'), estUnMessage), INVITE_MOT);
});

test('LES DEUX PHRASES DISENT CE QU\'ELLES DOIVENT DIRE', () => {
    // L'astuce enseigne la mise en forme — c'est sa seule raison d'être, et
    // c'est ce qui justifie qu'on la garde quelque part.
    assert.match(ASTUCE_MOT, /ligne vide fait un paragraphe/);
    assert.match(ASTUCE_MOT, /entre étoiles/);
    // La courte ne l'enseigne pas, sans quoi on n'aurait rien allégé.
    assert.doesNotMatch(INVITE_MOT, /étoiles|paragraphe/);
    // Et elle dit quand même à quoi sert le champ : un champ sans invite
    // laisse le professeur deviner ce qu'il doit y écrire.
    assert.match(INVITE_MOT, /élève/);
    assert.ok(INVITE_MOT.length < ASTUCE_MOT.length / 2,
        `la courte fait ${INVITE_MOT.length} caractères pour ${ASTUCE_MOT.length}`);
});
