// LE MOT CODÉ, TROISIÈME FORME : L'ANNEAU.
//
// Rémy, après deux essais ratés : « pour le mot caché, ce n'est vraiment pas
// ça, je te redonne un exercice que j'ai créé » — avec la photo de sa fiche.
// Elle a été décodée case par case, et ces tests gardent ce qu'elle dit :
// un cadre de bandes, le centre vide, des mots qui ne se croisent jamais, une
// clé qui commence par un mot, et les lettres solitaires écrites en clair.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    creerMotCode, saisieInitiale, numerosFaux, lettresEnDouble,
    estResoluCode, qualiteCode, THEMES, FORMATS_CODE
} from '../js/core/motCode.js';
import { bandesAnneau, decoupes, LONGUEUR_MIN } from '../js/core/anneauMots.js';
import { motCodeFicheGenerator as G } from '../js/core/generators/motCodeFiche.js';

const faire = (opts = {}, cle = 'mk') => creerMotCode({
    theme: 'litteral', niveauMax: 3, taille: 'moyenne', essais: 4,
    rng: makeRng(cle), rngPour: (i) => makeRng(`${cle}-${i}`), ...opts
});

// --- La géométrie de l'anneau -----------------------------------------------

test('L\'ANNEAU DE RÉMY, AU CRAN PRÈS', () => {
    // Sa grille fait 13 × 12 sur quatre bandes de profondeur. Les longueurs
    // qu'on en déduit sont exactement celles de ses mots : INCONNUE + UN font
    // onze cases avec leur case muette, NUMÉRIQUE neuf, LETTRES sept, SOMME
    // cinq ; DÉVELOPPER dix, ÉCRITURE huit, NOMBRE six, DEUX quatre.
    const { bandes, fleches } = bandesAnneau(13, 12, 4);
    const h = bandes.filter(b => b.sens === 'h').map(b => b.longueur).sort((a, b) => b - a);
    const v = bandes.filter(b => b.sens === 'v').map(b => b.longueur).sort((a, b) => b - a);
    assert.deepEqual(h, [11, 11, 9, 9, 7, 7, 5, 5]);
    assert.deepEqual(v, [10, 10, 8, 8, 6, 6, 4, 4]);
    assert.equal(bandes.length, 16, 'seize mots, comme sur sa fiche');
    assert.equal(fleches.length, 16, 'quatre cases d\'angle par bande');
});

test('AUCUNE BANDE N\'EN RECOUVRE UNE AUTRE — les mots ne se croisent jamais', () => {
    // C'est la propriété qui rend la génération sûre : chaque bande est un
    // couloir indépendant, donc elle se remplit sans jamais contraindre les
    // autres. Un mot croisé, lui, se bloque.
    for (const [L, H, d] of [[13, 12, 4], [11, 10, 3], [9, 8, 2], [15, 9, 3]]) {
        const { bandes, fleches } = bandesAnneau(L, H, d);
        const prises = new Set();
        const marquer = (cle, quoi) => {
            assert.ok(!prises.has(cle), `${quoi} recouvre ${cle} en ${L}×${H}×${d}`);
            prises.add(cle);
        };
        fleches.forEach(f => marquer(`${f.x},${f.y}`, 'une flèche'));
        bandes.forEach(b => {
            for (let i = 0; i < b.longueur; i++) {
                const x = b.x + (b.sens === 'h' ? i : 0);
                const y = b.y + (b.sens === 'h' ? 0 : i);
                assert.ok(x >= 0 && y >= 0 && x < L && y < H, `${b.id} sort de la grille`);
                marquer(`${x},${y}`, b.id);
            }
        });
    }
});

test('une découpe de bande compte SES cases muettes', () => {
    // Une bande de n cases portant k mots leur laisse n − (k − 1) lettres : la
    // case qui sépare deux mots n'est pas une lettre.
    decoupes(11).forEach(d => {
        assert.equal(d.reduce((s, l) => s + l, 0) + d.length - 1, 11, JSON.stringify(d));
        d.forEach(l => assert.ok(l >= LONGUEUR_MIN, 'un mot de deux lettres n\'en est pas un'));
    });
    // Un seul mot qui remplit tout passe AVANT deux mots qui remplissent tout :
    // moins de cases muettes, plus de lettres à décoder.
    assert.deepEqual(decoupes(11)[0], [11]);
    assert.deepEqual(decoupes(11)[1], [5, 5], 'à deux mots, le plus équilibré d\'abord');
    // Quatre cases ne peuvent porter qu'un mot de quatre lettres : deux mots
    // demanderaient 3 + 3 + une case muette, soit sept.
    assert.deepEqual(decoupes(4), [[4]]);
});

// --- Le codage ---------------------------------------------------------------

test('le code est une bijection : un numéro par lettre, une lettre par numéro', () => {
    // C'est LA règle du jeu — « deux numéros ne cachent jamais la même
    // lettre ». Si le codage la viole, la grille n'a pas de solution unique et
    // toute la déduction s'effondre.
    for (let i = 0; i < 30; i++) {
        const m = faire({}, 'bij' + i);
        const numeros = m.lettres.map(l => m.code[l]);
        assert.equal(new Set(numeros).size, numeros.length, 'deux lettres partagent un numéro');
        assert.deepEqual([...numeros].sort((a, b) => a - b),
            m.lettres.map((_, k) => k + 1), 'les numéros ne vont pas de 1 à N sans trou');
        m.lettres.forEach(l => assert.equal(m.parNumero[m.code[l]], l));
    }
});

test('la grille codée est exactement la grille des mots', () => {
    // Une case porte le numéro de SA lettre, et rien d'autre : c'est la seule
    // garantie que ce qu'on décode est ce qui a été écrit.
    for (let i = 0; i < 20; i++) {
        const m = faire({}, 'gr' + i);
        const solitaires = new Set(m.enClair);
        m.cases.forEach((ligne, y) => ligne.forEach((c, x) => {
            if (c === null) return assert.equal(m.numeros[y][x], null, 'une case muette est numérotée');
            if (solitaires.has(c)) {
                return assert.equal(m.numeros[y][x], null, 'une lettre en clair porte un numéro');
            }
            assert.equal(m.numeros[y][x], m.code[c]);
        }));
        // Et chaque lettre du lexique employée est bien codée, ou donnée.
        m.mots.forEach(w => [...w.mot].forEach(l =>
            assert.ok(m.lettres.includes(l) || solitaires.has(l), `${l} manque à l'alphabet`)));
    }
});

test('UNE LETTRE QUI NE PARAÎT QU\'UNE FOIS EST ÉCRITE EN CLAIR', () => {
    // Chez Rémy, un « B » solitaire s'affiche au milieu de NOMBRE, et sa clé
    // compte dix-sept numéros pour dix-huit lettres. C'est juste : un numéro
    // qui n'apparaît qu'une seule fois dans toute la grille ne se déduit de
    // rien — les mots de l'anneau ne se croisent pas. Le coder serait poser une
    // devinette sans indice.
    for (let i = 0; i < 15; i++) {
        const m = faire({}, 'clair' + i);
        const compte = new Map();
        m.cases.forEach(l => l.forEach(c => {
            if (c !== null) compte.set(c, (compte.get(c) || 0) + 1);
        }));
        [...compte.entries()].forEach(([lettre, n]) => {
            if (n === 1) assert.ok(m.enClair.includes(lettre), `${lettre} solitaire mais codée`);
            else assert.ok(m.lettres.includes(lettre), `${lettre} paraît ${n} fois mais n'est pas codée`);
        });
        m.enClair.forEach(l => assert.equal(compte.get(l), 1, `${l} en clair mais pas solitaire`));
    }
});

test('LA CLÉ COMMENCE PAR UN MOT', () => {
    // Sous sa grille, les cases 1 à 7 portent déjà P, R, O, D, U, I, T : ce
    // n'est pas un semis d'indices, c'est PRODUIT, le mot du chapitre.
    const m = faire({}, 'cle');
    assert.ok(m.motCle.length >= 4, `mot de clé trop court : ${m.motCle}`);
    assert.deepEqual(m.donnees, m.motCle.split(''));
    // Ses lettres prennent les numéros 1, 2, 3… dans l'ordre.
    m.motCle.split('').forEach((l, i) => assert.equal(m.code[l], i + 1));
    // Toutes distinctes — sinon deux numéros consécutifs porteraient la même —
    // et toutes présentes dans la grille, sinon on offre une lettre qui ne sert
    // à rien.
    assert.equal(new Set(m.motCle.split('')).size, m.motCle.length);
    const dansLaGrille = new Set(m.cases.flat().filter(Boolean));
    m.motCle.split('').forEach(l => assert.ok(dansLaGrille.has(l), `${l} absent de la grille`));
});

test('le mot de la clé ne résout jamais la grille', () => {
    const m = faire({}, 'trop');
    assert.ok(m.donnees.length < m.lettres.length);
    assert.equal(estResoluCode(m, saisieInitiale(m)), false);
});

test('la saisie de départ contient les lettres offertes, et rien de faux', () => {
    const m = faire({}, 'dep');
    const s = saisieInitiale(m);
    assert.equal(Object.keys(s).length, m.donnees.length);
    assert.deepEqual(numerosFaux(m, s), []);
});

test('« vérifier » ne montre que les numéros faux, jamais les vides', () => {
    const m = faire({}, 'ver');
    const bon = m.lettres[0], num = m.code[bon];
    const faux = m.lettres.find(l => l !== bon);
    assert.deepEqual(numerosFaux(m, { [num]: bon }), []);
    assert.deepEqual(numerosFaux(m, { [num]: faux }), [num]);
    assert.deepEqual(numerosFaux(m, { [num]: '' }), [], 'une case vide n\'est pas fausse');
});

test('une lettre posée sur deux numéros est signalée', () => {
    // C'est la contradiction qui fait avancer un mot codé : « ce ne peut pas
    // être un E, le E est déjà pris ». Le jeu la montre au lieu de la refuser.
    assert.deepEqual(lettresEnDouble({ 3: 'E', 7: 'A', 11: 'E' }),
        [{ lettre: 'E', numeros: [3, 11] }]);
    assert.deepEqual(lettresEnDouble({ 3: 'E', 7: 'A' }), []);
});

test('la grille est résolue quand tout l\'alphabet est retrouvé, pas avant', () => {
    const m = faire({}, 'fin');
    const complet = {};
    m.lettres.forEach(l => { complet[m.code[l]] = l; });
    assert.ok(estResoluCode(m, complet));
    const presque = { ...complet };
    delete presque[m.code[m.lettres[0]]];
    assert.equal(estResoluCode(m, presque), false);
});

// --- La grille rendue --------------------------------------------------------

test('L\'ANNEAU EST TOUJOURS PLEIN, ET SON CENTRE TOUJOURS VIDE', () => {
    // C'est ce qu'on gagne à ne plus croiser les mots : plus de rectangle aux
    // trois quarts noir quand le lexique du thème est court. Et le centre vide
    // est la place de la consigne, sur le papier comme à l'écran.
    Object.keys(THEMES).forEach(theme => {
        Object.keys(FORMATS_CODE).forEach(taille => {
            const m = faire({ theme, taille }, `plein-${theme}-${taille}`);
            const d = FORMATS_CODE[taille].profondeur;
            assert.equal(m.trous, 0, `${theme}/${taille} : ${m.trous} cases sans mot`);
            for (let y = d; y < m.hauteur - d; y++) {
                for (let x = d; x < m.largeur - d; x++) {
                    assert.equal(m.cases[y][x], null, `${theme}/${taille} : centre occupé`);
                }
            }
            // Et le cadre, lui, ne laisse aucune case blanche sans lettre.
            m.fleches.forEach(f => assert.equal(m.cases[f.y][f.x], null,
                'une flèche est posée sur une lettre'));
        });
    });
});

test('chaque thème donne une grille jouable', () => {
    // Un thème dont le lexique est trop maigre rendrait une grille vide, et
    // l'exercice s'ouvrirait sur rien.
    Object.keys(THEMES).forEach(theme => {
        const m = faire({ theme, taille: 'petite' }, 't-' + theme);
        const q = qualiteCode(m);
        assert.ok(q.mots >= 6, `${theme} : ${q.mots} mots seulement`);
        assert.ok(m.lettres.length >= 6, `${theme} : ${m.lettres.length} lettres codées`);
        assert.equal(new Set(m.mots.map(w => w.mot)).size, m.mots.length,
            `${theme} : un mot est écrit deux fois`);
    });
});

test('LES NOMBRES EN TOUTES LETTRES BOUCHENT, ILS N\'ENSEIGNENT PAS', async () => {
    // DEUX, CINQ, TRENTE remplissent les bandes de quatre ou cinq cases où
    // aucun mot de vocabulaire ne rentre — c'est exactement l'usage que Rémy en
    // fait. Mais ils n'ont rien à faire dans une grille de mots cachés, où
    // « trouve QUARANTE » n'apprend rien à personne.
    const { motsDisponibles } = await import('../js/core/motsCaches.js');
    const sans = motsDisponibles({ theme: 'nombres', niveauMax: 3 });
    const avec = motsDisponibles({ theme: 'nombres', niveauMax: 3, bouchons: true });
    assert.ok(avec.length > sans.length);
    assert.ok(!sans.some(m => m.mot === 'QUARANTE'));
    assert.ok(avec.some(m => m.mot === 'QUARANTE'));
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ theme: 'litteral', taille: 'moyenne', niveauMax: 3 },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.numeros.length, m.hauteur);
    assert.equal(m.numeros[0].length, m.largeur);
    // La fiche porte les flèches : sans elles, l'anneau n'est qu'un cadre de
    // numéros muets, et l'on ne sait pas où commence chaque mot.
    assert.ok(m.fleches.length >= 8);
    assert.ok(m.fleches.every(f => ['coin', 'bas', 'droite', 'fin'].includes(f.type)));
    assert.ok(it.explanation.includes(m.motCle));
    // Le corrigé dit le code ET les mots : c'est ce que le professeur relit.
    m.lettres.forEach(l => assert.ok(it.explanation.includes(`${m.code[l]} = ${l}`)));
    m.mots.forEach(w => assert.ok(it.explanation.includes(w.mot), `${w.mot} manque au corrigé`));
});
