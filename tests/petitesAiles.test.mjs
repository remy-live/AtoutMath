import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    MONDES, LONGUEUR_MONDE, SOL_MOYEN, mondeDe, progressionMonde, relief, pas,
    etatInitial, semerEtoile, HAUT_ETOILE_MIN, HAUT_ETOILE_MAX,
    avancerNuit, rattrape, RECUL_ETOILE, RECUL_MONDE, qualiteAiles,
    GRAVITE, GRAVITE_PLONGEE, VX_MIN, VX_MAX, quitteLeSol
} from '../js/core/petitesAiles.js';
import { getExerciseById } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { TAGS } from '../js/data/tags.js';

/** Un joueur, décrit par ce qu'il fait de la pente sous ses pieds. */
function courir(monde, joue, secondes = 30, graine = 0.7) {
    let e = etatInitial(monde, graine);
    let air = 0, n = 0;
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, monde, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), monde, graine);
        if (!e.auSol) air++;
        n++;
        assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vx),
            `la simulation a divergé à t = ${t.toFixed(2)}`);
    }
    return { x: e.x, vx: e.vx, partAir: air / n, vitesse: e.x / secondes };
}

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;

/** La vitesse moyenne d'un joueur sur un monde, sur trois paysages. */
function allure(monde, joue) {
    let total = 0;
    for (const g of [0.7, 1.9, 3.3]) total += courir(monde, joue, 30, g).vitesse;
    return total / 3;
}

// --- Le relief ---------------------------------------------------------------------

test('LA PENTE ET LA COURBURE SONT LES VRAIES DÉRIVÉES', () => {
    // Tout le jeu en dépend : la pente décide de l'accélération, la courbure du
    // décollage. Une dérivée approchée par différence de deux points ferait
    // vibrer la vitesse, et le jeu deviendrait nerveux sans qu'on sache pourquoi.
    for (const monde of MONDES) {
        let ecartPente = 0, ecartCourbure = 0;
        for (let x = 0; x < 4000; x += 7.3) {
            const h = 0.02;
            const numPente = (relief(x + h, monde, 0.3).hauteur
                - relief(x - h, monde, 0.3).hauteur) / (2 * h);
            const numCourbure = (relief(x + h, monde, 0.3).pente
                - relief(x - h, monde, 0.3).pente) / (2 * h);
            const r = relief(x, monde, 0.3);
            ecartPente = Math.max(ecartPente, Math.abs(numPente - r.pente));
            ecartCourbure = Math.max(ecartCourbure, Math.abs(numCourbure - r.courbure));
        }
        assert.ok(ecartPente < 1e-5, `monde ${monde.id} : pente ${ecartPente}`);
        assert.ok(ecartCourbure < 1e-4, `monde ${monde.id} : courbure ${ecartCourbure}`);
    }
});

test('le relief reste dans des altitudes jouables', () => {
    for (const monde of MONDES) {
        let bas = Infinity, haut = -Infinity;
        for (let x = 0; x < 8000; x += 3.1) {
            const h = relief(x, monde, 1.4).hauteur;
            bas = Math.min(bas, h); haut = Math.max(haut, h);
        }
        assert.ok(bas > SOL_MOYEN - monde.amplitude - 1, `monde ${monde.id} : creux trop bas`);
        assert.ok(haut < SOL_MOYEN + monde.amplitude + 1, `monde ${monde.id} : crête trop haute`);
        // Et il monte VRAIMENT : un relief plat ne ferait pas un jeu.
        assert.ok(haut - bas > monde.amplitude, `monde ${monde.id} : relief trop plat`);
    }
});

// --- Les mondes -----------------------------------------------------------------------

test('LES SIX MONDES SE SUIVENT ET MONTENT EN DIFFICULTÉ', () => {
    // Rémy : « on peut passer de monde à monde ». Encore faut-il que chacun soit
    // vraiment autre chose que le précédent — sinon la frontière ne récompense
    // rien et la traverser n'a aucun goût.
    assert.equal(MONDES.length, 6);
    let amplitude = 0, periode = Infinity, nuit = 0;
    MONDES.forEach((m, i) => {
        assert.equal(m.id, i + 1);
        assert.ok(m.amplitude > amplitude, `le monde ${m.id} n'est pas plus haut`);
        assert.ok(m.periode < periode, `le monde ${m.id} n'est pas plus serré`);
        assert.ok(m.nuit > nuit, `la nuit du monde ${m.id} ne presse pas davantage`);
        amplitude = m.amplitude; periode = m.periode; nuit = m.nuit;
        // Et chacun a SA palette : c'est le seul signal qui dise « tu as changé
        // de monde » quand on file à cinq cents pixels par seconde.
        assert.equal(m.ciel.length, 2);
        assert.equal(m.fond.length, 2);
        assert.ok(m.sol && m.herbe && m.nom);
    });
    const palettes = new Set(MONDES.map(m => m.ciel.join() + m.sol));
    assert.equal(palettes.size, MONDES.length, 'deux mondes se ressemblent');
});

test('on change de monde à la frontière, et jamais avant', () => {
    assert.equal(mondeDe(0).id, 1);
    assert.equal(mondeDe(LONGUEUR_MONDE - 1).id, 1);
    assert.equal(mondeDe(LONGUEUR_MONDE).id, 2);
    assert.equal(mondeDe(LONGUEUR_MONDE * 5).id, 6);
    // Le dernier monde ne finit jamais : au-delà, on y reste.
    assert.equal(mondeDe(999999).id, 6);
    // Et une distance négative — l'oiseau au tout premier pas — ne casse rien.
    assert.equal(mondeDe(-5).id, 1);
});

test('la progression dit où l\'on en est, et le dernier monde n\'en promet pas d\'autre', () => {
    const p = progressionMonde(LONGUEUR_MONDE * 1.5);
    assert.equal(p.monde.id, 2);
    assert.equal(p.dernier, false);
    assert.ok(Math.abs(p.part - 0.5) < 1e-9);
    assert.equal(p.restant, LONGUEUR_MONDE / 2);
    const dernier = progressionMonde(LONGUEUR_MONDE * 5.5);
    assert.equal(dernier.dernier, true);
    assert.equal(dernier.part, 1);
    assert.equal(dernier.restant, Infinity, 'le dernier monde promet une suite qui n\'existe pas');
});

// --- La physique -----------------------------------------------------------------------

test('BIEN JOUER PAIE, DANS TOUS LES MONDES', () => {
    // C'est la seule chose qui compte dans un jeu d'adresse, et cela ne se
    // devine pas : il faut le mesurer. Trois joueurs, les mêmes paysages, le
    // même temps — celui qui plonge dans les descentes doit gagner partout.
    for (const monde of MONDES) {
        const parfait = allure(monde, PARFAIT);
        const jamais = allure(monde, JAMAIS);
        const toujours = allure(monde, TOUJOURS);
        assert.ok(parfait > jamais * 1.1,
            `monde ${monde.id} : ne rien faire (${Math.round(jamais)}) vaut presque `
            + `bien jouer (${Math.round(parfait)})`);
        assert.ok(parfait > toujours * 1.05,
            `monde ${monde.id} : appuyer sans arrêt (${Math.round(toujours)}) bat le jeu `
            + `parfait (${Math.round(parfait)})`);
    }
});

test('LA NUIT EST RÉGLÉE : elle ne rattrape pas qui joue bien, et presse de plus en plus', () => {
    // C'est tout l'équilibre du jeu, et il ne se devine pas non plus. La nuit
    // doit rester DERRIÈRE le bon joueur dans les six mondes — sinon le jeu est
    // impossible — et finir par rattraper celui qui ne fait rien, sans quoi il
    // n'y a aucune raison d'apprendre le geste.
    MONDES.forEach((monde) => {
        const parfait = allure(monde, PARFAIT);
        assert.ok(monde.nuit < parfait * 0.9,
            `monde ${monde.id} : la nuit (${monde.nuit}) colle au bon joueur `
            + `(${Math.round(parfait)})`);
    });
    // Dans le dernier monde, ne rien faire ne suffit plus.
    const dernier = MONDES[MONDES.length - 1];
    assert.ok(dernier.nuit > allure(dernier, JAMAIS),
        'même au dernier monde, ne rien faire suffit à semer la nuit');
    // Et le premier, lui, pardonne : on y apprend le geste, on n'y perd pas.
    assert.ok(MONDES[0].nuit < allure(MONDES[0], JAMAIS),
        'le premier monde punit avant d\'avoir expliqué');
});

test('ON DÉCOLLE AU SOMMET, ET SEULEMENT SI L\'ON VA ASSEZ VITE', () => {
    // La condition est physique : suivre le sol demande une accélération de v²
    // fois la courbure ; si la gravité ne fournit pas autant, on part tout droit.
    assert.equal(quitteLeSol(0.1, 400, GRAVITE), false, 'un creux ne lance pas');
    assert.equal(quitteLeSol(-0.02, 100, GRAVITE), false, 'trop lent pour décoller');
    assert.equal(quitteLeSol(-0.02, 400, GRAVITE), true, 'assez vite : on décolle');
    // Et le seuil est bien à l'égalité : v² = g / courbure.
    const vSeuil = Math.sqrt(GRAVITE / 0.02);
    assert.equal(quitteLeSol(-0.02, vSeuil * 0.99, GRAVITE), false);
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE), true);
    // Appuyer, c'est peser : à la même courbure, il faut aller plus vite.
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE_PLONGEE), false);

    // SUR LES DUNES, LES PLUS DOUCES, une vitesse minimale ne suffit jamais à
    // décoller : la courbure y est trop faible. Sur les crêtes, en revanche,
    // même un oiseau lent quitte le sol — et c'est juste, c'est la physique.
    const douce = MONDES[0];
    let lent = { ...etatInitial(douce, 0.7), vx: VX_MIN };
    let envole = false;
    for (let t = 0; t < 10; t += 1 / 60) {
        lent = pas({ ...lent, vx: VX_MIN }, 1 / 60, false, douce, 0.7);
        if (!lent.auSol) envole = true;
    }
    assert.equal(envole, false, 'sur les dunes, à vitesse minimale, on reste au sol');

    // En jouant bien, on finit forcément en l'air une partie du temps.
    assert.ok(courir(MONDES[2], PARFAIT).partAir > 0.05,
        'un bon joueur doit passer du temps en vol');
    // Et en appuyant sans arrêt, jamais : appuyer, c'est peser.
    assert.equal(courir(MONDES[2], TOUJOURS).partAir, 0);
});

test('la vitesse reste dans ses bornes, quoi qu\'on fasse', () => {
    for (const monde of MONDES) {
        for (const joue of [PARFAIT, JAMAIS, TOUJOURS, () => Math.random() < 0.5]) {
            let e = etatInitial(monde, 2.2);
            for (let t = 0; t < 40; t += 1 / 60) {
                const sol = relief(e.x, monde, 2.2);
                e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), monde, 2.2);
                assert.ok(e.vx >= VX_MIN - 1e-9 && e.vx <= VX_MAX + 1e-9,
                    `vitesse hors bornes : ${e.vx}`);
                // On ne passe jamais sous le sol.
                assert.ok(e.y >= relief(e.x, monde, 2.2).hauteur - 1e-6,
                    'l\'oiseau est passé sous le relief');
            }
        }
    }
});

test('appuyer pèse : la gravité de plongée est plus forte', () => {
    assert.ok(GRAVITE_PLONGEE > GRAVITE * 1.5);
    // Et en l'air, cela se voit tout de suite : à même position, celui qui
    // appuie tombe plus vite.
    const monde = MONDES[1];
    const base = { x: 100, y: relief(100, monde, 0).hauteur + 200, vx: 300, vy: 0, auSol: false };
    const plane = pas(base, 0.2, false, monde, 0);
    const plonge = pas(base, 0.2, true, monde, 0);
    assert.ok(plonge.y < plane.y, 'plonger devrait faire descendre plus vite');
});

// --- La nuit et les étoiles ----------------------------------------------------------

test('la nuit avance à la vitesse de son monde, et rattrape quand elle arrive', () => {
    assert.equal(avancerNuit(0, 1, MONDES[0]), MONDES[0].nuit);
    assert.equal(avancerNuit(100, 0.5, MONDES[3]), 100 + MONDES[3].nuit / 2);
    // Un monde manquant ne casse pas la partie en vol.
    assert.equal(avancerNuit(0, 1, null), MONDES[0].nuit);
    assert.equal(rattrape(500, 501), false);
    assert.equal(rattrape(501, 500), true);
    assert.equal(rattrape(500, 500), true, 'nez à nez, la nuit gagne');
});

test('franchir un monde repousse la nuit bien plus qu\'une étoile', () => {
    // C'est la hiérarchie du jeu : les étoiles sont une monnaie d'appoint, la
    // frontière est la vraie respiration. Si une poignée d'étoiles valait un
    // monde, personne n'irait voir le suivant.
    assert.ok(RECUL_MONDE > RECUL_ETOILE * 8);
    assert.ok(RECUL_ETOILE > 0);
});

test('les étoiles se posent à portée de l\'oiseau qui GLISSE', () => {
    // Semées trop haut, elles n'étaient atteignables qu'en vol : on jouait six
    // secondes sans jamais rien ramasser.
    const rng = makeRng('etoiles');
    for (const monde of MONDES) {
        for (let x = 0; x < 3000; x += 137) {
            const e = semerEtoile(x, monde, 1.1, rng);
            const sol = relief(x, monde, 1.1).hauteur;
            assert.equal(e.x, x);
            assert.equal(e.prise, false);
            assert.ok(e.y - sol >= HAUT_ETOILE_MIN, `étoile sous le sol : ${e.y - sol}`);
            assert.ok(e.y - sol <= HAUT_ETOILE_MAX, `étoile hors de portée : ${e.y - sol}`);
        }
    }
});

test('la qualité résume la partie, et le monde passe devant la distance', () => {
    const q = qualiteAiles(1234.6, 3, 7);
    assert.equal(q.distance, 1235);
    assert.equal(q.monde, 3);
    assert.equal(q.etoiles, 7);
    // Un monde de plus vaut mieux que dix étoiles.
    assert.ok(qualiteAiles(0, 3, 0).points > qualiteAiles(0, 2, 10).points);
    // Et une partie ratée d'entrée rapporte quand même quelque chose.
    assert.ok(qualiteAiles(0, 1, 0).points >= 1);
});

// --- Le rangement --------------------------------------------------------------------------

test('Les Petites Ailes ne sont plus un exercice de maths', () => {
    // Rémy : « n'en fais pas un jeu mathématiques ». Cela se vérifie ici, et
    // pas seulement dans le code du jeu : une compétence accrochée pour la
    // forme remplirait le bilan du professeur de lignes qui ne mesurent rien.
    const e = getExerciseById('jeu-petites-ailes');
    assert.ok(e, 'jeu-petites-ailes manque au catalogue');
    assert.equal(e.activityId, 'petites-ailes');
    assert.deepEqual(e.skills, []);
    // Et le silence est ASSUMÉ, pas subi : `horsProgression` est la seule
    // façon d'entrer au catalogue sans compétence, et c'est ce qui l'empêche
    // de remonter dans la remédiation ou le bilan.
    assert.equal(e.horsProgression, true);
    assert.deepEqual(e.tags.chemin, [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.ADRESSE]);
    // Et la compétence inventée pour l'ancienne version a disparu du référentiel.
    assert.equal(SKILLS['num.aile.reconnaitre'], undefined);
});

test('la consigne explique LE geste et LE but, qui sont tout le jeu', () => {
    const e = getExerciseById('jeu-petites-ailes');
    assert.ok(e.instruction.length > 400);
    assert.ok(/plonger/i.test(e.instruction), 'le geste n\'est pas dit');
    assert.ok(/relâche/i.test(e.instruction));
    // « on accélère en cliquant ou en appuyant sur la barre d'espace » : les
    // deux commandes doivent être écrites, pas devinées.
    assert.ok(/espace/i.test(e.instruction), 'la barre d\'espace n\'est pas annoncée');
    assert.ok(/clic|doigt/i.test(e.instruction));
    assert.ok(/nuit/i.test(e.instruction), 'la nuit n\'est pas annoncée');
    assert.ok(/monde/i.test(e.instruction), 'les mondes ne sont pas annoncés');
    // Et plus un mot de multiples ni de carrés.
    assert.ok(!/multiple|diviseur|carré parfait/i.test(e.instruction));
});
