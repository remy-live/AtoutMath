// UN ÉNONCÉ NE SE PEINT PAS SOUS LE CLAVIER.
//
// Rémy, capture d'un vrai iPhone en thème sombre, « Racines carrées pas à pas » :
// le dessin du carré d'aire 225 et sa question « combien de cases sur un côté ? »
// sont entièrement RECOUVERTS par les touches du pavé.
//
// LE MÉCANISME, ET IL TIENT EN UNE PROPRIÉTÉ. Sur téléphone, la mise en page
// est une grille de deux rangées : l'énoncé, puis le pavé. L'énoncé portait
// `overflow-y: auto`, donc on le croyait contenu — mais il portait AUSSI
// `align-self: start`, qui lui dit de prendre la hauteur de son CONTENU plutôt
// que celle de sa rangée. Il n'était donc jamais contraint : rien à défiler, et
// les 328 px de l'énoncé débordaient d'une rangée qui en avait 80.
// `overflow: hidden` sur la grille découpe au bord de la GRILLE, pas au bord de
// la rangée : le débordement se déversait sur la rangée suivante, le clavier.
//
// MESURÉ AVANT — chargement neuf à chaque hauteur, 390 px de large, sombre,
// hauteur de pavé recouvrant le dessin :
//
//     390 × 844 : 31 px · 700 : 181 px · 664 : 188 px · 600 : 187 px
//
// Le dessin fait 188 px : à 664, il était recouvert EN ENTIER. C'est la capture.
//
// APRÈS : zéro sur les quatre hauteurs, et sur les six conditions du balayage.
//
// ET LA VARIANTE À CHAÎNE EST COUVERTE, ce que je n'avais PAS mesuré en
// corrigeant. Rémy a envoyé « Factoriser pas à pas », où l'énoncé porte une
// chaîne d'égalités (`ls-layout--chaine`) au lieu d'un dessin : l'expression
// x² − 49 coupée par le champ, et la ligne « On écrit les deux carrés » sous
// les touches. Remesuré sur le fichier d'AVANT, sorti de git :
//
//     390 × 844 : 0 · 700 : 52 px · 664 : 87 px · 600 : 132 px
//
// À 600, le recouvrement se répartit sur trois morceaux — la consigne pour 4,
// l'expression pour 30, la chaîne pour 98 — ce qui est exactement sa capture,
// x² − 49 coupé en deux. Avec le plafond : zéro aux quatre hauteurs.
//
// LA LEÇON EST SUR MOI : la même règle sert aux deux variantes, mais je ne
// l'avais vérifiée que sur celle qui portait un dessin. Un correctif qui tient
// sur le cas qu'on a sous les yeux n'est pas un correctif vérifié.
//
// LA DEUXIÈME MOITIÉ EST UNE QUESTION DE PLACE, PAS DE RECOUVREMENT. Le plafond
// ne donne pas de place, il empêche d'en voler : l'énoncé passe d'un
// débordement à un défilement. Le pavé pesait 439 px sur un hôte de 538 — on
// lui en a repris 43 (gouttières et place réservée au diagnostic, jamais les
// touches, qui sont à leur plancher tactile de 44 px). L'énoncé passe de 80 à
// 124 px.
//
// CE QUI RESTE, ET QUI EST ÉCRIT PLUTÔT QUE MASQUÉ : à 390 × 664, l'énoncé
// mesure 328 px de contenu pour 124 px de fenêtre. La consigne en fait 64, le
// radical 31, le dessin 188. Aucune cure de police ne fait entrer 328 dans 124 :
// il faudrait retirer une rangée au clavier, et le dessin de ce clavier est une
// décision de Rémy, pas une correction de mise en page. Le dessin se voit donc
// en défilant — et un chevron le dit, sans quoi personne ne saurait qu'il existe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const JS = readFileSync(new URL('../js/core/activities/litteralSaisie.js', import.meta.url), 'utf8');

/** Le bloc de l'énoncé dans la mise en page étroite. */
const ETROIT = /@container \(max-width: 699px\) \{([\s\S]*?)\n\}/.exec(CSS)?.[1] || '';
const CONTEXTE = /\.ls-layout \.ls-contexte \{([^}]*)\}/.exec(ETROIT)?.[1] || '';

test('L\'ÉNONCÉ NE PEUT PAS DÉBORDER SUR LE CLAVIER', () => {
    assert.ok(CONTEXTE, 'la règle .ls-layout .ls-contexte doit exister en mise en page étroite');

    // LES DEUX ENSEMBLE, ET C'EST TOUT LE SUJET : `overflow-y` seul ne contraint
    // rien tant que la boîte prend la hauteur de son contenu.
    assert.match(CONTEXTE, /overflow-y:\s*auto/, 'l\'énoncé doit pouvoir défiler');
    assert.match(CONTEXTE, /max-height:\s*100%/,
        'sans plafond, `overflow-y: auto` ne contraint RIEN : la boîte prend la '
        + 'hauteur de son contenu, il n\'y a rien à défiler, et le surplus se '
        + 'peint sur le clavier — mesuré, 188 px de dessin recouverts');

    // Si quelqu'un retire `align-self: start`, le plafond suffit encore ; mais
    // s'il retire le plafond en gardant `align-self`, le défaut revient tel
    // quel. C'est donc le plafond qu'on garde, nommément.
    if (/align-self:\s*start/.test(CONTEXTE)) {
        assert.match(CONTEXTE, /max-height:\s*100%/,
            'align-self: start SANS plafond est exactement le défaut d\'origine');
    }
});

test('LE PAVÉ REND CE QU\'IL PEUT, MAIS PAS SES TOUCHES', () => {
    // Les gouttières et la place réservée au diagnostic cèdent ; les touches,
    // non. Une touche qu'on rate est pire qu'un énoncé qu'on défile.
    assert.match(ETROIT, /\.ls-layout \.ls-panel \{[^}]*gap:\s*8px/,
        'les gouttières du pavé se serrent sur un téléphone');
    assert.match(ETROIT, /\.ls-layout \.ls-note \{[^}]*min-height:\s*1\.6em/,
        'la place réservée au diagnostic passe de quatre lignes à deux');
    assert.match(ETROIT, /\.ls-layout \.ls-clavier \.ls-t \{\s*min-height:\s*44px/,
        'les touches restent à leur plancher tactile de 44 px');
});

test('ET L\'ON DIT QUE L\'ÉNONCÉ CONTINUE PLUS BAS', () => {
    // « Atteignable n'est pas visible » — la phrase est de
    // tools/quiDefileSansLeDire.mjs, et elle vaut ici pour du contenu.
    assert.match(JS, /function annoncerLeReste\(/,
        'l\'activité doit annoncer ce qui reste sous la ligne de flottaison');
    assert.match(JS, /annoncerLeReste\(container\.querySelector\('\.ls-contexte'\)\)/,
        'et l\'appeler à chaque rendu, pas seulement au premier');
    // LE CHEVRON NE DOIT PAS MENTIR : il s'efface quand on est arrivé en bas.
    assert.match(JS, /scrollHeight - zone\.clientHeight - zone\.scrollTop/,
        'ce qui RESTE se calcule, sinon le chevron reste allumé au fond de la page');
    assert.match(CSS, /\.ls-contexte--encore::after \{/,
        'et il doit être dessiné');
});
