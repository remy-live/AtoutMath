// LE BAC AU BOUT DU CHEMIN, ET L'ÉCRAN RANGÉ DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre, dans la même phrase que les mondes : « On peut aussi
// envisager que ce soit plein écran (en option là où on choisit le thème) où
// l'élève n'a pas accès à son profil, et on rajoute l'apparition du bac à sable
// si tout est fini qui se rajoute au monde ».
//
// DEUX DEMANDES, ET CHACUNE A UNE RÈGLE QUI SE DÉFAIT PAR DISTRACTION.
//
//   1. LE BAC NE S'OUVRE QU'UNE FOIS LA SÉANCE FINIE. C'est « la seule règle
//      qui ne se négocie pas » — elle est écrite en tête de
//      `core/bacASable.js`, et elle existe parce qu'un bac à sable trop
//      accessible fait BÂCLER le travail. Une pastille posée sur la carte
//      serait la façon la plus simple de la défaire sans s'en apercevoir : il
//      suffirait d'oublier de regarder `bac.ouvert`.
//   2. L'ÉCRAN RANGÉ NE S'APPLIQUE JAMAIS AU PROFESSEUR. Rémy le règle depuis
//      sa propre zone ; s'il y perdait son onglet « Profil », il l'éteindrait
//      aussitôt et pour de bon.
//
// ET UNE TROISIÈME, QUI VAUT POUR LES DEUX : CACHER UN BOUTON NE FERME PAS UNE
// PORTE. Le profil s'atteint aussi par un lien du bilan et par l'historique du
// navigateur ; le refus vit donc dans `setTopNavMode`, là où toutes les routes
// passent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const PV = lire('js/ui/pathView.js');
const NAV = lire('js/ui/navigation.js');
const KIOSQUE = lire('js/ui/ecranDeLEleve.js');
const CSS = lire('css/modules.css');
const PHP = lire('api/index.php');
const EC = lire('js/ui/espaceClasses.js');

// ── LE BAC À SABLE SUR LA CARTE ─────────────────────────────────────────────

test('LA PASTILLE DU BAC NE SE POSE QUE SI LE BAC EST OUVERT', () => {
    const i = PV.indexOf('function poserLaPastilleDuBac(');
    assert.notEqual(i, -1, 'la fonction a disparu');
    const corps = PV.slice(i, PV.indexOf('\n}', i));
    // LA PREMIÈRE LIGNE QUI COMPTE : sans elle, la pastille s'affiche dès la
    // première étape et le bac devient la porte de sortie qu'il a été écrit
    // pour ne pas être.
    assert.match(corps, /if\s*\(!bac\s*\|\|\s*!bac\.ouvert\)\s*return;/,
        'la pastille doit sortir quand le bac n’est pas ouvert');
    // ET ELLE NE RECALCULE RIEN. `etatDuBac` sait déjà POURQUOI il est fermé —
    // séance non finie, temps de la classe écoulé, bac fermé par le
    // professeur, quart d'heure de l'élève épuisé. Une seconde règle ici
    // finirait par dire le contraire de la première.
    assert.ok(!/avancement|faites|etapes\b/.test(corps),
        'la carte ne doit pas redécider si le bac est ouvert : elle lit la réponse');
});

test('ELLE PORTE LE BRANCHEMENT QUI OUVRE LE BAC', () => {
    // La pastille n'a AUCUN gestionnaire à elle : un écouteur unique, posé une
    // fois par `initBacASable`, ouvre le bac d'où qu'on clique. Sans cet
    // attribut, elle serait une jolie pastille qui ne fait rien — en silence.
    const i = PV.indexOf('function poserLaPastilleDuBac(');
    const corps = PV.slice(i, PV.indexOf('\n}', i));
    assert.match(corps, /data-ouvrir-bac/,
        'sans cet attribut, l’écouteur de `ui/bacASable.js` ne la voit pas');
    assert.match(PV, /import \{ etatDuBac \} from '\.\/bacASable\.js'/);
});

test('ET SON LISERÉ EST POINTILLÉ, DANS LES SEIZE MONDES', () => {
    // Elle ne ressemble à aucune étape, et c'est le but : le pointillé dit
    // « ceci n'est pas au programme » sans qu'on ait à l'écrire. Il emprunte
    // `--accent`, donc il suit le monde — vert tendre à Pâques, orange au
    // volcan — au lieu d'une couleur figée qui jurerait dans la moitié d'entre
    // eux.
    const i = CSS.indexOf('.world-node--bac .world-node-btn {');
    assert.notEqual(i, -1, 'la règle de la pastille du bac a disparu');
    const regle = CSS.slice(i, CSS.indexOf('}', i));
    assert.match(regle, /border-style:\s*dashed/);
    assert.match(regle, /var\(--accent\)/,
        'la couleur doit venir du monde, sinon elle jure dans la moitié d’entre eux');
});

// ── L'ÉCRAN RANGÉ DE L'ÉLÈVE ────────────────────────────────────────────────

test('LE MODE RANGÉ NE S’APPLIQUE JAMAIS AU PROFESSEUR', () => {
    assert.match(KIOSQUE, /classList\.contains\('teacher-mode'\)\)\s*return false;/,
        'Rémy règle cela depuis sa zone : s’il y perdait son onglet « Profil », '
        + 'il l’éteindrait aussitôt et pour de bon');
});

test('ET « ON NE SAIT PAS » N’EST PAS « OUI »', () => {
    // `reglageSite` rend `null` quand le serveur n'a jamais répondu — hors
    // ligne, installation sans serveur. On ne range pas l'écran d'un élève sur
    // une supposition : la comparaison est STRICTE avec la seule valeur qui
    // l'allume.
    assert.match(KIOSQUE, /reglageSite\('ecranDeLEleve'\) === KIOSQUE/,
        'une comparaison lâche ferait d’un serveur muet un écran amputé');
});

test('LE PROFIL SE REFUSE LÀ OÙ TOUTES LES ROUTES PASSENT', () => {
    // CACHER UN BOUTON NE FERME PAS UNE PORTE. Le profil s'atteint aussi par un
    // lien du bilan, par l'historique du navigateur, et par un bouton qu'on
    // ajoutera dans six mois sans penser à ce mode.
    const i = NAV.indexOf('export function setTopNavMode(');
    assert.notEqual(i, -1);
    const debut = NAV.slice(i, i + 900);
    assert.match(debut, /m === 'profile'[\s\S]{0,200}ecran-kiosque/,
        '`setTopNavMode` doit refuser le profil, pas seulement cacher ses boutons');
    assert.match(debut, /m = 'path'/,
        'et renvoyer au parcours : un écran vide se lirait comme une panne');
});

test('LES DEUX PORTES DU PROFIL SONT FERMÉES, PAS UNE', () => {
    // Celle du haut sur un écran large, celle du bas sur un téléphone. Une
    // seule suffirait à croire que c'est fait, et l'autre se découvrirait en
    // classe.
    assert.match(CSS, /body\.ecran-kiosque #top-btn-profile/);
    assert.match(CSS, /body\.ecran-kiosque #mob-btn-profile/);
    const i = CSS.indexOf('body.ecran-kiosque #top-btn-profile');
    assert.match(CSS.slice(i, i + 220), /display:\s*none\s*!important/,
        '`navigation.js` pose `display` EN LIGNE sur ces boutons : sans '
        + '`!important`, la porte réapparaît au premier changement de vue');
});

test('LE SERVEUR GARDE LE RÉGLAGE, ET N’EN INVENTE PAS', () => {
    assert.match(PHP, /'ecranDeLEleve' => lireReglage\('site\.ecranDeLEleve', ''\)/,
        'le réglage doit être rendu par le serveur, sinon il n’existe que sur un poste');
    assert.match(PHP, /\$e === 'kiosque' \? 'kiosque' : ''/,
        'tout le reste vaut « non » : un réglage d’affichage qu’on ne comprend pas '
        + 'doit rendre l’écran de toujours, jamais un écran amputé');
});

test('ET LA ZONE DU PROFESSEUR MET LE CACHE À JOUR', () => {
    // MESURÉ : le serveur répondait « kiosque » et le navigateur relisait « ».
    // `reglageSite` lit le CACHE local, pas la réponse du serveur — un réglage
    // enregistré sans `noterReglagesSite` ne vaut rien sur le poste où on
    // vient de le poser.
    const i = EC.indexOf("reglagesDuSite({ ecranDeLEleve:");
    assert.notEqual(i, -1, 'le réglage a disparu de la zone du professeur');
    // ON S'ARRÊTE AU GESTIONNAIRE SUIVANT. Une fenêtre de 900 caractères
    // attrapait le `noterReglagesSite` du DÉCOR, écrit juste en dessous : cette
    // épreuve est passée au vert avec le défaut remis, et `epreuveTombe` l'a
    // dit. Une épreuve qui lit par-dessus la cloison ne garde rien.
    const fin = EC.indexOf("data-decor-moment", i);
    const bloc = EC.slice(i, fin > i ? fin : i + 900);
    // ON VISE L'APPEL, PAS LE NOM. Le commentaire juste au-dessus explique
    // pourquoi `noterReglagesSite` est là — et il contient donc le mot. Retirer
    // l'appel laissait le commentaire, et l'épreuve restait verte : deuxième
    // fois en cinq minutes que ce fichier donne une assurance qui n'existe pas.
    assert.match(bloc, /noterReglagesSite\(vue\.reglagesSite\)/,
        'sans cela, le professeur pose le réglage et ne le voit pas prendre');
});
