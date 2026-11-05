// BUMPY — ce qui doit rester vrai du monde, et qu'on ne voit pas à l'œil.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ».
//
// ── POURQUOI CES ÉPREUVES-LÀ ───────────────────────────────────────────────
//
// Un jeu d'adresse ne se vérifie pas en le regardant : on voit une balle qui
// rebondit, et l'on en conclut qu'elle rebondit bien. Les deux défauts qui ont
// rendu ce jeu injouable le prouvent — et AUCUN DES DEUX NE SE VOYAIT.
//
//   · LA BALLE PASSAIT SOUS LE SOL. À cheval sur deux cases — ce qui arrive
//     aux deux tiers des abscisses —, elle était résolue deux fois : la
//     première posait le rebond, la seconde, voyant `vy` déjà négative,
//     croyait à un plafond et la repoussait vers le bas. MESURÉ : sol à
//     y = 128, balle oscillant entre 149 et 171, enterrée, ne ramassant plus
//     rien. À l'écran : une balle qui bouge.
//   · ET AUCUN TABLEAU N'ÉTAIT GRAVISSABLE. Le rebond élevait la balle de 1,84
//     case quand les tableaux demandaient d'en monter trois. La sonde d'écran
//     ne pouvait pas le dire : elle ne sait pas distinguer « le jeu est cassé »
//     de « la balle ne peut pas aller là ».
//
// Les épreuves qui suivent gardent exactement ces deux choses, plus les deux
// règles que l'élève doit pouvoir croire : le feu tue sans la goutte, et la
// sortie ne s'ouvre pas avant le dernier objet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CASE, GRAVITE, NIVEAUX, RAYON, REBOND, TUILE, VX,
    avancer, etatInitial, lireNiveau
} from '../js/core/bumpy.js';
import { chercher } from '../tools/bumpyJouable.mjs';

/** Un tableau d'essai écrit à la main, lu comme les vrais. */
const essai = (lignes) => lireNiveau({ nom: 'essai', lignes });

/**
 * Fait tourner le monde pendant `secondes`, touche tenue.
 *
 * ET L'ON REND LE PLUS BAS OÙ ELLE EST DESCENDUE, pas seulement où elle
 * finit : la balle rebondit sans fin, donc son état final dit l'instant où le
 * chronomètre s'est arrêté, pas ce qu'elle a fait. Première version de
 * l'épreuve du feu : elle était bien passée dessous, puis remontée, et
 * l'épreuve la déclarait bloquée au-dessus.
 */
function jouer(n, etat, secondes, entree = 0) {
    let e = etat;
    const faits = [];
    let basMax = e.y;
    for (let t = 0; t < secondes / 0.02; t++) {
        const r = avancer(e, n, 0.02, entree);
        e = r.etat;
        basMax = Math.max(basMax, e.y);
        faits.push(...r.faits);
        if (e.mort || e.fini) break;
    }
    return { etat: e, faits, basMax };
}

test('la balle ne passe jamais sous le sol, même à cheval sur deux cases', () => {
    // LES VINGT-DEUX ABSCISSES D'UNE CASE, UNE PAR UNE. C'est la seule façon
    // de couvrir le défaut : il ne se produisait QUE lorsque le disque
    // chevauchait deux cases, donc pas au centre d'une case — et c'est au
    // centre qu'on essaie quand on essaie une fois.
    const n = essai([
        '##########',
        '#........#',
        '#........#',
        '#........#',
        '##########'
    ]);
    const solHaut = 4 * CASE;
    for (let d = 0; d < 32; d++) {
        const x = 5 * CASE + d;
        const depart = {
            x, y: 1.5 * CASE, vx: 0, vy: 0,
            restants: 0, eau: false, ouverte: true, fini: false, mort: false
        };
        const { etat } = jouer(n, depart, 3);
        assert.ok(etat.y <= solHaut - RAYON,
            `à x = ${x} la balle descend à y = ${etat.y.toFixed(1)}, `
            + `alors que le sol est à ${solHaut} (centre maximal ${solHaut - RAYON})`);
    }
});

test('le rebond est une constante du monde, et non un ricochet amorti', () => {
    // On la lâche de deux hauteurs très différentes : elle doit repartir à la
    // MÊME vitesse. C'est ce qui fait Bumpy — sans cela elle s'amortit, finit
    // par ramper, et le jeu meurt.
    const n = essai([
        '##########',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '##########'
    ]);
    for (const ligneDeLacher of [1.5, 4.5]) {
        let e = {
            x: 5.5 * CASE, y: ligneDeLacher * CASE, vx: 0, vy: 0,
            restants: 0, eau: false, ouverte: true, fini: false, mort: false
        };
        for (let t = 0; t < 300; t++) {
            const r = avancer(e, n, 0.02, 0);
            e = r.etat;
            if (r.faits.includes('rebond')) break;
        }
        assert.equal(Math.round(e.vy), -REBOND,
            `lâchée de la ligne ${ligneDeLacher}, elle repart à ${e.vy.toFixed(0)}`);
    }
});

test('un rebond franchit deux cases — c\'est la marche des escaliers', () => {
    // LA HAUTEUR DU REBOND EST UN CONTRAT AVEC LES TABLEAUX. Ils sont dessinés
    // par marches de deux cases ; si ce nombre baisse, ils cessent tous d'être
    // gravissables d'un coup, et plus rien à l'écran ne le dit.
    const haut = (REBOND * REBOND) / (2 * GRAVITE);
    assert.ok(haut > 2 * CASE + 8,
        `un rebond n'élève la balle que de ${haut.toFixed(1)} px : une marche de `
        + `deux cases en demande ${2 * CASE} plus le rayon de confort`);
    // Et l'on vérifie que ce n'est pas qu'un calcul : la balle le fait.
    const n = essai([
        '##########',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '##########'
    ]);
    let e = etatInitial({ ...n, depart: { c: 5, r: 4 } });
    e = { ...e, y: 5 * CASE - RAYON - 0.01, vy: 0 };
    let plusHaut = e.y;
    for (let t = 0; t < 200; t++) {
        e = avancer(e, n, 0.02, 0).etat;
        plusHaut = Math.min(plusHaut, e.y);
    }
    const monte = (5 * CASE - RAYON) - plusHaut;
    assert.ok(monte > 2 * CASE,
        `en vrai elle ne monte que de ${monte.toFixed(1)} px`);
});

test('le feu tue sans la goutte, et se laisse traverser avec', () => {
    const lignes = [
        '##########',
        '#........#',
        '#........#',
        '#..~~~~..#',
        '#........#',
        '##########'
    ];
    const depart = {
        x: 5.5 * CASE, y: 1.5 * CASE, vx: 0, vy: 0,
        restants: 0, eau: false, ouverte: true, fini: false, mort: false
    };
    const sec = jouer(essai(lignes), depart, 2);
    assert.equal(sec.etat.mort, true, 'sans la goutte, le feu ne tue pas');
    assert.ok(sec.faits.includes('feu'));

    const mouille = jouer(essai(lignes), { ...depart, eau: true }, 2);
    assert.equal(mouille.etat.mort, false, 'avec la goutte, le feu tue encore');
    // ET ELLE PASSE VRAIMENT DESSOUS : un feu « inoffensif » qui resterait
    // solide serait un plancher, donc une fausse promesse. Le feu occupe la
    // ligne 3, soit y de 96 à 128 — elle doit être descendue sous 128.
    assert.ok(mouille.basMax > 4 * CASE,
        `elle ne descend jamais sous le feu (au plus bas, y = ${mouille.basMax.toFixed(1)})`);
});

test('la sortie ne s\'ouvre qu\'au dernier objet, pas avant', () => {
    const n = essai([
        '##########',
        '#........#',
        '#.o....o.#',
        '#.#....#.#',
        '#....E...#',
        '##########'
    ]);
    assert.equal(n.objets, 2);
    let e = etatInitial({ ...n, depart: { c: 2, r: 2 } });
    e = { ...e, x: 2.5 * CASE, y: 2.5 * CASE };
    // On la pose sur le premier objet : un seul ramassé, la sortie reste close.
    let r = jouer(n, e, 1.2);
    assert.equal(r.etat.restants, 1, 'le premier objet n\'a pas été ramassé');
    assert.equal(r.etat.ouverte, false, 'la sortie s\'ouvre avant le dernier objet');
    // ET MÊME EN PASSANT DESSUS, elle ne finit pas : c'est l'erreur qui
    // donnerait un tableau gagné sans l'avoir joué.
    const surLaPorte = jouer(n, { ...r.etat, x: 5.5 * CASE, y: 4.2 * CASE }, 0.6);
    assert.equal(surLaPorte.etat.fini, false,
        'la porte fermée laisse quand même sortir');
});

test('chaque tableau a un départ, une sortie et de quoi ramasser', () => {
    NIVEAUX.forEach((def, i) => {
        const n = lireNiveau(def);
        assert.ok(def.nom, `tableau ${i + 1} sans nom`);
        assert.ok(n.depart, `tableau ${i + 1} sans départ (${TUILE.DEPART})`);
        assert.ok(n.sortie, `tableau ${i + 1} sans sortie (${TUILE.SORTIE})`);
        assert.ok(n.objets >= 1, `tableau ${i + 1} sans objet à ramasser`);
        // TOUTES LES LIGNES DE MÊME LONGUEUR : une ligne plus courte d'un
        // caractère décale le mur de droite et ouvre le tableau sur le vide.
        const l = def.lignes[0].length;
        def.lignes.forEach((ligne, r) => assert.equal(ligne.length, l,
            `tableau ${i + 1}, ligne ${r} : ${ligne.length} cases au lieu de ${l}`));
    });
});

test('et les quatre tableaux se finissent vraiment', () => {
    // LA SEULE ÉPREUVE QUI DIT QUE LE JEU EST JOUABLE. Elle rejoue `avancer`,
    // le vrai code, en explorant les décisions du joueur rebond par rebond —
    // voir `tools/bumpyJouable.mjs`. Onze secondes : c'est cher, et c'est le
    // prix de la seule question qui compte.
    NIVEAUX.forEach((def, i) => {
        const r = chercher(def);
        assert.equal(r.trouve, true,
            `tableau ${i + 1} — ${def.nom} : aucun chemin ne le finit`
            + (r.mieux ? ` (au mieux ${r.mieux.objets} objet(s), sortie `
                + `${r.mieux.ouverte ? 'ouverte' : 'fermée'})` : ''));
    });
});

test('la vitesse horizontale laisse passer un couloir d\'une case', () => {
    // RAYON CONTRE CASE : si la balle devenait plus grosse qu'une demi-case,
    // les couloirs d'une case se fermeraient et des tableaux entiers
    // deviendraient infranchissables sans qu'aucun dessin ne change.
    assert.ok(RAYON * 2 < CASE - 6,
        `une balle de ${RAYON * 2} px ne passe pas dans une case de ${CASE}`);
    // Et le vol doit porter assez loin pour viser la plateforme voisine.
    const vol = (2 * REBOND) / GRAVITE;
    assert.ok(VX * vol > 3 * CASE,
        `un saut ne porte qu'à ${(VX * vol).toFixed(0)} px, soit moins de trois cases`);
});
