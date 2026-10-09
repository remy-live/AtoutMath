// LA MISE EN PAGE DU POLY — trois défauts vus sur la feuille de Rémy.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   « pour l'ex 92. Écris la question à la ligne. »
//   « POur l'égalité de Thalès, les pointillés vont sur l'énoncé. »
//   « Pour les trèfles, j'ai mis la couleur pour le poly mais je n'ai pas de
//     couleur quand je mets en couleur. » (et, le même jour, pour les pavages)
//
// Les trois se voient à l'œil sur un PDF et à peu près nulle part ailleurs —
// c'est pour cela que `tools/pdfEnImage.mjs` existe désormais. Ce qui se tient
// sous Node, et qui est ici, c'est la RÈGLE derrière chacun.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// `ficheRendu` et les rendus touchent `document` au chargement : on leur en
// donne un qui ne sert à rien, comme `tools/caracteresPerdus.mjs`.
globalThis.document = globalThis.document || {
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }) }) })
};
globalThis.window = globalThis.window || { localStorage: null, matchMedia: null };

const { reglerModePolycopie } = await import('../js/ui/ficheRendu.js');
const { RENDUS_CASSETETE } = await import('../js/ui/fiches/casseTete.js');
const { RENDUS_REPERAGE } = await import('../js/ui/fiches/reperage.js');
const { RENDUS_THEOREMES } = await import('../js/ui/fiches/theoremes.js');
const { getGenerator } = await import('../js/core/registry.js');
await import('../js/core/activities/index.js');
const { exercices } = await import('../js/data/catalog.js');
const { makeRng } = await import('../js/core/ids.js');
const { TEINTES } = await import('../js/core/teintesPieces.js');

const tirer = (id, i = 0) => {
    const e = exercices.find(x => x.id === id);
    // LE GÉNÉRATEUR DE LA FICHE, quand il y en a un : c'est lui que le poly
    // appelle (`generateurDeFiche`), et plusieurs exercices en ont un qui n'est
    // pas celui de l'écran — le champ de trèfles, la mosaïque.
    const gen = getGenerator(e.printGeneratorId || e.generatorId);
    return gen.generate({ ...(e.params || {}), ...(e.printParams || {}) },
        { index: i, total: 6, rng: makeRng(`${id}-${i}`), papier: true, themesExclus: [] });
};

// ── « Écris la question à la ligne » ───────────────────────────────────────

test('UN PROBLÈME DE FRACTIONS POSE SA QUESTION SUR UNE LIGNE À LUI', () => {
    // MESURÉ AVANT, sur son poly : cinq énoncés sur onze débordaient, et la
    // coupure tombait où elle pouvait — une parenthèse fermante seule à la
    // ligne suivante, un dénominateur orphelin collé après elle.
    for (let i = 0; i < 10; i++) {
        const q = tirer('frac-probleme', i);
        const t = q.prompt.papier;
        const lignes = t.split('\n');
        assert.equal(lignes.length, 2,
            `« ${t.replace(/\n/g, ' ⏎ ')} » tient sur ${lignes.length} ligne(s)`);
        // La première pose la situation, la seconde demande.
        assert.match(lignes[0], /\.$/, `« ${lignes[0]} » n'est pas une phrase close`);
        assert.match(lignes[1], /\?/, `« ${lignes[1]} » ne porte pas la question`);
        // Et le calcul reste COLLÉ à la question : c'est lui qu'on pose sous
        // elle, pas sous le contexte.
        assert.match(lignes[1], /\(.+=.+\)/, `« ${lignes[1]} » a perdu son calcul`);
    }
});

test('ET L\'ÉCRAN GARDE SA PHRASE D\'UN SEUL TENANT', () => {
    // Le retour à la ligne est une décision de MISE EN PAGE, pas d'énoncé :
    // à l'écran la question s'affiche dans une bulle qui coupe toute seule.
    const q = tirer('frac-probleme', 3);
    assert.doesNotMatch(q.prompt.text, /\n/, 'le texte d\'écran porte un retour à la ligne');
});

// ── « les pointillés vont sur l'énoncé » ───────────────────────────────────

test('L\'ÉGALITÉ DE THALÈS COMMENCE SOUS L\'ÉNONCÉ, JAMAIS DESSUS', () => {
    // Le squelette partait d'une fraction FIXE de la hauteur du bloc — 40 % —,
    // qui ne sait rien de la longueur du texte. « Les droites (DE) et (BC)
    // sont parallèles. Écris l'égalité des trois rapports donnée par le
    // théorème de Thalès. » tient sur QUATRE lignes dans une demi-colonne, et
    // la quatrième tombait pile sur les pointillés des numérateurs.
    //
    // ON CONFRONTE LES DEUX OBJETS, et non une valeur devinée : le bas de la
    // boîte de l'énoncé contre le haut du premier pointillé.
    // UN BLOC DE LA TAILLE DE CEUX DU POLY DE RÉMY — deux par ligne, six par
    // page. C’est là que le défaut vivait : la règle des 40 % ne tombe sous
    // l’énoncé que si le bloc est assez HAUT, et ceux-ci ne le sont pas.
    // Mesuré : avec cette boîte, l’ancienne règle posait le premier pointillé
    // à 33,6 mm pour un énoncé qui descend à 34,7.
    const slot = { boite: { x: 10, y: 20, w: 128, h: 34 } };
    let vus = 0;
    for (let i = 0; i < 8; i++) {
        const item = tirer('geo-thales', i);
        const html = RENDUS_THEOREMES.thales.previewGrille(item, slot, 1, false);
        const enonce = /class="fx-th-enonce"[^>]*top:([\d.]+)px[\s\S]*?max-height:([\d.]+)px/
            .exec(html);
        if (!enonce) continue;          // la réciproque n'a pas d'égalité
        const bas = Number(enonce[1]) + Number(enonce[2]);
        const lignes = [...html.matchAll(/class="fx-th-ligne"[^>]*top:([\d.]+)px/g)]
            .map(m => Number(m[1]));
        if (!lignes.length) continue;
        vus++;
        const plusHaut = Math.min(...lignes);
        assert.ok(plusHaut >= bas,
            `le premier pointillé est à ${plusHaut.toFixed(1)} et l'énoncé descend `
            + `jusqu'à ${bas.toFixed(1)} : ils se chevauchent`);
    }
    assert.ok(vus >= 4, `${vus} figures mesurées seulement`);
});

// ── « mets de la couleur » ─────────────────────────────────────────────────

/**
 * Dessine un rendu dans un mode de polycopié donné, et rend le HTML.
 *
 * Le mode est une variable de module dans `ficheRendu` : on le remet au
 * noir et blanc après coup, qui est le défaut du logiciel. Sans cela, une
 * épreuve en teindrait une autre.
 */
function dessiner(mode, faire) {
    reglerModePolycopie(mode);
    try { return faire(); } finally { reglerModePolycopie('nb'); }
}

test('EN COULEUR, LE CHAMP DE TRÈFLES EST VERT — ET NOIR SINON', () => {
    // RÉMY : « j'ai mis la couleur pour le poly mais je n'ai pas de couleur ».
    // Le filtre général DÉSATURE ce que le rendu a posé ; il n'invente pas une
    // couleur qui n'a jamais été écrite. C'est au rendu de la poser.
    const item = tirer('defi-trefles');
    const slot = { boite: { x: 10, y: 10, w: 120, h: 90 } };
    const enNb = dessiner('nb',
        () => RENDUS_CASSETETE.trefles.previewGrille(item, slot, 1, false));
    const enCouleur = dessiner('couleur',
        () => RENDUS_CASSETETE.trefles.previewGrille(item, slot, 1, false));
    assert.match(enCouleur, /#7cb35f/i, 'les feuilles ne sont pas vertes en mode couleur');
    assert.doesNotMatch(enNb, /#7cb35f/i, 'le vert sort même en noir et blanc');
    // EN NOIR ET BLANC, LE FOND RESTE BLANC : un aplat vert passé au gris donne
    // un gris moyen sur lequel on ne distingue plus les feuilles — or les
    // COMPTER est tout l'exercice.
    assert.match(enNb, /fill="#ffffff"/i, 'le fond des feuilles n\'est plus blanc');
});

test('EN COULEUR, LES PIÈCES DU PAVAGE ET DE LA MOSAÏQUE PRENNENT LEUR TEINTE', () => {
    // RÉMY : « Pour les pavages quand c'est couleur pour le poly, mets de la
    // couleur. » Les teintes sont celles de l'écran — une pièce de la feuille
    // et une pièce du jeu doivent être la même pièce.
    const slot = { boite: { x: 10, y: 10, w: 130, h: 95 } };
    for (const [id, cle, rendu] of [
        ['geo-pavage', 'pavage', RENDUS_REPERAGE],
        ['geo-mosaique', 'mosaique', RENDUS_REPERAGE]
    ]) {
        const item = tirer(id);
        const nb = dessiner('nb', () => rendu[cle].previewGrille(item, slot, 1, false));
        const couleur = dessiner('couleur',
            () => rendu[cle].previewGrille(item, slot, 1, false));
        assert.ok(TEINTES.some(t => couleur.includes(t)),
            `${id} : aucune teinte de pièce en mode couleur`);
        assert.ok(!TEINTES.some(t => nb.includes(t)),
            `${id} : une teinte de pièce sort en noir et blanc`);
    }
});
