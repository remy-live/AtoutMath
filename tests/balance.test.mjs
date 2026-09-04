// LA BALANCE — l'algèbre du modèle, sans écran.
//
// Ce qu'on éprouve ici n'est pas « le jeu marche » mais « la balance ne ment
// jamais » : quel que soit le chemin suivi, l'égalité de départ et l'égalité
// d'arrivée ont la même solution. Un modèle d'équation qui perd sa solution en
// route enseignerait le contraire de ce qu'on veut.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    NIVEAUX, FAMILLES, ORDRE_FAMILLES, CONSIGNE,
    etatInitial, appliquer, resolu, solution, enSymboles, pese, penche,
    preparerNiveau, niveauxDisponibles, coups
} from '../js/core/balance.js';

const eq = (a, b, c, d) => etatInitial({ a, b, c, d });

test('l\'équation s\'écrit en symboles comme au tableau', () => {
    assert.equal(enSymboles(eq(1, 3, 0, 8)), 'x + 3 = 8');
    assert.equal(enSymboles(eq(3, 0, 0, 12)), '3x = 12');
    assert.equal(enSymboles(eq(4, 2, 1, 14)), '4x + 2 = x + 14');
    // Un plateau vide s'écrit « 0 », pas une chaîne vide.
    assert.equal(enSymboles(eq(0, 0, 1, 0)), '0 = x');
});

test('ENLEVER D\'UN SEUL CÔTÉ FAIT PENCHER — et c\'est autorisé', () => {
    const r = appliquer(eq(1, 3, 0, 8), { geste: 'enlever', cote: 'g', quoi: 'u', combien: 3 });
    assert.equal(r.ok, true);
    assert.deepEqual(r.etat.attente, { cote: 'g', quoi: 'u', combien: 3 });
    assert.match(r.dit, /penche/i);
    // L'égalité est bel et bien rompue : x + 3 = 8 a pour solution 5, mais
    // « x = 8 » ne l'a plus.
    assert.equal(pese(r.etat.g, 5), 5);
    assert.equal(pese(r.etat.d, 5), 8);
    assert.equal(penche(r.etat, 5), 1, 'la droite descend');
});

test('LA DETTE S\'ACCUMULE d\'un côté et se rembourse de l\'autre', () => {
    // La première version exigeait le geste jumeau exact, d'un seul coup :
    // « x + 4 = 9 » forçait alors huit clics alternés, ce qui cache le geste
    // qu'on veut montrer. On clique maintenant autant qu'on veut d'un côté,
    // puis autant de l'autre.
    let e = eq(2, 4, 0, 10);
    const un = (cote, quoi = 'u') => appliquer(e, { geste: 'enlever', cote, quoi, combien: 1 });

    let r = un('g'); assert.equal(r.ok, true); e = r.etat;
    assert.deepEqual(e.attente, { cote: 'g', quoi: 'u', combien: 1 });
    r = un('g'); assert.equal(r.ok, true, 'on peut continuer du même côté'); e = r.etat;
    r = un('g'); e = r.etat;
    assert.equal(e.attente.combien, 3, 'la balance penche de trois');
    assert.match(r.dit, /penche/i);

    // On rembourse par petits bouts : la balance reste penchée entre-temps.
    r = un('d'); assert.equal(r.ok, true); e = r.etat;
    assert.equal(e.attente.combien, 2);
    assert.match(r.dit, /Encore 2/);
    e = un('d').etat;
    r = un('d'); e = r.etat;
    assert.equal(e.attente, null, 'la dette est soldée');
    assert.equal(enSymboles(e), '2x + 1 = 7');
});

test('on ne mélange pas deux gestes, et on ne rembourse pas trop', () => {
    let e = eq(2, 4, 0, 10);
    e = appliquer(e, { geste: 'enlever', cote: 'g', quoi: 'u', combien: 4 }).etat;

    // Commencer un geste sur les boîtes alors qu'on doit des poids : refusé.
    const melange = appliquer(e, { geste: 'enlever', cote: 'g', quoi: 'x', combien: 1 });
    assert.equal(melange.ok, false);
    assert.match(melange.dit, /termine ce geste/i);

    // Rendre PLUS que ce qu'on a pris ferait pencher de l'autre côté.
    const trop = appliquer(e, { geste: 'enlever', cote: 'd', quoi: 'u', combien: 6 });
    assert.equal(trop.ok, false);
    assert.match(trop.dit, /pencher de l'autre côté/i);

    // Le geste jumeau exact : la balance se redresse.
    const bon = appliquer(e, { geste: 'enlever', cote: 'd', quoi: 'u', combien: 4 });
    assert.equal(bon.ok, true);
    assert.equal(bon.etat.attente, null);
    assert.equal(enSymboles(bon.etat), '2x = 6');
});

test('CLIC PAR CLIC OU D\'UN SEUL COUP, on arrive au même endroit', () => {
    // L'invariant qui protège le raccourci : quatre clics d'un côté puis quatre
    // de l'autre doivent donner exactement l'état d'un « enlever 4, enlever 4 ».
    const gros = [
        { geste: 'enlever', cote: 'g', quoi: 'u', combien: 4 },
        { geste: 'enlever', cote: 'd', quoi: 'u', combien: 4 }
    ];
    let a = eq(2, 4, 0, 10);
    gros.forEach(g => { a = appliquer(a, g).etat; });

    let b = eq(2, 4, 0, 10);
    for (const cote of ['g', 'g', 'g', 'g', 'd', 'd', 'd', 'd']) {
        const r = appliquer(b, { geste: 'enlever', cote, quoi: 'u', combien: 1 });
        assert.equal(r.ok, true, `clic ${cote} refusé`);
        b = r.etat;
    }
    assert.deepEqual(b, a);
});

test('on n\'enlève pas ce qui n\'est pas là', () => {
    const r = appliquer(eq(1, 3, 0, 8), { geste: 'enlever', cote: 'g', quoi: 'u', combien: 5 });
    assert.equal(r.ok, false);
    assert.match(r.dit, /pas 5 poids/);
    const b = appliquer(eq(1, 3, 0, 8), { geste: 'enlever', cote: 'd', quoi: 'x', combien: 1 });
    assert.equal(b.ok, false);
    assert.match(b.dit, /boîte/);
});

test('PARTAGER PORTE SUR LA BALANCE ENTIÈRE, jamais sur un plateau', () => {
    const r = appliquer(eq(3, 0, 0, 12), { geste: 'partager', en: 3 });
    assert.equal(r.ok, true);
    assert.equal(enSymboles(r.etat), 'x = 4');
});

test('le refus de partager EST la leçon : on enlève les poids d\'abord', () => {
    // 2x + 5 = 17 ne se coupe pas en deux : 5 et 17 sont impairs.
    const r = appliquer(eq(2, 5, 0, 17), { geste: 'partager', en: 2 });
    assert.equal(r.ok, false);
    assert.match(r.dit, /ne se partage pas/i);
    assert.match(r.dit, /Enlève d'abord/i);
});

test('on ne partage pas une balance qui penche', () => {
    let e = eq(2, 4, 0, 10);
    e = appliquer(e, { geste: 'enlever', cote: 'g', quoi: 'u', combien: 4 }).etat;
    const r = appliquer(e, { geste: 'partager', en: 2 });
    assert.equal(r.ok, false);
    assert.match(r.dit, /redresse/i);
});

test('partager sans boîte ne mène nulle part, et on le dit', () => {
    const r = appliquer(eq(0, 4, 0, 4), { geste: 'partager', en: 2 });
    assert.equal(r.ok, false);
    assert.match(r.dit, /plus de boîte/i);
});

test('« x = 5 » et « 5 = x » sont tous les deux résolus', () => {
    assert.deepEqual(resolu(eq(1, 0, 0, 5)), { x: 5, cote: 'g' });
    assert.deepEqual(resolu(eq(0, 5, 1, 0)), { x: 5, cote: 'd' });
    assert.equal(resolu(eq(2, 0, 0, 10)), false, 'deux boîtes, ce n\'est pas fini');
    assert.equal(resolu(eq(1, 2, 0, 7)), false, 'la boîte n\'est pas seule');
});

test('une balance qui penche n\'est jamais « résolue »', () => {
    const e = appliquer(eq(1, 3, 0, 8), { geste: 'enlever', cote: 'd', quoi: 'u', combien: 3 }).etat;
    // g = x + 3, d = 5 : « x + 3 = 5 » n'est pas résolu, et l'attente non plus.
    assert.equal(resolu(e), false);
});

test('LE CHEMIN ENSEIGNÉ RÉSOUT, dans l\'ordre qu\'on enseigne', () => {
    const s = solution(eq(4, 2, 1, 14));
    assert.equal(s.ok, true);
    assert.deepEqual(resolu(s.etat), { x: 4, cote: 'g' });
    // D'abord les boîtes, puis les poids, et le partage en dernier.
    const ordre = s.gestes.map(g => (g.geste === 'partager' ? 'partager' : g.quoi));
    assert.deepEqual(ordre, ['x', 'x', 'u', 'u', 'partager']);
});

test('chaque geste du chemin est accepté par le modèle', () => {
    // Le solveur pourrait « tricher » en fabriquant des états à la main : on
    // rejoue ses gestes un par un dans `appliquer`, qui est le seul juge.
    let e = eq(5, 3, 2, 18);
    for (const g of solution(e).gestes) {
        const r = appliquer(e, g);
        assert.equal(r.ok, true, `geste refusé : ${JSON.stringify(g)}`);
        e = r.etat;
    }
    assert.deepEqual(resolu(e), { x: 5, cote: 'g' });
});

test('LA SOLUTION NE CHANGE JAMAIS EN COURS DE ROUTE', () => {
    // L'invariant du module. On part de dix équations, on joue le chemin, et
    // à CHAQUE étape la solution de l'équation courante doit rester la même —
    // sauf pendant les instants où la balance penche, qui n'en ont pas.
    const rng = makeRng('invariant');
    for (let i = 0; i < 10; i++) {
        const niv = preparerNiveau(i % NIVEAUX.length, rng);
        let e = niv.etat;
        for (const g of solution(e).gestes) {
            e = appliquer(e, g).etat;
            if (e.attente) continue;
            assert.equal(pese(e.g, niv.solution), pese(e.d, niv.solution),
                `${niv.titre} : l'égalité est rompue après ${JSON.stringify(g)}`);
        }
        assert.deepEqual(resolu(e), { x: niv.solution, cote: 'g' });
    }
});

test('les équations tirées sont vraies par construction, et sans négatif', () => {
    const rng = makeRng('progression');
    for (let tour = 0; tour < 30; tour++) {
        for (let i = 0; i < NIVEAUX.length; i++) {
            const n = preparerNiveau(i, rng);
            const { a, b, c, d } = n.equation;
            assert.ok(a > c, `${n.titre} : il faut plus de boîtes à gauche`);
            assert.ok(n.solution >= 1, `${n.titre} : solution ${n.solution}`);
            assert.equal((a - c) * n.solution + b, d, `${n.titre} : l'équation est fausse`);
            assert.ok(b >= 0 && c >= 0 && d >= 0, `${n.titre} : un compte négatif`);
            // Et elle se résout : c'est la seule garantie qui compte.
            assert.equal(solution(n.etat).ok, true, `${n.titre} : insoluble`);
        }
    }
});

test('la progression est reproductible pour une graine donnée', () => {
    const a = preparerNiveau(5, makeRng('meme-graine')).equation;
    const b = preparerNiveau(5, makeRng('meme-graine')).equation;
    assert.deepEqual(a, b);
});

test('chaque famille est atteignable, et les réglages les filtrent', () => {
    ORDRE_FAMILLES.forEach(f => {
        assert.ok(FAMILLES[f], `famille ${f} sans libellé`);
        assert.ok(NIVEAUX.some(n => n.famille === f), `aucun niveau pour ${f}`);
    });
    assert.deepEqual(niveauxDisponibles(['unites']), [0, 1]);
    assert.equal(niveauxDisponibles([]).length, NIVEAUX.length, 'rien de coché = tout');
    const partageSeul = niveauxDisponibles(['partage']);
    assert.ok(partageSeul.length > 0);
    partageSeul.forEach(i => assert.equal(NIVEAUX[i].famille, 'partage'));
});

test('LES NIVEAUX MONTENT, et une famille ne revient jamais en arrière', () => {
    // J'ai d'abord mesuré la LONGUEUR du chemin, et ce test échouait : « 3x =
    // 12 » se résout en un seul geste, après un « x + 5 = 12 » qui en demande
    // deux. Ce n'était pas la progression qui reculait, c'était ma mesure —
    // partager est un geste NEUF, et un geste neuf est plus difficile que deux
    // gestes connus. Ce qui doit monter, c'est la famille.
    const rang = f => ORDRE_FAMILLES.indexOf(f);
    let precedent = 0;
    NIVEAUX.forEach(n => {
        assert.ok(rang(n.famille) >= precedent,
            `${n.titre} : la famille « ${n.famille} » revient après « ${ORDRE_FAMILLES[precedent]} »`);
        precedent = rang(n.famille);
    });
    // Et à l'intérieur d'une même famille, le travail ne diminue pas.
    const rng = makeRng('montee');
    const parFamille = {};
    NIVEAUX.forEach((n, i) => {
        const long = solution(preparerNiveau(i, rng).etat).gestes.length;
        const avant = parFamille[n.famille];
        if (avant !== undefined) {
            assert.ok(long >= avant, `${n.titre} : ${long} gestes après ${avant} dans la même famille`);
        }
        parFamille[n.famille] = long;
    });
});

test('LA CONSIGNE NE DONNE PAS LA MÉTHODE', () => {
    // Rémy : « tu donnes les réponses dans l'énoncé ». Le garde-fou.
    assert.doesNotMatch(CONSIGNE, /enlève|partage|divise|des deux côtés/i);
    assert.match(CONSIGNE, /équilibre/i);
});

test('ON COMPTE LES GESTES, PAS LES CLICS', () => {
    // Mesuré à l'écran : un élève qui résolvait « 3x + 3 = 2x + 8 » parfaitement
    // en cliquant jeton par jeton s'entendait dire « tu y es en 10 gestes ; il
    // en suffisait de 4 ». Il avait fait les quatre gestes attendus, en dix
    // clics. Un rééquilibrage complet — quel que soit le nombre de clics — vaut
    // UN coup, et un partage aussi.
    // 3x + 3 = 2x + 8 : on enlève 2x des deux côtés, puis 3 des deux côtés, et
    // c'est fini — il ne reste qu'une boîte, donc aucun partage.
    const court = solution(eq(3, 3, 2, 8));
    assert.equal(court.gestes.length, 4, 'quatre entrées : deux paires');
    assert.equal(court.coups, 2, 'mais deux gestes au tableau');

    // 4x + 2 = x + 14 en réclame un troisième : le partage.
    const long = solution(eq(4, 2, 1, 14));
    assert.equal(long.gestes.length, 5);
    assert.equal(long.coups, 3, 'deux rééquilibrages et un partage');

    assert.equal(coups([]), 0);
    assert.equal(coups([{ geste: 'partager', en: 2 }]), 1);
    assert.equal(coups([
        { geste: 'enlever', cote: 'g', quoi: 'u', combien: 4 },
        { geste: 'enlever', cote: 'd', quoi: 'u', combien: 4 }
    ]), 1, 'enlever des deux côtés est UN geste');
});
