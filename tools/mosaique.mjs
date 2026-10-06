// LA MOSAÏQUE DES TRANSFORMATIONS, DANS UN VRAI NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'AUCUNE ÉPREUVE DE `npm test` NE PEUT DIRE, et qui est pourtant tout ce
// que Rémy a demandé : « si l'élève se trompe, lui compter faux mais aussi
// MONTRER la transformation ».
//
// Une épreuve sous Node vérifie que la réponse annoncée est la bonne. Elle ne
// peut pas vérifier :
//
//   · que la mosaïque se DESSINE — seize pièces, leurs numéros, les lettres des
//     sommets, l'axe ou le centre de l'énoncé ;
//   · qu'un doigt sur une pièce est COMPTÉ ;
//   · que le trajet s'anime quand l'élève se trompe, et qu'il ne s'anime PAS
//     quand il a juste (sans quoi l'exercice donnerait la réponse à chaque
//     question suivante) ;
//   · qu'aucune fenêtre native ni erreur de page ne sort.
//
//   node tools/mosaique.mjs            # la série complète
//   node tools/mosaique.mjs --photos   # et des images dans tools/tmp/
//
// LA SONDE S'IDENTIFIE PUIS RECHARGE : sans quoi l'on mesure le portail, pas
// l'exercice. C'est `ouvrirSonde` qui s'en charge.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const PHOTOS = process.argv.includes('--photos');
const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
let fautes = 0;
const dire = (ok, quoi, détail = '') => {
    if (!ok) fautes++;
    const marque = ok ? '\x1b[32mok\x1b[0m    ' : '\x1b[31mRATÉ\x1b[0m  ';
    console.log(`  ${marque}${quoi}${détail ? '  — ' + détail : ''}`);
};

await s.identifier();
await s.ouvrirExercice('geo-mosaique');
await dormir(900);

console.log('\nLA MOSAÏQUE S\'AFFICHE');
console.log('─'.repeat(64));

// `doitExister` JETTE sur un crochet inventé. C'est la friction la plus chère
// du dépôt : un sélecteur faux rend `false`, c'est-à-dire la même réponse qu'un
// logiciel cassé.
await s.doitExister('.pv-svg', 'la mosaïque doit être dessinée');
await s.doitExister('.pv-case', 'ses pièces doivent être là');
await s.doitExister('.pv-num', 'et leurs numéros');
await s.doitExister('.game-question', 'la consigne');

const vu = await s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('.pv-case')];
    const pieces = new Set(cases.map(c => c.dataset.piece));
    return {
        cases: cases.length,
        pieces: pieces.size,
        numeros: document.querySelectorAll('.pv-num').length,
        lettres: document.querySelectorAll('.pv-lettre').length,
        depart: document.querySelectorAll('.pv-case.pv-depart').length,
        repere: document.querySelector('[data-repere]')?.innerHTML.trim().length || 0,
        consigne: (document.querySelector('.game-question')?.textContent || '').trim()
    };
});

dire(vu.pieces >= 10, 'la mosaïque porte au moins dix pièces', `${vu.pieces} pièces, ${vu.cases} cases`);
dire(vu.numeros === vu.pieces, 'un numéro par pièce, et un seul', `${vu.numeros} numéros`);
dire(vu.lettres >= 5, 'les sommets sont nommés', `${vu.lettres} lettres`);
dire(vu.depart > 0, 'la pièce de départ est allumée', `${vu.depart} cases allumées`);
dire(vu.repere > 0, 'l\'axe, le centre ou le vecteur est TRACÉ — il fait partie de l\'énoncé');
dire(/image de la pièce \d+ par la /.test(vu.consigne), 'la consigne est celle de la fiche', vu.consigne.slice(0, 64));
dire(!/null|undefined|NaN/.test(vu.consigne), 'et elle ne porte aucun trou');

if (PHOTOS) await s.photo('.pv-cadre', 'tools/tmp/mosaique-depart.png');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nUNE ERREUR EST COMPTÉE FAUSSE, ET LE TRAJET SE MONTRE');
console.log('─'.repeat(64));

// LA BONNE RÉPONSE SE LIT DANS LE VRAI MENEUR, PAS DANS UN CROCHET INVENTÉ.
//
// Premier jet : `window.__itemCourant`. Ce nom n'existe nulle part — et un
// crochet inventé rend `undefined`, c'est-à-dire la même réponse qu'un logiciel
// cassé. C'est la friction la plus chère du dépôt, et elle a été évitée ici
// parce qu'on a CHERCHÉ le nom dans la source avant de l'employer.
//
// `tools/sonde.mjs` monte un vrai `Runner` et le garde dans
// `window.__sondeRunner` ; le meneur porte sa `session`, et la session porte
// l'item courant. C'est le chemin de l'élève, pas une porte dérobée.
const litItem = () => s.page.evaluate(() => {
    const it = window.__sondeRunner?.session?.item;
    return it ? { answer: it.answer, depuis: it.meta?.depuis, vers: it.meta?.vers } : null;
});
const item0 = await litItem();
dire(item0 !== null, 'la sonde atteint l\'item courant par le meneur', JSON.stringify(item0));

// On touche une pièce qui n'est PAS la bonne — et pas non plus celle de départ,
// qui n'aurait aucun sens comme réponse.
const faux = await s.page.evaluate(() => {
    const dep = document.querySelector('.pv-case.pv-depart')?.dataset.piece;
    const cases = [...document.querySelectorAll('.pv-case')];
    const autre = cases.find(c => c.dataset.piece !== dep);
    if (!autre) return null;
    autre.click();
    return autre.dataset.piece;
});
dire(faux !== null, 'on peut toucher une pièce', `touché : ${faux}`);
await dormir(700);

const apres = await s.page.evaluate(() => ({
    faux: document.querySelectorAll('.pv-case.pv-faux').length,
    juste: document.querySelectorAll('.pv-case.pv-juste').length,
    fantome: document.querySelectorAll('.pv-fantome').length,
    arrivee: document.querySelectorAll('.pv-case.pv-arrivee').length,
    statut: (document.querySelector('[data-statut]')?.textContent || '').trim()
}));

dire(apres.faux > 0 || apres.juste > 0, 'la réponse est jugée', `faux ${apres.faux}, juste ${apres.juste}`);
if (apres.faux > 0) {
    dire(apres.fantome > 0, 'LE TRAJET SE MONTRE quand l\'élève se trompe — la demande de Rémy');
    dire(apres.arrivee > 0, 'et l\'arrivée s\'allume : l\'œil sait où regarder');
    dire(apres.statut.length > 0, 'l\'écran dit quoi faire', apres.statut.slice(0, 50));
}
if (PHOTOS) await s.photo('.pv-cadre', 'tools/tmp/mosaique-trajet.png');

await dormir(1400);
const enVol = await s.page.evaluate(() => {
    const f = document.querySelector('.pv-fantome');
    return f ? f.getAttribute('transform') : null;
});
dire(apres.faux === 0 || enVol !== null, 'le fantôme fait un vrai trajet, il ne saute pas', `transform : ${enVol}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nUNE BONNE RÉPONSE N\'ANIME RIEN');
console.log('─'.repeat(64));
//
// C'est l'autre moitié du réglage, et la plus facile à casser sans s'en
// apercevoir : si le trajet se jouait AUSSI sur une bonne réponse, l'exercice
// montrerait la méthode à chaque question et il n'y aurait plus rien à chercher.

await dormir(2600);
const courant = await litItem();
const bonneRep = courant && await s.page.evaluate((n) => {
    const el = document.querySelector(`.pv-case[data-piece="${n}"]`);
    if (!el) return null;
    el.click();
    return n;
}, courant.answer);
await dormir(700);
const apresBonne = await s.page.evaluate(() => ({
    juste: document.querySelectorAll('.pv-case.pv-juste').length,
    fantome: document.querySelectorAll('.pv-fantome').length
}));
if (bonneRep !== null) {
    dire(apresBonne.juste > 0, 'une bonne réponse est reconnue', `pièce ${bonneRep}`);
    dire(apresBonne.fantome === 0, 'et le trajet ne se joue PAS : l\'élève a cherché, il a trouvé');
} else {
    console.log('  ····  la question avait déjà tourné : pas de bonne réponse à mesurer');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nLE VERDICT');
console.log('─'.repeat(64));
console.log(`fenêtres natives : ${s.fenetresNatives.length}`);
console.log(`erreurs de page  : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('    ' + e));
if (s.fenetresNatives.length) fautes++;
if (s.erreurs.length) fautes++;
console.log(fautes ? `\n\x1b[31m${fautes} chose(s) à reprendre.\x1b[0m` : '\n\x1b[32mTOUT TIENT.\x1b[0m');

await s.fermer();
process.exit(fautes ? 1 : 0);
