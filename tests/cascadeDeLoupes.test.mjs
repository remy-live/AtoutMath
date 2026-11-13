// LA CASCADE DE LOUPES — sa page « Ordre · Axe », exercice 14.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'EXERCICE REPOSE EN ENTIER SUR UNE PROPRIÉTÉ DU DESSIN, et c'est elle que
// ces épreuves gardent : la croix est LE MÊME POINT sur tous les axes. Si un
// seul étage ne l'encadre pas, la croix se dessine hors de son axe — ou pire,
// dedans mais à la mauvaise place —, et l'élève qui lit correctement trouve une
// réponse que le logiciel refuse. Rien ne plante, rien ne prévient : c'est
// exactement la forme de défaut que ce dépôt a payé le plus cher.
//
// Les autres règles gardées, et pourquoi chacune a été écrite :
//
//   · LA QUESTION EST POSSIBLE. Avec `answerKind: 'choice'`, le pavé laisse la
//     place aux propositions et NE S'AFFICHE PAS : les cases sont dessinées,
//     elles portent leur `data-trou`, et il n'y a aucun moyen d'écrire dedans.
//     Mesuré sur « Graduer un Axe », le même jour.
//   · CHAQUE ÉTAGE AJOUTE UN CHIFFRE AU PRÉCÉDENT. C'est la définition même de
//     l'encadrement qui se resserre : 2 < A < 3, puis 2,7 < A < 2,8. Une borne
//     qui ne commence pas par celle du dessus casse le sens, pas le code.
//   · AUCUN CHIFFRE N'EST NUL. Avec un dixième à zéro, deux cases voisines
//     portent le même nombre et la croix du dernier étage tombe sur le bord
//     gauche de son axe. Voir l'en-tête du générateur.
//   · AUCUNE BORNE NE DÉRIVE. Les bornes se construisent par accumulation ;
//     calculées par soustraction, elles sortent des 2,7299999999 qui
//     s'impriment tels quels sur la feuille.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { cascadeDeLoupesGenerator as G } from '../js/core/generators/cascadeDeLoupes.js';

const MARCHES = [['deux', 2], ['trois', 3], ['quatre', 4]];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`casc-${marche}-${i}`), index: 0, total: 3 });

// Un nombre écrit à la française, comme le générateur et la feuille l'écrivent.
const virgule = (s) => String(s).replace(',', '.');

test('LA QUESTION EST POSSIBLE : une case par étage, et le pavé pour y écrire', () => {
    for (const [m, n] of MARCHES) {
        for (let i = 0; i < 12; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            // QUATRE SOURCES QUI DOIVENT DIRE LE MÊME NOMBRE : les morceaux de
            // la réponse, les `[data-trou]` de l'énoncé, `meta.cases`, et les
            // étages du dessin. Le pavé, lui, COMPTE les trous du HTML.
            assert.equal(String(it.answer).split('|').length, n,
                `${ou} : la réponse n’a pas ${n} morceaux`);
            assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, n,
                `${ou} : il n’y a pas ${n} cases dans l’énoncé`);
            assert.equal(it.meta.cases, n, `${ou} : les cases ne sont pas déclarées`);
            assert.equal(it.meta.etages.length, n, `${ou} : le dessin n’a pas ${n} étages`);
            // LE PAVÉ NE S'AFFICHE QUE SUR `numeric` : avec « choice », les
            // propositions prennent toute la place et l'élève n'a rien pour
            // écrire. La question devient impossible, sans un mot.
            assert.equal(it.answerKind, 'numeric',
                `${ou} : avec « choice », le pavé disparaît derrière les propositions`);
            // ET LA VIRGULE EST SUR LE PAVÉ : sans elle, il n’y a rien à écrire.
            assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
            // LE CORRIGÉ IMPRIMÉ NE MONTRE PAS LA FORME INTERNE.
            assert.ok(!String(it.reponsePapier).includes('|'),
                `${ou} : le corrigé imprime « ${it.reponsePapier} »`);
            // ET L'ÉNONCÉ NE DIT PAS LA RÉPONSE. `prompt.text` portait
            // « (le point vaut 8,2) » — mot pour mot ce que la dernière case
            // demande —, et ce texte-là part dans le journal de l'élève
            // (`itemSession`) et dans la vue en direct du professeur. Le dessin
            // est la question ; un énoncé qui se suffirait sans lui n'en est
            // plus une.
            String(it.answer).split('|').forEach(morceau => {
                assert.ok(!it.prompt.text.includes(morceau),
                    `${ou} : l’énoncé contient « ${morceau} », qui est la réponse`);
            });
        }
    }
});

test('LA CROIX EST LE MÊME POINT SUR TOUS LES AXES', () => {
    for (const [m] of MARCHES) {
        for (let i = 0; i < 25; i++) {
            const it = item(m, i);
            const { etages, valeur } = it.meta;
            etages.forEach((e, k) => {
                const ou = `${m} #${i} étage ${k} [${e.debut} ; ${e.fin}]`;
                // L'AXE ENCADRE LA CROIX, À TOUS LES ÉTAGES. C'est ce que le
                // dessin promet, et c'est ce qui rend la lecture possible :
                // hors de l'intervalle, la croix se place hors de l'axe.
                assert.ok(e.debut <= valeur && valeur <= e.fin,
                    `${ou} : la croix vaut ${valeur} et tombe hors de l’axe`);
                // ET CHAQUE ÉTAGE MESURE DIX FOIS LE SUIVANT : c'est, mot pour
                // mot, « chaque loupe ouvre en dix l'intervalle qui la
                // contient ». Le premier va de 0 à 10, le deuxième mesure 1, le
                // troisième 0,1 — et c'est ce rapport de dix qui rend les crans
                // du dessous lisibles comme les dixièmes de ceux du dessus.
                const large = Number((e.fin - e.debut).toFixed(9));
                assert.equal(large, Number(Math.pow(10, 1 - k).toFixed(9)),
                    `${ou} : l’axe mesure ${large} au lieu de ${Math.pow(10, 1 - k)}`);
                if (k + 1 < etages.length) {
                    const dessous = etages[k + 1];
                    assert.equal(Number((dessous.fin - dessous.debut).toFixed(9)),
                        Number((large / 10).toFixed(9)),
                        `${ou} : la loupe n’ouvre pas en DIX`);
                }
            });
            // LE DERNIER ÉTAGE N'OUVRE RIEN : une loupe sous lui pointerait vers
            // un axe qui n'existe pas.
            assert.equal(etages[etages.length - 1].cran, null,
                `${m} #${i} : le dernier étage ouvre encore une loupe`);
            // ET TOUS LES AUTRES EN OUVRENT UNE, sur un cran qui existe.
            etages.slice(0, -1).forEach((e, k) => {
                assert.ok(Number.isInteger(e.cran) && e.cran >= 0 && e.cran <= 9,
                    `${m} #${i} étage ${k} : la loupe s’ouvre au cran ${e.cran}`);
            });
        }
    }
});

test('CHAQUE ÉTAGE AJOUTE UN CHIFFRE AU PRÉCÉDENT, ET AUCUN N’EST NUL', () => {
    for (const [m, n] of MARCHES) {
        for (let i = 0; i < 25; i++) {
            const it = item(m, i);
            const { bornes, chiffres } = it.meta;
            const ou = `${m} #${i} (${bornes.join(' ; ')})`;
            assert.equal(bornes.length, n, `${ou} : pas ${n} bornes`);
            assert.equal(chiffres.length, n, `${ou} : pas ${n} chiffres`);
            // AUCUN CHIFFRE NUL. Avec un zéro, l'axe du dessous commence là où
            // commence celui du dessus, deux cases voisines portent le même
            // nombre, et la croix du dernier étage tombe sur le bord gauche.
            chiffres.forEach((c, k) => assert.ok(c >= 1 && c <= 9,
                `${ou} : le chiffre du rang ${k} vaut ${c}`));
            for (let k = 1; k < n; k++) {
                // L'ENCADREMENT SE RESSERRE : 2 ; 2,7 ; 2,73. Écrite, la borne
                // du dessous commence donc par celle du dessus — c'est ce que
                // l'élève voit, et c'est ce qu'on lui fait écrire.
                const haut = String(bornes[k - 1]).replace('.', ',');
                const bas = String(bornes[k]).replace('.', ',');
                assert.ok(bas.startsWith(haut),
                    `${ou} : « ${bas} » ne prolonge pas « ${haut} »`);
                assert.ok(bornes[k] > bornes[k - 1],
                    `${ou} : l’étage ${k} ne descend pas`);
            }
            // ET AUCUNE BORNE NE DÉRIVE : au rang k, elle s'écrit avec k
            // décimales, pas 2,7299999999999999.
            bornes.forEach((b, k) => {
                const dec = (virgule(b).split('.')[1] || '').length;
                assert.ok(dec <= k, `${ou} : la borne ${b} a ${dec} décimales au rang ${k}`);
            });
        }
    }
});

test('LES TROIS MARCHES SONT TROIS PROFONDEURS', () => {
    const vus = new Set();
    for (const [m, n] of MARCHES) {
        for (let i = 0; i < 8; i++) {
            const it = item(m, i);
            // L'ORDRE DES ARGUMENTS DE `marcheAuRang` EST (index, marches) ;
            // à l'envers, les trois marches donnent toutes la même, et rien ne
            // le dit. Payé sur « Graduer un Axe » le même jour.
            assert.equal(it.meta.cases, n,
                `${m} #${i} : ${it.meta.cases} étages au lieu de ${n}`);
            vus.add(it.meta.cases);
        }
    }
    assert.equal(vus.size, 3, `les marches ne donnent que ${vus.size} profondeur(s)`);
});

test('LES TROIS FAUTES DE LA CASCADE SONT DANS LES PROPOSITIONS', () => {
    let vues = 0;
    for (const m of ['trois', 'quatre']) {
        for (let i = 0; i < 12; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            // AUCUN DISTRACTEUR NE VAUT LA BONNE RÉPONSE : les fautes se
            // rejoignent parfois d'elles-mêmes, et une proposition en double
            // rend la question injuste.
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length,
                `${ou} : deux propositions identiques`);
            // ET AUCUNE ÉTIQUETTE NE MONTRE LA FORME INTERNE : « 2|2,7 » est ce
            // que le pavé envoie, pas ce qu’un élève lit sur un bouton.
            (it.choices || []).forEach(c => assert.ok(!String(c.label).includes('|'),
                `${ou} : une proposition montre « ${c.label} »`));
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            // LA FAUTE DE LA GRADUATION DE DROITE — celle qui ferme
            // l'encadrement au lieu de l'ouvrir. C'est LA faute de l'exercice.
            assert.match(pourquoi, /DROITE/, `${ou} : la faute de droite n’est pas proposée`);
            // CELLE DE L'ÉLÈVE QUI NE DESCEND PAS, et celle du départ oublié.
            assert.match(pourquoi, /descend pas/, `${ou} : « on ne descend pas » manque`);
            assert.match(pourquoi, /ne repart pas de zéro/, `${ou} : le départ oublié manque`);
            vues += 1;
        }
    }
    assert.ok(vues >= 24, `seulement ${vues} questions examinées`);
});

test('ET LA FEUILLE SAIT QUOI DESSINER', () => {
    // LE RENDU IMPRIMÉ LIT `meta` : les étages avec leurs bouts, leur rang, le
    // cran que chacun ouvre, le point à croiser, et la place que prendra la
    // case. Sans l'un d'eux, la feuille sort des axes vides — ce qui est, mot
    // pour mot, une feuille impossible à faire. C'est arrivé trois fois.
    for (const [m] of MARCHES) {
        const it = item(m, 3);
        for (const clef of ['etages', 'bornes', 'valeur', 'chiffres', 'cases']) {
            assert.ok(it.meta[clef] !== undefined, `${m} : la feuille n’a pas « ${clef} »`);
        }
        it.meta.etages.forEach((e, k) => {
            for (const clef of ['debut', 'fin', 'rang', 'point', 'signes']) {
                assert.ok(e[clef] !== undefined && e[clef] !== null,
                    `${m} étage ${k} : « ${clef} » manque au dessin`);
            }
            // `signes` TAILLE LA CASE : trop court, « 1,672 » déborde sur
            // l'étiquette du bout droit. Mesuré sur la photo, deux fois.
            assert.ok(e.signes >= String(it.meta.bornes[k]).length,
                `${m} étage ${k} : la case est taillée pour ${e.signes} signes`);
        });
        // ET LE PREMIER AXE VA DE 0 À 10 : dix intervalles comme tous les
        // autres, parce que c'est la règle que ce chapitre enseigne.
        assert.equal(it.meta.etages[0].debut, 0);
        assert.equal(it.meta.etages[0].fin, 10);
    }
});
