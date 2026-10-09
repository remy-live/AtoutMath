// LA VIRGULE QUI ALIGNE DOIT RESSEMBLER À UNE VIRGULE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant une addition posée à virgule : « les virgules ne sont pas très
// visibles. »
//
// CE QUE LA SONDE A VU (tools/virgulesLisibles.mjs, qui remesure tout cela dans
// un vrai navigateur) : sur la plaque à faire glisser, la virgule portait 136
// pixels d'encre contre 866 pour le chiffre voisin — 16 % de lui. Et dans la
// GRILLE, ce n'était pas une virgule du tout : un rond rouge de 8 px, que la
// photo fait lire comme une puce de liste. Après correction, 53 % sur
// l'ordinateur et 66 % sur le téléphone, et une vraie virgule dans la grille.
//
// POURQUOI CE SIGNE-LÀ MÉRITE UNE ÉPREUVE À LUI. L'exercice entier repose
// dessus — sa consigne ne dit que cela : « les unités sous les unités : c'est
// la virgule qui aligne, pas le bord droit ». La montrer d'une façon sur la
// plaque et d'une autre dans la grille laissait à l'élève le soin de faire le
// lien, sur le seul signe dont l'exercice dépend.
//
// CE QU'ON ÉPROUVE ICI, ET CE QU'ON N'ÉPROUVE PAS. On n'interdit aucun mot :
// on exige les DEUX propriétés dont dépend ce qui se voit à l'écran, et que
// seule une relecture attentive remarquerait si elles disparaissaient.
//
//   1. LA MARQUE EST UNE VIRGULE. Un `content` vide redonne le rond.
//   2. ELLE LAISSE PASSER LE CLIC. Elle déborde sur la case voisine — et dans
//      la division, sur la FENTE où l'on POSE la virgule. Un signe plus gros
//      qui vole ce clic-là rendrait l'exercice injouable en réglant l'autre
//      moitié du problème : c'est exactement le genre de correction qui casse
//      ce qu'elle ne regardait pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** La règle CSS qui dessine la marque décimale, telle qu'elle est écrite. */
function regleDe(fichier, selecteur) {
    const src = readFileSync(new URL(`../js/games/${fichier}`, import.meta.url), 'utf8');
    const i = src.indexOf(`${selecteur}::after {`);
    assert.ok(i >= 0, `${fichier} ne déclare plus ${selecteur}::after`);
    const j = src.indexOf('}', i);
    return src.slice(i, j);
}

const JEUX = [
    { fichier: 'poserOperation.js', selecteur: '.po-case--virgule', quoi: 'addition et soustraction' },
    { fichier: 'poserLongue.js', selecteur: '.pl-case--virgule', quoi: 'multiplication et division' }
];

test('LA GRILLE DESSINE UNE VIRGULE, PAS UNE PUCE', () => {
    for (const j of JEUX) {
        const regle = regleDe(j.fichier, j.selecteur);
        assert.match(regle, /content:\s*','/,
            `${j.quoi} : la marque décimale doit être le caractère virgule. `
            + 'Un contenu vide redonne le rond rouge que Rémy ne voyait pas.');
    }
});

test('ET ELLE LAISSE PASSER LE CLIC DE LA CASE QU\'ELLE DÉBORDE', () => {
    for (const j of JEUX) {
        const regle = regleDe(j.fichier, j.selecteur);
        assert.match(regle, /pointer-events:\s*none/,
            `${j.quoi} : la virgule se peint SUR la frontière de deux cases — et `
            + 'dans la division, sur la fente où l\'élève POSE la virgule. Sans '
            + 'pointer-events none, elle avale le clic qui la fait naître.');
    }
});

test('LA VIRGULE DE LA PLAQUE EST UN ÉLÉMENT À ELLE, PLUS GROS QUE LE TEXTE', () => {
    // Elle ne peut pas être un simple caractère dans le flux : il faut pouvoir
    // la grossir sans grossir les chiffres, et la rendre transparente au doigt
    // sans rendre la plaque insaisissable.
    const src = readFileSync(new URL('../js/games/poserOperation.js', import.meta.url), 'utf8');
    const i = src.indexOf('.po-nombre .po-virgule {');
    assert.ok(i >= 0, 'la virgule de la plaque n\'a plus de règle à elle');
    const regle = src.slice(i, src.indexOf('}', i));
    const taille = /font-size:\s*([\d.]+)em/.exec(regle);
    assert.ok(taille, 'la virgule de la plaque doit fixer sa taille en em, pour suivre les chiffres');
    assert.ok(Number(taille[1]) >= 1.2,
        `mesuré : à 1 em elle pesait 16 % d'un chiffre, à ${taille[1]} em elle en pèse la moitié`);
    assert.match(regle, /pointer-events:\s*none/,
        'on attrape le nombre par un CHIFFRE : celui qu\'on tient tombe dans la '
        + 'colonne survolée, et la virgule n\'en est pas un');
    // ET ELLE PORTE BIEN CETTE CLASSE-LÀ dans le code qui la crée : une règle
    // qui ne s'applique à rien est une correction qui n'existe pas.
    assert.match(src, /v\.className = 'po-virgule';/,
        'la virgule créée à l\'écran doit porter la classe que la règle vise');
});
