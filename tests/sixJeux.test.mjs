// LES SIX JEUX DE LA NUIT DU 26 OCTOBRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Ah oui tout est une excellente idée, tu me les fais tous, avec des
// grilles faciles, que ça fonctionne sur ordi, tablette et téléphone. »
//
// CE QUE CETTE ÉPREUVE GARDE, et pourquoi chaque ligne y est :
//
//   · LA SOLUTION RESPECTE LA RÈGLE DU JEU. Chacun a la sienne, et elle est
//     vérifiée ICI, à la main — pas par le solveur qui a servi à fabriquer la
//     grille. Un solveur faux fabriquerait des grilles fausses ET les
//     déclarerait bonnes.
//   · LA RÉPONSE ATTENDUE EST CELLE QUE L'ÉCRAN ENVOIE. C'est le défaut qui
//     compterait faux un élève qui a raison, et il ne se voit nulle part
//     ailleurs : l'activité écrit `g1,2,3/4,5,6`, le générateur doit écrire
//     pareil.
//   · LA SOLUTION EST UNIQUE. Même promesse que partout : deux solutions, et
//     l'une des deux est comptée fausse sans qu'on puisse l'expliquer.
//   · « DES GRILLES FACILES » : le réglage par défaut de chacun est bien le
//     plus accessible. Un élève qui ouvre un jeu neuf doit le RÉUSSIR la
//     première fois, sinon il ne l'ouvre pas une seconde.
//
// CE QU'ELLE NE GARDE PAS, et c'est mesuré ailleurs : que tout tienne sur un
// téléphone. Cela demande un navigateur — voir `tools/sixJeux.mjs`, qui le
// mesure en 390 × 844, en 820 × 1180 et en 1280 × 900.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { readFileSync } from 'node:fs';
import { compterGrilles } from '../js/core/generators/yohaku.js';
import { compterSuguru } from '../js/core/generators/suguru.js';
import { compterGratteCiel, combienVus, indicesDe } from '../js/core/generators/gratteCiel.js';
import { compterChemins } from '../js/core/generators/cheminNombres.js';
import { compterKakuro } from '../js/core/generators/kakuro.js';
import { meilleurCoup, PRISE_MAX } from '../js/core/generators/allumettes.js';

const GRILLES = ['logi-kakuro', 'logi-yohaku', 'logi-suguru', 'logi-gratte-ciel',
    'logi-chemin-nombres'];
const TOUS = [...GRILLES, 'logi-allumettes'];

/** Quelques items d'un exercice, avec ses réglages par défaut du catalogue. */
function tirer(id, combien = 6, params = null) {
    const exo = exercices.find(e => e.id === id);
    assert.ok(exo, `${id} a disparu du catalogue`);
    const gen = getGenerator(exo.generatorId);
    assert.ok(gen, `${id} : générateur non enregistré`);
    return Array.from({ length: combien }, (_, i) =>
        gen.generate(params || { ...(exo.params || {}) }, { rng: makeRng(id + i), index: i }));
}

test('LES SIX SONT AU CATALOGUE, AVEC LEUR ÉCRAN ET LEUR PAPIER', () => {
    for (const id of TOUS) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, `${id} a disparu du catalogue`);
        assert.ok(getGenerator(exo.generatorId), `${id} : générateur non enregistré`);
        assert.ok(exo.instruction && exo.instruction.length > 80,
            `${id} : pas d'explication de la règle dans la fiche`);
    }
    // LES CINQ GRILLES PARTAGENT UNE SEULE ACTIVITÉ — c'est ce qui a rendu la
    // nuit possible. Si l'une d'elles s'en détachait, il faudrait corriger la
    // saisie au doigt à deux endroits.
    for (const id of GRILLES) {
        const exo = exercices.find(e => e.id === id);
        assert.equal(exo.activityId, 'grilleNombres', `${id} a quitté l'activité commune`);
        assert.ok(exo.printable, `${id} ne s'imprime plus`);
    }
    assert.equal(exercices.find(e => e.id === 'logi-allumettes').activityId, 'allumettes');
});

test('LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    // L'activité écrit `'g' + grille.map(l => l.join(',')).join('/')`. Le
    // générateur doit écrire exactement la même chose, sinon la bonne grille
    // serait comptée fausse — et c'est précisément ce qu'on ne peut pas
    // expliquer à un élève.
    for (const id of GRILLES) {
        for (const it of tirer(id, 5)) {
            const attendu = 'g' + it.meta.solution.map(l => l.join(',')).join('/');
            assert.equal(it.answer, attendu, `${id} : l'écriture de la réponse a changé`);
            assert.ok(evaluate(it, it.answer).correct,
                `${id} : la bonne grille est comptée fausse`);
        }
    }
});

test('CHAQUE CASE DE CHAQUE GRILLE EST DÉCRITE UNE FOIS', () => {
    // L'activité range les cases par leur position : une case oubliée fait un
    // trou dans le damier, une case en double en recouvre une autre.
    for (const id of GRILLES) {
        for (const it of tirer(id, 4)) {
            const { lignes, colonnes, cases } = it.meta;
            assert.equal(cases.length, lignes * colonnes,
                `${id} : ${cases.length} cases décrites pour ${lignes * colonnes}`);
            const vues = new Set(cases.map(c => `${c.r},${c.c}`));
            assert.equal(vues.size, lignes * colonnes, `${id} : deux cases au même endroit`);
            cases.forEach(c => assert.match(c.type, /^(vide|donnee|mur|indice)$/,
                `${id} : type de case inconnu « ${c.type} »`));
            assert.ok(cases.some(c => c.type === 'vide'), `${id} : aucune case à remplir`);
            assert.ok(it.meta.chiffres && it.meta.chiffres.max >= 1, `${id} : pas de palette`);
        }
    }
});

test('LE YOHAKU TOMBE JUSTE SUR TOUS SES TOTAUX', () => {
    for (const it of tirer('logi-yohaku', 6)) {
        const { solution, totauxLignes, totauxColonnes, operation, lignes: n } = it.meta;
        const total = (v) => (operation === 'produit'
            ? v.reduce((a, b) => a * b, 1) : v.reduce((a, b) => a + b, 0));
        solution.forEach((l, r) => assert.equal(total(l), totauxLignes[r],
            `ligne ${r + 1} : ${total(l)} au lieu de ${totauxLignes[r]}`));
        for (let c = 0; c < n; c++) {
            const col = solution.map(l => l[c]);
            assert.equal(total(col), totauxColonnes[c], `colonne ${c + 1}`);
        }
        // CHAQUE NOMBRE UNE SEULE FOIS : c'est cette règle qui rend la grille
        // vide résoluble, et sans elle le creusement s'arrêtait à UNE case.
        const tous = solution.flat();
        assert.equal(new Set(tous).size, tous.length, 'un nombre sert deux fois');
        const donnees = solution.map((l, r) => l.map((v, c) =>
            (it.meta.cases.find(x => x.r === r && x.c === c).type === 'donnee' ? v : 0)));
        assert.equal(compterGrilles(n, donnees, totauxLignes, totauxColonnes, operation, 3), 1,
            'le Yohaku a plusieurs solutions');
    }
});

test('LE SUGURU RESPECTE SES ZONES ET SES VOISINAGES', () => {
    for (const it of tirer('logi-suguru', 5)) {
        const { lignes, colonnes, cases, solution } = it.meta;
        const zoneDe = new Map(cases.map(c => [`${c.r},${c.c}`, c.zone]));
        const parZone = new Map();
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                const z = zoneDe.get(`${r},${c}`);
                if (!parZone.has(z)) parZone.set(z, []);
                parZone.get(z).push(solution[r][c]);
            }
        }
        parZone.forEach((vals, z) => {
            const attendu = Array.from({ length: vals.length }, (_, k) => k + 1);
            assert.deepEqual(vals.slice().sort((a, b) => a - b), attendu,
                `la zone ${z} ne porte pas 1 à ${vals.length}`);
        });
        // DEUX ÉGAUX NE SE TOUCHENT JAMAIS — diagonales comprises. C'est la
        // seconde règle, et c'est elle qui fait tout le jeu.
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (!dr && !dc) continue;
                        const a = r + dr, b = c + dc;
                        if (a < 0 || b < 0 || a >= lignes || b >= colonnes) continue;
                        assert.notEqual(solution[a][b], solution[r][c],
                            `deux ${solution[r][c]} se touchent en (${r},${c})`);
                    }
                }
            }
        }
        const tailles = [];
        parZone.forEach((v, z) => { tailles[z] = v.length; });
        const zone = Array.from({ length: lignes }, (_, r) =>
            Array.from({ length: colonnes }, (_, c) => zoneDe.get(`${r},${c}`)));
        const donnees = solution.map((l, r) => l.map((v, c) =>
            (cases.find(x => x.r === r && x.c === c).type === 'donnee' ? v : 0)));
        assert.equal(compterSuguru(lignes, colonnes, zone, tailles, donnees, 3), 1,
            'le Suguru a plusieurs solutions');
    }
});

test('LES GRATTE-CIEL COMPTENT BIEN CE QU\'ON VOIT', () => {
    for (const it of tirer('logi-gratte-ciel', 5)) {
        const { solution, marges, lignes: n } = it.meta;
        // Carré latin : chaque hauteur une fois par ligne et par colonne.
        for (let i = 0; i < n; i++) {
            const attendu = Array.from({ length: n }, (_, k) => k + 1);
            assert.deepEqual(solution[i].slice().sort((a, b) => a - b), attendu, `ligne ${i + 1}`);
            assert.deepEqual(solution.map(l => l[i]).sort((a, b) => a - b), attendu,
                `colonne ${i + 1}`);
        }
        // ── LES INDICES DISENT-ILS LA VÉRITÉ ? ────────────────────────────
        //
        // ON RECOMPTE ICI, À LA MAIN. Premier jet : on comparait les indices à
        // `indicesDe(solution)`, c'est-à-dire à la fonction QUI LES A ÉCRITS.
        // `epreuveTombe` l'a dit sans détour — le défaut remis passait au
        // vert, parce que les deux côtés de l'égalité bougeaient ensemble. Une
        // épreuve qui interroge le témoin ne mesure rien.
        const compte = (file) => {
            let haut = 0, n = 0;
            for (const h of file) if (h > haut) { haut = h; n++; }
            return n;
        };
        const miens = {
            gauche: solution.map(l => compte(l)),
            droite: solution.map(l => compte(l.slice().reverse())),
            haut: Array.from({ length: n }, (_, c) => compte(solution.map(l => l[c]))),
            bas: Array.from({ length: n }, (_, c) =>
                compte(solution.map(l => l[c]).reverse()))
        };
        ['gauche', 'droite', 'haut', 'bas'].forEach(sens => {
            (marges[sens] || []).forEach((v, i) => {
                if (v === null || v === undefined) return;
                assert.equal(v, miens[sens][i], `indice ${sens} ${i + 1}`);
            });
        });
        assert.equal(combienVus([1, 2, 3, 4]), 4, 'une rangée croissante se voit en entier');
        assert.equal(combienVus([4, 1, 2, 3]), 1, 'le plus haut devant cache tout');
        assert.deepEqual(indicesDe([[1, 2], [2, 1]]), {
            gauche: [2, 1], droite: [1, 2], haut: [2, 1], bas: [1, 2]
        }, 'les quatre côtés ne se lisent plus dans le bon sens');
        assert.equal(compterGratteCiel(n, marges, 3), 1, 'les Gratte-ciel ont plusieurs solutions');
    }
});

test('LE CHEMIN DES NOMBRES EST UNE CHAÎNE SANS TROU', () => {
    for (const it of tirer('logi-chemin-nombres', 5)) {
        const { lignes, colonnes, solution, cases } = it.meta;
        const total = lignes * colonnes;
        const ou = new Map();
        solution.forEach((l, r) => l.forEach((v, c) => ou.set(v, [r, c])));
        assert.equal(ou.size, total, 'un nombre manque ou se répète');
        for (let k = 1; k < total; k++) {
            const [r1, c1] = ou.get(k), [r2, c2] = ou.get(k + 1);
            assert.ok(Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1,
                `${k} et ${k + 1} ne se touchent pas`);
        }
        // LE 1 ET LE DERNIER RESTENT ÉCRITS : sans le 1, on ne sait pas par où
        // commencer, et la grille a autant de solutions qu'elle a de départs.
        const donnee = (v) => cases.some(c => c.type === 'donnee' && c.valeur === v);
        assert.ok(donnee(1), 'le 1 n\'est plus donné');
        assert.ok(donnee(total), `le ${total} n'est plus donné`);
        const donnees = solution.map((l, r) => l.map((v, c) =>
            (cases.find(x => x.r === r && x.c === c).type === 'donnee' ? v : 0)));
        assert.equal(compterChemins(lignes, colonnes, donnees, 3), 1,
            'le Chemin des Nombres a plusieurs solutions');
    }
});

test('LE KAKURO TOMBE JUSTE SUR CHAQUE SUITE, SANS CHIFFRE RÉPÉTÉ', () => {
    for (const it of tirer('logi-kakuro', 5)) {
        const { lignes, colonnes, cases, solution } = it.meta;
        const par = new Map(cases.map(c => [`${c.r},${c.c}`, c]));
        const blanche = (r, c) => (par.get(`${r},${c}`) || {}).type === 'vide';
        // Chaque somme annoncée est celle de la suite qui la suit.
        cases.filter(c => c.type === 'indice').forEach(ind => {
            if (ind.droite) {
                const v = [];
                for (let c = ind.c + 1; c < colonnes && blanche(ind.r, c); c++) {
                    v.push(solution[ind.r][c]);
                }
                assert.ok(v.length >= 2, `suite horizontale de ${v.length} case(s)`);
                assert.equal(v.reduce((a, b) => a + b, 0), ind.droite,
                    `la ligne qui part de (${ind.r},${ind.c}) ne fait pas ${ind.droite}`);
                assert.equal(new Set(v).size, v.length, 'un chiffre se répète dans une suite');
            }
            if (ind.bas) {
                const v = [];
                for (let r = ind.r + 1; r < lignes && blanche(r, ind.c); r++) {
                    v.push(solution[r][ind.c]);
                }
                assert.ok(v.length >= 2, `suite verticale de ${v.length} case(s)`);
                assert.equal(v.reduce((a, b) => a + b, 0), ind.bas,
                    `la colonne qui part de (${ind.r},${ind.c}) ne fait pas ${ind.bas}`);
                assert.equal(new Set(v).size, v.length, 'un chiffre se répète dans une suite');
            }
        });
        // LE ZÉRO N'EXISTE PAS : chaque case blanche vaut au moins 1.
        cases.filter(c => c.type === 'vide').forEach(c =>
            assert.ok(solution[c.r][c.c] >= 1 && solution[c.r][c.c] <= 9,
                `une case blanche vaut ${solution[c.r][c.c]}`));
        // L’unicité du Kakuro est gardée plus bas, tous réglages confondus.
    }
});

test('LES ALLUMETTES SE GAGNENT, ET LA STRATÉGIE EST LA BONNE', () => {
    // LE TAS N'EST JAMAIS UN MULTIPLE DE QUATRE. C'est l'élève qui commence :
    // si le tas l'était, il perdrait quoi qu'il joue — et une partie qu'on ne
    // peut pas gagner n'apprend rien, elle apprend même le contraire.
    for (const it of tirer('logi-allumettes', 12)) {
        assert.notEqual(it.meta.tas % (PRISE_MAX + 1), 0,
            `tas de ${it.meta.tas} : l'élève perd quoi qu'il joue`);
        assert.equal(it.answer, 'gagne');
    }
    // ET LE COUP CONSEILLÉ LAISSE BIEN UN MULTIPLE DE QUATRE.
    for (let tas = 1; tas <= 40; tas++) {
        const k = meilleurCoup(tas);
        assert.ok(k >= 1 && k <= PRISE_MAX, `coup de ${k} sur un tas de ${tas}`);
        if (tas % 4 !== 0) {
            assert.equal((tas - k) % 4, 0, `tas ${tas} : ${k} ne laisse pas un multiple de 4`);
        }
    }
});

test('ET « DES GRILLES FACILES » EST BIEN LE RÉGLAGE PAR DÉFAUT', () => {
    // Sa phrase, mot pour mot. Un élève qui ouvre un jeu neuf doit le RÉUSSIR
    // la première fois.
    for (const id of GRILLES) {
        const exo = exercices.find(e => e.id === id);
        assert.equal(exo.params.difficulte, 'facile', `${id} n'ouvre pas en facile`);
        assert.equal(exo.params.format, 'petit', `${id} n'ouvre pas sur la petite grille`);
    }
    assert.equal(exercices.find(e => e.id === 'logi-allumettes').params.robot, 'apprend',
        'les Allumettes ouvrent sur une machine imbattable');
});

/**
 * TOUS LES RÉGLAGES, pour les gardes qui doivent balayer et non échantillonner.
 */
function reglagesDe(id) {
    const exo = exercices.find(e => e.id === id);
    const gen = getGenerator(exo.generatorId);
    let out = [{}];
    for (const p of gen.params || []) {
        if (p.type !== 'select' || !p.options) continue;
        const suivant = [];
        for (const base of out) for (const o of p.options) suivant.push({ ...base, [p.id]: o.value });
        out = suivant;
    }
    return out.map(c => ({ ...(exo.params || {}), ...c }));
}

test('AUCUNE GRILLE N\'EST SERVIE SANS PREUVE D\'UNICITÉ, TOUS RÉGLAGES', () => {
    // CE QUE CETTE GARDE TIENT, et c'est le défaut le plus grave que ces
    // fichiers puissent produire : une grille à DEUX solutions compte faux un
    // élève qui a raison, et personne ne peut le lui expliquer.
    //
    // ELLE A ATTRAPÉ UN VRAI DÉFAUT. Le Kakuro, en 5 × 5 avec des suites de
    // cinq cases, tombait TRENTE-CINQ FOIS SUR QUARANTE dans son filet — et ce
    // filet servait une grille pleine SANS JAMAIS COMPTER ses solutions. La
    // cause était une cascade dans le mauvais sens : quand aucune grille
    // unique ne sortait, on s'autorisait des suites PLUS LONGUES, alors qu'une
    // suite plus longue a plus d'écritures, donc rend l'unicité moins
    // probable. On descend, maintenant.
    //
    // ── ET ELLE NE DEMANDE PAS LA MÊME CHOSE QUE LE GÉNÉRATEUR ─────────────
    //
    // Les compteurs employés ici sont ceux qui ont servi à fabriquer la
    // grille ; on pourrait croire qu'on interroge le témoin. Ce n'est pas le
    // cas, et la différence est tout l'intérêt : le générateur ne prouve
    // l'unicité que DANS LA LIMITE DE SON BUDGET DE NŒUDS, et l'épreuve la
    // demande SANS AUCUNE LIMITE. Ce qu'elle garde, c'est précisément qu'un
    // budget épuisé n'a jamais été pris pour une preuve.
    for (const reglages of reglagesDe('logi-kakuro')) {
        for (const it of tirer('logi-kakuro', 3, reglages)) {
            assert.equal(it.meta.filet, false,
                `kakuro ${JSON.stringify(reglages)} : grille servie par le filet, `
                + 'donc jamais prouvée unique');
            // ET LA PROMESSE DE L'ÉTIQUETTE, mot pour mot : « jusqu'à N cases ».
            const plafond = { facile: 3, moyen: 4, difficile: 5 }[reglages.difficulte];
            const plusLongue = Math.max(...it.meta.suites);
            assert.ok(plusLongue <= plafond,
                `kakuro ${reglages.difficulte} : une suite de ${plusLongue} cases pour `
                + `un réglage qui promet au plus ${plafond}`);
        }
    }
    for (const reglages of reglagesDe('logi-suguru')) {
        for (const it of tirer('logi-suguru', 2, reglages)) {
            const { lignes, colonnes } = it.meta;
            const zone = Array.from({ length: lignes }, (_, r) =>
                Array.from({ length: colonnes }, (_, c) =>
                    it.meta.cases.find(k => k.r === r && k.c === c).zone));
            const tailles = [];
            it.meta.cases.forEach(k => { tailles[k.zone] = (tailles[k.zone] || 0) + 1; });
            const donnees = Array.from({ length: lignes }, (_, r) =>
                Array.from({ length: colonnes }, (_, c) => {
                    const k = it.meta.cases.find(x => x.r === r && x.c === c);
                    return k.type === 'donnee' ? k.valeur : 0;
                }));
            assert.equal(compterSuguru(lignes, colonnes, zone, tailles, donnees, 2), 1,
                `suguru ${JSON.stringify(reglages)} : la grille n'a pas UNE solution`);
        }
    }
    for (const reglages of reglagesDe('logi-chemin-nombres')) {
        for (const it of tirer('logi-chemin-nombres', 2, reglages)) {
            const { lignes, colonnes } = it.meta;
            const donnees = Array.from({ length: lignes }, (_, r) =>
                Array.from({ length: colonnes }, (_, c) => {
                    const k = it.meta.cases.find(x => x.r === r && x.c === c);
                    return k && k.type === 'donnee' ? k.valeur : 0;
                }));
            assert.equal(compterChemins(lignes, colonnes, donnees, 2), 1,
                `chemin ${JSON.stringify(reglages)} : la grille n'a pas UN chemin`);
        }
    }
});

test('ET TOUTE RECHERCHE PAR RETOUR SUR SES PAS RESTE PLAFONNÉE', () => {
    // CETTE GARDE EST LA COMPAGNE DE LA PRÉCÉDENTE, et elle existe parce que
    // la précédente ne suffit pas. `epreuveTombe` l'a montré : en retirant le
    // budget de nœuds du Kakuro, la garde de temps est restée VERTE — ses
    // douze graines par réglage ne tombaient pas sur la grille pathologique.
    // Mesuré ensuite à la main, ce budget retiré : neuvième décile 944 ms et
    // **pire cas 15 512 ms** en 5 × 5 difficile, contre 214 ms avec lui. Le
    // défaut était donc bien réel, et la garde de temps aveugle à CELUI-LÀ.
    //
    // ON GARDE DONC LE PLAFOND LUI-MÊME, dans la source. C'est une garde de
    // forme et non de comportement : elle ne dit pas que le logiciel est
    // rapide, elle dit que personne n'a retiré la borne qui l'empêche de
    // s'emballer. Les deux ensemble couvrent ce qu'aucune ne couvre seule.
    //
    // POURQUOI UN NOMBRE DE NŒUDS ET NON DES MILLISECONDES, partout : une
    // grille doit se refabriquer à l'identique depuis sa graine, sur la
    // tablette de l'élève comme ici. Un plafond en temps la rendrait
    // dépendante de la charge du processeur, et deux élèves à la même graine
    // n'auraient pas la même grille.
    const ATTENDUS = {
        'kakuro.js': ['PLAFOND_NOEUDS', 'PLAFOND_REMPLIR'],
        'suguru.js': ['PLAFOND_NOEUDS', 'PLAFOND_REMPLIR'],
        'cheminNombres.js': ['PLAFOND_NOEUDS', 'PLAFOND_CHEMIN']
    };
    for (const [nom, plafonds] of Object.entries(ATTENDUS)) {
        const src = readFileSync(new URL(`../js/core/generators/${nom}`, import.meta.url), 'utf8');
        for (const p of plafonds) {
            const m = src.match(new RegExp(`const ${p}\\s*=\\s*([^;]+);`));
            assert.ok(m, `${nom} : ${p} a disparu — une recherche sans borne est revenue`);
            const valeur = Number(m[1].trim());
            assert.ok(Number.isFinite(valeur) && valeur > 0,
                `${nom} : ${p} vaut « ${m[1].trim()} », qui ne borne rien`);
        }
    }
});

/**
 * CE QU'UN JEU S'AUTORISE pour fabriquer DOUZE grilles de CHACUN de ses
 * réglages. Les chiffres mesurés le 26 octobre sont en commentaire ; le seuil
 * leur laisse à peu près quatre fois leur temps.
 */
const BUDGETS = {
    'logi-kakuro': 10000,          //  2 319 ms mesurées
    'logi-yohaku': 4000,           //    779 ms
    'logi-suguru': 7000,           //  1 551 ms
    'logi-gratte-ciel': 6000,      //  1 314 ms
    'logi-chemin-nombres': 6000,   //  1 295 ms
    'logi-allumettes': 2000        //      0 ms
};

test('ET AUCUNE GRILLE NE SE FAIT ATTENDRE', () => {
    // POURQUOI CETTE GARDE EXISTE : ces six jeux ont fait passer `npm test` de
    // quatre minutes à plus de vingt-cinq. La cause tenait en une graine sur
    // quarante — le Kakuro en 5 × 5 demandait **141 268 ms pour UNE grille**,
    // le Suguru en 6 × 6 sept secondes par grille, le Chemin en 6 × 6 ne
    // rendait pas la main en quarante secondes. Trois recherches par retour
    // sur ses pas sans plafond.
    //
    // ET C'EST AUSSI LA TABLETTE DE L'ÉLÈVE : une grille qui demande deux
    // minutes sur cette machine-ci n'arrive jamais sur la sienne.
    //
    // ── DOUZE GRAINES PAR RÉGLAGE, ET C'EST LE CŒUR DE LA GARDE ────────────
    //
    // Premier jet : deux graines par réglage, et un plafond par grille. Vu
    // tomber ? NON — `epreuveTombe` a répondu « CETTE ÉPREUVE NE GARDE
    // RIEN ». Le défaut remis coûtait sept secondes PAR GRILLE LENTE, et les
    // deux graines tirées n'en étaient pas : le défaut se cache dans une
    // graine sur quarante, exactement comme celui qu'on a mis une demi-heure
    // à trouver. Une garde qui échantillonne deux graines est aveugle à la
    // queue de la distribution — c'est-à-dire aveugle au seul défaut qu'on ait
    // jamais vu ici.
    //
    // ON MESURE DONC UN TOTAL, pas un pire cas : douze graines de chaque
    // réglage, et le temps de l'ensemble. Une seule grille pathologique
    // déborde le budget du jeu entier, et c'est ce qu'on veut. Le total nomme
    // AUSSI le coupable, ce que `npm test` ne faisait pas. Pour le détail
    // réglage par réglage : `node tools/vitesseDesJeux.mjs`.
    for (const id of TOUS) {
        const t = performance.now();
        let grilles = 0;
        for (const reglages of reglagesDe(id)) { tirer(id, 12, reglages); grilles += 12; }
        const dt = Math.round(performance.now() - t);
        assert.ok(dt < BUDGETS[id],
            `${id} : ${dt} ms pour ${grilles} grilles, au-delà des ${BUDGETS[id]} ms permises`);
    }
});

test('LA DIAGONALE DU KAKURO VA DANS LE MÊME SENS AUX TROIS ENDROITS', () => {
    // CE DÉFAUT A TRAVERSÉ TOUTES LES AUTRES GARDES EN ÉTANT VERT PARTOUT.
    // Les cases étaient carrées, rien ne débordait, les cibles faisaient leurs
    // quarante-quatre pixels, la grille se remplissait et se validait — et le
    // trait blanc passait EXACTEMENT par les deux coins où sont écrites les
    // deux sommes, qu'il barrait l'une et l'autre. Il ne s'est vu que sur une
    // PHOTO. Aucun compte ne l'aurait dit, jamais.
    //
    // LA CAUSE : un dégradé pose ses bandes perpendiculairement à son axe, donc
    // « to bottom right » trace le trait qui MONTE de la gauche vers la droite.
    // Il faut « to top right » pour obtenir la diagonale haut-gauche →
    // bas-droite, celle de toutes les grilles publiées.
    //
    // ET LES TROIS RENDUS SE CONTREDISAIENT : le PDF traçait la bonne, l'écran
    // et l'aperçu d'impression la mauvaise. Un élève sur tablette et le même
    // élève sur la feuille ne voyaient pas la même grille.
    const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

    const css = lire('css/modules.css');
    const bloc = css.slice(css.indexOf('.gn-cell--indice::after'));
    assert.ok(/to top right/.test(bloc.slice(0, 400)),
        'css/modules.css : la diagonale de la case d\'indice barre les deux sommes');

    const fiches = lire('js/ui/fiches/grilles.js');
    assert.ok(/to top right, transparent calc\(50% - \.5px\)/.test(fiches),
        'l\'aperçu d\'impression trace la diagonale à l\'envers de l\'écran');
    // ET LE PDF, qui trace à la main : du coin haut-gauche au coin bas-droite.
    assert.ok(/doc\.line\(X, Y, X \+ s, Y \+ s\)/.test(fiches),
        'le PDF ne trace plus la diagonale haut-gauche → bas-droite');

    // LES DEUX SOMMES RESTENT DANS LEURS COINS, de part et d'autre du trait :
    // la ligne en haut à DROITE, la colonne en bas à GAUCHE.
    assert.ok(/\.gn-ind--droite \{ top:/.test(css) && /\.gn-ind--bas \{ bottom:/.test(css),
        'les deux sommes ont quitté leurs coins');
});
