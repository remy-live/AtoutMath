// LES FILTRES DISENT CE QU'ILS GARDENT.
//
// Rémy : « il faudrait des filtres pour afficher moins d'infos (surtout que
// puisque tu rajoutes un jeu par jour, ça va vite faire beaucoup) ».
//
// MESURÉ AU NAVIGATEUR. 172 exercices ; l'arbre entièrement déplié fait
// 9 076 pixels dans une fenêtre de 595 — quinze écrans de défilement. Cocher
// « 6ème » ramène la liste de 172 à 140 lignes, et RIEN à l'écran ne le disait :
// ni le nombre, ni le filtre qui l'avait fait. Le mot « 6ème » est écrit dans un
// menu replié.
//
// Le vrai dégât n'est pas de ne pas savoir : c'est de CHERCHER. Un filtre coché
// la semaine dernière et oublié fait chercher un exercice qui est là.
//
// Après : « 140 exercices sur 172 · 6ème · Tout afficher », et avec une
// recherche par-dessus : « 7 exercices sur 172 · 6ème · « fraction » ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const NAV = sansCommentaires(lire('js/ui/navigation.js'));
const APP = sansCommentaires(lire('js/app.js'));
const HTML = lire('index.html').replace(/<!--[\s\S]*?-->/g, '');

test('LA LIGNE EXISTE, et elle s\'annonce aux lecteurs d\'écran', () => {
    assert.match(HTML, /id="catalogue-compte"/);
    // `role="status"` + `aria-live` : le compte change sans qu'on ait cliqué
    // dessus, c'est exactement ce que cette paire sert à annoncer.
    assert.match(HTML, /id="catalogue-compte"[^>]*role="status"/);
    assert.match(HTML, /id="catalogue-compte"[^>]*aria-live="polite"/);
    // Cachée au départ : rien n'est filtré.
    assert.match(HTML, /id="catalogue-compte"[^>]*hidden/);
});

test('ELLE NE PARLE QUE SI QUELQUE CHOSE FILTRE', () => {
    // Un « 172 sur 172 » permanent est du bruit, et l'on cesse de lire une
    // ligne qui ne change jamais.
    assert.match(NAV, /if \(!actifs\) \{ el\.hidden = true;/);
});

test('ELLE NOMME CE QUI FILTRE, pas seulement combien', () => {
    // Dire « 3 filtres actifs » obligerait à rouvrir trois menus pour savoir
    // lesquels — c'est-à-dire le geste qu'on veut éviter.
    assert.match(NAV, /if \(niveaux\.length\) quoi\.push\(niveaux\.join\(', '\)\);/);
    assert.match(NAV, /if \(duo\) quoi\.push\('à deux'\);/);
    assert.match(NAV, /if \(recherche\) quoi\.push\(`« \$\{recherche\} »`\);/);
    // Ce que le professeur a tapé se pose dans du HTML : on l'échappe.
    assert.match(NAV, /quoi\.map\(echapper\)/);
});

test('« TOUT AFFICHER » DÉFAIT TOUT, y compris à l\'écran', () => {
    assert.match(NAV, /state\.selectedNiveaux = \[\];/);
    assert.match(NAV, /state\.aDeuxSeuls = false;/);
    assert.match(NAV, /state\.searchQuery = '';/);
    // LE CHAMP PORTE LE TEXTE. Le vider dans l'état sans le vider à l'écran
    // laisserait un mot écrit qui ne filtre plus rien — la pire des deux
    // situations, puisqu'on croit alors que la recherche ne marche pas.
    assert.match(NAV, /champ\.value = '';/);
    assert.match(NAV, /croix\.hidden = true;/);
});

test('LES DEUX FAÇONS DE CHOISIR UN NIVEAU rafraîchissent le compte', () => {
    // Il y en a deux : la rangée d'étiquettes au-dessus de la grille, et le
    // menu déroulant du panneau. Chacune avait sa propre liste de choses à
    // rafraîchir ; une ligne oubliée dans l'une des deux, c'est un compte qui
    // ment une fois sur deux.
    assert.match(NAV, /refreshCatalogViews\(\);\s*\n\s*\};/,
        'la rangée d\'étiquettes passe par le rafraîchissement commun');
    assert.match(APP, /majCompteCatalogue\(\);/);
    assert.match(NAV, /export function refreshCatalogViews\(\) \{[\s\S]{0,180}majCompteCatalogue\(\);/);
});
