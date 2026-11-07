// UNE SEULE CARTE À LA FIN D'UNE SÉRIE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MESURÉ PAR UN AUDIT : à l'instant où une séance se terminait, TROIS panneaux
// étaient dans la page en même temps —
//
//   1. « 🎉 Étape validée ! … [Voir mon bilan] »   l'écran du meneur
//   2. « Badge débloqué ! ⚡ Éclair [Super !] »      une modale
//   3. « C'est en train de rentrer. … [Fermer] »    une autre modale
//
// — et l'élève devait en fermer DEUX pour atteindre le bouton qui compte,
// « Voir mon bilan », qui était dessous. À la sonnerie, il ferme tout au
// réflexe et ne voit jamais son bilan.
//
// Chacun des trois messages est bon. C'est leur simultanéité qui les annule.
//
// RÉMY A TRANCHÉ pour la carte unique plutôt que pour une file de trois
// panneaux : « Le B ». À la sonnerie, trois clics c'est trois de trop.
//
// MESURÉ APRÈS, dans un navigateur (`tools/tmp/finDeSeance.mjs`), en déposant
// un bilan ET un badge dans le même tour :
//   panneaux ouverts : 1        (avant : 3)
//   boutons : 1, « Fermer » 314 × 44, atteignable
//   un clic → 0 panneau restant

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LE COORDINATEUR EXISTE, ET C\'EST LE SEUL À DESSINER', () => {
    const F = lire('js/ui/finDeSerie.js');
    assert.match(F, /export function deposerBadges/);
    assert.match(F, /export function deposerBilan/);
    // Une seule fenêtre ouverte, dans tout le fichier.
    assert.equal((F.match(/showModal\(/g) || []).length, 1);
});

test('NI LES BADGES NI LE BILAN N\'OUVRENT PLUS LEUR PROPRE FENÊTRE', () => {
    // C'EST L'ASSERTION QUI TIENT LA CORRECTION. Si l'un des deux se remet à
    // appeler `showModal`, on retrouve deux panneaux empilés — et rien ne le
    // dirait, puisque chacun marche très bien tout seul.
    const G = lire('js/ui/gamificationUI.js');
    assert.ok(!/showModal\(/.test(G), 'les récompenses rouvrent une fenêtre');
    assert.match(G, /deposerBadges\(lot, confettis\)/);

    const A = lire('js/ui/accueilUI.js');
    assert.match(A, /deposerBilan\(bilan, actions\)/);
    // L'ancien gabarit est parti : deux gabarits pour la même carte, c'est
    // celui qu'on oublie de corriger le jour où l'autre change.
    assert.ok(!/id="bilan-modal"/.test(A), 'l\'ancienne fenêtre du bilan est toujours là');
    assert.ok(!/bi-refaire/.test(A));
});

test('L\'ORDRE DE LECTURE EST FIXE : ce qu\'on a GAGNÉ, puis ce qu\'on a APPRIS', () => {
    // C'est tout l'objet d'un coordinateur. Le gagné fait lever les yeux, le
    // appris demande de lire : l'inverse ferait sauter le second message
    // par-dessus l'épaule du premier.
    const F = lire('js/ui/finDeSerie.js');
    const gabarit = F.slice(F.indexOf('const modal = showModal'), F.indexOf('const el = modal.element'));
    assert.ok(gabarit.indexOf('${recompenses}') < gabarit.indexOf('${verdict}'),
        'le bilan passe avant les récompenses');
    // Et le trait ne sépare que s'il y a bien deux choses à séparer.
    assert.match(gabarit, /recompenses && verdict \? '<div class="fs-trait">/);
});

test('UN SEUL BOUTON DE SORTIE — on ne redonne pas le clic qu\'on retire', () => {
    const F = lire('js/ui/finDeSerie.js');
    // « Super ! » sous une récompense et « Fermer » sous un bilan sont le même
    // geste. Les afficher tous les deux rendrait les deux clics qu'on vient
    // d'enlever.
    assert.match(F, /const sortie = badges\.length && !bilan \? 'Super !' : 'Fermer'/);
    assert.equal((F.match(/data-fs-sortir/g) || []).length, 2);  // le gabarit, puis la liaison
});

test('L\'ATTENTE EST PLUS LONGUE QUE CELLE DES BADGES — sinon on dessine trop tôt', () => {
    // Les deux annonces arrivent à quelques millisecondes l'une de l'autre,
    // sans ordre garanti. Si le coordinateur dessinait avant que le lot de
    // badges soit complet, on retomberait sur deux cartes — celle du bilan,
    // puis celle des badges en retard.
    const F = lire('js/ui/finDeSerie.js');
    const G = lire('js/ui/gamificationUI.js');
    const mF = /const ATTENTE_MS = (\d+)/.exec(F);
    const mG = /setTimeout\(annoncer, (\d+)\)/.exec(G);
    assert.ok(mF && mG, 'les deux délais ne se lisent plus');
    assert.ok(Number(mF[1]) > Number(mG[1]),
        `la carte dessine à ${mF[1]} ms, les badges arrivent à ${mG[1]} ms`);
    // Et pas si long qu'on le remarque.
    assert.ok(Number(mF[1]) <= 500, `${mF[1]} ms d'attente après la dernière réponse`);
});

test('LES CONFETTIS PARTENT APRÈS LA CARTE, PAS AVANT', () => {
    // Lancés avant, ils tombent DERRIÈRE la fenêtre qui s'ouvre juste après.
    const F = lire('js/ui/finDeSerie.js');
    assert.ok(F.indexOf('const modal = showModal') < F.indexOf('apres.forEach'));
});

test('ET LE TEXTE D\'UN BADGE EST ÉCHAPPÉ — il vient d\'une donnée', () => {
    const F = lire('js/ui/finDeSerie.js');
    assert.match(F, /echapper\(b\.title\)/);
    assert.match(F, /echapper\(b\.description\)/);
    assert.match(F, /echapper\(bilan\.titre\)/);
    assert.match(F, /echapper\(bilan\.texte\)/);
});
