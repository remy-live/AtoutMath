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

// Les rendus touchent `document` au chargement : on leur en donne un qui ne
// sert à rien.
globalThis.document = globalThis.document || {
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }) }) })
};
globalThis.window = globalThis.window || { localStorage: null, matchMedia: null };

const { RENDUS } = await import('../js/ui/printSheet.js');
const { getGenerator } = await import('../js/core/registry.js');
await import('../js/core/activities/index.js');
const { makeRng } = await import('../js/core/ids.js');

/**
 * UN FAUX jsPDF QUI DIT OUI À TOUT.
 *
 * Les rendus appellent une quarantaine de méthodes de dessin et quelques-unes
 * qui RENDENT quelque chose. Les énumérer serait une liste à tenir à jour ;
 * un `Proxy` répond à tout, et l'on ne nomme que celles dont la valeur compte.
 */
function fauxPdf() {
    const vrai = {
        getTextWidth: (t) => String(t || '').length * 1.9,
        getStringUnitWidth: (t) => String(t || '').length * 0.5,
        splitTextToSize: (t) => [String(t || '')],
        getFontSize: () => 10,
        getLineHeight: () => 12,
        internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 },
            getFontSize: () => 10, scaleFactor: 2.8346 },
        getNumberOfPages: () => 1
    };
    return new Proxy(vrai, {
        get(cible, clef) {
            if (clef in cible) return cible[clef];
            // Tout le reste est un crayon : il dessine et ne rend rien.
            return () => undefined;
        }
    });
}

/** Tire un item comme la feuille le ferait. */
function tirer(exo, i) {
    const gen = getGenerator(exo.printGeneratorId || exo.generatorId);
    if (!gen) return null;
    return gen.generate({ ...(exo.params || {}), ...(exo.printParams || {}) },
        { index: i, total: 4, rng: makeRng(`champ-${exo.id}-${i}`), papier: true,
            themesExclus: [] });
}

const SLOT = { x: 12, y: 30, taille: 4, boite: { x: 12, y: 30, w: 86, h: 60 },
    numero: 1, tous: null, rang: 0 };

const muetsSeuls = process.argv.includes('--muets');
const lignes = [];
let avec = 0, sans = 0, casses = 0;

for (const exo of exercices) {
    if (!exo.printable || !RENDUS[exo.printable]) continue;
    const rendu = RENDUS[exo.printable];
    if (typeof rendu.pdfGrille !== 'function') continue;
    let poses = 0, erreur = null;
    const champ = () => { poses++; return true; };
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
const tries = [...parRendu.entries()].sort((a, b) =>
    (a[1][0].poses > 0) - (b[1][0].poses > 0) || a[0].localeCompare(b[0]));
for (const [rendu, l] of tries) {
    const n = l[0].poses, err = l.find(x => x.erreur);
    if (muetsSeuls && n > 0 && !err) continue;
    const marque = err ? `${JAUNE}?   ${RESET}` : (n > 0 ? `${VERT}ok  ${RESET}` : `${ROUGE}non ${RESET}`);
    console.log(`  ${marque}${rendu.padEnd(22)} ${err ? err
        : (n > 0 ? `${n} champ(s)` : 'AUCUN CHAMP')}`);
    l.forEach(x => console.log(`        · ${x.id.padEnd(28)} « ${x.titre} »`));
}

console.log('\n' + '─'.repeat(74));
console.log(`  ${VERT}${avec}${RESET} exercice(s) posent des champs · `
    + `${ROUGE}${sans}${RESET} n'en posent aucun · ${JAUNE}${casses}${RESET} n'ont pas pu être mesurés`);
console.log(`  ${parRendu.size} rendus de grille au total.`);
