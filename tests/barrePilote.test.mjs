// LA BARRE DE PILOTAGE DU DIRECT — ce qu'elle doit garder.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « je trouve cela chargé, il faudrait améliorer
// cela ». Six rangées de cadres et une vingtaine de contrôles tenaient dépliés
// en permanence AU-DESSUS de la liste des élèves — c'est-à-dire au-dessus de ce
// qu'on vient regarder dans cet écran. Mesuré à la sonde après le repli : la
// barre passe de six rangées à deux, et 134 px de haut.
//
// ET, DANS LA MÊME CAPTURE : « pour le défi de la classe, on ne voit pas le
// temps (il est tronqué) » — « 1 mi » au lieu de « 1 min », parce qu'un
// déroulant portait la largeur fixe faite pour le champ des minutes du chrono.
//
// ── POURQUOI DES ÉPREUVES DE SOURCE ───────────────────────────────────────
//
// Cette barre ne se monte que dans un navigateur, dans l'espace professeur,
// sur une classe. Ce qui se vérifie ici est ce qui se lit ; la mesure, elle,
// se refait à la sonde (`tools/tmp/pilote.mjs`) et donne la hauteur, le nombre
// de pastilles et la largeur du déroulant.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';

const SOURCE = 'js/ui/espaceClasses.js';
const source = lireFeuille(SOURCE);

test('LES OUTILS DE L\'HEURE SE REPLIENT, UN PAR UN', () => {
    // SIX PASTILLES : hors séance, défi, compte à rebours, calculatrice, bac à
    // sable, et le mot au tableau. Chacune est un `details` — donc repliée par
    // défaut, et ouverte par un seul clic.
    const pastilles = source.match(/<details class="ec-pilote-outil/g) || [];
    assert.ok(pastilles.length >= 6,
        `il ne reste que ${pastilles.length} outils repliables : la barre se `
        + 'redéplie en entier au-dessus de la liste des élèves.');
    // ET LA PAUSE RESTE DÉPLIÉE : c'est le geste qu'on fait sans y penser.
    const avantLesOutils = source.slice(0, source.indexOf('<div class="ec-pilote-outils">'));
    assert.match(avantLesOutils, /data-pause=/,
        'la pause est passée dans un repli : elle doit rester sous la main');
    assert.match(avantLesOutils, /data-mot-classe/,
        'le mot à la classe est passé dans un repli');
});

test('UNE PASTILLE REPLIÉE DIT CE QUI AGIT DÉJÀ', () => {
    // REPLIER NE DOIT PAS CACHER CE QUI TOURNE. Un compte à rebours lancé, une
    // calculatrice accordée, une classe fermée hors séance : chacun se dit sur
    // sa pastille, sinon le professeur ne peut plus savoir ce qu'il a lancé
    // sans ouvrir les six.
    const vifs = source.match(/ec-pilote-outil-vif/g) || [];
    assert.ok(vifs.length >= 4,
        `seules ${vifs.length} pastilles disent leur état : replier cacherait `
        + 'ce qui agit sur la classe.');
    // ET LE CHRONO GARDE SON COMPTE SUR LA PASTILLE : la pastille porte
    // `ec-chrono-reste`, que le tic-tac réécrit chaque seconde.
    assert.match(source, /ec-pilote-outil-vif ec-chrono-reste/,
        'le temps restant a quitté la pastille : il faudrait déplier pour le lire');
    // ET LE TIC-TAC LES MET TOUS À JOUR : deux endroits le portent désormais,
    // la pastille et le cadre ouvert. Un `querySelector` n'en servirait qu'un.
    assert.match(source, /querySelectorAll\('\.ec-chrono-reste'\)/,
        'le tic-tac ne rafraîchit qu\'un seul affichage du temps restant');
});

test('LA DURÉE DU DÉFI SE LIT EN ENTIER', () => {
    // « 1 mi » au lieu de « 1 min » : la règle `.ec-pilote-cadre
    // .ec-champ--court { width: 4.2rem }` est faite pour le champ où l'on tape
    // « 10 », pas pour un déroulant qui doit loger un libellé ET la flèche du
    // navigateur.
    const bloc = source.slice(source.indexOf('data-defi-duree') - 400,
        source.indexOf('data-defi-duree') + 200);
    assert.doesNotMatch(bloc, /class="ec-champ ec-champ--court" data-defi-duree/,
        'la durée du défi est revenue dans un champ de 4,2 rem : elle sera tronquée');
    assert.match(source, /class="ec-champ ec-champ--mince" data-defi-duree/,
        'la durée du défi n\'a plus de largeur libre');
    // ET LA RÈGLE QU'ON ÉVITE EXISTE TOUJOURS, sans quoi cette épreuve
    // garderait un piège disparu.
    const corps = corpsDeLaRegle(lireFeuille('css/ui.css'),
        '.ec-pilote-cadre .ec-champ--court', { ou: 'css/ui.css' });
    assert.ok(parseFloat(valeurDe(corps, 'width')) <= 5,
        'la largeur fixe des champs courts a changé : relire cette épreuve');
});

test('L\'APERÇU DU DÉFI POSE LES VRAIES QUESTIONS', () => {
    // RÉMY : « ce serait cool d'avoir un apercu du jeu pour ne pas se tromper ».
    // L'aperçu appelle la fonction que le défi emploie LUI-MÊME
    // (`questionDuDefi`) : une seconde façon de tirer les questions finirait
    // par montrer autre chose que ce que la classe recevra.
    assert.match(source, /const \{ questionDuDefi \} = await import\('\.\/defiUI\.js'\)/,
        'l\'aperçu ne tire plus ses questions par la porte du défi');
    assert.match(lireFeuille('js/ui/defiUI.js'), /export function questionDuDefi/,
        'defiUI ne partage plus sa fabrique de questions');
    // ET IL DIT CE QUI CLOCHE AVANT LA CLASSE : un exercice sans choix ne peut
    // pas se jouer en QCM, et cela ne se voit qu'une fois lancé.
    assert.match(source, /ne propose pas de choix/,
        'l\'aperçu ne prévient plus quand le QCM n\'est pas possible');
});
