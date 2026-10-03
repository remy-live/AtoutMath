// LES ENSEMBLES DE NOMBRES, L'UNION ET L'INTERSECTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « pourquoi le trait est au dessus, fais-le d'une
// autre couleur. fais l'ensemble des nombres et l'union et l'intersection. »
//
// DEUX CHOSES SE TESTENT ICI, ET ELLES NE SE TESTENT PAS PAREIL.
//
// L'union et l'intersection se CALCULENT : il y a une vérité, et l'on peut la
// vérifier autrement que par mon propre raisonnement. C'est ce que fait le
// premier bloc — on échantillonne la droite au quart d'unité près et l'on
// demande à chaque point s'il est dans I, dans J, et dans le résultat. Si je
// me suis trompé sur le crochet d'une borne partagée, un point le dit.
// MESURÉ par `tools/tmp/verifEnsemblistes.mjs` sur la plage complète :
// 1 924 000 points, 0 désaccord.
//
// Les ensembles de nombres, eux, ne se calculent pas : la liste des vingt-deux
// nombres est écrite à la main, parce qu'un générateur devrait décider si √n
// est rationnel — faisable pour une racine, faux dès qu'on mélange π. Ce qui
// se teste, c'est donc la COHÉRENCE de la liste avec elle-même : chaque entrée
// porte sa valeur, et la valeur doit désigner l'ensemble annoncé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    intersection, union, ensembleTexte, intervalleTexte,
    ensemblistesGenerator, ensemblesGenerator
} from '../js/core/generators/intervalles.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import '../js/core/activities/index.js';
import { allGenerators, getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── LE CALCUL, VÉRIFIÉ POINT PAR POINT ──────────────────────────────────────

/** `x` est-il dans l'intervalle ? La définition, écrite à part. */
const dedans = (I, x) => {
    if (I.a !== null && (x < I.a || (x === I.a && !I.ea))) return false;
    if (I.b !== null && (x > I.b || (x === I.b && !I.eb))) return false;
    return true;
};
const dansParts = (parts, x) => parts.some(K => dedans(K, x));

test('∩ ET ∪ SONT D\'ACCORD AVEC LA DÉFINITION, POINT PAR POINT', () => {
    // On ne compare pas mon code à mon idée de la réponse — on se tromperait
    // deux fois. On le compare à « x appartient-il à I ET à J ? », qui est la
    // définition et rien d'autre. Le pas de 0,25 tombe sur les bornes entières
    // ET entre elles : c'est là que se joue le crochet.
    const rng = makeRng(11);
    let points = 0;
    for (let n = 0; n < 300; n++) {
        const [I, J] = [tirerAuHasard(rng), tirerAuHasard(rng)];
        const inter = intersection(I, J), uni = union(I, J);
        for (let t = -40; t <= 40; t++) {
            const x = t / 4;
            points++;
            assert.equal(dansParts(inter, x), dedans(I, x) && dedans(J, x),
                `${x} dans ${intervalleTexte(I)} ∩ ${intervalleTexte(J)} = ${ensembleTexte(inter)}`);
            assert.equal(dansParts(uni, x), dedans(I, x) || dedans(J, x),
                `${x} dans ${intervalleTexte(I)} ∪ ${intervalleTexte(J)} = ${ensembleTexte(uni)}`);
        }
    }
    assert.ok(points > 20000);
});

function tirerAuHasard(rng) {
    const forme = rng.int(0, 3);
    const v = rng.int(-6, 6);
    if (forme === 0) return { a: null, b: v, ea: false, eb: rng.bool(0.5) };
    if (forme === 1) return { a: v, b: null, ea: rng.bool(0.5), eb: false };
    return { a: v, b: v + rng.int(1, 6), ea: rng.bool(0.5), eb: rng.bool(0.5) };
}

test('LES TROIS CAS QUE LE COURS NE PEUT PAS ÉVITER', () => {
    // 1. L'INTERSECTION VIDE, alors que les deux traits se REJOIGNENT sur le
    //    dessin. C'est le cas le plus fin du chapitre.
    const I = { a: -5, b: -3, ea: true, eb: false };
    const J = { a: -3, b: 1, ea: true, eb: true };
    assert.deepEqual(intersection(I, J), []);
    assert.equal(ensembleTexte(intersection(I, J)), '∅');
    // …et l'union, elle, est un SEUL intervalle : il n'y a pas de trou.
    assert.equal(ensembleTexte(union(I, J)), '[−5 ; 1]');

    // 2. L'UNION QUI RESTE EN DEUX MORCEAUX.
    const A = { a: -5, b: -2, ea: true, eb: true };
    const B = { a: 1, b: 4, ea: false, eb: true };
    assert.equal(ensembleTexte(union(A, B)), '[−5 ; −2] ∪ ]1 ; 4]');
    assert.equal(ensembleTexte(intersection(A, B)), '∅');

    // 3. DEUX DEMI-DROITES QUI SE RECOUVRENT : l'union est ℝ tout entier.
    const G = { a: 0, b: null, ea: true, eb: false };
    const D = { a: null, b: 3, ea: false, eb: false };
    assert.equal(ensembleTexte(union(G, D)), ']−∞ ; +∞[');
    assert.equal(ensembleTexte(intersection(G, D)), '[0 ; 3[');
});

test('À LA BORNE PARTAGÉE, ∩ PREND LE PLUS SÉVÈRE ET ∪ LE PLUS GÉNÉREUX', () => {
    // C'est LA règle du chapitre, et c'est la faute qu'on fait : recopier le
    // crochet du mauvais intervalle. Même borne, deux crochets opposés.
    const I = { a: -4, b: 1, ea: true, eb: false };   // [−4 ; 1[
    const J = { a: 1, b: 4, ea: true, eb: true };      // [1 ; 4]
    // 1 est LAISSÉ par I, PRIS par J. L'intersection le refuse (vide),
    // l'union l'accepte.
    assert.equal(ensembleTexte(intersection(I, J)), '∅');
    assert.equal(ensembleTexte(union(I, J)), '[−4 ; 4]');

    const K = { a: -4, b: 2, ea: true, eb: true };     // [−4 ; 2]
    const L = { a: -1, b: 2, ea: false, eb: false };   // ]−1 ; 2[
    assert.equal(ensembleTexte(intersection(K, L)), ']−1 ; 2[');   // le plus sévère
    assert.equal(ensembleTexte(union(K, L)), '[−4 ; 2]');          // le plus généreux
});

// ── LES QUESTIONS ───────────────────────────────────────────────────────────

const tirer = (n, params = { operation: 'toutes', cas: 'tous' }) =>
    Array.from({ length: n }, (_, i) =>
        ensemblistesGenerator.generate(params, { rng: makeRng(500 + i) }));

test('UNE SEULE BONNE RÉPONSE, QUATRE PROPOSITIONS, AUCUN DOUBLON', () => {
    tirer(60).forEach(it => {
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        assert.equal(it.choices.length, 4, `${it.meta.op} ${it.meta.position}`);
        const vues = it.choices.map(c => c.label);
        assert.equal(new Set(vues).size, vues.length,
            `${it.meta.op} ${it.meta.position} : deux propositions identiques`);
    });
});

test('AUCUNE PROPOSITION N\'EST UN INTERVALLE IMPOSSIBLE', () => {
    // MESURÉ : deux questions sur trente proposaient `[−3 ; −3[` — la borne
    // basse égale à la borne haute. Le leurre « le trou entre les deux » était
    // fabriqué même quand il n'y avait PAS de trou : deux intervalles accolés
    // ont une intersection vide sans rien laisser entre eux. Un leurre qui ne
    // veut rien dire n'apprend rien, et signale surtout qu'il est faux.
    tirer(120).forEach(it => {
        it.choices.forEach(c => {
            const m = /^([[\]])(−?[\d,]+) ; (−?[\d,]+)([[\]])$/.exec(c.label);
            if (!m) return;   // ∅, deux morceaux, ou une borne infinie
            const a = Number(m[2].replace('−', '-'));
            const b = Number(m[3].replace('−', '-'));
            assert.ok(a < b, `${it.meta.position} : proposition « ${c.label} »`);
        });
    });
});

test('CHAQUE LEURRE DIT QUELLE FAUTE IL EST', () => {
    tirer(40).forEach(it => {
        it.choices.filter(c => !c.correct).forEach(c =>
            assert.ok(c.why && c.why.length > 25,
                `${it.meta.op} ${it.meta.position} : un leurre sans explication`));
    });
});

test('LE LEURRE DU CAS EST TOUJOURS LÀ — PAS UNE FOIS SUR DEUX', () => {
    // MESURÉ : sur une union d'intervalles disjoints — la question où l'élève
    // « bouche le trou » — la réponse [a ; d] n'était proposée qu'une fois sur
    // deux. Le tirage prenait trois fautes au hasard, et celle qui EST la
    // faute du cas partait avec les autres. Une question dont le bon leurre
    // est absent n'est plus une question difficile : elle est facile.
    const unions = tirer(120, { operation: 'union', cas: 'separes' })
        .filter(it => it.meta.morceaux === 2);
    assert.ok(unions.length >= 20, `trop peu de cas en deux morceaux : ${unions.length}`);
    unions.forEach(it => {
        const bouche = it.choices.some(c => !c.correct && /^[[\]]−?[\d,]+ ; −?[\d,]+[[\]]$/.test(c.label));
        assert.ok(bouche, `pas de « trou bouché » : ${it.choices.map(c => c.label).join(' | ')}`);
    });
    // Et sur une intersection, on propose toujours l'autre opération : c'est la
    // confusion ∩ / ∪, qui est la faute reine du chapitre.
    tirer(40, { operation: 'inter', cas: 'tous' }).forEach(it => {
        assert.ok(it.choices.some(c => !c.correct && /I ∪ J/.test(c.why || '')),
            'la confusion ∩ / ∪ n\'est pas proposée');
    });
});

test('L\'ÉNONCÉ PORTE DEUX AXES, SUR LA MÊME GRADUATION', () => {
    // « il faut toujours un support visuel », et ici il ne décore pas : la
    // réponse SE VOIT, c'est la tranche où les deux traits se superposent.
    // Encore faut-il que les deux axes soient CADRÉS PAREIL — cadré chacun sur
    // ses propres bornes, le 0 de l'un ne tomberait pas au-dessus du 0 de
    // l'autre, et il n'y aurait plus rien à superposer.
    const zeroDe = (svg) => {
        const m = [...svg.matchAll(/<text x="([\d.]+)"[^>]*font-size="11"[^>]*>(−?\d+)<\/text>/g)];
        const z = m.find(x => x[2] === '0');
        return z ? Number(z[1]) : null;
    };
    tirer(40).forEach(it => {
        const svgs = it.prompt.html.match(/<svg[\s\S]*?<\/svg>/g) || [];
        assert.equal(svgs.length, 2, `${it.meta.position} : ${svgs.length} axe(s)`);
        // Les deux lettres, pour qui ne distingue pas les couleurs.
        assert.match(svgs[0], />I<\/text>/);
        assert.match(svgs[1], />J<\/text>/);
        const z0 = zeroDe(svgs[0]), z1 = zeroDe(svgs[1]);
        assert.ok(z0 !== null && z1 !== null, 'pas de graduation 0');
        assert.equal(z0, z1, `${it.meta.position} : les deux axes ne sont pas cadrés pareil`);
    });
});

test('LA CORRECTION DIT LES DEUX RÉSULTATS, ET LE PAPIER AUSSI', () => {
    // L'écran montre le dessin de la réponse ; la feuille imprimée ne l'a pas.
    // La phrase doit donc se suffire — et elle nomme I ∩ J ET I ∪ J, parce
    // qu'on a justement confondu les deux.
    tirer(30).forEach(it => {
        assert.match(it.explanation, /I ∩ J = .+ et I ∪ J = /);
        assert.ok(it.explanation.length > 80);
        assert.match(it.prompt.papier, /^I = .+ et J = /);
    });
});

test('LE RÉGLAGE « SÉPARÉS » NE SERT QUE DES SÉPARÉS', () => {
    tirer(30, { operation: 'toutes', cas: 'separes' }).forEach(it => {
        assert.ok(['accole', 'disjoint'].includes(it.meta.position), it.meta.position);
        // L'intersection y est toujours vide : c'est la leçon du réglage.
        if (it.meta.op === 'inter') assert.equal(it.choices.find(c => c.correct).label, '∅');
    });
    tirer(30, { operation: 'inter', cas: 'croises' }).forEach(it => {
        assert.equal(it.meta.op, 'inter');
        assert.notEqual(it.choices.find(c => c.correct).label, '∅');
    });
});

// ── LES ENSEMBLES DE NOMBRES ────────────────────────────────────────────────

test('LA LISTE DES NOMBRES EST D\'ACCORD AVEC ELLE-MÊME', () => {
    // La liste est écrite à la main — c'est ce qui la rend juste, et c'est ce
    // qui la rend fragile : une seule lettre de travers (`ens: 'D'` au lieu de
    // `'Q'`) et l'exercice enseigne le contraire. On relit donc chaque entrée
    // PAR SA VALEUR, avec des règles qui ne regardent pas la case `ens`.
    const src = lire('js/core/generators/intervalles.js');
    const bloc = src.slice(src.indexOf('const NOMBRES = ['), src.indexOf('export const ensemblesGenerator'));
    const lignes = [...bloc.matchAll(/\{ ecrit: '(.+?)', vaut: '(.+?)', ens: '(\w)', parce: '(.+?)' \}/g)];
    assert.ok(lignes.length >= 20, `${lignes.length} nombres seulement`);

    lignes.forEach(([, ecrit, vaut, ens, parce]) => {
        const ou = `${ecrit} = ${vaut} → ${ens}`;
        assert.ok(parce.length > 25, `${ou} : explication trop courte`);
        if (/[√π]/.test(vaut)) {
            // Il reste une racine ou un π dans la VALEUR : c'est irrationnel.
            assert.equal(ens, 'R', ou);
        } else if (/…/.test(vaut)) {
            // Les décimales ne s'arrêtent pas : ni entier ni décimal.
            assert.ok(['Q', 'R'].includes(ens), ou);
        } else if (/^−?\d+$/.test(vaut)) {
            assert.equal(ens, vaut.startsWith('−') ? 'Z' : 'N', ou);
        } else if (/^−?\d+,\d+$/.test(vaut)) {
            // Une écriture décimale qui s'arrête : décimal, et pas au-delà.
            assert.equal(ens, 'D', ou);
        } else if (/^−?\d+\/\d+$/.test(vaut)) {
            // Une fraction laissée sous forme de fraction : elle ne tombe pas
            // juste, sinon on l'aurait écrite en décimal.
            assert.equal(ens, 'Q', ou);
        } else {
            assert.fail(`${ou} : valeur d'une forme que le test ne sait pas relire`);
        }
    });
});

test('LE DESSIN NE DONNE PAS LA RÉPONSE', () => {
    // J'avais écrit `poupeesHtml(n.ens)` dans l'ÉNONCÉ, à trois lignes du
    // commentaire qui dit de ne pas le faire. Le cadre éclairé EST la réponse :
    // la question devenait « sais-tu lire un surlignage ? ».
    for (let i = 0; i < 30; i++) {
        const it = ensemblesGenerator.generate({ portee: 'tous' }, { rng: makeRng(900 + i) });
        assert.match(it.prompt.html, /<svg/, 'pas de support visuel');
        // Aucun cadre n'est épaissi ni teinté dans l'énoncé : ils sont tous
        // dessinés pareil, à la même opacité de fond.
        const svg = it.prompt.html.match(/<svg[\s\S]*?<\/svg>/)[0];
        assert.ok(!/stroke-width="2"/.test(svg), 'un cadre est mis en avant');
        // Le schéma de l'indice, lui, a le droit d'éclairer — il explique.
        assert.ok(it.schemas[1] && it.schemas[1].includes('<svg'));
    }
});

test('LE DESSIN DES POUPÉES EMBOÎTE VRAIMENT — AU PIXEL', () => {
    // MESURÉ sur la capture : les cadres rétrécissaient en LARGEUR de ℕ vers
    // ℝ mais grandissaient en HAUTEUR. ℕ, le plus petit ensemble, dépassait
    // de ℝ de vingt pixels en haut ET en bas. Le dessin censé montrer que
    // tout entier est aussi un réel montrait un ℕ qui sort de ℝ.
    //
    // Un emboîtement ne se vérifie pas à l'œil sur une capture : deux cadres
    // qui se croisent se distinguent mal de deux cadres qui s'emboîtent. On
    // lit les quatre côtés, et l'on exige la stricte inclusion, dans l'ordre
    // ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ.
    const it = ensemblesGenerator.generate({ portee: 'tous' }, { rng: makeRng(901) });
    const svg = it.prompt.html.match(/<svg[\s\S]*?<\/svg>/)[0];
    const cadres = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
        .map(m => { const [x, y, w, h] = m.slice(1).map(Number);
            return { x, y, droite: x + w, bas: y + h }; });
    assert.equal(cadres.length, 5);
    const noms = ['ℕ', 'ℤ', '𝔻', 'ℚ', 'ℝ'];
    for (let i = 0; i + 1 < cadres.length; i++) {
        const p = cadres[i], G = cadres[i + 1];
        const ou = `${noms[i]} dans ${noms[i + 1]}`;
        assert.ok(G.x < p.x, `${ou} : bord gauche`);
        assert.ok(G.y < p.y, `${ou} : bord haut`);
        assert.ok(G.droite > p.droite, `${ou} : bord droit`);
        assert.ok(G.bas > p.bas, `${ou} : bord bas`);
    }
    // Et le plus petit cadre reste assez haut pour porter sa lettre.
    assert.ok(cadres[0].bas - cadres[0].y >= 20);
});

test('LE BOUTON PORTE LE NOM DE L\'ENSEMBLE, PAS SEULEMENT SON SIGNE', () => {
    // Quatre boutons marqués « ℚ », « 𝔻 », « ℤ », « ℕ » posent une seconde
    // question — « quel signe veut dire quoi ? » — avant celle qu'on pose.
    const it = ensemblesGenerator.generate({ portee: 'tous' }, { rng: makeRng(902) });
    // Le drapeau `u` n'est pas décoratif : 𝔻 est U+1D53B, hors du plan de
    // base, et une classe de caractères sans `u` le coupe en deux moitiés.
    it.choices.forEach(c => assert.match(c.label, /^[ℕℤ𝔻ℚℝ] — les \p{L}/u, c.label));
});

test('LES LEURRES SONT LES ENSEMBLES VOISINS, PAS DU BRUIT', () => {
    // On répond ℝ pour un rationnel, ℚ pour un décimal — jamais ℕ pour √5.
    // Des ensembles lointains rendraient la question facile pour une mauvaise
    // raison.
    const RANG = { 'ℕ': 0, 'ℤ': 1, '\u{1D53B}': 2, 'ℚ': 3, 'ℝ': 4 };
    for (let i = 0; i < 40; i++) {
        const it = ensemblesGenerator.generate({ portee: 'tous' }, { rng: makeRng(900 + i) });
        assert.equal(it.choices.length, 4);
        const rangs = it.choices.map(c => RANG[c.label.split(' ')[0]]);
        rangs.forEach(r => assert.ok(r !== undefined, it.choices.map(c => c.label).join(' ')));
        assert.equal(new Set(rangs).size, 4);
        // Les quatre sont côte à côte dans la chaîne ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ :
        // quatre rangs consécutifs pris parmi cinq.
        const tries = [...rangs].sort((a, b) => a - b);
        assert.equal(tries[3] - tries[0], 3, `rangs ${tries.join(',')}`);
        it.choices.filter(c => !c.correct).forEach(c =>
            assert.ok(c.why && c.why.length > 25, 'un leurre sans explication'));
    }
});

test('ET « SANS LES IRRATIONNELS » N\'EN SERT AUCUN', () => {
    for (let i = 0; i < 30; i++) {
        const it = ensemblesGenerator.generate({ portee: 'rationnels' }, { rng: makeRng(900 + i) });
        assert.notEqual(it.meta.ens, 'R');
    }
});

// ── LE BRANCHEMENT ──────────────────────────────────────────────────────────

test('LES DEUX GÉNÉRATEURS SONT BRANCHÉS, ET LEURS COMPÉTENCES EXISTENT', () => {
    // Un générateur écrit mais non enregistré ne lève aucune erreur : il ne
    // s'ouvre simplement jamais.
    const ids = allGenerators().map(g => g.id);
    assert.ok(ids.includes('nb.ensembles'));
    assert.ok(ids.includes('nb.intervalles.ensemblistes'));
    ['nb.ensembles.appartenance', 'nb.intervalle.ensembliste'].forEach(s => {
        assert.ok(SKILLS[s], `compétence absente : ${s}`);
        (SKILLS[s].prereqs || []).forEach(p =>
            assert.ok(SKILLS[p], `prérequis fantôme : ${p} (de ${s})`));
    });
});

test('LES TROIS NOUVEAUX EXERCICES OUVRENT SUR UNE VRAIE QUESTION', () => {
    ['sec-ensembles', 'sec-union-inter', 'sec-union-inter-vide'].forEach(id => {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `exercice absent : ${id}`);
        const gen = getGenerator(e.generatorId);
        assert.ok(gen, `${id} : générateur ${e.generatorId} introuvable`);
        const it = gen.generate(e.params, { rng: makeRng(3) });
        assert.ok(it.prompt.html.includes('<svg'), `${id} : pas de support visuel`);
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        assert.ok(it.explanation.length > 40);
    });
});

test('ET LES DEUX COULEURS NE SE CONFONDENT SUR AUCUN THÈME', () => {
    // `var(--primary)` et `var(--success)` allaient très bien pour dessiner UN
    // intervalle. Mais le thème « forêt » pose --primary à #15803d et --success
    // à #22c55e : deux verts. Deux intervalles qu'il faut distinguer d'un coup
    // d'œil seraient devenus indiscernables — sur un thème seulement,
    // c'est-à-dire pour une classe et pas les autres.
    const src = lire('js/core/generators/intervalles.js');
    assert.match(src, /const TEINTE_I = '#[0-9a-f]{6}'/);
    assert.match(src, /const TEINTE_J = '#[0-9a-f]{6}'/);
    const deux = ensemblistesGenerator.generate({ operation: 'inter', cas: 'tous' },
        { rng: makeRng(4) });
    assert.ok(!/var\(--/.test(deux.prompt.html),
        'une couleur de thème s\'est glissée dans le dessin des deux intervalles');
});
