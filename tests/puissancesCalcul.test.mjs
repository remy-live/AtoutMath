// CALCULER AVEC DES PUISSANCES — les trois règles, et leur raison.
//
// Rémy : « calculer avec des puissances ». Sa fiche y consacre une page, avec
// la même consigne en rouge à chaque exercice : « TU ÉCRIRAS LE CALCUL ! » Ce
// que ces tests gardent, c'est la faute universelle du chapitre — multiplier
// les exposants dans un produit, parce que le signe × est écrit sous les yeux
// de l'élève.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { puissanceTexte } from '../js/core/puissances.js';
import {
    ETAPES, ORDRE, puissance, puissanceCalcul, marchePour, puissancesCalculGenerator as G
} from '../js/core/generators/puissancesCalcul.js';

const item = (params = {}, index = 0, cle = 'pc') =>
    G.generate(params, { rng: makeRng(`${cle}-${index}`), index });

/** L'exposant d'une écriture « 10⁵ » ou « 2³ », relu depuis la chaîne. */
const HAUT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function exposantDe(texte) {
    const s = String(texte);
    let n = '', signe = 1;
    for (const c of s) {
        if (c === '⁻') signe = -1;
        else if (HAUT.includes(c)) n += String(HAUT.indexOf(c));
    }
    return n === '' ? null : signe * Number(n);
}

// --- L'écriture ---------------------------------------------------------------

test('une puissance s\'écrit avec un VRAI exposant, lisible partout', () => {
    assert.equal(puissance(2, 5), '2⁵');
    assert.equal(puissance(10, 12), '10¹²');
    assert.equal(puissance(10, -3), '10⁻³');
    // « TU ÉCRIRAS LE CALCUL ! » : l'exposant lui-même s'écrit comme un calcul.
    assert.equal(puissanceCalcul(10, 3, '+', 2), '10³⁺²');
    assert.equal(puissanceCalcul(10, 8, '-', 3), '10⁸⁻³');
});

test('la relecture d\'un exposant est fidèle — c\'est l\'outil des tests suivants', () => {
    assert.equal(exposantDe('10⁵'), 5);
    assert.equal(exposantDe('10⁻⁷'), -7);
    assert.equal(exposantDe('2¹²'), 12);
});

// --- Les trois règles -----------------------------------------------------------

test('LE PRODUIT AJOUTE LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'produit' }, i);
        const [a, b] = it.prompt.papier.split(' × ').map(exposantDe);
        assert.equal(exposantDe(it.answer), a + b, it.prompt.papier);
        assert.match(it.explanation, /AJOUTE/);
    }
});

test('LE QUOTIENT SOUSTRAIT LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'quotient' }, i);
        const [a, b] = it.prompt.papier.split(' ÷ ').map(exposantDe);
        assert.equal(exposantDe(it.answer), a - b, it.prompt.papier);
        assert.match(it.explanation, /SOUSTRAIT/);
    }
});

test('LA PUISSANCE DE PUISSANCE MULTIPLIE LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'puissanceDePuissance' }, i);
        // « (10⁴)³ » : le premier exposant est dans la parenthèse, le second
        // dehors — la relecture les concatène, on découpe donc à la fermante.
        const [dedans, dehors] = it.prompt.papier.split(')');
        assert.equal(exposantDe(it.answer), exposantDe(dedans) * exposantDe(dehors),
            it.prompt.papier);
        assert.match(it.explanation, /MULTIPLIE/);
    }
});

test('LES EXPOSANTS NÉGATIFS N\'AJOUTENT AUCUNE RÈGLE', () => {
    // Ils ne font qu'appliquer les mêmes avec des relatifs.
    for (let i = 0; i < 20; i++) {
        const p = item({ etape: 'produitRelatif' }, i);
        const [a, b] = p.prompt.papier.split(' × ').map(exposantDe);
        assert.equal(exposantDe(p.answer), a + b, p.prompt.papier);
        assert.ok(a < 0 || b < 0, `${p.prompt.papier} n'a aucun exposant négatif`);

        const q = item({ etape: 'quotientRelatif' }, i);
        const [c, d] = q.prompt.papier.split(' ÷ ').map(exposantDe);
        assert.equal(exposantDe(q.answer), c - d, q.prompt.papier);
        assert.ok(c < 0 && d < 0, `${q.prompt.papier} devrait avoir deux exposants négatifs`);
    }
});

test('L\'INVERSE CHANGE LE SIGNE DE L\'EXPOSANT', () => {
    for (let i = 0; i < 15; i++) {
        const it = item({ etape: 'inverse' }, i);
        // ET L'ÉNONCÉ NE PORTE PAS DE BARRE OBLIQUE. Sur le papier, une
        // fraction s'écrit en colonne : « 1 / 10⁴ » enseignerait le contraire
        // du cours. On dit « l'inverse de », qui est le mot du chapitre.
        assert.ok(!/\d\s*\/\s*\d/.test(it.prompt.papier), it.prompt.papier);
        assert.match(it.prompt.papier, /inverse/i);
        const depart = exposantDe(it.prompt.papier);
        assert.equal(exposantDe(it.answer), -depart, it.prompt.papier);
    }
});

// --- Les fautes du chapitre -----------------------------------------------------

test('LA FAUTE UNIVERSELLE EST TOUJOURS PROPOSÉE : multiplier les exposants', () => {
    // Elle n'est pas de l'étourderie : le signe × est écrit sous les yeux de
    // l'élève, et il l'applique à ce qu'il voit. Le distracteur doit donc être
    // là à chaque question du produit, et son explication doit le NOMMER.
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'produit' }, i);
        const [a, b] = it.prompt.papier.split(' × ').map(exposantDe);
        if (a * b === a + b) continue;           // 2² × 2² : les deux coïncident
        const piege = it.choices.find(c => exposantDe(c.value) === a * b);
        assert.ok(piege, `${it.prompt.papier} : ${puissanceTexte(a * b)} n'est pas proposé`);
        assert.match(piege.why, /AJOUTE/);
    }
});

test('(−3)² ET −3² : la parenthèse décide, et le piège le dit', () => {
    let avec = 0, sans = 0;
    for (let i = 0; i < 30; i++) {
        const it = item({ etape: 'carreNegatif' }, i);
        const parenthese = it.prompt.papier.startsWith('(');
        if (parenthese) { avec++; assert.ok(it.answer > 0, it.prompt.papier); }
        else { sans++; assert.ok(it.answer < 0, it.prompt.papier); }
        // L'opposé est toujours proposé : c'est LA faute.
        const oppose = it.choices.find(c => c.value === -it.answer);
        assert.ok(oppose, `${it.prompt.papier} : l'opposé n'est pas proposé`);
        assert.match(oppose.why, /parenthèse|Sans parenthèse/i);
        // Et les étiquettes portent le vrai signe moins.
        it.choices.forEach(c => assert.ok(!String(c.label).includes('-'),
            `étiquette au trait d'union : ${c.label}`));
    }
    assert.ok(avec >= 5 && sans >= 5, `les deux écritures doivent tomber : ${avec} / ${sans}`);
});

test('IL FAUT LA MÊME BASE — et la question dont la réponse est « on ne peut pas »', () => {
    // 2³ × 5³ ne se met pas sous la forme d'une seule puissance : la règle
    // compte des facteurs ÉGAUX. Sans cette marche, l'élève ajoute les
    // exposants partout — et d'autant plus volontiers qu'ils sont ici les mêmes.
    let impossibles = 0, possibles = 0;
    for (let i = 0; i < 30; i++) {
        const it = item({ etape: 'memeBase' }, i);
        const [g, d] = it.prompt.papier.replace(' = ', '').split(' × ');
        const memes = g[0] === d[0];
        if (memes) {
            possibles++;
            assert.equal(exposantDe(it.answer), exposantDe(g) + exposantDe(d), it.prompt.papier);
        } else {
            impossibles++;
            assert.equal(it.answer, 'On ne peut pas simplifier', it.prompt.papier);
            assert.match(it.explanation, /DIFFÉRENTES/);
        }
    }
    assert.ok(impossibles >= 5 && possibles >= 5,
        `les deux cas doivent tomber : ${impossibles} impossibles, ${possibles} possibles`);
});

// --- La progression ---------------------------------------------------------------

test('NEUF MARCHES, EN TROIS TEMPS, et le sens des règles arrive avant les règles', () => {
    assert.equal(ORDRE.length, 9);
    assert.deepEqual(ETAPES.slice(0, 2).map(e => e.temps), ['A', 'A']);
    assert.equal(ETAPES[0].id, 'valeur', 'on installe ce QU\'EST une puissance en premier');
    ETAPES.forEach((e, i) => assert.equal(e.rang, i + 1, `${e.id} mal rangé`));
    // COCHER UN TEMPS ENTIER, c'est ce que les entrées « A », « B », « C » du
    // menu faisaient — et un parcours enregistré de ce temps-là se relit
    // encore comme tel. Dans un temps, on ne sort jamais de ses marches.
    ['A', 'B', 'C'].forEach(t => {
        const liste = ETAPES.filter(e => e.temps === t).map(e => e.id);
        for (let i = 0; i < 12; i++) {
            assert.ok(liste.includes(marchePour({ marches: liste }, i, 12)),
                `le temps ${t} sort de ses marches`);
            assert.ok(liste.includes(marchePour({ etape: t }, i, 12)),
                `le temps ${t} relu depuis un parcours enregistré sort de ses marches`);
        }
    });
});

test('CHAQUE QUESTION A QUATRE PROPOSITIONS, TOUTES DIFFÉRENTES', () => {
    // Les fautes se rejoignent d'elles-mêmes : pour 10² × 10², ajouter et
    // multiplier les exposants donnent tous deux 10⁴.
    for (let i = 0; i < 150; i++) {
        const it = item({}, i);
        assert.equal(it.choices.length, 4, `question ${i} : ${it.choices.length} propositions`);
        const vues = it.choices.map(c => String(c.value));
        assert.equal(new Set(vues).size, 4, `question ${i} : deux propositions identiques`);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
    }
});

test('un item porte tout ce qu\'il faut pour jouer, corriger et imprimer', () => {
    for (let i = 0; i < 27; i++) {
        const it = item({}, i);
        assert.equal(it.skillId, 'num.puissances.regles');
        assert.ok(it.prompt.papier && it.prompt.papier.length > 2, 'rien à imprimer');
        assert.ok(!/<[a-z]/i.test(it.prompt.papier), 'du HTML sur la feuille');
        assert.ok(!/\d\s*\/\s*\d/.test(it.prompt.papier), 'une barre de fraction sur la feuille');
        assert.ok(it.explanation.length > 20, 'corrigé muet');
        assert.ok(it.hints.length >= 1, 'pas d\'indice');
    }
});

test('la même graine rend la même question', () => {
    const a = G.generate({}, { rng: makeRng('rejeu'), index: 13 });
    const b = G.generate({}, { rng: makeRng('rejeu'), index: 13 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});

// ── « TU ÉCRIRAS LE CALCUL ! » ──────────────────────────────────────────────
//
// C'est écrit en rouge sur chaque exercice de la fiche de quatrième de Rémy.
// Il ne veut pas le résultat, il veut voir 10³ × 10² = 10³⁺² = 10⁵ — la ligne
// du milieu est celle où la règle se montre, et celle où l'on voit, quand elle
// est fausse, que l'élève a appliqué le signe de l'opération aux exposants.
//
// LE JUGE COMPARE LES EXPOSANTS, PAS LES VALEURS : 10⁹ × 10⁹ vaut 10¹⁸, qui
// dépasse 2⁵³ et cesse d'être un entier exact en virgule flottante.
//
// ── ET DEPUIS LE 13 NOVEMBRE, L'ÉLÈVE N'ÉCRIT QUE L'EXPOSANT ───────────────
//
// RÉMY : « pour l'exercice sur les puissance dans la réponse ne demande que
// l'exposant, j'aime pas l'écriture 10^3 pour les élèves ». La chaîne montre
// toujours 10³ × 10² = 10³⁺² = 10⁵, mais c'est l'ACTIVITÉ qui pose le 10 et
// place la saisie en exposant : l'élève écrit « 3 + 2 ».
//
// LA RÈGLE QUE CETTE ÉPREUVE GARDE CHANGE DONC DE MONDE, sans s'affaiblir. Sur
// une marche à base écrite, chaque ligne ne vaut plus la réponse : elle vaut
// l'EXPOSANT de la réponse. Une ligne qui vaudrait encore la réponse entière
// serait justement le défaut qu'on vient de corriger.

test('CHAQUE LIGNE VAUT L\'ÉNONCÉ, ET NE SE LAISSE PAS SAUTER', async () => {
    const { lirePuissance, memePuissance, lireExacte, memeR } =
        await import('../js/core/maths/valeurExacte.js');
    const fx = await import('../js/core/maths/formule.js');
    let lignesVues = 0, sansChaine = 0;
    for (const marche of ORDRE) {
        for (let i = 0; i < 40; i++) {
            const it = G.generate({ marches: [marche], etapes: 'oui' },
                { rng: makeRng(`pcc_${marche}_${i}`), index: 0, total: 3 });
            const etapes = it.meta.etapes || [];
            if (!etapes.length) { sansChaine += 1; continue; }
            assert.equal(it.meta.saisieSeule, true,
                `[${marche}] le clavier ne prend pas la main`);
            const memeQue = (a, b) => memePuissance(lirePuissance(a, fx), lirePuissance(b, fx))
                || memeR(lireExacte(a, fx), lireExacte(b, fx));
            // CE QUE LA LIGNE DOIT VALOIR : la réponse entière quand l'élève
            // écrit la puissance, son seul EXPOSANT quand la base est déjà
            // écrite devant le champ.
            assert.ok(!it.meta.base || String(it.answer).startsWith(it.meta.base),
                `[${marche}] la base écrite (${it.meta.base}) n'est pas celle de ${it.answer}`);
            const attendu = it.meta.base
                ? String(exposantDe(it.answer)).replace('-', '\u2212')
                : it.reponsePapier;
            for (const e of etapes) {
                lignesVues += 1;
                assert.ok(memeQue(e.montrer, attendu),
                    `[${marche}] « ${e.montrer} » ne vaut pas « ${attendu} »`);
                assert.ok(e.verifie(e.montrer.replace(/\s+/g, '')).juste,
                    `[${marche}] « ${e.montrer} » refusée à son étape`);
                // LA RÉPONSE FINALE NE PASSE PAS À L'ÉTAPE : les deux sont
                // égales, donc sans exigence de forme l'étape serait sautable.
                const v = e.verifie(attendu.replace(/\s+/g, ''));
                assert.ok(v && !v.juste,
                    `[${marche}] « ${attendu} » passe à l'étape « ${e.titre} »`);
                assert.ok(e.modele && /[□…]/.test(e.modele),
                    `[${marche}] l'étape « ${e.titre} » n'a pas de moule`);
            }
        }
    }
    assert.ok(lignesVues > 200, `seulement ${lignesVues} lignes jugées`);
    assert.ok(sansChaine > 0, 'toutes les marches ont une chaîne : (−3)² n\'en veut pas');
});

test('TOUT CE QU\'ON FAIT ÉCRIRE SE TAPE, ET AUCUNE TOUCHE NE SERT DE PIÈGE', () => {
    // LE PIÈGE DU « ² » DE LA FACTORISATION, où la première ligne ne pouvait
    // pas s'écrire et où rien ne le disait. Ici le danger est double : les
    // chiffres en exposant (10⁸) et le trait d'union (−2 écrit « -2 »), qui
    // n'est PAS le moins du clavier.
    //
    // ET DEPUIS LE 13 NOVEMBRE, UN SECOND DANGER, SYMÉTRIQUE : une touche
    // PRÉSENTE dont on ne veut pas l'écriture. Rémy : « j'aime pas l'écriture
    // 10^3 pour les élèves ». Tant que « ^ » reste sur le pavé d'une marche où
    // le 10 est déjà écrit devant le champ, un élève peut taper « 10^5 » — et
    // il aura écrit 10 puissance 10 puissance 5. Prêter l'outil, c'est tendre
    // le piège soi-même.
    const CHIFFRES = new Set(['(', ')', '+', '−', '×', '/', ...'0123456789']);
    let avecBase = 0, sansBase = 0;
    for (const marche of ORDRE) {
        for (let i = 0; i < 40; i++) {
            const it = G.generate({ marches: [marche], etapes: 'oui' },
                { rng: makeRng(`pct_${marche}_${i}`), index: 0, total: 3 });
            if (!it.meta.composable) continue;   // réponse en toutes lettres
            const base = it.meta.base || '';
            if (base) avecBase += 1; else sansBase += 1;
            // LE CLAVIER RÉELLEMENT OFFERT, ET LUI SEUL : avec une base écrite,
            // la touche « ^ » n'est plus là, donc aucune ligne ne doit la
            // demander.
            const CLAVIER = base ? CHIFFRES : new Set([...CHIFFRES, '^']);
            const lignes = [...(it.meta.etapes || []).map(e => e.montrer),
                base ? '' : it.reponsePapier];
            for (const l of lignes) {
                const manque = new Set();
                for (const c of String(l).replace(/\s+/g, '')) {
                    if (!CLAVIER.has(c)) manque.add(c);
                }
                assert.deepEqual([...manque], [],
                    `[${marche}] « ${l} » demande ${[...manque].join(' ')}, `
                    + 'que le pavé n\'a pas');
            }
            assert.equal(it.meta.exposant, !base,
                `[${marche}] la touche ^ ${base ? 'reste' : 'manque'} alors que la base `
                + `est ${base ? 'écrite' : 'à écrire'}`);
            assert.equal(it.meta.lettre, null, `[${marche}] le pavé offre une lettre`);
            assert.equal(it.meta.carre, false, `[${marche}] le pavé offre la touche ²`);
        }
    }
    // LES DEUX MONDES EXISTENT. Sans ce compte, l'épreuve resterait verte le
    // jour où `meta.base` disparaîtrait de partout : tout serait « sans base »,
    // et la règle qu'on vient d'écrire ne garderait plus rien.
    assert.ok(avecBase > 100, `seulement ${avecBase} questions à base écrite`);
    assert.ok(sansBase > 0, 'aucune question sans base écrite');
});

test('L\'ÉLÈVE QUI ÉCRIT L\'EXPOSANT SEUL A BON, ET CELUI QUI ÉCRIT LA PUISSANCE A TORT', () => {
    // LA MOITIÉ QUI COMPTE, et celle qui se casse le plus facilement : le juge
    // compare désormais un NOMBRE. S'il continuait de lire une puissance,
    // « 5 » serait lu comme le nombre cinq là où l'on attend 10⁵, et une
    // réponse juste serait refusée — « j'ai eu tout bon et il dit que j'ai eu
    // faux », que Rémy a déjà eu à écrire une fois.
    let vues = 0;
    for (const marche of ORDRE) {
        for (let i = 0; i < 20; i++) {
            const it = G.generate({ marches: [marche], etapes: 'oui' },
                { rng: makeRng(`pcx_${marche}_${i}`), index: 0, total: 3 });
            if (!it.meta.base || !it.verifieTexte) continue;
            vues += 1;
            const n = exposantDe(it.answer);
            const exposant = String(n).replace('-', '\u2212');
            assert.ok(it.verifieTexte(exposant).juste,
                `[${marche}] « ${exposant} » refusé alors que c'est l'exposant juste`);
            // ET L'ANCIENNE ÉCRITURE N'EST PLUS LA BONNE : un élève qui tape
            // « 10^5 » dans un champ déjà précédé d'un 10 a écrit 10¹⁰⁵.
            const r = it.verifieTexte(`${it.meta.base}^${exposant}`);
            assert.ok(r && !r.juste,
                `[${marche}] « ${it.meta.base}^${exposant} » accepté : le 10 compte deux fois`);
            // UN EXPOSANT FAUX RESTE FAUX.
            const faux = it.verifieTexte(String(n + 1).replace('-', '\u2212'));
            assert.ok(faux && !faux.juste, `[${marche}] un exposant faux passe`);
        }
    }
    assert.ok(vues > 40, `seulement ${vues} questions à base écrite jugées`);
});

test('UNE RÉPONSE QUI EST UNE PHRASE N\'OUVRE PAS DE CLAVIER', () => {
    // « On ne peut pas simplifier » est la bonne réponse quand les bases
    // diffèrent : c'est une reconnaissance, pas une écriture. Ouvrir un
    // clavier devant elle demanderait de taper ce qui n'a pas d'écriture.
    let vues = 0;
    for (let i = 0; i < 120; i++) {
        const it = G.generate({ marches: ['memeBase'], etapes: 'oui' },
            { rng: makeRng(`pcm_${i}`), index: 0, total: 3 });
        if (!/simplifier/.test(String(it.answer))) continue;
        vues += 1;
        assert.ok(!it.meta.composable, 'le clavier s\'ouvre sur une réponse en toutes lettres');
        assert.ok(!it.meta.saisieSeule, 'la saisie prend la main sur une phrase');
        // `makeItem` normalise les champs absents : on teste la présence,
        // pas la valeur exacte.
        assert.ok(!it.verifieTexte, 'un juge de texte sur une phrase');
    }
    assert.ok(vues > 20, `seulement ${vues} questions à bases différentes`);
});

test('CE QU\'ON MONTRE À CELUI QUI SÈCHE SE TAPE SUR LE PAVÉ QU\'IL A', () => {
    // « Montre-moi » écrit la réponse DANS LE CHAMP. Elle doit donc s'écrire
    // avec les touches présentes : sur une marche à base écrite, le champ est
    // déjà précédé d'un 10 et la touche « ^ » n'existe plus. Montrer « 10^15 »
    // ferait apparaître une écriture que l'élève ne peut ni taper ni refaire,
    // et qui compterait le 10 deux fois.
    //
    // MESURÉ AVANT : `aMontrer` lisait `reponsePapier`, qui vaut « 10^15 ».
    let vues = 0;
    for (const marche of ORDRE) {
        for (let i = 0; i < 20; i++) {
            const it = G.generate({ marches: [marche], etapes: 'oui' },
                { rng: makeRng(`pcm2_${marche}_${i}`), index: 0, total: 3 });
            if (!it.meta.base) continue;
            vues += 1;
            const montre = it.meta.reponseTapee;
            assert.ok(montre, `[${marche}] rien à montrer`);
            assert.ok(!/\^/.test(montre), `[${marche}] « ${montre} » demande la touche ^`);
            // ET IL SE TAPE SUR CE PAVÉ-LÀ : des chiffres et le moins du
            // clavier, rien d'autre. Un « ⁵ » en petit ne s'écrit avec aucune
            // touche, et c'est le piège du « ² » de la factorisation.
            assert.match(montre, /^\u2212?\d+$/,
                `[${marche}] « ${montre} » ne s'écrit pas avec les touches du pavé`);
            // (Un exposant PEUT valoir 10 : on ne compare donc pas à la base.)
            // Et c'est bien la bonne réponse : le juge du champ l'accepte.
            assert.ok(it.verifieTexte(montre).juste,
                `[${marche}] on montre « ${montre} », que le juge refuse`);
        }
    }
    assert.ok(vues > 40, `seulement ${vues} questions à base écrite`);
    // ── ET L'ACTIVITÉ DOIT LA LIRE, SINON RIEN DE TOUT CECI NE SERT ──────
    //
    // CE BOUT-LÀ A ÉTÉ AJOUTÉ PARCE QUE `epreuveTombe` A DIT NON. Les vingt
    // lignes au-dessus restaient vertes quand on remettait le défaut : elles
    // lisent le GÉNÉRATEUR, et le défaut était dans l'ACTIVITÉ, qui montrait
    // `reponsePapier` sans regarder `reponseTapee`. Une épreuve qui garde la
    // moitié de la règle donne une assurance qui n'existe pas.
    const LS = readFileSync(new URL('../js/core/activities/litteralSaisie.js',
        import.meta.url), 'utf8');
    assert.match(LS, /const aMontrer = String\(m\.reponseTapee \|\| item\.reponsePapier/,
        'l’activité doit préférer `reponseTapee` à la réponse du papier : les '
        + 'deux ne s’écrivent plus pareil dès qu’une base est posée devant le champ');
});

test('ET SUR LE PAPIER, LA VRAIE ÉCRITURE — pas celle du clavier', () => {
    // RÉMY : « j'aime pas l'écriture 10^3 pour les élèves ». Le corrigé imprimé
    // est lu par des élèves aussi, et il est posé à côté d'un énoncé qui écrit
    // déjà 10⁸ × 10² avec de vrais exposants. Écrire la réponse « 10^10 » juste
    // en dessous enseignerait deux notations pour la même chose.
    let vues = 0;
    for (const marche of ORDRE) {
        for (let i = 0; i < 20; i++) {
            const it = G.generate({ marches: [marche], etapes: 'oui' },
                { rng: makeRng(`pcp_${marche}_${i}`), index: 0, total: 3 });
            if (!it.meta.base) continue;
            vues += 1;
            assert.ok(!/\^/.test(it.reponsePapier),
                `[${marche}] le corrigé imprime « ${it.reponsePapier} »`);
            assert.ok(/[⁰¹²³⁴-⁹⁻]/.test(it.reponsePapier),
                `[${marche}] « ${it.reponsePapier} » n'a pas de vrai exposant`);
        }
    }
    assert.ok(vues > 40, `seulement ${vues} questions à base écrite`);
});
