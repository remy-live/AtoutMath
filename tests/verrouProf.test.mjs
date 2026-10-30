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
import { pourquoiPasEntre } from '../js/core/verrouProf.js';

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
    // ON LIT LE CORPS, PAS LES COMMENTAIRES. La fonction en porte désormais
    // beaucoup — elle a trois situations à distinguer au lieu de deux — et
    // compter les caractères bruts revenait à mesurer la longueur d'une
    // explication.
    const sansCommentaires = verrou.replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    const i = sansCommentaires.indexOf('export function verrouActif');
    const bloc = sansCommentaires.slice(i, i + 400);
    assert.doesNotMatch(bloc, /serveurPresent|fetch/,
        'la décision ne doit pas dépendre de la joignabilité du serveur');
    assert.match(bloc, /window\.location\.protocol/,
        'elle se prend sur le protocole de la page');
    // LA SEULE DÉROGATION ADMISE est la copie d'essai publiée sans serveur,
    // et elle tient à une balise que le dépôt ne contient pas — voir
    // `tests/copieDEssai.test.mjs`, qui refuse qu'elle y entre.
    assert.match(bloc, /if \(copieDEssai\(\)\) return false;/);
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

// ─────────────────── CE QUE VEUT DIRE UN REFUS, EN FRANÇAIS ─────────────────
//
// Rémy, capture d'un collègue à qui il faisait essayer le site :
// « Connexion impossible (code 405). » — « qqn a voulu se connecter… »
//
// LE MESSAGE DOIT DIRE À QUI LE LIT CE QU'IL DOIT FAIRE. Un numéro ne dit
// rien ; pire, « Connexion impossible » juste sous un champ de mot de passe se
// lit comme « mot de passe refusé », et l'on recommence dix fois un geste qui
// ne pouvait pas marcher.
//
// 405 NE VENAIT PAS DU MOT DE PASSE. L'adresse de l'API se déduit de celle de
// la page ; sur un hébergement de fichiers statiques il n'y a pas de PHP pour
// répondre, et le POST tombe sur un hébergeur qui n'accepte que la lecture. Le
// mot de passe n'avait été vérifié par personne — ce que le message doit dire,
// autant pour rassurer que pour orienter vers la bonne adresse.

test('405 ET 404 DISENT QU\'IL N\'Y A PAS DE SERVEUR, pas que le mot de passe est faux', () => {
    // C'est le cas que Rémy a vu, et le seul où la réponse est « changez
    // d'adresse » plutôt que « retapez votre mot de passe ».
    for (const code of [404, 405, 501]) {
        const dit = pourquoiPasEntre(code);
        assert.match(dit, /n'a pas de serveur/, `code ${code}`);
        assert.match(dit, /adresse en ligne/, `code ${code} : où aller`);
        assert.ok(!/mot de passe incorrect/.test(dit), `code ${code} : n'accuse pas le mot de passe`);
    }
});

test('ON DIT QUE LE MOT DE PASSE N\'EST PARTI NULLE PART', () => {
    // Quelqu'un qui vient de taper son mot de passe dans un site qui répond
    // une erreur se demande légitimement où il vient de l'envoyer.
    assert.match(pourquoiPasEntre(405), /envoyé nulle part/);
});

test('un vrai refus reste un vrai refus', () => {
    assert.equal(pourquoiPasEntre(401), 'Adresse ou mot de passe incorrect.');
    assert.match(pourquoiPasEntre(403), /pas le droit/);
    assert.match(pourquoiPasEntre(429), /Trop d'essais/);
});

test('une panne du serveur se distingue d\'une absence de serveur', () => {
    // « réessayez dans un instant » est un conseil juste pour un 500 et faux
    // pour un 405 : là, réessayer ne marchera jamais.
    assert.match(pourquoiPasEntre(500), /Réessayez/);
    assert.match(pourquoiPasEntre(503), /Réessayez/);
    assert.ok(!/Réessayez/.test(pourquoiPasEntre(405)));
});

test('UN CODE QU\'ON NE SAIT PAS NOMMER GARDE SON NUMÉRO', () => {
    // C'est précisément celui-là qu'il faut pouvoir citer : le cacher derrière
    // « une erreur est survenue » priverait du seul indice.
    assert.match(pourquoiPasEntre(418), /\(code 418\)/);
});

test('LA FENÊTRE PRÉVIENT AVANT QU\'ON TAPE SON MOT DE PASSE', () => {
    // Laisser essayer, se tromper, recommencer, puis lire un numéro, c'est
    // trois fois faire échouer quelqu'un pour une chose qu'on savait d'avance.
    assert.match(fenetre, /serveurPresent\(\)/,
        'la fenêtre doit demander si le serveur est là');
    assert.match(fenetre, /verrou-sous--alerte/,
        'et le dire à la place de la consigne');
    // MAIS ELLE N'EMPÊCHE PAS D'ESSAYER : `serveurPresent` rend aussi faux
    // quand le réseau hésite, et verrouiller le bouton enfermerait dehors un
    // professeur parfaitement légitime.
    assert.ok(!/verrou-ok'\)\.disabled = true;\s*\}\)/.test(fenetre),
        'le bouton ne doit pas se verrouiller sur cet avertissement');
});
