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
 * changé de monde » alors qu'on file à cinq cents pixels par seconde.
 *
 * LES SIX VITESSES DE NUIT SONT MESURÉES, PAS DEVINÉES. Le test simule les
 * trois joueurs — celui qui plonge à propos, celui qui ne fait rien, celui qui
 * appuie sans arrêt — et vérifie que la nuit reste derrière le premier partout,
 * et finit par rattraper le deuxième. Le premier monde, lui, pardonne : on y
 * apprend le geste, on n'y perd pas.
 */
export const LONGUEUR_MONDE = 6400;

export const MONDES = [
    {
        id: 1, nom: 'Les dunes', amplitude: 95, periode: 900, nuit: 150,
        // Les collines du fond sont du SABLE, pas du bleu : ce sont les mêmes
        // dunes vues de loin, et une couche bleue au milieu du désert se lisait
        // comme une flaque.
        ciel: ['#9fd8ff', '#e8f6ff'], fond: ['#e6c390', '#d3a96d'],
        sol: '#c99a52', herbe: '#f0c987'
    },
    {
        id: 2, nom: 'Les collines', amplitude: 118, periode: 870, nuit: 175,
        ciel: ['#8ed0ff', '#dff3ff'], fond: ['#a9c8e8', '#87b0d8'],
        sol: '#2f855a', herbe: '#68d391'
    },
    {
        id: 3, nom: 'Les crêtes', amplitude: 140, periode: 840, nuit: 200,
        ciel: ['#ffc98a', '#ffe9cf'], fond: ['#e0a98a', '#c98a72'],
        sol: '#7b4b2a', herbe: '#c0703c'
    },
    {
        id: 4, nom: 'La montagne', amplitude: 162, periode: 820, nuit: 222,
        ciel: ['#b9a7ff', '#e9e2ff'], fond: ['#a99ad8', '#8878c0'],
        sol: '#4a5578', herbe: '#e6ecff'
    },
    {
        id: 5, nom: 'Le grand large', amplitude: 180, periode: 800, nuit: 235,
        ciel: ['#63c7c0', '#d6f5f2'], fond: ['#7fbfc4', '#5d9aa4'],
        sol: '#1f6b6b', herbe: '#7fe6d8'
    },
    {
        id: 6, nom: 'Le pays de nuit', amplitude: 198, periode: 790, nuit: 248,
        ciel: ['#2d3561', '#5a6bad'], fond: ['#3f4a80', '#2b3358'],
        sol: '#1b2140', herbe: '#8f9bff'
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

const pulsation = (m) => (2 * Math.PI) / m.periode;
const adoucir = (t) => t * t * t * (t * (6 * t - 15) + 10);
const adoucir1 = (t) => 30 * t * t * (t - 1) * (t - 1);
const adoucir2 = (t) => 60 * t * (t - 1) * (2 * t - 1);
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
    const { m, suivant, t } = raccord(x);
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
    return {
        hauteur: SOL_MOYEN + k * H,
        pente: k1 * H + k * H1,
        courbure: k2 * H + 2 * k1 * H1 + k * H2
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
export const GRAVITE = 1300;
export const GRAVITE_PLONGEE = 2950;
export const VX_MIN = 130;
export const VX_MAX = 900;

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
export const PESANTEUR_GLISSE = 430;
export const PESANTEUR_GLISSE_APPUI = 980;

/**
 * LE FROTTEMENT — faible des deux côtés, et c'est capital.
 *
 * Au sol, il valait 0,55 par seconde : à cinq cents pixels par seconde, cela
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
export const FROTTEMENT_AIR = 0.07;

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
 * On en garde tout de même un quart de l'ancienne vitesse : un atterrissage
 * raté doit coûter cher, pas mettre à l'arrêt.
 */
export const REBOND_ATTERRISSAGE = 0.25;

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
        v -= v * FROTTEMENT_SOL * dt;
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
        if (!appuie && quitteLeSol(sol.courbure, vx, g)) auSol = false;
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
    x: x0, y: relief(x0, graine).hauteur, vx: 190, vy: 0, auSol: true
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
