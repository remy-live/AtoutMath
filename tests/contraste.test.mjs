// LE CONTRASTE NE SE RÉPARE PAS DEUX FOIS.
//
// Mesuré au navigateur, sur six écrans et dans les cinq thèmes : soixante-dix
// textes passaient sous le seuil AA du WCAG. La cause était presque toujours la
// même — une couleur pensée comme un FOND de bouton employée comme couleur de
// TEXTE. `--primary` en petit texte donne 4,27 sur le fond de l'application, le
// vert de réussite 2,54 sur un panneau blanc, l'orange d'avertissement 2,15.
//
// La correction est un partage : `--primary` reste la couleur des fonds,
// `--primary-texte` est sa version lisible, et chaque thème a la sienne. Ce
// que ces épreuves tiennent, c'est que le partage NE SE DÉFASSE PAS — un
// `color: var(--primary)` écrit demain rouvrirait le trou sans rien casser,
// donc sans que rien ne le signale.
//
// LE CALCUL DE CONTRASTE LUI-MÊME EST VÉRIFIÉ AU NAVIGATEUR, pas ici : il
// dépend de ce qui est empilé derrière le texte, que seul un vrai rendu
// connaît. Ici on tient la RÈGLE, là-bas on tient le RÉSULTAT.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const FEUILLES = ['ui', 'modules', 'components', 'games', 'layout']
    .map(n => ({ nom: `css/${n}.css`, texte: fs.readFileSync(new URL(`../css/${n}.css`, import.meta.url), 'utf8') }));
const BASE = fs.readFileSync(new URL('../css/base.css', import.meta.url), 'utf8');

/** Le texte d'une feuille, commentaires retirés : on teste des règles. */
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const COULEURS = ['primary', 'success', 'warning', 'danger', 'accent'];

test('AUCUNE COULEUR DE FOND N\'EST EMPLOYÉE COMME COULEUR DE TEXTE', () => {
    const coupables = [];
    FEUILLES.forEach(({ nom, texte }) => {
        const net = sansCommentaires(texte);
        COULEURS.forEach(c => {
            // `(?<![-\w])` écarte `border-color:` et `background-color:` : eux
            // n'ont pas de contraste à tenir, et la vivacité leur va bien.
            const re = new RegExp(`(?<![-\\w])color: var\\(--${c}\\)`, 'g');
            const n = (net.match(re) || []).length;
            if (n) coupables.push(`${nom} : ${n} × color: var(--${c})`);
        });
    });
    assert.deepEqual(coupables, [],
        'employer --primary (ou --success, --danger…) comme couleur de texte ne passe pas le seuil AA ;\n'
        + 'la version lisible s\'appelle --primary-texte, --success-texte, etc.');
});

test('les cinq thèmes ont TOUS leur version texte', () => {
    // Sans cela, un thème hérite de l'indigo du thème clair — une teinte qui
    // n'est pas la sienne — ou, en thème sombre, d'une couleur foncée posée
    // sur du foncé.
    const themes = ['dark', 'ocean', 'forest', 'sunset'];
    const bloc = (nom) => {
        const i = BASE.indexOf(`:root[data-theme="${nom}"]`);
        assert.ok(i > 0, `le thème ${nom} existe`);
        return BASE.slice(i, BASE.indexOf('}', i));
    };
    // Le thème clair, c'est le `:root` nu, en tête de fichier.
    const clair = BASE.slice(0, BASE.indexOf(':root[data-theme'));
    COULEURS.filter(c => c !== 'primary').forEach(c =>
        assert.match(clair, new RegExp(`--${c}-texte:`), `le thème clair définit --${c}-texte`));
    assert.match(clair, /--primary-texte:/);

    themes.forEach(t => {
        const b = bloc(t);
        assert.match(b, /--primary-texte:/, `le thème ${t} définit --primary-texte`);
        COULEURS.filter(c => c !== 'primary').forEach(c =>
            assert.match(b, new RegExp(`--${c}-texte:`), `le thème ${t} définit --${c}-texte`));
    });
});

test('LA COULEUR QUI SE POSE SUR DU BLANC PORTE, DANS LES CINQ THÈMES', () => {
    // TROISIÈME MEMBRE DE LA FAMILLE. `--primary` est un fond, `--primary-texte`
    // est du texte sur le fond de la page, et `--primary-sur-blanc` est du texte
    // sur une PASTILLE BLANCHE — le bouton « Commencer » de la carte du jour.
    //
    // POURQUOI CETTE ÉPREUVE EXISTE : le jeton vaut `var(--primary)`, donc il
    // suit le thème tout seul. C'est commode et c'est fragile — le jour où un
    // thème donnerait à sa couleur primaire une teinte claire, le bouton
    // deviendrait blanc sur blanc sans que rien ne le dise. On refait donc le
    // calcul ici, sur les valeurs écrites dans `css/base.css`.
    //
    // ON SAIT QUE CE N'EST PAS LE RENDU. Le rendu est mesuré dans le navigateur
    // (`tools/tmp/troisCouleurs.mjs` : 6,29 · 6,29 · 5,93 · 5,02 · 5,18). Ici on
    // tient la RÈGLE, là-bas le RÉSULTAT — c'est le partage annoncé en tête de
    // ce fichier, et la pastille est blanche par construction, donc le calcul
    // sur les jetons suffit à voir venir le coup.
    const net = sansCommentaires(BASE);
    const declare = /--primary-sur-blanc:\s*([^;]+);/.exec(net);
    assert.ok(declare, 'le jeton --primary-sur-blanc est déclaré');

    /** Le bloc d'un thème, ou le `:root` nu pour le thème clair. */
    const bloc = (nom) => (nom
        ? net.slice(net.indexOf(`:root[data-theme="${nom}"]`),
            net.indexOf('}', net.indexOf(`:root[data-theme="${nom}"]`)))
        : net.slice(0, net.indexOf(':root[data-theme')));

    /** Résout une indirection `var(--x)` dans le thème, puis dans `:root`. */
    const resoudre = (valeur, nom) => {
        const v = valeur.trim();
        const indirect = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
        if (!indirect) return v;
        for (const ou of [bloc(nom), bloc('')]) {
            const m = new RegExp('(?:^|[;{\\s])' + indirect[1] + ':\\s*([^;]+);').exec(ou);
            if (m) return m[1].trim();
        }
        assert.fail(`${indirect[1]} introuvable pour le thème ${nom || 'clair'}`);
    };

    const luminance = (hex) => {
        let n = hex.replace('#', '');
        if (n.length === 3) n = [...n].map(c => c + c).join('');
        assert.match(n, /^[0-9a-fA-F]{6}$/, `couleur lisible : ${hex}`);
        const v = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
            .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    // Sur du blanc, le rapport se simplifie : le blanc est toujours le clair.
    const surBlanc = (hex) => 1.05 / (luminance(hex) + 0.05);

    ['', 'dark', 'ocean', 'forest', 'sunset'].forEach(t => {
        const couleur = resoudre(declare[1], t);
        const k = surBlanc(couleur);
        assert.ok(k >= 4.5,
            `en thème ${t || 'clair'}, « Commencer » donne ${k.toFixed(2)} sur sa `
            + `pastille blanche (${couleur}) ; il en faut 4,5. Si un thème a changé `
            + 'sa couleur primaire, --primary-sur-blanc doit prendre sa propre valeur.');
    });
});

test('LE MODE PROFESSEUR NE REPREND PAS la version texte', () => {
    // `body.teacher-mode` impose l'indigo par-dessus le thème choisi. S'il
    // imposait aussi `--primary-texte`, le thème sombre perdrait sa version
    // pâle et retrouverait du foncé sur du foncé — exactement ce qu'on répare.
    const ui = sansCommentaires(FEUILLES.find(f => f.nom === 'css/ui.css').texte);
    const ligne = ui.match(/body\.teacher-mode \{[^}]*\}/);
    assert.ok(ligne, 'la règle du mode professeur existe');
    assert.ok(!/--primary-texte/.test(ligne[0]),
        'le mode professeur ne doit pas imposer --primary-texte');
});

test('LE MOUVEMENT SANS FIN S\'ARRÊTE quand on le demande', () => {
    // Onze animations sans fin dans les feuilles de style, seize de plus dans
    // les balises `<style>` des jeux, et un exercice de plus chaque jour : les
    // nommer une à une, c'est en oublier. Une seule règle les attrape toutes.
    const net = sansCommentaires(BASE);
    const bloc = net.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
    assert.ok(bloc, 'base.css porte une règle générale de mouvement réduit');
    assert.match(bloc[0], /\*, \*::before, \*::after/, 'elle vaut pour tout le document');
    assert.match(bloc[0], /animation-iteration-count: 1 !important/,
        'elle coupe la RÉPÉTITION — pas l\'animation, qui joue une fois');
    assert.ok(!/animation-duration: 0/.test(bloc[0]),
        'on ne supprime pas les animations qui ne jouent qu\'un coup');
});

test('la barre de progression garde son socle d\'ardoise', () => {
    // Le compte est écrit en blanc. Sur le gris clair d'origine il donnait
    // 2,61 : au tout début d'un exercice, quand la barre est vide, c'est-à-dire
    // au moment où l'élève le regarde le plus.
    const games = sansCommentaires(FEUILLES.find(f => f.nom === 'css/games.css').texte);
    const regle = games.match(/#game-progress-container \{[^}]*\}/);
    assert.ok(regle, '#game-progress-container est stylé');
    assert.match(regle[0], /background: #475569/);
    // Et le dégradé ne finit plus sur le bleu ciel, où le blanc tombe à 2,14.
    const barre = games.match(/#game-progress-bar \{[^}]*\}/);
    assert.ok(barre && !/var\(--accent\)/.test(barre[0]),
        'le dégradé ne se termine pas sur --accent');
});
