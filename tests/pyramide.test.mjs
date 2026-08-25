import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    estFils, cleLettres, lettreAjoutee, toutesLesPyramides, creerPyramide,
    saisieInitiale, ligneJuste, estResoluePyramide, diagnostic, qualitePyramide,
    DIFFICULTES
} from '../js/core/pyramide.js';
import { LEXIQUE_PYRAMIDE } from '../js/data/motsPyramide.js';
import { pyramideFicheGenerator as G } from '../js/core/generators/pyramideFiche.js';

const HAUTEURS = [3, 4, 5, 6, 7];

test('« une lettre de plus, dans le désordre » est bien la règle qu\'on croit', () => {
    // C'est LA règle du jeu, et la moitié qui compte est « dans le désordre » :
    // CODE → CORDE se voit, ODE → CODE aussi, mais CODE → DECORS ne se voit
    // que si l'on accepte de remélanger.
    assert.ok(estFils('CODE', 'CORDE'));
    assert.ok(estFils('CORDE', 'DECORS'), 'les lettres remélangées comptent');
    assert.ok(estFils('ON', 'NOM'));
    assert.equal(estFils('CODE', 'CODES'), true);
    assert.equal(estFils('CODE', 'CODE'), false, 'il faut UNE lettre de plus');
    assert.equal(estFils('CODE', 'CODEUR'), false, 'et une seule');
    assert.equal(estFils('CODE', 'CARTE'), false, 'les lettres du dessus doivent y être');
});

test('les doublons de lettres ne trompent pas la règle', () => {
    // TERME a deux E, METIER aussi : une comparaison qui compterait les lettres
    // distinctes accepterait n'importe quoi.
    assert.ok(estFils('TERME', 'METIER'));
    assert.equal(estFils('MERE', 'TERME'), true);
    // ELLE aurait deux L ; un mot qui n'en a qu'un ne peut pas en être le père.
    assert.equal(estFils('MELE', 'MELEE'), true);
    assert.equal(estFils('MEE', 'MELEE'), false, 'il manque un L, pas un E');
});

test('la lettre qui arrive est celle qu\'on montre en indice', () => {
    assert.equal(lettreAjoutee('CODE', 'CORDE'), 'R');
    assert.equal(lettreAjoutee('CORDE', 'DECORS'), 'S');
    assert.equal(lettreAjoutee('TERME', 'METIER'), 'I');
    assert.equal(lettreAjoutee('O', 'ON'), 'N');
});

test('le lexique est propre : majuscules sans accent, et pas de doublon', () => {
    // Les mots sont ce que l'élève écrit dans les cases. Un accent ou une
    // minuscule qui traînerait rendrait une ligne juste impossible à valider.
    const vus = new Set();
    LEXIQUE_PYRAMIDE.forEach(e => {
        assert.match(e.mot, /^[A-Z]{2,}$/, `mot mal écrit : ${e.mot}`);
        assert.ok(!vus.has(e.mot), `${e.mot} est deux fois dans le lexique`);
        vus.add(e.mot);
        assert.ok(e.def && e.def.length > 3, `${e.mot} n'a pas de définition`);
        // Une définition qui contient son mot n'est pas une devinette. On
        // compare des MOTS et non des morceaux : « Pronom indéfini » contient
        // les lettres de ON sans le donner, et l'interdire priverait le lexique
        // de ses définitions les plus courtes.
        const mots = e.def.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase().split(/[^A-Z]+/).filter(Boolean);
        assert.ok(!mots.includes(e.mot), `${e.mot} se donne dans sa définition`);
    });
});

test('le lexique produit assez de pyramides à chaque hauteur', () => {
    // C'est la seule vraie garantie du jeu : si une hauteur ne donne aucune
    // chaîne, le réglage existe et l'exercice ne s'ouvre pas.
    HAUTEURS.forEach(h => {
        const toutes = toutesLesPyramides(h);
        assert.ok(toutes.length >= 20, `hauteur ${h} : ${toutes.length} pyramide(s) seulement`);
    });
    // Au-delà de sept, il n'y a plus de mots : le générateur ne doit donc jamais
    // proposer huit.
    assert.equal(toutesLesPyramides(8).length, 0);
});

test('chaque pyramide trouvée respecte la règle à toutes ses marches', () => {
    HAUTEURS.forEach(h => {
        toutesLesPyramides(h).forEach(chaine => {
            assert.equal(chaine.length, h);
            assert.equal(chaine[0].mot.length, 1, 'le sommet est une lettre seule');
            chaine.slice(1).forEach((b, i) => {
                assert.ok(estFils(chaine[i].mot, b.mot),
                    `${chaine[i].mot} → ${b.mot} n'est pas une marche`);
            });
            // Un mot deux fois dans la même pyramide se remarquerait tout de
            // suite ; par construction c'est impossible (les longueurs
            // augmentent), et le test le fige.
            assert.equal(new Set(chaine.map(b => b.mot)).size, h);
        });
    });
});

test('le sommet porte sa définition, et elle est juste', () => {
    const de = (l) => toutesLesPyramides(3).find(c => c[0].mot === l);
    assert.ok(de('O'), 'aucune pyramide ne part de O');
    assert.equal(de('O')[0].def, 'La 15ᵉ lettre de l\'alphabet.');
    // « La 1ʳᵉ lettre », et non « la 1ᵉ » : c'est la PREMIÈRE.
    assert.ok(de('A'), 'aucune pyramide ne part de A');
    assert.equal(de('A')[0].def, 'La 1ʳᵉ lettre de l\'alphabet.');
});

test('les lignes données sont TOUJOURS les premières', () => {
    // Une pyramide se remplit du haut vers le bas — chaque mot se cherche à
    // partir du précédent. Un trou au milieu couperait la chaîne en deux et
    // rendrait la suite introuvable.
    for (const difficulte of Object.keys(DIFFICULTES)) {
        for (let i = 0; i < 10; i++) {
            const p = creerPyramide({ hauteur: 6, difficulte, rng: makeRng(`d-${difficulte}-${i}`) });
            const premierVide = p.donnes.indexOf(false);
            assert.ok(premierVide > 0, `${difficulte} : le sommet doit être donné`);
            assert.ok(p.donnes.slice(premierVide).every(d => !d),
                `${difficulte} : un trou au milieu (${p.donnes})`);
        }
    }
});

test('« difficile » ne donne que le sommet, « facile » en donne la moitié', () => {
    const compte = (d) => creerPyramide({ hauteur: 6, difficulte: d, rng: makeRng('c' + d) })
        .donnes.filter(Boolean).length;
    assert.equal(compte('difficile'), 1);
    assert.ok(compte('moyen') >= 2 && compte('moyen') <= 3);
    assert.ok(compte('facile') >= 3, 'facile doit vraiment aider');
    assert.ok(compte('facile') > compte('moyen') && compte('moyen') > compte('difficile'),
        'les trois difficultés doivent se distinguer');
});

test('la saisie de départ n\'est jamais gagnante, et la solution l\'est toujours', () => {
    for (let i = 0; i < 10; i++) {
        const p = creerPyramide({ hauteur: 6, rng: makeRng('s' + i) });
        const vide = saisieInitiale(p);
        assert.equal(estResoluePyramide(p, vide), false);
        assert.equal(estResoluePyramide(p, p.barreaux.map(b => b.mot)), true);
        // Les lignes données sont justes dès le départ — ce sont elles qui
        // amorcent, et le jeu ne doit pas les compter comme fautes.
        p.donnes.forEach((d, k) => {
            if (d) assert.ok(ligneJuste(p, k, vide), `la ligne donnée ${k} n'est pas juste`);
        });
    }
});

test('la casse ne fait pas échouer une bonne réponse', () => {
    // L'élève tape au clavier ; « corde » vaut CORDE.
    const p = creerPyramide({ hauteur: 4, difficulte: 'difficile', rng: makeRng('casse') });
    const minuscules = p.barreaux.map(b => b.mot.toLowerCase());
    assert.ok(estResoluePyramide(p, minuscules));
});

test('le diagnostic montre la PREMIÈRE ligne fautive, et dit laquelle des trois fautes', () => {
    // Corriger la cinquième ligne quand la troisième est fausse ne sert à rien :
    // c'est la première qui bloque la suite.
    const p = creerPyramide({ hauteur: 5, difficulte: 'difficile', rng: makeRng('diag') });
    const bon = p.barreaux.map(b => b.mot);
    assert.deepEqual(diagnostic(p, bon), { ok: true });

    const vide = saisieInitiale(p);
    assert.deepEqual(diagnostic(p, vide), { ok: false, ligne: 1, quoi: 'vide' });

    // Les bonnes lettres dans le mauvais ordre : l'élève est bien plus près
    // qu'il ne le croit, et le jeu doit le lui dire.
    const melange = bon.slice();
    melange[2] = bon[2].split('').reverse().join('');
    if (melange[2] !== bon[2]) {
        assert.deepEqual(diagnostic(p, melange), { ok: false, ligne: 2, quoi: 'anagramme' });
    }

    // Un mot de la bonne longueur qui ne reprend pas les lettres du dessus :
    // c'est la règle du jeu qui n'est pas comprise.
    const horsRegle = bon.slice();
    horsRegle[2] = 'X'.repeat(bon[2].length);
    assert.deepEqual(diagnostic(p, horsRegle), { ok: false, ligne: 2, quoi: 'regle' });

    const courte = bon.slice();
    courte[3] = bon[3].slice(0, -1);
    assert.deepEqual(diagnostic(p, courte), { ok: false, ligne: 3, quoi: 'longueur' });
});

test('deux graines donnent deux pyramides différentes', () => {
    const mots = (cle) => creerPyramide({ hauteur: 6, rng: makeRng(cle) })
        .barreaux.map(b => b.mot).join('-');
    const vues = new Set(Array.from({ length: 12 }, (_, i) => mots('v' + i)));
    assert.ok(vues.size >= 8, `${vues.size} pyramides différentes sur douze`);
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ hauteur: 6, difficulte: 'moyen' }, { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.barreaux.length, 6);
    assert.equal(m.donnes.length, 6);
    assert.equal(m.ajouts.length, 5);
    // Le corrigé pose chaque marche : c'est ce qu'on écrit au tableau.
    m.ajouts.forEach((l, i) => {
        assert.ok(it.explanation.includes(`${m.mots[i]} + ${l} = ${m.mots[i + 1]}`),
            `la marche ${i} manque au corrigé`);
    });
    assert.ok(it.answer.includes('→'));
});

test('un réglage farfelu retombe sur la pyramide de la revue', () => {
    const it = G.generate({ hauteur: 99, difficulte: 'impossible' },
        { rng: makeRng('bof'), index: 0 });
    assert.equal(it.meta.hauteur, 6);
    assert.equal(it.meta.difficulte, 'moyen');
});

test('la qualité dit ce qu\'il reste à faire', () => {
    const p = creerPyramide({ hauteur: 6, difficulte: 'difficile', rng: makeRng('q') });
    const q = qualitePyramide(p);
    assert.equal(q.hauteur, 6);
    assert.equal(q.mots.length, 6);
    assert.equal(q.aTrouver, 5, 'le sommet seul est donné');
    assert.equal(cleLettres(q.mots[5]).length, 6);
});
