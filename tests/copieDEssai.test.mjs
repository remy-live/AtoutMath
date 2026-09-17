// LA COPIE D'ESSAI EN LIGNE, ET CE QUI L'EMPÊCHE DE CONTAMINER LE VRAI SITE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai pouvoir tester sur github, tant pis pour la zone admin
// juste dessus on peut la sauter, j'ai besoin de tester en ligne. »
//
// LE NŒUD. GitHub Pages sert des fichiers et rien d'autre : pas de PHP, donc
// pas d'API. Or `verrouActif()` ferme l'espace professeur dès que la page est
// servie en `http:`/`https:` — délibérément, parce qu'une API en panne ne doit
// pas ouvrir l'atelier à tout le monde. Sur Pages les deux se rencontrent, et
// l'atelier serait fermé : c'est-à-dire l'écran même qu'il veut essayer.
//
// LA DÉROGATION TIENT À UNE BALISE QUE LE DÉPÔT NE CONTIENT PAS. Seul le
// workflow de publication l'écrit, au moment de composer la copie. Ce fichier
// tient les deux bouts, et c'est le SECOND qui compte vraiment :
//
//   · avec la marque, le verrou se lève ;
//   · sans la marque, il reste. Une dérogation qu'on ne sait pas refermer
//     n'est pas une dérogation, c'est un trou.
//
// Les deux sens sont aussi éprouvés au navigateur, sur la copie réellement
// composée, servie en `http:` (tools/tmp/sondeCopieEssai.mjs) : avec la marque
// le clic sur le bouton de rôle ouvre le mode professeur et la fenêtre de choix
// montre ses 172 exercices ; sans la marque, le même clic demande un mot de
// passe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HTML = lire('index.html');
const VERROU = sansCommentaires(lire('js/core/verrouProf.js'));
const FLUX = lire('.github/workflows/essai-en-ligne.yml');

test('LE DÉPÔT NE PORTE PAS LA MARQUE — et c\'est toute la sûreté de l\'affaire', () => {
    // Si elle entrait ici, elle partirait avec le paquet chez l'hébergeur, et
    // l'espace professeur du site des élèves s'ouvrirait sans mot de passe.
    // Aucune autre épreuve ne le verrait : tout continuerait de « marcher ».
    assert.ok(!/atoutmath-copie-essai/.test(HTML),
        'index.html ne doit JAMAIS porter la balise de copie d\'essai');
    // Ni le workflow de déploiement, qui est l'autre chemin vers le vrai site.
    assert.ok(!/atoutmath-copie-essai/.test(lire('.github/workflows/deploiement.yml')));
});

test('SEUL LE WORKFLOW DE LA COPIE D\'ESSAI L\'ÉCRIT', () => {
    assert.match(FLUX, /sed -i '0,\/<meta charset="UTF-8">\/s\|\|<meta charset="UTF-8">/);
    assert.match(FLUX, /atoutmath-copie-essai/);
    // Et il vérifie son propre travail : une substitution muette qui ne trouve
    // pas sa cible publierait une copie verrouillée sans que rien ne le dise.
    assert.match(FLUX, /grep -q 'atoutmath-copie-essai' _site\/index\.html/);
});

test('LA MARQUE LÈVE LE VERROU, ET ELLE SEULE', async () => {
    const { copieDEssai } = await import('../js/core/copieDEssai.js?t=' + Math.random());
    const faussaire = (present) => ({
        querySelector: (sel) => (present && /atoutmath-copie-essai/.test(sel) ? {} : null)
    });
    assert.equal(copieDEssai(faussaire(true)), true);
    assert.equal(copieDEssai(faussaire(false)), false);
    // Un document absent ne doit pas lever le verrou par accident.
    assert.equal(copieDEssai(null), false);
});

test('LE VERROU CONSULTE LA MARQUE AVANT DE REGARDER LE PROTOCOLE', () => {
    // L'ordre compte : une copie d'essai EST en `https:`, comme un vrai site.
    // Tester le protocole d'abord reviendrait à ne jamais lire la marque.
    const f = VERROU.slice(VERROU.indexOf('export function verrouActif'),
        VERROU.indexOf('export function verrouActif') + 420);
    assert.ok(f.indexOf('copieDEssai()') < f.indexOf("=== 'http:'"),
        'la marque doit être consultée avant le protocole');
    assert.match(f, /if \(copieDEssai\(\)\) return false;/);
});

test('LA COPIE DIT CE QU\'ELLE EST', () => {
    // Elle ressemble en tout point au vrai site, et rien de ce qu'on y fait
    // n'existe ailleurs que dans ce navigateur-là. Quelqu'un qui y construirait
    // un parcours en croyant le déposer chez lui le perdrait sans le savoir.
    const APP = sansCommentaires(lire('js/app.js'));
    assert.match(APP, /if \(copieDEssai\(\)\) \{/);
    assert.match(APP, /Copie d\\'essai : aucun serveur, rien n\\'est enregistré ni envoyé\./);
    // Un avis, et non une barre fixe : on n'ampute pas l'écran pour une phrase.
    assert.match(APP, /showToast\(\s*\n?\s*'Copie d\\'essai/);
    // Et le numéro de version le redit, pour qui arrive après l'avis.
    assert.match(sansCommentaires(lire('js/ui/espaceClasses.js')), /copieDEssai\(\) \? ' · copie d\\'essai' : ''/);
});

test('UN AVIS N\'EST NI UNE RÉUSSITE NI UNE PANNE', () => {
    // Vert avec une coche veut dire « c'est fait ». Dire « rien n'est
    // enregistré » en vert avec une coche, c'est le faire lire comme une
    // réussite.
    const M = sansCommentaires(lire('js/ui/modal.js'));
    assert.match(M, /const isInfo = type === 'info';/);
    assert.match(M, /isError \? 'var\(--danger\)' : \(isInfo \? 'var\(--primary\)' : 'var\(--success\)'\)/);
    assert.match(M, /const icon = isError \? iconError : \(isInfo \? iconInfo : iconSuccess\);/);
});

test('LA COPIE NE PUBLIE NI LE SERVEUR NI LES OUTILS', () => {
    // Le dépôt est public, la source de l'API l'est donc déjà — mais il n'y a
    // aucune raison de la servir EN PLUS à une adresse web. Une copie sans
    // serveur n'a pas besoin du code du serveur.
    for (const exclu of ['api', 'deposer.php', 'tests', 'tools', 'node_modules', '.git']) {
        assert.ok(FLUX.includes(`--exclude='./${exclu}'`) || FLUX.includes(`--exclude='${exclu}'`),
            `${exclu} doit être exclu de la copie`);
    }
    // Et le workflow refuse de publier s'il en trouve un quand même.
    assert.match(FLUX, /for interdit in api deposer\.php tests tools node_modules; do/);
    assert.match(FLUX, /EST MONTÉ" && exit 1/);
});

test('LA COPIE D\'ESSAI NE PART PAS DE LA BRANCHE DU VRAI SITE', () => {
    // `deploiement.yml` reste le seul chemin vers le site des élèves, et il ne
    // part que de `refonte-architecture`. Les deux ne doivent pas se croiser.
    const DEPLOI = lire('.github/workflows/deploiement.yml');
    assert.match(DEPLOI, /refonte-architecture/);
    // On lit le DÉCLENCHEUR, pas les commentaires : l'en-tête du fichier parle
    // justement de `refonte-architecture` pour dire qu'il n'y touche pas.
    const declencheur = FLUX.slice(FLUX.indexOf('\non:'), FLUX.indexOf('permissions:'))
        .replace(/^\s*#.*$/gm, '');
    assert.ok(!/refonte-architecture/.test(declencheur),
        'la copie d\'essai ne doit pas se déclencher sur la branche du vrai site');
    assert.match(declencheur, /claude\/atoutmath-bugs-improvements-s6k0j4/);
});
