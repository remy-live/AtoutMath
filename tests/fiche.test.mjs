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
    const q = [{ texte: 'x', reponse: 1 }];
    assert.equal(composerFiche(q, { colonnes: 9 }, mesurer).colonnes, 3);
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
