// SE DÉCONNECTER — ce qui n'existait nulle part.
//
// Rémy : « Tu sais qu'on ne peut même pas se déconnecter ».
//
// CE QUI SE VÉRIFIE ICI N'EST PAS LE BOUTON, C'EST CE QU'IL NE DOIT PAS COÛTER.
//
// « Effacer le jeton » se code en une ligne et se trompe de trois façons : on
// jette les dernières réponses d'un élève, on laisse le verrou d'une classe à
// celui qui s'assiéra ensuite devant la même machine, et l'on efface quatre
// mois d'histoire à quelqu'un qui voulait seulement changer de compte. Les
// trois sont éprouvées ci-dessous.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    peutSeDeconnecter, ceQuOnEfface, RIEN_A_PERDRE_PROF
} from '../js/core/deconnexion.js';

// ─────────────────────────────────────── ON NE JETTE PAS DU TRAVAIL ─────────

test('TOUT EST ENVOYÉ : ON PEUT PARTIR, ET ON LE DIT', () => {
    // Le cas le plus fréquent, et celui qui doit être le plus rapide : un clic,
    // pas de question.
    const r = peutSeDeconnecter(0);
    assert.equal(r.sur, true);
    assert.equal(r.perte, 0);
    assert.match(r.dire, /enregistré/);
});

test('IL RESTE DU TRAVAIL À ENVOYER : ON NE PART PAS COMME ÇA', () => {
    // Le journal pousse par lots, avec quelques secondes de retard. Un élève
    // qui se déconnecte à la sonnerie perdrait ses dernières réponses — celles
    // qu'il vient justement de se donner du mal à trouver.
    const r = peutSeDeconnecter(3);
    assert.equal(r.sur, false);
    assert.equal(r.pourquoi, 'reste-a-envoyer');
    assert.equal(r.perte, 3);
    assert.match(r.dire, /3 réponses/);
});

test('HORS LIGNE, ON DIT EXACTEMENT CE QUI SERA PERDU', () => {
    // On ne peut pas envoyer, donc on ne peut pas sauver. Interdire serait
    // enfermer l'élève ; se taire serait lui prendre son travail sans le dire.
    // On chiffre la perte, et il décide.
    const r = peutSeDeconnecter(7, { horsLigne: true });
    assert.equal(r.sur, false);
    assert.equal(r.pourquoi, 'hors-ligne');
    assert.equal(r.perte, 7);
    assert.match(r.dire, /7 réponses/);
    assert.match(r.dire, /perdu/);
});

test('les accords suivent — une réponse, deux réponses', () => {
    assert.match(peutSeDeconnecter(1).dire, /1 réponse reste à envoyer/);
    assert.match(peutSeDeconnecter(2).dire, /2 réponses restent à envoyer/);
    assert.match(peutSeDeconnecter(1, { horsLigne: true }).dire, /1 réponse n'a pas/);
    assert.match(peutSeDeconnecter(2, { horsLigne: true }).dire, /2 réponses n'ont pas/);
});

test('ON N\'ARRACHE PAS UNE QUESTION EN COURS', () => {
    // Même avec tout envoyé : la réponse qu'on est en train de taper n'est pas
    // encore un événement. Le meneur sait clore proprement, on le laisse faire.
    const r = peutSeDeconnecter(0, { enTrainDeTravailler: true });
    assert.equal(r.sur, false);
    assert.equal(r.pourquoi, 'en-plein-travail');
    assert.match(r.dire, /exercice/);
});

test('un compte d\'attente absurde ne bloque pas la sortie', () => {
    // Une valeur négative ou illisible ne doit pas enfermer quelqu'un.
    assert.equal(peutSeDeconnecter(-4).sur, true);
    assert.equal(peutSeDeconnecter(null).sur, true);
    assert.equal(peutSeDeconnecter(undefined).sur, true);
});

// ──────────────────────────────── ON NE LAISSE RIEN AU SUIVANT ──────────────

test('LE VERROU DE LA CLASSE S\'EFFACE TOUJOURS', () => {
    // C'est le piège invisible. La consigne, le verrou, la séance imposée et le
    // chrono sont gardés sur l'appareil pour survivre à une coupure réseau.
    // Sans les effacer, l'élève suivant devant la même machine se retrouve
    // verrouillé par une classe dont il ne fait pas partie, avec un compte à
    // rebours qui n'est pas le sien — et personne ne comprend pourquoi.
    const quoi = ceQuOnEfface().map(e => e.quoi);
    assert.ok(quoi.includes('seance'), quoi.join(', '));
    assert.ok(quoi.includes('messages'), quoi.join(', '));
});

test('LE JETON PART EN DERNIER, PARCE QUE L\'ENVOI FINAL EN A BESOIN', () => {
    // L'ordre n'est pas cosmétique : détacher d'abord, c'est se retrouver sans
    // identification au moment précis où l'on veut pousser le dernier lot.
    const quoi = ceQuOnEfface().map(e => e.quoi);
    assert.equal(quoi[quoi.length - 1], 'jeton');
});

test('SE DÉCONNECTER N\'EST PAS S\'EFFACER', () => {
    // Sur la tablette d'un élève, se déconnecter et se reconnecter ne doit pas
    // coûter quatre mois d'histoire. Le journal ne part que si on le demande.
    assert.ok(!ceQuOnEfface().some(e => e.quoi === 'journal'));
    assert.ok(ceQuOnEfface({ effacerLeTravail: true }).some(e => e.quoi === 'journal'));
});

test('chaque chose effacée se dit en français, pas en nom de variable', () => {
    // Cette liste s'affiche à l'élève avant qu'il confirme. « seanceDistante,
    // journal » ne lui apprend rien sur ce qu'il est en train de perdre.
    for (const e of ceQuOnEfface({ effacerLeTravail: true })) {
        assert.ok(e.dit && e.dit.length > 8 && !/[A-Z_]{4,}/.test(e.dit), e.quoi + ' : ' + e.dit);
    }
});

// ─────────────────────────────────────────────── CE QUE LE PROF PERD ────────

test('LE PROFESSEUR NE PERD RIEN, ET ON LE LUI DIT', () => {
    // Sans cette phrase, il hésite à cliquer — et il reste connecté sur
    // l'ordinateur de la salle informatique, avec ses classes, sa liste et les
    // codes de ses trente élèves ouverts au suivant qui s'assied.
    assert.match(RIEN_A_PERDRE_PROF, /serveur/);
    assert.match(RIEN_A_PERDRE_PROF, /reconnectant/);
});
