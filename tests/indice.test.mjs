// L'INDICE CIBLÉ — souffler à un élève, sans arrêter la classe.
//
// Rémy : « la possibilité de […] envoyer un indice ».
//
// CE QUI SE VÉRIFIE ICI EST CE QU'ON PROPOSE AU PROFESSEUR, et il y a une
// raison de l'éprouver : s'il ouvre la fenêtre et n'y trouve rien d'utile, il
// la referme et ne la rouvre jamais. Une fonction qu'on n'utilise qu'une fois
// n'existe pas.
//
// Le geste lui-même — la carte qui se pose à côté de la question plutôt qu'en
// travers — se vérifie au navigateur, pas ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    indicesProposes, preparerIndice, raccourcir, UNIVERSELS, LONGUEUR_MAX
} from '../js/core/indice.js';
import { getSkill } from '../js/data/skills.js';

// ────────────────────────────────────────────── CE QU'ON PROPOSE ────────────

test('ON PROPOSE TOUJOURS QUELQUE CHOSE, MÊME SANS COMPÉTENCE CONNUE', () => {
    // Un jeu sans compétence déclarée, un exercice retiré du catalogue : la
    // fenêtre doit quand même servir à quelque chose, sinon le professeur la
    // referme et n'y revient plus.
    const sans = indicesProposes(null);
    assert.ok(sans.length >= 3, 'au moins les trois coups de pouce universels');
    assert.ok(sans.every(i => i.source === 'universel'));
});

test('la leçon de la compétence passe AVANT les coups de pouce universels', () => {
    // « Relis l'énoncé » est utile ; « le premier chiffre après la virgule dit
    // le dixième » l'est infiniment plus quand c'est exactement là que ça
    // coince. L'ordre est donc une décision, pas un hasard de tri.
    const p = indicesProposes(getSkill('num.dec.encadrer'));
    assert.equal(p[0].source, 'lecon');
    assert.ok(p.some(i => i.source === 'universel'), 'les universels restent proposés');
});

test('UN INDICE SE LIT D\'UN COUP D\'ŒIL, PAR-DESSUS UNE QUESTION', () => {
    // Les leçons font dix lignes. Posée entière sur une question, une leçon
    // recouvre le travail — et ne se lit pas. Toutes les propositions sont donc
    // bornées, y compris celles qui sortent d'un texte long.
    for (const id of ['num.dec.encadrer', 'num.logique.enquete']) {
        for (const i of indicesProposes(getSkill(id))) {
            assert.ok(i.texte.length <= LONGUEUR_MAX,
                `« ${i.texte.slice(0, 40)}… » fait ${i.texte.length} signes`);
        }
    }
});

test('on ne propose pas deux fois la même chose', () => {
    // Une leçon qui répéterait une phrase, ou un universel déjà dit par la
    // leçon : deux lignes identiques dans une liste de cinq, et le professeur
    // croit s'être trompé de fenêtre.
    const p = indicesProposes(getSkill('num.dec.encadrer'));
    const vus = new Set(p.map(i => i.texte.toLowerCase()));
    assert.equal(vus.size, p.length);
});

test('un fragment trop court n\'est pas une proposition', () => {
    // « Or. », « Attention. » : une phrase de quatre signes découpée d'une
    // leçon ne dit rien, et elle prend une ligne de la fenêtre.
    const p = indicesProposes({ lesson: 'Oui. Non. Voici une vraie phrase qui aide vraiment l\'élève.' });
    assert.ok(p.filter(i => i.source === 'lecon').every(i => i.texte.length >= 12));
});

// ───────────────────────────────────────────────── LA COUPE ─────────────────

test('on coupe sur un mot, jamais au milieu', () => {
    const t = raccourcir('abcdefgh ijklmnop qrstuvwx yzabcdef', 20);
    assert.ok(t.endsWith('…'));
    assert.ok(!/[a-z]…$/.test(t) || t.includes(' '), t);
    assert.ok(t.length <= 21, t);
});

test('un texte court n\'est pas touché', () => {
    assert.equal(raccourcir('Regarde la retenue.'), 'Regarde la retenue.');
});

test('les espaces multiples et les retours à la ligne se normalisent', () => {
    assert.equal(raccourcir('Regarde\n\n  la   retenue.'), 'Regarde la retenue.');
});

// ──────────────────────────────────────────── CE QU'ON ENVOIE ───────────────

test('UN INDICE VIDE NE PART PAS', () => {
    // Le professeur croirait avoir aidé, et l'élève attendrait.
    assert.equal(preparerIndice('').ok, false);
    assert.equal(preparerIndice('   \n  ').ok, false);
    assert.equal(preparerIndice(null).pourquoi, 'vide');
});

test('ON BORNE AVANT D\'ENVOYER, ET NON À L\'AFFICHAGE', () => {
    // Un texte tronqué seulement à l'écran part quand même en entier sur le
    // réseau, dort en base, et réapparaît entier le jour où on le relit
    // ailleurs — dans la liste des mots du professeur, par exemple.
    const r = preparerIndice('a'.repeat(900));
    assert.equal(r.ok, true);
    assert.ok(r.texte.length <= 301, r.texte.length);
});

test('les trois coups de pouce universels ne donnent aucune réponse', () => {
    // C'est la règle de fond : aider n'est pas dépanner. Un élève à qui l'on
    // donne le résultat a fini sa question et n'a rien appris.
    for (const u of UNIVERSELS) {
        assert.ok(!/=\s*\d/.test(u), `« ${u} » a l'air de donner un résultat`);
        assert.ok(u.length <= LONGUEUR_MAX);
    }
});

// ── L'INDICE S'OUVRE EN CARTE, PAS SOUS LES BOUTONS ─────────────────────────
//
// RÉMY, capture du pas à pas à l'appui : « quand l'indice apparaît en dessous,
// on ne voit plus le haut. Je pense que l'indice ne doit apparaître que dans
// la modale en popup. »
//
// La mesure était dans sa capture : l'indice poussait la colonne, et le champ
// de saisie comme les premières touches sortaient par le haut — au moment
// précis où l'élève vient de demander de l'aide pour écrire. Une aide qui
// cache ce qu'elle explique ne s'explique pas elle-même.
//
// « Montre-moi », lui, passait DÉJÀ par la carte : les deux boutons voisins se
// comportaient différemment sans que rien ne le dise.

test('LE BOUTON « UN INDICE » PASSE PAR LA CARTE, COMME « MONTRE-MOI »', () => {
    const src = readFileSync(new URL('../js/core/activities/choice.js', import.meta.url), 'utf8');
    const i = src.indexOf('export function wireHint');
    assert.ok(i > 0, 'wireHint a disparu');
    const bloc = src.slice(i, src.indexOf('\nexport function wireShowMe', i));
    assert.match(bloc, /game_feedback/,
        'l\'indice ne passe plus par la carte : il retombe sous les boutons');
    assert.match(bloc, /kind: 'hint'/, 'la carte ne sait plus que c\'est un indice');
    // LE DESSIN SUIT L'INDICE. Rémy : « pourquoi ne pas avoir un petit
    // schéma ? c'est souvent plus parlant ».
    assert.match(bloc, /schema: session\.schemaIndice/,
        'le dessin de l\'indice ne monte plus dans la carte');
    // ET SI PERSONNE NE L'AFFICHE, ON NE LE PERD PAS : l'aperçu des réglages
    // et les bancs ne montent pas la carte, et le contrat de `game_feedback`
    // le dit par `handled`.
    assert.match(bloc, /if \(!detail\.handled\)/,
        'sans carte montée, l\'indice serait perdu sans un mot');
});

test('LA CARTE SAIT AFFICHER UN INDICE ET SON DESSIN', () => {
    // L'autre bout du contrat : ce que `wireHint` envoie, la carte doit
    // savoir le rendre.
    const src = readFileSync(new URL('../js/ui/gameFeedbackUI.js', import.meta.url), 'utf8');
    assert.match(src, /d\.kind === 'hint'/, 'la carte ne reconnaît plus un indice');
    assert.match(src, /d\.schema \?/, 'la carte ne rend plus le dessin d\'un indice');
});
