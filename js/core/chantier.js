// LE CHANTIER DES BLOCS — la règle du jeu, sans une ligne de DOM.
//
// Une grille, des blocs portant un produit (7 × 8), des dalles portant un
// résultat (56). On pousse un bloc : il GLISSE jusqu'à rencontrer un obstacle.
// S'il s'arrête sur la dalle qui porte son résultat, il se scelle — et devient
// lui-même un obstacle.
//
// Cette dernière phrase est tout le jeu. Sceller un bloc, ce n'est pas juste
// marquer un point : c'est POSER UN MUR. L'ordre dans lequel on résout les
// blocs décide donc de ce qu'on peut encore atteindre ensuite, et un niveau
// peut se rendre insoluble sans qu'aucun coup n'ait été « faux ».
//
// La partie mathématique tient dans une ambiguïté volontaire : une dalle 16
// accepte 4 × 4 comme 2 × 8. Savoir que les deux valent 16 ne suffit pas — il
// faut décider LEQUEL va là, parce que l'autre a besoin de cette dalle-là pour
// s'arrêter au bon endroit. Le calcul ouvre le choix ; la géométrie le tranche.

export const VIDE = 0;
export const MUR = 1;

const DIRS = {
    haut: { dx: 0, dy: -1 }, bas: { dx: 0, dy: 1 },
    gauche: { dx: -1, dy: 0 }, droite: { dx: 1, dy: 0 }
};
export const DIRECTIONS = Object.keys(DIRS);

/**
 * Un niveau se décrit en texte, une ligne par rangée :
 *   '.' case vide      '#' mur
 *   'A'…'Z' un bloc    'a'…'z' la dalle du bloc de même lettre
 * Les produits sont donnés à part, par lettre : { A: [7, 8], B: [4, 4] }.
 * Écrire un niveau reste ainsi une affaire de dessin, pas de coordonnées.
 */
export function lireNiveau(def) {
    const lignes = def.plan.trim().split('\n').map(l => l.trim());
    const rows = lignes.length, cols = Math.max(...lignes.map(l => l.length));
    const grille = [];
    const blocs = [];
    const dalles = [];

    for (let y = 0; y < rows; y++) {
        const ligne = [];
        for (let x = 0; x < cols; x++) {
            const c = lignes[y][x] || '.';
            ligne.push(c === '#' ? MUR : VIDE);
            if (c >= 'A' && c <= 'Z') {
                const [a, b] = def.produits[c];
                blocs.push({ id: c, x, y, a, b, produit: a * b, dur: false });
            } else if (c >= 'a' && c <= 'z') {
                const lettre = c.toUpperCase();
                const [a, b] = def.produits[lettre];
                dalles.push({ id: c, x, y, valeur: a * b });
            }
        }
        grille.push(ligne);
    }
    return {
        id: def.id, titre: def.titre, indice: def.indice || '',
        cols, rows, grille,
        blocs: blocs.sort((p, q) => p.id.localeCompare(q.id)),
        dalles,
        coups: 0
    };
}

export function cloner(e) {
    return {
        ...e,
        grille: e.grille.map(l => l.slice()),
        blocs: e.blocs.map(b => ({ ...b })),
        dalles: e.dalles.map(d => ({ ...d }))
    };
}

export function blocEn(e, x, y) {
    return e.blocs.find(b => b.x === x && b.y === y) || null;
}

export function dalleEn(e, x, y) {
    return e.dalles.find(d => d.x === x && d.y === y) || null;
}

/** Une case arrête-t-elle un bloc qui glisse ? */
function bloque(e, x, y) {
    if (x < 0 || y < 0 || x >= e.cols || y >= e.rows) return true;
    if (e.grille[y][x] === MUR) return true;
    return !!blocEn(e, x, y);
}

/**
 * Où s'arrêterait ce bloc, poussé dans cette direction ? Renvoie `null` si le
 * bloc ne peut pas bouger du tout — un coup qui ne déplace rien n'est pas un
 * coup, et l'interface doit pouvoir le refuser AVANT de l'afficher.
 */
export function simuler(e, id, dir) {
    const b = e.blocs.find(x => x.id === id);
    if (!b || b.dur || !DIRS[dir]) return null;
    const { dx, dy } = DIRS[dir];
    let x = b.x, y = b.y;
    while (!bloque(e, x + dx, y + dy)) { x += dx; y += dy; }
    if (x === b.x && y === b.y) return null;
    const dalle = dalleEn(e, x, y);
    return { x, y, scelle: !!dalle && dalle.valeur === b.produit, dalle };
}

/**
 * Pousse un bloc. Mute l'état et renvoie le compte rendu du coup.
 * @returns {{bouge:boolean, scelle:boolean, dalle:?Object, x:number, y:number}}
 */
export function pousser(e, id, dir) {
    const r = simuler(e, id, dir);
    if (!r) return { bouge: false, scelle: false, dalle: null };
    const b = e.blocs.find(x => x.id === id);
    b.x = r.x; b.y = r.y;
    if (r.scelle) b.dur = true;
    e.coups++;
    return { bouge: true, scelle: r.scelle, dalle: r.dalle, x: r.x, y: r.y, bloc: b };
}

/** Gagné quand chaque dalle porte un bloc scellé. */
export function gagne(e) {
    return e.dalles.every(d => {
        const b = blocEn(e, d.x, d.y);
        return b && b.dur;
    });
}

/**
 * PERDU SANS AVOIR PERDU : plus aucune suite de coups ne mène à la victoire.
 * C'est la situation propre à ce jeu — on ne meurt pas, on s'enferme — et il
 * faut la DIRE, sinon l'élève continue de pousser dans une position morte en
 * croyant qu'il n'a pas encore trouvé.
 */
export function bloqueDefinitivement(e) {
    const { chemin, complet } = explorer(e, 60000);
    // Sans exploration COMPLÈTE, on se tait. Un solveur qui abandonne au
    // plafond ne prouve rien, et annoncer « c'est perdu » à un élève dont la
    // position tenait encore serait la pire erreur que ce jeu puisse faire.
    return complet && !chemin;
}

// --- Le solveur --------------------------------------------------------------
//
// Il sert deux fois : à garantir qu'un niveau livré EST soluble (les tests le
// vérifient sur chacun), et à détecter en cours de partie qu'on s'est enfermé.
// Un parcours en largeur suffit : les niveaux comptent au plus quatre blocs sur
// une grille de dix, l'espace d'états reste minuscule.

function empreinte(e) {
    return e.blocs.map(b => `${b.id}${b.x},${b.y}${b.dur ? '!' : ''}`).join('|');
}

/**
 * Parcours en largeur. `complet` dit si l'espace d'états a été épuisé — sans
 * quoi l'absence de solution ne veut rien dire.
 * @returns {{chemin: ?Array<{id:string, dir:string}>, complet: boolean, explores: number}}
 */
export function explorer(e, plafond = 200000) {
    if (gagne(e)) return { chemin: [], complet: true, explores: 0 };
    const depart = cloner(e);
    const vus = new Set([empreinte(depart)]);
    const file = [{ etat: depart, chemin: [] }];
    let explores = 0;

    while (file.length && explores < plafond) {
        const { etat, chemin } = file.shift();
        explores++;
        for (const b of etat.blocs) {
            if (b.dur) continue;
            for (const dir of DIRECTIONS) {
                if (!simuler(etat, b.id, dir)) continue;
                const suite = cloner(etat);
                pousser(suite, b.id, dir);
                const cle = empreinte(suite);
                if (vus.has(cle)) continue;
                vus.add(cle);
                const route = [...chemin, { id: b.id, dir }];
                if (gagne(suite)) return { chemin: route, complet: true, explores };
                file.push({ etat: suite, chemin: route });
            }
        }
    }
    return { chemin: null, complet: file.length === 0, explores };
}

/**
 * @returns {?Array<{id:string, dir:string}>} le plus court chemin, ou null.
 */
export function resoudre(e, plafond = 200000) {
    return explorer(e, plafond).chemin;
}

// --- Les niveaux -------------------------------------------------------------
//
// Ils vont du geste seul à la vraie énigme. Chacun n'introduit QU'UNE idée :
// glisser, se servir d'un mur, se servir d'un bloc scellé comme mur, puis
// choisir entre deux blocs qui donnent le même résultat.

export const NIVEAUX = [
    {
        id: 'ch1', titre: 'Le premier bloc',
        coups: 1,
        produits: { A: [7, 8] },
        indice: 'Pousse le bloc vers la dalle : il glisse tout seul jusqu\'au bout du couloir.',
        plan: `
            ########
            #.A...a#
            ########`
    },
    {
        id: 'ch2', titre: 'Glisser jusqu\'au coin',
        coups: 2,
        produits: { A: [6, 9] },
        indice: 'Un bloc ne s\'arrête que contre un mur. Ici il ne peut donc s\'immobiliser que dans les coins.',
        plan: `
            ########
            #A.....#
            #.####.#
            #.####.#
            #.....a#
            ########`
    },
    {
        id: 'ch26', titre: 'Vingt-quatre des deux côtés',
        coups: 2,
        produits: { A: [4, 6], B: [3, 8] },
        indice: '4 × 6 et 3 × 8 font 24 : chaque bloc accepte les deux dalles. Regarde où chacun PEUT s\'arrêter.',
        plan: `
            ########
            #A...#.#
            #......#
            #..#bB.#
            #a..#..#
            ########`
    },
    {
        id: 'chn1', titre: 'Le couloir',
        coups: 2,
        produits: { A: [7, 7], B: [8, 7] },
        indice: 'Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            ##########
            #.#.#.b..#
            #....AB.a#
            #.......##
            #.......##
            #...##...#
            #..###...#
            ##########`
    },
    {
        id: 'chn2', titre: 'Deux fois 72',
        coups: 2,
        produits: { A: [8, 9], B: [24, 3] },
        indice: '8 × 9 et 24 × 3 font 72 tous les deux : chaque bloc accepte les deux dalles. Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            ##########
            ##..b.#..#
            #a#.A##..#
            #........#
            #B.....#.#
            ##########`
    },
    {
        id: 'chn3', titre: '72 des deux côtés',
        coups: 2,
        produits: { A: [8, 9], B: [24, 3] },
        indice: '8 × 9 et 24 × 3 font 72 tous les deux : chaque bloc accepte les deux dalles. Peu de murs pour s\'arrêter : ce sont les blocs scellés qui feront les murs manquants.',
        plan: `
            #######
            #b.a.A#
            #..B..#
            #.....#
            #.....#
            #.....#
            #..##.#
            #######`
    },
    {
        id: 'chn4', titre: 'Le coin',
        coups: 2,
        produits: { A: [7, 8], B: [6, 8] },
        indice: 'Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #######
            #..##b#
            #....B#
            #A.#..#
            #a....#
            #######`
    },
    {
        id: 'ch3', titre: 'Chacun sa dalle',
        coups: 3,
        produits: { A: [7, 8], B: [6, 4] },
        indice: 'Une dalle qui ne porte pas ton résultat ne te retient pas : le bloc s\'y pose sans se sceller. Calcule avant de pousser.',
        plan: `
            ##########
            ##.......#
            #b..A...a#
            #........#
            #........#
            #.......B#
            ##########`
    },
    {
        id: 'ch4', titre: 'Le bloc devient un mur',
        coups: 3,
        produits: { A: [9, 9], B: [3, 7] },
        indice: 'Un bloc scellé ne bouge plus : il devient un obstacle. Lequel des deux faut-il donc poser en premier ?',
        plan: `
            #########
            #.......#
            #A.....a#
            #......b#
            #.......#
            #B......#
            #########`
    },
    {
        id: 'ch5', titre: 'Deux façons de faire 16',
        coups: 3,
        produits: { A: [4, 4], B: [2, 8] },
        indice: '4 × 4 et 2 × 8 valent tous les deux 16 : chaque bloc accepte les deux dalles. Ce n\'est plus le calcul qui décide, c\'est le chemin.',
        plan: `
            #########
            #B...#..#
            #......a#
            ####.####
            #.......#
            #.......#
            #A.....b#
            #########`
    },
    {
        id: 'ch27', titre: 'Les deux du fond',
        coups: 3,
        produits: { A: [8, 8], B: [6, 8] },
        indice: 'Les deux dalles sont côte à côte en bas. Celui qui descend le premier prend la place de l\'autre.',
        plan: `
            ########
            ##.....#
            #..B#..#
            #...A..#
            #......#
            #a#b...#
            ########`
    },
    {
        id: 'chn5', titre: 'La cour',
        coups: 3,
        produits: { A: [8, 8], B: [6, 7] },
        indice: 'Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #######
            #bA..a#
            ##....#
            #.B...#
            ##..#.#
            ###..##
            #.....#
            #######`
    },
    {
        id: 'chn6', titre: 'Encore 72',
        coups: 3,
        produits: { A: [9, 8], B: [12, 6] },
        indice: '9 × 8 et 12 × 6 font 72 tous les deux : chaque bloc accepte les deux dalles. Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #######
            ##.a###
            #..B..#
            #.#...#
            ##.#A.#
            #b....#
            #######`
    },
    {
        id: 'chn7', titre: 'L\'impasse',
        coups: 3,
        produits: { A: [9, 8], B: [8, 7] },
        indice: 'Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #######
            #.A...#
            ##...a#
            #.B#..#
            ##....#
            #.b...#
            #######`
    },
    {
        id: 'chn8', titre: 'Deux fois 64',
        coups: 3,
        produits: { A: [8, 8], B: [16, 4] },
        indice: '8 × 8 et 16 × 4 font 64 tous les deux : chaque bloc accepte les deux dalles. Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #######
            ##..b##
            #..B.##
            ##....#
            #...Aa#
            #.#..##
            #######`
    },
    {
        id: 'chn9', titre: 'Deux fois 42',
        coups: 3,
        produits: { A: [6, 7], B: [14, 3] },
        indice: '6 × 7 et 14 × 3 font 42 tous les deux : chaque bloc accepte les deux dalles. Calcule d\'abord, pousse ensuite : le chemin est court.',
        plan: `
            #########
            #.#.....#
            #.A.#...#
            #.#a.B..#
            #.##.b..#
            #########`
    },
    {
        id: 'ch6', titre: 'Trente-six des deux côtés',
        coups: 4,
        produits: { A: [6, 6], B: [4, 9] },
        indice: '6 × 6 et 4 × 9 font 36 : les deux dalles acceptent les deux blocs. Regarde donc où chacun PEUT s\'arrêter.',
        plan: `
            ########
            ##.A...#
            #.a..#.#
            ###..B.#
            #.#b.#.#
            #..#...#
            ########`
    },
    {
        id: 'ch7', titre: 'Les deux couloirs',
        coups: 4,
        produits: { A: [6, 8], B: [9, 9] },
        indice: 'Les deux dalles sont côte à côte, au fond à droite. Celui qui arrive le premier prend la place de l\'autre.',
        plan: `
            #########
            #.......#
            #.......#
            #.#..A..#
            #.#.B...#
            #.#...ba#
            #########`
    },
    {
        id: 'ch28', titre: 'Le passage étroit',
        coups: 4,
        produits: { A: [8, 6], B: [6, 9] },
        indice: 'Peu de place et beaucoup de murs : c\'est ce qui rend le chemin unique.',
        plan: `
            #########
            #.......#
            #..##.#.#
            ###..#..#
            ##..#.b##
            #B.A..a##
            #########`
    },
    {
        id: 'chn10', titre: 'Deux fois 54',
        coups: 4,
        produits: { A: [9, 6], B: [18, 3] },
        indice: '9 × 6 et 18 × 3 font 54 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #######
            #A...b#
            ##....#
            ###...#
            #.B..##
            ##...a#
            #.....#
            #######`
    },
    {
        id: 'chn11', titre: '54 des deux côtés',
        coups: 4,
        produits: { A: [9, 6], B: [18, 3] },
        indice: '9 × 6 et 18 × 3 font 54 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #######
            #..B.##
            #....b#
            #.#a..#
            #.#..A#
            #######`
    },
    {
        id: 'chn12', titre: 'Le carrefour',
        coups: 4,
        produits: { A: [8, 7], B: [7, 6] },
        indice: 'Peu de murs pour s\'arrêter : ce sont les blocs scellés qui feront les murs manquants.',
        plan: `
            ########
            #....a##
            #......#
            #...#B.#
            #......#
            #...Ab.#
            ########`
    },
    {
        id: 'chn13', titre: 'Deux fois 48',
        coups: 4,
        produits: { A: [6, 8], B: [12, 4], C: [8, 6] },
        indice: '6 × 8 et 12 × 4 font 48 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            ########
            ##c...b#
            #..Aa.B#
            ##..#.C#
            #.#.#.##
            #......#
            ########`
    },
    {
        id: 'chn14', titre: '72 en double',
        coups: 4,
        produits: { A: [8, 9], B: [24, 3], C: [4, 8] },
        indice: '8 × 9 et 24 × 3 font 72 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #######
            #.A##a#
            #....B#
            #c.C#.#
            #....b#
            #######`
    },
    {
        id: 'chn15', titre: 'La traverse',
        coups: 4,
        produits: { A: [7, 8], B: [9, 6] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            #.#..A.#
            #...a#.#
            #..#...#
            #.B.b#.#
            #......#
            ########`
    },
    {
        id: 'chn16', titre: 'Le chantier tranquille',
        coups: 4,
        produits: { A: [6, 7], B: [9, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            #.#.#b.#
            #A.a#..#
            ##.#...#
            #......#
            #B.....#
            ########`
    },
    {
        id: 'ch8', titre: 'Le coude',
        coups: 5,
        produits: { A: [7, 6], B: [6, 8] },
        indice: 'Un bloc ne tourne pas : pour changer de direction, il faut d\'abord qu\'il rencontre un mur.',
        plan: `
            ########
            #a.....#
            #.....A#
            #.....##
            #...Bb.#
            ########`
    },
    {
        id: 'ch9', titre: 'Soixante-quatre en double',
        coups: 5,
        produits: { A: [8, 8], B: [16, 4], C: [7, 7] },
        indice: '8 × 8 et 16 × 4 valent 64. Le troisième bloc, lui, n\'a qu\'une seule dalle possible : commence par ce qui est forcé.',
        plan: `
            #######
            #B....#
            #.#...#
            #.....#
            #..A.a#
            #.Cbc.#
            #######`
    },
    {
        id: 'ch29', titre: 'Trois dans un coin',
        coups: 5,
        produits: { A: [9, 8], B: [7, 7], C: [6, 7] },
        indice: 'Trois blocs serrés en haut. Celui qui bouge en premier libère — ou condamne — les autres.',
        plan: `
            #######
            ##aAcb#
            #.B...#
            #C...##
            #....##
            #..#.##
            #######`
    },
    {
        id: 'chn17', titre: 'Les deux allées',
        coups: 5,
        produits: { A: [7, 7], B: [7, 6], C: [4, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #.....#
            #C..Aa#
            #...#.#
            #..B.##
            #b.c.##
            #######`
    },
    {
        id: 'chn18', titre: '64 des deux côtés',
        coups: 5,
        produits: { A: [8, 8], B: [16, 4], C: [7, 7], D: [9, 9] },
        indice: '8 × 8 et 16 × 4 font 64 tous les deux : chaque bloc accepte les deux dalles. Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            ##########
            #.....dD.#
            #........#
            #........#
            #aB..A...#
            ##...bC.c#
            ##########`
    },
    {
        id: 'chn19', titre: 'La ruelle',
        coups: 5,
        produits: { A: [8, 8], B: [6, 9], C: [7, 6] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #########
            #a..#cC.#
            #...A.#.#
            #.....b##
            #...B..##
            #########`
    },
    {
        id: 'chn20', titre: '42 des deux côtés',
        coups: 5,
        produits: { A: [6, 7], B: [14, 3], C: [4, 8] },
        indice: '6 × 7 et 14 × 3 font 42 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            ########
            #C.c.b.#
            #..#...#
            ####.#A#
            ##..B#a#
            ########`
    },
    {
        id: 'chn21', titre: 'Deux fois 56',
        coups: 5,
        produits: { A: [7, 8], B: [14, 4], C: [4, 7] },
        indice: '7 × 8 et 14 × 4 font 56 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #########
            #.#.##..#
            ##.C....#
            #.B.A...#
            #..bac#.#
            #########`
    },
    {
        id: 'chn22', titre: '56 des deux côtés',
        coups: 5,
        produits: { A: [7, 8], B: [14, 4] },
        indice: '7 × 8 et 14 × 4 font 56 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #########
            #.#.#a#B#
            #b.#....#
            #..##...#
            #.A....##
            ##...##.#
            #########`
    },
    {
        id: 'chn23', titre: 'Encore 42',
        coups: 5,
        produits: { A: [6, 7], B: [14, 3] },
        indice: '6 × 7 et 14 × 3 font 42 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #########
            #..b....#
            #...#.#.#
            #.....A.#
            #..B..#.#
            #.a.....#
            #########`
    },
    {
        id: 'chn24', titre: 'Le pâté de maisons',
        coups: 5,
        produits: { A: [8, 6], B: [8, 9], C: [4, 8] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #...#.#
            ##B.a##
            #c.CA.#
            #b#...#
            #######`
    },
    {
        id: 'ch10', titre: 'Le chantier encombré',
        coups: 6,
        produits: { A: [8, 6], B: [8, 7], C: [9, 9] },
        indice: 'Trois blocs dans le même espace. Chacun scellé rétrécit le passage des autres — d\'où l\'ordre.',
        plan: `
            #########
            #..c....#
            #..B#...#
            #A.C....#
            #......a#
            #.#....b#
            #########`
    },
    {
        id: 'ch11', titre: 'Cinquante-six, deux fois',
        coups: 6,
        produits: { A: [7, 8], B: [14, 4], C: [7, 6] },
        indice: '7 × 8 et 14 × 4 font 56. Une des deux dalles est plus difficile à atteindre : réserve-la à celui qui peut y aller.',
        plan: `
            #########
            #.A..Bb.#
            #..#....#
            #..C#...#
            #...ca.##
            #########`
    },
    {
        id: 'ch30', titre: 'Soixante-douze en double, encore',
        coups: 6,
        produits: { A: [9, 8], B: [12, 6], C: [8, 7] },
        indice: '9 × 8 et 12 × 6 font 72. Une des deux dalles est bien plus difficile à atteindre.',
        plan: `
            ########
            #b#...c#
            #a.B..A#
            #......#
            #..C..##
            ########`
    },
    {
        id: 'chn25', titre: 'La place',
        coups: 6,
        produits: { A: [4, 7], B: [9, 8] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #.....#
            #.#..b#
            #.....#
            #aB.#.#
            ###A..#
            #######`
    },
    {
        id: 'chn26', titre: 'Le passage',
        coups: 6,
        produits: { A: [7, 7], B: [8, 7], C: [4, 7], D: [8, 8] },
        indice: 'Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            ########
            #c...#.#
            #d..D#.#
            #C..B#.#
            ##..A..#
            #.#.a.b#
            ########`
    },
    {
        id: 'chn27', titre: 'Le détour',
        coups: 6,
        produits: { A: [4, 9], B: [6, 7], C: [8, 9] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            #.#...B#
            #......#
            ##..C.c#
            #..aAb.#
            ########`
    },
    {
        id: 'chn28', titre: '42 en double',
        coups: 6,
        produits: { A: [6, 7], B: [14, 3] },
        indice: '6 × 7 et 14 × 3 font 42 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #########
            ##.#...A#
            ###...#.#
            #a....###
            #.......#
            #.....bB#
            #########`
    },
    {
        id: 'chn29', titre: '48 des deux côtés',
        coups: 6,
        produits: { A: [8, 6], B: [16, 3], C: [8, 8] },
        indice: '8 × 6 et 16 × 3 font 48 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #######
            ###...#
            ##A...#
            ##.#..#
            #.b..##
            #B#a#.#
            #C.c###
            #######`
    },
    {
        id: 'chn30', titre: 'L\'angle droit',
        coups: 6,
        produits: { A: [9, 7], B: [7, 8] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #########
            #.B....b#
            ##......#
            #..#.#.##
            #..#....#
            #.......#
            #.a#...A#
            #########`
    },
    {
        id: 'chn31', titre: 'La cour intérieure',
        coups: 6,
        produits: { A: [9, 6], B: [8, 9] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            ##....##
            ##.#...#
            #...B#.#
            #A.....#
            #......#
            #.#a#.b#
            ########`
    },
    {
        id: 'chn32', titre: 'Encore 48',
        coups: 6,
        produits: { A: [6, 8], B: [12, 4] },
        indice: '6 × 8 et 12 × 4 font 48 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            ########
            #...a.A#
            #..#B###
            #.....##
            #......#
            #.....b#
            #....#.#
            ########`
    },
    {
        id: 'ch12', titre: 'Le chantier',
        coups: 7,
        produits: { A: [8, 8], B: [4, 16], C: [5, 6] },
        indice: '8 × 8 et 4 × 16 font 64 tous les deux. Un seul des deux peut descendre : l\'autre est retenu par un mur.',
        plan: `
            ##########
            #A.B.#...#
            #.......a#
            ####.#####
            #.......b#
            #........#
            #C......c#
            #........#
            ##########`
    },
    {
        id: 'ch13', titre: 'La longue traversée',
        coups: 7,
        produits: { A: [6, 9], B: [6, 7] },
        indice: 'Les dalles sont au fond, séparées par un mur. Il faut faire le tour, et le tour se prépare.',
        plan: `
            ##########
            #.A......#
            #....#...#
            #.....#.##
            #.......##
            #..B.a#.b#
            #........#
            ##########`
    },
    {
        id: 'ch14', titre: 'Quatre à la fois',
        coups: 7,
        produits: { A: [6, 7], B: [8, 8], C: [7, 9], D: [8, 6] },
        indice: 'Quatre blocs, quatre dalles, et de la place — pour l\'instant. Chaque bloc posé en enlève.',
        plan: `
            #########
            #c.....d#
            #...B...#
            #...C..D#
            #.....a##
            #..Ab...#
            #########`
    },
    {
        id: 'ch31', titre: 'Le labyrinthe',
        coups: 7,
        produits: { A: [9, 6], B: [7, 7], C: [6, 7] },
        indice: 'Des murs partout : chaque bloc n\'a qu\'un ou deux chemins possibles. Cherche-les avant de pousser.',
        plan: `
            #########
            ##....#b#
            #a#A....#
            #..C#...#
            ##......#
            ##.c...B#
            #########`
    },
    {
        id: 'chn33', titre: 'Le petit chantier',
        coups: 7,
        produits: { A: [6, 9], B: [6, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #a..A.#
            ##b.#.#
            #.....#
            ##B.#.#
            #######`
    },
    {
        id: 'chn34', titre: 'La rangée',
        coups: 7,
        produits: { A: [7, 6], B: [6, 8], C: [7, 8], D: [8, 8] },
        indice: 'Quatre blocs : chacun scellé rétrécit le chantier pour les suivants. Peu de murs pour s\'arrêter : ce sont les blocs scellés qui feront les murs manquants.',
        plan: `
            ##########
            #...dC..B#
            #.#.....c#
            #..D.A.#.#
            #........#
            #..#...ab#
            ##########`
    },
    {
        id: 'chn35', titre: 'Le double couloir',
        coups: 7,
        produits: { A: [7, 9], B: [4, 9], C: [4, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #########
            #A.#B...#
            #..aC#..#
            #.#c...b#
            ###.#.#.#
            #########`
    },
    {
        id: 'chn36', titre: '48 en double',
        coups: 7,
        produits: { A: [8, 6], B: [16, 3], C: [6, 6] },
        indice: '8 × 6 et 16 × 3 font 48 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #########
            #......b#
            #B....a.#
            ##.C..#.#
            #.......#
            #.##.#.A#
            #c#.....#
            #########`
    },
    {
        id: 'chn37', titre: 'Le U',
        coups: 7,
        produits: { A: [9, 8], B: [4, 8] },
        indice: 'Peu de murs pour s\'arrêter : ce sont les blocs scellés qui feront les murs manquants.',
        plan: `
            #######
            #.A...#
            #.....#
            #....B#
            #.....#
            #.....#
            ##ba.##
            #######`
    },
    {
        id: 'chn38', titre: 'Deux fois 36',
        coups: 7,
        produits: { A: [6, 6], B: [4, 9], C: [9, 8] },
        indice: '6 × 6 et 4 × 9 font 36 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            ########
            #A..a.##
            ##..#C##
            #.....c#
            #.....b#
            #B.....#
            ########`
    },
    {
        id: 'chn39', titre: 'Le L',
        coups: 7,
        produits: { A: [4, 8], B: [6, 8] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            #a..B###
            #.A..###
            #....b.#
            #..##.##
            ########`
    },
    {
        id: 'chn40', titre: 'Les quatre coins',
        coups: 7,
        produits: { A: [8, 9], B: [9, 9], C: [6, 6] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #.cb..#
            #....a#
            #..B..#
            ##...##
            #A...C#
            #######`
    },
    {
        id: 'ch15', titre: 'L\'ordre décide',
        coups: 8,
        produits: { A: [7, 8], B: [14, 4], C: [6, 7] },
        indice: 'Encore 56 en double. Un des deux blocs n\'atteint SA dalle que si l\'autre lui sert de mur.',
        plan: `
            ##########
            #......c.#
            #.A......#
            #.......##
            ##.###.C.#
            #B......a#
            #..b....##
            ##########`
    },
    {
        id: 'ch32', titre: 'Quatre à l\'étroit',
        coups: 8,
        produits: { A: [9, 8], B: [7, 9], C: [8, 6], D: [8, 7] },
        indice: 'Quatre blocs sur un tout petit chantier. Il n\'y a presque pas de place pour se tromper.',
        plan: `
            #######
            #.DCA##
            #b...a#
            #.#B#.#
            #.dc.##
            #######`
    },
    {
        id: 'chn41', titre: 'Deux fois 72, encore',
        coups: 8,
        produits: { A: [8, 9], B: [24, 3], C: [7, 9] },
        indice: '8 × 9 et 24 × 3 font 72 tous les deux : chaque bloc accepte les deux dalles.',
        plan: `
            #######
            ###a..#
            #cB..A#
            ##b.#.#
            ##....#
            #....C#
            #######`
    },
    {
        id: 'chn42', titre: 'Encore 54',
        coups: 8,
        produits: { A: [9, 6], B: [18, 3], C: [9, 9], D: [6, 7] },
        indice: '9 × 6 et 18 × 3 font 54 tous les deux : chaque bloc accepte les deux dalles. Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            #########
            ##dA....#
            ##c.D...#
            #..#.C..#
            ##.B....#
            #...#...#
            ##.b.#.a#
            #########`
    },
    {
        id: 'chn43', titre: 'Deux fois 42, encore',
        coups: 8,
        produits: { A: [6, 7], B: [14, 3] },
        indice: '6 × 7 et 14 × 3 font 42 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            #######
            #..#..#
            #....a#
            #....##
            #.....#
            #AB.b.#
            #######`
    },
    {
        id: 'chn44', titre: 'La spirale',
        coups: 8,
        produits: { A: [7, 7], B: [8, 6], C: [4, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #...Cc#
            #.#a.##
            #.B..A#
            #.....#
            #.....#
            #b#...#
            #######`
    },
    {
        id: 'chn45', titre: 'Encore 64',
        coups: 8,
        produits: { A: [8, 8], B: [16, 4] },
        indice: '8 × 8 et 16 × 4 font 64 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ########
            #...B#.#
            #......#
            #...#a.#
            ##...A.#
            #b.....#
            ###.#..#
            ########`
    },
    {
        id: 'chn46', titre: 'Deux fois 48, encore',
        coups: 8,
        produits: { A: [6, 8], B: [12, 4] },
        indice: '6 × 8 et 12 × 4 font 48 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            #########
            #....B..#
            #....#.##
            #.##A...#
            #..#b.#.#
            #a...#.##
            #########`
    },
    {
        id: 'chn47', titre: 'Le peigne',
        coups: 8,
        produits: { A: [9, 8], B: [4, 9], C: [7, 9] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #a#c#.#
            #..C..#
            #.....#
            #....##
            ##....#
            #ABb..#
            #######`
    },
    {
        id: 'chn48', titre: 'L\'escalier',
        coups: 8,
        produits: { A: [9, 6], B: [7, 6], C: [9, 8] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #########
            #.#....##
            #.#a....#
            #.....#c#
            #....bC.#
            #..B.#..#
            #...#.A.#
            #########`
    },
    {
        id: 'ch16', titre: 'Le détour obligé',
        coups: 9,
        produits: { A: [6, 8], B: [12, 4], C: [7, 9] },
        indice: '6 × 8 et 12 × 4 font 48. Aucune dalle n\'est en face de son bloc : tout se joue en deux temps.',
        plan: `
            ##########
            #.......##
            ##.C...a##
            #.....##.#
            #.B...A#.#
            #..#.....#
            #..cb..#.#
            ##########`
    },
    {
        id: 'ch17', titre: 'Le grand chantier',
        coups: 9,
        produits: { A: [6, 6], B: [4, 9], C: [7, 7], D: [9, 6] },
        indice: 'Quatre blocs, dont deux qui valent 36. Lis tout le chantier avant de pousser quoi que ce soit.',
        plan: `
            #########
            #bC#cd#.#
            #.B.D...#
            #.......#
            #....A..#
            ##..a##.#
            #########`
    },
    {
        id: 'ch18', titre: 'La cour ouverte',
        coups: 9,
        produits: { A: [6, 7], B: [9, 6], C: [9, 7], D: [7, 7] },
        indice: 'Beaucoup de place, donc peu de murs pour s\'arrêter. Ce sont les blocs scellés qui feront les murs manquants.',
        plan: `
            #########
            #...Dd.C#
            #..A...a#
            #c.....B#
            #..b..#.#
            #########`
    },
    {
        id: 'ch19', titre: 'Soixante-quatre, encore',
        coups: 9,
        produits: { A: [8, 8], B: [16, 4], C: [9, 7], D: [6, 8] },
        indice: '8 × 8 et 16 × 4 : deux blocs pour deux dalles. Regarde d\'abord ce que les deux autres viennent bloquer.',
        plan: `
            ########
            #.BD...#
            #d..A###
            #.b...a#
            #.#c.C.#
            #......#
            #..#...#
            ########`
    },
    {
        id: 'ch20', titre: 'Le fond du couloir',
        coups: 9,
        produits: { A: [6, 8], B: [12, 4], C: [8, 9], D: [8, 7] },
        indice: 'Les quatre dalles sont alignées tout en bas. L\'ordre d\'arrivée décide de qui peut encore descendre.',
        plan: `
            #######
            ##.#.##
            #.#.B.#
            #..#b.#
            #.....#
            #...A.#
            #cDCad#
            #######`
    },
    {
        id: 'ch33', titre: 'La table de 7',
        coups: 9,
        produits: { A: [7, 7], B: [7, 8], C: [7, 6] },
        indice: 'Trois multiples de 7 : 49, 56, 42. Le calcul est simple, le chemin l\'est beaucoup moins.',
        plan: `
            ##########
            #.A......#
            #c..B#b..#
            #C.....#.#
            #a.......#
            ##########`
    },
    {
        id: 'chn49', titre: 'La croix',
        coups: 9,
        produits: { A: [7, 6], B: [4, 8], C: [4, 7] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            ########
            #A.....#
            #.#..#.#
            #..#.cb#
            ##...B##
            #.C....#
            #....a##
            ########`
    },
    {
        id: 'chn50', titre: '64 en double',
        coups: 9,
        produits: { A: [8, 8], B: [16, 4] },
        indice: '8 × 8 et 16 × 4 font 64 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ##########
            #..#..#.##
            ##...#..##
            #....aAB.#
            #b#......#
            ##########`
    },
    {
        id: 'chn51', titre: '72 des deux côtés, encore',
        coups: 9,
        produits: { A: [9, 8], B: [12, 6] },
        indice: '9 × 8 et 12 × 6 font 72 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ##########
            #.....a..#
            ##B......#
            ##.......#
            #.#.....A#
            #...#.#..#
            #.......b#
            ##########`
    },
    {
        id: 'chn52', titre: 'Deux fois 64, encore',
        coups: 9,
        produits: { A: [8, 8], B: [16, 4] },
        indice: '8 × 8 et 16 × 4 font 64 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            #######
            ##.B..#
            #...#.#
            #a..b.#
            #.....#
            ##.A.##
            #######`
    },
    {
        id: 'chn53', titre: 'Le damier',
        coups: 9,
        produits: { A: [9, 9], B: [6, 8] },
        indice: 'Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ########
            #.....b#
            #a.#...#
            ##.B#.##
            #...A###
            ########`
    },
    {
        id: 'chn54', titre: 'La tenaille',
        coups: 9,
        produits: { A: [9, 6], B: [8, 6], C: [8, 9] },
        indice: 'Un bloc ne s\'arrête que contre un mur — ou contre un bloc déjà posé.',
        plan: `
            #######
            #.c.aA#
            ##....#
            #.#...#
            #..#C.#
            #bB...#
            #######`
    },
    {
        id: 'chn55', titre: 'Le goulot',
        coups: 9,
        produits: { A: [8, 9], B: [7, 6] },
        indice: 'Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            #########
            ##...A#.#
            #a......#
            #b......#
            ##.B....#
            #.......#
            #.#.....#
            #########`
    },
    {
        id: 'ch21', titre: 'Deux blocs, dix coups',
        coups: 10,
        produits: { A: [7, 6], B: [8, 6] },
        indice: 'Deux blocs seulement, et pourtant dix poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            #######
            #.#..A#
            #.....#
            #.....#
            #.#a..#
            #.....#
            #.#.Bb#
            #######`
    },
    {
        id: 'ch22', titre: 'Le chantier en étage',
        coups: 10,
        produits: { A: [8, 8], B: [7, 6], C: [9, 6], D: [7, 9] },
        indice: 'Quatre blocs dans un couloir en escalier. Un seul peut passer en premier.',
        plan: `
            #######
            #....c#
            ##a.#.#
            #..B.##
            #.C#.D#
            #.A.###
            #d..b##
            #######`
    },
    {
        id: 'ch34', titre: 'Le grand large',
        coups: 10,
        produits: { A: [7, 7], B: [9, 9], C: [8, 6] },
        indice: 'Beaucoup d\'espace, donc peu de murs pour s\'arrêter : ce sont les blocs scellés qui feront les murs.',
        plan: `
            ##########
            ##...b.Aa#
            #..B....##
            #...C....#
            #..c.....#
            ##########`
    },
    {
        id: 'chn56', titre: 'L\'îlot',
        coups: 10,
        produits: { A: [4, 9], B: [9, 8] },
        indice: 'Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté. 10 poussées : lis tout le chantier avant d\'en pousser une seule.',
        plan: `
            ########
            #.....##
            ###.##.#
            #......#
            #a....A#
            #.#.#b##
            #..B.#.#
            ########`
    },
    {
        id: 'chn57', titre: 'Encore 72, encore',
        coups: 10,
        produits: { A: [9, 8], B: [12, 6], C: [8, 6], D: [9, 8] },
        indice: '9 × 8 et 12 × 6 font 72 tous les deux : chaque bloc accepte les deux dalles. Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            ########
            #d.a.D##
            #.#..#C#
            #.Bb##.#
            #.A..#.#
            ##...c.#
            ########`
    },
    {
        id: 'chn58', titre: 'La grande allée',
        coups: 10,
        produits: { A: [7, 7], B: [9, 6] },
        indice: 'Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté. 10 poussées : lis tout le chantier avant d\'en pousser une seule.',
        plan: `
            #########
            #...#A..#
            #.......#
            #..B..b.#
            #.....#.#
            #.a#...##
            #########`
    },
    {
        id: 'chn59', titre: 'Deux fois 24',
        coups: 10,
        produits: { A: [6, 4], B: [12, 2], C: [9, 9], D: [8, 9] },
        indice: '6 × 4 et 12 × 2 font 24 tous les deux : chaque bloc accepte les deux dalles. Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            #########
            ##.c#d#.#
            #D#C#.a.#
            #.......#
            #.bB.A..#
            #########`
    },
    {
        id: 'chn60', titre: '24 des deux côtés',
        coups: 10,
        produits: { A: [4, 6], B: [3, 8] },
        indice: '4 × 6 et 3 × 8 font 24 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ########
            #...#.A#
            #b.#...#
            ##.....#
            #..#...#
            #..a...#
            #.....B#
            ########`
    },
    {
        id: 'ch23', titre: 'Le grand tour',
        coups: 11,
        produits: { A: [8, 8], B: [16, 4] },
        indice: 'Encore 8 × 8 et 16 × 4. Une des deux dalles ne s\'atteint qu\'après un long détour : laquelle, et par qui ?',
        plan: `
            #########
            #...#...#
            #....#..#
            #.##.aA.#
            #b..#...#
            #.....B##
            #....#..#
            #########`
    },
    {
        id: 'ch24', titre: 'Soixante-douze en double',
        coups: 11,
        produits: { A: [9, 8], B: [12, 6], C: [9, 7] },
        indice: '9 × 8 et 12 × 6 font 72. Le troisième bloc n\'a rien d\'ambigu — mais il occupe la place.',
        plan: `
            ##########
            #.......##
            ##C..A#..#
            #B.#....##
            #..a...###
            #...#.#..#
            #...c.b..#
            ##########`
    },
    {
        id: 'chn61', titre: '72 en double, encore',
        coups: 11,
        produits: { A: [9, 8], B: [12, 6], C: [6, 9], D: [6, 6] },
        indice: '9 × 8 et 12 × 6 font 72 tous les deux : chaque bloc accepte les deux dalles. Quatre blocs : chacun scellé rétrécit le chantier pour les suivants.',
        plan: `
            ########
            ##A.#..#
            ##....b#
            #.adB#c#
            #.###DC#
            ########`
    },
    {
        id: 'chn62', titre: '54 en double',
        coups: 11,
        produits: { A: [9, 6], B: [18, 3] },
        indice: '9 × 6 et 18 × 3 font 54 tous les deux : chaque bloc accepte les deux dalles. Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté.',
        plan: `
            ########
            #...b#A#
            #....a.#
            ###B#..#
            #..#...#
            ########`
    },
    {
        id: 'chn63', titre: 'Le chantier serré',
        coups: 11,
        produits: { A: [9, 7], B: [9, 6] },
        indice: 'Deux blocs seulement, et pourtant beaucoup de poussées : chacun doit faire le tour pour se présenter du bon côté. 11 poussées : lis tout le chantier avant d\'en pousser une seule.',
        plan: `
            ##########
            #....##..#
            #.b.#..#.#
            #.#..B.#.#
            #aA...#..#
            ##########`
    },
    {
        id: 'ch25', titre: 'La grande cour',
        coups: 12,
        produits: { A: [6, 7], B: [8, 6], C: [9, 7] },
        indice: 'Presque pas de murs : tout le chantier se construit avec les blocs qu\'on vient de sceller. Douze poussées.',
        plan: `
            ##########
            #...b....#
            #....c#B.#
            #.......a#
            ##....A..#
            #........#
            #.......C#
            ##########`
    },
    {
        id: 'ch35', titre: 'Le dernier chantier',
        coups: 12,
        produits: { A: [9, 9], B: [7, 7], C: [7, 8] },
        indice: 'Douze poussées. Lis tout, prévois l\'ordre, et ne pousse qu\'ensuite.',
        plan: `
            #######
            #.....#
            #Ba...#
            #c#C..#
            #...Ab#
            #.#...#
            #######`
    },
    {
        id: 'chn64', titre: 'Les trois portes',
        coups: 12,
        produits: { A: [7, 9], B: [7, 6], C: [9, 6] },
        indice: '12 poussées : lis tout le chantier avant d\'en pousser une seule.',
        plan: `
            #########
            #.a....##
            ##.#..C.#
            #...#b..#
            #c...A..#
            #....B..#
            #########`
    },
    {
        id: 'chn65', titre: 'Le fond de cour',
        coups: 12,
        produits: { A: [7, 9], B: [7, 8], C: [9, 8] },
        indice: '12 poussées : lis tout le chantier avant d\'en pousser une seule.',
        plan: `
            ##########
            #CB#.a#..#
            ##b......#
            #.A.#.#.##
            #....#...#
            ##.c##...#
            ##########`
    }
];

export function niveauxLus() {
    return NIVEAUX.map(lireNiveau);
}
