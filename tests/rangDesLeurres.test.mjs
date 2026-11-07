// QUEL LEURRE RESTE QUAND IL N'EN RESTE QU'UN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DÉFAUT, ET IL ÉTAIT INVISIBLE. L'échelle d'aide ouvre une séance à DEUX
// propositions pour mettre en confiance, puis monte à quatre. `reduireChoix`
// décide alors lequel des leurres survit, et il le décide sur `rang` — le rang
// d'ORIGINE, celui que le générateur leur a donné avant le mélange, parce que
// les distracteurs sont écrits du plus instructif au plus anodin.
//
// Ce rang, c'est `finalizeChoices` qui le pose. Les trois chapitres de Seconde
// — factorisation, calcul de fractions, racines — mélangeaient leurs
// propositions à la main et ne l'appelaient jamais. `rang` restait donc
// indéfini ; `reduireChoix` retombe sur `?? 99` pour tous, le tri devient
// neutre, et le leurre conservé est celui que le mélange avait mis devant.
// C'est-à-dire un leurre au hasard.
//
// RIEN NE POUVAIT LE SIGNALER : le QCM était bien formé, les quatre
// propositions étaient là, chacune avec son explication. Seul l'ORDRE mentait,
// et l'ordre ne se voit pas sur une capture d'écran.
//
// Trouvé en cherchant pourquoi le leurre inachevé du barreau 6 de la
// factorisation tombait encore en première question après avoir été rangé en
// fin de liste — il n'y était jamais vraiment allé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { reduireChoix } from '../js/core/aide.js';
import { racinesGenerator } from '../js/core/generators/racines.js';
import { factorisationGenerator } from '../js/core/generators/factorisation.js';
import { calculFractionsGenerator } from '../js/core/generators/calculFractions.js';

const CHAPITRES = [
    { nom: 'racines', gen: racinesGenerator, params: { barreau: 'toutes' } },
    { nom: 'factorisation', gen: factorisationGenerator, params: { barreau: 'toutes' } },
    { nom: 'calcul de fractions', gen: calculFractionsGenerator, params: { barreau: 'toutes' } }
];

// LE TEST DE LA CAUSE, et non de ses symptômes. Si `rang` est posé, tout le
// reste suit ; s'il ne l'est pas, aucune précaution prise dans un générateur
// ne tient, puisque l'ordre qu'il choisit est effacé ensuite.
test('les trois chapitres de Seconde posent bien le rang de leurs leurres', () => {
    for (const { nom, gen, params } of CHAPITRES) {
        for (let i = 0; i < 120; i++) {
            // L'INDEX FAIT MONTER LES CHAPITRES À PROGRESSION. La
            // factorisation coche maintenant ses barreaux au lieu de les
            // tirer au sort (voir core/progression.js) : sans index, les cent
            // vingt tirages restaient sur le barreau 1, et ce test ne
            // mesurait plus qu'un septième de ce qu'il croyait mesurer.
            const item = gen.generate(params,
                { rng: makeRng(`${nom}-rang-${i}`), index: i, total: 120 });
            const leurres = item.choices.filter(c => !c.correct);
            assert.ok(leurres.length >= 1, `${nom} : aucun leurre`);
            for (const l of leurres) {
                assert.equal(typeof l.rang, 'number',
                    `${nom} : un leurre sans rang — le générateur n'est pas passé par `
                    + `finalizeChoices, et reduireChoix choisira au hasard.`);
            }
            // Les rangs sont distincts : deux leurres au même rang, et le tri
            // redevient arbitraire entre eux.
            const rangs = leurres.map(l => l.rang);
            assert.equal(new Set(rangs).size, rangs.length,
                `${nom} : deux leurres partagent un rang`);
        }
    }
});

// ── LES DEUX LEURRES « JUSTES MAIS PAS FINIS » ──────────────────────────────
//
// Ils se ressemblent et posent la même exigence, celle que Rémy a tranchée
// d'un mot — « Évidemment programme de seconde » :
//
//   · (x² − 9)(4x + 1) contre (x − 3)(x + 3)(4x + 1) : un produit ÉGAL à la
//     réponse, mais dont un facteur se factorise encore ;
//   · 3√8 contre 6√2 : une écriture exacte, mais qui garde un carré dedans.
//
// Dans les deux cas l'élève n'a pas écrit quelque chose de FAUX, il a écrit
// quelque chose d'INACHEVÉ — et en Seconde c'est faux. Le leurre reste donc.
// Mais c'est la discrimination la plus fine de chaque chapitre, et la poser en
// première question, quand l'échelle n'offre que deux cases, c'est la demander
// au moment où l'élève a le moins d'appuis.

function mesurer(gen, params, estInacheve, n = 1200) {
    let seul = 0, aQuatre = 0, aTrois = 0;
    for (let i = 0; i < n; i++) {
        const item = gen.generate(params, { rng: makeRng(`inacheve-${i}`) });
        if (item.choices.some(estInacheve)) aQuatre++;
        if (reduireChoix(item.choices, 3).some(estInacheve)) aTrois++;
        const survivant = reduireChoix(item.choices, 2).find(c => !c.correct);
        if (survivant && estInacheve(survivant)) seul++;
    }
    return { seul, aQuatre, aTrois };
}

test('le produit incomplet du barreau 6 : jamais seul, mais toujours là', () => {
    const m = mesurer(factorisationGenerator, { barreau: '6' },
        (c) => /se factorise\s+encore/.test(c.why || ''));
    assert.equal(m.seul, 0,
        `${m.seul} questions où (x² − n²)(…) est le SEUL leurre face à la réponse.`);
    // ET LE CONTRÔLE QUI COMPTE AUTANT : repousser un leurre et le supprimer
    // font le même chiffre au-dessus. Le premier correctif le renvoyait en fin
    // de liste ; comme on ne retient que trois leurres sur quatre, il tombait
    // toujours — « seul : 0 », et la leçon de Rémy avait disparu avec le
    // défaut. C'est cette ligne-ci qui l'a dit.
    assert.ok(m.aQuatre > 400,
        `le leurre inachevé n'est proposé que ${m.aQuatre} fois sur 1200 : `
        + `il a été écarté au lieu d'être rangé.`);
    assert.equal(m.aTrois, 0, 'il apparaît avant le QCM complet');
});

test('la forme inachevée du barreau 4 des racines : jamais seule, mais toujours là', () => {
    const m = mesurer(racinesGenerator, { barreau: '4' },
        (c) => /pas FINI/.test(c.why || ''));
    assert.equal(m.seul, 0,
        `${m.seul} questions où 3√8 est le SEUL leurre face à 6√2.`);
    assert.ok(m.aQuatre > 1100,
        `la forme inachevée n'est proposée que ${m.aQuatre} fois sur 1200.`);
    assert.equal(m.aTrois, 0, 'elle apparaît avant le QCM complet');
});

// ── LA RÈGLE VAUT AUSSI POUR CELUI QUI LA POSE ──────────────────────────────
//
// Si un produit incomplet est faux, alors la BONNE réponse doit, elle, aller
// jusqu'au bout partout — sans quoi le générateur marquerait faux l'élève qui
// a fini le travail, c'est-à-dire exactement ce qu'il reproche au leurre.
test('aucune réponse de factorisation ne laisse de différence de carrés', () => {
    const estCarre = (s) => {
        const t = s.trim().replace(/^\d+/, '');
        if (/^x²$/.test(t)) return true;
        const n = Number(s.trim());
        return Number.isInteger(n) && n > 0 && Number.isInteger(Math.sqrt(n));
    };
    let vues = 0;
    for (let rang = 1; rang <= 7; rang++) {
        for (let i = 0; i < 300; i++) {
            const item = factorisationGenerator.generate({ barreau: String(rang) },
                { rng: makeRng(`fini-${rang}-${i}`) });
            const rep = item.choices.find(c => c.correct).label;
            vues++;
            for (const m of rep.matchAll(/\(([^()]*)\)/g)) {
                const parts = m[1].split('−');
                assert.ok(!(parts.length === 2 && estCarre(parts[0]) && estCarre(parts[1])),
                    `[barreau ${rang}] la réponse ${rep} garde une différence de carrés : `
                    + `(${m[1]}) se factorise encore.`);
            }
        }
    }
    assert.ok(vues >= 2000, `seulement ${vues} réponses vérifiées`);
});
