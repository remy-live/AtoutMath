// REVENIR À L'ÉCRAN D'ACCUEIL — celui du début, avec le gros titre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après l'essai sur tablette :
//
//   « mais on ne peut revenir à l'écran d'accueil. et sur l'écran d'accueil,
//     il faudrait qu'il y ait lecture de qr code »
//
// IL PARLE DU PREMIER ÉCRAN, et il l'appelle déjà ainsi ailleurs (« dans
// l'écran d'accueil ou on tape son identifiant »). Mesuré : cet écran ne
// revenait JAMAIS — `portailNecessaire()` s'éteint dès que l'élève a de quoi
// travailler, ce qui est juste au chargement et faux ensuite. Hors ligne,
// c'est pourtant le seul endroit d'où l'on scanne le QR du tableau : l'élève
// qui avait fini sa séance ne pouvait plus en recevoir aucune autre.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Quatre choses, et chacune est un aller sans retour si elle lâche :
//
//   · l'écran d'accueil s'ouvre à la demande, en plus des cas du démarrage ;
//   · il se referme pour de bon — sinon il revient PAR-DESSUS la séance que
//     l'élève vient de scanner ;
//   · il porte un chemin de retour vers la séance en cours, visible sans
//     défiler ;
//   · et le clavier ne monte pas devant la caméra.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('L\'ÉCRAN D\'ACCUEIL S\'OUVRE AUSSI PARCE QU\'ON LE DEMANDE', () => {
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    assert.match(P, /export function ouvrirLAccueil\(\) \{/);
    // LES DEUX RAISONS DE LE MONTRER, et il en faut deux : celle du démarrage
    // (« faut-il montrer la porte à qui arrive ? ») et celle de l'élève
    // (« je la demande »). Confondre les deux obligerait à toucher
    // `portailNecessaire`, dont tout le reste dépend.
    assert.match(P, /const ilFaut = portailNecessaire\(\) \|\| ouvertALaDemande;/);
    // LA COUCHE DE JEU SE FERME AVANT, par la croix de l'en-tête — elle seule
    // arrête le meneur, libère les moteurs et écrit le journal.
    assert.match(P, /getElementById\('btn-close-game'\)\?\.click\(\)/);
    // ET LA CAMÉRA SE RÉARME : revenir à l'accueil hors ligne, c'est venir
    // scanner.
    assert.match(P, /cameraDejaOuverte = false;\s*\n\s*majPortail\(\);/);
});

test('IL SE REFERME POUR DE BON — sinon il revient sur la séance scannée', () => {
    // LE PIÈGE EST FIN : `majPortail()` est rappelée à chaque
    // `studentPath_updated`, c'est-à-dire JUSTE APRÈS le code que l'élève
    // vient de scanner. Un drapeau qu'on oublie de baisser redessine alors
    // l'écran d'accueil par-dessus la séance qui s'ouvre.
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    const corps = P.slice(P.indexOf('export function fermerPortail'),
        P.indexOf('export function ouvrirLAccueil'));
    assert.match(corps, /ouvertALaDemande = false;/,
        'fermer la porte doit aussi oublier qu\'on l\'avait demandée');
});

test('ON PEUT REVENIR À SA SÉANCE, ET SANS DÉFILER', () => {
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    // LE BOUTON N'EXISTE QUE S'IL Y A UNE SÉANCE : sur une tablette neuve, il
    // ne ramènerait nulle part.
    assert.match(P, /\$\{aUneSeance\(\) \? `<div class="portail-reprise">/);
    assert.match(P, /id="portail-reprendre"/);
    assert.match(P, /reprendre\.onclick = \(\) => fermerPortail\(\);/);
    // EN HAUT, ET NON DANS LE PIED : mesuré, la boîte du portail fait 823 px
    // pour une vitre de 844, et le pied est sous les deux cartes. Ce qui
    // répare une erreur doit se voir sans défiler.
    assert.ok(P.indexOf('portail-reprise') < P.indexOf('class="portail-portes"'),
        'le retour vers la séance doit précéder les deux portes');
});

test('LE CLAVIER NE MONTE PAS DEVANT LA CAMÉRA', () => {
    // Poser le foyer sur « Identifiant » fait monter le clavier de la tablette.
    // Hors ligne, la ligne suivante ouvre le scanner : on aurait le clavier
    // par-dessus la caméra, sur un écran où il n'y a rien à taper.
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    assert.match(P, /if \(!scannerEstLeSeulChemin\(\)\) document\.getElementById\('portail-login'\)\.focus\(\);/);
});

test('LE BOUTON ACCUEIL EST LE PREMIER DE LA BARRE, ET CACHÉ EN LIGNE', () => {
    const H = lire('index.html');
    assert.match(H, /<button class="bottom-nav-btn" id="mob-btn-accueil" hidden>/);
    // UNE MAISON NE SE CHERCHE PAS : elle est à gauche, avant tout le reste.
    const ordre = ['mob-btn-accueil', 'mob-btn-code', 'mob-btn-scan',
        'mob-btn-path', 'mob-btn-profile'].map(id => H.indexOf(`id="${id}"`));
    assert.ok(ordre.every(i => i > 0), 'un bouton de la barre a disparu');
    assert.deepEqual([...ordre].sort((a, b) => a - b), ordre,
        'l\'ordre de la barre du bas a changé');
    // MÊME RÈGLE QUE L'ICÔNE DU QR CODE, et les deux se remesurent ensemble.
    const A = sansCommentaires(lire('js/app.js'));
    assert.match(A, /if \(btnAccueil\) btnAccueil\.hidden = !horsLigne;/);
    assert.match(A, /m\.ouvrirLAccueil\(\)/);
});
