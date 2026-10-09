// LE POLY D'UN PARCOURS — ce que Rémy imprime vraiment.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Sa revue du 9 octobre portait sur un POLY DE PARCOURS — neuf exercices,
// numérotation continue jusqu'à 851 —, et pas sur une fiche d'exercice. Or
// toutes les sondes du dépôt mesurent des FICHES. C'est pour cela que huit
// défauts y vivaient tranquillement.
//
// ── CE QUE CES ÉPREUVES TIENNENT ──────────────────────────────────────────
//
// 1. Toute porte vers le papier doit DIRE qu'elle est le papier.
// 2. Une question dont l'énoncé est un dessin ne part pas sur une feuille qui
//    ne dessine pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { intervallesGenerator } from '../js/core/generators/intervalles.js';
import { exercices } from '../js/data/catalog.js';
import { makeRng } from '../js/core/ids.js';

const SRC = readFileSync(new URL('../js/ui/printParcours.js', import.meta.url), 'utf8');

test('TOUTE PORTE VERS LE PAPIER DIT À SON GÉNÉRATEUR QU\'ELLE EST LE PAPIER', () => {
    // RÉMY : « on ne comprend pas le 851 ». Son poly posait « |x − 3| se
    // lit : ………… » — une question dont la réponse est un CHOIX entre quatre
    // phrases, et les quatre phrases ne s'impriment pas. Le générateur sait
    // déjà l'éviter (`if (marche === 'lire' && ctx.papier)`). Il ne le savait
    // pas parce qu'on ne le lui disait pas.
    //
    // DEUX CHEMINS MÈNENT AU PAPIER dans ce fichier, et un seul le disait :
    // `questionsDe` passait `papier: true`, `grillesDe` l'avait oublié. Tout
    // exercice qui déclare un `printable` passe par la seconde porte — c'est-
    // à-dire TOUS ceux qui s'impriment en dessin.
    //
    // CETTE ÉPREUVE LIT LA SOURCE, ET C'EST ASSUMÉ. La propriété gardée n'est
    // pas une valeur qu'on pourrait mesurer sur un résultat : c'est « AUCUN
    // appel n'a été oublié ». Elle ne nomme donc aucune fonction et ne
    // tombera pas sur un renommage ; elle compte les appels, et elle verra
    // arriver un TROISIÈME chemin le jour où on l'écrira.
    // ON COMPTE LES PARENTHÈSES, et il faut vraiment le faire : une fenêtre
    // de quatre cents caractères après chaque appel paraissait suffire, mais
    // elle débordait sur le COMMENTAIRE de la fonction suivante — lequel
    // contient les mots `papier: true`. L'épreuve était alors verte avec le
    // défaut remis, et `epreuveTombe` l'a refusée. Une garde qui lit du texte
    // doit savoir où s'arrête ce qu'elle lit.
    const argumentsDe = (apres) => {
        let profondeur = 1;
        for (let i = 0; i < apres.length; i++) {
            if (apres[i] === '(') profondeur++;
            else if (apres[i] === ')' && --profondeur === 0) return apres.slice(0, i);
        }
        return apres;
    };
    // ET ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER. Le mien, posé juste
    // au-dessus de l'appel corrigé, CITE `papier: true` en toutes lettres —
    // l'épreuve restait donc verte quand on retirait la vraie ligne. C'est la
    // friction du journal dans sa forme la plus pure : « une garde qui lit la
    // source trouve son propre commentaire ».
    const sansCommentaires = SRC
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').map(l => l.replace(/\s*\/\/.*$/, '')).join('\n');
    const appels = sansCommentaires.split('.generate(').slice(1).map(argumentsDe);
    assert.ok(appels.length >= 2,
        `${appels.length} appel(s) à .generate trouvés : le motif ne reconnaît plus rien`);
    appels.forEach((args, i) => {
        assert.match(args, /papier:\s*true/,
            `l'appel n° ${i + 1} à .generate ne passe pas « papier: true » :\n${args.trim()}`);
    });
});

// ── LES INTERVALLES, DONT L'ÉNONCÉ POUVAIT ÊTRE UN DESSIN ABSENT ───────────

const tirerIv = (params, i) => intervallesGenerator.generate(params,
    { index: i, total: 12, rng: makeRng(`iv${i}`), papier: true });

test('SUR LE PAPIER, AUCUNE QUESTION NE RENVOIE À UNE DROITE QU\'ON N\'IMPRIME PAS', () => {
    // RÉMY : « Pour l'ex 145, il ne manque pas le graphique ? » et « Idem pour
    // le 845, il manque qqch ? » Sa feuille portait :
    //
    //   839.  Voir la droite graduée ci-dessus.  ..........
    //
    // Il n'y avait pas de droite au-dessus : à l'écran la question PART d'un
    // axe dessiné dans l'énoncé, et la feuille générique n'imprime que du
    // texte. Une question dont l'énoncé a disparu est insoluble.
    for (const sens of ['toutes', 'intervalle', 'inegalite', 'axe']) {
        for (let i = 0; i < 20; i++) {
            const q = tirerIv({ sens, forme: 'les-deux' }, i);
            const papier = q.prompt.papier;
            assert.doesNotMatch(papier, /droite graduée ci-dessus/,
                `« ${sens} » renvoie à un dessin absent : « ${papier} »`);
            // ET L'AUTRE SENS, que personne n'avait vu : « Quelle droite
            // graduée ? » suivi d'un pointillé demande de tracer un axe gradué
            // sur trois centimètres de ligne.
            assert.doesNotMatch(papier, /Quelle droite graduée/,
                `« ${sens} » demande de tracer un axe sur un pointillé : « ${papier} »`);
            assert.equal(q.meta.de === 'axe' || q.meta.vers === 'axe', false,
                `« ${sens} » emploie encore le sens ${q.meta.de} → ${q.meta.vers}`);
        }
    }
});

test('ET À L\'ÉCRAN, LES DEUX SENS DE L\'AXE EXISTENT TOUJOURS', () => {
    // La correction ne doit pas retirer du logiciel ce qu'elle retire de la
    // feuille : à l'écran, les quatre axes sont dessinés et l'élève choisit.
    // C'est même la seule façon de demander « sais-tu le représenter ? » à un
    // élève qui ne peut pas tracer.
    const vus = new Set();
    for (let i = 0; i < 40; i++) {
        const q = intervallesGenerator.generate({ sens: 'toutes', forme: 'les-deux' },
            { index: i, total: 40, rng: makeRng(`ecran${i}`) });
        vus.add(`${q.meta.de}>${q.meta.vers}`);
    }
    assert.ok([...vus].some(s => s.startsWith('axe>')), 'plus aucune question ne PART de l\'axe');
    assert.ok([...vus].some(s => s.endsWith('>axe')), 'plus aucune question n\'ARRIVE à l\'axe');
});

test('QUAND LA FEUILLE MÉLANGE LES TRADUCTIONS, CHAQUE LIGNE DIT CE QU\'ELLE DEMANDE', () => {
    // RÉMY : « il manque qqch ? » sous « 845. x est un réel strictement
    // supérieur à 0. .......... ». Il manquait la question : cet exercice
    // mélange les traductions, et rien ne disait s'il fallait écrire
    // l'intervalle ou l'inégalité.
    for (let i = 0; i < 12; i++) {
        const q = tirerIv({ sens: 'toutes', forme: 'les-deux' }, i);
        assert.match(q.prompt.papier, /— Quel(le)? (intervalle|inégalité) \?$/,
            `« ${q.prompt.papier} » ne dit pas ce qu'on demande`);
    }
    // ET QUAND LE PROFESSEUR A FIXÉ LE SENS, ON NE LE RÉPÈTE PAS : la consigne
    // de la feuille le dit déjà en haut, et le redire à chaque ligne est du
    // bruit.
    for (let i = 0; i < 12; i++) {
        const q = tirerIv({ sens: 'intervalle', forme: 'les-deux' }, i);
        assert.doesNotMatch(q.prompt.papier, /— Quel/,
            `« ${q.prompt.papier} » répète une consigne déjà écrite en haut`);
    }
});

test('ET LA CONSIGNE NE DEMANDE PLUS D\'ENTOURER CE QUI N\'EST PAS IMPRIMÉ', () => {
    // « Entoure la bonne réponse » devant des lignes où rien n'est proposé.
    // La feuille générique n'imprime pas les propositions, et trois des quatre
    // sont des DESSINS.
    for (const id of ['sec-intervalles', 'sec-intervalles-demi', 'sec-intervalles-ecrire']) {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `${id} a disparu du catalogue`);
        assert.doesNotMatch(e.consignePapier || '', /[Ee]ntoure/,
            `${id} : « ${e.consignePapier} » — mais rien n'est imprimé à entourer`);
        assert.match(e.consignePapier || '', /[ÉE]cris/,
            `${id} : la consigne ne dit pas ce que l'élève doit faire`);
    }
});
