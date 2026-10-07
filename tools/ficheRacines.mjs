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
    const rac = [...document.querySelectorAll('#pp-apercu .fq-rac-dedans')];
    return {
        n: rac.length,
        dedans: rac.slice(0, 3).map(e => e.textContent),
        // SUR LES PIXELS, pas sur la feuille de style : un `overline` qu'une
        // règle plus forte annulerait se verrait ici, et nulle part ailleurs.
        barre: rac.length ? getComputedStyle(rac[0]).textDecorationLine : '',
        // Et la barre doit vraiment surmonter le radicande, pas flotter à côté.
        large: rac.length ? Math.round(rac[0].getBoundingClientRect().width) : 0
    };
});
dire(apercu.n >= 6, 'l\'aperçu sort un radicande par question',
    `${apercu.n} radicaux · ${apercu.dedans.join(' · ')}`);
dire(apercu.barre.includes('overline'), 'et chacun porte sa barre', apercu.barre);
dire(apercu.large > 8, 'la barre a la largeur du radicande, pas celle d\'un point',
    `${apercu.large} px`);

// ── 2. LE PDF, QUI EST CE QUE RÉMY IMPRIME ─────────────────────────────────

const [recu] = await Promise.all([
    s.page.waitForEvent('download', { timeout: 40000 }),
    s.page.click('text=Télécharger le PDF')
]);
const brut = (await fs.readFile(await recu.path())).toString('latin1');

// Le signe, le radicande, puis le trait — dans cet ordre, c'est ce qu'écrit
// `dessinerRacine`. On lit les trois et on vérifie que le troisième recouvre
// le deuxième.
const RADICAL = /\/F\d+ [\d.]+ Tf\s+[\d.]+ TL\s+[\d.]+ g\s+([\d.]+) ([\d.]+) Td\s+\(Ö\) Tj\s+ET\s+BT\s+\/F\d+ [\d.]+ Tf\s+[\d.]+ TL\s+[\d.]+ g\s+([\d.]+) ([\d.]+) Td\s+\(([^)]*)\) Tj\s+ET\s+[\d.]+ w\s+[\d.]+ G\s+([\d.]+) ([\d.]+) m\s+([\d.]+) ([\d.]+) l\s+S/g;

const trouves = [...brut.matchAll(RADICAL)].map(m => ({
    xSigne: +m[1], yTexte: +m[2], xDedans: +m[3], dedans: m[5],
    xBarre1: +m[6], yBarre: +m[7], xBarre2: +m[8]
}));

dire(trouves.length >= 6, 'le PDF porte un radical par question',
    `${trouves.length} trouvé(s) — ${trouves.slice(0, 3).map(t => `√${t.dedans}`).join(' · ')}`);

if (trouves.length) {
    // LA BARRE PART DU SIGNE ET DÉPASSE LE RADICANDE. On ne compare pas à une
    // longueur devinée : on compare à la géométrie du radical lui-même.
    const mauvais = trouves.filter(t => {
        const longueur = t.xBarre2 - t.xBarre1;
        const besoin = t.xDedans - t.xSigne;        // la largeur du signe
        return longueur < besoin || t.xBarre1 > t.xDedans + 0.5 || t.yBarre <= t.yTexte;
    });
    dire(!mauvais.length, 'CHAQUE BARRE PART DU SIGNE, RECOUVRE LE RADICANDE, ET LE DÉPASSE',
        mauvais.length ? `${mauvais.length} barre(s) mal posée(s)`
            : trouves.slice(0, 3).map(t =>
                `√${t.dedans} : ${(t.xBarre2 - t.xBarre1).toFixed(1)} pt de barre`).join(' · '));
    dire(trouves.every(t => t.yBarre > t.yTexte + 2),
        'et elle est AU-DESSUS du texte, pas dessus',
        `${(trouves[0].yBarre - trouves[0].yTexte).toFixed(1)} pt plus haut`);
}

console.log('─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLA RACINE RECOUVRE SON NOMBRE, À L\'ÉCRAN COMME SUR LE PAPIER.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
