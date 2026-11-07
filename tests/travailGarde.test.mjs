// LE TRAVAIL DE RÉMY NE S'EFFACE PAS PAR INADVERTANCE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai tout trié dans tout le quotidien, je ne veux pas que mon
// travail soit supprimé. »
//
// Deux cents verdicts posés un par un vivent dans `localStorage`, et rien
// d'autre ne les porte : le catalogue est du CODE, une case cochée dans le
// navigateur ne le réécrit pas. Ce sont donc des heures qui tiennent à une
// clef de stockage.
//
// DEUX CHOSES PEUVENT LES EMPORTER, et cette épreuve tient les deux.
//
// ── 1. LE BOUTON « TOUT EFFACER » DE LA PALETTE D'AUTEUR ───────────────────
//
// Il vide `localStorage` pour repartir d'une application neuve — c'est son
// travail. Il garde une liste de clefs à épargner. Cette liste en portait DEUX
// alors qu'il y en avait CINQ : les trois autres ont été ajoutées après lui, et
// personne n'est revenu la compléter. Un tri de deux cents lignes se serait
// évaporé au premier ménage.
//
// L'ÉPREUVE EST DONC MÉCANIQUE : toute clef de stockage déclarée dans un module
// d'interface DOIT figurer dans la liste des épargnées. On ne peut plus en
// ajouter une et oublier.
//
// ── 2. LE BOUTON QUI EFFACE, À CÔTÉ DE CELUI QUI SORT ──────────────────────
//
// « Tout remettre à zéro » était contre « Copier les verdicts » — c'est-à-dire
// que le doigt qui réessaie une copie ratée tombait juste à côté de la
// destruction. Il DEMANDE maintenant avant de faire, en deux appuis.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const APP = lire('js/app.js');

/** La liste des clefs épargnées, lue dans le code plutôt que recopiée ici. */
function listeDesGardes() {
    const i = APP.indexOf('const GARDES = [');
    assert.ok(i > 0, 'la liste des clefs épargnées existe toujours dans js/app.js');
    // LES COMMENTAIRES PARTENT D'ABORD, et ce n'est pas du zèle : « le panier
    // de l'atelier du quotidien » porte une apostrophe, que l'expression
    // régulière lit comme une ouverture de chaîne. La dernière clef de la liste
    // disparaissait alors — l'épreuve accusait le code d'un oubli qu'il n'avait
    // pas.
    const bout = APP.slice(i, APP.indexOf('];', i)).replace(/\/\/[^\n]*/g, '');
    return [...bout.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/**
 * LES MODULES QUI PORTENT LE TRAVAIL DE RÉMY, et seulement eux.
 *
 * Pas `posteEleve.js` : son tiroir est celui d'un ÉLÈVE sur un poste partagé,
 * et l'effacer est exactement ce qu'on veut entre deux classes.
 */
const PORTEURS = [
    'js/ui/revue.js',            // la revue du catalogue
    'js/ui/quotidienTri.js',     // le tri des proverbes, blagues, citations, énigmes
    'js/ui/dingbatsTri.js',      // le tri des dingbats
    'js/ui/atelierToile.js',     // la récolte de l'atelier des dingbats
    'js/ui/atelierQuotidien.js'  // le panier de l'atelier du quotidien
];

test('TOUTE CLEF QUI PORTE LE TRAVAIL DE RÉMY EST ÉPARGNÉE PAR « TOUT EFFACER »', () => {
    const gardees = new Set(listeDesGardes());
    const manquantes = [];
    PORTEURS.forEach(f => {
        const texte = lire(f);
        // `const CLE… = '…'` — la forme employée par les cinq modules.
        [...texte.matchAll(/const CLE\w* = '([^']+)'/g)].forEach(m => {
            if (!gardees.has(m[1])) manquantes.push(`${f} : ${m[1]}`);
        });
    });
    assert.deepEqual(manquantes, [],
        'ces clefs portent des heures de tri et « Tout effacer » les emporterait ;\n'
        + 'la liste à compléter s\'appelle GARDES, dans js/app.js');
});

test('chaque porteur déclare bien une clef — sinon l\'épreuve ci-dessus ne garde rien', () => {
    // UNE ÉPREUVE QUI NE TROUVE AUCUNE CLEF PASSE AU VERT EN NE VÉRIFIANT RIEN.
    // Le jour où l'un de ces modules écrit sa clef autrement, on veut le savoir
    // ici et non après un ménage.
    PORTEURS.forEach(f => {
        assert.match(lire(f), /const CLE\w* = '/,
            `${f} doit déclarer sa clef sous la forme que l'épreuve sait lire`);
    });
});

test('LE BOUTON QUI EFFACE LES VERDICTS DEMANDE AVANT DE LE FAIRE', () => {
    // Un seul appui effaçait deux cents verdicts, sans un mot. Pas de fenêtre
    // native ici — Rémy : « tu utilises des alert et prompt, on évite ! » — donc
    // c'est le bouton lui-même qui pose la question, et l'on vérifie qu'il la
    // pose : `dataset.arme` est le second appui, et il n'efface qu'après.
    ['js/ui/quotidienTri.js', 'js/ui/dingbatsTri.js'].forEach(f => {
        const texte = lire(f);
        assert.match(texte, /if \(!vider\.dataset\.arme\) \{/,
            `${f} : le premier appui sur « Tout remettre à zéro » doit seulement armer`);
        assert.match(texte, /Appuie encore/,
            `${f} : et il doit le DIRE sur le bouton`);
        assert.doesNotMatch(texte, /(confirm|alert|prompt)\s*\(/,
            `${f} : jamais de fenêtre native`);
    });
});

test('SORTIR UN TEXTE NE DÉPEND PAS DU PRESSE-PAPIERS', () => {
    // La cause exacte de « ça ne copie rien » : le seul chemin passait par
    // `navigator.clipboard`, qui n'existe pas hors HTTPS. Les deux tris passent
    // désormais par `copierOuMontrer`, qui pose le texte à l'écran quoi qu'il
    // arrive, et offrent un téléchargement — qui, lui, ne demande rien.
    ['js/ui/quotidienTri.js', 'js/ui/dingbatsTri.js'].forEach(f => {
        const texte = lire(f);
        assert.match(texte, /copierOuMontrer\(/, `${f} emploie le chemin qui montre le texte`);
        assert.match(texte, /telechargerTexte\(/, `${f} offre aussi le fichier`);
        assert.doesNotMatch(texte, /navigator\.clipboard/,
            `${f} ne doit plus appeler le presse-papiers directement :\n`
            + 'c\'est ce qui rendait un bouton muet quand il refusait');
    });
    assert.match(lire('js/ui/exporter.js'),
        /zone\.value = texte;[\s\S]{0,400}?try \{\s*await navigator\.clipboard/,
        'le texte est posé dans la zone AVANT la tentative de copie, pas après :\n'
        + 'après, une exception sauterait la pose et le bouton ne ferait rien');
});
