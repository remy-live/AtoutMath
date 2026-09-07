// L'ESCALIER DE L'AIDE ET LA FRISE DES ZONES.
//
// Deux réglages vivent côte à côte dans le panneau d'un exercice, et ils ne
// parlent pas de la même chose : la frise des MARCHES dit ce que l'élève
// travaille, celle de l'AIDE dit comment il répond — deux propositions, quatre,
// ou au clavier. Ces tests gardent ce qui les distingue.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';

// LE PLAFOND DE PROPOSITIONS SE MESURE SUR TOUT L'EXERCICE, PAS SUR SON DÉBUT.
//
// Rémy : « Comment gères-tu les étapes et les propositions de réponse (QCM 2,
// 4, clavier) ? J'ai du mal à comprendre. » — puis « corrige quand tu vois des
// erreurs ». En lui répondant, j'en ai trouvé une.
//
// La frise des zones n'offre que les modes que l'exercice sait TENIR : promettre
// « 6 propositions » à un générateur qui n'en fabrique que quatre serait écrire
// une légende que l'élève ne verra jamais. Ce plafond se mesurait en tirant les
// TROIS PREMIÈRES questions. Sur une progression, elles tombent toutes dans la
// première marche — par construction la plus facile, donc celle qui offre le
// moins de propositions. Mesuré sur « Multiplier des Relatifs, pas à pas »,
// vingt-quatre questions :
//
//     2 2 2 2 2 2 2 2 2 2 4 4 4 4 4 4 4 4 4 4 4 4 4 4
//
// Les dix premières demandent seulement « positif ou négatif ? ». Le plafond
// tombait donc à DEUX pour tout l'exercice : « 4 propositions » devenait
// impossible à choisir, et une frise qui en portait une était silencieusement
// rabattue sur deux. Le professeur réglait quatre et voyait deux, sans un mot.
//
// Trois exercices du catalogue étaient dans ce cas : la Chasse aux Zéros
// (1 → 2), Dizaines Centaines Milliers (3 → 4) et celui-ci (2 → 4).

test('LE PLAFOND SE MESURE SUR TOUTE LA LONGUEUR', async () => {
    const { getGenerator: gg } = await import('../js/core/registry.js');
    const { getExerciseById: ge } = await import('../js/data/catalog.js');
    await import('../js/core/activities/index.js');

    const tire = (exo, gen, i, total) => {
        const it = gen.generate({ ...(exo.params || {}) },
            { index: i, total, rng: makeRng(`plaf-${exo.id}-${i}`) });
        return (it && Array.isArray(it.choices)) ? it.choices.length : 0;
    };

    // L'exercice témoin : ses dix premières questions n'ont que deux réponses,
    // les suivantes en ont quatre.
    const exo = ge('num-relatifs-produit');
    const gen = gg(exo.generatorId);
    const debut = Math.max(...[0, 1, 2].map(i => tire(exo, gen, i, 24)));
    const partout = Math.max(...Array.from({ length: 8 },
        (_, k) => tire(exo, gen, Math.round(k * 23 / 7), 24)));
    assert.equal(debut, 2, 'le début de l\'exercice n\'a plus deux réponses');
    assert.equal(partout, 4, 'la fin de l\'exercice n\'a plus quatre réponses');

    // Et le panneau échantillonne bien sur toute la longueur.
    const src = readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8');
    const bloc = src.slice(src.indexOf('function plafondPropositions'),
        src.indexOf('function modesPossibles'));
    assert.match(bloc, /plafondPropositions\(exoId, params, total = \d+\)/,
        'le plafond ne connaît pas la longueur de l\'exercice');
    assert.match(bloc, /Math\.round\(k \* \(n - 1\) \/ \(combien - 1\)\)/,
        'les tirages ne sont plus répartis sur toute la longueur');
    assert.match(bloc, /\{ index: i, total: n,/,
        'le total ne passe pas au générateur : la progression n\'avancerait pas');
    assert.ok(!/for \(let i = 0; i < 3; i\+\+\)/.test(bloc),
        'le plafond se mesure encore sur les trois premières questions');
});

test('LES DEUX FRISES NE PORTENT PLUS LE MÊME TITRE', async () => {
    const src = readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8');
    // Celle de l'aide dit COMMENT on répond, celle des marches dit QUOI on
    // travaille. Elles portaient toutes deux « Ce que l'élève verra ».
    // Les apostrophes sont échappées dans la source : on cherche les deux formes.
    assert.match(src, /Comment l\\?'élève répondra/, 'la frise de l\'aide n\'a pas son titre');
    assert.match(src, /Comment tu répondras/, 'la version élève du titre a disparu');
    assert.match(src, /Ce que l[’']élève travaillera/, 'la frise des marches n\'a pas son titre');
    // Le vieux titre ne subsiste que dans les COMMENTAIRES qui racontent le
    // défaut : ce qui compte, c'est qu'aucun des deux titres ne le porte plus.
    const titres = [...src.matchAll(/cfg-apercu-titre[\s\S]{0,220}?<\/span>/g)]
        .map(m => m[0]);
    assert.equal(titres.length, 2, `${titres.length} frises trouvées, deux attendues`);
    titres.forEach(t => assert.ok(!/élève verra/.test(t), t));
    assert.notEqual(titres[0], titres[1], 'les deux frises portent le même titre');
});
