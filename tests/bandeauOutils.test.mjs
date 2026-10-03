// LA BANDE QUI NOMME LES ICÔNES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « bonne idée pour le bandeau ».
//
// CE QUI L'A MOTIVÉE. En refaisant le trajet d'un professeur neuf — parcours
// vide jusqu'à « Donné à 1 classe — 6 élèves », huit gestes
// (`tools/tmp/trajetSeance2.mjs`) — huit boutons d'icône à l'écran, et pas un
// mot sur aucun. L'infobulle existe, mais elle demande un survol : sur la
// tablette d'une salle de classe, il n'y en a pas.
//
// MESURÉ après (`tools/tmp/voirBandeau.mjs`) :
//
//                        nommés / visibles   hauteur
//   parcours vide            5 / 5            132 px
//   parcours rempli         11 / 11           209 px
//   téléphone 390           11 / 11           316 px
//   après « J'ai compris »   absent            —
//   au rechargement          absent            —
//
// « nommés = visibles » à chaque fois, et l'accord est vérifié nom par nom :
// la bande dit exactement ce qui est à l'écran, ni plus ni moins.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const B = lire('js/ui/bandeauOutils.js');
const CSS = lire('css/components.css');

test('LA LÉGENDE SE CONSTRUIT À PARTIR DES BOUTONS, JAMAIS À LA MAIN', () => {
    // C'est LA décision du module. Une légende écrite à la main est juste le
    // jour où on l'écrit et fausse au premier bouton renommé — cette semaine,
    // deux l'ont été (« Voir son exercice », « son écran »).
    assert.match(B, /\.querySelectorAll\('\.toolbar-icon-btn'\)/);
    assert.match(B, /b\.getAttribute\('aria-label'\) \|\| ''/);
    // Et l'icône est CLONÉE du vrai bouton : deux dessins à tenir d'accord
    // finiraient par ne plus l'être.
    assert.match(B, /svg\.cloneNode\(true\)/);
    // Aucun nom d'outil en dur : s'il y en avait un, il vivrait sa vie.
    assert.ok(!/Choisir un exercice|Nouveau parcours|Code Élève/.test(B),
        'un nom d\'outil écrit en dur dans la légende : il divergera');
});

test('ELLE NE NOMME QUE CE QUI EST À L\'ÉCRAN', () => {
    // Sur un parcours vide, sept outils sont cachés : les nommer désignerait
    // des boutons introuvables, ce qui est pire que se taire.
    assert.match(B, /\.filter\(b => !b\.hidden && b\.offsetParent !== null\)/);
    // Un bouton sans `aria-label` est sauté, pas baptisé « Bouton ».
    assert.match(B, /\.filter\(o => o\.nom\);/);
});

test('ELLE SE REFAIT QUAND LES OUTILS APPARAISSENT', () => {
    // Posée une seule fois au démarrage, elle nommerait éternellement cinq
    // outils sur douze. `renderTeacherPath` vient justement de montrer ou de
    // cacher les sept autres : c'est là qu'il faut la refaire.
    const BU = lire('js/ui/builder.js');
    assert.match(BU, /import \{ poserLeBandeauDesOutils, basculerLeBandeauDesOutils \} from '\.\/bandeauOutils\.js';/);
    assert.match(BU, /majBarreSelection\(\);[\s\S]{0,400}?poserLeBandeauDesOutils\(\);\s*\n\s*autoSavePath\(\);/);
    // Et elle se pose APRÈS `outilsDuParcours`, sinon elle lirait l'état d'avant.
    assert.ok(BU.indexOf('outilsDuParcours(steps.length > 0)')
        < BU.indexOf('poserLeBandeauDesOutils()'));
});

test('ELLE PART POUR DE BON', () => {
    // Un bandeau d'aide qui revient est un bandeau qu'on apprend à ignorer,
    // puis à détester. Mesuré : absent après le clic, absent au rechargement.
    assert.match(B, /const CLEF = 'atoutmath-bandeau-outils';/);
    assert.match(B, /if \(congedie\(\) && !montreeALaDemande\) \{ if \(ancienne\) ancienne\.remove\(\); return; \}/);
    assert.match(B, /compris\.onclick = \(\) => \{ congedier\(\); montreeALaDemande = false; retirer\(\); \};/);
    // Le mode privé ne doit pas faire tomber le rendu du parcours avec lui.
    assert.match(B, /try \{ return localStorage\.getItem\(CLEF\) === 'vu'; \} catch \(e\) \{ return false; \}/);
    assert.match(B, /try \{ localStorage\.setItem\(CLEF, 'vu'\); \} catch \(e\)/);
});

test('AU DOIGT, LA LÉGENDE EST DU TEXTE — ET C\'EST CE QUI LA REND TENABLE', () => {
    // Une ligne cliquable au doigt réclame ses 44 px, règle de la maison.
    // MESURÉ sur 390 × 844, onze lignes à 44 px : 650 px, les trois quarts de
    // l'écran pour une note qu'on lit une fois. On ne rogne pas la règle, on
    // retire le geste : les vrais boutons sont à 44 px juste au-dessus, et ce
    // sont eux qu'on veut apprendre à viser. 650 → 316 px.
    assert.match(B, /window\.matchMedia\('\(pointer: coarse\)'\)\.matches;/);
    assert.match(B, /if \(!auDoigt\) \{\s*\n\s*li\.classList\.add\('bandeau-outils-item--cliquable'\);\s*\n\s*li\.onclick = \(\) => bouton\.click\(\);/);
    // Et rien ne laisse croire qu'on peut cliquer : le curseur et le survol
    // ne viennent qu'avec la classe.
    assert.match(CSS, /\.bandeau-outils-item--cliquable \{ cursor: pointer; \}/);
    assert.ok(!/\.bandeau-outils-item \{[^}]*cursor: pointer/.test(CSS));
    // Le plancher tactile reste sur ce qui se clique vraiment.
    assert.match(CSS, /@media \(pointer: coarse\) \{[\s\S]{0,300}?\.bandeau-outils-compris \{ min-height: 44px; \}/);
    // Deux colonnes sur un téléphone : onze noms en colonne unique font une
    // page de défilement avant d'atteindre le parcours.
    assert.match(CSS, /\.bandeau-outils-liste \{ grid-template-columns: repeat\(2, 1fr\); gap: 4px 10px; \}/);
});

test('ELLE NE PEUT PAS APPARAÎTRE CHEZ L\'ÉLÈVE', () => {
    // Elle n'est appelée que depuis `renderTeacherPath`, et la barre qu'elle
    // lit vit dans `#builder-view`, qui est `teacher-only`. Deux verrous, et
    // le second est dans le HTML : on le garde sous surveillance.
    const BU = lire('js/ui/builder.js');
    assert.equal((BU.match(/poserLeBandeauDesOutils\(\)/g) || []).length, 1);
    assert.match(lire('index.html'), /<div id="builder-view" class="teacher-only">/);
});

// ── LE « ? » DE LA BARRE ────────────────────────────────────────────────────
//
// RÉMY : « je mettrai éventuellement un petit ? à côté de nouveau parcours pour
// voir justement ce qui correspond aux icônes. »
//
// C'EST LUI QUI REND « J'AI COMPRIS » SANS REGRET. Un bandeau d'aide qu'on ne
// peut plus rappeler, on hésite à le fermer : il traîne des mois au-dessus du
// travail et l'on finit par ne plus le voir, ce qui est l'état qu'on voulait
// éviter. Ma réponse d'avant — « la poubelle de la barre de debug le ramène » —
// n'en était pas une : personne ne vide sa sauvegarde locale pour relire une
// légende.
//
// MESURÉ (`tools/tmp/voirBandeau2.mjs`), après un congé définitif :
//
//   clic sur « ? »          la bande revient, 5 outils nommés, aria-expanded=true
//   puis un exercice ajouté elle TIENT, et passe à 11 outils nommés
//   second clic sur « ? »   elle se ferme, aria-expanded=false
//   redessin après          absente — le congé n'a pas été annulé

test('LE « ? » EST À CÔTÉ DE « NOUVEAU PARCOURS », ET IL NE BOUGE JAMAIS', () => {
    const HTML = lire('index.html');
    assert.match(HTML, /<button id="btn-aide-outils" class="toolbar-icon-btn toolbar-icon-btn--outil"/);
    // Entre « Nouveau parcours » et « Mes parcours enregistrés » : ces trois-là
    // sont les seuls boutons TOUJOURS visibles — les autres vont et viennent
    // selon que le parcours est vide. Un bouton d'aide qui change de place est
    // un bouton qu'on cherche au lieu de le viser.
    assert.ok(HTML.indexOf('id="btn-new-path"') < HTML.indexOf('id="btn-aide-outils"'));
    assert.ok(HTML.indexOf('id="btn-aide-outils"') < HTML.indexOf('id="btn-open-path-browser"'));
    const BU = lire('js/ui/builder.js');
    const outils = BU.slice(BU.indexOf('const OUTILS_DU_PARCOURS = ['),
        BU.indexOf('function outilsDuParcours'));
    assert.ok(!/btn-aide-outils/.test(outils),
        'le « ? » ne doit pas disparaître avec le parcours : c\'est l\'aide');
});

test('IL BASCULE — IL N\'OUVRE PAS SEULEMENT', () => {
    // Sans bascule, qui clique le « ? » par curiosité n'aurait plus que
    // « J'ai compris » pour s'en défaire : un congé définitif pour une question
    // passagère.
    assert.match(B, /export function basculerLeBandeauDesOutils\(\) \{\s*\n\s*if \(document\.getElementById\(ID\)\) \{/);
    assert.match(B, /montreeALaDemande = true;\s*\n\s*poserLeBandeauDesOutils\(\);/);
    assert.match(lire('js/ui/builder.js'), /if \(btnAide\) btnAide\.onclick = basculerLeBandeauDesOutils;/);
});

test('RAPPELÉE, ELLE SURVIT AU REDESSIN SUIVANT', () => {
    // LE PIÈGE, et c'est pour lui que `montreeALaDemande` existe : ajouter un
    // exercice rappelle `poserLeBandeauDesOutils`, qui lirait le congé et
    // retirerait la bande sous les yeux du professeur en train de s'en servir
    // pour trouver un bouton. Mesuré : elle tient, et passe de 5 à 11 noms.
    assert.match(B, /let montreeALaDemande = false;/);
    // Mais le « ? » n'ANNULE PAS le congé : on ne rouvre pas une porte en
    // jetant sa clef. Un `localStorage.removeItem` ici serait le raccourci qui
    // ferait revenir la bande toute seule au prochain démarrage.
    assert.ok(!/removeItem/.test(B), 'le « ? » ne doit pas effacer le congé');
});

test('LE « ? » NE SE NOMME PAS LUI-MÊME DANS LA LISTE', () => {
    // Il n'est pas un outil du parcours, il est la POIGNÉE de la liste. L'y
    // faire figurer donnerait une ligne « Que font ces icônes ? » à quelqu'un
    // qui est précisément en train de la lire, et dont le clic ne ferait que
    // redessiner ce qu'il a sous les yeux. Mesuré : absent des onze lignes.
    assert.match(B, /const POIGNEE = 'btn-aide-outils';/);
    assert.match(B, /\.filter\(b => b\.id !== POIGNEE\)/);
});

test('ET ON DIT OÙ LA RETROUVER, DANS LE BOUTON QUI LA FERME', () => {
    // C'est le seul instant où le professeur se pose la question, et le seul où
    // la réponse tient en cinq mots.
    assert.match(B, /rappel\.textContent = 'Pour la revoir : le « \? » de la barre\.';/);
    // Le titre ne promet plus « une fois pour toutes » : depuis le « ? », elle
    // revient, et la phrase doit valoir les deux fois. On vérifie le titre
    // EXACT et non l'absence de la vieille formule dans le fichier — elle y est
    // encore, dans le commentaire qui explique pourquoi elle est partie, et un
    // test qui lit les commentaires mesure la prose, pas le produit.
    assert.match(B, /titre\.textContent = 'Ce que font les icônes de la barre :';/);
    // Un bouton qui commande quelque chose doit le dire.
    assert.match(B, /b\.setAttribute\('aria-expanded', ouverte \? 'true' : 'false'\);/);
});
