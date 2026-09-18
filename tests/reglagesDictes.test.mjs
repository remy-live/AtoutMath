// LES RÉGLAGES QUI TIENNENT DANS UN CODE DICTÉ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en trois temps :
//
//   « c'est quand même dommage de ne pas pouvoir partager un lien juste pour un
//     réglage, ça ne pourrait pas se régler ? »
//   « C'est fou qu'un réglage soit si long, comment ça se fait ? »
//   « les réglages ont un ordre, si par exemple, je veux 8 questions, on
//     pourrait avoir ATYA où A correspond à 1 question, B à 2 »
//   « le problème si un seul réglage change c'est que c'est lequel »
//
// CE QUE ÇA COÛTAIT, MESURÉ. Un exercice pris tel quel se dicte en quinze
// caractères. Le même avec UN réglage modifié basculait sur le format complet :
// 186 caractères, pour un réglage qui ne pèse que 18 caractères de JSON.
//
// APRÈS, MESURÉ AUSSI, sur les 172 exercices du catalogue :
//   · 166 ont des réglages qui se dictent ; le code fait 9 à 16 caractères ;
//   · les 1 086 réglages numérotables, modifiés un par un, font tous
//     l'aller-retour à l'identique, identité de parcours comprise ;
//   · sur 12 760 fautes d'UNE lettre, 12 760 sont refusées et aucune acceptée.
//
// Les mesures complètes se refont au besoin : `tools/tmp/tousLesReglages.mjs`,
// `tools/tmp/fauteDeLettre.mjs`, `tools/tmp/schemaChange.mjs`. Ici on tient les
// DÉCISIONS — celles qu'on n'a pas le droit de défaire sans s'en rendre compte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { Shortcodes, identiteDeParcours, largeurDesReglagesDictes, normaliserCourt }
    from '../js/core/shortcodes.js';
import { makeStep, makePath } from '../js/core/path.js';
import { defaultPolicy } from '../js/core/policy.js';
import { paramSchemaOf, getExerciseById, exercices } from '../js/data/catalog.js';
import { valeurDUsine, memeReglage } from '../js/core/reglagesDUsine.js';

const parcours = (...steps) => makePath('X', steps, defaultPolicy());
const code = (p) => Shortcodes.encodePath(p);

test('UN RÉGLAGE SE DICTE AU LIEU DE FAIRE UN LIEN DE 186 CARACTÈRES', () => {
    const regle = parcours(makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 }));
    const c = code(regle);
    assert.equal(c.startsWith('M2-'), false, `devrait se dicter, on a « ${c} »`);
    // Trois lettres, deux chiffres, la marque, puis les lettres de réglages.
    assert.match(c, /^SUD-08-00-[A-Z]+$/, c);
    assert.ok(normaliserCourt(c).length < 20, `${normaliserCourt(c).length} caractères`);

    const relu = Shortcodes.decodePath(c);
    assert.deepEqual(relu.steps[0].overrides, { taille: 9 });
    assert.equal(relu.steps[0].nbItems, 8);
});

test('LE TIRET NE DÉCIDE DE RIEN — « Mais pourquoi ne pas mettre LCR0800CAB »', () => {
    // La réponse à Rémy : c'est DÉJÀ ce que la machine lit. `normaliserCourt`
    // jette tout ce qui n'est ni lettre ni chiffre avant même de découper ; les
    // tirets ne sont là que pour l'œil qui recopie et la voix qui dicte.
    const c = code(parcours(makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 })));
    const nu = normaliserCourt(c);
    const attendu = JSON.stringify(Shortcodes.decodePath(c).steps[0].overrides);
    for (const ecrit of [nu, c, c.toLowerCase(), c.replace(/-/g, ' '),
        c.replace(/-/g, '—'), '  ' + c + '  ', [...nu].join(' ')]) {
        const relu = Shortcodes.decodePath(ecrit);
        assert.ok(relu, `« ${ecrit} » devrait se lire`);
        assert.equal(relu.steps[0].exerciseId, 'calc-sudoku', ecrit);
        assert.equal(JSON.stringify(relu.steps[0].overrides), attendu, ecrit);
    }
});

test('LE NOMBRE DE QUESTIONS S\'ÉCRIT SUR DEUX CHIFFRES DÈS QU\'IL Y A DES RÉGLAGES', () => {
    // Sinon le nombre et la marque se recollent : « LCR-8-00 » nettoyé donne
    // « LCR800 », et les chiffres se prennent deux par deux — ça se lit
    // « 80 questions ». C'est ce qui a condamné ma première idée, la marque
    // « 0 » toute seule.
    const c = code(parcours(makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 })));
    assert.match(c, /^SUD-08-00-/, c);

    // Et trois chiffres se refusent, au lieu d'être devinés.
    const nu = normaliserCourt(c);
    assert.equal(Shortcodes.decodePath(nu.replace(/^SUD0800/, 'SUD800')), null,
        'trois chiffres ne veulent rien dire : on refuse');
});

test('TOUTES LES LETTRES, PAS SEULEMENT CELLE QUI CHANGE', () => {
    // Rémy : « le problème si un seul réglage change c'est que c'est lequel ».
    // N'écrire que le réglage modifié obligerait à dire LEQUEL — donc à ajouter
    // une lettre pour le désigner, ce qui coûte ce qu'on croyait économiser.
    // En les écrivant tous, la longueur ne dépend que de l'exercice : elle est
    // la même à chaque fois, et un code trop court se voit à l'œil.
    const schema = (paramSchemaOf(getExerciseById('calc-sudoku')) || []).filter(p => p && p.id);
    const largeur = largeurDesReglagesDictes('calc-sudoku');
    assert.ok(schema.length > 1, 'cet exercice doit avoir plusieurs réglages');
    assert.equal(largeur, schema.length + 1, 'une lettre par réglage, plus le contrôle');

    const taille = code(parcours(makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 })));
    const diff = code(parcours(makeStep('calc-sudoku', { difficulte: 'moyen' }, { nbItems: 8, threshold: 6 })));
    assert.equal(normaliserCourt(taille).length, normaliserCourt(diff).length,
        'deux réglages différents du même exercice : MÊME longueur');
    assert.notEqual(taille, diff, 'et deux codes différents');
});

test('UNE LETTRE MAL RECOPIÉE EST REFUSÉE, JAMAIS APPLIQUÉE', () => {
    // C'est la raison d'être de la lettre de contrôle finale, et c'est
    // démontrable : la somme est pondérée par la position et prise modulo 23,
    // qui est PREMIER. Changer la i-ième lettre de d ≠ 0 change le contrôle de
    // (i+1)·d, jamais nul tant que i+1 < 23 — et le plus fourni des exercices
    // ne demande que huit lettres.
    //
    // Une démonstration n'est pas une mesure : on essaie donc toutes les
    // fautes, ici sur un exercice, et sur tout le catalogue dans la sonde.
    const ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const nu = normaliserCourt(code(parcours(
        makeStep('calc-mult-flash', { tables: [7] }, { nbItems: 8, threshold: 6 }))));
    let essais = 0;
    for (let i = 7; i < nu.length; i++) {          // après identité(3) + chiffres(4)
        for (const lettre of ALPHABET) {
            if (lettre === nu[i]) continue;
            essais++;
            const faux = nu.slice(0, i) + lettre + nu.slice(i + 1);
            assert.equal(Shortcodes.decodePath(faux), null, `« ${faux} » se lit alors qu'il est faux`);
        }
    }
    assert.ok(essais > 100, `${essais} fautes essayées`);
});

test('LA MARQUE « 00 » NE PEUT PAS ÊTRE UN NOMBRE DE QUESTIONS', () => {
    // C'est tout ce qui la rend utilisable : un nombre de questions vaut
    // toujours entre 1 et 99. La place est libre, et elle ne l'est que là.
    assert.equal(Shortcodes.decodePath('SUD00'), null, '« zéro question » n\'existe pas');
    // Une marque autre que « 00 » après quatre chiffres : refusée.
    const c = normaliserCourt(code(parcours(
        makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 }))));
    assert.equal(Shortcodes.decodePath(c.replace('0800', '0810')), null);
    assert.equal(Shortcodes.decodePath(c.replace('0800', '0801')), null);
});

test('UN RÉGLAGE QUI NE S\'ÉCRIT PAS NE CONDAMNE PAS L\'EXERCICE', () => {
    // 58 réglages du catalogue n'ont pas d'ensemble fini de valeurs — les
    // champs libres « repartition », les réglages « marches », trois durées sans
    // bornes. Les refuser en bloc coûtait leur code court à 49 exercices sur
    // 170, alors que ces champs ne sont presque jamais touchés. Ils sortent donc
    // du code : écrire un code AFFIRME qu'ils sont d'usine.
    const thales = getExerciseById('geo-thales');
    const horsCode = (paramSchemaOf(thales) || []).filter(p => p && p.id
        && !Array.isArray(p.options)
        && !['checkbox', 'bool', 'boolean'].includes(p.type)
        && !(Number.isFinite(p.min) && Number.isFinite(p.max)));
    assert.ok(horsCode.length, 'Thalès doit avoir au moins un réglage hors code');
    assert.ok(largeurDesReglagesDictes('geo-thales') > 0,
        'et se dicter quand même pour les autres');

    // Un réglage ordinaire : se dicte.
    const ordinaire = parcours(makeStep('geo-thales', { config: 'papillon' }, { nbItems: 8, threshold: 6 }));
    assert.equal(code(ordinaire).startsWith('M2-'), false, code(ordinaire));

    // Le champ libre touché : format complet, et la raison le dit.
    const libre = parcours(makeStep('geo-thales', { repartition: '3/5' }, { nbItems: 8, threshold: 6 }));
    assert.equal(code(libre).startsWith('M2-'), true);
    const raisons = Shortcodes.raisonsDuCodeLong(libre);
    assert.equal(raisons.length, 1, raisons.join(' | '));
    assert.match(raisons[0], /ne sait pas s'écrire en lettres/);
});

test('LE CODE RELU POSE LES MÊMES SURCHARGES, PAS UNE DE PLUS', () => {
    // EXIGENCE, PAS ÉCONOMIE. L'identité d'un parcours se calcule sur son
    // contenu, surcharges comprises. Si le code relu posait les trois réglages
    // de l'exercice là où le professeur n'en avait changé qu'un, les deux
    // parcours ne porteraient pas le même nom : le panneau « À qui ce parcours
    // est donné » ne cocherait jamais, et l'élève qui retape son code le
    // lendemain repartirait de l'étape 1.
    const donne = parcours(makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 }));
    const relu = Shortcodes.decodePath(code(donne));
    assert.deepEqual(relu.steps[0].overrides, { taille: 9 },
        'un seul réglage changé, une seule clé');
    assert.equal(identiteDeParcours(relu), identiteDeParcours(donne),
        'le parcours reçu doit porter la MÊME identité que celui qu\'on a donné');
});

test('PLUSIEURS EXERCICES S\'ENCHAÎNENT, CHACUN AVEC SES RÉGLAGES', () => {
    // Le code se délimite tout seul : c'est l'EXERCICE qui dit combien de
    // lettres le suivent. Rien à compter, rien à séparer — et « et si plusieurs
    // exercices alors » trouve sa réponse.
    const p = parcours(
        makeStep('calc-sudoku', { taille: 9 }, { nbItems: 8, threshold: 6 }),
        makeStep('geo-thales', {}, {}),
        makeStep('calc-mult-flash', { tables: [7] }, { nbItems: 12, threshold: 9 }));
    const c = code(p);
    assert.equal(c.startsWith('M2-'), false, c);
    const relu = Shortcodes.decodePath(c);
    assert.equal(relu.steps.length, 3, c);
    assert.deepEqual(relu.steps.map(s => s.exerciseId),
        ['calc-sudoku', 'geo-thales', 'calc-mult-flash']);
    assert.deepEqual(relu.steps[0].overrides, { taille: 9 });
    assert.deepEqual(relu.steps[1].overrides, {});
    assert.deepEqual(relu.steps[2].overrides, { tables: [7] });
    assert.equal(relu.steps[2].nbItems, 12);
});

test('TOUT LE CATALOGUE FAIT L\'ALLER-RETOUR', () => {
    // Un exemple ne prouve rien. On modifie le PREMIER réglage numérotable de
    // chaque exercice et l'on vérifie les trois choses qui comptent : le code
    // reste dictable, il redonne les mêmes réglages, le parcours garde son
    // identité. La sonde `tools/tmp/tousLesReglages.mjs` le fait pour TOUS les
    // réglages (1 086) ; ici on garde le tour de catalogue, qui tient en
    // quelques secondes.
    const valeurOption = (o) => (o && typeof o === 'object') ? o.value : o;
    let vus = 0, longs = [];
    for (const exo of exercices) {
        if (!largeurDesReglagesDictes(exo.id)) continue;
        const p = (paramSchemaOf(exo) || []).filter(x => x && x.id)
            .find(x => Array.isArray(x.options) && x.options.length > 1);
        if (!p) continue;
        const usine = valeurDUsine(exo, p);
        const toutes = p.options.map(valeurOption);
        // POUR UN CHOIX MULTIPLE, LA VALEUR EST UNE LISTE, pas une option. Ma
        // première version comparait chaque option à la valeur d'usine, qui
        // vaut ici `[10]` : elle retenait `10`, en faisait `[10]`… c'est-à-dire
        // exactement la valeur d'usine. Le code la relisait alors comme « rien
        // de changé », à juste titre, et le test accusait le décodeur.
        const candidats = p.type === 'multiselect'
            ? [[toutes[0]], toutes.slice(0, 2), toutes]
            : toutes;
        const valeur = candidats.find(v => !memeReglage(v, usine));
        if (valeur === undefined) continue;
        const donne = parcours(makeStep(exo.id, { [p.id]: valeur }, { nbItems: 8, threshold: 6 }));
        const c = code(donne);
        if (c.startsWith('M2-')) { longs.push(`${exo.id} · ${p.id}`); continue; }
        vus++;
        const relu = Shortcodes.decodePath(c);
        assert.ok(relu, `${exo.id} : « ${c} » ne se relit pas`);
        assert.deepEqual(relu.steps[0].overrides, { [p.id]: valeur }, `${exo.id} · ${p.id} (${c})`);
        assert.equal(identiteDeParcours(relu), identiteDeParcours(donne), `${exo.id} : identité`);
    }
    assert.ok(vus > 120, `seulement ${vus} exercices vérifiés`);
    assert.deepEqual(longs, [], 'aucun exercice à liste ne devrait rester long');
});
