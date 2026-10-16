// LA SORTIE DE L'ÉLÈVE, ET LA PORTE DE LA MAISON SUR LA LISTE DES CLASSES.
//
// RÉMY : « Dans la partie élève il n'y a pas d'endroit pour se déconnecter »,
// et « j'aimerai bloquer son accès chez lui, on peut le mettre dans l'onglet
// mes classes, là où tu affiches la liste de classe ».
//
// CE QUI SE MESURE AILLEURS. `tools/porteEtSortie.mjs` ouvre les deux écrans,
// clique, et regarde ce qui se passe — c'est lui qui prouve que le bouton se
// VOIT et que la porte se ferme vraiment. Ici on garde les trois règles qui se
// défont en silence, et qu'une sonde ne relance pas à chaque commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const PAGE = lire('index.html');
const DECO = lire('js/ui/deconnexionUI.js');
const CLASSES = lire('js/ui/espaceClasses.js');

test('LA SORTIE DE L\'ÉLÈVE EST CACHÉE TANT QU\'IL N\'EST RATTACHÉ À RIEN', () => {
    // Proposer « se déconnecter » à quelqu'un qui travaille hors ligne est une
    // porte qui ne mène nulle part — et qui inquiète : on se demande de quoi
    // on va être déconnecté, et ce qu'on va perdre. La règle existait déjà
    // pour le bouton du menu ; elle doit valoir pour celui-ci aussi, et c'est
    // l'attribut `hidden` du départ qui la rend vraie AVANT même que le
    // module n'ait tourné.
    const i = PAGE.indexOf('id="btn-sortie-profil"');
    assert.ok(i > 0, 'le bouton est déclaré dans la page');
    const balise = PAGE.slice(i, PAGE.indexOf('>', i));
    assert.match(balise, /\bhidden\b/);
});

test('UN SEUL GESTE POUR LES DEUX BOUTONS DE SORTIE', () => {
    // Le menu « ⋯ » et « Mon profil » déclenchent la même chose. Recopier le
    // choix du rôle à deux endroits est la façon connue de les voir diverger :
    // ce dépôt l'a déjà payé trois fois (voir docs/frictions.md).
    assert.match(DECO, /export function seDeconnecter\(\)/);
    assert.match(DECO, /getElementById\('btn-deconnexion'\);\s*\n\s*if \(b\) b\.onclick = seDeconnecter;/);
    assert.match(DECO, /getElementById\('btn-sortie-profil'\);\s*\n\s*if \(p\) p\.onclick = seDeconnecter;/);
    // ET LE CHOIX DU RÔLE N'EST ÉCRIT QU'UNE FOIS.
    const fois = (DECO.match(/if \(qui\.role === 'prof'\) deconnecterLeProf\(\);/g) || []).length;
    assert.equal(fois, 1, 'le dispatch de rôle est écrit une seule fois');
});

test('LA PORTE DE LA MAISON EST SUR LA CARTE DE CHAQUE CLASSE', () => {
    assert.match(CLASSES, /data-maison-classe="\$\{esc\(c\.id\)\}"/);
    // LE LIBELLÉ PORTE L'ÉTAT, PAS L'ACTION : « Maison ouverte » se lit d'un
    // coup d'œil sur six cartes ; « Fermer la maison » demande de déduire
    // l'état de ce qu'on propose.
    assert.match(CLASSES, /'Maison fermée' : 'Maison ouverte'/);
    // ET LE MOT DU PROFESSEUR VOYAGE AVEC : `fermerHorsSeance` envoie l'état
    // COMPLET, et poster une chaîne vide effacerait le message écrit ailleurs.
    assert.match(CLASSES, /data-mot="\$\{esc\(c\.hors_seance_mot \|\| ''\)\}"/);
});

test('APRÈS AVOIR FERMÉ, ON RELIT LA LISTE AU SERVEUR', () => {
    // MESURÉ, et c'est pour cela que cette épreuve existe : ma première
    // version écrivait `c.hors_seance` dans la liste qu'on a en mémoire, puis
    // redessinait. Le serveur enregistrait, et la carte disait toujours
    // « Maison ouverte » — `mesClasses()` rend le TABLEAU des classes, pas un
    // objet qui le contient, et l'écriture tombait à côté. Un écran qui ment
    // sur un réglage qu'on vient de poser est pire que pas de réglage : on
    // reclique, et l'on rouvre ce qu'on venait de fermer.
    const i = CLASSES.indexOf('const maison = e.target.closest(\'[data-maison-classe]\')');
    assert.ok(i > 0, 'le gestionnaire existe');
    const bloc = CLASSES.slice(i, i + 1600);
    assert.match(bloc, /const l = await mesClasses\(\);/);
    assert.ok(!/c\.hors_seance = /.test(bloc),
        'on ne retouche plus la liste en mémoire');
    // ON S'ARRÊTE AVANT LA CARTE : elle est cliquable en entier, et fermer la
    // maison ouvrirait la classe par la même occasion.
    assert.match(bloc, /e\.stopPropagation\(\);/);
});
