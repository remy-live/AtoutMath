// LES ARBRES DE CALCULS — le noyau : une forme, des nombres, deux lectures.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre, la capture d'un fil de profs où une collègue demande :
// « Savez-vous où je peux trouver ces types d'arbres de calculs "éditables"
// (avant que je ne me lance sur leur fabrication chronophage ….) ? ». Une
// seule réponse sous le fil : « Latex… Le super package ProfCollege ».
// Rémy : « Et ce genre d exercice ».
//
// L'EXERCICE, en deux questions qui sont le même objet vu deux fois :
//
//   1. RECOPIER ET COMPLÉTER — les nombres du haut sont donnés, chaque
//      opération descend son résultat dans la case du dessous, et la dernière
//      case est rouge.
//   2. ÉCRIRE L'EXPRESSION « EN LIGNE » — (−0,6 × (−5) + (−0,4)) × (−8 − 2).
//
// ── CE QUE ÇA TRAVAILLE, ET CE N'EST PAS LE CALCUL ──────────────────────────
//
// Un élève de cinquième sait faire −0,6 × (−5). Ce qu'il ne sait pas faire,
// c'est écrire en UNE ligne un calcul qui a une forme d'arbre : il oublie les
// parenthèses, et le produit d'une somme devient une somme de produits. L'arbre
// rend visible ce que les parenthèses disent. La question 2 demande exactement
// de passer d'une écriture à l'autre, et c'est elle qui apprend quelque chose.
//
// ── CE FICHIER NE DESSINE RIEN ──────────────────────────────────────────────
//
// Il bâtit l'arbre, le calcule, le place sur une grille de lignes et de
// colonnes, l'écrit en ligne, et dit si la ligne d'un élève vaut la bonne.
// L'écran et la fiche imprimée lisent la même description.

import { calculer } from './calculatrice.js';

/**
 * LES FORMES D'ARBRE, écrites comme des couples imbriqués.
 *
 * `null` est une feuille — une case du haut, où l'on écrit un nombre donné ;
 * un couple `[gauche, droite]` est une opération. Rien d'autre.
 *
 * ON NE TIRE PAS LA FORME AU HASARD, on choisit dans une liste écrite à la
 * main. Un arbre de cinq feuilles a quatorze formes possibles, dont la moitié
 * sont des escaliers de cinq étages : sur un téléphone, cinq étages, ce sont
 * des cases de quarante pixels. Les formes d'ici ont trois étages au plus et
 * se regardent d'un coup d'œil.
 */
const F = null;
export const FORMES = {
    petit: [[[F, F], F], [F, [F, F]]],
    moyen: [[[F, F], [F, F]], [[[F, F], F], F], [F, [[F, F], F]]],
    // LA PREMIÈRE EST CELLE DU MANUEL de Rémy, trait pour trait : deux
    // nombres entrent dans une opération, le résultat et un troisième nombre
    // dans une deuxième, deux autres nombres dans une troisième, et les deux
    // résultats se rejoignent en bas.
    grand: [[[[F, F], F], [F, F]], [[F, F], [[F, F], F]], [[[F, F], [F, F]], F]]
};

export const TAILLES = {
    petit: { nom: 'Trois nombres, deux opérations', formes: FORMES.petit },
    moyen: { nom: 'Quatre nombres, trois opérations', formes: FORMES.moyen },
    grand: { nom: 'Cinq nombres, quatre opérations', formes: FORMES.grand }
};

/**
 * LES NOMBRES DU HAUT, et ce qu'on tolère comme résultat.
 *
 * `decimales` borne les RÉSULTATS, pas les feuilles : deux décimaux à un
 * chiffre après la virgule qu'on multiplie en donnent deux, et c'est ce que
 * fait le manuel (−0,6 × (−5) = 3 ; 3 + (−0,4) = 2,6). Au-delà, on retire
 * l'arbre et l'on retire : un résultat à quatre décimales n'est pas un
 * exercice de cinquième, c'est une faute de frappe qui a l'air d'un exercice.
 */
export const NOMBRES = {
    entiers: {
        nom: 'Des entiers positifs', decimales: 0,
        tirer: (rng) => rng.int(2, 12)
    },
    relatifs: {
        nom: 'Des entiers relatifs', decimales: 0,
        tirer: (rng) => rng.int(1, 12) * (rng.int(0, 1) ? 1 : -1)
    },
    decimaux: {
        nom: 'Des décimaux relatifs', decimales: 2,
        // UN DÉCIMAL SUR DEUX EST UN ENTIER, et c'est voulu : l'arbre du
        // manuel mêle −0,6 et −5. Un arbre dont les cinq nombres ont une
        // virgule se calcule à la calculatrice, pas de tête.
        tirer: (rng) => {
            const signe = rng.int(0, 1) ? 1 : -1;
            if (rng.int(0, 1)) return signe * rng.int(1, 12);
            return Math.round(signe * (rng.int(2, 120) / 10) * 10) / 10;
        }
    }
};

export const OPERATIONS = {
    'plus-moins': { nom: 'Additions et soustractions', signes: ['+', '−'] },
    'sans-division': { nom: 'Sans division', signes: ['+', '−', '×'] },
    toutes: { nom: 'Les quatre opérations', signes: ['+', '−', '×', '÷'] }
};

const CALCULS = {
    '+': (a, b) => a + b,
    '−': (a, b) => a - b,
    '×': (a, b) => a * b,
    '÷': (a, b) => (b === 0 ? null : a / b)
};

/** La force d'une opération : × et ÷ serrent plus fort que + et −. */
const RANG = { '+': 1, '−': 1, '×': 2, '÷': 2 };

/** Le nombre, écrit à la française, sans traîner de zéros. */
export function nombreFr(v) {
    const arrondi = Math.round(v * 1e6) / 1e6;
    return String(arrondi).replace('.', ',').replace('-', '−');
}

/** Combien de chiffres après la virgule, une fois les flottants rangés. */
export const decimalesDe = (v) => {
    const t = String(Math.round(v * 1e6) / 1e6);
    const i = t.indexOf('.');
    return i < 0 ? 0 : t.length - i - 1;
};

/**
 * BÂTIT L'ARBRE À PARTIR D'UNE FORME, et le place sur sa grille.
 *
 * Les feuilles reçoivent leur colonne dans l'ordre de lecture ; un nœud se
 * met au MILIEU de ses deux enfants, et descend d'une ligne. C'est la mise en
 * page du manuel, obtenue sans la décrire : le résultat d'une opération se
 * retrouve tout seul sur la même ligne que le nombre avec lequel il va
 * ensuite se combiner.
 */
export function batir(forme, signes, valeurs) {
    const feuilles = [];
    const noeuds = [];
    let rangSigne = 0, rangValeur = 0;

    const monter = (f, profondeur) => {
        if (f === null) {
            const n = {
                genre: 'feuille', profondeur,
                colonne: feuilles.length,
                valeur: valeurs[rangValeur++]
            };
            feuilles.push(n);
            return n;
        }
        const g = monter(f[0], profondeur + 1);
        const d = monter(f[1], profondeur + 1);
        const n = {
            genre: 'noeud', profondeur, g, d,
            op: signes[rangSigne++],
            colonne: (g.colonne + d.colonne) / 2
        };
        noeuds.push(n);
        return n;
    };

    const racine = monter(forme, 0);
    const profondeurMax = Math.max(...feuilles.map(f => f.profondeur));
    const tous = [...feuilles, ...noeuds];
    tous.forEach(n => { n.ligne = profondeurMax + 1 - n.profondeur; });
    // LES CASES À REMPLIR SONT NUMÉROTÉES DANS L'ORDRE OÙ ON LES LIT — par
    // ligne, puis de gauche à droite —, et non dans l'ordre où l'arbre les a
    // construites. L'élève remplit dans l'ordre de l'écran ; la réponse
    // attendue doit porter les mêmes noms que ce qu'il voit.
    const aRemplir = noeuds.slice()
        .sort((a, b) => (a.ligne - b.ligne) || (a.colonne - b.colonne));
    aRemplir.forEach((n, i) => { n.id = `r${i + 1}`; });
    feuilles.forEach((f, i) => { f.id = `f${i + 1}`; });

    return { racine, feuilles, noeuds: aRemplir, lignes: profondeurMax + 1 };
}

/**
 * CALCULE L'ARBRE, ou dit pourquoi il ne vaut rien.
 *
 * Rend `false` dès qu'un résultat sort du cadre : division par zéro, décimale
 * de trop, nombre trop grand. On ne répare pas, on retire — un arbre réparé
 * après coup a des nombres qui ne vont pas ensemble, et cela se voit.
 */
export function calculerArbre(arbre, { decimales = 0, plafond = 10000, positif = false } = {}) {
    // L'ORDRE DE LECTURE EST UN ORDRE DE CALCUL, et ce n'est pas un hasard :
    // un nœud est d'une ligne PLUS BAS que ses deux enfants, donc il vient
    // après eux dans un tri par ligne. On peut descendre l'arbre d'un seul
    // parcours, sans récursion ni file d'attente.
    for (const n of arbre.noeuds) {
        const a = n.g.valeur, b = n.d.valeur;
        if (a === null || b === null) return false;
        const v = CALCULS[n.op](a, b);
        if (v === null || !Number.isFinite(v)) return false;
        if (Math.abs(v) > plafond) return false;
        if (decimalesDe(v) > decimales) return false;
        // ZÉRO N'EST JAMAIS UN BON RÉSULTAT INTERMÉDIAIRE : multiplié, il
        // efface toute la branche qui le précède, et l'élève qui a trouvé 0
        // n'a plus rien à faire. On retire l'arbre.
        if (Math.abs(v) < 1e-9) return false;
        // ET EN NOMBRES POSITIFS, AUCUN RÉSULTAT NÉGATIF. « Des entiers
        // positifs » est le réglage de sixième : un arbre qui passe par
        // −11 en chemin demande les relatifs, qu'on n'a pas encore vus.
        if (positif && v < 0) return false;
        n.valeur = Math.round(v * 1e6) / 1e6;
    }
    return true;
}

/**
 * LES PARENTHÈSES DE CETTE LIGNE SERVENT-ELLES À QUELQUE CHOSE ?
 *
 * C'EST LA QUESTION QUI FAIT LE BON ARBRE, et on ne l'avait pas posée : trois
 * additions et un produit en bas donnent « 3 + 5 + 1 × (−3) − 8 », qui vaut
 * la même chose sans aucune parenthèse. L'arbre est joli, le calcul est juste,
 * et la question 2 n'apprend RIEN — alors qu'elle existe tout entière pour la
 * parenthèse oubliée. Mesuré en relisant les lignes produites : un tirage sur
 * deux était dans ce cas.
 *
 * On ne raisonne pas sur la forme, on MESURE : on retire toutes les
 * parenthèses et l'on regarde si la valeur change.
 */
export function parenthesesUtiles(arbre) {
    const ligne = enLigne(arbre.racine);
    if (!ligne.includes('(')) return false;
    const nu = ligne.replace(/[()]/g, '');
    try {
        return Math.abs(calculer(nu) - arbre.racine.valeur) > 1e-9;
    } catch (e) {
        // Une ligne qui ne se lit même plus sans ses parenthèses en a besoin.
        return true;
    }
}

/**
 * L'EXPRESSION EN LIGNE, avec les parenthèses qu'il faut et pas une de plus.
 *
 * UN NOMBRE NÉGATIF PREND SES PARENTHÈSES DÈS QU'IL N'OUVRE PAS LA LIGNE —
 * ou le morceau de ligne entre parenthèses : « −0,6 × (−5) », « −8 − 2 »,
 * « (−8 − 11 + (−1) + 5) × 3 ». C'est l'usage du collège, et c'est le seul
 * endroit où les parenthèses d'un NOMBRE servent : « (−8) − 2 » n'apprend
 * rien à personne et alourdit la ligne de deux signes.
 *
 * LA RÈGLE PORTE SUR CE QUI PRÉCÈDE DANS LE TEXTE, pas sur la place dans
 * l'arbre, et c'est la correction. Écrite « à droite d'une opération », elle
 * laissait passer « −8 − 11 + −1 + 5 » : le −1 est le fils GAUCHE de sa
 * somme, donc elle ne le parenthésait pas, alors qu'il suit un + dans la
 * ligne. Vu en relisant les lignes produites.
 */
export function enLigne(noeud, { parent = null, aDroite = false, enTete = true } = {}) {
    if (noeud.genre === 'feuille') {
        const t = nombreFr(noeud.valeur);
        return (noeud.valeur < 0 && !enTete) ? `(${t})` : t;
    }
    // ON DÉCIDE DE LA PARENTHÈSE AVANT DE DESCENDRE, parce que les enfants en
    // dépendent : dès qu'un sous-arbre est mis entre parenthèses, son premier
    // nombre redevient « en tête », et un négatif en tête ne se parenthèse pas.
    const mien = RANG[noeud.op];
    const besoin = parent !== null && (
        mien < RANG[parent.op]
        // À force égale, l'ordre compte du côté droit d'un − ou d'un ÷ :
        // 10 − (3 − 1) n'est pas 10 − 3 − 1.
        || (mien === RANG[parent.op] && aDroite
            && (parent.op === '−' || parent.op === '÷')));
    const g = enLigne(noeud.g, { parent: noeud, aDroite: false, enTete: besoin || enTete });
    const d = enLigne(noeud.d, { parent: noeud, aDroite: true, enTete: false });
    const texte = `${g} ${noeud.op} ${d}`;
    return besoin ? `(${texte})` : texte;
}

/**
 * CE QUE L'ÉCRAN ENVOIE QUAND ON A REMPLI LES CASES.
 * `r1:3;r2:2,6;r3:−10;r4:−26`, dans l'ordre de lecture.
 */
export const ecrireCases = (noeuds) => 'a' + noeuds
    .map(n => `${n.id}:${nombreFr(n.valeur)}`).join(';');

/**
 * LES SIGNES QU'UN ÉLÈVE PEUT TAPER POUR LES QUATRE OPÉRATIONS.
 *
 * `:` est la division du manuel de Rémy — c'est le signe dessiné dans son
 * arbre b. La calculatrice du dépôt ne le connaît pas, et on ne le lui
 * apprend pas : elle a des TOUCHES, et aucune ne porte ce signe. On traduit
 * donc ici, à l'entrée de cet exercice-ci.
 */
export function normaliserLigne(texte) {
    return String(texte || '')
        .replace(/[xX*]/g, '×')
        .replace(/[:/]/g, '÷')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Les nombres écrits dans un texte, en valeur absolue, dans l'ordre. */
export function nombresDe(texte) {
    return (String(texte || '').match(/\d+(?:[.,]\d+)?/g) || [])
        .map(t => Number(t.replace(',', '.')));
}

/**
 * LA LIGNE DE L'ÉLÈVE EST-ELLE CELLE DE L'ARBRE ?
 *
 * DEUX CONDITIONS, ET ELLES SE COMPLÈTENT :
 *
 *   · ELLE VAUT LA MÊME CHOSE. C'est la question posée : une parenthèse
 *     oubliée change la valeur, et c'est exactement la faute qu'on guette.
 *   · ELLE EMPLOIE LES MÊMES NOMBRES, chacun autant de fois. Sans cela,
 *     « −26 » — le résultat recopié depuis la case rouge — vaudrait la bonne
 *     chose et passerait pour une expression.
 *
 * On ne compare PAS les deux textes : une expression juste s'écrit de
 * plusieurs façons — parenthèses en plus, facteurs échangés — et refuser
 * « (−8 − 2) × (−0,6 × (−5) + (−0,4)) » serait refuser une réponse juste.
 */
export function ligneJuste(texte, { valeur: attendue, nombres = [] } = {}) {
    const propre = normaliserLigne(texte);
    if (!propre) return false;
    let valeur;
    try { valeur = calculer(propre); } catch (e) { return false; }
    if (!Number.isFinite(valeur)) return false;
    if (Math.abs(valeur - attendue) > 1e-6) return false;
    const attendus = nombres.map(v => Math.abs(v)).sort((a, b) => a - b);
    const lus = nombresDe(propre).sort((a, b) => a - b);
    if (lus.length !== attendus.length) return false;
    return lus.every((v, i) => Math.abs(v - attendus[i]) < 1e-9);
}

/**
 * LA GÉOMÉTRIE DE L'ARBRE, EN PIXELS, pour une largeur et un nombre de lignes.
 *
 * Elle est au noyau, et non dans l'activité : elle ne touche pas au DOM, et
 * c'est la seule façon de la mesurer sans ouvrir un navigateur — notamment
 * pour vérifier que deux cases d'une même ligne ne se chevauchent jamais, ce
 * qu'aucune épreuve ne saurait dire autrement.
 *
 * ELLE REND DES PIXELS, PAS DES UNITÉS À METTRE À L'ÉCHELLE. Un dessin posé
 * dans un `viewBox` réduit par le CSS rend, sur un téléphone, des nombres de
 * sept pixels de haut, avec tous les compteurs au vert. Payé trois fois ce
 * mois-ci.
 */
export function geometrie(largeur, colonnes, lignes) {
    const l = Math.max(260, Math.round(largeur || 0) || 340);
    const marge = 2;
    // LA CASE PREND CE QUI RESTE une fois les colonnes posées, entre 46 et 86
    // pixels : sous 46 px, « −10,5 » ne tient plus dedans ; au-delà de 86, un
    // arbre de trois colonnes devient une affiche.
    const large = Math.max(46, Math.min(86, (l - 2 * marge) / (colonnes + 0.2)));
    const pasX = colonnes > 1 ? (l - 2 * marge - large) / (colonnes - 1) : 0;
    const haut = Math.max(30, Math.min(40, large * 0.52));
    // L'ÉCART ENTRE DEUX LIGNES LOGE LA CASE, LE ROND DE L'OPÉRATION ET LES
    // DEUX FLÈCHES. Moins de 78 pixels, et le rond touche les cases.
    const pasY = Math.max(78, haut + 52);
    return {
        l, marge, large, haut, pasX, pasY,
        hauteur: haut + (lignes - 1) * pasY + 4,
        x: (colonne) => marge + colonne * pasX,
        y: (ligne) => (ligne - 1) * pasY
    };
}

/** Le nombre tapé par l'élève, relu. `null` quand il ne veut encore rien dire. */
export function lireSaisie(texte) {
    const t = String(texte || '').replace('−', '-').replace(',', '.').trim();
    if (!t || t === '-' || t === '.' || t === '-.') return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
}
