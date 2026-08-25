import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    totalCubes, cubesAuSol, boitePleine, cubesAAjouter, cubesCaches,
    projeter, facesCube, cubesAPeindre, boiteDessin, pave, construire, mesures, FAMILLES
} from '../js/core/cubes.js';
import { cubesSvg } from '../js/core/cubesSvg.js';
import { cubesGenerator as G } from '../js/core/generators/cubes.js';

const TAILLES = ['petit', 'moyen', 'grand'];

test('un pavé plein se compte par une multiplication', () => {
    // C'est tout l'intérêt du pavé dans cet exercice : l'élève qui l'a compté
    // colonne par colonne PUIS vérifié par L × p × h n'apprend pas la formule
    // du volume, il la constate.
    const h = pave(4, 3, 3);
    assert.equal(totalCubes(h), 36);
    assert.equal(cubesAuSol(h), 12);
    assert.deepEqual(boitePleine(h), { x1: 0, y1: 0, largeur: 4, profondeur: 3, hauteur: 3, cubes: 36 });
    assert.equal(cubesAAjouter(h), 0, 'un pavé plein ne manque de rien');
});

test('le sol se compte en COLONNES, pas en cubes', () => {
    // La faute que l'exercice veut faire rencontrer : une pile de quatre cubes
    // n'en pose qu'un par terre.
    const h = [[4, 0], [1, 2]];
    assert.equal(totalCubes(h), 7);
    assert.equal(cubesAuSol(h), 3, 'trois cases occupées, donc trois cubes au sol');
});

test('la boîte se mesure sur les CUBES, pas sur le tableau', () => {
    // Une colonne vide au bord rendait le tableau plus grand que le solide :
    // « le pavé qui contient » comptait alors du vide, et « combien en
    // ajouter » donnait un nombre que rien sur le dessin ne justifiait.
    const h = [[0, 0, 0], [0, 2, 1], [0, 0, 0]];
    const b = boitePleine(h);
    assert.deepEqual(b, { x1: 1, y1: 1, largeur: 2, profondeur: 1, hauteur: 2, cubes: 4 });
    assert.equal(cubesAAjouter(h), 1);
});

test('un cube caché a un voisin dans les trois directions vues', () => {
    // Un 2 × 2 × 2 plein cache exactement son cube du fond, en bas à gauche :
    // c'est le plus petit empilement qui prouve que le dessin ment.
    assert.equal(cubesCaches(pave(2, 2, 2)), 1);
    assert.equal(cubesCaches(pave(3, 3, 3)), 8, 'le noyau 2 × 2 × 2 du 3 × 3 × 3');
    // Une seule colonne ne cache rien : chaque cube montre au moins une face.
    assert.equal(cubesCaches([[5]]), 0);
});

test('AUCUN CUBE NE FLOTTE, quelle que soit la famille tirée', () => {
    // C'est LA garantie qui rend la figure lisible : ce qui est caché est
    // dessous ou derrière, jamais suspendu. Une carte de hauteurs l'assure par
    // construction — le test vérifie qu'aucune famille ne triche en renvoyant
    // autre chose qu'un tableau d'entiers positifs.
    for (const famille of Object.keys(FAMILLES)) {
        for (let i = 0; i < 12; i++) {
            const h = construire(famille, {
                largeur: 4, profondeur: 3, hauteur: 3, rng: makeRng(`f-${famille}-${i}`)
            });
            // La profondeur et la largeur se tirent (voir le test suivant) ;
            // ce qui compte ici, c'est que le tableau soit RECTANGULAIRE et
            // n'annonce que des hauteurs entières et positives.
            assert.ok(h.length >= 2, `${famille} : profondeur ${h.length}`);
            h.forEach(ligne => {
                assert.equal(ligne.length, h[0].length, `${famille} : ligne dépareillée`);
                ligne.forEach(n => assert.ok(Number.isInteger(n) && n >= 0 && n <= 3,
                    `${famille} : hauteur impossible (${n})`));
            });
        }
    }
});

test('un empilement tient dans la taille annoncée, à un cube près', () => {
    // La taille est un PLAFOND, pas un gabarit : chaque dimension peut perdre
    // un cube pour que douze dessins ne se ressemblent pas, jamais plus — sinon
    // on promettrait un 4 × 3 × 3 et l'élève compterait six cubes.
    for (const famille of Object.keys(FAMILLES)) {
        for (let i = 0; i < 12; i++) {
            const h = construire(famille, {
                largeur: 4, profondeur: 3, hauteur: 3, rng: makeRng(`t-${famille}-${i}`)
            });
            const b = boitePleine(h);
            const dit = `${famille} #${i} : ${b.largeur}×${b.profondeur}×${b.hauteur}`;
            assert.ok(b.largeur >= 3 && b.largeur <= 4, dit);
            assert.ok(b.profondeur >= 2 && b.profondeur <= 3, dit);
            assert.ok(b.hauteur >= 2 && b.hauteur <= 3, dit);
            // La boîte est PLEINE de son étendue : pas de rangée vide au bord,
            // sinon `boitePleine` mentirait sur ce qu'elle mesure.
            assert.equal(h.length * h[0].length, b.largeur * b.profondeur, `${dit} : un bord vide`);
            // Au moins la moitié des colonnes debout : en dessous ce n'est plus
            // un empilement, c'est un semis, et il n'y a plus rien de caché.
            assert.ok(cubesAuSol(h) >= b.largeur * b.profondeur * 0.5,
                `${dit} : ${cubesAuSol(h)} colonnes seulement`);
        }
    }
});

test('douze dessins d\'une même famille ne se ressemblent pas', () => {
    // Le défaut vu sur la première fiche imprimée : `pave` et `escalier` ne
    // tiraient rien au sort, et les empilements 1, 5 et 9 sortaient identiques,
    // même figure et même réponse. Trois exercices pour le prix d'un.
    for (const famille of Object.keys(FAMILLES)) {
        const vus = new Set();
        for (let i = 0; i < 12; i++) {
            vus.add(JSON.stringify(construire(famille, {
                largeur: 3, profondeur: 3, hauteur: 3, rng: makeRng(`var-${famille}-${i}`)
            })));
        }
        assert.ok(vus.size >= 4, `${famille} : ${vus.size} figure(s) différente(s) sur douze`);
    }
});

test('« creux » et « libre » laissent des cases du sol vides — sinon la question du sol est vide', () => {
    // Tant que toute colonne était non nulle, « combien touchent le sol »
    // valait 12 sur les douze dessins d'une fiche : une question dont la
    // réponse ne change pas n'est pas une question.
    const vus = new Set();
    for (const famille of ['creux', 'libre']) {
        for (let i = 0; i < 20; i++) {
            const h = construire(famille, {
                largeur: 4, profondeur: 3, hauteur: 3, rng: makeRng(`s-${famille}-${i}`)
            });
            vus.add(cubesAuSol(h));
        }
    }
    assert.ok(vus.size >= 3, `le sol ne prend que ${vus.size} valeur(s) : ${[...vus]}`);
    assert.ok(Math.min(...vus) < 12, 'aucun empilement ne laisse de case vide');
});

test('la projection place les cubes du fond en HAUT et les proches en BAS', () => {
    // L'axonométrie de tous les manuels : x descend vers la droite, y descend
    // vers la gauche, z monte. Si ce repère se retourne, la perspective se
    // creuse et le solide se lit à l'envers.
    const o = projeter(0, 0, 0);
    assert.deepEqual([o.x, o.y], [0, 0]);
    assert.ok(projeter(1, 0, 0).x > 0, 'x va vers la droite');
    assert.ok(projeter(0, 1, 0).x < 0, 'y va vers la gauche');
    assert.ok(projeter(0, 0, 1).y < 0, 'z monte (y de l\'écran descend)');
    // Le cube (1,1,0) est DEVANT le cube (0,0,0) : plus bas sur la feuille.
    assert.ok(projeter(1, 1, 0).y > projeter(0, 0, 0).y);
});

test('les cubes se peignent du plus loin au plus près', () => {
    // C'est l'algorithme du peintre, et c'est ce qui remplace tout calcul
    // d'occultation : peints dans cet ordre, les cubes se recouvrent seuls.
    const liste = cubesAPeindre(pave(2, 2, 2));
    assert.equal(liste.length, 8);
    const sommes = liste.map(c => c.x + c.y + c.z);
    assert.deepEqual(sommes, [...sommes].sort((a, b) => a - b), 'l\'ordre n\'est pas croissant');
    assert.deepEqual(liste[0], { x: 0, y: 0, z: 0 }, 'le cube du fond en premier');
    assert.deepEqual(liste[liste.length - 1], { x: 1, y: 1, z: 1 }, 'celui de devant en dernier');
});

test('les trois faces dessinées sont bien celles qui regardent l\'observateur', () => {
    const f = facesCube(0, 0, 0);
    assert.equal(Object.keys(f).length, 3);
    Object.values(f).forEach(pts => assert.equal(pts.length, 4, 'une face carrée a quatre coins'));
    // LE DESSUS EST AU-DESSUS, mais pas point par point : son coin de devant
    // tombe exactement à la hauteur du centre du cube — c'est la perspective,
    // et l'exiger de chaque coin serait exiger une vue de dessus. C'est le
    // MILIEU de la face qui doit être plus haut.
    const centre = projeter(0.5, 0.5, 0.5);
    const milieuY = (pts) => pts.reduce((s, p) => s + p.y, 0) / pts.length;
    assert.ok(milieuY(f.dessus) < centre.y, 'le « dessus » n\'est pas en haut');
    // Et il est bien posé sur le cube : chaque coin est un cube plus haut que
    // le coin correspondant du sol.
    const bas = [projeter(0, 0, 0), projeter(1, 0, 0), projeter(1, 1, 0), projeter(0, 1, 0)];
    f.dessus.forEach((p, i) => assert.ok(Math.abs((bas[i].y - p.y) - 1) < 1e-9,
        'le dessus n\'est pas à un cube du sol'));
    assert.ok(f.droite.every(p => p.x >= centre.x - 1e-9), 'la face « droite » n\'est pas à droite');
    assert.ok(f.gauche.every(p => p.x <= centre.x + 1e-9), 'la face « gauche » n\'est pas à gauche');
});

test('le cadre du dessin contient tous les cubes, sans marge perdue', () => {
    const h = construire('creux', { largeur: 4, profondeur: 3, hauteur: 3, rng: makeRng('cadre') });
    const bd = boiteDessin(h);
    cubesAPeindre(h).forEach(({ x, y, z }) => {
        Object.values(facesCube(x, y, z)).flat().forEach(p => {
            assert.ok(p.x >= bd.xmin - 1e-9 && p.x <= bd.xmax + 1e-9, 'un cube sort en largeur');
            assert.ok(p.y >= bd.ymin - 1e-9 && p.y <= bd.ymax + 1e-9, 'un cube sort en hauteur');
        });
    });
});

test('le SVG peint trois faces par cube, et le dessus en dernier', () => {
    // Trois clartés font le volume ; si le dessus passait sous une face
    // voisine, une arête disparaîtrait et l'empilement deviendrait plat.
    const svg = cubesSvg(pave(2, 2, 2));
    assert.equal((svg.match(/<polygon/g) || []).length, 8 * 3);
    const un = svg.slice(svg.indexOf('cu-gauche'));
    assert.ok(un.indexOf('cu-droite') < un.indexOf('cu-dessus'), 'le dessus n\'est pas au-dessus');
    assert.ok(/viewBox="0 0 [\d.]+ [\d.]+"/.test(svg), 'pas de cadre');
});

test('chaque question a la réponse qu\'elle annonce', () => {
    for (const taille of TAILLES) {
        for (const question of ['total', 'sol', 'ajouter']) {
            for (let i = 0; i < 6; i++) {
                const it = G.generate({ taille, question },
                    { rng: makeRng(`q-${taille}-${question}-${i}`), index: i });
                const m = mesures(it.meta.hauteurs);
                const attendu = { total: m.total, sol: m.sol, ajouter: m.aAjouter }[question];
                assert.equal(it.answer, attendu, `${taille}/${question} #${i}`);
                assert.equal(it.meta.reponse, attendu, 'le papier lit meta.reponse');
            }
        }
    }
});

test('« combien en ajouter » ne vaut jamais zéro', () => {
    // Sur un pavé plein la figure est juste et la question est vide : rien à
    // ajouter, rien à chercher. Le générateur retire alors des cubes.
    for (let i = 0; i < 20; i++) {
        const it = G.generate({ taille: 'moyen', question: 'ajouter' },
            { rng: makeRng('z' + i), index: i });
        assert.ok(it.answer > 0, `#${i} : il n'y a rien à ajouter`);
    }
});

test('la bonne réponse est TOUJOURS proposée, et les leurres sont les fautes du chapitre', () => {
    // Un leurre pris au hasard n'apprend rien ; « le nombre de cubes qu'on
    // VOIT » ou « la base » disent à l'élève laquelle de ses erreurs il vient
    // de faire.
    for (const question of ['total', 'sol', 'ajouter']) {
        for (let i = 0; i < 10; i++) {
            const it = G.generate({ taille: 'grand', question },
                { rng: makeRng(`l-${question}-${i}`), index: i });
            const bons = it.choices.filter(c => c.correct);
            assert.equal(bons.length, 1, `${question} #${i} : ${bons.length} bonnes réponses`);
            assert.equal(bons[0].value, String(it.answer));
            assert.equal(it.choices.length, 4, `${question} #${i} : ${it.choices.length} choix`);
            const vals = it.choices.map(c => c.value);
            assert.equal(new Set(vals).size, 4, `${question} #${i} : un doublon dans ${vals}`);
            it.choices.forEach(c => assert.ok(Number(c.value) > 0, 'un choix négatif ou nul'));
        }
    }
});

test('les formes défilent au lieu d\'être tirées au sort', () => {
    // Sur une fiche de douze dessins, un tirage donne trois fois le pavé et
    // oublie l'escalier — et c'est justement la variété des MÉTHODES de
    // comptage qu'on veut faire travailler.
    const formes = ['pave', 'escalier', 'libre'];
    const vues = Array.from({ length: 6 }, (_, i) =>
        G.generate({ taille: 'moyen', formes }, { rng: makeRng('cy' + i), index: i }).meta.famille);
    assert.deepEqual(vues, [...formes, ...formes]);
});

test('un réglage vide ou farfelu ne casse rien', () => {
    const it = G.generate({ taille: 'énorme', formes: ['licorne'], question: 'pourquoi' },
        { rng: makeRng('bof'), index: 0 });
    assert.equal(it.answer, mesures(it.meta.hauteurs).total, 'le total par défaut');
    assert.ok(FAMILLES[it.meta.famille], 'une famille connue');
});

test('l\'indice et le corrigé disent la MÉTHODE, pas seulement le nombre', () => {
    const it = G.generate({ taille: 'grand', formes: ['pave'], question: 'total' },
        { rng: makeRng('exp'), index: 0 });
    assert.ok(it.hints.length >= 2, 'un seul indice');
    assert.ok(it.hints[0].toLowerCase().includes('colonne'), 'la méthode n\'est pas dite');
    assert.ok(it.explanation.includes('×'), 'un pavé plein se corrige par une multiplication');
    assert.ok(it.explanation.includes(String(it.answer)));

    const creuse = G.generate({ taille: 'grand', formes: ['creux'], question: 'ajouter' },
        { rng: makeRng('exp2'), index: 0 });
    // Le corrigé pose la soustraction : c'est elle qu'on veut voir écrite.
    assert.ok(creuse.explanation.includes('−'), 'la soustraction n\'est pas posée');
});
