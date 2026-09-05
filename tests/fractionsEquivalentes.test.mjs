// LES FRACTIONS ÉQUIVALENTES.
//
// Deux promesses, et ce sont elles qu'on vérifie ici.
//
// LA PREMIÈRE : une égalité à compléter n'a qu'UNE réponse. Si la fraction de
// départ n'était pas irréductible, « 4/6 = …/3 » aurait deux lectures et
// l'élève aurait raison de se plaindre.
//
// LA SECONDE, et c'est celle qui compte : chaque marche de la progression pose
// EXACTEMENT sa difficulté, et pas celle de la marche d'avant. Un tirage qui
// rendrait 3 et 4 au niveau « PPCM » n'apprendrait rien de plus que le niveau
// « premiers entre eux » — l'escalier aurait une marche pour rien, et personne
// ne s'en apercevrait à l'œil nu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    pgcd, ppcm, simplifier, estIrreductible,
    tirerEgalite, etapesEgalite, verifierEgalite,
    NIVEAUX_SOMME, estNiveauSomme, tirerDenominateurs, tirerSomme, etapesSomme,
    tirerCalcul, etapesCalcul, multiplesCommuns,
    etapesPosees, bougeDansPose,
    bande, recoupage
} from '../js/core/fractionsEquivalentes.js';
import { makeRng } from '../js/core/ids.js';

const graines = (n) => Array.from({ length: n }, (_, i) => makeRng(`frac${i}`));

test('pgcd, ppcm et simplification', () => {
    assert.equal(pgcd(12, 18), 6);
    assert.equal(pgcd(7, 13), 1);
    assert.equal(pgcd(5, 0), 5);
    assert.equal(ppcm(4, 6), 12);
    assert.equal(ppcm(3, 4), 12);
    assert.equal(ppcm(3, 6), 6);
    assert.deepEqual(simplifier(6, 8), { n: 3, d: 4 });
    assert.deepEqual(simplifier(5, 7), { n: 5, d: 7 });
    assert.ok(estIrreductible(3, 4));
    assert.ok(!estIrreductible(4, 6));
});

// --- Compléter une égalité ---------------------------------------------------

test('UNE ÉGALITÉ TIRÉE EST VRAIE, et sa fraction de base est irréductible', () => {
    graines(120).forEach(rng => {
        const e = tirerEgalite(rng);
        // Le produit en croix : c'est la définition même de l'égalité.
        assert.equal(e.gauche.n * e.droite.d, e.droite.n * e.gauche.d,
            `${e.gauche.n}/${e.gauche.d} ≠ ${e.droite.n}/${e.droite.d}`);
        // Une seule réponse possible : le côté réduit doit être irréductible,
        // sinon « simplifier » accepterait deux nombres.
        const petite = e.sens === 'agrandir' ? e.gauche : e.droite;
        assert.ok(estIrreductible(petite.n, petite.d),
            `${petite.n}/${petite.d} se simplifie encore`);
        assert.ok(e.facteur >= 2);
    });
});

test('LE TROU EST BIEN LE NOMBRE MANQUANT, et le visible est son voisin', () => {
    graines(80).forEach(rng => {
        const e = tirerEgalite(rng);
        if (e.trou === 'numerateur') {
            assert.equal(e.reponse, e.droite.n);
            assert.equal(e.visible, e.droite.d);
        } else {
            assert.equal(e.reponse, e.droite.d);
            assert.equal(e.visible, e.droite.n);
        }
        assert.ok(e.reponse > 0 && Number.isInteger(e.reponse));
    });
});

test('le sens demandé est respecté', () => {
    graines(40).forEach(rng => {
        assert.equal(tirerEgalite(rng, { sens: 'agrandir' }).sens, 'agrandir');
    });
    graines(40).forEach(rng => {
        const e = tirerEgalite(rng, { sens: 'simplifier' });
        assert.equal(e.sens, 'simplifier');
        // Simplifier : on part du grand pour aller vers le petit.
        assert.ok(e.gauche.d > e.droite.d);
    });
});

test('le trou demandé est respecté', () => {
    graines(30).forEach(rng => {
        assert.equal(tirerEgalite(rng, { trou: 'numerateur' }).trou, 'numerateur');
        assert.equal(tirerEgalite(rng, { trou: 'denominateur' }).trou, 'denominateur');
    });
});

test('on ne repose pas deux fois la même égalité', () => {
    const rng = makeRng('suite');
    const vues = [];
    for (let i = 0; i < 12; i++) {
        const e = tirerEgalite(rng, { eviter: vues });
        assert.ok(!vues.includes(e.clef), `« ${e.clef} » est ressortie`);
        vues.push(e.clef);
    }
});

test('la vérification accepte le nombre, et rien d\'autre', () => {
    const e = tirerEgalite(makeRng('verif'));
    assert.ok(verifierEgalite(e, e.reponse));
    assert.ok(verifierEgalite(e, ` ${e.reponse} `));
    assert.ok(verifierEgalite(e, String(e.reponse)));
    assert.ok(!verifierEgalite(e, e.reponse + 1));
    assert.ok(!verifierEgalite(e, ''));
    assert.ok(!verifierEgalite(e, 'douze'));
});

test('les étapes NOMMENT le facteur et la réponse', () => {
    graines(30).forEach(rng => {
        const e = tirerEgalite(rng);
        const etapes = etapesEgalite(e);
        assert.equal(etapes.length, 3);
        assert.ok(etapes.join(' ').includes(String(e.facteur)));
        // La dernière étape donne le résultat : c'est la correction.
        assert.ok(etapes[2].includes(String(e.reponse)));
        etapes.forEach(t => assert.ok(t.length > 15, `étape trop courte : « ${t} »`));
    });
});

// --- PAR COMBIEN ? -----------------------------------------------------------

test('PAR COMBIEN — la réponse est le FACTEUR, pas le nombre manquant', async () => {
    // Rémy : « il faudrait un exercice du style 2/3 = 22/… On demande par
    // combien il faut multiplier ou diviser. »
    //
    // C'est la marche que « L'Égalité à Compléter » enjambe : à qui l'on
    // demande le dénominateur, un élève peut arriver au bon nombre en ajoutant
    // la même différence en haut et en bas, ou en essayant les tables. Le
    // facteur, lui, ne s'obtient que d'une façon.
    const { fracFacteurGenerator: G } = await import('../js/core/generators/fractionsEquivalentes.js');
    for (let i = 0; i < 120; i++) {
        const it = G.generate({ sens: 'les-deux' }, { rng: makeRng('pc' + i), index: i });
        const e = it.meta.egalite;
        assert.equal(it.answer, e.facteur);
        // La réponse n'est JAMAIS le nombre manquant : ce serait le même
        // exercice que le voisin, avec une consigne différente.
        assert.notEqual(String(it.answer), String(e.reponse),
            `${it.prompt.text} : le facteur vaut le nombre caché`);
        assert.ok(e.facteur >= 2, 'multiplier par 1 ne change rien');
    }
});

test('LA CONSIGNE DIT LE GESTE, ET LA FIGURE GARDE SON TROU', async () => {
    const { fracFacteurGenerator: G } = await import('../js/core/generators/fractionsEquivalentes.js');
    const mult = G.generate({ sens: 'agrandir' }, { rng: makeRng('m'), index: 0 });
    assert.match(mult.prompt.text, /MULTIPLIER/);
    const div = G.generate({ sens: 'simplifier' }, { rng: makeRng('d'), index: 0 });
    assert.match(div.prompt.text, /DIVISER/);
    // LE TROU RESTE. Sans lui l'égalité serait écrite en entier et la question
    // deviendrait une division ordinaire.
    assert.match(mult.prompt.html, /frac-trou/);
    // « TOUJOURS LES FRACTIONS EN COLONNES » : c'est la consigne de Rémy, et
    // c'est ce que fait `fraction-num` / `fraction-den`.
    assert.match(mult.prompt.html, /fraction-num/);
    assert.match(mult.prompt.html, /fraction-den/);
});

test('L\'INDICE MONTRE LA LIGNE À LIRE, il ne donne pas le résultat d\'emblée', async () => {
    const { fracFacteurGenerator: G } = await import('../js/core/generators/fractionsEquivalentes.js');
    for (let i = 0; i < 30; i++) {
        const it = G.generate({ sens: 'agrandir' }, { rng: makeRng('h' + i), index: i });
        assert.equal(it.hints.length, 3);
        // Le premier indice ne contient pas la réponse : il dit OÙ regarder.
        assert.doesNotMatch(it.hints[0], new RegExp(`\\b${it.answer}\\b`));
        assert.match(it.hints[0], /HAUT|BAS/);
    }
});

// --- La progression de l'addition --------------------------------------------

test('les quatre marches existent et sont nommées', () => {
    assert.equal(NIVEAUX_SOMME.length, 4);
    assert.deepEqual(NIVEAUX_SOMME.map(n => n.id), ['meme', 'multiple', 'premiers', 'ppcm']);
    NIVEAUX_SOMME.forEach(n => {
        assert.ok(n.nom.length > 5);
        assert.ok(n.aide.length > 40, `l'aide de « ${n.id} » n'explique rien`);
    });
    assert.ok(estNiveauSomme('ppcm'));
    assert.ok(!estNiveauSomme('inventé'));
});

test('CHAQUE MARCHE POSE EXACTEMENT SA DIFFICULTÉ', () => {
    // C'est le cœur de la demande : « il faut que ce soit progressif ». Un
    // niveau qui tire les dénominateurs de celui d'en dessous est une marche
    // pour rien.
    for (let i = 0; i < 200; i++) {
        const rng = makeRng(`marche${i}`);

        const [m1, m2] = tirerDenominateurs(rng, 'meme');
        assert.equal(m1, m2);
        assert.ok(m1 >= 2);

        const [a, b] = tirerDenominateurs(rng, 'multiple');
        assert.notEqual(a, b);
        assert.equal(Math.max(a, b) % Math.min(a, b), 0, `${a} et ${b} : pas multiples`);

        const [c, d] = tirerDenominateurs(rng, 'premiers');
        assert.equal(pgcd(c, d), 1, `${c} et ${d} : pas premiers entre eux`);
        assert.notEqual(Math.max(c, d) % Math.min(c, d), 0,
            `${c} et ${d} : l'un est multiple de l'autre, c'est la marche d'avant`);

        const [e, f] = tirerDenominateurs(rng, 'ppcm');
        assert.ok(pgcd(e, f) > 1, `${e} et ${f} : premiers entre eux, marche d'avant`);
        assert.notEqual(Math.max(e, f) % Math.min(e, f), 0,
            `${e} et ${f} : multiples, marche d'avant`);
        assert.ok(ppcm(e, f) < e * f,
            `${e} et ${f} : le produit suffirait, le PPCM ne se gagne pas`);
    }
});

test('les dénominateurs restent dans la limite demandée', () => {
    for (let i = 0; i < 60; i++) {
        const rng = makeRng(`max${i}`);
        ['meme', 'multiple', 'premiers'].forEach(niv => {
            tirerDenominateurs(rng, niv, 8).forEach(d => {
                assert.ok(d >= 2 && d <= 8, `${d} hors de [2, 8] au niveau ${niv}`);
            });
        });
    }
});

test('UNE SOMME TIRÉE EST JUSTE, tient sous l\'unité, et se corrige', () => {
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let i = 0; i < 60; i++) {
            const s = tirerSomme(makeRng(`s${id}${i}`), { niveau: id });
            assert.equal(s.niveau, id);
            // Le calcul lui-même.
            assert.equal(s.commun, ppcm(s.a.d, s.b.d));
            assert.equal(s.aReduit.n, s.a.n * s.ka);
            assert.equal(s.bReduit.n, s.b.n * s.kb);
            assert.equal(s.brut.n, s.aReduit.n + s.bReduit.n);
            // La valeur exacte, sans passer par les entiers.
            const attendu = s.a.n / s.a.d + s.b.n / s.b.d;
            assert.ok(Math.abs(s.reduit.n / s.reduit.d - attendu) < 1e-9);
            // Une seule bande suffit à la montrer.
            assert.ok(s.brut.n < s.brut.d, `${s.brut.n}/${s.brut.d} dépasse l'unité`);
            // La forme finale est irréductible.
            assert.ok(estIrreductible(s.reduit.n, s.reduit.d));
            // Les numérateurs restent des fractions honnêtes.
            assert.ok(s.a.n >= 1 && s.a.n < s.a.d);
            assert.ok(s.b.n >= 1 && s.b.n < s.b.d);
        }
    });
});

test('au niveau « même dénominateur », rien n\'est à recouper', () => {
    for (let i = 0; i < 40; i++) {
        const s = tirerSomme(makeRng(`meme${i}`), { niveau: 'meme' });
        assert.equal(s.a.d, s.b.d);
        assert.equal(s.ka, 1);
        assert.equal(s.kb, 1);
        assert.equal(s.commun, s.a.d);
    }
});

test('au niveau « multiple », UNE SEULE fraction bouge', () => {
    for (let i = 0; i < 40; i++) {
        const s = tirerSomme(makeRng(`mul${i}`), { niveau: 'multiple' });
        // L'une des deux est déjà au bon dénominateur, l'autre non.
        assert.equal(Number(s.ka === 1) + Number(s.kb === 1), 1,
            `${s.a.d} et ${s.b.d} : ${s.ka} et ${s.kb}`);
    }
});

test('aux niveaux « premiers » et « PPCM », LES DEUX bougent', () => {
    ['premiers', 'ppcm'].forEach(niv => {
        for (let i = 0; i < 40; i++) {
            const s = tirerSomme(makeRng(`deux${niv}${i}`), { niveau: niv });
            assert.ok(s.ka > 1 && s.kb > 1);
        }
    });
});

test('un niveau inconnu ne casse rien', () => {
    const s = tirerSomme(makeRng('bidon'), { niveau: 'n\'importe quoi' });
    assert.equal(s.niveau, 'multiple');
});

test('les étapes d\'une somme racontent le recoupage', () => {
    const s = tirerSomme(makeRng('etapes'), { niveau: 'ppcm' });
    const l = etapesSomme(s);
    assert.ok(l.length >= 4);
    assert.ok(l[0].includes(String(s.commun)));
    assert.ok(l.some(t => t.includes(`${s.brut.n}`)));
    if (s.aSimplifiable) {
        assert.ok(l[l.length - 1].includes(`${s.reduit.n}/${s.reduit.d}`));
    }
});

// --- Les bandes, pour montrer ------------------------------------------------

test('UNE BANDE FAIT TOUJOURS LA MÊME LONGUEUR — seules les coupes changent', () => {
    [2, 3, 4, 6, 8, 12].forEach(d => {
        const b = bande(1, d);
        assert.equal(b.coupes.length, d + 1);
        assert.equal(b.coupes[0], 0);
        assert.equal(b.coupes[b.coupes.length - 1], 1);
        assert.equal(b.parts, d);
        // Des parts égales : c'est ce qu'un élève doit voir.
        for (let i = 1; i < b.coupes.length; i++) {
            assert.ok(Math.abs((b.coupes[i] - b.coupes[i - 1]) - 1 / d) < 1e-9);
        }
    });
    assert.equal(bande(3, 4).pleines, 3);
});

test('LE RECOUPAGE GARDE LES ANCIENS TRAITS et n\'ajoute que les nouveaux', () => {
    // Un tiers recoupé en sixièmes : le trait du tiers reste EXACTEMENT là où
    // il était. C'est cette image-là qui explique 1/3 = 2/6.
    const r = recoupage(3, 6);
    assert.equal(r.facteur, 2);
    assert.deepEqual(r.anciens.map(x => +x.toFixed(6)), [0, 0.333333, 0.666667, 1]);
    assert.deepEqual(r.nouveaux.map(x => +x.toFixed(6)), [0.166667, 0.5, 0.833333]);
    // Aucun nouveau trait ne tombe sur un ancien : sinon on redessinerait
    // par-dessus, et le recoupage paraîtrait moins fin qu'il n'est.
    r.nouveaux.forEach(x => {
        assert.ok(!r.anciens.some(a => Math.abs(a - x) < 1e-9));
    });
    // Ensemble, ils font bien la découpe commune.
    assert.equal(r.anciens.length + r.nouveaux.length, 7);
});

test('recouper en soi-même n\'ajoute aucun trait', () => {
    const r = recoupage(4, 4);
    assert.equal(r.facteur, 1);
    assert.equal(r.nouveaux.length, 0);
    assert.equal(r.anciens.length, 5);
});

test('un recoupage impossible ne dessine rien plutôt que n\'importe quoi', () => {
    const r = recoupage(5, 12);
    assert.equal(r.anciens.length, 0);
    assert.equal(r.nouveaux.length, 0);
});

test('LE RECOUPAGE COLLE AUX SOMMES TIRÉES : les deux bandes se superposent', () => {
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let i = 0; i < 20; i++) {
            const s = tirerSomme(makeRng(`band${id}${i}`), { niveau: id });
            [[s.a, s.ka], [s.b, s.kb]].forEach(([f, k]) => {
                const r = recoupage(f.d, s.commun);
                assert.equal(r.facteur, k);
                assert.equal(r.anciens.length, f.d + 1);
                assert.equal(r.anciens.length + r.nouveaux.length, s.commun + 1);
            });
        }
    });
});

// --- La table de Pythagore, l'aide au PPCM -----------------------------------

test('LA TABLE DE PYTHAGORE MONTRE LE RENDEZ-VOUS DES DEUX DÉNOMINATEURS', () => {
    // L'aide que Rémy a demandée : « on peut lui montrer la table de Pythagore,
    // ou on fait clignoter les lignes et colonnes des dénominateurs ». La
    // ligne des 4 et celle des 3 se rencontrent en 12, 24, 36 — et le premier
    // de ces rendez-vous EST le dénominateur commun.
    const t = multiplesCommuns(4, 3);
    assert.deepEqual(t.multiplesA.slice(0, 4), [4, 8, 12, 16]);
    assert.deepEqual(t.multiplesB.slice(0, 4), [3, 6, 9, 12]);
    assert.deepEqual(t.communs, [12, 24]);
    assert.equal(t.ppcm, 12);
    // Le premier commun est TOUJOURS le PPCM : c'est ce que l'élève lit.
    for (let a = 2; a <= 10; a++) {
        for (let b = 2; b <= 10; b++) {
            const info = multiplesCommuns(a, b);
            assert.equal(info.ppcm, ppcm(a, b), `${a} et ${b}`);
            assert.ok(info.communs.length, `${a} et ${b} ne se rencontrent jamais`);
            assert.equal(info.communs[0], ppcm(a, b));
        }
    }
});

test('ENTRE 2 ET 10, LE PPCM SE LIT TOUJOURS DANS LA TABLE', () => {
    // C'est la raison de la borne : un dénominateur qui n'y figure pas rendrait
    // l'aide muette au moment précis où elle sert. 9 × 10 = 90 y est encore.
    for (let a = 2; a <= 10; a++) {
        for (let b = 2; b <= 10; b++) {
            assert.ok(ppcm(a, b) <= 100, `${a} et ${b} : PPCM hors table`);
        }
    }
});

// --- Additions ET soustractions ----------------------------------------------

test('UNE SOUSTRACTION NE DESCEND JAMAIS SOUS ZÉRO', () => {
    // « Tu peux mélanger addition et soustraction de fraction (sans nombres
    // relatifs). » Le négatif est un autre chapitre.
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let i = 0; i < 60; i++) {
            const c = tirerCalcul(makeRng(`diff${id}${i}`), { niveau: id, operation: 'difference' });
            assert.equal(c.signe, '−');
            assert.equal(c.brut.n, c.aReduit.n - c.bReduit.n);
            assert.ok(c.brut.n > 0, `${c.a.n}/${c.a.d} − ${c.b.n}/${c.b.d} passe sous zéro`);
            // La valeur exacte, sans passer par les entiers.
            const attendu = c.a.n / c.a.d - c.b.n / c.b.d;
            assert.ok(Math.abs(c.reduit.n / c.reduit.d - attendu) < 1e-9);
        }
    });
});

test('les deux fractions de départ sont irréductibles, quelle que soit l\'opération', () => {
    ['somme', 'difference', 'les-deux'].forEach(op => {
        NIVEAUX_SOMME.forEach(({ id }) => {
            for (let i = 0; i < 30; i++) {
                const c = tirerCalcul(makeRng(`irr${op}${id}${i}`), { niveau: id, operation: op });
                assert.ok(estIrreductible(c.a.n, c.a.d), `${c.a.n}/${c.a.d}`);
                assert.ok(estIrreductible(c.b.n, c.b.d), `${c.b.n}/${c.b.d}`);
                assert.ok(c.a.d <= 10 && c.b.d <= 10);
            }
        });
    });
});

test('les étapes disent l\'opération qu\'on fait vraiment', () => {
    const somme = tirerCalcul(makeRng('e+'), { niveau: 'ppcm', operation: 'somme' });
    assert.ok(etapesCalcul(somme).join(' ').includes('additionne'));
    const diff = tirerCalcul(makeRng('e-'), { niveau: 'ppcm', operation: 'difference' });
    const texte = etapesCalcul(diff).join(' ');
    assert.ok(texte.includes('retire'), texte);
    assert.ok(texte.includes('−'), texte);
});

// --- Ce qui ne change pas ne s'écrit pas -------------------------------------
//
// Rémy, au banc d'essai iPhone : « quand le dénominateur est identique, ne fais
// pas l'étape de multiplier le dénominateur. Et quand ils sont multiples, on ne
// multiplie qu'une fraction. »

test('dénominateurs déjà égaux : pas de ligne de conversion du tout', () => {
    const c = tirerCalcul(makeRng('meme1'), { niveau: 'meme', operation: 'somme' });
    assert.equal(c.a.d, c.b.d);
    assert.deepEqual(etapesPosees(c), ['commun', 'calcul']);
    assert.deepEqual(bougeDansPose(c), { a: false, b: false });
});

test('l\'un multiple de l\'autre : une seule fraction bouge', () => {
    for (let i = 0; i < 30; i++) {
        const c = tirerCalcul(makeRng(`mult${i}`), { niveau: 'multiple', operation: 'les-deux' });
        const b = bougeDansPose(c);
        assert.notEqual(b.a, b.b, `${c.a.d} et ${c.b.d} : une seule des deux doit changer`);
        assert.deepEqual(etapesPosees(c), ['commun', 'facteurs', 'converties', 'calcul']);
    }
});

test('deux dénominateurs étrangers : les deux bougent', () => {
    for (let i = 0; i < 30; i++) {
        const c = tirerCalcul(makeRng(`prem${i}`), { niveau: 'premiers', operation: 'somme' });
        assert.deepEqual(bougeDansPose(c), { a: true, b: true });
    }
});

test('la simplification ajoute sa ligne, et le complément a la sienne', () => {
    const c = tirerCalcul(makeRng('simp'), { niveau: 'ppcm', operation: 'somme' });
    assert.ok(!etapesPosees(c).includes('simplifiee'), 'pas demandée, pas de ligne');
    assert.ok(etapesPosees({ ...c, simplifie: true }).includes('simplifiee'));
    assert.deepEqual(etapesPosees({ type: 'complement', ka: 9, kb: 1 }), ['entier', 'calcul']);
    assert.deepEqual(etapesPosees({ type: 'complement', ka: 9, kb: 1, simplifie: true }),
        ['entier', 'calcul', 'simplifiee']);
});
