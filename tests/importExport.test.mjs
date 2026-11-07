// IMPORTER UN FICHIER SANS PERDRE CE QU'ON AVAIT DÉJÀ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// C'EST LE SEUL ENDROIT DU LOGICIEL OÙ UN DÉFAUT EFFACE UNE ANNÉE DE TRAVAIL.
//
// `js/core/importExport.js` est le transfert « sans serveur » : une clé USB ou
// une pièce jointe suffisent pour qu'un élève emporte sa progression, ou qu'un
// professeur récupère ses parcours d'un poste à l'autre. Rémy travaille sur
// deux ordinateurs — « sur mon ordi de boulot et mon ordi personnel » — et ce
// fichier est l'un des deux chemins par lesquels ses parcours voyagent.
//
// DEUX CENT QUATRE-VINGT-QUATRE LIGNES, ZÉRO ÉPREUVE. Et la raison n'était pas
// la négligence : la logique de fusion était coincée au milieu d'un
// `applyImport` qui ouvre une fenêtre, lit un `FileReader`, importe
// `ui/modal.js` et redessine `ui/builder.js`. Pour l'atteindre il fallait un
// navigateur, donc on ne l'atteignait pas.
//
// Elle est maintenant à part (`reconnaitreFichier`, `fusionnerContenuProfesseur`,
// `contenuAExporter`, `evenementsDepuisAncienFormat`), et ces quatre fonctions
// ne touchent à rien : on leur donne le fichier et l'état actuel, elles disent
// ce qu'il faut en faire.
//
// CE QU'ON GARDE, dans l'ordre de ce qu'on perdrait :
//
//   1. UN RÉIMPORT NE DOUBLE PAS. Rémy réimporte son fichier de la semaine
//      dernière ; il ne doit pas se retrouver avec quarante parcours en double
//      à trier à la main.
//   2. UN IMPORT N'EFFACE PAS. Les trois parcours écrits depuis restent.
//   3. LE CLASSEMENT PAR CHAPITRE FUSIONNE CASE PAR CASE. C'est une soirée de
//      relecture : un remplacement en bloc la jetterait.
//   4. LE DRAPEAU `synced` NE VOYAGE PAS. Il dit « ce poste-ci a déjà envoyé
//      cet événement » ; sur l'appareil qui reçoit, il voudrait dire « ne
//      l'envoie jamais ». Le travail de l'élève n'arriverait pas au professeur
//      et personne ne verrait pourquoi.
//   5. UN FICHIER QU'ON NE RECONNAÎT PAS EST REFUSÉ, pas lu à moitié.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    reconnaitreFichier, fusionnerContenuProfesseur,
    contenuAExporter, nomDuFichier, evenementsDepuisAncienFormat
} from '../js/core/importExport.js';

const parcours = (id, name) => ({ id, name, steps: [{ exerciseId: 'calc-add' }] });
const QUAND = 1_700_000_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// RECONNAÎTRE
// ─────────────────────────────────────────────────────────────────────────────

test('UN FICHIER QU\'ON NE RECONNAÎT PAS EST REFUSÉ', () => {
    // La valeur de retour qui compte est `null` : c'est elle qui fait dire
    // « Format de fichier non reconnu » plutôt que de lire un fichier de
    // tableur à moitié et d'écrire n'importe quoi dans les parcours.
    //
    // CE QUE CES QUATRE PREMIÈRES LIGNES NE GARDENT PAS, et il faut le dire :
    // `epreuveTombe.mjs` a montré qu'en retirant le `typeof data !== 'object'`
    // du code, elles restaient vertes — lire `.kind` sur une chaîne ou un
    // nombre rend `undefined` sans jeter, donc on tombe de toute façon sur le
    // `return null` final. Ce garde-fou est une ceinture, pas une bretelle ;
    // on le garde pour la prochaine fonction qui fera un `Object.entries(data)`,
    // mais on ne prétend pas l'éprouver.
    assert.equal(reconnaitreFichier(null), null);
    assert.equal(reconnaitreFichier(undefined), null);
    assert.equal(reconnaitreFichier('du texte'), null);
    assert.equal(reconnaitreFichier(42), null);
    assert.equal(reconnaitreFichier({}), null);
    assert.equal(reconnaitreFichier({ kind: 'autre_chose' }), null);

    // CECI, EN REVANCHE, EST LA VRAIE GARDE DE CETTE ÉPREUVE. Un fichier
    // d'élève SANS tableau d'événements n'est pas un fichier d'élève : il n'y a
    // rien à fusionner, et la branche qui le lit ferait `undefined.length`.
    // Un `events` qui est une chaîne — fichier réécrit à la main — a l'air d'un
    // tableau pour tout ce qui ne vérifie pas, et `journal.merge` en tirerait
    // des événements d'une seule lettre.
    assert.equal(reconnaitreFichier({ kind: 'student_progress' }), null);
    assert.equal(reconnaitreFichier({ kind: 'student_progress', events: 'oui' }), null);
    assert.equal(reconnaitreFichier({ kind: 'student_progress', events: {} }), null);
});

test('LES QUATRE FORMES QUI CIRCULENT SE RECONNAISSENT TOUTES', () => {
    assert.equal(reconnaitreFichier({ kind: 'teacher_content' }), 'contenu-professeur');
    // L'ancienne clé `type` reste reconnue : des fichiers exportés il y a deux
    // ans traînent encore sur les clés USB, et ils doivent s'ouvrir.
    assert.equal(reconnaitreFichier({ type: 'teacher_paths' }), 'contenu-professeur');
    assert.equal(reconnaitreFichier({ kind: 'student_progress', events: [] }), 'progression-eleve');
    assert.equal(reconnaitreFichier({ type: 'student_progress' }), 'progression-ancienne');
});

// ─────────────────────────────────────────────────────────────────────────────
// FUSIONNER LES PARCOURS D'UN PROFESSEUR
// ─────────────────────────────────────────────────────────────────────────────

test('RÉIMPORTER LE MÊME FICHIER N\'AJOUTE RIEN', () => {
    const actuel = { parcours: [parcours('pa_1', 'Relatifs'), parcours('pa_2', 'Fractions')] };
    const fichier = { kind: 'teacher_content', teacherPaths: [parcours('pa_1', 'Relatifs'), parcours('pa_2', 'Fractions')] };

    const r = fusionnerContenuProfesseur(fichier, actuel);
    assert.deepEqual(r.parcoursAAjouter, [],
        'réimporter son propre fichier doit être une opération sans effet');
});

test('L\'IDENTIFIANT DÉCIDE, PAS LE NOM', () => {
    // Deux parcours peuvent légitimement s'appeler « Relatifs » : celui de la
    // 6e B et celui de la 6e C. Dédoublonner sur le NOM en effacerait un.
    const actuel = { parcours: [parcours('pa_1', 'Relatifs')] };
    const fichier = { kind: 'teacher_content', teacherPaths: [parcours('pa_9', 'Relatifs')] };

    const r = fusionnerContenuProfesseur(fichier, actuel);
    assert.equal(r.parcoursAAjouter.length, 1);
    assert.equal(r.parcoursAAjouter[0].id, 'pa_9');
});

test('UN FICHIER QUI SE RÉPÈTE LUI-MÊME NE DOUBLE PAS NON PLUS', () => {
    // Cas réel : un fichier recollé à la main, ou deux exports concaténés.
    const fichier = {
        kind: 'teacher_content',
        teacherPaths: [parcours('pa_1', 'Relatifs'), parcours('pa_1', 'Relatifs')]
    };
    const r = fusionnerContenuProfesseur(fichier, { parcours: [] });
    assert.equal(r.parcoursAAjouter.length, 1);
});

test('UNE LIGNE VIDE DANS LE FICHIER NE FAIT PAS TOMBER L\'IMPORT', () => {
    // Un `null` au milieu d'un tableau JSON arrive — fichier tronqué, édition
    // à la main. Avant, `p.id` jetait et l'import entier était perdu : Rémy
    // aurait vu « Fichier illisible » pour quarante parcours valides et un trou.
    const fichier = { kind: 'teacher_content', teacherPaths: [null, parcours('pa_1', 'A'), undefined] };
    const r = fusionnerContenuProfesseur(fichier, { parcours: [null] });
    assert.equal(r.parcoursAAjouter.length, 1);
    assert.equal(r.parcoursAAjouter[0].id, 'pa_1');
});

test('UN IMPORT N\'EFFACE JAMAIS CE QUI ÉTAIT DÉJÀ LÀ', () => {
    // On ne rend que CE QU'IL FAUT AJOUTER, justement pour que l'appelant ne
    // puisse pas remplacer la liste du professeur par celle du fichier.
    const actuel = { parcours: [parcours('pa_1', 'Écrit hier')] };
    const fichier = { kind: 'teacher_content', teacherPaths: [parcours('pa_2', 'Du fichier')] };

    const r = fusionnerContenuProfesseur(fichier, actuel);
    assert.deepEqual(Object.keys(r).sort(),
        ['casesClassees', 'classement', 'dossiersAAjouter', 'parcoursAAjouter']);
    assert.equal(r.parcoursAAjouter.length, 1, 'un seul parcours à ajouter');
    assert.equal(actuel.parcours.length, 1, 'et la liste du professeur n\'a pas bougé d\'elle-même');
});

test('LES DOSSIERS SUIVENT LES PARCOURS', () => {
    const fichier = {
        kind: 'teacher_content',
        teacherFolders: [{ id: 'do_1', name: '6e B' }, { id: 'do_2', name: '6e C' }]
    };
    const r = fusionnerContenuProfesseur(fichier, { dossiers: [{ id: 'do_1', name: '6e B' }] });
    assert.equal(r.dossiersAAjouter.length, 1);
    assert.equal(r.dossiersAAjouter[0].id, 'do_2');
});

test('LE CLASSEMENT PAR CHAPITRE FUSIONNE CASE PAR CASE', () => {
    // Le professeur a classé « calc-add » dans deux chapitres ici ; son fichier
    // en connaît un autre. Les trois doivent se retrouver.
    const actuel = { classement: { 'calc-add': { ch1: true, ch2: true }, 'calc-mult': { ch5: true } } };
    const fichier = { kind: 'teacher_content', chapitres: { 'calc-add': { ch7: true } } };

    const r = fusionnerContenuProfesseur(fichier, actuel);
    assert.deepEqual(r.classement['calc-add'], { ch1: true, ch2: true, ch7: true },
        'une case que le fichier ne connaît pas doit rester : c\'est une soirée de relecture');
    assert.deepEqual(r.classement['calc-mult'], { ch5: true },
        'un exercice absent du fichier ne doit pas disparaître du classement');
    assert.equal(r.casesClassees, 1, 'une case apportée, une case comptée');
});

test('LE FICHIER L\'EMPORTE SUR UNE CASE QU\'IL CONNAÎT AUSSI', () => {
    // Plus récent dans l'intention : c'est celui que le professeur vient de
    // déposer. La règle est écrite dans le code, elle doit être gardée.
    const actuel = { classement: { 'calc-add': { ch1: true } } };
    const fichier = { kind: 'teacher_content', chapitres: { 'calc-add': { ch1: false } } };
    const r = fusionnerContenuProfesseur(fichier, actuel);
    assert.equal(r.classement['calc-add'].ch1, false);
});

test('UN FICHIER SANS CLASSEMENT LAISSE LE CLASSEMENT TRANQUILLE', () => {
    // Important : `casesClassees` à zéro est ce qui empêche `applyImport`
    // d'écrire. Un fichier de l'ancienne version, qui ne porte pas de
    // chapitres, ne doit pas réécrire le classement du poste.
    const actuel = { classement: { 'calc-add': { ch1: true } } };
    for (const fichier of [
        { kind: 'teacher_content' },
        { kind: 'teacher_content', chapitres: null },
        { kind: 'teacher_content', chapitres: 'oui' },
        { kind: 'teacher_content', chapitres: {} }
    ]) {
        const r = fusionnerContenuProfesseur(fichier, actuel);
        assert.equal(r.casesClassees, 0);
        assert.deepEqual(r.classement, { 'calc-add': { ch1: true } });
    }
});

test('UN ÉTAT VIDE N\'EST PAS UNE ERREUR', () => {
    // Premier import sur un poste neuf : c'est le cas le plus fréquent.
    const r = fusionnerContenuProfesseur({ kind: 'teacher_content', teacherPaths: [parcours('pa_1', 'A')] });
    assert.equal(r.parcoursAAjouter.length, 1);
    assert.deepEqual(r.dossiersAAjouter, []);
    assert.deepEqual(r.classement, {});
});

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRIRE LE FICHIER
// ─────────────────────────────────────────────────────────────────────────────

test('LE DRAPEAU « synced » NE VOYAGE PAS AVEC LA PROGRESSION', () => {
    // C'EST LE DÉFAUT LE PLUS SILENCIEUX DE CE FICHIER. `synced` dit « ce
    // poste-ci a déjà envoyé cet événement au serveur ». Sur l'appareil qui
    // reçoit le fichier, il voudrait dire « ne l'envoie jamais » : le travail
    // de l'élève n'arriverait pas au professeur, et rien ne le signalerait.
    const p = contenuAExporter({
        professeur: false,
        profile: { id: 'p_1', name: 'Léa' },
        events: [
            { id: 'ev_1', type: 'attempt', ts: QUAND, synced: true, payload: { correct: true } },
            { id: 'ev_2', type: 'attempt', ts: QUAND + 1, synced: false, payload: { correct: false } }
        ],
        quand: QUAND
    });

    assert.equal(p.events.length, 2, 'les deux événements partent');
    for (const e of p.events) {
        assert.ok(!('synced' in e), `« synced » ne doit pas sortir (${e.id})`);
    }
    // Tout le reste part, lui : le journal brut est ce qui rend tout
    // reconstructible.
    assert.equal(p.events[0].payload.correct, true);
    assert.equal(p.events[1].id, 'ev_2');
});

test('UN FICHIER PORTE DE QUOI SE RECONNAÎTRE, ET DE QUOI SE COMPRENDRE', () => {
    const eleve = contenuAExporter({ professeur: false, profile: { id: 'p_1', name: 'Léa' }, events: [], quand: QUAND });
    const prof = contenuAExporter({ professeur: true, teacherPaths: [parcours('pa_1', 'A')], chapitres: {}, quand: QUAND });

    // Pour la machine : `reconnaitreFichier` doit savoir relire ce qu'on écrit.
    // C'est l'aller-retour, et c'est la seule façon de garantir que l'export et
    // l'import ne divergeront pas.
    assert.equal(reconnaitreFichier(eleve), 'progression-eleve');
    assert.equal(reconnaitreFichier(prof), 'contenu-professeur');

    // Pour la personne qui ouvre le fichier dans un éditeur de texte.
    assert.match(eleve.aPropos, /AtoutMath/);
    assert.match(prof.aPropos, /AtoutMath/);

    assert.equal(eleve.format, 'atoutmath/v2');
    assert.equal(eleve.exportedAt, QUAND);
    assert.deepEqual(eleve.profile, { id: 'p_1', name: 'Léa' });
});

test('UN FICHIER DE PROFESSEUR N\'EMPORTE PAS LA PROGRESSION D\'UN ÉLÈVE', () => {
    // Rémy donne son fichier de parcours à un collègue. Il n'a pas à y mettre
    // le journal de ses élèves — c'est une donnée personnelle de mineur.
    const prof = contenuAExporter({
        professeur: true,
        profile: { id: 'p_1', name: 'Rémy' },
        events: [{ id: 'ev_1', type: 'attempt', payload: {} }],
        teacherPaths: [parcours('pa_1', 'A')],
        quand: QUAND
    });
    assert.ok(!('events' in prof), 'aucun événement d\'élève dans un fichier de parcours');
    assert.ok(!('profile' in prof), 'et pas davantage de profil nominatif');
});

test('LE NOM DU FICHIER SE LIT DANS UN DOSSIER DE TÉLÉCHARGEMENTS', () => {
    assert.equal(nomDuFichier(true, { name: 'Rémy' }), 'parcours_atoutmath.json');
    // Les accents et les espaces ne passent pas dans un nom de fichier sur
    // tous les systèmes : on les retire.
    assert.equal(nomDuFichier(false, { name: 'Léa Dupont' }), 'progression_lea_dupont.json');
    assert.equal(nomDuFichier(false, { name: '' }), 'progression_eleve.json');
    assert.equal(nomDuFichier(false, null), 'progression_eleve.json');
});

// ─────────────────────────────────────────────────────────────────────────────
// L'ANCIEN FORMAT
// ─────────────────────────────────────────────────────────────────────────────

test('UN FICHIER DE L\'ANCIENNE VERSION DONNE DES TENTATIVES FAUSSES ET UN BONUS', () => {
    const evts = evenementsDepuisAncienFormat({
        type: 'student_progress',
        score: 450,
        errorHistory: [
            { exoId: 'calc-add', exoTitle: 'Additions', timestamp: QUAND,
              questionData: { questionText: '7 + 8', input: '14', expected: 15 } },
            { exoId: 'calc-mult', timestamp: QUAND + 1000,
              questionData: { questionText: '7 × 8', input: '54', expected: 56 } }
        ]
    }, 'p_1', QUAND + 9999);

    const fausses = evts.filter(e => e.type === 'attempt');
    assert.equal(fausses.length, 2);
    assert.ok(fausses.every(e => e.payload.correct === false),
        'l\'ancien format ne gardait que les FAUTES : les rejouer justes effacerait l\'intérêt du carnet');
    assert.equal(fausses[0].payload.questionText, '7 + 8');
    assert.equal(fausses[0].payload.given, '14');
    assert.equal(fausses[0].ts, QUAND, 'la date de l\'époque est conservée');

    const bonus = evts.filter(e => e.type === 'bonus');
    assert.equal(bonus.length, 1);
    assert.equal(bonus[0].payload.points, 450);
    assert.equal(bonus[0].ts, QUAND + 9999, 'un bonus sans date prend celle du moment');

    // L'événement doit être attribuable, sinon la fusion ne sait pas à qui il est.
    assert.ok(evts.every(e => e.profileId === 'p_1' && e.id && e.deviceId === 'import'));
});

test('UN ANCIEN FICHIER VIDE NE FABRIQUE RIEN', () => {
    assert.deepEqual(evenementsDepuisAncienFormat({ type: 'student_progress' }, 'p_1'), []);
    assert.deepEqual(evenementsDepuisAncienFormat({ type: 'student_progress', score: 0 }, 'p_1'), []);
    assert.deepEqual(evenementsDepuisAncienFormat(null, 'p_1'), []);
});
