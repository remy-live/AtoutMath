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

// ─────────────────────────────────────────────────────────────────────────────
//
// DEUXIÈME PASSAGE, ET LA MÊME PHRASE DE RÉMY — « il faudrait que dans les
// premiers niveaux, les calculs soient plus simples (dans les réglages) ».
//
// J'avais corrigé le PLAFOND ; le PLANCHER, lui, venait toujours du contexte.
// MESURÉ sur 80 tableaux par palier, avant ce second passage : au palier
// « moyen », plafonné à 25, TOUTES les cases tombaient entre 20 et 25, parce
// que le contexte déclare `mini: 20`. La bande faisait cinq nombres de large,
// tous à deux chiffres — 72 % des cases —, et un tableau de 22, 21, 24, 23
// n'est pas « des nombres moyens » : c'est une addition en colonne déguisée.
//
// APRÈS : 1 à 25, et 57 % de cases à deux chiffres.

import { TAILLES, plafondVoulu, ENONCES } from '../js/core/tableauCroise.js';

/** La plus grosse case intérieure, et la part de cases à deux chiffres. */
function cases(palier, taille) {
    let max = 0, deux = 0, total = 0;
    for (let i = 0; i < 50; i++) {
        const t = genererTableau({ rng: makeRng(`t${palier}${taille}${i}`), palier, taille });
        for (let r = 0; r < t.R; r++) {
            for (let c = 0; c < t.C; c++) {
                const v = t.valeurs[r][c];
                total++; max = Math.max(max, v);
                if (v >= 10) deux++;
            }
        }
    }
    return { max, part: deux / total };
}

test('LE PLANCHER NE VIENT PLUS DU CONTEXTE', () => {
    // LE DÉFAUT EXACT : « les élèves du collège » déclare `mini: 20`, une
    // plausibilité d'énoncé — pas une difficulté. Plafonné à 25, cela donnait
    // une bande de 20 à 25. Le contexte garde ses mots ; il ne décide plus de
    // la charge de calcul.
    const { bas, haut } = bornesDuTirage({ mini: 20, maxi: 55 }, PALIERS.moyen);
    assert.equal(bas, 1, `la borne basse est ${bas}`);
    assert.equal(haut, 25);
    // Et la bande large se voit sur les tableaux rendus.
    assert.ok(cases('moyen', 'auto').part < 0.65,
        `${Math.round(cases('moyen', 'auto').part * 100)} % de cases à deux chiffres au palier moyen`);
});

test('LE RÉGLAGE DES NOMBRES MORD SUR TOUS LES PALIERS', () => {
    // C'est ce que le palier seul ne permettait pas : un GRAND tableau avec de
    // PETITS nombres, pour l'élève qui apprend la méthode et bute sur
    // l'addition. Et l'inverse, pour celui qui maîtrise la méthode.
    for (const palier of Object.keys(PALIERS)) {
        assert.ok(cases(palier, 'petits').max <= 9,
            `${palier} en « petits » : ${cases(palier, 'petits').max}`);
        assert.ok(cases(palier, 'moyens').max <= 20,
            `${palier} en « moyens » : ${cases(palier, 'moyens').max}`);
    }
    // Y COMPRIS À L'ENVERS : « les nombres de la situation » doit rendre les
    // grands nombres même au palier découverte, dont le plafond est 9.
    assert.ok(cases('decouverte', 'vrais').max > 25,
        `découverte en « vrais » : ${cases('decouverte', 'vrais').max}`);
});

test('« SELON LE NIVEAU » NE CHANGE RIEN', () => {
    // Le réglage ne s'adresse qu'à qui vient le chercher : par défaut, il doit
    // rendre exactement ce que le palier rendait.
    for (const palier of Object.keys(PALIERS)) {
        const a = genererTableau({ rng: makeRng('mem' + palier), palier });
        const b = genererTableau({ rng: makeRng('mem' + palier), palier, taille: 'auto' });
        assert.deepEqual(a.valeurs, b.valeurs, palier);
    }
});

test('ZÉRO N\'EST PAS « JE NE ME PRONONCE PAS »', () => {
    // LA SUBTILITÉ QUI PERMET DE FORCER LES GRANDS NOMBRES SUR UN PETIT
    // PALIER. `null` veut dire « suivre le palier », `0` veut dire « aucun
    // plafond, et c'est un choix ». Confondre les deux ferait retomber
    // « les nombres de la situation » sur le plafond du palier — c'est-à-dire
    // sur le contraire de ce qu'on a demandé.
    assert.equal(TAILLES.auto.plafond, null);
    assert.equal(TAILLES.vrais.plafond, 0);
    assert.equal(plafondVoulu(PALIERS.decouverte, 'auto'), 9);
    assert.equal(plafondVoulu(PALIERS.decouverte, 'vrais'), 0,
        'forcer les vrais nombres doit lever le plafond du palier');
    assert.equal(plafondVoulu(PALIERS.decouverte, 'petits'), 9);
    assert.equal(plafondVoulu(PALIERS.difficile, 'petits'), 9,
        'et en imposer un là où le palier n\'en a pas');
    assert.equal(plafondVoulu(PALIERS.difficile, 'auto'), 0);
    // Un réglage inconnu ne casse pas l'exercice : il suit le palier.
    assert.equal(plafondVoulu(PALIERS.moyen, 'n\'importe quoi'), 25);
});

test('DE PETITS NOMBRES FORCÉS RESTENT PLAUSIBLES', () => {
    // « 3 élèves en sixième B » est un tableau juste et une phrase fausse. Le
    // choix du contexte suit donc le plafond RÉELLEMENT appliqué, et non celui
    // du palier.
    //
    // ON NOMME LA RÈGLE, ET NON UN CONTEXTE. J'avais d'abord écrit « le
    // collège n'apparaît pas » ; `epreuveTombe.mjs` a refusé l'épreuve, et
    // pour une raison que je n'avais pas vue : le collège n'a que deux lignes,
    // il ne peut DE TOUTE FAÇON pas sortir au palier difficile, qui en demande
    // quatre. L'épreuve passait donc avec et sans le défaut. Les contextes qui
    // le mettent vraiment à l'épreuve sont la boulangerie (12) et la cantine
    // (20) — mais les nommer referait la même erreur au prochain contexte
    // ajouté. On vérifie donc la règle elle-même.
    const plafond = plafondVoulu(PALIERS.difficile, 'petits');
    for (let i = 0; i < 60; i++) {
        const t = genererTableau({ rng: makeRng('pl' + i), palier: 'difficile', taille: 'petits' });
        const E = ENONCES.find(e => e.id === t.enonce);
        assert.ok(E, `contexte inconnu : ${t.enonce}`);
        assert.ok(E.mini <= plafond,
            `« ${t.enonce} » compte à partir de ${E.mini} : plafonné à ${plafond}, `
            + 'sa phrase devient fausse');
    }
});

test('L\'ÉTIQUETTE D\'UN PALIER DIT LE PLAFOND QU\'IL APPLIQUE', () => {
    // « Petits nombres » ne se vérifie pas : on choisit, on lance, on regarde,
    // et l'on revient. « Nombres jusqu'à 9 » se décide sans ouvrir l'exercice
    // — et devient FALSIFIABLE, ce qu'une épreuve peut alors garder.
    for (const [cle, P] of Object.entries(PALIERS)) {
        if (!P.plafond) continue;
        assert.match(P.label, new RegExp(`jusqu'à ${P.plafond}\\b`),
            `${cle} annonce « ${P.label} » pour un plafond de ${P.plafond}`);
        assert.equal(cases(cle, 'auto').max, P.plafond,
            `${cle} n'atteint pas le plafond qu'il annonce`);
    }
});
