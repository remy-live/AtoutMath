// LES PETITES AILES — le relief, les îles et la physique.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 22 novembre, en m'envoyant un jeu complet écrit ailleurs : « je préfère
// ce tiny wings […] Tu refais tout le jeu à partir de ce que j'ai donné. Avant
// la fin d'un monde je veux juste une plus longue descente et un tremplin qui
// permet de faire un super long saut. Ne mets pas le son. »
//
// ── CE QUI A CHANGÉ, ET POURQUOI C'EST UN AUTRE FICHIER ──────────────────────
//
// L'ancien relief était une SOMME D'ONDES : trois sinusoïdes dont on connaissait
// la dérivée et la dérivée seconde à la main. C'était élégant et c'était une
// impasse — toutes les collines se ressemblaient, et chaque nouvelle forme
// demandait une formule de plus.
//
// Celui-ci est un relief ÉCHANTILLONNÉ : on pose des points de contrôle (« ici
// un sommet à 180, là un creux à 520 »), on les relie par des cosinus, et l'on
// garde le tout dans un tableau, un point tous les quatre pixels. On peut alors
// écrire un paysage comme on écrirait une partition — cinq profils de collines,
// une plage, un sommet, une méga-descente, un tremplin —, ce qu'aucune somme
// d'ondes ne permet.
//
// CE QU'ON PERD : les dérivées exactes. On les prend par différences finies sur
// une fenêtre de ±8 pixels, et c'est bien assez pour la seule chose qui s'en
// sert — savoir si le sol se dérobe sous l'oiseau.
//
// ── LE SENS DE L'AXE Y A CHANGÉ AUSSI, ET C'EST LE PIÈGE DU FICHIER ──────────
//
// **Y DESCEND.** y = 40 est un sommet, y = 560 est le niveau de la mer, y = 1080
// est le fond marin. C'est la convention du canevas, donc celle du dessin, et
// la garder ici supprime la conversion qui se trompait de signe une fois sur
// trois dans l'ancienne version. Une pente POSITIVE descend ; `quitteLeSol`
// compare donc une courbure POSITIVE à la pesanteur.
//
// ── ET RIEN N'EST TIRÉ AU HASARD VRAI ────────────────────────────────────────
//
// Le fichier d'origine appelle `Math.random()` quarante fois. Un paysage qu'on
// ne peut pas refaire à l'identique ne se mesure pas : aucune épreuve ne peut
// dire « ce saut-là se franchit », aucune sonde ne peut comparer un avant et un
// après, et la démonstration du meneur ne montre pas deux fois la même chose.
// Tout passe donc par `makeRng`, et une partie est entièrement décrite par sa
// graine.

import { makeRng } from './ids.js';

/* ─────────────────────────────────────────────────────────────────────────
 * 1. LES MESURES DU MONDE
 * ───────────────────────────────────────────────────────────────────────── */

/** Le niveau de la mer. Au-dessus, c'est une île ; au-dessous, on ricoche. */
export const NIVEAU_MER = 560;

/** Le fond du détroit, sous la mer. Il n'est là que pour être dessiné. */
export const FOND_MARIN = NIVEAU_MER + 520;

/** Un point de relief tous les quatre pixels. */
export const PAS_RELIEF = 4;

/** Là où le relief commence, un peu derrière le départ de l'oiseau. */
export const ORIGINE_X = -1400;

/* ─────────────────────────────────────────────────────────────────────────
 * 2. LES TREIZE ÎLES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LES STRATES SONT LA SIGNATURE DE TINY WINGS, et j'avais mal lu les captures
 * de Rémy : j'y voyais des bandes diagonales qui TRAVERSENT la colline. Elles
 * la SUIVENT. Chaque strate est une copie de la silhouette décalée vers le bas,
 * dans un ton plus chaud et plus sombre que celle d'au-dessus. C'est ce qui
 * donne à une courbe plate l'air d'une terre qu'on a coupée en deux.
 *
 * SIX TONS, DU PLUS CLAIR EN SURFACE AU PLUS SOMBRE EN PROFONDEUR, et un gazon
 * par-dessus, qui n'est pas une strate : c'est le trait épais de la crête, et
 * c'est lui qui dessine la ligne que l'oiseau suit.
 *
 * ── LE PREMIER TON DOIT SE DÉTACHER DU CIEL ──────────────────────────────
 *
 * C'est lui qui touche l'horizon, et la garde « chaque île se détache de son
 * ciel » le mesure. Trois mondes de l'ancienne version étaient invisibles sur
 * leur propre ciel avant qu'on pense à le mesurer — on ne recommence pas.
 */
export const ILES = [
    {
        nom: 'Les dunes',
        ciel: ['#8fd3ff', '#e3f4ff'],
        gazon: '#a16207', gazonOmbre: '#713f12',
        strates: ['#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#92400e'],
        fleurs: ['#ffffff', '#fb7185', '#38bdf8'],
        feuille: '#65a30d', tronc: '#78350f',
        montLoin: '#cfe6f7', montPres: '#a9cfe8'
    },
    {
        // L'ÎLE DE RÉFÉRENCE : c'est elle qu'on voit sur la capture de Rémy, et
        // ses six jaunes sont ceux du jeu qu'il préfère.
        nom: 'Les collines',
        ciel: ['#6ec6f5', '#cfeeff'],
        gazon: '#84cc16', gazonOmbre: '#3f6212',
        strates: ['#fef08a', '#fde047', '#facc15', '#eab308', '#d97706', '#b45309'],
        fleurs: ['#ffffff', '#fb7185', '#38bdf8'],
        feuille: '#65a30d', tronc: '#78350f',
        montLoin: '#bfdbfe', montPres: '#93c5fd'
    },
    {
        nom: 'Les crêtes',
        ciel: ['#ffb067', '#ffe3c6'],
        gazon: '#ea580c', gazonOmbre: '#7c2d12',
        strates: ['#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#7c2d12'],
        fleurs: ['#fef08a', '#ffffff', '#f43f5e'],
        feuille: '#b45309', tronc: '#7c2d12',
        montLoin: '#f6ceab', montPres: '#e8ae84'
    },
    {
        nom: 'La montagne',
        ciel: ['#9d8bff', '#ddd6ff'],
        gazon: '#6366f1', gazonOmbre: '#312e81',
        strates: ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4338ca', '#1e1b4b'],
        fleurs: ['#ffffff', '#fde047', '#f9a8d4'],
        feuille: '#6366f1', tronc: '#312e81',
        montLoin: '#ccc5f5', montPres: '#a89ce6'
    },
    {
        nom: 'Le grand large',
        ciel: ['#3cb5ad', '#bfeeea'],
        gazon: '#0d9488', gazonOmbre: '#115e59',
        strates: ['#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#134e4a'],
        fleurs: ['#ffffff', '#fde047', '#fb7185'],
        feuille: '#14b8a6', tronc: '#115e59',
        montLoin: '#9fd9d6', montPres: '#74c0bd'
    },
    {
        nom: 'Le pays de nuit',
        ciel: ['#1b2344', '#4a5590'],
        gazon: '#a5b4fc', gazonOmbre: '#312e81',
        strates: ['#dbe1ff', '#b9c2fb', '#949ff0', '#6b74d4', '#454ea3', '#1e2250'],
        fleurs: ['#fef08a', '#ffffff', '#a5f3fc'],
        feuille: '#8b93e8', tronc: '#1e1b4b',
        montLoin: '#39406e', montPres: '#2a3157'
    },
    {
        // LE GAZON EST MENTHE SUR UNE TERRE ROSE, et c'est voulu : le monde
        // sucré est celui où l'on s'autorise la couleur qu'aucune terre n'a.
        nom: 'Le pays kawaï',
        ciel: ['#ff9ecd', '#ffe3f1'],
        gazon: '#0f766e', gazonOmbre: '#134e4a',
        strates: ['#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#831843'],
        fleurs: ['#ffffff', '#fde047', '#a5f3fc'],
        feuille: '#2dd4bf', tronc: '#9d174d',
        montLoin: '#fbcfe8', montPres: '#f3aed2'
    },
    {
        nom: 'Le royaume fantaisiste',
        ciel: ['#2e1551', '#7b43a0'],
        gazon: '#d97706', gazonOmbre: '#78350f',
        strates: ['#f0d4fd', '#dcb0f7', '#c084fc', '#a855f7', '#7e22ce', '#3b0764'],
        fleurs: ['#fde047', '#ffffff', '#5eead4'],
        feuille: '#c084fc', tronc: '#4c1d95',
        montLoin: '#5d3480', montPres: '#452660'
    },
    {
        nom: 'La banquise',
        ciel: ['#07182a', '#2b9c7e'],
        gazon: '#075985', gazonOmbre: '#0c4a6e',
        strates: ['#f0f9ff', '#dbeefd', '#bfe2fb', '#93cdf5', '#5aa9e0', '#1d6ca8'],
        fleurs: ['#ffffff', '#bae6fd', '#a5f3fc'],
        feuille: '#60b7e8', tronc: '#0c4a6e',
        montLoin: '#cfe9f5', montPres: '#a9d2e6'
    },
    {
        nom: 'Les terres de braise',
        ciel: ['#2e0b0c', '#d4522a'],
        gazon: '#fb923c', gazonOmbre: '#7c2d12',
        strates: ['#fecdd3', '#fca5a5', '#f87171', '#dc2626', '#991b1b', '#450a0a'],
        fleurs: ['#fde047', '#ffffff', '#fb923c'],
        feuille: '#ea580c', tronc: '#450a0a',
        montLoin: '#6b2118', montPres: '#501811'
    },
    {
        nom: 'La canopée',
        ciel: ['#5fb37a', '#cdeed6'],
        gazon: '#15803d', gazonOmbre: '#14532d',
        strates: ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#15803d', '#14532d'],
        fleurs: ['#ffffff', '#fde047', '#fb7185'],
        feuille: '#16a34a', tronc: '#4a3620',
        montLoin: '#9fd6a8', montPres: '#74bd84'
    },
    {
        // LE SEL EST BLANC, DONC LE CIEL NE PEUT PAS L'ÊTRE : c'est le couchant
        // qui sauve le tableau. La leçon date de l'ancienne version et elle
        // tient toujours — deux aplats de la même couleur ne font pas un
        // paysage, ils font un écran vide.
        nom: 'Le désert de sel',
        ciel: ['#20405f', '#c97a52'],
        gazon: '#b45309', gazonOmbre: '#78350f',
        strates: ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#9a3412', '#5c2410'],
        fleurs: ['#ffffff', '#fb7185', '#fde047'],
        feuille: '#d97706', tronc: '#78350f',
        montLoin: '#9c7a68', montPres: '#7d6054'
    },
    {
        nom: 'Au-dessus des nuages',
        ciel: ['#0e2d55', '#d4902f'],
        gazon: '#b45309', gazonOmbre: '#7c2d12',
        strates: ['#ffffff', '#e8eef5', '#cbd8e6', '#a3b6cc', '#6b839f', '#3b4f6b'],
        fleurs: ['#fde047', '#ffffff', '#fbcfe8'],
        feuille: '#cbd5e1', tronc: '#64748b',
        montLoin: '#2c4e78', montPres: '#1d3c61'
    }
];

/* ─────────────────────────────────────────────────────────────────────────
 * 3. LA FIN D'UNE ÎLE — c'est la demande de Rémy, et elle a ses nombres
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « avant la fin d'un monde je veux juste une plus longue descente et un
 * tremplin qui permet de faire un super long saut ».
 *
 * Trois morceaux, dans cet ordre, et chacun fait un travail :
 *
 *   1. LE SOMMET. Il faut monter très haut pour pouvoir tomber de très haut.
 *      À y = 40, on est au plafond du monde jouable.
 *   2. LA MÉGA-DESCENTE. C'est elle qu'on allonge : 1 900 pixels au lieu des
 *      1 160 du fichier reçu. Sur une descente, la vitesse se gagne en
 *      plongeant — c'est tout le geste du jeu —, et plus elle est longue, plus
 *      le geste paie.
 *   3. LE TREMPLIN. Deux cent quatre-vingts pixels qui remontent sec, puis la
 *      catapulte : on quitte la lèvre dans un angle choisi pour la PORTÉE et
 *      non pour la hauteur — « un super long saut ».
 *
 * ── POURQUOI 30° ET PAS 45° ──────────────────────────────────────────────
 *
 * Sans air, 45° porte le plus loin. Ici il y a une portance au-dessus de la mer
 * (`GLISSE_MARINE`) qui allonge la descente mais pas la montée : l'angle qui
 * porte le plus loin baisse. Mesuré au balayage, et noté dans le journal — on
 * ne choisit pas un angle au jugé quand on peut l'essayer trente fois.
 */
export const MONTEE_SOMMET = 640;
export const HAUTEUR_SOMMET = 40;
export const MEGA_DESCENTE = 1900;
export const BAS_DE_DESCENTE = 545;
// ── QUATRE CENT SOIXANTE, ET C'EST LA PHOTO QUI L'A DIT ─────────────────
//
// À 280 pixels pour 245 de haut, le tremplin sortait à l'écran comme une DENT :
// un triangle mince posé au bord de la mer, qu'on ne reconnaît pas comme une
// rampe. La physique était juste — le saut partait — et le dessin mentait.
// Élargi, il se lit pour ce qu'il est, et la catapulte n'y perd rien : elle
// est posée à la lèvre, pas dans la pente.
export const LONGUEUR_TREMPLIN = 460;
export const HAUT_DU_TREMPLIN = 300;
// ── LE PLANCHER DE LA CATAPULTE, ET IL A ÉTÉ MESURÉ DEUX FOIS ───────────
//
// À 1 420, celui qui ne touche à rien franchissait les douze détroits SANS SE
// MOUILLER — il recevait donc le plein de jour à chaque île et tenait 129
// secondes. « Je ne peux pas perdre même si je ne fais rien » : la phrase de
// Rémy, de nouveau, par une autre porte.
//
// À 1 150, son saut porte 1 400 pixels pour un détroit large de 1 810 : il part
// quand même — c'est la règle, on ne prive personne du plus beau moment du jeu
// — mais il finit dans l'eau, ricoche, et ne regagne que la moitié du jour.
// Celui qui a plongé, lui, part à 1 630 et retombe à sec sur l'île d'en face.
export const VITESSE_CATAPULTE = 1150;
export const ANGLE_CATAPULTE = -0.524;

/* ─────────────────────────────────────────────────────────────────────────
 * 4. LA PHYSIQUE
 * ───────────────────────────────────────────────────────────────────────── */

/** La pesanteur ordinaire, et celle qu'on prend en appuyant. */
export const GRAVITE = 860;
export const GRAVITE_PLONGEE = 2700;

/** Les bornes de la vitesse. L'oiseau n'est jamais à l'arrêt. */
export const VITESSE_MIN = 220;
export const VITESSE_MAX = 1380;

/** Au-dessus de la mer, l'oiseau plane : c'est ce qui fait le long vol. */
export const GLISSE_MARINE = 0.62;

/** Le frottement de l'air, sur terre et au-dessus de l'eau. */
export const FROTTEMENT_AIR = 0.030;
export const FROTTEMENT_AIR_MER = 0.012;

/** Le frottement de la glisse : à plat, en plongée, sur le tremplin. */
export const FROTTEMENT_SOL = 0.054;
export const FROTTEMENT_PLONGEE = 0.024;
export const FROTTEMENT_TREMPLIN = 0.008;

/** Le rayon de l'oiseau — il décide de l'instant où il touche. */
export const RAYON_OISEAU = 20;

/** Ce que rend un ricochet sur la mer. On rebondit, on ne coule pas. */
export const RICOCHET_MONTEE = 390;
export const RICOCHET_AVANCE = 500;

/** Le petit coup d'ailes du décollage d'une crête ordinaire. */
export const IMPULSION_CRETE = 70;
export const VITESSE_IMPULSION = 530;

/* ─────────────────────────────────────────────────────────────────────────
 * 5. LA NUIT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ELLE NE COURT PLUS DERRIÈRE L'OISEAU, ELLE TOMBE. L'ancienne version lançait
 * un mur de nuit à une vitesse réglée monde par monde ; il fallait accorder
 * treize vitesses à treize allures, et chaque retouche de la physique les
 * faisait toutes mentir — on l'a payé trois fois en une semaine.
 *
 * Ici le jour PASSE : `nuit` va de 0 à 1, et à 1 l'oiseau se pose et s'endort.
 * Franchir un détroit rend du jour, et beaucoup plus si l'on n'a pas touché
 * l'eau. La règle de Rémy — « je ne peux pas perdre même si je ne fais rien » —
 * est alors tenue par construction : sans rien faire on franchit moins, donc on
 * regagne moins, donc la nuit tombe plus tôt.
 *
 * ── ET ELLE PRESSE DE PLUS EN PLUS ───────────────────────────────────────
 *
 * Chaque île franchie accélère le jour de trois et demi pour cent : la
 * quinzième coûte deux fois plus que la première. C'est la difficulté qui monte
 * sans que rien ne devienne injouable — on n'a plus treize réglages, on en a un.
 */
export const JOUR_DEPART = 0.06;
// VINGT-CINQ MILLIÈMES PAR SECONDE, SOIT QUARANTE SECONDES DE JOUR SI L'ON
// NE REGAGNE RIEN. À quinze, celui qui ne fait rien tenait 140 secondes et le
// bon joueur ne mourait jamais : ses traversées lui rendaient plus de jour que
// le temps ne lui en prenait. Mesuré, pas supposé.
export const VITESSE_NUIT = 0.025;
export const PRESSE_PAR_ILE = 0.035;
export const JOUR_RENDU_PARFAIT = 0.46;
export const JOUR_RENDU_MOUILLE = 0.28;

/** La nuit avance d'un pas de temps, d'autant plus vite qu'on est loin. */
export const avancerNuit = (nuit, dt, ileIndex) =>
    Math.min(1, nuit + VITESSE_NUIT * dt * (1 + ileIndex * PRESSE_PAR_ILE));

/** La nuit est-elle tombée ? */
export const nuitTombee = (nuit) => nuit >= 1;

/* ─────────────────────────────────────────────────────────────────────────
 * 6. LES PETITS OUTILS
 * ───────────────────────────────────────────────────────────────────────── */

export const borner = (v, min, max) => Math.max(min, Math.min(max, v));
export const entre = (a, b, t) => a + (b - a) * t;

/** Le canal `i` d'une couleur `#rrggbb`. */
const canal = (hex, i) => (parseInt(hex.slice(1), 16) >> (16 - 8 * i)) & 255;

/** Deux couleurs mélangées, `t` de la seconde. */
export function melerCouleur(a, b, t) {
    const v = [0, 1, 2].map((i) => Math.round(canal(a, i) + (canal(b, i) - canal(a, i)) * t));
    return `#${v.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** La luminance perçue — la même formule que la garde du contraste. */
export function luminance(hex) {
    const droit = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92
        : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * droit(canal(hex, 0)) + 0.7152 * droit(canal(hex, 1))
        + 0.0722 * droit(canal(hex, 2));
}

/** Le rapport de contraste de deux couleurs. */
export const contrasteCouleurs = (a, b) => {
    const x = luminance(a) + 0.05, y = luminance(b) + 0.05;
    return Math.max(x, y) / Math.min(x, y);
};

/* ─────────────────────────────────────────────────────────────────────────
 * 7. LE RELIEF
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * CINQ PROFILS DE COLLINES, et c'est tout ce qui fait la variété d'une île.
 *
 * Chacun rend une liste de points de contrôle RELATIFS : « avance de tant,
 * monte à tant ». On les enchaîne au hasard de la graine jusqu'à remplir le
 * corps de l'île, et deux îles ne se ressemblent donc jamais tout à fait.
 *
 * ON NE DESCEND JAMAIS SOUS 545 DANS LE CORPS DE L'ÎLE : à 560 c'est la mer, et
 * un creux qui y touche mettrait un ricochet au milieu d'une colline.
 */
const PROFILS = [
    // 1. Collines amples et régulières — le profil de base.
    (r, dur) => {
        const p = [];
        for (let k = 0; k < 2; k++) {
            p.push({ dx: entre(490, 570, r.next()),
                y: borner(245 - entre(0, 32, r.next()) * dur, 145, 320) });
            p.push({ dx: entre(510, 590, r.next()),
                y: borner(490 + entre(0, 32, r.next()) * dur, 430, 540) });
        }
        return p;
    },
    // 2. Cascades en escalier larges — deux paliers, puis un creux profond.
    () => [
        { dx: 480, y: 180 }, { dx: 360, y: 208 }, { dx: 450, y: 345 },
        { dx: 340, y: 369 }, { dx: 490, y: 525 }
    ],
    // 3. Doubles vallées fluides et aérées.
    () => [
        { dx: 460, y: 235 }, { dx: 380, y: 475 }, { dx: 350, y: 325 },
        { dx: 390, y: 515 }, { dx: 610, y: 195 }, { dx: 550, y: 495 }
    ],
    // 4. Grands sommets alpins — c'est là qu'on décolle le plus haut.
    (r, dur, idx) => {
        const p = [];
        for (let k = 0; k < 2; k++) {
            p.push({ dx: entre(530, 620, r.next()), y: borner(145 - idx * 4, 115, 195) });
            p.push({ dx: entre(550, 640, r.next()), y: 532 });
        }
        return p;
    },
    // 5. Très grandes houles océaniques — longues, lentes, et elles portent.
    () => [
        { dx: 680, y: 190 }, { dx: 720, y: 520 },
        { dx: 660, y: 210 }, { dx: 700, y: 510 }
    ]
];

/**
 * LE RELIEF — un tableau de hauteurs, et les îles qui vont avec.
 *
 * Il se fabrique À LA DEMANDE : on ne génère une île que lorsque l'oiseau
 * s'approche de sa fin. Une partie de trois minutes en traverse cinq ou six ;
 * en générer cent d'avance coûterait une seconde de calcul au lancement, pour
 * un paysage que personne ne verra.
 */
export class Relief {
    constructor(graine = 'pa') {
        this.rng = makeRng(graine);
        this.graine = graine;
        /** Les hauteurs, un point tous les `PAS_RELIEF` pixels depuis `ORIGINE_X`. */
        this.points = [];
        this.iles = [];
        this.decors = [];
        this.bonus = [];
        this.curseur = ORIGINE_X;
        this.prochaineIle = 0;
        this.enCours = false;
        this.genererUneIle();
        this.genererUneIle();
    }

    /** De quoi marcher jusqu'à `x` sans tomber dans le vide du tableau. */
    assurerJusqua(x) {
        if (this.enCours) return;
        let garde = 0;
        while (this.curseur < x && garde++ < 40) this.genererUneIle();
    }

    /** L'île qui contient cette abscisse. */
    ileDe(x) {
        for (let i = this.iles.length - 1; i >= 0; i--) {
            if (x >= this.iles[i].debutX) return this.iles[i];
        }
        return this.iles[0];
    }

    /**
     * UNE ÎLE ENTIÈRE, D'UN FOND MARIN AU SUIVANT.
     *
     * L'ordre des morceaux ne change jamais, et c'est ce qui fait qu'on
     * reconnaît la fin d'une île sans qu'on la nomme : plage, collines, sommet,
     * méga-descente, tremplin, plage, mer.
     */
    genererUneIle() {
        if (this.enCours) return;
        this.enCours = true;
        try {
            const idx = this.prochaineIle++;
            const theme = ILES[idx % ILES.length];
            const debutX = this.curseur;
            const r = this.rng;
            const ctrl = [];
            let cx = debutX;

            if (idx === 0) {
                // LA PREMIÈRE ÎLE NE COMMENCE PAS DANS L'EAU. L'élève doit
                // comprendre le geste avant de voir une mer — et un oiseau qui
                // naît au-dessus d'un détroit se noie avant d'avoir lu la
                // consigne. C'était déjà la règle de l'ancienne version.
                ctrl.push({ dx: 0, y: 235 });
                ctrl.push({ dx: 500, y: 215 });
                ctrl.push({ dx: 560, y: 505 });
            } else {
                ctrl.push({ dx: 0, y: FOND_MARIN });
                ctrl.push({ dx: 480, y: FOND_MARIN });
                ctrl.push({ dx: 320, y: NIVEAU_MER, marque: 'rivage' });
                ctrl.push({ dx: 340, y: 215 });
                ctrl.push({ dx: 560, y: 515 });
            }

            // Le corps de l'île : de quoi glisser une bonne vingtaine de
            // secondes avant d'en voir le bout.
            const corpsVise = 5600 + Math.min(1500, idx * 240);
            const dur = Math.min(1.28, 1 + idx * 0.045);
            let parcouru = 0, tour = 0;
            const ordre = idx === 0 ? [0, 2, 1, 4, 3]
                : [r.int(0, 4), r.int(0, 4), r.int(0, 4), r.int(0, 4)];
            while (parcouru < corpsVise) {
                for (const p of PROFILS[ordre[tour % ordre.length]](r, dur, idx)) {
                    ctrl.push(p);
                    parcouru += p.dx;
                    if (parcouru >= corpsVise) break;
                }
                tour++;
            }

            // ── LA FIN DE L'ÎLE, CELLE QUE RÉMY A DEMANDÉE ────────────────
            ctrl.push({ dx: MONTEE_SOMMET, y: HAUTEUR_SOMMET, marque: 'sommet' });
            ctrl.push({ dx: MEGA_DESCENTE, y: BAS_DE_DESCENTE, marque: 'basDescente' });
            ctrl.push({ dx: LONGUEUR_TREMPLIN * 0.5, y: 460, tremplin: true });
            ctrl.push({ dx: LONGUEUR_TREMPLIN * 0.5, y: HAUT_DU_TREMPLIN,
                tremplin: true, marque: 'levre' });
            ctrl.push({ dx: 170, y: NIVEAU_MER, marque: 'rivageSortie' });
            ctrl.push({ dx: 320, y: FOND_MARIN });
            // ── LA LARGEUR DU DÉTROIT, ET ELLE EST MESURÉE ────────────
            //
            // C'est elle qui sépare les deux joueurs, et rien d'autre. MESURÉ
            // (`node tools/sautDesAiles.mjs`) : celui qui a plongé porte à
            // 2 780 pixels, celui qui s'est laissé rouler à 1 910. Le détroit
            // se pose entre les deux — 2 050 au premier, un peu plus à chaque
            // île — et le même geste décide alors de retomber à sec ou de
            // ricocher.
            //
            // À 1 810, les deux passaient à sec et la largeur ne mesurait plus
            // rien : « ne rien faire » tenait 140 secondes.
            ctrl.push({ dx: 840 + Math.min(260, idx * 32), y: FOND_MARIN });

            // On déplie les `dx` en abscisses absolues et l'on note les repères.
            const repere = {};
            for (const p of ctrl) {
                cx += p.dx;
                p.x = cx;
                if (p.marque) repere[p.marque] = cx;
            }

            const ile = {
                index: idx, debutX, finX: cx, theme,
                rivageEntreeX: idx > 0 ? repere.rivage : debutX,
                sommetX: repere.sommet,
                basDescenteX: repere.basDescente,
                levreX: repere.levre,
                rivageSortieX: repere.rivageSortie
            };
            this.iles.push(ile);
            this.rasteriser(ctrl, idx);
            this.semer(ile, idx === 0 ? debutX + 350 : ile.rivageEntreeX + 180);
        } finally {
            this.enCours = false;
        }
    }

    /**
     * DES POINTS DE CONTRÔLE AU TABLEAU DE HAUTEURS.
     *
     * Entre deux points ordinaires, un demi-cosinus : il part à plat, arrive à
     * plat, et deux segments mis bout à bout se raccordent donc SANS CASSURE.
     * C'est ce qui fait qu'aucune colline de ce jeu n'a d'angle — et l'ancienne
     * version avait mis trois jours à obtenir la même chose avec des ondes.
     *
     * LE TREMPLIN, LUI, N'EST PAS LISSE, ET C'EST EXPRÈS : sa courbe part
     * doucement et finit RAIDE, comme un tremplin de saut à ski. C'est cette
     * fin raide qui lance.
     */
    rasteriser(ctrl, idx) {
        let seg = 0;
        const finX = ctrl[ctrl.length - 1].x;
        while (this.curseur < finX) {
            const x = this.curseur;
            while (seg < ctrl.length - 2 && x > ctrl[seg + 1].x) seg++;
            const p0 = ctrl[seg], p1 = ctrl[seg + 1];
            const t = borner((x - p0.x) / Math.max(1, p1.x - p0.x), 0, 1);
            const u = p1.tremplin ? t * t * (1.42 - 0.42 * t)
                : (1 - Math.cos(Math.PI * t)) * 0.5;
            const y = p0.y + (p1.y - p0.y) * u;
            this.points.push({ y, ocean: y >= NIVEAU_MER, tremplin: !!p1.tremplin, ile: idx });
            this.curseur += PAS_RELIEF;
        }
    }

    /**
     * LE SOL SOUS UNE ABSCISSE : sa hauteur, sa pente, sa courbure.
     *
     * LES DÉRIVÉES SONT PRISES SUR ±8 PIXELS, pas sur deux points voisins. Sur
     * deux points, le bruit de l'échantillonnage domine la courbure et l'oiseau
     * décolle au hasard — c'est le même défaut que les « sauts de six centièmes
     * de seconde » de l'ancienne version, obtenu par un autre chemin.
     */
    echantillon(x, etendre = true) {
        if (etendre && !this.enCours) this.assurerJusqua(x + 4000);
        const brut = (x - ORIGINE_X) / PAS_RELIEF;
        const dernier = Math.max(0, this.points.length - 1);
        const i0 = borner(Math.floor(brut), 0, Math.max(0, dernier - 1));
        const i1 = borner(i0 + 1, 0, dernier);
        const f = borner(brut - i0, 0, 1);
        const s0 = this.points[i0], s1 = this.points[i1];
        const y = entre(s0.y, s1.y, f);

        const ig = borner(i0 - 2, 0, dernier), id = borner(i1 + 2, 0, dernier);
        const portee = Math.max(PAS_RELIEF, (id - ig) * PAS_RELIEF);
        const pente = (this.points[id].y - this.points[ig].y) / portee;
        const dG = (s0.y - this.points[ig].y) / Math.max(PAS_RELIEF, (i0 - ig) * PAS_RELIEF);
        const dD = (this.points[id].y - s1.y) / Math.max(PAS_RELIEF, (id - i1) * PAS_RELIEF);
        const courbure = (dD - dG) / (portee * 0.5);

        return {
            y, pente, courbure,
            ocean: s0.ocean && s1.ocean,
            tremplin: s0.tremplin || s1.tremplin,
            ile: s0.ile
        };
    }

    /**
     * LES DÉCORS ET LES GRAINES.
     *
     * LES GRAINES SE POSENT DANS LES CREUX, EN ARC — c'est ce qui apprend le
     * geste sans un mot : pour les enfiler toutes, il faut traverser le creux
     * vite, donc avoir plongé dans la descente d'avant. Une récompense posée là
     * où le bon geste mène vaut dix phrases de consigne.
     *
     * ET AUCUNE NE TOMBE DANS LA MER. La garde le vérifie : appâter un élève
     * vers l'eau serait lui apprendre le contraire de ce qu'on veut.
     */
    semer(ile, depuis) {
        const r = this.rng;
        const theme = ile.theme;
        const finDecor = ile.basDescenteX - 140;

        for (let x = depuis; x < finDecor; x += 190) {
            const s = this.echantillon(x, false);
            if (s.ocean || s.y > NIVEAU_MER - 42) continue;
            if (Math.abs((x - depuis) % 1520) < 190) {
                this.decors.push({ type: 'panneau', x, y: s.y, angle: Math.atan(s.pente),
                    texte: `${Math.round((x - ORIGINE_X) / 500) * 50} m` });
                continue;
            }
            const d = r.next();
            if (d < 0.36 && Math.abs(s.pente) < 0.42) {
                this.decors.push({ type: 'arbre', x, y: s.y, angle: Math.atan(s.pente) * 0.35,
                    taille: 0.8 + r.next() * 0.5, feuille: theme.feuille, tronc: theme.tronc,
                    forme: r.next() > 0.5 ? 'rond' : 'sapin' });
            } else if (d < 0.8) {
                this.decors.push({ type: 'fleurs', x, y: s.y, angle: Math.atan(s.pente),
                    couleur: r.pick(theme.fleurs) });
            }
        }

        // ── ON CHERCHE LES CREUX AU PAS DE 110, PAS DE 330 ──────────────
        //
        // MESURÉ : au pas de 330 pixels, on en trouvait TROIS par île. Les
        // creux sont espacés de cinq cents pixels et larges de deux cents : un
        // pas de 330 les enjambe deux fois sur trois, et l'île se retrouve
        // presque nue. On le voit tout de suite sur une photo — zéro graine à
        // l'écran — et jamais dans le code, qui a l'air juste.
        //
        // La fenêtre de comparaison s'élargit aussi : ±120 pixels, sinon un
        // creux bien arrondi ne se distingue pas de son propre fond.
        let x = depuis + 260;
        while (x < ile.sommetX - 280) {
            const s = this.echantillon(x, false);
            const g = this.echantillon(x - 120, false), d = this.echantillon(x + 120, false);
            if (s.y > g.y && s.y > d.y && !s.ocean) {
                // UN CREUX : six graines en arc, qu'on enfile en allant vite.
                for (let i = 0; i < 6; i++) {
                    const sx = x + (i - 2.5) * 46;
                    const sol = this.echantillon(sx, false).y;
                    const lever = 80 + (1 - Math.pow((i - 2.5) / 2.6, 2)) * 65;
                    this.bonus.push({ type: 'graine', x: sx, y: sol - lever,
                        pris: false, phase: i * 0.45 });
                }
                x += 560;
                continue;
            }
            if (s.y < g.y && s.y < d.y && s.y < 265 && r.next() < 0.5) {
                // UN SOMMET HAUT : un éclat de soleil, qu'on n'atteint qu'en
                // décollant. C'est la seule récompense qui demande de VOLER.
                this.bonus.push({ type: 'soleil', x, y: s.y - 210, pris: false, phase: 0 });
                x += 420;
                continue;
            }
            x += 110;
        }
    }
}

/* ─────────────────────────────────────────────────────────────────────────
 * 8. L'OISEAU
 * ───────────────────────────────────────────────────────────────────────── */

/** L'état de départ : posé sur la première colline, déjà lancé. */
export function etatInitial(relief, x = -900) {
    const s = relief.echantillon(x);
    return {
        x, y: s.y - RAYON_OISEAU, vx: 370, vy: 0,
        auSol: true, rotation: 0,
        hautDansLeCiel: false,
        surLaMer: false, mouilleCetteFois: false,
        graceCatapulte: 0,
        ile: 0,
        nuit: JOUR_DEPART,
        avance: 0,
        evenement: null
    };
}

/**
 * LE SOL SE DÉROBE-T-IL SOUS L'OISEAU ?
 *
 * Suivre une crête demande une accélération vers le BAS de v² fois la courbure ;
 * si la pesanteur n'en fournit pas autant, l'oiseau part tout droit. Avec un y
 * qui descend, une crête a une courbure POSITIVE — attention au signe, c'est
 * l'inverse de l'ancienne version.
 */
export const quitteLeSol = (courbure, v, gravite, pente) =>
    v * v * courbure > gravite * Math.cos(Math.atan(pente));

/**
 * UN PAS DE JEU.
 *
 * Pur : il rend un NOUVEL état et ne touche à rien d'autre. C'est ce qui permet
 * de jouer trois minutes de partie en quelques millisecondes dans une épreuve,
 * et c'est la seule raison pour laquelle on sait ce que vaut le geste.
 *
 * `evenement` porte ce que l'écran doit annoncer — une traversée, un ricochet,
 * une catapulte. Le dessin le lit et l'oublie ; le noyau n'affiche rien.
 */
export function pas(etat, dt, appuie, relief) {
    const e = { ...etat, evenement: null };
    const avantX = e.x;
    if (e.graceCatapulte > 0) e.graceCatapulte -= dt;

    const plonge = appuie && e.graceCatapulte <= 0;
    const g = plonge ? GRAVITE_PLONGEE : GRAVITE;
    const sol = relief.echantillon(e.x);
    const ile = relief.ileDe(e.x);

    // ── LA TRAVERSÉE D'UN DÉTROIT ────────────────────────────────────────
    if (sol.ocean) {
        if (!e.surLaMer) { e.surLaMer = true; e.mouilleCetteFois = false; }
    } else if (e.surLaMer) {
        e.surLaMer = false;
        if (ile.index > e.ile) {
            e.ile = ile.index;
            if (e.mouilleCetteFois) {
                e.nuit = Math.max(0.06, e.nuit - JOUR_RENDU_MOUILLE);
                e.evenement = { quoi: 'ile', parfaite: false, ile: ile.index };
            } else {
                e.nuit = Math.max(0.04, e.nuit - JOUR_RENDU_PARFAIT);
                e.evenement = { quoi: 'ile', parfaite: true, ile: ile.index };
            }
        }
    }

    const angle = Math.atan(sol.pente);
    const tx = Math.cos(angle), ty = Math.sin(angle);

    if (!e.auSol) {
        // ── EN VOL ───────────────────────────────────────────────────────
        //
        // AU-DESSUS DE LA MER, L'OISEAU PLANE. Sans cette portance, le vol de
        // détroit retombait au tiers du trou quelle que soit la catapulte :
        // c'est elle qui transforme un saut en TRAVERSÉE, et c'est ce que Rémy
        // appelle « un super long saut ».
        const plane = sol.ocean && !plonge && e.vy > -120;
        const gEff = plane ? g * GLISSE_MARINE : g;
        const frotte = sol.ocean ? FROTTEMENT_AIR_MER : FROTTEMENT_AIR;
        e.vy += gEff * dt;
        e.vx = Math.max(VITESSE_MIN, e.vx * (1 - frotte * dt));
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (!sol.ocean && sol.y - e.y > 220) e.hautDansLeCiel = true;
        e.rotation = entre(e.rotation, borner(Math.atan2(e.vy, e.vx), -0.85, 0.95), 10 * dt);

        const nouveau = relief.echantillon(e.x);
        if (nouveau.ocean) {
            if (e.y + RAYON_OISEAU >= NIVEAU_MER) {
                // ── ON RICOCHE, ON NE COULE PAS ──────────────────────────
                //
                // Dans l'ancienne version, toucher l'eau terminait la partie.
                // C'était juste et c'était dur : un élève qui rate son premier
                // saut rendait la manette. Ici l'eau COÛTE — la moitié du jour
                // regagné, et la traversée n'est plus « parfaite » — mais elle
                // ne punit pas. On apprend en rebondissant.
                e.y = NIVEAU_MER - RAYON_OISEAU;
                e.vy = -Math.max(RICOCHET_MONTEE, Math.abs(e.vy) * 0.74);
                e.vx = Math.max(RICOCHET_AVANCE, e.vx * 0.94);
                e.mouilleCetteFois = true;
                e.evenement = { quoi: 'ricochet', x: e.x };
            }
        } else if (e.y + RAYON_OISEAU >= nouveau.y) {
            // ── L'ATTERRISSAGE, ET C'EST LÀ QUE LE GESTE SE PAIE ─────────
            //
            // On projette la vitesse SUR la pente : ce qui rentre dans le sol
            // est perdu, ce qui va le long du sol est gardé. Retomber dans une
            // descente convertit donc la chute en avance — c'est la « super
            // glisse » —, et se planter dans une montée casse l'élan.
            const a = Math.atan(nouveau.pente);
            const ltx = Math.cos(a), lty = Math.sin(a);
            const normale = -(e.vx * Math.sin(a) + e.vy * -Math.cos(a));
            const tangent = e.vx * ltx + e.vy * lty;
            e.y = nouveau.y - RAYON_OISEAU;
            e.auSol = true;
            let v;
            if (a > 0.08 && normale > 75) {
                v = Math.max(tangent + normale * Math.sin(a) * 1.18,
                    Math.hypot(e.vx, e.vy) * 0.95);
                if (e.hautDansLeCiel) e.evenement = { quoi: 'superglisse', x: e.x, y: e.y };
            } else if (a < -0.14 && normale > 150) {
                v = tangent * 0.74;
                e.evenement = { quoi: 'choc', x: e.x };
            } else {
                v = Math.max(tangent, Math.hypot(e.vx, e.vy) * 0.90);
                if (e.hautDansLeCiel && a >= -0.05) {
                    e.evenement = { quoi: 'superglisse', x: e.x, y: e.y };
                }
            }
            v = borner(v, VITESSE_MIN, VITESSE_MAX);
            e.vx = v * ltx; e.vy = v * lty;
            e.hautDansLeCiel = false;
        }
    } else {
        // ── LA GLISSE ────────────────────────────────────────────────────
        let v = Math.hypot(e.vx, e.vy);
        // SUR LE TREMPLIN, ON NE PERD RIEN ET L'ON POUSSE. Il ne rend pas
        // seulement ce que la descente a donné : il l'amplifie, sinon la
        // remontée de 245 pixels mangerait tout l'élan qu'on vient de gagner,
        // et « un super long saut » deviendrait un saut ordinaire.
        const pousse = sol.tremplin
            ? Math.max(220, g * Math.sin(angle) * 0.35 + 320)
            : g * Math.sin(angle);
        const frotte = sol.tremplin ? FROTTEMENT_TREMPLIN
            : plonge ? FROTTEMENT_PLONGEE : FROTTEMENT_SOL;
        v = borner(v + pousse * dt - v * frotte * dt, VITESSE_MIN, VITESSE_MAX);
        e.vx = v * tx; e.vy = v * ty;
        e.x += e.vx * dt;

        const apres = relief.echantillon(e.x);
        if (sol.tremplin && (!apres.tremplin || e.x >= ile.levreX - 10)) {
            // ── LA CATAPULTE ────────────────────────────────────────────
            //
            // RÉMY : « un tremplin qui permet de faire un super long saut ».
            // On quitte la lèvre à une vitesse PLANCHER : celui qui a plongé
            // part plus vite que le plancher et va plus loin, celui qui s'est
            // laissé rouler part quand même — un élève ne doit pas rater le
            // plus beau moment du jeu parce qu'il n'a pas encore compris.
            e.auSol = false;
            // ── ON REPOSE L'OISEAU SUR LA LÈVRE AVANT DE LE LANCER ──────
            //
            // LE DÉFAUT QUE LA TRACE A MONTRÉ, et il annulait toute la
            // demande de Rémy : « portée 23 px, 0,02 s en l'air ». Dans cette
            // branche on ne mettait pas `e.y` à jour, donc l'oiseau partait à
            // l'altitude de l'image PRÉCÉDENTE. Or la fin du tremplin monte à
            // 1,6 pixel par pixel — plus vite que la trajectoire du saut, qui
            // monte à 0,58 : l'oiseau naissait donc VINGT PIXELS SOUS le sol
            // et se reposait à l'image suivante, à un pixel près.
            //
            // Le saut existait, il durait une image. Rien ne le signalait :
            // aucune erreur, aucun test rouge, et à l'écran on voyait l'oiseau
            // « glisser » par-dessus la lèvre.
            //
            // ET ON LE POSE SUR LA LÈVRE, PAS SUR LE SOL D'ICI. Deuxième
            // version du même défaut : la catapulte part jusqu'à dix pixels
            // AVANT la lèvre, et la fin du tremplin monte à 0,76 pixel par
            // pixel quand le saut le plus lent ne monte qu'à 0,58. L'oiseau
            // était donc lancé DANS la rampe et s'y reposait à l'image
            // suivante, à un pixel près — un saut de 17 pixels, une fois sur
            // quatre, sans que rien ne le signale. La lèvre est le point le
            // plus haut du tremplin : partir de là, c'est partir au-dessus de
            // tout ce qui reste.
            e.y = Math.min(apres.y, relief.echantillon(ile.levreX, false).y) - RAYON_OISEAU;
            const vitesse = borner(Math.max(v * 1.18, VITESSE_CATAPULTE),
                VITESSE_CATAPULTE, VITESSE_MAX * 1.30);
            e.vx = vitesse * Math.cos(ANGLE_CATAPULTE);
            e.vy = vitesse * Math.sin(ANGLE_CATAPULTE);
            e.graceCatapulte = 0.34;
            e.hautDansLeCiel = true;
            e.evenement = { quoi: 'catapulte', x: e.x, y: e.y, vitesse };
        } else if (apres.ocean || e.y + RAYON_OISEAU >= NIVEAU_MER) {
            e.auSol = false;
            e.y = Math.min(e.y, NIVEAU_MER - RAYON_OISEAU);
            e.vy = -460;
            e.vx = Math.max(e.vx, 680);
            e.mouilleCetteFois = true;
            e.evenement = { quoi: 'ricochet', x: e.x };
        } else {
            e.y = apres.y - RAYON_OISEAU;
            e.rotation = entre(e.rotation, angle, 16 * dt);
            if (!sol.tremplin && quitteLeSol(apres.courbure, v, g, sol.pente)
                && apres.pente < 0.16) {
                e.auSol = false;
                if (!plonge && v > VITESSE_IMPULSION) e.vy -= IMPULSION_CRETE;
            }
        }
    }

    // ── LE JOUR PASSE ────────────────────────────────────────────────────
    e.nuit = avancerNuit(e.nuit, dt, e.ile);
    e.avance = Math.max(0, e.x - avantX);
    return e;
}

/* ─────────────────────────────────────────────────────────────────────────
 * 9. CE QUE VAUT UNE PARTIE
 * ───────────────────────────────────────────────────────────────────────── */

export const POINTS_ILE = 14;
export const POINTS_GRAINE = 1;
export const POINTS_ECLAT = 5;

/**
 * LE BILAN D'UNE PARTIE.
 *
 * `distance` est en mètres, c'est-à-dire en dixièmes de pixel : c'est le seul
 * nombre que l'élève lit pendant qu'il joue, et il doit vouloir dire quelque
 * chose. Cent mètres, c'est une colline.
 */
export function qualiteAiles(distance, ile, graines, eclats = 0) {
    return {
        distance: Math.round(distance), ile, graines, eclats,
        points: Math.max(1, ile * POINTS_ILE + graines * POINTS_GRAINE
            + eclats * POINTS_ECLAT + Math.round(distance / 40))
    };
}

/** Le nom d'une île, pour l'afficher. */
export const nomDeLIle = (index) => ILES[index % ILES.length].nom;

/** Le thème d'une île, pour la dessiner. */
export const themeDeLIle = (index) => ILES[index % ILES.length];
