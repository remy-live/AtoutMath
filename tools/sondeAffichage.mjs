// LA ROUE D'AFFICHAGE, AU CLIC — contraste, couleurs, figures, rechargement.
//
//   node tools/sondeAffichage.mjs
//
// Rémy, 27 novembre : « une option contraste fort pour les élèves et pour moi
// aussi, sur certains ordis c'est pâle […] une petite roue d'option qui
// permette les couleurs et le contraste (avec slide) », et « pour les figures
// en option ».
//
// La sonde fait le chemin de la main : elle ouvre la roue, tire le curseur au
// CLAVIER (Fin, puis Origine — les touches qu'un élève a sous le doigt), touche
// une pastille, recharge, ouvre un exercice dessiné. Elle exige :
//   · que la bordure passe de 1,23 à plus de 7 sur un panneau, à fond ;
//   · que la page RECHARGÉE naisse foncée (l'amorce de `index.html`) ;
//   · que le thème sombre recalcule vers le blanc, pas vers le noir ;
//   · que « foncer les figures » pose le filtre sur la figure, et seulement
//     quand on le demande ;
//   · que « Remettre comme avant » rende la page d'origine ;
//   · qu'au téléphone le panneau tienne dans l'écran.

import { ouvrirSonde } from './sonde.mjs';
import { rapportDeContraste } from '../js/core/affichage.js';
import { setTimeout as dormir } from 'node:timers/promises';

const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); console.log(`  ${vrai ? '✓' : '✗'} ${quoi}`); };
const jetons = (page) => page.evaluate(() => {
    const c = getComputedStyle(document.documentElement);
    const v = (k) => c.getPropertyValue(k).trim();
    const vers = (x) => { const d = document.createElement('div'); d.style.color = x; document.body.appendChild(d);
        const r = getComputedStyle(d).color; d.remove(); return r; };
    return { border: vers(v('--border')), panel: vers(v('--bg-panel')), muted: vers(v('--text-muted')),
        theme: document.documentElement.getAttribute('data-theme'),
        figures: document.documentElement.getAttribute('data-figures-fortes') };
});
const hex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
const rapport = (j) => rapportDeContraste(hex(j.border), hex(j.panel));

const s = await ouvrirSonde({ largeur: 1280, hauteur: 860 });
try {
    await s.identifier();
    await s.doitExister('#btn-affichage');
    const avant = await jetons(s.page);
    console.log(`Bordure sur panneau, d'origine : ${rapport(avant).toFixed(2)}`);

    await s.page.click('#btn-affichage');
    await dormir(300);
    await s.doitExister('#affichage-panneau:not([hidden]) #aff-contraste');
    await s.page.focus('#aff-contraste');
    await s.page.keyboard.press('End');
    await dormir(300);
    const fort = await jetons(s.page);
    const mot = await s.page.textContent('[data-aff-mot]');
    console.log(`À fond : ${rapport(fort).toFixed(2)} (« ${mot.trim()} »)`);
    exiger(rapport(avant) < 1.5, 'la bordure d\'origine est bien la pâle (1,23)');
    exiger(rapport(fort) > 7, 'à fond, la bordure dépasse 7 sur un panneau');
    exiger(mot.trim() === 'Fort', 'le mot à côté du curseur dit « Fort »');
    await s.photo('#affichage-panneau', 'tools/tmp/aff-panneau.png');

    // LA PAGE RECHARGÉE NAÎT FONCÉE : on lit les teintes AVANT que app.js
    // n'ait pu les recalculer, au premier script de la page.
    await s.page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
            window.__bordAuChargement = getComputedStyle(document.documentElement)
                .getPropertyValue('--border').trim();
        }, { once: true });
    });
    await s.page.reload();
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    const auChargement = await s.page.evaluate(() => window.__bordAuChargement);
    console.log(`Au chargement, avant app.js : --border = ${auChargement}`);
    exiger(auChargement && auChargement.toLowerCase() !== '#e2e8f0', 'la page rechargée naît foncée, sans passer par le pâle');

    // LE THÈME SOMBRE fonce vers le BLANC.
    await s.page.click('#btn-affichage');
    await dormir(300);
    await s.page.click('[data-aff-theme="dark"]');
    await dormir(300);
    const sombre = await jetons(s.page);
    console.log(`Sombre, à fond : ${rapport(sombre).toFixed(2)}`);
    exiger(sombre.theme === 'dark', 'la pastille « Sombre » a changé le thème');
    exiger(rapport(sombre) > 7, 'en sombre aussi la bordure dépasse 7 — vers le blanc');
    await s.page.click('[data-aff-theme="light"]');
    await dormir(300);

    // LES FIGURES : rien tant qu'on ne coche pas, le filtre quand on coche.
    await s.page.keyboard.press('Escape');
    await s.ouvrirExercice('geo-angles-nommer');
    const filtre = () => s.page.evaluate(() => {
        const f = document.querySelector('#game-layer svg');
        return f ? getComputedStyle(f).filter : '(pas de figure)';
    });
    const sans = await filtre();
    exiger(sans === 'none', `sans la case, la figure n'a pas de filtre (${sans})`);
    // PENDANT L'EXERCICE, la barre du haut est recouverte : c'est la roue de
    // l'en-tête du jeu qu'on touche.
    await s.doitExister('#btn-game-affichage');
    await s.page.click('#btn-game-affichage');
    await dormir(300);
    await s.page.click('#aff-figures');
    await dormir(300);
    const avec = await filtre();
    exiger(/aff-figures-fortes/.test(avec), `la case cochée pose le filtre sur la figure (${avec})`);
    await s.page.keyboard.press('Escape');
    await dormir(200);
    await s.photo('#game-layer', 'tools/tmp/aff-figure.png');

    // REMETTRE COMME AVANT.
    await s.page.click('#btn-game-affichage');
    await dormir(300);
    await s.page.click('[data-aff-remettre]');
    await dormir(300);
    const remis = await jetons(s.page);
    exiger(Math.abs(rapport(remis) - rapport(avant)) < 0.01 && !remis.figures,
        `« Remettre comme avant » rend la page d'origine (${rapport(remis).toFixed(2)})`);

    // AU TÉLÉPHONE, le panneau tient dans l'écran.
    await s.page.setViewportSize({ width: 360, height: 740 });
    await s.page.keyboard.press('Escape');
    await dormir(200);
    await s.page.evaluate(() => { if (window.__sondeRunner) try { window.__sondeRunner.exit(); } catch (e) {} });
    await dormir(400);
    await s.page.click('#btn-affichage');
    await dormir(300);
    const boite = await s.page.evaluate(() => {
        const r = document.getElementById('affichage-panneau').getBoundingClientRect();
        return { g: Math.round(r.left), d: Math.round(r.right), l: innerWidth };
    });
    exiger(boite.g >= 4 && boite.d <= boite.l - 4, `au téléphone, le panneau tient (${boite.g} → ${boite.d} sur ${boite.l})`);
    await s.photo('#affichage-panneau', 'tools/tmp/aff-telephone.png');

    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ') || 0}`);
    exiger(!s.fenetresNatives.length, 'aucune fenêtre native');
} finally { await s.fermer(); }

if (echecs.length) { console.log(`\nÉCHEC : ${echecs.length}`); process.exit(1); }
console.log('\nLA ROUE D\'AFFICHAGE FAIT CE QU\'ELLE DIT.');
