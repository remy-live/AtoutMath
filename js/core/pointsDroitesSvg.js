// LA FIGURE DE POINTS ET DE DROITES, DESSINÉE.
//
// Séparé du modèle (core/pointsDroites.js) qui, lui, ne connaît que des noms
// et des indices : ici on ne décide rien, on montre. Même partage que
// codage.js / codageSvg.js, et pour la même raison — la feuille imprimée doit
// pouvoir afficher exactement la même figure que l'écran.

import { marqueurPoint } from './figures.js';
import { boutsDe, droiteDe } from './pointsDroites.js';
import { marqueSvg } from './codageSvg.js';
import { marquesDe, egalitesDe } from './figureCodee.js';

const UNITE = 30;
const MARGE = 26;
/** De combien une droite dépasse ses points extrêmes, en unités de grille. */
const DEBORD = 1.15;

const n2 = (v) => Number(v).toFixed(1);

/**
 * LES ÉTIQUETTES NE SE POSENT PAS TOUTES DU MÊME CÔTÉ.
 *
 * Un nom posé systématiquement en haut à gauche finit un jour sur un trait,
 * et le trait le rend illisible. On essaie donc huit positions autour du
 * point et l'on garde la plus dégagée : celle dont le centre est le plus loin
 * de toutes les droites ET des étiquettes déjà posées.
 *
 * Ce n'est pas une mise en page optimale, c'est une mise en page SANS
 * COLLISION, ce qui est la seule chose qui compte ici.
 */
// HUIT PLACES NE SUFFISENT PAS À UN POINT DE CROISEMENT. Avec un seul rayon
// et huit directions, un point posé là où deux droites se coupent n'a AUCUNE
// place dégagée : les huit sont à portée de l'une ou de l'autre, et l'on
// choisit la moins mauvaise — c'est-à-dire une lettre barrée. MESURÉ : 31 noms
// sur 196 encore touchés après avoir corrigé les segments. On donne donc de la
// marge de manoeuvre : douze directions, deux distances, vingt-quatre places.
const AUTOUR = [];
for (const rayon of [1.2, 1.6, 2.1]) {
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        AUTOUR.push({ x: Math.cos(a) * rayon, y: Math.sin(a) * rayon });
    }
}

/** Les deux bouts RÉELLEMENT DESSINÉS d'une droite : ses points, dépassés. */
function traitDessine(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const e = DEBORD * UNITE;
    return [{ x: A.x - dx / L * e, y: A.y - dy / L * e },
        { x: B.x + dx / L * e, y: B.y + dy / L * e }];
}

function placerNoms(P, segments, boite) {
    const RAYON = 15;
    // LA LETTRE A UNE TAILLE, ET C'EST ELLE QU'UN TRAIT TRAVERSE. La première
    // version notait la distance du CENTRE de l'étiquette aux droites : un
    // centre à 15 px d'un trait laisse la lettre à sept, c'est-à-dire dessus.
    // On mesure donc depuis les bords de la lettre — un disque de 9 px suffit,
    // les noms font une seule capitale.
    const DEMI = 9;
    // ON RAMÈNE L'ÉTIQUETTE DANS LE CADRE, et c'est la dernière chose qu'on
    // fait — avant, la place choisie pouvait tomber dehors pour un point posé
    // sur le bord de la grille. Mesuré : cinq noms sortis du viewBox sur
    // quatre figures, tous aux bords. Un nom coupé ne nomme plus rien.
    const BORD = 12;
    const dansLeCadre = (q) => ({
        x: Math.max(BORD, Math.min(boite.W - BORD, q.x)),
        y: Math.max(BORD + 4, Math.min(boite.H - BORD, q.y))
    });
    const poses = [];
    const distSeg = (p, [a, b]) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const L2 = dx * dx + dy * dy;
        const t = L2 < 1e-9 ? 0 : Math.max(0, Math.min(1,
            ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    };
    const out = {};
    for (const nom of Object.keys(P)) {
        const c = P[nom];
        let meilleur = null, meilleurScore = -1;
        // ON NOTE LA PLACE QU'ON VA VRAIMENT PRENDRE, pas celle qu'on visait.
        // La pince qui ramène l'étiquette dans le cadre s'appliquait APRÈS le
        // choix : pour un point posé au bord, elle déplaçait le nom élu — et
        // pouvait le reposer exactement sur le trait qu'on venait de fuir.
        for (const dir of AUTOUR) {
            const q = dansLeCadre({ x: c.x + dir.x * RAYON, y: c.y + dir.y * RAYON });
            const aTraits = Math.min(...segments.map(s => distSeg(q, s))) - DEMI;
            const aNoms = poses.length ? Math.min(...poses.map(p => Math.hypot(q.x - p.x, q.y - p.y)))
                : 999;
            const score = Math.min(aTraits, aNoms * 0.8);
            if (score > meilleurScore) { meilleurScore = score; meilleur = q; }
        }
        poses.push(meilleur);
        out[nom] = meilleur;
    }
    return out;
}

/** Les coordonnées écran de tous les points nommés. */
export function projeter(sc) {
    const P = {};
    for (const [nom, p] of Object.entries(sc.points)) {
        P[nom] = { x: MARGE + p.x * UNITE, y: MARGE + (sc.grille.hauteur - p.y) * UNITE };
    }
    return P;
}

/**
 * La figure entière.
 *
 * @param {object} sc      la scène
 * @param {object} [cfg]
 * @param {{a:string,b:string,sorte:string}} [cfg.montrer]
 *   un objet à mettre en évidence — l'indice s'en sert pour MONTRER ce dont
 *   parle la question, ce qu'aucune phrase ne remplace.
 * @param {string[]} [cfg.vedettes] des points à faire ressortir
 */
export function sceneSvg(sc, cfg = {}) {
    const W = MARGE * 2 + sc.grille.largeur * UNITE;
    const H = MARGE * 2 + sc.grille.hauteur * UNITE;
    const P = projeter(sc);
    // LES SEGMENTS QU'ON ÉVITE SONT CEUX QU'ON DESSINE, dépassement compris.
    // Ils étaient pris entre les deux points nommés, alors que le trait les
    // dépasse de 34,5 px de chaque côté — tout le sens de la figure, d'ailleurs :
    // « un trait qui s'arrête pile sur le dernier point se lit comme un
    // segment ». Un nom posé au-delà d'un bout était donc noté LOIN de la
    // droite, et la droite lui passait dessus. MESURÉ avant : 56 noms sur 196
    // touchés par un trait, sur 28 figures — dont le « H » de la capture de
    // Rémy, barré au croisement des deux droites.
    const noms = placerNoms(P, sc.droites.map(d => {
        const [a, b] = boutsDe(d);
        return traitDessine(P[a], P[b]);
    }), { W, H });

    // LES DROITES DÉPASSENT LEURS POINTS, et c'est ce qui les fait lire comme
    // des droites. Un trait qui s'arrête pile sur le dernier point nommé se
    // lit comme un segment — et la question « X est-il sur (AB) ou seulement
    // sur [AB] ? » n'aurait alors plus d'objet.
    const traits = sc.droites.map(d => {
        const [a, b] = boutsDe(d);
        const A = P[a], B = P[b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const L = Math.hypot(dx, dy) || 1;
        const e = DEBORD * UNITE;
        return `<line class="pd-droite" x1="${n2(A.x - dx / L * e)}" y1="${n2(A.y - dy / L * e)}"
            x2="${n2(B.x + dx / L * e)}" y2="${n2(B.y + dy / L * e)}"/>`;
    }).join('');

    // L'OBJET MONTRÉ EST TRACÉ PAR-DESSUS, en couleur et plus épais : il ne
    // remplace pas la droite, il la surligne — comme le vert et le rouge que
    // Rémy fait poser sur sa fiche.
    let surligne = '';
    if (cfg.montrer) {
        const { a, b, sorte } = cfg.montrer;
        const d = droiteDe(sc, a, b);
        if (d) {
            const A = P[a], B = P[b];
            const dx = B.x - A.x, dy = B.y - A.y;
            const L = Math.hypot(dx, dy) || 1;
            const e = DEBORD * UNITE;
            const deb = sorte === 'droite'
                ? { x: A.x - dx / L * e, y: A.y - dy / L * e } : A;
            const fin = sorte === 'segment' ? B
                : { x: B.x + dx / L * e, y: B.y + dy / L * e };
            surligne = `<line class="pd-montre" x1="${n2(deb.x)}" y1="${n2(deb.y)}"
                x2="${n2(fin.x)}" y2="${n2(fin.y)}"/>`;
        }
    }

    const vedettes = new Set(cfg.vedettes || []);
    const marques = Object.keys(sc.points).map(nom =>
        marqueurPoint(P[nom].x, P[nom].y,
            vedettes.has(nom) ? 'pd-pt pd-pt--vedette' : 'pd-pt', 7)).join('');

    const etiquettes = Object.keys(sc.points).map(nom =>
        `<text class="pd-nom${vedettes.has(nom) ? ' pd-nom--vedette' : ''}"
            x="${n2(noms[nom].x)}" y="${n2(noms[nom].y + 5)}"
            text-anchor="middle">${nom}</text>`).join('');

    return `<svg class="fig-svg pd-svg" viewBox="0 0 ${W} ${H}"
        role="img" aria-label="${echapper(decrire(sc))}">
        ${traits}${surligne}${marques}${etiquettes}
    </svg>`;
}

const echapper = (t) => String(t).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * CE QUE LA FIGURE MONTRE, EN UNE PHRASE — pour qui ne la voit pas.
 *
 * Un `aria-label` qui dirait « une figure de géométrie » ne servirait
 * personne. Celui-ci nomme les droites et les points qu'elles portent, ce qui
 * est exactement ce que l'œil y lit.
 */
export function decrire(sc) {
    const lignes = sc.droites.map(d => {
        const [a, b] = boutsDe(d);
        return `la droite (${a}${b}) porte les points ${d.points.join(', ')}`;
    });
    const dehors = Object.keys(sc.points).filter(n =>
        !sc.droites.some(d => d.points.includes(n)));
    if (dehors.length) {
        lignes.push(`${dehors.length > 1 ? 'les points' : 'le point'} `
            + `${dehors.join(', ')} ${dehors.length > 1 ? 'ne sont' : 'n\'est'} sur aucune `
            + 'de ces droites');
    }
    return lignes.join(' ; ') + '.';
}

// ── LA FIGURE CODÉE ─────────────────────────────────────────────────────────
//
// Mêmes conventions que la figure de points et de droites — une croix pour le
// point, un nom à côté —, mais des SEGMENTS et non des droites, et les
// marques d'égalité par-dessus. Les marques sont dessinées par `codageSvg.js`,
// qui les pose déjà sur les quadrilatères : un trait, deux traits, trois
// traits, perpendiculaires au segment et centrés dessus. Deux dessins de la
// même chose dans la même application se mettraient tôt ou tard à diverger.

/**
 * @param {object} fig      une figure de `core/figureCodee.js`
 * @param {object} [cfg]
 * @param {object} [cfg.marques]  segment → numéro de marque ; par défaut,
 *   celles que le codage impose (`marquesDe`)
 * @param {string[]} [cfg.vedettes] des points à faire ressortir
 */
export function figureCodeeSvg(fig, cfg = {}) {
    // LA FIGURE TIENT DANS UNE BOÎTE, ELLE N'IMPOSE PAS SA TAILLE.
    //
    // Première version : une unité de grille fixe, à 34 pixels. Mesuré dans le
    // jeu : la figure du codage faisait 575 pixels de haut et sortait de la
    // zone par le haut — un point coupé par l'en-tête. Deux segments posés
    // l'un sous l'autre s'étendent sur une douzaine d'unités ; une unité fixe
    // ne peut pas convenir à la fois à ça et à une étoile de six unités.
    //
    // On calcule donc l'unité pour que l'étendue RÉELLE de la figure entre
    // dans la boîte, sans jamais l'agrandir au-delà du confortable. C'est ce
    // que `codageSvg.js` fait déjà pour les quadrilatères.
    const BOITE = { w: 330, h: 290 }, PAD = 34, UNIT_MAX = 34;
    const xs = Object.values(fig.points).map(p => p.x);
    const ys = Object.values(fig.points).map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const UNIT = Math.min(UNIT_MAX,
        (BOITE.w - 2 * PAD) / Math.max(x1 - x0, 1),
        (BOITE.h - 2 * PAD) / Math.max(y1 - y0, 1));
    const Wnu = PAD * 2 + (x1 - x0) * UNIT;
    const Hnu = PAD * 2 + (y1 - y0) * UNIT;

    // ── LA FIGURE NE DOIT PAS ÊTRE PLUS HAUTE QUE LARGE ─────────────────
    //
    // Deux segments posés l'un sous l'autre donnent une figure étroite et
    // haute — mesuré dans le jeu : 179 unités de large pour 290 de haut, soit
    // 622 pixels de hauteur une fois étirée à la largeur disponible. Elle
    // tenait dans la zone, mais elle occupait toute la colonne et poussait la
    // consigne en haut de l'écran.
    //
    // On élargit donc le CADRE — pas la figure : le dessin garde ses
    // proportions et se centre dans un cadre plus large. C'est le cadre qui
    // s'adapte, jamais les longueurs, qui portent le codage.
    const RAPPORT_MAX = 0.92;
    const W = Math.max(Wnu, Hnu / RAPPORT_MAX);
    const H = Hnu;
    const decalage = (W - Wnu) / 2;

    const P = {};
    for (const [nom, p] of Object.entries(fig.points)) {
        P[nom] = { x: decalage + PAD + (p.x - x0) * UNIT, y: PAD + (y1 - p.y) * UNIT };
    }
    const marques = cfg.marques || marquesDe(fig);
    const noms = placerNoms(P, fig.segments.map(s => [P[s.a], P[s.b]]), { W, H });

    const traits = fig.segments.map(s =>
        `<line class="pd-segment" x1="${n2(P[s.a].x)}" y1="${n2(P[s.a].y)}"
            x2="${n2(P[s.b].x)}" y2="${n2(P[s.b].y)}"/>`).join('');

    const codes = fig.segments.map(s => {
        const n = marques[`${s.a}${s.b}`] || marques[`${s.b}${s.a}`];
        return n ? marqueSvg(P[s.a], P[s.b], n, 'pd-marque') : '';
    }).join('');

    const vedettes = new Set(cfg.vedettes || []);
    const croix = Object.keys(fig.points).map(nom =>
        marqueurPoint(P[nom].x, P[nom].y,
            vedettes.has(nom) ? 'pd-pt pd-pt--vedette' : 'pd-pt', 7)).join('');

    const etiquettes = Object.keys(fig.points).map(nom =>
        `<text class="pd-nom${vedettes.has(nom) ? ' pd-nom--vedette' : ''}"
            x="${n2(noms[nom].x)}" y="${n2(noms[nom].y + 5)}"
            text-anchor="middle">${nom}</text>`).join('');

    return `<svg class="fig-svg pd-svg pd-svg--codee" viewBox="0 0 ${n2(W)} ${n2(H)}"
        role="img" aria-label="${echapper(decrireCodage(fig))}">
        ${traits}${codes}${croix}${etiquettes}
    </svg>`;
}

/** Ce que le codage montre, en une phrase — pour qui ne le voit pas. */
export function decrireCodage(fig) {
    const eg = egalitesDe(fig);
    const segs = fig.segments.map(s => `[${s.a}${s.b}]`).join(', ');
    if (!eg.length) return `Les segments ${segs}, sans marque d'égalité.`;
    return `Les segments ${segs}. Le codage indique : `
        + eg.map(([u, v]) => `${u} = ${v}`).join(', ') + '.';
}
