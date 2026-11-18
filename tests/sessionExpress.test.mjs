// LA SESSION EXPRESS — dix minutes, un clic, et un code à dicter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « on pourrait envisager une session express, avec des
// jeux mathématiques (ou des défis) quand il reste 10 minutes, je vais sur la
// classe, je clique session express et hop », puis : « on pourrait même donner
// un code express ».
//
// ── CE QUE CETTE ÉPREUVE GARDE ────────────────────────────────────────────
//
// LE CODE D'ABORD, parce que c'est lui qui a décidé du reste. Une session
// express dont le code fait 186 caractères de base64 ne se dicte pas devant
// une classe à trois minutes de la sonnerie — et c'est exactement ce qui
// arrivait tant que la séance portait deux réglages hors usine. La règle est
// invisible à la lecture : rien dans `politiqueExpress` ne dit « attention, un
// réglage de plus et le code triple de longueur ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { combienDeJeux, jeuxExpress, faireUneSessionExpress, politiqueExpress,
    estExpress, nomExpress, MINUTES_PAR_DEFAUT, MOINS, PLUS } from '../js/core/sessionExpress.js';
import { jeuxDuBac } from '../js/core/bacASable.js';
import { getExerciseById } from '../js/data/catalog.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { defaultPolicy } from '../js/core/policy.js';
import { makePath, makeStep } from '../js/core/path.js';
import { exercices } from '../js/data/catalog.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const JEUX = jeuxDuBac(getExerciseById);

test('LE CODE EXPRESS SE DICTE, ET IL DIT « TOUT EST OUVERT »', () => {
    // DEUX DEMANDES QUI SE BATTAIENT, ET QUI TIENNENT MAINTENANT ENSEMBLE.
    //
    // « on pourrait même donner un code express » : avec `ordreLibre`, il
    // sortait en base64 — 186 caractères, impossibles à épeler devant une
    // classe. J'avais donc retiré l'ordre libre. Puis : « il faut pas que la
    // session express attende que l'on fasse un jeu pour en avoir un autre,
    // tout doit être ouvert. »
    //
    // La chaîne courte a appris à dire « ordre libre » en DEUX caractères
    // (« 9L », voir `ENTETE` dans shortcodes.js). Cette épreuve garde les deux
    // moitiés : le code se dicte ET il rouvre tout à l'arrivée.
    for (const minutes of [5, 10, 15, 20]) {
        const p = faireUneSessionExpress({ jeux: JEUX, minutes });
        const code = Shortcodes.encodePath(p);
        assert.ok(code, `${minutes} min : aucun code`);
        assert.deepEqual(Shortcodes.raisonsDuCodeLong(p), [],
            `${minutes} min : le code ne peut pas être court`);
        // UN CODE DICTÉ S'ÉPELLE EN QUELQUES SECONDES. Trois lettres et un
        // tiret par jeu : six jeux font vingt-trois caractères, et c'est la
        // borne haute qu'on accepte à voix haute.
        // SIX JEUX FONT VINGT-SIX CARACTÈRES AVEC L'EN-TÊTE : « 9L » plus
        // quatre par jeu. C'est la borne haute de ce qui s'épelle d'une traite.
        assert.ok(code.length <= 26, `${minutes} min : « ${code} » est trop long à dicter`);
        assert.ok(!code.includes('M2-'), 'un code en base64 ne se dicte pas');
        // ET IL ROUVRE TOUT À L'ARRIVÉE. Sans cette ligne, le code se lirait
        // sans erreur et l'élève retrouverait l'ordre imposé — un défaut muet.
        const relu = Shortcodes.decodePath(code);
        assert.equal(relu.policy.ordreLibre, true,
            `${minutes} min : « ${code} » n'ouvre pas tout chez l'élève`);
        assert.equal(relu.steps.length, p.steps.length);
    }
});

test('TOUT EST OUVERT — « il faut pas qu\'elle attende qu\'on fasse un jeu »', () => {
    // RÉMY, 18 novembre, mot pour mot : « il faut pas que la session express
    // attende que l'on fasse un jeu pour en avoir un autre, tout doit être
    // ouvert. » Dix minutes, trois jeux, et il faut finir le premier pour voir
    // le second : on n'en verra qu'un.
    //
    // C'EST `ordreLibre` QUI OUVRE, ET RIEN D'AUTRE — lu dans
    // `core/recompenses.js` : sans lui, `routeOuverte` barre par la
    // chronologie, seuil ou pas de seuil.
    const p = faireUneSessionExpress({ jeux: JEUX, minutes: 10 });
    assert.equal(p.policy.ordreLibre, true);
    // ET LE RESTE EST D'USINE : tout autre réglage ferait repasser le code en
    // base64, puisque l'en-tête ne sait dire QUE l'ordre libre.
    const d = defaultPolicy();
    for (const cle of new Set([...Object.keys(d), ...Object.keys(p.policy)])) {
        if (cle === 'ordreLibre') continue;
        assert.deepEqual(p.policy[cle], d[cle],
            `« ${cle} » sort de l'usine : le code express cessera de se dicter`);
    }
});

test('L\'EN-TÊTE NE CHANGE AUCUN CODE DÉJÀ DICTÉ', () => {
    // LA PEUR LÉGITIME QUAND ON TOUCHE À UN FORMAT : trente élèves ont le code
    // d'une séance écrit dans leur cahier. Un chiffre ajouté en tête ne doit
    // rien vouloir dire de nouveau pour eux.
    //
    // IL NE PEUT PAS : une chaîne d'étapes commence TOUJOURS par trois lettres
    // (`MOTIF_ETAPE`), donc un chiffre en première position était impossible
    // jusqu'ici. On le vérifie sur de vrais parcours plutôt que de le déduire.
    let vus = 0;
    for (let n = 1; n <= 3; n++) {
        for (let k = 0; k + n <= 60; k += 7) {
            const pas = exercices.slice(k, k + n)
                .map((e, i) => makeStep(e.id, {}, { stepId: 's' + i }));
            const code = Shortcodes.encodePath(makePath('Essai', pas, defaultPolicy()));
            if (!code || code.startsWith('M2-')) continue;
            vus++;
            assert.ok(!code.startsWith('9'),
                `un parcours ordinaire ne doit pas porter d'en-tête : « ${code} »`);
            const relu = Shortcodes.decodePath(code);
            assert.equal(relu.steps.length, n, `« ${code} » ne se relit plus`);
            assert.equal(!!relu.policy.ordreLibre, false,
                `« ${code} » ouvre tout alors qu'il ne le dit pas`);
        }
    }
    assert.ok(vus >= 15, `seulement ${vus} codes ordinaires vérifiés`);
    // ET UN EN-TÊTE ABÎMÉ EST REFUSÉ, pas interprété de travers : c'est la
    // règle de la lettre de contrôle, et elle vaut pour l'en-tête aussi.
    for (const faux of ['9', '9L', '9X-MHC', '9-MHC']) {
        assert.equal(Shortcodes.decodePath(faux), null, `« ${faux} » est accepté`);
    }
});

test('DIX MINUTES FONT TROIS JEUX, ET LES BORNES TIENNENT', () => {
    assert.equal(combienDeJeux(10), 3);
    assert.equal(combienDeJeux(MINUTES_PAR_DEFAUT), 3);
    // DEUX AU MOINS : un seul jeu n'offre aucun choix, et l'élève qui n'aime
    // pas celui-là n'a nulle part où aller.
    assert.equal(combienDeJeux(1), MOINS);
    assert.equal(combienDeJeux(0), 3, 'zéro n\'est pas une durée : on retombe sur le défaut');
    // SIX AU PLUS : « un élève qui doit CHOISIR parmi deux cents passe ses sept
    // minutes à choisir » — la borne est la même règle, un cran plus bas.
    assert.equal(combienDeJeux(60), PLUS);
    assert.equal(combienDeJeux(1000), PLUS);
});

test('LE NIVEAU TRIE LES JEUX, IL NE LES FILTRE PAS', () => {
    // LE DÉFAUT QUE CETTE RÈGLE EXISTE POUR EMPÊCHER, et il est mesuré dans
    // `bacASable.js` : la liste du bac donne seize jeux à un 6ème et UN SEUL à
    // un 3ème. Un filtre strict rendrait donc la session express VIDE pour une
    // troisième — un bouton qui ne fait rien, le jour où l'on en a le plus
    // besoin.
    for (const niveau of ['6eme', '5eme', '4eme', '3eme', 'cm2', 'inconnu']) {
        const choisis = jeuxExpress(JEUX, { minutes: 10, niveau });
        assert.equal(choisis.length, 3, `${niveau} : ${choisis.length} jeu(x)`);
    }
    // ET CEUX DU NIVEAU PASSENT DEVANT : c'est à cela que sert le tri.
    const deSixieme = JEUX.filter(e => ((e.tags && e.tags.niveaux) || []).includes('6eme'));
    if (deSixieme.length >= 3) {
        const choisis = jeuxExpress(JEUX, { minutes: 10, niveau: '6eme' });
        for (const e of choisis) {
            assert.ok(((e.tags && e.tags.niveaux) || []).includes('6eme'),
                `${e.id} n'est pas du niveau et passe devant ceux qui le sont`);
        }
    }
});

test('RIEN N\'EST NOTÉ, ET RIEN NE BLOQUE', () => {
    // DIX MINUTES DE JEUX À LA FIN D'UNE HEURE NE SE NOTENT PAS : y mettre un
    // barème ferait de la récréation une interrogation, et l'élève qui s'amuse
    // perdrait des points.
    const p = faireUneSessionExpress({ jeux: JEUX, minutes: 10 });
    assert.equal(p.policy.grading, null);
    for (const s of p.steps) {
        // AUCUN SEUIL : rien à valider, donc personne ne reste bloqué sur le
        // premier jeu — c'est ce qui rend l'ordre imposé acceptable.
        assert.equal(s.threshold, null, `${s.exerciseId} : un seuil barre la route`);
        // ET AUCUN MINUTEUR : c'est la sonnerie qui arrête, ou l'élève. Un
        // minuteur ajouterait une contrainte là où l'on vient d'en lever une.
        assert.equal(s.timeLimit, null, `${s.exerciseId} : un minuteur par étape`);
    }
    assert.equal(estExpress(p), true);
    assert.equal(estExpress({}), false);
    assert.equal(p.minutesExpress, 10);
    assert.match(p.name, /10 min/, 'le nom doit dire la durée');
    assert.equal(nomExpress(15), 'Session express — 15 min');
});

test('LE BOUTON EXISTE LÀ OÙ RÉMY VA, ET IL EST BRANCHÉ', () => {
    // « je vais sur la classe » : c'est l'écran des séances d'une classe, et
    // pas l'atelier de parcours. Trois écrans pour dix minutes de jeu, c'est
    // qu'on ne le ferait pas.
    const EC = sansCommentaires(lire('js/ui/espaceClasses.js'));
    assert.match(EC, /data-session-express=/, 'le bouton doit être dessiné');
    // UN CROCHET ABSENT DE LA LISTE DES SÉLECTEURS DÉSIGNE UN BOUTON QUI
    // EXISTE ET QUI NE FAIT RIEN : il se dessine, il se clique, et le
    // répartiteur ne le voit jamais. Le fichier le dit lui-même, et l'a payé.
    assert.match(EC, /\[data-session-express\]/, 'le crochet doit être branché');
    assert.match(EC, /if \(d\.sessionExpress !== undefined\)/, 'le geste doit exister');
    // LES TROIS GESTES EN UN : fabriquer, monter au serveur, imposer. Il en
    // manque un et la séance existe sans être ouverte, ou s'ouvre sans exister.
    const i = EC.indexOf('if (d.sessionExpress !== undefined)');
    const corps = EC.slice(i, EC.indexOf('\n    }', i));
    assert.match(corps, /faireUneSessionExpress\(/, 'la séance doit se fabriquer');
    assert.match(corps, /donnerAuServeur\(/, 'elle doit monter au serveur');
    assert.match(corps, /imposerLaSeance\(/, 'et s\'ouvrir chez les élèves');
    assert.match(corps, /Shortcodes\.encodePath\(/, 'et montrer son code');
    // ET AUCUNE FENÊTRE NATIVE : « tu utilises des alert et prompt, on évite ! »
    assert.ok(!/\balert\(|\bconfirm\(|\bprompt\(/.test(corps),
        'une fenêtre native dans le geste de la session express');
});
