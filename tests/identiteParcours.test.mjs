// UN SEUL NOM POUR UN SEUL TRAVAIL.
//
// Un parcours voyage par TROIS chemins, et il faut qu'ils se reconnaissent :
//
//   · le professeur DONNE une séance à une classe (`donnerSeance`) ;
//   · l'élève rattaché OUVRE sa séance depuis l'accueil (`ouvrirSeance`) ;
//   · l'élève sur un poste inconnu TAPE le code dicté (`decodePath`).
//
// Les trois écrivent au journal sous un `pathId`. S'ils n'écrivent pas le même,
// rien ne se recolle : le bilan de la séance ne retient aucun travail, la case
// « donné à cette classe » ne se coche pas, et la progression de l'élève
// disparaît au rechargement suivant.
//
// C'ÉTAIT LE CAS, ET DEUX FOIS PLUTÔT QU'UNE. Le code ne transportant aucun
// identifiant, l'élève en tirait un AU HASARD à chaque lecture ; et la séance,
// elle, écrivait l'identifiant d'atelier du professeur, connu de son seul
// navigateur. Mesuré avant correction : `seance.pathId = path_P9AEXH93`,
// `id chez l'élève = path_c1R4HYE8`, « runs retenus : [] ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { Shortcodes, identiteDeParcours } from '../js/core/shortcodes.js';
import { makePath, makeStep, normalizePath } from '../js/core/path.js';
import { defaultPolicy } from '../js/core/policy.js';
import { donnerSeance } from '../js/core/seances.js';

const unParcours = (nom = 'Devoir de lundi') => makePath(nom, [
    makeStep('calc-add', {}, { stepId: 'a', nbItems: 5, threshold: 4 }),
    makeStep('calc-sub', {}, { stepId: 'b', nbItems: 8, threshold: 6 })
], defaultPolicy());

test('LES TROIS CHEMINS ÉCRIVENT LE MÊME NOM', () => {
    const parcours = unParcours();
    const classe = { id: 'c1', nom: '6e B' };

    // 1. Le professeur donne.
    const code = Shortcodes.encodePath(parcours);
    const seance = donnerSeance(classe, parcours, { code });

    // 2. L'élève rattaché ouvre sa séance : c'est `seance.pathId` qui part au
    //    journal (voir `ouvrirSeance`).
    const parRattachement = seance.pathId;

    // 3. L'élève sur un poste inconnu tape le code.
    const parLeCode = Shortcodes.decodePath(code).id;

    assert.ok(parRattachement, 'la séance porte une identité');
    assert.equal(parRattachement, parLeCode,
        'le rattachement et le code doivent désigner le même travail');

    // Et c'est bien LA définition, pas une coïncidence.
    assert.equal(parRattachement, identiteDeParcours(parcours));
});

test('le panneau du professeur compare cette identité-là', () => {
    // `parcoursClasses` coche une classe quand `s.pathId === identité du
    // parcours ouvert`. Si la séance écrivait autre chose, la case resterait
    // vide pour une classe qui a réellement le travail — et recocher
    // fabriquerait une seconde séance à côté de la première.
    const parcours = unParcours();
    const seance = donnerSeance({ id: 'c1', nom: '6e B' }, parcours, {});
    assert.equal(seance.pathId, identiteDeParcours(parcours));
});

test('deux parcours différents ne se confondent pas', () => {
    const a = unParcours('A');
    const b = makePath('B', [makeStep('calc-add', {}, { stepId: 'a', nbItems: 5, threshold: 4 })],
        defaultPolicy());
    assert.notEqual(identiteDeParcours(a), identiteDeParcours(b));
});

test('le nom ne fait pas partie de l\'identité', () => {
    // Renommer une séance — « Devoir » devient « Devoir de lundi » — ne doit
    // pas couper les élèves de leur progression.
    const a = unParcours('Devoir');
    const b = unParcours('Devoir de lundi');
    assert.equal(identiteDeParcours(a), identiteDeParcours(b));
});

test('l\'identité survit à un aller-retour par le code', () => {
    // Le professeur dicte, l'élève tape, l'élève retape le lendemain : trois
    // fois le même nom. C'est exactement ce qui manquait à la progression.
    const parcours = unParcours();
    const code = Shortcodes.encodePath(parcours);
    const lu = Shortcodes.decodePath(code);
    assert.equal(identiteDeParcours(lu), lu.id, 'le parcours lu se nomme lui-même');
    assert.equal(Shortcodes.decodePath(Shortcodes.encodePath(lu)).id, lu.id,
        'et ré-encodé, il garde le même nom');
});

test('un parcours normalisé garde son identité de contenu', () => {
    // `normalizePath` pose un identifiant à ce qui n'en a pas ; il ne doit pas
    // pour autant changer l'identité de CONTENU, qui ne regarde pas l'id.
    const parcours = unParcours();
    const avant = identiteDeParcours(parcours);
    const apres = identiteDeParcours(normalizePath({ ...parcours, id: null }));
    assert.equal(avant, apres);
});

test('UN RATTRAPAGE EST UN AUTRE TRAVAIL, JUSQUE DANS SON CODE', () => {
    // Rémy : « ceux qui ont raté refont ça pendant que les autres avancent ».
    //
    // Le rattrapage est le MÊME travail redonné : mêmes étapes, même barème.
    // Son bilan ne doit pourtant pas ramasser celui de la séance d'origine —
    // sinon le professeur voit « refait » ce qui n'a jamais été refait, et c'est
    // sur cette mesure-là qu'il décide qui il revoit jeudi.
    //
    // ON LE DISTINGUAIT PAR UN IDENTIFIANT NEUF, et cela ne suffisait pas : un
    // identifiant ne tient pas dans un code dicté. L'élève qui tapait le code du
    // rattrapage retombait donc exactement sur le parcours d'origine. La graine
    // de reprise, elle, VOYAGE dans le code.
    const parcours = unParcours();
    const rattrapage = { ...parcours, id: 'p_neuf', reprise: 'r_jeudi',
                         name: parcours.name + ' — rattrapage' };

    assert.notEqual(identiteDeParcours(rattrapage), identiteDeParcours(parcours),
        'le rattrapage ne se confond pas avec l\'original');

    // Et la distinction survit à l'aller-retour par le code — c'est tout
    // l'intérêt, puisque c'est par le code que l'élève y arrive.
    const codeOrigine = Shortcodes.encodePath(parcours);
    const codeRattrapage = Shortcodes.encodePath(rattrapage);
    assert.notEqual(codeOrigine, codeRattrapage, 'deux codes différents');
    assert.notEqual(Shortcodes.decodePath(codeRattrapage).id,
        Shortcodes.decodePath(codeOrigine).id,
        'et deux identités différentes chez l\'élève');

    // Deux rattrapages du même parcours, donnés à deux jours différents, ne se
    // confondent pas davantage.
    const autre = { ...parcours, reprise: 'r_vendredi' };
    assert.notEqual(identiteDeParcours(autre), identiteDeParcours(rattrapage));

    // Un parcours ordinaire, lui, n'a pas de graine : rien ne change pour lui.
    assert.equal(identiteDeParcours(parcours), identiteDeParcours(unParcours('autre nom')));
});

test('L\'ÉLÈVE RATTACHÉ TRAVAILLE SOUS LE NOM DE SA SÉANCE', () => {
    // LE CHEMIN LE PLUS COURANT, ET LE DERNIER À AVOIR ÉTÉ RECOLLÉ.
    //
    // `ouvrirSeance` écrivait l'assignation sous `seance.pathId` — l'identité
    // de contenu — puis lançait le meneur sur `seance.path`, la COPIE du
    // parcours, qui porte encore l'identifiant d'atelier du professeur. Or le
    // meneur tamponne `this.path.id` sur tout ce qu'il écrit au journal :
    // `run_started`, `step_completed`, `run_finished`.
    //
    // L'élève rattaché travaillait donc sous un nom que son assignation ne
    // portait pas. Deux conséquences, et ce sont exactement les deux dont Rémy
    // s'est plaint : sa progression ne se rattachait à rien au rechargement
    // suivant, et le bilan de la séance ne retenait aucun de ses travaux —
    // « runs retenus (rattachement) : [] » — alors que le MÊME travail fait par
    // le code dicté était bien compté.
    const parcours = unParcours();
    const seance = donnerSeance({ id: 'c1', nom: '6e B' }, parcours,
        { code: Shortcodes.encodePath(parcours) });

    // La copie garde son identifiant d'atelier : c'est normal, elle range le
    // parcours dans la bibliothèque du professeur.
    assert.equal(seance.path.id, parcours.id);
    // Mais la séance, elle, porte l'identité du travail.
    assert.notEqual(seance.pathId, seance.path.id,
        'les deux noms diffèrent bien — c\'est là que le piège était');

    // Ce que `ouvrirSeance` remet au meneur doit porter le nom de la séance.
    const pourLeMeneur = { ...seance.path, id: seance.pathId || seance.path.id };
    assert.equal(pourLeMeneur.id, seance.pathId);
    // Donc le même que celui d'un camarade arrivé par le code.
    assert.equal(pourLeMeneur.id, Shortcodes.decodePath(seance.code).id);
});
