import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { A4, DEFAUTS, couperEnLignes, composerFiche, composerSolutions, RE_FRACTION, porteUneFraction, typographieFr } from '../js/core/fiche.js';

// Un mesureur de service : chaque caractère vaut la moitié de la taille. Les
// tests portent sur la mise en page, pas sur les métriques d'une police.
const mesurer = (t, taille) => t.length * taille * 0.5;

test('un texte court tient sur une ligne', () => {
    // Le point d'interrogation revient collé : c'est la typographie française,
    // appliquée au découpage lui-même (voir plus bas).
    assert.deepEqual(couperEnLignes('7 × 8 = ?', 100, 4, mesurer), ['7 × 8 =\u00a0?']);
});

test('la ponctuation haute ne part jamais seule à la ligne', () => {
    // « ça se joue à peu de choses » : la question tenait à un cheveu près, et
    // c'est le « ? » qui basculait tout seul sur la ligne suivante.
    const lignes = couperEnLignes('Combien font 8 × 7 ?', 20, 4, mesurer);
    assert.ok(lignes.length > 1, 'il faut bien plusieurs lignes');
    assert.ok(!lignes.some(l => l.trim() === '?'), 'le « ? » est resté seul');
    assert.ok(lignes.at(-1).endsWith('7\u00a0?'));
    // Un TROU, lui, n'est pas une espace de ponctuation : la place laissée pour
    // écrire reste intacte, même quand c'est un « ? » qui la suit.
    assert.equal(typographieFr('8 ×    ?'), '8 ×    ?');
    assert.equal(typographieFr('Il dit « oui » ; puis 50 % !'),
        'Il dit «\u00a0oui\u00a0»\u00a0; puis 50\u00a0%\u00a0!');
});

test('un texte long est coupé aux espaces, sans jamais dépasser', () => {
    const texte = 'Quelle est la partie entière du nombre décimal quatre-vingt-quatre virgule vingt et un ?';
    const lignes = couperEnLignes(texte, 40, 4, mesurer);
    assert.ok(lignes.length > 1, 'il faut bien plusieurs lignes');
    lignes.forEach(l => assert.ok(mesurer(l, 4) <= 40, `« ${l} » déborde`));
    assert.equal(lignes.join(' '), typographieFr(texte), 'aucun mot perdu en route');
});

test('un mot plus long que la colonne est coupé plutôt que de déborder', () => {
    // Le cas réel : un grand nombre écrit sans espace, ou une expression collée.
    const lignes = couperEnLignes('123456789012345678901234567890', 20, 4, mesurer);
    assert.ok(lignes.length > 1);
    lignes.forEach(l => assert.ok(mesurer(l, 4) <= 20, `« ${l} » déborde`));
    assert.equal(lignes.join(''), '123456789012345678901234567890');
});

test('les questions se rangent en colonnes puis en pages, sans jamais sortir de la zone', () => {
    const questions = Array.from({ length: 60 }, (_, i) => ({ texte: `Question ${i + 1} : combien font 7 × 8 ?`, reponse: 56 }));
    const { pages, zone, opts } = composerFiche(questions, { colonnes: 2 }, mesurer);

    assert.ok(pages.length >= 2, '60 questions ne tiennent pas sur une page');
    const total = pages.reduce((s, p) => s + p.blocs.length, 0);
    assert.equal(total, 60, 'aucune question perdue');

    for (const p of pages) {
        for (const b of p.blocs) {
            assert.ok(b.x >= zone.x - 0.01, 'bloc à gauche de la marge');
            assert.ok(b.x + b.largeur <= zone.x + zone.w + 0.01, 'bloc à droite de la marge');
            assert.ok(b.y >= zone.y - 0.01, 'bloc au-dessus de la zone');
            const bas = b.y + b.lignes.length * opts.interligne + opts.ligneReponse;
            assert.ok(bas <= zone.y + zone.h + 0.01, `bloc ${b.n} déborde en bas (${bas.toFixed(1)} > ${(zone.y + zone.h).toFixed(1)})`);
        }
    }
});

test('la numérotation est continue d\'une page à l\'autre', () => {
    const questions = Array.from({ length: 45 }, (_, i) => ({ texte: `Calcul ${i}`, reponse: i }));
    const { pages } = composerFiche(questions, { colonnes: 2 }, mesurer);
    const numeros = pages.flatMap(p => p.blocs.map(b => b.n));
    assert.deepEqual(numeros, questions.map((_, i) => i + 1));
});

test('deux blocs d\'une même colonne ne se chevauchent jamais', () => {
    const questions = Array.from({ length: 30 }, (_, i) => ({
        // Des énoncés de longueurs très différentes : c'est là que les mises en
        // page à hauteur fixe se chevauchent.
        texte: i % 3 === 0
            ? 'Court ?'
            : 'Un énoncé nettement plus long qui va forcément passer à la ligne au moins une fois ou deux',
        reponse: i
    }));
    const { pages, opts } = composerFiche(questions, { colonnes: 2 }, mesurer);
    for (const p of pages) {
        const parColonne = new Map();
        p.blocs.forEach(b => {
            const k = Math.round(b.x);
            if (!parColonne.has(k)) parColonne.set(k, []);
            parColonne.get(k).push(b);
        });
        for (const liste of parColonne.values()) {
            liste.sort((a, b) => a.y - b.y);
            for (let i = 1; i < liste.length; i++) {
                const precedent = liste[i - 1];
                const bas = precedent.y + precedent.lignes.length * opts.interligne + opts.ligneReponse;
                assert.ok(liste[i].y >= bas - 0.01,
                    `la question ${liste[i].n} chevauche la ${precedent.n}`);
            }
        }
    }
});

test('les choix d\'un QCM ne sont imprimés que si on les demande', () => {
    const questions = [{ texte: '3/4 … 1/4', choix: ['<', '=', '>'], reponse: '>' }];
    assert.equal(composerFiche(questions, {}, mesurer).pages[0].blocs[0].choix, null);
    const avec = composerFiche(questions, { avecChoix: true }, mesurer).pages[0].blocs[0];
    assert.deepEqual(avec.choix, ['<', '=', '>']);
});

test('une colonne de plus rétrécit les colonnes, jamais la feuille', () => {
    const questions = [{ texte: 'Bonjour', reponse: 1 }];
    const une = composerFiche(questions, { colonnes: 1 }, mesurer);
    const trois = composerFiche(questions, { colonnes: 3 }, mesurer);
    assert.ok(trois.colonneW < une.colonneW);
    assert.equal(une.zone.w, trois.zone.w, 'la zone imprimable ne bouge pas');
    assert.ok(une.colonneW <= A4.w - 2 * A4.marge + 0.01);
});

test('le nombre de colonnes est borné à ce qui reste lisible', () => {
    // Six au plus : trois suffisent à une fiche où l'on écrit, mais la
    // feuille de solutions compacte en demande cinq — c'est elle qui doit
    // tenir sur une page pendant qu'on corrige trente copies.
    const q = [{ texte: 'x', reponse: 1 }];
    assert.equal(composerFiche(q, { colonnes: 9 }, mesurer).colonnes, 6);
    assert.equal(composerFiche(q, { colonnes: 0 }, mesurer).colonnes, 1);
});

test('la page des solutions reprend la même numérotation, en plus dense', () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({ texte: `Q${i}`, reponse: (i + 1) * 3 }));
    const sol = composerSolutions(questions, {}, mesurer);
    const blocs = sol.pages.flatMap(p => p.blocs);
    assert.equal(blocs.length, 12);
    assert.equal(sansMarques(blocs[0].lignes[0]), '1. 3');
    assert.equal(sansMarques(blocs[11].lignes[0]), '12. 36');
    // Douze réponses courtes doivent tenir très largement sur une seule page.
    assert.equal(sol.pages.length, 1);
});

test('une fiche vide ne produit pas de page fantôme', () => {
    assert.deepEqual(composerFiche([], {}, mesurer).pages, []);
});

test('la zone imprimable respecte les marges de la feuille', () => {
    const { zone } = composerFiche([{ texte: 'a', reponse: 1 }], {}, mesurer);
    assert.equal(zone.x, A4.marge);
    assert.equal(zone.y, A4.marge + A4.enteteH);
    assert.ok(zone.y + zone.h <= A4.h - A4.marge, 'la zone dépasse la marge basse');
    assert.ok(DEFAUTS.ligneReponse > 0, 'il faut de la place pour écrire la réponse');
});

test('un intertitre occupe sa place et ne se numérote pas', () => {
    const questions = [
        { titre: true, texte: 'Flash Mult' },
        { texte: '7 × 8 = ?', reponse: 56 },
        { texte: '6 × 9 = ?', reponse: 54 },
        { titre: true, texte: 'Sommes de Relatifs' },
        { texte: '(−3) + (+5) = ?', reponse: 2 }
    ];
    const { pages, opts } = composerFiche(questions, { colonnes: 1 }, mesurer);
    const blocs = pages.flatMap(p => p.blocs);

    // La numérotation compte les questions, pas les titres.
    assert.deepEqual(blocs.filter(b => !b.titre).map(b => b.n), [1, 2, 3]);
    assert.deepEqual(blocs.filter(b => b.titre).map(b => b.lignes[0]), ['Flash Mult', 'Sommes de Relatifs']);

    // Un titre n'a pas de ligne à remplir…
    blocs.filter(b => b.titre).forEach(b => assert.equal(b.reponseY, null));
    // … mais il occupe bien sa place : la question qui suit est PLUS BAS.
    for (let i = 0; i < blocs.length - 1; i++) {
        if (!blocs[i].titre) continue;
        const suivant = blocs[i + 1];
        assert.ok(suivant.y > blocs[i].y + opts.interligne * 0.9,
            `« ${blocs[i].lignes[0]} » se pose sur la question qui le suit`);
    }
});

test('un intertitre ne reste jamais seul en bas d\'une colonne', () => {
    // On remplit une colonne presque entièrement, puis on ouvre une section.
    const questions = [];
    for (let i = 0; i < 22; i++) questions.push({ texte: `Question ${i}`, reponse: i });
    questions.push({ titre: true, texte: 'Deuxième exercice' });
    questions.push({ texte: 'La première de la section', reponse: 1 });

    const { pages } = composerFiche(questions, { colonnes: 2 }, mesurer);
    const blocs = pages.flatMap(p => p.blocs);
    const iTitre = blocs.findIndex(b => b.titre);
    assert.ok(iTitre >= 0);
    const titre = blocs[iTitre], suivante = blocs[iTitre + 1];
    assert.ok(suivante, 'la section a bien une question');
    assert.equal(Math.round(titre.x), Math.round(suivante.x),
        'le titre est resté dans une colonne que sa première question a quittée');
});

// --- La fiche en blocs d'exercices ------------------------------------------

import {
    composerBlocs, DEFAUTS_BLOCS, sansMarques, reponseEnPlace, morceauxReponse,
    DEBUT_REP, FIN_REP
} from '../js/core/fiche.js';
// `texteImprime` est déjà importé plus haut, avec le reste du noyau.

const exoCourt = (titre, n, texte = '7 × 8 = ?') => ({
    titre, consigne: '',
    questions: Array.from({ length: n }, (_, i) => ({ texte, reponse: i }))
});

test('blocs : les questions courtes se rangent à plusieurs par ligne', () => {
    const { pages, nbQuestions } = composerBlocs([exoCourt('Tables', 12)], {}, mesurer);
    assert.equal(nbQuestions, 12);
    const qs = pages[0].items.filter(i => i.type === 'q');
    const xs = new Set(qs.map(q => Math.round(q.x)));
    assert.ok(xs.size >= 2, `questions courtes sur ${xs.size} colonne(s) — on en attend plusieurs`);
});

test('blocs : un long énoncé ramène son exercice à une colonne', () => {
    const long = 'Quelle est la partie entière du nombre décimal quatre-vingt-quatre virgule vingt et un, sachant que sa partie décimale compte deux chiffres ?';
    const { pages } = composerBlocs([{
        titre: 'Décimaux', questions: Array.from({ length: 4 }, () => ({ texte: long }))
    }], {}, mesurer);
    const qs = pages[0].items.filter(i => i.type === 'q');
    assert.equal(new Set(qs.map(q => Math.round(q.x))).size, 1);
    qs.forEach(q => assert.ok(q.lignes.length > 1));
});

test('blocs : une question de l\'exercice 2 ne se glisse jamais dans l\'exercice 1', () => {
    const { pages } = composerBlocs([exoCourt('A', 5), exoCourt('B', 5)], {}, mesurer);
    // Sur chaque page, l'ordre vertical suit l'ordre des items : le bandeau de
    // B est posé APRÈS toutes les questions de A, et plus bas qu'elles.
    const items = pages[0].items;
    const bandeauB = items.findIndex(i => i.type === 'exo' && i.titre === 'B');
    items.slice(0, bandeauB).filter(i => i.type === 'q').forEach(q => {
        assert.ok(q.y < items[bandeauB].y, 'question de A sous le bandeau de B');
    });
    const apres = items.slice(bandeauB).filter(i => i.type === 'q');
    apres.forEach(q => assert.ok(q.y >= items[bandeauB].y));
});

test('blocs : rien ne sort de la zone, même sur plusieurs pages', () => {
    const exos = [exoCourt('A', 40), exoCourt('B', 40, 'Un énoncé qui prend nettement plus de place sur la ligne ?'), exoCourt('C', 30)];
    const { pages, zone, opts, nbQuestions } = composerBlocs(exos, {}, mesurer);
    assert.equal(nbQuestions, 110);
    assert.ok(pages.length > 1);
    for (const p of pages) {
        for (const it of p.items) {
            assert.ok(it.y >= zone.y - 0.01, `${it.type} au-dessus de la zone`);
            const bas = it.type === 'q'
                ? Math.max(it.y + it.lignes.length * opts.interligne, it.rep ? it.rep.y : 0)
                : it.y + (it.h || 5);
            assert.ok(bas <= zone.y + zone.h + 0.01, `${it.type} déborde en bas (${bas.toFixed(1)})`);
        }
    }
});

test('blocs : un exercice coupé par la page reprend avec un bandeau « suite »', () => {
    const { pages } = composerBlocs([exoCourt('Grand', 300)], {}, mesurer);
    assert.ok(pages.length > 1);
    for (let i = 1; i < pages.length; i++) {
        const premier = pages[i].items[0];
        assert.equal(premier.type, 'exo');
        assert.equal(premier.suite, true);
    }
});

test('blocs : la numérotation est continue à travers exercices et pages', () => {
    const { pages } = composerBlocs([exoCourt('A', 30), exoCourt('B', 30)], {}, mesurer);
    const numeros = pages.flatMap(p => p.items.filter(i => i.type === 'q').map(q => q.n));
    assert.deepEqual(numeros, numeros.map((_, i) => i + 1));
});

test('blocs : l\'interrogation laisse de la place pour écrire', () => {
    // DES POINTILLÉS JUSQU'AU BOUT DE LA COLONNE, pas une ligne entière par
    // question. Renvoyer toutes les réponses sous leur énoncé donnait une
    // demi-page de blanc pour des réponses de trois chiffres.
    const { pages, opts } = composerBlocs([exoCourt('A', 6)], { interrogation: true }, mesurer);
    const qs = pages[0].items.filter(i => i.type === 'q');
    qs.forEach(q => {
        assert.ok(q.rep, 'chaque question a sa zone de réponse');
        assert.ok(q.rep.w >= opts.repMin,
            `pointillés trop courts pour une interrogation : ${q.rep.w.toFixed(1)} mm`);
    });

    // Un énoncé long, lui, garde sa ligne à part : il ne reste plus la place.
    const longues = { titre: 'B', questions: Array.from({ length: 4 }, () => ({
        texte: 'Un énoncé nettement plus long, qui occupe toute la largeur de sa colonne et '
            + 'déborde largement sur une deuxième ligne, comme un problème rédigé en fait toujours' })) };
    const large = composerBlocs([longues], { interrogation: true }, mesurer);
    large.pages[0].items.filter(i => i.type === 'q').forEach(q => {
        assert.ok(q.rep.y >= q.y + large.opts.interligne, 'la réponse passe sous la question');
    });
});

test('blocs : deux questions voisines ne se chevauchent jamais', () => {
    const exos = [{
        titre: 'Mélange',
        questions: Array.from({ length: 24 }, (_, i) => ({
            texte: i % 3 === 0 ? 'Court ?' : 'Un énoncé nettement plus long qui passera à la ligne au moins une fois ou deux, voire trois'
        }))
    }];
    const { pages, opts } = composerBlocs(exos, {}, mesurer);
    for (const p of pages) {
        const qs = p.items.filter(i => i.type === 'q');
        for (const a of qs) {
            for (const b of qs) {
                if (a === b || Math.round(a.x) !== Math.round(b.x) || a.y >= b.y) continue;
                const basA = Math.max(a.y + a.lignes.length * opts.interligne, a.rep ? a.rep.y : 0);
                assert.ok(b.y >= basA - 0.01, `la question ${b.n} chevauche la ${a.n}`);
            }
        }
    }
});

test('les trois modes de solutions disent trois choses différentes', () => {
    const questions = [
        { texte: '7 × 8', reponse: '56', explication: 'La table de 7 : 7 × 8 = 56.' },
        { texte: '6 × 9', reponse: '54', explication: 'Le double de 27.' }
    ];
    const ligne = (m) => composerSolutions(questions, { mode: m }, mesurer)
        .pages.flatMap(p => p.blocs)[0].lignes.map(sansMarques);

    // COMPACT : le numéro et la réponse, rien d'autre. C'est la feuille qu'on
    // tient d'une main en corrigeant.
    assert.deepEqual(ligne('compact'), ['1. 56']);
    // NORMAL : l'énoncé rappelé, utile quand on corrige des jours après.
    assert.deepEqual(ligne('normal'), ['1. 7 × 8 = 56']);
    // DÉTAILLÉ : l'explication en plus, sur sa propre ligne — c'est la feuille
    // qu'on distribue après le contrôle.
    assert.deepEqual(ligne('detaille'), ['1. 7 × 8 = 56', 'La table de 7\u00a0: 7 × 8 = 56.']);
});

test('la feuille compacte tient sur cinq colonnes, la détaillée sur une', () => {
    const questions = Array.from({ length: 30 }, (_, i) => ({
        texte: `${i + 2} × 8`, reponse: String((i + 2) * 8), explication: 'Table de 8.'
    }));
    assert.equal(composerSolutions(questions, { mode: 'compact' }, mesurer).colonnes, 5);
    assert.equal(composerSolutions(questions, { mode: 'normal' }, mesurer).colonnes, 3);
    assert.equal(composerSolutions(questions, { mode: 'detaille' }, mesurer).colonnes, 1);
    // Et le compact tient sur UNE page : c'est sa raison d'être.
    assert.equal(composerSolutions(questions, { mode: 'compact' }, mesurer).pages.length, 1);
});

test('un exercice à grilles occupe des carrés, jamais coupés entre deux pages', () => {
    // Sudoku, binairo, garam : ils n'ont pas de questions, ils ont des grilles.
    // Une grille à cheval sur deux pages est une grille perdue.
    const grilles = Array.from({ length: 6 }, () => ({ cle: 'sudoku', item: {} }));
    const mise = composerBlocs([{ titre: 'Sudoku', consigne: 'Complète.', points: 6, grilles }], {}, mesurer);
    const tous = mise.pages.flatMap(p => p.items).filter(it => it.type === 'grille');
    assert.equal(tous.length, 6, 'les six grilles sont posées');
    assert.equal(new Set(tous.map(g => Math.round(g.taille))).size, 1, 'toutes de la même taille');
    for (const g of tous) {
        assert.ok(g.y + g.taille <= mise.zone.y + mise.zone.h + 0.01,
            `une grille déborde du bas de page (y=${g.y}, côté=${g.taille})`);
        assert.ok(g.x + g.taille <= mise.zone.x + mise.zone.w + 0.01, 'une grille déborde à droite');
    }
    // La numérotation continue de couvrir les grilles : « exercice 2, grille 3 ».
    assert.deepEqual(tous.map(g => g.n), [1, 2, 3, 4, 5, 6]);
});

test('questions et grilles cohabitent sur la même fiche', () => {
    const mise = composerBlocs([
        { titre: 'Calcul', consigne: 'Calcule.', questions: [{ texte: '7 × 8' }, { texte: '6 × 9' }] },
        { titre: 'Sudoku', consigne: 'Complète.', grilles: [{ cle: 'sudoku', item: {} }] }
    ], {}, mesurer);
    const types = mise.pages.flatMap(p => p.items).map(it => it.type);
    assert.ok(types.includes('q'), 'les questions sont là');
    assert.ok(types.includes('grille'), 'les grilles aussi');
    // Et la numérotation est CONTINUE d'un exercice à l'autre.
    const nums = mise.pages.flatMap(p => p.items).filter(it => it.n && it.type !== 'exo').map(it => it.n);
    assert.deepEqual(nums, [1, 2, 3]);
});

// --- LE BARÈME D'UNE INTERROGATION ---------------------------------------------

import { repartirBareme } from '../js/core/fiche.js';

test('UN POINT PAR QUESTION, ET LE TOTAL EST LE NOMBRE DE QUESTIONS', () => {
    // Rémy : « si c'est un mode interro, par défaut c'est le nombre de points =
    // le nombre de questions ; c'est le prof qui corrige au besoin pour chaque
    // exercice. »
    //
    // On répartissait une note sur vingt au prorata. Le calcul était juste et
    // le résultat inutilisable : douze questions d'un côté, trois de l'autre,
    // cela donnait « 16 points » et « 4 points » — des nombres qu'on ne peut ni
    // annoncer avant l'interrogation ni vérifier après, et qui changeaient le
    // poids d'un exercice selon ce qu'il y avait à côté de lui.
    const quantites = { add: 10, sub: 10, sudoku: 6, garam: 6, binairo: 6 };
    const pts = repartirBareme(quantites, 20);
    assert.deepEqual(pts, { add: 10, sub: 10, sudoku: 6, garam: 6, binairo: 6 });
    const somme = Object.values(pts).reduce((s, p) => s + p, 0);
    assert.equal(somme, 38, 'le total est le nombre de questions, pas la note');

    // LA NOTE DEMANDÉE N'Y CHANGE RIEN : c'est le professeur qui corrige les
    // cases s'il veut retomber sur vingt, et le panneau lui signale l'écart.
    for (const sur of [7, 10, 20, 40, 100]) {
        assert.deepEqual(repartirBareme(quantites, sur), pts, `note sur ${sur}`);
    }
});

test('un exercice à zéro question ne vaut aucun point', () => {
    const pts = repartirBareme({ add: 10, retire: 0 }, 20);
    assert.equal(pts.retire, 0);
    assert.equal(pts.add, 10, 'un point par question, et rien pour ce qui n\'est pas demandé');
});

test('aucun exercice demandé ne vaut zéro point', () => {
    // Un exercice qui EST sur la feuille vaut au moins un point, même si son
    // compte a été mis à une valeur qui s'arrondirait à zéro : une question
    // posée se corrige.
    assert.deepEqual(repartirBareme({ a: 0.4, b: 3 }, 20), { a: 1, b: 3 });
});

test('sans aucun exercice actif, le barème reste vide', () => {
    assert.deepEqual(repartirBareme({ a: 0, b: 0 }, 20), { a: 0, b: 0 });
    assert.deepEqual(repartirBareme({}, 20), {});
});

// --- UNE VRAIE MISE EN PAGE ----------------------------------------------------

import { A4_PAYSAGE, pageDe, texteImprime } from '../js/core/fiche.js';

test('le point d\'interrogation d\'un « = ? » ne s\'imprime pas', () => {
    // Sur le papier, la place à remplir ce sont les pointillés : « 7 + 2 = ? »
    // se termine sur le signe égal, comme dans tous les cahiers.
    assert.equal(texteImprime('7 + 2 = ?'), '7 + 2 =');
    assert.equal(texteImprime('7 + 2 =?'), '7 + 2 =');
    assert.equal(texteImprime('12 × 4 = ?  '), '12 × 4 =');
    // Mais une VRAIE question garde son point d'interrogation.
    assert.equal(texteImprime('Combien de billes reste-t-il ?'), 'Combien de billes reste-t-il ?');
    assert.equal(texteImprime('Quel est le résultat de 3 + 4 ?'), 'Quel est le résultat de 3 + 4 ?');
    // Y compris quand la phrase contient un « = » ailleurs.
    assert.equal(texteImprime('On sait que a = 3. Que vaut 2a ?'), 'On sait que a = 3. Que vaut 2a ?');
});

test('la fiche se compose aussi sur une page couchée', () => {
    const questions = Array.from({ length: 24 }, (_, i) => ({ texte: `${i + 2} × 7 =` }));
    const debout = composerBlocs([{ titre: 'Tables', questions }], { orientation: 'portrait' }, mesurer);
    const couche = composerBlocs([{ titre: 'Tables', questions }], { orientation: 'paysage' }, mesurer);

    assert.equal(debout.page.w, 210);
    assert.equal(couche.page.w, A4_PAYSAGE.w);
    assert.equal(couche.page.h, A4_PAYSAGE.h);
    // Une page couchée est plus large : elle tient plus de colonnes.
    assert.ok(couche.colonnes[0] > debout.colonnes[0],
        `paysage ${couche.colonnes[0]} colonnes vs portrait ${debout.colonnes[0]}`);
    // Et rien ne dépasse de la feuille.
    for (const p of couche.pages) {
        for (const it of p.items) {
            assert.ok(it.x >= couche.zone.x - 0.01, 'un item sort à gauche');
            assert.ok(it.x + (it.w ?? it.texteW ?? 0) <= couche.zone.x + couche.zone.w + 0.01,
                'un item sort à droite');
        }
    }
});

test('le professeur impose le nombre de colonnes, exercice par exercice', () => {
    const q = (n) => Array.from({ length: n }, (_, i) => ({ texte: `${i + 1} + 1 =` }));
    const mise = composerBlocs([
        { titre: 'Calcul', questions: q(12), colonnes: 4 },
        { titre: 'Problèmes', questions: q(3), colonnes: 1 }
    ], {}, mesurer);
    assert.deepEqual(mise.colonnes, [4, 1]);

    // Quatre colonnes, c'est bien quatre abscisses distinctes sur une rangée.
    const qs = mise.pages.flatMap(p => p.items).filter(it => it.type === 'q');
    const xs = [...new Set(qs.slice(0, 4).map(it => Math.round(it.x)))];
    assert.equal(xs.length, 4, 'la première rangée occupe quatre colonnes');
    // Et l'exercice suivant revient à une seule.
    const apres = qs.slice(12, 15).map(it => Math.round(it.x));
    assert.equal(new Set(apres).size, 1, 'le second exercice tient sur une colonne');
});

test('les grilles par ligne se choisissent, et la rangée reste centrée', () => {
    const grilles = (n) => Array.from({ length: n }, () => ({ cle: 'sudoku', item: {} }));
    const mise = composerBlocs([{ titre: 'Mathdoku', grilles: grilles(4), grillesParLigne: 4 }],
        { orientation: 'paysage' }, mesurer);
    assert.deepEqual(mise.colonnes, [4]);
    const g = mise.pages.flatMap(p => p.items).filter(it => it.type === 'grille');
    assert.equal(g.length, 4);
    assert.equal(new Set(g.map(x => Math.round(x.y))).size, 1, 'les quatre sont sur la même ligne');

    // Centrage : les marges gauche et droite de la rangée sont égales.
    const gauche = g[0].x - mise.zone.x;
    const droite = (mise.zone.x + mise.zone.w) - (g[3].x + g[3].taille);
    assert.ok(Math.abs(gauche - droite) < 0.01, `rangée décentrée (${gauche} vs ${droite})`);
});

test('chaque question porte une boîte de saisie nommée et unique', () => {
    const mise = composerBlocs([{ titre: 'Calcul', questions: [
        { texte: '7 + 2 =' }, { texte: '3 + 5 =' }, { texte: '9 + 1 =' }
    ] }], { champs: true }, mesurer);
    const qs = mise.pages.flatMap(p => p.items).filter(it => it.type === 'q');
    const noms = qs.map(it => it.rep.nom);
    assert.equal(new Set(noms).size, noms.length, 'deux champs ne portent jamais le même nom');
    for (const it of qs) {
        assert.ok(it.rep.h > 0, 'un champ sans hauteur ne se clique pas');
        // La boîte est à cheval sur la ligne d'écriture, pas en dessous.
        assert.ok(it.rep.champY < it.rep.y && it.rep.champY + it.rep.h > it.rep.y - 0.01,
            'la boîte ne couvre pas la ligne de réponse');
    }
});

test('pageDe rend une COPIE : personne ne peut abîmer la géométrie A4', () => {
    const p = pageDe('portrait');
    p.marge = 999;
    assert.equal(pageDe('portrait').marge, 14);
});

test('la feuille de solutions écrit l\'énoncé comme la fiche', () => {
    const questions = [{ texte: '7 × 8 = ?', reponse: '56', explication: 'La table de 7.' }];
    const ligne = (m) => sansMarques(composerSolutions(questions, { mode: m }, mesurer)
        .pages.flatMap(p => p.blocs)[0].lignes[0]);
    // Le « = ? » disparaît, et le signe égal unique reste celui du corrigé.
    assert.equal(ligne('normal'), '1. 7 × 8 = 56');
    assert.equal(ligne('detaille'), '1. 7 × 8 = 56');
});

test('une feuille de solutions ne laisse pas trois colonnes vides', () => {
    // Soixante réponses courtes tenaient sur deux colonnes, la feuille était
    // blanche aux trois cinquièmes. Les colonnes s'équilibrent maintenant.
    const questions = Array.from({ length: 60 }, (_, i) => ({ texte: `${i} + 1`, reponse: String(i + 1) }));
    const mise = composerSolutions(questions, { mode: 'compact' }, mesurer);
    assert.equal(mise.pages.length, 1, 'le compact tient sur une page');
    const xs = [...new Set(mise.pages[0].blocs.map(b => Math.round(b.x)))].sort((a, b) => a - b);
    assert.equal(xs.length, 5, `cinq colonnes occupées, pas ${xs.length}`);
    // Et elles sont de hauteur comparable : aucune ne porte le double d'une autre.
    const parCol = xs.map(x => mise.pages[0].blocs.filter(b => Math.round(b.x) === x).length);
    assert.ok(Math.max(...parCol) - Math.min(...parCol) <= 1,
        `colonnes déséquilibrées : ${parCol.join(', ')}`);
});

test('la feuille de solutions dit à quel exercice on en est', () => {
    const q = (n, base) => Array.from({ length: n }, (_, i) => ({ texte: `q${i}`, reponse: String(base + i) }));
    const sections = [
        { titre: 'Amis de 10', points: 6, questions: q(3, 1) },
        { titre: 'Soustractions', points: 4, questions: q(2, 10) }
    ];
    const mise = composerSolutions([], { mode: 'compact', sections }, mesurer);
    const lignes = mise.pages.flatMap(p => p.blocs).map(b => sansMarques(b.lignes.join(' ')));
    assert.ok(lignes.includes('Exercice 1 — Amis de 10 — 6 pts'), lignes.join(' | '));
    assert.ok(lignes.includes('Exercice 2 — Soustractions — 4 pts'), lignes.join(' | '));
    // La numérotation reste CONTINUE d'un exercice à l'autre.
    assert.ok(lignes.includes('4. 10') && lignes.includes('5. 11'), lignes.join(' | '));
});

test('aucune page vide ne se glisse dans la fiche', () => {
    for (const n of [1, 5, 12, 23, 40, 61]) {
        const questions = Array.from({ length: n }, (_, i) => ({ texte: `${i} × 7 =` }));
        const mise = composerBlocs([{ titre: 'Tables', questions }], { interrogation: true }, mesurer);
        mise.pages.forEach((p, i) => assert.ok(p.items.length > 0, `page ${i + 1} vide avec ${n} questions`));
    }
});

test('un bloc peut ne pas être carré, et il tient quand même dans la page', () => {
    // Une figure suivie de trois lignes à rédiger est large et basse : le bloc
    // déclare sa proportion, la mise en page la respecte.
    const blocs = Array.from({ length: 6 }, () => ({ cle: 'redaction', item: {} }));
    const mise = composerBlocs([{ titre: 'Rédiger', grilles: blocs, grilleRatio: 0.72 }], {}, mesurer);
    const items = mise.pages.flatMap(p => p.items).filter(it => it.type === 'grille');
    assert.equal(items.length, 6);
    for (const it of items) {
        assert.ok(Math.abs(it.boite.h / it.boite.w - 0.72) < 0.001,
            `proportion perdue : ${it.boite.h} / ${it.boite.w}`);
        assert.ok(it.boite.y + it.boite.h <= mise.zone.y + mise.zone.h + 0.01, 'un bloc déborde du bas');
        assert.ok(it.boite.x + it.boite.w <= mise.zone.x + mise.zone.w + 0.01, 'un bloc déborde à droite');
    }
});

// --- La numérotation --------------------------------------------------------
//
// Deux réglages demandés, et ils sont indépendants : un GLOBAL — les numéros
// se suivent d'un bout à l'autre de la feuille, ou repartent à 1 à chaque
// exercice — et un PAR EXERCICE — numéroter, ou pas du tout.

const numeros = (mise) => mise.pages
    .flatMap(p => p.items)
    .filter(i => i.type === 'q' || i.type === 'grille')
    .map(i => i.n);

test('numéros : en continu, ils courent d\'un exercice à l\'autre', () => {
    const mise = composerBlocs([exoCourt('A', 3), exoCourt('B', 3)], {}, mesurer);
    assert.deepEqual(numeros(mise), [1, 2, 3, 4, 5, 6]);
});

test('numéros : par exercice, ils repartent à 1', () => {
    const mise = composerBlocs([exoCourt('A', 3), exoCourt('B', 3)],
        { numerotation: 'exercice' }, mesurer);
    assert.deepEqual(numeros(mise), [1, 2, 3, 1, 2, 3]);
});

test('numéros : un exercice non numéroté n\'en consomme aucun', () => {
    const sans = { ...exoCourt('Sudokus', 2), numeroter: false };
    const mise = composerBlocs([exoCourt('A', 2), sans, exoCourt('C', 2)], {}, mesurer);
    // Les deux questions du milieu ne portent rien, et la suite reprend où
    // l'on s'était arrêté — pas deux crans plus loin.
    assert.deepEqual(numeros(mise), [1, 2, null, null, 3, 4]);
});

test('numéros : sans numéro, le texte récupère la gouttière', () => {
    const avec = composerBlocs([exoCourt('A', 2)], {}, mesurer);
    const sans = composerBlocs([{ ...exoCourt('A', 2), numeroter: false }], {}, mesurer);
    const q1 = avec.pages[0].items.find(i => i.type === 'q');
    const q2 = sans.pages[0].items.find(i => i.type === 'q');
    assert.ok(q2.texteX < q1.texteX, 'le texte doit commencer plus à gauche');
    assert.equal(Math.round(q2.texteX), Math.round(q2.x));
    assert.ok(q2.texteW > q1.texteW, 'et disposer de plus de largeur');
});

test('numéros : les champs du PDF gardent des noms uniques', () => {
    // Piège : si le nom du champ suivait le numéro imprimé, deux questions
    // « 1. » de deux exercices porteraient le même nom — et un PDF recopie la
    // réponse d'un champ dans tous ses homonymes.
    const mise = composerBlocs([exoCourt('A', 3), { ...exoCourt('B', 3), numeroter: false }],
        { numerotation: 'exercice', champs: true }, mesurer);
    const noms = mise.pages.flatMap(p => p.items)
        .filter(i => i.type === 'q' && i.rep).map(i => i.rep.nom);
    assert.equal(noms.length, 6);
    assert.equal(new Set(noms).size, 6, 'six questions, six noms de champ');
    assert.equal(mise.nbQuestions, 6, 'le total compte le travail, pas les numéros imprimés');
});

test('numéros : le corrigé suit exactement la feuille', () => {
    const qs = (n, d) => Array.from({ length: n }, (_, i) => ({ texte: `q${d + i}`, reponse: d + i }));
    const sections = [
        { titre: 'A', questions: qs(3, 1) },
        { titre: 'B', questions: qs(2, 4) }
    ];
    const toutes = sections.flatMap(s => s.questions);
    const reponses = (mise) => mise.pages.flatMap(p => p.blocs)
        .filter(b => !b.titre).map(b => sansMarques(b.lignes[0]));

    // En continu, l'exercice B poursuit la numérotation de A.
    assert.deepEqual(
        reponses(composerSolutions(toutes, { mode: 'compact', sections }, mesurer)),
        ['1. 1', '2. 2', '3. 3', '4. 4', '5. 5']);

    // Par exercice, il repart à 1 — comme la feuille de questions.
    assert.deepEqual(
        reponses(composerSolutions(toutes, { mode: 'compact', sections, numerotation: 'exercice' }, mesurer)),
        ['1. 1', '2. 2', '3. 3', '1. 4', '2. 5']);

    // Et un exercice qu'on a choisi de ne pas numéroter ne l'est pas non plus
    // au corrigé : on lit ses réponses dans l'ordre.
    const muet = [sections[0], { ...sections[1], numeroter: false }];
    assert.deepEqual(
        reponses(composerSolutions(toutes, { mode: 'compact', sections: muet }, mesurer)),
        ['1. 1', '2. 2', '3. 3', '4', '5']);
});

// --- Le trou dans l'énoncé --------------------------------------------------
//
// « 82 041 = 80 000 + ? + 40 + 1 » a sa place à écrire AU MILIEU. Trois choses
// devaient donc changer ensemble : le « ? » devient un blanc large de la
// réponse, ce blanc survit au découpage en lignes, et la question ne reçoit
// plus de pointillés au bout — il y aurait deux endroits pour une réponse.

import { trouDe, mesureurFractions } from '../js/core/fiche.js';

test('trou : le « ? » du milieu devient une place à écrire', () => {
    const t = texteImprime('82 041 = 80 000 + ? + 40 + 1', 900);
    assert.ok(!t.includes('?'), 'le point d\'interrogation disparaît');
    const trou = trouDe(t);
    assert.ok(trou, 'et laisse un blanc repérable');
    assert.ok(trou.fin - trou.debut >= 5, 'assez large pour la réponse');
});

test('trou : le « = ? » de la fin reste une ligne de pointillés', () => {
    assert.equal(texteImprime('7 × 8 = ?', 56), '7 × 8 =');
    assert.equal(trouDe(texteImprime('7 × 8 = ?', 56)), null);
    // Le « ≈ ? » suit la même règle : c'est aussi une relation.
    assert.equal(texteImprime('1 003 ≈ ?', 1000), '1 003 ≈');
});

test('trou : la vraie question garde son point d\'interrogation', () => {
    const t = 'Quelle est la partie entière de 10,35 ?';
    assert.equal(texteImprime(t, 10), t);
});

test('trou : « … » et « ... » sont des trous eux aussi', () => {
    assert.ok(trouDe(texteImprime('4/10 … 6/8', '<')), 'la comparaison');
    assert.ok(trouDe(texteImprime('... × 8 = 72', 9)), 'le facteur manquant');
});

test('trou : le découpage en lignes ne mange pas le blanc', () => {
    const t = texteImprime('52 085 = ? + 2 000 + 80 + 5', 2000);
    const lignes = couperEnLignes(t, 400, 3.9, mesurer);
    assert.equal(lignes.length, 1);
    assert.ok(trouDe(lignes[0]), 'le blanc doit survivre au découpage');
});

test('trou : la question qui le porte n\'a pas de pointillés au bout', () => {
    const avec = composerBlocs([{ titre: 'A', questions: [{ texte: '9 + ? = 10', reponse: 1 }] }], {}, mesurer);
    const q = avec.pages[0].items.find(i => i.type === 'q');
    assert.ok(q.rep.dansLeTexte, 'la place à remplir est DANS l\'énoncé');
    // Elle tombe bien sous le blanc, pas en bout de ligne.
    assert.ok(q.rep.x > q.texteX && q.rep.x < q.texteX + q.texteW);
});

test('fractions : on les mesure telles qu\'elles s\'impriment', () => {
    // « 5/11 » en colonne n'occupe que la largeur de « 11 » : mesurée comme du
    // texte, elle passait à la ligne pour rien.
    const mf = mesureurFractions(mesurer);
    // Le trait, le numérateur et le dénominateur se superposent : c'est le plus
    // long des deux qui commande, pas leur somme.
    assert.ok(mf('11/12', 4) < mesurer('11/12', 4));
    // À largeur égale, la mise en page en fait donc tenir davantage sur une
    // ligne — c'est tout l'objet de la mesure.
    const questions = (frac) => Array.from({ length: 4 },
        () => ({ texte: '5/11 + 6/11 =', reponse: '11/11', fractions: frac }));
    const lignes = (frac) => composerBlocs([{ titre: 'F', colonnes: 4, questions: questions(frac) }], {}, mesurer)
        .pages[0].items.filter(i => i.type === 'q');
    const avec = lignes(true), sans = lignes(false);
    assert.ok(avec[0].lignes.length <= sans[0].lignes.length,
        'les fractions empilées ne doivent jamais tenir sur PLUS de lignes');
    assert.ok(avec[0].fractions && avec[0].dy > 0, 'et le texte descend pour loger le numérateur');
    assert.ok(!sans[0].dy, 'une question sans fraction ne descend pas');
});

// LE CARTOUCHE NE COÛTE QUE SA PAGE. Il ne s'imprime que sur la première ;
// lui réserver sa bande sur les quatre pages d'un contrôle, c'était perdre
// cinq questions par page pour un cadre absent.
test('blocs : `enteteH1` abaisse la première page, et elle seule', () => {
    const exos = [exoCourt('Tables', 200)];
    const sans = composerBlocs(exos, {}, mesurer);
    const avec = composerBlocs(exos, { enteteH1: A4.enteteH + 17 }, mesurer);
    assert.ok(sans.pages.length >= 2 && avec.pages.length >= 2, 'il faut au moins deux pages');

    const haut = (page) => Math.min(...page.items.map(i => i.y));
    assert.ok(haut(avec.pages[0]) - haut(sans.pages[0]) > 16,
        'la première page doit descendre de la hauteur du cartouche');
    assert.equal(Math.round(haut(avec.pages[1])), Math.round(haut(sans.pages[1])),
        'la deuxième page part au même endroit dans les deux cas');
});

test('blocs : le cartouche ne pousse rien dans le pied de page', () => {
    // Ce qui doit tenir, c'est le BAS : le cartouche prend de la place en
    // haut, la page en porte une rangée de moins, mais rien ne descend sous
    // la marge basse — sinon la dernière ligne s'imprime dans le pli.
    const exos = [exoCourt('Tables', 200)];
    const limite = A4.h - A4.marge - A4.piedH;
    for (const opts of [{}, { enteteH1: A4.enteteH + 17 }]) {
        const m = composerBlocs(exos, opts, mesurer);
        m.pages.forEach((page, i) => page.items.forEach(it => {
            assert.ok(it.y + (it.h || 0) <= limite + 0.01,
                `page ${i + 1} : un élément descend à ${(it.y + (it.h || 0)).toFixed(1)} mm`);
        }));
    }
});

// LA RÉPONSE VA DANS LE TROU, PAS AU BOUT DE LA LIGNE.
//
// Rémy, sur la décomposition : « tu écris cela : 92 202 =    + 2 000 + 200 + 2
// = 90000 alors qu'il faudrait écrire 92 202 = 90 000 + 2 000 + 200 + 2 et
// souligne la réponse ». Le corrigé donnait une égalité fausse, le trou
// toujours vide et la réponse posée derrière un second signe égal.
test('corrigé : la réponse comble le trou de l\'énoncé', () => {
    const enonce = texteImprime('92 202 = ? + 2 000 + 200 + 2');
    const ligne = reponseEnPlace(enonce, '90 000');
    assert.equal(sansMarques(ligne).replace(/[ \s]+/g, ' ').trim(),
        '92 202 = 90 000 + 2 000 + 200 + 2');
    // Un seul signe égal : c'est une égalité, pas une suite de deux.
    assert.equal((sansMarques(ligne).match(/=/g) || []).length, 1);
    // Et la réponse est marquée, pour être soulignée au rendu.
    assert.deepEqual(morceauxReponse(ligne).filter(m => m.reponse), [{ texte: '90 000', reponse: true }]);
});

test('corrigé : sans trou, la réponse se met au bout', () => {
    const ligne = reponseEnPlace(texteImprime('7 × 8 = ?'), '56');
    assert.equal(sansMarques(ligne), '7 × 8 = 56');
});

test('corrigé : le complément à dix se lit comme une addition entière', () => {
    // « 5 +          = 10 » suivi de « = 5 » ne veut rien dire ; « 5 + 5 = 10 »
    // est ce qu'on écrit au tableau.
    const ligne = reponseEnPlace(texteImprime('5 + ? = 10'), '5');
    assert.equal(sansMarques(ligne).replace(/[ \s]+/g, ' ').trim(), '5 + 5 = 10');
});

test('les marques de réponse ne pèsent rien dans la mesure', () => {
    const nu = couperEnLignes('1. 7 × 8 = 56', 30, 4, mesurer);
    const marque = couperEnLignes(`1. 7 × 8 = ${DEBUT_REP}56${FIN_REP}`, 30, 4, mesurer);
    assert.deepEqual(marque.map(sansMarques), nu, 'le découpage doit être identique');
});

test('corrigé : un trou en queue d\'énoncé survit aussi', () => {
    // « 5 053 = 5 000 + 50 + ? » donnait « 5 000 + 50 + = 3 » : le trou rogné
    // et la réponse derrière un second égal.
    const ligne = reponseEnPlace(texteImprime('5 053 = 5 000 + 50 + ?'), '3');
    assert.equal(sansMarques(ligne).replace(/[ \s]+/g, ' ').trim(), '5 053 = 5 000 + 50 + 3');
});

test('corrigé : un trou en tête d\'énoncé survit aussi', () => {
    const ligne = reponseEnPlace(texteImprime('? × 5 = 40'), '8');
    assert.equal(sansMarques(ligne).replace(/[ \s]+/g, ' ').trim(), '8 × 5 = 40');
});

test('corrigé : une marque orpheline ne s\'imprime jamais', () => {
    // Une réponse longue peut être coupée entre deux lignes : l'ouvrante reste
    // d'un côté, la fermante part de l'autre. Sans nettoyage, le caractère de
    // contrôle sortait tel quel — un rectangle noir au milieu du corrigé.
    const debut = morceauxReponse(`21. 5/7 + 4/7 = ${DEBUT_REP}9`);
    assert.deepEqual(debut, [{ texte: '21. 5/7 + 4/7 = ' }, { texte: '9', reponse: true }]);
    const fin = morceauxReponse(`/7${FIN_REP} exactement`);
    assert.deepEqual(fin, [{ texte: '/7', reponse: true }, { texte: ' exactement' }]);
    // Et dans tous les cas, plus aucune marque dans le texte rendu.
    for (const bout of [...debut, ...fin]) {
        assert.equal(bout.texte, sansMarques(bout.texte));
    }
});

test('corrigé : les fractions se mesurent empilées, pas à la barre oblique', () => {
    const q = Array.from({ length: 8 }, (_, i) => ({
        texte: `${i + 1}/12 ... ${i + 2}/12`, reponse: '<', fractions: true
    }));
    const avec = composerSolutions(q, { mode: 'normal' }, mesurer);
    const sans = composerSolutions(q.map(x => ({ ...x, fractions: false })), { mode: 'normal' }, mesurer);
    assert.equal(avec.opts.fractions, true, 'la feuille doit savoir qu\'elle porte des fractions');
    assert.equal(sans.opts.fractions, false);
    // Une fraction empilée est haute comme deux lignes : le corrigé doit lui
    // laisser plus de place, sinon le numéro 6 s'écrit sur le numéro 7.
    assert.ok(avec.opts.interligne > sans.opts.interligne,
        `interligne ${avec.opts.interligne} contre ${sans.opts.interligne}`);
});

// --- Les pointillés : ni trop courts, ni à perte de vue ----------------------

test('blocs : les pointillés d\'une même ligne ne dépassent pas repMax', () => {
    // Ils couraient jusqu'au bord de la cellule : cinq centimètres de
    // pointillés pour écrire « 42 », et deux colonnes voisines qui se
    // touchent visuellement. Rémy : « un peu moins de pointillés ».
    const { pages, opts } = composerBlocs(
        [{ titre: 'Tables', consigne: '', colonnes: 1,
            questions: Array.from({ length: 4 }, (_, i) => ({ texte: '7 × 8 =', reponse: 56 + i })) }],
        {}, mesurer);
    const qs = pages[0].items.filter(i => i.type === 'q');
    assert.ok(qs.length, 'des questions ont été posées');
    qs.forEach(q => {
        assert.ok(q.rep.w <= opts.repMax + 0.01,
            `pointillés trop longs : ${q.rep.w.toFixed(1)} mm pour un maximum de ${opts.repMax}`);
        assert.ok(q.rep.w >= opts.repMin, 'et assez longs pour y écrire');
    });
});

test('blocs : un énoncé à trou ne se coupe pas en deux lignes', () => {
    // « 660 +  …  = 1 000 » coupé laisse le trou sur la première ligne et le
    // « = 1 000 » sur la seconde : on écrit dans un blanc dont on ne voit plus
    // la consigne. Quatre colonnes demandées, mais l'énoncé n'y tient pas.
    const texte = 'Six cent soixante + ? = mille cinquante-deux';
    const { pages } = composerBlocs(
        [{ titre: 'Compléments', consigne: '', colonnes: 4,
            questions: Array.from({ length: 8 }, () => ({ texte, reponse: 392 })) }],
        {}, mesurer);
    const qs = pages[0].items.filter(i => i.type === 'q');
    const aTrou = qs.filter(q => q.rep && q.rep.dansLeTexte);
    assert.ok(aTrou.length, 'les énoncés portent bien un trou');
    aTrou.forEach(q => assert.equal(q.lignes.length, 1,
        'un énoncé à trou tient sur une ligne — la colonne a été retirée'));
});

// --- LE NUMÉRO, LA FRACTION ET LE POINT D'INTERROGATION ------------------------

test('seul un texte qui porte VRAIMENT une fraction réclame de la hauteur', async () => {
    // Le générateur déclare `fractions: true` dès qu'il PEUT en produire ; la
    // fiche réservait alors la hauteur d'une fraction empilée à chaque
    // question, et le numéro se retrouvait un demi-interligne au-dessus de sa
    // phrase — le décalage vu sur la feuille de problèmes.
    assert.equal(porteUneFraction('Les 3/5 des cartes sont abîmées.'), true);
    assert.equal(porteUneFraction('Adam a 30 timbres bleus et 11 timbres verts.'), false);
    // La réponse compte autant que l'énoncé : le corrigé l'empile aussi.
    assert.equal(porteUneFraction('Simplifie.', '4/6'), true);
    assert.equal(porteUneFraction(null, undefined), false);
});

test('une question posée en toutes lettres reçoit « Réponse : », pas « = »', async () => {
    const { reponseEnPlace } = await import('../js/core/fiche.js');
    const prose = reponseEnPlace('Combien Inès a-t-elle de bonbons en tout ?', '67 bonbons');
    assert.match(prose, /en tout \? Réponse : /);
    assert.ok(!/\? = /.test(prose), '« ? = 67 » n\'est pas du français');
    // Un calcul, lui, garde son signe d'égalité.
    assert.match(reponseEnPlace('7 × 8', '56'), / = /);
});

test('chaque question sait de quel exercice et de quel rang elle vient', async () => {
    // C'est ce qui permet à l'aperçu de désigner LA question sur laquelle on
    // vient de cliquer, pour la retirer ou en retirer une autre au sort. Le
    // numéro imprimé ne suffit pas : il court sur toute la feuille et saute
    // les exercices non numérotés.
    const { composerBlocs } = await import('../js/core/fiche.js');
    const q = (t) => ({ texte: t, reponse: '' });
    const mise = composerBlocs([
        { id: 'alpha', titre: 'A', questions: [q('7 × 8 ='), q('9 × 3 =')] },
        { id: 'beta', titre: 'B', questions: [q('12 + 5 =')] }
    ], { colonnes: 1 }, mesurer);

    const posees = mise.pages.flatMap(p => p.items).filter(i => i.type === 'q');
    assert.equal(posees.length, 3);
    assert.deepEqual(posees.map(i => [i.exoId, i.iQ]),
        [['alpha', 0], ['alpha', 1], ['beta', 0]]);
});

// --- LE TROU EST UN ÉTAGE DE FRACTION ---------------------------------------
//
// Rémy, sur l'égalité à compléter : « après le = tu écris …/9, mais pas en
// colonne : il faut l'écrire en colonne ». Le motif ne connaissait que
// « chiffre / chiffre » ; dans un exercice à trou, un des deux étages est
// justement absent, et la fraction s'imprimait en ligne — dans le seul
// exercice où elle DOIT être en colonne.

test('une fraction à trou est reconnue comme une fraction', () => {
    assert.equal(porteUneFraction('1/5 = ?/15'), true);
    assert.equal(porteUneFraction('3/4 = 9/…'), true);
    assert.equal(porteUneFraction('2/7 = .../21'), true);
    // Et ce qui n'est pas une fraction ne le devient pas.
    assert.equal(porteUneFraction('Combien de billes ?'), false);
    assert.equal(porteUneFraction('Le 12 mars'), false);
    assert.equal(porteUneFraction(''), false);
    assert.equal(porteUneFraction(null), false);
});

test('les deux étages se retrouvent, trou compris', () => {
    const lu = (t) => {
        const out = [];
        t.replace(RE_FRACTION(), (m, a, b) => { out.push(`${a}|${b}`); return m; });
        return out;
    };
    assert.deepEqual(lu('1/5 = ?/15'), ['1|5', '?|15']);
    assert.deepEqual(lu('3/4 = 9/…'), ['3|4', '9|…']);
    assert.deepEqual(lu('… / 9'), ['…|9']);
    assert.deepEqual(lu('12/100 + 5/100'), ['12|100', '5|100']);
});

test('la mesure d\'une fraction à trou reste celle de son étage le plus large', () => {
    const compter = (t) => t.length;
    const mes = mesureurFractions(compter);
    // Un étage empilé n'occupe que la largeur du plus large des deux.
    assert.equal(mes('?/15', 4), compter(' 15 '));
    assert.equal(mes('…/100', 4), compter(' 100 '));
    // Le gain se voit dès que l'étage le plus court fait deux signes :
    // « 15/100 » s'imprime sur la largeur de « 100 », pas des six caractères.
    assert.ok(mes('15/100', 4) < compter('15/100'));
});

// --- Le corrigé ultra compact ------------------------------------------------

import { MODES_SOLUTION, BAREME, DEBUT_PTS, FIN_PTS, sansMarques as sansM } from '../js/core/fiche.js';

test('L\'ULTRA COMPACT NE S\'ÉTALE PAS — c\'est tout son propos', () => {
    // Rémy : « pourquoi pour les réponses, tu passes une ligne entre chaque
    // questions ? » Le blanc n'était pas un interligne, c'était l'ÉQUILIBRAGE :
    // le compact étale ses lignes pour remplir la page — bien quand on projette
    // le corrigé, exactement l'inverse de ce qu'on veut une règle sous la ligne.
    const qs = Array.from({ length: 24 }, (_, i) => ({ texte: `7 × ${i} = ?`, reponse: 7 * i }));
    const ultra = composerSolutions(qs, { mode: 'ultra' }, mesurer);
    const compact = composerSolutions(qs, { mode: 'compact' }, mesurer);
    // Ce qui faisait le blanc, c'est l'INTERLIGNE : cinq millimètres pour du
    // texte de 3,9, l'aération d'un corrigé qu'on projette.
    assert.ok(ultra.opts.interligne < compact.opts.interligne * 0.8,
        `interligne ultra ${ultra.opts.interligne} vs compact ${compact.opts.interligne}`);
    // Et la page en tient davantage : plus de colonnes, plus serrées.
    const parPage = (r) => r.pages[0].blocs.reduce((t, b) => t + b.lignes.length, 0);
    assert.ok(parPage(ultra) >= parPage(compact),
        `l'ultra tient ${parPage(ultra)} lignes par page, le compact ${parPage(compact)}`);
});

test('L\'ULTRA DONNE SIX COLONNES DE RÉPONSES NUES', () => {
    assert.ok(MODES_SOLUTION.includes('ultra'));
    const qs = Array.from({ length: 30 }, (_, i) => ({ texte: `Question ${i}`, reponse: i }));
    const r = composerSolutions(qs, { mode: 'ultra' }, mesurer);
    assert.equal(r.opts.colonnes, 6);
    // Réponse NUE : l'énoncé n'y est pas.
    const lignes = r.pages[0].blocs.flatMap(b => b.lignes).map(sansM);
    assert.ok(lignes.some(l => /^\d+\.\s*\d+$/.test(l.trim())), lignes.slice(0, 3).join(' | '));
    assert.ok(!lignes.some(l => l.includes('Question')), 'l\'énoncé ne doit pas être là');
});

test('LE BARÈME EST MARQUÉ À PART, pour sortir dans une autre couleur', () => {
    // Rémy : « si interrogation le nombre de points (d'une autre couleur) ».
    // Le gras appartient à la RÉPONSE ; « 2 pts » en gras se lirait comme une
    // partie d'elle, et l'on corrigerait un 2 qui n'existe pas.
    assert.equal(sansM(BAREME(2)), ' 2 pts');
    assert.equal(sansM(BAREME(1)), ' 1 pt');
    assert.equal(sansM(BAREME(0.5)), ' 0,5 pt');
    assert.equal(BAREME(0), '', 'sans barème, on n\'écrit rien');
    assert.ok(BAREME(2).includes(DEBUT_PTS) && BAREME(2).includes(FIN_PTS));

    const qs = Array.from({ length: 4 }, (_, i) => ({ texte: `q${i}`, reponse: i }));
    const r = composerSolutions(qs, {
        mode: 'ultra', sections: [{ titre: 'Calcul', questions: qs, points: 6 }]
    }, mesurer);
    const morceaux = r.pages[0].blocs.flatMap(b => b.lignes).flatMap(morceauxReponse);
    const bareme = morceaux.filter(m => m.bareme);
    assert.ok(bareme.length >= 4, `${bareme.length} barèmes marqués sur 4 questions`);
    // 6 points pour 4 questions : 1,5 pt chacune.
    assert.ok(bareme.every(m => m.texte.includes('1,5 pt')), bareme.map(m => m.texte).join(' | '));
    // Et le barème n'est JAMAIS marqué comme la réponse.
    assert.ok(bareme.every(m => !m.reponse), 'un barème passé pour une réponse');
});

test('sans interrogation, l\'ultra n\'invente aucun barème', () => {
    const qs = Array.from({ length: 4 }, (_, i) => ({ texte: `q${i}`, reponse: i }));
    const r = composerSolutions(qs, {
        mode: 'ultra', sections: [{ titre: 'Entraînement', questions: qs }]
    }, mesurer);
    const morceaux = r.pages[0].blocs.flatMap(b => b.lignes).flatMap(morceauxReponse);
    assert.equal(morceaux.filter(m => m.bareme).length, 0);
});
