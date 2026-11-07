// UNE QUESTION FINIE DOIT TOURNER, JUSTE OU NON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 6 novembre, après l'avoir lancé en classe : « pour le attrape le
// détour, j'avais mis option lente, et au bout de la 3ème question, des élèves
// ont été bloqué, ca ne réagisssait plus ».
//
// ── LE CONTRAT DU NOYAU, ET CE QU'IL EXIGE DES ACTIVITÉS ──────────────────
//
// `itemSession.submit()` n'accorde que `maxAttemptsPerItem` tentatives — deux,
// dans tous les modes ordinaires. À la dernière erreur il MONTRE la réponse et
// ferme la question : `revealed: true`, `done: true`. Tout appel suivant rend
// `{ ignored: true }`.
//
// C'EST DONC À L'ACTIVITÉ D'ENCHAÎNER, et sur `done`, jamais sur `correct`
// seul. Dix-neuf activités sur vingt le font déjà — la plupart appellent
// `renderNext()` sans condition dans `dismissed.then`. « Attrape le Détour »
// était la seule à poser sa condition, et elle s'était trompée de mot :
//
//     if (result.correct) regTimeout(nextItem, 350);
//     else { … // Question toujours en cours : le métronome repart tout seul. }
//
// L'élève qui se trompait deux fois restait sur le même calcul POUR TOUJOURS.
// Les disques continuaient de sortir, il continuait de taper dessus, et plus
// rien ne répondait — pas d'erreur, pas de message, pas de bouton. MESURÉ par
// `tools/attrapeQuiRepond.mjs` : six « questions » de suite sur le même
// « 390 + 99 = ? ».
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET CE QU'ELLE NE PEUT PAS GARDER ──────────
//
// Elle garde la RÈGLE, dans la source : qu'aucune activité n'enchaîne sur le
// seul `correct`. Le comportement à l'écran, lui, est gardé par la sonde — une
// condition juste branchée nulle part ne débloquerait personne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync, readdirSync } from 'node:fs';

const DOSSIER = 'js/core/activities';

test('AUCUNE ACTIVITÉ N\'ENCHAÎNE SUR LE SEUL « correct »', () => {
    const fautives = [];
    for (const nom of readdirSync(DOSSIER).filter(f => f.endsWith('.js'))) {
        const source = readFileSync(`${DOSSIER}/${nom}`, 'utf8');
        if (!/\.submit\(/.test(source)) continue;
        // Le corps de chaque `dismissed.then(...)`, qui est l'endroit où une
        // activité décide de passer à la suite.
        const blocs = source.match(/dismissed\s*\.?\s*then\(\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s{0,12}\}\)/g) || [];
        for (const bloc of blocs) {
            // Enchaîne-t-elle ? On cherche l'appel qui pose la question
            // suivante, quel que soit son nom dans ce fichier-ci.
            const enchaine = /(renderNext|nextItem|poser|suivante|renderQuestion)\s*[,(]/.test(bloc);
            if (!enchaine) continue;
            // Et le fait-elle sous une condition qui ne regarde QUE `correct` ?
            // `done` et `revealed` sont les deux mots qui ferment une question.
            const surCorrect = /\.correct\b/.test(bloc);
            const surFin = /\.(done|revealed)\b/.test(bloc);
            if (surCorrect && !surFin) fautives.push(nom);
        }
    }
    assert.deepEqual(fautives, [],
        'ces activités n\'enchaînent que sur une bonne réponse : l\'élève qui '
        + 'épuise ses tentatives y reste bloqué sur la même question — '
        + fautives.join(', '));
});

test('« Attrape le Détour » enchaîne sur `done`, le mot du noyau', () => {
    const source = readFileSync(`${DOSSIER}/moles.js`, 'utf8');
    const bloc = /result\.dismissed\.then\(\(\) => \{[\s\S]*?\n {12}\}\);/.exec(source);
    assert.ok(bloc, 'le bloc de fin de question a changé de forme');
    assert.match(bloc[0], /if \(result\.done\)/,
        'l\'activité ne lit pas `done` : une question dont les tentatives sont '
        + 'épuisées ne tournera jamais');
    // ET L'ANCIENNE PHRASE N'EST PLUS LÀ. Elle disait « Question toujours en
    // cours », ce qui était faux une fois sur deux.
    assert.ok(!/if \(result\.correct\) regTimeout\(nextItem/.test(source),
        'l\'activité enchaîne encore sur la seule bonne réponse');
});
