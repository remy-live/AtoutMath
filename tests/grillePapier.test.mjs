// UNE GRILLE DE PUZZLE EST DU PAPIER, PAS UN PANNEAU DE L'INTERFACE.
//
// Rémy, capture du mathdoku en thème Forêt : « pas lisible ».
//
// CE QUE J'AI CHERCHÉ D'ABORD, ET QUI N'EXISTAIT PAS. Sur son image, la grille
// semblait écrasée sur deux rangées de cases étirées. J'ai balayé onze
// conditions — téléphone court, plein écran, texte aéré, paysage, les deux
// cadres de l'aperçu du professeur, le thème Forêt — et la grille est carrée
// partout : seize cases, quatre rangées, quatre colonnes, rapport 1,00. La
// déformation était un effet de lecture, pas une déformation.
//
// CE QUI EXISTAIT, ET QUE LE CHIFFRE A DÉSIGNÉ. Le quadrillage fin prenait
// `--border`, un jeton fait pour border un panneau. MESURÉ sur la grille
// réelle, contraste du trait de case sur le fond de la case :
//
//     clair 1,23 · sombre 1,41 · océan 1,56 · forêt 1,34 · couchant 1,44
//
// Un pixel à 1,3 ne se voit pas : les cases fondaient en gros blocs, et les
// morceaux de vert clair qui survivaient ressemblaient à des marques égarées.
// Le trait de cage, lui, était à 10,98 — huit fois plus fort — ce qui achevait
// de faire lire les CAGES comme si elles étaient les CASES. C'est exactement
// les « deux rangées » que Rémy voyait.
//
// ET EN THÈME SOMBRE, TOUT DISPARAISSAIT : le bleu nuit codé en dur des cages
// tombait à 1,33 sur le fond de panneau.
//
// APRÈS : 3,13 pour le trait fin et 17,85 pour la cage, IDENTIQUES DANS LES
// CINQ THÈMES — c'est le but, une grille de chiffres ne suit pas les humeurs
// du thème. Le dépôt avait déjà tranché : `.su-cell` et `.ga-cell` se peignent
// leur propre papier depuis toujours ; le mathdoku était le seul des trois à
// emprunter les jetons.
//
// CETTE ÉPREUVE GARDE LES DEUX CHIFFRES, pas les noms de couleurs : c'est le
// contraste qui a manqué, et c'est lui qui doit tomber si quelqu'un éclaircit
// le trait « parce qu'il est un peu fort ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER. Ce dépôt explique ses choix à
// l'endroit où ils se prennent : le bloc du sudoku CITE le #cbd5e1 qu'on vient
// d'en retirer, pour dire pourquoi. Une épreuve qui cherche la couleur dans le
// texte brut tombe alors sur son propre acte de décès — et j'ai payé le
// diagnostic avant de comprendre que le défaut était dans l'épreuve.
const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

/** Le bloc du plateau de mathdoku, où vivent les jetons de papier. */
const PLATEAU = /\.kk-board \{([^}]*)\}/.exec(CSS)?.[1] || '';
/** Le bloc d'une case. */
const CASE = /\.kk-cell \{([^}]*)\}/.exec(CSS)?.[1] || '';

/** La valeur d'un jeton déclaré dans un bloc, sans son point-virgule. */
function jeton(bloc, nom) {
    const m = new RegExp(`--${nom}:\\s*([^;]+);`).exec(bloc);
    return m ? m[1].trim() : null;
}

function luminance(hex) {
    // `#fff` est un hexadécimal aussi valide que `#ffffff`, et la première
    // version de cette épreuve rendait NaN dessus — un NaN qui tombe est une
    // chance : comparé à 3, il aurait pu passer pour un vrai verdict.
    let n = hex.replace('#', '');
    if (n.length === 3) n = [...n].map(c => c + c).join('');
    const v = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

test('LE PAPIER DE LA GRILLE EST DÉCLARÉ, ET IL NE SUIT PAS LE THÈME', () => {
    for (const nom of ['kk-papier', 'kk-trait', 'kk-cage', 'kk-encre',
        'kk-encre-donnee', 'kk-donnee']) {
        const v = jeton(PLATEAU, nom);
        assert.ok(v, `le jeton --${nom} doit être déclaré sur .kk-board`);
        // UNE COULEUR FIXE, ÉCRITE EN TOUTES LETTRES. Un `var(--border)` ou un
        // `color-mix` sur `--text-main` ramène exactement le défaut : le papier
        // se retournerait en thème sombre, l'encre deviendrait blanche.
        assert.match(v, /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
            `--${nom} vaut « ${v} » : une grille de chiffres se peint en dur, `
            + 'sinon elle change de sens d\'un thème à l\'autre');
    }
});

test('LE TRAIT FIN SE VOIT, ET LA CAGE L\'EMPORTE SUR LUI', () => {
    const papier = jeton(PLATEAU, 'kk-papier');
    const trait = jeton(PLATEAU, 'kk-trait');
    const cage = jeton(PLATEAU, 'kk-cage');

    // 3 : ce qu'un objet graphique demande pour être vu. Le trait mesurait 1,23
    // à 1,56 selon le thème — c'est CE chiffre-là qui rendait la grille
    // illisible, et c'est lui que cette ligne garde.
    const ct = contraste(trait, papier);
    assert.ok(ct >= 3,
        `le quadrillage fin est à ${ct.toFixed(2)} sur le papier, il en faut 3`);

    // ET LE PIRE CAS, QUI N'EST PAS LE PAPIER BLANC. Une case DONNÉE a un fond
    // gris, et le même trait y perd un demi-point. La première valeur retenue
    // passait à 3,13 sur le blanc et tombait à 2,86 entre deux cases données —
    // `tools/grilleLisible.mjs` l'a vu parce qu'il annonce le pire couple, pas
    // le premier venu. C'est ce chiffre-là qui décide de la couleur.
    const cd = contraste(trait, jeton(PLATEAU, 'kk-donnee'));
    assert.ok(cd >= 3,
        `le quadrillage entre deux cases données est à ${cd.toFixed(2)}, il en faut 3`);

    // Et la cage doit rester franchement plus forte, sans quoi les deux
    // niveaux de trait se confondent et le puzzle perd ses cages.
    const cc = contraste(cage, papier);
    assert.ok(cc >= 7,
        `le trait de cage est à ${cc.toFixed(2)}, il en faut 7`);
    assert.ok(cc > ct * 2,
        'la cage doit dominer le quadrillage — c\'est elle qui porte le puzzle');

    // L'ENCRE SUR LE PAPIER, les deux encres : celle de l'élève et celle qu'on
    // lui donne. Une grille dont on ne lit pas les chiffres n'est pas une
    // grille, et c'est ce qui arrivait en thème sombre.
    assert.ok(contraste(jeton(PLATEAU, 'kk-encre'), papier) >= 4.5,
        'ce que l\'élève pose doit se lire sur le papier');
    assert.ok(contraste(jeton(PLATEAU, 'kk-encre-donnee'), jeton(PLATEAU, 'kk-donnee')) >= 4.5,
        'ce qui lui est donné doit se lire sur le fond des cases données');
});

test('AUCUNE CASE NE REPREND LES JETONS DU THÈME', () => {
    assert.doesNotMatch(CASE, /var\(--border\)/,
        'le quadrillage ne se prend plus sur --border : c\'est le défaut d\'origine');
    assert.doesNotMatch(CASE, /var\(--text-main\)/,
        'l\'encre ne se prend plus sur --text-main, qui devient blanc en thème sombre');

    // Les bordures de cage passaient par un bleu nuit codé en dur, invisible
    // sur le fond de panneau du thème sombre (1,33).
    const cages = /\.kk-bt \{[^}]*\}\s*\.kk-br \{[^}]*\}\s*\.kk-bb \{[^}]*\}\s*\.kk-bl \{[^}]*\}/
        .exec(CSS)?.[0] || '';
    assert.ok(cages, 'les quatre bordures de cage doivent rester déclarées ensemble');
    assert.doesNotMatch(cages, /#2c3e50/,
        'plus de bleu nuit codé en dur : il disparaissait sur le thème sombre');
    assert.equal((cages.match(/var\(--kk-cage/g) || []).length, 4,
        'les quatre côtés de cage passent par le même jeton');

    // ET LES REPLIS RESTENT. `.kk-cell` sert aussi au garam et au sudoku, dont
    // les plateaux ne portent pas ces jetons : sans repli, le `var()` devient
    // invalide et emporte la déclaration entière — la bordure disparaît.
    assert.match(CASE, /var\(--kk-trait, #[0-9a-f]{6}\)/i,
        'le trait doit garder son repli : .kk-cell vit aussi hors de .kk-board');
    assert.match(CASE, /var\(--kk-encre, #[0-9a-f]{6}\)/i,
        'l\'encre aussi');

    // LE SUDOKU PORTAIT LE MÊME DÉFAUT, et personne ne l'avait signalé : son
    // quadrillage était un #cbd5e1 à 1,36. Il a été mesuré en passant, parce
    // que corriger le mathdoku demandait de regarder ce qu'on cassait à côté.
    // Les deux jeux partagent maintenant le même trait.
    const SUDOKU = /\.su-cell \{([^}]*)\}/.exec(CSS)?.[1] || '';
    assert.ok(SUDOKU, 'le bloc .su-cell doit exister');
    assert.doesNotMatch(SUDOKU, /#cbd5e1/,
        'le quadrillage du sudoku ne revient pas à un séparateur d\'interface');
    assert.equal((SUDOKU.match(/var\(--kk-trait, #[0-9a-f]{6}\)/gi) || []).length, 2,
        'ses deux bordures de case passent par le trait commun, repli compris');
});
