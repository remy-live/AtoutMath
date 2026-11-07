// TOUCHER UNE CIBLE QUI BOUGE — la règle, sans navigateur.
//
// RÉMY : « pour les amis de 10, le clic est complexe car ca sélectionne le
// texte que de sélectionner la case qui bouge ».
//
// Le GESTE se mesure dans un vrai navigateur (`tools/clicQuiBouge.mjs`) : on
// appuie sur une carte qui dérive, on attend qu'elle ait quitté le point
// d'appui, on relâche. Ce qui se tient ICI, c'est la règle — et surtout les
// deux façons très faciles de la défaire :
//
//   · écouter `pointerdown` SEUL ferme la porte au clavier ;
//   · écouter les deux SANS le test `detail === 0` compte le geste deux fois.
//
// Les deux passeraient inaperçues à l'écran : la première ne se voit qu'au
// clavier, la seconde ne se voit que sur un jeu qui compte les coups.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surAppui, CSS_CIBLE_QUI_BOUGE } from '../js/core/cibleQuiBouge.js';

/** Un élément de pacotille : il retient ses écouteurs, et on les déclenche. */
function fauxElement() {
    const ecouteurs = new Map();
    return {
        addEventListener(type, f) {
            if (!ecouteurs.has(type)) ecouteurs.set(type, []);
            ecouteurs.get(type).push(f);
        },
        /** Déclenche un événement, et rend l'objet qu'ont reçu les écouteurs. */
        emettre(type, ev = {}) {
            let empeche = 0;
            const evenement = { type, ...ev, preventDefault: () => { empeche++; } };
            (ecouteurs.get(type) || []).forEach(f => f(evenement));
            return { empeche };
        },
        aUnEcouteur: (type) => (ecouteurs.get(type) || []).length > 0
    };
}

test('LE GESTE SE FAIT À L\'APPUI, ET IL COUPE LA SÉLECTION', () => {
    const el = fauxElement();
    let touches = 0;
    surAppui(el, () => touches++);

    assert.equal(el.aUnEcouteur('pointerdown'), true, 'rien n\'écoute l\'appui');
    const { empeche } = el.emettre('pointerdown');
    assert.equal(touches, 1, 'l\'appui n\'a pas déclenché le geste');
    // `preventDefault` EST LA MOITIÉ DE LA CORRECTION : sans lui, l'appui
    // suivi d'un déplacement reste un glisser de SÉLECTION, et c'est le texte
    // en surbrillance que Rémy décrit.
    assert.equal(empeche, 1, 'l\'appui ne coupe pas la sélection');
});

test('ET LE CLAVIER GARDE SA VOIE — sans compter le geste deux fois', () => {
    const el = fauxElement();
    let touches = 0;
    surAppui(el, () => touches++);

    // Un bouton activé à Entrée ou à Espace émet un `click` SANS pointeur.
    el.emettre('click', { detail: 0 });
    assert.equal(touches, 1, 'le clavier ne touche plus la cible');

    // Un clic de pointeur, lui, suit son `pointerdown` : le compter aussi
    // ferait DEUX gestes pour un seul doigt — deux cartes retournées, deux
    // tirs partis.
    el.emettre('pointerdown');
    el.emettre('click', { detail: 1 });
    assert.equal(touches, 2, 'le geste à la souris est compté deux fois');
});

test('LES DÉCLARATIONS CSS PORTENT LES DEUX ÉCRITURES', () => {
    // `user-select: none` seul ne dit rien à WebKit, c'est-à-dire à l'iPad de
    // la classe — et c'est justement là que le geste se fait au doigt. Le
    // conteneur n'a que Chromium : cette épreuve est le seul endroit où la
    // forme préfixée est gardée.
    assert.match(CSS_CIBLE_QUI_BOUGE, /(^|[^-])user-select:\s*none/);
    assert.match(CSS_CIBLE_QUI_BOUGE, /-webkit-user-select:\s*none/);
    assert.match(CSS_CIBLE_QUI_BOUGE, /-webkit-touch-callout:\s*none/);
});

test('LES JEUX À CIBLE MOUVANTE EMPLOIENT LA RÈGLE, ET NON UN `onclick`', async () => {
    // LA RÈGLE NE SERT À RIEN SI ELLE N'EST PAS APPELÉE. Les deux jeux où une
    // cible porte un nombre ET se déplace sont Les Amis de Dix (les cartes
    // dérivent) et Le Canon des Compléments (les astéroïdes avancent). Un
    // `onclick` qui reviendrait sur l'un d'eux rendrait exactement le défaut
    // que Rémy a signalé — sans rien casser d'autre, donc sans se voir.
    const { readFile } = await import('node:fs/promises');
    for (const chemin of ['../js/games/dix.js', '../js/games/canon.js']) {
        const src = await readFile(new URL(chemin, import.meta.url), 'utf8');
        assert.match(src, /surAppui\(/, `${chemin} n'emploie pas surAppui`);
        // On ne cherche QUE la cible mouvante : les boutons d'un pavé, eux,
        // ne bougent pas et gardent très bien leur `onclick`.
        assert.doesNotMatch(src, /\.onclick = \(\) => this\.(tirer|taper)\(b\)/,
            `${chemin} touche encore sa cible mouvante au clic`);
    }
});
