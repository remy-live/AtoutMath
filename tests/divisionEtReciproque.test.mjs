// DIVISER PAR UNE FRACTION, ET LA RÉCIPROQUE DE PYTHAGORE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Multiplication et division de fraction »
// et « Réciproque du théorème de Pythagore » — ses blocs 10 et 7. Puis :
// « il faut que ce soit simple beau progressif et qu on puisse imprimer ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. AUCUN RÉSULTAT DE DIVISION NE SE SIMPLIFIE. Même décision que pour les
//      probabilités : 8/12 et 2/3 sont tous les deux justes, le logiciel doit
//      en choisir un, et quel que soit son choix la moitié des élèves qui ont
//      raison seraient comptés faux. Les listes sont écrites à la main — et
//      une liste écrite à la main se corrige un jour sans qu'on y repense.
//   2. LES TRIPLETS « PRESQUE » SONT DE VRAIS TRIANGLES. Trois longueurs ne
//      font pas toujours une figure : il faut que la plus grande soit
//      inférieure à la somme des deux autres. « AB = 3, AC = 4, BC = 9 » ne
//      décrit rien, et demander s'il est rectangle n'a aucun sens. Rien dans
//      le code ne le rappelle au moment où l'on ajoute un triplet.
//   3. LE PLUS LONG CÔTÉ N'EST PAS TOUJOURS LE DERNIER NOMMÉ. Sinon la marche
//      d'ouverture s'apprend par cœur en deux questions, et l'élève applique
//      la réciproque sans jamais regarder les nombres.
//   4. DES ÉNONCÉS QUI SE LISENT, et qui se répondent SUR LE PAPIER.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { pgcd } from '../js/core/arithmetique.js';
import {
    divisionFractionsGenerator as DIV, ETAPES as ETAPES_DIV,
    DIVISIONS, PAR_UN_ENTIER, ENTIER_PAR, A_RETOURNER
} from '../js/core/generators/divisionFractions.js';
import {
    pythagoreReciproqueGenerator as REC, ETAPES as ETAPES_REC,
    RECTANGLES, PRESQUE
} from '../js/core/generators/pythagoreReciproque.js';

// ──────────────────────── DIVISER PAR UNE FRACTION ──────────────────────────

test('AUCUNE DIVISION ÉCRITE NE DONNE UN RÉSULTAT SIMPLIFIABLE', () => {
    // Les trois listes ont été calculées puis RECOPIÉES dans le générateur.
    // Une liste recopiée se corrige un jour — on ajoute un couple qui « a
    // l'air bien » — et ce jour-là deux écritures seraient justes.
    assert.ok(DIVISIONS.length >= 15, `${DIVISIONS.length} divisions seulement`);
    for (const [a, b, c, d] of DIVISIONS) {
        assert.equal(pgcd(a, b), 1, `${a}/${b} n'est pas irréductible`);
        assert.equal(pgcd(c, d), 1, `${c}/${d} n'est pas irréductible`);
        assert.equal(pgcd(a * d, b * c), 1,
            `${a}/${b} ÷ ${c}/${d} = ${a * d}/${b * c}, qui se simplifie`);
        assert.notEqual(a * d, b * c, `${a}/${b} ÷ ${c}/${d} vaut 1 : rien à chercher`);
        // LES DEUX FRACTIONS SONT INFÉRIEURES À 1, et c'est la surprise du
        // chapitre : le quotient est alors PLUS GRAND que le dividende.
        assert.ok(a < b && c < d, `${a}/${b} ÷ ${c}/${d} : une fraction dépasse 1`);
    }
    for (const [a, b, n] of PAR_UN_ENTIER) {
        assert.equal(pgcd(a, b * n), 1, `${a}/${b} ÷ ${n} = ${a}/${b * n}, qui se simplifie`);
        assert.ok(n >= 2, `diviser par ${n} ne demande rien`);
    }
    for (const [n, c, d] of ENTIER_PAR) {
        assert.equal((n * d) % c, 0, `${n} ÷ ${c}/${d} ne tombe pas sur un entier`);
        assert.equal(pgcd(c, d), 1, `${c}/${d} n'est pas irréductible`);
        assert.notEqual((n * d) / c, n, `${n} ÷ ${c}/${d} = ${n} : la division ne change rien`);
    }
    for (const [a, b] of A_RETOURNER) {
        assert.equal(pgcd(a, b), 1, `${a}/${b} n'est pas irréductible`);
        assert.notEqual(a, b, `${a}/${b} vaut 1 : son inverse aussi`);
    }
});

test('TOUTES LES MARCHES DE LA DIVISION RÉPONDENT JUSTE', () => {
    // ON RECALCULE DEPUIS L'ÉNONCÉ, comme le ferait un élève — relire la
    // réponse du générateur ne garderait rien.
    for (const e of ETAPES_DIV) {
        for (let k = 0; k < 40; k++) {
            const it = DIV.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 40 });
            const t = it.prompt.text;
            assert.ok(t.length > 10, `${e.id} : énoncé vide`);
            assert.equal(it.meta.marche, e.id);
            const nb = (t.match(/\d+/g) || []).map(Number);

            if (e.id === 'inverse') {
                const [a, b] = nb;
                assert.equal(it.answer, `${b}|${a}`, `inverse de ${a}/${b}`);
            }
            if (e.id === 'inverse-entier') {
                assert.equal(it.answer, `1|${nb[0]}`, `inverse de ${nb[0]}`);
            }
            if (e.id === 'produit-un') {
                const [a, b] = nb;
                assert.equal(it.answer, `${b}|${a}`, `${a}/${b} × ? = 1`);
            }
            if (e.id === 'par-un-entier') {
                const [a, b, n] = nb;
                assert.equal(it.answer, `${a}|${b * n}`, `${a}/${b} ÷ ${n}`);
            }
            if (e.id === 'par-une-fraction') {
                // LA RÉPONSE EST LA LIGNE ENTIÈRE depuis la revue de Rémy du
                // 21 octobre : la multiplication qui remplace la division,
                // PUIS le résultat. L'épreuve d'ensemble, plus bas, en garde
                // le détail ; ici on vérifie seulement que le résultat final
                // est juste, comme pour les autres marches.
                const [a, b, c, d] = nb;
                const cases = it.answer.split('|');
                assert.equal(cases.length, 6, it.answer);
                assert.equal(cases.slice(4).join('|'), `${a * d}|${b * c}`,
                    `${a}/${b} ÷ ${c}/${d}`);
            }
            if (e.id === 'entier-par') {
                const [n, c, d] = nb;
                assert.equal(Number(it.answer), (n * d) / c, `${n} ÷ ${c}/${d}`);
            }
            if (e.id === 'probleme') {
                // ON RETIRE LA FRACTION AVANT DE LIRE L'ENTIER, au lieu de se
                // fier à l'ordre : « des bouteilles de 4/7 de litre avec 8
                // litres » écrit la fraction D'ABORD, « un ruban de 8 mètres
                // coupé en morceaux de 4/7 » l'écrit ensuite. Une épreuve qui
                // lit la position tombe sur l'un des deux en croyant avoir
                // trouvé un défaut — c'est arrivé.
                const [, c, d] = t.match(/(\d+)\/(\d+)/).map(Number);
                const n = Number(t.replace(/\d+\/\d+/, ' ').match(/\d+/)[0]);
                assert.equal(Number(it.answer), (n * d) / c, `${t}`);
                // LE RÉSULTAT EST PLUS GRAND QUE LE NOMBRE DE DÉPART : c'est
                // tout le sel du problème — on cherche spontanément une
                // multiplication parce que la réponse grandit.
                assert.ok(Number(it.answer) > n,
                    `${t} : la réponse ${it.answer} n'est pas plus grande que ${n}`);
            }
            // TOUTE RÉPONSE À DEUX NOMBRES DÉCLARE SES DEUX CASES : le pavé
            // compte les `[data-trou]` de l'énoncé, il n'en fabrique pas.
            const morceaux = String(it.answer).split('|').length;
            const trous = (it.prompt.html.match(/data-trou=/g) || []).length;
            assert.equal(trous, morceaux > 1 ? morceaux : 0,
                `${e.id} : ${morceaux} nombre(s) à donner et ${trous} case(s)`);
        }
    }
});

// ─────────────────────── LA RÉCIPROQUE DE PYTHAGORE ─────────────────────────

test('SA REVUE DU 21 OCTOBRE — LA LIGNE, ET LES TROIS ÉTAPES', async () => {
    const { divisionFractionsGenerator: D } = await import('../js/core/generators/divisionFractions.js');
    const { pythagoreReciproqueGenerator: P } = await import('../js/core/generators/pythagoreReciproque.js');

    // 1 · LA LIGNE INTERMÉDIAIRE NE SE SAUTE PLUS. Rémy : « Il faudrait forcer
    //     l'élève quand on fait 3/4 : 5/6 à aller à la ligne et que l'on puisse
    //     écrire 3/4 * 6/5. » Le geste du chapitre est la TRANSFORMATION : un
    //     élève qui écrit directement 18/20 a peut-être retourné la bonne
    //     fraction — ou les deux — et on ne le saura jamais.
    for (let k = 0; k < 60; k++) {
        const it = D.generate({ marches: ['par-une-fraction'] },
            { rng: makeRng('li' + k), index: k, total: 60 });
        const cases = it.answer.split('|').map(Number);
        assert.equal(cases.length, 6, `${it.prompt.text} → ${it.answer}`);
        const [a, b, d, c, n, m] = cases;
        // LA PREMIÈRE FRACTION SE RECOPIE, LA SECONDE SE RETOURNE : c'est la
        // faute du chapitre, et c'est elle qu'on évalue.
        assert.equal(n, a * d, it.answer);
        assert.equal(m, b * c, it.answer);
        // ET L'ÉNONCÉ DIT BIEN QUELLE DIVISION ON POSE.
        const lus = (it.prompt.text.match(/\d+/g) || []).map(Number);
        assert.deepEqual(lus.slice(0, 4), [a, b, c, d], it.prompt.text);
        // SIX CASES À L'ÉCRAN, autant que la réponse en attend : une de moins
        // et l'élève ne peut pas valider sans savoir pourquoi.
        assert.equal((it.prompt.html.match(/data-trou/g) || []).length, 6);
    }

    // 2 · LA RÉDACTION EN TROIS ÉTAPES. Rémy : « je sais que : ABC est un
    //     triangle / Or / On calcule d'un côté et de l'autre EN SÉPARANT /
    //     AB² = BC² + CA² (ou pas égal) / Donc, le triangle est rectangle
    //     en … » C'est la copie qui rapporte les points, pas le « oui ».
    const conclusions = new Set();
    for (let k = 0; k < 60; k++) {
        const it = P.generate({ marches: ['conclure'] },
            { rng: makeRng('rd' + k), index: k, total: 60 });
        const e = it.explanation;
        assert.match(e, /^JE SAIS QUE : /, e.slice(0, 40));
        assert.match(e, /\bOR, on calcule séparément\b/, e);
        assert.match(e, /\bDONC, d'après la (réciproque|contraposée)\b/, e);
        // LES DEUX CÔTÉS SONT CALCULÉS SÉPARÉMENT, et l'égalité n'est jamais
        // posée d'avance : écrire « AB² = BC² + CA² » avant de l'avoir
        // vérifiée, c'est supposer ce qu'on démontre.
        assert.match(e, /d'un côté ;/, e);
        assert.match(e, /de l'autre\./, e);
        conclusions.add(it.answer);
    }
    // ET LES DEUX CONCLUSIONS SORTENT : une rédaction qui ne dirait jamais
    // « n'est PAS rectangle » n'apprendrait que la moitié du geste.
    assert.deepEqual([...conclusions].sort(), ['non', 'oui']);
});

test('LES TRIPLETS DÉCRIVENT DE VRAIS TRIANGLES', () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // TROIS LONGUEURS NE FONT PAS TOUJOURS UNE FIGURE : il faut que la plus
    // grande soit INFÉRIEURE à la somme des deux autres. « AB = 3, AC = 4,
    // BC = 9 » ne décrit aucun triangle — les deux petits côtés ne se
    // rejoignent pas —, et demander s'il est rectangle n'a aucun sens.
    //
    // RIEN DANS LE CODE NE LE RAPPELLE au moment où l'on ajoute un triplet
    // « presque pythagoricien », et c'est exactement le geste qu'on fera :
    // prendre 3, 4, 5 et pousser le dernier nombre jusqu'à ce que l'égalité
    // tombe à côté.
    for (const [nom, liste] of [['rectangles', RECTANGLES], ['presque', PRESQUE]]) {
        assert.ok(liste.length >= 10, `${nom} : ${liste.length} triplets seulement`);
        for (const [p, m, g] of liste) {
            assert.ok(p <= m && m <= g, `${nom} : ${p}, ${m}, ${g} n'est pas croissant`);
            assert.ok(p + m > g,
                `${nom} : ${p} + ${m} ne dépasse pas ${g} — ce triangle n'existe pas`);
            const rectangle = g * g === p * p + m * m;
            assert.equal(rectangle, nom === 'rectangles',
                `${nom} : ${p}, ${m}, ${g} est ${rectangle ? '' : 'n\'est pas '}rectangle`);
        }
    }
    // ET LES « PRESQUE » SONT VRAIMENT PRESQUE : la question ne doit pas se
    // répondre à l'œil. Au-delà de la moitié d'écart, le triangle est
    // visiblement plat ou visiblement pointu.
    for (const [p, m, g] of PRESQUE) {
        const ecart = Math.abs(g * g - (p * p + m * m)) / (p * p + m * m);
        assert.ok(ecart < 0.5,
            `${p}, ${m}, ${g} : ${Math.round(ecart * 100)} % d'écart, cela se voit`);
    }
});

test('LE PLUS LONG CÔTÉ N\'EST PAS TOUJOURS LE DERNIER NOMMÉ', () => {
    // Si les longueurs étaient écrites dans l'ordre croissant, la marche
    // d'ouverture s'apprendrait par cœur en deux questions — « c'est le
    // dernier » — et l'élève appliquerait la réciproque sans jamais regarder
    // les nombres. Or c'est précisément ce que cette marche existe pour lui
    // faire faire.
    const places = new Set();
    for (let k = 0; k < 60; k++) {
        const it = REC.generate({ marches: ['le-plus-long'] },
            { rng: makeRng('ordre' + k), index: k, total: 60 });
        const lgs = (it.prompt.text.match(/= (\d+) cm/g) || []).map(s => Number(s.match(/\d+/)[0]));
        assert.equal(lgs.length, 3, `trois longueurs attendues : ${it.prompt.text}`);
        places.add(lgs.indexOf(Math.max(...lgs)));
        // ET LA BONNE RÉPONSE EST BIEN LE PLUS LONG.
        const juste = it.choices.find(c => c.correct).value;
        const dit = it.prompt.text.match(new RegExp(`${juste} = (\\d+) cm`));
        assert.ok(dit, `${juste} n'est pas dans l'énoncé`);
        assert.equal(Number(dit[1]), Math.max(...lgs), `${it.prompt.text}`);
    }
    assert.equal(places.size, 3,
        `le plus long côté ne tombe qu'aux places ${[...places]} : l'ordre est prévisible`);
});

test('TOUTES LES MARCHES DE LA RÉCIPROQUE RÉPONDENT JUSTE', () => {
    for (const e of ETAPES_REC) {
        const reponses = new Set();
        for (let k = 0; k < 40; k++) {
            const it = REC.generate({ marches: [e.id] },
                { rng: makeRng(`r-${e.id}-${k}`), index: k, total: 40 });
            const t = it.prompt.text;
            assert.equal(it.meta.marche, e.id);
            reponses.add(String(it.answer));

            if (e.id === 'les-deux-carres') {
                const lgs = (t.match(/= (\d+) cm/g) || []).map(s => Number(s.match(/\d+/)[0]));
                const g = Math.max(...lgs);
                const autres = lgs.filter((v, i) => i !== lgs.indexOf(g));
                assert.equal(it.answer,
                    `${g * g}|${autres[0] * autres[0] + autres[1] * autres[1]}`, t);
            }
            if (e.id === 'conclure' || e.id === 'probleme') {
                const lgs = (t.match(/(\d+) cm/g) || []).map(s => Number(s.match(/\d+/)[0]));
                const g = Math.max(...lgs);
                const autres = lgs.filter((v, i) => i !== lgs.indexOf(g));
                const attendu = g * g === autres[0] * autres[0] + autres[1] * autres[1]
                    ? 'oui' : 'non';
                assert.equal(it.answer, attendu, t);
            }
            if (e.id === 'le-sommet') {
                // L'ANGLE DROIT EST EN FACE DE L'HYPOTÉNUSE : le sommet
                // cherché n'est PAS sur le plus long côté.
                const nom = t.match(/triangle ([A-Z]{3})/)[1];
                const paires = [...t.matchAll(/([A-Z]{2}) = (\d+) cm/g)]
                    .map(m => ({ nom: m[1], lg: Number(m[2]) }));
                const plusLong = paires.reduce((a, b) => (b.lg > a.lg ? b : a));
                const attendu = nom.split('').find(s => !plusLong.nom.includes(s));
                assert.equal(it.answer, attendu, t);
            }
        }
        // AUCUNE MARCHE NE RÉPOND TOUJOURS LA MÊME CHOSE. Une marche fermée
        // qui dirait « non » quarante fois apprendrait à répondre « non ».
        if (it_estFermee(e.id)) {
            assert.ok(reponses.size >= 2,
                `${e.id} : une seule réponse sur quarante tirages — ${[...reponses]}`);
        }
    }
});

/** Les marches dont la réponse est un oui-non : elles doivent varier. */
function it_estFermee(id) {
    return ['conclure', 'conclure-donne', 'probleme'].includes(id);
}

test('LES ÉNONCÉS SE LISENT, ET SE RÉPONDENT SUR LE PAPIER', () => {
    // MESURÉ SUR LA SORTIE : « vérifier que une dalle », « Une jardinière […]
    // IL mesure », « Cette dalle est-il bien rectangulaire ? », « la longueur :
    // 80 cm, la largeur : 150 cm », et un point médian entre deux carrés — qui
    // sur un écran de mathématiques se lit comme une multiplication.
    const FAUTES = [
        /\bque (un|une) /,
        /Une [a-zà-ÿ]+ [^.]*\bIl mesure/,
        /(Cette|La) [a-zà-ÿ]+ est-il/,
        /Ce [a-zà-ÿ]+ est-elle/,
        / · /,
        /undefined|NaN|\[object/,
        /\s{2}|\s[.,]/
    ];
    for (const [nom, G, ETAPES] of [['div', DIV, ETAPES_DIV], ['rec', REC, ETAPES_REC]]) {
        for (const e of ETAPES) {
            for (let k = 0; k < 30; k++) {
                const it = G.generate({ marches: [e.id] },
                    { rng: makeRng(`m-${nom}-${e.id}-${k}`), index: k, total: 30 });
                const tout = `${it.prompt.text} ${it.explanation} ${(it.hints || []).join(' ')}`;
                FAUTES.forEach(re => assert.ok(!re.test(tout),
                    `${nom}/${e.id} : « ${(tout.match(re) || [''])[0]} » dans « ${it.prompt.text} »`));
                // ET LA LONGUEUR DÉPASSE LA LARGEUR, quand les deux sont dites.
                const dims = it.prompt.text.match(/longueur : (\d+) cm, la largeur : (\d+) cm/);
                if (dims) {
                    assert.ok(Number(dims[1]) >= Number(dims[2]),
                        `une largeur plus grande que la longueur : « ${it.prompt.text} »`);
                }
                // LA FEUILLE PORTE TOUT CE QU'IL FAUT POUR RÉPONDRE : Rémy,
                // « qu on puisse imprimer ». Les propositions d'une question
                // fermée sont des BOUTONS, et une feuille n'en a pas — donc
                // soit la question se répond sans elles (« est-il rectangle ? »
                // se répond par oui ou non), soit l'énoncé les écrit.
                const papier = it.prompt.papier || it.prompt.text;
                assert.ok(papier.length > 10, `${nom}/${e.id} : énoncé de papier vide`);
                if (it.choices && !['oui', 'non'].includes(String(it.answer))) {
                    const absentes = it.choices.map(c => String(c.value))
                        .filter(v => !papier.includes(v));
                    assert.deepEqual(absentes, [],
                        `${nom}/${e.id} : « ${papier} » ne montre pas ${absentes.join(', ')}`);
                }
            }
        }
    }
});

test('LES TROIS COMPÉTENCES NEUVES SONT DISTINGUÉES', () => {
    // Un élève qui rate une division par une fraction se trompe presque
    // toujours AVANT de diviser : il retourne la mauvaise fraction, ou les
    // deux. « Division de fractions : non acquis » ne lui dit pas lequel des
    // deux gestes manque.
    const vuesDiv = new Set(ETAPES_DIV.map(e =>
        DIV.generate({ marches: [e.id] }, { rng: makeRng('s' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vuesDiv].sort(), ['num.frac.division', 'num.frac.inverse']);
    assert.deepEqual([...DIV.skills].sort(), ['num.frac.division', 'num.frac.inverse']);

    const vuesRec = new Set(ETAPES_REC.map(e =>
        REC.generate({ marches: [e.id] }, { rng: makeRng('p' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vuesRec], ['geo.pythagore.reciproque']);
});

test('LE PETIT BAIN EST EN TÊTE DES DEUX PROGRESSIONS', () => {
    // RÉMY : « progressif ». C'est la leçon du PGCD — « bien trop difficile »
    // venait d'une progression qui commençait par la fin. `decoupeMarches`
    // partage les questions DANS L'ORDRE, donc un parcours court joue les
    // premières marches : encore faut-il que ce soient les faciles.
    for (const [nom, ETAPES] of [['division', ETAPES_DIV], ['réciproque', ETAPES_REC]]) {
        const temps = ETAPES.map(e => e.temps);
        assert.deepEqual([...temps].sort(), temps,
            `${nom} : les temps ne se suivent pas — ${temps.join('')}`);
        assert.equal(temps[0], 'A', `${nom} : la progression n'ouvre pas sur le temps A`);
        assert.ok(temps.filter(t => t === 'A').length >= 2,
            `${nom} : moins de deux marches dans le petit bain`);
    }
    // ET LE TEMPS A DE LA DIVISION NE DIVISE PAS UNE SEULE FOIS : c'est sa
    // raison d'être. Diviser demande deux gestes, et l'élève qui se trompe
    // rate le premier — retourner. On ne lui demande donc que cela.
    for (const e of ETAPES_DIV.filter(x => x.temps === 'A')) {
        for (let k = 0; k < 20; k++) {
            const it = DIV.generate({ marches: [e.id] },
                { rng: makeRng(`bain-${e.id}-${k}`), index: k, total: 20 });
            assert.ok(!/÷/.test(it.prompt.text),
                `${e.id} divise déjà : « ${it.prompt.text} »`);
        }
    }
});
