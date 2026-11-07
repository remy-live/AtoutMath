// AUCUNE AIDE NE POSE UN PAVÉ DEVANT UN ÉLÈVE QUI LIT MAL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « évidemment un élève qui galère c'est aussi un élève qui peut avoir
// du mal à lire, le but est qu'il comprenne. Mais surtout une aide doit être
// visuelle et pas trop longue en explication comme c'est parfois le cas pour
// certains exercices ».
//
// « CERTAINS EXERCICES » : il a fallu les COMPTER pour savoir lesquels. Mesuré
// (tools/cequilFautLire.mjs), 47 des 97 exercices à l'écran posaient à l'élève
// un bloc de plus de 25 mots d'un seul tenant. Après trois règles d'affichage
// (`aerer`, dans js/core/aideExercice.js) et quatre textes corrigés : ZÉRO.
//
// CETTE ÉPREUVE GARDE LE ZÉRO, et c'est tout son intérêt. Le défaut qu'elle
// attrape n'est pas une panne : c'est une phrase de trente mots écrite de
// bonne foi dans un générateur, six mois plus tard, par quelqu'un qui ne
// relira pas le journal. Rien ne casserait. Un élève lirait moins bien.
//
// ── CE QU'ELLE COMPTE, ET POURQUOI PAS LES MOTS ───────────────────────────
//
// LE PLUS LONG BLOC D'UN TRAIT, après aération — pas le total. « Temps,
// Distance, Vitesse » fait 44 mots et se lit très bien : une phrase, trois
// formules sur trois lignes, une phrase. Un pavé de trente mots sans
// respiration se lit deux fois plus mal. Compter les mots aurait condamné la
// bonne aide et laissé passer la mauvaise.
//
// ELLE COMPTE AVEC L'OUTIL, pas avec sa propre règle : `tools/mesureDuTexte.mjs`
// est importé par les deux. Deux comptes séparés dérivent, et le jour où ils
// diffèrent, c'est l'épreuve qui a tort sans le dire.
//
// ── ET LA MOITIÉ QU'ELLE NE GARDE PAS ─────────────────────────────────────
//
// 87 des 97 exercices n'ont AUCUN dessin sous leurs indices, alors que le
// logiciel sait en poser un (`item.schemas[i]`). C'est l'autre moitié de la
// demande de Rémy — « une aide doit être VISUELLE » —, elle se compte
// (`tools/cequilFautLire.mjs` l'imprime) et elle ne se garde pas encore : on
// ne peut pas exiger un dessin là où personne ne l'a dessiné.

import test from 'node:test';
import assert from 'node:assert/strict';
import { pave, repetee, nu } from '../tools/mesureDuTexte.mjs';
import '../js/core/activities/index.js';
import { allGenerators } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';

const PAVE_MAX = 25;

/** Les générateurs qu'un élève rencontre À L'ÉCRAN. */
function aLEcran() {
    const vus = new Set(exercices.map(e => e.generatorId).filter(Boolean));
    // LES GÉNÉRATEURS DE FEUILLE SONT ÉCARTÉS, et c'est voulu : une consigne
    // de feuille imprimée fait quatre-vingts mots, on la lit assis, le papier
    // sous les yeux. La première version de l'outil les comptait, et ils
    // occupaient les sept premières places du classement — une mesure qui
    // répond quelque chose en regardant à côté.
    return allGenerators().filter(g => vus.has(g.id));
}

/** Tout ce qu'un générateur peut dire à l'élève, sur plusieurs tirages. */
function cequilDit(g) {
    const sorties = [];
    for (const graine of ['a', 'b', 'c']) {
        for (const rang of [0, 2, 5]) {
            let it;
            try {
                it = g.generate({}, { rng: makeRng(`lire-${g.id}-${graine}`), index: rang, total: 8 });
            } catch (e) { continue; }
            if (!it) continue;
            (it.hints || []).forEach((h, i) => { if (h) sorties.push({ quoi: `indice ${i + 1}`, t: h }); });
            if (it.explanation) sorties.push({ quoi: 'explication', t: it.explanation });
        }
    }
    return sorties;
}

test('AUCUNE AIDE NE POSE PLUS DE 25 MOTS D\'UN SEUL TRAIT', () => {
    const bavards = [];
    let lus = 0;
    for (const g of aLEcran()) {
        for (const { quoi, t } of cequilDit(g)) {
            lus++;
            const n = pave(t);
            if (n > PAVE_MAX) {
                bavards.push(`${g.id} · ${quoi} · ${n} mots d'un trait\n        « ${nu(t).slice(0, 120)}… »`);
            }
        }
    }
    // LE SEUIL NE GARDE QU'UNE CHOSE : que le balayage a bien eu lieu. Sans
    // lui, un catalogue qui ne se charge plus rendrait cette épreuve verte en
    // ne lisant rien — c'est la famille de défauts qui coûte le plus cher ici.
    assert.ok(lus > 400, `seulement ${lus} aides lues : le balayage n'a pas eu lieu`);
    assert.deepEqual(bavards, [],
        `${bavards.length} aide(s) posent un pavé devant l'élève :\n      `
        + bavards.join('\n      ')
        + '\n\n      Couper en deux phrases, ou aller à la ligne. Les trois règles'
        + '\n      d\'affichage sont dans `aerer` (js/core/aideExercice.js) ; ce qui'
        + '\n      reste ici, c\'est une phrase vraiment trop longue.'
        + '\n      Rémy : « un élève qui galère c\'est aussi un élève qui peut avoir'
        + '\n      du mal à lire ».');
});

test('AUCUNE AIDE NE RÉPÈTE LA MÊME PHRASE', () => {
    // LE DÉFAUT N'EST PAS UNE LONGUEUR, C'EST UN RECOLLAGE. « Compter sur un
    // solide » joignait les explications de ses trois sous-questions, dont
    // chacune finissait par la vérification d'Euler : la même phrase trois
    // fois de suite, 139 mots pour en dire 60.
    const redits = [];
    for (const g of aLEcran()) {
        for (const { quoi, t } of cequilDit(g)) {
            const r = repetee(t);
            if (r) redits.push(`${g.id} · ${quoi} · ×${r.fois} « ${r.phrase.slice(0, 70)}… »`);
        }
    }
    assert.deepEqual([...new Set(redits)], [],
        'une aide se répète mot pour mot :\n      ' + [...new Set(redits)].join('\n      ')
        + '\n\n      C\'est presque toujours un recollage : plusieurs explications'
        + '\n      mises bout à bout, chacune finissant par la même phrase.'
        + '\n      Elle se dit UNE fois, à la fin.');
});
