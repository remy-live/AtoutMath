// LE PLATEAU DES NOMBRES — la règle, et rien que la règle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on est sur un plateau avec des nombres aux extrémités et on
// fonctionne par équipe, et sur le plateau chaque joueur porte un chiffre (qui
// peut changer) exemple un joueur de l'équipe rouge porte 7 et un autre 8 et il
// y a un 56 sur le plateau et il faut qu'il se retrouve pour prendre le 56 (on
// peut aussi faire cela pour l'addition). Si c'est un rouge et un bleu qui se
// rejoignent les points sont partagés. »
//
// ── POURQUOI CE JEU EST MEILLEUR QUE CEUX QUE J'AVAIS PROPOSÉS ────────────
//
// Les miens posaient une question et récompensaient la bonne réponse : les
// maths étaient À CÔTÉ du jeu. Ici elles SONT le geste. Pour prendre le 56 il
// faut l'avoir décomposé AVANT de savoir qui chercher des yeux — et un élève
// qui cherche « qui porte un 8 ? » sur le plateau est en train de faire de la
// décomposition, debout, sans qu'on le lui demande.
//
// ── CE FICHIER NE CONNAÎT NI LE SERVEUR NI L'ÉCRAN ────────────────────────
//
// Il ne dessine rien, il n'écrit rien, il ne lit l'heure nulle part. Tout ce
// qu'il contient est une FONCTION de ses arguments, donc tout se mesure en
// quelques millisecondes dans `npm test`. C'est ce qui permet de garder la
// règle du jeu — qui prend quoi, et pour combien de points — sans ouvrir un
// navigateur, et de ne garder dans la sonde que ce qui a vraiment besoin d'un
// écran : voir trente pions bouger.

import { makeRng } from './ids.js';

/**
 * LES NOMBRES QU'UN PION PEUT PORTER : de 2 à 9.
 *
 * PAS DE 1, ET C'EST UNE RÈGLE DE JEU, PAS UN OUBLI. Un pion qui porte 1
 * prendrait n'importe quelle cible avec n'importe quel partenaire (1 × 56 = 56)
 * et rendrait toute la décomposition inutile. PAS DE 0 NON PLUS : il
 * n'achèterait rien en multiplication, et en addition il ferait du pion un
 * passager.
 *
 * ET PAS DE 10, bien que ce soit un « chiffre » commode : 10 × 8 = 80 et
 * 8 × 10 = 80 sont la même prise, mais surtout la table de 10 ne s'apprend
 * pas — elle occuperait une place sur un plateau qui en a peu.
 */
export const NOMBRES = [2, 3, 4, 5, 6, 7, 8, 9];

/** Les deux opérations que Rémy a nommées. */
export const OPERATIONS = ['×', '+'];

/**
 * COMBIEN DE PIONS AU PLUS SUR UNE MÊME PRISE.
 *
 * RÉMY a choisi « deux ou trois » : 56 se prend à deux (7 × 8) ou à trois
 * (2 × 4 × 7). La prise à trois est de la décomposition en facteurs déguisée —
 * et elle demande de coordonner trois élèves, ce qui est beaucoup plus dur en
 * une minute. D'où le double de points, plus bas : il faut que l'effort se
 * paye, sinon personne ne le fera deux fois.
 */
export const PIONS_MAX = 3;

/**
 * CE QUE VAUT UNE PRISE.
 *
 * LA VALEUR DU NOMBRE EST LE NOMBRE DE POINTS. Prendre le 81 vaut vingt fois
 * prendre le 4, et c'est voulu : sans cela, tout le monde camperait sur les
 * petites cibles, qui sont les plus faciles à composer (le 4 ne demande qu'un
 * 2 et un 2). Le plateau serait rapide et sans choix.
 *
 * ET À TROIS PIONS, LE DOUBLE. RÉMY : « trois pions, plus de points ? » — oui,
 * et il le faut : réunir trois élèves au même endroit au même moment coûte
 * largement plus du double d'une rencontre à deux. Au prix d'une fois et
 * demie, personne ne tenterait.
 */
export function pointsDeLaPrise(valeur, combienDePions) {
    const v = Math.max(0, Math.round(Number(valeur) || 0));
    return combienDePions >= 3 ? v * 2 : v;
}

/**
 * CES NOMBRES-LÀ PRENNENT-ILS CETTE CIBLE ?
 *
 * C'EST L'ARBITRE DU JEU, et il tient en six lignes. On le garde pur et seul :
 * le serveur l'appellera pour trancher, l'écran pour dire à l'élève « il te
 * manque un 8 », et le robot du mode démo pour choisir où aller. Trois endroits,
 * une seule règle — trois règles séparées auraient fini par ne plus dire la
 * même chose, et c'est l'erreur que ce dépôt a déjà payée trois fois.
 *
 * @param {number} valeur la cible, par exemple 56
 * @param {Array<number>} nombres ce que portent les pions réunis
 * @param {'×'|'+'} operation
 */
export function prendLaCible(valeur, nombres, operation = '×') {
    const n = (nombres || []).map(Number).filter(x => Number.isFinite(x));
    // DEUX AU MOINS, TROIS AU PLUS. Un pion seul sur une cible ne prend rien —
    // c'est tout le principe du jeu de Rémy : il faut SE RETROUVER.
    if (n.length < 2 || n.length > PIONS_MAX) return false;
    if (n.some(x => !NOMBRES.includes(x))) return false;
    const fait = operation === '+'
        ? n.reduce((a, b) => a + b, 0)
        : n.reduce((a, b) => a * b, 1);
    return fait === Math.round(Number(valeur));
}

/**
 * TOUTES LES FAÇONS DE PRENDRE CETTE CIBLE, à deux puis à trois.
 *
 * Elle sert à TROIS choses, et c'est pourquoi elle est ici plutôt qu'enfouie
 * dans un écran : tirer un plateau dont toutes les cibles sont prenables ; dire
 * à l'élève ce qu'il lui manque ; et donner au robot du mode démo un but à
 * atteindre. Les combinaisons sont rendues TRIÉES et sans doublon — (7, 8) et
 * (8, 7) sont la même rencontre.
 *
 * @returns {Array<Array<number>>} par exemple [[7,8],[2,4,7]] pour 56
 */
export function decompositions(valeur, operation = '×') {
    const v = Math.round(Number(valeur) || 0);
    const vues = new Set();
    const out = [];
    const garder = (liste) => {
        const clef = liste.join('·');
        if (vues.has(clef)) return;
        vues.add(clef);
        out.push(liste);
    };
    for (const a of NOMBRES) {
        for (const b of NOMBRES) {
            if (b < a) continue;
            if (prendLaCible(v, [a, b], operation)) garder([a, b]);
            for (const c of NOMBRES) {
                if (c < b) continue;
                if (prendLaCible(v, [a, b, c], operation)) garder([a, b, c]);
            }
        }
    }
    return out;
}

/** Les valeurs qu'on peut poser sur un plateau : celles qui se prennent à deux. */
export function valeursPossibles(operation = '×', quoi = {}) {
    const tables = Array.isArray(quoi.tables) && quoi.tables.length ? quoi.tables : null;
    const mini = Number(quoi.mini) || 0;
    const vues = new Set();
    for (const a of NOMBRES) {
        for (const b of NOMBRES) {
            // UNE TABLE SE RECONNAÎT À L'UN DE SES DEUX FACTEURS. « La table de
            // 7 », ce sont les 7 × k — et 56 en fait partie qu'on l'écrive
            // 7 × 8 ou 8 × 7, parce que c'est le même carré sur le plateau.
            if (tables && !tables.includes(a) && !tables.includes(b)) continue;
            const v = operation === '+' ? a + b : a * b;
            if (v < mini) continue;
            vues.add(v);
        }
    }
    // UN FILTRE QUI NE LAISSE RIEN NE REND PAS UN PLATEAU VIDE.
    //
    // C'est la garde la moins intéressante à écrire et la plus coûteuse à
    // oublier : un plateau sans un seul carré, c'est trente élèves devant un
    // damier mort, et aucune erreur nulle part pour le dire. On retombe sur
    // toutes les valeurs, ce qui est un jeu jouable — simplement pas celui
    // qu'on avait demandé.
    if (!vues.size) return valeursPossibles(operation);
    return [...vues].sort((x, y) => x - y);
}

/**
 * LES NOMBRES QUI SERVENT VRAIMENT SUR CE PLATEAU-CI.
 *
 * Sur un plateau de la table de 7, un pion qui démarre avec un 3 n'est utile
 * qu'à 21 et 63 ; sur un plateau de grands nombres, un 2 ne sert presque à
 * rien. On tire donc les nombres de DÉPART parmi ceux qui composent les carrés
 * posés : la partie est jouable dès la première seconde, au lieu de commencer
 * par trente changements de nombre.
 *
 * LE CLAVIER DES « deviens », LUI, GARDE TOUS LES NOMBRES : c'est à l'élève de
 * s'apercevoir qu'un 5 ne sert à rien sur la table de 7, et cette découverte-là
 * vaut mieux qu'un bouton grisé.
 */
export function nombresUtiles(plateau) {
    const vus = new Set();
    for (const c of (plateau.cibles || [])) {
        for (const v of decompositions(c.valeur, plateau.operation)) {
            for (const n of v) vus.add(n);
        }
    }
    return vus.size ? [...vus].sort((a, b) => a - b) : [...NOMBRES];
}

/**
 * LE PLATEAU, TIRÉ D'UNE GRAINE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LA MÊME GRAINE DONNE LE MÊME PLATEAU, et c'est ce qui permet au serveur de ne
 * RIEN ranger de la grille : les trente ardoises et le vidéoprojecteur la
 * recalculent chacun de leur côté, à l'identique. Le serveur ne garde que ce
 * qui CHANGE — où sont les pions, et ce qui a été pris. C'est exactement la
 * décision déjà prise pour les questions du défi, et pour la même raison : une
 * grille rangée en base serait une seconde vérité à tenir d'accord.
 *
 * RÉMY A CHOISI LES NOMBRES DISPERSÉS SUR TOUTE LA GRILLE, et non au bord : il
 * y a donc toujours une cible proche, le jeu ne commence pas par trente
 * secondes de marche, et personne n'attend.
 *
 * ── DEUX CIBLES NE SE TOUCHENT JAMAIS ─────────────────────────────────────
 *
 * Sans cette distance, deux nombres voisins se prendraient d'un même
 * attroupement : les élèves se masseraient à un endroit et le plateau ne
 * servirait plus à rien. On les écarte donc d'au moins deux cases.
 */
export function dessinerLePlateau({
    graine = 'plateau', largeur = 12, hauteur = 8, combien = 10, operation = '×',
    quoi = {}
} = {}) {
    const op = operation === '+' ? '+' : '×';
    // ── SUR QUOI ON JOUE ─────────────────────────────────────────────────
    //
    // RÉMY, quand je lui ai demandé par quoi commencer : « Choisir ce qu'on
    // travaille ». C'est ce qui manquait le plus — dans tout le reste du
    // logiciel il choisit le chapitre, et ici le plateau tirait dans les huit
    // tables mélangées. Un jeu qu'on ne peut pas accorder à sa séance reste
    // une récréation.
    //
    // LA GRAINE PORTE LE FILTRE, sans quoi deux plateaux réglés différemment
    // mais tirés de la même graine se ressembleraient — et « Rejouer » sur un
    // autre réglage rendrait exactement le même terrain.
    const marque = `${(quoi.tables || []).join('.')}-${quoi.mini || 0}`;
    const rng = makeRng(`plateau-${graine}-${op}-${marque}`);
    const choix = valeursPossibles(op, quoi);
    const cibles = [];
    const loinDeTout = (x, y) => cibles.every(c =>
        Math.abs(c.x - x) > 1 || Math.abs(c.y - y) > 1);
    // CENT ESSAIS, PUIS ON S'ARRÊTE. Un plateau trop petit pour le nombre de
    // cibles demandé rendrait moins de cibles plutôt que de tourner sans fin —
    // une boucle infinie dans un jeu de classe est pire qu'un plateau clairsemé.
    for (let essai = 0; essai < 400 && cibles.length < combien; essai++) {
        const x = rng.int(0, largeur - 1);
        const y = rng.int(0, hauteur - 1);
        if (!loinDeTout(x, y)) continue;
        cibles.push({ i: cibles.length, x, y, valeur: rng.pick(choix) });
    }
    return { graine, largeur, hauteur, operation: op, cibles };
}

/**
 * OÙ UN PION APPARAÎT EN ENTRANT, et pourquoi pas au hasard.
 *
 * LES DEUX ÉQUIPES ENTRENT PAR DEUX CÔTÉS OPPOSÉS. Un départ au hasard mettrait
 * les deux couleurs mélangées dès la première seconde, et la classe ne verrait
 * jamais ses équipes — or c'est la première chose qu'elle doit lire sur l'écran
 * du tableau. On les range donc en colonne, chacune de son bord, dans l'ordre
 * de la liste : la place d'un élève est stable d'une partie à l'autre.
 */
export function placeDeDepart(plateau, equipe, rangDansLEquipe) {
    const h = Math.max(1, plateau.hauteur);
    const colonne = equipe === 1 ? plateau.largeur - 1 : 0;
    // DEUX COLONNES S'IL Y A PLUS D'ÉLÈVES QUE DE LIGNES : une classe de trente
    // sur un plateau de huit lignes ne tient pas sur un seul bord.
    const profondeur = Math.floor(rangDansLEquipe / h);
    const x = equipe === 1 ? colonne - profondeur : colonne + profondeur;
    // AU CENTRE DE LA CASE, et non sur son coin : les pions sont des RONDS qui
    // se déplacent librement, pas des jetons posés sur une grille. Un demi en
    // plus, et le rond démarre là où l'œil l'attend.
    return {
        x: Math.max(0, Math.min(plateau.largeur - 1, x)) + 0.5,
        y: (rangDansLEquipe % h) + 0.5
    };
}

/* ─────────────── SE DÉPLACER LIBREMENT, ET NON DE CASE EN CASE ──────────── */

// RÉMY, après avoir vu la première version : « je voyais plus les joueurs comme
// des ronds qui se déplacent librement pas case par case et quand on recouvre
// un carré, le carré s'éclaire ».
//
// IL A RAISON, ET PAS SEULEMENT POUR LE PLAISIR DE L'ŒIL. Un déplacement de
// case en case fait du jeu une suite de tours : on attend son pas, on compte
// les cases, et deux élèves qui se cherchent se croisent par à-coups. Des ronds
// libres font de la RENCONTRE le geste central — on se voit venir, on ajuste,
// on se rejoint. C'est exactement ce que son jeu demande.
//
// LES POSITIONS DEVIENNENT DONC CONTINUES : `x` et `y` sont des nombres à
// virgule en unités de case, et non plus des entiers. La case que l'on recouvre
// est celle de la partie entière — c'est tout ce qui change pour la règle de
// prise, qui, elle, ne bouge pas d'une ligne.

/** Le rayon d'un pion, en cases. Deux pions tiennent largement sur un carré. */
export const RAYON = 0.34;

/** La vitesse d'un pion, en cases par seconde. */
export const VITESSE = 3.4;

/**
 * AVANCE UN ROND, borné au plateau.
 *
 * ON NORME LA DIRECTION, et ce n'est pas une coquetterie : sans cela, aller en
 * diagonale (dx = 1, dy = 1) irait UNE FOIS ET DEMIE plus vite que le long d'un
 * bord, et toute la classe jouerait en diagonale. C'est le premier défaut de
 * tous les jeux de déplacement libre.
 *
 * ET LE TEMPS ÉCOULÉ COMMANDE, pas le nombre d'images : une tablette à trente
 * images par seconde doit avancer d'autant qu'un ordinateur à soixante, sinon
 * le jeu récompense le matériel.
 */
export function avancer(plateau, x, y, dx, dy, dt, vitesse = VITESSE) {
    const norme = Math.hypot(dx, dy);
    if (!norme || !dt) return { x, y };
    const k = (vitesse * dt) / norme;
    return {
        x: Math.max(RAYON, Math.min(plateau.largeur - RAYON, x + dx * k)),
        y: Math.max(RAYON, Math.min(plateau.hauteur - RAYON, y + dy * k))
    };
}

/** La case entière que recouvre un rond posé en (x, y). */
export function caseSous(x, y) {
    return { x: Math.floor(x), y: Math.floor(y) };
}

/**
 * LA CIBLE QUI EST SOUS CES COORDONNÉES, ou rien.
 *
 * On la cherche par position et non par identifiant : un pion sait où il est,
 * il ne sait pas sur quoi il est tombé.
 *
 * LES COORDONNÉES SONT CONTINUES : on recouvre le carré dont on occupe la
 * partie entière. C'est la définition la plus simple de « recouvrir », et c'est
 * surtout la seule qui soit la MÊME pour l'élève et pour l'arbitre — un
 * chevauchement partiel se discuterait, un centre dans le carré ne se discute
 * pas.
 */
export function cibleSous(plateau, x, y) {
    const c = caseSous(x, y);
    return (plateau.cibles || []).find(k => k.x === c.x && k.y === c.y) || null;
}

/** La même, pour des coordonnées déjà entières (le semis des jetons). */
export function cibleEn(plateau, x, y) {
    return (plateau.cibles || []).find(c => c.x === x && c.y === y) || null;
}

/**
 * QUI PREND, PARMI LES PIONS RÉUNIS SUR UNE CIBLE ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'est l'arbitrage, et il doit être le MÊME pour tout le monde : le serveur
 * tranche, mais l'écran doit pouvoir dire « il te manque un 8 » avec la même
 * règle, sans quoi l'élève verrait une prise qui n'arrive pas.
 *
 * ── ON CHERCHE LA MEILLEURE PRISE, PAS LA PREMIÈRE ────────────────────────
 *
 * Cinq élèves sur le 56 : si l'on prenait la première paire trouvée, un
 * attroupement rendrait la prise à trois impossible alors qu'elle rapporte le
 * double. On essaie donc les triplets AVANT les paires, et à égalité on garde
 * ceux qui sont arrivés les premiers — c'est la seule part qui demande un ordre,
 * et le serveur le donne par la date d'arrivée.
 *
 * @param {Array<{id:string, nombre:number, equipe:number, depuis:number}>} pions
 *        les pions présents sur la case, `depuis` étant l'instant d'arrivée.
 * @returns {{pions:Array, points:number, partage:boolean, equipes:Array<number>}|null}
 */
export function quiPrend(valeur, pions, operation = '×') {
    const sur = [...(pions || [])].sort((a, b) => (a.depuis || 0) - (b.depuis || 0));
    const essayer = (taille) => {
        const combinaisons = [];
        const bâtir = (debut, courant) => {
            if (courant.length === taille) { combinaisons.push([...courant]); return; }
            for (let i = debut; i < sur.length; i++) {
                courant.push(sur[i]);
                bâtir(i + 1, courant);
                courant.pop();
            }
        };
        bâtir(0, []);
        return combinaisons.find(c =>
            prendLaCible(valeur, c.map(p => p.nombre), operation));
    };
    // LE TRIPLET D'ABORD : il vaut le double, et l'ignorer punirait les élèves
    // qui viennent justement de réussir le plus difficile.
    const trouve = essayer(3) || essayer(2);
    if (!trouve) return null;
    const equipes = [...new Set(trouve.map(p => p.equipe))];
    return {
        pions: trouve,
        points: pointsDeLaPrise(valeur, trouve.length),
        // RÈGLE DE RÉMY, MOT POUR MOT : « Si c'est un rouge et un bleu qui se
        // rejoignent les points sont partagés ». C'est la meilleure règle du
        // jeu : elle fait qu'on n'est JAMAIS bloqué faute de partenaire, et
        // elle pose un vrai choix — attendre son coéquipier pour tout gagner,
        // ou prendre l'adversaire qui est déjà là pour la moitié, tout de suite.
        partage: equipes.length > 1,
        equipes
    };
}

/**
 * CE QUE CHAQUE ÉQUIPE MARQUE SUR UNE PRISE.
 *
 * Partagée, la prise donne la MOITIÉ à chacune des deux équipes — et non la
 * moitié à l'une et rien à l'autre. « Les points sont partagés » ne veut rien
 * dire d'autre, et c'est ce qui rend la rencontre adverse intéressante pour les
 * DEUX élèves qui la font : aucun des deux ne se sacrifie.
 */
export function repartirLesPoints(prise) {
    if (!prise) return {};
    const out = {};
    const part = prise.partage
        ? Math.round(prise.points / prise.equipes.length)
        : prise.points;
    for (const e of prise.equipes) out[e] = part;
    return out;
}

/* ───────────────────────────── LE MODE DÉMO ─────────────────────────────── */

// RÉMY : « et j'aimerai bien un mode démo ».
//
// IL EST INDISPENSABLE, ET PAS SEULEMENT CONFORTABLE : un jeu à trente ne se
// regarde pas tout seul. Sans robots, Rémy ne peut PAS voir son propre jeu
// avant de le lancer devant une classe — et moi non plus je ne peux pas le
// mesurer sans ouvrir trente navigateurs.
//
// LE ROBOT JOUE LA MÊME PARTIE QUE L'ÉLÈVE : il lit le plateau par les mêmes
// fonctions, il marche d'un pas à la fois, et il ne sait rien que l'élève ne
// sache. Un robot qui tricherait montrerait un jeu qui n'existe pas.

/**
 * LE COUP D'UN ROBOT : devenir le bon nombre, ou faire un pas vers sa cible.
 *
 * ── SA STRATÉGIE, ET POURQUOI ELLE EST SIMPLE EXPRÈS ──────────────────────
 *
 * Il vise la cible la plus proche qu'il peut composer avec quelqu'un, prend le
 * nombre qui manque, et marche. Un robot plus malin ferait une démonstration
 * plus belle et un jeu plus décourageant : le mode démo doit montrer ce qu'un
 * élève peut faire, pas ce qu'une machine peut faire.
 *
 * @returns {{devenir:number}|{direction:string}|null}
 */
// LE PARAMÈTRE S'APPELLE `pion` ET NON `robot`, ET C'EST VOULU.
//
// Dans ce dépôt, `robot` désigne LE MENEUR DE DÉMONSTRATION — celui qui joue
// un exercice tout seul pour le montrer —, et `tests/gardesDemo.test.mjs` veille
// à ce qu'aucune garde ne lise un `robot` hors de sa portée. Cette épreuve est
// née d'un défaut qui avait coûté trente-cinq minutes. Employer le même mot
// pour un pion tenu par l'ordinateur l'aurait fait crier à tort, et surtout
// aurait mis deux sens derrière un seul mot dans le même code.
export function coupDuRobot(pion, plateau, pions, prises, rng = Math.random) {
    const prises_ = new Set(prises || []);
    const libres = (plateau.cibles || []).filter(c => !prises_.has(c.i));
    if (!libres.length) return null;
    // LE CENTRE DU CARRÉ, pas son coin : les positions sont continues
    // maintenant, et viser (x, y) ferait raser le bord de la case.
    const ecart = (c) => Math.hypot(c.x + 0.5 - pion.x, c.y + 0.5 - pion.y);
    const proches = [...libres].sort((a, b) => ecart(a) - ecart(b)).slice(0, 4);
    // SA CIBLE, ET IL N'EN CHANGE PAS À CHAQUE IMAGE : un pion qui recalculerait
    // tout soixante fois par seconde tremblerait sur place, et la démo
    // montrerait un jeu nerveux que personne ne joue.
    const vise = proches.find(c => c.i === pion.vise) || proches[0];
    if (!vise) return null;
    const voies = decompositions(vise.valeur, plateau.operation);
    if (!voies.length) return null;
    // IL REGARDE QUI RECOUVRE DÉJÀ LE CARRÉ, comme l'élève le ferait des yeux.
    const surPlace = (pions || []).filter((p) => {
        if (p.id === pion.id) return false;
        const c = caseSous(p.x, p.y);
        return c.x === vise.x && c.y === vise.y;
    }).map(p => p.nombre);
    const manque = voies
        .map(v => {
            const reste = [...v];
            for (const n of surPlace) {
                const k = reste.indexOf(n);
                if (k >= 0) reste.splice(k, 1);
            }
            return reste;
        })
        .sort((a, b) => a.length - b.length)[0] || voies[0];
    // S'IL NE PORTE PAS CE QU'IL FAUT, IL LE DEVIENT — c'est le moment où, dans
    // le style « question », l'élève doit répondre pour mériter son nombre.
    if (!manque.includes(pion.nombre) && manque.length) {
        const veut = manque[Math.floor(rng() * manque.length)];
        if (veut !== pion.nombre) return { devenir: veut, vise: vise.i };
    }
    const ici = caseSous(pion.x, pion.y);
    if (ici.x === vise.x && ici.y === vise.y) return { attendre: true, vise: vise.i };
    // IL VA EN LIGNE DROITE VERS LE CENTRE DU CARRÉ. Plus de pas cardinaux :
    // des ronds libres se dirigent, ils ne tournent pas à angle droit.
    return { vers: { dx: vise.x + 0.5 - pion.x, dy: vise.y + 0.5 - pion.y },
             vise: vise.i };
}
