// UN ÉLÈVE BLOQUÉ DOIT POUVOIR LE DIRE, ET CE QU'IL DIT DOIT ÊTRE REPRODUCTIBLE.
//
// Rémy : « penses-tu qu'il serait possible d'ajouter un bouton désactivable ou
// non qui permet à l'élève d'envoyer un bug et de prendre une photo d'écran ? »
//
// LA RÉPONSE HONNÊTE TIENT EN DEUX MOITIÉS, et ces épreuves gardent les deux.
//
// LA PREMIÈRE : une vraie capture d'écran n'existe pas sur un iPhone. Safari
// sur iOS n'a pas `getDisplayMedia` ; une bibliothèque coûterait 180 ko pour un
// dessin approximatif ; le tour du SVG `foreignObject` ne charge aucune police
// extérieure, donc la capture montrerait un autre texte que l'écran — et je ne
// peux pas le mesurer sur l'appareil qui décide. L'élève, lui, SAIT prendre une
// photo de son écran. Ce que le logiciel ne sait pas faire, il sait le recevoir.
//
// LA SECONDE, ET C'EST ELLE QUI COMPTE : une image dit à quoi ressemblait
// l'écran, la GRAINE le rejoue. Le relevé de `js/core/ecran.js` porte
// l'exercice, la graine et les réglages ; avec eux, Rémy rouvre la question
// exacte chez lui et clique dedans. C'est pourquoi le contexte part toujours et
// la photo seulement parfois.
//
// CE QUE CES ÉPREUVES GARDENT, VU TOMBER une par une avec
// `tools/epreuveTombe.mjs` :
//
//   · le contexte porte la graine — sans elle, « ça bugue en calcul » n'est
//     pas reproductible, et ce qui n'est pas reproductible n'est pas corrigé ;
//   · il est BORNÉ — trente élèves, un champ qui vient d'un navigateur ;
//   · le bouton n'existe que si le professeur l'a allumé ET si l'élève est
//     rattaché : sans destinataire, il ne ferait rien ;
//   · aucune fenêtre native — Rémy : « tu utilises des alert et prompt, on
//     évite ! » ;
//   · le noyau n'importe pas d'interface, sans quoi toutes ces épreuves
//     tomberaient sur « document is not defined ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { contexteDuSignalement, CORPS_MAX, IMAGE_MAX } =
    await import('../js/core/signalement.js');

const SRC = readFileSync(new URL('../js/core/signalement.js', import.meta.url), 'utf8');
const UI = readFileSync(new URL('../js/ui/signalementUI.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const API = readFileSync(new URL('../api/index.php', import.meta.url), 'utf8');

test('LA GRAINE VOYAGE AVEC LE SIGNALEMENT', () => {
    const c = contexteDuSignalement({
        ecran: { exerciseId: 'calc-add', graine: 'ab12cd34', question: 'Combien font 7 + 8 ?' },
        theme: 'dark', largeur: 390, hauteur: 844, version: 'v874'
    });
    assert.equal(c.ecran.graine, 'ab12cd34',
        'sans la graine, le professeur ouvre le même exercice et PAS la même '
        + 'question : il conseille à côté en croyant voir son écran');
    assert.equal(c.ecran.exerciseId, 'calc-add');
    assert.equal(c.theme, 'dark',
        'la moitié des défauts d\'affichage n\'existent que dans un thème');
    assert.equal(c.largeur, 390,
        'et l\'autre moitié n\'existe qu\'en dessous de 768 px');
    assert.equal(c.version, 'v874',
        'la version RÉELLEMENT chargée : un élève dont le navigateur garde '
        + 'l\'ancienne signale un défaut qu\'on chercherait dans du code où il '
        + 'n\'est plus');
});

test('ET CE QUI VIENT DU NAVIGATEUR EST BORNÉ', () => {
    const c = contexteDuSignalement({
        theme: 'x'.repeat(200), url: 'u'.repeat(900), navigateur: 'n'.repeat(900),
        largeur: 390.7, hauteur: NaN,
        erreurs: ['une', 'deux', 'trois', 'quatre', 'e'.repeat(900)]
    });
    assert.ok(c.theme.length <= 20, 'le thème est borné');
    assert.ok(c.url.length <= 200, 'l\'adresse aussi');
    assert.ok(c.navigateur.length <= 200, 'et le nom du navigateur');
    assert.equal(c.largeur, 391, 'une largeur est un entier');
    assert.equal(c.hauteur, null, 'et ce qui n\'est pas un nombre ne le devient pas');
    // TROIS ERREURS, ET LES DERNIÈRES : c'est la plus récente qui a fait
    // appuyer sur le bouton. Un signalement n'est pas un journal de console —
    // celui-ci existe déjà, et Rémy sait l'ouvrir.
    assert.equal(c.erreurs.length, 3);
    assert.ok(c.erreurs.every(e => e.length <= 240));
});

test('SANS RIEN À DIRE, LE CONTEXTE NE MENT PAS', () => {
    const c = contexteDuSignalement({});
    assert.equal(c.ecran, null,
        'un élève qui signale depuis l\'accueil n\'a pas d\'exercice : le dire '
        + 'vaut mieux qu\'inventer');
    assert.equal(c.theme, 'clair');
    // PAS DE CHAMP `erreurs` VIDE : le professeur lit une carte, et une ligne
    // « erreurs : (aucune) » sous chaque signalement est du bruit qui pousse
    // ce qui compte hors de l'écran.
    assert.ok(!('erreurs' in c), 'on ne range pas une liste vide');
});

test('LES DEUX BORNES SONT LES MÊMES DES DEUX CÔTÉS', () => {
    // UNE BORNE ÉCRITE DEUX FOIS EST UNE BORNE QUI DIVERGERA. Celle du client
    // sert à prévenir l'élève AVANT qu'il envoie ; celle du serveur est la
    // seule qui compte, parce qu'elle est la seule qu'il ne peut pas
    // contourner. Elles doivent dire le même chiffre.
    assert.match(API, new RegExp(`const SIGNAL_CORPS_MAX\\s*=\\s*${CORPS_MAX};`),
        'le serveur coupe le récit au même endroit que le champ le compte');
    assert.match(API, new RegExp(`const SIGNAL_IMAGE_MAX\\s*=\\s*${IMAGE_MAX};`),
        'et il refuse la photo au poids que le client vise');
});

test('LE BOUTON N\'EXISTE QUE S\'IL A UN DESTINATAIRE', () => {
    assert.match(SRC, /export function peutSignaler\(\) \{\s*\n\s*return signalementOuvert\(\) && isActive\(\);/,
        'DEUX conditions : le réglage du professeur, ET le rattachement à une '
        + 'classe. Un AtoutMath ouvert sans classe — mode libre, clé USB, '
        + 'Atelier — n\'a personne à prévenir : le bouton y serait un bouton '
        + 'qui ne fait rien, ce qui est pire que pas de bouton');
    assert.match(HTML, /<button id="btn-signaler"[^>]*hidden/s,
        'il est caché dans la page : c\'est le réglage qui l\'allume, pas '
        + 'l\'inverse');
    assert.match(UI, /btn\.hidden = !peutSignaler\(\);/,
        'et la règle est lue à chaque ouverture d\'exercice, parce que le '
        + 'réglage arrive du serveur APRÈS le premier dessin de la page');
});

test('LE RÉGLAGE EST VÉRIFIÉ AU SERVEUR AUSSI', () => {
    // CACHER LE BOUTON EMPÊCHE D'APPUYER ; cela n'empêche personne d'appeler la
    // route à la main. Un réglage qui ne vit que dans l'interface n'est pas un
    // réglage, c'est une décoration.
    const i = API.indexOf('function handleSignalement');
    assert.ok(i > 0, 'la route de l\'élève doit exister');
    const bloc = API.slice(i, i + 900);
    assert.match(bloc, /lireReglage\('site\.signalement', '0'\) !== '1'/,
        'la route refuse tant que le professeur n\'a pas ouvert');
    assert.match(bloc, /fail\(403/, 'et elle le refuse pour de bon');
});

test('AUCUNE FENÊTRE NATIVE, ET AUCUNE BIBLIOTHÈQUE', () => {
    // Rémy : « tu utilises des alert et prompt, on évite ! »
    for (const interdit of ['alert(', 'confirm(', 'prompt(']) {
        assert.ok(!UI.includes(interdit) && !SRC.includes(interdit),
            `${interdit} n'a rien à faire ici : la fenêtre du dépôt existe`);
    }
    // ET PAS DE DÉPENDANCE : « on n'ajoute pas de dépendance sans une raison
    // qu'on peut écrire », et pour une capture APPROXIMATIVE la raison ne tient
    // pas. Les imports de ces deux fichiers sont tous des chemins relatifs.
    for (const src of [SRC, UI]) {
        for (const m of src.matchAll(/^import .* from '([^']+)';/gm)) {
            assert.ok(m[1].startsWith('.'),
                `« ${m[1]} » n'est pas un fichier de ce dépôt`);
        }
    }
});

test('LE NOYAU N\'IMPORTE PAS D\'INTERFACE', () => {
    // LE PIÈGE QUI FAIT TOMBER TOUS LES ESSAIS D'UN COUP. La capture de console
    // vit dans `js/ui/consoleLog.js` ; l'importer depuis le noyau ferait
    // s'exécuter un module d'interface sous Node, et chaque épreuve de ce
    // fichier tomberait sur « document is not defined » — sans que rien ne
    // désigne l'import fautif.
    for (const m of SRC.matchAll(/^import .* from '([^']+)';/gm)) {
        assert.ok(!m[1].includes('/ui/') && !m[1].includes('../ui'),
            `js/core/signalement.js importe « ${m[1]} » : le noyau ne connaît `
            + 'pas l\'interface. Les erreurs de console lui sont DONNÉES par '
            + 'l\'appelant, c\'est pour cela qu\'envoyerSignalement prend un '
            + 'paramètre « erreurs »');
    }
    assert.match(SRC, /export async function envoyerSignalement\(\{ corps, image = null, erreurs = \[\] \} = \{\}\)/,
        'et ce paramètre doit exister, sinon l\'appelant n\'a nulle part où '
        + 'les mettre');
});

// ─────────────────────────────────────────────────────────────────────────────
//
// L'ORDINATEUR EST LE CAS PRINCIPAL, ET IL AVAIT LE MODE D'EMPLOI DU TÉLÉPHONE.
//
// Rémy : « et sur l'ordinateur car globalement les élèves le feront sur ordi au
// collège ».
//
// UNE CAPTURE D'ÉCRAN WINDOWS NE CRÉE AUCUN FICHIER : Impr. écran copie dans le
// presse-papiers, et c'est tout. « Prends d'abord la photo, puis ajoute-la ici »
// envoyait donc l'élève chercher dans « Mes images » une image qui n'y est pas —
// une consigne qui ne peut pas être suivie, sur la machine où presque tous
// l'auront sous les yeux.

test('SUR UN ORDINATEUR, ON COLLE — ET LE COLLAGE EST ÉCOUTÉ', () => {
    // SUR TOUTE LA FENÊTRE, pas seulement sur la zone de texte : un élève qui
    // vient de capturer son écran appuie sur Ctrl+V sans se demander où était
    // le curseur.
    assert.match(UI, /el\.addEventListener\('paste', \(e\) => \{/,
        'le collage doit être écouté sur la fenêtre entière');
    // `files` ET `items` : Chrome livre l'image dans `files`, d'autres
    // navigateurs seulement dans `items`. Ne lire que l'un des deux, c'est
    // marcher sur un navigateur et pas sur le voisin — et l'on ne sait pas
    // lequel tourne sur les postes du collège.
    assert.match(UI, /\[\.\.\.\(d\.files \|\| \[\]\)\]\.find\(x => x\.type\.startsWith\('image\/'\)\)/,
        'l\'image collée se cherche dans les fichiers du presse-papiers');
    assert.match(UI, /\[\.\.\.\(d\.items \|\| \[\]\)\]\.filter\(x => x\.type\.startsWith\('image\/'\)\)/,
        'et dans ses éléments, pour les navigateurs qui ne remplissent que ceux-là');
});

test('ET LE MODE D\'EMPLOI DIT LE GESTE DE LA MACHINE QU\'ON A', () => {
    assert.match(UI, /function motsDeLAppareil\(\)/,
        'les mots doivent dépendre de l\'appareil');
    assert.match(UI, /matchMedia\('\(pointer: coarse\)'\)/,
        'on devine par le POINTEUR, comme la feuille de style pour ses cibles de '
        + '44 px : deux façons de deviner la même chose finiraient par se contredire');
    assert.match(UI, /Impr\. écran, puis colle ici avec Ctrl\+V/,
        'sur un ordinateur, la consigne nomme la touche et le raccourci');
    // DEUX MORCEAUX PLUTÔT QU'UN SEUL MOTIF : la phrase du Mac contient une
    // apostrophe échappée, et un `[^']*` entre les deux bouts s'y arrête — la
    // première version de ce contrôle tombait sur du code parfaitement juste.
    assert.match(UI, /Appuie sur ⌃⌘⇧4/,
        'sur un Mac, où la touche Impr. écran n\'existe pas, elle nomme le sien');
    assert.match(UI, /puis colle ici avec ⌘V/,
        'et le raccourci de collage du Mac, qui n\'est pas Ctrl+V');
    assert.match(UI, /boutons de ton appareil/,
        'au doigt, elle parle des boutons de l\'appareil');
});

test('UNE IMAGE LÂCHÉE SUR LA FENÊTRE NE FAIT PAS PARTIR L\'APPLICATION', () => {
    const i = UI.indexOf("depot.addEventListener('drop'");
    assert.ok(i > 0, 'le dépôt par glissement doit exister');
    const bloc = UI.slice(i, i + 500);
    // SANS `preventDefault`, LE NAVIGATEUR REMPLACE LA PAGE PAR L'IMAGE. L'élève
    // perdrait le texte qu'il vient d'écrire, au moment où il essaie de
    // l'illustrer — et il ne recommencerait pas.
    assert.match(bloc, /e\.preventDefault\(\); e\.stopPropagation\(\);/,
        'le dépôt doit être arrêté net');
    // `stopPropagation` N'EST PAS UNE PRÉCAUTION : le dépôt de fichiers du
    // logiciel écoute sur le DOCUMENT pour importer des parcours, et
    // répondrait qu'il ne sait pas quoi faire de cette capture d'écran.
    const doc = readFileSync(new URL('../js/ui/deposerFichier.js', import.meta.url), 'utf8');
    assert.match(doc, /doc\.addEventListener\('drop'/,
        'c\'est bien un écouteur de document qu\'il faut arrêter : si celui-ci '
        + 'disparaît un jour, ce test le dira');
    assert.match(UI, /\['dragenter', 'dragover'\]\.forEach\(nom => depot\.addEventListener\(nom, \(e\) => \{\s*\n\s*e\.preventDefault\(\);/,
        'et `dragover` doit l\'être aussi, sinon le navigateur refuse le dépôt');
});

test('LES TROIS PORTES MÈNENT AU MÊME TRAITEMENT', () => {
    // TROIS COPIES DE CE TRAITEMENT SERAIENT TROIS OCCASIONS DE N'EN CORRIGER
    // QUE DEUX. Le rétrécissement, le message d'échec, la vignette, le mot du
    // bouton : tout cela n'a aucune raison de différer selon qu'on a choisi,
    // collé ou glissé.
    assert.match(UI, /async function prendreLaPhoto\(fichier\)/,
        'une seule route pour les trois portes');
    for (const porte of [
        /champ\.addEventListener\('change', \(\) => prendreLaPhoto\(/,
        /e\.preventDefault\(\);\s*\n\s*prendreLaPhoto\(image\);/,
        /if \(image\) prendreLaPhoto\(image\);/
    ]) assert.match(UI, porte, 'cette porte doit passer par la route commune');
});

test('CTRL+ENTRÉE ENVOIE, ENTRÉE SEULE PASSE À LA LIGNE', () => {
    // PAS ENTRÉE TOUTE SEULE : le champ est multiligne, et un élève qui décrit
    // une panne passe à la ligne. Envoyer à la première touche Entrée, ce
    // serait couper son message à sa première phrase.
    assert.match(UI, /if \(e\.key === 'Enter' && \(e\.ctrlKey \|\| e\.metaKey\) && !envoyer\.disabled\)/,
        'le raccourci demande Ctrl (ou ⌘ sur un Mac) EN PLUS d\'Entrée');
});

test('LA PHOTO NE VOYAGE PAS AVEC LA LISTE DU PROFESSEUR', () => {
    // QUATRE CENTS KILO-OCTETS PAR SIGNALEMENT, vingt signalements : huit
    // mégaoctets pour un écran qui en ouvrira peut-être une. Sur le wifi d'un
    // collège, la liste serait illisible avant d'être lisible.
    const i = API.indexOf('function handleTeacherSignalements');
    assert.ok(i > 0);
    const bloc = API.slice(i, i + 3000);
    assert.match(bloc, /CASE WHEN s\.image IS NULL THEN 0 ELSE 1 END AS aPhoto/,
        'la liste dit SI la photo existe');
    assert.match(bloc, /\$action === 'photo'/,
        'et une action séparée la sert à la demande');
    assert.match(bloc, /JOIN classes c ON c\.id = s\.class_id AND c\.teacher_id = \?/,
        'l\'appartenance se vérifie DANS la requête : le signalement d\'un '
        + 'autre professeur n\'existe pas pour celui-ci, même s\'il en donne '
        + 'l\'identifiant exact');
});
