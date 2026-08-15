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

const FORTES = ['×', '÷'];
const FAIBLES = ['+', '-'];

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
        else if (j.type === 'op') out += j.op === '-' ? '−' : j.op;
        else out += j.type;
    });
    return out;
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
    return {
        index, op,
        gauche: gauche && gauche.type === 'n' ? gauche.valeur : null,
        droite: droite && droite.type === 'n' ? droite.valeur : null,
        valeur: (gauche && droite && gauche.type === 'n' && droite.type === 'n')
            ? calculer(gauche.valeur, op, droite.valeur) : null,
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
    if (!j || j.type !== 'op') return 'Ce n\'est pas une opération.';

    const groupe = groupeInterieur(jetons);
    if (groupe && (index < groupe.debut || index > groupe.fin)) {
        return 'Il reste des parenthèses : on les calcule avant tout le reste.';
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
    const out = jetons.slice(0, index - 1)
        .concat([nombre(valeur)])
        .concat(jetons.slice(index + 2));
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
    const out = jetons.slice(0, index - 1)
        .concat([marque])
        .concat(jetons.slice(index + 2));
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
    rng, niveau = 2, parentheses = true, max = 9, plafond = 400, imposer = false
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
    // Filet : la plus simple des expressions à priorité.
    const secours = [nombre(3), operateur('+'), nombre(4), operateur('×'), nombre(5)];
    const lignes = etapes(secours);
    return {
        jetons: secours, texte: ecrire(secours), lignes,
        resultat: lignes[lignes.length - 1].jetons[0].valeur,
        etapes: lignes.length - 1, avecParentheses: false
    };
}

/** Le résultat qu'obtient celui qui calcule bêtement de gauche à droite. */
export function naif(jetons) {
    if (jetons.some(j => j.type === '(' || j.type === ')')) return null;
    let v = jetons[0].valeur;
    for (let i = 1; i < jetons.length - 1; i += 2) {
        v = calculer(v, jetons[i].op, jetons[i + 1].valeur);
        if (v === null) return null;
    }
    return v;
}
