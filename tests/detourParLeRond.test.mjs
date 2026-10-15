// LE DÉTOUR PAR LE NOMBRE ROND — ce qui doit tenir pour qu'on puisse l'enseigner.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien des exercices de calcul mentaux du genre 76 + 9 ou
// 76 + 99 ou 156 − 9 ou 156 − 99, il faut que l'élève comprenne qu'on retire un
// et qu'on ajoute 10 (en tout cas pour le 9), etc ».
//
// UN EXERCICE QUI ENSEIGNE UNE STRATÉGIE DOIT D'ABORD QUE LA STRATÉGIE SOIT
// VRAIE. C'est la première épreuve de ce fichier, et c'est la seule qui
// compte vraiment : le chemin qu'on fait suivre à l'élève — passer par le
// nombre rond, puis compenser — doit tomber exactement sur le résultat du
// calcul direct, pour tous les voisins et dans les deux sens. Une seule
// exception, et l'élève suit une méthode qui le trahit.
//
// ET LE DESSIN DOIT DIRE LA MÊME CHOSE. Un schéma qui montre d'autres nombres
// que le calcul est pire que pas de schéma : l'élève fait confiance à l'image.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    VOISINS, voisinDe, correction, parLeDetour, toutDroit, ligneDuMilieu,
    detourSvg, depart, question, ETAPES, detourRondGenerator
} from '../js/core/generators/detourRond.js';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

const marche = (id) => ETAPES.find(e => e.id === id);

test('CHAQUE VOISIN EST BIEN SON NOMBRE ROND, PLUS SON ÉCART', () => {
    // LA TABLE EST ÉCRITE À LA MAIN, donc une faute de frappe y est possible —
    // et elle ne se verrait nulle part ailleurs : l'exercice enseignerait
    // tranquillement que 98 vaut 100 − 1.
    for (const v of VOISINS) {
        assert.equal(v.rond + v.ecart, v.n,
            `${v.n} serait ${v.rond} ${v.ecart < 0 ? '−' : '+'} ${Math.abs(v.ecart)} `
            + `= ${v.rond + v.ecart}`);
        assert.ok(v.rond % 10 === 0, `${v.rond} n'est pas un nombre rond`);
        assert.ok(Math.abs(v.ecart) <= 2, `${v.n} : un écart de ${v.ecart} n'est plus un détour`);
    }
});

test('LA STRATÉGIE QU\'ON ENSEIGNE TOMBE TOUJOURS JUSTE', () => {
    // LE DÉTOUR CONTRE LE CALCUL DIRECT, sur tous les voisins, dans les deux
    // sens, et sur toute la plage des départs. C'est l'épreuve qui autorise à
    // enseigner la méthode.
    for (const v of VOISINS) {
        for (const op of ['+', '−']) {
            for (let d = 20; d <= 500; d += 7) {
                assert.equal(parLeDetour(d, v, op), toutDroit(d, v, op),
                    `${d} ${op} ${v.n} : par le détour ${parLeDetour(d, v, op)}, `
                    + `tout droit ${toutDroit(d, v, op)}`);
            }
        }
    }
});

test('LA COMPENSATION S\'INVERSE AVEC L\'OPÉRATION', () => {
    // C'EST LE PIÈGE DU CHAPITRE, et la règle tient en une ligne de code —
    // donc elle peut se perdre en une ligne de code. Pour AJOUTER 9 on retire
    // 1 ; pour RETIRER 9 on ajoute 1.
    for (const v of VOISINS) {
        assert.equal(correction(v, '+'), -correction(v, '−'),
            `${v.n} : la compensation ne change pas de sens entre + et −`);
    }
    const neuf = voisinDe(9);
    assert.equal(correction(neuf, '+'), -1, 'ajouter 9 : + 10 puis − 1');
    assert.equal(correction(neuf, '−'), 1, 'retirer 9 : − 10 puis + 1');
    assert.equal(ligneDuMilieu(76, neuf, '+'), '76 + 10 − 1');
    assert.equal(ligneDuMilieu(156, neuf, '−'), '156 − 10 + 1');
});

test('LE DÉPART OBLIGE À FRANCHIR LA DIZAINE', () => {
    // SANS FRANCHISSEMENT, LE DÉTOUR NE SERT À RIEN : « 72 + 9 » se fait de
    // tête sans aucune stratégie, et l'exercice ne mesure plus ce qu'il
    // prétend travailler.
    for (const v of VOISINS) {
        for (const op of ['+', '−']) {
            for (let g = 0; g < 25; g++) {
                const d = depart(makeRng(`dep-${v.n}-${op}-${g}`), v, op);
                const r = toutDroit(d, v, op);
                assert.ok(r > 0, `${d} ${op} ${v.n} = ${r} : on sort des entiers positifs`);
                assert.notEqual(Math.floor(d / 10), Math.floor(r / 10),
                    `${d} ${op} ${v.n} = ${r} : on reste dans la même dizaine, `
                    + 'le détour ne sert à rien');
            }
        }
    }
});

test('LES DEUX PIÈGES SONT LES DEUX MOITIÉS DU DÉTOUR RATÉES', () => {
    // ON S'EST ARRÊTÉ AU NOMBRE ROND, ou l'on est revenu du mauvais côté. Ce
    // sont les deux seules fautes que produit cette méthode, et ce sont donc
    // les deux propositions qui apprennent quelque chose.
    for (const id of ['calcul-plus', 'calcul-moins', 'calcul-melange', 'calcul-voisins']) {
        for (let g = 0; g < 30; g++) {
            const q = question(marche(id), makeRng(`${id}-${g}`));
            const c = correction(q.voisin, q.op);
            const arrete = q.reponse - c;
            const envers = q.reponse - 2 * c;
            assert.equal(q.pieges[0].value, arrete,
                `${id} : le premier piège de « ${q.enonce} » devrait être ${arrete} `
                + `(on s'arrête au nombre rond), il vaut ${q.pieges[0].value}`);
            assert.equal(q.pieges[1].value, envers,
                `${id} : le second piège devrait être ${envers} (compensation à l'envers)`);
            assert.ok(q.pieges.every(p => p.why && p.why.length > 10),
                `${id} : un piège sans « pourquoi » n'apprend rien`);
        }
    }
});

test('LE DESSIN DIT EXACTEMENT CE QUE DIT LE CALCUL', () => {
    // UN SCHÉMA QUI MENT EST PIRE QUE PAS DE SCHÉMA : l'élève fait confiance à
    // l'image, et il a raison de le faire. On relit donc les trois nombres
    // écrits dans le SVG et on les compare au calcul.
    for (const v of VOISINS) {
        for (const op of ['+', '−']) {
            const d = 156;
            const svg = detourSvg(d, v, op);
            const nombres = [...svg.matchAll(/font-size="17"[^>]*>(\d+)</g)].map(m => Number(m[1]));
            const rond = op === '−' ? d - v.rond : d + v.rond;
            assert.deepEqual(nombres, [d, rond, toutDroit(d, v, op)],
                `${d} ${op} ${v.n} : le dessin porte ${nombres.join(', ')}`);
            // ET LE SIGNE DU PETIT PAS EST CELUI DE LA COMPENSATION, pas celui
            // de l'écart : c'est toute la différence entre ajouter et retirer.
            const c = correction(v, op);
            assert.ok(svg.includes(`>${c < 0 ? '−' : '+'} ${Math.abs(c)}<`),
                `${d} ${op} ${v.n} : le petit pas n'est pas étiqueté `
                + `« ${c < 0 ? '−' : '+'} ${Math.abs(c)} »`);
        }
    }
});

test('LE DESSIN N\'ARRIVE QUE LÀ OÙ IL Y A UN SAUT À MONTRER', () => {
    // LA PREMIÈRE MARCHE NE PARLE D'AUCUN CALCUL — « de 10 à 9, je fais ? ».
    // Un schéma de saut y montrerait un départ inventé.
    const rangs = Object.fromEntries(ETAPES.map((e, i) => [e.id, i]));
    for (const [id, rang] of Object.entries(rangs)) {
        const it = detourRondGenerator.generate({},
            { rng: makeRng(`schema-${id}`), index: rang, total: ETAPES.length });
        const a = (it.schemas || [])[1] || '';
        if (id === 'voir-rond') {
            assert.equal(a, '', 'la marche « le nombre rond caché » porte un dessin de saut');
        } else {
            assert.match(a, /^<svg /, `${id} : le deuxième indice n'a pas de dessin`);
        }
        // ET LE PREMIER INDICE N'EN A JAMAIS : il dit la décomposition en cinq
        // mots, et c'est elle qu'on veut lire avant de voir le geste.
        assert.equal((it.schemas || [])[0], '', `${id} : le premier indice porte un dessin`);
    }
});

test('LES TROIS PORTES DU DÉTOUR EXISTENT, ET LEURS MARCHES AUSSI', () => {
    // RÉMY : « et qu'on en fasse des ludiques, voire des challenges vitesse
    // mais facultatif ». FACULTATIF veut dire : des exercices à PART, que
    // Rémy met dans une séance ou n'y met pas. L'apprentissage ne dépend pas
    // d'eux, et c'est pour cela que ce sont trois entrées et non trois
    // réglages d'une seule.
    const portes = exercices.filter(e => e.generatorId === 'calc.detour');
    assert.equal(portes.length, 3, `${portes.length} exercice(s) sur ce générateur`);
    assert.deepEqual(portes.map(e => e.activityId).sort(), ['buttons', 'moles', 'sprint']);

    const connus = new Set(ETAPES.map(e => e.id));
    for (const e of portes) {
        for (const m of (e.params && e.params.marches) || []) {
            assert.ok(connus.has(m), `${e.id} coche « ${m} », qui n'est pas une marche`);
        }
    }
    // LES DEUX PORTES RAPIDES NE DEMANDENT QUE DES CALCULS. « Par quoi je
    // passe ? » avec des propositions comme « 223 + 100 − 1 » ne se lit pas
    // sur une taupe qui traverse l'écran.
    for (const e of portes.filter(x => x.activityId !== 'buttons')) {
        assert.ok(e.params.marches.every(m => marche(m).calcul),
            `« ${e.title} » met en vitesse une marche qui demande de lire une ligne`);
    }
});

test('ON TROUVE L\'EXERCICE EN TAPANT LE NOMBRE QU\'IL TRAVAILLE', () => {
    // RÉMY : « le nom Détour Express n'est pas évident car si je tape 99 dans
    // la barre de recherche, j'aurai pu espérer tomber dessus ».
    //
    // MESURÉ AVANT DE CORRIGER : « 99 » rendait ZÉRO résultat, « 101 » et
    // « 19 » aussi. L'exercice existe précisément pour 76 + 99, et le nombre
    // 99 n'était écrit nulle part de cherchable. Seuls 9, 8 et 98 sortaient,
    // et par accident — ils figuraient dans une phrase d'exemple de la
    // consigne.
    //
    // UNE RECHERCHE MUETTE NE LÈVE AUCUNE ERREUR : elle rend une liste vide,
    // ce qui est EXACTEMENT ce que rend une recherche dont le résultat
    // n'existe pas. Rien ne distingue « il n'y a pas d'exercice sur 99 » de
    // « l'exercice sur 99 ne porte pas le mot 99 ». D'où cette garde, qui
    // tient les mots-clefs à la table du générateur : ajouter un voisin sans
    // ajouter son nombre la fait rougir.
    const portes = exercices.filter(e => e.generatorId === 'calc.detour');
    assert.equal(portes.length, 3, `${portes.length} porte(s) sur le détour`);
    for (const p of portes) {
        const mots = (p.motsClefs || []).map(String);
        for (const v of VOISINS) {
            assert.ok(mots.includes(String(v.n)),
                `« ${p.title} » travaille ${v.n} et ne le dit nulle part de cherchable : `
                + 'taper ce nombre dans la barre ne le trouvera pas.');
        }
    }
});
