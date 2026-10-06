// LES GARDES DE DÉMONSTRATION SONT BRANCHÉES, ET DANS LEUR PORTÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CETTE ÉPREUVE EXISTE PARCE QU'ON A PAYÉ TRENTE-CINQ MINUTES CE QU'ELLE DIT EN
// DEUX CENTS MILLISECONDES.
//
// En migrant les 674 gardes de démonstration vers `core/meneurDemo.js`, cinq
// fichiers se sont cassés. La cause est bête et se voit à la lecture : un
// fichier peut avoir DEUX fonctions de démonstration, et la migration n'a
// déclaré le meneur que dans la première tout en réécrivant les gardes des deux.
// Les secondes lisaient un `robot` hors de leur portée.
//
// CE QUI NE L'A PAS VU :
//
//   · `node --check` — `robot.tour()` est une expression parfaitement valide,
//     même quand `robot` n'existe nulle part. L'erreur est à l'EXÉCUTION.
//   · `npm test` — 4 641 épreuves, et aucune n'ouvre une démonstration.
//   · la relecture — cinq fichiers sur cent deux, et le défaut est une ligne
//     qui ressemble trait pour trait à ses cent voisines justes.
//
// CE QUI L'A VU : `tools/robotsMuets.mjs`, qui ouvre les 222 robots dans un
// vrai navigateur. Dix-neuf erreurs de page contre zéro avant. Trente-cinq
// minutes.
//
// UNE MESURE QUI COÛTE TRENTE-CINQ MINUTES NE SE FAIT PAS À CHAQUE COMMIT, et
// c'est bien le problème : le défaut serait parti chez les élèves. Celle-ci se
// fait à chaque `npm test`.
//
// ELLE NE REMPLACE PAS LE NAVIGATEUR. Elle dit qu'une garde est bien branchée ;
// elle ne dit pas qu'une démonstration explique quelque chose. C'est une
// condition nécessaire, et elle est maintenant gardée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { mesurerGardesDemo } from '../tools/gardesDemo.mjs';

const mesure = mesurerGardesDemo();

test('AUCUNE GARDE NE LIT UN MENEUR HORS DE SA PORTÉE', () => {
    // LE DÉFAUT EXACT QU'ON A INTRODUIT, ET QUI A COÛTÉ UNE MESURE DE
    // TRENTE-CINQ MINUTES. Une `ReferenceError` au premier pas : la
    // démonstration meurt sans un mot, et l'élève voit un décor immobile.
    const liste = mesure.horsPortee
        .map(h => `${h.fichier}:${h.ligne}  ${h.texte.slice(0, 70)}`);
    assert.deepEqual(liste, [],
        'ces gardes appellent un `robot` qui n\'existe pas dans leur fonction — '
        + 'node --check passe, et la démonstration meurt à l\'exécution');
});

test('PLUS AUCUNE GARDE NE REFAIT L\'ÉCHAFAUDAGE À LA MAIN', () => {
    // Elles marchaient, et c'est pour cela qu'elles ont divergé : 522 vérifiaient
    // `!this.isRunning`, 99 `destroyed`, 9 `!vivant()` — et 56 ne vérifiaient
    // RIEN, ce qui laissait un exercice quitté continuer à parler dans le vide.
    // On ne garde pas une règle de style : on garde le fait qu'un seul endroit
    // décide si une démonstration doit continuer.
    const liste = mesure.anciennes
        .map(a => `${a.fichier}:${a.ligne}  ${a.texte.slice(0, 70)}`);
    assert.deepEqual(liste, [],
        'ces gardes appellent le pointeur ou la barre directement : elles refont '
        + 'à la main la vie du jeu et le rangement, que `core/meneurDemo.js` porte');
});

test('LES GARDES SONT TOUJOURS LÀ — l\'épreuve ne se contente pas du vide', () => {
    // LE PIÈGE D'UNE ÉPREUVE QUI COMPTE DES DÉFAUTS : elle passe aussi quand
    // elle ne trouve plus rien à compter. Le jour où un `robot.` deviendrait
    // `meneur.`, les deux épreuves ci-dessus resteraient vertes en ne regardant
    // plus rien du tout — et c'est la pire façon de passer.
    const total = [...mesure.pas.values()].reduce((a, b) => a + b, 0);
    assert.ok(total > 700,
        `seulement ${total} gardes trouvées : l'épreuve ne regarde plus le bon motif`);
    assert.ok(mesure.fichiers > 80,
        `seulement ${mesure.fichiers} fichiers parcourus`);
    // Les pas du meneur sont tous employés quelque part : un pas que personne
    // n'appelle est du code mort qu'on garde par superstition.
    for (const pas of ['tour', 'pause', 'attendre', 'toucher']) {
        assert.ok(mesure.pas.get(pas) > 0, `aucune démonstration n'appelle robot.${pas}()`);
    }
});
