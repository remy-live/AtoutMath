// LA MOYENNE S'ÉCRIT COMME UN CALCUL, ET LA PONDÉRÉE PÈSE VRAIMENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « pour la moyenne il faudrait que l'élève écrive le
// calcul (avec parenthèses) et il faut de la moyenne pondérée ».
//
// Puis, en voyant la question à l'écran : « si ce sont des notes avec coeff tu
// peux le présenter en tableau pour les moyennes pondérées ».
//
// ── CE QUE CETTE ÉPREUVE GARDE ────────────────────────────────────────────
//
// Le JUGE d'abord — ce qu'il accepte et surtout ce qu'il refuse, puisque c'est
// le refus qui enseigne. Puis les deux marches, et les trois pièges qu'on a vus
// de ses yeux à l'écran : le clavier de chiffres sous une question à
// parenthèses, la touche « ² » sur une moyenne d'âges, et des coefficients tous
// égaux à 1 — une moyenne ordinaire habillée en tableau.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { lireCalcul, memesNombres, verifieMoyenneEcrite } from '../js/core/statistiques.js';
import { statistiquesGenerator } from '../js/core/generators/statistiques.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/** Tire une question de cette marche-là, avec une graine qu'on choisit. */
const tirer = (marche, graine = 'a') => statistiquesGenerator.generate(
    { marches: [marche] }, { rng: makeRng(graine), index: 0 });

// ─────────────────────────────────────────────────────── LE JUGE ────────────

test('LE CALCUL SE LIT SANS JAMAIS ÊTRE ÉVALUÉ', () => {
    // LA GRAMMAIRE EST FERMÉE, et c'est la seule raison pour laquelle on peut
    // lire une saisie d'élève : chiffres, les quatre signes, les parenthèses,
    // rien d'autre. Un `eval` sur un champ de saisie exécuterait ce qu'un élève
    // y tape — la plus vieille faute du métier, et elle n'a pas sa place dans
    // un logiciel qu'on installe dans un collège.
    //
    // ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER, et c'est la TROISIÈME fois
    // que ce piège se referme sur moi : mon premier jet lisait le mot « eval »
    // dans le commentaire qui EXPLIQUE la règle, à trois lignes de la fonction
    // qu'il protège. L'épreuve tombait donc sur du code sain, et précisément
    // parce qu'il était bien documenté. Dans ce dépôt, chercher un mot interdit
    // dans un fichier source sans retirer ses commentaires ne peut pas marcher.
    assert.ok(!/\beval\b|new Function/.test(sansCommentaires(lire('js/core/statistiques.js'))),
        'une saisie d\'élève ne s\'évalue jamais : elle se lit');
    assert.equal(lireCalcul('(12+15+18)/3').valeur, 15);
    assert.deepEqual(lireCalcul('(12+15+18)/3').nombres, [12, 15, 18, 3]);
    assert.equal(lireCalcul('(12+15+18)/3').parentheses, true);
    // LA BARRE DE FRACTION ET LE SIGNE DE DIVISION SONT LE MÊME GESTE : le
    // clavier écrit « / », la calculatrice de l'élève affiche « ÷ », et sa
    // leçon porte les deux. Refuser l'un des deux serait noter une touche.
    assert.equal(lireCalcul('(12+15+18)÷3').valeur, 15);
    // ET CE QUI N'EST PAS UN CALCUL N'EN DEVIENT PAS UN.
    assert.equal(lireCalcul('bonjour'), null);
    assert.equal(lireCalcul('(12+15'), null, 'une parenthèse ouverte et jamais fermée');
    assert.equal(lireCalcul(''), null);
});

test('LES TROIS REFUS, ET CHACUN DIT AUTRE CHOSE', () => {
    const serie = [12, 15, 18];
    const juste = verifieMoyenneEcrite('(12+15+18)/3', serie, 3);
    assert.equal(juste.juste, true);
    // ── LA FAUTE DU CHAPITRE, ET ELLE EST LA RAISON D'ÊTRE DE LA MARCHE ──
    //
    // 12+15+18/3 vaut 33. Sans parenthèses, seule la DERNIÈRE valeur est
    // divisée. Cette faute est invisible tant qu'on ne demande que le
    // résultat ; ici elle se voit, et le refus doit la NOMMER — « faux » tout
    // seul apprend qu'on s'est trompé, et rien d'autre.
    const sansParentheses = verifieMoyenneEcrite('12+15+18/3', serie, 3);
    assert.equal(sansParentheses.juste, false);
    assert.match(sansParentheses.pourquoi, /parenthès/i,
        'le refus doit nommer les parenthèses, pas seulement refuser');
    // ── UN CALCUL QUI OUBLIE DES VALEURS ─────────────────────────────────
    const incomplet = verifieMoyenneEcrite('(12+15)/2', serie, 3);
    assert.equal(incomplet.juste, false);
    // ── ET LE RÉSULTAT TAPÉ À LA PLACE DU CALCUL ─────────────────────────
    //
    // C'est la réponse qu'on acceptait AVANT cette marche, et c'est
    // exactement celle qu'elle existe pour refuser.
    assert.equal(verifieMoyenneEcrite('15', serie, 3).juste, false);
    assert.equal(verifieMoyenneEcrite('45/3', serie, 3).juste, false,
        'la somme déjà faite n\'est plus le calcul de la moyenne');
});

test('TOUS LES ORDRES DE LA SOMME SONT JUSTES', () => {
    // L'ADDITION EST COMMUTATIVE, et un élève qui range la série avant de
    // l'additionner — ce qu'on lui demande pour la médiane — ne doit pas se
    // voir refuser sa moyenne. Comparer les chaînes aurait noté l'ORDRE DE
    // SAISIE, qui n'est le sujet d'aucune leçon.
    const serie = [12, 15, 18];
    for (const ecrit of ['(12+15+18)/3', '(18+15+12)/3', '(15+12+18)/3']) {
        assert.equal(verifieMoyenneEcrite(ecrit, serie, 3).juste, true, ecrit);
    }
    // MAIS LES MÊMES NOMBRES, PAS N'IMPORTE LESQUELS : une valeur répétée
    // compte autant de fois qu'elle apparaît.
    assert.equal(memesNombres([4, 4, 7], [4, 7, 7]), false);
    assert.equal(memesNombres([4, 4, 7], [7, 4, 4]), true);
    assert.equal(verifieMoyenneEcrite('(12+12+18)/3', serie, 3).juste, false);
});

// ───────────────────────────────────────────────── LES DEUX MARCHES ─────────

test('« ÉCRIRE LE CALCUL » DEMANDE UN TEXTE, ET SON PROPRE CLAVIER', () => {
    const it = tirer('moyenne-calcul');
    // UNE RÉPONSE ÉCRITE EST UN TEXTE : `(12+15+18)/3` ne se compare pas
    // comme un nombre, et c'est `verifieTexte` qui juge.
    assert.equal(it.answerKind, 'text');
    assert.equal(typeof it.verifieTexte, 'function');
    assert.equal(it.choices, null, 'on ne propose pas quatre calculs à reconnaître');
    assert.equal(it.meta.saisieSeule, true);
    assert.equal(it.meta.composable, 'litteral');
    assert.equal(it.meta.parentheses, true, 'sans elles, la question est intapable');
    assert.equal(it.meta.fraction, true);
    // ── LA TOUCHE « ² » EST ALLUMÉE PAR DÉFAUT, ET IL FAUT L'ÉTEINDRE ────
    //
    // VU À L'ÉCRAN : un « ² » seul, flottant au-dessus du pavé, sur une
    // moyenne d'âges. `exposant: false` ne la retient pas — ce sont deux
    // réglages distincts dans `litteralSaisie` (l'un la touche « ² », l'autre
    // la touche « ^ »), et seul `carre: false` l'éteint.
    assert.equal(it.meta.carre, false, 'un carré n\'a rien à faire dans une moyenne');
    assert.equal(it.meta.multiplication, false);
    // ET LE JUGE DE L'ITEM EST BIEN CELUI DE CETTE SÉRIE-LÀ.
    assert.equal(it.verifieTexte(`(${it.meta.serie.join('+')})/${it.meta.serie.length}`).juste,
        true);
    assert.equal(it.verifieTexte(it.meta.serie.join('+') + '/' + it.meta.serie.length).juste,
        false);
});

test('LE PAVÉ DE CHIFFRES PASSE LA MAIN AU CLAVIER QUE LA QUESTION DEMANDE', () => {
    // LE DÉFAUT MESURÉ À L'ÉCRAN, et il ne venait pas du générateur : l'item
    // disait tout — `saisieSeule`, `composable: 'litteral'` —, mais ces deux
    // mots n'étaient lus QUE par le QCM (`choice.js`), l'aiguilleur des
    // claviers. Or `don-statistiques` écrit `activityId: 'numpad'` : il
    // n'emprunte jamais le QCM, arrive droit au pavé de chiffres, et personne
    // ne lisait plus rien. L'élève recevait 0-9 sous « Écris le CALCUL de la
    // moyenne, avec les parenthèses ».
    const NUM = lire('js/core/activities/numeric.js');
    assert.match(NUM, /const COMPOSABLES = \{[^}]*litteral: '\.\/litteralSaisie\.js'/,
        'le pavé doit connaître les claviers composés');
    // ── ET IL FAUT QUE LA ROUTE SOIT EMPRUNTÉE, PAS SEULEMENT ÉCRITE ────
    //
    // PREMIER JET DE CETTE ÉPREUVE : elle cherchait le mot `clavierVoulu`
    // n'importe où dans le fichier. `epreuveTombe` l'a prise en flagrant
    // délit — on retire les deux lignes qui APPELLENT la route dans
    // `renderNext`, la table et la fonction restent écrites juste au-dessus,
    // et l'épreuve repasse au vert sur un logiciel à nouveau cassé. On lit
    // donc l'intérieur de `renderNext`, qui est l'endroit où la question
    // suivante choisit son clavier.
    const i = NUM.indexOf('function renderNext');
    assert.notEqual(i, -1);
    const corps = NUM.slice(i, NUM.indexOf('\n    }', i));
    assert.match(corps, /clavierVoulu\(item\)/,
        'chaque nouvelle question doit redemander quel clavier elle veut');
    assert.match(corps, /passerALaMain\(/, 'et passer la main quand ce n\'est pas le nôtre');
    // ET IL REND LA MAIN : un exercice mêle les deux formes d'une marche à
    // l'autre — « Écris le CALCUL » veut les parenthèses, « Moyenne ? » veut
    // les chiffres. Sans retour, le clavier d'expressions resterait pour toute
    // la fin de la séance.
    assert.match(NUM, /function reprendreLaMain/);
    assert.match(NUM, /rendreLaMain: reprendreLaMain/);
    // LA TABLE EST LA MÊME DES DEUX CÔTÉS. Deux tables qui divergeraient
    // rendraient le défaut à la question suivante, et il serait invisible une
    // seconde fois.
    const CHOICE = lire('js/core/activities/choice.js');
    for (const cle of ['litteral', 'notation', 'trace']) {
        assert.ok(CHOICE.includes(`${cle}: './`), `choice.js doit connaître « ${cle} »`);
        assert.ok(NUM.includes(`${cle}: './`), `numeric.js doit connaître « ${cle} »`);
    }
});

test('LA PONDÉRÉE PÈSE VRAIMENT, SUR CINQ CENTS TIRAGES', () => {
    let toutesEgales = 0, doublons = 0, faux = 0;
    for (let i = 0; i < 500; i++) {
        const it = tirer('moyenne-ponderee', 'p' + i);
        const coefs = (it.explanation.match(/(\d+) × (\d+)/g) || [])
            .map(s => Number(s.split('×')[1]));
        // ── DES COEFFICIENTS TOUS ÉGAUX NE PÈSENT RIEN ──────────────────
        //
        // VU À L'ÉCRAN : « Note 14 · 11 / Coefficient 1 · 1 ». C'est une
        // moyenne ORDINAIRE habillée en tableau — diviser par la somme des
        // coefficients et diviser par le nombre de notes donnent alors le
        // MÊME résultat. La faute du chapitre n'est plus seulement invisible,
        // elle est impossible.
        if (coefs.length && coefs.every(c => c === coefs[0])) toutesEgales++;
        const vals = it.choices.map(c => c.value);
        // ET LE LEURRE QUI PORTE CETTE FAUTE VAUDRAIT ALORS LA BONNE
        // RÉPONSE : on la proposerait deux fois, dont une marquée fausse —
        // l'élève cliquerait le bon nombre et se verrait refusé.
        if (new Set(vals).size !== vals.length) doublons++;
        if (it.choices.filter(c => c.correct).length !== 1) faux++;
    }
    assert.equal(toutesEgales, 0, 'des coefficients tous égaux font une moyenne ordinaire');
    assert.equal(doublons, 0, 'une valeur proposée deux fois');
    assert.equal(faux, 0, 'il faut exactement une bonne réponse');
});

test('LES NOTES ET LEURS COEFFICIENTS S\'AFFICHENT EN TABLEAU', () => {
    // RÉMY : « si ce sont des notes avec coeff tu peux le présenter en tableau
    // pour les moyennes pondérées ». Écrite en ligne, « 15 (coef. 1) · 16
    // (coef. 4) » demande de tenir quatre nombres APPARIÉS dans la tête avant
    // de commencer, et la somme des coefficients — par laquelle il faut
    // diviser — n'est écrite nulle part.
    const it = tirer('moyenne-ponderee', 'tab');
    assert.match(it.prompt.html, /<table class="st-coefs">/);
    assert.match(it.prompt.html, /<th scope="row">Note<\/th>/);
    assert.match(it.prompt.html, /<th scope="row">Coefficient<\/th>/);
    // AUTANT DE CASES QUE DE NOTES SUR CHAQUE LIGNE : une ligne plus courte
    // que l'autre désapparierait silencieusement les colonnes, ce que le
    // tableau existe précisément pour empêcher.
    const [l1, l2] = it.prompt.html.match(/<tr>[\s\S]*?<\/tr>/g);
    assert.equal((l1.match(/<td>/g) || []).length, (l2.match(/<td>/g) || []).length);
    // ET LA FEUILLE IMPRIMÉE GARDE L'ÉNONCÉ EN TOUTES LETTRES : jsPDF ne
    // dessine pas ce tableau, et une feuille à moitié dessinée ne se répond
    // pas. Le texte porte donc les coefficients, comme avant.
    assert.match(it.prompt.papier, /coef\. \d/);
    assert.ok(!it.prompt.papier.includes('<'), 'la feuille ne porte pas de balises');
    // LE TABLEAU EST DANS L'ÉNONCÉ, DONC IL EST LU PAR LA VOIX DE SYNTHÈSE :
    // `<th scope="row">` et non des cases mises en forme.
    assert.ok(!/<div class="st-coefs"/.test(it.prompt.html));
    // ET LA FEUILLE DE STYLE L'HABILLE — un tableau sans règle de style hérite
    // du gris de l'interface et s'étale sur toute la colonne.
    assert.match(lire('css/modules.css'), /\.st-coefs \{/);
});
