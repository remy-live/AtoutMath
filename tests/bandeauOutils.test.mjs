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
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const B = lire('js/ui/bandeauOutils.js');
// LE CODE SEUL, SANS SA PROSE. Chercher l'ABSENCE d'une chose dans un fichier
// qui EXPLIQUE pourquoi elle est partie, c'est mesurer le commentaire : la
// première version de l'épreuve ci-dessous est tombée là-dessus, sur le mot
// « localStorage » écrit dans la phrase qui raconte qu'il n'y en a plus.
const CODE_B = sansCommentaires(B);
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

test('ELLE NE S\'INVITE PLUS : SEUL LE « ? » L\'OUVRE', () => {
    // RÉMY, capture d'un parcours de 197 exercices : « le que font les icones
    // est toujours ouvert de base ».
    //
    // MESURÉ AVANT DE CORRIGER, parce que « toujours » pouvait vouloir dire que
    // le congé ne tenait pas (`tools/tmp/sonde-barre.mjs`) : il tenait. Clic
    // sur « J'ai compris », clef à « vu », rechargement, bande absente. Ce
    // n'était donc pas un défaut — c'est qu'ON NE CLIQUE PAS UN BOUTON D'AIDE
    // QU'ON N'A PAS DEMANDÉ : on le saute des yeux, et la bande revient à
    // chaque navigateur, à chaque poste, à chaque session neuve.
    //
    // LA GARDE EST DONC CELLE-CI : la seule condition d'ouverture est qu'on
    // l'ait appelée. Remettre un `congedie() &&` — ou n'importe quelle autre
    // condition — la ramènerait chez lui au prochain navigateur.
    assert.match(B, /if \(!montreeALaDemande\) \{ if \(ancienne\) ancienne\.remove\(\); return; \}/);
    // ET IL N'Y A PLUS DE CONGÉ À RETENIR : une bande qui ne s'ouvre jamais
    // seule n'a rien à oublier. Une sauvegarde relue ici serait la trace d'un
    // affichage automatique revenu par la bande.
    assert.ok(!/localStorage/.test(CODE_B),
        'la légende relit une sauvegarde : elle n\'a plus d\'état à garder');
    // Et le bouton du pied dit ce qu'il fait, et rien de plus : il ferme.
    assert.match(B, /compris\.textContent = 'Fermer';/);
    assert.match(B, /compris\.onclick = \(\) => \{ montreeALaDemande = false; retirer\(\); \};/);
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
// C'EST LUI QUI PERMET À LA BANDE DE NE PLUS S'INVITER. Elle s'imposait parce
// qu'elle n'avait aucun autre moyen d'être trouvée : « huit boutons d'icône à
// l'écran, et AUCUN ne porte un mot ». Le « ? » en porte un, et c'est le
// pictogramme que tout le monde sait lire. Une aide qu'on peut appeler n'a plus
// besoin de s'imposer — et c'était le seul argument qu'elle avait.
//
// MESURÉ (`tools/tmp/sonde-barre2.mjs`), sur un parcours de vingt exercices :
//
//   à l'arrivée             absente, sans qu'on ait rien congédié
//   clic sur « ? »          elle paraît, 12 outils nommés, aria-expanded=true
//   puis un exercice ajouté elle TIENT — c'est tout l'objet de l'état interne
//   second clic sur « ? »   elle se ferme, aria-expanded=false

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
    // Le « ? » qu'on a cliqué par curiosité est le bouton qu'on recliquera pour
    // refermer : c'est le geste qu'on essaie en premier, et il doit répondre.
    assert.match(B, /export function basculerLeBandeauDesOutils\(\) \{\s*\n\s*if \(document\.getElementById\(ID\)\) \{/);
    assert.match(B, /montreeALaDemande = true;\s*\n\s*poserLeBandeauDesOutils\(\);/);
    assert.match(lire('js/ui/builder.js'), /if \(btnAide\) btnAide\.onclick = basculerLeBandeauDesOutils;/);
});

test('RAPPELÉE, ELLE SURVIT AU REDESSIN SUIVANT', () => {
    // LE PIÈGE, et c'est pour lui que `montreeALaDemande` existe :
    // `poserLeBandeauDesOutils` est rappelée à CHAQUE redessin du parcours —
    // ajouter un exercice en est un — et elle retirerait la bande sous les yeux
    // du professeur en train de s'en servir pour trouver un bouton. Mesuré :
    // elle tient, et passe de 5 à 12 noms.
    assert.match(B, /let montreeALaDemande = false;/);
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
    // Et le titre ne dit plus « une fois pour toutes » : elle revient autant de
    // fois qu'on l'appelle.
    // Le titre ne promet plus « une fois pour toutes » : depuis le « ? », elle
    // revient, et la phrase doit valoir les deux fois. On vérifie le titre
    // EXACT et non l'absence de la vieille formule dans le fichier — elle y est
    // encore, dans le commentaire qui explique pourquoi elle est partie, et un
    // test qui lit les commentaires mesure la prose, pas le produit.
    assert.match(B, /titre\.textContent = 'Ce que font les icônes de la barre :';/);
    // Un bouton qui commande quelque chose doit le dire.
    assert.match(B, /b\.setAttribute\('aria-expanded', ouverte \? 'true' : 'false'\);/);
});
