// LES ANGLES REMARQUABLES : LA VALEUR QUI MANQUE, ET LE NOM DE LA RELATION.
//
// Rémy, sa fiche « Les angles — 5ᵉ » en main : « j'aimerais bien des exercices
// comme le 8 et du 15 au 21 ». Ce sont les deux faces d'un même chapitre :
//
//   · L'EXERCICE 8 nomme. Deux droites se croisent, une sécante coupe deux
//     parallèles : comment s'appelle ce couple d'angles ? Adjacents, opposés
//     par le sommet, correspondants, alternes-internes, complémentaires,
//     supplémentaires. Six mots, et rien à calculer.
//   · LES EXERCICES 15 À 21 calculent. La même figure, un angle donné, un
//     angle à trouver — et c'est la relation qui donne la réponse. Du niveau 0
//     (les opposés par le sommet sont égaux) jusqu'à la chaîne de deux pas
//     (d'abord supplémentaires, puis correspondants).
//
// CE MODULE NE DESSINE RIEN. Il donne LA FIGURE EN DONNÉES : des traits et des
// arcs, dans un carré de côté 2 centré sur l'origine, y vers le haut comme en
// mathématiques. L'écran en fait du SVG, la feuille du jsPDF, et les deux
// montrent la même chose parce qu'ils lisent les mêmes nombres.
//
// LA FIGURE EST TOUJOURS PENCHÉE. Une paire d'angles opposés par le sommet
// posée bien droite se reconnaît à sa forme, sans jamais regarder les côtés :
// c'est le piège de tous les manuels. On tire donc une inclinaison au hasard,
// comme Rémy le fait à la main.

/**
 * LES SIX RELATIONS DU CHAPITRE.
 *
 * `de` donne la mesure du second angle à partir du premier — c'est toute la
 * règle, et c'est elle qu'on fait dire à l'élève. `pourquoi` est la phrase
 * qu'écrirait un professeur au tableau : elle sert d'explication, et de
 * modèle de rédaction sur le corrigé.
 */
export const RELATIONS = {
    opposes: {
        id: 'opposes', nom: 'opposés par le sommet',
        de: (a) => a,
        pourquoi: 'deux angles opposés par le sommet sont ÉGAUX',
        calcul: (a) => `${a}°`
    },
    correspondants: {
        id: 'correspondants', nom: 'correspondants',
        de: (a) => a,
        pourquoi: 'deux angles correspondants définis par des droites parallèles sont ÉGAUX',
        calcul: (a) => `${a}°`
    },
    alternes: {
        id: 'alternes', nom: 'alternes-internes',
        de: (a) => a,
        pourquoi: 'deux angles alternes-internes définis par des droites parallèles sont ÉGAUX',
        calcul: (a) => `${a}°`
    },
    complementaires: {
        id: 'complementaires', nom: 'complémentaires',
        de: (a) => 90 - a,
        pourquoi: 'deux angles complémentaires ont pour somme 90°',
        calcul: (a) => `90° − ${a}° = ${90 - a}°`
    },
    supplementaires: {
        id: 'supplementaires', nom: 'supplémentaires',
        de: (a) => 180 - a,
        pourquoi: 'deux angles supplémentaires ont pour somme 180°',
        calcul: (a) => `180° − ${a}° = ${180 - a}°`
    },
    plein: {
        id: 'plein', nom: 'autour d\'un point',
        de: (a) => 360 - a,
        pourquoi: 'les angles autour d\'un point ont pour somme 360°',
        calcul: (a) => `360° − ${a}° = ${360 - a}°`
    }
};

/** Un couple d'angles ADJACENTS n'a pas de valeur à trouver : c'est un nom. */
export const ADJACENTS = { id: 'adjacents', nom: 'adjacents' };

const RAD = Math.PI / 180;
const pt = (r, deg) => ({ x: r * Math.cos(deg * RAD), y: r * Math.sin(deg * RAD) });

/** Une droite entière qui passe par (x, y) dans la direction `deg`. */
function droite(x, y, deg, r = 1.1, pointille = false) {
    const a = pt(r, deg), b = pt(r, deg + 180);
    return { x1: x + a.x, y1: y + a.y, x2: x + b.x, y2: y + b.y, pointille };
}

/** Une demi-droite issue de (x, y). */
function demi(x, y, deg, r = 1.1) {
    const a = pt(r, deg);
    return { x1: x, y1: y, x2: x + a.x, y2: y + a.y };
}

/**
 * DEUX DROITES QUI SE CROISENT : quatre angles, deux mesures.
 *
 * L'angle donné et celui qu'on cherche sont désignés par leur RANG autour du
 * point, dans le sens direct à partir de la première droite. Le rang 0 et le
 * rang 2 sont opposés par le sommet ; le rang 0 et le rang 1 sont adjacents,
 * et supplémentaires.
 */
export function figureSecantes({ angle, penche = 0, rangDonne = 0, rangCherche = 2 }) {
    const base = penche;
    const bords = [base, base + angle, base + 180, base + angle + 180];
    const traits = [droite(0, 0, base), droite(0, 0, base + angle)];
    const arc = (rang, role) => ({
        x: 0, y: 0, de: bords[rang], a: bords[(rang + 1) % 4] + (rang === 3 ? 360 : 0), role
    });
    return { traits, arcs: [arc(rangDonne, 'donne'), arc(rangCherche, 'cherche')] };
}

/**
 * UN ANGLE PARTAGÉ EN DEUX : le complémentaire, le supplémentaire, le plein.
 *
 * `ouverture` est l'angle total — 90, 180 ou 360 —, et `angle` la part qu'on
 * donne. Le reste est ce qu'on cherche. Les deux côtés extérieurs sont tracés,
 * plus la demi-droite qui partage.
 */
export function figurePartage({ ouverture, angle, penche = 0 }) {
    const d = penche;
    const traits = [];
    // POUR UN ANGLE PLAT, LE CÔTÉ EXTÉRIEUR EST UNE DROITE ENTIÈRE : c'est ce
    // qui se voit, et c'est ce qui explique le 180°. Pour l'angle plein, les
    // deux côtés se confondent — une seule demi-droite suffit.
    if (ouverture === 180) traits.push(droite(0, 0, d));
    else if (ouverture === 360) traits.push(demi(0, 0, d));
    else { traits.push(demi(0, 0, d)); traits.push(demi(0, 0, d + ouverture)); }
    traits.push(demi(0, 0, d + angle));
    return {
        traits,
        arcs: [
            { x: 0, y: 0, de: d, a: d + angle, role: 'donne' },
            { x: 0, y: 0, de: d + angle, a: d + ouverture, role: 'cherche' }
        ],
        // L'équerre du 90° : sans elle, rien ne dit que l'angle total est droit.
        droit: ouverture === 90 ? { x: 0, y: 0, de: d, a: d + 90 } : null
    };
}

/**
 * DEUX PARALLÈLES ET UNE SÉCANTE : huit angles, deux mesures.
 *
 * C'est la figure du chapitre. Les deux parallèles sont EN POINTILLÉS, comme
 * sur la fiche de Rémy — le pointillé dit « ces deux-là sont parallèles » sans
 * qu'il faille l'écrire à côté.
 *
 * Les huit angles se numérotent en deux paquets de quatre, du sommet du haut
 * puis du sommet du bas, dans le sens direct à partir de la sécante. Deux
 * angles de même rang sont CORRESPONDANTS ; les rangs 2 (en haut) et 0 (en
 * bas) sont ALTERNES-INTERNES.
 */
export function figureParalleles({ angle, penche = 0, ecart = 0.55, relation = 'correspondants' }) {
    const sec = penche;                        // direction de la sécante
    const par = penche + angle;                // direction des parallèles
    // Les deux sommets sont posés SUR la sécante, de part et d'autre du centre.
    const u = pt(ecart, sec);
    const hauts = { x: u.x, y: u.y }, bas = { x: -u.x, y: -u.y };
    const traits = [
        droite(0, 0, sec, 1.15),
        droite(hauts.x, hauts.y, par, 0.95, true),
        droite(bas.x, bas.y, par, 0.95, true)
    ];
    // Les quatre bords d'un sommet, dans le sens direct.
    const bords = [sec, par, sec + 180, par + 180];
    const arcAu = (s, rang, role) => ({
        x: s.x, y: s.y, de: bords[rang], a: bords[(rang + 1) % 4] + (rang === 3 ? 360 : 0), role
    });
    // CORRESPONDANTS : même rang aux deux sommets — même « coin » de chaque
    // croisement. ALTERNES-INTERNES : deux coins opposés, tous deux ENTRE les
    // parallèles, de part et d'autre de la sécante.
    const arcs = relation === 'alternes'
        ? [arcAu(hauts, 2, 'donne'), arcAu(bas, 0, 'cherche')]
        : [arcAu(hauts, 0, 'donne'), arcAu(bas, 0, 'cherche')];
    return { traits, arcs };
}

/** Ramène un angle dans [0, 360[. */
const tour = (d) => ((d % 360) + 360) % 360;

/**
 * La mesure d'un arc, en degrés — c'est elle qu'on écrit dans l'étiquette.
 * Toujours positive, toujours celle du secteur réellement dessiné.
 */
export function mesureArc(arc) {
    return Math.round(tour(arc.a - arc.de));
}

/**
 * LA HAUTEUR D'UNE ÉTIQUETTE, DANS LES UNITÉS DE LA FIGURE.
 *
 * Elle est fixée ICI et non dans chaque rendu, parce que c'est elle qui décide
 * où l'étiquette se pose : « 40° » n'entre pas entre les côtés d'un angle de
 * quarante degrés si on l'écrit trop près du sommet, et le seul moyen de le
 * savoir est de connaître sa taille. L'écran et la feuille la lisent et
 * l'appliquent à leur échelle — donc une étiquette occupe la même part du
 * dessin des deux côtés, et le calcul ci-dessous est vrai pour les deux.
 */
export const HAUTEUR_ETIQUETTE = 0.2;

/**
 * L'ÉTIQUETTE EST-ELLE DANS LE SECTEUR OU DERRIÈRE L'ARC ?
 *
 * Les deux rendus ont besoin de le savoir pour choisir la couleur du liseré
 * qui la détache : dehors, celle du fond de la page ; dedans, celle du secteur
 * — sinon le liseré blanc perce un trou au milieu de la couleur.
 */
export function etiquetteDedans(arc) {
    return mesureArc(arc) >= 90;
}

/**
 * OÙ POSER L'ÉTIQUETTE D'UN ARC : sur sa bissectrice, à bonne distance.
 *
 * Un angle de dix degrés n'a pas la place d'écrire « 10° » entre ses côtés :
 * l'étiquette s'éloigne alors du sommet, là où le secteur s'élargit. C'est ce
 * qu'on fait à la main, et sans quoi les petits angles sont illisibles.
 */
export function ancreArc(arc, rayon) {
    const m = mesureArc(arc);
    const rs = rayon === undefined ? rayonSecteur(arc) : rayon;
    // UN GRAND SECTEUR PORTE SON ÉTIQUETTE DEDANS. Posée au-delà de l'arc,
    // elle flottait dans le vide pour un angle de deux cents degrés — et l'on
    // ne savait plus lequel des deux secteurs elle désignait.
    if (etiquetteDedans(arc)) {
        const p = pt(rs * 0.62, arc.de + m / 2);
        return { x: arc.x + p.x, y: arc.y + p.y };
    }
    // UN PETIT SECTEUR EST UN COIN, et l'on n'écrit pas dans un coin : le
    // nombre se pose DERRIÈRE l'arc, comme dans un manuel. Deux distances à
    // respecter, on prend la plus grande. D'abord passer l'arc, sinon
    // l'étiquette est un trou blanc au milieu de la couleur. Ensuite tenir
    // entre les deux côtés : à la distance r du sommet, la place vaut r·tan(m/2)
    // de part et d'autre de la bissectrice, et c'est ce qui écarte l'étiquette
    // d'un angle de dix degrés. Sans ce calcul, « 40° » chevauchait un côté.
    const demi = HAUTEUR_ETIQUETTE / 2;
    const large = Math.tan(Math.max(6, m) / 2 * RAD);
    const r = Math.min(rs * 2, Math.max(rs + HAUTEUR_ETIQUETTE * 0.75, (demi * 1.2) / large));
    const p = pt(r, arc.de + m / 2);
    return { x: arc.x + p.x, y: arc.y + p.y };
}

/**
 * LE CONTOUR D'UN SECTEUR, EN POINTS — pas en arc de cercle.
 *
 * Un arc SVG et un arc jsPDF ne s'écrivent pas pareil : sens de rotation,
 * grand-arc, repère qui descend ou qui monte. Quatre occasions de diverger
 * pour un même angle. Un polygone échantillonné tous les six degrés se dessine
 * à l'identique des deux côtés, et l'œil ne fait pas la différence.
 */
export function contourSecteur(arc, rayon, pas = 6) {
    const m = mesureArc(arc);
    const n = Math.max(2, Math.ceil(m / pas));
    const pts = [{ x: arc.x, y: arc.y }];
    for (let i = 0; i <= n; i++) {
        const p = pt(rayon, arc.de + (m * i) / n);
        pts.push({ x: arc.x + p.x, y: arc.y + p.y });
    }
    return pts;
}

/** L'équerre du 90° : trois points, le coin vers l'extérieur. */
export function equerreDe(droit, cote = 0.16) {
    const a = pt(cote, droit.de), b = pt(cote, droit.a);
    return [
        { x: droit.x + a.x, y: droit.y + a.y },
        { x: droit.x + a.x + b.x, y: droit.y + a.y + b.y },
        { x: droit.x + b.x, y: droit.y + b.y }
    ];
}

/**
 * LE RAYON D'UN SECTEUR. Deux secteurs voisins au même sommet se recouvrent
 * s'ils ont le même rayon : on donne au second un cercle un peu plus large,
 * comme on empile deux arcs à la main. Et un secteur presque plein — la part
 * de 300° d'un angle plein — se resserre, sinon il mange toute la figure.
 */
export function rayonSecteur() {
    // LE SECTEUR EST CE QU'ON REGARDE, LE TRAIT N'EST QU'UN SUPPORT. C'est le
    // rapport entre les deux qui décide de la lisibilité : des côtés trois fois
    // plus longs que le rayon du secteur, et l'angle n'était plus qu'un éclat
    // de couleur au milieu d'une croix — sur un téléphone, invisible. On a donc
    // raccourci les côtés ET élargi les secteurs, jusqu'à ce que l'angle occupe
    // le tiers de la figure, comme sur la fiche de Rémy.
    //
    // LE MÊME RAYON POUR TOUS LES SECTEURS D'UN SOMMET.
    //
    // On les avait d'abord emboîtés, un cercle par secteur, comme on empile
    // deux arcs à la main. Mauvaise idée : deux secteurs voisins ne se
    // recouvrent JAMAIS — ils se partagent un côté —, et deux rayons
    // différents donnaient deux disques superposés dont on ne savait plus
    // lequel était lequel. À rayon égal, ils pavent le tour du point, et la
    // frontière entre eux EST le côté commun. C'est le dessin du manuel.
    return 0.4;
}

/**
 * L'INCLINAISON QUI ÉTALE LA FIGURE.
 *
 * L'inclinaison est tirée au hasard — c'est ce qui empêche de reconnaître un
 * angle droit à sa forme. Mais une même figure penchée à 10° tient dans une
 * bande large et basse, et penchée à 80° dans une colonne haute et étroite ;
 * or les deux places qu'on lui donne — le bloc d'une fiche, le dessus d'un
 * pavé numérique sur téléphone — sont toutes les deux plus larges que hautes.
 * Debout, la figure se réduit alors à un fil au milieu du vide.
 *
 * On essaie donc six inclinaisons à partir de celle qu'on a tirée, et l'on
 * garde LA PLUS PROCHE d'une fois et demie plus large que haute. Pas la plus
 * couchée : à prendre le maximum, une figure sortait parfois en bande de trois
 * pour un, aussi illisible que debout. Le hasard reste entier — c'est le point
 * de départ qui est tiré —, seule la posture est choisie.
 */
export function pencheEtale(fabrique, penche0, rapport = 1.5) {
    const cible = Math.log(rapport);
    let meilleur = null;
    for (let i = 0; i < 6; i++) {
        const f = fabrique(penche0 + i * 30);
        const b = boiteFigure(f);
        const ecart = Math.abs(Math.log(b.largeur / b.hauteur) - cible);
        if (!meilleur || ecart < meilleur.ecart) meilleur = { f, ecart };
    }
    return meilleur.f;
}

/**
 * LA BOÎTE EXACTE DE LA FIGURE, étiquettes comprises.
 *
 * Un carré inscrit ne suffit pas : deux droites sécantes penchées à quinze
 * degrés occupent une bande large et basse, et forcées dans un carré elles
 * n'en remplissent qu'un tiers. C'est la même leçon que pour les rapporteurs
 * de la fiche d'angles — « on perd de la place, ils se réfugient dans un
 * coin » : on mesure ce qu'on dessine, et l'on ajuste dessus.
 *
 * Les ancres des étiquettes en font partie : un « 257° » posé hors du cadre
 * est aussi perdu qu'un trait qui déborde.
 */
export function boiteFigure(figure) {
    let xmin = 0, xmax = 0, ymin = 0, ymax = 0;
    const voir = (x, y) => {
        xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
        ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
    };
    (figure.traits || []).forEach(t => { voir(t.x1, t.y1); voir(t.x2, t.y2); });
    (figure.arcs || []).forEach(a => {
        const p = ancreArc(a);
        // L'étiquette occupe une petite boîte autour de son ancre : quatre
        // signes de large (« 257° »), une hauteur d'étiquette de haut.
        const lg = HAUTEUR_ETIQUETTE * 4 * 0.58 / 2, ht = HAUTEUR_ETIQUETTE * 0.62;
        voir(p.x - lg, p.y - ht); voir(p.x + lg, p.y + ht);
    });
    return {
        xmin, xmax, ymin, ymax,
        largeur: Math.max(0.2, xmax - xmin),
        hauteur: Math.max(0.2, ymax - ymin)
    };
}
