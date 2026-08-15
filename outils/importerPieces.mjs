// IMPORTER UN JEU DE PIÈCES D'ÉCHECS depuis des fichiers SVG.
//
// À QUOI ÇA SERT. Les dessins de pièces livrés avec l'application sont faits
// maison, à la main, en formes simples. Il existe sur Wikimedia Commons des
// jeux bien meilleurs — le jeu « Cburnett », celui qu'on voit partout, est en
// courbes et se reconnaît d'un coup d'œil. Ce script les installe sans qu'on
// ait à recopier quoi que ce soit.
//
//   node outils/importerPieces.mjs icons/pieces
//
// Il attend douze fichiers, nommés comme sur Commons :
//   Chess_klt45.svg  roi blanc        Chess_kdt45.svg  roi noir
//   Chess_qlt45.svg  dame blanche     Chess_qdt45.svg  dame noire
//   Chess_rlt45.svg  tour blanche     Chess_rdt45.svg  tour noire
//   Chess_blt45.svg  fou blanc        Chess_bdt45.svg  fou noir
//   Chess_nlt45.svg  cavalier blanc   Chess_ndt45.svg  cavalier noir
//   Chess_plt45.svg  pion blanc       Chess_pdt45.svg  pion noir
// (les noms sans le préfixe « Chess_ » sont acceptés aussi)
//
// Il écrit js/ui/piecesImportees.js, que ui/piecesEchecs.js préfère aux
// dessins maison dès qu'il existe. L'écran ET le PDF s'en servent : le lecteur
// de chemins (ui/cheminSvg.js) sait redessiner un « path » dans un document
// jsPDF, ce que jsPDF ne sait pas faire seul.
//
// LA LICENCE N'EST PAS UN DÉTAIL. Le jeu Cburnett est sous CC BY-SA 3.0 et
// GFDL : il faut CITER L'AUTEUR partout où les pièces s'affichent, et le
// script refuse d'écrire sans qu'on lui donne une mention. On la passe en
// second argument, ou on laisse celle qui convient au jeu Cburnett.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { boiteChemin } from '../js/ui/cheminSvg.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dossier = args[0];
const mention = args[1]
    || 'Pièces : jeu de Cburnett, Wikimedia Commons, CC BY-SA 3.0';
// Où écrire — les tests s'en servent pour ne pas toucher au fichier livré.
const cible = (process.argv.find(a => a.startsWith('--sortie=')) || '').slice(9)
    || 'js/ui/piecesImportees.js';

if (!dossier || !existsSync(dossier)) {
    console.error('Usage : node outils/importerPieces.mjs <dossier-des-svg> ["mention de licence"]\n'
        + 'Le dossier doit contenir les douze fichiers (Chess_klt45.svg, Chess_kdt45.svg, …).');
    process.exit(2);
}

const TYPES = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
const fichiers = readdirSync(dossier).filter(f => f.toLowerCase().endsWith('.svg'));

/** Retrouve le type et la couleur d'après le nom du fichier. */
function identifier(nom) {
    const m = /(?:chess_)?([kqrbnp])([ld])t?\d*\.svg$/i.exec(nom);
    if (!m) return null;
    return { type: TYPES[m[1].toLowerCase()], noir: m[2].toLowerCase() === 'd' };
}

/** Les chemins d'un SVG, avec leur remplissage et leur contour. */
function lirePieces(source) {
    const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(source);
    const boite = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 45, 45];
    const formes = [];
    // On ne lit que les <path> : les jeux de Commons n'utilisent que cela, et
    // deviner le reste (groupes, transformations) donnerait des dessins faux
    // sans qu'on s'en aperçoive. Un fichier qui en contient est SIGNALÉ.
    const autres = (source.match(/<(circle|rect|ellipse|polygon|polyline|line)\b/gi) || []).length;
    const re = /<path\b([^>]*?)\/?>/gis;
    let m;
    while ((m = re.exec(source))) {
        const attrs = m[1];
        const d = (/\bd\s*=\s*"([^"]*)"/i.exec(attrs) || [])[1];
        if (!d) continue;
        const style = (/\bstyle\s*=\s*"([^"]*)"/i.exec(attrs) || [])[1] || '';
        const prop = (nom) => {
            const dans = new RegExp(`(?:^|;)\\s*${nom}\\s*:\\s*([^;]+)`, 'i').exec(style);
            if (dans) return dans[1].trim();
            const attr = new RegExp(`\\b${nom}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs);
            return attr ? attr[1].trim() : null;
        };
        formes.push({
            d: d.replace(/\s+/g, ' ').trim(),
            fill: prop('fill'),
            stroke: prop('stroke'),
            largeur: Number(prop('stroke-width')) || null,
            // Un chemin peut n'être qu'un trait (la crinière du cavalier) :
            // le remplir le transformerait en tache.
            remplit: (prop('fill') || '').toLowerCase() !== 'none'
        });
    }
    return { boite, formes, autres };
}

const jeu = {};
let total = 0, ignores = [];
for (const f of fichiers) {
    const id = identifier(f);
    if (!id) { ignores.push(f); continue; }
    const { boite, formes, autres } = lirePieces(readFileSync(join(dossier, f), 'utf8'));
    if (!formes.length) { ignores.push(`${f} (aucun chemin)`); continue; }
    if (autres) {
        console.warn(`⚠ ${f} contient ${autres} forme(s) autre(s) que des chemins : `
            + 'elles ne seront PAS dessinées. Vérifie le rendu.');
    }
    jeu[`${id.type}${id.noir ? 'n' : 'b'}`] = { boite, formes };
    total++;
}

// LE CADRE COMMUN À TOUTE LA SÉRIE. Chaque fichier laisse du vide autour de sa
// pièce ; recaler chacune sur SA boîte les rendrait toutes de la même hauteur,
// et un pion deviendrait aussi grand qu'un roi. On mesure donc la boîte qui
// contient les douze, et tout le monde s'y rapporte : les tailles relatives
// sont conservées, et l'ensemble remplit vraiment la case.
let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
Object.values(jeu).forEach(p => {
    p.formes.forEach(f => {
        const b = boiteChemin(f.d);
        if (!isFinite(b.x0)) return;
        X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1);
        Y0 = Math.min(Y0, b.y0); Y1 = Math.max(Y1, b.y1);
    });
});
const cadre = { x0: X0, y0: Y0, x1: X1, y1: Y1 };

const attendus = [];
for (const t of Object.values(TYPES)) for (const c of ['b', 'n']) {
    if (!jeu[`${t}${c}`]) attendus.push(`${t}${c === 'n' ? ' noir' : ' blanc'}`);
}
if (attendus.length) {
    console.error(`Il manque ${attendus.length} pièce(s) : ${attendus.join(', ')}.`);
    console.error(`Fichiers lus : ${total}. Ignorés : ${ignores.join(', ') || 'aucun'}`);
    process.exit(1);
}

const sortie = `// LES PIÈCES D'ÉCHECS IMPORTÉES — fichier ENGENDRÉ, ne pas modifier à la main.
//
// Écrit par « node outils/importerPieces.mjs ${dossier} ».
// Relancer le script pour changer de jeu de pièces.
//
// ${mention}

export const MENTION_PIECES = '${mention.replace(/'/g, "\\'")}';

/**
 * Une pièce = sa boîte d'origine (le viewBox du fichier) et ses chemins.
 * « remplit » distingue une forme pleine d'un simple trait : remplir la crinière
 * d'un cavalier la transformerait en tache.
 */
export const PIECES_IMPORTEES = ${JSON.stringify(jeu, null, 4)};

/** La boîte qui contient les douze pièces — le cadre commun de la série. */
export const CADRE_IMPORTE = ${JSON.stringify(cadre)};
`;
writeFileSync(cible, sortie);
console.log(`✓ ${total} pièces écrites dans ${cible}`);
console.log(`  Mention affichée : « ${mention} »`);
console.log('  Pense à vérifier le rendu : node outils/apercuPieces.mjs');
