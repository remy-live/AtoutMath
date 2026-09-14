import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    nombre, operateur, ouvrante, fermante, puissance, ecrire, ecrirePuissance, calculer,
    groupeInterieur, operationPrioritaire, critiquer, reduire, reduirePourEcrire,
    terminee, etapes, valeurFinale, tirerExpression, etapesMax, naif, lire, relire
} from '../js/core/priorites.js';

/** Écrit une expression rapidement : « 3 + 4 × 5 » depuis un gabarit. */
const exp = (...parts) => parts.map(p =>
    (typeof p === 'number' ? nombre(p)
        : p === '(' ? ouvrante() : p === ')' ? fermante() : operateur(p)));

// --- L'écriture -------------------------------------------------------------------

test('l\'expression s\'écrit comme au tableau', () => {
    assert.equal(ecrire(exp(3, '+', 4, '×', 5)), '3 + 4 × 5');
    // Le vrai signe moins, pas le trait d'union.
    assert.equal(ecrire(exp(9, '-', 2)), '9 − 2');
    // Les parenthèses collent à ce qu'elles enferment.
    assert.equal(ecrire(exp('(', 3, '+', 4, ')', '×', 5)), '(3 + 4) × 5');
    assert.equal(ecrire(exp(2, '×', '(', 8, '-', 3, ')')), '2 × (8 − 3)');
});

test('les deux interdits du niveau : pas de négatif, pas de reste', () => {
    assert.equal(calculer(3, '-', 8), null);
    assert.equal(calculer(8, '-', 3), 5);
    assert.equal(calculer(7, '÷', 2), null);
    assert.equal(calculer(8, '÷', 2), 4);
});

// --- Trouver l'opération prioritaire ------------------------------------------------

test('la multiplication passe avant l\'addition', () => {
    const p = operationPrioritaire(exp(3, '+', 4, '×', 5));
    assert.equal(p.op, '×');
    assert.equal(p.gauche, 4);
    assert.equal(p.droite, 5);
    assert.equal(p.valeur, 20);
    assert.match(p.raison, /avant les additions/);
});

test('à priorité égale, on va de gauche à droite', () => {
    // 12 ÷ 3 × 2 : c'est la division d'abord, pas la multiplication.
    const p = operationPrioritaire(exp(12, '÷', 3, '×', 2));
    assert.equal(p.op, '÷');
    assert.equal(p.index, 1);
    assert.match(p.raison, /gauche à droite/);

    // 9 − 4 + 2 : la soustraction d'abord. L'élève qui fait 4 + 2 se trompe.
    const q = operationPrioritaire(exp(9, '-', 4, '+', 2));
    assert.equal(q.op, '-');
    assert.equal(q.index, 1);
});

test('les parenthèses passent avant tout, même avant une multiplication', () => {
    const p = operationPrioritaire(exp(2, '×', '(', 8, '-', 3, ')'));
    assert.equal(p.op, '-');
    assert.equal(p.valeur, 5);
    assert.match(p.raison, /parenthèses/i);
    assert.deepEqual(p.dans, { debut: 2, fin: 6 });
});

test('on trouve le groupe de parenthèses le PLUS INTÉRIEUR', () => {
    // ((3 + 4) × 2) : c'est 3 + 4 qu'on fait d'abord.
    const j = exp('(', '(', 3, '+', 4, ')', '×', 2, ')');
    assert.deepEqual(groupeInterieur(j), { debut: 1, fin: 5 });
    assert.equal(operationPrioritaire(j).valeur, 7);
    assert.equal(groupeInterieur(exp(3, '+', 4)), null);
});

test('deux groupes côte à côte : le premier rencontré d\'abord', () => {
    const j = exp('(', 2, '+', 3, ')', '×', '(', 4, '+', 1, ')');
    const p = operationPrioritaire(j);
    assert.equal(p.valeur, 5);
    assert.deepEqual(p.dans, { debut: 0, fin: 4 });
});

test('quand il ne reste rien à faire, on le dit', () => {
    assert.equal(operationPrioritaire(exp(7)), null);
    assert.equal(terminee(exp(7)), true);
    assert.equal(terminee(exp(3, '+', 4)), false);
});

// --- La critique d'un mauvais clic ----------------------------------------------------

test('le bon clic ne reçoit aucune critique', () => {
    assert.equal(critiquer(exp(3, '+', 4, '×', 5), 3), null);
});

test('chaque mauvais clic reçoit SA raison, pas un « faux » générique', () => {
    // Cliquer le + alors qu'il reste une multiplication.
    assert.match(critiquer(exp(3, '+', 4, '×', 5), 1), /multiplication/);
    // Cliquer dehors alors qu'il reste des parenthèses.
    assert.match(critiquer(exp(2, '×', '(', 8, '-', 3, ')'), 1), /parenthèses/i);
    // Même famille, mais plus à droite.
    assert.match(critiquer(exp(9, '-', 4, '+', 2), 3), /GAUCHE À DROITE/);
    // Cliquer un nombre.
    assert.match(critiquer(exp(3, '+', 4), 0), /pas une opération/);
    assert.match(critiquer(exp(7), 0), /plus d'opération/);
});

// --- La réécriture, qui est l'exercice --------------------------------------------------

test('réduire recopie le reste à l\'identique', () => {
    // C'EST LA FAUTE QU'ON TRAQUE : faire 4 × 5 puis oublier le « − 2 ».
    const j = exp(3, '+', 4, '×', 5, '-', 2);
    const suivant = reduire(j, 3, 20);
    assert.equal(ecrire(suivant), '3 + 20 − 2');
});

test('les parenthèses devenues inutiles disparaissent toutes seules', () => {
    // « (7) × 2 » ne s'écrit pas : aucun professeur n'écrirait cette ligne.
    const j = exp('(', 3, '+', 4, ')', '×', 2);
    assert.equal(ecrire(reduire(j, 2, 7)), '7 × 2');
    // Y compris deux niveaux d'un coup.
    const k = exp('(', '(', 3, '+', 4, ')', ')', '×', 2);
    assert.equal(ecrire(reduire(k, 3, 7)), '7 × 2');
});

test('la ligne du dessous se recopie avec un trou à la bonne place', () => {
    // C'est le geste du tableau : on souligne « 2 × 3 », on passe à la ligne,
    // et l'on écrit « ___ + 9 ». Le trou est là où le calcul était.
    const j = exp(2, '×', 3, '+', 9);
    const r = reduirePourEcrire(j, 1);
    assert.equal(r.trou, 0);
    assert.equal(dessiner(r), '___ + 9');

    // Le trou n'est pas toujours au début : « 9 + 2 × 3 » donne « 9 + ___ ».
    const k = reduirePourEcrire(exp(9, '+', 2, '×', 3), 3);
    assert.equal(k.trou, 2);
    assert.equal(dessiner(k), '9 + ___');
});

test('le trou suit le décalage des parenthèses qui tombent', () => {
    // « (3 + 4) × 2 » : les parenthèses devenues inutiles disparaissent, ce
    // qui décale tout d'un cran. Deviner la position donnerait « ( ___ ) ».
    const r = reduirePourEcrire(exp('(', 3, '+', 4, ')', '×', 2), 2);
    assert.equal(r.trou, 0);
    assert.equal(dessiner(r), '___ × 2');

    const s = reduirePourEcrire(exp(5, '×', '(', 8, '-', 3, ')'), 4);
    assert.equal(s.trou, 2);
    assert.equal(dessiner(s), '5 × ___');
});

test('la dernière ligne n\'est plus qu\'un trou', () => {
    const r = reduirePourEcrire(exp(6, '+', 9), 1);
    assert.deepEqual(r.jetons.length, 1);
    assert.equal(r.trou, 0);
});

test('la ligne trouée est la ligne réduite, au résultat près', () => {
    // Les deux fonctions ne doivent JAMAIS diverger : le trou de l'une est la
    // place du nombre de l'autre, sinon la réponse tomberait ailleurs.
    for (let i = 0; i < 200; i++) {
        const e = tirerExpression({ rng: makeRng('tr' + i), niveau: 3 });
        let j = e.jetons;
        while (!terminee(j)) {
            const p = operationPrioritaire(j);
            const trouee = reduirePourEcrire(j, p.index);
            const pleine = reduire(j, p.index, p.valeur);
            assert.equal(trouee.jetons.length, pleine.length, e.texte);
            assert.equal(pleine[trouee.trou].valeur, p.valeur, e.texte);
            // Hors du trou, les deux lignes sont le MÊME texte : ce qui est
            // recopié l'est à l'identique des deux côtés.
            assert.equal(
                trouee.jetons.map((x, i) => (i === trouee.trou ? '' : ecrire([x]))).join('|'),
                pleine.map((x, i) => (i === trouee.trou ? '' : ecrire([x]))).join('|'),
                e.texte);
            j = pleine;
        }
    }
});

/** La ligne trouée, telle qu'elle s'affiche : « ___ + 9 ». */
const dessiner = (r) => r.jetons
    .map((x, i) => (i === r.trou ? '___' : ecrire([x])))
    .join(' ')
    .replace(/\(\s/g, '(').replace(/\s\)/g, ')');

test('la suite des lignes est celle qu\'on écrirait au tableau', () => {
    const l = etapes(exp(3, '+', 4, '×', 5, '-', 2));
    assert.deepEqual(l.map(x => x.texte), ['3 + 4 × 5 − 2', '3 + 20 − 2', '23 − 2', '21']);
    // Chaque ligne dit ce qui a été fait, et pourquoi.
    assert.deepEqual(l[1].fait, { op: '×', gauche: 4, droite: 5, valeur: 20 });
    assert.match(l[1].raison, /avant les additions/);
    assert.equal(valeurFinale(exp(3, '+', 4, '×', 5, '-', 2)), 21);
});

test('une expression avec parenthèses se déroule dans le bon ordre', () => {
    const l = etapes(exp('(', 2, '+', 3, ')', '×', '(', 4, '+', 1, ')'));
    assert.deepEqual(l.map(x => x.texte), ['(2 + 3) × (4 + 1)', '5 × (4 + 1)', '5 × 5', '25']);
});

test('une expression qui passerait par un négatif est refusée', () => {
    // 3 − 4 × 2 vaudrait 3 − 8 : hors du niveau.
    assert.equal(etapes(exp(3, '-', 4, '×', 2)), null);
    assert.equal(valeurFinale(exp(3, '-', 4, '×', 2)), null);
    // 7 ÷ 2 ne tombe pas juste.
    assert.equal(etapes(exp(1, '+', 7, '÷', 2)), null);
});

// --- Le tirage ----------------------------------------------------------------------------

test('chaque expression tirée se déroule jusqu\'au bout, sans interdit', () => {
    for (let n = 1; n <= 4; n++) {
        for (let i = 0; i < 120; i++) {
            const e = tirerExpression({ rng: makeRng(`p_${n}_${i}`), niveau: n });
            assert.ok(e.lignes, `niveau ${n} : expression sans solution`);
            assert.equal(e.lignes[e.lignes.length - 1].jetons[0].valeur, e.resultat);
            assert.ok(e.resultat >= 0 && e.resultat <= 400, `résultat ${e.resultat}`);
            // AU MOINS DEUX ÉTAPES : sans cela, il n'y a pas de priorité à trancher.
            assert.ok(e.etapes >= 2, `${e.texte} se règle en une étape`);
            // Et chaque étape franchie est bien la prioritaire du moment.
            verifierChaine(e);
        }
    }
});

/** Rejoue la chaîne : chaque ligne découle de la précédente par la prioritaire. */
function verifierChaine(e) {
    for (let i = 0; i + 1 < e.lignes.length; i++) {
        const courant = e.lignes[i].jetons;
        const p = operationPrioritaire(courant);
        assert.ok(p, `${e.lignes[i].texte} : plus d'opération`);
        assert.equal(p.valeur, e.lignes[i + 1].fait.valeur);
        assert.equal(ecrire(reduire(courant, p.index, p.valeur)), e.lignes[i + 1].texte);
    }
}

test('sans parenthèses, on n\'en tire aucune', () => {
    for (let n = 1; n <= 4; n++) {
        for (let i = 0; i < 60; i++) {
            const e = tirerExpression({ rng: makeRng(`np_${n}_${i}`), niveau: n, parentheses: false });
            assert.equal(e.avecParentheses, false, e.texte);
            assert.ok(!e.texte.includes('('), e.texte);
        }
    }
});

test('sans parenthèses, calculer de gauche à droite donne TOUJOURS faux', () => {
    // Sinon l'élève qui ignore la règle tombe juste, et l'exercice ne prouve
    // rien du tout.
    for (let i = 0; i < 300; i++) {
        const e = tirerExpression({ rng: makeRng('nf' + i), niveau: 2, parentheses: false });
        const bete = naif(e.jetons);
        assert.notEqual(bete, e.resultat,
            `« ${e.texte} » : de gauche à droite on trouve ${bete}, la bonne réponse aussi`);
    }
});

test('les niveaux avec parenthèses en produisent vraiment', () => {
    let avec = 0;
    for (let i = 0; i < 120; i++) {
        if (tirerExpression({ rng: makeRng('ap' + i), niveau: 3 }).avecParentheses) avec++;
    }
    assert.ok(avec > 30, `seulement ${avec} expressions parenthésées sur 120`);
    // Au niveau 4, elles sont systématiques.
    for (let i = 0; i < 60; i++) {
        assert.equal(tirerExpression({ rng: makeRng('a4' + i), niveau: 4 }).avecParentheses, true);
    }
});

test('la même graine redonne la même expression', () => {
    const a = tirerExpression({ rng: makeRng('graine'), niveau: 3 });
    const b = tirerExpression({ rng: makeRng('graine'), niveau: 3 });
    assert.equal(a.texte, b.texte);
    assert.equal(a.resultat, b.resultat);
});

test('le calcul naïf ne s\'applique pas aux expressions parenthésées', () => {
    assert.equal(naif(exp('(', 3, '+', 4, ')', '×', 2)), null);
    assert.equal(naif(exp(3, '+', 4, '×', 2)), 14, 'de gauche à droite : 7 × 2');
});


// --- LES PUISSANCES DANS LA CASCADE --------------------------------------------
//
// Rémy : « des priorités avec les puissances. Tu as déjà un moteur hyper
// complet sur les priorités. » Il a raison, et l'ajout tient dans une idée :
// « 4² » n'est pas une opération entre deux jetons, c'est UN jeton qui se
// réduit tout seul.

test('UNE PUISSANCE EST UN JETON, et elle s\'écrit comme au tableau', () => {
    assert.equal(ecrirePuissance(puissance(4, 2)), '4²');
    assert.equal(ecrirePuissance(puissance(10, 12)), '10¹²');
    assert.equal(ecrire([nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)]),
        '3 + 4² × 2');
});

test('LES PUISSANCES PASSENT AVANT LES MULTIPLICATIONS, après les parenthèses', () => {
    // C'est l'ordre du cours, et le seul cran que l'ajout insère.
    const j = [nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)];
    const p = operationPrioritaire(j);
    assert.equal(p.op, '^');
    assert.equal(p.unaire, true);
    assert.equal(p.index, 2, 'c\'est la puissance qu\'on souligne, pas le ×');
    assert.equal(p.valeur, 16);
    assert.equal(p.libelle, '4²');
    assert.match(p.raison, /PUISSANCES/);

    // Mais les parenthèses restent les premières.
    const k = [ouvrante(), nombre(3), operateur('+'), nombre(2), fermante(),
        operateur('×'), puissance(2, 3)];
    const q = operationPrioritaire(k);
    assert.equal(q.op, '+', 'la parenthèse passe avant la puissance');
    assert.match(q.raison, /parenthèses/i);
});

test('DEUX PUISSANCES : à égalité, de gauche à droite', () => {
    const j = [puissance(2, 3), operateur('+'), puissance(5, 2)];
    assert.equal(operationPrioritaire(j).index, 0);
    // Et la critique le dit quand on clique la seconde.
    assert.match(critiquer(j, 2), /GAUCHE À DROITE/);
});

test('CLIQUER LE × QUAND IL RESTE UNE PUISSANCE EST REPRIS, et l\'on dit pourquoi', () => {
    const j = [nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)];
    assert.equal(critiquer(j, 2), null, 'la puissance est la bonne réponse');
    assert.match(critiquer(j, 3), /PUISSANCE/);
    assert.match(critiquer(j, 1), /PUISSANCE/);
});

test('UNE PUISSANCE OCCUPE UNE SEULE CASE, pas trois', () => {
    // « 3 + 4² » devient « 3 + 16 », et non « 16 » : remplacer trois jetons
    // ferait disparaître le « + » et le 3 avec.
    const j = [nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)];
    assert.equal(ecrire(reduire(j, 2, 16)), '3 + 16 × 2');
    const brouillon = reduirePourEcrire(j, 2);
    assert.equal(brouillon.trou, 2, 'le trou tombe à la place de la puissance');
    assert.equal(brouillon.jetons.length, 5);
});

test('LA CASCADE ENTIÈRE, avec ses raisons, dans l\'ordre du cours', () => {
    const j = [ouvrante(), nombre(3), operateur('+'), nombre(2), fermante(),
        operateur('×'), puissance(2, 3)];
    const l = etapes(j);
    assert.deepEqual(l.map(x => x.texte), ['(3 + 2) × 2³', '5 × 2³', '5 × 8', '40']);
    assert.match(l[1].raison, /parenthèses/i);
    assert.match(l[2].raison, /PUISSANCES/);
    assert.match(l[3].raison, /Multiplications/);
    assert.equal(valeurFinale(j), 40);
});

test('UNE PUISSANCE TOMBE VRAIMENT, et le calcul est juste', () => {
    for (let i = 0; i < 40; i++) {
        const e = tirerExpression({ rng: makeRng('pu' + i), niveau: 3, puissances: true });
        assert.ok(e.jetons.some(j => j.type === 'p'),
            `« ${e.texte} » n'a aucune puissance alors qu'on en demandait`);
        // La cascade se termine, et sur la valeur annoncée.
        const l = etapes(e.jetons);
        assert.ok(l, `« ${e.texte} » ne se calcule pas jusqu'au bout`);
        assert.equal(l[l.length - 1].jetons[0].valeur, e.resultat);
        assert.ok(e.resultat >= 0, `${e.texte} = ${e.resultat}`);
    }
});

test('CHAQUE PUISSANCE EST UNE LIGNE DE PLUS sur la feuille', () => {
    // La fiche réserve la place à partir de ce compte : l'oublier donnerait des
    // cascades tronquées, où la dernière ligne n'a plus où s'écrire.
    const sans = etapesMax({ niveau: 3, parentheses: true });
    const avec = etapesMax({ niveau: 3, parentheses: true, puissances: true });
    assert.ok(avec > sans, `${avec} devrait dépasser ${sans}`);
    for (let i = 0; i < 30; i++) {
        const e = tirerExpression({ rng: makeRng('max' + i), niveau: 3, puissances: true });
        assert.ok(e.etapes <= avec, `« ${e.texte} » fait ${e.etapes} étapes pour ${avec} lignes`);
    }
});

test('le calcul naïf n\'a pas de sens avec des puissances', () => {
    assert.equal(naif([nombre(3), operateur('+'), puissance(4, 2)]), null);
});

// --- Relire un calcul récrit à la main -------------------------------------------

test('ON SAIT RELIRE CE QU\'UN PROFESSEUR ÉCRIT VRAIMENT', () => {
    // Rémy : « on ne peut pas changer les calculs du 33 (attention à la
    // correction) ». Sa parenthèse est le sujet : récrire « 8 × 4 − 6 » en
    // « 8 × 4 − 7 » ne change pas qu'une ligne, cela rend fausses les trois
    // lignes de correction en dessous. Laisser taper du texte ne suffit donc
    // pas — il faut le RELIRE, et refaire la cascade à partir de lui.
    //
    // Et « ce qu'il écrit vraiment » n'est pas ce que la machine imprime : il
    // tape le moins du clavier, le x du clavier, l'étoile, la virgule.
    const memes = ['8 × 4 − 6', '8 x 4 - 6', '8*4-6', '8×4−6', '  8 × 4 − 6  '];
    for (const t of memes) {
        const r = relire(t);
        assert.ok(r, `illisible : « ${t} »`);
        assert.equal(r.texte, '8 × 4 − 6');
        assert.equal(r.valeur, 26);
        assert.equal(r.etapes, 2);
    }
});

test('les parenthèses, les puissances et les décimaux se relisent aussi', () => {
    assert.equal(relire('(3 + 4) × 2').valeur, 14);
    assert.equal(relire('(2+3)x(4+1)').valeur, 25);
    // Les deux façons d'écrire un exposant : celle du tableau et celle du clavier.
    assert.equal(relire('3² + 2³ × 2').valeur, 25);
    assert.equal(relire('4^2 + 1').valeur, 17);
    assert.equal(relire('4^2 + 1').texte, '4² + 1');
    assert.equal(relire('3,5 + 1').valeur, 4.5);
    // Le « = 18 » qu'on ajoute au bout n'appartient pas à l'expression.
    assert.equal(relire('6 + 3 × 4 = 18').texte, '6 + 3 × 4');
    assert.equal(relire('6 + 3 × 4 = 18').valeur, 18);
});

test('CE QU\'ON NE SAIT PAS RELIRE, ON NE PRÉTEND PAS LE CORRIGER', () => {
    // C'est la moitié qui compte. Une fiche dont le corrigé ment est pire
    // qu'une fiche sans corrigé : `null` permet à la feuille de le DIRE.
    for (const t of ['bonjour', '2 +', '', '   ', '((3+4)', '3 $ 4', null, undefined, 42]) {
        assert.equal(relire(t), null, `on a cru savoir lire « ${t} »`);
    }
    // Une expression bien formée mais que la règle du collège refuse — un
    // négatif en cours de route — n'est pas corrigible non plus.
    assert.equal(relire('3 − 8'), null, 'un négatif ne se corrige pas à ce niveau');
});

test('relire et écrire sont bien l\'aller et le retour l\'un de l\'autre', () => {
    // La garantie qui rend le reste sûr : ce qu'on imprime, on sait le relire,
    // et l'on retombe sur la même expression et la même valeur.
    const rng = makeRng('aller-retour');
    for (let i = 0; i < 40; i++) {
        const e = tirerExpression({ niveau: 2 + (i % 3), rng, puissances: i % 2 === 0 });
        if (!e) continue;
        const imprime = ecrire(e.jetons);
        const r = relire(imprime);
        assert.ok(r, `on n'a pas su relire ce qu'on venait d'écrire : « ${imprime} »`);
        assert.equal(r.texte, imprime);
        assert.equal(r.valeur, valeurFinale(e.jetons));
    }
});
