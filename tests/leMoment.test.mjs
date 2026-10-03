// LE MOMENT — ce que le professeur décide pour toute la classe.
//
// Rémy : « lorsque les élèves se connectent, j'impose la séance, comme cela ils
// n'ont rien à lancer » et « pour le compte à rebours c'est pour terminer la
// séance ou mettre en pause ».
//
// CE QUI SE VÉRIFIE ICI EST LA DÉCISION, PAS LE DESSIN. Ouvrir une séance chez
// un élève, c'est remplacer ce qu'il a sous les yeux : il faut donc savoir
// exactement QUAND on s'y autorise, et les trois refus valent autant que le
// oui. Un seul d'entre eux qui saute, et c'est un élève au hasard qui perd sa
// réponse toutes les dix secondes, sans que personne ne comprenne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { fautIlOuvrir, enMinutes } from '../js/ui/leMoment.js';
import { appliquerEtat, tempsRestant, seanceImposee } from '../js/core/seanceDistante.js';
import { makePath, makeStep, normalizePath } from '../js/core/path.js';
import { defaultPolicy } from '../js/core/policy.js';
import { identiteDeParcours } from '../js/core/shortcodes.js';

const unParcours = (nom = 'Devoir du mardi') => makePath(nom, [
    makeStep('calc-add', {}, { stepId: 'a', nbItems: 5, threshold: 4 })
], defaultPolicy());

const impose = (parcours) => ({
    pathId: parcours.id, name: parcours.name, path: JSON.parse(JSON.stringify(parcours))
});

// ─────────────────────────────────────────────── LA SÉANCE IMPOSÉE ──────────

test('une séance imposée s\'ouvre quand l\'élève n\'a rien en cours', () => {
    const d = fautIlOuvrir(impose(unParcours()), null, false);
    assert.equal(d.ouvrir, true);
    assert.equal(d.pourquoi, 'a-ouvrir');
});

test('ON N\'ARRACHE JAMAIS UNE QUESTION EN COURS', () => {
    // La synchronisation tourne toutes les dix secondes : sans ce refus, un
    // élève au hasard perdrait sa réponse six fois par minute.
    const d = fautIlOuvrir(impose(unParcours()), null, true);
    assert.equal(d.ouvrir, false);
    assert.equal(d.pourquoi, 'il-travaille');
});

test('on ne rouvre pas le parcours qu\'il a déjà sous les yeux', () => {
    // C'est le cas COURANT, pas un cas limite : l'état revient toutes les dix
    // secondes avec la même séance imposée. Sans ce refus, l'élève repartirait
    // de la première question à chaque battement.
    const p = unParcours();
    const identite = identiteDeParcours(normalizePath(p, p.name));
    const d = fautIlOuvrir(impose(p), identite, false);
    assert.equal(d.ouvrir, false);
    assert.equal(d.pourquoi, 'deja-dessus');
});

test('rien d\'imposé, rien à ouvrir', () => {
    assert.equal(fautIlOuvrir(null, null, false).ouvrir, false);
    assert.equal(fautIlOuvrir({ pathId: 'x' }, null, false).ouvrir, false);
});

test('une AUTRE séance imposée remplace celle qui est chargée', () => {
    // Le professeur change d'exercice en cours d'heure : l'élève qui n'est pas
    // en train de répondre doit suivre.
    const d = fautIlOuvrir(impose(unParcours('Le second')), 'path_autre_chose', false);
    assert.equal(d.ouvrir, true);
});

// ───────────────────────────────────────────────── LE COMPTE À REBOURS ──────

test('LE TEMPS RESTANT EST CORRIGÉ DE L\'ÉCART ENTRE LES HORLOGES', () => {
    // Une tablette réglée dix minutes en avance afficherait « temps écoulé »
    // pendant que la classe travaille encore. Le serveur envoie l'instant de
    // fin ET son heure à lui ; on note l'heure qu'il était ici à la réception,
    // et la différence ne bouge plus.
    //
    // Ici : le serveur dit qu'il est 1 000 et que ça finit à 1 300 (cinq
    // minutes). L'appareil, lui, croit qu'il est 2 000 — mille secondes
    // d'avance. Il doit quand même afficher cinq minutes.
    // L'appareil est mille secondes EN AVANCE sur le serveur.
    const S = 1_800_000_000;          // l'heure du serveur
    const AVANCE = 1000;              // ce que l'appareil croit en plus
    appliquerEtat(
        { className: '4A', maintenant: S, chrono: { finAt: S + 300, aZero: 'terminer' } },
        S + AVANCE                    // l'heure qu'il \u00e9tait ICI \u00e0 la r\u00e9ception
    );
    // Cinq secondes plus tard, pour l'appareil :
    const t = tempsRestant(S + AVANCE + 5);
    assert.ok(t, 'il y a un chrono');
    assert.equal(t.aZero, 'terminer');
    assert.equal(t.reste, 295, 'les mille secondes d\'avance sont annul\u00e9es');

    // ET SANS L'HEURE DU SERVEUR, ON NE CORRIGE RIEN plut\u00f4t que de corriger
    // n'importe comment : un champ absent valait z\u00e9ro, donc un d\u00e9calage de
    // cinquante-six ans, donc un compte \u00e0 rebours absurde.
    appliquerEtat({ className: '4A', chrono: { finAt: S + 300, aZero: 'terminer' } }, S);
    assert.equal(tempsRestant(S).reste, 300);
});

test('le temps restant ne descend jamais sous zéro', () => {
    // ON LE VOIT D'ABORD COURIR : depuis que « Temps écoulé » ne s'annonce
    // qu'à ceux qui l'ont vu courir, un chrono appliqué DÉJÀ expiré ne donne
    // plus rien du tout — c'est l'épreuve suivante qui garde cela.
    const n = Math.floor(Date.now() / 1000);
    appliquerEtat({ chrono: { finAt: n + 30, aZero: 'pause' }, maintenant: n });
    const t = tempsRestant(n + 100);
    assert.equal(t.reste, 0);
    assert.equal(t.aZero, 'pause');
});

// ── UN COMPTE À REBOURS NE CONCERNE QUE CEUX QUI L'ONT VU COURIR ────────────
//
// RÉMY, séance donnée en deux fois : « j'ai arrêté avec le compte à rebours le
// premier groupe et du coup quand le deuxième groupe s'est connecté, il avait
// l'information temps écoulé ».
//
// Le compte à rebours est une donnée de CLASSE, gardée au serveur, et rien ne
// l'efface quand il tombe à zéro. Le second groupe se connectait donc sur un
// temps écoulé qui ne le concernait pas : pour ces élèves, la séance était
// finie avant d'avoir commencé.

test('UN ÉLÈVE QUI ARRIVE APRÈS LA FIN NE VOIT PAS « TEMPS ÉCOULÉ »', () => {
    // Le second groupe. Il se connecte, le serveur lui tend l'état de la
    // classe — chrono compris —, et cet état porte la fin de l'heure d'avant.
    const n = Math.floor(Date.now() / 1000);
    appliquerEtat({ className: '4A', maintenant: n, chrono: { finAt: n - 1800, aZero: 'terminer' } });
    assert.equal(tempsRestant(n), null,
        'le second groupe hérite du temps écoulé du premier');
});

test('MAIS CELUI QUI L\'A VU COURIR LE VOIT TOMBER', () => {
    // L'autre moitié, et celle qu'on casse en corrigeant la première : le
    // chrono doit continuer de servir à ceux pour qui il a été lancé.
    const n = Math.floor(Date.now() / 1000);
    // Il était là quand il courait.
    appliquerEtat({ className: '4A', maintenant: n, chrono: { finAt: n + 60, aZero: 'terminer' } });
    assert.equal(tempsRestant(n).reste, 60);
    // Une minute plus tard, le serveur redit la même chose — elle est passée.
    appliquerEtat({ className: '4A', maintenant: n + 61, chrono: { finAt: n + 60, aZero: 'terminer' } },
        n + 61);
    const t = tempsRestant(n + 61);
    assert.ok(t, 'celui qui a vu le chrono courir n\'apprend pas qu\'il est fini');
    assert.equal(t.reste, 0);
});

test('LE SOUVENIR NE DÉBORDE PAS SUR LE CHRONO SUIVANT', () => {
    // Le professeur relance un compte à rebours pour le second groupe : c'est
    // un AUTRE instant de fin, donc un autre chrono. Le souvenir du premier ne
    // doit ni l'annoncer d'avance, ni l'empêcher de s'annoncer.
    const n = Math.floor(Date.now() / 1000);
    appliquerEtat({ maintenant: n, chrono: { finAt: n + 10, aZero: 'terminer' } });
    assert.ok(tempsRestant(n), 'le premier court');
    // Le second, lancé plus tard, mais que cet appareil reçoit DÉJÀ expiré —
    // c'est le cas du troisième groupe, s'il y en avait un.
    appliquerEtat({ maintenant: n + 5000, chrono: { finAt: n + 4000, aZero: 'terminer' } }, n + 5000);
    assert.equal(tempsRestant(n + 5000), null,
        'le souvenir du premier chrono fait annoncer la fin du second');
});

test('sans chrono, il n\'y a pas de chrono', () => {
    appliquerEtat({ className: '4A' });
    assert.equal(tempsRestant(), null);
});

test('« 07:12 », et jamais « 432 secondes »', () => {
    assert.equal(enMinutes(432), '07:12');
    assert.equal(enMinutes(0), '00:00');
    assert.equal(enMinutes(59), '00:59');
    assert.equal(enMinutes(60), '01:00');
    assert.equal(enMinutes(3599), '59:59');
    // Un temps négatif ne s'affiche pas en négatif : on est à zéro.
    assert.equal(enMinutes(-5), '00:00');
});

test('l\'issue par défaut est « terminer », jamais rien', () => {
    // Un chrono sans issue écrite est un chrono qui, à zéro, ne ferait rien —
    // et le professeur croirait avoir ramassé les copies.
    appliquerEtat({ chrono: { finAt: Math.floor(Date.now() / 1000) + 60 }, maintenant: 0 });
    assert.equal(tempsRestant().aZero, 'terminer');
});

// ───────────────────────────────────────────── CE QUI TRAVERSE L'ÉTAT ───────

test('la séance imposée traverse l\'état de séance telle quelle', () => {
    const p = unParcours();
    appliquerEtat({ className: '4A', impose: impose(p) });
    const lu = seanceImposee();
    assert.equal(lu.name, 'Devoir du mardi');
    assert.equal(lu.path.steps.length, 1);
});

test('un état sans moment efface le moment précédent', () => {
    // C'est ainsi que le professeur ARRÊTE : il retire, et le prochain état
    // rendu ne porte plus rien. Si l'on fusionnait au lieu de remplacer, un
    // chrono arrêté continuerait de tourner chez les élèves.
    appliquerEtat({ chrono: { finAt: 9e9, aZero: 'pause' }, impose: { pathId: 'x', path: {} } });
    assert.ok(tempsRestant());
    appliquerEtat({ className: '4A' });
    assert.equal(tempsRestant(), null);
    assert.equal(seanceImposee(), null);
});

test('ON NE RAMASSE PAS DE COPIES — il n\'y en a pas', () => {
    // RÉMY : « c'est noté à Zéro on ramasse les copies. Ne mets pas cela, ce
    // sont pas des copies lol ».
    //
    // Il a raison deux fois. Il n'y a pas de feuille ; et surtout il n'y a rien
    // à RENDRE — chaque réponse part au serveur au moment où elle est donnée.
    // La phrase annonçait un geste qui n'existe pas, et elle pouvait faire
    // croire à l'élève qu'il lui restait quelque chose à faire avant la fin.
    //
    // LA MÉTAPHORE ÉTAIT D'ABORD DANS UN COMMENTAIRE (core/espaceProf.js,
    // « `aZero` vaut 'terminer' (on ramasse les copies) ») avant d'arriver à
    // l'écran de l'élève. C'est généralement dans cet ordre que ça se passe,
    // d'où la seconde vérification.
    const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    const SRC = lire('js/ui/leMoment.js');
    const PROF = lire('js/core/espaceProf.js');

    // Ce que l'élève LIT, hors commentaires : la phrase est dans un gabarit.
    const codeSeul = (s) => s.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');
    assert.ok(!/copies/.test(codeSeul(SRC)), 'l\'élève lit encore « les copies »');
    assert.match(SRC, /À zéro, c\\?'est terminé\./);
    // Et l'autre issue, celle qui rend la parole au professeur, n'a pas bougé.
    assert.match(SRC, /À zéro, on s\\?'arrête pour écouter\./);

    // Le commentaire d'origine, celui qui a semé la phrase.
    assert.ok(!/\(on ramasse les copies\)/.test(PROF),
        'la métaphore est restée là où elle est née : elle repoussera');
});
