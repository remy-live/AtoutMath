// LE MUR DES POSTES, ET LA BARRE DE DEBUG QU'ON NE TROUVAIT PLUS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « en tant qu'administrateur j'aimerais bien avoir encore les barres de
// debug ou pouvoir les réactiver quelque part, et aussi un mode qui m'ouvre
// soit quelques onglets soit une fenêtre avec plusieurs iframes où ça ouvre des
// fenêtres d'élèves, pour tester […] dans une séance en direct ou pas, que je
// puisse voir ce que cela donne pour plusieurs élèves. »
//
// ── 1 · LA BARRE DE DEBUG ÉTAIT LÀ, SOUS UN AUTRE NOM ───────────────────────
//
// L'interrupteur existait déjà, dans les Réglages d'affichage, et l'entrée par
// l'adresse aussi. Il s'appelait « Palette d'outils d'auteur » — un nom que
// personne ne formule dans sa tête. Rémy cherchait « la barre de debug ». Un
// réglage qu'on ne trouve pas est un réglage qui n'existe pas : on met les deux
// mots, et l'on ÉCRIT `?auteur=1`, qui n'était documenté que dans un
// commentaire du code, c'est-à-dire nulle part pour lui.
//
// ── 2 · LE MUR, ET CE QU'IL A FALLU LEVER ───────────────────────────────────
//
// Le préfixe de stockage d'un poste était FIXE (`poste:`). Deux cadres
// écrivaient donc dans le même tiroir.
//
// MESURÉ (`tools/tmp/murDesPostes.mjs`), quatre élèves d'une vraie classe,
// en lisant dans chaque cadre la PASTILLE DE RÔLE — qui vient du profil actif,
// donc du tiroir — et non le bandeau :
//
//                                    avant            après
//   sessions distinctes              3/4, puis 3/4,   4/4
//                                    puis 4/4
//   tiroirs de stockage distincts    1                5
//
// LE DÉFAUT EST INTERMITTENT, et c'est ce qui le rend méchant : trois passages
// ont donné 3/4, 3/4 puis 4/4. C'est une course entre quatre cadres qui se
// connectent ensemble. Un mur qui marche une fois sur trois est pire qu'un mur
// qui ne marche pas — on lui fait confiance.
//
// ET MA PREMIÈRE MESURE ÉTAIT FAUSSE, de la façon habituelle : elle lisait le
// BANDEAU de chaque cadre (« Vous voyez l'écran de X »), qui est écrit à partir
// du fragment de l'adresse. Il dit donc le bon nom même quand la session
// dessous est celle d'un autre — il m'a rendu « 4/4 » sur le code d'AVANT,
// c'est-à-dire l'inverse du défaut que je venais de trouver. La capture d'écran
// montrait pourtant « nguyen.maelle » au-dessus de la session de Tom.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adresseDuPoste, bandeauPourEssai } from '../js/ui/posteEleve.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const HTML = lire('index.html');
const MUR = lire('postes.html');
const EC = lire('js/ui/espaceClasses.js');

// ── 1 · LA BARRE DE DEBUG ───────────────────────────────────────────────────

test('L\'INTERRUPTEUR PORTE LE NOM QUE RÉMY EMPLOIE', () => {
    const APP = lire('js/app.js');
    assert.match(APP, /Palette d'outils d'auteur — la barre de debug/);
    // Et l'entrée par l'adresse est ÉCRITE, pas seulement codée : elle a été
    // faite pour son iPhone, où il n'y a pas de console.
    assert.match(APP, /<code>\?auteur=1<\/code> à la fin de/);
    assert.match(APP, /<code>\?auteur=0<\/code> l'éteint/);
    // Le mécanisme, lui, n'a pas bougé : on a renommé, pas réécrit.
    const OA = lire('js/core/outilsAuteur.js');
    assert.match(OA, /const CLE = 'atoutmath-outils-auteur';/);
    assert.match(OA, /if \(v === '1' \|\| v === '0'\) demande = v === '1';/);
});

// ── 2 · CHAQUE POSTE SON TIROIR ─────────────────────────────────────────────

test('LE PRÉFIXE DE STOCKAGE PORTE LA PLACE', () => {
    // C'est la ligne qui rend le mur possible, et elle est dans le script en
    // tête d'`index.html` : c'est le seul endroit qui s'exécute avant tous les
    // modules, donc le seul qui puisse remplacer `localStorage` sous eux.
    assert.match(HTML, /var n = parseInt\(p\.get\('poste'\), 10\);/);
    assert.match(HTML, /if \(!\(n >= 1 && n <= 12\)\) \{ return; \}/);
    assert.match(HTML, /var P = n === 1 \? 'poste:' : 'poste' \+ n \+ ':';/);
    // IndexedDB est commune à l'origine elle aussi : le journal de chaque
    // place a sa base, sinon deux élèves s'écriraient dessus dans le journal
    // pendant que leurs `localStorage` sont bien séparés.
    assert.match(HTML, /window\.__postePlace > 1 \? 'atoutmath-poste' \+ window\.__postePlace/);
});

test('LA PLACE 1 NE CHANGE PAS DE TIROIR', () => {
    // Ce n'est pas de la compatibilité — aucun élève n'utilise le logiciel —
    // c'est que « Ouvrir son poste », le geste courant, n'a aucune raison de
    // déménager le jour où l'on ajoute un mur.
    assert.equal(adresseDuPoste(null), 'index.html?poste=1');
    assert.equal(adresseDuPoste({ login: 'tom.b', code: '7777' }),
        'index.html?poste=1#billet=tom.b%2F7777');
});

test('ET LES AUTRES PLACES SONT BORNÉES', () => {
    assert.equal(adresseDuPoste({ login: 'a', code: '1' }, 'index.html', 5),
        'index.html?poste=5#billet=a%2F1');
    // Hors des douze, on RETOMBE dans les bornes plutôt que d'écrire une place
    // que le script d'index.html refuserait — il rendrait alors un poste
    // ORDINAIRE, c'est-à-dire la session du professeur dans le cadre.
    assert.equal(adresseDuPoste(null, 'index.html', 99), 'index.html?poste=12');
    assert.equal(adresseDuPoste(null, 'index.html', 0), 'index.html?poste=1');
    assert.equal(adresseDuPoste(null, 'index.html', 'bidon'), 'index.html?poste=1');
});

// ── 3 · LE MUR ──────────────────────────────────────────────────────────────

test('UNE SEULE FENÊTRE, ET C\'EST UNE CONTRAINTE DU NAVIGATEUR', () => {
    // Un navigateur n'autorise qu'UNE fenêtre surgissante par geste : quatre
    // `window.open` d'affilée, et trois sont bloqués en silence. Le professeur
    // croirait à une panne.
    assert.match(EC, /window\.open\(\s*\n\s*`postes\.html#eleves=\$\{encodeURIComponent\(billets\)\}`,/);
    assert.equal((EC.match(/postes\.html#eleves=/g) || []).length, 1);
});

test('LE MUR COMMENCE À LA PLACE 2', () => {
    // La place 1 appartient à « Ouvrir son poste » : un professeur qui a déjà
    // la fenêtre d'Alice ouverte et qui lance le mur ne doit pas voir les deux
    // se marcher dessus.
    assert.match(MUR, /var place = i \+ 2;/);
    assert.match(MUR, /'index\.html\?poste=' \+ place/);
});

test('LES CODES VOYAGENT DANS LE FRAGMENT, ET IL EST EFFACÉ', () => {
    // Un fragment n'est pas envoyé au serveur : ni journal d'Apache, ni
    // référent, ni historique d'intermédiaire. Et cette fenêtre-là finit
    // souvent au vidéoprojecteur. MESURÉ : l'adresse est vide après lecture.
    assert.match(MUR, /var brut = location\.hash\.replace\(\/\^#\/, ''\);/);
    assert.match(MUR, /history\.replaceState\(null, '', location\.pathname\);/);
    assert.ok(!/\?eleves=/.test(MUR), 'les codes ne doivent jamais passer en requête');
    assert.match(EC, /const billets = liste\.map\(e => `\$\{e\.login\}\/\$\{e\.code \|\| ''\}`\)\.join\(','\);/);
});

test('CE QUI VIENT DE L\'ADRESSE EST ÉCHAPPÉ', () => {
    // Rien n'empêche d'envoyer à un professeur un lien dont le fragment porte
    // du HTML : il s'exécuterait dans l'origine du site, avec son jeton à
    // portée. Le mur écrit les identifiants dans son `innerHTML`.
    assert.match(MUR, /function ech\(t\) \{/);
    assert.match(MUR, /'<span class="case-nom">' \+ ech\(e\.login\) \+ '<\/span>'/);
});

test('« VIDER LES TIROIRS » NE TOUCHE QUE LES TIROIRS', () => {
    // Le professeur et les postes partagent le MÊME localStorage d'origine :
    // un `clear()` ici effacerait sa session à lui. Le motif est la seule
    // chose qui l'en empêche.
    assert.match(MUR, /if \(k && \/\^poste\\d\*:\/\.test\(k\)\) aJeter\.push\(k\);/);
    assert.ok(!/localStorage\.clear\(\)/.test(MUR),
        'un clear() effacerait la session du professeur');
});

test('ET LE MUR NE S\'OUVRE PAS À MOINS DE DEUX ÉLÈVES', () => {
    // Un « mur » d'une seule case, c'est « Ouvrir son poste » avec une étape
    // de plus. Le bouton ne s'affiche pas, et le geste se refuse en le disant.
    assert.match(EC, /\$\{avec\.length > 1 \? `/);
    assert.match(EC, /if \(liste\.length < 2\) \{/);
    assert.match(EC, /Il faut au moins deux élèves avec un billet pour ouvrir un mur\./);
    // Et l'on dit QUI a été ouvert : « les premiers de la liste » est un choix,
    // pas une évidence.
    assert.match(EC, /\$\{liste\.length\} postes ouverts : \$\{liste\.map\(e => e\.login\)\.join\(', '\)\}/);
});

// ── 4 · LE BANDEAU DU POSTE, DANS UN CADRE ──────────────────────────────────

test('DANS UN CADRE, LE BANDEAU SE RÉDUIT À SON ÉTIQUETTE', () => {
    // MESURÉ dans la largeur d'une case, le même bandeau : 116 px ramenés à
    // 25. Sur une case de 360 px de haut, c'est le tiers de ce qu'on est venu
    // regarder — pour redire le nom que le mur écrit déjà en tête de la case.
    //
    // ON NE COMPTE PAS LES CARACTÈRES. Ma première version vérifiait que le
    // HTML court faisait moins de la moitié du long : 188 contre 360, donc
    // raté de huit caractères — et surtout, la longueur d'une chaîne de HTML
    // n'est pas une hauteur à l'écran. C'est la même erreur qu'avec le
    // bandeau lu à la place de la session, en plus petit. On vérifie ici ce
    // qui FAIT la hauteur : la phrase longue et le bouton.
    const court = bandeauPourEssai('tom.b', true);
    const long = bandeauPourEssai('tom.b', false);
    assert.match(court, /poste-bandeau-dedans--cadre/);
    assert.match(court, /<b>tom\.b<\/b>/);
    assert.ok(!/Votre session de professeur/.test(court),
        'la phrase de trois lignes est ce qui faisait la hauteur');
    assert.match(long, /Votre session de professeur/);
    // LE BOUTON PART AUSSI, et pas pour gagner de la place : « Fermer et
    // oublier » appelle `window.close()`, qui ne ferme pas un cadre. Il ne
    // resterait que le repli `location.replace`, qui laisserait une case
    // blanche sans que rien n'explique pourquoi.
    assert.ok(!/poste-sortir/.test(court));
    assert.match(long, /data-poste-sortir/);
});

test('ET LE CODE NE SUPPOSE PLUS QUE LE BOUTON EXISTE', () => {
    // `barre.querySelector('[data-poste-sortir]').addEventListener(...)` sur
    // un bandeau de cadre lèverait une exception — et c'est tout `initPosteEleve`
    // qui s'arrêterait là, donc le billet ne serait jamais rempli.
    const P = lire('js/ui/posteEleve.js');
    assert.match(P, /const sortir = barre\.querySelector\('\[data-poste-sortir\]'\);/);
    assert.match(P, /if \(sortir\) sortir\.addEventListener\('click'/);
});

test('LE CADRE SE RECONNAÎT SANS FAIRE TOMBER LA PAGE', () => {
    // `window.top` lève une exception quand le cadre vient d'une autre origine.
    // Le repli dit « oui, je suis dans un cadre » : c'est le cas le plus
    // probable quand la question ne peut pas se poser.
    const P = lire('js/ui/posteEleve.js');
    assert.match(P, /try \{ return window\.top !== window\.self; \} catch \(e\) \{ return true; \}/);
});
