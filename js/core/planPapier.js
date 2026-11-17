// LE PLAN D'UNE FIGURE POUR LE PAPIER — des traits, et rien que des traits.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « et il faut la fiche pdf », puis, à ma question sur ce
// qu'elle devait porter : « avec des shémas évidemment ».
//
// ── LA DETTE QU'IL VIENT DE SOLDER ────────────────────────────────────────
//
// La feuille des aires et des volumes écrivait les dimensions EN TOUTES
// LETTRES — « Calcule l'AIRE d'un triangle : base 7 cm, hauteur 4 cm (côté
// oblique 5 cm) ». Le commentaire qui l'assumait est toujours dans le dépôt, et
// il disait vrai : « dessiner la hauteur et son angle droit en jsPDF est un
// travail à part, et une fiche à moitié dessinée serait pire qu'une fiche
// honnêtement écrite ».
//
// SAUF QUE LA HAUTEUR EST TOUT LE CHAPITRE. « Un élève qui prend le côté
// oblique a un calcul juste sur de mauvais nombres » — c'est écrit en tête de
// `core/aires.js`, et c'est la raison d'être des trois marches. Sur une feuille
// qui écrit « hauteur 4 cm », cette faute est IMPOSSIBLE : on lit le mot
// « hauteur » et on prend le nombre d'à côté. L'exercice imprimé ne mesure donc
// plus ce que l'exercice à l'écran mesure.
//
// ── UNE SEULE PRIMITIVE : LA LIGNE BRISÉE ─────────────────────────────────
//
// Pas d'arc, pas de courbe, pas d'ellipse. Un cercle est une ligne brisée de
// quarante segments, et à la taille d'impression personne ne voit la
// différence — tandis qu'un arc elliptique s'écrit d'une façon en SVG, d'une
// autre en jsPDF, et les deux dessins divergent au premier changement.
//
// C'est la règle de `mesurerBonds` dans `core/fiche.js`, poussée d'un cran :
// « c'est ici, UNE FOIS, qu'on décide où tombe chaque trait. Les deux traceurs
// ne font ensuite que recopier ces nombres. »
//
// ── LES UNITÉS SONT LIBRES, ET L'ORIGINE AUSSI ────────────────────────────
//
// Ce fichier dessine dans l'unité qui l'arrange, `y` vers le BAS. C'est
// `mesurerFigure` (core/fiche.js) qui recadre et met à l'échelle de la colonne.
// Un plan n'a donc jamais à savoir sur quelle feuille il tombera.

/* ── LES PRIMITIVES ───────────────────────────────────────────────────── */

/** Un plan vide, prêt à recevoir. */
export const plan = () => ({ traits: [], caches: [], droits: [], textes: [] });

/** Une ligne brisée fermée — un polygone. */
export const ferme = (pts) => pts.concat([pts[0]]);

/**
 * Une ellipse (ou un morceau), en ligne brisée.
 *
 * `de` et `a` sont en degrés, 0 à droite et croissant vers le BAS (y descend).
 * QUARANTE SEGMENTS POUR UN TOUR COMPLET : mesuré sur la feuille agrandie
 * quatre fois, on ne distingue plus les sommets au-delà de trente.
 */
export function ellipse(cx, cy, rx, ry, de = 0, a = 360) {
    const n = Math.max(6, Math.round(Math.abs(a - de) / 9));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = ((de + (a - de) * i / n) * Math.PI) / 180;
        pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
    }
    return pts;
}

/**
 * L'ANGLE DROIT EST UN PETIT CARRÉ, et il n'est pas décoratif : c'est lui qui
 * dit que le trait pointillé est une HAUTEUR et non un côté. Sans lui, le
 * pointillé est juste un trait de construction.
 */
export const droit = (x, y, dx, dy, c) => ({ x, y, dx, dy, c });

/**
 * Un nombre écrit sur le dessin. `ancre` : 'milieu', 'debut' ou 'fin'.
 *
 * ── L'ÉCART SE COMPTE EN HAUTEURS DE TEXTE, PAS EN UNITÉS DE DESSIN ───────
 *
 * VU SUR LA FEUILLE IMPRIMÉE, et c'est le défaut le plus visible du premier
 * jet : « 14 cm » écrit SUR le côté du rectangle. La raison tient en une
 * phrase — un écart donné en unités de dessin est mis à l'échelle AVEC le
 * dessin, alors que le texte, lui, reste à `o.taille` quoi qu'il arrive. Sur
 * une figure haute, l'échelle tombe, l'écart tombe avec elle, et l'étiquette
 * vient se coller au trait qu'elle est censée coter.
 *
 * `dx` et `dy` sont donc en HAUTEURS DE TEXTE, et `mesurerFigure` les ajoute
 * APRÈS la mise à l'échelle. 1,15 sous un trait horizontal, 0,35 pour centrer
 * verticalement sur un trait vertical : les deux valeurs de tout ce fichier.
 */
export const texte = (x, y, t, ancre = 'milieu', dx = 0, dy = 0) =>
    ({ x, y, t: String(t), ancre, dx, dy });

/**
 * LE CADRE DU PLAN, étiquettes comprises.
 *
 * ON COMPTE LES ÉTIQUETTES, et c'est la correction la plus bête à oublier : un
 * cadre calculé sur les seuls traits coupe « r = 12 cm » en deux à chaque fois
 * que le rayon s'écrit à droite de la figure. On ne connaît pas ici la police
 * du traceur, donc on estime — `0,52 × hauteur` par caractère, mesuré sur
 * Helvetica, la police des fiches.
 */
export function cadreDuPlan(p, hTexte = 9) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const voir = (x, y) => {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
    };
    [...p.traits, ...p.caches].forEach(ligne => ligne.forEach(([x, y]) => voir(x, y)));
    p.droits.forEach(d => { voir(d.x, d.y); voir(d.x + d.dx * (d.c || 7), d.y + d.dy * (d.c || 7)); });
    p.textes.forEach(t => {
        const w = t.t.length * hTexte * 0.52;
        const gauche = t.ancre === 'fin' ? t.x - w : (t.ancre === 'debut' ? t.x : t.x - w / 2);
        voir(gauche, t.y - hTexte * 0.8);
        voir(gauche + w, t.y + hTexte * 0.25);
    });
    if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: x0, y: y0, w: Math.max(x1 - x0, 1), h: Math.max(y1 - y0, 1) };
}

/* ── LES FIGURES PLANES ───────────────────────────────────────────────── */

// L'ÉCHELLE DU DESSIN N'EST PAS CELLE DES NOMBRES, et c'est voulu : un
// rectangle de 12 sur 2 dessiné à l'échelle fait un trait. On borne donc le
// rapport — la figure reste reconnaissable, et les cotes disent la vérité.
const echelle = (valeurs, place) => Math.min(place / Math.max(...valeurs, 1), 26);

/**
 * UNE FIGURE NE DOIT NI S'APLATIR NI DEVENIR UNE AIGUILLE.
 *
 * VU SUR LA FEUILLE : un prisme de base 3 et de hauteur 8 sortait deux fois et
 * demie plus haut que large ; réduit ensuite au plafond de la case, il faisait
 * treize millimètres de large — un sliver où les arêtes, la hauteur pointillée
 * et l'angle droit se croisaient tous dans la même tache d'encre.
 *
 * ON BORNE DONC LE RAPPORT, et le dessin ment déjà un peu de toute façon :
 * `echelle` plafonne à 26 depuis toujours, pour la même raison — « un rectangle
 * de 12 sur 2 dessiné à l'échelle fait un trait ». Les COTES, elles, disent la
 * vérité, et ce sont elles qu'on lit pour calculer.
 */
const hauteurDessinee = (ht, w) => Math.min(Math.max(ht, 20), w * 1.5);

/**
 * UNE COTE POSÉE LE LONG D'UN CÔTÉ OBLIQUE SE POSE PERPENDICULAIREMENT À LUI.
 *
 * MESURÉ — 440 tirages passés au crible, cinq étiquettes CROISAIENT un trait,
 * et toutes étaient celle du côté oblique. La raison est géométrique : un
 * écart horizontal fixe suffit sur un côté RAIDE, où le trait bouge peu sur
 * la hauteur d'une ligne de texte, et ne suffit pas sur un côté COUCHÉ, où il
 * balaie toute l'étiquette. Un écart le long de la NORMALE, lui, vaut la même
 * distance quelle que soit la pente.
 *
 * `fuir` est le troisième sommet : la normale choisie est celle qui s'en
 * éloigne, c'est-à-dire celle qui sort de la figure.
 */
function aCote(p1, p2, fuir, t, ecart = 1.0) {
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const n = Math.hypot(dx, dy) || 1;
    let nx = -dy / n, ny = dx / n;
    if ((fuir[0] - mx) * nx + (fuir[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
    // L'ANCRE SUIT LE CÔTÉ OÙ L'ON PART : une étiquette qui s'éloigne vers la
    // droite s'écrit vers la droite, sinon elle revient sur le trait qu'elle
    // vient de quitter.
    const ancre = nx > 0.25 ? 'debut' : (nx < -0.25 ? 'fin' : 'milieu');
    return texte(mx, my, t, ancre, nx * ecart, ny * ecart + 0.35);
}
const H = 9;   // la hauteur de texte de référence du plan

function planRectangle(L, l, u) {
    const e = echelle([L, l], 150);
    const w = L * e, h = Math.max(l * e, 16);
    const p = plan();
    p.traits.push(ferme([[0, 0], [w, 0], [w, h], [0, h]]));
    p.textes.push(texte(w / 2, h, `${L} ${u}`, 'milieu', 0, 1.15));
    p.textes.push(texte(0, h / 2, `${l} ${u}`, 'fin', -0.35, 0.35));
    return p;
}

function planTriangle(b, h, oblique, u) {
    const e = echelle([b, h], 140);
    const w = b * e, ht = hauteurDessinee(h * e, w);
    // LE SOMMET N'EST PAS AU MILIEU — même raison qu'à l'écran : « un triangle
    // isocèle laisse croire que la hauteur est un axe de symétrie, et l'élève
    // la cherche alors toujours au centre ».
    const sx = w * 0.34;
    const p = plan();
    p.traits.push(ferme([[0, ht], [w, ht], [sx, 0]]));
    p.caches.push([[sx, 0], [sx, ht]]);
    p.droits.push(droit(sx, ht, -1, -1));
    p.textes.push(texte(w / 2, ht, `${b} ${u}`, 'milieu', 0, 1.15));
    // LA HAUTEUR S'ÉCRIT AU-DESSUS DU SOMMET. À mi-hauteur elle tombe SUR le
    // côté gauche de la figure — vu sur la planche de l'écran, et le papier
    // n'a aucune raison de refaire la même faute.
    p.textes.push(texte(sx, 0, `h = ${h} ${u}`, 'fin', -0.3, -0.4));
    // LE CÔTÉ OBLIQUE PORTE SA MESURE : c'est lui que prend l'élève qui se
    // trompe, et sans elle la faute est impossible — donc invisible.
    p.textes.push(aCote([w, ht], [sx, 0], [0, ht], `${oblique} ${u}`, 1.2));
    return p;
}

function planParallelogramme(b, h, oblique, u) {
    const e = echelle([b, h], 140);
    const w = b * e, ht = hauteurDessinee(h * e, w), d = ht * 0.55;
    const p = plan();
    p.traits.push(ferme([[0, ht], [w, ht], [w + d, 0], [d, 0]]));
    p.caches.push([[d, 0], [d, ht]]);
    p.droits.push(droit(d, ht, 1, -1));
    p.textes.push(texte(w / 2, ht, `${b} ${u}`, 'milieu', 0, 1.15));
    p.textes.push(texte(d, 0, `h = ${h} ${u}`, 'fin', -0.3, -0.4));
    p.textes.push(aCote([w, ht], [w + d, 0], [0, ht], `${oblique} ${u}`, 1.2));
    return p;
}

/** Le plan de la figure plane tirée, cotée. */
export function planAire(t) {
    const d = t.dims, u = t.unite;
    switch (t.marche) {
        case 'triangle': return planTriangle(d.b, d.h, d.oblique, u);
        case 'parallelogramme': return planParallelogramme(d.b, d.h, d.oblique, u);
        default: return planRectangle(d.L, d.l, u);
    }
}

/* ── LES SOLIDES, EN PERSPECTIVE CAVALIÈRE ────────────────────────────── */
//
// LA FUITE EST À 45° ET À 0,5, la convention du collège. Les arêtes qu'on ne
// voit pas sont en POINTILLÉS — c'est ce qui distingue un dessin de solide
// d'un dessin de patron, et c'est la seule chose qui fasse comprendre qu'il y
// a de la profondeur derrière.

const FUITE = 0.5, COS45 = Math.SQRT1_2;

function planPave(L, l, h, u, cube = false) {
    const e = echelle([L, l * FUITE + h, h], 120);
    const w = L * e, ht = Math.max(h * e, 18), f = l * e * FUITE * COS45;
    // La face avant, en bas à gauche ; la fuite part en haut à droite.
    const A = [0, ht + f], B = [w, ht + f], C = [w, f], D = [0, f];
    const A2 = [f, ht], B2 = [w + f, ht], C2 = [w + f, 0], D2 = [f, 0];
    const p = plan();
    p.traits.push(ferme([A, B, C, D]));
    p.traits.push([B, B2], [C, C2], [D, D2]);
    p.traits.push([B2, C2], [C2, D2]);
    // LES TROIS ARÊTES CACHÉES PARTENT DU SOMMET ARRIÈRE-GAUCHE-BAS.
    p.caches.push([A, A2], [A2, B2], [A2, D2]);
    if (cube) {
        // UN CUBE N'A QU'UNE COTE, et c'est la leçon : trois nombres égaux
        // écrits trois fois feraient croire à trois mesures à prendre.
        p.textes.push(texte(w / 2, ht + f, `a = ${L} ${u}`, 'milieu', 0, 1.15));
    } else {
        p.textes.push(texte(w / 2, ht + f, `L = ${L} ${u}`, 'milieu', 0, 1.15));
        // LA HAUTEUR À GAUCHE, LA PROFONDEUR À DROITE, et ce n'est pas une
        // question de goût. VU SUR LA FEUILLE : sur un pavé PLAT — 6 × 7 × 2 —,
        // « h = 2 cm » et « l = 7 cm » tombaient au même endroit et s'écrivaient
        // l'un sur l'autre, illisibles tous les deux. L'arête verticale est
        // courte quand la hauteur est petite, et l'arête de fuite part
        // justement de là : les deux milieux se rejoignent. Les séparer de part
        // et d'autre du solide, c'est rendre la rencontre impossible quelles que
        // soient les dimensions tirées.
        p.textes.push(texte(0, (ht + f + f) / 2, `h = ${h} ${u}`, 'fin', -0.35, 0.35));
        p.textes.push(texte((w + w + f) / 2, ht + f / 2, `l = ${l} ${u}`, 'debut', 0.5, 0.75));
    }
    return p;
}

function planPrisme(b, hb, H2, u) {
    const e = echelle([b, hb, H2 * FUITE], 110);
    const w = b * e, ht = hauteurDessinee(hb * e, w), f = H2 * e * FUITE * COS45;
    // Un prisme droit à base TRIANGULAIRE, couché : la base est le triangle de
    // gauche, et la longueur part en fuite.
    const A = [0, ht + f], B = [w, ht + f], S = [w * 0.38, f];
    const dec = (P) => [P[0] + f, P[1] - f];
    const p = plan();
    p.traits.push(ferme([A, B, S]));
    // ── DEUX DES TROIS ARÊTES DU FOND SONT CACHÉES ──────────────────────
    //
    // VU SUR LA FEUILLE : le triangle arrière était dessiné ENTIÈREMENT en
    // trait plein, et sa base traversait le solide de part en part — on
    // lisait deux triangles posés l'un sur l'autre, plus une barre au
    // milieu, et plus du tout un prisme.
    //
    // La fuite part en haut à droite, donc le sommet arrière-bas-GAUCHE
    // (`dec(A)`) est celui qui passe DERRIÈRE la face avant : les deux
    // arêtes qui en partent sont cachées, et l'arête de profondeur qui y
    // mène aussi. C'est exactement la règle du pavé, un sommet plus bas.
    p.traits.push([dec(S), dec(B)]);
    p.traits.push([B, dec(B)], [S, dec(S)]);
    p.caches.push([A, dec(A)], [dec(A), dec(B)], [dec(A), dec(S)]);
    p.caches.push([S, [S[0], ht + f]]);
    p.droits.push(droit(S[0], ht + f, -1, -1));
    p.textes.push(texte(w / 2, ht + f, `b = ${b} ${u}`, 'milieu', 0, 1.15));
    // À GAUCHE DE TOUT LE DESSIN, À LA HAUTEUR DU SOMMET.
    //
    // Trois essais mesurés (`tools/tmp/compte.mjs`, 480 tirages à chaque fois) :
    // au-dessus du sommet, l'étiquette rencontrait l'arête de profondeur ou la
    // base arrière sur les prismes plats — deux à trois fois sur quatre-vingts.
    // Un prisme a des arêtes qui partent du sommet dans TROIS directions ; il
    // n'y a pas d'angle libre autour de lui.
    //
    // Le bord GAUCHE du dessin, lui, est libre par construction : aucun trait
    // n'a d'abscisse négative, et l'étiquette ancrée à sa fin s'écrit
    // entièrement à gauche de zéro. Le cadre s'élargit d'autant, et c'est son
    // travail.
    p.textes.push(texte(0, f, `h = ${hb} ${u}`, 'fin', -0.3, 0.35));
    p.textes.push(texte(w + f / 2, ht + f / 2, `${H2} ${u}`, 'debut', 0.5, 0.75));
    return p;
}

function planCylindre(r, h, u) {
    const e = echelle([r * 2, h], 110);
    const R = Math.max(r * e, 14), ht = Math.max(h * e, 24), ry = R * 0.3;
    const cx = R;
    const p = plan();
    // LE DISQUE DU HAUT EST ENTIER, celui du bas est coupé en deux : sa moitié
    // arrière passe DERRIÈRE le cylindre, donc en pointillés. C'est ce qui fait
    // tenir le volume debout sur la feuille.
    p.traits.push(ellipse(cx, ry, R, ry));
    p.traits.push(ellipse(cx, ht + ry, R, ry, 0, 180));
    p.caches.push(ellipse(cx, ht + ry, R, ry, 180, 360));
    p.traits.push([[0, ry], [0, ht + ry]], [[2 * R, ry], [2 * R, ht + ry]]);
    // LE RAYON SE TRACE DANS LE DISQUE DU HAUT : un nombre écrit à côté du
    // cylindre ne dit pas de quoi il est le rayon.
    p.traits.push([[cx, ry], [cx + R, ry]]);
    // LE RAYON S'ÉCRIT AU-DESSUS DU DISQUE, ET NON DEDANS.
    //
    // Deux essais mesurés sur la feuille : au-dessus du trait, « r = 7 cm »
    // tombait sur l'arc supérieur de l'ellipse ; en dessous, il débordait du
    // cylindre par la droite — le demi-rayon fait quelques millimètres, et
    // l'étiquette le double. Hors du solide, centrée sur l'axe, elle ne peut
    // rencontrer aucun trait : il n'y a rien au-dessus.
    p.textes.push(texte(cx, 0, `r = ${r} ${u}`, 'milieu', 0, -0.55));
    p.textes.push(texte(2 * R, ht / 2 + ry, `h = ${h} ${u}`, 'debut', 0.4, 0.35));
    return p;
}

function planPyramide(c, h, u) {
    const e = echelle([c, h], 110);
    const w = Math.max(c * e, 24), ht = hauteurDessinee(h * e, w), f = w * FUITE * COS45;
    const A = [0, ht + f], B = [w, ht + f], C = [w + f, ht], D = [f, ht];
    const S = [(w + f) / 2, 0];
    const p = plan();
    p.traits.push([A, B], [B, C], [C, D]);
    p.caches.push([D, A]);
    p.traits.push([A, S], [B, S], [C, S]);
    p.caches.push([D, S]);
    // LA HAUTEUR TOMBE AU CENTRE DE LA BASE, et elle est CACHÉE : elle traverse
    // le solide. Son angle droit dit qu'elle est perpendiculaire à la base —
    // sans lui, c'est une arête de plus.
    const O = [(w + f) / 2, ht + f / 2];
    p.caches.push([S, O]);
    p.droits.push(droit(O[0], O[1], 1, -1));
    p.textes.push(texte(w / 2, ht + f, `${c} ${u}`, 'milieu', 0, 1.15));
    // LA HAUTEUR S'ÉCRIT AU-DESSUS DU SOMMET, la règle que le triangle et le
    // prisme ont déjà payée : à mi-hauteur, l'étiquette traverse l'arête de
    // droite dès que la base est étroite — vu sur une pyramide de 3 cm de
    // côté et 12 cm de haut.
    p.textes.push(texte(S[0], 0, `h = ${h} ${u}`, 'debut', 0.35, -0.5));
    return p;
}

function planCone(r, h, u) {
    const e = echelle([r * 2, h], 110);
    const R = Math.max(r * e, 14), ht = Math.max(h * e, 26), ry = R * 0.3;
    const cx = R, cy = ht;
    const p = plan();
    p.traits.push(ellipse(cx, cy, R, ry, 0, 180));
    p.caches.push(ellipse(cx, cy, R, ry, 180, 360));
    p.traits.push([[0, cy], [cx, 0]], [[2 * R, cy], [cx, 0]]);
    p.caches.push([[cx, 0], [cx, cy]]);
    p.droits.push(droit(cx, cy, 1, -1));
    p.traits.push([[cx, cy], [cx + R, cy]]);
    // SOUS LE POINT LE PLUS BAS DE LA BASE, et au-dessus du sommet : les deux
    // seuls endroits où un cône ne met aucun trait. À mi-hauteur, « h = 6 cm »
    // traversait la génératrice de droite ; au milieu de la base, « r = 7 cm »
    // s'écrivait sur l'ellipse.
    p.textes.push(texte(cx, cy + ry, `r = ${r} ${u}`, 'milieu', 0, 1.15));
    p.textes.push(texte(cx, 0, `h = ${h} ${u}`, 'debut', 0.35, -0.5));
    return p;
}

function planBoule(r, u) {
    const R = Math.min(Math.max(r * 14, 18), 60);
    const p = plan();
    p.traits.push(ellipse(R, R, R, R));
    // L'ÉQUATEUR : sans lui, le dessin est un disque et le mot « boule » ne
    // tient qu'à l'énoncé. Sa moitié arrière est en pointillés — c'est ce qui
    // fait tourner la sphère.
    p.traits.push(ellipse(R, R, R, R * 0.3, 0, 180));
    p.caches.push(ellipse(R, R, R, R * 0.3, 180, 360));
    // LE RAYON PART VERS LE HAUT-DROIT : à l'horizontale il se confond avec
    // l'équateur, et l'étiquette se pose sur lui.
    p.traits.push([[R, R], [R + R * 0.72, R - R * 0.69]]);
    p.textes.push(texte(R + R * 0.72, R - R * 0.69, `r = ${r} ${u}`, 'debut', 0.3, 0));
    return p;
}

/** Le plan du solide tiré, coté. */
export function planVolume(t) {
    const d = t.dims, u = t.unite;
    switch (t.marche) {
        case 'cube': return planPave(d.a, d.a, d.a, u, true);
        case 'prisme': return planPrisme(d.b, d.hb, d.H, u);
        case 'cylindre': return planCylindre(d.r, d.h, u);
        case 'pyramide': return planPyramide(d.c, d.h, u);
        case 'cone': return planCone(d.r, d.h, u);
        case 'boule': return planBoule(d.r, u);
        default: return planPave(d.L, d.l, d.h, u);
    }
}
