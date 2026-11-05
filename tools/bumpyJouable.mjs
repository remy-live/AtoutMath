// LES TABLEAUX DE BUMPY SONT-ILS FINISSABLES ? On cherche, on ne suppose pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/bumpyJouable.mjs            # les quatre tableaux
//   node tools/bumpyJouable.mjs 3          # le troisième seulement
//
// ── LA FRICTION QUE CET OUTIL FERME ────────────────────────────────────────
//
// Un tableau écrit à la main peut être injouable sans que rien ne le dise. La
// sonde d'écran voit une balle qui rebondit et des compteurs qui ne bougent
// pas : elle ne sait pas distinguer « le jeu est cassé » de « la balle ne peut
// pas monter jusque-là ». Les deux se sont produits le même jour, et l'un
// masquait l'autre pendant qu'on cherchait le second.
//
// MESURÉ : la hauteur d'un rebond valait 1,84 case alors que les tableaux
// demandaient d'en gravir trois. Aucun n'était finissable, et aucune épreuve
// ne rougissait.
//
// ── COMMENT ON CHERCHE ─────────────────────────────────────────────────────
//
// La balle est déterministe : une fois lancée, son vol ne dépend que de la
// touche qu'on tient. ON EXPLORE DONC LES DÉCISIONS, PAS LES PIXELS — à chaque
// rebond le joueur choisit gauche, rien, ou droite, et l'on rejoue le vol
// entier avec `avancer`, le vrai code du jeu. Largeur d'abord, donc le chemin
// trouvé est le plus court en nombre de rebonds.
//
// LE CHERCHEUR A DROIT À DEUX TOUCHES PAR SAUT : une en montant, une autre à
// partir du sommet. Ce n'est pas un raffinement gratuit — c'EST LE GESTE QUE
// LE JEU DEMANDE. Pour se poser SUR une plateforme, il faut monter À CÔTÉ
// d'elle puis se décaler une fois plus haut qu'elle ; une seule touche tenue
// du début à la fin bute contre son flanc et redescend. MESURÉ : avec une
// seule touche, le quatrième tableau n'atteignait jamais la ligne 5, alors
// qu'elle est à portée de rebond.
//
// CELA RESTE UNE MINORATION, ET C'EST VOULU : un humain change de touche quand
// il veut, le chercheur seulement au sommet. Tout ce qu'il trouve est donc
// jouable à coup sûr ; ce qu'il ne trouve pas mérite un coup d'œil, pas une
// condamnation.
//
// L'état retenu est (où l'on rebondit, ce qu'on a ramassé, ce qu'on a cassé,
// la goutte) — car casser une plateforme change le tableau, et l'oublier
// ferait croire le chercheur revenu deux fois au même endroit.

import { CASE, NIVEAUX, TUILE, avancer, etatInitial, lireNiveau } from '../js/core/bumpy.js';

/** Le pas de simulation, en secondes. Celui du jeu. */
const PAS = 0.02;
/** Au-delà, le vol ne rebondira plus : la balle est coincée ou perdue. */
const VOL_MAX = 4;
/** Garde-fou : si l'on dépasse, c'est que l'état n'est pas assez résumé. */
const ETATS_MAX = 400000;

/** Les cases qui comptent dans l'état : objets, gouttes, plateformes cassables. */
function casesMobiles(niveau) {
    const l = [];
    for (let r = 0; r < niveau.hauteur; r++) {
        for (let c = 0; c < niveau.largeur; c++) {
            const t = niveau.cases[r][c];
            if (t === TUILE.OBJET || t === TUILE.EAU || t === TUILE.CASSABLE) l.push({ c, r, t });
        }
    }
    return l;
}

/**
 * Le tableau, replanté à partir du masque de ce qui a disparu.
 *
 * ON GARDE UN MODÈLE PAR MASQUE, et l'on n'en recopie que les lignes : le
 * deuxième tableau demande neuf cent mille vols, donc autant de lectures du
 * tableau pour quelques dizaines de masques seulement.
 *
 * MESURÉ, ET MOINS QUE CE QU'ON ESPÉRAIT : 12,2 s avant, 10,4 s après. Le
 * temps est donc dans `avancer` lui-même — quarante-six millions de pas de
 * monde —, pas dans la lecture du tableau. On garde le modèle, qui ne coûte
 * rien, et l'on n'ira pas plus loin : onze secondes dans une suite de quatre
 * minutes est un prix honnête pour savoir que les quatre tableaux se finissent.
 */
function replanter(def, mobiles, masque, modeles) {
    let m = modeles.get(masque);
    if (!m) {
        m = lireNiveau(def);
        mobiles.forEach((mo, i) => {
            if (masque & (1 << i)) m.cases[mo.r][mo.c] = TUILE.VIDE;
        });
        modeles.set(masque, m);
    }
    return { ...m, cases: m.cases.map(l => l.slice()) };
}

/** Ce qui a disparu du tableau, en masque. */
function masqueDe(n, mobiles) {
    let m = 0;
    mobiles.forEach((mo, i) => { if (n.cases[mo.r][mo.c] !== mo.t) m |= (1 << i); });
    return m;
}

/** Les neuf manières de jouer un saut : une touche en montant, une au sommet. */
const GESTES = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b]));

/**
 * Rejoue un vol entier jusqu'au prochain rebond, en changeant de touche au
 * sommet du saut.
 * @returns {{etat, n, faits:string[]}|null} null si la balle est perdue.
 */
function unVol(def, mobiles, depart, masque, geste, modeles) {
    const n = replanter(def, mobiles, masque, modeles);
    let e = { ...depart };
    const faits = [];
    for (let t = 0; t < VOL_MAX / PAS; t++) {
        // LE SOMMET, C'EST QUAND LA BALLE NE MONTE PLUS.
        const entree = e.vy < 0 ? geste[0] : geste[1];
        const r = avancer(e, n, PAS, entree);
        e = r.etat;
        faits.push(...r.faits);
        if (e.mort) return null;
        if (e.fini) return { etat: e, n, faits };
        // ON S'ARRÊTE AU REBOND SUIVANT, et non au premier : le premier pas
        // peut encore porter le rebond d'où l'on part.
        if (r.faits.includes('rebond') && t > 1) return { etat: e, n, faits };
    }
    return null;   // elle ne rebondit plus : coincée
}

/** Cherche un chemin qui finit le tableau. */
export function chercher(def) {
    const n0 = lireNiveau(def);
    const mobiles = casesMobiles(n0);
    if (mobiles.length > 30) throw new Error(`${def.nom} : ${mobiles.length} cases mobiles, `
        + 'le masque ne tient plus sur un entier');
    const e0 = etatInitial(n0);
    const clef = (e, masque) => `${Math.round(e.x / 4)}|${Math.round(e.y / 4)}|${masque}`
        + `|${e.eau ? 1 : 0}`;

    const modeles = new Map();
    const file = [{ etat: e0, masque: 0, chemin: [] }];
    const vus = new Set([clef(e0, 0)]);
    let explores = 0;
    // CE QU'ON A VU DE MIEUX, pour que l'échec dise quelque chose. « Aucun
    // chemin » tout seul n'apprend rien : « il ramasse les quatre objets mais
    // n'atteint jamais la sortie » dit où regarder.
    const mieux = { objets: -1, eau: false, ouverte: false, x: 0, y: 0 };
    while (file.length) {
        const { etat, masque, chemin } = file.shift();
        for (const geste of GESTES) {
            const vol = unVol(def, mobiles, etat, masque, geste, modeles);
            if (!vol) continue;
            explores++;
            if (vol.etat.fini) return { trouve: true, chemin: [...chemin, geste], explores };
            const pris = n0.objets - vol.etat.restants;
            if (pris > mieux.objets) {
                Object.assign(mieux, { objets: pris, eau: vol.etat.eau,
                    ouverte: vol.etat.ouverte,
                    x: Math.floor(vol.etat.x / CASE), y: Math.floor(vol.etat.y / CASE) });
            }
            const m2 = masqueDe(vol.n, mobiles);
            const k = clef(vol.etat, m2);
            if (vus.has(k)) continue;
            if (vus.size > ETATS_MAX) return { trouve: false, debordement: true, explores, mieux };
            vus.add(k);
            file.push({ etat: vol.etat, masque: m2, chemin: [...chemin, geste] });
        }
    }
    return { trouve: false, explores, mieux };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const seul = process.argv[2] ? Number(process.argv[2]) : null;
    let ratés = 0;
    NIVEAUX.forEach((def, i) => {
        if (seul && i + 1 !== seul) return;
        const n = lireNiveau(def);
        const t0 = Date.now();
        const r = chercher(def);
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        const un = (e) => (e < 0 ? '←' : e > 0 ? '→' : '·');
        const flèche = (g) => un(g[0]) + un(g[1]);
        if (r.trouve) {
            console.log(`\x1b[32m✓\x1b[0m tableau ${i + 1} — ${def.nom} : finissable en `
                + `${r.chemin.length} rebonds \x1b[2m(${sec} s, ${r.explores} vols)\x1b[0m`);
            console.log('   ' + r.chemin.map(flèche).join(' '));
        } else {
            ratés++;
            console.log(`\x1b[31m✗\x1b[0m tableau ${i + 1} — ${def.nom} : AUCUN CHEMIN TROUVÉ `
                + `\x1b[2m(${sec} s, ${r.explores} vols`
                + `${r.debordement ? ', débordement d\'états' : ''})\x1b[0m`);
            console.log(`   ${n.objets} objet(s) à ramasser, sortie en `
                + `(${n.sortie.c} ; ${n.sortie.r})`);
            if (r.mieux) {
                console.log(`   au mieux : ${r.mieux.objets} objet(s) ramassé(s), `
                    + `goutte ${r.mieux.eau ? 'prise' : 'non prise'}, sortie `
                    + `${r.mieux.ouverte ? 'OUVERTE' : 'fermée'} — dernier rebond en `
                    + `(${r.mieux.x} ; ${r.mieux.y})`);
            }
        }
    });
    console.log(ratés ? `\n\x1b[31m${ratés} tableau(x) à redessiner.\x1b[0m`
        : '\n\x1b[32mTOUS LES TABLEAUX SE FINISSENT.\x1b[0m');
    process.exit(ratés ? 1 : 0);
}
