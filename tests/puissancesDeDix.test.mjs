// LE CHAPITRE DES PUISSANCES DE 10 — ce que les trois ajouts du 12 novembre
// doivent garder.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en préparant son chapitre, trois demandes en une phrase :
//   1. « je ne crois pas qu'il y ait des calculs du genre 5 × 10² ou
//      6 × 10⁻⁵ etc. » — il avait raison, rien ne posait ce calcul ;
//   2. « j'aimerai bien des exercices de conversion avec milli, million
//      (on peut proposer un tableau) » ;
//   3. « J'aimerai bien un jeu où on relie 10² à 100, 10⁻³ à 0,001, etc ».
//
// Chacune de ces épreuves a été vue tomber (`tools/epreuveTombe.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../js/core/ids.js';
import {
    tirerDesPaires, FAMILLES_PAIRES, valeurDe, decimalDe, puissance
} from '../js/core/pairesPuissances.js';
import { puissancesProduitGenerator } from '../js/core/generators/puissancesProduit.js';
import { colonnesDuTableau, uniteDeLaColonne, FAMILLES } from '../js/core/conversion.js';
import { getExerciseById } from '../js/data/catalog.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';

// ── 1. LES CALCULS « 5 × 10² » ────────────────────────────────────────────

test('ON POSE BIEN « 5 × 10² », ET PAS SEULEMENT « 3,47 × 10⁴ »', () => {
    // C'EST LE REPROCHE DE RÉMY, MOT POUR MOT. L'exercice voisin — « écriture
    // scientifique » — tire TOUJOURS deux ou trois chiffres significatifs :
    // le calcul avec un entier seul devant n'existait nulle part.
    let unChiffre = 0, total = 0;
    for (let i = 0; i < 300; i++) {
        const it = puissancesProduitGenerator.generate({ marches: ['effectuerGrand'] },
            { rng: makeRng(`u${i}`), index: 0, total: 1 });
        if (it.meta.etape !== 'effectuerGrand') continue;
        total++;
        if (/^Calcule \d × 10/.test(it.prompt.text)) unChiffre++;
    }
    assert.ok(total > 0, 'la marche « effectuer » ne sort jamais');
    assert.ok(unChiffre / total > 0.5,
        `une mantisse d'un seul chiffre doit être le cas ORDINAIRE : ${unChiffre}/${total}`);
});

test('ET LE CALCUL EST JUSTE, DANS LES DEUX SENS', () => {
    // On ne vérifie pas le générateur sur un exemple : on vérifie la fonction
    // qui pose la virgule, sur les cas qui piègent.
    assert.equal(decimalDe(5, 2), '500');
    assert.equal(decimalDe(6, -5), '0,00006');
    assert.equal(decimalDe(7, 0), '7');
    assert.equal(valeurDe(3), '1000');
    assert.equal(valeurDe(-3), '0,001');
    assert.equal(valeurDe(0), '1');
    assert.equal(puissance(-3), '10⁻³');
});

test('CHAQUE QUESTION OFFRE QUATRE CHOIX, ET UNE SEULE BONNE RÉPONSE', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE A ÉTÉ MESURÉ : sur
    // (4 × 10⁴) ÷ (2 × 10²), deux distracteurs valaient la bonne réponse —
    // 4 ÷ 2 et 4 − 2 font tous les deux 2 — et le garde-fou les écartait tous
    // les deux. L'élève recevait un QCM à DEUX choix, dont le bon : une chance
    // sur deux sans rien savoir.
    for (let i = 0; i < 400; i++) {
        const it = puissancesProduitGenerator.generate({},
            { rng: makeRng(`c${i}`), index: i, total: 400 });
        assert.equal(it.choices.length, 4,
            `${it.prompt.text} : ${it.choices.length} choix`);
        assert.equal(it.choices.filter(c => c.correct).length, 1,
            `${it.prompt.text} : plusieurs bonnes réponses`);
    }
});

test('LA CONSIGNE NE SE RÉPÈTE PAS SUR CHAQUE LIGNE DE LA FICHE', () => {
    // MESURÉ SUR LA FICHE : « et donne le résultat sous la forme a × 10ⁿ »
    // occupait DEUX des trois lignes de chaque question, neuf fois de suite,
    // et le calcul à faire se perdait dedans. C'est ce que Rémy avait dit de
    // l'exercice voisin — « mets juste calcule ».
    let vus = 0;
    for (let i = 0; i < 200; i++) {
        const it = puissancesProduitGenerator.generate({ marches: ['produit', 'quotient'] },
            { rng: makeRng(`p${i}`), index: i, total: 200 });
        if (!['produit', 'quotient'].includes(it.meta.etape)) continue;
        vus++;
        assert.ok(!/donne le résultat/.test(it.prompt.papier),
            `la fiche répète la consigne : « ${it.prompt.papier} »`);
        assert.match(it.prompt.papier, /^\(\d × 10/, it.prompt.papier);
    }
    assert.ok(vus > 0, 'les marches « produit » et « quotient » ne sortent jamais');
});

// ── 2. LE TABLEAU DES PRÉFIXES ────────────────────────────────────────────

test('LES PRÉFIXES TIENNENT DANS LE TABLEAU DE CONVERSION', () => {
    // IL N'Y A RIEN À ÉCRIRE DE PLUS QU'UNE FAMILLE, et c'est la preuve que le
    // tableau était bien rangé : une famille y est une liste d'unités et un
    // ÉCHELON. Les aires coiffent deux colonnes, les volumes trois, les
    // préfixes trois aussi — ils vont de mille en mille.
    assert.ok(FAMILLES.prefixes, 'la famille des préfixes manque');
    assert.equal(FAMILLES.prefixes.echelon, 3,
        'un préfixe coiffe TROIS colonnes : on passe de mille en mille');
    const colonnes = colonnesDuTableau('prefixes');
    assert.equal(colonnes.length, 12,
        `douze colonnes, comme les volumes — pas ${colonnes.length}`);
    // CHAQUE COLONNE A SON PRÉFIXE, et chacun en coiffe exactement trois.
    const parUnite = {};
    for (const c of colonnes) {
        const u = uniteDeLaColonne('prefixes', c);
        assert.ok(u, `la colonne ${c} n'est coiffée par rien`);
        parUnite[u.symbole] = (parUnite[u.symbole] || 0) + 1;
    }
    assert.deepEqual(parUnite, { MW: 3, kW: 3, W: 3, mW: 3 });
});

test('ET L\'AVERTISSEMENT PARLE DE CE TABLEAU-LÀ', () => {
    // MESURÉ SUR LA PHOTO : le tableau des préfixes affichait « Attention :
    // hecto vient avant déca » — deux étiquettes qu'il ne porte pas. Un
    // avertissement qui désigne ce qui n'est pas là envoie chercher.
    const jeu = readFileSync('js/games/conversion.js', 'utf8');
    const bloc = jeu.slice(jeu.indexOf('dessinerEtape1()'), jeu.indexOf('this.melange.etiquettes'));
    assert.match(bloc, /this\.famille === 'prefixes'/,
        'le piège annoncé doit dépendre de la famille');
    assert.match(bloc, /MILLI.*MÉGA/s,
        'aux préfixes, le piège est le « m » minuscule contre le « M » majuscule');
});

// ── 3. LE JEU OÙ L'ON RELIE ───────────────────────────────────────────────

test('DEUX CARTES NE DÉSIGNENT JAMAIS LE MÊME NOMBRE', () => {
    // C'EST LE SEUL INVARIANT QUE LE TIRAGE DOIT GARANTIR. Si 10³ sortait à la
    // fois de « puissances » et de « kilo », l'élève aurait DEUX réponses
    // justes pour une carte, et l'on en compterait une fausse.
    for (const famille of Object.keys(FAMILLES_PAIRES)) {
        for (let i = 0; i < 150; i++) {
            const p = tirerDesPaires({ famille, combien: 8 }, makeRng(`${famille}-${i}`));
            assert.equal(new Set(p.map(x => x.gauche)).size, p.length,
                `${famille} : deux cartes identiques à gauche`);
            assert.equal(new Set(p.map(x => x.droite)).size, p.length,
                `${famille} : deux cartes identiques à droite`);
        }
    }
});

test('ET UNE ÉCRITURE N\'EST JAMAIS DES DEUX CÔTÉS À LA FOIS', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE A ÉTÉ MESURÉ, et il n'est pas celui
    // qu'on croit : ce n'est pas un doublon dans une colonne, c'est la MÊME
    // écriture à gauche ET à droite. « 10³ » sort de la famille des
    // puissances, et « kilo » le met en face de lui dans la famille des
    // préfixes. L'élève relie alors 10³ à 10³ — ce qui est VRAI — et on le
    // compte faux.
    //
    // SOIXANTE-DIX-SEPT PARTIES SUR QUINZE MILLE, soit une par classe et par
    // séance. Une erreur comptée sur une réponse juste est ce qu'un exercice
    // peut faire de pire : l'élève ne peut rien apprendre de ce qu'on lui
    // reproche, puisqu'il avait raison.
    for (const famille of Object.keys(FAMILLES_PAIRES)) {
        for (let i = 0; i < 400; i++) {
            const p = tirerDesPaires({ famille, combien: 8 }, makeRng(`x-${famille}-${i}`));
            const gauches = new Set(p.map(x => x.gauche));
            const commun = p.map(x => x.droite).filter(d => gauches.has(d));
            assert.deepEqual(commun, [],
                `${famille} : « ${commun[0]} » est des deux côtés`);
        }
    }
});

test('ET LE RÉGLAGE « 8 PAIRES » EN REND HUIT, DANS TOUTES LES FAMILLES', () => {
    // MESURÉ : « préfixes » et « mots » n'avaient que SEPT paires possibles,
    // donc le réglage du catalogue en rendait sept sans rien dire. Un réglage
    // qui ne tient pas ce qu'il promet est un réglage qui ment — et c'est
    // pour cela que téra et pico ont été ajoutés, qui sont de toute façon sur
    // la fiche de Rémy, « de pico à trillion ».
    for (const famille of Object.keys(FAMILLES_PAIRES)) {
        for (let i = 0; i < 200; i++) {
            const p = tirerDesPaires({ famille, combien: 8 }, makeRng(`h-${famille}-${i}`));
            assert.equal(p.length, 8, `${famille} : ${p.length} paires au lieu de 8`);
        }
    }
});

test('ON DEMANDE 10² ET 100, PAS AUTRE CHOSE', () => {
    // La demande de Rémy, mot pour mot, est la famille par défaut.
    const p = tirerDesPaires({ famille: 'puissances', combien: 8 }, makeRng('demande'));
    assert.equal(p.length, 8);
    for (const c of p) {
        assert.match(c.gauche, /^10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+$/, `à gauche, une puissance : ${c.gauche}`);
        assert.match(c.droite, /^[\d ,]+$/, `à droite, un nombre : ${c.droite}`);
        assert.ok(c.aide && c.aide.length > 10, 'chaque paire dit POURQUOI elle va ensemble');
    }
});

test('LE NOMBRE DE PAIRES RESTE JOUABLE', () => {
    // Trois est le plancher — en dessous, il n'y a plus rien à chercher — et
    // huit le plafond : seize cartes tiennent encore sur une tablette.
    assert.equal(tirerDesPaires({ combien: 1 }, makeRng('a')).length, 3);
    assert.equal(tirerDesPaires({ combien: 99 }, makeRng('b')).length, 8);
    assert.equal(tirerDesPaires({ combien: 0 }, makeRng('c')).length, 6);
});

test('LE JEU NE RÉÉCRIT AUCUNE RÈGLE, ET SES TRAITS SONT DANS LE CADRE', () => {
    const jeu = readFileSync('js/games/apparier.js', 'utf8');
    assert.match(jeu, /import \{ tirerDesPaires, FAMILLES_PAIRES \} from '\.\.\/core\/pairesPuissances\.js'/,
        'les paires viennent du module pur, pas d\'ici');
    // LES COORDONNÉES SE PRENNENT PAR RAPPORT AU CADRE DU JEU, et non à la
    // page : le cadre défile, la page aussi, et deux repères différents
    // donnent un trait qui part à côté dès qu'on a fait défiler.
    assert.match(jeu, /const cadre = this\.jeu\.getBoundingClientRect\(\)/,
        'le repère des traits doit être le cadre du jeu');
    assert.match(jeu, /window\.addEventListener\('resize'/,
        'les traits doivent suivre les cartes quand l\'écran change');
    // UNE PAIRE RELIÉE N'EST PAS UNE QUESTION : c'est le TABLEAU qui en est
    // une. Sans `partiel`, six paires compteraient six questions.
    assert.match(jeu, /partiel: true/,
        'une paire reliée ne doit pas faire avancer le compteur de questions');
});

// ── LES TROIS EXERCICES SONT AU CATALOGUE ─────────────────────────────────

test('LES TROIS ARRIVENT AU CATALOGUE, AVEC LEUR CODE ET LEUR DATE', () => {
    for (const [id, activite] of [
        ['num-puissances-produit', 'buttons'],
        ['num-prefixes-tableau', 'conversion'],
        ['num-puissances-relier', 'apparier']
    ]) {
        const exo = getExerciseById(id);
        assert.ok(exo, `${id} manque au catalogue`);
        assert.equal(exo.activityId, activite, `${id} n'ouvre pas la bonne activité`);
        assert.match(CODES_EXERCICES[id] || '', /^[A-HJ-NP-Z]{2}$/,
            `${id} n'a pas de code dictable (ni I, ni O, ni Q)`);
        // SANS DATE, L'EXERCICE EXISTE ET N'EST JAMAIS NEUF : il n'apparaît pas
        // dans « Les derniers exercices », là où Rémy le cherchera.
        assert.match(exo.cree || '', /^\d{4}-\d{2}-\d{2}$/, `${id} n'a pas de date`);
    }
    // ET LE TABLEAU DES PRÉFIXES EST AUSSI DANS LE TABLEAU DE CONVERSION :
    // qui ouvre « Le Tableau de Conversion » doit pouvoir y aller sans
    // chercher un autre exercice.
    const tableau = getExerciseById('mes-conversion');
    const familles = (tableau.paramSchema.find(p => p.id === 'famille') || {}).options || [];
    assert.ok(familles.some(o => o.value === 'prefixes'),
        'le tableau de conversion doit offrir les préfixes');
});
