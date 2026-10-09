// La boîte à jeux : quelques exercices choisis, un lien, et rien d'autre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MAX_JEUX, MAX_REGLAGES_JOUEUR, politiqueDeBoite, faireUneBoite, estUneBoite,
    reglagesDuJoueur, clefDeLaBoite, memoireVide, rangerUnePartie, motDeLaCarte,
    LONGUEURS, LONGUEUR_DEFAUT, questionsSelonLongueur, motCourt,
    monogramme, familleDe, FAMILLES
} from '../js/core/boite.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { MODES } from '../js/core/policy.js';
import { readFileSync } from 'node:fs';
import { exercices } from '../js/data/catalog.js';

test('une boîte n\'est pas un devoir : pas de note, pas de seuil, pas d\'ordre', () => {
    const b = faireUneBoite({ nom: 'Les jeux de la 6e B', exercices: ['calc-sudoku', 'calc-mathodu'] });
    assert.equal(estUneBoite(b), true);
    assert.equal(b.name, 'Les jeux de la 6e B');
    assert.equal(b.steps.length, 2);
    // Rien à valider : `threshold: null` veut dire « aucune exigence ».
    b.steps.forEach(s => assert.equal(s.threshold, null));
    const pol = politiqueDeBoite();
    assert.equal(pol.mode, MODES.ENTRAINEMENT);
    assert.equal(pol.grading, null);
    assert.equal(pol.ordreLibre, true);
    // Le tirage adaptatif vise les faiblesses d'un élève connu ; ici personne
    // n'est connu.
    assert.equal(pol.adaptive, false);
});

test('un parcours ordinaire n\'est pas une boîte', () => {
    assert.equal(estUneBoite({ name: 'Séance 3', steps: [] }), false);
    assert.equal(estUneBoite(null), false);
    assert.equal(estUneBoite({ boite: 'oui' }), false);
});

test('une boîte ne prend pas plus de douze jeux', () => {
    const trop = Array.from({ length: 20 }, () => 'calc-sudoku');
    assert.equal(faireUneBoite({ exercices: trop }).steps.length, MAX_JEUX);
});

test('LA MARQUE VOYAGE DANS LE LIEN, et c\'est elle qui change l\'arrivée', () => {
    const b = faireUneBoite({ nom: 'Les jeux du mercredi', exercices: ['calc-sudoku', 'calc-mathodu'] });
    const code = Shortcodes.encodePath(b);
    assert.ok(code, 'une boîte doit savoir s\'encoder');
    const relu = Shortcodes.decodePath(code);
    assert.equal(estUneBoite(relu), true, 'la marque doit survivre à l\'aller-retour');
    // ET LE NOM AUSSI : c'est ce que le joueur lit en grand à l'arrivée, et le
    // nom sous lequel il installe la boîte sur son écran d'accueil.
    assert.equal(relu.name, 'Les jeux du mercredi');
    assert.deepEqual(relu.steps.map(s => s.exerciseId), ['calc-sudoku', 'calc-mathodu']);
});

test('une boîte ne part jamais en chaîne courte, parce que son nom s\'y perdrait', () => {
    const b = faireUneBoite({ nom: 'Les jeux du mercredi', exercices: ['calc-sudoku'] });
    const code = Shortcodes.encodePath(b);
    assert.ok(code.startsWith('M2-'), 'le format complet, seul à porter le nom');
    assert.ok(Shortcodes.raisonsDuCodeLong(b).some(r => /boîte/.test(r)),
        'et la raison doit se lire en français');
});

test('LE MÊME LIEN DÉSIGNE LA MÊME BOÎTE, donc la même mémoire', () => {
    // L'identité d'un parcours reçu par code se dérive de son contenu : sans
    // cela, la mémoire locale du joueur repartirait de zéro à chaque ouverture.
    const b = faireUneBoite({ nom: 'Jeux', exercices: ['calc-sudoku', 'calc-mathodu'] });
    const code = Shortcodes.encodePath(b);
    const clef = clefDeLaBoite(Shortcodes.decodePath(code));
    assert.equal(clef, clefDeLaBoite(Shortcodes.decodePath(code)));
    assert.ok(clef.startsWith('mathbox-boite-'));
    // Une autre boîte, une autre mémoire.
    const autre = faireUneBoite({ nom: 'Jeux', exercices: ['calc-sudoku'] });
    assert.notEqual(clef, clefDeLaBoite(Shortcodes.decodePath(Shortcodes.encodePath(autre))));
});

test('les réglages du joueur : deux au plus, et seulement des choix fermés courts', () => {
    const schema = [
        { id: 'nbQuestions', type: 'number', label: 'Questions' },
        { id: 'taille', type: 'select', label: 'Taille', options: [{ value: 4 }, { value: 6 }, { value: 9 }] },
        { id: 'difficulte', type: 'select', label: 'Difficulté', options: [{ value: 'facile' }, { value: 'moyen' }] },
        { id: 'operations', type: 'multi', label: 'Opérations', options: [{ value: 'add' }, { value: 'sub' }] },
        { id: 'aide', type: 'checkbox', label: 'Aide' }
    ];
    const vus = reglagesDuJoueur(schema);
    assert.equal(vus.length, MAX_REGLAGES_JOUEUR);
    // LA DIFFICULTÉ D'ABORD : c'est le réglage qu'un joueur comprend sans
    // qu'on lui explique. La taille ensuite.
    assert.deepEqual(vus.map(c => c.id), ['difficulte', 'taille']);
    // Un nombre libre, une liste à cocher et une case à cocher sont des
    // réglages de professeur ; ils restent au professeur.
    assert.equal(reglagesDuJoueur([schema[0], schema[3], schema[4]]).length, 0);
    assert.deepEqual(reglagesDuJoueur(null), []);
});

test('un réglage inconnu de la liste des préférés ne s\'invite pas', () => {
    const schema = [{ id: 'couleurDuFond', type: 'select', label: 'Fond', options: [{ value: 'a' }, { value: 'b' }] }];
    assert.deepEqual(reglagesDuJoueur(schema), []);
});

test('la mémoire garde trois choses par jeu, et rien de plus', () => {
    let m = memoireVide();
    m = rangerUnePartie(m, { exoId: 'calc-sudoku', reussies: 4, total: 6, reglages: { taille: 6 } });
    assert.equal(m.jeux['calc-sudoku'].parties, 1);
    assert.equal(m.jeux['calc-sudoku'].meilleur, 4);
    assert.deepEqual(m.jeux['calc-sudoku'].reglages, { taille: 6 });

    // Une partie moins bonne ne remplace pas le meilleur, mais compte quand même.
    m = rangerUnePartie(m, { exoId: 'calc-sudoku', reussies: 2, total: 6 });
    assert.equal(m.jeux['calc-sudoku'].parties, 2);
    assert.equal(m.jeux['calc-sudoku'].meilleur, 4);

    // À TOTAL DIFFÉRENT, C'EST LA PART QUI DÉCIDE : « 4 sur 4 » vaut mieux que
    // « 5 sur 20 », et un compte brut se serait trompé.
    let n = rangerUnePartie(memoireVide(), { exoId: 'j', reussies: 5, total: 20 });
    n = rangerUnePartie(n, { exoId: 'j', reussies: 4, total: 4 });
    assert.equal(n.jeux.j.meilleur, 4);
    assert.equal(n.jeux.j.total, 4);

    // Une partie abandonnée (pas de total) compte comme partie, pas comme score.
    let a = rangerUnePartie(memoireVide(), { exoId: 'j', reussies: 0, total: 0 });
    assert.equal(a.jeux.j.parties, 1);
    assert.equal(a.jeux.j.meilleur, null);
});

test('ranger une partie ne touche pas la mémoire qu\'on lui donne', () => {
    const avant = rangerUnePartie(memoireVide(), { exoId: 'j', reussies: 3, total: 5 });
    const apres = rangerUnePartie(avant, { exoId: 'j', reussies: 5, total: 5 });
    assert.equal(avant.jeux.j.parties, 1);
    assert.equal(apres.jeux.j.parties, 2);
});

test('la carte ne dit rien tant qu\'on n\'a pas joué', () => {
    assert.equal(motDeLaCarte(null), '');
    assert.equal(motDeLaCarte({ parties: 0 }), '');
    assert.equal(motDeLaCarte({ parties: 1, meilleur: null }), '1 partie');
    assert.equal(motDeLaCarte({ parties: 3, meilleur: 4, total: 6 }), '3 parties · meilleur 4 sur 6');
});

test('LA LONGUEUR DE LA PARTIE VAUT POUR LES DEUX CENT SEIZE', () => {
    // Rémy : « on est d'accord que c'est pour tous les exercices ». La
    // difficulté n'existe que dans vingt-deux d'entre eux ; la longueur, elle,
    // ne demande rien à l'exercice — juste son nombre de questions conseillé.
    assert.deepEqual(LONGUEURS.map(l => l.id), ['courte', 'moyenne', 'longue']);
    assert.equal(LONGUEUR_DEFAUT, 'moyenne');
    // Vingt questions conseillées pour un réflexe de calcul.
    assert.equal(questionsSelonLongueur(20, 'courte'), 10);
    assert.equal(questionsSelonLongueur(20, 'moyenne'), 20);
    assert.equal(questionsSelonLongueur(20, 'longue'), 40);
    // Deux grilles de sudoku : « courte » vaut UNE grille, pas zéro.
    assert.equal(questionsSelonLongueur(2, 'courte'), 1);
    assert.equal(questionsSelonLongueur(1, 'courte'), 1);
    // Et jamais une punition.
    assert.equal(questionsSelonLongueur(40, 'longue'), 60);
    // Ce qu'on ne comprend pas vaut le conseil de l'exercice.
    assert.equal(questionsSelonLongueur(12, 'nimporte'), 12);
    assert.equal(questionsSelonLongueur(null, 'moyenne'), 10);
});

test('L\'ÉTIQUETTE DU JOUEUR EST UN MOT, PAS UNE PHRASE', () => {
    // Mesuré sur la carte du Sudoku : les étiquettes du schéma expliquent,
    // parce qu'elles sont écrites pour le professeur. Sur un bouton de boîte,
    // chacune prenait une ligne entière.
    assert.equal(motCourt('Tutoriel — presque tout est donné, et le jeu guide'), 'Tutoriel');
    assert.equal(motCourt('Facile (candidat unique)'), 'Facile');
    assert.equal(motCourt('Difficile (le minimum de cases)'), 'Difficile');
    assert.equal(motCourt('4 × 4 (blocs 2×2)'), '4 × 4');
    // Ce qui est déjà court ne bouge pas.
    assert.equal(motCourt('Moyen'), 'Moyen');
    assert.equal(motCourt('Taille de la grille'), 'Taille de la grille');
    // Un tiret DANS un mot n'est pas une explication qui commence.
    assert.equal(motCourt('Demi-droite'), 'Demi-droite');
    assert.equal(motCourt(''), '');
    assert.equal(motCourt(null), '');
});

test('le monogramme saute les petits mots', () => {
    // « Le Compte est Bon » donne CB et non LC : les articles et les verbes
    // d'appui sont les mêmes partout, et deux tuiles sur trois porteraient la
    // même lettre.
    assert.equal(monogramme('Le Compte est Bon'), 'CB');
    assert.equal(monogramme('La Chasse aux Zéros'), 'CZ');
    assert.equal(monogramme('Quelle heure est-il ?'), 'QH');
    assert.equal(monogramme('Sudoku'), 'S');
    assert.equal(monogramme(''), '');
    assert.equal(monogramme(null), '');
    // Un titre qui ne serait FAIT que de petits mots garde quand même un signe.
    assert.equal(monogramme('de la'), 'DL');
});

test('CHAQUE EXERCICE DU CATALOGUE A UNE FAMILLE DE COULEUR DÉCLARÉE', () => {
    // LA FAUTE QUE CE TEST EXISTE POUR EMPÊCHER, et elle a été commise : la
    // feuille de style déclarait huit familles, `familleDe` en rendait neuf.
    // Les TRENTE-SIX exercices de logique — le sixième du catalogue —
    // retombaient sur la couleur par défaut, c'est-à-dire celle du calcul.
    // Rien ne casse, rien ne s'affiche en rouge : la grille est seulement plus
    // terne qu'elle ne devrait, et personne ne sait pourquoi.
    const css = readFileSync('css/modules.css', 'utf8');
    const manquantes = FAMILLES.filter(f =>
        !css.includes(`.bj-jeu[data-dom="${f}"]`)
        || !css.includes(`.bj-feuille-panneau[data-dom="${f}"]`));
    assert.deepEqual(manquantes, [], 'familles sans couleur en CSS');

    const inconnues = [...new Set(exercices.map(e => familleDe(e)))]
        .filter(f => !FAMILLES.includes(f));
    assert.deepEqual(inconnues, [], 'familles rendues mais non déclarées');

    // ET AUCUNE FAMILLE DÉCLARÉE NE DOIT ÊTRE VIDE : une teinte que personne ne
    // porte est une ligne de style qu'on gardera dix ans sans le savoir.
    const portees = new Set(exercices.map(e => familleDe(e)));
    assert.deepEqual(FAMILLES.filter(f => !portees.has(f)), [],
        'familles déclarées que plus aucun exercice ne porte');
});
