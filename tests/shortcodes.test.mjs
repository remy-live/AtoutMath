// Les codes de partage : ce qu'on écrit au tableau, et ce qui voyage par lien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { makeStep, makePath } from '../js/core/path.js';
import { defaultPolicy } from '../js/core/policy.js';

// --- Le code court ----------------------------------------------------------

import { codeCourt, normaliserCourt } from '../js/core/shortcodes.js';
import { exercices, getExerciseById } from '../js/data/catalog.js';
import { questionsConseillees } from '../js/core/duree.js';
import { seuilConseille } from '../js/core/seuilEtape.js';
import { getGenerator } from '../js/core/registry.js';

/** Ce que vaut « cet exercice, tel quel » — plus jamais dix pour tout le monde. */
function telQuel(id) {
    const exo = getExerciseById(id);
    return questionsConseillees(getGenerator(exo.generatorId), exo.params || {},
        { activite: exo.activityId });
}

test('un exercice pris tel quel tient en QUATRE caractères', () => {
    // « Fais l'exercice sur les relatifs ce soir » n'a pas besoin d'un
    // parcours. Le format complet coûtait 81 caractères de base64 : à recopier
    // sur un téléphone, c'est une faute de frappe garantie.
    //
    // « TEL QUEL » N'EST PLUS « DIX ». L'exercice avance par marches et en
    // demande vingt-quatre ; le code court doit dire la même chose à
    // l'écriture et à la relecture, sinon l'élève reçoit un exercice tronqué.
    const n = telQuel('num-relatifs-addition');
    assert.ok(n > 10, 'cet exercice a une progression : son défaut dépasse dix');
    const step = makeStep('num-relatifs-addition', {}, { nbItems: n, threshold: seuilConseille(n) });
    const code = Shortcodes.encodePath(makePath('Relatifs', [step], defaultPolicy()));
    assert.equal(code.length, 4, `code trop long : ${code}`);
    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps.length, 1);
    assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    assert.equal(relu.steps[0].nbItems, n);
    assert.equal(relu.steps[0].threshold, seuilConseille(n),
        'le seuil se recalcule : il n\'a pas à voyager dans le code');
});

test('UN CODE DICTÉ SE RECOPIE COMME ON L\'ENTEND', () => {
    // Un code écrit au tableau ne revient jamais tel qu'on l'a écrit : tiret
    // ou espace, majuscules ou non, tiret long parce que le traitement de
    // texte l'a changé. Le séparateur ne porte aucune information — le code
    // fait TOUJOURS quatre caractères —, donc il ne doit rien décider.
    const attendu = { exercice: 'num-relatifs-addition', questions: 12 };
    const code = Shortcodes.encodePath(makePath('R',
        [makeStep(attendu.exercice, {}, { nbItems: attendu.questions })], defaultPolicy()));
    const tete = code.slice(0, 4);
    for (const ecrit of [`${tete}-12`, `${tete} 12`, `${tete}12`, `${tete} — 12`,
        `${tete}.12`, tete.toLowerCase() + '-12', `  ${tete}-12  `]) {
        const relu = Shortcodes.decodePath(ecrit);
        assert.ok(relu && relu.steps[0], `« ${ecrit} » devrait se lire`);
        assert.equal(relu.steps[0].exerciseId, attendu.exercice, `« ${ecrit} » : mauvais exercice`);
        assert.equal(relu.steps[0].nbItems, attendu.questions, `« ${ecrit} » : mauvais compte`);
    }
    // Ce qui n'est pas un nombre après le code n'en est pas un code.
    assert.equal(Shortcodes.exerciceDuCodeCourt(`${tete}AB`), null,
        'quatre caractères suivis de lettres ne désignent aucun exercice');
    // Et l'ancien format continue de se lire : il y a des liens dans la nature.
    assert.ok(Shortcodes.decodePath('AA5'), 'un code d\'avant doit rester lisible');
});

test('UN EXERCICE AVEC SON NOMBRE DE QUESTIONS TIENT ENCORE DANS UN CODE DICTÉ', () => {
    // Rémy : « pour envoyer un code juste sur un exercice avec le nombre de
    // questions, comment fait-on ? L'idéal serait que le code soit hyper
    // court. » Changer le compte faisait basculer sur le format complet —
    // quatre-vingt-dix caractères de base64 pour la différence d'un nombre.
    const step = makeStep('num-relatifs-addition', {}, { nbItems: 12 });
    const code = Shortcodes.encodePath(makePath('Relatifs', [step], defaultPolicy()));
    assert.ok(code.length <= 7, `code trop long : ${code} (${code.length})`);
    assert.match(code, /^[A-Z0-9]{4}-12$/, `le nombre doit se lire en clair : ${code}`);

    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    assert.equal(relu.steps[0].nbItems, 12);
    assert.equal(relu.steps[0].threshold, seuilConseille(12));

    // Il se dicte : on le retape en minuscules, avec ou sans le tiret d'usage.
    assert.equal(Shortcodes.decodePath(code.toLowerCase()).steps[0].nbItems, 12);

    // Et le compte d'usine ne s'écrit pas : le code reste à quatre caractères.
    const telQuelStep = makeStep('num-relatifs-addition', {}, { nbItems: telQuel('num-relatifs-addition') });
    assert.equal(Shortcodes.encodePath(makePath('R', [telQuelStep], defaultPolicy())).length, 4);
});

test('UN JEU DE GRILLE NE SE COMPTE PAS COMME UNE QUESTION', () => {
    // C'est la remarque de Rémy — « 10 paires c'est très court » — vue depuis
    // l'autre bout : dix grilles de sudoku, c'est une heure et demie.
    assert.equal(telQuel('calc-sudoku'), 3);
    assert.ok(telQuel('num-amis-de-dix') >= 20, 'les paires se comptent par dizaines');
    assert.equal(telQuel('logi-echecs'), 1);
});

test('AUCUN exercice du catalogue ne partage son code avec un autre', () => {
    // Le code est calculé à partir de l'identifiant : rien à tenir à jour,
    // mais tout à vérifier. Deux exercices sur le même code enverraient un
    // élève faire autre chose que ce que le professeur a demandé.
    const vus = new Map();
    const collisions = [];
    exercices.forEach(e => {
        const c = codeCourt(e.id);
        if (vus.has(c)) collisions.push(`${c} : ${vus.get(c)} et ${e.id}`);
        vus.set(c, e.id);
    });
    assert.deepEqual(collisions, []);
    // Le seuil dit seulement « le catalogue s'est bien chargé » : sans lui, un
    // import cassé rendrait une liste vide, et le test passerait triomphalement
    // sans avoir rien comparé. Il n'a pas à suivre la taille du catalogue —
    // regrouper des exercices en réglages le fait légitimement diminuer.
    assert.ok(exercices.length > 50, 'le catalogue doit être chargé pour que ce test vaille');
});

test('le code se recopie à la main sans se tromper', () => {
    // On l'écrit au tableau et l'élève le tape : la casse, les tirets et les
    // confusions O/0, I/1, S/5 ne doivent pas le mettre en échec.
    const attendu = codeCourt('num-relatifs-addition');
    ['  ' + attendu + ' ', attendu.toLowerCase(), `REL-${attendu}`.slice(4)].forEach(saisie => {
        const relu = Shortcodes.decodePath(saisie);
        assert.ok(relu, `saisie refusée : « ${saisie} »`);
        assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    });
    // L'alphabet lui-même écarte les caractères ambigus.
    assert.ok(!/[OIS01]/.test(attendu), `caractère ambigu dans ${attendu}`);
    assert.equal(normaliserCourt('k7-qp'), 'K7QP');
});

test('un parcours RÉGLÉ garde le format complet', () => {
    // Deux étapes, un nombre de questions choisi, une surcharge : tout cela
    // doit voyager, et ne tient évidemment pas en quatre caractères.
    const p = makePath('Chapitre', [
        makeStep('num-relatifs-addition', {}, { nbItems: 15 }),
        makeStep('num-relatifs-thermometre', { niveau: 'dur' }, { nbItems: 10 })
    ], defaultPolicy());
    const code = Shortcodes.encodePath(p);
    assert.ok(code.startsWith('M2-'), code);
    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps.length, 2);
    assert.equal(relu.steps[0].nbItems, 15);
    assert.deepEqual(relu.steps[1].overrides, { niveau: 'dur' });
    // Et un exercice SEUL mais avec un réglage ne passe pas en court non plus.
    const regle = makePath('X', [makeStep('num-relatifs-addition', { niveau: 'dur' }, {})], defaultPolicy());
    assert.ok(Shortcodes.encodePath(regle).startsWith('M2-'));
});
