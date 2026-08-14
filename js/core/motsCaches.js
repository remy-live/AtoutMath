// MOTS CACHÉS MATHÉMATIQUES — la grille, sans une ligne de DOM.
//
// Une grille de lettres, des mots du vocabulaire mathématique à retrouver dans
// les huit directions. Ce qui en fait autre chose qu'un passe-temps : chaque
// mot trouvé donne sa DÉFINITION. On ne cherche pas des lettres, on relit le
// lexique — et « hypoténuse », « quotient », « médiatrice » sont précisément
// les mots qu'un élève reconnaît sans savoir les dire.
//
// Le placement est un remplissage par essais successifs : on tente un mot à un
// endroit et dans une direction tirés au hasard, on vérifie que chaque lettre
// tombe sur une case vide OU sur la même lettre — c'est cette seconde
// possibilité qui produit les croisements, donc les grilles qui ressemblent à
// des mots cachés plutôt qu'à des lignes parallèles.

import { makeRng } from './ids.js';

export const DIRECTIONS = [
    { dx: 1, dy: 0, nom: 'horizontale' },
    { dx: 0, dy: 1, nom: 'verticale' },
    { dx: 1, dy: 1, nom: 'diagonale' },
    { dx: 1, dy: -1, nom: 'diagonale' },
    { dx: -1, dy: 0, nom: 'horizontale à l\'envers' },
    { dx: 0, dy: -1, nom: 'verticale à l\'envers' },
    { dx: -1, dy: -1, nom: 'diagonale à l\'envers' },
    { dx: -1, dy: 1, nom: 'diagonale à l\'envers' }
];

const ALPHABET = 'AABCDEEFGHIIJKLMNOOPQRSTUUVXYZ';

/**
 * Le lexique. `theme` sert au tri, `niveau` au filtrage par classe.
 * Les définitions sont écrites pour être lues par l'élève qui vient de
 * trouver le mot — courtes, et sans employer le mot qu'elles définissent.
 */
export const LEXIQUE = [
    // --- Géométrie ---
    { mot: 'CARRE', theme: 'geometrie', niveau: 1, def: 'Quatre côtés de même longueur et quatre angles droits.' },
    { mot: 'CERCLE', theme: 'geometrie', niveau: 1, def: 'Tous ses points sont à la même distance du centre.' },
    { mot: 'RAYON', theme: 'geometrie', niveau: 1, def: 'Du centre du cercle jusqu\'au bord.' },
    { mot: 'DIAMETRE', theme: 'geometrie', niveau: 1, def: 'Traverse le cercle en passant par le centre : deux rayons.' },
    { mot: 'ANGLE', theme: 'geometrie', niveau: 1, def: 'L\'écartement entre deux demi-droites de même origine.' },
    { mot: 'DROITE', theme: 'geometrie', niveau: 1, def: 'Illimitée des deux côtés, elle n\'a ni début ni fin.' },
    { mot: 'SEGMENT', theme: 'geometrie', niveau: 1, def: 'Une portion de droite, limitée par deux points.' },
    { mot: 'SOMMET', theme: 'geometrie', niveau: 1, def: 'Le point où deux côtés se rejoignent.' },
    { mot: 'TRIANGLE', theme: 'geometrie', niveau: 1, def: 'Trois côtés, trois sommets, trois angles.' },
    { mot: 'LOSANGE', theme: 'geometrie', niveau: 2, def: 'Quatre côtés de même longueur, sans angle droit obligatoire.' },
    { mot: 'RECTANGLE', theme: 'geometrie', niveau: 1, def: 'Quatre angles droits, les côtés opposés égaux.' },
    { mot: 'PARALLELE', theme: 'geometrie', niveau: 2, def: 'Deux droites qui ne se croisent jamais, même très loin.' },
    { mot: 'PERPENDICULAIRE', theme: 'geometrie', niveau: 2, def: 'Deux droites qui se croisent en formant un angle droit.' },
    { mot: 'MEDIATRICE', theme: 'geometrie', niveau: 3, def: 'Coupe un segment en son milieu, perpendiculairement.' },
    { mot: 'BISSECTRICE', theme: 'geometrie', niveau: 3, def: 'Partage un angle en deux angles égaux.' },
    { mot: 'HYPOTENUSE', theme: 'geometrie', niveau: 3, def: 'Le plus long côté d\'un triangle rectangle, face à l\'angle droit.' },
    { mot: 'SYMETRIE', theme: 'geometrie', niveau: 2, def: 'Comme le reflet dans un miroir, de part et d\'autre d\'un axe.' },
    { mot: 'CUBE', theme: 'geometrie', niveau: 1, def: 'Six faces carrées identiques.' },
    { mot: 'PYRAMIDE', theme: 'geometrie', niveau: 2, def: 'Une base, et des faces triangulaires qui montent vers un sommet.' },
    { mot: 'ARETE', theme: 'geometrie', niveau: 2, def: 'Le segment où deux faces d\'un solide se rencontrent.' },
    { mot: 'FACE', theme: 'geometrie', niveau: 1, def: 'Une des surfaces planes qui ferment un solide.' },
    { mot: 'CENTRE', theme: 'geometrie', niveau: 1, def: 'Le point du milieu, à égale distance de tout le bord.' },

    // --- Nombres ---
    { mot: 'ENTIER', theme: 'nombres', niveau: 1, def: 'Un nombre sans virgule : 0, 1, 2, 3…' },
    { mot: 'DECIMAL', theme: 'nombres', niveau: 1, def: 'Un nombre à virgule, comme 3,14.' },
    { mot: 'FRACTION', theme: 'nombres', niveau: 2, def: 'Un nombre écrit comme un partage : 3 sur 4.' },
    { mot: 'NUMERATEUR', theme: 'nombres', niveau: 2, def: 'Le nombre du HAUT dans une fraction.' },
    { mot: 'DENOMINATEUR', theme: 'nombres', niveau: 2, def: 'Le nombre du BAS : en combien de parts on partage.' },
    { mot: 'RELATIF', theme: 'nombres', niveau: 3, def: 'Un nombre qui peut être négatif, comme −7.' },
    { mot: 'NEGATIF', theme: 'nombres', niveau: 3, def: 'Plus petit que zéro : il est à sa gauche sur la droite graduée.' },
    { mot: 'OPPOSE', theme: 'nombres', niveau: 3, def: 'Même distance à zéro, de l\'autre côté : −5 et 5.' },
    { mot: 'CHIFFRE', theme: 'nombres', niveau: 1, def: 'Un des dix symboles de 0 à 9 : les nombres s\'écrivent avec.' },
    { mot: 'DIZAINE', theme: 'nombres', niveau: 1, def: 'Un paquet de dix unités.' },
    { mot: 'CENTAINE', theme: 'nombres', niveau: 1, def: 'Un paquet de cent unités, soit dix dizaines.' },
    { mot: 'DIXIEME', theme: 'nombres', niveau: 1, def: 'Le premier chiffre après la virgule : une unité coupée en dix.' },
    { mot: 'PAIR', theme: 'nombres', niveau: 1, def: 'Se partage en deux parts égales, sans reste.' },
    { mot: 'PREMIER', theme: 'nombres', niveau: 3, def: 'Ne se divise que par 1 et par lui-même.' },
    { mot: 'MULTIPLE', theme: 'nombres', niveau: 2, def: 'S\'obtient en multipliant : 12 est un de ceux de 3.' },
    { mot: 'DIVISEUR', theme: 'nombres', niveau: 2, def: 'Le divise sans rien laisser : 3 en est un de 12.' },

    // --- Calcul ---
    { mot: 'SOMME', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une addition.' },
    { mot: 'DIFFERENCE', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une soustraction.' },
    { mot: 'PRODUIT', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une multiplication.' },
    { mot: 'QUOTIENT', theme: 'calcul', niveau: 2, def: 'Le résultat d\'une division.' },
    { mot: 'RESTE', theme: 'calcul', niveau: 2, def: 'Ce qui n\'a pas pu être partagé dans une division.' },
    { mot: 'FACTEUR', theme: 'calcul', niveau: 1, def: 'Un des nombres que l\'on multiplie.' },
    { mot: 'TERME', theme: 'calcul', niveau: 1, def: 'Un des nombres que l\'on additionne.' },
    { mot: 'DOUBLE', theme: 'calcul', niveau: 1, def: 'Deux fois plus.' },
    { mot: 'MOITIE', theme: 'calcul', niveau: 1, def: 'Deux fois moins.' },
    { mot: 'PRIORITE', theme: 'calcul', niveau: 2, def: 'La règle qui dit quelle opération faire en premier.' },
    { mot: 'PARENTHESE', theme: 'calcul', niveau: 2, def: 'Ce qui est dedans se calcule avant tout le reste.' },
    { mot: 'EGALITE', theme: 'calcul', niveau: 1, def: 'Deux écritures qui valent la même chose.' },

    // --- Grandeurs et mesures ---
    { mot: 'PERIMETRE', theme: 'mesures', niveau: 1, def: 'La longueur du tour d\'une figure.' },
    { mot: 'AIRE', theme: 'mesures', niveau: 1, def: 'La mesure de la surface : le nombre de carreaux dedans.' },
    { mot: 'VOLUME', theme: 'mesures', niveau: 2, def: 'La place occupée dans l\'espace.' },
    { mot: 'LONGUEUR', theme: 'mesures', niveau: 1, def: 'Se mesure en mètres, en centimètres…' },
    { mot: 'MASSE', theme: 'mesures', niveau: 1, def: 'Se mesure en grammes et en kilogrammes.' },
    { mot: 'DUREE', theme: 'mesures', niveau: 1, def: 'Le temps écoulé entre deux instants.' },
    { mot: 'MINUTE', theme: 'mesures', niveau: 1, def: 'Soixante secondes.' },
    { mot: 'DEGRE', theme: 'mesures', niveau: 2, def: 'L\'unité qui mesure les angles.' },
    { mot: 'LITRE', theme: 'mesures', niveau: 1, def: 'L\'unité des contenances.' },
    { mot: 'RAPPORTEUR', theme: 'mesures', niveau: 2, def: 'L\'instrument demi-rond qui mesure les angles.' },
    { mot: 'ECHELLE', theme: 'mesures', niveau: 3, def: 'Le rapport entre le dessin et la réalité.' },
    { mot: 'VITESSE', theme: 'mesures', niveau: 3, def: 'La distance parcourue en un temps donné.' }
];

export const THEMES = {
    tout: 'Tout le vocabulaire',
    geometrie: 'Géométrie',
    nombres: 'Les nombres',
    calcul: 'Le calcul',
    mesures: 'Grandeurs et mesures'
};

/** Les mots disponibles pour un thème et un niveau donnés. */
export function motsDisponibles({ theme = 'tout', niveauMax = 3 } = {}) {
    return LEXIQUE.filter(m => (theme === 'tout' || m.theme === theme) && m.niveau <= niveauMax);
}

/**
 * Les mots d'UNE grille : un tirage, pas tout le lexique.
 *
 * `creerGrille` pose les mots les plus longs d'abord — c'est la bonne règle,
 * un « PERPENDICULAIRE » ne rentre plus dans une grille déjà garnie — mais si
 * on lui donne le lexique entier, il s'arrête au dixième mot posé : ce sont
 * toujours les dix mots les plus longs, et ni CARRE, ni RAYON, ni SOMME ne
 * paraissent jamais. On tire donc d'abord, on place ensuite.
 *
 * Quelques mots de rab : certains ne rentreront pas, et une grille à sept mots
 * quand on en demandait dix se remarque.
 */
export function tirerMots({ theme = 'tout', niveauMax = 3, nbMots = 10, rng } = {}) {
    const dispo = motsDisponibles({ theme, niveauMax });
    return (rng ? rng.shuffle(dispo) : dispo).slice(0, nbMots + 5);
}

const cle = (x, y) => `${x},${y}`;

/** Les cases qu'occuperait ce mot, ou null si ça ne passe pas. */
function essayer(cases, taille, mot, x, y, dir) {
    const out = [];
    for (let i = 0; i < mot.length; i++) {
        const cx = x + dir.dx * i, cy = y + dir.dy * i;
        if (cx < 0 || cy < 0 || cx >= taille || cy >= taille) return null;
        const dejaLa = cases[cle(cx, cy)];
        // Une case déjà occupée ne convient que si c'est LA MÊME lettre : c'est
        // toute la différence entre une grille croisée et un empilement.
        if (dejaLa && dejaLa !== mot[i]) return null;
        out.push({ x: cx, y: cy, lettre: mot[i] });
    }
    return out;
}

/**
 * Construit une grille.
 *
 * @param {Object} o
 * @param {number} o.taille       - côté de la grille
 * @param {Array}  o.mots         - entrées du lexique, dans l'ordre de préférence
 * @param {number} o.nbMots       - combien en placer au maximum
 * @param {Object} o.rng          - le tirage du projet (makeRng), pour des grilles rejouables
 * @param {boolean} [o.diagonales] - autoriser les diagonales
 * @param {boolean} [o.envers]     - autoriser les mots écrits à l'envers
 */
export function creerGrille({ taille = 12, mots = [], nbMots = 10, rng = makeRng(), diagonales = true, envers = false }) {
    const dirs = DIRECTIONS.filter(d =>
        (diagonales || d.dx === 0 || d.dy === 0) &&
        (envers || (d.dx >= 0 && d.dy >= 0) || (d.dx === 1 && d.dy === -1)));

    const cases = {};
    const places = [];
    // COMBIEN DE FOIS CHAQUE SENS A SERVI. Sans ce compte, une grille sur
    // quatre sortait avec ses dix mots dans le même sens : le croisement est
    // rare (il faut la même lettre au point de rencontre), donc la plupart des
    // candidats valent zéro, et le hasard suit alors le sens qui offre le plus
    // de positions. Une grille où tout se lit de gauche à droite n'est plus un
    // mot caché, c'est une liste.
    const usages = {};
    const cleDir = (d) => `${d.dx},${d.dy}`;
    // Les mots longs d'abord : placer « PERPENDICULAIRE » en dernier dans une
    // grille déjà pleine échoue presque toujours, et c'est justement le mot
    // qu'on voulait faire lire.
    const candidats = mots.filter(m => m.mot.length <= taille)
        .sort((a, b) => b.mot.length - a.mot.length);

    for (const entree of candidats) {
        if (places.length >= nbMots) break;

        // On ne prend pas la PREMIÈRE position libre : on en récolte plusieurs
        // et on préfère celles qui CROISENT un mot déjà posé. Sans ce tri, le
        // hasard tombe presque toujours sur des cases vides — on obtient des
        // mots posés côte à côte, repérables d'un coup d'œil, et une grille qui
        // n'a de mots cachés que le nom. Le croisement est ce qui oblige à
        // vraiment lire les lettres.
        // LES SENS LES MOINS SERVIS SONT ESSAYÉS EN PREMIER. Trier au moment
        // du choix ne suffisait pas : quand le meilleur croisement n'existe
        // que dans un seul sens, c'est ce sens qui gagne, et de proche en
        // proche toute la grille bascule. En tirant les positions dans les
        // sens rares, on récolte des candidats à départager.
        const moindre = Math.min(...dirs.map(d => usages[cleDir(d)] || 0));
        const rares = dirs.filter(d => (usages[cleDir(d)] || 0) === moindre);
        const trouvees = [];
        for (let essai = 0; essai < 260 && trouvees.length < 24; essai++) {
            // Les deux tiers des essais dans les sens rares, le reste partout :
            // un mot qui ne rentre QUE dans le sens déjà servi doit pouvoir y
            // rentrer quand même, plutôt que d'être abandonné.
            const dir = rng.pick(essai % 3 === 2 ? dirs : rares);
            const x = rng.int(0, taille - 1);
            const y = rng.int(0, taille - 1);
            const cellules = essayer(cases, taille, entree.mot, x, y, dir);
            if (!cellules) continue;
            // On refuse un mot posé exactement sur un autre déjà placé.
            if (places.some(p => p.x === x && p.y === y && p.dx === dir.dx && p.dy === dir.dy)) continue;
            const croisements = cellules.filter(c => cases[cle(c.x, c.y)]).length;
            trouvees.push({ cellules, x, y, dir, croisements });
        }
        if (!trouvees.length) continue;
        const meilleur = Math.max(...trouvees.map(t => t.croisements));
        const bonnes = trouvees.filter(t => t.croisements === meilleur);
        // À CROISEMENTS ÉGAUX, LE SENS LE MOINS SERVI. Le croisement reste
        // prioritaire — c'est lui qui fait la grille — mais entre deux
        // placements aussi bons, on varie.
        const rare = Math.min(...bonnes.map(t => usages[cleDir(t.dir)] || 0));
        const variees = bonnes.filter(t => (usages[cleDir(t.dir)] || 0) === rare);
        const pose = variees[rng.int(0, variees.length - 1)];
        usages[cleDir(pose.dir)] = (usages[cleDir(pose.dir)] || 0) + 1;
        pose.cellules.forEach(c => { cases[cle(c.x, c.y)] = c.lettre; });
        places.push({
            mot: entree.mot, def: entree.def, theme: entree.theme,
            x: pose.x, y: pose.y, dx: pose.dir.dx, dy: pose.dir.dy,
            longueur: entree.mot.length, direction: pose.dir.nom
        });
    }

    // Le remplissage : des lettres au hasard, mais tirées d'un alphabet qui
    // sur-représente les voyelles — sans quoi la grille est un mur de
    // consonnes où les mots se repèrent à l'œil sans être cherchés.
    const grille = [];
    for (let y = 0; y < taille; y++) {
        const ligne = [];
        for (let x = 0; x < taille; x++) {
            ligne.push(cases[cle(x, y)] || rng.pick(ALPHABET));
        }
        grille.push(ligne);
    }

    return { taille, grille, mots: places.sort((a, b) => a.mot.localeCompare(b.mot)) };
}

/** Les cases traversées par un glissement, si la ligne est droite. */
export function segment(x1, y1, x2, y2) {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const lx = Math.abs(x2 - x1), ly = Math.abs(y2 - y1);
    // Seules les huit directions comptent : horizontale, verticale, diagonale
    // à 45°. Tout le reste n'est pas une sélection, c'est un geste raté.
    if (lx !== ly && lx !== 0 && ly !== 0) return null;
    const n = Math.max(lx, ly);
    const out = [];
    for (let i = 0; i <= n; i++) out.push({ x: x1 + dx * i, y: y1 + dy * i });
    return out;
}

/** Le mot lu le long d'un segment. */
export function lire(etat, cases) {
    return cases.map(c => etat.grille[c.y][c.x]).join('');
}

/**
 * Le glissement désigne-t-il un mot de la liste ? On accepte les deux sens de
 * lecture : l'élève qui repère « ETNEIUQO » a bien trouvé QUOTIENT, et lui
 * refuser parce qu'il a glissé de droite à gauche n'apprendrait rien.
 */
export function motTrouve(etat, cases) {
    if (!cases || cases.length < 2) return null;
    const lu = lire(etat, cases);
    const envers = [...lu].reverse().join('');
    return etat.mots.find(m => m.mot === lu || m.mot === envers) || null;
}

export function toutTrouve(etat, trouves) {
    return etat.mots.every(m => trouves.includes(m.mot));
}
