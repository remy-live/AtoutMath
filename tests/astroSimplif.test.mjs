// ASTRO-SIMPLIF — ce que la mission doit tenir.
//
// RÉMY, 24 novembre, en collant un jeu complet écrit ailleurs : « c'est ça que
// tu m'intègres ». Des astéroïdes portent une fraction ; des canons ÷ 2, ÷ 3,
// ÷ 5… divisent le haut ET le bas ; une fraction irréductible explose.
//
// « Beau » ne se garde pas par une épreuve : cela se regarde, et les photos
// sont dans `tools/tmp/` après `node tools/sondeAstro.mjs`. Ce fichier garde
// ce qui se mesure :
//
//   · LES FRACTIONS — toujours simplifiables avec les canons du grade, jamais
//     irréductibles au départ, jamais deux fois la même ;
//   · LE TIR — juste, il divise les deux ; faux, il rebondit, il coûte, et le
//     message nomme celui des deux nombres qui bloque ;
//   · QUI MITRAILLE NE GAGNE PAS, qui calcule gagne tout ;
//   · AUCUNE CAPSULE NE SIMPLIFIE À LA PLACE DE L'ÉLÈVE ;
//   · UNE FRACTION, UNE QUESTION — exactement autant que l'étape en annonce ;
//   · PAS DE SON, TOUT DANS LA FENÊTRE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import '../js/core/activities/index.js';
import { getActivity } from '../js/core/registry.js';
import { exercices, estNotable } from '../js/data/catalog.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';
import { SKILLS } from '../js/data/skills.js';
import { makeRng } from '../js/core/ids.js';
import {
    Mission, GRADES, ALLURES, COULEURS, CRITERES, CAPSULES, BOND, SURCHAUFFE, REBONDS_PERMIS,
    RENVOI_DU_REMPART, BOSS_TOUS_LES, pgcd, irreductible, fabriquerFraction, fabriquerSerie,
    expliquer, chaineEcrite, cheminAvec
} from '../js/core/astroSimplif.js';
import { jouer } from '../tools/equilibreAstro.mjs';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const DT = 1 / 60;

/** Une mission dont on choisit les fractions, et qu'on fait avancer jusqu'à ce qu'un astéroïde soit là. */
function missionSur(fractions, opts = {}) {
    const m = new Mission({ grade: 'cadet', combien: fractions.length, graine: 'ep', fractions, ...opts });
    while (!m.asteroides.length) m.avancer(DT);
    m.evenements.length = 0;
    return m;
}

test('CHAQUE FRACTION SE CASSE AVEC LES CANONS DE SON GRADE, ET AUCUNE NE PART IRRÉDUCTIBLE', () => {
    // Une fraction tirée au hasard peut demander un facteur que le grade n'a
    // pas — 34/51 se simplifie par 17. Elle serait indestructible.
    for (const [cle, g] of Object.entries(GRADES)) {
        for (let i = 0; i < 300; i++) {
            const rng = makeRng(`f-${cle}-${i}`);
            const boss = i % 3 === 0;
            const f = fabriquerFraction(rng, cle, { boss });
            assert.ok(!irreductible(f.num, f.den), `${cle} : ${f.num}/${f.den} est déjà irréductible`);
            assert.ok(cheminAvec(f.num, f.den, g.canons), `${cle} : ${f.num}/${f.den} ne se casse pas avec ${g.canons}`);
            assert.ok(f.den <= (boss ? Math.round(g.maxDen * 1.6) : g.maxDen), `${cle} : ${f.num}/${f.den} trop grand`);
            assert.ok(f.num < f.den, `${cle} : ${f.num}/${f.den} n'est pas une fraction inférieure à 1`);
            // Le PGCD est exactement le produit des facteurs qu'on a multipliés.
            assert.equal(pgcd(f.num, f.den), f.facteurs.reduce((a, b) => a * b, 1));
        }
    }
});

test('UNE SÉRIE : AUTANT DE FRACTIONS QUE DEMANDÉ, SANS DOUBLON, UN GÉANT TOUTES LES CINQ', () => {
    for (const cle of Object.keys(GRADES)) {
        const serie = fabriquerSerie(makeRng(`s-${cle}`), cle, 15);
        assert.equal(serie.length, 15);
        assert.equal(new Set(serie.map((f) => `${f.num}/${f.den}`)).size, 15, `${cle} : une fraction revient`);
        serie.forEach((f, i) => assert.equal(f.boss, (i + 1) % BOSS_TOUS_LES === 0, `${cle} : le géant n'est pas à sa place`));
        // Le géant demande au moins deux divisions : son PGCD a au moins deux
        // facteurs premiers (10 = 2 × 5 en compte deux).
        const premiers = (n) => { let k = 0; for (let p = 2; n > 1; p++) while (n % p === 0) { n /= p; k++; } return k; };
        serie.filter((f) => f.boss).forEach((f) =>
            assert.ok(premiers(pgcd(f.num, f.den)) >= 2, `${cle} : le géant ${f.num}/${f.den} tombe d'un seul tir`));
    }
    // ÷ 10 n'existe que chez les cadets, et il y sert.
    const cadets = Array.from({ length: 40 }, (_, i) => fabriquerSerie(makeRng(`dix-${i}`), 'cadet', 10)).flat();
    assert.ok(cadets.some((f) => f.num % 10 === 0 && f.den % 10 === 0), 'aucune fraction de cadet ne se simplifie par 10');
    for (const cle of ['pilote', 'commandant']) assert.ok(!GRADES[cle].canons.includes(10));
});

test('UN TIR JUSTE DIVISE LE HAUT ET LE BAS, ET L\'IRRÉDUCTIBLE EXPLOSE', () => {
    const m = missionSur([{ num: 12, den: 18 }]);
    const a = m.asteroides[0];
    assert.deepEqual(m.tirer(2), { ok: true, fini: false, id: a.id });
    assert.equal(a.num, 6); assert.equal(a.den, 9);
    const r = m.tirer(3);
    assert.equal(r.fini, true);
    assert.equal(m.asteroides.length, 0);
    const ev = m.evenements.find((e) => e.type === 'irreductible');
    assert.ok(ev, 'pas d\'explosion');
    assert.deepEqual(ev.rapport.chaine, [[12, 18], [6, 9], [2, 3]]);
    assert.deepEqual(ev.rapport.juste, [2, 3]);
    assert.equal(ev.rapport.reussi, true);
    assert.equal(chaineEcrite(ev.rapport.chaine), '12/18 → 6/9 → 2/3');
    // Un canon qui divise d'un coup tout le PGCD passe aussi : ÷ 10 sur 30/70.
    const m2 = missionSur([{ num: 30, den: 70 }]);
    assert.equal(m2.tirer(10).fini, true);
});

test('UN TIR FAUX REBONDIT, FAIT BONDIR L\'ASTÉROÏDE, FAIT SURCHAUFFER LES CANONS', () => {
    const m = missionSur([{ num: 18, den: 25 }, { num: 6, den: 9 }]);
    const a = m.asteroides[0];
    const y0 = a.y;
    m.combo = 4;
    const r = m.tirer(2);
    assert.equal(r.ok, false);
    assert.equal(a.num, 18, 'un tir faux a quand même divisé');
    assert.ok(Math.abs(a.y - (y0 + BOND)) < 1e-9, 'l\'astéroïde n\'a pas bondi');
    assert.equal(m.combo, 1, 'le combo n\'est pas retombé');
    assert.equal(m.surchauffe, SURCHAUFFE);
    // Pendant la surchauffe, rien ne part — même un tir juste.
    assert.equal(m.tirer(5).chaud, true);
    assert.equal(m.tirs, 1, 'un tir bloqué par la surchauffe a été compté');
    for (let t = 0; t < SURCHAUFFE; t += DT) m.avancer(DT);
    assert.equal(m.surchauffe, 0);
    assert.notEqual(m.tirer(5).chaud, true);
});

test('LE MESSAGE D\'UN TIR FAUX NOMME CELUI DES DEUX QUI BLOQUE, ET DIT POURQUOI', () => {
    // L'erreur la plus fréquente : regarder le numérateur seul.
    assert.equal(expliquer(18, 25, 2), '÷ 2 impossible : 18 se divise par 2, mais 25 est impair : il finit par 5.');
    assert.match(expliquer(16, 24, 3), /24 se divise par 3, mais pour 16, 1 \+ 6 = 7, et 7 n'est pas dans la table de 3/);
    assert.match(expliquer(15, 22, 5), /15 se divise par 5, mais 22 ne finit ni par 0 ni par 5/);
    assert.match(expliquer(30, 45, 10), /30 se divise par 10, mais 45 ne finit pas par 0/);
    // Pas de critère simple pour 7, 11, 13 : on dit LE RESTE.
    assert.match(expliquer(50, 70, 7), /50 = 7 × 7 \+ 1, il reste 1/);
    assert.match(expliquer(44, 50, 11), /50 = 11 × 4 \+ 6, il reste 6/);
    assert.equal(expliquer(12, 18, 2), '', 'un tir juste n\'a pas d\'explication d\'échec');
    // Le message part avec l'événement, que l'écran affiche.
    const m = missionSur([{ num: 18, den: 25 }]);
    m.tirer(2);
    assert.equal(m.evenements.find((e) => e.type === 'ricochet').message, expliquer(18, 25, 2));
});

test('PLUS D\'UN REBOND SUR UNE FRACTION : ELLE EXPLOSE, MAIS ELLE EST À REVOIR', () => {
    const essai = (fautes) => {
        const m = missionSur([{ num: 12, den: 18 }]);
        for (let i = 0; i < fautes; i++) {
            m.tirer(5);
            m.surchauffe = 0;
            m.asteroides[0].y = 0.1;
        }
        m.tirer(2); m.tirer(3);
        return m.rapports[0];
    };
    assert.equal(REBONDS_PERMIS, 1, 'la tolérance a changé — remesure avec tools/equilibreAstro.mjs');
    assert.equal(essai(0).reussi, true);
    assert.equal(essai(1).reussi, true, 'se tromper une fois puis corriger, c\'est apprendre');
    assert.equal(essai(2).reussi, false);
    assert.equal(essai(2).fautes, 2);
});

test('QUI CALCULE SIMPLIFIE TOUT, QUI SE TROMPE UN PEU PRESQUE TOUT, QUI MITRAILLE ÉCHOUE', () => {
    // MESURÉ avant la surchauffe et la règle du rebond : le robot qui appuie
    // sur tous les canons à la suite simplifiait 100 % des fractions.
    const taux = (grade, strategie) => {
        let justes = 0, total = 0;
        for (let i = 0; i < 12; i++) {
            const b = jouer({ grade, strategie, graine: `ep-${i}` });
            justes += b.justes; total += b.total;
        }
        return justes / total;
    };
    for (const grade of Object.keys(GRADES)) {
        assert.equal(taux(grade, 'parfait'), 1, `${grade} : qui calcule juste perd une fraction`);
        assert.ok(taux(grade, 'distrait') >= 0.85, `${grade} : se tromper une fois sur quatre coûte trop`);
        assert.ok(taux(grade, 'mitraille') <= 0.5, `${grade} : mitrailler sans calculer réussit encore`);
    }
});

test('UNE FRACTION, UNE QUESTION : LA MISSION EN A EXACTEMENT AUTANT QUE DEMANDÉ', () => {
    for (const combien of [3, 10, 17]) {
        const m = new Mission({ grade: 'pilote', combien, graine: `n-${combien}` });
        // Personne ne tire : toutes passent, et la mission finit quand même.
        let t = 0;
        while (!m.finie && t < 2000) { m.avancer(0.05); t += 0.05; }
        assert.equal(m.finie, true, 'la mission ne finit pas');
        assert.equal(m.rapports.length, combien);
        assert.equal(m.rapports.filter((r) => r.reussi).length, 0);
        assert.equal(m.evenements.filter((e) => e.type === 'impact').length, combien);
        assert.deepEqual(new Set(m.rapports.map((r) => r.rang)).size, combien, 'une fraction rapportée deux fois');
    }
    // LA RÉVISION rejoue les fractions ratées, telles qu'elles étaient au départ.
    const m = new Mission({ grade: 'cadet', fractions: [{ num: 6, den: 14 }, { num: 20, den: 100 }] });
    assert.equal(m.total, 2);
    assert.deepEqual(m.aVenir.map((f) => [f.num, f.den]), [[6, 14], [20, 100]]);
});

test('LE TEMPS DE CHUTE SE COMPTE EN SECONDES, PAS EN PIXELS — ET L\'ALLURE LE CHANGE', () => {
    // Le jeu reçu descendait de 24 px/s : un quart de temps en moins sur un
    // téléphone que sur un ordinateur.
    const chute = (grade, allure) => {
        const m = missionSur([{ num: 12, den: 18 }], { grade, allure });
        const a = m.asteroides[0];
        let t = 0;
        while (m.asteroides.includes(a)) { m.avancer(DT); t += DT; }
        return t;
    };
    const normal = chute('cadet', 'normale');
    assert.ok(Math.abs(normal - GRADES.cadet.chute * 1.08) < 0.5, `cadet : ${normal.toFixed(1)} s`);
    assert.ok(chute('cadet', 'lente') > normal * 1.4);
    assert.ok(chute('cadet', 'rapide') < normal * 0.8);
    assert.ok(GRADES.cadet.chute > GRADES.pilote.chute && GRADES.pilote.chute > GRADES.commandant.chute);
});

test('AUCUNE CAPSULE NE SIMPLIFIE À LA PLACE DE L\'ÉLÈVE', () => {
    // Le rayon « PGCD » du jeu reçu réduisait la fraction d'un coup, et elle
    // comptait comme réussie. Il ÉCRIT maintenant le PGCD : reste à le casser.
    const m = missionSur([{ num: 36, den: 48 }]);
    m.capsules.push({ id: 99, sorte: 'pgcd', x: 0.5, y: 0.5, phase: 0 });
    const ev = m.ramasser(99);
    const a = m.asteroides[0];
    assert.equal(a.num, 36, 'la capsule PGCD a simplifié');
    assert.equal(a.den, 48);
    assert.equal(a.indice, 12);
    assert.equal(ev.indice, 12);
    // L'indice suit la fraction : 12 devient 6 après ÷ 2.
    m.tirer(2);
    assert.equal(a.indice, 6);
    assert.equal(m.rapports.length, 0, 'une fraction a été rapportée sans être finie');

    // Le rempart repousse le prochain astéroïde qui touche, une fois.
    const r = missionSur([{ num: 12, den: 18 }]);
    r.capsules.push({ id: 98, sorte: 'rempart', x: 0.5, y: 0.5, phase: 0 });
    r.ramasser(98);
    assert.equal(r.remparts, 1);
    r.asteroides[0].y = 0.999;
    r.avancer(0.1);
    assert.ok(Math.abs(r.asteroides[0].y - RENVOI_DU_REMPART) < 0.05, 'le rempart n\'a pas repoussé');
    assert.equal(r.remparts, 0);
    assert.equal(r.rapports.length, 0);

    // Stase et × 2 : le temps et les points, jamais la fraction.
    const s = missionSur([{ num: 12, den: 18 }]);
    s.capsules.push({ id: 97, sorte: 'stase', x: 0.5, y: 0.5, phase: 0 }, { id: 96, sorte: 'double', x: 0.5, y: 0.5, phase: 0 });
    s.ramasser(97); s.ramasser(96);
    assert.ok(s.stase > 0 && s.double > 0);
    assert.equal(s.asteroides[0].num, 12);
    assert.deepEqual(Object.keys(CAPSULES).sort(), ['double', 'pgcd', 'rempart', 'stase']);
});

test('LA CIBLE : CELLE QU\'ON TOUCHE, SINON LA PLUS MENAÇANTE PRÈS DU VAISSEAU', () => {
    const m = new Mission({ grade: 'cadet', fractions: [{ num: 12, den: 18 }, { num: 6, den: 14 }] });
    m.lancer(); m.lancer();
    const [a, b] = m.asteroides;
    a.x = 0.2; a.y = 0.2; b.x = 0.8; b.y = 0.7;
    m.vaisseau.x = 0.5;
    assert.equal(m.cible(), b, 'la plus basse n\'est pas visée');
    m.verrouiller(a.id);
    assert.equal(m.cible(), a, 'toucher un astéroïde ne le vise pas');
    m.tirer(2);
    assert.equal(a.num, 6, 'le tir n\'est pas parti sur l\'astéroïde touché');
    // Bouger le vaisseau libère le verrou.
    m.diriger(0.9);
    assert.equal(m.verrou, null);
});

test('LE MÉMO DES CRITÈRES ET LES COULEURS COUVRENT TOUS LES CANONS', () => {
    const tous = new Set(Object.values(GRADES).flatMap((g) => g.canons));
    for (const d of tous) {
        assert.ok(CRITERES[d], `pas de critère pour ÷ ${d}`);
        assert.match(COULEURS[d] || '', /^#[0-9a-f]{6}$/, `pas de couleur pour ÷ ${d}`);
    }
    // Ni vert ni rouge purs : ils disent « juste » et « faux » partout ailleurs.
    for (const c of Object.values(COULEURS)) assert.ok(!['#22c55e', '#ef4444', '#00ff00', '#ff0000'].includes(c));
    assert.equal(new Set(Object.values(COULEURS)).size, Object.keys(COULEURS).length, 'deux canons de la même couleur');
});

test('L\'ÉCRAN : PAS DE SON, RIEN HORS DE LA FENÊTRE, UNE FRACTION PAR QUESTION', () => {
    const JEU = sansCommentaires(lire('js/games/astroSimplif.js'));
    const COEUR = sansCommentaires(lire('js/core/astroSimplif.js'));
    // « ne mets pas le son », demandé pour MultiKart et repris ici.
    for (const motif of [/AudioContext/, /new Audio\b/, /\.play\(/]) assert.ok(!motif.test(JEU), `du son : ${motif}`);
    // Le record du jeu reçu vivait dans le navigateur : les statistiques du logiciel le font.
    assert.ok(!/localStorage/.test(JEU) && !/localStorage/.test(COEUR));
    // Tout tient dans le conteneur : ni position fixe, ni taille lue sur la fenêtre.
    assert.ok(!/position:\s*fixed/.test(JEU), 'un élément en position fixe');
    assert.ok(!/100d?vh|innerWidth|innerHeight/.test(JEU), 'une taille lue sur la fenêtre du navigateur');
    assert.ok(!/\b(alert|confirm|prompt)\(/.test(JEU), 'une fenêtre native');
    // Le cœur ne connaît ni la page ni l'horloge.
    assert.ok(!/document\.|window\.|performance\.now|Math\.random/.test(COEUR), 'le cœur touche à la page ou tire au hasard sans graine');

    const debut = JEU.indexOf('    rapporter(r) {');
    const rapporter = JEU.slice(debut, JEU.indexOf('\n    }\n', debut));
    assert.ok(/onCorrectAnswer\(null, COMPETENCE,/.test(rapporter));
    assert.ok(/onWrongAnswer\(/.test(rapporter) && /attemptIndex:\s*9/.test(rapporter) && /silencieux:\s*true/.test(rapporter));
    assert.ok(/partiel = !this\.comptee/.test(rapporter), 'les missions rejouées s\'ajouteraient aux questions de l\'étape');
    assert.ok(/dernier && this\.comptee\) this\.retenue = envoi/.test(rapporter), 'la dernière fraction ne attend plus « Continuer »');
    assert.ok(/this\.tempsReel = true/.test(JEU));
    assert.ok(/this\.params\.nbQuestions/.test(JEU), 'la mission n\'a plus le nombre de fractions de l\'étape');
    assert.ok(/this\.enEvaluation/.test(JEU), 'en évaluation, on rejouerait');
});

test('ASTRO-SIMPLIF EST INSCRIT, NOTABLE, ET SES RÉGLAGES SONT CEUX DU CŒUR', () => {
    const a = getActivity('astro-simplif');
    assert.ok(a, 'activité absente du registre');
    assert.equal(a.unite, 'fraction');
    assert.equal(a.parDefaut, 10);
    const ex = exercices.find((e) => e.id === 'frac-astro-simplif');
    assert.ok(ex, 'exercice absent du catalogue');
    assert.equal(ex.activityId, 'astro-simplif');
    assert.equal(CODES_EXERCICES['frac-astro-simplif'], 'FS');
    assert.equal(estNotable(ex), true, 'une mission où chaque fraction compte doit donner une note');
    ex.skills.forEach((s) => assert.ok(SKILLS[s], `compétence inconnue « ${s} »`));
    const schema = Object.fromEntries(ex.paramSchema.map((s) => [s.id, s]));
    const valeurs = (id) => schema[id].options.map((o) => o.value);
    assert.deepEqual(valeurs('grade'), Object.keys(GRADES));
    assert.deepEqual(valeurs('allure'), Object.keys(ALLURES));
    for (const s of ex.paramSchema) assert.ok(valeurs(s.id).includes(ex.params[s.id]), `${s.id} : défaut hors du menu`);
    // Le menu dit les canons de chaque grade : un professeur choisit sur eux.
    schema.grade.options.forEach((o) => GRADES[o.value].canons.forEach((d) =>
        assert.ok(o.label.includes(String(d)), `le libellé de « ${o.value} » ne dit pas le canon ÷ ${d}`)));
    for (const mot of [/irréductible/i, /numérateur ET le dénominateur/i, /rebondit/i, /touche/i, /pause/i,
        /pgcd/i, /rempart/i, /rapport de mission/i]) {
        assert.ok(mot.test(ex.instruction), `la consigne ne dit rien de ${mot}`);
    }
});
