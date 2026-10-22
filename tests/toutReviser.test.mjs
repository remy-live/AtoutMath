// « TOUT RÉVISER » — le bouton que Rémy demandait, et qui était déjà là.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant l'espace d'un de ses élèves :
//
//   « Dans ce que tu dois réviser, tu peux mettre un bouton Tout réviser. »
//
// MESURÉ (tools/espaceDeLEleve.mjs) : le bouton EXISTAIT, en haut à droite du
// panneau, et il enchaînait déjà les trois notions affichées. Deux choses
// l'empêchaient d'être le bouton qu'on demande :
//
//   SON NOM      « ▶ Lancer la séance conseillée » — rien n'y dit « tout », ni
//                que ce sont les trois cartes du dessous. « Séance » est de
//                surcroît le mot du professeur, ce que `ui/pathView.js` avait
//                déjà tranché pour son propre bouton.
//   SON ALLURE   fond transparent, bordure transparente, texte gris sur le
//                fond du panneau : 180 × 36 px de texte plat à côté des
//                « ▶ Réviser » pleins de 667 × 41. Rémy ne l'a pas reconnu
//                comme un bouton ; un élève de sixième ne le reconnaîtra pas
//                davantage.
//
// ET UN DÉFAUT LATENT, trouvé en mesurant : le bouton et les cartes
// fabriquaient CHACUN leur liste. 68 notions sont recommandées à cet élève,
// trois sont montrées, et `buildRecommendedPreview` écarte en plus celles qui
// n'ont aucun exercice — pas `getRecommendations`. Il suffit d'une notion sans
// exercice en tête pour que l'élève voie les n° 2 et 3 et travaille les
// n° 1 et 2. Un bouton qui dit « tout » doit faire ce qui est à l'écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LE BOUTON RÉVISE CE QUI EST À L\'ÉCRAN, PAS UNE LISTE REFABRIQUÉE', () => {
    const R = sansCommentaires(lire('js/core/remediation.js'));
    // LA PORTE D'ENTRÉE ACCEPTE UNE LISTE. Avec un simple nombre, les deux
    // listes se recalculent séparément et n'ont aucune raison de coïncider.
    assert.match(R, /export function startRecommendedSession\(quoi = 3\) \{/);
    assert.match(R, /const recos = Array\.isArray\(quoi\)\s*\n?\s*\? quoi/);
    // ET L'EXERCICE DE L'APERÇU PASSE AVANT : c'est celui que la carte a
    // nommé à l'élève. En redemander un autre afficherait « Additions
    // Mystères » sur la carte et en lancerait un troisième.
    assert.match(R, /const exoId = r\.exerciseId \|\| firstExerciseForSkill\(r\.skillId\);/);

    // LES DEUX BOUTONS DE L'APPLICATION LUI DONNENT LEUR PROPRE LISTE.
    const P = sansCommentaires(lire('js/ui/profileUI.js'));
    assert.match(P, /btn\.onclick = \(\) => startRecommendedSession\(plan\);/);
    const V = sansCommentaires(lire('js/ui/pathView.js'));
    assert.match(V, /all\.onclick = \(\) => startRecommendedSession\(recos\);/);
    // ET PLUS AUCUN NOMBRE EN DUR : c'était le défaut, et il était invisible —
    // l'étiquette comptait `recos.length` pendant que le clic demandait trois.
    assert.ok(!/startRecommendedSession\(\d+\)/.test(V + P),
        'un nombre en dur fait diverger ce qu\'on montre et ce qu\'on lance');
});

test('IL DIT « TOUT RÉVISER », ET COMBIEN', () => {
    const P = sansCommentaires(lire('js/ui/profileUI.js'));
    // LE COMPTE EST DANS LE NOM, comme « Réviser mes 79 erreurs » de l'onglet
    // voisin : « tout » tout seul ne dit pas si l'on s'engage pour trois
    // minutes ou pour une heure.
    assert.match(P, /btn\.textContent = `▶ Tout réviser : \$\{plan\.length\} notions`;/);
    // ET C'EST `plan.length`, LE NOMBRE DE CARTES RÉELLEMENT AFFICHÉES — pas
    // une constante qui lui ressemble. Le plan en montre trois sur soixante-
    // huit recommandées, et il peut en montrer moins.
    assert.ok(!/▶ Tout réviser : 3/.test(P), 'le compte ne doit pas être écrit en dur');

    // LE LIBELLÉ DE DÉPART, DANS LA PAGE, DIT DÉJÀ LE GESTE : il se voit une
    // fraction de seconde avant que `renderPlan` ne pose le compte.
    const H = lire('index.html');
    assert.match(H, /id="btn-seance-conseillee"[^>]*>▶ Tout réviser</);
    assert.ok(!/Lancer la séance conseillée/.test(H),
        '« séance » est le mot du professeur, pas celui de l\'élève');
});

test('À UNE SEULE NOTION, IL SE TAIT', () => {
    // Il ferait exactement ce que fait le « ▶ Réviser » de l'unique carte, dix
    // pixels plus bas. Deux boutons voisins qui promettent la même chose, c'est
    // le défaut déjà payé sur la barre d'outils du professeur : « Deux boutons
    // voisins promettaient le même réglage ; un seul l'avait. »
    const P = sansCommentaires(lire('js/ui/profileUI.js'));
    assert.match(P, /const seul = plan\.length < 2;/);
    assert.match(P, /btn\.style\.display = seul \? 'none' : 'inline-flex';/);
});

test('ET IL RESSEMBLE À UN BOUTON', () => {
    // LA MESURE QUI A TOUT EXPLIQUÉ : fond `rgba(0, 0, 0, 0)`, bordure
    // `1px solid rgba(0, 0, 0, 0)`, texte gris. Un `.btn-toggle` sans `active`
    // est un onglet ÉTEINT — c'est très bien dans un groupe d'onglets, et
    // c'est invisible tout seul au-dessus d'une liste.
    const UI = lireFeuille('css/ui.css');
    const nu = corpsDeLaRegle(UI, '.btn-toggle', { ou: 'css/ui.css' });
    assert.ok(/border:\s*1px solid transparent/.test(nu),
        'si `.btn-toggle` cessait d\'être transparent, cette épreuve ne garderait plus rien');
    assert.ok(!declare(nu, 'background'), 'un `.btn-toggle` nu n\'a pas de fond');
    // DONC LE BOUTON PORTE `active`, qui lui en donne un. C'est la convention
    // de la maison pour l'action principale — voir `reco-start-all` dans
    // `js/ui/pathView.js`, qui s'écrit `btn-toggle active`.
    const allume = corpsDeLaRegle(UI, '.btn-toggle.active', { ou: 'css/ui.css' });
    assert.ok(valeurDe(allume, 'background'), '`active` doit donner un fond');
    assert.ok(declare(allume, 'border-color'), 'et une bordure visible');

    const H = lire('index.html');
    assert.match(H, /<button id="btn-seance-conseillee" class="btn-toggle active">/);
});

test('LA SÉANCE PORTE LE MOT DE L\'ÉLÈVE', () => {
    // Mesuré : on appuie sur « Tout réviser » et l'on arrive sur « Séance
    // conseillée · Étape 1 sur 3 ». Ce titre-là, l'élève le lit en haut de son
    // écran pendant toute la révision, puis sur son bilan.
    //
    // `ui/pathView.js` avait déjà tranché pour son BOUTON — « "Séance" est le
    // mot du professeur […] et ne doit pas porter le même nom » — mais le
    // PARCOURS, lui, gardait l'ancien.
    const R = sansCommentaires(lire('js/core/remediation.js'));
    assert.match(R, /makePath\('Ce que je dois réviser', steps, REVISION_POLICY\)/);
    assert.ok(!/makePath\('Séance conseillée'/.test(R));
});
