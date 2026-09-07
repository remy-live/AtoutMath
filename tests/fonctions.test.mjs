// Les fonctions : image et antécédent, les deux mots qu'on inverse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getGenerator } from '../js/core/registry.js';
import { evaluate } from '../js/core/items.js';
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
        // Depuis que chaque étape a sa ligne, « choisis un nombre » porte le
        // numéro 1 et l'opération le numéro 2 — voir `itemProgramme`.
        assert.match(it.prompt.text, /^2\. Multiplie par /m, it.prompt.text);
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
        // LA PHRASE À DEUX TROUS RÉPOND UNE PAIRE, PAS UN NOMBRE.
        //
        // Rémy : « Dans la phrase enlève les deux chiffres, on peut les
        // compléter grâce au f(x). » Quand l'égalité est donnée, les deux
        // places de la phrase sont vides et l'élève range la paire entière ;
        // la réponse s'écrit alors « gauche|droite ». Partout ailleurs, un
        // nombre — et ce test tient les deux formes.
        if (it.answerKind === 'text') {
            const paire = String(it.answer).split('|');
            assert.equal(paire.length, 2, it.prompt.text);
            paire.forEach(v => assert.equal(Number.isFinite(Number(v)), true, it.prompt.text));
            assert.equal(it.meta.trous, 2);
            // La phrase de l'écran porte bien DEUX cases à remplir.
            assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, 2, it.prompt.text);
        } else {
            assert.equal(typeof it.answer, 'number');
            assert.equal(Number.isFinite(it.answer), true, it.prompt.text);
            assert.equal(it.answerKind, 'numeric');
        }
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
    // égalité déjà écrite ne demande rien. Le mélange du papier PÈSE donc sur
    // ce qui demande un calcul ou un raisonnement.
    //
    // IL NE LES EXCLUT PLUS. Le papier ne tirait ni « lire une égalité » ni le
    // tableau à un trou, quoi qu'on règle. Depuis que le professeur COCHE ce
    // qu'il veut, une case cochée qui ne donne jamais rien est un réglage qui
    // ment : les deux sortes légères sont devenues rares au lieu d'être
    // absentes — mesuré, 9 % et 10 % du papier contre 11 % chacune à l'écran —
    // et il suffit de les décocher pour ne plus les voir du tout.
    const compter = (papier, quoi) => {
        const vus = {};
        for (let i = 0; i < 400; i++) {
            const it = gen().generate({ quoi },
                { rng: makeRng(`mel-${papier}-${i}`), index: i, papier });
            vus[it.meta.quoi] = (vus[it.meta.quoi] || 0) + 1;
        }
        return vus;
    };
    const ecran = compter(false);
    const papier = compter(true);
    // Le gros du papier demande un calcul : tableau complet, antécédent, image.
    const durs = (v) => (v['tableau-complet'] || 0) + (v.antecedent || 0)
        + (v['phrase-antecedent'] || 0);
    assert.ok(durs(papier) > durs(ecran),
        `la feuille devrait être plus exigeante : ${JSON.stringify(papier)}`);
    // Les légères restent minoritaires sur la feuille.
    const leger = (v) => (v.tableau || 0) + (v.lire || 0);
    assert.ok(leger(papier) < 400 * 0.25, `trop de questions légères : ${JSON.stringify(papier)}`);
    assert.ok(leger(papier) < leger(ecran), 'la feuille devrait en poser moins que l\'écran');
    // Et décochées, elles disparaissent pour de bon.
    const sansLeger = compter(true, ['phrase', 'image', 'programme', 'antecedent', 'tableau-complet']);
    assert.equal(leger(sansLeger), 0, JSON.stringify(sansLeger));
});

// --- LA PHRASE À DEUX TROUS -------------------------------------------------
//
// Rémy, capture à l'appui : « Dans la phrase enlève les deux chiffres, on peut
// les compléter grâce au f(x). »
//
// « On sait que f(4) = 1. Complète : … est l'image de 4 par f » ne posait que
// la moitié de la question : le 4 était déjà rangé, il ne restait qu'un nombre
// à mettre — et comme il n'y en a que deux à l'écran, le trouver ne prouvait
// rien. Avec les deux trous, l'élève range la PAIRE, et ranger la paire est
// exactement le geste qu'on rate en contrôle.
test('LES DEUX TROUS N\'APPARAISSENT QUE SI L\'ÉGALITÉ EST DONNÉE', () => {
    let deux = 0, un = 0;
    for (const it of suite(200, { quoi: 'phrase' }, 'trous')) {
        const html = it.prompt.html;
        const n = (html.match(/data-trou=/g) || []).length;
        const avecEgalite = /On sait que/.test(html);
        if (n === 2) {
            deux++;
            // Deux trous supposent l'égalité sous les yeux : sans elle, un des
            // deux nombres n'est écrit nulle part et n'a aucun point d'appui.
            assert.ok(avecEgalite, it.prompt.text);
            assert.equal(it.answerKind, 'text');
            // Aucun nombre ne reste écrit dans la phrase elle-même.
            const phrase = html.slice(html.indexOf('fn-phrase'));
            assert.equal(/\d/.test(phrase.replace(/data-trou="\d"/g, '')), false, phrase);
        } else {
            un++;
            assert.equal(n, 1, it.prompt.text);
            assert.equal(avecEgalite, false, it.prompt.text);
        }
    }
    assert.ok(deux > 20 && un > 20, `${deux} à deux trous, ${un} à un seul`);
});

test('LA PAIRE ÉCHANGÉE EST NOMMÉE, pas seulement refusée', () => {
    // C'est LA faute du chapitre : « image » et « antécédent » se disent dans
    // le même souffle et se rangent à l'envers l'un de l'autre. Un élève qui
    // les échange n'a pas « faux » — il a mis l'image à la place de
    // l'antécédent, et c'est cela qu'il faut lui dire.
    let vus = 0;
    for (const it of suite(120, { quoi: 'phrase' }, 'echange')) {
        if (it.answerKind !== 'text') continue;
        vus++;
        const [g, d] = String(it.answer).split('|');
        assert.ok(Array.isArray(it.diagnostics) && it.diagnostics.length === 1);
        assert.equal(it.diagnostics[0].value, `${d}|${g}`);
        assert.match(it.diagnostics[0].why, /échangé/);
        // Et l'évaluation le retrouve : c'est elle qui parle à l'élève.
        const r = evaluate(it, `${d}|${g}`);
        assert.equal(r.correct, false);
        assert.match(r.misconception || '', /échangé/);
        // La paire juste passe.
        assert.equal(evaluate(it, `${g}|${d}`).correct, true);
    }
    assert.ok(vus > 10, `${vus} questions à deux trous vues`);
});

// --- UN PROGRAMME DE CALCUL EST UNE LISTE ------------------------------------
//
// Rémy, capture d'un téléphone à l'appui : « Va à la ligne à chaque étape ».
//
// L'énoncé tenait sur une seule phrase — « choisis un nombre ; 1. multiplie par
// 5 ; 2. ajoute 1. Quel résultat… ». Sur un écran étroit elle se repliait à des
// endroits qui ne sont pas les siens : « 1. multiplie par », retour, « 5 ;
// 2. ajoute 1. Quel résultat ». Le point-virgule est le seul indice de la
// coupure, et il se perd au milieu d'un mur de mots.
test('CHAQUE ÉTAPE DU PROGRAMME A SA LIGNE, à l\'écran comme sur la feuille', () => {
    for (const it of suite(60, { quoi: 'programme' }, 'lignes')) {
        const lignes = it.prompt.text.split('\n').map(l => l.trim()).filter(Boolean);
        // En-tête, les étapes, puis la question. Trois ou quatre étapes selon
        // que la fonction ajoute quelque chose ou non.
        assert.ok(lignes.length >= 4, it.prompt.text);
        assert.equal(lignes[0], 'Programme de calcul :');
        assert.match(lignes[1], /^1\. Choisis un nombre$/);
        assert.match(lignes[lignes.length - 1], /^Quel résultat obtient-on en partant de /);

        const etapes = lignes.slice(1, -1);
        etapes.forEach((l, i) => {
            // Numérotées à la suite, une par ligne, sans point-virgule ni
            // « puis » : ce sont ces mots-là qui recollaient les étapes.
            assert.match(l, new RegExp(`^${i + 1}\\. `), it.prompt.text);
            assert.equal(/[;]|\bpuis\b/.test(l), false, `« ${l} » porte deux étapes`);
        });

        // L'écran dit la même chose avec une vraie liste : c'est elle qui
        // aligne les numéros, et l'alignement est ce qui montre qu'on descend
        // une étape à la fois.
        assert.match(it.prompt.html, /<ol class="fn-prog">/);
        const li = it.prompt.html.match(/<li>/g) || [];
        assert.equal(li.length, etapes.length, it.prompt.html);
        // Et la question reste HORS de la liste : ce n'est pas une étape.
        assert.ok(it.prompt.html.indexOf('</ol>') < it.prompt.html.indexOf('Quel résultat'),
            it.prompt.html);
    }
});

// --- ON COCHE CE QU'ON VEUT --------------------------------------------------
//
// Rémy : « Pourquoi pour les fonctions je n'ai pas les cases à cocher pour
// choisir ce que je veux ? »
//
// C'était un menu : une sorte à la fois, ou « Mélangé », c'est-à-dire les sept.
// Entre les deux, rien — et c'est justement entre les deux qu'on enseigne.
// « Calculer une image » et « chercher un antécédent » font la séance où l'on
// oppose les deux sens de la marche ; « lire » et « compléter la phrase » font
// celle du vocabulaire.
test('« CE QU\'ON DEMANDE » SE COCHE, une sorte ou plusieurs', async () => {
    const { SORTES, sortesDemandees } = await import('../js/core/generators/fonctions.js');
    const gen = getGenerator('alg.fonctions');
    const p = gen.params.find(x => x.id === 'quoi');

    assert.equal(p.type, 'multiselect', 'le réglage n\'est pas une liste à cocher');
    assert.ok(p.deroulant, 'sept phrases en pastilles au fil du texte : la liste doit se replier');
    assert.deepEqual(p.options.map(o => o.value), SORTES);
    // « Mélangé » n'est plus une option : tout coché VEUT DIRE mélangé.
    assert.equal(p.options.some(o => o.value === 'melange'), false);
    assert.deepEqual([...p.default].sort(), [...SORTES].sort());

    // Ce qui arrive au générateur, remis au propre.
    assert.deepEqual(sortesDemandees(['image', 'antecedent']), ['image', 'antecedent']);
    assert.deepEqual(sortesDemandees('phrase'), ['phrase']);          // ancien réglage
    assert.deepEqual(sortesDemandees('image,antecedent'), ['image', 'antecedent']);
    assert.deepEqual(sortesDemandees(['image', 'image']), ['image']);  // pas de doublon
    // Rien de coché, ou l'ancien « melange » : tout. Un exercice sans question
    // n'existe pas, et une case oubliée ne doit pas rendre l'étape vide.
    assert.deepEqual(sortesDemandees([]), SORTES);
    assert.deepEqual(sortesDemandees('melange'), SORTES);
    assert.deepEqual(sortesDemandees(undefined), SORTES);
});

test('LE GÉNÉRATEUR NE POSE QUE CE QUI EST COCHÉ, écran et feuille', async () => {
    const { SORTES } = await import('../js/core/generators/fonctions.js');
    const gen = getGenerator('alg.fonctions');
    // « phrase-antecedent » est la phrase posée dans l'autre sens : c'est la
    // même sorte, et le bilan la range déjà avec les antécédents.
    const sorteDe = (it) => (it.meta.quoi === 'phrase-antecedent' ? 'phrase' : it.meta.quoi);

    const essais = [['image'], ['antecedent'], ['image', 'antecedent'],
        ['lire', 'phrase'], ['tableau'], ['tableau-complet', 'programme'], SORTES];
    for (const choix of essais) {
        for (const papier of [false, true]) {
            const vus = new Set();
            for (let i = 0; i < 120; i++) {
                const it = gen.generate({ quoi: choix },
                    { rng: makeRng(`c${i}${papier}`), papier });
                vus.add(sorteDe(it));
            }
            [...vus].forEach(v => assert.ok(choix.includes(v),
                `${papier ? 'feuille' : 'écran'} · coché ${choix.join('+')} : « ${v} » est sorti`));
            // Et tout ce qui est coché finit par sortir : un réglage qui ne
            // donne jamais l'une des sortes cochées ment au professeur.
            choix.forEach(v => assert.ok(vus.has(v),
                `${papier ? 'feuille' : 'écran'} · coché ${choix.join('+')} : « ${v} » n'est jamais sorti`));
        }
    }
});
