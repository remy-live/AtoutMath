// L'APPAREIL CHOISI PAR LE PROFESSEUR DOIT SURVIVRE AU VOLET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je suis dans la zone prof, j'ai mis aperçu en ordinateur, je
// commence à faire l'exercice, je clique sur le robot et là ça se met en mode
// téléphone ».
//
// MESURÉ (tools/robotGardeLAppareil.mjs), avant correction :
//
//   appareil=none    exercice 1400 px → robot  400 px
//   appareil=tablet  exercice  768 px → robot  400 px
//
// TROIS PAS, ET LE RÉGLAGE SE PERDAIT AU DEUXIÈME : le volet lance bien avec
// `apercuAppareil` ; le Runner écrase ensuite `state.activeExo` avec l'entrée
// BRUTE du catalogue ; et le robot, qui redemande le cadre, retombe sur
// `state.previewDeviceMode` — « mobile » au démarrage, et personne ne clique
// les boutons d'aperçu DANS un cadre.
//
// CE QUE CETTE ÉPREUVE GARDE, ET CE QU'ELLE NE PEUT PAS GARDER. Elle garde le
// CÂBLAGE : le volet assied l'appareil dans son propre état, et la traduction
// entre les deux vocabulaires reste juste dans les deux sens. Elle ne peut pas
// mesurer des pixels — c'est trois pas et deux pages, et c'est le travail de
// la sonde. Les deux se complètent, et la sonde est nommée ci-dessus pour
// qu'on sache où la trouver.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('LE VOLET ASSIED L\'APPAREIL DANS SON PROPRE ÉTAT', () => {
    const src = lire('js/ui/atelier.js');
    assert.match(src,
        /if \(appareil\) etatDuVolet\.previewDeviceMode = appareil === 'none' \? 'desktop' : appareil;/,
        'sans cette ligne, le cadre garde son « mobile » de démarrage et le robot y retombe');
    // ET ELLE DOIT ÊTRE POSÉE AVANT QUE LE JEU NE S'OUVRE : après, le robot
    // aurait déjà lu l'ancienne valeur.
    assert.ok(src.indexOf('etatDuVolet.previewDeviceMode') < src.indexOf('openGameLayer({ ...complet'),
        'le réglage s\'assied avant l\'ouverture du jeu');
});

test('ET LES DEUX VOCABULAIRES SE TRADUISENT DANS LES DEUX SENS', () => {
    // `cadreDe()` attend « none » pour le plein écran là où le bouton d'aperçu
    // dit « desktop ». Deux traductions existent, et si l'une change sans
    // l'autre, le plein écran devient un téléphone sans qu'aucune erreur ne
    // paraisse — c'est très exactement le défaut qu'on vient de corriger.
    const atelier = lire('js/ui/atelier.js');
    const engine = lire('js/games/engine.js');
    // Aller : l'état du professeur → l'adresse du volet.
    assert.match(atelier, /return m === 'desktop' \|\| !m \? 'none' : m;/,
        'appareilDuProf traduit « desktop » en « none » pour l\'adresse');
    // Retour : l'état du volet → le cadre.
    assert.match(engine, /state\.previewDeviceMode === 'desktop' \? 'none' : state\.previewDeviceMode/,
        'cadreDe retraduit « desktop » en « none »');
});

test('ET LE CADRE POSÉ SUR L\'EXERCICE GARDE LA PRIORITÉ', () => {
    // C'est le chemin qu'emprunte le contrôle du catalogue, qui lance le MÊME
    // exercice dans trois formats sans toucher au réglage du professeur. Le
    // retirer ferait jouer les trois dans le même cadre, et le rapport
    // montrerait trois fois la même image sans le dire.
    const engine = lire('js/games/engine.js');
    const i = engine.indexOf('export function cadreDe');
    const bloc = engine.slice(i, engine.indexOf('}', i));
    assert.ok(bloc.indexOf('exo.apercuAppareil') < bloc.indexOf('previewDeviceMode'),
        'l\'appareil posé sur le descripteur passe avant le réglage global');
});
