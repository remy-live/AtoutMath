// UN NOM DE POINT BARRÉ PAR UN TRAIT NE NOMME PLUS RIEN.
//
// Rémy, capture d'iPhone sur « Le point est-il dessus ? » : « ce serait bien
// que le libellé des points ne soient pas coupé ».
//
// CE N'ÉTAIT PAS LE BORD. Première mesure, 28 figures : zéro nom hors du
// viewBox — la pince `dansLeCadre` fait son travail. Ce qui coupait la lettre
// était un TRAIT qui lui passait dessus, et sur sa capture c'est le « H », posé
// au croisement de la droite et de la verticale.
//
// TROIS DÉFAUTS, ET LE PREMIER EXPLIQUE TOUT LE RESTE :
//
//   · `placerNoms` recevait les segments ENTRE LES DEUX POINTS NOMMÉS, alors
//     que la droite est dessinée 34,5 px plus loin de chaque côté — c'est même
//     tout le sens de la figure, « un trait qui s'arrête pile sur le dernier
//     point se lit comme un segment ». Un nom posé au-delà d'un bout était donc
//     noté LOIN de la droite, et la droite lui passait dessus ;
//   · la note se prenait sur le CENTRE de l'étiquette. Un centre à 15 px d'un
//     trait laisse la lettre à sept, c'est-à-dire dessus ;
//   · la pince qui ramène l'étiquette dans le cadre s'appliquait APRÈS le
//     choix : pour un point au bord, elle déplaçait le nom élu, et pouvait le
//     reposer exactement sur le trait qu'on venait de fuir.
//
// MESURÉ, sur 28 figures et 196 noms, distance de la BOÎTE de la lettre aux
// traits dessinés :
//
//     avant .................................. 56 noms touchés
//     segments dessinés + boîte + pince avant . 31
//     vingt-quatre places au lieu de huit .....  6
//
// LES SIX QUI RESTENT SONT DES POINTS DE CROISEMENT, où aucune place n'est
// vraiment libre : les déplacer encore ne ferait que porter le problème sur un
// autre point. Le halo finit le travail — la lettre est tracée par-dessus un
// contour couleur du fond, donc le trait s'interrompt derrière elle. C'est ce
// que fait tout logiciel de géométrie.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// POUR MESURER SUR LES FIGURES, ET NON SUR LA SOURCE — voir plus bas.
import { planDeLaScene, planFigureCodee } from '../js/core/pointsDroitesSvg.js';
import { elementsGeometrieGenerator } from '../js/core/generators/elementsGeometrie.js';
import { makeRng } from '../js/core/ids.js';

const SVG = readFileSync(new URL('../js/core/pointsDroitesSvg.js', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

test('ON ÉVITE LE TRAIT QU\'ON DESSINE, DÉPASSEMENT COMPRIS', () => {
    assert.match(SVG, /function traitDessine\(A, B\)/,
        'les bouts réellement dessinés doivent se calculer une fois pour toutes');
    assert.match(SVG, /return traitDessine\(P\[a\], P\[b\]\);/,
        'et c\'est CE segment-là qu\'on donne au placeur de noms');
    // Le défaut d'origine, nommément : les deux points nus.
    assert.doesNotMatch(SVG, /const noms = placerNoms\(P, sc\.droites\.map\(d => \{[^}]*return \[P\[a\], P\[b\]\];/,
        'les segments entre points nus ramènent le défaut : la droite les dépasse');
});

test('LA NOTE SE PREND SUR LA LETTRE, ET SUR LA PLACE QU\'ON PRENDRA', () => {
    assert.match(SVG, /const DEMI = 9;/,
        'la lettre a une taille : c\'est elle qu\'un trait traverse, pas son ancre');
    assert.match(SVG, /distSeg\(q, s\)\)\) - DEMI/,
        'la distance aux traits se compte depuis le bord de la lettre');
    // LA PINCE AVANT LE CHOIX, ET NON APRÈS.
    assert.match(SVG, /const q = dansLeCadre\(\{ x: c\.x \+ dir\.x \* RAYON/,
        'on note la place qu\'on va vraiment prendre, pas celle qu\'on visait');
    assert.doesNotMatch(SVG, /const place = dansLeCadre\(meilleur\);/,
        'ramener l\'étiquette APRÈS le choix peut la reposer sur le trait évité');
});

test('VINGT-QUATRE PLACES, PAS HUIT — mesuré sur les figures, plus sur le code', () => {
    // CETTE ÉPREUVE LISAIT LA SOURCE, et elle est tombée le jour où l'on a
    // réécrit la boucle sans rien changer à ce qu'elle fait — les trois
    // distances étaient devenues un `map`, les douze directions un
    // `Array.from`. C'est la friction du journal, mot pour mot : « une garde
    // qui lit la source trouve son propre commentaire ».
    //
    // Elle regarde donc maintenant LE RÉSULTAT, qui est la seule chose dont
    // Rémy se plaignait : « ce serait bien que le libellé des points ne soient
    // pas coupé ».
    const DEMI = 9;
    const distSeg = (p, a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy)
            / ((dx * dx + dy * dy) || 1)));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    };

    let noms = 0, touches = 0;
    const ecarts = new Set();
    for (let i = 0; i < 60; i++) {
        const it = elementsGeometrieGenerator.generate(
            { notion: ['appartenance', 'codage', 'milieu'][i % 3] },
            { rng: makeRng('places' + i), index: i, total: 60, themesExclus: [] });
        const m = it.meta || {};
        const plan = m.scene ? planDeLaScene(m.scene)
            : m.figure ? planFigureCodee(m.figure) : null;
        if (!plan) continue;
        // LES TRAITS RÉELLEMENT DESSINÉS, dépassement compris : c'est tout le
        // sujet de la première épreuve de ce fichier.
        const segs = plan.traits
            ? plan.traits.map(t => [{ x: t.x1, y: t.y1 }, { x: t.x2, y: t.y2 }])
            : plan.segments.map(s => [s.A, s.B]);
        plan.points.forEach(p => {
            const n = plan.noms[p.nom];
            if (!n) return;
            noms++;
            if (Math.min(...segs.map(([a, b]) => distSeg(n, a, b))) - DEMI < 0) touches++;
            ecarts.add(Math.hypot(n.x - p.x, n.y - p.y).toFixed(1));
        });
    }
    assert.ok(noms > 200, `${noms} noms seulement : la mesure est trop courte`);
    assert.equal(touches, 0, `${touches} nom(s) sur ${noms} traversés par un trait`);
    // ET LES PLACES SE DÉCLINENT SUR PLUSIEURS DISTANCES. Un seul tour ne
    // laisse aucune échappatoire à un point de croisement : on observe ici que
    // plusieurs distances SERVENT vraiment, au lieu de lire qu'elles existent.
    assert.ok(ecarts.size >= 2,
        `toutes les étiquettes sont à la même distance (${[...ecarts].join(', ')})`);
});

test('ET LE TRAIT S\'INTERROMPT DERRIÈRE LA LETTRE', () => {
    const bloc = /\.pd-nom \{([^}]*)\}/.exec(CSS)?.[1] || '';
    assert.ok(bloc, 'le style des noms doit exister');
    assert.match(bloc, /paint-order:\s*stroke fill/,
        'sans paint-order, le contour se dessine PAR-DESSUS la lettre et l\'épaissit '
        + 'au lieu de la détourer');
    assert.match(bloc, /stroke:\s*var\(--bg-plateau\)/,
        'le halo prend la couleur du fond de la figure, pas une couleur fixe : '
        + 'la même figure sert au thème sombre et à la feuille imprimée');
    assert.match(bloc, /stroke-width:\s*[\d.]+px/, 'et il a une épaisseur');
});
