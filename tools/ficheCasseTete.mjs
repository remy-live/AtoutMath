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
    ['logi-approxdoku', 'l\'Approxdoku'],
    ['logi-serpents', 'les Serpents'],
    ['logi-enquete', "l'Enquête"],
    ['defi-trefles', 'le Trèfle à Quatre Feuilles']
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
            // Les `<rect>` sont les CASES d'une grille de serpents et les
            // CAPSULES d'un Approxdoku : le même nom compterait deux choses.
            cases: ap.querySelectorAll('svg rect').length,
            capsules: ap.querySelectorAll('svg rect').length,
            chemins: ap.querySelectorAll('svg path').length,
            chiffres: [...ap.querySelectorAll('svg text')].map(t => t.textContent.trim())
        };
    });
    // DEUX CHAMPS DE TRÈFLES PAR PAGE. RÉMY : « Les trèfles prennent toutes
    // une page sur le pdf. »
    //
    // Cette ligne disait l'inverse il y a une version, et le commentaire qui
    // la justifiait annonçait quatre millimètres à deux par page. MESURÉ : 7,4
    // sur « le pré », 9,2 sur « la promenade » — la taille d'un trèfle de
    // revue. Un chiffre supposé avait tenu lieu de mesure pendant une semaine.
    dire(vu.blocs >= 2,
        id === 'defi-trefles' ? 'deux champs par page' : 'plusieurs grilles sur la page',
        `${vu.blocs} bloc(s)`);
    if (id === 'defi-trefles') {
        // Chaque trèfle est une poignée de `<path>` : trois ou quatre feuilles
        // plus son pédoncule. Un champ vide rendrait zéro, exactement comme un
        // rendu absent.
        dire(vu.chemins >= 150, 'LE CHAMP EST SEMÉ',
            `${vu.chemins} tracé(s) de feuille et de pédoncule`);
        dire(vu.ronds === 0,
            'et la feuille de l\'élève n\'entoure RIEN — c\'est à lui de le faire',
            `${vu.ronds} cercle(s)`);
    } else if (id === 'logi-enquete') {
        // UN PLAN DE ZONES, et les indices écrits à côté. Sans le texte, la
        // feuille porte une grille vide et personne ne peut rien déduire :
        // c'est le défaut des figures de géométrie, à l'identique.
        dire(vu.cases >= vu.blocs * 9, 'LE PLAN EST DESSINÉ',
            `${vu.cases} case(s) pour ${vu.blocs} enquête(s)`);
        dire(vu.bandes >= vu.blocs * 8, 'et les zones sont séparées par un trait',
            `${vu.bandes} segment(s) de contour`);
        const indices = await s.page.evaluate(() =>
            (document.querySelector('#fp-apercu').innerText.match(/^\s*\d+\. /gm) || []).length);
        dire(indices >= vu.blocs * 3, 'ET LES INDICES SONT ÉCRITS',
            `${indices} indice(s) numérotés`);
    } else if (id === 'logi-serpents') {
        // UNE GRILLE DE CASES, pas de ronds : une case par position, plus un
        // rond par tête de serpent pour porter son étiquette.
        dire(vu.cases >= vu.blocs * 16, 'LA GRILLE DE CASES EST DESSINÉE',
            `${vu.cases} case(s) pour ${vu.blocs} grille(s)`);
        dire(vu.ronds >= vu.blocs * 3, 'et chaque serpent porte son étiquette',
            `${vu.ronds} étiquette(s)`);
    } else {
        dire(vu.ronds >= vu.blocs * 16, 'LA GRILLE DE RONDS EST DESSINÉE',
            `${vu.ronds} rond(s) pour ${vu.blocs} grille(s)`);
    }
    if (id === 'logi-strimko') {
        // Les bandes PORTENT la règle du ruisseau. Sans elles, il ne reste
        // qu'un carré latin — c'est-à-dire un autre exercice, plus facile,
        // et souvent sans solution unique.
        dire(vu.bandes >= vu.blocs * 9, 'et les ruisseaux sont des BANDES, pas des couleurs',
            `${vu.bandes} segment(s) de bande`);
    } else if (id === 'logi-approxdoku') {
        // Sans capsule, une chaîne n'est qu'une rangée de ronds.
        dire(vu.capsules >= vu.blocs * 2, 'et chaque chaîne porte sa capsule',
            `${vu.capsules} capsule(s)`);
        dire(vu.chiffres.some(t => t === '≈'), 'avec le « ≈ » entre deux ronds',
            vu.chiffres.filter(t => '+−×÷≈'.includes(t)).join(' '));
    }

    await deplier();
    const photo = await s.photo('#fp-apercu', `tools/tmp/ct-${id}.png`);
    dire(!!photo && photo.entiere, 'la photo porte la feuille ENTIÈRE');

    // ET LA FEUILLE DE SOLUTIONS, qui est l'autre moitié de ce qu'on imprime.
    // Le bouton est `#fp-voir-sol` — LU dans `printSheet.js`.
    await s.doitExister('#fp-voir-sol');
    await s.page.click('#fp-voir-sol');
    await dormir(2000);
    await deplier();
    const photoSol = await s.photo('#fp-apercu', `tools/tmp/ct-${id}-corrige.png`);
    dire(!!photoSol && photoSol.entiere, 'et la photo du corrigé aussi');
    await s.page.click('#fp-voir-sol');
    await dormir(1200);

    // ── LA FEUILLE DE L'ÉLÈVE NE PORTE PAS LA SOLUTION ─────────────────────
    //
    // Les deux feuilles sortent du MÊME rendu, avec un seul booléen de
    // différence. Si ce booléen n'arrivait pas jusqu'au dessin, on distribuerait
    // la correction.
    const compte = await s.page.evaluate(async (id) => {
        const cat = await import('./js/data/catalog.js');
        const { generateurDeFiche } = await import('./js/core/registry.js');
        const { makeRng } = await import('./js/core/ids.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === id);
        const fab = generateurDeFiche(e);
        // LA TABLE COMPLÈTE, et non une famille nommée en dur : les trois
        // grilles mesurées ici ne vivent pas dans le même fichier, et viser
        // `RENDUS_LATINS` faisait jeter la sonde sur les Serpents.
        const r = ps.RENDUS[e.printable];
        const q = fab.generate({ ...(e.params || {}) },
            { rng: makeRng(), index: 0, total: 2, papier: true, themesExclus: [] });
        const item = { meta: q.meta || {}, prompt: q.prompt || {} };
        const slot = { x: 10, y: 10, w: 80, h: 80 };
        const nb = (h) => (h.match(/<text[^>]*>[^<]*<\/text>/g) || [])
            .filter(t => /<text[^>]*>\s*\d+\s*<\/text>/.test(t)).length;
        const traits = (h) => (h.match(/<line/g) || []).length;
        const eleve = r.previewGrille(item, slot, 1, false);
        const corrige = r.previewGrille(item, slot, 1, true);
        return {
            n: q.meta.n,
            // L'ENQUÊTE SE CORRIGE EN ÉCRIVANT DES PRÉNOMS, pas des chiffres :
            // un seul par case, et autant que de personnages.
            parNoms: !!q.meta.solution && Array.isArray(q.meta.solution)
                && !!(q.meta.solution[0] || {}).nom,
            noms: (q.meta.noms || []).length,
            textesEleve: (eleve.match(/<text/g) || []).length,
            textesCorrige: (corrige.match(/<text/g) || []).length,
            parTrefles: !!q.meta.aTrouver && !!q.meta.trefles,
            aTrouver: q.meta.aTrouver,
            cerclesCorrige: (corrige.match(/<circle/g) || []).length,
            cheminsEleve: (eleve.match(/<path/g) || []).length,
            cheminsCorrige: (corrige.match(/<path/g) || []).length,
            // Un Strimko donne quelques chiffres de départ ; un Approxdoku
            // aucun ; une grille de serpents donne des ÉTIQUETTES, une par
            // serpent, qui ne sont pas des cases remplies.
            donnees: q.meta.serpents
                ? q.meta.serpents.length
                : (q.meta.donnees || []).length,
            cases: q.meta.serpents ? q.meta.lignes * q.meta.colonnes : q.meta.n * q.meta.n,
            eleve: nb(eleve), corrige: nb(corrige),
            // Le corrigé des serpents ne REMPLIT rien : il TRACE les contours.
            traitsEleve: traits(eleve), traitsCorrige: traits(corrige),
            parContour: !!q.meta.serpents
        };
    }, id);
    if (compte.parTrefles) {
        // LE CORRIGÉ ENTOURE, ET REDESSINE EN GRAS. Le cercle seul entourait un
        // enchevêtrement de trois trèfles mêlés : le professeur devait compter
        // les feuilles pour vérifier sa propre correction, et un corrigé qu'il
        // faut résoudre n'est pas un corrigé.
        dire(compte.cerclesCorrige === compte.aTrouver,
            'LE CORRIGÉ ENTOURE CHAQUE TRÈFLE À QUATRE FEUILLES',
            `${compte.cerclesCorrige} cercle(s) pour ${compte.aTrouver} à trouver`);
        dire(compte.cheminsCorrige > compte.cheminsEleve,
            'et il les redessine en gras, pour qu\'on les reconnaisse sans recompter',
            `${compte.cheminsCorrige - compte.cheminsEleve} tracé(s) ajouté(s)`);
    } else if (compte.parNoms) {
        // Le corrigé pose UN PRÉNOM PAR PERSONNAGE sur le plan. La feuille de
        // l'élève porte déjà les noms des lieux et les repères : on ne compare
        // donc pas à zéro, on compare l'ÉCART.
        dire(compte.textesCorrige - compte.textesEleve === compte.noms,
            'LE CORRIGÉ POSE CHAQUE PRÉNOM SUR LE PLAN',
            `${compte.textesCorrige - compte.textesEleve} prénom(s) ajouté(s) `
            + `pour ${compte.noms} personnage(s)`);
    } else if (compte.parContour) {
        // LE CORRIGÉ TRACE, IL N'ÉCRIT PAS. Un serpent se corrige en montrant
        // son contour ; aucun chiffre ne s'ajoute, et une mesure qui compterait
        // les chiffres déclarerait le corrigé muet.
        dire(compte.eleve === compte.donnees,
            'la feuille de l\'élève ne porte QUE les étiquettes',
            `${compte.eleve} étiquette(s) pour ${compte.donnees} serpent(s)`);
        dire(compte.traitsCorrige > compte.traitsEleve,
            'ET LE CORRIGÉ TRACE LE CONTOUR DE CHAQUE SERPENT',
            `${compte.traitsEleve} trait(s) pour l'élève, ${compte.traitsCorrige} au corrigé`);
    } else {
        dire(compte.eleve === compte.donnees,
            'la feuille de l\'élève ne porte QUE les données',
            `${compte.eleve} chiffre(s) écrit(s), ${compte.donnees} donnée(s)`);
        dire(compte.corrige === compte.cases,
            'ET LE CORRIGÉ PORTE LA GRILLE ENTIÈRE',
            `${compte.corrige} chiffre(s) sur ${compte.cases} cases`);
    }

    // ── ET LE PDF SORT ─────────────────────────────────────────────────────
    const bouton = await s.page.$('text=Télécharger le PDF');
    if (bouton) {
        const [recu] = await Promise.all([
            s.page.waitForEvent('download', { timeout: 40000 }),
            bouton.click()
        ]);
        const buf = await fs.readFile(await recu.path());
        const brut = buf.toString('latin1');
        // Un rond est une suite de quatre courbes de Bézier : « c » dans le
        // flux. Une case est un « re ». On ne compte donc pas la même chose
        // selon la grille — une mesure qui cherchait des ronds sur une grille
        // de serpents en trouvait quinze pour les étiquettes et déclarait la
        // feuille vide, alors qu'elle portait cinquante cases.
        const courbes = (brut.match(/ c\b/g) || []).length;
        const rectangles = (brut.match(/ re\b/g) || []).length;
        if (id === 'defi-trefles') {
            // Un trèfle est fait de courbes de Bézier : « c » dans le flux.
            dire(courbes >= 300, 'le PDF porte le champ entier',
                `${courbes} courbe(s) · ${Math.round(buf.length / 1024)} Ko`);
        } else if (id === 'logi-serpents' || id === 'logi-enquete') {
            dire(rectangles >= vu.blocs * 9, 'le PDF porte les cases de chaque grille',
                `${rectangles} case(s), ${courbes} courbe(s) · ${Math.round(buf.length / 1024)} Ko`);
        } else {
            dire(courbes >= vu.blocs * 16 * 4, 'le PDF porte les ronds de chaque grille',
                `${courbes} courbe(s) · ${Math.round(buf.length / 1024)} Ko`);
        }
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
