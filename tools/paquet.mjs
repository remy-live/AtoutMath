#!/usr/bin/env node
// LE PAQUET À TRANSFÉRER — un zip, et rien de plus.
//
// Rémy : « Pourras-tu me préparer un zip que je transfère directement ? »
//
// Oui. Le circuit GitHub → SFTP reste la bonne façon de vivre au long cours ;
// ce paquet-ci est pour le premier jour, et pour les jours où l'on veut poser
// le site à la main sans dépendre de rien.
//
// LA LISTE DES FICHIERS VIENT DE GIT, ET C'EST LA SÉCURITÉ DE TOUT LE RESTE.
// On n'énumère pas le dossier : on prend `git ls-files`, c'est-à-dire ce que le
// dépôt suit. Or `api/config.php` (la clé de chiffrement) et `api/data/` (la
// base, donc le travail des classes) sont dans `.gitignore` — ils ne PEUVENT
// donc pas se retrouver dans le paquet. Un balayage du disque, lui, les
// emporterait le jour où l'on prépare un paquet depuis une machine où le site
// tourne. Ce n'est pas une précaution théorique : c'est le fichier que l'on
// enverrait par courriel sans y penser.
//
// Puis on retire ce que `.deployignore` retire déjà de la publication : tests,
// outils de mesure, notes, dépendances de développement. Le serveur ne reçoit
// que ce qu'un navigateur télécharge — c'est du poids en moins, et surtout de
// la surface exposée en moins.
//
// LES FICHIERS SONT À LA RACINE DU ZIP, sans dossier qui les enveloppe. C'est
// délibéré : on ouvre l'archive, on sélectionne tout, on dépose dans `www/`.
// Un dossier enveloppant donnerait `www/AtoutMath/index.html`, et le site
// répondrait 404 sans qu'on comprenne pourquoi.
//
// USAGE
//   node tools/paquet.mjs                  → tools/tmp/atoutmath-vNNN.zip
//   node tools/paquet.mjs --sortie=/chemin/mon.zip

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const valeur = (nom) => {
    const p = args.find(a => a.startsWith(`--${nom}=`));
    return p ? p.slice(nom.length + 3) : '';
};

// --- Ce qu'on emporte

const suivis = execFileSync('git', ['ls-files', '-z'], { cwd: RACINE })
    .toString('utf8').split('\0').filter(Boolean);

// `.deployignore` liste des chemins et des dossiers, un par ligne, `#` en
// commentaire. On applique la même règle que le transfert SFTP, pour que le
// paquet et la publication automatique déposent EXACTEMENT la même chose : deux
// chemins qui divergent, c'est un jour où l'on corrige un bogue qui n'existe
// que sur l'un des deux.
const exclus = fs.readFileSync(path.join(RACINE, '.deployignore'), 'utf8')
    .split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

const garde = (f) => !exclus.some(e => f === e || f.startsWith(e + '/'));
const fichiers = suivis.filter(garde);

// --- Une dernière barrière, et elle est volontairement bête.
//
// Les deux règles ci-dessus suffisent. Celle-ci existe parce que le jour où
// l'une des deux se casse — un `.gitignore` mal repris, un `.deployignore`
// renommé — on ne s'en apercevrait qu'après avoir envoyé la clé de chiffrement
// à quelqu'un. Le prix d'un test redondant est nul ; le prix de son absence,
// non.
const interdits = fichiers.filter(f =>
    f === 'api/config.php' || f.startsWith('api/data/') ||
    /\.(sqlite|sqlite-wal|sqlite-shm|db|sql)$/.test(f));
if (interdits.length) {
    console.error("ARRÊT — ces fichiers ne doivent jamais quitter le serveur :\n  "
        + interdits.join('\n  '));
    process.exit(1);
}

// --- LE FICHIER ÉCRIT MAIS PAS ENCORE AJOUTÉ À GIT.
//
// Prendre la liste dans git est ce qui garantit qu'aucun secret ne part ; c'est
// aussi ce qui fait qu'un fichier tout neuf, écrit il y a dix minutes et pas
// encore ajouté, N'EST PAS DANS LE PAQUET. Le piège est parfait : on corrige,
// on fabrique le zip, on transfère, et le correctif n'y est pas. Mesuré en
// fabriquant ce paquet même — `api/lib/liste.php` manquait à l'appel.
//
// On ne devine pas à sa place : on le dit, et l'on refuse.
const oublies = execFileSync('git', ['ls-files', '-z', '--others', '--exclude-standard'],
    { cwd: RACINE }).toString('utf8').split('\0').filter(Boolean).filter(garde);
if (oublies.length && !args.includes('--tel-quel')) {
    console.error("ARRÊT — ces fichiers existent mais ne sont pas suivis par git,");
    console.error("        et ne seraient donc PAS dans le paquet :\n  "
        + oublies.join('\n  '));
    console.error("\n  Ajoutez-les (git add), ou passez --tel-quel pour les ignorer sciemment.");
    process.exit(1);
}

// --- Le numéro de version, lu là où il est écrit

const version = (fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8')
    .match(/\?v=(\d+)/) || [])[1] || 'x';

const sortie = path.resolve(valeur('sortie')
    || path.join(RACINE, 'tools', 'tmp', `atoutmath-v${version}.zip`));
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.rmSync(sortie, { force: true });

// `-X` : pas d'attributs propres à cette machine dans l'archive. `-@` : la
// liste des fichiers arrive par l'entrée standard, ce qui évite une ligne de
// commande de 783 noms — et les ennuis de guillemets qui vont avec.
execFileSync('zip', ['-q', '-X', '-9', sortie, '-@'], {
    cwd: RACINE,
    input: fichiers.join('\n'),
});

const taille = fs.statSync(sortie).size;
const ko = (taille / 1024).toFixed(0);

console.log('');
console.log(`  ${path.basename(sortie)}`);
console.log(`  ${fichiers.length} fichiers · ${ko} Ko · version ${version}`);
console.log(`  ${sortie}`);
console.log('');
console.log('  Ce qui est dedans : le site, l\'API, l\'administration, l\'installateur.');
console.log('  Ce qui n\'y est pas : la configuration, la base, les tests, les outils.');
console.log('');
console.log('  À FAIRE, DANS CET ORDRE :');
console.log('   1. décompresser, tout sélectionner, déposer dans www/ ;');
console.log('   2. ouvrir https://votre-site/api/install.php — TOUT DE SUITE ;');
console.log('   3. ouvrir https://votre-site/api/admin/sante.php.');
console.log('');
