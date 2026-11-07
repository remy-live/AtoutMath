// UNE GRILLE AMPUTÉE NE DIT PAS QU'ELLE L'EST.
//
// Rémy, capture d'un binairo sur téléphone, en aperçu de professeur : six
// colonnes, des cases trois fois plus hautes que larges, la grille visiblement
// tronquée. Le contraste, lui, était impeccable — les deux défauts n'ont rien
// à voir l'un avec l'autre, et le second se cachait derrière le premier.
//
// LE MÉCANISME, MESURÉ À 375 × 600 EN APERÇU : le plateau fait 259 px de haut
// (`aspect-ratio: 1` sur une largeur contrainte), ses six rangées en réclament
// 276, elles débordent de 23 px — et `overflow: hidden` en coupe SIX CASES
// sans rien dire. Personne ne voit passer une case supprimée.
//
// POURQUOI LES RANGÉES RÉCLAMAIENT PLUS QUE LEUR PART. Deux causes, et il
// fallait les deux :
//
//   · `repeat(n, 1fr)` vaut `repeat(n, minmax(auto, 1fr))` : une piste refuse
//     de descendre sous la hauteur de son CONTENU. Écrire `minmax(0, 1fr)` est
//     la seule façon de dire « cette piste peut rétrécir » ;
//   · le chiffre se dimensionnait en `cqh` — la HAUTEUR DU PLATEAU DE JEU,
//     qui n'a aucun rapport avec la taille d'une case. Une fenêtre haute et
//     étroite donnait un chiffre trop gros pour sa case, la case repoussait sa
//     piste, et la grille débordait. Il se mesure désormais à la case :
//     largeur retenue du plateau, divisée par le nombre de colonnes.
//
// LE GARAM PORTAIT DÉJÀ LA CORRECTION, mot pour mot : « sans `min-height: 0`,
// une case de grille refuse de descendre sous la hauteur de son chiffre ». Le
// mathdoku, le binairo et le sudoku ne l'avaient jamais eue.
//
// APRÈS, sur les quatre grilles et six tailles de fenêtre (390×844, 375×600,
// 360×640, 320×568, 844×390, 1280×900) : toutes les cases présentes, rapport
// 1,00 à 1,02, zéro case coupée. `node tools/grilleLisible.mjs` le remesure.
//
// « EST-CE DÛ AU MODE APERÇU ? » — la question de Rémy, et la réponse est NON.
// Mesuré sur le FICHIER D'AVANT, sorti de git et non imité, le binairo à cinq
// tailles de fenêtre avec et sans le cadre de professeur :
//
//     375 × 600  sans cadre : entier      · avec cadre : SIX CASES COUPÉES
//     375 × 640  sans cadre : SIX COUPÉES · avec cadre : entier
//     360 × 640  sans cadre : cases de 41 à 46 px de haut — inégales
//
// La deuxième ligne suffit à répondre : à 375 × 640 c'est l'aperçu qui SAUVE
// la grille. Le cadre ne fait que changer la hauteur disponible, et selon la
// fenêtre il fait passer du bon ou du mauvais côté de la limite. La troisième
// montre la cause à nu, sans aucun aperçu : des rangées de hauteurs inégales,
// parce qu'une case vide porte un `<input>` — plus haut qu'un `<span>` — et
// qu'une piste en `1fr` refuse de descendre sous son contenu. Sur la capture
// de Rémy, la rangée entièrement DONNÉE est la plus courte des six : c'est
// cette signature-là.
//
// CE QUE JE N'AI PAS PU FAIRE, ET QUI SE DIT : reproduire l'ampleur de sa
// capture. Chromium donne à ses champs une hauteur intrinsèque plus modeste
// que Safari ; ici l'écart entre rangées est de cinq pixels, chez lui d'un
// facteur deux. La correction ne dépend pas du navigateur — les pistes ne
// consultent plus le contenu du tout — mais c'est sur SON iPhone que la
// vérification finale se fait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

// LE PLUS LONG DES BLOCS QUI PORTENT CE NOM, ET C'EST NÉCESSAIRE : `.su-board`
// est redéclaré dans une requête de média, PLUS HAUT dans le fichier, pour une
// seule ligne. Prendre le premier venu rendait ce bloc-là, et l'épreuve
// annonçait qu'il manquait une déclaration parfaitement présente cent lignes
// plus bas.
const bloc = (selecteur) => {
    const tous = [...CSS.matchAll(new RegExp(`\\${selecteur} \\{([^}]*)\\}`, 'g'))]
        .map(m => m[1]);
    return tous.sort((a, b) => b.length - a.length)[0] || '';
};

test('LES PISTES D\'UNE GRILLE PEUVENT RÉTRÉCIR', () => {
    for (const [sel, n] of [['.kk-board', 'kk-n'], ['.su-board', 'su-n']]) {
        const b = bloc(sel);
        assert.ok(b, `le bloc ${sel} doit exister`);
        for (const axe of ['columns', 'rows']) {
            const m = new RegExp(`grid-template-${axe}: repeat\\(var\\(--${n}\\), ([^)]*\\)?[^;]*)\\;`)
                .exec(b);
            assert.ok(m, `${sel} doit déclarer grid-template-${axe}`);
            assert.match(m[1], /minmax\(0,\s*1fr\)/,
                `${sel} : les pistes en ${axe} doivent pouvoir descendre à zéro. `
                + `« 1fr » vaut « minmax(auto, 1fr) » et refuse de passer sous le contenu — `
                + 'la grille déborde alors du plateau, qui en coupe le bas sans rien dire');
        }
    }
});

test('UNE CASE PEUT RÉTRÉCIR AUTANT QUE SA PISTE', () => {
    // Une piste élastique dont la case ne l'est pas ne sert à rien : c'est la
    // case qui repousse la piste par en dessous.
    for (const sel of ['.kk-cell', '.su-cell', '.ga-cell']) {
        const b = bloc(sel);
        assert.ok(b, `le bloc ${sel} doit exister`);
        assert.match(b, /min-height:\s*0/,
            `${sel} doit pouvoir descendre sous la hauteur de son chiffre`);
        assert.match(b, /min-width:\s*0/, `${sel} : dans l'autre sens aussi`);
    }
});

test('LE CHIFFRE SE MESURE À LA CASE, PAS À LA FENÊTRE', () => {
    for (const [sel, largeur, n] of [
        ['.kk-cell', 'kk-largeur', 'kk-n'], ['.su-cell', 'su-largeur', 'su-n']]) {
        const b = bloc(sel);
        const m = /font-size:\s*([^;]+);/.exec(b);
        assert.ok(m, `${sel} doit déclarer sa taille de chiffre`);
        // `cqh` est la hauteur du PLATEAU DE JEU : un chiffre qui s'y accroche
        // grossit quand la fenêtre s'allonge, sans que sa case grandisse.
        assert.doesNotMatch(m[1], /cqh/,
            `${sel} : la taille du chiffre ne se prend plus sur la hauteur de la `
            + 'fenêtre — c\'est ce qui faisait déborder la grille');
        assert.match(m[1], new RegExp(`var\\(--${largeur}`),
            `${sel} doit se caler sur la largeur retenue du plateau`);
        assert.match(m[1], new RegExp(`var\\(--${n}`),
            `${sel} doit la diviser par le nombre de colonnes`);
    }

    // ET LA LARGEUR DOIT ÊTRE NOMMÉE POUR ÊTRE DIVISÉE. Si le plateau reprend
    // un `width:` littéral, le jeton disparaît et la taille du chiffre retombe
    // sur son repli — qui vaut la grille la plus large, donc trop gros partout.
    for (const [sel, largeur] of [['.kk-board', 'kk-largeur'], ['.su-board', 'su-largeur']]) {
        const b = bloc(sel);
        assert.match(b, new RegExp(`--${largeur}:\\s*min\\(`),
            `${sel} doit nommer sa largeur retenue`);
        assert.match(b, new RegExp(`width:\\s*var\\(--${largeur}\\)`),
            `${sel} doit l'employer, sinon les deux divergent en silence`);
    }
});

test('LE PLATEAU LAISSE LA PLACE À CE QUI L\'ENTOURE', () => {
    // MESURÉ SUR TRENTE CONDITIONS (trois grilles × deux cadres d'aperçu ×
    // cinq tailles) : « Valider » tombait SOUS le bas de l'écran dans onze
    // d'entre elles, jusqu'à 125 px. La largeur du plateau ne regardait que la
    // hauteur disponible, jamais celle de la consigne, de la palette, des deux
    // boutons et de la ligne d'état. Six cas restent, tous en paysage ou sur le
    // plus petit téléphone DANS le cadre du professeur, et dans les six le
    // conteneur défile — mesuré, pas supposé.
    for (const [sel, jeton] of [['.kk-board', 'kk-largeur'], ['.su-board', 'su-largeur']]) {
        const v = new RegExp(`--${jeton}:\\s*([^;]+);`).exec(bloc(sel))?.[1] || '';
        assert.match(v, /100cqh\s*-\s*\d+px/,
            `${sel} doit retrancher de la hauteur ce qui vit autour de la grille`);
        assert.doesNotMatch(v, /,\s*\d+cqh\s*[,)]/,
            `${sel} : une simple fraction de la hauteur ne tient pas compte du reste`);
    }

    // ET LE PLANCHER RESTE HAUT. Une première correction descendait à 170 px :
    // elle rendait les onze boutons, et ramenait les cases du binairo de 46 à
    // 35 px SUR LE TÉLÉPHONE DE L'ÉLÈVE, où le bouton ne sortait pas. 264, ce
    // sont six cases de 44 — le plancher tactile du dépôt.
    const plancher = /--kk-largeur:[^;]*max\((\d+)px/.exec(bloc('.kk-board'));
    assert.ok(plancher, 'le plateau du mathdoku doit garder un plancher');
    assert.ok(Number(plancher[1]) >= 264,
        `le plancher est à ${plancher[1]} px : il en faut 264, soit six cases de 44`);
});
