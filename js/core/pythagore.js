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
 * Les étapes du calcul, celles qu'on écrit au cahier — pour l'hypoténuse
 * (`chercher` absent) ou pour une cathète (`chercher` = son nom).
 * Chaque étape porte sa VALEUR attendue : c'est elle que l'élève saisit.
 */
export function etapesCalcul(t, chercher) {
    const { hypo, cathetes } = cotesDe(t);
    const [c1, c2] = cathetes;
    if (!chercher || chercher === hypo.nom) {
        const carre = c1.longueur ** 2 + c2.longueur ** 2;
        return {
            cherche: hypo.nom, resultat: hypo.longueur,
            lignes: [
                { texte: `${hypo.nom}² = ${c1.nom}² + ${c2.nom}²`, question: null },
                { texte: `${hypo.nom}² = ${c1.longueur}² + ${c2.longueur}² = `, question: `${c1.longueur ** 2} + ${c2.longueur ** 2}`, attendu: carre },
                { texte: `${hypo.nom} = √${carre} = `, attendu: hypo.longueur }
            ]
        };
    }
    const garde = cathetes.find(x => x.nom !== chercher);
    const perdu = cathetes.find(x => x.nom === chercher);
    const carre = hypo.longueur ** 2 - garde.longueur ** 2;
    return {
        cherche: perdu.nom, resultat: perdu.longueur,
        lignes: [
            { texte: `${hypo.nom}² = ${perdu.nom}² + ${garde.nom}²`, question: null },
            { texte: `${perdu.nom}² = ${hypo.nom}² − ${garde.nom}² = ${hypo.longueur}² − ${garde.longueur}² = `, attendu: carre },
            { texte: `${perdu.nom} = √${carre} = `, attendu: perdu.longueur }
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
 * La rédaction complète, celle du cahier. C'est aussi la correction imprimée :
 * la feuille de solutions la pose telle quelle.
 */
export function redactionComplete(t, chercher) {
    const calc = etapesCalcul(t, chercher);
    const { hypo, cathetes } = cotesDe(t);
    const donnees = chercher && chercher !== hypo.nom
        ? `${hypo.nom} = ${hypo.longueur} cm et ${cathetes.find(x => x.nom !== chercher).nom} = ${cathetes.find(x => x.nom !== chercher).longueur} cm`
        : `${cathetes[0].nom} = ${cathetes[0].longueur} cm et ${cathetes[1].nom} = ${cathetes[1].longueur} cm`;
    return [
        `Je sais que ${direTriangle(t).replace(/^Le/, 'le')}, avec ${donnees}.`,
        `Or ${THEOREME.enonce}`,
        `Donc ${calc.lignes.map(l => l.texte.replace(/ = $/, '')).join(' ; ')} = ${calc.resultat}. `
        + `${calc.cherche} = ${calc.resultat} cm.`
    ];
}
