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
import * as fx from '../js/core/maths/formule.js';
import * as P from '../js/core/maths/polynome.js';
import { ecrireSomme, groupesSemblables }
    from '../js/core/reductionPuissances.js';
import { readFileSync } from 'node:fs';

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

test('LE DESSIN N\'EST LÀ QUE LÀ OÙ IL DIT VRAI', () => {
    // RÉMY : « pour le double développement, ta figure pour (x−6)(x−2) n'a pas
    // sens, idem pour du genre (x−a)(x+a), ne la mets pas. »
    //
    // Ce test disait l'inverse : « chaque question porte DEUX dessins ». Il
    // était juste tant qu'on croyait qu'un support visuel valait partout — et
    // il rendait le défaut invisible, puisqu'il EXIGEAIT le dessin qui ment.
    //
    // La règle est maintenant : le modèle de l'aire traduit le calcul, donc il
    // n'a de sens que si toutes les longueurs sont positives. Un côté de
    // longueur −6 n'existe pas, et la case (−6)(−2) se dessinait comme une
    // aire positive dans un rectangle à deux côtés négatifs.
    const toutPositif = (it) => !it.prompt.text.includes('\u2212');
    let avec = 0, sans = 0;
    for (const b of BARREAUX) {
        for (let i = 0; i < 60; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`v_${b}_${i}`) });
            const dessine = it.prompt.html.includes('dv-figure');
            if (toutPositif(it)) {
                assert.ok(dessine, `[b${b}] tout est positif et il n'y a pas de dessin : `
                    + `${it.prompt.papier}`);
                avec++;
            } else {
                assert.ok(!dessine, `[b${b}] une longueur est négative et le dessin est `
                    + `quand même posé : ${it.prompt.papier}`);
                sans++;
            }
            // QUAND IL Y A UN DESSIN, IL Y EN A DEUX — l'énoncé et l'indice —
            // et celui de l'énoncé ne porte aucune aire : les aires sont le
            // résultat. C'est la règle des deux dessins, et elle s'est déjà
            // fait prendre en défaut trois fois dans ce projet.
            if (!dessine) {
                assert.ok(!it.schemas[1] || !it.schemas[1].includes('dv-figure'),
                    `[b${b}] pas de dessin à l'énoncé mais un à l'indice`);
                continue;
            }
            assert.ok(it.schemas[1] && it.schemas[1].includes('dv-figure'),
                `[b${b}] indice sans dessin`);
            assert.ok(!it.prompt.html.includes('dv-aire'),
                `[b${b}] le dessin de l'énoncé écrit déjà les aires`);
            assert.match(it.schemas[1], /dv-aire/, `[b${b}] l'indice ne montre pas les aires`);
        }
    }
    // Et le chapitre garde de vrais dessins : la règle retire les faux, elle
    // ne vide pas le support visuel.
    assert.ok(avec > 200, `seulement ${avec} questions dessinées sur ${avec + sans}`);
    assert.ok(sans > 200, `seulement ${sans} questions sans dessin — la règle ne mord pas`);
});

// LE SIGNE D'UNE CASE EST UN CALCUL, PAS UNE DONNÉE.
//
// Il ne reste de boîte double que là où les quatre longueurs sont positives —
// donc plus aucune case négative à colorer. Ce que ce test garde désormais,
// c'est que l'énoncé n'annonce jamais un signe : ni par une case en pointillé,
// ni par une aire écrite d'avance.
test('un énoncé ne colore ni ne chiffre jamais ses cases', () => {
    for (const b of BARREAUX) {
        for (let i = 0; i < 60; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`s_${b}_${i}`) });
            if (!it.prompt.html.includes('dv-figure')) continue;
            assert.ok(!it.prompt.html.includes('dv-aire'),
                `[b${b}] l'énoncé écrit les aires`);
            // Un dessin ne subsiste que si tout est positif : plus aucune case
            // ne peut être négative, ni à l'énoncé ni à l'indice.
            assert.ok(!it.prompt.html.includes('dv-case--retire'),
                `[b${b}] l'énoncé annonce le signe des cases`);
        }
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

test('les exercices sont au catalogue, et montent dans l\'ordre', () => {
    const miens = exercices.filter(e => e.generatorId === 'lit.developpement');
    assert.equal(miens.length, 15, 'onze barreaux, deux révisions, deux pas à pas');
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

test('LE PAS À PAS DU DÉVELOPPEMENT — une ligne pour chaque geste', () => {
    // RÉMY : « on peut proposer une ligne pour pouvoir le taper. »
    //
    // C'est la ligne que les flèches dessinent : les produits ÉCRITS avant
    // d'être calculés. Celui qui la saute est celui qui oublie les deux
    // produits du milieu, et un « faux » sur la réponse entière ne dit pas
    // lequel des quatre a manqué.
    const pas = exercices.filter(e => /^dev-\w+-pas$/.test(e.id));
    assert.equal(pas.length, 2, 'un pas à pas simple, un double');
    pas.forEach(e => assert.equal(e.params.etapes, 'oui',
        `${e.id} : le pas à pas n'est pas activé`));

    for (const b of BARREAUX) {
        for (let i = 0; i < 40; i++) {
            const it = G.generate({ barreau: String(b), etapes: 'oui' },
                { rng: makeRng(`pp_${b}_${i}`) });
            assert.ok(it.meta.etapes && it.meta.etapes.length >= 1,
                `[b${b}] pas d'étapes alors qu'on les demande`);
            assert.equal(it.meta.saisieSeule, true, `[b${b}] le clavier ne prend pas la main`);
            assert.ok(it.meta.titreFinal, `[b${b}] la dernière ligne n'a pas de nom`);
            // LA CHAÎNE EST UNE CHAÎNE : chaque ligne vaut l'énoncé. Si une
            // seule ne le valait pas, on écrirait une suite d'égalités
            // fausses, ce qui est pire qu'une liste.
            const depart = P.lireSaisie(it.prompt.papier
                .replace('Développer et réduire : ', ''), fx);
            for (const e of it.meta.etapes) {
                const ligne = P.lireSaisie(e.montrer, fx);
                assert.ok(ligne, `[b${b}] « ${e.montrer} » illisible`);
                assert.ok(P.egaux(ligne, depart),
                    `[b${b}] « ${e.montrer} » ne vaut pas « ${it.prompt.papier} »`);
                assert.ok(e.verifie(e.montrer.replace(/\s+/g, '')).juste,
                    `[b${b}] « ${e.montrer} » refusée à sa propre étape`);
                // ET LA LIGNE D'APRÈS NE PASSE PAS À SA PLACE : les deux sont
                // ÉGALES, donc le juge des polynômes l'accepterait, et
                // l'étape serait sautable — c'est-à-dire inexistante.
                const v = e.verifie(it.reponsePapier.replace(/\s+/g, ''));
                assert.ok(v && !v.juste,
                    `[b${b}] la réponse réduite passe à l'étape « ${e.titre} »`);
            }
        }
    }
});

test('le pas à pas se tape : × et parenthèses sont au pavé quand il en faut', () => {
    // Le pavé se construit d'après `item.meta`. Une ligne qui demande un
    // signe que le pavé n'offre pas est intapable — c'est arrivé une fois, sur
    // le « ² » du barreau 3 de la factorisation, et personne ne l'a vu parce
    // que les tests ne regardaient que la réponse finale.
    const signes = (item) => {
        const t = [item.meta.lettre || 'x', '²'];
        if ((item.meta.degreMax || 2) >= 3) t.push('³');
        t.push('+', '−');
        if (item.meta.multiplication) t.push('×');
        if (item.meta.parentheses) t.push('(', ')');
        return t.concat('0123456789'.split(''));
    };
    for (const b of BARREAUX) {
        for (let i = 0; i < 40; i++) {
            const it = G.generate({ barreau: String(b), etapes: 'oui' },
                { rng: makeRng(`pv_${b}_${i}`) });
            const touches = signes(it).sort((x, y) => y.length - x.length);
            for (const e of [...it.meta.etapes, { montrer: it.reponsePapier }]) {
                let reste = String(e.montrer).replace(/\s+/g, '');
                const manque = new Set();
                while (reste) {
                    const k = touches.find(x => reste.startsWith(x));
                    if (k) { reste = reste.slice(k.length); continue; }
                    manque.add(reste[0]);
                    reste = reste.slice(1);
                }
                assert.deepEqual([...manque], [],
                    `[b${b}] « ${e.montrer} » demande ${[...manque].join(' ')}, `
                    + 'que le pavé n\'a pas');
            }
        }
    }
});


// ── « C'EST BON, MAIS IL FAUT RÉDUIRE » ─────────────────────────────────────
//
// RÉMY, capture à l'appui, devant « x²+2x+5x+10 » tapé sous (x + 2)(x + 5) :
// « je propose cette réponse, tu peux dire que c'est bon mais qu'il faut
// réduire, tu peux faire changer de couleur ce qui va ensemble ».
//
// Deux exigences, et la première est un changement de VERDICT, pas de phrase :
// une expression juste mais non réduite ne doit pas coûter de vie. Le message
// existait déjà ; il arrivait avec une faute.

/**
 * LA MÊME EXPRESSION, DÉVELOPPÉE MAIS PAS RÉDUITE — ce que l'élève écrit
 * quand il s'arrête au milieu. On coupe un terme en deux : c'est exactement
 * ce que produit la double distributivité avant le regroupement.
 */
const nonReduite = (reponse) => {
    const p = P.lireSaisie(reponse, fx);
    const c = P.coefficients(p);
    const coupe = c.findIndex(x => Math.abs(x) >= 2);
    if (coupe < 0) return null;
    const part = c[coupe] > 0 ? 1 : -1;
    const termes = [];
    for (let d = c.length - 1; d >= 0; d--) {
        if (c[d] === 0) continue;
        if (d === coupe) {
            termes.push({ coef: part, degre: d });
            termes.push({ coef: c[d] - part, degre: d });
        } else termes.push({ coef: c[d], degre: d });
    }
    return ecrireSomme(termes);
};

test('UNE RÉPONSE JUSTE MAIS NON RÉDUITE NE COMPTE PAS UNE FAUTE', () => {
    let vues = 0;
    for (const b of BARREAUX) {
        for (let i = 0; i < 30; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`nr_${b}_${i}`) });
            const moitie = nonReduite(it.reponsePapier);
            if (!moitie) continue;
            vues += 1;
            const v = it.verifieTexte(moitie);
            assert.equal(v.juste, false,
                `[b${b}] « ${moitie} » n'est pas réduite et passe pour finie`);
            assert.equal(v.inacheve, true,
                `[b${b}] « ${moitie} » est comptée FAUSSE : `
                + 'elle est juste, elle est inachevée');
            assert.match(v.pourquoi, /réduire/,
                `[b${b}] le message ne dit pas ce qui reste à faire`);
            // ET LA RÉPONSE RÉDUITE, ELLE, PASSE — sans quoi le test ci-dessus
            // se contenterait d'un juge qui refuse tout.
            const fini = it.verifieTexte(it.reponsePapier);
            assert.equal(fini.juste, true, `[b${b}] « ${it.reponsePapier} » refusée`);
            assert.ok(!fini.inacheve, `[b${b}] la réponse finale passe pour inachevée`);
        }
    }
    assert.ok(vues > 200, `seulement ${vues} cas construits : la mesure ne mesure rien`);
});

test('CE QUI VA ENSEMBLE SE COLORIE, ET RIEN D\'AUTRE', () => {
    // La couleur doit dire QUELS termes se réunissent. Sur une réponse non
    // réduite, il y a forcément au moins deux termes de même part littérale :
    // s'il n'y en avait pas, le coloriage annoncé n'apparaîtrait nulle part et
    // la phrase « les termes de la même couleur vont ensemble » mentirait.
    for (const b of BARREAUX) {
        for (let i = 0; i < 20; i++) {
            const it = G.generate({ barreau: String(b) }, { rng: makeRng(`col_${b}_${i}`) });
            const moitie = nonReduite(it.reponsePapier);
            if (!moitie) continue;
            const m = groupesSemblables(moitie).filter(x => x.terme);
            const colories = m.filter(x => x.groupe >= 0);
            assert.ok(colories.length >= 2,
                `[b${b}] « ${moitie} » : rien à colorier`);
            // Un terme colorié a toujours un camarade de la même couleur.
            for (const t of colories) {
                assert.ok(colories.filter(x => x.groupe === t.groupe).length >= 2,
                    `[b${b}] « ${t.texte} » est colorié tout seul`);
            }
            // Et la réponse RÉDUITE, elle, n'a plus rien à regrouper.
            const fini = groupesSemblables(it.reponsePapier)
                .filter(x => x.terme && x.groupe >= 0);
            assert.deepEqual(fini, [],
                `[b${b}] « ${it.reponsePapier} » est réduite et se colorie encore`);
        }
    }
});

test('L\'ACTIVITÉ NE SOUMET PAS UNE RÉPONSE INACHEVÉE', () => {
    // LA LECTURE DU SOURCE EST LE SEUL MOYEN ICI : `litteralSaisie` construit
    // son pavé dans le DOM, et l'importer demanderait un navigateur (voir
    // l'en-tête de reponseTapee.test.mjs). Ce que l'on vérifie est la seule
    // chose qui compte : le retour arrive AVANT `session.submit`, sans quoi la
    // vie est perdue avant même qu'on explique pourquoi elle ne devrait pas
    // l'être.
    const src = readFileSync(new URL('../js/core/activities/litteralSaisie.js',
        import.meta.url), 'utf8');
    const iInacheve = src.indexOf('verdict.inacheve');
    const iSubmit = src.indexOf('session.submit', src.indexOf('const valider'));
    assert.ok(iInacheve > 0, 'litteralSaisie ne regarde plus `inacheve`');
    assert.ok(iSubmit > 0, 'litteralSaisie ne soumet plus rien : test à revoir');
    assert.ok(iInacheve < iSubmit,
        'le test de `inacheve` passe APRÈS `session.submit` : la faute est '
        + 'comptée avant d\'être démentie');
    assert.match(src, /signalerInacheve/,
        'le signalement de l\'inachevé a disparu');
    assert.match(src, /ls-semblable/,
        'le coloriage des termes semblables a disparu');
});
