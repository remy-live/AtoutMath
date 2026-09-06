// LES AIDES DU « ? » — celles qu'on lit dans le panneau de réglages.
//
// Rémy : « je trouve aussi que l'aide proposée dans les réglages lorsqu'on
// appuie sur le ? sont un peu compliquées, il faudrait les simplifier. »
//
// IL AVAIT RAISON, ET LA MESURE LE DISAIT. Sur 307 aides, la médiane faisait
// 200 caractères, la moyenne 216, et la plus longue 821 — un paragraphe entier
// derrière un point d'interrogation. Elles ne disaient pas ce que le réglage
// CHANGE : elles justifiaient le choix pédagogique, racontaient l'histoire du
// réglage, enseignaient la notion. Tout cela a sa place — dans les commentaires
// du code, où il est écrit pour celui qui modifie, pas pour celui qui prépare
// une séance.
//
// LA RÈGLE TIENT EN UNE PHRASE : une aide dit ce que le réglage change, en une
// ou deux phrases courtes. Ce test la fait tenir. Sans lui, la dérive
// reviendrait — chacune de ces aides a été écrite de bonne foi, une à la fois,
// et c'est l'accumulation qui les avait rendues illisibles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
// L'IMPORT QUI FAIT TOUT LE RELEVÉ. Sans lui, les générateurs ne sont pas
// enregistrés et `paramSchemaOf` ne rend que les réglages écrits dans le
// catalogue : 117 aides au lieu de 169, et le test croirait mesurer l'ensemble.
import '../js/core/activities/index.js';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';

/** Toutes les aides du catalogue, telles que l'écran les affiche. */
function toutesLesAides() {
    const vues = new Map();
    exercices.forEach(exo => paramSchemaOf(exo).forEach(p => {
        if (p && p.aide) vues.set(p.aide, { exo: exo.id, param: p.id, label: p.label, aide: p.aide });
    }));
    return [...vues.values()];
}

/** La limite : deux phrases courtes. Mesurée, pas devinée — voir l'en-tête. */
const MAX = 200;

test('UNE AIDE DE RÉGLAGE TIENT EN DEUX PHRASES COURTES', () => {
    const trop = toutesLesAides()
        .filter(a => a.aide.length > MAX)
        .map(a => `${a.exo} · ${a.param} (${a.aide.length}) : ${a.aide.slice(0, 70)}…`);
    assert.deepEqual(trop, [],
        `Ces aides dépassent ${MAX} caractères. Le « ? » dit ce que le réglage CHANGE ; `
        + 'le pourquoi va dans un commentaire du code.');
});

test('et elle dit quelque chose', () => {
    // Une aide vide ou d'un mot est pire qu'une aide absente : le « ? »
    // s'affiche, on le touche, et il ne répond rien.
    toutesLesAides().forEach(a => {
        assert.ok(a.aide.trim().length >= 30,
            `${a.exo} · ${a.param} : aide trop courte pour dire quoi que ce soit`);
        assert.ok(/[.!?…]$/.test(a.aide.trim()),
            `${a.exo} · ${a.param} : l'aide ne finit pas par une phrase — ${a.aide.slice(-40)}`);
    });
});

test('LA MOYENNE RESTE COURTE, PAS SEULEMENT LE PIRE', () => {
    // Un plafond seul laisserait passer trois cents aides de 199 caractères.
    // Mesuré après la simplification : médiane 146, moyenne 136. On garde de la
    // marge pour les réglages qui ont vraiment besoin de deux phrases pleines.
    const l = toutesLesAides().map(a => a.aide.length).sort((a, b) => a - b);
    const mediane = l[Math.floor(l.length / 2)];
    const moyenne = l.reduce((s, x) => s + x, 0) / l.length;
    assert.ok(mediane <= 165, `médiane des aides : ${mediane} caractères`);
    assert.ok(moyenne <= 160, `moyenne des aides : ${Math.round(moyenne)} caractères`);
    assert.ok(l.length > 150, `seulement ${l.length} aides relevées : le test ne mesure plus rien`);
});
