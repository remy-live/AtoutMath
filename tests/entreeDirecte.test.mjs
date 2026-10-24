// ON NE MONTRE PAS DEUX FOIS LE MÊME MONDE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux fois à des mois d'écart :
//
//   « il y a deux mouvements, le premier clic sur un écran joli qui prend
//     presque tout l'espace et après quand on clique on arrive sur le parcours »
//
//   « il y a toujours l'écran d'accueil avec le monde puis on clique et on va
//     sur le monde, il y a tjs deux étapes alors que si j'ouvre la séance, on
//     devrait pouvoir toujours aller directement sans double clic au monde »
//
// LA SECONDE FOIS PARCE QUE LA PREMIÈRE CORRECTION N'AVAIT FERMÉ QU'UN CHEMIN.
// `ui/maSeance.js` passait `sansCarteDOuverture` depuis des mois, avec la
// phrase de Rémy en commentaire. Mais c'est le bouton « Commencer ma séance »,
// et l'élève qui REPREND une séance — c'est-à-dire la plupart du temps — ne
// passe pas par là : il clique une étape sur la carte de « Mon Parcours », ou
// le bouton « Jouer : … » posé dessous. Ces deux-là appellent `launchAssigned`,
// qui ne disait rien au meneur, et le meneur redessinait la carte.
//
// C'EST LE MÊME MOTIF QUE LA CORBEILLE DES PARCOURS, LE MÊME JOUR : une
// correction juste, posée sur un seul des chemins qui mènent au même endroit.
// D'où cette épreuve, qui ne regarde pas un écran mais une RÈGLE :
//
//   **Tout code qui a DÉJÀ dessiné la carte et qui lance ensuite le meneur doit
//   lui dire d'où l'on vient.**
//
// Elle se lit dans la source en quelques millisecondes. `tools/entreeDansLaSeance.mjs`
// mesure les deux entrées pour de vrai, dans un navigateur — mais il met trois
// minutes, et une mesure de trois minutes ne se fait pas à chaque commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => sansCommentaires(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

const PATHVIEW = lire('js/ui/pathView.js');
const MASEANCE = lire('js/ui/maSeance.js');
const RUNNER = lire('js/core/runner.js');

test('CELUI QUI VIENT DE LA CARTE NE LA FAIT PAS REDESSINER', () => {
    // `js/ui/pathView.js` EST le fichier qui dessine la carte — `construireCarte`
    // y est appelée juste au-dessus. Le meneur qu'il lance ensuite part donc
    // forcément d'un écran où la carte était sous les yeux.
    assert.match(PATHVIEW, /construireCarte\s*\(/,
        'ce fichier est censé dessiner la carte : si ce n\'est plus vrai, cette épreuve mesure autre chose');

    const i = PATHVIEW.indexOf('async function launchAssigned');
    assert.ok(i > 0, '`launchAssigned` a disparu : la règle doit être reportée sur ce qui l\'a remplacée');
    const corps = PATHVIEW.slice(i, PATHVIEW.indexOf('\n}', i));
    assert.match(corps, /sansCarteDOuverture:\s*true/,
        'on arrive de la carte : le meneur doit le savoir, sinon il la redessine '
        + 'et l\'élève voit deux fois le même monde');
});

test('LE BOUTON « COMMENCER MA SÉANCE » NON PLUS', () => {
    // La correction d'origine. Elle tient toujours — on ne corrige pas un
    // chemin en cassant l'autre.
    const i = MASEANCE.indexOf('new Runner(');
    assert.ok(i > 0, 'ce fichier doit lancer un meneur');
    const corps = MASEANCE.slice(i, i + 700);
    assert.match(corps, /sansCarteDOuverture:\s*true/);
});

test('UN CODE DICTÉ GARDE SA CARTE — il n\'a rien vu', () => {
    // L'EXCEPTION, ET ELLE EST VOULUE. L'élève qui tape un code dicté n'a jamais
    // vu son parcours : « le parcours s'ouvre donc sur SA CARTE, plein écran, et
    // c'est lui qui donne le départ ». Lui sauter la carte le poserait devant
    // une question sans qu'il sache ce qu'il fait.
    //
    // On le garde ici pour que la règle précédente ne se propage pas « par
    // cohérence » à un endroit où elle serait fausse.
    const code = lire('js/ui/studentCodeUI.js');
    const i = code.indexOf('new Runner(');
    assert.ok(i > 0);
    const corps = code.slice(i, i + 400);
    assert.ok(!/sansCarteDOuverture/.test(corps),
        'un code dicté n\'a pas vu la carte : il doit l\'avoir');
});

test('L\'ORDRE LIBRE GARDE SA CARTE, MÊME EN VENANT DE LA CARTE', () => {
    // C'EST LE MENEUR QUI TIENT CETTE EXCEPTION, et c'est la bonne place : une
    // séance dont tout l'intérêt est que l'élève CHOISISSE par où commencer ne
    // peut pas sauter l'écran du choix. Si la règle était écrite chez chaque
    // appelant, il y en aurait un pour l'oublier — c'est précisément ce qui
    // vient d'arriver à `sansCarteDOuverture` lui-même.
    assert.match(RUNNER, /sansCarteDOuverture\s*&&\s*!this\.policy\.ordreLibre/,
        'le meneur doit rendre la carte d\'ouverture à une séance en ordre libre');
});

test('LA CARTE ENTRE LES ÉTAPES RESTE — on n\'a pas supprimé la carte', () => {
    // LE TÉMOIN. Si l'on avait « corrigé » le double écran en supprimant la
    // carte tout court, les quatre épreuves ci-dessus seraient vertes et le
    // parcours aurait perdu le seul endroit d'où l'on prend une étape
    // facultative ou un jeu de récompense gagné.
    assert.match(RUNNER, /showPathMap\s*\(\)/,
        'la carte du meneur doit exister : c\'est elle qui montre les étapes '
        + 'facultatives et les jeux gagnés');
    assert.match(RUNNER, /get avecCarte\s*\(\)/,
        'et la règle qui décide quand la montrer');
});
