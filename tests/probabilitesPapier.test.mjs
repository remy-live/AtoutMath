// LES PROBABILITÉS SUR LE PAPIER — ce qui se perd sans bruit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet du 24 octobre : « des illustrations avec des roues de couleurs,
// des urnes etc. » L'écran les a depuis ce jour-là ; la feuille n'imprimait que
// leur DESCRIPTION — « une roue partagée en 9 secteurs : 5 sont verts » —,
// c'est-à-dire le travail que le dessin existe pour épargner.
//
// CE QUE CES ÉPREUVES GARDENT, et pourquoi chacune a sa raison :
//
//   · LE DESSIN VOYAGE DANS `meta`, et nulle part ailleurs. `makeItem` ne
//     garde que les champs qu'il connaît : un champ posé au premier étage
//     disparaît SANS RIEN DIRE, et la feuille sort alors sans figure — le
//     défaut exact qu'on vient de corriger, et qui s'était déjà produit sur la
//     réponse en fraction de « Lis la fraction ».
//   · LE DESSIN DIT LA MÊME CHOSE QUE L'ÉNONCÉ. Un sac de onze jetons dont le
//     texte annonce douze est pire qu'un sac absent : l'élève compte, trouve
//     autre chose, et c'est LUI qui se croit en faute.
//   · ET LE RENDU NE JETTE PAS. Un aperçu plein de NaN passe tous les
//     comptages sans rien dessiner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { getExerciseById } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
// LE REGISTRE EST VIDE TANT QUE PERSONNE N'A IMPORTÉ `activities/index.js`, et
// `getGenerator` rend alors `null` — ce qui se lit « Cannot read properties of
// null », un message qui ne désigne pas sa cause. Importer le générateur SEUL
// ne suffit pas : c'est l'index qui l'inscrit.
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { RENDUS_DONNEES } from '../js/ui/fiches/donnees.js';
import { plantDuSac, plantDeLaRoue } from '../js/ui/fiches/donnees.js';

const gen = () => getGenerator('don.probabilites');

/** Un item de la marche demandée, tiré avec une graine fixe. */
const tirer = (marche, graine = 'pp') =>
    gen().generate({ marches: [marche] }, { rng: makeRng(`${graine}-${marche}`), index: 0, total: 4 });

test('L\'EXERCICE S\'IMPRIME, ET SON RENDU EXISTE', () => {
    const exo = getExerciseById('don-probabilites');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.printable, 'probabilites');
    assert.ok(RENDUS_DONNEES[exo.printable], 'son rendu papier doit exister');
});

test('LE DESSIN VOYAGE DANS `meta`, SINON IL N\'ARRIVE PAS', () => {
    for (const marche of ['sac', 'roue', 'pas-cette-couleur']) {
        const it = tirer(marche);
        const d = it.meta && it.meta.dessin;
        assert.ok(d, `${marche} : rien dans meta.dessin — la feuille sortira sans figure`);
        assert.ok(['sac', 'roue'].includes(d.forme), `${marche} : forme inconnue « ${d.forme} »`);
        assert.ok(d.favorables > 0 && d.autres > 0,
            `${marche} : un dessin à un seul groupe ne montre rien`);
        assert.match(String(d.couleurA), /^#[0-9a-f]{6}$/i);
        assert.match(String(d.couleurB), /^#[0-9a-f]{6}$/i);
        assert.notEqual(d.couleurA, d.couleurB,
            `${marche} : les deux groupes ont la même couleur`);
    }
});

test('ET IL DIT LE MÊME NOMBRE QUE L\'ÉNONCÉ', () => {
    // LE DÉFAUT QUE CELLE-CI GARDE EST LE PLUS MÉCHANT DU LOT : un sac de onze
    // jetons sous un énoncé qui en annonce douze. L'élève compte, trouve autre
    // chose que ce qu'il lit, et c'est lui qui se croit en faute.
    for (const graine of ['a', 'b', 'c', 'd', 'e']) {
        for (const marche of ['sac', 'roue', 'pas-cette-couleur']) {
            const it = tirer(marche, graine);
            const d = it.meta.dessin;
            const texte = String(it.prompt.papier || it.prompt.text || '');
            const total = d.favorables + d.autres;
            // L'énoncé écrit le total — « (11 en tout) » pour un sac,
            // « partagée en 11 secteurs » pour une roue.
            assert.ok(new RegExp(`\\b${total}\\b`).test(texte),
                `${marche}/${graine} : le dessin montre ${total} objets, `
                    + `et l'énoncé ne parle pas de ${total} — « ${texte.slice(0, 90)} »`);
        }
    }
});

test('LE SAC POSE EXACTEMENT SES OBJETS, ET DANS SA ZONE', () => {
    // DEUX ZONES, ET LA SECONDE EST BASSE EXPRÈS. Avec une seule zone bien
    // proportionnée, l'épreuve restait verte alors même qu'on retirait la
    // contrainte de HAUTEUR du calcul du pas — vu tomber, puis vu NE PAS
    // tomber, ce qui est la seule façon de savoir ce qu'une épreuve garde.
    // C'est le bloc bas qui fait déborder : trois rangées dans dix-huit
    // millimètres.
    const zones = [{ x: 10, y: 20, w: 40, h: 34 }, { x: 4, y: 4, w: 40, h: 18 }];
    for (const zone of zones) for (const [f, a] of [[3, 4], [7, 5], [1, 11], [9, 2]]) {
        const s = plantDuSac({ favorables: f, autres: a }, zone);
        assert.equal(s.ronds.length, f + a, `${f}+${a} : il manque ou il reste des objets`);
        assert.equal(s.ronds.filter(r => r.plein).length, f,
            `${f}+${a} : le nombre d'objets cherchés ne correspond pas`);
        for (const r of s.ronds) {
            assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && r.r > 0,
                `${f}+${a} : un objet aux coordonnées impossibles`);
            // DANS LA ZONE, contour compris : un rond qui déborde se dessine
            // PAR-DESSUS le bloc voisin, et l'on compte alors les objets du
            // voisin avec les siens.
            assert.ok(r.x - r.r >= zone.x - 0.5 && r.x + r.r <= zone.x + zone.w + 0.5,
                `${f}+${a} : un objet sort de son bloc par le côté`);
            assert.ok(r.y - r.r >= zone.y - 0.5 && r.y + r.r <= zone.y + zone.h + 0.5,
                `${f}+${a} : un objet sort de son bloc par le haut ou le bas`);
        }
    }
});

test('ET LA ROUE PARTAGE LE TOUR EN PARTS ÉGALES', () => {
    // « TOUS DE MÊME TAILLE » N'EST PAS UNE PRÉCAUTION DE STYLE : la règle
    // « cas favorables sur cas possibles » ne vaut QUE si toutes les issues ont
    // la même chance. Une roue dessinée à secteurs inégaux contredit l'énoncé
    // qui la surplombe, et c'est la seule chose que le chapitre enseigne.
    const zone = { x: 5, y: 5, w: 40, h: 40 };
    for (const [f, a] of [[5, 3], [9, 2], [1, 7]]) {
        const w = plantDeLaRoue({ favorables: f, autres: a }, zone);
        assert.equal(w.secteurs.length, f + a);
        assert.equal(w.secteurs.filter(s => s.plein).length, f);
        const ouvertures = w.secteurs.map(s => s.a2 - s.a1);
        const attendue = (2 * Math.PI) / (f + a);
        for (const o of ouvertures) {
            assert.ok(Math.abs(o - attendue) < 1e-9, `${f}+${a} : un secteur plus large`);
        }
        // LE TOUR EST COMPLET : des secteurs égaux qui ne font pas 2π laissent
        // un coin de roue vide, et le dénominateur devient faux à l'œil.
        const total = ouvertures.reduce((x, y) => x + y, 0);
        assert.ok(Math.abs(total - 2 * Math.PI) < 1e-9, `${f}+${a} : le tour n'est pas bouclé`);
        assert.ok(w.R > 0 && Number.isFinite(w.cx) && Number.isFinite(w.cy));
    }
});

test('L\'APERÇU SE DESSINE, SANS UN SEUL NaN', () => {
    const rendu = RENDUS_DONNEES.probabilites;
    const slot = { boite: { x: 10, y: 10, w: 80, h: 80 } };
    for (const marche of ['sac', 'roue', 'certain', 'comparer']) {
        const it = tirer(marche);
        for (const solution of [false, true]) {
            const svg = rendu.previewGrille(it, slot, 3, solution);
            assert.match(svg, /<svg/, `${marche} : pas de dessin du tout`);
            assert.equal(/NaN/.test(svg), false,
                `${marche} : coordonnées NaN — un aperçu qui passe tous les comptages `
                    + 'sans rien dessiner');
        }
    }
});

test('ET LA CONSIGNE DIT LA FEUILLE QU\'ON TIENT', () => {
    // La consigne disait « les objets PLEINS sont ceux qu'on cherche » même sur
    // une feuille en couleur, où rien n'est plein ni vide. C'est la leçon du
    // Strimko, et elle vaut ici : un élève qui cherche du plein sur une feuille
    // qui n'en a pas cherche longtemps.
    const avec = RENDUS_DONNEES.probabilites.consigne([tirer('sac')]);
    const sans = RENDUS_DONNEES.probabilites.consigne([tirer('certain')]);
    assert.match(avec, /PLEINS|dessins/, 'la feuille à dessins doit les nommer');
    assert.ok(!/PLEINS/.test(sans),
        'une feuille sans dessin ne doit pas parler de dessins');
});

test('ET LA RÉPONSE S\'ÉCRIT EN FRANÇAIS, AVEC UNE VIRGULE', () => {
    // REGARDÉ sur la page de corrigé : l'énoncé disait « la probabilité est de
    // 0,4 » et la réponse, deux centimètres dessous, « 0.6 ». Le point vient
    // du nombre tel que le générateur le range pour COMPARER — juste pour lui,
    // faux sur une feuille de mathématiques en français.
    const rendu = RENDUS_DONNEES.probabilites;
    const slot = { boite: { x: 10, y: 10, w: 80, h: 80 } };
    const faux = { prompt: { papier: 'La probabilité est de 0,4. Et le contraire ?' },
        meta: {}, answer: '0.6' };
    const svg = rendu.previewGrille(faux, slot, 3, true);
    assert.match(svg, />0,6</, 'la réponse décimale doit porter une virgule');
    assert.equal(/>0\.6</.test(svg), false, 'un point décimal reste sur la feuille');

    // ET CE QUI N'EST PAS UN NOMBRE PASSE INTACT : « B », « certain ».
    for (const mot of ['B', 'certain', 'impossible']) {
        const it = { prompt: { papier: 'Une question.' }, meta: {}, answer: mot };
        assert.match(rendu.previewGrille(it, slot, 3, true), new RegExp(`>${mot}<`));
    }
});
