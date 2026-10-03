// LES BILLETS D'UNE CLASSE : LE CSV, LE TABLEAU, ET LE BOUTON QUI VIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour imprimer les billets, tu pourrais aussi me proposer une
// présentation en tableau et ou export cvs ».
//
// CE QUE CES ÉPREUVES GARDENT, ET POURQUOI ELLES EXISTENT PLUTÔT QUE D'ÊTRE
// « VÉRIFIÉES À L'ŒIL ». Un CSV se regarde dans un tableur, c'est-à-dire chez
// Rémy et pas chez nous. Les trois choix qui décident s'il s'ouvre tout seul —
// le point-virgule, le BOM, le CRLF — sont invisibles dans un éditeur de texte
// et fatals dans Excel français. Et le prénom qui contient un point-virgule
// casse le fichier sans qu'aucune erreur paraisse : on ne le rencontrera
// jamais à la main, donc on l'écrit ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { csvDesBillets, nomDuFichierCsv, htmlDesBillets } from '../js/ui/billets.js';

const TROIS = [
    { prenom: 'DUPONT Emma', login: 'dupont.emma', code: 'NWXS' },
    { prenom: 'NGUYÊN Maëlle', login: 'nguyen.maelle', code: 'FB72' },
    { prenom: 'MARTIN Lucas', login: 'martin.lucas', code: 'VHRQ' }
];

test('LE CSV S\'OUVRE DANS UN TABLEUR FRANÇAIS', () => {
    const csv = csvDesBillets(TROIS, '6e B');

    // LE BOM. Sans lui, Excel suppose Windows-1252 et « NGUYÊN Maëlle »
    // devient « NGUYÃŠN MaÃ«lle ». Trois octets, et tout le fichier bascule.
    assert.ok(csv.startsWith('﻿'), 'le BOM ouvre le fichier');

    // LE POINT-VIRGULE. Excel en français lit la virgule comme séparateur
    // DÉCIMAL : un CSV à la virgule arrive sur une seule colonne.
    const lignes = csv.replace(/^﻿/, '').split('\r\n');
    assert.equal(lignes[0], 'Classe;Élève;Identifiant;Code');
    assert.equal(lignes[1], '6e B;DUPONT Emma;dupont.emma;NWXS');

    // LE CRLF, et une fin de ligne au bout du fichier.
    assert.ok(csv.endsWith('\r\n'), 'le fichier se termine par une fin de ligne');
    assert.ok(!/[^\r]\n/.test(csv), 'aucun saut de ligne qui ne soit précédé d\'un retour chariot');

    // Trois élèves, un en-tête, et la ligne vide de la fin.
    assert.equal(lignes.length, 5);
});

test('SANS NOM DE CLASSE, PAS DE COLONNE CLASSE', () => {
    // Un seul billet réimprimé n'a pas besoin de redire la classe à chaque
    // ligne ; et une colonne toujours vide fait croire à une donnée perdue.
    const l = csvDesBillets(TROIS).replace(/^﻿/, '').split('\r\n');
    assert.equal(l[0], 'Élève;Identifiant;Code');
    assert.equal(l[1], 'DUPONT Emma;dupont.emma;NWXS');
});

test('UN PRÉNOM AVEC UN POINT-VIRGULE NE CASSE PAS LE FICHIER', () => {
    // C'EST LE CAS QU'ON NE RENCONTRERA JAMAIS À LA MAIN, et celui qui décale
    // toutes les colonnes d'une ligne sans qu'aucune erreur paraisse. Une
    // liste collée depuis Pronote peut très bien contenir « DUPONT-MOREL;
    // Jean » dans une seule cellule.
    const csv = csvDesBillets([
        { prenom: 'DUPONT; Jean', login: 'dupont.jean', code: 'AB12' },
        { prenom: 'Elle a dit "oui"', login: 'x.y', code: 'CD34' }
    ]);
    const l = csv.replace(/^﻿/, '').split('\r\n');
    assert.equal(l[1], '"DUPONT; Jean";dupont.jean;AB12');
    // Un guillemet intérieur se DOUBLE — c'est la règle du format, et la
    // seule qui permette de le relire.
    assert.equal(l[2], '"Elle a dit ""oui""";x.y;CD34');
});

test('LE NOM DU FICHIER PASSE SUR N\'IMPORTE QUEL SYSTÈME', () => {
    assert.equal(nomDuFichierCsv('6e B'), 'billets-6e-b.csv');
    // Les accents partent : un nom de fichier accentué voyage mal d'un
    // système à l'autre, et c'est un fichier que Rémy va ranger et renvoyer.
    assert.equal(nomDuFichierCsv('5ᵉ A — Spé'), 'billets-5-a-spe.csv');
    // Et jamais de nom vide, ni de fichier qui commence par un tiret.
    assert.equal(nomDuFichierCsv(''), 'billets-classe.csv');
    assert.equal(nomDuFichierCsv('///'), 'billets-classe.csv');
});

test('LA PAGE PORTE LES DEUX PRÉSENTATIONS, ET UNE SEULE SORT DE L\'IMPRIMANTE', () => {
    const html = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    assert.match(html, /class="billets"/, 'les billets à découper');
    assert.match(html, /class="tableau"/, 'le tableau de la classe');
    // UNE CLASSE SUR body DÉCIDE, et les deux moitiés de la règle doivent
    // exister : sans la seconde, les deux présentations s'impriment l'une
    // sous l'autre et la feuille sort en double.
    assert.match(html, /body:not\(\.en-tableau\) \.tableau \{ display: none; \}/);
    assert.match(html, /body\.en-tableau \.billets \{ display: none; \}/);
    // ET « À DÉCOUPER ET À DISTRIBUER » NE S'AFFICHE PAS AU-DESSUS D'UN
    // TABLEAU. Vu sur la photo, pas dans le code : un tableau ne se découpe
    // pas, et sa légende dit déjà ce qu'il faut savoir.
    assert.match(html, /body\.en-tableau \.sous \{ display: none; \}/);
    // LE TITRE AUSSI SUIT LA PRÉSENTATION : la feuille qu'on garde sur son
    // bureau toute l'heure s'appelle une liste, pas des billets.
    assert.match(html, /<h1 class="titre-billets">/);
    assert.match(html, /<h1 class="titre-tableau">6e B — identifiants et codes<\/h1>/);
    assert.match(html, /body\.en-tableau \.titre-billets \{ display: none; \}/);
    assert.match(html, /body:not\(\.en-tableau\) \.titre-tableau \{ display: none; \}/);
});

test('ET LE BOUTON D\'IMPRESSION DIT QUE LE PDF EST POSSIBLE', () => {
    // Rémy : « on peut imprimer le tableau ou l'exporter en pdf ? ». Les deux
    // marchaient, et il a dû poser la question — « Enregistrer au format PDF »
    // est une destination CACHÉE dans la fenêtre d'impression du navigateur.
    // Une possibilité qu'il faut deviner n'est pas offerte.
    const html = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    assert.match(html, />Imprimer ou enregistrer en PDF</);
    // La barre de commandes ne s'imprime pas.
    assert.match(html, /@media print \{ \.rien \{ display: none; \} \}/);
    // L'en-tête du tableau revient en page 2 : une classe de trente ne tient
    // pas sur une feuille, et un tableau sans en-tête page 2 est illisible.
    assert.match(html, /thead \{ display: table-header-group; \}/);
});

test('AUCUN GESTIONNAIRE D\'ATTRIBUT DANS LA PAGE DES BILLETS', () => {
    // MESURÉ (tools/fenetresFilles.mjs, témoin sans en-tête à l'appui) : une
    // fenêtre ouverte par window.open('') HÉRITE de la CSP de son ouvreur, et
    // notre script-src n'a pas 'unsafe-inline'. Le onclick="window.print()"
    // qui vivait là était donc mort chez Rémy et vivant chez nous.
    const html = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    assert.doesNotMatch(html, /\son(?:click|change|input|load|submit)=/,
        'les boutons se branchent depuis l\'ouvreur, pas par un attribut');
    // Et les identifiants que l'ouvreur va chercher doivent être là.
    for (const id of ['btn-imprimer', 'btn-vue-billets', 'btn-vue-tableau', 'btn-csv']) {
        assert.ok(html.includes(`id="${id}"`), `le bouton ${id} existe dans la page`);
    }
});

test('ET L\'OUVREUR BRANCHE CES QUATRE BOUTONS-LÀ', () => {
    // Les deux moitiés vivent dans deux fichiers : un identifiant renommé
    // d'un côté et pas de l'autre donne un bouton muet, sans aucune erreur.
    const src = readFileSync(new URL('../js/ui/billets.js', import.meta.url), 'utf8');
    const apres = src.slice(src.indexOf('export function brancherLesBoutons'));
    for (const id of ['btn-imprimer', 'btn-vue-billets', 'btn-vue-tableau', 'btn-csv']) {
        assert.ok(apres.includes(`'${id}'`), `brancherLesBoutons va chercher ${id}`);
    }
    // ET ON NE RÉVOQUE PAS L'URL DANS LE MÊME TOUR DE BOUCLE : le
    // téléchargement n'a pas commencé, et le fichier arrive vide.
    assert.match(apres, /setTimeout\(\(\) => f\.URL\.revokeObjectURL/,
        'l\'URL d\'objet se libère plus tard, pas tout de suite');
});
