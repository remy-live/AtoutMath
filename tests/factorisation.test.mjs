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

test('LA PROGRESSION EST LE PARCOURS — sept exercices, dans l\'ordre', () => {
    // « HYPER PROGRESSIF » NE SE RÈGLE PAS DANS UN GÉNÉRATEUR. Un curseur de
    // difficulté serait une loterie, où l'élève tombe sur le barreau 6 avant
    // d'avoir monté le 2. Sept exercices, que le professeur pose à la suite.
    const miens = exercices.filter(e => /^fac-\d+$/.test(e.id) || e.id === 'fac-revision');
    assert.equal(miens.length, 8, 'sept barreaux plus la révision');
    for (let r = 1; r <= 7; r++) {
        const e = miens.find(x => x.id === `fac-${r}`);
        assert.ok(e, `barreau ${r} absent du catalogue`);
        assert.equal(e.params.barreau, String(r));
        assert.match(e.title, new RegExp(`^${r}\\.`), 'le titre ne porte pas son rang');
        assert.ok(e.instruction && e.instruction.length >= 10);
        // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    }
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

test('LE PAS À PAS EST UN EXERCICE À PART, pas un réglage caché', () => {
    // RÉMY : « Pour les factorisations compliqué du genre (x+3)² − (3x + 5)²,
    // on pourrait proposer plusieurs étapes non ? »
    //
    // Le professeur pose un parcours : il doit pouvoir mettre « le 4 pas à
    // pas » avant « le 4 » sans rouvrir les réglages de l'étape. Un exercice
    // qui porte son nom se pose ; un réglage caché se retrouve.
    const pas = exercices.filter(e => /^fac-\d+-pas$/.test(e.id));
    assert.equal(pas.length, 4, 'les barreaux 3, 4, 6 et 7 en pas à pas');
    pas.forEach(e => {
        assert.equal(e.params.etapes, 'oui', `${e.id} : le pas à pas n'est pas activé`);
        assert.match(e.title, /pas à pas/, `${e.id} : le titre ne le dit pas`);
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    });
    // LES BARREAUX 1 ET 2 N'EN ONT PAS, et c'est délibéré : leur réponse
    // s'écrit d'un trait, et découper « x² − 36 » en quatre lignes ferait
    // passer pour compliqué ce qui ne l'est pas.
    ['1', '2'].forEach(r => assert.ok(!pas.find(e => e.params.barreau === r),
        `le barreau ${r} n'a pas besoin d'être découpé`));
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
