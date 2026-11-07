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

// --- L'EXPOSANT NE FAIT PAS DESCENDRE SA LIGNE ------------------------------

test('UN EXPOSANT NE DÉCALE PAS L\'ÉNONCÉ SOUS SON NUMÉRO', () => {
    // RÉMY, capture d'un aperçu de fiche : « pour l'impression des calculs en
    // puissance, le nombre en puissance est décalé par rapport aux numéros ».
    // Le « 163. » était sur sa ligne, le « 2³ = » un peu plus bas.
    //
    // MESURÉ dans le navigateur, la fiche des puissances contre une fiche
    // d'additions :
    //
    //   · avec exposants : la ligne fait 17,5 px de haut au lieu de 14, les
    //     deux boîtes partent du même `top`, et la BASE de l'énoncé tombe
    //     3,5 px plus bas que celle du numéro — sur les huit questions
    //     mesurées, sans exception ;
    //   · sans exposants : 0 px d'écart.
    //
    // La cause est que chaque ligne est posée en ABSOLU à un `top` fixe : un
    // `<sup>` sans style agrandit la boîte de ligne vers le haut, et ces
    // pixels-là s'ajoutent au-dessus de la base. `line-height: 0` rend
    // l'exposant transparent à ce calcul ; son décalage vers le haut reste
    // celui du navigateur, qui est déjà ce que le PDF dessine de son côté.
    //
    // Mesuré après correction : 0 px, et l'exposant reste lisible.
    const css = lire('../css/ui.css');
    assert.match(css, /\.fx-haut \{ line-height: 0; \}/,
        'l\'exposant agrandit de nouveau la ligne, et la base redescend');
    // La classe existe bien, et c'est elle que l'aperçu pose sur ses exposants.
    assert.match(lire('../js/ui/ficheRendu.js'), /<sup class="fx-haut">/);
});

// ── « dans l'atelier … à chaque fois c'est replié » ────────────────────────
//
// Le repli de l'aperçu sur écran étroit est une bonne règle, et elle se
// déclenchait au mauvais endroit : le volet « La feuille » de l'Atelier est un
// CADRE, où `window.innerWidth` vaut la largeur du cadre. MESURÉ dans un vrai
// navigateur : sur un portable de 1280 px, les trois volets côte à côte
// donnent 463 px au cadre de la feuille — le tiroir se fermait, et l'aperçu
// tombait à ZÉRO pixel de haut. Sur 1500 px le cadre en fait 573 et rien ne se
// passait : d'où « à chaque fois » chez Rémy et « jamais » chez moi.
//
// ON PILOTE LA VRAIE FONCTION, et non le texte du fichier : c'est une décision
// de trois conditions, et une épreuve qui cherche `volet-atelier` dans la
// source resterait verte sur n'importe quel branchement de ces trois-là.
{
    const { replierApercuSiEtroit } = await import('../js/ui/modal.js');

    /** Joue le repli dans un décor donné, et dit si le tiroir est resté ouvert. */
    const ouvertApres = ({ largeur, classes = [], appareil = null }) => {
        const tiroir = { open: true };
        const racine = { querySelector: (s) => (s === '.fp-apercu-repli' ? tiroir : null) };
        const avantW = globalThis.window, avantD = globalThis.document;
        globalThis.window = {
            innerWidth: largeur,
            location: { search: appareil ? `?atelier=fiche&appareil=${appareil}` : '?atelier=fiche' }
        };
        globalThis.document = { documentElement: { classList: {
            contains: (c) => classes.includes(c) } } };
        try { replierApercuSiEtroit(racine); } finally {
            globalThis.window = avantW; globalThis.document = avantD;
        }
        return tiroir.open;
    };

    test('SUR TÉLÉPHONE, L\'APERÇU DE LA FEUILLE SE REPLIE', () => {
        assert.equal(ouvertApres({ largeur: 390 }), false,
            'à 390 px, l\'aperçu n\'est qu\'une tache grise et doit se replier');
        assert.equal(ouvertApres({ largeur: 900 }), true,
            'à 900 px, il n\'y a aucune raison de replier');
    });

    test('MAIS DANS UN VOLET D\'ATELIER, L\'APERÇU RESTE OUVERT', () => {
        // Rémy : « dans l'atelier, il faut que l'on voit l'apercu pour
        // l'impression à chaque fois c'est replié ». Le volet EST l'aperçu :
        // c'est la seule raison de l'avoir ouvert, et les réglages sont déjà
        // rangés dans leur propre tiroir.
        assert.equal(ouvertApres({ largeur: 463, classes: ['volet-atelier', 'volet-atelier--fiche'] }),
            true, 'le volet d\'atelier replie encore son aperçu');
    });

    test('ET LE VOLET DEMANDÉ EN FORMAT TÉLÉPHONE GARDE SON REPLI', () => {
        // Qui choisit « téléphone » veut voir ce qu'un téléphone montre.
        assert.equal(ouvertApres({ largeur: 390, appareil: 'telephone',
            classes: ['volet-atelier', 'volet-atelier--fiche'] }), false,
        'l\'aperçu en format téléphone ne montre plus le repli qu\'un élève verrait');
    });
}
