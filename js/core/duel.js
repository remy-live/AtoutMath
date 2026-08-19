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
 * TROIS RYTHMES, PARCE QUE DEVINER LE BON N'A PAS MARCHÉ.
 *
 * « C'est hyper rapide au départ ! ralentis. » — deuxième fois. La première a
 * déjà porté le vol de départ de 2 800 à 4 200 ms, et cela ne suffit toujours
 * pas : le temps qu'il faut pour lire une opération, la calculer et taper deux
 * chiffres dépend de l'élève, pas d'une constante bien choisie. Le rythme
 * devient donc un RÉGLAGE, et « Tranquille » est celui par défaut — un duel
 * qu'on perd avant d'avoir pensé n'est pas un duel, c'est un tirage au sort.
 *
 * Ce qui varie n'est pas seulement le départ : c'est aussi le PLANCHER (à
 * quelle vitesse on cesse d'accélérer) et la PENTE. Un départ lent suivi d'une
 * accélération brutale redonne exactement le même sentiment.
 */
export const RYTHMES = {
    tranquille: { depart: 6200, minimum: 2100, acceleration: 0.95 },
    normal: { depart: VOL_DEPART, minimum: VOL_MINIMUM, acceleration: ACCELERATION },
    rapide: { depart: 3000, minimum: 900, acceleration: 0.86 }
};
export const RYTHME_DEFAUT = 'tranquille';

/** Les bornes d'un calcul composé à la main. */
export const BORNES_COMPOSE = { min: 2, max: 12 };
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
    const envoi = options.envoi === 'compose' ? 'compose' : 'auto';
    const p = {
        tables,
        operations: operations.length ? operations : ['mul'],
        cible: Math.max(2, Math.min(21, parseInt(options.cible) || CIBLE_DEFAUT)),
        // Qui fabrique la brique : la machine (mode « auto »), ou le joueur
        // lui-même à son clavier (mode « composé »).
        envoi,
        rythme: RYTHMES[options.rythme] ? options.rythme : RYTHME_DEFAUT,
        score: [0, 0],
        serveur: options.serveur === 1 ? 1 : 0,
        defenseur: null,
        // Celui qui ENVOIE la brique. En mode auto, c'est simplement l'autre :
        // on le tient quand même, parce que c'est LUI que l'écran doit
        // désigner — « il faudrait un repère de l'élève qui envoie le calcul ».
        attaquant: options.serveur === 1 ? 1 : 0,
        table: null,
        // 'service' | 'composer' | 'echange' | 'point' | 'fini'
        phase: 'service',
        echange: 0,
        balle: null,
        dernier: null,         // dernier énoncé, pour ne pas le répéter
        gagnant: null,
        dernierPoint: null     // { pour, contre, raison, attendu, donne }
    };
    if (envoi === 'compose') p.phase = 'composer';
    return p;
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
    p.attaquant = p.serveur;
    p.defenseur = 1 - p.serveur;
    p.balle = frappe(p, rng);
    p.phase = 'echange';
    return p;
}

/**
 * LE JOUEUR FABRIQUE SA BRIQUE.
 *
 * Rémy : « on ne pourrait pas envisager un mode où l'élève choisit son calcul,
 * genre 7×8, avec un clavier ? On voit la brique qui se prépare et il la lance
 * un peu façon Pong ; l'autre en face doit mettre le résultat, sa brique se
 * prépare, et même chose. »
 *
 * Ce n'est pas le même exercice que le mode automatique. Choisir « 7 × 8 »
 * plutôt que « 2 × 3 », c'est déjà savoir lesquels sont durs — et c'est du
 * chambrage, donc c'est du jeu. En revanche, laisser composer n'importe quoi
 * ramènerait toujours au même produit maximal : la brique doit rester dans les
 * tables travaillées, et l'un des deux facteurs au moins en fait partie.
 */
export function composerFrappe(p, a, b) {
    if (p.phase !== 'composer') return { ok: false, raison: 'phase' };
    const x = Number(a), y = Number(b);
    const bon = (v) => Number.isInteger(v) && v >= BORNES_COMPOSE.min && v <= BORNES_COMPOSE.max;
    if (!bon(x) || !bon(y)) return { ok: false, raison: 'bornes' };
    if (!p.tables.includes(x) && !p.tables.includes(y)) return { ok: false, raison: 'table' };
    p.balle = { texte: `${x} × ${y}`, reponse: x * y, op: 'mul', compose: true };
    p.dernier = p.balle.texte;
    p.table = p.tables.includes(x) ? x : y;
    p.defenseur = 1 - p.attaquant;
    p.phase = 'echange';
    return { ok: true };
}

/** Millisecondes de vol de la balle en cours : elle accélère à chaque frappe. */
export function dureeVol(p) {
    const r = RYTHMES[p && p.rythme] || RYTHMES[RYTHME_DEFAUT];
    const chauffe = (p.score[0] + p.score[1]) === 0 ? ECHAUFFEMENT : 1;
    return Math.max(r.minimum,
        Math.round(r.depart * chauffe * Math.pow(r.acceleration, p.echange)));
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
        // CELUI QUI RENVOIE DEVIENT L'ATTAQUANT. En mode automatique la
        // machine tire la frappe suivante tout de suite ; en mode composé, il
        // compose la sienne — et le duel repasse par l'écran de fabrication.
        p.attaquant = p.defenseur;
        p.defenseur = 1 - p.defenseur;
        if (p.envoi === 'compose') {
            p.balle = null;
            p.phase = 'composer';
            return { bon: true, point: null, aComposer: true };
        }
        p.balle = frappe(p, rng);
        return { bon: true, point: null, aComposer: false };
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
    if (p.phase !== 'point') return p;
    p.echange = 0;
    p.attaquant = p.serveur;
    // En mode composé, il n'y a pas de table à choisir : le serveur fabrique
    // directement sa brique.
    p.phase = p.envoi === 'compose' ? 'composer' : 'service';
    return p;
}

/** Combien de chiffres a la réponse attendue : le pavé valide tout seul à ce compte. */
export function longueurReponse(p) {
    return p.balle ? String(p.balle.reponse).length : 0;
}
