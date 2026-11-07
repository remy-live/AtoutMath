// FACTORISER — SEPT BARREAUX, ET UNE VÉRIFICATION QUI NE CROIT PERSONNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille à l'appui : « peux-tu faire des exercices du type
// seconde avec factorisation de x² − y² ? Je veux que ce soit hyper progressif
// pour arriver à cela en photo. »
//
// UNE FACTORISATION SE VÉRIFIE, et c'est ce qui rend ce fichier différent d'un
// test de mise en forme : on n'y compare pas mon code à mon idée de la réponse
// — on se tromperait deux fois. On ÉVALUE l'énoncé et la réponse en une
// trentaine de points. Si elles ne coïncident pas partout, la question est
// fausse, et aucune relecture n'aurait suffi à le voir.
//
// ET LES LEURRES, À L'ENVERS. Un leurre qui coïncide avec la réponse n'est pas
// un leurre : c'est une SECONDE bonne réponse, marquée fausse. L'élève qui la
// choisit a raison et perd son point. MESURÉ pendant l'écriture : douze cas,
// dans trois barreaux différents, tous invisibles à la lecture —
//
//   · barreau 3, n = 1 : le leurre « b² au lieu de b » est la bonne réponse,
//     puisque 1² = 1. Et n = 1 est justement la valeur qui donne (6 − 5x)² − 1,
//     la forme de la feuille ;
//   · barreau 5, u = 0 : deux leurres se confondent avec elle ;
//   · barreau 7, signes déjà positifs : le leurre « signes inversés »
//     n'inverse rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BARREAUX_POUR_ESSAI as B, factorisationGenerator }
    from '../js/core/generators/factorisation.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import '../js/core/activities/index.js';
import { allGenerators, getGenerator } from '../js/core/registry.js';
import { codeCourt } from '../js/core/shortcodes.js';
import { makeRng } from '../js/core/ids.js';
import * as fx from '../js/core/maths/formule.js';
import * as P from '../js/core/maths/polynome.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const RANGS = [1, 2, 3, 4, 5, 6, 7];
// Pas de 0,25 : on tombe sur les entiers ET entre eux.
const POINTS = Array.from({ length: 81 }, (_, i) => (i - 40) / 4);

test('CHAQUE FACTORISATION VAUT SON ÉNONCÉ — évalué, pas relu', () => {
    let questions = 0, evaluations = 0;
    RANGS.forEach(rang => {
        for (let i = 0; i < 60; i++) {
            const q = B[rang].faire(makeRng(`t_${rang}_${i}`));
            questions++;
            POINTS.forEach(x => {
                evaluations++;
                assert.ok(Math.abs(q.evaluer(x) - q.evaluerReponse(x)) < 1e-9,
                    `barreau ${rang} : ${q.enonce} ≠ ${q.reponse} (en x = ${x})`);
            });
        }
    });
    assert.ok(questions >= 400 && evaluations >= 30000,
        `${questions} questions, ${evaluations} évaluations : l'échantillon a rétréci`);
});

test('ET AUCUN LEURRE N\'EST UNE SECONDE BONNE RÉPONSE', () => {
    RANGS.forEach(rang => {
        for (let i = 0; i < 60; i++) {
            const q = B[rang].faire(makeRng(`l_${rang}_${i}`));
            q.leurres.forEach(l => {
                // `memeValeur` marque les deux leurres qui VALENT la réponse
                // exprès : une expression juste mais pas factorisée. Ils sont
                // déclarés, donc assumés — voir leurs commentaires.
                if (l.memeValeur) return;
                const differe = POINTS.some(x =>
                    Math.abs(l.evaluer(x) - q.evaluerReponse(x)) > 1e-9);
                assert.ok(differe,
                    `barreau ${rang} : « ${l.texte} » vaut ${q.reponse} — c'est une `
                    + `seconde bonne réponse, marquée fausse`);
            });
        }
    });
});

test('QUATRE PROPOSITIONS, UNE SEULE JUSTE, AUCUNE EN DOUBLE', () => {
    ['1', '2', '3', '4', '5', '6', '7', 'revision', 'toutes'].forEach(barreau => {
        for (let i = 0; i < 40; i++) {
            const it = factorisationGenerator.generate({ barreau },
                { rng: makeRng(`c_${barreau}_${i}`) });
            assert.equal(it.choices.length, 4, `barreau ${barreau} : ${it.choices.length} choix`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
            const vues = it.choices.map(c => c.label);
            assert.equal(new Set(vues).size, 4,
                `barreau ${barreau} : deux propositions identiques — ${vues.join(' | ')}`);
            it.choices.filter(c => !c.correct).forEach(c =>
                assert.ok(c.why && c.why.length > 25, 'un leurre sans explication'));
        }
    });
});

test('AUCUN FACTEUR NE PERD SA CONSTANTE', () => {
    // « (x − 5)(x + 5)(3x) », « (x − 3)(x) » : justes, et que personne
    // n'écrirait ainsi — on écrit 3x(x − 5)(x + 5). Une bonne réponse qui ne
    // ressemble pas à une bonne réponse se fait éliminer par un élève qui
    // avait raison ; un leurre qui ne ressemble à rien se repère sans qu'on
    // ait rien compris, et n'enseigne donc rien.
    const bancal = /\((\d+|[−-]?\d*x)\)/;
    RANGS.forEach(rang => {
        for (let i = 0; i < 80; i++) {
            const q = B[rang].faire(makeRng(`d_${rang}_${i}`));
            [q.enonce, q.reponse, ...q.leurres.map(l => l.texte)].forEach(t =>
                assert.ok(!bancal.test(t), `barreau ${rang} : « ${t} »`));
        }
    });
});

test('LE BARREAU 3 S\'ÉCRIT COMME LA FEUILLE, ET LE 7 AUSSI', () => {
    // La cible de Rémy. Le 3 doit pouvoir produire la forme de A(x) —
    // constante en tête, comme (6 − 5x)² — et le 7 celles de B(x) et C(x).
    const formes3 = [], formes7 = [];
    for (let i = 0; i < 200; i++) {
        formes3.push(B[3].faire(makeRng(`f3_${i}`)).enonce);
        formes7.push(B[7].faire(makeRng(`f7_${i}`)).enonce);
    }
    // « (6 − 5x)² − 1 » : la constante devant, le carré, moins un nombre.
    assert.ok(formes3.some(e => /^\(\d+ − \d*x\)² − \d+$/.test(e)),
        'le barreau 3 ne produit jamais la forme de A(x)');
    // B(x) : (x² − n²)(…) − (x − n)(…) − (x − n)²
    assert.ok(formes7.some(e => /^\(x² − \d+\)\(.+\) − \(x − \d+\)\(.+\) − \(x − \d+\)²$/.test(e)),
        'le barreau 7 ne produit jamais la forme de B(x)');
    // C(x) : (x − r)²x − kx + kr + m(x − r)x
    assert.ok(formes7.some(e => /^\(x − \d+\)²x − \d*x \+ \d+ \+ \d\(x − \d+\)x$/.test(e)),
        'le barreau 7 ne produit jamais la forme de C(x)');
});

test('LA PROGRESSION EST LE PARCOURS — sept barreaux, dans l\'ordre', () => {
    // RÉMY : « est-ce que ce ne serait pas pertinent, pour l'identité x² − a²,
    // de regrouper les exercices et de plutôt mettre des étapes avec un nombre
    // de questions ? Là on a quand même beaucoup d'exercices pour la même
    // chose. »
    //
    // C'ÉTAIT DOUZE CARTES, C'EST DEUX. Ce test gardait « sept exercices, dans
    // l'ordre » ; ce qu'il faut garder n'a pas changé de nature, seulement de
    // place : la progression EXISTE, elle est complète, et on la parcourt dans
    // l'ordre. Elle était dans le catalogue, elle est dans les cases.
    const miens = exercices.filter(e => e.generatorId === 'lit.factorisation');
    assert.equal(miens.length, 2, 'un exercice, et le même en pas à pas');
    const carte = miens.find(e => e.id === 'fac');
    assert.ok(carte, 'la carte « Factoriser » a disparu du catalogue');
    // AUCUN BARREAU FIGÉ DANS LA CARTE : c'est le professeur qui coche.
    assert.equal(carte.params.barreau, undefined,
        'la carte fige un barreau : le réglage ne sert plus à rien');

    // LES SEPT BARREAUX SONT LÀ, NOMMÉS, ET DANS L'ORDRE.
    const cases = factorisationGenerator.params.find(p => p.type === 'marches');
    assert.ok(cases, 'le générateur n\'offre plus de cases à cocher');
    assert.deepEqual(cases.marches.map(m => m.id), ['1', '2', '3', '4', '5', '6', '7']);
    cases.marches.forEach((m, i) => assert.match(m.nom, new RegExp(`^${i + 1}\\.`),
        `la marche ${m.id} ne porte pas son rang`));

    // ET ON LES MONTE TOUS, sur la longueur que l'exercice conseille lui-même.
    const total = factorisationGenerator.conseil({});
    assert.ok(total >= 14, `conseil de ${total} questions pour sept barreaux`);
    const montee = [];
    for (let i = 0; i < total; i++) {
        montee.push(factorisationGenerator.generate({},
            { rng: makeRng(`montee_${i}`), index: i, total }).meta.barreau);
    }
    assert.deepEqual([...new Set(montee)], [1, 2, 3, 4, 5, 6, 7],
        'la montée saute un barreau, ou les mélange');
    // Un parcours MONTE : il ne redescend jamais.
    montee.forEach((r, i) => assert.ok(i === 0 || r >= montee[i - 1],
        `question ${i + 1} : on redescend du barreau ${montee[i - 1]} au ${r}`));

    // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
    miens.forEach(e => {
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    });
});

test('UN RÉGLAGE D\'HIER SE RELIT — le catalogue a changé, pas les parcours', () => {
    // Les cartes ont disparu ; les parcours que Rémy a préparés, non. Un
    // exercice enregistré avec « barreau 3 » doit jouer le barreau 3, et
    // « Révision — les barreaux 1 à 4 » doit jouer les quatre premiers. C'est
    // ce que `marchesCochees` traduit, et c'est pour cela que la clef du
    // groupe est « revision » : c'était la valeur d'alors.
    for (const r of RANGS) {
        const it = factorisationGenerator.generate({ barreau: String(r) },
            { rng: makeRng(`vieux_${r}`), index: 3, total: 10 });
        assert.equal(it.meta.barreau, r, `un parcours réglé sur le barreau ${r} joue autre chose`);
    }
    const revision = [0, 1, 2, 3].map(i => factorisationGenerator.generate(
        { barreau: 'revision' }, { rng: makeRng(`rev_${i}`), index: i, total: 4 }).meta.barreau);
    assert.deepEqual(revision, [1, 2, 3, 4],
        '« Révision — les barreaux 1 à 4 » ne se relit plus comme les quatre premiers');
});


test('LE GÉNÉRATEUR EST BRANCHÉ, ET SES COMPÉTENCES EXISTENT', () => {
    assert.ok(allGenerators().map(g => g.id).includes('lit.factorisation'));
    assert.ok(getGenerator('lit.factorisation'));
    ['lit.factoriser.identite', 'lit.factoriser.commun'].forEach(id => {
        assert.ok(SKILLS[id], `compétence absente : ${id}`);
        // UN PRÉREQUIS FANTÔME NE LÈVE AUCUNE ERREUR : il rend seulement la
        // remédiation muette, et l'élève en difficulté ne se voit jamais
        // proposer ce qui lui manque. J'avais écrit `lit.developper.simple`,
        // qui n'existe pas — la même faute que `num.relatifs.comparaison`.
        (SKILLS[id].prereqs || []).forEach(p =>
            assert.ok(SKILLS[p], `prérequis fantôme : ${p} (de ${id})`));
    });
    // Les quatre premiers barreaux travaillent l'identité, les trois derniers
    // le facteur commun : ce sont deux compétences, et le bilan doit les
    // distinguer.
    RANGS.forEach(r => {
        const it = factorisationGenerator.generate({ barreau: String(r) },
            { rng: makeRng(`s_${r}`) });
        assert.equal(it.skillId,
            r <= 4 ? 'lit.factoriser.identite' : 'lit.factoriser.commun');
    });
});

// PAS DE SUPPORT VISUEL ICI, ET C'EST LE CONTRAIRE DE CE QUE CE TEST EXIGEAIT.
//
// Rémy, après avoir vu l'aperçu : « pour les factorisations, ne fais pas de
// support visuel ». Trois dessins y étaient posés, et ce test les gardait.
//
// La règle générale — « il faut toujours un support visuel » — n'est pas
// abandonnée pour autant ; elle est précisée. Un dessin sert quand il MONTRE
// une chose que l'écriture ne dit pas : une aire pour la distributivité, des
// paires de facteurs pour une racine, un axe pour un intervalle. Ici, ce qu'on
// demande à l'élève EST une lecture de l'écriture — voir que 4x² − 16 est une
// différence de deux carrés. Un encadré qui nomme a et b fait ce travail à sa
// place ; il ne l'aide pas, il le remplace.
test('LA FACTORISATION SE PASSE DE DESSIN, ET LA LEÇON RESTE DANS L\'INDICE', () => {
    ['1', '2', '3', '4', '5', '6', '7'].forEach(barreau => {
        for (let i = 0; i < 12; i++) {
            const it = factorisationGenerator.generate({ barreau },
                { rng: makeRng(`v_${barreau}_${i}`) });
            assert.ok(!/fa-identite|fa-figure|<svg/.test(it.prompt.html),
                `barreau ${barreau} : un dessin subsiste dans l'énoncé`);
            assert.equal((it.schemas || []).length, 0,
                `barreau ${barreau} : un schéma subsiste sur l'indice`);
            // Ce qui reste doit suffire : l'expression, et deux indices écrits.
            assert.match(it.prompt.html, /fa-expression/);
            assert.ok(it.explanation.length > 40);
            assert.equal(it.hints.length, 2);
            assert.ok(it.hints.every(h => h && h.length > 20),
                `barreau ${barreau} : un indice trop court pour remplacer le dessin`);
        }
    });
});

test('ET LE SIGNE MOINS EST UN SIGNE MOINS', () => {
    // Même chapitre de Seconde que les intervalles, même exigence : `-3` et
    // `−3` ne sont pas le même caractère, et les deux se côtoieraient.
    const F = lire('js/core/generators/factorisation.js');
    assert.match(F, /const M = '−';/);
    RANGS.forEach(r => {
        const q = B[r].faire(makeRng(`m_${r}`));
        [q.enonce, q.reponse].forEach(t =>
            assert.ok(!/-/.test(t), `barreau ${r} : trait d'union dans « ${t} »`));
    });
});

test('LE PAS À PAS EST UN RÉGLAGE, ET UNE CARTE DÉJÀ COCHÉE', () => {
    // RÉMY : « c'est génial ton idée de carte "pas à pas" prête ».
    //
    // Les deux à la fois, et c'est le point. Le RÉGLAGE le rend disponible sur
    // n'importe quel barreau — y compris les deux premiers, qui n'y avaient pas
    // droit quand c'étaient des cartes séparées. La CARTE le pose sans ouvrir
    // le panneau, ce qu'on veut quand on prépare une remédiation en fin
    // d'heure.
    const carte = exercices.find(e => e.id === 'fac-pas');
    assert.ok(carte, 'la carte « Factoriser pas à pas » a disparu');
    assert.equal(carte.params.etapes, 'oui', 'le pas à pas n\'est pas activé');
    assert.match(carte.title, /pas à pas/, 'le titre ne le dit pas');
    assert.equal(carte.params.barreau, undefined,
        'la carte fige un barreau : on ne peut plus la poser où l\'on veut');
    const c = codeCourt(carte.id);
    assert.equal(c.length, 3, `${carte.id} : code « ${c} »`);
    assert.ok(!/[IOQ]/.test(c), `${carte.id} : ${c} contient une lettre qui s'entend mal`);

    // LE RÉGLAGE EXISTE À PART, et il marche sur les SEPT barreaux — c'est le
    // gain du regroupement, et il se mesure.
    const reglage = factorisationGenerator.params.find(p => p.id === 'etapes');
    assert.ok(reglage, 'le réglage « Pas à pas » a disparu du générateur');
    RANGS.forEach(r => {
        const it = factorisationGenerator.generate({ barreau: String(r), etapes: 'oui' },
            { rng: makeRng(`pas_${r}`), index: 0, total: 10 });
        assert.ok((it.meta.etapes || []).length >= 1,
            `barreau ${r} : le pas à pas ne découpe rien`);
        assert.ok(it.meta.saisieSeule,
            `barreau ${r} : le pas à pas n'ouvre pas le clavier`);
    });
});


test('CHAQUE ÉTAPE SE JUGE, ET ACCEPTE CE QUI EST JUSTE', () => {
    for (const barreau of ['3', '4', '5', '6', '7']) {
        for (let i = 0; i < 200; i++) {
            const it = factorisationGenerator.generate({ barreau, etapes: 'oui' },
                { rng: makeRng(`et_${barreau}_${i}`) });
            const etapes = it.meta.etapes || [];
            // UNE SEULE ÉTAPE SUFFIT, et c'est la bonne borne. La dernière
            // ligne de la chaîne est ajoutée par l'activité : un barreau dont
            // rien n'est à sortir n'a qu'une ligne intermédiaire, et en
            // inventer une seconde pour faire nombre ajouterait une ligne qui
            // ne dit rien.
            assert.ok(etapes.length >= 1,
                `barreau ${barreau} : pas d'étapes alors qu'on les demande`);
            assert.ok(it.meta.titreFinal,
                `barreau ${barreau} : la dernière ligne n'a pas de nom`);
            assert.equal(it.meta.saisieSeule, true,
                `barreau ${barreau} : le pas à pas doit prendre la main dès la `
                + 'première question — c\'est à celui qui bloque qu\'il sert');
            etapes.forEach(e => {
                assert.ok(e.montrer, `barreau ${barreau} : une étape sans réponse`);
                const v = e.verifie(String(e.montrer).replace(/\s+/g, ''));
                assert.ok(v && v.juste, `barreau ${barreau} — « ${e.titre} » : sa propre `
                    + `réponse « ${e.montrer} » est refusée : ${(v && v.pourquoi) || '?'}`);
                // ET L'OPPOSÉ A SON MESSAGE À LUI : « c'est l'opposé » se
                // corrige, « faux » ne se corrige pas.
                const inv = e.verifie(`0 − (${e.montrer})`);
                assert.ok(inv && !inv.juste && /OPPOS/.test(inv.pourquoi || ''),
                    `barreau ${barreau} — « ${e.titre} » : l'opposé n'est pas nommé`);
            });
        }
    }
});

test('SANS LE RÉGLAGE, RIEN NE CHANGE', () => {
    // Un exercice qui ne demande pas le pas à pas doit se comporter comme
    // avant : une question, une réponse, et le clavier quand l'échelle d'aide
    // le décide — pas dès la première question.
    for (const barreau of ['3', '4', '7']) {
        const it = factorisationGenerator.generate({ barreau },
            { rng: makeRng(`sans_${barreau}`) });
        assert.equal((it.meta.etapes || []).length, 0);
        assert.ok(!it.meta.saisieSeule);
    }
});

test('LA CHAÎNE EST UNE CHAÎNE : chaque ligne vaut l\'expression de départ', () => {
    // RÉMY : « il faut revoir la façon de présenter, quelque chose de
    // cohérent ». La présentation retenue est celle du tableau — l'expression,
    // puis une suite de « = … ». Ce qui rend cette forme honnête est une
    // propriété vérifiable : TOUTE ligne de la chaîne vaut l'expression de
    // départ. Si une seule ne la vaut pas, on écrit une suite d'égalités
    // fausses, ce qui est pire qu'une liste à cocher.
    //
    // Les lignes `apart` sont exclues, et c'est leur définition : « x² − 9 =
    // (x − 3)(x + 3) » est un calcul de côté, posé dans la marge, qui ne vaut
    // PAS l'expression entière. Elles portent leur propre membre de gauche, et
    // c'est à lui qu'on les compare.
    for (const barreau of ['1', '2', '3', '4', '5', '6', '7']) {
        for (let i = 0; i < 250; i++) {
            const it = factorisationGenerator.generate({ barreau, etapes: 'oui' },
                { rng: makeRng(`ch_${barreau}_${i}`) });
            const depart = P.lireSaisie(it.prompt.papier.replace('Factoriser : ', ''), fx);
            assert.ok(depart, `barreau ${barreau} : énoncé illisible`);
            for (const e of it.meta.etapes) {
                const ligne = P.lireSaisie(e.montrer, fx);
                assert.ok(ligne, `barreau ${barreau} : « ${e.montrer} » illisible`);
                // Une NOTE est une reconnaissance, pas une égalité : le
                // facteur commun ne vaut pas l'expression entière, et ce
                // serait un contresens de le lui comparer.
                if (e.note) continue;
                if (e.apart) {
                    const g = P.lireSaisie(e.gauche, fx);
                    assert.ok(g && P.egaux(g, ligne),
                        `barreau ${barreau} : le calcul de côté « ${e.gauche} = `
                        + `${e.montrer} » est faux`);
                    continue;
                }
                assert.ok(P.egaux(ligne, depart),
                    `barreau ${barreau} : « ${e.montrer} » ne vaut pas `
                    + `« ${it.prompt.papier} »`);
            }
            // Et la dernière ligne aussi, qui est la réponse.
            const fin = P.lireSaisie(it.reponsePapier, fx);
            assert.ok(fin && P.egaux(fin, depart),
                `barreau ${barreau} : la réponse ne vaut pas l'énoncé`);
        }
    }
});

test('« SANS RIEN RÉDUIRE » REFUSE LA LIGNE D\'APRÈS', () => {
    // Une ligne de la chaîne est une ÉGALITÉ : la forme réduite vaut la forme
    // non réduite, et le juge des polynômes l'accepterait donc à sa place.
    // L'étape que Rémy a demandé d'ajouter — « l'écrire d'abord totalement en
    // ligne non factorisé puis réduire » — serait alors sautable, c'est-à-dire
    // inexistante.
    for (const barreau of ['3', '4', '5', '6', '7']) {
        let vues = 0;
        for (let i = 0; i < 150; i++) {
            const it = factorisationGenerator.generate({ barreau, etapes: 'oui' },
                { rng: makeRng(`sr_${barreau}_${i}`) });
            const brutes = it.meta.etapes.filter(e => /sans rien réduire/i.test(e.titre));
            for (const e of brutes) {
                vues++;
                assert.ok(e.verifie(e.montrer.replace(/\s+/g, '')).juste,
                    `barreau ${barreau} : « ${e.montrer} » refusée à sa propre étape`);
                // La réponse finale vaut la même chose et est plus courte :
                // c'est exactement ce qu'il ne faut pas accepter ici.
                const v = e.verifie(it.reponsePapier.replace(/\s+/g, ''));
                assert.ok(v && !v.juste && /déjà réduit/.test(v.pourquoi || ''),
                    `barreau ${barreau} : « ${it.reponsePapier} » passe à l'étape `
                    + `« ${e.titre} », qui demande de ne rien réduire`);
            }
        }
        assert.ok(vues > 0, `barreau ${barreau} : aucune étape « sans rien réduire »`);
    }
});

// ── COMMENCÉ N'EST PAS RATÉ ─────────────────────────────────────────────────
//
// Rémy, à propos du développement : « je propose cette réponse [x² + 2x + 5x +
// 10], tu peux dire que c'est bon mais qu'il faut réduire ». La factorisation a
// exactement le même cas : 2(x² − 9) est égal, c'est un produit, et il reste un
// pas à faire. Le message le disait déjà — « ce n'est pas fini » — mais il
// coûtait une vie, ce qui apprend à ne pas écrire la ligne du milieu.
//
// LA FRONTIÈRE EST CELLE-CI : a-t-on écrit un PRODUIT ? Recopier l'énoncé est
// égal aussi, et ce n'est pas une factorisation entamée — c'est une question à
// laquelle on n'a pas répondu. Elle doit rester une faute, sans quoi la
// question ne peut plus jamais être ratée.

/** L'énoncé de l'item, tel qu'il est écrit à l'élève. */
const enonceDe = (it) => String(it.prompt.papier || '').replace(/^[^:]*:\s*/, '').trim();

test('RECOPIER L\'ÉNONCÉ RESTE UNE FAUTE', () => {
    let vus = 0;
    for (const rang of Object.keys(B).map(Number)) {
        for (let i = 0; i < 25; i++) {
            const it = factorisationGenerator.generate({ barreau: String(rang) },
                { rng: makeRng(`recopie_${rang}_${i}`) });
            if (!it.verifieTexte) continue;
            const enonce = enonceDe(it);
            const v = it.verifieTexte(enonce);
            assert.equal(v.juste, false, `[b${rang}] « ${enonce} » rendu tel quel est accepté`);
            assert.ok(!v.inacheve,
                `[b${rang}] « ${enonce} » rendu tel quel passe pour commencé : `
                + 'la question ne peut plus être ratée');
            vus += 1;
            // Et la bonne réponse, elle, passe — sinon ce test se contenterait
            // d'un juge qui refuse tout.
            const bonne = it.verifieTexte(it.reponsePapier);
            assert.equal(bonne.juste, true, `[b${rang}] « ${it.reponsePapier} » refusée`);
            assert.ok(!bonne.inacheve, `[b${rang}] la réponse finale passe pour inachevée`);
        }
    }
    assert.ok(vus > 100, `seulement ${vus} énoncés jugés : la mesure ne mesure rien`);
});

test('UN FACTEUR COMMUN SORTI, ET PAS PLUS, EST « PRESQUE »', () => {
    // On fabrique la moitié de travail que Rémy décrit : le facteur numérique
    // sorti devant, ce qui reste laissé en l'état. On ne le fabrique que quand
    // l'énoncé s'y prête — c'est-à-dire quand il A un facteur commun entier.
    let vus = 0;
    for (const rang of Object.keys(B).map(Number)) {
        for (let i = 0; i < 40; i++) {
            const it = factorisationGenerator.generate({ barreau: String(rang) },
                { rng: makeRng(`moitie_${rang}_${i}`) });
            if (!it.verifieTexte) continue;
            const p = P.lireSaisie(enonceDe(it), fx);
            if (!p) continue;
            const k = P.contenu(p);
            if (Math.abs(k) < 2) continue;
            const reste = P.versArbre(P.poly([...p].map(([clef, c]) => ({
                coef: c / k, expos: P.POUR_ESSAI.exposDe(clef) }))), fx);
            const moitie = `${k}(${fx.texte(reste)})`;
            // COMBIEN DE FACTEURS DE CHAQUE CÔTÉ — par un autre chemin que
            // celui du juge : on lit l'écriture, lui lit son verdict.
            const facteurs = (t) => (String(t).match(/\(/g) || []).length;
            const v = it.verifieTexte(moitie);
            if (facteurs(moitie) >= facteurs(it.reponsePapier)) continue;
            vus += 1;
            // ON NE PASSE PAS À CÔTÉ D'UNE ACCEPTATION. La première version de
            // ce test faisait `if (v.juste) continue` : elle sautait
            // justement le défaut qu'elle devait voir — 95 questions sur 840
            // acceptaient 8(2x² + 9x + 7) pour (4x + 9)² − 25, c'est-à-dire
            // une expression DÉVELOPPÉE après avoir été factorisée.
            assert.equal(v.juste, false,
                `[b${rang}] « ${moitie} » est accepté, alors que la réponse `
                + `« ${it.reponsePapier} » porte plus de facteurs`);
            assert.equal(v.inacheve, true,
                `[b${rang}] « ${moitie} » est compté FAUX : le facteur commun `
                + 'est sorti, le travail est entamé');
            assert.match(v.pourquoi, /pas fini/,
                `[b${rang}] le message ne dit pas ce qui reste à faire`);
        }
    }
    assert.ok(vus > 20, `seulement ${vus} moitiés de travail mesurées`);
});
