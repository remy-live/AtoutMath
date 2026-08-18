// LE PAVAGE : par rapport à quoi ces deux pièces sont-elles symétriques ?
//
// Un seul défaut compte ici, et il est rédhibitoire : une question à DEUX
// bonnes réponses. Une pièce qui a son propre axe se retrouve sur elle-même de
// plusieurs façons ; deux carrés voisins se correspondent par une droite ET par
// un point. Si une telle paire passait, la machine donnerait tort à un élève
// qui a raison, et il n'aurait aucun moyen de le savoir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    ECART_MINIMAL, MOTIFS, distanceEntre, elementUnique, leurres, parElement,
    pavageGenerator as G, poserLePavage, tousLesElements
} from '../js/core/generators/pavage.js';
import { memeFigure } from '../js/core/transformations.js';
import { cleElement, ecrireElement, lireElement, memeElement } from '../js/core/elementSymetrie.js';
import { caseCentrale } from '../js/core/quadrillageSvg.js';
import { marcheDe, MARCHES } from '../js/core/activities/symetrieElement.js';

const TIRAGES = 100;

// --- Les éléments possibles ---------------------------------------------------

test('LES CANDIDATS TOMBENT SUR LES LIGNES ET LES NŒUDS, jamais au milieu d\'une case', () => {
    // C'est ce qui fait que leurs coordonnées sont des ENTIERS dans le repère
    // de l'élève : « x = 4 » et non « x = 3,5 ».
    tousLesElements(10, 10).forEach(el => {
        const v = el.genre === 'axe' ? [el.axe.a] : [el.centre.x, el.centre.y];
        v.forEach(n => assert.equal(n % 1, 0.5, `${JSON.stringify(el)} n'est pas sur une ligne`));
        assert.match(ecrireElement(10, el), /^(x|y) = \d+$|^\(\d+ ; \d+\)$/);
    });
});

test('un élément appliqué deux fois ramène la figure à sa place', () => {
    const f = [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 4 }];
    tousLesElements(10, 10).slice(0, 30).forEach(el => {
        assert.ok(memeFigure(parElement(parElement(f, el), el), f), 'une symétrie est involutive');
    });
});

// --- Le pavage ----------------------------------------------------------------

test('les pièces ne se chevauchent jamais et tiennent dans le pavage', () => {
    for (let i = 0; i < 50; i++) {
        const pieces = poserLePavage(makeRng('p' + i), { l: 10, h: 10, cases: 4, pieces: 4 });
        if (!pieces) continue;
        const vues = new Set();
        pieces.forEach(f => {
            assert.equal(f.length, pieces[0].length, 'des pièces de tailles différentes');
            f.forEach(c => {
                assert.ok(!vues.has(`${c.x}|${c.y}`), 'deux pièces sur la même case');
                vues.add(`${c.x}|${c.y}`);
                assert.ok(c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10, 'pièce hors du pavage');
            });
        });
    }
});

test('deux pièces ne sont jamais posées au même endroit', () => {
    for (let i = 0; i < 40; i++) {
        const pieces = poserLePavage(makeRng('r' + i), { l: 10, h: 10, cases: 4, pieces: 4 });
        if (!pieces) continue;
        for (let a = 0; a < pieces.length; a++) {
            for (let b = a + 1; b < pieces.length; b++) {
                assert.ok(!memeFigure(pieces[a], pieces[b]), 'deux pièces identiques');
            }
        }
    }
});

// --- LA GARANTIE : UNE SEULE RÉPONSE ------------------------------------------

test('L\'ÉLÉMENT ANNONCÉ EST LE SEUL QUI CONVIENNE', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('u' + i), index: i }).meta;
        // Il envoie bien la première pièce sur la seconde…
        assert.ok(memeFigure(parElement(m.pieces[m.de], m.bon), m.pieces[m.vers]),
            'l\'élément annoncé ne transforme pas la pièce');
        // …et aucun autre du quadrillage ne le fait.
        const tous = tousLesElements(m.largeur, m.hauteur)
            .filter(el => memeFigure(parElement(m.pieces[m.de], el), m.pieces[m.vers]));
        assert.equal(tous.length, 1, `${tous.length} réponses justes pour une seule question`);
        assert.ok(memeElement(tous[0], m.bon));
    }
});

test('AUCUN LEURRE NE MARCHE, ET LE BON EST BIEN PARMI LES CANDIDATS', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('c' + i), index: i });
        const m = it.meta;
        const justes = m.candidats.filter(c =>
            memeFigure(parElement(m.pieces[m.de], c), m.pieces[m.vers]));
        assert.equal(justes.length, 1, 'plus d\'un candidat convient');
        assert.equal(cleElement(justes[0]), it.answer);
        assert.equal(justes[0].id, m.idJuste);
    }
});

test('elementUnique refuse une paire ambiguë', () => {
    // Un carré 2 × 2 et son voisin : une droite ET un point les relient.
    const carre = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
    const voisin = carre.map(p => ({ x: p.x + 4, y: p.y }));
    const relient = tousLesElements(10, 10)
        .filter(el => memeFigure(parElement(carre, el), voisin));
    assert.ok(relient.length > 1, 'le cas de référence a changé');
    assert.equal(elementUnique(carre, voisin, 10, 10), null);
});

test('les leurres n\'incluent jamais une seconde bonne réponse', () => {
    for (let i = 0; i < 40; i++) {
        const m = G.generate({}, { rng: makeRng('l' + i), index: i }).meta;
        const faux = leurres(makeRng('f' + i), m.bon, m.pieces, m.de, m.vers,
            { l: m.largeur, h: m.hauteur }, 3);
        faux.forEach(el => {
            assert.ok(!memeElement(el, m.bon), 'le bon élément proposé comme leurre');
            assert.ok(!memeFigure(parElement(m.pieces[m.de], el), m.pieces[m.vers]),
                'un leurre qui marche est une seconde bonne réponse');
        });
    }
});

test('DEUX CANDIDATS NE SE MARCHENT JAMAIS DESSUS', () => {
    // Pris seulement « au plus près du bon », trois centres tombaient dans le
    // même carreau : les croix se chevauchaient et leurs noms formaient un
    // nœud. On ne demandait plus de chercher un point, mais de démêler un
    // dessin.
    for (let i = 0; i < 80; i++) {
        const m = G.generate({}, { rng: makeRng('sp' + i), index: i }).meta;
        for (let a = 0; a < m.candidats.length; a++) {
            for (let b = a + 1; b < m.candidats.length; b++) {
                assert.ok(distanceEntre(m.candidats[a], m.candidats[b], m.largeur, m.hauteur) >= ECART_MINIMAL,
                    `${m.candidats[a].nom} et ${m.candidats[b].nom} se chevauchent`);
            }
        }
    }
});

test('deux droites perpendiculaires ne se confondent jamais', () => {
    // Elles se croisent : quel que soit l'endroit, on les distingue. Les
    // écarter comme deux parallèles aurait privé la question de son leurre le
    // plus utile.
    const v = { genre: 'axe', axe: { type: 'v', a: 3.5 } };
    const hh = { genre: 'axe', axe: { type: 'h', a: 3.5 } };
    assert.equal(distanceEntre(v, hh, 10, 10), Infinity);
    assert.equal(distanceEntre(v, { genre: 'axe', axe: { type: 'v', a: 5.5 } }, 10, 10), 2);
    // Un point et une droite : la distance du point à la droite.
    assert.equal(distanceEntre({ genre: 'point', centre: { x: 6.5, y: 2.5 } }, v, 10, 10), 3);
});

test('UN CANDIDAT AU MOINS EST DE L\'AUTRE ESPÈCE', () => {
    // Si tous étaient des droites, la question « axe ou centre ? » ne se
    // poserait plus — or c'est la première chose à trancher.
    for (let i = 0; i < 60; i++) {
        const m = G.generate({}, { rng: makeRng('e' + i), index: i }).meta;
        const especes = new Set(m.candidats.map(c => c.genre));
        assert.equal(especes.size, 2, 'tous les candidats sont de la même espèce');
    }
});

// --- L'item -------------------------------------------------------------------

test('la réponse enregistrée est l\'ÉLÉMENT, pas son nom', () => {
    // Le nom change d'une question à l'autre : (d₁) ici, (d₃) là. Trois élèves
    // qui désignent la même droite — en la choisissant, en la cliquant, en
    // l'écrivant — doivent être comptés pareil.
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('a' + i), index: i });
        assert.match(it.answer, /^(axe:[vh]:|point:)/);
        assert.equal(it.answer, cleElement(it.meta.bon));
        // Et l'écriture attendue se relit exactement en cette même réponse.
        const relu = lireElement(it.meta.hauteur, ecrireElement(it.meta.hauteur, it.meta.bon));
        assert.equal(cleElement(relu), it.answer);
    }
});

test('les propositions portent les noms tracés, et une seule est juste', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('n' + i), index: i });
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        const noms = new Set(it.meta.candidats.map(c => c.nom));
        it.choices.forEach(c => assert.ok(noms.has(String(c.value)), `« ${c.value} » n'est pas tracé`));
        assert.equal(new Set(it.choices.map(c => String(c.value))).size, it.choices.length,
            'deux propositions portent le même nom');
    }
});

test('LE BON N\'EST PAS TOUJOURS LE PREMIER NOMMÉ', () => {
    // Nommés avant d'être mélangés, (d₁) serait devenu la réponse à tout.
    const rangs = new Set();
    for (let i = 0; i < 60; i++) {
        const m = G.generate({}, { rng: makeRng('m' + i), index: i }).meta;
        rangs.add(m.candidats.findIndex(c => c.id === m.idJuste));
    }
    assert.ok(rangs.size >= 3, `le bon candidat n'occupe que ${rangs.size} position(s)`);
});

test('chaque mauvaise proposition dit POURQUOI ce n\'est pas elle', () => {
    for (let i = 0; i < 30; i++) {
        const it = G.generate({}, { rng: makeRng('w' + i), index: i });
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.ok(c.why && c.why.length > 40, `« ${c.value} » sans explication`);
        });
    }
});

test('la question désigne deux pièces distinctes, par leur lettre', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('q' + i), index: i });
        const m = it.meta;
        assert.notEqual(m.de, m.vers);
        assert.match(it.prompt.text, new RegExp(`pièce ${m.noms[m.vers]} `));
        assert.match(it.prompt.text, new RegExp(`pièce ${m.noms[m.de]} `));
        assert.match(it.prompt.text, /Par rapport à quoi/);
        assert.equal(new Set(m.noms).size, m.noms.length, 'deux pièces portent la même lettre');
    }
});

test('la correction nomme l\'élément ET l\'écrit', () => {
    for (let i = 0; i < 30; i++) {
        const it = G.generate({}, { rng: makeRng('x' + i), index: i });
        const attendu = ecrireElement(it.meta.hauteur, it.meta.bon);
        assert.ok(it.explanation.includes(attendu), `« ${attendu} » absent de la correction`);
        assert.ok(it.explicationPapier.includes(attendu));
    }
});

test('l\'énoncé porte le pavage gradué, ses lettres et ses candidats', () => {
    const it = G.generate({}, { rng: makeRng('svg'), index: 0 });
    assert.match(it.prompt.html, /figure-wrap/);
    assert.match(it.prompt.html, /qd-piece/);
    assert.match(it.prompt.html, /qd-etiquette/);
    assert.match(it.prompt.html, /qd-gradu/, 'sans graduations, on ne peut rien écrire');
    assert.match(it.prompt.html, /qd-candidat/);
    assert.match(it.prompt.html, /qd-piece--source/);
    assert.match(it.prompt.html, /qd-piece--cible/);
});

test('une même graine redonne exactement la même question', () => {
    const a = G.generate({}, { rng: makeRng('idem'), index: 0 });
    const b = G.generate({}, { rng: makeRng('idem'), index: 0 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});

// --- Les réglages -------------------------------------------------------------

test('le réglage « Ce qu\'on cherche » est respecté', () => {
    for (const espece of ['axe', 'point']) {
        let obtenus = 0;
        for (let i = 0; i < 25; i++) {
            if (G.generate({ especes: [espece] }, { rng: makeRng(espece + i), index: i }).meta.genre === espece) obtenus++;
        }
        assert.ok(obtenus >= 20, `${espece} : ${obtenus}/25 seulement`);
    }
});

test('LES DEUX ESPÈCES SORTENT, ET AUCUNE NE NOIE L\'AUTRE', () => {
    // Un quadrillage porte l × h centres possibles contre l + h axes : tiré
    // uniformément, le centre écrasait l'axe deux fois sur trois. Or l'axe
    // s'apprend en premier.
    const compte = { axe: 0, point: 0 };
    for (let i = 0; i < 120; i++) {
        compte[G.generate({}, { rng: makeRng('b' + i), index: i }).meta.genre]++;
    }
    assert.ok(compte.axe >= 30, `seulement ${compte.axe} axes sur 120`);
    assert.ok(compte.point >= 30, `seulement ${compte.point} centres sur 120`);
});

test('un réglage arrivé en chaîne ou vide ne fait pas disparaître l\'exercice', () => {
    for (const especes of ['axe,point', 'axe', '', undefined, null, 42]) {
        const it = G.generate({ especes }, { rng: makeRng('forme'), index: 0 });
        assert.match(it.prompt.html, /<svg/, `pas de figure pour ${JSON.stringify(especes)}`);
        assert.ok(it.answer.length > 0);
    }
});

test('le pavage suit le réglage de taille', () => {
    const p = G.generate({ taille: 'petit' }, { rng: makeRng('tp'), index: 0 }).meta;
    const g = G.generate({ taille: 'grand' }, { rng: makeRng('tg'), index: 0 }).meta;
    assert.equal(p.largeur, 8);
    assert.equal(p.candidats.length, 3);
    assert.equal(g.largeur, 12);
    assert.equal(g.candidats.length, 5);
});

test('LE TYPE DE CHAQUE RÉGLAGE EXISTE VRAIMENT', () => {
    const CONNUS = ['select', 'multiselect', 'checkbox', 'number', 'text'];
    (G.params || []).forEach(p => {
        assert.ok(CONNUS.includes(p.type), `${p.id} : type « ${p.type} » inconnu du panneau`);
    });
});

// --- Les trois marches --------------------------------------------------------

test('le préréglage monte : on choisit, puis on clique, puis on écrit', () => {
    assert.equal(marcheDe('progressive', 0, 9), 'choisir');
    assert.equal(marcheDe('progressive', 2, 9), 'choisir');
    assert.equal(marcheDe('progressive', 3, 9), 'cliquer');
    assert.equal(marcheDe('progressive', 5, 9), 'cliquer');
    assert.equal(marcheDe('progressive', 6, 9), 'ecrire');
    assert.equal(marcheDe('progressive', 8, 9), 'ecrire');
});

test('une marche choisie explicitement ne bouge plus', () => {
    MARCHES.forEach(m => {
        assert.equal(marcheDe(m, 0, 10), m);
        assert.equal(marcheDe(m, 9, 10), m);
    });
});

test('sans nombre de questions annoncé, la progression reste sensée', () => {
    // Un entraînement libre n'a pas de fin annoncée : on prend dix, ce qui
    // donne la même progression sur les dix premières questions.
    assert.equal(marcheDe('progressive', 0, 0), 'choisir');
    assert.equal(marcheDe('progressive', 4, undefined), 'cliquer');
});

// --- L'étiquette --------------------------------------------------------------

test('la lettre se pose sur une case de la pièce, jamais dans son creux', () => {
    const L = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
    const c = caseCentrale(L);
    assert.ok(L.some(p => p.x === c.x && p.y === c.y), 'la lettre tombe hors de la pièce');
    for (let i = 0; i < 30; i++) {
        const m = G.generate({}, { rng: makeRng('et' + i), index: i }).meta;
        m.pieces.forEach(f => {
            const k = caseCentrale(f);
            assert.ok(f.some(p => p.x === k.x && p.y === k.y));
        });
    }
});

test('les motifs sont ceux des pavages de fiches, et tous connexes', () => {
    assert.ok(MOTIFS.length >= 4);
    MOTIFS.forEach(m => {
        const vues = new Set([`${m[0].x}|${m[0].y}`]);
        const pile = [m[0]];
        while (pile.length) {
            const p = pile.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const v = m.find(q => q.x === p.x + dx && q.y === p.y + dy);
                if (v && !vues.has(`${v.x}|${v.y}`)) { vues.add(`${v.x}|${v.y}`); pile.push(v); }
            }
        }
        assert.equal(vues.size, m.length, 'motif en morceaux');
    });
});
