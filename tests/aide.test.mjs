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
    aideSelonEtat, etatDepart, apresReponse, affine,
    lireZones, ecrireZones, normaliserZones, zonesDuMode, zoneDuRang,
    modeVoisin, MODES_ZONE
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

// --- LES ZONES : LA RÉPARTITION, GÉNÉRALISÉE ---------------------------------
//
// Rémy, sixième passage : « quand on clique sur une zone, on a au-dessus
// l'aperçu, et un bouton pour ajouter ou enlever le nombre de propositions. On
// peut aussi enlever la zone, et on a un bouton pour en rajouter. »
//
// C'était une demande de FOND, pas d'interface : le modèle à deux nombres
// supposait trois phases fixes — deux propositions, quatre, puis le clavier —
// et cette hypothèse commode interdisait de commencer à trois, de faire deux
// paliers séparés, ou de n'en proposer que six.

test('ON RELIT L\'ANCIENNE ÉCRITURE SANS PERDRE LE RÉGLAGE', () => {
    // Les parcours déjà enregistrés portent « 3-5 ». Les relire faux effacerait
    // sans prévenir un réglage que le professeur a posé — ce serait la pire
    // façon de changer un modèle de données.
    const z = lireZones({ repartition: '3-5' }, 12);
    assert.deepEqual(z, [{ n: 3, mode: '2' }, { n: 5, mode: '4' }, { n: 4, mode: 'k' }]);
    // Et la nouvelle écriture dit la même chose, en plus explicite.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 12), z);
    assert.equal(ecrireZones(z), '3:2,5:4,4:k');
    // « auto » et le vide ne sont pas des zones : c'est l'absence de réglage.
    for (const rien of ['auto', '', null, undefined]) {
        assert.equal(lireZones({ repartition: rien }, 10), null);
    }
});

test('LA DERNIÈRE ZONE ABSORBE LE RESTE — la somme est infaillible', () => {
    // C'est la règle qui remplace « la troisième phase est ce qui reste » : on
    // ne saisit jamais le total, donc on ne peut pas se tromper dessus.
    for (const total of [1, 4, 7, 15, 20, 50]) {
        for (const brut of ['3:2,5:4,2:k', '1:2', '9:2,9:4,9:6,9:k', '2:3,2:6']) {
            const z = lireZones({ repartition: brut }, total);
            assert.equal(z.reduce((s, x) => s + x.n, 0), total,
                `« ${brut} » sur ${total} questions`);
            assert.ok(z.every(x => x.n > 0), 'aucune zone vide ne survit');
            assert.ok(z.length >= 1, 'il reste toujours une façon de répondre');
        }
    }
    // Une répartition trop longue se coupe DANS L'ORDRE, et c'est le bon
    // choix : le nombre de questions se règle ailleurs et peut baisser APRÈS
    // qu'on a écrit les zones. Tronquer par la fin garde le DÉBUT de la
    // progression — c'est-à-dire l'aide, qui est ce à quoi le professeur
    // tenait ; tout ramener à la première zone lui ferait perdre son escalier.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 4),
        [{ n: 3, mode: '2' }, { n: 1, mode: '4' }]);
    // Et à une seule question, il ne reste que la première façon de répondre.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 1), [{ n: 1, mode: '2' }]);
});

test('LE RANG SAIT DANS QUELLE ZONE IL TOMBE', () => {
    const z = lireZones({ repartition: '3:2,5:4,2:k' }, 10);
    assert.deepEqual(zoneDuRang(z, 1), { i: 0, de: 1, a: 3, zone: z[0] });
    assert.deepEqual(zoneDuRang(z, 3), { i: 0, de: 1, a: 3, zone: z[0] });
    assert.deepEqual(zoneDuRang(z, 4), { i: 1, de: 4, a: 8, zone: z[1] });
    assert.deepEqual(zoneDuRang(z, 10), { i: 2, de: 9, a: 10, zone: z[2] });
    // Hors bornes, on ne sort pas de l'exercice : c'est la dernière zone.
    assert.equal(zoneDuRang(z, 99).i, 2);
});

test('L\'ÉCHELLE D\'AIDE SE PARCOURT DANS UN SEUL SENS, et elle a deux bouts', () => {
    // Un seul bouton par sens, parce qu'il n'y a qu'une échelle — et non un
    // menu de six entrées qu'il faudrait lire pour comprendre qu'elles sont
    // ordonnées, du plus aidé au plus autonome.
    assert.equal(modeVoisin('2', 1), '3');
    assert.equal(modeVoisin('4', 1), '6');
    assert.equal(modeVoisin('4', -1), '3');
    // Aux extrémités, on ne déborde pas : les boutons s'y désactivent.
    assert.equal(modeVoisin('2', -1), '2');
    assert.equal(modeVoisin('k', 1), 'k');
    assert.equal(MODES_ZONE[0].cle, '2');
    assert.equal(MODES_ZONE[MODES_ZONE.length - 1].cle, 'k');
});

test('CHAQUE ZONE COMMANDE VRAIMENT CE QUE L\'ÉLÈVE VOIT', () => {
    // Le point qui compte : la frise n'est pas un dessin, c'est le réglage.
    const p = { repartition: '2:2,3:6,2:t,3:k', aide: 'clavier', propositions: 9 };
    assert.deepEqual(aideAuRang(p, 1, 10), { propositions: 2, clavier: false });
    assert.deepEqual(aideAuRang(p, 3, 10), { propositions: 6, clavier: false });
    assert.deepEqual(aideAuRang(p, 6, 10), { propositions: null, clavier: false });
    // « Toutes » veut dire « autant que le générateur en fabrique ».
    assert.deepEqual(aideAuRang(p, 8, 10), { propositions: 4, clavier: true });
    // Et cela passe AVANT le préréglage et ses vis, comme avant.
    assert.equal(aideAuRang(p, 1, 10).clavier, false);
});

test('LES ZONES DU PRÉRÉGLAGE regroupent les rangs voisins qui se ressemblent', () => {
    // C'est ce qui AMORCE la saisie quand on passe à « Je définis » : le
    // professeur part de ce que l'exercice fait déjà, pas d'une grille vide.
    const z = normaliserZones(zonesDuMode({ aide: 'progressive' }, 10), 10);
    assert.equal(z.reduce((s, x) => s + x.n, 0), 10);
    // Des zones VOISINES ne portent jamais le même mode : ce serait deux
    // rectangles collés qu'on ne pourrait pas distinguer sur la frise.
    for (let i = 1; i < z.length; i++) {
        assert.notEqual(z[i].mode, z[i - 1].mode, `zones ${i - 1} et ${i} identiques`);
    }
    // Un préréglage qui ne change jamais donne UNE seule zone.
    assert.equal(normaliserZones(zonesDuMode({ aide: 'clavier' }, 8), 8).length, 1);
});

test('DEUX ZONES VOISINES NE PORTENT JAMAIS LE MÊME MODE', () => {
    // Ce seraient deux rectangles collés qu'on ne pourrait pas distinguer sur
    // la frise, et deux lignes identiques dans la légende : un découpage qui ne
    // découpe rien. Le cas arrive pour de vrai — monter une zone au dernier
    // mode possible la rend identique à sa voisine, et il faut alors les fondre.
    const z = normaliserZones([{ n: 3, mode: '2' }, { n: 4, mode: 'k' }, { n: 5, mode: 'k' }], 12);
    assert.deepEqual(z, [{ n: 3, mode: '2' }, { n: 9, mode: 'k' }]);
    // La fusion garde le TOTAL : ce qu'on fond, on l'additionne.
    assert.equal(z.reduce((s2, x) => s2 + x.n, 0), 12);
    // Trois de suite fondent aussi, et l'ordre est conservé.
    assert.deepEqual(
        normaliserZones([{ n: 2, mode: '4' }, { n: 2, mode: '4' }, { n: 2, mode: '4' }], 6),
        [{ n: 6, mode: '4' }]);
    // Mais deux zones de même mode SÉPARÉES par une autre restent distinctes :
    // « quatre propositions, puis le clavier, puis à nouveau quatre » est une
    // progression bizarre, mais c'est celle que le professeur a écrite.
    assert.equal(
        normaliserZones([{ n: 2, mode: '4' }, { n: 2, mode: 'k' }, { n: 2, mode: '4' }], 6).length, 3);
});
