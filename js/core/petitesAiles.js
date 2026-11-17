// LES PETITES AILES — glisser sur les collines, et courir devant la nuit.
//
// Rémy : « J'adorerais le jeu Tiny Wings sur iPhone. » Puis, après le banc
// d'essai : « Je ne comprends pas. N'en fais pas un jeu mathématiques et on
// accélère en cliquant ou en appuyant sur la barre d'espace. C'est plus un jeu
// de réflexe et on peut passer de monde à monde. »
//
// LES NOMBRES SONT PARTIS, ET C'EST UN GAIN. La première version faisait
// flotter des nombres au-dessus des collines et demandait de n'avaler que les
// multiples de 7 : deux jeux dans le même écran, l'un qui demande de sentir le
// relief, l'autre de calculer. On ne fait bien ni l'un ni l'autre, et l'élève
// ne comprend ni pourquoi il perd un cœur ni ce qu'on attend de lui. Tout ce
// module a donc perdu ses règles, ses volées de nombres et ses explications :
// il ne reste que le vol.
//
// CE QUI FAIT TINY WINGS, ce n'est ni le graphisme ni l'oiseau : c'est UNE
// TOUCHE et une idée. On appuie — clic, doigt ou barre d'espace — pour plonger,
// on relâche pour planer. Plonger dans une descente donne de la vitesse, et
// cette vitesse renvoie en l'air au creux suivant. Tout le plaisir est là :
// sentir le moment où il faut appuyer.
//
// ET LA NUIT COURT DERRIÈRE. C'est elle qui fait du vol un jeu de RÉFLEXE
// plutôt qu'une promenade : un mur d'ombre avance à vitesse constante, et si
// l'on flâne il rattrape. Aller vite n'est plus un score, c'est la condition
// pour continuer — et c'est aussi ce qui donne son sens au passage de MONDE en
// monde, puisque franchir une frontière repousse la nuit.
//
// LE RELIEF EST UNE SOMME DE SINUS, ET C'EST VOULU. Trois ondes de périodes
// différentes suffisent à donner des collines qui ne se répètent jamais tout à
// fait, et surtout un relief CONTINU dont on connaît la pente EXACTEMENT — pas
// une approximation prise entre deux points. La pente, c'est la dérivée, et
// c'est elle qui décide de tout : la vitesse gagnée, le décollage, l'atterrissage.
//
// Module pur : ni DOM, ni hasard propre, ni horloge.

/**
 * LES PALIERS : plus on avance, plus les collines sont hautes et serrées.
 *
 * TOUT EST EN PIXELS DE MONDE, y compris les hauteurs. La première version
 * exprimait le relief en « fraction de la hauteur de l'écran » et la distance
 * en unités de monde : la pente valait alors des millièmes, la gravité
 * projetée dessus ne poussait plus rien, et l'oiseau ralentissait jusqu'au
 * plancher quoi qu'on fasse. Deux unités différentes dans la même formule ne
 * donnent pas un jeu mal réglé, elles donnent un jeu qui ne marche pas.
 */
export const SOL_MOYEN = 300;
export const HAUTEUR_MONDE = 620;

/**
 * LES MONDES — et ce n'est pas qu'un décor qui change.
 *
 * Rémy : « on peut passer de monde à monde ». Chacun a SON relief (plus haut,
 * plus serré), SA palette, et SA nuit — qui va un peu plus vite que la
 * précédente. Franchir une frontière est donc à la fois une récompense (la nuit
 * recule) et une marche de plus : c'est ce qui fait qu'on veut y aller.
 *
 * LA PALETTE EST DANS LE MONDE, PAS DANS LE DESSIN. Un ciel rose et des roches
 * violettes ne sont pas une décoration : c'est le seul signal qui dit « tu as
 * changé de monde » alors qu'on file à sept cents pixels par seconde.
 *
 * LES SIX VITESSES DE NUIT SONT MESURÉES, PAS DEVINÉES. Le test simule les
 * trois joueurs — celui qui plonge à propos, celui qui ne fait rien, celui qui
 * appuie sans arrêt — et vérifie que la nuit reste derrière le premier partout,
 * et finit par rattraper le deuxième. Le premier monde, lui, pardonne : on y
 * apprend le geste, on n'y perd pas.
 */
export const LONGUEUR_MONDE = 6400;

/**
 * LA NUIT A ÉTÉ REMESURÉE AVEC LE BATTEMENT D'AILES, et il le fallait.
 *
 * Elle courait à 150–248 px/s, réglée sur un jeu où le joueur ordinaire faisait
 * 210 à 280. Le battement a doublé les allures : ne RIEN faire suffisait alors
 * à la semer dans les six mondes — c'est-à-dire qu'il n'y avait plus aucune
 * raison d'apprendre le geste, et l'épreuve du même nom le disait.
 *
 * Les six valeurs sont reposées sur les allures MESURÉES monde par monde
 * (tools/tmp/allureMondes.mjs), et tiennent les trois règles d'origine :
 * elle reste sous 85 % de l'allure du bon joueur partout — il doit pouvoir la
 * semer dans les six mondes —, le premier monde pardonne (300 contre 458 à ne
 * rien faire : on y apprend sans perdre), et le dernier ne pardonne plus
 * (400 contre 285 : l'immobilité s'y paie).
 *
 * Elle monte aussi de monde en monde, ce qu'elle faisait déjà : chacun est
 * « plus haut, plus serré et plus pressé que le précédent ».
 */
export const MONDES = [
    {
        id: 1, nom: 'Les dunes', amplitude: 95, periode: 900, nuit: 310,
        // Les collines du fond sont du SABLE, pas du bleu : ce sont les mêmes
        // dunes vues de loin, et une couche bleue au milieu du désert se lisait
        // comme une flaque.
        ciel: ['#9fd8ff', '#e8f6ff'], fond: ['#e6c390', '#d3a96d'],
        sol: '#c99a52', herbe: '#f0c987'
    },
    {
        id: 2, nom: 'Les collines', amplitude: 118, periode: 870, nuit: 405,
        ciel: ['#8ed0ff', '#dff3ff'], fond: ['#a9c8e8', '#87b0d8'],
        sol: '#2f855a', herbe: '#68d391'
    },
    {
        id: 3, nom: 'Les crêtes', amplitude: 140, periode: 840, nuit: 380,
        ciel: ['#ffc98a', '#ffe9cf'], fond: ['#e0a98a', '#c98a72'],
        sol: '#7b4b2a', herbe: '#c0703c'
    },
    {
        id: 4, nom: 'La montagne', amplitude: 162, periode: 820, nuit: 370,
        ciel: ['#b9a7ff', '#e9e2ff'], fond: ['#a99ad8', '#8878c0'],
        sol: '#4a5578', herbe: '#e6ecff'
    },
    {
        id: 5, nom: 'Le grand large', amplitude: 180, periode: 800, nuit: 350,
        ciel: ['#63c7c0', '#d6f5f2'], fond: ['#7fbfc4', '#5d9aa4'],
        sol: '#1f6b6b', herbe: '#7fe6d8'
    },
    {
        id: 6, nom: 'Le pays de nuit', amplitude: 192, periode: 790, nuit: 415,
        ciel: ['#2d3561', '#5a6bad'], fond: ['#3f4a80', '#2b3358'],
        sol: '#1b2140', herbe: '#8f9bff'
    },

    // ── LES SEPT MONDES DU 17 NOVEMBRE ───────────────────────────────────
    //
    // RÉMY : « rajoute des mondes kawai, fantaisiste et 5 de ton choix ».
    //
    // LE SEPTIÈME ARRIVE JUSTE APRÈS LA NUIT, et le contraste est voulu : on
    // sort du pays le plus sombre pour tomber dans le plus sucré. C'est la
    // frontière qui se voit le mieux de toutes, et elle arrive au moment où
    // l'on commence à trouver le jeu difficile.
    //
    // ── LA DIFFICULTÉ PLAFONNE AU SIXIÈME, ET C'EST MESURÉ ───────────────
    //
    // Les six premiers mondes montent : plus hauts, plus serrés, plus pressés.
    // On a voulu continuer sur sept de plus, et c'est IMPOSSIBLE.
    //
    // Un relief plus haut et plus serré RALENTIT l'oiseau — c'est tout le jeu.
    // Un balayage de soixante-dix couples (amplitude de 200 à 290, période de
    // 700 à 790) donne au mieux 384 px/s au bon joueur, contre 453 dans le
    // sixième monde. Or la nuit doit rester sous 90 % de cette allure : son
    // plafond tombe donc à 345, alors que le sixième monde porte déjà une nuit
    // à 400. Il n'existe aucun septième monde à la fois plus dur ET plus
    // pressé. Mesuré, pas supposé : `node tools/allureDesMondes.mjs`.
    //
    // CE QUI MONTE N'EST DONC PLUS LA VITESSE DE LA NUIT, C'EST SA PRESSION —
    // le rapport entre elle et l'allure du bon joueur. Et c'est la seule
    // mesure qui ait un sens : une nuit à 400 dans un monde où l'on file à 453
    // serre exactement autant qu'une nuit à 300 dans un monde où l'on rampe à
    // 345. Les six premiers vont de 43 % à 88 % ; les sept suivants tiennent
    // tous les 88 % du sixième.
    //
    // Autrement dit : LE JEU ATTEINT SA DIFFICULTÉ AU SIXIÈME MONDE, et ce qui
    // vient après est un voyage, pas une épreuve de plus. Chaque monde garde
    // son relief propre et sa palette — c'est ce qu'on va y chercher.
    //
    // Les sept vitesses de nuit sont donc 88 % de l'allure MESURÉE de leur
    // monde, et de rien d'autre.
    {
        id: 7, nom: 'Le pays kawaï', amplitude: 139, periode: 900, nuit: 405,
        ciel: ['#ffd6ec', '#fff2f8'], fond: ['#ffc2dd', '#f7a8cb'],
        sol: '#e07ba8', herbe: '#b9f3dd'
    },
    {
        id: 8, nom: 'Le royaume fantaisiste', amplitude: 198, periode: 820, nuit: 410,
        ciel: ['#3b1d63', '#8e4fb0'], fond: ['#6a3a95', '#48256b'],
        sol: '#2a1240', herbe: '#ffd36e'
    },
    {
        // L'AURORE EST PLUS SOMBRE QU'ELLE N'EN A L'AIR : à `#7ef0c8`, la
        // glace du sol ne s'en détachait plus — rapport de contraste 1,20,
        // c'est-à-dire un sol invisible. Mesuré, pas jugé à l'oeil.
        id: 9, nom: 'La banquise', amplitude: 119, periode: 950, nuit: 365,
        ciel: ['#07182a', '#2fae8a'], fond: ['#cfe9f5', '#a9d2e6'],
        sol: '#eaf7ff', herbe: '#3f9fd4'
    },
    {
        id: 10, nom: 'Les terres de braise', amplitude: 162, periode: 700, nuit: 335,
        ciel: ['#3a0f10', '#ff7a3c'], fond: ['#7a2518', '#471310'],
        sol: '#1d0c0b', herbe: '#ff9d4d'
    },
    {
        id: 11, nom: 'La canopée', amplitude: 199, periode: 760, nuit: 400,
        ciel: ['#9fd6a8', '#e9f8ec'], fond: ['#2f6b46', '#1d4a2f'],
        sol: '#4a3620', herbe: '#5fdc7a'
    },
    {
        // LE SEL EST BLANC, DONC LE CIEL NE PEUT PAS L'ÊTRE. Premier essai :
        // ciel crème et sol crème, rapport 1,07 — deux aplats de la même
        // couleur, et plus de relief du tout. C'est le couchant qui sauve le
        // tableau : un ciel qui descend du bleu de nuit à l'abricot, et le
        // miroir de sel qui le reflète en clair.
        id: 12, nom: 'Le désert de sel', amplitude: 109, periode: 1000, nuit: 435,
        ciel: ['#2b4f72', '#e9a07a'], fond: ['#c9a08f', '#a87e6e'],
        sol: '#fbf7f2', herbe: '#d9654a'
    },
    {
        // LE DERNIER, ET IL NE PARDONNE PLUS : sa nuit va plus vite que
        // l'oiseau qui ne fait rien. On n'y reste qu'en jouant.
        // ON EST TRÈS HAUT, DONC LE CIEL EST SOMBRE EN HAUT. C'est ce qui
        // dit l'altitude sans un mot — et c'est aussi ce qui détache enfin la
        // mer de nuages, qui est blanche et ne se détachait de rien (1,36).
        id: 13, nom: 'Au-dessus des nuages', amplitude: 184, periode: 860, nuit: 375,
        ciel: ['#123a6b', '#e8a93f'], fond: ['#ffffff', '#ffe0a8'],
        sol: '#fdfcf8', herbe: '#e8a62a'
    }
];

/** Le monde où l'on se trouve. Le dernier ne finit jamais. */
export const mondeDe = (distance) =>
    MONDES[Math.max(0, Math.min(MONDES.length - 1, Math.floor(distance / LONGUEUR_MONDE)))];

/**
 * OÙ L'ON EN EST DANS SON MONDE : de quoi dessiner une barre de progression.
 *
 * `part` va de 0 à 1, `restant` est la distance jusqu'à la frontière suivante.
 * Dans le dernier monde, il n'y a plus de frontière : `restant` vaut l'infini
 * plutôt que zéro, sans quoi la barre resterait pleine et promettrait un monde
 * de plus qui n'arrivera jamais.
 */
export function progressionMonde(distance) {
    const monde = mondeDe(distance);
    const dernier = monde.id === MONDES.length;
    const debut = (monde.id - 1) * LONGUEUR_MONDE;
    return {
        monde, dernier,
        part: dernier ? 1 : (distance - debut) / LONGUEUR_MONDE,
        restant: dernier ? Infinity : debut + LONGUEUR_MONDE - distance
    };
}


/**
 * LE RACCORD ENTRE DEUX MONDES — et c'était un mur de cent pixels.
 *
 * Rémy : « on fait des grands sauts de monde à monde ». Ce n'était pas une
 * impression : le relief se calculait à partir du monde COURANT, dont
 * l'amplitude et la période changent d'un coup à la frontière. À la première
 * d'entre elles — 3 200 pixels, à l'époque —, le sol tombait de 101 pixels et
 * la pente passait de 0,16 à 2,46 : une falaise
 * verticale. L'oiseau se retrouvait en l'air d'un pas de physique à l'autre, et
 * repartait dans un saut qu'il n'avait pas demandé.
 *
 * LE TERRAIN EST DONC UNE FONCTION DE x, ET DE x SEUL. Le monde ne le décide
 * plus ; il ne sert qu'à la palette et à la nuit. Amplitude et pulsation se
 * raccordent en douceur sur les neuf cents derniers pixels de chaque monde, et
 * la difficulté monte en pente au lieu de sauter — ce qui est aussi meilleur à
 * jouer que la marche qu'on vient de supprimer.
 *
 * LA PHASE S'INTÈGRE, ELLE NE SE CALCULE PAS. Écrire sin(2πx/p) avec un `p` qui
 * varie ferait glisser l'onde sous les pieds de l'oiseau : la même abscisse
 * changerait de hauteur d'une image à l'autre. On accumule donc la phase —
 * φ(x) = ∫ ω — de sorte que sa DÉRIVÉE vaut la pulsation voulue tout en restant
 * continue. Sur un palier c'est ω·L ; sur la rampe, l'intégrale de
 * l'interpolation se pose à la main.
 *
 * L'INTERPOLATION EST QUINTIQUE, PAS CUBIQUE. Le classique 3t² − 2t³ a une
 * dérivée seconde NON NULLE aux deux bouts : la courbure du sol sautait donc à
 * l'entrée et à la sortie de chaque rampe — et la courbure, ici, décide du
 * décollage. 6t⁵ − 15t⁴ + 10t³ s'annule à l'ordre deux des deux côtés : tout se
 * raccorde, y compris ce qui fait sauter l'oiseau.
 */
export const TRANSITION = 900;

/**
 * LA HAUTEUR DE LA BOSSE DE FRONTIÈRE — voir `bosse` pour sa forme.
 *
 * CE CHIFFRE EST CELUI DU DÉCOLLAGE, et il se calcule. `quitteLeSol` demande
 * que la courbure du sol dépasse la gravité : −courbure · v² > g. La courbure
 * maximale de la bosse vaut BOSSE · 2,85 · 10⁻⁵ (c'est `adoucir2` à son
 * extremum, divisé par TRANSITION²). À 500 px/s et g = 1300, il faut donc une
 * bosse de plus de 182 px pour que l'oiseau quitte vraiment le sol.
 *
 * On prend plus large : la frontière doit se voir, pas se deviner.
 */
export const BOSSE_FRONTIERE = 150;

/**
 * ET LE SOL SE DÉROBE : chaque frontière descend de ce nombre de pixels.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « dans tiny wings on passait d'un monde à l'autre avec un gros vol
 * plané ».
 *
 * LA BOSSE SEULE NE SUFFISAIT PAS, ET LA MESURE A ÉTÉ SANS APPEL : à bosse
 * nulle, le plus long vol de la frontière durait déjà 1,05 s pour 279 px ; à
 * 260 px de bosse, 1,07 s pour 271. Elle ajoutait onze degrés de pente — au-delà
 * de la falaise — et pas un centième de seconde de vol. Les crêtes ordinaires
 * du relief éjectaient déjà l'oiseau ; une bosse de plus, étalée sur 900 px, ne
 * fait qu'une crête de plus.
 *
 * CE QUI ALLONGE UN VOL N'EST PAS L'ÉLAN VERS LE HAUT, C'EST LE SOL QUI PART.
 * Un oiseau lancé à 450 px/s vers le haut retombe en sept dixièmes de seconde,
 * quelle que soit la bosse. Mais si le sol descend de sept cents pixels pendant
 * ce temps-là, il ne le rencontre plus : il plane. C'est le mécanisme de Tiny
 * Wings, et c'est une propriété du TERRAIN, pas de l'oiseau.
 *
 * LA BOSSE RESTE, PLUS BASSE : elle donne la crête d'où l'on part, juste avant
 * que le sol ne s'en aille. Les deux vont ensemble.
 *
 * ET LA DESCENTE RAPPORTE : sept cents pixels de chute valent 215 000 de ½v²,
 * donc 500 px/s qui deviennent 900, le plafond du jeu. Franchir une frontière est une récompense,
 * et elle se sent dans les doigts.
 */
export const DESCENTE_FRONTIERE = 700;

/**
 * LE NIVEAU MOYEN DU SOL EN x — il descend d'une marche à chaque frontière.
 *
 * EXPORTÉ PARCE QUE LE DESSIN EN A BESOIN. Les deux plans d'arrière-plan sont
 * tirés du même relief, comprimés vers le niveau moyen pour donner la
 * profondeur. Comprimés vers `SOL_MOYEN`, qui ne descend pas, ils flottaient
 * dans le ciel dès le troisième monde — mesuré en écrivant cette marche la
 * première fois, et c'est ce qui m'avait fait l'abandonner. Comprimés vers le
 * niveau LOCAL, ils suivent.
 */
export function niveauFrontiere(x) {
    const { i, t } = raccord(x);
    return SOL_MOYEN - DESCENTE_FRONTIERE * (i + adoucir(t));
}

const pulsation = (m) => (2 * Math.PI) / m.periode;
const adoucir = (t) => t * t * t * (t * (6 * t - 15) + 10);
const adoucir1 = (t) => 30 * t * t * (t - 1) * (t - 1);
const adoucir2 = (t) => 60 * t * (t - 1) * (2 * t - 1);
/**
 * LA BOSSE DE LA FRONTIÈRE : elle monte, puis elle retombe — et c'est tout le
 * passage d'un monde à l'autre.
 *
 * RÉMY : « dans tiny wings on passait d'un monde à l'autre avec un gros vol
 * plané ». La frontière n'était qu'un fondu de fréquence sur 900 pixels : le
 * relief se resserrait doucement, rien ne se voyait, et franchir un monde ne
 * se remarquait qu'à la bannière qui l'annonçait.
 *
 * MONTER PUIS REDESCENDRE, ET NON DESCENDRE TOUT COURT. J'ai d'abord écrit une
 * marche d'escalier — le sol perdait quelques centaines de pixels à chaque
 * frontière —, et c'était juste en énergie : la descente rend de la vitesse.
 * Mais les deux plans d'arrière-plan sont tirés du MÊME relief, comprimés vers
 * `SOL_MOYEN` (voir `dessiner`, dans games/petitesAiles.js) : au douzième
 * monde, le sol est à trois mille pixels sous la moyenne et les collines du
 * fond flottent dans le ciel. Une forme qui revient à son niveau n'a pas ce
 * défaut.
 *
 * ELLE EST ASYMÉTRIQUE, et c'est elle qui fait le vol : on monte sur les six
 * dixièmes de la rampe, on retombe sur les quatre derniers. Le flanc de
 * descente est donc une fois et demie plus raide que celui de montée — c'est
 * là que l'oiseau décolle, et il a ensuite tout le reste de la descente pour
 * planer au-dessus.
 *
 * DEUX ADOUCISSEURS BOUT À BOUT, et non un sinus : `adoucir` s'annule à
 * l'ordre DEUX à ses deux bouts, donc la bosse se raccorde au relief sans
 * casser ni la pente ni la courbure. Et la courbure décide du décollage.
 */
const MONTEE_BOSSE = 0.6;
const bosse = (t) => adoucir(Math.min(1, t / MONTEE_BOSSE))
    - adoucir(Math.max(0, (t - MONTEE_BOSSE) / (1 - MONTEE_BOSSE)));
const bosse1 = (t) => adoucir1(Math.min(1, t / MONTEE_BOSSE)) / MONTEE_BOSSE
    - adoucir1(Math.max(0, (t - MONTEE_BOSSE) / (1 - MONTEE_BOSSE))) / (1 - MONTEE_BOSSE);
const bosse2 = (t) => adoucir2(Math.min(1, t / MONTEE_BOSSE)) / (MONTEE_BOSSE ** 2)
    - adoucir2(Math.max(0, (t - MONTEE_BOSSE) / (1 - MONTEE_BOSSE)))
        / ((1 - MONTEE_BOSSE) ** 2);

/** ∫₀ᵗ adoucir — elle vaut 1/2 en t = 1, d'où la moyenne des deux pulsations. */
const primitive = (t) => t * t * t * t * (t * (t - 3) + 2.5);
const melange = (a, b, u) => a + (b - a) * u;

/** Où l'on en est du raccord vers le monde suivant, en x. */
function raccord(x) {
    const i = Math.max(0, Math.min(MONDES.length - 1, Math.floor(x / LONGUEUR_MONDE)));
    const m = MONDES[i];
    const suivant = MONDES[Math.min(MONDES.length - 1, i + 1)];
    const fin = (i + 1) * LONGUEUR_MONDE;
    // Le dernier monde ne se raccorde à rien : il continue tel quel.
    const t = i >= MONDES.length - 1 ? 0
        : Math.max(0, Math.min(1, (x - (fin - TRANSITION)) / TRANSITION));
    return { i, m, suivant, t };
}

/** La phase cumulée à l'entrée de chaque monde, calculée une fois pour toutes. */
const PHASES_MONDE = (() => {
    const out = [0];
    for (let i = 0; i < MONDES.length; i++) {
        const wa = pulsation(MONDES[i]);
        const wb = pulsation(MONDES[Math.min(MONDES.length - 1, i + 1)]);
        // Le palier à pulsation constante, puis la rampe : la moyenne des deux
        // pulsations, puisque l'interpolation douce a pour intégrale 1/2.
        out.push(out[i] + wa * (LONGUEUR_MONDE - TRANSITION) + TRANSITION * (wa + wb) / 2);
    }
    return out;
})();

/** La phase de l'onde de base en x — continue, de dérivée `pulsationEn(x)`. */
export function phaseRelief(x) {
    const { i, m, suivant, t } = raccord(x);
    const wa = pulsation(m), wb = pulsation(suivant);
    const depuisDebut = Math.max(0, x - i * LONGUEUR_MONDE);
    // LE PALIER NE SE BORNE QUE S'IL Y A UNE RAMPE APRÈS LUI. Le dernier monde
    // n'a pas de frontière : lui appliquer le plafond figeait la phase au bout
    // de 2 300 pixels — le sol devenait plat et l'oiseau glissait à l'infini
    // sur une ligne droite. Le test des dérivées l'a attrapé à x = 18 306.
    const dernier = i >= MONDES.length - 1;
    const plat = dernier ? depuisDebut : Math.min(depuisDebut, LONGUEUR_MONDE - TRANSITION);
    let phi = PHASES_MONDE[i] + wa * plat;
    if (t > 0) phi += TRANSITION * (wa * t + (wb - wa) * primitive(t));
    return phi;
}

/**
 * LES TROIS ONDES — et leurs harmoniques étaient des FALAISES.
 *
 * Rémy : « beaucoup moins bien que Tiny Wings, dans le glissé, dans les sauts ».
 * On a fini par calculer ce qu'on faisait vraiment escalader à l'oiseau : la
 * pente maximale valait 1,79 dans le premier monde et 6,69 dans le dernier,
 * c'est-à-dire SOIXANTE ET UN puis QUATRE-VINGT-UN DEGRÉS. Ce ne sont pas des
 * collines, ce sont des murs — et aucun réglage de physique, jamais, ne pourra
 * donner l'impression de GLISSER sur un mur.
 *
 * D'OÙ VENAIT LA PENTE : DES HARMONIQUES. Une onde secondaire d'amplitude 0,42
 * et de fréquence 2,13 n'ajoute que 0,42 à la HAUTEUR, mais 0,42 × 2,13 = 0,89 à
 * la PENTE, et 0,42 × 2,13² = 1,9 à la COURBURE. Les deux harmoniques
 * multipliaient donc la pente par 2,7 et fournissaient l'essentiel de la
 * courbure — c'est-à-dire que l'oiseau décollait sur les petites bosses au lieu
 * des grandes crêtes. Cela se mesurait : cent dix « sauts » de quatorze
 * centièmes de seconde en quarante secondes. Il ne volait pas, il vibrait.
 *
 * LES HARMONIQUES DOIVENT TEXTURER, PAS SCULPTER. On les a rapprochées de la
 * fondamentale et beaucoup réduites : la fondamentale redevient maîtresse de la
 * courbure, donc ce sont les VRAIES crêtes qui lancent l'oiseau, et les petites
 * bosses ne font plus que casser la régularité du sinus.
 *
 * Les fréquences ne sont pas entières, et c'est exprès : le motif ne se referme
 * jamais tout à fait, donc le paysage ne se répète pas.
 */
export const ONDES = [
    { a: 1, f: 1, d: 0 },
    { a: 0.20, f: 1.47, d: 1.1 },
    { a: 0.07, f: 2.19, d: 2.3 }
];
const SOMME_ONDES = ONDES.reduce((t, o) => t + o.a, 0);

/**
 * LA PENTE MAXIMALE D'UN MONDE : la tangente de l'angle le plus raide qu'on
 * puisse y rencontrer.
 *
 * Elle se calcule, elle ne se devine pas — et le test s'en sert pour interdire
 * le retour des falaises. Les trois ondes ne culminent jamais tout à fait
 * ensemble, donc c'est une borne SUPÉRIEURE ; mais c'est bien la borne qui
 * compte, puisque c'est elle qui avait laissé passer quatre-vingt-un degrés.
 */
export const penteMax = (monde) =>
    (monde.amplitude / SOMME_ONDES) * (2 * Math.PI / monde.periode)
    * ONDES.reduce((t, o) => t + o.a * o.f, 0);

/**
 * LE RELIEF EN UN POINT, ET SA PENTE.
 *
 * `hauteur` est une altitude EN PIXELS au-dessus du fond, `pente` sa dérivée —
 * donc un nombre sans unité, celui qu'on peut projeter sur la gravité. Les deux
 * sont calculées à la main plutôt que par différence de deux points : une pente
 * approchée fait vibrer la vitesse quand l'oiseau glisse, et le jeu devient
 * nerveux sans qu'on sache pourquoi.
 *
 * SUR LE RACCORD, L'AMPLITUDE AUSSI VARIE — et sa dérivée compte. On avait
 * commencé par la négliger (« trente-cinq pixels sur neuf cents, c'est deux
 * centièmes ») ; le test des dérivées a montré quatre centièmes d'écart au
 * milieu de la rampe, c'est-à-dire une pente ANNONCÉE fausse là où l'oiseau
 * change de monde. Comme c'est exactement la pente qui décide de la vitesse
 * gagnée, on l'écrit en entier : h = k·H, donc h′ = k′H + kH′ et
 * h″ = k″H + 2k′H′ + kH″. Trois lignes de plus, et plus rien à négliger.
 */
export function relief(x, graine = 0) {
    const { i, m, suivant, t } = raccord(x);
    const wa = pulsation(m), wb = pulsation(suivant);
    // Les dérivées du mélange, EN x : la rampe fait TRANSITION pixels de long.
    const u = adoucir(t);
    const u1 = adoucir1(t) / TRANSITION;
    const u2 = adoucir2(t) / (TRANSITION * TRANSITION);

    // On ramène la somme des trois ondes à l'amplitude voulue, en pixels.
    const dA = (suivant.amplitude - m.amplitude) / SOMME_ONDES;
    const k = melange(m.amplitude, suivant.amplitude, u) / SOMME_ONDES;
    const k1 = dA * u1, k2 = dA * u2;

    const w = melange(wa, wb, u);
    const w1 = (wb - wa) * u1;
    const phi = phaseRelief(x);          // dφ/dx = ω, par construction

    let H = 0, H1 = 0, H2 = 0;
    for (const o of ONDES) {
        const angle = o.f * phi + o.d * (1 + graine);
        const s = Math.sin(angle), c = Math.cos(angle);
        H += o.a * s;
        H1 += o.a * o.f * w * c;
        H2 += o.a * o.f * (w1 * c - o.f * w * w * s);
    }
    // LA BOSSE DE LA FRONTIÈRE S'AJOUTE AU RELIEF, elle ne le remplace pas :
    // on survole les collines du monde qu'on quitte. Elle vaut zéro partout
    // ailleurs, puisque `t` vaut zéro hors de la rampe — et au dernier monde,
    // qui ne se raccorde à rien.
    const B = BOSSE_FRONTIERE * bosse(t) - DESCENTE_FRONTIERE * (i + u);
    const B1 = (BOSSE_FRONTIERE * bosse1(t) - DESCENTE_FRONTIERE * adoucir1(t)) / TRANSITION;
    const B2 = (BOSSE_FRONTIERE * bosse2(t) - DESCENTE_FRONTIERE * adoucir2(t))
        / (TRANSITION * TRANSITION);
    return {
        hauteur: SOL_MOYEN + k * H + B,
        pente: k1 * H + k * H1 + B1,
        courbure: k2 * H + 2 * k1 * H1 + k * H2 + B2
    };
}

/**
 * LES ÉTOILES — ce qu'on ramasse en route.
 *
 * Il fallait quelque chose à attraper : un vol où l'on ne fait que filer devant
 * la nuit n'a pas de décisions à prendre. Une étoile posée à mi-hauteur d'une
 * bosse en demande une, et c'est là qu'est le réflexe — plonger pour la prendre
 * coûte de la hauteur, la laisser coûte du temps sur la nuit.
 *
 * ELLES SE POSENT PAR RAPPORT AU SOL, PAS DANS LE CIEL. Semées à cent pixels
 * au-dessus du relief, elles n'étaient atteignables qu'en vol : on jouait six
 * secondes sans jamais rien ramasser. Vingt à quatre-vingts pixels, c'est la
 * portée de l'oiseau qui GLISSE — et le vol rapporte davantage sans être la
 * seule façon de marquer.
 */
export const ECART_ETOILES = 250;
export const HAUT_ETOILE_MIN = 20;
export const HAUT_ETOILE_MAX = 80;

export function semerEtoile(x, graine, rng) {
    const sol = relief(x, graine);
    return {
        x,
        y: sol.hauteur + HAUT_ETOILE_MIN
            + rng.int(0, HAUT_ETOILE_MAX - HAUT_ETOILE_MIN),
        prise: false
    };
}

/**
 * LA NUIT QUI COURT DERRIÈRE.
 *
 * Un mur d'ombre à vitesse constante, propre à chaque monde. Elle ne se règle
 * pas au hasard : elle doit rattraper celui qui ne fait rien et se laisser
 * distancer par celui qui joue bien — c'est la mesure, dans les tests, qui a
 * fixé les six vitesses.
 *
 * DEUX CHOSES LA REPOUSSENT, et ce sont les deux choses qu'on veut encourager :
 * ramasser une étoile, et franchir une frontière de monde. Le second recul est
 * bien plus grand : c'est la respiration qu'on s'est gagnée.
 */
export const RECUL_ETOILE = 90;
export const RECUL_MONDE = 1100;

export function avancerNuit(nuit, dt, monde) {
    return nuit + (monde || MONDES[0]).nuit * dt;
}

/** La nuit a-t-elle rattrapé l'oiseau ? */
export const rattrape = (nuit, x) => nuit >= x;

/**
 * LE PAS DE PHYSIQUE — une seule touche, et tout en découle.
 *
 * `dt` est en secondes. L'état contient la position, la vitesse et le fait
 * d'être au sol ou en l'air. On rend un NOUVEL état : la fonction est pure, ce
 * qui la rend testable — un jeu d'arcade dont on ne peut pas rejouer la
 * physique hors de l'écran est un jeu qu'on ne peut pas corriger.
 *
 * LES TROIS RÈGLES, ET IL N'EN FAUT PAS UNE DE PLUS :
 *
 *   1. AU SOL, la pente donne ou reprend de la vitesse. Descendre accélère,
 *      monter freine — c'est la gravité projetée sur la pente.
 *   2. APPUYER, c'est peser. En l'air on tombe plus vite ; au sol on colle
 *      davantage à la pente, donc on profite mieux de la descente.
 *   3. ON DÉCOLLE QUAND LE SOL SE DÉROBE : si la pente cesse de descendre plus
 *      vite que l'oiseau, il quitte le sol. Aucun saut à programmer, aucun
 *      bouton : c'est le relief qui lance.
 */
/**
 * QUITTE-T-ON LE SOL ?
 *
 * Suivre une bosse demande une accélération vers le bas de v² fois la COURBURE
 * du terrain. Si la gravité ne fournit pas autant, le sol se dérobe et l'oiseau
 * part tout droit. C'est toute la règle du décollage, et elle est nommée ici
 * plutôt qu'enfouie dans la boucle : un test qui recopie une formule ne la
 * vérifie pas, il la répète.
 */
export const quitteLeSol = (courbure, vx, gravite) => -courbure * vx * vx > gravite;

/**
 * LA PESANTEUR DE LA CHUTE — celle du vol, et elle décide de la DURÉE des sauts.
 *
 * Elle a été balayée, pas choisie : 900, 1 100, 1 300, 1 500, en remesurant à
 * chaque fois la vitesse, la part de temps en l'air et la longueur des vols.
 * À 900 les vols durent presque une seconde mais la vitesse s'effondre (l'oiseau
 * passe son temps en l'air, où il ne gagne rien) ; à 1 500 il file mais ne fait
 * plus que rebondir. 1 300 donne les deux : six dixièmes de seconde de vol, et
 * cinq à six cents pixels par seconde.
 *
 * Le plafond de vitesse a suivi le même chemin. Il valait 620 quand la vitesse
 * ne montait jamais ; maintenant qu'elle monte vraiment, c'est lui qu'on va
 * chercher en récompense d'une belle descente.
 */
/**
 * LA PESANTEUR DE CHUTE — et elle décide de la TAILLE DES SAUTS.
 *
 * RÉMY, le 17 novembre : « il faut que les sauts soient plus spectaculaires ».
 * Mesuré avant (`tools/volDesAiles.mjs`) : le bon joueur montait à 60 px et
 * restait 0,62 s en l'air. Une bosse du premier monde fait 95 px de haut — on
 * sautait donc moins haut que le relief, ce qui ne se voit pas.
 *
 * À 980, le même vol monte trois fois plus et dure moitié plus longtemps. Ce
 * n'est pas « moins de gravité » au hasard : c'est le seul réglage qui agisse
 * sur la HAUTEUR sans toucher à la vitesse au sol, donc sans redéfaire
 * l'équilibre des treize mondes.
 */
export const GRAVITE = 1300;
export const GRAVITE_PLONGEE = 2950;
/**
 * LE PLANCHER DE VITESSE — et il ne doit plus faire le travail du joueur.
 *
 * Rémy : « il avance quoiqu'il arrive (il monte même presque sans vitesse) ».
 * Mesuré : à 130, le plancher RELEVAIT la vitesse pendant 21 à 23 % des images
 * du joueur ordinaire. C'est lui qui faisait gravir les côtes à un oiseau qui
 * n'avait plus d'élan — exactement ce que Rémy décrit.
 *
 * À 40, une bosse peut arrêter : franchir 200 px demande √(2·430·200) ≈ 415 px/s,
 * et au-dessous on cale. Mesuré après : l'oiseau passe 3 à 14 % du temps
 * au-dessous de 100 px/s selon la façon de jouer — il est freiné pour de bon,
 * et c'est le battement d'ailes qui le repousse, doucement.
 *
 * PAS ZÉRO, ET C'EST MESURÉ AUSSI : à 0, toutes les façons de jouer s'arrêtent
 * net (99 % du temps sous 100 px/s, 115 px parcourus en une minute). Sans un
 * minimum, l'oiseau posé sur une pente ne redémarre jamais.
 */
/**
 * LE PLANCHER RESTE À QUARANTE, ET LA RÈGLE « ARRÊTÉ = PERDU » EST AILLEURS.
 *
 * RÉMY : « si l'oiseau s'arrête et bien on a perdu ». La tentation est de
 * descendre ce plancher à zéro pour que l'arrêt soit VRAI. On l'a fait, deux
 * fois, et mesuré les deux :
 *
 *   · à ZÉRO, le premier calage est définitif — l'oiseau posé sur une côte
 *     n'a plus aucune raison de bouger — et le bon joueur lui-même tombait
 *     de 485 à 27 px/s au sixième monde ;
 *   · à QUINZE, c'est encore trop peu : le bon joueur passait de 295 à 149
 *     px/s au cinquième monde et de 278 à 117 au sixième, où ne rien faire
 *     devenait MEILLEUR que bien jouer. Les trois mondes les plus raides
 *     cessaient d'être jouables, pour personne.
 *
 * Ce plancher porte donc les mondes à soixante degrés, et on le garde. La
 * règle de Rémy est une règle de JEU, pas une constante de physique : elle
 * vit dans `games/petitesAiles.js`, où ramper sous un seuil pendant plus
 * d'une seconde perd la partie. Et quarante pixels par seconde, à l'écran,
 * c'est un oiseau arrêté — un élève ne mesure pas, il regarde.
 */
/**
 * LES SIX PREMIERS MONDES MONTENT, LES SUIVANTS VARIENT.
 *
 * La difficulté ne peut pas monter indéfiniment : un relief plus haut et plus
 * serré RALENTIT l'oiseau, donc la nuit qu'il peut porter baisse avec lui, et
 * la pente butte sur la falaise à 65°. Au-delà du sixième, chaque monde a donc
 * son caractère sous les mêmes bornes, et c'est la PRESSION de la nuit qui
 * continue de serrer. Ce nombre est lu par l'épreuve ET par
 * `tools/allureDesMondes.mjs --nuits` : il n'a pas le droit de diverger.
 */
export const MONTEE = 6;

export const VX_MIN = 40;
export const VX_MAX = 900;

/**
 * ARRÊTÉ = PERDU, et les deux chiffres de la règle.
 *
 * RÉMY, le 17 novembre, en jouant : « si l'oiseau s'arrête et bien on a
 * perdu ». C'est une règle de JEU, pas une physique : elle s'applique dans
 * `games/petitesAiles.js`, qui termine la partie. Mais les deux nombres vivent
 * ici, pour que le harnais les mesure sur la même physique que le jeu.
 *
 * ILS NE SONT PAS CHOISIS, ILS SONT MESURÉS. Quatre façons de jouer, treize
 * mondes, trois paysages, soixante secondes : 39 parties par façon, et l'on
 * compte celles que la règle tuerait.
 *
 *   sous 70 px/s pendant …    bon joueur   rase le sol   ne fait rien   appuie sans arrêt
 *          1 s                 15/39          1/39          31/39            39/39
 *          2 s                 10/39          1/39          29/39            34/39
 *          3 s                  6/39          1/39          22/39            20/39
 *          4 s                  0/39          0/39           5/39            16/39
 *
 * QUATRE SECONDES EST LA PREMIÈRE LIGNE OÙ LE BON GESTE NE MEURT JAMAIS. Au-
 * dessous, la règle tue aussi celui qui joue bien — et une règle qui punit le
 * bon geste n'enseigne rien. Au-dessus, elle ne punit plus personne.
 *
 * `auSol` est dans la condition : un oiseau EN VOL n'est pas arrêté, même lent.
 * Sans cela, le sommet d'un beau saut — où la vitesse horizontale est au plus
 * bas — comptait comme un arrêt, c'est-à-dire que réussir le geste perdait la
 * partie.
 */
export const SEUIL_ARRET = 70;
export const DUREE_ARRET = 4;

/**
 * LE COMPTEUR D'ARRÊT : il monte tant que l'oiseau rampe au sol, et retombe à
 * zéro dès qu'il reprend. Une fonction pure, pour que l'épreuve puisse la
 * suivre image par image sans monter le jeu.
 */
export function suiviArret(compteur, etat, dt) {
    return etat.auSol && etat.vx < SEUIL_ARRET ? compteur + dt : 0;
}

/** Vrai quand le compteur a tenu assez longtemps pour perdre la partie. */
export const estArrete = (compteur) => compteur >= DUREE_ARRET;

/**
 * LA PESANTEUR DU GLISSÉ — celle qui change la hauteur en vitesse, et elle
 * n'est PAS celle de la chute.
 *
 * Rémy : « je trouve que le jeu petites ailes est beaucoup moins bien que Tiny
 * Wings, dans le glissé, dans les sauts ».
 *
 * On a mesuré avant de toucher quoi que ce soit, et les trois chiffres disaient
 * la même chose : le saut moyen durait QUATORZE CENTIÈMES DE SECONDE pour
 * soixante pixels — l'oiseau ne volait pas, il vibrait —, la vitesse touchait
 * son plancher dans TOUTES les parties, et « appuyer sans arrêt », qui ne
 * décolle jamais, battait le jeu parfait. Autrement dit : aucun élan ne se
 * conservait, et le plancher de vitesse faisait tout le travail.
 *
 * POURQUOI DEUX PESANTEURS. La chute d'un oiseau et la descente d'une pente ne
 * sont pas le même geste : l'un tombe, l'autre POUSSE — Tiny Wings ne fait pas
 * rouler une bille, il fait glisser un oiseau qui bat des ailes. Si l'on prend
 * la même valeur pour les deux, il faut choisir : une pesanteur de chute
 * correcte (1 500) rend les collines du sixième monde infranchissables — il
 * faudrait douze cents pixels par seconde pour remonter une bosse de 480 px —,
 * et une pesanteur qui les laisse franchir donne des sauts de lune. Deux
 * constantes, deux rôles, et chacune se règle pour ce qu'elle fait.
 *
 * Le rapport entre les deux valeurs — appuyer pèse un peu plus du double — est
 * le même en l'air et au sol : c'est LUI, l'asymétrie, qui fait tout le jeu.
 * Appuyer dans la descente gagne beaucoup, relâcher dans la montée perd peu.
 */
// ON A ESSAYÉ DE LA MONTER À 620 POUR QUE LA CÔTE COÛTE, ET C'ÉTAIT SE
// TROMPER DE COUPABLE. Le glissé CONSERVE l'énergie : ce que la montée prend,
// la descente le rend au pixel près — l'augmenter ne rend pas la côte plus
// chère, elle rend seulement les écarts plus violents. Mesuré : le bon joueur
// tombait de 598 à 240 px/s, et celui qui appuie sans arrêt restait planté à
// 2 px/s. Ce qui faisait « glisser en montée », c'était le BATTEMENT qui ne
// s'éteignait jamais et le PLANCHER de vitesse — les deux vrais coupables.
export const PESANTEUR_GLISSE = 430;
export const PESANTEUR_GLISSE_APPUI = 1200;

/**
 * LE FROTTEMENT — faible des deux côtés, et c'est capital.
 *
 * Au sol, il valait 0,55 par seconde : à sept cents pixels par seconde, cela
 * reprenait deux cent soixante-quinze pixels par seconde carrée, c'est-à-dire
 * la moitié de ce qu'une belle descente venait de donner. Il n'y avait pas de
 * glissé parce que le glissé était mangé à mesure. Un vingtième par seconde
 * suffit à empêcher la vitesse de partir à l'infini, et se paie en vols plus
 * longs : on l'a balayé de 0,04 à 0,10 en remesurant, et au-delà les vols
 * raccourcissent d'un dixième de seconde sans que rien ne s'améliore.
 *
 * En l'air il était déjà faible, et pour la même raison : un frottement d'air
 * fort rendait le vol PERDANT, et le bon joueur — celui qui décolle avant la
 * côte pour s'épargner le freinage de la montée — se retrouvait puni.
 */
export const FROTTEMENT_SOL = 0.05;
export const FROTTEMENT_APPUI = 0.45;
// L'AIR FREINE TROIS FOIS MOINS QU'AVANT, ET C'EST CE QUI REND LE VOL PAYANT.
//
// En allongeant les sauts pour Rémy — « il faut que les sauts soient plus
// spectaculaires » —, on a d'abord RALENTI le bon joueur : un vol long est du
// temps pendant lequel on n'accélère pas, et à 0,07 il perdait même de la
// vitesse en l'air. Mesuré : celui qui appuie sans arrêt, qui ne décolle
// jamais, le dépassait (462 contre 401 px/s). Un jeu où voler fait perdre
// n'apprend pas à voler.
export const FROTTEMENT_AIR = 0.07;

/**
 * LE BATTEMENT D'AILES — la seule vitesse qui ne se mérite pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « c'est un jeu, il faut que ça aille plus vite comme le jeu de base
 * car là l'oiseau est tjs collé et avance quoiqu'il arrive (il monte même
 * presque sans vitesse) ».
 *
 * MESURÉ, SOIXANTE SECONDES, QUATRE FAÇONS DE JOUER (tools/tmp/volAiles.mjs) :
 *
 *   · le joueur qui appuie au bon moment   : 614 px/s, 39 vols, 59 % au sol ;
 *   · celui qui appuie sans arrêt          : 280 px/s, ZÉRO vol, 100 % au sol ;
 *   · celui qui n'appuie jamais            : 210 px/s, ZÉRO vol, 100 % au sol ;
 *   · celui qui appuie au hasard           : 249 px/s, ZÉRO vol, 100 % au sol.
 *
 * Le jeu était donc magnifique POUR QUI CONNAISSAIT DÉJÀ LE TRUC, et pour tous
 * les autres un oiseau collé au sol qui rampe. Rémy décrit la seconde colonne,
 * et il la décrit exactement.
 *
 * POURQUOI. Décoller demande `-courbure · v² > g`, soit 285 px/s à la crête la
 * plus creuse du jeu : le joueur ordinaire plafonne à 280 et ne décolle JAMAIS.
 * Et comme le glissé conserve l'énergie, une colline rend exactement ce qu'elle
 * a pris : sans l'asymétrie de l'appui, aucune vitesse ne se fabrique. Il ne
 * restait que le plancher de vitesse pour avancer — d'où « avance quoiqu'il
 * arrive ».
 *
 * BAISSER LA PESANTEUR NE RÉPARE RIEN, et le balayage le dit : à g = 900 comme
 * à g = 800, le joueur ordinaire fait toujours zéro vol, et il RALENTIT.
 *
 * D'OÙ LE BATTEMENT. Un oiseau n'est pas une bille : il bat des ailes. Une
 * poussée constante au sol donne une vitesse de croisière à tout le monde —
 * l'équilibre avec le frottement se lit `v = POUSSEE / FROTTEMENT_SOL` —, sans
 * rien enlever au reste : la montée coûte toujours son énergie, la descente la
 * rend toujours, et l'appui au bon moment rapporte toujours autant. Le sol
 * monte le plancher ; il ne remplace pas le talent.
 *
 * DEUX CENT SOIXANTE, ET CE CHIFFRE A ÉTÉ PAYÉ PAR UNE TRACE. Il valait
 * quarante, et à quarante l'oiseau RAMPAIT : mesuré image par image dans le
 * premier monde, il retombait d'un vol de 189 px sur un flanc qui monte, la
 * projection à l'atterrissage lui laissait 147 px/s, et il remontait toute la
 * côte COLLÉ À SON PLANCHER DE VITESSE pendant HUIT SECONDES. Un tiers du
 * temps de jeu se passait sous 70 px/s. C'est cela que Rémy voyait quand il a
 * dit « si l'oiseau s'arrête » — il ne demandait pas une règle, il signalait
 * un défaut.
 *
 * LA CAUSE N'EST PAS LE PLANCHER, C'EST LE BATTEMENT. Franchir une bosse de
 * 200 px demande √(2 · 430 · 200) ≈ 415 px/s ; au-dessous on cale, et il faut
 * alors que les ailes puissent faire le reste du chemin. À 40 px/s² elles n'y
 * arrivaient pas : la côte reprenait l'élan plus vite que le battement ne le
 * rendait. À 260 px/s², le battement et la pesanteur du flanc le plus raide
 * s'équilibrent presque — l'oiseau grimpe, lentement, ce qui est exactement ce
 * qu'on veut voir.
 *
 * MESURÉ SUR LES TREIZE MONDES, plus long rampement sous 70 px/s du bon
 * joueur : 8,8 s à 40 ; 5,0 s à 150 ; 3,5 s à 200 ; ZÉRO à 260. Et celui qui
 * appuie sans arrêt rampe toujours 8,4 s — la faute, elle, continue de coûter.
 */
export const POUSSEE = 450;
/** De combien le battement s’éteint dans une côte. 0 = il ne s’éteint pas. */
export const FREIN_MONTEE = 0;

/**
 * LA VITESSE OÙ LE BATTEMENT S'ÉTEINT — voir son emploi dans `pas`.
 *
 * C'est la vitesse de croisière de qui ne fait rien, et donc le plancher du
 * jeu. Au-dessus, il faut plonger dans les descentes ; au-dessous, les ailes
 * remettent l'oiseau en route toutes seules.
 */
export const VITESSE_BATTEMENT = 300;

/** Le coup d'ailes qui lance le saut. Voir son emploi dans `pas`. */
export const IMPULSION_DECOLLAGE = 200;

/**
 * CE QU'IL RESTE DE LA VITESSE À L'ATTERRISSAGE — et ce n'est plus un forfait.
 *
 * L'ancienne règle était en deux morceaux cousus à la main : retomber dans une
 * descente ajoutait « au plus 260 », retomber dans une montée coûtait QUARANTE
 * POUR CENT d'un coup. Le second est une punition d'arcade, pas une physique :
 * il frappait aussi bien l'oiseau qui effleure une pente de rien que celui qui
 * s'écrase dans un mur, et il coûtait quarante pour cent même en retombant à
 * plat.
 *
 * La vraie règle tient en une projection. À l'atterrissage, ce qui rentre dans
 * le sol est perdu, ce qui va LE LONG du sol est gardé :
 *
 *     vx ← (vx + vy·pente) / (1 + pente²)
 *
 * Elle dit tout, et toute seule : à plat, on ne perd rien ; sur une descente,
 * la chute se convertit en avance — c'est la récompense du bon moment, et elle
 * n'a plus besoin d'être plafonnée à la main ; sur une montée, on perd d'autant
 * plus qu'on tombe vite et que la pente est raide. Se planter dans une côte
 * casse ; poser l'aile sur une descente lance.
 *
 * ON EN GARDE TROIS CINQUIÈMES, ET C'EST UN QUART QUI A ÉTÉ MESURÉ TROP DUR.
 *
 * Un quart suffisait quand les sauts duraient quatorze centièmes de seconde.
 * Depuis qu'ils montent à 150 px et durent huit dixièmes — Rémy : « il faut
 * que les sauts soient plus spectaculaires » —, ils DÉPASSENT le creux et
 * retombent sur le flanc qui monte : un atterrissage sur trois, et le quart ne
 * laissait alors plus rien. Mesuré, plus long rampement sous 70 px/s du bon
 * joueur : 8,8 s à 0,25 ; 7,3 s à 0,6 ; 6,4 s à 0,8. Un saut spectaculaire ne
 * doit pas être un piège — sinon le geste qu'on vient d'apprendre se paie.
 */
export const REBOND_ATTERRISSAGE = 0.6;

/**
 * Le monde n'est plus un paramètre du PAS : le sol est une fonction de `x`
 * seul, et c'est ce qui a supprimé la falaise des frontières. Ce qui reste du
 * monde — la palette, la vitesse de la nuit — ne concerne pas la physique.
 */
export function pas(etat, dt, appuie, graine) {
    const x = etat.x + etat.vx * dt;
    const avant = relief(etat.x, graine);
    const sol = relief(x, graine);
    const g = appuie ? GRAVITE_PLONGEE : GRAVITE;
    let { y, vy, vx, auSol } = etat;

    if (auSol) {
        // LE GLISSÉ SE CALCULE EN ÉNERGIE, PAS EN ACCÉLÉRATION PROJETÉE.
        //
        // L'ancienne ligne — `vx += -pente · g · dt` — a l'air juste et ne
        // l'est pas : elle applique l'accélération à la vitesse HORIZONTALE,
        // et surtout, comme on passe plus de temps à monter (on y est lent)
        // qu'à descendre (on y est vite), l'aller-retour sur une colline
        // rendait MOINS qu'il n'avait pris. Une bosse était un impôt. À
        // vingt bosses par monde, il ne restait rien de l'élan — et l'oiseau
        // vivait sur son plancher de vitesse.
        //
        // La conservation de l'énergie règle cela EXACTEMENT, et sans dépendre
        // du pas de temps : ½v² + g·h ne bouge pas, donc ce que la montée
        // prend, la descente le rend au pixel près. Ce qui reste alors comme
        // seule source de vitesse, c'est l'ASYMÉTRIE de l'appui — et c'est
        // précisément le geste qu'on veut apprendre à l'élève.
        const p = appuie ? PESANTEUR_GLISSE_APPUI : PESANTEUR_GLISSE;
        const q0 = Math.hypot(1, avant.pente);
        const q1 = Math.hypot(1, sol.pente);
        const v0 = vx * q0;                             // la vitesse LE LONG du sol
        const v2 = v0 * v0 - 2 * p * (sol.hauteur - avant.hauteur);
        let v = v2 > 0 ? Math.sqrt(v2) : 0;
        // LE BATTEMENT D'AILES, puis le frottement. Voir `POUSSEE` : c'est la
        // seule vitesse qui ne demande pas de jouer juste, et c'est elle qui
        // décolle le joueur ordinaire du sol.
        // LE BATTEMENT NE GRAVIT PAS — Rémy, en jouant : « là même en montée
        // ça continue à glisser ». Et il avait raison au pixel près : mesuré
        // avant de toucher quoi que ce soit, le joueur qui appuie sans arrêt
        // tenait 462 px/s en montée contre 514 en descente. La côte ne coûtait
        // presque rien, parce que le battement la payait à sa place.
        //
        // Un oiseau bat des ailes pour AVANCER, pas pour escalader. La poussée
        // s'éteint donc avec la pente, et elle est nulle au-delà de 31° — là
        // où il faut vraiment de l'élan, et rien d'autre.
        const grimpe = Math.max(0, Math.min(1, sol.pente / 0.9));
        // ── LE BATTEMENT S'ÉTEINT AVEC LA VITESSE ───────────────────────────
        //
        // RÉMY : « clairement aux petites ailes, je ne peux pas perdre même si
        // je ne fais rien ». Mesuré : la nuit mettait de 89 à 205 secondes à
        // rattraper quelqu'un qui ne touche à rien.
        //
        // LA CAUSE N'ÉTAIT NI LA NUIT NI LE RELIEF, C'ÉTAIT CE BATTEMENT. À
        // poussée constante, l'oiseau qu'on abandonne CROISE : il se stabilise
        // là où le battement équilibre le frottement, et cette vitesse-là ne
        // demande aucun geste. Mesuré sur les treize mondes, le rapport entre
        // bien jouer et ne rien faire ne dépassait jamais 1,25 — et une nuit
        // assez rapide pour rattraper celui qui ne fait rien rattrapait aussi
        // celui qui joue imparfaitement, c'est-à-dire tous les élèves.
        //
        // BAISSER LA POUSSÉE NE RÉPARAIT PAS : le balayage le dit, de 200 à 40
        // le rapport reste entre 1,14 et 1,24, et les rampements reviennent
        // (3,5 s à 200, 7,6 s à 40).
        //
        // UN OISEAU BAT DES AILES POUR DÉMARRER, PAS POUR CROISER. Le battement
        // vaut donc tout quand l'oiseau est arrêté — c'est ce qui le sort d'une
        // côte où il a calé — et plus rien passé `VITESSE_BATTEMENT`. Celui qui
        // ne fait rien se stabilise alors à cette vitesse-là ; celui qui plonge
        // dans les descentes la dépasse largement. L'écart redevient un écart.
        const elan = Math.max(0, 1 - v / VITESSE_BATTEMENT);
        v += POUSSEE * elan * (1 - FREIN_MONTEE * grimpe) * dt;
        // ET SE PLAQUER AU SOL FROTTE — c'est l'asymétrie qui manquait.
        //
        // Appuyer change la pesanteur du glissé, donc la vitesse qu'on perd en
        // montant et celle qu'on gagne en descendant. Mais l'énergie se
        // conserve : sur une colline entière, appuyer TOUT LE TEMPS revient
        // exactement au même que ne jamais appuyer. Mesuré : celui qui appuie
        // sans arrêt faisait 462 px/s contre 341 au bon joueur — il n'était
        // puni de rien.
        //
        // Un oiseau qui plonge se plaque et frotte. Appuyer coûte donc, à
        // chaque instant où l'on appuie ; et comme on n'appuie qu'en descente
        // quand on joue bien, cela ne coûte que là où l'on gagne beaucoup.
        // ET IL NE FROTTE QU'EN MONTÉE. Plonger dans une descente, c'est
        // épouser la pente — rien ne s'y oppose. Plonger dans une CÔTE, c'est
        // se jeter contre elle. Mesuré sans cette distinction : celui qui
        // n'appuie jamais sautait plus haut et allait aussi vite que le bon
        // joueur, parce que l'appui coûtait partout. Ici il ne coûte QUE là où
        // le bon joueur n'appuie pas — et c'est tout le geste du jeu.
        const colle = appuie && sol.pente > 0 ? FROTTEMENT_APPUI : 0;
        v -= v * (FROTTEMENT_SOL + colle) * dt;
        vx = v / q1;
        y = sol.hauteur;
        vy = sol.pente * vx;
        // ON DÉCOLLE AU SOMMET D'UNE BOSSE, ET LA CONDITION EST CELLE DE LA
        // PHYSIQUE, PAS UNE RECETTE. Suivre le sol demande une accélération
        // vers le bas de v² fois la COURBURE du terrain ; si la gravité ne
        // fournit pas autant, le sol se dérobe et l'oiseau part tout droit.
        //
        // La première version testait « la pente monte assez » : elle faisait
        // décoller sur les côtes, jamais sur les crêtes, et l'oiseau restait
        // collé au sol quatre-vingt-dix-huit pour cent du temps. C'est en
        // écrivant la vraie condition — celle qui demande la dérivée SECONDE —
        // que le jeu s'est mis à ressembler à Tiny Wings.
        //
        // C'est bien la pesanteur de CHUTE qu'on compare ici, pas celle du
        // glissé : décoller, c'est quitter le sol, donc entrer dans l'autre
        // régime. Et plus on va vite, plus on décolle TÔT — sur le flanc qui
        // monte encore, là où la pente donne une vraie vitesse verticale. C'est
        // ce qui fait la différence entre un saut et un sursaut.
        if (!appuie && quitteLeSol(sol.courbure, vx, g)) {
            auSol = false;
            // LE COUP D'AILES DU DÉCOLLAGE — Rémy : « il faut que les sauts
            // soient plus spectaculaires ».
            //
            // La hauteur d'un saut vaut vy² ÷ 2g, et vy vient de la pente de
            // la crête : dans le premier monde, où les bosses sont douces, le
            // bon joueur ne montait qu'à 60 px — moins haut que le relief
            // lui-même, c'est-à-dire invisible. Un oiseau ne se contente pas
            // d'être éjecté par une bosse : il DONNE un coup d'ailes. Celui-ci
            // double la hauteur du saut sans rien changer au reste, puisqu'il
            // n'agit qu'à l'instant du décollage, et seulement si l'on a su le
            // provoquer en relâchant avant la crête.
            vy += IMPULSION_DECOLLAGE;
        }
    } else {
        // LE DEMI-PAS DE LA CHUTE N'EST PAS UN DÉTAIL — c'est lui qui faisait
        // vibrer l'oiseau. On écrivait `vy -= g·dt` puis `y += vy·dt`, ce qui
        // retranche g·dt² à l'altitude quand la balistique exacte n'en retranche
        // que la MOITIÉ. Or le sol, lui, s'éloigne d'un demi courbure·v²·dt² :
        // la comparaison réelle devenait donc « courbure·v² > 2g » alors que
        // `quitteLeSol` annonce « > g ». Entre les deux, l'oiseau décollait et
        // se reposait dans la même image, cent trente fois en quarante secondes
        // — des « sauts » de six centièmes de seconde et de trois pixels.
        //
        // Avec la vitesse MOYENNE du pas, le décollage annoncé et le décollage
        // obtenu sont enfin le même.
        y += (vy - g * dt / 2) * dt;
        vy -= g * dt;
        // ON NE POUSSE PAS EN VOL, ET C'EST UNE MESURE QUI L'A TRANCHÉ.
        //
        // On y avait mis un battement d'ailes « réservé à qui ne plonge pas »,
        // pour qu'un long vol rapporte. L'intention était juste, l'effet
        // inverse : le bon joueur APPUIE dans la descente, donc il en était
        // exclu, et celui qui ne touche à rien le recevait tout le vol. On
        // payait l'immobilité. Mesuré sur les treize mondes, nombre de mondes
        // où ne rien faire vaut bien jouer : 3 à 60 px/s², 5 à 120, 6 à 180,
        // et UN SEUL à zéro. Le même battement donné à TOUT LE MONDE en
        // ramenait cinq : il noie l'écart au lieu de le creuser.
        //
        // Ce qui rend le saut payant n'a donc pas besoin d'être ajouté : c'est
        // la projection à l'atterrissage, plus bas, qui change la chute en
        // avance — et elle ne récompense que le vol qu'on a su placer.
        vx -= vx * FROTTEMENT_AIR * dt;
        if (y <= sol.hauteur) {
            y = sol.hauteur;
            auSol = true;
            // CE QUI RENTRE DANS LE SOL EST PERDU, CE QUI VA LE LONG DU SOL EST
            // GARDÉ : la projection sur la tangente, et rien d'autre. Voir
            // `REBOND_ATTERRISSAGE` — elle récompense la descente, ne coûte
            // rien à plat, et casse dans la côte, toute seule.
            const p = sol.pente;
            const glisse = (vx + vy * p) / (1 + p * p);
            vx = Math.max(glisse, vx * REBOND_ATTERRISSAGE);
            vy = p * vx;
        }
    }
    vx = Math.max(VX_MIN, Math.min(VX_MAX, vx));
    return { x, y, vx, vy, auSol };
}

/** L'état de départ : posé au sol, à vitesse de croisière. */
/**
 * L'état de départ : posé au sol, à vitesse de croisière.
 *
 * `x0` sert aux tests : le terrain étant maintenant une fonction de l'abscisse
 * ABSOLUE, éprouver le troisième monde demande d'y partir vraiment, pas de
 * passer son descripteur à une fonction qui ne le regarde plus.
 */
export const etatInitial = (graine, x0 = 0) => ({
    // ON PART À LA VITESSE DE CROISIÈRE, pas au ralenti. À 190, les premières
    // secondes se passaient sous la vitesse de décollage (285 px/s à la crête
    // la plus creuse) : le jeu s'ouvrait donc sur ce qu'on lui reproche —
    // un oiseau collé au sol. 320 est au-dessus, et c'est l'équilibre que le
    // battement d'ailes tient de toute façon sur le plat.
    x: x0, y: relief(x0, graine).hauteur, vx: 320, vy: 0, auSol: true
});

/**
 * DE QUOI JUGER UNE PARTIE.
 *
 * Le monde atteint passe devant la distance : c'est lui qu'on raconte à son
 * voisin. Les points suivent la même hiérarchie — un monde franchi vaut plus
 * que dix étoiles ramassées.
 */
export const POINTS_MONDE = 40;
export const POINTS_ETOILE = 3;

export function qualiteAiles(distance, monde, etoiles) {
    return {
        distance: Math.round(distance),
        monde, etoiles,
        points: Math.max(1, (monde - 1) * POINTS_MONDE + etoiles * POINTS_ETOILE
            + Math.round(distance / 40))
    };
}
