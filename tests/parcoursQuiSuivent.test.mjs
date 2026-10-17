// UN PARCOURS SUIT SON PROFESSEUR D'UN ORDINATEUR À L'AUTRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le parcours que j'ai créé au collège sur mon compte, je ne l'ai pas
// sur mon mac chez moi !!!! »
//
// TROIS DÉFAUTS SUR LA MÊME CHAÎNE, et aucun ne se voyait :
//
//   1. `api/index.php` rendait la liste des parcours avec
//      `$r + ['data' => json_decode(...)]`. L'opérateur `+` sur deux tableaux
//      PHP NE REMPLACE PAS une clef que la gauche porte déjà : la ligne sortie
//      de la base a une colonne `data`, donc le tableau décodé était calculé
//      puis JETÉ et la route rendait la CHAÎNE JSON brute sous le même nom.
//      Côté navigateur, `ramenerLaBibliotheque` fait `if (!p || !p.id)
//      continue` : sur une chaîne, toutes les lignes étaient sautées ;
//
//   2. `ramenerLaBibliotheque()` — qui porte le commentaire « c'est ce qui fait
//      qu'un professeur retrouve ses parcours sur un ordinateur qu'il n'a
//      jamais utilisé » — n'était appelée QUE par `parcoursDeLaSeance(pathId)`,
//      au moment de compléter une séance déjà donnée. Personne ne l'appelait au
//      démarrage : la moitié « serveur → navigateur » du raccordement n'était
//      branchée nulle part ;
//
//   3. et quand on la forçait, elle rangeait `normalizePath(ENVELOPPE)`, qui
//      rend ZÉRO étape. Le parcours revenait avec son nom et rien dedans.
//
// MESURÉ AVANT, sur deux navigateurs du même compte (`tools/deuxPostes.mjs`) :
// « 0 ramené(s) » sur un poste neuf dont le serveur portait trois parcours, et
// cinq lignes au serveur pour trois parcours — les deux parcours semés par le
// logiciel se dupliquant à chaque nouvelle machine.
//
// MESURÉ APRÈS : « Les priorités du jeudi », 2 étapes, arrive sur un navigateur
// neuf SANS RIEN CLIQUER, et Rémy le LIT dans le tiroir de « Préparer » ; une
// seule ligne au serveur. 0 erreur de page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { normalizePath, makeStep, makePath } from '../js/core/path.js';
import { cheminDeLEntree, combienDEtapes } from '../js/core/entreeParcours.js';
import { estUnParcoursSeme, NOM_DECOUVERTE, DEBUT_PAPIER } from '../js/core/parcoursSemes.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/** Une enveloppe de bibliothèque, telle que `state.saveTeacherPath` la range. */
const enveloppe = (nom, etapes) => ({
    id: 'path_1700000000000', name: nom,
    data: makePath(nom, etapes.map((id, i) => makeStep(id, {}, { stepId: 's' + i }))),
    folderId: 'root', timestamp: 1700000000000
});

// ────────────────────────────────── LE DÉBALLAGE DE L'ENVELOPPE ─────────────

test('UNE ENVELOPPE DÉBALLÉE REND SES ÉTAPES, PAS ZÉRO', () => {
    const e = enveloppe('Les priorités du jeudi', ['calc-add', 'calc-prio']);
    assert.equal(combienDEtapes(e), 2, 'un parcours arrive avec son nom et rien dedans');
    // Et un parcours NU passe aussi : les deux formes se promènent côte à côte.
    assert.equal(combienDEtapes(e.data), 2);
    assert.equal(cheminDeLEntree(e), e.data);
    assert.equal(cheminDeLEntree(e.data), e.data);
    // Rien du tout ne casse rien.
    assert.equal(cheminDeLEntree(null), null);
    assert.equal(combienDEtapes(undefined), 0);
});

test('C\'EST `normalizePath` QUI PERD LES ÉTAPES D\'UNE ENVELOPPE — DONC ON DÉBALLE AVANT', () => {
    // ─────────────────────────────────────────────────────────────────────
    // CETTE ÉPREUVE GARDE LA RAISON, et non le correctif : tant que
    // `normalizePath` se comporte ainsi, personne ne doit lui passer une
    // enveloppe. Il cherche `raw.data` comme un TABLEAU d'étapes — le vieux
    // format de l'explorateur — et retombe sur `raw.steps`, absent à ce
    // niveau. Ce n'est pas un bogue de `normalizePath` : c'est une forme qu'il
    // ne connaît pas, et qu'il faut déballer avant de lui donner.
    const e = enveloppe('Les priorités du jeudi', ['calc-add', 'calc-prio']);
    assert.equal((normalizePath(e, e.name).steps || []).length, 0,
        'si ceci change, relire le rapatriement : il déballe à cause de cela');
    assert.equal((normalizePath(cheminDeLEntree(e), e.name).steps || []).length, 2);
});

// ──────────────────────────── CE QUE LE LOGICIEL SE DONNE À LUI-MÊME ────────

test('LES PARCOURS SEMÉS SE RECONNAISSENT, ET EUX SEULS', () => {
    // Ils naissent sur CHAQUE machine avec un identifiant neuf : les monter
    // puis les redescendre ailleurs fabrique une paire de jumeaux par poste.
    assert.equal(estUnParcoursSeme(NOM_DECOUVERTE), true);
    assert.equal(estUnParcoursSeme('Tout sur papier (168 exercices)'), true);
    assert.equal(estUnParcoursSeme('Tout sur papier (42 exercices)'), true,
        'le compte change avec le catalogue : on reconnaît le début');
    // ET LE TRAVAIL DE RÉMY N'EN FAIT PAS PARTIE.
    assert.equal(estUnParcoursSeme('Les priorités du jeudi'), false);
    assert.equal(estUnParcoursSeme('Découverte des fractions'), false,
        'un nom qui CONTIENT « découverte » n\'est pas le parcours semé');
    assert.equal(estUnParcoursSeme(''), false);
    assert.equal(estUnParcoursSeme(null), false);
    // On les reconnaît sur les deux formes d'entrée.
    assert.equal(estUnParcoursSeme({ name: DEBUT_PAPIER + ' (3 exercices)' }), true);
    assert.equal(estUnParcoursSeme({ data: { name: NOM_DECOUVERTE } }), true);
    assert.equal(estUnParcoursSeme(enveloppe('Les priorités du jeudi', ['calc-add'])), false);
});

// ──────────────────────────────────────── LE RACCORDEMENT, DANS LES DEUX SENS

test('LE DÉMARRAGE DESCEND LA BIBLIOTHÈQUE, ET AVANT DE LA MONTER', () => {
    const src = lire('js/core/parcoursServeur.js');
    const init = src.slice(src.indexOf('export async function initParcoursServeur'));
    // SANS LES COMMENTAIRES, et c'est `epreuveTombe.mjs` qui l'a dit : en
    // INVERSANT l'ordre des deux appels, cette épreuve restait VERTE. La raison
    // est que le commentaire au-dessus nomme `ramenerLaBibliotheque()` avant
    // `monterLaBibliotheque()` pour expliquer la décision — donc `indexOf`
    // trouvait le commentaire, jamais l'appel. Deuxième fois ce soir qu'une
    // épreuve lit la prose comme du code.
    const corps = sansCommentaires(init.slice(0, init.indexOf('\n}')));

    // LE DÉFAUT D'ORIGINE : `initParcoursServeur` ne montait que.
    assert.match(corps, /await ramenerLaBibliotheque\(\)/,
        'rien ne descend la bibliothèque au démarrage : un poste neuf reste vide');
    assert.match(corps, /await monterLaBibliotheque\(\)/,
        'rien ne remonte ce qui était resté à terre');
    // ET DANS CET ORDRE : monter d'abord, c'est laisser un poste neuf parler
    // avant d'avoir écouté.
    assert.ok(corps.indexOf('ramenerLaBibliotheque') < corps.indexOf('monterLaBibliotheque'),
        'on descend AVANT de monter, sinon un poste neuf peut appauvrir');
});

test('LE RAPATRIEMENT DÉBALLE, ET ÉCARTE CE QUE LE LOGICIEL SÈME', () => {
    const src = lire('js/core/parcoursServeur.js');
    const f = src.slice(src.indexOf('export async function ramenerLaBibliotheque'));
    const corps = f.slice(0, f.indexOf('\n}\n'));
    assert.match(corps, /cheminDeLEntree\(brut\)/,
        'une enveloppe passerait telle quelle à normalizePath, qui la vide');
    assert.match(corps, /estUnParcoursSeme\(brut\)/,
        'les parcours semés redescendraient et doubleraient la bibliothèque');
    // UNE RETOUCHE PAS ENCORE PARTIE DOIT SURVIVRE À UN DÉMARRAGE — et c'est
    // tout ce que cette épreuve a jamais voulu dire.
    //
    // ELLE EXIGEAIT `connus.has(brut.id)`, c'est-à-dire LA LIGNE, et non la
    // garantie. Or cette ligne faisait DEUX choses : protéger la retouche
    // locale (ce qu'on veut) et sauter tout parcours déjà connu (ce qui
    // empêchait une modification faite ailleurs de jamais descendre — le
    // défaut que Rémy a signalé : « le parcours que j'ai modifié sur mon ordi
    // perso n'est pas à jour sur mon ordi de boulot »).
    //
    // L'arbitrage remplace la ligne et garde la protection. Ce qui se vérifie
    // ici est donc qu'il soit BRANCHÉ ; que ses trois verdicts soient justes se
    // mesure dans `tests/arbitrageParcours.test.mjs`, où chacun a été vu tomber.
    assert.match(corps, /quiGagne\(/,
        'sans arbitrage, le rapatriement écrase ou saute — il n\'y a pas de milieu');
    assert.match(corps, /verdict === 'local'/,
        'rien ne protège plus une retouche locale pas encore partie');
    assert.match(corps, /verdict === 'serveur'/,
        'une modification faite sur l\'autre machine ne descendrait jamais');
    // ET L'ENTRÉE RANGÉE EST UNE ENVELOPPE, parce que c'est ce que l'explorateur
    // lit — `name`, `folderId`, `timestamp`.
    assert.match(corps, /folderId: brut\.folderId \|\| 'root'/,
        'un parcours nu entrerait dans la bibliothèque sans dossier ni date');
});

test('LA MONTÉE N\'ENVOIE PAS CE QUE LE LOGICIEL SE DONNE', () => {
    const src = lire('js/core/parcoursServeur.js');
    const f = src.slice(src.indexOf('export async function monterLaBibliotheque'));
    const corps = f.slice(0, f.indexOf('\n}\n'));
    assert.match(corps, /if \(estUnParcoursSeme\(p\)\) continue;/,
        'chaque nouvelle machine ajoute ses deux parcours semés au serveur');
});

// ─────────────────────────────────────────────────── ET LE PIÈGE DU `+` ─────

test('LA ROUTE DES PARCOURS DÉCODE VRAIMENT SON `data`', () => {
    // ─────────────────────────────────────────────────────────────────────
    // LE PIÈGE TENAIT EN UN CARACTÈRE, et il est assez vicieux pour mériter
    // une épreuve à lui : `$ligne + ['data' => ...]` garde le `data` de GAUCHE,
    // c'est-à-dire la chaîne brute de la base. Le champ existait, il avait le
    // bon nom, il contenait bien le parcours — en texte. Tout en aval le
    // jetait en silence.
    //
    // Le bout en bout le garde aussi (`php tools/testApi.php`, « le parcours
    // redescend DÉCODÉ »). Ici on garde la ligne, parce qu'une relecture
    // distraite peut remettre le `+` sans qu'aucun écran ne bronche.
    const api = lire('api/index.php');
    const route = api.slice(api.indexOf('function handleTeacherPaths'));
    // ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER LE DÉFAUT. Le correctif CITE
    // le code fautif pour l'expliquer, et la première version de cette épreuve
    // tombait dessus : elle accusait le commentaire qui raconte la correction.
    // Une épreuve qui lit les commentaires comme du code interdit d'expliquer
    // ce qu'on vient de corriger — et c'est la moitié du travail, ici.
    const corps = sansCommentaires(route.slice(0, route.indexOf('\nfunction ')));
    assert.match(corps, /array_merge\(\$r, \['data' => json_decode/,
        'le `+` de PHP garderait la chaîne brute et la bibliothèque ne descendrait plus');
    assert.doesNotMatch(corps, /\$r \+ \[/,
        'l\'opérateur `+` ne remplace pas une clef que la gauche porte déjà');
});
