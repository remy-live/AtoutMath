// LA REVUE DE RÉMY DU 24 OCTOBRE — la feuille, et la place pour répondre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Douze relevés reçus en une matinée, onze remarques dans les carnets. Les
// douze contrôles automatiques disent « rien à signaler » : ce qu'il remonte
// là n'est pas de la panne, c'est du MÉTIER — et c'est exactement ce qu'aucun
// sondage ne sait voir. D'où ces épreuves, qui gardent ses décisions à lui.
//
// ── CE QUE CE FICHIER GARDE ────────────────────────────────────────────────
//
//   · les colonnes qu'il a demandées, exercice par exercice ;
//   · la LIGNE à compléter au lieu d'une question suivie de deux lignes
//     vides ;
//   · et la place que chaque question demande pour elle-même.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { exercices } from '../js/data/catalog.js';
import { makeRng } from '../js/core/ids.js';
import { divisionFractionsGenerator } from '../js/core/generators/divisionFractions.js';
import pythagoreReciproqueGenerator from '../js/core/generators/pythagoreReciproque.js';
import { texteImprime, mesurerBonds, DEFAUTS } from '../js/core/fiche.js';
import { reglagesDeFiche } from '../js/core/reglagesFiche.js';
import { pgcdPpcmGenerator } from '../js/core/generators/pgcdPpcm.js';
import { statistiquesGenerator, ETAPES as ETAPES_STAT } from '../js/core/generators/statistiques.js';
import { lireUneFractionGenerator } from '../js/core/generators/lireUneFraction.js';
import { etapesExemple } from '../js/core/aideExercice.js';
import { dureesGenerator, arretsDesBonds, ecrireDuree } from '../js/core/generators/durees.js';
import probabilitesGenerator from '../js/core/generators/probabilites.js';
// L'IMPORT SANS LEQUEL LA MESURE MENT. Sans le registre, `paramSchemaOf` ne
// trouve pas le générateur et rend une liste VIDE — c'est-à-dire la même
// réponse qu'un réglage absent, et l'épreuve accuse alors le code.
import '../js/core/activities/index.js';
import { paramSchemaOf } from '../js/data/catalog.js';

test('LES COLONNES QU\'IL A DEMANDÉES', () => {
    // « en impression, 3 colonnes de base » — deux fois, mot pour mot. Et
    // « par défaut, mets 2 colonnes dans l'impression » sur Pythagore.
    const colonnes = (id) => {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `l'exercice ${id} doit exister`);
        return e.colonnesPapier;
    };
    assert.equal(colonnes('calc-detour-rond'), 3);
    assert.equal(colonnes('num-relatifs-melange-sprint'), 3);
    assert.equal(colonnes('geo-pythagore-reciproque'), 2);
});

test('SUR LE PAPIER, ON ÉCRIT LA LIGNE À COMPLÉTER', () => {
    // CE QUE LA FEUILLE FAISAIT : « Quel est l'inverse de 9/2 ? » et, dessous,
    // deux longues lignes de pointillés. Deux lignes ne demandent pas une
    // fraction, elles demandent une phrase — et l'élève y écrit un nombre à
    // virgule. La FORME de la place à remplir enseigne ce qu'on attend.
    const vues = new Map();
    for (let i = 0; i < 60; i++) {
        const it = divisionFractionsGenerator.generate({},
            { index: i, total: 60, rng: makeRng('r' + i), papier: true });
        vues.set(it.meta.marche, it.prompt.papier);
    }
    // « …/… » est ce que la mise en page reconnaît comme un étage de fraction
    // vide : elle empile alors deux cases sous une barre.
    assert.match(vues.get('inverse'), /^Inverse de \d+\/\d+ : …\/…$/);
    assert.match(vues.get('inverse-entier'), /^Inverse de \d+ : …\/…$/);
    assert.match(vues.get('produit-un'), /^\d+\/\d+ × …\/… = 1$/);
    assert.match(vues.get('par-un-entier'), /^\d+\/\d+ ÷ \d+ = …\/…$/);
    // LA LIGNE QU'IL A ÉCRITE DANS SON CARNET, mot pour mot :
    // « 3/2 : 6/7 = .../... * .../.... = ».
    assert.match(vues.get('par-une-fraction'),
        /^\d+\/\d+ ÷ \d+\/\d+ = …\/… × …\/… = …\/…$/);
    // ET L'ÉCRAN NE BOUGE PAS : il pose la question en toutes lettres.
    const ecran = divisionFractionsGenerator.generate({ marches: ['inverse'] },
        { index: 0, total: 1, rng: makeRng('e') });
    assert.match(ecran.prompt.text, /^Quel est l'inverse de/);
});

test('ET CES LIGNES-LÀ DONNENT DE VRAIS TROUS DE FRACTION', () => {
    // L'ÉPREUVE QUI MANQUAIT À LA PREMIÈRE. Écrire « …/… » ne sert à rien si
    // la mise en page n'y voit pas une fraction à deux étages vides : on
    // aurait une belle chaîne et deux traits côte à côte sur le papier.
    // `texteImprime` transforme chaque suite de points en une place bordée
    // d'insécables, et c'est CETTE forme que le motif des fractions reconnaît
    // (voir TROU_PERCE dans core/fiche.js).
    const t = texteImprime('Inverse de 7/3 : …/…', '3|7');
    const etages = t.split('/');
    assert.equal(etages.length, 3, `« ${t} » doit porter deux barres de fraction`);
    assert.match(etages[2], /^  {3,} $/,
        'le second étage doit être une place à remplir, pas des points');
});

test('CHAQUE QUESTION DEMANDE LA PLACE QU\'IL FAUT', () => {
    // RÉMY : « Quand tu demandes quel est le côté le plus long, une seule
    // ligne suffit pour répondre. Quand on demande si le triangle est
    // rectangle (et qu'il faut calculer), tu peux laisser un peu plus de ligne
    // (6 de pointillé) ».
    const vues = new Map();
    for (let i = 0; i < 60; i++) {
        const it = pythagoreReciproqueGenerator.generate({},
            { index: i, total: 60, rng: makeRng('p' + i) });
        vues.set(it.meta.marche, it.meta.lignesPapier);
    }
    assert.equal(vues.get('le-plus-long'), 1);
    assert.equal(vues.get('le-sommet'), 1);
    assert.equal(vues.get('conclure'), 6);
    assert.equal(vues.get('conclure-donne'), 6);
    assert.equal(vues.get('probleme'), 6);
});

test('ON PEUT DEMANDER DU PGCD SEUL, OU DU PPCM SEUL', () => {
    // RÉMY : « Il faudrait pour les problèmes pouvoir choisir entre problème
    // de PPCM ou problème de PGCD (ou les deux), on ne peut le faire pour
    // l'impression. »
    //
    // ON MESURE LA COMPÉTENCE DE L'ITEM, pas le nom de la situation : c'est
    // elle qui dit si la question est un PGCD ou un PPCM, et c'est sur elle
    // que le bilan de l'élève se range. Une épreuve qui comparerait
    // `meta.marche` à « paquets » passerait au vert le jour où l'on
    // ajouterait une seconde situation de PGCD.
    const notions = (genre) => {
        const vues = new Set();
        for (let i = 0; i < 40; i++) {
            const it = pgcdPpcmGenerator.generate(
                { marches: ['melange'], genreProbleme: genre },
                { index: i, total: 40, rng: makeRng('g' + genre + i) });
            vues.add(it.skillId);
        }
        return [...vues].sort();
    };
    assert.deepEqual(notions('pgcd'), ['num.arith.pgcd']);
    assert.deepEqual(notions('ppcm'), ['num.arith.ppcm']);
    // ET LE DÉFAUT MÊLE TOUJOURS LES DEUX : c'est la difficulté du chapitre,
    // et la séparation ne sert qu'à préparer un contrôle d'une notion.
    assert.deepEqual(notions('les-deux'), ['num.arith.pgcd', 'num.arith.ppcm']);
    assert.deepEqual(notions(undefined), ['num.arith.pgcd', 'num.arith.ppcm']);
});

test('ET ON PEUT LE DEMANDER DEPUIS LA FEUILLE', () => {
    // « on ne peut le faire pour l'impression » — c'est la moitié de sa
    // phrase, et c'est la moitié qui manquait. MESURÉ AVANT : le panneau
    // d'impression de « Problèmes de PGCD et de PPCM » n'offrait QU'UN
    // réglage, la liste des vingt marches.
    const surLaFeuille = (id) => {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `l'exercice ${id} doit exister`);
        return reglagesDeFiche({
            schemaCatalogue: paramSchemaOf(e) || [],
            paramsGenerateur: pgcdPpcmGenerator.params || [],
            reglages: e.params || {}
        }).map(p => p.id);
    };
    assert.ok(surLaFeuille('num-pgcd-ppcm-problemes').includes('genreProbleme'),
        'le réglage doit s\'offrir sur la feuille des problèmes');
    // ET IL NE S'AFFICHE PAS LÀ OÙ IL NE FERAIT RIEN : les dix-sept marches
    // de « Décomposer, PGCD et PPCM » ne comptent pas « mélange ».
    assert.ok(!surLaFeuille('num-pgcd-ppcm').includes('genreProbleme'),
        'un réglage qui ne change rien à la feuille n\'y a pas sa place');
});

// ── GROUPE C : CE QU'UN INDICE DIT, CE QU'UNE FIGURE MONTRE ────────────────

test('TOUTE MÉDIANE DIT DE RANGER DANS L\'ORDRE CROISSANT', () => {
    // RÉMY : « Quand on demande la médiane, en indice, il faut dire qu'il faut
    // ranger les nombres dans l'ordre croissant ».
    //
    // LA MARCHE PAIRE NE LE DISAIT PAS DU TOUT, et c'est la pire des trois :
    // elle donne la série EN DÉSORDRE, et son premier indice ne parlait que du
    // nombre pair de valeurs. L'élève qui le suit à la lettre prend les deux du
    // milieu de la liste TELLE QU'ELLE EST ÉCRITE, et il a faux en ayant fait
    // exactement ce qu'on lui disait.
    // ON REGARDE LE PREMIER INDICE, PAS LA RÉUNION DES TROIS.
    //
    // Première version de cette épreuve : elle joignait tous les indices et
    // cherchait « ordre croissant » dedans. `epreuveTombe` a dit « CETTE
    // ÉPREUVE NE GARDE RIEN » — en retirant la phrase du PREMIER indice, le
    // DERNIER la portait encore et l'épreuve restait verte. Or le premier est
    // celui qu'on touche quand on sèche ; le dernier, celui que le robot dit
    // en jouant tout seul. Ce sont deux moments, et la phrase doit être aux
    // deux.
    const MEDIANES = ['mediane-rangee', 'mediane-desordre', 'mediane-paire'];
    MEDIANES.forEach(marche => {
        const it = statistiquesGenerator.generate({ marches: [marche] },
            { index: 0, total: 1, rng: makeRng('m' + marche) });
        const h = it.hints || [];
        assert.match(String(h[0]), /ordre croissant/i,
            `${marche} : le PREMIER indice ne dit pas de ranger dans l'ordre croissant`);
        assert.match(String(h[h.length - 1]), /rangée|range/i,
            `${marche} : le robot ne parle pas de ranger avant de taper`);
    });
});

test('LE ROBOT POSE LE CALCUL, IL NE DÉCRIT PAS UN GESTE', () => {
    // RÉMY : « le robot doit aussi montrer comment on calcule la moyenne et
    // montrer comment on trouve une médiane ».
    //
    // SUR LE PAVÉ NUMÉRIQUE, LE ROBOT PRONONCE LE DERNIER INDICE juste avant
    // de taper — et seulement s'il tient en cent dix caractères (`COURT` dans
    // activities/numeric.js). Au-delà, il retombe sur « Je tape 12 chiffre par
    // chiffre », qui est un commentaire de GESTE. Le dernier indice de cet
    // exercice faisait cent trente-trois caractères.
    //
    // L'ÉPREUVE REGARDE LES NEUF MARCHES, et pas seulement celles qu'il a
    // citées : la remarque vaut pour toutes, et une marche ajoutée demain
    // doit la respecter sans que personne ait à y penser.
    const COURT = 110;
    const numeric = readFileSync(new URL('../js/core/activities/numeric.js', import.meta.url), 'utf8');
    assert.match(numeric, new RegExp(`const COURT = ${COURT};`),
        'la bulle du robot a changé de taille : cette épreuve mesure l\'ancienne');
    ETAPES_STAT.forEach(e => {
        const it = statistiquesGenerator.generate({ marches: [e.id] },
            { index: 0, total: 1, rng: makeRng('c' + e.id) });
        const h = it.hints || [];
        const dernier = String(h[h.length - 1] || '');
        assert.ok(dernier.length > 0 && dernier.length <= COURT,
            `${e.id} : dernier indice de ${dernier.length} caractères — le robot se taira`);
        assert.ok(!/brouillon/i.test(dernier),
            `${e.id} : le dernier indice parle du GESTE, pas du calcul`);
    });
});

test('« ON EN CONNAÎT TROIS » NE SE LIT PLUS COMME UNE VALEUR', () => {
    // RÉMY, en recopiant son énoncé : « La moyenne des 4 notes de la classe est
    // de 12. On en connaît 3 : 12 ; 9 ; 11. » puis « On a l'impresion que le 3
    // fait partie de la série. »
    //
    // DEUX CORRECTIONS, ET IL FAUT LES DEUX : le compte en LETTRES, et la série
    // sur SA PROPRE LIGNE comme dans les huit autres marches. L'une sans
    // l'autre laisse la liste accrochée à la phrase.
    for (let i = 0; i < 12; i++) {
        const it = statistiquesGenerator.generate({ marches: ['moyenne-manquante'] },
            { index: i, total: 12, rng: makeRng('q' + i) });
        const texte = it.prompt.text;
        assert.match(texte, /On en connaît (trois|quatre) :/,
            `le compte doit être écrit en lettres — « ${texte.slice(0, 80)}… »`);
        assert.ok(!/On en connaît \d/.test(texte),
            `un chiffre devant les deux-points : « ${texte.slice(0, 80)}… »`);
        // ET LA SÉRIE A SA LIGNE : le HTML la pose dans son propre bloc.
        assert.match(it.prompt.html, /<span class="st-serie">[^<]*\d/);
    }
});

test('UNE ÉTAPE QUI DESSINE GARDE SON DESSIN DANS L\'EXEMPLE', () => {
    // RÉMY, sur « Lis la Fraction » : « dans le montre moi, la figure n'est pas
    // divisée avec ses parts ».
    //
    // Le second indice de cet exercice REDÉCOUPE la figure — Rémy l'avait
    // demandé lui-même (« pour l'indice, dessine les traits de séparation »).
    // Le dessin voyage dans `item.schemas` ; l'exemple ne lisait que
    // `item.hints`, et affichait « Voilà la figure avec toutes ses coupes »
    // sous la figure SANS ses coupes.
    const it = lireUneFractionGenerator.generate({},
        { index: 0, total: 1, rng: makeRng('lf') });
    assert.ok((it.schemas || []).some(Boolean), 'le générateur ne dessine plus rien');
    const ex = etapesExemple(it);
    assert.equal(ex.dessins.length, ex.etapes.length,
        'un dessin par étape, sinon ils glissent d\'un cran');
    assert.ok(ex.dessins.some(d => d && d.includes('<svg')),
        'aucune étape ne porte son dessin');
    // ET LE DESSIN SUIT SON ÉTAPE, même quand le dernier indice a été écarté
    // parce qu'il redisait l'explication : c'est là que l'alignement se perd.
    const iDessin = ex.dessins.findIndex(Boolean);
    assert.match(ex.etapes[iDessin], /Voilà/,
        "le dessin n'est pas sous l'étape qui l'annonce");
});

test('ET LES DEUX ÉCRANS DE L\'EXEMPLE LE DESSINENT', () => {
    // Le panneau d'aide et le mode apprentissage montrent le MÊME exemple par
    // deux chemins. C'est la troisième fois qu'une correction n'est posée que
    // sur l'un des deux ; l'épreuve regarde donc les deux dans la même boucle.
    [['js/ui/aideExercice.js', 'aide-etape-figure'],
        ['js/core/runner.js', 'learn-etape-figure']].forEach(([f, classe]) => {
        const S = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
        assert.ok(S.includes(classe), `${f} ne dessine pas le schéma de l'étape`);
        assert.match(S, /dessins \|\| \[\]/, f);
    });
    const CSS = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
    assert.match(CSS, /\.aide-etape-figure svg \{[^}]*max-height/);
    const MOD = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');
    assert.match(MOD, /\.learn-etape-figure svg \{[^}]*max-height/);
});

test('LA SOUSTRACTION DE DURÉES SE FAIT PAR BONDS', () => {
    // RÉMY : « Moi j'aimerai bien que si on calcule 3:17-1:48 / On ait le schéma
    // suiavt, 1:48 --> 2:00 --> 3:17 avec +.... au-dessus de chaque flèche /
    // Avec flèche et bulle, qqch de propre pour bien montrer. »
    //
    // CE N'EST PAS UNE ILLUSTRATION, C'EST UNE MÉTHODE. On ne pose pas une
    // soustraction de durées en colonnes — la retenue y vaut soixante et non
    // dix, et c'est l'erreur que cet exercice existe pour attraper.
    for (let i = 0; i < 8; i++) {
        const it = dureesGenerator.generate({ marches: ['difference'] },
            { index: i, total: 8, rng: makeRng('b' + i) });
        // ── LE SCHÉMA EST SUR LE PREMIER INDICE ────────────────────────────
        //
        // RÉMY, capture à l'appui : « je ne vois pas les schémas pour les heures
        // et minutes ». MESURÉ sur son chemin, dans un navigateur : après UN clic
        // sur « Un indice », le texte s'affiche et le dessin n'est pas là — il
        // attendait le SECOND. Un dessin qu'il faut demander deux fois est un
        // dessin qu'on ne voit pas.
        const dessin = (it.schemas || [])[0] || '';
        assert.match(dessin, /<svg class="md-bonds"/,
            `rien au PREMIER indice — ${it.prompt.text}`);
        // DES BULLES ET DES FLÈCHES, et autant de flèches que de bonds.
        const bulles = (dessin.match(/<circle /g) || []).length;
        const fleches = (dessin.match(/marker-end=/g) || []).length;
        assert.ok(bulles >= 2, `${bulles} bulle(s) : il en faut au moins deux`);
        assert.equal(fleches, bulles - 1, 'une flèche entre deux bulles, pas plus');
        // LES POINTILLÉS, PAS LES VALEURS : son « +.... ». Un schéma qui porte
        // les deux gains EST la correction, et il n'y a plus rien à chercher.
        assert.equal((dessin.match(/\+ ……/g) || []).length, fleches,
            'chaque flèche doit porter son « + …… » à remplir');
        // ET L'INDICE DIT LA VÉRITÉ SUR CETTE SOUSTRACTION-LÀ.
        //
        // Vu sur sa capture : « 3 h 15 − 5 min », où les minutes du haut sont
        // les plus grandes. L'indice lui disait quand même « on n'en pose pas
        // une », alors que c'est exactement ce qu'il fallait faire. Un indice
        // qui détourne d'une méthode JUSTE est pire qu'un indice absent.
        const premier = String((it.hints || [])[0]);
        assert.ok(!/Additionne les heures/.test((it.hints || []).join(' ')),
            'la différence a gardé les indices de la somme');
        if (it.meta.deborde) {
            assert.match(premier, /N'EN POSE PAS UNE/,
                `avec retenue, il faut avancer — ${it.prompt.text}`);
        } else {
            assert.match(premier, /tu peux poser/,
                `sans retenue, poser est la route courte — ${it.prompt.text}`);
        }
    }
});

test('LE SCHÉMA SE POSE SOUS L\'ÉNONCÉ, ET L\'ON ÉCRIT DEDANS', () => {
    // TROIS MESSAGES DE RÉMY EN DEUX JOURS, et le troisième défait une partie
    // du premier :
    //
    //   « mets un bouton shéma sous le calcul de soustraction et on pourra
    //     compléter les pointillés »
    //   « et il faut pouvoir écrire dans les bulles »
    //   « petit bug quand on demande l'incide, enlève le bouton shéma
    //     finalement »
    //
    // CE QU'IL VOYAIT SUR SA CAPTURE : le schéma DEUX FOIS. Une fois posé sous
    // l'énoncé par l'indice, en pointillés morts ; une fois dans le panneau du
    // bouton, avec ses cases. Deux dessins de la même chose, dont un seul
    // répondait quand on écrivait dedans.
    //
    // CE QUE GARDE CETTE ÉPREUVE : un seul dessin, celui qui se pose — et
    // c'est LUI qui porte les cases.
    for (let i = 0; i < 8; i++) {
        const it = dureesGenerator.generate({ marches: ['difference'] },
            { index: i, total: 8, rng: makeRng('o' + i) });
        // LE BOUTON EST PARTI, et une épreuve doit le dire : sans cela, le
        // jour où quelqu'un le remet, rien ne bronche et le doublon revient.
        assert.ok(!(it.meta && it.meta.outils),
            `le bouton « Schéma » est revenu sur ${it.prompt.text}`);
        const html = (it.meta && it.meta.schemaPose) || '';
        assert.match(html, /<svg class="md-bonds"/,
            `rien à poser sous ${it.prompt.text}`);
        // AUTANT DE CASES QUE DE BONDS, plus celle du total quand il y en a deux
        // à ajouter. Elles sont de TEXTE : on y écrit « 40 min », pas un
        // chiffre — le filtre des cases d'outils est né pour le tableau de
        // numération, où une colonne porte un chiffre et un seul.
        const fleches = (html.match(/marker-end=/g) || []).length;
        const bulles = (html.match(/class="md-bulle"/g) || []).length;
        assert.equal(bulles, fleches, 'une bulle par flèche, pas plus');
        assert.equal((html.match(/data-case-outil="texte"/g) || []).length,
            fleches + (fleches > 1 ? 1 : 0),
            `cases comptées sur ${it.prompt.text}`);
        // PAS DE `placeholder` : photographié, son pointillé se posait sur le
        // pointillé qui souligne la case, et l'on voyait deux rangées de points.
        assert.ok(!/placeholder=/.test(html), 'la case a repris un marque-page');
        // ET LA CARTE D'INDICE, ELLE, NE DEMANDE RIEN À ÉCRIRE : elle est
        // MODALE, une case qu'elle porterait s'effacerait dès « Merci ! ».
        // C'est pour cela que `schemaPose` est un dessin DIFFÉRENT de
        // `schemas[]`, et non le même passé deux fois.
        const indice = (it.schemas || [])[0] || '';
        assert.ok(!/<input/.test(indice),
            'une case dans la carte d\'indice s\'efface dès qu\'on la referme');
        assert.notEqual(html, indice, 'le dessin posé et celui de la carte sont le même');
        // ── LA POINTE S'ARRÊTE AVANT LE POINT, SANS LÂCHER LA LIGNE ────────
        //
        // RÉMY : « l'extrémité de la pointe de la flèche arrive sur le cercle ».
        // La première correction a reculé la fin de la courbe EN HAUTEUR, et la
        // flèche flottait alors au-dessus de son arrêt — c'est la photo qui l'a
        // dit, pas la mesure. Les deux bornes gardent donc les deux défauts.
        const finX = [...html.matchAll(/Q [\d.]+ [\d.]+\s+([\d.]+) ([\d.]+)"/g)]
            .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
        const points = [...html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)]
            .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
        assert.equal(finX.length, fleches, 'les fins de courbe ne se lisent plus');
        finX.forEach((fin, n) => {
            const vise = points[n + 1];
            assert.ok(vise.x - fin.x >= 12,
                `la courbe finit à ${(vise.x - fin.x).toFixed(1)} du centre : la pointe touche`);
            assert.ok(vise.y - fin.y <= 6,
                `la courbe finit ${(vise.y - fin.y).toFixed(1)} au-dessus de la ligne : elle flotte`);
        });
    }
    // ET PAS SUR LA SOMME. Une addition de durées se pose ; avancer par bonds
    // n'y apprend rien, et un bouton qui ne sert à rien apprend à ne pas
    // appuyer sur les boutons.
    for (let i = 0; i < 6; i++) {
        const it = dureesGenerator.generate({ marches: ['somme'] },
            { index: i, total: 6, rng: makeRng('s' + i) });
        assert.ok(!(it.meta && it.meta.schemaPose),
            `la somme a reçu un schéma — ${it.prompt.text}`);
    }
    // ── LES TROIS CHAÎNONS SANS LESQUELS LA DÉCLARATION EST MUETTE ─────────
    const CH = readFileSync(new URL('../js/core/activities/choice.js', import.meta.url), 'utf8');
    // 1. C'EST `schemaPose` QU'ON POSE quand il existe, et non le dessin de la
    //    carte : sans cette ligne, le dessin posé redevient muet et personne ne
    //    peut plus rien y écrire.
    assert.match(CH, /session\.current\.meta\.schemaPose\) \|\| session\.schemaIndice;/,
        'le dessin posé ne reprend plus celui qui porte les cases');
    // 2. ON NE LE REPOSE PAS PAR-DESSUS LUI-MÊME. Un second indice réécrivait
    //    le dessin, donc vidait les bulles — sans un mot.
    assert.match(CH, /if \(deja !== dessin\) \{/,
        'un second indice efface ce que l\'élève a écrit');
    // 3. ET LES FRAPPES NE DOIVENT PAS ARRIVER À L'ACTIVITÉ : le dessin est un
    //    descendant du conteneur, qui écoute le clavier. Sans la barrière,
    //    taper « 40 » dans une bulle répondrait AUSSI à la question.
    assert.match(CH, /brancherCasesPosees\(pose\);/,
        'les cases du dessin posé ne sont pas branchées');
    const OU = readFileSync(new URL('../js/core/activities/outils.js', import.meta.url), 'utf8');
    assert.match(OU, /export function brancherCasesPosees\(racine\) \{/);
    // ET LE RÉGIME DE CASE LIBRE, sans quoi « 40 min » perd cinq caractères sur
    // six : le filtre d'origine ne garde qu'UN chiffre par case.
    assert.match(OU, /const libre = \(c\) => c\.dataset\.caseOutil === 'texte';/);
    assert.equal((OU.match(/if \(libre\(c\)\)/g) || []).length, 2,
        'la case de texte doit échapper AU FILTRE et AUX FLÈCHES');
});

test('ET LE SCHÉMA DESCEND SUR LA FEUILLE IMPRIMÉE', () => {
    // RÉMY, en choisissant le dessin de l'écran : « tu me fera aussi une version
    // imprimé pour les schémas ».
    //
    // CE N'EST PAS LE DESSIN DE L'ÉCRAN QUI VOYAGE. La feuille mesure en
    // millimètres et trace DEUX FOIS — l'aperçu en HTML, le PDF en jsPDF. Le
    // générateur n'envoie donc que les ARRÊTS, et `mesurerBonds` décide où
    // tombe chaque trait, une fois, pour les deux traceurs.
    for (let i = 0; i < 8; i++) {
        const it = dureesGenerator.generate({ marches: ['difference'] },
            { index: i, total: 8, rng: makeRng('p' + i) });
        const b = it.prompt.bonds;
        assert.ok(b && b.arrets, `pas de schéma papier sur ${it.prompt.text}`);
        // LE PAPIER MONTRE LE MÊME CHEMIN QUE L'ÉCRAN, et pas un chemin qui lui
        // ressemble : c'est `arretsDesBonds` qui répond aux deux.
        assert.deepEqual(b.arrets, arretsDesBonds(it.meta.y, it.meta.x).map(ecrireDuree),
            `l'écran et la feuille ne s'arrêtent pas aux mêmes endroits`);
    }
    // ET IL SE RETIRE. Deux centimètres par question : sur une feuille de vingt
    // calculs rapides, le professeur voudra le laisser au vestiaire.
    const sans = dureesGenerator.generate(
        { marches: ['difference'], schemaPapier: false },
        { index: 0, total: 4, rng: makeRng('x') });
    assert.ok(!sans.prompt.bonds, 'le réglage « schéma » ne retire rien');
    // PAS SUR LA SOMME : on la pose, et avancer par bonds n'y apprend rien.
    const somme = dureesGenerator.generate({ marches: ['somme'] },
        { index: 0, total: 4, rng: makeRng('y') });
    assert.ok(!somme.prompt.bonds, 'la somme a reçu un schéma');

    // ── LE CHAÎNON, DANS LES DEUX PANNEAUX D'IMPRESSION ────────────────────
    //
    // On COMPTE, on ne cherche pas : `printQuestions.js` et `printParcours.js`
    // recopient l'item à la main, et un `assert.match` qui trouve la ligne dans
    // le premier se déclare content pendant que le second reste muet. C'est
    // exactement ce qui est arrivé au menu « Présentation ».
    const panneaux = ['js/ui/printQuestions.js', 'js/ui/printParcours.js']
        .map(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
    panneaux.forEach((S, k) => assert.match(S,
        /bonds: \(item\.prompt && item\.prompt\.bonds\) \|\| null,/,
        `le panneau ${k + 1} ne transmet pas le schéma`));

    // ── ET LES DEUX TRACEURS ───────────────────────────────────────────────
    const R = readFileSync(new URL('../js/ui/ficheRendu.js', import.meta.url), 'utf8');
    assert.match(R, /if \(it\.bonds\) html \+= bondsApercu\(it\.bonds, k, o\);/);
    assert.match(R, /if \(it\.bonds\) bondsPdf\(pdf, it\.bonds, o\);/);
    // AUCUN DES DEUX NE RECALCULE UNE COORDONNÉE. Le jour où l'un d'eux
    // s'autorise un `Math.` de son cru, l'aperçu et le PDF commencent à
    // diverger, et personne ne s'en aperçoit avant une photocopie.
    const traceurs = R.slice(R.indexOf('function bondsApercu'));
    const pdfPart = traceurs.slice(traceurs.indexOf('function bondsPdf'),
        traceurs.indexOf('/** Les items d\'une page, dans le PDF. */'));
    const apercuPart = traceurs.slice(0, traceurs.indexOf('export function apercuItems'));
    [apercuPart, pdfPart].forEach((bout, k) => assert.ok(!/Math\.(min|max|hypot|PI)/.test(bout),
        `le traceur ${k + 1} calcule une géométrie au lieu de la lire`));
});

test('LA GÉOMÉTRIE DU SCHÉMA IMPRIMÉ TIENT DANS SA BOÎTE', () => {
    // UNE MESURE DE TEXTE DE PACOTILLE suffit : on garde la FORME, pas la
    // police. Ce que l'on vérifie ne dépend pas de la largeur exacte d'un
    // « 1 h 45 », mais du fait que rien ne sorte et que la pointe s'arrête.
    const mes = (t, taille) => String(t).length * taille * 0.55;
    const o = { ...DEFAUTS };
    [['45 min', '1 h', '1 h 45'], ['1 h 20', '1 h 40']].forEach(arrets => {
        const b = mesurerBonds({ arrets }, 76, o, mes);
        assert.equal(b.arcs.length, arrets.length - 1);
        assert.equal(b.gains.length, arrets.length - 1);
        b.arcs.forEach((a, i) => {
            // ── LA POINTE S'ARRÊTE AVANT L'ARRÊT ──────────────────────────
            //
            // La remarque que Rémy a faite sur l'écran — « l'extrémité de la
            // pointe de la flèche arrive sur le cercle » — se reposerait ici
            // mot pour mot, et sur du papier on ne la corrige plus après coup.
            const air = b.xs[i + 1] - b.R - a.x2;
            assert.ok(air >= 1.5 && air <= 4,
                `${air.toFixed(2)} mm entre la pointe et l'arrêt (on veut 1,5 à 4)`);
            // LA POINTE REGARDE L'ARRÊT : ses deux autres sommets sont DERRIÈRE
            // son bout. Un triangle retourné dessinerait une flèche qui recule.
            assert.equal(a.pointe[0][0], a.x2);
            assert.ok(a.pointe[1][0] < a.x2 && a.pointe[2][0] < a.x2,
                'la pointe est retournée');
            // LE SOMMET DE L'ARC EST ENTRE LE TROU ET LA LIGNE. Au-dessus, il
            // traverse le « + …… » ; en dessous, il n'y a plus de saut.
            const sommet = (a.y1 + 2 * a.cy + a.y2) / 4;
            assert.ok(sommet > b.yGain && sommet < b.yLigne,
                `le sommet de l'arc tombe à ${sommet.toFixed(2)}`);
        });
        // RIEN NE SORT DE LA BOÎTE, ni par les côtés ni par le bas : le
        // traceur y ajoute le coin où il pose le schéma, et ce qui déborde
        // s'imprime sur la question d'à côté.
        b.gains.forEach(g => {
            assert.ok(g.x >= 0, 'un « + …… » déborde à gauche');
            assert.ok(g.x + g.wPlus + g.wTrou <= b.w + 0.01, 'un « + …… » déborde à droite');
        });
        assert.ok(b.xs[0] >= 0 && b.xs[b.xs.length - 1] <= b.w);
        assert.ok(b.yEtiq < b.h, 'les étiquettes sortent par le bas');
        // ── ET EN TROIS COLONNES, où la place tombe à 56 mm ───────────────
        //
        // C'est le réglage déclaré de « Heures et Minutes » : on y repasse pour
        // vérifier que le dessin tient encore dans sa boîte, et PAS que les
        // étiquettes y tiennent — cette seconde épreuve-là, écrite puis mise à
        // l'épreuve d'un défaut remis, restait verte avec l'ancien code comme
        // avec le neuf. Elle ne gardait rien. Voir le commentaire de
        // `mesurerBonds` : le plafond ne mord pas à ces tailles-là.
        const etroit = mesurerBonds({ arrets }, 56, o, mes);
        assert.ok(etroit.w <= 56, 'le schéma déborde de la colonne');
        assert.ok(etroit.xs[0] >= 0
            && etroit.xs[etroit.xs.length - 1] <= etroit.w + 0.01,
            'un arrêt sort de la colonne');
        etroit.gains.forEach(g => assert.ok(
            g.x >= 0 && g.x + g.wPlus + g.wTrou <= etroit.w + 0.01,
            'un « + …… » sort de la colonne étroite'));
    });
    // DEUX ARRÊTS AU MOINS, sinon il n'y a pas de bond à dessiner.
    assert.equal(mesurerBonds({ arrets: ['1 h'] }, 76, o, mes), null);
});

test('ET LA LIGNE DE RÉPONSE PASSE SOUS LE SCHÉMA, PAS DEDANS', () => {
    // LE SCHÉMA EST LE BROUILLON, PAS LA RÉPONSE. Un tableau à remplir PREND la
    // place de la réponse (`sansPointilles`) ; le schéma, non — on y pose ses
    // bonds, puis on écrit le résultat sur la ligne, comme au cahier.
    //
    // ET SA HAUTEUR DOIT ENTRER DANS LE CALCUL DE CETTE LIGNE. Elle était
    // comptée dans la hauteur de la cellule mais pas dans l'endroit où la
    // réponse commence : les pointillés se posaient alors EN PLEIN MILIEU du
    // dessin.
    const F = readFileSync(new URL('../js/core/fiche.js', import.meta.url), 'utf8');
    assert.match(F, /const sansPointilles = trou \|\| trouDessine \|\| memeLigne \|\| \(tableau && tableau\.aRemplir\);/,
        'le schéma a pris la place de la ligne de réponse');
    assert.match(F, /\+ \(cell\.choix \? o\.interligne : 0\) \+ \(cell\.hBonds \|\| 0\) \+ pas \* 0\.72,/,
        'la ligne de réponse ignore la hauteur du schéma');
    assert.match(F, /const bonds = q\.bonds \? mesurerBonds\(q\.bonds, texteW, o, mes\) : null;/);
});

test('ET LA TABLE DE SOIXANTE AIDE À TROUVER LES HEURES', () => {
    // RÉMY : « Et aussi en indice une table de 60 pour trouver le nombre
    // d'heure ».
    //
    // ELLE N'AIDE QUE SI ELLE MONTRE OÙ ÇA S'ARRÊTE : la dernière ligne qui ne
    // dépasse pas donne les heures, et ce qui manque pour y arriver donne les
    // minutes. Une table juste qui ne signale rien est une colonne de chiffres.
    for (let i = 0; i < 8; i++) {
        const it = dureesGenerator.generate({ marches: ['vers-heures'] },
            { index: i, total: 8, rng: makeRng('t' + i) });
        // AU PREMIER INDICE, pour la même raison que les bonds : elle attendait
        // le TROISIÈME, et personne ne clique trois fois.
        const table = (it.schemas || [])[0] || '';
        assert.match(table, /<ul class="md-table-60">/,
            `rien au PREMIER indice — ${it.prompt.text}`);
        const total = Number(it.prompt.text.match(/(\d+) minutes/)[1]);
        const tiennent = [...table.matchAll(/md-table-tient">(\d+) h = (\d+) min/g)];
        assert.equal(tiennent.length, Math.floor(total / 60),
            `${total} min : ${tiennent.length} ligne(s) signalée(s)`);
        // ET LA TABLE VA PLUS LOIN QUE LA RÉPONSE : sans une ligne au-dessus,
        // rien ne dit pourquoi on s'arrête là.
        const toutes = [...table.matchAll(/<li[^>]*>(\d+) h =/g)].map(m => Number(m[1]));
        assert.ok(Math.max(...toutes) > Math.floor(total / 60),
            'la table s\'arrête sur la réponse : elle ne montre pas l\'encadrement');
    }
});

test('LE SAC ET LA ROUE SE VOIENT', () => {
    // RÉMY : « Je trouve que tu pourrais faire des illustrations avec des roues
    // de couleurs, des urnes etc. »
    //
    // IL REPREND UNE PHRASE QUI ÉTAIT DÉJÀ ÉCRITE DANS LE GÉNÉRATEUR : « la
    // roue se lit sur un dessin qu'on n'a pas, donc son énoncé doit dire les
    // secteurs un par un ». On avait contourné le manque par des mots.
    const MARCHES = ['sac', 'roue', 'pas-cette-couleur'];
    MARCHES.forEach(marche => {
        for (let i = 0; i < 4; i++) {
            const it = probabilitesGenerator.generate({ marches: [marche] },
                { index: i, total: 4, rng: makeRng('z' + marche + i) });
            const fig = (it.prompt.html.match(/<span class="pb-figure">([\s\S]*?)<\/span>/) || [])[1];
            assert.ok(fig, `${marche} : aucune illustration`);
            // LE DESSIN COMPTE CE QUE LA PHRASE ANNONCE. Un sac de dix boules
            // sous un énoncé qui en annonce douze apprendrait à ne pas regarder.
            const total = Number(it.prompt.text.match(/soit (\d+) |partagée en (\d+) /)
                ?.slice(1).find(Boolean));
            assert.ok(Number.isFinite(total), `${marche} : total illisible`);
            // ON COMPTE PAR LA CLASSE, PAS PAR LA BALISE : la roue porte aussi
            // une flèche en <path> et un axe en <circle>. La première version de
            // cette épreuve annonçait « 12 dessinés pour 11 annoncés » — un
            // défaut de la MESURE, pas du dessin.
            const pieces = (fig.match(marche === 'roue'
                ? /class="pb-secteur"/g : /class="pb-boule"/g) || []).length;
            assert.equal(pieces, total,
                `${marche} : ${pieces} dessinés pour ${total} annoncés`);
        }
    });
});

test('ET LE DESSIN SE RANGE ENTRE LA SITUATION ET LA QUESTION', () => {
    // Il illustre ce qu'on vient de lire, et c'est en le regardant qu'on lit la
    // question. Posé après, il arrive trop tard ; posé avant la situation, il
    // montre quelque chose qu'on n'a pas encore décrit.
    const it = probabilitesGenerator.generate({ marches: ['sac'] },
        { index: 0, total: 1, rng: makeRng('ordre') });
    const h = it.prompt.html;
    assert.ok(h.indexOf('ap-situation') < h.indexOf('pb-figure'));
    assert.ok(h.indexOf('pb-figure') < h.indexOf('ap-question'));
    // ET LA FEUILLE IMPRIMÉE N'EN VEUT PAS : elle ne sait pas tracer du SVG,
    // et sa phrase dit déjà les comptes. Un `<svg` dans `papier` sortirait en
    // balises sur le papier.
    assert.ok(!/<svg|<span/.test(it.prompt.papier), 'du balisage sur la feuille');
});

test('LA FEUILLE HONORE CE QUE LA QUESTION DEMANDE', () => {
    // LE CHAÎNON QUI PORTE TOUT : sans lui, le générateur déclare dans le vide.
    // Trois fichiers, trois lignes, et une seule qui manque suffit à rendre la
    // déclaration muette — c'est le genre de chemin qu'on croit branché.
    const print = readFileSync(new URL('../js/ui/printQuestions.js', import.meta.url), 'utf8');
    assert.match(print, /lignes: \(item\.meta && item\.meta\.lignesPapier\) \|\| null,/);
    const fiche = readFileSync(new URL('../js/core/fiche.js', import.meta.url), 'utf8');
    // LA QUESTION PASSE DEVANT LE RÉGLAGE DE LA FEUILLE, et pas l'inverse :
    // un exercice qui sait ce qu'il attend en sait plus qu'un menu global.
    assert.match(fiche, /const nRepQ = Math\.max\(0, Math\.round\(Number\(q\.lignes\) \|\| 0\)\);/);
    assert.match(fiche, /const nRep = nRepQ \|\| Math\.max\(0, Math\.round\(Number\(o\.lignesReponse\) \|\| 0\)\);/);
    // UNE LIGNE VAUT SEPT MILLIMÈTRES, le même chiffre que le menu : six
    // lignes demandées ici et six demandées là-bas doivent donner la même
    // hauteur, sinon le réglage et la déclaration se contredisent sur la même
    // feuille.
    assert.match(fiche, /const hRep = nRepQ \? Math\.max\(o\.ligneReponse, 7 \* nRepQ\) : ligneRep;/);
    assert.match(fiche, /nRep, hRep,/);
    assert.match(fiche, /const pas = \(cell\.hRep \|\| ligneRep\) \/ nRep;/);
});
