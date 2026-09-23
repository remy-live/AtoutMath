// DÉVELOPPER — le chapitre vérifié autrement que par le moteur qui l'a produit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « j'aimerais bien des exercices très progressifs et visuels sur le
// développement simple et double développement ».
//
// DEUX EXIGENCES, DONC DEUX FAMILLES DE CONTRÔLES.
//
// « TRÈS PROGRESSIF » se vérifie : chaque barreau n'ajoute qu'une chose, et
// aucun ne pose l'exercice d'un autre. C'est ce qui manquait au chapitre des
// fractions avant que Rémy ne le signale — une échelle qui démarre à deux
// gestes et saute à quatre.
//
// « VISUEL » se vérifie aussi, et pas seulement en constatant qu'un dessin
// existe : il en faut DEUX, et le dessin de l'énoncé ne doit pas résoudre la
// question. C'est la règle déjà tenue aux racines et à la factorisation, et
// elle s'est déjà fait prendre en défaut trois fois.
//
// ET LA JUSTESSE ne se vérifie pas en redemandant au moteur ce qu'il vient de
// dire. On évalue l'énoncé et la réponse en des points entiers, avec une
// arithmétique écrite ici, qui n'appelle ni `polynome` ni `formule`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { developpementGenerator as G, POUR_ESSAI } from '../js/core/generators/developpement.js';
import { SKILLS } from '../js/data/skills.js';
import { exercices } from '../js/data/catalog.js';

const BARREAUX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// ── L'ÉVALUATEUR INDÉPENDANT ────────────────────────────────────────────────
//
// Il lit le TEXTE de l'énoncé — celui que l'élève a sous les yeux et que la
// fiche papier imprime — et le calcule pour une valeur de x donnée. Il ne sait
// rien des polynômes ni des arbres : c'est le second chemin, et c'est ce qui
// rend la vérification honnête.

function valeur(expr, x) {
    const s = String(expr).replace(/−/g, '-').replace(/\s+/g, '');
    let i = 0;
    const somme = () => {
        let v = produit();
        while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const t = produit();
            v = op === '+' ? v + t : v - t; }
        return v;
    };
    const produit = () => {
        let v = unaire();
        for (;;) {
            if (s[i] === '*' || s[i] === '×') { i++; v *= unaire(); continue; }
            // La multiplication implicite : 3(x + 2), 2x, (x+1)(x+2).
            if (s[i] === '(' || /[0-9x]/.test(s[i] || '')) { v *= unaire(); continue; }
            return v;
        }
    };
    const unaire = () => (s[i] === '-' ? (i++, -unaire()) : puissance());
    const puissance = () => {
        const b = atome();
        if (s[i] === '²') { i++; return b * b; }
        if (s[i] === '^') { i++; return Math.pow(b, atome()); }
        return b;
    };
    const atome = () => {
        if (s[i] === '(') { i++; const v = somme(); i++; return v; }
        if (s[i] === 'x') { i++; return x; }
        let j = i;
        while (/[0-9]/.test(s[j] || '')) j++;
        const n = Number(s.slice(i, j)); i = j; return n;
    };
    const v = somme();
    if (i !== s.length) throw new Error(`reste « ${s.slice(i)} » dans « ${expr} »`);
    return v;
}

const POINTS = [-7, -3, -1, 0, 1, 2, 5, 11];

// Le lecteur de l'évaluateur se vérifie lui-même : s'il se trompait, il
// validerait le générateur sur ses propres erreurs.
test('l\'évaluateur du test lit correctement ce qu\'on lui donne', () => {
    assert.equal(valeur('3(x + 2)', 5), 21);
    assert.equal(valeur('−2(x − 5)', 1), 8);
    assert.equal(valeur('(x + 2)(x + 3)', 4), 42);
    assert.equal(valeur('(x − 7)²', 10), 9);
    assert.equal(valeur('2x² + 3x − 5', 3), 22);
    assert.equal(valeur('2(x + 1) + 3(x − 2)', 4), 16);
    assert.throws(() => valeur('3(x + 2', 1));
});

// ── LA JUSTESSE ─────────────────────────────────────────────────────────────

test('la réponse vaut l\'énoncé, en tout point', () => {
    let n = 0;
    for (const b of BARREAUX) {
        for (let i = 0; i < 120; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`j_${b}_${i}`) });
            const enonce = it.prompt.text.replace('Développe et réduis : ', '');
            const rep = it.choices.find(c => c.correct).texte;
            for (const x of POINTS) {
                assert.equal(valeur(enonce, x) + 0, valeur(rep, x) + 0,
                    `[b${b}] en x = ${x}, « ${enonce} » vaut ${valeur(enonce, x)} `
                    + `et « ${rep} » vaut ${valeur(rep, x)}`);
            }
            n++;
        }
    }
    assert.ok(n >= 1300, `seulement ${n} questions vérifiées`);
});

// LE CONTRÔLE QUI A LE PLUS SERVI DANS CE PROJET : un leurre qui vaut la bonne
// réponse est une SECONDE bonne réponse marquée fausse. Il ne se trouve qu'en
// évaluant — à la relecture, deux écritures différentes du même polynôme se
// ressemblent si peu qu'on ne les rapproche pas.
test('aucun leurre ne vaut la bonne réponse', () => {
    for (const b of BARREAUX) {
        for (let i = 0; i < 120; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`l_${b}_${i}`) });
            const rep = it.choices.find(c => c.correct).texte;
            for (const c of it.choices) {
                if (c.correct) continue;
                const identique = POINTS.every(x => valeur(c.texte, x) === valeur(rep, x));
                assert.ok(!identique,
                    `[b${b}] le leurre « ${c.texte} » vaut la bonne réponse « ${rep} »`);
                assert.ok(c.why && c.why.length >= 20,
                    `[b${b}] leurre sans explication : ${c.texte}`);
            }
            assert.equal(it.choices.length, 4, `[b${b}] ${it.choices.length} propositions`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
        }
    }
});

// ── LA PROGRESSION ──────────────────────────────────────────────────────────

test('chaque barreau tient sa promesse, et ne pose pas celle d\'un autre', () => {
    const enonces = (b, n = 200) => Array.from({ length: n }, (_, i) =>
        G.generate({ barreau: String(b) }, { rng: makeRng(`p_${b}_${i}`) })
            .prompt.text.replace('Développe et réduis : ', ''));

    // 1 à 4 : UNE parenthèse, précédée d'un facteur. 5 : deux.
    for (const b of [1, 2, 3, 4]) {
        for (const e of enonces(b)) {
            assert.equal((e.match(/\(/g) || []).length, 1,
                `barreau ${b} : « ${e} » n'a pas exactement une parenthèse`);
        }
    }
    for (const e of enonces(5)) {
        assert.equal((e.match(/\(/g) || []).length, 2,
            `barreau 5 : « ${e} » devrait enchaîner deux distributions`);
    }

    // 1 : tout positif. 2 : un moins DANS la parenthèse, le facteur positif.
    for (const e of enonces(1)) {
        assert.ok(!e.includes('−'), `barreau 1 : « ${e} » contient un moins`);
    }
    for (const e of enonces(2)) {
        assert.ok(e.includes('−'), `barreau 2 : « ${e} » n'a aucun moins`);
        assert.ok(!e.startsWith('−'), `barreau 2 : « ${e} » a un facteur négatif, c'est le 4`);
    }
    // 3 : un coefficient devant la lettre — sinon c'est le barreau 1 ou 2.
    for (const e of enonces(3)) {
        assert.match(e, /\d+x/, `barreau 3 : « ${e} » n'a pas de coefficient devant x`);
    }
    // 4 : le facteur est négatif, et c'est tout ce qui le distingue.
    for (const e of enonces(4)) {
        assert.ok(e.startsWith('−'), `barreau 4 : « ${e} » n'a pas de facteur négatif`);
    }

    // 6 à 11 : deux parenthèses (ou un carré), donc quatre produits.
    for (const b of [6, 7, 8, 9, 11]) {
        for (const e of enonces(b)) {
            assert.equal((e.match(/\(/g) || []).length, 2,
                `barreau ${b} : « ${e} » n'est pas un produit de deux parenthèses`);
        }
    }
    // 10 : le CARRÉ, écrit comme un carré — l'écrire en produit de deux
    // parenthèses identiques ôterait au barreau ce qu'il enseigne.
    for (const e of enonces(10)) {
        assert.match(e, /\)²$/, `barreau 10 : « ${e} » n'est pas écrit comme un carré`);
    }
    // 11 : la différence de carrés — les deux cases du milieu s'annulent, donc
    // la réponse n'a AUCUN terme en x. C'est la promesse même du barreau.
    for (let i = 0; i < 200; i++) {
        const it = G.generate({ barreau: '11' }, { rng: makeRng(`c11_${i}`) });
        const rep = it.choices.find(c => c.correct).texte;
        assert.ok(!/\dx(?!²)|[^\d]x(?!²)/.test(rep.replace(/x²/g, 'C')),
            `barreau 11 : « ${rep} » garde un terme en x, les deux cases devraient s'annuler`);
    }
});

// ── LE VISUEL, QUI EST LA DEMANDE ───────────────────────────────────────────

test('chaque question porte DEUX dessins, et celui de l\'énoncé ne résout rien', () => {
    for (const b of BARREAUX) {
        for (let i = 0; i < 60; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`v_${b}_${i}`) });
            assert.match(it.prompt.html, /dv-figure/, `[b${b}] énoncé sans dessin`);
            assert.ok(it.schemas[1] && it.schemas[1].includes('dv-figure'),
                `[b${b}] indice sans dessin`);
            // LE DESSIN DE L'ÉNONCÉ NE PORTE AUCUNE AIRE : les aires sont le
            // résultat. C'est la règle des deux dessins, et elle s'est déjà
            // fait prendre en défaut trois fois dans ce projet.
            assert.ok(!it.prompt.html.includes('dv-aire'),
                `[b${b}] le dessin de l'énoncé écrit déjà les aires`);
            assert.match(it.schemas[1], /dv-aire/, `[b${b}] l'indice ne montre pas les aires`);
        }
    }
});

// LE SIGNE D'UNE CASE EST UN CALCUL, PAS UNE DONNÉE.
//
// Au rectangle simple, un morceau négatif est une DIMENSION écrite dans
// l'énoncé : le dessiner en pointillé ne révèle rien, cela traduit en image ce
// que l'expression dit déjà. À la boîte double, le signe d'une case est le
// PRODUIT de ses deux bords — donc une part de la réponse. Coloré dès
// l'énoncé, il annonçait lesquelles des quatre cases sont négatives, ce qui
// est précisément la question du barreau 8.
test('la boîte double ne colore les cases que dans le dessin de l\'indice', () => {
    for (const b of [7, 8, 9, 11]) {
        for (let i = 0; i < 80; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`s_${b}_${i}`) });
            assert.ok(!it.prompt.html.includes('dv-case--retire'),
                `[b${b}] l'énoncé annonce le signe des cases`);
            // L'INDICE DISTINGUE LES CASES NÉGATIVES QUAND IL Y EN A.
            // Le barreau 9 tire le signe de sa seconde parenthèse au hasard —
            // il travaille les COEFFICIENTS, pas les signes —, si bien qu'une
            // question sur deux n'a aucune case négative. Exiger le pointillé
            // à chaque fois, comme le faisait la première version de ce test,
            // revenait à exiger du générateur une chose qu'il n'a jamais
            // promise.
            const aUnMoins = it.prompt.text.includes('\u2212');
            if (aUnMoins) {
                assert.match(it.schemas[1], /dv-case--retire/,
                    `[b${b}] l'indice ne distingue pas les cases négatives`);
            }
        }
    }
    // Au rectangle simple, au contraire, le morceau retiré se voit dès
    // l'énoncé — c'est une dimension, pas un produit.
    for (let i = 0; i < 80; i++) {
        const it = G.generate({ barreau: '2' }, { rng: makeRng(`s2_${i}`) });
        assert.match(it.prompt.html, /dv-case--retire/,
            'le morceau retiré devrait se voir dès l\'énoncé');
    }
});

// ── LE CHAPITRE EST BRANCHÉ ─────────────────────────────────────────────────

test('les deux compétences existent, et leurs prérequis aussi', () => {
    for (const id of G.skills) {
        assert.ok(SKILLS[id], `la compétence ${id} n'est pas déclarée`);
        // UN PRÉREQUIS FANTÔME NE LÈVE AUCUNE ERREUR : il rend seulement la
        // remédiation muette. `lit.developper.simple` avait d'ailleurs été
        // écrit par erreur, puis retiré, avant d'exister vraiment.
        for (const p of SKILLS[id].prereqs || []) {
            assert.ok(SKILLS[p], `${id} réclame ${p}, qui n'existe pas`);
        }
    }
    assert.ok(SKILLS['lit.developper.double'].prereqs.includes('lit.developper.simple'),
        'la double distributivité devrait exiger la simple');
});

test('les treize exercices sont au catalogue, et montent dans l\'ordre', () => {
    const miens = exercices.filter(e => e.generatorId === 'lit.developpement');
    assert.equal(miens.length, 13, 'onze barreaux et deux révisions');
    for (let r = 1; r <= 11; r++) {
        const e = miens.find(x => x.id === `dev-${r}`);
        assert.ok(e, `barreau ${r} absent du catalogue`);
        assert.match(e.title, new RegExp(`^${r}\\.`), 'le titre ne porte pas son rang');
        assert.ok(e.instruction && e.instruction.length >= 10);
        assert.equal(e.params.barreau, String(r));
    }
    // LA DISTRIBUTIVITÉ SIMPLE EST DU COLLÈGE, LA DOUBLE ENJAMBE LE LYCÉE.
    const niv = (id) => miens.find(x => x.id === id).tags.niveaux;
    assert.deepEqual(niv('dev-1'), ['4ème', '3ème']);
    assert.deepEqual(niv('dev-11'), ['3ème', '2nde']);
});

// ── LE DESSIN LUI-MÊME ──────────────────────────────────────────────────────

test('le schéma garde les rapports de grandeur : x est le plus large', () => {
    // Un schéma n'est pas à l'échelle — x est inconnu — mais il doit être
    // juste dans ses RAPPORTS, sinon il demande qu'on l'explique et ne sert
    // plus de support. Avec une valeur conventionnelle trop basse, « 7(x + 8) »
    // dessinait le morceau « 8 » plus large que le morceau « x ».
    const { terme, rectangleSvg } = POUR_ESSAI;
    const svg = rectangleSvg(7, [terme(1, 1), terme(8, 0)], false);
    const larg = [...svg.matchAll(/<rect[^>]*width="([\d.]+)"/g)].map(m => Number(m[1]));
    assert.equal(larg.length, 2);
    assert.ok(larg[0] > larg[1],
        `le morceau « x » fait ${larg[0]} et le morceau « 8 » ${larg[1]}`);
    // …et les rapports restent lisibles : pas de filet illisible à côté d'un x.
    assert.ok(larg[0] / larg[1] < 3,
        `rapport de ${(larg[0] / larg[1]).toFixed(1)} : la constante devient un filet`);
});
