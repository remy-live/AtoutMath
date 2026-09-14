// Ranger le catalogue par domaine ou par chapitre.
//
// Le classement est passé explicitement à chaque appel : aucun test ne touche
// au stockage du navigateur, et l'on éprouve donc les deux rangements sans
// dépendre de ce qu'un poste aurait retenu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { TAGS } from '../js/data/tags.js';
import { cheminsDe, sousLeDossier, RANGEMENTS, HORS_CHAPITRE } from '../js/core/rangement.js';

const exo = (id) => exercices.find(e => e.id === id);
const parChapitre = (e, cl = {}) => cheminsDe(e, RANGEMENTS.CHAPITRE, cl);

test('rangé par domaine, un exercice garde le chemin du catalogue', () => {
    const pizza = exo('frac-pizza');
    assert.deepEqual(cheminsDe(pizza, RANGEMENTS.DOMAINE), [pizza.tags.chemin]);
});

test('rangé par chapitre, le chemin devient « niveau › chapitre »', () => {
    const chemins = parChapitre(exo('frac-pizza'));
    assert.ok(chemins.length >= 1);
    chemins.forEach(ch => {
        assert.equal(ch.length, 2, 'deux étages, comme le rangement par domaine');
        assert.ok(Object.values(TAGS.NIVEAU).includes(ch[0]), `niveau inconnu : ${ch[0]}`);
    });
    assert.ok(chemins.some(ch => ch[0] === TAGS.NIVEAU.SIXIEME && ch[1] === 'Fractions'));
});

test('UN EXERCICE PEUT ÊTRE DANS DEUX DOSSIERS À LA FOIS', () => {
    // C'est tout l'intérêt du classement par chapitre, et ce qu'un arbre à
    // chemin unique interdisait. On le vérifie sur un cas construit à la main
    // pour ne pas dépendre du classement livré.
    const cible = exercices.find(e =>
        (e.tags.niveaux || []).includes(TAGS.NIVEAU.SIXIEME) && !e.horsProgression);
    const classement = {
        [cible.id]: { '6-fractions': true, '6-ordre': true }
    };
    const noms = parChapitre(cible, classement)
        .filter(ch => ch[0] === TAGS.NIVEAU.SIXIEME).map(ch => ch[1]);
    assert.ok(noms.includes('Fractions'), noms.join(', '));
    assert.ok(noms.includes('Ordre'), noms.join(', '));
});

test('un chapitre d\'un autre niveau ne s\'affiche pas sous l\'exercice', () => {
    // Le classement propose large ; c'est l'étiquette de niveau qui tranche.
    // Sans cela, un exercice de 6ᵉ apparaîtrait dans la progression de 4ᵉ.
    const sixieme = exercices.find(e =>
        (e.tags.niveaux || []).length === 1
        && e.tags.niveaux[0] === TAGS.NIVEAU.SIXIEME);
    if (!sixieme) return;                       // catalogue sans exercice mono-niveau
    const classement = { [sixieme.id]: { '4-fractions': true } };
    assert.ok(parChapitre(sixieme, classement).every(ch => ch[0] !== TAGS.NIVEAU.QUATRIEME));
});

test('ce qui n\'est rangé nulle part tombe dans un dossier QUI SE VOIT', () => {
    // Un exercice invisible ne se corrige jamais : on ne le cache pas, on le
    // met dans une corbeille à trier, sous chacun de ses niveaux.
    const jeu = exo('logi-echecs');
    const chemins = parChapitre(jeu);
    assert.ok(chemins.length);
    chemins.forEach(ch => assert.equal(ch[1], HORS_CHAPITRE));
    (jeu.tags.niveaux || []).forEach(n =>
        assert.ok(chemins.some(ch => ch[0] === n), `niveau oublié : ${n}`));
});

test('aucun exercice ne se retrouve sans chemin, quel que soit le rangement', () => {
    // Un chemin vide ferait disparaître l'exercice de l'arbre sans que rien
    // ne le signale.
    for (const e of exercices) {
        for (const mode of [RANGEMENTS.DOMAINE, RANGEMENTS.CHAPITRE]) {
            const chemins = cheminsDe(e, mode, {});
            assert.ok(chemins.length, `${e.id} : aucun chemin en mode ${mode}`);
            chemins.forEach(ch => assert.ok(ch.length, `${e.id} : chemin vide en mode ${mode}`));
        }
    }
});

test('le même dossier ne sort jamais deux fois pour un même exercice', () => {
    // Deux chapitres homonymes sur deux niveaux existent (« Fractions » en 6ᵉ
    // et en 5ᵉ) : c'est le couple niveau + nom qui doit être unique.
    for (const e of exercices) {
        const clefs = parChapitre(e).map(ch => ch.join(' > '));
        assert.equal(new Set(clefs).size, clefs.length, `${e.id} : dossier répété`);
    }
});

test('appartenir à un dossier, c\'est y passer par au moins un chemin', () => {
    const cible = exercices.find(e => (e.tags.niveaux || []).includes(TAGS.NIVEAU.SIXIEME));
    const classement = { [cible.id]: { '6-ordre': true } };
    assert.ok(sousLeDossier(cible, [TAGS.NIVEAU.SIXIEME], RANGEMENTS.CHAPITRE, classement));
    assert.ok(sousLeDossier(cible, [TAGS.NIVEAU.SIXIEME, 'Ordre'], RANGEMENTS.CHAPITRE, classement));
    assert.ok(sousLeDossier(cible, [], RANGEMENTS.CHAPITRE, classement), 'la racine contient tout');
    assert.ok(!sousLeDossier(cible, ['Niveau inventé'], RANGEMENTS.CHAPITRE, classement));
});
