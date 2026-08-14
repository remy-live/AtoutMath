import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    nombre, operateur, ouvrante, fermante, ecrire, calculer,
    groupeInterieur, operationPrioritaire, critiquer, reduire, terminee,
    etapes, valeurFinale, tirerExpression, naif
} from '../js/core/priorites.js';

/** Écrit une expression rapidement : « 3 + 4 × 5 » depuis un gabarit. */
const exp = (...parts) => parts.map(p =>
    (typeof p === 'number' ? nombre(p)
        : p === '(' ? ouvrante() : p === ')' ? fermante() : operateur(p)));

// --- L'écriture -------------------------------------------------------------------

test('l\'expression s\'écrit comme au tableau', () => {
    assert.equal(ecrire(exp(3, '+', 4, '×', 5)), '3 + 4 × 5');
    // Le vrai signe moins, pas le trait d'union.
    assert.equal(ecrire(exp(9, '-', 2)), '9 − 2');
    // Les parenthèses collent à ce qu'elles enferment.
    assert.equal(ecrire(exp('(', 3, '+', 4, ')', '×', 5)), '(3 + 4) × 5');
    assert.equal(ecrire(exp(2, '×', '(', 8, '-', 3, ')')), '2 × (8 − 3)');
});

test('les deux interdits du niveau : pas de négatif, pas de reste', () => {
    assert.equal(calculer(3, '-', 8), null);
    assert.equal(calculer(8, '-', 3), 5);
    assert.equal(calculer(7, '÷', 2), null);
    assert.equal(calculer(8, '÷', 2), 4);
});

// --- Trouver l'opération prioritaire ------------------------------------------------

test('la multiplication passe avant l\'addition', () => {
    const p = operationPrioritaire(exp(3, '+', 4, '×', 5));
    assert.equal(p.op, '×');
    assert.equal(p.gauche, 4);
    assert.equal(p.droite, 5);
    assert.equal(p.valeur, 20);
    assert.match(p.raison, /avant les additions/);
});

test('à priorité égale, on va de gauche à droite', () => {
    // 12 ÷ 3 × 2 : c'est la division d'abord, pas la multiplication.
    const p = operationPrioritaire(exp(12, '÷', 3, '×', 2));
    assert.equal(p.op, '÷');
    assert.equal(p.index, 1);
    assert.match(p.raison, /gauche à droite/);

    // 9 − 4 + 2 : la soustraction d'abord. L'élève qui fait 4 + 2 se trompe.
    const q = operationPrioritaire(exp(9, '-', 4, '+', 2));
    assert.equal(q.op, '-');
    assert.equal(q.index, 1);
});

test('les parenthèses passent avant tout, même avant une multiplication', () => {
    const p = operationPrioritaire(exp(2, '×', '(', 8, '-', 3, ')'));
    assert.equal(p.op, '-');
    assert.equal(p.valeur, 5);
    assert.match(p.raison, /parenthèses/i);
    assert.deepEqual(p.dans, { debut: 2, fin: 6 });
});

test('on trouve le groupe de parenthèses le PLUS INTÉRIEUR', () => {
    // ((3 + 4) × 2) : c'est 3 + 4 qu'on fait d'abord.
    const j = exp('(', '(', 3, '+', 4, ')', '×', 2, ')');
    assert.deepEqual(groupeInterieur(j), { debut: 1, fin: 5 });
    assert.equal(operationPrioritaire(j).valeur, 7);
    assert.equal(groupeInterieur(exp(3, '+', 4)), null);
});

test('deux groupes côte à côte : le premier rencontré d\'abord', () => {
    const j = exp('(', 2, '+', 3, ')', '×', '(', 4, '+', 1, ')');
    const p = operationPrioritaire(j);
    assert.equal(p.valeur, 5);
    assert.deepEqual(p.dans, { debut: 0, fin: 4 });
});

test('quand il ne reste rien à faire, on le dit', () => {
    assert.equal(operationPrioritaire(exp(7)), null);
    assert.equal(terminee(exp(7)), true);
    assert.equal(terminee(exp(3, '+', 4)), false);
});

// --- La critique d'un mauvais clic ----------------------------------------------------

test('le bon clic ne reçoit aucune critique', () => {
    assert.equal(critiquer(exp(3, '+', 4, '×', 5), 3), null);
});

test('chaque mauvais clic reçoit SA raison, pas un « faux » générique', () => {
    // Cliquer le + alors qu'il reste une multiplication.
    assert.match(critiquer(exp(3, '+', 4, '×', 5), 1), /multiplication/);
    // Cliquer dehors alors qu'il reste des parenthèses.
    assert.match(critiquer(exp(2, '×', '(', 8, '-', 3, ')'), 1), /parenthèses/i);
    // Même famille, mais plus à droite.
    assert.match(critiquer(exp(9, '-', 4, '+', 2), 3), /GAUCHE À DROITE/);
    // Cliquer un nombre.
    assert.match(critiquer(exp(3, '+', 4), 0), /pas une opération/);
    assert.match(critiquer(exp(7), 0), /plus d'opération/);
});

// --- La réécriture, qui est l'exercice --------------------------------------------------

test('réduire recopie le reste à l\'identique', () => {
    // C'EST LA FAUTE QU'ON TRAQUE : faire 4 × 5 puis oublier le « − 2 ».
    const j = exp(3, '+', 4, '×', 5, '-', 2);
    const suivant = reduire(j, 3, 20);
    assert.equal(ecrire(suivant), '3 + 20 − 2');
});

test('les parenthèses devenues inutiles disparaissent toutes seules', () => {
    // « (7) × 2 » ne s'écrit pas : aucun professeur n'écrirait cette ligne.
    const j = exp('(', 3, '+', 4, ')', '×', 2);
    assert.equal(ecrire(reduire(j, 2, 7)), '7 × 2');
    // Y compris deux niveaux d'un coup.
    const k = exp('(', '(', 3, '+', 4, ')', ')', '×', 2);
    assert.equal(ecrire(reduire(k, 3, 7)), '7 × 2');
});

test('la suite des lignes est celle qu\'on écrirait au tableau', () => {
    const l = etapes(exp(3, '+', 4, '×', 5, '-', 2));
    assert.deepEqual(l.map(x => x.texte), ['3 + 4 × 5 − 2', '3 + 20 − 2', '23 − 2', '21']);
    // Chaque ligne dit ce qui a été fait, et pourquoi.
    assert.deepEqual(l[1].fait, { op: '×', gauche: 4, droite: 5, valeur: 20 });
    assert.match(l[1].raison, /avant les additions/);
    assert.equal(valeurFinale(exp(3, '+', 4, '×', 5, '-', 2)), 21);
});

test('une expression avec parenthèses se déroule dans le bon ordre', () => {
    const l = etapes(exp('(', 2, '+', 3, ')', '×', '(', 4, '+', 1, ')'));
    assert.deepEqual(l.map(x => x.texte), ['(2 + 3) × (4 + 1)', '5 × (4 + 1)', '5 × 5', '25']);
});

test('une expression qui passerait par un négatif est refusée', () => {
    // 3 − 4 × 2 vaudrait 3 − 8 : hors du niveau.
    assert.equal(etapes(exp(3, '-', 4, '×', 2)), null);
    assert.equal(valeurFinale(exp(3, '-', 4, '×', 2)), null);
    // 7 ÷ 2 ne tombe pas juste.
    assert.equal(etapes(exp(1, '+', 7, '÷', 2)), null);
});

// --- Le tirage ----------------------------------------------------------------------------

test('chaque expression tirée se déroule jusqu\'au bout, sans interdit', () => {
    for (let n = 1; n <= 4; n++) {
        for (let i = 0; i < 120; i++) {
            const e = tirerExpression({ rng: makeRng(`p_${n}_${i}`), niveau: n });
            assert.ok(e.lignes, `niveau ${n} : expression sans solution`);
            assert.equal(e.lignes[e.lignes.length - 1].jetons[0].valeur, e.resultat);
            assert.ok(e.resultat >= 0 && e.resultat <= 400, `résultat ${e.resultat}`);
            // AU MOINS DEUX ÉTAPES : sans cela, il n'y a pas de priorité à trancher.
            assert.ok(e.etapes >= 2, `${e.texte} se règle en une étape`);
            // Et chaque étape franchie est bien la prioritaire du moment.
            verifierChaine(e);
        }
    }
});

/** Rejoue la chaîne : chaque ligne découle de la précédente par la prioritaire. */
function verifierChaine(e) {
    for (let i = 0; i + 1 < e.lignes.length; i++) {
        const courant = e.lignes[i].jetons;
        const p = operationPrioritaire(courant);
        assert.ok(p, `${e.lignes[i].texte} : plus d'opération`);
        assert.equal(p.valeur, e.lignes[i + 1].fait.valeur);
        assert.equal(ecrire(reduire(courant, p.index, p.valeur)), e.lignes[i + 1].texte);
    }
}

test('sans parenthèses, on n\'en tire aucune', () => {
    for (let n = 1; n <= 4; n++) {
        for (let i = 0; i < 60; i++) {
            const e = tirerExpression({ rng: makeRng(`np_${n}_${i}`), niveau: n, parentheses: false });
            assert.equal(e.avecParentheses, false, e.texte);
            assert.ok(!e.texte.includes('('), e.texte);
        }
    }
});

test('sans parenthèses, calculer de gauche à droite donne TOUJOURS faux', () => {
    // Sinon l'élève qui ignore la règle tombe juste, et l'exercice ne prouve
    // rien du tout.
    for (let i = 0; i < 300; i++) {
        const e = tirerExpression({ rng: makeRng('nf' + i), niveau: 2, parentheses: false });
        const bete = naif(e.jetons);
        assert.notEqual(bete, e.resultat,
            `« ${e.texte} » : de gauche à droite on trouve ${bete}, la bonne réponse aussi`);
    }
});

test('les niveaux avec parenthèses en produisent vraiment', () => {
    let avec = 0;
    for (let i = 0; i < 120; i++) {
        if (tirerExpression({ rng: makeRng('ap' + i), niveau: 3 }).avecParentheses) avec++;
    }
    assert.ok(avec > 30, `seulement ${avec} expressions parenthésées sur 120`);
    // Au niveau 4, elles sont systématiques.
    for (let i = 0; i < 60; i++) {
        assert.equal(tirerExpression({ rng: makeRng('a4' + i), niveau: 4 }).avecParentheses, true);
    }
});

test('la même graine redonne la même expression', () => {
    const a = tirerExpression({ rng: makeRng('graine'), niveau: 3 });
    const b = tirerExpression({ rng: makeRng('graine'), niveau: 3 });
    assert.equal(a.texte, b.texte);
    assert.equal(a.resultat, b.resultat);
});

test('le calcul naïf ne s\'applique pas aux expressions parenthésées', () => {
    assert.equal(naif(exp('(', 3, '+', 4, ')', '×', 2)), null);
    assert.equal(naif(exp(3, '+', 4, '×', 2)), 14, 'de gauche à droite : 7 × 2');
});
