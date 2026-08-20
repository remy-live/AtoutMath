// LES TROIS EXERCICES DE FRACTIONS, vus depuis leurs générateurs.
//
// Le noyau est éprouvé ailleurs (fractionsEquivalentes.test.mjs). Ce qu'on
// vérifie ici, c'est ce que l'écran reçoit — et surtout les quatre consignes de
// Rémy, qu'aucune relecture ne rattraperait toute seule :
//
//   · la progression monte vraiment de marche en marche au fil de la série ;
//   · « pas besoin de simplifier dans un premier temps » — la réponse attendue
//     est le résultat BRUT, et le réglage ajoute la ligne quand on la veut ;
//   · « tu peux mélanger addition et soustraction, sans nombres relatifs » —
//     les deux signes sortent, et le résultat reste positif ;
//   · « du coup tu restes entre 2 et 10 dans un premier temps » — les
//     dénominateurs tiennent dans la table de Pythagore, qui sert d'aide.
//
// Plus une exigence qui n'a pas été demandée mais qui la suivait de près : les
// deux fractions de l'énoncé sont irréductibles. « 2/4 de la tarte » et l'élève
// simplifie d'abord, trouve un autre dénominateur commun, et il a raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    fracEgaliteGenerator, fracSommeProgressiveGenerator, fracProblemeGenerator
} from '../js/core/generators/fractionsEquivalentes.js';
import { NIVEAUX_SOMME, pgcd } from '../js/core/fractionsEquivalentes.js';
import { porteUneFraction } from '../js/core/fiche.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';

const tirer = (gen, params = {}, i = 0, index = 0) =>
    gen.generate(params, { rng: makeRng(`${gen.id}_${i}`), index });

// --- Compléter une égalité ---------------------------------------------------

test('l\'égalité pose une question dont la réponse EST le nombre manquant', () => {
    for (let i = 0; i < 60; i++) {
        const item = tirer(fracEgaliteGenerator, {}, i);
        const e = item.meta.egalite;
        assert.equal(item.answerKind, 'numeric');
        assert.equal(item.answer, e.reponse);
        assert.equal(item.skillId, 'num.frac.equivalentes');
        // Le trou est bien un trou : la réponse ne se lit nulle part dans
        // l'énoncé, ni en texte ni en HTML.
        const marque = item.prompt.text.split('=')[1];
        assert.ok(marque.includes('?'), `pas de trou dans « ${item.prompt.text} »`);
        assert.ok(item.hints.length >= 3);
        assert.ok(item.explanation.includes(String(e.facteur)));
    }
});

test('LA RÉPONSE NE FUITE PAS DANS L\'ÉNONCÉ', () => {
    // Un énoncé qui contient déjà le nombre à trouver se répond sans réfléchir.
    // Le cas dangereux : la réponse égale par hasard un nombre de l'énoncé.
    for (let i = 0; i < 120; i++) {
        const item = tirer(fracEgaliteGenerator, {}, `fuite${i}`);
        const e = item.meta.egalite;
        const cote = item.prompt.text.split('=')[1];
        const nombres = (cote.match(/\d+/g) || []).map(Number);
        assert.ok(!nombres.includes(e.reponse) || e.reponse === e.visible,
            `« ${item.prompt.text} » laisse voir ${e.reponse}`);
    }
});

test('l\'écriture « n/d » permet à la fiche de composer les colonnes', () => {
    // `fractions: true` ne suffit pas : la fiche ne met en colonnes que si elle
    // RECONNAÎT une fraction dans le texte. Rémy : « toujours des fractions en
    // colonnes ».
    assert.ok(fracEgaliteGenerator.fractions);
    assert.ok(fracSommeProgressiveGenerator.fractions);
    for (let i = 0; i < 20; i++) {
        assert.ok(porteUneFraction(tirer(fracEgaliteGenerator, {}, i).prompt.text));
        assert.ok(porteUneFraction(tirer(fracSommeProgressiveGenerator, {}, i).prompt.text));
    }
});

test('les réglages de l\'égalité passent jusqu\'à la question', () => {
    for (let i = 0; i < 20; i++) {
        const a = tirer(fracEgaliteGenerator, { sens: 'simplifier' }, `s${i}`);
        assert.equal(a.meta.egalite.sens, 'simplifier');
        const b = tirer(fracEgaliteGenerator, { trou: 'denominateur' }, `t${i}`);
        assert.equal(b.meta.egalite.trou, 'denominateur');
        const c = tirer(fracEgaliteGenerator, { maxBase: 4, maxFacteur: 5 }, `m${i}`);
        assert.ok(c.meta.egalite.facteur <= 5);
    }
});

// --- L'addition progressive --------------------------------------------------

test('LA SÉRIE MONTE VRAIMENT LES QUATRE MARCHES', () => {
    // « Il faut que ce soit progressif » : sur dix questions, on doit voir les
    // quatre marches, dans l'ordre, et finir sur celle du PPCM.
    const marches = [];
    for (let index = 0; index < 10; index++) {
        marches.push(tirer(fracSommeProgressiveGenerator, {}, index, index).meta.marche);
    }
    assert.deepEqual([...new Set(marches)], NIVEAUX_SOMME.map(n => n.id));
    assert.equal(marches[0], 'meme');
    assert.equal(marches[9], 'ppcm');
    // Jamais en arrière.
    const rang = (m) => NIVEAUX_SOMME.findIndex(n => n.id === m);
    marches.forEach((m, i) => { if (i) assert.ok(rang(m) >= rang(marches[i - 1])); });
});

test('une marche fixée ne bouge plus, même à la dixième question', () => {
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let index = 0; index < 10; index++) {
            const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, index, index);
            assert.equal(item.meta.marche, id);
        }
    });
});

test('PAS BESOIN DE SIMPLIFIER — la réponse attendue est le résultat brut', () => {
    // Rémy : « pas besoin de simplifier dans un premier temps ». Mettre au même
    // dénominateur est déjà tout l'exercice ; simplifier par-dessus fait rater
    // les deux. Le réglage ajoute la ligne quand on la veut.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracSommeProgressiveGenerator, {}, index, index % 10);
        const c = item.meta.calcul;
        assert.equal(item.answerKind, 'text');
        assert.equal(item.answer, `${c.brut.n}/${c.brut.d}`);
        assert.equal(c.brut.d, c.commun);
        assert.ok(item.explicationPapier.includes(`${c.a.n}/${c.a.d}`));
        assert.ok(!/bande/i.test(item.explicationPapier));
    }
    // Avec le réglage, la ligne de simplification s'ajoute — et seulement
    // quand il y a vraiment quelque chose à simplifier.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracSommeProgressiveGenerator, { simplifier: 'oui' }, `s${index}`, index % 10);
        const c = item.meta.calcul;
        assert.equal(item.answer, c.aSimplifiable
            ? `${c.reduit.n}/${c.reduit.d}` : `${c.brut.n}/${c.brut.d}`);
        if (c.simplifie) assert.equal(pgcd(c.reduit.n, c.reduit.d), 1);
    }
});

test('LES DEUX FRACTIONS DE L\'ÉNONCÉ SONT IRRÉDUCTIBLES', () => {
    // « 2/4 de la tarte » est une faute de goût qui devient une faute tout
    // court : l'élève simplifie d'abord, trouve un autre dénominateur commun
    // que celui qu'on attend, et il a raison.
    [fracSommeProgressiveGenerator, fracProblemeGenerator].forEach(gen => {
        for (let index = 0; index < 60; index++) {
            const c = tirer(gen, { operation: 'les-deux' }, `irr${index}`, index % 10).meta.calcul;
            assert.equal(pgcd(c.a.n, c.a.d), 1, `${c.a.n}/${c.a.d} se simplifie`);
            assert.equal(pgcd(c.b.n, c.b.d), 1, `${c.b.n}/${c.b.d} se simplifie`);
        }
    });
});

test('ADDITION ET SOUSTRACTION MÊLÉES, SANS JAMAIS DE NÉGATIF', () => {
    // « Tu peux mélanger addition et soustraction de fractions (sans nombres
    // relatifs). » Les deux opérations sortent, et le résultat reste positif.
    const signes = new Set();
    for (let index = 0; index < 80; index++) {
        const c = tirer(fracSommeProgressiveGenerator,
            { operation: 'les-deux' }, `op${index}`, index % 10).meta.calcul;
        signes.add(c.signe);
        assert.ok(c.brut.n > 0, `${c.aReduit.n} ${c.signe} ${c.bReduit.n} n'est pas positif`);
        if (c.signe === '+') assert.ok(c.brut.n < c.brut.d, 'une somme reste sous l\'unité');
    }
    assert.deepEqual([...signes].sort(), ['+', '−']);
    // Et l'on peut n'en demander qu'une.
    for (let i = 0; i < 20; i++) {
        assert.equal(tirer(fracSommeProgressiveGenerator, { operation: 'somme' }, `a${i}`).meta.calcul.signe, '+');
        assert.equal(tirer(fracSommeProgressiveGenerator, { operation: 'difference' }, `b${i}`).meta.calcul.signe, '−');
    }
});

test('LES DÉNOMINATEURS RESTENT DANS LA TABLE DE PYTHAGORE', () => {
    // L'aide est la table de Pythagore, et elle s'arrête à dix : un
    // dénominateur qui n'y figure pas rendrait l'aide muette au moment où elle
    // sert. Le réglage lui-même est plafonné.
    [fracSommeProgressiveGenerator, fracProblemeGenerator].forEach(gen => {
        const max = gen.params.find(p => p.id === 'maxDen');
        assert.equal(max.max, 10, `${gen.id} laisse dépasser dix`);
        for (let index = 0; index < 60; index++) {
            const c = tirer(gen, { maxDen: 20 }, `d${index}`, index % 10).meta.calcul;
            assert.ok(c.a.d <= 10 && c.b.d <= 10, `${c.a.d} et ${c.b.d} sortent de la table`);
            // Le PPCM aussi doit s'y lire : 9 × 10 = 90, la table va jusqu'à 100.
            assert.ok(c.commun <= 100);
        }
    });
});

test('UN PROBLÈME EST UNE PHRASE, DEUX FRACTIONS ET UNE QUESTION', () => {
    // « Des énoncés très simples » : la lecture ne doit pas devenir l'exercice.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracProblemeGenerator, {}, `pb${index}`, index % 10);
        const c = item.meta.calcul;
        assert.ok(item.meta.enonce, 'pas d\'énoncé');
        const nu = item.meta.enonce.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
        assert.ok(nu.length < 160, `énoncé trop long : ${nu}`);
        assert.ok(nu.trim().endsWith('?'), `l'énoncé ne pose pas de question : ${nu}`);
        // Les deux fractions de l'énoncé sont bien celles du calcul.
        assert.ok(item.meta.enonce.includes(`${c.a.n}/${c.a.d}`), nu);
        assert.ok(item.meta.enonce.includes(`${c.b.n}/${c.b.d}`), nu);
        // Une soustraction ne se raconte pas comme une addition.
        assert.ok(/reste|retire|coupe|abîme|arrière|passés|verse/i.test(nu) === (c.signe === '−')
            || c.signe === '+', nu);
    }
});

test('la difficulté annoncée suit la marche', () => {
    const vus = NIVEAUX_SOMME.map(({ id }) =>
        tirer(fracSommeProgressiveGenerator, { niveau: id }, id).difficulty);
    vus.forEach((d, i) => { if (i) assert.ok(d > vus[i - 1]); });
});

test('l\'aide de la marche ouvre la liste des indices', () => {
    NIVEAUX_SOMME.forEach(({ id, aide }) => {
        const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, `a${id}`);
        assert.equal(item.hints[0], aide);
        assert.ok(item.hints.length >= 3);
    });
});

// --- Le catalogue ------------------------------------------------------------

test('les trois exercices sont au catalogue et branchés sur leur écran', () => {
    const egal = exercices.find(e => e.id === 'frac-egalite');
    const somme = exercices.find(e => e.id === 'frac-somme-posee');
    const pb = exercices.find(e => e.id === 'frac-probleme');
    assert.ok(egal && somme && pb);
    assert.equal(egal.generatorId, 'frac.egalite');
    assert.equal(egal.activityId, 'fraction-egalite');
    assert.equal(somme.generatorId, 'frac.somme-progressive');
    assert.equal(somme.activityId, 'fraction-somme');
    assert.equal(pb.generatorId, 'frac.probleme');
    assert.equal(pb.activityId, 'fraction-somme');
    // « Pas besoin de simplifier dans un premier temps » : c'est le défaut.
    assert.equal(somme.params.simplifier, 'non');
    assert.equal(pb.params.simplifier, 'non');
    // Les compétences citées existent : sans cela l'exercice ne remonte dans
    // aucun bilan.
    [...fracEgaliteGenerator.skills, ...fracSommeProgressiveGenerator.skills,
        ...fracProblemeGenerator.skills]
        .forEach(s => assert.ok(SKILLS[s], `compétence inconnue : ${s}`));
});

test('LES RÉGLAGES PAR DÉFAUT GARDENT LA BANDE DESSINABLE', () => {
    // À 9 × 12, une bande de 81 parts n'est plus qu'un aplat gris : l'image
    // qui devait tout expliquer n'explique plus rien. Le catalogue part donc
    // plus bas que le générateur ne l'autorise.
    const egal = exercices.find(e => e.id === 'frac-egalite');
    for (let i = 0; i < 80; i++) {
        const item = tirer(fracEgaliteGenerator, egal.params, `def${i}`);
        const e = item.meta.egalite;
        const fin = Math.max(e.gauche.d, e.droite.d);
        const unites = Math.max(1, Math.ceil(e.gauche.n / e.gauche.d));
        assert.ok(fin * unites <= 120, `${fin} parts × ${unites} unités, illisible`);
    }
});
