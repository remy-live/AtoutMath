// Le classement par chapitre : ce que la déduction propose, et ce que le
// professeur décide. Les fonctions reçoivent toutes leur classement en
// argument — aucun test ne touche au stockage du navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { CHAPITRES, SANS_EXERCICE } from '../js/data/chapitres.js';
import { TAGS } from '../js/data/tags.js';
import { SKILLS } from '../js/data/skills.js';
import { exercices, skillsOf } from '../js/data/catalog.js';
import {
    competencesDuChapitre, chapitresDuNiveau, getChapitre, proposePar,
    etatCase, basculer, confirmerLeChapitre, chapitresDe, exercicesDuChapitre, resume
} from '../js/core/chapitres.js';

const exo = (id) => exercices.find(e => e.id === id);

test('chaque chapitre est complet, et son identifiant est unique', () => {
    const vus = new Set();
    const niveaux = new Set(Object.values(TAGS.NIVEAU));
    for (const c of CHAPITRES) {
        assert.ok(c.id && !vus.has(c.id), `identifiant absent ou répété : ${c.id}`);
        vus.add(c.id);
        assert.ok(c.nom && c.nom.length > 2, `${c.id} : pas de nom`);
        assert.ok(niveaux.has(c.niveau), `${c.id} : niveau inconnu « ${c.niveau} »`);
        assert.ok(Array.isArray(c.skills), `${c.id} : skills doit être une liste`);
    }
});

test('AUCUN chapitre ne réclame une compétence qui n\'existe pas', () => {
    // Une faute de frappe ici ne casse rien de visible : le chapitre se vide
    // en silence, et le professeur croit qu'AtoutMath ne couvre pas la notion.
    const perdus = [];
    for (const c of CHAPITRES) {
        for (const motif of c.skills) {
            if (motif.includes('*')) {
                if (!competencesDuChapitre({ skills: [motif] }).length) perdus.push(`${c.id} → ${motif}`);
            } else if (!SKILLS[motif]) {
                perdus.push(`${c.id} → ${motif}`);
            }
        }
    }
    assert.deepEqual(perdus, []);
});

test('un motif étoilé ramène toute la famille', () => {
    const tables = competencesDuChapitre({ skills: ['num.mult.table.*'] });
    assert.ok(tables.length >= 10, `seulement ${tables.length} tables`);
    assert.ok(tables.includes('num.mult.table.7'));
});

test('les chapitres se filtrent par niveau, et les trois niveaux sont là', () => {
    for (const n of [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]) {
        assert.ok(chapitresDuNiveau(n).length >= 12, `${n} : progression trop courte`);
    }
    assert.equal(chapitresDuNiveau(null).length, CHAPITRES.length, 'sans niveau, tout');
    // Rémy : « oublie les révisions, rappels et Arsène ».
    const noms = CHAPITRES.map(c => c.nom.toLowerCase());
    for (const banni of ['révisions', 'rappels', 'arsène']) {
        assert.ok(!noms.includes(banni), `« ${banni} » n'est pas un chapitre`);
    }
});

// --- La déduction ------------------------------------------------------------

test('un exercice est proposé au chapitre qui partage une de ses compétences', () => {
    const pizza = exo('frac-pizza');
    const fractions6 = getChapitre('6-fractions');
    assert.ok(pizza, 'la Pizzeria a changé d\'identifiant');
    assert.ok(skillsOf(pizza).includes('num.frac.denominateur-commun'));
    assert.ok(proposePar(pizza, fractions6));
    assert.ok(!proposePar(pizza, getChapitre('6-angles')));
});

test('un chapitre sans compétence ne propose rien — et ce n\'est pas une panne', () => {
    // « Probabilités » est dans la progression et n'a aucun exercice. Le
    // tableau doit le montrer vide : c'est ainsi qu'on voit ce qui manque.
    const proba = getChapitre('6-probabilites');
    assert.deepEqual(competencesDuChapitre(proba), []);
    assert.ok(exercices.every(e => !proposePar(e, proba)));
});

test('un jeu de la réserve n\'est proposé nulle part', () => {
    const echecs = exo('logi-echecs');
    assert.ok(echecs.horsProgression);
    assert.equal(chapitresDe(echecs, {}).length, 0);
});

// --- Ce que le professeur décide --------------------------------------------

test('un clic confirme, un second retire, et la décision est écrite', () => {
    const pizza = exo('frac-pizza');
    const chap = getChapitre('6-fractions');

    assert.equal(etatCase(pizza, chap, {}), 'propose');

    const confirme = basculer(pizza, chap, {});
    assert.equal(etatCase(pizza, chap, confirme), 'oui');

    const retire = basculer(pizza, chap, confirme);
    assert.equal(etatCase(pizza, chap, retire), 'non',
        'une proposition retirée ne doit pas revenir au chargement suivant');
    assert.equal(retire['frac-pizza']['6-fractions'], false);

    // Et on peut la remettre.
    assert.equal(etatCase(pizza, chap, basculer(pizza, chap, retire)), 'oui');
});

test('un ajout à la main s\'efface au lieu de laisser un « non » inutile', () => {
    const pizza = exo('frac-pizza');
    const angles = getChapitre('6-angles');       // rien ne l'y rattache
    const ajoute = basculer(pizza, angles, {});
    assert.equal(etatCase(pizza, angles, ajoute), 'oui');
    const defait = basculer(pizza, angles, ajoute);
    assert.equal(etatCase(pizza, angles, defait), 'non');
    assert.deepEqual(defait, {}, 'le fichier ne doit garder que de vraies décisions');
});

test('le classement d\'origine n\'est jamais modifié sur place', () => {
    const depart = {};
    basculer(exo('frac-pizza'), getChapitre('6-fractions'), depart);
    assert.deepEqual(depart, {}, 'basculer a écrit dans son argument');
});

test('confirmer un chapitre entier ne touche qu\'à ses propositions', () => {
    const chap = getChapitre('6-multiplications');
    const avant = exercices.filter(e => etatCase(e, chap, {}) === 'propose');
    assert.ok(avant.length > 3, `seulement ${avant.length} propositions`);

    const apres = confirmerLeChapitre(chap, exercices, {});
    avant.forEach(e => assert.equal(etatCase(e, chap, apres), 'oui', e.id));

    // Aucun exercice étranger n'a été enrôlé au passage.
    exercices
        .filter(e => !avant.includes(e))
        .forEach(e => assert.notEqual(etatCase(e, chap, apres), 'oui', e.id));
});

test('une exclusion survit à la confirmation en masse', () => {
    const chap = getChapitre('6-multiplications');
    const victime = exercices.find(e => etatCase(e, chap, {}) === 'propose');
    const exclu = basculer(victime, chap, basculer(victime, chap, {}));
    assert.equal(etatCase(victime, chap, exclu), 'non');
    const apres = confirmerLeChapitre(chap, exercices, exclu);
    assert.equal(etatCase(victime, chap, apres), 'non',
        'le « tout confirmer » a écrasé une décision du professeur');
});

// --- Lire le classement ------------------------------------------------------

test('une proposition sert avant d\'être confirmée', () => {
    // Un classement qui ne vaudrait qu'une fois tout coché ne servirait à rien
    // le premier soir.
    const liste = exercicesDuChapitre('6-fractions', exercices, {});
    assert.ok(liste.some(e => e.id === 'frac-pizza'));
    assert.ok(liste.length >= 2, `chapitre presque vide : ${liste.length}`);
});

test('un chapitre inconnu ne rend rien plutôt que de tout rendre', () => {
    assert.deepEqual(exercicesDuChapitre('6-chapitre-inexistant', exercices, {}), []);
});

test('le résumé compte ce qui reste à relire et ce qui n\'est rangé nulle part', () => {
    const r = resume(TAGS.NIVEAU.SIXIEME, exercices, {});
    assert.ok(r.proposes > 40, `seulement ${r.proposes} propositions en 6ᵉ`);
    assert.equal(r.confirmes, 0, 'rien n\'est confirmé au départ');
    assert.ok(Array.isArray(r.orphelins));
    // Les chapitres vides sont annoncés : c'est la liste de ce qui manque.
    assert.ok(r.chapitresVides.includes('6-probabilites'));
    assert.ok(!r.chapitresVides.includes('6-fractions'));
});

test('un jeu de la réserve ne compte pas comme orphelin', () => {
    const r = resume(TAGS.NIVEAU.SIXIEME, exercices, {});
    assert.ok(!r.orphelins.includes('logi-echecs'));
});

test('la 6ᵉ range la grande majorité de ce qu\'elle doit ranger', () => {
    // Le chiffre qui dit si le pré-remplissage sert vraiment à quelque chose :
    // s'il laissait la moitié du catalogue de côté, le tableau serait une
    // soirée de saisie, pas une soirée de relecture.
    const deSixieme = exercices.filter(e =>
        (e.tags.niveaux || []).includes(TAGS.NIVEAU.SIXIEME) && !e.horsProgression);
    const ranges = deSixieme.filter(e =>
        chapitresDe(e, {}).some(c => c.niveau === TAGS.NIVEAU.SIXIEME));
    const part = ranges.length / deSixieme.length;
    assert.ok(part > 0.6,
        `seulement ${ranges.length}/${deSixieme.length} exercices de 6ᵉ trouvent un chapitre`);
});

// --- Les deux couches --------------------------------------------------------

test('le classement livré avec l\'application vaut pour tout le monde', async () => {
    // Le stockage du navigateur ne suit pas le professeur d'un poste à
    // l'autre. Ce que le depot livre, si.
    const { CLASSEMENT_LIVRE } = await import('../js/data/classementParDefaut.js');
    assert.equal(typeof CLASSEMENT_LIVRE, 'object');
    for (const [exoId, cases] of Object.entries(CLASSEMENT_LIVRE)) {
        assert.ok(exercices.some(e => e.id === exoId), `exercice inconnu : ${exoId}`);
        for (const [chapId, valeur] of Object.entries(cases)) {
            assert.ok(getChapitre(chapId), `chapitre inconnu : ${chapId}`);
            assert.equal(typeof valeur, 'boolean', `${exoId} › ${chapId}`);
        }
    }
});


// --- Le garde-fou des chapitres vides ---------------------------------------

test('UN CHAPITRE VIDE DOIT ÊTRE DÉCLARÉ VIDE', () => {
    // Onze chapitres étaient à zéro compétence, et CINQ l'étaient par oubli :
    // les exercices sur les puissances, les fonctions et le calcul littéral
    // tournaient depuis des mois pendant que la carte annonçait « notion non
    // couverte ». Rien ne permettait de s'en apercevoir — un chapitre vide par
    // oubli ressemble trait pour trait à un chapitre vide par manque de
    // contenu. Il faut maintenant le dire à voix haute.
    const vides = CHAPITRES.filter(c => !c.skills.length).map(c => c.id).sort();
    assert.deepEqual(vides, Object.keys(SANS_EXERCICE).sort(),
        'un chapitre sans compétence doit figurer dans SANS_EXERCICE — et réciproquement');
    Object.values(SANS_EXERCICE).forEach(raison => {
        assert.ok(raison && raison.length > 20, 'chaque manque dit ce qui manque');
    });
});

test('un chapitre déclaré vide l\'est vraiment', () => {
    Object.keys(SANS_EXERCICE).forEach(id => {
        const c = CHAPITRES.find(x => x.id === id);
        assert.ok(c, `SANS_EXERCICE nomme un chapitre inexistant : ${id}`);
        assert.equal(c.skills.length, 0, `${id} a des compétences : retire-le de SANS_EXERCICE`);
    });
});

test('UNE COMPÉTENCE DE CHAPITRE EXISTE VRAIMENT', () => {
    // Une compétence inconnue de `skills.js` rend le chapitre inatteignable
    // sans rien montrer : c'est la même panne muette que la compétence fantôme
    // trouvée dans `core/tri.js`, vue du côté de la progression.
    for (const c of CHAPITRES) {
        for (const sk of c.skills) {
            if (sk.includes('*')) continue;   // les motifs, résolus par matchSkills
            assert.ok(SKILLS[sk], `${c.id} cite « ${sk} », absente de skills.js`);
        }
    }
});

test('un chapitre PARTIELLEMENT couvert reste licite', () => {
    // J'AVAIS ÉCRIT L'INVERSE, ET C'ÉTAIT FAUX. Mon premier test exigeait que
    // toute compétence citée soit travaillée par un exercice ; il échouait sur
    // `num.frac.sens` et `num.calc.decomposition`. Ce ne sont pas des erreurs :
    // c'est exactement le signal décrit en tête de `chapitres.js` — la
    // progression dit ce qu'elle veut couvrir, le catalogue dit ce qu'il
    // couvre, et l'écart EST l'information utile. On mesure donc l'écart au
    // lieu de l'interdire, et l'on vérifie seulement qu'il reste petit.
    const travaillees = new Set();
    exercices.forEach(e => (skillsOf(e) || []).forEach(sk => travaillees.add(sk)));
    const citees = new Set();
    CHAPITRES.forEach(c => c.skills.forEach(sk => { if (!sk.includes('*')) citees.add(sk); }));
    const orphelines = [...citees].filter(sk => !travaillees.has(sk));
    assert.ok(orphelines.length <= 5,
        `${orphelines.length} compétences de la progression sans aucun exercice : `
        + orphelines.join(', '));
});
