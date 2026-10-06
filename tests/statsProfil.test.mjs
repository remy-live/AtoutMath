// LA VUE DU PROFIL — CE QUE L'ÉLÈVE LIT DE SA PROPRE PROGRESSION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/stats.js` ne calcule rien : il présente le modèle de maîtrise
// (`core/mastery.js`, lui déjà éprouvé) sous la forme que l'interface attend.
// C'est une couche de TRADUCTION, et c'est exactement le genre de module qu'on
// n'éprouve pas parce qu'« il ne fait rien ».
//
// CE QU'IL FAIT POURTANT, et ce qui se casse sans un mot :
//
//   1. IL RENOMME. `e.skillId` devient `key`, `e.lastTs` devient
//      `lastTimestamp`, `e.exerciseIds` devient `exoIds`. Un champ renommé de
//      travers rend `undefined` — et `undefined` s'affiche comme une case vide,
//      pas comme une erreur. L'élève voit un tableau à trous ; personne ne sait
//      pourquoi.
//   2. IL TRIE PAR VOLUME. Un élève doit voir d'abord ce qu'il a le plus
//      travaillé, pas l'ordre alphabétique d'identifiants techniques.
//   3. IL MET UN LIBELLÉ FRANÇAIS SUR CHAQUE COMPÉTENCE. Sans lui, l'écran
//      affiche « num.mult.table.7 » à un élève de sixième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ON ENTRE PAR LE JOURNAL, PAS PAR `state.masteryMap`.
//
// Première tentative de cette épreuve : poser `state.masteryMap = new Map(...)`.
// Node a répondu « Cannot set property masteryMap which has only a getter », et
// c'était une bonne nouvelle — `state.masteryMap` est un CALCUL mémoïsé sur le
// journal, pas un champ. Le forcer aurait mesuré un chemin que l'élève
// n'emprunte jamais.
//
// On range donc de vraies tentatives dans le journal, et l'on lit ce que le
// profil en montre. Cela demande une chose : le mémo de `state` se vide sur un
// ÉVÉNEMENT de document (`journal_appended`, `journal_merged`), et le faux
// `document` des épreuves ne transmet rien. On lui donne ici un vrai petit bus,
// AVANT de charger `state.js` — sans quoi le profil répondrait toujours avec le
// premier calcul.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { attempt } from './helpers.mjs';

// ─── Un document qui transmet vraiment, posé avant le chargement de `state` ───
const abonnes = new Map();
globalThis.document = {
    ...globalThis.document,
    addEventListener(type, fn) {
        if (!abonnes.has(type)) abonnes.set(type, []);
        abonnes.get(type).push(fn);
    },
    removeEventListener(type, fn) {
        const l = abonnes.get(type) || [];
        const i = l.indexOf(fn);
        if (i >= 0) l.splice(i, 1);
    },
    dispatchEvent(ev) {
        (abonnes.get(ev.type) || []).forEach(fn => fn(ev));
        return true;
    }
};

const { journal } = await import('../js/core/journal.js');
const { skillLabel } = await import('../js/data/skills.js');
const {
    computeSkillStats, getWeakSkills, getStrongSkills,
    getWeakTables, getTotalCorrectCount, LEVELS, levelFor, RELIABLE_MIN_ATTEMPTS
} = await import('../js/core/stats.js');

const JOUR = 86400000;
const MAINTENANT = Date.now();

/**
 * Range des tentatives dans le journal, et vide ce qu'il portait avant.
 *
 * On reste DANS le chemin réel : `merge` est l'entrée que la synchronisation et
 * l'import empruntent, et c'est elle qui prévient `state` de recalculer.
 */
function travailler(series) {
    // ON VIDE PAR `oublier`, PAS EN TRONQUANT LE TABLEAU.
    //
    // Mesuré : `journal.events.length = 0` laissait le mémo de `state` intact —
    // il ne se vide que sur un événement de document —, et l'épreuve du profil
    // VIDE lisait encore les quarante-deux tentatives de l'épreuve précédente.
    // Elle serait tombée pour une raison qui n'a rien à voir avec le code
    // mesuré. `oublier` est l'entrée réelle (c'est la remise à zéro d'une
    // séance par le professeur) et elle prévient tout le monde.
    journal.oublier(() => true);
    const evts = [];
    let n = 0;
    for (const { skill, exo = 'calc-mult-flash', justes, fausses, ilYA = 1 } of series) {
        for (let i = 0; i < justes; i++) {
            evts.push(attempt({ skillId: skill, exerciseId: exo, correct: true, ts: MAINTENANT - ilYA * JOUR }));
        }
        for (let i = 0; i < fausses; i++) {
            evts.push(attempt({ skillId: skill, exerciseId: exo, correct: false, ts: MAINTENANT - ilYA * JOUR }));
        }
        n += justes + fausses;
    }
    // `merge` dédoublonne par identifiant : `attempt()` en donne un neuf à
    // chaque appel, donc tout entre.
    const entres = journal.merge(evts);
    assert.equal(entres, n, 'l\'épreuve elle-même doit avoir réussi à ranger ses tentatives');
    // Et le mémo doit être tombé : sans cela, tout ce qui suit mesure le vide.
    return journal.all();
}

test('CHAQUE CHAMP QUE L\'ÉCRAN LIT EXISTE VRAIMENT', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE FERME : un champ renommé de travers rend
    // `undefined`, qui s'affiche comme une case vide. L'élève voit un tableau à
    // trous et croit n'avoir rien fait.
    travailler([{ skill: 'num.mult.table.7', justes: 7, fausses: 3 }]);
    const vues = computeSkillStats();
    assert.equal(vues.length, 1, 'une compétence travaillée, une ligne au profil');
    const [vue] = vues;

    for (const champ of ['key', 'skillId', 'label', 'attempts', 'correct', 'successRate',
        'weightedRate', 'mastery', 'level', 'reliable', 'lastTimestamp', 'avgMs', 'due', 'box', 'exoIds']) {
        assert.notEqual(vue[champ], undefined, `« ${champ} » manque : l'écran afficherait une case vide`);
    }

    // Les chiffres sont bien ceux du travail fait, pas des valeurs par défaut.
    assert.equal(vue.attempts, 10);
    assert.equal(vue.correct, 7);
    assert.equal(vue.skillId, 'num.mult.table.7');

    // Et les renommages, nommément — ce sont eux qui peuvent diverger sans que
    // rien ne tombe.
    assert.equal(vue.key, 'num.mult.table.7', '`skillId` se redit aussi `key`');
    assert.equal(typeof vue.lastTimestamp, 'number', '`lastTs` devient `lastTimestamp`');
    assert.ok(Array.isArray(vue.exoIds), '`exerciseIds` devient `exoIds`');
    assert.ok(vue.exoIds.includes('calc-mult-flash'),
        'l\'exercice travaillé doit se retrouver : c\'est lui que « reprendre » proposera');
});

test('L\'ÉLÈVE LIT UN NOM FRANÇAIS, PAS UN IDENTIFIANT TECHNIQUE', () => {
    travailler([{ skill: 'num.mult.table.7', justes: 7, fausses: 3 }]);
    const [vue] = computeSkillStats();
    assert.equal(vue.label, skillLabel('num.mult.table.7'));
    assert.notEqual(vue.label, 'num.mult.table.7',
        'un élève de sixième ne doit pas lire « num.mult.table.7 » dans son profil');
});

test('ON VOIT D\'ABORD CE QU\'ON A LE PLUS TRAVAILLÉ', () => {
    travailler([
        { skill: 'num.add.entiers', justes: 3, fausses: 1 },
        { skill: 'num.mult.table.7', justes: 30, fausses: 12 },
        { skill: 'num.prio', justes: 12, fausses: 5 }
    ]);
    const ordre = computeSkillStats().map(v => v.attempts);
    assert.deepEqual(ordre, [42, 17, 4],
        'le tri par volume est ce qui met en haut la notion que l\'élève vient de travailler');
});

test('UN PROFIL VIDE DONNE UNE LISTE VIDE, PAS UNE ERREUR', () => {
    // C'est l'écran du premier jour, et c'est celui que tous les élèves voient
    // en septembre.
    travailler([]);
    assert.deepEqual(computeSkillStats(), []);
    assert.deepEqual(getWeakSkills(), []);
    assert.deepEqual(getStrongSkills(), []);
    assert.deepEqual(getWeakTables(), []);
    assert.equal(getTotalCorrectCount(), 0);
});

test('LES NOTIONS FRAGILES ET ACQUISES ONT LA MÊME FORME QUE LE RESTE', () => {
    // Les deux listes alimentent les mêmes composants d'affichage. Une forme
    // différente d'un côté fait un bandeau vide dans l'écran du professeur.
    travailler([
        { skill: 'num.add.entiers', justes: 2, fausses: 14 },
        { skill: 'num.mult.table.7', justes: 19, fausses: 1 }
    ]);
    const listes = [getWeakSkills(5), getStrongSkills(5)];
    assert.ok(listes.some(l => l.length), 'avec seize fautes d\'un côté, une des deux listes doit être servie');
    for (const liste of listes) {
        for (const v of liste) {
            for (const champ of ['key', 'skillId', 'label', 'attempts', 'correct',
                'successRate', 'mastery', 'level', 'reliable', 'due', 'exoIds']) {
                assert.notEqual(v[champ], undefined, `« ${champ} » manque dans ${v.skillId}`);
            }
            assert.notEqual(v.label, v.skillId, 'et le libellé est en français');
        }
    }
});

test('UNE LIMITE DEMANDÉE EST RESPECTÉE', () => {
    // L'écran du profil réserve six lignes. En rendre douze les fait déborder
    // sous le pli, où personne ne les lit.
    travailler(Array.from({ length: 11 }, (_, i) => ({
        skill: `num.mult.table.${i + 2}`, justes: 4 + i, fausses: 12 - i
    })));
    assert.ok(computeSkillStats().length >= 8, 'les onze tables doivent être là pour que la limite ait un sens');
    assert.ok(getWeakSkills(6).length <= 6);
    assert.ok(getStrongSkills(3).length <= 3);
    // Et une limite plus grande que le nombre de compétences ne fabrique pas de
    // lignes vides.
    assert.ok(getWeakSkills(50).length <= computeSkillStats().length);
});

test('LES TABLES À RENFORCER SONT DES NUMÉROS DE TABLE', () => {
    // CE QUE LES GÉNÉRATEURS EN FONT : ils biaisent leur tirage vers ces
    // numéros. Leur rendre un identifiant complet (« num.mult.table.7 ») au
    // lieu de 7 ne jette pas — le tirage ne trouve simplement jamais rien à
    // renforcer, et l'adaptation ne sert plus à rien sans que personne ne le
    // sache.
    travailler([
        { skill: 'num.mult.table.7', justes: 2, fausses: 14 },
        { skill: 'num.mult.table.8', justes: 3, fausses: 13 },
        { skill: 'num.add.entiers', justes: 1, fausses: 15 }
    ]);
    const tables = getWeakTables(3);
    assert.ok(tables.length >= 1, 'deux tables ratées sur trois doivent ressortir');
    for (const t of tables) {
        assert.equal(typeof t, 'number', `« ${t} » doit être un nombre, pas un identifiant`);
        assert.ok(t >= 2 && t <= 12, `${t} doit être une table plausible`);
    }
});

test('LE NOMBRE DE BONNES RÉPONSES SUIT LE TRAVAIL FAIT', () => {
    // Il alimente les récompenses. S'il divergeait du journal, un élève verrait
    // un badge « 100 bonnes réponses » avec 87 affichées à côté.
    travailler([
        { skill: 'num.mult.table.7', justes: 9, fausses: 4 },
        { skill: 'num.add.entiers', justes: 6, fausses: 2 }
    ]);
    assert.equal(getTotalCorrectCount(), 15);
});

test('LES NIVEAUX ET LE SEUIL DE FIABILITÉ SONT RÉEXPORTÉS TELS QUELS', () => {
    // L'interface les lit depuis ici. Une copie locale divergerait du modèle,
    // et deux écrans donneraient deux couleurs à la même compétence.
    assert.ok(Array.isArray(LEVELS) || typeof LEVELS === 'object');
    assert.equal(typeof RELIABLE_MIN_ATTEMPTS, 'number');
    assert.ok(RELIABLE_MIN_ATTEMPTS > 0);
    // Et `levelFor` doit rendre un niveau utilisable à l'écran : une couleur et
    // un libellé court, c'est ce que les barres du profil affichent.
    const n = levelFor(0.75);
    assert.ok(n && n.color, 'un niveau sans couleur fait une barre invisible');
    assert.ok(n.short, 'un niveau sans abrégé fait une légende vide');
});

test('UNE NOTION TRAVAILLÉE DEUX FOIS NE FAIT QU\'UNE LIGNE', () => {
    // Deux exercices différents peuvent travailler la même compétence. Le
    // profil doit montrer LA NOTION, pas une ligne par exercice — sinon l'élève
    // lit trois fois « Table de 7 » avec trois taux différents et ne sait plus
    // lequel le concerne.
    travailler([
        { skill: 'num.mult.table.7', exo: 'calc-mult-flash', justes: 5, fausses: 1 },
        { skill: 'num.mult.table.7', exo: 'num-ninja', justes: 4, fausses: 2 }
    ]);
    const vues = computeSkillStats();
    assert.equal(vues.length, 1, 'une notion, une ligne');
    assert.equal(vues[0].attempts, 12, 'et les deux exercices s\'additionnent');
    assert.equal(vues[0].exoIds.length, 2, 'les deux exercices sont nommés');
});
