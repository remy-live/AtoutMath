// UN MOT DU PROFESSEUR, ENTRE DEUX EXERCICES — toute la chaîne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
// message entre les exercices, pour expliquer un peu. »
//
// ── CE QUE CES ÉPREUVES GARDENT, ET DANS QUEL ORDRE DE DANGER ───────────────
//
// Une étape était TOUJOURS un exercice, nulle part écrit parce que nulle part
// mis en doute. Le mot du professeur est la première étape qui n'en est pas un,
// et il traverse tout : le modèle, le meneur, le barème, le fil, la carte,
// l'atelier, le code partagé et la fiche papier. Les défauts qu'on garde ici
// sont ceux qui ne se VOIENT PAS :
//
//   · `hydratePath` ÉCARTAIT toute étape sans exercice. Le mot disparaissait
//     en silence — à l'écran comme à l'impression ;
//   · `totalWeight` somme `st.weight || 1`, où ZÉRO VAUT UN : un parcours de
//     deux exercices et d'un mot aurait eu un barème sur trois ;
//   · le meneur SAUTE les étapes facultatives en avançant : marqué facultatif,
//     le mot ne se serait jamais affiché ;
//   · `compactStep` n'écrivait que `{ e: exerciseId }` : un parcours partagé
//     par lien perdait ses messages, et l'élève recevait l'enchaînement
//     d'exercices sans les explications écrites pour lui ;
//   · et la fiche papier lisait `s.exercise.printable` sur `null` : un seul mot
//     dans une séance, et plus RIEN ne s'imprimait.
//
// LE TEXTE LUI-MÊME est gardé à part, dans `messageEtape.test.mjs` : c'est le
// seul endroit du logiciel où du texte écrit par un professeur devient du HTML
// affiché à trente élèves.
//
// MESURÉ dans un vrai navigateur par `tools/motDansLeParcours.mjs`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// LE DÉCOR D'ABORD, ET C'EST UN ORDRE D'IMPORT QUI COMPTE : `printParcours.js`
// tire `state.js`, qui appelle `document.addEventListener` au chargement du
// module. Sans cette ligne EN PREMIER, le fichier entier tombe sur
// « document is not defined » avant la première épreuve.
import { sansCommentaires } from './helpers.mjs';
import '../js/core/activities/index.js';
import {
    makePath, makeStep, makeMessage, estUnMessage, normalizePath, hydratePath,
    totalItems, totalWeight, GENRE_MESSAGE
} from '../js/core/path.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { analyserParcours } from '../js/ui/printParcours.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/** Un parcours : un exercice, un mot, un exercice. */
const avecUnMot = () => makePath('La séance du jeudi', [
    makeStep('calc-add', {}, { stepId: 'a', nbItems: 6 }),
    makeMessage({ titre: 'Attention', texte: 'On change de *méthode*.' }, { stepId: 'm' }),
    makeStep('calc-prio', {}, { stepId: 'b', nbItems: 8 })
]);

// ─────────────────────────────────────────────── LE MODÈLE ──────────────────

test('ON DÉCLARE LE GENRE, ON NE DEVINE PAS À L\'ABSENCE D\'EXERCICE', () => {
    // Un parcours vraiment abîmé — un exercice renommé — doit rester
    // discernable d'un mot, sinon le premier s'afficherait comme le second.
    const mot = makeMessage({ texte: 'Bonjour' });
    assert.equal(mot.genre, GENRE_MESSAGE);
    assert.equal(estUnMessage(mot), true);
    assert.equal(estUnMessage({ exerciseId: 'ceci-nexiste-pas' }), false,
        'une étape cassée serait prise pour un message');
    // ET UNE ÉTAPE SANS GENRE EST UN EXERCICE : c'est ce qui fait que les
    // parcours déjà rangés partout continuent de marcher sans conversion.
    assert.equal(estUnMessage(makeStep('calc-add')), false);
    assert.equal(estUnMessage(null), false);
});

test('LE MOT SURVIT À `hydratePath`, QUI ÉCARTAIT TOUTE ÉTAPE SANS EXERCICE', () => {
    const h = hydratePath(avecUnMot());
    assert.equal(h.steps.length, 3, 'le mot a disparu en silence');
    assert.deepEqual(h.missing, [], 'le mot a été compté comme une étape abîmée');
    assert.equal(h.steps[1].exercise, null);
    // IL PORTE UN TITRE : le fil, la carte et l'atelier en demandent tous un.
    assert.equal(h.steps[1].title, 'Attention');
    // ET UNE ÉTAPE VRAIMENT CASSÉE EST TOUJOURS ÉCARTÉE, ET SIGNALÉE.
    const casse = hydratePath(makePath('X', [
        makeStep('calc-add'), { stepId: 'z', exerciseId: 'ceci-nexiste-pas' }]));
    assert.equal(casse.steps.length, 1);
    assert.deepEqual(casse.missing, ['ceci-nexiste-pas']);
});

test('UN MOT NE SE NOTE PAS, ET ZÉRO NE DOIT PAS VALOIR UN', () => {
    const p = avecUnMot();
    assert.equal(totalItems(p), 14, 'le mot ajoute des questions au total');
    // LE DÉFAUT QUE CELLE-CI GARDE : `totalWeight` lit `st.weight || 1`.
    assert.equal(totalWeight(p), 2, 'le barème compte le mot comme un exercice');
});

test('UN MOT N\'EST PAS FACULTATIF, SINON LE MENEUR LE SAUTE', () => {
    // `endStep` avance tant que l'étape suivante est `bonus` ou `facultatif` :
    // marqué facultatif, le mot ne s'afficherait JAMAIS.
    const mot = makeMessage({ texte: 'Lis-moi' });
    assert.equal(mot.facultatif, false);
    assert.equal(mot.bonus, false);
    // Et la normalisation ne le lui remet pas.
    const relu = normalizePath(avecUnMot());
    assert.equal(relu.steps[1].facultatif, false);
    assert.equal(relu.steps[1].nbItems, 0, 'dix questions par défaut sur un mot à lire');
});

test('LE MOT PASSE PAR JSON SANS RIEN PERDRE — c\'est le chemin du serveur', () => {
    const relu = normalizePath(JSON.parse(JSON.stringify(avecUnMot())), 'La séance du jeudi');
    assert.equal(relu.steps.length, 3);
    assert.deepEqual(relu.steps[1].message,
        { titre: 'Attention', texte: 'On change de *méthode*.' });
});

// ──────────────────────────────────── LE CODE QU'ON PARTAGE ─────────────────

test('LE CODE COURT REFUSE LE MOT, ET LE DIT AVEC SES MOTS', () => {
    // LE COÛT EST RÉEL : une séance qui porte un message se partage par le code
    // LONG, pas par les trois lettres qu'on dicte à voix haute.
    const raisons = Shortcodes.raisonsDuCodeLong(avecUnMot());
    assert.equal(raisons.length, 1);
    assert.match(raisons[0], /message/,
        '« cette étape n\'a pas d\'exercice » ferait croire à un parcours abîmé');
});

test('MAIS LE CODE LONG LE PORTE ENTIER', () => {
    const code = Shortcodes.encodePath(avecUnMot());
    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps.length, 3, 'le mot s\'est perdu dans le lien partagé');
    assert.equal(estUnMessage(relu.steps[1]), true);
    assert.deepEqual(relu.steps[1].message,
        { titre: 'Attention', texte: 'On change de *méthode*.' });
    // Et les exercices qui l'entourent n'ont pas bougé de place.
    assert.equal(relu.steps[0].exerciseId, 'calc-add');
    assert.equal(relu.steps[2].exerciseId, 'calc-prio');
    assert.equal(totalItems(relu), 14);
});

// ─────────────────────────────────────────── LA FICHE PAPIER ────────────────

test('UN MOT NE FAIT PLUS TOMBER LA FICHE ENTIÈRE', () => {
    // `s.exercise.printable` sur `null` : un seul mot, et plus rien ne
    // s'imprimait. C'est le genre de panne qui n'arrive qu'à l'imprimante de la
    // salle des profs, cinq minutes avant le cours.
    const a = analyserParcours(avecUnMot());
    assert.equal(a.papier.length + a.ecran.length, 2);
    assert.equal(a.total, 2, '« 3 exercices » ferait chercher une activité inexistante');
});

// ──────────────────────── LES ÉCRANS, GARDÉS PAR LEUR SOURCE ────────────────

test('LE MENEUR PEINT LE MOT, ET SORT AVANT DE MONTER UN MOTEUR', () => {
    const src = lire('js/core/runner.js');
    const f = sansCommentaires(src.slice(src.indexOf('    async runStep()')));
    const debut = f.slice(0, 900);
    assert.match(debut, /if \(estUnMessage\(step\)\) \{/,
        'le meneur chercherait un moteur, un chronomètre et une graine sur un mot');
    assert.match(debut, /return this\.showMessage\(step\)/);
    // ET IL ÉCRIT UNE ÉTAPE CLOSE AU JOURNAL : sans cela, l'élève resterait
    // éternellement « étape 2 sur 5 » et reprendrait au mot le lendemain.
    const p = src.slice(src.indexOf('    passerLeMessage(step)'));
    const corps = p.slice(0, p.indexOf('\n    }'));
    assert.match(corps, /EventTypes\.STEP_COMPLETED/);
    assert.match(corps, /questions: 0/);
    assert.match(corps, /exerciseId: null/);
    assert.match(corps, /passed: true/);
});

test('LE MOT SE RELIT DEPUIS LE FIL, MÊME POUR L\'ÉLÈVE', () => {
    // Rémy, interrogé : « oui, il reste dans le fil ». Un élève qui bloque à
    // l'exercice 3 doit pouvoir relire ce qui était écrit avant.
    const fil = lire('js/ui/filSeance.js');
    assert.match(fil, /data-mot="\$\{i\}"/, 'la case du mot n\'est pas cliquable');
    assert.match(fil, /function relireLeMot/);
    // ET PAR UNE FENÊTRE, PAS PAR L'ÉCRAN DU MENEUR : l'élève est peut-être au
    // milieu d'un exercice, et repeindre le canevas effacerait sa question.
    // SANS LES COMMENTAIRES, et c'est la quatrième fois de la soirée : la
    // phrase qui explique pourquoi on ne touche pas au canevas contient le mot
    // « canvas », et l'épreuve s'accusait elle-même. Voir `sansCommentaires`.
    const code = sansCommentaires(fil);
    assert.match(code, /relireLeMot[\s\S]{0,900}showModal/);
    assert.doesNotMatch(code, /relireLeMot[\s\S]{0,900}canvas/,
        'rouvrir le mot ne doit pas toucher à l\'exercice en cours');
});

test('L\'ATELIER SAIT L\'AJOUTER ET L\'ÉCRIRE, ET NE L\'ANNONCE PAS CASSÉ', () => {
    const b = lire('js/ui/builder.js');
    assert.match(b, /export function ajouterUnMot/);
    // ─────────────────────────────────────────────────────────────────────
    // IL N'Y A PLUS DE FENÊTRE POUR ÉCRIRE — Rémy : « c'est hyper vieillot et
    // en fait l'idéal est de pouvoir faire glisser en drag drop une ligne de
    // texte entre les exercices et on écrit directement non ? » L'écriture vit
    // dans la LIGNE, et le mot se dépose à sa place au glisser.
    assert.doesNotMatch(b, /function ecrireLeMot/,
        'la fenêtre modale est revenue : on écrit dans la ligne');
    assert.match(b, /class="path-mot-texte"/,
        'la ligne ne porte pas de champ : on ne peut plus écrire dedans');
    assert.match(b, /getData\('text\/mot'\) !== ''/,
        'on ne peut plus déposer un mot entre deux exercices');
    // LA POIGNÉE PORTE LE GLISSER, ET LA LIGNE NE L'A PLUS : un élément
    // `draggable` empêche de sélectionner le texte qu'il contient. C'est le
    // genre de défaut qu'on ne voit qu'en essayant de corriger une faute de
    // frappe au milieu d'une phrase.
    assert.match(b, /row\.draggable = false;[\s\S]{0,400}grip\.draggable = true;/,
        'la ligne déplaçable empêcherait de sélectionner son propre texte');
    // LA LIGNE DU MOT PASSE AVANT « Exercice introuvable » : sans cela, Rémy
    // venait d'écrire son message et l'atelier le lui annonçait abîmé.
    //
    // ON COMPARE LES DEUX CONDITIONS, PAS DEUX CHAÎNES. Ma première version
    // comparait `indexOf('path-step--mot')` et `indexOf('path-step--broken')` :
    // `epreuveTombe.mjs` a montré qu'elle restait VERTE en remplaçant le test
    // par `if (false)` — les chaînes sont toujours là, dans le même ordre, et
    // la branche ne s'exécute plus. Une épreuve qui garde une POSITION ne garde
    // rien quand c'est la CONDITION qui décide.
    const ligne = sansCommentaires(b.slice(b.indexOf('function stepRow(')));
    const corpsLigne = ligne.slice(0, ligne.indexOf('\n}'));
    const ouMot = corpsLigne.indexOf('if (estUnMessage(step))');
    const ouCasse = corpsLigne.indexOf('if (!exo)');
    assert.ok(ouMot !== -1, 'rien ne reconnaît un mot dans la ligne de l\'atelier');
    assert.ok(ouCasse !== -1 && ouMot < ouCasse,
        'le mot tomberait dans la branche « Exercice introuvable »');
    // UN MOT NE SE RÈGLE PAS, IL S'ÉCRIT : le clic sur la ligne pose le curseur
    // dans le champ, au lieu d'ouvrir un panneau de réglages qui n'aurait rien
    // à montrer sur une étape sans exercice ni moteur.
    const choisir = sansCommentaires(b.slice(b.indexOf('export function selectStep')));
    assert.match(choisir.slice(0, 700), /if \(estUnMessage\(step\)\) \{[\s\S]{0,200}\.focus\(\)/,
        'le clic sur un mot ouvrirait les réglages d\'un exercice qui n\'existe pas');
    // Et le bouton existe dans la page, avec un nom qu'on peut lire.
    assert.match(lire('index.html'), /id="btn-ajouter-mot"/);
});

test('LA CARTE ET LE FIL NE DISENT PAS « jouer » SUR UN MOT À LIRE', () => {
    const pv = lire('js/ui/pathView.js');
    assert.match(pv, /if \(estUnMessage\(step\)\) return '💬'/,
        'le mot se dessinerait comme un exercice de domaine inconnu');
    assert.match(pv, /mot \? 'à lire' : 'jouer'/,
        'le lecteur d\'écran annoncerait « jouer » sur un texte');
});

test('ET SA CASE DANS LE FIL NE S\'ÉTIRE PAS COMME UN EXERCICE', () => {
    // Une case qui prend le même tiers de la barre ferait croire à l'élève
    // qu'il a un tiers du travail devant lui.
    const css = lire('css/games.css');
    assert.match(css, /\.fil-pas--mot \{[^}]*flex: 0 0 14px/);
    assert.match(css, /\.fil-pas--mot \{[^}]*cursor: pointer/);
    // ET AUCUNE DÉCLARATION DE POLICE dans la feuille du mot. Rémy : « il faut
    // rester cohérent dans la police ». Gardé aussi par policeCoherente.
    const mod = lire('css/modules.css');
    const bloc = mod.slice(mod.indexOf('.run-mot-texte {'));
    assert.doesNotMatch(bloc.slice(0, 400), /font-family/,
        'le mot prendrait une autre police que le reste du logiciel');
});
