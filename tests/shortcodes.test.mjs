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
import { CODES_EXERCICES } from '../js/data/codesExercices.js';
import { questionsConseillees } from '../js/core/duree.js';
import { seuilConseille } from '../js/core/seuilEtape.js';
import { getGenerator } from '../js/core/registry.js';

/** Ce que vaut « cet exercice, tel quel » — plus jamais dix pour tout le monde. */
function telQuel(id) {
    const exo = getExerciseById(id);
    return questionsConseillees(getGenerator(exo.generatorId), exo.params || {},
        { activite: exo.activityId });
}

test('un exercice pris tel quel tient en TROIS lettres', () => {
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
    assert.equal(code.length, 3, `code trop long : ${code}`);
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
    // n'a que des lettres et le nombre que des chiffres —, donc il ne doit
    // rien décider.
    const attendu = { exercice: 'num-relatifs-addition', questions: 12 };
    const code = Shortcodes.encodePath(makePath('R',
        [makeStep(attendu.exercice, {}, { nbItems: attendu.questions })], defaultPolicy()));
    const tete = code.slice(0, 3);
    for (const ecrit of [`${tete}-12`, `${tete} 12`, `${tete}12`, `${tete} — 12`,
        `${tete}.12`, tete.toLowerCase() + '-12', `  ${tete}-12  `]) {
        const relu = Shortcodes.decodePath(ecrit);
        assert.ok(relu && relu.steps[0], `« ${ecrit} » devrait se lire`);
        assert.equal(relu.steps[0].exerciseId, attendu.exercice, `« ${ecrit} » : mauvais exercice`);
        assert.equal(relu.steps[0].nbItems, attendu.questions, `« ${ecrit} » : mauvais compte`);
    }
    // Ce qui n'est pas un nombre après le code n'en est pas un code.
    assert.equal(Shortcodes.exerciceDuCodeCourt(`${tete}AB`), null,
        'le code suivi de lettres ne désigne aucun exercice');
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
    assert.ok(code.length <= 6, `code trop long : ${code} (${code.length})`);
    assert.match(code, /^[A-Z]{3}-12$/, `le nombre doit se lire en clair : ${code}`);

    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    assert.equal(relu.steps[0].nbItems, 12);
    assert.equal(relu.steps[0].threshold, seuilConseille(12));

    // Il se dicte : on le retape en minuscules, avec ou sans le tiret d'usage.
    assert.equal(Shortcodes.decodePath(code.toLowerCase()).steps[0].nbItems, 12);

    // Et le compte d'usine ne s'écrit pas : le code reste à trois lettres.
    const telQuelStep = makeStep('num-relatifs-addition', {}, { nbItems: telQuel('num-relatifs-addition') });
    assert.equal(Shortcodes.encodePath(makePath('R', [telQuelStep], defaultPolicy())).length, 3);
});

test('UN JEU DE GRILLE NE SE COMPTE PAS COMME UNE QUESTION', () => {
    // C'est la remarque de Rémy — « 10 paires c'est très court » — vue depuis
    // l'autre bout : dix grilles de sudoku, c'est une heure et demie.
    assert.equal(telQuel('calc-sudoku'), 3);
    assert.ok(telQuel('num-amis-de-dix') >= 20, 'les paires se comptent par dizaines');
    assert.equal(telQuel('logi-echecs'), 1);
});

test('AUCUN exercice du catalogue ne partage son code avec un autre', () => {
    // Deux exercices sur le même code enverraient un élève faire autre chose
    // que ce que le professeur a demandé. La table est écrite à la main : ce
    // test est ce qui la tient honnête.
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
    // L'alphabet lui-même écarte ce qui se lit mal : ni I, ni O, ni Q, et
    // aucun chiffre — donc aucune confusion possible avec le nombre de
    // questions écrit à la suite.
    assert.ok(!/[IOQ0-9]/.test(attendu), `caractère ambigu dans ${attendu}`);
    assert.equal(normaliserCourt('k7-qp'), 'K7QP');
});

test('un parcours RÉGLÉ garde le format complet', () => {
    // Deux étapes, un nombre de questions choisi, une surcharge : tout cela
    // doit voyager, et ne tient évidemment pas en trois lettres.
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

// --- La lettre de contrôle ---------------------------------------------------

test('CHAQUE EXERCICE DU CATALOGUE A SON IDENTITÉ, ET ELLE EST UNIQUE', () => {
    // La table est écrite à la main : ajouter un exercice sans lui donner ses
    // deux lettres le priverait du code court, en silence. Ce test est le
    // rappel — il échoue tant que la ligne manque.
    const orphelins = exercices.filter(e => !CODES_EXERCICES[e.id]).map(e => e.id);
    assert.deepEqual(orphelins, [], 'ces exercices n\'ont pas d\'identité dans js/data/codesExercices.js');

    // Et rien dans la table ne doit désigner un exercice disparu : un code
    // noté dans un carnet renverrait alors vers le vide.
    const fantomes = Object.keys(CODES_EXERCICES).filter(id => !getExerciseById(id));
    assert.deepEqual(fantomes, [], 'ces identités ne désignent plus aucun exercice');

    const identites = Object.values(CODES_EXERCICES);
    assert.equal(new Set(identites).size, identites.length, 'deux exercices partagent une identité');
    identites.forEach(c => assert.match(c, /^[A-HJ-NPR-Z]{2}$/, `identité hors alphabet : ${c}`));
});

test('UNE LETTRE MAL RECOPIÉE NE DONNE JAMAIS UN AUTRE EXERCICE', () => {
    // C'est toute la raison d'être de la troisième lettre. Sans elle, deux
    // caractères d'identité suffisaient à désigner les 139 exercices, mais une
    // lettre fausse retombait une fois sur six sur un exercice EXISTANT :
    // l'élève ouvrait autre chose, sans un mot, et travaillait sagement la
    // mauvaise leçon. On ne teste donc pas un échantillon, on les essaie
    // TOUTES : chaque exercice, chaque place, chaque lettre de l'alphabet.
    const ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    let essais = 0;
    for (const e of exercices) {
        const bon = codeCourt(e.id);
        for (let i = 0; i < bon.length; i++) {
            for (const lettre of ALPHABET) {
                if (lettre === bon[i]) continue;
                const faux = bon.slice(0, i) + lettre + bon.slice(i + 1);
                essais++;
                assert.equal(Shortcodes.exerciceDuCodeCourt(faux), null,
                    `« ${faux} » (${bon} avec un ${lettre} en ${i + 1}ᵉ) ouvre un exercice`);
            }
        }
    }
    assert.ok(essais > 9000, `il fallait tout essayer, on n'a fait que ${essais} essais`);
});

test('LES DEUX LETTRES INVERSÉES SONT REFUSÉES AUSSI', () => {
    // « TPW » dicté, « PTW » entendu : l'inversion est la deuxième faute la
    // plus fréquente après la substitution. Les poids 1 et 2 du contrôle la
    // rendent détectable — sauf si les deux lettres sont identiques, auquel
    // cas il n'y a rien d'inversé.
    for (const e of exercices) {
        const bon = codeCourt(e.id);
        if (bon[0] === bon[1]) continue;
        const inverse = bon[1] + bon[0] + bon[2];
        assert.equal(Shortcodes.exerciceDuCodeCourt(inverse), null,
            `« ${inverse} » (${bon} inversé) ouvre un exercice`);
    }
});

test('un code trop court ou trop long ne s\'invente pas un exercice', () => {
    const bon = codeCourt('num-relatifs-addition');
    ['', bon.slice(0, 2), bon + bon[0], '12', bon.slice(0, 2) + '3'].forEach(saisie => {
        assert.equal(Shortcodes.exerciceDuCodeCourt(saisie), null, `« ${saisie} » devrait être refusé`);
    });
    // Et le nombre de questions reste dans ses limites : zéro n'est pas un
    // devoir, cent-vingt non plus.
    assert.equal(Shortcodes.exerciceDuCodeCourt(`${bon}-0`), null);
    assert.equal(Shortcodes.exerciceDuCodeCourt(`${bon}-120`), null);
    assert.ok(Shortcodes.exerciceDuCodeCourt(`${bon}-99`), '99 questions restent lisibles');
});
