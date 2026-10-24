// LE TABLEAU À DOUBLE ENTRÉE : LES ÉLÈVES EN LIGNES, LES EXERCICES EN COLONNES.
//
// RÉMY : « permettre aussi d'avoir le détail avec un tableau des exercices
// (double entrée donc) et leur détail de réussite par exercice », puis « pour
// le 4 colonne séance choisie ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS RÈGLES SE MESURENT ICI, ET AUCUNE NE SE VOIT À L'ŒIL :
//
//   · LES COLONNES VIENNENT DE LA SÉANCE, PAS DES RÉPONSES. Un exercice que
//     personne n'a ouvert doit garder sa colonne — vide. C'est l'information
//     la plus utile de l'écran (la séance était trop longue), et c'est
//     exactement celle qu'un tableau construit sur les réponses PERD.
//   · UNE CASE VIDE N'EST PAS ZÉRO. « Il n'y est pas arrivé » et « il a tout
//     raté » appellent des gestes opposés ; les confondre rend le tableau
//     trompeur là où il doit trancher.
//   · LE TAUX PORTE SUR LE PREMIER COUP. Compter les rattrapages comme des
//     réussites ferait de « s'est trompé douze fois puis a trouvé douze fois »
//     un sans-faute — le mensonge déjà corrigé sur l'écran de fin d'étape, et
//     qui n'a pas à revenir par le bilan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    tableauDesExercices, colonnesDeLaSeance, caseDExercice, phraseDuTableau
} from '../js/core/tableauDesExercices.js';

const SEANCE = {
    pathId: 'p1', nom: 'Devoir du mardi',
    exercices: ['calc-add', 'calc-sub', 'calc-div']
};

/** Un élève du bilan, avec son détail par exercice sur la séance `p1`. */
const eleve = (prenom, par = {}, id = prenom) => ({
    studentId: id, firstName: prenom, totalQuestions: 10, successRate: 0.7,
    parSeance: { p1: par }
});

const fait = (posees, justes, reprises = 0) => ({ posees, justes, reprises });

// ─────────────────────────────────────────────── LES COLONNES ───────────────

test('LES COLONNES SONT LE PLAN DE LA SÉANCE, PAS CE QUI A ÉTÉ FAIT', () => {
    // UN EXERCICE QUE PERSONNE N'A ATTEINT GARDE SA COLONNE. C'est le cœur du
    // module : une colonne entièrement vide dit « la séance était trop
    // longue », et un tableau bâti sur les réponses ne peut pas le dire.
    const t = tableauDesExercices([
        eleve('Amel', { 'calc-add': fait(8, 7) }),
        eleve('Bilal', { 'calc-add': fait(8, 4), 'calc-sub': fait(6, 3) })
    ], SEANCE);
    assert.deepEqual(t.exercices, ['calc-add', 'calc-sub', 'calc-div']);
    assert.equal(t.rangs[0].cases.length, 3);
    assert.equal(t.rangs[0].cases[2].vide, true, 'calc-div garde sa colonne');
    assert.equal(t.pieds[2].eleves, 0, 'et le pied dit que personne n\'y est arrivé');
});

test('un exercice deux fois dans la séance ne fait qu\'une colonne', () => {
    // Le constructeur permet deux étapes du même exercice avec des réglages
    // différents. Les réponses, elles, ne portent que l'exercice : les deux
    // colonnes afficheraient deux fois le même nombre.
    assert.deepEqual(
        colonnesDeLaSeance({ exercices: ['calc-add', 'calc-sub', 'calc-add'] }),
        ['calc-add', 'calc-sub']);
});

test('colonnesDeLaSeance supporte le vide et le cassé', () => {
    assert.deepEqual(colonnesDeLaSeance(null), []);
    assert.deepEqual(colonnesDeLaSeance({}), []);
    assert.deepEqual(colonnesDeLaSeance({ exercices: [null, '', 'ok'] }), ['ok']);
});

// ───────────────────────────────────────────────── UNE CASE ─────────────────

test('RIEN N\'EST PAS ZÉRO', () => {
    // La case vide dit « il n'est pas arrivé jusque-là » ; « 0 % » dit « il a
    // tout raté ». On raccourcit la séance dans un cas, on reprend la notion
    // dans l'autre.
    assert.equal(caseDExercice(undefined).vide, true);
    assert.equal(caseDExercice(undefined).taux, null);
    assert.equal(caseDExercice({ posees: 0, justes: 0 }).vide, true);

    const rate = caseDExercice(fait(8, 0));
    assert.equal(rate.vide, false);
    assert.equal(rate.taux, 0, 'tout raté se dit zéro, et se voit');
});

test('LE TAUX PORTE SUR LE PREMIER COUP, PAS SUR LES RATTRAPAGES', () => {
    // Douze questions, aucune trouvée du premier coup, douze rattrapées : ce
    // n'est pas un sans-faute, et le tableau ne doit pas le dire.
    const c = caseDExercice(fait(12, 0, 12));
    assert.equal(c.taux, 0);
    assert.equal(c.reprises, 12, 'mais les rattrapages se gardent, pour l\'infobulle');

    const moitie = caseDExercice(fait(12, 6, 3));
    assert.equal(moitie.taux, 0.5);
});

test('une case ne dépasse jamais 100 %', () => {
    // Un journal réécrit à la main, un événement qui remonte deux fois : le
    // serveur compte ce qu'il reçoit, et « 150 % » dans une case ferait douter
    // de tout le tableau plutôt que de la ligne fautive.
    assert.equal(caseDExercice(fait(4, 9)).taux, 1);
});

// ───────────────────────────────────────── LES LIGNES ET LE PIED ────────────

test('LE BOUT DE LIGNE DIT COMBIEN D\'EXERCICES, PAS SEULEMENT LE TAUX', () => {
    // Sans ce nombre, on confond « 100 % » sur un exercice avec « 100 % » sur
    // huit — et c'est la différence entre un élève qui maîtrise et un élève
    // qui vient de commencer.
    const t = tableauDesExercices([
        eleve('Amel', { 'calc-add': fait(4, 4) }),
        eleve('Bilal', { 'calc-add': fait(4, 4), 'calc-sub': fait(4, 4), 'calc-div': fait(4, 4) })
    ], SEANCE);
    assert.equal(t.rangs[0].taux, 1);
    assert.equal(t.rangs[0].commences, 1);
    assert.equal(t.rangs[1].taux, 1);
    assert.equal(t.rangs[1].commences, 3);
});

test('LE PIED DE COLONNE NE MOYENNE PAS DES MOYENNES', () => {
    // Un élève a fait 2 questions et les a réussies, un autre en a fait 20 et
    // en a réussi 4. La moyenne des taux donne 60 % — une colonne qui a l'air
    // d'aller. Le vrai taux est 6/22 = 27 %, et c'est une colonne à reprendre.
    const t = tableauDesExercices([
        eleve('Amel', { 'calc-add': fait(2, 2) }),
        eleve('Bilal', { 'calc-add': fait(20, 4) })
    ], SEANCE);
    assert.equal(t.pieds[0].posees, 22);
    assert.equal(t.pieds[0].justes, 6);
    assert.ok(Math.abs(t.pieds[0].taux - 6 / 22) < 0.001, String(t.pieds[0].taux));
    assert.ok(t.pieds[0].taux < 0.5, 'une moyenne de moyennes aurait donné 0,60');
});

test('le pied compte ceux qui ont ATTEINT l\'exercice, pas la classe', () => {
    // C'est ce qui distingue « ils n'y arrivent pas » de « ils n'y sont pas
    // arrivés » — deux phrases, deux gestes.
    const t = tableauDesExercices([
        eleve('Amel', { 'calc-add': fait(4, 2) }),
        eleve('Bilal', {}),
        eleve('Chloé', {})
    ], SEANCE);
    assert.equal(t.rangs.length, 3);
    assert.equal(t.pieds[0].eleves, 1);
});

test('LE TABLEAU SUIT L\'ORDRE QU\'ON LUI DONNE', () => {
    // Le professeur vient de cliquer « par nom » juste au-dessus : un tableau
    // qui se range tout seul autrement ferait deux tableaux côte à côte dont
    // les lignes ne se correspondent pas.
    const lignes = [eleve('Zoé'), eleve('Amel')];
    const parNom = (l) => l.slice().sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'));
    assert.deepEqual(
        tableauDesExercices(lignes, SEANCE, parNom).rangs.map(r => r.firstName),
        ['Amel', 'Zoé']);
    assert.deepEqual(
        tableauDesExercices(lignes, SEANCE).rangs.map(r => r.firstName),
        ['Zoé', 'Amel'], 'sans trieur, l\'ordre reçu');
});

test('CHAQUE SÉANCE A SES PROPRES COLONNES', () => {
    // Le même exercice revient dans plusieurs séances. Mélanger celle de lundi
    // avec celle de novembre ferait un tableau que personne ne peut lire — et
    // Rémy a été explicite : « pour le 4 colonne séance choisie ».
    const ligne = {
        studentId: 'a', firstName: 'Amel',
        parSeance: {
            p1: { 'calc-add': fait(8, 8) },
            p2: { 'calc-add': fait(8, 1) }
        }
    };
    assert.equal(tableauDesExercices([ligne], SEANCE).rangs[0].cases[0].taux, 1);
    assert.equal(
        tableauDesExercices([ligne], { ...SEANCE, pathId: 'p2' }).rangs[0].cases[0].taux,
        1 / 8);
});

test('le tableau supporte des lignes cassées et une séance vide', () => {
    const t = tableauDesExercices([null, {}, eleve('Amel')], SEANCE);
    assert.equal(t.rangs.length, 3);
    assert.ok(t.rangs.every(r => r.cases.length === 3));
    const vide = tableauDesExercices([eleve('Amel')], { pathId: 'p1', exercices: [] });
    assert.deepEqual(vide.exercices, []);
    assert.deepEqual(vide.pieds, []);
    assert.equal(tableauDesExercices(null, null).rangs.length, 0);
});

// ───────────────────────────────────────────── LA PHRASE DU TABLEAU ─────────

test('UNE COLONNE ROUGE POUR TOUT LE MONDE SE DIT, PARCE QU\'ELLE NE SE VOIT PAS', () => {
    // Une colonne à 38 % pour vingt-deux élèves n'est pas vingt-deux élèves en
    // difficulté : c'est un exercice à reprendre au tableau. Et ça ne se lit
    // pas en balayant les cases une à une.
    const classe = Array.from({ length: 10 }, (_, i) =>
        eleve('E' + i, { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 2), 'calc-div': fait(8, 6) }, 'i' + i));
    const p = phraseDuTableau(tableauDesExercices(classe, SEANCE));
    assert.match(p, /résisté/);
});

test('ET ELLE SE TAIT QUAND IL N\'Y A RIEN À DIRE', () => {
    // Une phrase qui commente chaque séance perd son pouvoir d'alerte au
    // troisième bilan. Le silence est une réponse.
    const classe = Array.from({ length: 10 }, (_, i) =>
        eleve('E' + i, { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7), 'calc-div': fait(8, 7) }, 'i' + i));
    assert.equal(phraseDuTableau(tableauDesExercices(classe, SEANCE)), '');
    assert.equal(phraseDuTableau({}), '');
});

test('UN SEUL ÉLÈVE EN PEINE N\'EST PAS UNE COLONNE ROUGE', () => {
    // DEUX CHOSES DIFFÉRENTES PROTÈGENT DE CETTE CONFUSION, et j'ai d'abord
    // cru qu'une seule suffisait.
    //
    //   · Quand les autres ont réussi, c'est le PIED qui protège : il agrège
    //     toutes les réponses de la colonne, et un élève à zéro sur dix ne la
    //     fait pas descendre sous la moitié.
    //   · Mais quand il est le SEUL à y être arrivé, le pied ne porte que sur
    //     lui : la colonne est à 0 %, et la phrase annoncerait « un exercice a
    //     résisté à la classe entière » pour un élève. C'est le seuil de deux
    //     élèves qui l'empêche, et c'est lui que cette épreuve garde — la
    //     première moitié passait avec et sans, l'outil me l'a dit.
    const bien = { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7), 'calc-div': fait(8, 7) };
    const classe = [
        eleve('Amel', { 'calc-add': fait(8, 0), 'calc-sub': fait(8, 7), 'calc-div': fait(8, 7) }),
        ...Array.from({ length: 9 }, (_, i) => eleve('E' + i, bien, 'i' + i))
    ];
    assert.equal(phraseDuTableau(tableauDesExercices(classe, SEANCE)), '',
        'neuf élèves qui réussissent tiennent la colonne');

    // Le seul à l'avoir atteint, et il l'a raté : une colonne à 0 %, un élève.
    const seul = [
        eleve('Amel', { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7), 'calc-div': fait(8, 0) }),
        ...Array.from({ length: 9 }, (_, i) =>
            eleve('E' + i, { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7) }, 'i' + i))
    ];
    const p = phraseDuTableau(tableauDesExercices(seul, SEANCE));
    assert.doesNotMatch(p, /résisté/, 'un élève n\'est pas la classe entière');
    assert.match(p, /atteint/, 'mais le fait que personne n\'y soit arrivé se dit');
});

test('ET LA COLONNE QUE PRESQUE PERSONNE N\'A ATTEINTE SE DIT AUSSI', () => {
    // Ce n'est pas la même alerte : la séance était trop longue, ce qui n'a
    // rien à voir avec la difficulté de l'exercice. Deux élèves sur dix y sont
    // arrivés, et ils l'ont bien réussi — rien dans les cases ne le signale.
    const classe = Array.from({ length: 10 }, (_, i) => eleve('E' + i,
        i < 2
            ? { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7), 'calc-div': fait(8, 7) }
            : { 'calc-add': fait(8, 7) },
        'i' + i));
    const p = phraseDuTableau(tableauDesExercices(classe, SEANCE));
    assert.match(p, /atteint/);
    assert.doesNotMatch(p, /résisté/, 'les deux exercices sont bien réussis par ceux qui y sont arrivés');
});

test('DEUX ÉLÈVES SUR SIX NE SONT PAS « LA CLASSE »', () => {
    // MESURÉ À L'ÉCRAN, SUR UNE CLASSE DE SIX, et c'est de là que vient cette
    // épreuve : deux élèves seulement avaient atteint le deuxième exercice et
    // l'avaient raté. La phrase annonçait « un exercice a résisté à la classe
    // entière » PUIS, dans la même ligne, « n'a été atteint que par une partie
    // de la classe ». Deux phrases qui se contredisent sur la même colonne, et
    // c'est la première qui est fausse.
    const classe = [
        eleve('Alice', { 'calc-add': fait(8, 8), 'calc-sub': fait(8, 2) }, 'i1'),
        eleve('Bruno', { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 1) }, 'i2'),
        ...Array.from({ length: 4 }, (_, i) => eleve('E' + i, { 'calc-add': fait(8, 6) }, 'j' + i))
    ];
    const p = phraseDuTableau(tableauDesExercices(classe, SEANCE));
    assert.doesNotMatch(p, /résisté/, p);
    assert.match(p, /atteint par personne/, 'calc-div, que personne n\'a ouvert');
    assert.match(p, /quelques élèves/, 'calc-sub, que deux élèves ont ouvert');
});

test('UNE COLONNE VIDE NE SE DIT PAS « UNE PARTIE DE LA CLASSE »', () => {
    // « n'a été atteint que par une partie de la classe » laisse croire qu'une
    // partie y est arrivée. Une colonne entièrement vide dit autre chose :
    // l'exercice n'a pas été travaillé, il reste à faire.
    const classe = Array.from({ length: 6 }, (_, i) =>
        eleve('E' + i, { 'calc-add': fait(8, 7), 'calc-sub': fait(8, 7) }, 'i' + i));
    assert.match(phraseDuTableau(tableauDesExercices(classe, SEANCE)),
        /^Un exercice n'a été atteint par personne\.$/);
});
