// LA RECHERCHE CLASSE, ET LE CLAVIER DESCEND DANS LA LISTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le mode recherche quand on appuie sur entrée il faudrait que la
// liste arrive dans l'arbre en dessous non et pas insérer le premier lien ?
// comment peut on rendre cela optimal ? »
//
// MESURÉ AVANT, dans l'atelier du professeur :
//
//   · en tapant « fraction », la liste du dessous portait déjà les 29 résultats
//     avec leur œil et leur « + » ; la boîte flottante en montrait huit — les
//     mêmes, sans l'œil ni le « + » — et elle en RECOUVRAIT cinq ;
//   · Entrée faisait passer le parcours de 0 à 1 étape ;
//   · en tapant « addition », les trois premières lignes étaient « Les Nombres
//     des Pharaons », « Le Mot Juste » et « Nombres Relatifs » — le premier
//     titre contenant le mot arrivait en QUATRIÈME position.
//
// LA BOÎTE AVAIT DEUX CHOSES QUE LA LISTE N'AVAIT PAS : le classement par
// pertinence et la navigation au clavier. On les lui a prises toutes les deux,
// et il ne lui restait rien.
//
// CE QUE CES ÉPREUVES GARDENT, et pourquoi chacune. Aucune ne peut se mesurer
// en ouvrant un navigateur à chaque commit ; `tools/rechercheAuClavier.mjs` le
// fait, lui, sur le chemin du professeur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exercices } from '../js/data/catalog.js';
import { chercher, preparer, normaliser } from '../js/core/recherche.js';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// La fiche que `rechercheUI.ficheDe` construit, moins ce qui demande un
// navigateur : on ne peut pas l'importer ici — ce module tire `games/engine.js`
// et tombe sur « document is not defined ».
const fiches = exercices.map((e) => preparer({
    id: e.id, titre: e.title, chemin: e.tags?.chemin || [],
    niveaux: e.tags?.niveaux || [], motsCles: e.motsClefs || [],
    texte: e.instruction || ''
}));

test('LE MOT TAPÉ PARAÎT DANS LES TROIS PREMIERS RÉSULTATS', () => {
    // UN PROFESSEUR NE LIT PAS LES VINGT-SEPT RÉSULTATS : il lit les trois
    // premières lignes et conclut que la recherche ne marche pas. C'est
    // exactement ce qui se passait pour « addition ».
    for (const mot of ['addition', 'fraction', 'pythagore', 'symetrie']) {
        const trois = chercher(fiches, mot, { max: 3 }).map((r) => r.fiche.titre);
        assert.ok(trois.length, `« ${mot} » ne trouve rien du tout`);
        // ON COMPARE SANS ACCENTS, comme la recherche elle-même. La première
        // version de cette épreuve cherchait la chaîne brute et accusait
        // « symetrie » d'échouer alors que « Le Symétrique aux Carreaux »
        // arrivait EN TÊTE : c'est l'épreuve qui lisait mal, pas le logiciel.
        const racine = normaliser(mot).slice(0, 6);
        assert.ok(trois.some((t) => normaliser(t).includes(racine)),
            `« ${mot} » : aucun des trois premiers titres ne le contient — ${trois.join(' · ')}`);
    }
});

test('ET LE CATALOGUE EN CLASSE LA TOTALITÉ, PAS LES HUIT PREMIERS', () => {
    // `chercher` s'arrête à huit par défaut : c'était la taille de la boîte
    // flottante. Appelé sans plafond pour ranger le CATALOGUE, il n'en
    // garderait que huit — et les dix-neuf autres disparaîtraient en silence,
    // sous un compte qui continuerait d'annoncer « 27 sur 217 ».
    const src = lire('js/ui/navigation.js');
    const appel = (src.match(/chercher\([^)]*\)[^;]*/) || [''])[0];
    assert.match(appel, /max:\s*Infinity/,
        'le classement du catalogue doit être sans plafond');

    // ET L'ENSEMBLE NE CHANGE PAS, SEULEMENT L'ORDRE : c'est ce qui autorise à
    // remplacer un filtre par un tri sans toucher au compte affiché.
    const mot = 'fraction';
    const classes = chercher(fiches, mot, { max: Infinity }).map((r) => r.fiche.id);
    assert.ok(classes.length > 8, `${classes.length} résultats : le plafond de huit traîne encore`);
    assert.equal(new Set(classes).size, classes.length, 'aucun doublon dans le classement');
});

test('LA BOÎTE FLOTTANTE N\'EST PLUS BRANCHÉE NULLE PART', () => {
    // ON N'INTERDIT PAS UN MOT, ON INTERDIT UN LIEN : c'est l'IDENTIFIANT qu'on
    // vise, celui que le code allait chercher. Les commentaires qui racontent
    // sa disparition peuvent la nommer — ils doivent même la nommer.
    for (const f of ['index.html', 'js/ui/rechercheUI.js', 'js/ui/navigation.js']) {
        const src = lire(f);
        assert.doesNotMatch(src, /id="sidebar-search-suggestions"|getElementById\('sidebar-search-suggestions'\)/,
            `${f} branche encore la liste flottante`);
    }
});

test('LA LIGNE DE RÉSULTAT SAIT RECEVOIR LE CLAVIER', () => {
    // Sans ces deux-là, la touche ↓ n'a nulle part où aller et Entrée ne sait
    // plus de quel exercice on parle : le clavier redevient muet, et rien à
    // l'écran ne le dit.
    const src = lire('js/ui/navigation.js');
    assert.match(src, /item\.tabIndex = -1;/,
        'la ligne doit pouvoir prendre le focus par programme');
    assert.match(src, /item\.dataset\.exo = exo\.id;/,
        'la ligne doit porter son identifiant : la liste est redessinée à chaque frappe');

    // ET LA FEUILLE DE STYLE DOIT MONTRER OÙ L'ON EST. Un focus invisible sur
    // une liste de vingt-sept lignes, c'est une navigation à l'aveugle.
    assert.match(lire('css/ui.css'), /\.exo-list-item:focus-visible\s*\{/,
        'la ligne visée au clavier doit se voir');
});

test('LE CHAMP DE RECHERCHE N\'AJOUTE PLUS RIEN AU PARCOURS', () => {
    // C'est la demande, mot pour mot : « pas insérer le premier lien ». Entrée
    // dans le CHAMP descend dans les résultats ; c'est Entrée sur une LIGNE qui
    // ajoute. Les deux vivent dans le même fichier, on vérifie donc que le
    // gestionnaire du champ ne connaît pas `addStep`.
    const src = lire('js/ui/rechercheUI.js');
    const debut = src.indexOf("input.addEventListener('keydown'");
    assert.ok(debut > 0, 'le champ écoute toujours le clavier');
    const bloc = src.slice(debut, src.indexOf('});', debut));

    // ON ISOLE LA BRANCHE « Entrée », ET PAS LE GESTIONNAIRE ENTIER.
    //
    // La première version de cette épreuve lisait tout le bloc et se contentait
    // d'y interdire deux noms. `tools/epreuveTombe.mjs` l'a prise en faute : on
    // a remis le défaut — Entrée qui active la première ligne — et l'épreuve
    // est restée VERTE. Deux trous, et le même en dessous : elle exigeait
    // « viser(0) » quelque part, or la branche ↓ le contient aussi ; et elle
    // n'interdisait que `addStep`, que le défaut atteignait par `activer`.
    //
    // Une épreuve qui interdit des NOMS ne garde que les défauts qu'on a
    // imaginés. Celle-ci regarde l'endroit exact où la décision se prend.
    const iEnter = bloc.indexOf("e.key === 'Enter'");
    assert.ok(iEnter > 0, 'le champ répond toujours à Entrée');
    const branche = bloc.slice(iEnter, bloc.indexOf('} else', iEnter + 1));
    assert.match(branche, /viser\(0\)/,
        'Entrée doit viser la première ligne des résultats');
    assert.doesNotMatch(branche, /activer|addStep|openGameLayer|choisir/,
        'Entrée dans le champ ne doit ni ajouter ni lancer quoi que ce soit : '
        + 'elle descend dans la liste, et le choix se fait à vue');
});
