// « ILLISIBLE » ET « ESTOMPÉ EXPRÈS » NE SONT PAS LA MÊME CHOSE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Le relevé des contrastes annonçait sept exercices en défaut. En mesurant les
// COUPLES exacts, cinq étaient des textes pâles PAR CHOIX :
//
//   .ls-valider  2,48  « Valider »    bouton DÉSACTIVÉ, opacité 0,45
//   .cb-btn      3,50  « ↶ Annuler »  désactivé, rien à défaire encore
//   .ls-modele   3,93  « □×□ + □×□ »  modèle en filigrane, s'efface à la frappe
//   .laby-door   1,46  « 80 »         porte non éclairée : c'est le jeu
//
// Les remonter à 4,5 reviendrait à dire « clique-moi » à un bouton qui ne
// marche pas, et à allumer les portes d'un labyrinthe qu'on explore à tâtons.
//
// ET C'EST LE TROISIÈME OUTIL DE LA SOIRÉE À CRIER AU LOUP : une liste qui
// reste rouge pour toujours ne se lit plus, et le jour où une VRAIE faute s'y
// ajoute elle se range dans un décor qu'on ne regarde pas. Les deux outils
// disent donc leurs exceptions à part, avec le chiffre qui permet de juger —
// le contraste SANS l'estompage : 6,29 pour « Valider », 9,85 pour les portes.
// Le couple de couleurs était bon ; seule l'opacité voulue le faisait tomber.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('LE RELEVÉ SÉPARE L\'ESTOMPAGE VOULU DE LA VRAIE FAUTE', () => {
    const src = lire('tools/quiEstIllisible.mjs');
    assert.match(src, /const desactive = !!\(el\.disabled \|\| el\.closest\('\[disabled\], \[aria-disabled="true"\]'\)\);/,
        'un bouton désactivé est pâle par convention');
    assert.match(src, /const faitPale = alpha < 0\.95;/,
        'et une opacité posée là exprès aussi');
    assert.match(src, /if \(desactive \|\| faitPale\) estompes\.push\(ligne\);\n\s*else mauvais\.push\(ligne\);/,
        'les deux listes sont distinctes');
});

test('ET IL DIT CE QUE VAUDRAIT LE COUPLE SANS L\'ESTOMPAGE', () => {
    // SANS CE CHIFFRE, ON NE PEUT PAS TRANCHER : un bouton désactivé à 2,48
    // dont les couleurs valent 6,29 est bien réglé ; le même à 2,48 dont les
    // couleurs valent 3,1 cache une vraie faute derrière une opacité.
    const src = lire('tools/quiEstIllisible.mjs');
    assert.match(src, /sansEstompage: \+ratio\(\[encre\[0\], encre\[1\], encre\[2\]\], fond\)/);
});

test('ET ON NE LES IMPRIME QU\'À LA DEMANDE', () => {
    const src = lire('tools/quiEstIllisible.mjs');
    assert.match(src, /const VOIR_ESTOMPES = ARGS\.includes\('--estompes'\);/);
    assert.match(src, /if \(VOIR_ESTOMPES\) \{/);
});

test('LES DEUX VRAIES FAUTES SONT CORRIGÉES, ET LE DISENT', () => {
    // « unités » est le repère qui dit de quel côté de la virgule on se
    // trouve ; « 4 × 7 » est le calcul à résoudre. Deux textes qu'on ne peut
    // pas se permettre de rendre pénibles à lire.
    //
    // ON FONCE LE FOND DE LA PASTILLE, PAS LE JETON : `--danger` sert partout,
    // et son rouge doit rester reconnaissable d'un écran à l'autre.
    const virgule = lire('js/games/virgule.js');
    assert.match(virgule, /background: color-mix\(in srgb, var\(--danger\) 78%, #000\);/);
    assert.doesNotMatch(virgule, /color: #fff; background: var\(--danger\); border-radius: 5px;/,
        'l\'ancien couple à 3,76 ne doit plus être là');

    const laby = lire('js/games/labyrinthe.js');
    assert.match(laby, /background: color-mix\(in srgb, var\(--laby-accent, var\(--primary\)\) 72%, #000\);/);
});

test('ET L\'ÉCHELLE EN MENU QU\'ON GARDE EST ÉCRITE, AVEC SA RAISON', () => {
    // Cinquante niveaux de Sokoban joués dans l'ordre : cocher cinquante cases
    // est illisible, et « les douze premiers » ne veut rien dire. L'exception
    // sort du compte des écarts — sinon l'outil reste rouge pour toujours.
    const src = lire('tools/reglagesCoherents.mjs');
    assert.match(src, /const MENUS_ACCEPTÉS = \{/);
    assert.match(src, /'defi-pousseur':/);
    assert.match(src, /cinquante niveaux de Sokoban/);
    assert.match(src, /const ecarts = aMenu\.filter\(\(\{ exo \}\) => !MENUS_ACCEPTÉS\[exo\.id\]\);/);
    assert.match(src, /rouge\(`\\n\$\{ecarts\.length \+ enDouble\.length\} écart\(s\) à regarder\.`\)/,
        'le compte ne retient que les vrais écarts');
});
