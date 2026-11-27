// LE NOM DES SOLIDES — la règle et les dessins, sans écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 novembre : « il n'y a pas grand-chose sur les solides de manière
// générale », puis la liste, mot à mot : « cube, pavé droit, cylindre, prisme
// droit, pyramide, cône, sphère, boule ».
//
// CE QUI EXISTAIT. On COMPTAIT sur un solide (sommets, arêtes, faces), on
// pliait le patron du CUBE, on calculait des volumes — mais nulle part on ne
// demandait le NOM. Or nommer vient avant tout le reste : l'élève qui ne sait
// pas qu'une boîte de conserve est un cylindre ne cherchera pas la formule du
// cylindre. Et la paire « sphère / boule », qui est dans sa liste, n'était
// travaillée par rien.
//
// QUATRE MARCHES, du plus visible au plus abstrait :
//   1. le DESSIN — un solide en perspective cavalière, on le nomme ;
//   2. les OBJETS — une boîte de conserve, un dé, un cornet de glace ;
//   3. les PROPRIÉTÉS — « deux bases qui sont des disques » ;
//   4. SPHÈRE OU BOULE — la surface ou ce qu'elle contient, mise en regard du
//      cercle et du disque, que l'élève connaît déjà.
//
// LA LIGNE ROUGE N'EST PAS EN CAUSE : on regarde et on nomme, on ne trace rien.
//
// LES DESSINS NE SONT PAS REFAITS. Les polyèdres viennent du moteur de
// « Compter sur un solide » (`solides.js` : prismes et pyramides à trois, quatre,
// cinq, six côtés, arêtes cachées calculées) ; les solides ronds, de celui des
// volumes (`volumes.js`), sans leurs cotes. Même perspective, mêmes teintes :
// l'élève retrouve le cylindre qu'il calculera plus tard.

import { construire, projeter, facesVisibles, aretesCachees, normaleSortante } from './solides.js';
import { figureVolumeSvg } from './volumes.js';
import { pt, cadreSvg } from './cotes.js';

/** Les huit noms de la liste de Rémy, avec leur article. */
export const SOLIDES_NOMMES = [
    { id: 'cube', nom: 'un cube' },
    { id: 'pave', nom: 'un pavé droit' },
    { id: 'prisme', nom: 'un prisme droit' },
    { id: 'pyramide', nom: 'une pyramide' },
    { id: 'cylindre', nom: 'un cylindre' },
    { id: 'cone', nom: 'un cône' },
    { id: 'sphere', nom: 'une sphère' },
    { id: 'boule', nom: 'une boule' }
];
/** Les deux voisins plans de la sphère et de la boule — les leurres de la marche 4. */
export const PLANS = [{ id: 'cercle', nom: 'un cercle' }, { id: 'disque', nom: 'un disque' }];

export const nomDe = (id) => ([...SOLIDES_NOMMES, ...PLANS].find(s => s.id === id) || {}).nom || id;

/**
 * CE QUI DÉFINIT CHACUN — l'explication qu'on lit après avoir répondu.
 * Une phrase qui se retient, pas une définition de manuel.
 */
export const CE_QUI_LE_DIT = {
    cube: 'Un cube a six faces, et ce sont six carrés identiques. C\'est un pavé droit '
        + 'particulier, comme le carré est un rectangle particulier.',
    pave: 'Un pavé droit a six faces, et ce sont des rectangles. (Le cube est un pavé droit '
        + 'dont toutes les faces sont des carrés.)',
    prisme: 'Un prisme droit a deux bases identiques et parallèles — des triangles, des '
        + 'pentagones… — reliées par des faces rectangulaires.',
    pyramide: 'Une pyramide a une seule base, un polygone, et des faces triangulaires qui se '
        + 'rejoignent toutes en un même sommet.',
    cylindre: 'Un cylindre a deux bases qui sont des disques identiques et parallèles, '
        + 'reliées par une surface courbe.',
    cone: 'Un cône a une seule base, un disque, et une surface courbe qui monte jusqu\'à un '
        + 'sommet.',
    sphere: 'Une sphère, c\'est la SURFACE seule : tous les points situés exactement à la même '
        + 'distance du centre. Comme la peau d\'une bulle de savon.',
    boule: 'Une boule, c\'est la sphère ET tout ce qu\'elle contient : tous les points situés à '
        + 'cette distance du centre OU MOINS. Comme une bille, pleine.',
    cercle: 'Un cercle est une ligne, dans un plan : les points situés exactement à la même '
        + 'distance du centre.',
    disque: 'Un disque est une surface plane : le cercle et tout ce qu\'il entoure.'
};

/**
 * LES LEURRES QUI ONT UN SENS. Quatre noms tirés au hasard parmi huit
 * laisseraient souvent la bonne réponse seule de sa famille — « cube, cône,
 * boule, cylindre » pour un cube, et l'élève répond sans regarder. On propose
 * donc d'abord le VOISIN qu'on confond vraiment : le pavé pour le cube, la
 * pyramide pour le prisme, le cône pour le cylindre.
 */
//
// ET UN LEURRE NE DOIT JAMAIS ÊTRE VRAI. Un cube EST un pavé droit, et un pavé
// droit EST un prisme droit (à base rectangulaire) : proposer « pavé droit »
// pour un cube, ou « prisme droit » pour une brique de lait, compterait faux
// une réponse juste. Les leurres d'un cube et d'un pavé évitent donc leurs
// « parents » ; et les prismes que l'on montre n'ont jamais une base à quatre
// côtés (voir `POLYEDRES`), pour que « pavé droit » y soit bien faux.
export const VOISINS = {
    cube: ['pyramide', 'cylindre', 'cone'],
    pave: ['cube', 'pyramide', 'cylindre'],
    prisme: ['pyramide', 'pave', 'cylindre'],
    pyramide: ['prisme', 'cone', 'cube'],
    cylindre: ['cone', 'prisme', 'boule'],
    cone: ['pyramide', 'cylindre', 'boule'],
    // SUR UN DESSIN, LA BOULE NE SE MET PAS EN BALANCE AVEC LA SPHÈRE : leurs
    // dessins sont les mêmes, et l'élève qui répondrait « sphère » ne se serait
    // pas trompé de solide. Cette distinction-là a sa marche à elle (la 4).
    boule: ['cylindre', 'cone', 'pyramide'],
    sphere: ['boule', 'cercle', 'disque']
};

// ── LES DESSINS ────────────────────────────────────────────────────────────

/** Les polyèdres du moteur des solides, rangés par nom. */
const POLYEDRES = {
    cube: ['cube'],
    pave: ['pave'],
    prisme: ['prisme3', 'prisme5', 'prisme6'],
    pyramide: ['tetraedre', 'pyramide4', 'pyramide5', 'pyramide6']
};

/**
 * ÉTIRER UN POLYÈDRE, pour que les pavés ne soient pas tous le même. Un élève
 * qui n'a vu qu'un pavé presque cubique appelle « cube » le premier pavé
 * allongé qu'il rencontre, et l'inverse. Un étirement positif garde
 * l'orientation des faces : le calcul des arêtes cachées reste juste.
 */
export function etirer(solide, [sx, sy, sz]) {
    return { ...solide, sommets: solide.sommets.map(([x, y, z]) => [x * sx, y * sy, z * sz]) };
}

/**
 * LA TEINTE D'UNE FACE, d'après où elle regarde — la lumière vient d'en haut à
 * gauche, comme sur les dessins des volumes : le dessus le plus clair, le côté
 * le plus sombre.
 */
function teinteDe(n) {
    const [x, , z] = n;
    const l = Math.hypot(...n) || 1;
    if (z / l > 0.55) return 'vol-face--dessus';
    if (Math.abs(x) / l > 0.55) return 'vol-face--cote';
    return 'vol-face--avant';
}

/** Un polyèdre en perspective cavalière : faces vues teintées, arêtes cachées en pointillés. */
export function polyedreSvg(solide) {
    const bruts = solide.sommets.map(p => projeter(p));
    const xs = bruts.map(p => p[0]), ys = bruts.map(p => p[1]);
    const ampleur = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
    const e = 150 / ampleur;
    const P = bruts.map(([x, y]) => [x * e, y * e]);
    const vues = facesVisibles(solide);
    const cachees = aretesCachees(solide);
    const m = [];
    solide.faces.forEach((f, i) => {
        if (!vues[i]) return;
        const d = f.map((s, k) => `${k ? 'L' : 'M'} ${pt(...P[s])}`).join(' ') + ' Z';
        m.push(`<path class="vol-face ${teinteDe(normaleSortante(solide, f))}" d="${d}"/>`);
    });
    // LES POINTILLÉS AVANT LES TRAITS : là où une arête cachée croise une arête
    // vue, c'est le trait plein qui doit passer devant.
    solide.aretes.forEach(([a, b], i) => {
        if (cachees[i]) m.push(`<path class="vol-cache" d="M ${pt(...P[a])} L ${pt(...P[b])}"/>`);
    });
    solide.aretes.forEach(([a, b], i) => {
        if (!cachees[i]) m.push(`<path class="vol-arete" d="M ${pt(...P[a])} L ${pt(...P[b])}"/>`);
    });
    return cadreSvg(m.join('\n        '), P, { classe: 'vol-svg', aria: 'Un solide, à reconnaître' });
}

/**
 * TOUS LES DESSINS POSSIBLES, chacun avec sa clef. La clef sert à ne pas
 * reposer deux fois le même dessin dans une série : l'énoncé, lui, est
 * toujours « Quel est ce solide ? », et ne permet pas de les distinguer.
 */
const ETIREMENTS_DU_PAVE = [[1.5, 1, 0.6], [0.7, 0.8, 1.6], [1.25, 1.3, 0.85]];
export const DESSINS = [
    ...Object.entries(POLYEDRES).flatMap(([id, variantes]) => id === 'pave'
        ? ETIREMENTS_DU_PAVE.map((e, k) => ({ id, variante: 'pave', etirement: e, cle: `dessin-pave-${k}` }))
        : variantes.map(v => ({ id, variante: v, cle: `dessin-${v}` }))),
    { id: 'cylindre', variante: 'cylindre', cle: 'dessin-cylindre' },
    { id: 'cone', variante: 'cone', cle: 'dessin-cone' },
    { id: 'boule', variante: 'boule', cle: 'dessin-boule' }
];

/**
 * LE DESSIN D'UN SOLIDE NOMMÉ. Les proportions d'un pavé (long et plat, haut
 * et étroit, ou presque cubique — mais jamais cubique : un pavé qui aurait
 * l'air d'un cube serait un piège, pas une question), et celles d'un cylindre
 * ou d'un cône, varient d'un tirage à l'autre.
 */
export function dessinDe(d, rng) {
    if (POLYEDRES[d.id]) {
        let s = construire(d.variante);
        if (d.etirement) s = etirer(s, d.etirement);
        return polyedreSvg(s);
    }
    const dims = d.id === 'boule' ? { r: rng.int(3, 4) }
        : { r: rng.int(2, 4), h: rng.int(d.id === 'cone' ? 5 : 3, 8) };
    return figureVolumeSvg({ marche: d.id, dims, unite: 'cm' }, { nu: true });
}

// ── LES OBJETS DU QUOTIDIEN ────────────────────────────────────────────────
//
// CHOISIS POUR QU'IL N'Y AIT PAS DE DOUTE. « Une orange » est une boule pour un
// mathématicien et une boule cabossée pour un élève qui en a une dans son sac ;
// « un toit » est un prisme ou une pyramide selon la maison. On n'a gardé que
// les objets dont la forme ne se discute pas.

export const OBJETS = [
    { texte: 'une boîte de conserve', solide: 'cylindre' },
    { texte: 'une boîte de camembert', solide: 'cylindre' },
    { texte: 'un rouleau à pâtisserie', solide: 'cylindre' },
    { texte: 'un dé à jouer', solide: 'cube' },
    { texte: 'un morceau de sucre', solide: 'cube' },
    { texte: 'une brique', solide: 'pave' },
    { texte: 'une boîte à chaussures', solide: 'pave' },
    { texte: 'une brique de lait', solide: 'pave' },
    { texte: 'un cornet de glace', solide: 'cone' },
    { texte: 'un plot de chantier (sans son socle)', solide: 'cone' },
    { texte: 'un chapeau pointu d\'anniversaire', solide: 'cone' },
    { texte: 'une boule de pétanque', solide: 'boule' },
    { texte: 'une bille', solide: 'boule' },
    // PAS DE « pyramide d'Égypte » : l'objet donnait la réponse dans son nom.
    { texte: 'une tente canadienne', solide: 'prisme' },
    { texte: 'une boîte de chocolat en barre triangulaire', solide: 'prisme' },
    { texte: 'un crayon à six pans (sans sa pointe)', solide: 'prisme' }
];

// ── LES PROPRIÉTÉS ─────────────────────────────────────────────────────────

export const PROPRIETES = [
    { texte: 'J\'ai six faces, et ce sont six carrés identiques.', solide: 'cube' },
    { texte: 'J\'ai six faces rectangulaires, et elles ne sont pas toutes des carrés.', solide: 'pave' },
    { texte: 'J\'ai deux bases qui sont des disques identiques et parallèles.', solide: 'cylindre' },
    { texte: 'J\'ai une seule base, qui est un disque, et un sommet.', solide: 'cone' },
    // DES TRIANGLES, ET NON « des polygones » : avec des polygones quelconques,
    // le pavé et le cube répondraient aussi à la description.
    { texte: 'Mes deux bases sont des triangles identiques et parallèles, et mes trois autres '
        + 'faces sont des rectangles.', solide: 'prisme' },
    { texte: 'J\'ai une seule base, qui est un polygone, et toutes mes autres faces sont des triangles '
        + 'qui se rejoignent en un même sommet.', solide: 'pyramide' },
    { texte: 'Je n\'ai aucune face plane, aucun sommet, aucune arête, et je suis plein.', solide: 'boule' },
    // PAS DE « ni sommet ni arête » POUR LE CYLINDRE : ses deux cercles sont
    // des arêtes pour certains manuels et pas pour d'autres. Une question dont
    // la réponse dépend du livre de l'élève n'a pas sa place ici.
    { texte: 'J\'ai douze arêtes, et elles ont toutes la même longueur.', solide: 'cube' },
    { texte: 'Mes faces latérales sont des triangles.', solide: 'pyramide' }
];

// ── SPHÈRE OU BOULE ? ──────────────────────────────────────────────────────
//
// LE CERCLE ET LE DISQUE SONT LÀ EXPRÈS. L'élève les distingue depuis la
// sixième : le cercle est le TOUR, le disque est le tour ET l'intérieur. La
// sphère et la boule sont exactement la même paire, dans l'espace. Les mettre
// côte à côte, c'est lui donner une règle qu'il a déjà, au lieu d'une
// nouvelle à apprendre.

/** Les énoncés de la marche 4, avec le rayon tiré. */
export function enoncesSphereBoule(r) {
    return [
        { texte: `L'ensemble des points de l'espace situés à exactement ${r} cm d'un point O.`, solide: 'sphere' },
        { texte: `L'ensemble des points de l'espace situés à ${r} cm ou moins d'un point O.`, solide: 'boule' },
        { texte: `L'ensemble des points d'un plan situés à exactement ${r} cm d'un point O.`, solide: 'cercle' },
        { texte: `L'ensemble des points d'un plan situés à ${r} cm ou moins d'un point O.`, solide: 'disque' },
        { texte: 'La paroi d\'une bulle de savon, toute fine.', solide: 'sphere' },
        { texte: 'Une bille d\'acier, pleine.', solide: 'boule' },
        { texte: 'L\'enveloppe en caoutchouc d\'un ballon de baudruche, sans l\'air dedans.', solide: 'sphere' },
        { texte: `On peut calculer son VOLUME : (4 ÷ 3) × π × ${r} × ${r} × ${r}.`, solide: 'boule' },
        { texte: `On peut calculer son AIRE, mais pas de volume à elle seule : 4 × π × ${r} × ${r}.`, solide: 'sphere' }
    ].map((e, k) => ({ ...e, cle: `sphere-${k}` }));
}

/** Le solide que le nom de la marche fait travailler, pour un tirage. */
export const MARCHES_SOLIDES = [
    { id: 'dessin', nom: '1. Reconnaître sur un dessin' },
    { id: 'objet', nom: '2. Les objets du quotidien' },
    { id: 'proprietes', nom: '3. Par leurs propriétés' },
    { id: 'sphere', nom: '4. Sphère ou boule ?' }
];

/**
 * PARMI CE QUI N'A PAS ENCORE SERVI. `exclus` : les clefs des questions déjà
 * posées dans la série. Une fois tout servi, on recommence plutôt que de ne
 * rien rendre.
 */
function parmiLesNeufs(rng, liste, exclus) {
    const vu = new Set(exclus || []);
    const neufs = liste.filter(x => !vu.has(x.cle));
    return rng.pick(neufs.length ? neufs : liste);
}

/**
 * UNE QUESTION, quelle que soit la marche.
 *
 * LA CLEF (`cle`) DIT CE QUI NE DOIT PAS SE RÉPÉTER. Regardé sur la feuille
 * imprimée : « le plot de chantier » deux fois de suite, « exactement 9 cm »
 * deux fois. L'énoncé n'y suffit pas — tous les dessins disent « Quel est ce
 * solide ? », et un même énoncé de sphère change de rayon sans changer de
 * question.
 * @returns {{marche, solide, enonce, figure, choix:string[], cle:string}}
 */
export function tirerQuestionDeSolide(rng, marche = 'dessin', exclus = []) {
    if (marche === 'sphere') {
        const q = parmiLesNeufs(rng, enoncesSphereBoule(rng.int(2, 9)), exclus);
        return { marche, solide: q.solide, enonce: `${q.texte} De quoi s'agit-il ?`, figure: '',
            cle: q.cle, choix: ['sphere', 'boule', 'cercle', 'disque'] };
    }
    if (marche === 'objet') {
        const o = parmiLesNeufs(rng, OBJETS.map((x, k) => ({ ...x, cle: `objet-${k}` })), exclus);
        return { marche, solide: o.solide, cle: o.cle,
            enonce: `${o.texte.charAt(0).toUpperCase()}${o.texte.slice(1)} a la forme de quel solide ?`,
            figure: '', choix: [o.solide, ...VOISINS[o.solide]] };
    }
    if (marche === 'proprietes') {
        const p = parmiLesNeufs(rng, PROPRIETES.map((x, k) => ({ ...x, cle: `prop-${k}` })), exclus);
        return { marche, solide: p.solide, cle: p.cle, enonce: `${p.texte} Qui suis-je ?`, figure: '',
            choix: [p.solide, ...VOISINS[p.solide]] };
    }
    const d = parmiLesNeufs(rng, DESSINS, exclus);
    return { marche: 'dessin', solide: d.id, enonce: 'Quel est ce solide ?', figure: dessinDe(d, rng),
        variante: d.variante, cle: d.cle, choix: [d.id, ...VOISINS[d.id]] };
}

/** Les trois indices, du plus général au plus précis. */
export function indicesDe(q) {
    if (q.marche === 'sphere') {
        return [
            'Pense au cercle et au disque, que tu connais déjà : le cercle est le TOUR, le disque est le '
                + 'tour et tout l\'intérieur.',
            'Dans un plan, on parle de cercle et de disque ; dans l\'espace, de sphère et de boule. '
                + '« Exactement à » : c\'est le tour. « À … ou moins » : c\'est tout ce qui est dedans.',
            `C'est ${nomDe(q.solide)}.`
        ];
    }
    return [
        'Commence par les bases : y en a-t-il deux, identiques et parallèles, ou une seule ?',
        'Deux bases → un prisme droit (polygones) ou un cylindre (disques). Une seule base et un '
            + 'sommet → une pyramide (polygone) ou un cône (disque). Aucune face plane → une boule.',
        `C'est ${nomDe(q.solide)}.`
    ];
}
