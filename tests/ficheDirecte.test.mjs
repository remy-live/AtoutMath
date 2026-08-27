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
    apercuEntete, CHAMPS_ENTETE, CHAMPS_DEFAUT, TITRE_Y, IDENTITE_Y, filetY,
    hauteurEntete1, HAUTEUR_CONSIGNE_FEUILLE
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

test('UN TITRE EFFACÉ NE LAISSE PLUS DE FANTÔME EN TRAVERS DU « Nom »', () => {
    const ecrit = apercuEntete(K, 'Interro n°7', '', null, PAGE);
    assert.match(ecrit, /data-fiche="titre"/);
    assert.match(ecrit, /Interro n°7/);

    // Rémy : « quand on clique sur la croix, ça ne le supprime pas forcément ».
    // Ce n'était pas une impression. La ligne d'identité remonte de la hauteur
    // du titre quand il n'y en a pas — c'est voulu, la place rendue est le but
    // — mais la boîte du titre, elle, restait à SON altitude : le gris pâle
    // « Titre de la feuille » venait s'asseoir exactement sur « Nom : ……… ».
    // On croyait avoir effacé, et l'on voyait toujours un titre.
    //
    // Sans titre, il n'y a donc plus de boîte du tout. Le chemin du retour est
    // un « + Titre » posé au bout de la ligne d'identité, avec les autres « + ».
    const vide = apercuEntete(K, '', '', null, PAGE);
    assert.doesNotMatch(vide, /data-fiche="titre"/, 'la boîte du titre survit à son titre');
    assert.doesNotMatch(vide, /Titre de la feuille/, 'le fantôme du titre est encore là');
    // La ligne d'identité, elle, reste : c'est là que se posent les « + ».
    assert.match(vide, /data-fiche="identite"/);
});

test('LA CONSIGNE DE LA FEUILLE S\'ÉCRIT SOUS LE FILET', () => {
    // Rémy : « ajoute un plus en dessous pour pouvoir mettre des consignes ».
    // Chaque exercice a déjà la sienne ; il manquait celle du devoir entier —
    // « Calculatrice interdite », « Tu as 45 minutes ».
    const sans = apercuEntete(K, 'Interro', '', null, PAGE, { champs: ['nom'] });
    assert.doesNotMatch(sans, /data-fiche="consigne-feuille"/);

    const avec = apercuEntete(K, 'Interro', '', null, PAGE,
        { champs: ['nom'], consigne: 'Calculatrice interdite.' });
    assert.match(avec, /data-fiche="consigne-feuille"/);
    assert.match(avec, /Calculatrice interdite\./);

    // ET ELLE PREND SA PLACE : sinon elle s'imprimerait par-dessus le premier
    // exercice. C'est `hauteurEntete1` qui la réserve, et c'est la seule chose
    // qui empêche la collision.
    const nu = hauteurEntete1(PAGE, null, { titre: 'Interro', champs: ['nom'] });
    const cons = hauteurEntete1(PAGE, null,
        { titre: 'Interro', champs: ['nom'], consigne: 'Calculatrice interdite.' });
    assert.ok(cons > nu, `la consigne ne réserve rien : ${nu} puis ${cons}`);
    assert.ok(cons - nu <= 2 * HAUTEUR_CONSIGNE_FEUILLE + 0.01,
        'la consigne réserve plus que les deux lignes qu\'elle peut occuper');
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

    // SUR UNE FEUILLE SANS TITRE, IL N'Y A PLUS DE BOÎTE — donc rien à
    // effacer, et un « + Titre » à proposer à la place. C'est le chemin du
    // retour que Rémy demandait : « mets un plus (dans la marge inutile) pour
    // remettre le titre ». Il se pose au bout de la ligne d'identité, avec les
    // autres « + » : c'est là qu'on cherche déjà ce qu'on peut ajouter.
    const ligne = { enfants: '' };
    const fauxVide = {
        querySelector: (sel) => (sel === '[data-fiche="identite"]' ? {
            closest: () => null,
            querySelector: (s) => (ligne.enfants.includes(s.replace(/[[\]]/g, '')) ? {} : null),
            insertAdjacentHTML: (_, html) => { ligne.enfants += html; }
        } : null)
    };
    garnirFicheDirecte(fauxVide, { champs: [] }, { titre: true });
    assert.match(ligne.enfants, /data-remettre-titre/, 'aucun chemin pour remettre le titre');
    assert.match(ligne.enfants, /\+ Titre/);
    // Deux passages ne le posent pas deux fois.
    garnirFicheDirecte(fauxVide, { champs: [] }, { titre: true });
    assert.equal((ligne.enfants.match(/data-remettre-titre/g) || []).length, 1);

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

// --- L'autre doublon : le corrigé réglé à deux endroits -------------------------

test('LE CORRIGÉ SE RÈGLE EN UN SEUL ENDROIT', () => {
    // Rémy : « pour la fiche du parcours, j'ai l'impression d'avoir du
    // doublon ». Il y en avait un : « Corrigé — un seul PDF » trônait dans la
    // rangée du haut pendant que « Solutions » et « Colonnes » vivaient dans le
    // repli nommé, justement, « Papier, numéros ET CORRIGÉ ». On ouvrait le
    // repli pour chercher ce qu'on venait de lire en haut.
    const src = fsLire('../js/ui/printParcours.js');
    const haut = src.indexOf('class="fp-controles"');
    const repli = src.indexOf('class="fp-controles pp-sol-reglages"');
    const corrige = src.indexOf('id="pp-sol-ou"');
    assert.ok(haut > 0 && repli > 0 && corrige > 0);
    assert.ok(corrige > repli,
        'le réglage du corrigé est remonté dans la rangée du haut');
    // Les trois réglages du corrigé sont sur la même ligne.
    const bloc = src.slice(repli, src.indexOf('</div>', repli));
    ['pp-sol-ou', 'pp-sol-mode', 'pp-sol-colonnes'].forEach(id =>
        assert.ok(bloc.includes(`id="${id}"`), `${id} n'est pas avec les autres`));
});

test('sans corrigé, les réglages du corrigé disparaissent', () => {
    // « Compact — juste les réponses » sur une feuille imprimée « Sans
    // solutions » est une commande qui ne commande rien : la laisser, c'est
    // laisser croire qu'il y aura un corrigé quelque part.
    const src = fsLire('../js/ui/printParcours.js');
    assert.match(src, /data-si-corrige/);
    assert.match(src, /el\.hidden = ouSol\.value === 'sans'/);
    // ET LE PIÈGE DE `[hidden]` EST DÉSARMÉ : la règle du navigateur a une
    // spécificité de zéro et perd contre `.fp-controles label { display: flex }`.
    const css = fsLire('../css/ui.css');
    assert.match(css, /\.fp-controles label\[hidden\]\s*\{\s*display:\s*none/);
});

test('le repli dit ce qu\'il contient sans qu\'on l\'ouvre', () => {
    const src = fsLire('../js/ui/printParcours.js');
    assert.match(src, /id="pp-plus-etat"/);
    assert.match(src, /const majRepli = \(\) =>/);
    // Il se remet à jour sur les trois réglages qu'il résume, et à l'ouverture.
    assert.match(src, /ouSol\.onchange = \(\) => \{ majRepli\(\);/);
    assert.match(src, /orientEl\.onchange = \(\) => \{ majRepli\(\);/);
    // Trois réglages le nourrissent, et il se pose aussi à l'ouverture.
    assert.match(src, /couleurEl\.onchange[\s\S]{0,200}majRepli\(\);/);
    assert.ok((src.match(/majRepli\(\)/g) || []).length >= 4);
});

// --- Qui est devant l'écran ------------------------------------------------------

test('LE RÔLE SE LIT EN HAUT, ET SE RETOURNE D\'UN CLIC', () => {
    // Rémy : « sur l'interface prof ou et élèves, j'ai l'impression que ce
    // n'est pas clair ». Le basculement n'existait que dans la palette noire du
    // banc d'essai, où seule l'infobulle disait le rôle — et l'on n'ouvre pas
    // une palette de développeur pour savoir qui l'on est.
    const html = fsLire('../index.html');
    assert.match(html, /id="btn-role"/, 'la pastille de rôle manque à la barre haute');
    // Elle est dans la barre du haut, à gauche, avec le nom de l'application —
    // le premier endroit où va l'œil.
    const nav = html.slice(html.indexOf('<div class="nav-left">'),
        html.indexOf('nav-center'));
    assert.ok(nav.includes('id="btn-role"'), 'la pastille n\'est pas dans nav-left');
    // Et elle n'est PAS réservée à un mode : une pastille cachée en mode élève
    // ne dirait plus rien à celui qui se demande où il est.
    const balise = html.slice(html.indexOf('id="btn-role"') - 200,
        html.indexOf('id="btn-role"') + 200);
    assert.ok(!/student-only|teacher-only/.test(balise));

    const src = fsLire('../js/app.js');
    // LES DEUX BOUTONS PARTAGENT LE MÊME GESTE : deux commandes pour un état,
    // c'est deux occasions de le désaccorder.
    assert.match(src, /const basculerRole = \(\) =>/);
    assert.match(src, /if \(btnRole\) btnRole\.onclick = basculerRole/);
    assert.match(src, /if \(btnRoleDbg\) btnRoleDbg\.onclick = basculerRole/);
    // Et le mot change avec le rôle.
    assert.match(src, /nomRole\.textContent = prof \? 'Prof' : 'Élève'/);

    const css = fsLire('../css/layout.css');
    assert.match(css, /\.role-badge--prof/, 'la pastille ne change pas d\'aspect');
    // Un point coloré double la couleur : tout le monde ne distingue pas deux
    // teintes de la même barre.
    assert.match(css, /\.role-badge-point/);
});
