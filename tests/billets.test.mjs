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
import { csvDesBillets, nomDuFichierCsv, htmlDesBillets, reglageDeProjection, decouperEnBlocs }
    from '../js/ui/billets.js';

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

test('LA PAGE PORTE LES TROIS PRÉSENTATIONS, ET UNE SEULE PARAÎT', () => {
    const html = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    // LES TROIS VIVENT DANS LE MÊME DOCUMENT : on ne rouvre pas une fenêtre
    // pour changer de présentation, et l'aperçu d'impression montre donc ce
    // qu'on vient de choisir.
    for (const vue of ['billets', 'tableau', 'projection']) {
        assert.ok(html.includes(`class="${vue}"`), `la présentation « ${vue} » manque`);
        // ET CHACUNE SE CACHE QUAND CE N'EST PAS SON TOUR. Sans cette règle,
        // les trois s'impriment l'une sous l'autre et la feuille sort en
        // triple — un défaut qui n'apparaît qu'à l'imprimante.
        assert.ok(html.includes(`body:not([data-vue="${vue}"]) .${vue}`),
            `rien ne cache « ${vue} » quand une autre présentation est choisie`);
    }
    // LA VUE DE DÉPART EST DANS LE DOCUMENT. Si elle manquait, AUCUNE des
    // trois ne paraîtrait : les trois règles ci-dessus s'appliqueraient
    // toutes, et la page s'ouvrirait vide.
    assert.match(html, /<body data-vue="billets">/);
    // ET « À DÉCOUPER ET À DISTRIBUER » NE S'AFFICHE PAS AU-DESSUS D'UN
    // TABLEAU. Vu sur la photo, pas dans le code : un tableau ne se découpe
    // pas, et sa légende dit déjà ce qu'il faut savoir. Le titre suit de
    // même : la feuille qu'on garde sur son bureau s'appelle une liste.
    assert.ok(html.includes('body:not([data-vue="billets"]) .sous'));
    assert.ok(html.includes('body:not([data-vue="billets"]) .titre-billets'));
    assert.ok(html.includes('body:not([data-vue="tableau"]) .titre-tableau'));
    assert.match(html, /<h1 class="titre-billets">/);
    assert.match(html, /<h1 class="titre-tableau">6e B — identifiants et codes<\/h1>/);
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

test('ET L\'OUVREUR BRANCHE EXACTEMENT LES BOUTONS DE LA PAGE', () => {
    // Les deux moitiés vivent dans deux fichiers : un identifiant renommé
    // d'un côté et pas de l'autre donne un bouton muet, sans aucune erreur.
    const src = readFileSync(new URL('../js/ui/billets.js', import.meta.url), 'utf8');
    const apres = src.slice(src.indexOf('export function brancherLesBoutons'));
    for (const id of ['btn-imprimer', 'btn-csv']) {
        assert.ok(apres.includes(`'${id}'`), `brancherLesBoutons va chercher ${id}`);
    }
    // LES VUES NE S'ÉCRIVENT PLUS EN TOUTES LETTRES DES DEUX CÔTÉS : la page
    // pose des boutons « btn-vue-<nom> », l'ouvreur parcourt une liste de noms.
    // C'est plus court, et c'est surtout ce qui rend l'oubli POSSIBLE : une
    // quatrième présentation ajoutée d'un seul côté donne un bouton muet. On
    // compare donc les deux listes, et non l'existence de quatre chaînes.
    const html = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    const dansLaPage = [...html.matchAll(/id="btn-vue-([a-z]+)"/g)].map((m) => m[1]).sort();
    const liste = (apres.match(/const VUES = \[([^\]]+)\]/) || [])[1] || '';
    const dansLOuvreur = (liste.match(/'[a-z]+'/g) || []).map((s) => s.replace(/'/g, '')).sort();
    assert.ok(dansLaPage.length >= 3,
        `${dansLaPage.length} bouton(s) de présentation dans la page : l'épreuve ne mesure plus rien`);
    assert.deepEqual(dansLOuvreur, dansLaPage,
        'la page et l\'ouvreur ne nomment pas les mêmes présentations');
    // ET ON NE RÉVOQUE PAS L'URL DANS LE MÊME TOUR DE BOUCLE : le
    // téléchargement n'a pas commencé, et le fichier arrive vide.
    assert.match(apres, /setTimeout\(\(\) => f\.URL\.revokeObjectURL/,
        'l\'URL d\'objet se libère plus tard, pas tout de suite');
});

// ─── L'ÉCRAN À PROJETER ─────────────────────────────────────────────────────
//
// RÉMY : « afficher un tableau avec identifiant et code (on retrouve le nom
// prénom, donc c'est facile), qui s'affichent sur un seul écran que je peux
// projeter […] en mode paysage du coup (donc peut être 2 colonnes avec des
// couleurs pour pas confondre) ».
//
// CE QUE CES ÉPREUVES GARDENT, ET CE QU'ELLES NE PEUVENT PAS GARDER. Qu'un
// écran tienne VRAIMENT sur un écran — aucune ligne coupée en bas, aucun
// défilement, un texte lisible du fond de la salle — se mesure dans un
// navigateur, à la taille d'un vidéoprojecteur : c'est
// `tools/projectionDesCodes.mjs` qui le fait. Ici on garde le découpage, qui
// est du calcul pur, et les deux bornes de taille qui partent dans la page.

const fauxEleves = (n, long = 11) => Array.from({ length: n }, (_, i) => ({
    prenom: 'Élève ' + i, login: 'e'.repeat(long - 3) + '.' + String(i).padStart(2, '0'),
    code: 'AB12'
}));

test('ON ESSAIE DEUX COLONNES ET TROIS, ET L\'ON GARDE LA PLUS LISIBLE', () => {
    // CE QU'UN SEUIL ÉCRIT À LA MAIN FAISAIT, ET QUI ÉTAIT ABSURDE : avec
    // « trois blocs au-delà de trente », une classe de 31 s'affichait en 30 px
    // et une classe de 30 en 22 px — un élève de PLUS rendait l'écran plus
    // lisible. Mesuré au vidéoprojecteur (tools/projectionDesCodes.mjs).
    //
    // Un petit effectif reste sur deux colonnes : la hauteur ne manque pas, et
    // un troisième bloc ne ferait que rétrécir les colonnes.
    assert.equal(reglageDeProjection(fauxEleves(12)).blocs, 2);
    // Une classe pleine aux noms ordinaires : trois colonnes donnent dix
    // lignes au lieu de quinze, donc un texte bien plus grand.
    assert.equal(reglageDeProjection(fauxEleves(30)).blocs, 3);
    // LES MÊMES TRENTE, AVEC DES NOMS À RALLONGE : trois colonnes rétrécissent
    // chaque bloc au point que c'est la LARGEUR qui commande, et l'on retombe
    // à deux. Aucun seuil sur le nombre d'élèves ne sait faire cela.
    assert.equal(reglageDeProjection(fauxEleves(30, 31)).blocs, 2);

    // AUCUN ÉLÈVE NE TOMBE DU DÉCOUPAGE, et c'est la seule chose qui soit
    // vraiment grave ici : un élève absent de l'écran projeté ne se voit pas
    // — personne ne compte trente lignes du fond de la salle —, et il reste
    // simplement sans code au début de l'heure.
    for (const n of [1, 5, 12, 24, 30, 31, 36]) {
        const r = reglageDeProjection(fauxEleves(n));
        const blocs = decouperEnBlocs(fauxEleves(n), r.blocs);
        assert.equal(blocs.reduce((s, b) => s + b.length, 0), n, `${n} élèves, ${n} lignes`);
        assert.ok(blocs.length <= r.blocs, `${n} élèves : ${blocs.length} blocs pour ${r.blocs}`);
        assert.ok(blocs.every((b) => b.length <= r.lignes),
            `${n} élèves : un bloc déborde des ${r.lignes} lignes annoncées`);
    }
});

test('L\'ORDRE ALPHABÉTIQUE SE LIT DE HAUT EN BAS, PUIS À DROITE', () => {
    // Un découpage « une ligne sur deux » remplirait les colonnes de gauche à
    // droite, et l'on chercherait son nom en zigzag. Le premier bloc porte le
    // DÉBUT de la liste, en entier.
    const quatre = [{ login: 'a' }, { login: 'b' }, { login: 'c' }, { login: 'd' }];
    assert.deepEqual(decouperEnBlocs(quatre, 2).map((b) => b.map((e) => e.login)),
        [['a', 'b'], ['c', 'd']]);
});

test('LA TAILLE DU TEXTE A DEUX BORNES, UNE PAR AXE', () => {
    const vh = (n) => parseFloat(reglageDeProjection(fauxEleves(n)).taille);
    assert.ok(vh(12) > vh(30), 'douze élèves doivent s\'écrire plus grand que trente');

    // ET LE PLUS LONG IDENTIFIANT BORNE PAR LA LARGEUR. Sans cette seconde
    // borne, « de-la-tour-du-pin.jean-baptiste » sortirait du bloc ou finirait
    // en points de suspension : l'élève ne lirait pas son identifiant, qui est
    // tout ce qu'on lui demande de lire.
    const court = parseFloat(reglageDeProjection(fauxEleves(30, 8)).tailleLargeur);
    const longue = parseFloat(reglageDeProjection(fauxEleves(30, 31)).tailleLargeur);
    assert.ok(longue < court,
        `un identifiant plus long doit réduire la borne de largeur (${longue} vs ${court})`);

    // LES DEUX PARTENT DANS LA PAGE, CHACUNE DANS SON UNITÉ, et c'est le
    // navigateur qui prend la plus petite : lui seul connaît l'écran. Calculer
    // le minimum ici aurait demandé de deviner la proportion de l'écran de
    // Rémy, qui n'est pas celui du vidéoprojecteur de sa salle.
    const html = htmlDesBillets({ eleves: fauxEleves(30), nom: '6e B', origine: 'https://x.fr/' });
    assert.match(html, /--taille: [\d.]+vh/);
    assert.match(html, /--taille-l: [\d.]+vw/);
    assert.match(html, /font-size: min\(var\(--taille[^)]*\), var\(--taille-l[^)]*\)\)/);

    // ET LA PAGE NE PORTE PAS LES NOMS. Rémy : « on retrouve le nom prénom,
    // donc c'est facile » — l'identifiant est fabriqué à partir du nom, et
    // c'est une ligne de moins à projeter devant toute la classe.
    const avecNoms = htmlDesBillets({ eleves: TROIS, nom: '6e B', origine: 'https://x.fr/' });
    const projection = avecNoms.slice(avecNoms.indexOf('<div class="projection">'));
    assert.ok(!projection.includes('DUPONT Emma'),
        'l\'écran projeté affiche les identifiants, pas les noms');
    assert.ok(projection.includes('dupont.emma') && projection.includes('NWXS'),
        'l\'écran projeté porte bien les identifiants et les codes');
});
