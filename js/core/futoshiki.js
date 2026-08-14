// LE FUTOSHIKI — un carré latin sous inégalités.
//
// Chaque chiffre de 1 à n une fois par ligne et par colonne (comme un sudoku),
// PLUS des signes < et > entre certaines cases voisines. C'est le puzzle qui
// fait travailler la COMPARAISON comme objet de déduction : « cette case est
// plus petite que sa voisine, et sa voisine vaut au plus 3, donc… ». Un élève
// qui lit les inégalités passivement les subit ; ici il s'en sert.
//
// LA FABRICATION suit la même exigence que le logigramme et le carré magique :
//   · on part d'un carré latin complet (mélangé par lignes, colonnes,
//     renumérotation — ces opérations conservent la propriété) ;
//   · on choisit des inégalités VRAIES et des cases données, puis on vérifie
//     qu'un solveur par PROPAGATION PURE termine : pas d'essai-erreur, donc
//     solution unique et atteignable par un élève ;
//   · on retire ensuite tout ce qui est superflu.

/** Un carré latin n×n mélangé : base cyclique + permutations. */
export function carreLatinAleatoire(n, rng) {
    const lignes = rng.shuffle([...Array(n).keys()]);
    const colonnes = rng.shuffle([...Array(n).keys()]);
    const chiffres = rng.shuffle([...Array(n).keys()]);
    const g = new Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        g[r * n + c] = chiffres[(lignes[r] + colonnes[c]) % n] + 1;
    }
    return g;
}

/**
 * Le solveur par propagation : candidats par case, et trois règles seulement —
 * l'unicité ligne/colonne, la case à un seul candidat, et les inégalités qui
 * rabotent les bords (a < b élimine le max de a et le min de b).
 * S'il termine, un élève peut terminer par le même chemin.
 */
export function resoudre(puzzle) {
    const { n, donnees, inegalites } = puzzle;
    const cand = Array.from({ length: n * n }, (_, i) =>
        donnees[i] ? new Set([donnees[i]]) : new Set(Array.from({ length: n }, (_, v) => v + 1)));
    const etapes = [];

    // CHAQUE ÉTAPE DIT PAR QUELLE RÈGLE ELLE TOMBE. L'aide du jeu répétait
    // « sa ligne, sa colonne et ses signes ne lui laissent qu'une valeur » —
    // vrai pour toutes les cases, donc utile pour aucune. Avec la règle, elle
    // peut nommer la déduction précise à refaire.
    const poserSi = (i, avant, regle) => {
        if (cand[i].size === 1 && avant !== 1) {
            etapes.push({ case: i, valeur: [...cand[i]][0], regle });
        }
    };

    let progres = true;
    let garde = 0;
    while (progres && garde++ < 400) {
        progres = false;
        // L'unicité : une valeur sûre s'efface des voisines de ligne/colonne.
        for (let i = 0; i < n * n; i++) {
            if (cand[i].size !== 1) continue;
            const v = [...cand[i]][0];
            const r = Math.floor(i / n), c = i % n;
            for (let k = 0; k < n; k++) {
                for (const j of [r * n + k, k * n + c]) {
                    if (j !== i && cand[j].has(v)) {
                        const avant = cand[j].size;
                        cand[j].delete(v);
                        if (!cand[j].size) return { complet: false, etapes };
                        poserSi(j, avant, 'unicite');
                        progres = true;
                    }
                }
            }
        }
        // Les inégalités rabotent : a < b ⇒ a < max(b), b > min(a).
        for (const ing of inegalites) {
            const [p, g_] = [ing.petit, ing.grand];
            const maxG = Math.max(...cand[g_]);
            const minP = Math.min(...cand[p]);
            for (const v of [...cand[p]]) {
                if (v >= maxG) {
                    const avant = cand[p].size;
                    cand[p].delete(v);
                    if (!cand[p].size) return { complet: false, etapes };
                    poserSi(p, avant, 'trop-grand');
                    progres = true;
                }
            }
            for (const v of [...cand[g_]]) {
                if (v <= minP) {
                    const avant = cand[g_].size;
                    cand[g_].delete(v);
                    if (!cand[g_].size) return { complet: false, etapes };
                    poserSi(g_, avant, 'trop-petit');
                    progres = true;
                }
            }
        }
        // La valeur qui n'a plus qu'une place dans sa ligne / sa colonne.
        for (let unite = 0; unite < 2 * n; unite++) {
            const cases = unite < n
                ? Array.from({ length: n }, (_, k) => unite * n + k)
                : Array.from({ length: n }, (_, k) => k * n + (unite - n));
            for (let v = 1; v <= n; v++) {
                const possibles = cases.filter(i => cand[i].has(v));
                if (possibles.length === 1 && cand[possibles[0]].size > 1) {
                    cand[possibles[0]] = new Set([v]);
                    etapes.push({
                        case: possibles[0], valeur: v, regle: 'seule-place',
                        unite: unite < n
                            ? { type: 'ligne', index: unite }
                            : { type: 'colonne', index: unite - n }
                    });
                    progres = true;
                }
            }
        }
    }
    const complet = cand.every(s => s.size === 1);
    return { complet, etapes, grille: complet ? cand.map(s => [...s][0]) : null };
}

/**
 * Fabrique un puzzle : inégalités et données choisies au hasard parmi les
 * vraies, ajoutées jusqu'à résolubilité, puis émondées une à une.
 */
export function genererFutoshiki(params, rng) {
    const n = Math.min(6, Math.max(4, Number(params && params.taille) || 4));
    const solution = carreLatinAleatoire(n, rng);

    // Toutes les inégalités vraies entre voisines (droite et bas).
    const candidates = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const i = r * n + c;
        if (c + 1 < n) candidates.push(solution[i] < solution[i + 1]
            ? { petit: i, grand: i + 1 } : { petit: i + 1, grand: i });
        if (r + 1 < n) candidates.push(solution[i] < solution[i + n]
            ? { petit: i, grand: i + n } : { petit: i + n, grand: i });
    }
    const ordreIneg = rng.shuffle(candidates);
    const ordreDonnees = rng.shuffle(solution.map((_, i) => i));

    const donnees = new Array(n * n).fill(0);
    const inegalites = [];
    let iIneg = 0, iDon = 0;
    let etat = resoudre({ n, donnees, inegalites });
    // On alterne : deux inégalités pour une donnée — c'est le signe qui doit
    // porter le puzzle, pas les cases écrites d'avance.
    while (!etat.complet && (iIneg < ordreIneg.length || iDon < ordreDonnees.length)) {
        if (iIneg < ordreIneg.length && (iIneg < iDon * 2 + 2)) {
            inegalites.push(ordreIneg[iIneg++]);
        } else if (iDon < ordreDonnees.length) {
            const i = ordreDonnees[iDon++];
            donnees[i] = solution[i];
        } else {
            inegalites.push(ordreIneg[iIneg++]);
        }
        etat = resoudre({ n, donnees, inegalites });
    }

    // L'émondage : un indice dont on peut se passer est une déduction volée.
    // Les DONNÉES d'abord — quand une case écrite et un signe font le même
    // travail, c'est le signe qu'on garde : le futoshiki est le puzzle des
    // inégalités, pas un sudoku qui en porte trois pour la décoration.
    for (let i = 0; i < donnees.length; i++) {
        if (!donnees[i]) continue;
        const sans = donnees.slice(); sans[i] = 0;
        if (resoudre({ n, donnees: sans, inegalites }).complet) donnees[i] = 0;
    }
    for (let k = inegalites.length - 1; k >= 0; k--) {
        const sans = inegalites.filter((_, x) => x !== k);
        if (resoudre({ n, donnees, inegalites: sans }).complet) inegalites.splice(k, 1);
    }

    // ON REMET DES CASES POUR LES PREMIÈRES GRILLES.
    //
    // L'émondage laisse la grille la plus dépouillée possible : c'est la plus
    // belle, et c'est aussi la plus dure — un élève qui découvre le futoshiki
    // se retrouve devant quatre signes et rien d'autre. On rend donc quelques
    // chiffres selon la difficulté. Ajouter une case connue ne peut pas rendre
    // la grille ambiguë : elle n'apporte que de l'information vraie, la
    // solution reste unique, et le solveur n'en termine que plus tôt.
    // LES PREMIÈRES GRILLES D'UNE SÉANCE SONT PLUS GARNIES. Le jeu passe une
    // part explicite (`partDonnees`) pour ses deux ou trois premières grilles :
    // on découvre la mécanique des signes sur une grille qui se laisse
    // commencer, pas sur quatre inégalités et rien d'autre.
    const impose = params && params.partDonnees;
    const part = Number.isFinite(impose)
        ? impose
        : { facile: 0.34, moyen: 0.16, difficile: 0 }[params && params.difficulte];
    const voulu = Math.round(n * n * (part === undefined ? 0.34 : part));
    let combien = donnees.filter(Boolean).length;
    for (const i of rng.shuffle([...Array(n * n).keys()])) {
        if (combien >= voulu) break;
        if (donnees[i]) continue;
        donnees[i] = solution[i];
        combien++;
    }

    const final = resoudre({ n, donnees, inegalites });
    return {
        n, solution, donnees, inegalites, etapes: final.etapes,
        difficulte: (params && params.difficulte) || 'facile'
    };
}

/** La saisie est-elle juste ? Les fautes, une par une ; le vide n'en est pas une. */
export function verifierSaisie(puzzle, saisie) {
    const fautes = [];
    let vides = 0;
    for (let i = 0; i < puzzle.n * puzzle.n; i++) {
        if (puzzle.donnees[i]) continue;
        const v = saisie[i];
        if (v === null || v === undefined || v === '' || Number(v) === 0) { vides++; continue; }
        if (Number(v) !== puzzle.solution[i]) fautes.push(i);
    }
    return { ok: fautes.length === 0 && vides === 0, fautes, vides };
}
