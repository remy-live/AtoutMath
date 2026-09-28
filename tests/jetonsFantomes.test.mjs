// UN JETON QUI N'EXISTE PAS REND TOUJOURS SON REPLI.
//
// Rémy, capture du « Patron qui se Plie » en thème sombre, un seul mot :
// « illisible ». Deux boutons blancs portant un texte blanc.
//
// LE CODE DISAIT : background: var(--card-bg, #fff); color: var(--text-main).
// Or --card-bg n'est déclaré NULLE PART dans ce dépôt — ses jetons de surface
// s'appellent --bg-panel, --bg-app, --bg-plateau, --bg-hover. Le repli #fff
// s'appliquait donc TOUJOURS, y compris là où --text-main vaut du blanc.
// MESURÉ sur les pixels rendus, en thème sombre : contraste 1,05 pour un seuil
// de 4,5.
//
// CE QUI REND CE DÉFAUT INVISIBLE À LA LECTURE : un repli ressemble à une
// précaution. On lit « si le jeton manque, prends du blanc » et l'on passe.
// C'est le contraire : le repli est la valeur qu'on obtient À COUP SÛR quand on
// se trompe de nom, et un nom faux ne se signale jamais.
//
// COMPTÉ SUR TOUT LE DÉPÔT : 225 jetons employés, 82 jamais déclarés. La
// plupart sont posés depuis JavaScript par les jeux eux-mêmes et vont très
// bien. Six portaient un nom de SURFACE ou de BORDURE et retombaient sur une
// couleur claire écrite en dur : --card-bg, --border-color, --border-soft,
// --surface, --surface-2, --bg-soft. Quarante-neuf emplois, dans treize
// fichiers, tous remplacés par les vrais jetons.
//
// CE QUI DOIT RESTER BLANC LE DIT EN TOUTES LETTRES. Le plateau du Serpent est
// du papier, comme la grille du sudoku : il garde son #fff, écrit directement.
// Un jeton qui n'existe pas laissait croire qu'il suivait le thème.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

/** Les six noms qui ressemblent à des jetons du thème sans en être. */
const FANTOMES = ['card-bg', 'border-color', 'border-soft', 'surface', 'surface-2', 'bg-soft'];

function tousLesFichiers() {
    const out = [];
    const pile = [new URL('../css/', import.meta.url).pathname,
        new URL('../js/', import.meta.url).pathname];
    while (pile.length) {
        const p = pile.pop();
        for (const e of readdirSync(p, { withFileTypes: true })) {
            const f = join(p, e.name);
            if (e.isDirectory()) pile.push(f);
            else if (extname(e.name) === '.css' || extname(e.name) === '.js') out.push(f);
        }
    }
    return out;
}

test('AUCUNE SURFACE NE S\'APPUIE SUR UN JETON QUI N\'EXISTE PAS', () => {
    const coupables = [];
    for (const f of tousLesFichiers()) {
        const s = readFileSync(f, 'utf8');
        for (const nom of FANTOMES) {
            const n = s.split(`var(--${nom}`).length - 1;
            if (n) coupables.push(`${f.split('/AtoutMath/')[1] || f} : --${nom} × ${n}`);
        }
    }
    assert.deepEqual(coupables, [],
        'ces jetons ne sont déclarés nulle part : leur repli s\'applique toujours, '
        + 'et un repli clair sous un texte du thème donne du blanc sur blanc dès '
        + 'que le thème s\'assombrit');
});

test('ET LES VRAIS JETONS DE SURFACE, EUX, SONT BIEN DÉCLARÉS', () => {
    // Le contrôle du contrôle : si demain quelqu'un renomme --bg-panel, la
    // liste ci-dessus deviendrait un mensonge et cette épreuve passerait
    // toujours. On vérifie donc que ce qu'on recommande existe pour de bon.
    const base = readFileSync(new URL('../css/base.css', import.meta.url), 'utf8');
    for (const nom of ['bg-panel', 'bg-app', 'bg-plateau', 'bg-hover', 'border']) {
        assert.match(base, new RegExp(`--${nom}\\s*:`),
            `--${nom} doit être déclaré dans css/base.css : c'est le jeton qu'on `
            + 'donne en remplacement des fantômes');
    }
});

test('LE BOUTON QUI L\'A RÉVÉLÉ PORTE LA CORRECTION', () => {
    const JEU = readFileSync(new URL('../js/games/patrons.js', import.meta.url), 'utf8');
    const m = /\.pa-btn \{([^}]*)\}/.exec(JEU);
    assert.ok(m, 'la règle du bouton doit exister');
    assert.match(m[1], /background: var\(--bg-panel\)/,
        'son fond suit le thème, comme son texte');
    assert.match(m[1], /border: 1\.5px solid var\(--border\)/,
        'sa bordure aussi');
});
