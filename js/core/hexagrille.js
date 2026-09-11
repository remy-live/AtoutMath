// L'HEXAGRILLE — neuf hexagones, les chiffres de 1 à 9, des sommes fléchées.
//
// Neuf cases en losange, chacune portant UNE FOIS les chiffres de 1 à 9. Des
// flèches, posées au bord, donnent la somme de la file qu'elles désignent. On
// remplit par déduction : une file où il ne manque qu'une case se termine par
// une soustraction, et chaque case posée en débloque d'autres.
//
// POURQUOI CE JEU-LÀ, à côté du carré magique et du garam. Le carré magique
// donne UNE somme pour toutes les lignes : le raisonnement est toujours le
// même, et la difficulté vient du nombre de cases. Ici, chaque file a SA
// somme, et surtout ses files n'ont pas toutes la même longueur — une somme de
// 3 sur deux cases, c'est 1 et 2, sans discussion. On lit donc les nombres
// autrement : on cherche les décompositions possibles, on croise, on élimine.
// C'est de l'addition mentale, mais employée comme un raisonnement.
//
// LA GÉOMÉTRIE. Un losange de 3 × 3 hexagones à sommet plat. Une colonne est
// verticale, et deux familles de diagonales la traversent :
//
//        (0,0)                     colonnes : c constant, 3 cases
//     (0,1)  (1,0)                 descentes : r constant, 3 cases (vers ↘)
//  (0,2)  (1,1)  (2,0)             montées  : c+r constant, 2 ou 3 cases (vers ↗)
//     (1,2)  (2,1)
//        (2,2)
//
// LA FABRICATION garantit l'UNICITÉ. On tire une grille, on calcule toutes ses
// sommes, puis on retire des indices tant que la solution reste seule — la
// vérification est un dénombrement exact, arrêté dès la deuxième solution
// trouvée. Une hexagrille à deux solutions se « résout » par un coup de chance
// et n'apprend rien.

const N = 3;

/** Les neuf cases, dans l'ordre de lecture (colonne, rangée). */
export const CASES = (() => {
    const t = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) t.push({ c, r, i: r * N + c });
    return t;
})();

const idx = (c, r) => r * N + c;

/**
 * Les files sur lesquelles une flèche peut porter.
 *
 * Les montées de longueur 1 sont écartées : une flèche qui désigne une seule
 * case ne demande rien, elle donne la réponse.
 */
export const FILES = (() => {
    const files = [];
    for (let c = 0; c < N; c++) {
        files.push({ id: `col${c}`, sens: 'bas', cases: [0, 1, 2].map(r => idx(c, r)) });
    }
    for (let r = 0; r < N; r++) {
        files.push({ id: `des${r}`, sens: 'bas-droite', cases: [0, 1, 2].map(c => idx(c, r)) });
    }
    for (let k = 1; k <= 2 * (N - 1) - 1; k++) {
        const cases = [];
        for (let c = 0; c < N; c++) {
            const r = k - c;
            if (r >= 0 && r < N) cases.push(idx(c, r));
        }
        if (cases.length >= 2) files.push({ id: `mon${k}`, sens: 'haut-droite', cases });
    }
    return files;
})();

/** La somme de chaque file, pour une grille complète. */
export function sommesDe(grille) {
    const s = {};
    FILES.forEach(f => { s[f.id] = f.cases.reduce((t, i) => t + grille[i], 0); });
    return s;
}

/**
 * Combien de grilles satisfont ces contraintes ? On s'arrête à `max`.
 *
 * Le parcours place les cases dans l'ordre où les files se referment : dès
 * qu'une file est complète, on compare sa somme et l'on coupe. Sur les files
 * incomplètes, on coupe aussi par encadrement — ce qui reste à placer ne peut
 * ni dépasser la somme visée, ni rester trop loin en dessous.
 */
export function compterSolutions(donnees, sommes, max = 2) {
    const grille = donnees.slice();
    const libres = [];
    const utilises = new Set(grille.filter(v => v));
    for (let i = 0; i < N * N; i++) if (!grille[i]) libres.push(i);
    const restants = [];
    for (let v = 1; v <= N * N; v++) if (!utilises.has(v)) restants.push(v);
    if (libres.length !== restants.length) return 0;

    // On remplit d'abord les cases les plus contraintes — celles que le plus
    // de files traversent : leurs erreurs se voient au premier coup, et
    // l'arbre de recherche se referme presque aussitôt.
    const visees = FILES.filter(f => sommes[f.id] !== undefined);
    const contraintes = (i) => visees.filter(f => f.cases.includes(i)).length;
    const ordre = libres.slice().sort((a, b) => contraintes(b) - contraintes(a));

    let trouvees = 0;
    const dispo = new Set(restants);

    const ok = () => {
        for (const f of visees) {
            const manquantes = f.cases.filter(i => !grille[i]);
            const partiel = f.cases.reduce((t, i) => t + (grille[i] || 0), 0);
            if (!manquantes.length) { if (partiel !== sommes[f.id]) return false; continue; }
            // Encadrement grossier mais suffisant : les valeurs restantes sont
            // au moins 1 chacune et au plus la plus grande disponible.
            const libresTriees = [...dispo].sort((a, b) => a - b);
            const mini = libresTriees.slice(0, manquantes.length).reduce((t, v) => t + v, 0);
            const maxi = libresTriees.slice(-manquantes.length).reduce((t, v) => t + v, 0);
            if (partiel + mini > sommes[f.id]) return false;
            if (partiel + maxi < sommes[f.id]) return false;
        }
        return true;
    };

    const poser = (rang) => {
        if (trouvees >= max) return;
        if (rang === ordre.length) { trouvees++; return; }
        const cible = ordre[rang];
        for (const v of [...dispo]) {
            grille[cible] = v; dispo.delete(v);
            if (ok()) poser(rang + 1);
            dispo.add(v); grille[cible] = 0;
            if (trouvees >= max) return;
        }
    };

    poser(0);
    return trouvees;
}

/** Une grille complète tirée au hasard : une permutation de 1 à 9. */
export function tirerGrille(rng) {
    return rng.shuffle(Array.from({ length: N * N }, (_, i) => i + 1));
}

const NIVEAUX = {
    // `chaine` : la grille doit se dérouler de proche en proche, une file à un
    // seul trou après l'autre. C'est ce qui fait la marche du premier niveau —
    // sans elle, l'élève tombe d'emblée sur un raisonnement croisé (« cette
    // file de deux cases fait 3, donc c'est 1 et 2, mais dans quel ordre ? »)
    // qui est le bon exercice, mais pas le premier jour.
    facile: { revelees: 3, garderFleches: 7, chaine: true },
    moyen: { revelees: 1, garderFleches: 5, chaine: false },
    difficile: { revelees: 0, garderFleches: 4, chaine: false }
};

/** La grille se remplit-elle par soustractions successives, sans croiser ? */
function seDerouleEnChaine(donnees, fleches) {
    const saisie = donnees.slice();
    const faux = { fleches };
    for (let k = 0; k < N * N; k++) {
        const coup = prochainCoup(saisie, faux);
        if (!coup) break;
        saisie[coup.case] = coup.valeur;
    }
    return saisie.every(v => v);
}

/**
 * Une hexagrille jouable : sa solution, les cases déjà écrites, et les flèches
 * conservées — les moins possible, mais assez pour que la grille se déduise.
 *
 * @param {Object} rng
 * @param {{niveau?: 'facile'|'moyen'|'difficile'}} [opts]
 */
export function genererHexagrille(rng, opts = {}) {
    const niveau = NIVEAUX[opts.niveau] ? opts.niveau : 'moyen';
    const reglage = NIVEAUX[niveau];

    for (let essai = 0; essai < 40; essai++) {
        const solution = tirerGrille(rng);
        const toutes = sommesDe(solution);

        // Les cases révélées d'emblée : elles donnent un point d'appui, et sur
        // les premiers niveaux c'est ce qui évite le découragement.
        const revelees = rng.shuffle(CASES.map(c => c.i)).slice(0, reglage.revelees);
        const donnees = new Array(N * N).fill(0);
        revelees.forEach(i => { donnees[i] = solution[i]; });

        // On part de TOUTES les flèches — la grille est alors sûrement unique —
        // puis on en retire tant qu'elle le reste. L'ordre de retrait est tiré
        // au sort : deux hexagrilles de même solution n'auront pas les mêmes
        // flèches, et donc pas le même chemin de déduction.
        const gardees = {};
        FILES.forEach(f => { gardees[f.id] = toutes[f.id]; });
        if (compterSolutions(donnees, gardees, 2) !== 1) continue;

        const flechesDe = (g) => FILES.filter(f => g[f.id] !== undefined)
            .map(f => ({ ...f, somme: g[f.id] }));
        const acceptable = (g) => compterSolutions(donnees, g, 2) === 1
            && (!reglage.chaine || seDerouleEnChaine(donnees, flechesDe(g)));

        if (!acceptable(gardees)) continue;
        for (const f of rng.shuffle(FILES.slice())) {
            if (Object.keys(gardees).length <= reglage.garderFleches) break;
            const memoire = gardees[f.id];
            delete gardees[f.id];
            if (!acceptable(gardees)) gardees[f.id] = memoire;
        }

        return { solution, donnees, fleches: flechesDe(gardees), niveau };
    }

    // Filet de sécurité : une grille avec toutes ses flèches est toujours
    // unique, et vaut mieux qu'un plateau vide.
    const solution = tirerGrille(rng);
    const toutes = sommesDe(solution);
    return {
        solution,
        donnees: new Array(N * N).fill(0),
        fleches: FILES.map(f => ({ ...f, somme: toutes[f.id] })),
        niveau
    };
}

/** Les files dont la somme est déjà atteinte, pour l'affichage « c'est bon ». */
export function filesJustes(saisie, fleches) {
    return fleches.filter(f =>
        f.cases.every(i => saisie[i]) && f.cases.reduce((t, i) => t + saisie[i], 0) === f.somme
    ).map(f => f.id);
}

/** La grille est-elle résolue ? Chiffres tous placés, toutes les sommes bonnes. */
export function estResolue(saisie, puzzle) {
    const vus = new Set(saisie.filter(v => v));
    if (vus.size !== N * N) return false;
    return puzzle.fleches.every(f => f.cases.reduce((t, i) => t + saisie[i], 0) === f.somme);
}

/**
 * LE COUP SUIVANT, celui qu'on peut vraiment justifier : une file où il ne
 * manque qu'une case. C'est ce que « Aide-moi » montre — pas la réponse, la
 * MÉTHODE, c'est-à-dire l'endroit où regarder.
 */
export function prochainCoup(saisie, puzzle) {
    for (const f of puzzle.fleches) {
        const vides = f.cases.filter(i => !saisie[i]);
        if (vides.length !== 1) continue;
        const connu = f.cases.reduce((t, i) => t + (saisie[i] || 0), 0);
        const valeur = f.somme - connu;
        if (valeur >= 1 && valeur <= N * N) return { case: vides[0], valeur, file: f };
    }
    return null;
}
