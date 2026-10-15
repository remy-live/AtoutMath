// LES PETITS PROBLÈMES D'ARGENT — ce qui doit tenir pour qu'on les distribue.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « et après tu peux faire des petits problèmes avec calcul », puis
// « Dans la même catégorie que les billets, l'argent et les prix ».
//
// DEUX FAMILLES DE GARDES, ET LA SECONDE SURPREND.
//
// LA PREMIÈRE EST ARITHMÉTIQUE : la réponse doit être celle de l'énoncé, au
// centime près. Tout se compte en centimes dans le générateur, parce que
// 0,1 + 0,2 ne fait pas 0,3 en virgule flottante — et qu'une réponse attendue
// de 2,5999999999999996 compterait faux l'élève qui écrit 2,60.
//
// LA SECONDE EST GRAMMATICALE, et elle garde un défaut qu'on a eu : les
// premiers énoncés écrivaient « UNE trousse coûte » et « Léa […] Combien
// paie-t-il ? ». Un énoncé mal accordé fait trébucher la lecture au moment
// précis où l'on demande de lire avec attention — et dans un problème, c'est
// la lecture qui fait échouer, pas le calcul.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    ARTICLES, PRENOMS, unArticle, majuscule, pluriel, billetPour,
    question, ETAPES, argentProblemesGenerator
} from '../js/core/generators/argentProblemes.js';
import { enEuros } from '../js/core/generators/argent.js';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

const marche = (id) => ETAPES.find(e => e.id === id);
const unItem = (id, g = 'g') => argentProblemesGenerator.generate(
    { marches: [id] }, { rng: makeRng(`${id}-${g}`), index: 0, total: 1 });

/** Toutes les questions d'une marche, sur beaucoup de tirages. */
const toutes = (id, n = 40) => Array.from({ length: n },
    (_, i) => question(marche(id), makeRng(`${id}-t-${i}`)));

test('LA CORRECTION DIT LE MÊME NOMBRE QUE LA RÉPONSE ATTENDUE', () => {
    // UNE EXPLICATION QUI CONTREDIT LA RÉPONSE EST LE PIRE DES DEUX MONDES :
    // l'élève lit « = 2,60 € », a écrit 2,60, et voit « faux ». Le `pourquoi`
    // finit toujours par le résultat ; on le relit et on le compare.
    for (const e of ETAPES) {
        for (const q of toutes(e.id, 30)) {
            if (q.unite !== '€') continue;   // « combien d'articles » ne finit pas par un prix
            // LE DERNIER « = X € » DE LA CORRECTION est le résultat : les
            // deux étapes en portent deux, et c'est le second qui répond.
            const tous = [...q.pourquoi.matchAll(/= *([\d,]+) *€/g)];
            assert.ok(tous.length, `${e.id} : la correction ne dit aucun prix — « ${q.pourquoi} »`);
            const dit = tous[tous.length - 1][1];
            assert.equal(dit.replace(',', '.'), q.reponse.toFixed(2),
                `${e.id} : la correction dit ${dit} et l'on attend ${q.reponse}`);
        }
    }
});

test('AUCUN CENTIME NE SE PERD EN VIRGULE FLOTTANTE', () => {
    // 0,1 + 0,2 ne fait pas 0,3. Si le générateur calculait en euros, une
    // réponse sur cent vaudrait 2,5999999999999996 — et l'élève qui écrit
    // 2,60 serait compté faux sans que personne ne comprenne pourquoi.
    for (const e of ETAPES) {
        for (const q of toutes(e.id, 30)) {
            // ON NE MULTIPLIE PAS PAR CENT POUR LE VÉRIFIER : 4,4 × 100 vaut
            // 440.00000000000006 en virgule flottante, et l'épreuve
            // accuserait le générateur de sa propre faute. Ce qu'on veut
            // savoir est autre chose : la réponse s'écrit-elle EXACTEMENT
            // avec deux décimales ?
            assert.equal(Number(q.reponse.toFixed(2)), q.reponse,
                `${e.id} : la réponse ${q.reponse} ne s'écrit pas en centimes`);
            assert.ok(q.reponse > 0, `${e.id} : une réponse de ${q.reponse} ne demande rien`);
        }
    }
});

test('LE PAVÉ PORTE LA VIRGULE POUR UN PRIX, ET PAS POUR UN COMPTE', () => {
    // UNE VIRGULE PROPOSÉE LÀ OÙ ELLE N'A PAS DE SENS EST UNE INVITATION À LA
    // FAUTE : « combien de gommes peut-elle acheter » n'a jamais 2,5 pour
    // réponse, et la touche ne doit pas être là.
    for (const e of ETAPES) {
        const it = unItem(e.id);
        const prix = it.meta.unite === '€';
        assert.equal(it.meta.decimal, prix,
            `${e.id} : la virgule est ${prix ? 'absente' : 'offerte'} à tort`);
        if (!prix) assert.ok(Number.isInteger(it.answer), `${e.id} : ${it.answer} n'est pas un compte`);
    }
});

test('LA DIVISION TOMBE TOUJOURS JUSTE', () => {
    // ON PART DU PRIX UNITAIRE ET ON MULTIPLIE : c'est la seule façon d'avoir
    // une division exacte à coup sûr. Partir du total et chercher un diviseur
    // donnerait un jour 7,43 € ÷ 3.
    for (const q of toutes('un-seul')) {
        const total = /coûtent ([\d,]+) €/.exec(q.enonce);
        const combien = /^(\d+) /.exec(q.enonce);
        assert.ok(total && combien, `énoncé illisible : « ${q.enonce} »`);
        const c = Math.round(Number(total[1].replace(',', '.')) * 100);
        const n = Number(combien[1]);
        assert.equal(c % n, 0, `${c} centimes ne se partagent pas en ${n}`);
        assert.equal(Math.round(q.reponse * 100), c / n);
    }
});

test('« COMBIEN PUIS-JE EN ACHETER » LAISSE TOUJOURS UN RESTE, ET JAMAIS ASSEZ', () => {
    // SANS RESTE, CE N'EST QU'UNE DIVISION. Avec, il faut s'arrêter AVANT de
    // manquer d'argent — et c'est cela qu'on travaille. Mais le reste ne doit
    // jamais suffire pour un article de plus, sinon la réponse attendue est
    // fausse d'un.
    for (const q of toutes('combien')) {
        const avait = Math.round(Number(/a ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        const prix = Math.round(Number(/coûte ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        assert.equal(q.reponse, Math.floor(avait / prix),
            `${avait} centimes à ${prix} : on en prend ${q.reponse}`);
        const reste = avait - q.reponse * prix;
        assert.ok(reste > 0, 'aucun reste : ce n\'est plus qu\'une division');
        assert.ok(reste < prix, `il reste ${reste} centimes, de quoi en prendre un de plus`);
    }
});

test('« COMBIEN ME MANQUE-T-IL » : IL EN MANQUE VRAIMENT', () => {
    // Un énoncé où l'élève a DÉJÀ assez d'argent rendrait la question absurde,
    // et la réponse serait zéro.
    for (const q of toutes('manque')) {
        const prix = Math.round(Number(/coûte ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        const avait = Math.round(Number(/n'a que ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        assert.ok(avait < prix, `${avait} ≥ ${prix} : il ne manque rien`);
        assert.equal(Math.round(q.reponse * 100), prix - avait);
    }
});

test('LES ÉNONCÉS S\'ACCORDENT AVEC CELUI QUI ACHÈTE', () => {
    // LE DÉFAUT QU'ON A EU, ET QU'ON NE VOIT QU'EN LISANT CE QUI SORT :
    // « Léa achète […] Combien paie-t-il ? », et « UNE trousse coûte » —
    // la mise en majuscules portait sur tout l'article au lieu de sa seule
    // initiale.
    for (const e of ETAPES) {
        for (const q of toutes(e.id, 30)) {
            const texte = `${q.enonce} ${q.question}`;
            const p = PRENOMS.find(x => texte.includes(x.nom));
            if (p) {
                // SEULS LES VERBES DONT LE SUJET EST LA PERSONNE S'ACCORDENT.
                // « Combien lui reste-t-il ? » parle de l'ARGENT, pas d'elle :
                // une première version de cette épreuve criait au défaut sur
                // une phrase parfaitement correcte.
                const mauvais = p.genre === 'f'
                    ? /(paie|peut)-t?-il\b/ : /(paie|peut)-t?-elle\b/;
                assert.ok(!mauvais.test(texte),
                    `${e.id} : « ${p.nom} » est ${p.genre === 'f' ? 'une fille' : 'un garçon'} `
                    + `— « ${texte} »`);
            }
            assert.ok(!/\bUNE? [a-zç]/.test(texte),
                `${e.id} : l'article est tout en majuscules — « ${texte} »`);
            // ET LA QUESTION EST UNE QUESTION : sans point d'interrogation,
            // l'élève ne sait pas où elle s'arrête.
            assert.match(q.question, /\?$/, `${e.id} : « ${q.question} »`);
        }
    }
});

test('LE BILLET TENDU EST LE PLUS PETIT QUI SUFFIT', () => {
    // On ne paie pas un sandwich à 3,60 € avec un billet de 50 €, et la
    // monnaie rendue ne doit pas demander un calcul qui n'est plus celui du
    // chapitre.
    assert.equal(billetPour(360), 500);
    assert.equal(billetPour(500), 500);
    assert.equal(billetPour(650), 1000);
    assert.equal(billetPour(1200), 2000);
    for (const q of toutes('monnaie')) {
        const prix = Math.round(Number(/coûte ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        const bil = Math.round(Number(/billet de ([\d,]+) €/.exec(q.enonce)[1].replace(',', '.')) * 100);
        assert.ok(bil >= prix, `on paie ${prix} avec ${bil}`);
        assert.equal(Math.round(q.reponse * 100), bil - prix);
    }
});

test('LES HUIT MARCHES SE JOUENT, ET CHACUNE DIT SON GESTE', () => {
    for (const e of ETAPES) {
        const it = unItem(e.id);
        assert.equal(it.meta.marche, e.id);
        assert.ok(it.prompt.html.includes('ap-question'), `${e.id} : pas de question détachée`);
        assert.ok(it.prompt.html.includes('ap-situation'), `${e.id} : pas de situation`);
        // LE PREMIER INDICE NE DONNE PAS L'OPÉRATION : un élève à qui l'on dit
        // « c'est une soustraction » ne cherchera plus jamais.
        assert.ok(it.hints[0] && it.hints[0].length > 20, `${e.id} : premier indice vide`);
        assert.ok(!/addition|soustraction|multiplication|division/i.test(it.hints[0]),
            `${e.id} : le premier indice donne l'opération — « ${it.hints[0]} »`);
    }
});

test('LES PRIX SONT DES PRIX, ET LES ARTICLES ONT UN GENRE', () => {
    for (const a of ARTICLES) {
        assert.ok(a.prix > 0 && a.prix < 1000, `${a.nom} coûte ${enEuros(a.prix)} €`);
        assert.ok(a.genre === 'm' || a.genre === 'f', `${a.nom} n'a pas de genre`);
        assert.match(unArticle(a), /^une? /, `${a.nom} : « ${unArticle(a)} »`);
        assert.match(pluriel(a), /s( |$)|x( |$)/, `${a.nom} : le pluriel « ${pluriel(a)} »`);
    }
    assert.equal(majuscule('une gomme'), 'Une gomme');
    assert.equal(majuscule('un cahier'), 'Un cahier');
});

test('L\'EXERCICE EST AU CATALOGUE, AVEC SON PAVÉ', () => {
    const exo = exercices.find(e => e.id === 'num-argent-problemes');
    assert.ok(exo, 'l\'exercice n\'est pas au catalogue');
    assert.equal(exo.generatorId, 'num.argent-problemes');
    assert.equal(exo.activityId, 'numpad');
});
