// LA VISITE GUIDÉE — ce qui la rend montrable, et qui se perd sans bruit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « un mode qui montre et explique les possibilités », puis, devant la
// maquette : « Ça ouvre le VRAI écran ».
//
// CE QU'UNE ÉPREUVE PEUT GARDER ICI, ET CE QU'ELLE NE PEUT PAS. Qu'un écran
// s'ouvre pour de bon ne se vérifie qu'au navigateur — c'est le travail de
// `tools/visiteAuDoigt.mjs`, qui parcourt les six étapes. Ce qui se garde
// sans navigateur, c'est la MATIÈRE : un exercice disparu du catalogue, une
// compétence qui n'existe plus, un parcours qui cesse de tenir en un code
// qu'on dicte. Trois choses qui ne cassent rien, qui ne lèvent aucune erreur,
// et qui font dire au logiciel le contraire de ce que la visite annonce.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import {
    ETAPES_DE_LA_SEANCE, NOM_DE_LA_SEANCE, TRAVAIL_DE_LA_VISITE,
    parcoursDeLaVisite, tentativesDeLaVisite
} from '../js/core/visite.js';

const trouver = (id) => exercices.find(e => e.id === id);

test('LA SÉANCE DE LA VISITE NE CITE QUE DES EXERCICES QUI EXISTENT', () => {
    for (const e of ETAPES_DE_LA_SEANCE) {
        assert.ok(trouver(e.exerciseId),
            `${e.exerciseId} n'est plus au catalogue : la visite ouvrirait un `
                + 'atelier avec une étape morte');
    }
    assert.ok(ETAPES_DE_LA_SEANCE.length >= 3,
        'moins de trois étapes : l\'atelier n\'a plus rien à montrer');
});

test('ET TROIS D\'ENTRE ELLES AU MOINS S\'IMPRIMENT', () => {
    // L'ÉTAPE 2 DE LA VISITE EST LA FICHE. Si la séance ne s'imprimait pas,
    // cette étape-là ouvrirait une feuille vide — et c'est précisément ce
    // qu'un collègue vient vérifier, puisque c'est la question que Rémy
    // entend le plus souvent.
    const papier = ETAPES_DE_LA_SEANCE
        .map(e => trouver(e.exerciseId))
        .filter(e => e && e.printable);
    assert.ok(papier.length >= 3,
        `seulement ${papier.length} exercice(s) imprimable(s) dans la séance de `
            + 'la visite : la fiche n\'aurait presque rien à montrer');
});

test('ET LA SÉANCE TIENT EN UN CODE QU\'ON DICTE À VOIX HAUTE', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE A ÉTÉ VU DE SES PROPRES YEUX.
    //
    // La séance était en mode apprentissage, avec des seuils choisis. L'étape
    // du code affichait alors, en gros : « PAS DE CODE À DICTER — ce parcours
    // ne tient pas en quelques lettres », juste au-dessous d'une bande qui
    // promettait « des lettres à dire à voix haute ». Rien n'était cassé ;
    // la démonstration se contredisait, ce qui est pire.
    //
    // Et cela peut revenir par la petite porte : il suffit d'ajouter un
    // message, un coefficient, un chronomètre ou un jeu de récompense à la
    // séance de démonstration pour que le code redevienne long.
    const raisons = Shortcodes.raisonsDuCodeLong(parcoursDeLaVisite());
    assert.deepEqual(raisons, [],
        'la séance de la visite ne se dicte plus : ' + raisons.join(' | '));
    const code = Shortcodes.encodePath(parcoursDeLaVisite());
    assert.ok(code && code.length > 0 && code.length < 60,
        `le code dicté est inutilisable : « ${code} »`);
});

test('ET ELLE PORTE UN NOM QU\'UN PROFESSEUR AURAIT ÉCRIT', () => {
    // « Nouveau parcours » OU « Parcours de démonstration » DIRAIENT AU
    // VISITEUR QU'IL REGARDE UNE MAQUETTE. La séance porte le nom d'une vraie
    // heure de cours, et l'atelier comme la fiche et le code l'affichent.
    assert.ok(NOM_DE_LA_SEANCE.length > 12, 'le nom de la séance est trop court');
    assert.ok(!/nouveau parcours|d[ée]mo|test/i.test(NOM_DE_LA_SEANCE),
        `« ${NOM_DE_LA_SEANCE} » a l'air d'un nom de brouillon`);
    assert.equal(parcoursDeLaVisite().name, NOM_DE_LA_SEANCE);
});

test('LES COMPÉTENCES DU JOURNAL DE LA VISITE EXISTENT AU RÉFÉRENTIEL', () => {
    // UNE COMPÉTENCE INVENTÉE NE LÈVE AUCUNE ERREUR : le bilan affiche une
    // ligne SANS NOM, ce qui ressemble à un défaut du logiciel parce que c'en
    // est un. C'est arrivé en écrivant ce fichier — `frac.lire` est un nom de
    // générateur, la compétence s'appelle `num.frac.sens`.
    for (const t of TRAVAIL_DE_LA_VISITE) {
        assert.ok(SKILLS[t.skillId],
            `${t.skillId} n'est pas au référentiel : le bilan de la visite `
                + 'montrerait une ligne sans nom');
    }
});

test('ET LE JOURNAL DE LA VISITE EST ÉTALÉ DANS LE TEMPS', () => {
    // « PAR COMPÉTENCE ET DANS LE TEMPS » est ce que la visite annonce. Toutes
    // les tentatives écrites à la même seconde donneraient un point, et
    // l'écran dirait « pas assez de données » sur un journal bien rempli.
    const evts = tentativesDeLaVisite(1762000000000);
    assert.ok(evts.length > 20, `seulement ${evts.length} tentatives`);
    const jours = new Set(evts.map(e => Math.floor(e.ts / 86400000)));
    assert.ok(jours.size >= 2,
        `tout le journal tombe sur ${jours.size} jour(s)`);

    // DEUX APPELS DU MÊME INSTANT DONNENT LE MÊME JOURNAL. `journal.merge`
    // écarte ce qu'il connaît déjà par l'identifiant : s'il était tiré au
    // hasard, rouvrir la visite doublerait ses tentatives, et le bilan
    // compterait deux fois le même élève.
    const bis = tentativesDeLaVisite(1762000000000);
    assert.deepEqual(evts.map(e => e.id), bis.map(e => e.id));
    assert.equal(new Set(evts.map(e => e.id)).size, evts.length,
        'deux tentatives portent le même identifiant');

    // ET IL Y A DES RÉUSSITES ET DES ÉCHECS. Un bilan tout vert ne montre pas
    // à quoi sert un bilan ; un bilan tout rouge non plus.
    const justes = evts.filter(e => e.payload.correct).length;
    assert.ok(justes > 0 && justes < evts.length,
        'le journal de la visite ne porte que des réussites ou que des échecs');
    for (const e of evts.filter(x => !x.payload.correct)) {
        assert.ok(e.payload.misconception,
            'une erreur sans méprise nommée : c\'est pourtant ce que la visite '
                + 'promet de montrer');
    }
});
