// UN PARCOURS DANS UN FICHIER — ce qui s'écrit, et ce qui se relit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « d'ailleurs, on ne peut exporter en fichier juste un parcours. »
//
// ── POURQUOI CES ÉPREUVES-LÀ ───────────────────────────────────────────────
//
// Un export se vérifie à l'œil en trente secondes : le fichier se télécharge,
// il contient du JSON, on est content. Ce qui ne se vérifie pas à l'œil, c'est
// ce qu'on RELIRA — et un fichier qui ne se relit pas est une sauvegarde qui
// n'en est pas une, découverte le jour où l'on en a besoin.
//
// ET SURTOUT : L'ENVELOPPE N'EST PAS LE PARCOURS. C'est le défaut qui a fait
// descendre des séances à zéro étape du serveur, et qui ne s'était vu que chez
// l'élève (voir `tools/seanceNonVide.mjs`). Le même piège attend ici, au mot
// près : `state.saveTeacherPath` range `{ id, name, data, folderId, timestamp }`
// et `normalizePath` sur cette forme rend ZÉRO étape. Les deux épreuves qui
// suivent existent pour ça.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import '../js/core/activities/index.js';
import { makePath, makeStep, makeMessage, normalizePath } from '../js/core/path.js';
import {
    nomDeFichier, fichierAEcrire, lireLeFichier, GENRE_FICHIER, VERSION_FICHIER
} from '../js/core/fichierParcours.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const TROIS = () => makePath('Relatifs — 4ᵉ C', [
    makeStep('calc-add', {}, { stepId: 'a', nbItems: 5 }),
    makeMessage({ titre: 'Attention', texte: 'On change de *méthode*.' }, { stepId: 'm' }),
    makeStep('calc-prio', {}, { stepId: 'b', nbItems: 6 })
]);

/** L'enveloppe que `state.saveTeacherPath` range — celle qui piège. */
const ENVELOPPE = () => ({
    id: 'path_1790833938267', name: 'Relatifs — 4ᵉ C',
    data: TROIS(), folderId: 'root', timestamp: 1790882519054
});

// ──────────────────────────────────────── LE NOM DU FICHIER ─────────────────

test('LE NOM DU FICHIER TRAVERSE UN MAC, UN PC ET UNE PIÈCE JOINTE', () => {
    // Un nom accentué ne voyage pas pareil partout : on retrouve
    // « Relatifs%20%E2%80%94.json » dans un dossier de téléchargements, et l'on
    // ne sait plus ce qu'on avait exporté.
    const n = nomDeFichier('Relatifs — 4ᵉ C', new Date('2026-10-01T09:00:00Z'));
    assert.equal(n, 'relatifs-4e-c-2026-10-01.atoutmath.json');
    // « 4ᵉ » NE SE DÉCOMPOSE PAS EN NFD : sans le remplacement nommé, l'exposant
    // tombe dans le filtre et « 4ᵉ C » devient « 4-c ».
    assert.match(n, /4e-c/, 'l\'exposant a emporté son chiffre avec lui');
    // ET UN NOM QUI NE LAISSE RIEN donne quand même un fichier nommé.
    assert.match(nomDeFichier('???', new Date('2026-10-01T09:00:00Z')),
        /^parcours-2026-10-01\./);
    assert.match(nomDeFichier(''), /^parcours-/);
    // LE SUFFIXE SE VOIT : `.json` seul se range au milieu de tout.
    assert.match(nomDeFichier('x'), /\.atoutmath\.json$/);
});

// ────────────────────────────────────────── CE QU'ON ÉCRIT ──────────────────

test('ON ÉCRIT LE PARCOURS, PAS L\'ENVELOPPE DE CE NAVIGATEUR', () => {
    // ─────────────────────────────────────────────────────────────────────
    // LE MÊME PIÈGE QU'AU SERVEUR, AU MOT PRÈS. `normalizePath(enveloppe)`
    // rend ZÉRO étape : il cherche `raw.data` comme un TABLEAU d'étapes et
    // retombe sur `raw.steps`, qui n'existe pas à ce niveau. Un fichier
    // exporté ainsi se relit sans erreur, avec un nom, un identifiant, et rien
    // dedans — et ne se découvre qu'au moment de le réimporter.
    const f = fichierAEcrire([ENVELOPPE()]);
    assert.equal(f.parcours.length, 1);
    assert.equal(f.parcours[0].steps.length, 3,
        'le fichier contient une enveloppe vide au lieu du parcours');
    assert.equal(f.parcours[0].name, 'Relatifs — 4ᵉ C');
    // ET NI `folderId` NI `timestamp` : le dossier « Troisièmes » de Rémy
    // n'existe pas chez son collègue, et la date de modification du fichier est
    // celle du fichier.
    assert.equal(f.parcours[0].folderId, undefined);
    assert.equal(f.parcours[0].timestamp, undefined);
});

test('LE FICHIER DIT CE QU\'IL EST, POUR QU\'ON N\'AIT PAS À LE DEVINER', () => {
    const f = fichierAEcrire([ENVELOPPE()], new Date('2026-10-01T09:00:00Z'));
    assert.equal(f.logiciel, 'AtoutMath');
    assert.equal(f.genre, GENRE_FICHIER);
    assert.equal(f.version, VERSION_FICHIER);
    assert.equal(f.le, '2026-10-01T09:00:00.000Z');
});

// ───────────────────────────────────────── CE QU'ON RELIT ───────────────────

test('CE QU\'ON ÉCRIT SE RELIT ENTIER — ALLER ET RETOUR', () => {
    // L'épreuve qui compte vraiment : un export qui ne se réimporte pas est une
    // sauvegarde qui n'en est pas une, et on l'apprend le jour où l'on en a
    // besoin.
    const texte = JSON.stringify(fichierAEcrire([ENVELOPPE()]));
    const { parcours, erreur } = lireLeFichier(texte);
    assert.equal(erreur, '');
    assert.equal(parcours.length, 1);
    assert.equal(parcours[0].steps.length, 3);
    assert.equal(parcours[0].name, 'Relatifs — 4ᵉ C');
    // LE MOT DU PROFESSEUR SURVIT AU VOYAGE, avec son texte.
    const mot = parcours[0].steps.find((s) => s.genre === 'message');
    assert.ok(mot, 'le mot du professeur est resté dans le fichier');
    assert.match(mot.message.texte, /change de \*méthode\*/);
});

test('ON ACCEPTE LES QUATRE FORMES, PARCE QUE RÉMY OUVRIRA LE FICHIER', () => {
    // Un logiciel qui refuse un fichier qu'il comprend est un logiciel qui
    // ment. On lit donc : l'enveloppe complète, un tableau, une enveloppe de
    // bibliothèque seule, un parcours nu.
    const attendu = (r) => { assert.equal(r.erreur, ''); assert.equal(r.parcours.length, 1);
        assert.equal(r.parcours[0].steps.length, 3); };
    attendu(lireLeFichier(fichierAEcrire([ENVELOPPE()])));
    attendu(lireLeFichier([ENVELOPPE()]));
    attendu(lireLeFichier(ENVELOPPE()));
    attendu(lireLeFichier(TROIS()));
    // ET PLUSIEURS D'UN COUP, puisque la fenêtre sait prendre vingt lignes.
    const deux = lireLeFichier(fichierAEcrire([ENVELOPPE(), ENVELOPPE()]));
    assert.equal(deux.parcours.length, 2);
});

test('UN FICHIER DE DOUZE PARCOURS DONT UN EST CASSÉ EN REND ONZE', () => {
    // « Fichier invalide » devant douze séances préparées serait cruel ET faux.
    const bon = ENVELOPPE();
    const r = lireLeFichier({ genre: GENRE_FICHIER, parcours: [
        bon, null, { name: 'Vide', steps: [] }, 'pas un objet', bon
    ] });
    assert.equal(r.erreur, '');
    assert.equal(r.parcours.length, 2);
    assert.equal(r.ecartes, 3);
});

test('UN PARCOURS SANS ÉTAPE EST ÉCARTÉ, ET ON LE DIT', () => {
    // C'est le signe qu'on lit la mauvaise forme — exactement le défaut qui
    // avait fait descendre des séances vides du serveur, invisible jusqu'à
    // l'écran de l'élève. Ici, il se voit tout de suite.
    const r = lireLeFichier({ genre: GENRE_FICHIER, parcours: [{ name: 'Rien', steps: [] }] });
    assert.match(r.erreur, /étapes manquent/);
    assert.equal(r.parcours.length, 0);
});

test('UN FICHIER QUI N\'EN EST PAS NE FAIT PAS TOMBER LE LOGICIEL', () => {
    // Rémy choisira un jour le mauvais fichier dans sa fenêtre de dialogue.
    assert.match(lireLeFichier('ceci n\'est pas du json').erreur, /pas du JSON/);
    assert.match(lireLeFichier('null').erreur, /pas de parcours/);
    assert.match(lireLeFichier('').erreur, /pas du JSON/);
    assert.match(lireLeFichier(42).erreur, /pas de parcours/);
});

// ────────────────────────────────────────────── L'ÉCRAN ─────────────────────

test('LES DEUX BOUTONS SONT DANS LA FENÊTRE, ET L\'IMPORT NE RÉUTILISE PAS L\'IDENTIFIANT', () => {
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    assert.match(g, /data-gp-exporter/, 'plus de bouton pour exporter');
    assert.match(g, /id="gp-importer"/, 'l\'aller sans le retour ne sert à rien');
    assert.match(g, /id="gp-fichier"[\s\S]{0,120}accept=/);
    // ON IMPORTE SOUS UN NOUVEL IDENTIFIANT : un fichier venu d'un collègue
    // porte le SIEN, et la route `save` refuse d'écrire sur le parcours d'un
    // autre professeur — l'import aurait échoué en silence au démarrage suivant.
    assert.match(g, /parcours\.forEach\(\(p\) => state\.saveTeacherPath\(p\.name, p\)\)/,
        'l\'import réutiliserait l\'identifiant du fichier');
    // ET LE CHAMP SE REMET À ZÉRO : sans cela, rouvrir LE MÊME fichier ne
    // déclenche aucun `change`, et le bouton a l'air cassé.
    assert.match(g, /champFichier\.value = '';/,
        'réimporter le même fichier ne ferait rien, sans rien dire');
    // LES TROIS GESTES DE LA SÉLECTION S'ÉTEIGNENT ENSEMBLE quand rien n'est
    // pris : un « Exporter… » cliquable sur une sélection vide ne fait rien.
    assert.match(g, /\[data-gp-ranger\], \[data-gp-jeter\], \[data-gp-exporter\]/);
});

test('L\'EXPORT NE PASSE PAS PAR UNE FENÊTRE NATIVE', () => {
    // Rémy : « tu utilises des alert et prompt, on évite ! ». Un export est
    // exactement le genre d'endroit où l'on écrit `alert('Exporté !')` sans y
    // penser.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    assert.doesNotMatch(g, /(^|[^.\w])(alert|confirm|prompt)\s*\(/m);
    assert.match(g, /showToast/);
});
