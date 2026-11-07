// LA REVUE DU 12 OCTOBRE, REGARDÉE SUR LE PDF.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Douze points, tous sur la version imprimée. Ce qui se tient sous Node est
// déjà gardé par des épreuves ; ce qui ne s'y tient pas, c'est de QUOI LA
// FEUILLE A L'AIR — et une feuille, ça se regarde.
//
//   · la police des priorités, qui était en gras « comme cela » ;
//   · le numéro collé au dividende d'une division ;
//   · les sommets de la mosaïque, qui doivent être des CROIX ;
//   · les champs remplissables, qu'on COMPTE dans le PDF lui-même.
//
//     node tools/polyDu12Octobre.mjs
//
// Les images partent dans `tools/tmp/poly-12/` : le verdict de cette sonde est
// en partie « va regarder », et elle le dit.

import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);
const DOSSIER = 'tools/tmp/poly-12';
await mkdir(DOSSIER, { recursive: true });

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

/**
 * Ouvre la fiche d'un exercice, coche « remplissable » si on le demande, et
 * TÉLÉCHARGE le PDF. Rend le chemin du fichier.
 */
async function pdfDe(id, { champs = false, questions = 6, couleur = null } = {}) {
    await s.page.evaluate(() => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    });
    await s.page.evaluate(async ([exoId, n]) => {
        const cat = await import('./js/data/catalog.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === exoId);
        ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false, nbItems: n });
    }, [id, questions]);
    await dormir(3000);
    // LE DÉFAUT DE LA FEUILLE EST « NOIR ET BLANC », donc une sonde qui ne
    // touche à rien mesure toujours une feuille en noir et blanc. Rémy : « je
    // ne vois pas la couleur quand je mets le poly en couleur » — c'est
    // EXACTEMENT ce réglage-là qu'il faut poser pour regarder ce qu'il voit.
    if (couleur) {
        // Le réglage dort sous « Sur quel papier » : voir `sonde.deplier`.
        await s.deplier('#fp-couleur');
        await s.page.selectOption('#fp-couleur', couleur);
        await dormir(1800);
    }
    // La case « remplissable » n'existe que sur la fiche de QUESTIONS.
    if (champs) {
        const coche = await s.page.$('#fq-champs');
        if (coche) { await coche.check(); await dormir(1800); }
    }
    const bouton = await s.page.$('#fp-telecharger') || await s.page.$('#fq-telecharger');
    if (!bouton) return null;
    const attente = s.page.waitForEvent('download', { timeout: 25000 });
    await bouton.click();
    const dl = await attente;
    const chemin = `${DOSSIER}/${id}${champs ? '-champs' : ''}.pdf`;
    await dl.saveAs(chemin);
    return chemin;
}

/** Combien de champs remplissables dans ce PDF ? On lit le fichier. */
async function champsDuPdf(chemin) {
    const brut = await readFile(chemin, 'latin1');
    // Un champ AcroForm se déclare par son type d'annotation. On compte les
    // deux sortes : la saisie de texte et la case à cocher.
    const texte = (brut.match(/\/FT\s*\/Tx/g) || []).length;
    const coches = (brut.match(/\/FT\s*\/Btn/g) || []).length;
    return { texte, coches, total: texte + coches };
}

/**
 * LES VRAIES COULEURS D'UN PDF — pas les gris déguisés.
 *
 * « Il y a de la couleur » ne se mesure pas en regardant si le fichier
 * contient des \`rg\` : le noir lui-même s'y écrit \`0 0 0 rg\`. Ce qui fait
 * une couleur, c'est l'ÉCART entre les trois canaux ; en dessous de cinq
 * centièmes, l'œil et la photocopieuse voient un gris.
 */
async function teintesDuPdf(chemin) {
    const brut = await readFile(chemin, 'latin1');
    const vues = new Set();
    for (const m of brut.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)) {
        const v = [m[1], m[2], m[3]].map(Number);
        if (v.some(x => !Number.isFinite(x))) continue;
        if (Math.max(...v) - Math.min(...v) > 0.05) vues.add(v.map(x => x.toFixed(2)).join(' '));
    }
    return [...vues];
}

/** Rend la première page en image, pour qu'on la REGARDE. */
async function enImage(pdf, png, echelle = 2, page = 1) {
    try {
        await executer('node', ['tools/pdfEnImage.mjs', pdf, png, String(echelle), String(page)]);
        return true;
    } catch (e) { return false; }
}

// ── 1. LA POLICE DES PRIORITÉS ─────────────────────────────────────────────
console.log('\n\x1b[1mLA POLICE DES PRIORITÉS — « pourquoi en gras comme cela »\x1b[0m');
for (const id of ['calc-prio-cascade', 'calc-prio-oppose']) {
    const pdf = await pdfDe(id, { questions: 8 });
    dire(!!pdf, `${id} : le PDF se télécharge`);
    if (pdf) {
        await enImage(pdf, `${DOSSIER}/${id}.png`);
        console.log(`        → ${DOSSIER}/${id}.png`);
    }
}

// ── 2. LE NUMÉRO ET LE DIVIDENDE ───────────────────────────────────────────
console.log('\n\x1b[1mLA DIVISION — « le numéro est collé au dividende »\x1b[0m');
const div = await pdfDe('calc-poser-division', { questions: 8 });
dire(!!div, 'calc-poser-division : le PDF se télécharge');
if (div) {
    await enImage(div, `${DOSSIER}/division.png`, 2.5);
    console.log(`        → ${DOSSIER}/division.png`);
}

// ── 3. LES SOMMETS DE LA MOSAÏQUE ──────────────────────────────────────────
//
// DEUX FEUILLES, PARCE QU'IL A DIT DEUX CHOSES : « les points ne sont toujours
// pas des croix » se regarde en noir et blanc, « je ne vois pas la couleur
// quand je mets le poly en couleur » ne se regarde QU'en couleur. La première
// version de cette sonde ne tirait que la feuille par défaut, c'est-à-dire la
// noire — elle ne pouvait pas voir le second défaut.
console.log('\n\x1b[1mLA MOSAÏQUE — « les points ne sont toujours pas des croix »\x1b[0m');
const mos = await pdfDe('geo-mosaique', { questions: 2 });
dire(!!mos, 'geo-mosaique : le PDF se télécharge');
if (mos) {
    await enImage(mos, `${DOSSIER}/mosaique.png`, 2.5);
    console.log(`        → ${DOSSIER}/mosaique.png`);
}
const mosC = await pdfDe('geo-mosaique', { questions: 2, couleur: 'couleur' });
dire(!!mosC, 'geo-mosaique en COULEUR : le PDF se télécharge');
if (mosC) {
    await enImage(mosC, `${DOSSIER}/mosaique-couleur.png`, 2.5);
    console.log(`        → ${DOSSIER}/mosaique-couleur.png`);
}
// On repose le noir et blanc : le réglage est gardé d'une fiche à l'autre, et
// la suite de la sonde mesurerait sinon une feuille qu'elle n'a pas demandée.
await s.page.evaluate(async () => {
    const f = await import('./js/ui/ficheRendu.js');
    f.reglerModePolycopie('nb');
});

// ── 4. LES CHAMPS REMPLISSABLES, COMPTÉS DANS LE FICHIER ───────────────────
//
// Le balayage de `tools/champsRemplissables.mjs` compte les APPELS au crayon ;
// ici on compte ce qui est vraiment arrivé dans le PDF. Les deux peuvent
// diverger — un champ posé hors de la page, par exemple — et c'est bien pour
// cela qu'on regarde les deux.
// ── 4. LES CHAMPS REMPLISSABLES, PAR LE CHEMIN DE RÉMY ────────────────────
//
// ET C'EST TOUT LE SUJET DE CE BLOC. Première version : on ouvrait la fiche
// d'un exercice SEUL et l'on cochait `#fq-champs`. Zéro champ dans les trois
// PDF — et la cause n'était pas la correction, c'est que **cette case n'existe
// pas sur la fiche d'un exercice seul** : elle est dans le panneau des
// QUESTIONS (`#fq-champs`) et dans celui du POLY (`#pp-champs`), jamais dans
// celui d'une grille isolée. On mesurait une porte que Rémy n'emprunte pas —
// il imprime des polys, il l'a écrit.
//
// (Le trou reste vrai et il est noté : une grille imprimée toute seule ne peut
// pas être remplissable. Ce n'est pas ce qu'il a demandé, donc ce n'est pas ce
// qu'on corrige aujourd'hui.)
console.log('\n\x1b[1mLES CHAMPS REMPLISSABLES, DANS LE POLY D\'UN PARCOURS\x1b[0m');
// LE TROISIÈME EXERCICE A CHANGÉ, ET LA RAISON VAUT D'ÊTRE DITE.
//
// On avait pris `mes-perimetre-qcm` pour mesurer la case à cocher : il porte
// « QCM » dans son nom. Zéro case dans le PDF — et, une fois encore, pas à
// cause de la correction. Cet exercice s'imprime par la porte des GRILLES :
// sur la feuille, il dessine quatre rectangles cotés et une ligne
// « Périmètre = … », sans la moindre proposition. Un QCM à l'écran n'est pas
// un QCM sur le papier.
//
// `js/core/registry.js` sait qui porte de vraies propositions : 83 exercices
// « écrits » en rendent. « Le Mot Juste » en est, et c'est bien un QCM.
const DANS_LE_POLY = [
    ['calc-poser-multiplication', 'les opérations posées'],
    ['geo-cercle-vocabulaire', 'le vocabulaire du cercle'],
    ['num-vocabulaire', 'un QCM écrit']
];
// ON REPART D'UNE PAGE NEUVE, et ce n'est pas une politesse : trois fiches ont
// été ouvertes et fermées plus haut, et la case « Champs remplissables » du
// poly se déclarait alors « pas visible » pendant trente secondes avant que
// Playwright n'abandonne — alors que la même case, sur une page fraîche,
// mesure 13 × 13 et se clique. Retirer les voiles à la main ne suffit pas :
// ce qu'ils laissent derrière eux ne se voit pas.
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
await s.page.evaluate(async (ids) => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = ids.map((id, i) => makeStep(id, {}, { stepId: 's' + i, nbItems: 4 }));
    pp.ouvrirFicheParcours(makePath('Essai du 12 octobre', pas, politiquePerso()));
}, DANS_LE_POLY.map(x => x[0]));
await dormir(4500);

const caseChamps = await s.page.$('#pp-champs');
dire(!!caseChamps, 'le poly offre bien la case « remplissable »');
if (caseChamps) {
    // LA CASE DORT DANS UN REPLI FERMÉ, ET LA MESURE NE LE DIT PAS.
    //
    // Trois quarts d'heure payés ici, puis un second quart d'heure un peu
    // plus haut sur le même piège (`#fp-couleur`). La leçon est maintenant
    // dans `sonde.deplier`, avec la mesure qui l'a tranchée : lire son
    // commentaire plutôt que de la repayer une troisième fois.
    const aDeplie = await s.deplier('#pp-champs');
    console.log(`  le repli « Papier, numéros et corrigé » : ${aDeplie ? 'ouvert par la sonde' : 'déjà ouvert'}`);
    await caseChamps.check();
    // ET L'ON DEMANDE LES PROPOSITIONS, sans quoi il n'y a pas de QCM à
    // mesurer. Première lecture : « 104 saisies, 0 case à cocher » — on a
    // cherché le défaut dans `champCoche`. Il n'y en avait pas : le poly
    // n'imprime les propositions que si « Proposer les réponses » est coché,
    // et sans propositions un QCM s'imprime en question ouverte. On ne
    // mesurait pas une case absente, on mesurait une feuille sans QCM.
    await s.page.check('#pp-choix');
    await dormir(3000);
    const attente = s.page.waitForEvent('download', { timeout: 40000 });
    await s.page.click('#pp-dl');
    const dl = await attente;
    const pdf = `${DOSSIER}/poly-champs.pdf`;
    await dl.saveAs(pdf);
    const n = await champsDuPdf(pdf);
    console.log(`  le poly porte ${n.texte} saisie(s) et ${n.coches} case(s) à cocher`);
    dire(n.texte > 0, 'des champs de saisie sont posés');
    dire(n.coches > 0, 'et le QCM porte de vraies cases à cocher');
    await enImage(pdf, `${DOSSIER}/poly-champs.png`);
    console.log(`        → ${DOSSIER}/poly-champs.png`);
}

// ── 5. LA MOSAÏQUE DANS UN POLY, MIS EN COULEUR ───────────────────────────
//
// SES MOTS EXACTS : « je ne vois pas la couleur quand je mets LE POLY en
// couleur ». La fiche d'un exercice seul et le poly d'un parcours ont chacun
// leur réglage de couleur, et l'on a déjà perdu une heure aujourd'hui à
// mesurer une porte qu'il n'emprunte pas. Celle-ci est la sienne.
console.log('\n\x1b[1mLA MOSAÏQUE DANS UN POLY MIS EN COULEUR\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
await s.page.evaluate(async () => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = [makeStep('geo-mosaique', {}, { stepId: 'm0', nbItems: 2 })];
    pp.ouvrirFicheParcours(makePath('La mosaïque en couleur', pas, politiquePerso()));
});
await dormir(4500);
await s.deplier('#pp-couleur');
await s.page.selectOption('#pp-couleur', 'couleur');
await dormir(2500);
// ON REGARDE AUSSI L'ÉCRAN, parce que c'est là qu'il regarde en premier : si
// l'aperçu restait gris, il dirait « je ne vois pas la couleur » sans même
// imprimer, et le PDF aurait beau être juste, il aurait raison.
const vuEcran = await s.photo('#pp-apercu', `${DOSSIER}/apercu-couleur.png`);
console.log(`  l'aperçu à l'écran porte ${vuEcran.teintes} teintes`);
dire(!vuEcran.unie, 'l\'aperçu du poly n\'est pas uni');
const attenteC = s.page.waitForEvent('download', { timeout: 40000 });
await s.page.click('#pp-dl');
const polyC = `${DOSSIER}/poly-mosaique-couleur.pdf`;
await (await attenteC).saveAs(polyC);
const teintes = await teintesDuPdf(polyC);
console.log(`  le poly porte ${teintes.length} aplat(s) vraiment colorés`
    + (teintes.length ? ` — par exemple ${teintes[0]}` : ''));
dire(teintes.length > 0, 'la mosaïque du poly sort en couleur');
await enImage(polyC, `${DOSSIER}/poly-mosaique-couleur.png`, 2.2);
console.log(`        → ${DOSSIER}/poly-mosaique-couleur.png`);

// ── 6. LE DERNIER RANG À MOITIÉ VIDE ──────────────────────────────────────
//
// « tu as souvent 6 calculs pour 4 colonnes […] c'est idiot car déséquilibré »,
// et « pour le slitherlink aussi ». On monte un poly comme une séance le
// ferait — vingt items demandés à l'écran — et l'on REGARDE combien la feuille
// en pose, et sur combien de rangées.
console.log('\n\x1b[1mLE DERNIER RANG — « 6 calculs pour 4 colonnes »\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
await s.page.evaluate(async () => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = [
        makeStep('calc-poser-multiplication', {}, { stepId: 'p0', nbItems: 20 }),
        makeStep('logi-slitherlink', {}, { stepId: 'p1', nbItems: 20 })
    ];
    pp.ouvrirFicheParcours(makePath('Les rangées pleines', pas, politiquePerso()));
});
await dormir(5000);
const attenteR = s.page.waitForEvent('download', { timeout: 40000 });
await s.page.click('#pp-dl');
const polyR = `${DOSSIER}/poly-rangees.pdf`;
await (await attenteR).saveAs(polyR);
dire(true, 'le poly des rangées se télécharge');
await enImage(polyR, `${DOSSIER}/poly-rangees.png`, 2.2);
console.log(`        → ${DOSSIER}/poly-rangees.png — COMPTER les rangées`);

// ── 7. LE MEMORY, LES DOMINOS, L'ENQUÊTE ──────────────────────────────────
//
// Trois réglages par défaut qu'il a demandés nommément : huit paires de memory
// (« débrouille-toi pour avoir le même nombre par ligne »), un seul jeu de
// dominos, deux colonnes pour l'enquête. Tous trois se voient d'un coup d'œil
// sur la feuille — et seulement sur la feuille.
console.log('\n\x1b[1mMEMORY, DOMINOS, ENQUÊTE — les défauts qu\'il a dictés\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
await s.page.evaluate(async () => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = [
        makeStep('calc-math-memory', {}, { stepId: 'j0', nbItems: 20 }),
        makeStep('logi-dominos', {}, { stepId: 'j1', nbItems: 20 }),
        makeStep('logi-enquete', {}, { stepId: 'j2', nbItems: 20 })
    ];
    pp.ouvrirFicheParcours(makePath('Memory, dominos, enquête', pas, politiquePerso()));
});
await dormir(5500);
const attenteJ = s.page.waitForEvent('download', { timeout: 40000 });
await s.page.click('#pp-dl');
const polyJ = `${DOSSIER}/poly-jeux.pdf`;
await (await attenteJ).saveAs(polyJ);
dire(true, 'le poly des jeux se télécharge');
for (const page of [1, 2]) {
    await enImage(polyJ, `${DOSSIER}/poly-jeux-p${page}.png`, 2.2, page);
}
console.log(`        → ${DOSSIER}/poly-jeux-p1.png et -p2.png`);

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 6).forEach(e => console.log('  ' + e));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : `\x1b[32mLES PDF SORTENT. Les images sont dans ${DOSSIER}/ — à REGARDER.\x1b[0m`);
await s.fermer();
process.exitCode = manques || s.fenetresNatives.length || s.erreurs.length ? 1 : 0;
