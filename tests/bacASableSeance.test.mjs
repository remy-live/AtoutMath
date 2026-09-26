// LE BAC À SABLE SUIT LA SÉANCE QU'ON VIENT DE FINIR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on n'a pas parlé du bac à sable pour un élève qui a terminé, tu as
// jugé ou mesuré cela comment ? Prévoit-on des jeux bac à sable par parcours ou
// différents bacs à sable ? »
//
// JUGÉ, ET NON MESURÉ — il faut le dire. Les dix-sept jeux du bac ont été
// choisis un par un contre quatre critères écrits dans le module ; aucune
// donnée d'usage derrière, puisque aucun élève n'utilise encore le logiciel.
//
// CE QUE LA MESURE A MONTRÉ ENSUITE (`tools/tmp/bacMesure.mjs`) :
//
//   par domaine   16 des 17 jeux sont « Nombres et calculs », 1 en géométrie,
//                 0 en grandeurs, 0 en données — sur 111 / 42 / 11 / 2 au catalogue
//   par niveau    CM2 10 · 6ème 16 · 5ème 8 · 4ème 4 · 3ème 1
//
// Un 3ème qui finit en avance trouvait UN jeu de son niveau ; un élève sortant
// d'une séance de géométrie, un bac entièrement fait de calcul. Ce n'était pas
// un choix : c'est ce que donne une liste écrite exercice par exercice quand
// personne ne regarde ce qu'elle couvre.
//
// LA RÉPONSE : le bac suit la séance. Son niveau et son domaine élargissent la
// liste, sans que le professeur ait rien à régler. C'est le critère qu'il avait
// posé lui-même — « ce sont les mêmes notions, jouées ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices, estADeux } from '../js/data/catalog.js';
import '../js/core/activities/index.js';
import { isGame } from '../js/core/gameAccess.js';
import { uniteDe } from '../js/core/registry.js';
import {
    PAR_DEFAUT, ELARGISSEMENT_MAX, jeuxDuBac, jeuxDeLaSeance, ceQueDisaitLaSeance
} from '../js/core/bacASable.js';
import { readFileSync } from 'node:fs';

const trouver = (id) => exercices.find(e => e.id === id) || null;
const SURES = jeuxDuBac(trouver);
const SEUL = exercices.filter(e => isGame(e) && !estADeux(e));
const seance = (...ids) => {
    const exos = ids.map(trouver);
    assert.ok(exos.every(Boolean), `identifiants inconnus : ${ids.join(', ')}`);
    return { exos, dit: ceQueDisaitLaSeance(exos) };
};

test('LES DIX-SEPT VALEURS SÛRES EXISTENT TOUJOURS AU CATALOGUE', () => {
    // Un identifiant qui a changé de nom produirait une tuile qui ne s'ouvre
    // pas, et un élève qui clique trois fois avant d'appeler le professeur.
    assert.equal(SURES.length, PAR_DEFAUT.length,
        `${PAR_DEFAUT.length - SURES.length} jeu(x) du bac ont disparu du catalogue`);
});

test('UNE SÉANCE DE GÉOMÉTRIE APPORTE DE LA GÉOMÉTRIE', () => {
    const { exos, dit } = seance('geo-thales', 'geo-trigo-cotes');
    assert.deepEqual(dit.domaines, ['Espace et géométrie']);
    const plus = jeuxDeLaSeance(SEUL, dit, [...SURES, ...exos]);
    assert.ok(plus.length >= 3, `seulement ${plus.length} jeux ajoutés`);
    for (const e of plus) {
        assert.equal(e.tags.chemin[0], 'Espace et géométrie', e.id);
        assert.ok((e.tags.niveaux || []).some(n => dit.niveaux.includes(n)), e.id);
    }
    // Le gain, chiffré : la liste seule n'offrait qu'UN jeu de géométrie.
    const avant = SURES.filter(e => e.tags.chemin[0] === 'Espace et géométrie').length;
    assert.equal(avant, 1);
    assert.ok(plus.length > avant);
});

test('ON NE REPROPOSE PAS L\'EXERCICE QU\'ON VIENT DE FINIR', () => {
    // « Comme ta séance », et non « ta séance ». Mesuré : une séance sur le
    // tableau à double entrée se voyait reproposer le tableau à double entrée.
    const { exos, dit } = seance('don-tableau-croise');
    const plus = jeuxDeLaSeance(SEUL, dit, [...SURES, ...exos]);
    assert.ok(!plus.some(e => e.id === 'don-tableau-croise'));
});

test('LES GRILLES RESTENT DEHORS — ON NE LES LÂCHE PAS EN PLEIN MILIEU', () => {
    // Le quatrième critère du bac, enfin écrit : une GRILLE à moitié faite
    // qu'on abandonne à la sonnerie est une déception ; une question, une
    // paire, une partie, non. MESURÉ : le catalogue a 13 jeux qui se comptent
    // en grilles, et AUCUN des dix-sept choisis à la main n'en fait partie —
    // la règle s'appliquait déjà, elle n'était pas écrite.
    const grilles = SEUL.filter(e => uniteDe(e.activityId, 1) === 'grille');
    assert.ok(grilles.length >= 10, `${grilles.length} jeux en grilles`);
    assert.equal(grilles.filter(e => PAR_DEFAUT.includes(e.id)).length, 0,
        'la liste tenue à la main n\'en contenait déjà aucun');
    // Et l'élargissement ne doit pas en faire entrer par la bande. On prend
    // une séance du domaine le plus fourni en grilles.
    const { exos, dit } = seance('calc-mult-flash');
    const plus = jeuxDeLaSeance(SEUL, dit, [...SURES, ...exos]);
    assert.ok(!plus.some(e => uniteDe(e.activityId, 1) === 'grille'),
        plus.map(e => e.id).join(', '));
});

test('SEPT MINUTES NE SUFFISENT PAS À CHOISIR PARMI QUARANTE', () => {
    // Le module le dit depuis le début : « un élève à qui il reste sept
    // minutes et qui doit CHOISIR parmi deux cents passe ses sept minutes à
    // choisir. » Mesuré, l'élargissement sans borne donnerait 43 tuiles à un
    // 6ème de calcul.
    const { exos, dit } = seance('calc-mult-flash');
    const sansBorne = jeuxDeLaSeance(SEUL, dit, [...SURES, ...exos], 999);
    assert.ok(sansBorne.length > ELARGISSEMENT_MAX,
        'la borne doit servir à quelque chose, sinon elle ne prouve rien');
    const borne = jeuxDeLaSeance(SEUL, dit, [...SURES, ...exos]);
    assert.equal(borne.length, ELARGISSEMENT_MAX);
});

test('SANS SÉANCE CONNUE, LE BAC RESTE CE QU\'IL ÉTAIT', () => {
    // Le repli doit être l'ancien comportement, et non une grille vide : on
    // n'a pas le droit de casser le bac pour un élève dont on ne sait rien.
    assert.deepEqual(jeuxDeLaSeance(SEUL, { niveaux: [], domaines: [] }, SURES), []);
    assert.deepEqual(jeuxDeLaSeance(SEUL, null, SURES), []);
    assert.deepEqual(jeuxDeLaSeance(SEUL, ceQueDisaitLaSeance([]), SURES), []);
    assert.deepEqual(jeuxDeLaSeance(null, { niveaux: ['6ème'], domaines: ['x'] }, []), []);
});

test('LA SÉANCE SE LIT SUR CE QUE L\'ÉLÈVE A TRAVERSÉ', () => {
    const { dit } = seance('geo-thales', 'calc-mult-flash');
    assert.deepEqual(dit.domaines.sort(), ['Espace et géométrie', 'Nombres et calculs']);
    assert.ok(dit.niveaux.includes('4ème') && dit.niveaux.includes('6ème'));
});

test('LE COMMENTAIRE NE PROMET PLUS UNE LISTE QUI N\'EXISTE PAS', () => {
    // Il annonçait « s'il veut la sienne, elle est dans La séance ». Le
    // paramètre existe, mais rien ne lui passe jamais rien : une porte posée
    // sans serrure. Le seul réglage réel est l'interrupteur par classe.
    const src = readFileSync(new URL('../js/core/bacASable.js', import.meta.url), 'utf8');
    assert.ok(!/S'il veut la sienne, elle est dans La séance/.test(src));
    assert.match(src, /une porte posée sans[\s\S]{0,12}serrure/);
    const ui = readFileSync(new URL('../js/ui/bacASable.js', import.meta.url), 'utf8');
    assert.match(ui, /export function lesGroupesDuBac/);
    assert.match(ui, /Comme ta séance/);
});
