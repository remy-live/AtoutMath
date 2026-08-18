// LE THÉORÈME DE PYTHAGORE — très progressivement.
//
// Pythagore est le premier théorème que l'élève doit APPLIQUER en rédigeant,
// et tout y est nouveau à la fois : un vocabulaire (l'hypoténuse), une phrase
// de cours, une égalité à écrire pour SON triangle, un calcul en trois lignes,
// et une racine carrée. L'erreur classique de l'enseignement est de demander
// tout cela d'un coup. Ici, CHAQUE MARCHE EST UN NIVEAU :
//
//   1. L'HYPOTÉNUSE      la montrer du doigt : le côté en face de l'angle droit.
//   2. LA PHRASE         remettre le théorème dans l'ordre.
//   3. L'ÉGALITÉ         l'écrire pour CE triangle : BC² = AB² + AC².
//   4. L'HYPOTÉNUSE, EN NOMBRE   BC² = 36 + 64 = 100, donc BC = 10.
//   5. UN CÔTÉ DE L'ANGLE DROIT  c'est l'égalité qu'on retourne : AB² = BC² − AC².
//   6. LA RÉDACTION      Je sais que / Or / Donc, avec le calcul dedans.
//
// Les longueurs viennent de TRIPLETS PYTHAGORICIENS : la racine tombe toujours
// juste. La racine « moche » (√52 ≈ 7,2) est un obstacle réel mais c'est un
// AUTRE obstacle — il viendra quand la mécanique sera là.
//
// Ce module ne connaît ni le DOM ni le SVG : la phrase, les triangles, les
// égalités, les étapes de calcul, les vérifications.

export const THEOREME = {
    id: 'pythagore',
    titre: 'Le théorème de Pythagore',
    enonce: 'Si un triangle est rectangle, alors le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés.',
    // Les groupes de mots, dans l'ordre — une IDÉE par étiquette.
    groupes: [
        'Si un triangle',
        'est rectangle,',
        'alors le carré',
        'de l\'hypoténuse',
        'est égal à la somme',
        'des carrés des deux autres côtés.'
    ],
    lecon: 'L\'HYPOTÉNUSE est le côté en face de l\'angle droit — c\'est toujours le plus long. '
        + 'Le théorème dit UNE chose : son carré vaut la somme des carrés des deux autres côtés. '
        + 'Pour l\'hypoténuse on ADDITIONNE les deux carrés ; pour un côté de l\'angle droit on '
        + 'SOUSTRAIT du carré de l\'hypoténuse. Et on n\'oublie jamais la dernière ligne : '
        + 'revenir du carré à la longueur, avec la racine carrée.'
};

// Les triplets : (a, b, c) avec a² + b² = c². Les multiples élargissent le
// choix sans casser la promesse de la racine exacte.
export const TRIPLETS = [
    [3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17],
    [12, 16, 20], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37]
];

const LETTRES = ['ABC', 'DEF', 'MNP', 'RST', 'IJK', 'EFG', 'KLM', 'PQR'];

export const NIVEAUX = [
    { id: 1, cle: 'hypotenuse', label: 'Montrer l\'hypoténuse', consigne: 'Clique le côté qui est l\'hypoténuse.' },
    { id: 2, cle: 'phrase', label: 'La phrase du théorème', consigne: 'Remets le théorème dans l\'ordre.' },
    { id: 3, cle: 'egalite', label: 'Écrire l\'égalité', consigne: 'Écris l\'égalité de Pythagore pour ce triangle.' },
    { id: 4, cle: 'hypo-calcul', label: 'Calculer l\'hypoténuse', consigne: 'Calcule la longueur de l\'hypoténuse, étape par étape.' },
    { id: 5, cle: 'cote-calcul', label: 'Calculer un côté', consigne: 'Calcule le côté demandé : cette fois, on soustrait.' },
    { id: 6, cle: 'redaction', label: 'Rédiger en entier', consigne: 'Rédige : Je sais que, Or, Donc — avec le calcul.' }
];

export const niveauDe = (n) => NIVEAUX.find(x => x.id === Number(n)) || NIVEAUX[0];

/**
 * LES SIX MARCHES À LA SUITE.
 *
 * Les six niveaux existaient, mais seulement à choisir un par un : on montrait
 * l'hypoténuse pendant dix questions, ou l'on rédigeait pendant dix questions.
 * Or c'est l'ESCALIER qui enseigne — on ne demande jamais deux choses nouvelles
 * à la fois, et chaque marche s'appuie sur celle d'en dessous.
 *
 * Les marches se partagent l'exercice à parts égales, et la dernière ramasse
 * le reste : sur dix questions, ce sont deux marches de deux questions puis
 * quatre de une, et non cinq marches suivies d'un saut. Les premières sont
 * courtes à dessein — montrer l'hypoténuse du doigt s'acquiert vite, rédiger
 * en entier demande d'y revenir.
 *
 * @param {number} rang   1 pour la première question
 * @param {number} total  nombre de questions de l'exercice
 */
export function niveauProgressif(rang, total) {
    const n = Math.max(1, Number(total) || 10);
    const r = Math.max(1, Math.min(n, Number(rang) || 1));
    const parMarche = Math.max(1, Math.floor(n / NIVEAUX.length));
    const i = Math.min(NIVEAUX.length - 1, Math.floor((r - 1) / parMarche));
    return NIVEAUX[i];
}

/** Le niveau à poser : une marche fixe, ou celle où l'escalier est arrivé. */
export function niveauPour(params, rang, total) {
    return (params && params.niveau === 'progressif')
        ? niveauProgressif(rang, total)
        : niveauDe(params && params.niveau);
}

/**
 * Un triangle rectangle : trois sommets, l'angle droit sur l'un d'eux, et un
 * triplet pour les longueurs. `angleDroit` est l'INDICE du sommet (0, 1 ou 2)
 * — jamais toujours le premier, sinon l'élève apprend une place au lieu d'une
 * définition.
 */
export function tirerTriangle(rng, options = {}) {
    const nom = rng.pick(LETTRES);
    const triplet = options.triplet || rng.pick(TRIPLETS);
    const angleDroit = rng.int(0, 2);
    const orientation = rng.int(0, 359);
    return { nom, sommets: nom.split(''), triplet, angleDroit, orientation };
}

/** Le nom d'un côté : les deux sommets, dans l'ordre du nom du triangle. */
const cote = (t, i, j) => t.sommets[Math.min(i, j)] + t.sommets[Math.max(i, j)];

/**
 * Les trois côtés et leurs longueurs. L'hypoténuse relie les deux sommets qui
 * ne portent PAS l'angle droit ; les cathètes partent de l'angle droit.
 */
export function cotesDe(t) {
    const [a, b, c] = t.triplet;                 // a² + b² = c²
    const droit = t.angleDroit;
    const autres = [0, 1, 2].filter(i => i !== droit);
    return {
        hypo: { nom: cote(t, autres[0], autres[1]), longueur: c },
        cathetes: [
            { nom: cote(t, droit, autres[0]), longueur: a },
            { nom: cote(t, droit, autres[1]), longueur: b }
        ],
        sommetDroit: t.sommets[droit]
    };
}

/** « Le triangle ABC est rectangle en A » — la phrase qui pose les données. */
export function direTriangle(t) {
    return `Le triangle ${t.nom} est rectangle en ${t.sommets[t.angleDroit]}`;
}

/** L'égalité de Pythagore de ce triangle, prête à afficher ou à vérifier. */
export function egaliteDe(t) {
    const { hypo, cathetes } = cotesDe(t);
    return {
        gauche: hypo.nom,
        droits: [cathetes[0].nom, cathetes[1].nom],
        texte: `${hypo.nom}² = ${cathetes[0].nom}² + ${cathetes[1].nom}²`
    };
}

/**
 * L'égalité proposée par l'élève est-elle la bonne ?
 * Les deux carrés de droite s'échangent librement — l'addition est commutative
 * et refuser AB² + AC² au profit d'AC² + AB² n'apprendrait qu'un ordre.
 */
export function verifierEgalite(t, gauche, d1, d2) {
    const e = egaliteDe(t);
    const juste = gauche === e.gauche
        && ((d1 === e.droits[0] && d2 === e.droits[1]) || (d1 === e.droits[1] && d2 === e.droits[0]));
    if (juste) return { juste: true, message: e.texte };
    if (gauche !== e.gauche) {
        return {
            juste: false,
            message: `Le carré tout seul, à gauche, est celui de l'HYPOTÉNUSE — le côté en face de `
                + `l'angle droit ${cotesDe(t).sommetDroit} : c'est [${e.gauche}].`
        };
    }
    return { juste: false, message: `À droite, ce sont les DEUX côtés de l'angle droit : [${e.droits[0]}] et [${e.droits[1]}].` };
}

/**
 * LE CALCUL, LIGNE À LIGNE — celles qu'on écrit au cahier.
 *
 * Rémy, capture à l'appui : « tu donnes la réponse sous la racine carrée », et
 * « j'aimerais que l'élève remplace les longueurs en lettres par les mesures et
 * calcule le carré de chaque longueur ».
 *
 * Les deux remarques n'en font qu'une. On sautait de l'égalité littérale au
 * résultat en une seule saisie — « FG² = 8² + 15² = ▭ » — et la ligne d'après,
 * déjà écrite en dessous, affichait « FG = √289 » : la réponse à la question
 * du dessus était donnée deux centimètres plus bas. L'élève n'avait plus qu'à
 * la recopier.
 *
 * La descente se fait donc marche par marche, et chaque marche ne s'ouvre
 * qu'une fois la précédente juste :
 *
 *     FG² = EF² + EG²          (l'égalité, donnée : elle vient du niveau 3)
 *     FG² = ▭² + ▭²            on REMPLACE les lettres par les mesures
 *     FG² = ▭ + ▭              on calcule le carré de CHAQUE longueur
 *     FG² = ▭                  on additionne
 *     FG  = √289 = ▭ cm        on revient du carré à la longueur
 *
 * Le radicande, lui, n'apparaît qu'une fois trouvé : c'est la réponse de la
 * ligne du dessus, pas un cadeau.
 *
 * Chaque ligne est une suite de MORCEAUX — du texte, ou un champ à remplir :
 *   { texte }              un bout de rédaction
 *   { champ, aide }        une case, sa valeur attendue et ce qu'on dit si elle
 *                          est ratée
 *   { racine }             le radicande, sous le trait, révélé quand il est su
 */
export function etapesCalcul(t, chercher) {
    const { hypo, cathetes } = cotesDe(t);
    const [c1, c2] = cathetes;
    const T = (texte) => ({ texte });
    const C = (champ, aide) => ({ champ, aide });

    if (!chercher || chercher === hypo.nom) {
        const carre = c1.longueur ** 2 + c2.longueur ** 2;
        return {
            cherche: hypo.nom, resultat: hypo.longueur, carre,
            egalite: `${hypo.nom}² = ${c1.nom}² + ${c2.nom}²`,
            lignes: [
                { morceaux: [T(`${hypo.nom}² = ${c1.nom}² + ${c2.nom}²`)] },
                { morceaux: [
                    T(`${hypo.nom}² = `),
                    C(c1.longueur, `${c1.nom} mesure ${c1.longueur} cm : c'est cette mesure qui remplace les lettres.`),
                    T('² + '),
                    C(c2.longueur, `${c2.nom} mesure ${c2.longueur} cm.`),
                    T('²')
                ] },
                { morceaux: [
                    T(`${hypo.nom}² = `),
                    C(c1.longueur ** 2, `${c1.longueur}² c'est ${c1.longueur} × ${c1.longueur}, pas ${c1.longueur} × 2.`),
                    T(' + '),
                    C(c2.longueur ** 2, `${c2.longueur}² c'est ${c2.longueur} × ${c2.longueur}.`)
                ] },
                { morceaux: [
                    T(`${hypo.nom}² = `),
                    C(carre, `${c1.longueur ** 2} + ${c2.longueur ** 2}, c'est la somme des deux carrés.`)
                ] },
                { morceaux: [
                    T(`${hypo.nom} = `), { racine: carre }, T(' = '),
                    C(hypo.longueur, `Cherche le nombre qui, multiplié par lui-même, donne ${carre}.`),
                    T(' cm')
                ] }
            ]
        };
    }
    const garde = cathetes.find(x => x.nom !== chercher);
    const perdu = cathetes.find(x => x.nom === chercher);
    const carre = hypo.longueur ** 2 - garde.longueur ** 2;
    return {
        cherche: perdu.nom, resultat: perdu.longueur, carre,
        egalite: `${hypo.nom}² = ${perdu.nom}² + ${garde.nom}²`,
        lignes: [
            { morceaux: [T(`${hypo.nom}² = ${perdu.nom}² + ${garde.nom}²`)] },
            // On RETOURNE l'égalité avant de chiffrer : c'est l'étape qu'on
            // saute, et c'est celle où l'on additionne au lieu de soustraire.
            { morceaux: [T(`${perdu.nom}² = ${hypo.nom}² − ${garde.nom}²`)] },
            { morceaux: [
                T(`${perdu.nom}² = `),
                C(hypo.longueur, `${hypo.nom} est l'hypoténuse : elle mesure ${hypo.longueur} cm.`),
                T('² − '),
                C(garde.longueur, `${garde.nom} mesure ${garde.longueur} cm.`),
                T('²')
            ] },
            { morceaux: [
                T(`${perdu.nom}² = `),
                C(hypo.longueur ** 2, `${hypo.longueur}² c'est ${hypo.longueur} × ${hypo.longueur}.`),
                T(' − '),
                C(garde.longueur ** 2, `${garde.longueur}² c'est ${garde.longueur} × ${garde.longueur}.`)
            ] },
            { morceaux: [
                T(`${perdu.nom}² = `),
                C(carre, `${hypo.longueur ** 2} − ${garde.longueur ** 2} : ici on SOUSTRAIT, le côté cherché est plus court que l'hypoténuse.`)
            ] },
            { morceaux: [
                T(`${perdu.nom} = `), { racine: carre }, T(' = '),
                C(perdu.longueur, `Cherche le nombre qui, multiplié par lui-même, donne ${carre}.`),
                T(' cm')
            ] }
        ]
    };
}

/** Les groupes de la phrase, mélangés — jamais dans l'ordre par accident. */
export function groupesMelanges(rng) {
    const bon = THEOREME.groupes;
    for (let essai = 0; essai < 20; essai++) {
        const m = rng.shuffle(bon);
        if (m.some((g, i) => g !== bon[i])) return m;
    }
    return [...bon].reverse();
}

/** La phrase proposée est-elle la bonne — et sinon, où est la première faute ? */
export function verifierPhrase(proposition) {
    const bon = THEOREME.groupes;
    const premierFaux = bon.findIndex((g, i) => proposition[i] !== g);
    return {
        juste: premierFaux === -1 && proposition.length === bon.length,
        premierFaux: premierFaux === -1 ? null : premierFaux
    };
}

/**
 * LA RÉDACTION EST TOUJOURS LA MÊME. Rémy : « la rédaction doit être toujours
 * la même : Je sais que : ABC est un triangle rectangle en A / Or : D'après le
 * théorème de Pythagore ». Trois amorces, dans cet ordre, à l'écran comme sur
 * la feuille de correction — c'est le squelette qu'on veut voir revenir chez
 * l'élève, et il ne l'apprendra pas s'il change de forme d'un exercice à
 * l'autre.
 */
export const AMORCES = { sais: 'Je sais que :', or: 'Or :', donc: 'Donc :' };

/** Les données de l'énoncé : les deux longueurs connues. */
export function donneesDe(t, chercher) {
    const { hypo, cathetes } = cotesDe(t);
    const connus = chercher && chercher !== hypo.nom
        ? [hypo, cathetes.find(x => x.nom !== chercher)]
        : cathetes;
    return connus.map(c => `${c.nom} = ${c.longueur} cm`).join(' et ');
}

/** « EFG est un triangle rectangle en E, avec EF = 8 cm et EG = 15 cm. » */
export function ceQueJeSais(t, chercher) {
    return `${t.nom} est un triangle rectangle en ${t.sommets[t.angleDroit]}, `
        + `avec ${donneesDe(t, chercher)}.`;
}

/** Le texte d'une ligne de calcul, champs remplis — pour la correction. */
export function ligneEnTexte(ligne) {
    return ligne.morceaux.map(m => {
        if (m.texte !== undefined) return m.texte;
        if (m.racine !== undefined) return `√${m.racine}`;
        return String(m.champ);
    }).join('');
}

/**
 * La rédaction complète, celle du cahier. C'est aussi la correction imprimée :
 * la feuille de solutions la pose telle quelle.
 */
export function redactionComplete(t, chercher) {
    const calc = etapesCalcul(t, chercher);
    return [
        `${AMORCES.sais} ${ceQueJeSais(t, chercher)}`,
        `${AMORCES.or} d'après le théorème de Pythagore, ${THEOREME.enonce.charAt(0).toLowerCase()}${THEOREME.enonce.slice(1)}`,
        `${AMORCES.donc} ${calc.lignes.map(ligneEnTexte).join(' ; ')}.`
    ];
}
