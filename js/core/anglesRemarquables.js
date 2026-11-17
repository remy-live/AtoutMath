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

/**
 * LA SOMME DES ANGLES D'UN TRIANGLE — le théorème de cinquième qui manquait.
 *
 * RÉMY, le 16 novembre : « tu me fais […] la somme des angles d'un triangle ».
 * Mesuré avant d'écrire : aucune compétence, aucun exercice. « La Valeur
 * Manquante » traite les opposés, les correspondants, les alternes-internes,
 * les complémentaires et les supplémentaires — pas le triangle.
 *
 * ELLE N'EST PAS DANS `RELATIONS` AVEC LES AUTRES, et ce n'est pas un oubli :
 * `de(a)` y donne le second angle à partir d'UN premier, alors qu'ici il en
 * faut DEUX. Une relation à deux entrées rangée parmi des relations à une
 * entrée casserait tout ce qui lit `RELATIONS` en aveugle.
 */
export const TRIANGLE = {
    id: 'triangle', nom: 'les trois angles d\'un triangle',
    de: (a, b) => 180 - a - b,
    pourquoi: 'la somme des angles d\'un triangle vaut toujours 180°',
    calcul: (a, b) => `180° − ${a}° − ${b}° = ${180 - a - b}°`
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
 * UN TRIANGLE : trois sommets, deux angles donnés, un à trouver.
 *
 * ON PART DES ANGLES, PAS DES POINTS. La figure DOIT montrer les mesures
 * qu'elle annonce : un triangle dessiné au jugé puis étiqueté « 50° » et
 * « 60° » serait un mensonge que l'élève voit — il mesure au rapporteur,
 * c'est même ce qu'on lui demande de savoir faire.
 *
 * Base AB de longueur 1, A à l'origine, le côté AC partant à `a` degrés. Le
 * troisième sommet se place par la loi des sinus : AC = sin(b) / sin(c). On
 * recentre ensuite sur le centre de gravité et l'on ramène dans le disque
 * unité, pour que le triangle occupe le cadre quelle que soit sa forme.
 *
 * LES TROIS ARCS SONT ORIENTÉS VERS L'INTÉRIEUR. Un arc dessiné du mauvais
 * côté montre l'angle EXTÉRIEUR — qui vaut 180° moins le bon, et qui est
 * exactement la faute que le chapitre voisin travaille. On calcule donc le
 * sens à partir des deux côtés, on ne le suppose pas.
 */
export function figureTriangle({ a, b, penche = 0 }) {
    const c = 180 - a - b;
    const ac = Math.sin(b * RAD) / Math.sin(c * RAD);
    const S = [
        { x: 0, y: 0 },                                               // A
        { x: 1, y: 0 },                                               // B
        { x: ac * Math.cos(a * RAD), y: ac * Math.sin(a * RAD) }      // C
    ];
    const gx = (S[0].x + S[1].x + S[2].x) / 3;
    const gy = (S[0].y + S[1].y + S[2].y) / 3;
    const centre = S.map(p => ({ x: p.x - gx, y: p.y - gy }));
    const rmax = Math.max(...centre.map(p => Math.hypot(p.x, p.y)));
    const k = 0.92 / rmax;
    const cos = Math.cos(penche * RAD), sin = Math.sin(penche * RAD);
    const P = centre.map(p => ({
        x: k * (p.x * cos - p.y * sin), y: k * (p.x * sin + p.y * cos)
    }));

    const dir = (de, vers) => (Math.atan2(P[vers].y - P[de].y, P[vers].x - P[de].x)
        / RAD + 360) % 360;
    /** L'arc INTÉRIEUR au sommet `i`, entre les deux autres sommets. */
    const arc = (i, j, l, role) => {
        const dj = dir(i, j), dl = dir(i, l);
        // Le sens direct va dans l'ordre croissant : on part de celle des deux
        // directions qui mène à l'autre en moins d'un demi-tour.
        const de = (dl - dj + 360) % 360 < 180 ? dj : dl;
        const vers = de === dj ? dl : dj;
        // LA PLACE DONT DISPOSE CE SOMMET : la plus courte des deux arêtes qui
        // en partent. C'est elle qui borne la taille de l'étiquette — voir
        // `poseEtiquette`, et la planche de huit triangles qui a montré deux
        // nombres superposés sur un triangle étroit.
        const loin = (k) => Math.hypot(P[k].x - P[i].x, P[k].y - P[i].y);
        const ouverture = (vers - de + 360) % 360;
        // ── ET JUSQU'OÙ VA LA BISSECTRICE AVANT DE SORTIR DU TRIANGLE ──────
        //
        // LA PLUS COURTE ARÊTE NE SUFFIT PAS, et une épreuve neuve l'a dit sur
        // le vrai code : dans un angle très ouvert, la bissectrice traverse le
        // côté OPPOSÉ bien avant d'avoir parcouru la moitié d'une arête, et
        // l'étiquette sortait du triangle. C'est exactement ce que Rémy a
        // photographié — « déborde un peu ! ».
        //
        // On calcule donc la vraie portée : où le rayon issu du sommet, dans
        // la direction de la bissectrice, rencontre le segment qui joint les
        // deux autres sommets.
        const bis = (de + ouverture / 2) * RAD;
        const ux = Math.cos(bis), uy = Math.sin(bis);
        const ex = P[l].x - P[j].x, ey = P[l].y - P[j].y;
        const det = ux * (-ey) - uy * (-ex);
        const portee = Math.abs(det) < 1e-9 ? Infinity
            : ((P[j].x - P[i].x) * (-ey) - (P[j].y - P[i].y) * (-ex)) / det;
        return { x: P[i].x, y: P[i].y, de, a: de + ouverture, role,
                 place: Math.min(loin(j), loin(l)),
                 portee: portee > 0 ? portee : Infinity };
    };
    const seg = (i, j) => ({ x1: P[i].x, y1: P[i].y, x2: P[j].x, y2: P[j].y });
    return {
        traits: [seg(0, 1), seg(1, 2), seg(2, 0)],
        arcs: [arc(0, 1, 2, 'donne'), arc(1, 2, 0, 'donne'), arc(2, 0, 1, 'cherche')]
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
 *
 * ELLE N'EST PLUS LA SOURCE DE VÉRITÉ : `poseEtiquette` décide, et rend
 * `dedans`. Celle-ci reste pour les appelants qui n'ont que l'arc sous la
 * main, et elle dit la même chose dans le cas simple.
 */
export function etiquetteDedans(arc) {
    return mesureArc(arc) >= 90;
}

/**
 * LA LARGEUR D'UN NOMBRE D'ANGLE, dans les unités de la figure.
 *
 * On n'a pas de moteur de texte ici — ni en SVG avant le rendu, ni en jsPDF
 * sans charger la police. Mais la seule chose qu'on écrive est « 25° » ou
 * « 130° » dans une graisse 800 : trois ou quatre glyphes, tous de même
 * chasse. 0,58 em par chiffre et 0,46 em pour le degré, mesurés sur la police
 * du logiciel, suffisent amplement — on ne cherche pas le pixel, on cherche à
 * ne pas poser un nombre sur un trait.
 */
export function largeurEtiquette(texte, hauteur) {
    const s = String(texte);
    const degres = (s.match(/°/g) || []).length;
    return hauteur * (0.58 * (s.length - degres) + 0.46 * degres);
}

/**
 * OÙ POSER L'ÉTIQUETTE, ET DE QUELLE TAILLE — en une seule décision.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, capture à l'appui : « déborde un peu ! ». Un « 80° » qui sortait de
 * son secteur et traversait le côté du triangle. REGARDÉ EN PLANCHE ensuite
 * (`tools/tmp/angles.png`, huit triangles d'un coup), ce n'était pas « un
 * peu » : sur quatre des huit, DEUX étiquettes se chevauchaient, et sur l'une
 * d'elles les deux nombres étaient simplement superposés.
 *
 * ── POURQUOI L'ANCIENNE POSE NE POUVAIT PAS TENIR ────────────────────────
 *
 * Elle réservait à l'étiquette une demi-largeur égale à la MOITIÉ DE SA
 * HAUTEUR (`HAUTEUR_ETIQUETTE / 2`). Or « 130° » est trois fois plus large que
 * haut. Elle était écrite pour la figure des deux parallèles, où les sommets
 * sont loin l'un de l'autre et où l'erreur ne se voyait pas ; un triangle
 * rapproche trois sommets, et trois étiquettes.
 *
 * ── LA RÈGLE, ET POURQUOI ELLE SUFFIT ────────────────────────────────────
 *
 * L'étiquette tient dans un disque de rayon R (sa demi-diagonale). Posée à la
 * distance d du sommet sur la bissectrice, elle est à l'intérieur du secteur
 * si d·sin(m/2) ≥ R — la distance de la bissectrice à chaque côté.
 *
 * ET ELLE NE DOIT PAS ALLER SE COGNER À L'ÉTIQUETTE DU SOMMET D'À CÔTÉ. Il
 * suffit pour cela que chacune reste dans la MOITIÉ de la plus courte arête
 * qui part de son sommet : deux étiquettes posées sur une même arête ne
 * peuvent alors pas se rencontrer. C'est une borne généreuse et elle se
 * démontre en une ligne, ce qui vaut mieux qu'un détecteur de collision
 * qu'on croit juste.
 *
 * `arc.place` porte cette plus courte arête ; les figures de droites n'en ont
 * pas, et une droite est longue : on prend alors large.
 *
 * SI L'ÉTIQUETTE VOULUE NE TIENT PAS, ON LA RAPETISSE — jusqu'à un plancher,
 * au-dessous duquel un élève ne lit plus. Là, et seulement là, elle sort
 * derrière l'arc, comme dans un manuel.
 */
export const ETIQUETTE_MINI = 0.085;

export function poseEtiquette(arc, texte = '00°', hVoulue = HAUTEUR_ETIQUETTE,
    exterieur = false) {
    const m = mesureArc(arc);
    const rs = rayonSecteur(arc);
    const place = Number.isFinite(arc.place) ? arc.place : 3;
    // Un secteur rentrant (plus de 180°) a la place qu'il veut : c'est son
    // complémentaire qui est étroit. On borne à 90° pour ne pas diviser par
    // un sinus qui redescend.
    const demi = Math.min(Math.max(m, 4), 180) / 2 * RAD;
    const disque = (h) => Math.hypot(largeurEtiquette(texte, h) / 2, h * 0.58);

    let h = Math.max(ETIQUETTE_MINI, Math.min(HAUTEUR_ETIQUETTE, hVoulue));
    let R = disque(h);
    // CE QUE LE SOMMET PEUT PORTER : d + R ≤ place/2, avec d = R / sin(m/2).
    const Rmax = (place / 2) / (1 + 1 / Math.sin(demi));
    if (R > Rmax) { h = Math.max(ETIQUETTE_MINI, h * Rmax / R); R = disque(h); }

    const dIdeal = R / Math.sin(demi);
    // ON NE COLLE PAS L'ÉTIQUETTE AU SOMMET : dans un secteur large, elle y
    // serait posée sur la pointe de l'angle au lieu d'occuper le secteur.
    // LA BISSECTRICE SORT DU TRIANGLE QUELQUE PART, et l'étiquette doit rester
    // en deçà : c'est la borne qui manquait, et sans elle un angle très ouvert
    // posait son nombre de l'autre côté du côté opposé.
    const portee = Number.isFinite(arc.portee) ? arc.portee : Infinity;
    const limite = Math.min(place / 2, portee - R);
    const dedans = dIdeal + R <= place / 2 && dIdeal <= limite;
    const d = dedans
        ? Math.max(Math.min(rs * 0.52, limite), Math.min(dIdeal, limite))
        // DEHORS : derrière l'arc, sur la bissectrice, comme dans un manuel.
        : rs + R;
    // DE L'AUTRE CÔTÉ DU SOMMET, en dernier recours. Deux étiquettes déjà
    // sorties de leur secteur peuvent encore se rencontrer dans l'intérieur de
    // la figure — 29 fois sur 4 500 triangles, mesuré. Posées sur la
    // bissectrice EXTÉRIEURE, elles sont dans trois régions disjointes du plan
    // et ne peuvent plus se voir. On y perd un peu de lisibilité — le nombre
    // n'est plus contre son arc —, on y gagne de ne jamais superposer deux
    // nombres, ce qui ne se lit pas du tout.
    const direction = arc.de + m / 2 + (exterieur ? 180 : 0);
    const p = pt(exterieur ? rs * 0.42 + R : d, direction);
    return { x: arc.x + p.x, y: arc.y + p.y, h, dedans: dedans && !exterieur };
}

/** La boîte qu'occupe une étiquette posée, dans les unités de la figure. */
export function boiteEtiquette(pose, texte) {
    const w = largeurEtiquette(texte, pose.h);
    return { x1: pose.x - w / 2, x2: pose.x + w / 2,
             y1: pose.y - pose.h * 0.58, y2: pose.y + pose.h * 0.58 };
}

const seTouchent = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/**
 * POSER TOUTES LES ÉTIQUETTES D'UNE FIGURE, ET LES EMPÊCHER DE SE RENCONTRER.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * UNE POSE SOMMET PAR SOMMET NE PEUT PAS Y ARRIVER, et c'est ce que la planche
 * de huit triangles a montré : chaque étiquette tenait bien dans SON secteur,
 * et deux d'entre elles se superposaient quand même. Les trois secteurs d'un
 * triangle se recouvrent dans son intérieur — « je tiens chez moi » ne veut
 * donc pas dire « je ne suis chez personne d'autre ».
 *
 * J'AI D'ABORD ESSAYÉ DE BORNER, et le balayage l'a réfuté : en limitant
 * chaque étiquette à la moitié de la plus courte arête de son sommet, il
 * restait 179 chevauchements sur 4 500 triangles ; en la rapetissant jusqu'à
 * un plancher plus bas, encore 105. Une borne assez serrée pour tout empêcher
 * envoyait un tiers des étiquettes hors de leur secteur, ce qui est pire.
 *
 * ON RÉSOUT DONC LA COLLISION ELLE-MÊME, et rapetisser est le bon geste :
 * l'étiquette se pose à la distance R/sin(m/2) de son sommet, donc une
 * étiquette plus petite se RAPPROCHE de son sommet en même temps qu'elle
 * maigrit. Deux voisines qui rétrécissent s'écartent l'une de l'autre.
 *
 * ON RAPETISSE LES DEUX, jamais une seule : n'en réduire qu'une ferait
 * dépendre le dessin de l'ORDRE des arcs, c'est-à-dire du hasard du
 * générateur — et deux élèves auraient la même figure dessinée autrement.
 */
export function poseEtiquettes(arcs, texteDe) {
    const textes = arcs.map(texteDe);
    const hauteurs = arcs.map(() => HAUTEUR_ETIQUETTE);
    const dehors = arcs.map(() => false);
    const poses = arcs.map((a, i) => poseEtiquette(a, textes[i], hauteurs[i]));
    for (let essai = 0; essai < 12; essai++) {
        const boites = poses.map((p, i) => boiteEtiquette(p, textes[i]));
        let touche = null;
        for (let i = 0; i < boites.length && !touche; i++) {
            for (let j = i + 1; j < boites.length; j++) {
                if (seTouchent(boites[i], boites[j])) { touche = [i, j]; break; }
            }
        }
        if (!touche) break;
        let bouge = false;
        for (const k of touche) {
            if (hauteurs[k] > ETIQUETTE_MINI + 1e-9) {
                hauteurs[k] = Math.max(ETIQUETTE_MINI, hauteurs[k] * 0.86);
                poses[k] = poseEtiquette(arcs[k], textes[k], hauteurs[k], dehors[k]);
                bouge = true;
            } else if (!poses[k].dedans && !dehors[k]) {
                // AU PLANCHER, ET DÉJÀ HORS DE SON SECTEUR : rapetisser encore
                // ne la déplacerait presque pas, puisqu'elle est posée juste
                // derrière l'arc. On la passe de l'autre côté du sommet.
                dehors[k] = true;
                poses[k] = poseEtiquette(arcs[k], textes[k], hauteurs[k], true);
                bouge = true;
            }
        }
        // PLUS RIEN À TENTER : on s'arrête plutôt que de tourner douze fois
        // pour rien. L'épreuve dira si cela arrive encore.
        if (!bouge) break;
    }
    return poses;
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
