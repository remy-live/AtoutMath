// LE PDF D'UNE FICHE, DANS LE MODE QU'ON VEUT, ET L'IMAGE QUI VA AVEC.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// « Une feuille, ça se regarde » — c'est écrit en tête de `polyDu12Octobre.mjs`,
// et c'est vrai. Mais pour la regarder il faut d'abord l'obtenir, et l'obtenir
// demandait à chaque fois les mêmes soixante lignes : monter la sonde,
// s'identifier, écarter les cartes qui traînent, appeler `ouvrirFicheModal`
// depuis la page, DÉPLIER « Papier et impression » pour atteindre le sélecteur
// de couleur, attendre que l'aperçu se refasse, cliquer « Télécharger », capter
// l'événement `download`, puis passer le fichier à `pdfEnImage.mjs`.
//
// TROIS SONDES L'ONT RÉÉCRIT — celle du 12 octobre, celle des feuilles du soir,
// et la mienne pour les couleurs du Strimko. Chacune a repayé les mêmes
// frictions : le réglage de couleur qui dort dans un `<details>` fermé et que
// Playwright déclare « not visible » pendant trente secondes, le défaut du
// logiciel qui est NOIR ET BLANC — donc une sonde qui ne touche à rien mesure
// toujours une feuille en noir et blanc, alors qu'on venait justement regarder
// la couleur —, et le bouton de téléchargement qui ne s'appelle pas pareil
// selon qu'on imprime une fiche (`#fp-telecharger`) ou une liste de questions
// (`#fq-telecharger`).
//
//     node tools/ficheEnPdf.mjs logi-strimko defi-tour-brahma --couleur=couleur
//     node tools/ficheEnPdf.mjs logi-dominos --couleur=intense --items=4 --solutions
//     node tools/ficheEnPdf.mjs frac-lire --sortie=tools/tmp/fractions
//
// Il écrit `<dossier>/<id>-<mode>.pdf` et le `.png` de la page demandée, puis
// imprime pour chacun :
//
//   · les VRAIES teintes du PDF — pas les gris déguisés : le noir lui-même
//     s'écrit `0 0 0 rg`, et ce qui fait une couleur est l'ÉCART entre les
//     trois canaux ;
//   · le nombre de champs remplissables, lus dans le fichier ;
//   · le chemin de l'image, parce que le verdict de cet outil est en partie
//     « va regarder », et qu'il vaut mieux le dire.

import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);

const args = process.argv.slice(2);
const option = (nom, defaut) => {
    const t = args.find(a => a.startsWith(`--${nom}=`));
    return t ? t.slice(nom.length + 3) : defaut;
};
const ids = args.filter(a => !a.startsWith('--'));
if (!ids.length) {
    console.error('emploi : node tools/ficheEnPdf.mjs <id> [<id>…] [--couleur=nb|gris|couleur|intense]');
    console.error('         [--items=12] [--solutions] [--champs] [--page=1] [--echelle=2] [--sortie=dossier]');
    console.error('         [--tableau=liste|tableau|zebre] [--colonnes=auto|1…6]');
    process.exit(2);
}
const MODE = option('couleur', 'couleur');
const ITEMS = Number(option('items', 12));
const PAGE = Number(option('page', 1));
const ECHELLE = option('echelle', '2');
const DOSSIER = option('sortie', 'tools/tmp/fiches');
// LA PRÉSENTATION DES QUESTIONS, et le nombre de colonnes. Rémy a demandé
// l'option tableau le 20 octobre ; sans ces deux lignes, l'outil qui sert
// justement à REGARDER une feuille imprimée ne savait pas l'atteindre, et il
// fallait réécrire une sonde à la main — exactement la friction que cet outil
// existe pour fermer.
const TABLEAU = option('tableau', '');
const COLONNES = option('colonnes', '');
const SOLUTIONS = args.includes('--solutions');
const CHAMPS = args.includes('--champs');

await mkdir(DOSSIER, { recursive: true });

/** Les vraies teintes d'un PDF : celles dont les trois canaux s'écartent. */
async function teintesDuPdf(chemin) {
    const brut = await readFile(chemin, 'latin1');
    const vues = new Set();
    // `rg` remplit, `RG` trace : une bande de ruisseau est un TRAIT, et la
    // première version de cet outil ne lisait que les remplissages — elle
    // annonçait donc « aucune couleur » sur la feuille qu'on venait de
    // colorer. Une mesure qui ne regarde qu'une moitié du PDF ne mesure pas
    // le PDF.
    for (const m of brut.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (rg|RG)\b/g)) {
        const v = [m[1], m[2], m[3]].map(Number);
        if (v.some(x => !Number.isFinite(x))) continue;
        if (Math.max(...v) - Math.min(...v) > 0.05) vues.add(v.map(x => x.toFixed(2)).join(' '));
    }
    return [...vues];
}

/** Combien de champs remplissables ? Saisies de texte et cases à cocher. */
async function champsDuPdf(chemin) {
    const brut = await readFile(chemin, 'latin1');
    return (brut.match(/\/FT\s*\/Tx/g) || []).length
        + (brut.match(/\/FT\s*\/Btn/g) || []).length;
}

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
await s.identifier();

for (const id of ids) {
    // LES CARTES QUI TRAÎNENT INTERCEPTENT LES CLICS. Un voile de fin
    // d'exercice reste dans la page et `click()` attend trente secondes sans
    // rien dire de qui est devant — c'est la friction que `elementFromPoint`
    // a fermée ailleurs ; ici il suffit de faire place nette.
    await s.page.evaluate(() => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    });
    const ouvert = await s.page.evaluate(async ([exoId, n]) => {
        const cat = await import('./js/data/catalog.js');
        const e = cat.exercices.find(x => x.id === exoId);
        if (!e) return 'inconnu';
        // LA FICHE SI L'EXERCICE EN A UNE, LA LISTE DE QUESTIONS SINON. Un
        // exercice sans `printable` n'a pas de rendu de grille ; `printSheet`
        // ouvrirait une modale vide, et l'on chercherait le défaut dans le
        // rendu pendant un quart d'heure.
        if (e.printable) {
            const ps = await import('./js/ui/printSheet.js');
            ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null,
                { flottant: false, nbItems: n });
            return 'fiche';
        }
        const pq = await import('./js/ui/printQuestions.js');
        // LE TROISIÈME ARGUMENT EST LE CHARGEUR DE jsPDF, pas une option. Passé
        // à `null`, la modale s'ouvrait, l'aperçu se dessinait, le bouton
        // existait — et le clic levait « chargerJsPDF is not a function » dans
        // la page, donc AUCUN téléchargement. L'outil attendait alors trente
        // secondes et mourait sur un délai dépassé, qui ne dit pas ce qui
        // manque. Deux fiches de questions mesurées pour rien avant de voir
        // que le défaut était dans la sonde et non dans le logiciel.
        const ps2 = await import('./js/ui/printSheet.js');
        pq.ouvrirFicheQuestions(e, { ...(e.params || {}) }, ps2.chargerJsPDF,
            { flottant: false, nbItems: n });
        return 'questions';
    }, [id, ITEMS]);

    if (ouvert === 'inconnu') { console.log(`  ?  ${id} : pas au catalogue`); continue; }
    await dormir(3000);

    // LE RÉGLAGE DE COULEUR DORT SOUS « Papier et impression ». Un réglage dans
    // un `<details>` fermé se mesure « visible » — 13 × 13, `display: block` —
    // pendant que Playwright répète « element is not visible ». Voir `deplier`.
    const selecteur = ouvert === 'fiche' ? '#fp-couleur' : '#fq-couleur';
    if (await s.page.$(selecteur)) {
        await s.deplier(selecteur);
        await s.page.selectOption(selecteur, MODE);
        await dormir(1800);
    }
    // LA PRÉSENTATION — liste ou tableau, zébré ou non. Elle dort sous le même
    // volet que la couleur, donc `deplier` l'a déjà ouvert ; on garde l'appel
    // quand même, puisqu'une fiche à grilles n'a pas de sélecteur de couleur
    // et n'aurait alors rien déplié du tout.
    if (TABLEAU && await s.page.$('#fq-tableau')) {
        await s.deplier('#fq-tableau');
        await s.page.selectOption('#fq-tableau', TABLEAU);
        await dormir(1800);
    }
    if (COLONNES && await s.page.$('#fq-colonnes')) {
        await s.deplier('#fq-colonnes');
        await s.page.selectOption('#fq-colonnes', COLONNES);
        await dormir(1500);
    }
    if (SOLUTIONS) {
        const b = await s.page.$('#fp-voir-sol') || await s.page.$('#fq-voir-sol');
        if (b) { await b.click(); await dormir(1800); }
    }
    if (CHAMPS) {
        const c = await s.page.$('#fp-champs') || await s.page.$('#fq-champs');
        if (c) { await c.check(); await dormir(1800); }
    }

    const bouton = await s.page.$('#fp-telecharger') || await s.page.$('#fq-telecharger');
    if (!bouton) { console.log(`  ?  ${id} : pas de bouton de téléchargement`); continue; }
    const attente = s.page.waitForEvent('download', { timeout: 30000 });
    await bouton.click();
    const dl = await attente;
    const pdf = `${DOSSIER}/${id}-${MODE}${SOLUTIONS ? '-sol' : ''}.pdf`;
    await dl.saveAs(pdf);

    const teintes = await teintesDuPdf(pdf);
    const champs = await champsDuPdf(pdf);
    const png = pdf.replace(/\.pdf$/, `-p${PAGE}.png`);
    let image = png;
    try {
        await executer('node', ['tools/pdfEnImage.mjs', pdf, png, ECHELLE, String(PAGE)]);
    } catch (e) { image = `(pas d'image : ${e.message.split('\n')[0]})`; }

    console.log(`\n  ${id} — ${ouvert}, mode « ${MODE} »`);
    console.log(`     pdf    : ${pdf}`);
    console.log(`     image  : ${image}`);
    console.log(`     champs : ${champs}`);
    console.log(`     teintes: ${teintes.length ? teintes.join('  |  ') : 'AUCUNE (tout est gris)'}`);

    const fermer = await s.page.$('#fp-fermer') || await s.page.$('#fq-fermer');
    if (fermer) { await fermer.click(); await dormir(600); }
}

console.log(`\n  ${s.erreurs.length} erreur(s) de page, `
    + `${s.fenetresNatives.length} fenêtre(s) native(s).\n`);
await s.fermer();
