// ON RÈGLE LA FEUILLE SUR LA FEUILLE.
//
// Rémy : « on pourrait améliorer cela en passant par l'apercu plutôt que des
// options j'ai l'impression que pour la fiche de parcours on fait des
// doublons ».
//
// Le doublon n'était pas entre deux panneaux : il était entre le panneau et la
// FEUILLE. Ces tests gardent les deux bouts de la correction — l'aperçu porte
// bien les prises qu'il faut pour qu'on puisse toucher ce qu'on voit, et le
// PDF, lui, n'en sait rien : il ne doit jamais imprimer un placeholder ni un
// fantôme.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import {
    apercuEntete, CHAMPS_ENTETE, CHAMPS_DEFAUT, TITRE_Y, IDENTITE_Y, filetY
} from '../js/ui/ficheRendu.js';
import { garnirFicheDirecte } from '../js/ui/ficheDirecte.js';

const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
const K = 2.4;
const fsLire = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('chaque champ d\'identité se nomme, pour qu\'on puisse le cliquer', () => {
    const html = apercuEntete(K, 'Contrôle', '', null, PAGE, { champs: ['nom', 'classe'] });
    assert.match(html, /data-fiche="champ"\s+data-champ="nom"/);
    assert.match(html, /data-fiche="champ"\s+data-champ="classe"/);
    assert.doesNotMatch(html, /data-champ="date"/, 'un champ non demandé ne se dessine pas');
    assert.doesNotMatch(html, /data-champ="prenom"/);
});

test('le titre porte sa prise, et sa place quand il est vide', () => {
    const ecrit = apercuEntete(K, 'Interro n°7', '', null, PAGE);
    assert.match(ecrit, /data-fiche="titre"/);
    assert.match(ecrit, /Interro n°7/);
    assert.doesNotMatch(ecrit, /fp-entete--vide/);

    // UN TITRE VIDE GARDE SA LIGNE, en gris : c'est la seule façon de savoir
    // qu'on peut en écrire un. Le CSS ne le montre que là où quelqu'un écoute,
    // et le PDF ne le connaît pas — il a son propre chemin.
    const vide = apercuEntete(K, '', '', null, PAGE);
    assert.match(vide, /fp-entete--vide/);
    assert.match(vide, /Titre de la feuille/);
});

test('la ligne d\'identité existe toujours : c\'est là que se posent les fantômes', () => {
    // Même sans aucun champ — sinon on n'aurait nulle part où proposer de les
    // remettre, et le réglage deviendrait irréversible.
    const html = apercuEntete(K, 'X', '', null, PAGE, { champs: [] });
    assert.match(html, /data-fiche="identite"/);
    assert.match(html, /fp-identite--vide/, 'sans champ, le filet remonte : la ligne suit');
});

test('les deux cases du cartouche se nomment séparément', () => {
    const html = apercuEntete(K, 'X', '', { note: true, commentaire: true, sur: 15 }, PAGE);
    assert.match(html, /data-fiche="cartouche"\s+data-case="note"/);
    assert.match(html, /data-fiche="cartouche"\s+data-case="commentaire"/);
    assert.match(html, /… \/ 15/, 'la note sur combien vient du parcours');

    const seule = apercuEntete(K, 'X', '', { note: true, commentaire: false, sur: 20 }, PAGE);
    assert.match(seule, /data-case="note"/);
    assert.doesNotMatch(seule, /data-case="commentaire"/);
});

test('un titre reste échappé : on l\'écrit à la main sur la feuille', () => {
    const html = apercuEntete(K, '<script>alert(1)</script>', '', null, PAGE);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
});

test('les champs par défaut sont ceux qu\'on met sur une feuille de classe', () => {
    assert.deepEqual(CHAMPS_DEFAUT, ['nom', 'date']);
    assert.deepEqual(Object.keys(CHAMPS_ENTETE), ['nom', 'prenom', 'classe', 'date']);
    // Sans réglage, la feuille porte les deux : c'est ce qu'on écrit en haut
    // d'une copie depuis toujours.
    const html = apercuEntete(K, 'X', '', null, PAGE);
    assert.match(html, /data-champ="nom"/);
    assert.match(html, /data-champ="date"/);
});

test('LES SEPT COMMANDES ONT BIEN QUITTÉ LE PANNEAU DU PARCOURS', () => {
    // Le titre, les quatre champs d'identité, la case note et la case
    // commentaire se règlent sur la feuille. Les retrouver ici voudrait dire
    // qu'on a remis le doublon.
    const src = fsLire('../js/ui/printParcours.js');
    ['pp-titre', 'pp-c-nom', 'pp-c-prenom', 'pp-c-classe', 'pp-c-date', 'pp-c-note', 'pp-c-com']
        .forEach(id => assert.doesNotMatch(src, new RegExp(`id="${id}"`),
            `« ${id} » est revenu dans le panneau`));
    // Et ce qui reste, ce sont bien les choses qu'on ne peut PAS cliquer,
    // parce qu'elles ne sont pas dessinées sur la feuille.
    ['pp-orientation', 'pp-couleur', 'pp-champs', 'pp-sol-ou'].forEach(id =>
        assert.match(src, new RegExp(`id="${id}"`), `« ${id} » a disparu par erreur`));
    assert.match(src, /brancherFicheDirecte/);
});

test('LE PARCOURS DICTE SES RÉGLAGES À SA FICHE', () => {
    // L'autre doublon, et le plus coûteux : le professeur réglait son parcours
    // en « Évaluation », noté sur 20, et la fiche rouvrait le débat avec ses
    // propres défauts — un contrôle s'imprimait en fiche d'entraînement à
    // moins d'y repenser.
    const src = fsLire('../js/ui/printParcours.js');
    assert.match(src, /resolvePolicy\(chemin\.policy\)/);
    assert.match(src, /interro\.checked = politique\.mode === MODES\.EVALUATION/);
    assert.match(src, /politique\.grading\.scale/);
});



// --- L'espace en haut de la feuille ---------------------------------------------

test('LE TITRE ET LA LIGNE D\'IDENTITÉ NE SE TOUCHENT PAS', () => {
    // Rémy : « il faudrait qu'il y ait de l'espace entre le titre et le
    // dessous ». Le titre fait 4,8 mm de corps ; ses jambages descendent donc
    // à peu près un millimètre sous sa ligne de base. Il faut ce millimètre,
    // plus de quoi respirer, avant que les « Nom : » ne commencent — sans quoi
    // les deux lignes se touchent, et le liseré de saisie vient s'asseoir sur
    // le « Nom » dès qu'on clique le titre.
    const ecart = IDENTITE_Y - TITRE_Y;
    assert.ok(ecart >= 6, `seulement ${ecart.toFixed(1)} mm entre le titre et l'identité`);
    // Mais pas au point de repousser le filet : `enteteH` ne bouge pas, donc
    // aucune fiche ne se repagine.
    assert.ok(filetY(true) < 15, 'le filet descend trop, la mise en page va bouger');
    assert.ok(filetY(true) > IDENTITE_Y + 2, 'le filet passe sous les jambages du « Nom »');
    // Et sans champs d'identité, tout se resserre : pas de bande blanche.
    assert.ok(filetY(false) < filetY(true));
    assert.ok(filetY(false) > TITRE_Y + 2, 'le filet coupe le titre');
});

test('L\'APERÇU EST À LA PLACE DU PDF, au dixième de millimètre', () => {
    // Deux séries de nombres qui doivent rester d'accord finissent toujours par
    // ne plus l'être : l'aperçu se DÉDUIT des coordonnées du PDF, et c'est ce
    // qu'on vérifie ici. Un aperçu qui n'est pas à la place de la feuille ne
    // sert à rien.
    const html = apercuEntete(K, 'Contrôle', '', null, PAGE, { champs: ['nom', 'date'] });
    const haut = (re) => Number(html.match(re)[1]) / K - PAGE.marge;
    // Le HTML pose un HAUT de boîte, le PDF une ligne de base : l'écart est la
    // montée de la police, qui vaut à peu près 96 % du corps.
    const titre = haut(/data-fiche="titre"[\s\S]*?top:([\d.]+)px/);
    assert.ok(Math.abs((TITRE_Y - titre) - 4.6) < 0.05, `titre à ${titre.toFixed(2)} mm`);
    const identite = haut(/data-fiche="identite"[\s\S]*?top:([\d.]+)px/);
    assert.ok(Math.abs((IDENTITE_Y - identite) - 2.8) < 0.05,
        `identité à ${identite.toFixed(2)} mm`);
    // Les deux boîtes ne sont PAS écartées comme les deux lignes de base : le
    // titre a un plus gros corps, donc une plus grande montée. C'est justement
    // pour cela qu'on ne règle pas l'aperçu à la main.
    assert.ok(identite > titre + 6, 'les deux boîtes se chevauchent');
});

// --- Supprimer le titre ----------------------------------------------------------

test('ON PEUT SUPPRIMER LE TITRE D\'UN GESTE', () => {
    // Rémy : « il faudrait pouvoir supprimer le titre ». On pouvait déjà —
    // cliquer, tout sélectionner, effacer, valider — mais rien ne le disait, et
    // quatre gestes pour une chose qui s'en dit un, personne ne les trouve.
    const boite = { classes: new Set(), enfants: '' };
    const faux = {
        querySelector: (sel) => {
            if (sel === '[data-fiche="titre"]') {
                return {
                    classList: { contains: (c) => boite.classes.has(c) },
                    querySelector: (s) => (boite.enfants.includes(s.replace(/[[\]]/g, ''))
                        ? {} : null),
                    insertAdjacentHTML: (_, html) => { boite.enfants += html; }
                };
            }
            return null;
        }
    };
    garnirFicheDirecte(faux, { champs: [] }, { titre: true });
    assert.match(boite.enfants, /data-vider-titre/, 'la croix manque');
    assert.match(boite.enfants, /fp-fantome/, 'la croix doit se lire comme un fantôme');
    // Deux passages ne la posent pas deux fois.
    garnirFicheDirecte(faux, { champs: [] }, { titre: true });
    assert.equal((boite.enfants.match(/data-vider-titre/g) || []).length, 1);

    // Sur une feuille SANS titre, pas de croix : c'est le placeholder gris qui
    // invite à en écrire un, et il n'y a rien à effacer.
    const vide = { classes: new Set(['fp-entete--vide']), enfants: '' };
    const fauxVide = {
        querySelector: (sel) => (sel === '[data-fiche="titre"]' ? {
            classList: { contains: (c) => vide.classes.has(c) },
            querySelector: () => null,
            insertAdjacentHTML: (_, html) => { vide.enfants += html; }
        } : null)
    };
    garnirFicheDirecte(fauxVide, { champs: [] }, { titre: true });
    assert.equal(vide.enfants, '');

    // Et là où le titre n'est PAS réglable — la fiche d'un exercice, qui porte
    // le nom de l'exercice — la croix n'apparaît pas : une prise qui ne mène
    // nulle part est la pire des interfaces.
    const sans = { classes: new Set(), enfants: '' };
    const fauxSans = {
        querySelector: (sel) => (sel === '[data-fiche="titre"]' ? {
            classList: { contains: (c) => sans.classes.has(c) },
            querySelector: () => null,
            insertAdjacentHTML: (_, html) => { sans.enfants += html; }
        } : null)
    };
    garnirFicheDirecte(fauxSans, { champs: [] }, { titre: false });
    assert.equal(sans.enfants, '');
});

test('la croix efface, et n\'ouvre pas la saisie qu\'elle vient de vider', () => {
    // L'ordre des tests dans l'écouteur est le fond de l'affaire : la croix est
    // DANS la boîte du titre, donc un clic dessus est aussi un clic sur le
    // titre. Si la boîte passait la première, on effacerait puis on rouvrirait
    // aussitôt le champ de saisie.
    const src = fsLire('../js/ui/ficheDirecte.js');
    const iCroix = src.indexOf('data-vider-titre]');
    const iTitre = src.indexOf('closest(\'[data-fiche="titre"]\')');
    assert.ok(iCroix > 0 && iTitre > 0);
    assert.ok(iCroix < iTitre, 'la croix est testée après la boîte du titre');
    assert.match(src, /ecrire\(\{ titre: '' \}\)/, 'la croix ne vide pas le titre');
});

test('LE CHAMP DE SAISIE PREND TOUTE LA LIGNE', () => {
    // Rémy : « quand je clique sur le titre, il est tronqué ». Le `<b>` suivait
    // la largeur de son contenu, et le contenu était devenu un `<input>`, large
    // de vingt caractères par nature : un titre de quarante s'affichait par la
    // queue. Deux moitiés à la correction — le CSS élargit, le JS remet la
    // fenêtre au début.
    const css = fsLire('../css/ui.css');
    const regle = css.match(/\.fp-entete--edite b \{[^}]*\}/);
    assert.ok(regle, 'la règle de saisie a disparu');
    assert.match(regle[0], /width:\s*100%/);
    assert.match(regle[0], /min-width:\s*0/, 'sans min-width, le flex refuse de rétrécir');
    const src = fsLire('../js/ui/ficheDirecte.js');
    assert.match(src, /champ\.scrollLeft = 0/, 'le champ reste défilé sur la fin du titre');
});
