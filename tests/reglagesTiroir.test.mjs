// LES PANNEAUX QUI MONTENT DU BAS SE REFERMENT EN LES POUSSANT.
//
// Rémy, capture des réglages d'un exercice sur son téléphone : « Les tiroirs ne
// se glissent pas en bas, il faut appuyer sur Annuler. »
//
// Ils avaient déjà l'air de tiroirs : ils montent du bas, leurs coins du haut
// sont arrondis, et une petite barre grise en marque la poignée. Cette barre
// était un DÉCOR — un pseudo-élément, qu'aucun doigt ne pouvait attraper. Une
// affordance qui ment coûte plus cher que pas d'affordance du tout : on essaie,
// rien ne bouge, et l'on finit par chercher le bouton en bas de l'écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const lire = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('LA POIGNÉE EST UN VRAI ÉLÉMENT, ET ELLE SE TIRE', () => {
    const src = lire('../js/ui/tiroir.js');
    // Elle existe pour de bon dans le document.
    assert.match(src, /createElement\('div'\)/);
    assert.match(src, /className = 'tiroir-poignee'/);
    // Le doigt la suit, et le panneau la suit.
    assert.match(src, /pointerdown/);
    assert.match(src, /pointermove/);
    assert.match(src, /translateY\(\$\{dy\}px\)/);
    // Un petit tirage revient en place ; un grand ferme. Sans seuil, un doigt
    // qui tremble fermerait le panneau qu'on venait juste d'ouvrir.
    assert.match(src, /const SEUIL = \d+/);
    assert.match(src, /dy > SEUIL \|\| vitesse > VITESSE/);
    // On ferme AVANT de ranger : le panneau des propriétés se ferme en perdant
    // une classe qui le renvoie là où le doigt vient de le poser.
    assert.ok(src.indexOf('fermer();') < src.indexOf('requestAnimationFrame(remettre)'));
});

test('LES TROIS TIROIRS DE L\'APPLICATION SONT BRANCHÉS', () => {
    // Les réglages d'avant-partie : poignée ET voile.
    const cfg = lire('../js/games/configUI.js');
    assert.match(cfg, /rendreTirable\(modal\.querySelector\('\.modal-panel-sm-left'\), fermerReglages/);
    assert.match(cfg, /fond: modal/, 'le voile ne ferme pas les réglages');
    // Les propriétés d'étape et le panneau des classes : pas de voile, ils
    // occupent tout l'écran.
    assert.match(lire('../js/ui/builder.js'), /rendreTirable\(panel, fermerProps/);
    assert.match(lire('../js/ui/parcoursClasses.js'), /rendreTirable\(panel, fermerPanneau/);
});

test('LA POIGNÉE NE RECOUVRE PAS LA CROIX, et n\'existe pas sur grand écran', () => {
    const mod = lire('../css/modules.css');
    const lay = lire('../css/layout.css');
    // Hors téléphone : la fenêtre est centrée, la poignée n'a rien à dire.
    assert.match(mod, /\.tiroir-poignee \{ display: none; \}/);
    // Sur téléphone : une vraie zone sensible, et « touch-action: none », qui
    // est ce qui permet de TIRER au lieu de faire défiler la page dessous.
    assert.match(mod, /#student-config-modal \.tiroir-poignee \{[\s\S]{0,220}touch-action: none/);
    assert.match(lay, /#builder-properties-panel \.tiroir-poignee \{[\s\S]{0,240}touch-action: none/);
    // Le panneau des propriétés réserve 60 px en haut pour sa croix : la
    // poignée reste DANS le flux (donc dessous) et se contente d'être collante.
    const bloc = lay.slice(lay.indexOf('#builder-properties-panel .tiroir-poignee {'),
        lay.indexOf('#builder-properties-panel .tiroir-poignee::before'));
    assert.match(bloc, /position: sticky; top: 0/);
    assert.ok(!/margin: -\d+px/.test(bloc), 'la poignée remonte dans la bande de la croix');
});
