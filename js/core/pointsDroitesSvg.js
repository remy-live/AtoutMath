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
// LES TROIS TOURS SONT ESSAYÉS DU PLUS PROCHE AU PLUS LOIN, et c'est l'ordre
// qui compte — voir `placerNoms`. Groupés, parce qu'on s'arrête au premier qui
// dégage assez. Chaque tour est un FACTEUR appliqué à la distance de contact,
// et non une distance : voir `TYPO`.
const TOURS = [1, 1.45, 2];
const DIRECTIONS = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6;
    return { x: Math.cos(a), y: Math.sin(a) };
});

/**
 * LA DISTANCE D'UNE ÉTIQUETTE À SON POINT EST UNE AFFAIRE DE TYPOGRAPHIE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, deuxième fois sur le même sujet : « c'est encore bien éloigné le
 * libellé du point dans le codage ». La première correction avait rapproché la
 * lettre — de 15 unités de figure à 11 — et c'était la bonne direction, mais
 * la mauvaise grandeur.
 *
 * LE DÉFAUT, MESURÉ SUR LA FEUILLE : l'écart se compte en unités de FIGURE et
 * se réduit donc avec elle ; la lettre, elle, est posée en millimètres de PAGE
 * et ne bouge pas. Quatre figures par page ramènent la figure à un peu plus de
 * la moitié — et sur la même feuille on lisait alors :
 *
 *   · les étiquettes du tour le plus proche, à −0,7 px de blanc : COLLÉES à la
 *     croix, parfois dessus ;
 *   · celles qui avaient dû s'écarter d'un tour, à 5,6 px : plus d'une
 *     demi-hauteur de lettre, c'est-à-dire « bien éloigné ».
 *
 * Les deux défauts sur la même page, en sens contraire, pour la même raison :
 * un écart qui ne sait rien de la taille de la lettre.
 *
 * APRÈS, sur « lire un codage » et « le milieu », quatre figures par page : le
 * blanc tient entre −1,6 et −0,7 px. Il reste négatif parce qu'on mesure des
 * BOÎTES — celle d'une lettre est plus grande que son encre — mais l'écart
 * entre la plus serrée et la plus lâche passe de 6,3 px à 0,9. C'est cette
 * UNIFORMITÉ qui se voit, pas la valeur.
 *
 * ET L'AUTRE SENS, qui a failli passer inaperçu : le `DEGAGE` était resté un
 * nombre absolu quand tout le reste était devenu typographique. Sur une
 * feuille à UNE figure par page, il renvoyait d'un tour la moitié des noms —
 * 0,43 hauteur de lettre de blanc, contre 0,09 à quatre par page. Un seul
 * nombre non converti suffisait à rendre le défaut entier.
 *
 * ON SÉPARE DONC LES DEUX MÉTIERS. Le plan choisit la DIRECTION — c'est de la
 * géométrie, c'est lui qui sait où passent les traits et les autres noms. La
 * DISTANCE est de la typographie : marque + blanc + demi-encombrement de la
 * lettre DANS CETTE DIRECTION. Une lettre posée au-dessus s'écarte de sa
 * demi-hauteur, posée à droite de sa demi-largeur — et le blanc qu'on voit est
 * le même des deux côtés, ce que nul écart fixe ne donne.
 *
 * LES VALEURS SONT CELLES DE L'ÉCRAN, en unités de `viewBox` :
 *
 *   · `lettre` : `.pd-nom` est en `font-size: 17px`, et ces pixels-là sont des
 *     unités de la vue. L'encre d'une capitale grasse occupe environ 0,70 de
 *     la hauteur du corps et 0,62 de sa largeur — mesuré au navigateur,
 *     `getBBox` rend 12,0 de haut pour un corps de 17 ;
 *   · `marque` : `marqueurPoint(..., 7)` trace une croix dont les branches
 *     vont à 7 × 0,72 = 5,04, plus le demi-trait ;
 *   · `blanc` : ce qui reste visible entre les deux. Un manuel en met peu —
 *     la lettre touche presque.
 *
 * Le papier passe les siennes, en unités de plan (ses millimètres divisés par
 * l'échelle de la figure) : voir `plantDeLaFigure` dans `fiches/elementsGeo.js`.
 */
export const TYPO = { corps: 17, encreH: 0.70, encreL: 0.62, marque: 6, blanc: 1.5 };

/**
 * Le demi-encombrement de la lettre dans une direction donnée.
 *
 * EXPORTÉ POUR QUE LES ÉPREUVES MESURENT LE BLANC — celui que Rémy voit — sans
 * recopier cette arithmétique. Deux copies de la même formule, et le chiffre
 * qu'annonce une garde cesse un jour d'être celui de la feuille.
 */
export const demiDuNom = (dir, t = TYPO) =>
    Math.abs(dir.x) * t.corps * t.encreL / 2 + Math.abs(dir.y) * t.corps * t.encreH / 2;

/** Les deux bouts RÉELLEMENT DESSINÉS d'une droite : ses points, dépassés. */
function traitDessine(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const e = DEBORD * UNITE;
    return [{ x: A.x - dx / L * e, y: A.y - dy / L * e },
        { x: B.x + dx / L * e, y: B.y + dy / L * e }];
}

function placerNoms(P, segments, boite, typo = TYPO) {
    // LA LETTRE SE POSE CONTRE SON POINT, PAS À CÔTÉ.
    //
    // RÉMY, sur « lire un codage » et sur « le milieu » : « le label du point
    // est loin du point. Vérifie aussi cela pour la version interactive. »
    //
    // CE QUI SE MESURE ICI N'EST PAS UNE DISTANCE, C'EST UN RAPPORT : une
    // étiquette est bien posée quand elle est NETTEMENT plus près de son point
    // que du point voisin le plus proche. Sur 670 étiquettes de « codage » et
    // de « milieu » :
    //
    //            rapport médian    pire cas
    //   avant        0,35            0,99   ← la lettre touchait l'autre point
    //   après        0,17            0,45
    //
    // Un rapport de 0,99 veut dire qu'un élève lisant la figure n'avait aucune
    // raison de rattacher la lettre à l'un plutôt qu'à l'autre.
    //
    // L'ÉCART NE SE DÉCIDE PLUS ICI : il se CALCULE, par direction, à partir de
    // la taille de la lettre — voir `TYPO`, juste au-dessus, qui porte toute
    // l'histoire de ce défaut. Un écart fixe donnait, sur la même page, des
    // lettres collées à leur croix et d'autres à une demi-hauteur de lettre.
    const contact = (dir) => typo.marque + typo.blanc + demiDuNom(dir, typo);
    // LA LETTRE A UNE TAILLE, ET C'EST ELLE QU'UN TRAIT TRAVERSE. La première
    // version notait la distance du CENTRE de l'étiquette aux droites : un
    // centre à 15 px d'un trait laisse la lettre à sept, c'est-à-dire dessus.
    // On mesure donc depuis les bords de la lettre — un disque de sa
    // demi-hauteur suffit, les noms font une seule capitale.
    const DEMI = typo.corps * typo.encreH / 2 + 1;
    // ON RAMÈNE L'ÉTIQUETTE DANS LE CADRE, et on le fait AVANT de la noter —
    // la pince appliquée après le choix déplaçait le nom élu et pouvait le
    // reposer sur le trait qu'on venait de fuir. Mesuré à l'époque : cinq noms
    // sortis du viewBox sur quatre figures, tous aux bords.
    //
    // CE FILET NE SERT PRESQUE PLUS, et il faut le dire plutôt que de le
    // laisser croire gardé. Depuis que la lettre se pose CONTRE son point, elle
    // ne va plus assez loin pour sortir : mesuré sur 90 figures, la pince
    // déplace encore 243 des 15 588 places ESSAYÉES, mais aucune des 540 places
    // RETENUES — retirée entièrement, pas un nom ne bouge. Aucune épreuve ne
    // peut donc la faire tomber, et `epreuveTombe` l'a refusée. On la garde
    // comme garde-fou (les tours sont des facteurs : un jour plus grands, elle
    // resservira), pas comme une règle qu'on prétend tenir.
    // EN UNITÉS DE LETTRE, LUI AUSSI : une demi-lettre, plus un peu d'air. Sur
    // l'écran cela vaut 11,5 — les 12 d'avant, à un demi-pixel près — et sur
    // une feuille à quatre figures par page, six. Un bord fixe aurait repoussé
    // les noms du papier beaucoup plus loin qu'il ne faut, et c'est la pince
    // qui aurait alors décidé de la place.
    const BORD = typo.corps * 0.5 + 3.5;
    const dansLeCadre = (q) => ({
        x: Math.max(BORD, Math.min(boite.W - BORD, q.x)),
        y: Math.max(BORD + 4, Math.min(boite.H - BORD, q.y))
    });
    // DÉGAGEMENT SUFFISANT : au-delà, être PLUS PRÈS vaut mieux qu'être mieux
    // dégagé.
    //
    // C'est toute la correction, et elle ne tient pas au rayon. Le score CROÎT
    // avec la distance — un nom posé loin est forcément loin des traits —,
    // donc le plus grand des trois tours gagnait PRESQUE TOUJOURS, même quand
    // le plus proche était déjà parfaitement libre.
    //
    // Mesuré avant, sur 670 étiquettes : écart médian de 31,5 px, c'est-à-dire
    // 15 × 2,1 — le tour le plus large, dans la quasi-totalité des cas. Après :
    // 13,2 px, le tour le plus étroit, pour 659 étiquettes sur 670 ; les onze
    // autres sont celles qui en avaient vraiment besoin.
    //
    // ET IL SE COMPTE EN LETTRES, comme tout le reste ici. Resté à 2 unités de
    // figure, il a fait repartir d'un tour la moitié des noms d'un grand bloc :
    // la feuille à UNE figure par page remettait alors 0,43 hauteur de lettre
    // de blanc là où celle à quatre en mettait 0,09. Le dernier nombre absolu
    // d'une fonction devenue typographique faisait tout le défaut à lui seul.
    const DEGAGE = typo.corps * 0.12;
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
        for (const tour of TOURS) {
            let deCeTour = null, scoreDeCeTour = -1;
            for (const dir of DIRECTIONS) {
                const d = contact(dir) * tour;
                const q = dansLeCadre({ x: c.x + dir.x * d, y: c.y + dir.y * d });
                const aTraits = Math.min(...segments.map(s => distSeg(q, s))) - DEMI;
                const aNoms = poses.length
                    ? Math.min(...poses.map(p => Math.hypot(q.x - p.x, q.y - p.y))) : 999;
                const score = Math.min(aTraits, aNoms * 0.8);
                if (score > scoreDeCeTour) { scoreDeCeTour = score; deCeTour = q; }
                if (score > meilleurScore) { meilleurScore = score; meilleur = q; }
            }
            // ON S'ARRÊTE AU PREMIER TOUR QUI DÉGAGE ASSEZ. Les suivants ne
            // feraient qu'éloigner la lettre de ce qu'elle nomme.
            if (scoreDeCeTour >= DEGAGE) { meilleur = deCeTour; break; }
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
/**
 * LA GÉOMÉTRIE DE LA SCÈNE — sans une once de SVG.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, dans sa revue du catalogue, quatre fois : « tu oublies toutes les
 * figures sur la version imprimé ».
 *
 * La feuille ne sait pas lire un SVG : elle est dessinée par jsPDF, en traits
 * et en points. Il lui faut donc les COORDONNÉES, et l'on ne pouvait pas les
 * lui donner tant qu'elles n'existaient que sous forme de balises.
 *
 * ON NE RECALCULE RIEN DE L'AUTRE CÔTÉ, et c'est tout l'objet de cette
 * fonction. Le placement des noms, en particulier, est une correction payée :
 * « 56 noms sur 196 touchés par un trait, sur 28 figures » — dont le « H » de
 * la capture de Rémy, barré au croisement des deux droites. Le papier hérite de
 * cette mesure au lieu de la refaire, et mal.
 *
 * Les coordonnées sont celles de l'écran ; au papier de les ramener à ses
 * millimètres.
 */
export function planDeLaScene(sc, cfg = {}) {
    const W = MARGE * 2 + sc.grille.largeur * UNITE;
    const H = MARGE * 2 + sc.grille.hauteur * UNITE;
    const P = projeter(sc);

    /** Un trait allongé du débord, d'un côté, des deux, ou d'aucun. */
    const allonger = (A, B, avant, apres) => {
        const dx = B.x - A.x, dy = B.y - A.y;
        const L = Math.hypot(dx, dy) || 1;
        const e = DEBORD * UNITE;
        return {
            x1: avant ? A.x - dx / L * e : A.x, y1: avant ? A.y - dy / L * e : A.y,
            x2: apres ? B.x + dx / L * e : B.x, y2: apres ? B.y + dy / L * e : B.y
        };
    };

    // LES SEGMENTS QU'ON ÉVITE SONT CEUX QU'ON DESSINE, dépassement compris.
    // Un nom posé au-delà d'un bout était sinon noté LOIN de la droite, et la
    // droite lui passait dessus.
    // `cfg.typo` : LE PAPIER A SA PROPRE TAILLE DE LETTRE, et c'est elle qui
    // décide de l'écart — voir `TYPO`. Sans ce passage, la feuille héritait de
    // l'écart de l'écran réduit par son échelle, et les lettres touchaient leur
    // croix. L'écran, lui, ne passe rien et garde `TYPO`.
    const noms = placerNoms(P, sc.droites.map(d => {
        const [a, b] = boutsDe(d);
        return traitDessine(P[a], P[b]);
    }), { W, H }, cfg.typo || TYPO);

    // LES DROITES DÉPASSENT LEURS POINTS, et c'est ce qui les fait lire comme
    // des droites. Un trait qui s'arrête pile sur le dernier point nommé se
    // lit comme un segment — et la question « X est-il sur (AB) ou seulement
    // sur [AB] ? » n'aurait alors plus d'objet.
    const traits = sc.droites.map(d => {
        const [a, b] = boutsDe(d);
        return allonger(P[a], P[b], true, true);
    });

    // L'OBJET MONTRÉ : il ne remplace pas la droite, il la surligne — comme le
    // vert et le rouge que Rémy fait poser sur sa fiche. Un segment s'arrête à
    // ses deux points, une demi-droite déborde d'un seul côté, une droite des
    // deux : c'est la distinction que tout l'exercice enseigne.
    let surligne = null;
    if (cfg.montrer) {
        const { a, b, sorte } = cfg.montrer;
        if (droiteDe(sc, a, b)) {
            surligne = allonger(P[a], P[b], sorte === 'droite', sorte !== 'segment');
        }
    }

    const vedettes = new Set(cfg.vedettes || []);
    const points = Object.keys(sc.points).map(nom =>
        ({ nom, x: P[nom].x, y: P[nom].y, vedette: vedettes.has(nom) }));

    return { W, H, traits, surligne, points, noms };
}

/**
 * La figure entière, en SVG — pour l'écran.
 *
 * @param {object} sc      la scène
 * @param {object} [cfg]
 * @param {{a:string,b:string,sorte:string}} [cfg.montrer]
 *   un objet à mettre en évidence — l'indice s'en sert pour MONTRER ce dont
 *   parle la question, ce qu'aucune phrase ne remplace.
 * @param {string[]} [cfg.vedettes] des points à faire ressortir
 */
export function sceneSvg(sc, cfg = {}) {
    const { W, H, traits, surligne, points, noms } = planDeLaScene(sc, cfg);
    const ligne = (cls, t) => `<line class="${cls}" x1="${n2(t.x1)}" y1="${n2(t.y1)}"
            x2="${n2(t.x2)}" y2="${n2(t.y2)}"/>`;

    return `<svg class="fig-svg pd-svg" viewBox="0 0 ${W} ${H}"
        role="img" aria-label="${echapper(decrire(sc))}">
        ${traits.map(t => ligne('pd-droite', t)).join('')}
        ${surligne ? ligne('pd-montre', surligne) : ''}
        ${points.map(p => marqueurPoint(p.x, p.y,
        p.vedette ? 'pd-pt pd-pt--vedette' : 'pd-pt', 7)).join('')}
        ${points.map(p => `<text class="pd-nom${p.vedette ? ' pd-nom--vedette' : ''}"
            x="${n2(noms[p.nom].x)}" y="${n2(noms[p.nom].y + 5)}"
            text-anchor="middle">${p.nom}</text>`).join('')}
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
/**
 * LE PLAN D'UNE FIGURE CODÉE — les coordonnées, sans SVG.
 *
 * Même raison que `planDeLaScene` : la feuille dessine en traits et en points,
 * pas en balises. Rémy : « sur la version imprimé tu oublies toutes les
 * figures... ». Le calcul d'unité et de cadre ci-dessous est fait de mesures
 * prises dans le jeu ; le papier en hérite au lieu de le refaire.
 */
export function planFigureCodee(fig, cfg = {}) {
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
    // `cfg.typo` : voir `planDeLaScene` et `TYPO` — le papier passe la sienne.
    const noms = placerNoms(P, fig.segments.map(s => [P[s.a], P[s.b]]),
        { W, H }, cfg.typo || TYPO);
    const vedettes = new Set(cfg.vedettes || []);

    return {
        W, H, UNIT,
        segments: fig.segments.map(s => ({
            a: s.a, b: s.b, A: P[s.a], B: P[s.b],
            marque: marques[`${s.a}${s.b}`] || marques[`${s.b}${s.a}`] || 0
        })),
        points: Object.keys(fig.points).map(nom =>
            ({ nom, x: P[nom].x, y: P[nom].y, vedette: vedettes.has(nom) })),
        noms
    };
}

/** La figure codée en SVG — pour l'écran. */
export function figureCodeeSvg(fig, cfg = {}) {
    const { W, H, segments, points, noms } = planFigureCodee(fig, cfg);

    const traits = segments.map(s =>
        `<line class="pd-segment" x1="${n2(s.A.x)}" y1="${n2(s.A.y)}"
            x2="${n2(s.B.x)}" y2="${n2(s.B.y)}"/>`).join('');

    const codes = segments.map(s =>
        (s.marque ? marqueSvg(s.A, s.B, s.marque, 'pd-marque') : '')).join('');

    const croix = points.map(p => marqueurPoint(p.x, p.y,
        p.vedette ? 'pd-pt pd-pt--vedette' : 'pd-pt', 7)).join('');

    const etiquettes = points.map(p =>
        `<text class="pd-nom${p.vedette ? ' pd-nom--vedette' : ''}"
            x="${n2(noms[p.nom].x)}" y="${n2(noms[p.nom].y + 5)}"
            text-anchor="middle">${p.nom}</text>`).join('');

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
