// UNE FENÊTRE SE PEINT AU-DESSUS DE CE QUI EST DÉJÀ LÀ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le tout effacer de l'atelier ne fonctionne pas ».
//
// MESURÉ : le bouton ouvrait bien sa fenêtre. Elle était dans le document,
// bien formée, à la bonne taille — et `document.elementFromPoint` au centre de
// son bouton de confirmation répondait `div.atl-gauche`. Le panneau de
// l'Atelier vit à l'étage 100001 pour passer au-dessus de la palette
// d'auteur ; la fenêtre, elle, était à 9999, écrit en dur. On ne la voyait pas,
// on ne pouvait pas la cliquer, et le bouton paraissait mort.
//
// CE N'ÉTAIT PAS QUE CE BOUTON : « Tout contrôler » demande confirmation de la
// même façon, et les neuf avis de l'Atelier partaient dans le même trou.
//
// CE QUE CETTE ÉPREUVE GARDE, et pourquoi chaque ligne y est :
//
//   · `etageLibre` REGARDE ce qui est peint. Un nombre écrit en dur est une
//     promesse sur un voisin qu'on ne connaît pas encore ; on l'a payée deux
//     fois — la couche de jeu à 10000, puis l'Atelier à 100001.
//   · IL NE COMPTE PAS CE QUI NE CACHE RIEN. Une couche masquée ne doit pas
//     retenir l'étage en l'air pour toujours ; une couche qui ne prend pas les
//     clics (le porte-avis) n'a jamais caché personne.
//   · ET LES DEUX CHIFFRES DU DÉPÔT RESTENT DANS LE BON ORDRE : le porte-avis
//     au-dessus de l'Atelier. Ils sont LUS dans leurs fichiers, pas recopiés :
//     recopier une valeur dans une épreuve, c'est garder la copie.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/** L'étage du panneau de l'Atelier, lu dans sa propre feuille de style. */
function etageDeLAtelier() {
    const src = lire('js/ui/atelier.js');
    const regle = /\.atl\s*\{([^}]*)\}/.exec(src);
    assert.ok(regle, 'la règle « .atl » a été renommée : l\'épreuve ne mesure plus rien');
    const z = /z-index:\s*(\d+)/.exec(regle[1]);
    assert.ok(z, 'le panneau de l\'Atelier ne déclare plus d\'étage');
    return Number(z[1]);
}

/** L'étage du porte-avis, lu dans la feuille. */
function etageDesAvis() {
    const src = lire('css/components.css');
    const regle = /#toast-container\s*\{([^}]*)\}/.exec(src);
    assert.ok(regle, 'la règle « #toast-container » a été renommée');
    const z = /z-index:\s*(\d+)/.exec(regle[1]);
    assert.ok(z, 'le porte-avis ne déclare plus d\'étage');
    return Number(z[1]);
}

/**
 * UN FAUX CORPS DE PAGE : des couches, et ce que le navigateur dirait d'elles.
 *
 * `etageLibre` ne lit que `document.body.children` et `getComputedStyle` —
 * deux choses qu'on peut poser à la main. On mesure donc la VRAIE fonction,
 * pas une copie de son idée.
 */
function poserLesCouches(couches) {
    const enfants = couches.map((c, i) => ({ nom: c.nom || `couche${i}`, style: c }));
    globalThis.document.body = { children: enfants };
    globalThis.getComputedStyle = (el) => ({
        position: el.style.position || 'static',
        display: el.style.display || 'block',
        visibility: el.style.visibility || 'visible',
        pointerEvents: el.style.pointerEvents || 'auto',
        zIndex: el.style.zIndex === undefined ? 'auto' : String(el.style.zIndex)
    });
}

const { etageLibre } = await import('../js/ui/modal.js');

test('UNE PAGE SANS COUCHE LAISSE LA FENÊTRE À SON PLANCHER', () => {
    poserLesCouches([]);
    assert.equal(etageLibre(), 9999);
    // ET UNE COUCHE ORDINAIRE NE COMPTE PAS : `position: static` ne participe
    // pas à l'empilement, son `z-index` ne veut rien dire.
    poserLesCouches([{ zIndex: 500000 }]);
    assert.equal(etageLibre(), 9999, 'une couche « static » a fait monter l\'étage');
});

test('ELLE PASSE AU-DESSUS DU PANNEAU DE L\'ATELIER, QUEL QUE SOIT SON ÉTAGE', () => {
    const atelier = etageDeLAtelier();
    poserLesCouches([{ position: 'fixed', display: 'flex', zIndex: atelier }]);
    assert.equal(etageLibre(), atelier + 1,
        'la fenêtre se range sous le panneau d\'où on vient de la demander');
    // LA COUCHE DE JEU AUSSI — c'est le même défaut, payé une première fois
    // sur l'organigramme : le contre-exemple était dans le document, avec son
    // texte et son dessin, et personne ne pouvait le voir.
    poserLesCouches([{ position: 'fixed', zIndex: 10000 }]);
    assert.equal(etageLibre(), 10001);
});

test('MAIS PAS AU-DESSUS DE CE QUI NE CACHE RIEN', () => {
    const atelier = etageDeLAtelier();
    // UNE COUCHE FERMÉE NE RETIENT PAS L'ÉTAGE EN L'AIR. Le panneau de
    // l'Atelier est `display: none` tant qu'on ne l'ouvre pas : le compter
    // quand même ferait monter toutes les fenêtres de l'application.
    poserLesCouches([{ position: 'fixed', display: 'none', zIndex: atelier }]);
    assert.equal(etageLibre(), 9999, 'une couche fermée fait encore monter l\'étage');
    poserLesCouches([{ position: 'fixed', visibility: 'hidden', zIndex: atelier }]);
    assert.equal(etageLibre(), 9999, 'une couche invisible fait encore monter l\'étage');
    // ET UNE COUCHE QUI NE PREND PAS LES CLICS NON PLUS : le porte-avis est
    // tout en haut par nature, et monter au-dessus de lui ne gagne rien.
    poserLesCouches([{ position: 'fixed', pointerEvents: 'none', zIndex: 2000000 }]);
    assert.equal(etageLibre(), 9999, 'le porte-avis pousse les fenêtres pour rien');
});

test('ET LES DEUX CHIFFRES ÉCRITS DANS LE DÉPÔT RESTENT DANS LE BON ORDRE', () => {
    // UN AVIS SE LIT PAR-DESSUS TOUT. « Compte rendu effacé », « Relevé
    // copié », « Photo du volet enregistrée » : les neuf avis de l'Atelier
    // étaient peints derrière lui. Un avis ne prend aucun clic, le mettre en
    // haut ne coûte donc rien — mais il faut l'y mettre.
    assert.ok(etageDesAvis() > etageDeLAtelier(),
        `le porte-avis (${etageDesAvis()}) passe sous l'Atelier (${etageDeLAtelier()})`);
});

test('ET AUCUNE FENÊTRE NE REPART D\'UN ÉTAGE ÉCRIT EN DUR', () => {
    const src = lire('js/ui/modal.js');
    assert.match(src, /options\.zIndex \|\| etageLibre\(\)/,
        'showModal est revenu à un étage écrit en dur');
});
