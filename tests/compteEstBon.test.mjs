import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    PETITES, GRANDES, OPERATIONS, calculer, utile, tirerPlaques, tirerPartie,
    commencer, poserEtape, annulerEtape, gagnee, resoudre, conseil, meilleurEcart
} from '../js/core/compteEstBon.js';

// --- Les règles du jeu ------------------------------------------------------------

test('les quatre opérations, et leurs deux interdits', () => {
    assert.equal(calculer(7, '+', 5), 12);
    assert.equal(calculer(7, '×', 5), 35);
    assert.equal(calculer(7, '-', 5), 2);
    assert.equal(calculer(100, '÷', 4), 25);
    // JAMAIS DE NÉGATIF : la soustraction ne se pose que du grand vers le petit.
    assert.equal(calculer(5, '-', 7), null);
    assert.equal(calculer(5, '-', 5), 0, 'zéro est un résultat, pas un refus');
    // JAMAIS DE RESTE : c'est ce qui fait du jeu un exercice de divisibilité.
    assert.equal(calculer(100, '÷', 7), null);
    assert.equal(calculer(7, '÷', 0), null);
});

test('les opérations qui ne servent à rien sont écartées', () => {
    // Multiplier ou diviser par 1 gaspille une plaque sans avancer.
    assert.equal(utile(7, '×', 1), false);
    assert.equal(utile(1, '×', 7), false);
    assert.equal(utile(7, '÷', 1), false);
    // Et « a − a » fait zéro, ce qui ne mène nulle part.
    assert.equal(utile(7, '-', 7), false);
    assert.equal(utile(7, '+', 1), true, 'ajouter 1 reste utile');
    assert.equal(utile(7, '×', 2), true);
});

// --- Le tirage -----------------------------------------------------------------------

test('la plaque porte six nombres, dont au moins une grande', () => {
    for (let i = 0; i < 200; i++) {
        const p = tirerPlaques(makeRng('pl' + i), 1);
        assert.equal(p.length, 6);
        assert.ok(p.some(v => GRANDES.includes(v)), `aucune grande plaque : ${p}`);
        // Chaque petite n'existe qu'en deux exemplaires, chaque grande en un.
        for (const v of new Set(p)) {
            const n = p.filter(x => x === v).length;
            assert.ok(n <= (GRANDES.includes(v) ? 1 : 2), `${v} apparaît ${n} fois`);
            assert.ok(PETITES.includes(v) || GRANDES.includes(v), `${v} n'est pas une plaque`);
        }
    }
});

test('on peut exiger deux grandes plaques, ou plus', () => {
    for (let i = 0; i < 60; i++) {
        const p = tirerPlaques(makeRng('g' + i), 2);
        assert.equal(p.filter(v => GRANDES.includes(v)).length, 2);
    }
});

test('le compte est bon PAR CONSTRUCTION, et dans la fourchette du jeu', () => {
    // Un tirage tiré au hasard puis testé donnerait des comptes impossibles.
    // Ici la cible est le résultat d'un vrai chemin : elle est atteignable.
    for (let ops = 2; ops <= 5; ops++) {
        for (let i = 0; i < 40; i++) {
            const p = tirerPartie({ rng: makeRng(`t_${ops}_${i}`), operations: ops });
            assert.ok(p.but >= 100 && p.but <= 999, `cible hors fourchette : ${p.but}`);
            assert.equal(p.solution.length, p.operations);
            assert.ok(p.operations <= ops, `${p.operations} opérations pour un réglage à ${ops}`);
            // Et la solution annoncée se rejoue vraiment.
            rejouer(p);
        }
    }
});

/** Rejoue la solution d'un tirage et vérifie qu'elle mène bien au compte. */
function rejouer(p) {
    let reserve = p.plaques.slice();
    for (const e of p.solution) {
        const i = reserve.indexOf(e.a);
        assert.ok(i >= 0, `${e.a} n'est pas disponible`);
        reserve.splice(i, 1);
        const j = reserve.indexOf(e.b);
        assert.ok(j >= 0, `${e.b} n'est pas disponible`);
        reserve.splice(j, 1);
        assert.equal(calculer(e.a, e.op, e.b), e.resultat,
            `${e.a} ${e.op} ${e.b} ne fait pas ${e.resultat}`);
        reserve.push(e.resultat);
    }
    assert.equal(p.solution[p.solution.length - 1].resultat, p.but);
}

test('« utiliser tous les nombres » consomme les six plaques', () => {
    for (let i = 0; i < 40; i++) {
        const p = tirerPartie({ rng: makeRng('tous' + i), tous: true });
        // Six nombres consommés deux par deux : cinq opérations, pas moins.
        assert.equal(p.operations, 5, 'il faut cinq étapes pour n\'en laisser qu\'un');
        rejouer(p);
        let reserve = p.plaques.slice();
        p.solution.forEach(e => {
            reserve.splice(reserve.indexOf(e.a), 1);
            reserve.splice(reserve.indexOf(e.b), 1);
            reserve.push(e.resultat);
        });
        assert.deepEqual(reserve, [p.but], 'il reste autre chose que le compte');
    }
});

// --- La partie ------------------------------------------------------------------------

test('une étape juste consomme deux nombres et en rend un', () => {
    const p = tirerPartie({ rng: makeRng('jeu'), operations: 3 });
    const e = commencer(p);
    const [a, b] = e.nombres;
    const attendu = calculer(a.valeur, '+', b.valeur);
    const r = poserEtape(e, a.id, '+', b.id, attendu);
    assert.equal(r.ok, true);
    assert.equal(e.nombres.length, 5);
    assert.ok(!e.nombres.find(n => n.id === a.id));
    assert.ok(e.nombres.find(n => n.valeur === attendu && !n.origine));
    assert.equal(e.etapes.length, 1);
});

test('C\'EST L\'ÉLÈVE QUI CALCULE : un mauvais résultat est refusé', () => {
    const p = tirerPartie({ rng: makeRng('calc'), operations: 3 });
    const e = commencer(p);
    const [a, b] = e.nombres;
    const juste = calculer(a.valeur, '+', b.valeur);
    const r = poserEtape(e, a.id, '+', b.id, juste + 1);
    assert.equal(r.ok, false);
    assert.equal(r.raison, 'calcul-faux');
    // On ne souffle pas la réponse : c'est le calcul qui est l'exercice.
    assert.equal(r.attendu, undefined);
    // Et rien n'a bougé sur la table.
    assert.equal(e.nombres.length, 6);
    assert.equal(e.etapes.length, 0);
});

test('les deux interdits sont refusés avec leur raison', () => {
    const e = commencer({ but: 500, plaques: [3, 8, 100, 7, 25, 5], solution: [] });
    const trois = e.nombres[0], huit = e.nombres[1], cent = e.nombres[2], sept = e.nombres[3];
    assert.equal(poserEtape(e, trois.id, '-', huit.id, -5).raison, 'negatif');
    assert.equal(poserEtape(e, cent.id, '÷', sept.id, 14).raison, 'division-inexacte');
    // Et l'on ne peut pas prendre deux fois la même plaque.
    assert.equal(poserEtape(e, trois.id, '+', trois.id, 6).raison, 'meme-plaque');
    assert.equal(e.etapes.length, 0);
});

test('on peut revenir en arrière, et la table redevient ce qu\'elle était', () => {
    const p = tirerPartie({ rng: makeRng('undo'), operations: 3 });
    const e = commencer(p);
    const avant = e.nombres.map(n => n.valeur).sort((x, y) => x - y);
    const [a, b] = e.nombres;
    poserEtape(e, a.id, '+', b.id, calculer(a.valeur, '+', b.valeur));
    assert.equal(annulerEtape(e), true);
    assert.deepEqual(e.nombres.map(n => n.valeur).sort((x, y) => x - y), avant);
    assert.equal(e.etapes.length, 0);
    assert.equal(annulerEtape(e), false, 'rien à annuler');
});

test('gagner sans l\'obligation, et avec', () => {
    // Sans l'obligation : atteindre le compte suffit, les plaques restantes
    // n'ont pas à être consommées.
    const libre = commencer({ but: 12, plaques: [5, 7, 100, 3, 25, 8], solution: [], tous: false });
    const n = libre.nombres;
    poserEtape(libre, n[0].id, '+', n[1].id, 12);
    assert.equal(libre.trouve, true);
    assert.equal(gagnee(libre), true);

    // Avec l'obligation : il doit ne rester QUE le compte sur la table.
    const strict = commencer({ but: 12, plaques: [5, 7, 100, 3, 25, 8], solution: [], tous: true });
    const m = strict.nombres;
    poserEtape(strict, m[0].id, '+', m[1].id, 12);
    assert.equal(strict.trouve, true);
    assert.equal(gagnee(strict), false, 'il reste quatre plaques sur la table');
});

test('l\'écart au but se lit sur la table', () => {
    const e = commencer({ but: 100, plaques: [5, 7, 96, 3, 25, 8], solution: [] });
    assert.equal(meilleurEcart(e), 4);
});

// --- La recherche ----------------------------------------------------------------------

test('la recherche retrouve un compte que l\'on sait atteignable', () => {
    for (let i = 0; i < 25; i++) {
        const p = tirerPartie({ rng: makeRng('res' + i), operations: 3 });
        const t = resoudre(p.plaques, p.but);
        assert.ok(t, 'aucune solution rendue');
        assert.equal(t.ecart, 0, `${p.but} avec ${p.plaques} : écart ${t.ecart}`);
        // Le chemin rendu se rejoue et tombe bien sur le compte.
        rejouer({ plaques: p.plaques, solution: t.chemin, but: t.valeur });
        assert.equal(t.valeur, p.but);
    }
});

test('quand le compte est hors d\'atteinte, on rend le plus proche', () => {
    // 1 et 2 ne peuvent pas faire 999, mais 3 est ce qu'on approche de mieux.
    const t = resoudre([1, 2], 999);
    assert.ok(t.ecart > 0);
    assert.ok(t.valeur <= 3, `on ne va pas plus loin que 3, reçu ${t.valeur}`);
});

test('l\'indice suit la table telle qu\'elle est, pas le chemin d\'origine', () => {
    const p = tirerPartie({ rng: makeRng('conseil'), operations: 3 });
    const e = commencer(p);
    // L'élève dévie : il consomme deux plaques autrement.
    const [a, b] = e.nombres;
    const r = calculer(a.valeur, '+', b.valeur);
    poserEtape(e, a.id, '+', b.id, r);
    const c = conseil(e);
    if (c) {
        // Le coup conseillé ne porte que sur des nombres réellement en main.
        const dispo = e.nombres.map(n => n.valeur);
        const reste = dispo.slice();
        assert.ok(reste.includes(c.a), `${c.a} n'est pas sur la table (${dispo})`);
        reste.splice(reste.indexOf(c.a), 1);
        assert.ok(reste.includes(c.b), `${c.b} n'est pas sur la table (${dispo})`);
        assert.equal(calculer(c.a, c.op, c.b), c.resultat);
    }
});

test('la même graine redonne exactement le même tirage', () => {
    const a = tirerPartie({ rng: makeRng('graine'), operations: 4 });
    const b = tirerPartie({ rng: makeRng('graine'), operations: 4 });
    assert.deepEqual(a.plaques, b.plaques);
    assert.equal(a.but, b.but);
    assert.deepEqual(a.solution, b.solution);
});

test('toutes les opérations finissent par servir dans les tirages', () => {
    const vues = new Set();
    for (let i = 0; i < 120; i++) {
        tirerPartie({ rng: makeRng('ops' + i), operations: 4 })
            .solution.forEach(e => vues.add(e.op));
    }
    assert.deepEqual([...vues].sort(), OPERATIONS.slice().sort());
});
