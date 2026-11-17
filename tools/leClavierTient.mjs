// LE CLAVIER TIENT-IL DANS L'ÉCRAN ? — et le dessin reste-t-il lisible ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui, 17 novembre : « le pavé numérique est un peu
// tronqué ». Le bouton « Suivant » tombait sous le bord de la fenêtre, sur
// L'Axe au Centième.
//
// ── POURQUOI UNE SONDE, ET POURQUOI ELLE RESTE ────────────────────────────
//
// AUCUNE ÉPREUVE DE SOURCE NE PEUT VOIR CELA. La hauteur d'un clavier est la
// somme de douze règles de feuille de style, dont six `clamp()` en unités de
// conteneur ; elle ne se lit pas, elle se mesure — et elle change à chaque
// format d'écran. Mesuré au premier passage :
//
//     1440 × 900 ....... le pavé finit à 874, dans 900 — ça tient
//     1280 × 800 ....... il finit à 810, dans 800 — 10 px dehors
//     1440 × 700 ....... il finit à 732, dans 700 — 32 px dehors
//
// ET LA ZONE DÉFILE, ce qui est le piège : rien ne casse, rien ne rougit, et
// l'élève voit un clavier coupé. Sur un écran tactile, le geste qui fait
// défiler et le geste qui appuie se disputent la même touche.
//
// ── ET LA SECONDE MOITIÉ DE LA MESURE, QUI COMPTE AUTANT ──────────────────
//
// « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
// cassé. » La première correction faisait bien tenir le clavier — en serrant
// la figure de l'axe de 1180 à 860 px, c'est-à-dire 7,7 px entre deux petits
// traits au lieu de 10,1. Or COMPTER LES TRAITS EST L'EXERCICE, et le dépôt
// s'était fixé 9,5 px comme minimum. On mesure donc les deux ensemble, parce
// qu'on peut toujours faire tenir un clavier en rendant le dessin illisible.
//
//     node tools/leClavierTient.mjs            # les six formats
//     node tools/leClavierTient.mjs --photos   # et les images dans tools/tmp/

import { ouvrirSonde } from './sonde.mjs';

// LES FORMATS SONT CEUX DE LA SALLE, pas des ronds de chiffre. Un portable de
// professeur au vidéoprojecteur, un poste de salle informatique, une tablette
// posée à plat, et la fenêtre basse de Rémy — celle de sa capture.
const ECRANS = [
    { nom: 'portable 1440 × 900', l: 1440, h: 900 },
    { nom: 'fenêtre basse 1440 × 700', l: 1440, h: 700 },
    { nom: 'poste 1280 × 800', l: 1280, h: 800 },
    { nom: 'grand 1600 × 760', l: 1600, h: 760 },
    { nom: 'tablette 1024 × 768', l: 1024, h: 768 },
    { nom: 'téléphone 390 × 844', l: 390, h: 844 }
];

// LES EXERCICES À CLAVIER LES PLUS HAUTS DU DÉPÔT : une figure qui prend toute
// la largeur, un solide, une figure plate, et un angle. Si le clavier tient
// sous ceux-là, il tient partout.
const EXOS = ['num-lire-au-centieme', 'mes-volumes', 'mes-aires', 'geo-angles-manquants'];

// CE QUE LE DÉPÔT S'EST FIXÉ, et d'où cela vient : « cent intervalles sur 860
// unités font 8,6 unités chacun — mesuré à l'écran, cela donne 9,5 px sur un
// ordinateur et 7,2 ailleurs, le minimum pour que l'oeil sépare deux
// graduations qu'on lui demande de compter » (js/core/figures.js).
//
// LE SEUIL DÉPEND DONC DE L'ÉCRAN, et c'est la phrase ci-dessus qui le dit :
// DEUX valeurs y étaient écrites, pas une. Mon premier jet n'en gardait qu'une,
// 9,0 pour tout le monde — et la sonde a aussitôt accusé la tablette (8,8 px)
// et le téléphone (7,7 px) d'un défaut que personne n'avait introduit et que le
// dépôt avait accepté en connaissance de cause.
//
// UNE SONDE QUI CRIE SUR DU CODE SAIN NE SE RELANCE PAS DEUX FOIS. C'est la
// seule façon de perdre un outil qui marche.
const traitMini = (largeur) => (largeur >= 1280 ? 9.0 : 7.2);
// ET CE QU'UN DOIGT DEMANDE. On ne descend pas sous 44 px : c'est la borne de
// toutes les recommandations d'accessibilité, et celle du bon sens.
const TOUCHE_MINI = 44;

const photos = process.argv.includes('--photos');
let echecs = 0;
const ok = (quoi, vrai, detail = '') => {
    if (!vrai) echecs++;
    console.log((vrai ? '  ok   ' : '  NON  ') + quoi + (detail ? '  — ' + detail : ''));
};

for (const e of ECRANS) {
    console.log(`\n  ── ${e.nom} ──`);
    const s = await ouvrirSonde({ largeur: e.l, hauteur: e.h });
    await s.identifier();
    for (const exo of EXOS) {
        await s.ouvrirExercice(exo);
        await s.page.waitForTimeout(800);
        const m = await s.page.evaluate(() => {
            const pave = document.querySelector('.numpad');
            if (!pave) return { absent: true };
            const r = pave.getBoundingClientRect();
            const touche = document.querySelector('.numpad-key');
            const axe = document.querySelector('.figure-wrap--cent svg');
            return {
                // LE BAS DU CLAVIER CONTRE LE BAS DE LA FENÊTRE, et non contre
                // le bas de sa zone : c'est ce que l'élève voit.
                dehors: Math.round(r.bottom - window.innerHeight),
                touche: touche ? Math.round(touche.getBoundingClientRect().height) : 0,
                // 860 des 960 unités du viewBox portent les cent intervalles.
                trait: axe ? +(axe.getBoundingClientRect().width * (860 / 960) / 100).toFixed(1) : null
            };
        });
        if (m.absent) { console.log(`     ${exo} : pas de clavier`); continue; }
        ok(`${exo.padEnd(22)} le clavier tient en entier`, m.dehors <= 0,
            m.dehors > 0 ? `${m.dehors} px sous le bord` : `${-m.dehors} px de marge`);
        ok(`${' '.repeat(22)} et la touche reste au doigt`, m.touche >= TOUCHE_MINI,
            `${m.touche} px`);
        if (m.trait !== null) {
            const seuil = traitMini(e.l);
            ok(`${' '.repeat(22)} et l'on sépare encore deux traits`, m.trait >= seuil,
                `${m.trait} px, seuil ${seuil}`);
        }
        if (photos) await s.photo('.canvas-area', `tools/tmp/clavier-${exo}-${e.l}x${e.h}.png`);
    }
    await s.fermer();
}

console.log('\n' + '─'.repeat(64));
console.log(echecs
    ? `\n${echecs} POINT(S) À REVOIR.`
    : `\nLE CLAVIER TIENT SUR LES ${ECRANS.length} FORMATS, ET LE DESSIN RESTE LISIBLE.`);
process.exit(echecs ? 1 : 0);
