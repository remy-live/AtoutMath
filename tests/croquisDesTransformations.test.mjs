// LES EXPLICATIONS DES TRANSFORMATIONS SONT VISUELLES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant l'espace d'un de ses élèves de 4e :
//
//   « c'est pas clair pour les transformations […] Et tracer l'image par quart
//     de tour ce n'est pas clair. Il faut que tant que faire se peut que ce
//     soit visuel pour les explications. »
//
// MESURÉ AVANT (tools/leconsVisuelles.mjs) : les trois leçons de
// transformations de son plan de révision faisaient 254 mots, 22 lignes, et
// ZÉRO figure. Un quart de tour expliqué en mots reste un quart de tour
// expliqué en mots.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI LA TROISIÈME EST LA PLUS UTILE ──
//
// La première garde qu'il y a une figure — la demande, mot pour mot.
//
// La deuxième garde que l'image n'est pas ÉCRITE À LA MAIN dans `data/skills.js`
// mais CALCULÉE par le code qui corrige l'exercice. Des coordonnées recopiées
// finiraient par contredire la correction, et c'est la leçon qui aurait l'air
// d'avoir raison.
//
// LA TROISIÈME GARDE QUE LA LÉGENDE NE MENT PAS SUR LE DESSIN. « La case
// marquée est à 3 carreaux à gauche de O et 2 au-dessus » est une phrase qu'un
// élève VÉRIFIE en comptant les carreaux. Si elle disait 3 et 4, il compterait,
// trouverait autre chose, et conclurait que c'est lui qui se trompe. Une
// explication fausse est pire que pas d'explication : elle fait douter l'élève
// de son propre comptage. On recalcule donc les nombres depuis la géométrie et
// l'on exige de les retrouver dans la phrase.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';
import { getSkill } from '../js/data/skills.js';
import { leconHtml } from '../js/ui/leconHtml.js';
import { appliquer, imageFigure } from '../js/core/transformations.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const compter = (t, motif) => (String(t).match(motif) || []).length;

/** Les quatre du collège, celles que Rémy nomme. */
const QUATRE = ['geo.transfo.axiale', 'geo.transfo.centrale',
    'geo.transfo.translation', 'geo.transfo.rotation'];

test('LES QUATRE TRANSFORMATIONS ONT UN CROQUIS, ET IL SE DESSINE', () => {
    for (const id of QUATRE) {
        const def = getSkill(id);
        assert.ok(def, `${id} a disparu du catalogue des compétences`);
        assert.ok(def.croquis, `${id} n'a pas de croquis : son explication est muette`);
        const html = leconHtml(def);
        assert.ok(html.includes('lc-croquis'), `${id} : le croquis ne sort pas du gabarit`);
        assert.ok(html.includes('<svg'), `${id} : pas de dessin`);
        // LA FIGURE DE DÉPART **ET** SON IMAGE. Rémy : « il faut montrer la
        // figure de base et la solutions. » Un croquis qui ne montrerait que
        // l'arrivée ne dirait pas d'où l'on part.
        assert.ok(compter(html, /qd-depart/g) >= 1, `${id} : pas de figure de départ`);
        assert.ok(compter(html, /qd-attendue/g) >= 1, `${id} : pas d'image`);
        // LA CASE REPÈRE, DES DEUX CÔTÉS : c'est elle que la légende compte.
        assert.equal(compter(html, /lc-repere/g), 2,
            `${id} : la case repère doit être marquée au départ ET à l'arrivée`);
        // ET LA LÉGENDE EST ÉCRITE : un dessin sans phrase laisse deviner la
        // règle, ce qui est exactement ce qu'on reprochait au texte seul.
        assert.ok(html.includes('lc-croquis-dit'), `${id} : croquis sans légende`);
    }
});

test('L\'IMAGE N\'EST PAS ÉCRITE À LA MAIN, ELLE EST CALCULÉE', () => {
    // LE DANGER EST FIN : des coordonnées recopiées dans `data/skills.js`
    // seraient justes le jour où on les écrit. Elles ne le resteraient pas.
    for (const id of QUATRE) {
        const c = getSkill(id).croquis;
        assert.equal(c.image, undefined,
            `${id} : l'image doit se calculer, pas se recopier`);
        assert.ok(Array.isArray(c.depart) && c.depart.length >= 3, `${id} : départ trop maigre`);
        assert.ok(c.transfo && c.transfo.genre, `${id} : pas de transformation déclarée`);
    }
    // ET C'EST BIEN `imageFigure` QUI LA DONNE — le code qui corrige.
    const L = sansCommentaires(lire('js/ui/leconHtml.js'));
    assert.match(L, /const image = imageFigure\(depart, c\.transfo\);/);
    assert.match(L, /import \{ imageFigure, appliquer \} from '\.\.\/core\/transformations\.js';/);
    // ET LE DESSIN PASSE PAR `quadrillageSvg`, seul endroit qui sache où tombe
    // un axe — le demi-carreau. Redessiner à la main ici ferait passer l'axe
    // de la leçon à côté de celui de l'exercice.
    assert.match(L, /import \{ quadrillageSvg \} from '\.\.\/core\/quadrillageSvg\.js';/);
});

test('ET LA LÉGENDE NE MENT PAS SUR LE DESSIN', () => {
    // ON RECALCULE LES NOMBRES DEPUIS LA GÉOMÉTRIE, puis on exige de les
    // retrouver dans la phrase — avec leur direction.
    const dit = (p, o) => [
        { n: Math.abs(p.x - o.x), mot: p.x < o.x ? 'à gauche' : 'à droite' },
        { n: Math.abs(p.y - o.y), mot: p.y < o.y ? 'au-dessus' : 'au-dessous' }
    ];
    // « 3 carreaux à gauche », « 3 à gauche » : la phrase est écrite pour un
    // élève, pas pour une épreuve. On accepte le mot « carreaux » au milieu.
    const yEst = (texte, { n, mot }) =>
        new RegExp(`${n}\\s+(carreaux?\\s+)?${mot}`).test(texte);

    for (const id of ['geo.transfo.centrale', 'geo.transfo.rotation']) {
        const c = getSkill(id).croquis;
        const O = c.transfo.centre;
        const R = { x: c.repere[0], y: c.repere[1] };
        const image = appliquer(R, c.transfo);
        for (const d of [...dit(R, O), ...dit(image, O)]) {
            assert.ok(yEst(c.legende, d),
                `${id} : la légende ne dit pas « ${d.n} ${d.mot} » — « ${c.legende} »`);
        }
    }

    // LA SYMÉTRIE AXIALE SE COMPTE DEPUIS L'AXE, et les deux distances sont
    // égales : c'est toute la règle, et c'est ce que la légende annonce.
    const ax = getSkill('geo.transfo.axiale').croquis;
    const R = { x: ax.repere[0], y: ax.repere[1] };
    const img = appliquer(R, ax.transfo);
    assert.equal(ax.transfo.axe.type, 'v', 'le croquis de l\'axe est écrit pour un axe vertical');
    const d1 = Math.abs(R.x - ax.transfo.axe.a);
    assert.equal(d1, Math.abs(img.x - ax.transfo.axe.a), 'le symétrique n\'est pas à la même distance');
    assert.match(ax.legende, new RegExp(`${d1}\\s+carreaux`),
        `la légende de l'axe ne dit pas « ${d1} carreaux » — « ${ax.legende} »`);
    // ET LA MÊME LIGNE : un axe vertical ne change rien aux lignes, la légende
    // le dit, et le calcul doit le confirmer.
    assert.equal(R.y, img.y);

    // LA TRANSLATION DIT SON VECTEUR, et c'est le même pour toutes les cases.
    const tr = getSkill('geo.transfo.translation').croquis;
    const v = tr.transfo.vecteur;
    assert.ok(yEst(tr.legende, { n: Math.abs(v.x), mot: v.x < 0 ? 'à gauche' : 'à droite' }),
        `la légende de la translation ne dit pas son déplacement — « ${tr.legende} »`);
    assert.match(tr.legende, new RegExp(`${Math.abs(v.y)}\\s+vers le ${v.y < 0 ? 'haut' : 'bas'}`));
});

test('LE CROQUIS TIENT DANS SA GRILLE', () => {
    // UNE CASE HORS DE LA GRILLE NE SE DESSINE PAS : `quadrillageSvg` la pose
    // quand même, et elle se peint PAR-DESSUS les graduations, ou nulle part.
    // Un croquis amputé de la moitié de son image explique le contraire de ce
    // qu'il prétend.
    for (const id of QUATRE) {
        const c = getSkill(id).croquis;
        const depart = c.depart.map(([x, y]) => ({ x, y }));
        const dedans = (p) => p.x >= 0 && p.y >= 0 && p.x < c.largeur && p.y < c.hauteur;
        for (const p of [...depart, ...imageFigure(depart, c.transfo)]) {
            assert.ok(dedans(p), `${id} : la case (${p.x} ; ${p.y}) sort de la grille `
                + `${c.largeur} × ${c.hauteur}`);
        }
        // ET LE REPÈRE EST UNE CASE DE LA FIGURE, pas une case voisine : la
        // légende parlerait d'un carré que l'élève ne verrait pas bouger.
        assert.ok(depart.some(p => p.x === c.repere[0] && p.y === c.repere[1]),
            `${id} : la case repère n'appartient pas à la figure de départ`);
    }
});

test('LE DESSIN GARDE SA TAILLE DE CROQUIS', () => {
    // MESURÉ : `.qd-svg { width: 100% }` — juste là où le quadrillage EST
    // l'exercice — étirait le croquis sur les 667 px de la carte, qui passait
    // de 165 px de haut à 745. Une leçon de trois paragraphes devenait une
    // page, et la figure qu'on venait d'ajouter rendait la leçon illisible.
    const UI = lireFeuille('css/modules.css');
    const nu = corpsDeLaRegle(UI, '.qd-svg', { ou: 'css/modules.css' });
    assert.ok(/width:\s*100%/.test(nu),
        'si `.qd-svg` cessait de s\'étirer, cette épreuve ne garderait plus rien');
    const borne = corpsDeLaRegle(UI, '.lc-croquis .qd-svg', { ou: 'css/modules.css' });
    const l = valeurDe(borne, 'width');
    assert.ok(l, 'le croquis n\'a plus de largeur à lui : il reprendra les 100 %');
    // DEUX TERMES, ET IL EN FAUT DEUX : la taille naturelle du dessin, et ce
    // que la carte permet. Une largeur en dur déborderait sur un téléphone de
    // 390 px, où la carte fait 359.
    const m = /min\(100%,\s*(\d+)px\)/.exec(l);
    assert.ok(m, `la largeur « ${l} » ne borne pas le croquis des deux côtés`);
    assert.ok(Number(m[1]) <= 260, 'un croquis plus large que cela n\'est plus un croquis');
});

test('LA LEÇON ARRIVE ENTIÈRE JUSQU\'À L\'AFFICHAGE', () => {
    // LE CHEMIN EST LONG : la compétence → `leconsDe` → `leconHtml`. L'ancien
    // `leconsDe` réduisait à la PHRASE, ce qui jetait le croquis avant même
    // l'affichage — le dessin existait et personne ne le voyait.
    const A = sansCommentaires(lire('js/core/aideExercice.js'));
    assert.match(A, /const texte = String\(\(l && l\.lesson !== undefined \? l\.lesson : l\) \|\| ''\)\.trim\(\);/);
    assert.match(A, /gardees\.push\(l && l\.lesson !== undefined \? l : texte\);/);
    const U = sansCommentaires(lire('js/ui/aideExercice.js'));
    assert.match(U, /leconsDe\(skillsOf\(exo\)\.map\(id => getSkill\(id\)\)\.filter\(Boolean\)\)/);
    // LE MENEUR AUSSI — c'est l'écran d'entrée en mode apprentissage.
    const R = sansCommentaires(lire('js/core/runner.js'));
    assert.match(R, /lecons\.push\(def\);/);
    // ET LES DEUX CARTES DU PROFIL, celles de la capture de Rémy.
    const P = sansCommentaires(lire('js/ui/profileUI.js'));
    assert.equal(compter(P, /leconHtml\(def\)/g), 2,
        'les deux cartes du profil doivent passer la compétence, pas sa phrase');
    assert.ok(!/leconHtml\(def\.lesson\)/.test(P));
});

test('ET UNE LEÇON SANS CROQUIS RESTE UNE LEÇON', () => {
    // Deux cent quarante compétences n'ont pas de croquis et n'en auront
    // jamais : « additionner des relatifs » ne se dessine pas sur un
    // quadrillage. Le gabarit doit les rendre comme avant.
    const texte = getSkill('geo.transfo.rotation').lesson;
    const sansFigure = leconHtml(texte);
    assert.ok(sansFigure.includes('<div class="lc">'));
    assert.ok(!sansFigure.includes('lc-croquis'), 'un texte seul ne fabrique pas de figure');
    assert.ok(sansFigure.includes('BASCULER'), 'et le texte est toujours là');
    assert.equal(leconHtml(''), '');
    assert.equal(leconHtml({ lesson: '' }), '');
});
