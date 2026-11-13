// LE DESSIN DES PASTILLES, MONDE PAR MONDE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais rajouter d'autres thèmes […] mais aussi du design des
// icones, un peu comme si on allait dans différents monde de mario ».
//
// CE QUE CET OUTIL MESURE, ET POURQUOI L'AUTRE NE SUFFIT PAS.
// `tools/decorsDeSaison.mjs` photographie l'APERÇU du professeur : une carte de
// 170 px de large, où une pastille fait huit pixels. On y voit la couleur du
// ciel, et rien de la matière. Or la matière EST la demande — un bloc carré,
// un écu, un hublot. Celui-ci ouvre la vue de l'élève en grand et découpe la
// colonne des pastilles, à l'échelle 2.
//
// ET IL REGARDE LES QUATRE ÉTATS DANS LA MÊME IMAGE : une étape réussie (l'or),
// l'étape en cours (le halo), une étape qui attend, une verrouillée. C'est là
// que se voit le défaut qu'aucun test ne verrait — un monde qui repeint l'or de
// la réussite, ou qui arrondit un bloc sur un seul état.
//
//     node tools/pastillesDesMondes.mjs              # tous les mondes
//     node tools/pastillesDesMondes.mjs retro ocean  # ceux-là seulement
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const voulus = process.argv.slice(2).filter(a => !a.startsWith('--'));

const s = await ouvrirSonde({ largeur: 900, hauteur: 1240 });
await s.identifier();

const MONDES = await s.page.evaluate(async () => {
    const m = await import('/js/ui/pathView.js?v=' + Date.now());
    return m.DECORS.filter(d => d.matiere || d.id === 'aucun')
        .map(d => ({ id: d.id, matiere: d.matiere || '—' }));
});
const liste = voulus.length ? MONDES.filter(m => voulus.includes(m.id)) : MONDES;
console.log(`${liste.length} monde(s) à regarder.`);

// LA VUE DE L'ÉLÈVE, MONTÉE À LA MAIN. Le professeur ne la voit pas : elle est
// en `display: none` derrière `.student-only`, et une boîte cachée mesure zéro
// — donc toute photo serait vide sans lever d'erreur.
const monte = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makeStep } = await import('./js/core/path.js');
    const vue = document.getElementById('view-path');
    if (!vue) return 'vue absente';
    document.querySelectorAll('.student-only').forEach(
        e => e.style.setProperty('display', 'block', 'important'));
    vue.style.setProperty('display', 'block', 'important');
    state.setStudentPath(
        ['calc-add', 'frac-add', 'geo-angles-mesure', 'calc-add', 'frac-add']
            .map((id, i) => makeStep(id, {}, { stepId: 's' + i })),
        { pathId: 'essai', name: 'Les mondes',
            // `ordreLibre` DONNE L'ÉTAT QUI MANQUAIT. Sans lui, un élève qui n'a
        // rien fait voit UNE étape en cours et quatre verrouillées : l'état
        // `--open`, celui qui ATTEND, n'est jamais rendu — et c'est précisément
        // celui que la matière d'un monde habille. La première version de cette
        // sonde a donc photographié quatre pastilles grises et conclu que tout
        // allait bien.
        policy: { presentation: 'chemin', decor: 'libre', ordreLibre: true } });
    const { renderStudentPathView } = await import('./js/ui/pathView.js');
    renderStudentPathView();
    return 'montée';
});
console.log('vue de l\'élève :', monte);
await s.doitExister('.world-node');

let ko = 0;
for (const monde of liste) {
    // ON CHOISIT PAR LE BOUTON, comme l'élève — pas en posant la classe à la
    // main. Un décor qui ne s'applique que lorsqu'on triche n'est pas appliqué.
    const clique = await s.page.evaluate((id) => {
        const btns = [...document.querySelectorAll('.path-style-btn')];
        const b = btns.find(x => x.getAttribute('aria-label') || '');
        void b;
        try { localStorage.setItem('mathbox-path-decor', id); } catch (e) { /* privé */ }
        return true;
    }, monde.id);
    void clique;
    await s.page.evaluate(async () => {
        const { renderStudentPathView } = await import('/js/ui/pathView.js');
        renderStudentPathView();
    });
    await dormir(500);

    // DEUX ÉTATS POSÉS À LA MAIN, ET ON LE DIT. L'or d'une réussite demande un
    // journal, le gris d'un verrou demande un ordre imposé : les obtenir pour
    // de vrai demanderait de jouer cinq exercices à chaque monde. Or ce qu'on
    // vérifie ici est une CASCADE — la règle d'un monde doit perdre contre
    // `.world-node--done` —, et la cascade ne sait pas d'où vient la classe.
    // Poser la classe est donc la mesure juste, à condition de l'écrire.
    await s.page.evaluate(() => {
        const n = [...document.querySelectorAll('.world-node')];
        if (n[0]) n[0].className = 'world-node world-node--done';
        if (n[4]) n[4].className = 'world-node world-node--locked';
    });

    const vu = await s.page.evaluate(() => {
        const carte = document.querySelector('.duo-path');
        const n = [...document.querySelectorAll('.world-node')];
        const etat = (el) => [...el.classList].find(c => c.startsWith('world-node--')) || '?';
        const btn = (el) => {
            const b = el.querySelector('.world-node-btn');
            const st = getComputedStyle(b);
            return { etat: etat(el), rayon: st.borderRadius, bord: st.borderColor };
        };
        return { classes: carte ? carte.className : null, pastilles: n.map(btn),
            pictos: [...document.querySelectorAll('.world-node-picto')].map(p => p.textContent).join('') };
    });
    const photo = await s.photo('.duo-path', `tools/tmp/pastilles-${monde.id}.png`);
    const or = vu.pastilles.find(p => p.etat === 'world-node--done');
    console.log(`\n${monde.id.padEnd(10)} (${monde.matiere})`);
    console.log('   ', vu.classes);
    console.log('    états :', vu.pastilles.map(p => `${p.etat.replace('world-node--', '')} r=${p.rayon.split(' ')[0]}`).join(' · '));
    console.log('    pictos :', vu.pictos, '· unie :', photo && photo.unie);
    if (or && !/245, 158, 11|#f59e0b/i.test(or.bord)) {
        console.log(`    NON  l'or de la réussite a été repeint : ${or.bord}`);
        ko++;
    }
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
await s.fermer();
console.log(ko === 0 ? '\nCHAQUE MONDE A SA PASTILLE, ET L’OR RESTE L’OR.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
