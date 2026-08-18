import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { SKILLS } from '../js/data/skills.js';
import { TAGS } from '../js/data/tags.js';

const IDS = Object.keys(SKILLS);

test('le référentiel n\'est pas vide et chaque compétence est complète', () => {
    assert.ok(IDS.length > 30, `seulement ${IDS.length} compétences`);
    for (const id of IDS) {
        const s = SKILLS[id];
        assert.ok(s.label && s.label.length > 3, `${id} : pas de libellé`);
        assert.ok(Array.isArray(s.chemin) && s.chemin.length >= 2, `${id} : chemin incomplet`);
        assert.ok(Array.isArray(s.niveaux) && s.niveaux.length, `${id} : aucun niveau`);
        assert.ok(Array.isArray(s.prereqs), `${id} : prereqs manquants`);
    }
});

test('AUCUN prérequis ne pointe dans le vide', () => {
    // Un prérequis qui n'existe pas casse silencieusement la remédiation : on
    // remonte vers une compétence introuvable, et l'élève en difficulté ne se
    // voit rien proposer. Rien à l'écran ne le signalerait — d'où ce test.
    const perdus = [];
    for (const id of IDS) {
        for (const p of SKILLS[id].prereqs) {
            if (!SKILLS[p]) perdus.push(`${id} → ${p}`);
        }
    }
    assert.deepEqual(perdus, [], 'prérequis introuvables');
});

test('aucune compétence n\'est son propre prérequis, ni ne boucle', () => {
    // Une boucle ferait tourner la remédiation à l'infini.
    const enCours = new Set(), fini = new Set();
    const cycles = [];
    const visiter = (id, chemin) => {
        if (fini.has(id)) return;
        if (enCours.has(id)) { cycles.push([...chemin, id].join(' → ')); return; }
        enCours.add(id);
        for (const p of SKILLS[id]?.prereqs || []) visiter(p, [...chemin, id]);
        enCours.delete(id);
        fini.add(id);
    };
    IDS.forEach(id => visiter(id, []));
    assert.deepEqual(cycles, [], 'cycles de prérequis');
});

test('les chemins n\'utilisent que des étiquettes déclarées', () => {
    // Un segment inventé crée un dossier fantôme dans le catalogue — c'est
    // exactement ce qui avait rangé l'Escadrille des Tables dans « undefined ».
    // Deux niveaux, et deux seulement : domaine puis sous-domaine. Le
    // troisième niveau (« Tables de Multiplication ») a été retiré — il
    // coupait le calcul mental en deux et l'on n'y retrouvait plus les tables.
    const connus = new Set([
        ...Object.values(TAGS.DOMAINE),
        ...Object.values(TAGS.SOUS_DOMAINE)
    ]);
    const inconnus = [];
    for (const id of IDS) {
        const chemin = SKILLS[id].chemin;
        if (chemin.length > 2) inconnus.push(`${id} : chemin à ${chemin.length} niveaux`);
        chemin.forEach(seg => {
            if (typeof seg !== 'string' || !connus.has(seg)) inconnus.push(`${id} : ${seg}`);
        });
    }
    assert.deepEqual(inconnus, []);
});

test('les niveaux sont ceux du référentiel', () => {
    const connus = new Set(Object.values(TAGS.NIVEAU));
    const faux = [];
    for (const id of IDS) {
        SKILLS[id].niveaux.forEach(n => { if (!connus.has(n)) faux.push(`${id} : ${n}`); });
    }
    assert.deepEqual(faux, []);
});

test('la famille des problèmes est complète et bien rangée', () => {
    const pb = IDS.filter(id => id.startsWith('num.probleme.'));
    assert.ok(pb.length >= 9, `seulement ${pb.length} compétences « problème »`);
    pb.forEach(id => {
        assert.equal(SKILLS[id].chemin[1], TAGS.SOUS_DOMAINE.PROBLEMES, `${id} mal rangé`);
        // Un rappel de cours qui se contente de deux lignes ne sert à rien sur
        // un type de problème : c'est là que l'élève a besoin de la méthode.
        assert.ok(SKILLS[id].lesson && SKILLS[id].lesson.length > 120,
            `${id} : la leçon doit dire la MÉTHODE, pas seulement nommer la notion`);
    });
});

// --- Ce qu'un générateur promet doit exister ---------------------------------

test('aucun générateur ne déclare une compétence absente du référentiel', async () => {
    // Une compétence mal nommée ne casse RIEN de visible : `matchSkills` rend
    // une liste vide, l'exercice se joue normalement, et il disparaît
    // seulement du bilan, de la remédiation et de « exercices pour cette
    // compétence ». C'est exactement le genre de panne qu'aucun écran ne
    // signale — trois générateurs avaient ainsi glissé (`num.vocabulaire`,
    // `geo.notation`, `geo.redaction.para-perp` : aucun de ces trois noms
    // n'a jamais existé).
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const orphelins = allGenerators()
        .filter(g => (g.skills || []).length && !g.resolvedSkills.length)
        .map(g => `${g.id} → ${g.skills.join(', ')}`);
    assert.deepEqual(orphelins, []);
});

test('chaque exercice généré est rattaché à au moins une compétence', async () => {
    // Les jeux autonomes en sont dispensés : ce sont des récompenses, ils
    // n'ont pas à figurer au bilan. Un exercice construit sur un générateur,
    // lui, n'a aucune raison de manquer.
    await import('../js/core/activities/index.js');
    const { exercices, skillsOf } = await import('../js/data/catalog.js');
    const sans = exercices.filter(e => e.generatorId && !skillsOf(e).length).map(e => e.id);
    assert.deepEqual(sans, []);
});
