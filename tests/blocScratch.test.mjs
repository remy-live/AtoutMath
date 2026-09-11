import { test } from 'node:test';
import assert from 'node:assert/strict';
import { U, silhouette, gelule, versSvg, versPdf, largeurChamp } from '../js/core/blocScratch.js';
import { scriptScratchSvg } from '../js/ui/scriptScratchSvg.js';

/** Tous les points d'ancrage d'un chemin (on ignore les points de contrôle). */
const ancres = (ch) => [ch.debut, ...ch.pas.map(s => (s[0] === 'L' ? [s[1], s[2]] : [s[5], s[6]]))];

test('un bloc simple tient dans sa boîte, cran compris', () => {
    const f = silhouette({ genre: 'simple', largeur: 120 });
    assert.equal(f.hauteur, U.ligne);
    const pts = ancres(f);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    assert.equal(Math.min(...xs), 0);
    assert.equal(Math.max(...xs), 120);
    assert.equal(Math.min(...ys), 0);
    // LE TENON DÉPASSE PAR LE BAS, et c'est exprès : c'est lui qui s'emboîte
    // dans le creux du bloc suivant. Huit unités exactement — la profondeur
    // du cran de Scratch, ni plus (il recouvrirait le texte de la brique d'en
    // dessous) ni moins (on ne verrait plus qu'elles s'accrochent).
    assert.equal(Math.max(...ys), U.ligne + 8);
});

test('une boucle enveloppe sa bouche et se referme par une barre', () => {
    const bouche = 80;
    const f = silhouette({ genre: 'boucle', largeur: 140, bouche });
    assert.equal(f.hauteur, U.ligne + bouche + U.basBoucle);
    // Le dos du C : la bouche est en retrait, jamais au bord gauche.
    const xs = ancres(f).map(p => p[0]);
    assert.ok(xs.includes(U.retrait), 'la bouche part du retrait');
    assert.equal(Math.max(...xs), 140);
});

test('le chapeau porte son dôme et n\'a pas de creux en haut', () => {
    const f = silhouette({ genre: 'chapeau', largeur: 160 });
    assert.equal(f.hauteur, U.chapeau);
    // Le chemin commence au bas du dôme, à gauche : rien au-dessus de zéro.
    assert.deepEqual(f.debut, [0, U.dome]);
    assert.ok(ancres(f).every(p => p[1] >= 0));
});

test('les deux rendus disent le même chemin', () => {
    // C'est toute la raison d'être du module : l'aperçu et le PDF ne peuvent
    // pas diverger, puisqu'ils lisent les mêmes segments.
    const f = silhouette({ genre: 'simple', largeur: 100 });
    const svg = versSvg(f, { x: 10, y: 20, u: 2 });
    const pdf = versPdf(f, { x: 10, y: 20, u: 2 });
    assert.ok(svg.startsWith('M 10.00 28.00'), svg.slice(0, 20));
    assert.equal(pdf.x, 10);
    assert.equal(pdf.y, 28);          // 20 + r × 2
    assert.equal(pdf.suite.length, f.pas.length);
    // Le cumul des segments relatifs retombe sur le dernier point absolu.
    let x = pdf.x, y = pdf.y;
    for (const s of pdf.suite) { x += s[s.length - 2]; y += s[s.length - 1]; }
    const dernier = ancres(f).at(-1);
    assert.ok(Math.abs(x - (10 + dernier[0] * 2)) < 1e-9);
    assert.ok(Math.abs(y - (20 + dernier[1] * 2)) < 1e-9);
});

test('la gélule d\'un nombre grandit avec lui, sans jamais se refermer', () => {
    assert.ok(largeurChamp('7') >= 30, 'un chiffre seul garde une gélule ronde');
    assert.ok(largeurChamp('144') > largeurChamp('7'));
    const g = gelule(60, U.champH);
    const ys = ancres(g).map(p => p[1]);
    assert.equal(Math.min(...ys), 0);
    assert.equal(Math.max(...ys), U.champH);
});

// --- UN SCRIPT ENTIER, POSÉ ---------------------------------------------------

test('LA BOUCLE ENVELOPPE VRAIMENT CE QU\'ELLE RÉPÈTE', () => {
    // Rémy, sur l'Automate : « les blocs sont très mal imbriqués pour les
    // boucles ». Ils l'étaient : un en-tête, une barre de couleur, un petit
    // pied — trois morceaux qui ne fermaient rien. Dans Scratch une boucle est
    // UNE SEULE PIÈCE, et c'est sa silhouette qui dit « tout ce qui est dedans
    // se refait ». On vérifie donc que le corps tient DANS la bouche.
    const svg = scriptScratchSvg([
        { id: '0', texte: 'tourner à droite', famille: 'mouvement' },
        {
            id: '1', texte: 'répéter 3 fois', famille: 'controle', corps: [
                { id: '1-0', texte: 'avancer de 2 cases', famille: 'mouvement' },
                { id: '1-1', texte: 'tourner à droite', famille: 'mouvement' }
            ]
        },
        { id: '2', texte: 'avancer de 1 case', famille: 'mouvement' }
    ]);
    // Chaque bloc est désignable : c'est tout ce dont le surligneur a besoin.
    ['0', '1', '1-0', '1-1', '2'].forEach(id =>
        assert.match(svg, new RegExp(`data-bloc="${id}"`), id));
    assert.equal(/NaN|undefined/.test(svg), false);

    // Le corps est décalé du retrait de Scratch, et il commence sous l'en-tête.
    const y = (id) => {
        const m = new RegExp(`data-bloc="${id}"><path d="M ([-0-9.]+) ([-0-9.]+)`).exec(svg);
        assert.ok(m, id);
        return { x: Number(m[1]), y: Number(m[2]) };
    };
    const boucle = y('1'), premier = y('1-0'), second = y('1-1'), apres = y('2');
    assert.equal(Math.round(premier.x - boucle.x), U.retrait, 'le corps est en retrait');
    assert.equal(Math.round(second.x - boucle.x), U.retrait);
    assert.ok(premier.y > boucle.y, 'le corps commence sous l\'en-tête');
    assert.equal(Math.round(second.y - premier.y), U.ligne, 'les blocs du corps s\'enchaînent');
    // ET LE BLOC SUIVANT PASSE SOUS LA BOUCLE ENTIÈRE, pas sous son en-tête :
    // c'est la barre du bas qui referme le C, et elle prend sa place.
    assert.ok(apres.y >= second.y + U.ligne + U.basBoucle - 1,
        `le bloc d'après chevauche la boucle (${apres.y} vs ${second.y})`);
    assert.equal(Math.round(apres.x - boucle.x), 0, 'et il revient à la marge');
});

test('une boucle vide garde une bouche, et le script grandit avec son contenu', () => {
    const vide = scriptScratchSvg([{ id: 'a', texte: 'répéter 2 fois', famille: 'controle', corps: [] }]);
    const haut = (s) => Number(/viewBox="0 0 [0-9.]+ ([0-9.]+)"/.exec(s)[1]);
    assert.ok(haut(vide) >= U.ligne + U.boucheVide + U.basBoucle);

    const pleine = scriptScratchSvg([{
        id: 'a', texte: 'répéter 2 fois', famille: 'controle',
        corps: [{ id: 'a-0', texte: 'avancer', famille: 'mouvement' }]
    }]);
    assert.ok(haut(pleine) > haut(vide), 'la bouche s\'ouvre pour ce qu\'on y met');
});

test('le compteur de tours est dans l\'en-tête de la boucle, et caché au repos', () => {
    // Il ne s'allume qu'au tour où l'on est : affiché d'emblée, il donnerait
    // une information que l'élève doit justement tenir lui-même.
    const svg = scriptScratchSvg([{ id: 'b', texte: 'répéter 4 fois', famille: 'controle', corps: [] }]);
    assert.match(svg, /data-tour="b"/);
    assert.match(svg, /visibility:hidden/);
    assert.match(svg, /data-tour-texte/);
    // Un bloc simple n'en a pas : il ne compte rien.
    const simple = scriptScratchSvg([{ id: 'c', texte: 'avancer', famille: 'mouvement' }]);
    assert.equal(/data-tour/.test(simple), false);
});
