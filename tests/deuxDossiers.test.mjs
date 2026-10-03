// UN EXERCICE PEUT TENIR À DEUX ENDROITS DE L'ARBRE.
//
// Rémy : « j'ai cherché l'exercice des nombres relatifs, il était dans
// priorités mais il peut être aussi dans nombre relatifs ».
//
// Il a raison, et ce n'est pas une hésitation de rangement : « −6 + 3 × (−2) »
// EST des priorités et EST des relatifs. Le ranger sous un seul revient à
// parier sur le chapitre que le professeur préparera ce jour-là.
//
// LE RANGEMENT PAR CHAPITRE LE FAISAIT DÉJÀ — un exercice y suit ses
// compétences. Seul le rangement par DOMAINE, celui par défaut, n'en
// connaissait qu'un ; d'où sa recherche infructueuse. Et tout le reste était
// prêt : `cheminsDe` rend une LISTE depuis le début, et l'arbre raisonne sur
// « au moins un de ses chemins passe par ce dossier ».
//
// MESURÉ APRÈS (tools/deuxDossiers.mjs, dans un vrai navigateur) : les quatre
// exercices concernés se trouvent sous « Priorités opératoires » ET sous
// « Nombres relatifs », et ceux qui n'ont rien à faire dans le second n'y sont
// pas — un rangement qui met tout partout ne range plus rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exercices } from '../js/data/catalog.js';
import { cheminsDe } from '../js/core/rangement.js';

const sousDossiers = (exo) => cheminsDe(exo, 'domaine').map((c) => c[1]);

test('CEUX QUI TRAVAILLENT LES DEUX CHAPITRES SONT DANS LES DEUX DOSSIERS', () => {
    // LE CRITÈRE N'EST PAS UNE LISTE ÉCRITE À LA MAIN : c'est la compétence.
    // Un exercice des priorités qui porte `num.prio.relatifs` travaille les
    // deux — c'est déjà ce que dit le rangement par chapitre, et c'est sur lui
    // qu'on s'aligne.
    const vises = exercices.filter((e) => (e.tags.chemin || [])[1] === 'Priorités opératoires'
        && (e.skills || []).some((s) => /relatif/i.test(s)));
    assert.ok(vises.length >= 4, `${vises.length} exercice(s) visés, au moins 4 attendus`);
    for (const e of vises) {
        assert.ok(sousDossiers(e).includes('Nombres relatifs'),
            `${e.id} travaille les relatifs : on doit le trouver dans leur dossier`);
        assert.ok(sousDossiers(e).includes('Priorités opératoires'),
            `${e.id} ne doit pas quitter les priorités pour autant`);
    }
});

test('ET LE SECOND RANGEMENT NE S\'INVITE PAS TOUT SEUL', () => {
    // UN RANGEMENT QUI MET TOUT PARTOUT NE RANGE PLUS RIEN. On vérifie donc
    // qu'un exercice sans `aussi` garde exactement un chemin.
    const temoin = exercices.find((e) => e.id === 'calc-prio-cascade');
    assert.ok(temoin, 'l\'exercice témoin existe');
    assert.deepEqual(sousDossiers(temoin), ['Priorités opératoires']);
    const combien = exercices.filter((e) => cheminsDe(e, 'domaine').length > 1).length;
    assert.ok(combien <= 12,
        `${combien} exercices à deux dossiers : au-delà, l'arbre ne trie plus, il répète`);
});

test('LE PREMIER CHEMIN RESTE LE PRINCIPAL', () => {
    // `tags.chemin[0]` donne le domaine, et plusieurs écrans l'affichent tel
    // quel — la pastille du catalogue, la colonne du bilan. Un exercice garde
    // donc UN domaine ; ce sont ses sous-dossiers qui peuvent être deux.
    for (const e of exercices) {
        const domaines = new Set(cheminsDe(e, 'domaine').map((c) => c[0]));
        assert.equal(domaines.size, 1,
            `${e.id} s'affiche sous deux domaines : la pastille ne saurait lequel écrire`);
    }
});
