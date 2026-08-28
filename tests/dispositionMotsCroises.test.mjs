// OÙ VONT LES DÉFINITIONS D'UNE GRILLE DE MOTS CROISÉS.
//
// Rémy : « on peut peut être mettre en option écrire définition à côté (la
// grille se décale à droite ou à gauche) ou en dessous et évidemment on essaye
// d'occuper le maximum d'espace ».
//
// La dernière phrase est une promesse VÉRIFIABLE, et c'est tout l'objet de ce
// fichier : « Automatique » doit rendre, sur n'importe quelle grille et
// n'importe quel bloc, une case au moins aussi grande que chacune des trois
// dispositions prises isolément. Sans cette mesure, « on essaye » resterait
// une intention.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    MC_DEF, lignesDefs, essaiDisposition, disposerMotsCroises
} from '../js/core/dispositionMotsCroises.js';

/** Un bloc de fiche : A4 paysage, une seule grille sur la page. */
const PAYSAGE = { x: 9, y: 26, w: 279, h: 178 };
const PORTRAIT = { x: 9, y: 26, w: 192, h: 265 };
const DEMI = { x: 9, y: 26, w: 137, h: 178 };

/** Une liste de définitions plausible, longueur réglable. */
const defs = (n, depuis, longueur = 52) => Array.from({ length: n }, (_, i) => ({
    num: depuis + i,
    def: 'D'.padEnd(longueur, 'e'),
    longueur: 12
}));

const grille = (largeur, hauteur, nbH = 5, nbV = 5, longueur = 52) => ({
    largeur, hauteur,
    horizontales: defs(nbH, 1, longueur),
    verticales: defs(nbV, nbH + 1, longueur)
});

// --- La mesure des définitions ----------------------------------------------

test('une colonne deux fois plus étroite prend environ deux fois plus de lignes', () => {
    // Des définitions LONGUES : sur des définitions courtes, l'arrondi à la
    // ligne entière domine le rapport et la mesure ne dirait plus rien.
    const liste = defs(6, 1, 260);
    const large = lignesDefs(liste, 80);
    const etroit = lignesDefs(liste, 40);
    assert.ok(etroit >= large * 1.8 && etroit <= large * 2.2,
        `${large} lignes à 80 mm, ${etroit} à 40 mm`);
});

test('une définition occupe au moins une ligne, même très courte', () => {
    assert.equal(lignesDefs([{ num: 1, def: 'Un', longueur: 2 }], 200), 1);
    assert.equal(lignesDefs([], 80), 0);
});

// --- Les trois dispositions --------------------------------------------------

test('les trois dispositions se calculent, et posent tout dans le bloc', () => {
    const m = grille(15, 13);
    for (const pose of ['dessous', 'gauche', 'droite']) {
        const r = essaiDisposition(PAYSAGE, m, pose);
        assert.ok(r, pose);
        assert.equal(r.pose, pose);
        // La grille tient dans le bloc.
        assert.ok(r.x >= PAYSAGE.x - 0.01 && r.x + r.w <= PAYSAGE.x + PAYSAGE.w + 0.01, `${pose} : largeur`);
        assert.ok(r.y >= PAYSAGE.y - 0.01 && r.y + r.h <= PAYSAGE.y + PAYSAGE.h + 0.01, `${pose} : hauteur`);
        // Les définitions aussi.
        assert.ok(r.defs.x >= PAYSAGE.x - 0.01, `${pose} : définitions à gauche du bloc`);
        assert.ok(r.defs.x + r.defs.largeur <= PAYSAGE.x + PAYSAGE.w + 0.01,
            `${pose} : définitions hors du bloc`);
    }
});

test('« gauche » et « droite » se répondent en miroir : même grille, autre côté', () => {
    const m = grille(15, 13);
    const g = essaiDisposition(PAYSAGE, m, 'gauche');
    const d = essaiDisposition(PAYSAGE, m, 'droite');
    assert.equal(g.cote.toFixed(4), d.cote.toFixed(4), 'la taille de case ne dépend pas du côté');
    assert.ok(g.defs.x < g.x, 'à gauche : les définitions avant la grille');
    assert.ok(d.defs.x > d.x, 'à droite : les définitions après la grille');
});

test('la grille et les définitions ne se chevauchent jamais', () => {
    for (const b of [PAYSAGE, PORTRAIT, DEMI]) {
        for (const m of [grille(15, 13), grille(21, 8), grille(8, 21), grille(11, 11, 8, 8, 90)]) {
            for (const pose of ['dessous', 'gauche', 'droite']) {
                const r = essaiDisposition(b, m, pose);
                if (!r) continue;
                const zone = { x0: r.defs.x, x1: r.defs.x + r.defs.largeur };
                const chevauche = r.x < zone.x1 - 0.01 && r.x + r.w > zone.x0 + 0.01;
                if (pose === 'dessous') {
                    // Elles se superposent en X, mais jamais en Y.
                    assert.ok(r.y + r.h <= r.defs.y + 0.01,
                        `dessous : la grille mord sur les définitions`);
                } else {
                    assert.ok(!chevauche, `${pose} : la grille mord sur les définitions`);
                }
            }
        }
    }
});

test('en une colonne, la seconde liste commence sous la réserve de la première', () => {
    // C'est ce décalage — et lui seul — qui fait tomber l'aperçu et le PDF au
    // même endroit : le navigateur empile, jsPDF compte, et les deux doivent
    // partir de la même hauteur.
    const m = grille(15, 13);
    const r = essaiDisposition(PAYSAGE, m, 'gauche');
    assert.equal(r.defs.colonnes, 1);
    const attendu = MC_DEF.apresTitre
        + lignesDefs(m.horizontales, r.defs.largeur) * MC_DEF.pas;
    assert.ok(Math.abs(r.defs.hHoriz - attendu) < 0.001,
        `réserve ${r.defs.hHoriz} pour ${attendu}`);
});

test('en deux colonnes, les deux listes partent de la même ligne', () => {
    const r = essaiDisposition(PAYSAGE, grille(15, 13), 'dessous');
    assert.equal(r.defs.colonnes, 2);
    assert.ok(r.defs.x2 > r.defs.x + r.defs.largeur, 'les deux colonnes se chevauchent');
});

// --- « On essaye d'occuper le maximum d'espace » -----------------------------

test('AUTOMATIQUE REND TOUJOURS LA PLUS GRANDE GRILLE', () => {
    let gagnees = { dessous: 0, gauche: 0, droite: 0 };
    for (const b of [PAYSAGE, PORTRAIT, DEMI, { x: 9, y: 26, w: 137, h: 86 }]) {
        for (let L = 7; L <= 22; L++) {
            for (let H = 7; H <= 22; H += 3) {
                for (const [nbH, nbV, lg] of [[5, 5, 52], [8, 4, 90], [3, 9, 30]]) {
                    const m = grille(L, H, nbH, nbV, lg);
                    const auto = disposerMotsCroises(b, m, 'auto');
                    for (const pose of ['dessous', 'gauche', 'droite']) {
                        const seul = disposerMotsCroises(b, m, pose);
                        assert.ok(auto.cote >= seul.cote - 1e-9,
                            `${L}×${H} dans ${b.w}×${b.h} : « auto » (${auto.cote.toFixed(2)}) `
                            + `perd contre « ${pose} » (${seul.cote.toFixed(2)})`);
                    }
                    gagnees[auto.pose]++;
                }
            }
        }
    }
    // ET LE CHOIX N'EST PAS TOUJOURS LE MÊME : sinon l'option n'aurait aucun
    // intérêt et « automatique » serait un alias de « dessous ».
    assert.ok(gagnees.dessous > 0, JSON.stringify(gagnees));
    assert.ok(gagnees.gauche + gagnees.droite > 0, JSON.stringify(gagnees));
    // « Automatique » ne rend jamais « droite » : c'est le MIROIR de
    // « gauche », donc exactement la même taille de case, et à égalité on
    // garde la première. Ce n'est pas un oubli — le côté est une question de
    // goût, pas de place, et c'est justement pour cela qu'il se règle à la
    // main.
    assert.equal(gagnees.droite, 0, JSON.stringify(gagnees));
});

test('une grille haute et étroite met ses définitions À CÔTÉ', () => {
    // C'est le cas qui motive l'option : en dessous, on rétrécit les cases
    // pour rien pendant qu'une colonne entière reste vide sur le côté.
    const auto = disposerMotsCroises(PAYSAGE, grille(8, 20), 'auto');
    assert.ok(auto.pose !== 'dessous', `choisi : ${auto.pose}`);
});

test('une disposition imposée est respectée, même moins bonne', () => {
    const m = grille(8, 20);
    assert.equal(disposerMotsCroises(PAYSAGE, m, 'dessous').pose, 'dessous');
    assert.equal(disposerMotsCroises(PAYSAGE, m, 'gauche').pose, 'gauche');
    assert.equal(disposerMotsCroises(PAYSAGE, m, 'droite').pose, 'droite');
    // Une valeur inconnue — un réglage enregistré avant l'option — vaut « auto ».
    assert.equal(disposerMotsCroises(PAYSAGE, m, 'nimporte').pose,
        disposerMotsCroises(PAYSAGE, m, 'auto').pose);
});

test('on rend toujours quelque chose, même dans un bloc minuscule', () => {
    // Une disposition imposée peut ne pas tenir ; on ne rend jamais « rien »,
    // sinon la feuille se dessinerait sans sa grille.
    for (const b of [{ x: 9, y: 26, w: 60, h: 40 }, { x: 9, y: 26, w: 40, h: 100 }]) {
        for (const pose of ['auto', 'dessous', 'gauche', 'droite']) {
            const r = disposerMotsCroises(b, grille(15, 13, 8, 8, 90), pose);
            assert.ok(r && r.cote >= 3, `${pose} dans ${b.w}×${b.h}`);
            assert.ok(r.defs && r.defs.largeur > 0);
        }
    }
});

// --- Les définitions occupent leur colonne -------------------------------------

import {
    grossissementDefs, defsGrossies, MC_CORPS_MAX, MC_DEF as MESURES
} from '../js/core/dispositionMotsCroises.js';

test('LES DÉFINITIONS GROSSISSENT JUSQU\'À REMPLIR LEUR COLONNE', () => {
    // Rémy : « sur les mots croisés mathématiques, je trouve que tu ne profites
    // pas du tout de l'espace. » La GRILLE, elle, occupe déjà tout ce qu'elle
    // peut — elle est bornée par sa largeur. Ce qui restait vide, c'était la
    // colonne de texte : dix lignes de 2,6 mm dans vingt-cinq centimètres.
    //
    // On simule une mesure proportionnelle pour vérifier la mécanique : dix
    // millimètres de texte dans cent millimètres de colonne doivent grossir.
    const proportionnel = (f) => 10 * f;
    const f = grossissementDefs(proportionnel, 100);
    assert.ok(f > 1.4, `facteur ${f}`);
    // ET IL Y A UN PLAFOND DE LISIBILITÉ : au-delà, on n'a plus une liste de
    // définitions mais un poème. Quelle que soit la place, on s'arrête là.
    //
    // IL ÉTAIT À 4,2 MM, ET C'ÉTAIT LUI « LA PLACE PERDUE » que montrait Rémy :
    // sur la feuille mesurée, les définitions s'arrêtaient aux trois quarts de
    // leur colonne et le reste était blanc. Elles avaient le droit de grossir,
    // elles butaient sur ce plafond. À 5,6 mm — du seize points, le corps d'un
    // intertitre — la colonne se remplit à 87 % et le corps moyen gagne 46 %
    // sur une fiche debout, 14 % sur une fiche couchée.
    assert.ok(defsGrossies(f).corps <= MC_CORPS_MAX + 1e-9, `${defsGrossies(f).corps} mm`);
    assert.ok(defsGrossies(grossissementDefs(proportionnel, 100000)).corps
        <= MC_CORPS_MAX + 1e-9);
    // Le plafond RESTE un plafond : de la place à l'infini ne le franchit pas.
    assert.ok(MC_CORPS_MAX < 7, 'au-delà de sept millimètres ce n\'est plus une liste');
});

test('ON ESSAIE, ON NE CALCULE PAS : un texte qui se replie ne grossit pas linéairement', () => {
    // C'ÉTAIT LE DÉFAUT. La première version divisait la place par la hauteur
    // au petit corps et prenait le quotient pour facteur — or un texte deux
    // fois plus gros se replie sur plus de lignes, et sa hauteur peut tripler.
    // « Verticalement » venait alors s'écrire par-dessus la fin
    // d'« Horizontalement ».
    //
    // Ici, la hauteur triple quand le corps double : le facteur retenu doit
    // rester tel que la hauteur RÉELLE tienne, pas la hauteur supposée.
    const brutal = (f) => 10 * f * f * f;
    const f = grossissementDefs(brutal, 100);
    assert.ok(brutal(f) <= 90, `${brutal(f).toFixed(1)} mm dans 90 mm de place utile`);
    assert.ok(f > 1, 'il reste tout de même de quoi grossir un peu');
});

test('sans place, on ne grossit pas — et l\'on ne rétrécit jamais', () => {
    assert.equal(grossissementDefs((f) => 200 * f, 100), 1);
    assert.equal(grossissementDefs((f) => 10 * f, 0), 1);
    assert.equal(defsGrossies(1).corps, MESURES.corps);
});

test('LA GRILLE NE FLOTTE PLUS AU MILIEU DE LA PAGE', () => {
    // L'autre moitié de « la place perdue ». En disposition « dessous », la
    // grille recevait toute la hauteur laissée par les définitions, n'en
    // prenait qu'une partie — elle est bornée par sa largeur — et centrait le
    // reste en deux marges vides. Elle se cale désormais EN HAUT, et les
    // définitions commencent juste sous elle.
    const b = { x: 10, y: 20, w: 180, h: 240 };
    // Une grille large et basse : elle sera forcément bornée par la largeur.
    const m = {
        largeur: 20, hauteur: 6,
        horizontales: [{ num: 1, def: 'Une définition courte', longueur: 5 }],
        verticales: [{ num: 2, def: 'Une autre', longueur: 4 }]
    };
    const d = essaiDisposition(b, m, 'dessous');
    assert.equal(d.y, b.y, 'la grille commence en haut du bloc');
    // Et les définitions suivent immédiatement, sans bande blanche : au plus
    // quelques millimètres de gouttière.
    assert.ok(d.defs.y - (d.y + d.h) <= 6,
        `${(d.defs.y - (d.y + d.h)).toFixed(1)} mm entre la grille et les définitions`);
});
