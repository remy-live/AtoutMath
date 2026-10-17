// « PLACER UN POINT » NE DOIT PAS BLOQUER APRÈS UNE ERREUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour l'exercice placer un point. Si l'élève se trompe, on ne peut
// plus cliquer, en fait l'exercice bloque ».
//
// MESURÉ, par le chemin de l'élève (`tools/pointQuiBloque.mjs`) : après un
// clic faux, 36 cibles, ZÉRO cliquable, et cela ne changeait plus. L'élève
// restait devant « Place le point B (5 ; 3) » sans rien pouvoir toucher.
//
// LA CAUSE TIENT EN UNE BRANCHE MANQUANTE. La grille se fige au moment de la
// réponse — c'est voulu, un doigt posé sur un nœud ne doit pas répondre deux
// fois pendant la correction. Trois chemins sortent de là : juste → question
// suivante ; plus d'essai → on montre la correction puis on passe ; FAUX MAIS
// IL RESTE UN ESSAI → on rouvre. Le troisième n'existait pas, et c'est le plus
// fréquent des trois en entraînement, où la politique accorde deux essais.
//
// ── POURQUOI UNE ÉPREUVE DE SOURCE, ET CE QU'ELLE GARDE VRAIMENT ───────────
//
// L'activité ne se monte que dans un navigateur, et la sonde mesure le vrai
// geste. Cette épreuve-ci garde la FORME de la décision, qui est ce qui se
// perd : les deux premières branches sortent par un `return`, et une troisième
// ligne de conduite existe pour le reste. C'est exactement ce qui manquait.
//
// ET ELLE REGARDE TOUTE LA FAMILLE. C'est la deuxième fois qu'un exercice
// bloque ainsi — « dans ce genre d'exercice on peut se retrouver bloqué », sur
// le codage, où la cause était un retour anticipé qui n'appelait pas `submit`.
// Une activité qui FIGE son plateau doit le ROUVRIR : les trois qui le font
// sont vérifiées ensemble, pour que la quatrième ne reparte pas de zéro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const REPERE = readFileSync('js/core/activities/repere.js', 'utf8');

test('UN ESSAI QUI RESTE ROUVRE LA GRILLE', () => {
    const bloc = /result\.dismissed\.then\(\(\) => \{[\s\S]*?\n            \}\);/.exec(REPERE);
    assert.ok(bloc, 'le bloc de fermeture de correction a changé de forme');
    const corps = bloc[0];

    // LES DEUX PREMIÈRES BRANCHES SORTENT, sinon la troisième s'appliquerait
    // par-dessus : on rouvrirait la grille juste avant de changer de question.
    assert.match(corps, /if \(result\.correct\) \{ renderNext\(\); return; \}/, corps);
    const revele = corps.indexOf('if (result.revealed)');
    assert.ok(revele >= 0, 'la branche « plus d\'essai » a disparu');
    const apresRevele = corps.slice(revele);
    assert.match(apresRevele.slice(0, 400), /\n\s*return;\n/,
        'la branche « plus d\'essai » ne sort pas : la grille se rouvrirait au '
        + 'moment où la correction s\'affiche');

    // ET LA TROISIÈME EXISTE, APRÈS LES DEUX AUTRES.
    const rouvre = corps.indexOf("classList.remove('rep-svg--repondu')");
    assert.ok(rouvre > revele,
        'rien ne retire la classe qui fige la grille : l\'élève reste bloqué');
});

test('ET ELLE EFFACE LA CROIX DU MAUVAIS ESSAI', () => {
    // Sans cela, une croix rouge par essai s'empile sur un repère qu'il faut
    // relire — et la marque de l'essai précédent se lirait comme la réponse.
    assert.match(REPERE, /querySelectorAll\('\.rep-mark--ko, \.rep-mark-label--ko'\)/,
        'les marques du mauvais essai ne sont pas effacées en rouvrant');
});

test('TOUTE ACTIVITÉ QUI FIGE SON PLATEAU LE ROUVRE', () => {
    // LA FAMILLE, ET NON LE SEUL CAS CORRIGÉ. Trois activités figent leur
    // plateau pendant la correction ; chacune doit savoir le rouvrir quand il
    // reste un essai. La quatrième qui le fera trouvera la règle écrite ici.
    const familles = [
        { f: 'js/core/activities/repere.js',
          fige: /classList\.add\('rep-svg--repondu'\)/,
          rouvre: /classList\.remove\('rep-svg--repondu'\)/ },
        { f: 'js/core/activities/choice.js',
          fige: /style\.pointerEvents = 'none'/,
          rouvre: /style\.pointerEvents = ''/ },
        { f: 'js/core/activities/angles.js',
          fige: /etat\.fige = true/,
          rouvre: /etat\.fige = false/ },
    ];
    for (const { f, fige, rouvre } of familles) {
        const src = readFileSync(f, 'utf8');
        if (!fige.test(src)) continue;   // elle ne fige plus : rien à garder
        assert.match(src, rouvre, `${f} fige son plateau et ne le rouvre jamais`);
    }
});
