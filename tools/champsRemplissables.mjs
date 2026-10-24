// QUI PORTE DES CHAMPS REMPLISSABLES, ET QUI N'EN PORTE PAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « as-tu prévu des champs remplissables pour tous les exercices (par
// exemple pour les additions posées, ça manque) », « et pour les QCM, il faut
// que le champ remplissable soit une checkbox », « pour le vocabulaire du
// cercle, par exemple, tu n'as pas mis de champs remplissables, du coup il
// faut que tu VÉRIFIES LES EXERCICES ».
//
// LA TROISIÈME PHRASE EST LA DEMANDE. Corriger les deux exercices qu'il cite
// en laisserait trente autres, et l'on recommencerait la semaine suivante avec
// deux nouveaux noms. Ce qu'il faut, c'est la LISTE.
//
// ── COMMENT ON MESURE ──────────────────────────────────────────────────────
//
// Une fiche remplissable passe aux rendus de grille un crayon de plus :
//
//     r.pdfGrille(pdf, item, slot, solution, champ)
//                                            ^^^^^ (x, y, w, h) => …
//
// Un rendu qui l'ignore ne pose aucun champ, et rien ne le signale — le PDF
// sort beau et mort. On appelle donc chaque `pdfGrille` avec un faux jsPDF et
// un crayon ESPION, et l'on compte. C'est la même ruse que
// `tools/caracteresPerdus.mjs` : on n'ouvre pas de navigateur pour savoir ce
// qu'un rendu fait de ses arguments.
//
//     node tools/champsRemplissables.mjs            # la liste complète
//     node tools/champsRemplissables.mjs --muets    # seulement ceux qui manquent
//
// CE QU'IL NE MESURE PAS, ET IL FAUT LE DIRE : qu'un champ soit au BON ENDROIT.
// Il dit qu'il y en a, pas qu'ils tombent sur les cases. Pour cela il n'y a que
// `tools/pdfEnImage.mjs` et des yeux.

import { exercices } from '../js/data/catalog.js';
import { fauxPdf, poserUnDocumentDeSecours, SLOT_ESSAI } from './fauxPdf.mjs';

// Les rendus touchent `document` au chargement : on leur en donne un qui ne
// sert à rien.
poserUnDocumentDeSecours();

const { RENDUS } = await import('../js/ui/printSheet.js');
const { getGenerator } = await import('../js/core/registry.js');
await import('../js/core/activities/index.js');
const { makeRng } = await import('../js/core/ids.js');

/** Tire un item comme la feuille le ferait. */
function tirer(exo, i) {
    const gen = getGenerator(exo.printGeneratorId || exo.generatorId);
    if (!gen) return null;
    return gen.generate({ ...(exo.params || {}), ...(exo.printParams || {}) },
        { index: i, total: 4, rng: makeRng(`champ-${exo.id}-${i}`), papier: true,
            themesExclus: [] });
}

const SLOT = SLOT_ESSAI;

const muetsSeuls = process.argv.includes('--muets');
const lignes = [];
let avec = 0, sans = 0, casses = 0;

for (const exo of exercices) {
    if (!exo.printable || !RENDUS[exo.printable]) continue;
    const rendu = RENDUS[exo.printable];
    if (typeof rendu.pdfGrille !== 'function') continue;
    let poses = 0, erreur = null;
    // LE CRAYON ESPION A LES DEUX MÉTIERS DU VRAI : écrire et cocher. Sans
    // `coche`, un QCM dessiné par la porte des grilles — « Le point est-il
    // dessus ? » — serait compté « AUCUN CHAMP » alors qu'il en pose quatre.
    const champ = () => { poses++; return true; };
    champ.coche = () => { poses++; return true; };
    try {
        // Deux tirages : un exercice peut poser des champs sur une question et
        // pas sur une autre — un QCM à dessin, par exemple.
        for (let i = 0; i < 2; i++) {
            const item = tirer(exo, i);
            if (!item) { erreur = 'pas de générateur'; break; }
            rendu.pdfGrille(fauxPdf(), item, { ...SLOT, numero: i + 1, rang: i }, false, champ);
        }
    } catch (e) {
        erreur = String(e.message || e).slice(0, 70);
    }
    if (erreur) casses++;
    else if (poses > 0) avec++;
    else sans++;
    lignes.push({ id: exo.id, titre: exo.title || '', rendu: exo.printable, poses, erreur });
}

const RESET = '\x1b[0m', VERT = '\x1b[32m', ROUGE = '\x1b[31m', JAUNE = '\x1b[33m';
console.log('\n\x1b[1mLES CHAMPS REMPLISSABLES, RENDU PAR RENDU\x1b[0m\n');
// On groupe par RENDU : c'est lui qui pose les champs, pas l'exercice, et deux
// exercices du même rendu ont forcément le même sort. Corriger un rendu
// corrige toute sa colonne.
const parRendu = new Map();
for (const l of lignes) {
    if (!parRendu.has(l.rendu)) parRendu.set(l.rendu, []);
    parRendu.get(l.rendu).push(l);
}
// ON NE LIT PLUS LE PREMIER EXERCICE POUR TOUS LES AUTRES.
//
// C'était `l[0].poses` — le compte du PREMIER exercice du rendu, affiché pour
// le rendu entier. Mesuré : le rendu `repere` affichait « AUCUN CHAMP » alors
// que « Lire des Coordonnées » en posait douze, parce que son voisin « Placer
// un Point » — qui n'en pose aucun, et ne le DOIT pas, on y trace une croix —
// passait en premier dans le catalogue. Un tableau de bord qui déclare mort un
// exercice vivant fait chercher un défaut là où il n'y en a pas.
//
// Deux exercices du même rendu peuvent légitimement différer : c'est le MODE
// qui change (lire / placer, lire / écrire), pas le rendu. On montre donc le
// compte de CHACUN.
const compteDu = (l) => Math.max(...l.map(x => x.poses));
const tries = [...parRendu.entries()].sort((a, b) =>
    (compteDu(a[1]) > 0) - (compteDu(b[1]) > 0) || a[0].localeCompare(b[0]));
for (const [rendu, l] of tries) {
    const n = compteDu(l), err = l.find(x => x.erreur);
    if (muetsSeuls && n > 0 && !err) continue;
    const marque = err ? `${JAUNE}?   ${RESET}` : (n > 0 ? `${VERT}ok  ${RESET}` : `${ROUGE}non ${RESET}`);
    const tous = l.every(x => x.poses > 0);
    console.log(`  ${marque}${rendu.padEnd(22)} ${err ? err
        : (n > 0 ? `${n} champ(s)${tous ? '' : ' — mais pas pour tous'}` : 'AUCUN CHAMP')}`);
    l.forEach(x => console.log(`        · ${x.id.padEnd(28)} « ${x.titre} »`
        + `${l.length > 1 ? `  [${x.poses}]` : ''}`));
}

console.log('\n' + '─'.repeat(74));
console.log(`  ${VERT}${avec}${RESET} exercice(s) posent des champs · `
    + `${ROUGE}${sans}${RESET} n'en posent aucun · ${JAUNE}${casses}${RESET} n'ont pas pu être mesurés`);
console.log(`  ${parRendu.size} rendus de grille au total.`);
