import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { lireChemin, deroulerChemin, dessinerCheminPdf, boiteChemin } from '../js/ui/cheminSvg.js';

// --- La lecture ------------------------------------------------------------------

test('les séparateurs du SVG sont tous acceptés', () => {
    // Virgules, espaces, et le signe moins qui sert de séparateur : « 10-5 »
    // vaut 10 puis −5, et c'est une écriture courante dans les fichiers réels.
    const a = lireChemin('M 10,20 L 30,40');
    const b = lireChemin('M10 20L30 40');
    const c = lireChemin('M10,20L30-40');
    assert.deepEqual(a, [{ c: 'M', args: [10, 20] }, { c: 'L', args: [30, 40] }]);
    assert.deepEqual(b, a);
    assert.deepEqual(c[1].args, [30, -40]);
});

test('une commande répétée se déplie, et le M répété devient L', () => {
    // « L 1,2 3,4 » vaut deux segments ; « M 1,2 3,4 » vaut un déplacement
    // PUIS un segment — c'est la règle du SVG, et l'ignorer déforme le dessin.
    assert.deepEqual(lireChemin('L 1,2 3,4'), [{ c: 'L', args: [1, 2] }, { c: 'L', args: [3, 4] }]);
    assert.deepEqual(lireChemin('M 1,2 3,4'), [{ c: 'M', args: [1, 2] }, { c: 'L', args: [3, 4] }]);
    assert.deepEqual(lireChemin('m 1,2 3,4'), [{ c: 'm', args: [1, 2] }, { c: 'l', args: [3, 4] }]);
});

// --- Le déroulé -------------------------------------------------------------------

test('les commandes relatives suivent le point courant', () => {
    const [sc] = deroulerChemin('M 10,10 l 5,0 l 0,5 z');
    assert.deepEqual(sc.depart, [10, 10]);
    assert.deepEqual(sc.pas.map(p => p.l), [[15, 10], [15, 15]]);
    assert.equal(sc.ferme, true);
});

test('H et V ne bougent qu\'une coordonnée', () => {
    const [sc] = deroulerChemin('M 0,0 H 10 V 20 h -5 v -5');
    assert.deepEqual(sc.pas.map(p => p.l), [[10, 0], [10, 20], [5, 20], [5, 15]]);
});

test('un Z ramène au départ du SOUS-CHEMIN, pas à l\'origine', () => {
    const chemins = deroulerChemin('M 5,5 L 9,5 Z M 20,20 l 2,0');
    assert.equal(chemins.length, 2);
    assert.deepEqual(chemins[1].depart, [20, 20]);
    assert.deepEqual(chemins[1].pas[0].l, [22, 20]);
});

test('une quadratique devient une cubique ÉQUIVALENTE', () => {
    // Ce n'est pas une approximation : toute quadratique s'écrit exactement
    // comme une cubique. On le vérifie en évaluant les deux au milieu.
    const [sc] = deroulerChemin('M 0,0 Q 10,20 20,0');
    const [x1, y1, x2, y2, ex, ey] = sc.pas[0].c;
    const cubique = (t) => {
        const u = 1 - t;
        return [
            u * u * u * 0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
            u * u * u * 0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey
        ];
    };
    const quad = (t) => {
        const u = 1 - t;
        return [u * u * 0 + 2 * u * t * 10 + t * t * 20, u * u * 0 + 2 * u * t * 20 + t * t * 0];
    };
    for (const t of [0.25, 0.5, 0.75]) {
        const c = cubique(t), q = quad(t);
        assert.ok(Math.abs(c[0] - q[0]) < 1e-9 && Math.abs(c[1] - q[1]) < 1e-9,
            `écart à t = ${t}`);
    }
});

test('S reprend le symétrique du point de contrôle précédent', () => {
    const [sc] = deroulerChemin('M 0,0 C 0,10 10,10 10,0 S 20,-10 20,0');
    // Le premier contrôle du S est le symétrique de (10,10) autour de (10,0).
    assert.deepEqual(sc.pas[1].c.slice(0, 2), [10, -10]);
});

test('le repère de sortie s\'applique à TOUS les points', () => {
    const placer = (x, y) => [x * 2 + 100, y * 2 + 50];
    const [sc] = deroulerChemin('M 1,1 C 2,2 3,3 4,4', placer);
    assert.deepEqual(sc.depart, [102, 52]);
    assert.deepEqual(sc.pas[0].c, [104, 54, 106, 56, 108, 58]);
});

// --- Le rendu PDF ------------------------------------------------------------------

test('le PDF reçoit des DÉPLACEMENTS, pas des points absolus', () => {
    // C'est toute la difficulté : jsPDF veut des écarts au point courant.
    const appels = [];
    const faux = { lines: (...a) => appels.push(a) };
    dessinerCheminPdf(faux, 'M 10,10 L 15,10 L 15,20 Z', (x, y) => [x, y]);
    assert.equal(appels.length, 1);
    const [ecarts, x, y, echelle, style, ferme] = appels[0];
    assert.deepEqual([x, y], [10, 10]);
    assert.deepEqual(ecarts, [[5, 0], [0, 10]]);
    assert.deepEqual(echelle, [1, 1]);
    assert.equal(style, 'FD');
    assert.equal(ferme, true);
});

test('chaque sous-chemin est dessiné séparément', () => {
    const appels = [];
    const faux = { lines: (...a) => appels.push(a) };
    dessinerCheminPdf(faux, 'M 0,0 L 1,0 Z M 5,5 L 6,5 Z', (x, y) => [x, y]);
    assert.equal(appels.length, 2, 'deux sous-chemins, deux tracés');
    assert.deepEqual(appels[1][1], 5);
});

test('une courbe passe en six nombres, un segment en deux', () => {
    const appels = [];
    const faux = { lines: (...a) => appels.push(a) };
    dessinerCheminPdf(faux, 'M 0,0 C 1,1 2,1 3,0 L 4,0', (x, y) => [x, y]);
    const ecarts = appels[0][0];
    assert.equal(ecarts[0].length, 6);
    assert.equal(ecarts[1].length, 2);
    assert.deepEqual(ecarts[1], [1, 0], 'le segment part du bout de la courbe');
});

// --- La boîte ----------------------------------------------------------------------

test('la boîte englobe le dessin, points de contrôle compris', () => {
    const b = boiteChemin('M 0,0 L 10,0 L 10,10 L 0,10 Z');
    assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [0, 0, 10, 10]);
    // Sur une courbe, la boîte des contrôles est un peu large — jamais rognée.
    const c = boiteChemin('M 0,0 C 0,20 10,20 10,0');
    assert.equal(c.y1, 20);
});

test('un chemin vide ne fait pas tomber le lecteur', () => {
    assert.deepEqual(lireChemin(''), []);
    assert.deepEqual(deroulerChemin(''), []);
    const faux = { lines: () => { throw new Error('rien à dessiner'); } };
    dessinerCheminPdf(faux, '', (x, y) => [x, y]);   // ne doit rien appeler
});

// --- L'IMPORT D'UN JEU DE PIÈCES ---------------------------------------------------

test('un dossier de SVG devient un module de pièces utilisable', async () => {
    // C'est la chaîne entière : douze fichiers au format de Wikimedia Commons,
    // l'outil les lit, et l'application peut les dessiner — à l'écran comme
    // dans le PDF. Sans ce test, on ne saurait que le jour où l'on essaie.
    const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { execFileSync } = await import('node:child_process');

    const dossier = mkdtempSync(join(tmpdir(), 'pieces-'));
    const sortie = join(dossier, 'sortie.js');
    const corps = (i) => `M ${5 + i} 40 C ${5 + i} 20 ${20 + i} 10 ${22} 8 `
        + `C ${25} 10 ${40 - i} 20 ${40 - i} 40 Z`;
    ['k', 'q', 'r', 'b', 'n', 'p'].forEach((t, i) => {
        ['l', 'd'].forEach(c => {
            writeFileSync(join(dossier, `Chess_${t}${c}t45.svg`),
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">'
                + `<path d="${corps(i)}" style="fill:${c === 'd' ? '#000' : '#fff'};`
                + 'stroke:#000;stroke-width:1.5"/>'
                + `<path d="M 10 ${20 + i} L 35 ${20 + i}" style="fill:none;stroke:#888"/></svg>`);
        });
    });

    execFileSync('node', ['outils/importerPieces.mjs', dossier, 'Essai', `--sortie=${sortie}`],
        { cwd: process.cwd() });
    const module = await import(`file://${sortie}`);
    const jeu = module.PIECES_IMPORTEES;
    assert.equal(Object.keys(jeu).length, 12, 'douze pièces attendues');
    assert.ok(jeu.Kb && jeu.Kn && jeu.Pb, 'les couleurs sont distinguées');
    assert.equal(module.MENTION_PIECES, 'Essai', 'la mention de licence est conservée');

    // Le trait pur ne doit PAS être rempli : remplir la crinière d'un cavalier
    // la transformerait en tache.
    const traits = jeu.Kb.formes.filter(f => !f.remplit);
    assert.equal(traits.length, 1);
    assert.equal(traits[0].stroke, '#888');

    // Le cadre commun couvre toute la série, et sert aux douze.
    const c = module.CADRE_IMPORTE;
    assert.ok(c.x1 > c.x0 && c.y1 > c.y0);

    // Et le PDF sait redessiner ces chemins.
    const appels = [];
    const { dessinerCheminPdf: dessiner } = await import('../js/ui/cheminSvg.js');
    dessiner({ lines: (...a) => appels.push(a) }, jeu.Kb.formes[0].d, (x, y) => [x, y]);
    assert.ok(appels.length >= 1, 'aucun tracé produit pour le PDF');
    assert.ok(appels[0][0].some(e => e.length === 6), 'les courbes doivent survivre au trajet');
});

// --- LA PLANCHE DE PIÈCES RÉELLE ---------------------------------------------------

test('la planche livrée donne bien douze pièces, avec leurs courbes', async () => {
    // Le fichier de Cburnett est dans le dépôt : on vérifie qu'il s'importe
    // toujours, et surtout que les ARCS deviennent des courbes. Sans eux, les
    // boules de la couronne et l'œil du cavalier seraient des traits droits.
    const { PIECES_IMPORTEES, CADRE_IMPORTE, MENTION_PIECES } =
        await import('../js/ui/piecesImportees.js');
    if (!PIECES_IMPORTEES) return;                 // jeu maison : rien à vérifier

    assert.equal(Object.keys(PIECES_IMPORTEES).length, 12);
    for (const [cle, p] of Object.entries(PIECES_IMPORTEES)) {
        assert.ok(p.formes.length > 0, `${cle} : aucune forme`);
        p.formes.forEach(f => {
            assert.ok(/^M /.test(f.d), `${cle} : un tracé qui ne commence pas par M`);
            // Les transformations ont été FIGÉES : plus rien ne doit traîner.
            assert.ok(!/[Aa]\s/.test(f.d), `${cle} : un arc a survécu à l'import`);
        });
    }

    // La dame a des courbes (sa couronne), et le cavalier aussi (sa tête).
    const courbes = (p) => p.formes.filter(f => f.d.includes(' C ')).length;
    assert.ok(courbes(PIECES_IMPORTEES.Qb) > 0, 'la dame blanche n\'a aucune courbe');
    assert.ok(courbes(PIECES_IMPORTEES.Nb) > 0, 'le cavalier blanc n\'a aucune courbe');

    // Les couleurs distinguent bien les deux camps.
    const remplissage = (p) => p.formes.filter(f => f.remplit).map(f => f.fill.toLowerCase());
    assert.ok(remplissage(PIECES_IMPORTEES.Pb).includes('#ffffff'), 'le pion blanc n\'est pas blanc');
    assert.ok(remplissage(PIECES_IMPORTEES.Pn).includes('#000000'), 'le pion noir n\'est pas noir');

    // Le cadre commun réserve la place du contour.
    assert.ok(CADRE_IMPORTE.trait > 0, 'le contour n\'est pas compté dans le cadre');
    assert.ok(MENTION_PIECES.length > 10, 'la mention de licence manque');
});
