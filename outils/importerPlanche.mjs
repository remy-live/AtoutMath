// IMPORTER UNE PLANCHE DE PIÈCES — les douze pièces dans un seul fichier SVG.
//
//     node outils/importerPlanche.mjs icons/pieces/Chess_Pieces_Sprite.svg
//
// C'est le format sous lequel circule le jeu de pièces le plus répandu (celui
// de Cburnett) : un SVG de 270 × 90, six colonnes de 45 pixels, deux rangées —
// les blanches en haut, les noires en bas —, chaque pièce dans un groupe posé
// par un « translate ».
//
// TROIS CHOSES RENDENT CE FICHIER PLUS DUR À LIRE QU'UNE COLLECTION DE FICHIERS
// SÉPARÉS, et les trois sont indispensables :
//
//   · LES STYLES SE TRANSMETTENT. La couleur d'une forme est souvent écrite sur
//     le GROUPE, pas sur la forme. Ne lire que la forme donnerait des pièces
//     entièrement noires — ou entièrement transparentes.
//   · LES TRANSFORMATIONS S'EMPILENT. Le groupe décale la pièce, et certaines
//     formes portent la leur (les boules de la dame blanche, l'œil incliné du
//     cavalier). Les ignorer empilerait les douze pièces au même endroit.
//   · IL Y A DES ARCS ET DES CERCLES. Les boules de la couronne et la mitre du
//     fou sont des arcs elliptiques ; la dame noire utilise des <circle>. Les
//     approcher par des segments remplacerait chaque boule par un trait.
//
// On FIGE tout à l'import : le fichier produit ne contient plus que des chemins
// en courbes, sans transformation ni héritage. L'application n'a plus qu'à les
// dessiner — à l'écran comme dans le PDF.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
    deroulerChemin, ecrireChemin, boiteChemin,
    lireTransformation, composer, appliquer, echelleDe, IDENTITE
} from '../js/ui/cheminSvg.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const fichier = args[0];
const mention = args[1] || 'Pièces : Cburnett, Wikimedia Commons, CC BY-SA 3.0';
const cible = (process.argv.find(a => a.startsWith('--sortie=')) || '').slice(9)
    || 'js/ui/piecesImportees.js';

if (!fichier || !existsSync(fichier)) {
    console.error('Usage : node outils/importerPlanche.mjs <planche.svg> ["mention de licence"]');
    process.exit(2);
}

const source = readFileSync(fichier, 'utf8');

// --- Lire le SVG ------------------------------------------------------------
//
// Un vrai analyseur XML serait de trop : ces fichiers sont simples et réguliers.
// On parcourt les balises en tenant une PILE, ce qui suffit à savoir de quels
// groupes une forme descend — donc quels styles et quelles transformations elle
// hérite.

const attributs = (texte) => {
    const out = {};
    const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(texte))) out[m[1]] = m[2];
    return out;
};

/** Les propriétés de peinture d'un élément : son « style » puis ses attributs. */
function peinture(attrs) {
    const out = {};
    const style = attrs.style || '';
    style.split(';').forEach(d => {
        const i = d.indexOf(':');
        if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    });
    ['fill', 'stroke', 'stroke-width'].forEach(k => {
        if (attrs[k] !== undefined && out[k] === undefined) out[k] = attrs[k];
    });
    return out;
}

/** Un cercle, réécrit en chemin : deux demi-tours, comme le fait le SVG. */
const cercleEnChemin = (cx, cy, r) =>
    `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;

const formes = [];          // { d, M, style, groupe }
const groupes = [];         // les groupes de premier niveau, dans l'ordre
let pile = [];

const re = /<!--([\s\S]*?)-->|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)\s*>/g;
let t, dernierCommentaire = '';
while ((t = re.exec(source))) {
    if (t[1] !== undefined) { dernierCommentaire = t[1].trim(); continue; }
    const [, , fermante, nom, brut, autoferme] = t;
    if (fermante) { pile.pop(); continue; }

    const attrs = attributs(brut);
    const M = composer(pile.length ? pile[pile.length - 1].M : IDENTITE,
        lireTransformation(attrs.transform));
    const style = { ...(pile.length ? pile[pile.length - 1].style : {}), ...peinture(attrs) };

    if (nom === 'g') {
        const noeud = { M, style };
        // Un groupe posé directement sous <svg> est UNE PIÈCE : c'est sa
        // translation qui dit de quelle case de la planche il s'agit.
        if (pile.length === 1) {
            const [x, y] = appliquer(M, 0, 0);
            noeud.piece = { x, y, commentaire: dernierCommentaire, formes: [] };
            groupes.push(noeud.piece);
        } else {
            noeud.piece = pile[pile.length - 1].piece;
        }
        pile.push(noeud);
        if (autoferme) pile.pop();
        continue;
    }

    if (nom === 'svg') { pile.push({ M, style, piece: null }); continue; }

    const piece = pile.length ? pile[pile.length - 1].piece : null;
    let d = null;
    if (nom === 'path') d = attrs.d;
    else if (nom === 'circle') d = cercleEnChemin(Number(attrs.cx), Number(attrs.cy), Number(attrs.r));
    else if (['rect', 'ellipse', 'polygon', 'polyline', 'line'].includes(nom)) {
        console.warn(`⚠ un <${nom}> a été rencontré : il ne sera PAS dessiné.`);
    }
    if (d && piece) formes.push({ d, M, style, piece });
    if (!autoferme && !['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line'].includes(nom)) {
        pile.push({ M, style, piece });
    }
}

// --- Ranger les pièces ------------------------------------------------------

const COLONNES = ['K', 'Q', 'B', 'N', 'R', 'P'];
const NOMS = {
    king: 'K', roi: 'K', queen: 'Q', dame: 'Q', bishop: 'B', fou: 'B',
    knight: 'N', cavalier: 'N', rook: 'R', tour: 'R', pawn: 'P', pion: 'P'
};

const jeu = {};
groupes.forEach(p => {
    const col = Math.round(p.x / 45), rang = Math.round(p.y / 45);
    let type = COLONNES[col];
    const noir = rang === 1;
    // LE COMMENTAIRE SERT DE CONTRÔLE. La disposition en colonnes est celle du
    // fichier de référence ; si un fichier la changeait, le commentaire le
    // dirait et l'on préfère le croire, lui.
    const mot = Object.keys(NOMS).find(k => new RegExp(`\\b${k}\\b`, 'i').test(p.commentaire || ''));
    if (mot && NOMS[mot] !== type) {
        console.warn(`⚠ colonne ${col} : la disposition dit « ${type} », le commentaire dit `
            + `« ${p.commentaire} ». On suit le commentaire.`);
        type = NOMS[mot];
    }
    if (!type) return;
    p.type = type; p.noir = noir;
    jeu[`${type}${noir ? 'n' : 'b'}`] = { formes: [] };
});

formes.forEach(f => {
    const p = f.piece;
    if (!p || !p.type) return;
    // On FIGE la transformation dans le tracé, et l'on ramène la pièce à
    // l'origine de sa case : le fichier produit ne porte plus aucun décalage.
    const M = composer([1, 0, 0, 1, -p.x, -p.y], f.M);
    const chemins = deroulerChemin(f.d, (x, y) => appliquer(M, x, y));
    if (!chemins.length) return;
    const fill = (f.style.fill || '').trim();
    const stroke = (f.style.stroke || '').trim();
    const largeur = Number(f.style['stroke-width']);
    jeu[`${p.type}${p.noir ? 'n' : 'b'}`].formes.push({
        d: ecrireChemin(chemins),
        // « fill:000000 » sans dièse traîne dans le fichier de référence : on
        // le rattrape, sinon la tour noire sort transparente.
        fill: /^[0-9a-f]{6}$/i.test(fill) ? `#${fill}` : (fill || '#ffffff'),
        stroke: stroke && stroke !== 'none' ? stroke : null,
        largeur: (isFinite(largeur) ? largeur : 1.5) * echelleDe(M),
        remplit: fill.toLowerCase() !== 'none'
    });
});

const manquantes = [];
for (const t2 of COLONNES) for (const c of ['b', 'n']) {
    if (!jeu[`${t2}${c}`] || !jeu[`${t2}${c}`].formes.length) {
        manquantes.push(`${t2}${c === 'n' ? ' noir' : ' blanc'}`);
    }
}
if (manquantes.length) {
    console.error(`Il manque ${manquantes.length} pièce(s) : ${manquantes.join(', ')}.`);
    process.exit(1);
}

// LE CADRE COMMUN AUX DOUZE. Recaler chaque pièce sur SA boîte les rendrait
// toutes de la même hauteur, et un pion deviendrait aussi grand qu'un roi.
let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity, trait = 0;
Object.values(jeu).forEach(p => p.formes.forEach(f => {
    const b = boiteChemin(f.d);
    if (!isFinite(b.x0)) return;
    X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1);
    Y0 = Math.min(Y0, b.y0); Y1 = Math.max(Y1, b.y1);
    // LE CONTOUR DÉBORDE DE LA GÉOMÉTRIE : la moitié de son épaisseur passe
    // à l'extérieur du tracé. Sans le compter, une pièce calée au plus juste
    // dans sa case en sort — on le voyait sur le cavalier, au bord du damier.
    trait = Math.max(trait, f.largeur || 0);
}));

const sortie = `// LES PIÈCES D'ÉCHECS — fichier ENGENDRÉ, ne pas modifier à la main.
//
// Écrit par « node outils/importerPlanche.mjs ${fichier} ».
//
// ${mention}
//
// Les transformations et l'héritage des styles ont été FIGÉS à l'import : il ne
// reste que des chemins en courbes, avec leur remplissage et leur contour.

export const MENTION_PIECES = '${mention.replace(/'/g, "\\'")}';

export const PIECES_IMPORTEES = ${JSON.stringify(jeu, null, 4)};

/** La boîte qui contient les douze pièces — le cadre commun de la série. */
export const CADRE_IMPORTE = ${JSON.stringify({ x0: X0, y0: Y0, x1: X1, y1: Y1, trait })};
`;
writeFileSync(cible, sortie);
const combien = Object.values(jeu).reduce((n, p) => n + p.formes.length, 0);
console.log(`✓ 12 pièces, ${combien} tracés, écrits dans ${cible}`);
console.log(`  Cadre commun : ${X0.toFixed(1)},${Y0.toFixed(1)} → ${X1.toFixed(1)},${Y1.toFixed(1)}`);
console.log(`  Mention : « ${mention} »`);
