// L'ENQUÊTE SUR LE PAPIER — le plan, les indices, et ce qu'on ne donne pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : l'Enquête n'avait pas de version imprimée.
// C'est pourtant l'exercice de la série qui s'y prête le mieux — on relit les
// indices dix fois, on barre, on écrit un prénom au crayon et on l'efface.
//
// ── CE QUI SE TIENT ICI ───────────────────────────────────────────────────
//
// Les zones du plan : à l'écran ce sont des aplats de couleur et le survol dit
// leur nom ; sur le papier il faut un contour et un nom écrit. La façon dont
// cela peut rater est précise — une zone dont le contour n'entoure pas toutes
// ses cases, ou un nom posé dans une case qui n'appartient pas à la zone — et
// aucune des deux ne se voit sans imprimer.
//
// Et la chose à ne jamais perdre : la feuille de l'élève ne doit PAS porter la
// solution. Les deux feuilles sortent du même rendu avec un seul booléen de
// différence, et ce booléen est tout ce qui sépare un exercice d'un corrigé
// distribué par erreur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enqueteFicheGenerator, zonesDuPlan } from '../js/core/generators/enqueteFiche.js';
import { SCENES } from '../js/core/enquete.js';
import { makeRng } from '../js/core/ids.js';

test('CHAQUE SCÈNE SE DÉCOUPE EN ZONES QUI COUVRENT TOUT LE PLAN', () => {
    for (const scene of SCENES) {
        const zones = zonesDuPlan(scene);
        const prises = zones.flatMap(z => z.cases);
        assert.equal(new Set(prises).size, prises.length,
            `${scene.id} : une case appartient à deux lieux`);
        assert.equal(prises.length, scene.taille * scene.taille,
            `${scene.id} : ${prises.length} cases pour ${scene.taille ** 2}`);
        // ET CHAQUE ZONE A UN NOM. Une zone anonyme sur le papier est une zone
        // dont les indices parlent sans qu'on puisse la trouver.
        zones.forEach(z => {
            assert.ok(z.nom && z.nom.length > 1, `${scene.id} : lieu « ${z.lettre} » sans nom`);
            assert.ok(z.contour.length >= 4, `${scene.id} : ${z.nom} sans contour`);
        });
    }
});

test('LE NOM D\'UN LIEU EST POSÉ DANS UNE CASE QUI LUI APPARTIENT', () => {
    // L'ancre est la case la plus haute puis la plus à gauche. Prendre le
    // CENTRE d'une zone serait le réflexe — et il tombe hors de la zone dès
    // qu'elle a la forme d'un L, ce qu'elles ont presque toutes.
    for (const scene of SCENES) {
        zonesDuPlan(scene).forEach(z => {
            assert.ok(z.cases.includes(z.ancre),
                `${scene.id} : « ${z.nom} » est écrit dans une case qui n'est pas à lui`);
            assert.equal(z.ancre, Math.min(...z.cases));
        });
    }
});

test('LE CONTOUR D\'UNE ZONE L\'ENTOURE ENTIÈREMENT', () => {
    // Un contour ouvert laisserait deux lieux se confondre sur la feuille,
    // et l'élève lirait un plan qui n'est pas celui de l'énoncé.
    for (const scene of SCENES) {
        zonesDuPlan(scene).forEach(z => {
            const sommets = new Map();
            z.contour.forEach(s => {
                for (const p of [`${s.x1},${s.y1}`, `${s.x2},${s.y2}`]) {
                    sommets.set(p, (sommets.get(p) || 0) + 1);
                }
            });
            const impairs = [...sommets].filter(([, n]) => n % 2);
            assert.deepEqual(impairs, [],
                `${scene.id} : le contour de « ${z.nom} » est ouvert`);
        });
    }
});

test('LA FICHE PORTE LES INDICES, LA QUESTION ET LE PLAN', () => {
    // Une figure sans son énoncé n'est pas incomplète, elle est INSOLUBLE —
    // et elle occupe quand même sa place. C'est le défaut que Rémy avait
    // relevé sur les quatre fiches de géométrie.
    for (let niveau = 1; niveau <= SCENES.length; niveau++) {
        const q = enqueteFicheGenerator.generate({ niveau },
            { rng: makeRng(), index: 0, total: 1, papier: true });
        const m = q.meta;
        assert.ok(m.indices.length >= 2, `niveau ${niveau} : ${m.indices.length} indice(s)`);
        m.indices.forEach(i => assert.ok(i && i.length > 5, 'un indice vide'));
        assert.match(m.question, /\?$/, 'la question doit se terminer par un point d\'interrogation');
        assert.equal(m.zones.flatMap(z => z.cases).length, m.taille * m.taille);
        assert.equal(m.solution.length, m.noms.length);
    }
});

test('DEUX PERSONNES NE SONT JAMAIS SUR LA MÊME RANGÉE NI LA MÊME COLONNE', () => {
    // C'est la règle du jeu, et la fiche l'écrit en consigne : si le tirage ne
    // la respectait pas, l'élève appliquerait une règle fausse et n'y
    // arriverait jamais.
    for (let i = 0; i < 10; i++) {
        const q = enqueteFicheGenerator.generate({ niveau: 2 },
            { rng: makeRng(), index: i, total: 10, papier: true });
        const rs = q.meta.solution.map(s => s.r);
        const cs = q.meta.solution.map(s => s.c);
        assert.equal(new Set(rs).size, rs.length, 'deux personnes sur la même rangée');
        assert.equal(new Set(cs).size, cs.length, 'deux personnes sur la même colonne');
    }
});

test('LE LIEU ÉCRIT EST BIEN CELUI DE LA CASE', () => {
    // DEUX CHOSES QUE LE RENDU LIT SÉPARÉMENT, et qui doivent s'accorder : la
    // CASE (r, c), qui dit où poser le prénom sur le plan, et le LIEU, qui dit
    // qui est le coupable. Rien ne les relie dans le `meta` — ce sont deux
    // champs côte à côte — et une transposition de r et c laisserait les deux
    // moitiés cohérentes chacune de son côté : les rangées resteraient
    // distinctes, les colonnes aussi, le coupable serait toujours seul dans
    // son lieu. Seul le PLAN dirait le contraire.
    //
    // Vu par `epreuveTombe` : avec r et c échangés, les six autres épreuves
    // restaient vertes. Une garde qui ne relie pas deux champs ne garde que
    // chacun pris à part.
    for (let niveau = 1; niveau <= SCENES.length; niveau++) {
        for (let i = 0; i < 6; i++) {
            const q = enqueteFicheGenerator.generate({ niveau },
                { rng: makeRng(), index: i, total: 6, papier: true });
            const m = q.meta;
            const scene = SCENES[niveau - 1];
            m.solution.forEach(s => {
                const attendu = scene.lieux[scene.plan[s.r][s.c]];
                assert.equal(s.lieu, attendu,
                    `${s.nom} est en (${s.r}, ${s.c}) — ${attendu} — mais la fiche écrit ${s.lieu}`);
            });
            // Et la zone qui contient cette case porte bien ce nom-là.
            m.solution.forEach(s => {
                const zone = m.zones.find(z => z.cases.includes(s.r * m.taille + s.c));
                assert.ok(zone, `aucune zone ne contient la case de ${s.nom}`);
                assert.equal(zone.nom, s.lieu);
            });
        }
    }
});

test('LE COUPABLE EST BIEN LE SEUL DANS LE LIEU DE L\'OBJET', () => {
    // La question est « qui était seul là-bas ? ». Si deux personnes s'y
    // trouvaient, la question n'aurait pas de réponse — et l'élève chercherait
    // une faute qui n'est pas la sienne.
    for (let i = 0; i < 10; i++) {
        const q = enqueteFicheGenerator.generate({ niveau: 3 },
            { rng: makeRng(), index: i, total: 10, papier: true });
        const m = q.meta;
        const laBas = m.solution.filter(s => s.lieu === m.lieuDeLObjet);
        assert.equal(laBas.length, 1,
            `${laBas.length} personne(s) dans ${m.lieuDeLObjet}`);
        assert.equal(laBas[0].nom, m.coupable);
    }
});
