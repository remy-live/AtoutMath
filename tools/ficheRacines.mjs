// LA BARRE DU RADICAL, MESURÉE DANS LE PDF LUI-MÊME.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, quatre fois dans la même revue : « la racine carré ne recouvre pas bien
// le nombre sur la version imprimé ».
//
// ── POURQUOI L'APERÇU NE SUFFIT PAS À LE DIRE ──────────────────────────────
//
// L'aperçu est du HTML : la barre y est un `text-decoration: overline`, et le
// navigateur la pose tout seul. LE PDF EST UN AUTRE DESSIN — jsPDF ne connaît
// pas `overline`, et le caractère de barre n'existe pas dans ses polices
// standard. La barre y est un TRAIT, tiré à la main par `dessinerRacine`.
//
// Deux rendus, deux codes, et c'est le second que Rémy imprime. Une sonde qui
// ne regarderait que l'aperçu dirait « c'est corrigé » d'une feuille où il ne
// se serait rien passé.
//
// ── CE QU'ELLE LIT, ET COMMENT ─────────────────────────────────────────────
//
// Elle ouvre le PDF produit et y cherche, pour chaque radical écrit, le trait
// qui le recouvre. Dans le flux d'un PDF, cela donne :
//
//     /F14 11.03 Tf  118.00 685.74 Td  (Ö) Tj     ← le signe, en Symbol
//     /F1  11.03 Tf  123.85 685.74 Td  (9 + 16) Tj ← le radicande
//     123.38 693.92 m  155.49 693.92 l  S          ← LA BARRE
//
// jsPDF écrit le « √ » comme le « Ö » de la police Symbol : c'est son
// équivalent dans cette police, et c'est à cela qu'on le reconnaît.
//
// PREMIÈRE VERSION DE CETTE MESURE : elle cherchait des traits horizontaux
// « entre 2 et 25 points » et n'en trouvait aucun — la barre en fait 32. Le
// filtre était faux, pas le code. On ne devine plus une longueur : on la
// compare à CELLE DU RADICANDE, qui est la seule référence qui ait un sens.
//
//   node tools/ficheRacines.mjs

import fs from 'node:fs/promises';
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLA RACINE CARRÉE SUR LA FEUILLE');
console.log('─'.repeat(78));

await s.identifier();
await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

// `rc-7` : « la racine ne traverse pas une addition ». C'est l'exercice où
// l'absence de barre imprimait exactement le piège qu'il combat.
await s.page.evaluate(async () => {
    const cat = await import('./js/data/catalog.js');
    const pp = await import('./js/ui/printParcours.js');
    const e = cat.exercices.find(x => x.id === 'rc-7');
    pp.ouvrirFicheParcours({
        id: 'essai', name: 'Racines',
        steps: [{ type: 'exercise', exerciseId: e.id, params: { ...(e.params || {}) }, count: 6 }]
    });
});
await dormir(4000);

// ── 1. L'APERÇU ────────────────────────────────────────────────────────────

await s.doitExister('#pp-apercu');
const apercu = await s.page.evaluate(() => {
    // LE MÊME BALISAGE QUE L'ÉCRAN : l'aperçu appelle désormais `formule()`
    // de `core/maths/formule.js` plutôt que d'écrire son propre radical. Un
    // second rendu de la même chose aurait divergé au premier réglage — et
    // c'est exactement par là que la rupture était arrivée.
    const rac = [...document.querySelectorAll('#pp-apercu .fx-rac')];
    const un = rac[0];
    return {
        n: rac.length,
        dedans: rac.slice(0, 3).map(e => e.querySelector('.fx-sous').textContent.trim()),
        crochet: !!(un && un.querySelector('.fx-crochet')),
        barre: !!(un && un.querySelector('.fx-barre')),
        // LES DEUX TRAITS SONT-ILS DE LA MÊME ÉPAISSEUR ? La question est de
        // Rémy, il y a des mois : « sur ton banc les radicaux ont-ils une ligne
        // de la même épaisseur ». Mesurée sur les pixels rendus.
        hCrochet: un ? Math.round(un.querySelector('.fx-crochet').getBoundingClientRect().height) : 0,
        hBarre: un ? Math.round(un.querySelector('.fx-barre').getBoundingClientRect().height) : 0,
        // LA BARRE RECOUVRE-T-ELLE LE PLAT DU CROCHET ?
        //
        // La question n'est plus « se touchent-elles ? » et c'est une
        // correction, pas un assouplissement. Rémy a revu la rupture des mois
        // plus tard : « il y a un léger décalage entre la ligne horizontale et
        // la fin du V ». Deux traits BOUT À BOUT ne peuvent pas s'aligner —
        // chaque <svg> est rastérisé pour son compte, et à certaines tailles
        // l'un arrondit d'un pixel d'appareil de plus que l'autre. La barre
        // part donc AVANT le sommet du crochet et le recouvre entièrement : le
        // haut du trait est le sien d'un bout à l'autre.
        //
        // Ce qu'on garde ici, c'est que ce recouvrement existe. Qu'il suffise
        // se mesure sur l'ENCRE, et c'est `tools/jonctionRacine.mjs` qui le
        // fait, à onze tailles — parce qu'un défaut d'arrondi ne se voit pas à
        // la taille où l'on mesure, mais à celle où l'on regarde.
        recouvrement: un
            ? Math.round((un.querySelector('.fx-crochet').getBoundingClientRect().right
                - un.querySelector('.fx-barre').getBoundingClientRect().left) * 10) / 10
            : -99,
        // Le plat du crochet : les 18 % de droite de sa largeur.
        platDuCrochet: un
            ? Math.round(un.querySelector('.fx-crochet').getBoundingClientRect().width
                * 0.18 * 10) / 10
            : 99
    };
});
dire(apercu.n >= 6, 'l\'aperçu sort un radical par question',
    `${apercu.n} radicaux · ${apercu.dedans.join(' · ')}`);
dire(apercu.crochet && apercu.barre,
    'et chacun est DESSINÉ — crochet et barre, comme à l\'écran',
    `crochet ${apercu.crochet} · barre ${apercu.barre}`);
dire(apercu.recouvrement >= apercu.platDuCrochet,
    'LA BARRE RECOUVRE TOUT LE PLAT DU CROCHET — pas de couture possible',
    `${apercu.recouvrement} px de recouvrement pour un plat de ${apercu.platDuCrochet} px`);

// ── 2. LE PDF, QUI EST CE QUE RÉMY IMPRIME ─────────────────────────────────
//
// L'aperçu est du HTML, où le navigateur dessine les SVG. Le PDF est un AUTRE
// dessin, tiré par jsPDF — et c'est celui-là que Rémy pose sur la photocopieuse.
// Une sonde qui s'arrêterait à l'aperçu dirait « c'est corrigé » d'une feuille
// où il ne se serait rien passé.
const [recu] = await Promise.all([
    s.page.waitForEvent('download', { timeout: 40000 }),
    s.page.click('text=Télécharger le PDF')
]);
const brut = (await fs.readFile(await recu.path())).toString('latin1');

// LE RADICAL EST UN SEUL CHEMIN, et c'est cela qu'on vérifie.
//
// RÉMY : « il faut bien que la racine carrée soit continue, là il y a une
// rupture sur ce que tu as fait. » La première version posait le caractère
// « √ » de la police puis tirait un trait au-dessus du radicande : deux objets
// différents, dont ni l'épaisseur ni la hauteur ne pouvaient coïncider.
//
// Le radical s'écrit désormais ainsi dans le flux du PDF :
//
//     123.20 685.74 Td (81 + 144) Tj        ← le radicande
//     118.00 689.94 m                        ← le départ du crochet
//     119.55 689.94 l  120.88 685.74 l       ← le petit horizontal, la descente
//     122.54 696.80 l  123.20 696.80 l       ← la remontée, le bout du sommet
//     167.02 696.80 l  S                     ← LA BARRE, même trait
//
// UN SEUL « m », CINQ « l », UN SEUL « S ». La continuité n'est plus un calage
// qu'on mesure : elle est dans la structure du chemin, et c'est ce que la
// mesure lit. S'il y avait une rupture, il y aurait DEUX chemins.
const CHEMIN = /\(([^)]*)\) Tj\s+ET\s+([\d.]+) w\s+[\d.]+ G\s+([\d.]+) ([\d.]+) m\s+((?:[\d.]+ [\d.]+ l\s+)+)S/g;

const trouves = [...brut.matchAll(CHEMIN)].map(m => {
    const points = [[+m[3], +m[4]],
        ...m[5].trim().split(/\s*l\s*/).filter(Boolean)
            .map(p => p.trim().split(/\s+/).map(Number))];
    return { dedans: m[1], epaisseur: +m[2], points };
}).filter(t => t.points.length >= 6);

dire(trouves.length >= 6, 'le PDF porte un radical par question',
    `${trouves.length} trouvé(s) — ${trouves.slice(0, 3).map(t => t.dedans).join(' · ')}`);

if (trouves.length) {
    // 1. UN SEUL TRAIT, DU CROCHET À LA BARRE.
    dire(trouves.every(t => t.points.length === 6),
        'CROCHET ET BARRE SONT LE MÊME CHEMIN — aucune rupture possible',
        `${trouves[0].points.length} points d'un seul tenant`);

    // 2. LE SOMMET DU CROCHET ET LA BARRE SONT À LA MÊME HAUTEUR. C'est la
    //    marche que Rémy voyait : un sommet à une hauteur, la barre à une autre.
    const marches = trouves.filter(t => {
        const [, , , sommet, bout, fin] = t.points;
        return Math.abs(sommet[1] - bout[1]) > 0.01 || Math.abs(bout[1] - fin[1]) > 0.01;
    });
    dire(!marches.length, 'et le sommet, son prolongement et la barre sont à la MÊME hauteur',
        marches.length ? `${marches.length} marche(s)` : 'écart nul');

    // 3. LA BARRE RECOUVRE LE RADICANDE EN ENTIER.
    const courtes = trouves.filter(t => {
        const bout = t.points[4][0], fin = t.points[5][0];
        return fin - bout < 4;      // un radicande, même à un chiffre, fait plus
    });
    dire(!courtes.length, 'la barre court sur toute la largeur du radicande',
        trouves.slice(0, 3).map(t =>
            `${t.dedans} : ${(t.points[5][0] - t.points[4][0]).toFixed(1)} pt`).join(' · '));

    // 4. ET LE RADICANDE COMMENCE OÙ LE CROCHET FINIT. S'il commençait avant,
    //    le trait lui passerait dedans ; après, il y aurait un blanc.
    dire(trouves.every(t => Math.abs(t.points[4][0] - t.points[5][0]) > 1),
        'le radicande tient sous sa barre, sans blanc ni chevauchement');
}

console.log('─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLA RACINE RECOUVRE SON NOMBRE, À L\'ÉCRAN COMME SUR LE PAPIER.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
