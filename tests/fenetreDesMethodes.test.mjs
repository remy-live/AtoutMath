// LA FENÊTRE DES DEUX MÉTHODES DE SOUSTRACTION — ce qu'elle doit garder.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en deux messages d'affilée :
//
//   « quand je clique sur méthode, ca ne fait rien »
//   « pour les méthodes, présente le en colonne, pas en ligne, c'est
//     incompréhensible »
//
// Deux défauts qu'aucun sélecteur n'attrape, et qui se ressemblent : dans les
// deux cas la fenêtre était LÀ, complète, avec ses deux cartes — et
// inutilisable.
//
//   1. Elle s'ouvrait à l'étage 9999, c'est-à-dire SOUS `#game-layer` (10000).
//      Ma première sonde l'avait déclarée présente : elle lisait le DOM. C'est
//      la TROISIÈME fois que ce dépôt paie cette leçon — le voile du défi à
//      9000, le contre-exemple de l'organigramme à 9999, et celle-ci.
//   2. L'exemple y était écrit en prose — « 13 − 7 = 6, puis le 1 de 17 devient
//      2 » —, la seule forme sous laquelle on n'écrit jamais une soustraction
//      posée.
//
// ── POURQUOI UNE ÉPREUVE DE SOURCE ────────────────────────────────────────
//
// La fenêtre ne s'ouvre que sur un clic, dans un jeu monté dans un navigateur :
// aucune des épreuves de Node ne peut la faire apparaître. Ce qui se vérifie
// ici est donc ce qui se lit : l'étage demandé, et le fait que l'exemple sorte
// du noyau au lieu d'être raconté. La photo, elle, se refait à la sonde
// (`tools/tmp/methodeEnColonne.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';

const SOURCE = 'js/games/poserOperation.js';
const source = lireFeuille(SOURCE);

/** Le corps d'une méthode de la classe, de sa signature à son accolade seule. */
function corpsDe(nom) {
    const debut = source.indexOf(`\n    ${nom}(`);
    assert.notEqual(debut, -1, `la méthode ${nom} a disparu de ${SOURCE}`);
    const fin = source.indexOf('\n    }\n', debut);
    assert.notEqual(fin, -1, `la méthode ${nom} n'a plus de fin lisible`);
    return source.slice(debut, fin);
}

test('LA FENÊTRE DES MÉTHODES S\'OUVRE AU-DESSUS DU PLATEAU DE JEU', () => {
    // LE DÉFAUT EXACT DE RÉMY : « quand je clique sur méthode, ca ne fait
    // rien ». `showModal` se range par défaut à 9999 ; la couche de jeu est à
    // 10000. Une fenêtre ouverte DEPUIS le jeu doit donc dire son étage.
    const etage = Number((source.match(/const ETAGE_MODALE = (\d+);/) || [])[1]);
    assert.ok(etage > 0, 'ETAGE_MODALE a disparu : la fenêtre repasse à 9999');
    const plateau = Number(valeurDe(
        corpsDeLaRegle(lireFeuille('css/layout.css'), '#game-layer', { ou: 'css/layout.css' }),
        'z-index'));
    assert.ok(etage > plateau,
        `la fenêtre des méthodes (${etage}) s'ouvrirait sous le plateau de jeu `
        + `(${plateau}) : l'élève cliquerait sans rien voir.`);
    // ET ELLE LE PASSE VRAIMENT À `showModal` : la constante seule ne sert à
    // rien si l'appel ne la porte pas.
    assert.match(corpsDe('choisirMethode'), /showModal\([\s\S]{0,400}?zIndex:\s*ETAGE_MODALE/,
        'showModal est appelé sans son étage : la fenêtre retombe à 9999');
});

test('LES DEUX MÉTHODES SE MONTRENT POSÉES, PAS RACONTÉES', () => {
    // RÉMY : « présente le en colonne, pas en ligne, c'est incompréhensible ».
    const choix = corpsDe('choisirMethode');
    assert.match(choix, /this\.figureMethode\(/,
        'les cartes ne portent plus de figure : l\'exemple est redevenu une phrase');
    const fig = corpsDe('figureMethode');
    // LA FIGURE SORT DU NOYAU. Écrite à la main, elle dirait ce qu'on veut —
    // y compris le contraire de ce que la grille fera.
    assert.match(fig, /poser\('-'/, 'la figure n\'appelle plus le noyau');
    assert.match(fig, /attenduEn\(t, r, 'retenue'\)|attenduEn\(t, r, ou\)/,
        'la figure n\'interroge plus le noyau sur les marques');
    // ET ELLE EMPLOIE LES CLASSES DE LA VRAIE GRILLE : c'est ce qui garantit
    // que la fenêtre montre l'écran que l'élève va construire.
    for (const classe of ['po-grille', 'po-case', 'po-marque--', 'po-trait']) {
        assert.ok(fig.includes(classe),
            `la figure n'emploie plus « ${classe} » : elle a cessé d'être la grille`);
    }
    // TROIS LIGNES ET UN TRAIT : une opération posée, pas une ligne de texte.
    for (const ligne of ['haut', 'bas', 'res']) {
        assert.match(fig, new RegExp(`const ${ligne} = rangs\\.map`),
            `la ligne « ${ligne} » de la figure a disparu`);
    }
});

test('LA MARQUE DE RETENUE RESTE DANS SA PROPRE COLONNE', () => {
    // MESURÉ À LA PHOTO, sur 7106 − 4709 : à cheval sur la frontière
    // (`left: -9px`), la marque se lisait comme un indice du chiffre de
    // GAUCHE — « 7₁ 1₁ 0₁ 6 » là où il fallait lire 11, 10, 16. Son fond
    // opaque creusait même une encoche dans la case d'à côté.
    //
    // L'ÉCART ENTRE DEUX CASES EST DE 2 px (`gap: 2px`) : une marque qui
    // déborde de plus de trois pixels mord sur la case précédente, et c'est
    // exactement ce que l'œil lui reproche.
    for (const classe of ['.po-marque--devant', '.po-marque--bas']) {
        const corps = corpsDeLaRegle(source, classe, { ou: SOURCE });
        const gauche = parseFloat(valeurDe(corps, 'left'));
        assert.ok(!Number.isNaN(gauche), `${classe} ne dit plus où elle se pose`);
        assert.ok(gauche >= -3,
            `${classe} déborde de ${-gauche} px sur la case d'à côté : la retenue `
            + 'se lira comme un indice du chiffre de gauche.');
    }
});

test('L\'AIDE DIT LA MÉTHODE QUE L\'ÉLÈVE A CHOISIE', () => {
    // ELLE DISAIT LA COMPENSATION À TOUT LE MONDE : l'élève qui casse lisait
    // « on ajoute un au chiffre du BAS », c'est-à-dire l'autre méthode — sur
    // une grille qui ne lui offrait même pas l'endroit où l'écrire.
    const aide = corpsDe('aider');
    assert.match(aide, /this\.parEmprunt\(\)/,
        'l\'aide de la soustraction ne regarde plus la méthode choisie');
    assert.match(aide, /CASSE/, 'l\'aide du cassage a disparu');
    assert.match(aide, /chiffre du BAS/, 'l\'aide de la compensation a disparu');
});

test('LES DEUX NOMBRES N\'ONT PAS TOUJOURS LA MÊME LONGUEUR', () => {
    // RÉMY : « et si on fait 1000 - 3 par exemple ». MESURÉ sur 400 tirages
    // d'entiers à quatre chiffres, par le chemin du jeu : ZÉRO de longueurs
    // différentes — les deux nombres étaient tirés dans le même intervalle,
    // et 1000 − 3 ne pouvait pas sortir.
    //
    // OR C'EST L'EXERCICE LUI-MÊME : son en-tête annonce l'erreur qu'il
    // existe pour corriger — « il cale 12,4 sous 324,5 en collant à droite ».
    // Entre deux nombres de même forme, aligner REVIENT à coller à droite, et
    // le geste faux donne la bonne réponse. (206 sur 400 après correction.)
    const pose = corpsDe('poser');
    assert.match(pose, /const tirer = \(chiffres\)/,
        'le tirage ne prend plus de longueur : les deux nombres la partagent');
    assert.match(pose, /Math\.max\(1, this\.chiffres - /,
        'plus rien ne raccourcit le second nombre');
    // ET LE PREMIER GARDE LA SIENNE : sans cela, « 4 chiffres » ne voudrait
    // plus rien dire et l'on tirerait parfois deux nombres à un chiffre.
    assert.match(pose, /i === 0 \? this\.chiffres/,
        'le premier nombre n\'a plus la longueur réglée');
});
