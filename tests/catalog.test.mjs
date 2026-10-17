import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices, filterByStatus, statusOf, countByStatus, STATUS, exercisesForSkill, skillsOf } from '../js/data/catalog.js';

const ex = (id, status) => (status ? { id, status } : { id });
const LOT = [ex('a'), ex('b', STATUS.VALIDE), ex('c', STATUS.TEST), ex('d', STATUS.BROUILLON)];

test('un exercice sans statut déclaré est validé', () => {
    assert.equal(statusOf({ id: 'x' }), STATUS.VALIDE);
    assert.equal(statusOf({ id: 'x', status: STATUS.TEST }), STATUS.TEST);
});

test('un élève ne voit ni les brouillons ni les exercices en test', () => {
    const vus = filterByStatus(LOT, { teacher: false }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b']);
});

test('le professeur voit aussi les exercices en test, jamais les brouillons', () => {
    const vus = filterByStatus(LOT, { teacher: true }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b', 'c']);
});

test('un filtre explicite isole un seul état, brouillon compris', () => {
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.TEST }).map(e => e.id), ['c']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.BROUILLON }).map(e => e.id), ['d']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.VALIDE }).map(e => e.id), ['a', 'b']);
    assert.equal(filterByStatus(LOT, { only: 'tout' }).length, 2, '« tout » applique les règles de visibilité');
});

test('le comptage couvre l\'intégralité du catalogue', () => {
    const c = countByStatus(exercices);
    assert.equal(c.valide + c.test + c.brouillon, exercices.length);
    // Ce test exigeait autrefois « c.test > 0 ». Il gardait une vérité qui n'en
    // est plus une : Rémy a demandé d'ouvrir TOUS les exercices aux élèves
    // (« ouvre-les tous »), et le catalogue ne compte donc plus une seule
    // fiche en test. Le mécanisme, lui, est vérifié plus haut sur un lot
    // fabriqué — c'est là qu'il faut le vérifier, pas sur l'état du jour.
    assert.equal(c.test, 0, 'aucun exercice n\'est laissé en test');

    // ── ET LE BROUILLON SE NOMME, IL NE SE COMPTE PAS ──────────────────────
    //
    // Cette ligne exigeait zéro brouillon, ce qui était juste tant que personne
    // n'en avait demandé. Rémy en a demandé un, le 6 octobre : « désactive le
    // jardin ». Desserrer la règle en « au plus quelques-uns » aurait rendu
    // l'épreuve muette — un exercice oublié au brouillon serait reparti chez
    // les élèves sans que rien ne le dise, et c'est TOUT ce qu'elle garde.
    //
    // On NOMME donc les désactivations voulues. Une de plus fait tomber
    // l'épreuve, et celui qui la rallume doit écrire ici POURQUOI elle est là.
    const ETEINTS_EXPRES = ['voc-jardin'];
    const brouillons = exercices.filter(e => statusOf(e) === STATUS.BROUILLON)
        .map(e => e.id).sort();
    assert.deepEqual(brouillons, [...ETEINTS_EXPRES].sort(),
        'un exercice est au brouillon sans que personne l\'ait décidé — ou une '
        + 'désactivation voulue n\'est pas nommée ici');
});

test('aucun exercice ne porte un statut inconnu', () => {
    const connus = Object.values(STATUS);
    const fautifs = exercices.filter(e => e.status && !connus.includes(e.status));
    assert.deepEqual(fautifs.map(e => e.id), []);
});

test('chaque exercice est rangé dans un chemin entièrement nommé', () => {
    // Un segment `undefined` (constante TAGS mal orthographiée) crée un
    // dossier « undefined » dans le catalogue — c'est arrivé, un élève l'a vu.
    const fautifs = exercices.filter(e => {
        const c = e.tags && e.tags.chemin;
        return !Array.isArray(c) || c.length === 0
            || c.some(s => typeof s !== 'string' || !s.trim());
    });
    assert.deepEqual(fautifs.map(e => e.id), []);
});

// --- La fiche papier : une seule question, une seule réponse ------------------

test('un exercice qui déclare un générateur de fiche a bien une fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!exo.printGeneratorId) continue;
        const g = generateurDeFiche(exo);
        assert.ok(g, `${exo.id} : générateur de fiche « ${exo.printGeneratorId} » introuvable`);
        // Le bouton « travailler sur papier » se décide avec cette fonction :
        // sans elle, un exercice sans `generatorId` — parce qu'il n'existe qu'à
        // l'écran — n'aurait jamais proposé sa fiche.
        assert.ok(aUneFichePapier(exo), `${exo.id} : sa fiche ne serait pas proposée`);
    }
});

test('tout exercice imprimable sait produire des items pour sa fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!aUneFichePapier(exo)) continue;
        const g = generateurDeFiche(exo);
        if (!g) continue;                       // grille dessinée sans générateur propre
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 3; i++) {
            const item = g.generate(reglages, { rng: makeRng(`${exo.id}#${i}`), index: i });
            assert.ok(item && item.prompt, `${exo.id} : item sans énoncé`);
            assert.ok(item.answer !== undefined && item.answer !== null,
                `${exo.id} : item sans réponse — la page des solutions serait vide`);
        }
    }
});

test('un générateur qui écrit des fractions le déclare', async () => {
    // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. La barre oblique est une commodité
    // d'écran, et une feuille qui l'imprime enseigne le contraire du cours.
    // Le rendu sait empiler ; encore faut-il qu'il sache qu'il y a une
    // fraction, et c'est ce drapeau qui le lui dit.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || !g.ecrit || g.fractions) continue;
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 25; i++) {
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`fr_${exo.id}_${i}`), index: i }); }
            catch { break; }
            const texte = (it.prompt && (it.prompt.papier || it.prompt.text)) || '';
            // « 3/4 » entre deux chiffres : c'est une fraction, pas une date.
            if (/\d\s*\/\s*\d/.test(texte)) { fautifs.push(`${g.id} : « ${texte} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

// --- Ce qui est de l'écran ne va pas sur la feuille --------------------------

test('aucun réglage d\'écran n\'atteint le panneau d\'impression', async () => {
    // Un réglage se range dans l'une de deux familles. DU CONTENU — l'opération,
    // la taille des nombres, le niveau : il doit aller sur la fiche, sinon on
    // règle et rien ne change. DE L'ÉCRAN — le nombre de propositions, le
    // passage au clavier, la tolérance du rapporteur : sur une photocopie il
    // n'existe pas, et l'afficher donne un bouton sans effet.
    //
    // Le tri se lisait en creux — « seuls les réglages du générateur passent » —
    // ce qui marchait par accident. `papier: false` le dit, et ce test le tient.
    await import('../js/core/activities/index.js');
    const { allGenerators, allActivities } = await import('../js/core/registry.js');
    const ecran = [...allGenerators(), ...allActivities()]
        .flatMap(x => (x.params || []).map(p => ({ id: p.id, papier: p.papier, ou: x.id })))
        .filter(p => p.papier === false);

    // Ceux qu'on connaît doivent y être : un renommage ne doit pas les perdre
    // en silence.
    // « propositions » et « saisie » ont disparu — Rémy : « les sliders nombre
    // de propositions et passage au clavier n'ont pas d'intérêt ». Ils faisaient
    // globalement ce que la frise fait zone par zone, et y toucher éteignait
    // l'adaptatif sans le dire. « clavier » les remplace : la seule question que
    // la frise ne peut pas poser, parce qu'elle ne parle que du mode adaptatif.
    const attendus = ['aide', 'clavier', 'repartition', 'tolerance', 'reponse'];
    for (const id of attendus) {
        assert.ok(ecran.some(p => p.id === id),
            `« ${id} » n'est plus marqué comme réglage d'écran`);
    }

    // Et aucun d'eux ne doit ressortir du tri appliqué par la fiche.
    const surPapier = (p) => p && p.papier !== false;
    for (const p of ecran) assert.equal(surPapier(p), false, `${p.ou} · ${p.id}`);
});

// --- Un énoncé trop long n'est jamais lu -------------------------------------

test('AUCUNE CONSIGNE DE FEUILLE N\'EST UN PAVÉ', async () => {
    // Rémy : « pour l'énoncé des puissances de 10, tu as écrit tout cela […]
    // mets juste calcule. De manière générale, un énoncé trop long n'est jamais
    // lu. » Une consigne se lit debout, la pile de photocopies dans les mains ;
    // au-delà de deux lignes, l'élève saute par-dessus et fait ce qu'il croit.
    //
    // La limite est celle que la fiche d'un exercice seul s'impose déjà
    // (`premierePhrase` : rien au-delà de 120 caractères). Ce test la fait
    // valoir pour les consignes écrites À LA MAIN dans le catalogue, que cette
    // coupure ne traverse pas.
    const { exercices } = await import('../js/data/catalog.js');
    const longues = exercices
        .filter(e => (e.consignePapier || '').length > 200)
        .map(e => `${e.id} (${e.consignePapier.length} caractères)`);
    assert.deepEqual(longues, [], 'consignes trop longues : ' + longues.join(', '));
});

test('L\'INSTRUCTION DE L\'ÉCRAN NE PART JAMAIS ENTIÈRE SUR LE PAPIER', async () => {
    // C'était le vrai défaut : la fiche de PARCOURS recopiait `instruction`
    // faute de `consignePapier`, sans la couper — neuf cents caractères en tête
    // d'exercice. Les deux fiches passent maintenant par la même fonction.
    const { premierePhrase } = await import('../js/ui/printQuestions.js');
    const { exercices } = await import('../js/data/catalog.js');
    exercices.forEach(e => {
        const repli = premierePhrase(e.instruction || '');
        assert.ok(repli.length <= 120, `${e.id} : repli de ${repli.length} caractères`);
    });
    // Et le pavé des puissances rend bien la chaîne vide, pas son premier tiers.
    const puissances = exercices.find(e => e.id === 'num-puissances-reconnaitre');
    assert.equal(puissances.consignePapier, 'Calcule.', 'Rémy : « mets juste calcule »');
});

test('UN EXERCICE DÉSACTIVÉ N\'EST PROPOSÉ NI EN RÉVISION NI EN REMÉDIATION', () => {
    // LA PORTE DE DERRIÈRE. `exercisesForSkill` cherchait dans le catalogue NON
    // filtré, et ses deux seuls appelants sont côté ÉLÈVE : le plan de révision
    // (`ui/profileUI.js`) et la remédiation, qui compose la « séance
    // conseillée ». Un exercice que Rémy venait d\'éteindre pouvait donc lui
    // être proposé quand même — disparu du catalogue par la grande porte, et
    // revenu par celle-ci.
    //
    // TROUVÉ PAR UNE SONDE, PAS PAR UNE RELECTURE : six exercices paraissaient
    // sous le filtre « Non validé » là où le catalogue n\'en comptait qu\'un, et
    // les cinq autres venaient du plan de révision.
    //
    // ON ÉPROUVE LA RÈGLE, PAS LE CAS. Nommer le Jardin ici ferait une épreuve
    // qui ne garde plus rien le jour où on le rallume — or ce qu\'on garde vaut
    // pour tout exercice qu\'on éteindra ensuite.
    const eteints = exercices.filter(e => statusOf(e) === STATUS.BROUILLON);
    assert.ok(eteints.length > 0,
        'aucun exercice désactivé : cette épreuve ne mesure plus rien');

    for (const exo of eteints) {
        // LES COMPÉTENCES SE DÉDUISENT DU GÉNÉRATEUR, elles ne sont pas écrites
        // sur l\'exercice — ma première version lisait `exo.skills`, qui vaut
        // `undefined`, et la boucle ne tournait pas une seule fois. Une épreuve
        // qui n\'itère sur rien passe toujours.
        const competences = skillsOf(exo);
        assert.ok(competences.length > 0,
            `« ${exo.id} » ne déclare aucune compétence : l\'épreuve ne vérifierait rien`);
        for (const c of competences) {
            assert.ok(!exercisesForSkill(c).some(e => e.id === exo.id),
                `« ${exo.id} » est encore proposé pour « ${c} » : un élève peut le `
                + 'recevoir en révision alors qu\'il est désactivé');
        }
    }

    // ET LE TÉMOIN, SANS LEQUEL « ne rend plus rien » PASSERAIT : les exercices
    // OUVERTS qui travaillent les mêmes compétences sont bien rendus.
    const compétences = eteints.flatMap(skillsOf);
    const vivants = compétences.flatMap(c => exercisesForSkill(c));
    assert.ok(vivants.length > 0,
        'plus aucun exercice pour ces compétences : la fonction ne rend plus rien du tout');
});
