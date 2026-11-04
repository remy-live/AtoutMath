// LE PONT ET LA LAMPE — ce qui doit rester vrai d'une énigme à l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 4 novembre : « Oui super et il faut que ce soit joli ».
//
// CE QU'ON GARDE ICI N'EST PAS LE DESSIN — il se regarde. Ce sont les trois
// choses qui, fausses, donneraient tort à un élève qui a raison :
//
//   · LE MINIMUM ANNONCÉ EST VRAI. « 17 minutes » n'est pas recopié d'un
//     livre : il est calculé. Un objectif faux est pire que pas d'objectif —
//     l'élève cherche alors un chemin qui n'existe pas, ou s'arrête avant le
//     bon.
//   · LE CHEMIN SERVI EST JOUABLE. Deux personnes au plus, la lampe traverse
//     avec elles, et tout le monde finit de l'autre côté. Un corrigé
//     impossible se verrait au premier « Montre-moi ».
//   · ET L'ÉNIGME A UN PIÈGE. Si la stratégie qui vient toute seule était
//     déjà la meilleure, l'exercice n'enseignerait rien : c'est l'écart entre
//     19 et 17 qui est la leçon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    PLACES, direLeTrajet, enigmeDuPont, meilleurChemin, strategieNavette
} from '../js/core/pontLampe.js';

/**
 * ON REJOUE LE CHEMIN, on ne le croit pas sur parole.
 *
 * C'est la seule façon de savoir qu'un corrigé est jouable : additionner ses
 * minutes dirait seulement qu'il coûte ce qu'il annonce, pas qu'il respecte la
 * lampe, le nombre de places et la rive de départ de chacun.
 */
function rejouer(temps, trajets) {
    const n = temps.length;
    const aGauche = new Set(temps.map((_, i) => i));
    let lampe = 'gauche';
    let minutes = 0;
    for (const t of trajets) {
        assert.ok(t.qui.length >= 1 && t.qui.length <= PLACES,
            `${t.qui.length} personnes sur le pont, le maximum est ${PLACES}`);
        const partentDeGauche = t.vers === 'droite';
        assert.equal(lampe, partentDeGauche ? 'gauche' : 'droite',
            'on traverse sans la lampe');
        for (const i of t.qui) {
            assert.equal(aGauche.has(i), partentDeGauche,
                'quelqu\'un part d\'une rive où il n\'est pas');
            if (partentDeGauche) aGauche.delete(i); else aGauche.add(i);
        }
        assert.equal(t.minutes, Math.max(...t.qui.map(i => temps[i])),
            'le groupe ne va pas au rythme du plus lent');
        minutes += t.minutes;
        lampe = partentDeGauche ? 'droite' : 'gauche';
    }
    assert.equal(aGauche.size, 0, `${aGauche.size} personne(s) restée(s) au départ`);
    assert.equal(lampe, 'droite', 'la lampe est restée du mauvais côté');
    assert.equal(n, temps.length);
    return minutes;
}

test('L\'ÉNIGME DES LIVRES SE FAIT EN 17 MINUTES, ET ON LES CALCULE', () => {
    const e = meilleurChemin([1, 2, 5, 10]);
    assert.equal(e.minutes, 17,
        `le livre dit dix-sept, le calcul dit ${e.minutes}`);
    // ET LE CHEMIN SERVI EST JOUABLE, rejoué coup par coup.
    assert.equal(rejouer([1, 2, 5, 10], e.trajets), 17);
    // LES DEUX PLUS LENTS PASSENT ENSEMBLE : c'est toute l'idée de l'énigme, et
    // c'est ce qu'aucune autre stratégie ne fait.
    assert.ok(e.trajets.some(t => t.vers === 'droite' && t.qui.length === 2
        && t.qui.includes(2) && t.qui.includes(3)),
    'les deux plus lents ne traversent pas ensemble : ce n\'est pas la solution');
});

test('ET LA STRATÉGIE QUI VIENT TOUTE SEULE EN COÛTE 19', () => {
    // Le plus rapide accompagne chacun et revient : 2 + 1 + 5 + 1 + 10 = 19.
    // Ce nombre n'est pas là pour être joué, il est là pour être COMPARÉ :
    // sans lui, « 17 minutes » est un objectif tombé du ciel ; avec lui, c'est
    // un écart à combler.
    assert.equal(strategieNavette([1, 2, 5, 10]), 19);
    assert.ok(strategieNavette([1, 2, 5, 10]) > meilleurChemin([1, 2, 5, 10]).minutes);
});

test('LE COÛT D\'UN GROUPE EST LE MAXIMUM, PAS LA SOMME', () => {
    // C'est l'idée que cet exercice apporte et qu'aucun autre du logiciel ne
    // rencontre. Deux qui traversent ensemble ne mettent pas 3 + 7 minutes.
    const e = meilleurChemin([3, 7]);
    assert.equal(e.minutes, 7);
    assert.equal(e.trajets.length, 1);
    // Et une personne seule met son propre temps.
    assert.equal(meilleurChemin([4]).minutes, 4);
});

test('LE PREMIER PALIER APPREND LA RÈGLE, LE DEUXIÈME LA RETOURNE', () => {
    // À trois marcheurs, la navette EST la meilleure : on y apprend que la
    // lampe revient et que le groupe va au rythme du plus lent, sans avoir
    // encore à le remettre en cause. Un palier qui enseigne une règle et la
    // contredit dans la même minute n'enseigne ni l'une ni l'autre.
    const un = enigmeDuPont(1, null);
    assert.equal(un.minutes, un.navette);
    const deux = enigmeDuPont(2, null);
    assert.ok(deux.minutes < deux.navette,
        'le deuxième palier ne piège plus personne');
});

test('ET LE TROISIÈME NE SERT JAMAIS D\'ÉNIGME SANS PIÈGE', () => {
    // Servir au troisième palier une énigme où la navette est déjà optimale,
    // c'est dire à l'élève que la leçon du deuxième était un accident.
    let graine = 1;
    const rng = { int: (a, b) => { graine = (graine * 1103515245 + 12345) % 2147483648;
        return a + (graine % (b - a + 1)); } };
    for (let i = 0; i < 25; i++) {
        const e = enigmeDuPont(3, rng);
        assert.equal(rejouer(e.temps, e.trajets), e.minutes);
        assert.ok(e.minutes < e.navette,
            `tirage ${JSON.stringify(e.temps)} : la navette suffit déjà (${e.navette})`);
    }
});

test('ET LE RETOUR SE DIT « RAPPORTE LA LAMPE »', () => {
    // On ne « passe » pas en revenant : on RAPPORTE la lampe. C'est le geste
    // que l'élève oublie, donc c'est celui qu'il faut nommer.
    const m = [{ nom: 'Léa' }, { nom: 'Tom' }];
    assert.equal(direLeTrajet({ qui: [0, 1], vers: 'droite', minutes: 2 }, m),
        'Léa et Tom passent ensemble (2 min)');
    assert.equal(direLeTrajet({ qui: [0], vers: 'gauche', minutes: 1 }, m),
        'Léa rapporte la lampe (1 min)');
});

test('LA PREMIÈRE EST CELLE DU LIVRE, LES SUIVANTES SONT TIRÉES', () => {
    // MESURÉ SUR LA FICHE IMPRIMÉE : une feuille de quatre énigmes imprimait
    // QUATRE FOIS « Léa 1 · Tom 2 · Zoé 5 · Noé 10 ». Personne ne fait quatre
    // fois la même chose — c'est le défaut que La Traversée avait eu, au même
    // endroit, pour la même raison.
    //
    // ET L'ORDRE EST LE BON : on rencontre d'abord l'énigme canonique, celle
    // dont le 17 contre 19 se raconte, puis on applique l'idée à des nombres
    // neufs.
    let graine = 7;
    const rng = { int: (a, b) => { graine = (graine * 1103515245 + 12345) % 2147483648;
        return a + (graine % (b - a + 1)); } };
    assert.deepEqual(enigmeDuPont(2, rng, 0).temps, [1, 2, 5, 10]);
    const vues = new Set();
    for (let i = 1; i <= 6; i++) {
        const e = enigmeDuPont(2, rng, i);
        assert.equal(e.temps.length, 4, 'une variante a changé de nombre de marcheurs');
        assert.ok(e.minutes < e.navette, `variante ${JSON.stringify(e.temps)} : sans piège`);
        vues.add(e.temps.join('-'));
    }
    assert.ok(vues.size >= 4, `six tirages n'ont donné que ${vues.size} énigme(s)`);
    assert.ok(!vues.has('1-2-5-10') || vues.size > 1,
        'les variantes redonnent toujours l\'énigme du livre');
});
