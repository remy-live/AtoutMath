// LA PHRASE DU JOUR — et surtout, celle qui ne revient pas.
//
// Rémy voulait quatre listes d'une centaine d'entrées. Ce que ces tests
// gardent, c'est ce qui rend une liste UTILE plutôt que décorative : la même
// phrase toute la journée, et aucune répétition tant que la liste n'est pas
// épuisée. Un tirage au hasard sur cent entrées en redonne une au bout d'une
// dizaine de jours, et l'élève conclut qu'il n'y en a que dix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    GENRES, numeroDeJour, permutation, rangDuJour, duJour, decalagePour, prochains
} from '../js/core/quotidien.js';
import {
    LISTES, comptes, normaliser, entreeDuJour, toutDuJour, genreDuJour, apercu
} from '../js/data/quotidien.js';
import { FIGURES, figureSvg } from '../js/data/enigmesFigures.js';

const JOUR = 86400000;

// --- Le tirage ----------------------------------------------------------------

test('LA MÊME PHRASE TOUTE LA JOURNÉE', () => {
    // Un élève qui recharge la page et voit une autre blague comprend qu'il est
    // devant une machine à sous, et il tire jusqu'à en trouver une drôle.
    const matin = Date.UTC(2026, 8, 14, 7, 30);
    const soir = Date.UTC(2026, 8, 14, 21, 45);
    assert.equal(numeroDeJour(matin), numeroDeJour(soir));
    assert.equal(duJour(LISTES.blague, { maintenant: matin }),
        duJour(LISTES.blague, { maintenant: soir }));
    // Et différente le lendemain.
    const demain = Date.UTC(2026, 8, 15, 7, 30);
    assert.notEqual(numeroDeJour(matin), numeroDeJour(demain));
});

test('RIEN NE SE RÉPÈTE TANT QUE LA LISTE N\'EST PAS ÉPUISÉE — DANS AUCUNE FENÊTRE', () => {
    // C'EST LA PROPRIÉTÉ DU DISPOSITIF, et la première version ne la tenait pas.
    // Elle tirait une permutation NEUVE à chaque cycle : en commençant en cours
    // de cycle, on n'obtenait que 80 entrées distinctes sur 100 jours, parce
    // que le raccord entre deux permutations pouvait redonner la même entrée à
    // quelques jours d'intervalle.
    //
    // On ne teste donc PAS seulement la fenêtre qui commence à un cycle : on
    // les teste toutes. C'est ce que vit un élève, qui n'arrive pas un jour
    // choisi par nous.
    for (const genre of GENRES) {
        const n = LISTES[genre].length;
        const debut = numeroDeJour(Date.UTC(2026, 0, 1));
        for (let depart = 0; depart < n; depart++) {
            const vus = new Set();
            for (let i = 0; i < n; i++) vus.add(rangDuJour(n, debut + depart + i));
            assert.equal(vus.size, n,
                `${genre} : en partant du jour ${depart}, ${vus.size} entrées distinctes sur ${n}`);
        }
    }
});

test('DEUX GENRES NE SORTENT PAS DANS LE MÊME ORDRE', () => {
    // Sans quoi la blague et le conseil du jour se suivraient toujours par les
    // mêmes rangs — et le professeur qui en retire une décalerait les deux.
    const a = Array.from({ length: 40 }, (_, i) => rangDuJour(100, i));
    const b = Array.from({ length: 40 }, (_, i) => rangDuJour(101, i));
    assert.notDeepEqual(a, b);
});

test('UNE PERMUTATION EST REPRODUCTIBLE, ET C\'EST BIEN UNE PERMUTATION', () => {
    assert.deepEqual(permutation(6, 42), permutation(6, 42));
    assert.notDeepEqual(permutation(6, 42), permutation(6, 43));
    const p = permutation(50, 7);
    assert.equal(new Set(p).size, 50);
    assert.equal(Math.min(...p), 0);
    assert.equal(Math.max(...p), 49);
});

test('les dates anciennes et les décalages négatifs ne sortent pas du tableau', () => {
    // Le modulo de JavaScript rend un reste NÉGATIF pour un nombre négatif :
    // sans le repli, une date de 1969 ou un décalage négatif lisait hors bornes.
    for (const jour of [-10000, -1, 0, 1, 99999]) {
        for (const d of [-500, 0, 500]) {
            const r = rangDuJour(100, jour, d);
            assert.ok(r >= 0 && r < 100, `jour ${jour}, décalage ${d} → ${r}`);
        }
    }
    assert.equal(rangDuJour(0, 5), -1, 'une liste vide ne rend aucun rang');
    assert.equal(duJour([], {}), null, 'et le tirage rend null plutôt que de casser');
});

test('CHACUN LA SIENNE : deux élèves n\'ont pas la même énigme le même jour', () => {
    // Sinon le premier donne la réponse au second, et il n'y a plus d'énigme.
    const maintenant = Date.UTC(2026, 2, 3);
    const a = decalagePour('eleve-lea');
    const b = decalagePour('eleve-noe');
    assert.notEqual(a, b);
    // Le même élève garde son décalage : il ne repasse pas sur la même entrée
    // en changeant d'appareil.
    assert.equal(decalagePour('eleve-lea'), a);
    assert.equal(decalagePour(''), 0, 'sans identifiant, tout le monde a la même');
    const ea = duJour(LISTES.enigme, { maintenant, decalage: a });
    const eb = duJour(LISTES.enigme, { maintenant, decalage: b });
    assert.notEqual(ea, eb);
});

test('l\'aperçu du banc d\'essai montre bien les jours À VENIR', () => {
    const maintenant = Date.UTC(2026, 5, 10);
    const p = prochains(LISTES.conseil, 5, { maintenant });
    assert.equal(p.length, 5);
    assert.deepEqual(p.map(x => x.dans), [0, 1, 2, 3, 4]);
    assert.equal(p[0].entree, duJour(LISTES.conseil, { maintenant }));
    assert.equal(p[1].entree, duJour(LISTES.conseil, { maintenant: maintenant + JOUR }));
});

// --- Le contenu -----------------------------------------------------------------

test('UNE CENTAINE DE CHAQUE', () => {
    comptes().forEach(({ genre, n }) => {
        assert.ok(n >= 100, `${genre} : ${n} entrées, il en faut au moins cent`);
    });
});

test('AUCUN DOUBLON, DANS AUCUNE LISTE', () => {
    // Deux fois la même blague à quinze jours d'écart se remarque tout de suite.
    for (const genre of GENRES) {
        const textes = LISTES[genre].map(e => (typeof e === 'string' ? e : e.texte).trim().toLowerCase());
        const vus = new Set(textes);
        assert.equal(vus.size, textes.length, `${genre} : ${textes.length - vus.size} doublon(s)`);
    }
});

test('UNE BLAGUE TIENT EN DEUX LIGNES', () => {
    // « Très courte », a dit Rémy. Au-delà, ce n'est plus une blague, c'est une
    // lecture — et elle ne sera pas lue.
    LISTES.blague.forEach(b => {
        assert.ok(b.texte.length <= 165, `trop longue (${b.texte.length}) : ${b.texte.slice(0, 60)}…`);
        assert.ok(b.texte.length > 20, `trop courte : ${b.texte}`);
        assert.ok(b.quoi, `sans notion : ${b.texte.slice(0, 40)}`);
    });
});

test('CHAQUE CITATION EST ATTRIBUÉE, ET L\'INCERTITUDE EST DÉCLARÉE', () => {
    // Le web est plein de jolies phrases attribuées à Einstein qu'il n'a jamais
    // écrites. En mettre une sur l'écran d'accueil d'un outil scolaire, c'est la
    // graver dans trente têtes.
    LISTES.citation.forEach(c => {
        assert.ok(c.auteur && c.auteur.length > 2, `sans auteur : ${c.texte.slice(0, 40)}`);
        assert.equal(typeof c.sur, 'boolean', `attribution non déclarée : ${c.texte.slice(0, 40)}`);
    });
    // Et l'écran le DIT : une attribution incertaine porte « attribué à ».
    // Sauf devant un proverbe : « attribué à Proverbe japonais » ne se dit pas,
    // parce qu'un proverbe n'a pas d'auteur — il n'y a rien à attribuer.
    const proverbe = LISTES.citation.find(c => /^proverbe/i.test(c.auteur));
    assert.equal(normaliser('citation', proverbe).signature, proverbe.auteur);
    const douteuse = LISTES.citation.find(c =>
        !c.sur && !/^(attribué à|proverbe|inscription|dicton)/i.test(c.auteur));
    const vue = normaliser('citation', douteuse);
    assert.match(vue.signature, /^attribué à /i, vue.signature);
    // Une attribution sûre, elle, se signe simplement.
    const sure = LISTES.citation.find(c => c.sur);
    assert.equal(normaliser('citation', sure).signature, sure.auteur);
    // Et « Attribué à X » écrit dans la source ne se redouble pas.
    const deja = LISTES.citation.find(c => /^attribué à /i.test(c.auteur));
    if (deja) assert.equal(normaliser('citation', deja).signature, deja.auteur);
});

test('UNE ÉNIGME A SA RÉPONSE ET UN INDICE QUI N\'EST PAS LA RÉPONSE', () => {
    LISTES.enigme.forEach(e => {
        // Certaines énigmes sont légitimement lapidaires — « Combien font
        // 99 × 99 ? » n'a pas besoin d'un mot de plus.
        assert.ok(e.texte && e.texte.length > 18, `énoncé trop court : ${e.texte}`);
        assert.ok(e.texte.length <= 210, `énoncé trop long (${e.texte.length}) : ${e.texte.slice(0, 50)}…`);
        assert.ok(e.reponse, `sans réponse : ${e.texte.slice(0, 40)}`);
        assert.ok(e.indice && e.indice.length > 12, `sans indice : ${e.texte.slice(0, 40)}`);
        // L'indice dit la PREMIÈRE CHOSE À REGARDER, il ne lâche pas le résultat.
        const rep = String(e.reponse).trim().toLowerCase();
        if (rep.length >= 3) {
            assert.ok(!e.indice.toLowerCase().includes(rep),
                `l'indice donne la réponse : « ${e.indice} » contient « ${e.reponse} »`);
        }
        assert.ok(e.niveau >= 3 && e.niveau <= 6, `niveau hors bornes : ${e.niveau}`);
    });
});

test('UN CONSEIL SE SUIT AUJOURD\'HUI', () => {
    // « Travaille régulièrement » n'est pas un conseil, c'est un reproche
    // déguisé. On ne peut pas tester l'utilité, mais on peut tenir la forme :
    // une phrase, assez courte pour être lue, assez longue pour dire un geste.
    LISTES.conseil.forEach(c => {
        assert.equal(typeof c, 'string');
        assert.ok(c.length >= 35 && c.length <= 175, `longueur ${c.length} : ${c.slice(0, 50)}…`);
        assert.match(c, /[.!?]$/, `sans ponctuation finale : ${c.slice(0, 50)}`);
    });
});

// --- La vue commune ----------------------------------------------------------------

test('LES QUATRE GENRES SE PRÉSENTENT PAREIL À L\'ÉCRAN', () => {
    const maintenant = Date.UTC(2026, 3, 8);
    const tout = toutDuJour({ maintenant });
    assert.equal(tout.length, 4);
    tout.forEach(v => {
        assert.ok(GENRES.includes(v.genre));
        assert.ok(v.texte && v.texte.length > 10, `${v.genre} sans texte`);
        assert.ok('signature' in v && 'secret' in v);
    });
    // SEULE l'énigme garde un secret : c'est la seule différence de
    // comportement entre les quatre.
    assert.equal(tout.filter(v => v.secret).length, 1);
    assert.equal(tout.find(v => v.secret).genre, 'enigme');
});

test('LE GENRE TOURNE, ET LE CONSEIL REVIENT LE PLUS SOUVENT', () => {
    // C'est le seul des quatre qui serve directement à travailler.
    const vus = Array.from({ length: 20 }, (_, i) => genreDuJour(i));
    assert.equal(new Set(vus).size, 4, 'les quatre genres doivent tous sortir');
    const conseils = vus.filter(g => g === 'conseil').length;
    assert.ok(conseils > vus.filter(g => g === 'blague').length, `conseils : ${conseils}/20`);
    // Et les jours négatifs ne sortent pas du roulement.
    assert.ok(GENRES.includes(genreDuJour(-3)));
});

test('l\'aperçu du banc d\'essai rend des entrées déjà présentables', () => {
    const vue = apercu('citation', 3, { maintenant: Date.UTC(2026, 1, 1) });
    assert.equal(vue.length, 3);
    vue.forEach(v => {
        assert.ok(v.entree.texte);
        assert.ok(v.entree.signature, 'une citation sans signature n\'est pas une citation');
    });
});

test('un genre inconnu ne casse rien', () => {
    assert.equal(entreeDuJour('licorne'), null);
    assert.deepEqual(apercu('licorne', 3), []);
});

// --- Ce que Rémy a demandé pour la relecture ---------------------------------
//
// « Je peux aussi faire un retour sur les proverbes, blagues et autres, car il
// y en a à supprimer, mets-en alors deux cents et un clic oui ou non et je te
// l'envoie. » Deux cents, donc — et pas cent quatre-vingt-dix-neuf.
//
// « Pour les énigmes, il faut quand même expliquer la réponse. Tu peux faire
// des énigmes à petites images vectorielles. »

test('DEUX CENTS ENTRÉES PAR LISTE, comme demandé', () => {
    // Deux cents laissent de quoi en jeter la moitié et garder une année
    // entière de contenu. C'est tout l'intérêt du nombre : il est calculé pour
    // survivre à la relecture.
    comptes().forEach(({ genre, n }) => {
        assert.ok(n >= 200, `${genre} : ${n} entrées, il en faut deux cents`);
    });
});

test('CHAQUE ÉNIGME EXPLIQUE SA RÉPONSE', () => {
    // C'est ce qui sépare une énigme d'une devinette : « 15 » ne s'apprend pas,
    // « chaque personne serre cinq mains et chaque poignée est comptée deux
    // fois » s'apprend, et resservira sur les diagonales d'un polygone. C'est
    // aussi ce dont le professeur a besoin pour répondre au « pourquoi ? » qui
    // suit toujours.
    LISTES.enigme.forEach(e => {
        assert.ok(e.explication, `sans explication : ${e.texte.slice(0, 50)}`);
        // Une explication d'une ligne n'explique rien : elle répète la réponse.
        assert.ok(e.explication.length >= 40,
            `explication trop courte (${e.explication.length}) : ${e.texte.slice(0, 40)}`);
        // Et elle reste lisible d'un coup d'œil : au-delà, c'est un corrigé.
        assert.ok(e.explication.length <= 480,
            `explication trop longue (${e.explication.length}) : ${e.texte.slice(0, 40)}`);
    });
});

test('CHAQUE FIGURE D\'ÉNIGME EXISTE VRAIMENT', () => {
    // Une figure dont le nom ne correspond à rien rendrait une chaîne vide :
    // l'énigme s'afficherait sans son dessin, sans que personne le remarque
    // avant qu'un élève tombe dessus.
    const nommees = new Set(LISTES.enigme.filter(e => e.figure).map(e => e.figure));
    assert.ok(nommees.size >= 8, `seulement ${nommees.size} figures utilisées`);
    for (const nom of nommees) {
        assert.ok(FIGURES[nom], `figure inconnue : ${nom}`);
        const svg = figureSvg(nom);
        assert.match(svg, /^\s*<svg/, `${nom} ne rend pas un SVG`);
        assert.match(svg, /aria-label="/, `${nom} n'a pas de description`);
        // PAS DE COULEUR EN DUR : la figure vit dans l'encart du jour, dans le
        // banc d'essai, sur fond clair ou sombre. Elle hérite de son contexte.
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(svg), `${nom} écrit une couleur en dur`);
        assert.match(svg, /currentColor/, `${nom} n'hérite pas de la couleur`);
    }
    // Et aucune figure dessinée pour rien : une figure qu'aucune énigme
    // n'utilise est du code mort qu'on finira par croire utile.
    for (const nom of Object.keys(FIGURES)) {
        assert.ok(nommees.has(nom), `figure jamais utilisée : ${nom}`);
    }
});

test('l\'explication ne remplace pas l\'indice, et réciproquement', () => {
    // Deux rôles distincts : l'indice dit PAR OÙ COMMENCER sans rien lâcher,
    // l'explication dit POURQUOI une fois qu'on a cherché. Les confondre
    // reviendrait à donner la réponse dans l'indice.
    LISTES.enigme.forEach(e => {
        assert.notEqual(e.indice, e.explication, `indice et explication identiques : ${e.texte.slice(0, 40)}`);
        assert.ok(e.explication.length > e.indice.length,
            `l'explication devrait en dire plus que l'indice : ${e.texte.slice(0, 40)}`);
    });
});

test('LA VUE NORMALISÉE PORTE L\'EXPLICATION ET LA FIGURE', () => {
    // C'est la couture entre les données et l'écran : si `normaliser` les
    // laisse tomber, tout le reste est écrit pour rien — et rien ne le dirait,
    // puisque l'affichage se contente d'un champ absent.
    const avecFigure = LISTES.enigme.find(e => e.figure);
    const v = normaliser('enigme', avecFigure);
    assert.equal(v.figure, avecFigure.figure);
    assert.equal(v.explication, avecFigure.explication);
    // Une énigme sans figure ne doit pas en inventer une.
    const sansFigure = LISTES.enigme.find(e => !e.figure);
    assert.equal(normaliser('enigme', sansFigure).figure, null);
    // Et les autres genres n'ont ni l'un ni l'autre : une blague expliquée
    // n'est plus une blague.
    assert.equal(normaliser('blague', LISTES.blague[0]).explication, undefined);
    assert.equal(normaliser('conseil', LISTES.conseil[0]).explication, undefined);
});
