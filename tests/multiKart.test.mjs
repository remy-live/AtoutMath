// MULTIKART — ce que la course doit tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 23 novembre, en collant un jeu complet écrit ailleurs : « voilà un jeu
// canon, tu me l'améliores, le rends encore plus beau, plus cohérent, ne mets
// pas le son ». Puis : « il faut que tout passe dans la fenêtre et que ce soit
// compatible téléphone portable ». Puis, la première version sous les yeux :
// « améliore le décor aussi mais vraiment super bien […] plusieurs circuits et
// plusieurs ambiances et rajouter des bonus », et « configurer pour ne pas
// avoir que des tables de pythagore (addition, x10, x100, etc et on a le
// résultat et il faut trouver le calcul) et aussi pas forcément que 3
// passages, ca peut être 2, puis 3 puis 4 ».
//
// « PLUS BEAU » NE SE GARDE PAS PAR UNE ÉPREUVE : cela se regarde, et les
// photos sont dans `tools/tmp/` après `node tools/sondeMultiKart.mjs`. Ce
// fichier garde ce qui se mesure :
//
//   · LES CALCULS — six familles, deux sens, un seul bon panneau, des leurres
//     qui viennent d'une vraie erreur, jamais une virgule flottante ;
//   · LES VOIES — deux, trois, quatre, et le passage de l'une à l'autre ;
//   · COHÉRENT — on est jugé là où est le kart ; qui calcule juste gagne ; qui
//     suit le kart de devant n'apprend rien et ne gagne rien ; un bonus tiré
//     sert là où l'on est, et AUCUN NE DONNE LA RÉPONSE ;
//   · LES HUIT CIRCUITS — chacun a tout ce qu'il annonce, et sa piste se lit ;
//   · PAS DE SON, TOUT DANS LA FENÊTRE.
//
// Le chemin de l'élève — un doigt sur un téléphone — est mesuré par la sonde,
// pas ici : une épreuve sans écran ne sait pas où tombe un panneau.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import '../js/core/activities/index.js';
import { getActivity } from '../js/core/registry.js';
import { exercices, estNotable } from '../js/data/catalog.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';
import { SKILLS } from '../js/data/skills.js';
import { conceptToSkill } from '../js/core/compat.js';
import { makeRng } from '../js/core/ids.js';
import { contrasteCouleurs } from '../js/core/petitesAiles.js';
import {
    Course, PISTE, ALLURES, CIRCUITS, ARCHES, BONUS, PILOTES, DUREES, SERIE_BONUS,
    LENTEUR_DU_SABLIER, FONDU_DU_RELIEF, tempsEcrit, rangEcrit
} from '../js/core/multiKart.js';
import {
    FAMILLES, SENS, ecrire, decaler, leFait, tirerFait, leurresDeResultat, leurresDeCalcul,
    fabriquerUnPortique, fabriquerPortiques, voiesDuPortique, centresDesVoies, voieDe
} from '../js/core/multiKartCalculs.js';
import { OBJETS_CONNUS } from '../js/games/multiKartObjets.js';
import { FONDS_CONNUS, METEOS_CONNUES } from '../js/games/multiKartFonds.js';
import { jouer } from '../tools/equilibreDuKart.mjs';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const DT = 1 / 60;
const TOUTES = Object.keys(FAMILLES);
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Rouler jusqu'à ce que `quand` soit vrai ; rend les événements du dernier pas. */
function rouler(k, quand, max = 400) {
    let ev = [];
    for (let t = 0; t < max && !quand(k); t += DT) ev = k.avancer(DT);
    return ev;
}

/** La valeur d'un texte de nombre : « 3,400 » vaut 3,4 — pour dire si deux écritures sont le même nombre. */
const valeurDe = (texte) => Number(texte.replace(/\s/g, '').replace(',', '.').replace('−', '-'));

/** La valeur d'un calcul écrit : « 3,4 × 100 », « 56 ÷ 7 », « 47 + 8 ». */
function calculer(texte) {
    const m = /^(.+?) ([×÷+−]) (.+)$/.exec(texte);
    assert.ok(m, `calcul illisible : ${texte}`);
    const a = valeurDe(m[1]), b = valeurDe(m[3]);
    const r = m[2] === '×' ? a * b : m[2] === '÷' ? a / b : m[2] === '+' ? a + b : a - b;
    return Math.round(r * 1e6) / 1e6;
}

/* ─────────────────────────────────────────────────────────────────────────
 * LES NOMBRES
 * ───────────────────────────────────────────────────────────────────────── */

test('UN DÉCIMAL EST UN ENTIER ET UN RANG — jamais une virgule flottante', () => {
    // 0,1 + 0,2 ne fait pas 0,3 dans une machine : un panneau qui afficherait
    // « 34,000000000004 » serait une faute du logiciel comptée à l'élève.
    assert.equal(ecrire(34, 1), '3,4');
    assert.equal(ecrire(340, 2), '3,4', 'les zéros inutiles restent');
    assert.equal(ecrire(7, 2), '0,07');
    assert.equal(ecrire(340, 0), '340');
    assert.equal(ecrire(12000, 0).replace(/\s/g, ' '), '12 000');
    assert.equal(ecrire(8000, 0), '8000');
    assert.deepEqual(decaler(34, 1, 2), [340, 0]);
    assert.deepEqual(decaler(7, 2, 1), [7, 1]);
    assert.deepEqual(decaler(340, 0, -2), [34, 1]);
    assert.deepEqual(decaler(5, 0, -3), [5, 3]);
    // Aucun texte produit ne porte la trace d'un flottant.
    const rng = makeRng('flottant');
    for (let i = 0; i < 3000; i++) {
        const f = tirerFait(i % 2 ? 'dix' : 'dixieme', rng);
        for (const t of [f.calcul, f.resultat, ...leurresDeResultat(f, rng)]) {
            assert.ok(!/\d{9,}|e-|\./.test(t.replace(/\s/g, '')), `écriture suspecte : ${t}`);
        }
        assert.ok(Math.abs(calculer(f.calcul) - valeurDe(f.resultat)) < 1e-9, `${f.egalite} est faux`);
    }
});

/* ─────────────────────────────────────────────────────────────────────────
 * LES CALCULS
 * ───────────────────────────────────────────────────────────────────────── */

test('SIX FAMILLES, ET CHAQUE ÉGALITÉ EST JUSTE', () => {
    assert.deepEqual(TOUTES, ['mul', 'div', 'add', 'sub', 'dix', 'dixieme']);
    const rng = makeRng('justes');
    for (const op of TOUTES) {
        for (let i = 0; i < 1500; i++) {
            const f = tirerFait(op, rng, TABLES);
            assert.equal(f.op, op);
            assert.ok(Math.abs(calculer(f.calcul) - valeurDe(f.resultat)) < 1e-9, `${f.egalite} est faux`);
            assert.equal(f.egalite, `${f.calcul} = ${f.resultat}`);
            assert.ok(valeurDe(f.resultat) > 0, `${f.egalite} : résultat nul ou négatif`);
            // La compétence existe dans le référentiel : c'est elle que le
            // bilan du professeur retient.
            const competence = conceptToSkill(f.competence);
            assert.ok(SKILLS[competence], `${f.egalite} : compétence inconnue « ${f.competence} »`);
        }
    }
    // Une division tombe juste, et une soustraction ne passe pas sous zéro.
    for (let i = 0; i < 500; i++) {
        const d = tirerFait('div', rng, TABLES);
        assert.equal(d.a % d.b, 0);
        const s = tirerFait('sub', rng);
        assert.ok(s.a > s.b);
    }
});

test('LES TABLES DEMANDÉES SONT LES TABLES POSÉES — multiplications ET divisions', () => {
    // Le réglage du professeur : « tables 7 et 8 » ne doit jamais poser 3 × 4.
    const rng = makeRng('tables');
    const sens = new Set();
    for (let i = 0; i < 400; i++) {
        const m = tirerFait('mul', rng, [7, 8]);
        assert.ok([7, 8].includes(m.table) && (m.a === m.table || m.b === m.table), m.calcul);
        assert.equal(m.competence, `mult:${m.table}`);
        sens.add(m.a === m.table ? 'devant' : 'derrière');
        const d = tirerFait('div', rng, [7, 8]);
        assert.ok([7, 8].includes(d.b), `${d.calcul} n'est pas une table de 7 ou de 8`);
    }
    // Les deux sens sont posés : savoir 7 × 8 n'est pas encore savoir 8 × 7.
    assert.equal(sens.size, 2);
});

test('UN SEUL BON PANNEAU, DANS LES DEUX SENS, SUR DEUX, TROIS ET QUATRE VOIES', () => {
    const rng = makeRng('panneaux');
    for (const op of TOUTES) for (const sens of ['resultat', 'calcul']) for (const voies of [2, 3, 4]) {
        for (let i = 0; i < 500; i++) {
            const f = tirerFait(op, rng, TABLES);
            const p = fabriquerUnPortique(f, sens, voies, rng, i);
            const ou = `${op}/${sens}/${voies} : ${p.question} [${p.choix.join(' | ')}]`;
            // AUTANT DE VOIES QU'ON EN DEMANDE : une famille qui n'aurait pas
            // assez de leurres rendrait un portique à une seule arche — vu au
            // premier essai, sur « 22 + 40 ».
            assert.equal(p.voies, voies, ou);
            assert.equal(p.choix.length, voies, ou);
            assert.equal(new Set(p.choix).size, voies, `deux panneaux identiques — ${ou}`);
            assert.equal(p.choix[p.voieJuste], p.juste, ou);
            // UN SEUL EST JUSTE, EN VALEUR. « 24 = ? » ne doit pas offrir
            // 4 × 6 et 3 × 8 : deux bonnes arches, dont une comptée fausse.
            const cible = valeurDe(f.resultat);
            const justes = p.choix.filter((t) => Math.abs((sens === 'calcul' ? calculer(t) : valeurDe(t)) - cible) < 1e-9);
            assert.deepEqual(justes, [p.juste], `plusieurs bons panneaux — ${ou}`);
            if (sens === 'calcul') {
                assert.equal(p.question, `${f.resultat} = ?`);
                // Deux leurres n'ont jamais la même valeur : « 2 × 3 » et « 3 × 2 ».
                assert.equal(new Set(p.choix.map(calculer)).size, voies, `deux calculs de même valeur — ${ou}`);
                p.choix.forEach((t, v) => {
                    assert.ok(p.verites[v].startsWith(`${t} = `), ou);
                    assert.ok(Math.abs(calculer(t) - valeurDe(p.verites[v].split(' = ')[1])) < 1e-9, `vérité fausse : ${p.verites[v]}`);
                });
            } else {
                assert.equal(p.question, `${f.calcul} = ?`);
                assert.equal(p.verites, null);
            }
        }
    }
});

test('LES LEURRES VIENNENT D\'UNE VRAIE ERREUR — chaque famille a les siennes', () => {
    const rng = makeRng('erreurs');
    // 3,4 × 100 → « 3,400 » : ON AJOUTE DES ZÉROS. L'erreur que la leçon de
    // sixième existe pour défaire doit être sur la piste, écrite telle quelle.
    const f = leFait('dix', [34, 1], 2);
    assert.equal(f.egalite, '3,4 × 100 = 340');
    for (let i = 0; i < 20; i++) {
        const l = leurresDeResultat(f, rng);
        assert.equal(l[0], '3,400', 'le piège à zéros n\'est pas le premier leurre');
        assert.ok(l.includes('34') && l.includes('3400'), `la virgule mal placée manque : ${l}`);
    }
    // Un entier qu'on multiplie par 100 : ajouter des zéros est JUSTE, donc pas un leurre.
    assert.ok(!leurresDeResultat(leFait('dix', [7, 0], 2), rng).includes('700'));
    // 47 + 8 → 45 : la retenue oubliée. 53 − 7 → 54 : « 7 − 3 ».
    assert.ok(leurresDeResultat(leFait('add', 47, 8), rng).includes('45'));
    assert.ok(leurresDeResultat(leFait('sub', 53, 7), rng).includes('54'));
    // 7 × 8 → le voisin dans la table, l'addition, les chiffres retournés.
    const mul = leurresDeResultat(leFait('mul', 7, 8), rng);
    for (const v of ['49', '63', '15', '65']) assert.ok(mul.includes(v), `7 × 8 : le leurre ${v} manque`);
    // 56 ÷ 7 → le diviseur lui-même.
    assert.ok(leurresDeResultat(leFait('div', 56, 7), rng).includes('7'));
    // Dans le sens inverse, les voisins sont de la même famille.
    for (const op of TOUTES) {
        const g = tirerFait(op, rng, TABLES);
        for (const v of leurresDeCalcul(g, rng)) {
            assert.equal(v.op, op);
            assert.notEqual(v.valeur, g.valeur);
        }
    }
});

test('LE BON PANNEAU N\'A PAS DE VOIE PRÉFÉRÉE', () => {
    // Sinon « toujours au milieu » devient une stratégie.
    for (const voies of [2, 3, 4]) {
        const compte = Array(voies).fill(0);
        const liste = fabriquerPortiques({ familles: TOUTES, tables: TABLES, voies }, 2400, makeRng(`v${voies}`));
        for (const p of liste) compte[p.voieJuste]++;
        for (const n of compte) {
            assert.ok(n > (2400 / voies) * 0.85 && n < (2400 / voies) * 1.15, `${voies} voies : ${compte}`);
        }
    }
});

test('ON NE POSE PAS DEUX FOIS DE SUITE LE MÊME CALCUL, ET « MIXTE » ALTERNE', () => {
    for (let g = 0; g < 30; g++) {
        const liste = fabriquerPortiques({ familles: ['mul'], tables: [2, 3] }, 20, makeRng(`suite${g}`));
        for (let i = 1; i < liste.length; i++) assert.notEqual(liste[i].fait.calcul, liste[i - 1].fait.calcul);
    }
    const mixte = fabriquerPortiques({ familles: ['mul', 'add'], sens: 'mixte' }, 12, makeRng('mixte'));
    assert.deepEqual(mixte.map((p) => p.sens), Array.from({ length: 12 }, (_, i) => (i % 2 ? 'calcul' : 'resultat')));
    assert.deepEqual(SENS, ['resultat', 'calcul', 'mixte']);
    // Une famille inconnue ne casse rien : on retombe sur les tables.
    assert.equal(fabriquerPortiques({ familles: ['racines'] }, 3, makeRng('x'))[0].fait.op, 'mul');
});

test('UNE COURSE SE REFAIT À L\'IDENTIQUE À PARTIR DE SA GRAINE', () => {
    // Le fichier reçu appelait `Math.random()` trente fois. Une course qu'on ne
    // peut pas refaire ne se mesure pas — et le professeur qui ouvre l'écran
    // de son élève doit y voir les mêmes calculs.
    const r = { familles: TOUTES, sens: 'mixte', voies: 'progressif' };
    const a = new Course({ graine: 'x', ...r }), b = new Course({ graine: 'x', ...r }), c = new Course({ graine: 'y', ...r });
    assert.deepEqual(a.portiques.map((p) => [p.question, p.choix]), b.portiques.map((p) => [p.question, p.choix]));
    assert.notDeepEqual(a.portiques.map((p) => p.question), c.portiques.map((p) => p.question));
    for (const k of [a, b]) { k.demarrer(); rouler(k, (x) => x.etat === 'arrivee'); }
    assert.deepEqual(a.bilan(), b.bilan(), 'deux courses de même graine ne finissent pas pareil');
});

test('RÉVISER SES ERREURS : CHAQUE CALCUL RATÉ REPASSE, PUIS RETOURNÉ S\'IL SE RETOURNE', () => {
    const faits = [leFait('mul', 7, 8), leFait('add', 47, 8), leFait('sub', 53, 7), leFait('dix', [34, 1], 2)];
    faits[0].table = 7; faits[0].competence = 'mult:7';
    const k = new Course({ faits, graine: 'r' });
    assert.equal(k.total, 8);
    assert.ok(k.revision);
    assert.deepEqual(k.portiques.map((p) => p.fait.calcul),
        ['7 × 8', '47 + 8', '53 − 7', '3,4 × 100', '8 × 7', '8 + 47', '53 − 7', '3,4 × 100']);
    // Retournée, la multiplication garde sa table et sa compétence.
    assert.equal(k.portiques[4].fait.competence, 'mult:7');
    // Une seule erreur : cinq portiques quand même. Douze : quinze au plus.
    assert.equal(new Course({ faits: faits.slice(0, 1) }).total, 5);
    assert.equal(new Course({ faits: Array.from({ length: 12 }, (_, i) => leFait('mul', 2 + (i % 8), 3)) }).total, 15);
});

/* ─────────────────────────────────────────────────────────────────────────
 * LES VOIES
 * ───────────────────────────────────────────────────────────────────────── */

test('DEUX, PUIS TROIS, PUIS QUATRE — Rémy : « ça peut être 2, puis 3 puis 4 »', () => {
    assert.deepEqual(Array.from({ length: 10 }, (_, i) => voiesDuPortique('progressif', i, 10)), [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
    assert.deepEqual(Array.from({ length: 6 }, (_, i) => voiesDuPortique('progressif', i, 6)), [2, 2, 3, 3, 4, 4]);
    for (const n of [2, 3, 4]) {
        assert.equal(voiesDuPortique(n, 5, 10), n);
        assert.equal(voiesDuPortique(String(n), 5, 10), n);
    }
    assert.equal(voiesDuPortique('n\'importe quoi', 0, 10), 3);
    // Les centres sont symétriques, dans la piste, et chaque kart est dans sa voie.
    for (const n of [2, 3, 4]) {
        const c = centresDesVoies(n);
        assert.equal(c.length, n);
        c.forEach((x, i) => {
            assert.ok(Math.abs(x) < 1 && Math.abs(x + c[n - 1 - i]) < 1e-9);
            assert.equal(voieDe(x, n), i);
        });
    }
    const k = new Course({ graine: 'voies', voies: 'progressif' });
    assert.deepEqual(k.portiques.map((p) => p.voies), [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
});

test('LA PISTE EST REPEINTE APRÈS CHAQUE PORTIQUE, ET LE KART NE FAIT PAS D\'ÉCART', () => {
    const k = new Course({ graine: 'repeinte', voies: 'progressif', portiques: 6 });
    // Chaque segment porte le nombre de voies du portique qui VIENT.
    k.portiques.forEach((p, i) => {
        assert.equal(k.segments[p.segment].voies, p.voies);
        assert.equal(k.segments[p.segment - 10].voies, p.voies);
        if (i + 1 < k.portiques.length) assert.equal(k.segments[p.segment + 1].voies, k.portiques[i + 1].voies);
    });
    k.demarrer();
    let avant = k.voiesIci;
    assert.equal(avant, 2);
    assert.ok(k.joueur.voie >= 0 && k.joueur.voie < 2);
    // On roule calé dans la DERNIÈRE voie, sans plus y toucher : c'est de là
    // qu'un écart se verrait. La première écriture de cette épreuve visait la
    // voie 0 à chaque image — et la voie 0 reste la voie 0 quel que soit le
    // nombre de voies : elle passait avec le défaut remis.
    k.viser(9);
    assert.equal(k.joueur.voie, 1, 'viser au-delà de la dernière voie doit s\'arrêter à la dernière');
    let changements = 0;
    for (let t = 0; t < 200 && k.etat === 'course'; t += DT) {
        k.avancer(DT);
        if (k.etat !== 'course') break;
        if (k.voiesIci !== avant) {
            changements++;
            assert.equal(k.joueur.voie, voieDe(k.joueur.x, k.voiesIci), 'le kart a changé de voie tout seul');
            assert.equal(k.joueur.voie, k.voiesIci - 1, 'calé à droite, on reste à droite');
            avant = k.voiesIci;
        }
        assert.ok(k.joueur.voie < k.voiesIci);
    }
    assert.equal(changements, 2);
    k.viser(-3);
    assert.equal(avant, 4);
});

/* ─────────────────────────────────────────────────────────────────────────
 * LA PISTE
 * ───────────────────────────────────────────────────────────────────────── */

test('LA PISTE NE SE CASSE PAS, VA PLUS LOIN QUE LA LIGNE, ET SON BORD VARIE', () => {
    const k = new Course({ portiques: 12 });
    for (let i = 1; i < k.segments.length; i++) {
        assert.equal(k.segments[i].p1.y, k.segments[i - 1].p2.y, `marche au segment ${i}`);
    }
    k.portiques.forEach((p, i) => {
        assert.equal(p.segment, PISTE.PREMIER_PORTIQUE + i * PISTE.SEGMENTS_PAR_PORTIQUE);
        assert.equal(k.segments[p.segment].portique, p);
    });
    // De la piste après l'arrivée, plus loin que ne porte le regard.
    assert.ok(k.segments.length - k.segmentArrivee > PISTE.PORTEE, 'on voit le bord du monde après la ligne');
    // La caméra roule 1 200 unités derrière le kart : il lui faut de la piste dès la grille.
    assert.ok(PISTE.DEPART * PISTE.LONGUEUR_SEGMENT >= 1300);
    // Le prochain portique est toujours en vue : on a tout le trajet pour calculer.
    assert.ok(PISTE.PORTEE > PISTE.SEGMENTS_PAR_PORTIQUE);
    // LE BORD DE LA PISTE N'EST PAS UN PAPIER PEINT : quatre sortes d'objets,
    // des repères, des chevrons dans les virages serrés — et rien sur la route.
    const decors = k.segments.flatMap((s) => s.decors.map((d) => ({ ...d, courbe: s.courbe })));
    assert.equal(new Set(decors.filter((d) => d.genre === 'objet').map((d) => d.sorte)).size, 4);
    assert.ok(decors.filter((d) => d.genre === 'repere').length >= 8);
    const chevrons = decors.filter((d) => d.genre === 'chevron');
    assert.ok(chevrons.length >= 6, 'aucun chevron dans les virages');
    for (const d of chevrons) {
        assert.ok(Math.abs(d.courbe) > 1.9);
        assert.equal(Math.sign(d.cote), -Math.sign(d.courbe), 'un chevron est à l\'intérieur du virage');
        assert.equal(d.sens, Math.sign(d.courbe));
    }
    for (const d of decors) assert.ok(Math.abs(d.cote) > 1.2, `un décor est posé sur la piste (${d.cote})`);
    assert.ok(new Set(decors.map((d) => d.taille.toFixed(2))).size > 20, 'tous les objets ont la même taille');
});

test('NI TREMPLIN AU DÉPART, NI FALAISE À L\'ARRIVÉE', () => {
    // RÉMY, en jouant : « au début, tu fais une sorte de tremplin et à la fin
    // aussi, je ne vois pas l'intérêt pour le kart. » La formule reçue mettait
    // les bosses en marche d'un coup : une marche de 564 au troisième segment
    // après la grille, une chute de 1 023 avant la ligne, quand le reste de la
    // piste ne dépasse jamais 39. L'épreuve d'au-dessus ne voyait rien : elle
    // vérifie que les segments se RACCORDENT, pas qu'ils ne font pas un mur.
    for (const portiques of [3, 5, 8, 10, 15, 20, 30]) {
        const k = new Course({ portiques });
        let pire = 0, ou = 0;
        for (const s of k.segments) {
            const d = Math.abs(s.p2.y - s.p1.y);
            if (d > pire) { pire = d; ou = s.index; }
        }
        // Le relief lui-même monte de 39 par segment au plus : rien n'est plus raide.
        assert.ok(pire < 45, `${portiques} portiques : une marche de ${pire.toFixed(0)} au segment ${ou} (arrivée au ${k.segmentArrivee})`);
        // La grille est plate et droite ; la ligne d'arrivée aussi.
        for (const n of [0, PISTE.DEPART, PISTE.DEPART + 2, k.segmentArrivee - 9, k.segmentArrivee, k.segmentArrivee + 30]) {
            // La valeur absolue : un sinus négatif multiplié par zéro rend « −0 ».
            assert.equal(Math.abs(k.segments[n].p2.y), 0, `segment ${n} : la piste n'est pas à plat`);
            assert.equal(Math.abs(k.segments[n].courbe), 0, `segment ${n} : la piste tourne`);
        }
        // Le virage non plus ne se déclenche pas d'un coup.
        for (let i = 1; i < k.segments.length; i++) {
            assert.ok(Math.abs(k.segments[i].courbe - k.segments[i - 1].courbe) < 0.12, `coup de volant au segment ${i}`);
        }
        // Et le relief est bien là au milieu : on n'a pas aplati la piste pour autant.
        assert.ok(Math.max(...k.segments.map((s) => Math.abs(s.p2.y))) > (portiques > 3 ? 600 : 200));
    }
    assert.ok(FONDU_DU_RELIEF >= 60);
});

test('L\'ALLURE DONNE LE TEMPS ANNONCÉ ENTRE DEUX PORTIQUES', () => {
    // Le réglage du professeur dit « 6 secondes par calcul » : c'est une promesse.
    for (const [nom, a] of Object.entries(ALLURES)) {
        const s = (PISTE.SEGMENTS_PAR_PORTIQUE * PISTE.LONGUEUR_SEGMENT) / a.croisiere;
        assert.ok(Math.abs(s - a.secondes) < 0.15, `${nom} : ${s.toFixed(2)} s, annoncé ${a.secondes}`);
        assert.ok(a.toux < a.croisiere && a.croisiere < a.etoile && a.etoile <= a.turbo, nom);
    }
    // Rémy : « rajouter encore une option qui est plus lente que le plus bas ».
    assert.equal(Object.keys(ALLURES)[0], 'ralenti');
    assert.ok(ALLURES.ralenti.secondes > ALLURES.tranquille.secondes * 1.25);
});

/* ─────────────────────────────────────────────────────────────────────────
 * COHÉRENT
 * ───────────────────────────────────────────────────────────────────────── */

test('ON EST JUGÉ LÀ OÙ EST LE KART, PAS LÀ OÙ L\'ON VISE', () => {
    // Le fichier reçu jugeait la voie VISÉE : un appui au dernier centième
    // comptait, alors que le kart était encore, à l'écran, sous une autre arche.
    const k = new Course({ graine: 'juge', voies: 3 });
    k.demarrer();
    const p = k.portiques[0];
    // La voie d'à côté : parti de deux voies plus loin, le kart traverserait
    // celle du milieu, et c'est elle qui serait jugée — à juste titre.
    const voisine = (v) => (v === 1 ? 0 : 1);
    const autre = voisine(p.voieJuste);
    k.viser(autre);
    rouler(k, (x) => p.z - x.joueur.z < x.joueur.vitesse * DT * 1.5);
    assert.equal(voieDe(k.joueur.x, 3), autre, 'le kart devrait être installé dans l\'autre voie');
    k.viser(p.voieJuste);               // l'appui du dernier centième
    rouler(k, () => p.passe);
    assert.equal(p.reussi, false, 'un appui au dernier instant a compté');
    assert.equal(p.donne, p.choix[autre], 'la réponse retenue n\'est pas celle de la voie où était le kart');
    assert.equal(p.voieDonnee, autre);

    // Et dans l'autre sens : installé dans la bonne voie, on ne perd pas le
    // portique pour avoir touché l'écran trop tard.
    const q = k.portiques[1];
    k.viser(q.voieJuste);
    rouler(k, (x) => q.z - x.joueur.z < x.joueur.vitesse * DT * 1.5);
    k.viser(voisine(q.voieJuste));
    rouler(k, () => q.passe);
    assert.equal(q.reussi, true);
});

test('JUSTE, ON ACCÉLÈRE ; FAUX, ON TOUSSE — ET LA CORRECTION SUIT TOUJOURS', () => {
    const k = new Course({ graine: 'elan', voies: 3 });
    k.demarrer();
    const [p, q] = k.portiques;
    k.viser(p.voieJuste);
    let ev = rouler(k, () => p.passe);
    assert.ok(ev.some((e) => e.quoi === 'portique' && e.juste && e.portique === p));
    assert.ok(k.turbo > 0 && k.toux === 0);
    k.viser((q.voieJuste + 1) % 3);
    ev = rouler(k, () => q.passe);
    const faute = ev.find((e) => e.quoi === 'portique');
    assert.ok(faute && !faute.juste && faute.portique.egalite === q.fait.egalite, 'l\'événement ne porte pas la bonne égalité');
    assert.ok(k.toux > 0 && k.turbo === 0 && k.serie === 0);

    // LE BOUCLIER ÉPARGNE LA VITESSE, JAMAIS LA LEÇON.
    const r = k.portiques[2];
    k.bouclier = true;
    k.viser((r.voieJuste + 1) % 3);
    rouler(k, (x) => x.toux === 0 && r.z - x.joueur.z < 2000);
    ev = rouler(k, () => r.passe);
    const protegee = ev.find((e) => e.quoi === 'portique');
    assert.equal(protegee.protege, 'bouclier');
    assert.equal(protegee.juste, false);
    assert.equal(k.toux, 0, 'le bouclier n\'a pas tenu');
    assert.equal(k.bouclier, false, 'le bouclier sert une fois');
    assert.equal(k.rates.length, 2, 'une erreur protégée doit rester une erreur à revoir');
});

test('QUI CALCULE JUSTE GAGNE ; QUI NE FAIT RIEN NE GAGNE PAS', () => {
    // Mesuré (`node tools/equilibreDuKart.mjs`) : tout juste, premier plus de
    // neuf fois sur dix ; inerte, moins d'une réussite sur deux et la troisième
    // place en moyenne — même sur les voies progressives, qui commencent à deux.
    for (const voies of [3, 'progressif']) for (const allure of Object.keys(ALLURES)) {
        let premier = 0, rangInerte = 0, reussiteInerte = 0;
        const N = 20;
        for (let i = 0; i < N; i++) {
            const b = jouer(`g${i}`, allure, 'juste', { voies });
            assert.equal(b.justes, b.total);
            if (b.rang === 1) premier++;
            const c = jouer(`g${i}`, allure, 'inerte', { voies });
            rangInerte += c.rang; reussiteInerte += c.precision;
        }
        const ou = `${allure}, ${voies} voies`;
        assert.ok(premier >= N * 0.85, `${ou} : tout juste, et premier seulement ${premier} fois sur ${N}`);
        assert.ok(rangInerte / N > 2.5, `${ou} : ne rien faire finit ${(rangInerte / N).toFixed(2)}e en moyenne`);
        assert.ok(reussiteInerte / N < 0.5, `${ou} : ne rien faire réussit ${(100 * reussiteInerte / N).toFixed(0)} %`);
    }
});

test('SUIVRE LE KART DE DEVANT NE DONNE PAS LA RÉPONSE', () => {
    // LA GARDE QUI A ÉTÉ PAYÉE. La première version faisait répondre les rivaux
    // à NOTRE question : juste, ils prenaient la bonne arche. Vu sur la photo
    // du troisième portique — trois karts rangés dans la voie du bon résultat,
    // une seconde avant que l'élève qui les suit ait à choisir. Léo a juste
    // neuf fois sur dix : il suffisait de le suivre, et c'est l'élève en
    // retard, celui qui a le plus besoin de calculer, qui l'avait sous les
    // yeux. Chacun a maintenant son calcul : sa voie ne dit rien de la nôtre.
    let reussite = 0;
    const N = 40;
    for (let i = 0; i < N; i++) reussite += jouer(`s${i}`, 'tranquille', 'suiveur', { voies: 3 }).precision;
    assert.ok(reussite / N < 0.45,
        `suivre le rival de devant réussit ${(100 * reussite / N).toFixed(0)} % des portiques : c'est une antisèche`);

    // Et à la source : la voie qu'un rival occupe en passant sous un portique
    // n'est celle du bon résultat qu'une fois sur trois, quelle que soit sa justesse.
    const dans = { leo: [0, 0], mia: [0, 0], sacha: [0, 0] };
    for (let i = 0; i < 60; i++) {
        const k = new Course({ graine: `r${i}`, voies: 3 });
        k.demarrer();
        const vus = k.rivaux.map(() => 0);
        for (let t = 0; t < 400 && k.etat !== 'arrivee'; t += DT) {
            const p = k.portiqueActif;
            if (p) k.viser(p.voieJuste);
            k.avancer(DT);
            k.rivaux.forEach((r, n) => {
                while (vus[n] < r.portique) {
                    dans[r.id][1]++;
                    if (r.voieAuPortique === k.portiques[vus[n]].voieJuste) dans[r.id][0]++;
                    vus[n]++;
                }
            });
        }
    }
    for (const [id, [bon, tout]] of Object.entries(dans)) {
        assert.ok(tout > 300, `${id} : ${tout} portiques seulement`);
        assert.ok(bon / tout > 0.22 && bon / tout < 0.45,
            `${id} passe sous la bonne arche ${(100 * bon / tout).toFixed(0)} % du temps : sa voie renseigne`);
    }
});

test('LES RIVAUX CALCULENT, ET LEUR JUSTESSE SE VOIT À L\'ARRIVÉE', () => {
    // Léo se trompe une fois sur dix, Sacha deux fois sur cinq : sur beaucoup de
    // courses, Léo doit finir devant Sacha — sinon leur justesse ne règle rien.
    const rang = { leo: 0, mia: 0, sacha: 0 };
    const N = 60;
    for (let i = 0; i < N; i++) {
        const b = jouer(`j${i}`, 'normale', 'inerte', { voies: 3 });
        b.classement.forEach((p, n) => { if (!p.joueur) rang[p.id] += n + 1; });
    }
    assert.ok(rang.leo < rang.mia && rang.mia < rang.sacha,
        `places moyennes : Léo ${(rang.leo / N).toFixed(2)}, Mia ${(rang.mia / N).toFixed(2)}, Sacha ${(rang.sacha / N).toFixed(2)}`);
    assert.deepEqual(PILOTES.slice(1).map((p) => p.justesse), [0.9, 0.75, 0.6]);
    // Personne sur la voie du milieu au départ : la caméra roule derrière nous.
    const k = new Course({ graine: 'grille', voies: 3 });
    for (const r of k.rivaux) assert.ok(Math.abs(r.x) > 0.4, `${r.nom} est caché derrière notre kart sur la grille`);
});

test('LE FREIN DONNE DU TEMPS, ET IL SE PAIE', () => {
    const duree = (frein) => {
        const k = new Course({ graine: 'frein', voies: 3 });
        k.demarrer();
        rouler(k, (x) => x.portiques[0].passe);
        k.freiner(frein);
        let t = 0;
        for (; !k.portiques[1].passe && t < 60; t += DT) { k.viser(k.portiques[0].voieJuste); k.avancer(DT); }
        return t;
    };
    const libre = duree(false), tenu = duree(true);
    assert.ok(tenu > libre * 1.2, `freiner donne ${tenu.toFixed(1)} s au lieu de ${libre.toFixed(1)} : trop peu pour finir un calcul`);
});

/* ─────────────────────────────────────────────────────────────────────────
 * LES BONUS
 * ───────────────────────────────────────────────────────────────────────── */

test('DIX BONUS, ET UN BONUS TIRÉ SERT LÀ OÙ L\'ON EST', () => {
    assert.deepEqual(Object.keys(BONUS), ['turbo', 'carapace', 'etoile', 'bouclier', 'eclair', 'banane',
        'indice', 'sablier', 'echange', 'glacon']);
    for (const b of Object.values(BONUS)) assert.ok(b.nom && b.dit && BONUS[b.id] === b);
    // Le fichier reçu tirait sur les six : une carapace en tête partait dans le
    // vide, une banane en queue ne gênait personne. Un bonus qui ne fait rien
    // est pire qu'aucun : on appuie, rien ne se passe, on croit le jeu cassé.
    const tirages = (placer, reglages = { voies: 3 }) => {
        const vus = new Set();
        for (let i = 0; i < 160; i++) {
            const k = new Course({ graine: `b${i}`, ...reglages });
            placer(k);
            k.tirerBonus();
            vus.add(k.bonus);
        }
        return vus;
    };
    const enTete = tirages((k) => { k.joueur.z = 90000; });
    for (const id of ['carapace', 'eclair', 'glacon', 'echange']) assert.ok(!enTete.has(id), `en tête, on tire « ${id} »`);
    assert.ok(enTete.has('banane') && enTete.has('turbo'));
    const enQueue = tirages((k) => { k.joueur.z = 100; });
    assert.ok(!enQueue.has('banane'), `en queue : ${[...enQueue]}`);
    for (const id of ['carapace', 'eclair', 'glacon', 'echange']) assert.ok(enQueue.has(id), `en queue, jamais « ${id} »`);
    assert.ok(!tirages((k) => { k.bouclier = true; }).has('bouclier'), 'un second bouclier ne sert à rien');
    // Sur une course à deux voies, l'indice ne barrerait rien.
    assert.ok(!tirages(() => {}, { voies: 2 }).has('indice'), 'un indice sur deux voies ne sert à rien');
    assert.ok(tirages(() => {}, { voies: 4 }).has('indice'));
});

test('AUCUN BONUS NE DONNE LA RÉPONSE — l\'indice en laisse deux, le sablier donne du temps', () => {
    // L'INDICE barre les mauvais résultats jusqu'à n'en laisser que deux : il
    // reste à calculer pour choisir. Jamais le bon, jamais tous les mauvais.
    for (const voies of [3, 4]) for (let i = 0; i < 40; i++) {
        const k = new Course({ graine: `i${voies}${i}`, voies });
        k.demarrer();
        rouler(k, (x) => x.temps > 1);
        k.bonus = 'indice';
        assert.equal(k.utiliserBonus(), true);
        const p = k.portiqueActif;
        assert.equal(p.barre.length, voies - 2, `${voies} voies : ${p.barre.length} panneaux barrés`);
        assert.ok(!p.barre.includes(p.voieJuste), 'l\'indice a barré le bon résultat');
        assert.equal(new Set(p.barre).size, p.barre.length);
        assert.equal(p.voies - p.barre.length, 2, 'il doit rester deux résultats, dont un faux');
    }
    // Sur une course progressive, l'indice lancé à deux voies attend le premier portique à trois.
    const prog = new Course({ graine: 'attend', voies: 'progressif' });
    prog.demarrer();
    rouler(prog, (x) => x.temps > 1);
    prog.bonus = 'indice';
    prog.utiliserBonus();
    assert.deepEqual(prog.portiques.map((p) => p.barre.length), [0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);

    // LE SABLIER ralentit tout le monde autant : personne ne gagne de place,
    // on gagne du temps. Et il ne touche à aucun portique.
    const a = new Course({ graine: 'sable', voies: 3 }), b = new Course({ graine: 'sable', voies: 3 });
    for (const k of [a, b]) { k.demarrer(); rouler(k, (x) => x.temps > 2); }
    b.bonus = 'sablier';
    b.utiliserBonus();
    assert.equal(b.sablier, DUREES.SABLIER);
    const ecarts = (k) => k.rivaux.map((r) => r.z - k.joueur.z);
    const za = a.joueur.z, zb = b.joueur.z, avant = ecarts(b);
    for (let t = 0; t < 2; t += DT) { a.avancer(DT); b.avancer(DT); }
    assert.ok(Math.abs((b.joueur.z - zb) / (a.joueur.z - za) - LENTEUR_DU_SABLIER) < 0.06,
        `sous le sablier on roule à ${((b.joueur.z - zb) / (a.joueur.z - za)).toFixed(2)} de sa vitesse`);
    ecarts(b).forEach((e, i) => assert.ok(Math.abs(e - avant[i]) < 700, 'le sablier a fait gagner ou perdre une place'));
    assert.ok(b.portiques.every((p) => p.barre.length === 0));
    // Le chronomètre, lui, tourne au vrai.
    assert.ok(Math.abs(a.temps - b.temps) < 1e-6);
});

test('L\'ÉCHANGE NE FAIT JAMAIS SAUTER UN PORTIQUE, ET LE GLAÇON ARRÊTE UN RIVAL', () => {
    // Prendre la place d'un rival qui a déjà franchi notre portique, ce serait
    // sauter une question.
    for (let i = 0; i < 40; i++) {
        const k = new Course({ graine: `e${i}`, voies: 3 });
        k.demarrer();
        rouler(k, (x) => x.temps > 1 + (i % 9) * 0.6);
        const p = k.portiqueActif, actif = k.actif;
        if (!p) continue;
        const devant = k.rivaux.filter((r) => r.z > k.joueur.z).sort((a, b) => a.z - b.z)[0];
        const z = k.joueur.z;
        k.bonus = 'echange';
        const ev = (k.utiliserBonus(), k.evenements);
        assert.ok(k.joueur.z < p.z, `graine ${i} : l'échange a fait passer le kart par-dessus son portique`);
        assert.equal(k.actif, actif);
        if (devant && devant.z < p.z - 500) {
            assert.ok(k.joueur.z > z, 'l\'échange n\'a rien échangé');
            assert.ok(ev.some((e) => e.quoi === 'echange'));
            assert.equal(devant.z, z);
        } else {
            // Faute de rival à portée, il se change en turbo : il ne se perd pas.
            assert.equal(k.joueur.z, z);
            assert.ok(k.turbo >= DUREES.TURBO - 0.01);
        }
    }
    const g = new Course({ graine: 'gel', voies: 3 });
    g.demarrer();
    rouler(g, (x) => x.temps > 2);
    const cible = g.rivaux.filter((r) => r.z > g.joueur.z).sort((a, b) => a.z - b.z)[0];
    g.bonus = 'glacon';
    g.utiliserBonus();
    assert.equal(cible.gel, DUREES.GEL);
    rouler(g, (x) => cible.gel < 0.6, 5);
    assert.ok(cible.vitesse < g.allure.croisiere * 0.2, 'le rival gelé roule encore');
});

test('TROIS JUSTES D\'AFFILÉE DONNENT UN BONUS, ET CHAQUE BONUS FAIT QUELQUE CHOSE', () => {
    const k = new Course({ graine: 'serie', voies: 3 });
    k.demarrer();
    for (let i = 0; i < SERIE_BONUS; i++) {
        const p = k.portiques[i];
        rouler(k, () => { k.viser(p.voieJuste); return p.passe; });
    }
    assert.ok(k.roulette > 0 || k.bonus, 'trois justes d\'affilée n\'ont rien donné');
    rouler(k, (x) => x.bonus !== null, 5);
    assert.ok(BONUS[k.bonus]);

    const essai = (id, verifier) => {
        const c = new Course({ graine: `u${id}`, voies: 3 });
        c.demarrer();
        rouler(c, (x) => x.temps > 1.5);
        c.bonus = id;
        assert.equal(c.utiliserBonus(), true);
        assert.equal(c.bonus, null);
        verifier(c);
    };
    essai('turbo', (c) => assert.ok(c.turbo >= DUREES.TURBO - 0.01));
    essai('etoile', (c) => assert.ok(c.etoile >= DUREES.ETOILE - 0.01));
    essai('bouclier', (c) => assert.equal(c.bouclier, true));
    essai('eclair', (c) => assert.ok(c.rivaux.every((r) => r.ralenti > 0)));
    essai('banane', (c) => assert.equal(c.bananes.length, 1));
    essai('carapace', (c) => {
        assert.equal(c.carapaces.length, 1);
        const cible = c.carapaces[0].cible;
        assert.ok(cible && cible.z > c.joueur.z, 'la carapace ne vise personne');
        rouler(c, (x) => x.carapaces.length === 0, 8);
        assert.ok(cible.tete > 0, 'la carapace a manqué sa cible');
    });
});

test('LE CLASSEMENT : À L\'HEURE POUR QUI A FRANCHI LA LIGNE', () => {
    // Classer tout le monde à la distance ferait repasser devant le vainqueur,
    // arrêté après la ligne, celui qui arrive lancé derrière lui.
    const k = new Course({ graine: 'podium', portiques: 5, voies: 3 });
    k.demarrer();
    rouler(k, (x) => { const p = x.portiqueActif; if (p) x.viser(p.voieJuste); return x.etat === 'arrivee'; });
    const rang = k.rangFinal;
    assert.equal(rang, k.rang());
    rouler(k, (x) => x.rivaux.every((r) => r.arrive !== null), 60);
    assert.equal(k.rang(), rang, 'la place a changé après la ligne');
    const c = k.classement();
    assert.equal(c.length, 4);
    for (let i = 1; i < 4; i++) assert.ok(c[i - 1].arrive <= c[i].arrive);
    // Et personne ne sort de la piste en attendant le bilan.
    rouler(k, (x) => x.horloge > 200, 60);
    for (const q of [k.joueur, ...k.rivaux]) {
        assert.ok(q.z < k.longueur - PISTE.PORTEE * PISTE.LONGUEUR_SEGMENT * 0.5, 'un kart a roulé jusqu\'au bord du monde');
        assert.ok(q.vitesse < 60, 'un kart roule encore une minute après l\'arrivée');
    }
});

test('LE BILAN DIT LES CALCULS, ET CHAQUE ERREUR UNE SEULE FOIS', () => {
    const b = jouer('bilan', 'rapide', 'trois-quarts', { familles: TOUTES, sens: 'mixte', voies: 'progressif' });
    assert.equal(b.reussis.length, b.justes);
    assert.ok(Math.abs(b.precision - b.justes / b.total) < 1e-9);
    assert.equal(new Set(b.aRevoir.map((f) => f.cle)).size, b.aRevoir.length);
    for (const f of [...b.reussis, ...b.aRevoir]) {
        assert.equal(f.texte, f.egalite);
        assert.ok(Math.abs(calculer(f.calcul) - valeurDe(f.resultat)) < 1e-9, 'un calcul du bilan n\'affiche pas le bon résultat');
    }
    // Ce que le bilan rend peut être repassé tel quel : c'est « Réviser mes erreurs ».
    if (b.aRevoir.length) {
        const revision = new Course({ faits: b.aRevoir, graine: 'rev' });
        assert.equal(revision.portiques[0].fait.calcul, b.aRevoir[0].calcul);
    }
    assert.equal(tempsEcrit(67.9), '01:07');
    assert.deepEqual([1, 2, 3, 4].map(rangEcrit), ['1er', '2e', '3e', '4e']);
});

/* ─────────────────────────────────────────────────────────────────────────
 * LES HUIT CIRCUITS
 * ───────────────────────────────────────────────────────────────────────── */

test('HUIT CIRCUITS, ET CHACUN A TOUT CE QU\'IL ANNONCE', () => {
    // Rémy : « plusieurs circuits et plusieurs ambiances ». Un circuit qui
    // nommerait un objet qu'on ne sait pas peindre lèverait une erreur à la
    // première image — sur un seul des huit, donc sans qu'on le voie.
    assert.deepEqual(Object.keys(CIRCUITS), ['prairie', 'plage', 'canyon', 'neige', 'automne', 'volcan', 'neon', 'espace']);
    const fonds = new Set(), objets = new Set();
    for (const [nom, c] of Object.entries(CIRCUITS)) {
        assert.ok(c.nom && c.court && c.court.length <= 8, `${nom} : nom court trop long pour sa pastille`);
        assert.ok(FONDS_CONNUS.includes(c.fond), `${nom} : lointain « ${c.fond} » inconnu`);
        assert.ok(c.meteo === null || METEOS_CONNUES.includes(c.meteo), `${nom} : météo « ${c.meteo} » inconnue`);
        assert.equal(c.objets.length, 4);
        assert.equal(c.reperes.length, 2);
        for (const o of [...c.objets, ...c.reperes]) {
            assert.ok(OBJETS_CONNUS.includes(o), `${nom} : on ne sait pas peindre « ${o} »`);
            assert.ok(!objets.has(o), `« ${o} » sert à deux circuits : ce ne sont plus deux lieux`);
            objets.add(o);
        }
        fonds.add(c.fond);
    }
    // HUIT LIEUX, ET NON HUIT PALETTES : chacun a son lointain à lui.
    assert.equal(fonds.size, 8);
    assert.equal(objets.size, 48);
    assert.equal(OBJETS_CONNUS.length, 48, 'un objet peint ne sert à aucun circuit');
});

test('SUR CHAQUE CIRCUIT, LA PISTE SE DÉTACHE ET LE LOINTAIN SE FOND DANS LE CIEL', () => {
    for (const [nom, c] of Object.entries(CIRCUITS)) {
        // Les deux tons de la piste contre les deux tons du bas-côté.
        for (const p of c.piste) for (const hb of c.herbe) {
            assert.ok(contrasteCouleurs(p, hb) >= 1.3, `${nom} : piste ${p} sur bas-côté ${hb}, ${contrasteCouleurs(p, hb).toFixed(2)}`);
        }
        // Les vibreurs alternent franchement : c'est eux qui disent la vitesse.
        assert.ok(contrasteCouleurs(c.vibreur[0], c.vibreur[1]) >= 1.5, `${nom} : vibreurs`);
        // La brume est le bas du ciel : c'est ce qui fait fondre le lointain.
        assert.ok(contrasteCouleurs(c.brume, c.ciel[2]) < 1.25, `${nom} : la brume n'est pas de la couleur du ciel`);
    }
    // Quatre arches, quatre couleurs — et ni vert ni rouge, qui sont les
    // couleurs de la correction.
    assert.equal(ARCHES.length, 4);
    assert.equal(new Set(ARCHES.map((a) => a.trait)).size, 4);
    for (const a of ARCHES) {
        assert.ok(contrasteCouleurs(a.trait, '#0f172a') >= 4.5, `arche ${a.trait} sur le panneau`);
        const [r, v, b] = [1, 3, 5].map((i) => parseInt(a.trait.slice(i, i + 2), 16));
        assert.ok(!(v > r + 40 && v > b + 40), `${a.trait} est vert : c'est la couleur de « juste »`);
        assert.ok(!(r > v + 90 && r > b + 90), `${a.trait} est rouge : c'est la couleur de « faux »`);
    }
    assert.equal(new Set(PILOTES.map((p) => p.coque)).size, 4, 'deux karts de la même couleur');
});

/* ─────────────────────────────────────────────────────────────────────────
 * PAS DE SON, TOUT DANS LA FENÊTRE
 * ───────────────────────────────────────────────────────────────────────── */

const FICHIERS = {
    jeu: sansCommentaires(lire('js/games/multiKart.js')),
    lointains: sansCommentaires(lire('js/games/multiKartFonds.js')),
    objets: sansCommentaires(lire('js/games/multiKartObjets.js')),
    'cœur': sansCommentaires(lire('js/core/multiKart.js')),
    calculs: sansCommentaires(lire('js/core/multiKartCalculs.js'))
};
const JEU = FICHIERS.jeu;

test('PAS DE SON — Rémy : « ne mets pas le son »', () => {
    for (const [nom, src] of Object.entries(FICHIERS)) {
        assert.ok(!/AudioContext|createOscillator|new Audio\b|<audio|\.play\(\)|SoundEngine|speechSynthesis/i.test(src),
            `du son dans ${nom}`);
    }
});

test('TOUT PASSE DANS LA FENÊTRE DU JEU — rien en position fixe, aucune taille lue sur le navigateur', () => {
    // Le fichier reçu était une PAGE : toile en plein écran, tableau de bord et
    // menus en position fixe. Monté dans le cadre d'un exercice, il aurait
    // recouvert l'en-tête du parcours.
    for (const nom of ['jeu', 'lointains', 'objets']) {
        const src = FICHIERS[nom];
        assert.ok(!/position:\s*fixed/.test(src), `${nom} : un élément en position fixe sort du cadre de l'exercice`);
        assert.ok(!/inner(Width|Height)|documentElement\.client|screen\.(width|height)/.test(src),
            `${nom} : une taille est lue sur la fenêtre du navigateur, pas sur le conteneur`);
        assert.ok(!/\d(vw|vh|vmin|vmax|dvh|svh)\b/.test(src), `${nom} : une taille est écrite en parts de la fenêtre`);
        assert.ok(!/requestFullscreen/.test(src));
    }
    assert.ok(/clientWidth/.test(JEU) && /clientHeight/.test(JEU));
    assert.ok(/setProperty\('--u'/.test(JEU), 'l\'unité du tableau de bord ne se règle plus sur le conteneur');
});

test('NI HASARD, NI FENÊTRE NATIVE, NI RESSOURCE DISTANTE, NI MARQUE', () => {
    for (const [nom, src] of Object.entries(FICHIERS)) {
        assert.ok(!/Math\.random/.test(src), `Math.random dans ${nom}`);
        assert.ok(!/\b(alert|confirm|prompt)\s*\(/.test(src), `fenêtre native dans ${nom}`);
        assert.ok(!/https?:\/\//.test(src), `ressource distante dans ${nom}`);
        assert.ok(!/new Image|drawImage|\.woff|@font-face|url\(/.test(src), `une image ou une police chargée dans ${nom}`);
        // Le fichier reçu parlait de « 6 bonus Mario Kart ». Ce n'est pas notre
        // nom, et les allures ne sont pas des cylindrées.
        assert.ok(!/mario|nintendo|\b(50|100|150)\s*cc\b/i.test(src), `une marque dans ${nom}`);
    }
    for (const nom of ['cœur', 'calculs']) {
        assert.ok(!/\bdocument\b|\bwindow\b|requestAnimationFrame/.test(FICHIERS[nom]),
            `${nom} touche à l'écran : on ne pourrait plus courir cent courses dans une épreuve`);
    }
    // Les décors ne lisent que ce qu'on leur donne : ni page, ni fenêtre.
    for (const nom of ['lointains', 'objets']) assert.ok(!/\bdocument\b|\bwindow\b/.test(FICHIERS[nom]), nom);
});

test('UN PORTIQUE EST UNE QUESTION TRANCHÉE, ET LE DERNIER ATTEND « CONTINUER »', () => {
    // Le parcours ferme l'étape une seconde et demie après la dernière
    // question : sans la retenue, il couvrirait la ligne d'arrivée et le podium.
    // Et sans le numéro d'essai, une erreur ne compterait pas : dix portiques
    // avec deux fautes s'arrêteraient à « 8 sur 10 » sans jamais clore l'étape.
    const debut = JEU.indexOf('rapporter(p) {'), fin = JEU.indexOf('continuer() {');
    assert.ok(debut > 0 && fin > debut);
    const rapporter = JEU.slice(debut, fin);
    assert.ok(/const concept = p\.fait\.competence;/.test(rapporter), 'la compétence n\'est plus celle de la famille du calcul');
    assert.ok(/onCorrectAnswer\(null, concept,/.test(rapporter));
    assert.ok(/onWrongAnswer\(/.test(rapporter) && /attemptIndex:\s*9/.test(rapporter) && /silencieux:\s*true/.test(rapporter));
    assert.ok(/partiel = !this\.comptee/.test(rapporter), 'les courses rejouées s\'ajouteraient aux questions de l\'étape');
    assert.ok(/dernier && this\.comptee\) this\.retenue = envoi/.test(rapporter));
    assert.ok(/this\.tempsReel = true/.test(JEU));
    assert.ok(/this\.params\.nbQuestions/.test(JEU), 'la course n\'a plus le nombre de portiques de l\'étape');
    // Chaque bonus a son icône : un bouton vide laisserait croire qu'on n'a rien.
    for (const id of Object.keys(BONUS)) assert.ok(new RegExp(`\\b${id}:|ICONES\\.${id} =`).test(JEU), `pas d'icône pour « ${id} »`);
});

test('MULTIKART EST INSCRIT, NOTABLE, ET SES RÉGLAGES SONT CEUX DU CŒUR', () => {
    const a = getActivity('multikart');
    assert.ok(a, 'activité absente du registre');
    assert.equal(a.unite, 'portique');
    assert.equal(a.parDefaut, 10);
    const ex = exercices.find((e) => e.id === 'calc-multikart');
    assert.ok(ex, 'exercice absent du catalogue');
    assert.equal(ex.activityId, 'multikart');
    assert.equal(CODES_EXERCICES['calc-multikart'], 'KT');
    assert.equal(estNotable(ex), true, 'une course où chaque portique compte doit donner une note');
    // UN RÉGLAGE QUI NE CORRESPOND À RIEN SE CHOISIT SANS RIEN CHANGER : chaque
    // option du menu doit exister dans le cœur, et chaque famille du cœur être
    // au menu.
    const schema = Object.fromEntries(ex.paramSchema.map((s) => [s.id, s]));
    const valeurs = (id) => schema[id].options.map((o) => (typeof o === 'object' ? o.value : o));
    assert.deepEqual(valeurs('operations'), TOUTES);
    schema.operations.options.forEach((o) => assert.equal(o.label, FAMILLES[o.value].exemple, 'la puce ne montre pas l\'exemple de la famille'));
    assert.deepEqual(valeurs('sens'), SENS);
    assert.deepEqual(valeurs('voies'), ['progressif', '2', '3', '4']);
    assert.deepEqual(valeurs('allure'), Object.keys(ALLURES));
    assert.deepEqual(valeurs('circuit'), [...Object.keys(CIRCUITS), 'surprise']);
    for (const s of ex.paramSchema) {
        const d = ex.params[s.id];
        (Array.isArray(d) ? d : [d]).forEach((v) => assert.ok(valeurs(s.id).includes(v), `${s.id} : défaut « ${v} » hors du menu`));
    }
    // Les compétences annoncées sont celles que les familles rapportent.
    const annoncees = new Set(ex.skills);
    for (const f of Object.values(FAMILLES)) if (f.competence) assert.ok(annoncees.has(f.competence), f.competence);
    assert.ok(annoncees.has('num.mult.table.*'));
    for (const mot of [/touche/i, /flèches/i, /frein/i, /bonus/i, /espace/i, /portique/i, /propre calcul/i,
        /inutile de les suivre/i, /sablier/i, /indice/i, /trouver le calcul/i, /aucun ne donne la réponse/i]) {
        assert.ok(mot.test(ex.instruction), `la consigne ne dit rien de ${mot}`);
    }
});
