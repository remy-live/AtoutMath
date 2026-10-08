// LES CASSE-TÊTE SUR LE PAPIER — la grille y est-elle, et se lit-elle en NOIR ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : plusieurs casse-tête n'avaient pas de
// version imprimée du tout. Pour un élève sans écran, l'exercice n'existait
// pas.
//
// ── CE QUE CETTE SONDE REGARDE ─────────────────────────────────────────────
//
// Qu'un rendu existe, qu'il soit déclaré et qu'il ne jette pas se tient sous
// Node, et `tests/fichesDecoupe` s'en charge. Ce qui ne s'y tient pas :
//
//   1. qu'il y ait VRAIMENT une grille sur la feuille — un `<svg>` vide rend
//      exactement la même chose qu'un rendu absent ;
//   2. que la feuille de l'élève porte les DONNÉES et pas la solution. C'est
//      le défaut qui ne se voit qu'une fois la page imprimée et distribuée ;
//   3. que le corrigé, lui, porte la solution entière ;
//   4. et que tout cela se lise SANS COULEUR. Un Strimko d'écran distingue ses
//      ruisseaux par sept teintes ; une feuille passe à la photocopieuse. On
//      compte donc ce qui porte l'information : les bandes et les ronds.
//
//   node tools/ficheCasseTete.mjs

import fs from 'node:fs/promises';
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const EXOS = [
    ['logi-strimko', 'le Strimko'],
    ['logi-approxdoku', 'l\'Approxdoku']
];

// Assez haute pour la feuille entière : `photo` découpe sur la FENÊTRE, et une
// photo coupée ressemble à une photo réussie.
const s = await ouvrirSonde({ largeur: 1500, hauteur: 2200 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLES CASSE-TÊTE, SUR LE PAPIER');
console.log('─'.repeat(78));

await s.identifier();

async function ouvrirLaFiche(id) {
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await s.page.evaluate(async (id) => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        const cat = await import('./js/data/catalog.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === id);
        ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false });
    }, id);
    await dormir(3500);
}

const deplier = () => s.page.evaluate(() => {
    const c = document.querySelector('.fp-apercu-cadre');
    if (c) { c.style.maxHeight = 'none'; c.style.overflow = 'visible'; }
});

for (const [id, quoi] of EXOS) {
    console.log(`\n  ${quoi} — ${id}`);
    await ouvrirLaFiche(id);
    await s.doitExister('#fp-apercu');

    const vu = await s.page.evaluate(() => {
        const ap = document.querySelector('#fp-apercu');
        return {
            blocs: ap.querySelectorAll('.fp-bloc').length,
            ronds: ap.querySelectorAll('svg circle').length,
            bandes: ap.querySelectorAll('svg line').length,
            capsules: ap.querySelectorAll('svg rect').length,
            chiffres: [...ap.querySelectorAll('svg text')].map(t => t.textContent.trim())
        };
    });
    dire(vu.blocs >= 2, 'plusieurs grilles sur la page', `${vu.blocs} grille(s)`);
    dire(vu.ronds >= vu.blocs * 16, 'LA GRILLE DE RONDS EST DESSINÉE',
        `${vu.ronds} rond(s) pour ${vu.blocs} grille(s)`);
    if (id === 'logi-strimko') {
        // Les bandes PORTENT la règle du ruisseau. Sans elles, il ne reste
        // qu'un carré latin — c'est-à-dire un autre exercice, plus facile,
        // et souvent sans solution unique.
        dire(vu.bandes >= vu.blocs * 9, 'et les ruisseaux sont des BANDES, pas des couleurs',
            `${vu.bandes} segment(s) de bande`);
    } else {
        // Sans capsule, une chaîne n'est qu'une rangée de ronds.
        dire(vu.capsules >= vu.blocs * 2, 'et chaque chaîne porte sa capsule',
            `${vu.capsules} capsule(s)`);
        dire(vu.chiffres.some(t => t === '≈'), 'avec le « ≈ » entre deux ronds',
            vu.chiffres.filter(t => '+−×÷≈'.includes(t)).join(' '));
    }

    await deplier();
    const photo = await s.photo('#fp-apercu', `tools/tmp/ct-${id}.png`);
    dire(!!photo && photo.entiere, 'la photo porte la feuille ENTIÈRE');

    // ── LA FEUILLE DE L'ÉLÈVE NE PORTE PAS LA SOLUTION ─────────────────────
    //
    // Les deux feuilles sortent du MÊME rendu, avec un seul booléen de
    // différence. Si ce booléen n'arrivait pas jusqu'au dessin, on distribuerait
    // la correction.
    const compte = await s.page.evaluate(async (id) => {
        const cat = await import('./js/data/catalog.js');
        const { generateurDeFiche } = await import('./js/core/registry.js');
        const { makeRng } = await import('./js/core/ids.js');
        const lat = await import('./js/ui/fiches/latins.js');
        const e = cat.exercices.find(x => x.id === id);
        const fab = generateurDeFiche(e);
        const r = lat.RENDUS_LATINS[e.printable];
        const q = fab.generate({ ...(e.params || {}) },
            { rng: makeRng(), index: 0, total: 2, papier: true, themesExclus: [] });
        const item = { meta: q.meta || {}, prompt: q.prompt || {} };
        const slot = { x: 10, y: 10, w: 80, h: 80 };
        const nb = (h) => (h.match(/<text[^>]*>[^<]*<\/text>/g) || [])
            .filter(t => /<text[^>]*>\s*\d+\s*<\/text>/.test(t)).length;
        return {
            n: q.meta.n,
            donnees: (q.meta.donnees || []).length,
            eleve: nb(r.previewGrille(item, slot, 1, false)),
            corrige: nb(r.previewGrille(item, slot, 1, true))
        };
    }, id);
    // Un Approxdoku ne donne AUCUN chiffre de départ : toute l'information est
    // dans les capsules. Un Strimko en donne quelques-uns.
    dire(compte.eleve === compte.donnees,
        'la feuille de l\'élève ne porte QUE les données',
        `${compte.eleve} chiffre(s) écrit(s), ${compte.donnees} donnée(s)`);
    dire(compte.corrige === compte.n * compte.n,
        'ET LE CORRIGÉ PORTE LA GRILLE ENTIÈRE',
        `${compte.corrige} chiffre(s) sur ${compte.n * compte.n} cases`);

    // ── ET LE PDF SORT ─────────────────────────────────────────────────────
    const bouton = await s.page.$('text=Télécharger le PDF');
    if (bouton) {
        const [recu] = await Promise.all([
            s.page.waitForEvent('download', { timeout: 40000 }),
            bouton.click()
        ]);
        const buf = await fs.readFile(await recu.path());
        const brut = buf.toString('latin1');
        // Un rond est une suite de quatre courbes de Bézier : « c » dans le flux.
        const courbes = (brut.match(/ c\b/g) || []).length;
        dire(courbes >= vu.blocs * 16 * 4, 'le PDF porte les ronds de chaque grille',
            `${courbes} courbe(s) · ${Math.round(buf.length / 1024)} Ko`);
    }
}

console.log('\n' + '─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native');
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLES CASSE-TÊTE S\'IMPRIMENT.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
