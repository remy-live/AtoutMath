import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CONSEILS, SEUIL_LOUPE, SEUIL_REUSSI, memeJour, conseilDuJour,
    direErreur, resumeErreurs, messageDArrivee, bilanExercice
} from '../js/core/accueil.js';

const JOUR = 86400000;
const T = Date.UTC(2026, 2, 12, 10, 0);          // un jeudi, 10 h
const erreur = (o = {}) => ({ questionText: '7 × 8', exoTitle: 'Flash Mult', corrected: false, ...o });
const tentative = (correct, ts = T - JOUR) => ({ correct, ts });

test('« le même jour » compte les jours civils, pas les 24 heures', () => {
    assert.equal(memeJour(T, T + 3600000), true, 'trois heures plus tard, c\'est le même jour');
    assert.equal(memeJour(T, T + JOUR), false);
    assert.equal(memeJour(T, null), false);
    assert.equal(memeJour(null, null), false);
});

test('le conseil du jour ne change pas dans la journée, et change le lendemain', () => {
    assert.equal(conseilDuJour(T), conseilDuJour(T + 7 * 3600000));
    assert.notEqual(conseilDuJour(T), conseilDuJour(T + JOUR));
    assert.ok(CONSEILS.includes(conseilDuJour(T)));
    // Ils portent sur la MANIÈRE de travailler : un conseil de contenu tombé
    // au hasard n'aurait aucune chance de tomber juste.
    CONSEILS.forEach(c => assert.ok(c.length > 40, `conseil trop court : ${c}`));
});

test('une erreur se dit avec des mots, jamais avec un identifiant', () => {
    assert.equal(direErreur(erreur()), '7 × 8');
    assert.equal(direErreur({ exoTitle: 'Angle Master' }), 'Angle Master');
    const long = direErreur({ questionText: 'x'.repeat(80) });
    assert.ok(long.length <= 40, 'un énoncé long doit être coupé');
    assert.ok(long.endsWith('…'));
});

test('le résumé des erreurs ne répète pas deux fois la même', () => {
    const liste = [erreur(), erreur(), erreur({ questionText: '9 × 6' }), erreur({ questionText: '8 × 4' }), erreur({ questionText: '3 × 3' })];
    const r = resumeErreurs(liste);
    assert.deepEqual(r, ['7 × 8', '9 × 6', '8 × 4']);
    assert.equal(resumeErreurs(liste, 2).length, 2);
});

test('rien ne s\'affiche deux fois dans la même journée', () => {
    const faits = { maintenant: T, derniereVisite: T - 3600000, erreurs: [erreur(), erreur({ questionText: '9 × 6' })] };
    assert.equal(messageDArrivee(faits), null, 'revenu une heure plus tard : on se tait');
});

test('la toute première visite accueille sans parler d\'erreurs', () => {
    const m = messageDArrivee({ maintenant: T, derniereVisite: null, erreurs: [] });
    assert.equal(m.type, 'bienvenue');
    assert.deepEqual(m.erreurs, []);
    assert.equal(m.revision, null);
    assert.ok(m.conseil);
});

test('deux erreurs ouvertes ou plus déclenchent une proposition de révision, nommée', () => {
    const m = messageDArrivee({
        maintenant: T, derniereVisite: T - JOUR,
        erreurs: [erreur(), erreur({ questionText: 'le rapporteur mal placé' })]
    });
    assert.equal(m.type, 'revision');
    assert.match(m.texte, /« 7 × 8 »/);
    assert.match(m.texte, /« le rapporteur mal placé »/);
    assert.equal(m.revision.questions, 2);
});

test('la révision proposée ne dépasse JAMAIS dix questions', () => {
    const beaucoup = Array.from({ length: 40 }, (_, i) => erreur({ questionText: `q${i}` }));
    const m = messageDArrivee({ maintenant: T, derniereVisite: T - JOUR, erreurs: beaucoup });
    assert.equal(m.revision.questions, 10, 'au-delà, ce n\'est plus une révision');
    assert.equal(m.erreurs.length, 3, 'on en nomme trois, pas quarante');
});

test('les erreurs déjà corrigées ne comptent plus', () => {
    const m = messageDArrivee({
        maintenant: T, derniereVisite: T - JOUR,
        erreurs: [erreur({ corrected: true }), erreur({ questionText: '9 × 6', corrected: true })]
    });
    assert.notEqual(m.type, 'revision');
});

test('une bonne séance est saluée le lendemain', () => {
    const m = messageDArrivee({
        maintenant: T, derniereVisite: T - JOUR, erreurs: [],
        tentatives: [...Array(9).fill(0).map(() => tentative(true)), tentative(false)]
    });
    assert.equal(m.type, 'felicitations');
    assert.match(m.texte, /9 bonnes réponses sur 10/);
});

test('une séance courte ne déclenche pas de félicitations — quatre réponses ne prouvent rien', () => {
    const m = messageDArrivee({
        maintenant: T, derniereVisite: T - JOUR, erreurs: [],
        tentatives: Array(4).fill(0).map(() => tentative(true))
    });
    assert.notEqual(m.type, 'felicitations');
});

test('sans erreur ni exploit, on dit bonjour et on donne le conseil du jour', () => {
    const m = messageDArrivee({ maintenant: T, derniereVisite: T - JOUR, erreurs: [], tentatives: [] });
    assert.equal(m.type, 'conseil');
    assert.equal(m.revision, null);
    assert.equal(m.conseil, conseilDuJour(T));
});

test('une seule erreur ouverte se propose quand même, mais sans en faire un plat', () => {
    const m = messageDArrivee({ maintenant: T, derniereVisite: T - JOUR, erreurs: [erreur()] });
    assert.equal(m.type, 'conseil');
    assert.match(m.texte, /une question à revoir/);
    assert.equal(m.revision.questions, 1);
});

test('un exercice trop court n\'est jamais jugé', () => {
    const b = bilanExercice({ repondues: 3, justes: 0, titre: 'Flash Mult' });
    assert.equal(b.verdict, 'court');
    assert.equal(b.relancer, false);
    assert.equal(b.texte, '', 'deux erreurs sur trois questions ne sont pas un échec');
});

test('un exercice vraiment loupé fait réexpliquer et relancer', () => {
    const b = bilanExercice({ repondues: 10, justes: 2, titre: 'Sommes de Relatifs', lecon: 'Même signe : on ajoute.' });
    assert.equal(b.verdict, 'loupe');
    assert.equal(b.relancer, true);
    assert.equal(b.lecon, 'Même signe : on ajoute.');
    assert.match(b.texte, /2 bonnes réponses sur 10/);
    // Le ton compte autant que le seuil : on ne dit pas à l'élève qu'il est mauvais.
    assert.match(b.texte, /ce n'est pas toi/);
    assert.ok(b.taux < SEUIL_LOUPE);
});

test('un exercice réussi est salué, un exercice moyen encouragé', () => {
    const r = bilanExercice({ repondues: 10, justes: 9, titre: 'Flash Mult' });
    assert.equal(r.verdict, 'reussi');
    assert.equal(r.relancer, false);
    assert.ok(r.taux >= SEUIL_REUSSI);

    const m = bilanExercice({ repondues: 10, justes: 6 });
    assert.equal(m.verdict, 'moyen');
    assert.equal(m.relancer, false);
});

test('les seuils se tiennent : loupé < moyen < réussi, sans trou ni recouvrement', () => {
    assert.ok(SEUIL_LOUPE < SEUIL_REUSSI);
    const verdicts = [];
    for (let justes = 0; justes <= 20; justes++) {
        verdicts.push(bilanExercice({ repondues: 20, justes }).verdict);
    }
    // Une fois sorti de « loupé », on n'y retombe jamais en réussissant mieux.
    const rang = { loupe: 0, moyen: 1, reussi: 2 };
    for (let i = 1; i < verdicts.length; i++) {
        assert.ok(rang[verdicts[i]] >= rang[verdicts[i - 1]],
            `${i}/20 est jugé plus sévèrement que ${i - 1}/20`);
    }
});

test('le seuil d\'échec est réglable, pour que le professeur puisse le durcir', () => {
    const doux = bilanExercice({ repondues: 10, justes: 5, seuil: 0.4 });
    const dur = bilanExercice({ repondues: 10, justes: 5, seuil: 0.7 });
    assert.notEqual(doux.verdict, 'loupe');
    assert.equal(dur.verdict, 'loupe');
});
