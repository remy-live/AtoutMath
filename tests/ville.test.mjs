import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CAPS, tourner, sensEntre, devant, rue, sortiesRelatives,
    creerVille, degre, connexe, tirerItineraire, decrireItineraire, jugerCoup, cle, aLieu
} from '../js/core/ville.js';

// Un hasard reproductible : les tests portent sur des propriétés, mais un
// échec doit pouvoir se rejouer à l'identique.
function rngFixe(graine = 7) {
    let s = graine >>> 0;
    const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)) };
}

test('tourner à gauche puis à droite ramène au cap de départ', () => {
    CAPS.forEach(c => {
        assert.equal(tourner(tourner(c, 'gauche'), 'droite'), c);
        assert.equal(tourner(tourner(c, 'droite'), 'gauche'), c);
        assert.equal(tourner(tourner(c, 'demi-tour'), 'demi-tour'), c);
    });
});

test('quatre virages du même côté font le tour', () => {
    CAPS.forEach(c => {
        let d = c;
        for (let i = 0; i < 4; i++) d = tourner(d, 'gauche');
        assert.equal(d, c);
    });
});

test('la gauche de la voiture change de côté de l\'écran selon son cap', () => {
    // C'est TOUT l'exercice : quand la voiture monte, sa gauche est à l'ouest ;
    // quand elle descend, sa gauche est à l'est — à droite sur le plan.
    assert.equal(tourner('N', 'gauche'), 'O');
    assert.equal(tourner('S', 'gauche'), 'E');
    assert.equal(tourner('E', 'gauche'), 'N');
    assert.equal(tourner('O', 'gauche'), 'S');
});

test('sensEntre est l\'inverse de tourner', () => {
    CAPS.forEach(a => {
        ['gauche', 'droite', 'demi-tour'].forEach(s => {
            assert.equal(sensEntre(a, tourner(a, s)), s);
        });
        assert.equal(sensEntre(a, a), 'tout-droit');
    });
});

test('une ville est d\'un seul tenant et sans cul-de-sac', () => {
    for (let g = 1; g <= 12; g++) {
        const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
        assert.ok(connexe(v), `ville ${g} coupée en morceaux`);
        for (let y = 0; y < v.rows; y++) {
            for (let x = 0; x < v.cols; x++) {
                assert.ok(degre(v, { x, y }) >= 2, `cul-de-sac en ${x},${y} (graine ${g})`);
            }
        }
    }
});

test('une ville a de vrais trous : on ne peut pas tourner partout', () => {
    // Sans trous, « la deuxième à gauche » ne voudrait rien dire.
    const v = creerVille({ cols: 5, rows: 5, trous: 0.22, rng: rngFixe(3) });
    const complet = 2 * 5 * 4;   // arêtes d'une trame 5×5 pleine
    const restantes = v.rues.size;
    assert.ok(restantes < complet, 'aucun tronçon retiré');
    assert.ok(restantes > complet * 0.6, 'ville trop trouée pour être une ville');
});

test('un itinéraire ne repasse jamais deux fois au même carrefour', () => {
    for (let g = 1; g <= 15; g++) {
        const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
        const it = tirerItineraire(v, { virages: 3, rng: rngFixe(g * 31) });
        assert.ok(it, `aucun itinéraire trouvé (graine ${g})`);
        const vus = new Set(it.noeuds.map(n => cle(n.x, n.y)));
        assert.equal(vus.size, it.noeuds.length, `passage en double (graine ${g})`);
    }
});

test('chaque pas d\'un itinéraire emprunte une rue qui existe', () => {
    for (let g = 1; g <= 15; g++) {
        const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
        const it = tirerItineraire(v, { virages: 3, rng: rngFixe(g * 17) });
        for (let i = 0; i + 1 < it.noeuds.length; i++) {
            assert.ok(rue(v, it.noeuds[i], it.noeuds[i + 1]),
                `pas de rue entre les étapes ${i} et ${i + 1} (graine ${g})`);
        }
    }
});

test('un itinéraire ne fait jamais demi-tour', () => {
    for (let g = 1; g <= 15; g++) {
        const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
        const it = tirerItineraire(v, { virages: 3, rng: rngFixe(g * 53) });
        let cap = it.capDepart;
        for (let i = 0; i + 1 < it.noeuds.length; i++) {
            const suivant = it.noeuds[i + 1];
            const capVers = CAPS.find(c => {
                const d = devant(it.noeuds[i].x, it.noeuds[i].y, c);
                return d.x === suivant.x && d.y === suivant.y;
            });
            assert.notEqual(sensEntre(cap, capVers), 'demi-tour', `demi-tour à l'étape ${i} (graine ${g})`);
            cap = capVers;
        }
    }
});

test('le nombre de virages demandé est le nombre de virages obtenu', () => {
    for (const virages of [1, 2, 3, 4]) {
        for (let g = 1; g <= 8; g++) {
            const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
            const it = tirerItineraire(v, { virages, rng: rngFixe(g * 7 + virages) });
            assert.ok(it, `pas d'itinéraire à ${virages} virages (graine ${g})`);
            const etapes = decrireItineraire(v, it);
            assert.equal(etapes.filter(e => e.type === 'tourner').length, virages);
        }
    }
});

test('le premier pas est TOUJOURS tout droit', () => {
    // On ne demande pas de tourner à quelqu'un qui n'est pas encore parti :
    // la voiture s'engage d'abord, on compte les rues, puis on tourne.
    for (const virages of [1, 2, 3, 4]) {
        for (let g = 1; g <= 10; g++) {
            const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
            const it = tirerItineraire(v, { virages, rng: rngFixe(g * 13 + virages) });
            assert.ok(it, `pas d'itinéraire (${virages} virages, graine ${g})`);
            const a = it.noeuds[0], b = it.noeuds[1];
            const capVers = CAPS.find(c => {
                const d = devant(a.x, a.y, c);
                return d.x === b.x && d.y === b.y;
            });
            assert.equal(sensEntre(it.capDepart, capVers), 'tout-droit',
                `le trajet commence par un virage (${virages} virages, graine ${g})`);
        }
    }
});

test('la feuille de route commence par « Avance »', () => {
    const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(5) });
    const it = tirerItineraire(v, { virages: 3, rng: rngFixe(99) });
    const etapes = decrireItineraire(v, it);
    assert.equal(etapes[0].type, 'depart');
    assert.equal(etapes[0].texte, 'Avance');
    assert.equal(etapes.filter(e => e.type === 'depart').length, 1);
    // Et la consigne suivante est bien un virage : « avance PUIS la première
    // à droite ».
    assert.equal(etapes[1].type, 'tourner');
});

test('la feuille de route se termine toujours par une arrivée, et une seule', () => {
    const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(5) });
    const it = tirerItineraire(v, { virages: 3, rng: rngFixe(99) });
    const etapes = decrireItineraire(v, it);
    assert.equal(etapes.filter(e => e.type === 'arrivee').length, 1);
    assert.equal(etapes[etapes.length - 1].type, 'arrivee');
});

test('« la deuxième à gauche » compte les rues, pas les carrefours', () => {
    // Ville sur mesure : depuis (0,0) cap est, il y a une rue vers le sud en
    // (1,0) — première occasion à droite —, aucune en (2,0), et on tourne en
    // (3,0). C'est donc la DEUXIÈME à droite, au quatrième carrefour.
    const v = { cols: 4, rows: 2, rues: new Set(), lieux: [] };
    const ajoute = (a, b) => v.rues.add(
        (a.x < b.x || (a.x === b.x && a.y < b.y))
            ? `${a.x},${a.y}|${b.x},${b.y}` : `${b.x},${b.y}|${a.x},${a.y}`);
    [[0, 0], [1, 0], [2, 0]].forEach(([x, y]) => ajoute({ x, y }, { x: x + 1, y }));
    ajoute({ x: 1, y: 0 }, { x: 1, y: 1 });      // occasion sautée
    ajoute({ x: 3, y: 0 }, { x: 3, y: 1 });      // le virage pris

    const it = { noeuds: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }], capDepart: 'E' };
    const etapes = decrireItineraire(v, it);
    const virage = etapes.find(e => e.type === 'tourner');
    assert.equal(virage.sens, 'droite');
    assert.equal(virage.rang, 2, 'deux occasions à droite avant de tourner');
    assert.match(virage.texte, /deuxième à droite/);
});

test('la rue du carrefour de départ ne compte pas', () => {
    // Le cas signalé à l'usage : la voiture démarre au coin d'une rue qui part
    // à gauche. On l'a déjà dépassée avant même d'avoir roulé — un passager
    // dirait « la première à gauche » pour le carrefour SUIVANT, pas « la
    // deuxième ». La règle est celle d'après un virage : on compte les rues
    // qu'on rencontre, jamais celle où l'on est.
    const v = { cols: 3, rows: 2, rues: new Set(), lieux: [] };
    const ajoute = (a, b) => v.rues.add(
        (a.x < b.x || (a.x === b.x && a.y < b.y))
            ? `${a.x},${a.y}|${b.x},${b.y}` : `${b.x},${b.y}|${a.x},${a.y}`);
    [[0, 1], [1, 1]].forEach(([x, y]) => ajoute({ x, y }, { x: x + 1, y }));
    ajoute({ x: 0, y: 1 }, { x: 0, y: 0 });      // la rue DU COIN DE DÉPART
    ajoute({ x: 1, y: 1 }, { x: 1, y: 0 });      // le virage pris

    // Départ en (0,1) cap est, tout droit jusqu'en (1,1), puis à gauche (nord).
    const it = { noeuds: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }], capDepart: 'E' };
    const virage = decrireItineraire(v, it).find(e => e.type === 'tourner');
    assert.equal(virage.sens, 'gauche');
    assert.equal(virage.rang, 1, 'le coin du départ a été compté à tort');
    assert.match(virage.texte, /première à gauche/);
});

test('les itinéraires ne sont pas tous « la première »', () => {
    // Un générateur qui tourne à la première occasion venue produit des
    // feuilles de route où il n'y a rien à compter — donc plus d'exercice.
    const rng = rngFixe(2024);
    const rangs = new Map();
    for (let g = 0; g < 200; g++) {
        const v = creerVille({ cols: 5, rows: 5, trous: 0.22, rng });
        const it = tirerItineraire(v, { virages: 3, rng });
        assert.ok(it, `pas d'itinéraire au tirage ${g}`);
        for (const e of decrireItineraire(v, it)) {
            if (e.type === 'tourner') rangs.set(e.rang, (rangs.get(e.rang) || 0) + 1);
        }
    }
    const total = [...rangs.values()].reduce((a, b) => a + b, 0);
    const auDela = total - (rangs.get(1) || 0);
    assert.ok(auDela / total > 0.1,
        `seulement ${Math.round(100 * auDela / total)} % de virages au-delà de la première`);
    assert.ok(rangs.has(2), 'aucune « deuxième » en 200 trajets');
});

test('suivre la feuille de route à la lettre mène à l\'arrivée', () => {
    // La vérification qui compte : on rejoue l'itinéraire coup par coup à
    // travers le juge, et on doit arriver au bout sans une seule erreur.
    for (let g = 1; g <= 15; g++) {
        const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(g) });
        const it = tirerItineraire(v, { virages: 3, rng: rngFixe(g * 11) });
        const etat = { noeuds: it.noeuds, index: 0, cap: it.capDepart };
        while (etat.index + 1 < it.noeuds.length) {
            const attendu = it.noeuds[etat.index + 1];
            const sorties = sortiesRelatives(v, it.noeuds[etat.index].x, it.noeuds[etat.index].y, etat.cap);
            const sens = Object.keys(sorties).find(s =>
                sorties[s].x === attendu.x && sorties[s].y === attendu.y);
            assert.ok(sens, `aucun sens ne mène à l'étape ${etat.index + 1} (graine ${g})`);
            const r = jugerCoup(v, etat, sens);
            assert.ok(r.ok, `coup refusé à l'étape ${etat.index} (graine ${g}) : ${r.message}`);
            etat.cap = r.cap; etat.index++;
        }
        assert.equal(etat.index, it.noeuds.length - 1);
    }
});

test('confondre sa gauche et celle de l\'écran est nommé comme tel', () => {
    // Voiture qui DESCEND : sa gauche est à l'est. Prendre « droite » quand il
    // fallait « gauche » doit être reconnu comme l'erreur de miroir.
    const v = { cols: 3, rows: 3, rues: new Set(), lieux: [] };
    const ajoute = (a, b) => v.rues.add(
        (a.x < b.x || (a.x === b.x && a.y < b.y))
            ? `${a.x},${a.y}|${b.x},${b.y}` : `${b.x},${b.y}|${a.x},${a.y}`);
    ajoute({ x: 1, y: 0 }, { x: 1, y: 1 });
    ajoute({ x: 1, y: 1 }, { x: 2, y: 1 });   // à la gauche de la voiture (cap S)
    ajoute({ x: 0, y: 1 }, { x: 1, y: 1 });   // à sa droite

    const etat = { noeuds: [{ x: 1, y: 1 }, { x: 2, y: 1 }], index: 0, cap: 'S' };
    const bon = jugerCoup(v, etat, 'gauche');
    assert.ok(bon.ok, 'la gauche de la voiture qui descend mène bien à l\'est');

    const faux = jugerCoup(v, etat, 'droite');
    assert.equal(faux.ok, false);
    assert.equal(faux.faute, 'miroir');
    assert.match(faux.message, /place du conducteur/);
});

test('tourner là où il n\'y a pas de rue est refusé sans ambiguïté', () => {
    const v = creerVille({ cols: 5, rows: 5, rng: rngFixe(2) });
    const it = tirerItineraire(v, { virages: 2, rng: rngFixe(21) });
    const etat = { noeuds: it.noeuds, index: 0, cap: it.capDepart };
    const sorties = sortiesRelatives(v, it.noeuds[0].x, it.noeuds[0].y, etat.cap);
    const absent = ['gauche', 'tout-droit', 'droite'].find(s => !sorties[s]);
    if (absent) {
        const r = jugerCoup(v, etat, absent);
        assert.equal(r.ok, false);
        assert.equal(r.faute, 'pas-de-rue');
    }
});

test('« à » se contracte comme en français', () => {
    // « Va jusqu'à le parc » s'affichait tel quel à l'écran.
    assert.equal(aLieu('le parc'), 'au parc');
    assert.equal(aLieu('le stade'), 'au stade');
    assert.equal(aLieu('la gare'), 'à la gare');
    assert.equal(aLieu('l\'école'), 'à l\'école');
    assert.equal(aLieu('les halles'), 'aux halles');
});


/**
 * LE TEST QUI COMPTE : un élève qui obéit AUX MOTS arrive-t-il ?
 *
 * Le contrôle précédent rejouait l'itinéraire nœud par nœud à travers le juge —
 * il vérifiait que le CHEMIN est jouable, jamais que la feuille de route le
 * décrit. Signalé deux fois à l'usage, et à chaque fois à raison.
 *
 * Tout tient dans la façon de compter, et elle n'est pas symétrique :
 *
 *   — AU DÉPART, la voiture est GARÉE sur un carrefour. La rue qui part de son
 *     stationnement, elle ne l'a pas croisée : elle ne compte pas.
 *   — APRÈS UN VIRAGE, la voiture ARRIVE sur le carrefour suivant. Celui-là,
 *     elle vient de le rencontrer : il compte — et c'est même celui que l'élève,
 *     qui voit la voiture posée dessus, appelle « la première ».
 *
 * Compter le premier donnait un rang de trop ; sauter le second en donnait un
 * de moins et renvoyait une rue trop loin. Ce test refait le trajet en
 * n'obéissant qu'aux mots, et n'accepte que l'arrivée.
 */
function suivreLesMots(ville, it, etapes) {
    let p = { ...it.noeuds[0] }, cap = it.capDepart, gare = true;
    const avancer = () => {
        const s = sortiesRelatives(ville, p.x, p.y, cap);
        if (!s['tout-droit']) return false;
        p = { x: s['tout-droit'].x, y: s['tout-droit'].y }; cap = s['tout-droit'].cap;
        return true;
    };
    for (const e of etapes) {
        if (e.type === 'depart') continue;
        if (e.type === 'arrivee') {
            for (let k = 0; k < (e.rues || 0); k++) {
                if (!avancer()) return { ok: false, quoi: 'bloqué avant l\'arrivée' };
            }
            continue;
        }
        let vus = 0;
        // Le carrefour sous les roues compte — sauf au départ, voiture garée.
        if (!gare) {
            const s0 = sortiesRelatives(ville, p.x, p.y, cap);
            if (s0[e.sens] && ++vus === e.rang) {
                p = { x: s0[e.sens].x, y: s0[e.sens].y }; cap = s0[e.sens].cap;
                continue;
            }
        }
        gare = false;
        for (let garde = 0; ; garde++) {
            if (garde > 40) return { ok: false, quoi: 'consigne sans fin' };
            if (!avancer()) return { ok: false, quoi: `impossible d'avancer (${vus} sur ${e.rang} à ${e.sens})` };
            const s = sortiesRelatives(ville, p.x, p.y, cap);
            if (!s[e.sens]) continue;
            if (++vus < e.rang) continue;
            p = { x: s[e.sens].x, y: s[e.sens].y }; cap = s[e.sens].cap;
            break;
        }
    }
    const fin = it.noeuds[it.noeuds.length - 1];
    return { ok: p.x === fin.x && p.y === fin.y, quoi: `arrivé en (${p.x},${p.y}) au lieu de (${fin.x},${fin.y})` };
}

test('un élève qui obéit AUX MOTS arrive bien à destination', () => {
    const rng = rngFixe(2101);
    for (let g = 0; g < 250; g++) {
        const v = creerVille({ cols: 5, rows: 5, trous: 0.16, rng });
        const it = tirerItineraire(v, { virages: 3, rng });
        assert.ok(it, `pas d'itinéraire au tirage ${g}`);
        const r = suivreLesMots(v, it, decrireItineraire(v, it));
        assert.ok(r.ok, `tirage ${g} : ${r.quoi}`);
    }
});

test('… et sur les trois tailles de ville, avec un à quatre virages', () => {
    const rng = rngFixe(88);
    for (const [cols, rows] of [[4, 4], [5, 5], [6, 5]]) {
        for (const virages of [1, 2, 3, 4]) {
            for (let g = 0; g < 25; g++) {
                const v = creerVille({ cols, rows, trous: 0.16, rng });
                const it = tirerItineraire(v, { virages, rng });
                if (!it) continue;
                const r = suivreLesMots(v, it, decrireItineraire(v, it));
                assert.ok(r.ok, `${cols}x${rows}, ${virages} virages, tirage ${g} : ${r.quoi}`);
            }
        }
    }
});

test('presque tous les virages ont quelque chose à compter', () => {
    // Un « la rue tourne » n'apprend rien : il n'y a pas de rue à compter. Ils
    // venaient de virages pris au carrefour même du virage précédent — deux
    // virages de suite, sans une seule rue entre les deux.
    const rng = rngFixe(77);
    let total = 0, sansRang = 0;
    for (let g = 0; g < 250; g++) {
        const v = creerVille({ cols: 5, rows: 5, trous: 0.16, rng });
        const it = tirerItineraire(v, { virages: 3, rng });
        for (const e of decrireItineraire(v, it)) {
            if (e.type !== 'tourner') continue;
            total++;
            if (e.rang < 1) sansRang++;
        }
    }
    assert.ok(sansRang / total < 0.25,
        `${Math.round(100 * sansRang / total)} % de virages sans rien à compter`);
});
