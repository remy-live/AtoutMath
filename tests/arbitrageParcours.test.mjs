// QUI A RAISON, DU SERVEUR OU DE CETTE MACHINE ?
//
// RÉMY : « sur mon ordi de boulot et mon ordi personnel, le parcours que j'ai
// modifié sur mon ordi perso n'est pas à jour sur mon ordi de boulot pourtant
// c'est sur mon compte ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DÉFAUT TENAIT EN UNE LIGNE : `ramenerLaBibliotheque` sautait les
// identifiants déjà connus (`if (connus.has(brut.id)) continue;`). Un parcours
// descendait donc UNE fois, et plus jamais. Son commentaire promettait « en cas
// de doute, on garde les deux et c'est le professeur qui tranche » — on ne
// gardait pas les deux, et aucun doute n'était levé : on gardait le local,
// toujours, sans rien regarder.
//
// MESURÉ sur `tools/deuxPostes.mjs`, avant : le parcours passe à trois étapes
// au collège, le serveur les a bien, le Mac reste à deux. Après : trois des
// deux côtés, et une seule entrée.
//
// CE QUI SE VÉRIFIE ICI, ET QUI NE SE VOIT PAS EN REGARDANT UN ÉCRAN :
//
//   · qu'une retouche d'ailleurs descende, mais qu'une retouche d'ICI survive
//     au démarrage — les deux, et pas seulement l'une des deux ;
//   · qu'aucune HORLOGE n'intervienne. Deux machines ont deux montres, et
//     celle qui retarde écraserait tranquillement le travail de l'autre ;
//   · que ranger un parcours dans un dossier ne compte pas comme une
//     modification — le dossier ne voyage pas, et le confondre avec le contenu
//     ferait défiler des parcours d'un poste à l'autre à chaque démarrage.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    formeEnvoyee, sceauDeParcours, quiGagne, fondreDansLeLocal
} from '../js/core/arbitrageParcours.js';

/** Une entrée de bibliothèque, telle que « Préparer » la range. */
const enveloppe = (o = {}) => ({
    id: o.id || 'path_1',
    name: o.nom || 'Les priorités du jeudi',
    folderId: o.dossier || 'root',
    timestamp: o.quand || 1_700_000_000_000,
    data: {
        id: o.id || 'path_1',
        name: o.nom || 'Les priorités du jeudi',
        steps: Array.from({ length: o.etapes === undefined ? 2 : o.etapes },
            (_, i) => ({ stepId: 's' + i, exerciseId: 'calc-add' }))
    }
});

/** Ce que le serveur range : le parcours déballé, sans dossier ni date. */
const duServeur = (o = {}) => formeEnvoyee(enveloppe(o));

// ─────────────────────────────────────────── LES TROIS VERDICTS ─────────────

test('UNE RETOUCHE FAITE AILLEURS DESCEND', () => {
    // C'est le défaut de Rémy, et c'est la raison d'être du module. Cette
    // machine a deux étapes et n'y a pas touché depuis son dernier échange ; le
    // serveur en a trois. La différence vient donc d'ailleurs.
    const local = enveloppe({ etapes: 2 });
    assert.equal(quiGagne({
        local,
        serveur: duServeur({ etapes: 3 }),
        connu: sceauDeParcours(local)
    }), 'serveur');
});

test('UNE RETOUCHE FAITE ICI SURVIT AU DÉMARRAGE', () => {
    // L'autre moitié, et elle compte autant : on vient d'ajouter une étape, ça
    // n'est pas encore parti, et le démarrage ne doit pas l'effacer avec la
    // version du serveur. C'est précisément ce que l'ancien code protégeait —
    // on garde cette protection, on cesse seulement de l'appliquer à l'aveugle.
    const connu = sceauDeParcours(enveloppe({ etapes: 2 }));
    assert.equal(quiGagne({
        local: enveloppe({ etapes: 4 }),
        serveur: duServeur({ etapes: 2 }),
        connu
    }), 'local');
});

test('DEUX CÔTÉS IDENTIQUES NE FONT RIEN', () => {
    // Trente parcours réécrits à chaque démarrage, c'est trente écritures dans
    // IndexedDB et un tiroir qui se réordonne sous les yeux.
    const local = enveloppe({ etapes: 2 });
    assert.equal(quiGagne({ local, serveur: duServeur({ etapes: 2 }), connu: undefined }), 'rien');
    assert.equal(quiGagne({ local, serveur: duServeur({ etapes: 2 }),
        connu: sceauDeParcours(local) }), 'rien');
});

test('SANS SOUVENIR, C\'EST LE SERVEUR QUI GAGNE', () => {
    // LE CAS DE LA MACHINE QU'ON VIENT DE METTRE À JOUR. Jusqu'ici, toute
    // retouche locale PARTAIT au démarrage suivant ; si les deux côtés
    // diffèrent le jour de la mise à jour, c'est donc que le serveur a reçu
    // quelque chose d'ailleurs. C'est exactement la situation de Rémy, et
    // pencher vers le local lui ferait attendre un démarrage de plus.
    assert.equal(quiGagne({
        local: enveloppe({ etapes: 2 }),
        serveur: duServeur({ etapes: 3 }),
        connu: undefined
    }), 'serveur');
    assert.equal(quiGagne({
        local: enveloppe({ etapes: 2 }),
        serveur: duServeur({ etapes: 3 }),
        connu: null
    }), 'serveur');
});

test('ON NE DÉCIDE RIEN SUR CE QU\'ON NE SAIT PAS LIRE', () => {
    // Une ligne vide ou cassée au serveur ne doit pas emporter un parcours
    // local : « rien » est la bonne réponse, et l'appelant passe au suivant.
    const local = enveloppe({});
    assert.equal(quiGagne({ local, serveur: null, connu: undefined }), 'rien');
    assert.equal(quiGagne({ local: null, serveur: duServeur({}), connu: undefined }), 'rien');
    assert.equal(quiGagne({}), 'rien');
    assert.equal(quiGagne(), 'rien');
});

// ────────────────────────────────── CE QUI NE COMPTE PAS COMME UN CHANGEMENT ─

test('AUCUNE HORLOGE N\'INTERVIENT', () => {
    // DEUX MACHINES ONT DEUX MONTRES. Comparer la date du Mac à celle du poste
    // du collège, c'est laisser celle qui retarde écraser le travail de
    // l'autre. On ne compare que des empreintes de CONTENU — et une date qui
    // change sans que rien d'autre bouge ne doit donc rien déclencher.
    const vieux = enveloppe({ etapes: 2, quand: 1_600_000_000_000 });
    const recent = enveloppe({ etapes: 2, quand: 1_900_000_000_000 });
    assert.equal(sceauDeParcours(vieux), sceauDeParcours(recent));
    assert.equal(quiGagne({ local: recent, serveur: formeEnvoyee(vieux), connu: undefined }), 'rien');
});

test('RANGER DANS UN DOSSIER N\'EST PAS UNE MODIFICATION', () => {
    // Le `folderId` ne part pas au serveur : c'est un choix de rangement propre
    // à chaque poste. Le compter comme une différence ferait remonter un
    // parcours à chaque fois qu'on le déplace dans le tiroir — et, pire, le
    // ferait redescendre sans dossier sur l'autre machine.
    const range = enveloppe({ etapes: 2, dossier: 'sixiemes' });
    const racine = enveloppe({ etapes: 2, dossier: 'root' });
    assert.equal(sceauDeParcours(range), sceauDeParcours(racine));
    assert.equal(quiGagne({ local: range, serveur: formeEnvoyee(racine), connu: undefined }), 'rien');
});

test('LE DOSSIER D\'ICI SURVIT QUAND LE SERVEUR GAGNE', () => {
    // Sinon le parcours que Rémy avait rangé dans « Sixièmes » sur ce poste
    // remonte à la racine à chaque démarrage, et son classement se défait sans
    // qu'il comprenne pourquoi.
    const locale = enveloppe({ etapes: 2, dossier: 'sixiemes' });
    const fraiche = enveloppe({ etapes: 3, dossier: 'root' });
    const fondue = fondreDansLeLocal(locale, fraiche);
    assert.equal(fondue.folderId, 'sixiemes');
    assert.equal(fondue.data.steps.length, 3, 'le contenu, lui, vient bien du serveur');
    assert.equal(fondue.id, locale.id);
});

test('fondreDansLeLocal supporte une entrée locale cassée', () => {
    const fraiche = enveloppe({ etapes: 3 });
    assert.equal(fondreDansLeLocal(null, fraiche).folderId, 'root');
    assert.equal(fondreDansLeLocal({}, fraiche).folderId, 'root');
});

// ──────────────────────────────────────────── LA FORME COMPARÉE ─────────────

test('ON COMPARE DEUX FOIS LA MÊME FORME, ET C\'EST TOUT LE PROBLÈME', () => {
    // L'empreinte portait sur l'ENVELOPPE côté machine et sur le PARCOURS côté
    // serveur. Comparer les deux rend « différent » à tous les coups, et une
    // règle qui dit toujours « ça a changé » ne décide de rien : elle aurait
    // fait descendre le serveur même sur une retouche locale.
    const env = enveloppe({ etapes: 2 });
    const nu = formeEnvoyee(env);
    assert.equal(sceauDeParcours(env), sceauDeParcours(nu),
        'une enveloppe et son parcours déballé ont la même empreinte');
    assert.equal(formeEnvoyee(nu).steps.length, 2, 'déballer deux fois ne perd rien');
    assert.equal(formeEnvoyee(env).folderId, undefined, 'le dossier ne part pas');
    assert.equal(formeEnvoyee(env).timestamp, undefined, 'la date non plus');
});

test('l\'identifiant et le nom de l\'ENTRÉE l\'emportent', () => {
    // Ce sont eux que les assignations désignent : les renommer en route
    // détacherait les séances déjà données de leur parcours.
    const env = enveloppe({ id: 'path_99', nom: 'Le vrai nom' });
    env.data.name = 'un vieux nom resté dedans';
    const forme = formeEnvoyee(env);
    assert.equal(forme.id, 'path_99');
    assert.equal(forme.name, 'Le vrai nom');
});

test('formeEnvoyee supporte le vide', () => {
    assert.equal(formeEnvoyee(null), null);
    assert.equal(formeEnvoyee('un texte'), null);
    assert.equal(sceauDeParcours(null), null);
});
