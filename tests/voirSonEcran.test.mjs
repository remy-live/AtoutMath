// VOIR L'ÉCRAN DE L'ÉLÈVE — ET POURQUOI ON NE LE POUVAIT PAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on ne peut plus voir l'écran de l'élève sur l'interface prof ? »
// puis « peut-on rendre la synchronisation plus réactive entre les postes
// élèves et professeurs ? »
//
// LES DEUX QUESTIONS N'EN FONT QU'UNE, ET LA RÉPONSE N'EST PAS UN DÉLAI.
//
// Rien n'avait été retiré. Les trois gestes existent, vérifiés à la souris :
//   · Les élèves, sur la ligne de chacun → « Ouvrir son poste » (ex « son
//     écran ») : ouvre, session juste, bandeau juste ;
//   · Le direct, en cliquant la LIGNE de l'élève → sa fiche, qui porte « Son
//     exercice, chez moi » (ex « Voir son exercice ») ;
//   · Les élèves → « Ouvrir un poste élève » et « Ouvrir plusieurs postes ».
//
// MAIS LE SECOND ÉTAIT GRISÉ, ET IL L'ÉTAIT PRESQUE TOUJOURS.
//
// MESURÉ (`tools/tmp/directSeance.mjs`), séance donnée à la classe, élève qui
// la commence pour de bon, exercice à son écran :
//
//                                       avant        après
//   ce que le serveur sait de son exo   « »          « calc-add »
//   « Son exercice, chez moi »          grisé        actif
//   le clic                             rien         ouvre Additions Mystères
//
// LA CAUSE. `gestesPossibles` exige `f.exercice`. Côté serveur,
// `derniereActivite` cherche un `exerciseId` dans les derniers événements ;
// `run_started` n'en porte pas — il parle du PARCOURS — et le premier à en
// porter était `attempt`, c'est-à-dire la première RÉPONSE. Le professeur ne
// pouvait donc pas voir l'écran de celui qui n'a encore rien répondu :
// exactement l'élève qu'il regarde, celui qui sèche depuis quatre minutes.
//
// Ce n'était donc pas un problème de fréquence. Raccourcir les battements
// n'aurait rien changé : il n'y avait rien à transmettre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventTypes } from '../js/core/journal.js';
import { gestesPossibles } from '../js/core/ficheEleve.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const R = lire('js/core/runner.js');
const EC = lire('js/ui/espaceClasses.js');

test('OUVRIR UNE ÉTAPE PRODUIT UN ÉVÉNEMENT QUI PORTE L\'EXERCICE', () => {
    assert.equal(EventTypes.STEP_STARTED, 'step_started');
    assert.match(R, /journal\.emit\(EventTypes\.STEP_STARTED, \{/);
    // C'est `exerciseId` qui débloque tout : c'est le nom que le serveur
    // cherche dans `derniereActivite`. Aucune ligne de PHP n'a changé.
    const bloc = R.slice(R.indexOf('journal.emit(EventTypes.STEP_STARTED'),
        R.indexOf('journal.emit(EventTypes.STEP_STARTED') + 900);
    assert.match(bloc, /exerciseId: step\.exerciseId/);
    assert.match(bloc, /stepId: step\.stepId/);
});

test('C\'EST L\'IDENTIFIANT, PAS L\'OBJET', () => {
    // MESURÉ avec `step.exercise`, qui est l'exercice HYDRATÉ : le direct
    // affichait « [object Object] » à la place du titre, et le bouton du
    // professeur ouvrait le vide. Le bouton était actif, et il mentait —
    // ce qui est pire que grisé.
    assert.match(R, /exerciseId: step\.exerciseId \|\| \(step\.exercise && step\.exercise\.id\) \|\| '',/);
});

test('LE BAC À SABLE RESTE DU BAC À SABLE', () => {
    // J'avais écrit `this.bacASable`, qui n'existe pas : toujours faux, donc
    // une partie du bac à sable serait passée pour du travail de séance dans
    // le direct. `run_started` lit `this.path.bac` — on lit la même chose.
    assert.match(R, /bac: !!\(this\.path && this\.path\.bac\)/);
    const runStarted = R.slice(R.indexOf('journal.emit(EventTypes.RUN_STARTED'),
        R.indexOf('journal.emit(EventTypes.RUN_STARTED') + 1400);
    assert.match(runStarted, /bac: !!this\.path\.bac/);
});

test('ET LE PROFESSEUR QUI REGARDE N\'ENTRE PAS DANS SON PROPRE DIRECT', () => {
    // Même règle que pour `run_started` : « Son exercice, chez moi » ouvre un
    // runner en `essai`, et un essai ne se journalise pas. Sans ce garde, le
    // professeur qui regarde l'écran d'Emma apparaîtrait comme travaillant sur
    // l'exercice d'Emma.
    assert.match(R, /if \(!this\.essai\) journal\.emit\(EventTypes\.STEP_STARTED/);
});

test('LA CONDITION DU BOUTON N\'A PAS BOUGÉ — C\'EST CE QU\'ON LUI DONNE QUI CHANGE', () => {
    // On n'a pas desserré la garde : un bouton « voir son exercice » actif
    // alors qu'on ignore lequel ouvrirait n'importe quoi. On a rendu la garde
    // satisfaisable au bon moment.
    assert.deepEqual(gestesPossibles({ id: 'e1', exercice: 'calc-add' }).indice, true);
    assert.deepEqual(gestesPossibles({ id: 'e1', exercice: '' }).indice, false);
    assert.deepEqual(gestesPossibles({ id: '', exercice: 'calc-add' }).indice, false);
});

test('LES TROIS GESTES EXISTENT TOUJOURS, SOUS LEURS NOMS DE v771', () => {
    // Rien n'a été retiré ; deux boutons ont été RENOMMÉS, et c'est bien assez
    // pour qu'on ne les retrouve plus. Le test garde les deux noms côte à côte
    // avec leur emplacement, pour que la prochaine question ait sa réponse ici.
    //
    //   Le direct, dans la FICHE (clic sur la ligne de l'élève) :
    assert.match(EC, />Son exercice, chez moi<\/button>/);
    //   Les élèves, sur la ligne de chacun :
    assert.match(EC, />Ouvrir son poste<\/button>/);
    //   Les élèves, en tête de liste :
    assert.match(EC, />Ouvrir un poste élève<\/button>/);
    assert.match(EC, />Ouvrir plusieurs postes<\/button>/);
});

test('LA FICHE S\'OUVRE EN CLIQUANT LA LIGNE, ET C\'EST LÀ QU\'EST LE BOUTON', () => {
    // C'est l'autre moitié de la réponse : le direct ne montre qu'une ligne par
    // élève, avec « mot » et « indice ». Tout le reste vit dans la fiche.
    assert.match(EC, /class="ec-rang-qui"/);
    const fiche = EC.slice(EC.indexOf('function ficheHtml'));
    assert.match(fiche.slice(0, 4000), /data-voir-exo/);
});
