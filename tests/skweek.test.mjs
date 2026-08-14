import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    creerNiveau, NIVEAUX, REGLES, NOMS_REGLES, SOL, VIDE,
    bougerHeros, bougerEnnemis, bougerTirs, tirer, contact, compte,
    praticable, dalleEn, caseDe, peindreSous, RAYON, VITESSE
} from '../js/core/skweek.js';

const niveau = (n, i = 0, regle = null) =>
    creerNiveau({ niveau: n, rng: makeRng(`sk_${n}_${i}`), regle });

const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Les cases atteignables à pied depuis le départ. */
function atteignables(e, filtre = () => true) {
    const cle = (x, y) => `${x},${y}`;
    const vus = new Set([cle(e.depart.x, e.depart.y)]);
    const pile = [e.depart];
    while (pile.length) {
        const c = pile.pop();
        for (const [dx, dy] of VOISINS) {
            const nx = c.x + dx, ny = c.y + dy;
            if (vus.has(cle(nx, ny)) || !praticable(e, nx, ny)) continue;
            const d = dalleEn(e, nx, ny);
            if (!filtre(d)) continue;
            vus.add(cle(nx, ny));
            pile.push({ x: nx, y: ny });
        }
    }
    return vus;
}

// --- Le sol ---------------------------------------------------------------------

test('le sol n\'est jamais coupé en deux : tout se rejoint à pied', () => {
    // Un trou posé au hasard peut isoler un coin, et l'on demanderait alors de
    // peindre des dalles qu'aucun chemin n'atteint.
    for (let n = 1; n <= NIVEAUX.length; n++) {
        for (let i = 0; i < 12; i++) {
            const e = niveau(n, i);
            const total = e.sol.filter(v => v === SOL).length;
            assert.equal(atteignables(e).size, total,
                `niveau ${n} (tirage ${i}) : ${total - atteignables(e).size} dalle(s) inaccessibles`);
        }
    }
});

test('le personnage démarre debout sur une dalle, jamais dans un trou', () => {
    for (let n = 1; n <= NIVEAUX.length; n++) {
        for (let i = 0; i < 12; i++) {
            const e = niveau(n, i);
            assert.equal(e.sol[e.depart.y * e.cols + e.depart.x], SOL);
            assert.deepEqual(caseDe(e.heros), e.depart);
            // Et sa dalle est déjà peinte : le compteur ne doit pas annoncer
            // zéro alors qu'on est dessus.
            assert.equal(dalleEn(e, e.depart.x, e.depart.y).etat, 'peinte');
            assert.equal(e.peintes, 1);
        }
    }
});

test('chaque dalle est soit du sol, soit un trou — et le compte tombe juste', () => {
    const e = niveau(3);
    assert.equal(e.dalles.length, e.sol.filter(v => v === SOL).length);
    e.dalles.forEach(d => assert.ok(praticable(e, d.x, d.y)));
    e.sol.forEach(v => assert.ok(v === SOL || v === VIDE));
});

// --- Le tri ------------------------------------------------------------------------

test('la région à peindre est d\'un seul tenant : on peut tout faire sans faute', () => {
    // C'EST L'INVARIANT QUI REND LE SANS-FAUTE POSSIBLE. Sans lui, il faudrait
    // traverser des dalles interdites pour atteindre les bonnes, et le jeu
    // punirait ce qu'il n'a pas rendu évitable.
    for (let n = 4; n <= NIVEAUX.length; n++) {
        for (let i = 0; i < 15; i++) {
            const e = niveau(n, i);
            const bonnes = e.dalles.filter(d => d.bonne).length;
            const joignables = atteignables(e, d => d && d.bonne);
            assert.equal(joignables.size, bonnes,
                `niveau ${n} (tirage ${i}) : ${bonnes - joignables.size} bonne(s) dalle(s) hors d'atteinte`);
        }
    }
});

test('le nombre écrit sur une dalle décide vraiment de sa couleur', () => {
    for (const nom of NOMS_REGLES) {
        for (let i = 0; i < 10; i++) {
            const e = creerNiveau({ niveau: 5, rng: makeRng(`r_${nom}_${i}`), regle: nom });
            assert.equal(e.regle.id, nom);
            const R = REGLES[nom];
            e.dalles.forEach(d => {
                assert.ok(d.texte !== '', `dalle sans nombre en ${d.x},${d.y}`);
                assert.equal(R.convient(d.valeur, e.regle.params), d.bonne,
                    `« ${d.texte} » : la règle « ${e.regle.dit} » dit le contraire de la dalle`);
            });
        }
    }
});

test('un niveau de tri a de quoi se tromper, et de quoi réussir', () => {
    for (let n = 4; n <= NIVEAUX.length; n++) {
        for (let i = 0; i < 12; i++) {
            const e = niveau(n, i);
            const bonnes = e.dalles.filter(d => d.bonne).length;
            const mauvaises = e.dalles.length - bonnes;
            assert.ok(bonnes >= 4, `niveau ${n} : seulement ${bonnes} dalles à peindre`);
            assert.ok(mauvaises >= 3, `niveau ${n} : seulement ${mauvaises} pièges`);
            assert.equal(e.aFaire, bonnes);
        }
    }
});

test('les trois premiers niveaux demandent tout le sol, sans nombre ni règle', () => {
    for (let n = 1; n <= 3; n++) {
        const e = niveau(n);
        assert.equal(e.but, 'tout');
        assert.equal(e.regle, null);
        assert.equal(e.aFaire, e.dalles.length);
        e.dalles.forEach(d => { assert.equal(d.bonne, true); assert.equal(d.texte, ''); });
    }
});

test('une règle qui doit produire un « oui » en produit un — toujours', () => {
    // LE CŒUR DE LA GARANTIE. Le tirage à l'essai abandonnait au bout de deux
    // cents coups et gardait le dernier venu : la dalle basculait alors de
    // camp en silence, et la région à peindre se trouait. Ici on demande, et
    // l'on obtient — sur toutes les règles, tous les paramètres, mille fois.
    for (const nom of NOMS_REGLES) {
        const R = REGLES[nom];
        const rng = makeRng('force_' + nom);
        for (let i = 0; i < 40; i++) {
            const params = R.parametres(rng);
            for (let k = 0; k < 25; k++) {
                for (const veut of [true, false]) {
                    const t = R.forcer(rng, params, veut);
                    const v = typeof t === 'object' ? t.valeur : t;
                    assert.equal(R.convient(v, params), veut,
                        `« ${R.label} » (${JSON.stringify(params)}) : ${JSON.stringify(t)} devait `
                        + `${veut ? 'convenir' : 'ne pas convenir'}`);
                }
            }
        }
    }
});

test('les nombres écrits restent lisibles par un élève', () => {
    for (const nom of NOMS_REGLES) {
        const R = REGLES[nom];
        const rng = makeRng('lis_' + nom);
        const params = R.parametres(rng);
        for (let k = 0; k < 200; k++) {
            for (const veut of [true, false]) {
                const t = R.forcer(rng, params, veut);
                const texte = typeof t === 'object' ? t.texte : String(t);
                const v = typeof t === 'object' ? t.valeur : t;
                // Ni négatif, ni zéro, ni décimale à rallonge sur la dalle.
                assert.match(texte, /^\d+([+/]\d+)?$/, `« ${texte} » ne tient pas sur une dalle`);
                assert.ok(v > 0, `« ${texte} » vaut ${v}`);
            }
        }
    }
});

// --- Le mouvement ------------------------------------------------------------------

test('le personnage ne traverse ni les trous ni les bords', () => {
    for (let i = 0; i < 8; i++) {
        const e = niveau(3, i);
        const rng = makeRng('marche' + i);
        for (let pas = 0; pas < 4000; pas++) {
            bougerHeros(e, { x: rng.int(-1, 1), y: rng.int(-1, 1) }, 1 / 60);
            const c = caseDe(e.heros);
            assert.ok(praticable(e, c.x, c.y),
                `le personnage est dans le vide en ${c.x},${c.y}`);
            // Et son cercle entier reste sur du sol praticable.
            for (const [dx, dy] of [[-RAYON, -RAYON], [RAYON, -RAYON], [-RAYON, RAYON], [RAYON, RAYON]]) {
                const q = caseDe({ x: e.heros.x + dx, y: e.heros.y + dy });
                assert.ok(praticable(e, q.x, q.y), `un bord du personnage déborde en ${q.x},${q.y}`);
            }
        }
    }
});

test('une diagonale ne va pas plus vite que les quatre directions', () => {
    // Le vieux défaut des jeux à huit directions : sans normaliser la poussée,
    // aller en biais donne 41 % de vitesse en plus.
    const droit = creerNiveau({ niveau: 1, rng: makeRng('vit_a') });
    const biais = creerNiveau({ niveau: 1, rng: makeRng('vit_a') });
    const d0 = { ...droit.heros }, b0 = { ...biais.heros };
    bougerHeros(droit, { x: 1, y: 0 }, 0.05);
    bougerHeros(biais, { x: 1, y: 1 }, 0.05);
    const dDroit = Math.hypot(droit.heros.x - d0.x, droit.heros.y - d0.y);
    const dBiais = Math.hypot(biais.heros.x - b0.x, biais.heros.y - b0.y);
    assert.ok(Math.abs(dDroit - dBiais) < 1e-9, `${dDroit} contre ${dBiais}`);
    assert.ok(Math.abs(dDroit - VITESSE * 0.05) < 1e-9);
});

test('la dalle se peint entièrement dès que le centre y entre', () => {
    const e = niveau(1);
    const avant = e.peintes;
    const depart = { ...e.heros };
    // On avance jusqu'à changer de case, pas plus.
    let bougé = false;
    for (let i = 0; i < 60 && !bougé; i++) {
        bougerHeros(e, { x: 1, y: 0 }, 1 / 60);
        bougé = caseDe(e.heros).x !== caseDe(depart).x;
    }
    assert.ok(bougé, 'le personnage n\'a pas changé de case');
    assert.equal(e.peintes, avant + 1, 'une case franchie, une case peinte');
    // Repasser dessus ne compte pas deux fois.
    peindreSous(e);
    assert.equal(e.peintes, avant + 1);
});

test('marcher sur une mauvaise dalle la salit, et la tache reste', () => {
    const e = niveau(4, 3);
    const mauvaise = e.dalles.find(d => !d.bonne);
    e.heros.x = mauvaise.x + 0.5;
    e.heros.y = mauvaise.y + 0.5;
    peindreSous(e);
    assert.equal(mauvaise.etat, 'salie');
    assert.equal(e.salies, 1);
    assert.equal(e.peintes, 1, 'une tache ne fait pas avancer le compteur');
    // Elle ne se nettoie pas en repassant : c'est ce qui la rend coûteuse.
    peindreSous(e);
    assert.equal(mauvaise.etat, 'salie');
    assert.equal(e.salies, 1);
});

test('le niveau est fini quand toutes les bonnes dalles sont peintes', () => {
    const e = niveau(4, 5);
    assert.equal(e.fini, false);
    e.dalles.filter(d => d.bonne).forEach(d => {
        e.heros.x = d.x + 0.5; e.heros.y = d.y + 0.5;
        peindreSous(e);
    });
    assert.equal(e.fini, true);
    assert.equal(compte(e).pourcentage, 100);
    // Les taches ne l'empêchent pas de finir — elles se paient au score.
    assert.equal(e.salies, 0);
});

// --- Les ennemis et le tir ----------------------------------------------------------

test('les ennemis démarrent loin, et restent sur le sol', () => {
    for (let i = 0; i < 8; i++) {
        const e = niveau(3, i);
        const rng = makeRng('enn' + i);
        e.ennemis.forEach(m => {
            const d = Math.abs(m.x - e.heros.x) + Math.abs(m.y - e.heros.y);
            assert.ok(d >= 3, `un ennemi démarre à ${d.toFixed(1)} case(s) du personnage`);
        });
        for (let pas = 0; pas < 3000; pas++) {
            bougerEnnemis(e, 1 / 60, rng);
            e.ennemis.forEach(m => {
                if (!m.vivant) return;
                const c = caseDe(m);
                assert.ok(praticable(e, c.x, c.y), `un ennemi est dans le vide en ${c.x},${c.y}`);
            });
        }
    }
});

test('un seul tir en vol : le bouton demande de viser', () => {
    const e = niveau(1);
    assert.ok(tirer(e));
    assert.equal(tirer(e), null, 'deux tirs à la fois');
    assert.equal(e.tirs.length, 1);
    // Le tir part dans la direction du regard, pas au hasard.
    bougerHeros(e, { x: 0, y: 1 }, 1 / 60);
    e.tirs.length = 0;
    const t = tirer(e);
    assert.ok(t.vy > 0 && Math.abs(t.vx) < 1e-9);
});

test('un tir meurt au mur, et assomme l\'ennemi qu\'il touche', () => {
    const e = niveau(1);
    // On pose un ennemi juste devant, et l'on regarde vers lui.
    e.heros.regard = { x: 1, y: 0 };
    e.ennemis[0].x = e.heros.x + 1.2;
    e.ennemis[0].y = e.heros.y;
    e.ennemis[0].vivant = true;
    tirer(e);
    let touche = [];
    for (let i = 0; i < 30 && !touche.length; i++) touche = bougerTirs(e, 1 / 60);
    assert.equal(touche.length, 1);
    assert.equal(e.ennemis[0].vivant, false);
    assert.equal(e.tirs.length, 0, 'le tir disparaît en touchant');

    // Et il revient — loin.
    const rng = makeRng('retour');
    for (let i = 0; i < 400; i++) bougerEnnemis(e, 1 / 60, rng);
    assert.equal(e.ennemis[0].vivant, true);
    const d = Math.abs(e.ennemis[0].x - e.heros.x) + Math.abs(e.ennemis[0].y - e.heros.y);
    assert.ok(d >= 4, `l'ennemi revient à ${d.toFixed(1)} case(s) — c'est une punition, pas un retour`);
});

test('le contact renvoie au départ, avec un moment de grâce', () => {
    const e = niveau(1);
    e.ennemis[0].x = e.heros.x;
    e.ennemis[0].y = e.heros.y;
    e.ennemis[0].vivant = true;
    assert.equal(contact(e), true);
    assert.deepEqual(caseDe(e.heros), e.depart);
    // Pendant la grâce, un second contact ne compte pas : sinon on perdrait
    // trois vies d'un coup en réapparaissant.
    assert.equal(contact(e), false);
    for (let i = 0; i < 200; i++) bougerHeros(e, { x: 0, y: 0 }, 1 / 60);
    assert.equal(e.heros.grace, 0);
});

test('la même graine redonne exactement le même niveau', () => {
    const a = creerNiveau({ niveau: 5, rng: makeRng('graine') });
    const b = creerNiveau({ niveau: 5, rng: makeRng('graine') });
    assert.deepEqual(a.sol, b.sol);
    assert.deepEqual(a.dalles, b.dalles);
    assert.deepEqual(a.regle, b.regle);
});
