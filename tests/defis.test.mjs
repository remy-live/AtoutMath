import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    departBrahma, coupValide, jouer, estGagneBrahma, coupsRestants,
    prochainCoupBrahma, minimumBrahma, qualiteBrahma, TAILLES_BRAHMA, etapesBrahma
} from '../js/core/tourBrahma.js';
import {
    departGrenouilles, arriveeGrenouilles, coupsPossibles, jouerGrenouille,
    estGagneGrenouilles, estBloque, cheminLePlusCourt, prochainCoupGrenouilles,
    minimumGrenouilles, qualiteGrenouilles, TAILLES_GRENOUILLES, etapesGrenouilles
} from '../js/core/grenouilles.js';
import { tourBrahmaFicheGenerator as GB } from '../js/core/generators/tourBrahmaFiche.js';
import { grenouillesFicheGenerator as GG } from '../js/core/generators/grenouillesFiche.js';
import { exercices, domaines } from '../js/data/catalog.js';
import { TAGS } from '../js/data/tags.js';

// --- La Tour de Brahma ---------------------------------------------------------

test('une pile est toujours décroissante du bas vers le haut', () => {
    // C'est la règle du jeu tout entière, et elle est portée par le noyau :
    // une boule ne se pose que sur plus grosse qu'elle.
    const e = departBrahma(4);
    assert.deepEqual(e, [[4, 3, 2, 1], [], []]);
    assert.ok(coupValide(e, 0, 1), 'la plus petite peut aller sur un conduit vide');
    assert.equal(coupValide(e, 1, 0), false, 'on ne prend pas dans un conduit vide');
    assert.equal(coupValide(e, 0, 0), false, 'on ne repose pas d\'où l\'on vient');
    const f = jouer(e, 0, 1);
    assert.deepEqual(f, [[4, 3, 2], [1], []]);
    assert.equal(coupValide(f, 0, 1), false, 'le 2 ne va pas sur le 1');
    assert.ok(coupValide(f, 1, 2), 'mais le 1 va où il veut');
});

test('jouer ne modifie jamais l\'état d\'avant', () => {
    // Le jeu garde un historique pour « Annuler » : si `jouer` modifiait sur
    // place, annuler ramènerait à la position courante.
    const e = departBrahma(3);
    const copie = e.map(p => p.slice());
    jouer(e, 0, 2);
    assert.deepEqual(e, copie);
});

test('le chemin le plus court fait exactement 2ⁿ − 1 coups', () => {
    // Et il n'y a pas moyen de faire mieux : c'est la borne du problème.
    for (const t of Object.values(TAILLES_BRAHMA)) {
        assert.equal(coupsRestants(departBrahma(t.n), t.n).length, minimumBrahma(t.n));
        assert.equal(minimumBrahma(t.n), 2 ** t.n - 1);
    }
});

test('le chemin le plus court se recalcule depuis N\'IMPORTE QUELLE position', () => {
    // C'est ce qui permet à l'indice de dire la vérité après une maladresse,
    // et au compteur d'annoncer l'écart à l'optimum à chaque coup.
    for (const n of [3, 4, 5]) {
        let e = departBrahma(n);
        let coups = 0;
        // On joue quelques coups au hasard parmi les coups légaux, puis on
        // vérifie que le chemin restant reste cohérent et mène au but.
        const rng = makeRng('br' + n);
        for (let i = 0; i < 6; i++) {
            const legaux = [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]
                .filter(([a, b]) => coupValide(e, a, b));
            const [a, b] = rng.pick(legaux);
            e = jouer(e, a, b);
        }
        // Et de là, le chemin optimal termine vraiment la partie.
        const chemin = coupsRestants(e, n);
        chemin.forEach(c => {
            assert.ok(coupValide(e, c.de, c.vers),
                `coup illégal proposé : ${c.boule} de ${c.de} vers ${c.vers}`);
            e = jouer(e, c.de, c.vers);
            coups++;
        });
        assert.ok(estGagneBrahma(e, n), `n = ${n} : le chemin ne gagne pas`);
        assert.ok(coups <= minimumBrahma(n), 'le chemin « le plus court » est trop long');
    }
});

test('en suivant l\'indice depuis le départ, on fait le minimum pile', () => {
    for (const t of Object.values(TAILLES_BRAHMA)) {
        let e = departBrahma(t.n), coups = 0;
        while (!estGagneBrahma(e, t.n)) {
            const c = prochainCoupBrahma(e, t.n);
            assert.ok(c, `${t.n} boules : plus de coup proposé`);
            e = jouer(e, c.de, c.vers);
            coups++;
            assert.ok(coups <= minimumBrahma(t.n) + 1, 'boucle sans fin');
        }
        assert.equal(coups, minimumBrahma(t.n), `${t.n} boules`);
    }
});

test('la qualité compte les détours, pas les fautes', () => {
    // Un élève qui finit en dix-neuf coups au lieu de quinze n'a pas échoué :
    // il a fait quatre détours, et c'est un nombre qu'on peut regarder ensemble.
    assert.deepEqual(qualiteBrahma(4, 15), { n: 4, mini: 15, joues: 15, detours: 0, parfait: true });
    assert.deepEqual(qualiteBrahma(4, 19), { n: 4, mini: 15, joues: 19, detours: 4, parfait: false });
});

// --- Les Grenouilles -----------------------------------------------------------

test('chaque grenouille a AU PLUS un coup possible', () => {
    // Ce n'est pas une simplification de l'interface, c'est une propriété du
    // jeu : glisser demande la case voisine libre, sauter la demande occupée.
    // C'est elle qui permet de jouer en touchant simplement la bête.
    for (const t of Object.values(TAILLES_GRENOUILLES)) {
        let e = departGrenouilles(t.n);
        for (let i = 0; i < 30; i++) {
            const coups = coupsPossibles(e);
            const depuis = coups.map(c => c.de);
            assert.equal(new Set(depuis).size, depuis.length,
                `deux coups pour la même grenouille : ${e.join('')}`);
            const c = prochainCoupGrenouilles(e, t.n);
            if (!c) break;
            e = jouerGrenouille(e, c.de);
        }
    }
});

test('les vertes ne vont qu\'à droite, les rouges qu\'à gauche', () => {
    const e = ['V', null, 'R'];
    const coups = coupsPossibles(e);
    assert.equal(coups.length, 2);
    coups.forEach(c => {
        if (c.couleur === 'V') assert.ok(c.vers > c.de, 'une verte est allée à gauche');
        else assert.ok(c.vers < c.de, 'une rouge est allée à droite');
    });
});

test('un saut ne franchit qu\'UNE grenouille', () => {
    // C'est la règle qui rend le jeu bloquable, et la source de toutes les
    // parties perdues.
    //
    // Dans « V V _ », la première verte franchit UNE grenouille et se pose sur
    // le trou : c'est légal, et la seconde peut simplement glisser. Deux coups.
    assert.deepEqual(coupsPossibles(['V', 'V', null]).map(c => c.de), [1, 0]);
    // Dans « V V V _ », la première devrait en franchir DEUX pour atteindre le
    // trou : elle est coincée, et il ne reste que le saut de la deuxième et la
    // glissade de la troisième.
    assert.deepEqual(coupsPossibles(['V', 'V', 'V', null]).map(c => c.de), [2, 1]);
    // Et un « saut » par-dessus une case VIDE n'existe pas : ce serait avancer
    // de deux crans, ce qu'aucune grenouille ne sait faire.
    assert.deepEqual(coupsPossibles(['V', null, null]).map(c => c.de), [0]);
});

test('le départ et l\'arrivée sont bien l\'échange des deux groupes', () => {
    assert.deepEqual(departGrenouilles(2), ['V', 'V', null, 'R', 'R']);
    assert.deepEqual(arriveeGrenouilles(2), ['R', 'R', null, 'V', 'V']);
    assert.equal(estGagneGrenouilles(departGrenouilles(3), 3), false);
    assert.equal(estGagneGrenouilles(arriveeGrenouilles(3), 3), true);
});

test('le minimum vaut n² + 2n, et l\'indice l\'atteint pile', () => {
    for (const t of Object.values(TAILLES_GRENOUILLES)) {
        assert.equal(minimumGrenouilles(t.n), t.n * t.n + 2 * t.n);
        let e = departGrenouilles(t.n), coups = 0;
        while (!estGagneGrenouilles(e, t.n)) {
            const c = prochainCoupGrenouilles(e, t.n);
            assert.ok(c, `${t.n} contre ${t.n} : bloqué`);
            e = jouerGrenouille(e, c.de);
            coups++;
            assert.ok(coups <= minimumGrenouilles(t.n) + 1, 'boucle sans fin');
        }
        assert.equal(coups, minimumGrenouilles(t.n), `${t.n} contre ${t.n}`);
    }
});

test('LA FAUTE CLASSIQUE tue la partie, et on sait le dire', () => {
    // Deux vertes qui avancent l'une derrière l'autre : plus personne ne
    // passera jamais. Et le piège est là — il RESTE des coups possibles, donc
    // rien ne prévient l'élève. C'est le seul service que le papier ne rend
    // pas, et c'est celui qui compte.
    let e = departGrenouilles(4);
    e = jouerGrenouille(e, 3);
    e = jouerGrenouille(e, 2);
    assert.deepEqual(e, ['V', 'V', null, 'V', 'V', 'R', 'R', 'R', 'R']);
    assert.ok(coupsPossibles(e).length > 0, 'il reste des coups — c\'est tout le piège');
    assert.equal(estBloque(e, 4), false, '« bloqué » ne suffit donc pas à détecter la mort');
    assert.equal(cheminLePlusCourt(e, 4), null, 'la position doit être reconnue MORTE');
    assert.equal(prochainCoupGrenouilles(e, 4), null);
});

test('la partie alternée, elle, reste vivante', () => {
    let e = departGrenouilles(4);
    e = jouerGrenouille(e, 3);          // une verte
    e = jouerGrenouille(e, 5);          // une rouge saute
    assert.notEqual(cheminLePlusCourt(e, 4), null, 'alterner ne doit jamais tuer la partie');
});

test('le chemin le plus court est vraiment le plus court', () => {
    // La largeur d'abord donne LE minimum, pas un chemin quelconque : depuis
    // le départ, il doit valoir exactement n² + 2n.
    for (const n of [2, 3, 4]) {
        const chemin = cheminLePlusCourt(departGrenouilles(n), n);
        assert.equal(chemin.length, minimumGrenouilles(n));
        // Et chaque coup du chemin est légal quand on le joue.
        let e = departGrenouilles(n);
        chemin.forEach(c => {
            assert.ok(coupsPossibles(e).some(x => x.de === c.de), 'coup illégal proposé');
            e = jouerGrenouille(e, c.de);
        });
        assert.ok(estGagneGrenouilles(e, n));
    }
});

test('la qualité explique le minimum au lieu de l\'annoncer', () => {
    const q = qualiteGrenouilles(4, 24);
    assert.equal(q.sauts, 16, 'n × n croisements');
    assert.equal(q.glissades, 8, '2n glissades');
    assert.equal(q.sauts + q.glissades, q.mini, 'la démonstration doit tomber juste');
    assert.ok(q.parfait);
});

// --- Le rangement --------------------------------------------------------------

test('les deux défis vivent dans leur propre domaine', () => {
    // Rémy : « en catégorie défi ou énigme ». Rangés sous « calcul mental » ou
    // « logique », ils auraient laissé croire qu'on y révise une notion.
    assert.ok(domaines.includes(TAGS.DOMAINE.DEFIS), 'le domaine n\'apparaît pas au catalogue');
    ['defi-tour-brahma', 'defi-grenouilles'].forEach(id => {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `${id} manque au catalogue`);
        assert.equal(e.tags.chemin[0], TAGS.DOMAINE.DEFIS);
        assert.equal(e.tags.chemin[1], TAGS.SOUS_DOMAINE.CASSE_TETE);
        assert.ok(e.printable, `${id} n'a pas de fiche`);
        assert.ok(e.instruction && e.instruction.length > 200, `${id} : consigne trop courte`);
    });
});

test('les générateurs de fiche portent la taille et le minimum', () => {
    const b = GB.generate({ taille: 'cinq' }, { rng: makeRng('fb') });
    assert.equal(b.meta.n, 5);
    assert.equal(b.meta.mini, 31);
    assert.ok(b.explanation.includes('31'));

    const g = GG.generate({ taille: 'trois' }, { rng: makeRng('fg') });
    assert.equal(g.meta.n, 3);
    assert.equal(g.meta.mini, 15);
    assert.ok(g.explanation.includes('15'));

    // Un réglage farfelu retombe sur le jeu par défaut plutôt que de casser.
    assert.equal(GB.generate({ taille: 'douze' }, { rng: makeRng('x') }).meta.n, 4);
    assert.equal(GG.generate({ taille: 'douze' }, { rng: makeRng('x') }).meta.n, 4);
});

// --- LES VIGNETTES DE LA CORRECTION --------------------------------------------
//
// Rémy : « pour les solutions des grenouilles, parking, hanoï, dessine des
// vignettes des étapes pour la correction. » La feuille dessine ce que ces
// fonctions rendent : une position de départ, puis une par coup.

test('la partie parfaite compte un état de plus que de coups, et finit gagnée', () => {
    for (const t of Object.values(TAILLES_BRAHMA)) {
        const etapes = etapesBrahma(t.n);
        assert.equal(etapes.length, minimumBrahma(t.n) + 1, `${t.n} boules`);
        assert.deepEqual(etapes[0], departBrahma(t.n), 'la première vignette est le départ');
        assert.ok(estGagneBrahma(etapes[etapes.length - 1], t.n), 'la dernière est gagnée');
    }
    for (const t of Object.values(TAILLES_GRENOUILLES)) {
        const etapes = etapesGrenouilles(t.n);
        assert.equal(etapes.length, minimumGrenouilles(t.n) + 1, `${t.n} grenouilles`);
        assert.deepEqual(etapes[0], departGrenouilles(t.n), 'la première vignette est le départ');
        assert.deepEqual(etapes[etapes.length - 1], arriveeGrenouilles(t.n), 'la dernière est l\'arrivée');
    }
});

test('chaque vignette se déduit de la précédente par UN coup légal', () => {
    // Une correction dont deux vignettes voisines ne s'enchaînent pas est pire
    // qu'une absence de correction : l'élève y cherche son erreur.
    const etapes = etapesBrahma(4);
    for (let i = 1; i < etapes.length; i++) {
        const c = coupsRestants(etapes[i - 1], 4)[0];
        assert.deepEqual(etapes[i], jouer(etapes[i - 1], c.de, c.vers), `coup ${i}`);
    }
    const rubans = etapesGrenouilles(3);
    for (let i = 1; i < rubans.length; i++) {
        const bouges = rubans[i].filter((v, j) => v !== rubans[i - 1][j]).length;
        assert.equal(bouges, 2, `coup ${i} : une grenouille quitte sa case et en occupe une`);
    }
});
