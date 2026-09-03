// Les fonctions : image et antécédent, les deux mots qu'on inverse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';

const gen = () => getGenerator('alg.fonctions');
const suite = (n, params = {}, tag = 'fn') => Array.from({ length: n }, (_, i) =>
    gen().generate(params, { rng: makeRng(`${tag}-${i}`), index: i }));

/** Relit l'écriture affichée pour en retrouver a et b : si l'énoncé ment, on le voit. */
function lireAffine(texte) {
    const m = /f\(x\) = (−?)(\d*)x ([+−]) (\d+)/.exec(texte);
    assert.ok(m, `pas d'écriture affine lisible dans « ${texte} »`);
    const a = (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    return { a, b: (m[3] === '+' ? 1 : -1) * Number(m[4]) };
}

const enNombre = (s) => Number(s.replace('−', '-'));

test('LIRE UNE ÉGALITÉ NE DEMANDE AUCUN CALCUL : la réponse est dans l\'énoncé', () => {
    // C'est tout l'intérêt de ce type de question. Si la réponse n'était pas
    // écrite, l'exercice mesurerait le calcul au lieu de mesurer le sens des
    // deux mots — et c'est le sens qui manque.
    for (const it of suite(60, { quoi: 'lire' }, 'lire')) {
        const m = /f\((\d+)\) = (−?\d+)/.exec(it.prompt.text);
        assert.ok(m, it.prompt.text);
        const [x, y] = [Number(m[1]), enNombre(m[2])];
        // La réponse est l'un des deux nombres de l'égalité, jamais un troisième.
        assert.ok(it.answer === x || it.answer === y, it.prompt.text);
        // Et c'est le bon des deux : on part des parenthèses, on arrive au résultat.
        const veutImage = /Quelle est l'image/.test(it.prompt.text);
        assert.equal(it.answer, veutImage ? y : x, it.prompt.text);
        assert.equal(it.difficulty, 1);
    }
});

test('L\'IMAGE ANNONCÉE EST CELLE DE LA FONCTION ÉCRITE', () => {
    // On relit l'énoncé comme le ferait l'élève, et on refait son calcul : une
    // faute d'écriture (le « 1x », un signe perdu) rendrait l'exercice
    // insoluble sans qu'aucun test interne ne s'en aperçoive.
    for (const quoi of ['image', 'tableau']) {
        for (const it of suite(60, { quoi }, quoi)) {
            const { a, b } = lireAffine(it.prompt.text);
            const m = quoi === 'image'
                ? /Calcule f\((−?\d+)\)/.exec(it.prompt.text)
                : /x = (−?\d+)/.exec(it.hints[1]);
            assert.ok(m, it.prompt.text);
            assert.equal(it.answer, a * enNombre(m[1]) + b, it.prompt.text);
            assert.equal(it.meta.quoi, quoi);
        }
    }
});

test('L\'ANTÉCÉDENT TOMBE TOUJOURS JUSTE, parce qu\'on part de lui', () => {
    // Chercher l'antécédent de 7 par x ↦ 3x + 1 est un exercice de fractions
    // déguisé. On engendre donc l'énoncé À PARTIR de la réponse.
    for (const it of suite(80, { quoi: 'antecedent' }, 'ant')) {
        const { a, b } = lireAffine(it.prompt.text);
        const m = /image (−?\d+)/.exec(it.prompt.text);
        assert.ok(m, it.prompt.text);
        const y = enNombre(m[1]);
        assert.equal(Number.isInteger(it.answer), true, it.prompt.text);
        assert.equal(a * it.answer + b, y, it.prompt.text);
        // Et le chemin de retour, écrit dans l'explication, ne passe par aucun
        // nombre à rallonge : c'est un raisonnement, pas une division.
        assert.equal(/,\d{3,}/.test(it.explanation), false, it.explanation);
        assert.equal(it.skillId, 'alg.fonction.antecedent');
        assert.equal(it.difficulty, 3);
    }
});

test('LE PROGRAMME DE CALCUL EST BIEN LA FONCTION, dite autrement', () => {
    // C'est la porte d'entrée du chapitre : l'élève doit voir que la suite
    // d'instructions et l'écriture f(x) = … sont la même chose. L'explication
    // le dit, encore faut-il qu'elle dise vrai.
    for (const it of suite(60, { quoi: 'programme' }, 'prog')) {
        const { a, b } = lireAffine(it.explanation);
        const m = /en partant de (\d+)/.exec(it.prompt.text);
        assert.ok(m, it.prompt.text);
        assert.equal(it.answer, a * Number(m[1]) + b, it.prompt.text);
        // La multiplication vient d'abord : « ajoute 3 puis multiplie par 2 »
        // serait une AUTRE fonction, et l'écriture affichée serait fausse.
        assert.match(it.prompt.text, /1\. multiplie par/, it.prompt.text);
    }
});

test('LE MOINS EST LE MÊME DANS TOUTE LA LIGNE', () => {
    // Vu à la génération : « f(x) = −3x − 3. Calcule f(-3). » Le trait d'union
    // du clavier est plus court et posé plus bas ; à côté d'un vrai signe moins
    // il se voit, et l'énoncé a l'air bâclé.
    for (const it of suite(200, {}, 'signe')) {
        const tout = [it.prompt.text, it.prompt.papier, it.explanation, ...it.hints].join('\n');
        assert.equal(/-\d/.test(tout), false, `trait d'union devant un chiffre : ${tout}`);
        assert.equal(/ - /.test(tout), false, `trait d'union isolé : ${tout}`);
        // Le point décimal anglais non plus n'a rien à faire dans un énoncé.
        assert.equal(/\d\.\d/.test(tout), false, tout);
    }
});

test('chaque question porte trois indices qui vont du sens vers le calcul', () => {
    for (const it of suite(120, {}, 'aide')) {
        assert.equal(it.hints.length, 3, it.prompt.text);
        // Les deux premiers indices expliquent ; les derniers posent le calcul
        // et peuvent tenir en une ligne (« f(0) = −3 × 0 − 7 »).
        assert.ok(it.hints[0].length > 40, `${it.meta.quoi} : « ${it.hints[0]} »`);
        it.hints.forEach(h => assert.ok(h.length > 12, `${it.meta.quoi} : « ${h} »`));
        assert.ok(it.explanation.length > 40, it.prompt.text);
        assert.equal(typeof it.answer, 'number');
        assert.equal(Number.isFinite(it.answer), true, it.prompt.text);
        assert.equal(it.answerKind, 'numeric');
        // Le dernier indice donne le calcul fait : après lui, il ne reste plus
        // qu'à recopier. C'est voulu — un indice qui ne débloque pas ne sert à rien.
        assert.match(it.hints[2], /\d/);
    }
});

test('L\'EXPLICATION DU « LIRE » NOMME LES DEUX MOTS ENSEMBLE', () => {
    // Séparés, « image » et « antécédent » s'apprennent comme deux règles à
    // retenir. Ensemble sur la même égalité, ils s'expliquent l'un par l'autre.
    for (const it of suite(30, { quoi: 'lire' }, 'mots')) {
        assert.match(it.explanation, /image/);
        assert.match(it.explanation, /antécédent/);
        assert.match(it.explanation, /se lit/);
    }
});

test('le mélange fait revenir toutes les questions, la PHRASE en tête', () => {
    // Rémy : « fais des phrases du genre : f(3) = 1, … est l'image de … par la
    // fonction f. Car là tes questions sont faciles. » La phrase remplace le
    // « lire » dans le mélange — même notion, mais il faut RANGER les deux
    // nombres au lieu d'en désigner un —, et elle reste la plus fréquente :
    // c'est là que les points se perdent en contrôle.
    const vus = {};
    suite(200, {}, 'mel').forEach(it => { vus[it.meta.quoi] = (vus[it.meta.quoi] || 0) + 1; });
    ['image', 'programme', 'tableau', 'tableau-complet', 'antecedent'].forEach(q =>
        assert.ok(vus[q] > 10, `${q} sort trop rarement : ${vus[q] || 0}/200`));
    const phrases = (vus.phrase || 0) + (vus['phrase-antecedent'] || 0);
    assert.ok(phrases > 30, `la phrase sort trop rarement : ${phrases}/200`);
    assert.ok(phrases > (vus.antecedent || 0), 'la phrase doit revenir plus souvent');
    // ET LES DEUX SENS DE LA PHRASE SORTENT : « … est l'image de … » et « … est
    // un antécédent de … ». Une seule des deux formes n'apprendrait que la
    // moitié du vocabulaire, celle qu'on retient déjà.
    assert.ok(vus.phrase > 5 && vus['phrase-antecedent'] > 5,
        `un seul sens de phrase : ${vus.phrase}/${vus['phrase-antecedent']}`);
});

test('la même graine redonne le même énoncé', () => {
    const a = gen().generate({}, { rng: makeRng('pareil'), index: 0 });
    const b = gen().generate({}, { rng: makeRng('pareil'), index: 0 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('alg-fonctions');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.generatorId, 'alg.fonctions');
    assert.ok(gen(), 'le générateur doit être enregistré');
    const schema = gen().params.find(p => p.id === 'quoi');
    // CHAQUE OPTION EST DEMANDÉE POUR ELLE-MÊME. Les vérifier à travers le
    // MÉLANGE était une erreur : le mélange ne tire pas toutes les options —
    // « lire » n'y est plus, remplacé par la phrase —, et le test tombait sur
    // une option parfaitement valide que personne n'avait cassée.
    schema.options.filter(o => o.value !== 'melange').forEach(o => {
        const it = gen().generate({ quoi: o.value }, { rng: makeRng(`opt-${o.value}`), index: 0 });
        assert.ok(it && it.prompt.text, `l'option « ${o.label} » ne produit rien`);
        assert.equal(Number.isFinite(it.answer), true, `« ${o.label} » sans réponse`);
        // La phrase se range sous deux genres selon le sens demandé.
        const attendu = o.value === 'phrase' ? ['phrase', 'phrase-antecedent'] : [o.value];
        assert.ok(attendu.includes(it.meta.quoi),
            `« ${o.label} » rend ${it.meta.quoi}`);
    });
});

// --- LA FEUILLE : « TABLEAU NON DESSINÉ, QUESTION TROP TRIVIALE » --------------
//
// Les trois défauts que Rémy a vus sur le PDF, chacun avec sa vérification.

test('le tableau de valeurs part vers la feuille en TABLEAU, pas en texte', () => {
    for (const it of suite(20, { quoi: 'tableau-complet' }, 'tab')) {
        const t = it.prompt.tableau;
        assert.ok(t && t.lignes, 'la feuille doit recevoir un tableau à dessiner');
        assert.equal(t.lignes.length, 2);
        assert.equal(t.lignes[0][0], 'x');
        assert.equal(t.lignes[1][0], 'f(x)');
        assert.equal(t.lignes[0].length, 5, 'quatre valeurs, plus la tête de rangée');
        // Toutes les cases de la seconde rangée sont VIDES : c'est ce qui
        // demande de remplir TOUT le tableau, et c'est ce qui fait de chaque
        // case une case où l'on écrit.
        assert.deepEqual(t.lignes[1].slice(1), ['', '', '', '']);
        // Et l'énoncé n'écrit plus le tableau en toutes lettres à côté.
        assert.ok(!/\|/.test(it.prompt.papier),
            `le tableau est resté écrit en texte : « ${it.prompt.papier} »`);
    }
});

test('le tableau à un trou laisse la case VIDE, pas un « ? » à barrer', () => {
    for (const it of suite(20, { quoi: 'tableau' }, 'tab1')) {
        const bas = it.prompt.tableau.lignes[1].slice(1);
        assert.equal(bas.filter(c => c === '').length, 1, 'une seule case à remplir');
        assert.ok(!bas.includes('?'), 'le « ? » de l\'écran n\'a rien à faire dans une case');
        // La case vide est bien celle dont la valeur est la réponse.
        const haut = it.prompt.tableau.lignes[0].slice(1);
        const x = enNombre(haut[bas.indexOf('')]);
        const { a, b } = lireAffine(it.prompt.text);
        assert.equal(it.answer, a * x + b);
    }
});

test('le corrigé du tableau complet donne les QUATRE valeurs, pas la dernière', () => {
    // L'écran ne demande qu'une colonne — un pavé numérique rend un nombre.
    // La feuille en demande quatre : le corrigé imprimait la dernière, seule,
    // en face d'une question qui en posait quatre.
    for (const it of suite(12, { quoi: 'tableau-complet' }, 'sol')) {
        const morceaux = it.reponsePapier.split(' ; ');
        assert.equal(morceaux.length, 4, `corrigé incomplet : « ${it.reponsePapier} »`);
        const { a, b } = lireAffine(it.prompt.text);
        morceaux.forEach(m => {
            const [, x, y] = /f\((−?\d+)\) = (−?\d+)/.exec(m) || [];
            assert.ok(x !== undefined, `corrigé illisible : « ${m} »`);
            assert.equal(enNombre(y), a * enNombre(x) + b);
        });
    }
});

test('sur la feuille, la phrase à compléter porte un VRAI trou', () => {
    // Rémy : « des lignes en pointillé qui ne servent à rien ». La feuille
    // reconnaît un trou à une SUITE D'ESPACES et y pose la ligne à remplir ;
    // des points de suspension écrits à la main n'en sont pas un, et l'on
    // obtenait la phrase pointillée PLUS deux lignes de pointillés dessous.
    for (const it of suite(20, { quoi: 'phrase' }, 'ph')) {
        assert.match(it.prompt.papier, / {3,}/, 'aucun trou reconnaissable sur la feuille');
        assert.ok(!/\. \. \./.test(it.prompt.papier), 'les points de l\'écran sont restés');
        // L'écran, lui, garde ses pointillés : il n'a pas de ligne à tracer.
        assert.match(it.prompt.text, /\. \. \./);
    }
});

test('LA FEUILLE NE POSE PAS LES MÊMES QUESTIONS QUE L\'ÉCRAN', () => {
    // « Question trop triviale » : sur une feuille qu'on emporte, lire une
    // égalité déjà écrite ne demande rien. Le mélange du papier garde ce qui
    // demande un calcul ou un raisonnement.
    const compter = (papier) => {
        const vus = {};
        for (let i = 0; i < 300; i++) {
            const it = gen().generate({ quoi: 'melange' },
                { rng: makeRng(`mel-${papier}-${i}`), index: i, papier });
            vus[it.meta.quoi] = (vus[it.meta.quoi] || 0) + 1;
        }
        return vus;
    };
    const ecran = compter(false);
    const papier = compter(true);
    assert.ok(!papier.tableau,
        'le tableau à un trou est une image habillée en tableau : pas sur la feuille');
    assert.ok(ecran.tableau > 0, 'à l\'écran, il a toute sa place');
    // Le gros du papier demande un calcul : tableau complet, antécédent, image.
    const durs = (v) => (v['tableau-complet'] || 0) + (v.antecedent || 0)
        + (v['phrase-antecedent'] || 0);
    assert.ok(durs(papier) > durs(ecran),
        `la feuille devrait être plus exigeante : ${JSON.stringify(papier)}`);
});
