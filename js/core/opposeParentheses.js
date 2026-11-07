// ENLEVER LES PARENTHÈSES — l'échelle que Rémy a écrite.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, APRÈS AVOIR VU SES ÉLÈVES DESSUS : « Au départ, je préfèrerais juste
// remplacer (avec QCM éventuellement)
//
//     −(−4) = ?
//     −(+4) = ?
//
// puis −(−4) + (−5) = .................. =
// L'élève écrit +4 − 5 et donne le résultat
//
// Puis −(−3+5) = −(....)
// L'élève met la réponse
//
// Puis −(−3+5) − (−9−5) = −(....) − (....) = ....................
//
// Puis avec des priorités opératoires (pour l'instant on n'a pas encore fait le
// produit de nombres négatifs). »
//
// ── POURQUOI CETTE ÉCHELLE-LÀ, ET PAS CELLE D'AVANT ─────────────────────────
//
// L'ANCIENNE DEMANDAIT DE CONDUIRE UNE CASCADE DÈS LA PREMIÈRE QUESTION :
// cliquer l'opération à faire, en donner le résultat, recommencer. C'est le
// geste du chapitre des priorités — pas celui d'ici. Ici on apprend UNE règle,
// « un moins devant une parenthèse change les signes dedans », et l'on ne
// devrait avoir à penser qu'à elle.
//
// LA PROGRESSION DE RÉMY SÉPARE CE QUE L'ANCIENNE MÊLAIT :
//
//     1. la règle seule, sur un nombre            −(−4) = 4
//     2. la règle dans un calcul, sans la calculer −(−4) + (−5) = 4 − 5 = −1
//     3. ce qu'on fait AVANT la règle              −(−3 + 5) = −(2) = −2
//     4. deux fois la même chose                   −(−3+5) − (−9−5) = …
//     5. et seulement là, les priorités             −(−3 + 5 × 6) − (−7)
//
// Au barreau 2, l'élève écrit la ligne réécrite AVANT de la calculer. C'est le
// cœur de la demande : on sépare « enlever les parenthèses » de « calculer »,
// parce que c'est en les faisant d'un coup qu'on se trompe.
//
// ── CE QU'ON N'ÉCRIT PAS ────────────────────────────────────────────────────
//
// AUCUN PRODUIT DE DEUX RELATIFS, à aucun barreau. Rémy : « pour l'instant on
// n'a pas encore fait le produit de nombres négatifs ». Le barreau 5 a bien un
// « × », mais entre deux nombres POSITIFS (5 × 6) : c'est une priorité à
// respecter, pas une règle des signes à deviner.
//
// ET LE DEUXIÈME TERME D'UNE PARENTHÈSE EST TOUJOURS POSITIF : on écrit
// « −(−3 + 5) » et « −(−9 − 5) », jamais « −(−3 + (−5)) ». C'est l'écriture de
// Rémy au tableau, et une parenthèse dans une parenthèse ajoute une difficulté
// qui n'est pas celle du barreau.

import { sansPlusFacultatif } from './plusFacultatif.js';

/** Le signe d'écriture d'un relatif isolé : « −3 », « 5 ». */
const relatif = (n) => (n < 0 ? '−' : '') + Math.abs(n);

/** Un relatif entre parenthèses, comme au tableau : « (−4) », « (+5) ». */
const enPar = (n) => '(' + (n < 0 ? '−' : '+') + Math.abs(n) + ')';

// ON PASSE PAR L'API DE `makeRng` — `int`, `bool`, `shuffle` — et non par un
// appel nu. Ce dépôt n'a qu'un générateur de hasard, et l'avoir pris pour une
// fonction a fait tomber sept épreuves d'un coup sur « rng is not a function ».
const entre = (rng, a, b) => rng.int(a, b);

/** Un morceau de ligne : du texte qu'on lit. */
const txt = (v) => ({ t: 'texte', v });

/**
 * UN TROU. `attendu` porte TOUTES les écritures justes — jamais une seule.
 *
 * @param {string[]} attendu  les écritures acceptées, déjà normalisées
 * @param {string} genre      'nombre' ou 'expression' (change le pavé et l'aide)
 * @param {string} montre     ce qu'on affiche à la correction
 */
const trou = (attendu, genre, montre) => ({ t: 'trou', attendu, genre, montre });

/**
 * NORMALISER UNE RÉPONSE ÉCRITE, pour la comparer à ce qu'on attend.
 *
 * On ramène à la même forme tout ce qui ne distingue rien : les espaces (y
 * compris insécables, qu'un copier-coller apporte), le tiret du clavier et le
 * vrai signe moins, la virgule décimale. On ne touche PAS aux parenthèses :
 * leur présence est justement ce qu'on vérifie au barreau 2.
 */
export function normaliserEcriture(s) {
    return String(s == null ? '' : s)
        .replace(/[\s  ]/g, '')
        .replace(/[–—−]/g, '-')
        .replace(/,/g, '.');
}

/**
 * LA RÉPONSE EST-ELLE JUSTE ?
 *
 * ON ACCEPTE « 4 − 5 » ET « +4 − 5 ». Rémy, à la question posée : les deux.
 * « Ce qu'on vérifie, c'est que les parenthèses ont disparu et que les signes
 * sont bons » — un élève qui écrit « 4 − 5 » a compris exactement la même
 * chose que celui qui écrit « +4 − 5 ». Le `+` de tête est une trace utile au
 * tableau, pas une condition de justesse.
 *
 * ET « −(−2) + (+7) » VAUT « −(−2) + (7) ». La même phrase, et il a fallu
 * qu'une élève de Rémy la paye pour qu'on voie que le code ne l'appliquait
 * qu'au PREMIER caractère : son « + » était dans une parenthèse. La règle vit
 * maintenant dans `core/plusFacultatif.js`, qui dit où un « + » n'est qu'un
 * signe — et les deux juges de cet exercice l'appellent au lieu de la recopier.
 */
export function reponseJuste(donnee, attendu) {
    // LE « + » FACULTATIF S'ENLÈVE DES DEUX CÔTÉS. On l'enlève avant de
    // comparer plutôt que d'écrire deux écritures attendues pour chaque trou :
    // une règle dite une fois ne peut pas se contredire, deux listes tenues à
    // la main finissent toujours par diverger. (La première version fabriquait
    // la variante par concaténation et produisait « +−4 − 5 » dès que le
    // premier terme était négatif.)
    const d = sansPlusFacultatif(normaliserEcriture(donnee));
    if (!d) return false;
    return attendu.some((a) => d === sansPlusFacultatif(normaliserEcriture(a)));
}

/**
 * BARREAU 1 — LA RÈGLE DU SIGNE, SUR UN SEUL NOMBRE.
 *
 * « −(−4) = ? », « −(+4) = ? ». Rien d'autre à penser.
 *
 * LES PIÈGES DU QCM DISENT CHACUN UNE ERREUR RÉELLE, et c'est à cela qu'ils
 * servent : celui qui clique « −4 » a recopié au lieu de changer le signe ;
 * celui qui clique « 0 » a cru que les deux moins s'annulaient en disparaissant.
 * Une proposition prise au hasard n'apprendrait rien à personne.
 */
function barreau1(rng) {
    const a = entre(rng, 2, 9) * (rng.bool() ? -1 : 1);
    const val = -a;
    return {
        niveau: 1,
        enonce: '−' + enPar(a),
        // LE QCM EST POSSIBLE ICI ET NULLE PART AILLEURS : la réponse est UN
        // nombre parmi quatre. Dès le barreau 2 on écrit une ligne, qu'on ne
        // peut pas proposer en quatre exemplaires sans donner la réponse.
        choix: melanger(rng, [
            { v: relatif(val), juste: true },
            { v: relatif(a), juste: false,
                pourquoi: 'C\'est le nombre recopié tel quel. Le moins devant la '
                    + 'parenthèse en prend l\'OPPOSÉ.' },
            { v: '0', juste: false,
                pourquoi: 'Les deux signes ne s\'effacent pas : ils se combinent. '
                    + 'L\'opposé de ' + relatif(a) + ', c\'est ' + relatif(val) + '.' },
            { v: relatif(val < 0 ? val - 1 : val + 1), juste: false,
                pourquoi: 'Le nombre ne change pas, seul son signe change.' }
        ]),
        // LA LIGNE NE RÉPÈTE PAS L'ÉNONCÉ. L'écran l'écrit déjà en tête : le
        // redire ici l'affichait DEUX FOIS l'un sous l'autre, vu à la capture.
        // Tous les barreaux commencent donc par « = », comme au cahier.
        lignes: [{
            morceaux: [txt('= '), trou([relatif(val)], 'nombre', relatif(val))]
        }],
        reponse: relatif(val),
        pourquoi: 'Un moins devant une parenthèse prend l\'OPPOSÉ de ce qu\'il y a '
            + 'dedans : −' + enPar(a) + ' = ' + relatif(val) + '.'
    };
}

/**
 * BARREAU 2 — LA RÈGLE DANS UN CALCUL, ET ON NE CALCULE PAS ENCORE.
 *
 * « −(−4) + (−5) = ........ = ........ » : d'abord la ligne réécrite sans
 * parenthèses, ensuite seulement le résultat. C'est la demande de Rémy mot
 * pour mot — « L'élève écrit +4 − 5 et donne le résultat » —, et c'est ce
 * découpage qui empêche de tout faire d'un coup, ce qui est la façon dont on
 * se trompe.
 */
function barreau2(rng) {
    const a = entre(rng, 2, 9) * (rng.bool() ? -1 : 1);
    const b = entre(rng, 2, 9) * (rng.bool() ? -1 : 1);
    const lien = rng.bool() ? '+' : '−';
    const t1 = -a;                                   // ce que devient −(a)
    const c2 = lien === '+' ? b : -b;                // ce que devient op (b)
    const reecrit = relatif(t1) + ' ' + (c2 < 0 ? '−' : '+') + ' ' + Math.abs(c2);
    const total = t1 + c2;
    return {
        niveau: 2,
        enonce: '−' + enPar(a) + ' ' + lien + ' ' + enPar(b),
        lignes: [
            {
                aide: 'Réécris la ligne SANS parenthèses. Ne la calcule pas encore.',
                // UNE SEULE ÉCRITURE ATTENDUE : « 4 − 5 ». Le `+` de tête est
                // accepté par `reponseJuste`, qui l'enlève des deux côtés —
                // c'est la réponse de Rémy à la question posée.
                morceaux: [txt('= '), trou([reecrit], 'expression', reecrit)]
            },
            {
                aide: 'Maintenant le résultat.',
                morceaux: [txt('= '), trou([relatif(total)], 'nombre', relatif(total))]
            }
        ],
        reponse: relatif(total),
        pourquoi: '−' + enPar(a) + ' devient ' + relatif(t1) + ', et ' + lien + ' '
            + enPar(b) + ' devient ' + (c2 < 0 ? '−' : '+') + ' ' + Math.abs(c2)
            + '. Donc ' + reecrit + ' = ' + relatif(total) + '.'
    };
}

/**
 * LE CONTENU D'UNE PARENTHÈSE : « −3 + 5 », « −9 − 5 ».
 *
 * Le premier terme est un relatif, le second un POSITIF porté par l'opérateur.
 * On n'écrit donc jamais « −3 + (−5) » : une parenthèse dans une parenthèse
 * ajoute une difficulté qui n'est pas celle de ce barreau.
 */
function dedans(rng) {
    // JAMAIS ZÉRO DEDANS. « −(8 − 8) » fait écrire la ligne « = −(0) », puis
    // « = 0 » : c'est juste, et ce n'est pas la leçon. L'opposé de zéro est un
    // cas à part qui n'apprend pas la règle du signe et donne à l'élève
    // l'occasion de se demander si « −0 » s'écrit. On retire jusqu'à tomber
    // sur autre chose — au pire quelques fois, la moitié des couples convient.
    for (let essai = 0; essai < 20; essai++) {
        const a = entre(rng, 2, 9) * (rng.bool() ? -1 : 1);
        const b = entre(rng, 2, 9);
        const op = rng.bool() ? '+' : '−';
        const valeur = op === '+' ? a + b : a - b;
        if (valeur !== 0) return { texte: relatif(a) + ' ' + op + ' ' + b, valeur };
    }
    // LE DERNIER RECOURS EST ÉCRIT, il ne se devine pas : vingt tirages sans
    // succès est impossible avec ces bornes, mais une boucle qui peut rendre
    // `undefined` casse l'exercice au lieu de le rendre moins joli.
    return { texte: '−3 + 5', valeur: 2 };
}

/**
 * BARREAU 3 — CE QU'ON FAIT AVANT LA RÈGLE.
 *
 * « −(−3 + 5) = −(....) = .... ». Le premier trou est DANS la parenthèse :
 * l'élève voit que la règle du signe attend que l'intérieur soit devenu un
 * seul nombre. C'est la phrase que le moteur de cascade disait déjà en cas de
 * mauvais clic ; ici la forme de la ligne la dit toute seule.
 */
function barreau3(rng) {
    const d = dedans(rng);
    const val = -d.valeur;
    return {
        niveau: 3,
        enonce: '−(' + d.texte + ')',
        lignes: [
            {
                aide: 'Calcule d\'abord ce qu\'il y a DANS la parenthèse.',
                morceaux: [txt('= −('), trou([relatif(d.valeur)], 'nombre', relatif(d.valeur)),
                    txt(')')]
            },
            {
                aide: 'Maintenant enlève la parenthèse.',
                morceaux: [txt('= '), trou([relatif(val)], 'nombre', relatif(val))]
            }
        ],
        reponse: relatif(val),
        pourquoi: 'Dans la parenthèse, ' + d.texte + ' = ' + relatif(d.valeur)
            + '. Le moins devant en prend l\'opposé : ' + relatif(val) + '.'
    };
}

/**
 * BARREAU 4 — DEUX FOIS LA MÊME CHOSE, ET C'EST TOUT L'INTÉRÊT.
 *
 * « −(−3+5) − (−9−5) = −(....) − (....) = .......... = .... ». Rien de neuf par
 * rapport au barreau 3, sinon qu'il faut le faire deux fois sans mélanger les
 * deux — ce qui est exactement la difficulté de l'expression complète.
 *
 * ── TROIS LIGNES, ET LA DEUXIÈME EST CELLE QUI DONNE SON NOM À L'EXERCICE ──
 *
 * RÉMY, regardant un élève sur « −(6 + 8) + (4 − 7) » : « tu vois là on n'a pas
 * encore enlevé les parenthèses ».
 *
 * IL AVAIT RAISON, ET C'ÉTAIT GÊNANT : l'exercice s'appelle « Enlever les
 * parenthèses », et la ligne où elles disparaissent n'était JAMAIS ÉCRITE. On
 * passait de « −(14) + (−3) » au résultat, d'un coup — deux gestes sur une
 * seule ligne, alors que ce barreau existe précisément pour les séparer. Le
 * barreau 2 le faisait déjà correctement ; celui-ci l'avait perdu en route.
 *
 * LA DEUXIÈME LIGNE EST DONC « −14 − 3 » : les parenthèses sont parties, et
 * rien n'est encore calculé. C'est le geste que l'exercice enseigne, et c'est
 * la ligne que l'élève doit écrire de sa main.
 */
function barreau4(rng) {
    const g = dedans(rng);
    const d = dedans(rng);
    const lien = rng.bool() ? '+' : '−';
    // CE QUE DEVIENT CHAQUE MORCEAU UNE FOIS LA PARENTHÈSE ENLEVÉE : le moins
    // de tête prend l'opposé du groupe de gauche, et l'opérateur se combine
    // avec le signe du groupe de droite. Exactement la règle du barreau 2,
    // appliquée à des groupes déjà calculés.
    const t1 = -g.valeur;
    const c2 = lien === '+' ? d.valeur : -d.valeur;
    const sansParentheses = relatif(t1) + ' ' + (c2 < 0 ? '−' : '+') + ' ' + Math.abs(c2);
    const total = t1 + c2;
    return {
        niveau: 4,
        enonce: '−(' + g.texte + ') ' + lien + ' (' + d.texte + ')',
        lignes: [
            {
                aide: 'Calcule ce qu\'il y a dans CHAQUE parenthèse.',
                morceaux: [
                    txt('= −('), trou([relatif(g.valeur)], 'nombre', relatif(g.valeur)),
                    txt(') ' + lien + ' ('),
                    trou([relatif(d.valeur)], 'nombre', relatif(d.valeur)), txt(')')
                ]
            },
            {
                aide: 'Maintenant enlève les parenthèses. Ne calcule pas encore.',
                morceaux: [txt('= '), trou([sansParentheses], 'expression', sansParentheses)]
            },
            {
                aide: 'Et maintenant le résultat.',
                morceaux: [txt('= '), trou([relatif(total)], 'nombre', relatif(total))]
            }
        ],
        reponse: relatif(total),
        pourquoi: 'À gauche ' + g.texte + ' = ' + relatif(g.valeur) + ', à droite '
            + d.texte + ' = ' + relatif(d.valeur) + '. On enlève les parenthèses : '
            + sansParentheses + '. Et l\'on calcule : ' + relatif(total) + '.'
    };
}

/** Un mélange qui ne dépend que de la graine : deux élèves voient pareil. */
const melanger = (rng, liste) => rng.shuffle(liste);

const BARREAUX = { 1: barreau1, 2: barreau2, 3: barreau3, 4: barreau4 };

/**
 * TIRER UNE QUESTION DE L'ÉCHELLE.
 *
 * Les barreaux 1 à 4 se remplissent ; le barreau 5, celui des priorités, reste
 * la cascade à cliquer — c'est là qu'elle a sa place, et nulle part avant.
 *
 * @param {{rng: function, niveau: number}} opts
 */
export function tirerOppose({ rng, niveau }) {
    const n = Math.max(1, Math.min(4, parseInt(niveau, 10) || 1));
    return BARREAUX[n](rng);
}

/** Combien de lignes à remplir : la feuille imprimée en a besoin. */
export function lignesMax(niveau) {
    const n = Math.max(1, Math.min(4, parseInt(niveau, 10) || 1));
    return n === 1 ? 1 : 2;
}
