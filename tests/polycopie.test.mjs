// LES QUATRE ENCRES DU POLYCOPIÉ.
//
// Rémy, à la création : « je trouve que tu te sers peu de la couleur quand on
// demande le polycopié en couleur. Mets 4 modes : couleur intense (beaucoup de
// couleur mais tout en restant sobre et lisible), couleur, niveau de gris,
// noir et blanc. »
//
// Puis, au banc d'essai : « le mode couleur intense n'amèen pas grand chose ».
//
// Il avait raison, et la mesure dit pourquoi : sur les soixante-cinq fiches
// imprimables, plus de quatre cinquièmes de l'encre posée n'est pas de la
// couleur — c'est le noir du texte, le gris des grilles, le blanc cassé des
// fonds. L'ancienne règle multipliait l'écart au gris sans distinction : elle
// dépensait donc l'essentiel de son effet à bleuir le texte et les traits, et
// il n'en restait presque rien pour le cinquième réellement coloré.
//
// Ces tests tiennent les deux moitiés de la promesse : SOBRE (une encre ne
// bouge pas d'un iota) et BEAUCOUP DE COULEUR (une vraie teinte gagne
// nettement en saturation, sans changer de teinte).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { encre, MODES_POLYCOPIE } from '../js/ui/ficheRendu.js';

const chroma = (c) => Math.max(...c) - Math.min(...c);

/** La teinte, au sens de l'angle sur la roue — en degrés, ou null pour un gris. */
function teinte(c) {
    const [r, v, b] = c.map(x => x / 255);
    const haut = Math.max(r, v, b), bas = Math.min(r, v, b), d = haut - bas;
    if (d < 1e-6) return null;
    let h;
    if (haut === r) h = ((v - b) / d) % 6;
    else if (haut === v) h = (b - r) / d + 2;
    else h = (r - v) / d + 4;
    h *= 60;
    return (h + 360) % 360;
}

const ecartTeinte = (a, b) => {
    const ta = teinte(a), tb = teinte(b);
    if (ta === null || tb === null) return 0;
    return Math.min(Math.abs(ta - tb), 360 - Math.abs(ta - tb));
};

// L'encre réellement posée sur les fiches, relevée sur les soixante-cinq
// aperçus. Ce ne sont pas des exemples inventés : ce sont les valeurs les plus
// fréquentes du polycopié, et les cinq premières comptent à elles seules pour
// plus de la moitié de la surface encrée.
const ENCRES = [
    [26, 32, 44],    // le noir du texte
    [15, 23, 42],    // l'encre la plus sombre
    [30, 41, 59],
    [255, 255, 255], // le fond
    [154, 163, 178], // les grilles
    [176, 182, 197],
    [148, 163, 184],
    [238, 240, 250], // les fonds de case
    [223, 229, 238],
    [123, 137, 171]  // l'ardoise : beaucoup d'écart au gris, peu de saturation
];

const COULEURS = [
    [37, 99, 235],   // le bleu des repères
    [22, 101, 52],   // le vert des corrigés
    [199, 120, 0],   // l'ocre
    [253, 224, 160], // le jaune pâle d'un angle donné
    [200, 236, 218], // le vert d'eau d'un angle cherché
    [229, 62, 62],   // le rouge
    [76, 29, 149],   // le violet
    [49, 130, 206]
];

// --- Les quatre modes existent, et « couleur » ne fait rien ------------------

test('LES QUATRE MODES SONT LÀ, ET CHACUN NOMME SON MÉTIER', () => {
    // L'ORDRE S'EST RENVERSÉ, ET C'EST VOULU. Il allait du plus coloré au plus
    // sobre ; il va maintenant du plus courant au plus rare — la photocopieuse
    // du couloir d'abord, puisque c'est elle qui sort les feuilles et le mode
    // par défaut, l'affiche en dernier.
    assert.deepEqual(MODES_POLYCOPIE.map(m => m.id), ['nb', 'gris', 'couleur', 'intense']);
    // Et chaque libellé dit à quoi le mode sert, pas seulement ce qu'il fait :
    // « Couleur intense » ne disait rien de l'usage, et Rémy s'en est aperçu —
    // « comment est-ce que le mode couleur intense pourrait être pertinent ? »
    MODES_POLYCOPIE.forEach(m => assert.ok(m.label.length > 12, m.label));
    assert.match(MODES_POLYCOPIE.find(m => m.id === 'intense').label, /affiche/i);
    // Le défaut reste le noir et blanc : une feuille pensée pour lui marche
    // partout, et c'est le premier de la liste.
    assert.equal(MODES_POLYCOPIE[0].id, 'nb');
});

test('« couleur » rend la palette telle qu\'elle est écrite', () => {
    [...ENCRES, ...COULEURS].forEach(c =>
        assert.deepEqual(encre(c, 'couleur'), c, `rgb(${c})`));
});

test('« niveaux de gris » et « noir et blanc » rendent bien du gris', () => {
    for (const mode of ['gris', 'nb']) {
        [...ENCRES, ...COULEURS].forEach(c => {
            const g = encre(c, mode);
            assert.equal(g[0], g[1], `rgb(${c}) en ${mode}`);
            assert.equal(g[1], g[2], `rgb(${c}) en ${mode}`);
        });
    }
});

test('deux couleurs de même clarté ne tombent pas sur le même gris', () => {
    // Le jaune d'un angle donné et le vert de celui qu'on cherche ont la même
    // luminance : une conversion naïve les confondrait, et la figure
    // deviendrait illisible sur une photocopieuse.
    const jaune = encre([253, 224, 160], 'gris');
    const vert = encre([200, 236, 218], 'gris');
    assert.ok(Math.abs(jaune[0] - vert[0]) >= 8,
        `les deux tombent sur ${jaune[0]} et ${vert[0]}`);
});

// --- SOBRE : l'encre ne bouge pas -------------------------------------------

test('EN COULEUR INTENSE, L\'ENCRE NE BOUGE PAS D\'UN IOTA', () => {
    // C'est la moitié « sobre » de la demande, et c'est ce qui manquait :
    // teinter le texte et les grilles en bleu n'ajoute pas de la couleur, cela
    // salit la feuille.
    ENCRES.forEach(c => assert.deepEqual(encre(c, 'intense'), c,
        `rgb(${c}) devrait rester intact, on obtient rgb(${encre(c, 'intense')})`));
});

test('un gris traverse les quatre modes sans bouger', () => {
    // Un gris n'a pas de saturation : il ne s'écarte de rien, et le filtre ne
    // peut rien lui faire. (En dessous de 25, la conversion en gris a un
    // plancher — c'est ce qui empêche une couleur sombre et franche de tomber
    // au noir pur ; l'encre des fiches, à 26, passe juste au-dessus.)
    for (const g of [[25, 25, 25], [128, 128, 128], [255, 255, 255], [64, 64, 64]]) {
        MODES_POLYCOPIE.forEach(m => assert.deepEqual(encre(g, m.id), g, `${g} en ${m.id}`));
    }
});

// --- BEAUCOUP DE COULEUR : les vraies teintes s'affirment --------------------

test('EN COULEUR INTENSE, UNE VRAIE COULEUR GAGNE EN SATURATION', () => {
    let gains = [];
    COULEURS.forEach(c => {
        const t = encre(c, 'intense');
        const gain = chroma(t) - chroma(c);
        gains.push(gain);
        assert.ok(gain >= 0, `rgb(${c}) perd de la saturation : rgb(${t})`);
    });
    // En moyenne, un vrai gain — pas trois teintes sur huit qui bougent d'un
    // point pendant que le reste dort.
    const moyen = gains.reduce((a, b) => a + b, 0) / gains.length;
    assert.ok(moyen >= 25, `gain moyen de saturation : ${moyen.toFixed(1)} sur 255`);
});

test('la teinte est CONSERVÉE : un jaune reste jaune, un bleu reste bleu', () => {
    // C'est ce qui sépare « intense » de « criard ». Multiplier les écarts au
    // gris conserve exactement la teinte — mais seulement tant que les trois
    // canaux tiennent dans [0, 255] : dès qu'un canal butte, il s'écrase et la
    // couleur vire. Le facteur est donc borné par ce que les canaux acceptent.
    [...COULEURS, [255, 200, 40], [90, 200, 120], [40, 40, 200], [210, 120, 190]]
        .forEach(c => {
            const t = encre(c, 'intense');
            assert.ok(ecartTeinte(c, t) < 4,
                `rgb(${c}) → rgb(${t}) : la teinte a tourné de ${ecartTeinte(c, t).toFixed(1)}°`);
        });
});

test('on n\'éclaircit jamais une couleur pour la saturer', () => {
    // Sur du papier blanc, une couleur éclaircie se lit moins bien, pas mieux.
    // Une teinte déjà sombre et franche est donc rendue telle quelle : il n'y
    // a plus rien à en tirer sans la trahir.
    const LUM = [0.2126, 0.7152, 0.0722];
    const clarte = (c) => LUM[0] * c[0] + LUM[1] * c[1] + LUM[2] * c[2];
    [...COULEURS, [199, 120, 0], [180, 83, 9], [120, 53, 15]].forEach(c => {
        const t = encre(c, 'intense');
        assert.ok(clarte(t) <= clarte(c) + 0.6,
            `rgb(${c}) → rgb(${t}) : la couleur a été éclaircie`);
    });
});

test('un canal ne sort jamais de l\'intervalle des couleurs', () => {
    for (let r = 0; r < 256; r += 17) {
        for (let v = 0; v < 256; v += 17) {
            for (let b = 0; b < 256; b += 17) {
                MODES_POLYCOPIE.forEach(m => {
                    encre([r, v, b], m.id).forEach(x => {
                        assert.ok(Number.isInteger(x) && x >= 0 && x <= 255,
                            `rgb(${r},${v},${b}) en ${m.id} donne ${x}`);
                    });
                });
            }
        }
    }
});

test('une couleur déjà poussée à fond ne se dégrade pas', () => {
    // Repasser le filtre ne doit jamais faire perdre de la saturation : sinon
    // deux aperçus successifs ne montreraient pas la même feuille.
    COULEURS.forEach(c => {
        const un = encre(c, 'intense');
        const deux = encre(un, 'intense');
        assert.ok(chroma(deux) >= chroma(un) - 1,
            `rgb(${c}) → rgb(${un}) → rgb(${deux})`);
    });
});
