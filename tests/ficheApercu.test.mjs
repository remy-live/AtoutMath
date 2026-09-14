// L'APERÇU PAPIER : UNE SEULE FENÊTRE, ET LES RÉGLAGES DEVANT.
//
// Deux signalements de Rémy, une même famille de défauts — des fenêtres qui se
// recouvrent sans qu'on sache laquelle on touche.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const lire = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// « Quand on change d'exercice et que l'aperçu est activé, il ne faut pas
//   qu'il y ait deux fenêtres d'aperçu les unes sur les autres. »
//
// Il y a deux fenêtres parce qu'il y a deux natures de fiche : une GRILLE se
// dessine, une QUESTION s'écrit sur une ligne. Aucune ne fermait l'autre.
// Mesuré en passant d'un exercice à grille à un exercice écrit :
//
//     1. fiche GRILLE ouverte  : [print-sheet-modal]
//     2. puis une fiche ÉCRITE : [print-sheet-modal, print-questions-modal]
//     3. retour à la GRILLE    : [print-sheet-modal, print-questions-modal]
//
// À la même hauteur de pile toutes les deux : c'est l'ordre du document qui
// décidait laquelle se voyait, et l'on pouvait régler celle du dessous en
// croyant régler celle du dessus.
test('UNE SEULE FENÊTRE D\'APERÇU PAPIER À L\'ÉCRAN', () => {
    const rendu = lire('../js/ui/ficheRendu.js');
    assert.match(rendu, /export function fermerAutreFiche\(sauf\)/,
        'rien ne referme la fenêtre d\'à côté');
    assert.match(rendu, /'print-sheet-modal', 'print-questions-modal'/);

    // Les deux fenêtres appellent la fermeture AVANT de s'afficher.
    for (const [f, id] of [['../js/ui/printSheet.js', 'print-sheet-modal'],
        ['../js/ui/printQuestions.js', 'print-questions-modal']]) {
        const src = lire(f);
        assert.match(src, /fermerAutreFiche/, `${f} n'importe pas la fermeture`);
        const i = src.indexOf(`fermerAutreFiche('${id}')`);
        const j = src.indexOf("modal.style.display = 'flex'");
        assert.ok(i > 0 && i < j, `${f} : on affiche avant de refermer l'autre`);
    }
});

// « Les paramètres, quand j'utilise la barre de debug et que je fais l'aperçu,
//   sur l'exercice ne fonctionne pas. »
//
// Ils fonctionnaient : on ne pouvait pas les voir. Mesuré, aperçu papier
// allumé puis « Régler » : panneau à 100000, fiche à 999999 — le panneau
// s'ouvrait DERRIÈRE la fiche, invisible et intouchable.
test('LE PANNEAU DE RÉGLAGES PASSE DEVANT LA FICHE, ET SEULEMENT ALORS', () => {
    const css = lire('../css/components.css');
    const cfg = lire('../js/games/configUI.js');

    // Un cran au-dessus de la fiche (999999), un cran sous la barre de passe
    // (1000002), qui doit rester atteignable pour changer d'exercice.
    assert.match(css, /\.modal-overlay--sur-fiche \{ z-index: 1000001; \}/);
    assert.match(css, /\.modal-overlay--top \{ z-index: 999999; \}/);

    // La classe se pose À L'OUVERTURE, et seulement si une fiche est là :
    // sinon le bouton « Fiche d'exercices à imprimer… » du panneau ouvrirait
    // une fiche qui passerait dessous.
    assert.match(cfg, /classList\.toggle\('modal-overlay--sur-fiche'/);
    const bloc = cfg.slice(cfg.indexOf("classList.toggle('modal-overlay--sur-fiche'"),
        cfg.indexOf("classList.toggle('modal-overlay--sur-fiche'") + 400);
    assert.match(bloc, /print-sheet-modal', 'print-questions-modal/);
    assert.match(bloc, /display !== 'none'/, 'la classe ne dépend pas de ce qui est affiché');
});
