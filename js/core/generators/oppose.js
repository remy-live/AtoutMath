// LE MOINS DEVANT LA PARENTHÈSE — deux générateurs, deux activités qui
// existaient déjà.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, DEVANT LA PREMIÈRE VERSION : « pourquoi n'utilises tu pas le système de
// QCM, pourquoi as tu tout refait », puis « ce n'est pas trop joli non plus ».
//
// IL A RAISON SUR LES DEUX POINTS, ET LA CAUSE EST LA MÊME. J'avais écrit un
// QCM à la main dans `js/games/priorites.js` — des boutons, une correction, un
// compte —, et un remplissage de lignes à la main juste à côté. Les deux
// existaient depuis longtemps :
//
//   · `js/core/activities/choice.js` — « une seule implémentation pour tous
//     les jeux à propositions cliquables », dit son en-tête. Elle apporte les
//     essais, l'échelle d'aide, la réduction des propositions après une
//     erreur, la barre d'outils, le robot de la démonstration et la
//     traçabilité au bilan. Mon QCM n'avait rien de tout cela, et il ne
//     ressemblait à aucun autre écran du logiciel.
//
//   · `js/core/activities/litteralSaisie.js` avec `meta.etapes` — « un item
//     peut apporter `meta.etapes` : la question s'écrit alors ligne à ligne,
//     chacune validée sur place. SEULE LA DERNIÈRE COMPTE POUR LA SÉANCE ».
//     C'est mot pour mot ce que demande l'échelle de Rémy.
//
// POURQUOI JE SUIS PASSÉ À CÔTÉ : je suis parti du JEU où l'exercice vivait
// déjà, et je l'ai étendu. Il fallait partir de l'INTERACTION — « c'est un
// QCM », « c'est une saisie ligne à ligne » — et chercher qui la sait déjà
// faire. On raisonne depuis le geste de l'élève, pas depuis l'endroit où le
// code se trouve.
//
// ── LES MATHÉMATIQUES N'ONT PAS BOUGÉ ───────────────────────────────────────
//
// Les tirages restent dans `js/core/opposeParentheses.js`, éprouvés seuls et
// sans navigateur : c'est la partie qui était juste. Seul l'affichage change de
// main — et il change de main pour passer dans des mains qui savent.

import { makeItem, finalizeChoices } from '../items.js';
import { tirerOppose, reponseJuste, normaliserEcriture } from '../opposeParentheses.js';
// LES MARCHES À COCHER — la convention de la maison, et non un menu de plus.
//
// RÉMY : « tu ne fais pas les étapes à cocher, on avait convenu de cela de
// manière globale ». Trente-huit générateurs passent par `paramMarches` ;
// j'avais écrit un menu « Difficulté 1 · 2 · 3 » à la place. Le module dit
// lui-même pourquoi les cases valent mieux : « QUELLES marches on travaille
// aujourd'hui, c'est un choix multiple par nature — les quatre premières, A et
// C, la 7 toute seule. Un menu à choix unique n'en exprime aucun. »
//
// Et l'on n'y gagne pas qu'une case : la longueur de l'exercice suit le nombre
// de marches cochées, le partage des questions se règle sur une barre, et le
// réglage est RÉSERVÉ AU PROFESSEUR — « comment répartir 32 questions sur 6
// marches » est une question de préparation, un élève ne se la pose jamais.
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'num.prio.relatifs';

/**
 * LES TROIS MARCHES, DANS L'ORDRE QUE RÉMY A ÉCRIT.
 *
 * L'identifiant dit ce qu'on fait, pas le rang : renuméroter une échelle ne
 * doit pas périmer les parcours enregistrés.
 */
const LISTE_MARCHES = [
    { id: 'deuxNombres', nom: '1. Deux nombres : −(−4) + (−5)' },
    { id: 'dedansDabord', nom: '2. Calculer dedans d\'abord : −(−3 + 5)' },
    { id: 'deuxParentheses', nom: '3. Deux parenthèses : −(−3 + 5) − (−9 − 5)' }
];
const NIVEAU_DE = { deuxNombres: 2, dedansDabord: 3, deuxParentheses: 4 };
const MOT = 'barreau';
/**
 * LE RÉGLAGE D'AVANT LES CASES.
 *
 * Cet exercice est né avec un menu « niveau : 2 · 3 · 4 », et des parcours ont
 * pu être enregistrés dessus dans la journée. `jusqua` dit que la valeur nomme
 * le HAUT de l'échelle : « niveau 3 » voulait dire « jusqu'au 3 », et le relire
 * comme UNE marche donnerait au professeur le contraire de ce qu'il avait réglé.
 */
const ANCIEN = { cle: 'niveau', jusqua: true, valeurs: LISTE_MARCHES.map(m => NIVEAU_DE[m.id]) };

/**
 * BARREAU 1 — LA RÈGLE DU SIGNE, EN QCM, PAR LE SYSTÈME DE QCM.
 *
 * « −(−4) = ? ». Rémy : « Au départ, je préfèrerais juste remplacer (avec QCM
 * éventuellement) ».
 *
 * LES PIÈGES DISENT CHACUN UNE ERREUR RÉELLE, et c'est à cela qu'ils servent :
 * celui qui clique « −4 » a recopié au lieu de changer le signe ; celui qui
 * clique « 0 » a cru que les deux moins s'annulaient en disparaissant. Le `why`
 * de chacun arrive à l'élève par l'activité, sans qu'on ait à l'afficher.
 */
export const opposeRegleGenerator = {
    id: 'num.oppose.regle',
    skills: [COMPETENCE],
    // RÉMY, dans sa revue : « Tu peux faire une version imprimé ». Il n'y avait
    // rien à écrire pour cela — les questions sont déjà du texte propre,
    // « −(+2) = ? » pour « −2 » —, il manquait seulement de le DIRE. Sans ce
    // drapeau, `aUneFichePapier` répond non et la fiche n'est même pas offerte.
    ecrit: true,
    // UN RÉGLAGE QUI CHANGE VRAIMENT LA FEUILLE.
    //
    // `ficheReglages.test.mjs` refuse une fiche écrite sans réglage — « on ne
    // pouvait demander ni la table de 7, ni un niveau, ni une difficulté une
    // fois la feuille ouverte » —, et il est tombé sur celle-ci dès qu'elle est
    // devenue imprimable. Il a raison : une fiche qu'on ne peut pas doser ne
    // sert qu'une fois.
    //
    // LE RÉGLAGE N'EST PAS UN NIVEAU : cet exercice EST le barreau 1, et offrir
    // d'en changer reviendrait à offrir de changer d'exercice. Ce qui se dose
    // ici, c'est le PIÈGE — « −(−3) », le double moins, est la seule des deux
    // formes qui se rate. Un professeur qui vient de l'introduire veut une
    // feuille qui n'en contient QUE ça ; une semaine plus tard, il veut le
    // mélange, où il faut lire avant d'écrire.
    params: [
        {
            id: 'sorte', type: 'select', label: 'Quelles écritures', default: 'tous',
            aide: 'Le double moins — «\u00a0−(−3)\u00a0» — est la seule des deux formes '
                + 'qui se rate. Mélangées, il faut lire avant d\'écrire.',
            options: [
                { value: 'tous', label: 'Les deux mélangées' },
                { value: 'moins-moins', label: 'Seulement −(−a), le double moins' },
                { value: 'moins-plus', label: 'Seulement −(+a)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        // ON RETIRE JUSQU'À TOMBER SUR LA FORME DEMANDÉE, et l'on finit par
        // accepter : le tirage est équilibré, trente essais suffisent très
        // largement, et une question rendue vaut mieux qu'un trou dans la
        // feuille si jamais le hasard s'acharnait.
        const sorte = String((params && params.sorte) || 'tous');
        const voulue = (e) => sorte === 'tous'
            || (sorte === 'moins-moins' ? /\(\u2212/.test(e) : /\(\+/.test(e));
        let q = tirerOppose({ rng, niveau: 1 });
        for (let i = 0; i < 30 && !voulue(q.enonce); i++) q = tirerOppose({ rng, niveau: 1 });
        const val = Number(normaliserEcriture(q.reponse));
        const recopie = -val;

        const choices = finalizeChoices(rng, [
            { value: q.reponse, correct: true },
            { value: ecrireRelatif(recopie),
                why: 'C\'est le nombre recopié tel quel. Le moins devant la '
                    + 'parenthèse en prend l\'OPPOSÉ.' },
            { value: '0',
                why: 'Les deux signes ne s\'effacent pas : ils se combinent. '
                    + 'L\'opposé de ' + ecrireRelatif(recopie) + ', c\'est ' + q.reponse + '.' },
            { value: ecrireRelatif(val < 0 ? val - 1 : val + 1),
                why: 'Le nombre ne change pas, seul son signe change.' }
        ], {
            count: 4,
            // LE BOUCHE-TROU RESTE DANS LE MÊME MONDE : des relatifs voisins,
            // pas un nombre pris au hasard qui se repère d'un coup d'œil.
            filler: (r) => ecrireRelatif(val + r.int(2, 6) * (r.bool() ? -1 : 1))
        });

        return makeItem({
            seed: rng.seed, generatorId: 'num.oppose.regle', skillId: COMPETENCE,
            answerKind: 'choice',
            prompt: { text: `${q.enonce} = ?`,
                html: `<div class="game-question">${q.enonce} = ?</div>` },
            answer: q.reponse,
            choices,
            hints: [
                'Un moins qui n\'a rien à sa gauche n\'est pas une soustraction : '
                    + 'il prend l\'OPPOSÉ de ce qui le suit.',
                `L'opposé de ${ecrireRelatif(recopie)}, c'est ${q.reponse}.`
            ],
            explanation: q.pourquoi,
            difficulty: 1,
            meta: { barreau: 1, marche: '1' }
        });
    }
};

/**
 * BARREAUX 2 À 4 — ON ENLÈVE LES PARENTHÈSES, LIGNE À LIGNE.
 *
 * Rémy : « puis −(−4) + (−5) = .......... = ; l'élève écrit +4 − 5 et donne le
 * résultat. Puis −(−3+5) = −(....) […] Puis −(−3+5) − (−9−5) = −(....) − (....)
 * = .................... ».
 *
 * C'EST EXACTEMENT `meta.etapes` : « la question s'écrit ligne à ligne, chacune
 * validée sur place ». Et la règle que cette activité porte déjà — seule la
 * dernière ligne compte pour la séance — est la bonne ici aussi : les
 * précédentes sont l'ÉCRITURE du raisonnement, pas trois questions déguisées.
 */
export const opposeEnleverGenerator = {
    id: 'num.oppose.enlever',
    label: 'Enlever les parenthèses, pas à pas',
    skills: [COMPETENCE],
    answerKinds: ['text'],
    // Même chose que pour la règle du signe, et pour la même remarque de Rémy :
    // « −(+3) − (−5) = ? » pour « 2 » s'imprime sans qu'on ait rien à dessiner.
    ecrit: true,
    // LA LONGUEUR SUIT LE NOMBRE DE MARCHES COCHÉES — voir core/duree.js. Dix
    // questions sur trois marches n'en montrent que trois par marche ; le
    // conseil le dit au professeur au lieu de le lui laisser découvrir.
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        paramMarches({ marches: LISTE_MARCHES, mot: MOT, ancien: ANCIEN })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        // LA MARCHE VIENT DU RANG DE LA QUESTION, pas d'un réglage figé : c'est
        // ce qui fait monter l'élève au fil de la série, dans les marches que
        // le professeur a cochées et selon le partage qu'il a tiré sur la barre.
        const id = marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN), totalDe(ctx, params), params);
        const niveau = NIVEAU_DE[id] || 2;
        const q = tirerOppose({ rng, niveau });

        // LES LIGNES DU TIRAGE DEVIENNENT LES ÉTAPES DE LA SAISIE. Le tirage
        // décrit une ligne par ses MORCEAUX — du texte et des trous ; ici on
        // n'en garde que ce qu'il faut écrire, puisque l'activité pose le
        // squelette elle-même. La dernière ligne est la réponse finale.
        const lignes = q.lignes.map((l) => ({
            aide: l.aide || '',
            attendu: l.morceaux.filter((m) => m.t === 'trou').map((m) => m.montre),
            // Ce qu'on écrit en entier sur la ligne, trous compris : c'est ce
            // que l'élève tape, et ce qu'on lui montre s'il sèche.
            montrer: l.morceaux.map((m) => (m.t === 'texte' ? m.v : m.montre))
                .join('').replace(/^=\s*/, '').trim()
        }));
        const finale = lignes[lignes.length - 1];
        const intermediaires = lignes.slice(0, -1);

        return makeItem({
            seed: rng.seed, generatorId: 'num.oppose.enlever', skillId: COMPETENCE,
            answerKind: 'text',
            prompt: { text: `${q.enonce} = ?`,
                html: `<div class="game-question">${q.enonce}</div>` },
            answer: q.reponse,
            /**
             * RÉPONDRE LE RÉSULTAT À LA LIGNE DE RÉÉCRITURE N'EST PAS UNE
             * ERREUR, C'EST UN SAUT.
             *
             * Au barreau 2, la première ligne demande « 4 − 5 » et l'élève écrit
             * « −1 » : il a tout fait juste, et d'un coup — or c'est en faisant
             * les deux d'un coup qu'on se trompe, et c'est précisément ce que ce
             * barreau existe pour séparer. `inacheve` le dit sans compter une
             * faute : la règle que `fractionsPose` a posée pour le calcul posé,
             * et que `litteralSaisie` applique déjà.
             */
            verifieTexte: (saisie) => {
                if (reponseJuste(saisie, [finale.montrer])) return { juste: true };
                // ON RECONNAÎT LE SAUT AVEC LE MÊME JUGE QUE LA RÉPONSE JUSTE,
                // et non avec une comparaison écrite ici : un juge de rechange
                // posé à côté du vrai finit toujours par être plus sévère que
                // lui — c'est exactement ce qui vient de coûter une bonne réponse
                // à une élève de Rémy, un juge sur deux ayant sa copie de la
                // règle du « + » facultatif.
                //
                // MESURÉ, ET IL FAUT LE DIRE : aujourd'hui cette branche ne se
                // TRAVERSE JAMAIS, parce que la dernière ligne de chaque barreau
                // EST le résultat — `finale.montrer` vaut donc toujours
                // `q.reponse`, et le `return` du dessus a déjà répondu. Elle
                // attend un barreau dont la dernière ligne ne serait pas le
                // résultat, et elle restera juste ce jour-là. On ne la supprime
                // pas, mais on n'écrit pas non plus qu'elle protège l'élève
                // d'aujourd'hui : ce serait se raconter une histoire.
                if (reponseJuste(saisie, [q.reponse])) {
                    return { juste: false, inacheve: true,
                        pourquoi: 'C\'est bien la bonne valeur — mais on demande '
                            + 'd\'abord la ligne SANS parenthèses, avant de la calculer.' };
                }
                return { juste: false };
            },
            hints: [
                'Le moins devant une parenthèse change le signe de ce qu\'il y a dedans.',
                q.pourquoi
            ],
            explanation: `${q.enonce} = ${q.reponse}. ${q.pourquoi}`,
            difficulty: niveau - 1,
            meta: {
                barreau: niveau, marche: id, nomDuBarreau: (LISTE_MARCHES
                    .find(m => m.id === id) || {}).nom || '',
                // LE CLAVIER DE CE CHAPITRE : des nombres, des signes, des
                // parenthèses — jamais de lettre ni de puissance.
                //
                // VU À L'ÉCRAN : le pavé offrait « x » et « ² » sur un exercice
                // de nombres relatifs. Offrir une touche dont on sait qu'elle
                // donnera une réponse fausse, c'est tendre un piège avec
                // l'outil qu'on prête — l'activité le dit elle-même à propos du
                // cube. Les deux drapeaux qui les retirent sont `lettre: null`
                // et `carre: false` ; j'avais écrit un `composable` qui
                // n'existe pas, et qui ne retirait donc rien.
                lettre: null, carre: false, parentheses: true, relatifs: true,
                saisieSeule: true,
                titreFinal: 'Et le résultat',
                etapes: intermediaires.map((l) => ({
                    titre: l.aide,
                    montrer: l.montrer,
                    parentheses: true,
                    aide: l.aide
                }))
            }
        });
    }
};

/** « −4 », « 4 » — l'écriture d'un relatif isolé, comme dans le tirage. */
function ecrireRelatif(n) {
    return (n < 0 ? '−' : '') + Math.abs(n);
}
