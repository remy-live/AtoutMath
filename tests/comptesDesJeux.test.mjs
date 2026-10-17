// UN JEU QUI DÉCLARE DEUX RÉUSSITES POUR UNE QUESTION FAUSSE LA NOTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après une séance : « sur Poser une opération, les élèves ont fait
// 2 opérations (ou 3) et ont eu 5/5 ». Puis, quand je lui ai montré que
// d'autres jeux avaient la même forme : « fais tout ».
//
// LA RÈGLE N'EST PAS DE MON INVENTION, et c'est ce qui la rend sûre : le
// MANIFESTE de chaque activité déclare son unité de compte — `unite: 'chantier'`,
// `unite: 'mot'`, `unite: 'partie'`, `unite: 'dessin'`. Ce qui correspond à
// cette unité est la question ; tout le reste est une étape, et prend
// `partiel: true`. `core/runner.js` l'applique en une ligne :
// `if (payload.partiel) return;`.
//
// Deux fois sur huit, cette règle m'a contredit : dans Le Chantier et aux
// Échecs, c'est la MANCHE qui est la question et l'élément qui est l'étape.
// Une relecture au jugé aurait inversé les deux.
//
// ── CE QUE CETTE ÉPREUVE GARDE ────────────────────────────────────────────
//
// La CLASSE, et non les huit corrections une à une : tout fichier de jeu qui
// déclare plusieurs réussites sans jamais marquer d'étape. C'est la forme
// qu'avaient les huit, et c'est celle qu'aura le neuvième.
//
// Un `partiel: true` se retire sans que rien ne rougisse : l'écran est
// identique, le jeu se joue pareil, et c'est le BULLETIN qui ment — trois
// semaines plus tard, devant un parent. Aucune mesure d'affichage ne
// l'attrape, et c'est pourquoi cette épreuve lit la source.
//
// `node tools/comptesDesJeux.mjs` fait le même tri et imprime les lignes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DOSSIERS = ['js/games', 'js/core/activities'];

/**
 * LES TROIS JEUX QUI DÉCLARENT PLUSIEURS FOIS SANS SE TROMPER.
 *
 * Mesurés un par un, et la raison est écrite : ce sont des questions
 * DISTINCTES, pas une étape et sa somme. On les nomme ici plutôt que de
 * baisser le seuil de l'épreuve — une liste qu'on lit vaut mieux qu'un
 * critère qu'on affaiblit.
 */
const CONNUS_SAINS = {
    'js/games/ninja.js':
        'les deux déclarations s\'excluent par le MODE : `this.mode === \'zeros\'` '
        + 'd\'un côté, `!== \'zeros\'` de l\'autre. Une seule part par partie.',
    'js/games/nova.js':
        'six façons différentes de répondre à une multiplication — un missile '
        + 'abattu, un gardien, une faille, une piste, une porte, un transport. '
        + 'Six questions distinctes, pas une étape et sa somme.',
    'js/games/patrons.js':
        'chaque question porte une `famille` — « reconnaitre » ou « opposees » — '
        + 'et une seule des deux déclarations part par question.'
};

/** Les appels à `onCorrectAnswer` d'un fichier, avec leur ligne. */
function appels(source) {
    const trouves = [];
    const lignes = source.split('\n');
    for (let i = 0; i < lignes.length; i++) {
        if (!/onCorrectAnswer\s*\(/.test(lignes[i])) continue;
        if (/^\s*(\/\/|\*)/.test(lignes[i])) continue;       // un commentaire
        if (/onCorrectAnswer\s*\(el,/.test(lignes[i])) continue;  // la définition
        // La charge s'écrit sur plusieurs lignes dans tous ces jeux : on la lit
        // jusqu'à sa fermeture, sans déborder sur l'appel suivant.
        const charge = lignes.slice(i, i + 12).join(' ');
        const fin = charge.indexOf('});');
        trouves.push({
            ligne: i + 1,
            partiel: /partiel\s*:\s*true/.test(fin === -1 ? charge : charge.slice(0, fin))
        });
    }
    return trouves;
}

test('AUCUN JEU NE DÉCLARE PLUSIEURS RÉUSSITES SANS MARQUER D\'ÉTAPE', () => {
    const fautifs = [];
    let fichiers = 0;
    for (const dossier of DOSSIERS) {
        for (const nom of readdirSync(dossier)) {
            if (!nom.endsWith('.js')) continue;
            const chemin = `${dossier}/${nom}`;
            const vus = appels(readFileSync(chemin, 'utf8'));
            if (!vus.length) continue;
            fichiers++;
            if (vus.length < 2) continue;              // un seul appel ne double rien
            if (vus.some(v => v.partiel)) continue;    // une étape est marquée
            if (CONNUS_SAINS[chemin]) continue;        // mesuré, et la raison est écrite
            fautifs.push(`  · ${chemin} — ${vus.length} réussites aux lignes `
                + vus.map(v => v.ligne).join(', '));
        }
    }

    assert.ok(fichiers > 60,
        `on n'a lu que ${fichiers} fichier(s) de jeu : la lecture ne marche plus, `
        + 'et cette épreuve ne garde donc plus rien.');
    assert.equal(fautifs.length, 0,
        'des jeux déclarent plusieurs réussites sans jamais marquer d\'étape.\n'
        + 'Une manche terminée y compte une question de plus que ce que l\'élève a\n'
        + 'répondu, et le professeur lit une note fausse — Rémy : « ils ont fait\n'
        + '2 opérations et ont eu 5/5 ».\n'
        + 'Si c\'est voulu — des questions VRAIMENT distinctes —, l\'ajouter à\n'
        + '`CONNUS_SAINS` avec la raison, après l\'avoir mesuré.\n'
        + fautifs.join('\n'));
});

/**
 * LES JEUX OÙ UNE SEULE DÉCLARATION EST LA QUESTION, ET COMBIEN.
 *
 * L'épreuve ci-dessus garde la FORME — « aucune étape marquée » — et elle a une
 * limite qu'il a fallu mesurer pour voir : un fichier qui marque UNE de ses
 * trois déclarations lui échappe, même si une deuxième aurait dû l'être.
 * `epreuveTombe` l'a dit en refusant de tomber sur « Rédiger un raisonnement »,
 * dont les trois marches se comptaient comme trois rédactions.
 *
 * On nomme donc, pour chacun, le nombre de déclarations qui doivent rester
 * PLEINES. Le chiffre vient de l'unité déclarée au manifeste de l'activité,
 * citée en regard — ce n'est pas un jugement, c'est une lecture.
 */
const UNE_SEULE_QUESTION = {
    'js/games/chantier.js': [1, 'unite: \'chantier\' — un chantier vaut une question, '
        + 'les blocs sont les coups qu\'on y joue'],
    'js/games/motsCaches.js': [1, 'unite: \'mot\' — chaque mot trouvé est une question, '
        + 'et c\'est la GRILLE terminée qui est leur somme'],
    'js/games/plateau.js': [1, 'unite: \'partie\' — un mat en trois coups est UN problème, '
        + 'pas trois'],
    'js/games/pointAPoint.js': [1, 'unite: \'dessin\' — chaque point relié est un pas '
        + 'vers le dessin qu\'on découvre'],
    'js/games/redaction.js': [1, 'unite: \'rédaction\' — la propriété, les données et la '
        + 'conclusion sont les trois marches d\'UNE rédaction'],
    'js/games/conversion.js': [1, 'garnir le tableau est la mise en place ; ce sont les '
        + 'conversions qui se comptent'],
    'js/games/deuxmille.js': [1, 'la tuile visée est déjà un palier, et les paliers '
        + 'comptent : elle comptait donc deux fois'],
    'js/games/skweek.js': [1, 'chaque dalle repeinte est un calcul trié ; le niveau fini '
        + 'est leur somme'],
    'js/games/tetris.js': [1, 'quitter la partie n\'est pas une réponse'],
    'js/games/course.js': [1, 'quitter la course et la bien finir ne sont pas des '
        + 'réponses de plus']
};

test('CHACUN DE CES JEUX NE COMPTE QU\'UNE QUESTION PAR MANCHE', () => {
    for (const [chemin, [attendu, raison]] of Object.entries(UNE_SEULE_QUESTION)) {
        let source;
        try { source = readFileSync(chemin, 'utf8'); } catch (e) { source = null; }
        assert.ok(source, `« ${chemin} » est gardé ici mais n'existe plus.`);
        const pleines = appels(source).filter(v => !v.partiel);
        assert.equal(pleines.length, attendu,
            `${chemin} déclare ${pleines.length} réussite(s) pleine(s) au lieu de `
            + `${attendu} (lignes ${pleines.map(v => v.ligne).join(', ')}).\n`
            + `      ${raison}.\n`
            + '      Une manche y comptera plus de questions que l\'élève n\'en a '
            + 'répondu.');
    }
});

test('LA LISTE DES EXCEPTIONS NE SE PÉRIME PAS EN SILENCE', () => {
    // Une exception qui nomme un fichier disparu, ou un fichier qui ne déclare
    // plus qu'une seule réussite, est une dispense devenue gratuite : le jour
    // où ce fichier redouble, l'épreuve se taira.
    for (const [chemin, raison] of Object.entries(CONNUS_SAINS)) {
        let source;
        try { source = readFileSync(chemin, 'utf8'); } catch (e) { source = null; }
        assert.ok(source, `« ${chemin} » est dispensé mais n'existe plus.`);
        const vus = appels(source);
        assert.ok(vus.length >= 2,
            `« ${chemin} » ne déclare plus que ${vus.length} réussite(s) : `
            + 'la dispense ne sert plus à rien, et elle cachera le prochain défaut.');
        assert.ok(raison && raison.length > 40,
            `« ${chemin} » est dispensé sans raison écrite.`);
    }
});
