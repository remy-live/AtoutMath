import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { anglesManquantsGenerator as G } from '../js/core/generators/anglesManquants.js';
import {
    RELATIONS, figureSecantes, figurePartage, figureParalleles, mesureArc, ancreArc,
    figureTriangle, poseEtiquette, poseEtiquettes, boiteEtiquette, largeurEtiquette,
    ETIQUETTE_MINI, HAUTEUR_ETIQUETTE
} from '../js/core/anglesRemarquables.js';

const tirer = (params, i) => G.generate(params, { rng: makeRng('am' + i), index: i });

test('la réponse est celle que dit la relation, sur la mesure DESSINÉE', () => {
    // Le contrat du chapitre : ce n'est pas le nombre tiré qui compte, c'est
    // l'angle qu'on voit. Si le dessin et l'énoncé divergent d'un degré, la
    // feuille est fausse et personne ne peut le savoir.
    for (let i = 0; i < 300; i++) {
        const m = tirer({}, i).meta;
        if (m.famille === 'chaine') continue;

        // LE TRIANGLE A DEUX ANGLES DONNÉS, et sa règle en prend donc deux :
        // il n'est pas dans `RELATIONS`, qui ne sait lire qu'une entrée. Le
        // contrat reste le MÊME — ce qui est annoncé est ce qui est dessiné —
        // et il se vérifie ici de la seule façon qui ait un sens : la somme
        // des trois angles DESSINÉS vaut 180°.
        if (m.famille === 'triangle') {
            const lus = m.figure.arcs.filter(a => a.role === 'donne').map(mesureArc);
            const vert = mesureArc(m.figure.arcs.find(a => a.role === 'cherche'));
            assert.deepEqual(lus.slice().sort(), [m.donne, m.donneB].sort(),
                `triangle : l'énoncé annonce ${m.donne}° et ${m.donneB}°, le dessin montre `
                + `${lus.join('° et ')}°`);
            assert.equal(lus[0] + lus[1] + vert, 180,
                `triangle : les trois angles dessinés font ${lus[0] + lus[1] + vert}°`);
            assert.equal(m.reponse, vert,
                `triangle : la réponse ${m.reponse}° n'est pas l'angle dessiné (${vert}°)`);
            continue;
        }

        const donne = mesureArc(m.figure.arcs.find(a => a.role === 'donne'));
        const cherche = mesureArc(m.figure.arcs.find(a => a.role === 'cherche'));
        assert.equal(m.donne, donne, `${m.famille} : l'énoncé annonce ${m.donne}°, le dessin montre ${donne}°`);
        assert.equal(m.reponse, RELATIONS[m.relation].de(donne),
            `${m.famille} : la règle donne autre chose que la réponse annoncée`);
        assert.equal(m.reponse, cherche,
            `${m.famille} : la réponse ${m.reponse}° n'est pas l'angle dessiné (${cherche}°)`);
    }
});

test('deux angles opposés par le sommet sont bien opposés, pas voisins', () => {
    const f = figureSecantes({ angle: 50, penche: 0 });
    const [donne, cherche] = f.arcs;
    assert.equal(mesureArc(donne), 50);
    assert.equal(mesureArc(cherche), 50);
    // Opposés : leurs bissectrices pointent dans des directions contraires.
    const a = ancreArc(donne), b = ancreArc(cherche);
    assert.ok(a.x * b.x + a.y * b.y < 0, 'les deux secteurs sont du même côté');
});

test('un angle partagé rend exactement son total', () => {
    for (const ouverture of [90, 180, 360]) {
        const f = figurePartage({ ouverture, angle: 37, penche: 11 });
        const somme = f.arcs.reduce((s, a) => s + mesureArc(a), 0);
        assert.equal(somme, ouverture, `le partage de ${ouverture}° ne fait pas le compte`);
        assert.equal(mesureArc(f.arcs[0]), 37);
    }
    // L'équerre n'apparaît QUE sur l'angle droit : ailleurs elle mentirait.
    assert.ok(figurePartage({ ouverture: 90, angle: 30 }).droit);
    assert.equal(figurePartage({ ouverture: 180, angle: 30 }).droit, null);
});

test('correspondants et alternes-internes sont égaux, et à des sommets différents', () => {
    for (const relation of ['correspondants', 'alternes']) {
        const f = figureParalleles({ angle: 62, penche: 8, relation });
        const [donne, cherche] = f.arcs;
        assert.equal(mesureArc(donne), mesureArc(cherche), relation);
        assert.ok(donne.x !== cherche.x || donne.y !== cherche.y,
            `${relation} : les deux angles doivent être à DEUX croisements`);
    }
    // Les deux parallèles sont en pointillés — c'est ce qui les déclare
    // parallèles sans l'écrire.
    const f = figureParalleles({ angle: 62, penche: 0 });
    assert.equal(f.traits.filter(t => t.pointille).length, 2);
});

test('la chaîne passe vraiment par un pas intermédiaire', () => {
    const m = G.generate({ niveau: '2' }, { rng: makeRng('ch'), index: 0 }).meta;
    assert.equal(m.famille, 'chaine');
    assert.equal(m.relais, 180 - m.donne, 'le premier pas est un supplémentaire');
    assert.equal(m.reponse, m.relais, 'le second pas est une égalité');
    // Le relais est DESSINÉ : sans lui, « passe par l'angle ① » ne montre rien.
    assert.ok(m.figure.arcs.some(a => a.role === 'relais'));
});

test('le niveau demandé est celui qu\'on obtient', () => {
    // UNE SEULE CASE COCHÉE : toutes les figures sont à ce niveau-là.
    for (const marche of ['0', '1', '2', '3']) {
        for (let i = 0; i < 30; i++) {
            const m = G.generate({ marches: [marche] },
                { rng: makeRng('n' + marche + i), index: i, total: 30 }).meta;
            assert.equal(String(m.marche), marche);
        }
    }
    // ET LE RÉGLAGE D'AVANT LES CASES SE RELIT : un parcours enregistré porte
    // `niveau: '1'`, pas de liste de marches — voir core/progression.js.
    for (let i = 0; i < 10; i++) {
        assert.equal(String(G.generate({ niveau: '1' },
            { rng: makeRng('v' + i), index: i, total: 10 }).meta.marche), '1');
    }
    // « MÉLANGÉ » VOULAIT DIRE « DANS L'ORDRE », et le menu l'écrivait en dur :
    // `[0, 0, 1, 1, 1, 2][i % 6]`. C'est maintenant le partage des marches qui
    // le donne, et c'est le même esprit — on ne commence pas une série par la
    // chaîne — avec deux choses en plus : le professeur VOIT le partage, et il
    // peut le tirer. Douze questions sur les trois niveaux : quatre chacun.
    //
    // ET DEPUIS LE 16 NOVEMBRE IL Y A QUATRE MARCHES : la somme des angles
    // d'un triangle est arrivée. « Mélangé » veut dire TOUTES les marches,
    // donc douze questions se partagent maintenant en trois par marche et non
    // quatre. C'est l'effet voulu — une séance de cinquième qui mélangeait
    // tirera des triangles, et c'est le programme de cinquième — mais il faut
    // l'écrire : un professeur qui avait réglé « mélangé » verra ses séries
    // changer sans avoir rien touché.
    const suite = Array.from({ length: 12 }, (_, i) =>
        G.generate({ niveau: 'melange' },
            { rng: makeRng('mel' + i), index: i, total: 12 }).meta.niveau);
    assert.deepEqual(suite, [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
    // Et la répartition écrite à la main est suivie : trois, puis un, puis huit.
    const tiree = Array.from({ length: 12 }, (_, i) =>
        G.generate({ repartitionMarches: '3,1,8' },
            { rng: makeRng('tir' + i), index: i, total: 12 }).meta.niveau);
    assert.deepEqual(tiree, [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2]);
});

test('les réglages de relations sont respectés', () => {
    for (let i = 0; i < 40; i++) {
        const m = G.generate({ niveau: '1', familles: ['supplementaires'] },
            { rng: makeRng('f' + i), index: i }).meta;
        assert.equal(m.famille, 'supplementaires');
    }
});

test('aucun distracteur ne vaut la bonne réponse', () => {
    for (let i = 0; i < 200; i++) {
        const it = tirer({}, i);
        const bons = it.choices.filter(c => c.correct);
        assert.equal(bons.length, 1, 'une seule bonne réponse');
        const valeurs = it.choices.map(c => c.value);
        assert.equal(new Set(valeurs).size, valeurs.length, `doublon parmi ${valeurs.join(', ')}`);
    }
});

test('l\'étiquette d\'un petit angle s\'éloigne du sommet', () => {
    // Sinon « 10° » ne tient pas entre les deux côtés : c'est ce qu'on fait à
    // la main, et sans quoi les petits angles sont illisibles.
    const petit = { x: 0, y: 0, de: 0, a: 12 };
    const grand = { x: 0, y: 0, de: 0, a: 80 };
    const d = (p) => Math.hypot(p.x, p.y);
    assert.ok(d(ancreArc(petit)) > d(ancreArc(grand)) * 1.3);
});

test('la figure tient dans son cadre', () => {
    // Les rendus la posent dans un carré : un trait qui en sort déborde sur le
    // bloc voisin de la feuille.
    for (let i = 0; i < 120; i++) {
        const m = tirer({}, i).meta;
        m.figure.traits.forEach(t => {
            [[t.x1, t.y1], [t.x2, t.y2]].forEach(([x, y]) => {
                assert.ok(Math.abs(x) <= 2.2 && Math.abs(y) <= 2.2,
                    `${m.famille} : un trait sort du cadre (${x.toFixed(2)}, ${y.toFixed(2)})`);
            });
        });
    }
});

// --- LE CODAGE DES PARALLÈLES ---------------------------------------------------

test('AUCUNE MARQUE SUR LE TRAIT — le pointillé suffit à dire « parallèles »', () => {
    // Rémy, deux fois : « je ne comprends pas pourquoi tu mets des flèches »,
    // puis « ne mets pas de flèche sur les tracés des valeurs manquantes des
    // angles ». Le chevron est bien le codage des manuels, mais posé sur une
    // droite qui s'arrête au bord du cadre il se lit comme une pointe — et un
    // codage qu'on lit de travers est pire que pas de codage.
    //
    // CE QUI PORTE L'INFORMATION reste : le POINTILLÉ distingue les deux
    // parallèles de la sécante, et la consigne le dit en toutes lettres.
    const vus = new Set();
    for (let k = 0; k < 60; k++) {
        const it = G.generate({}, { rng: makeRng(`chev${k}`), index: k });
        const pointes = (it.prompt.html.match(/ar-chevron|marker-end|polyline class="ar-fleche/g) || []).length;
        assert.equal(pointes, 0,
            `${it.meta.famille} : ${pointes} marque(s) sur le trait`);
        const pointilles = (it.prompt.html.match(/ar-trait--par/g) || []).length;
        // Les parallèles restent distinguables : quand il y en a, elles sont
        // DEUX, et elles seules sont en pointillés.
        assert.ok(pointilles === 0 || pointilles === 2,
            `${it.meta.famille} : ${pointilles} droites en pointillés`);
        vus.add(pointilles > 0);
    }
    // On a bien rencontré les deux cas : des figures à parallèles, et des
    // figures sans. Sinon le test ne prouverait que la moitié de la règle.
    assert.deepEqual([...vus].sort(), [false, true]);
});

// ── LES ÉTIQUETTES NE SE MARCHENT PLUS DESSUS ───────────────────────────────
//
// RÉMY, capture à l'appui, 17 novembre : « déborde un peu ! » — un « 80° » qui
// sortait de son secteur et traversait un côté du triangle.
//
// REGARDÉ EN PLANCHE ENSUITE, huit triangles d'un coup : ce n'était pas « un
// peu ». Sur quatre des huit, DEUX étiquettes se chevauchaient, et sur l'une
// d'elles les deux nombres étaient purement et simplement superposés.
//
// LA CAUSE TIENT EN UNE LIGNE : l'ancienne pose réservait à l'étiquette une
// demi-largeur égale à la moitié de sa HAUTEUR, alors que « 130° » est trois
// fois plus large que haut. Elle avait été écrite pour la figure des deux
// parallèles, où les sommets sont loin les uns des autres et où l'erreur ne se
// voyait pas. Un triangle rapproche trois sommets — et trois étiquettes.

const seTouchent = (a, b) =>
    a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/** Tous les triangles que le générateur peut tirer, ou presque. */
function tousLesTriangles() {
    const out = [];
    for (let a = 20; a <= 140; a += 5) {
        for (let b = 20; b <= 140; b += 5) {
            if (a + b >= 160) continue;
            out.push([a, b]);
        }
    }
    return out;
}

test('DEUX ÉTIQUETTES D’UN MÊME TRIANGLE NE SE CHEVAUCHENT JAMAIS', () => {
    let pires = null;
    for (const [a, b] of tousLesTriangles()) {
        for (const penche of [0, 12, 57, 143, 250]) {
            const f = figureTriangle({ a, b, penche });
            // ON LES POSE TOUTES ENSEMBLE, et c'est tout le sujet : une pose
            // sommet par sommet ne peut PAS éviter les chevauchements, parce
            // que les trois secteurs d'un triangle se recouvrent dans son
            // intérieur. Éprouver `poseEtiquette` seule reviendrait à éprouver
            // la version qui ne marchait pas.
            const texteDe = (arc) => `${mesureArc(arc)}°`;
            const poses = poseEtiquettes(f.arcs, texteDe)
                .map((p, i) => boiteEtiquette(p, texteDe(f.arcs[i])));
            for (let i = 0; i < poses.length; i++) {
                for (let j = i + 1; j < poses.length; j++) {
                    if (seTouchent(poses[i], poses[j])) {
                        pires = pires || `${a}° / ${b}°, penché de ${penche}° : `
                            + `les étiquettes ${i} et ${j} se touchent`;
                    }
                }
            }
        }
    }
    assert.equal(pires, null, String(pires));
});

test('UNE ÉTIQUETTE POSÉE DEDANS TIENT VRAIMENT DANS SON SECTEUR', () => {
    // LA PROPRIÉTÉ QUI REMPLACE LA CONSTANTE. On ne vérifie plus « la demi-
    // largeur vaut la moitié de la hauteur » — c'était justement la supposition
    // fausse —, on vérifie la seule chose qui compte : le disque qui contient
    // le nombre est à l'intérieur de l'angle.
    //
    // La distance de la bissectrice à chaque côté, à la distance d du sommet,
    // vaut d·sin(m/2). Il suffit qu'elle dépasse le rayon du disque.
    let faute = null;
    for (const [a, b] of tousLesTriangles()) {
        const f = figureTriangle({ a, b, penche: 23 });
        f.arcs.forEach((arc, i) => {
            const texte = `${mesureArc(arc)}°`;
            const pose = poseEtiquette(arc, texte);
            if (!pose.dedans) return;
            const d = Math.hypot(pose.x - arc.x, pose.y - arc.y);
            const m = mesureArc(arc);
            const R = Math.hypot(largeurEtiquette(texte, pose.h) / 2, pose.h * 0.58);
            const place = d * Math.sin(Math.min(m, 180) / 2 * Math.PI / 180);
            if (place < R - 1e-9) {
                faute = faute || `${a}°/${b}° arc ${i} (${m}°) : il reste `
                    + `${place.toFixed(3)} pour un nombre qui en demande ${R.toFixed(3)}`;
            }
        });
    }
    assert.equal(faute, null, String(faute));
});

test('LE NOMBRE RESTE LISIBLE : une étiquette n’est jamais réduite à rien', () => {
    // Rapetisser pour faire tenir est juste ; rapetisser SANS PLANCHER rendrait
    // un « 130° » de trois pixels qu'aucun élève ne lit. Au-dessous du
    // plancher, l'étiquette sort derrière l'arc — la convention du manuel.
    // ON PASSE PAR LA POSE COLLECTIVE, et c'est ce qui rend cette épreuve
    // utile : c'est la passe qui règle les collisions qui RAPETISSE, et une
    // épreuve qui n'appelle que `poseEtiquette` ne la traverse jamais. Écrite
    // ainsi d'abord, elle restait verte en remplaçant le facteur 0,86 par 0,2 —
    // `epreuveTombe` l'a dit, et c'était vrai : elle ne gardait rien.
    for (const [a, b] of tousLesTriangles()) {
        for (const penche of [5, 57, 143]) {
            const f = figureTriangle({ a, b, penche });
            const texteDe = (arc) => `${mesureArc(arc)}°`;
            poseEtiquettes(f.arcs, texteDe).forEach((pose) => {
            // ON N'ÉPROUVE PAS LA CONSTANTE CONTRE ELLE-MÊME. Écrire
            // `pose.h >= ETIQUETTE_MINI` ne garde rien : abaisser le plancher
            // abaisse l'attente en même temps, et `epreuveTombe` l'a dit —
            // « CETTE ÉPREUVE NE GARDE RIEN » avec un plancher à 0,002.
            // 0,06 est un nombre tenu ICI : la figure s'étend sur environ
            // 1,84 unité, donc une étiquette de 0,06 fait un trentième de la
            // figure. Au-dessous, sur un téléphone, ce n'est plus un nombre,
            // c'est une poussière.
            assert.ok(pose.h >= 0.06,
                `${a}°/${b}° : étiquette haute de ${pose.h.toFixed(3)}, illisible`);
            assert.ok(pose.h <= HAUTEUR_ETIQUETTE + 1e-9,
                'et jamais plus grande que la taille voulue');
            });
        }
    }
});

test('UNE ÉTIQUETTE POSÉE DEDANS EST DANS LE TRIANGLE, PAS SEULEMENT DANS SON COIN', () => {
    // CE QUE LA PREMIÈRE ÉCRITURE DE CETTE ÉPREUVE NE GARDAIT PAS, et
    // `epreuveTombe` l'a dit : en remplaçant la place dont dispose un sommet
    // par un nombre énorme, TOUT restait vert. La passe qui règle les
    // collisions rattrapait le chevauchement — mais rien ne retenait plus
    // l'étiquette de sortir par le CÔTÉ OPPOSÉ du triangle, ce qui est
    // exactement ce que Rémy a photographié.
    //
    // On éprouve donc la bonne propriété : les quatre coins du nombre sont
    // dans le triangle. Un point est dedans s'il est du même côté des trois
    // arêtes — trois produits vectoriels de même signe.
    const dedansTriangle = (S, x, y) => {
        const cote = (p, q) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
        const s = [cote(S[0], S[1]), cote(S[1], S[2]), cote(S[2], S[0])];
        return s.every(v => v >= -1e-9) || s.every(v => v <= 1e-9);
    };
    let faute = null;
    for (const [a, b] of tousLesTriangles()) {
        const f = figureTriangle({ a, b, penche: 31 });
        const S = f.arcs.map(arc => ({ x: arc.x, y: arc.y }));
        const texteDe = (arc) => `${mesureArc(arc)}°`;
        poseEtiquettes(f.arcs, texteDe).forEach((pose, i) => {
            if (!pose.dedans) return;
            const bo = boiteEtiquette(pose, texteDe(f.arcs[i]));
            const coins = [[bo.x1, bo.y1], [bo.x2, bo.y1], [bo.x1, bo.y2], [bo.x2, bo.y2]];
            for (const [x, y] of coins) {
                if (!dedansTriangle(S, x, y)) {
                    faute = faute || `${a}°/${b}° arc ${i} (${mesureArc(f.arcs[i])}°) : `
                        + 'un coin du nombre sort du triangle';
                }
            }
        });
    }
    assert.equal(faute, null, String(faute));
});

test('LA LARGEUR D’UN NOMBRE COMPTE SES GLYPHES, PAS SA HAUTEUR', () => {
    // LE DÉFAUT EN UNE LIGNE : « 130° » est trois fois plus large que haut, et
    // l'ancienne pose lui réservait la moitié de sa hauteur.
    const h = 0.2;
    assert.ok(largeurEtiquette('130°', h) > largeurEtiquette('25°', h),
        'un nombre à trois chiffres doit demander plus de place qu’un à deux');
    assert.ok(largeurEtiquette('25°', h) > h,
        '« 25° » est déjà plus large que haut : la moitié de la hauteur ne suffit pas');
});
