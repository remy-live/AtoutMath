// LE BAC À SABLE QUE LE PROFESSEUR REMPLIT — et les trois états d'une liste.
//
// RÉMY : « pour le bac à sable j'aimerai quand même bien pouvoir éditer le
// contenu ».
//
// ── CE QUE CES ÉPREUVES GARDENT ─────────────────────────────────────────────
//
// Le noyau savait recevoir une liste depuis le premier jour — `jeuxDuBac`
// porte le commentaire « la liste du professeur, sinon celle par défaut » —
// mais PERSONNE ne la lui donnait : ni colonne pour la ranger, ni route pour
// l'écrire, ni bouton pour la composer. Ce qui manquait était la chaîne
// entière, et c'est la chaîne entière qu'on garde ici.
//
// LE PIÈGE EST À UN SEUL ENDROIT, ET IL REVIENT À CHAQUE MAILLON : une liste a
// TROIS états, pas deux.
//
//   · ABSENTE (`null`, colonne NULL) — « je n'y ai pas touché ». Le logiciel
//     choisit, et c'est le défaut ;
//   · VIDE (`[]`, chaîne vide) — « je n'en veux aucun ». Un professeur qui
//     vide son bac doit le voir rester vide ;
//   · PLEINE — c'est elle qu'on sert.
//
// Confondre les deux premiers remplit le bac de ce que le professeur VIENT
// D'ENLEVER, et c'est précisément le défaut qui dormait dans `jeuxDuBac`
// (`Array.isArray(liste) && liste.length`) : invisible tant que personne ne
// pouvait éditer la liste, apparu à la minute où Rémy l'a demandé.
//
// MESURÉ APRÈS, dans deux navigateurs (`tools/bacDuProf.mjs`) : trois jeux
// choisis arrivent à l'élève et s'affichent trois ; le bac vidé exprès reste
// vide ; fermer puis rouvrir le bac n'efface pas les jeux ; un identifiant
// inconnu est écarté sans emporter le reste. Et à l'écran du professeur
// (`tools/tmp/bacEcran.mjs`) : « au choix du logiciel », bouton « Choisir »,
// fenêtre « Les jeux du bac à sable » avec 17 jeux dedans, 0 erreur de page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { jeuxDuBac, PAR_DEFAUT } from '../js/core/bacASable.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// Un catalogue de poche : `jeuxDuBac` ne connaît du catalogue que la fonction
// qui trouve par identifiant, et c'est tout ce qu'il faut lui donner.
const CATALOGUE = ['calc-nova', 'geo-tangram', 'calc-labyrinthe'];
const trouver = (id) => (CATALOGUE.includes(id) ? { id, title: id } : null);

test('LA LISTE VIDE RESTE VIDE : un bac vidé ne se remplit pas tout seul', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE. Avec `&& liste.length`, un professeur
    // qui retirait ses dix-sept jeux les retrouvait tous à l'écran de l'élève.
    assert.deepEqual(jeuxDuBac(trouver, []), [],
        'le bac se remplit de ce que le professeur vient d\'enlever');
});

test('LA LISTE ABSENTE, ELLE, LAISSE CHOISIR LE LOGICIEL', () => {
    // Et c'est l'autre moitié de la même règle : `null` n'est pas `[]`.
    const sansRien = jeuxDuBac(trouver, null);
    assert.ok(sansRien.length > 0, 'un bac jamais réglé n\'a plus rien dedans');
    // Ce sont bien les valeurs sûres, pas une liste au hasard.
    for (const e of sansRien) assert.ok(PAR_DEFAUT.includes(e.id));
    // `undefined` vaut `null` : c'est ce que rend un état sans la clef.
    assert.deepEqual(jeuxDuBac(trouver, undefined).map(e => e.id), sansRien.map(e => e.id));
});

test('LA LISTE DU PROFESSEUR EST SERVIE DANS SON ORDRE, SANS DOUBLON', () => {
    assert.deepEqual(jeuxDuBac(trouver, ['geo-tangram', 'calc-nova']).map(e => e.id),
        ['geo-tangram', 'calc-nova']);
    assert.deepEqual(jeuxDuBac(trouver, ['calc-nova', 'calc-nova']).map(e => e.id),
        ['calc-nova']);
});

test('UN IDENTIFIANT QUI N\'EXISTE PLUS EST ÉCARTÉ, PAS AFFICHÉ', () => {
    // Le catalogue bouge. Une tuile qui ne s'ouvre pas, c'est un élève qui
    // clique trois fois dessus avant d'appeler le professeur.
    assert.deepEqual(jeuxDuBac(trouver, ['geo-tangram', 'ce-jeu-nexiste-pas']).map(e => e.id),
        ['geo-tangram']);
});

test('`jeuxDuBacDuProf` TIENT LES TROIS ÉTATS JUSQU\'À L\'ÉLÈVE', async () => {
    // Le module touche au store : on l'importe à part des épreuves pures.
    const { appliquerEtat, jeuxDuBacDuProf } = await import('../js/core/seanceDistante.js');

    // Rien reçu du serveur : le logiciel choisit.
    appliquerEtat({});
    assert.equal(jeuxDuBacDuProf(), null, 'un bac jamais réglé prétend l\'avoir été');

    // Reçu `null` : pareil, et c'est ce que rend la colonne NULL.
    appliquerEtat({ bacJeux: null });
    assert.equal(jeuxDuBacDuProf(), null);

    // Reçu `[]` : vidé exprès, et il faut que cela se distingue du cas d'avant.
    appliquerEtat({ bacJeux: [] });
    assert.deepEqual(jeuxDuBacDuProf(), [],
        'le bac vidé par le professeur se remplira des valeurs par défaut');

    // Reçu une liste : telle quelle.
    appliquerEtat({ bacJeux: ['geo-tangram'] });
    assert.deepEqual(jeuxDuBacDuProf(), ['geo-tangram']);

    // ET LES DEUX FONCTIONS SE PARLENT : c'est l'une qui nourrit l'autre.
    assert.deepEqual(jeuxDuBac(trouver, jeuxDuBacDuProf()).map(e => e.id), ['geo-tangram']);
    appliquerEtat({ bacJeux: [] });
    assert.deepEqual(jeuxDuBac(trouver, jeuxDuBacDuProf()), []);
    appliquerEtat({});
});

test('`reglerLeBac` N\'ENVOIE `jeux` QUE SI ON LUI EN DONNE', async () => {
    // POURQUOI CETTE ÉPREUVE EXISTE : fermer le bac à 10 h ne doit pas effacer
    // les jeux choisis à 8 h. C'est la même règle que pour la durée, et elle
    // ne tient que si la clef reste ABSENTE du corps de la requête — un
    // `jeux: []` de politesse viderait le bac à chaque clic sur « Fermer ».
    const envois = [];
    const vraiFetch = globalThis.fetch;
    const vraiStockage = globalThis.localStorage;
    globalThis.localStorage = {
        getItem: () => JSON.stringify({ token: 'jeton-d-essai' }),
        setItem() { }, removeItem() { }
    };
    globalThis.fetch = async (url, opt) => {
        envois.push(JSON.parse(opt.body));
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    try {
        const { reglerLeBac } = await import('../js/core/espaceProf.js');

        await reglerLeBac('c1', false);
        assert.equal('jeux' in envois[0], false, 'ouvrir le bac efface son contenu');
        assert.equal('minutes' in envois[0], false, 'ouvrir le bac efface sa durée');

        await reglerLeBac('c1', true, 10);
        assert.equal('jeux' in envois[1], false, 'régler la durée efface le contenu');
        assert.equal(envois[1].minutes, 10);

        await reglerLeBac('c1', false, null, ['geo-tangram', 'calc-nova']);
        assert.deepEqual(envois[2].jeux, ['geo-tangram', 'calc-nova']);
        assert.equal('minutes' in envois[2], false, 'choisir les jeux efface la durée');

        // LE TABLEAU VIDE PART, LUI : c'est une demande, pas une absence.
        await reglerLeBac('c1', false, null, []);
        assert.equal('jeux' in envois[3], true, 'vider le bac ne demande rien au serveur');
        assert.deepEqual(envois[3].jeux, []);
    } finally {
        globalThis.fetch = vraiFetch;
        if (vraiStockage === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = vraiStockage;
    }
});

test('LE SERVEUR A UNE COLONNE POUR LA RANGER, ET LA DISTINGUE DE NULL', () => {
    // Sans la colonne, tout le reste de la chaîne parle dans le vide.
    assert.match(lire('api/lib/schema.php'), /bac_jeux\s+\$txtNull/,
        'la liste du professeur n\'a nulle part où se ranger');

    const api = lire('api/index.php');
    // La route écrit la colonne, et ne l'écrit QUE si on lui a donné la clef.
    assert.match(api, /array_key_exists\(\s*'jeux',\s*\$body\s*\)/,
        'une clef absente et une liste vide s\'écriraient de la même façon');
    assert.match(api, /bac_jeux = \?/);
    // ET ELLE BORNE CE QU'ELLE ÉCRIT : cette chaîne repart vers trente
    // navigateurs d'élèves.
    assert.match(api, /\^\[a-z0-9-\]\{2,60\}\$/,
        'un identifiant non filtré repart vers les élèves');
    assert.match(api, /array_slice\(\$propres, 0, 20\)/,
        'un bac sans borne rend le choix plus long que le temps de jeu');
    // L'écran du professeur a besoin de l'état AVANT qu'on clique.
    assert.match(api, /'bac_jeux' => \$classe\['bac_jeux'\] \?\? null/,
        'l\'écran ne peut pas dire l\'état du bac');
});

test('ET L\'ÉLÈVE LE REÇOIT, AVEC LA MÊME DISTINCTION', () => {
    const s = lire('api/lib/seance.php');
    assert.match(s, /bac_minutes, bac_jeux/, 'la colonne n\'est pas relue');
    // `null` d'un côté, `[]` de l'autre : si les deux se confondaient ici, tout
    // le soin pris en amont ne servirait à rien.
    assert.match(s, /'bacJeux' =>[\s\S]{0,200}=== null[\s\S]{0,200}\[\]/,
        'le bac vidé et le bac jamais réglé arrivent identiques chez l\'élève');
});

test('L\'ÉCRAN DE L\'ÉLÈVE DEMANDE LA LISTE DU PROFESSEUR', () => {
    // Le dernier maillon, et le plus facile à oublier : `lesGroupesDuBac()`
    // sans argument reprenait les valeurs par défaut quoi qu'on ait choisi.
    assert.match(lire('js/ui/bacASable.js'), /lesGroupesDuBac\(jeuxDuBacDuProf\(\)\)/,
        'le bac de l\'élève ignore ce que le professeur a composé');
});

test('ET L\'ÉCRAN DU PROFESSEUR SAIT LA COMPOSER', () => {
    const ec = lire('js/ui/espaceClasses.js');
    // Un bouton, une fenêtre, et une étiquette qui dit l'état avant le clic —
    // zéro compris, parce qu'un bac vidé exprès doit se voir.
    assert.match(ec, /data-bac-jeux/, 'rien pour ouvrir le composeur');
    assert.match(ec, /Les jeux du bac à sable/, 'la fenêtre de composition a disparu');
    assert.match(ec, /au choix du logiciel/);
    assert.match(ec, /aucun jeu/, 'un bac vidé se dirait « 0 jeux choisis »');
    // ON PART DE CE QUE L'ÉLÈVE VOIT AUJOURD'HUI, pas d'une page blanche : un
    // professeur qui veut ajouter UN jeu ne doit pas recomposer les dix-sept
    // autres.
    assert.match(ec, /actuels === null \? lesJeuxParDefaut\(\)/,
        'composer son bac demande de tout retaper');
});
