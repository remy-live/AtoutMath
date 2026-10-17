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
// ── ET POURQUOI UNE FENÊTRE, ET NON UNE BARRE À CASES ──────────────────────
//
// RÉMY, devant le premier écran : « tu peux pas faire mieux ou ouvrir une
// modale, je trouve que c'est un peu bricolé, on ne peut faire des cadre de
// sélection, utiliser shift ou cmd ». Les cases à cocher et la barre ont donc
// quitté le tiroir de trois cents pixels pour `js/ui/gererParcours.js`.
//
// MESURÉ APRÈS (`tools/gestionParcours.mjs`, 31 vérifications) : les trois
// colonnes rangent et la colonne active porte sa marque ; un clic prend une
// ligne sans ouvrir le parcours ; Maj prend la suite PUIS la rétrécit ; Ctrl
// et Cmd en ajoutent une ; Ctrl+A prend tout ; un cadre tiré depuis une ligne
// prend ce qu'il touche, rend ce qu'il quitte, et le clic du relâchement ne
// l'avale pas ; « Mettre à la corbeille » demande en annonçant trente jours,
// puis les deux quittent la liste, se retrouvent dans la corbeille, et l'un
// ressorti revient. 0 erreur de page, 0 fenêtre native.

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
    assert.match(corps, /AND (?:p\.)?supprime_le IS NULL/,
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

test('LE TIROIR N\'A PLUS NI CASES À COCHER NI BARRE D\'ACTIONS', () => {
    // ─────────────────────────────────────────────────────────────────────
    // RÉMY A PHOTOGRAPHIÉ LE DÉFAUT : trois boutons repliés sur trois lignes
    // dans une colonne de trois cents pixels. « je trouve que c'est un peu
    // bricolé ». La cause n'était pas le dessin, c'était la LARGEUR — gérer
    // demande de voir cinquante lignes d'un coup.
    //
    // CETTE ÉPREUVE GARDE UNE SUPPRESSION, ce qui est le plus facile à défaire
    // sans y penser : il suffit d'un copier-coller depuis l'historique pour que
    // les deux écrans réapparaissent côte à côte, chacun avec sa sélection.
    const b = sansCommentaires(lire('js/ui/builder.js'));
    assert.doesNotMatch(b, /pb-choix/, 'les cases à cocher sont revenues dans le tiroir');
    assert.doesNotMatch(b, /pb-selection/, 'la barre d\'actions est revenue dans le tiroir');
    assert.doesNotMatch(b, /data-pb-jeter|data-pb-ranger/,
        'les gestes en bloc sont revenus dans le tiroir');
    const h = sansCommentaires(lire('index.html'));
    assert.doesNotMatch(h, /id="pb-selection"|id="btn-corbeille"/,
        'le gabarit porte encore la barre');
    // ET LE TÉMOIN, SANS QUOI CETTE ÉPREUVE PASSERAIT AU VERT SUR UN TIROIR
    // DONT ON AURAIT RETIRÉ LA GESTION TOUT ENTIÈRE.
    assert.match(h, /id="btn-gerer-parcours"/, 'plus aucune porte vers la gestion');
    assert.match(b, /btn-gerer-parcours/);
    assert.match(b, /gererParcours\.js/, 'le bouton « Gérer » n\'ouvre rien');
});

test('LE CADRE PEUT PARTIR D\'UNE LIGNE, SANS QUOI IL NE PART DE NULLE PART', () => {
    // ─────────────────────────────────────────────────────────────────────
    // MESURÉ (`tools/gestionParcours.mjs`) : « il reste 1 px de vide sous la
    // dernière ligne ». Le cadre ne démarrait que sur du vide — il n'y en a
    // plus dès sept parcours, et le geste que Rémy a demandé devenait
    // impossible à amorcer EXACTEMENT quand il sert : sur une bibliothèque
    // remplie. Une liste courte se clique ; c'est la longue qui a besoin d'un
    // cadre.
    //
    // CE QUI L'INTERDISAIT était la crainte de confondre avec un
    // glisser-déposer. Il n'y en a pas dans cette fenêtre : la crainte venait
    // du tiroir, recopiée ici sans sa raison.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    const appui = g.slice(g.indexOf('liste.onmousedown'), g.indexOf('liste.onmousemove'));
    assert.doesNotMatch(appui, /closest\('\.gp-ligne/,
        'le cadre refuse à nouveau de partir d\'une ligne');
    // MAIS PAS DEPUIS L'EN-TÊTE : un cadre tiré depuis un titre de colonne
    // serait un clic de tri raté.
    assert.match(appui, /closest\('\.gp-tete'\)/, 'un cadre partirait de l\'en-tête');
});

test('UN APPUI IMMOBILE RESTE UN CLIC, ET C\'EST LE GESTE LE PLUS FRÉQUENT', () => {
    // Si deux pixels de tremblement ouvraient un cadre, chaque clic de Rémy
    // deviendrait une sélection d'une ligne par accident — le cadre
    // « marcherait » et l'écran serait inutilisable.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    assert.match(g, /const SEUIL_DU_CADRE = \d+;/, 'plus de seuil : tout appui tire un cadre');
    const bouge = g.slice(g.indexOf('liste.onmousemove'), g.indexOf('const finirLeCadre'));
    assert.match(bouge, /if \(!tire\)[\s\S]{0,160}SEUIL_DU_CADRE[\s\S]{0,60}return;/,
        'le cadre s\'ouvre avant d\'avoir franchi le seuil');
    assert.match(bouge, /tire = true;/);
});

test('LE CLIC QUI SUIT UN CADRE EST AVALÉ, SINON LE CADRE EST PERDU EN LÂCHANT', () => {
    // ─────────────────────────────────────────────────────────────────────
    // LE DÉFAUT QUE LE CADRE PARTANT D'UNE LIGNE REND POSSIBLE : le navigateur
    // envoie un `click` après le `mouseup`, sur la ligne où l'on a relâché.
    // Sans ce garde-fou, `onclick` ramènerait la sélection à cette seule
    // ligne — vingt parcours encadrés, un seul pris, et rien à l'écran pour
    // expliquer pourquoi.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    const clic = g.slice(g.indexOf('liste.onclick'), g.indexOf('liste.onkeydown'));
    assert.match(clic.slice(0, 220), /if \(avalerLeClic\)[\s\S]{0,80}return;/,
        'le clic du relâchement n\'est plus avalé : le cadre se perd en lâchant');
    const finir = g.slice(g.indexOf('const finirLeCadre'), g.indexOf('liste.onmouseup'));
    assert.match(finir, /avalerLeClic = tire;/,
        'on avalerait aussi le clic d\'un appui immobile, qui doit sélectionner');
});

test('LE CADRE SE RECALCULE DEPUIS SON DÉPART, IL N\'EMPILE PAS', () => {
    // Un cadre qui ne sait que GRANDIR est le même défaut que l'ancre qui
    // suivait le Maj-clic : on ne peut plus corriger son geste sans tout
    // recommencer. On repart donc, à chaque mouvement, de ce qui était pris
    // quand le bouton a été enfoncé.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    const bouge = g.slice(g.indexOf('liste.onmousemove'), g.indexOf('const finirLeCadre'));
    assert.doesNotMatch(bouge, /dansLeCadre\([\s\S]{0,120}\.add\(/,
        'le cadre ajoute sans jamais retirer');
    assert.match(bouge, /selection = new Set\(\[\.\.\.priseAuDepart,[\s\S]{0,120}dansLeCadre/,
        'le cadre ne repart pas de ce qui était pris au départ');
});

test('LE PIED NE COMPTE QUE CE QUI EST SOUS LES YEUX', () => {
    // La sélection peut garder des fantômes — une ligne jetée depuis un autre
    // poste, un filtre qui resserre. « 3 parcours sélectionnés » au-dessus
    // d'une liste d'une ligne, puis « Mettre à la corbeille » qui en jette un,
    // c'est le genre de mensonge qui coûte un parcours.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    const compte = g.slice(g.indexOf('const direCombien'), g.indexOf('const prises'));
    assert.match(compte, /filter\(\(id\) => affiches\.some/,
        'le pied compte des parcours que l\'écran ne montre pas');
    // ET LE GESTE EN BLOC PART DE LA MÊME LISTE, sans quoi on jetterait les
    // fantômes que le pied ne comptait pas.
    assert.match(g, /const prises = \(\) => \[\.\.\.selection\]\.filter\(\(id\) => affiches\.some/);
});

test('LES DEUX ÉCRANS TRIENT PAR LE MÊME MODULE, ET LA CORBEILLE EST LA MÊME', () => {
    // Deux façons de trier les mêmes parcours finiraient par ne plus donner le
    // même ordre, et deux corbeilles par ne plus savoir restaurer. Le tiroir et
    // la fenêtre importent donc `explorateurParcours` et `corbeilleParcours`.
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    const b = sansCommentaires(lire('js/ui/builder.js'));
    assert.match(g, /from '\.\.\/core\/explorateurParcours\.js'/);
    assert.match(b, /explorateurParcours\.js/);
    assert.match(g, /corbeilleParcours\.js/);
    // ET LA FENÊTRE PRÉVIENT LE TIROIR : ils montrent la même bibliothèque, et
    // un tiroir qui garde un parcours jeté le rouvrirait.
    assert.match(g, /function rafraichirLeTiroir[\s\S]{0,260}renderPathBrowser/);
});

test('ON AVERTIT QUAND LE PARCOURS A DÉJÀ SERVI, ET LE BILAN RESTE', () => {
    // ─────────────────────────────────────────────────────────────────────
    // Rémy : « on prévient, et on garde le bilan ».
    //
    // L'AVERTISSEMENT A FAILLI DEVENIR MUET EN CHANGEANT D'ÉCRAN. Une `Map`
    // dans `builder.js` retenait le compte — et ne se remplissait que pour le
    // parcours OUVERT, donc presque jamais au moment d'en gérer trente. Elle
    // se serait taue exactement quand elle sert. Le compte vient maintenant du
    // serveur, avec la liste, en une jointure.
    const php = lire('api/index.php');
    assert.match(php, /SELECT COUNT\(\*\) FROM assignments a WHERE a\.path_id = p\.id\) AS donne/,
        'la liste ne dit plus combien de fois un parcours a été donné');
    const s = sansCommentaires(lire('js/core/parcoursServeur.js'));
    assert.match(s, /export async function combienDonne/);
    const g = sansCommentaires(lire('js/ui/gererParcours.js'));
    assert.match(g, /combienDonne\(\)/, 'la fenêtre ne demande pas le compte');
    // ET ELLE LE DIT AVANT DE JETER, en ne le disant QUE quand c'est vrai : une
    // phrase collée à chaque suppression finit par ne plus être lue.
    const jeter = g.slice(g.indexOf('[data-gp-jeter]\').onclick'));
    assert.match(jeter.slice(0, 1400), /const servis = ids\.filter\(\(id\) => donnes\.get\(id\)\)/,
        'on jetterait une séance donnée sans prévenir');
    assert.match(jeter.slice(0, 1400), /reste au bilan/,
        'rien ne dit ce qu\'il advient du travail des élèves');
    // ET L'ÉCRAN SE TAIT TANT QU'IL NE SAIT PAS : un badge « jamais donné »
    // faux serait pire que pas de badge. La `Map` part donc vide.
    assert.match(g, /let donnes = new Map\(\);/);
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
