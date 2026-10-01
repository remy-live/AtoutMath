// LE GESTIONNAIRE DE PARCOURS — cocher, ranger, jeter, et que ça TIENNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il me faudrait clairement un gestionnaire de parcours pour en
// sélectionner plusieurs les trier les classer car là du coup on a tout
// retrouvé. Supprimer en bloc, mettre dans la corbeille. »
//
// ── CE QU'ON A TROUVÉ EN CREUSANT, ET QUI PASSE AVANT L'ÉCRAN ───────────────
//
// MESURÉ AVANT (`tools/parcoursSupprime.mjs`) : on supprimait un parcours, on
// rechargeait la page, IL REVENAIT. `removeTeacherPath` n'efface que la copie
// de ce navigateur ; la route `/teacher/paths` n'acceptait que `save` et
// `list`, donc le serveur gardait la sienne — et depuis que la bibliothèque
// redescend au démarrage (v906), elle la redescendait. Le bouton disait
// « définitivement ».
//
// UN GESTIONNAIRE BÂTI PAR-DESSUS AURAIT MENTI À CHAQUE GESTE. La corbeille
// commence donc par une colonne et trois actions de serveur, et l'écran vient
// après.
//
// ── POURQUOI UNE SUPPRESSION DOUCE, ET PAS UN `DELETE` ─────────────────────
//
// `assignments.path_id` est en ON DELETE CASCADE : effacer vraiment un parcours
// emporterait la trace des séances données avec. Rémy, interrogé : « on
// prévient, et on garde le bilan ». Trente jours, puis la purge quotidienne
// efface — « il y reste 30 jours, puis part tout seul ».
//
// MESURÉ APRÈS (`tools/gestionParcours.mjs`, 16 vérifications) : les quatre
// rangements changent l'ordre affiché et l'en-tête l'annonce ; cocher deux
// parcours fait apparaître la barre sans ouvrir aucun des deux ; « Mettre à la
// corbeille » demande, puis les retire de la liste ; après rechargement ils ne
// reviennent pas ; la corbeille les montre ; et l'un d'eux ressorti revient
// dans la bibliothèque. 0 erreur de page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { ordonner, ORDRES, vueDeLExplorateur } from '../js/core/explorateurParcours.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ────────────────────────────────────────── LES QUATRE RANGEMENTS ───────────

const TROIS = () => [
    { id: 'a', nom: 'Zèbre', modifieLe: 300, activites: 9 },
    { id: 'b', nom: 'Alpha', modifieLe: 100, activites: 2 },
    { id: 'c', nom: 'Mimosa', modifieLe: 200, activites: 5 }
];

test('LES QUATRE RANGEMENTS RANGENT VRAIMENT, ET CHACUN AUTREMENT', () => {
    const noms = (o) => ordonner(TROIS(), o).map(r => r.nom).join(' ');
    assert.equal(noms('recent'), 'Zèbre Mimosa Alpha');
    assert.equal(noms('ancien'), 'Alpha Mimosa Zèbre', 'le ménage se fait par le plus ancien');
    assert.equal(noms('nom'), 'Alpha Mimosa Zèbre');
    assert.equal(noms('taille'), 'Alpha Mimosa Zèbre', 'les essais oubliés sont les plus petits');
    // ET LES QUATRE SONT DÉCLARÉS : l'écran lit cette liste, il ne la recopie pas.
    assert.deepEqual(ORDRES, ['recent', 'ancien', 'nom', 'taille']);
});

test('UN RANGEMENT INCONNU RETOMBE SUR LE PLUS RÉCENT, SANS SE PLAINDRE', () => {
    // Un `select` bricolé, un vieux réglage rangé dans le navigateur : on ne
    // veut pas d'une liste vide, on veut le défaut.
    assert.equal(ordonner(TROIS(), 'nimporte').map(r => r.nom).join(' '), 'Zèbre Mimosa Alpha');
    assert.equal(ordonner(TROIS(), undefined)[0].nom, 'Zèbre');
});

test('UN PARCOURS SANS DATE RESTE AU FOND, DANS LES DEUX SENS', () => {
    // Il n'est pas « le plus ancien » : on ne sait pas quand il a été fait. Le
    // mettre en tête du ménage ferait jeter ce qu'on n'a pas pu dater.
    const avecTrou = [...TROIS(), { id: 'd', nom: 'Sans date', modifieLe: 0, activites: 4 }];
    assert.equal(ordonner(avecTrou, 'recent').at(-1).nom, 'Sans date');
    assert.equal(ordonner(avecTrou, 'ancien').at(-1).nom, 'Sans date');
});

test('LE RANGEMENT S\'APPLIQUE AUSSI DANS LES DOSSIERS ET DANS LA RECHERCHE', () => {
    // C'ÉTAIT LE DÉFAUT D'ORIGINE : « Récents » et « Dossiers » sont des
    // GROUPEMENTS, et l'ordre interne était câblé en dur dans les deux. On
    // pouvait donc avoir des dossiers, mais pas des dossiers rangés par nom.
    const entrees = TROIS().map(r => ({ ...r, folderId: 'f1' }));
    const resumeur = (p) => ({ ...p, dossier: p.folderId });
    const parNom = vueDeLExplorateur(entrees, [{ id: 'f1', name: 'Dossier' }],
        { tri: 'dossiers', ordre: 'nom', resumeur });
    assert.deepEqual(parNom.sections[0].parcours.map(r => r.nom), ['Alpha', 'Mimosa', 'Zèbre']);
    const cherche = vueDeLExplorateur(entrees, [], { ordre: 'nom', recherche: 'a', resumeur });
    assert.deepEqual(cherche.sections[0].parcours.map(r => r.nom), ['Alpha', 'Mimosa']);
});

test('L\'EN-TÊTE DIT L\'ORDRE CHOISI, ET NON « Du plus récemment modifié » TOUJOURS', () => {
    // Une liste dont le titre ment sur son ordre est pire qu'une liste sans
    // titre : on cherche en bas ce qui est en haut.
    const resumeur = (p) => ({ ...p, dossier: 'root' });
    const titre = (ordre) => vueDeLExplorateur(TROIS(), [], { ordre, resumeur }).sections[0].titre;
    assert.match(titre('recent'), /récemment/);
    assert.match(titre('ancien'), /ancien/);
    assert.match(titre('nom'), /alphab/i);
    assert.match(titre('taille'), /petit/);
});

// ──────────────────────────────── LA CORBEILLE, CÔTÉ SERVEUR ────────────────

test('LA COLONNE EXISTE, ET ELLE EST NULLABLE', () => {
    // Sans elle, « mettre à la corbeille » n'a nulle part où s'écrire. NULL =
    // vivant ; une date = jeté ce jour-là.
    assert.match(lire('api/lib/schema.php'), /supprime_le \$dateN/,
        'la corbeille n\'a pas de colonne où exister');
});

test('LA ROUTE SAIT JETER, RESTAURER ET VIDER — ET SEULEMENT SES PROPRES PARCOURS', () => {
    const api = sansCommentaires(lire('api/index.php'));
    const route = api.slice(api.indexOf('function handleTeacherPaths'));
    const corps = route.slice(0, route.indexOf('\nfunction '));
    assert.match(corps, /\['corbeille', 'restaurer'\]/, 'les deux gestes doux manquent');
    assert.match(corps, /\$action === 'vider'/, 'on ne peut pas vider la corbeille');
    // LA SEULE CHOSE QUI COMPTE VRAIMENT ICI : sans `teacher_id`, un
    // identifiant deviné jetterait le parcours d'un collègue.
    assert.match(corps, /UPDATE paths SET supprime_le[\s\S]{0,160}WHERE teacher_id = \?/,
        'un identifiant deviné jetterait le parcours d\'un autre professeur');
    assert.match(corps, /DELETE FROM paths WHERE teacher_id = \? AND supprime_le IS NOT NULL/,
        'vider la corbeille pourrait effacer des parcours vivants');
    // ON BORNE CE QUI ARRIVE DU NAVIGATEUR.
    assert.match(corps, /array_slice\(\$ids, 0, 200\)/,
        'une liste sans fin n\'est pas une liste, c\'est une surface d\'attaque');
    // ET LA LISTE NE REND QUE LES VIVANTS, la corbeille à part.
    assert.match(corps, /AND supprime_le IS NULL/,
        'les parcours jetés redescendraient avec les autres');
    assert.match(corps, /'corbeille' => \$c->fetchAll\(\)/);
    assert.match(corps, /'joursCorbeille' => JOURS_CORBEILLE/,
        'l\'écran recopierait « 30 » au lieu de le demander à qui efface');
});

test('LA PURGE EFFACE AU BOUT DE TRENTE JOURS, ET NE DÉPEND PAS DE retention_days', () => {
    const s = sansCommentaires(lire('api/lib/seance.php'));
    assert.match(lire('api/lib/seance.php'), /const JOURS_CORBEILLE = 30;/);
    const f = s.slice(s.indexOf('function purgerSiNecessaire'));
    const corps = f.slice(0, f.indexOf('\n}'));
    assert.match(corps, /DELETE FROM paths WHERE supprime_le IS NOT NULL AND supprime_le < /,
        'la corbeille ne se viderait jamais toute seule');
    // L'ORDRE EST LE POINT : `retention_days` règle les données d'ÉLÈVES, que
    // Rémy peut vouloir à zéro. La corbeille d'un professeur n'a rien à voir,
    // et son compte à rebours doit tourner même quand l'autre est arrêté.
    assert.ok(corps.indexOf('DELETE FROM paths') < corps.indexOf('if ($jours <= 0)'),
        'la corbeille ne se viderait plus dès que retention_days vaut 0');
});

// ──────────────────────────── LA CORBEILLE, CÔTÉ NAVIGATEUR ─────────────────

test('ON JETTE AU SERVEUR D\'ABORD, ON OUBLIE LOCALEMENT ENSUITE', () => {
    const ps = sansCommentaires(lire('js/core/parcoursServeur.js'));
    const f = ps.slice(ps.indexOf('export async function jeterALaCorbeille'));
    const corps = f.slice(0, f.indexOf('\n}'));
    // ON REGARDE LE CHEMIN RACCORDÉ, et seulement lui : il y a plus haut une
    // branche « pas identifié » qui efface localement, et c'est juste — sur sa
    // machine seule, la suppression locale EST définitive. Ma première version
    // comparait les deux premières occurrences venues et accusait cette
    // branche-là.
    const raccorde = corps.slice(corps.indexOf("const r = await auServeur"));
    assert.ok(raccorde.indexOf("action: 'corbeille'") < raccorde.indexOf('state.removeTeacherPath'),
        'dans l\'autre sens, une panne de réseau efface ici et garde là-bas');
    assert.ok(raccorde.indexOf('if (r.erreur) return r;') < raccorde.indexOf('state.removeTeacherPath'),
        'un refus du serveur effacerait quand même la copie locale');
});

test('CE QUI EST JETÉ AILLEURS S\'EN VA DE CETTE MACHINE AUSSI', () => {
    // L'autre moitié de la corbeille, et elle ne se voit que sur une SECONDE
    // machine : sans elle, le poste de la salle garderait un parcours jeté
    // depuis le Mac et le remonterait à chaque démarrage.
    const ps = sansCommentaires(lire('js/core/parcoursServeur.js'));
    const f = ps.slice(ps.indexOf('export async function ramenerLaBibliotheque'));
    const corps = f.slice(0, f.indexOf('\n}\n'));
    assert.match(corps, /aLaCorbeille\.has\(p\.id\)/,
        'un parcours jeté depuis un autre poste resterait ici pour toujours');
});

// ───────────────────────────────────────────── L'ÉCRAN ──────────────────────

test('COCHER NE DOIT PAS OUVRIR LE PARCOURS', () => {
    // La ligne entière est un bouton qui OUVRE. Sans `stopPropagation`, cocher
    // dix parcours en ouvrirait dix — et le dixième écraserait l'éditeur.
    const b = sansCommentaires(lire('js/ui/builder.js'));
    const f = b.slice(b.indexOf('const basculer = (e) =>'));
    assert.match(f.slice(0, 200), /e\.stopPropagation\(\)/,
        'cocher ouvrirait aussi le parcours');
});

test('LA SÉLECTION DES PARCOURS NE S\'APPELLE PAS COMME CELLE DES ÉTAPES', () => {
    // `node --check` a refusé le fichier avant moi : `coches` existait DÉJÀ,
    // pour les étapes du parcours ouvert. Deux sélections vivent dans le même
    // écran, et un nom ambigu aurait fini par cocher les mauvais.
    const b = lire('js/ui/builder.js');
    assert.match(b, /const cochesParcours = new Set\(\);/);
    assert.match(b, /let coches = new Set\(\)|const coches = new Set\(\)/,
        'la sélection des étapes a disparu');
});

test('LA BARRE DES COCHÉS SE BRANCHE À CHAQUE RENDU, PAS UNE SEULE FOIS', () => {
    // ─────────────────────────────────────────────────────────────────────
    // MESURÉ : `brancherLaBarre()` ne s'exécute QU'UNE FOIS, et ce passage a
    // lieu avant que la barre n'existe. La sonde a trouvé la barre en place,
    // dans le bon tiroir, avec son bouton dedans — et `barre.onclick` à
    // `false`. Le clic sur « Mettre à la corbeille » n'allait nulle part, en
    // silence.
    const b = sansCommentaires(lire('js/ui/builder.js'));
    assert.match(b, /function brancherLesGestesDesCoches/);
    const rendu = b.slice(b.indexOf('export function renderPathBrowser'));
    assert.match(rendu.slice(0, 1200), /brancherLesGestesDesCoches\(\);/,
        'la barre ne serait branchée qu\'au premier rendu, donc jamais');
});

test('ON AVERTIT QUAND LE PARCOURS A DÉJÀ SERVI, ET LE BILAN RESTE', () => {
    // Rémy : « on prévient, et on garde le bilan ».
    const b = lire('js/ui/builder.js');
    assert.match(b, /auditoires/, 'rien ne retient ce qui a déjà été donné');
    assert.match(b, /bilan restent lisibles/,
        'on jetterait une séance donnée sans dire ce qu\'il advient du travail');
});

// ───────────────────────────── L'IDENTIFIANT QUI SE RÉPÉTAIT ────────────────

test('DEUX PARCOURS ENREGISTRÉS D\'AFFILÉE N\'ONT PAS LE MÊME IDENTIFIANT', () => {
    // ─────────────────────────────────────────────────────────────────────
    // TROUVÉ PAR LA SONDE, et ce n'était pas ce qu'elle cherchait : trois
    // parcours posés d'affilée s'affichaient trois fois sous le même nom.
    // `saveTeacherPath` fabriquait `'path_' + Date.now()`, et trois appels dans
    // la même milliseconde donnent le même identifiant.
    //
    // CE N'EST PAS UN CAS DE LABORATOIRE : `generateSampleData` enregistre
    // « Parcours découverte » puis « Tout sur papier » coup sur coup. Et au
    // serveur ce serait pire — `ON CONFLICT(id) DO UPDATE` : le second ÉCRASE
    // le premier, sans un mot.
    const s = lire('js/core/state.js');
    assert.match(s, /id: 'path_' \+ Date\.now\(\) \+ '_' \+ shortId\(4\)/,
        'deux parcours de la même milliseconde partagent leur identifiant');
    assert.match(s, /id: 'folder_' \+ Date\.now\(\) \+ '_' \+ shortId\(4\)/,
        'deux dossiers de la même milliseconde n\'en feraient qu\'un');
});
