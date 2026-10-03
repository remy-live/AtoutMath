// L'AIDE MONTRE-T-ELLE LA FIGURE DONT SA QUESTION PARLE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de l'onglet « Un exemple » à l'appui : « dans l'aide j'ai cela,
// mais il manque le schéma ».
//
// L'écran disait, en gros et au centre :
//
//     « Comment note-t-on cette figure ? »
//
// …et il n'y avait pas de figure. Une question qui désigne un dessin absent est
// mot pour mot impossible à résoudre — sur l'écran qui existe précisément pour
// expliquer.
//
// ── C'EST LA DEUXIÈME FOIS, ET LA PREMIÈRE A LAISSÉ UN OUTIL ───────────────
//
// Rémy, alors sur le carnet d'erreurs : « quand il y a quelque chose de visuel,
// il faut afficher ce visuel ». `figuresDe` est née là. L'aide, écrite à part,
// ne l'employait pas : elle prenait `prompt.text || prompt.html` — donc jamais
// le dessin, puisque la phrase existe toujours.
//
// ── POURQUOI UNE SONDE ET PAS SEULEMENT UNE ÉPREUVE ────────────────────────
//
// Une épreuve de module vérifie que `etapesExemple` RAPPORTE la figure. Elle ne
// dit pas que le panneau la DESSINE : il faut qu'elle traverse le gabarit sans
// être échappée, qu'elle tienne dans la largeur du panneau, et qu'elle ne
// pousse pas le bouton « Montre-moi la première étape » hors de l'écran — trois
// choses qui ne se voient qu'en pixels.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

/** Ouvre un exercice, ouvre son aide, va sur « Un exemple », et regarde. */
async function regarderLExemple(exoId) {
    await s.ouvrirExercice(exoId);
    await dormir(900);
    await s.page.evaluate(async () => {
        const { ouvrirAide } = await import('./js/ui/aideExercice.js');
        await ouvrirAide();
    });
    await dormir(900);
    // ON CLIQUE L'ONGLET, on n'appelle pas la fonction derrière : c'est le
    // geste de Rémy, et c'est lui qui peint.
    const ouvert = await s.page.evaluate(() => {
        const b = [...document.querySelectorAll('#aide-onglets .aide-onglet')]
            .find((x) => /exemple/i.test(x.textContent || ''));
        if (!b) return false;
        b.click();
        return true;
    });
    if (!ouvert) return { onglet: false };
    await dormir(700);
    return s.page.evaluate(() => {
        const corps = document.getElementById('aide-corps');
        const q = corps ? corps.querySelector('.aide-question') : null;
        const fig = corps ? corps.querySelector('.aide-figure') : null;
        const svg = fig ? fig.querySelector('svg') : null;
        const r = svg ? svg.getBoundingClientRect() : null;
        const bouton = corps ? corps.querySelector('[data-suivant]') : null;
        const rb = bouton ? bouton.getBoundingClientRect() : null;
        const panneau = corps ? corps.getBoundingClientRect() : null;
        return {
            onglet: true,
            question: q ? q.textContent.replace(/\s+/g, ' ').trim() : '',
            figure: !!fig,
            svg: !!svg,
            largeur: r ? Math.round(r.width) : 0,
            hauteur: r ? Math.round(r.height) : 0,
            // LA FIGURE NE DOIT PAS DÉBORDER DU PANNEAU, ni pousser le bouton
            // hors de l'écran : une aide qu'on ne peut plus faire avancer ne
            // ressemble pas à une aide, elle ressemble à une panne.
            deborde: !!(r && panneau && (r.width > panneau.width + 2)),
            boutonVisible: !!(rb && rb.width > 0 && rb.top < window.innerHeight),
            // ET LE SVG NE DOIT PAS ÊTRE ÉCHAPPÉ : un `&lt;svg&gt;` affiché en
            // toutes lettres est l'autre façon de rater cette correction.
            enClair: !!(corps && /&lt;svg|&lt;div/.test(corps.innerHTML))
        };
    });
}

await s.identifier();
await dormir(1200);

// ── L'EXERCICE DE RÉMY : « Comment note-t-on cette figure ? » ───────────────
console.log('\n\x1b[1mSEGMENT, DROITE OU DEMI-DROITE ? (geo-notation)\x1b[0m');
const avec = await regarderLExemple('geo-notation');
console.log(`   la question : « ${avec.question} »`);
console.log(`   la figure : ${avec.svg ? `${avec.largeur}×${avec.hauteur} px` : 'ABSENTE'}`);
dire('l\'onglet « Un exemple » existe', avec.onglet !== false);
dire('LA FIGURE EST LÀ, ET C\'EST UN VRAI DESSIN',
    avec.svg && avec.largeur > 30 && avec.hauteur > 10,
    avec.svg ? `${avec.largeur}×${avec.hauteur}` : '(aucun svg)');
dire('elle ne déborde pas du panneau', !avec.deborde);
dire('elle ne borne pas la hauteur au point de cacher le bouton', avec.boutonVisible);
dire('le SVG est DESSINÉ, et non écrit en toutes lettres', !avec.enClair);

// ── LE TÉMOIN : UN EXERCICE SANS FIGURE N'EN INVENTE PAS ────────────────────
//
// SANS CE TÉMOIN, un `.aide-figure` posé systématiquement — même vide — ferait
// passer la mesure d'au-dessus au vert. On vérifie donc que l'addition est
// CONDITIONNELLE, en regardant un exercice de calcul pur.
console.log('\n\x1b[1mTÉMOIN : UN EXERCICE SANS FIGURE (calc-add)\x1b[0m');
await s.page.evaluate(() => {
    const f = document.querySelector('#modal-aide .modal-close, #modal-aide [data-fermer]');
    if (f) f.click();
});
await dormir(500);
const sans = await regarderLExemple('calc-add');
console.log(`   la question : « ${sans.question} »`);
dire('TÉMOIN : aucune figure n\'est inventée là où il n\'y en a pas',
    !sans.svg, sans.svg ? `un dessin de ${sans.largeur}×${sans.hauteur} est apparu` : 'aucune');
dire('TÉMOIN : et l\'exemple marche quand même', !!sans.question, sans.question);

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLA QUESTION DE L\'AIDE PORTE LA FIGURE DONT ELLE PARLE.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
