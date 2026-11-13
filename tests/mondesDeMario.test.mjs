// LES MONDES, ET LE DESSIN DE LEURS PASTILLES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « tu pourrais rajouter d'autres thèmes (tu as déjà mis
// halloween, paques) mais aussi du design des icones, un peu comme si on allait
// dans différents monde de mario ».
//
// CE QUI EST GARDÉ ICI, et que `tests/decorsDeSaison.test.mjs` ne garde pas :
// il garde les décisions de l'AXE (un décor n'est pas un habillage, il ne mange
// pas le picto, le blanc se lit) ; celle-ci garde les décisions des MONDES.
//
//   1. DEUX FAMILLES, ET DEUX SEULEMENT. Une fête a une date, un monde n'en a
//      pas — c'est ce qui range les boutons en deux rangées. Un décor sans
//      famille tomberait dans AUCUNE rangée : il serait déclaré, choisissable
//      par son code dicté, et invisible dans le menu.
//   2. CHAQUE MATIÈRE DÉCLARÉE EXISTE DANS LA FEUILLE. `matiere: 'ecu'` sans
//      `.decor-matiere--ecu` dans le CSS ne lève rien : le monde s'affiche avec
//      la pastille par défaut, et l'on cherche le défaut dans le JavaScript.
//   3. LE PIÈGE DE SPÉCIFICITÉ, qui est la vraie raison d'être de ce fichier.
//      `.decor-matiere--bloc .world-node-btn` et `.world-node--done
//      .world-node-btn` ont EXACTEMENT la même spécificité (0,2,1), et le bloc
//      des mondes est le dernier du fichier : une couleur de monde écrite sans
//      `--open` gagne donc contre l'or de la réussite, en silence. Un élève qui
//      change de monde ne doit pas réapprendre à lire sa propre carte.
//
// ── CE QUE CETTE ÉPREUVE NE PEUT PAS DIRE ─────────────────────────────────
//
// Si le monde est BEAU. Cela se regarde, et cela se regarde TOUS ENSEMBLE :
// `node tools/pastillesDesMondes.mjs` photographie chaque monde avec ses quatre
// états, et `node tools/planche.mjs` les met sur une planche. C'est la planche
// qui a dit que le château virait au rose, que le volcan était un papier rayé,
// et que l'Espace ne se distinguait pas de « Sans décor ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const PV = lire('js/ui/pathView.js');
const CSS = lire('css/modules.css');
const EC = lire('js/ui/espaceClasses.js');

/** Le corps de `DECORS`, isolé des autres listes du fichier. */
const corps = () => PV.slice(PV.indexOf('export const DECORS = ['),
    PV.indexOf('];', PV.indexOf('export const DECORS = [')));

/** Chaque décor déclaré : son id, sa famille et sa matière, lus à la source. */
function decorsDeclares() {
    const texte = corps();
    // On découpe sur les accolades de premier niveau de la liste : chaque
    // entrée tient sur quelques lignes et commence par son `id`.
    return [...texte.matchAll(/\{\s*id: '([a-z]+)'([\s\S]*?)\}/g)].map(m => ({
        id: m[1],
        famille: (m[2].match(/famille: '([a-z]+)'/) || [])[1] || null,
        matiere: (m[2].match(/matiere: '([a-z]+)'/) || [])[1] || null
    }));
}

test('CHAQUE DÉCOR A UNE FAMILLE, ET IL N’Y EN A QUE DEUX', () => {
    const tous = decorsDeclares();
    assert.ok(tous.length >= 16, `${tous.length} décors lus — la liste n’a pas été trouvée`);
    for (const d of tous) {
        if (d.id === 'aucun') {
            assert.equal(d.famille, null,
                '« Sans décor » n’appartient à aucune famille : il ouvre la première rangée');
            continue;
        }
        assert.ok(['fete', 'monde'].includes(d.famille),
            `« ${d.id} » n’a pas de famille : il serait déclaré, choisissable par son code `
            + 'dicté, et invisible dans les deux rangées du menu');
    }
    // ET LES DEUX FAMILLES SONT PEUPLÉES : une rangée vide est un cadre vide.
    for (const f of ['fete', 'monde']) {
        assert.ok(tous.filter(d => d.famille === f).length >= 3, `la famille « ${f} » est trop maigre`);
    }
});

test('CHAQUE MATIÈRE DÉCLARÉE EXISTE DANS LA FEUILLE DE STYLE', () => {
    const matieres = [...new Set(decorsDeclares().map(d => d.matiere).filter(Boolean))];
    assert.ok(matieres.length >= 8, `${matieres.length} matières : il en manque`);
    for (const m of matieres) {
        assert.ok(CSS.includes(`.decor-matiere--${m} `),
            `« matiere: '${m}' » est déclarée sans règle « .decor-matiere--${m} » : le monde `
            + 's’afficherait avec la pastille par défaut, sans lever la moindre erreur');
    }
    // ET LA CLASSE EST BIEN POSÉE SUR LA CARTE, sinon aucune règle ne s’applique.
    assert.match(PV, /classList\.add\(`decor-matiere--\$\{decor\.matiere\}`\)/,
        'la classe de matière doit être posée par `poserLeDecor`');
});

test('DEUX MONDES PEUVENT PARTAGER UNE MATIÈRE', () => {
    // L'Océan et l'Espace sont deux mondes que tout oppose, et leurs pastilles
    // sont le même HUBLOT. C'est la raison pour laquelle la matière est une
    // classe À PART de l'identité du monde : sans cela, la même peau serait
    // écrite deux fois, et la deuxième dériverait de la première.
    const parMatiere = {};
    for (const d of decorsDeclares().filter(x => x.matiere)) {
        (parMatiere[d.matiere] = parMatiere[d.matiere] || []).push(d.id);
    }
    const partagee = Object.values(parMatiere).find(ids => ids.length > 1);
    assert.ok(partagee, 'aucune matière partagée : la classe à part ne sert plus à rien');
});

test('UNE MATIÈRE NE REPEINT QUE CE QUI ATTEND', () => {
    // LE PIÈGE DE SPÉCIFICITÉ, ET IL EST INVISIBLE À LA LECTURE.
    //
    // `.decor-matiere--bloc .world-node-btn` pèse autant que
    // `.world-node--done .world-node-btn` — et le bloc des mondes est écrit
    // plus bas dans le fichier, donc il gagne. Une matière qui poserait un
    // `background` sans `--open` effacerait l'or de la réussite sur treize
    // mondes à la fois.
    //
    // CE QUI RESTE PERMIS SANS ÉTAT : la FORME. Un monde de blocs carrés dont
    // les étapes réussies resteraient rondes se lirait comme un défaut
    // d'affichage — la forme doit valoir pour les quatre états.
    const FORME = /^(border-radius|right|bottom)$/;
    const regles = [...CSS.matchAll(/(\.decor-matiere--[a-z]+[^{]*)\{([^}]*)\}/g)];
    assert.ok(regles.length >= 10, `${regles.length} règles de matière lues`);
    for (const [, selecteur, corpsRegle] of regles) {
        if (/world-node--(open|current)/.test(selecteur)) continue;
        const proprietes = [...corpsRegle.matchAll(/(^|;|\n)\s*([a-z-]+)\s*:/g)]
            .map(m => m[2])
            .filter(p => !FORME.test(p));
        assert.deepEqual(proprietes, [],
            `« ${selecteur.trim()} » pose ${proprietes.join(', ')} SANS état : à spécificité `
            + 'égale, cette règle est écrite après « .world-node--done » et gagne contre elle. '
            + 'L’or d’une étape réussie disparaîtrait. Ajouter « .world-node--open ».');
    }
});

test('LES BOUTONS TIENNENT SUR UN TÉLÉPHONE', () => {
    // MESURÉ AVANT D'ÉCRIRE : la rangée de boutons est une pastille qui ne
    // s'enroulait pas, 204 px pour cinq boutons sur un écran de 390. Seize à la
    // suite en feraient 640 — un débordement horizontal, que la feuille
    // interdit partout ailleurs.
    const debut = CSS.indexOf('.path-style-groupe--mondes {');
    assert.notEqual(debut, -1,
        'la rangée des mondes doit avoir sa propre règle : c’est la seule qui s’enroule');
    const regle = CSS.slice(debut, CSS.indexOf('}', debut));
    assert.match(regle, /flex-wrap:\s*wrap/,
        'douze boutons ne tiennent pas sur une ligne de 390 px');
    assert.match(regle, /border-radius:\s*\d+px/,
        'un bord de 999 px sur deux lignes donne des angles qui ne bouclent pas');
    // ET LA BARRE FABRIQUE BIEN DEUX GROUPES, pas un seul de seize.
    assert.match(PV, /decorsDeLaFamille\('fete'\)/);
    assert.match(PV, /decorsDeLaFamille\('monde'\)/);
});

test('LE PROFESSEUR VOIT LES SEIZE, PAS LES CINQ D’AVANT', () => {
    // La liste était RECOPIÉE À LA MAIN dans la zone du professeur. Ajouter un
    // monde demandait d'éditer deux listes, et celle qu'on oublie est toujours
    // celle qu'on ne regarde pas : il aurait eu quatre décors là où l'élève en
    // voyait seize, sans un mot.
    assert.ok(!/\['noel', '🎄 Noël'\]/.test(EC),
        'la liste du professeur ne doit plus être une copie');
    assert.match(EC, /decorsDeLaFamille/,
        'elle doit venir de là où les décors sont déclarés');
    assert.match(EC, /<optgroup label="\$\{titre\}"/,
        'et les deux familles doivent y être séparées, comme les deux rangées de l’élève');
});

test('LES MONDES FAITS DE BLANC S’ATTÉNUENT EN THÈME SOMBRE', () => {
    // UNE COULEUR S'ASSOMBRIT, LE BLANC NON. Sur le ciel clair, un nuage à .45
    // est un nuage ; sur le fond sombre, c'est une grosse tache grise — vu sur
    // la planche, les moutons avalaient deux pastilles sur quatre et le texte
    // sous elles. Les autres mondes n'ont pas ce défaut parce que leurs
    // textures sont colorées.
    for (const monde of ['nuages', 'neiges']) {
        const re = new RegExp(`html\\[data-theme="dark"\\] \\.decor--${monde} `
            + '\\.decor-nappe::before \\{ opacity: \\.\\d+; \\}');
        assert.match(CSS, re,
            `« ${monde} » dessine sa texture en BLANC : sans atténuation en thème sombre, `
            + 'elle passe devant les pastilles');
    }
});

test('LE SERVEUR CONNAÎT LES MÊMES MONDES QUE LE NAVIGATEUR', () => {
    // LA COPIE LA PLUS CHÈRE DU DÉPÔT, et c'est celle qu'on ne voit pas.
    //
    // `api/index.php` revérifie le décor du moment avant de l'écrire — à juste
    // titre : « un réglage qu'on accepte sans le lire est un réglage qui finit
    // par porter ce qu'un autre a voulu ». Mais sa liste est une COPIE, de
    // l'autre côté du réseau et dans un autre langage.
    //
    // MESURÉ LE 13 NOVEMBRE : onze mondes neufs côté navigateur, quatre côté
    // serveur. Le professeur choisissait « L'Océan », le serveur répondait
    // `ok`, écrivait une chaîne vide, et le décor disparaissait sans un mot.
    // Ni `npm test` ni `php tools/testApi.php` ne pouvaient le voir : chacun
    // ne regarde que son côté. C'est le seul endroit du dépôt où les deux se
    // regardent.
    const php = lire('api/index.php');
    const bloc = /\$connus = \[([\s\S]*?)\];/.exec(php);
    assert.ok(bloc, 'la liste des décors connus du serveur a disparu');
    const duServeur = new Set([...bloc[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]));
    const duNavigateur = decorsDeclares()
        .map(d => d.id).filter(id => id !== 'aucun');
    const manquants = duNavigateur.filter(id => !duServeur.has(id));
    assert.deepEqual(manquants, [],
        `Le serveur ne connaît pas : ${manquants.join(', ')}. Le professeur les choisirait `
        + 'dans son menu, le serveur répondrait « ok » et effacerait le réglage en silence. '
        + 'Ajouter ces identifiants à $connus dans api/index.php.');
});
