// LE ROBOT PARLE COURT, ET SES DURÉES EXISTENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « vérifier le bon fonctionnement du robot pour tous les exercices et
// pour avoir le bon rythme et des bonnes explications courtes, et concises ».
// Puis, devant la liste : « il faut tout corriger ».
//
// LA RÈGLE AVAIT DIX MOIS ET N'ÉTAIT NULLE PART. `COURT = 110` est écrit dans
// `js/core/activities/choice.js` — « une bulle se lit à 340 ms le mot : une
// explication de trois lignes fige la démonstration au point qu'on la croit
// plantée ». Mesuré au moment d'écrire cette épreuve : elle était recopiée à la
// main dans TROIS fichiers sur cent six, et il y avait 91 bulles écrites en
// toutes lettres au-dessus de la limite, dont une de 243 caractères.
//
// UNE RÈGLE QU'ON DOIT SE RAPPELER N'EST PAS UNE RÈGLE, C'EST UN VŒU. C'est la
// leçon du piège de l'accent grave, payée quatorze fois : quand une consigne
// revient, on ne la réécrit pas, on ferme le chemin. Celle-ci se ferme ici.
//
// CE QU'ON NE FAIT PAS, ET POURQUOI. On pourrait tronquer la phrase dans
// `say()`. Amputer en silence ce qu'un professeur a écrit est exactement le
// genre de correction qu'on ne voit jamais. On la NOMME — fichier, ligne,
// longueur — et quelqu'un la réécrit. Pour les phrases qui ne sont connues
// qu'à l'exécution (la leçon d'un générateur passée telle quelle), c'est
// `enUneBulle` de `core/demoPointer.js` qui garde la première respiration.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    COURT, CLES_VITESSE, fichiersDuRobot, bullesTropLongues, vitessesFausses, sansCommentaires
} from '../tools/robotCourt.mjs';

test('AUCUNE BULLE ÉCRITE EN TOUTES LETTRES NE DÉPASSE LA LIMITE', () => {
    const fautes = [];
    for (const { chemin, src } of fichiersDuRobot()) {
        for (const b of bullesTropLongues(src)) {
            const ligne = src.slice(0, b.pos).split('\n').length;
            fautes.push(`${chemin}:${ligne} — ${b.n} car. — « ${b.texte.slice(0, 50)}… »`);
        }
    }
    assert.deepEqual(fautes, [],
        `${fautes.length} bulle(s) de plus de ${COURT} caractères :\n  ` + fautes.join('\n  '));
});

test('ET LES DURÉES QU\'ON DEMANDE EXISTENT VRAIMENT', () => {
    // `DEMO_SPEED.step` était écrit dans cinq jeux et ne vaut rien ;
    // « DEMO_SPEED * 2 » vaut NaN, ce qui faisait jouer toute une
    // démonstration en quelques millisecondes — « le robot ne fonctionne
    // pas », disait Rémy. Les deux pièges sont de la même famille, et le
    // second est documenté en tête de `demoPointer.js` depuis qu'il a coûté
    // une soirée.
    const fautes = [];
    for (const { chemin, src } of fichiersDuRobot()) {
        for (const v of vitessesFausses(src)) {
            const ligne = src.slice(0, v.pos).split('\n').length;
            fautes.push(`${chemin}:${ligne} — ${v.quoi} — ${v.pourquoi}`);
        }
    }
    assert.deepEqual(fautes, [], fautes.join('\n  '));
});

test('L\'OUTIL NE COMPTE PAS LES COMMENTAIRES QUI RACONTENT LE PIÈGE', () => {
    // IL L'A FAIT AU PREMIER ESSAI, et c'est la deuxième fois de la journée
    // qu'un harnais trébuche sur la phrase expliquant ce qu'il garde : il
    // accusait le commentaire de `demoPointer.js` qui raconte précisément
    // « gate.wait(2500 * DEMO_SPEED) ». Un outil qui accuse son propre mode
    // d'emploi apprend à ignorer ses alertes.
    const faux = `// On écrivait gate.wait(2500 * DEMO_SPEED), et DEMO_SPEED.step\n`
        + `/* ni cur.say('une phrase de commentaire très longue qui dépasserait largement la limite des cent dix caractères autorisés') */\n`
        + `cur.say('Je pousse à droite.');`;
    assert.deepEqual(vitessesFausses(faux), [], 'un commentaire n\'est pas un appel');
    assert.deepEqual(bullesTropLongues(faux), [], 'une bulle en commentaire non plus');

    // ET IL VOIT ENCORE CE QUI EST VRAI : une épreuve qui ne garde plus rien
    // est pire que pas d'épreuve.
    const vrai = `cur.pause(DEMO_SPEED.step);\n`
        + `cur.say('${'a'.repeat(140)}');`;
    assert.equal(vitessesFausses(vrai).length, 1, 'la vraie clé fautive se voit toujours');
    assert.equal(bullesTropLongues(vrai).length, 1, 'la vraie bulle trop longue aussi');
    // Les chaînes gardent leur contenu : un « // » dans un texte n'ampute rien.
    assert.match(sansCommentaires(`const u = 'http://exemple.fr'; const v = 2;`), /const v = 2;/);
});

test('LES CLÉS DE DEMO_SPEED SONT CELLES QUE LE MODULE DÉCLARE', () => {
    // L'outil tient la liste à la main : si `demoPointer.js` en ajoute une, il
    // la refuserait à tort, et l'on passerait une heure à chercher pourquoi.
    const src = readFileSync(new URL('../js/core/demoPointer.js', import.meta.url), 'utf8');
    const bloc = src.slice(src.indexOf('DEMO_SPEED = {'));
    const declarees = [...bloc.slice(0, bloc.indexOf('}')).matchAll(/(\w+)\s*:/g)].map(m => m[1]);
    assert.deepEqual([...declarees].sort(), [...CLES_VITESSE].sort(),
        'la liste de tools/robotCourt.mjs a divergé de DEMO_SPEED');
});
