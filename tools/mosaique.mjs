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

// ON TOUCHE UNE PIÈCE SÛREMENT FAUSSE, et il faut le dire parce que c'est une
// correction : la première version prenait « la première pièce qui n'est pas
// celle de départ ». Une fois sur dix, c'était la BONNE — la sonde mesurait
// alors une réponse juste, sautait toute la partie « le trajet se montre », et
// annonçait TOUT TIENT sans avoir rien mesuré de ce que Rémy a demandé. Une
// sonde dont le verdict dépend du hasard est pire qu'une sonde absente : elle
// est verte, donc on la croit.
const faux = await s.page.evaluate((bonne) => {
    const dep = document.querySelector('.pv-case.pv-depart')?.dataset.piece;
    const cases = [...document.querySelectorAll('.pv-case')];
    const autre = cases.find(c => c.dataset.piece !== dep && c.dataset.piece !== String(bonne));
    if (!autre) return null;
    // UN <rect> SVG N'A PAS DE `.click()` : cette méthode appartient à
    // HTMLElement, et un élément SVG est un SVGElement. On envoie donc un vrai
    // événement, ce qui est aussi plus proche du doigt de l'élève.
    autre.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return autre.dataset.piece;
}, item0 && item0.answer);
dire(faux !== null, 'on peut toucher une pièce', `touché : ${faux}`);
await dormir(700);

const apres = await s.page.evaluate(() => ({
    faux: document.querySelectorAll('.pv-case.pv-faux').length,
    juste: document.querySelectorAll('.pv-case.pv-juste').length,
    fantome: document.querySelectorAll('.pv-fantome').length,
    arrivee: document.querySelectorAll('.pv-case.pv-arrivee').length,
    statut: (document.querySelector('[data-statut]')?.textContent || '').trim()
}));

dire(apres.faux > 0, 'la première erreur est comptée fausse', `faux ${apres.faux}`);
dire(apres.statut.length > 0, 'l\'écran dit quoi faire', apres.statut.slice(0, 54));

// AU PREMIER ÉCHEC, ON NE MONTRE PAS — et c'est la règle la plus importante de
// cet écran.
//
// `core/itemSession.js` l'a apprise à ses dépens, et c'est écrit là-bas : « ON
// NE DONNE PAS LA RÉPONSE TANT QU'IL LUI RESTE UN ESSAI […] le deuxième essai
// n'était plus un essai, c'était une recopie ». Un trajet joué tout de suite
// DÉSIGNE la pièce d'arrivée : le second essai se réduirait à la toucher.
dire(apres.fantome === 0, 'et le trajet ne se joue PAS : il lui reste un essai');

// ── LE SECOND ESSAI, PUIS LA CORRECTION ─────────────────────────────────────
//
// L'élève doit pouvoir REJOUER. `tools/mosaique.mjs` a trouvé ici que
// l'activité le laissait BLOQUÉ après une erreur : la marque rouge restait, le
// clic suivant était ignoré, et la question ne tournait pas davantage.
await s.page.waitForFunction(
    () => document.querySelectorAll('.pv-case.pv-faux').length === 0,
    null, { timeout: 8000 }).catch(() => {});
const rejouable = await s.page.evaluate(
    () => document.querySelectorAll('.pv-case.pv-faux').length === 0);
dire(rejouable, 'la marque rouge s\'efface : l\'élève peut retenter');

const faux2 = await s.page.evaluate((bonne) => {
    const dep = document.querySelector('.pv-case.pv-depart')?.dataset.piece;
    const cases = [...document.querySelectorAll('.pv-case')];
    const autre = cases.find(c => c.dataset.piece !== dep && c.dataset.piece !== String(bonne));
    if (!autre) return null;
    autre.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return autre.dataset.piece;
}, item0 && item0.answer);
dire(faux2 !== null, 'il peut toucher une seconde pièce', `touché : ${faux2}`);
await dormir(700);

const apres2 = await s.page.evaluate(() => ({
    faux: document.querySelectorAll('.pv-case.pv-faux').length,
    fantome: document.querySelectorAll('.pv-fantome').length,
    arrivee: document.querySelectorAll('.pv-case.pv-arrivee').length,
    statut: (document.querySelector('[data-statut]')?.textContent || '').trim()
}));
dire(apres2.fantome > 0, 'LE TRAJET SE MONTRE quand les essais sont épuisés — la demande de Rémy');
dire(apres2.arrivee > 0, 'et l\'arrivée s\'allume : l\'œil sait où regarder');
dire(/se pose sur la pièce \d+/.test(apres2.statut), 'l\'écran dit où elle tombe', apres2.statut.slice(0, 54));
const apresEssais = apres2;
if (PHOTOS) await s.photo('.pv-cadre', 'tools/tmp/mosaique-trajet.png');

// ON MESURE LE FANTÔME PENDANT QU'IL VOLE, PAS APRÈS.
//
// Première version : on attendait 1,4 s puis on lisait son `transform`. Il
// valait `null` — et ce n'était pas « il ne bouge pas », c'était « il n'est
// plus là » : le trajet dure environ 640 ms, puis le fantôme se pose et part
// 700 ms plus tard. Une mesure prise trop tard ne dit pas que la chose est
// absente, elle dit qu'on l'a ratée, et les deux se ressemblent à l'écran.
//
// On échantillonne donc PENDANT, et l'on exige des positions DIFFÉRENTES :
// c'est la définition d'un trajet, par opposition à un saut.
const trajet = await s.page.evaluate(async () => {
    const vus = [];
    for (let i = 0; i < 14; i++) {
        const f = document.querySelector('.pv-fantome');
        if (f) vus.push(f.getAttribute('transform') || '(aucun)');
        await new Promise(ok => setTimeout(ok, 60));
    }
    return vus;
});
const etapes = new Set(trajet.filter(t => t && t !== '(aucun)'));
dire(apresEssais.fantome === 0 || etapes.size >= 3,
    'le fantôme fait un vrai trajet, il ne saute pas',
    `${etapes.size} position(s) différentes`);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nUNE BONNE RÉPONSE N\'ANIME RIEN');
console.log('─'.repeat(64));
//
// C'est l'autre moitié du réglage, et la plus facile à casser sans s'en
// apercevoir : si le trajet se jouait AUSSI sur une bonne réponse, l'exercice
// montrerait la méthode à chaque question et il n'y aurait plus rien à chercher.

// ON ATTEND QUE LA QUESTION CHANGE, on ne compte pas les secondes. Une attente
// fixe tombe soit avant le changement — on clique alors sur l'ancienne question,
// déjà répondue, et rien ne se passe — soit après, et l'on ne sait pas laquelle
// on mesure. Les deux donnent « la bonne réponse n'est pas reconnue » pour une
// raison qui n'a rien à voir avec le code mesuré.
// ON ATTEND CE QU'ON PEUT VOIR, pas ce qu'on suppose. Guetter un changement de
// « pièce de départ » échoue quand la question suivante part de la même pièce —
// l'attente expire, on clique sur une question déjà répondue, et rien ne se
// passe. Le marquage rouge de la réponse fausse, lui, disparaît forcément quand
// l'écran se redessine : c'est le signal honnête.
// L'ÉLÈVE FERME LA CORRECTION, ET LA SONDE AUSSI.
//
// `announce()` rend une promesse que l'activité attend pour enchaîner, et c'est
// la FERMETURE du retour qui la résout (`js/ui/gameFeedbackUI.js`, bouton
// `.fb-close` — « J'ai compris »). Tant que personne ne clique, la question ne
// tourne pas : c'est voulu, et c'est juste.
//
// La sonde l'ignorait. Elle attendait donc quinze secondes que l'écran change
// tout seul, puis cliquait sur une question déjà répondue — où le clic est
// ignoré — et concluait « une bonne réponse n'est pas reconnue ». Le défaut
// était dans la mesure, pas dans l'écran : vérifié à part, une bonne réponse
// est parfaitement reconnue.
await s.page.evaluate(() => {
    document.querySelector('.fb-close')?.click();
});
await s.page.waitForFunction(
    () => document.querySelectorAll('.pv-case.pv-faux').length === 0,
    null, { timeout: 15000 }).catch(() => {});
await dormir(600);
const courant = await litItem();
const bonneRep = courant && await s.page.evaluate((n) => {
    const el = document.querySelector(`.pv-case[data-piece="${n}"]`);
    if (!el) return null;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
