// LA COMPOSITION LIBRE D'UN DINGBAT — ce qui se vérifie sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « qqch pour éditer des dingbats et les transformer en json. Globalement
// un éditeur de lettre où on peut choisir l'orientation la couleur rajouter des
// traits des formes. »
//
// ── CE QUE CES ÉPREUVES GARDENT ────────────────────────────────────────────
//
// L'ATELIER EST UN ÉCRAN, DONC IL N'EST PAS ÉPROUVABLE ICI. Ce qui l'est, c'est
// tout ce qu'il PRODUIT : un dessin, et du JSON. Et ce qui compte n'est pas que
// l'atelier marche aujourd'hui — c'est que l'énigme qu'il fabrique soit JOUABLE
// dans six mois, quand elle aura été collée dans `js/data/dingbats.js` et que
// personne ne se souviendra d'où elle vient.
//
// Les quatre invariants que `tests/dingbat.test.mjs` exige des cent neuf écrites
// à la main sont donc repassés ici sur une composition libre. Si une énigme de
// l'atelier ne les tenait pas, elle ferait tomber la suite entière le jour où on
// la collerait — c'est-à-dire longtemps après qu'on l'ait composée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    DISPOSITIONS, dessiner, juste, attendues, indices, normaliser
} from '../js/core/dingbat.js';
import {
    TOILE, COULEURS, FORMES_LIBRES, couleurCss, elementNeuf, dessinerElement,
    rendreLibre, validerLibre, enigmeEnJson, enigmeEnTexte, direLibre
} from '../js/core/dingbatLibre.js';

/** Une composition complète, du genre que l'atelier produit. */
function exemple(quoi = {}) {
    return {
        id: 'dg-essai-libre', theme: 'maths', niveau: 2, forme: 'libre',
        reponse: 'racine carrée', variantes: ['la racine carrée'],
        aide: 'Regarde ce qui entoure le mot.',
        explication: 'Le mot est écrit dans un carré : on lit « racine carrée ».',
        elements: [
            { type: 'forme', forme: 'carre', x: 200, y: 130, largeur: 170, couleur: 'bleu', remplissage: 'teinte' },
            { type: 'mot', texte: 'RACINE', x: 200, y: 130, taille: 30, couleur: 'encre' },
            { type: 'trait', x1: 60, y1: 40, x2: 150, y2: 40, couleur: 'rouge', fleche: true }
        ],
        ...quoi
    };
}

test('LA DISPOSITION « LIBRE » EXISTE, ET SON INDICE NE DÉCRIT PAS LA SCÈNE', () => {
    const d = DISPOSITIONS.libre;
    assert.ok(d, 'la vingt-deuxième disposition a disparu : l\'atelier produirait des énigmes muettes');

    // SA LECTURE RESTE GÉNÉRALE, ET C'EST VOULU. Les vingt-et-une autres disent
    // leur tournure — « un mot est enfermé DANS une forme » — parce qu'elle est
    // la même pour toutes leurs énigmes. Une composition libre n'en a pas : la
    // décrire obligerait à nommer les mots posés, et un mot posé EST parfois la
    // réponse. L'indice la donnerait, ce que l'épreuve ci-dessous interdit.
    for (const mot of ['racine', 'carré', 'moitié', 'périmètre']) {
        assert.ok(!d.lit.toLowerCase().includes(mot),
            `la lecture de « libre » nomme « ${mot} » : elle donnerait des réponses`);
    }
});

test('UNE COMPOSITION LIBRE SE DESSINE DANS LE MÊME CADRE QUE LES AUTRES', () => {
    const html = dessiner(exemple());
    // LE MÊME ENROBAGE QUE LES CENT NEUF : `dg-scene` porte la mise en page du
    // cadre. Une scène libre qui s'en passerait se poserait n'importe où.
    assert.match(html, /dg-scene dg-scene--libre/);
    assert.match(html, /<svg[^>]+viewBox="0 0 400 260"/);

    // L'INVARIANT QUE `tests/dingbat.test.mjs` EXIGE DES CENT NEUF : du texte
    // qui survit au retrait des balises. Un dingbat sans rien à lire n'est pas
    // un dingbat.
    const texte = html.replace(/<[^>]*>/g, '').trim();
    assert.ok(texte.includes('RACINE'),
        'le mot posé ne survit pas au retrait des balises : la scène serait muette');
});

test('UNE TOILE VIDE OU SANS MOT JETTE, ELLE NE REND PAS UN CADRE MUET', () => {
    // LA MÊME DÉCISION QUE POUR UNE DISPOSITION INCONNUE : un cadre vide est
    // indistinguable d'un logiciel cassé, et l'élève chercherait la réponse d'un
    // dessin qui n'existe pas.
    assert.throws(() => rendreLibre({ id: 'x', elements: [] }), /composition libre vide/);
    assert.throws(() => rendreLibre({ id: 'x' }), /composition libre vide/);
    assert.throws(() => rendreLibre({
        id: 'x', elements: [{ type: 'forme', forme: 'carre', x: 10, y: 10, largeur: 40 }]
    }), /SANS AUCUN MOT/);
    // UN MOT VIDE N'EST PAS UN MOT : c'est le défaut trouvé dans la séance
    // « Relatifs » de Rémy, un mot aux titre et texte vides parmi seize lignes.
    assert.throws(() => rendreLibre({
        id: 'x', elements: [{ type: 'mot', texte: '   ', x: 10, y: 10 }]
    }), /SANS AUCUN MOT/);
    // ET UN GENRE INCONNU AUSSI : le sauter en silence ferait un dessin
    // incomplet qu'on croirait complet.
    assert.throws(() => dessinerElement({ type: 'patatoide', x: 1, y: 1 }), /genre inconnu/);
});

test('AUCUNE COULEUR DE FOND N\'EST PROPOSÉE COMME ENCRE', () => {
    // LA RÈGLE DE LA MAISON, ET ELLE NE PEUT PAS ÊTRE GARDÉE PAR LE CSS ICI.
    // `tests/contraste.test.mjs` relit les feuilles de style ; les couleurs d'une
    // composition libre, elles, voyagent dans du JSON et ne passent par aucune
    // feuille. C'est donc à cette épreuve-ci de tenir la ligne : employer
    // `--primary` ou `--danger` comme encre ne passe pas le seuil AA, et la
    // version lisible s'appelle `--primary-texte`.
    const permis = /^--(text-main|text-muted|[a-z]+-texte)$/;
    for (const c of COULEURS) {
        assert.match(c.jeton, permis,
            `la couleur « ${c.nom} » emploie ${c.jeton}, qui n'est pas de l'encre`);
        assert.equal(couleurCss(c.id), `var(${c.jeton})`);
    }
    // SEPT COULEURS AU MOINS : « on peut choisir la couleur » n'est pas un choix
    // entre deux. Et une couleur inconnue retombe sur l'encre plutôt que de
    // rendre « var(undefined) », qui ne dessine rien du tout.
    assert.ok(COULEURS.length >= 7, `seulement ${COULEURS.length} couleurs`);
    assert.equal(couleurCss('fuchsia-inventée'), 'var(--text-main)');
});

test('LE MÊME DESSIN REND LA MÊME CHAÎNE, DEUX FOIS DE SUITE', () => {
    // UN DESSIN QUI VARIE NE SE COMPARE PAS. La sonde photographie les scènes et
    // l'atelier redessine la toile à chaque frappe : un arrondi flottant qui
    // change d'un appel à l'autre ferait clignoter l'une et mentir l'autre.
    const e = exemple();
    assert.equal(rendreLibre(e), rendreLibre(e));
    // Et deux décimales suffisent : on ne veut pas de « 138.06000000000002 ».
    const avecAngle = exemple({
        elements: [{ type: 'mot', texte: 'A', x: 100 / 3, y: 50, angle: 37, taille: 20 }]
    });
    assert.ok(!/\d\.\d{3}/.test(rendreLibre(avecAngle)),
        'une coordonnée sort avec plus de deux décimales');
});

test('CE QUI NE SE VERRA PAS EST DIT AVANT L\'EXPORT', () => {
    // RIEN À SIGNALER SUR UNE COMPOSITION SAINE : un avertisseur qui crie
    // toujours ne sera plus lu — la leçon des quatre faux signalements de
    // l'atelier du quotidien, payée le même jour.
    assert.deepEqual(validerLibre(exemple()), []);

    const dit = (e) => validerLibre(e).map(a => a.dit).join(' | ');
    assert.match(dit(exemple({ elements: [] })), /toile est vide/);
    assert.match(dit(exemple({ reponse: '  ' })), /insoluble/);
    assert.match(dit(exemple({
        elements: [elementNeuf('mot', { texte: '' })]
    })), /mot est vide/);
    // HORS DE LA TOILE : l'élément existe dans le JSON et pas à l'écran.
    assert.match(dit(exemple({
        elements: [elementNeuf('mot', { x: TOILE.largeur + 90 })]
    })), /hors de la toile/);
    // UN TRAIT DE LONGUEUR NULLE est invisible, et pourtant il se sélectionne :
    // on le déplace sans jamais le voir apparaître.
    assert.match(dit(exemple({
        elements: [elementNeuf('mot'), { type: 'trait', x1: 50, y1: 50, x2: 50, y2: 50 }]
    })), /pas de longueur/);
    assert.match(dit(exemple({
        elements: [elementNeuf('mot'), { type: 'ellipse', x: 10, y: 10 }]
    })), /inconnu/);
});

test('LE JSON EXPORTÉ DIT TOUT CE QUI SERT, ET RIEN QUI NE SERVE', () => {
    const j = enigmeEnJson(exemple());
    assert.equal(j.forme, 'libre');
    assert.deepEqual(Object.keys(j).slice(0, 5),
        ['id', 'theme', 'niveau', 'forme', 'elements'],
        'l\'ordre des champs doit suivre celui de js/data/dingbats.js : ce fichier se relit à l\'œil');

    // UNE HAUTEUR SOUS UN CARRÉ EST UN MENSONGE : elle ne sert pas au dessin, et
    // quelqu'un qui relit le JSON croirait qu'elle compte.
    const carre = j.elements.find(e => e.forme === 'carre');
    assert.ok(carre && !('hauteur' in carre), 'un carré ne porte pas de hauteur');
    // ET CE QUI EST AU DÉFAUT NE S'ÉCRIT PAS : un `angle: 0` sur chaque élément
    // ferait trois lignes de bruit par énigme.
    assert.ok(!('angle' in j.elements[1]), 'un angle nul ne s\'écrit pas');

    // LE TEXTE EST DU JSON VALIDE, et il rend le même objet : c'est ce que Rémy
    // colle, donc c'est ce qu'il faut vérifier.
    assert.deepEqual(JSON.parse(enigmeEnTexte(exemple())), j);

    // UN RÉGLAGE HORS BORNES SE RAMÈNE, il ne passe pas tel quel : un niveau 9
    // ferait une énigme qu'aucun réglage ne peut tirer.
    assert.equal(enigmeEnJson(exemple({ niveau: 9 })).niveau, 4);
    assert.equal(enigmeEnJson(exemple({ niveau: 0 })).niveau, 1);
    assert.equal(enigmeEnJson(exemple({ theme: 'astronomie' })).theme, 'maths');
    // Et les variantes vides disparaissent plutôt que de laisser `['']`, que le
    // juge accepterait comme réponse vide.
    assert.ok(!('variantes' in enigmeEnJson(exemple({ variantes: ['', '  '] }))));
});

test('LA SCÈNE SE DIT À VOIX HAUTE, SANS DONNER LA RÉPONSE', () => {
    // UN ÉLÈVE QUI N'Y VOIT PAS DOIT POUVOIR JOUER. On lui dit donc ce qui est
    // écrit et comment c'est posé — ce que n'importe qui voit — jamais ce que ça
    // se lit, qui est l'énigme elle-même.
    const dit = direLibre(exemple());
    assert.match(dit, /RACINE/);
    assert.match(dit, /carré/);
    assert.match(dit, /un trait/);
    assert.ok(!juste(dit, exemple()), 'la description donne la réponse');

    // L'ORIENTATION SE DIT EN FRANÇAIS, pas en degrés quand elle tombe rond :
    // « à l'envers » s'entend, « incliné de 180 degrés » se décode.
    const tourne = (angle, quoi = {}) => direLibre({
        elements: [{ type: 'mot', texte: 'MOT', x: 10, y: 10, angle, ...quoi }]
    });
    assert.match(tourne(180), /à l'envers/);
    assert.match(tourne(90), /quart de tour vers la droite/);
    assert.match(tourne(-90), /quart de tour vers la gauche/);
    assert.match(tourne(37), /incliné de 37 degrés/);
    assert.match(tourne(0, { miroir: true }), /en miroir/);
    // Un mot droit ne se décrit pas : « le mot MOT droit » est du bruit.
    assert.ok(!/incliné|envers|quart/.test(tourne(0)));

    // ET LE DESSIN PORTE CETTE PHRASE : sans `aria-label`, un lecteur d'écran
    // annonce « image » et l'énigme n'existe pas.
    assert.match(rendreLibre(exemple()), /role="img" aria-label="Dingbat/);
});

test('UNE ÉNIGME DE L\'ATELIER TIENT LES INVARIANTS DES CENT NEUF', () => {
    // C'EST L'ÉPREUVE QUI COMPTE VRAIMENT. Une composition de l'atelier finira
    // collée dans `js/data/dingbats.js`, où `tests/dingbat.test.mjs` l'attend
    // avec quatre exigences. Si elle ne les tenait pas, elle ferait tomber la
    // suite entière le jour du collage — des semaines après qu'on l'ait écrite,
    // c'est-à-dire au pire moment pour comprendre pourquoi.
    const d = enigmeEnJson(exemple());

    // 1. elle se dessine, et pas dans le vide ;
    assert.ok(dessiner(d).replace(/<[^>]*>/g, '').trim().length > 0);
    // 2. son juge accepte toutes ses réponses ;
    for (const e of attendues(d)) assert.ok(juste(e, d), `« ${e} » serait refusé`);
    // 3. elle a une réponse écrite ;
    assert.ok(String(d.reponse).trim().length > 1);
    // 4. aucun de ses indices ne donne la réponse.
    const suite = indices(d);
    assert.ok(suite.length >= 2);
    for (const i of suite) {
        assert.ok(!juste(i, d), `un indice donne la réponse : « ${i} »`);
        assert.ok(normaliser(i) !== normaliser(d.reponse));
    }
    assert.match(suite[suite.length - 1], /commence par/);
});

test('LES FORMES ET LES ÉLÉMENTS NEUFS SE POSENT OÙ ON LES VOIT', () => {
    // POSÉ AU MILIEU, ET C'EST UNE DÉCISION. En haut à gauche — le réflexe — un
    // élément neuf se cachait sous le précédent et l'on croyait que le bouton
    // n'avait rien fait.
    for (const g of ['mot', 'trait', 'forme']) {
        const e = elementNeuf(g);
        const x = e.type === 'trait' ? (e.x1 + e.x2) / 2 : e.x;
        const y = e.type === 'trait' ? (e.y1 + e.y2) / 2 : e.y;
        assert.equal(x, TOILE.largeur / 2, `un ${g} neuf n'est pas centré`);
        assert.equal(y, TOILE.hauteur / 2, `un ${g} neuf n'est pas centré`);
        // ET IL SE DESSINE TOUT DE SUITE : un élément neuf invisible ferait
        // croire que le bouton est mort.
        assert.ok(dessinerElement(e).length > 20);
    }

    // LES SIX FORMES SE DESSINENT TOUTES, et celles qui s'annoncent égales le
    // sont : un « carré » de 80 sur 50 contredirait le mot qu'il porte.
    for (const f of FORMES_LIBRES) {
        const svg = dessinerElement(elementNeuf('forme', { forme: f.id, largeur: 100, hauteur: 60 }));
        assert.ok(svg.includes('<rect') || svg.includes('<ellipse') || svg.includes('<polygon'),
            `la forme « ${f.id} » ne dessine rien`);
        if (f.egal) {
            assert.ok(!/height="60"|ry="30"/.test(svg),
                `« ${f.nom} » se laisse donner une hauteur différente de sa largeur`);
        }
    }
});
