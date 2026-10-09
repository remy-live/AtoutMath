// LE CODE À DICTER NE DOIT PAS MOURIR D'UN CLIC SUR « + ».
//
// Trouvé par l'audit UX, et mesuré au navigateur : deux exercices ajoutés à un
// parcours, rien réglé, le code fait « DFP-AFL » — sept caractères, dictables à
// la classe. UN clic sur le « + » du nombre de questions, et le code devient
// « M2-eyJuIjoiTW9uIFBhcmNvdXJz… » : 214 caractères. Avec, à l'écran, cette
// phrase : « étape 2 : ses réglages ont été modifiés (par exemple seulement les
// tables de 7) » — alors qu'aucun réglage de contenu n'a été touché.
//
// LA CAUSE : `readParams` relit TOUT le panneau, et `commit` écrivait ce tout
// dans `step.overrides`. Le nombre de questions n'est même pas un réglage de
// contenu ; il suffisait de l'effleurer pour que les vingt lignes du schéma se
// retrouvent enregistrées comme autant de choix délibérés.
//
// CE QUE ÇA ANNULAIT : `core/shortcodes.js` dit, en citant Rémy — « l'idéal
// serait que le code soit hyper court » —, que LE NOMBRE DE QUESTIONS NE
// DISQUALIFIE PLUS le code court. Le panneau rendait cette intention
// inatteignable dès qu'on réglait ce nombre à la souris.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { reglagesQuiChangent } from '../js/games/configUI.js';

/** Un exercice du catalogue et le schéma qui peint son panneau. */
const EXO = { id: 'frac-add', params: { maxDen: 12, memeDenominateur: 'identiques' } };
const SCHEMA = [
    { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 10 },
    { id: 'memeDenominateur', type: 'select', default: 'libre' },
    { id: 'aide', type: 'select', default: 'progressive' },
    { id: 'repartition', type: 'select', default: 'auto' },
    { id: 'clavier', type: 'bool', default: true },
    { id: 'tables', type: 'multiselect', default: [] }
];

/** Ce que `readParams` rend quand personne n'a rien changé. */
const RELU_INTACT = {
    maxDen: 12, memeDenominateur: 'identiques',
    aide: 'progressive', repartition: 'auto', clavier: true, tables: []
};

test('NE RIEN TOUCHER N\'ÉCRIT RIEN — et le code reste court', () => {
    // Le cœur du défaut : cinq clés écrites, zéro voulue.
    assert.deepEqual(reglagesQuiChangent(RELU_INTACT, EXO, SCHEMA), {});
});

test('LE DÉFAUT EST CELUI DU PEINTRE : l\'exercice d\'abord, le schéma ensuite', () => {
    // `maxDen` vaut 12 dans le catalogue et 10 dans le schéma. Le panneau
    // montre 12 ; 12 n'est donc PAS une modification, et 10 en est une.
    assert.deepEqual(reglagesQuiChangent({ ...RELU_INTACT, maxDen: 12 }, EXO, SCHEMA), {});
    assert.deepEqual(reglagesQuiChangent({ ...RELU_INTACT, maxDen: 10 }, EXO, SCHEMA),
        { maxDen: 10 });
});

test('CE QU\'ON CHANGE VRAIMENT EST GARDÉ, et rien d\'autre avec', () => {
    // Le cas de Rémy : « seulement les tables de 7 ».
    const lu = { ...RELU_INTACT, tables: ['7'], aide: 'aucune' };
    assert.deepEqual(reglagesQuiChangent(lu, EXO, SCHEMA), { tables: ['7'], aide: 'aucune' });
});

test('LE DOM NE REND QUE DU TEXTE : « 12 » vaut le 12 du catalogue', () => {
    // Sans cette règle, tout nombre relu dans un champ paraîtrait modifié, et
    // le défaut reviendrait entier par la porte de derrière.
    assert.deepEqual(reglagesQuiChangent({ ...RELU_INTACT, maxDen: '12' }, EXO, SCHEMA), {});
    assert.deepEqual(reglagesQuiChangent({ ...RELU_INTACT, clavier: true }, EXO, SCHEMA), {});
});

test('deux listes de même contenu sont la même liste', () => {
    // Les cases à cocher rendent un tableau NEUF à chaque lecture : `===` y est
    // toujours faux, et tout parcours aurait gardé un code long.
    const exo = { id: 'x', params: { tables: ['2', '3'] } };
    const schema = [{ id: 'tables', type: 'multiselect', default: [] }];
    assert.deepEqual(reglagesQuiChangent({ tables: ['2', '3'] }, exo, schema), {});
    assert.deepEqual(reglagesQuiChangent({ tables: ['2', '4'] }, exo, schema),
        { tables: ['2', '4'] });
});

test('LES CLÉS HORS SCHÉMA VIDES NE COMPTENT PAS', () => {
    // `repartitionMarches` et les réglages posés marche par marche sont des
    // champs cachés sans défaut déclaré. Vides, ils ne disent rien : les garder
    // rallongerait le code pour un choix que personne n'a fait.
    const lu = { ...RELU_INTACT, repartitionMarches: '', 'aide@m1': '' };
    assert.deepEqual(reglagesQuiChangent(lu, EXO, SCHEMA), {});
    const rempli = { ...RELU_INTACT, repartitionMarches: '3/5' };
    assert.deepEqual(reglagesQuiChangent(rempli, EXO, SCHEMA), { repartitionMarches: '3/5' });
});

test('rien de tout cela ne casse sur des entrées vides', () => {
    assert.deepEqual(reglagesQuiChangent(null, null, null), {});
    assert.deepEqual(reglagesQuiChangent({}, EXO, SCHEMA), {});
    assert.deepEqual(reglagesQuiChangent({ inconnu: 'x' }, {}, []), { inconnu: 'x' });
});

test('LE PANNEAU PASSE BIEN PAR CE FILTRE — sinon tout ce qui précède est décoratif', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8');
    assert.match(src,
        /const overrides = reglagesQuiChangent\(readParams\(content, schema\), exo, schema\)/,
        'commit() doit filtrer ce qu\'il enregistre');
});

// ─────────────── CE QU'ON A RÉGLÉ DOIT SE LIRE SUR LA LIGNE DE L'ÉTAPE ──────
//
// Mesuré par l'audit : régler « Dénominateurs : identiques → différents » ne
// changeait RIEN au texte de la ligne — identique caractère par caractère. Le
// professeur qui relit sa séance de huit étapes ne peut pas savoir laquelle il
// a touchée : il doit les rouvrir une par une.

import { direLesReglages } from '../js/games/configUI.js';

test('ON ÉCRIT LE LIBELLÉ DU SCHÉMA, jamais la clé du code', () => {
    // « memeDenominateur: differents » ne se lit pas. « Dénominateurs :
    // différents » se lit — et c'est le mot que le professeur a lu en réglant.
    const schema = [{ id: 'memeDenominateur', type: 'select', label: 'Dénominateurs',
        options: [{ value: 'differents', label: 'différents' }, { value: 'libre', label: 'libre' }] }];
    assert.equal(direLesReglages({ memeDenominateur: 'differents' }, schema),
        'Dénominateurs : différents');
});

test('rien de réglé, rien d\'écrit', () => {
    assert.equal(direLesReglages({}, SCHEMA), '');
    assert.equal(direLesReglages(null, null), '');
});

test('LA LIGNE RESTE UNE LIGNE : on s\'arrête à deux, puis on compte', () => {
    // Le détail complet vit dans le panneau, qui est fait pour ça.
    const lu = direLesReglages(
        { maxDen: 20, memeDenominateur: 'identiques', aide: 'aucune', clavier: false }, SCHEMA);
    assert.match(lu, /\+2$/, lu);
    assert.equal(lu.split(' · ').length, 2, lu);
});

test('un booléen se dit sans valeur, et sa négation se dit autrement', () => {
    const schema = [{ id: 'clavier', type: 'bool', label: 'Clavier' }];
    assert.equal(direLesReglages({ clavier: true }, schema), 'Clavier');
    assert.equal(direLesReglages({ clavier: false }, schema), 'sans clavier');
});

test('UNE CLÉ HORS SCHÉMA N\'EST PAS INVENTÉE', () => {
    // Les réglages posés marche par marche n'ont pas de nom lisible. Écrire
    // « aide@m1 : progressive » sur la ligne serait pire que de se taire.
    assert.equal(direLesReglages({ 'aide@m1': 'progressive' }, SCHEMA), '');
    assert.equal(direLesReglages({ 'aide@m1': 'x', maxDen: 20 }, SCHEMA),
        'Dénominateur maximum : 20');
});

test('LA LIGNE DE L\'ÉTAPE L\'AFFICHE — sinon tout ce qui précède est décoratif', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../js/ui/builder.js', import.meta.url), 'utf8');
    assert.match(src, /const regle = direLesReglages\(step\.overrides, paramSchemaOf\(exo\)\)/);
    assert.match(src, /pstep-regle/);
});
