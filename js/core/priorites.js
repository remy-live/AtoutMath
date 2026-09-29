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

/**
 * LE MOINS QUI N'A RIEN À SA GAUCHE ET QUI PORTE UN GROUPE.
 *
 * Rémy : « les élèves galèrent aux exercices −(−3+5×6)−(−7) […] je pense qu'il
 * faut être progressif ».
 *
 * CE MOINS-LÀ N'EST PAS UNE SOUSTRACTION, et c'est toute la difficulté du
 * chapitre. Il n'a pas de gauche : il prend l'OPPOSÉ de ce qui le suit. Le
 * moteur ne savait pas l'écrire — toutes ses formes commencent par un nombre
 * ou par une parenthèse ouvrante —, si bien que l'expression que Rémy met au
 * tableau ne pouvait tout simplement pas être tirée.
 *
 * ET IL NE DEVIENT CALCULABLE QU'UNE FOIS LE GROUPE RÉDUIT À UN NOMBRE. C'est
 * la règle qu'on veut enseigner, et elle tombe toute seule : tant qu'il reste
 * une parenthèse, `groupeInterieur` la sert en premier ; `nettoyerParentheses`
 * réduit ensuite « (27) » en « 27 » ; et alors seulement l'opposé a un nombre
 * sous la main. Aucun élève ne peut donc « distribuer le moins » avant d'avoir
 * calculé dedans — ce qui est exactement la faute qu'on cherche à empêcher.
 */
export const oppose = () => ({ type: 'u', op: '-' });

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
        //
        // NI APRÈS UN OPPOSÉ : on écrit « −(−3 + 30) », jamais « − (−3 + 30) ».
        // L'espace ferait lire une soustraction — précisément la confusion que
        // ce chapitre existe pour lever.
        const colle = !avant || avant.type === '(' || avant.type === 'u' || j.type === ')';
        if (!colle) out += ' ';
        out += ecrireJeton(j, avant);
    });
    return out;
}

/**
 * UN SEUL JETON, ÉCRIT DANS SON CONTEXTE — et le contexte tient en un voisin.
 *
 * UN NOMBRE NÉGATIF QUI SUIT UN OPÉRATEUR PREND SES PARENTHÈSES. « 4 × −2 » ne
 * s'écrit nulle part : deux signes qui se suivent ne se lisent pas, et c'est
 * justement la notation que le chapitre des relatifs installe. En tête
 * d'expression, en revanche, « −3 + 4 » s'écrit sans rien.
 *
 * ET C'EST POURQUOI CETTE FONCTION EXISTE À PART. La cascade de l'écran écrit
 * ses jetons UN PAR UN — il lui faut une balise par jeton pour les rendre
 * cliquables et les souligner. Elle appelait donc `ecrire([j])`, un jeton seul,
 * sans voisin : la règle ci-dessus ne pouvait pas s'appliquer, et l'élève
 * lisait « 4 + 3 ÷ −3 ». Mesuré à l'écran, sur le premier calcul venu.
 *
 * @param {Object} j      le jeton à écrire
 * @param {Object} [avant] celui qui le précède, ou rien s'il ouvre la ligne
 */
export function ecrireJeton(j, avant) {
    if (j.type === 'n' && j.valeur < 0 && avant && avant.type === 'op') {
        return `(${String(j.valeur).replace('-', '−').replace('.', ',')})`;
    }
    // UN NOMBRE NÉGATIF QUI SUIT UN OPPOSÉ PREND SES PARENTHÈSES LUI AUSSI :
    // « −(−7) » et non « −−7 ». C'est la même règle que pour un opérateur, et
    // c'est ici la forme la plus courante du chapitre.
    if (j.type === 'n' && j.valeur < 0 && avant && avant.type === 'u') {
        return `(${String(j.valeur).replace('-', '−')})`;
    }
    if (j.type === 'n') return String(j.valeur).replace('-', '−').replace('.', ',');
    if (j.type === 'p') return ecrirePuissance(j);
    if (j.type === 'u') return '−';
    if (j.type === 'op') return j.op === '-' ? '−' : j.op;
    return j.type;
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
        // « (-2) » EST UN NOMBRE, pas une parenthèse contenant un calcul. Sans
        // cette lecture, le moteur y cherchait une opération, n'en trouvait
        // pas, et déclarait la cascade insoluble — c'est-à-dire qu'il refusait
        // le calcul le plus banal du chapitre des relatifs.
        if (c === '(') {
            const m = /^\(\s*-\s*(\d+(?:\.\d+)?)\s*\)/.exec(t.slice(i));
            if (m) { jetons.push(nombre(-Number(m[1]))); i += m[0].length; continue; }
            jetons.push(ouvrante()); i++; continue;
        }
        // UN MOINS QUI N'A RIEN À SA GAUCHE EST UN SIGNE, pas une soustraction :
        // « −3 + 4 » commence par le nombre −3.
        if (c === '-') {
            const precedent = jetons[jetons.length - 1];
            const signe = !precedent || precedent.type === 'op' || precedent.type === '('
                || precedent.type === 'u';
            const m = signe && /^-\s*(\d+(?:\.\d+)?)/.exec(t.slice(i));
            if (m) { jetons.push(nombre(-Number(m[1]))); i += m[0].length; continue; }
            // UN MOINS EN POSITION DE SIGNE, SUIVI D'UN GROUPE : c'est l'OPPOSÉ
            // de ce groupe, pas une soustraction. Sans cette lecture, le jeton
            // partait en opérateur sans rien à sa gauche, `operationPrioritaire`
            // rendait une valeur nulle, et la cascade se déclarait insoluble —
            // donc le professeur qui récrivait « −(−3+5×6)−(−7) » dans la fiche
            // obtenait un corrigé refusé, sans savoir pourquoi.
            if (signe && /^-\s*\(/.test(t.slice(i))) {
                jetons.push(oppose()); i++; continue;
            }
        }
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
export function calculer(a, op, b, { relatifs = false } = {}) {
    if (op === '+') return a + b;
    if (op === '×') return a * b;
    // PAS DE NÉGATIF PAR DÉFAUT : au collège, les priorités s'apprennent avant
    // les relatifs, et un résultat négatif en cours de route brouille la leçon.
    //
    // SAUF QUAND C'EST JUSTEMENT LA LEÇON. Rémy : « on va coupler deux
    // exercices, celui de priorités opératoires et aussi les nombres
    // relatifs ». Les deux difficultés se combinent — et se piègent l'une
    // l'autre : dans « 5 − 3 × (−2) », il faut d'abord voir que la
    // multiplication passe avant, PUIS que son résultat est négatif, PUIS que
    // soustraire un négatif ajoute. Trois pas où l'on peut tomber.
    if (op === '-') return (relatifs || a >= b) ? a - b : null;
    if (op === '÷') {
        if (b === 0) return null;
        const q = a / b;
        return Number.isInteger(q) ? q : null;
    }
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
export function operationPrioritaire(jetons, opts = {}) {
    let groupe = groupeInterieur(jetons);
    // UNE PARENTHÈSE QUI NE CONTIENT PLUS QU'UN NOMBRE EST FINIE.
    //
    // `nettoyerParentheses` les efface toutes SAUF celle d'un opposé, qu'il
    // garde exprès pour que « −(27) » puis « −27 » soient deux lignes
    // différentes. Il faut donc le dire ici aussi : sans cette ligne, le
    // moteur cherchait une opération À L'INTÉRIEUR de « (27) », n'en trouvait
    // aucune, et déclarait la cascade insoluble. Mesuré : les quatre
    // expressions à opposé sont passées d'un coup de « ça marche » à
    // « IMPOSSIBLE », pour une parenthèse qu'on venait de préserver.
    if (groupe && groupe.fin - groupe.debut === 2
        && jetons[groupe.debut + 1].type === 'n') groupe = null;
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

    // L'OPPOSÉ D'UN NOMBRE, une fois qu'il en a un sous la main.
    //
    // Il ne peut PAS être choisi tant qu'il porte encore une parenthèse : le
    // balayage ci-dessus s'est déjà restreint au groupe le plus intérieur, et
    // l'on n'arrive ici que lorsqu'il n'en reste aucun. C'est la règle du
    // chapitre, et elle n'a pas eu besoin d'être écrite — « on calcule DEDANS,
    // puis on applique le signe » est une conséquence de l'ordre existant.
    //
    // IL PASSE AVANT LES MULTIPLICATIONS. « −(6) × 2 » vaut −12 des deux
    // façons, donc le résultat ne tranche pas ; ce qui tranche, c'est le
    // GESTE qu'on enseigne : la parenthèse se supprime d'abord, et la ligne
    // suivante montre un nombre négatif ordinaire.
    for (let i = de; i < a; i++) {
        if (jetons[i].type !== 'u') continue;
        // « −27 » OU « −(27) » : les deux formes existent et disent la même
        // chose. La seconde est celle qui reste après le calcul d'un groupe —
        // c'est la ligne où l'on voit la parenthèse disparaître.
        const porte = jetons[i + 1] && jetons[i + 1].type === '('
            ? jetons[i + 2] : jetons[i + 1];
        if (!porte || porte.type !== 'n') continue;
        return {
            index: i, op: '-', unaire: true, oppose: true,
            gauche: null, droite: porte.valeur,
            valeur: -porte.valeur,
            libelle: `−(${String(porte.valeur).replace('-', '−')})`,
            raison: 'Ce moins-là n\'a rien à sa gauche : il prend l\'OPPOSÉ de ce qui '
                + 'le suit. La parenthèse disparaît, et le signe change.',
            dans: null
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
        valeur: (g !== null && d !== null) ? calculer(g, op, d, opts) : null,
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
export function critiquer(jetons, index, opts = {}) {
    const bonne = operationPrioritaire(jetons, opts);
    if (!bonne) return 'Il n\'y a plus d\'opération à faire.';
    if (index === bonne.index) return null;
    const j = jetons[index];
    if (j && j.type === 'p') {
        return bonne.unaire
            ? 'À priorité égale, on calcule de GAUCHE À DROITE — cette puissance-là vient plus loin.'
            : 'Il reste des parenthèses : on les calcule avant tout le reste.';
    }
    // ON A CLIQUÉ L'OPPOSÉ TROP TÔT — la faute que ce chapitre existe pour
    // corriger. L'élève veut « distribuer le moins » avant d'avoir calculé
    // dedans, et c'est ainsi qu'on obtient « 3 − 5 × 6 ». On le dit avec le
    // geste, pas avec la règle : d'abord ce qu'il y a DANS la parenthèse.
    if (j && j.type === 'u') {
        return 'Pas encore : ce moins prendra l\'opposé de la parenthèse quand elle '
            + 'sera devenue UN SEUL nombre. On calcule d\'abord ce qu\'il y a dedans.';
    }
    if (!j || j.type !== 'op') return 'Ce n\'est pas une opération.';

    const groupe = groupeInterieur(jetons);
    if (groupe && (index < groupe.debut || index > groupe.fin)) {
        return 'Il reste des parenthèses : on les calcule avant tout le reste.';
    }
    // `unaire` COUVRE MAINTENANT DEUX CHOSES : une puissance et un opposé. Les
    // confondre dirait « il reste une puissance » devant une expression qui
    // n'en a jamais eu — une phrase qui envoie l'élève chercher ce qui n'existe
    // pas, et c'est le genre de message qui fait cesser de lire les messages.
    if (bonne.oppose) {
        return `Il reste un moins sans rien à sa gauche, ${bonne.libelle} : celui-là `
            + 'prend l\'opposé, et il passe avant.';
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
/**
 * COMBIEN DE JETONS UNE OPÉRATION REMPLACE-T-ELLE ?
 *
 * QUATRE LARGEURS, ET ELLES SE DISENT ICI UNE SEULE FOIS :
 *
 *   · une PUISSANCE occupe une case — « 3 + 4² » devient « 3 + 16 », et non
 *     « 16 » : remplacer trois jetons ferait disparaître le « + » et le 3 ;
 *   · un OPPOSÉ sur un nombre nu en occupe deux — « −27 − (−7) » devient
 *     « 27 − (−7) » ;
 *   · un OPPOSÉ sur une parenthèse en occupe quatre — « −(27) − (−7) » devient
 *     « −27 − (−7) », la parenthèse partant avec ;
 *   · une opération ORDINAIRE en occupe trois, ses deux nombres compris.
 *
 * `reduire` ET `reduirePourEcrire` DOIVENT DÉCOUPER PAREIL : la première pose
 * le résultat, la seconde pose le trou où il tombera. Les laisser calculer
 * chacune de son côté, c'est se donner deux occasions de se tromper — et
 * l'erreur ne lèverait rien : elle effacerait un voisin, et la ligne suivante
 * serait fausse sans qu'aucune exception ne se déclare.
 */
function largeurOperation(jetons, index) {
    const t = jetons[index] && jetons[index].type;
    if (t === 'p') return { debut: index, apres: index + 1 };
    if (t === 'u') {
        const surGroupe = jetons[index + 1] && jetons[index + 1].type === '(';
        return { debut: index, apres: index + (surGroupe ? 4 : 2) };
    }
    return { debut: index - 1, apres: index + 2 };
}

export function reduire(jetons, index, valeur) {
    // UNE PUISSANCE OCCUPE UNE SEULE CASE, pas trois : « 3 + 4² » devient
    // « 3 + 16 », et non « 16 ». Remplacer trois jetons ferait disparaître le
    // « + » et le 3 avec.
    const { debut, apres } = largeurOperation(jetons, index);
    const out = jetons.slice(0, debut)
        .concat([nombre(valeur)])
        .concat(jetons.slice(apres));
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
    const { debut, apres } = largeurOperation(jetons, index);
    const out = jetons.slice(0, debut)
        .concat([marque])
        .concat(jetons.slice(apres));
    const propre = nettoyerParentheses(out);
    return { jetons: propre, trou: propre.indexOf(marque) };
}

function nettoyerParentheses(jetons) {
    for (let i = 0; i < jetons.length - 2; i++) {
        // LA PARENTHÈSE D'UN OPPOSÉ SURVIT À SON CONTENU, ET C'EST ELLE QUI
        // REND L'ÉTAPE VISIBLE.
        //
        // MESURÉ avant : « −(−3 + 5 × 6) − (−7) » donnait la cascade
        //     −(−3 + 30) − (−7)  =  −27 − (−7)  =  −27 − (−7)  =  −20
        // — une ligne écrite DEUX FOIS à l'identique. Le nettoyage réduisait
        // « (27) » en « 27 » dès le calcul du groupe, si bien que le moins
        // s'appliquait à l'écriture avant de s'appliquer au calcul : l'élève
        // voyait « −27 » apparaître sans avoir rien fait, puis une ligne qui ne
        // changeait rien.
        //
        // On garde donc « −(27) », et la ligne suivante montre « −27 ». C'est
        // exactement ce qu'on écrit au tableau, et c'est LE geste du chapitre.
        if (jetons[i].type === '(' && jetons[i + 1].type === 'n' && jetons[i + 2].type === ')'
            && i > 0 && jetons[i - 1].type === 'u') continue;
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
export function etapes(jetons, opts = {}) {
    const lignes = [{ jetons, texte: ecrire(jetons) }];
    let courant = jetons;
    for (let garde = 0; garde < 40 && !terminee(courant); garde++) {
        const p = operationPrioritaire(courant, opts);
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
export function valeurFinale(jetons, opts = {}) {
    const l = etapes(jetons, opts);
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
 * L'ÉCHELLE DU MOINS DEVANT UNE PARENTHÈSE.
 *
 * Rémy : « les élèves galèrent aux exercices −(−3+5×6)−(−7). Comment les
 * aider ? Peut-être commencer par remplacer +(−3), puis faire −(−3+7) en les
 * guidant sur les parenthèses puis faire les priorités opératoires » — puis :
 * « oui et je pense qu'il faut être progressif ».
 *
 * QUATRE BARREAUX, ET LE DERNIER EST SON EXPRESSION. Chacun ajoute UNE
 * difficulté et une seule :
 *
 *   1. une parenthèse, UN nombre : −(−7). C'est un remplacement, il n'y a
 *      rien à décider. On y met aussi 5 + (−3), l'autre écriture qu'il cite ;
 *   2. une parenthèse, UNE SOMME : −(−3 + 7). Là il faut choisir — et la
 *      cascade choisit pour lui, en calculant dedans d'abord ;
 *   3. des PRIORITÉS dedans : −(−3 + 5 × 6). C'est la rencontre des deux
 *      chapitres, et la marche la plus haute ;
 *   4. l'expression entière : −(−3 + 5 × 6) − (−7).
 *
 * ON A INVERSÉ SES ÉTAPES 2 ET 3, ET C'EST LE SEUL ENDROIT OÙ L'ON S'ÉCARTE DE
 * CE QU'IL PROPOSAIT. Sa deuxième idée — « faire −(−3+7) en les guidant sur les
 * parenthèses puis faire les priorités » — met la règle du signe avant les
 * priorités. Or dans −(−3 + 5 × 6), la règle du signe est INAPPLICABLE tant que
 * l'intérieur n'est pas un seul nombre : un élève à qui l'on a montré −(−3+7)
 * d'abord écrit 3 − 5 × 6, ce qui est faux et plausible. Le moteur le lui
 * interdit maintenant (voir `critiquer`), mais l'ordre des barreaux doit dire
 * la même chose que le moteur.
 *
 * `n-` EST UN NOMBRE NÉGATIF IMPOSÉ, et ce n'est pas un détail : « −(5) »
 * s'écrit « −5 » et n'est plus un exercice sur la parenthèse. Ce qui suit un
 * opposé doit donc être négatif, sinon le barreau ne porte pas son nom.
 */
const FORMES_OPPOSE = {
    1: [
        ['u', 'n-'],
        // « 8 + (−6) », « 8 − (−6) » : l'écriture que Rémy cite en premier,
        // « commencer par remplacer +(−3) ». JAMAIS de multiplication ici —
        // « −6 × (−7) » est le produit de deux relatifs, un autre chapitre, et
        // il tombait une fois sur deux tant que l'opérateur se tirait au sort.
        ['n', 'op+', 'n-']
    ],
    2: [
        ['u', '(', 'n-', 'op+', 'n', ')']
    ],
    3: [
        ['u', '(', 'n-', 'op+', 'n', 'op×', 'n', ')']
    ],
    4: [
        ['u', '(', 'n-', 'op+', 'n', 'op×', 'n', ')', 'op+', 'n-']
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
    niveau = 2, parentheses = true, imposer = false, puissances = false, avecOppose = false
} = {}) {
    const n = Math.max(1, Math.min(4, niveau));
    if (avecOppose) {
        const f = FORMES_OPPOSE[n] || FORMES_OPPOSE[1];
        // UN OPPOSÉ EST UNE OPÉRATION, et il compte donc une ligne comme les
        // autres : « −(27) » devient « −27 ». L'oublier donnerait, sur la
        // feuille, une cascade à qui il manque sa dernière ligne.
        // `op+` ET `op×` SONT DES OPÉRATEURS EUX AUSSI. Les oublier ici
        // donnerait, sur la feuille, une cascade à qui il manque deux lignes
        // sur trois — et le trou se voit au crayon, pas à l'écran.
        return Math.max(...f.map(x => x.filter(t => t.startsWith('op') || t === 'u').length));
    }
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
    // LES NOMBRES RELATIFS DANS LA CASCADE. Rémy : « on va coupler deux
    // exercices, celui de priorités opératoires et aussi les nombres
    // relatifs ». Ce n'est pas la somme de deux exercices, c'est un troisième :
    // les deux difficultés se piègent l'une l'autre. Dans « 5 − 3 × (−2) », il
    // faut voir que la multiplication passe avant, PUIS que son résultat est
    // négatif, PUIS que soustraire un négatif ajoute — et 11 surprend tout le
    // monde la première fois.
    relatifs = false,
    // DES PUISSANCES DANS LA CASCADE. Rémy : « des priorités avec les
    // puissances. Tu as déjà un moteur hyper complet. » On ne change donc ni
    // les formes ni le tirage : on remplace APRÈS COUP un ou deux nombres par
    // une puissance, et le reste du moteur — l'ordre de priorité, la
    // réécriture, la vérification des étapes — s'en occupe tout seul.
    puissances = false,
    // 4³ vaut déjà 64, et 4³ × 5 dépasse le plafond ordinaire : une cascade
    // avec puissances a besoin de plus d'air, sinon le tirage échoue et l'on
    // retombe sur l'expression de secours.
    // LE MOINS DEVANT UNE PARENTHÈSE — voir `FORMES_OPPOSE`. Ce réglage change
    // la TABLE DES FORMES, pas le reste du moteur : le tirage, la cascade et la
    // correction ne savent pas qu'ils travaillent sur un chapitre différent.
    avecOppose = false,
    plafond = puissances ? 1200 : 400
} = {}) {
    const n = Math.max(1, Math.min(4, niveau));
    const grand = Math.max(3, Math.round(max));
    // LE NOM DE L'OPTION N'EST PAS CELUI DU JETON, ET C'EST VOULU : `oppose`
    // est le CONSTRUCTEUR du jeton, et une option du même nom le masquerait
    // dans toute la fonction — `oppose()` appellerait alors un booléen.
    let formes = avecOppose ? (FORMES_OPPOSE[n] || FORMES_OPPOSE[1]) : (FORMES[n] || FORMES[2]);
    if (avecOppose) relatifs = true;   // un opposé sans négatifs n'enseigne rien
    if (!parentheses && !avecOppose) {
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
            // ON NE TIRE JAMAIS ZÉRO NI UN : « × 1 » et « + 0 » ne font rien, et
            // une cascade où une étape ne change rien n'enseigne rien. En
            // relatifs, le signe se tire à part, sinon la moitié des
            // expressions n'auraient que des positifs et l'exercice ne
            // porterait pas sur ce qu'il annonce.
            if (t === 'n') {
                const v = rng.int(2, grand);
                return nombre(relatifs && rng.next() < 0.45 ? -v : v);
            }
            // `n-` : UN NÉGATIF IMPOSÉ, et non tiré au sort. « −(5) » s'écrit
            // « −5 » et n'est plus un exercice sur la parenthèse : ce qui suit
            // un opposé doit être négatif, sinon le barreau ne porte pas son
            // nom une fois sur deux.
            if (t === 'n-') return nombre(-rng.int(2, grand));
            if (t === 'u') return oppose();
            // LE GENRE DE L'OPÉRATEUR EST DIT PAR LA FORME, et c'est ce qui
            // sépare les barreaux. MESURÉ à l'écran : le barreau 2 tirait
            // « −(−8 × 7) » — une multiplication à l'intérieur, c'est-à-dire
            // très exactement ce que le barreau 3 est censé apporter. Deux
            // crans qui enseignent la même chose ne sont plus une progression.
            //   'op+'  une addition ou une soustraction, et rien d'autre ;
            //   'op×'  une multiplication ou une division, pour que le barreau
            //          des priorités en ait TOUJOURS une à trancher.
            if (t === 'op+') return operateur(rng.pick(['+', '-']));
            if (t === 'op×') return operateur(rng.pick(['×', '÷']));
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
        const lignes = etapes(jetons, { relatifs });
        if (!lignes) continue;                          // une étape interdite
        const finale = lignes[lignes.length - 1].jetons[0].valeur;
        // EN RELATIFS, UN RÉSULTAT NÉGATIF EST LA NORME et non un échec : c'est
        // même ce qu'on veut voir arriver. On borne seulement la taille.
        if (relatifs ? Math.abs(finale) > plafond : (finale < 0 || finale > plafond)) continue;
        // ET AU MOINS UN NÉGATIF DOIT SE VOIR, sinon l'exercice s'ouvre sur une
        // cascade de positifs et ne porte pas sur ce qu'il annonce.
        if (relatifs && !jetons.some(j => j.type === 'n' && j.valeur < 0)) continue;
        // AU MOINS DEUX ÉTAPES, sinon il n'y a pas de priorité à trancher.
        //
        // SAUF AU PREMIER BARREAU DE L'OPPOSÉ, où il n'y a justement QU'UN
        // geste : « −(−7) » devient « 7 », et c'est tout ce qu'on veut y voir.
        // Exiger deux étapes y serait exiger une difficulté de plus que le
        // barreau n'en enseigne — c'est-à-dire refuser d'être progressif.
        if (lignes.length < (avecOppose && n === 1 ? 2 : 3)) continue;
        // Et l'ordre naïf de gauche à droite doit donner AUTRE CHOSE : sans
        // cela, l'élève qui ignore la règle tombe juste et n'apprend rien.
        if (!parentheses && naif(jetons, { relatifs }) === finale) continue;

        return {
            jetons, texte: ecrire(jetons), lignes,
            resultat: finale, etapes: lignes.length - 1,
            avecParentheses: forme.includes('('), relatifs
        };
    }
    // Filet : la plus simple des expressions à priorité — avec sa puissance si
    // c'est ce qu'on demandait, sinon l'exercice s'ouvrirait sur autre chose
    // que son titre.
    const secours = puissances
        ? [nombre(3), operateur('+'), puissance(4, 2), operateur('×'), nombre(2)]
        : relatifs
            ? [nombre(5), operateur('-'), nombre(3), operateur('×'), nombre(-2)]
            : [nombre(3), operateur('+'), nombre(4), operateur('×'), nombre(5)];
    const lignes = etapes(secours, { relatifs });
    return {
        jetons: secours, texte: ecrire(secours), lignes,
        resultat: lignes[lignes.length - 1].jetons[0].valeur,
        etapes: lignes.length - 1, avecParentheses: false, relatifs
    };
}

/** Le résultat qu'obtient celui qui calcule bêtement de gauche à droite. */
export function naif(jetons, opts = {}) {
    // Ni parenthèses, ni puissances, NI OPPOSÉ : « calculer bêtement de gauche
    // à droite » n'a de sens que sur une suite plate d'opérations. Un opposé en
    // tête n'a pas de gauche — le premier jeton n'est plus un nombre, et la
    // boucle ci-dessous lirait `undefined.valeur`.
    if (jetons.some(j => j.type === '(' || j.type === ')' || j.type === 'p'
        || j.type === 'u')) return null;
    let v = jetons[0].valeur;
    for (let i = 1; i < jetons.length - 1; i += 2) {
        v = calculer(v, jetons[i].op, jetons[i + 1].valeur, opts);
        if (v === null) return null;
    }
    return v;
}
