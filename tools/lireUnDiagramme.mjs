// LIRE UN DIAGRAMME, SUR LE CHEMIN DE L'ÉLÈVE — et sur son écran à lui.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et le trou que l'inventaire
// du programme nommait depuis le 16 : « Les diagrammes statistiques — rien ».
//
// ── POURQUOI UNE SONDE, ALORS QUE `tests/lireUnDiagramme.test.mjs` MESURE ──
//
// Les épreuves lisent des NOMBRES : elles disent que la barre dessinée à 15
// porte bien la valeur 15, que les pourcentages font cent, que l'histogramme a
// ses barres collées. Aucune ne peut dire ce qui décide pourtant de tout :
//
//   · le diagramme TIENT-IL dans l'écran d'une tablette, à côté du pavé ?
//   · les nombres de l'axe sont-ils assez GRANDS pour qu'on les lise ? Tout
//     l'exercice demande de lire un axe ; un axe à sept pixels ne se lit pas,
//     et l'élève répond à côté sans jamais savoir pourquoi ;
//   · la virgule est-elle au clavier ? La marche « entre deux graduations »
//     attend « 17,5 », et un pavé sans virgule la rend impossible ;
//   · une marche à CHOIX pose-t-elle bien ses propositions, au lieu du pavé ?
//
// Ces quatre-là ne vivent que dans le navigateur, et chacune rend l'exercice
// inutilisable sans lever la moindre erreur.
//
//     node tools/lireUnDiagramme.mjs
//     node tools/lireUnDiagramme.mjs --photos
//
// ON MESURE SUR UN ÉCRAN DE TABLETTE AU DOIGT (768 px) ET SUR UN TÉLÉPHONE
// (390 px) : c'est le petit qui serre, et c'est celui-là que Rémy prête.

import { ouvrirSonde } from './sonde.mjs';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

/** Ce qu'on voit du diagramme, en pixels d'écran. */
const regarder = (s) => s.page.evaluate(() => {
    const svg = document.querySelector('.dg-figure');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    // LES NOMBRES DE L'AXE SONT LE SUJET DE L'EXERCICE : on mesure leur taille
    // RENDUE, pas celle écrite dans le SVG — c'est le `viewBox` mis à l'échelle
    // qui décide, et il dépend de la place laissée par le pavé.
    const textes = [...svg.querySelectorAll('text')].map(t => {
        const b = t.getBoundingClientRect();
        return { t: t.textContent, h: Math.round(b.height), bas: Math.round(b.bottom) };
    });
    const barres = svg.querySelectorAll('rect, path').length;
    return {
        large: Math.round(r.width), haut: Math.round(r.height),
        bas: Math.round(r.bottom), fenetre: window.innerHeight,
        plusPetit: textes.length ? Math.min(...textes.map(t => t.h)) : 0,
        debordeEnBas: Math.round(r.bottom) > window.innerHeight,
        textes: textes.length, barres
    };
});

async function surUnEcran(largeur, hauteur, nom) {
    console.log(`\n\x1b[1m${nom.toUpperCase()} — ${largeur} × ${hauteur}\x1b[0m`);
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    // LA MARCHE DE L'ÉCHELLE : c'est elle qui porte l'exercice, et c'est celle
    // dont les nombres d'axe comptent le plus (2, 5 ou 10 en 10).
    const ennui = await s.ouvrirExercice('don-diagrammes',
        { marches: ['batons-echelle'] }, { questions: 4 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); await s.fermer(); return; }
    await s.doitExister('.dg-question');
    await s.doitExister('.dg-figure');
    const vu = await regarder(s);
    dire('le diagramme est dessiné', !!vu && vu.barres > 4,
        vu ? `${vu.barres} tracés, ${vu.textes} nombres et noms` : 'aucun .dg-figure');
    dire('il tient dans l\'écran, sans défiler', !!vu && !vu.debordeEnBas,
        vu ? `bas à ${vu.bas} px, fenêtre ${vu.fenetre}` : '');
    // DIX PIXELS EST LE PLANCHER D'UN NOMBRE QU'ON LIT — la même borne que les
    // cotes des figures d'aires, et pour la même raison : en dessous, un « 6 »
    // et un « 8 » ne se distinguent plus.
    dire('et les nombres de l\'axe se lisent', !!vu && vu.plusPetit >= 10,
        vu ? `le plus petit fait ${vu.plusPetit} px` : '');
    if (photos) await s.photo('#game-layer', `tools/tmp/diagramme-${largeur}.png`);

    // ── LA VIRGULE, parce que « 17,5 » est une réponse de cet exercice ────
    const virgule = await s.page.evaluate(() =>
        [...document.querySelectorAll('button, .np-key, [data-key]')]
            .some(b => (b.textContent || '').trim() === ','));
    dire('la virgule est au clavier', virgule, 'la marche « entre deux graduations » en a besoin');

    dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    dire('aucune fenêtre native', s.fenetresNatives.length === 0,
        s.fenetresNatives.slice(0, 2).join(' | '));
    await s.fermer();
}

await surUnEcran(768, 1024, 'la tablette de Rémy');
await surUnEcran(390, 844, 'un téléphone');

// ── ET UNE MARCHE À CHOIX POSE DES PROPOSITIONS, PAS UN PAVÉ ──────────────
//
// « Quel diagramme pour cette situation ? » ne se tape pas. Le pavé sait poser
// un QCM (voir `propositions` dans `core/activities/numeric.js`), et c'est
// exactement le genre de branchement qui se perd sans bruit : on afficherait
// un clavier de chiffres sous une question qui attend « un histogramme ».
console.log('\n\x1b[1mLA MARCHE « QUEL DIAGRAMME ? » POSE DES PROPOSITIONS\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 1100, hauteur: 820 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('don-diagrammes',
        { marches: ['choisir'] }, { questions: 3 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); }
    else {
        await s.doitExister('.dg-question');
        // ── ON COMPTE LES TOUCHES DU PAVÉ, PAS LES CHIFFRES DE LA PAGE ──
        //
        // PREMIER JET DE CETTE SONDE : `document.querySelectorAll('button')`
        // filtré sur « un seul chiffre ». Elle trouvait DEUX touches et
        // accusait le logiciel — c'étaient le compteur de score et le bouton
        // du carnet, en haut à droite, qui affichent « 0 ». Un sélecteur trop
        // large rend la même réponse qu'un défaut, et l'on cherche vingt
        // minutes. Le pavé a un nom : `.numpad-device`.
        await s.doitExister('.np-choix-btn');
        const vu = await s.page.evaluate(() => {
            const btns = [...document.querySelectorAll('.np-choix-btn')]
                .map(b => (b.textContent || '').trim());
            const pave = document.querySelector('.numpad-device');
            return { btns, chiffres: pave
                ? [...pave.querySelectorAll('button')]
                    .filter(b => /^[0-9]$/.test((b.textContent || '').trim())).length : 0 };
        });
        dire('les quatre représentations sont proposées', vu.btns.length >= 3,
            vu.btns.join(' / ') || 'aucune proposition');
        // ET LE PAVÉ DE CHIFFRES N'EST PAS LÀ : on ne tape pas « un
        // histogramme » au clavier numérique.
        dire('et le pavé de chiffres s\'efface', vu.chiffres === 0,
            `${vu.chiffres} touches de chiffres à l'écran`);
        if (photos) await s.photo('#game-layer', 'tools/tmp/diagramme-choix.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nL\'AXE SE LIT, LA VIRGULE EST LÀ, ET LE CHOIX SE CLIQUE.');
process.exit(rates ? 1 : 0);
