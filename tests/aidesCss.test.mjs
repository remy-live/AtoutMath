// L'AIDE QUI LIT LES RÈGLES CSS DOIT LIRE LA BONNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `tests/aidesCss.mjs` existe parce que trois épreuves recopiaient la même
// lecture — et le même piège. Elle en porte maintenant dix-huit. Une aide que
// dix-huit épreuves interrogent doit être gardée comme le reste : si elle rend
// le corps d'une AUTRE règle, dix-huit épreuves jugent un code qu'elles ne
// regardent pas, et elles le font en VERT.
//
// LE CAS QUI A COÛTÉ, le 22 octobre : on demandait `.btn-toggle` dans
// `css/ui.css`. `indexOf('.btn-toggle {')` a trouvé
//
//     @media … { .rang-btn, .btn-toggle { min-height: 44px; } }
//
// — une règle de média, deux cent trente lignes plus haut que celle qu'on
// cherchait — et a rendu son corps d'une seule déclaration. Ce jour-là
// l'épreuve est tombée, ce qui a mis sur la piste. Elle serait restée VERTE si
// la règle attrapée avait contenu par hasard ce qu'on vérifiait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const FEUILLE = `
.autre { color: red; }
@media (max-width: 700px) {
    .rang-btn, .btn-toggle { min-height: 44px; }
}
/* un commentaire juste avant */
.btn-toggle { padding: 8px 14px; border: 1px solid transparent; }
.btn-toggle.active { background: var(--bg-panel); border-color: var(--border); }
`;

test('UN SÉLECTEUR GROUPÉ N\'EST PAS LE SÉLECTEUR DEMANDÉ', () => {
    // C'EST LA RÈGLE À ELLE SEULE QU'ON VEUT, et on la reconnaît à ses deux
    // déclarations. Celle du groupe n'en a qu'une.
    const corps = corpsDeLaRegle(FEUILLE, '.btn-toggle');
    assert.ok(declare(corps, 'padding', '8px 14px'),
        'c\'est la règle groupée qui a été lue');
    assert.ok(!declare(corps, 'min-height'));
});

test('ET LE COMMENTAIRE QUI LA PRÉCÈDE NE LA CACHE PAS', () => {
    // Dans ce dépôt, UNE RÈGLE SUR DEUX est précédée de son explication : si
    // un commentaire empêchait de la trouver, l'aide ne servirait à rien ici.
    assert.ok(corpsDeLaRegle(FEUILLE, '.btn-toggle').includes('padding'));
    // Et une règle qui suit immédiatement une autre se trouve aussi.
    assert.ok(declare(corpsDeLaRegle(FEUILLE, '.btn-toggle.active'), 'background'));
});

test('ET QUAND ELLE N\'EXISTE QU\'EN GROUPE, L\'AIDE LE DIT', () => {
    // UNE AIDE QUI SE TAIT RENVOIE CHERCHER DANS LE CODE. Celle-ci doit dire
    // ce qu'elle a trouvé à la place, sans quoi on relit la feuille à la main
    // en se demandant où est passée une règle qui est sous les yeux.
    assert.throws(() => corpsDeLaRegle(FEUILLE, '.rang-btn'),
        /n'existe qu'en groupe.*\.rang-btn, \.btn-toggle/s);
    // Et le sélecteur groupé, demandé EN ENTIER, se lit normalement.
    assert.ok(declare(corpsDeLaRegle(FEUILLE, '.rang-btn, .btn-toggle'), 'min-height', '44px'));
});

test('UNE RÈGLE ABSENTE JETTE, ELLE NE REND PAS UN CORPS VIDE', () => {
    // Un corps vide se lirait « la règle ne déclare rien », ce qui est une
    // réponse — et c'est la même réponse qu'un sélecteur inventé. Le piège de
    // `doitExister`, dans une épreuve.
    assert.throws(() => corpsDeLaRegle(FEUILLE, '.nexiste-pas', { ou: 'essai.css' }),
        /a disparu de essai\.css/);
});

test('`declare` NE CONFOND PAS `height` AVEC `min-height`', () => {
    // La leçon d'origine du fichier, gardée ici : « le tiret de "max-width"
    // compte comme une frontière de mot, si bien que le motif trouvait `width`
    // dans `max-width` et restait vert sur le défaut même qu'il devait
    // attraper. »
    const corps = ' min-height: 44px; max-width: 10px; ';
    assert.ok(!declare(corps, 'height'));
    assert.ok(!declare(corps, 'width'));
    assert.ok(declare(corps, 'min-height', '44px'));
    assert.equal(valeurDe(corps, 'width'), null);
    assert.equal(valeurDe(corps, 'max-width'), '10px');
});
