// LES PROBABILITÉS — niveau quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Probabilités ». Mesuré avant d'écrire une
// ligne : ZÉRO exercice sur 238. C'est, avec les statistiques, l'un des deux
// chapitres entièrement absents du catalogue, et il les a mis tous les deux en
// tête de sa liste de travail.
//
// ── LA DÉCISION QUI COMMANDE CE FICHIER : AUCUNE FRACTION NE SE SIMPLIFIE ──
//
// La probabilité d'obtenir un nombre pair avec un dé vaut 3/6, et vaut aussi
// 1/2. Les deux écritures sont justes, un professeur accepte les deux — et un
// logiciel doit en choisir UNE. Quel que soit le choix, la moitié des élèves
// qui ont raison seraient comptés faux.
//
// ON NE CHOISIT DONC PAS : on fabrique les situations de telle sorte que la
// fraction soit DÉJÀ irréductible. 3 boules rouges sur 8, c'est 3/8, et il n'y
// a rien à simplifier — la question n'a plus qu'une seule écriture possible.
//
// LE PRIX EST ASSUMÉ, et il faut le dire : l'élève ne rencontre pas ici le
// moment où l'on simplifie une probabilité. Ce moment existe, il appartient au
// chapitre des fractions, et il a ses exercices. Ce qu'on travaille ici est
// autre chose : compter les cas favorables, compter les cas possibles, et ne
// pas les intervertir.
//
// ── ET LE DÉNOMINATEUR NE SE RECOMPTE PAS ──────────────────────────────────
//
// C'est la faute du chapitre : on compte les cas favorables, puis on compte
// les cas possibles EN OUBLIANT ceux qu'on vient de compter. « 3 rouges et 5
// bleues » donne 3/5 au lieu de 3/8. Chaque énoncé dit donc combien il y a de
// boules EN TOUT, et la correction y revient.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import { pgcd } from '../arithmetique.js';
import { enFrancais } from '../statistiques.js';

const S_VOCABULAIRE = 'don.proba.vocabulaire';
const S_CALCULER = 'don.proba.calculer';
const S_CONTRAIRE = 'don.proba.contraire';

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/** Une case à remplir dans l'énoncé — voir `aTrous` dans core/activities/numeric.js. */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

/** La fraction à remplir, numérateur sur dénominateur — jamais à la barre oblique. */
const fractionATrous = () => '<span class="fraction fraction--grande">'
    + `<span class="fraction-num">${trou(0)}</span>`
    + `<span class="fraction-den">${trou(1)}</span></span>`;

// ── LES SITUATIONS ─────────────────────────────────────────────────────────
//
// TROIS FAMILLES, ET ELLES NE SE VALENT PAS. Le sac de boules se compte à la
// main ; la roue se lit sur un dessin qu'on n'a pas, donc son énoncé doit dire
// les secteurs un par un ; le dé a un nombre de faces fixe, ce qui rend le
// dénominateur évident — c'est justement pour cela qu'il ouvre le chapitre.
const SACS = [
    { contenant: 'Un sac', objets: 'boules', un: 'une boule', genre: 'f',
        couleurs: ['rouges', 'bleues', 'vertes', 'jaunes'], singulier: ['rouge', 'bleue', 'verte', 'jaune'] },
    { contenant: 'Une boîte', objets: 'jetons', un: 'un jeton', genre: 'm',
        couleurs: ['noirs', 'blancs', 'gris'], singulier: ['noir', 'blanc', 'gris'] },
    { contenant: 'Une trousse', objets: 'stylos', un: 'un stylo', genre: 'm',
        couleurs: ['bleus', 'verts', 'rouges'], singulier: ['bleu', 'vert', 'rouge'] }
];

const ROUES = [
    { nom: 'Une roue de loterie', secteurs: 'secteurs', un: 'un secteur', genre: 'm',
        couleurs: ['rouges', 'verts', 'bleus'], singulier: ['rouge', 'vert', 'bleu'] },
    { nom: 'Une cible', secteurs: 'zones', un: 'une zone', genre: 'f',
        couleurs: ['noires', 'blanches', 'grises'], singulier: ['noire', 'blanche', 'grise'] }
];

/**
 * DEUX NOMBRES DONT LA FRACTION NE SE SIMPLIFIE PAS.
 *
 * On tire le total, puis un nombre de cas favorables premier avec lui. La
 * boucle est bornée par construction : pour tout total au-dessus de 2 il
 * existe au moins un entier entre 1 et total − 1 qui lui est premier (le 1
 * lui-même), donc elle trouve toujours — et le `garde` ne sert qu'à ne jamais
 * dépendre de cette démonstration pour que le logiciel réponde.
 */
function casIrreductibles(rng, totalMin = 7, totalMax = 12) {
    const total = rng.int(totalMin, totalMax);
    const possibles = [];
    for (let k = 2; k < total - 1; k++) if (pgcd(k, total) === 1) possibles.push(k);
    // On évite 1 et total − 1 quand on peut : « une seule boule rouge » rend la
    // question presque triviale, et son contraire aussi.
    const favorables = possibles.length ? choisir(possibles, rng) : 1;
    return { total, favorables };
}

// ── LES SEPT MARCHES ───────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'certain', temps: 'A', titre: 'Certain, impossible ou possible ?', skill: S_VOCABULAIRE },
    { id: 'echelle', temps: 'A', titre: 'Est-ce une probabilité ?', skill: S_VOCABULAIRE },
    { id: 'sac', temps: 'B', titre: 'Tirer dans un sac', skill: S_CALCULER },
    { id: 'roue', temps: 'B', titre: 'La roue et ses secteurs', skill: S_CALCULER },
    { id: 'pas-cette-couleur', temps: 'B', titre: 'Ne PAS tirer cette couleur', skill: S_CONTRAIRE },
    { id: 'contraire', temps: 'C', titre: 'La probabilité du contraire', skill: S_CONTRAIRE },
    { id: 'comparer', temps: 'C', titre: 'Où a-t-on le plus de chances ?', skill: S_CALCULER }
];

const TEMPS = {
    A: 'A — ce qu\'une probabilité peut valoir',
    B: 'B — compter les cas',
    C: 'C — raisonner'
};

/** Une question d'une marche : l'énoncé, la réponse, la correction. */
export function question(etape, rng) {

    // ── TEMPS A : CE QU'UNE PROBABILITÉ PEUT VALOIR ────────────────────────

    if (etape.id === 'certain') {
        // LES TROIS RÉPONSES REVIENNENT À PARTS ÉGALES. Tirées au hasard dans
        // une liste d'énoncés, elles tombaient six fois « possible » d'affilée
        // — et l'élève répond « possible » sans lire, ce qui est exactement
        // l'inverse de ce que la marche travaille.
        const quoi = choisir(['certain', 'impossible', 'possible'], rng);
        const SITUATIONS = {
            certain: [
                { fait: 'On lance un dé à 6 faces', evt: 'obtenir un nombre inférieur à 7' },
                { fait: 'On tire une boule dans un sac qui ne contient que des boules rouges',
                    evt: 'tirer une boule rouge' },
                { fait: 'On choisit un jour de la semaine au hasard',
                    evt: 'tomber sur un jour dont le nom finit par « i »' }
            ],
            impossible: [
                { fait: 'On lance un dé à 6 faces', evt: 'obtenir 8' },
                { fait: 'On tire une boule dans un sac qui ne contient que des boules rouges',
                    evt: 'tirer une boule verte' },
                { fait: 'On choisit un mois de l\'année au hasard', evt: 'tomber sur un mois de 40 jours' }
            ],
            possible: [
                { fait: 'On lance un dé à 6 faces', evt: 'obtenir un nombre pair' },
                { fait: 'On tire une boule dans un sac de 3 rouges et 5 bleues',
                    evt: 'tirer une boule bleue' },
                { fait: 'On choisit une lettre de l\'alphabet au hasard', evt: 'tomber sur une voyelle' }
            ]
        };
        const c = choisir(SITUATIONS[quoi], rng);
        return {
            enonce: `${c.fait}.`,
            question: `L'événement « ${c.evt} » est…`,
            kind: 'choice', reponse: quoi, choix: ['certain', 'impossible', 'possible'],
            pourquoi: quoi === 'certain'
                ? 'Cet événement arrive à TOUS les coups : sa probabilité vaut 1.'
                : quoi === 'impossible'
                    ? 'Cet événement ne peut JAMAIS arriver : sa probabilité vaut 0.'
                    : 'Cet événement arrive parfois, et parfois non : sa probabilité est '
                        + 'strictement entre 0 et 1.',
            aide: 'Trois questions, dans cet ordre : est-ce que ça arrive à tous les coups '
                + '(certain) ? est-ce que ça ne peut jamais arriver (impossible) ? sinon, '
                + 'c\'est possible.'
        };
    }

    if (etape.id === 'echelle') {
        // UNE PROBABILITÉ VIT ENTRE 0 ET 1, BORNES COMPRISES. La faute qu'on
        // attrape ici n'est pas une faute de vocabulaire : c'est un élève qui a
        // divisé les cas possibles par les cas favorables au lieu du contraire,
        // et qui obtient 8/3. Savoir que le résultat est impossible, c'est
        // savoir qu'on s'est trompé — et c'est la seule vérification qu'il
        // puisse faire seul.
        const faux = choisir(['1,4', '2,5', '1,2', '−0,3', '7'], rng);
        const justes = rng.shuffle(['0', '1', '0,25', '0,5', '0,9', '0,08']).slice(0, 3);
        // LES QUATRE VALEURS SONT DANS L'ÉNONCÉ POUR LE PAPIER.
        //
        // VU SUR LE PDF, et invisible à l'écran : « Laquelle de ces valeurs ne
        // peut PAS être une probabilité ? » — et aucune valeur nulle part. Les
        // quatre propositions sont des BOUTONS, et une feuille imprimée n'a pas
        // de boutons. La question n'était pas difficile, elle était sans
        // réponse possible — et elle tombait trois fois sur la même page.
        //
        // C'est la deuxième fois dans la journée : la marche « lequel de ces
        // nombres divise 24 ? » avait exactement le même défaut. Une garde du
        // catalogue le tient maintenant pour tout le dépôt.
        const quatre = [faux, ...justes]
            .sort((x, y) => Number(x.replace(',', '.').replace('−', '-'))
                - Number(y.replace(',', '.').replace('−', '-')));
        return {
            enonce: '',
            question: 'Laquelle de ces valeurs ne peut PAS être une probabilité ?',
            papier: `Parmi ${quatre.slice(0, 3).join(' ; ')} et ${quatre[3]}, `
                + 'laquelle ne peut PAS être une probabilité ?',
            kind: 'choice', reponse: faux, choix: [faux, ...justes],
            pourquoi: `Une probabilité est toujours comprise entre 0 et 1. ${faux} ne l'est `
                + 'pas : ce n\'est donc pas une probabilité. 0 et 1 en sont, eux — ils disent '
                + '« impossible » et « certain ».',
            aide: 'Une probabilité se place entre 0 et 1, bornes COMPRISES. Si un calcul en '
                + 'donne une plus grande que 1, c\'est le calcul qui est faux — souvent les '
                + 'cas possibles et les cas favorables ont été intervertis.'
        };
    }

    // ── TEMPS B : COMPTER LES CAS ──────────────────────────────────────────

    if (etape.id === 'sac' || etape.id === 'pas-cette-couleur') {
        const h = choisir(SACS, rng);
        const { total, favorables } = casIrreductibles(rng);
        const autres = total - favorables;
        const i = rng.int(0, h.couleurs.length - 2);
        const j = i + 1;
        const pasCelle = etape.id === 'pas-cette-couleur';
        const num = pasCelle ? autres : favorables;
        // LE GENRE EST ÉCRIT, ET IL SERT TROIS FOIS DANS LA MÊME QUESTION.
        // Lu sur la sortie : « On en tire UN au hasard » devant des boules, et
        // « c'est tirer L'BOULE jaune » — une élision fabriquée par un
        // remplacement qui ne pouvait pas marcher. Un énoncé mal accordé fait
        // trébucher la lecture au moment précis où l'on demande de compter
        // avec attention.
        const article = h.genre === 'f' ? 'une' : 'un';
        const objet = h.objets.replace(/s$/, '');
        return {
            enonce: `${h.contenant} contient ${favorables} ${h.objets} ${h.couleurs[i]} et ${
                autres} ${h.objets} ${h.couleurs[j]}, soit ${total} ${h.objets} EN TOUT. `
                + `On en tire ${article} au hasard, sans regarder.`,
            question: pasCelle
                // « NE PAS tirer DE boule verte » : après une négation, l'article
                // indéfini devient « de ». « ne pas tirer une boule verte » se
                // comprend, mais ne se dit pas.
                ? `Quelle est la probabilité de NE PAS tirer de ${objet} ${h.singulier[i]} ?`
                : `Quelle est la probabilité de tirer ${article} ${objet} ${h.singulier[i]} ?`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `${num}|${total}`, cases: 2,
            pourquoi: pasCelle
                ? `Ne pas tirer ${article} ${objet} ${h.singulier[i]}, c'est en tirer ${article} `
                    + `${h.singulier[j]} : ${autres} cas favorables sur ${total} `
                    + `possibles, donc ${autres}/${total}. On aurait aussi pu faire 1 − ${
                        favorables}/${total}.`
                : `${favorables} cas favorables sur ${total} possibles : la probabilité vaut `
                    + `${favorables}/${total}. Le dénominateur est le nombre TOTAL d'objets, `
                    + `pas le nombre d'objets de l'autre couleur.`,
            aide: 'Le numérateur compte les cas FAVORABLES, le dénominateur les cas POSSIBLES '
                + '— c\'est-à-dire TOUT ce qu\'il y a dans le sac, l\'objet cherché compris.'
        };
    }

    if (etape.id === 'roue') {
        const h = choisir(ROUES, rng);
        const { total, favorables } = casIrreductibles(rng, 8, 13);
        const autres = total - favorables;
        const i = rng.int(0, h.couleurs.length - 2);
        const j = i + 1;
        return {
            // « TOUTES DE MÊME TAILLE » DEVANT DES ZONES. Lu sur la sortie :
            // « Une cible est partagée en 10 zones TOUS DE MÊME TAILLE ».
            enonce: `${h.nom} est partagée en ${total} ${h.secteurs} ${
                h.genre === 'f' ? 'TOUTES DE MÊME TAILLE' : 'TOUS DE MÊME TAILLE'} : `
                + `${favorables} sont ${h.couleurs[i]} et ${autres} sont ${h.couleurs[j]}. `
                + 'On la fait tourner.',
            question: `Quelle est la probabilité de s'arrêter sur ${h.genre === 'f' ? 'une' : 'un'} ${
                h.secteurs.replace(/s$/, '')} ${h.singulier[i]} ?`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `${favorables}|${total}`, cases: 2,
            pourquoi: `${favorables} ${h.secteurs} favorables sur ${total} : la probabilité vaut `
                + `${favorables}/${total}.`,
            // LE « TOUS DE MÊME TAILLE » N'EST PAS UNE PRÉCAUTION DE STYLE :
            // sans lui, l'énoncé est faux. La règle « cas favorables sur cas
            // possibles » ne vaut QUE si toutes les issues ont la même chance,
            // et une roue à secteurs inégaux n'est pas dans ce cas.
            aide: 'La règle « cas favorables sur cas possibles » ne vaut que si toutes les '
                + 'issues ont la MÊME chance — ici, parce que les secteurs sont tous de même '
                + 'taille. C\'est pour cela que l\'énoncé le précise.'
        };
    }

    // ── TEMPS C : RAISONNER ────────────────────────────────────────────────

    if (etape.id === 'contraire') {
        const p = rng.int(1, 9) / 10;
        const SUJETS = [
            { quoi: 'qu\'il pleuve demain', contraire: 'qu\'il ne pleuve pas demain' },
            { quoi: 'que le train soit à l\'heure', contraire: 'que le train soit en retard' },
            { quoi: 'de gagner une partie', contraire: 'de ne pas gagner la partie' },
            { quoi: 'que l\'ampoule tombe en panne', contraire: 'que l\'ampoule ne tombe pas en panne' }
        ];
        const c = choisir(SUJETS, rng);
        const reste = Math.round((1 - p) * 10) / 10;
        return {
            enonce: `La probabilité ${c.quoi} est de ${enFrancais(p)}.`,
            question: `Quelle est la probabilité ${c.contraire} ?`,
            kind: 'numeric', reponse: reste, decimal: true,
            pourquoi: `Les deux événements sont contraires : leurs probabilités font 1 à elles `
                + `deux. Donc 1 − ${enFrancais(p)} = ${enFrancais(reste)}.`,
            aide: 'Un événement arrive, ou il n\'arrive pas — il n\'y a pas de troisième '
                + 'possibilité. Les deux probabilités font donc 1 ensemble, et celle du '
                + 'contraire vaut 1 MOINS celle de l\'événement.'
        };
    }

    // 'comparer'
    //
    // DEUX SACS, ET LE PIÈGE EST DE COMPARER LES NUMÉRATEURS. « 4 rouges d'un
    // côté, 3 de l'autre, donc le premier » — faux si le premier sac contient
    // vingt boules et le second cinq. C'est la question qui dit à quoi sert le
    // dénominateur.
    const h = choisir(SACS, rng);
    const a = { favorables: rng.int(3, 5), total: 0 };
    const b = { favorables: rng.int(2, 4), total: 0 };
    a.total = a.favorables + rng.int(4, 9);
    b.total = b.favorables + rng.int(1, 3);
    // ON ÉCARTE L'ÉGALITÉ : « les deux pareil » n'est pas proposé, donc elle
    // rendrait la question sans bonne réponse.
    if (a.favorables * b.total === b.favorables * a.total) b.total += 1;
    const gagnant = a.favorables * b.total > b.favorables * a.total ? 'A' : 'B';
    // ET LE PIÈGE EST VRAIMENT TENDU : le sac qui a LE PLUS d'objets de la
    // couleur cherchée n'est pas celui qui donne le plus de chances.
    return {
        enonce: `Sac A : ${a.favorables} ${h.objets} ${h.couleurs[0]} sur ${a.total} ${h.objets}.\n`
            + `Sac B : ${b.favorables} ${h.objets} ${h.couleurs[0]} sur ${b.total} ${h.objets}.`,
        question: `Dans quel sac a-t-on le plus de chances de tirer ${
            h.genre === 'f' ? 'une' : 'un'} ${h.objets.replace(/s$/, '')} ${h.singulier[0]} ?`,
        kind: 'choice', reponse: gagnant, choix: ['A', 'B'],
        pourquoi: `Sac A : ${a.favorables}/${a.total} = ${enFrancais(a.favorables / a.total)}. `
            + `Sac B : ${b.favorables}/${b.total} = ${enFrancais(b.favorables / b.total)}. `
            + `C'est donc le sac ${gagnant}. Le nombre d'${h.objets} de la couleur cherchée ne `
            + 'suffit pas à décider : il faut le rapporter au total.',
        aide: 'ON NE COMPARE PAS LES NUMÉRATEURS. Quatre boules rouges sur vingt, c\'est moins '
            + 'que trois sur cinq. Il faut calculer les deux probabilités, puis les comparer.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 1, B: 2, C: 3 };

export const probabilitesGenerator = {
    id: 'don.probabilites',
    label: 'Les Probabilités',
    skills: [S_VOCABULAIRE, S_CALCULER, S_CONTRAIRE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    // DES FRACTIONS SUR LE PAPIER : le rendu les empile, numérateur sur
    // dénominateur. Sans ce drapeau, la feuille écrirait « 3/8 » à la barre
    // oblique, ce qui est l'écriture d'écran et non celle du cahier.
    fractions: true,
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
                value: c,
                // LE LIBELLÉ PORTE LA VALEUR, avec sa capitale pour les mots.
                label: /^[A-B]$/.test(c) ? `Sac ${c}` : c.charAt(0).toUpperCase() + c.slice(1),
                correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        const lignes = q.enonce.split('\n');
        // CHAQUE LIGNE FINIT PAR UN POINT — voir le même commentaire dans
        // `generators/statistiques.js` : sur la feuille, les lignes sont collées
        // bout à bout, et sans point final la dernière se lit comme le début de
        // la question.
        const aPlat = lignes.filter(Boolean)
            .map(l => (/[.!?:]$/.test(l) ? l : `${l}.`)).join(' ');
        return makeItem({
            seed: rng.seed,
            generatorId: 'don.probabilites',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                text: `${aPlat} ${q.question}`.trim(),
                papier: `${aPlat} ${q.papier || q.question}`.trim(),
                html: '<div class="game-question ap-probleme">'
                    + lignes.filter(Boolean).map(l => `<span class="ap-situation">${l}</span>`).join('')
                    + `<span class="ap-question">${q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                q.aide,
                'Compte les cas possibles EN ENTIER : c\'est tout ce qui peut sortir, et pas '
                    + 'seulement ce qui n\'est pas la couleur cherchée.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                decimal: !!q.decimal,
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default probabilitesGenerator;
