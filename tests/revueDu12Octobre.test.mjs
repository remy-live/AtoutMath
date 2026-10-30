// LA REVUE DU 12 OCTOBRE — ce qui se garde sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Douze points, tous sur la version imprimée : « depuis tout à l'heure je te
// parle pour la version imprimée ». La plupart se jugent à l'œil — une police
// trop grasse, un dernier rang à moitié vide — et c'est `tools/pdfEnImage.mjs`
// qui sert à cela. Mais QUATRE d'entre eux portent une règle qu'une épreuve
// peut tenir, et ce sont justement ceux qui reviendraient en silence :
//
//   · une consigne qui décrit une opération absente de la feuille ;
//   · une consigne qui renvoie à une page qui n'existe pas ;
//   · une lettre qui EFFACE la croix du point qu'elle nomme ;
//   · un exercice qui n'offre aucun champ remplissable.
//
// ── COMMENT ON MESURE UN DESSIN SANS LE DESSINER ──────────────────────────
//
// Les rendus de fiche reçoivent un jsPDF et appellent une quarantaine de
// méthodes dessus. On leur en donne un FAUX, qui note ce qu'on lui demande :
// les traits, les rectangles, et la couleur de remplissage en cours. On lit
// ensuite ce carnet. C'est la même ruse que `tools/champsRemplissables.mjs`,
// et elle répond à des questions que le PDF fini ne répond plus — « ce
// rectangle blanc est-il passé APRÈS la croix ? » ne se lit pas sur l'image,
// on n'y voit que le résultat.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';

const { RENDUS } = await import('../js/ui/printSheet.js');

/**
 * UN FAUX jsPDF QUI TIENT UN CARNET.
 *
 * Il répond à tout (un `Proxy` évite une liste de quarante méthodes à tenir à
 * jour) et retient les trois choses dont les épreuves d'ici ont besoin : les
 * segments, les rectangles, et la couleur de remplissage au moment où chacun
 * est posé. L'ORDRE est conservé — c'est tout l'objet de l'épreuve de la
 * croix.
 */
function pdfQuiNote() {
    const carnet = { traits: [], rects: [], ordre: [] };
    let remplissage = [0, 0, 0];
    const vrai = {
        carnet,
        getTextWidth: (t) => String(t || '').length * 1.9,
        getStringUnitWidth: (t) => String(t || '').length * 0.5,
        splitTextToSize: (t) => [String(t || '')],
        getFontSize: () => 10,
        getLineHeight: () => 12,
        getNumberOfPages: () => 1,
        internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 },
            getFontSize: () => 10, scaleFactor: 2.8346 },
        setFillColor: (...v) => { remplissage = v.slice(0, 3); },
        line: (x1, y1, x2, y2) => {
            const t = { x1, y1, x2, y2, rang: carnet.ordre.length };
            carnet.traits.push(t);
            carnet.ordre.push({ quoi: 'trait', ...t });
        },
        rect: (x, y, w, h) => {
            const r = { x, y, w, h, remplissage: remplissage.slice(), rang: carnet.ordre.length };
            carnet.rects.push(r);
            carnet.ordre.push({ quoi: 'rect', ...r });
        }
    };
    return new Proxy(vrai, {
        get: (cible, clef) => (clef in cible ? cible[clef] : () => undefined)
    });
}

const SLOT = { x: 12, y: 30, taille: 4, boite: { x: 12, y: 30, w: 170, h: 90 },
    numero: 1, tous: null, rang: 0 };

/** Tire un item de l'exercice comme la feuille le ferait. */
function item(exoId, generatorId, params = {}) {
    const gen = getGenerator(generatorId);
    assert.ok(gen, `le générateur « ${generatorId} » est introuvable`);
    return gen.generate(params, { index: 0, total: 2, rng: makeRng(`revue-${exoId}`),
        papier: true, themesExclus: [] });
}

// --- 1. La consigne des opérations posées -----------------------------------

test('UNE FEUILLE DE MULTIPLICATIONS N\'EXPLIQUE PAS LA DIVISION', () => {
    const consigne = RENDUS.pose.consigne;
    const mult = consigne([{ meta: { nom: 'multiplication', operation: '×' } },
        { meta: { nom: 'multiplication', operation: '×' } }]);
    // Ce qu'un élève lisait en tête d'une feuille de multiplications : « une
    // division se fait par étapes : on abaisse un chiffre, on cherche combien
    // de fois le diviseur tient dedans ». Trois lignes hors sujet, à l'endroit
    // même qu'il lit avant de commencer.
    assert.ok(!/diviseur/i.test(mult),
        `la consigne des multiplications parle encore du diviseur :\n${mult}`);
    assert.ok(/multiplications sont posées/.test(mult), mult);

    // Et elle reste là où elle sert.
    const div = consigne([{ meta: { nom: 'division', operation: '÷' } }]);
    assert.ok(/diviseur/i.test(div), `la consigne des divisions ne l'explique plus :\n${div}`);

    // Mélangées, la division est présente : on l'explique.
    const deux = consigne([{ meta: { nom: 'addition', operation: '+' } },
        { meta: { nom: 'division', operation: '÷' } }]);
    assert.ok(/diviseur/i.test(deux), deux);
});

// --- 2. La consigne du memory -----------------------------------------------

test('LE MEMORY NE RENVOIE PLUS À UNE PAGE QUI N\'EXISTE PAS', () => {
    // Rémy : « enlève la page 2 qui porte le dos, car ce n'est pas le cas ».
    // Les dos sont la page de SOLUTIONS du rendu, qui ne s'imprime que si on
    // la demande — un élève qui retourne sa feuille et ne trouve rien ne
    // conclut pas « la case n'était pas cochée ».
    const dit = RENDUS.memory.consigne([]);
    assert.ok(!/page 2/i.test(dit), `la consigne promet encore une page 2 :\n${dit}`);
    assert.ok(/DÉCOUPE/.test(dit), dit);
});

// --- 3. Les défauts qu'il a dictés ------------------------------------------

test('LES NOMBRES PAR DÉFAUT SONT CEUX QU\'IL A DEMANDÉS', () => {
    // « pour les dominos ne mets qu'un exercice par défaut » : une planche,
    // c'est le parcours ET les pièces à découper. On n'en découpe pas deux.
    assert.equal(RENDUS.dominos.unique, true, 'les dominos sortent par paire');
    // « débrouille-toi pour avoir le même nombre par ligne » : quatre par
    // rangée, donc huit — six donnaient 4 + 2.
    assert.equal(RENDUS.memory.parDefaut % RENDUS.memory.parLigneDefaut, 0,
        `${RENDUS.memory.parDefaut} paires sur des rangées de `
        + `${RENDUS.memory.parLigneDefaut} laissent un rang à moitié vide`);
});

// --- 4. La croix d'un sommet, et la lettre qui la nommait ------------------

test('LA LETTRE D\'UN SOMMET N\'EFFACE PAS SA CROIX', () => {
    // CE QUE LE DESSIN CONTIENT, ET POURQUOI ON PEUT LE LIRE : sur une
    // mosaïque, le quadrillage et les contours de pièces sont tous
    // HORIZONTAUX ou VERTICAUX. Les seuls traits OBLIQUES sont les deux
    // branches des croix de sommet. On les reconnaît donc sans rien demander
    // au code qu'on juge — c'est la règle de la maison : une épreuve qui
    // mesure avec la fonction qu'elle garde ne garde rien.
    const it = item('geo-mosaique', 'geo.mosaique-fiche');
    const pdf = pdfQuiNote();
    RENDUS.mosaique.pdfGrille(pdf, it, SLOT, false, null);
    const { traits, rects } = pdf.carnet;

    const obliques = traits.filter(t => Math.abs(t.x2 - t.x1) > 0.01 && Math.abs(t.y2 - t.y1) > 0.01);
    const sommets = (it.meta.sommets || []).length;
    assert.ok(sommets > 0, 'la mosaïque tirée n\'a aucun sommet nommé');
    assert.equal(obliques.length, sommets * 2,
        `${sommets} sommets devraient donner ${sommets * 2} branches de croix,`
        + ` on en compte ${obliques.length}`);

    // LA BRANCHE SE VOIT : 1,8 mm au moins. À 1,6 mm fixes sur des carreaux de
    // près de cinq, la croix ne se lisait plus comme une croix — « les points
    // ne sont toujours pas des croix ».
    for (const t of obliques) {
        assert.ok(Math.abs(t.x2 - t.x1) >= 1.79,
            `une branche de croix ne fait que ${Math.abs(t.x2 - t.x1).toFixed(2)} mm de large`);
    }

    // ET RIEN DE BLANC NE PASSE PAR-DESSUS. C'était le défaut : la pastille
    // blanche qui rend la lettre lisible était posée APRÈS la croix et en
    // mangeait la moitié haute. Ce qui s'imprimait était un accent
    // circonflexe, et le tracé n'y était pour rien — seul l'ordre.
    const blancs = rects.filter(r => r.remplissage.every(v => v >= 250));
    for (const t of obliques) {
        const bx = [Math.min(t.x1, t.x2), Math.max(t.x1, t.x2)];
        const by = [Math.min(t.y1, t.y2), Math.max(t.y1, t.y2)];
        for (const r of blancs) {
            if (r.rang < t.rang) continue;               // posé AVANT : il n'efface rien
            const croise = r.x < bx[1] && r.x + r.w > bx[0]
                && r.y < by[1] && r.y + r.h > by[0];
            assert.ok(!croise,
                `un aplat blanc (${r.x.toFixed(1)}, ${r.y.toFixed(1)}, `
                + `${r.w.toFixed(1)} × ${r.h.toFixed(1)}) recouvre une branche de croix `
                + `posée avant lui (${bx[0].toFixed(1)}–${bx[1].toFixed(1)}, `
                + `${by[0].toFixed(1)}–${by[1].toFixed(1)})`);
        }
    }
});

// --- 5. Les champs remplissables des trois rendus de sa revue --------------

test('LES RENDUS QU\'IL A CITÉS POSENT DES CHAMPS REMPLISSABLES', () => {
    // « as-tu prévu des champs remplissables pour tous les exercices […] il
    // faut que tu vérifies les exercices ». Le balayage complet vit dans
    // `tools/champsRemplissables.mjs` — il dit qui en pose et qui n'en pose
    // pas, et c'est à Rémy de trancher pour les rendus qui ne PEUVENT pas en
    // porter (on ne remplit pas un memory à découper). Ici on garde les trois
    // qu'il a nommés, et le quatrième qui portait justement sa critique de
    // police.
    const cas = [
        ['pose', 'calc-poser-multiplication', 'calc.poser-fiche', { operation: '×' }],
        ['cercleVocabulaire', 'geo-cercle-vocabulaire', 'geo.cercle-vocabulaire', {}],
        ['mosaique', 'geo-mosaique', 'geo.mosaique-fiche', {}],
        ['priorites', 'calc-prio-cascade', 'calc.priorites-fiche', {}]
    ];
    for (const [cle, exoId, genId, params] of cas) {
        const rendu = RENDUS[cle];
        assert.ok(rendu, `le rendu « ${cle} » n'existe plus`);
        let poses = 0;
        rendu.pdfGrille(pdfQuiNote(), item(exoId, genId, params), SLOT, false,
            () => { poses++; });
        assert.ok(poses > 0,
            `« ${exoId} » (rendu ${cle}) ne pose aucun champ remplissable :`
            + ' une fiche cochée « remplissable » sort alors belle et morte.');
    }
});
