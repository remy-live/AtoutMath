// LE DÉTAIL D'UN ÉLÈVE, SOUS SA LIGNE DE BILAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le bilan que tu proposes est bien car concis, on pourrait avoir un
// peu de détail par élève si on le souhaite et qu'on clique sur lui ? »
//
// LES DEUX MOITIÉS DE SA PHRASE COMPTENT AUTANT. Le tableau est bien PARCE
// QU'il est concis : six colonnes, trente lignes, et l'œil trouve en deux
// secondes qui n'a rien fait. Trois colonnes de plus le détruiraient. Le détail
// se DÉPLIE donc, et seulement là où l'on a cliqué.
//
// ET LE SERVEUR L'ENVOYAIT DÉJÀ. `/teacher/report` rend par élève, depuis
// toujours, `weakSkills` (jusqu'à cinq notions fragiles avec leur maîtrise) et
// `notes` (jusqu'à dix séances notées). L'écran n'en affichait AUCUNE. Il n'y
// avait rien à aller chercher au serveur — seulement à montrer.
//
// MESURÉ dans un vrai navigateur, sur le tableau des bilans :
//   avant le clic   0 dépliage
//   après le clic   1 dépliage, aria-expanded="true" —
//                   « 2 notions fragiles, 2 séances notées. CE QUI EST FRAGILE
//                     Priorités et nombres relatifs 31 % · Table de 7 55 %
//                     SES SÉANCES NOTÉES Relatifs 12/20 · Priorités 15/20 »
//   second clic     0 dépliage

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detailDeLEleve } from '../js/core/detailDeLEleve.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const eleve = (sur = {}) => ({
    studentId: 'e1', firstName: 'Maëlle', lastSeenAt: 1790000000,
    totalQuestions: 42, successRate: 0.64, timeSeconds: 3900, openErrors: 3,
    weakSkills: [], notes: [], ...sur
});

test('IL NOMME LES NOTIONS, LE PLUS FRAGILE D\'ABORD', () => {
    // Le serveur les rend dans l'ordre où il les a trouvées ; c'est la
    // MAÎTRISE qui dit par quoi commencer.
    const d = detailDeLEleve(eleve({ weakSkills: [
        { skillId: 'num.mult.table.7', mastery: 0.55, level: 'EC' },
        { skillId: 'num.prio.relatifs', mastery: 0.31, level: 'NA' }
    ] }));
    assert.deepEqual(d.fragiles.map(f => f.skillId),
        ['num.prio.relatifs', 'num.mult.table.7']);
    assert.deepEqual(d.fragiles.map(f => f.pourcent), [31, 55]);
    // ET IL LES NOMME, il ne rend pas des identifiants : « num.prio.relatifs »
    // ne dit rien à personne, pas même à Rémy.
    assert.equal(d.fragiles[0].label, 'Priorités et nombres relatifs');
    assert.ok(!d.fragiles.some(f => f.label === f.skillId), 'une notion reste en identifiant');
});

test('ET IL REND SES SÉANCES NOTÉES, telles que le serveur les a calculées', () => {
    const d = detailDeLEleve(eleve({ notes: [
        { runId: 'r1', pathName: 'Relatifs', note: 12, sur: 20 },
        { runId: 'r2', pathName: 'Priorités', note: 15, sur: 20 }
    ] }));
    assert.equal(d.notes.length, 2);
    assert.deepEqual(d.notes[0], { runId: 'r1', seance: 'Relatifs', note: 12, sur: 20 });
});

test('« JAMAIS VENU » N\'EST PAS « RIEN DE FRAGILE »', () => {
    // LE REFUS QUI COMPTE. Les deux se ressemblent dans les données et ne se
    // ressemblent pas du tout dans la salle : l'un est un élève qui va bien,
    // l'autre un élève qui n'est jamais venu. C'est la même confusion que
    // « 0 % de réussite », qu'on a déjà refusé d'écrire sur le résumé de classe.
    const jamais = detailDeLEleve(eleve({ totalQuestions: 0, lastSeenAt: null }));
    assert.equal(jamais.vide, true);
    assert.equal(jamais.phrase, 'Jamais venu : il n\'y a rien à détailler.');
    assert.ok(!jamais.phrase.includes('fragile'), 'on parle de fragilité à qui n\'a rien fait');

    // VENU MAIS RIEN D'ENREGISTRÉ : ce n'est pas non plus la même chose. Il a
    // ouvert sa session, il n'a pas répondu — c'est un geste à faire, pas un
    // bilan à lire.
    const venu = detailDeLEleve(eleve({ totalQuestions: 0 }));
    assert.equal(venu.phrase, 'Il s\'est connecté, mais rien n\'est encore enregistré.');
});

test('ET « PAS ENCORE ASSEZ » N\'EST PAS « RIEN DE FRAGILE » NON PLUS', () => {
    // Le serveur ne retient une notion que lorsqu'elle est `reliable` — assez
    // de questions pour trancher. Un élève qui a travaillé sans qu'aucune
    // notion ne soit encore sûre n'a pas « tout bon » : on écrit donc « rien
    // ne ressort », et non « 0 notion fragile ».
    const d = detailDeLEleve(eleve({ totalQuestions: 9, weakSkills: [] }));
    assert.equal(d.vide, false);
    assert.equal(d.phrase, 'Rien ne ressort comme fragile.');
    assert.ok(!/^0 /.test(d.phrase), 'un zéro qui se lit comme un verdict');
});

test('LA PHRASE COMPTE CE QU\'ELLE MONTRE, ET S\'ACCORDE', () => {
    const une = detailDeLEleve(eleve({
        weakSkills: [{ skillId: 'num.mult.table.7', mastery: 0.5, level: 'EC' }],
        notes: [{ runId: 'r', pathName: 'P', note: 10, sur: 20 }]
    }));
    assert.equal(une.phrase, '1 notion fragile, 1 séance notée.');
    const deux = detailDeLEleve(eleve({
        weakSkills: [
            { skillId: 'num.mult.table.7', mastery: 0.5, level: 'EC' },
            { skillId: 'num.prio.relatifs', mastery: 0.3, level: 'NA' }],
        notes: [{ runId: 'a', pathName: 'P', note: 10, sur: 20 },
            { runId: 'b', pathName: 'Q', note: 14, sur: 20 }]
    }));
    assert.equal(deux.phrase, '2 notions fragiles, 2 séances notées.');
});

test('UNE LIGNE ABÎMÉE NE FAIT PAS TOMBER LE TABLEAU', () => {
    // La ligne vient du serveur, qui la recalcule depuis des événements
    // chiffrés. Une exception ici remplacerait TOUT le tableau des bilans par
    // du vide — trente élèves perdus pour un champ manquant chez un seul.
    [null, undefined, {}, { weakSkills: null, notes: 'rien' },
        { weakSkills: [null, { mastery: 1 }], notes: [null, { note: null }] }]
        .forEach(l => assert.doesNotThrow(() => detailDeLEleve(l)));
    assert.deepEqual(detailDeLEleve({}).fragiles, []);
    assert.deepEqual(detailDeLEleve({ notes: [{ note: null }] }).notes, [],
        'une note nulle n\'est pas une note');
});

test('LA LIGNE SE DONNE POUR CLIQUABLE — un tableau ne s\'essaie pas', () => {
    // Personne ne clique une ligne de tableau de sa propre initiative : il faut
    // que l'écran le propose. Le curseur, le survol et `aria-expanded` le
    // disent, chacun à qui il parle.
    const EC = lire('js/ui/espaceClasses.js');
    assert.match(EC, /data-bilan-eleve="\$\{esc\(l\.studentId\)\}" role="button" tabindex="0"/);
    assert.match(EC, /aria-expanded="\$\{ouvert \? 'true' : 'false'\}"/);
    const CSS = lire('css/ui.css');
    assert.match(CSS, /\.ec-tr-bilan \{ cursor: pointer; \}/);
    assert.match(CSS, /\.ec-tr-bilan:focus-visible \{ outline:/);
    // ET LE DÉLÉGUÉ DE CLIC LE VOIT : un crochet oublié dans cette liste est
    // un bouton mort, qui se comporte exactement comme un logiciel cassé.
    assert.match(EC, /\[data-calc-eleve\], \[data-saut-tout\], \[data-bilan-eleve\],/);
});

test('UN ÉLÈVE À LA FOIS, et un second clic referme', () => {
    // Deux dépliages ouverts font reculer le tableau de six lignes, et l'on
    // perd la vue d'ensemble qui est tout l'intérêt de cet écran.
    const EC = lire('js/ui/espaceClasses.js');
    assert.match(EC,
        /vue\.bilanOuvert = vue\.bilanOuvert === d\.bilanEleve \? null : d\.bilanEleve;/);
    // ET CE SOUVENIR N'EST PAS CELUI DU DIRECT : on ne cherche pas la même
    // chose sur les deux écrans, et les mêler rouvrirait une fiche en
    // changeant d'onglet.
    assert.match(EC, /bilanOuvert: null,/);
    assert.match(EC, /fiche: null,/);
});
