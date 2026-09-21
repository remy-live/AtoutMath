// L'APERÇU DE LA FICHE DOIT SE LAISSER CLIQUER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois fois, et la dernière avec deux captures : « sur le 9, 10, 11 les
// paramètres ne sont toujours pas accessibles. Depuis tout le temps ! »
//
// CE QUI SE PASSAIT. Chaque page de l'aperçu porte un `<svg>` en
// `position:absolute` qui couvre toute sa surface et déborde
// (`overflow:visible`) : c'est la couche où se peignent la droite graduée, le
// repère, les figures. Un SVG n'attrape le clic que là où il a DESSINÉ quelque
// chose — d'où un défaut qui ne frappait que les exercices à DESSIN, et
// seulement là où leur tracé passait au-dessus du bandeau. L'engrenage était
// là, visible, et le clic tombait sur le trait d'une droite numérique.
//
// MESURÉ sur une fiche de neuf exercices, en amenant chaque élément sous les
// yeux puis en demandant qui reçoit le clic (`tools/tmp/sondeSvg.mjs`) :
//
//                                        avant   après
//   éléments cliquables inatteignables   13/80    0/80
//     · engrenages                           2
//     · flèches ▲▼                           4
//     · textes à récrire                     7
//
// POURQUOI JE NE L'AVAIS PAS VU — et c'est la leçon de la journée. Mes trois
// sondes précédentes cliquaient en JavaScript (`el.click()`), ce qui traverse
// tout ce qui recouvre. Un professeur, lui, clique avec une souris. J'ai ainsi
// « corrigé » deux fois un placement qui n'était pas son problème, et conclu
// deux fois que tout allait bien. UNE MESURE QUI N'EMPRUNTE PAS LE CHEMIN DE
// L'UTILISATEUR NE MESURE PAS SON PROBLÈME.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const UI = lire('css/ui.css');

test('LA COUCHE DE DESSIN NE PREND PAS LES CLICS', () => {
    assert.match(UI, /\.fq-page > svg \{ pointer-events: none; \}/);
});

test('TOUTES LES COUCHES DE DESSIN SONT BIEN VISÉES PAR LA RÈGLE', () => {
    // La règle vise `.fq-page > svg` : elle ne vaut que si ces couches sont
    // des ENFANTS DIRECTS de la page. Elles le sont parce qu'elles sont écrites
    // à la racine du HTML d'une page — sept modules de fiches le font, avec le
    // même gabarit. Si l'un d'eux se mettait à l'imbriquer, la règle cesserait
    // de l'atteindre sans que rien ne le dise.
    const dossier = new URL('../js/ui/fiches/', import.meta.url);
    // Le gabarit, sans exiger ce qui le suit : cinq des dix-sept portent un
    // attribut de plus, et ma première version n'en comptait que cinq.
    const motif = /<svg[^>]*position:absolute; left:0; top:0; width:100%; height:100%/g;
    let couches = 0;
    const modules = [];
    for (const f of readdirSync(dossier).filter(x => x.endsWith('.js'))) {
        const src = readFileSync(new URL(f, dossier), 'utf8');
        const n = (src.match(motif) || []).length;
        if (n) { couches += n; modules.push(f); }
    }
    assert.ok(couches >= 17, `${couches} couches de dessin trouvées`);
    assert.ok(modules.length >= 7, modules.join(', '));
});

test('RIEN D\'INTERACTIF NE VIT DANS UNE COUCHE DE DESSIN', () => {
    // C'est ce qui rend la correction sans danger, et il faut que ça le reste :
    // le jour où l'on mettrait un bouton DANS le dessin, `pointer-events: none`
    // le rendrait mort. Mesuré au navigateur sur les 48 couches d'une fiche :
    // 0 retouche, 0 bouton, 0 écouteur. Ici on garde la règle qui l'impose —
    // les gestes de l'aperçu se posent sur du HTML, jamais dans le SVG.
    const dossier = new URL('../js/ui/fiches/', import.meta.url);
    const coupables = [];
    for (const f of readdirSync(dossier).filter(x => x.endsWith('.js'))) {
        const src = readFileSync(new URL(f, dossier), 'utf8');
        // Un `data-retouche` ou un `data-reglage` écrit entre les balises d'un
        // SVG : on cherche grossièrement, et un faux positif vaut mieux qu'un
        // bouton mort.
        for (const bloc of src.split('<svg').slice(1)) {
            const dedans = bloc.split('</svg>')[0];
            if (/data-retouche|data-reglage|<button/.test(dedans)) coupables.push(f);
        }
    }
    assert.deepEqual([...new Set(coupables)], [],
        'un élément cliquable a été posé dans une couche de dessin — elle ne '
        + 'prend plus les clics, il serait mort');
});

test('LE BANDEAU NE PROMET QUE CE QUE L\'APERÇU TIENT', () => {
    // « Clique un titre, une consigne ou un calcul pour le récrire,
    //   l'engrenage ⚙ d'un exercice pour ses réglages, ses flèches ▲▼ pour le
    //   déplacer. »
    // Les trois gestes de cette phrase sont exactement les trois que le voile
    // empêchait. Une phrase d'interface qui ment est pire qu'une absence.
    const pp = lire('js/ui/printParcours.js');
    assert.match(pp, /Clique un titre, une consigne ou un calcul pour le récrire/);
    // Les apostrophes sont échappées dans la source : on cherche le texte tel
    // qu'il est ÉCRIT, pas tel qu'il s'affiche.
    assert.match(pp, /l\\'engrenage ⚙ d\\'un exercice/);
    assert.match(pp, /ses flèches ▲▼ pour le déplacer/);
});
