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
import { poserOffert, lireLeCalcul, chemin } from '../js/ui/brouillon.js';

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

// ═══════════════ DEUXIÈME PASSE : taper, les retenues, le glissé ═══════════
//
// RÉMY, après l'avoir essayé : « pour les chiffres des opérations du brouillon,
// il faudrait pouvoir les taper, tu oublies les retenues et il y a deux
// méthodes pour les soustractions et les chiffres je préfère du drag drop en
// supplément du clic pour le nombres. Pour le calcul, l'élève tape son calcul
// (une addition peut avoir plusieurs membres) et on peut avoir plusieurs
// calculs dans le brouillon », puis : « et pour le dessiner autorise le undo
// redo, et lisse le trait libre ».

test('ON LIT LE CALCUL QU\'IL A ÉCRIT, ET L\'ON EST LARGE SUR LA FORME', () => {
    assert.deepEqual(lireLeCalcul('12 + 34 + 5'), { op: '+', nombres: [12, 34, 5] });
    assert.deepEqual(lireLeCalcul('7106-4709'), { op: '-', nombres: [7106, 4709] });
    // `x`, `*` pour multiplier ; `:` et `/` pour diviser ; la virgule comme le
    // point. Refuser une de ces écritures n'enseignerait que la ponctuation.
    assert.deepEqual(lireLeCalcul('12 x 5'), { op: '×', nombres: [12, 5] });
    assert.deepEqual(lireLeCalcul('12*5'), { op: '×', nombres: [12, 5] });
    assert.deepEqual(lireLeCalcul('144 : 12'), { op: '÷', nombres: [144, 12] });
    assert.deepEqual(lireLeCalcul('12,5 + 3'), { op: '+', nombres: [12.5, 3] });
});

test('MAIS STRICT SUR LE FOND — et chaque refus dit quoi faire', () => {
    // ON NE MÉLANGE PAS LES SIGNES : « 3 + 4 × 5 » ne se pose pas en colonnes,
    // c'est un calcul à priorités, et le poser inventerait un ordre que
    // l'élève n'a pas écrit.
    assert.match(lireLeCalcul('3 + 4 × 5').erreur, /ne mélange pas les signes/);
    // SEULE L'ADDITION ACCEPTE PLUS DE DEUX MEMBRES — « une addition peut
    // avoir plusieurs membres », dit Rémy, et lui seul : on n'aligne pas trois
    // nombres sous une barre de soustraction.
    assert.match(lireLeCalcul('20 - 5 - 3').erreur, /que deux nombres à la fois/);
    assert.match(lireLeCalcul('bonjour').erreur, /commence par un nombre/);
    assert.match(lireLeCalcul('12').erreur, /manque un signe/);
    // Une ligne vide n'est pas une faute : il n'a simplement rien écrit.
    assert.equal(lireLeCalcul('').erreur, '');
});

test('LES RETENUES ONT LEUR CASE — SAUF LÀ OÙ IL NE PEUT PAS Y EN AVOIR', () => {
    // « tu oublies les retenues ». La règle vient du noyau et Rémy l'avait
    // signalée sur 554 + 448 : la retenue d'une colonne VIENT de la colonne à
    // sa droite, et la colonne des unités n'a rien à sa droite.
    assert.match(CODE, /function retenuesHtml\(c, rangs\)/);
    assert.match(CODE, /const sansLaDerniere = rangs\.slice\(0, -1\);/);
});

test('ET LA SOUSTRACTION A SES DEUX MÉTHODES', () => {
    // Rémy, en septembre déjà : « j'ai des élèves qui font une autre méthode où
    // pour 53 − 17, il mette le 1 à 3 et au lieu du 5, il barre et mette 4 ».
    assert.match(CODE, /c\.methode === 'emprunt'/);
    assert.match(CODE, /br-case--barree/);
    // ET LES MARQUES DÉJÀ ÉCRITES S'EN VONT quand on change de méthode : elles
    // ne sont pas aux mêmes endroits et ne disent pas la même chose.
    assert.match(CODE, /Object\.keys\(c\.cases\)\.forEach\(k => \{ if \(\/\^\[emb\]\/\.test\(k\)\) delete c\.cases\[k\]; \}\);/);
});

test('TROIS GESTES POUR LE MÊME CHIFFRE : toucher, taper, glisser', () => {
    // « il faudrait pouvoir les taper » et « je préfère du drag drop en
    // supplément du clic ». Le troisième geste existait déjà.
    assert.match(CODE, /feuille\.addEventListener\('keydown', surTouche\);/);
    assert.match(CODE, /^\s*rendreGlissable\(t, \{/m);
    assert.match(CODE, /if \(d\.brTouche\) \{/);
    // L'ÉCOUTEUR EST SUR LA FEUILLE, PAS SUR LE DOCUMENT : un écouteur global
    // volerait les touches à l'exercice qui est dessous.
    assert.ok(!/document\.addEventListener\('keydown'/.test(CODE));
});

test('LE TRAIT LIBRE EST LISSÉ, L\'AIMANTÉ NE L\'EST PAS', () => {
    // « lisse le trait libre ». Lisser un trait qui saute de nœud en nœud le
    // ferait passer À CÔTÉ des nœuds — c'est-à-dire défaire exactement ce que
    // l'aimantation vient de faire.
    const points = [{ x: 0, y: 0 }, { x: 32, y: 0 }, { x: 64, y: 32 }, { x: 96, y: 32 }];
    const droit = chemin({ aimante: true, points });
    assert.ok(!/Q/.test(droit), droit);
    assert.equal(droit, 'M0 0 L32 0 L64 32 L96 32');
    const courbe = chemin({ aimante: false, points });
    assert.match(courbe, /Q/);
    // LA COURBE PART ET ARRIVE AUX MÊMES POINTS : on lisse le tremblement, on
    // ne déplace pas le trait.
    assert.ok(courbe.startsWith('M0 0'), courbe);
    assert.ok(courbe.endsWith('L96 32'), courbe);
    // Deux points ne font pas une courbe.
    assert.equal(chemin({ aimante: false, points: points.slice(0, 2) }), 'M0 0 L32 0');
});

test('ET LE DESSIN SE DÉFAIT, Y COMPRIS L\'EFFACEMENT', () => {
    // « autorise le undo redo ». On garde des ÉTATS, pas des gestes : une pile
    // de traits saurait défaire un trait, mais pas un « Gommer » — et c'est
    // précisément l'effacement qu'on regrette.
    assert.match(CODE, /function noterLeDessin\(traits\)/);
    assert.match(CODE, /etat\.histoire = etat\.histoire\.slice\(0, etat\.rang \+ 1\);/);
    assert.match(CODE, /if \(d\.brGomme !== undefined\) \{ noterLeDessin\(\[\]\);/);
});
