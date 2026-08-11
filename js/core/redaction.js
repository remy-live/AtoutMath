// RÉDIGER UN RAISONNEMENT — la propriété des parallèles et perpendiculaires.
//
// Un élève de sixième sait reconnaître deux droites perpendiculaires. Ce qu'il
// ne sait pas faire, et qu'on ne lui montre presque jamais pas à pas, c'est
// ÉCRIRE pourquoi il en est sûr. La rédaction d'une justification est un
// objet d'enseignement à part entière, et elle a sa forme :
//
//   JE SAIS QUE   les données, lues sur la figure et écrites en symboles.
//   OR            la propriété du cours, énoncée en entier.
//   DONC          la conclusion, qui n'invente rien.
//
// L'exercice se déroule en quatre temps. On ne demande jamais de rédiger avant
// d'avoir reconstitué la phrase : le premier obstacle n'est pas le
// raisonnement, c'est la phrase elle-même, dont l'élève ne retient qu'un
// morceau sur deux.
//
// Ce module ne contient que la matière : la phrase, ses mots, la figure et les
// trois lignes du raisonnement. Il ne connaît ni le DOM ni le SVG.

/**
 * La propriété travaillée. Une seule pour l'instant, volontairement : la
 * seconde (« deux droites perpendiculaires à une même troisième sont
 * parallèles ») s'écrira sur le même moule une fois celle-ci éprouvée.
 */
export const PROPRIETE = {
    id: 'para-perp',
    titre: 'Parallèles et perpendiculaires',
    enonce: 'Si deux droites sont parallèles, toute perpendiculaire à l\'une est perpendiculaire à l\'autre.',
    // Les groupes de mots, dans l'ordre. On ne découpe pas mot à mot : « toute
    // perpendiculaire à l'une » est UNE idée, et la couper en quatre étiquettes
    // transformerait un exercice de sens en casse-tête de syntaxe.
    groupes: [
        'Si deux droites',
        'sont parallèles,',
        'toute perpendiculaire',
        'à l\'une',
        'est perpendiculaire',
        'à l\'autre.'
    ],
    // Ce que chaque morceau fait VOIR sur la figure : c'est la synchronisation
    // du troisième temps, quand la phrase s'écrit pendant que le dessin bouge.
    mise_en_scene: [
        { jusqu_a: 2, montre: 'paralleles', dit: 'Les deux droites parallèles clignotent : ce sont elles, « deux droites parallèles ».' },
        // Le tracé REPART du début et descend : on le suit du doigt, il coupe
        // la première à angle droit, puis continue vers la seconde. C'est en
        // arrivant DESSUS que l'angle droit apparaît — le geste et la phrase
        // disent la même chose au même instant.
        { jusqu_a: 4, montre: 'perpendiculaire', dit: 'La perpendiculaire se retrace : elle coupe la première à angle droit.' },
        { jusqu_a: 6, montre: 'conclusion', dit: 'Elle atteint la seconde, et l\'angle droit apparaît : c\'est ce que la propriété annonçait.' }
    ],
    lecon: 'Une justification en géométrie a toujours trois lignes. JE SAIS QUE : ce qu\'on lit sur la figure ou dans l\'énoncé. OR : la propriété du cours, écrite en entier — c\'est elle qui autorise le pas suivant. DONC : la conclusion, qui ne dit rien de plus que ce que la propriété permet.'
};

/**
 * Trois noms de droites distincts, tirés au hasard.
 *
 * Que des noms de SIXIÈME. Le delta majuscule est la notation du lycée ; en
 * sixième, il ajoute un obstacle qui n'a rien à voir avec la propriété qu'on
 * travaille — l'élève bute sur un symbole qu'il n'a jamais vu au lieu de lire
 * la figure.
 */
export function tirerNoms(rng) {
    const lettres = rng.shuffle(['d', 'd\'', 'd₁', 'd₂', 'd₃', 'd₄', 'd₅']);
    return { p1: lettres[0], p2: lettres[1], perp: lettres[2] };
}

/**
 * La figure : deux parallèles et une perpendiculaire à la première.
 *
 * `inclinaison` évite la figure toujours horizontale — celle qui fait croire
 * qu'« être parallèle » veut dire « être couché ». Une propriété apprise sur
 * une seule orientation ne se reconnaît plus dès qu'on penche la feuille.
 */
export function tirerFigure(rng) {
    return {
        noms: tirerNoms(rng),
        inclinaison: rng.int(-28, 28),
        // Position de la perpendiculaire le long des parallèles, en pourcentage.
        ou: rng.int(32, 68),
        ecart: rng.int(28, 42)
    };
}

/** Ce qu'on LIT sur la figure : les deux données du « Je sais que ». */
export function donnees(figure) {
    const { p1, p2, perp } = figure.noms;
    return [
        { gauche: p1, relation: '//', droite: p2, dit: `(${p1}) et (${p2}) sont parallèles` },
        { gauche: perp, relation: '⊥', droite: p1, dit: `(${perp}) est perpendiculaire à (${p1})` }
    ];
}

/** Ce que la propriété AUTORISE à écrire. */
export function conclusion(figure) {
    const { p2, perp } = figure.noms;
    return { gauche: perp, relation: '⊥', droite: p2, dit: `(${perp}) est perpendiculaire à (${p2})` };
}

/**
 * Les étiquettes à glisser : les trois noms de droites, mélangés.
 * Toutes sont proposées à chaque trou — sans quoi il suffirait de compter les
 * étiquettes restantes pour trouver la dernière sans réfléchir.
 */
export function etiquettes(figure, rng) {
    const { p1, p2, perp } = figure.noms;
    return rng ? rng.shuffle([p1, p2, perp]) : [p1, p2, perp];
}

/** Les groupes de la phrase, mélangés — et jamais dans l'ordre par hasard. */
export function groupesMelanges(rng) {
    const bon = PROPRIETE.groupes;
    for (let essai = 0; essai < 20; essai++) {
        const m = rng.shuffle(bon);
        if (m.some((g, i) => g !== bon[i])) return m;
    }
    return [...bon].reverse();
}

/**
 * La phrase proposée est-elle la bonne ?
 * On renvoie AUSSI le premier rang fautif : dire « c'est faux » sans dire où
 * oblige à tout recommencer, et l'élève relit alors sans savoir quoi chercher.
 */
export function verifierPhrase(proposition) {
    const bon = PROPRIETE.groupes;
    const premierFaux = bon.findIndex((g, i) => proposition[i] !== g);
    return {
        juste: premierFaux === -1 && proposition.length === bon.length,
        premierFaux: premierFaux === -1 ? null : premierFaux
    };
}

/** Une ligne de « Je sais que » est-elle correctement remplie ? */
export function verifierDonnee(figure, rang, gauche, droite) {
    const attendue = donnees(figure)[rang];
    if (!attendue) return { juste: false, message: '' };
    // Une relation symétrique : « (d) // (d') » et « (d') // (d) » disent la
    // même chose, et refuser la seconde n'apprendrait qu'un ordre d'écriture.
    const memeSens = gauche === attendue.gauche && droite === attendue.droite;
    const inverse = gauche === attendue.droite && droite === attendue.gauche;
    const ok = attendue.relation === '//' ? (memeSens || inverse) : memeSens;
    if (ok) return { juste: true, message: attendue.dit };
    if (attendue.relation === '⊥' && inverse) {
        return {
            juste: true,
            message: `${attendue.dit} — et l'écrire dans l'autre sens revient au même : la perpendicularité aussi est symétrique.`
        };
    }
    return { juste: false, message: `Relis la figure : ${attendue.dit}.` };
}

/** La conclusion est-elle correctement remplie ? */
export function verifierConclusion(figure, gauche, droite) {
    const c = conclusion(figure);
    const ok = (gauche === c.gauche && droite === c.droite)
        || (gauche === c.droite && droite === c.gauche);
    return {
        juste: ok,
        message: ok
            ? c.dit
            : `La propriété parle de « l'AUTRE » parallèle : celle dont on n'a pas encore parlé.`
    };
}

/** Le raisonnement complet, tel qu'il doit apparaître dans le cahier. */
export function redactionComplete(figure) {
    const d = donnees(figure);
    const c = conclusion(figure);
    return [
        `Je sais que : (${d[0].gauche}) // (${d[0].droite}) et (${d[1].gauche}) ⊥ (${d[1].droite}).`,
        `Or ${PROPRIETE.enonce}`,
        `Donc (${c.gauche}) ⊥ (${c.droite}).`
    ];
}

export const ETAPES = [
    { id: 'phrase', titre: 'La propriété', consigne: 'Remets la propriété du cours dans l\'ordre.' },
    { id: 'donnees', titre: 'Je sais que', consigne: 'Lis la figure et complète les données. Les droites en POINTILLÉS sont parallèles.' },
    { id: 'or', titre: 'Or', consigne: 'La propriété s\'écrit, et la figure montre ce qu\'elle dit. Regarde.' },
    { id: 'donc', titre: 'Donc', consigne: 'Complète la conclusion : c\'est la propriété qui l\'autorise.' }
];
