// REPORTER DANS LE CODE UN TRI FAIT DANS LE NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il y en a à supprimer, mets un clic oui ou non et je te l'envoie. »
//
// Il trie deux cents phrases dans la revue, le bouton « ⤓ En fichier » les sort,
// et c'est moi qui les retire du code — parce que le catalogue EST du code : une
// case cochée dans un navigateur ne réécrit pas `js/data/blagues.js`.
//
// ── POURQUOI UN OUTIL, ET PAS UNE PASSE À LA MAIN ──────────────────────────
//
// Soixante-quatorze lignes à retirer parmi deux cent une, dans un fichier où
// elles sont séparées par des commentaires de section. À la main, c'est une
// heure, et l'erreur ne se verrait pas : retirer la 74ᵉ au lieu de la 75ᵉ donne
// un fichier qui compile, des épreuves vertes, et une blague disparue que
// personne ne cherchera jamais. Il y a quatre genres, et Rémy n'a trié que les
// deux premiers : l'outil resservira.
//
// ── CE QUI LE REND SÛR ─────────────────────────────────────────────────────
//
// LE FICHIER DE VERDICTS PORTE LE NUMÉRO **ET** LE DÉBUT DU TEXTE. C'est écrit
// pour ça (`ui/quotidienTri.js`) : « un numéro seul serait illisible pour un
// humain et faux dès que la liste bouge ». L'outil exige donc que les DEUX
// concordent, ligne par ligne, et il REFUSE TOUT au premier désaccord — il ne
// retire pas « ce qu'il a pu ». Un report à moitié fait sur une liste qu'on ne
// relira pas est pire que pas de report.
//
// Il vérifie aussi que le total annoncé par le fichier (« sur 201 ») est bien
// celui de la liste d'aujourd'hui : si j'ai touché au catalogue entre le tri de
// Rémy et son envoi, tous les numéros ont glissé et rien n'est applicable.
//
//     node tools/appliquerLesVerdicts.mjs <fichier.txt> [...]   # dit ce qu'il ferait
//     node tools/appliquerLesVerdicts.mjs <fichier.txt> --ecrire
//
// Sans `--ecrire`, il ne touche à rien : on lit d'abord, on écrit ensuite.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Chaque genre, son fichier et la constante qu'il exporte. */
const GENRES = {
    conseil: { fichier: 'js/data/conseils.js', nom: 'CONSEILS', titre: 'Conseils' },
    blague: { fichier: 'js/data/blagues.js', nom: 'BLAGUES', titre: 'Blagues' },
    citation: { fichier: 'js/data/citations.js', nom: 'CITATIONS', titre: 'Citations' },
    enigme: { fichier: 'js/data/enigmes.js', nom: 'ENIGMES', titre: 'Énigmes' }
};

const ROUGE = (s) => `\x1b[31m${s}\x1b[0m`;
const VERT = (s) => `\x1b[32m${s}\x1b[0m`;
const GRIS = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * LIRE UN FICHIER DE VERDICTS.
 *
 * Sa forme est celle de `verdictsEnTexte` : un titre, puis deux tas, chaque
 * ligne étant « <numéro>. <début du texte> » — tronqué à 88 caractères suivis
 * d'une ellipse quand il est plus long. C'est cette troncature qui oblige à
 * comparer par PRÉFIXE et non par égalité.
 */
function lireLesVerdicts(chemin) {
    const texte = fs.readFileSync(chemin, 'utf8');
    const tete = texte.match(/^(.+?) — (\d+) relues? sur (\d+)/m);
    if (!tete) throw new Error(`${chemin} : je ne reconnais pas l'en-tête d'un fichier de verdicts.`);

    const genre = Object.keys(GENRES).find(g => GENRES[g].titre === tete[1].trim());
    if (!genre) throw new Error(`${chemin} : genre inconnu « ${tete[1]} ».`);

    const tas = (nom) => {
        const i = texte.indexOf(`${nom} (`);
        if (i < 0) return [];
        const fin = texte.indexOf('\n\n', i);
        return (fin < 0 ? texte.slice(i) : texte.slice(i, fin))
            .split('\n').slice(1)
            .map(l => l.match(/^(\d+)\.\s+(.*)$/))
            .filter(Boolean)
            .map(m => ({ rang: Number(m[1]) - 1, debut: m[2].replace(/…$/, '') }));
    };

    return { genre, relues: Number(tete[2]), total: Number(tete[3]),
        jeter: tas('À SUPPRIMER'), garder: tas('À GARDER') };
}

/**
 * LES LIGNES DU FICHIER SOURCE QUI PORTENT LES ENTRÉES, DANS L'ORDRE.
 *
 * On ne réécrit pas le fichier à partir des données : on en RETIRE des lignes.
 * Regénérer le tableau perdrait les commentaires de section — « Vocabulaire et
 * généralités », « Fractions » — qui sont ce qui permet au professeur de
 * retrouver celles du chapitre qu'il commence.
 */
function lignesDesEntrees(source, nom) {
    const lignes = source.split('\n');
    const debut = lignes.findIndex(l => l.includes(`export const ${nom} = [`));
    if (debut < 0) throw new Error(`je ne trouve pas « export const ${nom} = [ ».`);
    const entrees = [];
    for (let i = debut + 1; i < lignes.length; i++) {
        const net = lignes[i].trim();
        if (net === '];') break;
        if (net.startsWith('//') || net === '') continue;
        if (net.startsWith('{') || net.startsWith("'")) entrees.push(i);
    }
    return { lignes, entrees };
}

/** Le texte d'une entrée, qu'elle soit une chaîne nue ou un objet. */
const texteDe = (e) => (typeof e === 'string' ? e : (e && e.texte) || '');

async function appliquer(chemin, ecrire) {
    const v = lireLesVerdicts(chemin);
    const def = GENRES[v.genre];
    const mod = await import(new URL(`../${def.fichier}`, import.meta.url));
    const liste = mod[def.nom];

    console.log(`\n${def.titre} — ${path.basename(chemin)}`);
    console.log('─'.repeat(74));

    if (!v.jeter.length) {
        console.log(GRIS(`  rien à retirer (${v.relues} relues sur ${v.total}).`));
        return { genre: v.genre, retires: 0, relues: v.relues, total: v.total };
    }

    // 1. LE TOTAL D'ABORD. Si la liste a bougé depuis le tri, tous les numéros
    //    ont glissé et aucune vérification plus fine n'a de sens.
    if (liste.length !== v.total) {
        throw new Error(`${def.titre} : le tri porte sur ${v.total} entrées, le code en a ${liste.length}.\n`
            + '  La liste a bougé entre le tri et l\'envoi : les numéros ne désignent plus rien.');
    }

    // 2. CHAQUE LIGNE, NUMÉRO **ET** TEXTE. On rassemble TOUS les désaccords
    //    avant de renoncer : un seul message qui en nomme douze vaut mieux que
    //    douze essais qui en nomment un.
    const faux = [];
    v.jeter.forEach(({ rang, debut }) => {
        const vrai = texteDe(liste[rang]);
        if (!vrai) { faux.push(`n° ${rang + 1} : il n'y a pas d'entrée à ce rang`); return; }
        if (!vrai.startsWith(debut)) {
            faux.push(`n° ${rang + 1} :\n      le tri dit  « ${debut.slice(0, 60)}… »\n`
                + `      le code a   « ${vrai.slice(0, 60)}… »`);
        }
    });
    if (faux.length) {
        throw new Error(`${def.titre} : ${faux.length} ligne(s) ne concordent pas. Rien n'est retiré.\n    `
            + faux.join('\n    '));
    }

    // 3. L'ÉCRITURE. On retire les lignes de la FIN vers le DÉBUT : retirer la
    //    ligne 4 décale toutes les suivantes, et l'indice 12 ne désignerait
    //    plus la même.
    const source = fs.readFileSync(path.join(RACINE, def.fichier), 'utf8');
    const { lignes, entrees } = lignesDesEntrees(source, def.nom);
    if (entrees.length !== liste.length) {
        throw new Error(`${def.titre} : je compte ${entrees.length} lignes d'entrée pour `
            + `${liste.length} entrées importées. Je ne sais pas laquelle retirer : rien n'est touché.`);
    }

    const aRetirer = [...v.jeter].sort((a, b) => b.rang - a.rang);
    const copie = [...lignes];
    aRetirer.forEach(({ rang }) => { copie.splice(entrees[rang], 1); });

    v.jeter.slice().sort((a, b) => a.rang - b.rang).forEach(({ rang }) =>
        console.log(`  ${ROUGE('✕')} ${String(rang + 1).padStart(3)}. ${texteDe(liste[rang]).slice(0, 62)}…`));
    v.garder.forEach(({ rang }) =>
        console.log(`  ${VERT('✓')} ${String(rang + 1).padStart(3)}. ${texteDe(liste[rang]).slice(0, 62)}…`));

    console.log('─'.repeat(74));
    console.log(`  ${v.jeter.length} à retirer, ${v.garder.length} gardées explicitement, `
        + `${v.total - v.relues} jamais relues (donc gardées).`);
    console.log(`  ${def.titre} : ${liste.length} → ${VERT(String(liste.length - v.jeter.length))}`);

    if (ecrire) {
        fs.writeFileSync(path.join(RACINE, def.fichier), copie.join('\n'));
        console.log(`  ${VERT('écrit')} dans ${def.fichier}.`);
    } else {
        console.log(GRIS('  (essai — rien n\'est écrit. Ajouter --ecrire.)'));
    }
    return { genre: v.genre, retires: v.jeter.length, relues: v.relues, total: v.total };
}

const args = process.argv.slice(2);
const ecrire = args.includes('--ecrire');
const fichiers = args.filter(a => !a.startsWith('--'));
if (!fichiers.length) {
    console.error('node tools/appliquerLesVerdicts.mjs <fichier.txt> [...] [--ecrire]');
    process.exit(2);
}

let mal = 0;
for (const f of fichiers) {
    try { await appliquer(f, ecrire); }
    catch (e) { mal++; console.log(`\n${ROUGE('✕')} ${e.message}`); }
}
console.log('');
process.exit(mal ? 1 : 0);
