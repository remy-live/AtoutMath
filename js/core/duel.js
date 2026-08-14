// Le DUEL DES TABLES — la règle du jeu, sans une ligne de DOM.
//
// Un Pong à deux joueurs sur une même tablette. Ce qui fait tourner le jeu
// n'est pas la balle, c'est l'ÉCHANGE : le serveur impose une table, la balle
// part avec un produit de cette table, l'adversaire doit taper le résultat
// avant qu'elle n'atteigne sa ligne — et s'il y arrive, elle repart aussitôt
// avec un AUTRE produit de la même table, un peu plus vite.
//
// Deux décisions de règle méritent d'être écrites ici, parce qu'elles sont
// tout le jeu :
//
//  1. LES DEUX JOUEURS CALCULENT. Dans la version évidente — l'un choisit,
//     l'autre répond — la moitié des joueurs ne fait rien, et la stratégie
//     gagnante est « je mets 7 × 8 à chaque fois », ce qui n'est pas une
//     compétence. Ici le choix ne concerne que le SERVICE ; ensuite la balle
//     fait des allers-retours et chaque frappe demande un calcul, des deux
//     côtés. Le rythme du Pong et celui du calcul mental sont le même rythme.
//
//  2. LE PERDANT DU POINT SERT. C'est lui qui choisit la table suivante,
//     donc c'est lui qui peut attaquer là où l'autre est faible. Un duel qui
//     s'emballe dans un sens n'intéresse plus personne au bout de trois
//     points ; celui-ci se rattrape.
//
// Rien n'est enregistré au carnet : deux enfants jouent sur un seul profil,
// et attribuer à l'un les réponses de l'autre fausserait ses statistiques
// pour de bon. Un duel est un duel.

export const CIBLE_DEFAUT = 7;

/**
 * Durée de vol de la première balle d'un point, en millisecondes.
 *
 * 2 800 ms au départ : « trop rapide au début ». C'est juste — dans ce
 * temps-là, le défenseur doit LIRE l'opération, la calculer, puis taper deux
 * chiffres sur un pavé qu'il ne regarde pas encore. La table de 7 ne se sort
 * pas en deux secondes et demie quand on est en train de l'apprendre, et un
 * duel dont on perd les premiers points sans avoir eu le temps de penser n'est
 * pas un duel, c'est un tirage au sort.
 */
export const VOL_DEPART = 4200;
/** Plancher : en dessous, on ne calcule plus, on devine. */
export const VOL_MINIMUM = 1100;
/** Ce que la balle gagne en vitesse à chaque frappe réussie. */
export const ACCELERATION = 0.9;
/**
 * Le tout premier point se joue plus lentement encore.
 *
 * C'est celui où l'on cherche son pavé, où l'on découvre la table annoncée par
 * l'adversaire, et où l'on n'a encore rien vu voler. Une fois qu'un point est
 * marqué, le duel prend son rythme normal.
 */
export const ECHAUFFEMENT = 1.3;

export function tablesValides(tables) {
    const t = (Array.isArray(tables) ? tables : [])
        .map(Number).filter(n => Number.isInteger(n) && n >= 2 && n <= 12);
    return t.length ? [...new Set(t)].sort((a, b) => a - b) : [2, 3, 4, 5, 6, 7, 8, 9, 10];
}

export function creerPartie(options = {}) {
    const tables = tablesValides(options.tables);
    const operations = (options.operations || ['mul']).filter(o => o === 'mul' || o === 'div');
    return {
        tables,
        operations: operations.length ? operations : ['mul'],
        cible: Math.max(2, Math.min(21, parseInt(options.cible) || CIBLE_DEFAUT)),
        score: [0, 0],
        serveur: options.serveur === 1 ? 1 : 0,
        defenseur: null,
        table: null,
        phase: 'service',      // 'service' | 'echange' | 'point' | 'fini'
        echange: 0,
        balle: null,
        dernier: null,         // dernier énoncé, pour ne pas le répéter
        gagnant: null,
        dernierPoint: null     // { pour, contre, raison, attendu, donne }
    };
}

/**
 * Un énoncé de la table demandée. Jamais deux fois le même d'affilée : dans un
 * échange rapide, revoir le même produit ne se calcule pas, il se recopie.
 */
export function frappe(p, rng) {
    const tirer = () => {
        const b = 2 + Math.floor(rng() * 9);          // de 2 à 10
        const produit = p.table * b;
        const op = p.operations[Math.floor(rng() * p.operations.length)];
        return op === 'div'
            ? { texte: `${produit} ÷ ${p.table}`, reponse: b, op }
            : { texte: `${p.table} × ${b}`, reponse: produit, op };
    };
    let f = tirer();
    for (let i = 0; i < 8 && p.dernier === f.texte; i++) f = tirer();
    p.dernier = f.texte;
    return f;
}

/** Le serveur choisit sa table et frappe : la balle part vers l'adversaire. */
export function servir(p, table, rng = Math.random) {
    if (p.phase === 'fini') return p;
    p.table = p.tables.includes(Number(table)) ? Number(table) : p.tables[0];
    p.echange = 0;
    p.dernier = null;
    p.defenseur = 1 - p.serveur;
    p.balle = frappe(p, rng);
    p.phase = 'echange';
    return p;
}

/** Millisecondes de vol de la balle en cours : elle accélère à chaque frappe. */
export function dureeVol(p) {
    const chauffe = (p.score[0] + p.score[1]) === 0 ? ECHAUFFEMENT : 1;
    return Math.max(VOL_MINIMUM,
        Math.round(VOL_DEPART * chauffe * Math.pow(ACCELERATION, p.echange)));
}

function marquer(p, pour, raison, donne) {
    const attendu = p.balle ? p.balle.reponse : null;
    p.score[pour]++;
    p.dernierPoint = { pour, contre: 1 - pour, raison, attendu, donne, echanges: p.echange };
    p.balle = null;
    if (p.score[pour] >= p.cible) {
        p.phase = 'fini';
        p.gagnant = pour;
    } else {
        p.phase = 'point';
        // Le perdant du point sert : c'est lui qui choisit la table suivante.
        p.serveur = 1 - pour;
    }
    return p.dernierPoint;
}

/**
 * Une réponse du défenseur.
 * @returns {{bon:boolean, point:?Object}} - `point` est renseigné quand la
 *   frappe conclut l'échange.
 */
export function repondre(p, valeur, rng = Math.random) {
    if (p.phase !== 'echange' || !p.balle) return { bon: false, point: null };
    if (Number(valeur) === p.balle.reponse) {
        p.echange++;
        p.defenseur = 1 - p.defenseur;
        p.balle = frappe(p, rng);
        return { bon: true, point: null };
    }
    return { bon: false, point: marquer(p, 1 - p.defenseur, 'faux', Number(valeur)) };
}

/** La balle a franchi la ligne sans réponse. */
export function manquer(p) {
    if (p.phase !== 'echange' || !p.balle) return null;
    return marquer(p, 1 - p.defenseur, 'trop lent', null);
}

/** Après un point : on repart au service, sans toucher au score. */
export function pointSuivant(p) {
    if (p.phase === 'point') { p.phase = 'service'; p.echange = 0; }
    return p;
}

/** Combien de chiffres a la réponse attendue : le pavé valide tout seul à ce compte. */
export function longueurReponse(p) {
    return p.balle ? String(p.balle.reponse).length : 0;
}
