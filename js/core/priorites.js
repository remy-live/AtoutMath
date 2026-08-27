// LES PRIORITÉS OPÉRATOIRES — le noyau : l'expression, l'opération à faire,
// et la réécriture ligne à ligne.
//
// Il existe déjà un exercice de priorités en QCM (calc.priorites) : on désigne
// l'opération prioritaire, ou l'on choisit le résultat parmi quatre. Celui-ci
// est autre chose, et c'est la différence qui le justifie — ON RÉÉCRIT.
//
//     3 + 4 × 5 − 2
//     3 + 20 − 2          ← on a fait 4 × 5, on RECOPIE le reste
//     23 − 2
//     21
//
// Recopier est l'exercice. L'élève qui « sait » que la multiplication passe
// d'abord perd quand même ses points parce qu'il calcule 4 × 5 puis oublie le
// « − 2 », ou recopie 3 + 20 en 3 × 20. Un QCM ne voit jamais cette faute-là :
// elle n'apparaît qu'en écrivant la ligne suivante.
//
// DEUX GESTES PAR LIGNE, ET DANS CET ORDRE : on désigne d'abord l'opération
// prioritaire (on la souligne), puis on donne son résultat. Séparer les deux
// est ce qui permet de dire à l'élève LEQUEL des deux il a raté — désigner la
// bonne opération et se tromper dans le calcul n'est pas la même erreur que
// calculer juste la mauvaise opération.
//
// LA RAISON EST TOUJOURS DITE. Ce n'est pas « c'est celle-là », c'est « les
// parenthèses d'abord », « × et ÷ avant + et − », ou « à égalité, de gauche à
// droite ». Ces trois phrases SONT la leçon ; le reste n'en est que
// l'application.

/** Les jetons d'une expression : des nombres, des opérateurs, des parenthèses. */
export const nombre = (v) => ({ type: 'n', valeur: v });
export const operateur = (op) => ({ type: 'op', op });
export const ouvrante = () => ({ type: '(' });
export const fermante = () => ({ type: ')' });

/**
 * UNE PUISSANCE EST UN JETON, PAS UNE OPÉRATION ENTRE DEUX JETONS.
 *
 * Rémy : « des priorités avec les puissances. Tu as déjà un moteur hyper
 * complet sur les priorités. » Il a raison, et l'ajout tient dans une idée :
 * « 4² » ne s'écrit pas comme « 4 × 5 ». Il n'y a pas de signe entre deux
 * nombres, il y a UN nombre qui porte son exposant — donc un jeton, qui se
 * réduit tout seul en un autre jeton.
 *
 * C'est aussi ce qui la rend facile à souligner : l'élève clique la puissance
 * elle-même, comme il cliquerait un × .
 */
export const puissance = (base, exp) => ({ type: 'p', base, exp });

const FORTES = ['×', '÷'];
const FAIBLES = ['+', '-'];

const EXPOSANTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const enHaut = (n) => String(n).split('').map(c => EXPOSANTS[c] || c).join('');

/** « 4² » — la puissance telle qu'on l'écrit au tableau. */
export const ecrirePuissance = (j) => `${j.base}${enHaut(j.exp)}`;

/** L'expression telle qu'on l'écrit — avec le vrai signe moins. */
export function ecrire(jetons) {
    let out = '';
    jetons.forEach((j, i) => {
        const avant = jetons[i - 1];
        // Pas d'espace après une parenthèse ouvrante ni avant une fermante :
        // « ( 3 + 4 ) » n'est pas ce qu'on écrit au tableau.
        const colle = !avant || avant.type === '(' || j.type === ')';
        if (!colle) out += ' ';
        if (j.type === 'n') out += String(j.valeur).replace('.', ',');
        else if (j.type === 'p') out += ecrirePuissance(j);
        else if (j.type === 'op') out += j.op === '-' ? '−' : j.op;
        else out += j.type;
    });
    return out;
}

/**
 * LIRE UNE EXPRESSION ÉCRITE À LA MAIN — l'inverse d'`ecrire`.
 *
 * Rémy : « on ne peut pas changer les calculs du 33 (attention à la
 * correction) ». Sur la fiche, on récrit déjà un titre, une consigne, un
 * énoncé ; la cascade des priorités, elle, se dessinait toute seule et n'offrait
 * aucune prise. Or c'est l'exercice qu'un professeur veut le plus retoucher :
 * il a SES calculs, ceux de son cours.
 *
 * Et sa parenthèse dit tout le problème. Récrire « 8 × 4 − 6 » en « 8 × 4 − 7 »
 * ne change pas qu'une ligne : les trois lignes de la correction en dessous
 * deviennent fausses. Il ne suffit donc pas de laisser taper du texte, il faut
 * le RELIRE — et refaire la cascade entière à partir de lui.
 *
 * On accepte ce qu'un professeur écrit vraiment : le moins de la machine comme
 * celui du tableau (- et −), la virgule ou le point, les espaces où il veut, le
 * × comme le * , le ÷ comme le / , et les puissances aussi bien en exposants
 * Unicode (4²) qu'avec un accent circonflexe (4^2).
 *
 * @returns {Array|null} les jetons, ou `null` si la phrase n'est pas une
 *          expression — auquel cas on ne prétend PAS savoir la corriger.
 */
const EXPOSANTS_LUS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export function lire(texte) {
    if (typeof texte !== 'string') return null;
    // On normalise d'abord tout ce qui s'écrit de plusieurs façons.
    let t = texte
        .replace(/[−–—]/g, '-')
        // Le « x » du clavier vaut le « × » du tableau : personne ne va chercher
        // le vrai signe dans une table de caractères, et il n'y a pas
        // d'inconnue dans une cascade de priorités — aucune ambiguïté possible.
        .replace(/[*·]/g, '×')
        .replace(/(?<=[\d)\s])[xX](?=[\d(\s])/g, '×')
        .replace(/[/:]/g, '÷')
        .replace(/,/g, '.')
        .replace(/[  \s]+/g, ' ')
        .trim();
    // Le « = 12 » qu'un professeur ajoute au bout n'est pas dans l'expression.
    t = t.replace(/=\s*[\d.,]*\s*$/, '').trim();
    if (!t) return null;

    const jetons = [];
    let i = 0;
    const lireNombre = () => {
        const m = /^\d+(\.\d+)?/.exec(t.slice(i));
        if (!m) return null;
        i += m[0].length;
        return Number(m[0]);
    };
    while (i < t.length) {
        const c = t[i];
        if (c === ' ') { i++; continue; }
        if (c === '(') { jetons.push(ouvrante()); i++; continue; }
        if (c === ')') { jetons.push(fermante()); i++; continue; }
        if ('+-×÷'.includes(c)) { jetons.push(operateur(c)); i++; continue; }
        if (/\d/.test(c)) {
            const base = lireNombre();
            if (base === null) return null;
            // L'exposant colle au nombre : « 4² » ou « 4^2 », jamais « 4 ² ».
            let exp = null;
            if (t[i] === '^') { i++; exp = lireNombre(); if (exp === null) return null; }
            else {
                let chiffres = '';
                while (i < t.length && EXPOSANTS_LUS[t[i]] !== undefined) {
                    chiffres += EXPOSANTS_LUS[t[i]]; i++;
                }
                if (chiffres) exp = Number(chiffres);
            }
            jetons.push(exp === null ? nombre(base) : puissance(base, exp));
            continue;
        }
        return null;                  // un caractère qu'on ne sait pas lire
    }
    return jetons.length ? jetons : null;
}

/**
 * RELIRE UN CALCUL ET REFAIRE SA CORRECTION — le geste complet.
 *
 * C'est ce que la fiche appelle quand le professeur vient de récrire une
 * cascade. Tout ou rien : ou l'on sait relire l'expression ET la résoudre, et
 * la correction repart de zéro, juste ; ou l'on ne sait pas, et l'on rend
 * `null` pour que la fiche le DISE au lieu d'imprimer un corrigé qui ment.
 *
 * @returns {{lignes, etapes, valeur, texte}|null}
 */
export function relire(texte) {
    const jetons = lire(texte);
    if (!jetons) return null;
    const lignes = etapes(jetons);
    if (!lignes) return null;
    return {
        jetons, lignes,
        etapes: lignes.length - 1,
        valeur: lignes[lignes.length - 1].jetons[0].valeur,
        texte: ecrire(jetons)
    };
}

/** Applique une opération. Rend null si elle est interdite à ce niveau. */
export function calculer(a, op, b) {
    if (op === '+') return a + b;
    if (op === '×') return a * b;
    // Pas de négatif : au collège, les priorités s'apprennent avant les
    // relatifs, et un résultat négatif en cours de route brouille la leçon.
    if (op === '-') return a >= b ? a - b : null;
    if (op === '÷') return (b !== 0 && a % b === 0) ? a / b : null;
    return null;
}

/**
 * Les bornes du groupe de parenthèses le PLUS INTÉRIEUR, ou null s'il n'y en a
 * plus. C'est la première parenthèse fermante qui les donne : celle qu'on
 * rencontre en lisant de gauche à droite ferme forcément le groupe le plus
 * profond ouvert jusque-là.
 */
export function groupeInterieur(jetons) {
    const fin = jetons.findIndex(j => j.type === ')');
    if (fin < 0) return null;
    let debut = -1;
    for (let i = fin - 1; i >= 0; i--) {
        if (jetons[i].type === '(') { debut = i; break; }
    }
    return debut < 0 ? null : { debut, fin };
}

/**
 * L'OPÉRATION PRIORITAIRE, et pourquoi c'est elle.
 *
 * @returns {{index:number, op:string, gauche:number, droite:number,
 *            valeur:number|null, raison:string, dans:Object|null}|null}
 */
export function operationPrioritaire(jetons) {
    const groupe = groupeInterieur(jetons);
    // On ne cherche que DANS le groupe le plus intérieur s'il en reste un :
    // c'est la première règle, et elle prime sur toutes les autres.
    const de = groupe ? groupe.debut + 1 : 0;
    const a = groupe ? groupe.fin : jetons.length;

    // LES PUISSANCES PASSENT AVANT LES MULTIPLICATIONS, et après les
    // parenthèses. C'est l'ordre du cours, et la seule chose que l'ajout
    // change : on cherche donc une puissance AVANT de regarder les opérateurs.
    // À égalité, on va de gauche à droite comme partout ailleurs.
    for (let i = de; i < a; i++) {
        if (jetons[i].type !== 'p') continue;
        const j = jetons[i];
        return {
            index: i, op: '^', unaire: true,
            gauche: j.base, droite: j.exp,
            valeur: j.base ** j.exp,
            libelle: ecrirePuissance(j),
            raison: groupe
                ? 'Les parenthèses d\'abord — et dedans, la puissance avant tout le reste.'
                : 'Les PUISSANCES d\'abord : elles passent avant les multiplications et les divisions.',
            dans: groupe
        };
    }

    const ops = [];
    for (let i = de; i < a; i++) if (jetons[i].type === 'op') ops.push(i);
    if (!ops.length) return null;

    const fortes = ops.filter(i => FORTES.includes(jetons[i].op));
    const choisies = fortes.length ? fortes : ops;
    const index = choisies[0];                 // à égalité, la plus à gauche
    const op = jetons[index].op;

    let raison;
    if (groupe) raison = 'Les parenthèses d\'abord.';
    else if (fortes.length) {
        raison = choisies.length > 1
            ? 'Multiplications et divisions avant les additions et les soustractions — et à égalité, on va de gauche à droite.'
            : 'Multiplications et divisions avant les additions et les soustractions.';
    } else {
        raison = ops.length > 1
            ? 'Il ne reste que des additions et des soustractions : on va de gauche à droite.'
            : 'C\'est la dernière opération.';
    }

    const gauche = jetons[index - 1], droite = jetons[index + 1];
    const g = gauche && gauche.type === 'n' ? gauche.valeur : null;
    const d = droite && droite.type === 'n' ? droite.valeur : null;
    return {
        index, op, unaire: false,
        gauche: g, droite: d,
        valeur: (g !== null && d !== null) ? calculer(g, op, d) : null,
        // CE QU'ON DIT À L'ÉLÈVE, écrit une fois ici. « 4 × 5 » se lit avec son
        // signe, « 4² » sans : c'est au noyau de le savoir, pas à chaque phrase
        // de l'écran de le refabriquer.
        libelle: g !== null && d !== null
            ? `${g} ${op === '-' ? '−' : op} ${d}` : null,
        raison,
        dans: groupe
    };
}

/**
 * Pourquoi l'opérateur cliqué n'est pas le bon — dit en mots d'élève.
 * Rend null quand c'est le bon.
 */
export function critiquer(jetons, index) {
    const bonne = operationPrioritaire(jetons);
    if (!bonne) return 'Il n\'y a plus d\'opération à faire.';
    if (index === bonne.index) return null;
    const j = jetons[index];
    if (j && j.type === 'p') {
        return bonne.unaire
            ? 'À priorité égale, on calcule de GAUCHE À DROITE — cette puissance-là vient plus loin.'
            : 'Il reste des parenthèses : on les calcule avant tout le reste.';
    }
    if (!j || j.type !== 'op') return 'Ce n\'est pas une opération.';

    const groupe = groupeInterieur(jetons);
    if (groupe && (index < groupe.debut || index > groupe.fin)) {
        return 'Il reste des parenthèses : on les calcule avant tout le reste.';
    }
    if (bonne.unaire) {
        return `Il reste une PUISSANCE, ${bonne.libelle} : elle passe avant les `
            + 'multiplications, les divisions, et tout le reste.';
    }
    if (FAIBLES.includes(j.op) && FORTES.includes(bonne.op)) {
        return `Il reste ${bonne.op === '×' ? 'une multiplication' : 'une division'} : `
            + 'elle passe avant les additions et les soustractions.';
    }
    // Même famille : c'est donc une question de sens de lecture.
    return 'À priorité égale, on calcule de GAUCHE À DROITE — celle-ci vient plus loin.';
}

/**
 * Réécrit l'expression en remplaçant l'opération par son résultat.
 *
 * ET LAISSE TOMBER LES PARENTHÈSES DEVENUES INUTILES : « (7) » ne s'écrit pas.
 * Sans ce nettoyage, l'élève verrait une ligne qu'aucun professeur n'écrit, et
 * devrait deviner qu'elle ne compte pas.
 */
export function reduire(jetons, index, valeur) {
    // UNE PUISSANCE OCCUPE UNE SEULE CASE, pas trois : « 3 + 4² » devient
    // « 3 + 16 », et non « 16 ». Remplacer trois jetons ferait disparaître le
    // « + » et le 3 avec.
    const unaire = jetons[index] && jetons[index].type === 'p';
    const out = jetons.slice(0, unaire ? index : index - 1)
        .concat([nombre(valeur)])
        .concat(jetons.slice(index + (unaire ? 1 : 2)));
    return nettoyerParentheses(out);
}

/**
 * LA LIGNE SUIVANTE, AVEC UN TROU À LA PLACE DU RÉSULTAT.
 *
 * C'est ainsi qu'on écrit une cascade au tableau : on souligne l'opération
 * prioritaire, on passe à la ligne, et l'on RECOPIE le reste en laissant un
 * blanc là où le résultat va tomber. « 2 × 3 + 9 » souligné donne « ___ + 9 ».
 *
 * On rend aussi la POSITION du trou : sans elle, l'écran devrait la deviner,
 * et les parenthèses devenues inutiles (« (5) » → « 5 ») décalent tout.
 *
 * @returns {{jetons:Object[], trou:number}}
 */
export function reduirePourEcrire(jetons, index) {
    const marque = { type: 'n', valeur: null, trou: true };
    const unaire = jetons[index] && jetons[index].type === 'p';
    const out = jetons.slice(0, unaire ? index : index - 1)
        .concat([marque])
        .concat(jetons.slice(index + (unaire ? 1 : 2)));
    const propre = nettoyerParentheses(out);
    return { jetons: propre, trou: propre.indexOf(marque) };
}

function nettoyerParentheses(jetons) {
    for (let i = 0; i < jetons.length - 2; i++) {
        if (jetons[i].type === '(' && jetons[i + 1].type === 'n' && jetons[i + 2].type === ')') {
            return nettoyerParentheses(
                jetons.slice(0, i).concat([jetons[i + 1]]).concat(jetons.slice(i + 3)));
        }
    }
    return jetons;
}

/** L'expression est-elle réduite à un seul nombre ? */
export const terminee = (jetons) => jetons.length === 1 && jetons[0].type === 'n';

/**
 * La suite complète des lignes, telle qu'on l'écrirait au tableau.
 * Rend null si l'expression rencontre une opération interdite en chemin.
 */
export function etapes(jetons) {
    const lignes = [{ jetons, texte: ecrire(jetons) }];
    let courant = jetons;
    for (let garde = 0; garde < 40 && !terminee(courant); garde++) {
        const p = operationPrioritaire(courant);
        if (!p || p.valeur === null) return null;
        const suivant = reduire(courant, p.index, p.valeur);
        lignes.push({
            jetons: suivant, texte: ecrire(suivant),
            fait: { op: p.op, gauche: p.gauche, droite: p.droite, valeur: p.valeur },
            raison: p.raison
        });
        courant = suivant;
    }
    return terminee(courant) ? lignes : null;
}

/** La valeur finale, ou null si l'expression n'est pas calculable ici. */
export function valeurFinale(jetons) {
    const l = etapes(jetons);
    return l ? l[l.length - 1].jetons[0].valeur : null;
}

// --- Le tirage ---------------------------------------------------------------------

/**
 * Les formes d'expressions, par difficulté. Chacune dit combien de nombres
 * elle consomme et où vont les parenthèses.
 *
 * On tire la FORME d'abord, puis les nombres, puis l'on vérifie que toutes les
 * étapes tombent juste. Tirer des jetons au hasard donnerait surtout des
 * expressions refusées.
 */
/** Au-delà, l'expression n'est plus une cascade de priorités mais un pensum. */
const MAX_PUISSANCES = 2;

const FORMES = {
    1: [
        ['n', 'op', 'n', 'op', 'n']
    ],
    2: [
        ['n', 'op', 'n', 'op', 'n'],
        ['n', 'op', 'n', 'op', 'n', 'op', 'n']
    ],
    3: [
        ['n', 'op', 'n', 'op', 'n', 'op', 'n'],
        ['(', 'n', 'op', 'n', ')', 'op', 'n'],
        ['n', 'op', '(', 'n', 'op', 'n', ')']
    ],
    4: [
        ['(', 'n', 'op', 'n', ')', 'op', '(', 'n', 'op', 'n', ')'],
        ['n', 'op', '(', 'n', 'op', 'n', ')', 'op', 'n'],
        ['(', 'n', 'op', 'n', 'op', 'n', ')', 'op', 'n']
    ]
};

/**
 * COMBIEN D'ÉTAPES, AU MAXIMUM, POUR CE RÉGLAGE ?
 *
 * La feuille en a besoin pour donner à TOUS les calculs le même nombre de
 * lignes. Le nombre d'étapes d'une cascade est le nombre d'opérations de son
 * expression : on le lit sur les formes, avec le même filtrage que le tirage —
 * sinon on réserverait de la place pour une forme qui ne sortira jamais.
 *
 * Donner exactement les lignes de CE calcul-là revient à écrire la réponse en
 * creux : trois lignes vides disent « il reste trois opérations ».
 */
export function etapesMax({
    niveau = 2, parentheses = true, imposer = false, puissances = false
} = {}) {
    const n = Math.max(1, Math.min(4, niveau));
    let formes = FORMES[n] || FORMES[2];
    if (!parentheses) formes = formes.filter(f => !f.includes('('));
    else if (imposer) {
        const avec = formes.filter(f => f.includes('('));
        if (avec.length) formes = avec;
    }
    if (!formes.length) formes = FORMES[2];
    // CHAQUE PUISSANCE EST UNE LIGNE DE PLUS. La feuille réserve la place à
    // partir de ce compte : l'oublier donnerait des cascades tronquées, où la
    // dernière ligne n'a plus où s'écrire.
    return Math.max(...formes.map(f => f.filter(t => t === 'op').length)) + (puissances ? MAX_PUISSANCES : 0);
}

/**
 * Une expression jouable.
 *
 * @param {Object} o
 * @param {Object} o.rng
 * @param {number} [o.niveau]        - 1 à 4
 * @param {boolean} [o.parentheses]  - autoriser les parenthèses
 * @param {number} [o.max]           - le plus grand nombre écrit dans l'expression
 * @param {number} [o.plafond]       - au-delà, le résultat n'est plus de tête
 *
 * DES CALCULS PLUS GRANDS, SUR DEMANDE. Les nombres allaient de 2 à 9 et le
 * résultat ne dépassait pas 400 : c'est le bon calibre pour découvrir la
 * règle, et c'est trop court pour la travailler ensuite. Rémy : « avoir la
 * possibilité d'avoir des calculs plus grands ». Les deux bornes sont donc
 * des réglages, et leurs valeurs par défaut ne changent rien à l'existant.
 */
export function tirerExpression({
    rng, niveau = 2, parentheses = true, max = 9, imposer = false,
    // DES PUISSANCES DANS LA CASCADE. Rémy : « des priorités avec les
    // puissances. Tu as déjà un moteur hyper complet. » On ne change donc ni
    // les formes ni le tirage : on remplace APRÈS COUP un ou deux nombres par
    // une puissance, et le reste du moteur — l'ordre de priorité, la
    // réécriture, la vérification des étapes — s'en occupe tout seul.
    puissances = false,
    // 4³ vaut déjà 64, et 4³ × 5 dépasse le plafond ordinaire : une cascade
    // avec puissances a besoin de plus d'air, sinon le tirage échoue et l'on
    // retombe sur l'expression de secours.
    plafond = puissances ? 1200 : 400
} = {}) {
    const n = Math.max(1, Math.min(4, niveau));
    const grand = Math.max(3, Math.round(max));
    let formes = FORMES[n] || FORMES[2];
    if (!parentheses) {
        formes = formes.filter(f => !f.includes('('));
        if (!formes.length) formes = FORMES[2].filter(f => !f.includes('('));
    } else if (imposer) {
        // UN EXERCICE SUR LES PARENTHÈSES DOIT EN AVOIR. Le niveau 3 mélange
        // des formes avec et sans : une question sur deux tombait sans
        // parenthèse, et l'exercice ne portait plus sur ce qu'il annonce.
        const avec = formes.filter(f => f.includes('('));
        if (avec.length) formes = avec;
    }

    for (let essai = 0; essai < 600; essai++) {
        const forme = formes[rng.int(0, formes.length - 1)];
        const jetons = forme.map(t => {
            if (t === 'n') return nombre(rng.int(2, grand));
            if (t === 'op') return operateur(rng.pick(['+', '-', '×', '÷']));
            return t === '(' ? ouvrante() : fermante();
        });
        if (puissances) {
            // AU MOINS UNE, sinon l'exercice ne porte pas sur ce qu'il annonce
            // — et jamais celle qui suit un ÷, où 3 ÷ 2² tomberait presque
            // toujours faux et ferait perdre le tirage.
            const places = jetons
                .map((j, i) => (j.type === 'n'
                    && !(jetons[i - 1] && jetons[i - 1].type === 'op' && jetons[i - 1].op === '÷')
                    ? i : -1))
                .filter(i => i >= 0);
            if (!places.length) continue;
            const combien = Math.min(places.length, rng.int(1, MAX_PUISSANCES));
            rng.shuffle(places).slice(0, combien).forEach(i => {
                jetons[i] = puissance(rng.int(2, 5), rng.int(2, 3));
            });
        }
        const lignes = etapes(jetons);
        if (!lignes) continue;                          // une étape interdite
        const finale = lignes[lignes.length - 1].jetons[0].valeur;
        if (finale < 0 || finale > plafond) continue;
        // AU MOINS DEUX ÉTAPES, sinon il n'y a pas de priorité à trancher.
        if (lignes.length < 3) continue;
        // Et l'ordre naïf de gauche à droite doit donner AUTRE CHOSE : sans
        // cela, l'élève qui ignore la règle tombe juste et n'apprend rien.
        if (!parentheses && naif(jetons) === finale) continue;

        return {
            jetons, texte: ecrire(jetons), lignes,
            resultat: finale, etapes: lignes.length - 1,
            avecParentheses: forme.includes('(')
        };
    }
    // Filet : la plus simple des expressions à priorité — avec sa puissance si
    // c'est ce qu'on demandait, sinon l'exercice s'ouvrirait sur autre chose
    // que son titre.
    const secours = puissances
        ? [nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)]
        : [nombre(3), operateur('+'), nombre(4), operateur('×'), nombre(5)];
    const lignes = etapes(secours);
    return {
        jetons: secours, texte: ecrire(secours), lignes,
        resultat: lignes[lignes.length - 1].jetons[0].valeur,
        etapes: lignes.length - 1, avecParentheses: false
    };
}

/** Le résultat qu'obtient celui qui calcule bêtement de gauche à droite. */
export function naif(jetons) {
    // Ni parenthèses ni puissances : « calculer bêtement de gauche à droite »
    // n'a de sens que sur une suite plate d'opérations.
    if (jetons.some(j => j.type === '(' || j.type === ')' || j.type === 'p')) return null;
    let v = jetons[0].valeur;
    for (let i = 1; i < jetons.length - 1; i += 2) {
        v = calculer(v, jetons[i].op, jetons[i + 1].valeur);
        if (v === null) return null;
    }
    return v;
}
