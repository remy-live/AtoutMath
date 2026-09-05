// LE PANNEAU DE RÉGLAGES REND CE QU'ON Y A CHOISI.
//
// Le DOM ne connaît que des chaînes : « 2 » et « ia » en sortent identiques.
// `readParams` doit donc rendre à chaque valeur son type d'origine, et c'est
// exactement là qu'un bug s'était logé : le type était deviné sur la PREMIÈRE
// option du menu. Sur « Qui joue ? » des Arpenteurs — dont les choix sont 2,
// 'ia' et 1 — « Contre l'ordinateur » ressortait en `NaN`, le jeu ne se
// reconnaissait plus, et l'ordinateur ne jouait jamais.
//
// Le test ne vérifie pas ce cas-là : il vérifie TOUS. Chaque option de chaque
// menu du catalogue fait l'aller-retour, et doit revenir strictement égale à
// ce que le descripteur déclare.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readParams } from '../js/games/configUI.js';
import { exercices } from '../js/data/catalog.js';

const valeurDe = (o) => (o && typeof o === 'object') ? o.value : o;

/** Un faux panneau : il rend, pour chaque paramètre, la chaîne demandée. */
function fauxPanneau(valeurs) {
    const idDe = (sel) => {
        const m = sel.match(/\[data-param="([^"]+)"\]/);
        return m ? m[1] : null;
    };
    return {
        querySelector(sel) {
            const id = idDe(sel);
            if (id === null || !(id in valeurs)) return null;
            return { value: String(valeurs[id]), dataset: {} };
        },
        querySelectorAll(sel) {
            const id = idDe(sel);
            if (id === null || !(id in valeurs)) return [];
            const v = valeurs[id];
            return (Array.isArray(v) ? v : [v]).map(x => ({ checked: true, value: String(x) }));
        }
    };
}

test('UN CHOIX MIXTE NE SE FAIT PLUS ABÎMER — le cas des Arpenteurs', () => {
    const schema = [{
        id: 'joueurs', type: 'select',
        options: [{ value: 2 }, { value: 'ia' }, { value: 1 }]
    }];
    assert.equal(readParams(fauxPanneau({ joueurs: 'ia' }), schema).joueurs, 'ia');
    assert.equal(readParams(fauxPanneau({ joueurs: 2 }), schema).joueurs, 2);
    assert.equal(readParams(fauxPanneau({ joueurs: 1 }), schema).joueurs, 1);
});

test('CHAQUE OPTION DE CHAQUE MENU DU CATALOGUE FAIT L\'ALLER-RETOUR', () => {
    let vues = 0;
    exercices.forEach(exo => {
        (exo.paramSchema || []).forEach(param => {
            if (param.type !== 'select' || !Array.isArray(param.options)) return;
            param.options.forEach(opt => {
                const attendu = valeurDe(opt);
                const rendu = readParams(fauxPanneau({ [param.id]: attendu }), [param]);
                assert.deepEqual(rendu[param.id], attendu,
                    `« ${exo.id} » / ${param.id} : « ${attendu} » revient « ${rendu[param.id]} »`);
                vues++;
            });
        });
    });
    assert.ok(vues > 100, `seulement ${vues} options vérifiées : le catalogue en a bien plus`);
});

test('les cases à cocher multiples gardent aussi leur type', () => {
    exercices.forEach(exo => {
        (exo.paramSchema || []).forEach(param => {
            if (param.type !== 'multiselect' || !Array.isArray(param.options)) return;
            const toutes = param.options.map(valeurDe);
            const rendu = readParams(fauxPanneau({ [param.id]: toutes }), [param]);
            assert.deepEqual(rendu[param.id], toutes, `« ${exo.id} » / ${param.id}`);
        });
    });
});

test('un nombre reste un nombre, une case cochée reste un booléen', () => {
    const schema = [{ id: 'n', type: 'number' }];
    assert.equal(readParams(fauxPanneau({ n: '12' }), schema).n, 12);

    const root = {
        querySelector: () => ({ value: '', dataset: { kind: 'bool', valeur: 'true' } }),
        querySelectorAll: () => []
    };
    assert.equal(readParams(root, [{ id: 'b', type: 'checkbox' }]).b, true);
});

test('UNE LISTE DE MARCHES REND UN TABLEAU, ET SON PARTAGE AVEC', () => {
    // LE DÉFAUT QUI A MOTIVÉ CE TEST. Le panneau dessinait la bonne barre —
    // sept marches cochées, dix questions, une borne tirée — et l'exercice
    // jouait les douze marches à la file : `readParams` ne connaissait pas le
    // type `marches`, il retombait donc sur la branche « un seul champ » et
    // rendait la valeur de la PREMIÈRE case, une chaîne au lieu d'une liste.
    // Rien ne plantait, et tout était faux. Le partage, lui, vit dans un champ
    // caché hors schéma : il faut aller le chercher.
    const root = {
        querySelector(sel) {
            if (sel === '[data-repartition-marches]') return { value: '2,0,1,1,2,2,2' };
            return { value: 'm1', dataset: {} };
        },
        querySelectorAll(sel) {
            if (!sel.includes('multiselect')) return [];
            return [
                { checked: true, value: 'm1' },
                { checked: false, value: 'm2' },
                { checked: true, value: 'm3' }
            ];
        }
    };
    const rendu = readParams(root, [{ id: 'marches', type: 'marches' }]);
    assert.deepEqual(rendu.marches, ['m1', 'm3']);
    assert.equal(rendu.repartitionMarches, '2,0,1,1,2,2,2');
});

test('un paramètre absent du panneau n\'est pas inventé', () => {
    const rendu = readParams(fauxPanneau({}), [{ id: 'x', type: 'select', options: [1, 2] }]);
    assert.equal('x' in rendu, false);
});
