// LE ROBOT QUI JOUE À BOULDER DASH — et qui dit si un tableau se finit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ── POURQUOI UN ROBOT, ET NON UNE RECHERCHE EXHAUSTIVE ─────────────────────
//
// Pour Bumpy, le chercheur est EXACT : trois coups par rebond, un état qui
// tient dans une chaîne, et ce qu'il ne trouve pas n'existe pas. Ici, non.
// L'état d'un tableau de Boulder Dash, c'est TOUTE LA GRILLE — chaque rocher
// qui tombe la change —, et quatre directions par pas. Explorer cela en
// largeur déborde avant le dixième coup, et une recherche qui déborde ne dit
// rien du tout.
//
// ON RENVERSE DONC LA QUESTION. Au lieu de « existe-t-il un chemin ? », on
// demande « UN JOUEUR SIMPLE Y ARRIVE-T-IL ? » : le robot va au diamant le
// plus proche, puis à la porte, en recalculant son chemin à chaque pas parce
// que le décor bouge sous lui. C'est une condition SUFFISANTE et non
// nécessaire — un tableau qu'il rate peut rester jouable pour un humain —,
// mais un tableau qu'il finit est jouable à coup sûr, et sans finesse.
//
// ET C'EST LA BONNE EXIGENCE POUR UNE RÉCRÉATION : si un robot qui ne regarde
// pas plus loin que le diamant suivant s'en sort, un élève de sixième aussi.
//
// ── IL VIT DANS LE NOYAU, ET NON DANS `tools/` ─────────────────────────────
//
// Parce qu'il sert DEUX FOIS : `tools/boulderJouable.mjs` s'en sert pour dire
// que les tableaux se finissent, et l'aperçu du professeur s'en sert pour
// JOUER. Un chemin recopié à la main dans le jeu cesserait d'être juste au
// premier rocher déplacé, en silence, et le robot de l'aperçu mourrait sans
// que rien ne rougisse. Celui-ci est recherché à la demande, donc vrai par
// construction.

import {
    DIRECTIONS, TUILE, avancer, etatInitial, lireNiveau
} from './boulderDash.js';

/** Une pierre, c'est-à-dire ce qui tombe. */
const pierre = (t) => t === TUILE.ROCHER || t === TUILE.DIAMANT;

/** Au-delà, le robot tourne en rond : on arrête et on le dit. */
const PAS_MAX = 900;

/** Les cases qu'un joueur peut traverser SANS pousser quoi que ce soit. */
function passable(n, c, r, ouverte) {
    const t = n.cases[r][c];
    return t === TUILE.TERRE || t === TUILE.VIDE || t === TUILE.DIAMANT
        || (t === TUILE.SORTIE && ouverte);
}

/**
 * Le plus court chemin vers l'une des cases visées, en largeur d'abord.
 *
 * ON IGNORE LES ROCHERS, et c'est volontaire : le robot ne pousse pas et ne
 * creuse pas sous une pierre exprès. Il se contente de ce qui est ouvert, ce
 * qui est exactement la façon dont on joue la première fois.
 */
function versLesCibles(n, depart, cibles, ouverte, interdits = new Set()) {
    const but = new Set(cibles.map(x => `${x.c},${x.r}`));
    if (!but.size) return null;
    const vus = new Map([[`${depart.c},${depart.r}`, null]]);
    const file = [depart];
    while (file.length) {
        const p = file.shift();
        const auDepart = p.c === depart.c && p.r === depart.r;
        if (but.has(`${p.c},${p.r}`) && !(p.c === depart.c && p.r === depart.r)) {
            // ON REMONTE LE FIL jusqu'au départ, et l'on rend le PREMIER pas.
            let ici = `${p.c},${p.r}`, pas = null;
            while (vus.get(ici)) { pas = ici; ici = vus.get(ici); }
            if (!pas) return null;
            const [c, r] = pas.split(',').map(Number);
            return { dc: c - depart.c, dr: r - depart.r };
        }
        for (const d of Object.values(DIRECTIONS)) {
            // LES PREMIERS PAS INTERDITS LE SONT ICI ET NON APRÈS COUP : si on
            // écartait la direction une fois le chemin calculé, le robot
            // repartirait vers le même but par le même côté et resterait
            // collé. En les interdisant dans la recherche, il CONTOURNE.
            if (auDepart && interdits.has(`${d.dc},${d.dr}`)) continue;
            const c = p.c + d.dc, r = p.r + d.dr;
            if (r < 0 || r >= n.hauteur || c < 0 || c >= n.largeur) continue;
            const k = `${c},${r}`;
            if (vus.has(k) || !passable(n, c, r, ouverte)) continue;
            vus.set(k, `${p.c},${p.r}`);
            file.push({ c, r });
        }
    }
    return null;
}

/** Où sont les diamants, maintenant. */
function diamants(n) {
    const l = [];
    for (let r = 0; r < n.hauteur; r++) {
        for (let c = 0; c < n.largeur; c++) if (n.cases[r][c] === TUILE.DIAMANT) l.push({ c, r });
    }
    return l;
}

/**
 * Fait jouer le robot et rend ce qu'il a fait.
 * @returns {{gagne:boolean, coups:Array, pas:number, pris:number, pourquoi:string}}
 */
export function faireJouer(def) {
    const n = lireNiveau(def);
    let e = etatInitial(n);
    const coups = [];
    const limite = Math.min(PAS_MAX, Math.floor(def.secondes * 1000 / 150));
    let attentes = 0;
    for (let pas = 0; pas < limite; pas++) {
        // ── LA SEULE PRUDENCE DU ROBOT, ET ELLE SUFFIT ─────────────────────
        //
        // IL NE DESCEND JAMAIS DE SOUS UNE PIERRE. Tant qu'il est dessous,
        // elle repose sur lui ; dès qu'il s'en va, elle tombe dans la case
        // qu'il quitte — et s'il est parti vers le BAS, elle le suit et
        // l'écrase au pas suivant. C'est la leçon entière de Boulder Dash,
        // et c'est une règle d'une ligne.
        //
        // MESURÉ : sans elle, le robot mourait au vingtième pas du deuxième
        // tableau, en (14 ; 4), juste après avoir pris le diamant posé sous
        // un rocher. Le tableau n'était pas en cause.
        const interdits = new Set();
        if (pierre(n.cases[e.r - 1] ? n.cases[e.r - 1][e.c] : TUILE.ROCHE)) {
            interdits.add('0,1');
        }
        // ET IL N'ENTRE PAS SOUS UNE PIERRE DÉJÀ EN ROUTE.
        for (const d2 of Object.values(DIRECTIONS)) {
            if (e.enChute.includes(`${e.c + d2.dc},${e.r + d2.dr - 1}`)) {
                interdits.add(`${d2.dc},${d2.dr}`);
            }
        }
        const cibles = e.ouverte ? [n.sortie] : diamants(n);
        const d = versLesCibles(n, { c: e.c, r: e.r }, cibles, e.ouverte, interdits);
        const r = avancer(e, n, d);
        coups.push(d);
        e = r.etat;
        if (e.fini) return { gagne: true, coups, pas: coups.length, pris: e.pris, pourquoi: '' };
        if (e.mort) {
            return { gagne: false, coups, pas: coups.length, pris: e.pris,
                pourquoi: `écrasé en (${e.c} ; ${e.r}) après ${coups.length} pas`, n, e };
        }
        if (!d) {
            // ON ATTEND UN PAS : une pierre qui tombe passe, et le chemin se
            // rouvre. Vingt attentes de suite, en revanche, c'est un blocage.
            if (++attentes < 20) continue;
            return { gagne: false, coups, pas: coups.length, pris: e.pris,
                pourquoi: e.ouverte ? 'la porte n\'est plus joignable'
                    : `plus aucun diamant joignable (${e.pris} pris sur ${n.ilEnFaut})`, n, e };
        }
        attentes = 0;
    }
    return { gagne: false, coups, pas: coups.length, pris: e.pris,
        pourquoi: `le temps s'épuise (${limite} pas, ${e.pris} diamants sur ${n.ilEnFaut})`, n, e };
}
