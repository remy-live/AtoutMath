// STATISTIQUES ET PROBABILITÉS — les deux chapitres qui manquaient.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Statistique (Médiane, moyenne, étendue,
// fréquence: listes) » et « Probabilités ». Mesuré avant d'écrire une ligne :
// zéro exercice sur 238 pour l'un comme pour l'autre. Puis, sur sa liste de
// travail : « bloc 17-18-10-12-7-15 » — ces deux-là en tête.
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LES NOMBRES JUSTES, recalculés depuis l'ÉNONCÉ et non relus dans la
//      réponse du générateur. Une statistique fausse compte faux un élève qui
//      a raison, et il n'a aucun moyen de le savoir.
//   2. LA MOYENNE QUI TOMBE JUSTE. Elle est construite, pas tirée — et si la
//      construction se cassait, on obtiendrait 12,857142… sans qu'aucun calcul
//      ne devienne faux pour autant.
//   3. AUCUNE FRACTION DE PROBABILITÉ NE SE SIMPLIFIE. C'est LA décision du
//      chapitre : 3/6 et 1/2 sont tous les deux justes, un logiciel doit en
//      choisir un, et quel que soit son choix la moitié des élèves qui ont
//      raison seraient comptés faux. On fabrique donc les situations pour que
//      la question n'ait qu'une seule écriture possible. Rien dans le code ne
//      le rappelle au moment où l'on ajoute une situation : c'est cette
//      épreuve, et elle seule, qui tient la promesse.
//   4. LES DEUX PIÈGES DE LA MÉDIANE, chacun sur sa marche — la série qu'il
//      faut ranger, et la série paire dont la médiane n'est pas dedans.
//   5. DES ÉNONCÉS QUI SE LISENT. Mesuré sur la sortie : « Combien de élèves »,
//      « 10 zones TOUS DE MÊME TAILLE », « c'est tirer l'boule jaune », et une
//      note de 31 sur 20.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    moyenne, mediane, etendue, effectif, frequence, rangee,
    tableauDEffectifs, serieDeMoyenne, enFrancais
} from '../js/core/statistiques.js';
import { pgcd } from '../js/core/arithmetique.js';
import {
    statistiquesGenerator as ST, ETAPES as ETAPES_ST
} from '../js/core/generators/statistiques.js';
import {
    probabilitesGenerator as PR, ETAPES as ETAPES_PR
} from '../js/core/generators/probabilites.js';

// ────────────────────────────────────────── LE NOYAU ────────────────────────

test('LES QUATRE RÉSUMÉS SONT JUSTES, Y COMPRIS AUX BORDS', () => {
    assert.equal(moyenne([10, 12, 14]), 12);
    assert.equal(moyenne([5]), 5);
    assert.equal(moyenne([]), null);
    // UNE MOYENNE N'EST PAS ARRONDIE ICI : c'est l'appelant qui décide, et le
    // générateur, lui, choisit des séries où elle tombe juste.
    assert.ok(Math.abs(moyenne([1, 2]) - 1.5) < 1e-12);

    assert.equal(etendue([8, 15, 11]), 7);
    assert.equal(etendue([4, 4, 4]), 0, 'une série constante a une étendue nulle');
    assert.equal(etendue([]), null);

    assert.equal(effectif([3, 7, 3, 3], 3), 3);
    assert.equal(effectif([3, 7], 5), 0);

    assert.equal(frequence([1, 1, 2, 2], 1), 50);
    // `null` ET NON ZÉRO sur une série vide : zéro est une fréquence possible
    // (« aucun élève n'a eu 20 »), et la confondre avec « on ne sait pas »
    // ferait écrire « 0 % » sous un tableau sans données.
    assert.equal(frequence([], 1), null);
    assert.equal(frequence([1, 2], 9), 0);
});

test('LA MÉDIANE RANGE D\'ABORD, ET SAIT COMPTER PAIR', () => {
    // LE PIÈGE NUMÉRO UN. La médiane de 7 ; 2 ; 9 vaut 7, pas 2 : prendre le
    // terme du milieu de la liste telle qu'elle est écrite rend un nombre de
    // la série, donc un nombre qui a l'air juste.
    assert.equal(mediane([7, 2, 9]), 7);
    assert.equal(mediane([2, 7, 9]), 7, 'la médiane ne dépend pas de l\'ordre d\'écriture');

    // LE PIÈGE NUMÉRO DEUX. Sur une série paire, la médiane n'est pas dans la
    // série.
    assert.equal(mediane([10, 11, 12, 13]), 11.5);
    assert.ok(![10, 11, 12, 13].includes(mediane([10, 11, 12, 13])));
    assert.equal(mediane([1, 2, 3, 4, 5, 6]), 3.5);
    assert.equal(mediane([5]), 5);
    assert.equal(mediane([]), null);

    // ET ELLE NE TOUCHE PAS À LA SÉRIE DE L'APPELANT : trier sur place
    // changerait l'énoncé qu'il vient d'écrire, et « range cette série »
    // deviendrait déjà rangée.
    const serie = [7, 2, 9];
    mediane(serie);
    rangee(serie);
    assert.deepEqual(serie, [7, 2, 9], 'la série a été triée sur place');
});

test('LE TABLEAU D\'EFFECTIFS COMPTE TOUT, ET DANS L\'ORDRE', () => {
    assert.deepEqual(tableauDEffectifs([3, 1, 3, 2, 3]), [
        { valeur: 1, effectif: 1 }, { valeur: 2, effectif: 1 }, { valeur: 3, effectif: 3 }
    ]);
    const t = tableauDEffectifs([5, 5, 7]);
    assert.equal(t.reduce((s, x) => s + x.effectif, 0), 3,
        'la somme des effectifs doit valoir la taille de la série');
});

test('UNE SÉRIE FABRIQUÉE A EXACTEMENT LA MOYENNE DEMANDÉE', () => {
    // ON PART DE LA RÉPONSE, et c'est tout l'intérêt : tirer n nombres au
    // hasard donne une moyenne entière une fois sur n. Si cette construction
    // se cassait, aucun calcul ne deviendrait faux — on obtiendrait seulement
    // 12,857142… sous une question qui attend un entier, et l'élève qui
    // calcule juste serait compté faux.
    for (let k = 0; k < 200; k++) {
        const rng = makeRng('serie' + k);
        const n = rng.int(4, 9);
        const m = rng.int(10, 60);
        const serie = serieDeMoyenne(m, n, (a, b) => rng.int(a, b), 5);
        assert.equal(serie.length, n, 'la série n\'a pas la bonne taille');
        assert.ok(serie.every(Number.isInteger), `des valeurs non entières : ${serie}`);
        assert.ok(serie.every(x => x >= 0), `une valeur négative : ${serie}`);
        // ET TOUTES LES VALEURS TIENNENT DANS L'ÉCART DEMANDÉ, la dernière
        // comprise. C'est elle qui rattrape la somme, et laissée libre elle
        // sortait de la plage : « 10 ; 9 ; 8 ; 9 ; 9 ; 13 ; 26 » sous une
        // phrase annonçant des notes sur 20. La moyenne était juste, tous les
        // calculs étaient justes, et la série était impossible.
        assert.ok(serie.every(x => Math.abs(x - m) <= 5),
            `une valeur hors de l'écart demandé : ${serie} autour de ${m}`);
        // Le relèvement des valeurs négatives DÉPLACE la moyenne, et c'est
        // documenté : on vérifie donc qu'elle est entière, pas qu'elle vaut m.
        assert.ok(Number.isInteger(moyenne(serie)),
            `moyenne non entière : ${serie} → ${moyenne(serie)}`);
    }
});

test('UN NOMBRE S\'ÉCRIT EN FRANÇAIS, AVEC SA VIRGULE', () => {
    // « 11.5 » sorti d'un calcul JavaScript est une écriture anglaise au milieu
    // d'un énoncé français.
    assert.equal(enFrancais(11.5), '11,5');
    assert.equal(enFrancais(12), '12', 'on ne garde pas les décimales inutiles');
    assert.equal(enFrancais(0.1), '0,1');
    assert.equal(enFrancais(null), '');
});

// ──────────────────────────── CE QUE LES EXERCICES DONNENT ──────────────────

/** Les nombres d'un énoncé, dans l'ordre où ils y sont écrits. */
const nombresDe = (texte) => (texte.match(/-?\d+(?:,\d+)?/g) || [])
    .map(v => Number(v.replace(',', '.')));

test('TOUTES LES MARCHES DE STATISTIQUES RÉPONDENT JUSTE', () => {
    // ON NE RELIT PAS LA RÉPONSE DU GÉNÉRATEUR : on recalcule depuis la série
    // écrite dans l'énoncé, comme le ferait un élève.
    for (const e of ETAPES_ST) {
        for (let k = 0; k < 40; k++) {
            const it = ST.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 40 });
            assert.ok(it.prompt.text.length > 20, `${e.id} : énoncé vide`);
            assert.ok(it.answer !== undefined && it.answer !== null && it.answer !== '',
                `${e.id} : pas de réponse`);
            assert.equal(it.meta.marche, e.id);
            const serie = it.meta.serie;

            if (e.id === 'etendue') {
                assert.equal(Number(it.answer), etendue(serie), `${serie}`);
            }
            if (e.id === 'moyenne') {
                assert.equal(Number(it.answer), moyenne(serie), `${serie}`);
                assert.ok(Number.isInteger(Number(it.answer)),
                    `moyenne non entière demandée : ${serie} → ${it.answer}`);
            }
            if (e.id.startsWith('mediane')) {
                assert.equal(Number(it.answer), mediane(serie), `${serie}`);
            }
            if (e.id === 'effectif') {
                // La valeur cherchée est le dernier nombre de la question.
                const question = it.prompt.text.split('Combien').pop();
                const valeur = nombresDe(question)[0];
                assert.equal(Number(it.answer), effectif(serie, valeur),
                    `${serie} · valeur ${valeur}`);
                assert.ok(Number(it.answer) >= 2,
                    `${e.id} : effectif de ${it.answer}, la question n'apprend rien`);
            }
            if (e.id === 'frequence') {
                assert.ok([10, 20].includes(serie.length),
                    `${serie.length} valeurs : la fréquence ne tombera pas juste, `
                    + 'ou la série sera illisible');
                assert.ok(Number.isInteger(Number(it.answer)),
                    `fréquence non entière : ${it.answer} %`);
                assert.ok(Number(it.answer) > 0 && Number(it.answer) < 100,
                    `fréquence de ${it.answer} % : la question n'a pas de sens`);
            }
            if (e.id === 'moyenne-manquante') {
                // L'ÉNONCÉ DONNE LA MOYENNE ET LES AUTRES VALEURS : on refait
                // le chemin complet. C'est la seule marche où la réponse n'est
                // pas lisible dans la série.
                assert.equal(moyenne(serie), nombresDe(it.prompt.text)[1],
                    `la moyenne annoncée n'est pas celle de la série : ${serie}`);
                assert.ok(serie.includes(Number(it.answer)));
            }
        }
    }
});

test('LES DEUX PIÈGES DE LA MÉDIANE SONT CHACUN SUR SA MARCHE', () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // C'est la raison d'être de trois marches au lieu d'une. Si elles se
    // mettaient à donner la même chose, l'exercice resterait entièrement JUSTE
    // — toutes les médianes seraient bonnes — et il n'enseignerait plus qu'un
    // seul des deux pièges, sans que rien ne le dise.
    let rangees = 0, desordres = 0;
    for (let k = 0; k < 40; k++) {
        const triee = ST.generate({ marches: ['mediane-rangee'] },
            { rng: makeRng('tri' + k), index: k, total: 40 });
        const serie = triee.meta.serie;
        assert.deepEqual(serie, rangee(serie),
            `la marche « série rangée » donne une série en désordre : ${serie}`);
        assert.ok(serie.length % 2 === 1, `${serie.length} valeurs : la série doit être impaire`);
        rangees++;

        const melee = ST.generate({ marches: ['mediane-desordre'] },
            { rng: makeRng('des' + k), index: k, total: 40 });
        if (JSON.stringify(melee.meta.serie) !== JSON.stringify(rangee(melee.meta.serie))) {
            desordres++;
        }

        // LA SÉRIE PAIRE : deux valeurs au milieu, et elles DIFFÈRENT.
        //
        // Vu sur la sortie : « DEUX au milieu : 12 et 12 ». La correction est
        // juste et elle n'enseigne rien — la médiane retombe sur une valeur de
        // la série, c'est-à-dire sur l'idée fausse que cette marche existe
        // pour défaire.
        const paire = ST.generate({ marches: ['mediane-paire'] },
            { rng: makeRng('pair' + k), index: k, total: 40 });
        const tri = rangee(paire.meta.serie);
        assert.equal(tri.length % 2, 0, `${tri.length} valeurs : la série doit être paire`);
        assert.notEqual(tri[tri.length / 2 - 1], tri[tri.length / 2],
            `les deux valeurs du milieu sont égales : ${tri}`);
    }
    assert.equal(rangees, 40);
    // Le désordre est tiré : on n'exige pas qu'il tombe à tous les coups, mais
    // qu'il tombe la plupart du temps. À zéro, la marche serait un doublon.
    assert.ok(desordres >= 30,
        `${desordres} séries en désordre sur 40 : la marche ne travaille plus le rangement`);
});

test('AUCUNE PROBABILITÉ NE SE SIMPLIFIE — c\'est la décision du chapitre', () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // La probabilité d'obtenir un nombre pair avec un dé vaut 3/6, et vaut
    // aussi 1/2. Les deux écritures sont justes, un professeur accepte les
    // deux — et un logiciel doit en choisir UNE. Quel que soit son choix, la
    // moitié des élèves qui ont raison seraient comptés faux.
    //
    // ON FABRIQUE DONC LES SITUATIONS POUR QUE LA FRACTION SOIT DÉJÀ
    // IRRÉDUCTIBLE. Rien dans le code ne le rappelle au moment où l'on ajoute
    // une couleur ou une roue : c'est cette épreuve, et elle seule, qui tient
    // la promesse.
    for (const marche of ['sac', 'roue', 'pas-cette-couleur']) {
        for (let k = 0; k < 60; k++) {
            const it = PR.generate({ marches: [marche] },
                { rng: makeRng(`irr-${marche}-${k}`), index: k, total: 60 });
            const [num, den] = String(it.answer).split('|').map(Number);
            assert.ok(Number.isInteger(num) && Number.isInteger(den),
                `${marche} : réponse « ${it.answer} »`);
            assert.ok(num > 0 && den > num,
                `${marche} : ${num}/${den} — une probabilité est entre 0 et 1, exclus ici`);
            assert.equal(pgcd(num, den), 1,
                `${marche} : ${num}/${den} se simplifie — deux écritures seraient justes, `
                + 'et l\'élève qui choisit l\'autre serait compté faux');

            // ET LE DÉNOMINATEUR EST LE TOTAL, jamais le nombre d'objets de
            // l'autre couleur. C'est LA faute du chapitre : « 3 rouges et 5
            // bleues » donne 3/5 au lieu de 3/8.
            //
            // ON TRIE LES TROIS NOMBRES AU LIEU DE LES LIRE EN PLACE : le sac
            // annonce « 5 rouges et 4 bleues, soit 9 EN TOUT » et la roue
            // « partagée en 12 zones : 7 blanches et 5 grises ». Les deux
            // disent la même chose dans un ordre différent, et une épreuve qui
            // lit la position tombe sur la seconde en croyant avoir trouvé un
            // défaut. Le total est le plus grand des trois — les deux parts
            // sont positives.
            const trois = nombresDe(it.prompt.text).slice(0, 3).sort((x, y) => x - y);
            assert.equal(trois[0] + trois[1], trois[2],
                `${marche} : le total annoncé ne vaut pas la somme des deux couleurs — `
                + `« ${it.prompt.text} »`);
            assert.equal(trois[2], den,
                `${marche} : le dénominateur ${den} n'est pas le total annoncé`);

            // AUTANT DE CASES QUE DE NOMBRES À DONNER : une réponse « 3|8 » ne
            // fabrique pas deux champs toute seule, le pavé compte les
            // `[data-trou]` que l'énoncé déclare.
            assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, 2,
                `${marche} : la fraction n'a pas ses deux cases`);
            assert.equal(it.meta.cases, 2);
        }
    }
});

test('TOUTES LES MARCHES DE PROBABILITÉS RÉPONDENT JUSTE', () => {
    for (const e of ETAPES_PR) {
        for (let k = 0; k < 40; k++) {
            const it = PR.generate({ marches: [e.id] },
                { rng: makeRng(`p-${e.id}-${k}`), index: k, total: 40 });
            assert.ok(it.prompt.text.length > 15, `${e.id} : énoncé vide`);
            assert.equal(it.meta.marche, e.id);

            if (e.id === 'echelle') {
                // EXACTEMENT UNE des quatre valeurs sort de [0 ; 1] — sans quoi
                // la question a plusieurs bonnes réponses, ou aucune.
                const valeurs = it.choices.map(c => Number(String(c.value).replace(',', '.')
                    .replace('−', '-')));
                const dehors = valeurs.filter(v => v < 0 || v > 1);
                assert.equal(dehors.length, 1,
                    `${dehors.length} valeurs hors de [0 ; 1] : ${valeurs}`);
                const juste = it.choices.find(c => c.correct);
                assert.equal(Number(String(juste.value).replace(',', '.').replace('−', '-')),
                    dehors[0], 'la bonne réponse n\'est pas celle qui sort de l\'intervalle');
            }
            if (e.id === 'contraire') {
                const p = nombresDe(it.prompt.text)[0];
                assert.ok(Math.abs(Number(it.answer) + p - 1) < 1e-9,
                    `${p} et ${it.answer} ne font pas 1`);
                assert.equal(it.meta.decimal, true,
                    'la virgule doit être offerte : la réponse est décimale');
            }
            if (e.id === 'comparer') {
                // LE PIÈGE EST VRAIMENT TENDU : on vérifie que les deux
                // probabilités diffèrent, sans quoi la question n'a pas de
                // réponse — et qu'elle se décide bien par le rapport.
                const [fa, ta, fb, tb] = nombresDe(it.prompt.text);
                assert.notEqual(fa * tb, fb * ta,
                    `les deux sacs donnent la même probabilité : ${fa}/${ta} et ${fb}/${tb}`);
                assert.equal(it.answer, fa * tb > fb * ta ? 'A' : 'B');
            }
        }
    }
    // LES TROIS RÉPONSES DE LA PREMIÈRE MARCHE REVIENNENT TOUTES. Tirées dans
    // une liste d'énoncés, elles tombaient six fois « possible » d'affilée — et
    // l'élève répond « possible » sans lire.
    const vues = new Set();
    for (let k = 0; k < 40; k++) {
        vues.add(PR.generate({ marches: ['certain'] },
            { rng: makeRng('c' + k), index: k, total: 40 }).answer);
    }
    assert.deepEqual([...vues].sort(), ['certain', 'impossible', 'possible']);
});

test('LES ÉNONCÉS SE LISENT — accords et élisions compris', () => {
    // MESURÉ SUR LA SORTIE, pas déduit : « Combien de élèves ont une note de
    // 14 ? », « Une cible est partagée en 10 zones TOUS DE MÊME TAILLE », « Ne
    // pas tirer verte, c'est tirer l'boule jaune », et une note de 31 sur 20
    // dans un exercice qui venait d'annoncer des notes sur 20.
    const FAUTES = [
        // « de élèves ». LE « h » EN EST EXCLU, et ce n'est pas un oubli :
        // « de huit nombres » est correct — le h de « huit » est aspiré — et la
        // première version de cette garde tombait dessus, dans un indice.
        /\bde [aeiouéèêàâîïôûù]/i,
        /l'[bcdfgjklmnpqrstvwxz]/i,
        /zones TOUS/,
        /(secteurs|jetons|stylos) TOUTES/,
        /\bils sont\b/,
        /undefined|NaN|\[object/,
        // DEUX ESPACES, OU UN ESPACE DEVANT UNE PONCTUATION BASSE : c'est ce
        // que produit une concaténation ratée, et cela ne se voit qu'imprimé.
        /\s{2}|\s[.,]/
    ];
    for (const [nom, G, ETAPES] of [['stat', ST, ETAPES_ST], ['proba', PR, ETAPES_PR]]) {
        for (const e of ETAPES) {
            for (let k = 0; k < 30; k++) {
                const it = G.generate({ marches: [e.id] },
                    { rng: makeRng(`mots-${nom}-${e.id}-${k}`), index: k, total: 30 });
                const tout = `${it.prompt.text} ${it.explanation} ${(it.hints || []).join(' ')}`;
                FAUTES.forEach(re => assert.ok(!re.test(tout),
                    `${nom}/${e.id} : « ${(tout.match(re) || [''])[0]} » dans « ${it.prompt.text} »`));
            }
        }
    }
    // ET LES NOTES RESTENT SUR 20. La marche « comparer » avait besoin d'une
    // série très éparpillée pour que l'étendue se voie — et sortait « 9 ; 23 ;
    // 13 ; 9 ; 31 » sous une phrase annonçant des notes sur 20. Elle parle
    // maintenant de points marqués, qui n'ont pas de plafond.
    for (let k = 0; k < 40; k++) {
        for (const marche of ETAPES_ST.map(e => e.id)) {
            const it = ST.generate({ marches: [marche] },
                { rng: makeRng(`plaf-${marche}-${k}`), index: k, total: 40 });
            if (!/notes sur 20/.test(it.prompt.text)) continue;
            const hors = (it.meta.serie || []).filter(v => v > 20 || v < 0);
            assert.deepEqual(hors, [],
                `${marche} : ${hors} dans une série annoncée « sur 20 » — « ${it.prompt.text} »`);
        }
    }
});

test('LES SEPT COMPÉTENCES SONT DISTINGUÉES — c\'est le diagnostic utile', () => {
    // Un élève qui calcule très bien une moyenne et rate toutes les médianes
    // n'a pas « raté les statistiques » : il a raté UNE chose, et c'est
    // toujours la même — ranger la série. Un bilan qui dit « statistiques :
    // non acquis » ne lui apprend rien.
    const vuesST = new Set(ETAPES_ST.map(e =>
        ST.generate({ marches: [e.id] }, { rng: makeRng('sk' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vuesST].sort(),
        ['don.stat.frequence', 'don.stat.lire', 'don.stat.mediane', 'don.stat.moyenne']);
    assert.deepEqual([...ST.skills].sort(),
        ['don.stat.frequence', 'don.stat.lire', 'don.stat.mediane', 'don.stat.moyenne']);

    const vuesPR = new Set(ETAPES_PR.map(e =>
        PR.generate({ marches: [e.id] }, { rng: makeRng('pk' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vuesPR].sort(),
        ['don.proba.calculer', 'don.proba.contraire', 'don.proba.vocabulaire']);
    assert.deepEqual([...PR.skills].sort(),
        ['don.proba.calculer', 'don.proba.contraire', 'don.proba.vocabulaire']);
});

test('LA VIRGULE N\'EST OFFERTE QUE LÀ OÙ ELLE A UN SENS', () => {
    // Une touche qui n'a aucun sens sur une question est une invitation à la
    // faute : l'élève qui la voit se demande ce qu'il a raté. Mais la retirer
    // là où la réponse EST décimale rendrait la question impossible — et c'est
    // le cas de la médiane d'une série paire, qui vaut souvent un demi.
    const DECIMALES = { 'mediane-paire': true, frequence: true };
    for (const e of ETAPES_ST) {
        for (let k = 0; k < 10; k++) {
            const it = ST.generate({ marches: [e.id] },
                { rng: makeRng(`v-${e.id}-${k}`), index: k, total: 10 });
            if (!DECIMALES[e.id]) {
                assert.equal(it.meta.decimal, false, `${e.id} : virgule offerte pour rien`);
                if (it.answerKind !== 'choice') {
                    assert.ok(Number.isInteger(Number(it.answer)),
                        `${e.id} : réponse non entière « ${it.answer} » sans virgule offerte`);
                }
            }
        }
    }
    // ET UNE SÉRIE PAIRE DONNE BIEN DES DEMIS, sinon la virgule ne servirait
    // à rien et la marche ne montrerait pas que la médiane sort de la série.
    let demis = 0;
    for (let k = 0; k < 40; k++) {
        const it = ST.generate({ marches: ['mediane-paire'] },
            { rng: makeRng('demi' + k), index: k, total: 40 });
        if (!Number.isInteger(Number(it.answer))) demis++;
    }
    assert.ok(demis >= 8, `${demis} médianes décimales sur 40 : trop rare pour enseigner quoi que ce soit`);
});
