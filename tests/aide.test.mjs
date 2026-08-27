// LA RÉPARTITION DE L'AIDE — combien de questions à deux propositions, combien
// à quatre, et à partir de quand on tape la réponse.
//
// Rémy a buté quatre fois sur ce réglage : « on comprend rien pour le slide »,
// « il faut le vrai aperçu », « en dessous ya plein de propositions », enfin
// « comment on sait le nombre de questions avec un qcm de 2, un qcm de 4 ? ».
// La dernière phrase disait le vrai défaut : un préréglage porte un NOM, et un
// nom ne dit pas combien de questions il couvre.
//
// Ces tests gardent la règle qui a remplacé le nom : deux nombres écrits par le
// professeur, le troisième déduit — donc une somme qui ne peut pas être fausse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    aideAuRang, repartitionDe, repartitionDuMode, ecrireRepartition,
    aideSelonEtat, etatDepart, apresReponse, affine
} from '../js/core/aide.js';

test('la répartition s\'écrit et se relit sans se déformer', () => {
    assert.equal(ecrireRepartition(3, 5), '3-5');
    assert.equal(ecrireRepartition(0, 0), '0-0');
    // Un nombre négatif n'a pas de sens : on le ramène à zéro plutôt que de
    // fabriquer une chaîne que la relecture ne comprendrait pas.
    assert.equal(ecrireRepartition(-2, 4), '0-4');
});

// --- La répartition écrite à la main -----------------------------------------

test('ON DÉFINIT VRAIMENT : deux nombres, et le troisième se déduit', () => {
    // Rémy, après trois essais sur ce panneau : « soit il faut expliquer au
    // prof que l'exercice s'adapte, soit on définit vraiment — par exemple sur
    // 10 questions on fait 2 questions de qcm de 2 puis 3 de qcm de 4 ».
    //
    // C'est sa phrase, mot pour mot, qu'on éprouve ici. « Progressif » est un
    // NOM : il ne dit ni combien de questions sont faciles, ni quand le clavier
    // arrive — et ce sont les deux nombres dont un professeur a besoin pour
    // préparer sa séance.
    const dire = (params, n) => {
        const out = [];
        for (let r = 1; r <= n; r++) {
            const a = aideAuRang(params, r, n);
            out.push(a.clavier ? 'C' : String(a.propositions));
        }
        return out.join(' ');
    };
    assert.equal(dire({ repartition: '2-3' }, 10), '2 2 4 4 4 C C C C C');
    // Les quatre préréglages s'écrivent tous comme des répartitions : c'est ce
    // qui permet de les remplacer par une seule commande.
    assert.equal(dire({ repartition: '10-0' }, 10), '2 2 2 2 2 2 2 2 2 2');
    assert.equal(dire({ repartition: '0-10' }, 10), '4 4 4 4 4 4 4 4 4 4');
    assert.equal(dire({ repartition: '0-0' }, 10), 'C C C C C C C C C C');
});

test('la répartition se borne au nombre de questions, quoi qu\'on ait écrit', () => {
    // Le nombre de questions se règle AILLEURS et peut descendre après coup :
    // sans borne, « 3 et 5 » sur un exercice ramené à quatre questions
    // promettrait huit questions qui n'existent pas.
    assert.deepEqual(repartitionDe({ repartition: '3-5' }, 4), { deux: 3, quatre: 1, clavier: 0 });
    assert.deepEqual(repartitionDe({ repartition: '9-9' }, 5), { deux: 5, quatre: 0, clavier: 0 });
    // Et la somme des trois fait TOUJOURS le total : c'est ce qui rend
    // l'interface infaillible — on ne saisit pas le troisième nombre.
    for (const brut of ['0-0', '2-3', '7-2', '50-50', '1-0']) {
        for (const n of [1, 4, 10, 25]) {
            const r = repartitionDe({ repartition: brut }, n);
            assert.equal(r.deux + r.quatre + r.clavier, n, `${brut} sur ${n} questions`);
            assert.ok(r.deux >= 0 && r.quatre >= 0 && r.clavier >= 0);
        }
    }
});

test('« auto » laisse le préréglage décider, et reste le défaut', () => {
    // Un professeur qui ne veut rien régler ne doit rien avoir à régler.
    assert.equal(repartitionDe({}, 10), null);
    assert.equal(repartitionDe({ repartition: 'auto' }, 10), null);
    assert.equal(repartitionDe({ repartition: '' }, 10), null);
    // Et la répartition qu'on PROPOSE au professeur est celle que le
    // préréglage produit : il ouvre le panneau, voit ce que l'exercice fait
    // déjà, et le corrige. Partir de zéro l'obligerait à reconstruire une
    // progression que le logiciel connaît.
    assert.deepEqual(repartitionDuMode({ aide: 'progressive' }, 10),
        { deux: 3, quatre: 5, clavier: 2 });
    assert.deepEqual(repartitionDuMode({ aide: 'deux' }, 6),
        { deux: 6, quatre: 0, clavier: 0 });
    assert.deepEqual(repartitionDuMode({ aide: 'clavier' }, 6),
        { deux: 0, quatre: 0, clavier: 6 });
});

test('la répartition écrite passe AVANT le préréglage et ses vis', () => {
    // C'est le professeur qui a décidé : aucun préréglage n'a d'avis à donner
    // par-dessus, et les deux vis d'« Affiner… » non plus.
    const p = { repartition: '1-1', aide: 'clavier', propositions: 6, saisie: 'toujours' };
    assert.deepEqual(aideAuRang(p, 1, 4), { propositions: 2, clavier: false });
    assert.deepEqual(aideAuRang(p, 2, 4), { propositions: 4, clavier: false });
    assert.deepEqual(aideAuRang(p, 3, 4), { propositions: 4, clavier: true });
});

test('la répartition écrite passe AVANT l\'échelle adaptative', () => {
    // LE BUG QUE CE TEST FERME. L'échelle adaptative ne s'efface que devant un
    // réglage « affiné » ; la répartition écrite n'en faisait pas partie. Un
    // professeur écrivait « les deux premières questions à deux propositions »,
    // et l'élève dont l'échelle était déjà montée recevait le clavier dès la
    // première question. La consigne du professeur passait après l'humeur du
    // moteur — l'inverse exact de ce qu'on veut.
    assert.equal(affine({ repartition: '2-3' }), true);
    assert.equal(affine({ repartition: 'auto' }), false);
    assert.equal(affine({ repartition: '' }), false);
    assert.equal(affine({}), false);

    // Un élève au sommet de l'échelle : trois réussites du premier coup, puis
    // deux — il est au clavier.
    let etat = etatDepart();
    for (let k = 0; k < 5; k++) etat = apresReponse(etat, { reussi: true });
    assert.deepEqual(aideSelonEtat({ aide: 'progressive' }, etat, 1, 10),
        { propositions: null, clavier: true });

    // Le MÊME élève, sur un exercice dont le professeur a écrit la
    // répartition : il fait ce que le professeur a écrit.
    const ecrit = { aide: 'progressive', repartition: '2-3' };
    assert.deepEqual(aideSelonEtat(ecrit, etat, 1, 10), { propositions: 2, clavier: false });
    assert.deepEqual(aideSelonEtat(ecrit, etat, 3, 10), { propositions: 4, clavier: false });
    // La phase « au clavier » d'une répartition écrite garde ses quatre
    // propositions sous le pavé — voir `aideAuRang` : l'élève tape, mais un
    // exercice qui ne sait pas se répondre au clavier a de quoi retomber.
    assert.deepEqual(aideSelonEtat(ecrit, etat, 6, 10), { propositions: 4, clavier: true });

    // Et sans répartition écrite, l'échelle garde la main : c'est le mode
    // adaptatif, celui que Rémy voulait qu'on propose quand même. Un débutant
    // ouvre à deux propositions quel que soit le rang de la question.
    const neuf = etatDepart();
    assert.deepEqual(aideSelonEtat({ aide: 'progressive' }, neuf, 9, 10),
        { propositions: 2, clavier: false });
});
