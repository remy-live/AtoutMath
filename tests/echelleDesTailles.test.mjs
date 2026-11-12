// L'ÉCHELLE DES TAILLES : ce qui doit être vrai pour que le jeu soit jouable.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aime le fait de ranger sur une échelle de taille. On donne l'objet
// (en svg) sa valeur sous la forme de 10^... et on range. »
//
// ── CE QUE CES ÉPREUVES GARDENT ────────────────────────────────────────────
//
// 1. DEUX OBJETS NE PARTAGENT JAMAIS UNE CASE. S'ils la partageaient, la
//    seconde carte n'aurait plus de place : l'élève aurait raison et le jeu
//    tort, ce qu'un exercice ne peut pas se permettre. Aujourd'hui aucun
//    exposant n'est en double dans la liste — mais la liste grandira, et
//    ajouter « une porte · 10⁰ m » à côté de « un élève · 10⁰ m » est
//    exactement le genre d'ajout qu'on fait sans y penser.
//
// 2. PLUS DE CASES QUE D'OBJETS. Si la frise était pleine, les deux dernières
//    cartes se placeraient PAR ÉLIMINATION, sans lire aucun exposant — et
//    c'est précisément l'exercice qu'on ne veut pas.
//
// 3. AUCUN OBJET HORS DE SON ÉCHELLE. Un objet dont l'exposant tombe hors des
//    cases affichées serait une carte qu'on ne peut poser nulle part. Le jeu
//    ne planterait pas : il resterait bloqué, ce qui est pire.
//
// 4. LES DESSINS DESSINENT QUELQUE CHOSE. Un fragment SVG vide ou mal écrit ne
//    lève aucune erreur — il ne trace rien. La carte montre alors un cadre
//    vide, et cela ne se voit qu'à l'œil, sur la photo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    OBJETS, MONDES, NOMS_MONDES, casesDuMonde, objetsDuMonde,
    tirerDesObjets, puissanceTexte, ecritureDecimale, texteDeLaCarte, ECRITURES
} from '../js/core/echelleDesTailles.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';

test('DEUX OBJETS NE PARTAGENT JAMAIS UNE CASE', () => {
    const vus = new Map();
    for (const o of OBJETS) {
        assert.ok(!vus.has(o.exposant),
            `« ${o.nom} » et « ${vus.get(o.exposant)} » sont tous deux à 10^${o.exposant} : `
            + 'la seconde carte n’aurait plus de place');
        vus.set(o.exposant, o.nom);
    }
});

test('LES OBJETS SONT RANGÉS DU PLUS PETIT AU PLUS GRAND', () => {
    // CE N'EST PAS DE LA COQUETTERIE : la démonstration remplit l'échelle par
    // le bas, et c'est cet ordre qui fait voir l'échelle se construire.
    for (let i = 1; i < OBJETS.length; i++) {
        assert.ok(OBJETS[i].exposant > OBJETS[i - 1].exposant,
            `« ${OBJETS[i].nom} » devrait venir après « ${OBJETS[i - 1].nom} »`);
    }
});

test('CHAQUE MONDE A NEUF CASES, DE LA PLUS GRANDE À LA PLUS PETITE', () => {
    for (const id of NOMS_MONDES) {
        const cases = casesDuMonde(id);
        assert.equal(cases.length, 9, `${id} : neuf cases, c’est ce qui tient en hauteur`);
        assert.equal(cases[0], MONDES[id].haut, 'la plus grande en premier : on lit de haut en bas');
        assert.equal(cases[8], MONDES[id].bas);
    }
});

test('AUCUN OBJET NE TOMBE HORS DE SON ÉCHELLE', () => {
    for (const id of NOMS_MONDES) {
        const cases = new Set(casesDuMonde(id));
        for (const o of objetsDuMonde(id)) {
            assert.ok(cases.has(o.exposant),
                `« ${o.nom} » (10^${o.exposant}) n’a pas de case dans « ${id} »`);
        }
    }
});

test('ET CHAQUE MONDE A DE QUOI JOUER, SANS JAMAIS REMPLIR LA FRISE', () => {
    for (const id of NOMS_MONDES) {
        const n = objetsDuMonde(id).length;
        assert.ok(n >= 6, `« ${id} » n’a que ${n} objets : trop peu pour varier les tirages`);
        // PLUS DE CASES QUE D'OBJETS TIRÉS. On en tire six au maximum, pour
        // neuf cases : les trois cases vides sont ce qui empêche de placer par
        // élimination.
        for (const combien of [3, 5, 6]) {
            const tire = tirerDesObjets({ monde: id, combien }, makeRng(`t-${id}-${combien}`));
            assert.equal(tire.length, combien);
            assert.ok(tire.length < casesDuMonde(id).length,
                'il doit rester des cases vides');
            const expos = tire.map(o => o.exposant);
            assert.equal(new Set(expos).size, expos.length,
                'deux objets tirés ne peuvent pas viser la même case');
        }
    }
});

test('LES DESSINS DESSINENT QUELQUE CHOSE', () => {
    for (const o of OBJETS) {
        assert.ok(o.svg && o.svg.length > 20, `« ${o.nom} » n’a pas de dessin`);
        assert.match(o.svg, /<(circle|path|rect|ellipse|line|polyline|polygon)\b/,
            `« ${o.nom} » : un fragment sans élément graphique ne trace RIEN, en silence`);
        // RIEN D'EXÉCUTABLE DANS UN FRAGMENT QU'ON INSÈRE TEL QUEL. Ces
        // dessins viennent du dépôt, jamais de l'élève — mais c'est le genre
        // de porte qu'on laisse ouverte une fois et qu'on oublie.
        assert.ok(!/<script|\son\w+\s*=/i.test(o.svg),
            `« ${o.nom} » : un fragment inséré tel quel ne doit rien exécuter`);
        assert.ok(o.taille && o.taille.length > 5,
            `« ${o.nom} » doit dire sa taille en français : c’est ce qu’on lit une fois posé`);
    }
});

test('LES PUISSANCES S’ÉCRIVENT EN PETITS CHIFFRES, AVEC LE VRAI SIGNE', () => {
    assert.equal(puissanceTexte(4), '10⁴');
    assert.equal(puissanceTexte(0), '10⁰');
    assert.equal(puissanceTexte(13), '10¹³');
    // LE SIGNE MOINS EN EXPOSANT (U+207B), jamais un tiret de clavier : le
    // dépôt a une épreuve qui refuse le tiret dans un énoncé, et elle a
    // raison — les deux ne se ressemblent qu’à l’écran d’un adulte.
    assert.equal(puissanceTexte(-4), '10⁻⁴');
    assert.ok(!puissanceTexte(-7).includes('-'));
});

test('LA CARTE NE DIT PAS LA MÊME CHOSE QUE LA CASE', () => {
    // RÉMY : « c'est hyper facile l'échelle des tailles, il suffit de placer
    // 10^4 à 10^4, où est la recherche ? »
    //
    // C'EST L'ÉPREUVE QUI GARDE LA RÉPONSE À CETTE QUESTION. Si la carte
    // reprenait l'écriture de la case, l'exercice redeviendrait un
    // appariement de deux étiquettes identiques — sans une ligne de
    // mathématiques, et sans que rien ne le signale.
    const o = OBJETS.find(x => x.exposant === -4);
    assert.equal(texteDeLaCarte(o, 'decimale'), '\u2248 0,000\u00a01 m');
    assert.equal(texteDeLaCarte(o, 'nom'), '', 'le nom seul : aucune valeur sur la carte');
    assert.equal(texteDeLaCarte(o, 'puissance'), '\u2248 10\u207B\u2074 m');
    // LE « ≈ » EST OBLIGATOIRE, et c'est une question de justesse : les
    // valeurs sont des puissances PURES, donc la carte d'un élève porte
    // « 1 m » quand un élève mesure un mètre soixante. Sans le signe,
    // l'exercice affirme quelque chose de faux. Vu sur la mesure.
    for (const e of ['decimale', 'puissance']) {
        assert.ok(texteDeLaCarte(o, e).startsWith('\u2248 '),
            `« ${texteDeLaCarte(o, e)} » : un ordre de grandeur s’annonce comme tel`);
    }
    for (const e of ECRITURES) {
        if (e === 'puissance') continue;
        assert.notEqual(texteDeLaCarte(o, e), `${puissanceTexte(o.exposant)} m`,
            `l\u2019écriture « ${e} » ne doit pas recopier l\u2019étiquette de la case`);
    }
    // ET UNE ÉCRITURE INCONNUE RETOMBE SUR LA DÉCIMALE, jamais sur la
    // puissance : un réglage mal orthographié ne doit pas ramener en silence
    // l'exercice que Rémy a jugé trop facile.
    assert.equal(texteDeLaCarte(o, 'nimporte'), texteDeLaCarte(o, 'decimale'));
});

test('L\u2019ÉCRITURE DÉCIMALE EST CELLE D\u2019UNE PUISSANCE PURE', () => {
    // RÉMY : « par contre reste sur des puissances de 10 ». Donc jamais de
    // 1,27 × 10⁷ : le chiffre significatif est TOUJOURS un seul 1. Cela
    // écarte au passage l'ambiguïté des mantisses autour de 5 — le mont Blanc
    // à 4 810 m est d'ordre 10³, mais 4 810 est plus proche de 10 000, et
    // l'élève qui répondrait 10⁴ aurait un raisonnement défendable.
    for (const o of OBJETS) {
        const d = ecritureDecimale(o.exposant);
        assert.equal((d.match(/[1-9]/g) || []).length, 1,
            `« ${d} » doit n\u2019avoir qu\u2019un seul chiffre significatif`);
        assert.ok(d.includes('1'), `« ${d} » : ce chiffre est un 1`);
    }
    assert.equal(ecritureDecimale(0), '1');
    assert.equal(ecritureDecimale(4), '10\u00a0000');
    assert.equal(ecritureDecimale(-4), '0,000\u00a01');
    // LES ESPACES SONT INSÉCABLES : « une tranche de milliers qui passe à la
    // ligne ressemble à deux nombres ».
    assert.ok(!ecritureDecimale(13).includes(' '), 'pas une seule espace ordinaire');
});


test('L’EXERCICE EST AU CATALOGUE, AVEC SES TROIS MONDES', () => {
    const exo = getExerciseById('num-echelle-tailles');
    assert.ok(exo, 'num-echelle-tailles manque au catalogue');
    assert.equal(exo.activityId, 'frise-puissances');
    const monde = (exo.paramSchema || []).find(p => p.id === 'monde');
    assert.ok(monde, 'le réglage du monde manque');
    for (const o of monde.options) {
        assert.ok(MONDES[o.value], `« ${o.value} » n’est pas un monde connu`);
    }
    // ET JAMAIS PLUS DE SIX OBJETS, pour la raison dite plus haut.
    const objets = (exo.paramSchema || []).find(p => p.id === 'objets');
    assert.ok(objets.options.every(o => Number(o.value) <= 6),
        'au-delà de six, les dernières cartes se placeraient par élimination');
});
