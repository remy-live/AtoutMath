import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { A4, DEFAUTS, couperEnLignes, composerFiche, composerSolutions } from '../js/core/fiche.js';

// Un mesureur de service : chaque caractère vaut la moitié de la taille. Les
// tests portent sur la mise en page, pas sur les métriques d'une police.
const mesurer = (t, taille) => t.length * taille * 0.5;

test('un texte court tient sur une ligne', () => {
    assert.deepEqual(couperEnLignes('7 × 8 = ?', 100, 4, mesurer), ['7 × 8 = ?']);
});

test('un texte long est coupé aux espaces, sans jamais dépasser', () => {
    const texte = 'Quelle est la partie entière du nombre décimal quatre-vingt-quatre virgule vingt et un ?';
    const lignes = couperEnLignes(texte, 40, 4, mesurer);
    assert.ok(lignes.length > 1, 'il faut bien plusieurs lignes');
    lignes.forEach(l => assert.ok(mesurer(l, 4) <= 40, `« ${l} » déborde`));
    assert.equal(lignes.join(' '), texte, 'aucun mot perdu en route');
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
    assert.equal(blocs[0].lignes[0], '1. 3');
    assert.equal(blocs[11].lignes[0], '12. 36');
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

import { composerBlocs, DEFAUTS_BLOCS } from '../js/core/fiche.js';

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

test('blocs : l\'interrogation laisse de la place pour écrire sous chaque question', () => {
    const { pages, opts } = composerBlocs([exoCourt('A', 6)], { interrogation: true }, mesurer);
    const qs = pages[0].items.filter(i => i.type === 'q');
    qs.forEach(q => {
        assert.ok(q.rep, 'chaque question a sa zone de réponse');
        assert.ok(q.rep.y >= q.y + opts.interligne, 'la réponse est SOUS la question, pas sur sa ligne');
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
        .pages.flatMap(p => p.blocs)[0].lignes;

    // COMPACT : le numéro et la réponse, rien d'autre. C'est la feuille qu'on
    // tient d'une main en corrigeant.
    assert.deepEqual(ligne('compact'), ['1. 56']);
    // NORMAL : l'énoncé rappelé, utile quand on corrige des jours après.
    assert.deepEqual(ligne('normal'), ['1. 7 × 8 → 56']);
    // DÉTAILLÉ : l'explication en plus, sur sa propre ligne — c'est la feuille
    // qu'on distribue après le contrôle.
    assert.deepEqual(ligne('detaille'), ['1. 7 × 8 → 56', 'La table de 7 : 7 × 8 = 56.']);
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

test('le barème par défaut tombe juste sur la note', () => {
    // Cinq exercices très inégaux : dix additions, dix soustractions, puis
    // trois séries de six grilles. Le professeur a dit « sur 20 » : la somme
    // des barèmes doit valoir 20, pas 38.
    const quantites = { add: 10, sub: 10, sudoku: 6, garam: 6, binairo: 6 };
    for (const sur of [7, 10, 20, 40, 100]) {
        const pts = repartirBareme(quantites, sur);
        const somme = Object.values(pts).reduce((s, p) => s + p, 0);
        assert.equal(somme, sur, `barème sur ${sur}`);
        assert.ok(Object.values(pts).every(p => p >= 1), 'aucun exercice à zéro point');
    }
    // Et le partage suit le travail demandé : dix additions valent plus que
    // six grilles.
    const pts = repartirBareme(quantites, 20);
    assert.ok(pts.add > pts.sudoku, 'dix questions pèsent plus que six grilles');
});

test('un exercice à zéro question ne vaut aucun point', () => {
    const pts = repartirBareme({ add: 10, retire: 0 }, 20);
    assert.equal(pts.retire, 0);
    assert.equal(pts.add, 20, 'tout le barème va au seul exercice qui reste');
});

test('plus d\'exercices que de points : un point chacun, sans négatif', () => {
    // Cas dégénéré, mais il ne doit ni boucler ni produire un barème absurde.
    const quantites = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`e${i}`, 4]));
    const pts = repartirBareme(quantites, 5);
    assert.deepEqual([...new Set(Object.values(pts))], [1]);
});

test('sans aucun exercice actif, le barème reste vide', () => {
    assert.deepEqual(repartirBareme({ a: 0, b: 0 }, 20), { a: 0, b: 0 });
    assert.deepEqual(repartirBareme({}, 20), {});
});
