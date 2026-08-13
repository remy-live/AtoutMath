// LES IDENTIFIANTS QUE L'INTERFACE VA CHERCHER DOIVENT EXISTER.
//
// Un `querySelector('#fq-consigne')` qui ne trouve rien ne lève rien : il rend
// `null`, et le défaut n'apparaît que trois lignes plus loin, à l'usage, sous
// la forme d'un « Cannot read properties of null ». Sur un panneau qu'on
// n'ouvre qu'une fois par mois, cela peut vivre longtemps.
//
// Ce test relit donc les modules d'interface et vérifie que tout identifiant
// interrogé est bien posé quelque part — dans le même fichier, dans la page,
// ou dans un autre module qui construit ce panneau.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;

const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');

const fichiersJs = () => {
    const out = [];
    const parcourir = (dossier) => {
        readdirSync(join(RACINE, dossier), { withFileTypes: true }).forEach(e => {
            if (e.isDirectory()) parcourir(`${dossier}/${e.name}`);
            else if (e.name.endsWith('.js')) out.push(`${dossier}/${e.name}`);
        });
    };
    parcourir('js');
    return out;
};

/**
 * Tout ce qui compte comme « posé » : un `id="x"` écrit en clair, un
 * `el.id = 'x'`, ou — pour les gabarits `id="${'${'}id}"` — le littéral 'x'
 * employé AILLEURS que dans une interrogation. Cette dernière règle sauve les
 * identifiants passés en argument (`infoBtn(null, 'cfg-threshold-tip')`) sans
 * désarmer le test : un identifiant réellement absent n'apparaît, lui, que
 * dans le `querySelector` qui le cherche.
 */
function idsPoses() {
    const ids = new Set();
    const ramasser = (texte) => {
        for (const m of texte.matchAll(/\bid\s*=\s*["'`]([\w-]+)["'`]/g)) ids.add(m[1]);
        for (const m of texte.matchAll(/\.id\s*=\s*['"`]([\w-]+)['"`]/g)) ids.add(m[1]);
        const sansRequetes = texte
            .replace(/getElementById\(\s*['"][\w-]+['"]\s*\)/g, '')
            .replace(/querySelector(?:All)?\(\s*['"]#[\w-]+['"]\s*\)/g, '');
        for (const m of sansRequetes.matchAll(/['"]([\w-]*-[\w-]+)['"]/g)) ids.add(m[1]);
    };
    ramasser(lire('index.html'));
    fichiersJs().forEach(f => ramasser(lire(f)));
    return ids;
}

test('tout identifiant interrogé par l\'interface existe quelque part', () => {
    const poses = idsPoses();
    const manquants = [];
    fichiersJs().forEach(f => {
        const texte = lire(f);
        const cherche = new Set();
        // On ne retient que les interrogations CLOSES : `getElementById('x')`.
        // Un identifiant construit — `getElementById('desk-btn-' + nom)` — ne
        // se vérifie pas de l'extérieur.
        for (const m of texte.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g)) cherche.add(m[1]);
        for (const m of texte.matchAll(/querySelector(?:All)?\(\s*['"]#([\w-]+)['"]\s*\)/g)) cherche.add(m[1]);
        cherche.forEach(id => {
            if (!poses.has(id)) manquants.push(`${f} → #${id}`);
        });
    });
    assert.deepEqual(manquants, [],
        `identifiants interrogés mais jamais posés :\n  ${manquants.join('\n  ')}`);
});

// --- La consigne des fiches -------------------------------------------------

import { premierePhrase } from '../js/ui/printQuestions.js';

test('la consigne de la feuille s\'arrête à la première phrase', () => {
    // L'énoncé de l'écran parle de toucher, de glisser et de boutons : sur du
    // papier, la suite n'a aucun sens. On garde la phrase qui dit quoi faire.
    assert.equal(
        premierePhrase('Lis le nombre écrit en toutes lettres et saisis-le en chiffres. '
            + 'Touche la case, puis valide avec le bouton vert.'),
        'Lis le nombre écrit en toutes lettres et saisis-le en chiffres.');
    assert.equal(premierePhrase('Calcule !'), 'Calcule !');
    assert.equal(premierePhrase(''), '');
    assert.equal(premierePhrase(null), '');
    // Une première phrase interminable n'est pas une consigne : mieux vaut
    // laisser le champ vide et que le professeur écrive la sienne.
    assert.equal(premierePhrase('a'.repeat(130) + '.'), '');
    // Un texte sans ponctuation, mais court, passe tel quel.
    assert.equal(premierePhrase('Complète le tableau'), 'Complète le tableau');
});

// --- Les variables de couleur -----------------------------------------------

test('toute variable CSS employée par un module est déclarée quelque part', () => {
    // `background: var(--bg-main)` sur un panneau plein écran, quand la
    // variable s'appelle en réalité `--bg-app` : le panneau devient
    // TRANSPARENT. Rien ne casse, rien ne s'affiche en erreur — on voit
    // simplement la page du dessous à travers, et il faut une capture d'écran
    // pour s'en apercevoir. Un nom mal orthographié doit tomber ici.
    const declarees = new Set();
    readdirSync(join(RACINE, 'css')).forEach(f => {
        for (const m of lire(`css/${f}`).matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
    });
    // Les modules déclarent aussi les leurs, en ligne (`--dm-cote`, …).
    fichiersJs().forEach(f => {
        for (const m of lire(f).matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
        for (const m of lire(f).matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) declarees.add(m[1]);
    });

    const inconnues = [];
    fichiersJs().forEach(f => {
        const texte = lire(f);
        // `var(--x, repli)` porte sa valeur de secours : elle ne casse rien.
        for (const m of texte.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
            if (!declarees.has(m[1])) inconnues.push(`${f} → ${m[1]}`);
        }
    });
    assert.deepEqual([...new Set(inconnues)], [],
        `variables employées sans être déclarées :\n  ${[...new Set(inconnues)].join('\n  ')}`);
});
