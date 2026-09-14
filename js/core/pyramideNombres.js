// LA PYRAMIDE DE NOMBRES — chaque case est la somme des deux du dessous.
//
// Rémy : « Deux jeux dans ces styles », avec la page de son « Coin des jeux
// mathématiques ». Voici la jumelle arithmétique de la pyramide de mots : même
// escalier, même façon de se remplir de proche en proche, mais on additionne.
//
// UNE SEULE RÈGLE, ET ELLE SE LIT DANS LES DEUX SENS. C'est là tout l'intérêt,
// et c'est ce qui la sépare d'une colonne d'additions :
//
//     · VERS LE HAUT, on ADDITIONNE : 7 et 5 donnent 12.
//     · VERS LE BAS, on SOUSTRAIT : si le dessus vaut 12 et l'un des deux 7,
//       l'autre vaut 12 − 7.
//
// Un élève qui n'a jamais fait que des additions bute à la première case
// creuse du bas ; celui qui a compris que la soustraction est l'addition lue à
// l'envers la remplit sans hésiter. C'est exactement la leçon des « nombres à
// trous », mais posée sur un objet qu'on a envie de finir.
//
// LA GRILLE EST FABRIQUÉE COMME UN SUDOKU : on part de la solution, on cache
// tout, on redonne des cases une à une jusqu'à ce que la PROPAGATION suffise,
// puis on retire celles dont on peut se passer. Deux propriétés en découlent,
// et ce sont les deux qui comptent :
//
//     · UNE SEULE SOLUTION — sans quoi deux élèves rendent deux feuilles
//       justes et différentes, et la correction devient impossible.
//     · AUCUN TÂTONNEMENT — tout se déduit case après case, jamais en essayant
//       un nombre pour voir. Un élève qui doit deviner n'apprend pas ce qu'on
//       voulait lui apprendre.
//
// Module pur : ni DOM, ni hasard propre.

/** Les tailles proposées, et les nombres du bas qui vont avec. */
export const TAILLES_PN = {
    petite: { id: 'petite', label: '4 étages — pour découvrir', n: 4, max: 9 },
    moyenne: { id: 'moyenne', label: '5 étages', n: 5, max: 7 },
    grande: { id: 'grande', label: '6 étages — le sommet passe 100', n: 6, max: 5 }
};

/**
 * LES NOMBRES DU BAS SONT PETITS, ET C'EST CALCULÉ.
 *
 * Le sommet d'une pyramide à six étages vaut a + 5b + 10c + 10d + 5e + f : avec
 * des nombres du bas jusqu'à neuf, il dépasserait deux cents et l'exercice
 * deviendrait un travail de retenues, pas de raisonnement. On baisse donc le
 * plafond du bas quand la pyramide monte.
 */
export function construirePyramide(base) {
    const lignes = [base.slice()];
    while (lignes[lignes.length - 1].length > 1) {
        const l = lignes[lignes.length - 1];
        lignes.push(l.slice(0, -1).map((v, i) => v + l[i + 1]));
    }
    return lignes;
}

/** Les trois cases d'un petit triangle : les deux du bas, et celle du dessus. */
export function triangles(lignes) {
    const t = [];
    for (let k = 0; k + 1 < lignes.length; k++) {
        for (let i = 0; i < lignes[k + 1].length; i++) {
            t.push({ gauche: [k, i], droite: [k, i + 1], haut: [k + 1, i] });
        }
    }
    return t;
}

const lire = (g, [k, i]) => g[k][i];
const ecrire = (g, [k, i], v) => { g[k][i] = v; };

/**
 * LA PROPAGATION : on remplit tant qu'une case se déduit de deux autres.
 *
 * Dans chaque petit triangle { a, b, a + b }, connaître deux des trois donne le
 * troisième — par une addition si c'est le sommet qui manque, par une
 * soustraction sinon. On tourne jusqu'à ce que plus rien ne bouge.
 *
 * @returns {'fini'|'bloque'|'impossible'}
 */
export function propager(lignes, connu) {
    const tri = triangles(lignes);
    let bouge = true;
    while (bouge) {
        bouge = false;
        for (const t of tri) {
            const g = lire(connu, t.gauche), d = lire(connu, t.droite), h = lire(connu, t.haut);
            const vides = [g, d, h].filter(v => v === null).length;
            if (vides === 0) {
                // Trois cases connues qui ne s'accordent pas : la saisie de
                // l'élève est fausse quelque part, ou la grille l'est.
                if (g + d !== h) return 'impossible';
                continue;
            }
            if (vides > 1) continue;
            if (h === null) ecrire(connu, t.haut, g + d);
            else if (g === null) ecrire(connu, t.gauche, h - d);
            else ecrire(connu, t.droite, h - g);
            bouge = true;
        }
    }
    return connu.every(l => l.every(v => v !== null)) ? 'fini' : 'bloque';
}

/** Une grille vide, de la forme d'une pyramide de `n` étages. */
export const grilleVide = (lignes) => lignes.map(l => l.map(() => null));

/** Une copie profonde d'une grille. */
const copie = (g) => g.map(l => l.slice());

/**
 * OÙ L'ON PRÉFÈRE DONNER LES CASES, selon la difficulté.
 *
 * `poids` note chaque étage : plus il est haut, plus on donne dans le haut de
 * la pyramide, et plus il faut SOUSTRAIRE pour redescendre. C'est la seule
 * chose qui change vraiment la nature de l'exercice — le nombre de cases
 * données, lui, ne fait que le raccourcir.
 */
export const DIFFICULTES_PN = {
    // Tout le bas donné : il ne reste qu'à monter en additionnant. C'est la
    // pyramide qu'on donne en premier, et elle n'a rien d'un exercice bidon —
    // additionner quinze fois de suite sans se tromper est déjà un travail.
    addition: { id: 'addition', label: 'La base est donnée — on ne fait qu\'additionner' },
    // POIDS ZÉRO : les cases données sont tirées SANS PRÉFÉRENCE d'étage. Avec
    // un poids de un, « mélange » revenait au même que « surtout le haut » —
    // les deux réglages donnaient des grilles indiscernables, et l'élève à qui
    // l'on annonçait un exercice plus facile en recevait un identique.
    melange: { id: 'melange', label: 'Des trous partout — il faut aussi soustraire', poids: 0 },
    soustraction: { id: 'soustraction', label: 'Surtout le haut — beaucoup de soustractions', poids: 3 }
};

/**
 * Une pyramide prête à jouer ou à imprimer.
 * @param {{taille?: string, difficulte?: string, rng: object}} opts
 */
export function creerPyramideNombres({ taille = 'moyenne', difficulte = 'melange', rng }) {
    const t = TAILLES_PN[taille] || TAILLES_PN.moyenne;
    const d = DIFFICULTES_PN[difficulte] || DIFFICULTES_PN.melange;
    const base = Array.from({ length: t.n }, () => rng.int(1, t.max));
    const lignes = construirePyramide(base);

    if (d.id === 'addition') {
        const donnes = lignes.map((l, k) => l.map(() => k === 0));
        return { taille: t.id, difficulte: d.id, n: t.n, lignes, donnes };
    }

    // ON DONNE JUSQU'À CE QUE ÇA SE DÉDUISE, PUIS ON RETIRE. C'est la recette
    // du sudoku de la maison : elle garantit d'un coup l'unicité (la
    // propagation ne trouve qu'une valeur par case) et l'absence de
    // tâtonnement (elle ne fait que déduire).
    const cases = lignes.flatMap((l, k) => l.map((_, i) => [k, i]));
    // Les étages hauts d'abord quand on veut des soustractions : `poids` fait
    // pencher le tirage sans jamais l'imposer, pour que deux grilles de même
    // réglage ne se ressemblent pas.
    const ordre = rng.shuffle(cases)
        .map(c => ({ c, note: c[0] * d.poids + rng.next() * lignes.length }))
        .sort((a, b) => b.note - a.note)
        .map(x => x.c);

    const donnes = lignes.map(l => l.map(() => false));
    const essaie = () => {
        const connu = lignes.map((l, k) => l.map((v, i) => (donnes[k][i] ? v : null)));
        return propager(lignes, connu);
    };
    for (const [k, i] of ordre) {
        if (essaie() === 'fini') break;
        donnes[k][i] = true;
    }
    // L'ÉLAGAGE. On repart de la fin : les dernières cases données sont celles
    // qui ont débloqué la propagation, donc les plus susceptibles d'avoir rendu
    // les premières inutiles.
    for (let j = ordre.length - 1; j >= 0; j--) {
        const [k, i] = ordre[j];
        if (!donnes[k][i]) continue;
        donnes[k][i] = false;
        if (essaie() !== 'fini') donnes[k][i] = true;
    }
    return { taille: t.id, difficulte: d.id, n: t.n, lignes, donnes };
}

/** La saisie de départ : les cases données sont écrites, les autres vides. */
export const saisieInitialePN = (p) =>
    p.lignes.map((l, k) => l.map((v, i) => (p.donnes[k][i] ? v : null)));

/** Une case est juste quand elle porte exactement la valeur attendue. */
export const caseJuste = (p, k, i, saisie) => saisie[k][i] === p.lignes[k][i];

/** La pyramide est finie quand toutes ses cases sont justes. */
export const estResoluePN = (p, saisie) =>
    p.lignes.every((l, k) => l.every((_, i) => caseJuste(p, k, i, saisie)));

/** Les cases fausses, pour les montrer en rouge. */
export const casesFaussesPN = (p, saisie) =>
    p.lignes.flatMap((l, k) => l.map((_, i) => (
        saisie[k][i] !== null && !caseJuste(p, k, i, saisie) ? [k, i] : null
    ))).filter(Boolean);

/**
 * LA PROCHAINE CASE QUI SE DÉDUIT, ET LE CALCUL QUI LA DONNE.
 *
 * C'est l'aide de ce jeu, et elle vaut mieux que la réponse : elle montre le
 * petit triangle où deux cases sur trois sont déjà connues, et écrit
 * l'opération. « 23 − 9 = 14 » sur une case du BAS est précisément ce qui fait
 * comprendre qu'on peut aussi descendre.
 *
 * ON SUPPOSE LA SAISIE JUSTE. Cette fonction déduit de ce qui est écrit : sur
 * une pyramide contenant une case fausse, elle déduira faux, et c'est
 * inévitable — une déduction ne vaut que ce que valent ses prémisses. C'est à
 * l'appelant de vérifier d'abord (voir casesFaussesPN), et de le dire à
 * l'élève : une erreur en bas se propage jusqu'au sommet, et s'en apercevoir
 * fait partie de la leçon.
 */
export function prochaineCase(p, saisie) {
    const connu = saisie.map(l => l.slice());
    for (const t of triangles(p.lignes)) {
        const g = lire(connu, t.gauche), d = lire(connu, t.droite), h = lire(connu, t.haut);
        const vides = [g, d, h].filter(v => v === null).length;
        if (vides !== 1) continue;
        if (h === null) {
            return { ou: t.haut, valeur: g + d, calcul: `${g} + ${d} = ${g + d}`, sens: 'monter' };
        }
        if (g === null) {
            return { ou: t.gauche, valeur: h - d, calcul: `${h} − ${d} = ${h - d}`, sens: 'descendre' };
        }
        return { ou: t.droite, valeur: h - g, calcul: `${h} − ${g} = ${h - g}`, sens: 'descendre' };
    }
    return null;
}

/** De quoi écrire un corrigé : le sommet, la base, et ce qu'il y avait à faire. */
export function qualitePN(p) {
    const donnees = p.donnes.flat().filter(Boolean).length;
    const total = p.lignes.flat().length;
    return {
        sommet: p.lignes[p.lignes.length - 1][0],
        base: p.lignes[0].slice(),
        donnees,
        aTrouver: total - donnees,
        // Combien de cases se remplissent en SOUSTRAYANT : c'est ce qui dit la
        // vraie difficulté, bien mieux que le nombre de trous.
        soustractions: compterSoustractions(p)
    };
}

function compterSoustractions(p) {
    const connu = saisieInitialePN(p);
    let n = 0, bouge = true;
    const tri = triangles(p.lignes);
    while (bouge) {
        bouge = false;
        for (const t of tri) {
            const g = lire(connu, t.gauche), d = lire(connu, t.droite), h = lire(connu, t.haut);
            if ([g, d, h].filter(v => v === null).length !== 1) continue;
            if (h === null) ecrire(connu, t.haut, g + d);
            else if (g === null) { ecrire(connu, t.gauche, h - d); n++; }
            else { ecrire(connu, t.droite, h - g); n++; }
            bouge = true;
        }
    }
    return n;
}

export { copie as copiePN };
