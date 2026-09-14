// DÉCOUPER `js/ui/printSheet.js` — mécaniquement, pas à la main.
//
//     node tools/decouperPrintSheet.mjs [--ecrire]
//
// Rémy, dans sa liste d'améliorations : découper le fichier de seize mille
// lignes. Le faire à la main, c'est deux cents copier-coller et une occasion de
// se tromper à chaque fois — sur un fichier que quatre-vingts feuilles
// imprimées mettent à l'épreuve. Un programme, lui, ne se lasse pas, et l'on
// peut relire SA RÈGLE au lieu de relire son résultat.
//
// LA RÈGLE, ET ELLE SE CALCULE :
//
//   · une fonction que SEULE une entrée de RENDUS atteint part avec elle ;
//   · une fonction qu'atteignent DEUX entrées ou plus reste au socle ;
//   · la machinerie (la modale, la fabrique de PDF, RENDUS lui-même) ne bouge
//     pas — c'est elle, la façade du module.
//
// LES COMMENTAIRES VOYAGENT AVEC CE QU'ILS DOCUMENTENT. C'est le seul point
// vraiment délicat : une déclaration commence à sa ligne `function`, mais ce
// qui la précède — le pavé qui explique POURQUOI elle est ainsi — appartient à
// elle, pas à la précédente. On remonte donc au-dessus de chaque déclaration
// tant qu'on lit du commentaire ou du blanc. Dans ce dépôt, perdre le rattachement
// d'un commentaire coûterait plus cher que de ne pas découper du tout.

// CE PROGRAMME NE SERT QU'UNE FOIS, et il est gardé pour cela : il dit COMMENT
// le découpage a été fait, ce qu'aucun résultat ne saurait dire. Le relancer
// sur le fichier déjà découpé n'aurait pas de sens — il n'y trouverait plus que
// la façade. Pour refaire le découpage autrement (d'autres familles, par
// exemple), on repart de l'état d'avant : `git show <commit>^:js/ui/printSheet.js`.

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(RACINE, 'js/ui/printSheet.js');
const DOSSIER = path.join(RACINE, 'js/ui/fiches');
const ECRIRE = process.argv.includes('--ecrire');

/**
 * LES FAMILLES — le seul choix humain de tout ce programme.
 *
 * Le reste se déduit du graphe ; ceci se décide en regardant le catalogue avec
 * les yeux d'un professeur. Une famille répond à « où irais-je chercher cet
 * exercice ? », pas à « quelles fonctions se ressemblent ? ».
 */
const FAMILLES = {
    grilles: {
        titre: 'LES GRILLES À REMPLIR — logique pure, un crayon suffit.',
        cles: ['mathdoku', 'binairo', 'sudoku', 'garam', 'logigramme', 'futoshiki',
               'slitherlink', 'hashi', 'carre-magique', 'tasuko', 'dominos']
    },
    jeux: {
        titre: 'LES JEUX QUI SE JOUENT À DEUX, sur la feuille.',
        cles: ['puissance4', 'sim', 'pipopipette', 'memory', 'mastermind']
    },
    mots: {
        titre: 'LES MOTS — anagrammes, grilles croisées, codes.',
        cles: ['anagrammes', 'motscroises', 'motcode', 'motscaches', 'codage']
    },
    casseTete: {
        titre: 'LES CASSE-TÊTE DE DÉPLACEMENT — on bouge des pièces, on compte les coups.',
        cles: ['tourBrahma', 'grenouilles', 'parking', 'dedale', 'sans-croiser',
               'bons-chemins', 'laby-nombres', 'chemin', 'pointapoint']
    },
    figures: {
        titre: 'LES FIGURES — ce qui se trace, se code et se nomme.',
        cles: ['anglesManquants', 'anglesNommer', 'cercleVocabulaire', 'notation',
               'angles', 'rectangle', 'triangle', 'disque', 'hexagrille', 'solides',
               'tangram', 'relier', 'redaction', 'programme-construction']
    },
    theoremes: {
        titre: 'PYTHAGORE, THALÈS, TRIGONOMÉTRIE — les théorèmes et leur rédaction.',
        cles: ['pythagore', 'thales', 'thales-redaction', 'trigo-cotes']
    },
    reperage: {
        titre: 'SE REPÉRER — repères, quadrillages, pavages, échiquiers.',
        cles: ['repere', 'quadrillage', 'pavage', 'echiquier', 'mat', 'colorier']
    },
    nombres: {
        titre: 'LES NOMBRES — poser, convertir, graduer, fractionner.',
        cles: ['pose', 'conversion', 'compte', 'priorites', 'egypte', 'graduation',
               'pyramide', 'pyramideNombres', 'cubes', 'tableur', 'proportion',
               'paires', 'pizza', 'horloge']
    },
    algorithmes: {
        titre: 'ALGORITHMIQUE — le chat, les organigrammes, les tableaux croisés.',
        cles: ['chat', 'organigramme-quadri', 'tableau-croise']
    }
};

// ---------------------------------------------------------------- Lecture --

const brut = fs.readFileSync(SOURCE, 'utf8');
const lignes = brut.split('\n');

/** Où s'arrête le bloc d'imports en tête de fichier. */
function finDesImports() {
    let dernier = 0, profondeur = 0, dans = false;
    for (let i = 0; i < lignes.length; i++) {
        const l = lignes[i];
        if (!dans && /^import[\s{]/.test(l)) dans = true;
        if (dans) {
            profondeur += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
            if (profondeur <= 0 && /;\s*$|['"];?\s*$/.test(l)) { dernier = i; dans = false; profondeur = 0; }
        }
    }
    return dernier;
}
const FIN_IMPORTS = finDesImports();
const enTete = lignes.slice(0, FIN_IMPORTS + 1);

/** Les imports, un par nom local : d'où il vient et sous quel nom là-bas. */
function lireImports() {
    const texte = enTete.join('\n');
    const carte = new Map();
    for (const m of texte.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
        const [, clause, source] = m;
        const nomme = clause.match(/\{([\s\S]*)\}/);
        if (nomme) {
            for (const part of nomme[1].split(',')) {
                const t = part.trim(); if (!t) continue;
                const a = t.match(/^(\S+)\s+as\s+(\S+)$/);
                if (a) carte.set(a[2], { source, cite: `${a[1]} as ${a[2]}` });
                else carte.set(t, { source, cite: t });
            }
        }
        const parDefaut = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim();
        if (parDefaut && !parDefaut.startsWith('*')) {
            carte.set(parDefaut, { source, defaut: true, cite: parDefaut });
        }
    }
    return carte;
}
const IMPORTS = lireImports();

/** Les déclarations de premier niveau, commentaire d'en-tête compris. */
function lireDeclarations() {
    const decls = [];
    const re = /^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/;
    for (let i = FIN_IMPORTS + 1; i < lignes.length; i++) {
        const m = lignes[i].match(re);
        if (m) decls.push({ nom: m[1] || m[2], code: i });
    }
    // Remonter au-dessus de chaque déclaration pour capturer SON commentaire.
    decls.forEach(d => {
        let i = d.code - 1;
        for (;;) {
            if (i <= FIN_IMPORTS) break;
            const l = lignes[i];
            if (/^\s*$/.test(l)) { i--; continue; }
            if (/^\s*\/\//.test(l)) { i--; continue; }
            if (/\*\/\s*$/.test(l)) {                     // fin d'un bloc /* … */
                let e = i;
                while (e > FIN_IMPORTS && !/^\s*\/\*/.test(lignes[e])) e--;
                i = e - 1; continue;
            }
            break;
        }
        d.debut = i + 1;
    });
    // Ne pas empiéter sur la déclaration précédente, et ne pas garder les
    // lignes blanches de séparation en tête de tranche.
    decls.forEach((d, k) => {
        if (k > 0 && d.debut <= decls[k - 1].code) d.debut = decls[k - 1].code + 1;
        while (d.debut < d.code && /^\s*$/.test(lignes[d.debut])) d.debut++;
    });
    decls.forEach((d, k) => { d.fin = (k + 1 < decls.length ? decls[k + 1].debut : lignes.length) - 1; });
    decls.forEach(d => { d.texte = lignes.slice(d.debut, d.fin + 1).join('\n').replace(/\s+$/, ''); });
    return decls;
}
const DECLS = lireDeclarations();
const PAR_NOM = new Map(DECLS.map(d => [d.nom, d]));

/**
 * LE CODE SEUL — sans les commentaires ni le texte des chaînes.
 *
 * On lisait les identifiants dans le texte brut. Sur des entrées de RENDUS,
 * terses, cela passait ; sur `ouvrirFicheModal` et ses quatre cent trente
 * lignes de prose, c'était fatal — parce que dans ce dépôt les commentaires
 * sont écrits en français, et que « pose », « compte », « unité », « angles »,
 * « chemin », « paires », « relier » sont À LA FOIS des mots courants et des
 * noms de fonctions. Le graphe partait donc de la façade vers tout le fichier,
 * et le découpage rendait un socle de quatorze mille lignes.
 *
 * On garde en revanche l'intérieur des `${…}` : un gabarit appelle de vraies
 * fonctions, et les oublier casserait le graphe dans l'autre sens.
 *
 * ET LES EXPRESSIONS RÉGULIÈRES SONT DU CODE, PAS DES CHAÎNES. `/['"]/` commence
 * par une apostrophe : le lecteur naïf y voyait le début d'une chaîne et avalait
 * tout jusqu'à l'apostrophe suivante — parfois des centaines de lignes. C'est
 * ainsi que `placerGlyphes` avait disparu de la liste des imports d'une famille
 * entière, et que la feuille des chiffres égyptiens tombait sur
 * « placerGlyphes is not defined » — trouvé par l'audit, pas par les tests.
 */
function codeSeul(src) {
    let out = '', i = 0;
    const n = src.length;
    while (i < n) {
        const c = src[i], d = src[i + 1];
        if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
        if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
        if (c === "'" || c === '"') {
            const q = c; i++;
            while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
            i++; out += ' '; continue;
        }
        // Une barre oblique qui suit un opérateur ou une ouverture commence une
        // expression régulière, pas une division.
        if (c === '/') {
            const avant = out.replace(/\s+$/, '').slice(-1);
            if (avant === '' || '(,=:[!&|?{};+-*%~^'.includes(avant)) {
                i++;
                while (i < n && src[i] !== '/') {
                    if (src[i] === '\\') i++;
                    else if (src[i] === '[') { while (i < n && src[i] !== ']') { if (src[i] === '\\') i++; i++; } }
                    i++;
                }
                i++;
                while (i < n && /[a-z]/.test(src[i])) i++;   // les drapeaux
                out += ' '; continue;
            }
        }
        if (c === '`') {
            i++;
            while (i < n && src[i] !== '`') {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === '$' && src[i + 1] === '{') {   // on garde l'expression
                    let prof = 1; i += 2; out += ' ';
                    while (i < n && prof > 0) {
                        if (src[i] === '{') prof++;
                        else if (src[i] === '}') prof--;
                        if (prof > 0) out += src[i];
                        i++;
                    }
                    continue;
                }
                i++;
            }
            i++; out += ' '; continue;
        }
        out += c; i++;
    }
    return out;
}

DECLS.forEach(d => {
    d.cite = new Set();
    for (const m of codeSeul(d.texte).matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        if (m[1] !== d.nom) d.cite.add(m[1]);
    }
});

// ------------------------------------------------------- Les entrées de RENDUS

const iRendus = lignes.findIndex(l => /^export const RENDUS = \{/.test(l));
const finRendus = lignes.findIndex((l, i) => i > iRendus && /^\};/.test(l));
const ENTREES = [];
{
    let cle = null, debut = 0;
    for (let i = iRendus + 1; i < finRendus; i++) {
        const m = lignes[i].match(/^    ['"]?([\w-]+)['"]?:\s*\{/);
        if (m) { if (cle) ENTREES.push({ cle, debut, fin: i - 1 }); cle = m[1]; debut = i; }
    }
    if (cle) ENTREES.push({ cle, debut, fin: finRendus - 1 });
}
ENTREES.forEach(e => { e.texte = lignes.slice(e.debut, e.fin + 1).join('\n').replace(/\s+$/, ''); });

// Le graphe s'arrête à la machinerie, sans quoi il boucle par RENDUS et tout
// paraît partagé par tout le monde.
const MACHINERIE = new Set(['RENDUS', 'ouvrirFicheModal', 'construirePdf', 'assurerModale']);
function atteint(depuis) {
    const vus = new Set(); const pile = [...depuis];
    while (pile.length) {
        const n = pile.pop();
        if (vus.has(n) || MACHINERIE.has(n) || !PAR_NOM.has(n)) continue;
        vus.add(n);
        PAR_NOM.get(n).cite.forEach(x => pile.push(x));
    }
    return vus;
}
ENTREES.forEach(e => {
    e.atteint = atteint([...codeSeul(e.texte).matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(m => m[1]));
});

const combien = new Map(DECLS.map(d => [d.nom, 0]));
ENTREES.forEach(e => e.atteint.forEach(n => combien.set(n, (combien.get(n) || 0) + 1)));

// ET CE QUE LA MACHINERIE APPELLE VA AU SOCLE, quoi qu'en dise le comptage.
//
// On avait exclu la façade du graphe pour l'empêcher de boucler par `RENDUS` —
// et du coup ses propres appels ne comptaient pour rien. `calculerFiche`, que
// `construirePdf` appelle deux fois, est ainsi partie avec la famille « jeux » :
// la façade l'appelait sans plus l'avoir sous la main. Le fichier se compilait,
// les tests passaient, et l'erreur ne serait apparue qu'à l'ouverture d'une
// fiche. C'est exactement ce que cherche `tools/tmp/refsPerdues.mjs`.
//
// SAUF `RENDUS` LUI-MÊME, et c'est tout le piège. `RENDUS` est une déclaration
// comme une autre, et il cite les deux cent quatre-vingt-seize rendus : le
// compter parmi ce que « la façade appelle » faisait de la façade une
// dépendante de tout le fichier, et le découpage rendait un socle de quatorze
// mille lignes et neuf familles vides. Ce que la FAÇADE a besoin d'avoir sous
// la main, ce sont les appels de `ouvrirFicheModal`, `construirePdf` et
// `assurerModale` — pas le catalogue qu'elle se contente d'indexer.
const PAR_LA_FACADE = atteint(
    DECLS.filter(d => MACHINERIE.has(d.nom) && d.nom !== 'RENDUS')
        .flatMap(d => [...d.cite]));

// --------------------------------------------------------- L'affectation --

const familleDe = new Map();
for (const [nom, f] of Object.entries(FAMILLES)) f.cles.forEach(c => familleDe.set(c, nom));

const manquantes = ENTREES.filter(e => !familleDe.has(e.cle)).map(e => e.cle);
if (manquantes.length) {
    console.error('Entrées sans famille :', manquantes.join(', '));
    process.exit(1);
}

const paquets = {};
for (const nom of Object.keys(FAMILLES)) paquets[nom] = { decls: [], entrees: [] };
const socle = [];
const restent = [];

ENTREES.forEach(e => paquets[familleDe.get(e.cle)].entrees.push(e));

// `RENDUS` NE SURVIT PAS TEL QUEL : chaque famille emporte sa part, et la
// façade les réunit. On garde sa PLACE dans le fichier — un jeton qu'on
// remplacera à l'écriture — pour que l'ordre des déclarations ne bouge pas.
const JETON_RENDUS = '/*__RENDUS__*/';
DECLS.forEach(d => {
    if (d.nom === 'RENDUS') { restent.push({ ...d, texte: JETON_RENDUS }); return; }
    if (MACHINERIE.has(d.nom)) { restent.push(d); return; }
    const n = combien.get(d.nom) || 0;
    // CE QUE SEULE LA FAÇADE ATTEINT RESTE AVEC ELLE. On l'envoyait au socle, et
    // cela a cassé les quatre-vingt-trois fiches d'un coup : `fenetreFiche` est
    // un `let` de module, que `assurerModale` AFFECTE. Une liaison importée est
    // constante — l'affectation levait « Assignment to constant variable », la
    // fenêtre restait nulle, et tout aperçu sortait vide. Une variable qui se
    // réaffecte doit vivre dans le module qui la réaffecte.
    if (PAR_LA_FACADE.has(d.nom) && n === 0) { restent.push(d); return; }
    if (PAR_LA_FACADE.has(d.nom)) { socle.push(d); return; }   // la façade ET des familles
    if (n === 0) { restent.push(d); return; }          // hors du graphe : la façade
    if (n > 1) { socle.push(d); return; }              // partagé : le socle
    const e = ENTREES.find(x => x.atteint.has(d.nom));
    paquets[familleDe.get(e.cle)].decls.push(d);
});

// ------------------------------------------------------------- L'écriture --

/** Les imports dont un ensemble de textes a besoin, regroupés par source. */
function importsPour(textes, offerts) {
    // ON LIT LE TEXTE BRUT, COMMENTAIRES COMPRIS, et c'est délibéré : ici
    // l'erreur n'est pas symétrique. Un import inutile ne coûte rien ; un import
    // manquant casse une feuille à l'ouverture, et l'on ne s'en aperçoit qu'en
    // la dessinant. On préfère donc trop que pas assez.
    const utilises = new Set();
    for (const m of textes.join('\n').matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) utilises.add(m[1]);
    const parSource = new Map();
    for (const [local, info] of IMPORTS) {
        if (!utilises.has(local)) continue;
        if (!parSource.has(info.source)) parSource.set(info.source, []);
        parSource.get(info.source).push(info.cite);
    }
    const lignesImport = [];
    for (const [source, noms] of parSource) {
        const chemin = source.startsWith('.') ? '../' + source.replace(/^\.\//, '') : source;
        lignesImport.push(`import { ${[...new Set(noms)].sort().join(', ')} } from '${chemin}';`);
    }
    // Ce que le socle offre et que ce module utilise.
    const duSocle = offerts.filter(n => utilises.has(n)).sort();
    if (duSocle.length) lignesImport.push(`import {\n    ${plier(duSocle)}\n} from './socle.js';`);
    return lignesImport.sort().join('\n');
}

const plier = (noms) => {
    const out = []; let ligne = '';
    for (const n of noms) {
        if (ligne.length + n.length > 74) { out.push(ligne.replace(/\s+$/, '')); ligne = ''; }
        ligne += n + ', ';
    }
    if (ligne.trim()) out.push(ligne.replace(/,\s*$/, ''));
    return out.join('\n    ');
};

const offerts = socle.map(d => d.nom);

/**
 * LA FAÇADE DOIT CONTINUER D'OFFRIR CE QU'ELLE OFFRAIT.
 *
 * `chargerJsPDF` est appelée par `ouvrirFicheModal` — elle est donc partie au
 * socle avec les autres dépendances de la façade. Sauf qu'elle est AUSSI
 * publique : `bilanPdf.js` et `printQuestions.js` l'importent de
 * `printSheet.js` depuis toujours. Le fichier compilait, et l'import échouait
 * au chargement du module voisin.
 *
 * Un découpage n'a pas le droit de rétrécir la porte d'entrée : ce que le
 * fichier exportait avant, il l'exporte encore — en le réexportant du socle
 * quand le code a déménagé.
 */
const PUBLICS = DECLS.filter(d => /^export\s/m.test(d.texte.split('\n')[d.code - d.debut] || ''))
    .map(d => d.nom);
const AREEXPORTER = PUBLICS.filter(n => offerts.includes(n));

/**
 * POSER `export` DEVANT LA DÉCLARATION, PAS DEVANT SON COMMENTAIRE.
 *
 * On l'ajoutait en tête de la tranche — et une tranche commence par le pavé qui
 * documente la fonction. Cela donnait « export // --- Mise en page --- » : le
 * mot-clé se faisait avaler par le commentaire, la déclaration restait privée,
 * et le fichier se compilait parfaitement. `PAGE` n'était donc exporté nulle
 * part, sans qu'aucun outil ne s'en plaigne.
 */
function exporter(d) {
    const L = d.texte.split('\n');
    const rel = d.code - d.debut;
    if (L[rel] !== undefined && !/^export\s/.test(L[rel])) L[rel] = 'export ' + L[rel];
    return L.join('\n');
}

const fichiers = {};

// --- le socle
fichiers['socle.js'] = [
    `// LE SOCLE DES FICHES — ce dont plusieurs familles se servent.`,
    `//`,
    `// Rien ici n'appartient à un exercice en particulier : c'est la règle qui a`,
    `// décidé du contenu de ce fichier. Une fonction qu'UNE seule entrée de`,
    `// \`RENDUS\` atteint part avec sa famille ; celles qu'en atteignent deux ou`,
    `// plus restent ici. Voir \`tools/decouperPrintSheet.mjs\`.`,
    ``,
    importsPour(socle.map(d => d.texte), []),
    ``,
    socle.map(exporter).join('\n\n'),
    ``
].join('\n');

// --- les familles
for (const [nom, f] of Object.entries(FAMILLES)) {
    const p = paquets[nom];
    const corps = p.decls.map(d => d.texte);
    const entrees = p.entrees.map(e => e.texte).join('\n');
    fichiers[`${nom}.js`] = [
        `// ${f.titre}`,
        `//`,
        `// Une tranche de \`printSheet.js\`, découpée par \`tools/decouperPrintSheet.mjs\`.`,
        `// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;`,
        `// ce qui sert à plusieurs vit dans \`socle.js\`.`,
        ``,
        importsPour([...corps, entrees], offerts),
        ``,
        corps.join('\n\n'),
        ``,
        `export const RENDUS_${nom.toUpperCase()} = {`,
        entrees,
        `};`,
        ``
    ].join('\n');
}

// --- le fichier de tête
const listeFamilles = Object.keys(FAMILLES);
const tete = [
    ...enTete,
    ``,
    `// LES FAMILLES DE FICHES. Chacune apporte sa part de \`RENDUS\` ; le`,
    `// catalogue complet est leur réunion, ci-dessous.`,
    ...listeFamilles.map(n => `import { RENDUS_${n.toUpperCase()} } from './fiches/${n}.js';`),
    ...(AREEXPORTER.length ? [
        `// Réexportées telles quelles : elles ont déménagé au socle, mais c'est`,
        `// d'ici que le reste de l'application les importe depuis toujours.`,
        `export { ${AREEXPORTER.join(', ')} } from './fiches/socle.js';`,
        ``
    ] : []),
    `import {\n    ${plier(offerts.filter(n =>
        restent.some(d => new RegExp(`\\b${n}\\b`).test(codeSeul(d.texte)))).sort())}\n} from './fiches/socle.js';`,
    ``,
    restent.map(d => d.texte).join('\n\n')
        .replace(JETON_RENDUS, [
            `/**`,
            ` * LE CATALOGUE DES FICHES — la réunion des familles.`,
            ` *`,
            ` * Il était ici même, en mille six cent cinquante lignes. Chaque famille`,
            ` * porte désormais la sienne, à côté du code qui la dessine : on ne lit plus`,
            ` * une entrée à un bout du fichier et son rendu à l'autre.`,
            ` */`,
            `export const RENDUS = {`,
            ...listeFamilles.map(n => `    ...RENDUS_${n.toUpperCase()},`),
            `};`
        ].join('\n')),
    ``
].join('\n');

// --------------------------------------------------------------- Le compte --

const compte = (l) => l.reduce((s, d) => s + (d.fin - d.debut + 1), 0);
console.log(`printSheet.js : ${lignes.length} lignes, ${DECLS.length} déclarations, ${ENTREES.length} entrées`);
console.log(`\n  socle        ${String(socle.length).padStart(4)} décl.  ${String(compte(socle)).padStart(6)} l.`);
for (const nom of listeFamilles) {
    const p = paquets[nom];
    console.log(`  ${nom.padEnd(12)} ${String(p.decls.length).padStart(4)} décl.  ${String(compte(p.decls)).padStart(6)} l.  (${p.entrees.length} exercices)`);
}
console.log(`  façade       ${String(restent.length).padStart(4)} décl.  ${String(compte(restent)).padStart(6)} l.`);

if (!ECRIRE) {
    console.log('\n(essai à blanc — relancer avec --ecrire pour écrire les fichiers)');
    process.exit(0);
}

fs.mkdirSync(DOSSIER, { recursive: true });
for (const [nom, contenu] of Object.entries(fichiers)) {
    fs.writeFileSync(path.join(DOSSIER, nom), contenu.replace(/\n{3,}/g, '\n\n'));
}
fs.writeFileSync(SOURCE, tete.replace(/\n{3,}/g, '\n\n'));
console.log('\nécrit.');
