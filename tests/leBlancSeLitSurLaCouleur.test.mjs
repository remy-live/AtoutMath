// LES SURFACES QUI PORTENT DU BLANC.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROUVÉ PAR UN AUDIT D'ERGONOMIE, et l'écart était précis : le TEXTE de
// l'application est irréprochable — zéro manquement sur tous les écrans, dans
// les cinq thèmes — mais les SURFACES colorées qui portent du blanc ne
// passaient pas. Mesuré au pixel :
//
//   l'avis vert (« Donné à la 6e B »)        2,54:1   seuil AA : 4,5
//   l'avis rouge (« le serveur ne répond »)  3,76:1
//   « J'ai compris », après chaque faute     3,76:1
//   l'étoile d'une étape réussie             2,15:1
//
// ET LE REMÈDE ÉVIDENT ÉTAIT UN PIÈGE, ce qui est la vraie leçon de ce
// fichier. L'audit proposait de reprendre les jetons `--success-texte` /
// `--danger-texte`, qui donnent 5,48 et 6,29 — en thème CLAIR. En thème
// sombre, `--success-texte` vaut #6ee7b7, un vert pâle fait pour se poser sur
// du noir : blanc dessus, 1,52 — PIRE que les 2,54 qu'on voulait réparer.
// Le commentaire de `css/base.css` le disait déjà, écrit bien avant l'audit :
// « le thème sombre les veut carrément opposés — fond vif, texte pâle ».
//
// D'où un TROISIÈME rôle, et non un jeton recyclé : `--success-fond`,
// `--danger-fond`, `--warning-fond`. Leur contrainte n'est pas d'aller avec la
// page, elle est de porter du blanc — elle est donc la même dans tous les
// thèmes, et ils ne se redéfinissent nulle part.
//
// CE TEST GARDE LA RÈGLE, PAS LA VALEUR. Il ne dit pas « le vert doit valoir
// #047857 » : il recalcule le contraste. On peut donc changer la teinte pour
// des raisons de goût, et le test ne tombera que si elle cesse de se lire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const BASE = lire('css/base.css');

/** La luminance relative, telle que la définit WCAG. */
function luminance(hex) {
    const v = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
    const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (haut + 0.05) / (bas + 0.05);
}

const BLANC = '#ffffff';

/** Toutes les valeurs données à un jeton, dans tout le fichier — thèmes compris. */
function valeursDe(nom) {
    return [...BASE.matchAll(new RegExp(`${nom}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map(m => m[1]);
}

test('LE BLANC SE LIT SUR LES TROIS FONDS DE SENS', () => {
    ['--success-fond', '--danger-fond', '--warning-fond'].forEach(jeton => {
        const valeurs = valeursDe(jeton);
        assert.ok(valeurs.length >= 1, `${jeton} n'existe pas`);
        valeurs.forEach(v => {
            const r = contraste(v, BLANC);
            assert.ok(r >= 4.5,
                `${jeton} = ${v} : blanc dessus donne ${r.toFixed(2)}:1, il en faut 4,5`);
        });
    });
});

test('ET ILS NE SE REDÉFINISSENT DANS AUCUN THÈME — c\'est ce qui les rend sûrs', () => {
    // Un jeton « fond » redéfini par un thème redeviendrait un jeton de thème,
    // avec la contrainte du thème et non la sienne. C'est exactement ce qui
    // aurait cassé le thème sombre si l'on avait recyclé `--success-texte`.
    ['--success-fond', '--danger-fond', '--warning-fond'].forEach(jeton => {
        assert.equal(valeursDe(jeton).length, 1,
            `${jeton} est défini ${valeursDe(jeton).length} fois : un thème le redéfinit`);
    });
    // Et pour que ce test prouve quelque chose, il faut que les jetons de
    // TEXTE, eux, varient bien d'un thème à l'autre.
    assert.ok(valeursDe('--success-texte').length > 1,
        'si les jetons de texte ne variaient pas, ce test ne garderait rien');
});

test('LE PIÈGE EST ÉCRIT DANS LE CODE — reprendre le jeton de texte casse le sombre', () => {
    // On ne se contente pas de l'avoir évité : on vérifie que le piège est
    // réel, pour que personne ne « simplifie » en fusionnant les deux jetons.
    const texteSombre = valeursDe('--success-texte')
        .map(v => ({ v, r: contraste(v, BLANC) }))
        .sort((a, b) => a.r - b.r)[0];
    assert.ok(texteSombre.r < 4.5,
        `--success-texte passe partout (${texteSombre.r.toFixed(2)}) : le piège n'existe plus, `
        + 'et ce test peut disparaître');
});

test('LES SURFACES QUI PORTENT DU BLANC PRENNENT UN JETON « FOND »', () => {
    // Les quatre endroits mesurés par l'audit. Si l'un repasse à `--danger`
    // ou `--success`, le contraste retombe sous le seuil sans que personne
    // ne le voie : le texte reste blanc, la couleur reste « rouge », et seule
    // une mesure le dit.
    const MODAL = lire('js/ui/modal.js');
    assert.match(MODAL, /isError \? 'var\(--danger-fond\)'/,
        'l\'avis d\'erreur ne prend plus le jeton « fond »');
    assert.match(MODAL, /'var\(--success-fond\)'/,
        'l\'avis de réussite ne prend plus le jeton « fond »');

    const MODULES = lire('css/modules.css');
    assert.match(MODULES, /\.fb-card--ko \.fb-close \{ background: var\(--danger-fond\)/,
        '« J\'ai compris » après une faute ne prend plus le jeton « fond »');
    assert.match(MODULES, /\.world-node--done \.world-node-rang \{[^}]*background: var\(--warning-fond\)/,
        'l\'étoile d\'une étape réussie ne prend plus le jeton « fond »');
});

test('ET LE TEXTE, LUI, GARDE SES JETONS DE TEXTE', () => {
    // Le partage a un sens dans les deux sens : un jeton « fond » employé
    // comme couleur de TEXTE sur la page serait trop sombre en thème sombre,
    // exactement le défaut symétrique.
    ['js/ui/espaceClasses.js', 'js/ui/builder.js', 'css/ui.css'].forEach(f => {
        const C = lire(f);
        const m = /color:\s*var\(--(success|danger|warning)-fond\)/.exec(C);
        assert.equal(m, null, `${f} : « ${m && m[0]} » — un fond employé comme texte`);
    });
});
