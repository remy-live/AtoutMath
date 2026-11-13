// LES RÈGLES DES PUISSANCES, ET LE JEU QUI BOUGE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX DEMANDES DE RÉMY, LE MÊME JOUR :
//
//   « et un exercice sur les règles sur les puissances 10^3 * 10^2 =
//     10^(3+2) = 10^5 et on écrit l'opération sur les exposants à chaque fois »
//
//   « on peut faire un mode rigolo ou les cases bougent 🙂 »
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ÇA NE SE VOIT PAS AUTREMENT ────
//
// UN IDENTIFIANT DE MARCHE MAL ORTHOGRAPHIÉ NE DIT RIEN. `marchesCochees` ne
// rend JAMAIS une liste vide — c'est écrit dans `core/progression.js`, et
// c'est la bonne décision : « tout décocher est un geste qu'on fait en
// passant ». Mais la conséquence ici est redoutable : si l'un des cinq
// identifiants de cette entrée cessait de correspondre à une marche du
// générateur — renommée, supprimée, mal tapée —, l'exercice retomberait
// silencieusement sur les NEUF marches, et rouvrirait sur « Combien vaut
// 10³ ? », c'est-à-dire sur le défaut même qu'on vient de fermer. Rien ne
// planterait, aucun message n'apparaîtrait.
//
// C'est précisément le genre de panne qu'une épreuve doit tenir, parce qu'un
// professeur, lui, croirait simplement que le logiciel a changé d'avis.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExerciseById } from '../js/data/catalog.js';
import { ORDRE, ETAPES, puissancesCalculGenerator, quotientHtml } from '../js/core/generators/puissancesCalcul.js';
import { makeRng } from '../js/core/ids.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';

test('LES RÈGLES DES PUISSANCES OUVRENT SUR UNE RÈGLE', () => {
    const exo = getExerciseById('num-puissances-regles');
    assert.ok(exo, 'num-puissances-regles manque au catalogue');
    assert.equal(exo.generatorId, 'num.puissances-calcul',
        'pas une ligne de moteur à elle : c’est le générateur qui existait');
    // LA LIGNE DU MILIEU EST TOUT L'OBJET DE LA DEMANDE : « on écrit
    // l'opération sur les exposants à chaque fois ».
    assert.equal(exo.params.etapes, 'oui');
});

test('LES CINQ MARCHES CHOISIES EXISTENT VRAIMENT', () => {
    const exo = getExerciseById('num-puissances-regles');
    const connues = new Set(ORDRE);
    for (const id of exo.params.marches) {
        assert.ok(connues.has(id),
            `« ${id} » n’est pas une marche du générateur : l’exercice retomberait `
            + 'en silence sur les neuf, donc sur « Combien vaut 10³ ? »');
    }
});

test('ET CE SONT LES MARCHES OÙ L’ON ÉCRIT SUR LES EXPOSANTS', () => {
    const exo = getExerciseById('num-puissances-regles');
    const pris = new Set(exo.params.marches);
    // LES TROIS RÈGLES DU PROGRAMME, avec et sans exposants négatifs.
    for (const id of ['produit', 'quotient', 'produitRelatif', 'quotientRelatif',
        'puissanceDePuissance']) {
        assert.ok(pris.has(id), `la marche « ${id} » devrait être travaillée ici`);
    }
    // ET PAS CELLES OÙ IL N'Y A RIEN À ÉCRIRE SUR LES EXPOSANTS. 2⁵ et (−3)²
    // sont des puissances, pas des règles : la ligne du milieu y dirait
    // « 2 × 2 × 2 × 2 × 2 », ce qui est juste et hors sujet ici.
    for (const id of ['valeur', 'carreNegatif']) {
        assert.ok(!pris.has(id),
            `la marche « ${id} » n’a pas d’opération sur les exposants à écrire`);
    }
    // Les marches existent toujours ailleurs : on ne les a retirées à personne.
    const calcul = getExerciseById('num-puissances-calcul');
    assert.ok(calcul && !calcul.params?.marches,
        '« Calculer avec des Puissances » garde ses neuf marches');
    assert.ok(ETAPES.some(e => e.id === 'valeur'));
});

test('ET ELLES ONT UN CODE DICTÉ', () => {
    const code = CODES_EXERCICES['num-puissances-regles'];
    assert.match(code || '', /^[A-Z]{2}$/);
    // L'ALPHABET À 23 LETTRES : ni I, ni O, ni Q — elles se confondent à
    // l'oral et à l'écrit avec 1, 0 et G.
    assert.ok(!/[IOQ]/.test(code), `« ${code} » emploie une lettre interdite`);
});

test('CHAQUE EXPOSANT NÉGATIF PREND SES PARENTHÈSES', () => {
    // RÉMY : « pour 10^(-3) / 10^(-5) il faut bien faire l'opération
    // 10^((-3)-(-5)) pour bien comprendre le principe. »
    //
    // ON N'ÉCRIVAIT LES PARENTHÈSES QUE SUR LE SECOND — « −8 − (−3) » —, ce
    // qui est juste et ne montre qu'à MOITIÉ ce qu'on fait. MESURÉ AU
    // NAVIGATEUR avant de corriger : le gabarit affichait « □^(−□ − (…)) ».
    // L'élève doit voir DEUX NOMBRES RELATIFS et une opération entre eux.
    //
    // ── LE 13 NOVEMBRE, LE « 10^( ) » A DISPARU, ET PAS LA RÈGLE ──────────
    //
    // RÉMY : « dans la réponse ne demande que l'exposant, j'aime pas
    // l'écriture 10^3 pour les élèves ». La ligne ne porte donc plus que
    // l'opération — le 10 est écrit par l'activité, devant le champ. Les deux
    // parenthèses, elles, sont exactement ce qu'il demandait la veille, et
    // elles restent.
    //
    // CETTE ÉPREUVE ÉPINGLAIT L'ÉCRITURE ENTIÈRE, « 10^((−8) − (−6)) », et
    // elle est donc tombée en rouge alors que ce qu'elle garde n'avait pas
    // bougé. C'est la deuxième fois ce mois-ci, et c'est noté au journal des
    // frictions : une épreuve qui lit du code épingle CE QU'ELLE GARDE, pas la
    // ligne où ça se trouve.
    const MOINS = '\u2212';
    let vus = 0;
    for (let i = 0; i < 40; i++) {
        const q = puissancesCalculGenerator.generate(
            { etapes: 'oui', marches: ['quotientRelatif'] },
            { rng: makeRng(`quotient-${i}`), index: 0 });
        const montrer = (q.meta?.etapes || [])[0]?.montrer || '';
        if (!montrer) continue;
        vus++;
        assert.match(montrer,
            new RegExp(`^\\(${MOINS}\\d+\\) ${MOINS} \\(${MOINS}\\d+\\)$`),
            `« ${montrer} » : les DEUX exposants doivent être entre parenthèses`);
        // ET PLUS D'ACCENT CIRCONFLEXE : c'est la demande du 13 novembre, et
        // la touche n'existe même plus sur le pavé de cette marche.
        assert.ok(!/\^/.test(montrer), `« ${montrer} » garde une écriture de clavier`);
        // ET LE MODÈLE QUE L\u2019ÉLÈVE VOIT porte les mêmes parenthèses :
        // c\u2019est lui qui dit quoi écrire. MESURÉ AU NAVIGATEUR avant la
        // correction : « □^(−□ − (…)) ».
        assert.match((q.meta.etapes[0].modele || ''), /^\(…\) /,
            `le modèle « ${q.meta.etapes[0].modele} » doit ouvrir sur une parenthèse`);
        // ET LA BASE EST ÉCRITE PAR L'ACTIVITÉ, devant le champ : sans elle,
        // l'élève qui lit « (…) − (…) » ne saurait pas de quoi c'est
        // l'exposant.
        assert.equal(q.meta.base, '10', 'le 10 doit être posé devant le champ');
    }
    assert.ok(vus > 0, 'aucune ligne du milieu tirée : l\u2019épreuve ne mesure rien');
});

test('UN QUOTIENT S\u2019ÉCRIT EN DIVISION OU EN FRACTION', () => {
    // RÉMY : « pour les divisions de puissances, tu le présentes en division
    // ou est en fraction » — puis « fais les deux ».
    assert.match(quotientHtml(8, 3, false), /\u00F7/);
    assert.ok(!/qp-frac/.test(quotientHtml(8, 3, false)));

    const f = quotientHtml(8, 3, true);
    assert.match(f, /qp-frac/);
    assert.match(f, /qp-num/);
    assert.match(f, /qp-den/);
    // JAMAIS DE BARRE OBLIQUE, et c'est une décision déjà prise dans le
    // dépôt : « une fraction s'écrit EN COLONNE — numérateur sur
    // dénominateur —, et la barre oblique est une commodité d'écran ; une
    // feuille qui l'imprime enseigne le contraire du cours ».
    assert.ok(!f.includes('/10'), `« ${f} » : pas de barre oblique`);
    assert.ok(!f.includes('\u00F7'), 'la fraction remplace le signe, elle ne s\u2019y ajoute pas');
});

test('MAIS L\u2019ÉNONCÉ LU NE CHANGE PAS', () => {
    // `prompt` est lu à voix haute, journalisé et comparé : une fraction
    // dessinée n'y aurait pas de sens. Seul l'AFFICHAGE empile.
    for (const q of ['division', 'fraction']) {
        const item = puissancesCalculGenerator.generate(
            { marches: ['quotient'], quotient: q },
            { rng: makeRng(`lu-${q}`), index: 0 });
        const texte = item.prompt.text || item.prompt;
        assert.match(String(texte), /\u00F7/,
            `en « ${q} », le texte de l\u2019énoncé doit garder le signe \u00F7`);
    }
    // ET LE RÉGLAGE EXISTE, décoché par défaut : le signe ÷ est l'écriture
    // qu'on travaille d'abord — « il porte sur les nombres, pas sur les
    // exposants ».
    const r = puissancesCalculGenerator.params.find(p => p.id === 'quotient');
    assert.ok(r, 'le réglage « Écrire les divisions » manque');
    assert.equal(r.default, 'division');
});

test('LE MODE RIGOLO EST UN RÉGLAGE, ET IL EST DÉCOCHÉ AU DÉPART', () => {
    const exo = getExerciseById('num-puissances-relier');
    const reglage = (exo.paramSchema || []).find(p => p.id === 'bougent');
    assert.ok(reglage, 'le réglage « les cases bougent » manque');
    assert.equal(reglage.type, 'checkbox');
    // DÉCOCHÉ AU DÉPART, et c'est le fond de la décision : une carte qui
    // dérive demande de VISER, ce qui n'est pas ce qu'on travaille le premier
    // jour. Le jeu reste un exercice de lecture ; le mouvement est un extra.
    assert.equal(reglage.default, false);
    assert.notEqual(exo.params.bougent, true,
        'l’exercice du catalogue ne doit pas ouvrir en mode rigolo');
});
