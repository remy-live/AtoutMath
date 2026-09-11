// LA COURSE DE VECTEURS.
//
// Trois promesses, et ce sont elles qu'on vérifie.
//
// LA PREMIÈRE : chaque piste se termine. Une piste dessinée à la main est
// jolie et jouable — jusqu'au jour où un mur de trop la coupe en deux, et rien
// à l'écran ne le dit : l'élève cherche une porte qui n'existe pas. Le
// parcours en largeur tranche la question pour de bon.
//
// LA DEUXIÈME : on ne saute pas par-dessus les murs. À quatre cases par tour,
// la voiture traverse quatre cases ; si une seule est hors piste, c'est une
// sortie. Sans cela, il suffirait de rouler vite pour passer à travers tout.
//
// LA TROISIÈME : la règle du jeu est bien celle du jeu de papier — la vitesse
// se conserve, l'accélération vaut au plus une case par axe, et une sortie de
// piste remet à l'arrêt sans tuer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    PISTES, pisteParId, lirePiste, surPiste, surArrivee, casesTraversees,
    ACCELERATIONS, VITESSE_MAX, etatDepart, coupsPossibles, jouer,
    cheminOptimal, conseil, expliquerCoup, transposer
} from '../js/core/courseVecteurs.js';
import { makeRng } from '../js/core/ids.js';

const toutes = () => PISTES.map(lirePiste);

// --- Les pistes --------------------------------------------------------------

test('UNE PISTE EST UN RECTANGLE, avec un départ et une arrivée', () => {
    PISTES.forEach(def => {
        const largeurs = new Set(def.dessin.map(l => l.length));
        assert.equal(largeurs.size, 1, `« ${def.id} » a des lignes de longueurs différentes`);
        const p = lirePiste(def);
        assert.ok(p.depart.length >= 4, `« ${p.id} » : zone de départ trop petite`);
        assert.ok(p.arrivee.length >= 4, `« ${p.id} » : ligne d'arrivée trop petite`);
        assert.ok(p.nom.length > 3);
        assert.ok(p.aide.length > 40, `« ${p.id} » ne dit pas ce qu'il faut y faire`);
        // Le bord est fermé : on ne sort pas du dessin par le haut.
        for (let x = 0; x < p.largeur; x++) {
            assert.ok(!surPiste(p, x, 0), `« ${p.id} » est ouverte en haut en x=${x}`);
            assert.ok(!surPiste(p, x, p.hauteur - 1), `« ${p.id} » est ouverte en bas`);
        }
    });
});

test('CHAQUE PISTE SE TERMINE — et pas en deux tours', () => {
    toutes().forEach(p => {
        const chemin = cheminOptimal(p, etatDepart(p));
        assert.ok(chemin, `« ${p.id} » n'a aucun chemin jusqu'à l'arrivée`);
        assert.ok(chemin.longueur >= 4, `« ${p.id} » se finit en ${chemin.longueur} tours`);
        assert.ok(chemin.longueur <= 40);
    });
});

test('LE CHEMIN OPTIMAL EST RÉELLEMENT JOUABLE, sans une seule sortie', () => {
    // Une recherche qui rend un chemin impossible à rejouer serait pire
    // qu'inutile : c'est elle qui souffle les indices et qui fait rouler le
    // robot.
    toutes().forEach(p => {
        const chemin = cheminOptimal(p, etatDepart(p));
        let etat = etatDepart(p);
        chemin.coups.forEach(c => {
            assert.ok(Math.abs(c.ax) <= 1 && Math.abs(c.ay) <= 1);
            etat = jouer(p, etat, c.ax, c.ay);
        });
        assert.ok(etat.fini, `« ${p.id} » : le chemin optimal n'arrive pas`);
        assert.equal(etat.sorties, 0);
        assert.equal(etat.tours, chemin.longueur);
    });
});

test('chaque départ tient sur la piste, chaque arrivée aussi', () => {
    toutes().forEach(p => {
        p.depart.forEach(c => assert.ok(surPiste(p, c.x, c.y)));
        p.arrivee.forEach(c => {
            assert.ok(surPiste(p, c.x, c.y));
            assert.ok(surArrivee(p, c.x, c.y));
        });
    });
});

test('une piste inconnue retombe sur la première', () => {
    assert.equal(pisteParId('n\'importe quoi').id, PISTES[0].id);
    assert.equal(lirePiste('circuit').id, 'circuit');
});

// --- Le segment parcouru -----------------------------------------------------

test('ON NE SAUTE PAS PAR-DESSUS LES MURS', () => {
    // Le cœur de la règle : le trajet d'un tour est un trait, pas un saut.
    const cases = casesTraversees(0, 0, 4, 0);
    assert.deepEqual(cases.map(c => c.x), [0, 1, 2, 3, 4]);
    // Une diagonale passe bien par les cases intermédiaires.
    const diag = casesTraversees(0, 0, 3, 3);
    assert.ok(diag.length >= 4);
    assert.deepEqual(diag[0], { x: 0, y: 0 });
    assert.deepEqual(diag[diag.length - 1], { x: 3, y: 3 });
    // Chaque case du trajet touche la précédente : pas de trou.
    for (let i = 1; i < diag.length; i++) {
        assert.ok(Math.abs(diag[i].x - diag[i - 1].x) <= 1
            && Math.abs(diag[i].y - diag[i - 1].y) <= 1);
    }
    // Sur place, une seule case.
    assert.deepEqual(casesTraversees(3, 3, 3, 3), [{ x: 3, y: 3 }]);
});

test('un mur sur le trajet interdit le coup, même si l\'arrivée est libre', () => {
    const piste = lirePiste({
        id: 'essai', nom: 'Essai', aide: 'x'.repeat(50),
        dessin: [
            '#######',
            '#DD#AA#',
            '#DD#AA#',
            '#######'
        ]
    });
    // (2,1) et (4,1) sont praticables, (3,1) est un mur : le saut est refusé.
    const etat = { x: 2, y: 1, vx: 1, vy: 0, tours: 0, sorties: 0, trace: [] };
    const coup = coupsPossibles(piste, etat).find(c => c.ax === 1 && c.ay === 0);
    assert.equal(coup.x, 4);
    assert.ok(!coup.valide, 'la voiture a traversé le mur');
    assert.ok(coup.sort);
});

// --- La règle ----------------------------------------------------------------

test('neuf accélérations, ni plus ni moins', () => {
    assert.equal(ACCELERATIONS.length, 9);
    const clefs = new Set(ACCELERATIONS.map(a => `${a.ax},${a.ay}`));
    assert.equal(clefs.size, 9);
    ACCELERATIONS.forEach(a => {
        assert.ok(Math.abs(a.ax) <= 1 && Math.abs(a.ay) <= 1);
    });
    assert.ok(clefs.has('0,0'), 'garder sa vitesse doit rester un choix');
});

test('LA VITESSE SE CONSERVE : ne rien toucher, c\'est refaire le même pas', () => {
    const p = lirePiste('echauffement');
    let etat = etatDepart(p);
    etat = jouer(p, etat, 1, 0);
    assert.deepEqual([etat.vx, etat.vy], [1, 0]);
    const avant = etat.x;
    etat = jouer(p, etat, 0, 0);
    assert.deepEqual([etat.vx, etat.vy], [1, 0]);
    assert.equal(etat.x, avant + 1);
});

test('position + vitesse : la voiture arrive exactement où l\'aperçu le disait', () => {
    const p = lirePiste('echauffement');
    let etat = etatDepart(p);
    for (let i = 0; i < 4; i++) {
        const coup = coupsPossibles(p, etat).find(c => c.valide && !c.arrive);
        const attendu = { x: coup.x, y: coup.y, vx: coup.vx, vy: coup.vy };
        etat = jouer(p, etat, coup.ax, coup.ay);
        assert.deepEqual({ x: etat.x, y: etat.y, vx: etat.vx, vy: etat.vy }, attendu);
    }
});

test('la vitesse est plafonnée : au-delà, la recherche ne finirait jamais', () => {
    const p = lirePiste('circuit');
    const etat = { x: 5, y: 1, vx: VITESSE_MAX, vy: 0, tours: 0, sorties: 0, trace: [] };
    const trop = coupsPossibles(p, etat).find(c => c.ax === 1 && c.ay === 0);
    assert.ok(trop.trop);
    assert.ok(!trop.valide);
});

test('UNE SORTIE DE PISTE REMET À L\'ARRÊT, elle ne tue pas', () => {
    const p = lirePiste('echauffement');
    let etat = etatDepart(p);
    // Plein nord depuis la première ligne : c'est le mur.
    const avant = { x: etat.x, y: etat.y };
    etat = jouer(p, etat, 0, -1);
    assert.equal(etat.sorties, 1);
    assert.deepEqual([etat.vx, etat.vy], [0, 0]);
    assert.deepEqual({ x: etat.x, y: etat.y }, avant, 'la voiture doit rester où elle était');
    assert.ok(!etat.fini);
    assert.equal(etat.tours, 1, 'une sortie coûte quand même un tour');
    assert.ok(etat.sortiPar, 'on doit pouvoir dessiner où elle est partie');
});

test('franchir l\'arrivée termine la course', () => {
    const p = lirePiste('echauffement');
    const chemin = cheminOptimal(p, etatDepart(p));
    let etat = etatDepart(p);
    chemin.coups.forEach(c => { etat = jouer(p, etat, c.ax, c.ay); });
    assert.ok(etat.fini);
    // Une fois finie, la trace se termine sur la ligne.
    const dernier = etat.trace[etat.trace.length - 1];
    assert.deepEqual(dernier, { x: etat.x, y: etat.y });
});

test('la trace garde tout le trajet, dans l\'ordre', () => {
    const p = lirePiste('chicane');
    let etat = etatDepart(p);
    const chemin = cheminOptimal(p, etat);
    chemin.coups.forEach(c => { etat = jouer(p, etat, c.ax, c.ay); });
    assert.equal(etat.trace.length, chemin.longueur + 1);
    // Deux points consécutifs sont séparés d'au plus VITESSE_MAX sur chaque axe.
    for (let i = 1; i < etat.trace.length; i++) {
        assert.ok(Math.abs(etat.trace[i].x - etat.trace[i - 1].x) <= VITESSE_MAX);
        assert.ok(Math.abs(etat.trace[i].y - etat.trace[i - 1].y) <= VITESSE_MAX);
    }
});

test('un coup inexistant ne change rien', () => {
    const p = lirePiste('echauffement');
    const etat = etatDepart(p);
    assert.deepEqual(jouer(p, etat, 2, 0), etat);
});

// --- Le robot et l'indice ----------------------------------------------------

test('LE ROBOT FINIT LA COURSE, depuis n\'importe où sur le chemin', () => {
    toutes().forEach(p => {
        let etat = etatDepart(p);
        let garde = 0;
        while (!etat.fini && garde++ < 60) {
            const c = conseil(p, etat);
            etat = jouer(p, etat, c.ax, c.ay);
        }
        assert.ok(etat.fini, `le robot s'est perdu sur « ${p.id} »`);
        assert.equal(etat.sorties, 0, `le robot est sorti sur « ${p.id} »`);
    });
});

test('un robot « mou » finit quand même, en un peu plus de tours', () => {
    const p = lirePiste('chicane');
    const parfait = cheminOptimal(p, etatDepart(p)).longueur;
    for (let g = 0; g < 5; g++) {
        const rng = makeRng(`mou${g}`);
        let etat = etatDepart(p);
        let garde = 0;
        while (!etat.fini && garde++ < 80) {
            const c = conseil(p, etat, { mou: 0.5, rng });
            etat = jouer(p, etat, c.ax, c.ay);
        }
        assert.ok(etat.fini, 'le robot mou n\'arrive pas');
        assert.equal(etat.sorties, 0, 'un robot ne sort pas de la piste');
        assert.ok(etat.tours >= parfait);
    }
});

test('sans issue, le robot freine plutôt que de foncer dans le mur', () => {
    const p = lirePiste({
        id: 'cul', nom: 'Cul-de-sac', aide: 'x'.repeat(50),
        dessin: ['######', '#DDD.#', '#....#', '#AAA.#', '######']
    });
    // Une voiture lancée dans un couloir dont l'arrivée est déjà derrière elle
    // n'a pas de chemin : elle doit au moins ralentir.
    const etat = { x: 4, y: 1, vx: 0, vy: 0, tours: 0, sorties: 0, trace: [] };
    const c = conseil(p, etat);
    assert.ok(Math.abs(c.ax) <= 1 && Math.abs(c.ay) <= 1);
});

test('l\'explication NOMME le geste au lieu de désigner un point', () => {
    const etat = { x: 5, y: 5, vx: 2, vy: 0 };
    const t = expliquerCoup(etat, { ax: 0, ay: 1 });
    assert.ok(t.includes('(2 ; 0)'), t);
    assert.ok(t.includes('(2 ; 1)'), t);
    assert.ok(/bas/.test(t));
    // Ne rien toucher se dit aussi.
    assert.ok(/garde ta vitesse/.test(expliquerCoup(etat, { ax: 0, ay: 0 })));
});

test('l\'aperçu des neuf coups forme un carré qui suit la vitesse', () => {
    // C'est le dessin de la règle : les neuf arrivées possibles sont le carré
    // de trois sur trois centré sur « je ne touche à rien ».
    const p = lirePiste('circuit');
    const etat = { x: 6, y: 2, vx: 2, vy: 0, tours: 0, sorties: 0, trace: [] };
    const coups = coupsPossibles(p, etat);
    assert.equal(coups.length, 9);
    const centre = coups.find(c => c.ax === 0 && c.ay === 0);
    assert.deepEqual([centre.x, centre.y], [8, 2]);
    coups.forEach(c => {
        assert.ok(Math.abs(c.x - centre.x) <= 1 && Math.abs(c.y - centre.y) <= 1);
    });
});

// --- La piste debout, pour un téléphone tenu droit ---------------------------

test('LA TRANSPOSITION NE CHANGE NI LA PISTE NI LA COURSE', () => {
    // On échange lignes et colonnes plutôt que de faire tourner le dessin :
    // la droite reste la droite, donc tout le vocabulaire du jeu reste vrai.
    // Encore faut-il que la piste, elle, soit la même course.
    PISTES.forEach(def => {
        const couchee = lirePiste(def);
        const debout = lirePiste(def, { debout: true });
        assert.equal(debout.largeur, couchee.hauteur);
        assert.equal(debout.hauteur, couchee.largeur);
        assert.equal(debout.sol.size, couchee.sol.size);
        assert.equal(debout.depart.length, couchee.depart.length);
        assert.equal(debout.arrivee.length, couchee.arrivee.length);
        // Chaque case praticable se retrouve, coordonnées échangées.
        couchee.sol.forEach(cle => {
            const [x, y] = cle.split(',').map(Number);
            assert.ok(debout.sol.has(`${y},${x}`), `la case (${x};${y}) a disparu`);
        });
        // Et surtout : le meilleur parcours fait le même nombre de tours.
        assert.equal(cheminOptimal(debout, etatDepart(debout)).longueur,
            cheminOptimal(couchee, etatDepart(couchee)).longueur);
    });
});

test('transposer deux fois redonne le dessin de départ', () => {
    PISTES.forEach(def => {
        assert.deepEqual(transposer(transposer(def.dessin)), def.dessin);
    });
});

test('AUCUNE AIDE NE PARLE DE DROITE OU DE GAUCHE', () => {
    // Une piste transposée a ses virages ailleurs : une consigne qui dit
    // « puis un virage à droite » devient fausse sur un téléphone.
    PISTES.forEach(def => {
        assert.ok(!/à (droite|gauche)|vers le (haut|bas)/i.test(def.aide),
            `« ${def.id} » nomme un côté que la transposition change`);
    });
});
