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
    assert.match(DECO, /export function seDeconnecter\(role = null\)/);
    assert.match(DECO, /if \(b\) b\.onclick = \(\) => seDeconnecter\(\);/);
    assert.match(DECO, /if \(be\) be\.onclick = \(\) => seDeconnecter\('eleve'\);/);
    assert.match(DECO, /if \(p\) p\.onclick = \(\) => seDeconnecter\(p\.dataset\.role \|\| null\);/);
    // ET LE CHOIX DU RÔLE N'EST ÉCRIT QU'UNE FOIS — trois boutons, une règle.
    const fois = (DECO.match(/if \(voulu === 'prof'\) deconnecterLeProf\(\);/g) || []).length;
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

// ──────────────────── DEUX IDENTITÉS SUR LA MÊME MACHINE, ET DEUX SORTIES ──
//
// RÉMY : « je suis désolé, je me suis mis sur un compte élève mais je ne
// trouve pas où me déconnecter ».
//
// IL N'Y AVAIT PAS À ÊTRE DÉSOLÉ : la porte n'existait pas. `quiEstLa()` rendait
// UNE identité, celle du professeur dès qu'un jeton de professeur existait — et
// sur sa machine les deux existent. Les deux boutons proposaient « Quitter le
// mode professeur », qui ne défait pas le rattachement de l'élève. Mesuré
// (`tools/deuxIdentites.mjs`) : deux jetons, zéro geste pour sortir.

test('LES DEUX RATTACHEMENTS SE LISENT, PAS SEULEMENT LE PREMIER', () => {
    const i = DECO.indexOf('export function lesIdentites()');
    assert.ok(i > 0, 'la fonction existe');
    const bloc = DECO.slice(i, i + 800);
    // LE PROFESSEUR S'AJOUTE, IL NE COURT-CIRCUITE PAS. C'est LE défaut : un
    // `return` ici et l'élève n'existe plus pour personne, ce qui enfermait
    // Rémy dans le compte de son élève sans aucune porte.
    assert.match(bloc, /if \(jetonProf\(\)\) out\.push\(/);
    assert.ok(!/if \(jetonProf\(\)\)\s*return/.test(bloc),
        'le professeur ne doit pas court-circuiter la lecture de l\'élève');
    // ET `quiEstLa` EST BÂTIE DESSUS : deux définitions de « qui est là »
    // finiraient par répondre deux choses, et c'est ce qui vient de se passer.
    assert.match(DECO, /export function quiEstLa\(\) \{\s*\n\s*return lesIdentites\(\)\[0\]/);
});

test('« MON PROFIL » PROPOSE DE SORTIR DE L\'ÉLÈVE, PAS DU PROFESSEUR', () => {
    // « Qui travaille ? » est la ligne de l'identité de l'ÉLÈVE : y proposer de
    // quitter le mode professeur, c'est répondre à côté — et c'est exactement
    // ce qui enfermait Rémy dans le compte de son élève.
    const i = DECO.indexOf("getElementById('btn-sortie-profil')");
    assert.ok(i > 0);
    const bloc = DECO.slice(i, i + 400);
    assert.match(bloc, /const ici = eleve \|\| qui;/);
    assert.match(bloc, /p\.dataset\.role = ici\.role;/);
});

test('ET LA FENÊTRE NOMME LA CLASSE QU\'ON QUITTE', () => {
    // `quiEstLa()` rendrait celle du professeur : la fenêtre disait « Tu vas te
    // déconnecter » tout court, sans nommer la classe — c'est précisément le
    // renseignement qui manque quand on a deux comptes.
    assert.match(DECO,
        /const qui = lesIdentites\(\)\.find\(x => x\.role === 'eleve'\) \|\| quiEstLa\(\);/);
});

test('la seconde sortie du menu n\'existe que dans le cas double', () => {
    // Une classe entière d'élèves ne doit jamais voir deux boutons de sortie :
    // eux n'ont qu'une identité, et la première la nomme déjà.
    assert.match(DECO, /be\.hidden = !\(eleve && toutes\.length > 1\);/);
    const i = PAGE.indexOf('id="btn-deconnexion-eleve"');
    assert.ok(i > 0, 'le bouton est déclaré dans la page');
    assert.match(PAGE.slice(i, PAGE.indexOf('>', i)), /\bhidden\b/);
});
