// CLIQUER SUR UNE CASE, PUIS SUR SA VOISINE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le tasuko, la selection n'est pas terrible je trouve ».
//
// MESURÉ AVANT DE TOUCHER À QUOI QUE CE SOIT (`tools/tmp/sonde-tasuko2.mjs`),
// parce que « pas terrible » pouvait vouloir dire bien des choses :
//
//   au départ          rien de choisi, la consigne s'affiche
//   après UN clic      rien de choisi, et la consigne a DISPARU
//   après DEUX clics   rien de choisi
//   après un GLISSÉ    « 4 + 3 = 7 ✓ », une capsule posée
//
// ON NE POUVAIT PAS JOUER EN CLIQUANT. Seul le glissé marchait, et c'est
// celui-là qu'il a dû trouver tout seul. « Pas terrible » était un euphémisme
// de professeur.
//
// ── LA CAUSE TENAIT DANS UN `!==` ──────────────────────────────────────────
//
// `relierAuGlisse` annonce la case sous l'appui, puis celle sous le
// relâchement SI ELLE DIFFÈRE. Seulement `toucher` REDESSINE la grille — c'est
// ainsi que la case choisie s'allume —, et `innerHTML` remplace TOUS les
// nœuds. Au relâchement, l'élément sous le pointeur désigne la même case mais
// n'est plus le même OBJET : la comparaison le prenait pour une voisine,
// rappelait `toucher`, et le second appel défaisait le premier.
//
// ── POURQUOI CETTE ÉPREUVE-LÀ, ET SOUS CETTE FORME ─────────────────────────
//
// Le défaut ne se voit QUE si le `toucher` redessine. Une épreuve qui ferait
// semblant de toucher sans remplacer les nœuds resterait verte sur le défaut
// exact qu'elle doit garder — c'est le piège de ce dépôt, payé deux fois dans
// la même journée. Le faux document ci-dessous REMPLACE donc ses cases à
// chaque touche, comme la vraie grille.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

/**
 * UNE GRILLE DE PAPIER QUI SE REDESSINE, et le minimum de navigateur autour.
 *
 * `relierAuGlisse` ne demande que trois choses : de quoi s'abonner, de quoi
 * savoir ce qu'il y a sous le pointeur, et des cases qui portent un `data-c`.
 * On les lui donne, et rien d'autre.
 */
function fausseGrille(largeur = 4) {
    const ecouteurs = {};
    let cases = [];
    const refaire = () => {
        // DES NŒUDS NEUFS À CHAQUE FOIS — c'est tout l'objet de l'épreuve.
        cases = Array.from({ length: largeur * largeur }, (_, c) => {
            const el = { dataset: { c: String(c) } };
            el.closest = () => el;
            return el;
        });
    };
    refaire();
    const racine = {
        addEventListener: (type, fn) => { ecouteurs[type] = fn; },
        removeEventListener: () => {}
    };
    const avaitWindow = globalThis.window;
    const avaitDocument = globalThis.document;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { elementFromPoint: (x) => cases[x] || null };
    return {
        racine, refaire,
        appuyer: (c) => ecouteurs.pointerdown({ clientX: c, clientY: 0,
            pointerType: 'mouse', button: 0, preventDefault: () => {} }),
        // `fin` est posé sur `window` par le module ; on le rappelle par la
        // même porte que le navigateur.
        relacher: null,
        rendre: () => {
            if (avaitWindow === undefined) delete globalThis.window;
            else globalThis.window = avaitWindow;
            if (avaitDocument === undefined) delete globalThis.document;
            else globalThis.document = avaitDocument;
        }
    };
}

test('UN CLIC FRANC CHOISIT UNE CASE — ET NE LA DÉCHOISIT PAS', async () => {
    // LE DÉFAUT DE RÉMY, DANS SA FORME EXACTE : un seul contact doit donner
    // UNE SEULE annonce. Deux, et la seconde défait la première.
    const faux = fausseGrille();
    // On attrape le `fin` que le module pose sur `window`.
    let fin = null;
    globalThis.window.addEventListener = (type, f) => { if (type === 'pointerup') fin = f; };
    const { relierAuGlisse } = await import('../js/core/activities/glisser.js');
    const vues = [];
    relierAuGlisse(faux.racine, {
        selecteur: '.case',
        toucher: (el) => { vues.push(el.dataset.c); faux.refaire(); }
    });
    faux.appuyer(5);
    fin({ clientX: 5, clientY: 0 });
    faux.rendre();
    assert.deepEqual(vues, ['5'],
        `un clic franc a annoncé ${vues.length} case(s) — [${vues.join(', ')}] : `
        + 'la seconde annonce défait la première, et rien ne reste choisi');
});

test('ET UN GLISSÉ EN ANNONCE DEUX — c\'est lui qui ferme la paire', async () => {
    // L'AUTRE MOITIÉ, et elle compte autant : une épreuve qui ne garderait
    // que la première ferait passer « n'annoncer jamais rien » pour une
    // correction.
    const faux = fausseGrille();
    let fin = null;
    globalThis.window.addEventListener = (type, f) => { if (type === 'pointerup') fin = f; };
    const { relierAuGlisse } = await import('../js/core/activities/glisser.js');
    const vues = [];
    relierAuGlisse(faux.racine, {
        selecteur: '.case',
        toucher: (el) => { vues.push(el.dataset.c); faux.refaire(); }
    });
    faux.appuyer(5);
    fin({ clientX: 6, clientY: 0 });
    faux.rendre();
    assert.deepEqual(vues, ['5', '6'],
        `un glissé a annoncé [${vues.join(', ')}] au lieu de la case d'appui `
        + 'puis celle de relâchement');
});

// UNE ÉPREUVE QUE J'AI ÉCRITE, PUIS RETIRÉE — et la note vaut mieux qu'elle.
//
// J'en avais écrit une troisième : « la case numéro 0 n'est pas une case
// qu'on oublie », en remplaçant `presse === null` par `!presse` pour la voir
// tomber. ELLE EST RESTÉE VERTE. `epreuveTombe` avait raison et moi non : la
// clé est une CHAÎNE, et « 0 » n'est pas faux. Le défaut que je venais de
// déduire en lisant le code n'existait pas.
//
// Une épreuve verte qui ne garde rien donne une assurance qui n'existe pas.
// Elle est donc partie, et la raison du `=== null` est écrite dans la source,
// là où elle se prend.

test('LA CASE CHOISIE SE VOIT DE LOIN', () => {
    // « la selection n'est pas terrible ». Elle ne se distinguait que par un
    // fond violet à 18 % sur blanc — rgb(229, 226, 253), MESURÉ à 1,26 de
    // contraste —, et sa bordure ne changeait pas du tout. Sur un
    // vidéoprojecteur, cela ne se voit pas.
    //
    // ON GARDE LA MESURE DU CADRE, ET NON CELLE DU FOND : un fond peut se
    // teinter sans jamais se voir (c'est ce qui s'est passé), alors qu'un
    // cadre de trois pixels qui tranche sur le blanc se voit du fond de la
    // salle. Le seuil est celui d'un texte ordinaire, 4,5 : au-dessous, on
    // n'aurait fait que déplacer le défaut.
    const JEU = lireFeuille(new URL('../js/games/tasuko.js', import.meta.url));
    const c = corpsDeLaRegle(JEU, '.tk-case--depart', { ou: 'tasuko.js' });
    assert.ok(declare(c, 'box-shadow'),
        'la case choisie n\'a plus de cadre : il ne reste qu\'un fond pâle');
    const ombre = valeurDe(c, 'box-shadow');
    const m = /#([0-9a-f]{6})/i.exec(ombre);
    assert.ok(m, `le cadre « ${ombre} » ne nomme pas sa couleur en clair`);
    const [r, v, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const canal = (x) => { const u = x / 255;
        return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
    const lum = 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
    const contraste = 1.05 / (lum + 0.05);
    assert.ok(contraste >= 4.5,
        `le cadre de la case choisie contraste à ${contraste.toFixed(2)} sur le `
        + 'blanc de la grille : on ne le verra pas au tableau');
    // ET IL EST POSÉ À L'INTÉRIEUR : un cadre qui pousse décalerait toute la
    // grille à chaque case touchée, ce qui se voit bien plus que la case.
    assert.match(ombre, /inset/,
        'le cadre déborde de la case : la grille bougera quand on choisit');
});
