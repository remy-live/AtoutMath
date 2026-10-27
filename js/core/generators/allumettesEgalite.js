// LES ALLUMETTES À DÉPLACER — réparer une égalité fausse en bougeant UN bâton.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « fais allumettes, la traversée ».
//
// LA RÈGLE : une égalité est écrite en allumettes, avec des chiffres à sept
// segments. Elle est FAUSSE. On déplace UNE allumette — une seule, et on ne
// l'enlève pas : elle doit se reposer ailleurs — pour que l'égalité devienne
// vraie.
//
// CE N'EST PAS LE JEU DES ALLUMETTES DU 26 OCTOBRE. Celui-là est un Nim, où
// l'on retire des allumettes d'un tas à tour de rôle et où la stratégie tient
// dans le reste de la division par quatre. Ici personne ne joue contre
// personne, et le travail est tout autre : LIRE une égalité, voir en quoi elle
// est fausse, et chercher quel chiffre peut devenir quel autre chiffre.
//
// ── CE QUE ÇA TRAVAILLE VRAIMENT ────────────────────────────────────────────
//
// Deux choses à la fois, et c'est ce qui en fait un bon exercice :
//
//   · LE CALCUL. Pour savoir où aller, il faut avoir essayé des égalités
//     vraies voisines — « 8 + 3 ferait 11, et 11 je sais l'écrire ».
//   · LA FORME DES CHIFFRES. 6 et 5 ne diffèrent que d'un segment ; 3 et 9
//     aussi ; 1 et 7 aussi. L'élève finit par connaître ces voisinages, et
//     c'est un vrai savoir de lecture — celui qui sert à ne pas confondre
//     deux chiffres mal écrits au tableau.
//
// ET LE SIGNE COMPTE POUR UNE ALLUMETTE : la barre verticale du « + » peut
// s'enlever pour faire un « − », ou s'ajouter à un « − » pour faire un « + ».
// C'est le coup que personne ne voit la première fois.
//
// ── POURQUOI LA SOLUTION DOIT ÊTRE UNIQUE ───────────────────────────────────
//
// Même raison que la grille de kakuro à deux solutions, corrigée la veille :
// `evaluate` compare la réponse de l'élève à UNE réponse attendue, et un élève
// qui trouve l'autre réparation serait compté faux sans qu'on puisse le lui
// expliquer. On ne garde donc une énigme que si, parmi tous les déplacements
// possibles, un seul rend l'égalité vraie.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.allumettes-egalite';

/**
 * LES SEPT SEGMENTS, dans l'ordre où on les numérote partout ici :
 *
 *      ── 0 ──          0 haut          4 bas-gauche
 *     │       │         1 haut-droite   5 haut-gauche
 *     5       1         2 bas-droite    6 milieu
 *     │       │         3 bas
 *      ── 6 ──
 *     │       │
 *     4       2
 *     │       │
 *      ── 3 ──
 *
 * Chaque chiffre est un masque de bits : le bit k vaut 1 si le segment k est
 * allumé. C'est la même écriture que sur un réveil, et elle n'est pas choisie
 * au hasard — c'est celle que les élèves ont sous les yeux tous les matins.
 */
export const CHIFFRES = [
    0b0111111, // 0 — six allumettes
    0b0000110, // 1 — deux
    0b1011011, // 2 — cinq
    0b1001111, // 3 — cinq
    0b1100110, // 4 — quatre
    0b1101101, // 5 — cinq
    0b1111101, // 6 — six
    0b0000111, // 7 — trois
    0b1111111, // 8 — sept
    0b1101111  // 9 — six
];

/** Du masque au chiffre, ou −1 si ce dessin n'est aucun chiffre. */
export function chiffreDe(masque) {
    return CHIFFRES.indexOf(masque);
}

/**
 * LE SIGNE EST UNE CELLULE COMME UNE AUTRE, avec deux emplacements : la barre
 * horizontale (bit 0), toujours posée, et la barre verticale (bit 1).
 *
 *   « − » = 0b01     « + » = 0b11
 *
 * ON NE TOUCHE JAMAIS AU « = ». Ses deux barres sont fixes : une égalité dont
 * on peut défaire le signe d'égalité ne veut plus rien dire, et l'élève
 * passerait son temps à fabriquer des dessins qui ne se lisent pas.
 */
const MOINS = 0b01, PLUS = 0b11;

/** Combien d'allumettes porte ce masque. */
function combien(m) {
    let n = 0;
    while (m) { m &= m - 1; n++; }
    return n;
}

export const FORMATS = {
    court: { gauche: 1, droite: 1, resultat: 1, nom: 'Courte — un chiffre de chaque côté' },
    moyen: { gauche: 1, droite: 1, resultat: 2, nom: 'Moyenne — le résultat a deux chiffres' },
    long: { gauche: 2, droite: 1, resultat: 2, nom: 'Longue — deux chiffres à gauche' }
};

/**
 * UNE ÉGALITÉ EN CELLULES. L'ordre de lecture est celui de l'écriture :
 * le premier nombre, le signe, le second nombre, le « = », le résultat.
 *
 * `nombres` dit quelles cellules forment quel nombre, pour qu'on puisse relire
 * l'égalité sans refaire la géométrie à chaque fois.
 */
function poser(forme, a, b, c, signe) {
    const cellules = [];
    const nombres = [];
    const ecrire = (valeur, combienDeChiffres) => {
        const debut = cellules.length;
        const texte = String(valeur).padStart(combienDeChiffres, '0');
        for (const ch of texte) cellules.push({ t: 'c', m: CHIFFRES[Number(ch)] });
        nombres.push({ debut, long: combienDeChiffres });
    };
    ecrire(a, forme.gauche);
    const op = cellules.length;
    cellules.push({ t: 'o', m: signe });
    ecrire(b, forme.droite);
    cellules.push({ t: '=' });
    ecrire(c, forme.resultat);
    return { cellules, nombres, op };
}

/**
 * RELIRE UN PLATEAU : les trois nombres, le signe, et si l'égalité est vraie.
 * Rend `null` dès qu'un dessin n'est pas un chiffre — c'est ce qui écarte les
 * déplacements qui fabriquent des formes illisibles.
 */
export function relire(plateau) {
    const { cellules, nombres, op } = plateau;
    const signe = cellules[op].m;
    if (signe !== PLUS && signe !== MOINS) return null;
    const valeurs = [];
    for (const n of nombres) {
        let texte = '';
        for (let k = 0; k < n.long; k++) {
            const d = chiffreDe(cellules[n.debut + k].m);
            if (d < 0) return null;
            texte += String(d);
        }
        // PAS DE ZÉRO EN TÊTE d'un nombre à plusieurs chiffres : « 05 » n'est
        // pas une écriture qu'on accepte au tableau, on ne l'accepte pas ici.
        if (n.long > 1 && texte[0] === '0') return null;
        valeurs.push(Number(texte));
    }
    const [a, b, c] = valeurs;
    const calcul = signe === PLUS ? a + b : a - b;
    return { a, b, c, signe, vraie: calcul === c };
}

/** Le plateau écrit en une ligne, pour la réponse attendue et pour l'écran. */
export const ecrirePlateau = (plateau) => 'a' + plateau.cellules
    .map(c => (c.t === '=' ? 'e' : String(c.m))).join('.');

/** Une copie profonde, parce qu'on essaie des milliers de déplacements. */
const copier = (p) => ({
    cellules: p.cellules.map(c => ({ ...c })), nombres: p.nombres, op: p.op
});

/**
 * TOUS LES DÉPLACEMENTS D'UNE SEULE ALLUMETTE.
 *
 * On prend un segment allumé quelque part, on le pose sur un emplacement
 * éteint ailleurs — ou ailleurs DANS LA MÊME cellule, ce qui est le cas le
 * plus fréquent et le plus joli : un 6 devient un 9 sans que rien ne bouge
 * d'un chiffre à l'autre.
 *
 * LE « = » N'EST NI SOURCE NI DESTINATION, voir plus haut.
 */
export function deplacements(plateau) {
    const out = [];
    const places = plateau.cellules
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.t !== '=');
    const taille = (c) => (c.t === 'o' ? 2 : 7);
    for (const source of places) {
        for (let s = 0; s < taille(source.c); s++) {
            if (!(source.c.m & (1 << s))) continue;
            for (const cible of places) {
                for (let d = 0; d < taille(cible.c); d++) {
                    if (source.i === cible.i && s === d) continue;
                    // L'emplacement doit être libre APRÈS le retrait : bouger
                    // un segment sur lui-même n'est pas un déplacement.
                    const apresRetrait = source.i === cible.i
                        ? cible.c.m & ~(1 << s) : cible.c.m;
                    if (apresRetrait & (1 << d)) continue;
                    const neuf = copier(plateau);
                    neuf.cellules[source.i].m &= ~(1 << s);
                    neuf.cellules[cible.i].m |= (1 << d);
                    out.push({ de: [source.i, s], vers: [cible.i, d], plateau: neuf });
                }
            }
        }
    }
    return out;
}

/** Combien de déplacements rendent cette égalité VRAIE, et lesquels. */
export function reparations(plateau) {
    return deplacements(plateau).filter(m => {
        const lu = relire(m.plateau);
        return lu && lu.vraie;
    });
}

/** Les égalités vraies d'une forme donnée, toutes. */
function egalitesVraies(forme) {
    const out = [];
    const borne = (n) => (n === 1 ? [0, 9] : [10, 99]);
    const [ag, bg] = borne(forme.gauche);
    const [ad, bd] = borne(forme.droite);
    const [ar, br] = borne(forme.resultat);
    for (let a = ag; a <= bg; a++) {
        for (let b = ad; b <= bd; b++) {
            for (const signe of [PLUS, MOINS]) {
                const c = signe === PLUS ? a + b : a - b;
                if (c < ar || c > br) continue;
                out.push({ a, b, c, signe });
            }
        }
    }
    return out;
}

export const allumettesEgaliteGenerator = {
    id: 'logique.allumettes-egalite',
    label: 'Les Allumettes à Déplacer',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Longueur de l\'égalité', default: 'court',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'signe', type: 'select', label: 'Les signes en jeu', default: 'plus',
            aide: 'Avec « les deux », la barre verticale du + peut s\'enlever pour faire un − : '
                + 'c\'est le déplacement que personne ne voit la première fois.',
            options: [
                { value: 'plus', label: 'Des additions seulement' },
                { value: 'deux', label: 'Additions et soustractions' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const forme = FORMATS[p.format] || FORMATS.court;
        const avecMoins = p.signe === 'deux';

        const vraies = egalitesVraies(forme)
            .filter(e => avecMoins || e.signe === PLUS);

        // ON PART D'UNE ÉGALITÉ VRAIE ET ON LA CASSE, jamais l'inverse : une
        // égalité fausse tirée au hasard n'est presque jamais réparable en un
        // seul geste, et l'on chercherait longtemps. En la cassant soi-même on
        // SAIT qu'au moins une réparation existe — celle qui défait le geste.
        let enigme = null, solution = null;
        for (const depart of rng.shuffle(vraies.slice())) {
            const base = poser(forme, depart.a, depart.b, depart.c, depart.signe);
            for (const casse of rng.shuffle(deplacements(base))) {
                const lu = relire(casse.plateau);
                if (!lu || lu.vraie) continue;
                // « DES ADDITIONS SEULEMENT » DOIT TENIR SUR L'ÉNIGME AUSSI.
                // Mesuré : en partant d'une addition, le geste qui la casse
                // pouvait emporter la barre verticale du +, et le réglage
                // servait « 5 − 5 = 18 » à un élève à qui l'on avait promis
                // des additions. Un réglage qui ment est pire qu'un réglage
                // absent — on ne sait plus de quoi on parle avec lui.
                if (!avecMoins && lu.signe !== PLUS) continue;
                // ET L'ON N'EN GARDE QU'UNE SEULE RÉPARATION POSSIBLE. Deux, et
                // l'élève qui trouve l'autre est compté faux : c'est le défaut
                // du kakuro à deux solutions, et il n'est pas plus acceptable
                // ici. Mesuré : à peu près une énigme sur quatre survit.
                const bonnes = reparations(casse.plateau);
                if (bonnes.length !== 1) continue;
                enigme = casse.plateau;
                solution = bonnes[0];
                break;
            }
            if (enigme) break;
        }

        if (!enigme) {
            // FILET : l'égalité la plus connue du genre, « 5 + 7 = 2 », qu'on
            // répare en prenant une allumette au 7. On n'y arrive jamais avec
            // les formes du catalogue — mais un écran vide n'est pas une
            // option, et le relevé le dit.
            const base = poser(FORMATS.court, 5, 1, 6, PLUS);
            const casse = deplacements(base).find(m => {
                const lu = relire(m.plateau);
                return lu && !lu.vraie && reparations(m.plateau).length === 1;
            });
            enigme = casse ? casse.plateau : base;
            solution = reparations(enigme)[0] || null;
        }

        const lu = relire(enigme);
        const bonne = solution ? solution.plateau : enigme;
        const apres = relire(bonne);
        const signeTexte = (s) => (s === PLUS ? '+' : '−');
        const ecrite = `${lu.a} ${signeTexte(lu.signe)} ${lu.b} = ${lu.c}`;

        const consigne = 'Déplace UNE seule allumette pour que l\'égalité devienne vraie. '
            + 'L\'allumette doit se reposer ailleurs, pas disparaître.';

        // CE QU'ON COMPTE, pour l'indice et pour le papier : combien
        // d'allumettes porte chaque chiffre. C'est le chiffre qui ouvre
        // l'énigme — on cherche deux chiffres qui ne diffèrent que d'un
        // segment, et leur différence d'allumettes vaut 0 ou 1.
        const batons = enigme.cellules
            .filter(c => c.t !== '=')
            .reduce((n, c) => n + combien(c.m), 0);

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.allumettes-egalite',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                // LA CONSIGNE EST COMMUNE À TOUTE LA FEUILLE : la fiche prend
                // `papier` du PREMIER item et l'imprime en tête. Y coller l'égalité
                // de cet item-là faisait lire « … pas disparaître. — 6 + 9 = 6 »
                // au-dessus de six énigmes différentes. Vu sur la fiche imprimée.
                papier: consigne,
                html: `<div class="game-question ae-consigne">${consigne}</div>`
            },
            answer: ecrirePlateau(bonne),
            hints: [
                `L'égalité dit ${ecrite}, et elle est fausse. Quelles égalités VRAIES `
                    + 'sont tout près de celle-là ? Écris-en deux ou trois au brouillon.',
                'Deux chiffres qui ne diffèrent que d\'une allumette : 6 et 5, 9 et 3, '
                    + '7 et 1, 8 et 9, 6 et 8. Cherche lequel peut changer.',
                lu.signe === PLUS
                    ? 'N\'oublie pas le signe : la barre verticale du + est une allumette '
                        + 'comme les autres, et elle peut aller ailleurs.'
                    : 'N\'oublie pas le signe : poser une allumette en travers du − en fait '
                        + 'un +, et l\'égalité change du tout au tout.'
            ],
            explanation: apres
                ? `En déplaçant une allumette, l'égalité devient ${apres.a} `
                    + `${signeTexte(apres.signe)} ${apres.b} = ${apres.c}.`
                : 'Une seule allumette suffit à rendre l\'égalité vraie.',
            difficulty: forme.resultat > 1 ? 2 : 1,
            meta: {
                cellules: enigme.cellules.map(c => ({ ...c })),
                nombres: enigme.nombres,
                op: enigme.op,
                solution: bonne.cellules.map(c => ({ ...c })),
                batons,
                ecrite,
                titreCourt: 'Allumettes à déplacer',
                texteLecon: 'Deux chiffres voisins ne diffèrent que d\'une allumette : '
                    + '6 et 5, 9 et 3, 7 et 1.',
                filet: !solution
            }
        });
    }
};

export default allumettesEgaliteGenerator;
