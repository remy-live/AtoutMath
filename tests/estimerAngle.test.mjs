// « À VUE D'ŒIL » — ce qui doit rester vrai de l'estimation d'angle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « deviner la mesure d'un angle et plus il est proche,
// plus il a de points ». Puis : « le premier trait peut ne pas être horizontal
// (ca peut être un réglage) ».
//
// ── CE QU'ON GARDE, ET POURQUOI ────────────────────────────────────────────
//
//   · LE BARÈME, parce que c'est lui qui fait le jeu. S'il devient plat, il
//     n'y a plus de raison de viser juste ; s'il tombe à zéro trop tôt, un
//     élève qui a bien travaillé repart avec rien.
//   · LE DESSIN DU SECTEUR, parce qu'un drapeau d'arc mal posé dessine le
//     COMPLÉMENT de l'angle — un 60° s'afficherait à 300°, et l'exercice
//     entier mentirait sans qu'aucune erreur ne soit levée.
//   · LE RÉGLAGE DU PREMIER CÔTÉ, parce que c'est deux exercices différents :
//     un côté horizontal se compare au bord de la table, deux côtés obliques
//     ne se comparent à rien d'autre qu'à soi.
//   · ET QU'ON NE DIT JAMAIS « FAUX ». On n'est pas juste ou faux quand on
//     estime : on est plus ou moins près.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { estimerAngleGenerator, REPERES } from '../js/core/generators/estimerAngle.js';
import { cheminSecteur, motDeLEcart, pointsDe } from '../js/core/activities/estimerAngle.js';

/** Un générateur de hasard reproductible, assez riche pour ce générateur. */
function faireRng(graine = 7) {
    let s = graine;
    const suivant = () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
    return {
        int: (a, b) => a + Math.floor(suivant() * (b - a + 1)),
        bool: () => suivant() < 0.5,
        pick: (l) => l[Math.floor(suivant() * l.length)]
    };
}

const tirer = (params, n = 60, graine = 7) => {
    const rng = faireRng(graine);
    return Array.from({ length: n }, (_, i) =>
        estimerAngleGenerator.generate(params, { rng, index: i }));
};

test('LE BARÈME RÉCOMPENSE LA PROXIMITÉ, et s\'éteint doucement', () => {
    assert.equal(pointsDe(0), 100, 'tomber pile ne vaut pas cent points');
    assert.equal(pointsDe(1), 92);
    assert.equal(pointsDe(5), 60, 'à cinq degrés — la tolérance — il reste de quoi être fier');
    assert.equal(pointsDe(12), 4);
    assert.equal(pointsDe(13), 0, 'au-delà de douze degrés, on ne marque plus');
    assert.equal(pointsDe(200), 0, 'et jamais de points négatifs');
    // SYMÉTRIQUE : se tromper de sept degrés en plus ou en moins, c'est se
    // tromper de sept degrés.
    for (const e of [1, 4, 9, 15]) assert.equal(pointsDe(e), pointsDe(-e));
    // ET DÉCROISSANT, sans palier : un palier ferait qu'affiner ne sert à rien.
    for (let e = 0; e < 12; e++) {
        assert.ok(pointsDe(e) > pointsDe(e + 1), `le barème plafonne entre ${e} et ${e + 1}`);
    }
});

test('ON NE DIT JAMAIS « FAUX » — on dit plus ou moins près', () => {
    for (const e of [0, 1, 3, 5, 8, 14, 25, 90]) {
        const mot = motDeLEcart(e);
        assert.ok(mot.length > 5, `aucune phrase pour un écart de ${e}°`);
        assert.ok(!/faux|raté|erreur|mauvais/i.test(mot),
            `« ${mot} » juge au lieu de situer`);
    }
    assert.match(motDeLEcart(0), /PILE/, 'tomber pile ne se fête pas');
});

test('LE SECTEUR DESSINE L\'ANGLE, et non son complément', () => {
    // LES DEUX DRAPEAUX DE L'ARC SVG. `large-arc` dit si l'on prend le grand
    // côté, `sweep` dit dans quel sens. L'axe y de SVG descend, donc le sens
    // trigonométrique s'y dessine en « négatif » : avec un `sweep` figé à 1,
    // un angle de 60° s'afficherait à 300°.
    const d60 = cheminSecteur(0, 60, 100);
    const d300 = cheminSecteur(0, 300, 100);
    const lire = (d) => {
        const m = d.match(/A \d+ \d+ 0 (\d) (\d)/);
        return { grand: m[1], sens: m[2] };
    };
    assert.deepEqual(lire(d60), { grand: '0', sens: '0' },
        'un angle saillant prend le petit arc, dans le sens trigonométrique');
    assert.deepEqual(lire(d300), { grand: '1', sens: '0' },
        'un angle rentrant doit prendre le GRAND arc');
    // ET L'ÉCART PEUT ÊTRE NÉGATIF : on a parié trop bas. L'arc se parcourt
    // alors dans l'autre sens, sans quoi on hachurerait la part qu'on n'a PAS
    // ratée.
    assert.deepEqual(lire(cheminSecteur(120, -40, 100)), { grand: '0', sens: '1' });
    assert.deepEqual(lire(cheminSecteur(120, -220, 100)), { grand: '1', sens: '1' },
        'un grand écart négatif prend le grand arc ET l\'autre sens');
});

test('LE NIVEAU 1 TOURNE AUTOUR DES REPÈRES, et le 3 ouvre les rentrants', () => {
    const un = tirer({ niveau: '1' });
    for (const it of un) {
        const a = it.meta.angle;
        const proche = REPERES.some(r => Math.abs(a - r) <= 8);
        assert.ok(proche, `${a}° n'est à moins de huit degrés d'aucun repère`);
    }
    // ET ON N'Y VOIT JAMAIS DE RENTRANT : on apprend d'abord à se donner des
    // repères, et tous les repères sont saillants.
    assert.ok(un.every(it => it.meta.angle < 180));

    const deux = tirer({ niveau: '2' });
    assert.ok(deux.every(it => it.meta.angle >= 10 && it.meta.angle <= 170));
    // LE NIVEAU 2 NE SE CONTENTE PAS DES REPÈRES : sinon il ne serait que le
    // niveau 1 sous un autre nom.
    assert.ok(deux.some(it => !REPERES.some(r => Math.abs(it.meta.angle - r) <= 8)),
        'le niveau 2 ne tire que des angles proches des repères');

    const trois = tirer({ niveau: '3' });
    assert.ok(trois.some(it => it.meta.angle > 180),
        'le niveau 3 ne propose aucun angle rentrant');
    assert.ok(trois.every(it => it.meta.angle <= 350));
});

test('LE RÉGLAGE DU PREMIER CÔTÉ FAIT CE QU\'IL DIT', () => {
    // RÉMY : « le premier trait peut ne pas être horizontal (ca peut être un
    // réglage) ». Un côté horizontal se compare au bord de la table ; deux
    // côtés obliques ne se comparent à rien. Ce sont deux exercices.
    assert.ok(tirer({ niveau: '2', premierCote: 'horizontal' })
        .every(it => it.meta.depart === 0),
    '« toujours horizontal » laisse passer des côtés inclinés');

    const libres = tirer({ niveau: '1', premierCote: 'libre' });
    assert.ok(libres.some(it => it.meta.depart !== 0),
        '« toujours incliné » garde le côté horizontal');
    assert.ok(libres.every(it => it.meta.depart % 5 === 0),
        'les directions doivent tomber sur un multiple de cinq degrés');

    // ET « AUTO » EST HORIZONTAL AU PREMIER NIVEAU, libre ensuite.
    assert.ok(tirer({ niveau: '1', premierCote: 'auto' }).every(it => it.meta.depart === 0));
    assert.ok(tirer({ niveau: '2', premierCote: 'auto' }).some(it => it.meta.depart !== 0));
});

test('LA TOLÉRANCE VOYAGE AVEC LA QUESTION, et la réponse est l\'angle', () => {
    // C'est elle qui décide de la COMPÉTENCE, pas le barème : les points sont
    // continus, la maîtrise est franche. Si elle n'arrivait pas jusqu'à
    // l'activité, chaque pari serait jugé au degré près.
    const parDefaut = tirer({ niveau: '2' })[0];
    assert.equal(parDefaut.meta.tolerance, 5);
    assert.equal(parDefaut.answer, String(parDefaut.meta.angle));
    assert.equal(parDefaut.skillId, 'geo.angles.estimer');
    assert.equal(parDefaut.answerKind, 'angle');

    const serre = tirer({ niveau: '2', tolerance: 2 })[0];
    assert.equal(serre.meta.tolerance, 2);
});

test('les indices aident à CHERCHER, sans donner la réponse', () => {
    for (const it of tirer({ niveau: '2' }, 20)) {
        assert.ok(it.hints && it.hints.length >= 3, 'trois indices au moins');
        // AUCUN N'ÉCRIT LA RÉPONSE. Le dernier donne la dizaine, et c'est
        // voulu : il reste dix degrés à trouver, donc quarante points à perdre.
        const exacte = new RegExp(`\\b${it.meta.angle}°`);
        it.hints.slice(0, 2).forEach((h, i) =>
            assert.ok(!exacte.test(h), `l'indice ${i + 1} donne la réponse : « ${h} »`));
    }
});
