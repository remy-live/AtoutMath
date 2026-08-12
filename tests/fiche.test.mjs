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
    assert.deepEqual(ligne('normal'), ['1. 7 × 8 = 56']);
    // DÉTAILLÉ : l'explication en plus, sur sa propre ligne — c'est la feuille
    // qu'on distribue après le contrôle.
    assert.deepEqual(ligne('detaille'), ['1. 7 × 8 = 56', 'La table de 7 : 7 × 8 = 56.']);
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
    const ligne = (m) => composerSolutions(questions, { mode: m }, mesurer)
        .pages.flatMap(p => p.blocs)[0].lignes[0];
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
    const lignes = mise.pages.flatMap(p => p.blocs).map(b => b.lignes.join(' '));
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
        .filter(b => !b.titre).map(b => b.lignes[0]);

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
