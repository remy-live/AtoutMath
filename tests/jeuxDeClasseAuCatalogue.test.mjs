// LES QUATRE JEUX DE CLASSE, ENTRÉS AU CATALOGUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien avoir les jeux plateaux dispo/demo dans les derniers
// jeux ». Ce fichier garde les cinq décisions qui font que ça tient — et la
// seule qui se voit vraiment, le terrain posé DANS le cadre, se mesure dans un
// navigateur (`tools/jeuxDeClasseAuCatalogue.mjs`), pas ici.
//
// Chacune de ces épreuves a été vue tomber (`tools/epreuveTombe.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exercices, getExerciseById } from '../js/data/catalog.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';

const QUATRE = [
    ['calc-plateau-nombres', 'plateau-nombres'],
    ['num-chat-perche', 'chat-perche'],
    ['num-la-ruee', 'la-ruee'],
    ['num-pluie-nombres', 'pluie-nombres']
];

const ENVELOPPE = readFileSync('js/games/jeuxDeClasse.js', 'utf8');
const ACTIVITES = readFileSync('js/core/activities/index.js', 'utf8');
const PLATEAU_UI = readFileSync('js/ui/plateauUI.js', 'utf8');
const VIFS_UI = readFileSync('js/ui/jeuxVifsUI.js', 'utf8');
const CSS = readFileSync('css/modules.css', 'utf8');

test('LES QUATRE JEUX SONT AU CATALOGUE, AVEC LEUR CODE DICTÉ', () => {
    for (const [id, activite] of QUATRE) {
        const exo = getExerciseById(id);
        assert.ok(exo, `${id} manque au catalogue`);
        assert.equal(exo.activityId, activite, `${id} n'ouvre pas la bonne activité`);
        assert.match(CODES_EXERCICES[id] || '', /^[A-HJ-NP-Z]{2}$/,
            `${id} n'a pas de code dictable (ni I, ni O, ni Q)`);
        // LA DATE EST CE QUI LES FAIT APPARAÎTRE DANS « LES DERNIERS
        // EXERCICES » : la fenêtre se nourrit du catalogue et groupe par
        // journée de livraison. Sans `cree`, l'exercice existe et n'est JAMAIS
        // neuf — c'est exactement la demande qui tomberait, sans un mot.
        assert.match(exo.cree || '', /^\d{4}-\d{2}-\d{2}$/,
            `${id} n'a pas de date de création`);
    }
});

test('ET ILS NE SE NOTENT PAS', () => {
    // Une partie n'est pas une série de questions : on y marque des points en
    // RENCONTRANT quelqu'un sur un nombre, donc le score dépend d'autant de ses
    // coéquipiers que de soi.
    const bloc = ACTIVITES.slice(ACTIVITES.indexOf('const SANS_NOTE = ['),
        ACTIVITES.indexOf('SANS_NOTE.forEach'));
    for (const [, activite] of QUATRE) {
        assert.ok(bloc.includes(`'${activite}'`),
            `${activite} doit être déclarée sans note`);
    }
});

test('L\'ENVELOPPE NE RÉÉCRIT AUCUNE RÈGLE DE JEU', () => {
    // C'est tout l'intérêt de ce fichier-là : les quatre écrans existent et
    // sont éprouvés. Recopier la moindre règle en ferait une SECONDE VÉRITÉ,
    // qui finirait par ne plus dire la même chose que la première — ce dépôt a
    // payé cette leçon quatre fois en une semaine.
    assert.match(ENVELOPPE, /import \{ ouvrirLePlateau \} from '\.\.\/ui\/plateauUI\.js'/);
    assert.match(ENVELOPPE, /import \{ ouvrirUnJeuVif \} from '\.\.\/ui\/jeuxVifsUI\.js'/);
    for (const mot of ['quiPrend', 'prendLaCible', 'decompositions', 'obeit',
                       'tirerUneConsigne', 'pointsDeLaPrise']) {
        assert.ok(!ENVELOPPE.includes(mot),
            `l'enveloppe ne doit pas connaître « ${mot} » : c'est une règle du jeu`);
    }
});

test('ET ELLE TRADUIT « SUR QUOI ON JOUE » COMME LA BARRE DE PILOTAGE', () => {
    // Le professeur doit retrouver EXACTEMENT le même plateau selon qu'il
    // l'ouvre depuis le catalogue ou qu'il le lance à sa classe. Deux
    // traductions séparées finiraient par ne plus dire la même chose — c'est la
    // règle que ce dépôt applique partout où un réglage se lit à deux endroits.
    const pilote = readFileSync('js/ui/espaceClasses.js', 'utf8');
    const corps = (source, nom) => {
        const i = source.indexOf(`function ${nom}(choix) {`);
        assert.ok(i > 0, `${nom} introuvable`);
        return source.slice(i, source.indexOf('\n}', i))
            .replace(/^export /, '').replace(nom, 'X')
            .replace(/String\(choix \|\| ''\)/g, 'choix').replace(/String\(choix\)/g, 'choix');
    };
    assert.equal(corps(ENVELOPPE, 'filtreDuJeu'), corps(pilote, 'filtreDuPlateau'),
        'les deux traductions ont divergé');
});

test('UN JEU OUVERT DANS UN CADRE NE RECOUVRE PAS LE CADRE', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE SE MESURE EN CLASSE : ces quatre écrans
    // sont des VOILES PLEIN ÉCRAN, parce qu'une partie lancée à trente DOIT
    // prendre l'écran. Posés dans le cadre du meneur, ils recouvriraient son
    // entête et son bouton pour sortir — l'élève serait enfermé dans le jeu.
    assert.match(PLATEAU_UI, /pdn-voile\$\{o\.hote \? ' pdn-voile--cadre' : ''\}/);
    assert.match(VIFS_UI, /jv-voile\$\{o\.hote \? ' jv-voile--cadre' : ''\}/);
    assert.match(CSS, /\.pdn-voile--cadre,\s*\n\.jv-voile--cadre \{[^}]*position: static/);
    assert.match(CSS, /\.pdn-voile--cadre \.pdn-sortir,\s*\n\.jv-voile--cadre \.jv-sortir \{ display: none; \}/);
});

test('ET SON TERRAIN SE MESURE SUR LA CARTE, PAS SUR LA FENÊTRE', () => {
    // MESURÉ : la hauteur du terrain est écrite en `vh`, ce qui est juste en
    // plein écran. Dans le cadre il reste 790 px sur 900 — l'entête en mange
    // 90 — et la rangée du bas débordait de 20 px au plateau, de 44 px au chat
    // perché. C'est la manette et le clavier des nombres qui passaient sous le
    // bord : un jeu dont on ne voit plus les commandes n'est pas un jeu.
    assert.match(CSS, /\.pdn-voile--cadre, \.jv-voile--cadre \{ container-type: size; \}/);
    assert.match(CSS, /\.pdn-voile--cadre \.pdn-terrain \{\s*\n\s*height: min\(calc\(100cqh/);
    assert.match(CSS, /\.jv-voile--cadre \.jv-terrain \{\s*\n\s*height: min\(calc\(100cqh/);
});

test('LES QUATRE PORTENT LEURS RÉGLAGES, ET LE PREMIER EST CELUI QUI COMPTE', () => {
    // RÉMY, quand je lui ai demandé par quoi commencer : « Choisir ce qu'on
    // travaille ». C'est le réglage qui accorde le jeu à la séance ; sans lui,
    // un jeu vif enverrait une classe de sixième courir après des carrés
    // parfaits, et le plateau tirerait dans les huit tables mélangées.
    for (const [id] of QUATRE) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(Array.isArray(exo.paramSchema) && exo.paramSchema.length >= 4,
            `${id} doit porter ses réglages`);
        const premier = exo.paramSchema[0].key;
        assert.ok(['quoi', 'familles'].includes(premier),
            `${id} : le premier réglage doit être celui qui accorde le jeu à la séance, pas « ${premier} »`);
        // ET CHAQUE RÉGLAGE A UN DÉFAUT QUI EST DANS SES CHOIX : un défaut
        // absent de la liste rend un déroulant vide au premier affichage.
        for (const r of exo.paramSchema) {
            assert.ok(r.options.some(o => o.value === r.default),
                `${id} : le défaut de « ${r.key} » n'est pas dans ses choix`);
        }
    }
});
