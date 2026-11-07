// QUI TRAVAILLE SUR CE POSTE — ET LA RÈGLE QU'IL NE FAUT JAMAIS CASSER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/profile.js` tient l'identité locale : le profil (l'élève) et
// l'appareil. Les deux servent à la synchronisation, et le second permet de
// « détecter les doublons quand le même élève travaille sur deux machines
// (maison / école) » — c'est-à-dire exactement la situation que Rémy a
// signalée : « sur mon ordi de boulot et mon ordi personnel ».
//
// LA RÈGLE QU'IL NE FAUT JAMAIS CASSER, et le code la porte en un mot :
//
//     if (profiles.length <= 1) return false;   // on garde toujours un profil
//
// Un poste sans profil est un poste où personne ne peut travailler. Et comme
// `deleteProfile` EFFACE aussi les données du profil retiré, le jour où cette
// garde tombe, le dernier élève du poste perd son travail en appuyant sur un
// bouton de ménage.
//
// L'AUTRE PIÈGE EST PLUS SOURNOIS : le profil actif doit toujours DÉSIGNER un
// profil qui existe. Un `activeProfileId` qui pointe dans le vide rend
// `getActiveProfile()` nul, et tout ce qui lit `profile.id` derrière — le
// journal, l'export, la synchro — travaille alors sur `undefined`. Rien ne jette
// tout de suite ; les événements partent simplement sans propriétaire.
//
// ON NE SIMULE PAS LE STOCKAGE. `core/store.js` dégrade tout seul vers une
// mémoire interne quand il n'y a ni `localforage` ni `localStorage` — c'est le
// cas sous Node —, donc `globalStore` fonctionne réellement ici. On éprouve
// donc le vrai module, pas une doublure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    initIdentity, getDeviceId, getActiveProfile, getActiveProfileId,
    listProfiles, namespaceFor, createProfile, renameProfile,
    deleteProfile, setActiveProfile, attachRemote
} from '../js/core/profile.js';
import { globalStore } from '../js/core/store.js';

test('UN POSTE NEUF REÇOIT UN PROFIL ET UN APPAREIL', async () => {
    const { profileId, deviceId, migrated } = await initIdentity();

    assert.ok(profileId, 'sans profil, le journal n\'a personne à qui attribuer le travail');
    assert.ok(deviceId, 'sans appareil, deux postes ne peuvent pas se dédoublonner');
    assert.equal(migrated, true, 'un poste neuf se signale comme tel : c\'est ce qui déclenche la reprise de l\'ancien stockage');

    assert.equal(getActiveProfileId(), profileId);
    assert.equal(getDeviceId(), deviceId);
    assert.equal(listProfiles().length, 1);
    assert.ok(getActiveProfile(), 'le profil actif doit désigner un profil qui existe');
});

test('UNE SECONDE OUVERTURE RETROUVE LE MÊME ÉLÈVE ET LE MÊME APPAREIL', async () => {
    // SI L'APPAREIL CHANGEAIT À CHAQUE OUVERTURE, la synchronisation croirait à
    // un nouveau poste chaque matin et le dédoublonnage ne servirait plus à
    // rien : le professeur verrait le travail d'un élève compté deux fois.
    const premier = await initIdentity();
    const second = await initIdentity();

    assert.equal(second.profileId, premier.profileId);
    assert.equal(second.deviceId, premier.deviceId, 'l\'appareil est une identité, pas un jeton de session');
    assert.equal(second.migrated, false, 'et l\'on ne reprend pas deux fois l\'ancien stockage');
});

test('L\'ESPACE DE RANGEMENT D\'UN PROFIL LUI EST PROPRE', async () => {
    // Deux élèves sur le même poste de classe. Un espace partagé mélangerait
    // leurs journaux — et c'est le genre d'erreur qu'on ne découvre qu'au
    // bulletin.
    await initIdentity();
    const a = await createProfile('Léa');
    const b = await createProfile('Tom');
    assert.notEqual(namespaceFor(a.id), namespaceFor(b.id));
    assert.match(namespaceFor(a.id), /atoutmath:/);
});

test('ON CHANGE D\'ÉLÈVE, ET SEULEMENT POUR UN ÉLÈVE QUI EXISTE', async () => {
    await initIdentity();
    const lea = await createProfile('Léa');

    assert.equal(await setActiveProfile(lea.id), true);
    assert.equal(getActiveProfileId(), lea.id);
    assert.equal(getActiveProfile().name, 'Léa');

    // UN IDENTIFIANT INCONNU EST REFUSÉ, et le profil actif ne bouge pas.
    // L'accepter laisserait le poste sans profil actif valide, et tout ce qui
    // lit `profile.id` derrière travaillerait sur `undefined` — sans jeter.
    assert.equal(await setActiveProfile('p_inexistant'), false);
    assert.equal(getActiveProfileId(), lea.id, 'un refus ne doit rien changer');
    assert.ok(getActiveProfile(), 'et le profil actif doit toujours désigner quelqu\'un');
});

test('ON NE SUPPRIME JAMAIS LE DERNIER PROFIL', async () => {
    // LA RÈGLE À NE PAS CASSER. `deleteProfile` efface aussi les DONNÉES du
    // profil : sans cette garde, un poste à un seul élève se vide d'un bouton,
    // et il n'y a plus personne pour se connecter.
    await initIdentity();
    for (const p of listProfiles().slice(1)) await deleteProfile(p.id);
    assert.equal(listProfiles().length, 1, 'il n\'en reste qu\'un pour cette épreuve');

    const seul = listProfiles()[0];
    assert.equal(await deleteProfile(seul.id), false, 'le dernier profil est intouchable');
    assert.equal(listProfiles().length, 1);
    assert.ok(getActiveProfile(), 'et le poste reste utilisable');
});

test('SUPPRIMER UN PROFIL ACTIF EN DÉSIGNE UN AUTRE', async () => {
    // Sinon le poste se retrouve avec un profil actif qui n'existe plus : la
    // pire des situations, parce que RIEN NE JETTE. Les événements continuent de
    // partir, simplement sans propriétaire.
    await initIdentity();
    const lea = await createProfile('Léa');
    await setActiveProfile(lea.id);
    assert.equal(getActiveProfileId(), lea.id);

    assert.equal(await deleteProfile(lea.id), true);
    assert.notEqual(getActiveProfileId(), lea.id);
    assert.ok(getActiveProfile(), 'un autre profil doit avoir pris la main');
    assert.equal(getActiveProfile().id, getActiveProfileId(),
        'et il doit vraiment s\'agir du profil que l\'identifiant désigne');
});

test('SUPPRIMER UN PROFIL INCONNU NE FAIT RIEN DU TOUT', async () => {
    await initIdentity();
    await createProfile('Léa');
    const avant = listProfiles().length;
    assert.equal(await deleteProfile('p_inexistant'), false);
    assert.equal(listProfiles().length, avant);
});

test('RENOMMER UN ÉLÈVE NE CHANGE PAS SON IDENTIFIANT', async () => {
    // Le nom est ce que l'élève lit ; l'identifiant est ce à quoi son travail
    // est attaché. Les confondre ferait perdre tout l'historique d'un élève le
    // jour où l'on corrige une faute dans son prénom.
    await initIdentity();
    const p = await createProfile('Lea');
    await renameProfile(p.id, 'Léa');
    const relu = listProfiles().find(x => x.id === p.id);
    assert.equal(relu.name, 'Léa');
    assert.equal(relu.id, p.id, 'un prénom corrigé ne doit pas détacher l\'historique');

    // Renommer un inconnu ne jette pas et ne crée rien.
    const avant = listProfiles().length;
    await renameProfile('p_inexistant', 'Personne');
    assert.equal(listProfiles().length, avant);
});

test('LA LISTE DES PROFILS EST UNE COPIE', async () => {
    // `listProfiles` rend `{ ...p }`. Un écran qui modifierait l'objet reçu
    // — pour y poser un champ d'affichage, par exemple — n'a pas à écrire dans
    // l'identité du poste, et surtout pas sans passer par l'enregistrement.
    await initIdentity();
    const liste = listProfiles();
    liste[0].name = 'MODIFIÉ PAR L\'ÉCRAN';
    assert.notEqual(listProfiles()[0].name, 'MODIFIÉ PAR L\'ÉCRAN');
});

test('LE RATTACHEMENT À UNE CLASSE S\'AJOUTE, IL NE REMPLACE PAS', async () => {
    // Il porte le jeton du serveur ET la date de dernière synchro. Un
    // rattachement qui écraserait l'objet entier perdrait le jeton à la
    // première mise à jour de la date — et l'élève se retrouverait déconnecté
    // de sa classe sans rien avoir fait.
    await initIdentity();
    const p = await createProfile('Léa');

    await attachRemote(p.id, { studentId: 42, classCode: 'ABC12', token: 'jeton-secret' });
    await attachRemote(p.id, { lastSyncAt: 1_700_000_000_000 });

    const relu = listProfiles().find(x => x.id === p.id);
    assert.equal(relu.remote.token, 'jeton-secret', 'le jeton doit survivre à la mise à jour de la date');
    assert.equal(relu.remote.studentId, 42);
    assert.equal(relu.remote.lastSyncAt, 1_700_000_000_000);

    // Rattacher un inconnu ne jette pas.
    await attachRemote('p_inexistant', { token: 'x' });
});

test('UN PROFIL NEUF N\'EST PAS ENCORE RATTACHÉ À UNE CLASSE', async () => {
    // « L'application est pleinement fonctionnelle hors ligne et sans compte »,
    // dit l'en-tête du module. Un `remote` pré-rempli ferait croire à la
    // synchro qu'il y a un serveur à joindre.
    await initIdentity();
    const p = await createProfile('Tom');
    assert.equal(p.remote, null);
    assert.ok(p.createdAt > 0, 'la date de création sert à ranger la liste des élèves');
});

test('L\'IDENTITÉ SURVIT AU RECHARGEMENT DE LA PAGE', async () => {
    // C'est ce que `globalStore` garantit, et c'est la raison d'être du module.
    // On relit le stockage directement : si l'identité ne s'y trouvait pas,
    // tout serait reperdu au prochain démarrage sans qu'aucune épreuve de
    // mémoire ne s'en aperçoive.
    const { profileId, deviceId } = await initIdentity();
    assert.equal(await globalStore.get('deviceId'), deviceId);
    assert.equal(await globalStore.get('activeProfileId'), profileId);
    const ranges = await globalStore.get('profiles');
    assert.ok(Array.isArray(ranges) && ranges.some(p => p.id === profileId),
        'le profil actif doit être rangé, pas seulement en mémoire');
});
