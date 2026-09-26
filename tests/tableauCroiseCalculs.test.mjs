// « POUR LES TABLEAUX À DOUBLE ENTRÉE, IL FAUT DES CALCULS UN PEU PLUS SIMPLES
// AU DÉBUT » (Rémy).
//
// Le générateur tirait ses nombres dans la fourchette du CONTEXTE, et d'elle
// seule : « les élèves du collège » donne du 25 à 70, quel que soit le palier.
// Le palier « découverte » servait donc les mêmes nombres que le dernier.
//
// MESURÉ sur soixante tableaux par palier, AVANT :
//   découverte  case max  89 · total de ligne max 202 · grand total max 382 · 88 % à 2 chiffres+
//   facile      case max  90 · total max 289 · grand total max 531
//   moyen       case max  90 · total max 300 · grand total max 792
// APRÈS :
//   découverte  case max   9 · total max  26 · grand total max  49 · 45 % à 2 chiffres+
//   facile      case max  12 · total max  45 · grand total max  85
//   moyen       case max  25 · total max  96 · grand total max 280
//   difficile   inchangé (case 90, grand total 994) — c'est là qu'on veut
//               l'addition en colonne, et c'est là que la calculatrice s'éteint.
//
// UN ÉLÈVE DE SIXIÈME QUI DÉCOUVRE LE GESTE additionnait quatre nombres à deux
// chiffres avant d'avoir compris ce qu'il cherchait. Il ratait l'exercice sur
// l'addition, pas sur le tableau — et c'est le tableau qu'on voulait apprendre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { genererTableau, PALIERS, bornesDuTirage } from '../js/core/tableauCroise.js';

/** Le plus gros nombre qu'un palier peut mettre à l'écran, sur 60 tirages. */
function pire(palier) {
    let caseMax = 0, totalMax = 0, grandMax = 0, deuxChiffres = 0, cases = 0;
    const contextes = new Set();
    for (let i = 0; i < 60; i++) {
        const t = genererTableau({ rng: makeRng('m' + palier + i), palier });
        contextes.add(t.enonce);
        t.valeurs.forEach((ligne, r) => ligne.forEach((v, c) => {
            cases++;
            if (v >= 10) deuxChiffres++;
            const dR = r === t.valeurs.length - 1, dC = c === ligne.length - 1;
            if (dR && dC) grandMax = Math.max(grandMax, v);
            else if (dR || dC) totalMax = Math.max(totalMax, v);
            else caseMax = Math.max(caseMax, v);
        }));
    }
    return { caseMax, totalMax, grandMax, contextes: contextes.size,
        partDeuxChiffres: deuxChiffres / cases };
}

test('LES NOMBRES MONTENT AVEC LE PALIER', () => {
    const d = pire('decouverte'), f = pire('facile'), m = pire('moyen'), g = pire('difficile');
    // À la découverte, tout tient sur un chiffre, et le grand total sous
    // cinquante : on peut le vérifier de tête.
    assert.ok(d.caseMax <= 9, `case max à la découverte : ${d.caseMax}`);
    assert.ok(d.grandMax <= 60, `grand total à la découverte : ${d.grandMax}`);
    // Puis ça monte, palier par palier, sans jamais redescendre.
    assert.ok(f.caseMax > d.caseMax && f.caseMax <= 12, `facile : ${f.caseMax}`);
    assert.ok(m.caseMax > f.caseMax && m.caseMax <= 25, `moyen : ${m.caseMax}`);
    assert.ok(g.caseMax > m.caseMax, `difficile : ${g.caseMax}`);
    assert.ok(d.grandMax < f.grandMax && f.grandMax < m.grandMax && m.grandMax < g.grandMax,
        `grands totaux : ${[d, f, m, g].map(x => x.grandMax).join(' < ')}`);
    // Et la charge de lecture suit : moins de nombres à deux chiffres au début.
    assert.ok(d.partDeuxChiffres < 0.6,
        `${Math.round(d.partDeuxChiffres * 100)} % de cases à deux chiffres à la découverte`);
});

test('LE DERNIER PALIER GARDE SES GRANDS NOMBRES', () => {
    // C'est là qu'on veut l'addition en colonne — et c'est là, justement, que
    // la calculatrice s'éteint. Lui plafonner les nombres viderait le palier.
    assert.equal(PALIERS.difficile.plafond, undefined);
    assert.equal(PALIERS.difficile.calculatrice, false);
    assert.equal(PALIERS.decouverte.calculatrice, true);
});

test('UN PLAFOND NE FAIT PAS UN TABLEAU DE DEUX VALEURS', () => {
    // Un contexte qui commence à 8, plafonné à 9, donnerait « entre 8 et 9 » :
    // plus simple, oui, mais plus un tableau de données. On garde un écart.
    for (const cle of Object.keys(PALIERS)) {
        const P = PALIERS[cle];
        for (const E of [{ mini: 8, maxi: 45 }, { mini: 25, maxi: 70 }, { mini: 2, maxi: 14 }]) {
            const { bas, haut } = bornesDuTirage(E, P);
            assert.ok(bas >= 1, `borne basse ${bas}`);
            assert.ok(haut - bas >= 5, `${cle} sur ${E.mini}-${E.maxi} : ${bas}-${haut}`);
            assert.ok(haut <= E.maxi, 'le plafond ne doit pas dépasser le contexte');
        }
    }
});

test('LES PETITS NOMBRES RESTENT PLAUSIBLES', () => {
    // Plafonner « les élèves du collège » à neuf donnerait « 4 élèves en
    // sixième » : un tableau juste et une phrase fausse. Aux premiers paliers
    // on choisit donc des contextes qui comptent naturellement peu.
    const d = pire('decouverte');
    assert.ok(d.contextes >= 6, `seulement ${d.contextes} contextes à la découverte`);
    for (let i = 0; i < 40; i++) {
        const t = genererTableau({ rng: makeRng('p' + i), palier: 'decouverte' });
        assert.notEqual(t.enonce, 'college',
            'le collège compte ses élèves par dizaines : il n\'a pas sa place ici');
    }
});

test('ET LES LIBELLÉS NE SE RECOPIENT PLUS', async () => {
    // Deux listes jumelles finissent toujours par se contredire : l'écran
    // promettait « peu de trous » là où le noyau avait changé les nombres.
    const { exercices } = await import('../js/data/catalog.js');
    const exo = exercices.find(e => e.id === 'don-tableau-croise');
    const options = exo.paramSchema.find(p => p.id === 'palier').options;
    assert.deepEqual(options.map(o => o.value), Object.keys(PALIERS));
    options.forEach(o => assert.equal(o.label, PALIERS[o.value].label, o.value));
});
