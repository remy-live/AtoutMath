// UNE FRACTION S'ÉCRIT EN COLONNE — et trois choses ne sont PAS des fractions.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « pour la trigonométrie dans les réponses utilise des
// fractions en colonne d'ailleurs, JE NE VEUX QUE DES FRACTIONS EN COLONNES. »
//
// Et déjà le 3 novembre, pour une autre activité : « dans la réponse montre moi
// donner la fraction sous forme de fraction colonne ». Une demande qui revient
// deux fois est une règle, et une règle n'existe que si quelque chose la garde.
//
// CE QUI SE GARDE ICI TIENT EN DEUX PHRASES, et la seconde pèse plus lourd :
//
//   · ce qui est une fraction s'empile ;
//   · CE QUI N'EN EST PAS UNE NE BOUGE PAS. Trois pièges mesurés dans le
//     catalogue le 19 novembre, et chacun casserait un chapitre entier :
//     « (DE) // (CB) » (les parallèles de Thalès), « 12 km/h » (une unité
//     composée) et « g6/3/1/2/5 » (la sérialisation d'une grille de sudoku,
//     qui voyage dans `answer`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    fractionColonne, enColonnes, afficherEnColonnes, htmlDeLibelle,
    porteUneFractionEnLigne
} from '../js/core/maths/fractionColonne.js';

/** Les deux étages d'une colonne, ou null si le texte n'en porte pas. */
const etages = (html) => {
    const m = /<span class="fraction"><span class="fraction-num">([^<]*)<\/span>`?<span class="fraction-den">([^<]*)<\/span><\/span>/
        .exec(html.replace(/<\/span><span class="fraction-den">/, '<span class="fraction-den">'));
    const m2 = /<span class="fraction-num">([^<]*)<\/span><span class="fraction-den">([^<]*)<\/span>/.exec(html);
    return m2 ? { haut: m2[1], bas: m2[2] } : (m ? { haut: m[1], bas: m[2] } : null);
};

test('CE QUI EST UNE FRACTION S’EMPILE', () => {
    for (const [source, haut, bas] of [
        ['3/5', '3', '5'],
        ['sin(B) = CA / BC', 'CA', 'BC'],
        ['cos(A) = AB / AC', 'AB', 'AC'],
        ['x = 3 / 4', '3', '4'],
        ['tan(B) = 2,5 / 4', '2,5', '4']
    ]) {
        const e = etages(enColonnes(source));
        assert.ok(e, `« ${source} » n’a pas été empilé`);
        assert.equal(e.haut, haut, `mauvais numérateur pour « ${source} »`);
        assert.equal(e.bas, bas, `mauvais dénominateur pour « ${source} »`);
    }
});

test('LES TROIS PIÈGES DU CATALOGUE NE BOUGENT PAS', () => {
    // Mesurés le 19 novembre en générant un item de chacun des 287 exercices
    // et en relevant toutes les barres obliques affichées.
    const intouchables = [
        // THALÈS : deux barres veulent dire « parallèles ». Empilées, la
        // figure dirait le contraire de son énoncé.
        '(DE) // (CB). On donne AD = 4 cm, AC = 8 cm.',
        // UNE UNITÉ COMPOSÉE ne s’empile pas au tableau.
        'La voiture roule à 12 km/h.',
        '9,81 m/s',
        // LA SÉRIALISATION D’UNE GRILLE, qui voyage dans `answer` et ne
        // s’affiche jamais. Empilée, la réponse ne vaudrait plus la réponse.
        'g6/3/1/2/5/4/5/2/4/1/6/3',
        '3|2/4|2/5|2/3|3',
        // Et les tournures ordinaires du français.
        'et/ou', 'A/B/C'
    ];
    for (const t of intouchables) {
        assert.ok(!enColonnes(t).includes('class="fraction"'),
            `« ${t} » a été empilé alors que ce n’est pas une fraction`);
        assert.ok(!porteUneFractionEnLigne(t), `« ${t} » est pris pour une fraction`);
    }
});

test('TOUT CE QUI N’EST PAS UNE FRACTION EST ÉCHAPPÉ', () => {
    // La fonction rend du HTML à partir d’un TEXTE : c’est elle qui décide de
    // ce qui devient du balisage, et rien d’autre ne doit en devenir.
    const sortie = enColonnes('<b>gras</b> & "guillemets" 3/4');
    assert.ok(sortie.includes('&lt;b&gt;'), 'une balise est passée telle quelle');
    assert.ok(sortie.includes('&amp;'));
    assert.ok(sortie.includes('class="fraction"'), 'la fraction, elle, doit passer');
    // Et les deux étages aussi sont échappés : ce sont des valeurs.
    assert.ok(fractionColonne('<i>', '&').includes('&lt;i&gt;'));
});

test('UN LIBELLÉ DÉJÀ EMPILÉ GARDE SA FORME, et lui seul', () => {
    // Tout le chapitre des fractions sort du `<span class="fraction">` : il ne
    // faut ni le ré-empiler ni l’échapper.
    const deja = fractionColonne('3', '4');
    assert.equal(afficherEnColonnes(deja), deja);
    // Mais un libellé ordinaire reste échappé — on n’ouvre pas la porte à
    // n’importe quel balisage sous prétexte qu’on en laisse passer un.
    assert.equal(htmlDeLibelle('<img src=x onerror=boum>'),
        '&lt;img src=x onerror=boum&gt;');
    assert.ok(!htmlDeLibelle('<script>a</script>').includes('<script'));
});

test('UNE BALISE DÉPAREILLÉE NE CASSE PAS LA PAGE', () => {
    // Un libellé tronqué — par une coupure, par une faute de frappe dans un
    // générateur — rendrait une balise ouvrante sans sa fermante, et le bouton
    // avalerait la moitié de l’écran. On renonce alors et l’on échappe tout.
    const bancal = '<span class="fraction">3';
    assert.ok(!htmlDeLibelle(bancal).includes('<span'),
        'une balise ouvrante sans sa fermante a été rendue');
});

test('LA COLONNE SE RELIT EN LIGNE POUR LE PAPIER ET L’APERÇU', () => {
    // `js/core/apercuChoix.js` fait le chemin inverse pour la feuille imprimée
    // et pour l’aperçu du professeur : les deux écritures doivent se
    // correspondre, sans quoi l’écran et le papier diraient deux choses.
    return import('../js/core/apercuChoix.js').then(({ texteDeChoix }) => {
        assert.equal(texteDeChoix(fractionColonne('3', '4')), '3/4');
        assert.equal(texteDeChoix(enColonnes('sin(B) = CA / BC')), 'sin(B) = (CA/BC)');
    });
});
