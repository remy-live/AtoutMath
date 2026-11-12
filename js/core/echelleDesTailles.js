// L'ÉCHELLE DES TAILLES : ce qu'on range, et où ça se range.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aime le fait de ranger sur une échelle de taille. On donne l'objet
// (en svg) sa valeur sous la forme de 10^... et on range. »
//
// TROIS CHOSES DANS CETTE PHRASE, et la troisième change tout : la valeur est
// DONNÉE. Le travail n'est donc pas de deviner la taille d'un virus — ce serait
// de la culture générale —, mais de LIRE un exposant et de le placer. C'est le
// chapitre, et rien d'autre.
//
// ── POURQUOI CE FICHIER EST PUR ─────────────────────────────────────────────
//
// Il ne connaît ni le DOM ni le jeu : il dit QUELS objets existent, à quel
// exposant, et quelles cases porte chaque monde. On peut donc éprouver sans
// navigateur les deux choses qui pourraient être fausses : qu'un tirage ne
// mette jamais deux objets dans la même case, et qu'aucun objet ne tombe hors
// de l'échelle affichée.
//
// ── LES VALEURS SONT DES ORDRES DE GRANDEUR, ET C'EST ASSUMÉ ────────────────
//
// Un cheveu ne fait pas 10⁻⁴ m exactement : il fait entre cinq et dix
// centièmes de millimètre. L'exposant est ce qu'on travaille ; la précision
// serait un autre chapitre. Chaque objet porte donc aussi sa taille en clair,
// qui s'affiche une fois la carte posée : c'est là que l'ordre de grandeur
// redevient une taille.
//
// ── PLUS DE CASES QUE D'OBJETS, TOUJOURS ────────────────────────────────────
//
// Neuf cases, cinq ou six objets. Si la frise était pleine, les deux dernières
// cartes se placeraient PAR ÉLIMINATION, sans lire quoi que ce soit — et c'est
// exactement l'exercice qu'on ne veut pas.

import { puissanceTexte, valeurPuissance, grouper } from './puissances.js';

// LE TEXTE D'UNE PUISSANCE VIENT DE `core/puissances.js`, comme partout
// ailleurs dans le chapitre : une seconde écriture de « 10⁻⁴ » finirait par
// diverger de la première, et c'est le genre d'écart qu'on ne voit jamais.
export { puissanceTexte };

/**
 * LES DESSINS, EN FRAGMENTS SVG.
 *
 * Chacun vit dans une boîte de 24 × 24 et prend la couleur du texte
 * (`currentColor`) : une carte reste lisible en thème clair comme en sombre,
 * sans qu'on ait à repeindre quoi que ce soit.
 *
 * DES ÉLÉMENTS, ET NON UN SEUL CHEMIN. J'avais d'abord écrit chaque dessin
 * comme un `path` unique — c'est plus court, et c'est faux dès qu'il y a une
 * ellipse inclinée : l'arc elliptique d'un `path` tourne le repère SANS
 * déplacer son point d'arrivée, et la forme obtenue n'est plus une ellipse.
 * `<ellipse transform="rotate(…)">` dit exactement ce qu'on veut.
 *
 * ILS SONT SIMPLES À DESSEIN : on les regardera à quarante-huit pixels sur une
 * tablette, et un dessin détaillé n'y survivrait pas.
 */
const D = {
    atome: '<circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>'
        + '<ellipse cx="12" cy="12" rx="10" ry="4"/>'
        + '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/>'
        + '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    adn: '<path d="M8 2c0 5 8 5 8 10s-8 5-8 10"/><path d="M16 2c0 5-8 5-8 10s8 5 8 10"/>'
        + '<path d="M9.2 6h5.6M8.4 10h7.2M8.4 14h7.2M9.2 18h5.6"/>',
    puce: '<rect x="8" y="8" width="8" height="8" rx="1"/>'
        + '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M9 4v4M15 4v4M9 16v4M15 16v4M4 9h4M4 15h4M16 9h4M16 15h4"/>',
    virus: '<circle cx="12" cy="12" r="5.5"/>'
        + '<path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.2 5.2l2.8 2.8M16 16l2.8 2.8M18.8 5.2L16 8M8 16l-2.8 2.8"/>'
        + '<circle cx="12" cy="2.5" r="1"/><circle cx="12" cy="21.5" r="1"/>'
        + '<circle cx="2.5" cy="12" r="1"/><circle cx="21.5" cy="12" r="1"/>',
    // LES DEUX POINTS DU MILIEU FAISAIENT DES YEUX : regardée sur la planche,
    // la bactérie était une tête. Le matériel interne est maintenant un trait
    // ondulé — ce qu'est un nucléoïde —, et les flagelles sont du même côté,
    // comme chez une vraie bactérie flagellée.
    bacterie: '<rect x="4.5" y="8.4" width="13" height="7.2" rx="3.6"/>'
        + '<path d="M7.4 12.6c1.1-1.4 2.2 1.4 3.3 0s2.2 1.4 3.3 0"/>'
        + '<path d="M17.5 10.4c2.2-.7 3.3-2.1 3.5-3.8"/>'
        + '<path d="M17.5 13.6c2.3.6 3.5 2.2 3.7 4"/>'
        + '<path d="M17.5 12h4.2"/>',
    globule: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.2"/>',
    // UNE MÈCHE, ET NON DEUX TRAITS. Trois courbes de longueurs différentes
    // qui partent du même côté : c'est ce qui fait lire « cheveu » plutôt que
    // « courbe ».
    cheveu: '<path d="M4 22c0-9.4 2.2-14 6-16.6S17.6 2.4 20.2 1.4"/>'
        + '<path d="M7.6 22c0-7.8 2-11.4 5.3-13.7"/>'
        + '<path d="M11.2 22c0-5.6 1.4-8.6 3.7-10.4"/>',
    sable: '<path d="M6 17l3.2-5.2L12.4 17z"/><path d="M12.8 18.5l2.4-3.8 2.4 3.8z"/>'
        + '<path d="M3 19.5l1.8-2.8 1.8 2.8z"/>',
    // LA FOURMI A ÉTÉ REDESSINÉE APRÈS L'AVOIR REGARDÉE : trois cercles et
    // quatre traits en diagonale donnaient un nœud papillon, pas un insecte.
    // Trois segments ALLONGÉS, trois pattes de chaque côté partant du thorax,
    // deux antennes à l'avant — et cette fois on la reconnaît à 34 pixels.
    // PATTES RACCOURCIES, SEGMENTS RESSERRÉS : la première version avait des
    // pattes aussi longues que le corps, et l'insecte disparaissait sous ses
    // traits. Six pattes sur le thorax, deux antennes sur la tête.
    // DE PROFIL, ET TROIS PATTES SEULEMENT. Vue de dessus, les six pattes
    // partaient en étoile autour du thorax et faisaient un paquet de traits :
    // deux versions regardées sur la planche, deux fois illisible. De profil
    // on ne voit que les trois pattes du côté visible, et les antennes ne se
    // confondent plus avec elles — c'est ainsi qu'on dessine un insecte.
    fourmi: '<ellipse cx="5" cy="10.6" rx="2.4" ry="2"/>'
        + '<ellipse cx="10.4" cy="11.6" rx="2.2" ry="1.9"/>'
        + '<ellipse cx="17.4" cy="11" rx="3.8" ry="3.2"/>'
        + '<path d="M9 13.2L7.4 18.4M10.6 13.4v5M12.2 13.2L14 18.4"/>'
        + '<path d="M3.8 8.9L2.2 5.4M5.6 8.6L5.4 4.8"/>',
    main: '<path d="M8 21v-9M8 12V5.2a1.5 1.5 0 0 1 3 0V11"/>'
        + '<path d="M11 11V4.2a1.5 1.5 0 0 1 3 0V11"/>'
        + '<path d="M14 11V5.6a1.5 1.5 0 0 1 3 0V13c0 4.8-2.8 8-6 8H9.4c-1.8 0-2.8-1.6-3.6-3.4L4 13.6"/>',
    // DES BRAS QUI PARTENT DES ÉPAULES, ET DES PIEDS. Le bonhomme-bâton
    // d'avant avait les bras plantés au milieu du tronc et finissait sur deux
    // traits en l'air : à 34 pixels, il ressemblait à une étoile.
    homme: '<circle cx="12" cy="4.2" r="2.6"/>'
        + '<path d="M12 6.8v7.4"/>'
        + '<path d="M12 8.6L7.8 11.4M12 8.6l4.2 2.8"/>'
        + '<path d="M12 14.2l-2.7 7.1M12 14.2l2.7 7.1"/>'
        + '<path d="M9.3 21.3H7.6M14.7 21.3h1.7"/>',
    // DE VRAIES FENÊTRES, en trois carreaux : deux tirets ne disaient rien.
    bus: '<rect x="2.5" y="5.6" width="19" height="9.4" rx="1.6"/>'
        + '<path d="M2.5 11.4h19"/>'
        + '<path d="M5.4 7.4h3.4v3.2H5.4zM10.3 7.4h3.4v3.2h-3.4zM15.2 7.4h3.4v3.2h-3.4z"/>'
        + '<circle cx="7" cy="17.2" r="2"/><circle cx="17" cy="17.2" r="2"/>',
    terrain: '<rect x="2" y="5" width="20" height="14" rx="1"/>'
        + '<path d="M12 5v14"/><circle cx="12" cy="12" r="2.8"/>'
        + '<path d="M2 9h3v6H2M22 9h-3v6h3"/>',
    montagne: '<path d="M1.5 20l7.5-13 4 6.5 2.2-3.2L22.5 20z"/>'
        + '<path d="M9 7l2.2 3.6M15.2 10.3l1.3-1.9"/>',
    ville: '<path d="M2 21V11.5h4.5V21M6.5 21V7H11v14M11 21v-7.5h4.5V21M15.5 21V9H21v12"/>'
        + '<path d="M3.5 14h1.5M3.5 17h1.5M8 10h1.5M8 14h1.5M12.5 16.5h1.5M17 12h1.5M17 16h1.5"/>'
        + '<path d="M1 21h22"/>',
    // L'HEXAGONE, ET NON UNE CARTE PLIÉE. Le premier dessin montrait une
    // carte routière — juste pour « une carte », trompeur sous le mot
    // « La France ». Un élève de quatrième appelle son pays l'Hexagone.
    // L'HEXAGONE, PARIS, ET LA CORSE. L'île est volontairement DEHORS : c'est
    // exact, et c'est ce qui fait reconnaître la carte plutôt qu'un hexagone.
    pays: '<path d="M12 2.4l8 4.7v9.4L12 21.2l-8-4.7V7.1z"/>'
        + '<circle cx="12.6" cy="9" r="1.1" fill="currentColor" stroke="none"/>'
        + '<ellipse cx="20.8" cy="18.6" rx="1.3" ry="2" transform="rotate(-18 20.8 18.6)"/>',
    terre: '<circle cx="12" cy="12" r="9"/>'
        + '<path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18"/><path d="M12 3a13 13 0 0 0 0 18"/>'
        + '<path d="M4.8 7h14.4M4.8 17h14.4"/>',
    // UNE DISTANCE SE DESSINE AVEC UNE DOUBLE FLÈCHE, pas avec deux boules
    // côte à côte. Regardé sur la planche : les deux cercles accolés se
    // lisaient comme une orbite, et « la distance Terre-Lune » devenait « la
    // Lune ». Les deux cartes de distance partagent donc le même motif —
    // deux astres, et l'écart marqué entre eux.
    // LA TERRE EST UN GLOBE, pas une planète barrée : méridien et équateur,
    // comme sur la carte « La Terre ». Et la Lune a son cratère.
    lune: '<circle cx="5.4" cy="12" r="4.2"/>'
        + '<path d="M1.2 12h8.4"/>'
        + '<path d="M5.4 7.8a6.4 6.4 0 0 1 0 8.4M5.4 7.8a6.4 6.4 0 0 0 0 8.4"/>'
        + '<circle cx="20.6" cy="12" r="1.8"/>'
        + '<circle cx="20.2" cy="11.4" r=".55" fill="currentColor" stroke="none"/>'
        + '<path d="M11.8 12h5.8M13 10.4L11.4 12l1.6 1.6M16.4 10.4L18 12l-1.6 1.6"/>',
    soleil: '<circle cx="12" cy="12" r="5"/>'
        + '<path d="M12 1.2v3M12 19.8v3M1.2 12h3M19.8 12h3M4.4 4.4l2.1 2.1M17.5 17.5l2.1 2.1M19.6 4.4l-2.1 2.1M6.5 17.5l-2.1 2.1"/>',
    // MÊME MOTIF QUE LA DISTANCE TERRE-LUNE, avec le Soleil à gauche : deux
    // cartes qui disent la même sorte de chose doivent se ressembler.
    orbite: '<circle cx="4.6" cy="12" r="3" fill="currentColor" stroke="none"/>'
        + '<path d="M4.6 6.4V5M4.6 19v-1.4M.6 12h1.3M1.8 8.4l-.9-.9M1.8 15.6l-.9.9"/>'
        + '<circle cx="21" cy="12" r="1.7"/>'
        + '<path d="M9.4 12h8.4M10.8 10.4L9.2 12l1.6 1.6M16.4 10.4L18 12l-1.6 1.6"/>',
    systeme: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>'
        + '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9"/>'
        + '<circle cx="17.5" cy="12" r="1.1"/><circle cx="12" cy="3" r="1.1"/>'
};

/**
 * LES OBJETS, DU PLUS PETIT AU PLUS GRAND.
 *
 * `exposant` est celui de la taille EN MÈTRES. `taille` dit la même chose en
 * français, et c'est elle qu'on lit une fois la carte posée.
 */
export const OBJETS = [
    { id: 'atome', nom: 'Un atome', exposant: -10,
        taille: 'un dixième de milliardième de mètre', svg: D.atome },
    { id: 'adn', nom: 'Une molécule d’ADN', exposant: -9,
        taille: 'un milliardième de mètre, en largeur', svg: D.adn },
    { id: 'puce', nom: 'Un transistor', exposant: -8,
        taille: 'dix milliardièmes de mètre', svg: D.puce },
    { id: 'virus', nom: 'Un virus', exposant: -7,
        taille: 'un dixième de millionième de mètre', svg: D.virus },
    { id: 'bacterie', nom: 'Une bactérie', exposant: -6,
        taille: 'un millionième de mètre', svg: D.bacterie },
    { id: 'globule', nom: 'Un globule rouge', exposant: -5,
        taille: 'un centième de millimètre', svg: D.globule },
    { id: 'cheveu', nom: 'Un cheveu', exposant: -4,
        taille: 'un dixième de millimètre, en épaisseur', svg: D.cheveu },
    { id: 'sable', nom: 'Un grain de sable', exposant: -3,
        taille: 'un millimètre', svg: D.sable },
    { id: 'fourmi', nom: 'Une fourmi', exposant: -2,
        taille: 'un centimètre', svg: D.fourmi },
    { id: 'main', nom: 'Une main', exposant: -1,
        taille: 'un décimètre', svg: D.main },
    { id: 'homme', nom: 'Un élève', exposant: 0,
        taille: 'un peu plus d’un mètre et demi', svg: D.homme },
    { id: 'bus', nom: 'Un autocar', exposant: 1,
        taille: 'une dizaine de mètres', svg: D.bus },
    { id: 'terrain', nom: 'Un terrain de football', exposant: 2,
        taille: 'une centaine de mètres', svg: D.terrain },
    { id: 'montagne', nom: 'Le mont Blanc', exposant: 3,
        taille: 'près de cinq kilomètres de haut', svg: D.montagne },
    { id: 'ville', nom: 'Une ville', exposant: 4,
        taille: 'une dizaine de kilomètres', svg: D.ville },
    { id: 'pays', nom: 'La France', exposant: 6,
        taille: 'un millier de kilomètres', svg: D.pays },
    { id: 'terre', nom: 'La Terre', exposant: 7,
        taille: 'près de treize mille kilomètres de diamètre', svg: D.terre },
    { id: 'lune', nom: 'La distance Terre–Lune', exposant: 8,
        taille: 'environ quatre cent mille kilomètres', svg: D.lune },
    { id: 'soleil', nom: 'Le Soleil', exposant: 9,
        taille: 'un million et demi de kilomètres de diamètre', svg: D.soleil },
    { id: 'orbite', nom: 'La distance Terre–Soleil', exposant: 11,
        taille: 'cent cinquante millions de kilomètres', svg: D.orbite },
    { id: 'systeme', nom: 'Le système solaire', exposant: 13,
        taille: 'des milliers de milliards de mètres', svg: D.systeme }
];

/**
 * LES TROIS MONDES, NEUF CASES CHACUN.
 *
 * NEUF, parce que c'est ce qui tient en hauteur sur une tablette tenue droite,
 * et parce que l'échelle doit rester lisible D'UN COUP : une frise qu'il faut
 * faire défiler ne montre plus le rapport entre ses deux bouts, qui est
 * pourtant tout ce qu'on vient voir.
 */
export const MONDES = {
    petit: { id: 'petit', nom: 'L’infiniment petit', bas: -12, haut: -4 },
    nous: { id: 'nous', nom: 'Autour de nous', bas: -4, haut: 4 },
    univers: { id: 'univers', nom: 'L’Univers', bas: 5, haut: 13 }
};

export const NOMS_MONDES = Object.keys(MONDES);

export const mondeDe = (id) => MONDES[id] || MONDES.nous;

/** Les exposants de la frise, le plus GRAND en premier : on lit de haut en bas. */
export function casesDuMonde(id) {
    const m = mondeDe(id);
    const out = [];
    for (let e = m.haut; e >= m.bas; e--) out.push(e);
    return out;
}

/** Les objets qui tombent dans les cases de ce monde. */
export function objetsDuMonde(id) {
    const m = mondeDe(id);
    return OBJETS.filter(o => o.exposant >= m.bas && o.exposant <= m.haut);
}

/**
 * CE QU'ON DONNE À RANGER.
 *
 * JAMAIS DEUX OBJETS DANS LA MÊME CASE : deux cartes pour une case, et la
 * seconde n'aurait plus de place — l'élève aurait raison et le jeu tort. Comme
 * deux objets ne partagent jamais un exposant dans la liste, tirer sans remise
 * suffit ; l'épreuve le garde quand même, parce que la liste, elle, changera.
 */
export function tirerDesObjets({ monde = 'nous', combien = 5 } = {}, rng) {
    const possibles = objetsDuMonde(monde);
    const n = Math.max(3, Math.min(possibles.length, Math.round(combien) || 5));
    return rng.shuffle(possibles.slice()).slice(0, n);
}

/**
 * CE QUI EST ÉCRIT SUR LA CARTE — et c'est là que l'exercice se joue.
 *
 * RÉMY, en l'essayant : « c'est hyper facile l'échelle des tailles, il suffit
 * de placer 10^4 à 10^4, où est la recherche ? »
 *
 * IL AVAIT RAISON, ET LE DÉFAUT ÉTAIT ENTIER : la carte disait « 10⁴ m », la
 * case disait « 10⁴ m ». C'était apparier deux étiquettes identiques — aucune
 * mathématique là-dedans. La recherche vient de l'ÉCART entre ce qui est écrit
 * sur la carte et ce qui est écrit sur l'échelle.
 *
 * TROIS ÉCRITURES, et il a tranché deux choses : « par contre reste sur des
 * puissances de 10 » — donc jamais de 1,27 × 10⁷, que des puissances PURES —,
 * et il a retenu l'écriture décimale et le nom seul.
 *
 *   · `decimale` : « 0,000 1 m » → compter les rangs. Le geste du chapitre.
 *   · `nom`      : « Un virus » → chercher, et apprendre de son erreur.
 *   · `puissance`: « 10⁻⁴ m » → ce qu'il a jugé trop facile. Gardé pour la
 *                  toute première fois, jamais par défaut.
 *
 * RESTER SUR DES PUISSANCES PURES ÉCARTE AUSSI UN PIÈGE qu'il aurait fallu
 * éviter à la main : avec une mantisse, le mont Blanc (4 810 m) est d'ordre
 * 10³, mais 4 810 est plus proche de 10 000 que de 1 000, et l'élève qui
 * répond 10⁴ a un raisonnement défendable. Pas de mantisse, pas d'ambiguïté.
 */
export const ECRITURES = ['decimale', 'nom', 'puissance'];

/** « 0,000 1 » ou « 10 000 » — la MÊME puissance, écrite en décimal.
 *
 *  `valeurPuissance` pose les zéros un par un (10 ** -7 donne
 *  1.0000000000000001e-7), et `grouper` les range par trois avec des espaces
 *  INSÉCABLES : « cet exercice demande justement de COMPTER les rangs ». Les
 *  deux existaient déjà dans `core/puissances.js` ; on ne les réécrit pas. */
export const ecritureDecimale = (n) => grouper(valeurPuissance(n));

/**
 * CE QUE PORTE LA CARTE, SELON CE QU'ON A RÉGLÉ — et toujours avec « ≈ ».
 *
 * LE SIGNE N'EST PAS UNE PRÉCAUTION DE STYLE, il rétablit une vérité. Puisque
 * les valeurs restent des puissances PURES, la carte d'un élève porte « 1 m »
 * alors qu'un élève mesure un mètre soixante. Écrire « 1 m » tout court serait
 * faux ; écrire « ≈ 1 m » est juste, et dit en un caractère ce qu'est un ordre
 * de grandeur — ce que l'exercice travaille précisément.
 *
 * VU SUR LA MESURE : la carte annonçait « Un élève · 1 m ».
 */
export function texteDeLaCarte(objet, ecriture) {
    if (ecriture === 'nom') return '';
    const v = ecriture === 'puissance'
        ? puissanceTexte(objet.exposant)
        : ecritureDecimale(objet.exposant);
    return `\u2248 ${v} m`;
}
