// LA CALCULATRICE — le calcul, sans le clavier.
//
// Rémy : « crée un module calculatrice qu'on peut appeler en petite fenêtre
// modale flottante et draggable. Fais une jolie calculatrice sobre, avec un
// mode activable ou non scientifique (cos, sin, racine). »
//
// Ce fichier-ci ne dessine rien : il LIT une expression et rend un nombre.
// C'est tout ce qui mérite d'être testé — le reste est de la mise en page.
//
// PAS DE `eval`, ET CE N'EST PAS UNE COQUETTERIE. `eval` exécuterait n'importe
// quoi, ne connaît pas la virgule française, appelle la fonction sinus en
// RADIANS là où le collège travaille en degrés, et rend « 0.30000000000000004 »
// pour 0,1 + 0,2. On écrit donc l'analyseur : une pile d'opérateurs (l'algorithme
// de la gare de triage), et le compte est fait à la main.
//
// LES ANGLES SONT EN DEGRÉS. Au collège, cos(60) vaut 0,5 ; une calculatrice
// qui répond 0,952 (le cosinus de 60 radians) est une calculatrice fausse pour
// l'élève qui s'en sert.

/** Ce que la calculatrice sait faire, par ordre de priorité croissante. */
const OPERATEURS = {
    '+': { rang: 1, calcul: (a, b) => a + b },
    '−': { rang: 1, calcul: (a, b) => a - b },
    '-': { rang: 1, calcul: (a, b) => a - b },
    '×': { rang: 2, calcul: (a, b) => a * b },
    '*': { rang: 2, calcul: (a, b) => a * b },
    '÷': { rang: 2, calcul: (a, b) => a / b },
    '/': { rang: 2, calcul: (a, b) => a / b },
    '^': { rang: 4, calcul: (a, b) => a ** b, aDroite: true }
};

// Une fonction serre plus fort que n'importe quel opérateur ; le moins de
// signe serre plus fort que le produit, mais moins fort que la puissance —
// « −2² » vaut −4, et non 4.
const RANG_FONCTION = 5;
const RANG_UNAIRE = 3;

const rad = (d) => (d * Math.PI) / 180;

/** Les fonctions du mode scientifique. Les angles s'écrivent en DEGRÉS. */
export const FONCTIONS = {
    sin: (x) => Math.sin(rad(x)),
    cos: (x) => Math.cos(rad(x)),
    tan: (x) => Math.tan(rad(x)),
    '√': Math.sqrt,
    sqrt: Math.sqrt,
    ln: Math.log,
    log: Math.log10,
    abs: Math.abs
};

export const CONSTANTES = { π: Math.PI, pi: Math.PI, e: Math.E };

/**
 * Découpe une expression en jetons.
 * @returns {Array<{genre:string, valeur:*}>}
 * @throws {Error} sur un caractère qu'on ne sait pas lire
 */
export function jetons(expression) {
    const src = String(expression == null ? '' : expression)
        // La virgule française EST le séparateur décimal ; l'élève tape ce
        // qu'il écrit au cahier.
        .replace(/,/g, '.')
        // Les espaces des grands nombres ne comptent pas.
        .replace(/[\s  ]/g, '');
    const sortie = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/[0-9.]/.test(c)) {
            let j = i;
            while (j < src.length && /[0-9.]/.test(src[j])) j++;
            const morceau = src.slice(i, j);
            if ((morceau.match(/\./g) || []).length > 1) {
                throw new Error(`nombre impossible : ${morceau}`);
            }
            sortie.push({ genre: 'nombre', valeur: Number(morceau) });
            i = j;
            continue;
        }
        if (c === '(' || c === ')') { sortie.push({ genre: c }); i++; continue; }
        if (c === '%') { sortie.push({ genre: 'pourcent' }); i++; continue; }
        if (OPERATEURS[c]) { sortie.push({ genre: 'op', valeur: c }); i++; continue; }
        // Un nom : une fonction ou une constante.
        const nom = Object.keys({ ...FONCTIONS, ...CONSTANTES })
            .sort((a, b) => b.length - a.length)
            .find(n => src.startsWith(n, i));
        if (!nom) throw new Error(`caractère inconnu : ${c}`);
        sortie.push(FONCTIONS[nom]
            ? { genre: 'fonction', valeur: nom }
            : { genre: 'nombre', valeur: CONSTANTES[nom] });
        i += nom.length;
    }
    return sortie;
}

/**
 * Calcule une expression écrite à la main.
 *
 * @param {string} expression
 * @returns {number}
 * @throws {Error} si l'expression ne veut rien dire
 */
export function calculer(expression) {
    const lus = jetons(expression);
    if (!lus.length) throw new Error('rien à calculer');

    const nombres = [];
    const ops = [];

    const appliquer = () => {
        const op = ops.pop();
        if (op === undefined) throw new Error('parenthèse en trop');
        if (op.genre === 'fonction' || op.genre === 'unaire') {
            const x = nombres.pop();
            if (x === undefined) throw new Error(`${op.valeur} attend un nombre`);
            nombres.push(op.genre === 'unaire' ? -x : FONCTIONS[op.valeur](x));
            return;
        }
        const b = nombres.pop(), a = nombres.pop();
        if (a === undefined || b === undefined) throw new Error('il manque un nombre');
        nombres.push(OPERATEURS[op.valeur].calcul(a, b));
    };

    // Ce qui attend sur la pile a une force, et c'est elle qui décide de
    // l'ordre. Une fonction serre plus fort que tout : dans « √9 + 1 », la
    // racine ne prend que le 9.
    const force = (e) => (e.genre === 'fonction' ? RANG_FONCTION
        : e.genre === 'unaire' ? RANG_UNAIRE
            : OPERATEURS[e.valeur].rang);

    /** Vide la pile de tout ce qui doit se faire AVANT l'opérateur qui arrive. */
    const deplier = (rang, aDroite) => {
        while (ops.length) {
            const haut = ops[ops.length - 1];
            if (haut.genre === '(') break;
            const f = force(haut);
            if (f > rang || (f === rang && !aDroite)) appliquer();
            else break;
        }
    };

    let attendUnNombre = true;   // en tête d'expression, « − » est un signe
    for (const jeton of lus) {
        if (jeton.genre === 'nombre') {
            nombres.push(jeton.valeur);
            attendUnNombre = false;
        } else if (jeton.genre === 'fonction') {
            ops.push(jeton);
            attendUnNombre = true;
        } else if (jeton.genre === '(') {
            ops.push(jeton);
            attendUnNombre = true;
        } else if (jeton.genre === ')') {
            while (ops.length && ops[ops.length - 1].genre !== '(') appliquer();
            if (!ops.length) throw new Error('parenthèse fermée en trop');
            ops.pop();
            // Une fonction collée à sa parenthèse s'applique tout de suite.
            if (ops.length && ops[ops.length - 1].genre === 'fonction') appliquer();
            attendUnNombre = false;
        } else if (jeton.genre === 'pourcent') {
            const x = nombres.pop();
            if (x === undefined) throw new Error('% attend un nombre');
            nombres.push(x / 100);
            attendUnNombre = false;
        } else if (attendUnNombre) {
            // LE MOINS DE SIGNE N'EST PAS LE MOINS DE SOUSTRACTION, et ce
            // n'est pas non plus « 0 − » : écrit ainsi, « 5 × −4 » se lirait
            // « (5 × 0) − 4 » et rendrait −4. C'est un opérateur à lui seul,
            // qui ne prend qu'un nombre et serre plus fort que le produit.
            if (jeton.valeur === '−' || jeton.valeur === '-') {
                ops.push({ genre: 'unaire', valeur: '−' });
            } else if (jeton.valeur !== '+') {
                // « ×3 » en tête, ou « 2 ×× 3 » : il manque un nombre.
                throw new Error(`${jeton.valeur} attend un nombre avant lui`);
            }
            // Un « + » de signe ne fait rien : on l'oublie.
        } else {
            const { rang, aDroite } = OPERATEURS[jeton.valeur];
            deplier(rang, !!aDroite);
            ops.push(jeton);
            attendUnNombre = true;
        }
    }
    while (ops.length) {
        if (ops[ops.length - 1].genre === '(') throw new Error('parenthèse ouverte en trop');
        appliquer();
    }
    if (nombres.length !== 1) throw new Error('expression incomplète');
    const r = nombres[0];
    if (!Number.isFinite(r)) throw new Error('résultat impossible');
    return r;
}

/**
 * LE RÉSULTAT, ÉCRIT COMME AU CAHIER.
 *
 * Douze décimales de flottant ne sont pas une réponse : 0,1 + 0,2 doit donner
 * 0,3. On arrondit donc à dix chiffres significatifs — bien au-delà de ce
 * qu'un exercice de collège demande, et bien en deçà du bruit binaire — et l'on
 * écrit avec la virgule française.
 */
export function ecrire(x) {
    if (!Number.isFinite(x)) return 'Erreur';
    const arrondi = Number(x.toPrecision(10));
    if (Number.isInteger(arrondi) && Math.abs(arrondi) < 1e15) return String(arrondi);
    return String(arrondi).replace('.', ',');
}

/**
 * Le calcul et son écriture, sans jamais lever : la fenêtre affiche
 * « Erreur » plutôt que de casser.
 */
export function evaluerPourAffichage(expression) {
    try {
        return { ok: true, texte: ecrire(calculer(expression)) };
    } catch (e) {
        return { ok: false, texte: 'Erreur', pourquoi: e.message };
    }
}
