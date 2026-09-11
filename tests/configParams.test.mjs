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
import { readParams, champsSchema } from '../js/games/configUI.js';
import { cleParMarche } from '../js/core/progression.js';
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

test('CE QU\'ON CACHE À L\'ÉLÈVE N\'EST PAS CE QU\'ON EFFACE', () => {
    // Le panneau d'avant-partie retire à l'élève les outils de PRÉPARATION —
    // la liste des marches et sa frise, marquées `prof: true`. Mesuré : la
    // médiane de commandes passe de 7 à 4,9 et le pire panneau de 31 à 17.
    //
    // LE PIÈGE EST SILENCIEUX, et c'est pour lui que ce test existe. Dessiner
    // sans un réglage puis le relire quand même le remet à zéro : `readParams`
    // ne trouve pas ses cases et rend une liste VIDE, qui écrase ce que le
    // professeur a préparé. L'élève jouerait alors toutes les marches, sans que
    // rien ne l'annonce. Le panneau filtre donc UNE fois, et le même schéma
    // sert à dessiner et à relire.
    const complet = [
        { id: 'marches', type: 'marches', prof: true },
        { id: 'reponse', type: 'select', options: [{ value: 'saisie' }, { value: 'choix' }] }
    ];
    const eleve = complet.filter(p => !p.prof);
    assert.deepEqual(eleve.map(p => p.id), ['reponse'],
        'la liste des marches est un outil de préparation');

    // Le panneau de l'élève ne porte que « reponse » : relu avec SON schéma, il
    // ne dit rien des marches, et ce que le professeur a posé passe au travers.
    const rendu = readParams(fauxPanneau({ reponse: 'choix' }), eleve);
    assert.equal('marches' in rendu, false, 'les marches ne doivent pas être inventées');
    const prepare = { marches: ['m3', 'm5'], repartitionMarches: '7,3' };
    assert.deepEqual({ ...prepare, ...rendu },
        { marches: ['m3', 'm5'], repartitionMarches: '7,3', reponse: 'choix' });

    // Relu avec le schéma COMPLET, en revanche, il rendrait une liste vide —
    // c'est exactement ce qu'il ne faut pas faire, et c'est ce que ce test
    // fige.
    const faux = readParams(fauxPanneau({ reponse: 'choix' }), complet);
    assert.deepEqual(faux.marches, [], 'le mauvais schéma vide bien la liste');
});

test('LA RÉPONSE PAR MARCHE REVIENT DU PANNEAU', () => {
    // Rémy : « pour réponse à saisir ou 4 réponses, il faut que ce soit
    // spécifique à la zone ». La table vit dans un champ caché, comme le
    // partage — et pour la même raison : c'est un état de la frise, pas une
    // ligne du schéma. Sans cette lecture, la bulle montrerait le bon aperçu
    // et l'exercice jouerait autre chose, exactement comme le partage l'a fait.
    const root = {
        querySelector(sel) {
            if (sel === '[data-repartition-marches]') return { value: '' };
            return { value: 'm1', dataset: {} };
        },
        querySelectorAll(sel) {
            if (sel === '[data-par-marche]') {
                return [{ dataset: { parMarche: 'reponse' }, value: 'm1:choix,m3:saisie' }];
            }
            if (!sel.includes('multiselect')) return [];
            return [{ checked: true, value: 'm1' }, { checked: true, value: 'm3' }];
        }
    };
    const rendu = readParams(root, [{ id: 'marches', type: 'marches' }]);
    assert.equal(rendu.reponseParMarche, 'm1:choix,m3:saisie');
    // La clé se compose dans le code, jamais dans le DOM : le champ ne porte
    // que le nom du réglage qu'il précise.
    assert.equal(cleParMarche('reponse'), 'reponseParMarche');
});

test('UN RÉGLAGE PAR MARCHE NE S\'ÉCRIT PAS DEUX FOIS', () => {
    // Sur un panneau qui porte la frise, la façon de répondre se règle DANS la
    // bulle : laisser en plus le menu global en bas, ce serait deux commandes
    // pour une décision. Sans frise — le panneau de l'élève —, le menu reste :
    // lui doit pouvoir choisir comment il répond, il n'a simplement pas de
    // zones où le faire varier.
    const reponse = { id: 'reponse', type: 'select', parMarche: true, options: [{ value: 'saisie' }] };
    const avec = champsSchema([{ id: 'marches', type: 'marches', marches: [] }, reponse], () => '');
    const sans = champsSchema([reponse], () => '');
    assert.equal(avec.includes('data-param="reponse"'), false,
        'la frise porte déjà ce réglage, marche par marche');
    assert.equal(sans.includes('data-param="reponse"'), true,
        'sans frise, le menu reste la seule façon de le régler');
});

test('un paramètre absent du panneau n\'est pas inventé', () => {
    const rendu = readParams(fauxPanneau({}), [{ id: 'x', type: 'select', options: [1, 2] }]);
    assert.equal('x' in rendu, false);
});
