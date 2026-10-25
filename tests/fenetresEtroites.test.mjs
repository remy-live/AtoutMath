// LES FENÊTRES ÉTROITES SUR UN ÉCRAN D'ORDINATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture du panneau de réglages à l'appui :
//
//   « sur le réglages des exercices c'est écrasé d'ailleurs pourquoi sur ordi
//     la fenetre des réglages et si étroite et sur ordi, parfois certains
//     modales sont étroites, c'est dommage »
//
// DEUX DEMANDES, ET LA SECONDE EST LA PLUS IMPORTANTE. « parfois certains
// modales » : ce n'est pas le défaut d'un panneau, c'est une habitude. Elle
// était déjà venue une fois, sur « Mode & barème » — voir
// `tests/fenetreModeEtBareme.test.mjs`, qui garde CETTE fenêtre-là. Une épreuve
// par fenêtre est une épreuve qu'on oublie à la fenêtre suivante : celle-ci
// garde donc la RÈGLE.
//
// ── CE QUI A ÉTÉ MESURÉ (`tools/modalesEtroites.mjs`, fenêtre de 1440 px) ───
//
//   réglages d'un exercice   430 px (30 % de la fenêtre)
//   paramètres d'affichage   350 px de large, 874 px de HAUT — il remplissait
//                            l'écran par le bas faute de place sur les côtés,
//                            « Jamais confondu avec x » sur trois lignes
//
// Et toutes les variantes de panneau posaient une largeur SÈCHE — `400px`,
// `500px`, `800px` —, qui déborde d'un téléphone de 360 px et ne profite
// jamais d'un grand écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const COMPOSANTS = lireFeuille('css/components.css');
const MODULES = lireFeuille('css/modules.css');

test('AUCUN PANNEAU DE FENÊTRE N\'A DE LARGEUR SÈCHE', () => {
    // LA RÈGLE, ET ELLE TIENT EN UNE LIGNE : une largeur de panneau porte
    // TOUJOURS deux termes — ce qu'on veut, et ce que la vitre permet.
    //
    // ON LES CHERCHE DANS LA FEUILLE plutôt que de les énumérer ici : une
    // variante ajoutée demain sera mesurée sans qu'on y pense, et c'est tout
    // l'objet de cette épreuve.
    const variantes = [...COMPOSANTS.matchAll(/\.modal-panel[\w-]*\s*\{([^}]*)\}/g)];
    assert.ok(variantes.length >= 5,
        `seulement ${variantes.length} variantes trouvées : le motif ne les voit plus`);
    for (const [, corps] of variantes) {
        const w = valeurDe(corps, 'width');
        if (!w) continue;
        assert.match(w, /min\(/,
            `une largeur sèche est revenue : « width: ${w} »`);
        // LE SECOND TERME EST CELUI QUI RETIENT SUR UN PETIT ÉCRAN. Sans lui,
        // `min(400px, …)` ne vaudrait pas mieux que `400px`.
        assert.match(w, /100vw|vw\)/,
            `« width: ${w} » ne sait pas ce que la vitre permet`);
    }
});

test('LE PANNEAU DES RÉGLAGES D\'UN EXERCICE RESPIRE', () => {
    // 430 PX DANS 1440 : la borne venait d'un défaut REL — « un panneau de
    // 680 px pour trois réglages laissait une trentaine de centimètres de vide
    // entre chaque libellé et son champ ». Le remède était bon, l'outil était
    // le mauvais : on avait borné le PANNEAU alors que c'est la LIGNE qui
    // s'étirait. Le panneau, lui, porte aussi la frise des marches, l'aperçu
    // d'une question et l'éditeur de zones.
    const corps = corpsDeLaRegle(MODULES,
        'html:not(.volet-atelier) #student-config-modal .modal-panel-sm-left',
        { ou: 'css/modules.css' });
    const m = /min\((\d+)px,\s*(\d+)vw\)/.exec(valeurDe(corps, 'width') || '');
    assert.ok(m, 'la fenêtre des réglages n\'a plus de largeur à deux termes');
    assert.ok(Number(m[1]) >= 600,
        `${m[1]} px ne suffisent pas à la frise des marches et à son aperçu`);

    // ET LA LIGNE EST BORNÉE, elle. C'est la correction de l'ancien défaut,
    // posée au bon endroit cette fois — la même que pour « Mode & barème ».
    const ligne = corpsDeLaRegle(MODULES,
        '#student-config-modal .cfg-field:not(.cfg-field--wide):not(.cfg-field--long)',
        { ou: 'css/modules.css' });
    assert.ok(declare(ligne, 'max-width'),
        'le libellé et son champ doivent rester côte à côte');

    // ET LE VOLET DE L'ATELIER GAGNE — c'est le `html:not(.volet-atelier)` du
    // sélecteur ci-dessus, et `corpsDeLaRegle` JETTE s'il disparaît : la règle
    // cherchée porte son nom en entier. Un sélecteur d'IDENTIFIANT (1,1,0) bat
    // sans le vouloir la règle du volet (0,3,1), qui veut que la fenêtre
    // remplisse le cadre, et le panneau restait une colonne perdue au milieu
    // d'un cadre fait pour elle. La même précaution est écrite pour
    // `#path-policy-modal` ; elle manquait ici.
    //
    // ON NE REFUSE PAS TOUTE RÈGLE SANS GARDE sur ce panneau : les autres lui
    // posent une HAUTEUR — `max-height`, `overflow` —, et une feuille de
    // téléphone lui met même `width: 100% !important`, ce qui est juste. C'est
    // la largeur D'ORDINATEUR qui doit s'effacer devant le volet.
    assert.ok(MODULES.includes('html:not(.volet-atelier) #student-config-modal'),
        'la règle de largeur doit s\'effacer devant le volet de l\'atelier');
});

test('ET « COMMENT TU RÉPONDS » PREND LES DEUX COLONNES', () => {
    // RÉMY, la capture suivante : « pour quoi le comment tu réponds est encore
    // écrasé ». Élargir le panneau de 430 à 720 px ne l'avait pas dégagé.
    //
    // MESURÉ : au-delà de 700 px le contenu passe en DEUX colonnes, et le
    // sous-groupe vivait dans une seule — 315 px. La grille de ses deux cartes
    // de mode, `repeat(auto-fit, minmax(150px, 1fr))`, n'en recevait que 275 :
    // « L'exercice s'adapte » et « Je définis » se posaient l'une SOUS l'autre
    // au milieu d'un panneau deux fois trop large. Après : 656 px, et les deux
    // cartes ont la même ordonnée — elles sont côte à côte.
    //
    // ON LIT LA RÈGLE QUI EXISTE DÉJÀ pour ses voisins : trois blocs y sont
    // dispensés des colonnes parce qu'ils « regagnent en hauteur ce que la
    // colonne fait économiser ». Celui-ci était du lot et n'y figurait pas.
    const bloc = /@media \(min-width: 700px\) \{([\s\S]*?)\n\}/.exec(MODULES);
    assert.ok(bloc, 'la règle des deux colonnes a disparu de css/modules.css');
    const pleine = /#student-config-content \.cfg-field--wide,[\s\S]*?grid-column: 1 \/ -1;/
        .exec(bloc[1]);
    assert.ok(pleine, 'plus personne ne traverse les deux colonnes');
    assert.match(pleine[0], /#student-config-content \.cfg-sous-groupe,/,
        '« Comment tu réponds » reste enfermé dans une colonne');
});
