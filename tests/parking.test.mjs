import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    TAILLES_PARKING, plateauParking, departParking, arriveeParking,
    coupsPossiblesParking, jouerParking, estGagneParking, restantsParking,
    prochainCoupParking, cheminLePlusCourtParking, minimumParking, qualiteParking,
    etapesParking
} from '../js/core/parking.js';
import { parkingFicheGenerator as GP } from '../js/core/generators/parkingFiche.js';
import { exercices } from '../js/data/catalog.js';
import { TAGS } from '../js/data/tags.js';

// --- Le plateau ----------------------------------------------------------------

test('le plateau est bien celui de la revue : deux parkings, une voie, une place', () => {
    const p = plateauParking(4);
    assert.equal(p.cases.length, 4 + 3 + 1 + 4, 'douze cases pour huit voitures');
    assert.equal(p.cases.filter(c => c.zone === 'gauche').length, 4);
    assert.equal(p.cases.filter(c => c.zone === 'droite').length, 4);
    assert.equal(p.cases.filter(c => c.zone === 'voie').length, 3);
    assert.equal(p.cases.filter(c => c.zone === 'place').length, 1);

    // LA PLACE EST SOUS LE MILIEU DE LA VOIE, et nulle part ailleurs : c'est
    // la seule case d'où l'on ne gêne personne.
    const place = p.cases.find(c => c.zone === 'place');
    const voie = p.cases.filter(c => c.zone === 'voie');
    assert.equal(place.x, 2, 'la place n\'est pas sous le milieu de la voie');
    assert.equal(place.y, p.mid + 1);
    assert.deepEqual(p.voisins[place.id], [voie[1].id], 'la place n\'a qu\'une seule issue');
});

test('la voie relie vraiment les deux parkings, et rien ne la double', () => {
    const p = plateauParking(4);
    // Depuis n'importe quelle case, on atteint n'importe quelle autre : le
    // plateau est d'un seul tenant, sinon le jeu n'aurait pas de solution.
    const vus = new Set([0]);
    const file = [0];
    while (file.length) {
        const i = file.pop();
        p.voisins[i].forEach(j => { if (!vus.has(j)) { vus.add(j); file.push(j); } });
    }
    assert.equal(vus.size, p.cases.length, 'le plateau est coupé en deux');

    // Et il n'y a qu'UN chemin : couper la case du milieu de la voie sépare
    // tout. C'est cela qui interdit de se doubler.
    const milieu = p.cases.filter(c => c.zone === 'voie')[1].id;
    const vus2 = new Set([0, milieu]);
    const file2 = [0];
    while (file2.length) {
        const i = file2.pop();
        p.voisins[i].forEach(j => { if (!vus2.has(j)) { vus2.add(j); file2.push(j); } });
    }
    assert.ok(vus2.size < p.cases.length, 'la voie devrait être un passage obligé');
});

// --- Les coups -----------------------------------------------------------------

test('une voiture glisse sur une case libre voisine, et ne saute jamais', () => {
    const p = plateauParking(4);
    const e = departParking(p);
    const coups = coupsPossiblesParking(p, e);
    // Au départ, les seules voitures qui bougent sont celles qui bordent la
    // voie : les parkings sont pleins, personne d'autre n'a de case libre.
    assert.equal(coups.length, 2, 'au départ, une seule voiture de chaque côté peut sortir');
    assert.ok(coups.some(c => c.couleur === 'B'));
    assert.ok(coups.some(c => c.couleur === 'R'));

    // On ne saute pas : un coup vers une case occupée ou lointaine ne change rien.
    const occupee = p.cases.findIndex(c => c.zone === 'gauche');
    assert.equal(jouerParking(p, e, occupee, occupee + 1), e, 'on ne va pas sur une case occupée');
    const droite = p.cases.findIndex(c => c.zone === 'droite');
    assert.equal(jouerParking(p, e, occupee, droite), e, 'on ne traverse pas le plateau d\'un coup');
});

test('jouer ne modifie jamais l\'état d\'avant', () => {
    // Le jeu garde un historique pour « Annuler ».
    const p = plateauParking(4);
    const e = departParking(p);
    const copie = e.slice();
    const c = coupsPossiblesParking(p, e)[0];
    jouerParking(p, e, c.de, c.vers);
    assert.deepEqual(e, copie);
});

test('gagner, c\'est avoir échangé les deux parkings — l\'ordre interne ne compte pas', () => {
    const p = plateauParking(4);
    assert.equal(estGagneParking(p, departParking(p)), false);
    assert.equal(estGagneParking(p, arriveeParking(p)), true);
    // Une voiture restée sur la voie, et ce n'est pas gagné même si les
    // parkings semblent pleins.
    const presque = arriveeParking(p).slice();
    const voie = p.cases.find(c => c.zone === 'voie').id;
    presque[voie] = 'B';
    assert.equal(estGagneParking(p, presque), false, 'la voie doit être dégagée');
});

// --- Le minimum, qui est le cœur du jeu -----------------------------------------

test('LES MINIMUMS SONT CEUX-CI, et un test les refige', () => {
    // Ils ne sont pas écrits à la main : ils sortent de la table des
    // distances. On les fige ici pour qu'une retouche au plateau qui
    // changerait la difficulté ne passe pas inaperçue — les libellés du menu
    // les annoncent à l'élève.
    const attendus = { minuscule: 36, petit: 62, moyen: 104, grand: 146 };
    for (const t of Object.values(TAILLES_PARKING)) {
        assert.equal(minimumParking(t.n), attendus[t.id], `${t.id}`);
        assert.ok(t.label.includes(String(attendus[t.id])),
            `le libellé de « ${t.id} » annonce un autre nombre que le vrai minimum`);
    }
});

test('SANS LA PLACE DE DÉGAGEMENT, LE JEU EST IMPOSSIBLE', () => {
    // C'est LA leçon du jeu, alors on la démontre plutôt que de l'affirmer.
    // On rejoue le plateau en retirant la case qui dépasse : plus rien ne se
    // croise, et l'arrivée devient inatteignable.
    const p = plateauParking(3);
    const place = p.cases.find(c => c.zone === 'place').id;
    const sansPlace = {
        ...p,
        voisins: p.voisins.map((v, i) => (i === place ? [] : v.filter(j => j !== place)))
    };
    // Parcours en largeur depuis le départ, la place condamnée.
    const cle = (e) => e.map(v => v || '.').join('');
    const depart = departParking(p);
    const vus = new Set([cle(depart)]);
    let file = [depart];
    let gagne = false;
    while (file.length && !gagne) {
        const suivante = [];
        for (const ici of file) {
            if (estGagneParking(p, ici)) { gagne = true; break; }
            for (const c of coupsPossiblesParking(sansPlace, ici)) {
                const suite = jouerParking(sansPlace, ici, c.de, c.vers);
                const k = cle(suite);
                if (vus.has(k)) continue;
                vus.add(k);
                suivante.push(suite);
            }
        }
        file = suivante;
    }
    assert.equal(gagne, false, 'sans la place, l\'échange ne devrait pas être possible');
    // Alors qu'avec elle, il l'est — et en 62 coups.
    assert.equal(minimumParking(3), 62);
});

test('l\'indice atteint le minimum pile, sans jamais se bloquer', () => {
    for (const t of Object.values(TAILLES_PARKING)) {
        const p = plateauParking(t.n);
        let e = departParking(p);
        let coups = 0;
        while (!estGagneParking(p, e)) {
            const c = prochainCoupParking(p, e);
            assert.ok(c, `${t.id} : l'indice s'est arrêté en route`);
            // Le coup proposé doit être légal.
            assert.ok(coupsPossiblesParking(p, e).some(x => x.de === c.de && x.vers === c.vers),
                `${t.id} : coup illégal proposé`);
            e = jouerParking(p, e, c.de, c.vers);
            coups++;
            assert.ok(coups <= minimumParking(t.n) + 1, 'boucle sans fin');
        }
        assert.equal(coups, minimumParking(t.n), `${t.id}`);
    }
});

test('le compteur « il en reste N » descend d\'exactement un par bon coup', () => {
    // C'est ce que l'élève lit à l'écran : s'il monte, c'est un détour. La
    // promesse ne tient que si la table est juste.
    const p = plateauParking(2);
    const chemin = cheminLePlusCourtParking(p, departParking(p));
    assert.equal(chemin.length, 36);
    let e = departParking(p);
    let reste = restantsParking(p, e);
    assert.equal(reste, 36);
    for (const c of chemin) {
        e = jouerParking(p, e, c.de, c.vers);
        assert.equal(restantsParking(p, e), reste - 1);
        reste--;
    }
    assert.equal(reste, 0);
    assert.ok(estGagneParking(p, e));
});

test('un détour se paie, et se voit', () => {
    // Tout coup se défait sur ce jeu-là : reculer ne tue jamais la partie,
    // mais coûte deux coups. C'est exactement ce que le compteur doit dire.
    const p = plateauParking(2);
    const e = departParking(p);
    const bon = prochainCoupParking(p, e);
    const mauvais = coupsPossiblesParking(p, e).find(c => c.de !== bon.de || c.vers !== bon.vers);
    assert.ok(mauvais, 'il faut au moins deux coups possibles pour tester un détour');
    const apres = jouerParking(p, e, mauvais.de, mauvais.vers);
    assert.notEqual(restantsParking(p, apres), null, 'aucune position ne doit être morte');
    assert.ok(restantsParking(p, apres) >= restantsParking(p, e) - 1);

    const q = qualiteParking(2, 40);
    assert.equal(q.mini, 36);
    assert.equal(q.detours, 4);
    assert.equal(q.parfait, false);
    assert.ok(qualiteParking(2, 36).parfait);
});

// --- La fiche et le rangement ---------------------------------------------------

test('le générateur de fiche porte la forme du plateau et le minimum', () => {
    const it = GP.generate({ taille: 'petit' }, { rng: makeRng('fp') });
    assert.equal(it.meta.n, 3);
    assert.equal(it.meta.mini, 62);
    assert.ok(it.explanation.includes('62'));
    // Le rendu imprimé redessine case par case : il lui faut la forme.
    assert.equal(it.meta.cases.length, 3 + 3 + 1 + 3);
    assert.ok(it.meta.cases.every(c => Number.isInteger(c.x) && Number.isInteger(c.y) && c.zone));
    assert.ok(it.meta.hauteur >= 2);

    // Un réglage farfelu retombe sur le jeu de la revue plutôt que de casser.
    assert.equal(GP.generate({ taille: 'douze' }, { rng: makeRng('x') }).meta.n, 4);
});

test('le parking est rangé dans les défis, avec sa fiche et sa consigne', () => {
    const e = exercices.find(x => x.id === 'defi-parking');
    assert.ok(e, 'defi-parking manque au catalogue');
    assert.equal(e.activityId, 'parking');
    assert.equal(e.tags.chemin[0], TAGS.DOMAINE.DEFIS);
    assert.equal(e.tags.chemin[1], TAGS.SOUS_DOMAINE.CASSE_TETE);
    assert.equal(e.printable, 'parking');
    assert.equal(e.printGeneratorId, GP.id);
    assert.ok(e.instruction && e.instruction.length > 200, 'consigne trop courte');
    // La consigne doit parler de la place : c'est la seule chose que l'élève
    // ne trouvera pas tout seul.
    assert.ok(/place|range/i.test(e.instruction));
});

// --- LES VIGNETTES DE LA CORRECTION --------------------------------------------

test('la partie parfaite du parking : une vignette de départ, puis une par coup', () => {
    // Rémy : « pour les solutions des grenouilles, parking, hanoï, dessine des
    // vignettes des étapes pour la correction. » La feuille dessine ceci.
    for (const t of [TAILLES_PARKING.minuscule, TAILLES_PARKING.petit]) {
        const p = plateauParking(t.n);
        const etapes = etapesParking(t.n);
        assert.equal(etapes.length, minimumParking(t.n) + 1, `${t.n} contre ${t.n}`);
        assert.deepEqual(etapes[0], departParking(p), 'la première vignette est le départ');
        assert.ok(estGagneParking(p, etapes[etapes.length - 1]), 'la dernière est gagnée');
        // Et chaque vignette se déduit de la précédente par UNE voiture qui
        // bouge : deux cases changent, jamais plus.
        for (let i = 1; i < etapes.length; i++) {
            const bouges = etapes[i].filter((v, j) => v !== etapes[i - 1][j]).length;
            assert.equal(bouges, 2, `coup ${i}`);
        }
    }
});
