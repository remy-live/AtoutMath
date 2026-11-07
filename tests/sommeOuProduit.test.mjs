// SOMME OU PRODUIT ? — ce qui doit tenir pour que l'exercice ait un sens.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « en ce moment avec mes 4ᵉ, je fais les additions, soustractions,
// simplification et multiplications de nombres relatifs, c'est pas simple pour
// eux. Quel type d'exercice pourrait-on faire pour bien les entraîner ».
//
// L'EXERCICE REPOSE SUR UN INVARIANT, ET IL EST FRAGILE. Les trois premières
// marches montrent les mêmes deux nombres avec + et avec ×, et demandent
// lequel donne un résultat positif. Cela n'a de sens que si EXACTEMENT UN des
// deux l'est. Deux positifs — (+3) et (+5) — donnent deux résultats positifs :
// la question n'a plus de réponse, et l'élève se fait refuser un choix juste.
// Un négatif plus gros qu'un positif — (−9) et (+2) — donne deux résultats
// négatifs : même défaut, à l'envers.
//
// Le tirage est donc contraint (`couplePourLaPaire`), et c'est la première
// épreuve de ce fichier. Elle ne garde pas un affichage : elle garde que la
// question POSÉE a une réponse.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    ETAPES, question, couplePourLaPaire, couple, valeur, signeDe,
    sommeComplete, produitComplet, sommeSimple, produitSimple,
    relatifsMelangeGenerator
} from '../js/core/generators/relatifsMelange.js';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

const marche = (id) => ETAPES.find(e => e.id === id);

test('LA QUESTION DE LA PAIRE A TOUJOURS UNE RÉPONSE, ET UNE SEULE', () => {
    for (let g = 0; g < 300; g++) {
        const [a, b] = couplePourLaPaire(makeRng(`paire-${g}`));
        const somme = a + b;
        const produit = a * b;
        assert.notEqual(somme, 0, `(${a}, ${b}) : somme nulle, zéro n'a pas de signe`);
        assert.notEqual(produit, 0, `(${a}, ${b}) : produit nul, zéro n'a pas de signe`);
        assert.notEqual(signeDe(somme), signeDe(produit),
            `(${a}, ${b}) : la somme et le produit ont le MÊME signe (${signeDe(somme)}).\n`
            + '      « Lequel donne un résultat positif ? » n\'a alors pas de réponse —\n'
            + '      ou en a deux, ce qui revient à refuser un choix juste.');
    }
});

test('ET LE CAS DU CONTRESENS SORT LE PLUS SOUVENT', () => {
    // DEUX NÉGATIFS, c'est la situation de l'erreur reine : (−3) + (−5) = −8
    // contre (−3) × (−5) = +15. Les autres tirages servent à EMPÊCHER
    // d'apprendre « la somme est toujours celle du bas » — mais ils ne doivent
    // pas prendre la place du cas qu'on travaille.
    let deuxNegatifs = 0;
    const n = 300;
    for (let g = 0; g < n; g++) {
        const [a, b] = couplePourLaPaire(makeRng(`part-${g}`));
        if (a < 0 && b < 0) deuxNegatifs++;
    }
    assert.ok(deuxNegatifs > n * 0.5 && deuxNegatifs < n * 0.85,
        `${deuxNegatifs} tirages sur ${n} sont « deux négatifs ».\n`
        + '      Trop peu : on ne travaille plus l\'erreur du chapitre.\n'
        + '      Trop : l\'élève apprend que la bonne réponse est toujours le produit.');
});

test('UNE SOMME NULLE NE SE DEMANDE JAMAIS', () => {
    // ZÉRO N'EST NI POSITIF NI NÉGATIF. « (−5) + (+5), positif ou négatif ? »
    // est une question sans réponse, et c'est une leçon à part — pas un piège
    // glissé au milieu d'une série.
    for (let g = 0; g < 300; g++) {
        const [a, b] = couple(makeRng(`couple-${g}`));
        assert.notEqual(a + b, 0, `(${a}, ${b}) : somme nulle`);
        assert.ok(a < 0 || b < 0,
            `(${a}, ${b}) : deux positifs — aucune des deux règles ne travaille`);
    }
});

test('LE PREMIER PIÈGE D\'UN CALCUL EST LE RÉSULTAT DE L\'AUTRE OPÉRATION', () => {
    // C'EST TOUT L'EXERCICE. Devant « (−3) + (−5) », la proposition « +15 » est
    // exactement la faute qu'on travaille — et son « pourquoi » la nomme. Un
    // distracteur tiré au hasard ne mesure rien.
    for (const id of ['calcul-somme', 'calcul-produit', 'calcul-melange', 'calcul-simple']) {
        for (let g = 0; g < 40; g++) {
            const q = question(marche(id), makeRng(`${id}-${g}`));
            const autre = valeur(q.a, q.b, q.op === '×' ? '+' : '×');
            const premier = q.pieges[0];
            assert.equal(premier.value, autre,
                `${id} : le premier piège de « ${q.enonce} » est ${premier.value}, `
                + `et le résultat de l'autre opération est ${autre}.`);
            assert.match(premier.why, /ADDITIONNÉ|MULTIPLIÉ/,
                `${id} : le « pourquoi » ne NOMME pas la confusion : « ${premier.why} »`);
        }
    }
});

test('LES DEUX ÉCRITURES NE DIFFÈRENT QUE PAR L\'OPÉRATION', () => {
    // SI LES DEUX BOUTONS N'ÉCRIVENT PAS LES MÊMES NOMBRES, la comparaison ne
    // porte plus sur la règle mais sur deux calculs différents, et l'exercice
    // ne mesure plus rien. Mesuré à l'écran : les deux propositions s'affichent
    // l'une sous l'autre, centrées — le « + » et le « × » tombent donc à la
    // même abscisse, et c'est la seule chose qui change.
    for (let g = 0; g < 60; g++) {
        const q = question(marche('paire-positif'), makeRng(`ecr-${g}`));
        assert.equal(q.choix.length, 2);
        const [somme, produit] = q.choix;
        assert.equal(somme.replace(' + ', ' × '), produit,
            `« ${somme} » et « ${produit} » ne portent pas les mêmes nombres`);
    }
    // ET SANS LES PARENTHÈSES, LÀ OÙ ELLES SE RESSEMBLENT LE PLUS : « −3 − 5 »
    // contre « −3 × (−5) ». C'est l'écriture du cahier, et celle de la faute.
    const q = question(marche('paire-simple'), makeRng('simple-1'));
    assert.ok(!q.choix.some(c => c.startsWith('(')),
        `la marche « sans les parenthèses » en écrit encore : ${q.choix.join(' / ')}`);
});

test('AUCUNE ÉTIQUETTE NE PORTE LE TRAIT D\'UNION DU CLAVIER', () => {
    // SUR UN CHAPITRE OÙ LE SIGNE EST LE SUJET, deux moins différents dans la
    // même rangée de boutons ne sont pas un détail de typographie. Le défaut
    // est venu du BOUCHE-TROU de `finalizeChoices`, qui rend un nombre brut :
    // mesuré avant correction, « 56 | −56 | -54 | 1 ».
    let vues = 0;
    for (let i = 0; i < 300; i++) {
        const it = relatifsMelangeGenerator.generate({},
            { rng: makeRng(`tiret-${i}`), index: i % ETAPES.length, total: ETAPES.length });
        for (const c of it.choices || []) {
            vues++;
            assert.ok(!String(c.label).includes('-'),
                `l'étiquette « ${c.label} » porte le trait d'union du clavier, `
                + 'pas le signe moins (U+2212).');
        }
    }
    assert.ok(vues > 500, `seulement ${vues} étiquettes lues : le balayage n'a pas eu lieu`);
});

test('LA COMPÉTENCE SUIT L\'OPÉRATION TIRÉE, PAS LA MARCHE', () => {
    // UNE SÉRIE MÊLÉE NOURRIT LES DEUX CARNETS, et c'est ce qu'on veut lire au
    // bilan : « il sait multiplier, il confond quand on mélange ». Rattacher
    // toute la marche à une seule compétence effacerait exactement cela.
    const rang = ETAPES.findIndex(e => e.id === 'calcul-melange');
    let somme = 0, produit = 0;
    for (let i = 0; i < 60; i++) {
        const it = relatifsMelangeGenerator.generate({},
            { rng: makeRng(`skill-${i}`), index: rang, total: ETAPES.length });
        const attendu = it.meta.operation === '×' ? 'num.relatifs.produit' : 'num.relatifs.somme';
        assert.equal(it.skillId, attendu,
            `${it.meta.operation} : compétence ${it.skillId}, attendue ${attendu}`);
        if (it.meta.operation === '×') produit++; else somme++;
    }
    assert.ok(somme > 5 && produit > 5,
        `la marche mêlée ne mêle pas : ${somme} sommes, ${produit} produits`);
});

test('LES QUATRE PORTES DU MÊME GÉNÉRATEUR EXISTENT, ET LEURS MARCHES AUSSI', () => {
    // UN EXERCICE EST UN GÉNÉRATEUR PLUS UNE ACTIVITÉ, et c'est ce qui rend
    // l'entraînement aux automatismes presque gratuit. Rémy : « et puis après
    // viser des automatismes […] comment rendre cela un peu ludique et
    // vraiment ancrer les réflexes ».
    const portes = exercices.filter(e => e.generatorId === 'num.relatifs.melange');
    assert.equal(portes.length, 4, `${portes.length} exercice(s) sur ce générateur`);
    assert.deepEqual(portes.map(e => e.activityId).sort(),
        ['buttons', 'moles', 'sprint', 'sprint']);

    // ET LES MARCHES PRÉRÉGLÉES EXISTENT VRAIMENT. Un identifiant mal recopié
    // ne lève aucune erreur : la liste cochée devient vide, et l'exercice
    // retombe sur la première marche — donc sur le contraire de ce qu'on a
    // préparé, sans que rien ne le dise.
    const connus = new Set(ETAPES.map(e => e.id));
    for (const e of portes) {
        for (const m of (e.params && e.params.marches) || []) {
            assert.ok(connus.has(m), `${e.id} coche « ${m} », qui n'est pas une marche`);
        }
    }
    // DEUX CHRONOS, ET ILS NE FONT PAS LA MÊME CHOSE — c'est un arbitrage de
    // RÉMY qui renverse le mien.
    //
    // J'avais écrit, en montant le premier : « un chronomètre sur un calcul
    // mental demande deux choses à la fois, et n'ancre ni l'une ni l'autre ».
    // Lui, après l'avoir vu en classe : « pour les sommes et produits il faut
    // aussi faire faire des calculs pas que le signe ». L'un ancre le CHOIX de
    // la règle, l'autre son APPLICATION, et l'ordre dans lequel on les prend
    // est tout.
    const signe = exercices.find(e => e.id === 'num-relatifs-melange-sprint');
    const calcul = exercices.find(e => e.id === 'num-relatifs-melange-calcul');
    assert.ok(signe && calcul, 'une des deux portes chrono manque');
    assert.ok(signe.params.marches.every(m => marche(m) && !marche(m).calcul),
        `« ${signe.title} » chronomètre une marche où il faut calculer`);
    assert.ok(calcul.params.marches.length >= 2
        && calcul.params.marches.every(m => marche(m) && marche(m).calcul),
        `« ${calcul.title} » ne fait pas calculer — c'était tout le sujet de la demande`);

    // ET UN TITRE QUI MENT COÛTE UNE SÉANCE. L'arcade s'appelait « Attrape le
    // Bon Signe » alors que ses marches DEMANDENT le résultat depuis le
    // premier jour : un professeur qui la prenait pour travailler le signe
    // recevait du calcul mental.
    for (const p of portes) {
        const calcule = (p.params && p.params.marches || [])
            .every(m => marche(m) && marche(m).calcul);
        if (calcule) {
            assert.ok(!/signe/i.test(p.title),
                `« ${p.title} » annonce le signe et demande le résultat`);
        }
    }
});
