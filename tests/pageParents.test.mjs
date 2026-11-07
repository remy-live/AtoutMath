// LA PAGE PARENTS — ce qui doit rester vrai d'une page à l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 4 novembre : « est-ce que Louis peut avoir un corrigé, ou ses
// parents ? » Les deux, et pas le même document. La fiche de reprise part avec
// l'élève et porte des questions ; celle-ci part chez ses parents et n'en porte
// aucune.
//
// CE QU'ON GARDE ICI N'EST PAS LA MISE EN PAGE — elle se regarde, et
// `tools/pagesParentsEnPdf.mjs` la rend en images. Ce sont les quatre choses
// qui se perdent en silence, et qui font qu'une page parents se retourne contre
// l'élève :
//
//   · ELLE DÉSIGNE LA PLUS FRAGILE. `bilanClasse` rend ses compétences de la
//     MIEUX maîtrisée à la moins bonne ; sans tri, la page nommait la moins
//     mauvaise des notions ratées et le conseil du soir portait sur celle dont
//     l'élève avait le moins besoin. C'est invisible : la page reste jolie.
//   · ELLE NE MONTRE QUE CE QU'ON A MESURÉ. Une notion vue deux fois rangée
//     dans « à reprendre » fait croire à un parent que son enfant échoue là où
//     il n'a rien fait.
//   · ELLE NE NOTE PAS. Ni moyenne, ni rang, ni /20 : une page qui arrive chez
//     des parents est lue comme un bulletin si on ne l'en empêche pas.
//   · ET ELLE NE DONNE PAS DE GENRE À L'ÉLÈVE. Le logiciel connaît des
//     prénoms, pas des genres ; « devant lui » chez les parents d'une fille
//     est une faute que personne ne relira avant l'impression.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    A_LA_MAISON, conseilMaison, phraseParents, troisColonnes
} from '../js/ui/pageParents.js';

/** Un élève de `bilanClasse`, réduit à ce que la page parents lit, et rendu
 *  DANS SON ORDRE : de la mieux maîtrisée à la moins bonne. */
const eleve = (o = {}) => ({
    id: 'e1', nom: 'Louis', questions: 48, reussite: 0.63, seancesFinies: 1,
    competences: [
        { skillId: 'num.add.entiers', nom: 'Additionner des entiers', niveau: 'A',
            maitrise: 0.9, taux: 0.9, essais: 10, fiable: true },
        { skillId: 'num.div.quotient', nom: 'Diviser (quotient exact)', niveau: 'EC',
            maitrise: 0.6, taux: 0.6, essais: 8, fiable: true },
        { skillId: 'geo.repere.coord', nom: 'Lire et placer des coordonnées', niveau: 'EC',
            maitrise: 0.5, taux: 0.5, essais: 8, fiable: true },
        { skillId: 'mes.grandeurs.composees', nom: 'Les grandeurs composées', niveau: 'NA',
            maitrise: 0.35, taux: 0.35, essais: 9, fiable: true },
        { skillId: 'mes.aire.rectangle', nom: 'Aire d\'un rectangle', niveau: 'NA',
            maitrise: 0.1, taux: 0.1, essais: 9, fiable: true }
    ],
    ...o
});

test('LA PLUS FRAGILE PASSE DEVANT, DANS LES DEUX COLONNES DU BAS', () => {
    // `bilanClasse` trie ses compétences de la MIEUX maîtrisée à la moins
    // bonne. Tout le fichier lit ensuite `reprendre[0]` pour dire ce qui
    // l'arrête et quoi faire à la maison : sans ce tri, la page désignait la
    // moins mauvaise des notions ratées. La page restait jolie, et le conseil
    // du soir portait sur celle dont l'élève avait le moins besoin.
    const c = troisColonnes(eleve());
    assert.equal(c.reprendre[0].skillId, 'mes.aire.rectangle',
        'la page désigne la moins mauvaise des notions ratées');
    assert.equal(c.encours[0].skillId, 'geo.repere.coord');
    // ET LE CONSEIL DU SOIR SUIT LA MÊME NOTION, sinon la page dit une chose
    // et en conseille une autre.
    assert.equal(conseilMaison(c), A_LA_MAISON['mes.aire.rectangle']);
    assert.match(phraseParents(eleve(), c), /Aire d'un rectangle/);
});

test('ON NE MONTRE QUE CE QU\'ON A MESURÉ', () => {
    // Une notion vue deux fois n'est pas ratée, elle est inconnue — `fiable`
    // est le drapeau que `core/bilan.js` pose quand il y a eu assez de
    // questions pour juger.
    const c = troisColonnes(eleve({ competences: [
        { skillId: 'x', nom: 'Vue deux fois', niveau: 'NA', maitrise: 0, fiable: false },
        { skillId: 'y', nom: 'Vraiment ratée', niveau: 'NA', maitrise: 0.3, fiable: true }
    ] }));
    assert.deepEqual(c.reprendre.map(x => x.skillId), ['y']);
    assert.equal(c.acquis.length + c.encours.length, 0);
});

test('LA PHRASE COMMENCE PAR CE QUI VA, ET NE FABRIQUE PAS DE COMPLIMENT', () => {
    // Un parent qui lit d'abord un reproche ne lit plus la suite, et la suite
    // est la seule partie utile. Mais s'il n'y a rien d'acquis, on ne fabrique
    // pas un compliment : on dit où il en est, et cela suffit.
    const b = eleve();
    const p = phraseParents(b, troisColonnes(b));
    assert.ok(p.startsWith('Louis tient Additionner des entiers'), p);

    const sansRien = eleve({ competences: [
        { skillId: 'mes.aire.rectangle', nom: 'Aire d\'un rectangle', niveau: 'NA',
            maitrise: 0.1, fiable: true }
    ] });
    const p2 = phraseParents(sansRien, troisColonnes(sansRien));
    assert.ok(!/tient/.test(p2), 'on invente un acquis qui n\'existe pas');
    assert.match(p2, /Aire d'un rectangle/);

    // ET CELUI QUI A TOUT RÉUSSI N'A RIEN « QUI L'ARRÊTE ».
    const tout = eleve({ competences: [
        { skillId: 'num.add.entiers', nom: 'Additionner des entiers', niveau: 'A',
            maitrise: 0.95, fiable: true }
    ] });
    assert.match(phraseParents(tout, troisColonnes(tout)), /Rien n'est en attente/);
});

test('ET IL Y A TOUJOURS UNE CHOSE À FAIRE À LA MAISON', () => {
    // C'est la seule partie de la page sur laquelle un parent peut AGIR. Une
    // notion sans conseil écrit ne laisse pas un trou : on dit de la refaire
    // ensemble, ce qui est vrai.
    const inconnue = troisColonnes(eleve({ competences: [
        { skillId: 'skill.sans.conseil', nom: 'Une notion neuve', niveau: 'NA',
            maitrise: 0.2, fiable: true }
    ] }));
    const c = conseilMaison(inconnue);
    assert.ok(c && c.length > 30, 'la page parents a un trou là où elle est utile');
    assert.match(c, /Une notion neuve/);
    // Et quand il n'y a rien à reprendre, on le DIT — le silence se lirait
    // comme un oubli.
    assert.ok(conseilMaison({ acquis: [], encours: [], reprendre: [] }).length > 20);
});

test('CETTE PAGE NE NOTE PAS', () => {
    // Pas de moyenne, pas de rang, pas de /20. Une page qui arrive chez des
    // parents est lue comme un bulletin si on ne l'en empêche pas, et ce
    // logiciel ne juge pas : il mesure ce qui a été fait DESSUS.
    const b = eleve();
    const c = troisColonnes(b);
    const tout = [phraseParents(b, c), conseilMaison(c), ...Object.values(A_LA_MAISON)];
    for (const t of tout) {
        assert.ok(!/\/\s?20|\bmoyenne\b|\brang\b|\bnote\b/i.test(t),
            `une note s'est glissée dans la page parents : « ${t} »`);
    }
});

test('ET ELLE NE DONNE PAS DE GENRE À L\'ÉLÈVE', () => {
    // Le logiciel connaît des prénoms, pas des genres. « Partagez quelque chose
    // devant lui » part chez les parents d'une fille une fois sur deux, et
    // personne ne relit vingt-trois pages avant de les imprimer. Les pronoms
    // compléments indirects — « faites-LUI compter », « demandez-LUI » — sont
    // neutres et restent permis ; ce sont les formes disjointes qui trahissent.
    const genre = /\b(?:avec|devant|pour|chez|sans|près de|grâce à|après) (?:lui|elle)\b/i;
    const textes = [...Object.values(A_LA_MAISON), conseilMaison(troisColonnes(eleve({
        competences: [{ skillId: 'skill.sans.conseil', nom: 'Une notion neuve',
            niveau: 'NA', maitrise: 0.2, fiable: true }]
    })))];
    for (const t of textes) {
        assert.ok(!genre.test(t), `un pronom genré dans la page parents : « ${t} »`);
    }
});
