// OÙ L'ÉLÈVE ÉCRIT-IL, SUR CETTE FEUILLE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je voudrais que tous les exercices qui peuvent prétendre à un champ
// remplissable puissent y avoir le droit ».
//
// `tools/champsRemplissables.mjs` dit QUI n'en pose aucun — soixante rendus.
// Il ne dit pas lesquels le PEUVENT, et c'est toute la difficulté : on ne met
// pas de champ sur un labyrinthe qu'on traverse au crayon, ni sur un memory
// qu'on découpe. Lire soixante fonctions de dessin pour trancher, c'est
// soixante occasions de se tromper — et l'erreur ne se verrait pas.
//
// ── LA MESURE QUI RÉPOND À LA QUESTION ────────────────────────────────────
//
// Un rendu se dessine DEUX FOIS, avec le même item :
//
//     r.pdfGrille(pdf, item, slot, false)   → la feuille de l'élève
//     r.pdfGrille(pdf, item, slot, true)    → le corrigé
//
// Ce que le corrigé ÉCRIT et que la feuille n'écrit pas, c'est précisément ce
// que l'élève a à écrire. Donc : l'endroit d'un champ remplissable, avec ses
// coordonnées. Et un rendu dont le corrigé n'ajoute aucun texte ne peut pas
// porter de champ — la réponse y est un tracé, un coloriage ou un découpage.
//
// On compare les APPELS, pas des pixels : un faux jsPDF note chaque `text`
// avec sa position, et l'on retranche l'une des deux listes de l'autre.
//
//     node tools/ouEcritLEleve.mjs             # tous les rendus sans champ
//     node tools/ouEcritLEleve.mjs pyramide    # le détail d'un rendu
//     node tools/ouEcritLEleve.mjs --tous      # y compris ceux qui en ont déjà
//
// CE QU'IL NE DIT PAS : la TAILLE de la boîte à poser. Il donne le point où
// la réponse s'écrit ; la largeur se prend dans la géométrie du rendu, et
// c'est la seule chose qui reste à faire à la main.

import { exercices } from '../js/data/catalog.js';
import { fauxPdf as pdfQuiNote, poserUnDocumentDeSecours, SLOT_ESSAI } from './fauxPdf.mjs';

// Les rendus touchent `document` au chargement : on leur en donne un qui ne
// sert à rien. C'est le prix d'un module d'interface importé hors navigateur.
poserUnDocumentDeSecours();

const { RENDUS } = await import('../js/ui/printSheet.js');
const { getGenerator } = await import('../js/core/registry.js');
await import('../js/core/activities/index.js');
const { makeRng } = await import('../js/core/ids.js');

// Le faux jsPDF et l'emplacement d'essai sont communs : voir `tools/fauxPdf.mjs`,
// qui dit pourquoi ils ne vivent plus en trois copies.
const SLOT = SLOT_ESSAI;

/** Tire un item comme la feuille le ferait. La MÊME graine pour les deux passes. */
function tirer(exo, i) {
    const gen = getGenerator(exo.printGeneratorId || exo.generatorId);
    if (!gen) return null;
    return gen.generate({ ...(exo.params || {}), ...(exo.printParams || {}) },
        { index: i, total: 4, rng: makeRng(`ouecrit-${exo.id}-${i}`), papier: true,
            themesExclus: [] });
}

/**
 * Ce que le corrigé écrit en plus de la feuille.
 *
 * ON COMPARE SUR LE TEXTE SEUL, pas sur la position : un corrigé déplace
 * parfois tout d'un millimètre (une ligne de réponse qui devient une ligne
 * écrite), et comparer les coordonnées rendrait alors « tout est différent ».
 * Le texte, lui, ne ment pas — et c'est lui qui désigne la réponse.
 */
function ceQueLeCorrigeAjoute(rendu, item) {
    const vide = pdfQuiNote(), plein = pdfQuiNote();
    rendu.pdfGrille(vide, item, SLOT, false, null);
    rendu.pdfGrille(plein, item, SLOT, true, null);
    const dejaLa = new Map();
    for (const e of vide.carnet.textes) dejaLa.set(e.t, (dejaLa.get(e.t) || 0) + 1);
    const neufs = [];
    for (const e of plein.carnet.textes) {
        const reste = dejaLa.get(e.t) || 0;
        if (reste > 0) { dejaLa.set(e.t, reste - 1); continue; }
        neufs.push(e);
    }
    return {
        neufs,
        traitsEnPlus: plein.carnet.traits.length - vide.carnet.traits.length,
        rectsEnPlus: plein.carnet.rects.length - vide.carnet.rects.length
    };
}

/** Le rendu pose-t-il déjà des champs ? (même mesure que `champsRemplissables`) */
function poseDejaDesChamps(rendu, item) {
    let n = 0;
    // Le crayon espion sait écrire ET cocher, comme le vrai : voir
    // `champ.coche` dans `ficheRendu.js`.
    const champ = () => { n++; };
    champ.coche = () => { n++; };
    try { rendu.pdfGrille(pdfQuiNote(), item, SLOT, false, champ); } catch (e) { /* vu ailleurs */ }
    return n;
}

const argument = process.argv.slice(2).filter(a => !a.startsWith('--'))[0] || null;
const tous = process.argv.includes('--tous');

// Un rendu par ligne, avec le premier exercice qui s'en sert.
const parRendu = new Map();
for (const exo of exercices) {
    if (!exo.printable || !RENDUS[exo.printable]) continue;
    if (typeof RENDUS[exo.printable].pdfGrille !== 'function') continue;
    if (!parRendu.has(exo.printable)) parRendu.set(exo.printable, []);
    parRendu.get(exo.printable).push(exo);
}

const RESET = '\x1b[0m', VERT = '\x1b[32m', ROUGE = '\x1b[31m', JAUNE = '\x1b[33m', GRAS = '\x1b[1m';
const aFaire = [], nePeutPas = [], dejaFait = [], casses = [];

for (const [cle, exos] of [...parRendu.entries()].sort()) {
    if (argument && cle !== argument) continue;
    const rendu = RENDUS[cle];
    let item = null, vu = null, erreur = null;
    try {
        item = tirer(exos[0], 0);
        if (!item) throw new Error('pas de générateur');
        vu = ceQueLeCorrigeAjoute(rendu, item);
    } catch (e) {
        erreur = String((e && e.message) || e).slice(0, 90);
    }
    if (erreur) { casses.push({ cle, exos, erreur }); continue; }
    const dejaN = poseDejaDesChamps(rendu, item);
    const ligne = { cle, exos, vu, dejaN };
    if (dejaN > 0) dejaFait.push(ligne);
    else if (vu.neufs.length > 0) aFaire.push(ligne);
    else nePeutPas.push(ligne);
}

const nommer = (l) => `${l.cle.padEnd(22)} ${l.exos.map(e => e.title || e.id).join(' · ').slice(0, 58)}`;

if (argument) {
    // LE DÉTAIL D'UN RENDU : c'est ce qu'on lit avant d'écrire la correction.
    for (const l of [...aFaire, ...nePeutPas, ...dejaFait]) {
        console.log(`\n${GRAS}${l.cle}${RESET} — ${l.exos.map(e => e.title).join(', ')}`);
        console.log(`  champs déjà posés : ${l.dejaN}`);
        console.log(`  le corrigé ajoute ${l.vu.neufs.length} texte(s), `
            + `${l.vu.traitsEnPlus} trait(s), ${l.vu.rectsEnPlus} rectangle(s)`);
        l.vu.neufs.slice(0, 20).forEach(e =>
            console.log(`    « ${e.t.slice(0, 40)} »  en (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`));
        if (l.vu.neufs.length > 20) console.log(`    … et ${l.vu.neufs.length - 20} autres`);
    }
    for (const c of casses) console.log(`\n${JAUNE}${c.cle}${RESET} : ${c.erreur}`);
    process.exit(0);
}

console.log(`\n${GRAS}CE QUE LE CORRIGÉ ÉCRIT ET QUE L'ÉLÈVE DOIT ÉCRIRE${RESET}`);

console.log(`\n${ROUGE}${GRAS}À FAIRE — le corrigé écrit une réponse, et aucun champ ne l'attend`
    + `${RESET}  (${aFaire.length})`);
for (const l of aFaire.sort((a, b) => b.vu.neufs.length - a.vu.neufs.length)) {
    console.log(`  ${String(l.vu.neufs.length).padStart(3)} réponse(s)  ${nommer(l)}`);
}

console.log(`\n${VERT}${GRAS}DÉJÀ FAIT${RESET}  (${dejaFait.length})`);
for (const l of dejaFait) console.log(`  ${String(l.dejaN).padStart(3)} champ(s)    ${nommer(l)}`);

console.log(`\n${GRAS}NE PEUT PAS — le corrigé n'écrit rien de plus${RESET}  (${nePeutPas.length})`);
console.log('  (la réponse y est un tracé, un coloriage, un découpage ou un déplacement)');
for (const l of nePeutPas) {
    const indice = l.vu.traitsEnPlus || l.vu.rectsEnPlus
        ? `  [+${l.vu.traitsEnPlus} traits, +${l.vu.rectsEnPlus} rects]` : '';
    console.log(`  ${nommer(l)}${indice}`);
}

if (casses.length) {
    console.log(`\n${JAUNE}${GRAS}PAS MESURABLES${RESET}  (${casses.length})`);
    for (const c of casses) console.log(`  ${c.cle.padEnd(22)} ${c.erreur}`);
}

console.log('\n' + '─'.repeat(74));
console.log(`  ${aFaire.length} rendu(s) à équiper · ${dejaFait.length} équipés · `
    + `${nePeutPas.length} qui ne peuvent pas · ${casses.length} à regarder`);
