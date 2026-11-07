// UN JEU QUI DÉCLARE DEUX RÉUSSITES POUR UNE QUESTION FAUSSE LA NOTE.
//
// RÉMY, après une séance : « sur Poser une opération, les élèves ont fait
// 2 opérations (ou 3) et ont eu 5/5 ». Mesuré : chaque opération déclarait
// DEUX questions — l'alignement, puis le résultat.
//
// La règle est écrite dans `core/BaseGame.js` : « UNE ÉTAPE N'EST PAS UNE
// QUESTION […] c'est l'OPÉRATION qui compte, une fois finie », et
// `runner.onAttempt` l'applique (`if (payload.partiel) return;`). Un jeu qui
// annonce une étape intermédiaire doit donc poser `partiel: true`.
//
// CET OUTIL NE JUGE PAS, IL TRIE. Il ne peut pas savoir si deux appels dans un
// fichier sont deux moments de LA MÊME question ou deux questions distinctes —
// cela se lit, et parfois cela se joue. Il montre où regarder : les jeux qui
// déclarent plusieurs réussites sans jamais marquer la moindre étape.
//
//     node tools/comptesDesJeux.mjs
//
// Ce qu'il ne remplace pas : ouvrir le jeu et compter. `tools/tmp` garde la
// sonde qui a prouvé celui de Rémy — on espionne `state.recordAttempt`, qui
// est le passage obligé de tout ce qui compte, et l'on joue UNE question.

import { readdirSync, readFileSync } from 'node:fs';

const DOSSIERS = ['js/games', 'js/core/activities'];

/** Les appels à `onCorrectAnswer` d'un fichier, avec leur ligne et leur texte. */
function appels(source) {
    const trouves = [];
    const lignes = source.split('\n');
    for (let i = 0; i < lignes.length; i++) {
        if (!/onCorrectAnswer\s*\(/.test(lignes[i])) continue;
        if (/^\s*(\/\/|\*)/.test(lignes[i])) continue;      // un commentaire
        if (/onCorrectAnswer\s*\(el,/.test(lignes[i])) continue; // la définition
        // On lit la charge sur une douzaine de lignes : elle est écrite en
        // plusieurs morceaux dans tous ces jeux.
        const charge = lignes.slice(i, i + 12).join(' ');
        const fin = charge.indexOf('});');
        trouves.push({
            ligne: i + 1,
            partiel: /partiel\s*:\s*true/.test(fin === -1 ? charge : charge.slice(0, fin)),
            quoi: (charge.match(/questionText:\s*[`'"]([^`'"]{0,40})/) || [, ''])[1]
        });
    }
    return trouves;
}

const suspects = [];
let fichiers = 0;
let total = 0;

for (const dossier of DOSSIERS) {
    for (const nom of readdirSync(dossier)) {
        if (!nom.endsWith('.js')) continue;
        const chemin = `${dossier}/${nom}`;
        const vus = appels(readFileSync(chemin, 'utf8'));
        if (!vus.length) continue;
        fichiers++;
        total += vus.length;
        // PLUSIEURS RÉUSSITES ET AUCUNE ÉTAPE MARQUÉE : c'est exactement la
        // forme qu'avait « Poser une opération ». Un seul appel ne peut pas
        // doubler le compte ; plusieurs, tous pleins, le peuvent.
        if (vus.length > 1 && !vus.some(v => v.partiel)) suspects.push({ chemin, vus });
    }
}

console.log(`${total} déclaration(s) de réussite dans ${fichiers} fichier(s).\n`);
if (!suspects.length) {
    console.log('\x1b[32mAUCUN JEU NE DÉCLARE PLUSIEURS RÉUSSITES SANS MARQUER D\'ÉTAPE.\x1b[0m');
} else {
    console.log(`\x1b[33m${suspects.length} fichier(s) à regarder\x1b[0m`
        + ' — plusieurs réussites, aucune marquée « partiel » :\n');
    for (const { chemin, vus } of suspects) {
        console.log(`  ${chemin}`);
        for (const v of vus) {
            console.log(`      ligne ${String(v.ligne).padStart(4)}`
                + (v.quoi ? `  « ${v.quoi} »` : '  (sans énoncé)'));
        }
    }
    console.log('\n  Ce n\'est PAS une liste de défauts : deux appels peuvent être');
    console.log('  deux questions distinctes — une par niveau, une par grille. Il faut');
    console.log('  ouvrir le jeu et compter. L\'outil dit seulement où regarder.');
}
