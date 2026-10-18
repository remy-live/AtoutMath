// LE BROUILLON — et surtout, ce qu'il ne fait pas.
//
// RÉMY : « Dans le menu à côté du robot, avoir un mode brouillon pour poser son
// calcul », puis ses quatre arbitrages : « 1/ pas de persistance. 2/ Non [le
// professeur ne le voit pas], 3/ ok [« Poser » éteint par exercice], 4 oui [le
// crayon libre reste] ».
//
// TROIS DE CES QUATRE ARBITRAGES SONT DES PROMESSES NÉGATIVES, et une promesse
// négative ne se garde pas en regardant ce qui marche : elle se garde en
// interdisant. `tools/leBrouillon.mjs` mesure l'effet dans un vrai navigateur —
// zéro événement au journal, zéro clef posée — et ces épreuves-ci ferment les
// portes par lesquelles la persistance reviendrait un jour, sans bruit, dans
// une correction qui n'aura rien à voir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { poserOffert } from '../js/ui/brouillon.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SOURCE = lire('js/ui/brouillon.js');

/**
 * LA SOURCE SANS SES COMMENTAIRES.
 *
 * Ce dépôt explique chaque décision à la place où elle se prend, et ce
 * fichier-ci explique longuement ce qu'il NE fait pas : « il ne touche ni le
 * journal, ni le serveur », « aucun bouton Valider ». Une épreuve qui cherche
 * ces mots dans le texte entier tombe donc sur ses propres explications —
 * mesuré, trois fois en une minute. On juge le CODE.
 */
const sansCommentaires = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
const CODE = sansCommentaires(SOURCE);

// ─────────────────────────── « POSER » S'ÉTEINT PAR EXERCICE ────────────────

test('« POSER » N\'EST PAS OFFERT SUR UN EXERCICE DE CALCUL MENTAL', () => {
    // La règle se lit dans le catalogue, et elle y était déjà : trente
    // exercices portent le tag « Calcul mental », et poser l'opération en
    // colonnes y est précisément ce qu'on demande de NE PAS faire. On ne tient
    // donc aucune liste à la main.
    assert.equal(poserOffert({ id: 'x' }), true);
    assert.equal(poserOffert({ id: 'y', tags: { chemin: ['Numérique', 'Calcul mental'] } }), false);
    // Sans exercice, pas de brouillon : le bouton n'existe que dans un jeu.
    assert.equal(poserOffert(null), false);
    // ET LE RÉGLAGE EXPLICITE TRANCHE DANS LES DEUX SENS — « Poser une
    // opération » n'est pas du calcul mental, mais la grille du brouillon y
    // SERAIT l'exercice.
    assert.equal(poserOffert({ id: 'z', poserAuBrouillon: false }), false);
    assert.equal(poserOffert({
        id: 'w', poserAuBrouillon: true, tags: { chemin: ['Calcul mental'] }
    }), true);
});

test('et le catalogue l\'éteint sur « Poser une opération »', () => {
    const calcul = lire('js/data/calcul.js');
    const i = calcul.indexOf("id: 'calc-poser'");
    assert.ok(i > 0, 'l\'exercice existe');
    assert.match(calcul.slice(i, i + 700), /poserAuBrouillon: false/);
});

// ──────────────────── CE QUI NE DOIT JAMAIS SORTIR DU BROUILLON ─────────────

test('LE BROUILLON NE GARDE RIEN — ni stockage, ni journal, ni serveur', () => {
    // RÉMY : « 1/ pas de persistance » et « 2/ Non » (le professeur ne le voit
    // pas). Les deux ensemble disent que ce fichier ne doit connaître AUCUNE
    // des trois façons de faire durer quelque chose dans ce logiciel.
    for (const interdit of ['localStorage', 'sessionStorage', 'indexedDB',
        'globalStore', 'journal', 'recordAttempt', 'fetch(', 'sync.js']) {
        assert.ok(!CODE.includes(interdit),
            `le brouillon ne doit pas connaître « ${interdit} »`);
    }
    // ET IL N'A QU'UN SEUL ÉTAT, en mémoire, qu'une fonction remet à neuf.
    assert.match(SOURCE, /export function oublierLeBrouillon\(\)/);
    assert.match(SOURCE, /etat = vierge\(\);/);
});

test('AUCUNE ACTIVITÉ, AUCUN JEU NE LIT LE BROUILLON', () => {
    // C'EST LA GARDE QUI TIENT LA LIGNE ROUGE. Une grille aimantée est à un pas
    // de l'outil de construction virtuel qu'on s'est interdit ; ce qui nous
    // garde du bon côté est que le brouillon sert à PENSER et jamais à
    // RÉPONDRE. Le jour où une activité lit ce module, un tracé devient une
    // réponse — et personne ne s'en apercevra en relisant le diff de cette
    // activité-là.
    const coins = ['js/core/activities', 'js/games'];
    const coupables = [];
    for (const coin of coins) {
        for (const f of readdirSync(new URL('../' + coin, import.meta.url))) {
            if (!f.endsWith('.js')) continue;
            // ON CHERCHE LE MODULE, PAS LE MOT : « brouillon » est déjà le nom
            // d'une variable dans cinq jeux — ce qu'on tape avant de valider.
            // Ce qui est interdit est d'IMPORTER la feuille.
            if (/brouillon\.js/.test(lire(`${coin}/${f}`))) coupables.push(`${coin}/${f}`);
        }
    }
    assert.deepEqual(coupables, []);
});

test('ET IL NE PORTE PAS DE BOUTON « VALIDER »', () => {
    // Une surface pour penser n'a rien à valider. Le bouton serait la première
    // marche vers « le brouillon compte dans la note ».
    assert.ok(!/Valider|valider/.test(CODE));
});

// ─────────────────────────── LA GRILLE NE CALCULE PAS ───────────────────────

test('LA GRILLE N\'EMPRUNTE AU NOYAU QUE LES RANGS', () => {
    // La maquette montrait la soustraction POSÉE ET FAITE — résultat et
    // retenues compris. Une grille qui calcule n'est pas un brouillon, c'est
    // une calculatrice, et celle-ci existe déjà derrière son propre réglage.
    // Rémy a écrit « poser SON calcul ».
    //
    // `etendue` RANGE DES COLONNES, elle ne calcule rien ; `poser`,
    // `colonnesAddition` et leurs sœurs, elles, rendent le résultat. Les
    // importer serait l'avoir sous la main — et un jour, l'afficher.
    const imports = SOURCE.match(/import \{([^}]*)\} from '\.\.\/core\/poser\.js';/);
    assert.ok(imports, 'le brouillon emprunte bien au noyau des opérations');
    const noms = imports[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.deepEqual(noms, ['etendue']);
});

// ─────────────────────────── LE MENEUR LE RÈGLE ET L'OUBLIE ─────────────────

test('LE MENEUR OUBLIE LE BROUILLON À CHAQUE QUESTION', () => {
    const runner = lire('js/core/runner.js');
    // Au même endroit que la calculatrice oublie son calcul : « un brouillon
    // qui survit à sa question est un piège, pas un service ».
    const i = runner.indexOf('signalerNouvelleQuestion();');
    assert.ok(i > 0);
    assert.match(runner.slice(i, i + 220), /oublierLeBrouillon\(\);/);
    // Et il se règle à chaque étape, puis s'en va avec l'exercice.
    assert.match(runner, /reglerBrouillon\(step\.exercise\);/);
    assert.match(runner, /reglerBrouillon\(null\);/);
});

test('LE BOUTON EXISTE DANS LA PAGE, ET IL Y EST CACHÉ AU DÉPART', () => {
    const page = lire('index.html');
    const i = page.indexOf('id="btn-game-brouillon"');
    assert.ok(i > 0, 'le bouton est déclaré dans la page');
    const balise = page.slice(i, page.indexOf('>', i));
    // `hidden` DÈS LA PAGE : sans exercice, le brouillon ne mène nulle part, et
    // la règle doit être vraie AVANT que le moindre module n'ait tourné.
    assert.match(balise, /\bhidden\b/);
    assert.match(balise, /data-brouillon/);
});
