// « SI JE METS À JOUR ATOUT MATH ET QUE JE RÉINSTALLE ÇA SE MET BIEN À JOUR »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉPONSE MESURÉE (`node tools/sondeMiseAJour.mjs`), sur le chemin de sa sœur —
// une tablette préparée, un dépôt, un rechargement :
//
//   tablette préparée      580 fichiers, 91 de js/games/, verdict « prête »
//   elle recharge,  à 10 s  19 fichiers  ← le NOYAU, et rien d'autre
//                     15 s 257 fichiers, 2 de js/games/  (le rattrapage)
//                     40 s 257 fichiers, 2 de js/games/  (le palier)
//
// La mise à jour était propre ; la PRÉPARATION était perdue. Et les deux seuls
// fichiers de `js/games/` qui restaient sont `engine.js` et `configUI.js` —
// pas un seul jeu.
//
// Rémy a choisi les DEUX réparations : le worker reprend l'ancien cache, et la
// page le DIT quand il n'a pas pu. Cette épreuve garde les deux moitiés.
//
// ── CE QU'ELLE GARDE, ET POURQUOI CHAQUE LIGNE EXISTE ──────────────────────
//
// La décision d'avertir est une fonction pure, et c'est fait exprès : un
// bandeau qui crie pour rien est un bandeau qu'on apprend à ignorer, et le
// jour où il aura raison, personne ne le lira.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, declare } from './aidesCss.mjs';
import { direSiCestPerdu, lireLaMarque, marquerLaPreparation, CLE_MARQUE }
    from '../js/ui/prepaPerdue.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/** Un localStorage de poche : les épreuves ne tournent pas dans un navigateur. */
const magasin = () => {
    const d = new Map();
    return {
        getItem: (k) => (d.has(k) ? d.get(k) : null),
        setItem: (k, v) => d.set(k, String(v)),
        tout: d
    };
};

test('LE BANDEAU SE TAIT CHEZ QUI N\'A JAMAIS PRÉPARÉ DE TABLETTE', () => {
    // LE CAS DE TOUS LES ÉLÈVES DE RÉMY : salle informatique, postes câblés,
    // aucune préparation. Deux modules de jeu en cache est leur état NORMAL —
    // avertir là serait un faux signalement vingt-cinq fois par heure.
    assert.equal(direSiCestPerdu({ marque: null, jeux: 2 }), null);
    assert.equal(direSiCestPerdu({ marque: {}, jeux: 2 }), null);
    assert.equal(direSiCestPerdu({}), null);
});

test('IL PARLE QUAND LA MISE À JOUR A EMPORTÉ LES JEUX', () => {
    // LES CHIFFRES SONT CEUX DE LA MESURE : 91 avant, 2 après.
    const dit = direSiCestPerdu({ marque: { jeux: 91 }, jeux: 2 });
    assert.ok(dit, 'une tablette préparée tombée à 2 jeux sur 91 doit le dire');
    assert.match(dit.mot, /91/);
    assert.match(dit.mot, /2/);
    // ET IL DIT CE QUI SE PASSERA, pas ce qui s'est passé : « la mise à jour
    // n'a pas tout reprise » ne veut rien dire pour l'institutrice ; « sans
    // internet, les exercices ne s'ouvriront pas », si.
    assert.match(dit.mot, /sans internet/i);
    assert.match(dit.geste, /préparation/i);
});

test('IL NE CRIE PAS POUR UN EXERCICE RETIRÉ DU CATALOGUE', () => {
    // UN DÉPÔT QUI RETIRE UN EXERCICE laisse 90 modules là où la marque en dit
    // 91. Un seuil strict enverrait refaire vingt-cinq préparations pour rien.
    assert.equal(direSiCestPerdu({ marque: { jeux: 91 }, jeux: 90 }), null);
    assert.equal(direSiCestPerdu({ marque: { jeux: 91 }, jeux: 46 }), null);
    // La moitié tout juste perdue : on parle.
    assert.ok(direSiCestPerdu({ marque: { jeux: 91 }, jeux: 45 }));
});

test('IL SE TAIT HORS LIGNE — c\'est le seul moment où il ne faut pas', () => {
    // REFAIRE LA PRÉPARATION DEMANDE LE RÉSEAU. Hors ligne, le bandeau
    // offrirait un bouton incapable de marcher, au milieu d'une leçon.
    assert.equal(direSiCestPerdu({ marque: { jeux: 91 }, jeux: 2, enLigne: false }), null);
    assert.ok(direSiCestPerdu({ marque: { jeux: 91 }, jeux: 2, enLigne: true }));
});

test('LA MARQUE SE RELIT, ET UN MAGASIN ABÎMÉ NE FAIT RIEN TOMBER', () => {
    const m = magasin();
    assert.equal(lireLaMarque(m), null);
    assert.equal(marquerLaPreparation(91, m), true);
    assert.deepEqual(lireLaMarque(m).jeux, 91);
    // ZÉRO N'EST PAS UNE PRÉPARATION : poser la marque sur un échec ferait
    // crier le bandeau au rechargement suivant, pour rien.
    assert.equal(marquerLaPreparation(0, m), false);
    // ET UN CONTENU ILLISIBLE SE TAIT. En navigation privée, ou après un
    // nettoyage, `localStorage` rend n'importe quoi — y compris du vieux.
    m.setItem(CLE_MARQUE, 'ceci n\'est pas du JSON');
    assert.equal(lireLaMarque(m), null);
    m.setItem(CLE_MARQUE, '{"jeux":"beaucoup"}');
    assert.equal(lireLaMarque(m), null);
});

test('LA MARQUE N\'EST POSÉE QUE SUR UN BON VERDICT', () => {
    const M = sansCommentaires(lire('js/ui/preparerTablette.js'));
    assert.match(M, /v\.etat === 'ok' \? await compterLesJeuxGardes\(\) : 0/,
        'la préparation marque la tablette sans regarder son propre verdict : '
        + 'le bandeau crierait au rechargement suivant');
    assert.match(M, /if \(jeux\) marquerLaPreparation\(jeux\)/);
});

test('LE WORKER RELIT LES ADRESSES AVANT D\'EFFACER L\'ANCIEN CACHE', () => {
    // LE DÉFAUT QU'ON NE RATTRAPE PAS. Après `caches.delete`, il n'y a plus de
    // liste à relire : inverser ces deux lignes perd la préparation pour de
    // bon, et sans rien signaler — exactement le genre de défaut que ce
    // fichier existe pour empêcher.
    const SW = sansCommentaires(lire('sw.js'));
    const bloc = SW.slice(SW.indexOf('async function reprendreLAncien'));
    // ON CHERCHE `caches.open(nom)`, ET NON `.keys()`. Premier jet de cette
    // épreuve, et `epreuveTombe.mjs` a dit « CETTE ÉPREUVE NE GARDE RIEN » :
    // `.keys()` désigne aussi le `caches.keys()` de la première ligne de la
    // fonction, qui est toujours avant l'effacement. L'épreuve comparait donc
    // deux lignes dont l'ordre ne peut pas changer, et passait au vert avec le
    // défaut remis. C'est la deuxième fois dans ce dépôt qu'un garde écrit
    // pour tenir une règle ne tenait rien.
    const lecture = bloc.indexOf('caches.open(nom)');
    const effacement = bloc.indexOf('caches.delete');
    assert.ok(lecture > 0 && effacement > 0, 'reprendreLAncien a disparu de sw.js');
    assert.ok(lecture < effacement,
        'sw.js efface l\'ancien cache AVANT d\'en relire les adresses : la '
        + 'préparation de la tablette est alors perdue pour de bon');
    // ET L'ON PREND LA MAIN QUOI QU'IL ARRIVE. Un worker qui n'appelle pas
    // `clients.claim()` laisse la page sous l'ancien : la mise à jour aurait
    // l'air de ne pas être arrivée.
    assert.match(SW, /catch\(\(\) => self\.clients\.claim\(\)\)/,
        'un remplissage qui jette laisserait la page sous l\'ancien worker');
    // LES ADRESSES À QUESTION NE SE REPRENNENT PAS : les six feuilles de style
    // sont gardées sous `?v=1069`, et la version neuve les a déjà sous le sien.
    assert.match(bloc, /if \(u\.search\) continue;/);
});

test('LE BANDEAU NE FLOTTE PAS, ET IL ENTRE DANS LA PORTE', () => {
    // TROIS MESURES ONT ÉTÉ NÉCESSAIRES, et chacune a coûté une sonde :
    //
    //   en tête du `body`, dans le flux   INVISIBLE — la porte d'entrée est
    //                                     `fixed; inset: 0` et le recouvrait
    //   fixé en bas de l'écran            390 × 179, et il rendait
    //                                     inatteignables « Ouvrir le parcours »,
    //                                     « Je suis le professeur » et les
    //                                     trois onglets du bas
    //   fixé en haut                      rien de perdu à la porte, mais la
    //                                     barre du logiciel mangée : « ☰ »,
    //                                     « Préparer », « La classe »
    //
    // CE QUI TIENT : dans le flux, et dans la boîte de la porte quand la porte
    // est là. Mesuré alors sur une tablette de 810 × 1080 — celle de
    // l'institutrice — 774 × 71, et plus rien d'inatteignable nulle part.
    const corps = corpsDeLaRegle(lireFeuille('css/components.css'), '.prepa-perdue');
    assert.ok(corps, 'la règle .prepa-perdue a disparu');
    assert.ok(!declare(corps, 'position', 'fixed'),
        'le bandeau flotte de nouveau au-dessus de la page : il rend '
        + 'inatteignable ce qu\'il recouvre, mesuré deux fois');
    const M = sansCommentaires(lire('js/ui/prepaPerdue.js'));
    assert.match(M, /#portail \.portail-boite/,
        'le bandeau ne cherche plus la porte d\'entrée : posé dans le corps, '
        + 'il sera recouvert par elle, c\'est-à-dire invisible sur la tablette '
        + 'de l\'élève');
    assert.match(M, /offsetParent !== null/,
        'une porte EFFACÉE existe toujours dans le document : sans ce test, le '
        + 'bandeau se pose dedans et personne ne le lit');
});
