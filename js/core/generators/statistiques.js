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
    moyenne, mediane, etendue, effectif, frequence, rangee, enFrancais, serieDeMoyenne,
    verifieMoyenneEcrite
} from '../statistiques.js';
// LE NOMBRE ÉCRIT EN LETTRES, et il ne sert qu'à UN énoncé — voir
// `moyenne-manquante`, où « On en connaît 3 » se lisait comme une valeur
// de la série.
import { spellInteger } from '../numberWords.js';

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
        phrase: (n) => `Notes sur 20 de ${n} élèves :`
    },
    {
        quoiNu: 'tailles', genre: 'f', unite: 'cm', de: 'de l\'équipe',
        qui: 'joueuses', mesure: 'taille', centre: 165, ecart: 9,
        phrase: (n) => `Tailles (cm) de ${n} joueuses :`
    },
    {
        quoiNu: 'âges', genre: 'm', unite: 'ans', de: 'du club',
        qui: 'membres', mesure: 'âge', centre: 14, ecart: 3,
        phrase: (n) => `Âges (ans) de ${n} membres du club :`
    },
    {
        quoiNu: 'températures', genre: 'f', unite: '°C', de: 'de la semaine',
        qui: 'jours', mesure: 'température', centre: 18, ecart: 5,
        phrase: (n) => `Températures (°C) de ${n} jours :`
    },
    {
        quoiNu: 'temps', genre: 'm', unite: 's', de: 'de la course',
        qui: 'coureurs', mesure: 'temps', centre: 45, ecart: 6,
        phrase: (n) => `Temps (s) de ${n} coureurs :`
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
    { id: 'etendue-etapes', temps: 'A', titre: 'L\'étendue, pas à pas', skill: S_LIRE },
    { id: 'moyenne', temps: 'B', titre: 'Calculer la moyenne', skill: S_MOYENNE },
    { id: 'moyenne-etapes', temps: 'B', titre: 'La moyenne, pas à pas', skill: S_MOYENNE },
    // ── LES DEUX MARCHES DU 17 NOVEMBRE ────────────────────────────────────
    //
    // RÉMY : « pour la moyenne il faudrait que l'élève écrive le calcul (avec
    // parenthèses) et il faut de la moyenne pondérée ».
    //
    // ELLES NE REMPLACENT PAS « Calculer la moyenne », elles la suivent : on
    // apprend d'abord à trouver le nombre, puis à ÉCRIRE le chemin qui y mène.
    // C'est la leçon du tableur, qu'il avait déjà tranchée — « la bonne réponse
    // est =A1+B1 pas 17 ».
    { id: 'moyenne-calcul', temps: 'B', titre: 'Écrire le calcul de la moyenne',
        skill: S_MOYENNE },
    { id: 'moyenne-ponderee', temps: 'C', titre: 'La moyenne pondérée',
        skill: S_MOYENNE },
    { id: 'mediane-rangee', temps: 'B', titre: 'La médiane, série rangée', skill: S_MEDIANE },
    { id: 'mediane-desordre', temps: 'B', titre: 'La médiane, série en désordre', skill: S_MEDIANE },
    { id: 'mediane-paire', temps: 'B', titre: 'La médiane, série paire', skill: S_MEDIANE },
    { id: 'mediane-etapes', temps: 'B', titre: 'La médiane, pas à pas', skill: S_MEDIANE },
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
            // ON NE REDIT PAS CE QUE L'ÉTIQUETTE VIENT DE DIRE. « Âges (ans)
            // de 9 membres du club : … » puis « Combien de membres ont un âge
            // de 16 ans ? » nomme deux fois les membres et deux fois les âges,
            // pour une question qui tient en quatre mots. Rémy : « les énoncés
            // doivent être plus court, vraiment sans exception ».
            question: `Combien ont ${valeur}${s.unite ? ' ' + s.unite : ''} ?`,
            kind: 'numeric', reponse: combien, serie,
            pourquoi: `On compte : ${valeur} apparaît ${combien} fois dans la série. `
                + 'C\'est l\'EFFECTIF de cette valeur.',
            aide: 'On barre les valeurs au fur et à mesure qu\'on les compte : c\'est le seul '
                + 'moyen de ne pas en oublier une ni d\'en compter une deux fois.',
            calcul: `Je compte combien de fois ${valeur} apparaît, en barrant au fur et à mesure.`
        };
    }

    if (etape.id === 'etendue') {
        const serie = serieDeMoyenne(s.centre, rng.int(5, 8), (a, b) => rng.int(a, b), s.ecart);
        const e = etendue(serie);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Étendue ?',
            kind: 'numeric', reponse: e, serie, unite: s.unite,
            pourquoi: `La plus grande valeur est ${Math.max(...serie)}, la plus petite ${
                Math.min(...serie)} : l'étendue vaut ${Math.max(...serie)} − ${
                Math.min(...serie)} = ${e}${s.unite ? ' ' + s.unite : ''}.`,
            aide: 'L\'étendue est une SOUSTRACTION : la plus grande moins la plus petite. '
                + 'Elle ne dit pas où sont les valeurs, elle dit si elles sont serrées.',
            calcul: `Je repère la plus grande et la plus petite, puis je soustrais : ${
                Math.max(...serie)} − ${Math.min(...serie)}.`
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
            question: 'Moyenne ?',
            kind: 'numeric', reponse: vraie, serie, unite: s.unite,
            pourquoi: `La somme vaut ${somme}, il y a ${serie.length} valeurs : `
                + `${somme} ÷ ${serie.length} = ${enFrancais(vraie)}${s.unite ? ' ' + s.unite : ''}.`,
            aide: 'On additionne TOUTES les valeurs — y compris celles qui se répètent — puis '
                + 'on divise par leur NOMBRE, pas par la plus grande ni par le nombre de '
                + 'valeurs différentes.',
            calcul: `J'additionne les ${serie.length} valeurs, puis je divise la somme par ${
                serie.length}.`
        };
    }

    // ── ÉCRIRE LE CALCUL, ET NON SON RÉSULTAT ──────────────────────────────
    //
    // RÉMY : « pour la moyenne il faudrait que l'élève écrive le calcul (avec
    // parenthèses) ».
    //
    // POURQUOI CE N'EST PAS LA MÊME QUESTION. Un élève qui tape 15 a peut-être
    // compris, ou peut-être deviné, ou peut-être compté sur ses doigts la
    // valeur du milieu : la réponse ne dit rien de sa méthode. Un élève qui
    // écrit (12+15+18)/3 a montré la seule chose qu'on cherche à lui apprendre.
    //
    // ET LES PARENTHÈSES SONT LE SUJET, PAS LA FORME : 12+15+18/3 vaut 33, et
    // c'est LA faute du chapitre. Elle est invisible tant qu'on ne demande que
    // le résultat ; ici elle se voit, et le refus la nomme.
    //
    // LA SÉRIE EST COURTE — trois ou quatre valeurs. On écrit un calcul à la
    // main sur un clavier à l'écran : huit nombres à taper feraient de la
    // SAISIE l'exercice, et des fautes de frappe la note.
    if (etape.id === 'moyenne-calcul') {
        const m = s.centre + rng.int(-2, 2);
        const serie = serieDeMoyenne(m, rng.int(3, 4), (a, b) => rng.int(a, b), s.ecart);
        const somme = serie.reduce((a, b) => a + b, 0);
        const n = serie.length;
        return {
            enonce: `${s.phrase(n)}\n${ecrireSerie(serie)}`,
            question: 'Écris le CALCUL de la moyenne, avec les parenthèses.',
            kind: 'texte',
            // LA RÉPONSE DE RÉFÉRENCE sert au corrigé et à la feuille ; c'est
            // `verifie` qui juge, et il accepte tous les ordres de la somme.
            reponse: `(${serie.join('+')})/${n}`,
            serie,
            verifie: (saisie) => verifieMoyenneEcrite(saisie, serie, n),
            // LE CLAVIER NE PORTE QUE CE QUE CETTE QUESTION PEUT VOULOIR.
            //
            // `carre: false` EST INDISPENSABLE, et il manquait : la touche « ² »
            // est allumée PAR DÉFAUT — elle sert partout en calcul littéral —,
            // et `exposant: false` ne la retient pas, puisque ce sont deux
            // réglages distincts (l'un la touche « ² », l'autre la touche « ^ »).
            // VU À L'ÉCRAN : un « ² » seul, flottant au-dessus du pavé, sur une
            // moyenne d'âges. C'est la règle déjà écrite dans `litteralSaisie` —
            // « une touche offerte est une touche qu'on croit utile » — et on la
            // paie dès qu'on ne la relit pas.
            composable: { lettre: null, parentheses: true, fraction: true,
                multiplication: false, exposant: false, carre: false },
            pourquoi: `On additionne les ${n} valeurs — (${serie.join(' + ')}) = ${somme} — `
                + `puis on divise cette somme par ${n} : ${somme} ÷ ${n} = `
                + `${enFrancais(moyenne(serie))}. Les parenthèses disent que c'est TOUTE `
                + `la somme qu'on divise.`,
            aide: 'Les parenthèses d\'abord : elles enferment la somme. Sans elles, seule '
                + 'la dernière valeur serait divisée.',
            calcul: `J'écris (${serie.join(' + ')}) ÷ ${n}.`
        };
    }

    // ── LA MOYENNE PONDÉRÉE ────────────────────────────────────────────────
    //
    // RÉMY : « et il faut de la moyenne pondérée ».
    //
    // C'EST LA MOYENNE DES NOTES AVEC COEFFICIENTS, celle de son bulletin. La
    // faute du chapitre n'est plus la parenthèse, c'est le DÉNOMINATEUR : on
    // divise par la somme des coefficients, pas par le nombre de notes. Les
    // leurres la portent, et l'explication la nomme.
    if (etape.id === 'moyenne-ponderee') {
        const combien = rng.int(2, 3);
        const notes = [], coefs = [];
        for (let k = 0; k < combien; k++) {
            notes.push(rng.int(6, 18));
            coefs.push(rng.int(1, 4));
        }
        const poids = coefs.reduce((a, b) => a + b, 0);
        const total = notes.reduce((a, b, k) => a + b * coefs[k], 0);
        const vraie = total / poids;
        // ON TIRE JUSQU'À CE QUE ÇA TOMBE JUSTE : une moyenne pondérée à
        // 13,666… se répond « 13,67 » ou « 13,7 », et l'on noterait alors un
        // arrondi au lieu d'une méthode.
        if (!Number.isInteger(vraie * 10)) return question(etape, rng);
        // ── ET DES COEFFICIENTS TOUS ÉGAUX NE PÈSENT RIEN ──────────────────
        //
        // VU À L'ÉCRAN : « Note 14 · 11 / Coefficient 1 · 1 ». C'est une
        // moyenne ORDINAIRE habillée en tableau : diviser par la somme des
        // coefficients et diviser par le nombre de notes donnent le même
        // résultat, donc la faute du chapitre est non seulement invisible,
        // elle est IMPOSSIBLE — et le leurre qui la porte vaut exactement la
        // bonne réponse, qu'on proposerait donc deux fois, une fois marquée
        // fausse.
        //
        // Le cas n'est pas rare : avec deux notes et des coefficients tirés
        // entre 1 et 4, il tombe une fois sur quatre.
        //
        // ON TIRE AUSSI LES NOTES DIFFÉRENTES, pour la même raison : deux
        // fois 12, quels que soient les coefficients, font 12 des deux
        // façons de compter.
        if (coefs.every(c => c === coefs[0])) return question(etape, rng);
        if (notes.every(v => v === notes[0])) return question(etape, rng);
        const lignes = notes.map((v, k) => `${v} (coef. ${coefs[k]})`).join(' · ');
        // ── LE TABLEAU, ET POURQUOI CE N'EST PAS UN ORNEMENT ────────────────
        //
        // RÉMY, en voyant la question à l'écran : « si ce sont des notes avec
        // coeff tu peux le présenter en tableau pour les moyennes pondérées ».
        //
        // Écrite en ligne, « 15 (coef. 1) · 16 (coef. 4) » demande de tenir
        // quatre nombres APPARIÉS dans la tête avant même de commencer. Et la
        // faute du chapitre — diviser par le nombre de notes au lieu de la
        // somme des coefficients — en devient plus facile, puisque cette somme
        // n'est écrite nulle part et qu'il faut d'abord aller chercher les
        // coefficients un par un entre les parenthèses. En tableau, la ligne
        // « Coefficient » se lit et s'additionne du regard : c'est le même
        // tableau que celui du bulletin, qui est l'endroit où l'élève
        // rencontre vraiment la moyenne pondérée.
        //
        // LE TABLEAU EST DANS L'ÉNONCÉ, PAS DANS UNE FIGURE : il porte les
        // nombres de la question, donc il doit être lu par la voix de synthèse
        // et imprimé dans l'ordre. D'où `<th scope="row">`, et non des cases
        // mises en forme.
        const rangee = (nom, vals) => `<tr><th scope="row">${nom}</th>`
            + vals.map(v => `<td>${v}</td>`).join('') + '</tr>';
        const htmlSerie = '<table class="st-coefs">'
            + rangee('Note', notes) + rangee('Coefficient', coefs) + '</table>';
        return {
            enonce: `Les notes de Camille, avec leur coefficient :\n${lignes}`,
            htmlSerie,
            question: 'Moyenne ?',
            kind: 'numeric', reponse: vraie, decimal: !Number.isInteger(vraie),
            serie: notes,
            pourquoi: `Chaque note compte autant de fois que son coefficient : `
                + `${notes.map((v, k) => `${v} × ${coefs[k]}`).join(' + ')} = ${total}. `
                + `On divise par la somme des coefficients, ${coefs.join(' + ')} = ${poids}, `
                + `et non par ${combien} : ${total} ÷ ${poids} = ${enFrancais(vraie)}.`,
            aide: 'Une note de coefficient 3 compte TROIS fois. On divise ensuite par la '
                + 'somme des coefficients, pas par le nombre de notes.',
            calcul: `Je fais ${notes.map((v, k) => `${v} × ${coefs[k]}`).join(' + ')}, `
                + `puis je divise par ${poids}.`,
            leurres: [
                // LA FAUTE DU CHAPITRE : diviser par le nombre de notes.
                { v: Number((total / combien).toFixed(2)),
                    why: `Tu as divisé par ${combien}, le nombre de notes. Il faut diviser `
                        + `par la somme des COEFFICIENTS, ${poids}.` },
                // ET CELLE D'AVANT : oublier les coefficients tout court.
                { v: Number((notes.reduce((a, b) => a + b, 0) / combien).toFixed(2)),
                    why: 'Tu as fait la moyenne ordinaire : les coefficients n\'ont pas '
                        + 'servi. Une note de coefficient 3 compte trois fois.' }
            ]
        };
    }

    // ── LES TROIS MARCHES « PAS À PAS » ────────────────────────────────────
    //
    // RÉMY, le 16 novembre : « tu me fais […] les statistiques (par étape) ».
    //
    // CE QU'UNE QUESTION DIRECTE NE DIT PAS. « Moyenne ? » se répond juste ou
    // faux, et un élève qui rate ne sait pas OÙ il a raté : dans la somme,
    // dans le compte des valeurs, ou dans la division. Ici il remplit les
    // trois cases, et c'est la case fausse qui le dit.
    //
    // ON NE REFAIT PAS UNE ACTIVITÉ POUR CELA : le pavé numérique sait déjà
    // remplir plusieurs cases, à condition que l'ÉNONCÉ les déclare avec
    // `data-trou` — voir `aTrous` dans `core/activities/numeric.js`. La
    // réponse est alors la suite des cases séparées par des barres, et c'est
    // une PAIRE RANGÉE qu'on juge : intervertir la somme et l'effectif n'est
    // pas accepté, et c'est précisément la faute qu'on veut voir.
    //
    // LES TROIS MARCHES DOUBLENT LEUR VOISINE DIRECTE, elles ne la remplacent
    // pas : on fait le chemin en trois temps, puis on le fait d'un coup. Le
    // professeur coche l'un, l'autre, ou les deux.

    if (etape.id === 'etendue-etapes') {
        const serie = serieDeMoyenne(s.centre, rng.int(5, 8), (a, b) => rng.int(a, b), s.ecart);
        const hautE = Math.max(...serie), basE = Math.min(...serie);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Remplis les trois cases :',
            // PAS D'ESPACE AVANT LA VIRGULE : c'est une faute de français, et
            // elle s'affiche en grand sous les yeux d'un élève à chaque
            // question. Vue sur la photo, pas dans le code.
            htmlReponse: `la plus grande ${trou(0)}, la plus petite ${trou(1)}`
                + `, l’étendue ${trou(2)}`,
            // SUR LA FEUILLE, LES CASES N'EXISTENT PAS. « Remplis les trois
            // cases : » imprimé seul n'a aucune réponse possible — c'est le
            // défaut du 20 octobre, arrivé trois fois. On écrit donc la phrase
            // en toutes lettres, avec ses pointillés.
            papierReponse: 'la plus grande ….…, la plus petite ….…, l’étendue ….…',
            kind: 'numeric',
            reponse: `${hautE}|${basE}|${hautE - basE}`,
            cases: 3, serie, unite: s.unite,
            pourquoi: `La plus grande vaut ${hautE}, la plus petite ${basE} : l’étendue est `
                + `leur DIFFÉRENCE, ${hautE} − ${basE} = ${hautE - basE}.`,
            aide: 'L’étendue n’est pas une valeur de la série : c’est l’écart entre les deux '
                + 'extrêmes. On les repère d’abord, on soustrait ensuite.',
            calcul: `Je repère ${hautE} et ${basE}, puis je fais ${hautE} − ${basE}.`
        };
    }

    if (etape.id === 'moyenne-etapes') {
        const m = s.centre + rng.int(-2, 2);
        const serie = serieDeMoyenne(m, rng.int(4, 6), (a, b) => rng.int(a, b), s.ecart);
        const somme = serie.reduce((a, b) => a + b, 0);
        return {
            enonce: `${s.phrase(serie.length)}\n${ecrireSerie(serie)}`,
            question: 'Remplis les trois cases :',
            // L'ORDRE EST CELUI DU CALCUL, pas celui de la formule écrite au
            // tableau : on compte, on additionne, on divise. Mettre la moyenne
            // en premier obligerait à la connaître pour remplir le reste.
            htmlReponse: `${trou(0)} valeurs, somme ${trou(1)}, moyenne ${trou(2)}`,
            papierReponse: '….… valeurs, somme ….…, moyenne ….…',
            kind: 'numeric',
            reponse: `${serie.length}|${somme}|${moyenne(serie)}`,
            cases: 3, serie, unite: s.unite,
            pourquoi: `Il y a ${serie.length} valeurs et leur somme vaut ${somme} : `
                + `${somme} ÷ ${serie.length} = ${enFrancais(moyenne(serie))}.`,
            aide: 'Trois gestes, dans cet ordre : COMPTER les valeurs, les ADDITIONNER, puis '
                + 'diviser la somme par le compte. La faute la plus fréquente est de diviser '
                + 'par le nombre de valeurs DIFFÉRENTES.',
            calcul: `Je compte les valeurs, j’additionne, puis je divise la somme par ${
                serie.length}.`
        };
    }

    if (etape.id === 'mediane-etapes') {
        // SÉRIE IMPAIRE ET EN DÉSORDRE : c'est le cas où le RANG se calcule et
        // sert vraiment. Sur une série paire, la médiane n'est pas une valeur
        // de la série, et la troisième case changerait de sens.
        const combien = rng.int(2, 3) * 2 + 1;
        const serie = rng.shuffle(serieDeMoyenne(s.centre, combien,
            (a, b) => rng.int(a, b), s.ecart));
        const triee = rangee(serie);
        const rang = (combien + 1) / 2;
        return {
            enonce: `${s.phrase(combien)}\n${ecrireSerie(serie)}`,
            question: 'Range la série au brouillon, puis remplis :',
            htmlReponse: `${trou(0)} valeurs, la médiane est la ${trou(1)}<sup>e</sup>`
                + `, elle vaut ${trou(2)}`,
            papierReponse: '….… valeurs, la médiane est la ….…e, elle vaut ….…',
            kind: 'numeric',
            reponse: `${combien}|${rang}|${triee[rang - 1]}`,
            cases: 3, serie, unite: s.unite,
            pourquoi: `Rangée : ${ecrireSerie(triee)}. Il y a ${combien} valeurs, donc la `
                + `médiane est la ${rang}<sup>e</sup> : ${triee[rang - 1]}. Autant avant, `
                + 'autant après.',
            aide: 'La médiane COUPE la série en deux parts égales. Avec un nombre impair de '
                + 'valeurs, c’est celle du milieu de la série RANGÉE — et son rang se calcule '
                + 'avant de la chercher.',
            calcul: `Je range les ${combien} valeurs, puis je prends la ${rang}e.`
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
            question: 'Médiane ?',
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
            // ── « IL FAUT DIRE QU'IL FAUT RANGER DANS L'ORDRE CROISSANT » ──────
            //
            // RÉMY, carnet du 24 octobre : « Quand on demande la médiane, en
            // indice, il faut dire qu'il faut ranger les nombres dans l'ordre
            // croissant ».
            //
            // LA MARCHE PAIRE NE LE DISAIT PAS DU TOUT, et c'est la pire des
            // trois : elle donne la série EN DÉSORDRE (voir `serie` ci-dessus,
            // seule `mediane-rangee` est triée) et son indice ne parlait que du
            // nombre pair de valeurs. Un élève qui le suit à la lettre prend les
            // deux du milieu de la liste TELLE QU'ELLE EST ÉCRITE et calcule leur
            // moyenne — il a fait exactement ce qu'on lui disait, et il a faux.
            aide: paire
                ? 'ON RANGE D\'ABORD, DANS L\'ORDRE CROISSANT. Puis ATTENTION : la série a un '
                    + 'nombre PAIR de valeurs, il y a donc DEUX valeurs au milieu, et la '
                    + 'médiane est leur moyenne — elle n\'est pas forcément dans la série.'
                : etape.id === 'mediane-rangee'
                    ? 'La série est déjà rangée dans l\'ordre croissant : la médiane est la '
                        + 'valeur qui a autant de valeurs avant elle qu\'après elle.'
                    : 'ON RANGE D\'ABORD, DANS L\'ORDRE CROISSANT. Le terme du milieu de la '
                        + 'liste telle qu\'elle est écrite n\'est pas la médiane — c\'est juste '
                        + 'un nombre de la série.',
            // ET LE ROBOT MONTRE LE GESTE. « le robot doit aussi montrer comment
            // on calcule la moyenne et montrer comment on trouve une médiane » :
            // c'est le DERNIER indice qu'il prononce juste avant de taper (voir
            // `phraseCalcul` dans activities/numeric.js), et il doit donc POSER
            // le calcul sans le faire.
            calcul: paire
                ? `Je range dans l'ordre croissant : ${tri.length} valeurs, donc la moyenne `
                    + 'des DEUX du milieu.'
                : etape.id === 'mediane-rangee'
                    ? `Elle est déjà rangée : je prends la ${demi + 1}ᵉ valeur sur ${tri.length}.`
                    : `Je range dans l'ordre croissant, puis je prends la ${demi + 1}ᵉ valeur `
                        + `sur ${tri.length}.`
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
            question: `Fréquence de ${valeur}, en % ?`,
            kind: 'numeric', reponse: f, serie, unite: '%',
            pourquoi: `${combien} fois sur ${total} : ${combien} ÷ ${total} = ${
                enFrancais(combien / total)}, soit ${enFrancais(f)} %.`,
            aide: 'La fréquence répond à « quelle PART du total ? », pas à « combien ? ». '
                + 'On divise l\'effectif par le total, puis on multiplie par 100.',
            calcul: `Je compte combien de ${valeur}, je divise par ${total}, je multiplie par 100.`
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
        // ── « ON A L'IMPRESSION QUE LE 3 FAIT PARTIE DE LA SÉRIE » ─────────
        //
        // RÉMY, carnet du 24 octobre, en recopiant l'énoncé tel qu'il le lit :
        //
        //     « La moyenne des 4 notes de la classe est de 12. On en connaît
        //       3 : 12 ; 9 ; 11. »
        //
        //     « On a l'impresion que le 3 fait partie de la série. »
        //
        // IL A RAISON, ET LA FAUTE EST TYPOGRAPHIQUE. Le « 3 » est un COMPTE,
        // les « 12 ; 9 ; 11 » sont des VALEURS, et rien ne les distingue : même
        // police, même ligne, un deux-points entre les deux comme il y en a un
        // entre « notes » et la liste partout ailleurs dans cet exercice. Un
        // élève lit quatre nombres là où il n'y en a que trois.
        //
        // DEUX CORRECTIONS, ET IL FAUT LES DEUX : le compte s'écrit EN LETTRES
        // — un mot ne peut pas se confondre avec un nombre de la série —, et la
        // série passe sur SA PROPRE LIGNE, comme dans les huit autres marches.
        // Écrire seulement le compte en lettres laisserait « On en connaît
        // trois : 12 ; 9 ; 11 » sur une ligne, où la liste reste accrochée à la
        // phrase.
        return {
            enonce: `La moyenne des ${serie.length} ${s.quoiNu} ${s.de} est de ${m}${
                s.unite ? ' ' + s.unite : ''}. `
                + `On en connaît ${spellInteger(serie.length - 1)} :\n${ecrireSerie(connues)}`,
            question: 'Valeur manquante ?',
            kind: 'numeric', reponse: cachee, serie, unite: s.unite,
            pourquoi: `La somme de toutes les valeurs vaut ${serie.length} × ${m} = ${somme}. `
                + `Celles qu'on connaît font ${connues.reduce((a, b) => a + b, 0)}. `
                + `Il reste ${somme} − ${connues.reduce((a, b) => a + b, 0)} = ${cachee}.`,
            aide: 'ON REMONTE LE CALCUL. La moyenne s\'obtient en divisant la somme par le '
                + 'nombre de valeurs : la somme s\'obtient donc en MULTIPLIANT la moyenne par '
                + 'ce nombre. Ensuite on retire ce qu\'on connaît déjà.',
            // « Aide davantage pour calculer la valeur manquante. » Le dernier
            // indice POSE le calcul avec les vrais nombres — c'est lui que le
            // robot prononce avant de taper.
            calcul: `La somme de toutes vaut ${serie.length} × ${m} = ${somme}. J'en retire `
                + `les ${spellInteger(serie.length - 1)} connues.`
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
            + 'moyenne.',
        calcul: 'Je calcule l\'étendue de chaque équipe : la plus petite, c\'est la plus régulière.'
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
            // ── LA MOYENNE PONDÉRÉE PORTE SES DEUX FAUTES ───────────────────
            //
            // Diviser par le nombre de notes, et oublier les coefficients. Ce
            // sont les deux seules qu'on voit en classe, et chacune a sa
            // phrase : un leurre sans « pourquoi » apprend qu'on s'est trompé,
            // et rien d'autre.
            : (q.leurres
                ? finalizeChoices(rng, [
                    { value: String(q.reponse), label: enFrancais(q.reponse), correct: true },
                    // UN LEURRE QUI VAUT LA BONNE RÉPONSE S'AFFICHERAIT DEUX
                    // FOIS, une fois marqué faux : l'élève cliquerait le bon
                    // nombre et se verrait refusé. Le tirage écarte déjà le cas
                    // le plus fréquent (tous les coefficients égaux), mais la
                    // moyenne ordinaire peut tomber sur la pondérée par
                    // coïncidence — on ne garde que ce qui diffère, et
                    // `finalizeChoices` complète.
                    ...q.leurres
                        .filter(l => Number(l.v) !== Number(q.reponse))
                        .map(l => ({ value: String(l.v), label: enFrancais(l.v),
                            correct: false, why: l.why }))
                ], { count: 4,
                    filler: (r) => {
                        const v = Number((q.reponse + r.int(1, 4) * (r.int(0, 1) ? 1 : -1))
                            .toFixed(2));
                        return { value: String(v), label: enFrancais(v) };
                    } })
                : null);

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
            // UNE RÉPONSE ÉCRITE EST UN TEXTE, pas un nombre : `(12+15+18)/3`
            // ne se compare pas comme 15. C'est `verifieTexte` qui juge.
            answerKind: q.kind === 'texte' ? 'text' : q.kind,
            prompt: {
                text: `${aPlat} ${q.question}`.trim(),
                // LA FEUILLE PORTE LA PHRASE À TROUS EN TOUTES LETTRES.
                //
                // Les marches « pas à pas » demandent trois nombres dans une
                // phrase que l'écran dessine en cases. Imprimée sans elle,
                // « Remplis les trois cases : » n'a aucune réponse possible —
                // le défaut du 20 octobre, arrivé trois fois.
                papier: `${aPlat} ${q.question}${
                    q.papierReponse ? ' ' + q.papierReponse : ''}`.trim(),
                // UNE SÉRIE PEUT SE DESSINER PLUTÔT QUE S'ÉCRIRE EN LIGNE —
                // le tableau des coefficients, demandé par Rémy. L'énoncé en
                // toutes lettres (`enonce`, `papier`) reste celui de la feuille
                // imprimée et de la voix : on ne remplace que l'affichage.
                html: '<div class="game-question ap-probleme">'
                    + (q.htmlSerie
                        ? `<span class="ap-situation">${lignes[0]}</span>${q.htmlSerie}`
                        : lignes.map((l, i) => (i === 0
                            ? `<span class="ap-situation">${l}</span>`
                            : `<span class="st-serie">${l}</span>`)).join(''))
                    + `<span class="ap-question">${q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            verifieTexte: q.verifie || null,
            // ── LE DERNIER INDICE POSE LE CALCUL ───────────────────────────
            //
            // RÉMY : « le robot doit aussi montrer comment on calcule la
            // moyenne et montrer comment on trouve une médiane ».
            //
            // POURQUOI IL NE MONTRAIT RIEN : sur le pavé numérique, le robot
            // prononce le DERNIER indice juste avant de taper (`phraseCalcul`
            // dans activities/numeric.js), et seulement s'il tient en cent dix
            // caractères. Le dernier indice était ici « Recopie la série sur
            // ton brouillon… », cent trente-trois caractères ET une phrase de
            // GESTE. Le robot retombait donc sur « Je tape 12 chiffre par
            // chiffre » — exactement ce que Rémy avait déjà refusé sur les
            // pourcentages : « Le robot n'explique rien. Il faut qu'il donne le
            // calcul plutôt que juste taper la réponse. »
            //
            // Chaque marche porte maintenant son `calcul` : il POSE l'opération
            // avec les vrais nombres, sans la faire, et il tient dans la bulle.
            hints: [
                q.aide,
                'Recopie la série sur ton brouillon : on ne range pas une liste de huit nombres '
                    + 'de tête, et c\'est là que les fautes arrivent.',
                q.calcul
            ].filter(Boolean),
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
                // ── LE CLAVIER D'UNE RÉPONSE ÉCRITE ─────────────────────────
                //
                // `saisieSeule` parce qu'il n'y a pas de marche plus basse :
                // on ne propose pas quatre calculs à choisir, cela rendrait la
                // question à ce qu'elle n'est plus — reconnaître au lieu
                // d'écrire. Et `composable: 'litteral'` parce que ce clavier-là
                // porte les parenthèses et la barre de fraction ; le pavé
                // numérique n'a ni l'une ni l'autre.
                ...(q.composable
                    ? { saisieSeule: true, composable: 'litteral', ...q.composable }
                    : {}),
                ...(q.unite ? { unite: q.unite } : {}),
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default statistiquesGenerator;
