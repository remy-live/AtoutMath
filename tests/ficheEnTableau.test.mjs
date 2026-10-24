// LES QUESTIONS PRÉSENTÉES EN TABLEAU.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 octobre : « pour les calculs sur les impressions, n'hésite à
// proposer une option tableau où c'est présenté sous forme de tableau (dans les
// options d'impression) avec alternances des couleurs ou non. »
//
// CE QUE ÇA CHANGE POUR UN ÉLÈVE, et pourquoi ce n'est pas de la décoration :
// sur une feuille de calcul mental à trois ou quatre colonnes, rien ne dit où
// finit une question et où commence la suivante. L'œil saute d'une colonne à
// l'autre en cours de ligne, et l'élève répond au mauvais numéro — ce qu'on ne
// découvre qu'en corrigeant. Le filet ferme chaque case ; l'alternance, quand
// on la demande, tient la ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX RÈGLES SE GARDENT ICI, et les deux sont des règles de TABLEAU, pas de
// dessin :
//
//   1. LES CASES SE TOUCHENT. Deux cases séparées par du blanc ne font pas un
//      tableau mais un damier, et le filet n'y sert plus à rien puisque c'est
//      le blanc qui dirait déjà la séparation.
//   2. L'ALTERNANCE COMPTE LES RANGÉES, PAS LES QUESTIONS. Alterner par
//      question teindrait une case sur deux en damier sur une feuille à trois
//      colonnes : on ne suivrait plus une ligne, ce qui est précisément ce à
//      quoi sert l'alternance.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    composerBlocs, DEFAUTS_BLOCS, styleTableau, TEINTES_TABLEAU, EPAISSEURS_TABLEAU
} from '../js/core/fiche.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const mesurer = (t, taille) => t.length * taille * 0.5;

/** Une feuille de calcul mental — le cas dont parle Rémy. */
function feuille(opts) {
    const questions = Array.from({ length: 20 }, (_, i) => ({
        texte: `${i + 1} + ${i + 2} =`, reponse: String(2 * i + 3)
    }));
    return composerBlocs([{ titre: 'Additions', id: 'calc', consigne: 'Calcule.',
        questions, colonnes: 3, numeroter: true }], { orientation: 'portrait', ...opts }, mesurer);
}

const casesDe = (mise) => mise.pages.flatMap(p => p.items.filter(i => i.type === 'q'));

test('SANS L\'OPTION, RIEN NE CHANGE — pas un trait de plus', () => {
    // L'option s'ajoute à une feuille que Rémy imprime déjà depuis des mois :
    // la présentation en liste doit sortir EXACTEMENT comme avant, sinon on a
    // réglé un détail en déréglant le reste.
    const q = casesDe(feuille({}));
    assert.ok(q.length >= 20);
    assert.ok(q.every(it => it.cadre === null), 'une case est dessinée sans qu\'on l\'ait demandée');
    assert.equal(DEFAUTS_BLOCS.tableau, false);
    assert.equal(DEFAUTS_BLOCS.zebre, false);
});

test('EN TABLEAU, CHAQUE QUESTION A SA CASE', () => {
    const q = casesDe(feuille({ tableau: true }));
    assert.ok(q.length >= 20);
    assert.ok(q.every(it => it.cadre && it.cadre.w > 0 && it.cadre.h > 0),
        'une question sans case : le tableau aurait un trou');
    // Et le cadre CONTIENT son texte : une case qui coupe l'énoncé qu'elle
    // encadre est pire qu'une absence de case.
    q.forEach(it => {
        assert.ok(it.cadre.x <= it.x, 'le texte déborde à gauche');
        assert.ok(it.cadre.y <= it.y, 'le texte déborde en haut');
        assert.ok(it.cadre.x + it.cadre.w >= it.texteX + it.texteW - 0.01,
            'le texte déborde à droite');
    });
});

test('LES CASES SE TOUCHENT — c\'est un tableau, pas un damier', () => {
    // MESURÉ à l'écran avant d'écrire cette épreuve : avec la gouttière
    // ordinaire de 9 mm, les cases flottaient à un centimètre les unes des
    // autres et la feuille ressemblait à une planche d'étiquettes.
    const q = casesDe(feuille({ tableau: true }));
    const rangees = new Map();
    q.forEach(it => {
        const y = Math.round(it.cadre.y * 10) / 10;
        if (!rangees.has(y)) rangees.set(y, []);
        rangees.get(y).push(it.cadre);
    });
    assert.ok(rangees.size >= 6, `${rangees.size} rangées seulement`);
    // Horizontalement : le bord droit d'une case est le bord gauche de sa
    // voisine, au dixième de millimètre près.
    for (const cases of rangees.values()) {
        cases.sort((a, b) => a.x - b.x);
        for (let i = 1; i < cases.length; i++) {
            assert.ok(Math.abs(cases[i - 1].x + cases[i - 1].w - cases[i].x) < 0.1,
                `trou de ${(cases[i].x - cases[i - 1].x - cases[i - 1].w).toFixed(2)} mm entre deux cases`);
        }
    }
    // Verticalement : pareil d'une rangée à la suivante, tant qu'on ne change
    // pas de page.
    const hauts = [...rangees.keys()].sort((a, b) => a - b);
    for (let i = 1; i < hauts.length; i++) {
        const h = Math.max(...rangees.get(hauts[i - 1]).map(c => c.h));
        assert.ok(Math.abs(hauts[i - 1] + h - hauts[i]) < 0.1,
            `trou de ${(hauts[i] - hauts[i - 1] - h).toFixed(2)} mm entre deux rangées`);
    }
});

test('L\'ALTERNANCE SUIT LES RANGÉES, ET NON LES QUESTIONS', () => {
    // Alterner par question donnerait un damier sur une feuille à trois
    // colonnes : l'œil ne suivrait plus une ligne, qui est tout ce qu'on
    // demande à l'alternance.
    const q = casesDe(feuille({ tableau: true, zebre: true }));
    const parRangee = new Map();
    q.forEach(it => {
        const y = Math.round(it.cadre.y * 10) / 10;
        if (!parRangee.has(y)) parRangee.set(y, new Set());
        parRangee.get(y).add(it.cadre.bande);
    });
    // Dans une rangée, toutes les cases portent la MÊME bande.
    for (const bandes of parRangee.values()) {
        assert.equal(bandes.size, 1, 'une rangée panachée : c\'est un damier');
    }
    // Et d'une rangée à l'autre, elle change.
    const suite = [...parRangee.entries()].sort((a, b) => a[0] - b[0])
        .map(([, b]) => [...b][0]);
    for (let i = 1; i < suite.length; i++) {
        assert.notEqual(suite[i], suite[i - 1], 'deux rangées voisines de la même teinte');
    }
    assert.ok(suite.includes(1), 'aucune rangée teintée');
});

test('ET « SANS ALTERNANCE » VEUT DIRE SANS ALTERNANCE', () => {
    // « avec alternances des couleurs ou non » : le tableau tout seul doit
    // exister. Une feuille photocopiée sur un papier déjà gris n'a pas besoin
    // d'une bande de plus.
    const q = casesDe(feuille({ tableau: true }));
    assert.ok(q.every(it => it.cadre.bande === 0), 'une bande teintée sans qu\'on l\'ait demandée');
});

test('LES DEUX RENDUS DESSINENT LA CASE, ET DERRIÈRE LE TEXTE', () => {
    // L'APERÇU ET LE PDF SONT DEUX DESSINS DU MÊME OBJET, et c'est la leçon
    // payée trois fois sur le radical : celui qu'on oublie diverge au premier
    // réglage. Ici l'oubli serait silencieux — l'aperçu montrerait un tableau
    // et le PDF sortirait une liste.
    const FR = lire('js/ui/ficheRendu.js');
    assert.match(FR, /html \+= `<div class="fq-cellule" style="left:/);
    // ET LES DEUX LISENT LE MÊME CADRE. L'épaisseur et les couleurs étaient
    // écrites en dur aux deux endroits ; c'est `styleTableau` qui les calcule
    // maintenant, une fois, et les pose dans la cellule.
    assert.match(FR, /\$\{styleDuCadre\(it\.cadre, k\)\}/);
    assert.match(FR, /pdf\.setLineWidth\(c\.trait \|\| 0\.2\);/);
    assert.match(FR, /if \(!c\.cotes\) pdf\.rect\(c\.x, c\.y, c\.w, c\.h, 'S'\);/);
    // DERRIÈRE LE TEXTE, et c'est une question d'ORDRE : les blocs de l'aperçu
    // sont posés en absolu dans l'ordre où on les écrit, et un rectangle plein
    // tracé après l'énoncé l'effacerait purement et simplement.
    const q = FR.slice(FR.indexOf("// type 'q'"));
    assert.ok(q.indexOf('it.cadre') < q.indexOf('class="fq-num"'),
        'l\'aperçu dessine la case APRÈS le numéro : elle le couvrirait');
    const pdfQ = FR.slice(FR.indexOf('if (it.cadre) {', FR.indexOf('export function pdfItems')));
    assert.ok(pdfQ.indexOf('pdf.rect(c.x, c.y') < pdfQ.indexOf('pdf.text(`${it.n}.`'),
        'le PDF dessine la case APRÈS le numéro : elle le couvrirait');
});

test('LA CLASSE DE LA CASE N\'EST PAS CELLE DES CASES À COCHER', () => {
    // `fq-case` est déjà le nom des étiquettes à cocher du panneau
    // d'impression. Le réemployer pour la case du tableau leur aurait donné
    // `position: absolute` — les trois cases à cocher empilées au même
    // endroit, dans le panneau qui sert justement à régler la feuille.
    const CSS = lire('css/ui.css');
    assert.match(CSS, /\.fq-cellule \{[^}]*position: absolute/);
    assert.ok(!/\.fq-case \{[^}]*position: absolute/.test(CSS));
});

test('LES DEUX PANNEAUX D\'IMPRESSION PROPOSENT LE RÉGLAGE', () => {
    // Rémy : « dans les options d'impression ». Il imprime surtout la feuille
    // d'un PARCOURS — un réglage qui n'existerait que sur la fiche d'un
    // exercice seul ne répondrait pas à sa demande.
    [['js/ui/printQuestions.js', 'fq'], ['js/ui/printParcours.js', 'pp']].forEach(([f, p]) => {
        const S = lire(f);
        assert.match(S, new RegExp(`<select id="${p}-tableau"`), f);
        assert.match(S, /<option value="zebre">/, f);
        assert.match(S, /tableau: tabEl\.value !== 'liste',/, f);
        assert.match(S, /zebre: tabEl\.value === 'zebre',/, f);
    });
    // ET LE RÉGLAGE ARRIVE JUSQU'À LA MISE EN PAGE. Un menu qui se souvient de
    // son choix sans le transmettre est pire qu'un menu absent : le professeur
    // choisit, voit l'aperçu inchangé, et croit que le logiciel est cassé.
    assert.match(lire('js/ui/printQuestions.js'), /tableau: o\.tableau, zebre: o\.zebre,/);
    // ET LES DEUX MENUS REDESSINENT. MESURÉ au navigateur, deux fois à cinq
    // jours d'écart : sans cette ligne, le menu passait bien à « zébré » et la
    // feuille restait en liste — vingt questions, zéro case. Ces panneaux n'ont
    // pas d'écouteur général : chaque réglage branche le sien.
    //
    // LA PREMIÈRE FOIS, LA CORRECTION N'A ÉTÉ POSÉE QUE SUR LE PARCOURS, et le
    // défaut a vécu cinq jours de plus dans la fiche d'un exercice seul. Cette
    // épreuve regarde donc LES DEUX, et c'est tout ce qu'elle a de neuf.
    ['js/ui/printQuestions.js', 'js/ui/printParcours.js'].forEach(f => {
        assert.match(lire(f), /tabEl\.onchange = /, f);
    });
});

test('LE FILET SE RÈGLE — épaisseur, couleurs, bords extérieurs', () => {
    // RÉMY, carnet du 24 octobre : « il faudrait pouvoir choisir de manière
    // globale pour les exercices à tableau la présentation en tableau (bordure,
    // épaisseur, couleur bordure, couleur alternance/ bords extérieurs ou non).
    // on peut faire un réglage globale et affiner selon l'exercice »
    //
    // LES CINQ ARRIVENT DANS LA CELLULE, et ce sont les deux rendus qui les y
    // lisent : sans cela, le réglage existerait dans le panneau et nulle part
    // ailleurs — exactement ce dont il se plaignait.
    const q = casesDe(feuille({
        tableau: true, zebre: true, traitTableau: 0.7,
        couleurTableau: 'orange', couleurBandeTableau: 'vert'
    }));
    assert.ok(q.length >= 20);
    assert.ok(q.every(it => it.cadre.trait === 0.7), "l'épaisseur n'arrive pas");
    assert.deepEqual(q[0].cadre.filet, TEINTES_TABLEAU.orange.filet);
    assert.deepEqual(q[0].cadre.fond, TEINTES_TABLEAU.vert.bande);
    // ET LES VALEURS D'AVANT SONT LE DÉFAUT, au chiffre près : une feuille
    // déjà réglée doit sortir identique après ce changement.
    const avant = casesDe(feuille({ tableau: true }));
    assert.equal(avant[0].cadre.trait, 0.2);
    assert.deepEqual(avant[0].cadre.filet, [203, 210, 220]);
    assert.deepEqual(avant[0].cadre.fond, [240, 244, 250]);
    // LES QUATRE ÉPAISSEURS OFFERTES SE VOIENT LES UNES DES AUTRES : un menu
    // dont deux crans donnent le même trait est un menu qui ment.
    const mm = EPAISSEURS_TABLEAU.map(e => e.valeur);
    assert.equal(new Set(mm).size, mm.length);
    assert.ok(mm.every(v => v >= 0.05 && v <= 1.5), 'une épaisseur hors de ce qui s\'imprime');
});

test('SANS BORDS EXTÉRIEURS, IL NE RESTE QUE LES TRAITS QUI SÉPARENT', () => {
    // « bords extérieurs ou non ». Un côté est extérieur quand il n'a pas de
    // voisin ; sans eux, le tableau garde sa grille et perd son cadre — la
    // présentation des manuels, plus légère à la photocopie.
    const q = casesDe(feuille({ tableau: true, bordsExterieurs: false }));
    assert.ok(q.every(it => it.cadre.cotes), 'les côtés ne sont pas déclarés');
    // La toute première case n'a ni haut ni gauche, et elle a bien un bas et
    // une droite : sinon on aurait simplement effacé le filet.
    assert.equal(q[0].cadre.cotes.h, false);
    assert.equal(q[0].cadre.cotes.g, false);
    assert.equal(q[0].cadre.cotes.b, true);
    assert.equal(q[0].cadre.cotes.d, true);
    // AUCUN CÔTÉ EXTÉRIEUR NULLE PART : on regarde la géométrie, pas les
    // indices — c'est la seule façon de voir la dernière rangée, qui est
    // parfois incomplète.
    const g = Math.min(...q.map(it => it.cadre.x));
    const d = Math.max(...q.map(it => it.cadre.x + it.cadre.w));
    q.forEach(it => {
        if (Math.abs(it.cadre.x - g) < 0.1) assert.equal(it.cadre.cotes.g, false);
        if (Math.abs(it.cadre.x + it.cadre.w - d) < 0.1) assert.equal(it.cadre.cotes.d, false);
    });
    // ET AVEC LES BORDS, on ne déclare rien : `null` veut dire les quatre.
    const avec = casesDe(feuille({ tableau: true }));
    assert.ok(avec.every(it => it.cadre.cotes === null));
});

test('UN EXERCICE AFFINE LE FILET DE LA FEUILLE', () => {
    // RÉMY : « on peut faire un réglage globale et affiner selon l'exercice ».
    // Un exercice ne REMPLACE pas le réglage de la feuille, il le corrige : ce
    // qu'il ne dit pas, il le prend d'elle. Sans cette règle, ouvrir la roue
    // d'un exercice sans rien toucher le figerait sur les valeurs du moment.
    const feuilleReglee = {
        ...DEFAUTS_BLOCS, tableau: true, zebre: true, traitTableau: 0.4,
        couleurTableau: 'bleu', couleurBandeTableau: 'bleu', bordsExterieurs: true
    };
    const herite = styleTableau(feuilleReglee, {});
    assert.equal(herite.trait, 0.4);
    assert.deepEqual(herite.filet, TEINTES_TABLEAU.bleu.filet);
    assert.equal(herite.bords, true);
    // Un correctif ne touche QUE ce qu'il nomme.
    const affine = styleTableau(feuilleReglee, { presentation: { couleur: 'vert' } });
    assert.deepEqual(affine.filet, TEINTES_TABLEAU.vert.filet);
    assert.equal(affine.trait, 0.4, 'un correctif a emporté une valeur qu\'il ne nommait pas');
    assert.deepEqual(affine.fond, TEINTES_TABLEAU.bleu.bande);
    // UN EXERCICE PEUT RETIRER SON FILET sur une feuille en tableau.
    assert.equal(styleTableau(feuilleReglee, { presentation: { filet: false } }), null);
    // ET UNE FEUILLE EN LISTE NE TRACE RIEN, correctif ou pas.
    assert.equal(styleTableau({ ...DEFAUTS_BLOCS }, {}), null);
    // L'ÉPAISSEUR EST BORNÉE : la valeur peut venir d'un fichier de parcours
    // relu, et un trait de douze millimètres effacerait la feuille.
    assert.ok(styleTableau(feuilleReglee, { presentation: { trait: 99 } }).trait <= 1.5);
    assert.ok(styleTableau(feuilleReglee, { presentation: { trait: 'bleu' } }).trait > 0);
    // UNE COULEUR INCONNUE RETOMBE SUR LE GRIS, elle ne fait pas tomber la
    // feuille : un parcours enregistré avec une teinte qu'on aurait retirée
    // doit encore s'imprimer.
    assert.deepEqual(styleTableau(feuilleReglee, { presentation: { couleur: 'fuchsia' } }).filet,
        TEINTES_TABLEAU.gris.filet);
});

test('LES CINQ COMMANDES SONT ÉCRITES UNE FOIS, ET LUES AUX TROIS ENDROITS', () => {
    // LA FICHE D'UN EXERCICE, LA FEUILLE D'UN PARCOURS, ET LA ROUE D'UN
    // EXERCICE DANS CETTE FEUILLE — la dernière étant le « affiner selon
    // l'exercice » de sa phrase. Les écrire trois fois, c'est accepter qu'un
    // jour l'une des trois n'ait plus la même liste de couleurs.
    ['js/ui/printQuestions.js', 'js/ui/printParcours.js'].forEach(f => {
        assert.match(lire(f), /from '\.\/styleTableauUI\.js'/, f);
    });
    const PP = lire('js/ui/printParcours.js');
    assert.match(PP, /\$\{champsStyleTableau\('pp'\)\}/);
    assert.match(PP, /champsStyleTableau\('ppx', \{ heritage: true/);
    assert.match(lire('js/ui/printQuestions.js'), /\$\{champsStyleTableau\('fq'\)\}/);
    // ET CE QUE LA ROUE RÈGLE ARRIVE AU BLOC : sans cette ligne, le correctif
    // se garderait en mémoire sans jamais atteindre la mise en page.
    assert.match(PP, /presentation: presentations\[id\] \|\| null,/);
});
