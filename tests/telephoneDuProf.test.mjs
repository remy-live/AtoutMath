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
    assert.match(html, /<div class="builder-header-actions" data-ne-replie-pas>/);
    assert.match(html, /<div class="path-header-left">/);
    // CE TEST POINTAIT UN `onclick=` ÉCRIT DANS LA BALISE, et il est tombé le
    // jour où ce gestionnaire est devenu un écouteur — la CSP refuse du
    // JavaScript dans du HTML, pour la raison même qui la rend utile. Ce
    // qu'il protège n'a pas changé d'un pouce : les deux boîtes doivent
    // rester, et quelque chose doit toujours empêcher le clic de replier la
    // barre. On vérifie donc le bout qui a bougé, à son nouvel endroit.
    assert.match(lire('js/ui/builder.js'),
        /\[data-ne-replie-pas\][\s\S]{0,200}stopPropagation/);
});

test('LA BARRE DU BAS N\'EXISTE PLUS DANS L\'ESPACE DU PROFESSEUR', () => {
    // CE TEST A CHANGÉ D'AVIS, ET C'EST RÉMY QUI A EU RAISON.
    //
    // En v771 il gardait ma correction : la barre du bas était recouverte par
    // le tiroir replié — 5 onglets sur 5 inatteignables — et je l'avais
    // remontée au-dessus (`z-index: 4100`). Mesure juste, correction juste.
    //
    // Puis Rémy, capture d'iPhone en mode prof : « y a un intérêt à la zone
    // prof à la toolbar du bas ? » MESURÉ en appuyant sur les cinq, à
    // 390 × 844, parcours chargé, en vérifiant que le doigt atteignait bien le
    // bouton (`tools/tmp/barreDuBasProf.mjs`) :
    //
    //   Explorer    le bouton s'allume, l'écran ne change pas d'un caractère
    //   Exercices   idem
    //   Code        ouvre le code élève — DOUBLON du 🔗 de la barre d'outils
    //   Parcours    le bouton s'allume, l'écran ne change pas
    //   Profil      ouvre le profil d'ÉLÈVE : « Mes points », « Ce que tu dois
    //               réviser », tutoiement — chez quelqu'un qui porte « Prof »
    //
    // Deux sur cinq font quelque chose, et les deux sont des erreurs pour un
    // professeur. J'avais donc réparé la visibilité d'un bandeau qui n'avait
    // rien à faire là. La bonne question est venue après la bonne correction.
    //
    // MESURÉ APRÈS retrait : le tiroir replié remonte de 734 à 794, soit
    // soixante pixels rendus au parcours, et aucune bande morte en bas.
    assert.match(MISE_EN_PAGE, /body\.mobile-view\.teacher-mode #bottom-nav \{ display: none !important; \}/);
    // LA HAUTEUR AVEC. Un `display: none` seul aurait laissé soixante pixels de
    // vide : le tiroir se pose à `bottom: var(--bottom-nav-height)` et la
    // réserve sous le parcours se calcule dessus.
    assert.match(MISE_EN_PAGE, /body\.mobile-view\.teacher-mode \{\s*\n\s*--bottom-nav-height: 0px;\s*\n\}/);
    // ET L'ANCIENNE RÈGLE EST PARTIE, pas gardée « au cas où » : une règle qui
    // protège un élément absent raconte une histoire fausse au prochain lecteur.
    assert.ok(!/#bottom-nav \{ z-index: 4100; \}/.test(MISE_EN_PAGE));
});

test('MAIS L\'ÉLÈVE, LUI, GARDE SA NAVIGATION', () => {
    // C'est SA barre : Explorer, Exercices, Code, Parcours, Profil. Le retrait
    // ne vaut que sous `teacher-mode` ; la classe tombe quand on repasse élève,
    // et la barre revient avec sa hauteur.
    assert.match(MISE_EN_PAGE, /body\.mobile-view #bottom-nav \{ display: flex !important; \}/);
    const retrait = MISE_EN_PAGE.match(/(body\.mobile-view\.teacher-mode #bottom-nav \{ display: none)/);
    assert.ok(retrait && retrait[1].includes('teacher-mode'),
        'le retrait doit être conditionné au mode professeur');
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
