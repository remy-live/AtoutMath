// LES QUATRE DÉCORS, REGARDÉS PAR LE CHEMIN DU PROFESSEUR.
//
// RÉMY : « mets aussi des thèmes (Noël, Halloween, Paques, Robot) ».
//
// CE QUE CET OUTIL MESURE, et qu'aucune épreuve de texte ne peut dire :
//
//   · LE CONTRASTE SUR LES PIXELS. Un décor repeint `--primary`, et la gommette
//     de rang de l'étape en cours écrit du BLANC dessus. Le calcul sur les
//     valeurs hexadécimales vit dans `tests/decorsDeSaison.test.mjs` ; ici on
//     lit la couleur que le navigateur a réellement posée, donc les `color-mix`
//     et les dégradés que le calcul ne voit pas.
//   · QUE LA CARTE N'EST PAS UNIE. `photo` le dit : une nappe d'ornements mal
//     placée, ou un `z-index` qui passe devant, se voit là et nulle part
//     ailleurs.
//   · QUE LES DEUX RANGÉES DE BOUTONS TIENNENT SUR UN TÉLÉPHONE. Dix pastilles
//     de 36 px font 420 px : c'est la mesure qui a imposé deux groupes.
//
// À relancer à chaque décor ajouté : c'est le seul endroit où l'on voit si la
// teinte choisie tient sur l'écran, et non sur le papier.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const DECORS = ['aucun', 'noel', 'halloween', 'paques', 'robot'];

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1200 });
await s.identifier();
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    state.currentPath = makePath('Essai', [makeStep('calc-add', {}, { stepId: 's1' })],
        politiquePerso());
});
await s.page.evaluate(() => document.getElementById('btn-path-policy').click());
await dormir(1800);
await s.doitExister('#cfg-presentation');
await s.doitExister('#cfg-decor');

// ── 1 · LE DÉCOR SUR CHAQUE HABILLAGE ───────────────────────────────────────
// Les vingt combinaisons sont la raison d'être de l'axe à part : on en regarde
// quatre — un décor par habillage illustré — plus les cinq décors sur le
// chemin, qui est le défaut.
console.log('\n── chaque décor sur le chemin ──');
await s.page.selectOption('#cfg-presentation', 'chemin');
for (const decor of DECORS) {
    await s.page.selectOption('#cfg-decor', decor);
    await dormir(900);
    const vu = await s.page.evaluate(() => {
        const b = document.getElementById('cfg-presentation-apercu');
        const carte = b.firstElementChild;
        return {
            classes: carte ? carte.className : null,
            ornements: b.querySelectorAll('.decor-ornement').length,
            pastilles: b.querySelectorAll('.world-node').length,
            // LE PICTO EST CE QU'ON VÉRIFIE EN PREMIER : un décor qui le mange
            // rend toutes les étapes identiques.
            pictos: [...b.querySelectorAll('.world-node-picto')].map(p => p.textContent).join(''),
            primaire: carte ? getComputedStyle(carte).getPropertyValue('--primary').trim() : null
        };
    });
    const c = await s.contrasteRendu('.cfg-apercu .world-node--current .world-node-rang');
    console.log(decor.padEnd(10), JSON.stringify(vu), '· contraste rendu', c);
    await s.photo('.cfg-apercu', `tools/tmp/decor-${decor}.png`);
}

console.log('\n── Noël sur les cinq habillages ──');
await s.page.selectOption('#cfg-decor', 'noel');
for (const style of ['chemin', 'mondes', 'damier', 'ruban', 'classique']) {
    await s.page.selectOption('#cfg-presentation', style);
    await dormir(900);
    const vu = await s.page.evaluate(() => {
        const b = document.getElementById('cfg-presentation-apercu');
        const carte = b.firstElementChild;
        return { classes: carte ? carte.className : null,
            ornements: b.querySelectorAll('.decor-ornement').length };
    });
    console.log(style.padEnd(10), JSON.stringify(vu));
    await s.photo('.cfg-apercu', `tools/tmp/decor-noel-${style}.png`);
}

// ── 2 · ET « LAISSER CHOISIR » DIT CE QUI S'APPLIQUERA QUAND MÊME ───────────
await s.page.selectOption('#cfg-presentation', 'libre');
await dormir(700);
console.log('\nhabillage libre + décor Noël :',
    JSON.stringify(await s.page.evaluate(
        () => document.getElementById('cfg-presentation-apercu').textContent.trim())));

console.log('\nerreurs :', s.erreurs.length, '· fenêtres natives :', s.fenetresNatives.length);
await s.fermer();

// ── 3 · LES DEUX RANGÉES DE BOUTONS, SUR UN TÉLÉPHONE ───────────────────────
// Mesuré au doigt, parce que c'est là que dix pastilles débordaient.
const t = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await t.identifier();
const monte = await t.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makeStep } = await import('./js/core/path.js');
    // LA VUE DE L'ÉLÈVE EST CACHÉE QUAND ON EST LE PROFESSEUR, et une boîte
    // en `display: none` mesure 0 — ce qui donnerait « ça tient » quoi qu'il
    // arrive. On la montre donc, puis on mesure.
    const vue = document.getElementById('view-path');
    if (!vue) return 'vue absente';
    // `!important` DANS LA FEUILLE GAGNE CONTRE UN STYLE EN LIGNE ORDINAIRE.
    // Mesuré : `vue.style.display = 'block'` laissait `view-path` en
    // `display: none`, les dix boutons se construisaient bien et mesuraient
    // tous 0 — c'est-à-dire la réponse « ça tient » quoi qu'il arrive.
    document.querySelectorAll('.student-only').forEach(
        e => e.style.setProperty('display', 'block', 'important'));
    vue.style.setProperty('display', 'block', 'important');
    // `state.studentPath` EST UN GETTER CALCULÉ SUR LE JOURNAL : lui affecter
    // un objet ne fait rien du tout, en silence. On passe donc par le chemin
    // du logiciel, celui qu'emprunte un code dicté.
    state.setStudentPath(['calc-add', 'frac-simplifier', 'calc-add']
        .map((id, i) => makeStep(id, {}, { stepId: 's' + i })),
    { pathId: 'essai', name: 'Avant les vacances',
        policy: { presentation: 'libre', decor: 'libre' } });
    const { renderStudentPathView } = await import('./js/ui/pathView.js');
    renderStudentPathView();
    return 'montée';
});
console.log('vue de l\'élève :', monte);
await dormir(1200);
const barre = await t.page.evaluate(() => {
    const b = document.querySelector('.path-style-switcher');
    if (!b) return 'barre absente';
    const groupes = [...b.querySelectorAll('.path-style-groupe')];
    return {
        groupes: groupes.length,
        boutons: b.querySelectorAll('.path-style-btn').length,
        largeurs: groupes.map(g => Math.round(g.getBoundingClientRect().width)),
        // DEUX LIGNES OU UNE : si les deux groupes ont le même haut, c'est
        // qu'ils tiennent côte à côte ; sinon la barre est passée à la ligne,
        // et c'est très bien — c'est ce qu'on lui demande de savoir faire.
        hauts: groupes.map(g => Math.round(g.getBoundingClientRect().top)),
        debordement: document.documentElement.scrollWidth > window.innerWidth
    };
});
console.log('\nbarre au doigt :', JSON.stringify(barre));
// ON LA RAMÈNE DANS L'ÉCRAN AVANT DE LA PHOTOGRAPHIER : la découpe se fait
// sur ce que la fenêtre montre, et une boîte à 958 px dans une fenêtre de
// 844 donne un rectangle vide — « hauteur 0 », qui ressemble à un défaut.
await t.page.evaluate(
    () => document.querySelector('.path-style-switcher').scrollIntoView({ block: 'center' }));
await t.photo('.path-style-switcher', 'tools/tmp/decor-barre-telephone.png');
console.log('erreurs :', t.erreurs.length, '· fenêtres natives :', t.fenetresNatives.length);
await t.fermer();
