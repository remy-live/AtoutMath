// ON NE NOMME SUR LE DESSIN QUE CE QUE LA CONSIGNE NOMME.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la figure d'une translation : « c'est quoi le truc bizarre au
// milieu de la flèche ? »
//
// C'était un « v » — le nom du vecteur — posé au milieu du trait rouge. Il
// n'apprenait rien et gênait deux fois :
//
//   · AUCUNE CONSIGNE NE LE PRONONCE. Celle-ci dit « la translation que
//     montre la flèche rouge » ; l'autre dit « qui la fait glisser de
//     3 carreaux vers le bas ». Jamais « v ». Un nom sur un dessin annonce
//     qu'on va s'en servir — et l'élève cherche à quoi, au lieu de compter.
//   · À CE NIVEAU LE VECTEUR N'EXISTE PAS ENCORE, et un « v » nu n'est même
//     pas la notation du lycée. À la taille où il sortait, Rémy l'a pris pour
//     une seconde pointe de flèche : il se lisait comme du décor.
//
// LE « O » DU CENTRE RESTE : la consigne le nomme — « symétrie de centre O »,
// « autour de O » — et sans lui on ne saurait pas autour de quoi tourner.
// C'est la même règle, dans l'autre sens, et c'est pour cela que les deux cas
// sont éprouvés ensemble : garder l'un sans l'autre, ce serait un hasard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quadrillageSvg } from '../js/core/quadrillageSvg.js';
import { consigneDe } from '../js/core/generators/transfoQuadrillage.js';

const GRILLE = {
    L: 8, H: 8,
    cases: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
};

/** Les lettres réellement posées sur le dessin. */
function lettres(svg) {
    return [...svg.matchAll(/class="qd-marque-nom"[^>]*>([^<]*)</g)].map(m => m[1].trim());
}

test('UNE TRANSLATION NE POSE AUCUNE LETTRE SUR LA FLÈCHE', () => {
    const svg = quadrillageSvg({
        ...GRILLE,
        transfo: { genre: 'translation', vecteur: { x: 0, y: 3 } },
        ancre: { x: 4, y: 1 }
    });
    assert.deepEqual(lettres(svg), [], 'la flèche se lit seule');
    // ET LA FLÈCHE, ELLE, EST BIEN LÀ : retirer la lettre ne doit pas avoir
    // emporté le trait, ce qui laisserait une consigne qui désigne un objet
    // absent.
    assert.match(svg, /class="qd-vecteur"/);
    assert.match(svg, /marker-end="url\(#[^)]*-fleche\)"/);
});

test('ET LA CONSIGNE DE TRANSLATION NE PARLE JAMAIS DE « v »', () => {
    // C'est la raison de la règle : si une consigne le nommait un jour, il
    // faudrait le redessiner. L'épreuve tient les deux bouts ensemble.
    const t = { genre: 'translation', vecteur: { x: 0, y: 3 } };
    for (const mots of [true, false]) {
        const dit = consigneDe(t, { motsDuVecteur: mots });
        assert.ok(!/\bv\b/.test(dit), `la consigne ne nomme pas « v » : ${dit}`);
    }
});

test('MAIS LE CENTRE GARDE SON « O », QUE LA CONSIGNE NOMME', () => {
    const svg = quadrillageSvg({
        ...GRILLE,
        transfo: { genre: 'centrale', centre: { x: 4, y: 4 } }
    });
    assert.deepEqual(lettres(svg), ['O']);
    assert.match(consigneDe({ genre: 'centrale' }), /de centre O/);
});
