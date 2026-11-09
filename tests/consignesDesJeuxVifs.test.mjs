// LA CONSIGNE QUI CHANGE — l'arbitre commun des trois jeux vifs.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Je préfère un jeu assez rapide fun », puis « Les 3 sont top tu peux
// y aller » — le chat perché, la ruée, la pluie.
//
// ── CE QUE CES ÉPREUVES GARDENT, ET POURQUOI ELLES COMPTENT TRIPLE ────────
//
// UN SEUL ARBITRE POUR TROIS JEUX. Si « 51 est-il premier » recevait une
// réponse ici et une autre là, l'élève serait pris au chat perché pour une
// raison qui lui donnerait des points à la ruée — et PERSONNE NE LE VERRAIT,
// parce que chaque jeu, pris seul, aurait l'air juste.
//
// ET LA PART DE BONS NOMBRES EST UNE RÈGLE DE JEU, pas un détail de tirage :
// un terrain où tout obéit se ramasse les yeux fermés, un terrain où rien
// n'obéit fait courir trente élèves pour rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    FAMILLES, estPremier, estCarre, obeit, texteDeLaConsigne,
    tirerUneConsigne, tirerDesNombres, combienObeissent
} from '../js/core/consignes.js';
import { makeRng } from '../js/core/ids.js';

/* ───────────────────────────── LES DEUX OUTILS ─────────────────────────── */

test('LES NOMBRES PREMIERS SONT LES BONS — y compris les pièges', () => {
    // LES TROIS QUI PIÈGENT TOUT LE MONDE : 1 n'est pas premier, 2 l'est
    // malgré sa parité, et 51 = 3 × 17 ne l'est pas alors qu'il en a l'air.
    assert.equal(estPremier(1), false, '1 n\'est pas premier');
    assert.equal(estPremier(2), true, '2 est le seul premier pair');
    assert.equal(estPremier(51), false, '51 = 3 × 17');
    assert.equal(estPremier(91), false, '91 = 7 × 13');
    assert.equal(estPremier(97), true);
    assert.equal(estPremier(0), false);
    assert.equal(estPremier(-7), false);
    // ET LES VINGT-CINQ PREMIERS, comptés : c'est le genre de nombre qu'une
    // faute d'un cran dans une boucle fait passer à vingt-quatre ou vingt-six.
    const sousCent = [];
    for (let n = 0; n <= 100; n++) if (estPremier(n)) sousCent.push(n);
    assert.equal(sousCent.length, 25, 'il y a 25 nombres premiers sous 100');
});

test('ET LES CARRÉS PARFAITS AUSSI', () => {
    assert.equal(estCarre(0), true);
    assert.equal(estCarre(1), true);
    assert.equal(estCarre(49), true);
    assert.equal(estCarre(50), false);
    assert.equal(estCarre(-4), false, 'un carré n\'est jamais négatif');
});

/* ─────────────────────────── L'ARBITRE DES TROIS ───────────────────────── */

test('UN SEUL ARBITRE RÉPOND POUR LES TROIS JEUX', () => {
    assert.equal(obeit({ famille: 'multiples', parametre: 6 }, 42), true);
    assert.equal(obeit({ famille: 'multiples', parametre: 6 }, 51), false);
    assert.equal(obeit({ famille: 'parite', parametre: 0 }, 42), true);
    assert.equal(obeit({ famille: 'parite', parametre: 1 }, 42), false);
    assert.equal(obeit({ famille: 'premiers' }, 53), true);
    assert.equal(obeit({ famille: 'carres' }, 64), true);
    assert.equal(obeit({ famille: 'comparaison', parametre: 40, sens: 1 }, 41), true);
    assert.equal(obeit({ famille: 'comparaison', parametre: 40, sens: 1 }, 40), false,
        '« plus grand que 40 » exclut 40');
    assert.equal(obeit({ famille: 'comparaison', parametre: 40, sens: -1 }, 39), true);
    assert.equal(obeit({ famille: 'encadrement', parametre: 10, jusqua: 20 }, 10), true,
        '« entre 10 et 20 » inclut ses bornes');
    assert.equal(obeit({ famille: 'encadrement', parametre: 10, jusqua: 20 }, 21), false);
});

test('ET IL NE DIT JAMAIS OUI À CE QU\'IL NE COMPREND PAS', () => {
    // UNE CONSIGNE INCONNUE NE SAUVE PERSONNE AU CHAT PERCHÉ et ne rapporte
    // rien à la ruée. Le contraire — répondre `true` par défaut — ferait d'un
    // réglage mal recopié un terrain où TOUT se ramasse, et le jeu aurait
    // l'air de marcher.
    assert.equal(obeit({ famille: 'inventée' }, 7), false);
    assert.equal(obeit(null, 7), false);
    assert.equal(obeit({ famille: 'multiples', parametre: 6 }, 'bonjour'), false);
    assert.equal(obeit({ famille: 'multiples', parametre: 0 }, 0), false,
        'un multiple de zéro n\'est pas une consigne');
});

/* ──────────────────────── CE QU'ON CRIE À LA CLASSE ────────────────────── */

test('LA CONSIGNE SE LIT EN UNE DEMI-SECONDE, DU FOND DE LA SALLE', () => {
    assert.equal(texteDeLaConsigne({ famille: 'multiples', parametre: 7 }),
        'LES MULTIPLES DE 7');
    assert.equal(texteDeLaConsigne({ famille: 'parite', parametre: 1 }),
        'LES NOMBRES IMPAIRS');
    assert.equal(texteDeLaConsigne({ famille: 'comparaison', parametre: 40, sens: -1 }),
        'PLUS PETIT QUE 40');
    assert.equal(texteDeLaConsigne({ famille: 'encadrement', parametre: 10, jusqua: 25 }),
        'ENTRE 10 ET 25');
    assert.equal(texteDeLaConsigne(null), '');
});

test('UNE CONSIGNE NEUVE N\'EST JAMAIS CELLE QU\'ON VIENT DE LIRE', () => {
    // SINON L'ÉLÈVE CROIT QU'IL A MAL LU. L'écran annonce « NOUVELLE
    // CONSIGNE », la phrase ne bouge pas, et il perd les trois secondes qui
    // comptent à chercher ce qui a changé.
    const rng = makeRng('suite');
    let avant = null;
    for (let i = 0; i < 40; i++) {
        const c = tirerUneConsigne(rng, { precedente: avant });
        assert.notEqual(texteDeLaConsigne(c), texteDeLaConsigne(avant),
            `deux fois de suite : ${texteDeLaConsigne(c)}`);
        avant = c;
    }
});

test('ON NE TIRE QUE DANS LES FAMILLES AUTORISÉES', () => {
    // C'est ce qui permettra au professeur de dire « pas les nombres premiers
    // aujourd'hui ». Une famille qui s'inviterait quand même ferait courir une
    // classe de sixième après des carrés parfaits.
    const rng = makeRng('familles');
    for (let i = 0; i < 60; i++) {
        const c = tirerUneConsigne(rng, { familles: ['multiples', 'parite'] });
        assert.ok(['multiples', 'parite'].includes(c.famille), c.famille);
    }
    // ET UNE LISTE VIDE NE BLOQUE PAS LE JEU : on retombe sur toutes les
    // familles plutôt que de tirer indéfiniment dans le vide.
    assert.ok(FAMILLES[tirerUneConsigne(makeRng('vide'), { familles: [] }).famille]);
});

/* ─────────────────── CE QUI DÉCIDE SI LE JEU EST JOUABLE ───────────────── */

test('UN TERRAIN PORTE TOUJOURS DE QUOI JOUER, et de quoi se tromper', () => {
    // LA RÈGLE DE JEU LA PLUS IMPORTANTE DES TROIS : un terrain où tout obéit
    // se ramasse les yeux fermés ; un terrain où rien n'obéit fait courir
    // trente élèves pour rien.
    const rng = makeRng('terrain');
    for (let i = 0; i < 30; i++) {
        const c = tirerUneConsigne(rng, {});
        const ns = tirerDesNombres(c, rng, { combien: 14, maxi: 99 });
        assert.equal(ns.length, 14, `${ns.length} nombres au lieu de 14`);
        const bons = combienObeissent(c, ns);
        assert.ok(bons >= 3, `${texteDeLaConsigne(c)} : ${bons} bon(s) sur 14`);
        assert.ok(bons <= 11, `${texteDeLaConsigne(c)} : ${bons} bons sur 14, trop facile`);
    }
});

test('ET LA PART DEMANDÉE EST TENUE', () => {
    const rng = makeRng('part');
    const c = { famille: 'multiples', parametre: 3 };
    const ns = tirerDesNombres(c, rng, { combien: 20, part: 0.5, maxi: 99 });
    assert.equal(combienObeissent(c, ns), 10, JSON.stringify(ns));
});

test('LES BONS NE SORTENT PAS TOUS EN PREMIER', () => {
    // SANS MÉLANGE, le terrain se lirait à sa seule disposition : les bons
    // nombres d'un côté, les autres de l'autre. L'élève gagnerait sans faire
    // la moindre arithmétique, ce qui est exactement ce qu'on veut empêcher.
    const rng = makeRng('melange');
    const c = { famille: 'parite', parametre: 0 };
    const ns = tirerDesNombres(c, rng, { combien: 20, part: 0.5, maxi: 99 });
    const places = ns.map((n, i) => (obeit(c, n) ? i : -1)).filter(i => i >= 0);
    const moyenne = places.reduce((a, b) => a + b, 0) / places.length;
    // Au milieu, à un quart près : si les dix bons occupaient les dix
    // premières places, la moyenne vaudrait 4,5 au lieu de 9,5.
    assert.ok(Math.abs(moyenne - (ns.length - 1) / 2) < ns.length / 4,
        `les bons sont groupés : places ${JSON.stringify(places)}`);
});

test('UNE CONSIGNE IMPOSSIBLE NE FAIT PAS TOURNER LE JEU SANS FIN', () => {
    // LE CAS QUI PEND AU NEZ DE CE JEU : « plus grand que 95 » sur un terrain
    // qui ne monte qu'à 20. Aucun nombre ne peut obéir — et sans le plafond
    // d'essais, la boucle cherche une aiguille que la consigne n'a pas mise
    // dans le foin. Trente écrans figés d'un coup, sans la moindre erreur.
    //
    // ON REND CE QU'ON A TROUVÉ : un terrain pauvre reste un terrain, et les
    // jeux savent le voir (`combienObeissent` rend zéro, et ils retirent une
    // consigne). C'est le seul comportement qui laisse la classe jouer.
    const parti = Date.now();
    const ns = tirerDesNombres({ famille: 'comparaison', parametre: 95, sens: 1 },
        makeRng('impossible'), { combien: 10, mini: 2, maxi: 20, part: 0.5 });
    assert.ok(Date.now() - parti < 400, 'le tirage s\'éternise');
    assert.ok(ns.length >= 4 && ns.length <= 10, `${ns.length} nombre(s)`);
    assert.equal(combienObeissent({ famille: 'comparaison', parametre: 95, sens: 1 }, ns), 0);
    // ET UNE CONSIGNE SEULEMENT RARE REND BIEN SON COMPTE : « les carrés
    // parfaits » entre 2 et 20 n'en a que trois, mais rien n'interdit de poser
    // deux fois le 9 sur un terrain.
    const carres = tirerDesNombres({ famille: 'carres' }, makeRng('rare'),
        { combien: 20, mini: 2, maxi: 20, part: 0.5 });
    assert.equal(carres.length, 20);
    assert.ok(combienObeissent({ famille: 'carres' }, carres) >= 8);
});
