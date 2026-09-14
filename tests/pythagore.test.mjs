// Pythagore : chaque marche est un niveau, et chaque calcul tombe juste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    THEOREME, TRIPLETS, NIVEAUX, niveauDe, niveauProgressif, niveauPour,
    tirerTriangle, cotesDe, direTriangle,
    egaliteDe, verifierEgalite, etapesCalcul, groupesMelanges, verifierPhrase,
    redactionComplete, ligneEnTexte, memeEcriture
} from '../js/core/pythagore.js';
import { makeRng } from '../js/core/ids.js';

test('tous les triplets sont pythagoriciens', () => {
    // C'est la promesse du module : la racine tombe TOUJOURS juste. Un seul
    // triplet faux et un élève rencontre √145 au milieu du niveau 4.
    for (const [a, b, c] of TRIPLETS) {
        assert.equal(a * a + b * b, c * c, `${a}² + ${b}² ≠ ${c}²`);
    }
});

test('l\'hypoténuse est en face de l\'angle droit, et c\'est la plus longue', () => {
    for (let g = 0; g < 30; g++) {
        const t = tirerTriangle(makeRng(`h${g}`));
        const { hypo, cathetes, sommetDroit } = cotesDe(t);
        // Elle ne touche pas le sommet de l'angle droit.
        assert.ok(!hypo.nom.includes(sommetDroit),
            `l'hypoténuse ${hypo.nom} touche l'angle droit ${sommetDroit}`);
        // Les cathètes en partent toutes les deux.
        cathetes.forEach(c => assert.ok(c.nom.includes(sommetDroit)));
        // Et elle domine.
        assert.ok(hypo.longueur > cathetes[0].longueur && hypo.longueur > cathetes[1].longueur);
    }
});

test('l\'angle droit change de sommet : la définition, pas la place', () => {
    const vus = new Set();
    for (let g = 0; g < 40; g++) vus.add(tirerTriangle(makeRng(`a${g}`)).angleDroit);
    assert.equal(vus.size, 3, 'l\'angle droit doit visiter les trois sommets');
});

test('l\'égalité se vérifie dans les deux sens, l\'erreur est nommée', () => {
    const t = tirerTriangle(makeRng('eg'), { triplet: [3, 4, 5] });
    const e = egaliteDe(t);
    assert.ok(verifierEgalite(t, e.gauche, e.droits[0], e.droits[1]).juste);
    // L'addition est commutative : l'autre ordre vaut autant.
    assert.ok(verifierEgalite(t, e.gauche, e.droits[1], e.droits[0]).juste);
    // Une cathète à gauche : l'erreur dit QUOI relire — l'hypoténuse.
    const faux = verifierEgalite(t, e.droits[0], e.gauche, e.droits[1]);
    assert.ok(!faux.juste);
    assert.match(faux.message, /HYPOTÉNUSE/);
});

test('le calcul de l\'hypoténuse additionne, celui d\'une cathète soustrait', () => {
    const t = tirerTriangle(makeRng('calc'), { triplet: [6, 8, 10] });
    const { hypo, cathetes } = cotesDe(t);

    const versHypo = etapesCalcul(t);
    assert.equal(versHypo.resultat, 10);
    assert.equal(versHypo.carre, 100);
    const texteHypo = versHypo.lignes.map(ligneEnTexte);
    assert.match(texteHypo.at(-1), /√100/, 'la dernière ligne revient à la longueur');
    assert.ok(texteHypo.some(l => /= 6² \+ 8²|= 8² \+ 6²/.test(l)),
        'une ligne remplace les lettres par les mesures');
    assert.ok(texteHypo.some(l => /= 36 \+ 64|= 64 \+ 36/.test(l)),
        'une ligne calcule le carré de chaque longueur');

    const versCote = etapesCalcul(t, cathetes[0].nom);
    assert.equal(versCote.resultat, cathetes[0].longueur);
    assert.equal(versCote.carre, hypo.longueur ** 2 - cathetes[1].longueur ** 2);
    assert.ok(versCote.lignes.map(ligneEnTexte).some(l => l.includes('−')),
        'chercher une cathète, c\'est soustraire');
});

test('le résultat n\'est jamais donné dans une ligne d\'avant', () => {
    // Rémy : « tu donnes la réponse sous la racine carrée ». Le radicande vaut
    // exactement ce que la ligne précédente demande de trouver : il ne doit
    // donc PAS apparaître comme texte tout fait — il est marqué à part, et
    // l'écran ne l'affiche qu'une fois la ligne du dessus validée.
    for (let g = 0; g < 8; g++) {
        const t = tirerTriangle(makeRng(`don${g}`));
        const { cathetes } = cotesDe(t);
        for (const chercher of [null, cathetes[0].nom]) {
            const calc = etapesCalcul(t, chercher);
            const radical = calc.lignes.at(-1).morceaux.find(m => m.racine !== undefined);
            assert.ok(radical, 'la dernière ligne porte un radicande à part');
            assert.equal(radical.racine, calc.carre);
            // Aucune ligne ne l'écrit en clair dans son texte.
            for (const l of calc.lignes) {
                for (const m of l.morceaux) {
                    if (m.texte === undefined) continue;
                    assert.ok(!m.texte.includes(String(calc.carre)),
                        `le carré ${calc.carre} est écrit tout fait dans « ${m.texte} »`);
                }
            }
            // Et chaque case a de quoi expliquer sa faute.
            for (const l of calc.lignes) {
                for (const m of l.morceaux) {
                    if (m.champ === undefined) continue;
                    assert.equal(typeof m.aide, 'string');
                    assert.ok(m.aide.length > 10, 'une case ratée doit dire pourquoi');
                }
            }
        }
    }
});

test('la phrase se mélange et se corrige au premier mot faux', () => {
    const m = groupesMelanges(makeRng('mel'));
    assert.notDeepEqual(m, THEOREME.groupes);
    assert.deepEqual([...m].sort(), [...THEOREME.groupes].sort());
    assert.ok(verifierPhrase(THEOREME.groupes).juste);
    const faute = verifierPhrase([THEOREME.groupes[1], THEOREME.groupes[0], ...THEOREME.groupes.slice(2)]);
    assert.ok(!faute.juste);
    assert.equal(faute.premierFaux, 0, 'la correction pointe le PREMIER rang faux');
});

test('la rédaction complète a ses trois lignes, et aucun trou', () => {
    for (let g = 0; g < 12; g++) {
        const t = tirerTriangle(makeRng(`rc${g}`));
        const { cathetes } = cotesDe(t);
        for (const chercher of [null, cathetes[0].nom]) {
            const lignes = redactionComplete(t, chercher);
            assert.equal(lignes.length, 3);
            // Rémy : « la rédaction doit être toujours la même ».
            assert.match(lignes[0], /^Je sais que : /);
            // Rémy : « enlève "si un triangle est rectangle…", écris juste
            // : Or : d'après le théorème de Pythagore ». Le « Je sais que »
            // a déjà posé que le triangle est rectangle.
            assert.equal(lignes[1], 'Or : d\'après le théorème de Pythagore');
            assert.match(lignes[2], /^Donc : /);
            assert.ok(!lignes.join(' ').includes('undefined'));
            assert.match(lignes[2], / cm\.$/, 'la réponse finale porte son unité');
        }
    }
});

test('six niveaux, du doigt vers la rédaction', () => {
    assert.equal(NIVEAUX.length, 6);
    assert.equal(niveauDe(1).cle, 'hypotenuse');
    assert.equal(niveauDe(6).cle, 'redaction');
    assert.equal(niveauDe(99).cle, 'hypotenuse', 'niveau inconnu : on repart du début');
    assert.match(direTriangle(tirerTriangle(makeRng('d'))), /rectangle en [A-Z]/);
});

// --- Sur le papier ------------------------------------------------------------

import { pythagoreGenerator } from '../js/core/generators/pythagore.js';

test('le générateur écrit des énoncés complets pour la feuille', () => {
    for (let g = 1; g <= 10; g++) {
        const it = pythagoreGenerator.generate({ chercher: (g % 2) ? 'hypotenuse' : 'cote' }, { rng: makeRng(`p${g}`), index: g });
        assert.match(it.prompt.text, /rectangle en/);
        assert.match(it.prompt.text, /cm/);
        assert.ok(Number(it.answer) > 0);
        assert.ok(!/undefined|NaN/.test(it.explanation));
        assert.match(it.explanation, /√/, 'la correction montre la racine');
    }
});

// --- Les six marches à la suite ---------------------------------------------

test('en progressif, l\'escalier monte du doigt à la rédaction', () => {
    // Douze questions, six marches : deux questions chacune.
    const vus = [];
    for (let r = 1; r <= 12; r++) vus.push(niveauProgressif(r, 12).id);
    assert.deepEqual(vus, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);

    // On commence toujours par montrer l'hypoténuse et on finit par rédiger,
    // quelle que soit la longueur.
    for (const n of [6, 10, 12, 20, 30]) {
        assert.equal(niveauProgressif(1, n).id, 1, `${n} questions : ne commence pas au niveau 1`);
        assert.equal(niveauProgressif(n, n).id, NIVEAUX.length, `${n} questions : ne finit pas à la rédaction`);
    }
});

test('un exercice trop court pour six marches ne les saute pas dans le désordre', () => {
    // Trois questions : une marche par question, et l'escalier reste croissant.
    const ids = [1, 2, 3].map(r => niveauProgressif(r, 3).id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b), 'l\'escalier redescend');
    assert.equal(ids[0], 1);
});

test('un niveau fixé reste fixé, et un réglage absent ne plante pas', () => {
    for (const r of [1, 5, 20]) {
        assert.equal(niveauPour({ niveau: 4 }, r, 20).id, 4, `question ${r}`);
        assert.equal(niveauPour({ niveau: '4' }, r, 20).id, 4, `question ${r} (chaîne)`);
    }
    assert.equal(niveauPour({}, 1, 10).id, 1);
    assert.equal(niveauPour(null, 1, 10).id, 1);
});

// --- L'ÉCRITURE, PAS SEULEMENT LE RÉSULTAT -----------------------------------
//
// Rémy : « il faut un pavé numérique avec la touche ², pour que l'élève ait le
// réflexe de le mettre. Car là c'est trop guidé. » Les « ² », les « + » et les
// « − » étaient imprimés d'avance entre des cases d'un chiffre : on ne les
// écrivait jamais. Les deux lignes du milieu s'écrivent maintenant en entier.

test('LES LIGNES DU MILIEU SE TAPENT EN ENTIER, CARRÉS COMPRIS', () => {
    const t = tirerTriangle(makeRng('ecr'), { triplet: [8, 15, 17] });
    const calc = etapesCalcul(t);
    const exprs = calc.lignes.flatMap(l => l.morceaux.filter(m => m.expression));
    assert.equal(exprs.length, 2, 'deux lignes s\'écrivent : les mesures, puis leurs carrés');
    assert.ok(exprs[0].attendus.some(a => /8²/.test(a) && /15²/.test(a)),
        'la première porte les deux carrés');
    assert.ok(exprs[1].attendus.some(a => /64/.test(a) && /225/.test(a)),
        'la seconde porte les deux carrés calculés');
    // Et plus aucun « ² » offert en texte sur ces lignes-là.
    calc.lignes.forEach(l => {
        if (!l.morceaux.some(m => m.expression)) return;
        l.morceaux.filter(m => m.texte !== undefined).forEach(m => {
            assert.ok(!/^²/.test(m.texte.trim()),
                `le petit deux est encore imprimé d'avance dans « ${m.texte} »`);
        });
    });
});

test('trois façons d\'écrire le même carré se valent, un carré oublié ne vaut rien', () => {
    const attendus = ['8² + 15²', '15² + 8²'];
    assert.ok(memeEcriture('8² + 15²', attendus));
    assert.ok(memeEcriture('8²+15²', attendus), 'les espaces ne comptent pas');
    assert.ok(memeEcriture('8^2 + 15^2', attendus), 'le clavier d\'ordinateur écrit ^2');
    assert.ok(memeEcriture(' 15²+8² ', attendus), 'l\'addition est commutative');
    assert.ok(!memeEcriture('8 + 15', attendus), 'sans les carrés, ce n\'est pas Pythagore');
    assert.ok(!memeEcriture('8² + 15', attendus), 'un seul carré ne suffit pas');
    assert.ok(!memeEcriture('8² − 15²', attendus), 'ici on additionne');
});

test('la soustraction ne se commute pas', () => {
    const t = tirerTriangle(makeRng('sous'), { triplet: [8, 15, 17] });
    const { cathetes } = cotesDe(t);
    const calc = etapesCalcul(t, cathetes[0].nom);
    const premiere = calc.lignes.flatMap(l => l.morceaux.filter(m => m.expression))[0];
    assert.equal(premiere.attendus.length, 1, 'a − b n\'est pas b − a : une seule écriture');
    assert.ok(/−/.test(premiere.attendus[0]));
});

test('un tiret ordinaire vaut le vrai signe moins', () => {
    // L'élève tape « - » au clavier, le sujet écrit « − » : le même calcul.
    assert.ok(memeEcriture('17² - 8²', ['17² − 8²']));
});

test('chaque écriture attendue explique ce qu\'on attend', () => {
    for (let g = 0; g < 6; g++) {
        const t = tirerTriangle(makeRng(`aide${g}`));
        const { cathetes } = cotesDe(t);
        for (const chercher of [null, cathetes[0].nom]) {
            etapesCalcul(t, chercher).lignes.forEach(l => l.morceaux.forEach(m => {
                if (!m.expression) return;
                assert.ok(m.aide && m.aide.length > 30, 'une écriture ratée doit dire pourquoi');
                assert.ok(Array.isArray(m.attendus) && m.attendus.length >= 1);
            }));
        }
    }
});
