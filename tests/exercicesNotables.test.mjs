// TOUS LES EXERCICES NE SONT PAS ÉVALUABLES, ET IL FAUT LE DIRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « comment juges-tu un exercice comme l'organigramme des quadrilatères
// en mode évaluation ? Ma question générale est : est-ce que tous les exercices
// sont vraiment évaluables ? »
//
// NON. Une note compte des questions ratées ; une activité qui ne peut RIEN
// rater rend 20 à qui la traverse, quoi qu'il fasse. MESURÉ en cherchant, dans
// chaque module, une tentative fausse qui ne soit pas marquée `partiel` :
// 31 exercices sur 172 sont dans ce cas.
//
// CE N'EST PAS UN DÉFAUT DE CES EXERCICES. Ce sont des constructions et des
// réflexions : l'organigramme se bâtit jusqu'à ce qu'il tienne, le pousseur se
// recommence, les mots croisés se remplissent. « Raté » n'y veut rien dire.
// On ne les interdit donc pas en évaluation — un organigramme dans une
// interrogation est un choix légitime — on PRÉVIENT que la note ne viendra pas
// de là.
//
// CE TEST REDÉRIVE LA LISTE DU CODE. Une liste écrite à la main dérive : on
// ajoute un jeu, on oublie de l'inscrire, et le garde-fou ment. Ici, c'est la
// source des modules qui tranche, et la déclaration doit lui correspondre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices, estNotable } from '../js/data/catalog.js';
import '../js/core/activities/index.js';
import { readFileSync, existsSync } from 'node:fs';

const chemin = (p) => new URL('../' + p, import.meta.url);
const lire = (p) => readFileSync(chemin(p), 'utf8');

// --- OÙ VIT LE CODE DE CHAQUE ACTIVITÉ --------------------------------------
// Par le REGISTRE et non par le nom du fichier : huit activités portent un
// identifiant qui ne ressemble pas au leur (`shooter` → `arcade_shooter.js`,
// `tableur` → `spreadsheet.js`), et ma première mesure les avait perdues — elle
// rendait « module introuvable » pour huit exercices, ce qui se lit comme zéro.
function modulesDesActivites() {
    const INDEX = lire('js/core/activities/index.js');
    const m = new Map();
    const legacy = INDEX.slice(INDEX.indexOf('const legacy = ['), INDEX.indexOf('legacy.forEach'));
    for (const l of legacy.matchAll(/\[\s*'([^']+)'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*'([^']+)'/g)) {
        m.set(l[1], `js/games/${l[2]}.js`);
    }
    for (const b of INDEX.matchAll(/registerActivity\(\{([\s\S]*?)\n\}\);/g)) {
        const id = (b[1].match(/\bid:\s*'([^']+)'/) || [])[1];
        const imp = (b[1].match(/load:\s*\(\)\s*=>\s*import\('([^']+)'\)/) || [])[1];
        if (!id || !imp) continue;
        m.set(id, imp.startsWith('../../')
            ? 'js/' + imp.slice(6)
            : 'js/core/activities/' + imp.replace(/^\.\//, ''));
    }
    return m;
}

/** Les appels à `nom(...)`, parenthèses équilibrées — sinon deux appels n'en font qu'un. */
function appels(src, nom) {
    const out = [];
    let i = 0;
    while ((i = src.indexOf(nom + '(', i)) >= 0) {
        let p = 0, j = i + nom.length;
        do {
            if (src[j] === '(') p++; else if (src[j] === ')') p--;
            j++;
        } while (p > 0 && j < src.length);
        out.push(src.slice(i, j));
        i = j;
    }
    return out;
}

/** Ce module peut-il produire une QUESTION ratée — fausse, et pas `partiel` ? */
function peutRaterUneQuestion(f) {
    if (!f || !existsSync(chemin(f))) return null;
    const s = lire(f);
    // Le moteur de questions juge chaque item : il rate par construction.
    if (/itemSession/.test(s)) return true;
    const faux = [...appels(s, 'onWrongAnswer'), ...appels(s, 'onGameAction')]
        .concat(appels(s, 'recordAttempt').filter(a => /correct:\s*false/.test(a)));
    return faux.some(a => !/partiel:\s*true/.test(a));
}

const MODULES = modulesDesActivites();

test('CHAQUE ACTIVITÉ DU CATALOGUE A UN MODULE QU\'ON SAIT RETROUVER', () => {
    // Sans quoi la mesure ci-dessous se tairait sur ceux qu'elle ne trouve pas,
    // et un silence se lit comme un « tout va bien ».
    const perdus = exercices
        .filter(e => !e.generatorId)
        .filter(e => peutRaterUneQuestion(MODULES.get(e.activityId)) === null)
        .map(e => `${e.id} (${e.activityId})`);
    assert.deepEqual(perdus, []);
});

test('LA DÉCLARATION CORRESPOND À CE QUE FONT LES MODULES', () => {
    const ecarts = [];
    for (const e of exercices) {
        if (e.generatorId) {
            assert.ok(estNotable(e), `${e.id} a un générateur : il note forcément`);
            continue;
        }
        const codePeut = peutRaterUneQuestion(MODULES.get(e.activityId));
        const declare = estNotable(e);
        // Les trois jeux de plateau notent selon leur réglage : leur module
        // SAIT rater (mode « mat en deux »), mais le catalogue les règle sur
        // « partie contre l'ordinateur ». L'écart est voulu, et il se vérifie
        // à part, dans le test suivant.
        if (['othello', 'dames', 'echecs'].includes(e.activityId)) continue;
        if (codePeut !== declare) ecarts.push(`${e.id} : code ${codePeut}, déclaré ${declare}`);
    }
    assert.deepEqual(ecarts, [],
        'la liste SANS_NOTE de core/activities/index.js a dérivé — remesure-la '
        + '(tools/tmp/notable3.mjs) avant de la corriger');
});

test('COMBIEN, EXACTEMENT', () => {
    // Ce chiffre n'est pas une règle, c'est un repère : s'il bouge beaucoup
    // sans qu'on l'ait voulu, c'est qu'un jeu entier a cessé de dire juste ou
    // faux — et ça, on veut le savoir.
    const sans = exercices.filter(e => !estNotable(e));
    assert.equal(sans.length, 31, `${sans.length} exercices sans note : ${sans.map(e => e.id).join(', ')}`);
    assert.ok(sans.some(e => e.id === 'geo-quadrilateres'),
        'l\'organigramme de Rémy est bien du lot — c\'est de lui qu\'on est parti');
});

test('LES TROIS JEUX DE PLATEAU NOTENT SELON LEUR RÉGLAGE', () => {
    // Un coup faux dans « mat en deux » est un coup faux, et le module le
    // remonte comme tel. Dans une partie, il n'y a pas de bonne réponse : il y
    // a un vainqueur. C'est le même exercice, et le professeur tranche.
    for (const id of ['logi-echecs', 'logi-dames', 'logi-othello']) {
        assert.equal(estNotable(id), false, `${id} : une partie ne se note pas`);
        assert.equal(estNotable(id, { mode: 'exercice' }), true,
            `${id} : « mat en un, mat en deux » se note`);
        assert.equal(estNotable(id, { mode: 'deux' }), false);
    }
});

test('LES RÉGLAGES DE L\'ÉTAPE PASSENT AVANT CEUX DU CATALOGUE', () => {
    // C'est dans l'étape que le professeur a choisi ; le catalogue ne donne
    // que le défaut. Lire le catalogue seul, c'est ignorer son choix.
    const exo = exercices.find(e => e.id === 'logi-echecs');
    assert.equal(exo.params.mode, 'ia', 'le défaut du catalogue');
    assert.equal(estNotable(exo, { mode: 'exercice' }), true);
});

test('LE CONSTRUCTEUR PRÉVIENT, ET SEULEMENT QUAND LA SÉANCE NOTE', () => {
    // Vérifié au navigateur (`tools/tmp/sondeSansNote.mjs`) sur un parcours de
    // quatre étapes — organigramme, Flash Mult, Pousseur, Échecs :
    //   en entraînement : aucun avis, aucune marque ;
    //   en évaluation   : « 3 exercices ne comptent pas dans la note », et les
    //                     trois lignes portent « HORS NOTE ».
    // Ce test garde ce qui le permet ; la mise en page, elle, se remesure.
    const b = lire('js/ui/builder.js');
    assert.match(b, /const muets = isEvaluation\(policy\)/);
    assert.match(b, /const sansNote = isEvaluation\(policy\) && !estNotable\(exo, step\.overrides\);/);
    assert.match(b, /class="path-step-sansnote"/);
    // On PRÉVIENT, on n'interdit pas : aucun filtre ne doit retirer ces
    // exercices du catalogue ni du parcours.
    assert.ok(!/filter\([^)]*estNotable/.test(b),
        'un exercice hors note reste choisissable — c\'est un avis, pas une barrière');
});

test('UN EXERCICE SANS NOTE GARDE SON BILAN PAR COMPÉTENCE', () => {
    // C'est ce qui rend l'avis acceptable : on ne perd pas l'information, on
    // cesse seulement d'en tirer un chiffre sur 20. `grading.js` construit le
    // bilan par compétence sur TOUS les items, morceaux compris.
    const g = lire('js/core/grading.js');
    assert.match(g, /const bySkill = new Map\(\);\s*\n\s*for \(const it of tousLesItems\)/);
});
