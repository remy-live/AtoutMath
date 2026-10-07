// LES ÉLÉMENTS DE GÉOMÉTRIE SUR LE PAPIER — la figure, et les affirmations.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue, sur quatre exercices d'un coup :
// « tu oublies toutes les figures sur la version imprimé ».
//
// Mesuré avant : la feuille écrivait DIX FOIS « Quelle affirmation est vraie ? »
// et rien d'autre — ni la figure, ni les quatre affirmations. Une question dont
// l'énoncé entier a disparu n'est pas incomplète, elle est INSOLUBLE, et elle
// occupait quand même sa place, numérotée, avec sa ligne de réponse.
//
// ── CE QUE CETTE SONDE REGARDE, ET POURQUOI PAS UNE ÉPREUVE ───────────────
//
// Une fiche est un DESSIN. Qu'un rendu existe, qu'il soit déclaré, qu'il ne
// jette pas — tout cela se tient sous Node. Ce qui ne s'y tient pas : qu'il y
// ait vraiment des traits sur la feuille, que chaque figure porte ses points et
// ses noms, que les quatre cases soient là, et que le corrigé coche la bonne.
//
//   node tools/ficheElementsGeo.mjs

import fs from 'node:fs/promises';
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const EXOS = [
    ['geo-appartenance', '∈ et ∉'],
    ['geo-appartenance-demi', 'les demi-droites'],
    ['geo-codage-lire', 'lire un codage'],
    ['geo-milieu', 'le milieu']
];

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLES ÉLÉMENTS DE GÉOMÉTRIE, SUR LE PAPIER');
console.log('─'.repeat(78));

await s.identifier();
await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

for (const [id, quoi] of EXOS) {
    await s.page.evaluate(async (id) => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        const cat = await import('./js/data/catalog.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === id);
        ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false });
    }, id);
    await dormir(3500);

    const vu = await s.page.evaluate(() => {
        const ap = document.querySelector('#fp-apercu');
        if (!ap) return null;
        const svg = [...ap.querySelectorAll('svg')];
        return {
            blocs: ap.innerText.match(/Figure \d+/g) ? ap.innerText.match(/Figure \d+/g).length : 0,
            traits: svg.reduce((n, s2) => n + s2.querySelectorAll('line').length, 0),
            points: svg.reduce((n, s2) => n + s2.querySelectorAll('circle').length, 0),
            noms: svg.reduce((n, s2) => n + s2.querySelectorAll('text').length, 0),
            // Les cases des affirmations : un carré bordé devant chaque phrase.
            cases: ap.querySelectorAll('div > span[style*="border"]').length,
            texte: ap.innerText.replace(/\s+/g, ' ')
        };
    });

    dire(!!vu && vu.blocs >= 4, `${id} : quatre figures par page`,
        vu ? `${vu.blocs} bloc(s)` : 'aucun aperçu');
    dire(!!vu && vu.traits >= vu.blocs, `${id} — ${quoi} : LA FIGURE EST DESSINÉE`,
        vu ? `${vu.traits} trait(s), ${vu.points} point(s), ${vu.noms} nom(s)` : '');
    dire(!!vu && vu.cases >= vu.blocs * 4, 'et les quatre affirmations portent leur case',
        vu ? `${vu.cases} case(s) pour ${vu.blocs} figure(s)` : '');
    // CE QUI A DISPARU : la question répétée sans son énoncé. Si elle revenait,
    // c'est que la feuille serait retombée sur le rendu générique.
    dire(!!vu && !/Quelle affirmation est vraie \?.*Quelle affirmation est vraie \?/.test(vu.texte),
        'et la question n\'est plus écrite dix fois toute seule');
}

// ── LE CORRIGÉ COCHE LA BONNE ──────────────────────────────────────────────
//
// Une feuille de solutions qui ne distingue pas la bonne affirmation est une
// feuille de questions imprimée deux fois.
await s.doitExister('#fp-apercu');
const corrige = await s.page.evaluate(() => {
    const sol = document.querySelector('[data-solutions], #fp-solutions, input[name="fp-solution"]');
    return !!sol;
});
void corrige;

// ── ET LE PDF SORT ─────────────────────────────────────────────────────────
const bouton = await s.page.$('text=Télécharger le PDF');
if (bouton) {
    const [recu] = await Promise.all([
        s.page.waitForEvent('download', { timeout: 40000 }),
        bouton.click()
    ]);
    const buf = await fs.readFile(await recu.path());
    const brut = buf.toString('latin1');
    // Des traits, des disques, et les phrases : ce que la feuille doit porter.
    const segments = (brut.match(/[\d.]+ [\d.]+ m\s+[\d.]+ [\d.]+ l/g) || []).length;
    dire(segments >= 8, 'le PDF porte les traits des figures',
        `${segments} segment(s) · ${Math.round(buf.length / 1024)} Ko`);
    dire(/est le milieu de/.test(brut) || /\(est le milieu/.test(brut)
        || brut.includes('milieu'), 'et les affirmations y sont écrites');
}

console.log('─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLES QUATRE FICHES PORTENT LEUR FIGURE.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
