// L'ARBRE DES PHRASES — ce qu'il doit garantir.
//
// Rémy : « sur le programme de construction je pense qu'il faut faire
// différemment. On pourrait cliquer sur trace ou place, un arbre s'ouvre avec
// les mots possibles et ainsi de suite. »
//
// Un arbre de mots remplace un clavier, et il prend donc une responsabilité que
// le clavier n'avait pas : CE QU'IL NE PROPOSE PAS N'EXISTE PAS. Trois
// promesses, et la première est de loin la plus importante :
//
//   · TOUT PROGRAMME ATTENDU SE COMPOSE À LA SOURIS. Si un seul niveau
//     réclamait une phrase que l'arbre ne sait pas construire, cet exercice
//     serait devenu impossible à finir — et rien ne le dirait, puisque l'élève
//     ne saurait même pas quoi chercher.
//   · L'ARBRE NE PROPOSE QUE DES SUITES VIVANTES : pas de branche qui débouche
//     sur une liste vide, pas de point qui n'existe pas encore.
//   · LES PHRASES PRODUITES SONT CELLES QUE LE LOGICIEL SAIT LIRE. L'arbre
//     écrit du texte, et c'est l'ancien lecteur qui l'exécute : les deux ne
//     doivent pas diverger d'une parenthèse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    VERBES, verbeDe, squeletteDe, phraseEnCours, phraseFinie, branches, descendre, remonter
} from '../js/core/arbrePhrase.js';
import {
    OPERATIONS, ORDRE_OPERATIONS, ORDRE_FAMILLES, operationsDe, preparerNiveau,
    phrasesDuModele, niveauxDisponibles, executer, lireProgramme
} from '../js/core/programmeConstruction.js';

const OPS = operationsDe(ORDRE_FAMILLES);

/** L'état du monde après les phrases déjà posées. */
function contexte(texte, niv) {
    const r = executer(lireProgramme(texte, niv.atlas).instructions, niv.atlas);
    return { operations: OPS, points: r.points, objets: r.objets, lettres: niv.exiges };
}

/**
 * Ce chemin peut-il encore mener à cette phrase ?
 *
 * C'est la boussole de l'élève, écrite ici : on ne clique pas au hasard, on
 * clique le mot qui continue la phrase qu'on a en tête.
 */
function meneA(chemin, phrase) {
    if (!chemin.verbe || !phrase.startsWith(chemin.verbe)) return false;
    const op = chemin.op ? OPERATIONS[chemin.op] : null;
    if (!op) return true;
    const args = chemin.args || [];
    if (op.id === 'points') {
        return /^Place (un|\d+) points?/.test(phrase) && args.every(l => phrase.includes(l));
    }
    let i = -1;
    let attendu = '';
    for (const b of op.gabarit) {
        if (typeof b === 'string') { attendu += b; continue; }
        i += 1;
        if (args[i] === undefined) break;
        attendu += args[i];
    }
    return phrase.startsWith(attendu);
}

test('TOUT PROGRAMME ATTENDU SE COMPOSE À LA SOURIS, sans jamais taper', () => {
    for (const n of niveauxDisponibles(ORDRE_FAMILLES)) {
        const niv = preparerNiveau(n);
        const vise = phrasesDuModele(niv);
        let texte = '';
        for (const phrase of vise) {
            let chemin = null;
            for (let pas = 0; pas < 14 && phraseFinie(chemin) !== phrase; pas++) {
                const b = branches(chemin, contexte(texte, niv));
                const bon = b.choix.find(c => meneA(descendre(chemin, c.valeur), phrase));
                assert.ok(bon, `${niv.titre} — « ${phrase} » : aucun mot proposé ne mène là.\n`
                    + `  proposés : ${b.choix.map(c => c.mot).join(' | ') || '(rien)'}`);
                chemin = descendre(chemin, bon.valeur);
            }
            assert.equal(phraseFinie(chemin), phrase, `${niv.titre} : phrase non atteinte`);
            texte = (texte ? `${texte}\n` : '') + phrase;
        }
        // ET CE QUI EST COMPOSÉ SE RELIT ET S'EXÉCUTE. L'arbre écrit du texte
        // français ; c'est le lecteur d'origine qui en fait une figure.
        const lu = lireProgramme(texte, niv.atlas);
        lu.lignes.filter(l => !l.vide).forEach(l => assert.ok(l.ok, `${niv.titre} : ${l.dit}`));
        const r = executer(lu.instructions, niv.atlas);
        assert.ok(!r.erreur, `${niv.titre} : ${r.erreur && r.erreur.dit}`);
        assert.equal(r.objets.length, niv.objets.length, `${niv.titre} : figure incomplète`);
    }
});

test('UNE BRANCHE NE DÉBOUCHE JAMAIS SUR LE VIDE', () => {
    // Sur une figure vierge, « Trace » n'a aucune suite : pas un point n'est
    // encore posé. Le proposer serait un cul-de-sac, et l'élève chercherait ce
    // qu'il a mal fait.
    const niv = preparerNiveau(5);
    const vierge = contexte('', niv);
    const debut = branches(null, vierge);
    assert.deepEqual(debut.choix.map(c => c.valeur), ['Place'], 'sans point, seul « Place » a une suite');

    // Et de proche en proche, sur tous les niveaux : chaque mot proposé ouvre
    // sur au moins un mot suivant, ou termine la phrase.
    for (const n of niveauxDisponibles(ORDRE_FAMILLES)) {
        const niv2 = preparerNiveau(n);
        let texte = '';
        for (const phrase of phrasesDuModele(niv2)) {
            const ctx = contexte(texte, niv2);
            const b = branches(null, ctx);
            b.choix.forEach(c => {
                const apres = branches(descendre(null, c.valeur), ctx);
                assert.ok(apres.choix.length || apres.fini,
                    `${niv2.titre} : « ${c.mot} » ne mène nulle part`);
            });
            texte = (texte ? `${texte}\n` : '') + phrase;
        }
    }
});

test('ON NE PEUT PAS DÉSIGNER UN POINT QUI N\'EXISTE PAS ENCORE', () => {
    // C'est la leçon de l'ordre, et l'arbre la rend impossible à rater : elle
    // n'est plus signalée après coup, elle n'est plus offerte.
    const niv = preparerNiveau(5);         // un triangle : A, B, C
    const ctx = contexte('Place 2 points A et B', niv);
    const chemin = descendre(descendre(null, 'Trace'), 'segment');
    const b = branches(chemin, ctx);
    assert.deepEqual(b.choix.map(c => c.valeur), ['A', 'B'], 'C n\'est pas encore placé');

    // Et une lettre déjà placée ne se replace pas.
    const encore = branches(descendre(descendre(null, 'Place'), 'points'), ctx);
    assert.deepEqual(encore.choix.map(c => c.valeur), ['C']);
});

test('DEUX FOIS LE MÊME POINT N\'EST PAS PROPOSÉ', () => {
    // « Le segment [AA] » n'est pas un segment et « le cercle de centre A
    // passant par A » n'a pas de rayon : la phrase serait refusée après coup,
    // alors qu'on peut simplement ne pas la proposer.
    const niv = preparerNiveau(5);
    const ctx = contexte('Place 3 points A, B et C', niv);
    const apresA = descendre(descendre(descendre(null, 'Trace'), 'segment'), 'A');
    assert.deepEqual(branches(apresA, ctx).choix.map(c => c.valeur), ['B', 'C']);

    // Mais « la perpendiculaire à (AB) passant par A » est une phrase juste :
    // le troisième point reste libre.
    const perp = ['Trace', 'perpendiculaire', 'A', 'B']
        .reduce((c, v) => descendre(c, v), null);
    assert.deepEqual(branches(perp, ctx).choix.map(c => c.valeur), ['A', 'B', 'C']);
});

test('LE SQUELETTE MONTRE LA NOTATION — c\'est la moitié de la leçon', () => {
    // Le bouton n'écrit pas « segment » : il écrit « le segment [__] ». Un
    // élève qui compose vingt phrases a lu vingt fois les crochets.
    assert.equal(squeletteDe(OPERATIONS.segment), 'le segment [__]');
    assert.equal(squeletteDe(OPERATIONS.droite), 'la droite (__)');
    assert.equal(squeletteDe(OPERATIONS.demiDroite), 'la demi-droite [__)');
    assert.equal(squeletteDe(OPERATIONS.cercle), 'le cercle de centre _ passant par _');
    // Et le verbe n'est jamais dans le squelette : il a été choisi au cran
    // d'avant, le répéter ferait « Trace trace le segment ».
    ORDRE_OPERATIONS.forEach(id => {
        VERBES.forEach(v => assert.ok(!squeletteDe(OPERATIONS[id]).startsWith(v), id));
    });
});

test('les deux verbes sortent des gabarits, ils ne sont pas recopiés', () => {
    assert.equal(verbeDe(OPERATIONS.segment), 'Trace');
    assert.equal(verbeDe(OPERATIONS.milieu), 'Place');
    assert.equal(verbeDe(OPERATIONS.points), 'Place');
    assert.equal(verbeDe(OPERATIONS.intersection), 'Place');
    // Toute opération porte un des deux verbes : s'il en apparaissait un
    // troisième, l'arbre le perdrait en silence.
    ORDRE_OPERATIONS.forEach(id => {
        const debut = String(OPERATIONS[id].gabarit[0]).split(' ')[0];
        assert.ok(VERBES.includes(debut), `${id} commence par « ${debut} »`);
    });
});

test('la phrase en cours se lit à chaque cran, et le retour défait un cran', () => {
    let c = descendre(null, 'Trace');
    assert.equal(phraseEnCours(c), 'Trace…');
    c = descendre(c, 'cercle');
    assert.equal(phraseEnCours(c), 'Trace le cercle de centre _ passant par _');
    c = descendre(c, 'O');
    assert.equal(phraseEnCours(c), 'Trace le cercle de centre O passant par _');
    assert.equal(phraseFinie(c), null, 'une phrase à trou n\'est pas finie');
    c = descendre(c, 'M');
    assert.equal(phraseFinie(c), 'Trace le cercle de centre O passant par M');

    // Le retour rend la main cran par cran, jusqu'au premier mot.
    c = remonter(c);
    assert.equal(phraseEnCours(c), 'Trace le cercle de centre O passant par _');
    c = remonter(remonter(c));
    assert.equal(phraseEnCours(c), 'Trace…');
    assert.deepEqual(remonter(c), { verbe: null, op: null, args: [] });
    assert.deepEqual(remonter(remonter(c)), { verbe: null, op: null, args: [] });
});
