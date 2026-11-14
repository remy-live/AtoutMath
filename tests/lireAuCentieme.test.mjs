// L'AXE AU CENTIÈME — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après avoir essayé la cascade de loupes : « Cascade de loupe, on
// comprend pas trop en fait », et ce qu'il voulait à la place :
//
// > « un axe qui va de 8 à 9 donc 10 séparations et entre chaque dixième encore
// > dix séparations (avec un trait rouge pour les milieux) et on place un point
// > et il faut lire, il faut évidemment qu'il y ait de la place en largeur »
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · LA CROIX TOMBE SUR UNE GRADUATION. Le dessin place la croix au cran
//     `meta.cran` ; la réponse se calcule depuis `debut` et `cran`. Si les deux
//     divergent, le dessin montre un point et la correction en attend un autre
//     — et rien ne plante.
//   · LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE, et non trois tailles de
//     nombre. C'est ce qui rend la progression vraie : ce qui coûte, ici, c'est
//     le nombre de petits traits à compter.
//   · LA RÉPONSE EST UN NOMBRE À DEUX DÉCIMALES AU PLUS, écrit à la française,
//     et jamais avec un zéro de tête.
//   · LES TROIS FAUTES DE LA LECTURE sont nommées dans les propositions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { lireAuCentiemeGenerator as G } from '../js/core/generators/lireAuCentieme.js';

const MARCHES = ['reperes', 'cote', 'entre'];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`cent-${marche}-${i}`), index: 0, total: 3 });

test('LA CROIX TOMBE EXACTEMENT SUR LA GRADUATION QU’ON FAIT LIRE', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 40; i++) {
            const it = item(m, i);
            const { debut, cran, valeur } = it.meta;
            const ou = `${m} #${i}`;
            // LE DESSIN PLACE LA CROIX AU CRAN `cran` ; la réponse dit `valeur`.
            // Les deux doivent désigner le MÊME point, sinon l'élève lit juste
            // et le logiciel lui dit qu'il a faux.
            assert.equal(Number((debut + cran / 100).toFixed(2)), valeur,
                `${ou} : la croix est au cran ${cran} de ${debut}, mais on attend ${valeur}`);
            assert.equal(it.answer, String(valeur).replace('.', ','),
                `${ou} : la réponse « ${it.answer} » ne dit pas ${valeur}`);
            // ET LE CRAN EST DANS L'AXE, bornes exclues : au cran 0 ou 100 la
            // croix serait posée sur un nombre déjà écrit, et il n'y aurait
            // rien à lire.
            assert.ok(cran >= 1 && cran <= 99, `${ou} : le cran ${cran} est sur un bout`);
        }
    }
});

test('LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE', () => {
    // UN REPÈRE EST UN GRAND TRAIT (multiple de 10) OU LE TRAIT ROUGE DU MILIEU
    // (multiple de 5). C'est en traits à compter que la difficulté se mesure
    // ici, pas en taille de nombre — un 8,47 et un 2,47 coûtent le même effort.
    const distance = (c) => Math.min(c % 5, 5 - (c % 5));

    for (let i = 0; i < 40; i++) {
        assert.equal(item('reperes', i).meta.cran % 5, 0,
            `reperes #${i} : la croix n’est pas sur un repère`);
    }
    // ENTRE DEUX REPÈRES IL N'Y A QUE QUATRE PETITS TRAITS, donc aucun
    // centième n'est à plus de DEUX traits d'un repère. C'est ce compte qui a
    // corrigé la progression : les marches « à un ou deux traits » et
    // « n'importe où » demandaient le MÊME travail, et cette épreuve l'a dit en
    // refusant de trouver un seul cas plus difficile sur quarante tirages. Une
    // marche qui n'est pas plus dure que la précédente est un décor.
    for (let i = 0; i < 40; i++) {
        const c = item('cote', i).meta.cran;
        assert.equal(distance(c), 1,
            `cote #${i} : le cran ${c} est à ${distance(c)} traits d’un repère, pas 1`);
    }
    for (let i = 0; i < 40; i++) {
        const c = item('entre', i).meta.cran;
        assert.equal(distance(c), 2,
            `entre #${i} : le cran ${c} est à ${distance(c)} traits d’un repère, pas 2`);
    }
});

test('LA RÉPONSE S’ÉCRIT COMME UN ÉLÈVE L’ÉCRIT', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const ou = `${m} #${i} (${it.answer})`;
            // VIRGULE ET NON POINT, deux décimales au plus, pas de zéro inutile
            // à la fin — « 8,50 » se tape « 8,5 » et serait refusé.
            assert.match(it.answer, /^[1-9],?\d{0,2}$/, `${ou} : écriture inattendue`);
            assert.ok(!it.answer.includes('.'), `${ou} : un point décimal`);
            assert.ok(!/,\d*0$/.test(it.answer), `${ou} : un zéro inutile à la fin`);
            // ET LA PARTIE ENTIÈRE N'EST JAMAIS ZÉRO : un axe de 0 à 1 ferait
            // écrire « 0,47 », où le zéro de tête est un piège d'écriture qui
            // n'a rien à voir avec la lecture d'une graduation.
            assert.ok(it.meta.debut >= 1 && it.meta.debut <= 9,
                `${ou} : l’axe part de ${it.meta.debut}`);
            // LA VIRGULE EST AU PAVÉ, sans quoi il n’y a rien à écrire.
            assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
            assert.equal(it.answerKind, 'numeric', `${ou} : ce n’est pas le pavé qui répond`);
        }
    }
});

test('LES TROIS FAUTES DE LA LECTURE SONT NOMMÉES', () => {
    let vues = 0;
    const fautes = new Set();
    for (const m of ['cote', 'entre']) {
        for (let i = 0; i < 20; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length, `${ou} : deux propositions identiques`);
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            [/arrêté au\s+dixième|arrêté au dixième/, /partant de la DROITE/, /part\s+de \d/]
                .forEach((r, k) => { if (r.test(pourquoi)) fautes.add(k); });
            assert.ok((it.choices || []).some(c => c.why),
                `${ou} : aucune proposition n’explique ce qu’elle incarne`);
            vues += 1;
        }
    }
    assert.ok(vues >= 40, `seulement ${vues} questions examinées`);
    // LES TROIS SE RENCONTRENT SUR L'ENSEMBLE. On n'exige pas les trois à
    // chaque question : une faute qui donne la bonne réponse est supprimée, et
    // c'est normal — à 8,40 par exemple, « s'arrêter au dixième » donne juste.
    assert.equal(fautes.size, 3, `seules ${fautes.size} des trois fautes se rencontrent`);
});

test('ET LA FEUILLE SAIT QUOI DESSINER', () => {
    // LE RENDU IMPRIMÉ LIT `meta` : le départ de l'axe et le cran où poser la
    // croix. Sans l'un d'eux, la feuille sort des droites sans croix — ce qui
    // est, mot pour mot, une feuille impossible à faire. C'est arrivé trois
    // fois.
    for (const m of MARCHES) {
        const it = item(m, 5);
        for (const clef of ['debut', 'cran', 'valeur', 'decimal', 'marche']) {
            assert.ok(it.meta[clef] !== undefined, `${m} : la feuille n’a pas « ${clef} »`);
        }
        assert.equal(it.reponsePapier, it.answer,
            `${m} : le corrigé imprimé ne dit pas la réponse`);
        // ET L'ÉNONCÉ NOMME LES DEUX BOUTS : sur un écran étroit la figure
        // glisse dans sa boîte, et les deux nombres peuvent se trouver hors du
        // cadre au moment où l'on regarde la croix.
        assert.ok(it.prompt.text.includes(String(it.meta.debut))
            && it.prompt.text.includes(String(it.meta.debut + 1)),
        `${m} : l’énoncé « ${it.prompt.text} » ne nomme pas les deux bouts`);
    }
});
