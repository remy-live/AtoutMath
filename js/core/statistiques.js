// LES STATISTIQUES D'UNE SÉRIE — moyenne, médiane, étendue, fréquence.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de quatrième : « Statistique (Médiane, moyenne,
// étendue, fréquence: listes) ». Mesuré avant d'écrire une ligne : ZÉRO
// exercice sur 238 touchait ce chapitre.
//
// ── POURQUOI UN MODULE À PART, ET PAS QUATRE FONCTIONS DANS LE GÉNÉRATEUR ──
//
// Parce que ces quatre-là sont le SUJET du chapitre, et qu'un exercice doit
// pouvoir se tromper sans que la correction se trompe avec lui. Une moyenne
// fausse dans l'énoncé compte faux un élève qui a raison, et il n'a aucun
// moyen de le savoir — c'est la seule faute qu'on ne peut pas rattraper.
//
// Elles reviendront d'ailleurs ailleurs : le tableur sait déjà écrire
// `=MOYENNE(A1:A4)`, et la fiche de statistiques voudra les mêmes nombres.
//
// Pur : ni DOM, ni hasard, ni couleur. Tout s'éprouve sous Node.

/**
 * LA MOYENNE — la somme divisée par l'effectif.
 *
 * ON NE REND PAS UN NOMBRE ARRONDI. Une moyenne de 12,333… existe, et c'est
 * l'appelant qui décide d'en faire quelque chose : le générateur, lui, CHOISIT
 * des séries dont la moyenne tombe juste (voir `serieDeMoyenne`), parce qu'un
 * élève de quatrième qui tape 12,33 au lieu de 12,3333 n'a pas fait d'erreur
 * de raisonnement. Arrondir ici cacherait ce choix au lieu de le montrer.
 */
export function moyenne(serie) {
    const liste = (serie || []).map(Number).filter(Number.isFinite);
    if (!liste.length) return null;
    return liste.reduce((s, x) => s + x, 0) / liste.length;
}

/**
 * LA MÉDIANE — la valeur qui coupe la série en deux parts égales.
 *
 * ── LES DEUX PIÈGES DU CHAPITRE, ET ILS SONT TOUS LES DEUX ICI ─────────────
 *
 * 1. ON TRIE D'ABORD. La médiane de 7, 2, 9 est 7, pas 2 : c'est la valeur du
 *    milieu de la série RANGÉE. Un élève qui prend le terme du milieu de la
 *    liste telle qu'elle est écrite trouve un nombre qui n'a aucun sens — et
 *    rien ne l'avertit, puisque c'est bien un nombre de la série.
 * 2. SUR UNE SÉRIE PAIRE, LA MÉDIANE N'EST PAS DANS LA SÉRIE. Pour 10, 11, 12,
 *    13, elle vaut 11,5 : la moyenne des deux valeurs du milieu. Chercher « la
 *    valeur du milieu » n'a alors aucun sens, il y en a deux.
 *
 * On trie une COPIE : trier la série de l'appelant changerait l'énoncé qu'il
 * vient d'écrire, et la question « range cette série » deviendrait déjà rangée.
 */
export function mediane(serie) {
    const liste = (serie || []).map(Number).filter(Number.isFinite).slice().sort((a, b) => a - b);
    const n = liste.length;
    if (!n) return null;
    const demi = Math.floor(n / 2);
    return n % 2 ? liste[demi] : (liste[demi - 1] + liste[demi]) / 2;
}

/** L'ÉTENDUE — la plus grande moins la plus petite. Elle dit si la série est serrée. */
export function etendue(serie) {
    const liste = (serie || []).map(Number).filter(Number.isFinite);
    if (!liste.length) return null;
    return Math.max(...liste) - Math.min(...liste);
}

/** COMBIEN DE FOIS cette valeur apparaît dans la série. */
export const effectif = (serie, valeur) =>
    (serie || []).filter(x => Number(x) === Number(valeur)).length;

/**
 * LA FRÉQUENCE — l'effectif rapporté au total, en pourcentage.
 *
 * `null` SUR UNE SÉRIE VIDE, et non zéro : zéro est une fréquence possible
 * (« aucun élève n'a eu 20 »), et la confondre avec « on ne sait pas » ferait
 * écrire « 0 % » sous un tableau qui n'a aucune donnée.
 */
export function frequence(serie, valeur) {
    const n = (serie || []).length;
    if (!n) return null;
    return (effectif(serie, valeur) / n) * 100;
}

/** La série rangée dans l'ordre croissant — une copie, toujours. */
export const rangee = (serie) =>
    (serie || []).map(Number).filter(Number.isFinite).slice().sort((a, b) => a - b);

/**
 * LES VALEURS DISTINCTES ET LEUR EFFECTIF, dans l'ordre croissant.
 *
 * C'est le tableau d'effectifs du cours, et c'est sous cette forme qu'on le
 * lit sur une feuille : une ligne de valeurs, une ligne de « combien de fois ».
 */
export function tableauDEffectifs(serie) {
    const compte = new Map();
    for (const x of (serie || []).map(Number).filter(Number.isFinite)) {
        compte.set(x, (compte.get(x) || 0) + 1);
    }
    return [...compte.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([valeur, n]) => ({ valeur, effectif: n }));
}

/**
 * UNE SÉRIE DONT LA MOYENNE TOMBE JUSTE.
 *
 * ── POURQUOI ON FABRIQUE LA SÉRIE AU LIEU DE LA TIRER ──────────────────────
 *
 * Tirer `n` nombres au hasard donne une moyenne entière une fois sur `n`. Les
 * autres fois on obtient 12,857142… — et il faut alors soit arrondir, soit
 * jeter le tirage. Arrondir est hors de question : l'élève qui calcule juste
 * taperait une valeur différente de celle attendue et serait compté faux sur
 * une question où il a raison. Jeter marche, mais c'est une boucle dont on ne
 * sait pas dire quand elle finit.
 *
 * ON PART DONC DE LA RÉPONSE. On choisit la moyenne, puis des écarts dont la
 * somme est NULLE : la moyenne est alors exacte par construction, et aucune
 * boucle ne cherche quoi que ce soit.
 *
 * ── ET LA SOMME COURANTE RESTE BORNÉE, CE QUI N'EST PAS UN DÉTAIL ──────────
 *
 * Le dernier écart rattrape tout le reste : c'est lui qui rend la somme nulle.
 * Laissé libre, il peut valoir n'importe quoi — six écarts tirés dans
 * [−4 ; 4] peuvent faire −14, et la dernière valeur vaut alors m + 14.
 *
 * MESURÉ, par une épreuve écrite pour autre chose : « Voici les notes sur 20
 * obtenues par 7 élèves. 10 ; 9 ; 8 ; 9 ; 9 ; 13 ; 26 ». La moyenne était
 * juste, tous les calculs étaient justes, et la série était impossible.
 *
 * ON BORNE DONC LA SOMME COURANTE à chaque tirage : tant qu'elle reste dans
 * [−ecart ; ecart], son opposé y est aussi, et TOUTES les valeurs tiennent
 * dans [m − ecart ; m + ecart] — la dernière comme les autres. L'intervalle de
 * tirage ne devient jamais vide, et c'est vérifiable à la main : si la somme
 * vaut +ecart, on tire dans [−ecart ; 0] ; si elle vaut −ecart, dans
 * [0 ; ecart].
 *
 * @param {number} m       la moyenne voulue
 * @param {number} n       combien de valeurs
 * @param {Function} tirer `(min, max) => entier`, le hasard de l'appelant
 * @param {number} ecart   l'écart maximum autour de la moyenne — TENU, y
 *                         compris par la dernière valeur
 */
export function serieDeMoyenne(m, n, tirer, ecart = 4) {
    const ecarts = [];
    let somme = 0;
    for (let i = 0; i < n - 1; i++) {
        const e = tirer(Math.max(-ecart, -ecart - somme), Math.min(ecart, ecart - somme));
        ecarts.push(e);
        somme += e;
    }
    ecarts.push(-somme);
    const serie = ecarts.map(e => m + e);
    const minimum = Math.min(...serie);
    // Une note négative n'existe pas : on remonte toute la série d'un bloc, ce
    // qui déplace la moyenne d'autant — et l'appelant la relit, il ne la
    // suppose pas.
    return minimum < 0 ? serie.map(x => x - minimum) : serie;
}

/**
 * ÉCRIRE UN NOMBRE COMME ON L'ÉCRIT EN FRANÇAIS : la virgule, pas le point.
 *
 * `11.5` sorti tel quel d'un calcul JavaScript s'affiche « 11.5 » — une
 * écriture anglaise au milieu d'un énoncé français. Et l'on ne garde pas les
 * décimales inutiles : 12 s'écrit « 12 », pas « 12,0 ».
 */
export function enFrancais(x, decimales = 2) {
    if (x === null || x === undefined || !Number.isFinite(Number(x))) return '';
    const arrondi = Number(Number(x).toFixed(decimales));
    return String(arrondi).replace('.', ',');
}

// ── LA MOYENNE QUI S'ÉCRIT, ET CELLE QU'ON PONDÈRE ──────────────────────────
//
// RÉMY, le 17 novembre : « pour la moyenne il faudrait que l'élève écrive le
// calcul (avec parenthèses) et il faut de la moyenne pondérée ».
//
// C'EST EXACTEMENT LA LEÇON DU TABLEUR, qu'il avait déjà tranchée une fois :
// « la bonne réponse est =A1+B1 pas 17 ». Un élève qui tape 15 a peut-être
// compris, ou peut-être deviné ; un élève qui écrit (12+15+18)/3 a montré la
// seule chose qu'on cherche à lui apprendre.
//
// ET LES PARENTHÈSES NE SONT PAS UN DÉTAIL DE FORME : 12+15+18/3 vaut 33, et
// c'est LA faute du chapitre. Elle se voit ici, et seulement ici.

/**
 * LIT UN CALCUL ÉCRIT PAR UN ÉLÈVE, et rend sa valeur — ou `null`.
 *
 * ── POURQUOI UN ANALYSEUR DE TRENTE LIGNES PLUTÔT QUE CELUI DU DÉPÔT ──────
 *
 * `maths/formule.js` sait lire bien plus que cela : des lettres, des racines,
 * des exposants, des produits implicites. C'est précisément ce qu'on ne veut
 * pas ici — « 3(12+15) » y serait un produit valide, et l'on accepterait une
 * écriture qu'aucun professeur ne lirait comme une moyenne. La grammaire est
 * donc explicite et fermée : des nombres, quatre signes, des parenthèses.
 *
 * ET JAMAIS `eval`. La saisie vient d'un élève ; elle part dans le journal,
 * puis au serveur. On ne donne pas l'interpréteur à une chaîne qu'on n'a pas
 * écrite, même dans un exercice de quatrième.
 *
 * @returns {?{valeur:number, nombres:number[], parentheses:boolean}}
 */
export function lireCalcul(saisie) {
    const src = String(saisie == null ? '' : saisie)
        .replace(/\s+/g, '')
        .replace(/,/g, '.')
        .replace(/[×x*]/g, '*')
        .replace(/[÷:]/g, '/')
        .replace(/[−–—]/g, '-');
    if (!src || !/^[0-9.+\-*/()]+$/.test(src)) return null;
    const nombres = [];
    let i = 0;
    const fin = () => i >= src.length;
    const voir = () => src[i];

    function facteur() {
        if (voir() === '-') { i++; const f = facteur(); return f === null ? null : -f; }
        if (voir() === '(') {
            i++;
            const v = somme();
            if (voir() !== ')') return null;
            i++;
            return v;
        }
        const d = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i));
        if (!d) return null;
        i += d[0].length;
        const n = Number(d[0]);
        nombres.push(n);
        return n;
    }
    function produit() {
        let g = facteur();
        while (g !== null && (voir() === '*' || voir() === '/')) {
            const op = src[i++];
            const d = facteur();
            if (d === null) return null;
            // DIVISER PAR ZÉRO N'EST PAS UNE RÉPONSE, c'est une saisie à
            // refuser : l'infini remonterait jusqu'à la comparaison et
            // vaudrait « faux » sans qu'on sache pourquoi.
            if (op === '/' && d === 0) return null;
            g = op === '*' ? g * d : g / d;
        }
        return g;
    }
    function somme() {
        let g = produit();
        while (g !== null && (voir() === '+' || voir() === '-')) {
            const op = src[i++];
            const d = produit();
            if (d === null) return null;
            g = op === '+' ? g + d : g - d;
        }
        return g;
    }

    const v = somme();
    if (v === null || !fin() || !Number.isFinite(v)) return null;
    return { valeur: v, nombres, parentheses: src.includes('(') };
}

/** Deux listes portent-elles exactement les mêmes nombres, répétitions comprises ? */
export function memesNombres(a, b) {
    if (a.length !== b.length) return false;
    const tri = (l) => l.slice().sort((x, y) => x - y);
    const [p, q] = [tri(a), tri(b)];
    return p.every((x, k) => Math.abs(x - q[k]) < 1e-9);
}

/**
 * LE CALCUL D'UNE MOYENNE EST-IL CELUI QU'ON ATTEND ?
 *
 * TROIS REFUS, ET CHACUN DIT AUTRE CHOSE À L'ÉLÈVE :
 *
 *   · ce n'est pas un calcul lisible → on le lui dit, sans le juger ;
 *   · le calcul est juste mais la SOMME a été faite de tête (« 45/3 ») → on
 *     redemande le calcul entier, puisque c'est lui la réponse ;
 *   · le calcul est écrit mais faux → on ne dit PAS lequel est juste, on
 *     montre l'endroit : la somme d'abord, la division ensuite.
 *
 * LE QUATRIÈME CAS EST CELUI QUI COMPTE : « 12+15+18/3 » porte bien tous les
 * nombres et donne 33. On refuse sur la VALEUR, et le message nomme la cause —
 * c'est la faute du chapitre, et elle mérite sa phrase.
 *
 * @param {string} saisie   ce que l'élève a tapé
 * @param {number[]} valeurs la série (ou les produits, pour une pondérée)
 * @param {number} diviseur  l'effectif
 */
export function verifieMoyenneEcrite(saisie, valeurs, diviseur) {
    const lu = lireCalcul(saisie);
    if (!lu) {
        return { juste: false, pourquoi: 'Je n’arrive pas à lire ce calcul. '
            + 'Il s’écrit avec des nombres, des +, une barre / et des parenthèses.' };
    }
    const attendue = valeurs.reduce((a, b) => a + b, 0) / diviseur;
    const voulus = valeurs.concat([diviseur]);
    if (!memesNombres(lu.nombres, voulus)) {
        return { juste: false, pourquoi: 'Écris le calcul EN ENTIER : toutes les valeurs '
            + `additionnées, puis la division par ${diviseur}. C’est le calcul qu’on `
            + 'te demande, pas seulement son résultat.' };
    }
    if (Math.abs(lu.valeur - attendue) > 1e-9) {
        return { juste: false, pourquoi: 'Les nombres y sont, mais le calcul ne donne pas '
            + `la moyenne : sans parenthèses, seule la DERNIÈRE valeur est divisée par `
            + `${diviseur}. La somme entière doit l’être.` };
    }
    return { juste: true };
}
