// La rédaction de Thalès : « Je sais que… Or… Donc… »

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';
import { creerThales, egaliteThales } from '../js/core/thales.js';
import {
    PETITS, GRANDS, RESTES, ETIQUETTES, canon, verifierEgalite, hypotheses,
    isolements, trio, calculEcrit, redactionComplete, egaliteChiffree, chiffrer,
    verifierChiffres
} from '../js/core/thalesRedaction.js';

test('L\'ÉGALITÉ SE TAPE, ET ON NE LUI IMPOSE NI ORDRE NI SENS', () => {
    // Rémy : « il faudrait aussi pouvoir taper l'égalité ». Un élève qui écrit
    // les trois rapports dans un autre ordre a compris exactement la même
    // chose ; les lui refuser lui apprendrait à recopier.
    assert.equal(verifierEgalite(['AD', 'AC', 'AE', 'AB', 'DE', 'BC']).ok, true);
    assert.equal(verifierEgalite(['AE', 'AB', 'DE', 'BC', 'AD', 'AC']).ok, true);
    assert.equal(verifierEgalite(['DE', 'BC', 'AD', 'AC', 'AE', 'AB']).ok, true);
    // Retournée en entier, c'est la même égalité.
    const inverse = verifierEgalite(['AC', 'AD', 'AB', 'AE', 'BC', 'DE']);
    assert.equal(inverse.ok, true);
    assert.equal(inverse.sens, -1);
    // UN SEGMENT SE LIT DANS LES DEUX SENS : [AD] et [DA] sont le même.
    assert.equal(verifierEgalite(['DA', 'CA', 'EA', 'BA', 'ED', 'CB']).ok, true);
    // Et la casse ou les espaces ne sont pas des fautes de mathématiques.
    assert.equal(verifierEgalite([' ad ', 'ac', 'ae', 'ab', 'de', 'bc']).ok, true);
});

test('CHAQUE REFUS NOMME LA CONFUSION, il ne dit pas seulement « non »', () => {
    // C'est ce qui permet au carnet d'erreurs de dire à l'élève ce qu'il a
    // fait. Les quatre fautes ordinaires, une par une.
    const reste = verifierEgalite(['AD', 'CD', 'AE', 'BE', 'DE', 'BC']);
    assert.equal(reste.ok, false);
    assert.match(reste.raison, /RESTE/);

    const envers = verifierEgalite(['AD', 'AC', 'AB', 'AE', 'DE', 'BC']);
    assert.equal(envers.ok, false);
    assert.match(envers.raison, /envers/);

    const melange = verifierEgalite(['AD', 'AE', 'AC', 'AB', 'DE', 'BC']);
    assert.equal(melange.ok, false);
    assert.match(melange.raison, /deux droites entre elles/);

    const deuxFois = verifierEgalite(['AD', 'AC', 'AD', 'AC', 'DE', 'BC']);
    assert.equal(deuxFois.ok, false);
    assert.match(deuxFois.raison, /deux fois/);

    // Mal apparié : AD avec AB au lieu de AC.
    const mal = verifierEgalite(['AD', 'AB', 'AE', 'AC', 'DE', 'BC']);
    assert.equal(mal.ok, false);
    assert.ok(mal.raison.length > 40);

    // Une case vide n'est pas une réponse, et le message le dit.
    const vide = verifierEgalite(['AD', 'AC', 'AE', '', 'DE', 'BC']);
    assert.equal(vide.ok, false);
    assert.match(vide.raison, /manque/);
});

test('LES PIÈGES SONT SUR LA TABLE, sinon l\'exercice se fait au hasard', () => {
    // Les deux « restes » sont proposés parmi les étiquettes : c'est la faute
    // qu'on traque, et elle doit être atteignable.
    RESTES.forEach(r => assert.ok(ETIQUETTES.includes(r), `${r} devrait être proposé`));
    PETITS.concat(GRANDS).forEach(x => assert.ok(ETIQUETTES.includes(x), x));
    assert.equal(new Set(ETIQUETTES).size, ETIQUETTES.length, 'une étiquette en double');
    // Et un reste n'est jamais un segment du théorème.
    RESTES.forEach(r => {
        assert.equal(PETITS.includes(r), false);
        assert.equal(GRANDS.includes(r), false);
    });
    assert.equal(canon('DA'), 'AD');
    assert.equal(canon('cb'), 'BC');
});

test('les hypothèses : deux vraies, et les fausses expliquent pourquoi', () => {
    const h = hypotheses();
    const vraies = h.filter(x => x.vrai);
    assert.equal(vraies.length, 2, 'Thalès demande DEUX choses, pas une ni trois');
    assert.ok(vraies.some(x => x.texte.includes('sécantes en A')));
    assert.ok(vraies.some(x => x.texte.includes('parallèles')));
    h.filter(x => !x.vrai).forEach(x => {
        assert.ok(x.pourquoi && x.pourquoi.length > 40, `« ${x.texte} » sans explication`);
    });
    // ET IL Y A DES PIÈGES DE DEUX SORTES : ce qui est faux, et ce qui est vrai
    // mais inutile. La seconde sorte est la plus instructive — une hypothèse
    // dont on ne se sert pas n'a rien à faire dans une démonstration.
    assert.ok(h.some(x => !x.vrai && /isocèle|alignés/.test(x.texte)));
});

test('LE PRODUIT EN CROIX : une forme juste, deux façons de se tromper de place', () => {
    for (const cherche of ['AD', 'AE', 'DE']) {
        const formes = isolements(cherche);
        assert.equal(formes.filter(f => f.juste).length, 1, cherche);
        assert.equal(new Set(formes.map(f => f.texte)).size, 3, `${cherche} : deux formes identiques`);
        formes.filter(f => !f.juste).forEach(f =>
            assert.ok(f.pourquoi && f.pourquoi.length > 40, `${cherche} : « ${f.texte} »`));
        const [a, b, c] = trio(cherche);
        assert.equal(formes.find(f => f.juste).texte, `${cherche} = ${a} × ${c} ÷ ${b}`);
    }
});

test('LE CALCUL ÉCRIT TOMBE SUR LA VRAIE LONGUEUR', () => {
    // Si la formule et la figure divergeaient, l'élève rédigerait juste et
    // serait corrigé faux.
    for (let i = 0; i < 120; i++) {
        for (const config of ['emboites', 'papillon']) {
            const f = creerThales({ config, rng: makeRng(`red-${config}-${i}`) });
            if (!f) continue;
            for (const cherche of ['AD', 'AE', 'DE']) {
                const c = calculEcrit(f, cherche);
                assert.ok(Math.abs(c.valeur - f[cherche]) < 1e-9,
                    `${cherche} : ${c.valeur} au lieu de ${f[cherche]}`);
                assert.match(c.conclusion, /cm$/);
                // Les trois longueurs du calcul sont connues, et la cherchée n'y est pas.
                assert.equal(c.chiffres.includes('undefined'), false);
                assert.equal(trio(cherche).includes(cherche), false,
                    'on ne calcule pas une longueur à partir d\'elle-même');
            }
        }
    }
});

test('LA RÉDACTION COMPLÈTE EST EN TROIS PARTIES, ligne chiffrée comprise', () => {
    // Rémy : « juste après l'égalité de fractions dans le OR, tu rajoutes une
    // ligne de fractions où on remplace par les valeurs quand on les a, et on
    // recopie le nom du côté sinon. »
    //
    // J'AVAIS LU SA PREMIÈRE CONSIGNE À L'ENVERS : son plan portait
    // « (on remplace par les valeurs <- ne le note pas) », et j'y avais lu que
    // la LIGNE ne devait pas exister. C'était l'aparté qu'il ne fallait pas
    // recopier. Ce test disait donc le contraire de ce qu'il demandait.
    const f = creerThales({ config: 'emboites', rng: makeRng('complete') });
    const r = redactionComplete(f, 'AD');
    assert.deepEqual(r.map(p => p.titre), ['Je sais que', 'Or', 'Donc']);
    assert.equal(r[0].lignes.length, 2);
    assert.ok(r[1].lignes.includes(egaliteThales()));
    // LE « OR » PORTE DEUX ÉGALITÉS : celle du cours, puis la même chiffrée.
    assert.equal(r[1].lignes.length, 3);
    assert.equal(r[1].lignes[2], egaliteChiffree(f, 'AD').texte);
    assert.equal(r[2].lignes.length, 3, 'isoler, calculer, conclure');
    // La conclusion porte son unité : sans elle, ce n'est pas une longueur.
    assert.match(r[2].lignes[2], /cm/);
});

test('LA LIGNE CHIFFRÉE : les longueurs données deviennent des nombres, les autres non', () => {
    for (const config of ['emboites', 'papillon']) {
        for (let i = 0; i < 40; i++) {
            const f = creerThales({ config, rng: makeRng(`chif-${config}-${i}`) });
            if (!f) continue;
            for (const cherche of ['AD', 'AE', 'DE']) {
                const connues = new Set(trio(cherche));
                const eg = ['AD', 'AC', 'AE', 'AB', 'DE', 'BC'];
                const ligne = chiffrer(f, cherche, eg);
                eg.forEach((nom, k) => {
                    if (connues.has(nom)) {
                        assert.match(ligne[k], /^[\d, ]+$/,
                            `${nom} est donnée : elle doit devenir un nombre`);
                    } else {
                        assert.equal(ligne[k], nom, `${nom} est inconnue : son nom reste`);
                    }
                });
                // LA LONGUEUR CHERCHÉE N'EST JAMAIS CHIFFRÉE : ce serait donner
                // la réponse dans l'énoncé de la démonstration.
                assert.equal(ligne[eg.indexOf(cherche)], cherche);
            }
        }
    }
});

test('LA LIGNE CHIFFRÉE SUIT L\'ÉGALITÉ DE L\'ÉLÈVE, pas la canonique', () => {
    // Il a pu écrire les trois rapports dans un autre ordre — c'est accepté, et
    // c'est la même égalité. Lui présenter ensuite une ligne rangée autrement
    // serait lui dire que son écriture était fausse après l'avoir dite juste.
    const f = creerThales({ config: 'emboites', rng: makeRng('ordre') });
    const sien = ['DE', 'BC', 'AD', 'AC', 'AE', 'AB'];
    const ligne = chiffrer(f, 'DE', sien);
    assert.equal(ligne[0], 'DE');
    assert.equal(ligne[1], String(f.BC).replace('.', ','));
    // Et la vérification accepte SA ligne.
    assert.equal(verifierChiffres(f, 'DE', sien, ligne).ok, true);
});

test('CHAQUE REFUS DE LA LIGNE CHIFFRÉE NOMME LA CONFUSION', () => {
    const f = creerThales({ config: 'emboites', rng: makeRng('refus') });
    const eg = ['AD', 'AC', 'AE', 'AB', 'DE', 'BC'];
    const juste = chiffrer(f, 'DE', eg);

    // Garder le nom d'une longueur donnée : on n'a pas lu l'énoncé.
    const garde = juste.slice(); garde[2] = 'AE';
    assert.match(verifierChiffres(f, 'DE', eg, garde).raison, /donnée dans l'énoncé/);

    // Inventer un nombre là où la longueur est inconnue : on a mesuré sur le
    // dessin, qui n'est pas à l'échelle.
    const invente = juste.slice(); invente[4] = '7';
    assert.match(verifierChiffres(f, 'DE', eg, invente).raison, /On ne connaît pas DE/);

    // Le mauvais nombre : on a lu la mauvaise cote.
    const faux = juste.slice(); faux[2] = String(Number(String(f.AE)) + 1);
    assert.match(verifierChiffres(f, 'DE', eg, faux).raison, /Ce n'est pas la longueur/);

    // Une case vide n'est pas une réponse.
    const vide = juste.slice(); vide[0] = '';
    assert.match(verifierChiffres(f, 'DE', eg, vide).raison, /manque/);
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-thales-redaction');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'thales-redaction');
    // La calculatrice est autorisée : Rémy l'a écrit, et la dernière ligne est
    // une division qu'on n'évalue pas.
    assert.equal(exo.calculatrice, true);
    assert.ok(exo.skills.includes('geo.thales'));
    exo.paramSchema.find(p => p.id === 'config').options
        .forEach(o => assert.ok(['melange', 'emboites', 'papillon'].includes(o.value), o.value));
});
