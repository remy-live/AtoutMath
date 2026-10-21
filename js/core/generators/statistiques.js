// MOYENNE, MÉDIANE, ÉTENDUE, FRÉQUENCE — les statistiques de quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Statistique (Médiane, moyenne, étendue,
// fréquence: listes) ». Mesuré avant d'écrire une ligne : ZÉRO exercice sur
// 238 touchait ce chapitre. C'est l'un des deux qu'il a mis en tête de sa
// liste de travail, avec les probabilités.
//
// ── LA MÉDIANE A DEUX PIÈGES, ET CHACUN EST UNE MARCHE À LUI SEUL ──────────
//
// C'est la décision qui commande ce fichier. Les trois autres notions se
// calculent : on additionne, on divise, on soustrait. La médiane, non — elle
// se CHERCHE, et on la cherche mal de deux façons :
//
//   1. ON NE RANGE PAS LA SÉRIE. La médiane de 7 ; 2 ; 9 vaut 7, pas 2. Un
//      élève qui prend le terme du milieu de la liste telle qu'elle est écrite
//      rend un nombre de la série, donc un nombre qui a l'air juste, et rien
//      ne l'avertit.
//   2. LA SÉRIE EST PAIRE. Il y a alors DEUX valeurs au milieu, la médiane est
//      leur moyenne, et elle n'appartient pas à la série — 11,5 pour
//      10 ; 11 ; 12 ; 13. Chercher « la valeur du milieu » n'a plus de sens.
//
// Une marche qui mélangerait les deux ne dirait jamais lequel manque. Il y a
// donc trois marches de médiane : la série rangée, la série en désordre, la
// série paire — et le bilan nomme celle qui coince.
//
// ── LES SÉRIES SE FABRIQUENT, ELLES NE SE TIRENT PAS ───────────────────────
//
// Tirer n nombres au hasard donne une moyenne entière une fois sur n. Les
// autres fois : 12,857142… Arrondir compterait faux un élève qui a raison ;
// rejeter le tirage est une boucle dont on ne sait pas dire quand elle finit.
// On part donc de la réponse — voir `serieDeMoyenne` dans `core/statistiques.js`.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import { deDevant } from '../accord.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    moyenne, mediane, etendue, effectif, frequence, rangee, enFrancais, serieDeMoyenne
} from '../statistiques.js';

const S_LIRE = 'don.stat.lire';
const S_MOYENNE = 'don.stat.moyenne';
const S_MEDIANE = 'don.stat.mediane';
const S_FREQUENCE = 'don.stat.frequence';

// ── LES SITUATIONS ─────────────────────────────────────────────────────────
//
// UNE SÉRIE DE NOMBRES NUS NE SE LIT PAS. « 12 ; 8 ; 15 ; 11 » ne dit ni ce
// qu'on compte ni avec quelle unité, et l'élève qui doit décider entre moyenne
// et médiane n'a rien pour s'appuyer. Chaque situation porte donc ce qu'on
// mesure, sur qui, et dans quelle unité.
//
// ET LE GENRE EST ÉCRIT. Mesuré sur les énoncés d'un autre chapitre : « toutes
// ses stylos », « des trousses TOUS IDENTIQUES ». Un énoncé mal accordé fait
// trébucher la lecture au moment précis où l'on demande de lire avec attention.
const SITUATIONS = [
    {
        quoiNu: 'notes', genre: 'f', unite: '', de: 'de la classe',
        qui: 'élèves', mesure: 'note', centre: 12, ecart: 4,
        phrase: (n) => `Voici les notes sur 20 obtenues par ${n} élèves de la classe.`
    },
    {
        quoiNu: 'tailles', genre: 'f', unite: 'cm', de: 'de l\'équipe',
        qui: 'joueuses', mesure: 'taille', centre: 165, ecart: 9,
        phrase: (n) => `Voici les tailles, en centimètres, des ${n} joueuses de l'équipe.`
    },
    {
        quoiNu: 'âges', genre: 'm', unite: 'ans', de: 'du club',
        qui: 'membres', mesure: 'âge', centre: 14, ecart: 3,
        phrase: (n) => `Voici les âges, en années, des ${n} membres du club d'échecs.`
    },
    {
        quoiNu: 'températures', genre: 'f', unite: '°C', de: 'de la semaine',
        qui: 'jours', mesure: 'température', centre: 18, ecart: 5,
        phrase: (n) => `Voici les températures, en degrés, relevées pendant ${n} jours.`
    },
    {
        quoiNu: 'temps', genre: 'm', unite: 's', de: 'de la course',
        qui: 'coureurs', mesure: 'temps', centre: 45, ecart: 6,
        phrase: (n) => `Voici les temps, en secondes, des ${n} coureurs de la finale.`
    }
];

/**
 * LA COMPARAISON DE DEUX GROUPES A SA PROPRE SITUATION, et il le faut.
 *
 * Cette marche a besoin d'une série TRÈS éparpillée pour que l'étendue se voie
 * — c'est tout son sujet. Avec les notes sur 20, le tirage sortait « 9 ; 23 ;
 * 13 ; 9 ; 31 » : trois notes au-dessus de 20, dans un exercice qui vient
 * d'annoncer qu'il parle de notes sur 20. Un score de match, lui, peut valoir
 * 9 comme 31 sans que personne ne tique.
 */
const MATCHS = { centre: 60, serre: 4, large: 18 };

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/**
 * « de » OU « d' », selon ce qui suit.
 *
 * MESURÉ en lisant les énoncés engendrés : « Combien de élèves ont une note
 * de 14 ? ». Quatre situations sur cinq commencent par une consonne, la
 * cinquième non — et c'est exactement le genre de faute qu'on ne voit plus
 * après l'avoir lue trois fois.
 */
// `deDevant` VIT MAINTENANT DANS `core/accord.js` : les équations en ont eu
// besoin à leur tour — « le nombre de heures » —, et une règle de langue
// écrite à deux endroits finit par diverger.

/** La série telle qu'on l'écrit dans un énoncé : séparée par des points-virgules. */
const ecrireSerie = (serie) => serie.join(' ; ');

/**
 * UNE CASE À REMPLIR DANS L'ÉNONCÉ — voir `core/activities/numeric.js`.
 *
 * Le pavé numérique compte les `[data-trou]` que l'ÉNONCÉ déclare : une réponse
 * à deux nombres n'ouvre pas deux champs toute seule.
 */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

// ── LES NEUF MARCHES ───────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'effectif', temps: 'A', titre: 'Combien de fois cette valeur ?', skill: S_LIRE },
    { id: 'etendue', temps: 'A', titre: 'L\'étendue', skill: S_LIRE },
    { id: 'moyenne', temps: 'B', titre: 'Calculer la moyenne', skill: S_MOYENNE },
    { id: 'mediane-rangee', temps: 'B', titre: 'La médiane, série rangée', skill: S_MEDIANE },
    { id: 'mediane-desordre', temps: 'B', titre: 'La médiane, série en désordre', skill: S_MEDIANE },
    { id: 'mediane-paire', temps: 'B', titre: 'La médiane, série paire', skill: S_MEDIANE },
    { id: 'frequence', temps: 'C', titre: 'La fréquence, en pourcentage', skill: S_FREQUENCE },
    { id: 'moyenne-manquante', temps: 'C', titre: 'La valeur qui manque', skill: S_MOYENNE },
    { id: 'comparer', temps: 'C', titre: 'Même moyenne, pas même série', skill: S_LIRE }
];

const TEMPS = {
    A: 'A — lire une série',
    B: 'B — les trois résumés',
    C: 'C — s\'en servir'
};

/**
 * UNE QUESTION D'UNE MARCHE.
 *
 * Rend l'énoncé, la question, la réponse, la façon de répondre et la
 * correction — jamais de HTML de mise en page : c'est l'appelant qui décide de
 * la forme, et la feuille imprimée lit les mêmes champs.
 */
export function question(etape, rng) {
    const s = choisir(SITUATIONS, rng);

    // ── TEMPS A : LIRE LA SÉRIE ────────────────────────────────────────────

    if (etape.id === 'effectif') {
        // UNE VALEUR QUI SE RÉPÈTE, ET ON SAIT COMBIEN DE FOIS. On ne tire pas
        // une série en espérant qu'une valeur revienne : on pose la répétition
        // d'abord, puis on remplit autour avec des valeurs DIFFÉRENTES. Sans
        // cela, la réponse serait « 1 » trois fois sur quatre, et la question
        // n'apprendrait rien.
        const valeur = s.centre + rng.int(-2, 2);
        const combien = rng.int(2, 4);
        const autres = [];
        while (autres.length < rng.int(4, 6)) {
            const x = s.centre + rng.int(-s.ecart, s.ecart);
            if (x !== valeur) autres.push(x);
        }
        const serie = rng.shuffle([...Array(combien).fill(valeur), ...autres]);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: `Combien ${deDevant(s.qui)} ont ${s.genre === 'f' ? 'une' : 'un'} ${
                s.mesure} de ${valeur}${s.unite ? ' ' + s.unite : ''} ?`,
            kind: 'numeric', reponse: combien, serie,
            pourquoi: `On compte : ${valeur} apparaît ${combien} fois dans la série. `
                + 'C\'est l\'EFFECTIF de cette valeur.',
            aide: 'On barre les valeurs au fur et à mesure qu\'on les compte : c\'est le seul '
                + 'moyen de ne pas en oublier une ni d\'en compter une deux fois.'
        };
    }

    if (etape.id === 'etendue') {
        const serie = serieDeMoyenne(s.centre, rng.int(5, 8), (a, b) => rng.int(a, b), s.ecart);
        const e = etendue(serie);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Quelle est l\'étendue de cette série ?',
            kind: 'numeric', reponse: e, serie, unite: s.unite,
            pourquoi: `La plus grande valeur est ${Math.max(...serie)}, la plus petite ${
                Math.min(...serie)} : l'étendue vaut ${Math.max(...serie)} − ${
                Math.min(...serie)} = ${e}${s.unite ? ' ' + s.unite : ''}.`,
            aide: 'L\'étendue est une SOUSTRACTION : la plus grande moins la plus petite. '
                + 'Elle ne dit pas où sont les valeurs, elle dit si elles sont serrées.'
        };
    }

    // ── TEMPS B : LES TROIS RÉSUMÉS ────────────────────────────────────────

    if (etape.id === 'moyenne') {
        // LA MOYENNE TOMBE JUSTE, ET C'EST CONSTRUIT. Voir `serieDeMoyenne` :
        // on part de la réponse et l'on répartit des écarts de somme nulle.
        const m = s.centre + rng.int(-2, 2);
        const serie = serieDeMoyenne(m, rng.int(4, 6), (a, b) => rng.int(a, b), s.ecart);
        const vraie = moyenne(serie);
        const somme = serie.reduce((a, b) => a + b, 0);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Quelle est la moyenne de cette série ?',
            kind: 'numeric', reponse: vraie, serie, unite: s.unite,
            pourquoi: `La somme vaut ${somme}, il y a ${serie.length} valeurs : `
                + `${somme} ÷ ${serie.length} = ${enFrancais(vraie)}${s.unite ? ' ' + s.unite : ''}.`,
            aide: 'On additionne TOUTES les valeurs — y compris celles qui se répètent — puis '
                + 'on divise par leur NOMBRE, pas par la plus grande ni par le nombre de '
                + 'valeurs différentes.'
        };
    }

    if (etape.id === 'mediane-rangee' || etape.id === 'mediane-desordre'
        || etape.id === 'mediane-paire') {
        const paire = etape.id === 'mediane-paire';
        const combien = paire ? rng.int(3, 4) * 2 : rng.int(2, 3) * 2 + 1;
        let brute = serieDeMoyenne(s.centre, combien, (a, b) => rng.int(a, b), s.ecart);
        // LES DEUX VALEURS DU MILIEU DOIVENT DIFFÉRER, sur la marche paire.
        //
        // Vu sur la sortie : « DEUX au milieu : 12 et 12. La médiane est leur
        // moyenne, (12 + 12) ÷ 2 = 12 ». La correction est juste, et elle
        // n'enseigne rien : la médiane retombe sur une valeur de la série,
        // c'est-à-dire sur l'idée fausse que cette marche existe pour défaire.
        // On redistribue tant que le milieu est plat — la boucle est bornée,
        // et le tirage change à chaque tour.
        //
        // `if (paire)` N'EST PAS UNE OPTIMISATION : sur une série IMPAIRE,
        // `tri.length / 2` vaut 3,5, les deux lectures rendent `undefined`,
        // et `undefined !== undefined` est FAUX — la boucle ne sortait jamais
        // et retirait vingt séries pour rien, sans que rien ne le signale.
        for (let garde = 0; paire && garde < 20; garde++) {
            const tri = rangee(brute);
            const demi = tri.length / 2;
            if (tri[demi - 1] !== tri[demi]) break;
            brute = serieDeMoyenne(s.centre, combien, (a, b) => rng.int(a, b), s.ecart);
        }
        // LA MARCHE « RANGÉE » DONNE LA SÉRIE DÉJÀ TRIÉE : c'est la seule qui
        // ne travaille QUE la notion de milieu, sans le geste de ranger. Les
        // deux autres la donnent en désordre — c'est là que le piège vit.
        const serie = etape.id === 'mediane-rangee' ? rangee(brute) : rng.shuffle(brute.slice());
        const m = mediane(serie);
        const tri = rangee(serie);
        const demi = Math.floor(tri.length / 2);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Quelle est la médiane de cette série ?',
            kind: 'numeric', reponse: m, serie, unite: s.unite,
            // LA VIRGULE EST POSSIBLE SUR LA SÉRIE PAIRE, et sur elle seule :
            // la médiane y est la MOYENNE des deux valeurs du milieu, donc
            // parfois un demi. Offrir la virgule ailleurs serait inviter à la
            // faute ; ne pas l'offrir ici rendrait la question impossible.
            decimal: paire,
            pourquoi: paire
                ? `On range : ${ecrireSerie(tri)}. Il y a ${tri.length} valeurs, donc DEUX au `
                    + `milieu : ${tri[demi - 1]} et ${tri[demi]}. La médiane est leur moyenne, `
                    + `(${tri[demi - 1]} + ${tri[demi]}) ÷ 2 = ${enFrancais(m)}.`
                : `On range : ${ecrireSerie(tri)}. Il y a ${tri.length} valeurs, la médiane est `
                    + `la ${demi + 1}ᵉ : ${m}. Il y en a ${demi} avant et ${demi} après.`,
            aide: paire
                ? 'ATTENTION : la série a un nombre PAIR de valeurs. Il y a donc DEUX valeurs au '
                    + 'milieu, et la médiane est leur moyenne — elle n\'est pas forcément dans '
                    + 'la série.'
                : etape.id === 'mediane-rangee'
                    ? 'La série est déjà rangée : la médiane est la valeur qui a autant de '
                        + 'valeurs avant elle qu\'après elle.'
                    : 'ON RANGE D\'ABORD. Le terme du milieu de la liste telle qu\'elle est '
                        + 'écrite n\'est pas la médiane — c\'est juste un nombre de la série.'
        };
    }

    // ── TEMPS C : S'EN SERVIR ──────────────────────────────────────────────

    if (etape.id === 'frequence') {
        // UN TOTAL QUI DONNE UN POURCENTAGE ENTIER. 10, 20 ou 25 : ce sont les
        // seuls effectifs sous trente pour lesquels toute fréquence tombe
        // juste. Avec 12 élèves, 5 d'entre eux font 41,666… %, et l'on
        // compterait faux celui qui écrit 41,7.
        // DIX OU VINGT, ET PLUS VINGT-CINQ. Vingt-cinq nombres alignés dans un
        // énoncé font deux lignes et demie de chiffres : lu sur la sortie, on
        // ne voit plus où la série commence ni où elle finit. Avec 10 et 20,
        // toute fréquence tombe juste aussi.
        const total = choisir([10, 20], rng);
        const valeur = s.centre + rng.int(-2, 2);
        const combien = rng.int(2, Math.max(2, Math.floor(total / 4)));
        const autres = [];
        while (autres.length < total - combien) {
            const x = s.centre + rng.int(-s.ecart, s.ecart);
            if (x !== valeur) autres.push(x);
        }
        const serie = rng.shuffle([...Array(combien).fill(valeur), ...autres]);
        const f = frequence(serie, valeur);
        return {
            enonce: `${s.phrase(total)}\n${ecrireSerie(serie)}`,
            question: `Quelle est la fréquence de la valeur ${valeur}, en pourcentage ?`,
            kind: 'numeric', reponse: f, serie, unite: '%',
            pourquoi: `${combien} fois sur ${total} : ${combien} ÷ ${total} = ${
                enFrancais(combien / total)}, soit ${enFrancais(f)} %.`,
            aide: 'La fréquence répond à « quelle PART du total ? », pas à « combien ? ». '
                + 'On divise l\'effectif par le total, puis on multiplie par 100.'
        };
    }

    if (etape.id === 'moyenne-manquante') {
        // LE CHEMIN À L'ENVERS, et c'est l'exercice type du brevet.
        const m = s.centre + rng.int(-2, 2);
        const serie = serieDeMoyenne(m, rng.int(4, 5), (a, b) => rng.int(a, b), s.ecart);
        const cachee = serie[serie.length - 1];
        const connues = serie.slice(0, -1);
        const somme = serie.length * m;
        // L'ÉNONCÉ PARLE DE CE QU'ON MESURE, PAS DE CEUX QU'ON MESURE.
        //
        // Première version : « Élèves : ils sont 5, et la moyenne de la classe
        // est de 14. » Deux fautes d'un coup — une phrase qui ne se dit pas, et
        // « ils » collé devant « joueuses ». En parlant des NOTES plutôt que des
        // élèves, le genre est celui de `quoiNu`, qui est écrit à côté de lui.
        return {
            enonce: `La moyenne des ${serie.length} ${s.quoiNu} ${s.de} est de ${m}${
                s.unite ? ' ' + s.unite : ''}. `
                + `On en connaît ${serie.length - 1} : ${ecrireSerie(connues)}.`,
            question: 'Quelle est la valeur qui manque ?',
            kind: 'numeric', reponse: cachee, serie, unite: s.unite,
            pourquoi: `La somme de toutes les valeurs vaut ${serie.length} × ${m} = ${somme}. `
                + `Celles qu'on connaît font ${connues.reduce((a, b) => a + b, 0)}. `
                + `Il reste ${somme} − ${connues.reduce((a, b) => a + b, 0)} = ${cachee}.`,
            aide: 'ON REMONTE LE CALCUL. La moyenne s\'obtient en divisant la somme par le '
                + 'nombre de valeurs : la somme s\'obtient donc en MULTIPLIANT la moyenne par '
                + 'ce nombre. Ensuite on retire ce qu\'on connaît déjà.'
        };
    }

    // 'comparer'
    //
    // DEUX SÉRIES DE MÊME MOYENNE, ET C'EST TOUT L'INTÉRÊT DU CHAPITRE. La
    // moyenne ne dit pas tout : deux classes peuvent l'avoir identique et
    // n'avoir rien en commun. C'est l'étendue qui les sépare, et c'est la
    // seule question où l'on demande à quoi sert ce qu'on vient de calculer.
    const m = MATCHS.centre + rng.int(-6, 6);
    const serree = serieDeMoyenne(m, 5, (a, b) => rng.int(a, b), MATCHS.serre);
    const eparpillee = serieDeMoyenne(m, 5, (a, b) => rng.int(a, b), MATCHS.large);
    const premiereEstSerree = rng.int(0, 1) === 1;
    const [a, b] = premiereEstSerree ? [serree, eparpillee] : [eparpillee, serree];
    return {
        enonce: 'Deux équipes ont marqué, sur leurs cinq derniers matchs, le même nombre '
            + `de points EN MOYENNE.\nÉquipe A : ${ecrireSerie(a)}\n`
            + `Équipe B : ${ecrireSerie(b)}`,
        question: 'Quelle équipe est la plus régulière ?',
        kind: 'choice', reponse: premiereEstSerree ? 'A' : 'B', choix: ['A', 'B'],
        serie: a.concat(b),
        pourquoi: `Les deux moyennes valent ${enFrancais(moyenne(a))} points. Mais l'étendue `
            + `de l'équipe A vaut ${etendue(a)} et celle de l'équipe B ${etendue(b)} : c'est `
            + `l'équipe ${premiereEstSerree ? 'A' : 'B'} qui est la plus régulière, parce que `
            + 'son étendue est la plus petite.',
        aide: 'LA MOYENNE NE DIT PAS TOUT. Pour savoir si une équipe est régulière, on regarde '
            + 'l\'ÉTENDUE : plus elle est petite, plus les valeurs sont serrées autour de la '
            + 'moyenne.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 1, B: 2, C: 3 };

export const statistiquesGenerator = {
    id: 'don.statistiques',
    label: 'Moyenne, médiane, étendue',
    // QUATRE COMPÉTENCES, et non une. Un élève qui calcule très bien une
    // moyenne et rate toutes les médianes n'a pas « raté les statistiques » :
    // il a raté UNE chose, et c'est toujours la même — ranger la série.
    skills: [S_LIRE, S_MOYENNE, S_MEDIANE, S_FREQUENCE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c, label: `Équipe ${c}`, correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        // L'ÉNONCÉ PORTE DES RETOURS À LA LIGNE, et la série doit rester sur sa
        // propre ligne : écrite à la suite de la phrase, elle se confond avec
        // elle et l'on ne voit plus où commencent les nombres.
        const lignes = q.enonce.split('\n');
        // SUR LE PAPIER, CHAQUE LIGNE FINIT PAR UN POINT.
        //
        // VU SUR LE PDF : « … 166 ; 171 ; 159 ; 165 Quelle est l'étendue de
        // cette série ? ». À l'écran, la série et la question vivent dans deux
        // blocs séparés et rien ne se touche ; sur la feuille elles sont collées
        // bout à bout, et le dernier nombre de la série se lit comme le début
        // de la question.
        //
        // C'est la deuxième fois : « … = 2⁴ × 3 Quel est le PGCD » avait le même
        // défaut, pour la même raison. Une garde du catalogue le tient
        // maintenant pour tout le dépôt.
        const aPlat = lignes.map(l => (/[.!?:]$/.test(l) ? l : `${l}.`)).join(' ');
        return makeItem({
            seed: rng.seed,
            generatorId: 'don.statistiques',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                text: `${aPlat} ${q.question}`.trim(),
                papier: `${aPlat} ${q.question}`.trim(),
                html: '<div class="game-question ap-probleme">'
                    + lignes.map((l, i) => (i === 0
                        ? `<span class="ap-situation">${l}</span>`
                        : `<span class="st-serie">${l}</span>`)).join('')
                    + `<span class="ap-question">${q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                q.aide,
                'Recopie la série sur ton brouillon : on ne range pas une liste de huit nombres '
                    + 'de tête, et c\'est là que les fautes arrivent.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                // LA VIRGULE N'EST OFFERTE QUE LÀ OÙ ELLE A UN SENS : la
                // médiane d'une série paire et la fréquence. Partout ailleurs
                // la réponse est entière, et une touche inutile est une
                // invitation à la faute.
                decimal: !!q.decimal || etape.id === 'frequence',
                serie: q.serie || null,
                ...(q.unite ? { unite: q.unite } : {}),
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default statistiquesGenerator;
