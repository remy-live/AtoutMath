// « JE N'AI PLUS LES PARAMÈTRES QUI ME PERMETTENT DE DONNER UN PARCOURS À LA
// CLASSE. »
//
// Rémy a deux classes. Le panneau « à qui ce parcours est donné » s'ouvrait
// bien, et il y lisait : « Vous n'avez pas encore de classe. Créez-en une par
// la porte La classe, en haut. » Aucune case à cocher, donc aucun moyen de
// donner le parcours.
//
// MESURÉ en coupant l'API après l'identification (tools/tmp/donnerClasse.mjs
// --sans-api) : c'est exactement ce que le panneau affiche. `lireClasses`
// rendait un tableau vide quand le serveur ne répondait pas, et le panneau
// lisait ce vide comme un INVENTAIRE — « vous n'en avez pas » — alors que
// c'était un SILENCE — « je n'ai pas pu les lire ».
//
// La différence n'est pas cosmétique : la première phrase envoie un professeur
// qui a trois classes en fabriquer une quatrième, au milieu du geste, et le
// parcours qu'il voulait donner attend pendant ce temps-là.
//
// Après correction, toujours mesuré : API coupée → « Je n'ai pas pu lire vos
// classes : le serveur n'a pas répondu. Vos classes ne sont pas perdues. »
// avec un bouton « Réessayer » ; API rétablie et bouton cliqué → les deux
// classes reviennent, deux cases à cocher, sans que le panneau se referme.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const PANNEAU = sansCommentaires(lire('js/ui/parcoursClasses.js'));

test('PAS DE JETON N\'EST PAS UN SERVEUR MUET', async () => {
    // Un professeur qui n'est pas identifié travaille en local : ses classes
    // sortent du navigateur, et il n'y a AUCUN silence à signaler. Confondre
    // les deux ferait crier à la panne un logiciel qui marche.
    const { classesIllisibles, lireClasses, oublierLesClasses } =
        await import('../js/ui/donnerSeance.js');
    oublierLesClasses();
    assert.equal(classesIllisibles(), false);
    const c = await lireClasses();
    assert.ok(Array.isArray(c));
    assert.equal(classesIllisibles(), false,
        'une lecture locale réussie est prise pour une panne');
});

test('LE DRAPEAU SE LÈVE SUR L\'ERREUR, ET RETOMBE SUR LA RÉUSSITE', () => {
    const SEANCE = sansCommentaires(lire('js/ui/donnerSeance.js'));
    // Il se lève DANS la branche d'erreur — donc juste après le test qui la
    // reconnaît — et pas ailleurs.
    const i = SEANCE.indexOf('if (d && d.erreur)');
    assert.ok(i > 0, 'la branche d\'erreur a changé de forme');
    assert.match(SEANCE.slice(i, i + 200), /echecDerniereLecture = true;/);
    // Et il retombe à la lecture suivante qui réussit : sinon une panne
    // passagère laisserait le message d'alerte pour toute la session.
    assert.match(SEANCE, /echecDerniereLecture = false;\n {4}memoClasses =/);
    // Oublier les classes, c'est aussi oublier la panne.
    assert.match(SEANCE, /memoClasses = null; memoQuand = 0; echecDerniereLecture = false;/);
});

test('LE PANNEAU DIT « JE N\'AI PAS PU LIRE », PAS « VOUS N\'EN AVEZ PAS »', () => {
    // Les deux phrases existent, et c'est `classesIllisibles()` qui choisit.
    assert.match(PANNEAU, /classesIllisibles\(\)/);
    assert.match(PANNEAU, /Je n'ai pas pu lire vos classes/);
    assert.match(PANNEAU, /Vos classes ne sont pas perdues/);
    assert.match(PANNEAU, /Vous n'avez pas encore de classe/);
    // Le silence n'est pas un état vide : il se voit.
    assert.match(PANNEAU, /pc-vide pc-vide--muet/);
    assert.match(sansCommentaires(lire('css/ui.css')), /\.pc-vide--muet \{/);
});

test('« RÉESSAYER » REDEMANDE VRAIMENT AU SERVEUR', () => {
    // Sans `oublierLesClasses()`, la relecture rendrait le même souvenir vide
    // sans poser la question : le bouton tournerait dans le vide.
    const i = PANNEAU.indexOf('[data-reessayer]');
    assert.ok(i > 0, 'le bouton Réessayer a disparu');
    const bloc = PANNEAU.slice(i, i + 500);
    assert.match(bloc, /oublierLesClasses\(\)/);
    assert.match(bloc, /lireClasses\(\{ fraiches: true \}\)/);
    // Et le panneau se redessine sur place — il ne se referme pas, le
    // professeur n'a pas à retrouver son parcours.
    assert.match(bloc, /dessiner\(\)/);
    // La liste est réécrite SUR PLACE, donc c'est une copie : `lireClasses`
    // rend son propre souvenir, et le vider ici le viderait pour toute
    // l'application.
    assert.match(PANNEAU, /const classes = \[\.\.\.\(await lireClasses\(\)\)\];/);
    assert.match(bloc, /classes\.length = 0;/);
});

test('L\'AUTRE PORTE DIT LA MÊME CHOSE', () => {
    // `ouvrirDonnerSeance` est le second chemin vers le même geste (l'avion,
    // depuis la carte de séance). Il affichait la même phrase fausse.
    const SEANCE = sansCommentaires(lire('js/ui/donnerSeance.js'));
    const i = SEANCE.indexOf('if (!classes.length)');
    assert.ok(i > 0);
    const bloc = SEANCE.slice(i, i + 700);
    assert.match(bloc, /if \(classesIllisibles\(\)\)/);
    assert.match(bloc, /Je n.{0,2}ai pas pu lire vos classes/);
    assert.match(bloc, /le serveur n.{0,2}a pas/);
    // Et il rappelle la sortie qui marche sans serveur : le code à dicter.
    assert.match(bloc, /code à/);
});
