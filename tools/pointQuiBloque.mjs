// « PLACER UN POINT » BLOQUE APRÈS UNE ERREUR.
//
// RÉMY : « pour l'exercice placer un point. Si l'élève se trompe, on ne peut
// plus cliquer, en fait l'exercice bloque ».
//
// Crochets LUS dans js/core/activities/repere.js et css/modules.css :
// `.rep-hit[data-c="x,y"]` sont les cibles, `.rep-svg--repondu` est la classe
// qui pose `pointer-events: none` sur toutes les cibles.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 950 });
const raté = await s.ouvrirExercice('geo-repere-placer');
if (raté) { console.log('RATÉ : ' + raté); await s.fermer(); process.exit(1); }
await s.doitExister('.rep-hit');

/** Ce que l'écran permet, à cet instant. */
const etat = () => s.page.evaluate(() => {
    const svg = document.querySelector('#game-layer svg');
    const hits = [...document.querySelectorAll('.rep-hit')];
    const vivant = hits.filter(h => getComputedStyle(h).pointerEvents !== 'none').length;
    const jeu = window.__sondeRunner && window.__sondeRunner.handle
        && window.__sondeRunner.handle.jeu;
    return {
        cibles: hits.length,
        cliquables: vivant,
        fige: !!(svg && svg.classList.contains('rep-svg--repondu')),
        marques: document.querySelectorAll('.rep-mark').length,
        enonce: (document.querySelector('.game-question') || {}).textContent || '',
    };
});

/** La bonne réponse de la question posée, lue sur l'item. */
const bonne = () => s.page.evaluate(() => {
    const r = window.__sondeRunner;
    const sess = r && r.handle && r.handle.session;
    return (sess && sess.item && sess.item.answer) || null;
});

console.log('AVANT  : ' + JSON.stringify(await etat()));
const juste = await bonne();
console.log('la bonne réponse est : ' + JSON.stringify(juste));

// ON CLIQUE À CÔTÉ, exprès — c'est tout le sujet.
const faux = await s.page.evaluate(([juste]) => {
    const hits = [...document.querySelectorAll('.rep-hit')];
    const h = hits.find(x => x.dataset.c !== String(juste));
    if (!h) return null;
    h.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return h.dataset.c;
}, [juste]);
console.log('on a cliqué en : ' + JSON.stringify(faux));
await dormir(1200);
console.log('APRÈS L\'ERREUR : ' + JSON.stringify(await etat()));

// On ferme la correction comme l'élève le ferait, puis on regarde encore.
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('#game-layer button, .modal-overlay button')]
        .filter(x => x.getBoundingClientRect().width > 0)
        .find(x => /continuer|suivant|compris|ok|fermer|réessay/i.test((x.textContent || '').trim()));
    if (b) b.click();
});
await dormir(2500);
console.log('CORRECTION FERMÉE : ' + JSON.stringify(await etat()));

await dormir(3000);
console.log('TROIS SECONDES PLUS TARD : ' + JSON.stringify(await etat()));
await s.photo('#game-layer', 'tools/tmp/point-bloque.png');
console.log('erreurs : ' + s.erreurs.length + ' ' + s.erreurs.join(' | '));
await s.fermer();
