// LE MODE COULEUR CHANGE-T-IL QUELQUE CHOSE, FICHE PAR FICHE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois fois en trois semaines : « j'ai mis la couleur pour le poly mais
// je n'ai pas de couleur quand je mets en couleur » (les trèfles), « Pour les
// pavages quand c'est couleur pour le poly, mets de la couleur », « pour le
// strimko, quand on choisit les coulerus pour l'impression, ca ne met pas les
// couleurs. Vérifie aussi les autres pour les couleurs ».
//
// Les trois fois, le défaut est le MÊME, et la troisième fois il demande
// explicitement qu'on arrête de le trouver une fiche à la fois. Le filtre
// général (`teindreHtml`, `teindreDoc`) DÉSATURE ce que le rendu a posé ; il
// n'invente pas une couleur qui n'a jamais été écrite. Une fiche dessinée en
// gris reste donc grise quoi qu'on coche, et rien ne le dit.
//
// CE QUE CET OUTIL MESURE, ET POURQUOI C'EST LA BONNE QUESTION : il dessine
// chaque fiche DEUX FOIS — en « Noir et blanc » puis en « Couleur » — et
// compare les deux chaînes. Si elles sont identiques au caractère près, le
// sélecteur de couleur ne fait rien sur cette fiche. Ce n'est pas forcément un
// défaut : une fiche qui n'a que du trait noir n'a rien à colorer, et c'est
// très bien. Mais c'est la LISTE COURTE dans laquelle le défaut se cache.
//
// ET LA MESURE PASSE PAR `teindreHtml`, COMME L'APERÇU DE RÉMY. La première
// version comparait ce que le RENDU rend, sans ce filtre : elle annonçait
// SOIXANTE-UNE fiches sourdes, dont le Mastermind — qui écrit pourtant ses
// onze couleurs et les voit grisées par le filtre, donc qui répond très bien.
// Un rendu n'a pas à consulter le mode pour être coloré ; c'est `printSheet.js`
// qui teint l'aperçu d'un coup (ligne 810), et c'est donc là qu'il faut se
// placer. Une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure
// pas son problème — et celle-là désignait soixante coupables innocents.
//
//     node tools/couleursDesFiches.mjs            # la liste des fiches sourdes
//     node tools/couleursDesFiches.mjs --toutes   # et celles qui répondent
//
// Il ne juge pas : il dit « sourde » ou « colorée ». Savoir si la fiche sourde
// DEVRAIT répondre demande de regarder l'écran du même exercice, et c'est un
// travail d'humain.

// `ficheRendu` et les rendus touchent `document` au chargement : on leur en
// donne un qui ne sert à rien, comme `tests/polyMiseEnPage.test.mjs`.
globalThis.document = globalThis.document || {
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }) }) })
};
globalThis.window = globalThis.window || { localStorage: null, matchMedia: null };

const { reglerModePolycopie, teindreHtml } = await import('../js/ui/ficheRendu.js');
const { getGenerator } = await import('../js/core/registry.js');
await import('../js/core/activities/index.js');
const { exercices } = await import('../js/data/catalog.js');
const { makeRng } = await import('../js/core/ids.js');

// LES FAMILLES, UNE PAR UNE — et non `printSheet.js`, qui construit une
// interface entière au chargement. C'est le même assemblage que celui de
// `RENDUS` là-bas ; s'il en manque une, l'outil le dit au lieu de l'ignorer.
const FAMILLES = ['grilles', 'jeux', 'mots', 'casseTete', 'figures', 'elementsGeo',
    'axes', 'latins', 'theoremes', 'reperage', 'nombres', 'algorithmes'];
const RENDUS = {};
const DE_QUI = {};
for (const f of FAMILLES) {
    const mod = await import(`../js/ui/fiches/${f}.js`);
    const table = Object.values(mod).find(v => v && typeof v === 'object'
        && !Array.isArray(v) && Object.values(v).some(r => r && r.previewGrille));
    if (!table) { console.log(`  ?  ${f}.js : aucune table de rendus trouvée`); continue; }
    for (const [cle, rendu] of Object.entries(table)) { RENDUS[cle] = rendu; DE_QUI[cle] = f; }
}

/** Un item de la fiche, tiré comme le poly le tire (`generateurDeFiche`). */
function tirer(exo, i) {
    const gen = getGenerator(exo.printGeneratorId || exo.generatorId);
    if (!gen) return null;
    return gen.generate({ ...(exo.params || {}), ...(exo.printParams || {}) },
        { index: i, total: 6, rng: makeRng(`${exo.id}-${i}`), papier: true, themesExclus: [] });
}

function dessiner(mode, faire) {
    reglerModePolycopie(mode);
    try { return faire(); } finally { reglerModePolycopie('nb'); }
}

// TROIS TIRAGES, PAS UN. Plusieurs fiches ne colorent que CERTAINS items — le
// codage d'un angle donné, la pièce d'un pavage à deux couleurs —, et un tirage
// unique les déclarerait sourdes à tort.
const TIRAGES = 3;
// UNE BOÎTE DE LA TAILLE DE CELLES DU POLY : deux par ligne, trois rangées.
const SLOT = { boite: { x: 10, y: 10, w: 90, h: 60 } };

const sourdes = [], colorees = [], muettes = [];
const vus = new Set();

for (const exo of exercices) {
    const cle = exo.printable;
    if (!cle || !RENDUS[cle] || vus.has(cle)) continue;
    const rendu = RENDUS[cle];
    if (typeof rendu.previewGrille !== 'function') continue;
    vus.add(cle);

    let repond = false, dessine = false, souci = null;
    for (let i = 0; i < TIRAGES && !repond; i++) {
        let item;
        try { item = tirer(exo, i); } catch (e) { souci = e.message; break; }
        if (!item) { souci = 'pas de générateur'; break; }
        try {
            const nb = dessiner('nb',
                () => teindreHtml(rendu.previewGrille(item, SLOT, 1, false)));
            const co = dessiner('couleur',
                () => teindreHtml(rendu.previewGrille(item, SLOT, 1, false)));
            dessine = true;
            if (nb !== co) repond = true;
        } catch (e) { souci = e.message; break; }
    }
    const ligne = `${cle}  (${DE_QUI[cle]}.js, ${exo.id})`;
    if (souci || !dessine) muettes.push(`${ligne} — ${souci || 'rien dessiné'}`);
    else if (repond) colorees.push(ligne);
    else sourdes.push(ligne);
}

const tout = process.argv.includes('--toutes');
console.log(`\n${sourdes.length} fiche(s) SOURDE(S) au mode couleur :\n`);
sourdes.forEach(l => console.log(`  ·  ${l}`));
if (muettes.length) {
    console.log(`\n${muettes.length} fiche(s) qu'on n'a pas pu mesurer :\n`);
    muettes.forEach(l => console.log(`  ?  ${l}`));
}
if (tout) {
    console.log(`\n${colorees.length} fiche(s) qui répondent :\n`);
    colorees.forEach(l => console.log(`  ok ${l}`));
} else {
    console.log(`\n(${colorees.length} fiche(s) répondent — \`--toutes\` pour les voir.)`);
}
console.log('');
