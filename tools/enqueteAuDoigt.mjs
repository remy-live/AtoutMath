// L'ENQUÊTE, PAR LE CHEMIN DE L'ÉLÈVE — le plan dessiné, les outils, les cartes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/enqueteAuDoigt.mjs
//
// RÉMY, 28 octobre, capture d'un jeu du commerce à l'appui : « Ce jeu ressemble
// à l'enquête mais l'enquête fait vraiment vieux […] il faudrait qqch de plus
// visuel ». Il a choisi la maquette B — tous les indices en cartes — et a
// demandé en plus les outils Croix et Notes.
//
// CE QUE CETTE SONDE MESURE, et pourquoi chaque ligne est là :
//
//   · CHAQUE PIÈCE A SON SOL, ET DEUX PIÈCES VOISINES NE SE RESSEMBLENT PAS.
//     Une épreuve le garde sur les données ; ici on le lit sur les PIXELS, car
//     c'est la feuille de style qui pose le `background` — un sol déclaré et
//     jamais appliqué rendrait un plan uni sans qu'aucun compteur ne bouge.
//   · CHAQUE REPÈRE EST DESSINÉ, et l'étiquette du lieu ne lui tombe pas
//     dessus : le premier jet posait « le hall » sur l'horloge.
//   · LES TROIS OUTILS NEUFS ÉCRIVENT QUELQUE CHOSE. Croix pose une croix,
//     Notes pose un visage pâle, Effacer enlève les deux. Un outil qui change
//     de couleur sans rien écrire est le défaut le plus silencieux possible.
//   · ET LE PLAN NE DÉBORDE PAS au doigt — c'est un carré de cinq cases sur un
//     téléphone de 390 px.

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

/** Touche une case du plan par sa rangée et sa colonne. */
const toucherCase = (s, r, c) => s.page.evaluate(([a, b]) => {
    const el = document.querySelector(`.eq-case[data-r="${a}"][data-c="${b}"]`);
    if (el) el.click();
}, [r, c]);

/**
 * CHOISIT LE PERSONNAGE DE RANG `k`, et s'assure qu'il l'est VRAIMENT.
 *
 * Un toucher sur un portrait BASCULE la sélection. Touché deux fois au cours
 * d'une même passe, il se retrouve désélectionné — et la mesure d'après
 * annonçait que « Placer » ne posait rien, alors que c'est la sonde qui
 * n'avait personne en main.
 */
const choisir = (s, k) => s.page.evaluate((i) => {
    const b = document.querySelectorAll('.eq-chip')[i];
    if (!b) return;
    if (b.getAttribute('aria-pressed') !== 'true') b.click();
}, k);

/** Touche un bouton de la barre d'outils par son nom. */
const outil = (s, nom) => s.page.evaluate((n) => {
    const b = [...document.querySelectorAll('.eq-outil')]
        // LE NOM SEUL NE SUFFIT PAS : le bouton porte son icône devant, donc son
        // `textContent` vaut « ✕Croix ». Cherché à l'égalité, aucun outil n'était
        // sélectionné et les trois mesures suivantes annonçaient que Croix,
        // Notes et Effacer n'écrivaient rien. La sonde mentait, pas le logiciel.
        .find(x => (x.textContent || '').trim().endsWith(n));
    if (b) b.click();
}, nom);

const etat = (s) => s.page.evaluate(() => ({
    cases: document.querySelectorAll('.eq-case').length,
    sols: new Set([...document.querySelectorAll('.eq-case')]
        .map(e => getComputedStyle(e).backgroundImage)).size,
    unis: [...document.querySelectorAll('.eq-case')]
        .filter(e => getComputedStyle(e).backgroundImage === 'none').length,
    meubles: document.querySelectorAll('.eq-meuble svg').length,
    etiquettes: document.querySelectorAll('.eq-tag').length,
    cadres: document.querySelectorAll('.eq-cadre').length,
    visages: document.querySelectorAll('.eq-chip svg').length,
    cartes: document.querySelectorAll('.eq-indice').length,
    vignettes: [...document.querySelectorAll('.eq-indice')]
        .filter(e => e.querySelectorAll('.eq-vignette > *').length >= 2).length,
    croix: document.querySelectorAll('.eq-croix').length,
    notes: document.querySelectorAll('.eq-notes svg').length,
    pions: document.querySelectorAll('.eq-pion').length,
    rayes: document.querySelectorAll('.eq-indice--use').length,
    dehors: document.documentElement.scrollWidth - window.innerWidth
}));

/** Une étiquette de lieu tombe-t-elle sur un meuble ? */
const collisions = (s) => s.page.evaluate(() => {
    const chevauche = (a, b) => !(a.right <= b.left || b.right <= a.left
        || a.bottom <= b.top || b.bottom <= a.top);
    const tags = [...document.querySelectorAll('.eq-tag')].map(e => e.getBoundingClientRect());
    const meubles = [...document.querySelectorAll('.eq-meuble')].map(e => e.getBoundingClientRect());
    let n = 0;
    for (const t of tags) for (const m of meubles) if (chevauche(t, m)) n++;
    return n;
});

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-enquete', { niveau: 3 }, { questions: 2 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('.eq-carte', 'la carte du plan');
        await s.doitExister('.eq-indice', 'les cartes d\'indice');
        await s.page.waitForTimeout(350);

        const a = etat ? await etat(s) : null;
        dits.push(`${a.cases} cases, ${a.sols} sols différents, ${a.meubles} meuble(s), `
            + `${a.etiquettes} étiquette(s), ${a.cadres} cadre(s) orange`);
        if (a.cases !== 25) { ratés.push('cases'); dits.push('LE PLAN N\'A PAS 25 CASES'); }
        // Cinq pièces, cinq sols — et jamais un sol vide.
        if (a.sols < 4) { ratés.push('sols'); dits.push(`SEULEMENT ${a.sols} SOL(S) DIFFÉRENT(S)`); }
        if (a.unis) { ratés.push('sol uni'); dits.push(`${a.unis} case(s) sans sol dessiné`); }
        if (a.meubles !== 3) { ratés.push('meubles'); dits.push(`${a.meubles} meuble(s) au lieu de 3`); }
        if (a.etiquettes !== 5) { ratés.push('étiquettes'); dits.push(`${a.etiquettes} étiquette(s) au lieu de 5`); }
        if (a.cadres !== 1) { ratés.push('cadre'); dits.push(`${a.cadres} cadre(s) au lieu de 1`); }

        const choc = await collisions(s);
        dits.push(choc === 0 ? 'aucune étiquette ne tombe sur un meuble'
            : `${choc} ÉTIQUETTE(S) POSÉE(S) SUR UN MEUBLE`);
        if (choc) ratés.push('collision');

        dits.push(`${a.visages} visage(s) dans la palette, ${a.cartes} carte(s) d'indice `
            + `dont ${a.vignettes} illustrée(s)`);
        if (a.visages !== 5) ratés.push('visages');
        if (!a.cartes || a.vignettes !== a.cartes) {
            ratés.push('vignettes');
            dits.push('UNE CARTE AU MOINS N\'A PAS DE VIGNETTE');
        }

        const img = await s.photo('.eq-carte', `tools/tmp/enq-plan-${taille.nom}.png`, 0);
        dits.push(img && !img.unie ? `le plan est dessiné (${img.teintes} teintes)`
            : 'LE PLAN EST UNE IMAGE UNIE');
        if (!img || img.unie) ratés.push('plan uni');

        // ── LES TROIS OUTILS NEUFS ──────────────────────────────────────────
        await outil(s, 'Croix');
        await toucherCase(s, 0, 4);
        await toucherCase(s, 4, 0);
        const apresCroix = await etat(s);
        dits.push(apresCroix.croix === 2 ? 'la croix barre les cases touchées'
            : `LA CROIX N'ÉCRIT RIEN (${apresCroix.croix})`);
        if (apresCroix.croix !== 2) ratés.push('croix');

        await choisir(s, 0);
        await outil(s, 'Notes');
        await toucherCase(s, 1, 1);
        const apresNotes = await etat(s);
        dits.push(apresNotes.notes === 1 ? 'la note pose un visage pâle sur la case'
            : `LA NOTE N'ÉCRIT RIEN (${apresNotes.notes})`);
        if (apresNotes.notes !== 1) ratés.push('notes');

        await outil(s, 'Effacer');
        await toucherCase(s, 1, 1);
        await toucherCase(s, 0, 4);
        const apresGomme = await etat(s);
        dits.push((apresGomme.notes === 0 && apresGomme.croix === 1)
            ? 'la gomme enlève la note et la croix de la case touchée'
            : `LA GOMME N'ENLÈVE PAS (${apresGomme.croix} croix, ${apresGomme.notes} note)`);
        if (apresGomme.notes !== 0 || apresGomme.croix !== 1) ratés.push('gomme');

        // ── ET « PLACER » POSE TOUJOURS UN VISAGE ───────────────────────────
        await outil(s, 'Placer');
        await choisir(s, 0);
        await toucherCase(s, 2, 2);
        const apresPose = await etat(s);
        dits.push(apresPose.pions === 1 ? 'et « Placer » pose toujours un visage sur le plan'
            : `« PLACER » NE POSE RIEN (${apresPose.pions})`);
        if (apresPose.pions !== 1) ratés.push('placer');

        // ── UNE CARTE D'INDICE SE RAYE D'UN TOUCHER ─────────────────────────
        await s.page.evaluate(() => document.querySelector('.eq-indice').click());
        const apresRaye = await etat(s);
        dits.push(apresRaye.rayes === 1 ? 'et une carte d\'indice se raye d\'un toucher'
            : `LA CARTE NE SE RAYE PAS (${apresRaye.rayes})`);
        if (apresRaye.rayes !== 1) ratés.push('rayer');

        dits.push(`rien ne déborde en largeur : ${apresRaye.dehors} px`);
        if (apresRaye.dehors > 0) ratés.push('débordement');
        await s.page.screenshot({ path: `tools/tmp/enq-ecran-${taille.nom}.png`, fullPage: true });

        return { dits, ratés, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const sorties = [];
for (const t of TAILLES) sorties.push({ t, r: await unePasse(t) });

console.log('');
let fautes = 0;
for (const { t, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    r.dits.forEach(x => console.log(`   ${x}`));
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + r.ratés.length;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(fautes ? 1 : 0);
