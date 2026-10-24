// LA NOTICE DES TABLETTES DIT-ELLE ENCORE LA VÉRITÉ ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Tu me fais un petit tuto pdf pour l installation sur plusieurs
// tablettes ». Sa sœur l'aura imprimé et posé sur la table ; elle suivra ce
// qui y est écrit, et rien d'autre.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ELLE EXISTE ────────────────────
//
// UNE NOTICE EST UNE COPIE, et toute copie diverge. Le jour où un bouton se
// renomme, la notice continue de dire l'ancien mot — imprimée, elle ne se
// corrige pas toute seule, et personne ne s'en aperçoit avant une classe de
// vingt-cinq enfants qui cherchent « J'ai un code » sur un écran qui dit
// autre chose.
//
// ON NE RELIT DONC PAS LE PDF (il faut un navigateur, et `npm test` n'en a
// pas) : on relit LE GABARIT, et l'on exige que chaque mot qu'il met entre
// guillemets existe VRAIMENT dans l'application. C'est la même règle que le
// bandeau des icônes, prise par l'autre bout : lui se construit à partir des
// boutons, elle se confronte à eux.
//
// Le PDF, lui, se vérifie en se fabriquant : `node tools/tutoTablettes.mjs`
// relit son propre texte dans le PDF qu'il vient d'écrire et sort en erreur
// si l'une des cinq phrases indispensables manque. MESURÉ : 2 pages,
// 464 mots, les cinq phrases présentes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
// LE GABARIT, LES ESPACES RAMENÉES À UNE. Une phrase d'une notice tient sur
// deux lignes de source — la chercher telle quelle ferait échouer l'épreuve
// sur un retour à la ligne, c'est-à-dire sur rien.
const TUTO = lire('tools/tutoTablettes.mjs').replace(/\s+/g, ' ');
// ET LE CODE SEUL POUR CHERCHER UNE ABSENCE : la première version de
// l'épreuve ci-dessous est tombée sur le mot « pdftotext » écrit dans le
// commentaire qui explique pourquoi on ne s'en sert plus. Un test qui lit les
// commentaires mesure la prose, pas le produit — et ce dépôt l'a déjà appris
// deux fois aujourd'hui.
const CODE_TUTO = sansCommentaires(lire('tools/tutoTablettes.mjs'));

test('CHAQUE MOT QUE LA NOTICE CITE EXISTE DANS L\'APPLICATION', () => {
    // LES QUATRE MOTS SUR LESQUELS ELLE FAIT APPUYER UN DOIGT. Si l'un d'eux
    // change, la notice envoie chercher un bouton qui n'existe plus.
    const HTML = lire('index.html');
    const CODE = lire('js/ui/studentCodeUI.js');
    const PREP = lire('js/ui/preparerTablette.js');

    const cites = [
        ['J\'ai un code', lire('js/ui/pathView.js'), 'le bouton de l\'écran vide'],
        ['Scanner le QR code', HTML, 'le bouton du scanner'],
        ['Installer', PREP, 'le bouton d\'installation de la préparation'],
        ['Autoriser la caméra', PREP, 'le bouton de la caméra'],
        ['Cette tablette est prête à travailler sans internet.', PREP, 'le verdict'],
        ['Mettre tous les exercices en mémoire', PREP, 'la deuxième ligne'],
        ['Mettre AtoutMath sur l\'écran d\'accueil', PREP, 'la première ligne']
    ];
    // LES APOSTROPHES ÉCHAPPÉES DU JAVASCRIPT : la source écrit
    // `l\'écran d\'accueil`, et chercher `l'écran d'accueil` n'y trouve rien.
    // L'épreuve mesurerait alors une barre oblique, pas un bouton.
    const telQuel = (t) => String(t).replace(/\\'/g, '\'').replace(/\s+/g, ' ');
    for (const [mot, source, quoi] of cites) {
        assert.ok(TUTO.includes(mot.replace(/\s+/g, ' ')),
            `la notice ne cite plus « ${mot} » : elle a cessé de décrire ${quoi}`);
        assert.ok(telQuel(source).includes(mot),
            `la notice fait chercher « ${mot} », qui n'existe plus dans `
            + `l'application (${quoi}). Une notice imprimée ne se corrige pas `
            + 'toute seule.');
    }
    // ET L'ADRESSE QU'ELLE MET DANS SON QR est celle que l'application écoute.
    assert.match(TUTO, /\?preparer/);
    assert.match(lire('js/app.js'), /has\('preparer'\)/,
        'l\'application n\'écoute plus `?preparer` : le QR de la notice '
        + 'ouvrirait l\'application ordinaire');
});

test('ELLE SE RELIT DANS LE PDF, ET NON DANS SON PROPRE GABARIT', () => {
    // « Compter les segments d'un PDF dit qu'il n'est pas vide, jamais qu'il
    // est juste. » Vérifier le gabarit ne prouverait que ma copie : c'est le
    // TEXTE EXTRAIT DU PDF qu'il faut relire, et c'est ce que l'outil fait
    // avant de rendre la main.
    assert.match(TUTO, /getTextContent\(\)/,
        'l\'outil ne relit plus le texte du PDF qu\'il vient d\'écrire');
    assert.match(TUTO, /process\.exit\(1\)/,
        'une phrase manquante doit faire ÉCHOUER la fabrication, pas seulement '
        + 'l\'écrire sur la sortie');
    // AVEC `pdfjs` ET NON `pdftotext` : poppler n'est pas installé ici et ne le
    // sera pas davantage chez Rémy. La première version appelait `pdftotext`
    // et tombait sur `ENOENT` après avoir écrit un PDF parfaitement correct.
    assert.ok(!/pdftotext|pdfinfo/.test(CODE_TUTO),
        'l\'outil dépend de poppler, qui n\'est pas là : il écrira le PDF puis '
        + 'jettera');
    // L'ADRESSE SE PASSE EN ARGUMENT : une notice fabriquée pour un autre
    // hébergement ne doit pas demander de modifier le code.
    assert.match(TUTO, /process\.argv\[2\]/,
        'l\'adresse du site n\'est plus réglable : la notice sera fausse '
        + 'ailleurs');
});
