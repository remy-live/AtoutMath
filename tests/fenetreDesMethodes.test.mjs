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

test('CHANGER DE MÉTHODE NE CHANGE PAS D\'OPÉRATION', () => {
    // RÉMY : « le changement de méthode fait recommencer l'exercice ». On
    // tirait une opération neuve — si bien qu'un élève qui ouvre la fenêtre
    // POUR COMPRENDRE perdait le calcul en cours, et ne voyait donc jamais sa
    // soustraction dans l'autre méthode, qui est tout l'intérêt du bouton.
    const choix = corpsDe('choisirMethode');
    assert.match(choix, /this\.changerMethode\(/,
        'la carte ne passe plus par changerMethode');
    assert.doesNotMatch(choix, /this\.poser\(\)/,
        'le choix d\'une méthode retire une opération neuve : le calcul en cours est perdu');
    const chg = corpsDe('changerMethode');
    // LE MÊME CALCUL, RECALCULÉ : mêmes opérandes, colonnes neuves.
    assert.match(chg, /this\.tableau = poser\(this\.operation, this\.operandes/,
        'la méthode change sans recalculer les colonnes : la grille mentirait');
    assert.doesNotMatch(chg, /this\.poser\(\)/, 'changerMethode retire une opération');
    // ET LES MARQUES PARTENT : un +1 en bas ne veut rien dire dans le cassage.
    assert.match(chg, /this\.retenues = \{\}/);
    assert.match(chg, /this\.marquesBas = \{\}/);
});

test('LA GRILLE N\'ANNONCE PAS LES COLONNES OÙ L\'ÉLÈVE N\'EST PAS', () => {
    // RÉMY, par cassage : « ca casse automatiquement le suivant au début ».
    // MESURÉ sur 224 − 157, avant le moindre clic : les deux colonnes qui
    // seront réécrites portaient déjà leur marque en pointillé, À LA PLACE DU
    // CHIFFRE BARRÉ. L'écran disait donc quelles colonnes empruntent — c'est
    // la question que la méthode pose à l'élève.
    const rond = corpsDe('rondRetenue');
    assert.match(rond, /rang > this\.rangCourant/,
        'la grille montre à nouveau les marques des colonnes à venir : elle '
        + 'annonce à l\'élève lesquelles empruntent');
    // UNE MARQUE DÉJÀ ÉCRITE RESTE : elle est de la main de l'élève.
    assert.match(rond, /sac\[rang\] === undefined\) return null/,
        'la règle efface aussi les marques déjà écrites');
    // ET L'ADDITION GARDE SES RONDS : ils sont sur CHAQUE colonne, retenue ou
    // pas, et n'apprennent donc rien à personne.
    assert.match(rond, /this\.operation === '-' &&[\s\S]{0,80}rang > this\.rangCourant/,
        'la règle s\'applique aussi à l\'addition, dont les ronds ne disent rien');
});

test('CASSER UNE DIZAINE EST UN SEUL GESTE, DANS LES DEUX MÉTHODES', () => {
    // RÉMY, deux fois : « la retenue indique 1 en haut et le chiffre d'après
    // est décrémenté de 1 », puis « quand on clique sur le 1, ca casse
    // automatiquement le suivant ». La compensation le faisait déjà (le +1 du
    // bas) ; le cassage, non.
    const tourne = corpsDe('tournerRetenue');
    assert.doesNotMatch(tourne, /!this\.parEmprunt\(\)\) \{\n\s+const suivant/,
        'la colonne suivante n\'est plus touchée que par la compensation');
    assert.match(tourne, /this\.parEmprunt\(\) \? this\.retenues : this\.marquesBas/,
        'le cassage n\'écrit plus la marque de la colonne suivante');
    // ET IL N'ÉCRIT QUE LE PREMIER PAS : sur 815 − 269, le 1 des dizaines
    // FINIT à 10 — prêté une dizaine ET emprunté une centaine. L'écrire au
    // moment où l'on casse les unités ferait d'avance un emprunt que l'élève
    // n'a pas décidé. `valeursDuRond` tient les deux dans l'ordre, h−1 puis
    // h+9, et c'est le premier qu'on pose.
    assert.match(tourne, /this\.valeursDuRond\(suivant, 'retenue'\) \|\| \[\]\)\[0\]/,
        'le cassage écrit la marque FINALE de la colonne suivante : il emprunte '
        + 'd\'avance à la place de l\'élève');
});
