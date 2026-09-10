#!/usr/bin/env node
// LE CONTRÔLE DU SITE EN LIGNE, VU DE DEHORS.
//
// Rémy : « et on peut automatiser cela ? »
//
// « Cela », c'était le dernier geste manuel qui restait après une publication :
// ouvrir `api/admin/sante.php` et regarder si tout est vert. Ce fichier fait ce
// regard-là tout seul, et il le fait DE L'EXTÉRIEUR — depuis GitHub, ou depuis
// n'importe quelle machine — ce qui est un point important et pas un détail de
// confort.
//
// POURQUOI DE DEHORS PLUTÔT QUE DE DEDANS. `sante.php` tourne SUR l'hébergement
// et demande au serveur d'aller chercher ses propres fichiers. Beaucoup
// d'hébergements interdisent cela : la page répond alors « je n'ai pas pu
// vérifier », honnêtement, mais sans rien prouver. Ici, on est vraiment le
// visiteur inconnu — celui contre qui on se protège. Ce qu'on voit, il le voit ;
// ce qu'on ne voit pas, il ne le voit pas non plus.
//
// LA VÉRIFICATION QUI COMPTE LE PLUS EST LA n° 8, et elle mérite d'être
// expliquée. On demande un fichier de base QUI N'EXISTE PAS, sous `api/data/`.
//
//   · si l'hébergeur applique nos `.htaccess`, la règle `RedirectMatch 403` de
//     `api/.htaccess` répond 403 AVANT même de regarder si le fichier existe ;
//   · s'il ne les applique pas, il cherche le fichier, ne le trouve pas, et
//     répond 404.
//
// Un 404 ressemble à une bonne nouvelle et n'en est pas une : il dit que la
// protection ne fonctionne pas, et donc que le VRAI fichier de base — dont le
// nom est tiré au hasard, mais qui existe, lui — serait servi à qui le
// demanderait. C'est le seul moyen que je connaisse de tester la serrure sans
// avoir à publier la clé.
//
// MESURÉ, PAS SUPPOSÉ — les deux moitiés, contre deux vrais serveurs.
//
//   · Apache 2.4 avec `AllowOverride All`, servant ce dépôt :
//       GET /api/data/sonde-de-controle.sqlite  → 403   (fichier absent)
//       GET /api/data/atoutmath-c68a…17.sqlite  → 403   (la VRAIE base)
//       GET /api/config.php, /api/lib/db.php    → 403
//     Le contrôle verdit. Correct.
//
//   · Le serveur intégré de PHP, qui n'applique aucun `.htaccess` — c'est-à-dire
//     l'hébergement qui fuit, celui qu'on n'a pas sous la main :
//       GET /api/data/sonde-de-controle.sqlite  → 404
//       GET /api/data/atoutmath-c68a…17.sqlite  → 200, « SQLite format 3 »
//     Le contrôle rougit sur la sonde SEULE, sans jamais avoir eu à connaître le
//     nom du vrai fichier. C'est la preuve que le raisonnement tient.
//
//   · Apache sans PHP (module absent) : le contrôle a d'abord annoncé « pas
//     encore installé » — parce que le code source d'`install.php`, servi tel
//     quel, contient le mot « installation ». Réponse plausible et fausse.
//     Corrigé : « PHP ne s'exécute pas » passe maintenant avant tout le reste.
//
//   · Deux sites posés à la main, l'un installé et l'autre non, l'archive
//     laissée à la racine du premier :
//       site non installé → « deposer.php accepte une archive SANS CONNEXION »
//                           et « /atoutmath-v668.zip se télécharge » ;
//       site installé     → « deposer.php exige la connexion du professeur »
//                           et « pas d'archive à la racine ».
//     Les deux constats neufs disent donc vrai dans les deux sens.
//
// USAGE
//   node tools/controleEnLigne.mjs https://mon-site.fr
//   node tools/controleEnLigne.mjs https://mon-site.fr --json
//   node tools/controleEnLigne.mjs https://mon-site.fr --version=665
//   node tools/controleEnLigne.mjs https://mon-site.fr --strict   (l'orange échoue aussi)
//
// SORTIE : 0 si rien de rouge, 1 s'il y a du rouge, 2 si le site est injoignable.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Six secondes : au-delà, un hébergement mutualisé qui rame n'est pas une
// panne, mais on n'attendra pas une minute par vérification pour autant.
const DELAI = 8000;

// On lit le début du corps, jamais tout. Reconnaître « SQLite format 3 » ou
// « <?php » demande quelques octets ; rapatrier une base entière dans un
// journal de compilation serait absurde, et dangereux.
const OCTETS = 4096;

// --------------------------------------------------------------- Arguments --

const args = process.argv.slice(2);
const drapeau = (nom) => args.includes('--' + nom);
const valeur = (nom) => {
    const p = args.find(a => a.startsWith(`--${nom}=`));
    return p ? p.slice(nom.length + 3) : '';
};
const base = (args.find(a => !a.startsWith('--')) || '').replace(/\/+$/, '');

if (!base) {
    console.error('Usage : node tools/controleEnLigne.mjs https://mon-site.fr [--json] [--strict] [--version=665]');
    process.exit(2);
}

const enJson = drapeau('json');
const strict = drapeau('strict');

// ------------------------------------------------------------- Mécanique ----

/**
 * Aller voir une adresse comme le ferait un inconnu.
 *
 * `redirect: 'manual'` est délibéré : une redirection EST une information. Un
 * `/api/config.php` qui redirige vers la page d'accueil n'est pas refusé, il est
 * détourné — et le jour où la redirection saute, le secret part.
 */
async function voir(chemin, { methode = 'GET' } = {}) {
    const url = base + chemin;
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI);
    try {
        const r = await fetch(url, {
            method: methode,
            redirect: 'manual',
            signal: ctrl.signal,
            headers: {
                'user-agent': 'AtoutMath/controle-en-ligne',
                // Un hébergement peut servir une version en cache ; on demande
                // la fraîche, sinon on contrôlerait le site d'avant-hier.
                'cache-control': 'no-cache',
                pragma: 'no-cache',
            },
        });
        let corps = '';
        try {
            const buf = await r.arrayBuffer();
            corps = Buffer.from(buf.slice(0, OCTETS)).toString('latin1');
        } catch { /* corps illisible : le code de réponse suffira */ }
        return {
            url,
            code: r.status,
            vers: r.headers.get('location') || '',
            type: r.headers.get('content-type') || '',
            entetes: r.headers,
            corps,
            erreur: '',
        };
    } catch (e) {
        return { url, code: 0, vers: '', type: '', entetes: null, corps: '',
                 erreur: e.name === 'AbortError' ? 'délai dépassé' : String(e.message || e) };
    } finally {
        clearTimeout(minuteur);
    }
}

const constats = [];
/** ok = vert · ! = orange · x = rouge · ? = indéterminé (jamais vert par défaut) */
function dire(etat, quoi, dit, faire = '') {
    constats.push({ etat, quoi, dit, faire });
}

/** Un refus franc : les seuls codes qui prouvent qu'une porte est fermée. */
const REFUS = [401, 403, 404];

// -------------------------------------------------------- Les vérifications --

async function controler() {
    // 1 — LE SITE RÉPOND-IL ? Tout le reste en dépend : inutile de conclure
    //     « les fichiers sont bien refusés » quand c'est le serveur entier qui
    //     est éteint et refuse tout.
    const accueil = await voir('/');
    if (accueil.code === 0) {
        dire('x', 'Le site répond-il ?', `non — ${accueil.erreur}`,
             "Vérifiez l'adresse, et que le transfert a bien eu lieu.");
        return true; // rien d'autre n'a de sens
    }
    if (accueil.code >= 300 && accueil.code < 400) {
        dire('!', 'Le site répond-il ?',
             `il redirige (${accueil.code}) vers ${accueil.vers}`,
             "Relancez le contrôle sur cette adresse-là : c'est la vraie.");
    } else if (accueil.code !== 200) {
        dire('x', 'Le site répond-il ?', `code ${accueil.code}`,
             'Le dossier de publication est peut-être le mauvais (variable HEBERGEUR_DOSSIER).');
        return true;
    } else if (!/AtoutMath/i.test(accueil.corps)) {
        dire('x', 'Le site répond-il ?',
             "une page s'affiche, mais ce n'est pas AtoutMath",
             "C'est probablement la page d'accueil par défaut de l'hébergeur : "
             + 'le transfert est allé dans un autre dossier.');
        return true;
    } else {
        dire('ok', 'Le site répond-il ?', 'oui, et c\'est bien AtoutMath');
    }

    // 2 — QUELLE VERSION EST EN LIGNE ? La question que se pose vraiment celui
    //     qui vient de pousser un correctif : « est-il arrivé ? ». On lit le
    //     numéro de cache de la page servie, et on le compare à celui du dépôt.
    const enLigne = (accueil.corps.match(/\?v=(\d+)/) || [])[1] || '';
    const attendue = valeur('version') || versionLocale();
    if (!enLigne) {
        dire('?', 'Quelle version est en ligne ?', 'illisible dans la page servie');
    } else if (attendue && enLigne === attendue) {
        dire('ok', 'Quelle version est en ligne ?', `v${enLigne} — c'est bien la dernière`);
    } else if (attendue) {
        dire('!', 'Quelle version est en ligne ?',
             `v${enLigne} en ligne, v${attendue} attendue`,
             "Soit la publication n'est pas encore arrivée, soit l'hébergeur sert "
             + 'une copie en cache. Attendez une minute et recommencez.');
    } else {
        dire('ok', 'Quelle version est en ligne ?', `v${enLigne}`);
    }

    // 3 — HTTPS. Sans lui, le code de l'élève traverse le réseau du collège en
    //     clair, et le mot de passe du professeur avec.
    if (base.startsWith('https://')) {
        dire('ok', 'Le site est-il en HTTPS ?', 'oui');
    } else {
        const chiffre = await fetch(base.replace(/^http:/, 'https:'),
            { redirect: 'manual', signal: AbortSignal.timeout(DELAI) })
            .then(x => x.status, () => 0);
        dire(chiffre ? '!' : 'x', 'Le site est-il en HTTPS ?',
             chiffre ? "l'adresse contrôlée est en http, mais https répond"
                     : 'non — et https ne répond pas',
             chiffre ? "Forcez la redirection vers https (case à cocher chez l'hébergeur)."
                     : "Activez le certificat gratuit dans l'espace client, puis forcez https. "
                       + "Sans cela, le code de l'élève voyage en clair.");
    }

    // 4 — L'API EST-ELLE VIVANTE ? `/api/health` ne rend qu'un `{"ok":true}` :
    //     c'est peu, et c'est exactement ce qu'il faut. Pour le rendre, il a
    //     fallu que la réécriture d'URL marche, que PHP s'exécute, et que
    //     `config.php` soit lisible. Trois preuves en un mot.
    const sante = await voir('/api/health');
    const installateur = await voir('/api/install.php');
    const phpNu = /<\?php/.test(sante.corps) || /<\?php/.test(installateur.corps);
    const pasEncoreInstalle = !phpNu
        && installateur.code === 200
        && /install/i.test(installateur.corps)
        && !/déjà eu lieu|deja eu lieu/i.test(installateur.corps);

    if (sante.code === 200 && /"ok"\s*:\s*true/.test(sante.corps)) {
        dire('ok', "L'API répond-elle ?", 'oui — PHP s\'exécute et la base est configurée');
    } else if (phpNu) {
        // CE DIAGNOSTIC PASSE AVANT TOUS LES AUTRES, et l'ordre m'a été enseigné
        // par un essai raté : contre un Apache sans PHP, le contrôle annonçait
        // « l'installation n'a pas été faite » — parce que le code source de
        // `install.php`, servi tel quel, contient bel et bien le mot
        // « installation ». Réponse plausible, et fausse. Quand PHP ne
        // s'exécute pas, PLUS AUCUNE page ne dit ce qu'elle a l'air de dire :
        // il faut le constater d'abord, et se taire sur le reste.
        dire('x', "L'API répond-elle ?", "non — PHP NE S'EXÉCUTE PAS, le code est servi en clair",
             "L'hébergement ne traite pas le PHP. Rien ne fonctionnera, et tout est "
             + "lisible. C'est la première chose à régler : prévenez l'hébergeur.");
    } else if (pasEncoreInstalle) {
        // CE N'EST PAS UNE PANNE, C'EST UNE COURSE. Tant que l'installation
        // n'est pas faite, l'installateur est ouvert à qui trouve l'adresse —
        // et le premier qui la trouve devient le professeur.
        dire('x', "L'API répond-elle ?", "non — L'INSTALLATION N'A PAS ENCORE ÉTÉ FAITE",
             `Ouvrez <b>${base}/api/install.php</b> MAINTENANT. Tant que ce n'est pas fait, `
             + "n'importe qui qui trouve l'adresse peut s'installer professeur à votre place.");
    } else if (sante.code === 404) {
        dire('x', "L'API répond-elle ?", 'non — code 404',
             "La réécriture d'URL ne s'applique pas (mod_rewrite, ou AllowOverride). "
             + "Le dossier api/ est peut-être absent du transfert.");
    } else {
        dire('x', "L'API répond-elle ?",
             `non — code ${sante.code || sante.erreur}`,
             `Ouvrez ${base}/api/admin/sante.php : cette page-là voit de l'intérieur.`);
    }

    // 5 — L'ADMINISTRATION S'AFFICHE-T-ELLE ? Elle est hors du routeur : elle
    //     prouve que PHP s'exécute AUSSI dans `api/admin/`, ce qui n'est pas la
    //     même question que la précédente.
    const admin = await voir('/api/admin/index.php');
    if (admin.code === 200 && /<\?php/.test(admin.corps)) {
        dire('x', "L'administration s'affiche-t-elle ?",
             'non — son code source est servi en clair',
             "PHP ne s'exécute pas dans api/admin/.");
    } else if (admin.code === 200) {
        dire('ok', "L'administration s'affiche-t-elle ?", 'oui');
    } else if (admin.code >= 300 && admin.code < 400) {
        dire('ok', "L'administration s'affiche-t-elle ?", `elle redirige (${admin.code}) — connexion demandée`);
    } else {
        dire('!', "L'administration s'affiche-t-elle ?", `code ${admin.code || admin.erreur}`);
    }

    // 5 bis — LA PORTE DE SERVICE EST-ELLE REFERMÉE ?
    //
    // `deposer.php` écrit des fichiers PHP sur le site : c'est exactement ce
    // qu'un intrus cherche. Il ne doit rien proposer à un visiteur anonyme dès
    // lors que le site est installé. La vérification est simple et sans appel :
    // on regarde, sans cookie, s'il montre son formulaire d'envoi.
    const depot = await voir('/deposer.php');
    if (depot.code === 404) {
        dire('ok', 'La porte de service est-elle refermée ?',
             "deposer.php n'est pas sur le serveur");
    } else if (/<\?php/.test(depot.corps)) {
        dire('x', 'La porte de service est-elle refermée ?',
             'NON — le code de deposer.php est servi en clair');
    } else if (/Connectez-vous d'abord/.test(depot.corps)) {
        dire('ok', 'La porte de service est-elle refermée ?',
             'oui — deposer.php exige la connexion du professeur');
    } else if (/Envoyer l'archive|type="file"/.test(depot.corps)) {
        dire('x', 'La porte de service est-elle refermée ?',
             "NON — deposer.php accepte une archive SANS CONNEXION",
             "Cela veut dire que <code>api/config.php</code> est absent : le site n'est "
             + "pas installé, et n'importe qui peut y déposer des fichiers. "
             + "Installez immédiatement, ou effacez <code>deposer.php</code>.");
    } else {
        dire('?', 'La porte de service est-elle refermée ?',
             `deposer.php répond ${depot.code || depot.erreur}`);
    }

    // 5 ter — RESTE-T-IL UNE ARCHIVE À LA RACINE ?
    //
    // Après un dépôt à la main, le `.zip` reste souvent dans `www/`. Le code
    // n'est pas un secret — le dépôt est public — mais c'est cinq mégaoctets
    // offerts à qui les demande, et surtout le signe que le ménage n'a pas été
    // fait. Le transfert automatique, lui, n'efface rien : il resterait là des
    // mois. On le cherche par son nom, celui que fabrique tools/paquet.mjs.
    const nomsProbables = [
        attendue ? `/atoutmath-v${attendue}.zip` : '',
        enLigne ? `/atoutmath-v${enLigne}.zip` : '',
    ].filter((v, i, t) => v && t.indexOf(v) === i);
    let archive = '';
    for (const nom of nomsProbables) {
        const r = await voir(nom, { methode: 'HEAD' });
        if (r.code === 200) { archive = nom; break; }
    }
    if (archive) {
        dire('!', 'Reste-t-il une archive à la racine ?',
             `oui — ${archive} se télécharge`,
             'Effacez-la : le transfert automatique ne fait pas le ménage, elle resterait '
             + 'là indéfiniment.');
    } else {
        dire('ok', 'Reste-t-il une archive à la racine ?', 'non');
    }

    // 5 quater — LE DÉPÔT LUI-MÊME EST-IL EN LIGNE ?
    //
    // Rémy : « j'ai connecté mon ovh avec git ». Un déploiement git pose le
    // DÉPÔT, pas le site : 794 fichiers au lieu de 543, et selon la façon dont
    // l'hébergeur s'y prend, `.git/` avec. L'historique complet devient alors
    // téléchargeable — sur un dépôt privé, c'est la fuite intégrale du code.
    // Des robots demandent `/.git/config` à longueur de journée, exactement
    // pour trouver ça : c'est donc la première chose à vérifier.
    const gitCfg = await voir('/.git/config');
    const devFichier = await voir('/package.json');
    const servi = (r) => r.code === 200 && r.corps.length > 0;
    if (servi(gitCfg)) {
        dire('x', 'Le dépôt git est-il exposé ?',
             'OUI — /.git/config se télécharge, donc tout l\'historique du code',
             "Le fichier <code>.htaccess</code> de la racine doit être en place. S'il y est "
             + "et que cela ne change rien, l'hébergeur n'applique pas les .htaccess : "
             + 'demandez <code>AllowOverride All</code>, ou déployez hors du dossier web.');
    } else if (servi(devFichier)) {
        dire('!', 'Le dépôt git est-il exposé ?',
             "non, mais les fichiers de développement le sont (package.json se lit)",
             'Le .htaccess de la racine est absent ou partiellement appliqué.');
    } else {
        dire('ok', 'Le dépôt git est-il exposé ?',
             `non — .git répond ${gitCfg.code}, les fichiers de travail aussi`);
    }

    // 5 quinquies — LES ICÔNES DE L'APPLICATION SE CHARGENT-ELLES ?
    //
    // MESURÉ, ET CE FUT UNE SURPRISE : la configuration par défaut d'Apache sur
    // Debian et Ubuntu contient `Alias /icons/ "/usr/share/apache2/icons/"`.
    // Tout `/icons/…` est donc détourné vers les icônes d'Apache, et AUCUN
    // `.htaccess` ne peut le rattraper — l'alias agit avant que le nôtre ne
    // soit seulement lu. Nos icônes répondaient 404, donc pas d'installation
    // sur l'écran d'accueil, pas de vignette. Le dossier s'appelle `icones/`
    // depuis, et ce contrôle est là pour que la panne ne revienne pas en
    // silence par un autre chemin.
    const icone = await voir('/icones/icon-192.png', { methode: 'HEAD' });
    if (icone.code === 200) {
        dire('ok', "L'application s'installe-t-elle ?", 'oui — son icône se charge');
    } else {
        dire('!', "L'application s'installe-t-elle ?",
             `l'icône répond ${icone.code || icone.erreur}`,
             "Sans elle, pas de vignette sur l'écran d'accueil de la tablette.");
    }

    // 6 — LA CONFIGURATION EST-ELLE LISIBLE ? Elle porte le secret de signature
    //     ET la clé de chiffrement de la base. C'est le fichier le plus grave.
    const cfg = await voir('/api/config.php');
    if (REFUS.includes(cfg.code)) {
        dire('ok', 'La configuration est-elle lisible ?', `non — le serveur répond ${cfg.code}`);
    } else if (/<\?php/.test(cfg.corps) || /app_secret/.test(cfg.corps)) {
        dire('x', 'La configuration est-elle lisible ?',
             'OUI — LE SECRET ET LA CLÉ DE CHIFFREMENT SONT EXPOSÉS',
             'Changez-les immédiatement (effacez config.php et réinstallez), et prévenez '
             + "l'hébergeur : PHP ne s'exécute pas.");
    } else {
        // NUANCE, ET ELLE EST UTILE. Un 200 vide n'est pas une fuite : PHP a
        // exécuté le fichier, qui rend un tableau sans rien afficher. Mais le
        // `.htaccess` ne le refuse pas — donc le jour où PHP s'arrête, le
        // secret part. Orange, ni vert ni rouge.
        dire('!', 'La configuration est-elle lisible ?',
             `atteignable (code ${cfg.code}) mais elle ne rend rien — PHP l'exécute`,
             "Ce n'est pas une fuite aujourd'hui, mais le .htaccess ne la refuse pas. "
             + 'Demandez AllowOverride All à l\'hébergeur.');
    }

    // 7 — LES FICHIERS INTERNES. Aucun secret dedans, mais donner la carte de
    //     la maison n'apporte rien, et un `<?php` visible ici est le signal
    //     avancé du désastre du point 6.
    const lib = await voir('/api/lib/db.php');
    if (REFUS.includes(lib.code)) {
        dire('ok', 'Les fichiers internes sont-ils servis ?', `non — code ${lib.code}`);
    } else if (/<\?php/.test(lib.corps)) {
        dire('x', 'Les fichiers internes sont-ils servis ?',
             'oui, et leur code source est lisible',
             "PHP ne s'exécute pas partout. Traitez le point sur la configuration en priorité.");
    } else {
        dire('!', 'Les fichiers internes sont-ils servis ?', `code ${lib.code} — ni refus, ni contenu`);
    }

    // 8 — LA SERRURE DU DOSSIER DES DONNÉES. Voir l'explication en tête de
    //     fichier : on demande un fichier absent, et c'est le 403 qu'on veut.
    const sonde = await voir('/api/data/sonde-de-controle.sqlite');
    if (sonde.code === 403) {
        dire('ok', 'Le dossier des données est-il verrouillé ?',
             'oui — le serveur refuse (403) avant même de chercher le fichier');
    } else if (sonde.code === 404) {
        dire('x', 'Le dossier des données est-il verrouillé ?',
             'NON — le serveur répond 404, donc il a CHERCHÉ le fichier',
             "Le .htaccess n'est pas appliqué : le vrai fichier de base, lui, existe, et "
             + "serait servi à qui demanderait son nom. Le contenu reste chiffré, mais "
             + 'cela ne doit pas rester ainsi. Demandez AllowOverride All, ou rangez la '
             + 'base hors de la racine web (db_file dans config.php).');
    } else if (sonde.code === 401) {
        dire('ok', 'Le dossier des données est-il verrouillé ?', `oui — code ${sonde.code}`);
    } else {
        dire('?', 'Le dossier des données est-il verrouillé ?',
             `code ${sonde.code || sonde.erreur} — ni 403 ni 404`,
             `Ouvrez ${base}/api/data/sonde-de-controle.sqlite pour voir ce qui est servi.`);
    }

    // 9 — LES PAGES D'INCLUSION DE L'ADMINISTRATION (`_socle.php`). Elles
    //     commencent par un tiret bas, et le .htaccess les refuse à ce titre :
    //     c'est cette règle-là qu'on essaie ici.
    const socle = await voir('/api/admin/_socle.php');
    if (REFUS.includes(socle.code)) {
        dire('ok', "Le socle de l'administration est-il refusé ?", `oui — code ${socle.code}`);
    } else if (/<\?php/.test(socle.corps)) {
        dire('x', "Le socle de l'administration est-il refusé ?", 'non — son code est lisible');
    } else {
        dire('!', "Le socle de l'administration est-il refusé ?", `code ${socle.code}`);
    }

    // 10 — LE MODE HORS LIGNE. Un élève qui perd le réseau au fond de la salle
    //      continue à travailler grâce à ce fichier ; s'il manque, la panne est
    //      invisible tant qu'il y a du réseau — donc invisible jusqu'au jour où
    //      elle compte.
    const sw = await voir('/sw.js');
    if (sw.code === 200 && /atoutmath-v/.test(sw.corps)) {
        dire('ok', 'Le mode hors ligne est-il en place ?', 'oui');
    } else {
        dire('!', 'Le mode hors ligne est-il en place ?',
             `sw.js répond ${sw.code || sw.erreur}`,
             "L'application marchera, mais plus sans réseau.");
    }

    return false;
}

/** Le numéro de cache du dépôt, quand on tourne depuis une copie de travail. */
function versionLocale() {
    try {
        const html = readFileSync(join(RACINE, 'index.html'), 'utf8');
        return (html.match(/\?v=(\d+)/) || [])[1] || '';
    } catch {
        return '';
    }
}

// ------------------------------------------------------------- Le rapport ----

const COULEUR = { ok: '\x1b[32m', '!': '\x1b[33m', x: '\x1b[31m', '?': '\x1b[36m' };
const SIGNE = { ok: '✓', '!': '!', x: '✗', '?': '?' };

function rapporter() {
    const rouges = constats.filter(c => c.etat === 'x').length;
    const oranges = constats.filter(c => c.etat === '!').length;
    const gris = constats.filter(c => c.etat === '?').length;

    if (enJson) {
        console.log(JSON.stringify({ site: base, constats, rouges, oranges, gris }, null, 2));
        return rouges;
    }

    const teinte = process.stdout.isTTY;
    const t = (etat, s) => (teinte ? COULEUR[etat] + s + '\x1b[0m' : s);
    // Le HTML des conseils vient de la même plume que celle de sante.php ; en
    // terminal on l'enlève plutôt que de l'afficher tel quel.
    const net = (s) => s.replace(/<[^>]+>/g, '');

    console.log('');
    console.log(`  Contrôle de ${base}`);
    console.log('  ' + '─'.repeat(Math.min(70, base.length + 13)));
    for (const c of constats) {
        console.log(`  ${t(c.etat, SIGNE[c.etat])} ${c.quoi}`);
        console.log(`      ${net(c.dit)}`);
        if (c.faire) {
            for (const ligne of decouper(net(c.faire), 76)) console.log(`      → ${ligne}`);
        }
    }
    console.log('');
    if (rouges) {
        console.log(t('x', `  ${rouges} problème${rouges > 1 ? 's' : ''} à corriger.`));
    } else if (oranges || gris) {
        console.log(t('!', `  Rien de grave. ${oranges} point${oranges > 1 ? 's' : ''} à surveiller.`));
    } else {
        console.log(t('ok', '  Tout est en ordre.'));
    }
    console.log('');
    return rouges;
}

function decouper(texte, largeur) {
    const lignes = [];
    let ligne = '';
    for (const mot of texte.split(/\s+/)) {
        if ((ligne + ' ' + mot).trim().length > largeur) { lignes.push(ligne.trim()); ligne = mot; }
        else ligne += ' ' + mot;
    }
    if (ligne.trim()) lignes.push(ligne.trim());
    return lignes;
}

// ------------------------------------------------------------------ Départ ----

const injoignable = await controler();
const rouges = rapporter();
const oranges = constats.filter(c => c.etat === '!').length;

if (injoignable) process.exit(2);
process.exit(rouges > 0 || (strict && oranges > 0) ? 1 : 0);
