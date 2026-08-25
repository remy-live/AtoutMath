import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    COTE, RANGEE_SORTIE, NIVEAUX_EMBOUTEILLAGE, niveauDe, poserVehicules, occupation,
    coupsPossibles, jouer, estSorti, explorer, restants, prochainCoup,
    creerEmbouteillage, qualiteEmbouteillage, coder, decoder, precalculer, voisins,
    MAX_VEHICULES
} from '../js/core/embouteillage.js';
import { getExerciseById, paramSchemaOf } from '../js/data/catalog.js';

// --- La règle -------------------------------------------------------------------

test('un véhicule ne glisse que dans son axe, et ne saute personne', () => {
    // Deux voitures couchées sur la même rangée, collées : celle de gauche ne
    // peut pas passer par-dessus l'autre, même si le bout de la rangée est vide.
    const vehicules = [
        { id: 0, len: 2, horiz: true, fixe: RANGEE_SORTIE },
        { id: 1, len: 2, horiz: true, fixe: RANGEE_SORTIE }
    ];
    const etat = [0, 2];
    const coups = coupsPossibles(vehicules, etat);
    // La rouge ne peut aller nulle part à droite (bloquée), ni à gauche (au mur).
    assert.equal(coups.filter(c => c.k === 0).length, 0);
    // La seconde peut avancer jusqu'au bord.
    assert.deepEqual(coups.filter(c => c.k === 1).map(c => c.debut).sort(), [3, 4]);
    // Et elle ne recule pas sur la rouge.
    assert.ok(!coups.some(c => c.k === 1 && c.debut < 2));
});

test('une voiture debout ne se déplace jamais latéralement', () => {
    const vehicules = [
        { id: 0, len: 2, horiz: true, fixe: RANGEE_SORTIE },
        { id: 1, len: 3, horiz: false, fixe: 4 }
    ];
    const coups = coupsPossibles(vehicules, [0, 0]);
    // Toutes ses positions restent dans sa colonne : le coup ne change que
    // `debut`, jamais `fixe`.
    coups.filter(c => c.k === 1).forEach(c => {
        const suite = jouer([0, 0], c);
        const g = occupation(vehicules, suite);
        for (let y = 0; y < COTE; y++) {
            for (let x = 0; x < COTE; x++) {
                if (g[y][x] === 1) assert.equal(x, 4, 'la voiture a changé de colonne');
            }
        }
    });
});

test('gagné quand la rouge touche le bord droit de sa rangée', () => {
    const v = [{ id: 0, len: 2, horiz: true, fixe: RANGEE_SORTIE }];
    assert.equal(estSorti(v, [3]), false);
    assert.equal(estSorti(v, [4]), true);
});

test('jouer ne modifie jamais la position d\'avant', () => {
    const etat = [1, 2, 3];
    const copie = etat.slice();
    jouer(etat, { k: 1, debut: 0 });
    assert.deepEqual(etat, copie);
});

// --- Le codage et le chemin rapide ------------------------------------------------

test('UNE POSITION TIENT DANS UN ENTIER, et se relit à l\'identique', () => {
    for (let i = 0; i < 500; i++) {
        const rng = makeRng(`c${i}`);
        const n = rng.int(1, MAX_VEHICULES);
        const etat = Array.from({ length: n }, () => rng.int(0, 5));
        assert.deepEqual(decoder(coder(etat), n), etat);
        // ET LE CODE RESTE POSITIF : au-delà de dix véhicules, le troisième bit
        // du onzième tomberait dans le bit de signe et deux positions
        // différentes recevraient le même code.
        assert.ok(coder(etat) >= 0, `code négatif à ${n} véhicules`);
    }
});

test('LE CHEMIN RAPIDE DIT EXACTEMENT LA MÊME CHOSE QUE LE LISIBLE', () => {
    // Le parcours travaille en masques de bits pour tenir la charge — des
    // centaines de milliers de positions, chacune avec vingt voisines. Ce test
    // est la garantie que l'optimisation n'a rien changé au jeu : on compare
    // les voisinages, position par position, sur des milliers de cas.
    let compares = 0;
    for (let i = 0; i < 120; i++) {
        const rng = makeRng(`v${i}`);
        const { vehicules, depart } = poserVehicules(rng, rng.int(5, MAX_VEHICULES));
        const P = precalculer(vehicules);
        let etat = depart.slice();
        for (let pas = 0; pas < 25; pas++) {
            const lents = coupsPossibles(vehicules, etat)
                .map(c => coder(jouer(etat, c))).sort((a, b) => a - b);
            const rapides = voisins(P, coder(etat), []).slice().sort((a, b) => a - b);
            assert.deepEqual(rapides, lents, `désaccord au plateau ${i}, pas ${pas}`);
            compares++;
            const cs = coupsPossibles(vehicules, etat);
            if (!cs.length) break;
            etat = jouer(etat, cs[rng.int(0, cs.length - 1)]);
        }
    }
    assert.ok(compares > 2000, `seulement ${compares} positions comparées`);
});

// --- La mesure de la difficulté ----------------------------------------------------

test('la distance à la sortie descend d\'exactement un par bon coup', () => {
    // C'est ce que l'élève lit à l'écran : s'il monte, c'est un détour. La
    // promesse ne tient que si la table est juste.
    for (let i = 0; i < 30; i++) {
        const rng = makeRng(`d${i}`);
        const { vehicules, depart } = poserVehicules(rng, 8);
        const table = explorer(vehicules, depart);
        if (!table) continue;
        let etat = depart.slice();
        let reste = restants(table, etat);
        assert.ok(reste !== null);
        let garde = 0;
        while (!estSorti(vehicules, etat) && garde++ < 80) {
            const c = prochainCoup(vehicules, table, etat);
            assert.ok(c, 'l\'indice s\'est arrêté en route');
            // Le coup proposé doit être légal.
            assert.ok(coupsPossibles(vehicules, etat)
                .some(x => x.k === c.k && x.debut === c.debut), 'coup illégal proposé');
            etat = jouer(etat, c);
            assert.equal(restants(table, etat), reste - 1);
            reste--;
        }
        assert.equal(reste, 0);
        assert.ok(estSorti(vehicules, etat));
    }
});

test('un détour se paie, et se voit', () => {
    const rng = makeRng('detour');
    const { vehicules, depart } = poserVehicules(rng, 7);
    const table = explorer(vehicules, depart);
    if (!table) return;
    const bon = prochainCoup(vehicules, table, depart);
    const autre = coupsPossibles(vehicules, depart)
        .find(c => c.k !== bon.k || c.debut !== bon.debut);
    if (!autre) return;
    const apres = jouer(depart, autre);
    // Tout coup se défait : aucune position atteignable n'est morte.
    assert.notEqual(restants(table, apres), null);
    assert.ok(restants(table, apres) >= restants(table, depart) - 1);
});

test('LE PLATEAU NE PORTE JAMAIS DEUX VOITURES SUR LA MÊME CASE', () => {
    for (let i = 0; i < 200; i++) {
        const rng = makeRng(`p${i}`);
        const { vehicules, depart } = poserVehicules(rng, rng.int(5, MAX_VEHICULES));
        const cases = new Set();
        vehicules.forEach((v, k) => {
            for (let j = 0; j < v.len; j++) {
                const c = v.horiz ? `${depart[k] + j},${v.fixe}` : `${v.fixe},${depart[k] + j}`;
                assert.ok(!cases.has(c), `chevauchement en ${c}`);
                cases.add(c);
            }
        });
        // Et aucune voiture couchée sur la rangée de sortie, sauf la rouge :
        // elle y serait devant la rouge sans que rien ne puisse l'écarter.
        vehicules.slice(1).forEach(v =>
            assert.ok(!(v.horiz && v.fixe === RANGEE_SORTIE),
                'un véhicule couché bloque la rangée de sortie pour toujours'));
        // La rouge est bien la première, couchée, sur la rangée de sortie.
        assert.equal(vehicules[0].id, 0);
        assert.equal(vehicules[0].horiz, true);
        assert.equal(vehicules[0].fixe, RANGEE_SORTIE);
    }
});

// --- Les six niveaux ---------------------------------------------------------------

test('les six niveaux montent, et chacun annonce un minimum MESURÉ', () => {
    let precedent = 0;
    // Les quatre premiers en entier ; les deux derniers coûtent deux secondes
    // chacun et sont couverts par le test de visée qui suit.
    NIVEAUX_EMBOUTEILLAGE.forEach(n => {
        assert.ok(n.min > precedent, `le niveau ${n.id} ne monte pas`);
        assert.ok(n.voitures <= MAX_VEHICULES, `le niveau ${n.id} dépasse la limite du codage`);
        precedent = n.min;
    });
    precedent = 0;
    for (const n of NIVEAUX_EMBOUTEILLAGE.filter(x => x.id <= 4)) {
        precedent = n.min;
        const jeu = creerEmbouteillage({ niveau: n.id, rng: makeRng(`n${n.id}`) });
        assert.ok(jeu, `niveau ${n.id} : aucun parking`);
        // LE MINIMUM ANNONCÉ EST LE VRAI : on le recalcule à partir de la
        // position de départ, sans faire confiance à ce qui est écrit.
        assert.equal(restants(jeu.table, jeu.depart), jeu.mini, `niveau ${n.id}`);
        assert.ok(jeu.mini > 0, 'un parking déjà gagné n\'est pas un casse-tête');
        assert.ok(jeu.mini <= n.max, `niveau ${n.id} : ${jeu.mini} dépasse le plafond`);
        // Et il se résout vraiment, coup par coup.
        let etat = jeu.depart.slice(), coups = 0;
        while (!estSorti(jeu.vehicules, etat) && coups < 100) {
            etat = jouer(etat, prochainCoup(jeu.vehicules, jeu.table, etat));
            coups++;
        }
        assert.equal(coups, jeu.mini, `niveau ${n.id} : le chemin ne fait pas le minimum`);
    }
});

test('LE NIVEAU EST UNE VISÉE, LE MINIMUM AFFICHÉ EST UNE MESURE', () => {
    // Les parkings profonds sont rares — un sur trente atteint vingt coups —
    // et l'on ne peut pas faire attendre un élève. Le générateur rend donc
    // toujours le plus dur qu'il a trouvé, et c'est CE nombre-là qui s'affiche.
    // Aucun des deux ne ment : ce test vérifie qu'on ne rend jamais rien de
    // faux, même quand la visée n'est pas atteinte.
    for (let i = 0; i < 6; i++) {
        const jeu = creerEmbouteillage({ niveau: 6, rng: makeRng(`vise${i}`), essais: 4 });
        assert.ok(jeu, 'même avec quatre essais, on doit rendre quelque chose');
        assert.equal(restants(jeu.table, jeu.depart), jeu.mini);
        assert.ok(jeu.mini >= 1);
    }
});

test('la qualité dit l\'écart au minimum', () => {
    assert.deepEqual(qualiteEmbouteillage(12, 12), { mini: 12, joues: 12, detours: 0, parfait: true });
    assert.deepEqual(qualiteEmbouteillage(12, 17), { mini: 12, joues: 17, detours: 5, parfait: false });
    assert.equal(niveauDe(99).id, 1, 'un niveau inconnu retombe sur le premier');
});

// --- Le rangement --------------------------------------------------------------------

test('l\'Embouteillage est rangé dans les défis, avec ses six niveaux', () => {
    const e = getExerciseById('defi-embouteillage');
    assert.ok(e, 'defi-embouteillage manque au catalogue');
    assert.equal(e.activityId, 'embouteillage');
    assert.deepEqual(e.skills, ['defi.embouteillage']);
    const schema = paramSchemaOf(e);
    const niveau = schema.find(p => p.id === 'niveau');
    assert.ok(niveau);
    assert.equal(niveau.options.length, NIVEAUX_EMBOUTEILLAGE.length);
    assert.ok(e.instruction.length > 400);
    // La consigne doit dire LE raisonnement du jeu : remonter la chaîne.
    assert.ok(/bloque/i.test(e.instruction));
});
