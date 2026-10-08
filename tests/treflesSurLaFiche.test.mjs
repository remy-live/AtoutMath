// LE CHAMP DE TRÈFLES SUR LE PAPIER — une seule description de la feuille.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY a apporté ce jeu avec la page d'une REVUE : « Encoure les trèfles à
// 4 feuilles ». L'écran l'a imité ; la feuille le rend à sa forme d'origine.
//
// ── CE QUE CES ÉPREUVES TIENNENT, ET POURQUOI CELLES-LÀ ───────────────────
//
// Le navigateur lit un chemin SVG écrit en TEXTE ; jsPDF trace des cubiques à
// partir de NOMBRES. Deux descriptions de la même feuille, et ce dépôt sait
// ce que ça coûte : trois allers-retours avec Rémy sur le radical, parce que
// deux dessins du même objet divergent au premier réglage.
//
// La première épreuve est donc celle-ci : le `d` de l'écran est CONSTRUIT à
// partir des mêmes points que le papier. Si quelqu'un retouchait un des deux,
// elle tomberait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    PALIERS, RAYON, cheminsDunTrefle, pedonculeDunTrefle,
    courbesDuCoeur, courbesDuPedoncule
} from '../js/core/champDeTrefles.js';
import { treflesFicheGenerator } from '../js/core/generators/treflesFiche.js';
import { makeRng } from '../js/core/ids.js';

/** Les nombres d'un chemin SVG, dans l'ordre. */
const nombres = (d) => (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

test('L\'ÉCRAN ET LE PAPIER TRACENT LA MÊME FEUILLE', () => {
    // Le `d` du SVG doit être exactement la mise en texte des points que le
    // papier trace. Pas « à peu près la même forme » : les MÊMES nombres.
    //
    // CETTE ÉPREUVE NE GARDE PAS LA FORME DE LA FEUILLE, et c'est voulu : elle
    // garde qu'il n'y en ait qu'UNE description. Retoucher un point de contrôle
    // la laisse verte — les deux côtés bougent ensemble, ce qui est exactement
    // ce qu'on veut. Elle tombe quand `cheminsDunTrefle` se remet à écrire son
    // chemin à la main, et c'est ainsi qu'on l'a vue tomber.
    const c = courbesDuCoeur();
    const attendus = [...c.depart, ...c.courbes.flat(2)];
    assert.deepEqual(nombres(cheminsDunTrefle(3)[0].d), attendus,
        'le chemin de l\'écran s\'est écarté des courbes du papier');
});

test('L\'ÉCRAN ET LE PAPIER TRACENT LE MÊME PÉDONCULE', () => {
    const p = courbesDuPedoncule();
    assert.deepEqual(nombres(pedonculeDunTrefle()), [...p.depart, ...p.courbes.flat(2)]);
});

test('LE PÉDONCULE CUBIQUE PASSE PAR LES MÊMES POINTS QUE LA QUADRATIQUE', () => {
    // La conversion quadratique → cubique est EXACTE, et c'est ce qui autorise
    // à l'écrire une fois : les deux courbes se superposent, elles ne se
    // ressemblent pas. On vérifie en quelques points de paramètre.
    const P0 = [0, 0], Q = [RAYON * 0.10, RAYON * 0.55], P2 = [-RAYON * 0.06, RAYON * 1.05];
    const quad = (t) => [0, 1].map(i =>
        (1 - t) ** 2 * P0[i] + 2 * (1 - t) * t * Q[i] + t ** 2 * P2[i]);
    const { depart, courbes } = courbesDuPedoncule();
    const [C1, C2, F] = courbes[0];
    const cube = (t) => [0, 1].map(i => {
        const p = [depart, C1, C2, F].map(q => q[i]);
        return (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1]
            + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3];
    });
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const a = quad(t), b = cube(t);
        assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9,
            `à t = ${t} : ${a} contre ${b}`);
    }
});

test('LA FICHE SÈME LE NOMBRE DE TRÈFLES DU PALIER', () => {
    for (const [palier, P] of Object.entries(PALIERS)) {
        const q = treflesFicheGenerator.generate({ palier },
            { rng: makeRng(), index: 0, total: 1, papier: true });
        const m = q.meta;
        assert.equal(m.trefles.length, P.combien, `${palier} : ${m.trefles.length} trèfles`);
        assert.equal(m.trefles.filter(t => t.feuilles === 4).length, P.aTrouver,
            `${palier} : il faut ${P.aTrouver} trèfles à quatre feuilles`);
        assert.equal(m.aTrouver, P.aTrouver);
        // LA ROTATION EST LA DIFFICULTÉ, pas le nombre — c'est écrit dans le
        // catalogue. Un palier déclaré sans rotation doit vraiment n'en avoir
        // aucune : sinon le palier le plus facile ne l'est pas.
        const tournes = m.trefles.filter(t => t.angle !== 0).length;
        if (!P.rotation) assert.equal(tournes, 0, `${palier} ne doit tourner aucun trèfle`);
        else assert.ok(tournes > P.combien * 0.9, `${palier} : ${tournes} trèfles tournés`);
    }
});

test('LES TRÈFLES SORTENT DANS L\'ORDRE DE DESSIN, QUI DÉCIDE QUI RECOUVRE QUI', () => {
    // Semés dans l'ordre de la grille, les trèfles se recouvriraient toujours
    // de haut en bas — l'image aurait un sens de lecture que la page de la
    // revue n'a pas, et le palier « champ » perdrait sa difficulté.
    //
    // ON COMPARE AU RANG DE SEMIS, PAS AUX ORDONNÉES. Première version : elle
    // vérifiait que les `y` ne montaient pas régulièrement — et le semis les
    // fait déjà sauter d'un demi-pas, donc elle restait VERTE quand on
    // remplaçait l'ordre de dessin par celui du semis. `epreuveTombe` l'a dit.
    // Le rang de semis, lui, est strictement croissant dans un cas et mêlé
    // dans l'autre : il n'y a pas d'ambiguïté.
    const q = treflesFicheGenerator.generate({ palier: 'champ' },
        { rng: makeRng(), index: 0, total: 1, papier: true });
    const rangs = q.meta.trefles.map(t => t.i);
    assert.equal(new Set(rangs).size, rangs.length, 'un trèfle sort deux fois');
    const trie = rangs.every((v, i) => i === 0 || v > rangs[i - 1]);
    assert.ok(!trie, 'les trèfles sortent dans l\'ordre du semis, pas du dessin');
});

test('LE CHAMP TIENT DANS SA BOÎTE', () => {
    // Un trèfle à cheval sur le bord sort de la feuille, et il est alors
    // introuvable — ce qui fait un exercice sans solution.
    for (const palier of Object.keys(PALIERS)) {
        const q = treflesFicheGenerator.generate({ palier },
            { rng: makeRng(), index: 0, total: 1, papier: true });
        const m = q.meta;
        m.trefles.forEach(t => {
            assert.ok(t.x >= 0 && t.x <= m.largeur, `${palier} : x = ${t.x} hors de ${m.largeur}`);
            assert.ok(t.y >= 0 && t.y <= m.hauteur, `${palier} : y = ${t.y} hors de ${m.hauteur}`);
        });
    }
});
