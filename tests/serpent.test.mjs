// LE SERPENT LITTÉRAL — l'algèbre du corps, sans écran.
//
// Ce qu'on éprouve ici : que le corps du serpent DIT VRAI. À tout instant,
// l'expression qu'il porte doit valoir la somme de tout ce qui a été ramassé —
// sinon le jeu enseignerait une fausse réduction, ce qui est pire que de ne
// rien enseigner.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    NIVEAUX, CONSIGNE, ESPACEMENT, RAYON_TETE, RAYON_TERME,
    terme, semblables, texteTerme, expression, reduire, ecartCap, anneaux,
    nouvellePartie, avancer, semer, longueurIdeale, formePourEcran
} from '../js/core/serpent.js';

/** Ce que vaut une expression pour une valeur de x — le juge de tous les tests. */
const vaut = (corps, x) => corps.reduce((s, t) => s + t.c * Math.pow(x, t.e), 0);

test('un terme s\'écrit comme au tableau', () => {
    assert.equal(texteTerme(terme(3, 0)), '3');
    assert.equal(texteTerme(terme(3, 1)), '3x');
    assert.equal(texteTerme(terme(1, 2)), 'x²');
    assert.equal(texteTerme(terme(-1, 3)), '−x³');
    assert.equal(texteTerme(terme(-4, 1)), '−4x');
    assert.equal(texteTerme(terme(5, 0), { signe: true }), '+5');
});

test('SEMBLABLES VEUT DIRE MÊME PUISSANCE, et rien d\'autre', () => {
    assert.equal(semblables(terme(2, 1), terme(9, 1)), true);
    assert.equal(semblables(terme(2, 1), terme(2, 0)), false, '2x et 2 ne se ressemblent pas');
    assert.equal(semblables(terme(3, 2), terme(3, 1)), false, '3x² et 3x non plus');
    assert.equal(semblables(terme(7, 0), terme(-7, 0)), true);
});

test('2x + 3x FUSIONNE, 2x + 3 NON — la faute du chapitre', () => {
    const a = reduire([terme(3, 1), terme(2, 1)]);
    assert.equal(a.corps.length, 1);
    assert.equal(texteTerme(a.corps[0]), '5x');

    const b = reduire([terme(3, 0), terme(2, 1)]);
    assert.equal(b.corps.length, 2, '2x + 3 reste à deux termes');
    assert.equal(b.fusions, 0);
});

test('L\'ORDRE DE RAMASSAGE DÉCIDE DE TOUT', () => {
    // Le cœur du jeu. Les mêmes trois termes, deux ordres, deux longueurs.
    //
    // ET IL FAUT RÉDUIRE À CHAQUE RAMASSAGE, pas une fois à la fin : c'est ce
    // que fait le jeu, et mon premier test l'avait oublié — il appelait
    // `reduire` sur la liste complète, ce qui ne fusionnait rien puisque la
    // tête n'était pas semblable à sa voisine. La cascade se joue coup par coup.
    const ramasser = (ordre) => ordre.reduce(
        (corps, t) => reduire([t, ...corps]).corps, []);

    const bien = ramasser([terme(2, 1), terme(3, 1), terme(5, 0)]);
    assert.equal(bien.length, 2);
    assert.equal(expression(bien), '5 + 5x');

    const mal = ramasser([terme(2, 1), terme(5, 0), terme(3, 1)]);
    assert.equal(mal.length, 3, 'le 5 s\'est glissé entre les deux x');
    assert.equal(expression(mal), '3x + 5 + 2x');
});

test('les fusions s\'enchaînent en cascade', () => {
    const r = reduire([terme(4, 1), terme(3, 1), terme(2, 1)]);
    assert.equal(r.corps.length, 1);
    assert.equal(texteTerme(r.corps[0]), '9x');
    assert.equal(r.fusions, 2);
});

test('DEUX OPPOSÉS NE LAISSENT PAS UN ZÉRO : ils ne laissent rien', () => {
    const r = reduire([terme(-3, 1), terme(3, 1)]);
    assert.deepEqual(r.corps, [], 'l\'anneau disparaît pour de bon');
    assert.equal(r.annulations, 1);
    // Et une annulation peut en libérer une autre.
    const c = reduire([terme(-2, 0), terme(2, 0), terme(-5, 1), terme(5, 1)]);
    assert.equal(c.annulations >= 1, true);
});

test('on ne réduit QUE depuis la tête', () => {
    // Réduire partout d'un coup rendrait l'ordre indifférent — et l'ordre est
    // exactement ce qu'on apprend. Ici les deux x sont séparés par un nombre :
    // rien ne bouge, même s'ils sont « réductibles » au sens du cours.
    const r = reduire([terme(1, 0), terme(2, 1), terme(3, 1)]);
    assert.equal(r.corps.length, 3);
    assert.equal(r.fusions, 0);
});

test('LA RÉDUCTION NE CHANGE JAMAIS LA VALEUR — l\'invariant du module', () => {
    const rng = makeRng('valeur');
    for (let essai = 0; essai < 300; essai++) {
        const brut = [];
        for (let i = 0; i < rng.int(1, 7); i++) {
            brut.push(terme(rng.int(-6, 6) || 1, rng.pick([0, 1, 2, 3])));
        }
        const { corps } = reduire(brut);
        [-2, 0, 1, 3, 7].forEach(x => {
            assert.equal(vaut(corps, x), vaut(brut, x),
                `${expression(brut)} réduit en ${expression(corps)} : faux en x = ${x}`);
        });
    }
});

test('l\'expression s\'écrit dans l\'ordre des anneaux, pas par degrés', () => {
    // La ranger ferait le travail à la place de l'élève.
    assert.equal(expression([terme(3, 0), terme(2, 2)]), '3 + 2x²');
    assert.equal(expression([terme(2, 2), terme(3, 0)]), '2x² + 3');
    assert.equal(expression([terme(5, 1), terme(-2, 0)]), '5x − 2');
    assert.equal(expression([]), '0');
});

// --- Le terrain, sans cases -------------------------------------------------
//
// Rémy : « ne mets pas de case, que ce soit un peu plus libre. » Les tests de
// la grille sont donc remplacés — et c'est le bon moment de redire ce qu'ils
// gardaient VRAIMENT : l'algèbre du corps, éprouvée plus haut, n'a pas changé
// d'une ligne. Deux anneaux « voisins » l'ont toujours été DANS LE CORPS, et
// jamais sur le damier.

test('un écart de cap ne fait jamais le tour du cadran', () => {
    // Sans normalisation, aller de 350° à 10° se lit comme un virage de −340° :
    // le serpent ferait presque un tour complet pour vingt degrés.
    const deg = (d) => d * Math.PI / 180;
    assert.ok(Math.abs(ecartCap(deg(350), deg(10)) - deg(20)) < 1e-9);
    assert.ok(Math.abs(ecartCap(deg(10), deg(350)) + deg(20)) < 1e-9);
    assert.equal(ecartCap(1, 1), 0);
    for (let a = -7; a < 7; a += 0.37) {
        for (let b = -7; b < 7; b += 0.41) {
            const d = ecartCap(a, b);
            assert.ok(d > -Math.PI - 1e-9 && d <= Math.PI + 1e-9, `${a}→${b} donne ${d}`);
        }
    }
});

test('une partie neuve tient dans son aire', () => {
    const p = nouvellePartie(makeRng('depart'), 0);
    assert.equal(p.corps.length, 1);
    assert.equal(p.graines.length, p.niv.termes);
    p.graines.forEach(g => {
        assert.ok(g.x > 0 && g.x < p.niv.large && g.y > 0 && g.y < p.niv.haut, 'hors du terrain');
    });
});

test('DEUX TERMES NE SE TOUCHENT JAMAIS', () => {
    // Sans grille pour les tenir écartés, deux pastilles collées se ramassent
    // d'un seul passage — ce qui retire à l'élève le choix qu'on veut lui
    // laisser entre deux familles.
    for (let i = 0; i < 25; i++) {
        const p = nouvellePartie(makeRng(`ecart${i}`), i % NIVEAUX.length);
        for (let a = 0; a < p.graines.length; a++) {
            for (let b = a + 1; b < p.graines.length; b++) {
                const d = Math.hypot(p.graines[a].x - p.graines[b].x, p.graines[a].y - p.graines[b].y);
                assert.ok(d > RAYON_TERME * 2,
                    `deux termes à ${d.toFixed(2)} l'un de l'autre au niveau ${p.rang}`);
            }
        }
    }
});

test('rien n\'est semé sur le serpent', () => {
    for (let i = 0; i < 25; i++) {
        const p = nouvellePartie(makeRng(`devant${i}`), i % NIVEAUX.length);
        p.graines.forEach(g => assert.ok(
            Math.hypot(g.x - p.tete.x, g.y - p.tete.y) > 10,
            'un terme est posé sur le serpent ou juste devant'));
    }
});

test('chaque famille semée l\'est au moins deux fois', () => {
    for (let i = 0; i < 20; i++) {
        const p = nouvellePartie(makeRng(`fam${i}`), i % NIVEAUX.length);
        const compte = {};
        p.graines.forEach(g => { compte[g.t.e] = (compte[g.t.e] || 0) + 1; });
        Object.entries(compte).forEach(([e, n]) => {
            assert.ok(n >= 2, `exposant ${e} semé ${n} fois au niveau ${p.rang}`);
        });
    }
});

test('un niveau ne sème que les exposants qu\'il annonce', () => {
    NIVEAUX.forEach((niv, i) => {
        const p = nouvellePartie(makeRng(`exp${i}`), i);
        p.graines.forEach(g => assert.ok(niv.exposants.includes(g.t.e),
            `${niv.titre} sème un exposant ${g.t.e}`));
        if (!niv.negatifs) p.graines.forEach(g => assert.ok(g.t.c > 0, `${niv.titre} : négatif`));
    });
});

test('LE MUR TUE', () => {
    let e = nouvellePartie(makeRng('mur'), 0);
    for (let i = 0; i < 600 && !e.fini; i++) e = avancer(e, 1 / 60, 0).etat;
    assert.equal(e.fini, 'mur');
});

test('LE VIRAGE EST BORNÉ — on ne pivote pas sur place', () => {
    // C'est cette borne qui fait la conduite. Sans elle, on tournerait
    // instantanément et le jeu redeviendrait une grille à quatre directions
    // déguisée ; c'est aussi elle qui remplace l'ancien « pas de demi-tour ».
    const p = nouvellePartie(makeRng('virage'), 0);
    const dt = 1 / 60;
    const r = avancer(p, dt, Math.PI);          // demi-tour demandé
    const tourne = Math.abs(ecartCap(p.cap, r.etat.cap));
    assert.ok(tourne <= p.niv.virage * dt + 1e-9,
        `${tourne.toFixed(3)} rad en une image, pour un maximum de ${(p.niv.virage * dt).toFixed(3)}`);
    assert.ok(tourne > 0, 'il tourne quand même');
});

test('une image qui traîne ne téléporte pas le serpent', () => {
    // Un onglet en arrière-plan rend des `dt` d'une seconde ou plus. Sans
    // plafond, le serpent traverserait le terrain d'un bond — à travers son
    // propre corps et les murs.
    const p = nouvellePartie(makeRng('lag'), 0);
    const r = avancer(p, 5, 0);
    const parcouru = Math.hypot(r.etat.tete.x - p.tete.x, r.etat.tete.y - p.tete.y);
    assert.ok(parcouru <= p.niv.vitesse * 0.12 + 1e-6,
        `${parcouru.toFixed(2)} unités en une image`);
});

test('LES ANNEAUX SUIVENT LA TRACE, à écart constant', () => {
    // Le corps épouse la courbe que la tête a décrite : c'est ce qui donne au
    // serpent son ondulation, qu'aucune grille ne sait produire.
    const rng = makeRng('trace');
    let e = nouvellePartie(makeRng('trace'), 3);
    for (let i = 0; i < 900 && !e.fini; i++) {
        const g = e.graines[0];
        const cap = g ? Math.atan2(g.y - e.tete.y, g.x - e.tete.x) : rng.next() * 6.28;
        e = avancer(e, 1 / 60, cap).etat;
        const a = anneaux(e);
        assert.equal(a.length, Math.max(1, e.corps.length), 'autant d\'anneaux que de termes');
        for (let k = 1; k < a.length; k++) {
            const d = Math.hypot(a[k].x - a[k - 1].x, a[k].y - a[k - 1].y);
            assert.ok(Math.abs(d - ESPACEMENT) < 0.25,
                `anneaux ${k - 1} et ${k} à ${d.toFixed(2)} au lieu de ${ESPACEMENT}`);
        }
    }
});

test('LE CORPS DIT TOUJOURS LA VÉRITÉ SUR CE QUI A ÉTÉ RAMASSÉ', () => {
    // L'invariant qui compte, et il traverse le changement de déplacement sans
    // une retouche : à tout instant, l'expression portée par le serpent vaut la
    // somme de tous les termes ramassés depuis le début.
    for (let partie = 0; partie < 8; partie++) {
        let e = nouvellePartie(makeRng(`vr${partie}`), partie % NIVEAUX.length);
        const ramasses = [];
        for (let i = 0; i < 2500 && !e.fini; i++) {
            const g = e.graines.map(x => ({ x, d: Math.hypot(x.x - e.tete.x, x.y - e.tete.y) }))
                .sort((a, b) => a.d - b.d)[0];
            const cap = g ? Math.atan2(g.x.y - e.tete.y, g.x.x - e.tete.x) : null;
            const avant = e.graines.length;
            const r = avancer(e, 1 / 60, cap);
            if (r.etat.graines.length < avant) {
                ramasses.push(e.graines.find(x => !r.etat.graines.includes(x)).t);
            }
            e = r.etat;
            [-1, 0, 2, 5].forEach(x => assert.equal(vaut(e.corps, x), vaut(ramasses, x),
                `${expression(e.corps)} ≠ somme des ${ramasses.length} termes ramassés`));
        }
    }
});

test('LE MUR NE DOIT PAS ÊTRE LE PRINCIPAL ADVERSAIRE', () => {
    // La difficulté doit venir des mathématiques, pas du pilotage. On fait donc
    // jouer un pilote AVEUGLE — il fonce au terme le plus proche, sans jamais
    // regarder le bord — et l'on compte de quoi il meurt.
    //
    // Première mesure : 86 morts contre le mur sur 180 parties, 32 % de
    // terrains nettoyés. La faute n'était pas au pilote : on semait jusqu'à
    // 2,7 unités du bord alors que le serpent tourne sur un rayon de 3,8. Un
    // terme posé là ne PEUT pas se prendre sans finir dans le mur — ce n'est
    // pas une difficulté, c'est un piège. Marge portée à 1,7 rayon de virage :
    // 19 morts, 54 % nettoyés.
    //
    // Les parties non finies, elles, sont l'affaire du pilote : sans anticiper,
    // il tourne en rond autour d'un terme qu'il a dépassé. Un joueur ne fait
    // pas ça, et l'on ne mesure donc pas cela ici.
    const sorts = { gagne: 0, mur: 0, mordu: 0, encours: 0 };
    for (let i = 0; i < 24; i++) {
        let e = nouvellePartie(makeRng(`jouable${i}`), i % NIVEAUX.length);
        for (let k = 0; k < 4000 && !e.fini; k++) {
            const g = e.graines.map(x => ({ x, d: Math.hypot(x.x - e.tete.x, x.y - e.tete.y) }))
                .sort((a, b) => a.d - b.d)[0];
            e = avancer(e, 1 / 60, g ? Math.atan2(g.x.y - e.tete.y, g.x.x - e.tete.x) : null).etat;
        }
        sorts[e.fini || 'encours'] += 1;
    }
    assert.ok(sorts.mur <= sorts.gagne / 2,
        `le mur tue ${sorts.mur} fois pour ${sorts.gagne} terrains nettoyés : il est semé trop près du bord`);
    assert.ok(sorts.gagne >= 8, `seulement ${sorts.gagne} terrains nettoyés sur 24`);
});

test('aucun terme n\'est semé dans le rayon de virage du bord', () => {
    // La règle en clair, éprouvée directement plutôt que par ses conséquences.
    for (let i = 0; i < 20; i++) {
        const p = nouvellePartie(makeRng(`bord${i}`), i % NIVEAUX.length);
        const marge = p.niv.vitesse / p.niv.virage;
        p.graines.forEach(g => {
            const d = Math.min(g.x, g.y, p.niv.large - g.x, p.niv.haut - g.y);
            assert.ok(d >= marge,
                `un terme à ${d.toFixed(1)} du bord, pour un rayon de virage de ${marge.toFixed(1)}`);
        });
    }
});

test('la longueur idéale est le nombre de familles semées', () => {
    const p = nouvellePartie(makeRng('ideal'), 3);
    assert.equal(longueurIdeale(p.graines), new Set(p.graines.map(g => g.t.e)).size);
});

test('les niveaux montent : plus de termes, plus vite, virage plus serré', () => {
    for (let i = 1; i < NIVEAUX.length; i++) {
        assert.ok(NIVEAUX[i].termes >= NIVEAUX[i - 1].termes, `${NIVEAUX[i].titre} : moins de termes`);
        assert.ok(NIVEAUX[i].vitesse >= NIVEAUX[i - 1].vitesse, `${NIVEAUX[i].titre} : plus lent`);
        assert.ok(NIVEAUX[i].virage <= NIVEAUX[i - 1].virage, `${NIVEAUX[i].titre} : tourne mieux`);
    }
    assert.deepEqual(NIVEAUX[0].exposants, [0, 1], 'on commence par « 2x + 3 ne se réduit pas »');
    assert.ok(NIVEAUX.some(n => n.negatifs) && NIVEAUX.some(n => n.exposants.includes(3)));
});

test('L\'AIRE PREND LA FORME DE L\'ÉCRAN, à surface constante', () => {
    const niv = NIVEAUX[0];
    const aire = niv.large * niv.haut;
    [[330 / 470, 'téléphone debout'], [740 / 240, 'téléphone couché'],
     [1, 'écran carré'], [1340 / 678, 'ordinateur']].forEach(([r, quoi]) => {
        const f = formePourEcran(niv, r);
        assert.ok(f.large >= 30 && f.haut >= 30, `${quoi} : un côté trop court pour se retourner`);
        assert.ok(Math.abs(f.large * f.haut - aire) / aire < 0.12, `${quoi} : ${f.large}×${f.haut}`);
        assert.ok(Math.abs(Math.log((f.large / f.haut) / r)) < 0.5, `${quoi} : forme trop loin`);
    });
    NIVEAUX.forEach(n => assert.deepEqual(formePourEcran(n, null), { large: n.large, haut: n.haut }));
});

test('LA CONSIGNE NE DONNE PAS LA RÈGLE DE RÉDUCTION', () => {
    // Elle dit ce qui se passe — « ils fusionnent » — sans nommer le critère.
    assert.doesNotMatch(CONSIGNE, /même exposant|même puissance|coefficient/i);
    assert.match(CONSIGNE, /fusionnent/i);
});
