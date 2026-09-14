// TRACER L'IMAGE SUR LE QUADRILLAGE — le générateur et le dessin.
//
// Ce qui se vérifie ici n'est pas « ça marche » mais « ça ne ment jamais » :
// une question dont l'image sortirait de la grille, ou dont la réponse
// attendue ne serait pas celle que le noyau calcule, donnerait tort à un élève
// qui a raison. C'est le seul défaut qu'un exercice corrigé par la machine
// n'a pas le droit d'avoir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    GENRES, consigneDe, figureAuHasard, imageAttendue, listeDeGenres,
    tirerQuestion, transfoQuadrillageGenerator as G
} from '../js/core/generators/transfoQuadrillage.js';
import { pavageGenerator } from '../js/core/generators/pavage.js';
import '../js/core/activities/index.js';
import { getExerciseById } from '../js/data/catalog.js';
import {
    cleFigure, direLeSens, imageFigure, memeFigure, parRotation
} from '../js/core/transformations.js';
import {
    droiteDeLAxe, quadrillageSvg, versDessin, gesteDuFilm, pointDuFilm
} from '../js/core/quadrillageSvg.js';

const TIRAGES = 120;

// --- La figure de départ ------------------------------------------------------

test('la figure est d\'un seul tenant, et de la taille demandée', () => {
    for (let i = 0; i < 40; i++) {
        const f = figureAuHasard(makeRng('f' + i), 5, { x0: 1, y0: 1, x1: 8, y1: 8 });
        assert.equal(f.length, 5);
        // Connexe : depuis la première case, on doit toutes les atteindre.
        const vues = new Set([`${f[0].x}|${f[0].y}`]);
        const pile = [f[0]];
        while (pile.length) {
            const p = pile.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${p.x + dx}|${p.y + dy}`;
                if (vues.has(k)) continue;
                const v = f.find(q => q.x === p.x + dx && q.y === p.y + dy);
                if (v) { vues.add(k); pile.push(v); }
            }
        }
        assert.equal(vues.size, 5, 'figure en morceaux : elle ne se retient pas');
    }
});

test('la figure reste dans la boîte qu\'on lui donne', () => {
    for (let i = 0; i < 30; i++) {
        const f = figureAuHasard(makeRng('b' + i), 4, { x0: 2, y0: 3, x1: 5, y1: 6 });
        f.forEach(p => {
            assert.ok(p.x >= 2 && p.x <= 5, `x hors boîte : ${p.x}`);
            assert.ok(p.y >= 3 && p.y <= 6, `y hors boîte : ${p.y}`);
        });
    }
});

// --- Ce que le générateur refuse de produire ----------------------------------

test('une image sort-elle du quadrillage ? jamais', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('q' + i), index: i });
        it.meta.image.forEach(p => {
            assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), 'case hors carreaux');
            assert.ok(p.x >= 0 && p.x < it.meta.largeur, `colonne ${p.x} hors grille`);
            assert.ok(p.y >= 0 && p.y < it.meta.hauteur, `ligne ${p.y} hors grille`);
        });
    }
});

test('l\'image ne chevauche jamais la figure de départ', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('c' + i), index: i }).meta;
        const pris = new Set(m.depart.map(p => `${p.x}|${p.y}`));
        m.image.forEach(p => assert.ok(!pris.has(`${p.x}|${p.y}`),
            'une case appartiendrait aux deux figures'));
    }
});

test('l\'image n\'est jamais la figure de départ elle-même', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('d' + i), index: i }).meta;
        assert.ok(!memeFigure(m.depart, m.image), 'la question n\'aurait plus d\'objet');
    }
});

test('l\'image compte exactement autant de cases que le départ', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('e' + i), index: i }).meta;
        assert.equal(m.image.length, m.depart.length);
    }
});

// --- LA RÉPONSE ATTENDUE EST CELLE DU NOYAU -----------------------------------

test('LA RÉPONSE ENREGISTRÉE EST EXACTEMENT L\'IMAGE CALCULÉE PAR LE NOYAU', () => {
    // Si ces deux-là divergeaient, l'élève aurait beau tracer juste, la
    // correction lui donnerait tort — et rien à l'écran ne le dirait.
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('r' + i), index: i });
        assert.equal(it.answer, cleFigure(imageFigure(it.meta.depart, it.meta.transfo)));
        assert.equal(it.answer, cleFigure(imageAttendue(it.meta)));
    }
});

test('l\'ordre des cliques ne change pas la réponse', () => {
    const it = G.generate({}, { rng: makeRng('ordre'), index: 0 });
    const inverse = [...it.meta.image].reverse();
    assert.equal(cleFigure(inverse), it.answer);
    assert.equal(cleFigure([...it.meta.image].sort((a, b) => a.x - b.x)), it.answer);
});

test('une même graine redonne exactement la même question', () => {
    const a = G.generate({}, { rng: makeRng('meme'), index: 0 });
    const b = G.generate({}, { rng: makeRng('meme'), index: 0 });
    assert.equal(a.answer, b.answer);
    assert.equal(a.prompt.text, b.prompt.text);
});

// --- Les réglages -------------------------------------------------------------

test('le réglage « Transformations » est respecté', () => {
    for (const genre of GENRES) {
        for (let i = 0; i < 25; i++) {
            const m = G.generate({ genres: [genre] }, { rng: makeRng(genre + i), index: i }).meta;
            assert.equal(m.genre, genre, `on a demandé ${genre} et reçu ${m.genre}`);
        }
    }
});

test('un réglage vide retombe sur les quatre transformations', () => {
    const vus = new Set();
    for (let i = 0; i < 80; i++) {
        vus.add(G.generate({ genres: [] }, { rng: makeRng('v' + i), index: i }).meta.genre);
    }
    GENRES.forEach(g => assert.ok(vus.has(g), `${g} n'est jamais sorti`));
});

test('SANS LES OBLIQUES, AUCUN AXE À 45° NE SORT', () => {
    // C'est un autre exercice : devant une diagonale on ne compte plus ni
    // lignes ni colonnes, et l'élève de sixième se retrouve sans méthode.
    for (let i = 0; i < 80; i++) {
        const m = G.generate({ genres: ['axiale'], obliques: false },
            { rng: makeRng('o' + i), index: i }).meta;
        assert.ok(['v', 'h'].includes(m.transfo.axe.type), `axe ${m.transfo.axe.type} interdit ici`);
    }
});

test('avec les obliques, les quatre familles d\'axes finissent par sortir', () => {
    const vus = new Set();
    for (let i = 0; i < 200; i++) {
        vus.add(G.generate({ genres: ['axiale'], obliques: true },
            { rng: makeRng('t' + i), index: i }).meta.transfo.axe.type);
    }
    ['v', 'h', 'd', 'a'].forEach(t => assert.ok(vus.has(t), `aucun axe de type ${t}`));
});

test('le quadrillage suit le réglage de taille', () => {
    const p = G.generate({ taille: 'petit' }, { rng: makeRng('p'), index: 0 }).meta;
    const g = G.generate({ taille: 'grand' }, { rng: makeRng('g'), index: 0 }).meta;
    assert.equal(p.largeur, 8);
    assert.equal(p.depart.length, 4);
    assert.equal(g.largeur, 12);
    assert.equal(g.depart.length, 6);
});

test('JAMAIS DE DEMI-TOUR PRÉSENTÉ COMME UNE ROTATION', () => {
    // Un demi-tour EST une symétrie centrale : la question aurait deux
    // réponses justes et n'en compterait qu'une.
    for (let i = 0; i < 60; i++) {
        const m = G.generate({ genres: ['rotation'] }, { rng: makeRng('rot' + i), index: i }).meta;
        assert.ok([1, 3].includes(m.transfo.quarts), `quarts = ${m.transfo.quarts}`);
    }
});

// --- Les mots -----------------------------------------------------------------

test('la consigne nomme la transformation demandée', () => {
    assert.match(consigneDe({ genre: 'axiale', axe: { type: 'v', a: 3 } }), /symétrie d'axe/);
    assert.match(consigneDe({ genre: 'centrale', centre: { x: 1, y: 1 } }), /centre O/);
    assert.match(consigneDe({ genre: 'translation', vecteur: { x: 4, y: -3 } }),
        /4 carreaux vers la droite et 3 vers le haut/);
    // LE SENS EST CELUI DU CALCUL, PAS L'INVERSE. `quarts = 1` envoie la case
    // à l'est du centre vers le BAS — l'ordonnée d'un quadrillage descend —,
    // donc dans le sens des aiguilles : le sens INDIRECT. La consigne
    // annonçait « vers la gauche », l'exact contraire, et la flèche dessinée
    // tournait avec elle : l'élève qui suivait les mots avait faux.
    assert.match(consigneDe({ genre: 'rotation', centre: { x: 0, y: 0 }, quarts: 3 }),
        /sens direct/);
    assert.match(consigneDe({ genre: 'rotation', centre: { x: 0, y: 0 }, quarts: 1 }),
        /sens indirect/);
});

test('chaque question porte une consigne, des indices et une correction', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('m' + i), index: i });
        assert.ok(it.prompt.text.length > 20, 'consigne vide');
        assert.ok(it.hints.length >= 3, 'moins de trois indices');
        assert.match(it.explanation, /Elle occupe les cases/);
        assert.equal(it.answerKind, 'grid');
        assert.match(it.skillId, /^geo\.transfo\./);
    }
});

test('l\'énoncé porte sa figure — le carnet d\'erreurs doit pouvoir la remontrer', () => {
    const it = G.generate({}, { rng: makeRng('fig'), index: 0 });
    assert.match(it.prompt.html, /figure-wrap/);
    assert.match(it.prompt.html, /<svg/);
    assert.match(it.prompt.html, /qd-depart/);
});

// --- Le dessin ----------------------------------------------------------------

test('LE DEMI-CARREAU N\'EST APPLIQUÉ QU\'UNE FOIS', () => {
    // La case (3 ; 2) occupe le carré de (3 ; 2) à (4 ; 3) : son centre est en
    // (3,5 ; 2,5). Un axe d'équation x = 3 en cases passe donc par la
    // verticale d'abscisse 3,5 sur le dessin. C'est la seule subtilité du
    // module, et deux conversions différentes déplaceraient l'axe.
    assert.equal(versDessin(3), 3.5);
    assert.deepEqual(droiteDeLAxe({ type: 'v', a: 3 }), { verticale: true, a: 0, b: 3.5 });
    assert.deepEqual(droiteDeLAxe({ type: 'h', a: 2.5 }), { verticale: false, a: 0, b: 3 });
    // Sur une diagonale montante, les deux demi-carreaux se compensent ;
    // sur la descendante, ils s'ajoutent.
    assert.deepEqual(droiteDeLAxe({ type: 'd', a: 4 }), { verticale: false, a: 1, b: 4 });
    assert.deepEqual(droiteDeLAxe({ type: 'a', a: 4 }), { verticale: false, a: -1, b: 5 });
});

test('la droite du dessin passe bien par le milieu de deux cases symétriques', () => {
    // Vérification par le calcul plutôt que par l'œil : le milieu du segment
    // qui joint une case et son image doit tomber SUR la droite tracée.
    const axe = { type: 'v', a: 3.5 };
    const d = droiteDeLAxe(axe);
    const depart = { x: 2, y: 1 };
    const image = { x: 2 * axe.a - depart.x, y: depart.y };
    const milieu = versDessin((depart.x + image.x) / 2);
    assert.equal(milieu, d.b);
});

test('le quadrillage dessiné porte ses carreaux, ses cases et son axe', () => {
    const svg = quadrillageSvg({
        largeur: 6, hauteur: 5,
        figures: [{ cases: [{ x: 1, y: 1 }, { x: 1, y: 2 }], classe: 'qd-depart' }],
        transfo: { genre: 'axiale', axe: { type: 'v', a: 2.5 } }
    });
    // 7 verticales + 6 horizontales pour une grille de 6 × 5.
    assert.equal((svg.match(/qd-grille/g) || []).length, 13);
    assert.equal((svg.match(/qd-depart/g) || []).length, 2);
    assert.equal((svg.match(/qd-axe/g) || []).length, 1);
    assert.match(svg, /qd-marques/);
    assert.ok(!/qd-hit/.test(svg), 'un énoncé figé n\'a pas de cibles cliquables');
});

test('le quadrillage interactif porte une cible par case, et elles passent en dernier', () => {
    const svg = quadrillageSvg({
        largeur: 4, hauteur: 3,
        figures: [{ cases: [{ x: 0, y: 0 }], classe: 'qd-depart' }],
        transfo: { genre: 'centrale', centre: { x: 2, y: 1 } },
        interactive: true
    });
    assert.equal((svg.match(/class="qd-hit"/g) || []).length, 12);
    assert.match(svg, /data-c="3,2"/);
    // Posées avant les figures, les cibles auraient été recouvertes et la
    // moitié de la grille aurait cessé de répondre.
    assert.ok(svg.indexOf('qd-depart') < svg.indexOf('qd-hit'));
    assert.ok(svg.indexOf('qd-marques') < svg.indexOf('qd-hit'));
});

test('le rayon de l\'arc de rotation est en pixels, pas en carreaux', () => {
    // Écrit en carreaux, l'arc était plus petit que le trait qui le dessine :
    // le sens du quart de tour devenait invisible, et la question ambiguë.
    const svg = quadrillageSvg({
        largeur: 6, hauteur: 6, cote: 30,
        transfo: { genre: 'rotation', centre: { x: 2, y: 2 }, quarts: 1 }
    });
    const arc = svg.match(/A (\d+(?:\.\d+)?) /);
    assert.ok(arc, 'aucun arc tracé');
    assert.ok(Number(arc[1]) > 10, `rayon de ${arc[1]} : invisible`);
});

test('deux quadrillages d\'une même page n\'ont pas les mêmes identifiants', () => {
    // Sans préfixe distinct, la flèche du second irait chercher la définition
    // du premier — et sur une feuille imprimée, une seule des deux existe.
    const a = quadrillageSvg({ largeur: 3, hauteur: 3, prefixe: 'un' });
    const b = quadrillageSvg({ largeur: 3, hauteur: 3, prefixe: 'deux' });
    assert.match(a, /id="un-fleche"/);
    assert.match(b, /id="deux-fleche"/);
});

// --- Le tirage ----------------------------------------------------------------

test('un tirage qui ne donne rien de propre rend null, il n\'invente pas', () => {
    // Une grille de 3 × 3 ne peut pas contenir une figure de 5 cases avec sa
    // marge, encore moins son image : il faut le dire, pas le bricoler.
    let nuls = 0;
    for (let i = 0; i < 30; i++) {
        if (!tirerQuestion(makeRng('n' + i), { genre: 'axiale', l: 3, h: 3, cases: 5 })) nuls++;
    }
    assert.equal(nuls, 30);
});

test('même dans un quadrillage trop petit, le générateur rend une question jouable', () => {
    // Le dernier recours est déterministe : mieux vaut un L translaté qu'un
    // item vide qui bloquerait l'élève.
    const it = G.generate({ taille: 'petit' }, { rng: makeRng('secours'), index: 0 });
    assert.ok(it.meta.depart.length >= 4);
    assert.equal(it.answer, cleFigure(imageAttendue(it.meta)));
});

// --- Le réglage, quelle que soit sa forme -------------------------------------

test('UN RÉGLAGE ARRIVÉ EN CHAÎNE NE FAIT PAS DISPARAÎTRE L\'EXERCICE', () => {
    // Le manifeste déclarait `type: 'multi'`, qui n'existe pas : le panneau
    // rendait un champ de TEXTE, qui renvoyait « axiale,translation », et
    // `.filter` sur une chaîne lève une TypeError. L'exercice ne s'affichait
    // plus du tout — ni à l'écran, ni sur la feuille — et rien ne le disait.
    assert.deepEqual(listeDeGenres('axiale,translation'), ['axiale', 'translation']);
    assert.deepEqual(listeDeGenres(' rotation , centrale '), ['rotation', 'centrale']);
    assert.deepEqual(listeDeGenres(['centrale']), ['centrale']);
    // Vide, absurde ou absent : on retombe sur les quatre. Mieux vaut une
    // question hors réglage qu'un écran blanc.
    assert.deepEqual(listeDeGenres(''), GENRES);
    assert.deepEqual(listeDeGenres('nimportequoi'), GENRES);
    assert.deepEqual(listeDeGenres(undefined), GENRES);
    assert.deepEqual(listeDeGenres(null), GENRES);
    assert.deepEqual(listeDeGenres(42), GENRES);
});

test('le générateur produit une figure sous chacune de ces formes', () => {
    for (const genres of ['axiale,translation', '', undefined, ['rotation'], 'zzz', null]) {
        const it = G.generate({ genres }, { rng: makeRng('forme'), index: 0 });
        assert.match(it.prompt.html, /<svg/, `pas de figure pour ${JSON.stringify(genres)}`);
        assert.ok(it.answer.length > 0);
    }
});

test('LE TYPE DE CHAQUE RÉGLAGE EXISTE VRAIMENT', () => {
    // La cause première du bug : un type inconnu ne lève rien, il change
    // seulement le champ rendu. On vérifie donc les types eux-mêmes.
    const CONNUS = ['select', 'multiselect', 'checkbox', 'number', 'text'];
    [G, pavageGenerator].forEach(gen => {
        (gen.params || []).forEach(p => {
            assert.ok(CONNUS.includes(p.type),
                `${gen.id} / ${p.id} : type « ${p.type} » inconnu du panneau de réglages`);
        });
    });
});

// --- Le sens de rotation, et les traits du quadrillage ------------------------

test('LE SENS ANNONCÉ EST CELUI QUE LE CALCUL PRODUIT', () => {
    // Le test qui aurait attrapé l'inversion. Une case posée à l'EST du centre
    // descend pour `quarts = 1` : c'est le sens des aiguilles, l'indirect.
    const centre = { x: 0, y: 0 };
    const est = { x: 1, y: 0 };
    assert.ok(parRotation(est, centre, 1).y > 0, 'quarts=1 doit descendre à l\'est');
    assert.ok(parRotation(est, centre, 3).y < 0, 'quarts=3 doit monter à l\'est');
    assert.match(direLeSens(1), /indirect/);
    assert.match(direLeSens(3), /direct/);
    assert.ok(!/indirect/.test(direLeSens(3)), '« direct » ne doit pas contenir « indirect » par accident');
    // Et la formule des aiguilles suit le même sens.
    assert.match(direLeSens(1), /dans le sens des aiguilles/);
    assert.match(direLeSens(3), /inverse des aiguilles/);
});

test('LA FLÈCHE DESSINÉE TOURNE DU CÔTÉ DU CALCUL', () => {
    // Elle aussi partait à l'envers, en accord avec la consigne fausse.
    const arcDe = (quarts) => {
        const svg = quadrillageSvg({
            largeur: 6, hauteur: 6, cote: 30,
            transfo: { genre: 'rotation', centre: { x: 2, y: 2 }, quarts }
        });
        const m = svg.match(/d="M ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ 0 0 \d ([\d.]+) ([\d.]+)"/);
        assert.ok(m, `arc introuvable pour quarts=${quarts}`);
        return { y1: Number(m[2]), y2: Number(m[4]) };
    };
    assert.ok(arcDe(1).y2 > arcDe(1).y1, 'quarts=1 : la flèche doit descendre');
    assert.ok(arcDe(3).y2 < arcDe(3).y1, 'quarts=3 : la flèche doit monter');
});

test('L\'AXE ET LE CENTRE TOMBENT SUR LES TRAITS DU QUADRILLAGE', () => {
    // Rémy : « peux-tu faire que l'axe ou le point ait leur origine sur des
    // intersections du quadrillage ». Un trait est un DEMI-ENTIER en
    // coordonnées de case : la case `a` a son centre en `a`, donc le trait à
    // sa droite est en `a + 0,5`.
    const surTrait = (v) => Number.isInteger(v * 2) && !Number.isInteger(v);
    for (let i = 0; i < 150; i++) {
        const t = G.generate({}, { rng: makeRng('tr' + i), index: i }).meta.transfo;
        if (t.genre === 'axiale') {
            if (t.axe.type === 'v' || t.axe.type === 'h') {
                assert.ok(surTrait(t.axe.a), `axe ${t.axe.type} = ${t.axe.a} coupe une case en deux`);
            } else {
                // Une oblique passe par les nœuds quand son paramètre est entier.
                assert.ok(Number.isInteger(t.axe.a), `oblique ${t.axe.a} ne passe pas par les nœuds`);
            }
        }
        if (t.centre) {
            assert.ok(surTrait(t.centre.x) && surTrait(t.centre.y),
                `centre (${t.centre.x} ; ${t.centre.y}) n'est pas sur un nœud`);
        }
    }
});

test('LE FILM ATTERRIT SUR LA CORRECTION, POUR LES QUATRE MOUVEMENTS', () => {
    // Rémy, sur son banc : « le mouvement n'est pas bon pour la symétrie
    // axiale — vérifie tous les mouvements » et, pour l'autre exercice,
    // « pour la symétrie centrale, le mouvement est faux ».
    //
    // IL AVAIT RAISON, Y COMPRIS SUR LE « TOUS ». « Montre le mouvement »
    // rejoue la transformation : la figure glisse, tourne ou se plie jusqu'à
    // son image. Ce calcul vivait dans l'activité, au milieu du DOM, et il y
    // avait OUBLIÉ le demi-carreau — la case (3 ; 2) occupe le carré de
    // (3 ; 2) à (4 ; 3), donc l'axe « x = 3 » passe par 3,5 sur le dessin. Le
    // film pliait autour de 3, c'est-à-dire autour du BORD de la case, et la
    // figure atterrissait une case à côté de sa propre correction. L'élève
    // voyait donc un mouvement qui contredisait ce qu'on lui demandait.
    // Mesuré avant correction : 70 films faux sur 97, et la translation était
    // la seule juste — elle n'a ni axe ni centre à placer.
    //
    // CE TEST EST LA RAISON D'ÊTRE DU DÉPLACEMENT. Le geste est maintenant
    // pur (`gesteDuFilm` / `pointDuFilm` dans core/quadrillageSvg.js), donc
    // vérifiable sans navigateur : on emmène chaque case de départ jusqu'à
    // t = 1 et l'on exige qu'elle tombe sur l'image attendue, à la case près.
    const cle = (p) => `${Math.round(p.x - 0.5)}|${Math.round(p.y - 0.5)}`;
    let vus = 0;
    for (const genre of ['axiale', 'centrale', 'translation', 'rotation']) {
        let pourCeGenre = 0;
        for (let i = 0; i < 40; i++) {
            const q = tirerQuestion(makeRng(`film_${genre}_${i}`),
                { genre, l: 12, h: 10, cases: 5, obliques: true });
            if (!q || !q.transfo) continue;
            pourCeGenre++; vus++;
            const geste = gesteDuFilm(q.transfo);
            const arrivee = (q.depart || [])
                .map(c => pointDuFilm(geste, 1, { x: versDessin(c.x), y: versDessin(c.y) }))
                .map(cle).sort();
            const attendu = imageAttendue(q).map(c => `${c.x}|${c.y}`).sort();
            assert.deepEqual(arrivee, attendu,
                `${genre} #${i} : le film n'arrive pas sur l'image attendue`);
        }
        assert.ok(pourCeGenre > 0, `aucune question tirée pour « ${genre} »`);
    }
    assert.ok(vus >= 40, `échantillon trop maigre : ${vus} questions`);
});

test('À MI-CHEMIN, UNE SYMÉTRIE EST APLATIE SUR SON AXE', () => {
    // C'est ce qui fait comprendre le pliage, et c'est aussi ce qui prouve que
    // l'axe du film est bien l'axe dessiné : à t = 0,5 l'échelle vaut zéro,
    // donc TOUTES les cases tombent exactement sur la droite.
    const q = tirerQuestion(makeRng('pli'), { genre: 'axiale', l: 12, h: 10, cases: 5, obliques: true });
    const geste = gesteDuFilm(q.transfo);
    assert.equal(geste.genre, 'plie');
    const sur = (q.depart || []).map(c =>
        pointDuFilm(geste, 0.5, { x: versDessin(c.x), y: versDessin(c.y) }));
    // La droite passe par (cx, cy) avec la pente donnée par l'angle.
    const r = geste.angle * Math.PI / 180;
    sur.forEach(p => {
        // Distance à la droite : la composante perpendiculaire doit être nulle.
        const dx = p.x - geste.cx, dy = p.y - geste.cy;
        const perp = -dx * Math.sin(r) + dy * Math.cos(r);
        assert.ok(Math.abs(perp) < 1e-9, `case hors de l'axe à mi-pliage : ${perp}`);
    });
});

test('AU DÉPART, LE FILM NE BOUGE RIEN', () => {
    // t = 0 doit être l'identité pour les quatre : un film qui commence par un
    // saut ne montre pas le mouvement, il montre le résultat.
    for (const genre of ['axiale', 'centrale', 'translation', 'rotation']) {
        const q = tirerQuestion(makeRng(`zero_${genre}`),
            { genre, l: 12, h: 10, cases: 5, obliques: true });
        if (!q || !q.transfo) continue;
        const geste = gesteDuFilm(q.transfo);
        (q.depart || []).forEach(c => {
            const p = { x: versDessin(c.x), y: versDessin(c.y) };
            const p0 = pointDuFilm(geste, 0, p);
            assert.ok(Math.abs(p0.x - p.x) < 1e-9 && Math.abs(p0.y - p.y) < 1e-9,
                `${genre} : le film part d'ailleurs que du départ`);
        });
    }
});

// --- LA FLÈCHE QUI GLISSE -----------------------------------------------------
//
// Rémy : « j'aimerais bien un exercice juste avec les translations où la flèche
// démarre d'un sommet de la figure puis après à un autre endroit. »
//
// Ce n'est pas un détail de dessin, c'est LA progression de la notion. Partant
// d'un sommet, la flèche montre où va ce sommet-là : on suit la pointe, on pose
// la première case, le reste se recopie. Posée ailleurs, elle ne touche plus
// rien, et il faut avoir compris qu'un vecteur est un DÉPLACEMENT et non un
// trajet entre deux points donnés.

/** Combien de cases de la figure touchent ce nœud ? Un sommet saillant : une. */
function casesAuNoeud(depart, noeud) {
    let n = 0;
    depart.forEach(c => {
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => {
            if (c.x + dx === noeud.x && c.y + dy === noeud.y) n++;
        });
    });
    return n;
}

test('LA FLÈCHE PART D\'UN SOMMET SAILLANT, pas d\'un milieu de côté', () => {
    // Un nœud pris entre deux cases est au milieu d'un côté : une flèche qui en
    // part semble sortir du bord, pas d'un sommet.
    for (let i = 0; i < 40; i++) {
        const item = G.generate(
            { genres: ['translation'], fleche: 'sommet', taille: 'moyen' },
            { rng: makeRng(`sommet-${i}`), index: i });
        const m = item.meta;
        assert.equal(m.genre, 'translation', 'ce réglage ne doit produire que des translations');
        assert.equal(casesAuNoeud(m.depart, m.ancre), 1,
            `graine ${i} : la flèche ne part pas d'un sommet saillant`);
        // Et sa pointe reste dans le quadrillage.
        const bout = { x: m.ancre.x + m.transfo.vecteur.x, y: m.ancre.y + m.transfo.vecteur.y };
        assert.ok(bout.x >= 0 && bout.x <= m.largeur && bout.y >= 0 && bout.y <= m.hauteur,
            `graine ${i} : la pointe sort du quadrillage`);
    }
});

test('POSÉE AILLEURS, ELLE NE TOUCHE PLUS LA FIGURE', () => {
    for (let i = 0; i < 40; i++) {
        const item = G.generate(
            { genres: ['translation'], fleche: 'ailleurs', taille: 'moyen' },
            { rng: makeRng(`ailleurs-${i}`), index: i });
        const m = item.meta;
        assert.equal(casesAuNoeud(m.depart, m.ancre), 0,
            `graine ${i} : la flèche part quand même d'un coin de la figure`);
    }
});

test('EN ALTERNANCE, UNE QUESTION SUR DEUX PART D\'UN SOMMET', () => {
    // L'alternance suit le RANG de la question et non un tirage : c'est en
    // voyant les deux poses se suivre qu'on comprend ce que la seconde enlève.
    // Deux questions de suite au même endroit n'apprendraient rien de plus.
    const surSommet = [];
    for (let i = 0; i < 12; i++) {
        const item = G.generate(
            { genres: ['translation'], fleche: 'melange', taille: 'moyen' },
            { rng: makeRng(`melange-${i}`), index: i });
        surSommet.push(casesAuNoeud(item.meta.depart, item.meta.ancre) === 1);
    }
    assert.deepEqual(surSommet, [true, false, true, false, true, false,
        true, false, true, false, true, false]);
});

test('SUR UN EXERCICE DE TRANSLATIONS SEULES, LA CONSIGNE SE TAIT', () => {
    // Annoncer « 2 carreaux vers la gauche » rend la flèche décorative : on
    // compte, et l'on n'a jamais regardé le dessin. Or c'est lire la flèche
    // qu'on veut faire travailler.
    const t = { genre: 'translation', vecteur: { x: -2, y: -2 } };
    assert.match(consigneDe(t), /2 carreaux/);
    assert.match(consigneDe(t, { motsDuVecteur: false }), /flèche rouge/);
    assert.equal(/carreaux vers/.test(consigneDe(t, { motsDuVecteur: false })), false);
    // Les autres transformations ne sont pas concernées : le réglage ne touche
    // qu'à la translation.
    const axe = { genre: 'axiale', axe: { type: 'v', a: 4.5 } };
    assert.equal(consigneDe(axe), consigneDe(axe, { motsDuVecteur: false }));
});

test('L\'EXERCICE « La Flèche qui Glisse » tient debout', () => {
    const exo = getExerciseById('geo-translation-fleche');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.deepEqual(exo.params.genres, ['translation'],
        'Rémy le voulait « juste avec les translations »');
    assert.equal(exo.params.motsDuVecteur, false, 'la flèche doit être la seule donnée');
    assert.deepEqual(exo.skills, ['geo.transfo.translation']);
    assert.ok(exo.printable, 'il doit s\'imprimer comme son grand frère');
});
