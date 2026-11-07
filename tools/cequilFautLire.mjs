// CE QU'UN ÉLÈVE DOIT LIRE AVANT D'ÊTRE AIDÉ — compté, exercice par exercice.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « évidemment un élève qui galère c'est aussi un élève qui peut avoir
// du mal à lire, le but est qu'il comprenne. Mais surtout une aide doit être
// visuelle et pas trop longue en explication COMME C'EST PARFOIS LE CAS POUR
// CERTAINS EXERCICES ».
//
// « CERTAINS EXERCICES » : LESQUELS ? On ne le sait pas, on le croit. Et c'est
// exactement la friction écrite la veille — la sonde sait mesurer une couleur
// (`contrasteRendu`) et un crochet (`doitExister`), pas une PHRASE. Un
// paragraphe de quarante mots sous une question se regarde sans se compter :
// j'en ai livré un la veille après avoir pris sa photo.
//
// CE QUE CET OUTIL COMPTE, et pourquoi ces trois-là :
//
//   · LES INDICES (`hints`) — ce que l'élève reçoit quand il demande de
//     l'aide, un à la fois (voir `itemSession.hint`). C'est l'aide au sens de
//     Rémy ;
//   · L'EXPLICATION (`explanation`) — ce qu'il lit après s'être trompé. C'est
//     le moment où il lit le moins bien ;
//   · LE SCHÉMA (`schemas[i]`) — le dessin que le logiciel sait déjà poser
//     SOUS un indice. Le mécanisme existe depuis longtemps ; la question est
//     combien d'exercices s'en servent. C'est la réponse à « une aide doit
//     être visuelle ».
//
// ON TIRE DE VRAIES QUESTIONS, plusieurs par générateur et à plusieurs rangs :
// les indices dépendent du tirage, et un exercice peut être court sur une
// question et bavard sur la suivante.
//
// LES JEUX N'ONT PAS DE GÉNÉRATEUR — ils ont un plateau et un bouton « Aide ».
// Leur conseil est une fonction de `js/core/`, dont la signature change à
// chaque jeu : on ne peut pas les appeler toutes. On lit donc leurs phrases
// dans la source, ce qui est moins sûr et le dit.
//
//   node tools/cequilFautLire.mjs             les 25 plus bavards
//   node tools/cequilFautLire.mjs --tout      tout le catalogue, classé
//   node tools/cequilFautLire.mjs <morceau>   un exercice, avec ses textes
//
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { nu, mots, pave, repetee } from './mesureDuTexte.mjs';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const ambre = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const gras = (t) => `\x1b[1m${t}\x1b[0m`;

// LES SEUILS, ET D'OÙ ILS SORTENT. Le verdict du tableau croisé tient en trois
// mots depuis que Rémy l'a tranché ; son conseil écrit en faisait vingt-six, et
// l'explication qu'il a refusée trente-deux. On prend donc : jusqu'à quinze, ça
// se lit d'un coup d'œil ; jusqu'à vingt-cinq, c'est une phrase qu'il faut
// vouloir lire ; au-delà, c'est un paragraphe, et c'est ce dont il parle.
const COUP_D_OEIL = 15;
const PARAGRAPHE = 25;

const teinte = (n) => (n > PARAGRAPHE ? rouge : n > COUP_D_OEIL ? ambre : vert)(String(n).padStart(3));

// ── LES GÉNÉRATEURS : ON TIRE DE VRAIES QUESTIONS ──────────────────────────

await import(path.join(RACINE, 'js/core/activities/index.js'));
const { allGenerators } = await import(path.join(RACINE, 'js/core/registry.js'));
const { makeRng } = await import(path.join(RACINE, 'js/core/ids.js'));
const { exercices } = await import(path.join(RACINE, 'js/data/catalog.js'));

// LE NOM QUE RÉMY VOIT, ET SURTOUT : CET EXERCICE EST-IL À L'ÉCRAN ?
//
// LA PREMIÈRE ÉCRITURE DE CET OUTIL A MENTI, et elle l'a fait de la pire
// façon — en répondant quelque chose. Elle lisait un export `EXERCISES` qui
// n'existe pas (c'est `exercices`), donc AUCUN exercice n'avait de nom, et
// surtout les générateurs de FEUILLE IMPRIMÉE restaient dans le classement.
// Ils en occupaient les sept premières places : une consigne de feuille fait
// quatre-vingts mots, et c'est très bien — on la lit assis, le papier sous
// les yeux. Rémy parle de ce qu'on lit DEVANT L'ÉCRAN, en étant bloqué.
const nomsParGenerateur = new Map();
const aPapier = new Set();
for (const exo of exercices) {
    if (exo.generatorId && !nomsParGenerateur.has(exo.generatorId)) {
        nomsParGenerateur.set(exo.generatorId, exo.title || exo.id);
    }
    if (exo.printGeneratorId) aPapier.add(exo.printGeneratorId);
}

const releves = [];
for (const g of allGenerators()) {
    // CE QUI NE SE JOUE PAS À L'ÉCRAN NE COMPTE PAS ICI. Un générateur qui
    // n'est le `generatorId` d'aucun exercice ne sort que sur du papier.
    if (!nomsParGenerateur.has(g.id)) continue;
    const indices = [];
    const explications = [];
    let avecSchema = 0;
    let tirages = 0;
    for (const graine of ['a', 'b', 'c']) {
        for (const rang of [0, 2, 5]) {
            let it;
            try {
                it = g.generate({}, { rng: makeRng(`lire-${g.id}-${graine}`), index: rang, total: 8 });
            } catch (e) { continue; }
            if (!it) continue;
            tirages++;
            (it.hints || []).forEach((h, i) => {
                const n = pave(h);
                if (n) indices.push({ n, mots: mots(h), t: nu(h), rang: i, redit: repetee(h) });
                if (it.schemas && it.schemas[i]) avecSchema++;
            });
            if (it.explanation) {
                explications.push({
                    n: pave(it.explanation), mots: mots(it.explanation),
                    t: nu(it.explanation), redit: repetee(it.explanation)
                });
            }
        }
    }
    if (!tirages) continue;
    const pire = (l) => l.reduce((a, b) => (b.n > (a ? a.n : -1) ? b : a), null);
    releves.push({
        id: g.id,
        nom: nomsParGenerateur.get(g.id) || g.id,
        indices: indices.length,
        pireIndice: pire(indices),
        pireExplication: pire(explications),
        schemas: avecSchema,
        // CE QUE L'ÉLÈVE TRAVERSE EN DEMANDANT TOUTE L'AIDE D'UNE QUESTION :
        // les indices se prennent un par un, mais il les prend tous quand il
        // ne comprend pas.
        totalParQuestion: indices.length
            ? Math.round(indices.reduce((s, h) => s + h.n, 0) / Math.max(1, tirages))
            : 0
    });
}

// ── LES JEUX : ON LIT LEURS PHRASES DANS LA SOURCE ─────────────────────────
//
// MOINS SÛR, ET ÇA SE DIT. Une phrase recollée à partir de six morceaux et
// d'une variable est comptée morceau par morceau : le compte est un plancher,
// jamais un plafond. C'est suffisant pour CLASSER.
const jeux = [];
for (const f of readdirSync(path.join(RACINE, 'js/core'))) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(path.join(RACINE, 'js/core', f), 'utf8');
    const debut = src.search(/export function (conseil|direConseil)\b/);
    if (debut < 0) continue;
    // Le corps de la fonction, jusqu'à l'accolade de fin en colonne zéro.
    const fin = src.indexOf('\n}', debut);
    const corps = src.slice(debut, fin < 0 ? src.length : fin);
    // LES MORCEAUX DE TEXTE, et seulement eux : on écarte ce qui est du code
    // (un sélecteur, une classe, une clé) en exigeant une espace et une
    // minuscule accentuable — une phrase française, pas un identifiant.
    const bouts = [...corps.matchAll(/'((?:[^'\\]|\\.){12,})'|`((?:[^`\\$]|\\.){12,})`/g)]
        .map(m => (m[1] || m[2]).replace(/\\'/g, '\''))
        .filter(t => / [a-zà-ÿ]/.test(t));
    if (!bouts.length) continue;
    const total = bouts.reduce((s, t) => s + mots(t), 0);
    jeux.push({
        fichier: `js/core/${f}`,
        morceaux: bouts.length,
        total,
        pire: bouts.reduce((a, b) => (mots(b) > mots(a) ? b : a), '')
    });
}

// ── LE CLASSEMENT ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const tout = args.includes('--tout');
const cherche = args.find(a => !a.startsWith('--'));

if (cherche) {
    const r = releves.filter(x => (x.id + ' ' + x.nom).toLowerCase().includes(cherche.toLowerCase()));
    if (!r.length) {
        console.log(rouge(`Aucun exercice ne contient « ${cherche} ».`));
        process.exit(1);
    }
    for (const x of r) {
        console.log(`\n${gras(x.nom)} ${gris(x.id)}`);
        const g = allGenerators().find(y => y.id === x.id);
        const it = g.generate({}, { rng: makeRng(`lire-${x.id}-a`), index: 0, total: 8 });
        const dit = (quoi, t, s) => {
            const r = repetee(t);
            console.log(`  ${quoi} ${teinte(pave(t))} mots d'un trait `
                + gris(`(${mots(t)} en tout)`) + s + (r ? rouge(` · une phrase ×${r.fois}`) : '')
                + `\n     ${nu(t)}`);
        };
        (it.hints || []).forEach((h, i) => dit(`indice ${i + 1}`, h,
            it.schemas && it.schemas[i] ? vert(' + schéma') : gris(' · sans dessin')));
        if (it.explanation) dit('explication', it.explanation, '');
    }
    process.exit(0);
}

const pire = (x) => Math.max(x.pireIndice ? x.pireIndice.n : 0,
    x.pireExplication ? x.pireExplication.n : 0);
const classe = releves.filter(x => pire(x) > 0).sort((a, b) => pire(b) - pire(a));

console.log(gras('\nCE QU\'UN ÉLÈVE DOIT LIRE POUR ÊTRE AIDÉ'));
console.log(gris(`  ${classe.length} exercices À L'ÉCRAN · vert ≤ ${COUP_D_OEIL} mots · `
    + `ambre ≤ ${PARAGRAPHE} · rouge au-delà`));
console.log(gris('  (les générateurs de FEUILLE sont écartés : on les lit assis)\n'));
console.log(gris('  pavé  expl.  redit  dessin   exercice'));
for (const x of (tout ? classe : classe.slice(0, 25))) {
    const d = x.schemas ? vert('  oui ') : rouge('  non ');
    const r = [x.pireIndice, x.pireExplication].find(y => y && y.redit);
    console.log(`  ${teinte(x.pireIndice ? x.pireIndice.n : 0)}  `
        + `${teinte(x.pireExplication ? x.pireExplication.n : 0)}  `
        + `${r ? rouge(` ×${r.redit.fois} `) : '     '}  ${d}  ${x.nom} ${gris(x.id)}`);
}

const redits = classe.filter(x => [x.pireIndice, x.pireExplication].some(y => y && y.redit));
const rouges = classe.filter(x => pire(x) > PARAGRAPHE);
const sansDessin = classe.filter(x => !x.schemas);
console.log('');
console.log(`  ${rouge(String(rouges.length))} exercices ont un PAVÉ de plus de ${PARAGRAPHE} mots d'un trait`);
console.log(`  ${rouge(String(redits.length))} répètent la MÊME PHRASE dans une seule aide`);
console.log(`  ${rouge(String(sansDessin.length))} sur ${classe.length} n'ont AUCUN dessin sous leurs indices`);
console.log(gris('  (le logiciel sait en poser un : item.schemas[i], voir core/items.js)'));

console.log(gras('\nLES JEUX — leur bouton « Aide » (compté dans la source, c\'est un plancher)'));
console.log(gris('  pire  tout  morceaux  module\n'));
for (const j of jeux.sort((a, b) => pave(b.pire) - pave(a.pire)).slice(0, tout ? 99 : 12)) {
    console.log(`  ${teinte(pave(j.pire))}  ${String(j.total).padStart(4)}  `
        + `${String(j.morceaux).padStart(8)}  ${j.fichier}`);
}
console.log(gris(`\n  node tools/cequilFautLire.mjs <morceau du nom> pour lire les phrases d'un exercice.`));
