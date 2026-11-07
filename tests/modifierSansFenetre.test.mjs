// ON MODIFIE DANS LA CELLULE, ET AUCUNE FENÊTRE NE S'OUVRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 13 octobre : « j'aimerais bien changer sans popup ». C'est sa ligne
// rouge de toujours — « tu utilises des alert et prompt, on évite ! » — poussée
// d'un cran : même une fenêtre maison est un détour quand la valeur est sous
// les yeux. Le prénom, l'identifiant et le code se modifient donc comme dans
// un tableur, dans la cellule.
//
// ── POURQUOI CETTE ÉPREUVE, ET PAS SEULEMENT LA SONDE ─────────────────────
//
// Le chemin repassera par ici. Les deux boutons de la ligne ouvraient une
// fenêtre ce matin, et c'est en les y laissant qu'on recréerait le détour sans
// s'en apercevoir : la fenêtre marche, elle écrit, rien ne rougit. Seul ce
// fichier dit que ce n'était pas la demande.
//
// `tools/tmp/sansPopup.mjs` le mesure dans un vrai navigateur, en tapant au
// clavier : « la cellule s'ouvre · aucune fenêtre · tout passe, point
// compris ». Celle-ci garde le choix, et elle est quatre minutes plus rapide.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = 'js/ui/espaceClasses.js';
const source = readFileSync(SOURCE, 'utf8');

/**
 * Le corps de la fonction qui ouvre une cellule.
 *
 * On le découpe de sa déclaration à celle qui suit : chercher dans tout le
 * fichier ne garderait rien, `demander(` y étant appelé quinze fois pour des
 * gestes qui, eux, méritent une fenêtre — « écrivez RETIRER pour confirmer ».
 */
function corpsDeLEdition() {
    const i = source.indexOf('function modifierDansLaCellule(');
    assert.notEqual(i, -1,
        `la fonction d'édition dans la cellule a disparu de ${SOURCE}.`);
    const fin = source.indexOf('\nasync function ', i);
    return source.slice(i, fin === -1 ? source.length : fin);
}

test('MODIFIER UNE CELLULE N\'OUVRE AUCUNE FENÊTRE', () => {
    const corps = corpsDeLEdition();
    assert.ok(!/\bdemander\s*\(/.test(corps),
        'l\'édition dans la cellule rouvre une fenêtre.\n'
        + 'Rémy : « j\'aimerais bien changer sans popup ». La valeur est sous les\n'
        + 'yeux : la cellule doit devenir un champ, comme dans un tableur.');
    assert.match(corps, /createElement\('input'\)/,
        'l\'édition dans la cellule ne crée plus de champ de saisie.');
});

test('LES TROIS CHAMPS DE LA LIGNE PASSENT PAR LÀ', () => {
    // Un seul des trois oublié, et il resterait le seul à ouvrir une fenêtre —
    // l'incohérence qu'on ne remarque qu'en l'utilisant.
    const i = source.indexOf('const CHAMPS_MODIFIABLES');
    assert.notEqual(i, -1, 'la table des champs modifiables a disparu.');
    const table = source.slice(i, source.indexOf('};', i));
    for (const champ of ['prenom', 'pseudo', 'code']) {
        assert.match(table, new RegExp(`\\b${champ}\\s*:`),
            `« ${champ} » ne fait plus partie des champs modifiables dans la cellule.`);
    }
});

test('ÉCHAP DANS UNE CELLULE NE FERME PAS LA CLASSE', () => {
    // LA PIÈCE ÉCOUTE « ÉCHAP » POUR SE FERMER. Sans arrêt de la touche, un
    // élève à moitié renommé fait perdre tout l'écran — et le professeur
    // revient sur la liste des classes sans savoir pourquoi.
    const corps = corpsDeLEdition();
    assert.match(corps, /stopPropagation\(\)/,
        'la touche n\'est plus arrêtée dans la cellule : « Échap » y remontera\n'
        + 'jusqu\'à l\'écouteur de la pièce, qui ferme la classe.');
});
