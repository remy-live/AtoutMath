// LES CASES À COCHER D'UNE FICHE REMPLISSABLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui, sur une fiche remplissable d'« Éléments de
// géométrie » :
//
//   « quand je clique sur un champ checkbox, les autres se remplissent de
//     caractères spéciaux »
//
// Une coche dans un carré pointillé, une coche dans un carré gris, une étoile
// à six branches, et un carré plein de petits cercles. Un seul clic, quatre
// dessins différents.
//
// ── CE QUE LES OCTETS DU PDF DISAIENT ──────────────────────────────────────
//
//   /FT /Btn /T (choix_g0) /V /On /AS /Off /MK << /CA (U) >>
//   /FT /Btn /T (choix_g0) /V /On /AS /Off /MK << /CA (F) >>
//   /FT /Btn /T (choix_g0) /V /On /AS /Off /MK << /CA (T) >>
//   /FT /Btn /T (choix_g0) /V /On /AS /Off /MK << /CA (Z) >>
//
// TROIS DÉFAUTS DANS UNE LIGNE DE CODE, et chacun suffisait :
//
//   MÊME `/T` ET MÊME ÉTAT « ON ». Ce ne sont pas quatre cases, c'est UNE case
//   à quatre apparences. La cocher les coche toutes.
//
//   `/CA (U)`, `(F)`, `(T)`, `(Z)`. Le `caption` de jsPDF n'est pas une valeur
//   d'export, c'est un GLYPHE de ZapfDingbats — la police des cases à cocher.
//   On y passait la première lettre de la proposition. Les « caractères
//   spéciaux » de sa phrase, c'est nous qui les écrivions.
//
//   `/V /On`. `AcroFormCheckBox` naît avec `value = 'On'` ; poser
//   `appearanceState = 'Off'` ne touche que `/AS`. Chaque case arrivait donc
//   DÉCLARÉE cochée, et le premier clic ne faisait que remettre l'apparence
//   d'accord avec la valeur. C'est pourquoi tout paraissait d'un coup.
//
// ── CE QU'ON MESURE ICI, ET POURQUOI PAS LE PDF ────────────────────────────
//
// jsPDF ne se charge pas hors navigateur : la vérification sur les octets se
// fait à la main (`tools/tmp/sonde-coche9.mjs` ouvre la fiche dans le
// visionneur de Chromium et clique dedans). Ce qu'on garde ici est la
// STRUCTURE que le crayon demande — un champ par question, une option par
// proposition, chacune son état —, parce que c'est elle, et elle seule, qui
// décide si les cases s'excluent.
//
// MESURÉ DANS UN VRAI LECTEUR, après : clic sur la première proposition, puis
// sur la quatrième de la MÊME question — seule la quatrième porte sa croix,
// la première est redevenue vide. Clic sur la question voisine — elle se
// coche sans toucher la première. Rien n'est coché à l'ouverture, et aucun
// dingbat nulle part.

import test from 'node:test';
import assert from 'node:assert/strict';
import { poserUnDocumentDeSecours } from '../tools/fauxPdf.mjs';

poserUnDocumentDeSecours();
const { crayonDeChamps } = await import('../js/ui/ficheRendu.js');

/**
 * LE STRICT NÉCESSAIRE DE L'API ACROFORM DE jsPDF, qui note ce qu'on lui
 * demande.
 *
 * On ne copie pas le comportement de jsPDF, on copie sa FORME : un bouton
 * radio qui fabrique ses options, et une apparence qui sait dire son glyphe.
 * Ce qu'on veut lire, ce sont les demandes du crayon.
 */
function faussesClassesAcro() {
    const vu = { champs: [], options: [], allures: [] };
    class Radio {
        constructor() { this.radio = true; this.FT = '/Btn'; this.Kids = []; }
        createOption(nom) {
            // Le `caption` d'une option naît sur la PASTILLE — c'est le défaut
            // par défaut, et il faut le voir changer.
            const option = { optionName: nom, Parent: this, caption: 'l',
                appearanceState: 'Off' };
            this.Kids.push(option);
            vu.options.push(option);
            return option;
        }
        setAppearance(allure) {
            vu.allures.push(allure);
            this.Kids.forEach(k => { k.caption = allure.getCA(); });
        }
    }
    const Allure = {
        RadioButton: {
            Circle: { getCA: () => 'l', createAppearanceStream: () => ({}) },
            Cross: { getCA: () => '8', createAppearanceStream: () => ({}) }
        }
    };
    const pdf = {
        AcroFormRadioButton: Radio,
        AcroFormAppearance: Allure,
        addField: (c) => { vu.champs.push(c); }
    };
    return { vu, pdf };
}

/** Un crayon, quatre propositions — une question de QCM, comme sur la fiche. */
function uneQuestion(pdf, nom = 'choix_g0', combien = 4) {
    const champ = crayonDeChamps(pdf, nom);
    for (let i = 0; i < combien; i++) champ.coche(10 + i * 20, 40, 3.5);
    return champ;
}

test('UNE QUESTION, UN SEUL CHAMP — ET CHAQUE PROPOSITION SON PROPRE ÉTAT', () => {
    // LE DÉFAUT DE RÉMY, DANS SA FORME MESURABLE. Quatre widgets du même nom
    // et du même état « on » ne sont pas quatre cases : ils sont les quatre
    // visages d'une seule, et cocher l'un les coche tous.
    const { vu, pdf } = faussesClassesAcro();
    uneQuestion(pdf);
    assert.equal(vu.champs.length, 1,
        `${vu.champs.length} champs pour une seule question : les propositions `
        + 'ne s\'excluront pas');
    assert.ok(vu.champs[0].radio,
        'le champ n\'est pas un bouton radio : un QCM où l\'on coche les quatre '
        + 'réponses n\'est pas un QCM');
    assert.equal(vu.options.length, 4, `${vu.options.length} propositions pour 4`);
    const etats = new Set(vu.options.map(o => o.optionName));
    assert.equal(etats.size, 4,
        `${etats.size} état(s) d'apparence pour 4 propositions — `
        + `[${[...etats].join(', ')}] : cocher l'une cochera les autres`);
    // Et chacune est posée à SA place : un rectangle recopié mettrait les
    // quatre cases l'une sur l'autre, ce qui se verrait au même endroit.
    const places = new Set(vu.options.map(o => JSON.stringify(o.Rect)));
    assert.equal(places.size, 4, 'deux propositions partagent le même rectangle');
});

test('RIEN N\'EST COCHÉ À L\'OUVERTURE, ET LA MARQUE EST UNE CROIX', () => {
    // RIEN DE COCHÉ : c'est la moitié de ce que Rémy a vu. Une case qui arrive
    // déclarée cochée se révèle au premier clic, et l'on croit que c'est le
    // clic qui l'a faite.
    const { vu, pdf } = faussesClassesAcro();
    uneQuestion(pdf);
    vu.options.forEach((o, i) => assert.equal(o.appearanceState, 'Off',
        `la proposition ${i + 1} arrive dans l'état « ${o.appearanceState} »`));

    // LA CROIX PLUTÔT QUE LA PASTILLE. Le carré est DESSINÉ autour — une fiche
    // remplissable s'imprime aussi —, et une pastille dans un carré ne
    // ressemble à rien de ce qu'un élève fait à la main.
    assert.ok(vu.allures.length, 'aucune apparence posée : ce sera la pastille');
    vu.options.forEach((o, i) => assert.equal(o.caption, '8',
        `la proposition ${i + 1} se dessine « ${o.caption} » et non une croix`));
});

test('DEUX QUESTIONS NE PARTAGENT JAMAIS LEUR CHAMP', () => {
    // L'AUTRE MOITIÉ DE L'EXCLUSIVITÉ, et un piège que ce dépôt a déjà payé
    // sur les cases de saisie : deux champs homonymes n'en font qu'UN pour un
    // lecteur PDF — l'élève tapait dans une case du premier sudoku et voyait
    // son chiffre paraître dans le second. Les appelants numérotent leurs
    // groupes par BLOC de la feuille ; sur un poly de plusieurs pages, deux
    // blocs de rang 0 portaient alors le même nom.
    const { vu, pdf } = faussesClassesAcro();
    uneQuestion(pdf, 'choix_g0');
    uneQuestion(pdf, 'choix_g0');
    assert.equal(vu.champs.length, 2, 'les deux questions n\'ont pas deux champs');
    assert.notEqual(vu.champs[0].fieldName, vu.champs[1].fieldName,
        `deux questions nommées « ${vu.champs[0].fieldName} » : cocher dans l'une `
        + 'cochera dans l\'autre');
    // Et chacune garde SES options : quatre d'un côté, quatre de l'autre.
    assert.equal(vu.champs[0].Kids.length, 4);
    assert.equal(vu.champs[1].Kids.length, 4);
});

test('UN RENDU SANS QCM NE POSE AUCUN CHAMP DE CASES', () => {
    // Quarante rendus sur quarante-deux n'ont pas de QCM. Un groupe fabriqué
    // d'avance laisserait, dans chacun de leurs PDF, un champ sans aucune case
    // — invisible, et pourtant présent dans la liste des champs du lecteur.
    const { vu, pdf } = faussesClassesAcro();
    const champ = crayonDeChamps(pdf, 'choix_g7');
    assert.equal(typeof champ.coche, 'function');
    assert.equal(vu.champs.length, 0,
        'un champ de cases a été posé alors que personne n\'a coché');
});
