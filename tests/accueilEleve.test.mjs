// L'ÉCRAN D'ACCUEIL D'UN ÉLÈVE NE DOIT PAS LUI MENTIR.
//
// Rémy : « Je veux vraiment qu'on ait un logiciel le plus user friendly possible
// pour la partie élève et prof. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI EST ÉPROUVÉ ICI VIENT D'UNE MESURE, pas d'une idée. Le harnais
// `tools/leTrajetDeLEleve.mjs` a fait entrer Zoé avec son billet, sur
// l'ordinateur de la salle, une séance déjà donnée à sa classe. Voici ce qu'elle
// lisait, dans l'ordre, sur l'écran où `app.js` l'envoie :
//
//   1. « Mon Parcours Actuel »
//   2. « Parcours du professeur » → « AUCUN PARCOURS ASSIGNÉ pour le moment.
//      Saisis le code donné par ton professeur. »
//   3. « Parcours du professeur » — LE MÊME TITRE, une seconde fois — proposant
//      « Tout sur papier (127 exercices) », un brouillon de Rémy.
//   4. …et 894 px plus bas, hors écran : sa séance.
//
// Chronométré (tools/tmp/chronoAccueil.mjs) : le message « Aucun parcours
// assigné » s'affichait à 0,5 s et Y RESTAIT — trente secondes plus tard,
// toujours là. Ce n'était pas une fenêtre de temps, c'était l'état permanent de
// l'écran. Après correction : état vide honnête à 0,5 s, puis la séance nommée
// à 1,05 s.
//
// LE DÉGÂT N'EST PAS L'AFFICHAGE. Un enfant de onze ans à qui l'on dit « tu n'as
// rien » alors qu'il a quelque chose lève la main — et c'est le professeur qui
// traverse la salle. Trente fois.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/ui/pathView.js', import.meta.url), 'utf8');

// ON ÉPROUVE LE CODE, PAS LES COMMENTAIRES. L'ancienne phrase est citée dans le
// commentaire qui explique pourquoi elle a disparu — c'est justement ce qu'on
// veut garder. Un essai qui interdirait d'en parler forcerait à effacer la
// mémoire du défaut en même temps que le défaut.
const vue = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');

test('L\'ÉCRAN NE DIT PLUS « aucun parcours assigné » SANS AVOIR REGARDÉ', () => {
    // La phrase elle-même n'existe plus : elle était affirmée sans que rien
    // n'ait consulté les séances reçues du serveur.
    assert.ok(!/Aucun parcours assign/i.test(vue),
        'cette phrase était fausse chaque fois qu\'une séance attendait');
    // Et l'écran demande maintenant à `maSeance.js` ce qui attend l'élève.
    assert.match(vue, /import \{ instantane, ouvrirSeance \} from '\.\/maSeance\.js'/,
        'l\'état vide doit interroger la séance avant de l\'affirmer');
    assert.match(vue, /function sectionSansParcours\(box\)/);
});

test('UNE SÉANCE QUI ATTEND EST MONTRÉE, avec un bouton pour l\'ouvrir', () => {
    // C'est le seul geste que l'élève ait à faire sur cet écran : il doit être
    // le plus visible.
    assert.match(vue, /ouvrirSeance\(etat\.seance\)/,
        'on passe par le chemin du code dicté, et non par un second');
    assert.match(vue, /Reprendre ma séance/);
    assert.match(vue, /Commencer ma séance/);
});

test('LE MOT DU PROFESSEUR SE LIT AVANT DE CLIQUER, pas après', () => {
    // S'il a écrit quelque chose à CET élève, c'est la consigne. La lire après
    // avoir ouvert la séance serait la lire trop tard.
    const bloc = vue.slice(vue.indexOf('function sectionSansParcours'),
        vue.indexOf('function assignedSection'));
    const rangMot = bloc.indexOf('path-section-mot');
    const rangBouton = bloc.indexOf('path-ouvrir-seance');
    assert.ok(rangMot > -1 && rangBouton > -1, 'les deux doivent exister');
    assert.ok(rangMot < rangBouton, 'le mot se pose avant le bouton');
});

test('L\'ÉTAT VIDE HONNÊTE RESTE, pour l\'élève qui n\'a vraiment rien', () => {
    // On ne remplace pas un mensonge par un silence : quand rien n'attend,
    // l'écran le dit — et c'est alors le bon moment de parler du code.
    assert.match(vue, /Ton professeur ne t'a rien donné pour le moment/);
    // ET L'ON NE L'ENVOIE PLUS CHERCHER AILLEURS. La phrase disait « le bouton
    // Code en haut de l'écran » ; mesuré, sur un téléphone ce bouton est en BAS
    // (`#mob-btn-code`), celui du haut disparaissant sous 900 px. Le bouton est
    // maintenant posé sous la phrase qui en parle.
    assert.ok(!/en haut de l'écran/.test(vue), 'on ne désigne plus une position');
    assert.match(vue, /data-ouvrir-code/);
    assert.match(vue, /J'ai un code/);
});

test('LA BIBLIOTHÈQUE DU PROFESSEUR NE S\'AFFICHE PAS CHEZ UN ÉLÈVE IDENTIFIÉ', () => {
    // Mesuré : Zoé, entrée avec son billet sur l'ordinateur de la salle, voyait
    // « Tout sur papier (127 exercices) » — un brouillon — présenté comme
    // « choisis-en un et lance-toi ! ». La section garde sa raison d'être sur un
    // poste SANS élève rattaché ; dès qu'un billet est présenté, le travail
    // vient du serveur.
    const bloc = vue.slice(vue.indexOf('function teacherPathsSection'),
        vue.indexOf('function teacherPathsSection') + 1400);
    assert.match(bloc, /if \(estRattache\(\)\) return null;/);
});

test('DEUX SECTIONS NE PORTENT PLUS LE MÊME TITRE', () => {
    // « Parcours du professeur » titrait à la fois la section qui disait « tu
    // n'as rien » et celle qui proposait les brouillons. Deux sections, le même
    // titre, et l'une contredisait l'autre.
    const titres = [...vue.matchAll(/path-section-title">([^<$]+)</g)].map(m => m[1].trim());
    const compte = titres.filter(t => t === 'Parcours du professeur').length;
    assert.ok(compte <= 1, `« Parcours du professeur » titre encore ${compte} sections`);
    assert.match(vue, /Préparés sur cet ordinateur/);
});

test('LA SÉANCE QUI ARRIVE EN COURS DE ROUTE REDESSINE L\'ÉCRAN', () => {
    // La synchronisation tourne toutes les dix secondes : la séance peut arriver
    // alors que l'élève est déjà posé sur cet écran. Sans cette écoute, il
    // continuait de lire « ton professeur ne t'a rien donné » jusqu'au prochain
    // rechargement de la page.
    assert.match(vue, /addEventListener\('seances_updated'/);
});
