// MULTIKART — ce que la course doit tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 23 novembre, en collant un jeu complet écrit ailleurs : « voilà un jeu
// canon, tu me l'améliores, le rends encore plus beau, plus cohérent, ne mets
// pas le son ». Puis : « il faut que tout passe dans la fenêtre et que ce soit
// compatible téléphone portable ».
//
// « PLUS BEAU » NE SE GARDE PAS PAR UNE ÉPREUVE : cela se regarde, et les
// photos sont dans `tools/tmp/` après `node tools/sondeMultiKart.mjs`. Ce
// fichier garde les trois autres mots, qui se mesurent :
//
//   · COHÉRENT — on est jugé là où est le kart ; qui calcule juste gagne ; qui
//     suit le kart de devant sans calculer n'apprend rien et ne gagne rien ; un
//     bonus tiré sert là où l'on est ; la note vient des portiques ;
//   · PAS DE SON ;
//   · TOUT DANS LA FENÊTRE — rien en position fixe, aucune taille lue sur la
//     fenêtre du navigateur.
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
import { makeRng } from '../js/core/ids.js';
import { contrasteCouleurs } from '../js/core/petitesAiles.js';
import {
    Course, PISTE, ALLURES, CIRCUITS, ARCHES, BONUS, PILOTES, DUREES, SERIE_BONUS,
    fabriquerPortiques, leurresMalins, voieDe, tempsEcrit, rangEcrit
} from '../js/core/multiKart.js';
import { jouer } from '../tools/equilibreDuKart.mjs';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const DT = 1 / 60;

/** Rouler jusqu'à ce que `quand` soit vrai ; rend les événements du dernier pas. */
function rouler(k, quand, max = 400) {
    let ev = [];
    for (let t = 0; t < max && !quand(k); t += DT) ev = k.avancer(DT);
    return ev;
}

/* ─────────────────────────────────────────────────────────────────────────
 * LES PORTIQUES
 * ───────────────────────────────────────────────────────────────────────── */

test('UNE COURSE SE REFAIT À L\'IDENTIQUE À PARTIR DE SA GRAINE', () => {
    // Le fichier reçu appelait `Math.random()` trente fois. Une course qu'on ne
    // peut pas refaire ne se mesure pas — et le professeur qui ouvre l'écran
    // de son élève doit y voir les mêmes calculs.
    const a = new Course({ graine: 'x' }), b = new Course({ graine: 'x' }), c = new Course({ graine: 'y' });
    assert.deepEqual(a.portiques.map((p) => [p.texte, p.choix]), b.portiques.map((p) => [p.texte, p.choix]));
    assert.notDeepEqual(a.portiques.map((p) => p.texte), c.portiques.map((p) => p.texte));
    for (const k of [a, b]) { k.demarrer(); rouler(k, (x) => x.etat === 'arrivee'); }
    assert.deepEqual(a.bilan(), b.bilan(), 'deux courses de même graine ne finissent pas pareil');
});

test('CHAQUE PORTIQUE : TROIS RÉSULTATS DIFFÉRENTS, UN SEUL JUSTE, À SA VOIE', () => {
    for (let g = 0; g < 40; g++) {
        const liste = fabriquerPortiques([2, 3, 4, 5, 6, 7, 8, 9, 10], 20, makeRng(`p${g}`));
        for (const p of liste) {
            assert.equal(p.choix.length, 3);
            assert.equal(new Set(p.choix).size, 3, `${p.texte} : deux résultats identiques (${p.choix})`);
            assert.ok(p.choix.every((v) => Number.isInteger(v) && v > 0), `${p.texte} : ${p.choix}`);
            assert.equal(p.juste, p.a * p.b);
            assert.equal(p.choix[p.voieJuste], p.juste);
            assert.equal(p.choix.filter((v) => v === p.juste).length, 1);
            assert.equal(p.texte, `${p.a} × ${p.b}`);
        }
    }
});

test('LES TABLES DEMANDÉES SONT LES TABLES POSÉES', () => {
    // Le réglage du professeur : « tables 7 et 8 » ne doit jamais poser 3 × 4.
    const liste = fabriquerPortiques([7, 8], 200, makeRng('tables'));
    for (const p of liste) {
        assert.ok([7, 8].includes(p.table), `table ${p.table} hors réglage`);
        assert.ok(p.a === p.table || p.b === p.table, `${p.texte} n'est pas dans la table de ${p.table}`);
    }
    // Les deux sens sont posés : savoir 7 × 8 n'est pas encore savoir 8 × 7.
    assert.ok(liste.some((p) => p.a === p.table) && liste.some((p) => p.b === p.table && p.a !== p.table));
});

test('ON NE POSE PAS DEUX FOIS DE SUITE LE MÊME CALCUL', () => {
    for (let g = 0; g < 30; g++) {
        const liste = fabriquerPortiques([2, 3], 20, makeRng(`suite${g}`));
        for (let i = 1; i < liste.length; i++) {
            assert.notEqual(liste[i].texte, liste[i - 1].texte, `graine ${g}, portique ${i}`);
        }
    }
});

test('LES LEURRES VIENNENT D\'UNE VRAIE ERREUR, PAS DU HASARD', () => {
    // C'est la meilleure idée du fichier reçu : un leurre tiré au hasard
    // s'élimine sans calculer. Chaque leurre doit être le voisin dans la table,
    // l'addition, les chiffres retournés, ou un résultat proche.
    for (let a = 1; a <= 10; a++) {
        for (let b = 2; b <= 10; b++) {
            const juste = a * b;
            const d = Math.floor(juste / 10), u = juste % 10;
            const familles = new Set([a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b, a + b,
                u * 10 + d, juste - 10, juste + 10, juste - 2, juste + 2]);
            for (let g = 0; g < 6; g++) {
                const [x, y] = leurresMalins(a, b, makeRng(`l${a}${b}${g}`));
                for (const v of [x, y]) {
                    assert.ok(familles.has(v), `${a} × ${b} : le leurre ${v} ne vient d'aucune erreur connue`);
                    assert.ok(v > 0 && v !== juste);
                }
                assert.notEqual(x, y);
            }
        }
    }
});

test('LE BON RÉSULTAT N\'A PAS DE VOIE PRÉFÉRÉE', () => {
    // Sinon « toujours au milieu » devient une stratégie.
    const compte = [0, 0, 0];
    for (let g = 0; g < 60; g++) {
        for (const p of fabriquerPortiques([2, 3, 4, 5, 6, 7, 8, 9], 20, makeRng(`v${g}`))) compte[p.voieJuste]++;
    }
    for (const n of compte) assert.ok(n > 1200 * 0.27 && n < 1200 * 0.40, `voies : ${compte}`);
});

test('RÉVISER SES ERREURS : CHAQUE CALCUL RATÉ REPASSE, PUIS DANS L\'AUTRE SENS', () => {
    const faits = [{ a: 7, b: 8, table: 7 }, { a: 6, b: 9, table: 9 }, { a: 4, b: 3, table: 4 }];
    const k = new Course({ faits, graine: 'r' });
    assert.equal(k.total, 6);
    assert.deepEqual(k.portiques.map((p) => p.texte),
        ['7 × 8', '6 × 9', '4 × 3', '8 × 7', '9 × 6', '3 × 4']);
    assert.ok(k.revision);
    // Une seule erreur : cinq portiques quand même, sinon on n'a pas le temps
    // d'entrer dans la course. Douze erreurs : quinze au plus.
    assert.equal(new Course({ faits: faits.slice(0, 1) }).total, 5);
    assert.equal(new Course({ faits: Array.from({ length: 12 }, (_, i) => ({ a: 2 + i % 8, b: 3, table: 3 })) }).total, 15);
});

/* ─────────────────────────────────────────────────────────────────────────
 * LA PISTE
 * ───────────────────────────────────────────────────────────────────────── */

test('LA PISTE NE SE CASSE PAS, ET VA PLUS LOIN QUE LA LIGNE', () => {
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
    // La caméra roule 1 200 unités derrière le kart : il lui faut de la piste
    // sous les roues dès la grille.
    assert.ok(PISTE.DEPART * PISTE.LONGUEUR_SEGMENT >= 1300);
    // Le prochain portique est toujours en vue : on a tout le trajet pour calculer.
    assert.ok(PISTE.PORTEE > PISTE.SEGMENTS_PAR_PORTIQUE);
});

test('L\'ALLURE DONNE LE TEMPS ANNONCÉ ENTRE DEUX PORTIQUES', () => {
    // Le réglage du professeur dit « 6 secondes par calcul » : c'est une
    // promesse, à tenir à la croisière.
    for (const [nom, a] of Object.entries(ALLURES)) {
        const s = (PISTE.SEGMENTS_PAR_PORTIQUE * PISTE.LONGUEUR_SEGMENT) / a.croisiere;
        assert.ok(Math.abs(s - a.secondes) < 0.15, `${nom} : ${s.toFixed(2)} s, annoncé ${a.secondes}`);
        assert.ok(a.toux < a.croisiere && a.croisiere < a.etoile && a.etoile <= a.turbo, nom);
    }
});

/* ─────────────────────────────────────────────────────────────────────────
 * COHÉRENT
 * ───────────────────────────────────────────────────────────────────────── */

test('ON EST JUGÉ LÀ OÙ EST LE KART, PAS LÀ OÙ L\'ON VISE', () => {
    // Le fichier reçu jugeait la voie VISÉE : un appui au dernier centième
    // comptait, alors que le kart était encore, à l'écran, sous une autre arche.
    const k = new Course({ graine: 'juge' });
    k.demarrer();
    const p = k.portiques[0];
    // La voie d'à côté : parti de deux voies plus loin, le kart traverserait
    // celle du milieu, et c'est elle qui serait jugée — à juste titre.
    const voisine = (v) => (v === 1 ? 0 : 1);
    const autre = voisine(p.voieJuste);
    k.viser(autre);
    rouler(k, (x) => p.z - x.joueur.z < x.joueur.vitesse * DT * 1.5);
    assert.equal(voieDe(k.joueur.x), autre, 'le kart devrait être installé dans l\'autre voie');
    k.viser(p.voieJuste);               // l'appui du dernier centième
    rouler(k, () => p.passe);
    assert.equal(p.reussi, false, 'un appui au dernier instant a compté');
    assert.equal(p.donne, p.choix[autre], 'la réponse retenue n\'est pas celle de la voie où était le kart');

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
    const k = new Course({ graine: 'elan' });
    k.demarrer();
    const [p, q] = k.portiques;
    k.viser(p.voieJuste);
    let ev = rouler(k, () => p.passe);
    assert.ok(ev.some((e) => e.quoi === 'portique' && e.juste && e.portique === p));
    assert.ok(k.turbo > 0 && k.toux === 0);
    k.viser((q.voieJuste + 1) % 3);
    ev = rouler(k, () => q.passe);
    const faute = ev.find((e) => e.quoi === 'portique');
    assert.ok(faute && !faute.juste && faute.portique.juste === q.a * q.b, 'l\'événement ne porte pas le bon résultat');
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
    // Mesuré sur soixante courses (`node tools/equilibreDuKart.mjs`) : tout
    // juste, premier 60 fois sur 60 ; inerte, une réussite sur trois et la
    // troisième ou la quatrième place.
    for (const allure of Object.keys(ALLURES)) {
        let premier = 0, rangInerte = 0, reussiteInerte = 0;
        const N = 24;
        for (let i = 0; i < N; i++) {
            const b = jouer(`g${i}`, allure, 'juste');
            assert.equal(b.justes, b.total);
            if (b.rang === 1) premier++;
            const c = jouer(`g${i}`, allure, 'inerte');
            rangInerte += c.rang; reussiteInerte += c.precision;
        }
        assert.ok(premier >= N - 1, `${allure} : tout juste, et premier seulement ${premier} fois sur ${N}`);
        assert.ok(rangInerte / N > 2.9, `${allure} : ne rien faire finit ${(rangInerte / N).toFixed(2)}e en moyenne`);
        assert.ok(reussiteInerte / N < 0.45, `${allure} : ne rien faire réussit ${(100 * reussiteInerte / N).toFixed(0)} %`);
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
    for (let i = 0; i < N; i++) reussite += jouer(`s${i}`, 'tranquille', 'suiveur').precision;
    assert.ok(reussite / N < 0.45,
        `suivre le rival de devant réussit ${(100 * reussite / N).toFixed(0)} % des portiques : c'est une antisèche`);

    // Et à la source : la voie qu'un rival occupe en passant sous un portique
    // n'est celle du bon résultat qu'une fois sur trois, quelle que soit sa justesse.
    const dans = { leo: [0, 0], mia: [0, 0], sacha: [0, 0] };
    for (let i = 0; i < 60; i++) {
        const k = new Course({ graine: `r${i}` });
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
        const b = jouer(`j${i}`, 'normale', 'inerte');
        b.classement.forEach((p, n) => { if (!p.joueur) rang[p.id] += n + 1; });
    }
    assert.ok(rang.leo < rang.mia && rang.mia < rang.sacha,
        `places moyennes : Léo ${(rang.leo / N).toFixed(2)}, Mia ${(rang.mia / N).toFixed(2)}, Sacha ${(rang.sacha / N).toFixed(2)}`);
    assert.deepEqual(PILOTES.slice(1).map((p) => p.justesse), [0.9, 0.75, 0.6]);
});

test('LE FREIN DONNE DU TEMPS, ET IL SE PAIE', () => {
    const duree = (frein) => {
        const k = new Course({ graine: 'frein' });
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

test('UN BONUS TIRÉ SERT LÀ OÙ L\'ON EST', () => {
    // Le fichier reçu tirait sur les six : une carapace en tête partait dans le
    // vide, une banane en queue ne gênait personne. Un bonus qui ne fait rien
    // est pire qu'aucun : on appuie, rien ne se passe, on croit le jeu cassé.
    const tirages = (placer) => {
        const vus = new Set();
        for (let i = 0; i < 80; i++) {
            const k = new Course({ graine: `b${i}` });
            placer(k);
            k.tirerBonus();
            vus.add(k.bonus);
        }
        return vus;
    };
    const enTete = tirages((k) => { k.joueur.z = 90000; });
    assert.ok(!enTete.has('carapace') && !enTete.has('eclair'), `en tête : ${[...enTete]}`);
    assert.ok(enTete.has('banane') && enTete.has('turbo'));
    const enQueue = tirages((k) => { k.joueur.z = 100; });
    assert.ok(!enQueue.has('banane'), `en queue : ${[...enQueue]}`);
    assert.ok(enQueue.has('carapace') && enQueue.has('eclair'));
    const protege = tirages((k) => { k.bouclier = true; });
    assert.ok(!protege.has('bouclier'), 'un second bouclier ne sert à rien');
    for (const s of [enTete, enQueue, protege]) for (const id of s) assert.ok(BONUS[id], id);
});

test('TROIS JUSTES D\'AFFILÉE DONNENT UN BONUS, ET CHAQUE BONUS FAIT QUELQUE CHOSE', () => {
    const k = new Course({ graine: 'serie' });
    k.demarrer();
    for (let i = 0; i < SERIE_BONUS; i++) {
        const p = k.portiques[i];
        rouler(k, () => { k.viser(p.voieJuste); return p.passe; });
    }
    assert.ok(k.roulette > 0 || k.bonus, 'trois justes d\'affilée n\'ont rien donné');
    rouler(k, (x) => x.bonus !== null, 5);
    assert.ok(BONUS[k.bonus]);

    const essai = (id, verifier) => {
        const c = new Course({ graine: `u${id}` });
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
    const k = new Course({ graine: 'podium', portiques: 5 });
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
    const b = jouer('bilan', 'rapide', 'trois-quarts');
    assert.equal(b.justes + b.total - b.justes, b.total);
    assert.equal(b.reussis.length, b.justes);
    assert.ok(Math.abs(b.precision - b.justes / b.total) < 1e-9);
    assert.equal(new Set(b.aRevoir.map((f) => `${f.a}x${f.b}`)).size, b.aRevoir.length);
    for (const f of [...b.reussis, ...b.aRevoir]) {
        assert.equal(f.texte, `${f.a} × ${f.b} = ${f.a * f.b}`, 'un calcul du bilan n\'affiche pas le bon résultat');
    }
    assert.equal(tempsEcrit(67.9), '01:07');
    assert.deepEqual([1, 2, 3, 4].map(rangEcrit), ['1er', '2e', '3e', '4e']);
});

/* ─────────────────────────────────────────────────────────────────────────
 * CE QU'ON VOIT
 * ───────────────────────────────────────────────────────────────────────── */

test('SUR CHAQUE CIRCUIT, LA PISTE SE DÉTACHE ET LE LOINTAIN SE FOND DANS LE CIEL', () => {
    assert.deepEqual(Object.keys(CIRCUITS), ['prairie', 'canyon', 'neon']);
    for (const [nom, c] of Object.entries(CIRCUITS)) {
        // Les deux tons de la piste contre les deux tons du bas-côté.
        for (const p of c.piste) for (const hb of c.herbe) {
            assert.ok(contrasteCouleurs(p, hb) >= 1.3, `${nom} : piste ${p} sur bas-côté ${hb}, ${contrasteCouleurs(p, hb).toFixed(2)}`);
        }
        // Les vibreurs alternent franchement : c'est eux qui disent la vitesse.
        assert.ok(contrasteCouleurs(c.vibreur[0], c.vibreur[1]) >= 1.5, `${nom} : vibreurs`);
        // La brume est le bas du ciel : c'est ce qui fait fondre le lointain.
        assert.ok(contrasteCouleurs(c.brume, c.ciel[2]) < 1.25, `${nom} : la brume n'est pas de la couleur du ciel`);
        // Le résultat est écrit en blanc sur un panneau sombre, cerclé de la
        // couleur de son arche : le cercle doit trancher sur le ciel.
        for (const a of ARCHES) {
            assert.ok(contrasteCouleurs(a.trait, '#0f172a') >= 4.5, `${nom} : arche ${a.trait} sur le panneau`);
        }
    }
    assert.equal(new Set(ARCHES.map((a) => a.trait)).size, 3);
    assert.equal(new Set(PILOTES.map((p) => p.coque)).size, 4, 'deux karts de la même couleur');
});

/* ─────────────────────────────────────────────────────────────────────────
 * PAS DE SON, TOUT DANS LA FENÊTRE
 * ───────────────────────────────────────────────────────────────────────── */

const JEU = sansCommentaires(lire('js/games/multiKart.js'));
const COEUR = sansCommentaires(lire('js/core/multiKart.js'));

test('PAS DE SON — Rémy : « ne mets pas le son »', () => {
    for (const [nom, src] of [['jeu', JEU], ['cœur', COEUR]]) {
        assert.ok(!/AudioContext|createOscillator|new Audio\b|<audio|\.play\(\)|SoundEngine|speechSynthesis/i.test(src),
            `du son dans le ${nom}`);
    }
});

test('TOUT PASSE DANS LA FENÊTRE DU JEU — rien en position fixe, aucune taille lue sur le navigateur', () => {
    // Le fichier reçu était une PAGE : toile en plein écran, tableau de bord et
    // menus en position fixe. Monté dans le cadre d'un exercice, il aurait
    // recouvert l'en-tête du parcours.
    assert.ok(!/position:\s*fixed/.test(JEU), 'un élément en position fixe sort du cadre de l\'exercice');
    assert.ok(!/inner(Width|Height)|documentElement\.client|screen\.(width|height)/.test(JEU),
        'une taille est lue sur la fenêtre du navigateur, pas sur le conteneur');
    assert.ok(!/\d(vw|vh|vmin|vmax|dvh|svh)\b/.test(JEU), 'une taille est écrite en parts de la fenêtre du navigateur');
    assert.ok(/clientWidth/.test(JEU) && /clientHeight/.test(JEU));
    assert.ok(/setProperty\('--u'/.test(JEU), 'l\'unité du tableau de bord ne se règle plus sur le conteneur');
    assert.ok(!/requestFullscreen/.test(JEU));
});

test('NI HASARD, NI FENÊTRE NATIVE, NI RESSOURCE DISTANTE, NI MARQUE', () => {
    for (const [nom, src] of [['jeu', JEU], ['cœur', COEUR]]) {
        assert.ok(!/Math\.random/.test(src), `Math.random dans le ${nom}`);
        assert.ok(!/\b(alert|confirm|prompt)\s*\(/.test(src), `fenêtre native dans le ${nom}`);
        assert.ok(!/https?:\/\//.test(src), `ressource distante dans le ${nom}`);
        // Le fichier reçu parlait de « 6 bonus Mario Kart ». Ce n'est pas notre
        // nom, et les allures ne sont pas des cylindrées.
        assert.ok(!/mario|nintendo|\b(50|100|150)\s*cc\b/i.test(src), `une marque dans le ${nom}`);
    }
    assert.ok(!/\bdocument\b|\bwindow\b|requestAnimationFrame/.test(COEUR),
        'le cœur touche à l\'écran : on ne pourrait plus courir cent courses dans une épreuve');
});

test('UN PORTIQUE EST UNE QUESTION TRANCHÉE, ET LE DERNIER ATTEND « CONTINUER »', () => {
    // Le parcours ferme l'étape une seconde et demie après la dernière
    // question : sans la retenue, il couvrirait la ligne d'arrivée et le podium.
    // Et sans le numéro d'essai, une erreur ne compterait pas : dix portiques
    // avec deux fautes s'arrêteraient à « 8 sur 10 » sans jamais clore l'étape.
    const debut = JEU.indexOf('rapporter(p) {'), fin = JEU.indexOf('continuer() {');
    assert.ok(debut > 0 && fin > debut);
    const rapporter = JEU.slice(debut, fin);
    assert.ok(/onCorrectAnswer\(null, `mult:\$\{p\.table\}`/.test(rapporter));
    assert.ok(/onWrongAnswer\(/.test(rapporter) && /attemptIndex:\s*9/.test(rapporter) && /silencieux:\s*true/.test(rapporter));
    assert.ok(/partiel = !this\.comptee/.test(rapporter), 'les courses rejouées s\'ajouteraient aux questions de l\'étape');
    assert.ok(/dernier && this\.comptee\) this\.retenue = envoi/.test(rapporter));
    assert.ok(/this\.tempsReel = true/.test(JEU));
    assert.ok(/this\.params\.nbQuestions/.test(JEU), 'la course n\'a plus le nombre de portiques de l\'étape');
});

test('MULTIKART EST INSCRIT, NOTABLE, ET SA CONSIGNE DIT COMMENT ON JOUE', () => {
    const a = getActivity('multikart');
    assert.ok(a, 'activité absente du registre');
    assert.equal(a.unite, 'portique');
    assert.equal(a.parDefaut, 10);
    const ex = exercices.find((e) => e.id === 'calc-multikart');
    assert.ok(ex, 'exercice absent du catalogue');
    assert.equal(ex.activityId, 'multikart');
    assert.deepEqual(ex.skills, ['num.mult.table.*']);
    assert.equal(CODES_EXERCICES['calc-multikart'], 'KT');
    assert.equal(estNotable(ex), true, 'une course où chaque portique compte doit donner une note');
    assert.ok(ALLURES[ex.params.allure] && CIRCUITS[ex.params.circuit]);
    const schema = Object.fromEntries(ex.paramSchema.map((s) => [s.id, s]));
    assert.deepEqual(schema.allure.options.map((o) => o.value), Object.keys(ALLURES));
    assert.deepEqual(schema.circuit.options.map((o) => o.value), Object.keys(CIRCUITS));
    for (const mot of [/touche/i, /flèches/i, /frein/i, /bonus/i, /espace/i, /portique/i, /propre calcul/i, /inutile de les suivre/i]) {
        assert.ok(mot.test(ex.instruction), `la consigne ne dit rien de ${mot}`);
    }
    assert.ok(!/\bson\b.*\bmusique\b|bruit/i.test(ex.instruction));
});
