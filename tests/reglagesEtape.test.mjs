// LES RÉGLAGES D'UNE ÉTAPE : UNE FENÊTRE, ET UN APERÇU QUI SUIT.
//
// Rémy, mot à mot : « Si tu cliques sur les réglages, ça ouvre une modale
// (oublions le panneau latéral pour les réglages, ça surcharge trop l'écran)
// dans laquelle tu peux cocher / décocher, avoir un “tab” pour avoir un aperçu
// qui prenne en compte tes modifs. Et hop là tu as un tunnel. »
//
// Mesuré au navigateur, avant : le volet « Propriétés de l'étape » prenait
// 330 px sur un écran de 1440 et POUSSAIT le parcours. Après : le parcours
// passe de 790 à 1120 px, la fenêtre porte deux onglets, et une question
// réglée « plus grand terme = 6 » sort bien des termes ≤ 6.
//
// Le comportement complet se vérifie au navigateur (tools/tmp/leTunnel.mjs).
// Ici on tient les DEUX PIÈGES qui ont coûté une mesure chacun, et qu'aucune
// erreur ne signale quand ils reviennent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const RE = sansCommentaires(lire('js/ui/reglagesEtape.js'));
const BUILDER = sansCommentaires(lire('js/ui/builder.js'));

test('LA FENÊTRE A SES DEUX ONGLETS', () => {
    assert.match(RE, /data-vue="reglages"/);
    assert.match(RE, /data-vue="apercu"/);
    assert.match(RE, /role="tablist"/);
    assert.match(RE, /aria-selected/);
});

test('L\'ÉTAPE SE RELIT, ELLE NE SE GARDE PAS', () => {
    // LE PREMIER PIÈGE. Enregistrer un réglage REMPLACE l'objet dans
    // `state.currentPath.steps` : `steps[i] = updated`. Une fenêtre qui garde
    // la référence d'ouverture montre éternellement l'étape d'avant. Mesuré :
    // « Plus grand terme » ramené de 10 à 6, et l'aperçu tirait encore des 10 —
    // sans la moindre erreur, avec un aperçu qui se refaisait bel et bien.
    assert.match(RE, /typeof etape !== 'function'/,
        'la fenêtre exige une fonction, pas un objet');
    assert.match(RE, /const courante = etape\(\) \|\| \{\};/,
        'et elle la rappelle au moment de monter l\'aperçu');
    assert.match(BUILDER, /etape: \(\) => state\.currentPath\.steps\.find\(s => s\.stepId === stepId\)/);
});

test('CHAQUE FENÊTRE A SON PROPRE IDENTIFIANT DE CONTENEUR', () => {
    // LE SECOND PIÈGE. `renderGameConfigUI` dessine dans un élément trouvé par
    // `getElementById`. La fermeture d'une fenêtre laisse son voile 200 ms — le
    // temps du fondu. Rouvrir pendant ces 200 ms — ce qui arrive dès qu'on
    // clique sur une deuxième étape — donnait DEUX éléments du même
    // identifiant : les réglages se dessinaient dans la fenêtre en train de
    // disparaître, et la nouvelle restait vide. Silencieusement.
    assert.match(RE, /const idConfig = `re-config-\$\{\+\+numero\}`;/);
    assert.match(RE, /rendre\(idConfig,/);
    assert.ok(!/id="builder-config-content"/.test(RE),
        'plus d\'identifiant fixe, qui se dédoublerait');
    // Et l'on arrache le voile au lieu d'attendre le fondu quand on rouvre.
    assert.match(RE, /fermerReglagesEtape\(\{ net: true \}\)/);
});

test('L\'APERÇU SE REFAIT AU BON MOMENT, ni trop ni trop peu', () => {
    // Pas à chaque frappe — ce serait un montage de jeu par touche —, mais dès
    // qu'on revient le regarder. Et tout de suite si c'est lui qu'on regarde.
    assert.match(RE, /let perime = true;/);
    assert.match(RE, /if \(quoi === 'apercu' && perime\) monterApercu\(\);/);
    assert.match(RE, /perime = true;\s*\n\s*if \(vue === 'apercu'\) monterApercu\(\);/);
});

test('LE VOLET DE DROITE NE SERT PLUS AUX RÉGLAGES', () => {
    assert.ok(!/props-title/.test(BUILDER), 'plus de titre « Propriétés de l\'étape »');
    assert.ok(!/rendreTirable\(panel, fermerProps/.test(BUILDER));
    assert.match(BUILDER, /ouvrirReglagesEtape\(\{/);
    // …mais il reste pour « à qui ce parcours est donné » : on ne casse pas
    // l'autre usage du même panneau.
    assert.match(BUILDER, /builder-properties-panel/);
});

test('AJOUTER UN EXERCICE PRÉVIENT, mais n\'interrompt plus', () => {
    // Avant, l'ajout OUVRAIT les réglages tout seul — sauf sur téléphone, où
    // l'on avait dû le désactiver parce qu'un panneau plein écran après chaque
    // ajout empêchait d'en ajouter deux à la suite. Le défaut était le même sur
    // grand écran, simplement moins violent.
    const bloc = BUILDER.slice(BUILDER.indexOf('export function addStep'),
        BUILDER.indexOf('export function addStep') + 2200);
    assert.ok(!/if \(!document\.body\.classList\.contains\('mobile-view'\)\) selectStep/.test(bloc),
        'on n\'ouvre plus les réglages tout seul');
    assert.match(bloc, /ajouté — tu peux le régler/);
    assert.match(bloc, /bouton\.textContent = 'Régler';/,
        'l\'avis offre le geste qu\'il annonce');
    assert.match(bloc, /bouton\.onclick = \(\) => \{ selectStep\(step\.stepId\); avis\.remove\(\); \};/);
});

test('la géométrie de l\'aperçu n\'est écrite qu\'une fois', () => {
    // Deux copies de vingt lignes de géométrie finissent toujours par ne plus
    // se comporter pareil : la vignette du catalogue et cet aperçu-ci
    // partagent la même.
    const tiroir = sansCommentaires(lire('js/ui/apercuTiroir.js'));
    assert.match(tiroir, /export function adapterAuContenu\(t, \{ maxL, maxH, centrerDans = null, proche = null \}\)/);
    assert.match(RE, /import \{ adapterAuContenu, ajusterDesQueDessine, motDeRelance \} from '\.\/apercuTiroir\.js';/);
    // La vignette l'emploie aussi : sinon il y en aurait bien deux.
    assert.match(tiroir, /const m = adapterAuContenu\(t, \{ maxL: BORNES\.maxL, maxH: BORNES\.maxH, proche \}\);/);
});
