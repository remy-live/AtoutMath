// « RÉCENT » VEUT DIRE MODIFIÉ, PAS OUVERT.
//
// Rémy, 26 novembre : « dans le tri, le récent n'est pas forcément le plus
// récent ». MESURÉ (`node tools/triRecent.mjs`) : ouvrir un parcours sans rien
// y toucher le remontait en tête de « Mes parcours » — l'enregistrement
// automatique, qui part à chaque redessin du constructeur, remettait sa date à
// l'heure de l'ouverture. Le chemin de l'écran est gardé par la sonde ; ce
// fichier garde la règle.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { makePath, makeStep, normalizePath, memeContenu } from '../js/core/path.js';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('UN PARCOURS OUVERT SANS RIEN Y TOUCHER A LE MÊME CONTENU QUE CELUI QU\'ON A RANGÉ', () => {
    const range = makePath('Tri A', [makeStep('calc-add', {}, { nbItems: 12, threshold: 9 })]);
    const stocke = JSON.parse(JSON.stringify(range));
    // L'ouverture normalise : c'est ce que le constructeur a sous la main.
    const ouvert = JSON.parse(JSON.stringify(normalizePath(stocke, 'Tri A')));
    assert.equal(memeContenu(stocke, ouvert, 'Tri A'), true, 'ouvrir un parcours le ferait passer pour modifié');
    // Une vraie modification se voit.
    const change = JSON.parse(JSON.stringify(ouvert));
    change.steps[0].nbItems = 9;
    assert.equal(memeContenu(stocke, change, 'Tri A'), false, 'un nombre de questions changé passe inaperçu');
    const ajoute = JSON.parse(JSON.stringify(ouvert));
    ajoute.steps.push(makeStep('calc-sub', {}));
    assert.equal(memeContenu(stocke, ajoute, 'Tri A'), false, 'une étape ajoutée passe inaperçue');
    assert.equal(memeContenu(null, ouvert), false);
});

test('L\'ENREGISTREMENT AUTOMATIQUE NE RÉÉCRIT PAS UN PARCOURS INCHANGÉ', () => {
    const SRC = sansCommentaires(lire('js/ui/builder.js'));
    const debut = SRC.indexOf('export function autoSavePath()');
    const corps = SRC.slice(debut, SRC.indexOf('\n}\n', debut));
    const garde = corps.indexOf('memeContenu(');
    const ecrit = corps.indexOf('state.updateTeacherPath(');
    assert.ok(garde > 0, 'autoSavePath ne regarde plus si le contenu a changé');
    assert.ok(ecrit > garde, 'la comparaison doit venir AVANT la réécriture');
});

test('LE NOMBRE DE QUESTIONS S\'ENREGISTRE À CHAQUE MODIFICATION, QUELLE QU\'EN SOIT LA SOURCE', () => {
    // Rémy : « je change le nombre de questions et dans le parcours ça revient
    // à 15 alors que j'avais mis 9 ». Il n'y a pas de « Valider » : on ferme la
    // fenêtre. Un nombre changé sans touche relâchée ni perte du focus doit
    // donc s'enregistrer quand même.
    const SRC = sansCommentaires(lire('js/games/configUI.js'));
    assert.match(SRC, /content\.addEventListener\('input', e => \{\s*if \(e\.target\.tagName === 'INPUT' && e\.target\.type === 'number'\) commit\(\);/,
        'le panneau d\'étape n\'enregistre plus un nombre changé sans « change » ni « keyup »');
});
