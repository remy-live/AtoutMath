// CE QUE LE BATTEMENT LIT DOIT ÊTRE DANS SON `SELECT`.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ── LE DÉFAUT LE PLUS CHER DE CE DÉPÔT, ET IL EST INVISIBLE DE PARTOUT ────
//
// `etatDeSeance` lit la classe avec une liste de colonnes TENUE À LA MAIN. Les
// cinq colonnes `jeu_*` y manquaient. Le serveur lançait bien la partie,
// `/teacher/live` la voyait, `/jeu` la servait, et `tools/testApi.php` la
// trouvait juste en 581 vérifications — mais AUCUNE ARDOISE NE L'APPRENAIT,
// parce que c'est ce battement-là qui l'annonce.
//
// RIEN NE CRIAIT : `jeuEnCours` recevait une ligne sans `jeu_fin`, et une ligne
// sans `jeu_fin` veut dire « aucune partie ». Il a fallu trois vrais
// navigateurs pour le voir.
//
// LA RÈGLE EST ÉCRITE DANS `seance.php` DEPUIS CE JOUR-LÀ : « qui ajoute un
// champ à `etatDeSeance` ajoute sa colonne ci-dessous, et le vérifie dans un
// NAVIGATEUR ». Une règle écrite en commentaire est une règle qu'on oublie —
// celle-ci le prouve, puisqu'on l'a oubliée en ajoutant `defi_malus` le
// 13 novembre, et qu'il a fallu s'en souvenir à temps.
//
// CETTE ÉPREUVE LA TIENT : quatre millisecondes de lecture, contre une
// fonction morte en ligne et verte partout ailleurs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const SEANCE = readFileSync(new URL('../api/lib/seance.php', import.meta.url), 'utf8');
const JEU = readFileSync(new URL('../api/lib/jeu.php', import.meta.url), 'utf8');

/** Les colonnes nommées dans le `SELECT` de `etatDeSeance`. */
function colonnesDuSelect() {
    const i = SEANCE.indexOf('$pdo->prepare(\'SELECT id, name, join_code');
    assert.notEqual(i, -1, 'le SELECT d’`etatDeSeance` a changé de forme');
    // ON PART APRÈS LE MOT `SELECT` : ce qui le précède est du PHP — `$pdo`,
    // `prepare` — et le prendre pour des colonnes faisait réclamer une colonne
    // « pdo » à la table.
    const debut = SEANCE.indexOf('SELECT ', i);
    const requete = SEANCE.slice(debut + 7, SEANCE.indexOf('FROM classes', i));
    return new Set(requete.replace(/[^a-z0-9_,\s]/g, ' ')
        .split(/[\s,]+/).filter(Boolean));
}

/**
 * Les colonnes que le code LIT sur la ligne de classe — `$classe['defi_but']`,
 * `$classe['jeu_fin']`, et ainsi de suite.
 *
 * ON LIT LES DEUX FICHIERS : `etatDeSeance` passe sa ligne à `defiEnCours`
 * (seance.php) ET à `jeuEnCours` (jeu.php). C'est précisément parce que la
 * lecture est dans un AUTRE fichier que le trou ne se voyait pas.
 */
function colonnesLues(source) {
    const vues = new Set();
    for (const m of source.matchAll(/\$classe\['((?:defi|jeu|bac|impose|chrono|pause|hors)_[a-z_]+)'\]/g)) {
        vues.add(m[1]);
    }
    return vues;
}

test('TOUTE COLONNE QUE LA SÉANCE LIT EST DANS SON `SELECT`', () => {
    const dansLeSelect = colonnesDuSelect();
    assert.ok(dansLeSelect.size > 20,
        `seulement ${dansLeSelect.size} colonnes lues : le SELECT n’a pas été compris`);
    // CE QUE `defiEnCours` ET `jeuEnCours` LISENT, chacun dans son fichier.
    const manquantes = [];
    for (const source of [SEANCE, JEU]) {
        for (const col of colonnesLues(source)) {
            if (!dansLeSelect.has(col)) manquantes.push(col);
        }
    }
    assert.deepEqual([...new Set(manquantes)].sort(), [],
        'ces colonnes sont lues mais ne sont pas demandées : la ligne arrivera '
        + 'sans elles, et le code lira « rien » sans qu’aucune erreur ne soit '
        + 'levée. C’est exactement ce qui a rendu les jeux de classe muets sur '
        + 'les trente ardoises pendant que tout le reste était vert');
});

test('ET CHACUNE EXISTE DANS LE SCHÉMA', () => {
    // L'AUTRE MOITIÉ : demander une colonne qui n'existe pas fait ÉCHOUER la
    // requête, donc tout le battement — c'est bruyant, mais seulement en
    // ligne, et seulement sur une base déjà créée.
    const SCHEMA = readFileSync(new URL('../api/lib/schema.php', import.meta.url), 'utf8');
    // LA DÉFINITION DES TABLES EST UN TABLEAU PHP, et non du SQL écrit à la
    // suite : `$tables['classes'] = " … "`. C'est ce tableau que la boucle
    // d'`ALTER TABLE` relit pour rattraper une base déjà créée.
    const i = SCHEMA.indexOf("$tables['classes'] = ");
    assert.notEqual(i, -1, 'la table des classes a changé de nom');
    const suivante = SCHEMA.indexOf('$tables[', i + 10);
    const corps = SCHEMA.slice(i, suivante === -1 ? SCHEMA.length : suivante);
    for (const col of colonnesDuSelect()) {
        if (['id', 'select'].includes(col)) continue;
        assert.ok(new RegExp(`\\n\\s*${col}\\s`).test(corps),
            `« ${col} » est demandée au SELECT et n’est pas dans la table`);
    }
});

test('ET LE BARÈME DU DÉFI VOYAGE JUSQU\'À L\'ARDOISE', () => {
    // RÉMY : « j'ai un élève qui a cliqué n'importe quoi en qcm et aue plein de
    // point, il faudrait faire qqch ».
    //
    // LE BARÈME TRAVERSE QUATRE MAISONS : l'écran du professeur, la route, la
    // colonne, le compteur de l'élève. Les deux épreuves au-dessus gardent le
    // passage de la colonne ; celle-ci garde les deux bouts.
    assert.match(SEANCE, /'malus'\s*=>/, 'le battement n’emporte pas le barème');
    assert.match(SEANCE, /const DEFI_MALUS_PAR_DEFAUT = 1;/,
        'absent doit vouloir dire « le défaut », et non « sans pénalité »');
    const SD = readFileSync(new URL('../js/core/seanceDistante.js', import.meta.url), 'utf8');
    assert.match(SD, /malus: d\.malus === undefined \|\| d\.malus === null\s*\n?\s*\? 1 :/,
        'l’ardoise doit lire le barème, et retomber sur le défaut quand il manque');
    const UI = readFileSync(new URL('../js/ui/defiUI.js', import.meta.url), 'utf8');
    assert.match(UI, /else points = Math\.max\(0, points - malus\);/,
        'une faute doit coûter, et le score ne doit pas passer sous zéro');
    // ET L'ÉLÈVE VOIT LE SCORE QUI CLASSE : sans cela il perdrait des places
    // sans qu'aucun chiffre ne bouge sous ses yeux.
    assert.match(UI, /const enScore = enPoints \|\| malus > 0;/);
    assert.ok(!/String\(enPoints \? points : bonnes\)/.test(UI),
        'le compteur montre encore les bonnes réponses là où le classement '
        + 'compte les points');
});

test('ET LA MARCHE CHOISIE VOYAGE, SANS EFFACER LES RÉGLAGES DE L\'EXERCICE', () => {
    // RÉMY : « pour le défi, quand ce sont des exercices à pas, je ne peux
    // choisir le pas ». Le défi prenait l'exercice avec ses réglages PAR
    // DÉFAUT : sur un exercice à marches, il tirait dans toutes.
    assert.match(SEANCE, /'params'\s*=>/, 'le battement n’emporte pas les réglages du défi');
    const SD = readFileSync(new URL('../js/core/seanceDistante.js', import.meta.url), 'utf8');
    assert.match(SD, /params: \(d\.params && typeof d\.params === 'object'\) \? d\.params : \{\}/,
        'l’ardoise doit lire les réglages, et retomber sur « ceux de l’exercice »');
    const UI = readFileSync(new URL('../js/ui/defiUI.js', import.meta.url), 'utf8');
    // PAR-DESSUS, ET NON À LA PLACE. Le professeur choisit UNE marche ; tout
    // le reste de ce que l'exercice déclare — ses bornes, sa façon de
    // compter — doit continuer de s'appliquer. Les remplacer en bloc donnerait
    // un exercice que personne n'a réglé.
    assert.match(UI, /\{ \.\.\.\(exo\.params \|\| \{\}\), \.\.\.reglages \}/,
        'les réglages du défi se posent PAR-DESSUS ceux de l’exercice');
    assert.match(UI, /questionDuDefi\(exo, defi\.graine, n, defi\.params\)/,
        'et le défi doit les passer à chaque question');

    // ── ILS SURVIVENT À L'ARRÊT, COMME LA GRAINE ─────────────────────────
    //
    // « Rejouer » relance le même défi et « Au tableau » projette les VRAIES
    // questions qu'on vient de poser. Si les réglages s'effaçaient à l'arrêt,
    // l'écran de correction montrerait des questions d'une AUTRE marche que
    // celles que la classe a eues — et personne ne comprendrait pourquoi.
    const API = readFileSync(new URL('../api/index.php', import.meta.url), 'utf8');
    const i = API.indexOf('defi_but = NULL, defi_equipes = 0');
    assert.notEqual(i, -1, 'l’arrêt du défi a changé de forme');
    assert.ok(!/defi_params = NULL/.test(API.slice(i, i + 220)),
        'les réglages du défi ne doivent pas s’effacer à l’arrêt : la graine '
        + 'survit pour la même raison');
    assert.match(API, /'defiParams' =>/,
        'et l’écran du professeur doit les recevoir, pour « Au tableau »');
});
