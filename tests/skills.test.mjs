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

test('AUCUN exercice n\'est muet : compétence déclarée, ou hors progression assumé', async () => {
    // LA DETTE NE SE RECREUSE PAS.
    //
    // La règle précédente dispensait les jeux autonomes — « ce sont des
    // récompenses, ils n'ont pas à figurer au bilan ». La dispense était
    // muette : vingt et un exercices ne disaient rien de ce qu'ils
    // travaillaient, et six compétences du référentiel étaient devenues
    // injoignables sans que rien ne le signale.
    //
    // Deux réponses sont désormais acceptées, et il n'y en a pas de
    // troisième : soit l'exercice déclare au moins une compétence (par son
    // générateur ou en propre), soit il déclare `horsProgression: true` —
    // Othello, les Dames, les Échecs. Le silence, lui, est refusé : un
    // nouvel exercice ne peut plus entrer dans le catalogue sans dire ce
    // qu'il fait travailler.
    await import('../js/core/activities/index.js');
    const { exercices, skillsOf } = await import('../js/data/catalog.js');
    const muets = exercices
        .filter(e => !skillsOf(e).length && !e.horsProgression)
        .map(e => e.id);
    assert.deepEqual(muets, []);
});

test('« hors progression » et une compétence, il faut choisir', async () => {
    // Les deux à la fois n'a aucun sens : soit l'exercice travaille une
    // notion du programme, soit il est de la réserve. Le contraire laisserait
    // un jeu de plateau remonter dans la remédiation.
    const { exercices, skillsOf } = await import('../js/data/catalog.js');
    const deuxFois = exercices
        .filter(e => e.horsProgression && skillsOf(e).length)
        .map(e => e.id);
    assert.deepEqual(deuxFois, []);
});

test('une compétence déclarée par un exercice existe vraiment', async () => {
    // Le même piège que pour les générateurs, un étage plus bas : une
    // compétence mal orthographiée dans le catalogue ne casse rien de
    // visible, elle rend seulement l'exercice invisible au bilan et à la
    // remédiation. `skillsOf` résout par `matchSkills`, donc une liste vide
    // est la signature exacte de la faute de frappe.
    const { exercices, skillsOf } = await import('../js/data/catalog.js');
    const perdus = exercices
        .filter(e => Array.isArray(e.skills) && e.skills.length && !skillsOf(e).length)
        .map(e => `${e.id} → ${e.skills.join(', ')}`);
    assert.deepEqual(perdus, []);
});

test('AUCUNE COMPÉTENCE FANTÔME DANS LE CODE', async () => {
    // Rémy : « y a plus le jeu où on coupe les zéros ». En cherchant, j'ai
    // trouvé pire que ce qu'il signalait : le mode « zéros inutiles » du Ninja
    // rangeait ses résultats sous « num.decimaux.zeros » — au pluriel — quand
    // la compétence s'écrit « num.decimal.zeros ». Une lettre, et tout ce que
    // l'élève y réussissait partait dans le vide : ni maîtrise, ni carnet
    // d'erreurs, ni bilan, puisque la compétence n'existait pas.
    //
    // LE CATALOGUE ÉTAIT DÉJÀ PROTÉGÉ — un test vérifie les `skills` déclarés
    // par les exercices —, mais pas le CODE. Or c'est là que vivent les tables
    // de modes : celle du Ninja donne une compétence différente par règle, et
    // personne ne la relisait. On lit donc tous les fichiers.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const connues = new Set(Object.keys(SKILLS));

    const fichiers = [];
    (function marche(d) {
        for (const f of fs.readdirSync(d)) {
            const p = path.join(d, f);
            if (fs.statSync(p).isDirectory()) marche(p);
            else if (p.endsWith('.js')) fichiers.push(p);
        }
    }('js'));
    assert.ok(fichiers.length > 300, 'la marche dans js/ n\'a presque rien lu');

    const fantomes = [];
    fichiers.forEach(f => {
        const src = fs.readFileSync(f, 'utf8');
        const voir = (id) => { if (!connues.has(id)) fantomes.push(`${id} ← ${f}`); };
        // « skill: 'num.decimal.zeros' », « skillId: … », « concept: … »
        for (const m of src.matchAll(/(?:skillId|skill|concept)\s*:\s*'([a-z][a-z0-9.]*\.[a-z0-9.]+)'/g)) {
            voir(m[1]);
        }
        // « skills: ['a.b', 'c.d'] »
        for (const m of src.matchAll(/skills\s*:\s*\[([^\]]*)\]/g)) {
            for (const x of m[1].matchAll(/'([a-z][a-z0-9.]*\.[a-z0-9.]+)'/g)) voir(x[1]);
        }
    });
    assert.deepEqual([...new Set(fantomes)], [],
        'ces identifiants de compétence ne sont pas dans js/data/skills.js');
});
