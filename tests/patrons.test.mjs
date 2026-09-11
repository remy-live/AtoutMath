// LE PATRON DU CUBE — la géométrie du module, sans écran.
//
// Le test central de ce fichier n'éprouve pas « le jeu marche » : il éprouve
// que LE PLIAGE EST JUSTE. Il existe trente-cinq hexominos et onze d'entre eux
// se ferment en cube ; ces deux nombres sont établis de longue date, et le
// module ne les contient nulle part — il les recalcule. S'ils tombent, c'est
// que la simulation de roulement est correcte. Une liste de patrons recopiée à
// la main aurait passé n'importe quel test sans rien démontrer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    HEXOMINOS, PATRONS, FAUX, FAMILLES, ORDRE_FAMILLES, CONSIGNES,
    plier, faceOpposee, opposee, profil, difficulte, polyominos,
    canonique, normaliser, preparerSerie, arbrePliage,
    SYMBOLES, MARQUE, symbolesDe, marquesDe
} from '../js/core/patrons.js';

const cle = ([x, y]) => `${x},${y}`;

// Les deux figures que tout le monde connaît, écrites à la main pour que le
// test ait un point d'appui indépendant de l'énumération.
const CROIX = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]];
const RECTANGLE = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
const BANDE = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
const ESCALIER = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]];

test('L\'ÉNUMÉRATION RETROUVE LES NOMBRES CONNUS : 35 hexominos, 11 patrons', () => {
    // Le test qui valide tout le reste. Ces deux nombres ne sont écrits nulle
    // part dans le module : ils sont calculés par croissance puis par pliage.
    assert.equal(HEXOMINOS.length, 35);
    assert.equal(PATRONS.length, 11);
    assert.equal(FAUX.length, 24);
    assert.equal(PATRONS.length + FAUX.length, HEXOMINOS.length);
});

test('les petits polyominos, eux aussi, tombent juste', () => {
    // Une énumération qui se trompe à six cases se trompe souvent avant. Les
    // comptes de polyominos libres sont connus : 1, 1, 2, 5, 12, 35.
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(n => polyominos(n).length), [1, 1, 2, 5, 12, 35]);
});

test('LE RECTANGLE 2 × 3 N\'EST PAS UN PATRON — le piège du chapitre', () => {
    assert.equal(plier(RECTANGLE).ok, false);
    assert.ok(plier(RECTANGLE).doublons.length, 'des cases se recouvrent, et on sait lesquelles');
});

test('la croix latine en est un, et l\'escalier aussi', () => {
    assert.equal(plier(CROIX).ok, true);
    assert.equal(plier(ESCALIER).ok, true, 'le 2-2-2 est le plus déroutant des onze');
    assert.equal(plier(BANDE).ok, false, 'six cases alignées ne se ferment jamais');
});

test('un patron valide use les six faces, une fois chacune', () => {
    PATRONS.forEach(p => {
        const { faces } = plier(p);
        const prises = Object.values(faces).sort();
        assert.equal(prises.length, 6, profil(p));
        assert.deepEqual([...new Set(prises)].sort(), [0, 1, 2, 3, 4, 5], profil(p));
    });
});

test('LES FACES OPPOSÉES VONT PAR PAIRES, et la relation est symétrique', () => {
    assert.equal(opposee(0), 1);
    assert.equal(opposee(1), 0);
    assert.equal(opposee(4), 5);
    PATRONS.forEach(p => {
        const forme = normaliser(p);
        forme.forEach(c => {
            const face = faceOpposee(forme, cle(c));
            assert.ok(face, `pas d'opposée pour ${cle(c)} sur ${profil(p)}`);
            assert.notEqual(face, cle(c), 'une case n\'est pas sa propre opposée');
            assert.equal(faceOpposee(forme, face), cle(c), 'l\'opposée de l\'opposée est soi-même');
        });
    });
});

test('les trois paires d\'opposées partitionnent le patron', () => {
    PATRONS.forEach(p => {
        const forme = normaliser(p);
        const paires = new Set(forme.map(c => [cle(c), faceOpposee(forme, cle(c))].sort().join('|')));
        assert.equal(paires.size, 3, `${profil(p)} : trois paires, pas ${paires.size}`);
    });
});

test('une figure invalide n\'a pas de face opposée', () => {
    assert.equal(faceOpposee(RECTANGLE, '0,0'), null);
});

test('LE PLIAGE NE DÉPEND PAS DE LA CASE DE DÉPART', () => {
    // Le parcours commence sur `cellules[0]`. Si le verdict changeait selon la
    // case choisie, la simulation serait fausse — et l'exercice donnerait des
    // réponses différentes selon l'ordre des cases dans le tableau.
    HEXOMINOS.forEach(h => {
        const attendu = plier(h).ok;
        for (let i = 0; i < h.length; i++) {
            const tourne = [...h.slice(i), ...h.slice(0, i)];
            assert.equal(plier(tourne).ok, attendu, `${profil(h)} : verdict instable`);
        }
    });
});

test('le pliage ne dépend pas non plus de l\'orientation de la feuille', () => {
    // Tourner ou retourner une figure ne change évidemment pas ce qu'elle
    // devient une fois pliée. C'est évident, et c'est exactement pour ça qu'il
    // faut le vérifier : rien dans le code ne le garantit.
    const tourner = (cs) => normaliser(cs.map(([x, y]) => [-y, x]));
    const retourner = (cs) => normaliser(cs.map(([x, y]) => [-x, y]));
    HEXOMINOS.forEach(h => {
        const attendu = plier(h).ok;
        assert.equal(plier(tourner(h)).ok, attendu, `${profil(h)} : rotation`);
        assert.equal(plier(retourner(h)).ok, attendu, `${profil(h)} : symétrie`);
    });
});

test('les onze patrons se rangent dans les familles du collège', () => {
    const par = {};
    PATRONS.forEach(p => { par[profil(p)] = (par[profil(p)] || 0) + 1; });
    assert.deepEqual(par, { '1-4-1': 6, '2-3-1': 3, '3-3': 1, '1-2-2-1': 1 });
});

test('le nom d\'une famille ne dépend pas du sens de lecture', () => {
    // Lu par en bas, « 2-3-1 » s'écrivait « 1-3-2 » : deux noms pour une seule
    // famille, et l'élève à qui l'on dit « c'est un 2-3-1 » ne s'y retrouvait
    // plus.
    const retourner = (cs) => normaliser(cs.map(([x, y]) => [x, -y]));
    HEXOMINOS.forEach(h => assert.equal(profil(retourner(h)), profil(h), profil(h)));
});

test('deux formes identiques à une symétrie près portent le même nom canonique', () => {
    const tourner = (cs) => normaliser(cs.map(([x, y]) => [-y, x]));
    assert.equal(canonique(tourner(CROIX)), canonique(CROIX));
    assert.notEqual(canonique(RECTANGLE), canonique(CROIX));
});

// --- La série de questions --------------------------------------------------

test('UNE SÉRIE NE RÉPOND PAS OUI-NON-OUI-NON', () => {
    // La première version alternait strictement : le compte était juste, mais
    // un élève qui repérait le rythme au deuxième coup répondait sans regarder.
    // On veut l'équilibre SANS la régularité.
    const rythmes = new Set();
    for (let i = 0; i < 40; i++) {
        const q = preparerSerie(makeRng(`serie${i}`), { familles: ['reconnaitre'], combien: 8 });
        const suite = q.map(x => (x.reponse ? 'O' : 'N')).join('');
        assert.equal(suite.split('O').length - 1, 4, `${suite} : quatre patrons attendus`);
        rythmes.add(suite);
    }
    // ON NE PEUT PAS INTERDIRE « ONONONON », ET IL NE FAUT PAS.
    //
    // C'est ce que j'avais écrit, et le test a sauté sur la deuxième graine.
    // Chaque paire est battue indépendamment : la suite alternée sort une fois
    // sur seize, exactement comme n'importe quelle autre. La proscrire
    // reviendrait à truquer le tirage pour qu'il ait l'air aléatoire — le
    // défaut d'origine, à l'envers. Ce qui doit être vrai, c'est que le rythme
    // CHANGE d'une série à l'autre : c'est cela qu'on mesure.
    assert.ok(rythmes.size > 8,
        `seulement ${rythmes.size} rythmes différents sur 40 graines`);
});

test('une série ne s\'attarde pas sur les évidences', () => {
    // Mesuré : les quatre intrus tombaient tous sur des bandes droites, parce
    // que le palier 1 ne contient aucun patron valide. On n'en garde qu'une.
    for (let i = 0; i < 8; i++) {
        const q = preparerSerie(makeRng(`ev${i}`), { familles: ['reconnaitre'], combien: 8 });
        const bandes = q.filter(x => difficulte(x.forme) === 1).length;
        assert.ok(bandes <= 1, `${bandes} bandes droites dans une série de huit`);
    }
});

test('la difficulté monte, et les paliers ne sont pas vides', () => {
    const d = { 1: 0, 2: 0, 3: 0 };
    HEXOMINOS.forEach(h => d[difficulte(h)]++);
    assert.ok(d[1] && d[2] && d[3], `paliers déséquilibrés : ${JSON.stringify(d)}`);
    assert.ok(d[3] >= d[1], 'les formes retorses sont les plus nombreuses');
});

test('chaque question porte une réponse exacte, et le noyau la confirme', () => {
    const q = preparerSerie(makeRng('verif'), { combien: 12 });
    assert.ok(q.length, 'la série n\'est pas vide');
    q.forEach(x => {
        if (x.famille === 'reconnaitre') {
            assert.equal(x.reponse, plier(x.forme).ok);
        } else {
            assert.equal(plier(x.forme).ok, true, 'on ne demande les opposées que sur un patron');
            assert.equal(x.reponse, faceOpposee(x.forme, x.depart));
            assert.ok(x.forme.some(c => cle(c) === x.depart), 'la case de départ est dans la figure');
        }
    });
});

test('les réglages filtrent les familles', () => {
    ORDRE_FAMILLES.forEach(f => assert.ok(FAMILLES[f], `famille ${f} sans libellé`));
    const seul = preparerSerie(makeRng('x'), { familles: ['opposees'], combien: 6 });
    assert.equal(seul.length, 6);
    seul.forEach(q => assert.equal(q.famille, 'opposees'));
});

test('LES CONSIGNES NE DONNENT PAS LA RÉPONSE', () => {
    // Rémy : « tu donnes les réponses dans l'énoncé ». Ni la méthode, ni le
    // nombre de patrons — savoir qu'il y en a onze aiderait à compter plutôt
    // qu'à plier.
    Object.values(CONSIGNES).forEach(c => {
        assert.doesNotMatch(c, /onze|11|opposé[e]?s? sont|il suffit/i);
    });
    assert.match(CONSIGNES.reconnaitre, /plie/i);
});

// --- L'ARBRE DU PLIAGE -------------------------------------------------------
//
// Rémy : « le patron qui se plie ne se plie pas ». L'écran plie maintenant pour
// de vrai, et il le fait EN SUIVANT CET ARBRE : si l'arbre ment, l'animation
// montre un cube qui n'est pas celui que le calcul décrit. Trois promesses,
// donc — il atteint tous les carrés, il ne fait pas de boucle, et chaque pli
// est bien un pli, c'est-à-dire une arête commune entre deux carrés voisins.

test('L\'ARBRE DU PLIAGE ATTEINT TOUS LES CARRÉS, SANS BOUCLE', () => {
    for (const forme of HEXOMINOS) {
        const { racine, enfants } = arbrePliage(forme);
        const vus = new Set([racine]);
        const file = [racine];
        while (file.length) {
            for (const e of enfants[file.shift()] || []) {
                assert.equal(vus.has(e.cle), false, `deux chemins mènent à ${e.cle}`);
                vus.add(e.cle);
                file.push(e.cle);
            }
        }
        assert.equal(vus.size, forme.length,
            `${forme.length} carrés, ${vus.size} atteints`);
    }
});

test('chaque pli se fait autour d\'une arête commune', () => {
    for (const forme of HEXOMINOS.slice(0, 12)) {
        const dans = new Set(forme.map(cle));
        const { enfants } = arbrePliage(forme);
        for (const [k, liste] of Object.entries(enfants)) {
            const [x, y] = k.split(',').map(Number);
            for (const e of liste) {
                assert.equal(Math.abs(e.dx) + Math.abs(e.dy), 1,
                    'un carré ne se relève que sur un voisin de côté');
                assert.equal(e.cle, cle([x + e.dx, y + e.dy]));
                assert.ok(dans.has(e.cle));
            }
        }
    }
});

test('LA RACINE EST LIBRE : n\'importe quel carré peut rester posé', () => {
    // C'est ce qui autorise l'écran à choisir le carré le plus central pour
    // cadrer la figure. Le pliage obtenu doit être le même — mêmes carrés,
    // mêmes arêtes — quel que soit celui qu'on garde sur la table.
    const forme = CROIX;
    const aretes = (racine) => {
        const { enfants } = arbrePliage(forme, racine);
        return new Set(Object.entries(enfants).flatMap(([k, l]) =>
            l.map(e => [k, e.cle].sort().join('|'))));
    };
    const depart = aretes(cle(forme[0]));
    assert.equal(depart.size, forme.length - 1, 'un arbre de six carrés a cinq plis');
    for (const c of forme) {
        const autre = aretes(cle(c));
        assert.equal(autre.size, forme.length - 1);
        // Les plis peuvent différer d'un arbre à l'autre, mais chacun reste un
        // arbre couvrant : c'est cela qui garantit le même cube.
        autre.forEach(a => {
            const [p, q] = a.split('|').map(x => x.split(',').map(Number));
            assert.equal(Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]), 1);
        });
    }
    // Une racine qu'on ne trouve pas dans la figure ne casse rien : on repart
    // du premier carré.
    assert.equal(arbrePliage(forme, '99,99').racine, cle(forme[0]));
});


// --- LA CHORÉGRAPHIE DU PLI ----------------------------------------------------
//
// Rémy : « Les carrés ne sont pas collés quand tu plies. Fais aussi des
// rotations doucement autour du cube, et tu plies et déplies. La première fois
// tu plies sans tourner. Tu attends un peu et tu fais ce que je te demande. »

test('LE PREMIER PLI NE TOURNE PAS, ET LE TOUR VIENT APRÈS', async () => {
    const { PLI, PLI_TOTAL } = await import('../js/games/patrons.js');
    // Quatre temps, dans cet ordre : plier, regarder, tourner, déplier/replier.
    assert.ok(PLI.pli > 0 && PLI.regarde > 0, 'il faut un pli, puis une pause');
    // « Doucement » : un tour de plus d'un huitième de seconde par dizaine de
    // degrés. Sous ce seuil, on ne suit plus une face des yeux.
    assert.ok(PLI.tour / PLI.angle > 12,
        `${PLI.angle}° en ${PLI.tour} ms : c'est un pivotement, pas un tour`);
    // Un vrai tour : de quoi voir l'autre côté du cube.
    assert.ok(PLI.angle >= 120, `${PLI.angle}° ne montre pas le derrière du cube`);
    assert.equal(PLI_TOTAL,
        PLI.pli + PLI.regarde + PLI.tour + PLI.entre + PLI.deplie + PLI.entre + PLI.replie);
});

test('LA FIGURE NE CHANGE PAS AU MILIEU DU TOUR', () => {
    // Le passage à la question suivante doit attendre la fin de la
    // chorégraphie : une figure qui se remplace pendant qu'on tourne autour du
    // cube serait pire que pas de tour du tout.
    const src = readFileSync(new URL('../js/games/patrons.js', import.meta.url), 'utf8');
    assert.match(src, /\}, PLI_TOTAL \+ \d+\);/,
        'l’attente avant la question suivante ne se déduit plus de PLI_TOTAL');
});

test('UN SEUL TRAIT PAR ARÊTE — les carrés sont COLLÉS', () => {
    // Mesuré à trois fois la taille : les arêtes intérieures faisaient deux
    // pixels et le bord extérieur un seul, parce que chaque carré traçait son
    // trait CHEZ LUI. Un patron dont les plis sont deux fois plus gras que sa
    // silhouette se lit comme six carrés posés côte à côte.
    //
    // Le demi-décalage fait déborder la moitié du trait : deux voisins écrivent
    // alors au même endroit et n'en font qu'un. Le test garde ce demi, parce
    // qu'un « -1 » remis là par mégarde redonnerait exactement le défaut de
    // départ, sans que rien ne le signale.
    const src = readFileSync(new URL('../js/games/patrons.js', import.meta.url), 'utf8');
    assert.match(src, /outline-offset:\s*calc\(-0\.5 \* var\(--trait\)\)/,
        'le trait n’est plus centré sur l’arête');
    // Et il reste un « outline » : une bordure rentrerait dans la boîte et
    // décalerait les carrés les uns par rapport aux autres.
    assert.match(src, /outline:\s*var\(--trait\) solid/);
    assert.doesNotMatch(src, /\.pa-face \{[^}]*border:\s*var\(--trait\)/);
});


// --- LES SYMBOLES DES FACES ----------------------------------------------------
//
// Rémy : « pour le patron on pourrait mettre les symboles sur toutes les faces,
// pas qu'une seule (mais au départ un seul) ».

test('SIX SYMBOLES, UN PAR CARRÉ, ET L\'ÉTOILE SUR LE CARRÉ MARQUÉ', () => {
    const forme = normaliser(CROIX);
    const cases = forme.map(cle);
    // Sans carré marqué : les six symboles, tous différents.
    const sans = symbolesDe(forme);
    assert.deepEqual(Object.keys(sans).sort(), cases.slice().sort());
    assert.equal(new Set(Object.values(sans)).size, 6, 'deux carrés portent le même signe');
    assert.equal(Object.values(sans).includes(MARQUE), false, 'l’étoile sans carré marqué');

    // Avec : l'étoile prend sa place et ne consomme pas de symbole.
    for (const depart of cases) {
        const avec = symbolesDe(forme, depart);
        assert.equal(avec[depart], MARQUE, `${depart} devrait porter l’étoile`);
        assert.equal(new Set(Object.values(avec)).size, 6, `${depart} : un signe en double`);
    }
});

test('LES SYMBOLES SE LISENT DANS UN MIROIR — le cube tourne', () => {
    // Une face vue de derrière montre son symbole retourné. Un ▲ et un ▼
    // deviendraient le même signe selon d'où on regarde, et deux faces
    // porteraient alors le même nom.
    const PIEGES = ['\u25bc', '\u25c0', '\u25b6', '\u25e2', '\u25e3', '\u25e4', '\u25e5'];
    PIEGES.forEach(c => assert.equal(SYMBOLES.includes(c), false,
        `${c} est le miroir d’un autre symbole`));
    // Et aucune croix de refus : sur un exercice où l'on répond juste ou faux,
    // un carré marqué d'une croix se lit comme une correction.
    ['\u2717', '\u2718', '\u2716', '\u274c'].forEach(c =>
        assert.equal(SYMBOLES.includes(c), false, `${c} se lit comme « faux »`));
    assert.equal(SYMBOLES.length, 6);
    assert.equal(new Set([...SYMBOLES, MARQUE]).size, 7);
});

test('AU DÉPART UN SEUL, ENSUITE LES SIX', () => {
    // « mais au départ un seul » : la première figure de chaque famille garde
    // le marquage d'avant — l'étoile toute seule là où il y en avait une, rien
    // là où il n'y en avait pas.
    const serie = preparerSerie(makeRng('sym'), {});
    const premiers = {};
    serie.forEach(q => {
        if (premiers[q.famille] === undefined) {
            premiers[q.famille] = true;
            assert.equal(q.symboles, false, `${q.famille} : la première porte déjà les six`);
            const m = marquesDe(q);
            assert.equal(Object.keys(m).length, q.famille === 'opposees' ? 1 : 0,
                `${q.famille} : ${Object.keys(m).length} marques sur la première figure`);
            if (q.famille === 'opposees') assert.equal(m[q.depart], MARQUE);
            return;
        }
        assert.equal(q.symboles, true, `${q.famille} : une suivante sans symboles`);
        assert.equal(Object.keys(marquesDe(q)).length, 6);
    });
    assert.deepEqual(Object.keys(premiers).sort(), ['opposees', 'reconnaitre']);
});

test('LE RÉGLAGE FORCE LES DEUX EXTRÊMES', () => {
    preparerSerie(makeRng('u'), { symboles: 'un' })
        .forEach(q => assert.equal(q.symboles, false));
    preparerSerie(makeRng('t'), { symboles: 'tous' }).forEach(q => {
        assert.equal(q.symboles, true);
        assert.equal(Object.keys(marquesDe(q)).length, 6);
    });
});

test('LA CHORÉGRAPHIE MEURT AVEC SA FIGURE', () => {
    // Le jeton n'avançait qu'au DÉPART d'une chorégraphie : en passant à la
    // figure suivante — qui n'en lance aucune, n'étant pas encore pliée —
    // celle d'avant se croyait vivante et repliait le patron neuf EN COULEURS,
    // c'est-à-dire en donnant les faces opposées avant qu'on ait répondu.
    // Mesuré à l'écran sur la figure 2. Le jeton avance donc à chaque redessin.
    const src = readFileSync(new URL('../js/games/patrons.js', import.meta.url), 'utf8');
    const dessine = src.slice(src.indexOf('    dessiner() {'), src.indexOf('    async montrerLePli'));
    assert.match(dessine, /\+\+this\.jetonPli/,
        'le redessin n’invalide plus la chorégraphie en cours');
    assert.match(dessine, /montrerLePli\(jeton\)/, 'la chorégraphie ne reçoit plus son jeton');
    assert.doesNotMatch(src, /async montrerLePli\(\)/, 'le jeton doit venir du redessin');
});
