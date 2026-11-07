// IL Y A TOUJOURS UNE FAÇON DE RÉPONDRE — sur les 249 exercices, et sur chaque
// marche que le professeur peut cocher.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet de son relevé du 23 octobre :
//
//   « Et pour la décompoisiton, il n'y a pas de clavier »
//
// Deux captures : « Complète la décomposition de 63 en facteurs premiers » et
// « Pose la décomposition de 56 en colonne ». Sous chacune, les deux boutons
// d'aide — ET RIEN D'AUTRE. Pas de pavé, pas de bulles, pas de champ. L'élève
// ne peut pas répondre, et le logiciel ne s'en plaint pas : zéro erreur de
// page. Une panne qui ne ressemble pas à une panne.
//
// CE QUE CETTE ÉPREUVE GARDE, et pourquoi elle ne ressemble à aucune autre :
// elle ne vérifie pas qu'un écran est joli ou qu'un calcul est juste, mais
// qu'il EXISTE un moyen de répondre. C'est la plus basse exigence du logiciel,
// et c'est celle qui manquait.
//
// ── POURQUOI ON TIRE AVEC TOUTES LES MARCHES COCHÉES ───────────────────────
//
// « Divisible, oui ou non ? » n'en déclare que trois au catalogue, et aucune
// des trois ne tombait en panne. Le défaut n'apparaissait qu'une fois d'autres
// marches cochées — ce qu'un professeur fait dans un parcours, et ce que fait
// l'Atelier. Un réglage qui se laisse changer doit se mesurer CHANGÉ : on
// prend donc le réglage le plus large que le panneau autorise.
//
// ── POURQUOI SEULEMENT LES ACTIVITÉS À PROPOSITIONS ────────────────────────
//
// `activities/numeric.js` monte son pavé quoi qu'il arrive : un exercice en
// « Pavé numérique » ne peut pas se retrouver muet. Les variantes de
// `choice.js` — Bulles, Digicode, Boutons — construisent des vignettes, et
// quand elles n'en ont aucune à construire, elles ne montrent rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices } from '../js/data/catalog.js';
import { getGenerator, getActivity } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import {
    itemPeutAllerAuClavier, itemPeutEtreChoisi, reponseEnPlusieursCases
} from '../js/core/aide.js';
import '../js/core/activities/index.js';

/** Le réglage le plus large que le panneau autorise : toutes les marches. */
function reglageLePlusLarge(exo, gen) {
    const params = { ...(exo.params || {}) };
    let marches = 0;
    (gen.params || []).forEach(p => {
        if (p && p.type === 'marches' && Array.isArray(p.default)) {
            params[p.id] = p.default;
            marches = Math.max(marches, p.default.length);
        }
    });
    // ASSEZ DE TIRAGES POUR VOIR CHAQUE MARCHE AU MOINS UNE FOIS. Vingt-six
    // tirages sur vingt-deux marches en laissaient passer : la marche « Rendre
    // une fraction irréductible » tombait juste au-delà, et c'est une des
    // quatre que Rémy a vues muettes. Une épreuve qui ne tire pas assez ne
    // rougit pas — elle rassure.
    return { params, tirages: Math.max(26, marches * 3) };
}

test('LA RÈGLE DES CASES MULTIPLES, ÉNONCÉE SEULE', () => {
    // « 2|3 » est une PAIRE RANGÉE : deux cases à remplir dans l'ordre, pas
    // deux nombres indépendants. Elle se tape, et elle ne se choisit pas.
    assert.equal(reponseEnPlusieursCases({ answer: '2|3' }), true);
    assert.equal(reponseEnPlusieursCases({ answer: '45|3|15|3|5' }), true);
    assert.equal(itemPeutAllerAuClavier({ answer: '2|3' }), true);
    assert.equal(itemPeutEtreChoisi({ answer: '2|3' }), false);
    // UNE SEULE CASE N'EST PAS PLUSIEURS, et le reste du logiciel ne bouge pas.
    assert.equal(reponseEnPlusieursCases({ answer: '42' }), false);
    assert.equal(reponseEnPlusieursCases({ answer: 42 }), false);
    assert.equal(itemPeutEtreChoisi({ answer: '42' }), true);
    // CE QUI N'EST PAS UN NOMBRE NE SE TAPE PAS, même à plusieurs cases : le
    // pavé n'écrit que des chiffres, et mieux vaut le savoir ici que devant la
    // classe.
    assert.equal(reponseEnPlusieursCases({ answer: 'oui|non' }), false);
    assert.equal(reponseEnPlusieursCases({ answer: '2|' }), false);
    assert.equal(reponseEnPlusieursCases({ answer: null }), false);
    assert.equal(reponseEnPlusieursCases(null), false);
});

test('AUCUNE QUESTION NE LAISSE L\'ÉLÈVE SANS MOYEN DE RÉPONDRE', () => {
    const muettes = [];
    let tirees = 0;
    for (const exo of exercices) {
        if (!exo.generatorId) continue;
        const act = exo.activityId ? getActivity(exo.activityId) : null;
        // SEULES LES VARIANTES DE `choice.js` PEUVENT SE RETROUVER SANS RIEN À
        // MONTRER. On les reconnaît à leur `mountOptions.variant` — Bulles,
        // Digicode, Boutons, Signes, Coordonnées —, pas à leur `accepts` :
        // « Pavé numérique » accepte lui aussi `choice`, et il a d'abord fait
        // rougir cette épreuve sur cinq questions parfaitement jouables (les
        // valeurs exactes du disque, « 18π », que `numeric.js` sert avec une
        // touche π). Le pavé monte son clavier quoi qu'il arrive : il ne peut
        // pas être muet.
        if (!act || !act.mountOptions || !act.mountOptions.variant) continue;
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') continue;
        const { params, tirages } = reglageLePlusLarge(exo, gen);
        for (let i = 0; i < tirages; i++) {
            let item = null;
            try {
                item = gen.generate({ ...params },
                    { rng: makeRng('muet' + i), weakTables: [], difficulty: null, index: i });
            } catch (e) { continue; }   // un générateur qui jette est une autre épreuve
            if (!item) continue;
            tirees++;
            // ON REGARDE LE FAIT, PAS CE QUE LE LOGICIEL EN DIT.
            //
            // Première version de cette épreuve : `itemPeutEtreChoisi(item) ||
            // itemPeutAllerAuClavier(item)`. Elle passait au vert sur le code
            // AVANT correction — et c'est tout le problème, puisque le défaut
            // y était : l'ancien `itemPeutEtreChoisi` répondait « oui, ça se
            // pose en propositions » pour une réponse à cinq cases, ce qui
            // était faux. Une épreuve qui demande au logiciel s'il va bien
            // reçoit la réponse du logiciel.
            //
            // On mesure donc les DEUX faits qu'un élève peut constater : y
            // a-t-il des boutons à toucher, et le pavé peut-il prendre la
            // main ? Deux propositions au moins — une seule n'est pas un
            // choix.
            const aDesBoutons = Array.isArray(item.choices) && item.choices.length > 1;
            if (aDesBoutons || itemPeutAllerAuClavier(item)) continue;
            muettes.push(`${exo.id} (${exo.activityId}) — « ${
                String((item.prompt && item.prompt.text) || item.question || '')
                    .replace(/\s+/g, ' ').slice(0, 60)} » → réponse « ${item.answer} »`);
        }
    }
    assert.ok(tirees > 1000, `trop peu de questions tirées (${tirees}) : l'épreuve ne mesure rien`);
    assert.deepEqual([...new Set(muettes)].slice(0, 12), [],
        `${muettes.length} question(s) sans aucun moyen de répondre`);
});
