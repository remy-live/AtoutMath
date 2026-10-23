// LE CARNET DE L'ATELIER : UNE CAPTURE QU'ON GLISSE, ET TOUT LE CATALOGUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY :
//
//   « oui j'aimerai bien faire tous les tests et exporter en un fichier, tu me
//     rajoutes une zone ou je peux glisser une image (c'est cool avec le mac,
//     je prends une photo et je peux glisser) aussi pour l'exercice en cours »
//
// MESURÉ AVANT D'ÉCRIRE (tools/tmp/coutDuControle.mjs) : la tournée complète
// d'UN exercice prend 11,7 secondes, donc quarante-neuf minutes pour les 249
// du catalogue. C'est ce chiffre qui a dessiné le bouton — il le dit avant de
// partir, il offre une tournée rapide, et il s'arrête sans rien perdre.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Ce qui se voit à l'œil n'a pas besoin d'elle. Ce qu'elle garde, ce sont les
// quatre décisions qu'on ne voit pas et qui font tomber l'outil en silence :
//
//   · les captures en `data:` et non en `blob:` ;
//   · la réponse AVANT la fermeture de la fenêtre ;
//   · les captures qui s'en vont avec l'exercice ;
//   · et l'exercice courant rendu quoi qu'il arrive.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const A = sansCommentaires(readFileSync(new URL('../js/ui/atelier.js', import.meta.url), 'utf8'));
const BRUT = readFileSync(new URL('../js/ui/atelier.js', import.meta.url), 'utf8');

test('LA ZONE DE DÉPÔT EXISTE, ET PAR TROIS CHEMINS', () => {
    assert.match(A, /id="atl-depot"/);
    // LE GESTE DE RÉMY — glisser. `preventDefault` sur `dragover` est ce qui
    // distingue une zone de dépôt d'une page qui s'efface au profit de
    // l'image : c'est la moitié du défaut d'origine de `ui/deposerFichier.js`,
    // et elle se repaie à chaque zone.
    assert.match(A, /zone\.addEventListener\('dragover', \(e\) => \{\s*\n?\s*e\.preventDefault\(\);/);
    assert.match(A, /zone\.addEventListener\('drop'/);
    // ET LES DEUX AUTRES, parce qu'un seul chemin manque à qui ne l'a pas :
    // le coller (la capture va au presse-papier plutôt qu'au bureau) et le
    // clic (sur une tablette, il n'y a rien à glisser).
    assert.match(A, /panneau\.addEventListener\('paste'/);
    assert.match(A, /zone\.addEventListener\('click', \(\) => champ\.click\(\)\)/);
    // LE COLLER ÉCOUTE LE PANNEAU, PAS LA ZONE : on ne clique pas un cadre
    // avant de coller, et un ⌘V qui ne colle rien passe pour une panne.
    assert.ok(!/zone\.addEventListener\('paste'/.test(A),
        'le coller doit écouter le panneau entier');
});

test('UNE CAPTURE EST LUE EN data:, JAMAIS EN blob:', () => {
    // LE RELEVÉ TÉLÉCHARGÉ EST UN FICHIER AUTONOME — c'est toute sa raison
    // d'être : « Un seul fichier à m'envoyer. » Une adresse `blob:` y
    // pointerait vers une mémoire qui n'existe plus dès l'onglet fermé, et
    // Rémy m'enverrait un fichier plein de carrés vides sans le savoir.
    assert.match(A, /lecteur\.readAsDataURL\(f\)/);
    assert.ok(!/createObjectURL\(f\)/.test(A), 'une capture en blob: ne survit pas au fichier');
    // ET ELLE RESSORT DANS LA PAGE, avec son nom : trois captures sans
    // légende ne se distinguent pas.
    assert.match(BRUT, /\$\{photos\.map\(\(p, k\) => `<figure><figcaption>Capture \$\{k \+ 1\}/);
});

test('LES CAPTURES S\'EN VONT AVEC L\'EXERCICE', () => {
    // Une photo du Sudoku rangée sous « Additions Mystères » décrirait un
    // défaut qui n'y est pas — et c'est moi qui la lirais.
    const corps = A.slice(A.indexOf('function choisir(id)'),
        A.indexOf('function choisir(id)') + 700);
    assert.match(corps, /photos = \[\];/);
    assert.match(corps, /peindrePhotos\(\);/);
    assert.ok(corps.indexOf('photos = [];') < corps.indexOf('exoCourant = exo;'),
        'on vide les captures AVANT de changer d\'exercice');
});

test('« TOUT CONTRÔLER » DIT SON PRIX AVANT DE PARTIR', () => {
    // MESURÉ : 11,7 s par exercice. Un bouton qui promet « tous les tests » et
    // qui gèle le navigateur trois quarts d'heure sans prévenir serait pire
    // que pas de bouton.
    assert.match(A, /const minutes = Math\.round\(\(exercices\.length \* 11\.7\) \/ 60\);/);
    assert.match(A, /minutes \+ ' minutes/);
    // LES DEUX TOURNÉES, ET LE RENONCEMENT.
    for (const quoi of ['rapide', 'complete', '']) {
        assert.ok(A.includes(`data-tout="${quoi}"`), `le choix « ${quoi || 'annuler'} » a disparu`);
    }
    // LA RAPIDE EST UN SEUL SONDAGE : c'est ce qui la rend quatre fois plus
    // courte, et c'est la passe qui trouve un exercice qui ne se dessine pas.
    assert.match(A, /const tournee = rapide \? \[\{ quoi: 'jeu', formats: \['ordinateur'\] \}\] : TOURNEE;/);
});

test('ON RÉPOND AVANT DE FERMER LA FENÊTRE', () => {
    // LE DÉFAUT QU'ON A EU, ET QUI NE SE VOYAIT PAS. `showModal` rend
    // `{ close, element }` et appelle `options.onClose` depuis `close()`. Notre
    // `onClose` répond `null` — c'est ce qui rend la croix et le clic au
    // dehors équivalents à « Annuler ». Fermer AVANT de répondre, c'était donc
    // répondre « annuler » à chaque clic : la tournée ne partait jamais, et
    // rien ne le disait. Trouvé par la sonde, pas à la relecture.
    assert.match(A, /b\.onclick = \(\) => \{ resolve\(b\.dataset\.tout \|\| null\); f\.close\(\); \};/);
    assert.ok(!/f\.close\(\); resolve\(/.test(A), 'fermer avant de répondre annule tout');
});

test('L\'EXERCICE COURANT EST RENDU, QUOI QU\'IL ARRIVE', () => {
    // La tournée EMPRUNTE `exoCourant` — c'est lui que lit `adresse()`. Revenir
    // d'un contrôle sur un autre exercice que celui qu'on regardait serait une
    // trahison silencieuse : on réglerait le mauvais.
    const corps = A.slice(A.indexOf('async function controlerTout'),
        A.indexOf('function peindreControleCatalogue'));
    assert.match(corps, /const garde = exoCourant;/);
    assert.match(corps, /\} finally \{\s*\n\s*exoCourant = garde;/);
    assert.match(corps, /paramsCourants = gardeParams;/);
    // ET L'ARRÊT GARDE CE QUI EST FAIT : vingt minutes de tournée ne se
    // jettent pas parce qu'on a voulu s'arrêter.
    assert.match(corps, /if \(controleArrete\) break;/);
});

test('ET TOUT PART DANS LE MÊME FICHIER', () => {
    // C'est la demande entière : « exporter en un fichier ». Le contrôle du
    // catalogue et les captures doivent rejoindre le relevé, sans quoi ils
    // restent dans un onglet que je ne verrai jamais.
    assert.match(A, /lignes\.push\('## Le contrôle de TOUT le catalogue'\);/);
    assert.match(A, /lignes\.push\(catalogueEnTexte\(\)\);/);
    assert.match(BRUT, /lignes\.push\(`## Captures glissées \(\$\{photos\.length\}\)`\);/);
    // ET IL DIT CE QU'IL N'A PAS VU. Un rapport sur treize exercices qui se
    // lirait comme un rapport sur deux cent quarante-neuf serait un mensonge.
    assert.match(A, /Arrêté en route/);
});

// ─────────────────────────────────────────────────────────────────────────────
//
// ET LE FICHIER PORTE TOUT, PAS SEULEMENT CE QUI CLOCHE — 23 octobre.
//
// RÉMY, après avoir balayé le catalogue :
//
//   « oui mais du tout si je balaye tout je ne peux aps telecharger un seul
//     fichier de tous les bilans clairement plein d'exercices fonctionnent »
//
// L'ÉCRAN ET LE FICHIER N'ONT PAS LE MÊME MÉTIER. `peindreControleCatalogue`
// ne montre que les fautifs, et il a raison : deux cent quarante-neuf lignes
// « rien à signaler » noieraient les douze qui comptent. Mais le fichier n'est
// pas un tableau de bord, c'est un COMPTE RENDU — celui qu'il m'envoie, et sur
// lequel il veut pouvoir dire « regarde, tout ça marche ».

test('LE RELEVÉ PORTE TOUS LES BILANS, PAS SEULEMENT LES FAUTIFS', () => {
    const corps = A.slice(A.indexOf('function catalogueEnTexte'),
        A.indexOf('async function controler()'));
    // LA LISTE ENTIÈRE, ET ELLE DIT SA LONGUEUR : un titre « Tous les bilans »
    // sous lequel il n'y aurait que les fautifs serait un mensonge pire que le
    // silence d'avant.
    assert.match(corps, /### Tous les bilans \(\$\{bilansCatalogue\.length\}\)/);
    assert.match(corps, /bilansCatalogue\.forEach\(e => \{/,
        'la liste doit parcourir TOUT bilansCatalogue, pas la liste des fautifs');
    // UNE COCHE OU UNE CROIX PAR LIGNE : c'est ce qui rend deux cent cinquante
    // lignes relisables d'un coup d'œil.
    assert.match(corps, /soucis \? '✗' : '✓'/);
    // ET LE DÉTAIL DE CE QUI CLOCHE RESTE, EN TÊTE. On lit un rapport du haut,
    // et ce qui demande une décision passe devant ce qui n'en demande aucune.
    assert.ok(corps.indexOf('### Ce qui cloche') < corps.indexOf('### Tous les bilans'),
        'ce qui cloche se lit AVANT la liste entière');
});

test('ET LE NOM DU FICHIER DIT CE QU\'IL PORTE', () => {
    // LE DÉFAUT EXACT QU'IL A VU : le fichier s'appelait
    // `atelier-num-pgcd-ppcm-2026-10-23.html` alors qu'il portait les 249
    // exercices. Le nom décrivait l'exercice AFFICHÉ, pas le contenu — et
    // c'est le nom qu'on lit six mois plus tard dans un dossier de
    // téléchargements, quand on ne se souvient plus de rien.
    const corps = A.slice(A.indexOf('function enFichier'), A.indexOf('function deborde'));
    assert.match(corps, /const quoiDedans = bilansCatalogue \? 'catalogue' : exoCourant\.id;/);
    assert.match(corps, /a\.download = `atelier-\$\{quoiDedans\}-/);
    assert.ok(!/a\.download = `atelier-\$\{exoCourant\.id\}-\$\{new Date/.test(corps),
        'le nom ne doit plus venir du seul exercice affiché');
});

// ─────────────────────────────────────────────────────────────────────────────
//
// ET ON PEUT TOUT EFFACER — 23 octobre.
//
// RÉMY : « et aussi dans l'atelier, comment effacer tout le compte rendu »
//
// Il n'y avait aucun moyen, sauf recharger la page — ce qui coûtait aussi
// l'exercice choisi et les volets ouverts. Un relevé est une PREUVE, et une
// preuve qui traîne des mesures faites il y a une heure sur un autre réglage
// ne prouve rien.

test('ON PEUT TOUT EFFACER, ET LA FENÊTRE DIT QUOI', () => {
    assert.match(A, /id="atl-tout-effacer"/);
    assert.match(A, /panneau\.querySelector\('#atl-tout-effacer'\)\.onclick = toutEffacer;/);
    const corps = A.slice(A.indexOf('async function toutEffacer'),
        A.indexOf('async function controler()'));
    assert.ok(corps.length > 200, 'toutEffacer doit exister avant controler');
    // LES SIX CHOSES QUI S'ACCUMULENT. En oublier une, c'est laisser dans le
    // relevé suivant une mesure périmée que personne ne saura dater.
    for (const [quoi, motif] of [
        ['les bilans du contrôle', /bilans = \[\];/],
        ['le pilote', /bilanPilote = null;/],
        ['le catalogue', /bilansCatalogue = null;/],
        ['les captures', /photos = \[\];/],
        ['le carnet', /notes\.value = '';/],
        ['la console', /viderJournal\(\);/]
    ]) {
        assert.match(corps, motif, `« tout effacer » doit effacer ${quoi}`);
    }
    // LE CARNET SURVIT À LA PAGE : il est rangé dans le navigateur. L'effacer
    // à l'écran sans retirer la clef le ferait revenir au prochain F5, et l'on
    // croirait le bouton cassé.
    assert.match(corps, /localStorage\.removeItem\(CLE_NOTES\)/);
    // ON RÉPOND AVANT DE FERMER — le défaut déjà payé sur « Tout contrôler ».
    assert.match(corps, /resolve\(b\.dataset\.effacer === 'oui'\); f\.close\(\);/);
    // ET L'EXERCICE RESTE. C'est toute la différence avec un F5 : on efface le
    // compte rendu, pas la préparation.
    assert.ok(!/exoCourant = null/.test(corps) && !/paramsCourants = \{\}/.test(corps),
        'effacer le compte rendu ne doit pas perdre l\'exercice choisi');
});
