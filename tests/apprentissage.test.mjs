import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices, paramSchemaOf, getExerciseById } from '../js/data/catalog.js';
import { aApprentissage, construireApprentissage } from '../js/core/apprentissage.js';
import { hydratePath } from '../js/core/path.js';
import { MODES } from '../js/core/policy.js';

const AVEC = exercices.filter(aApprentissage);

test('des exercices déclarent un mode apprentissage', () => {
    assert.ok(AVEC.length > 0, 'aucun exercice n\'a de mode apprentissage');
});

test('un palier ne règle que ce que son exercice sait régler', () => {
    // Une surcharge sur un paramètre inconnu est silencieuse : le générateur
    // reprend sa valeur par défaut, et le palier « facile » se joue en
    // difficile sans que rien ne le signale.
    for (const exo of AVEC) {
        for (const palier of exo.apprentissage.paliers) {
            const cible = getExerciseById(palier.exerciseId || exo.id);
            assert.ok(cible, `${exo.id} : palier vers un exercice inconnu « ${palier.exerciseId} »`);

            const connus = new Set(paramSchemaOf(cible).map(p => p.id));
            for (const cle of Object.keys(palier.overrides || {})) {
                assert.ok(connus.has(cle),
                    `${exo.id} / ${palier.titre} : « ${cle} » n'est pas un réglage de ${cible.id}`);
            }
        }
    }
});

test('une surcharge de palier propose une valeur que le réglage accepte', () => {
    for (const exo of AVEC) {
        for (const palier of exo.apprentissage.paliers) {
            const cible = getExerciseById(palier.exerciseId || exo.id);
            const schema = paramSchemaOf(cible);
            for (const [cle, valeur] of Object.entries(palier.overrides || {})) {
                const param = schema.find(p => p.id === cle);
                if (!param || !param.options) continue;
                const admis = param.options.map(o => (o && typeof o === 'object' ? o.value : o));
                const proposees = Array.isArray(valeur) ? valeur : [valeur];
                for (const v of proposees) {
                    assert.ok(admis.some(a => String(a) === String(v)),
                        `${exo.id} / ${palier.titre} : ${cle} = « ${v} » hors des valeurs proposées`);
                }
            }
        }
    }
});

test('le parcours construit est jouable, et c\'est un entraînement', () => {
    for (const exo of AVEC) {
        const plan = construireApprentissage(exo);
        assert.ok(plan, `${exo.id} : parcours non construit`);

        // Un apprentissage ne note pas et laisse plusieurs essais : être jugé
        // sur ce qu'on découvre n'a aucun sens.
        assert.equal(plan.path.policy.mode, MODES.ENTRAINEMENT, `${exo.id} : ce n'est pas un entraînement`);
        assert.equal(plan.path.policy.grading, null, `${exo.id} : un apprentissage ne se note pas`);
        assert.ok(plan.path.policy.hints, `${exo.id} : les aides doivent rester disponibles`);
        assert.ok(plan.path.policy.maxAttemptsPerItem > 1, `${exo.id} : il faut droit à l'erreur`);

        // Toutes les étapes doivent se résoudre dans le catalogue.
        const { steps, missing } = hydratePath(plan.path);
        assert.deepEqual(missing, [], `${exo.id} : étapes introuvables`);
        assert.equal(steps.length, exo.apprentissage.paliers.length);

        steps.forEach((s, i) => {
            assert.ok(s.nbItems > 0, `${exo.id} / étape ${i + 1} : aucune question`);
            assert.ok(s.threshold <= s.nbItems, `${exo.id} / étape ${i + 1} : seuil au-dessus du nombre de questions`);
            assert.ok(s.threshold >= 1, `${exo.id} / étape ${i + 1} : seuil nul`);
            assert.equal(s.title, exo.apprentissage.paliers[i].titre,
                `${exo.id} / étape ${i + 1} : le palier doit porter son nom`);
        });
    }
});

test('la leçon dit quelque chose avant de faire jouer', () => {
    for (const exo of AVEC) {
        const { lecon } = construireApprentissage(exo);
        assert.ok(lecon.regles.length > 0, `${exo.id} : aucune règle expliquée`);
        for (const r of lecon.regles) {
            assert.ok(r.titre, `${exo.id} : une règle sans titre`);
            assert.ok(r.texte, `${exo.id} : la règle « ${r.titre} » n'explique rien`);
        }
    }
});

test('les paliers montent, et laissent toujours droit à l\'erreur', () => {
    // Il n'existe pas de mesure universelle de la difficulté d'un réglage ; on
    // vérifie donc ce qui est vérifiable — la marche ne redescend pas, les
    // paliers portent des noms distincts, et aucun n'exige le sans-faute.
    for (const exo of AVEC) {
        const { steps } = hydratePath(construireApprentissage(exo).path);

        for (let i = 1; i < steps.length; i++) {
            assert.ok(steps[i].nbItems >= steps[i - 1].nbItems,
                `${exo.id} : le palier « ${steps[i].title} » pose moins de questions que le précédent`);
        }

        const noms = steps.map(s => s.title);
        assert.equal(new Set(noms).size, noms.length, `${exo.id} : deux paliers portent le même nom`);

        for (const s of steps) {
            if (s.nbItems > 1) {
                assert.ok(s.threshold <= s.nbItems - 1,
                    `${exo.id} / ${s.title} : le sans-faute est exigé (${s.threshold}/${s.nbItems})`);
            }
        }
    }
});
