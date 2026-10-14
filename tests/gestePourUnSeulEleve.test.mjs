// CE QU'ON DONNE À UN ÉLÈVE, ON NE LE DONNE PAS À TRENTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois messages, la même chose :
//
//   « dans le direct quand je clique sur un élève ce serait cool de pouvoir lui
//     donner la calculatrice (juste à lui du coup) »
//   « il faudrait aussi pouvoir mais seulement pour le direct permettre de
//     débloquer tous les exercices (et aussi au cas par cas pour l'élève) quand
//     on clique dessus »
//   — et, le lendemain, après sa séance :
//   « la calculatrice s'est mises à toute la classe pour toute la séance »
//
// CE QUI S'EST PASSÉ. La calculatrice se donnait depuis la BARRE DE PILOTAGE,
// aux élèves COCHÉS dans la liste du direct — et sans coche, elle allait à
// toute la classe. Or cliquer sur un élève pour ouvrir sa fiche n'est pas le
// cocher : Rémy a cliqué sur son élève, puis appuyé sur « Autoriser », et le
// réglage le plus large était le défaut silencieux.
//
// LA CORRECTION N'EST PAS UN AVERTISSEMENT, C'EST UN ENDROIT. Le geste descend
// sur la FICHE DE L'ÉLÈVE, là où il n'y a aucun doute sur le destinataire : on
// vient de cliquer sur lui, son prénom est en haut, et le bouton le nomme.
// C'est exactement la correction qu'avait reçue « Laisse tomber celui-là ».
//
// Et « tout débloquer » suit le même chemin, avec la même portée — Rémy,
// interrogé : « Pour la séance en cours », c'est-à-dire l'exercice `*`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { appliquerEtat, peutSauter, calculatriceAccordee } from '../js/core/seanceDistante.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('`*` VEUT DIRE « TOUS » POUR LE SAUT AUSSI', () => {
    // La convention existait pour la calculatrice ; elle ne valait pas pour le
    // saut, qui comparait l'identifiant à la liste sans jamais regarder
    // l'étoile. Le serveur pouvait donc accorder « tout débloquer » et l'élève
    // ne rien recevoir — le pire des deux mondes, puisque le professeur, lui,
    // voyait son réglage posé.
    appliquerEtat({ skippable: [] });
    assert.equal(peutSauter('calc-add'), false);

    appliquerEtat({ skippable: ['calc-add'] });
    assert.equal(peutSauter('calc-add'), true);
    assert.equal(peutSauter('geo-thales'), false, 'un exercice nommé ne déborde pas');

    appliquerEtat({ skippable: ['*'] });
    assert.equal(peutSauter('calc-add'), true);
    assert.equal(peutSauter('geo-thales'), true);
    appliquerEtat({ skippable: [] });
});

test('LE SAUT NE S\'ÉTEINT PAS ICI, ET C\'EST VOULU', () => {
    // RÉMY : « est ce possible si sur un parcours, j'ai autorisé à passer
    // l'exercice, sur un autre parcours, cette même exercice peut se passer
    // aussi, j'ai l'impression que c'est ce qui est arrivé d'une séance sur
    // l'autre ? » C'était mesuré : oui. Puis, le soir même : « attache le à la
    // séance, pour le parcours on a déjà des sauts optionnels ».
    //
    // LA PREMIÈRE ÉCRITURE FILTRAIT ICI, sur le parcours ouvert par l'élève.
    // Elle est partie, et cette épreuve garde qu'elle ne revienne pas : la
    // liste que lit l'ardoise est DÉJÀ filtrée par le serveur, qui seul connaît
    // la séance imposée et son échéance. Refaire ce calcul sur trente appareils
    // dont les horloges ne s'accordent pas donnerait trente réponses.
    const src = lire('js/core/seanceDistante.js');
    const corps = src.slice(src.indexOf('export function peutSauter'));
    assert.match(corps.slice(0, 200), /peutSauter\(exerciceId\)/,
        'peutSauter ne doit rien demander d\'autre que l\'exercice');
    assert.ok(!/parcours/i.test(corps.slice(0, 400)),
        'le filtrage par parcours est revenu dans l\'ardoise');
    // Et le serveur, lui, le garde : voir `tools/testApi.php`, section 6.
    assert.match(lire('api/lib/seance.php'), /\$sienne !== null && \$sienne !== \$imposeId/,
        'le serveur ne filtre plus les sauts sur la séance imposée');
    assert.match(lire('api/lib/seance.php'), /\$quand > 0 && \$quand <= time\(\)/,
        'le serveur ne ferme plus les sauts à la fin de la journée');
});

test('SANS RÉGLAGE, RIEN — ni saut, ni calculatrice', () => {
    // Le témoin : une liste vide ne doit pas tout ouvrir par mégarde, et c'est
    // la faute qu'on fait en écrivant `includes('*')` sans garde.
    appliquerEtat({ skippable: [], calculatrice: [] });
    assert.equal(peutSauter('calc-add'), false);
    assert.equal(peutSauter(''), false);
    assert.equal(calculatriceAccordee('calc-add'), false);
    assert.equal(calculatriceAccordee(''), false);
});

test('LE SERVEUR REFUSE DE TOUT DÉBLOQUER POUR LA CLASSE', () => {
    // LA GARDE D'ORIGINE AVAIT RAISON, et on ne la retire pas : sauter tous
    // les exercices pour trente élèves, ce n'est pas un réglage, c'est annuler
    // la séance — et cela se fait en la retirant, pas en la vidant. Un clic,
    // trente séances perdues.
    //
    // La distinction est le DESTINATAIRE, pas le mode : c'est ce que dit la
    // condition, et c'est ce qu'on garde ici.
    const API = lire('api/index.php');
    assert.match(API, /\$pourDesEleves = !empty\(\$body\['studentIds'\]\)/);
    assert.match(API,
        /if \(\$exo === '\*' && \$mode !== 'calculatrice' && !\$pourDesEleves\) \{/);
});

test('LE RÉGLAGE PORTE L\'IDENTIFIANT DE SON ÉLÈVE, PAS SON PRÉNOM', () => {
    // IL Y A DEUX LUCAS DANS SA CLASSE. La fiche doit savoir si c'est LUI qui a
    // la calculatrice ; un prénom ne désigne personne, et le réglage se serait
    // affiché sur la fiche de l'autre — avec un bouton « Lui retirer » qui
    // aurait retiré au mauvais.
    const API = lire('api/index.php');
    assert.match(API, /'pourId' => \$o\['student_id'\] \?: null,/);
    const EC = lire('js/ui/espaceClasses.js');
    assert.match(EC, /x\.mode === mode\s*\n?\s*&& x\.exerciseId === '\*' && x\.pourId === eleveId/);
    // Et surtout : on ne compare JAMAIS le prénom pour décider cela.
    const i = EC.indexOf('function reglageDeLEleve');
    const bloc = EC.slice(i, EC.indexOf('function ficheHtml', i));
    assert.ok(bloc.length > 50, 'tranche vide : le test ne vérifierait rien');
    assert.ok(!/\.pour\b/.test(bloc), 'la fiche reconnaît son élève à son prénom');
});

test('LES DEUX GESTES SONT SUR LA FICHE, ET ILS LE NOMMENT', () => {
    const EC = lire('js/ui/espaceClasses.js');
    const i = EC.indexOf('function ficheHtml');
    const fiche = EC.slice(i, EC.indexOf('const MOT_ETAPE', i));
    assert.ok(fiche.length > 500, 'tranche vide : le test ne vérifierait rien');

    assert.match(fiche, /data-calc-eleve="\$\{esc\(e\.id\)\}"/);
    assert.match(fiche, /data-saut-tout="\$\{esc\(e\.id\)\}"/);
    // LE BOUTON DIT « LUI » : c'est tout ce qui distingue ce geste de celui de
    // la barre de pilotage, et c'est ce qui manquait.
    assert.match(fiche, /Lui donner la calculatrice/);
    assert.match(fiche, /Tout lui débloquer/);
    // ET IL DIT AUSSI COMMENT REVENIR EN ARRIÈRE : un réglage qu'on pose sans
    // pouvoir le retirer, on hésite à le poser.
    assert.match(fiche, /Lui retirer la calculatrice/);
    assert.match(fiche, /Refermer son parcours/);
});

test('LE DÉLÉGUÉ DE CLIC VOIT LES DEUX NOUVEAUX BOUTONS', () => {
    // LA FRICTION LA PLUS CHÈRE DU DÉPÔT, dans sa version écran : un bouton
    // qui existe dans le HTML et que personne n'écoute se comporte EXACTEMENT
    // comme un bouton cassé. Le direct branche un seul écouteur et retrouve sa
    // cible par une liste de sélecteurs ; un crochet oublié dans cette liste
    // est un bouton mort.
    const EC = lire('js/ui/espaceClasses.js');
    assert.match(EC, /\[data-calc-eleve\], \[data-saut-tout\],/);
});

test('ET ILS VALENT POUR LA SÉANCE EN COURS — c\'est ce que Rémy a demandé', () => {
    // « Pour la séance en cours », répond-il quand on lui pose la question.
    // C'est l'exercice `*` : les deux appels le passent en dur, et ne lisent
    // pas le menu « où » de la barre de pilotage, qui n'est pas sur cet écran.
    const EC = lire('js/ui/espaceClasses.js');
    assert.match(EC, /accorderLaCalculatrice\(cid, '\*', \[d\.calcEleve\]\)/);
    assert.match(EC, /reglerUnExercice\(cid, '\*', 'saut', d\.sautTout\)/);
    // ET « POUR LA SÉANCE EN COURS » EST DEVENU VRAI AU PIED DE LA LETTRE —
    // mais côté serveur. Rémy : « attache le à la séance, pour le parcours on a
    // déjà des sauts optionnels ». L'écran n'envoie donc rien de plus : c'est
    // le serveur qui écrit sur la ligne quelle séance était imposée et jusqu'à
    // quand elle vaut. Une première écriture faisait porter le parcours par le
    // bouton ; elle est partie, et c'est mieux — l'écran n'a plus rien à savoir.
    assert.ok(!EC.includes('data-parcours='),
        'le bouton ne doit plus porter le parcours : le serveur le sait mieux');
    const API = lire('api/index.php');
    assert.match(API, /\$laSeance = \$mode === 'saut' \? imposeEncoreValide\(\$classe\) : null;/,
        'le serveur n\'écrit plus la séance imposée sur la permission');
    assert.match(API, /\$jusqua = \$mode === 'saut' \? finDeLaJourneeScolaire\(\) : null;/,
        'le serveur n\'écrit plus d\'échéance sur la permission');
});
