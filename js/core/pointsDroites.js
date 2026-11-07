// DES POINTS ET DES DROITES — le modèle, et rien que le modèle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sa fiche « Éléments de géométrie » de 6e à l'appui : les exercices 11,
// 12 et 13 tiennent une page entière sur ∈ et ∉, et l'application n'avait
// rien — aucune compétence, aucun exercice. C'est pourtant ce qu'un écran fait
// mieux qu'une photocopie : une figure neuve à chaque question.
//
// ── L'INCIDENCE EST EXACTE, ELLE N'EST JAMAIS APPROCHÉE ─────────────────────
//
// Un point est sur une droite parce qu'il a été CONSTRUIT dessus — base + k·u
// avec k entier —, pas parce que sa distance calculée est petite. Rien ici ne
// compare un flottant à un epsilon : l'appartenance est une propriété de la
// construction, et le dessin n'en est que la trace.
//
// C'est ce qui permet d'affirmer une correction sans réserve. Un générateur
// qui poserait des points au hasard et déciderait ensuite « c'est assez près,
// donc c'est dessus » finirait par marquer faux un élève qui a bien lu.
//
// ── ET AUCUN POINT N'EST « PRESQUE » SUR UNE DROITE ─────────────────────────
//
// Je lui avais posé la question — faut-il parfois placer un point très proche
// d'une droite sans y être, comme on le fait sur papier ? Sa réponse : « NON ».
//
// Il a raison, et pour une raison qui tient à l'écran plus qu'à la pédagogie :
// sur une feuille, l'élève approche sa règle et tranche ; sur un écran il n'a
// que ses yeux, et une figure qui se joue à trois pixels ne mesure plus sa
// compréhension de l'appartenance, elle mesure son acuité visuelle. Tout point
// hors d'une droite en est donc écarté d'au moins `ECART_MIN` unités de
// grille — vérifié à la construction, et un test le garde.

/** L'écart minimal, en unités de grille, entre un point et une droite qui ne le porte pas. */
export const ECART_MIN = 1.2;

/**
 * Les directions admises pour une droite.
 *
 * DES PENTES SIMPLES, ET C'EST UNE DÉCISION DE LECTURE. Une droite de pente
 * 7/3 traverse la grille en biais sans jamais passer par deux nœuds voisins :
 * ses points nommés se retrouvent aux deux bouts de la figure, et « ces trois
 * points sont-ils alignés ? » devient une question de patience. Les pentes
 * ci-dessous donnent des droites dont les points s'échelonnent régulièrement.
 */
const DIRECTIONS = [
    { x: 1, y: 0 }, { x: 0, y: 1 },
    { x: 1, y: 1 }, { x: 1, y: -1 },
    { x: 2, y: 1 }, { x: 2, y: -1 },
    { x: 1, y: 2 }, { x: 1, y: -2 },
    { x: 3, y: 1 }, { x: 3, y: -1 }
];

/** Les lettres des points, sans I ni O — voir plus bas : elles se lisent mal. */
const LETTRES = 'ABCDEFGHJKLMNPRSTUVZ'.split('');

const dist2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

/**
 * La distance d'un point à la DROITE portée par a et b.
 *
 * Sert uniquement à écarter les points qui seraient trop près — jamais à
 * décider qu'un point est dessus. Voir l'en-tête.
 */
export function distanceDroite(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy);
    if (n < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / n;
}

/**
 * Une scène : des points nommés, et des droites qui en portent certains.
 *
 * Chaque droite est décrite par sa base, sa direction et la LISTE ORDONNÉE des
 * points qu'elle porte, rangés dans le sens de la direction. Cet ordre est
 * tout ce dont on a besoin ensuite : « X est-il entre A et B ? » se lit sur
 * les indices, sans aucun calcul de distance.
 *
 * @param {object} rng
 * @param {object} cfg
 * @param {number} [cfg.droites]      combien de droites (2 ou 3)
 * @param {number} [cfg.parDroite]    combien de points nommés par droite
 * @param {number} [cfg.horsDroites]  combien de points sur aucune droite
 * @param {boolean} [cfg.croisement]  une des droites en coupe une autre en un point nommé
 */
export function scene(rng, cfg = {}) {
    const nbDroites = cfg.droites || 2;
    const parDroite = cfg.parDroite || 3;
    const horsDroites = cfg.horsDroites === undefined ? 2 : cfg.horsDroites;
    const croisement = cfg.croisement !== false;
    const LARGE = 12, HAUT = 9;

    // ON REJOUE PLUTÔT QUE DE RATTRAPER. Une scène se construit en posant des
    // contraintes les unes sur les autres — points distincts, écarts
    // suffisants, droites non confondues — et rattraper la dernière en
    // déplaçant un point casse les précédentes. On retire tout, ce qui est
    // sans risque : chaque tirage est indépendant et les réussites sont
    // fréquentes.
    for (let essai = 0; essai < 300; essai++) {
        const fait = tenter(rng, { nbDroites, parDroite, horsDroites, croisement, LARGE, HAUT });
        if (fait) return fait;
    }
    // Aucun repli approximatif : un appelant qui reçoit `null` doit rejouer,
    // pas dessiner une figure dont on ne sait rien.
    return null;
}

function tenter(rng, o) {
    const points = {};        // nom → {x, y}
    const droites = [];       // {base, dir, points: [noms ordonnés]}
    const libres = rng.shuffle(LETTRES.slice());
    let curseur = 0;
    const nommer = () => libres[curseur++];

    const dansLaGrille = (p) => p.x >= 0 && p.x <= o.LARGE && p.y >= 0 && p.y <= o.HAUT;

    for (let d = 0; d < o.nbDroites; d++) {
        const dir = rng.pick(DIRECTIONS);
        // La base est un nœud de la grille ; on avance ensuite par pas
        // entiers, ce qui garantit que tous les points portés sont des nœuds.
        const base = { x: rng.int(0, o.LARGE), y: rng.int(0, o.HAUT) };
        const pas = [];
        for (let k = -6; k <= 6; k++) {
            const p = { x: base.x + k * dir.x, y: base.y + k * dir.y };
            if (dansLaGrille(p)) pas.push(p);
        }
        if (pas.length < o.parDroite + 1) return null;

        // Des positions ESPACÉES sur la droite : trois points collés au même
        // bout ne laissent rien à lire entre eux.
        const choix = choisirEspaces(rng, pas.length, o.parDroite);
        if (!choix) return null;
        const surCette = [];

        for (const i of choix) {
            const p = pas[i];
            // Un point déjà nommé au même endroit : c'est le croisement, et il
            // est PRÉCIEUX — « ce point est sur les deux droites ».
            const dejaLa = Object.keys(points).find(n => dist2(points[n], p) < 1e-9);
            if (dejaLa) { surCette.push(dejaLa); continue; }
            const nom = nommer();
            if (!nom) return null;
            points[nom] = p;
            surCette.push(nom);
        }
        droites.push({ base: pas[choix[0]], dir, points: surCette });
    }

    // DEUX DROITES CONFONDUES NE SONT PAS DEUX DROITES. Même direction et un
    // point commun : la figure en montrerait une seule, et toutes les
    // questions sur « l'autre » n'auraient plus de sens.
    for (let i = 0; i < droites.length; i++) {
        for (let j = i + 1; j < droites.length; j++) {
            if (memeDroite(droites[i], droites[j], points)) return null;
        }
    }

    // LE CROISEMENT EST NOMMÉ, ou il ne sert à rien. Un point qui appartient à
    // deux droites est la seule façon de poser « X ∈ (AB) ET X ∈ (CD) », et
    // c'est la figure de son exercice 13.
    const partages = Object.keys(points).filter(n =>
        droites.filter(dr => dr.points.includes(n)).length >= 2);
    if (o.croisement && !partages.length) return null;

    // Les points HORS de toute droite, et franchement hors : voir ECART_MIN.
    let poses = 0;
    for (let essai = 0; essai < 200 && poses < o.horsDroites; essai++) {
        const p = { x: rng.int(0, o.LARGE), y: rng.int(0, o.HAUT) };
        if (Object.keys(points).some(n => dist2(points[n], p) < 4)) continue;
        const loin = droites.every(dr => {
            const [a, b] = [points[dr.points[0]], points[dr.points[dr.points.length - 1]]];
            return distanceDroite(p, a, b) >= ECART_MIN;
        });
        if (!loin) continue;
        const nom = nommer();
        if (!nom) return null;
        points[nom] = p;
        poses++;
    }
    if (poses < o.horsDroites) return null;

    // ── AUCUN POINT N'EST « PRESQUE » SUR UNE DROITE, ET C'EST TOUS LES
    //    POINTS, PAS SEULEMENT CEUX QU'ON A POSÉS DEHORS ──────────────────
    //
    // Ma première version ne vérifiait l'écart que pour les points placés hors
    // de toute droite. Un point porté par la PREMIÈRE droite pouvait donc
    // passer à 0,89 unité de la SECONDE — mesuré, scène 3 du test : K frôlait
    // (TL) sans y être. À l'écran, cela se joue à quelques pixels, et c'est
    // exactement ce à quoi Rémy a répondu « NON ».
    //
    // La règle porte sur les couples (point, droite qui ne le porte pas), quel
    // que soit ce qui a amené le point là. Le test la vérifie dans ce sens-là ;
    // la construction doit donc la poser dans ce sens-là aussi.
    for (const nom of Object.keys(points)) {
        for (const dr of droites) {
            if (dr.points.includes(nom)) continue;
            const [u, v] = [points[dr.points[0]], points[dr.points[dr.points.length - 1]]];
            if (distanceDroite(points[nom], u, v) < ECART_MIN) return null;
        }
    }

    // TOUS LES POINTS SE DISTINGUENT À L'ŒIL. Deux points à une unité l'un de
    // l'autre portent des étiquettes qui se chevauchent, et l'on ne sait plus
    // lequel est lequel.
    const noms = Object.keys(points);
    for (let i = 0; i < noms.length; i++) {
        for (let j = i + 1; j < noms.length; j++) {
            if (dist2(points[noms[i]], points[noms[j]]) < 4) return null;
        }
    }

    return { points, droites, grille: { largeur: o.LARGE, hauteur: o.HAUT } };
}

/** Deux droites portent-elles le même trait ? */
function memeDroite(d1, d2, points) {
    const a = points[d1.points[0]], b = points[d1.points[d1.points.length - 1]];
    return d2.points.every(n => distanceDroite(points[n], a, b) < 1e-9);
}

/** `k` indices sur `n` positions, jamais deux voisins, rendus triés. */
function choisirEspaces(rng, n, k) {
    for (let essai = 0; essai < 60; essai++) {
        const pris = new Set();
        while (pris.size < k) pris.add(rng.int(0, n - 1));
        const liste = [...pris].sort((a, b) => a - b);
        if (liste.every((v, i) => i === 0 || v - liste[i - 1] >= 2)) return liste;
    }
    return null;
}

// ── CE QUE LA SCÈNE SAIT DIRE ───────────────────────────────────────────────
//
// Toutes les réponses se lisent sur la LISTE ORDONNÉE des points d'une droite.
// Aucune ne recalcule une distance : l'ordre a été fixé à la construction, et
// c'est lui qui fait foi.

/** La droite qui porte `a` et `b`, s'il y en a une. */
export function droiteDe(sc, a, b) {
    return sc.droites.find(d => d.points.includes(a) && d.points.includes(b)) || null;
}

/**
 * `x` appartient-il à l'objet défini par `a` et `b` ?
 *
 * @param {'segment'|'droite'|'demi-droite'} sorte
 *   segment [ab] : entre a et b, bornes comprises ;
 *   droite (ab) : n'importe où sur la droite ;
 *   demi-droite [ab) : à partir de a, du côté de b.
 */
export function appartient(sc, x, a, b, sorte) {
    const d = droiteDe(sc, a, b);
    if (!d) return false;
    const i = d.points.indexOf(x);
    if (i < 0) return false;                      // pas sur cette droite du tout
    const ia = d.points.indexOf(a), ib = d.points.indexOf(b);
    if (sorte === 'droite') return true;
    if (sorte === 'segment') return i >= Math.min(ia, ib) && i <= Math.max(ia, ib);
    // Demi-droite [ab) : l'origine est a, et l'on va DANS le sens de b.
    return ib > ia ? i >= ia : i <= ia;
}

/** Les points de la scène qui appartiennent à l'objet. */
export function pointsSur(sc, a, b, sorte) {
    return Object.keys(sc.points).filter(x => appartient(sc, x, a, b, sorte));
}

/** Trois points sont alignés s'ils sont portés par une même droite. */
export function alignes(sc, x, y, z) {
    return sc.droites.some(d => [x, y, z].every(n => d.points.includes(n)));
}

/** Les deux points extrêmes d'une droite, pour la tracer. */
export function boutsDe(d) {
    return [d.points[0], d.points[d.points.length - 1]];
}
