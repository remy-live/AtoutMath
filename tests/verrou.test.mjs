// L'étape sous clé — ce qui ne s'ouvre qu'en classe.
//
// Rémy : « il ne faut pas vraiment que l'élève ait accès aux interros à la
// maison, mais il peut très bien avoir accès à la séquence avant mon cours. »

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    ALPHABET, LONGUEUR_CLE, DUREES, nouvelleCle, normaliserCle, empreinteDe,
    poserVerrou, verifierCle, finDe, etatVerrou, clefOuverture, nettoyerOuverts, direFermeture
} from '../js/core/verrou.js';
import { makeStep } from '../js/core/path.js';
import { statutEtape } from '../js/core/recompenses.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { computeVerrousOuverts } from '../js/core/projections.js';
import { EventTypes } from '../js/core/journal.js';

test('L\'ALPHABET ÉCARTE CE QU\'ON CONFOND À L\'ORAL ET À L\'ÉCRIT', () => {
    // La clé se dicte à voix haute devant trente élèves, puis se tape sur un
    // clavier de tablette. Un I et un 1, un O et un 0 coûteraient une main
    // levée par classe.
    for (const c of 'IO01') {
        assert.equal(ALPHABET.includes(c), false, `${c} ne doit pas être dans l'alphabet`);
    }
    assert.equal(new Set(ALPHABET).size, ALPHABET.length, 'un caractère en double');
    // Assez de places pour que l'essai systématique ne soit pas trivial.
    assert.ok(Math.pow(ALPHABET.length, LONGUEUR_CLE) > 1e6,
        `${ALPHABET.length}^${LONGUEUR_CLE} clés, c'est trop peu`);
});

test('UNE CLÉ TIRÉE AU SORT N\'EMPLOIE QUE CET ALPHABET', () => {
    for (let i = 0; i < 50; i++) {
        const cle = nouvelleCle(makeRng(`cle-${i}`));
        assert.equal(cle.length, LONGUEUR_CLE);
        [...cle].forEach(c => assert.ok(ALPHABET.includes(c), `${cle} contient ${c}`));
    }
});

test('LA SAISIE EST TOLÉRANTE, MAIS N\'INVENTE RIEN', () => {
    // Minuscules, espaces, tirets : la clé est dictée puis recopiée à la main.
    assert.equal(normaliserCle('kt rb'), 'KTRB');
    assert.equal(normaliserCle('KT-RB'), 'KTRB');
    assert.equal(normaliserCle('  ktrb  '), 'KTRB');
    // ON NE REMPLACE RIEN. La tentation était de faire revenir le O sur le
    // zéro : ici les deux sont écartés, et lui inventer un remplaçant
    // transformerait une faute de frappe en une AUTRE clé, refusée elle aussi
    // mais sans qu'on sache pourquoi.
    assert.equal(normaliserCle('KO1B'), 'KB');
    assert.equal(normaliserCle(null), '');
});

test('LE PARCOURS NE TRANSPORTE QUE L\'EMPREINTE, JAMAIS LA CLÉ', async () => {
    // Un parcours voyage dans un lien, et un lien se décode : il est écrit en
    // base64, pas chiffré. Y ranger la clé en clair reviendrait à l'écrire au
    // tableau la veille.
    const verrou = await poserVerrou('KTRB', DUREES.HEURE);
    assert.ok(verrou, 'le verrou doit se poser');
    assert.ok(verrou.empreinte && verrou.sel);
    const brut = JSON.stringify(verrou);
    assert.equal(brut.includes('KTRB'), false, 'la clé se lit dans le verrou !');
    assert.equal(verrou.empreinte.includes('KTRB'), false);
});

test('LA BONNE CLÉ OUVRE, LES AUTRES NON', async () => {
    const verrou = await poserVerrou('KTRB', DUREES.HEURE);
    assert.equal(await verifierCle(verrou, 'KTRB'), true);
    assert.equal(await verifierCle(verrou, 'ktrb'), true, 'les minuscules passent');
    assert.equal(await verifierCle(verrou, 'KT-RB'), true, 'le tiret passe');
    assert.equal(await verifierCle(verrou, 'KTRA'), false);
    assert.equal(await verifierCle(verrou, ''), false);
    assert.equal(await verifierCle(null, 'KTRB'), false);
});

test('DEUX VERROUS, MÊME CLÉ, EMPREINTES DIFFÉRENTES', async () => {
    // Le sel sert exactement à cela : sans lui, la même clé posée sur deux
    // interrogations donnerait la même empreinte, et une table précalculée
    // ouvrirait tout le catalogue d'un coup.
    const a = await poserVerrou('KTRB', DUREES.HEURE);
    const b = await poserVerrou('KTRB', DUREES.HEURE);
    assert.notEqual(a.sel, b.sel);
    assert.notEqual(a.empreinte, b.empreinte);
    // Et chacune n'ouvre que la sienne.
    assert.equal(await verifierCle(a, 'KTRB'), true);
    assert.equal(await verifierCle(b, 'KTRB'), true);
});

test('L\'EMPREINTE EST LENTE À CALCULER, DÉLIBÉRÉMENT', async () => {
    // Quatre caractères font un peu plus d'un million de clés : un simple
    // SHA-256 les essaierait toutes en une seconde. On mesure ici que la
    // dérivation coûte assez pour que l'essai systématique demande des heures,
    // sans que la vérification légitime se sente.
    const t0 = Date.now();
    await empreinteDe('KTRB', 'sel-de-mesure');
    const ms = Date.now() - t0;
    assert.ok(ms > 5, `une empreinte en ${ms} ms : c'est trop rapide pour freiner qui que ce soit`);
    const heures = (Math.pow(ALPHABET.length, LONGUEUR_CLE) * ms) / 3600000;
    assert.ok(heures > 2, `l'essai systématique ne demanderait que ${heures.toFixed(1)} h`);
});

test('LA CLÉ N\'OUVRE PAS POUR TOUJOURS', () => {
    // Un élève qui note la clé refait l'interrogation chez lui le soir, et la
    // note ne veut plus rien dire.
    const midi = new Date('2026-09-15T12:00:00').getTime();
    const uneHeure = finDe(DUREES.HEURE, midi);
    assert.equal(uneHeure, midi + 3600000);

    // « Jusqu'à ce soir » est MINUIT, pas vingt-quatre heures : une clé donnée
    // à midi ne doit pas rouvrir l'interrogation le lendemain matin.
    const soir = finDe(DUREES.JOUR, midi);
    assert.ok(soir > midi && soir < midi + 24 * 3600000);
    assert.equal(new Date(soir).getDate(), new Date(midi).getDate());

    // NULL ET NON INFINITY pour « sans limite » : l'ouverture est écrite au
    // journal, donc en JSON, et JSON.stringify(Infinity) rend « null ».
    assert.equal(finDe(DUREES.TOUJOURS, midi), null);
    assert.equal(JSON.parse(JSON.stringify({ f: finDe(DUREES.TOUJOURS, midi) })).f, null);
});

test('L\'ÉTAT D\'UNE ÉTAPE : fermée, ouverte, périmée', async () => {
    const verrou = await poserVerrou('KTRB', DUREES.HEURE);
    const step = { stepId: 's1', verrou };
    const t = Date.now();

    assert.deepEqual(etatVerrou(step, { maintenant: t }),
        { ferme: true, raison: 'cle', quand: null });

    const ouverts = { [clefOuverture(step)]: finDe(DUREES.HEURE, t) };
    assert.equal(etatVerrou(step, { maintenant: t, ouverts }).ferme, false);
    // Une heure plus tard, c'est refermé.
    assert.equal(etatVerrou(step, { maintenant: t + 3700000, ouverts }).ferme, true);

    // Sans limite : ouvert quoi qu'il arrive.
    const sansFin = { [clefOuverture(step)]: null };
    assert.equal(etatVerrou(step, { maintenant: t + 1e10, ouverts: sansFin }).ferme, false);

    // Une étape sans verrou est ouverte.
    assert.equal(etatVerrou({ stepId: 's2' }, { maintenant: t }).ferme, false);
});

test('LA DATE PASSE AVANT LA CLÉ', async () => {
    // Une date d'ouverture dit QUAND la chose commence à exister, une clé dit
    // QUI l'ouvre. Une interrogation datée de vendredi n'est pas ouvrable
    // jeudi, même avec la bonne clé — sans quoi la date ne servirait à rien.
    const verrou = await poserVerrou('KTRB', DUREES.HEURE);
    const t = Date.now();
    const step = { stepId: 's1', verrou, ouvertureLe: t + 864e5 };
    const ouverts = { [clefOuverture(step)]: null };
    const etat = etatVerrou(step, { maintenant: t, ouverts });
    assert.equal(etat.ferme, true);
    assert.equal(etat.raison, 'date', 'la date doit l\'emporter sur la clé déjà donnée');
    // Et le lendemain, la clé reprend la main.
    assert.equal(etatVerrou(step, { maintenant: t + 9e7, ouverts }).ferme, false);
});

test('ON DIT TOUJOURS POURQUOI C\'EST FERMÉ', () => {
    // Une porte qui refuse sans un mot passe pour une panne, et l'élève appelle.
    const date = direFermeture({ ferme: true, raison: 'date', quand: new Date('2026-09-18T08:00:00').getTime() });
    assert.match(date, /vendredi/);
    assert.match(date, /18 septembre/);
    assert.match(direFermeture({ ferme: true, raison: 'cle' }), /professeur/);
    assert.equal(direFermeture({ ferme: false }), '');
});

test('LE STATUT DE L\'ÉTAPE : la clé passe avant le curseur', async () => {
    const verrou = await poserVerrou('KTRB', DUREES.HEURE);
    const steps = [
        { stepId: 'a', exerciseId: 'x' },
        { stepId: 'b', exerciseId: 'y', verrou },
        { stepId: 'c', exerciseId: 'z' }
    ];
    const base = { steps, doneIds: new Set(['a']), currentIndex: 1 };

    // Le curseur ne se pose pas sur une porte que l'élève ne peut pas ouvrir.
    assert.equal(statutEtape(steps[1], 1, base), 'cle');
    assert.equal(statutEtape(steps[2], 2, base), 'locked');

    // La clé donnée, l'étape redevient celle du moment.
    const ouverts = { [clefOuverture(steps[1])]: finDe(DUREES.HEURE) };
    assert.equal(statutEtape(steps[1], 1, { ...base, ouverts }), 'current');

    // UNE ÉTAPE DÉJÀ FAITE RESTE FAITE : refermer après coup effacerait ce que
    // l'élève a réussi.
    assert.equal(statutEtape(steps[1], 1, { ...base, doneIds: new Set(['a', 'b']) }), 'done');

    // L'ORDRE LIBRE NE CONTOURNE PAS LA CLÉ : c'est une fermeture voulue par le
    // professeur, pas une conséquence de la chronologie.
    assert.equal(statutEtape(steps[1], 1, { ...base, ordreLibre: true }), 'cle');

    // Seul l'aperçu du banc d'essai la traverse — il ne s'adresse pas à un élève.
    assert.equal(statutEtape(steps[1], 1, { ...base, allUnlocked: true }), 'open');
});

test('LE VERROU SURVIT AU VOYAGE DANS UN CODE', async () => {
    // C'EST LE POINT QUI A FAILLI ÊTRE MANQUÉ. Un parcours qui voyage dans un
    // code est RECONSTRUIT à l'arrivée, et ses étapes reçoivent de nouveaux
    // identifiants. Un verrou salé par l'identifiant d'étape aurait changé de
    // sel en route : la bonne clé aurait été refusée sur la machine de l'élève,
    // la seule où l'on ne peut pas déboguer.
    const verrou = await poserVerrou('KTRB', DUREES.JOUR);
    const path = {
        id: 'p1', version: 2, name: 'Séquence', policy: null,
        steps: [
            makeStep('calc-addition', {}, { nbItems: 10 }),
            makeStep('calc-addition', {}, { nbItems: 5, verrou, ouvertureLe: 1789000000000 })
        ]
    };
    const code = Shortcodes.encodePath(path);
    const relu = Shortcodes.decodePath(code);
    assert.ok(relu, 'le code doit se relire');
    const etape = relu.steps[1];
    assert.deepEqual(etape.verrou, verrou, 'le verrou a changé en route');
    assert.equal(etape.ouvertureLe, 1789000000000, 'la date d\'ouverture a été perdue');
    // Et la clé ouvre toujours, malgré le nouvel identifiant d'étape.
    assert.notEqual(etape.stepId, path.steps[1].stepId, 'les identifiants changent bien');
    assert.equal(await verifierCle(etape.verrou, 'ktrb'), true);
    assert.equal(clefOuverture(etape), clefOuverture(path.steps[1]),
        'la clef de rangement doit être la même des deux côtés');
    // Une étape sans verrou n'en gagne pas un en route.
    assert.equal(relu.steps[0].verrou, null);
});

test('L\'OUVERTURE EST UN ÉVÉNEMENT DU JOURNAL', () => {
    // Un événement et non un réglage : l'ouverture se synchronise alors toute
    // seule entre les appareils, et le professeur voit à quelle heure sa clé a
    // servi — ce qu'on veut précisément savoir d'une interrogation.
    const ev = (sel, jusqua, ts) => ({ type: EventTypes.VERROU_OUVERT, ts, payload: { sel, jusqua } });
    const ouverts = computeVerrousOuverts([
        ev('AAA', 1000, 1), ev('BBB', 5000, 2), ev('AAA', 3000, 3)
    ]);
    // ON GARDE L'OUVERTURE LA PLUS LONGUE, jamais la dernière : un élève qui
    // retape la clé en fin d'heure ne doit pas raccourcir ce qui lui restait.
    assert.equal(ouverts.AAA, 3000);
    assert.equal(ouverts.BBB, 5000);
    // « Sans limite » l'emporte, dans les deux ordres.
    assert.equal(computeVerrousOuverts([ev('C', null, 1), ev('C', 9000, 2)]).C, null);
    assert.equal(computeVerrousOuverts([ev('C', 9000, 1), ev('C', null, 2)]).C, null);
    // Les autres événements ne troublent rien.
    assert.deepEqual(computeVerrousOuverts([{ type: EventTypes.ATTEMPT, payload: {} }]), {});
});

test('LES OUVERTURES PÉRIMÉES SE NETTOIENT', () => {
    const t = Date.now();
    const propre = nettoyerOuverts({ a: t - 1000, b: t + 100000, c: null }, t);
    assert.deepEqual(Object.keys(propre).sort(), ['b', 'c']);
});

test('UNE ÉTAPE NEUVE N\'EST NI FERMÉE NI DATÉE', () => {
    // Le défaut ne doit rien changer : la quasi-totalité des étapes n'a pas de
    // verrou, et une séquence ordinaire doit rester ouverte de bout en bout.
    const s = makeStep('calc-addition');
    assert.equal(s.verrou, null);
    assert.equal(s.ouvertureLe, null);
    assert.equal(etatVerrou(s).ferme, false);
});
