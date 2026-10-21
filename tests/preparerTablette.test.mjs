// PRÉPARER UNE TABLETTE POUR UNE CLASSE SANS INTERNET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Non chaque tablette est indépendante ». Puis, la page proposée :
// « Oui ».
//
// ── CE QUI A RENDU CETTE PAGE NÉCESSAIRE ───────────────────────────────────
//
// MESURÉ sur le vrai chemin — on ouvre la page, on ne fait rien d'autre, on
// coupe le réseau :
//
//   cache du service worker   258 fichiers, dont 124 générateurs
//   de js/games/              DEUX fichiers sur 91 (3,4 Mo au total)
//   et il ne grossit pas      même compte à 2, 5, 10, 20, 35 et 60 secondes
//   hors ligne, un parcours   s'ouvre et se joue, JEU COMPRIS, 0 erreur
//
// Les deux dernières lignes se contredisent : le jeu ne vient pas de NOTRE
// cache, mais de celui du NAVIGATEUR — que personne ne contrôle et que le
// système vide en premier. Ce qui marche marche par chance.
//
// MESURÉ APRÈS, sur une tablette remise à neuf (ni service worker, ni cache),
// qui ouvre directement l'adresse de préparation :
//
//   « 126 exercices gardés — 1 puis 404 fichiers en mémoire. »
//   404 fichiers, dont 91 de js/games/
//   « Cette tablette est prête à travailler sans internet. »
//   puis, réseau coupé : le Tasuko tourne. 0 erreur, 0 fenêtre native.
//
// ── CE QU'ON GARDE ICI ─────────────────────────────────────────────────────
//
// Le verdict et la liste. Le reste — la caméra, l'installation, le dessin —
// se mesure au navigateur ; ces deux-là décident si la page MENT, et une page
// de préparation qui ment est pire que pas de page du tout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { poserUnDocumentDeSecours } from '../tools/fauxPdf.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

poserUnDocumentDeSecours();
const { direLeVerdict, chargerToutesLesActivites, cEstUnePreparation } =
    await import('../js/ui/preparerTablette.js');

test('L\'ADRESSE DE PRÉPARATION SE RECONNAÎT, ET ELLE SEULE', () => {
    assert.equal(cEstUnePreparation('?preparer'), true);
    assert.equal(cEstUnePreparation('?preparer=1'), true);
    assert.equal(cEstUnePreparation('?code=M2-abc&preparer'), true);
    assert.equal(cEstUnePreparation('?code=M2-abc'), false);
    assert.equal(cEstUnePreparation(''), false);
});

test('LE VERDICT NE DIT JAMAIS « PRÊTE » QUAND RIEN N\'EST GARDÉ', () => {
    // LE DÉFAUT MESURÉ CE JOUR-LÀ, et il est invisible : les 126 modules se
    // chargent parfaitement, et le cache ne bouge pas d'un fichier. Un
    // service worker ne voit pas les requêtes faites AVANT son activation —
    // c'est-à-dire, au tout premier passage, toutes.
    const rienDeGarde = direLeVerdict({ faits: 126, manques: [], gardien: false });
    assert.equal(rienDeGarde.etat, 'rate');
    assert.match(rienDeGarde.mot, /PAS prête/);
    assert.match(rienDeGarde.memoire, /126 exercices chargés/);
    // Et il dit QUOI FAIRE : une tablette qu'on ne sait pas réparer, on la
    // laisse telle quelle.
    assert.match(rienDeGarde.memoire, /recharge/i);

    // Un module qui n'est pas arrivé compte autant : c'est l'exercice que la
    // classe ouvrira jeudi.
    const incomplet = direLeVerdict({ faits: 120, manques: ['tasuko', 'sudoku'], gardien: true });
    assert.equal(incomplet.etat, 'rate');
    assert.match(incomplet.memoire, /2 exercice\(s\)/);

    // Et quand tout y est, elle le dit en une phrase, sans réserve.
    const prete = direLeVerdict({ faits: 126, manques: [], gardien: true });
    assert.equal(prete.etat, 'ok');
    assert.match(prete.mot, /prête à travailler sans internet/);
    assert.equal(prete.memoire, null);
});

test('TOUT CE QUE LE REGISTRE CONNAÎT EST CHARGÉ, ET CE QUI MANQUE EST NOMMÉ', async () => {
    // LA LISTE NE S'ÉCRIT PAS À LA MAIN. Une liste recopiée serait juste le
    // jour où on l'écrit et fausse au premier exercice ajouté — et le défaut
    // serait SILENCIEUX : la page dirait « prête » en ayant oublié le dernier
    // jeu. C'est la leçon du bandeau des icônes, qui se construit à partir
    // des boutons eux-mêmes.
    const vus = [];
    const faux = [
        { id: 'a', load: async () => { vus.push('a'); } },
        { id: 'b', load: async () => { vus.push('b'); } },
        { id: 'c', load: async () => { vus.push('c'); throw new Error('absent'); } },
        { id: 'd' },                       // sans `load` : rien à charger
        { id: 'e', load: async () => { vus.push('e'); } },
        { id: 'f', load: async () => { vus.push('f'); } }
    ];
    const avances = [];
    const r = await chargerToutesLesActivites((faits, total) => avances.push([faits, total]), faux);

    assert.equal(r.total, 5, 'les activités sans `load` ne se comptent pas');
    assert.equal(r.faits, 5, 'toutes les activités doivent être tentées');
    assert.deepEqual(vus.sort(), ['a', 'b', 'c', 'e', 'f']);
    // CELLE QUI TOMBE EST NOMMÉE, et non comptée : « 2 exercices manquent »
    // ne dit pas lesquels, et c'est justement ce qu'on voudra savoir.
    assert.deepEqual(r.manques, ['c']);
    // Et le compteur avance à chaque module : sans lui, la maîtresse regarde
    // une page immobile pendant trois minutes.
    assert.equal(avances.length, 5);
    assert.deepEqual(avances[avances.length - 1], [5, 5]);
});

test('ON DIT AU SERVICE WORKER DE RANGER — sinon rien n\'est gardé', () => {
    // LE DÉFAUT EST DANS `index.html` DEPUIS TOUJOURS, et il y est écrit : un
    // service worker ne voit pas ce qui a été chargé avant son activation. La
    // page d'accueil lui envoie donc la liste au bout de huit secondes. Huit
    // secondes et un hasard, c'est trop pour une préparation dont on attend
    // un verdict — celle-ci le fait elle-même, et attend que ce soit rangé.
    const M = lire('js/ui/preparerTablette.js');
    assert.match(M, /postMessage\(\{ type: 'garnir', liste \}\)/,
        'la page ne demande plus le rangement : le cache ne bougera pas');
    // `registration.active` ET NON `controller` seul : au tout premier
    // passage — le seul qui compte ici — la page n'est pas encore contrôlée.
    assert.match(M, /navigator\.serviceWorker\.controller \|\| \(reg && reg\.active\)/,
        'au premier passage, la page n\'est pas contrôlée : le message se perdrait');
    // ET LE VERDICT ATTEND LE RANGEMENT. Compter les fichiers juste après
    // l'envoi donnerait le compte d'avant, et la page annoncerait un chiffre
    // faux avec l'air d'avoir vérifié.
    assert.match(M, /await attendreLeRangement\(\)/);
});
