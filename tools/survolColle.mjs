// SUR UN ÉCRAN TACTILE, LE SURVOL RESTE COLLÉ.
//
// Rémy, capture de « La Chute des Décimaux » : « des intervalles sont allumés
// alors que je n'avais pas appuyé dessus ». Deux cases éclairées sur la droite
// graduée, dont une seule est le curseur du jeu. L'autre est un `:hover` que
// son doigt a laissé derrière lui : sur iOS, la pseudo-classe se pose au
// toucher et NE SE RETIRE QU'AU TOUCHER SUIVANT, ailleurs.
//
// CE N'EST PAS UN DÉFAUT DE CE JEU. Compté sur tout le dépôt : 295 règles
// `:hover` changent l'apparence, et NEUF sont protégées. Les 286 autres
// s'appliquent sur un téléphone, où il n'y a pas de pointeur à survoler. Dans
// un jeu où le survol ressemble à « case choisie », cela raconte une réponse
// que l'élève n'a pas donnée.
//
// LA CORRECTION EST MÉCANIQUE ET NE TOUCHE PAS L'ORDINATEUR : on enferme la
// règle dans `@media (hover: hover)`, vrai partout où un pointeur peut
// survoler — souris, pavé tactile, portable tactile — et faux sur un téléphone.
// Le rendu de bureau est IDENTIQUE au signe près ; seul le téléphone change.
//
// DEUX PRÉCAUTIONS QUI VALENT LEUR CODE :
//
//   · une règle qui liste plusieurs sélecteurs — « .a:hover, .a:focus-visible »
//     — est COUPÉE EN DEUX : la part `:hover` passe sous la requête, le reste
//     demeure. Sans cela on retirerait aussi le halo du clavier à qui branche
//     un clavier sur une tablette ;
//   · on ne touche jamais une règle déjà sous `@media (hover: hover)`.
//
//   node tools/survolColle.mjs            dit ce qu'il y a
//   node tools/survolColle.mjs --ecrire   le fait
//
// Il vérifie après écriture : `node --check` sur tout fichier JavaScript, et
// l'équilibre des accolades sur les feuilles de style. Au moindre doute il
// remet le fichier comme il était.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

// IL S'IMPORTE AUSSI. `tests/survolTactile.test.mjs` appelle `analyser()` pour
// garder l'invariant : la règle et l'épreuve ne peuvent pas diverger si elles
// lisent le même code. On ne fait donc rien au chargement — seulement quand on
// nous lance.
const LANCE = process.argv[1] && process.argv[1].endsWith('survolColle.mjs');
const ECRIRE = process.argv.includes('--ecrire');
const RACINES = ['css', 'js/games', 'js/core', 'js/ui'];
/** Ce qui fait qu'un survol se VOIT — et donc qu'il ment quand il reste. */
const APPARENCE = /background|border-color|(^|[;{\s])color\s*:|transform|box-shadow|opacity|filter/;

function tousLesFichiers() {
    const out = [];
    for (const r of RACINES) {
        const pile = [r];
        while (pile.length) {
            const p = pile.pop();
            for (const e of readdirSync(p, { withFileTypes: true })) {
                const f = join(p, e.name);
                if (e.isDirectory()) pile.push(f);
                else if (extname(e.name) === '.css' || extname(e.name) === '.js') out.push(f);
            }
        }
    }
    return out;
}

/** Les bornes des blocs `@media (hover: hover)` déjà présents. */
function zonesProtegees(s) {
    const zones = [];
    const re = /@media[^{]*hover:\s*hover[^{]*\{/g;
    let m;
    while ((m = re.exec(s))) {
        let i = m.index + m[0].length, n = 1;
        while (i < s.length && n > 0) {
            if (s[i] === '{') n++; else if (s[i] === '}') n--;
            i++;
        }
        zones.push([m.index, i]);
    }
    return zones;
}

/**
 * L'indentation de la règle — pour ne pas défigurer un fichier qu'on relit.
 *
 * Elle se prend SUR LE SÉLECTEUR et non sur ce qui précède : le motif attrape
 * la ligne entière, espaces de tête compris, donc l'index du match tombe en
 * début de ligne et le texte d'avant est toujours vide. Première version :
 * toutes les règles réécrites à la colonne zéro, au milieu de blocs indentés
 * de seize espaces.
 */
function indentationDe(selecteurs) {
    const m = /^[^\S\n]*/.exec(selecteurs);
    return m ? m[0] : '';
}

function transformer(source) {
    const zones = zonesProtegees(source);
    const re = /([^\n{}]*:hover[^\n{}]*)\{([^{}]*)\}/g;
    const morceaux = [];
    let dernier = 0, comptes = 0, coupes = 0;
    let m;
    while ((m = re.exec(source))) {
        const [entier, selecteurs, corps] = m;
        if (!APPARENCE.test(corps)) continue;
        if (zones.some(([a, b]) => m.index > a && m.index < b)) continue;
        // Une règle dont le sélecteur commence par `@` n'est pas une règle.
        if (/^\s*@/.test(selecteurs)) continue;

        const parts = selecteurs.split(',').map(x => x.trim()).filter(Boolean);
        const avecSurvol = parts.filter(x => x.includes(':hover'));
        const sans = parts.filter(x => !x.includes(':hover'));
        if (!avecSurvol.length) continue;

        const ind = indentationDe(selecteurs);
        const corpsNet = corps.trim();
        // L'INDENTATION OUVRE LE REMPLACEMENT : le motif attrape la ligne
        // entière, donc `m.index` tombe en colonne zéro et ce qu'on écrit
        // commence là. Sans cette ligne, chaque requête s'ouvrait contre la
        // marge au milieu d'un bloc indenté de seize espaces.
        let remplacement = ind;
        if (sans.length) {
            coupes++;
            remplacement += `${sans.join(', ')} { ${corpsNet} }\n${ind}`;
        }
        remplacement += `@media (hover: hover) {\n${ind}    `
            + `${avecSurvol.join(', ')} { ${corpsNet} }\n${ind}}`;

        morceaux.push(source.slice(dernier, m.index), remplacement);
        dernier = m.index + entier.length;
        comptes++;
    }
    morceaux.push(source.slice(dernier));
    return { texte: morceaux.join(''), comptes, coupes };
}

/** Les fichiers qui portent encore une règle de survol non protégée. */
export function analyser() {
    const out = [];
    for (const f of tousLesFichiers()) {
        const { comptes } = transformer(readFileSync(f, 'utf8'));
        if (comptes) out.push({ fichier: f, comptes });
    }
    return out;
}

if (!LANCE) { /* importé : on se tait */ } else {
let total = 0, coupes = 0, fichiers = 0;
for (const f of tousLesFichiers()) {
    const avant = readFileSync(f, 'utf8');
    const { texte, comptes, coupes: c } = transformer(avant);
    if (!comptes) continue;
    total += comptes; coupes += c; fichiers++;
    console.log(`  ${String(comptes).padStart(4)}  ${f}${c ? `  (dont ${c} à couper)` : ''}`);
    if (!ECRIRE) continue;

    writeFileSync(f, texte);
    // ON RELIT CE QU'ON A ÉCRIT. Une règle mal refermée ne se voit pas à
    // l'oeil dans un fichier de onze mille lignes, et elle emporte tout ce qui
    // la suit.
    let bon = true, pourquoi = '';
    if (extname(f) === '.js') {
        try { execFileSync('node', ['--check', f], { stdio: 'pipe' }); }
        catch (e) { bon = false; pourquoi = String(e.stderr || e).slice(0, 200); }
    }
    const relu = readFileSync(f, 'utf8');
    const ouvre = (relu.match(/\{/g) || []).length, ferme = (relu.match(/\}/g) || []).length;
    const ouvreAvant = (avant.match(/\{/g) || []).length, fermeAvant = (avant.match(/\}/g) || []).length;
    if (ouvre - ouvreAvant !== comptes + coupesDe(comptes, c)
        || ferme - fermeAvant !== comptes + coupesDe(comptes, c)) {
        // On n'exige pas le compte exact — les corps varient — mais l'ÉCART
        // entre ouvrantes et fermantes doit rester le même.
        if ((ouvre - ferme) !== (ouvreAvant - fermeAvant)) {
            bon = false; pourquoi = `accolades déséquilibrées : ${ouvre}/${ferme} `
                + `contre ${ouvreAvant}/${fermeAvant}`;
        }
    }
    if (!bon) {
        writeFileSync(f, avant);
        console.log(`        REMIS EN ÉTAT — ${pourquoi}`);
        process.exitCode = 1;
    }
}
function coupesDe() { return 0; }

console.log(`\n${total} règle(s) de survol dans ${fichiers} fichier(s)`
    + (coupes ? `, dont ${coupes} à sélecteurs mêlés` : '')
    + (ECRIRE ? ' — écrites.' : '. Relancer avec --ecrire.'));
}
