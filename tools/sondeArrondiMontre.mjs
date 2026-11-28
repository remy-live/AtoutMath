// L'ARRONDI, MONTRÉ — l'indice dessiné, et la correction dessinée.
//
//   node tools/sondeArrondiMontre.mjs
//
// Rémy, 28 novembre : « j'ai des élèves qui galèrent un peu, il faut leur
// montrer visuellement ». La sonde fait le chemin de l'élève sur « Par Défaut,
// par Excès, Arrondi », au dixième : elle demande un indice (la carte doit
// porter un dessin, et le dessin rester sous l'énoncé une fois la carte
// fermée), puis se trompe jusqu'au bout de ses essais (la correction doit
// porter le dessin complet, flèche comprise, et nommer le chiffre des
// centièmes).

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const echecs = [];
const exiger = (vrai, quoi, detail = '') => {
    if (!vrai) echecs.push(quoi);
    console.log(`  ${vrai ? '✓' : '✗'} ${quoi}${detail ? ` — ${detail}` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
try {
    await s.identifier();
    const r = await s.ouvrirExercice('num-arrondi', { marches: ['dixieme'], sortes: ['arrondi'] }, { questions: 3 });
    exiger(!r, 'l\'exercice s\'ouvre', r || '');
    await s.doitExister('#game-layer [data-hint]', 'le bouton « Un indice »');
    await s.page.click('#game-layer [data-hint]');
    await dormir(700);
    const carte = await s.page.evaluate(() => {
        const c = document.querySelector('.fb-card--hint');
        return c ? { svg: !!c.querySelector('svg.arr-svg'), texte: c.textContent.replace(/\s+/g, ' ').slice(0, 160) } : null;
    });
    exiger(!!carte && carte.svg, 'la carte d\'indice porte un dessin', carte ? carte.texte : 'pas de carte');
    exiger(!!carte && /chiffre des centièmes/.test(carte.texte), 'l\'indice nomme le chiffre des centièmes');
    await s.photo('.fb-card--hint', 'tools/tmp/arr-indice.png');
    await s.page.click('.fb-card--hint .fb-close');
    await dormir(500);
    const reste = await s.page.evaluate(() => !!document.querySelector('#game-layer .canvas-area svg.arr-svg'));
    exiger(reste, 'le dessin reste sous l\'énoncé une fois la carte fermée');

    // SE TROMPER JUSQU'AU BOUT DES ESSAIS, au clavier : « 1 » n'est jamais un
    // arrondi au dixième d'un nombre tiré entre 1 et 99 avec des décimales.
    let correction = null;
    for (let essai = 0; essai < 5 && !correction; essai++) {
        await s.page.keyboard.type('1');
        await s.page.keyboard.press('Enter');
        await dormir(800);
        correction = await s.page.evaluate(() => {
            const c = document.querySelector('.fb-card--ko');
            if (!c) return null;
            const r = { svg: !!c.querySelector('svg.arr-svg'), fleche: !!c.querySelector('.arr-fleche'),
                texte: c.textContent.replace(/\s+/g, ' ').slice(0, 220) };
            return r.svg ? r : (c.querySelector('.fb-close').click(), null);
        });
        if (!correction) await dormir(400);
    }
    exiger(!!correction, 'la correction, essais épuisés, porte le dessin', correction ? correction.texte : 'aucune');
    exiger(!!correction && correction.fleche, 'et la flèche vers la réponse');
    exiger(!!correction && /on regarde le chiffre des centièmes/.test(correction.texte),
        'la correction dit « on regarde le chiffre des centièmes »');
    if (correction) await s.photo('.fb-card--ko', 'tools/tmp/arr-correction.png');
    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ') || 0}`);
    exiger(!s.fenetresNatives.length, 'aucune fenêtre native');
} finally { await s.fermer(); }
if (echecs.length) { console.log(`\nÉCHEC : ${echecs.length}`); process.exit(1); }
console.log('\nL\'ARRONDI SE MONTRE, À L\'INDICE COMME À LA CORRECTION.');
