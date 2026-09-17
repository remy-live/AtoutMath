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
    const ailleurs = { hostname: 'atoutmath.fr' };
    assert.equal(copieDEssai(faussaire(true), ailleurs), true);
    assert.equal(copieDEssai(faussaire(false), ailleurs), false);
    // Ni document ni adresse : on ne lève rien par accident.
    assert.equal(copieDEssai(null, null), false);
});

test('L\'ADRESSE EST LE SECOND SIGNE, ET IL NE PEUT PAS ÊTRE PÉRIMÉ', async () => {
    // RÉMY, sur la copie publiée : « bah non.... je ne peux pas » — capture à
    // l'appui, la fenêtre de mot de passe s'ouvrait. Or le journal de
    // publication prouve que la balise EST dans le fichier publié : le workflow
    // refuse de publier sans elle. Son navigateur lui servait donc un
    // `index.html` plus ancien.
    //
    // LA LEÇON : faire dépendre une bascule d'UNE ligne injectée dans UN
    // fichier, c'est la faire dépendre du fichier le plus susceptible d'être
    // périmé. L'adresse, elle, ne vient d'aucun fichier.
    const { copieDEssai } = await import('../js/core/copieDEssai.js?t=' + Math.random());
    const nu = { querySelector: () => null };
    for (const hote of ['remy-live.github.io', 'github.io', 'REMY-LIVE.GITHUB.IO']) {
        assert.equal(copieDEssai(nu, { hostname: hote }), true, hote);
    }
    // ET ELLE NE PEUT PAS ATTEINDRE LE VRAI SITE. Un domaine qui CONTIENT
    // « github.io » sans en être un sous-domaine ne doit rien ouvrir : c'est
    // exactement la forme qu'aurait un domaine fabriqué pour tromper.
    for (const hote of ['atoutmath.fr', 'github.io.pirate.fr', 'monsitegithub.io', '']) {
        assert.equal(copieDEssai(nu, { hostname: hote }), false, hote);
    }
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

// ─────────────── L'ÉLÈVE D'ESSAI, SUR LA COPIE SANS SERVEUR ─────────────────
//
// RÉMY : « je n'ai rien de générique id password, mode élève/prof pour github,
// le but étant de tester ».
//
// CE QUI MANQUAIT, ET C'ÉTAIT LA MOITIÉ DU LOGICIEL. J'avais ouvert la porte du
// professeur et laissé celle de l'élève fermée. Les deux portes de l'écran
// d'accueil — « Je me connecte » et « J'ai un code de séance » — demandent
// toutes deux le serveur : sur une copie sans API, aucune ne s'ouvre.
//
// ON N'INVENTE PAS D'IDENTIFIANT GÉNÉRIQUE. Un couple « eleve / 0000 » écrit
// quelque part serait un identifiant de plus à taper, à retenir, et surtout à
// retrouver un jour dans le vrai site. On entre d'un clic : il n'y a rien à
// vérifier, puisqu'il n'y a personne pour vérifier.
//
// MESURÉ APRÈS, sur la copie réellement composée, ordinateur et téléphone :
// l'accueil laisse la place, l'élève est rattaché, la synchronisation ne part
// PAS (aucune requête échouée, aucune erreur de page), et un clic sur la
// pastille de rôle fait l'aller-retour élève → professeur → élève.

test('LA PORTE DE L\'ÉLÈVE D\'ESSAI N\'EXISTE QUE SUR LA COPIE D\'ESSAI', () => {
    const src = lire('js/ui/portailUI.js');
    assert.match(src, /\$\{copieDEssai\(\) \? '<button id="portail-eleve-essai"/);
    // Elle ne doit pas exister ailleurs : sur le vrai site, entrer comme élève
    // se fait avec un billet, et c'est le serveur qui le vérifie.
    assert.ok(!/portail-eleve-essai/.test(lire('index.html')));
});

test('L\'ÉLÈVE D\'ESSAI N\'EST RATTACHÉ QU\'À LUI-MÊME', () => {
    const src = sansCommentaires(lire('js/core/copieDEssai.js'));
    assert.match(src, /export async function entrerCommeEleveDEssai\(prenom = 'Camille'\)/);
    // Un jeton qui ne ressemble à aucun vrai jeton : il ferme la porte
    // d'entrée, il n'ouvre rien nulle part.
    assert.match(src, /token: 'essai-local'/);
    assert.match(src, /essai: true/);
    // Et la synchronisation ne peut pas partir : `isActive` exige EN PLUS une
    // adresse d'API configurée, qu'une copie d'essai n'a pas.
    assert.match(sansCommentaires(lire('js/core/sync.js')),
        /config\.enabled && config\.apiUrl && profile && profile\.remote && profile\.remote\.token/);
});

test('SUR UNE COPIE D\'ESSAI, L\'ÉLÈVE A DE QUOI TRAVAILLER', () => {
    // Mesuré avant : l'élève d'essai arrivait sur « Pas de séance pour
    // l'instant — ton professeur ne t'a rien donné ». Et pour cause : donner
    // une séance passe par le serveur. Le côté élève était atteignable et vide.
    const src = sansCommentaires(lire('js/core/portail.js'));
    assert.match(src, /if \(copieDEssai\(\)\) return true;\s*\n\s*return MODE_LIBRE;/);
    // Les deux autorités du dessus continuent de primer — c'est un REPLI, pas
    // une dérogation : la dérogation locale et le serveur passent avant.
    const f = src.slice(src.indexOf('export function modeLibre'));
    assert.ok(f.indexOf('reglageSite(\'modeLibre\')') < f.indexOf('copieDEssai()'),
        'le serveur doit rester prioritaire sur le repli de la copie d\'essai');
});

test('LA PASTILLE DE RÔLE GARDE SON MOT SUR LA COPIE D\'ESSAI', () => {
    // Sur téléphone, elle tombe à un simple point de couleur — qui ne dit pas
    // dans quel rôle on est : il faut le savoir d'avance pour le lire. Or
    // passer d'un rôle à l'autre est justement ce qu'on vient faire ici.
    assert.match(sansCommentaires(lire('js/app.js')),
        /document\.body\.classList\.add\('copie-essai'\);/);
    assert.match(lire('css/layout.css'),
        /body\.copie-essai \.role-badge span:not\(\.role-badge-point\) \{ display: inline; \}/);
});

test('SUR LA COPIE D\'ESSAI, « IDENTIFIEZ-VOUS » EST UN CONSEIL IMPOSSIBLE', () => {
    // Mesuré sur la copie publiée : le professeur y entre d'un clic, sans mot
    // de passe, et tombait sur « Vos classes sont sur le serveur. Identifiez-
    // vous pour les voir ici » — alors qu'il n'y a pas de serveur et qu'il est
    // déjà professeur. Un message qui se trompe fait perdre plus de temps qu'un
    // message absent, et celui-ci envoyait chercher une porte inexistante.
    const src = sansCommentaires(lire('js/ui/classesServeur.js'));
    assert.match(src, /if \(copieDEssai\(\)\) \{/);
    assert.match(src, /Copie d'essai : il n'y a pas de serveur/);
    // Et il dit ce qu'on PEUT faire, plutôt que ce qu'on ne peut pas.
    assert.match(src, /cinq classes de démonstration/);
    // La garde passe AVANT le choix du message d'erreur, sinon elle ne sert à rien.
    const f = src.slice(src.indexOf('export function bandeauServeurHtml'));
    assert.ok(f.indexOf('copieDEssai()') < f.indexOf("'pas-identifie'"));
});
