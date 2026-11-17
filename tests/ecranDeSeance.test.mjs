// L'ÉCRAN DE SÉANCE — ce qui ferme le profil, et les trois choses qui l'ouvrent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « quand j'impose une séance on pourrait pas mettre une
// popup (en option chèck de base) et quand l'élève valide ça met le parcours
// vraiment en plein écran […] et il ne peut accéder à son profil que si je l'y
// autorise ou qu'il a fini la séance. […] il faut que ce soit compatible avec
// le fait qu'il puisse réviser au soir à la maison ».
//
// Puis, quand je lui ai proposé de faire mourir le verrou à l'horloge :
//
//   « Le verrou meurt si il a fait la séance ou au moins un bout »
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET CE QUE LA SONDE GARDE ──────────────────
//
// ICI : la DÉCISION, qui est pure et qui s'éprouve sans navigateur — qui ferme
// le profil, et laquelle des trois portes l'ouvre. Plus les quelques points de
// montage dont un seul de travers rendrait toute la décision inopérante sans
// lever la moindre erreur.
//
// LÀ-BAS (`node tools/ecranDeSeance.mjs`) : le CHEMIN de l'élève en entier, sur
// un vrai serveur et dans un vrai navigateur — l'écran de départ qui s'affiche,
// le plein écran que son bouton obtient, les deux portes du profil, et le
// travail qui les rouvre. Une épreuve de source ne peut rien dire de tout cela.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { aFaitUnBout, profilFerme, CLASSE_FERME } from '../js/ui/ecranDeSeance.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ES = lire('js/ui/ecranDeSeance.js');
const MOMENT = lire('js/ui/leMoment.js');
const SEANCE_PHP = lire('api/lib/seance.php');
const SCHEMA = lire('api/lib/schema.php');
const API = lire('api/index.php');

/** Une séance imposée telle que le serveur l'envoie, profil fermé. */
const imposee = (sur = {}) => ({
    pathId: 'path_MARDI', name: 'Le devoir du mardi',
    pleinEcran: true, profilFerme: true, path: { steps: [] }, ...sur
});
/** Le parcours chargé chez l'élève. */
const charge = (sur = {}) => ({
    pathId: 'empreinte', seanceId: 'path_MARDI', completed: [], ...sur
});

test('UNE ÉTAPE FINIE OUVRE LE PROFIL — « ou qu\'il a fini la séance »', () => {
    assert.equal(profilFerme(imposee(), charge()), true,
        'rien de fait : le profil reste fermé');
    assert.equal(profilFerme(imposee(), charge({ completed: ['a'] })), false,
        'une étape finie ouvre le profil — c\'est « au moins un bout »');
    // ET LA PREMIÈRE SUFFIT : Rémy a écarté « la séance entière », parce que
    // l'élève qui cale sur l'étape 2 n'aurait plus aucune sortie.
    assert.equal(profilFerme(imposee(), charge({ completed: ['a', 'b', 'c'] })), false);
});

test('MAIS SEULEMENT UNE ÉTAPE DE CETTE SÉANCE-LÀ', () => {
    // LE PIÈGE QUE CETTE ÉPREUVE EXISTE POUR FERMER. Un élève peut avoir une
    // séance imposée ET taper un code dicté pour autre chose : trois étapes
    // finies dans un parcours qui n'a rien à voir ouvriraient son profil
    // pendant l'heure, et rien ne le signalerait — la séance serait bien
    // imposée, le travail bien fait, et la règle muette.
    assert.equal(aFaitUnBout(imposee(), charge({ seanceId: 'path_AUTRE', completed: ['a'] })),
        false, 'le travail d\'une autre séance ne compte pas');
    assert.equal(profilFerme(imposee(), charge({ seanceId: 'path_AUTRE', completed: ['a'] })),
        true, 'donc le profil reste fermé');
    // ET UNE SÉANCE SANS IDENTIFIANT NE PEUT RIEN PROUVER : un parcours chargé
    // avant que `seanceId` n'existe n'a pas de quoi dire d'où il vient. On
    // refuse plutôt que de deviner.
    assert.equal(aFaitUnBout(imposee(), charge({ seanceId: null, completed: ['a'] })), false);
});

test('SANS LA CASE DU PROFESSEUR, RIEN N\'EST FERMÉ', () => {
    // « en option » — et l'option est au professeur. Une séance imposée sans
    // l'écran de séance ne touche pas au profil de l'élève.
    assert.equal(profilFerme(imposee({ profilFerme: false }), charge()), false);
    assert.equal(profilFerme(null, charge()), false, 'pas de séance imposée, rien de fermé');
    assert.equal(profilFerme(undefined, undefined), false,
        'et un état qu\'on n\'a pas encore reçu ne ferme rien non plus');
});

test('LE PLEIN ÉCRAN SE DEMANDE DANS LE CLIC, SANS AUCUN `await` AVANT', () => {
    // LA RÈGLE LA PLUS CHÈRE DE CE CORRECTIF, et elle est invisible à la
    // lecture : un `await import()` rend la main au navigateur, et la demande
    // de plein écran qui suit n'est plus reconnue comme venant d'un geste. Elle
    // échoue alors EN SILENCE — pas d'erreur, pas de plein écran, et rien à
    // chercher. C'est le défaut qu'on vient de corriger ; l'écrire à nouveau
    // le réintroduirait sans que rien ne rougisse.
    assert.match(ES, /^import \{ basculerPleinEcran[^}]*\} from '\.\/fullscreen\.js';$/m,
        '`fullscreen.js` doit être importé EN TÊTE, pas à la demande');
    assert.match(MOMENT, /^import \{ appliquerEcranDeSeance[\s\S]{0,120}from '\.\/ecranDeSeance\.js';$/m,
        '`leMoment.js` aussi : c\'est lui qui monte l\'écran de départ');
    // Et dans le clic, l'appel est la première instruction.
    //
    // ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER. Le premier jet de cette
    // épreuve lisait le mot « await » dans le commentaire qui EXPLIQUE la
    // règle, juste au-dessus de l'appel — elle tombait donc sur du code sain,
    // et exactement parce qu'il était bien documenté.
    const clic = ES.slice(ES.indexOf('bouton.addEventListener'))
        .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    const avant = clic.slice(0, clic.indexOf('basculerPleinEcran'));
    assert.ok(!avant.includes('await'),
        'un `await` avant la demande de plein écran la ferait échouer en silence');
});

test('L\'ÉCRAN DE DÉPART EST MONTÉ LÀ OÙ LA SÉANCE S\'OUVRE TOUTE SEULE', () => {
    // UNE SÉANCE IMPOSÉE N'A PAS DE CLIC À ATTRAPER — c'est tout son intérêt,
    // « comme cela ils n'ont rien à lancer ». Le seul endroit du logiciel qui
    // sache qu'une séance vient de s'ouvrir d'elle-même est
    // `ouvrirLaSeanceImposee` ; ailleurs, l'écran de départ ne partirait pas,
    // et le plein écran non plus.
    const i = MOMENT.indexOf('function ouvrirLaSeanceImposee');
    assert.notEqual(i, -1);
    const corps = MOMENT.slice(i, MOMENT.indexOf('\n}', i));
    assert.match(corps, /montrerLEcranDeDepart\(impose\)/,
        'l\'écran de départ doit partir de l\'ouverture de la séance imposée');
    // ET LE PROFIL SE REFERME AU BATTEMENT, pas seulement au chargement : Rémy
    // peut rendre les profils au milieu de l'heure.
    assert.match(MOMENT, /document\.addEventListener\('seance_distante', surEtat\)/);
    assert.match(MOMENT, /document\.addEventListener\('studentPath_updated', appliquerEcranDeSeance\)/,
        'le travail de l\'élève doit rouvrir son profil SANS passer par le réseau');
});

test('LE SERVEUR N\'ENVOIE QUE CE QU\'IL SAIT, ET LE DIT', () => {
    // ON ENVOIE LA CONCLUSION, PAS LE RÉGLAGE — la règle de `etatDeSeance`.
    // Mais celle-ci est volontairement INCOMPLÈTE : le serveur ne connaît que
    // la décision du professeur. Le travail fait lui arrive par la
    // synchronisation, donc en retard et pas du tout hors ligne — un élève qui
    // vient de finir son étape doit retrouver son profil TOUT DE SUITE.
    const i = SEANCE_PHP.indexOf("'profilFerme'");
    assert.notEqual(i, -1, 'le serveur doit envoyer `profilFerme` avec la séance imposée');
    const regle = SEANCE_PHP.slice(i, i + 300);
    assert.match(regle, /impose_ecran_seance/, 'la case du professeur');
    assert.match(regle, /impose_profil_ouvert/, 'son autorisation à toute la classe');
    assert.match(regle, /profilRenduALui/, 'et son autorisation à cet élève-là');
});

test('LA CASE EST COCHÉE DE BASE — « en option chèck de base »', () => {
    // UNE COLONNE À ZÉRO PAR DÉFAUT NE SAIT PAS ÊTRE COCHÉE. C'est pour cela
    // que `impose_plein_ecran` est devenue `impose_ecran_seance` avec un défaut
    // à UN. Le jour où quelqu'un remet un `$bool` par commodité, la case
    // redeviendrait vide et personne ne le verrait avant la rentrée.
    assert.match(SCHEMA, /impose_ecran_seance INTEGER NOT NULL DEFAULT 1/,
        'le défaut doit être dans la COLONNE, pas dans un affichage');
    // ET ELLE N'EST PLUS REMISE À ZÉRO AU RETRAIT DE LA SÉANCE : une case
    // cochée par défaut qu'on décoche, et qui se recoche toute seule à la
    // séance suivante, n'est pas un réglage, c'est un piège.
    const i = API.indexOf("if ($pathId === '') {");
    assert.notEqual(i, -1);
    const retrait = API.slice(i, i + 900);
    assert.ok(!/impose_ecran_seance\s*=\s*0/.test(retrait),
        'le retrait de la séance ne doit plus effacer le choix du professeur');
});

test('UNE AUTORISATION EST DONNÉE POUR UNE HEURE, PAS POUR L\'ANNÉE', () => {
    // Sans cette remise à zéro, l'autorisation de mardi ouvrirait le profil de
    // jeudi — et le réglage serait à défaire élève par élève avant chaque
    // séance, ce que personne ne ferait. C'est la même règle que le compte à
    // rebours, éteint pour la même raison quand la séance change.
    const i = API.indexOf('$rendreLesProfils = function');
    assert.notEqual(i, -1, 'la remise à zéro des profils rendus a disparu');
    const corps = API.slice(i, i + 600);
    assert.match(corps, /if \(!\$changeDeSeance\) return;/,
        'elle ne doit agir que si la séance change VRAIMENT : la case « écran de '
        + 'séance » repasse par la même action avec la même séance');
    assert.match(corps, /UPDATE classes SET impose_profil_ouvert = 0/);
    assert.match(corps, /UPDATE students SET profil_ouvert = 0/,
        'les deux portées, sinon l\'une des deux survit');
});

test('LA CLASSE POSÉE SUR LE CORPS EST CELLE QUE LA FEUILLE ET LA ROUTE ATTENDENT', () => {
    // TROIS FICHIERS DOIVENT S'ACCORDER SUR UNE CHAÎNE, et rien ne les y oblige.
    // Une faute de frappe dans l'un des trois ne lève aucune erreur : le profil
    // reste simplement ouvert, et l'on cherche le défaut dans la décision.
    assert.equal(CLASSE_FERME, 'seance-profil-ferme');
    assert.match(lire('css/modules.css'),
        /body\.seance-profil-ferme #top-btn-profile/);
    assert.match(lire('js/ui/navigation.js'),
        /classList\.contains\('seance-profil-ferme'\)/);
});
