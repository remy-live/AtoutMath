// POSE LA LOUPE — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après avoir essayé la cascade de loupes : « pour le zoom, il faudrait
// que ce soit l'élève qui pose la loupe et gère le zoom quand il se rend compte
// que ca ne tombe pas encore juste. »
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · IL FAUT VRAIMENT ZOOMER. Si la croix tombait déjà sur une graduation de
//     la droite de départ, la question se résoudrait en se posant — et
//     l'exercice n'enseignerait rien. C'est le défaut le plus facile à écrire
//     sans s'en apercevoir : il suffit d'un dernier chiffre nul.
//   · LA PROFONDEUR CORRESPOND À LA MARCHE. Un zoom donne des centièmes, deux
//     des millièmes ; la troisième marche mêle les deux, et c'est elle qui
//     oblige à REGARDER si la croix est tombée juste.
//   · LA CROIX EST DANS LA DROITE DE DÉPART, et la place qu'on donne au dessin
//     la désigne au bon endroit.
//   · PAS DE FICHE PAPIER, ET C'EST DÉLIBÉRÉ. Une feuille ne zoome pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { poserLaLoupeGenerator as G } from '../js/core/generators/poserLaLoupe.js';

const MARCHES = ['un', 'deux', 'melange'];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`lp-${marche}-${i}`), index: 0, total: 3 });

test('IL FAUT VRAIMENT ZOOMER : la croix ne tombe jamais juste trop tôt', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 40; i++) {
            const it = item(m, i);
            const { valeur, entier, zooms, rang } = it.meta;
            const ou = `${m} #${i} (${valeur})`;
            // LE DERNIER CHIFFRE N'EST JAMAIS ZÉRO. À 8,40, la croix tomberait
            // sur une graduation dès le premier zoom — et à 8,0 elle y serait
            // d'emblée. La question se résoudrait alors en se posant.
            const dernier = Math.round(valeur * Math.pow(10, rang)) % 10;
            assert.notEqual(dernier, 0, `${ou} : le dernier chiffre est nul`);
            // ET LE COMPTE DE ZOOMS EST CELUI QU'IL FAUT : avec `rang`
            // décimales, il faut `rang - 1` zooms depuis la droite des entiers.
            assert.equal(zooms, rang - 1, `${ou} : ${zooms} zoom(s) pour ${rang} décimales`);
            // LA CROIX EST DANS LA DROITE DE DÉPART, bornes exclues.
            assert.ok(valeur > entier && valeur < entier + 1,
                `${ou} : la croix est hors de la droite [${entier} ; ${entier + 1}]`);
        }
    }
});

test('LA PROFONDEUR CORRESPOND À LA MARCHE', () => {
    for (let i = 0; i < 30; i++) {
        assert.equal(item('un', i).meta.zooms, 1, `un #${i} : pas un seul zoom`);
        assert.equal(item('deux', i).meta.zooms, 2, `deux #${i} : pas deux zooms`);
    }
    // ET LA TROISIÈME MÊLE VRAIMENT LES DEUX. C'est elle qui porte l'exercice :
    // on ne sait pas d'avance combien de zooms il faut, donc il faut REGARDER
    // si la croix est tombée juste — mot pour mot ce que Rémy décrit. Une
    // marche « au hasard » qui ne tirerait qu'une profondeur serait un décor,
    // et rien ne le dirait.
    const vus = new Set();
    for (let i = 0; i < 40; i++) vus.add(item('melange', i).meta.zooms);
    assert.deepEqual([...vus].sort(), [1, 2],
        `la marche « mélange » ne tire que ${[...vus].join(' et ')} zoom(s)`);
});

test('LA PLACE DE LA CROIX DÉSIGNE LE BON ENDROIT SUR LE DESSIN', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const { valeur, entier, place, rang } = it.meta;
            const ou = `${m} #${i}`;
            // `place` EST EN DIXIÈMES DE LA DROITE DE DÉPART, de 0 à 10 : c'est
            // ce que le dessin reçoit. Si elle diverge de la valeur, la croix
            // est dessinée ailleurs que là où la réponse l'attend, et personne
            // ne le voit — ni une épreuve, ni un plantage.
            assert.equal(Number(place.toFixed(rang)),
                Number(((valeur - entier) * 10).toFixed(rang)),
                `${ou} : la croix est dessinée à ${place}/10 pour ${valeur}`);
            assert.ok(place > 0 && place < 10, `${ou} : la croix sort du dessin`);
        }
    }
});

test('LA RÉPONSE S’ÉCRIT COMME UN ÉLÈVE L’ÉCRIT', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const ou = `${m} #${i} (${it.answer})`;
            assert.match(it.answer, /^[1-9],\d{2,3}$/, `${ou} : écriture inattendue`);
            assert.ok(!/0$/.test(it.answer), `${ou} : un zéro inutile à la fin`);
            // LE PAVÉ DE L'ACTIVITÉ ENVOIE UNE CHAÎNE : c'est `text` et non
            // `numeric`. Avec `numeric`, c'est le pavé du dépôt qui se monte,
            // et il n'y a plus de droite à toucher.
            assert.equal(it.answerKind, 'text', `${ou} : ce n’est pas la loupe qui répond`);
            assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
        }
    }
});

test('PAS DE FICHE PAPIER, ET C’EST DÉLIBÉRÉ', () => {
    // UNE FEUILLE NE ZOOME PAS. Imprimer cet exercice donnerait un axe et une
    // croix à lire — c'est-à-dire « L'Axe au Centième », qui existe et qui est
    // fait pour ça. Un exercice dont le geste EST l'écran n'a pas de version
    // papier honnête ; en fabriquer une serait imprimer un autre exercice sous
    // son nom.
    //
    // CETTE ÉPREUVE EXISTE PARCE QUE L'OUBLI ET LA DÉCISION SE RESSEMBLENT :
    // sans elle, personne ne saurait, dans six mois, si la fiche manque ou si
    // on l'a refusée.
    assert.equal(G.ecrit, false, 'le générateur promet une fiche papier');
    const it = item('deux', 0);
    assert.ok(!it.prompt.papier,
        `une consigne papier est écrite : « ${it.prompt.papier} »`);
});

test('LE QCM DES DÉFIS PORTE LES FAUTES DE LECTURE', () => {
    let vues = 0;
    const fautes = new Set();
    for (const m of ['un', 'deux']) {
        for (let i = 0; i < 20; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length, `${ou} : deux propositions identiques`);
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            [/un zoom trop tôt/, /partie entière/].forEach((r, k) => {
                if (r.test(pourquoi)) fautes.add(k);
            });
            vues += 1;
        }
    }
    assert.ok(vues >= 40, `seulement ${vues} questions examinées`);
    assert.equal(fautes.size, 2, `seules ${fautes.size} des deux fautes se rencontrent`);
});
