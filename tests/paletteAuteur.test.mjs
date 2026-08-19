// LA PALETTE D'AUTEUR TIENT SUR DEUX RANGÉES — et doit continuer à y tenir.
//
// Le nombre de colonnes de la grille est écrit dans le CSS, le nombre
// d'icônes dans la page : rien ne les relie, et ajouter une quinzième icône
// ferait passer la palette à TROIS rangées sans que personne ne s'en aperçoive
// avant de la revoir sur un téléphone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RACINE = new URL('..', import.meta.url).pathname;
const lire = (f) => readFileSync(RACINE + f, 'utf8');

const page = lire('index.html');
const barre = page.slice(page.indexOf('id="db-tools"'), page.indexOf('id="db-version"'));
const icones = [...barre.matchAll(/class="debug-btn"/g)].length;

const colonnes = () => {
    const css = lire('css/ui.css');
    const bloc = css.slice(css.indexOf('.dbg-tools {'));
    const m = bloc.match(/grid-template-columns:\s*repeat\((\d+),/);
    return m ? Number(m[1]) : 0;
};

test('la palette d\'auteur est une grille, pas une seule rangée qui défile', () => {
    assert.ok(colonnes() > 0, 'la grille des icônes doit déclarer ses colonnes');
});

test('les icônes tiennent en deux rangées exactement', () => {
    const c = colonnes();
    assert.ok(icones > c, `${icones} icônes pour ${c} colonnes : il n'y aurait qu'une rangée`);
    assert.ok(icones <= 2 * c,
        `${icones} icônes pour ${c} colonnes : cela ferait ${Math.ceil(icones / c)} rangées. `
        + 'Ajuster grid-template-columns dans css/ui.css.');
});

test('chaque outil de la palette est branché', () => {
    const app = lire('js/app.js');
    const debugBar = lire('js/ui/debugBar.js');
    // `db-tools` est le conteneur, pas un outil.
    const ids = [...barre.matchAll(/id="(db-[\w-]+)"/g)].map(m => m[1]).filter(x => x !== 'db-tools');
    assert.equal(ids.length, icones, 'chaque icône porte un identifiant');
    ids.forEach(id => {
        assert.ok(app.includes(`'${id}'`) || debugBar.includes(`'${id}'`),
            `le bouton ${id} n'est branché nulle part`);
    });
});

test('la revue du catalogue a son bouton, et il ouvre la revue', () => {
    assert.ok(barre.includes('id="db-revue"'));
    assert.match(lire('js/app.js'), /db-revue[\s\S]{0,300}ui\/revue\.js[\s\S]{0,80}ouvrirRevue/);
});
