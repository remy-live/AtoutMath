// LA ROUE D'AFFICHAGE — les règles, mesurées sur les VRAIES teintes des thèmes.
//
// Rémy, 27 novembre : « une option contraste fort pour les élèves et pour moi
// aussi, sur certains ordis c'est pâle ». Le chemin de l'écran (roue, curseur,
// pastilles, rechargement, figures, téléphone) est gardé par
// `node tools/sondeAffichage.mjs` ; ce fichier garde les nombres.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import {
    THEMES, TEINTES, CLES, teintesRenforcees, rapportDeContraste, melanger,
    bornerContraste, motDuContraste, gammaDesFigures, lireReglages, lireCouleur
} from '../js/core/affichage.js';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CSS = lire('css/base.css');

/** Les jetons d'un thème, lus dans `css/base.css` (le clair sert de repli). */
function jetonsDu(theme) {
    const bloc = (debut) => { const i = CSS.indexOf(debut); return CSS.slice(i, CSS.indexOf('\n}', i)); };
    const clair = bloc(':root {');
    const propre = theme === 'light' ? clair : bloc(`:root[data-theme="${theme}"] {`);
    const val = (b, k) => { const m = b.match(new RegExp(`${k}:\\s*(#[0-9a-fA-F]{3,6})`)); return m && m[1]; };
    const tout = {};
    for (const k of [...Object.keys(TEINTES.clair), '--bg-panel', '--bg-hover']) tout[k] = val(propre, k) || val(clair, k);
    return tout;
}

test('À FOND, LES BORDURES SE VOIENT DANS LES CINQ THÈMES', () => {
    for (const t of THEMES) {
        const j = jetonsDu(t.id);
        assert.ok(rapportDeContraste(j['--border'], j['--bg-panel']) < 1.6,
            `${t.nom} : la bordure d'origine n'est plus la pâle — revoir ce que le curseur corrige`);
        const f = teintesRenforcees(j, 100, t.sombre);
        const bord = rapportDeContraste(f['--border'], j['--bg-panel']);
        const gris = rapportDeContraste(f['--text-muted'], j['--bg-hover']);
        assert.ok(bord >= 7, `${t.nom} : bordure à ${bord.toFixed(2)} sur un panneau, à fond`);
        assert.ok(gris >= 7, `${t.nom} : texte gris à ${gris.toFixed(2)} sur le gris de survol, à fond`);
    }
});

test('LE CURSEUR À « NORMAL » NE TOUCHE À RIEN, ET MONTE SANS À-COUP', () => {
    const j = jetonsDu('light');
    assert.deepEqual(teintesRenforcees(j, 0), {}, 'à zéro, la page doit rester celle d\'origine');
    let avant = 0;
    for (let c = 5; c <= 100; c += 5) {
        const r = rapportDeContraste(teintesRenforcees(j, c)['--border'], j['--bg-panel']);
        assert.ok(r > avant, `le contraste recule au cran ${c}`);
        avant = r;
    }
});

test('LE THÈME SOMBRE FONCE VERS LE BLANC', () => {
    const j = jetonsDu('dark');
    const f = teintesRenforcees(j, 100, true);
    const clarte = (c) => lireCouleur(c).reduce((a, b) => a + b, 0);
    assert.ok(clarte(f['--border']) > clarte(j['--border']), 'en sombre, la bordure s\'est assombrie');
});

test('LES PETITES RÈGLES : crans, mots, mélange, lecture', () => {
    assert.equal(bornerContraste(-4), 0);
    assert.equal(bornerContraste(132), 100);
    assert.equal(bornerContraste('47'), 45);
    assert.equal(motDuContraste(0), 'Normal');
    assert.equal(motDuContraste(100), 'Fort');
    assert.equal(melanger('#000000', '#ffffff', 0.5), '#808080');
    assert.equal(melanger('#fff', 'rgb(0, 0, 0)', 1), '#000000');
    assert.equal(gammaDesFigures(100, false), 1, 'les figures ne foncent que si on le demande');
    assert.equal(gammaDesFigures(0, true), 1);
    assert.ok(gammaDesFigures(100, true) > 2);
    // Une courbe gamma garde le blanc et fonce le gris pâle d'un quadrillage.
    const g = gammaDesFigures(100, true);
    assert.equal(Math.round(255 * (1) ** g), 255);
    assert.ok(Math.round(255 * (0xe2 / 255) ** g) <= 180, 'le gris du quadrillage (226) doit descendre vers 177');
});

test('UN STOCKAGE QUI SE REFUSE REND LES RÉGLAGES D\'ORIGINE', () => {
    const refus = { getItem() { throw new Error('privé'); } };
    assert.deepEqual(lireReglages(refus), { theme: 'light', aere: false, contraste: 0, figures: false });
    const range = { getItem: (k) => ({ [CLES.theme]: 'ocean', [CLES.contraste]: '60', [CLES.figures]: '1' })[k] ?? null };
    assert.deepEqual(lireReglages(range), { theme: 'ocean', aere: false, contraste: 60, figures: true });
});

test('LA ROUE EST DANS LA BARRE ET DANS L\'EXERCICE, ET LA PAGE NAÎT FONCÉE', () => {
    const HTML = lire('index.html');
    assert.match(HTML, /id="btn-affichage"[^>]*data-affichage/, 'la roue de la barre du haut a disparu');
    assert.match(HTML, /id="btn-game-affichage"[^>]*\n?[^>]*data-affichage/,
        'la roue de l\'en-tête du jeu a disparu : pendant un exercice, plus rien ne l\'ouvre');
    assert.doesNotMatch(HTML, /id="btn-toggle-theme"|id="btn-toggle-aere"/,
        'l\'ancien bouton de thème est revenu : deux endroits pour la même chose');
    assert.ok(HTML.includes(`localStorage.getItem('${CLES.encre}')`),
        'l\'amorce ne pose plus le contraste : la page s\'affiche pâle puis fonce');
    const APP = sansCommentaires(lire('js/app.js'));
    assert.match(APP, /initAffichage\(\)/, 'app.js ne branche plus la roue');
});
