// CE QU'EST UNE ÉCHELLE, ET CE QUI N'EN EST PAS UNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faudrait pouvoir faire les check box comme pour le calcul
// littéral ». Dix exercices écrivaient encore leur « échelle » en menu
// déroulant. En les regardant un par un, ils se sont répartis en TROIS tas —
// et c'est cette distinction qui vaut, bien plus que la conversion :
//
//   · QUATRE ÉTAIENT DE VRAIES ÉCHELLES (les trois priorités et la
//     trigonométrie) : des barreaux qu'on gravit, et qu'une séance veut
//     composer — « les trois premiers », « le 2 et le 4 ». Convertis.
//
//   · CINQ DRAPEAUX `echelle: true` ÉTAIENT POSÉS À TORT, sur des réglages qui
//     ne sont pas des progressions : l'opération de Math Crush (addition OU
//     multiplication), sa difficulté, la fréquence de codage des
//     quadrilatères, la taille de la grille du Mot Codé et sa part de lettres
//     offertes. Une partie ne peut pas être « petite ET grande ». Le drapeau
//     avait été employé comme s'il voulait dire « réglage qui change la
//     difficulté » ; il veut dire « progression composable », et l'outil de
//     cohérence réclamait des conversions impossibles.
//
//   · QUATRE SONT DES BORNES sur une suite qui s'enchaîne — « Leçon de
//     départ », « Commencer au niveau », « Jusqu'à quel niveau », et les
//     cinquante tableaux du Pousseur. On ne fait pas la leçon 7 d'un tutoriel
//     sans les six premières. Écrites comme exceptions, avec leur raison.
//
// CE QUE CETTE ÉPREUVE GARDE : que le tri ne se défasse pas. Un drapeau
// `echelle` reposé au hasard sur un bouton à deux valeurs rallumerait l'outil,
// et c'est ainsi qu'une liste redevient rouge pour toujours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exercices, getExerciseById, paramSchemaOf } from '../js/data/catalog.js';

/** Ceux qui gardent un menu, et la raison écrite dans l'outil. */
const BORNES = ['don-tableur', 'geo-programme-construction', 'voc-mot-code', 'defi-pousseur'];

test('PLUS AUCUN DRAPEAU « echelle » SUR UN RÉGLAGE QUI N\'EN EST PAS UNE', () => {
    const fautifs = [];
    for (const exo of exercices) {
        for (const p of paramSchemaOf(exo) || []) {
            if (!p || !p.echelle || p.type === 'marches') continue;
            if (BORNES.includes(exo.id)) continue;
            fautifs.push(`${exo.id} · ${p.id}`);
        }
    }
    assert.deepEqual(fautifs, [],
        'une échelle se coche ; tout le reste est un choix, et ne porte pas le drapeau');
});

test('LES CINQ DRAPEAUX POSÉS À TORT SONT BIEN PARTIS', () => {
    // On les nomme : une épreuve qui compte sans nommer laisserait passer un
    // échange — un drapeau retiré ici, un autre ajouté ailleurs.
    const partis = {
        'calc-math-crush': ['mode', 'difficulty'],
        'geo-quadrilateres': ['codage'],
        'voc-mot-code': ['taille', 'aide']
    };
    for (const [id, ids] of Object.entries(partis)) {
        const schema = paramSchemaOf(getExerciseById(id)) || [];
        for (const pid of ids) {
            const p = schema.find((x) => x && x.id === pid);
            assert.ok(p, `${id} a toujours son réglage « ${pid} »`);
            assert.ok(!p.echelle, `${id} · ${pid} ne se dit plus échelle`);
        }
    }
});

test('ET CHAQUE MENU QUI RESTE A SA RAISON ÉCRITE', () => {
    // Une exception sans raison est un oubli déguisé : dans six mois personne
    // ne saura si c'était un choix ou une tâche qu'on a laissée tomber.
    const outil = readFileSync(
        new URL('../tools/reglagesCoherents.mjs', import.meta.url), 'utf8');
    const table = outil.slice(outil.indexOf('const MENUS_ACCEPTÉS = {'),
        outil.indexOf('function echelleDe'));
    for (const id of BORNES) {
        assert.ok(table.includes(`'${id}':`), `${id} est dans la table des exceptions`);
    }
    // Et la raison dit la MÊME chose que le code : une borne, pas une liste.
    // L'apostrophe est ÉCHAPPÉE dans la source : on cherche ce qui est écrit
    // dans le fichier, pas ce que le terminal affiche.
    assert.match(table, /où l\\?'on ENTRE/);
    assert.match(table, /est un PLAFOND, pas une liste/);
});

test('LA TRIGONOMÉTRIE PREND SON PALIER À CHAQUE FIGURE', () => {
    // C'EST LA MOITIÉ QUI COMPTE, et elle n'était gardée par rien : le réglage
    // peut être parfaitement converti en cases pendant que le jeu continue de
    // lire `params.palier` une seule fois, au constructeur. Seize figures du
    // même palier, des cases qui se cochent, et aucune erreur nulle part.
    //
    // `tools/epreuveTombe.mjs` l'a dit en une commande : l'épreuve des
    // priorités passait avec ET sans le défaut sur ce fichier-ci, parce
    // qu'elle ne le lit pas.
    const jeu = readFileSync(new URL('../js/games/trigonometrie.js', import.meta.url), 'utf8');
    const poser = jeu.slice(jeu.indexOf('    poser() {'));
    assert.match(poser.slice(0, 900),
        /const suivant = marcheAuRang\(this\.poses\+\+, this\.cochees,/,
        'le palier se choisit dans poser(), figure par figure');
    assert.match(poser.slice(0, 900), /if \(suivant\) this\.palier = suivant;/,
        'et il ne s\'efface pas quand le découpage ne rend rien');
    // ON COMPTE LES FIGURES POSÉES, pas les réussies : sinon l'élève qui bute
    // — celui qu'on veut justement voir avancer — reste au premier palier.
    assert.match(jeu, /this\.poses = 0;/);
});

test('ET LES PALIERS DE TRIGONOMÉTRIE VIVENT DANS LE NOYAU', () => {
    // Le catalogue les déclare. S'ils restaient dans le JEU, `js/data/` devrait
    // importer `js/games/` — et TOUS les tests tomberaient sur « document is
    // not defined ». Le piège est écrit en tête de CLAUDE.md ; il se referme
    // ici par une épreuve plutôt que par la mémoire.
    const catalogue = readFileSync(new URL('../js/data/geometrie.js', import.meta.url), 'utf8');
    assert.match(catalogue, /from '\.\.\/core\/trigonometrie\.js'/);
    assert.ok(!/from '\.\.\/games\//.test(catalogue),
        'un fichier de js/data/ n\'importe jamais js/games/');
});
