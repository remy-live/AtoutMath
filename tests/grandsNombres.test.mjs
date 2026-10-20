// LES GRANDS NOMBRES — JUSQU'AUX CENTAINES DE MILLIARDS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, premier bloc de sa progression de sixième : les grands nombres y vont
// « jusqu'aux centaines de milliards ». Les trois exercices du chapitre
// plafonnaient bien plus bas, et MESURÉ sur quatre-vingts tirages chacun :
// « Chasse au Chiffre » à 9 925, « Décomposer, Recomposer » à 99 103, et la
// « Dictée de Grands Nombres » à 9 999 999.
//
// CE QUE CES ÉPREUVES GARDENT, et la première est la seule qui compte
// vraiment :
//
//   1. CE QU'ON DEMANDE SE TAPE. Deux plafonds étaient écrits à la main —
//      huit chiffres dans la dictée, SEPT dans le pavé numérique — et aucun
//      des deux ne regardait la question posée. L'élève entend le nombre,
//      calcule juste, et le clavier cesse de répondre : de sa place, un
//      plafond muet et un logiciel cassé ne se distinguent pas.
//   2. LES GRANDS NOMBRES N'ONT PAS DE DÉCIMALES, et ce n'est pas un choix de
//      confort : douze chiffres entiers et trois décimales font quinze
//      chiffres significatifs, la limite du nombre à virgule flottante de
//      JavaScript. `digitAtRank` rendrait des chiffres inventés.
//   3. LE TABLEAU DE NUMÉRATION PORTE UNE COLONNE PAR RANG INTERROGÉ. C'est
//      l'outil que l'élève remplit ; une question sur un rang qui n'y a pas de
//      case lui demande de poser un chiffre là où il n'y a pas de colonne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../js/core/ids.js';
import { RANK_NAMES, digitAtRank, formatFr } from '../js/core/numberWords.js';
import { chiffreRangGenerator, decompositionGenerator } from '../js/core/generators/numeration.js';

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
const chiffresDe = (v) => String(v).replace(/[^0-9]/g, '').length;

test('CE QUE LA DICTÉE FAIT ENTENDRE, ELLE LAISSE LE TAPER', () => {
    // LE JEU TOUCHE LE DOM : on le lit comme un texte, comme le fait déjà
    // l'épreuve des boutons étirés. Ce qu'on vérifie n'est pas une valeur mais
    // une DÉPENDANCE : le plafond de frappe doit être DÉDUIT du palier. Écrit
    // en dur, il vieillit en silence — c'est exactement ce qui est arrivé.
    const src = lire('js/games/dictee.js');
    assert.match(src, /combienDeChiffres\(this\.palier\)/,
        'le plafond de frappe ne se déduit plus du palier');
    assert.doesNotMatch(src, /this\.saisie\.length < \d/,
        'un plafond de frappe est écrit en dur dans la dictée');

    // ET LES PALIERS MONTENT BIEN AUX CENTAINES DE MILLIARDS.
    const paliers = [...src.matchAll(/max: (\d+)/g)].map(m => Number(m[1]));
    assert.ok(paliers.some(v => v >= 100000000000),
        `le plus grand palier est ${Math.max(...paliers)}`);
    // Chaque palier a un min strictement plus petit que son max, sinon le
    // tirage ne tire rien.
    const bornes = [...src.matchAll(/min: (\d+), max: (\d+)/g)];
    assert.equal(bornes.length, paliers.length);
    bornes.forEach(([, min, max]) => assert.ok(Number(min) < Number(max), `${min} ≥ ${max}`));
});

test('LE PAVÉ NUMÉRIQUE ACCEPTE AUTANT DE CHIFFRES AU DOIGT QU\'AU CLAVIER', () => {
    // IL N'Y AVAIT AUCUN PLAFOND AU CLAVIER PHYSIQUE, et sept chiffres au
    // doigt : deux élèves, deux logiciels. La règle est maintenant la même, et
    // elle a un nom.
    const src = lire('js/core/activities/numeric.js');
    const plafond = Number((src.match(/const CHIFFRES_MAX = (\d+);/) || [])[1]);
    assert.ok(plafond >= 12, `le pavé n'accepte que ${plafond} chiffres`);
    const usages = [...src.matchAll(/length < CHIFFRES_MAX/g)].length;
    assert.equal(usages, 2, `${usages} chemin(s) emploient le plafond, il en faut deux`);
    assert.doesNotMatch(src, /replace\('-', ''\)\.length < \d/,
        'un plafond de frappe est écrit en dur dans le pavé');
});

test('AUCUNE RÉPONSE DU CATALOGUE NE DÉPASSE CE QU\'ON PEUT TAPER', async () => {
    // LA GARDE QUI AURAIT ATTRAPÉ LE DÉFAUT. Un exercice qui attend une
    // réponse de douze chiffres derrière un pavé qui en accepte sept est
    // injouable, et rien ne le dit : la question s'affiche, elle est juste, et
    // le clavier s'arrête au milieu.
    const src = lire('js/core/activities/numeric.js');
    const plafond = Number((src.match(/const CHIFFRES_MAX = (\d+);/) || [])[1]);
    assert.ok(Number.isInteger(plafond), 'le pavé n\'annonce plus son plafond');
    const { exercices } = await import('../js/data/catalog.js');
    const { generateurDeFiche } = await import('../js/core/registry.js');
    await import('../js/core/activities/index.js');

    // ON BALAIE CHAQUE OPTION DÉCLARÉE, ET NON LES SEULS RÉGLAGES PAR DÉFAUT.
    //
    // Première version de cette garde : elle ne tirait que `exo.params`, où
    // « Taille des nombres » vaut « milliers ». Elle était donc VERTE sur le
    // défaut même qui a motivé son écriture — c'est le professeur qui change
    // le réglage, et c'est là que le pavé s'arrêtait. Un réglage qu'on offre
    // est un réglage qu'on doit mesurer.
    const variantes = (exo, g) => {
        const base = exo.params || {};
        const liste = [base];
        for (const p of (g.params || [])) {
            if (p.type !== 'select' || !Array.isArray(p.options)) continue;
            for (const o of p.options) {
                liste.push({ ...base, [p.id]: (o && o.value !== undefined) ? o.value : o });
            }
        }
        return liste;
    };

    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        for (const reglagesBase of variantes(exo, g)) {
            const essais = marches ? marches.length * 2 : 12;
            for (let i = 0; i < essais; i++) {
                const reglages = marches
                    ? { ...reglagesBase, marches: [marches[i % marches.length]] }
                    : reglagesBase;
                let it;
                try { it = g.generate(reglages, { rng: makeRng(`t_${exo.id}_${i}`), index: i, total: essais }); }
                catch { break; }
                // Seules les réponses qu'on TAPE sont concernées : un choix se
                // clique, une grille se remplit case par case.
                if (!it || it.answerKind !== 'numeric') continue;
                if (chiffresDe(it.answer) > plafond) {
                    fautifs.push(`${exo.id} : ${it.answer} (${chiffresDe(it.answer)} chiffres)`);
                    break;
                }
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('AU-DELÀ DES MILLIERS, AUCUN RANG DÉCIMAL', () => {
    // Douze chiffres entiers et trois décimales font quinze chiffres
    // significatifs : `digitAtRank` lit `value.toFixed(6)` et rendrait au-delà
    // des chiffres inventés. L'exercice compterait faux un élève qui a raison.
    for (const taille of ['millions', 'milliards']) {
        for (let k = 0; k < 60; k++) {
            // Même en demandant EXPRESSÉMENT la partie décimale.
            const it = chiffreRangGenerator.generate({ taille, partie: 'décimale', decimales: 3 },
                { rng: makeRng(`d-${taille}-${k}`) });
            assert.ok(it.meta.rank >= 0,
                `${taille} : rang ${it.meta.rank} (${RANK_NAMES[it.meta.rank]})`);
            assert.ok(Number.isInteger(it.meta.value), `${it.meta.value} n'est pas entier`);
            // ET LE CHIFFRE ANNONCÉ EST CELUI QU'ON LIT DANS L'ÉCRITURE.
            const ecrit = formatFr(it.meta.value).replace(/[^0-9]/g, '');
            const place = ecrit.length - 1 - it.meta.rank;
            assert.equal(Number(ecrit[place]), it.answer,
                `${formatFr(it.meta.value)} : ${RANK_NAMES[it.meta.rank]} → ${it.answer}`);
            assert.equal(digitAtRank(it.meta.value, it.meta.rank), it.answer);
        }
    }
});

test('LE TABLEAU DE NUMÉRATION A UNE CASE POUR CHAQUE RANG INTERROGÉ', () => {
    // C'est l'outil que l'élève REMPLIT : une question sur un rang sans
    // colonne lui demanderait de poser un chiffre là où il n'y a pas de case.
    for (const taille of ['milliers', 'millions', 'milliards']) {
        const vus = new Set();
        for (let k = 0; k < 120; k++) {
            const it = chiffreRangGenerator.generate({ taille, partie: 'les deux' },
                { rng: makeRng(`o-${taille}-${k}`) });
            const html = it.meta.outils[0].html;
            const cases = (html.match(/class="tn-case"/g) || []).length;
            assert.ok(cases >= 7, `${taille} : ${cases} cases seulement`);
            vus.add(it.meta.rank);
            // LE RANG DEMANDÉ EST NOMMÉ DANS UNE ÉTIQUETTE DE CASE. C'est le
            // lien entre la question et l'outil, et il se vérifie sur le nom.
            if (taille !== 'milliers') {
                assert.ok(html.includes(`Chiffre des ${RANK_NAMES[it.meta.rank]}`),
                    `${taille} : aucune case pour les ${RANK_NAMES[it.meta.rank]}`);
            }
        }
        // ET LES GRANDS RANGS SORTENT VRAIMENT, sinon le réglage ne change rien.
        const plusHaut = Math.max(...vus);
        const attendu = { milliers: 3, millions: 8, milliards: 11 }[taille];
        assert.equal(plusHaut, attendu, `${taille} : le rang le plus haut vu est ${plusHaut}`);
    }
});

test('LE TABLEAU DES GRANDS NOMBRES EST CELUI DU CAHIER', () => {
    // Douze colonnes nommées en toutes lettres ne tiennent pas dans un
    // téléphone — 26 px chacune, mesuré. Au-delà des milliers, le tableau
    // prend donc la forme des manuels : les CLASSES en bandeau, et sous
    // chacune trois colonnes « c d u ».
    const simple = chiffreRangGenerator.generate({ taille: 'milliers' },
        { rng: makeRng('s1') }).meta.outils[0].html;
    assert.doesNotMatch(simple, /tn-classe/, 'le petit tableau a pris le bandeau des classes');
    assert.match(simple, /millièmes/, 'le petit tableau a perdu ses décimales');

    const grand = chiffreRangGenerator.generate({ taille: 'milliards' },
        { rng: makeRng('s2') }).meta.outils[0].html;
    ['milliards', 'millions', 'mille', 'unités'].forEach(c =>
        assert.ok(grand.includes(`colspan="3">${c}<`), `la classe « ${c} » manque au bandeau`));
    assert.equal((grand.match(/class="tn-case"/g) || []).length, 12);
    // LA VIRGULE NE SE MARQUE QUE S'IL Y A QUELQUE CHOSE APRÈS ELLE. Sans
    // décimale, le trait rouge tombait sur le bord droit du tableau, où il ne
    // sépare plus rien — vu sur la photo au doigt, il se lit comme un défaut.
    assert.doesNotMatch(grand, /tn-avant-virgule/,
        'la virgule est marquée alors qu\'il n\'y a pas de décimales');
});

test('LA DÉCOMPOSITION MONTE AUX MILLIARDS ET RESTE COURTE', () => {
    for (const [taille, plafond] of [['milliers', 99999], ['millions', 999999999],
        ['milliards', 999999999999]]) {
        let vuGrand = false;
        for (let k = 0; k < 120; k++) {
            const it = decompositionGenerator.generate({ taille, sens: 'recomposer' },
                { rng: makeRng(`dc-${taille}-${k}`) });
            const { total, termes } = it.meta;
            assert.ok(total <= plafond, `${taille} : ${total} dépasse ${plafond}`);
            assert.equal(termes.reduce((s, t) => s + t, 0), total, it.prompt.text);
            // JAMAIS PLUS DE QUATRE TERMES : une décomposition de douze lignes
            // ne se lit plus, et ce n'est pas ce que le chapitre demande.
            assert.ok(termes.length >= 3 && termes.length <= 4,
                `${termes.length} termes dans « ${it.prompt.text} »`);
            // ET CHAQUE TERME EST UN CHIFFRE SUIVI DE ZÉROS : c'est ce qui
            // fait qu'il désigne UN rang, et rien d'autre.
            termes.forEach(t => assert.match(String(t), /^[1-9]0*$/, it.prompt.text));
            if (total > 99999) vuGrand = true;
        }
        if (taille !== 'milliers') {
            assert.ok(vuGrand, `${taille} : aucun nombre au-dessus de 99 999 en cent vingt tirages`);
        }
    }
});
