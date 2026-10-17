// LES TROIS ÉCHELLES DE PRIORITÉS SE COCHENT, ET N'ONT PLUS QU'UNE DÉFINITION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faudrait pouvoir faire les check box comme pour le calcul
// littéral ». Un menu à choix unique ne sait dire qu'un barreau ; la colonne
// de cases dit « les trois premiers », « le 2 et le 4 », « le dernier tout
// seul » — et c'est très exactement comment on prépare une séance après une
// leçon.
//
// ET LES BARREAUX VIVAIENT EN TROIS COPIES : deux dans le catalogue — « ligne
// par ligne » et « Prio-Bot Relatifs » — et une dans la feuille papier. Trois
// listes identiques au mot près, et rien pour les tenir d'accord : le jour où
// l'on renomme un barreau, l'écran et la feuille ne disent plus la même chose
// du même travail. Ils sont désormais dans le MOTEUR, à côté des tables de
// formes qu'ils nomment.
//
// CE QUE CETTE ÉPREUVE NE PEUT PAS GARDER : que les questions posées suivent
// vraiment les cases. C'est `tools/echelleCochee.mjs` qui le mesure, et c'est
// le seul vrai risque de cette conversion — un moteur resté sur
// `params.niveau` sert le même barreau seize fois, le réglage a l'air de
// marcher, et rien ne bouge. Mesuré : 1111222233334444 sur seize questions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getExerciseById, paramSchemaOf } from '../js/data/catalog.js';
import { MARCHES_PRIORITES, MARCHES_OPPOSE } from '../js/core/priorites.js';

const TROIS = {
    'calc-prio-cascade': MARCHES_PRIORITES,
    'calc-prio-relatifs': MARCHES_PRIORITES,
    'calc-prio-oppose': MARCHES_OPPOSE
};

for (const [id, attendus] of Object.entries(TROIS)) {
    test(`${id} : UNE ÉCHELLE À COCHER, ET PLUS UN MENU`, () => {
        const schema = paramSchemaOf(getExerciseById(id)) || [];
        const marches = schema.find((p) => p && p.type === 'marches');
        assert.ok(marches, 'le réglage est une colonne de cases');
        assert.deepEqual(marches.marches.map((m) => m.id), attendus.map((m) => m.id));
        // ET PLUS AUCUN MENU DE DIFFICULTÉ : en laisser un à côté des cases
        // donnerait deux réglages pour la même chose, dont un que le moteur
        // ne lit plus — le professeur règlerait le mauvais.
        assert.ok(!schema.some((p) => p && p.echelle && p.type === 'select'),
            'le menu « Difficulté » a bien disparu');
    });
}

test('ET LA LISTE DES BARREAUX N\'EXISTE QU\'À UN SEUL ENDROIT', () => {
    // Trois copies identiques, c'est deux de trop : on garde celle du moteur,
    // à côté des tables de formes qu'elle nomme.
    const catalogue = readFileSync(new URL('../js/data/calcul.js', import.meta.url), 'utf8');
    const fiche = readFileSync(
        new URL('../js/core/generators/prioritesFiche.js', import.meta.url), 'utf8');
    for (const src of [catalogue, fiche]) {
        assert.ok(!src.includes('Deux groupes de parenthèses') || src.includes('MARCHES_PRIORITES'),
            'le nom d\'un barreau ne se réécrit pas hors du moteur');
    }
    assert.match(fiche, /const MARCHES_PRIO = MARCHES_PRIORITES;/);
    assert.match(catalogue, /paramMarches\(\{ marches: MARCHES_PRIORITES/);
    assert.match(catalogue, /paramMarches\(\{ marches: MARCHES_OPPOSE/);
});

test('ET LE JEU PREND SON BARREAU À CHAQUE QUESTION, PAS AU DÉMARRAGE', () => {
    // C'est la moitié qui compte : le réglage peut être parfait et le moteur
    // continuer de lire `params.niveau` une seule fois, au constructeur.
    const jeu = readFileSync(new URL('../js/games/priorites.js', import.meta.url), 'utf8');
    const poser = jeu.slice(jeu.indexOf('    poser() {'));
    assert.match(poser.slice(0, 900),
        /this\.niveau = Number\(marcheAuRang\(this\.poses\+\+, this\.cochees,/,
        'le barreau se choisit dans poser(), question par question');
    // ET ON COMPTE LES QUESTIONS POSÉES, pas les réussies : sinon l'élève qui
    // bute — celui qu'on veut justement voir avancer — piétine sur le premier
    // barreau jusqu'à la fin de la séance.
    assert.match(jeu, /this\.poses\+\+/);
});
