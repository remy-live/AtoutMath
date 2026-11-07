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

test('AUCUN DÉGRADÉ NE PART DU THÈME POUR FINIR SUR UNE COULEUR EN DUR', () => {
    // NEUF FOIS LE MÊME DÉFAUT, ET UNE SEULE CORRECTION. `linear-gradient(...,
    // var(--primary), #8b5cf6)` était écrit à neuf endroits : la carte de jeu,
    // la bulle de choix, la carte de choix, la touche OK du pavé, et cinq jeux.
    // Le premier bout suivait le thème, le second était un violet fixe — un
    // élève en Forêt voyait ses cartes partir du vert et arriver au violet.
    //
    // CE QUE CETTE ÉPREUVE TIENT : qu'on ne le réécrive pas. Un dégradé se
    // copie-colle d'un jeu au suivant, et c'est exactement comme ça qu'il est
    // arrivé à neuf. La règle est simple et se lit : si un bout d'un dégradé
    // vient du thème, l'autre aussi.
    const jeux = fs.readdirSync(new URL('../js/games/', import.meta.url))
        .filter(n => n.endsWith('.js'))
        .map(n => ({ nom: `js/games/${n}`,
            texte: fs.readFileSync(new URL(`../js/games/${n}`, import.meta.url), 'utf8') }));

    // QUATRE FAUX POSITIFS ONT APPRIS À ÉCRIRE LA RÈGLE, et ils méritent d'être
    // nommés, sinon quelqu'un l'élargira de nouveau :
    //   · `var(--nj-jauge, #22c55e)` dans ninja.js — le `#` est une valeur de
    //     REPLI à l'intérieur du `var()`, pas un second bout ;
    //   · `#000 var(--fondu, 0px)` dans quadrilateres.js — le `var()` est une
    //     LONGUEUR, et le `#000` la couleur d'un masque ;
    //   · `var(--warning-fond)` et `var(--accent-fond)` — ces jetons-là ne sont
    //     JAMAIS redéfinis par un thème. Un dégradé qui en part ne bouge pas
    //     d'un thème à l'autre : son second bout a le droit d'être écrit en dur.
    //
    // LE VRAI CRITÈRE N'EST DONC PAS « C'EST UN JETON », C'EST « CE JETON
    // CHANGE-T-IL DE TEINTE SELON LE THÈME ». Et on ne l'écrit pas à la main :
    // on le calcule sur `css/base.css`. Mesuré — `--primary` traverse 230° de
    // teinte (indigo, bleu, vert, orange), `--accent` 180° ; `--warning` en
    // bouge de 5, `--success` de 18, `--danger` de 13. Seuls les premiers
    // rendent un second bout fixe incohérent : un amber qui va vers un amber
    // reste un amber, un vert qui va vers un violet ne veut rien dire.
    // Le jour où quelqu'un rendra `--warning` vert dans un thème, cette épreuve
    // se mettra à le garder toute seule.
    const SANS_REPLI = /var\(\s*--[\w-]+\s*,[^()]*\)/g;

    /** La teinte d'un `#rgb` ou `#rrggbb`, en degrés. */
    const teinte = (hex) => {
        let n = hex.replace('#', '');
        if (n.length === 3) n = [...n].map(c => c + c).join('');
        const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (!d) return null;   // un gris n'a pas de teinte
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return ((h * 60) % 360 + 360) % 360;
    };
    /** L'écart de teinte le plus grand d'un jeu de couleurs, sur le cercle. */
    const ecartDeTeinte = (couleurs) => {
        const t = couleurs.map(teinte).filter(x => x !== null);
        let pire = 0;
        for (const a of t) for (const b of t) {
            const d = Math.abs(a - b);
            pire = Math.max(pire, Math.min(d, 360 - d));
        }
        return pire;
    };

    // Les blocs de thème de `css/base.css`, commentaires retirés.
    const NET = sansCommentaires(BASE);
    const blocsDeTheme = [NET.slice(0, NET.indexOf(':root[data-theme')),
        ...['dark', 'ocean', 'forest', 'sunset'].map(n => {
            const i = NET.indexOf(`:root[data-theme="${n}"]`);
            return i < 0 ? '' : NET.slice(i, NET.indexOf('\n}', i));
        })];

    /** Un jeton dont la teinte voyage d'un thème à l'autre. */
    const voyage = (jeton) => {
        const vues = blocsDeTheme.map(b => {
            const m = new RegExp('(?:^|[;{\\s])' + jeton + ':\\s*(#[0-9a-fA-F]{3,8})\\s*;').exec(b);
            return m && m[1];
        }).filter(Boolean);
        return vues.length > 1 && ecartDeTeinte(vues) > 60;
    };

    // ON COMPTE LES PARENTHÈSES, ON NE LES DEVINE PAS. Première version de cette
    // épreuve : `gradient\(([^;{}]*?)\)`, qui s'arrête au PREMIER `)` — celui de
    // `var(--primary)`. Elle ne voyait donc jamais le second bout, et elle
    // passait au vert avec le défaut remis en place. Vérifié en le remettant :
    // c'est comme ça qu'on l'a su, et c'est pour ça qu'on essaie de faire
    // tomber une épreuve neuve avant de la croire.
    /** Le contenu de chaque `…-gradient(…)`, parenthèses équilibrées. */
    const degrades = (texte) => {
        const out = [];
        const debut = /(?:linear|radial|conic)-gradient\(/g;
        let m;
        while ((m = debut.exec(texte))) {
            let profondeur = 1, i = m.index + m[0].length;
            while (i < texte.length && profondeur > 0) {
                if (texte[i] === '(') profondeur++;
                else if (texte[i] === ')') profondeur--;
                i++;
            }
            if (profondeur === 0) out.push(texte.slice(m.index + m[0].length, i - 1));
        }
        return out;
    };

    const coupables = [];
    [...FEUILLES, ...jeux].forEach(({ nom, texte }) => {
        degrades(sansCommentaires(texte)).forEach(brut => {
            const dedans = brut.replace(SANS_REPLI, 'JETON');
            const cites = [...dedans.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map(m => m[1]);
            if (!cites.some(voyage)) return;   // aucun bout ne change de teinte
            const dur = dedans.match(/#[0-9a-fA-F]{3,8}\b/g);
            if (dur) coupables.push(`${nom} : ${dur.join(' ')} dans ${brut.slice(0, 62)}…`);
        });
    });

    assert.deepEqual(coupables, [],
        'un dégradé dont UN bout suit le thème et l\'autre est écrit en dur donne\n'
        + 'une couleur que personne n\'a voulue : « AtoutMath » partait du vert et\n'
        + 'arrivait au violet en thème Forêt. Prendre l\'autre bout dans le thème\n'
        + 'aussi — `var(--primary-hover)` pour un fond qui porte du blanc.');
});

test('AUCUNE OMBRE INDIGO SOUS UNE SURFACE QUI SUIT LE THÈME', () => {
    // UN BOUTON VERT SUR UNE OMBRE INDIGO, ÇA SE VOIT. C'est ce que la planche
    // du 28 septembre montrait en océan, forêt et coucher de soleil : le
    // remplissage avait été reteinté, pas l'ombre posée dessous.
    //
    // LA RÈGLE : dans une règle qui prend sa couleur au thème, aucune couleur
    // d'accompagnement — ombre, halo, remplissage translucide — ne doit être
    // l'indigo du thème CLAIR écrit à la main. `color-mix(..., transparent)`
    // rend exactement ce que `rgba(couleur, .N)` rendait, en la prenant au
    // thème ; le dépôt en emploie déjà plus de cent.
    //
    // CE QUI RESTE EN DUR, ET POURQUOI. Seize indigos subsistent, tous dans des
    // règles qui ne prennent RIEN au thème, et c'est ce que cette épreuve
    // autorise :
    //   · des jeux de couleurs DISTINCTIVES, où l'indigo n'est pas « la couleur
    //     d'action » mais « la première des quatre » — les pièces du quadrillage
    //     (indigo, vert, turquoise), les décors de l'escadrille, le labyrinthe
    //     et son thème Espace, jezzball ;
    //   · les FICHES IMPRIMÉES (`.fp-`, `.fx-`), qui sortent sur du papier :
    //     une feuille ne suit pas le thème de l'écran de qui l'a lancée ;
    //   · deux figures d'activité (angles, blocs Scratch) dont les couleurs
    //     sont celles du dessin, pas celles de l'interface.
    const INDIGO = /rgba\(\s*(?:79,\s*79|79,\s*70,\s*229|99,\s*102,\s*241|67,\s*56,\s*202)\s*,/;
    const JETON = /var\(--(?:primary|accent|success|warning|danger|degrade)[\w-]*/;

    const jeux = fs.readdirSync(new URL('../js/games/', import.meta.url))
        .filter(n => n.endsWith('.js'))
        .map(n => ({ nom: `js/games/${n}`,
            texte: fs.readFileSync(new URL(`../js/games/${n}`, import.meta.url), 'utf8') }));

    const coupables = [];
    [...FEUILLES, ...jeux].forEach(({ nom, texte }) => {
        const net = sansCommentaires(texte);
        // Chaque corps de règle, pris entre ses accolades — une règle CSS n'en
        // contient pas d'autre dans ce dépôt.
        for (const m of net.matchAll(/\{([^{}]*)\}/g)) {
            const corps = m.group ? m.group(1) : m[1];
            if (!INDIGO.test(corps) || !JETON.test(corps)) continue;
            const avant = net.slice(Math.max(0, m.index - 80), m.index);
            const sel = (avant.split(/[;}]/).pop() || '').trim().slice(-48);
            coupables.push(`${nom} : ${sel}`);
        }
    });

    assert.deepEqual(coupables, [],
        'une règle qui prend sa couleur au thème ne doit pas poser dessous un\n'
        + 'indigo écrit à la main : en thème Forêt, cela donne un bouton vert sur\n'
        + 'une ombre indigo. Employer color-mix(in srgb, var(--primary) N%, transparent).');
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
