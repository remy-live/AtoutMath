// LE TÉLÉPHONE DU PROFESSEUR, ET DEUX NOMS QUI SE RESSEMBLAIENT TROP.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après le tour des écrans : « pour le 2, 3, ok. Pour le 4 fais au mieux,
// pour le 5 dis une phrase bienveillante. »
//
// QUATRE CHOSES, DONT TROIS QUI NE SE VOIENT QU'À 390 PIXELS DE LARGE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const EC = lire('js/ui/espaceClasses.js');
const COMPOSANTS = lire('css/components.css');
const MISE_EN_PAGE = lire('css/layout.css');

// ── 2 ET 3 · DEUX GESTES VOISINS, DEUX NOMS QUI LE DISENT ───────────────────

test('« VOIR SON EXERCICE » DIT MAINTENANT CHEZ QUI ÇA S\'OUVRE', () => {
    // J'ai failli signaler un doublon : « son écran » d'un côté, « Voir son
    // exercice » de l'autre. Vérification faite, ce sont DEUX gestes — et le
    // plus puissant des deux portait le nom le plus vague.
    assert.match(EC, />Son exercice, chez moi<\/button>/);
    assert.ok(!/>Voir son exercice</.test(EC));
    // Et l'infobulle envoie vers l'autre, qui est le geste fort.
    assert.match(EC, /Pour voir ce qu'il a sous les yeux, c'est « Ouvrir son poste »/);
});

test('« SON ÉCRAN » DIT CE QU\'IL FAIT VRAIMENT : OUVRIR SON POSTE', () => {
    assert.match(EC, />Ouvrir son poste<\/button>/);
    assert.ok(!/>son écran</.test(EC));
    // « ici vous êtes lui » : c'est la différence, et elle mérite d'être dite.
    assert.match(EC, /connecté sous son nom\. C'est plus fort que « Son exercice, chez moi »/);
});

test('L\'ONGLET QUI CONTIENT DES ÉLÈVES S\'APPELLE LES ÉLÈVES', () => {
    // « La classe » à l'intérieur de l'écran d'une classe ne distingue rien de
    // ses quatre voisins — Le direct, Le mur, Les séances, Les bilans parlent
    // tous de la classe. Celui-ci est le seul qui liste des NOMS.
    assert.match(EC, /\$\{onglet\('liste', 'Les élèves'\)\}/);
    assert.ok(!/onglet\('liste', 'La classe'\)/.test(EC));
    // Et les renvois d'un écran à l'autre suivent, sinon le nom change à un
    // endroit et le mode d'emploi continue de citer l'ancien.
    assert.match(EC, /« Ouvrir son poste », dans l'onglet Les élèves/);
});

// ── 4 · LES TROIS DÉFAUTS DU TÉLÉPHONE ──────────────────────────────────────

test('LA BARRE D\'OUTILS EST UNE SEULE LISTE, PAS DEUX BOÎTES', () => {
    // MESURÉ sur 390 × 844 (`tools/tmp/barreOutils.mjs`) : trois rangées pour
    // CINQ icônes, dont deux rangées aux trois quarts vides. La cause n'est pas
    // la taille des boutons mais la coupure entre `.path-header-left` et
    // `.builder-header-actions` : un bloc ne se coupe pas.
    //
    //                          avant       après
    //   téléphone 390          3 rangées   2 rangées (titre + outils)
    //   tablette  820          3 rangées   2 rangées
    assert.match(COMPOSANTS, /@media \(max-width: 1000px\) \{[\s\S]{0,400}?\.path-header-left, \.builder-header-actions \{ display: contents; \}/);
    // `space-between` étalerait les icônes aux deux bouts de la ligne.
    assert.match(COMPOSANTS, /\.path-header-toggle \{ justify-content: flex-start; \}/);
    assert.match(COMPOSANTS, /\.path-header-title \{ flex: 1 1 100%; min-width: 0; \}/);
});

test('LES DEUX BOÎTES RESTENT DANS LE HTML — LEURS ÉCOUTEURS EN DÉPENDENT', () => {
    // `display: contents` n'enlève que la BOÎTE. Si quelqu'un « simplifiait »
    // en retirant les deux div du gabarit, le `stopPropagation` qui empêche la
    // barre de se replier quand on clique un outil partirait avec.
    const html = lire('index.html');
    assert.match(html, /<div class="builder-header-actions" onclick="event\.stopPropagation\(\)">/);
    assert.match(html, /<div class="path-header-left">/);
});

test('LA BARRE DU BAS PASSE AU-DESSUS DU TIROIR REPLIÉ', () => {
    // MESURÉ sur 390 × 844, professeur, en demandant qui reçoit le doigt au
    // milieu de chaque onglet (`tools/tmp/troisTel2.mjs`) :
    //
    //                                        avant     après
    //   onglets de la barre du bas pris      5 / 5     0 / 5
    //
    // Cinq sur cinq : Explorer, Exercices, Code, Parcours, Profil. Toute la
    // navigation du téléphone, invisible et morte — en permanence, puisque le
    // tiroir est replié tant qu'on ne l'ouvre pas. Ce qu'on voyait à la place,
    // c'étaient les onglets DU TIROIR, qui tombent au même endroit.
    assert.match(MISE_EN_PAGE, /body\.mobile-view\.teacher-mode #bottom-nav \{ z-index: 4100; \}/);
    // 4100 doit rester au-dessus du tiroir (4000) et de son voile (3999) : si
    // l'un des deux montait, la barre retournerait dessous en silence.
    // On lit le z-index du TIROIR COULISSANT, pas celui de `#sidebar` en
    // général : la première règle du fichier en pose un à 10, et un test qui
    // prend la première occurrence venue mesure autre chose que ce qu'il croit.
    const bloc = MISE_EN_PAGE.slice(MISE_EN_PAGE.indexOf(
        'body.mobile-view.teacher-mode #sidebar {\n    position: fixed'));
    const tiroir = Number((bloc.match(/z-index: (\d+);/) || [])[1]);
    assert.equal(tiroir, 4000, `tiroir à ${tiroir}`);
    assert.ok(4100 > tiroir, 'la barre du bas doit rester au-dessus du tiroir');
});

test('ET « PROF » RESTE ÉCRIT SUR LE TÉLÉPHONE', () => {
    // MESURÉ : la pastille faisait 44 px et un point de couleur ; le mot
    // « Prof » était bien dans le DOM, en `display: none`. Après : 63 px, mot
    // affiché.
    //
    // L'argument était déjà écrit trois lignes plus haut, pour la copie
    // d'essai : « le point de couleur ne dit pas dans quel rôle on est — il
    // faut le savoir d'avance pour le lire, ce qui est le contraire d'une
    // étiquette. » Il vaut partout.
    assert.match(MISE_EN_PAGE, /\.role-badge--prof \{ padding: 4px 10px; gap: 6px; \}/);
    assert.match(MISE_EN_PAGE, /\.role-badge--prof span:not\(\.role-badge-point\) \{ display: inline; \}/);
    // L'élève sans prénom garde le point seul : « Élève » est l'état normal,
    // celui qu'on ne doit pas remarquer. La règle générale reste donc là.
    assert.match(MISE_EN_PAGE, /\.role-badge span:not\(\.role-badge-point\) \{ display: none; \}/);
});
