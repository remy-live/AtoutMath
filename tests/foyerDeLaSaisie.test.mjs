// LE BOUTON QU'ON ÉTEINT NE DOIT PAS EMPORTER LE CLAVIER AVEC LUI.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai un petit bug sur enlever les parenthèses, parfois le bouton
// valider est inactif ».
//
// MESURÉ, LA CHAÎNE ENTIÈRE (tools/boutonValiderInactif.mjs, et
// tools/tmp/ouVaLeFoyer.mjs qui relève `document.activeElement` tous les
// dixièmes de seconde) :
//
//   l'élève clique « Valider » → le foyer passe au bouton → l'étape suivante
//   s'ouvre, le champ se vide, `btnValider.disabled = true` → **un élément
//   désactivé ne peut pas garder le foyer**, le navigateur le lui retire, et
//   il tombe sur `<body>` → `container.onkeydown` ne voit plus rien → l'élève
//   tape, rien ne s'écrit, le champ reste vide, le bouton reste éteint.
//
// « PARFOIS » ÉTAIT LE MOT JUSTE : seulement à partir de la DEUXIÈME ligne
// d'une question découpée, seulement au clavier physique, et une seule touche
// du pavé remettait tout en marche. Trois conditions, dont une qui se répare
// toute seule.
//
// ── POURQUOI CETTE ÉPREUVE EXISTE SOUS CETTE FORME ─────────────────────────
//
// LES ACTIVITÉS NE S'ÉPROUVENT PAS SOUS NODE : elles touchent le document dès
// qu'on les importe. C'est la leçon de `core/ligneEtape.js`, payée une fois
// déjà — une règle qu'aucune épreuve ne peut atteindre se casse en silence. La
// règle vit donc dans `core/foyerDeLaSaisie.js`, qui ne lit du document que
// `activeElement`, et s'éprouve ici avec des éléments de papier.
//
// ET LA SECONDE MOITIÉ SE LIT DANS LA SOURCE : que les QUATRE écrans qui
// portent cette forme l'appellent, au lieu d'en garder chacun une copie. Deux
// d'entre eux avaient le défaut — `litteralSaisie` (celui de Rémy) et
// `fractionsBandes` (« L'Égalité à Compléter », qu'il n'avait pas signalé).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { rendreLeFoyer, eteindreSansPerdreLeFoyer } from '../js/core/foyerDeLaSaisie.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/** Un conteneur de papier, qui compte les fois où on lui rend le foyer. */
function conteneurDEssai(dedans = []) {
    return {
        rendus: 0,
        tabIndex: undefined,
        attributs: new Set(),
        hasAttribute(n) { return this.attributs.has(n); },
        contains(e) { return dedans.includes(e); },
        focus(opts) { this.rendus++; this.derniersOpts = opts; }
    };
}
const boutonDEssai = () => ({ disabled: false });
/** Qui a le foyer, dans ce document de papier. */
const foyerSur = (e) => { globalThis.document.activeElement = e; };

test('LE BOUTON S\'ÉTEINT, ET LE FOYER REVIENT AU CONTENEUR', () => {
    // LE DÉFAUT DE RÉMY, EN QUATRE LIGNES. Le bouton a le foyer — l'élève vient
    // de cliquer dessus — et on l'éteint parce que le champ s'est vidé.
    const btn = boutonDEssai();
    const conteneur = conteneurDEssai([btn]);
    foyerSur(btn);
    eteindreSansPerdreLeFoyer(btn, true, conteneur);
    assert.equal(btn.disabled, true, 'le bouton doit bien s\'éteindre : c\'est son travail');
    assert.equal(conteneur.rendus, 1,
        'le foyer n\'est pas revenu : l\'élève tapera dans le vide');
    // `preventScroll` : sans lui, rendre le foyer fait sauter la page au
    // conteneur, et sur un téléphone l'énoncé passe sous la ligne de flottaison
    // à chaque étape.
    assert.equal(conteneur.derniersOpts && conteneur.derniersOpts.preventScroll, true);
});

test('ON NE VOLE PAS LE FOYER À UNE TOUCHE DU PAVÉ', () => {
    // L'ÉLÈVE QUI TAPE AU DOIGT a le foyer sur une touche, qui est DANS le
    // conteneur : les frappes y remontent déjà, il n'y a rien à faire. Le lui
    // reprendre à chaque caractère ferait clignoter la touche pressée.
    const touche = { disabled: false };
    const btn = boutonDEssai();
    const conteneur = conteneurDEssai([btn, touche]);
    foyerSur(touche);
    eteindreSansPerdreLeFoyer(btn, true, conteneur);
    assert.equal(conteneur.rendus, 0, 'le foyer était déjà dans l\'activité');
});

test('ON LE REND AUSSI QUAND IL EST PARTI TOUT SEUL', () => {
    // Le foyer peut s'échapper autrement qu'en désactivant un bouton — une
    // bannière fermée, un clic à côté. Dès qu'il est hors du conteneur et qu'on
    // redessine, on le reprend.
    const btn = boutonDEssai();
    const conteneur = conteneurDEssai([btn]);
    foyerSur({ nom: 'body' });                     // hors du conteneur
    eteindreSansPerdreLeFoyer(btn, false, conteneur);
    assert.equal(btn.disabled, false);
    assert.equal(conteneur.rendus, 1);
});

test('JAMAIS QUAND UNE BANNIÈRE DE CORRECTION A LA MAIN', () => {
    // SINON ON DÉPLACE LE DÉFAUT AU LIEU DE LE CORRIGER : la bannière donne le
    // foyer à son bouton « J'ai compris » pour que l'élève au clavier puisse
    // fermer sans viser à la souris. Le lui reprendre rendrait ce bouton
    // inatteignable, et l'élève serait bloqué un écran plus loin.
    const btn = boutonDEssai();
    const conteneur = conteneurDEssai([btn]);
    foyerSur({ nom: 'fb-close' });
    eteindreSansPerdreLeFoyer(btn, true, conteneur, true);
    assert.equal(conteneur.rendus, 0, 'on a pris le foyer à la bannière');
    assert.equal(rendreLeFoyer(conteneur, { force: true, occupe: true }), false);
});

test('UN CONTENEUR SANS `tabindex` N\'EST PAS FOCUSABLE — on le pose', () => {
    // LA FAÇON DONT CETTE CORRECTION AURAIT PU NE RIEN CORRIGER : `focus()` sur
    // un élément non focusable échoue en SILENCE. Le défaut serait resté
    // exactement le même, avec une correction écrite au-dessus.
    const conteneur = conteneurDEssai();
    foyerSur({ nom: 'body' });
    assert.equal(rendreLeFoyer(conteneur), true);
    assert.equal(conteneur.tabIndex, -1, 'sans `tabindex`, le `focus()` ne fait rien');
    // Et l'on ne récrit pas celui qui existe déjà : l'activité peut avoir ses
    // raisons de l'avoir posé autrement.
    const autre = conteneurDEssai();
    autre.attributs.add('tabindex');
    autre.tabIndex = 0;
    rendreLeFoyer(autre);
    assert.equal(autre.tabIndex, 0);
});

test('SANS CONTENEUR, ON NE JETTE PAS', () => {
    // Un écran démonté pendant qu'un minuteur courait : il vaut mieux ne rien
    // faire qu'arrêter l'activité sur une exception.
    assert.equal(rendreLeFoyer(null), false);
    assert.doesNotThrow(() => eteindreSansPerdreLeFoyer(null, true, null));
});

test('LES QUATRE ÉCRANS DE SAISIE PASSENT PAR LA RÈGLE, SANS EN GARDER DE COPIE', () => {
    // LA MOITIÉ QUI NE S'ÉPROUVE QUE DANS LA SOURCE, et c'est la quatrième fois
    // en trois jours qu'on paye ce motif : une correction posée sur un seul des
    // chemins qui mènent au même endroit ne ferme rien. Deux de ces quatre
    // écrans avaient le défaut, mesurés dans un navigateur.
    const ECRANS = [
        'js/core/activities/litteralSaisie.js',
        'js/core/activities/fractionsBandes.js',
        'js/core/activities/fractionsPose.js',
        'js/core/activities/notationSaisie.js'
    ];
    for (const f of ECRANS) {
        const src = lire(f)
            // Les en-têtes CITENT l'ancienne forme pour expliquer ce qu'elle a
            // coûté : on ne s'accuse pas de ce qu'on documente.
            .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
        assert.match(src, /from '\.\.\/foyerDeLaSaisie\.js'/,
            `${f} doit appeler la règle commune`);
        assert.match(src, /eteindreSansPerdreLeFoyer\(/, `${f} ne l'appelle nulle part`);
        // ET PLUS AUCUNE AFFECTATION DIRECTE sur le bouton « Valider ». C'est
        // la ligne exacte qui faisait tomber le foyer sur `<body>`.
        assert.doesNotMatch(src, /\b(btn|btnValider|bouton)\w*\.disabled\s*=/,
            `${f} éteint encore un bouton à la main : le foyer tombera sur <body>`);
    }
});

test('LA BANNIÈRE REND LE FOYER À CELUI QUI L\'AVAIT', () => {
    // L'AUTRE MOITIÉ DU DÉFAUT, ET CELLE QUI RÉSISTAIT. Corriger les quatre
    // activités ne suffisait pas : sur « L'Égalité à Compléter », le foyer
    // tombait encore sur BODY après la fermeture de la bannière. C'est elle qui
    // le prenait — `btn.focus()` sur « J'ai compris » —, c'est donc à elle de
    // le rendre. Mesuré avant : foyer BODY, clavier muet ; après : foyer sur le
    // plateau, clavier vivant.
    const src = lire('js/ui/gameFeedbackUI.js');
    const i = src.indexOf('function showDismissable');
    assert.ok(i > 0, '`showDismissable` a disparu : la règle est à reporter');
    const bloc = src.slice(i, src.indexOf('\n}', src.indexOf('btn.focus', i)));
    assert.ok(bloc.length > 200, 'tranche vide : l\'épreuve ne vérifierait rien');
    assert.match(bloc, /const avant = document\.activeElement/,
        'la bannière doit retenir qui avait le foyer avant de le prendre');
    assert.match(bloc, /rendreLeFoyerA\(avant\)/,
        'et le lui rendre en se fermant, sinon il tombe sur <body>');
    // ET ELLE NE LE REND PAS À UN ÉLÉMENT MORT OU ÉTEINT : `focus()` y échoue en
    // silence, ce qui revient exactement à ne rien avoir corrigé.
    assert.match(src, /avant\.isConnected/);
    assert.match(src, /!avant\.disabled/);
});
