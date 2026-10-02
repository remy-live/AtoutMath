#!/usr/bin/env node
// L'ACCENT GRAVE QUI COUPE UN GABARIT — Y COMPRIS SANS CASSER LA SYNTAXE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE PIÈGE EST CONNU DEPUIS LE 26 SEPTEMBRE, et `tools/hooks/verifierSyntaxe.sh`
// en ferme la moitié : un accent grave dans un commentaire CSS ou HTML, à
// l'intérieur d'un gabarit, FERME le gabarit, et `node --check` refuse alors le
// fichier en désignant une ligne sans rapport.
//
// LA NEUVIÈME OCCURRENCE A ÉCHAPPÉ AU HOOK, parce que les accents graves
// allaient par DEUX dans le même commentaire :
//
//     <!-- C'est ce que veut dire l'exercice <accent>*<accent>. -->
//
// Le premier ferme le gabarit, le second en rouvre un, et ce qui est entre les
// deux devient du CODE — ici, deux chaînes multipliées l'une par l'autre. La
// syntaxe TIENT. `node --check` se tait, le hook se tait, et l'écran affiche
// « NaN » à la place de la fiche de l'élève.
//
// C'EST LA PIRE DES NEUF. Les huit premières coûtaient un quart d'heure à
// chercher au mauvais endroit ; celle-ci ne dit rien du tout. Elle est partie
// jusqu'au navigateur, et il a fallu une sonde, six mesures et un vidage
// d'`innerHTML` pour voir les trois lettres « NaN » posées là où la fiche
// devait être.
//
// ── CE QU'ON NE POUVAIT PAS FAIRE, ET CE QU'ON FAIT À LA PLACE ──────────────
//
// PREMIÈRE VERSION, JETÉE : elle signalait tout accent grave dans un
// commentaire HTML ou CSS. Mille vingt-quatre alertes sur le dépôt — chaque
// `/** … `machin` … */` de documentation en est un, et aucun n'est dangereux
// puisqu'il n'est pas dans un gabarit. Une alarme qui sonne mille fois n'est
// pas lue : c'est la leçon qu'`apercusVides.mjs` avait déjà payée.
//
// ON NE PEUT PAS NON PLUS DEMANDER « CE COMMENTAIRE EST-IL DANS UN GABARIT ? »,
// parce que l'accent grave est précisément ce qui décide où le gabarit finit :
// la question se mord la queue.
//
// ON RETOURNE DONC LA QUESTION. On lit chaque gabarit, et l'on regarde son
// TEXTE : s'il ouvre un commentaire (`<!--`) sans le refermer, ou s'il en
// referme un qu'il n'a pas ouvert, c'est qu'un accent grave a coupé le
// commentaire en deux. Le défaut se dénonce tout seul, et sans aucune des mille
// fausses alertes.
//
//   node tools/accentGrave.mjs                 (tout js/ et tools/)
//   node tools/accentGrave.mjs <fichier…>
//
// Rend 1 dès qu'il trouve un gabarit coupé.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;

function tousLesFichiers(dossier, trouves = []) {
    for (const nom of readdirSync(dossier)) {
        // `tmp` est le bac à sable des scripts jetables, `node_modules` n'est
        // pas à nous.
        if (nom === 'node_modules' || nom === 'tmp' || nom.startsWith('.')) continue;
        const chemin = join(dossier, nom);
        if (statSync(chemin).isDirectory()) tousLesFichiers(chemin, trouves);
        else if (/\.(js|mjs|cjs)$/.test(nom)) trouves.push(chemin);
    }
    return trouves;
}

/** Après ces signes, un `/` ouvre une expression régulière, pas une division. */
const AVANT_UNE_REGEX = '(,=:[!&|?{};+-*%~^<>\n';

/**
 * LES TEXTES DE TOUS LES GABARITS D'UN FICHIER.
 *
 * On ne garde que ce qui est VRAIMENT du texte de gabarit : les morceaux
 * `${ … }` sont du code et repartent dans l'analyseur. Un gabarit imbriqué dans
 * un `${}` est lu comme un gabarit à part entière, ce qu'il est.
 *
 * L'analyseur suit les chaînes, les commentaires et les expressions régulières,
 * parce que chacun peut contenir un accent grave qui n'en est pas un.
 */
function textesDeGabarits(source) {
    const sortie = [];
    // Une pile : chaque gabarit ouvert attend son texte, et un `${}` empile du
    // code par-dessus.
    const pile = [];
    let i = 0;
    let dernierSignificatif = '\n';

    const enGabarit = () => pile.length && pile[pile.length - 1].genre === 'gabarit';

    while (i < source.length) {
        const c = source[i];
        const d = source[i + 1];

        if (enGabarit()) {
            const haut = pile[pile.length - 1];
            if (c === '\\') { haut.texte += source.slice(i, i + 2); i += 2; continue; }
            if (c === '`') {
                haut.fin = i;
                sortie.push(haut);
                pile.pop();
                i++; dernierSignificatif = '`';
                continue;
            }
            if (c === '$' && d === '{') {
                pile.push({ genre: 'code' });
                i += 2; dernierSignificatif = '{';
                continue;
            }
            haut.texte += c;
            i++;
            continue;
        }

        // ── Du code ─────────────────────────────────────────────────────────
        if (c === '/' && d === '/') {
            const fin = source.indexOf('\n', i);
            i = fin < 0 ? source.length : fin;
            continue;
        }
        if (c === '/' && d === '*') {
            const fin = source.indexOf('*/', i + 2);
            i = fin < 0 ? source.length : fin + 2;
            continue;
        }
        if (c === '\'' || c === '"') {
            i++;
            while (i < source.length && source[i] !== c) {
                if (source[i] === '\\') i++;
                i++;
            }
            i++; dernierSignificatif = c;
            continue;
        }
        if (c === '/' && AVANT_UNE_REGEX.includes(dernierSignificatif)) {
            i++;
            let crochet = false;
            while (i < source.length) {
                const r = source[i];
                if (r === '\\') { i += 2; continue; }
                if (r === '[') crochet = true;
                else if (r === ']') crochet = false;
                else if (r === '/' && !crochet) break;
                else if (r === '\n') break;   // ce n'était pas une regex
                i++;
            }
            i++; dernierSignificatif = '/';
            continue;
        }
        if (c === '`') {
            pile.push({ genre: 'gabarit', texte: '', debut: i });
            i++;
            continue;
        }
        if (c === '}' && pile.length && pile[pile.length - 1].genre === 'code') {
            pile.pop();
            i++; dernierSignificatif = '}';
            continue;
        }
        if (!/\s/.test(c)) dernierSignificatif = c;
        else if (c === '\n') dernierSignificatif = '\n';
        i++;
    }
    return sortie;
}

/**
 * UN GABARIT QUI OUVRE UN COMMENTAIRE SANS LE FERMER — ou l'inverse.
 *
 * C'est la signature exacte du défaut : le commentaire commence dans un
 * gabarit et finit dans un autre, parce qu'un accent grave est passé entre les
 * deux.
 */
function commentaireCoupe(texte) {
    const ouverts = (texte.match(/<!--/g) || []).length;
    const fermes = (texte.match(/-->/g) || []).length;
    if (ouverts === fermes) return null;
    return ouverts > fermes
        ? 'ouvre un commentaire HTML qu\'il ne referme pas'
        : 'referme un commentaire HTML qu\'il n\'a pas ouvert';
}

const demandes = process.argv.slice(2).filter(a => !a.startsWith('--'));
const fichiers = demandes.length
    ? demandes
    : [...tousLesFichiers(join(RACINE, 'js')), ...tousLesFichiers(join(RACINE, 'tools'))];

let total = 0;
for (const f of fichiers) {
    let source;
    try { source = readFileSync(f, 'utf8'); } catch (e) { continue; }
    for (const g of textesDeGabarits(source)) {
        const quoi = commentaireCoupe(g.texte);
        if (!quoi) continue;
        total++;
        const ligne = source.slice(0, g.debut).split('\n').length;
        console.log(`${relative(RACINE, f)}:${ligne}  ce gabarit ${quoi}.`);
        // LA LIGNE EXACTE DU COMMENTAIRE, parce que le gabarit peut faire
        // quatre-vingts lignes et que c'est le commentaire qu'il faut relire.
        const marque = g.texte.lastIndexOf('<!--') >= 0 ? '<!--' : '-->';
        const avant = g.texte.lastIndexOf(marque);
        const ligneDuMarqueur = ligne + g.texte.slice(0, avant).split('\n').length - 1;
        console.log(`    le commentaire commence ligne ${ligneDuMarqueur} environ.`);
        console.log('    UN ACCENT GRAVE L\'A COUPÉ. Écrire le mot, pas le signe.');
    }
}

console.log('');
if (total) {
    console.log(`${total} gabarit(s) coupés par un accent grave.`);
    console.log('Deux accents graves dans le même commentaire gardent la SYNTAXE :');
    console.log('node --check se tait, et l\'écran affiche NaN.');
    process.exit(1);
}
console.log('Aucun gabarit coupé par un accent grave.');
