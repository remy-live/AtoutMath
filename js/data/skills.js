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
