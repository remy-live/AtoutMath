// LE PENDU MATHÉMATIQUE — 27 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J aimerai bien aussi un pendu mathématiques avec des mots
// mathématiques ».
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · LE MOT VIENT DU LEXIQUE COMMUN, avec SA définition. Un deuxième
//     vocabulaire qui dériverait du premier, ce serait deux endroits à
//     corriger quand un mot est mal défini — et deux jugements différents sur
//     le niveau d'un mot dans le même logiciel.
//   · LE MOT SE TAPE AU PAVÉ. Vingt-six touches, de A à Z : un mot à trait
//     d'union ou à accent serait INJOUABLE, et rien à l'écran ne le dirait —
//     l'élève chercherait la lettre manquante jusqu'à perdre.
//   · CHAQUE DÉCOR DIT OÙ L'ON EN EST. C'est sa seule fonction, et elle n'est
//     pas gratuite : écrite d'abord, la mèche de la fusée donnait cinq dessins
//     indiscernables sur sept. Vu sur la planche des décors, jamais dans un
//     chiffre.
//   · LA RÉPONSE ATTENDUE EST CELLE QUE L'ÉCRAN ENVOIE, comme partout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { LEXIQUE, motsDisponibles } from '../js/core/motsCaches.js';
import { DECORS, ERREURS_MAX, lettresDe, motVu } from '../js/core/generators/pendu.js';
import { decorSvg } from '../js/core/penduDecors.js';

const ID = 'logi-pendu';

function tirer(combien = 8, params = null) {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, `${ID} a disparu du catalogue`);
    const gen = getGenerator(exo.generatorId);
    assert.ok(gen, `${ID} : générateur non enregistré`);
    return Array.from({ length: combien }, (_, i) =>
        gen.generate(params || { ...(exo.params || {}) }, { rng: makeRng(ID + i), index: i }));
}

function reglages() {
    const exo = exercices.find(e => e.id === ID);
    const gen = getGenerator(exo.generatorId);
    let out = [{}];
    for (const p of gen.params || []) {
        if (p.type !== 'select' || !p.options) continue;
        const suivant = [];
        for (const base of out) for (const o of p.options) suivant.push({ ...base, [p.id]: o.value });
        out = suivant;
    }
    return out.map(c => ({ ...(exo.params || {}), ...c }));
}

test('LE PENDU EST AU CATALOGUE, AVEC SON ÉCRAN ET SON PAPIER', () => {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, 'le pendu a disparu du catalogue');
    assert.equal(exo.activityId, 'pendu');
    assert.ok(exo.printable, 'le pendu ne s\'imprime pas');
    assert.ok(exo.instruction && exo.instruction.length > 80,
        'pas d\'explication de la règle dans la fiche');
});

test('LE MOT VIENT DU LEXIQUE COMMUN, AVEC SA DÉFINITION', () => {
    // CE QUE CETTE GARDE EMPÊCHE : qu'un jour quelqu'un recopie trois mots
    // ici « pour dépanner ». Le lexique est partagé avec les Mots Cachés, les
    // Anagrammes et le Mot Codé ; une copie dérive, et deux exercices
    // finissent par ne plus dire la même chose du même mot.
    const parMot = new Map(LEXIQUE.map(e => [e.mot, e]));
    for (const r of reglages()) {
        for (const it of tirer(4, r)) {
            const entree = parMot.get(it.meta.mot);
            assert.ok(entree, `${it.meta.mot} n'est pas dans le lexique commun`);
            assert.equal(it.meta.definition, entree.def,
                `${it.meta.mot} : la définition ne vient pas du lexique`);
            assert.equal(it.meta.niveau, entree.niveau,
                `${it.meta.mot} : le niveau ne vient pas du lexique`);
        }
    }
});

test('ET TOUT MOT SERVI SE TAPE AVEC LES VINGT-SIX TOUCHES', () => {
    // UN MOT À ACCENT OU À TRAIT D'UNION SERAIT INJOUABLE, et rien à l'écran
    // ne le dirait : l'élève chercherait la lettre manquante jusqu'à perdre
    // ses six essais. On vérifie TOUT LE LEXIQUE, pas seulement les mots
    // tirés — le défaut arriverait par un mot ajouté demain.
    for (const e of LEXIQUE) {
        assert.match(e.mot, /^[A-Z]+$/,
            `« ${e.mot} » ne s'écrit pas avec les seules lettres du pavé`);
        assert.ok(e.def && e.def.length > 10, `« ${e.mot} » n'a pas de définition utile`);
    }
});

test('LE RÉGLAGE DU NIVEAU ET DU THÈME EST RESPECTÉ', () => {
    for (const niveau of ['1', '2', '3']) {
        for (const it of tirer(10, { theme: 'tout', niveau, indice: 'toujours',
            decor: 'bonhomme' })) {
            assert.ok(it.meta.niveau <= Number(niveau),
                `niveau ${niveau} : ${it.meta.mot} est de niveau ${it.meta.niveau}`);
        }
    }
    // ET CHAQUE THÈME A DE QUOI JOUER au niveau le plus bas : un thème vide
    // servirait un mot d'un autre thème sans le dire.
    const exo = exercices.find(e => e.id === ID);
    const gen = getGenerator(exo.generatorId);
    const themes = (gen.params.find(p => p.id === 'theme') || {}).options || [];
    for (const { value } of themes) {
        const n = motsDisponibles({ theme: value, niveauMax: 1 }).length;
        assert.ok(n >= 3, `le thème « ${value} » n'a que ${n} mot(s) en niveau 1`);
    }
});

test('LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    for (const it of tirer(8)) {
        // L'écran envoie le mot quand toutes ses lettres sont sorties.
        assert.equal(it.answer, it.meta.mot);
        assert.ok(evaluate(it, it.meta.mot).correct, 'le mot trouvé est compté faux');
        // Et ce qu'il envoie quand c'est perdu ne peut pas être le mot : il y
        // manque au moins une lettre.
        const perdu = motVu(it.meta.mot, it.meta.lettres.slice(0, -1));
        assert.notEqual(perdu, it.meta.mot, 'le mot perdu est identique au mot gagné');
        assert.ok(!evaluate(it, perdu).correct, 'une partie perdue est comptée juste');
    }
});

test('LES LETTRES ANNONCÉES SONT CELLES DU MOT, SANS DOUBLON', () => {
    // `lettres` décide de la victoire : toutes vues, c'est gagné. Un doublon
    // ou un oubli, et la partie ne se termine jamais — ou se termine trop tôt.
    for (const it of tirer(8)) {
        const { mot, lettres } = it.meta;
        assert.deepEqual([...lettres].sort(), [...new Set([...mot])].sort(),
            `${mot} : les lettres annoncées ne sont pas celles du mot`);
        assert.equal(motVu(mot, lettres), mot, 'toutes les lettres ne montrent pas le mot');
        assert.deepEqual(lettresDe(mot), lettres);
    }
});

test('CHAQUE DÉCOR DIT OÙ L\'ON EN EST, À CHAQUE ERREUR', () => {
    // LA GARDE QUI AURAIT ÉVITÉ UNE RELECTURE. La mèche de la fusée, écrite
    // d'abord comme une courbe qui raccourcit, donnait CINQ DESSINS
    // INDISCERNABLES de zéro à quatre erreurs. Un décor de pendu qui ne dit
    // pas où l'on en est ne sert à rien : c'est sa seule fonction.
    //
    // On ne juge pas la beauté — cela se regarde, et `tools/decorsDuPendu.mjs`
    // en fait la planche. On garde ce qui se mesure : deux états voisins ne se
    // ressemblent pas, et aucun état n'est vide.
    for (const decor of Object.keys(DECORS)) {
        const etats = Array.from({ length: ERREURS_MAX + 1 }, (_, n) => decorSvg(decor, n));
        etats.forEach((svg, n) => {
            const dedans = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
            assert.ok(dedans.length > 40,
                `${decor} à ${n} erreur(s) : le dessin est vide`);
        });
        for (let n = 1; n <= ERREURS_MAX; n++) {
            assert.notEqual(etats[n], etats[n - 1],
                `${decor} : ${n - 1} et ${n} erreurs donnent le même dessin`);
        }
        // ET TOUS LES ÉTATS SONT DEUX À DEUX DIFFÉRENTS : deux états éloignés
        // qui se ressemblent, c'est un élève qui croit avoir reculé.
        assert.equal(new Set(etats).size, etats.length,
            `${decor} : deux états différents donnent le même dessin`);
    }
});

test('ET LE DÉCOR SERVI EST BIEN CELUI DU RÉGLAGE', () => {
    for (const decor of Object.keys(DECORS)) {
        for (const it of tirer(2, { theme: 'tout', niveau: '1', indice: 'toujours', decor })) {
            assert.equal(it.meta.decor, decor);
        }
    }
});

test('ET LE RÉGLAGE LE PLUS FACILE EST BIEN CELUI PAR DÉFAUT', () => {
    // Sa consigne du 26, qui vaut pour tout ce qui s'ajoute : un élève qui
    // ouvre un jeu neuf doit le RÉUSSIR la première fois.
    const exo = exercices.find(e => e.id === ID);
    assert.equal(exo.params.niveau, '1', 'le pendu n\'ouvre pas sur les mots de sixième');
    assert.equal(exo.params.indice, 'toujours',
        'le pendu ouvre sans la définition — ce n\'est plus un exercice de mathématiques');
    assert.equal(exo.params.theme, 'tout');
});

test('ET LE PENDU SE FABRIQUE SANS SE FAIRE ATTENDRE', () => {
    const t = performance.now();
    for (const r of reglages()) tirer(12, r);
    const dt = Math.round(performance.now() - t);
    assert.ok(dt < 3000, `${dt} ms pour tous les réglages`);
});
