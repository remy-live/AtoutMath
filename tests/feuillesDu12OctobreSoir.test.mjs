// LES TROIS CORRECTIONS DE FEUILLE TRANCHÉES PAR RÉMY LE 12 OCTOBRE AU SOIR
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   4. « L'Égalité à Compléter » : une ligne de réponse en TROP, à droite d'une
//      fraction qui porte déjà son trou.
//   5. « Valeur absolue » : un ensemble en deux morceaux, dessiné à DEUX
//      hauteurs comme s'il s'agissait de deux ensembles.
//   3. Le champ de trèfles seul qui partait sur une page presque blanche.
//
// Et un quatrième, trouvé en vérifiant les trois : le MOINS des mathématiques
// s'imprimait « " ». Celui-là mérite plus qu'une épreuve ponctuelle — voir la
// dernière de ce fichier.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { generateurDeFiche } from '../js/core/registry.js';
import { exercices } from '../js/data/catalog.js';
import { planDAxe } from '../js/core/generators/intervalles.js';
import { trouDe, trouDessineParUneFraction } from '../js/core/fiche.js';
import { fauxPdf, poserUnDocumentDeSecours, SLOT_ESSAI } from '../tools/fauxPdf.mjs';

poserUnDocumentDeSecours();
const { RENDUS } = await import('../js/ui/printSheet.js');
const { pourPdf, ECRITS } = await import('../js/ui/ficheRendu.js');

// --- 4. Un trou DANS une fraction ne demande pas de seconde place -----------

test('UNE FRACTION À TROU NE REÇOIT PAS DE LIGNE DE RÉPONSE EN PLUS', () => {
    // « 1/3 = ?/9 » : après `texteImprime`, le « ? » devient une largeur
    // d'espaces bordée d'insécables — le trou. Il est DANS la fraction, donc
    // la fraction le dessine à son étage, et rien ne doit s'ajouter au bout de
    // la ligne. Rémy : « le pointillé ajouté à droite propose un second
    // endroit pour la même réponse ».
    const trou = '       ';
    const ligne = `1/3 = ${trou}/9`;
    const t = trouDe(ligne);
    assert.ok(t, 'le trou de la fraction n\'est plus repéré du tout');
    assert.equal(trouDessineParUneFraction(ligne, t), true,
        `le trou de « ${ligne} » n'est pas reconnu comme étant dans la fraction`);

    // ET LA RÉCIPROQUE, qui est la moitié qui compte : un trou de PHRASE doit
    // continuer à recevoir sa place. Sans cette seconde assertion, on pourrait
    // rendre `true` partout et l'épreuve passerait — en supprimant toutes les
    // lignes de réponse de toutes les fiches.
    const phrase = `82 041 = 80 000 +${trou}+ 40 + 1`;
    const tp = trouDe(phrase);
    assert.ok(tp, 'le trou de la phrase n\'est plus repéré');
    assert.equal(trouDessineParUneFraction(phrase, tp), false,
        'un trou de PHRASE serait pris pour un trou de fraction : toutes les'
        + ' lignes de réponse de la feuille disparaîtraient');
});

// --- 5. Un ensemble en deux morceaux, une seule hauteur ---------------------

test('LES MORCEAUX D\'UN MÊME ENSEMBLE SONT À LA MÊME HAUTEUR SUR LE PAPIER', () => {
    // « |x − 1| > 1 » donne ]−∞ ; 0[ ∪ ]2 ; +∞[ : DEUX morceaux, UN ensemble.
    const parts = [
        { a: null, b: 0, ea: true, eb: true },
        { a: 2, b: null, ea: true, eb: true }
    ];
    const feuille = planDAxe(parts, { empiler: false });
    const hauteurs = new Set(feuille.parts.map(p => p.dy));
    assert.equal(hauteurs.size, 1,
        `les deux morceaux sont à ${hauteurs.size} hauteurs différentes :`
        + ` ${[...hauteurs].join(', ')}`);

    // ET L'ÉCRAN GARDE SON EMPILEMENT : c'est lui qui pose I et J sur le MÊME
    // axe, et les étager est alors la seule façon de les distinguer. Une
    // épreuve qui ne garderait que la feuille laisserait casser l'écran.
    const ecran = planDAxe(parts, {});
    assert.equal(new Set(ecran.parts.map(p => p.dy)).size, 2,
        'l\'écran n\'empile plus ses deux ensembles : I et J se confondent');
});

// --- 3. Le rapport d'un bloc est une DIVISION ------------------------------

test('UN BLOC PLUS LARGE QUE HAUT NE DEVIENT PAS TROIS FOIS PLUS HAUT QUE LARGE', async () => {
    // Le champ de trèfles déclare `{ w: 4, h: 3 }` — une fois et un tiers plus
    // LARGE que haut. On en lisait `h` tout court, soit un bloc trois fois
    // plus haut que large : 234 mm au lieu de 58, donc un saut de page à
    // chaque fois, et le titre seul sur une feuille.
    const { rapportDuBloc } = await import('../js/ui/printParcours.js');
    assert.equal(rapportDuBloc({ proportions: { w: 4, h: 3 } }), 0.75);
    assert.equal(rapportDuBloc({ proportions: { w: 1, h: 1.18 } }), 1.18);
    assert.equal(rapportDuBloc({ proportions: { w: 1.28, h: 1 } }), 1 / 1.28);
    // « plein » n'est pas une proportion : il se traite ailleurs, et la
    // fonction ne doit pas rendre n'importe quoi pour autant.
    assert.equal(rapportDuBloc({ proportions: 'plein' }), 1);
    assert.equal(rapportDuBloc({}), 1);

    // ET LE TRÈFLE EST BIEN CELUI-LÀ. Si le rendu changeait de proportion, les
    // trois nombres ci-dessus deviendraient une arithmétique sans objet.
    assert.deepEqual(RENDUS.trefles.proportions, { w: 4, h: 3 },
        'le champ de trèfles a changé de proportion : revoir ce que garde cette épreuve');
});

// --- Et le quatrième, trouvé en vérifiant : le moins des mathématiques ------

test('AUCUN RENDU DE GRILLE N\'ÉCRIT DE CARACTÈRE QUE LE PDF NE SAIT PAS', () => {
    // CE QUE CETTE ÉPREUVE FERME, ET POURQUOI IL FALLAIT L'ÉCRIRE.
    //
    // `tools/caracteresPerdus.mjs` balaie déjà les caractères perdus — et il
    // répondait « AUCUN CARACTÈRE PERDU » pendant que la feuille des valeurs
    // absolues imprimait « |x " 2| = 1 » au lieu de « |x − 2| = 1 ». Il tire
    // les QUESTIONS en mode papier ; ces textes-là sont fabriqués par le RENDU
    // de grille, après le générateur, et personne ne les regardait.
    //
    // CE QU'ON MESURE, ET CE QU'ON NE MESURE PAS. Première écriture : « ce
    // texte est-il différent de `pourPdf(texte)` ? ». Trop large — elle
    // attrapait l'espace fine devant un « ? », qui est une question de
    // typographie et non de police, et déclarait fautifs quatre rendus
    // parfaitement lisibles.
    //
    // Seconde écriture, encore trop large : « tout ce qui sort du Latin-1 ».
    // Elle accusait le tiret cadratin et les points de suspension — que
    // l'encodage WinAnsi d'un PDF porte très bien, et que `pourPdf` laisse
    // d'ailleurs passer intacts.
    //
    // LE CRITÈRE JUSTE TIENT LES DEUX BOUTS : un caractère est fautif s'il
    // sort du Latin-1 ET si `pourPdf` l'aurait REMPLACÉ. Le premier écarte la
    // typographie française (l'espace insécable est en 0xA0) ; le second
    // écarte ce que le PDF sait écrire tel quel. Reste exactement ce qui
    // s'imprimerait de travers — le moins typographique (U+2212), qui sortait
    // en guillemet. Les symboles que `ecrireSymboles` DESSINE (π, √, les
    // exposants) s'exceptent par `ECRITS`, qui les nomme déjà.
    const fautifs = [];
    for (const exo of exercices) {
        if (!exo.printable || !RENDUS[exo.printable]) continue;
        const rendu = RENDUS[exo.printable];
        if (typeof rendu.pdfGrille !== 'function') continue;
        const gen = generateurDeFiche(exo);
        if (!gen) continue;
        for (const solution of [false, true]) {
            let pdf;
            try {
                const item = gen.generate({ ...(exo.printParams || {}), ...(exo.params || {}) },
                    { index: 0, total: 4, rng: makeRng(`car-${exo.id}`), papier: true,
                        themesExclus: [] });
                pdf = fauxPdf();
                rendu.pdfGrille(pdf, item, SLOT_ESSAI, solution, null);
            } catch (e) {
                continue;             // mesuré ailleurs ; ici on ne juge que le texte
            }
            for (const ecrit of pdf.carnet.textes) {
                const horsLatin1 = [...ecrit.t].filter(c =>
                    c.codePointAt(0) > 0xFF && !ECRITS.test(c) && pourPdf(c) !== c);
                if (horsLatin1.length) {
                    const quoi = [...new Set(horsLatin1)].map(c =>
                        `« ${c} » (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
                    fautifs.push(`  · ${exo.printable} (${exo.id})${solution ? ' [corrigé]' : ''}`
                        + ` écrit ${quoi.join(', ')} — le PDF lira « ${pourPdf(ecrit.t).slice(0, 40)} »`);
                    break;
                }
            }
        }
    }
    assert.equal(fautifs.length, 0,
        'des rendus écrivent dans le PDF sans passer par `pourPdf` :\n'
        + [...new Set(fautifs)].join('\n'));
});
