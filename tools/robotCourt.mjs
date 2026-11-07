// CE QUE LE ROBOT DIT TIENT-IL EN UNE BULLE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « vérifier le bon fonctionnement du robot pour tous les exercices et
// pour avoir le bon rythme et des bonnes explications courtes, et concises ».
// Puis, devant la liste des défauts : « il faut tout corriger ».
//
// LA RÈGLE EXISTE DEPUIS LONGTEMPS, ET ELLE N'ÉTAIT NULLE PART. Elle est
// écrite dans `js/core/activities/choice.js` : `const COURT = 110` — « une
// bulle se lit à 340 ms le mot : une explication de trois lignes fige la
// démonstration au point qu'on la croit plantée ». Mesuré : elle est recopiée
// à la main dans TROIS fichiers sur cent six. Partout ailleurs, rien ne
// l'applique, et l'on y trouve des bulles de 110 à 243 caractères.
//
// POURQUOI UN OUTIL ET NON UNE TRONCATURE AU VOL. On pourrait couper la phrase
// dans `say()`. On ne le fait pas : amputer en silence la phrase qu'un
// professeur a écrite est exactement le genre de correction qu'on ne voit
// jamais. On la NOMME, ici, avec son fichier et sa ligne, et quelqu'un la
// réécrit.
//
// CE QU'IL REGARDE :
//
//   1. LES BULLES LITTÉRALES de plus de 110 caractères. On ne lit que les
//      chaînes écrites en toutes lettres — un gabarit `${…}` ne se mesure pas
//      sans l'exécuter, et l'on préfère ne rien dire à dire faux. La longueur
//      annoncée est donc un MINIMUM.
//   2. LES CLÉS DE `DEMO_SPEED` QUI N'EXISTENT PAS. `DEMO_SPEED.step` est
//      écrit dans trois jeux et ne vaut rien : `undefined` traverse les
//      appels sans un mot.
//   3. `DEMO_SPEED` PRIS POUR UN NOMBRE. « DEMO_SPEED * 2 » vaut NaN —
//      c'est un tableau de durées nommées. Le piège est documenté en tête de
//      `demoPointer.js` et il est encore là.
//
//   node tools/robotCourt.mjs            # la liste
//   node tools/robotCourt.mjs --compte   # juste les chiffres
//
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const COURT = 110;
/** Les durées que `DEMO_SPEED` porte vraiment (voir demoPointer.js). */
export const CLES_VITESSE = ['move', 'press', 'settle', 'drag', 'between'];

const DOSSIERS = ['js/games', 'js/core/activities', 'js/core'];

/** Tous les fichiers où un robot peut parler. */
export function fichiersDuRobot(racine = new URL('..', import.meta.url).pathname) {
    const out = [];
    for (const d of DOSSIERS) {
        let noms;
        try { noms = readdirSync(join(racine, d)); } catch (e) { continue; }
        for (const n of noms) {
            if (!n.endsWith('.js')) continue;
            const chemin = join(d, n);
            const src = readFileSync(join(racine, chemin), 'utf8');
            if (/\.say\(|DEMO_SPEED/.test(src)) out.push({ chemin, src });
        }
    }
    return out;
}

/**
 * Les bulles littérales trop longues d'un fichier.
 *
 * ON NE MESURE QUE CE QUI EST ÉCRIT EN TOUTES LETTRES. Une chaîne à gabarit
 * porte des valeurs qu'on ne connaît qu'à l'exécution ; la compter avec ses
 * `${…}` donnerait un chiffre faux dans les deux sens. On la laisse à la
 * sonde, qui la lit vraiment.
 */
export function bullesTropLongues(source) {
    const src = sansCommentaires(source);
    const out = [];
    // `say(` précédé de n'importe quel receveur (`cur`, `cursor`, `this.cur`…),
    // puis une chaîne simple ou une suite de chaînes concaténées.
    const re = /\.say\(\s*((?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")(?:\s*\+\s*(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"))*)/g;
    let m;
    while ((m = re.exec(src))) {
        // On recolle les morceaux et l'on enlève les guillemets de chacun.
        const texte = m[1].split(/\s*\+\s*/)
            .map((t) => t.slice(1, -1).replace(/\\'/g, '\'').replace(/\\"/g, '"'))
            .join('');
        if (texte.length > COURT) {
            out.push({ pos: m.index, n: texte.length, texte });
        }
    }
    return out;
}

/** Les emplois fautifs de `DEMO_SPEED`. */
export function vitessesFausses(source) {
    const src = sansCommentaires(source);
    const out = [];
    let m;
    const cle = /DEMO_SPEED\.([a-zA-Z_$][\w$]*)/g;
    while ((m = cle.exec(src))) {
        if (!CLES_VITESSE.includes(m[1])) {
            out.push({ pos: m.index, quoi: `DEMO_SPEED.${m[1]}`,
                pourquoi: `n'existe pas — les durées sont ${CLES_VITESSE.join(', ')}` });
        }
    }
    // Pris pour un nombre : une opération arithmétique directement dessus.
    const calcul = /DEMO_SPEED\s*[*/%-]|[*/%]\s*DEMO_SPEED\b/g;
    while ((m = calcul.exec(src))) {
        out.push({ pos: m.index, quoi: m[0].trim(),
            pourquoi: 'DEMO_SPEED est un tableau de durées, pas un facteur : le calcul rend NaN' });
    }
    return out;
}

/**
 * LE CODE SANS SES COMMENTAIRES, LES POSITIONS INTACTES.
 *
 * MON PROPRE OUTIL A MENTI AU PREMIER ESSAI : il comptait, comme faute,
 * `demoPointer.js:541` — qui est le COMMENTAIRE racontant précisément ce
 * piège (« cinq jeux écrivaient gate.wait(2500 * DEMO_SPEED) »). Un harnais
 * qui accuse la phrase expliquant le défaut apprend à ignorer ses alertes, et
 * c'est la deuxième fois de la journée : une épreuve avait déjà trébuché sur
 * le commentaire expliquant ce qu'on venait de retirer.
 *
 * ON REMPLACE PAR DES ESPACES plutôt que de couper : les décalages restent
 * exacts, donc les numéros de ligne aussi. Et l'on saute les chaînes, sinon un
 * `'http://…'` emporterait la fin de sa ligne.
 */
export function sansCommentaires(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const c = src[i], d = src[i + 1];
        if (c === '/' && d === '/') {
            while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
        } else if (c === '/' && d === '*') {
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
                out += src[i] === '\n' ? '\n' : ' '; i++;
            }
            out += '  '; i += 2;
        } else if (c === '\'' || c === '"' || c === '`') {
            out += c; i++;
            while (i < src.length && src[i] !== c) {
                if (src[i] === '\\') { out += src[i]; i++; if (i < src.length) { out += src[i]; i++; } continue; }
                out += src[i]; i++;
            }
            if (i < src.length) { out += src[i]; i++; }
        } else { out += c; i++; }
    }
    return out;
}

const ligneDe = (src, pos) => src.slice(0, pos).split('\n').length;

// ── LE RAPPORT ──────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
    const vert = (t) => `\x1b[32m${t}\x1b[0m`;
    const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
    const jaune = (t) => `\x1b[33m${t}\x1b[0m`;
    const gris = (t) => `\x1b[90m${t}\x1b[0m`;
    const seulementLeCompte = process.argv.includes('--compte');

    const fichiers = fichiersDuRobot();
    let bulles = 0, vitesses = 0, fautifs = 0;
    const lignes = [];
    for (const { chemin, src } of fichiers) {
        const b = bullesTropLongues(src);
        const v = vitessesFausses(src);
        if (!b.length && !v.length) continue;
        fautifs++;
        bulles += b.length;
        vitesses += v.length;
        lignes.push({ chemin, b, v, src });
    }

    console.log(`\n\x1b[1mLE ROBOT, EN ${fichiers.length} FICHIERS\x1b[0m`);
    console.log(`  ${bulles ? rouge(bulles + ' bulle(s) de plus de ' + COURT + ' caractères')
        : vert('aucune bulle trop longue')}`
        + ` · ${vitesses ? rouge(vitesses + ' emploi(s) fautif(s) de DEMO_SPEED')
            : vert('DEMO_SPEED toujours bien employé')}`
        + gris(`  (${fautifs} fichier(s))`));

    if (!seulementLeCompte) {
        lignes.sort((a, b) => (b.b.length + b.v.length) - (a.b.length + a.v.length));
        for (const { chemin, b, v, src } of lignes) {
            console.log(`\n\x1b[1m${chemin}\x1b[0m`);
            for (const x of v) {
                console.log(`  ${rouge('vitesse')} :${ligneDe(src, x.pos)}  ${x.quoi}`
                    + gris(` — ${x.pourquoi}`));
            }
            for (const x of b.sort((p, q) => q.n - p.n)) {
                console.log(`  ${jaune(String(x.n).padStart(3) + ' car.')} :${ligneDe(src, x.pos)}`
                    + gris(`  « ${x.texte.slice(0, 64)}… »`));
            }
        }
    }
    console.log(bulles + vitesses
        ? rouge(`\n${bulles + vitesses} chose(s) à corriger.`)
        : vert('\nLE ROBOT PARLE COURT, ET SES DURÉES EXISTENT.'));
    process.exit(bulles + vitesses ? 1 : 0);
}
