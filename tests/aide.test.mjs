import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    aideAuRang, reduireChoix, modeDe, affine, MODES, DEBUT_FACILE,
    ECHELONS, etatDepart, apresReponse, echelonDe, aideSelonEtat
} from '../js/core/aide.js';
import { finalizeChoices } from '../js/core/items.js';
import { makeRng } from '../js/core/ids.js';

// --- L'escalier --------------------------------------------------------------

test('le mode progressif monte : 2 propositions, puis 4, puis le clavier', () => {
    const p = { aide: 'progressive' };
    const marche = (r) => aideAuRang(p, r, 12);

    // Les TROIS premières, quelle que soit la longueur : deux propositions.
    for (const r of [1, 2, 3]) {
        assert.equal(marche(r).propositions, 2, `question ${r}`);
        assert.equal(marche(r).clavier, false, `question ${r}`);
    }
    // Ensuite quatre, tant qu'on choisit.
    for (const r of [4, 5, 6, 7, 8, 9]) {
        assert.equal(marche(r).propositions, 4, `question ${r}`);
        assert.equal(marche(r).clavier, false, `question ${r}`);
    }
    // Dernier quart (au-delà de 9 sur 12) : on tape.
    for (const r of [10, 11, 12]) assert.equal(marche(r).clavier, true, `question ${r}`);
});

test('l\'escalier tient sur un exercice court comme sur un long', () => {
    // Trois questions : la marche facile ne peut pas tenir tout l'exercice —
    // on garde deux propositions puis on finit au clavier, sans le palier à
    // quatre. Un exercice de trois questions est un test rapide, pas une
    // progression ; lui imposer les trois marches ne laisserait rien à chacune.
    assert.equal(aideAuRang({ aide: 'progressive' }, 1, 3).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 2, 3).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 3, 3).clavier, true);
    // Neuf questions : les trois marches y tiennent.
    assert.equal(aideAuRang({ aide: 'progressive' }, 3, 9).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 4, 9).propositions, 4);
    assert.equal(aideAuRang({ aide: 'progressive' }, 8, 9).clavier, true);
    // Vingt questions : trois faciles, pas sept. C'est le point de Rémy —
    // « pour une addition je peux très bien proposer 20 questions », et un
    // tiers de vingt ferait sept vrai/faux d'affilée.
    assert.equal(aideAuRang({ aide: 'progressive' }, 3, 20).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 4, 20).propositions, 4);
    assert.equal(DEBUT_FACILE, 3);
    // Cinquante questions : toujours trois, la marche ne s'étire pas.
    assert.equal(aideAuRang({ aide: 'progressive' }, 3, 50).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 4, 50).propositions, 4);
    assert.equal(aideAuRang({ aide: 'progressive' }, 39, 50).clavier, true);
    assert.equal(aideAuRang({ aide: 'progressive' }, 38, 50).clavier, false);
});

test('les autres modes ne bougent pas d\'un bout à l\'autre', () => {
    for (const r of [1, 5, 10]) {
        assert.deepEqual(aideAuRang({ aide: 'propositions' }, r, 10),
            { propositions: 4, clavier: false }, `propositions, question ${r}`);
        assert.deepEqual(aideAuRang({ aide: 'deux' }, r, 10),
            { propositions: 2, clavier: false }, `deux, question ${r}`);
        assert.equal(aideAuRang({ aide: 'clavier' }, r, 10).clavier, true, `clavier, question ${r}`);
        assert.equal(aideAuRang({ aide: 'toutes' }, r, 10).propositions, null, `toutes, question ${r}`);
    }
});

test('sans réglage, c\'est le mode progressif — et un mode inconnu n\'est pas une panne', () => {
    assert.equal(modeDe({}), 'progressive');
    assert.equal(modeDe({ aide: 'nimportequoi' }), 'progressive');
    assert.equal(aideAuRang({}, 1, 10).propositions, 2);
});

// --- Le réglage fin l'emporte, et se voit ------------------------------------

test('le professeur qui affine écrase le préréglage, sans casser le reste', () => {
    // Six propositions du début à la fin, mais on garde le passage au clavier
    // du mode progressif.
    const p = { aide: 'progressive', propositions: 6 };
    assert.equal(aideAuRang(p, 1, 12).propositions, 6);
    assert.equal(aideAuRang(p, 9, 12).propositions, 6);
    assert.equal(aideAuRang(p, 12, 12).clavier, true);

    // Et l'inverse : l'escalier des propositions, mais jamais de clavier.
    const q = { aide: 'progressive', saisie: 'jamais' };
    assert.equal(aideAuRang(q, 1, 12).propositions, 2);
    assert.equal(aideAuRang(q, 12, 12).clavier, false);
});

test('« affiné » se sait, pour que l\'interface puisse le dire', () => {
    assert.equal(affine({ aide: 'progressive' }), false);
    assert.equal(affine({ aide: 'progressive', propositions: 'auto', saisie: 'auto' }), false);
    assert.equal(affine({ aide: 'progressive', propositions: 6 }), true);
    assert.equal(affine({ saisie: 'moitie' }), true);
});

// --- La troncature garde ce qui explique -------------------------------------

test('réduire à deux garde la bonne réponse et le distracteur le plus instructif', () => {
    const rng = makeRng(7);
    const choix = finalizeChoices(rng, [
        { value: 12, correct: true },
        { value: 20, why: 'Tu as additionné.' },      // rang 0 : l'erreur du chapitre
        { value: 11, why: 'Un de moins.' },           // rang 1
        { value: 13, why: 'Un de plus.' }             // rang 2
    ], { count: 4 });
    assert.equal(choix.length, 4);

    const deux = reduireChoix(choix, 2);
    assert.equal(deux.length, 2);
    assert.ok(deux.some(c => c.correct), 'la bonne réponse a disparu');
    assert.equal(deux.find(c => !c.correct).value, 20,
        'ce n\'est pas le distracteur qui portait l\'explication');
});

test('la troncature ne rejoue pas le mélange : la bonne réponse garde sa place', () => {
    // Sans quoi elle finirait au même endroit à chaque question — et un élève
    // qui repère la place n'a plus rien à chercher.
    const positions = new Set();
    for (let s = 0; s < 40; s++) {
        const rng = makeRng(s);
        const choix = finalizeChoices(rng, [
            { value: 12, correct: true }, { value: 20 }, { value: 11 }, { value: 13 }
        ], { count: 4 });
        const deux = reduireChoix(choix, 2);
        // L'ordre relatif des survivants est celui du mélange.
        const avant = choix.filter(c => deux.includes(c));
        assert.deepEqual(deux, avant, 'l\'ordre affiché a été retouché');
        positions.add(deux.findIndex(c => c.correct));
    }
    assert.deepEqual([...positions].sort(), [0, 1], 'la bonne réponse tombe toujours du même côté');
});

test('réduire ne fait rien quand il n\'y a rien à réduire', () => {
    const trois = [{ value: 1, correct: true }, { value: 2, rang: 0 }, { value: 3, rang: 1 }];
    assert.equal(reduireChoix(trois, 4).length, 3);
    assert.equal(reduireChoix(trois, null).length, 3);
    assert.equal(reduireChoix([], 2).length, 0);
    assert.equal(reduireChoix(undefined, 2).length, 0);
    // Une liste sans bonne réponse est une anomalie ailleurs : on n'y touche pas.
    const sansBonne = [{ value: 1 }, { value: 2 }, { value: 3 }];
    assert.equal(reduireChoix(sansBonne, 2).length, 3);
});

test('les bouche-trous partent avant les distracteurs écrits à la main', () => {
    // `filler` complète la liste quand l'auteur n'en a pas fourni assez : ces
    // propositions-là ne portent aucune explication, ce sont elles qu'on retire.
    const rng = makeRng(3);
    const choix = finalizeChoices(rng, [
        { value: 50, correct: true },
        { value: 45, why: 'La retenue oubliée.' }
    ], { count: 4, filler: r => 50 + r.int(2, 20) });
    assert.equal(choix.length, 4);
    const trois = reduireChoix(choix, 3);
    assert.ok(trois.some(c => c.value === 45), 'le distracteur expliqué a été jeté');
});

test('tous les modes déclarés sont utilisables', () => {
    for (const nom of Object.keys(MODES)) {
        const r = aideAuRang({ aide: nom }, 1, 10);
        assert.ok(r.propositions === null || r.propositions >= 2, `${nom} : propositions invalides`);
        assert.equal(typeof r.clavier, 'boolean', `${nom} : clavier n'est pas un booléen`);
    }
});

// --- L'escalier qui suit l'élève ---------------------------------------------

test('trois preuves pour quitter la marche du bas, deux ensuite', () => {
    const juste = { reussi: true };
    let e = etatDepart();
    assert.equal(echelonDe(e).propositions, 2);

    // Deux réussites ne suffisent pas : au hasard, deux bonnes réponses sur
    // deux propositions arrivent une fois sur quatre.
    e = apresReponse(e, juste); e = apresReponse(e, juste);
    assert.equal(echelonDe(e).propositions, 2, 'monté au bout de deux');
    e = apresReponse(e, juste);
    assert.equal(echelonDe(e).propositions, 4, 'pas monté au bout de trois');
    assert.equal(e.vient, 'monte');

    // Deux suffisent maintenant.
    e = apresReponse(e, juste); e = apresReponse(e, juste);
    assert.equal(echelonDe(e).clavier, true, 'le clavier n\'arrive pas');

    // Et on ne monte pas plus haut que le clavier.
    for (let i = 0; i < 5; i++) e = apresReponse(e, juste);
    assert.equal(echelonDe(e).clavier, true);
    assert.equal(e.echelon, ECHELONS.length - 1);
});

test('une réussite au deuxième essai, ou avec un indice, ne prouve rien — et ne punit rien', () => {
    let e = etatDepart();
    e = apresReponse(e, { reussi: true });
    e = apresReponse(e, { reussi: true });
    // Troisième bonne réponse, mais au deuxième essai : le compteur repart,
    // et l'élève NE descend PAS pour autant.
    e = apresReponse(e, { reussi: true, duPremierCoup: false });
    assert.equal(e.echelon, 0);
    assert.equal(e.preuves, 0);
    assert.equal(e.rates, 0);
    // Idem avec un indice.
    let f = apresReponse(apresReponse(etatDepart(), { reussi: true }),
        { reussi: true, avecIndice: true });
    assert.equal(f.preuves, 0);
    assert.equal(f.rates, 0);
});

test('deux ratés d\'affilée rendent la marche précédente', () => {
    // Un élève monté au clavier bute : reconnaître 42 et produire 42 sont deux
    // choses différentes, et il doit pouvoir récupérer le filet.
    let e = { echelon: 2, preuves: 0, rates: 0 };
    e = apresReponse(e, { reussi: false });
    assert.equal(e.echelon, 2, 'descendu dès le premier raté');
    e = apresReponse(e, { reussi: false });
    assert.equal(e.echelon, 1, 'pas descendu au deuxième raté');
    assert.equal(e.vient, 'descendu');

    // Un raté isolé entre deux réussites ne fait pas descendre.
    let f = { echelon: 2, preuves: 0, rates: 0 };
    f = apresReponse(f, { reussi: false });
    f = apresReponse(f, { reussi: true });
    f = apresReponse(f, { reussi: false });
    assert.equal(f.echelon, 2, 'un raté isolé fait descendre');
});

test('on ne descend jamais sous les deux propositions', () => {
    let e = etatDepart();
    for (let i = 0; i < 8; i++) e = apresReponse(e, { reussi: false });
    assert.equal(e.echelon, 0);
    assert.equal(echelonDe(e).propositions, 2);
});

test('un état absent ou abîmé repart du bas sans planter', () => {
    assert.equal(echelonDe(undefined).propositions, 2);
    assert.equal(echelonDe({}).propositions, 2);
    assert.equal(echelonDe({ echelon: 99 }).clavier, true);
    assert.equal(echelonDe({ echelon: -3 }).propositions, 2);
    assert.equal(apresReponse(null, { reussi: true }).echelon, 0);
});

// --- L'adaptation ne joue que là où on l'a demandée ---------------------------

test('un réglage posé par le professeur l\'emporte sur le parcours de l\'élève', () => {
    const monte = { echelon: 2, preuves: 0, rates: 0 };
    // « Toujours 4 propositions » : quoi qu'ait fait l'élève.
    assert.deepEqual(aideSelonEtat({ aide: 'propositions' }, monte, 5, 10),
        { propositions: 4, clavier: false });
    // Un réglage fin posé sous « Affiner… » gèle aussi l'escalier : le
    // professeur qui a écrit « 6 propositions » veut six propositions.
    assert.equal(aideSelonEtat({ aide: 'progressive', propositions: 6 }, monte, 5, 10).propositions, 6);
    // Sans état (première question, ou mode non adaptatif), on retombe sur le
    // calendrier — donc jamais d'écran vide.
    assert.deepEqual(aideSelonEtat({ aide: 'progressive' }, null, 1, 10),
        aideAuRang({ aide: 'progressive' }, 1, 10));
});

test('en progressif, c\'est bien le parcours qui décide', () => {
    const params = { aide: 'progressive' };
    // Question 1, mais l'élève a déjà tout prouvé : il tape.
    assert.equal(aideSelonEtat(params, { echelon: 2, preuves: 0, rates: 0 }, 1, 20).clavier, true);
    // Question 19 sur 20, mais l'élève bloque : il garde ses deux propositions,
    // là où le calendrier l'aurait mis au clavier depuis longtemps.
    assert.equal(aideSelonEtat(params, etatDepart(), 19, 20).propositions, 2);
    assert.equal(aideAuRang(params, 19, 20).clavier, true);
});

test('en évaluation, l\'aide suit le calendrier et non l\'élève', () => {
    // Noter une classe où l'un a répondu parmi deux propositions et l'autre au
    // clavier ne compare plus rien. Le mécanisme est le même — passer `null`
    // en guise d'état — et c'est `choice.js` qui le décide sur la politique.
    const params = { aide: 'progressive' };
    const monte = { echelon: 2, preuves: 0, rates: 0 };
    assert.deepEqual(aideSelonEtat(params, null, 2, 20), aideAuRang(params, 2, 20));
    assert.notDeepEqual(aideSelonEtat(params, monte, 2, 20), aideAuRang(params, 2, 20));
});

// --- Le nombre de questions doit suffire aux marches -------------------------

test('une progression déclare de quoi la parcourir en entier', async () => {
    await import('../js/core/activities/index.js');
    const { getGenerator } = await import('../js/core/registry.js');
    const { questionsConseillees, QUESTIONS_PAR_DEFAUT } = await import('../js/core/duree.js');

    // Le défaut de dix tronquait toutes les progressions. Chacune dit
    // maintenant ce qu'il lui faut, et ce nombre doit couvrir ses marches.
    const attendus = [
        ['num.relatifs', { niveau: 'progressif' }, 12],
        ['mes.horloge', { niveau: 'progressif' }, 12],
        ['num.relatifs.addition', { etape: 'progressif' }, 24],
        ['geo.pythagore', { niveau: 'progressif' }, 12]
    ];
    for (const [id, params, n] of attendus) {
        assert.equal(questionsConseillees(getGenerator(id), params), n, id);
    }

    // Hors progression, on retombe sur le nombre ordinaire : un exercice de
    // calcul mental n'a aucune raison d'être plus long.
    assert.equal(questionsConseillees(getGenerator('calc.addition'), {}), QUESTIONS_PAR_DEFAUT);
    assert.equal(questionsConseillees(getGenerator('num.relatifs'), { niveau: 'thermometre' }),
        QUESTIONS_PAR_DEFAUT);
    // Un générateur sans conseil, ou absent, ne fait pas tomber le panneau.
    assert.equal(questionsConseillees(null, {}), QUESTIONS_PAR_DEFAUT);
});

test('le conseil couvre toujours l\'escalier de l\'aide', async () => {
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const { questionsConseillees, MINIMUM_ESCALIER, MAX_QUESTIONS } = await import('../js/core/duree.js');
    // Trois preuves, puis deux, puis au moins deux questions au clavier : en
    // dessous, on ne produit jamais rien soi-même — ce qui était le but.
    for (const g of allGenerators()) {
        const n = questionsConseillees(g, {});
        assert.ok(n >= MINIMUM_ESCALIER, `${g.id} : ${n} questions, trop court pour l'escalier`);
        assert.ok(n <= MAX_QUESTIONS, `${g.id} : ${n} questions, c'est une punition`);
    }
});

test('on sait dire combien de marches seront réellement vues', async () => {
    const { marchesVues } = await import('../js/core/duree.js');
    // Douze marches à deux questions : dix questions n'en montrent que cinq.
    // C'est le chiffre qu'il fallait pouvoir écrire.
    assert.equal(marchesVues(12, 2, 10), 5);
    assert.equal(marchesVues(12, 2, 24), 12);
    assert.equal(marchesVues(12, 2, 40), 12, 'plus de questions n\'invente pas de marches');
    assert.equal(marchesVues(6, 2, 12), 6);
    assert.equal(marchesVues(6, 2, 3), 2);
    assert.equal(marchesVues(1, 1, 1), 1);
});
