// LE JARDIN — ce qu'on exige des jardins LIVRÉS.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CES ÉPREUVES EXISTENT, ALORS QUE LE FABRICANT SE RELIT DÉJÀ.
//
// `tools/fabriquerJardins.mjs` vérifie chaque jardin avant de l'écrire : les
// rangées se lisent comme leurs réponses, les fleurs comme leurs mots, aucun mot
// ne sert deux fois. C'est bien — et ça ne protège RIEN une fois le fichier
// écrit. Un fichier de données engendré est précisément celui que plus personne
// ne questionne : il est long, il a l'air automatique, et un « petit coup de
// main » dedans ne laisse aucune trace. Ces épreuves relisent ce qui est LIVRÉ,
// pas ce qui a été fabriqué.
//
// Et elles tiennent une seconde promesse, celle-là invisible dans les données :
// toute réponse doit avoir une DÉFINITION. Une case sans indice est une case
// que l'élève ne peut pas trouver — et le fabricant écarte justement les mots
// de la pyramide, qui n'en ont pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { JARDINS } from '../js/data/jardins.js';
import {
    jardinGenerator, lettresDuJardin, definitionsParCouleur, COULEURS, nomDeRangee
} from '../js/core/generators/jardin.js';

const aucun = (liste, quoi) => assert.deepEqual(liste, [], `${quoi} :\n  ` + liste.join('\n  '));

test('le dépôt livre assez de jardins pour qu\'une classe ne les épuise pas', () => {
    assert.ok(JARDINS.length >= 5, `seulement ${JARDINS.length} jardin(s) livré(s)`);
});

test('CHAQUE RANGÉE SE LIT EXACTEMENT COMME SES RÉPONSES', () => {
    // La garantie la plus simple, et celle dont tout dépend : si les lettres
    // d'une rangée ne sont pas celles de ses mots, l'élève remplit juste et le
    // jeu lui dit qu'il a faux.
    const fautifs = [];
    JARDINS.forEach(j => {
        const lettres = lettresDuJardin(j);
        j.rangees.forEach((rg, i) => {
            const lu = rg.cles.map(c => lettres.get(c)).join('');
            const attendu = rg.reponses.map(r => r.mot).join('');
            if (lu !== attendu) fautifs.push(`${j.id} rangée ${nomDeRangee(i)} : « ${lu} » ≠ « ${attendu} »`);
            if (lu.length !== rg.cles.length) {
                fautifs.push(`${j.id} rangée ${nomDeRangee(i)} : ${lu.length} lettres pour ${rg.cles.length} cases`);
            }
        });
    });
    aucun(fautifs, 'rangées qui ne disent pas ce qu\'elles portent');
});

test('CHAQUE FLEUR SE LIT DANS LE SENS HORAIRE DEPUIS SON DÉPART', () => {
    // Le départ est ce que l'élève doit TROUVER ; s'il est faux dans les
    // données, la fleur n'a tout simplement pas de solution.
    const fautifs = [];
    JARDINS.forEach(j => {
        const lettres = lettresDuJardin(j);
        j.fleurs.forEach((f, i) => {
            assert.equal(f.petales.length, 6, `${j.id} fleur ${i} : ${f.petales.length} pétales`);
            const lu = Array.from({ length: 6 },
                (_, k) => lettres.get(f.petales[(k + f.depart) % 6]) || '?').join('');
            if (lu !== f.mot) fautifs.push(`${j.id} fleur ${i} : « ${lu} » ≠ « ${f.mot} »`);
        });
    });
    aucun(fautifs, 'fleurs qui ne portent pas leur mot');
});

test('TOUTE RÉPONSE A UNE DÉFINITION — sans quoi la case est introuvable', () => {
    const fautifs = [];
    JARDINS.forEach(j => {
        [...j.rangees.flatMap(rg => rg.reponses), ...j.fleurs].forEach(r => {
            if (!r.def || r.def.trim().length < 10) fautifs.push(`${j.id} : ${r.mot} — « ${r.def} »`);
        });
    });
    aucun(fautifs, 'réponses sans indice');
});

test('un mot ne sert qu\'une fois dans le même jardin', () => {
    // Deux fleurs du même mot, c'est deux définitions identiques dans le même
    // groupe de couleur : une faute d'impression, pas une énigme.
    const fautifs = [];
    JARDINS.forEach(j => {
        const tous = [...j.fleurs.map(f => f.mot), ...j.rangees.flatMap(rg => rg.reponses.map(r => r.mot))];
        const vus = new Set();
        tous.forEach(m => { if (vus.has(m)) fautifs.push(`${j.id} : ${m}`); vus.add(m); });
    });
    aucun(fautifs, 'mots employés deux fois dans un jardin');
});

test('LES COULEURS SE PARTAGENT LES FLEURS À PEU PRÈS ÉGALEMENT', () => {
    // C'est la signature du jeu : les définitions sont rangées par couleur et
    // mélangées dedans. Une couleur qui ne porterait qu'UNE fleur ne cacherait
    // rien — sa définition irait forcément là. Il en faut au moins deux.
    const fautifs = [];
    JARDINS.forEach(j => {
        const compte = {};
        j.fleurs.forEach(f => { compte[f.couleur] = (compte[f.couleur] || 0) + 1; });
        const connues = COULEURS.map(c => c.id);
        Object.keys(compte).forEach(c => {
            if (!connues.includes(c)) fautifs.push(`${j.id} : couleur inconnue « ${c} »`);
        });
        const valeurs = Object.values(compte);
        if (Math.max(...valeurs) - Math.min(...valeurs) > 1) {
            fautifs.push(`${j.id} : partage déséquilibré ${JSON.stringify(compte)}`);
        }
    });
    aucun(fautifs, 'couleurs mal réparties');
});

test('chaque case appartient à une rangée ou à une fleur, et à rien d\'inconnu', () => {
    const fautifs = [];
    JARDINS.forEach(j => {
        const connues = new Set(j.cases);
        [...j.rangees.flatMap(rg => rg.cles),
            ...j.fleurs.flatMap(f => [f.centre, ...f.petales])].forEach(c => {
            if (!connues.has(c)) fautifs.push(`${j.id} : la case ${c} n'est pas dans le jardin`);
        });
        // ET AUCUNE CASE N'EST ORPHELINE : une case qui n'est ni dans une
        // rangée ni dans une fleur ne peut se déduire de rien.
        const employees = new Set([...j.rangees.flatMap(rg => rg.cles),
            ...j.fleurs.flatMap(f => f.petales)]);
        j.cases.forEach(c => {
            const estCoeur = j.fleurs.some(f => f.centre === c);
            if (!employees.has(c) && !estCoeur) fautifs.push(`${j.id} : la case ${c} ne sert à rien`);
        });
    });
    aucun(fautifs, 'cases incohérentes');
});

test('LE CŒUR D\'UNE FLEUR N\'EST DANS AUCUN MOT DE SIX', () => {
    // C'est la règle du jeu d'origine, et elle a une conséquence visible : le
    // cœur reste neutre à l'écran. S'il entrait dans le mot de sa fleur, le
    // dessin mentirait.
    const fautifs = [];
    JARDINS.forEach(j => j.fleurs.forEach((f, i) => {
        if (f.petales.includes(f.centre)) fautifs.push(`${j.id} fleur ${i} : son cœur est un pétale`);
    }));
    aucun(fautifs, 'cœurs qui sont aussi des pétales');
});

test('les définitions des fleurs se rangent par couleur, sans en perdre', () => {
    const j = JARDINS[0];
    const groupes = definitionsParCouleur(j, makeRng('couleurs'));
    const total = groupes.reduce((n, g) => n + g.definitions.length, 0);
    assert.equal(total, j.fleurs.length, 'une définition de fleur s\'est perdue en route');
    groupes.forEach(g => {
        const attendues = j.fleurs.filter(f => f.couleur === g.id).map(f => f.def).sort();
        assert.deepEqual(g.definitions.slice().sort(), attendues, `groupe ${g.id}`);
    });
});

test('le générateur rend un jardin complet et sa solution', () => {
    for (let i = 0; i < 6; i++) {
        const item = jardinGenerator.generate({}, { rng: makeRng(`jg-${i}`), index: i });
        assert.ok(item.meta.jardin, 'pas de jardin');
        assert.ok(item.meta.solution instanceof Map, 'pas de solution');
        assert.equal(item.meta.solution.size, item.meta.jardin.cases.length,
            'la solution ne couvre pas toutes les cases');
        assert.ok(item.hints.length >= 2, 'pas d\'indice à montrer');
        assert.ok(item.explanation && item.explanation.length > 20, 'pas d\'explication');
        // La réponse attendue est la suite des rangées : c'est ce que l'activité
        // envoie à `submit`.
        assert.equal(item.answer,
            item.meta.jardin.rangees.map(rg => rg.reponses.map(r => r.mot).join('')).join('|'));
    }
});

test('les rangées se nomment A, B, C comme dans le jeu d\'origine', () => {
    assert.equal(nomDeRangee(0), 'A');
    assert.equal(nomDeRangee(3), 'D');
});
