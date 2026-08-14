// LE COMPTE EST BON — le noyau : le tirage, la recherche, et l'arbitrage.
//
// Six nombres, un nombre à atteindre, quatre opérations. Les règles sont
// celles du jeu télévisé, et elles ne sont pas décoratives : chacune écarte
// une classe de calculs qu'un élève de collège ne sait pas encore faire.
//
//   · JAMAIS DE NÉGATIF. 3 − 8 n'existe pas ici : la soustraction ne se pose
//     que du grand vers le petit.
//   · LA DIVISION TOMBE JUSTE, ou elle est refusée. 100 ÷ 7 n'a pas de sens
//     dans ce jeu — c'est ce qui en fait un exercice de divisibilité déguisé.
//   · UN NOMBRE SERT UNE FOIS. Deux nombres consommés, un résultat produit :
//     la réserve rétrécit d'un cran à chaque étape.
//
// CE QUI CHANGE TOUT, ICI, C'EST QUE L'ÉLÈVE DONNE LE RÉSULTAT. La machine
// n'annonce pas « 75 × 4 = 300 » : elle demande combien ça fait, et n'avance
// que si la réponse est juste. Sans cela le jeu se joue en tapotant des
// couples au hasard jusqu'à tomber sur le compte — on cherche, on ne calcule
// pas. Une étape validée est un calcul posé, donc une opération de plus au
// compteur.
//
// LES GRANDS NOMBRES SONT GARANTIS. 25, 50, 75 et 100 sont exactement ceux
// dont les multiples doivent devenir des réflexes : la plaque en porte
// toujours au moins un.
//
// LE TIRAGE EST CONSTRUIT À L'ENDROIT, jamais tiré puis testé. On part des six
// nombres, on applique des opérations valides au hasard, et le résultat obtenu
// DEVIENT le nombre à atteindre. Le compte est donc bon par construction — et
// l'on connaît d'avance en combien d'opérations, ce qui est précisément le
// réglage de difficulté demandé. Tirer un nombre au hasard puis chercher s'il
// est atteignable donnerait des tirages impossibles, et un élève qui cherche
// une solution qui n'existe pas n'apprend rien.

/** Les petites plaques : deux exemplaires de chaque nombre de 1 à 10. */
export const PETITES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** Les grandes : celles dont les multiples doivent devenir des réflexes. */
export const GRANDES = [25, 50, 75, 100];

export const OPERATIONS = ['+', '-', '×', '÷'];

/** Le symbole d'une opération tel qu'on l'écrit — jamais « * » ni « / ». */
export const SIGNE = { '+': '+', '-': '−', '×': '×', '÷': '÷' };

/**
 * Applique une opération, ou rend null si elle est interdite.
 *
 * Les refus ne sont pas des cas limites, ce sont LA règle du jeu : c'est en
 * cherchant lesquels tombent juste qu'on travaille la divisibilité.
 */
export function calculer(a, op, b) {
    if (op === '+') return a + b;
    if (op === '×') return a * b;
    // Jamais de négatif — mais zéro en est un résultat parfaitement légal.
    // C'est « utile » qui l'écarte des tirages, parce qu'il ne mène nulle
    // part : la règle et l'opportunité sont deux choses différentes.
    if (op === '-') return a >= b ? a - b : null;
    if (op === '÷') return (b !== 0 && a % b === 0) ? a / b : null;   // jamais de reste
    return null;
}

/**
 * Une opération est-elle UTILE ?
 *
 * « × 1 » et « ÷ 1 » ne changent rien, et « a − a » fait zéro : trois façons
 * de gaspiller une plaque sans avancer. On les écarte du tirage — un élève qui
 * les voit dans la solution du robot apprendrait à perdre son temps.
 */
export function utile(a, op, b) {
    const r = calculer(a, op, b);
    if (r === null || r === 0) return false;
    if ((op === '×' || op === '÷') && (a === 1 || b === 1)) return false;
    return true;
}

/** Les six plaques, avec au moins `grands` grandes. */
export function tirerPlaques(rng, grands = 1) {
    const combienGrands = Math.max(1, Math.min(4, grands));
    const plaques = rng.shuffle(GRANDES).slice(0, combienGrands);
    // Les petites vont par paires : le jeu télévisé en propose deux de chaque,
    // et deux « 7 » sur une plaque est une situation normale, pas un bug.
    const sac = rng.shuffle([...PETITES, ...PETITES]);
    while (plaques.length < 6) plaques.push(sac.pop());
    return rng.shuffle(plaques);
}

/**
 * Construit un tirage jouable : les plaques, la cible, et la solution qui a
 * servi à la fabriquer.
 *
 * @param {Object} o
 * @param {Object} o.rng
 * @param {number} [o.operations] - combien d'opérations mène au but (2 à 5)
 * @param {boolean} [o.tous]      - la solution doit consommer les six nombres
 * @param {number} [o.grands]     - combien de grandes plaques au minimum
 */
export function tirerPartie({ rng, operations = 3, tous = false, grands = 1 } = {}) {
    // Avec « tous », le nombre d'opérations est imposé : consommer six nombres
    // deux par deux en produit un seul au bout de cinq étapes, pas moins.
    const cible = tous ? 5 : Math.max(2, Math.min(5, operations));

    for (let essai = 0; essai < 400; essai++) {
        const plaques = tirerPlaques(rng, grands);
        const chemin = construire(plaques, cible, rng);
        if (!chemin) continue;
        const but = chemin[chemin.length - 1].resultat;
        // La fourchette du jeu télévisé. En dessous de 100 le tirage se résout
        // de tête et l'exercice disparaît ; au-dessus de 999 il devient un
        // concours de patience.
        if (but < 100 || but > 999) continue;
        return {
            plaques, but, operations: chemin.length, tous,
            // La solution qui a servi à fabriquer le tirage : c'est celle que
            // le robot montrera, et elle est garantie valide.
            solution: chemin
        };
    }
    // Filet : un tirage simple vaut mieux qu'une page blanche.
    const plaques = tirerPlaques(rng, grands);
    const chemin = construire(plaques, 2, rng) || [];
    return {
        plaques, but: chemin.length ? chemin[chemin.length - 1].resultat : plaques[0] * 2,
        operations: chemin.length, tous: false, solution: chemin
    };
}

/**
 * Enchaîne `combien` opérations utiles au hasard, et rend le chemin suivi.
 * Rend null si l'on se retrouve coincé — ce qui arrive quand il ne reste que
 * des couples interdits.
 */
function construire(plaques, combien, rng) {
    let reserve = plaques.slice();
    const chemin = [];
    for (let k = 0; k < combien; k++) {
        const possibles = [];
        for (let i = 0; i < reserve.length; i++) {
            for (let j = 0; j < reserve.length; j++) {
                if (i === j) continue;
                for (const op of OPERATIONS) {
                    if (utile(reserve[i], op, reserve[j])) {
                        possibles.push({ i, j, op, resultat: calculer(reserve[i], op, reserve[j]) });
                    }
                }
            }
        }
        // On écarte les résultats énormes : 100 × 75 × 50 sort de la fourchette
        // et gâche le tirage.
        const raisonnables = possibles.filter(p => p.resultat <= 999);
        const pool = raisonnables.length ? raisonnables : possibles;
        if (!pool.length) return null;
        const choix = pool[rng.int(0, pool.length - 1)];
        const a = reserve[choix.i], b = reserve[choix.j];
        chemin.push({ a, op: choix.op, b, resultat: choix.resultat });
        reserve = reserve.filter((_, n) => n !== choix.i && n !== choix.j);
        reserve.push(choix.resultat);
    }
    return chemin;
}

// --- La partie en cours -----------------------------------------------------------

/**
 * L'état de jeu : la réserve de nombres disponibles, et les étapes posées.
 * Chaque nombre porte un identifiant, parce que deux plaques peuvent afficher
 * la même valeur et qu'on doit pouvoir les distinguer.
 */
export function commencer(partie) {
    return {
        but: partie.but,
        plaques: partie.plaques.slice(),
        solution: partie.solution,
        tous: !!partie.tous,
        nombres: partie.plaques.map((v, i) => ({ id: `p${i}`, valeur: v, origine: true })),
        etapes: [],
        trouve: false
    };
}

/** Le nombre le plus proche du but parmi ceux qu'on a sous la main. */
export function meilleurEcart(etat) {
    return etat.nombres.reduce((m, n) => Math.min(m, Math.abs(n.valeur - etat.but)), Infinity);
}

/**
 * Pose une étape : deux nombres, une opération, et LE RÉSULTAT ANNONCÉ PAR
 * L'ÉLÈVE. C'est lui qu'on vérifie — pas le couple choisi.
 *
 * @returns {{ok:boolean, raison?:string, attendu?:number, etape?:Object}}
 */
export function poserEtape(etat, idA, op, idB, resultatPropose) {
    if (idA === idB) return { ok: false, raison: 'meme-plaque' };
    const a = etat.nombres.find(n => n.id === idA);
    const b = etat.nombres.find(n => n.id === idB);
    if (!a || !b) return { ok: false, raison: 'introuvable' };
    if (!OPERATIONS.includes(op)) return { ok: false, raison: 'operation' };

    const attendu = calculer(a.valeur, op, b.valeur);
    if (attendu === null) {
        return {
            ok: false,
            raison: op === '÷' ? 'division-inexacte' : 'negatif',
            a: a.valeur, b: b.valeur, op
        };
    }
    if (Number(resultatPropose) !== attendu) {
        // ON NE DONNE PAS LA RÉPONSE. Le calcul est l'exercice ; le dire
        // reviendrait à jouer à la place de l'élève.
        return { ok: false, raison: 'calcul-faux', a: a.valeur, b: b.valeur, op };
    }

    const etape = { a: a.valeur, op, b: b.valeur, resultat: attendu, idA, idB };
    etat.nombres = etat.nombres.filter(n => n.id !== idA && n.id !== idB);
    const id = `r${etat.etapes.length}`;
    etat.nombres.push({ id, valeur: attendu, origine: false });
    etat.etapes.push({ ...etape, id });
    if (attendu === etat.but) etat.trouve = true;
    return { ok: true, etape, attendu, id };
}

/** Défait la dernière étape — on essaie, on se trompe, on revient. */
export function annulerEtape(etat) {
    const derniere = etat.etapes.pop();
    if (!derniere) return false;
    etat.nombres = etat.nombres.filter(n => n.id !== derniere.id);
    etat.nombres.push({ id: derniere.idA, valeur: derniere.a, origine: derniere.idA[0] === 'p' });
    etat.nombres.push({ id: derniere.idB, valeur: derniere.b, origine: derniere.idB[0] === 'p' });
    etat.trouve = etat.etapes.some(e => e.resultat === etat.but);
    return true;
}

/**
 * La partie est-elle gagnée ?
 *
 * Avec l'obligation d'utiliser toutes les plaques, atteindre le but ne suffit
 * pas : il faut qu'il ne reste plus rien sur la table. C'est ce réglage qui
 * transforme le jeu de « trouve un chemin » en « trouve LE chemin ».
 */
export function gagnee(etat) {
    if (!etat.trouve) return false;
    if (!etat.tous) return true;
    return etat.nombres.length === 1 && etat.nombres[0].valeur === etat.but;
}

// --- La recherche ------------------------------------------------------------------

/**
 * Cherche une solution — pour l'indice, et pour le robot.
 *
 * Recherche exhaustive avec mémoïsation sur la réserve triée : six nombres
 * tiennent largement dans le budget d'un navigateur. On rend la solution
 * EXACTE la plus courte si elle existe, sinon la plus proche — un tirage
 * fabriqué à l'endroit en a toujours une, mais l'élève peut avoir consommé des
 * plaques et s'être mis dans une impasse, et il faut alors savoir le lui dire.
 */
export function resoudre(nombres, but, budget = 200000) {
    let meilleur = null;
    let noeuds = 0;
    const vus = new Set();

    const noter = (chemin, valeur) => {
        const ecart = Math.abs(valeur - but);
        if (!meilleur || ecart < meilleur.ecart
            || (ecart === meilleur.ecart && chemin.length < meilleur.chemin.length)) {
            meilleur = { ecart, chemin: chemin.slice(), valeur };
        }
    };

    const aller = (reserve, chemin) => {
        if (noeuds++ > budget) return;
        for (const v of reserve) noter(chemin, v);
        if (meilleur && meilleur.ecart === 0) return;
        if (reserve.length < 2) return;

        const signature = reserve.slice().sort((x, y) => x - y).join(',');
        if (vus.has(signature)) return;
        vus.add(signature);

        for (let i = 0; i < reserve.length; i++) {
            for (let j = i + 1; j < reserve.length; j++) {
                const a = Math.max(reserve[i], reserve[j]);
                const b = Math.min(reserve[i], reserve[j]);
                const reste = reserve.filter((_, n) => n !== i && n !== j);
                for (const op of OPERATIONS) {
                    if (!utile(a, op, b)) continue;
                    const r = calculer(a, op, b);
                    chemin.push({ a, op, b, resultat: r });
                    aller([...reste, r], chemin);
                    chemin.pop();
                    if (meilleur && meilleur.ecart === 0) return;
                }
            }
        }
    };

    aller(nombres.slice(), []);
    return meilleur;
}

/**
 * Le prochain coup conseillé, en suivant la solution de fabrication tant
 * qu'elle est encore jouable — et en cherchant à nouveau sinon.
 *
 * L'élève dévie presque toujours du chemin prévu : dès qu'il a consommé une
 * plaque autrement, la solution d'origine ne s'applique plus, et un indice qui
 * la réciterait quand même enverrait dans le mur.
 */
export function conseil(etat) {
    const dispo = etat.nombres.map(n => n.valeur);
    const trouve = resoudre(dispo, etat.but);
    if (!trouve || !trouve.chemin.length) return null;
    return { ...trouve.chemin[0], exact: trouve.ecart === 0, ecart: trouve.ecart };
}
