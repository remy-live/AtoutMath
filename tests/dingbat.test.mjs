// LES DINGBATS — les cent neuf énigmes, vérifiées d'un coup.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats, idéalement dans le thème
// mathématique mais dans les réglages on peut avoir le choix. Une centaine
// serait bien. Classe aussi par niveau. »
//
// ── CE QUE CES ÉPREUVES PEUVENT DIRE, ET CE QU'ELLES NE PEUVENT PAS ────────
//
// ELLES NE DISENT PAS QU'UN DINGBAT EST BON. « MÈTRE autour d'un carré se lit
// périmètre » est un jugement humain, et c'est Rémy qui l'a — comme pour le
// choix des exercices d'une séance, que `relireUneSeance.mjs` ne juge pas non
// plus.
//
// ELLES DISENT CE QUI SE VÉRIFIE SANS HUMAIN, et qui casserait en silence :
// qu'aucune énigme ne cite une disposition qui n'existe pas, qu'aucune ne rend
// un dessin vide, qu'aucune n'est impossible à réussir parce que son juge
// refuserait sa propre réponse, et qu'aucune n'en répète une autre.
//
// C'EST ICI QUE LA GRAMMAIRE SE PAYE. Cent énigmes écrites en HTML à la main
// n'auraient pas pu être éprouvées : on aurait relu cent morceaux de balises à
// l'œil, une fois, et jamais plus. Une énigme déclarative se vérifie cent fois
// par jour, en vingt millisecondes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { DINGBATS, compter } from '../js/data/dingbats.js';
import {
    DISPOSITIONS, dessiner, normaliser, juste, attendues, indices, choisir, THEMES, NIVEAUX
} from '../js/core/dingbat.js';
import { dingbatGenerator } from '../js/core/generators/dingbat.js';
import { getExerciseById } from '../js/data/catalog.js';

test('IL Y EN A UNE CENTAINE, ET ELLES SONT CLASSÉES', () => {
    // LES DEUX CHIFFRES QUE RÉMY A DONNÉS. « Une centaine serait bien » n'est
    // pas une approximation qu'on peut rendre à cinquante.
    assert.ok(DINGBATS.length >= 100,
        `seulement ${DINGBATS.length} dingbats : Rémy en demandait une centaine`);

    const c = compter();
    // LE THÈME MATHÉMATIQUE EST LE PRINCIPAL — « idéalement dans le thème
    // mathématique ». Un jeu dont les trois quarts seraient de culture générale
    // ne serait pas celui qu'il a demandé, même avec le bon nombre d'énigmes.
    assert.ok(c.maths.total > c.general.total,
        `${c.maths.total} dingbats de maths contre ${c.general.total} de culture `
        + 'générale : le thème principal doit rester les mathématiques');

    // « CLASSE AUSSI PAR NIVEAU » : les quatre niveaux existent, dans les DEUX
    // thèmes. Un niveau vide ferait un réglage qui ne donne rien — et c'est
    // précisément le cas qu'on ne veut pas livrer.
    for (const t of THEMES) {
        for (const n of NIVEAUX) {
            assert.ok(c[t.id] && c[t.id][n.id] > 0,
                `aucun dingbat de niveau ${n.id} en « ${t.label} » : `
                + 'le réglage proposerait un lot vide');
        }
    }
});

test('CHAQUE ÉNIGME SE DESSINE, ET AUCUNE NE REND UNE BOÎTE VIDE', () => {
    // UNE DISPOSITION INCONNUE REND UNE SCÈNE MUETTE, c'est-à-dire la même
    // chose qu'un logiciel cassé : l'élève chercherait la réponse d'un dessin
    // qui n'existe pas. `dessiner` jette plutôt que de rendre du vide, et c'est
    // ici qu'on l'attrape.
    for (const d of DINGBATS) {
        assert.ok(DISPOSITIONS[d.forme],
            `« ${d.id} » cite la disposition « ${d.forme} », qui n'existe pas`);
        const html = dessiner(d);
        assert.ok(html.includes('dg-scene'), `« ${d.id} » ne rend pas de scène`);
        // ON EXIGE DU CONTENU, pas seulement des balises : une scène faite de
        // deux `<div>` vides passerait le test précédent sans rien montrer.
        const texte = html.replace(/<[^>]*>/g, '').trim();
        assert.ok(texte.length > 0,
            `« ${d.id} » dessine une scène SANS AUCUN TEXTE — il n'y a rien à lire`);
    }
});

test('AUCUNE ÉNIGME N\'EST IMPOSSIBLE À RÉUSSIR', () => {
    // LE DÉFAUT LE PLUS CRUEL QU'UN EXERCICE PUISSE AVOIR : une réponse juste
    // refusée. Il suffit d'un accent oublié dans une variante pour qu'une
    // énigme devienne insoluble, et personne ne s'en apercevrait avant qu'un
    // élève n'y passe cinq minutes.
    for (const d of DINGBATS) {
        for (const e of attendues(d)) {
            assert.ok(juste(e, d),
                `« ${d.id} » refuse « ${e} », qui est pourtant une de ses réponses`);
        }
        // ET LA RÉPONSE PRINCIPALE N'EST JAMAIS VIDE : `answer` part au bilan.
        assert.ok(String(d.reponse || '').trim().length > 1,
            `« ${d.id} » n'a pas de réponse écrite`);
    }
});

test('DEUX ÉNIGMES NE SE RESSEMBLENT PAS AU POINT DE SE CONFONDRE', () => {
    // DEUX RÉPONSES QUI SE NORMALISENT PAREIL SERAIENT DEUX ÉNIGMES DONT L'UNE
    // ACCEPTE LA RÉPONSE DE L'AUTRE. L'élève aurait raison sans le savoir, et le
    // bilan noterait une compétence qu'il n'a pas montrée.
    const vues = new Map();
    for (const d of DINGBATS) {
        assert.ok(!vues.has(d.id), `l'identifiant « ${d.id} » est employé deux fois`);
        for (const e of attendues(d)) {
            const n = normaliser(e);
            const deja = vues.get(n);
            assert.ok(!deja || deja === d.id,
                `« ${d.id} » et « ${deja} » acceptent tous deux « ${e} »`);
            vues.set(n, d.id);
        }
        vues.set(d.id, d.id);
    }
});

test('LE JUGE EST GÉNÉREUX SUR LA FORME ET STRICT SUR LE FOND', () => {
    const racine = DINGBATS.find(d => d.id === 'dg-racine-carree');
    assert.ok(racine, 'l\'énigme de référence a disparu : l\'épreuve mesure autre chose');

    // CE QU'ON ACCEPTE, et pourquoi : refuser un accent qu'un élève n'a pas
    // trouvé sur son clavier, ce serait corriger le clavier plutôt que les
    // mathématiques. C'est la règle de la maison (voir `opposeParentheses.js`).
    for (const bon of ['racine carrée', 'Racine Carrée', 'racine carree',
        'la racine carrée', '  racine   carrée  ', 'racines carrées']) {
        assert.ok(juste(bon, racine), `« ${bon} » devrait être accepté`);
    }

    // CE QU'ON REFUSE, et c'est tout le jeu : un mot différent est une autre
    // lecture. Les deux premières sont les confusions RÉELLES du chapitre.
    const paralleles = DINGBATS.find(d => d.id === 'dg-paralleles');
    assert.ok(!juste('droites perpendiculaires', paralleles));
    assert.ok(!juste('carré', racine), 'la moitié de la réponse n\'est pas la réponse');
    assert.ok(!juste('', racine), 'une réponse vide n\'est pas une réponse');
    assert.ok(!juste('   ', racine));
});

test('LES INDICES AIDENT SANS RÉSOUDRE', () => {
    // UN INDICE QUI DONNE LA RÉPONSE N'EST PAS UN INDICE : il contourne la
    // règle de `core/itemSession.js` — « on ne donne pas la réponse tant qu'il
    // lui reste un essai ».
    for (const d of DINGBATS) {
        const suite = indices(d);
        assert.ok(suite.length >= 2, `« ${d.id} » n'a qu'un indice`);
        for (const i of suite) {
            assert.ok(!juste(i, d),
                `un indice de « ${d.id} » contient la réponse : « ${i} »`);
            assert.ok(normaliser(i) !== normaliser(d.reponse));
        }
        // LE DERNIER DONNE LA PREMIÈRE LETTRE ET LE NOMBRE DE MOTS, ce qui est
        // le maximum qu'on puisse donner sans donner la réponse.
        assert.match(suite[suite.length - 1], /commence par/);
    }
});

test('LE THÈME SE RÈGLE, ET LE DÉFAUT EST LES MATHÉMATIQUES', () => {
    // « Idéalement dans le thème mathématique mais dans les réglages on peut
    // avoir le choix. » Les deux moitiés de la phrase, et elles s'éprouvent.
    const p = dingbatGenerator.params.find(x => x.id === 'themes');
    assert.ok(p, 'le réglage de thème a disparu');
    assert.deepEqual(p.default, ['maths'], 'le défaut doit être les mathématiques');
    // UN CHOIX MULTIPLE, PAS UN MENU : il faut pouvoir dire « les deux ».
    assert.equal(p.type, 'multiselect');
    assert.deepEqual(p.options.map(o => o.value).sort(), ['general', 'maths']);

    const tire = (params, n = 12) => Array.from({ length: n }, (_, i) =>
        dingbatGenerator.generate(params, { rng: makeRng(`t-${i}`), index: i, total: n }))
        .map(it => it.meta);

    // SANS RÉGLAGE, QUE DES MATHS.
    assert.ok(tire({}).every(m => m.theme === 'maths'));
    // CULTURE GÉNÉRALE SEULE : aucune énigme de maths ne se glisse dedans.
    assert.ok(tire({ themes: ['general'] }).every(m => m.theme === 'general'));
    // LES DEUX : les deux paraissent réellement, sur une série assez longue.
    const deux = tire({ themes: ['maths', 'general'] }, 40).map(m => m.theme);
    assert.ok(deux.includes('maths') && deux.includes('general'),
        'cocher les deux thèmes n\'en donne qu\'un');
});

test('UN RÉGLAGE VIDE LE DIT, IL NE SERT PAS AUTRE CHOSE EN SILENCE', () => {
    // « PAS RÉGLÉ » ET « VIDÉ EXPRÈS » NE SONT PAS LA MÊME CHOSE. Ma première
    // version les confondait : décocher les deux thèmes rendait des dingbats de
    // maths, et le professeur voyait un réglage qui ne faisait rien. Un réglage
    // qui ne fait pas ce qu'il annonce est pire qu'un réglage absent.
    const vide = dingbatGenerator.generate({ themes: [] },
        { rng: makeRng('vide'), index: 0, total: 1 });
    assert.ok(vide.meta.vide, 'décocher tous les thèmes doit rendre un item qui le DIT');
    assert.match(vide.prompt.text, /réglages/);
    // ET IL NE PRÉTEND PAS ÊTRE UNE QUESTION : aucune réponse n'est juste.
    assert.equal(vide.verifieTexte('n\'importe quoi').juste, false);
});

test('LES NIVEAUX MONTENT AU FIL DE LA SÉRIE', () => {
    // « CLASSE AUSSI PAR NIVEAU » : le classement ne sert à rien s'il ne se
    // traduit pas par une progression. Les marches cochées se partagent les
    // questions dans l'ORDRE — c'est `marcheAuRang` qui le fait, et c'est la
    // convention de trente-huit générateurs.
    const niveaux = Array.from({ length: 12 }, (_, i) =>
        dingbatGenerator.generate({}, { rng: makeRng(`n-${i}`), index: i, total: 12 })
            .meta.niveau);
    assert.equal(niveaux[0], 1, 'la série ne commence pas au niveau 1');
    assert.equal(niveaux[niveaux.length - 1], 4, 'la série ne finit pas au niveau 4');
    // ET ELLE NE REDESCEND JAMAIS.
    for (let i = 1; i < niveaux.length; i++) {
        assert.ok(niveaux[i] >= niveaux[i - 1],
            `la série redescend du niveau ${niveaux[i - 1]} au ${niveaux[i]}`);
    }
    // UN SEUL NIVEAU COCHÉ NE DONNE QUE CELUI-LÀ.
    const seul = Array.from({ length: 8 }, (_, i) =>
        dingbatGenerator.generate({ marches: ['n2'] },
            { rng: makeRng(`s-${i}`), index: i, total: 8 }).meta.niveau);
    assert.ok(seul.every(n => n === 2), `niveaux obtenus : ${seul.join(',')}`);
});

test('LE CHOIX NE SORT JAMAIS DES THÈMES DEMANDÉS', () => {
    // LE REPLI EST SUR LE NIVEAU, JAMAIS SUR LE THÈME. Si un niveau est vide
    // dans le thème choisi, on élargit le NIVEAU — on ne va pas chercher une
    // énigme de l'autre thème. Le thème est le réglage que Rémy a demandé ; le
    // niveau n'est qu'un rangement.
    assert.deepEqual(choisir(DINGBATS, { themes: ['general'], niveaux: [2] })
        .filter(d => d.theme !== 'general'), []);
    assert.deepEqual(choisir(DINGBATS, { themes: ['maths'] })
        .filter(d => d.theme !== 'maths'), []);
    // Un lot impossible rend un tableau VIDE, et ne se rattrape pas tout seul.
    assert.deepEqual(choisir(DINGBATS, { themes: [], niveaux: [1] }), []);
});

test('L\'EXERCICE EST AU CATALOGUE, ET IL NE SE RÉVISE PAS', () => {
    const exo = getExerciseById('voc-dingbats');
    assert.ok(exo, 'l\'exercice « Dingbats » n\'est pas au catalogue');
    assert.equal(exo.generatorId, 'jeu.dingbat');
    assert.equal(exo.activityId, 'dingbat');
    // UNE ÉNIGME NE SE RÉVISE PAS : une fois qu'on a vu que RACINE dans un
    // carré se lit « racine carrée », on le sait. La reposer en révision ne
    // mesure plus rien — même raison que les mots croisés et le Jardin.
    assert.equal(exo.sansRevision, true);
    assert.ok(exo.instruction && exo.instruction.length > 200,
        'la consigne doit expliquer ce qu\'est un dingbat : personne ne le devine');
});
