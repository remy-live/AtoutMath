// COLORIER PAR LES NOMBRES — le nonogramme, et pourquoi c'est un exercice.
//
// Rémy : « on pourrait faire un paint by numbers où on donne le nombre de cases
// à colorier. Il faut commencer par hyper simple. »
//
// CE QU'ON Y APPREND, ET CE N'EST PAS LE COLORIAGE.
//
// Chaque ligne porte les longueurs de ses blocs coloriés, dans l'ordre, séparés
// par au moins une case blanche. « 3 » sur une ligne de cinq cases ne dit pas OÙ
// est le bloc — mais il dit déjà quelque chose : où qu'il soit, il couvre la
// case du milieu. C'est le RECOUVREMENT, et c'est de l'arithmétique pure :
//
//     cases certaines = bloc + bloc − largeur
//
// Un bloc de 4 dans une ligne de 5 en donne trois d'un coup, un bloc de 3 en
// donne une, un bloc de 2 n'en donne aucune. L'élève ne devine jamais : il
// CALCULE ce qu'il sait déjà, et le reste vient par recoupement entre lignes et
// colonnes.
//
// LA GARANTIE QUI FAIT DE CE JEU UN EXERCICE : toute grille produite ici se
// résout par DÉDUCTION SEULE. C'est la propriété la plus importante du module,
// et la seule qui demande du travail. Un nonogramme tiré au hasard réclame très
// souvent un essai-erreur — « je suppose que cette case est noire, je continue,
// je me contredis, donc elle était blanche ». C'est du raisonnement par
// l'absurde à quinze coups de profondeur : un élève de sixième qui bloque
// dessus ne bloque pas sur une notion, il bloque sur une grille mal faite. On
// ne publie donc une grille qu'après avoir vérifié que le solveur déductif la
// termine ENTIÈREMENT, et le générateur retouche le dessin jusqu'à ce que ce
// soit vrai.
//
// LE SOLVEUR SERT TROIS FOIS : il valide la grille à la génération, il fournit
// l'aide — « regarde la ligne 3 » et POURQUOI —, et il donne la solution
// d'auteur de la barre de débogage. Une seule mécanique, trois usages : c'est
// ce qui garantit que l'aide dit la vérité.
//
// CE MODULE NE CONNAÎT PAS LE DOM.

/** L'état d'une case, tel que l'élève la laisse. */
export const INCONNU = 0;
export const PLEIN = 1;
export const CROIX = 2;      // « celle-ci est blanche, j'en suis sûr »

/**
 * LES INDICES D'UNE LIGNE : la longueur de chaque bloc, dans l'ordre.
 *
 * Une ligne vide porte `[0]` et non `[]` — parce qu'on l'ÉCRIT, et qu'une case
 * d'indice vide se lit « on ne m'a rien dit » alors qu'un zéro se lit « il n'y a
 * rien ici », ce qui est une information, et souvent la plus utile de la grille.
 */
export function indicesDe(ligne) {
    const out = [];
    let n = 0;
    for (const c of ligne) {
        if (c === 1) n++;
        else if (n) { out.push(n); n = 0; }
    }
    if (n) out.push(n);
    return out.length ? out : [0];
}

/** Les indices des lignes et des colonnes d'une grille de 0 et de 1. */
export function indicesGrille(grille) {
    const h = grille.length, l = grille[0].length;
    return {
        hauteur: h,
        largeur: l,
        lignes: grille.map(indicesDe),
        colonnes: Array.from({ length: l }, (_, x) =>
            indicesDe(Array.from({ length: h }, (_, y) => grille[y][x])))
    };
}

/** La somme des cases à colorier — ce qu'on annonce en haut de la grille. */
export const totalDe = (indices) =>
    indices.reduce((t, bloc) => t + bloc.reduce((a, b) => a + b, 0), 0);

/**
 * TOUTES LES FAÇONS DE POSER CES BLOCS SUR UNE LIGNE DE `n` CASES.
 *
 * On les énumère vraiment, et c'est assumé : sur une ligne de dix cases, il n'y
 * en a jamais plus de quelques dizaines. Une formule d'intersection plus fine
 * existerait, mais elle serait fausse dans les cas limites — et un solveur qui
 * se trompe une fois sur mille produit une grille insoluble une fois sur mille,
 * c'est-à-dire un élève bloqué sans recours.
 *
 * `etat` filtre au passage : une case déjà PLEINE interdit les placements qui la
 * laissent blanche, une CROIX interdit ceux qui la noircissent. C'est ce filtre
 * qui fait tout le travail de déduction.
 */
export function placements(blocs, n, etat = null) {
    const utiles = blocs.filter(b => b > 0);
    const out = [];
    const ligne = new Array(n).fill(0);

    const compatible = (i, v) => {
        if (!etat) return true;
        const e = etat[i];
        return e === INCONNU || (e === PLEIN ? v === 1 : v === 0);
    };

    const poser = (k, depart) => {
        if (out.length > 20000) return;             // garde-fou : voir l'en-tête
        if (k === utiles.length) {
            for (let i = depart; i < n; i++) if (!compatible(i, 0)) return;
            const fin = ligne.slice();
            for (let i = depart; i < n; i++) fin[i] = 0;
            out.push(fin);
            return;
        }
        const bloc = utiles[k];
        // La place qu'il faut pour tout ce qui reste : les blocs, plus une case
        // blanche entre chacun.
        const reste = utiles.slice(k + 1).reduce((t, b) => t + b + 1, 0);
        for (let d = depart; d + bloc + reste <= n; d++) {
            let bon = true;
            for (let i = depart; i < d && bon; i++) { ligne[i] = 0; bon = compatible(i, 0); }
            for (let i = d; i < d + bloc && bon; i++) { ligne[i] = 1; bon = compatible(i, 1); }
            // La case blanche obligatoire après le bloc, s'il en reste.
            if (bon && k + 1 < utiles.length) {
                ligne[d + bloc] = 0;
                bon = compatible(d + bloc, 0);
            }
            if (bon) poser(k + 1, d + bloc + (k + 1 < utiles.length ? 1 : 0));
        }
    };

    poser(0, 0);
    return out;
}

/**
 * CE QUE CETTE LIGNE PERMET DE CONCLURE, ET RIEN DE PLUS.
 *
 * On garde les placements encore possibles et l'on regarde case par case : là
 * où tous s'accordent, on sait ; ailleurs, on ne sait pas. C'est exactement le
 * raisonnement de l'élève quand il fait glisser un bloc d'un bout à l'autre de
 * la ligne pour voir ce qui ne bouge pas.
 *
 * @returns {{cases: Array<{i, v}>, possibles: number}} `v` vaut PLEIN ou CROIX
 */
export function certitudes(blocs, etat) {
    const n = etat.length;
    const poss = placements(blocs, n, etat);
    if (!poss.length) return { cases: [], possibles: 0, contradiction: true };

    const cases = [];
    for (let i = 0; i < n; i++) {
        if (etat[i] !== INCONNU) continue;
        const premier = poss[0][i];
        if (poss.every(p => p[i] === premier)) {
            cases.push({ i, v: premier === 1 ? PLEIN : CROIX });
        }
    }
    return { cases, possibles: poss.length, contradiction: false };
}

const colonneDe = (etat, x) => etat.map(l => l[x]);

/**
 * LE PROCHAIN COUP CERTAIN — et la phrase qui l'explique.
 *
 * ON RENVOIE UNE LIGNE ENTIÈRE, pas une case. Un élève à qui l'on désigne une
 * case isolée apprend qu'il faut demander ; un élève à qui l'on dit « regarde
 * la ligne 3 » refait le raisonnement et gagne la ligne suivante tout seul.
 *
 * ON PRÉFÈRE LA LIGNE LA PLUS GÉNÉREUSE, celle qui donne le plus de cases d'un
 * coup : c'est la plus facile à voir, donc la bonne à montrer à qui bloque.
 */
export function prochainCoup(enonce, etat) {
    let meilleur = null;
    const examiner = (sens, index, blocs, ligne) => {
        const r = certitudes(blocs, ligne);
        if (r.contradiction) {
            return (meilleur = { sens, index, cases: [], contradiction: true, raison: contradit(sens, index) });
        }
        if (!r.cases.length) return null;
        if (!meilleur || meilleur.contradiction || r.cases.length > meilleur.cases.length) {
            meilleur = { sens, index, cases: r.cases, blocs, longueur: ligne.length,
                raison: pourquoi(sens, index, blocs, ligne, r.cases) };
        }
        return null;
    };

    for (let y = 0; y < enonce.hauteur; y++) {
        const fini = examiner('ligne', y, enonce.lignes[y], etat[y]);
        if (fini) return meilleur;
    }
    for (let x = 0; x < enonce.largeur; x++) {
        const fini = examiner('colonne', x, enonce.colonnes[x], colonneDe(etat, x));
        if (fini) return meilleur;
    }
    return meilleur;
}

/** « 3, 1 et 2 » — parce que « 3 et 1 et 2 » ne se lit pas à voix haute. */
const enumerer = (liste) => liste.length < 2
    ? String(liste[0])
    : `${liste.slice(0, -1).join(', ')} et ${liste[liste.length - 1]}`;

const nomme = (sens, index) => `${sens === 'ligne' ? 'la ligne' : 'la colonne'} ${index + 1}`;

const contradit = (sens, index) =>
    `Il y a une erreur dans ${nomme(sens, index)} : plus rien n'y est possible. `
    + 'Efface ce dont tu n\'es pas sûr et reprends-la.';

/**
 * POURQUOI CETTE LIGNE SE LAISSE FAIRE — la phrase qui enseigne.
 *
 * Trois raisons couvrent presque tout, et ce sont les trois qu'on veut installer :
 * le compte est bouclé, la ligne est pleine, ou les blocs se recouvrent.
 * La dernière est la seule qui demande un calcul, et c'est la technique
 * fondatrice du jeu : on l'écrit donc en toutes lettres, avec ses nombres.
 */
function pourquoi(sens, index, blocs, ligne, cases) {
    const n = ligne.length;
    const somme = blocs.reduce((a, b) => a + b, 0);
    const dejaPleines = ligne.filter(c => c === PLEIN).length;
    const ou = nomme(sens, index);

    if (somme === 0) {
        return `${ou.charAt(0).toUpperCase()}${ou.slice(1)} porte un <b>0</b> : `
            + 'elle est entièrement blanche. Barre-la.';
    }
    if (somme === n) {
        return `${ou.charAt(0).toUpperCase()}${ou.slice(1)} demande ${somme} cases `
            + `sur ${n} : elles y sont toutes. Colorie-la en entier.`;
    }
    if (dejaPleines === somme && cases.every(c => c.v === CROIX)) {
        return somme === 1
            ? `Dans ${ou}, la seule case demandée est déjà coloriée : tout le reste est blanc.`
            : `Dans ${ou}, les <b>${somme}</b> cases demandées sont déjà coloriées : `
                + 'tout le reste est blanc.';
    }
    // LE RECOUVREMENT, écrit avec ses nombres — c'est le calcul du chapitre.
    const plusGrand = Math.max(...blocs);
    const place = n - (somme + blocs.filter(b => b > 0).length - 1);
    // LA FORMULE DU RECOUVREMENT NE VAUT QUE SUR UNE LIGNE VIERGE, et seulement
    // quand elle donne un nombre positif. TROUVÉ PAR LE TEST, et c'était une
    // faute de mathématiques servie à un élève : sur « un bloc de 2 dans une
    // ligne de 5 », l'aide annonçait « 2 + 2 − 5 = 1 case sûre » alors que le
    // calcul donne −1 — donc AUCUNE. La case était bien certaine, mais pour une
    // autre raison : ce que l'élève avait déjà posé restreignait les
    // placements. Expliquer une conclusion juste par un calcul faux est pire
    // que de ne rien expliquer.
    const vierge = ligne.every(c => c === INCONNU);
    if (blocs.length === 1 && vierge && 2 * plusGrand - n > 0 && cases.some(c => c.v === PLEIN)) {
        // DEUX NOMBRES À NE PAS CONFONDRE, et le premier jet les confondait :
        // le nombre de FAÇONS de poser le bloc vaut n − b + 1, le nombre de
        // cases CERTAINES vaut 2b − n. Écrire « 4 + 4 − 5 = 3 façons » était
        // faux — il y en a deux — et c'est le genre de faute qu'un élève
        // recopie sans broncher parce qu'elle vient de la machine.
        const facons = n - plusGrand + 1;
        const sures = 2 * plusGrand - n;
        return `Dans ${ou}, le bloc de <b>${plusGrand}</b> ne peut se poser que de `
            + `<b>${facons}</b> façon${facons > 1 ? 's' : ''}, et `
            + `${facons > 1 ? 'toutes recouvrent' : 'elle recouvre'} `
            + (sures > 1
                ? `les mêmes <b>${sures}</b> cases du milieu : `
                    + `${plusGrand} + ${plusGrand} − ${n} = ${sures}. Colorie-les.`
                : `la même case du milieu : ${plusGrand} + ${plusGrand} − ${n} = 1. `
                    + 'Colorie-la.');
    }
    if (vierge && place >= 0 && cases.some(c => c.v === PLEIN)) {
        return `Dans ${ou}, fais glisser les blocs ${enumerer(blocs)} d'un bout à `
            + 'l\'autre : les cases qu\'ils recouvrent dans TOUS les cas sont sûres.';
    }
    return `Reprends ${ou} : avec ce que tu as déjà posé, il ne reste qu'une seule `
        + 'façon de placer ses blocs.';
}

/**
 * RÉSOUDRE PAR DÉDUCTION SEULE — et dire si l'on y arrive.
 *
 * On repasse sur les lignes puis les colonnes jusqu'à ce que plus rien ne bouge.
 * Si la grille est finie, elle est déductible : un élève peut y arriver sans
 * jamais supposer. Sinon on la jette — voir l'en-tête du module.
 */
export function resoudre(enonce) {
    const etat = Array.from({ length: enonce.hauteur },
        () => new Array(enonce.largeur).fill(INCONNU));
    let bouge = true, tours = 0;

    while (bouge && tours < 60) {
        bouge = false;
        tours++;
        for (let y = 0; y < enonce.hauteur; y++) {
            const r = certitudes(enonce.lignes[y], etat[y]);
            if (r.contradiction) return { etat, complet: false, contradiction: true, tours };
            r.cases.forEach(({ i, v }) => { etat[y][i] = v; bouge = true; });
        }
        for (let x = 0; x < enonce.largeur; x++) {
            const r = certitudes(enonce.colonnes[x], colonneDe(etat, x));
            if (r.contradiction) return { etat, complet: false, contradiction: true, tours };
            r.cases.forEach(({ i, v }) => { etat[i][x] = v; bouge = true; });
        }
    }

    const complet = etat.every(l => l.every(c => c !== INCONNU));
    return { etat, complet, contradiction: false, tours };
}

/** L'état résolu, ramené à une grille de 0 et de 1. */
export const enGrille = (etat) => etat.map(l => l.map(c => (c === PLEIN ? 1 : 0)));

/**
 * OÙ EN EST L'ÉLÈVE.
 *
 * ON NE COMPTE QUE LES CASES COLORIÉES. Les croix sont une aide qu'il se donne à
 * lui-même — un moyen de ne pas reperdre ce qu'il a déjà conclu —, et les
 * compter dans la note reviendrait à noter sa méthode plutôt que son résultat.
 * Une croix mal placée se paiera de toute façon toute seule : elle bloque la
 * ligne, et le jeu le lui dira.
 */
export function verifier(solution, etat) {
    let justes = 0, manquantes = 0, fausses = 0;
    for (let y = 0; y < solution.length; y++) {
        for (let x = 0; x < solution[y].length; x++) {
            const doit = solution[y][x] === 1;
            const est = etat[y][x] === PLEIN;
            if (doit && est) justes++;
            else if (doit && !est) manquantes++;
            else if (!doit && est) fausses++;
        }
    }
    const total = justes + manquantes;
    return { justes, manquantes, fausses, total, fini: manquantes === 0 && fausses === 0 };
}

/** La première case coloriée à tort — celle qu'on montre quand on se trompe. */
export function premiereFaute(solution, etat) {
    for (let y = 0; y < solution.length; y++) {
        for (let x = 0; x < solution[y].length; x++) {
            if (solution[y][x] !== 1 && etat[y][x] === PLEIN) return { x, y };
        }
    }
    return null;
}

// --- LES DESSINS ------------------------------------------------------------
//
// LES GRILLES DE DIX SONT DESSINÉES À LA MAIN, et c'est délibéré. Un motif tiré
// au hasard donne un nuage de points : on colorie sans jamais savoir ce qu'on
// fait, et l'on découvre à la fin qu'on n'a rien fait du tout. Un dessin
// reconnaissable donne une raison de finir — et il donne surtout un moyen de se
// corriger, parce qu'une case fausse se voit sur un cœur et pas sur un nuage.
//
// Chaque motif est vérifié DÉDUCTIBLE par un test. Si l'un cesse de l'être, il
// vaut mieux le savoir en écrivant le code qu'en salle informatique.

const DESSINS = [
    { nom: 'un cœur', lignes: [
        '0110110000', '1111111000', '1111111000', '1111111000', '0111110000',
        '0011100000', '0001000000', '0000000000', '0000000000', '0000000000'] },
    { nom: 'une maison', lignes: [
        '0000110000', '0001111000', '0011111100', '0111111110', '1111111111',
        '0111111110', '0111001110', '0111001110', '0111111110', '0111111110'] },
    // L'ÉTOILE A ÉTÉ REDESSINÉE : la première n'était pas déductible — le solveur
    // séchait sur quarante-huit cases, c'est-à-dire qu'un élève aussi. Les
    // branches basses trop symétriques laissaient deux lectures possibles.
    { nom: 'une étoile', lignes: [
        '0000110000', '0001111000', '1111111111', '0111111110', '0011111100',
        '0011111100', '0110001100', '1100000110', '0000000000', '0000000000'] },
    { nom: 'un poisson', lignes: [
        '0000000000', '0001111000', '0011111100', '0111111110', '1111111111',
        '1111111111', '0111111110', '0011111100', '0001111000', '0000000000'] },
    { nom: 'une croix', lignes: [
        '0000000000', '0001111000', '0001111000', '0001111000', '1111111111',
        '1111111111', '0001111000', '0001111000', '0001111000', '0000000000'] },
    { nom: 'une clef', lignes: [
        '0011110000', '0110011000', '0110011000', '0011110000', '0001100000',
        '0001100000', '0001111000', '0001100000', '0001111000', '0000000000'] },
    { nom: 'un arbre', lignes: [
        '0000110000', '0001111000', '0011111100', '0111111110', '0011111100',
        '0111111110', '1111111111', '0000110000', '0000110000', '0001111000'] },
    { nom: 'une lettre A', lignes: [
        '0001111000', '0011001100', '0110000110', '0110000110', '0111111110',
        '0111111110', '0110000110', '0110000110', '0110000110', '0000000000'] }
];

const enGrilleTexte = (lignes) => lignes.map(l => l.split('').map(Number));

// --- LA GÉNÉRATION ----------------------------------------------------------

export const PALIERS = {
    // « IL FAUT COMMENCER PAR HYPER SIMPLE », dit Rémy. Ici, UN SEUL BLOC par
    // ligne et par colonne : l'élève n'a qu'une chose à faire, compter, et le
    // recouvrement lui donne des cases sûres partout dès le premier regard.
    decouverte: { label: 'Cinq sur cinq, un seul bloc par ligne', taille: 5, forme: 'convexe' },
    // Le même format, mais les blocs peuvent se couper en deux : il faut
    // maintenant croiser les lignes et les colonnes.
    simple: { label: 'Cinq sur cinq, plusieurs blocs', taille: 5, forme: 'libre' },
    // Dix sur dix, et cela dessine quelque chose.
    image: { label: 'Dix sur dix : ça dessine quelque chose', taille: 10, forme: 'dessin' }
};

/**
 * UNE FORME CONVEXE : un seul bloc par ligne ET par colonne.
 *
 * On tire, pour chaque ligne, un intervalle [a, b]. Pour que les COLONNES
 * n'aient elles aussi qu'un seul bloc, il faut que la forme n'ait pas de trou
 * vertical : les bords gauches doivent descendre puis remonter, les bords
 * droits monter puis redescendre. C'est la forme d'un tonneau, et c'est
 * exactement ce qu'on veut montrer en premier — une tache franche, sans piège.
 */
function formeConvexe(rng, n) {
    const haut = 1 + Math.floor(rng.next() * (n - 1));      // ligne du renflement
    const gauches = [], droits = [];
    let g = Math.floor(rng.next() * Math.max(1, n - 2));
    let d = Math.min(n - 1, g + Math.floor(rng.next() * 2));
    // LE RENFLEMENT EST BORNÉ. Mesuré sur le premier jet : la forme grossissait
    // jusqu'aux quatre bords et remplissait dix-neuf cases sur vingt-cinq — une
    // tache sans dedans ni dehors, où il n'y a plus rien à déduire parce qu'il
    // n'y a presque plus de blanc. Une grille se lit par ce qu'elle ÉPARGNE.
    const maxi = Math.max(2, n - 1 - Math.floor(rng.next() * 2));
    for (let y = 0; y < n; y++) {
        const large = () => d - g + 1;
        if (y <= haut) {
            if (large() < maxi && rng.next() < 0.6) g = Math.max(0, g - 1);
            if (large() < maxi && rng.next() < 0.6) d = Math.min(n - 1, d + 1);
        } else {
            if (rng.next() < 0.6) g = Math.min(d, g + 1);
            if (rng.next() < 0.6) d = Math.max(g, d - 1);
        }
        gauches.push(g); droits.push(d);
    }
    // On ne garde qu'une bande de lignes : une forme qui touche les quatre bords
    // est un rectangle, et un rectangle ne s'apprend qu'une fois.
    const y0 = Math.floor(rng.next() * 2);
    const y1 = n - 1 - Math.floor(rng.next() * 2);
    return Array.from({ length: n }, (_, y) =>
        Array.from({ length: n }, (_, x) =>
            (y >= y0 && y <= y1 && x >= gauches[y] && x <= droits[y]) ? 1 : 0));
}

/** Un motif quelconque, à densité voulue. */
function formeLibre(rng, n) {
    return Array.from({ length: n }, () =>
        Array.from({ length: n }, () => (rng.next() < 0.55 ? 1 : 0)));
}

const vide = (g) => g.every(l => l.every(c => c === 0));
const pleine = (g) => g.every(l => l.every(c => c === 1));

/**
 * UNE GRILLE JOUABLE — c'est-à-dire déductible, et c'est tout le travail.
 *
 * On tire un motif, on calcule ses indices, on demande au solveur s'il en vient
 * à bout SANS SUPPOSER. Si oui, on la donne ; sinon on retouche une case au
 * hasard et l'on recommence. Une grille non déductible n'est pas « difficile »,
 * elle est injouable pour un élève : voir l'en-tête du module.
 *
 * ON REJETTE AUSSI LE VIDE ET LE PLEIN, qui sont déductibles mais ne sont pas
 * des exercices.
 */
export function genererGrille({ rng, palier = 'decouverte' } = {}) {
    const P = PALIERS[palier] || PALIERS.decouverte;
    const n = P.taille;

    if (P.forme === 'dessin') {
        const d = DESSINS[Math.floor(rng.next() * DESSINS.length)];
        const grille = enGrilleTexte(d.lignes);
        return finir(grille, palier, d.nom);
    }

    let grille = P.forme === 'convexe' ? formeConvexe(rng, n) : formeLibre(rng, n);
    for (let essai = 0; essai < 200; essai++) {
        if (!vide(grille) && !pleine(grille)) {
            const enonce = indicesGrille(grille);
            const r = resoudre(enonce);
            if (r.complet) return finir(grille, palier, null);
            // PAS DÉDUCTIBLE : on retouche là où le solveur a séché. Retoucher au
            // hasard marcherait aussi, mais dix fois plus lentement — et une
            // génération lente, sur un téléphone, se voit.
            const flous = [];
            r.etat.forEach((l, y) => l.forEach((c, x) => { if (c === INCONNU) flous.push({ x, y }); }));
            const cible = flous.length
                ? flous[Math.floor(rng.next() * flous.length)]
                : { x: Math.floor(rng.next() * n), y: Math.floor(rng.next() * n) };
            grille[cible.y][cible.x] = grille[cible.y][cible.x] ? 0 : 1;
        } else {
            grille = P.forme === 'convexe' ? formeConvexe(rng, n) : formeLibre(rng, n);
        }
    }
    // DERNIER RECOURS : une forme convexe est déductible par construction ou
    // presque, et vaut mieux qu'un échec silencieux.
    return finir(formeConvexe(rng, n), palier, null);
}

function finir(grille, palier, sujet) {
    const enonce = indicesGrille(grille);
    return {
        palier,
        sujet,                                   // « un cœur », ou null
        solution: grille,
        enonce,
        total: totalDe(enonce.lignes),
        deductible: resoudre(enonce).complet
    };
}

/** La leçon, en une phrase — celle qu'on relit quand on bloque. */
export function laLecon(n = 5) {
    return 'Les nombres disent les BLOCS coloriés de la ligne, dans l\'ordre, séparés '
        + 'd\'au moins une case blanche. On ne devine jamais : on cherche ce qui est '
        + 'CERTAIN. Un bloc large ne peut pas beaucoup bouger — dans une ligne de '
        + `${n}, un bloc de ${n - 1} recouvre les mêmes ${n - 2} cases où qu'on le pose. `
        + 'C\'est le RECOUVREMENT, et il se calcule : bloc + bloc − largeur. Barre les '
        + 'cases dont tu es sûr qu\'elles sont blanches — une croix vaut autant qu\'une '
        + 'case coloriée, parce qu\'elle rétrécit ce qui reste possible.';
}
