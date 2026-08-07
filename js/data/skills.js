// Référentiel de compétences : la colonne vertébrale didactique.
//
// Avant, les "notions" étaient des chaînes devinées à partir de la forme des
// données (`qd.t !== undefined` => `mult:7`). Ici elles deviennent des données
// de premier ordre, avec un libellé, un niveau, un rappel de cours et surtout
// des PRÉREQUIS. Le graphe de prérequis permet de :
//   - proposer une notion seulement quand ses prérequis sont acquis,
//   - remonter en amont quand un élève bloque (remédiation ciblée),
//   - produire un bilan par compétence exploitable par le professeur.
//
// Tout le reste de l'application (statistiques, parcours, notation, bulletin)
// s'accroche à ces identifiants.

import { TAGS } from './tags.js';

const N = TAGS.NIVEAU;
const D = TAGS.DOMAINE;
const SD = TAGS.SOUS_DOMAINE;

/**
 * @typedef {Object} Skill
 * @property {string} id
 * @property {string} label            - libellé affiché à l'élève
 * @property {string[]} chemin         - domaine > sous-domaine [> thème]
 * @property {string[]} niveaux
 * @property {string[]} prereqs        - ids des compétences préalables
 * @property {string} [descriptor]     - formulation "attendu" pour le prof
 * @property {string} [lesson]         - rappel de cours court, affichable en jeu
 */

/** @type {Record<string, Skill>} */
const BASE = {
    'num.add.entiers': {
        label: 'Additionner des entiers',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: [],
        descriptor: 'Calculer mentalement la somme de deux nombres entiers.',
        lesson: 'Pour additionner, on peut décomposer : 8 + 7 = 8 + 2 + 5 = 10 + 5 = 15.'
    },
    'num.sub.entiers': {
        label: 'Soustraire des entiers',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Calculer mentalement la différence de deux nombres entiers.',
        lesson: 'Soustraire, c\'est chercher ce qu\'il manque : 15 − 8, c\'est « 8 pour aller à 15 » = 7.'
    },
    'num.mult.sens': {
        label: 'Sens de la multiplication',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL, TAGS.THEME.TABLES],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Comprendre la multiplication comme une addition répétée.',
        lesson: '4 × 3, c\'est 3 + 3 + 3 + 3. C\'est aussi 4 lignes de 3 objets.'
    },
    'num.mult.facteur-manquant': {
        label: 'Trouver un facteur manquant',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL, TAGS.THEME.TABLES],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: ['num.mult.sens'],
        descriptor: 'Résoudre 7 × ? = 56 en mobilisant la table correspondante.',
        lesson: 'Chercher le facteur manquant, c\'est diviser : 7 × ? = 56 donc ? = 56 ÷ 7 = 8.'
    },
    'num.div.quotient': {
        label: 'Diviser (quotient exact)',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: ['num.mult.facteur-manquant'],
        descriptor: 'Calculer un quotient exact en s\'appuyant sur les tables.',
        lesson: '56 ÷ 8, c\'est chercher combien de fois 8 tient dans 56 : 7 fois.'
    },
    'num.logique.mathodu': {
        label: 'Grilles à contraintes (Mathdoku)',
        chemin: [D.NUMERIQUE, SD.LOGIQUE],
        niveaux: [N.CM2, N.SIXIEME, N.CINQUIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Remplir une grille en croisant des contraintes de calcul et de placement.',
        lesson: 'Commence par les zones d\'une seule case, puis cherche les zones où une seule combinaison est possible.'
    },
    'num.logique.binairo': {
        label: 'Grilles binaires (Binairo)',
        chemin: [D.NUMERIQUE, SD.LOGIQUE],
        niveaux: [N.CM2, N.SIXIEME, N.CINQUIEME],
        prereqs: [],
        descriptor: 'Compléter une grille de 0 et de 1 en raisonnant sur l\'équilibre et les interdits.',
        lesson: 'Deux chiffres identiques côte à côte forcent leurs deux voisines. Une ligne qui a tous ses 1 se finit avec des 0.'
    },
    'num.calc.decomposition': {
        label: 'Décomposer un nombre (calcul mental)',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Reconnaître rapidement les écritures d\'un nombre : sommes, différences, produits.',
        lesson: 'Un même nombre s\'écrit de mille façons : 12 = 8 + 4 = 15 − 3 = 3 × 4. Les reconnaître d\'un coup d\'œil, c\'est ça, le calcul mental.'
    },
    'num.logique.sudoku': {
        label: 'Sudoku',
        chemin: [D.NUMERIQUE, SD.LOGIQUE],
        niveaux: [N.CM2, N.SIXIEME, N.CINQUIEME],
        prereqs: [],
        descriptor: 'Compléter une grille de sudoku par élimination : chaque chiffre une seule fois par ligne, colonne et bloc.',
        lesson: 'Cherche une case dont la ligne, la colonne et le bloc contiennent déjà tous les autres chiffres : il n\'en reste qu\'un possible. Chaque case remplie en débloque d\'autres.'
    },
    'num.logique.garam': {
        label: 'Égalités croisées (Garam)',
        chemin: [D.NUMERIQUE, SD.LOGIQUE],
        niveaux: [N.CM2, N.SIXIEME, N.CINQUIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Compléter un treillis d\'égalités en calculant dans les deux sens : résultat ou opérande manquant.',
        lesson: 'Commence par les égalités où il ne manque qu\'une case : chaque case trouvée en débloque d\'autres.'
    },
    'num.prio': {
        label: 'Priorités opératoires',
        chemin: [D.NUMERIQUE, SD.PRIORITES],
        niveaux: [N.CINQUIEME, N.QUATRIEME],
        prereqs: ['num.mult.sens', 'num.add.entiers'],
        descriptor: 'Appliquer les règles de priorité dans un calcul sans parenthèses.',
        lesson: 'La multiplication et la division passent avant l\'addition et la soustraction. Dans 2 + 3 × 4, on calcule d\'abord 3 × 4.'
    },
    'num.frac.sens': {
        label: 'Sens d\'une fraction',
        chemin: [D.NUMERIQUE, SD.FRACTIONS],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: ['num.div.quotient'],
        descriptor: 'Interpréter a/b comme un partage en b parts dont on prend a.',
        lesson: '3/4, c\'est partager en 4 parts égales et en prendre 3.'
    },
    'num.frac.compare': {
        label: 'Comparer deux fractions',
        chemin: [D.NUMERIQUE, SD.FRACTIONS],
        niveaux: [N.CINQUIEME, N.QUATRIEME],
        prereqs: ['num.frac.sens'],
        descriptor: 'Comparer deux fractions, de même dénominateur ou non.',
        lesson: 'Même dénominateur : la plus grande est celle qui a le plus grand numérateur. Sinon, on réduit au même dénominateur.'
    },
    'num.frac.add-meme-denom': {
        label: 'Additionner des fractions de même dénominateur',
        chemin: [D.NUMERIQUE, SD.FRACTIONS],
        niveaux: [N.CINQUIEME],
        prereqs: ['num.frac.sens'],
        descriptor: 'Additionner deux fractions ayant le même dénominateur.',
        lesson: '2/7 + 3/7 = 5/7 : on additionne les numérateurs, le dénominateur ne change pas.'
    },
    'num.frac.simplification': {
        label: 'Simplifier une fraction',
        chemin: [D.NUMERIQUE, SD.FRACTIONS],
        niveaux: [N.CINQUIEME, N.QUATRIEME],
        prereqs: ['num.frac.sens'],
        descriptor: 'Rendre une fraction irréductible en divisant numérateur et dénominateur par leurs facteurs communs.',
        lesson: 'On cherche un diviseur commun au numérateur et au dénominateur : 36/48 = (12×3)/(12×4) = 3/4. Quand il n\'y a plus aucun diviseur commun, la fraction est irréductible.'
    },
    // --- Chapitre « Nombres entiers et décimaux » (6ᵉ) ---
    'num.ecriture.lettres': {
        label: 'Écrire un nombre en chiffres et en lettres',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Passer de l\'écriture en toutes lettres à l\'écriture chiffrée, et inversement.',
        lesson: 'On regroupe les chiffres par tranches de 3 en partant de la droite : 123456 s\'écrit 123 456.'
    },
    'num.numeration.rang': {
        label: 'Rang des chiffres',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Donner le chiffre d\'un rang donné, de part et d\'autre de la virgule.',
        lesson: 'À gauche de la virgule : unités, dizaines, centaines. À droite : dixièmes, centièmes, millièmes. Dizaines et dixièmes ne sont pas le même rang.'
    },
    'num.decimal.parties': {
        label: 'Partie entière et partie décimale',
        chemin: [D.NUMERIQUE, SD.DECIMAUX],
        niveaux: [N.SIXIEME],
        prereqs: ['num.numeration.rang'],
        descriptor: 'Distinguer la partie entière de la partie décimale d\'un nombre.',
        lesson: 'Pour 125,16 : 125 est la partie entière, 0,16 la partie décimale. Un nombre entier a une partie décimale nulle.'
    },
    'num.decimal.zeros': {
        label: 'Zéros inutiles',
        chemin: [D.NUMERIQUE, SD.DECIMAUX],
        niveaux: [N.SIXIEME],
        prereqs: ['num.decimal.parties'],
        descriptor: 'Supprimer les zéros qui ne changent pas la valeur d\'un décimal.',
        lesson: 'On supprime les zéros tout à gauche de la partie entière et tout à droite de la partie décimale : 032,120 = 32,12. Mais 17,070 garde son zéro du milieu.'
    },
    'num.numeration.conversion': {
        label: 'Convertir des unités de numération',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.SIXIEME],
        prereqs: ['num.numeration.rang'],
        descriptor: 'Passer de « 785 centaines » à 78 500, et inversement.',
        lesson: 'Une dizaine vaut 10 unités, une centaine 100, un millier 1 000. Donc 785 centaines = 785 × 100 = 78 500.'
    },
    'num.numeration.decomposition': {
        label: 'Décomposer un nombre',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.SIXIEME],
        prereqs: ['num.numeration.rang'],
        descriptor: 'Écrire un nombre comme somme des valeurs de ses rangs.',
        lesson: '25 367 = 20 000 + 5 000 + 300 + 60 + 7. Chaque terme donne le chiffre d\'un rang.'
    },
    'num.numeration.egypte': {
        label: 'Numération égyptienne',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Lire un nombre écrit avec les hiéroglyphes égyptiens.',
        lesson: 'Bâton = 1, anse = 10, corde = 100, lotus = 1 000, doigt = 10 000. On additionne les valeurs : il n\'y a pas de rang, seulement des symboles à compter.'
    },
    'num.ordre-grandeur': {
        label: 'Ordre de grandeur',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Donner le nombre rond le plus proche pour vérifier un calcul.',
        lesson: '999 ≈ 1 000 et 7,98 ≈ 8. Estimer avant de calculer permet de repérer une erreur grossière.'
    },
    'num.complement': {
        label: 'Compléments à 10, 100, 1000',
        chemin: [D.NUMERIQUE, SD.CALCUL_MENTAL],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: ['num.add.entiers'],
        descriptor: 'Trouver ce qu\'il manque pour atteindre 10, 100 ou 1 000.',
        lesson: 'Ce qu\'il faut ajouter à 3 pour faire 10, c\'est 7. À 30 pour faire 100, c\'est 70.'
    },
    'num.parite': {
        label: 'Nombres pairs et impairs',
        chemin: [D.NUMERIQUE, SD.NUMERATION],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: [],
        descriptor: 'Reconnaître un nombre pair à son chiffre des unités.',
        lesson: 'Un nombre est pair s\'il se termine par 0, 2, 4, 6 ou 8. Seul le chiffre des unités compte.'
    },

    'num.dec.compare': {
        label: 'Comparer des nombres décimaux',
        chemin: [D.NUMERIQUE, SD.DECIMAUX],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Comparer deux décimaux en s\'appuyant sur la valeur des chiffres.',
        lesson: '2,5 et 2,45 : on compare rang par rang. 5 dixièmes > 4 dixièmes, donc 2,5 > 2,45.'
    },
    'geo.repere.coord': {
        label: 'Lire et placer des coordonnées',
        chemin: [D.GEOMETRIQUE, SD.REPERAGE],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Repérer un point du plan à l\'aide d\'un couple de coordonnées (x ; y).',
        lesson: 'On lit toujours l\'abscisse (axe horizontal) en premier, puis l\'ordonnée (axe vertical) : le point (3 ; 2) est à 3 vers la droite et 2 vers le haut.'
    },
    'geo.repere.relatifs': {
        label: 'Coordonnées négatives',
        chemin: [D.GEOMETRIQUE, SD.REPERAGE],
        niveaux: [N.CINQUIEME],
        prereqs: ['geo.repere.coord'],
        descriptor: 'Repérer un point dans les quatre quadrants, avec des coordonnées relatives.',
        lesson: 'À gauche de l\'origine, l\'abscisse est négative ; en dessous, l\'ordonnée est négative. Le point (−3 ; 2) est à 3 vers la gauche et 2 vers le haut.'
    },
    'num.logique.dichotomie': {
        label: 'Encadrer un nombre (dichotomie)',
        chemin: [D.NUMERIQUE, SD.LOGIQUE],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: [],
        descriptor: 'Trouver un nombre inconnu en resserrant un encadrement par essais « plus / moins ».',
        lesson: 'Propose toujours le MILIEU de la zone possible : chaque réponse « plus » ou « moins » élimine la moitié des nombres. Entre 1 et 100, sept essais suffisent toujours.'
    },
    'mes.heure.lire': {
        label: 'Lire l\'heure sur une pendule',
        chemin: [D.GRANDEURS, SD.DUREES],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: [],
        descriptor: 'Lire l\'heure sur un cadran à aiguilles, jusqu\'à la minute près, et en 24 heures.',
        lesson: 'Deux aiguilles, deux lectures. La PETITE donne les heures : quand elle est entre deux nombres, on garde le plus petit. La GRANDE donne les minutes : chaque nombre du cadran en vaut 5, donc sur le 7 il est 35 minutes. L\'après-midi, on ajoute 12 à ce que montre la pendule : 3 h devient 15 h.'
    },
    'mes.heure.placer': {
        label: 'Placer les aiguilles sur une heure donnée',
        chemin: [D.GRANDEURS, SD.DUREES],
        niveaux: [N.CM2, N.SIXIEME],
        prereqs: ['mes.heure.lire'],
        descriptor: 'Placer les deux aiguilles d\'une pendule sur une heure donnée, y compris en 24 heures.',
        lesson: 'On place d\'abord la GRANDE aiguille : les minutes divisées par 5 donnent le nombre visé (35 min → le 7). Puis la petite sur l\'heure. Elle ne reste pas pile sur le nombre : les minutes l\'entraînent vers le suivant, et c\'est ainsi qu\'une pendule fonctionne. Pour une heure de l\'après-midi, on retire 12 : 15 h se place comme 3 h.'
    },
    'num.relatifs.sens': {
        label: 'Comprendre un nombre relatif (position et déplacement)',
        chemin: [D.NUMERIQUE, SD.RELATIFS],
        niveaux: [N.CINQUIEME],
        prereqs: [],
        descriptor: 'Situer un nombre relatif sur une droite graduée et interpréter un déplacement vers le haut ou vers le bas.',
        lesson: 'Un nombre relatif dit d\'ABORD une position : le 0 n\'est pas le début de la droite, c\'est un repère au milieu. À gauche (ou en dessous), les nombres continuent : −1, −2, −3… Additionner, c\'est alors se DÉPLACER depuis sa position : +5, c\'est cinq crans vers le haut ; −5, cinq crans vers le bas. Le thermomètre et l\'ascenseur disent exactement la même chose.'
    },
    'num.relatifs.somme': {
        label: 'Additionner des nombres relatifs',
        chemin: [D.NUMERIQUE, SD.RELATIFS],
        niveaux: [N.CINQUIEME, N.QUATRIEME],
        prereqs: ['num.relatifs.sens'],
        descriptor: 'Calculer la somme de deux ou trois nombres relatifs, avec ou sans support.',
        lesson: 'Deux cas, et deux seulement. MÊME SIGNE : on ajoute les distances à zéro et on garde le signe — (−3) + (−4) = −7. SIGNES DIFFÉRENTS : on retire la plus petite distance à zéro de la plus grande, et on garde le signe du plus éloigné de zéro — (−7) + (+4) = −3, parce que 7 − 4 = 3 et que le 7 était négatif. Les pastilles expliquent pourquoi : une bleue et une rouge forment une paire qui vaut 0, et il ne reste que le surplus.'
    },
    'geo.angles.mesure': {
        label: 'Mesurer un angle au rapporteur',
        chemin: [D.GEOMETRIQUE, SD.ANGLES],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Mesurer un angle avec un rapporteur, au degré près.',
        lesson: 'Centre du rapporteur sur le sommet, zéro aligné sur un côté : l\'autre côté croise la graduation. Entre les deux échelles, choisis selon la nature de l\'angle — aigu (moins de 90°) ou obtus (plus de 90°).'
    },
    'geo.angles.construire': {
        label: 'Construire un angle au rapporteur',
        chemin: [D.GEOMETRIQUE, SD.ANGLES],
        niveaux: [N.SIXIEME],
        prereqs: ['geo.angles.mesure'],
        descriptor: 'Construire un angle de mesure donnée à l\'aide du rapporteur.',
        lesson: 'Centre sur le sommet, zéro sur le côté déjà tracé : repère la graduation voulue en partant de ce zéro, puis trace le second côté qui passe par elle.'
    },
    'geo.figure.programme': {
        label: 'Construire une figure par un programme',
        chemin: [D.GEOMETRIQUE, SD.ANGLES],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: ['geo.angles.mesure'],
        descriptor: "Décrire une figure par une suite d'avances et de rotations, et trouver l'angle qui la referme.",
        lesson: "En faisant le tour complet d'une figure, on tourne en tout de 360°. Pour un polygone régulier à n côtés, on tourne n fois du même angle : chaque rotation vaut donc 360 ÷ n. Un carré, 360 ÷ 4 = 90° ; un triangle équilatéral, 360 ÷ 3 = 120° ; un hexagone, 360 ÷ 6 = 60°. Attention : c'est l'angle dont on TOURNE, pas l'angle intérieur de la figure."
    },
    'geo.espace.orientation': {
        label: 'Se représenter un solide dans l\'espace',
        chemin: [D.GEOMETRIQUE, SD.ESPACE],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: [],
        descriptor: 'Anticiper mentalement l\'effet d\'une rotation d\'un quart de tour sur un solide.',
        lesson: 'Un quart de tour = 90°. Avant d\'agir, imagine le mouvement dans ta tête : que devient la face de devant ? Quatre quarts de tour ramènent toujours le solide à sa position de départ.'
    },
    'don.tableur.reperage': {
        label: 'Se repérer dans un tableur',
        chemin: [D.DONNEES, SD.TABLEUR],
        niveaux: [N.SIXIEME],
        prereqs: [],
        descriptor: 'Identifier une cellule (B3) et une plage de cellules (A1:B2) dans une feuille de calcul.',
        lesson: 'Une cellule se nomme colonne puis ligne : B3 = colonne B, ligne 3. Une plage se nomme par ses deux coins séparés par deux-points : A1:B2.'
    },
    'don.tableur.formules': {
        label: 'Écrire une formule de tableur',
        chemin: [D.DONNEES, SD.TABLEUR],
        niveaux: [N.SIXIEME, N.CINQUIEME],
        prereqs: ['don.tableur.reperage', 'num.add.entiers'],
        descriptor: 'Écrire une formule utilisant des références de cellules et les fonctions SOMME et MOYENNE.',
        lesson: 'Une formule commence par = et utilise les RÉFÉRENCES des cases : =A1+B1, =SOMME(A1:A4). Si une case change, le tableur recalcule tout seul — c\'est toute sa force.'
    },
    'mes.perimetre.rectangle': {
        label: 'Périmètre d\'un rectangle',
        chemin: [D.GRANDEURS, SD.PERIMETRE_AIRE],
        niveaux: [N.SIXIEME],
        prereqs: ['num.add.entiers', 'num.mult.sens'],
        descriptor: 'Calculer le périmètre d\'un rectangle à partir de ses dimensions.',
        lesson: 'Périmètre = 2 × (Longueur + largeur). On fait le tour de la figure.'
    },
    'mes.aire.rectangle': {
        label: 'Aire d\'un rectangle',
        chemin: [D.GRANDEURS, SD.PERIMETRE_AIRE],
        niveaux: [N.SIXIEME],
        prereqs: ['num.mult.sens'],
        descriptor: 'Calculer l\'aire d\'un rectangle à partir de ses dimensions.',
        lesson: 'Aire = Longueur × largeur. On compte les carreaux qui remplissent la figure.'
    }
};

// Les 10 tables de multiplication sont générées : même structure, pas de
// copier-coller, et l'ajout d'une table 11/12 tient en une ligne.
const TABLE_NIVEAUX = { 1: [N.CM2], 2: [N.CM2], 3: [N.CM2], 4: [N.CM2], 5: [N.CM2] };
for (let t = 1; t <= 10; t++) {
    BASE[`num.mult.table.${t}`] = {
        label: `Table de ${t}`,
        chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES],
        niveaux: [...(TABLE_NIVEAUX[t] || []), N.SIXIEME],
        prereqs: ['num.mult.sens'],
        descriptor: `Restituer instantanément les produits de la table de ${t}.`,
        lesson: t === 9
            ? 'Astuce table de 9 : 9 × n = 10 × n − n. Par exemple 9 × 7 = 70 − 7 = 63.'
            : `Table de ${t} : on ajoute ${t} à chaque fois. ${t} × 4 = ${t * 4}.`
    };
}

/** @type {Record<string, Skill>} */
export const SKILLS = Object.fromEntries(
    Object.entries(BASE).map(([id, s]) => [id, { id, ...s }])
);

export function getSkill(id) {
    return SKILLS[id] || null;
}

export function skillLabel(id) {
    const s = SKILLS[id];
    return s ? s.label : id;
}

export function allSkills() {
    return Object.values(SKILLS);
}

/** Résout un motif de compétence : 'num.mult.table.*' -> les 10 tables. */
export function matchSkills(pattern) {
    if (!pattern.includes('*')) return SKILLS[pattern] ? [pattern] : [];
    const rx = new RegExp('^' + pattern.split('*').map(escapeRx).join('.*') + '$');
    return Object.keys(SKILLS).filter(id => rx.test(id));
}

function escapeRx(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prérequis directs puis transitifs (ordre : du plus profond au plus proche). */
export function prereqChain(id, seen = new Set()) {
    const s = SKILLS[id];
    if (!s || seen.has(id)) return [];
    seen.add(id);
    const out = [];
    for (const p of s.prereqs || []) {
        out.push(...prereqChain(p, seen));
        if (!out.includes(p)) out.push(p);
    }
    return out;
}

/** Compétences qui dépendent directement de `id`. */
export function dependentsOf(id) {
    return allSkills().filter(s => (s.prereqs || []).includes(id)).map(s => s.id);
}
