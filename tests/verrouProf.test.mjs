// LE VERROU DU PROFESSEUR — il doit tenir, et il doit se dire.
//
// Rémy, une fois le site en ligne : « l'accès prof n'est pas protégé, je ne
// sais pas où m'identifier ».
//
// CE QUI SE VÉRIFIE ICI EST CE QUI SE CASSE EN SILENCE. Un verrou n'annonce
// jamais sa propre disparition : le jour où quelqu'un remet un `basculerRole`
// direct, tout continue de marcher — mieux, même, puisque plus rien ne demande
// de mot de passe. On ne s'en apercevrait qu'en voyant un élève dans le
// constructeur de parcours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const verrou = fs.readFileSync(new URL('../js/core/verrouProf.js', import.meta.url), 'utf8');
const fenetre = fs.readFileSync(new URL('../js/ui/verrouProfUI.js', import.meta.url), 'utf8');

test('LA BASCULE VERS LE PROFESSEUR PASSE PAR LE VERROU', () => {
    // On lit la garde telle qu'elle est écrite : trois conditions, dans cet
    // ordre — on va vers le mode professeur, le verrou s'applique, et l'on
    // n'est pas déjà identifié.
    assert.match(app, /if \(!state\.isTeacherMode && verrouActif\(\) && !jetonProf\(\)\)/,
        'la bascule doit être gardée');
    assert.match(app, /demanderProf/, 'et la garde doit ouvrir la fenêtre');
});

test('LE RETOUR À L\'ESPACE ÉLÈVE RESTE LIBRE', () => {
    // Se restreindre soi-même n'a jamais demandé d'autorisation — et un
    // professeur bloqué en mode professeur devant sa classe serait une panne.
    const i = app.indexOf('const basculerRole');
    const bloc = app.slice(i, i + 900);
    assert.match(bloc, /!state\.isTeacherMode &&/,
        'la garde ne doit s\'appliquer que dans un sens');
});

test('LE MOT DE PASSE N\'EST JAMAIS COMPARÉ DANS LA PAGE', () => {
    // Un secret vérifié en JavaScript est un secret publié : le code de la
    // page se lit. La vérification appartient au serveur, et à lui seul.
    assert.match(verrou, /\/teacher\/login/, 'la vérification se demande au serveur');
    assert.doesNotMatch(verrou, /motDePasse\s*===|password\s*===/,
        'aucune comparaison de mot de passe côté page');
});

test('UNE API EN PANNE N\'OUVRE PAS L\'ESPACE PROFESSEUR', () => {
    // Le piège serait de décider « pas de serveur, donc pas de verrou » : une
    // API momentanément tombée ouvrirait alors tout grand, exactement au
    // mauvais moment. `verrouActif` ne regarde que le protocole de la page.
    const i = verrou.indexOf('export function verrouActif');
    const bloc = verrou.slice(i, i + 400);
    assert.doesNotMatch(bloc, /serveurPresent|fetch/,
        'la décision ne doit pas dépendre de la joignabilité du serveur');
    assert.match(bloc, /window\.location\.protocol/,
        'elle se prend sur le protocole de la page');
});

test('LA FENÊTRE DIT OÙ SONT LES CLASSES ET LES LISTES', () => {
    // « je ne sais pas où m'identifier » : la moitié de la demande était de
    // fermer la porte, l'autre de dire où est la clef.
    assert.match(fenetre, /api\/admin\/index\.php/, 'le lien vers l\'administration doit y être');
    assert.match(fenetre, /installation/i, 'et le rappel que c\'est le même compte');
});

test('UN NAVIGATEUR SANS STOCKAGE NE FAIT PAS TOMBER LE VERROU', () => {
    // En navigation privée, `localStorage` lève au lieu de rendre null. Un
    // `jetonProf()` qui explose ferait planter la bascule, donc la porte
    // d'entrée, donc l'application entière.
    const i = verrou.indexOf('export function jetonProf');
    const bloc = verrou.slice(i, i + 300);
    assert.match(bloc, /try\s*\{/, 'la lecture doit être protégée');
    assert.match(bloc, /catch/, 'et rendre null plutôt que lever');
});
