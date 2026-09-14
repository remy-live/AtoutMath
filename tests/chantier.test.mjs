import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MUR, DIRECTIONS, lireNiveau, cloner, blocEn, dalleEn,
    simuler, pousser, gagne, bloqueDefinitivement, resoudre,
    NIVEAUX, niveauxLus
} from '../js/core/chantier.js';

/** Un petit plan de service, pour tester la règle sans dépendre des niveaux. */
const bac = (plan, produits) => lireNiveau({ id: 't', titre: 't', plan, produits });

test('le plan se lit comme un dessin : murs, blocs et dalles à leur place', () => {
    const e = bac(`
        #####
        #A.a#
        #####`, { A: [7, 8] });
    assert.equal(e.cols, 5);
    assert.equal(e.rows, 3);
    assert.equal(e.grille[0][0], MUR);
    assert.equal(e.grille[1][2], 0, 'l\'intérieur du couloir est vide');
    assert.equal(e.blocs.length, 1);
    assert.deepEqual([e.blocs[0].x, e.blocs[0].y], [1, 1]);
    assert.equal(e.blocs[0].produit, 56, '7 × 8 vaut 56');
    assert.equal(e.dalles[0].valeur, 56, 'la dalle porte le résultat du bloc de même lettre');
});

test('un bloc poussé glisse jusqu\'à l\'obstacle, pas d\'une case', () => {
    const e = bac(`
        ########
        #A....a#
        ########`, { A: [7, 8] });
    const r = simuler(e, 'A', 'droite');
    assert.equal(r.x, 6, 'il traverse tout le couloir');
    assert.equal(r.scelle, true);
});

test('un coup qui ne déplace rien n\'est pas un coup', () => {
    const e = bac(`
        #####
        #A.a#
        #####`, { A: [7, 8] });
    assert.equal(simuler(e, 'A', 'gauche'), null, 'le mur est déjà collé au bloc');
    assert.equal(simuler(e, 'A', 'haut'), null);
    assert.equal(pousser(e, 'A', 'haut').bouge, false);
    assert.equal(e.coups, 0, 'un coup refusé ne se compte pas');
});

test('un bloc ne se scelle que sur SA dalle — sur une autre il se pose sans rien', () => {
    // A vaut 56, B vaut 24 : A finit sa course sur la dalle de B.
    const e = bac(`
        ########
        #A....b#
        ########`, { A: [7, 8], B: [6, 4] });
    const r = pousser(e, 'A', 'droite');
    assert.equal(r.bouge, true);
    assert.equal(r.scelle, false, '56 ne se pose pas sur 24');
    assert.equal(blocEn(e, 6, 1).dur, false, 'il reste déplaçable');
    assert.equal(pousser(e, 'A', 'gauche').bouge, true, 'et on peut le ressortir de là');
});

test('un bloc scellé ne bouge plus et arrête les autres', () => {
    const e = bac(`
        #########
        #BA....a#
        #########`, { A: [7, 8], B: [6, 4] });
    pousser(e, 'A', 'droite');
    const a = blocEn(e, 7, 1);
    assert.equal(a.dur, true, 'A s\'est scellé sur sa dalle');
    assert.equal(simuler(e, 'A', 'gauche'), null, 'un bloc scellé refuse tout coup');

    const r = pousser(e, 'B', 'droite');
    assert.equal(r.x, 6, 'B s\'arrête contre A au lieu de finir au mur');
});

test('gagné quand chaque dalle porte son bloc scellé, pas avant', () => {
    const e = bac(`
        ########
        #A....a#
        #B....b#
        ########`, { A: [7, 8], B: [6, 4] });
    assert.equal(gagne(e), false);
    pousser(e, 'A', 'droite');
    assert.equal(gagne(e), false, 'une dalle sur deux ne suffit pas');
    pousser(e, 'B', 'droite');
    assert.equal(gagne(e), true);
    assert.equal(e.coups, 2);
});

test('le solveur trouve le chemin, et rend la main quand il n\'y en a pas', () => {
    const ok = bac(`
        ########
        #A....a#
        ########`, { A: [7, 8] });
    assert.deepEqual(resoudre(ok), [{ id: 'A', dir: 'droite' }]);

    // La dalle est dans un renfoncement : rien ne peut y arrêter le bloc.
    const mort = bac(`
        ########
        #A.....#
        #..a..##
        ########`, { A: [7, 8] });
    assert.equal(resoudre(mort), null);
});

test('une position sans issue est reconnue comme telle', () => {
    // B sert de butoir à A : c'est lui qui l'empêche de dépasser sa dalle.
    // Sceller B en premier, c'est retirer ce butoir — définitivement, puisqu'un
    // bloc scellé ne bouge plus. On ne perd pas, on s'enferme, et il faut le
    // dire à l'élève au lieu de le laisser pousser dans une position morte.
    const plan = `
        ########
        #A..aBb#
        ########`;
    const produits = { A: [7, 8], B: [6, 4] };

    const bon = bac(plan, produits);
    assert.equal(bloqueDefinitivement(bon), false, 'au départ il y a une solution');
    pousser(bon, 'A', 'droite');
    assert.equal(blocEn(bon, 4, 1).dur, true, 'A s\'arrête contre B, pile sur sa dalle');
    pousser(bon, 'B', 'droite');
    assert.equal(gagne(bon), true);

    const rate = bac(plan, produits);
    pousser(rate, 'B', 'droite');
    assert.equal(blocEn(rate, 6, 1).dur, true, 'B s\'est scellé — et n\'est plus un butoir');
    assert.equal(bloqueDefinitivement(rate), true);
});

test('cloner isole vraiment : simuler et résoudre ne touchent pas au plateau', () => {
    const e = bac(`
        ########
        #A....a#
        ########`, { A: [7, 8] });
    const copie = cloner(e);
    pousser(copie, 'A', 'droite');
    assert.deepEqual([e.blocs[0].x, e.blocs[0].y], [1, 1], 'l\'original n\'a pas bougé');
    resoudre(e);
    assert.deepEqual([e.blocs[0].x, e.blocs[0].y], [1, 1], 'le solveur non plus');
});

// --- Le contrôle des niveaux livrés ------------------------------------------
//
// C'est LE test du fichier. Un niveau de ce jeu n'est pas relisible à l'œil :
// la règle « un bloc scellé devient un mur » rend l'insolubilité invisible sur
// le papier. Trois de mes six premiers plans étaient impossibles ; seul le
// solveur l'a vu.

test('chaque niveau livré est soluble', () => {
    for (const e of niveauxLus()) {
        const sol = resoudre(e, 200000);
        assert.ok(sol, `le niveau ${e.id} (${e.titre}) n'a aucune solution`);
        assert.ok(sol.length >= 1, `le niveau ${e.id} est déjà gagné au départ`);
    }
});

test('les niveaux sont rangés du plus court au plus long', () => {
    const longueurs = niveauxLus().map(e => resoudre(e, 200000).length);
    for (let i = 1; i < longueurs.length; i++) {
        assert.ok(longueurs[i] >= longueurs[i - 1],
            `le niveau ${NIVEAUX[i].id} (${longueurs[i]} coups) est plus court que le précédent (${longueurs[i - 1]})`);
    }
});

test('les trois premiers niveaux pardonnent : aucun coup ne peut les condamner', () => {
    // On apprend la règle avant d'apprendre à s'en méfier. Sur ces niveaux-là,
    // n'importe quelle suite de coups laisse encore une issue.
    for (const e of niveauxLus().slice(0, 3)) {
        for (const b of e.blocs) {
            for (const dir of DIRECTIONS) {
                if (!simuler(e, b.id, dir)) continue;
                const suite = cloner(e);
                pousser(suite, b.id, dir);
                assert.ok(resoudre(suite, 200000),
                    `sur ${e.id}, pousser ${b.id} vers la ${dir} rend le niveau impossible`);
            }
        }
    }
});

test('les niveaux d\'ambiguïté proposent bien deux blocs de même valeur', () => {
    const seize = NIVEAUX.find(n => n.id === 'ch5');
    const valeurs = Object.values(seize.produits).map(([a, b]) => a * b);
    assert.deepEqual(valeurs, [16, 16], '4 × 4 et 2 × 8 valent tous les deux 16');

    const chantier = NIVEAUX.find(n => n.id === 'ch12');
    const v = Object.values(chantier.produits).map(([a, b]) => a * b);
    assert.equal(v.filter(x => x === 64).length, 2, '8 × 8 et 4 × 16 valent tous les deux 64');

    // L'ambiguïté n'est pas un cas isolé : c'est l'idée du jeu, et elle doit
    // revenir assez souvent pour qu'on cesse de la prendre pour un accident.
    const ambigus = NIVEAUX.filter(n => {
        const p = Object.values(n.produits).map(([a, b]) => a * b);
        return new Set(p).size < p.length;
    });
    assert.ok(ambigus.length >= 6,
        `seulement ${ambigus.length} niveaux à valeurs jumelles sur ${NIVEAUX.length}`);
});

test('chaque bloc a exactement une dalle et chaque dalle exactement un bloc', () => {
    for (const e of niveauxLus()) {
        assert.equal(e.blocs.length, e.dalles.length, `${e.id} : autant de dalles que de blocs`);
        for (const b of e.blocs) {
            assert.ok(e.dalles.some(d => d.id === b.id.toLowerCase()),
                `${e.id} : le bloc ${b.id} n'a pas de dalle`);
        }
        const cases = new Set();
        for (const o of [...e.blocs, ...e.dalles]) {
            const cle = `${o.x},${o.y}`;
            assert.ok(!cases.has(cle), `${e.id} : deux objets sur la case ${cle}`);
            cases.add(cle);
            assert.notEqual(e.grille[o.y][o.x], MUR, `${e.id} : un objet posé dans un mur`);
        }
    }
});

test('les produits affichés sont des tables raisonnables', () => {
    for (const n of NIVEAUX) {
        for (const [lettre, [a, b]] of Object.entries(n.produits)) {
            assert.ok(a >= 2 && b >= 2, `${n.id}/${lettre} : un facteur trop petit`);
            assert.ok(a * b <= 100, `${n.id}/${lettre} : ${a} × ${b} dépasse la table`);
        }
    }
});

test('dalleEn et blocEn lisent bien la case demandée', () => {
    const e = bac(`
        ######
        #A..a#
        ######`, { A: [7, 8] });
    assert.equal(blocEn(e, 1, 1).id, 'A');
    assert.equal(blocEn(e, 2, 1), null);
    assert.equal(dalleEn(e, 4, 1).valeur, 56);
    assert.equal(dalleEn(e, 1, 1), null);
});

test('le nombre de coups annoncé par chaque niveau est le vrai', () => {
    // `coups` est écrit dans la donnée pour que le menu du professeur puisse
    // afficher la difficulté sans lancer cent recherches en largeur au
    // chargement de la page. Une donnée recopiée est une donnée qui dérive :
    // c'est ce test qui la tient.
    for (const def of NIVEAUX) {
        const sol = resoudre(lireNiveau(def), 200000);
        assert.ok(sol, `${def.id} : insoluble`);
        assert.equal(def.coups, sol.length,
            `${def.id} annonce ${def.coups} coups pour une solution en ${sol.length}`);
    }
});

test('les cent niveaux ont des titres et des identifiants uniques', () => {
    // Deux niveaux de même nom, c'est un professeur qui ne retrouve pas celui
    // qu'il voulait remontrer.
    assert.equal(new Set(NIVEAUX.map(n => n.id)).size, NIVEAUX.length, 'identifiants en double');
    assert.equal(new Set(NIVEAUX.map(n => n.titre)).size, NIVEAUX.length, 'titres en double');
    assert.ok(NIVEAUX.every(n => n.indice && n.indice.length > 20), 'un niveau sans indice utile');
});
