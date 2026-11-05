// BUMPY — ce qui doit rester vrai du monde, et qu'on ne voit pas à l'œil.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre, avec les captures du jeu d'origine : « tu peux pas faire
// comme le jeu original mais avec un design moderne ». Puis : « les parois
// cassable de bumpy sont grosses en hauteur, il faut bien voir le rebond, tu
// pense aussi au porte ».
//
// ── POURQUOI CES ÉPREUVES-LÀ ───────────────────────────────────────────────
//
// Un jeu d'adresse ne se vérifie pas en le regardant : on voit une balle qui
// rebondit, et l'on en conclut qu'elle rebondit bien. Deux défauts ont rendu
// ce jeu injouable sans qu'aucun ne SE VOIE :
//
//   · LA BALLE PASSAIT SOUS LE SOL. À cheval sur deux cases — ce qui arrive
//     aux deux tiers des abscisses —, elle était résolue deux fois, et la
//     seconde la repoussait sous le sol. MESURÉ : sol à y = 128, balle
//     oscillant entre 149 et 171, enterrée.
//   · ET AUCUN TABLEAU N'ÉTAIT GRAVISSABLE, le rebond étant trop court.
//
// On garde donc la physique, les quatre règles du monde, et la seule question
// qui compte : les tableaux se finissent-ils ?

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CASE, FRUITS, GRAVITE, NIVEAUX, RAYON, REBOND, TUILE, VX,
    avancer, estParoi, etatInitial, lireNiveau
} from '../js/core/bumpy.js';
import { chercher } from '../tools/bumpyJouable.mjs';

/** Un tableau d'essai écrit à la main, lu comme les vrais. */
const essai = (lignes, clefs = 0) => lireNiveau({ nom: 'essai', clefs, lignes });

/**
 * Fait tourner le monde pendant `secondes`, touche tenue.
 *
 * ET L'ON REND LE PLUS BAS OÙ ELLE EST DESCENDUE, pas seulement où elle
 * finit : la balle rebondit sans fin, donc son état final dit l'instant où le
 * chronomètre s'est arrêté, pas ce qu'elle a fait.
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
    // LES TRENTE-SIX ABSCISSES D'UNE CASE, UNE PAR UNE. C'est la seule façon
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
    for (let d = 0; d < CASE; d++) {
        const depart = {
            x: 5 * CASE + d, y: 1.5 * CASE, vx: 0, vy: 0,
            clefs: 0, fruits: 0, ouverte: true, fini: false, mort: false
        };
        const { etat } = jouer(n, depart, 3);
        assert.ok(etat.y <= solHaut - RAYON,
            `à x = ${5 * CASE + d} la balle descend à y = ${etat.y.toFixed(1)}, `
            + `alors que le sol est à ${solHaut}`);
    }
});

test('le rebond est une constante du monde, et non un ricochet amorti', () => {
    // On la lâche de deux hauteurs très différentes : elle doit repartir à la
    // MÊME vitesse. C'est ce qui fait Bumpy — sans cela elle s'amortit, finit
    // par ramper, et le jeu meurt.
    const n = essai([
        '##########', '#........#', '#........#', '#........#',
        '#........#', '#........#', '##########'
    ]);
    for (const ligne of [1.5, 4.5]) {
        let e = {
            x: 5.5 * CASE, y: ligne * CASE, vx: 0, vy: 0,
            clefs: 0, fruits: 0, ouverte: true, fini: false, mort: false
        };
        for (let t = 0; t < 300; t++) {
            const r = avancer(e, n, 0.02, 0);
            e = r.etat;
            if (r.faits.includes('rebond')) break;
        }
        assert.equal(Math.round(e.vy), -REBOND,
            `lâchée de la ligne ${ligne}, elle repart à ${e.vy.toFixed(0)}`);
    }
});

test('LE REBOND SE VOIT — il élève la balle de plus de trois cases', () => {
    // RÉMY : « il faut bien voir le rebond ». C'est aussi un contrat avec les
    // tableaux, dessinés par marches de deux et trois cases : si ce nombre
    // baisse, ils cessent tous d'être gravissables d'un coup, et plus rien à
    // l'écran ne le dit.
    const haut = (REBOND * REBOND) / (2 * GRAVITE);
    assert.ok(haut > 3 * CASE,
        `un rebond n'élève la balle que de ${haut.toFixed(1)} px, soit `
        + `${(haut / CASE).toFixed(2)} case(s)`);
    // Et ce n'est pas qu'un calcul : la balle le fait.
    const n = essai([
        '##########', '#........#', '#........#', '#........#',
        '#........#', '##########'
    ]);
    let e = {
        x: 5.5 * CASE, y: 5 * CASE - RAYON - 0.01, vx: 0, vy: 0,
        clefs: 0, fruits: 0, ouverte: true, fini: false, mort: false
    };
    let plusHaut = e.y;
    for (let t = 0; t < 200; t++) {
        e = avancer(e, n, 0.02, 0).etat;
        plusHaut = Math.min(plusHaut, e.y);
    }
    assert.ok((5 * CASE - RAYON) - plusHaut > 3 * CASE,
        `en vrai elle ne monte que de ${((5 * CASE - RAYON) - plusHaut).toFixed(1)} px`);
});

test('UNE PAROI S\'ABAT UNE CASE À LA FOIS, ET PAR LE HAUT', () => {
    // Rémy : « les parois cassable sont grosses en hauteur ». Une barre de
    // trois cases doit donc s'user du sommet vers le bas — c'est ce qui se
    // VOIT (le mur baisse) et c'est ce qui donne son rythme au jeu : un
    // rebond, une case.
    //
    // LE TABLEAU D'ESSAI EST HAUT, ET C'EST VOULU : dans sa première version
    // le plafond était juste au-dessus du mur, la balle y faisait des
    // aller-retours de vingt centimètres et abattait les trois cases en une
    // seconde. L'épreuve mesurait alors la hauteur du plafond, pas la règle.
    const n = essai([
        '##########', '#........#', '#........#', '#........#',
        '#........#', '#....R...#', '#....R...#', '#....R...#', '##########'
    ]);
    const hauteurMur = () => n.cases.flat().filter(estParoi).length;
    assert.equal(hauteurMur(), 3);

    /** Avance jusqu'au prochain éclat de paroi, et rend l'état. */
    const jusquAuCasse = (e) => {
        for (let t = 0; t < 4 / 0.02; t++) {
            const r = avancer(e, n, 0.02, 0);
            e = r.etat;
            if (r.faits.includes('casse')) return { etat: e, ok: true };
            if (e.mort || e.fini) break;
        }
        return { etat: e, ok: false };
    };

    const e0 = {
        x: 5.5 * CASE, y: 1.5 * CASE, vx: 0, vy: 0,
        clefs: 0, fruits: 0, ouverte: true, fini: false, mort: false
    };
    const a = jusquAuCasse(e0);
    assert.ok(a.ok, 'la paroi n\'a pas été entamée');
    assert.equal(hauteurMur(), 2, 'le premier rebond n\'a pas abattu UNE case');
    assert.equal(n.cases[5][5], TUILE.VIDE, 'ce n\'est pas la case du haut qui est tombée');
    assert.equal(n.cases[6][5], TUILE.PAROI_R, 'la case du dessous a disparu aussi');

    const b = jusquAuCasse(a.etat);
    assert.ok(b.ok, 'le deuxième rebond n\'abat rien');
    assert.equal(hauteurMur(), 1, 'le mur ne baisse pas d\'une case par rebond');
    assert.ok(b.etat.y > a.etat.y, 'la balle ne descend pas en creusant');
});

test('LA PORTE FERMÉE EST UN MUR, et les clés l\'ouvrent', () => {
    // LA PORTE D'ESSAI EST HAUTE, et c'est une leçon : dans sa première
    // version elle ne faisait qu'une case, et la balle lui passait AU-DESSUS
    // en rebondissant. L'épreuve concluait « la porte fermée laisse passer »
    // alors que la porte tenait très bien son rôle — c'est le tableau d'essai
    // qui ne tenait pas le sien.
    const colonne = (avecCle) => [
        '##########',
        '#.B..P...#',
        avecCle ? '#..c.P...#' : '#....P...#',
        '#....P...#',
        '##########'
    ];

    // Sans clé, la porte ne s'ouvre jamais et la balle reste de son côté.
    const ferme = essai(colonne(false), 1);
    const a = jouer(ferme, etatInitial(ferme), 3, 1);
    assert.equal(a.etat.fini, false, 'on sort par une porte fermée');
    assert.ok(a.etat.x < 5 * CASE,
        `la balle est passée en x = ${a.etat.x.toFixed(0)}, au-delà de la porte`);

    // Avec la clé, elle s'ouvre, et l'on finit en passant dessus.
    const ouvert = essai(colonne(true), 1);
    const b = jouer(ouvert, etatInitial(ouvert), 4, 1);
    assert.ok(b.faits.includes('cle'), 'la clé n\'a pas été ramassée');
    assert.ok(b.faits.includes('ouverte'), 'la porte ne s\'est pas ouverte');
    assert.equal(b.etat.fini, true, 'la porte ouverte ne finit pas le tableau');
});

test('LES PICS TUENT, et un fruit ne se reprend pas', () => {
    const n = essai([
        '##########',
        '#....B...#',
        '#....1...#',
        '#....^...#',
        '##########'
    ]);
    const r = jouer(n, etatInitial(n), 2);
    assert.ok(r.faits.includes('fruit'), 'le fruit n\'a pas été pris au vol');
    assert.equal(r.etat.fruits, 1);
    assert.equal(r.etat.mort, true, 'le pic n\'a pas tué');
    assert.ok(r.faits.includes('pic'));
    // ET UN SEUL FRUIT : sans cela un élève ferait du surplace pour compter
    // des points, et le jeu cesserait d'être un jeu.
    assert.equal(r.faits.filter(f => f === 'fruit').length, 1,
        'le même fruit a été ramassé plusieurs fois');
});

test('CHAQUE TABLEAU EST BIEN FORMÉ : un départ, une porte, assez de clés', () => {
    NIVEAUX.forEach((def, i) => {
        const n = lireNiveau(def);
        assert.ok(def.nom, `tableau ${i + 1} sans nom`);
        assert.ok(n.porte, `tableau ${i + 1} sans porte (${TUILE.PORTE})`);
        assert.ok(n.clefs >= n.ilEnFaut,
            `tableau ${i + 1} : ${n.clefs} clés sur le plateau pour ${n.ilEnFaut} exigées`);
        assert.ok(n.ilEnFaut >= 1, `tableau ${i + 1} : aucune clé à ramasser`);
        assert.ok(n.fruits >= 1, `tableau ${i + 1} : aucun fruit`);
        const l = def.lignes[0].length;
        def.lignes.forEach((ligne, r) => assert.equal(ligne.length, l,
            `tableau ${i + 1}, ligne ${r} : ${ligne.length} cases au lieu de ${l}`));
        // LE DÉPART EST ÉCRIT, et il n'est pas au-dessus d'une paroi : laissé
        // au milieu par défaut, il tombait pile sur le mur du premier tableau,
        // que la balle abattait gratuitement avant qu'on ait touché une touche.
        assert.ok(def.lignes.some(ligne => ligne.includes(TUILE.DEPART)),
            `tableau ${i + 1} : pas de départ écrit`);
        const sousLeDepart = [];
        for (let r = n.depart.r + 1; r < n.hauteur; r++) {
            sousLeDepart.push(n.cases[r][n.depart.c]);
        }
        const premierSolide = sousLeDepart.find(t =>
            t === TUILE.ROCHE || t === TUILE.PLATEFORME || t === TUILE.BARRE || estParoi(t));
        assert.ok(!estParoi(premierSolide),
            `tableau ${i + 1} : la balle tombe droit sur une paroi cassable`);
    });
});

test('ET LES TROIS TABLEAUX SE FINISSENT VRAIMENT', () => {
    // LA SEULE ÉPREUVE QUI DIT QUE LE JEU EST JOUABLE. Elle rejoue `avancer`,
    // le vrai code, en explorant les décisions du joueur rebond par rebond —
    // voir `tools/bumpyJouable.mjs`. Quelques secondes : c'est cher, et c'est
    // le prix de la seule question qui compte.
    NIVEAUX.forEach((def, i) => {
        const r = chercher(def);
        assert.equal(r.trouve, true,
            `tableau ${i + 1} — ${def.nom} : la porte n'est jamais atteinte`
            + (r.mieux ? ` (au mieux ${r.mieux.clefs} clé(s), porte `
                + `${r.mieux.ouverte ? 'ouverte' : 'fermée'})` : ''));
    });
});

test('la balle passe dans un couloir d\'une case, et son saut porte assez loin', () => {
    assert.ok(RAYON * 2 < CASE - 6,
        `une balle de ${RAYON * 2} px ne passe pas dans une case de ${CASE}`);
    const vol = (2 * REBOND) / GRAVITE;
    assert.ok(VX * vol > 3 * CASE,
        `un saut ne porte qu'à ${(VX * vol).toFixed(0)} px, soit moins de trois cases`);
    // ET LES CINQ FRUITS SONT TOUS DESSINÉS : un fruit sans silhouette serait
    // une case vide qui compte des points, c'est-à-dire un piège.
    assert.equal(FRUITS.length, 5);
});
