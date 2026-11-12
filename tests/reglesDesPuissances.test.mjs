// LES RÈGLES DES PUISSANCES, ET LE JEU QUI BOUGE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX DEMANDES DE RÉMY, LE MÊME JOUR :
//
//   « et un exercice sur les règles sur les puissances 10^3 * 10^2 =
//     10^(3+2) = 10^5 et on écrit l'opération sur les exposants à chaque fois »
//
//   « on peut faire un mode rigolo ou les cases bougent 🙂 »
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ÇA NE SE VOIT PAS AUTREMENT ────
//
// UN IDENTIFIANT DE MARCHE MAL ORTHOGRAPHIÉ NE DIT RIEN. `marchesCochees` ne
// rend JAMAIS une liste vide — c'est écrit dans `core/progression.js`, et
// c'est la bonne décision : « tout décocher est un geste qu'on fait en
// passant ». Mais la conséquence ici est redoutable : si l'un des cinq
// identifiants de cette entrée cessait de correspondre à une marche du
// générateur — renommée, supprimée, mal tapée —, l'exercice retomberait
// silencieusement sur les NEUF marches, et rouvrirait sur « Combien vaut
// 10³ ? », c'est-à-dire sur le défaut même qu'on vient de fermer. Rien ne
// planterait, aucun message n'apparaîtrait.
//
// C'est précisément le genre de panne qu'une épreuve doit tenir, parce qu'un
// professeur, lui, croirait simplement que le logiciel a changé d'avis.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExerciseById } from '../js/data/catalog.js';
import { ORDRE, ETAPES, puissancesCalculGenerator } from '../js/core/generators/puissancesCalcul.js';
import { makeRng } from '../js/core/ids.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';

test('LES RÈGLES DES PUISSANCES OUVRENT SUR UNE RÈGLE', () => {
    const exo = getExerciseById('num-puissances-regles');
    assert.ok(exo, 'num-puissances-regles manque au catalogue');
    assert.equal(exo.generatorId, 'num.puissances-calcul',
        'pas une ligne de moteur à elle : c’est le générateur qui existait');
    // LA LIGNE DU MILIEU EST TOUT L'OBJET DE LA DEMANDE : « on écrit
    // l'opération sur les exposants à chaque fois ».
    assert.equal(exo.params.etapes, 'oui');
});

test('LES CINQ MARCHES CHOISIES EXISTENT VRAIMENT', () => {
    const exo = getExerciseById('num-puissances-regles');
    const connues = new Set(ORDRE);
    for (const id of exo.params.marches) {
        assert.ok(connues.has(id),
            `« ${id} » n’est pas une marche du générateur : l’exercice retomberait `
            + 'en silence sur les neuf, donc sur « Combien vaut 10³ ? »');
    }
});

test('ET CE SONT LES MARCHES OÙ L’ON ÉCRIT SUR LES EXPOSANTS', () => {
    const exo = getExerciseById('num-puissances-regles');
    const pris = new Set(exo.params.marches);
    // LES TROIS RÈGLES DU PROGRAMME, avec et sans exposants négatifs.
    for (const id of ['produit', 'quotient', 'produitRelatif', 'quotientRelatif',
        'puissanceDePuissance']) {
        assert.ok(pris.has(id), `la marche « ${id} » devrait être travaillée ici`);
    }
    // ET PAS CELLES OÙ IL N'Y A RIEN À ÉCRIRE SUR LES EXPOSANTS. 2⁵ et (−3)²
    // sont des puissances, pas des règles : la ligne du milieu y dirait
    // « 2 × 2 × 2 × 2 × 2 », ce qui est juste et hors sujet ici.
    for (const id of ['valeur', 'carreNegatif']) {
        assert.ok(!pris.has(id),
            `la marche « ${id} » n’a pas d’opération sur les exposants à écrire`);
    }
    // Les marches existent toujours ailleurs : on ne les a retirées à personne.
    const calcul = getExerciseById('num-puissances-calcul');
    assert.ok(calcul && !calcul.params?.marches,
        '« Calculer avec des Puissances » garde ses neuf marches');
    assert.ok(ETAPES.some(e => e.id === 'valeur'));
});

test('ET ELLES ONT UN CODE DICTÉ', () => {
    const code = CODES_EXERCICES['num-puissances-regles'];
    assert.match(code || '', /^[A-Z]{2}$/);
    // L'ALPHABET À 23 LETTRES : ni I, ni O, ni Q — elles se confondent à
    // l'oral et à l'écrit avec 1, 0 et G.
    assert.ok(!/[IOQ]/.test(code), `« ${code} » emploie une lettre interdite`);
});

test('CHAQUE EXPOSANT NÉGATIF PREND SES PARENTHÈSES', () => {
    // RÉMY : « pour 10^(-3) / 10^(-5) il faut bien faire l'opération
    // 10^((-3)-(-5)) pour bien comprendre le principe. »
    //
    // ON N'ÉCRIVAIT LES PARENTHÈSES QUE SUR LE SECOND — « −8 − (−3) » —, ce
    // qui est juste et ne montre qu'à MOITIÉ ce qu'on fait. MESURÉ AU
    // NAVIGATEUR avant de corriger : le gabarit affichait « □^(−□ − (…)) ».
    // L'élève doit voir DEUX NOMBRES RELATIFS et une opération entre eux.
    const MOINS = '\u2212';
    let vus = 0;
    for (let i = 0; i < 40; i++) {
        const q = puissancesCalculGenerator.generate(
            { etapes: 'oui', marches: ['quotientRelatif'] },
            { rng: makeRng(`quotient-${i}`), index: 0 });
        const montrer = (q.meta?.etapes || [])[0]?.montrer || '';
        if (!montrer) continue;
        vus++;
        assert.match(montrer,
            new RegExp(`^10\\^\\(\\(${MOINS}\\d+\\) ${MOINS} \\(${MOINS}\\d+\\)\\)$`),
            `« ${montrer} » : les DEUX exposants doivent être entre parenthèses`);
        // ET LE MODÈLE QUE L\u2019ÉLÈVE VOIT porte les mêmes parenthèses :
        // c\u2019est lui qui dit quoi écrire. MESURÉ AU NAVIGATEUR avant la
        // correction : « □^(−□ − (…)) ».
        assert.match((q.meta.etapes[0].modele || ''), /\(\(…\)/,
            `le modèle « ${q.meta.etapes[0].modele} » doit ouvrir sur deux parenthèses`);
    }
    assert.ok(vus > 0, 'aucune ligne du milieu tirée : l\u2019épreuve ne mesure rien');
});

test('LE MODE RIGOLO EST UN RÉGLAGE, ET IL EST DÉCOCHÉ AU DÉPART', () => {
    const exo = getExerciseById('num-puissances-relier');
    const reglage = (exo.paramSchema || []).find(p => p.id === 'bougent');
    assert.ok(reglage, 'le réglage « les cases bougent » manque');
    assert.equal(reglage.type, 'checkbox');
    // DÉCOCHÉ AU DÉPART, et c'est le fond de la décision : une carte qui
    // dérive demande de VISER, ce qui n'est pas ce qu'on travaille le premier
    // jour. Le jeu reste un exercice de lecture ; le mouvement est un extra.
    assert.equal(reglage.default, false);
    assert.notEqual(exo.params.bougent, true,
        'l’exercice du catalogue ne doit pas ouvrir en mode rigolo');
});
