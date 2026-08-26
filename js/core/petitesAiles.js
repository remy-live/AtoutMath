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
export const LONGUEUR_MONDE = 3200;

export const MONDES = [
    {
        id: 1, nom: 'Les dunes', amplitude: 105, periode: 620, nuit: 150,
        // Les collines du fond sont du SABLE, pas du bleu : ce sont les mêmes
        // dunes vues de loin, et une couche bleue au milieu du désert se lisait
        // comme une flaque.
        ciel: ['#9fd8ff', '#e8f6ff'], fond: ['#e6c390', '#d3a96d'],
        sol: '#c99a52', herbe: '#f0c987'
    },
    {
        id: 2, nom: 'Les collines', amplitude: 140, periode: 540, nuit: 175,
        ciel: ['#8ed0ff', '#dff3ff'], fond: ['#a9c8e8', '#87b0d8'],
        sol: '#2f855a', herbe: '#68d391'
    },
    {
        id: 3, nom: 'Les crêtes', amplitude: 170, periode: 470, nuit: 200,
        ciel: ['#ffc98a', '#ffe9cf'], fond: ['#e0a98a', '#c98a72'],
        sol: '#7b4b2a', herbe: '#c0703c'
    },
    {
        id: 4, nom: 'La montagne', amplitude: 200, periode: 410, nuit: 222,
        ciel: ['#b9a7ff', '#e9e2ff'], fond: ['#a99ad8', '#8878c0'],
        sol: '#4a5578', herbe: '#e6ecff'
    },
    {
        id: 5, nom: 'Le grand large', amplitude: 220, periode: 400, nuit: 235,
        ciel: ['#63c7c0', '#d6f5f2'], fond: ['#7fbfc4', '#5d9aa4'],
        sol: '#1f6b6b', herbe: '#7fe6d8'
    },
    {
        id: 6, nom: 'Le pays de nuit', amplitude: 240, periode: 380, nuit: 248,
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
 * LE RELIEF EN UN POINT, ET SA PENTE.
 *
 * `hauteur` est une altitude EN PIXELS au-dessus du fond, `pente` sa dérivée —
 * donc un nombre sans unité, celui qu'on peut projeter sur la gravité. Les deux
 * sont calculées à la main plutôt que par différence de deux points : une pente
 * approchée fait vibrer la vitesse quand l'oiseau glisse, et le jeu devient
 * nerveux sans qu'on sache pourquoi.
 *
 * Trois ondes de périodes premières entre elles : le motif ne se répète qu'au
 * bout de plusieurs kilomètres, ce qu'aucune partie n'atteint.
 */
export function relief(x, monde, graine = 0) {
    const z = monde || MONDES[0];
    const p = z.periode;
    const ondes = [
        { a: 1, p, d: graine },
        { a: 0.42, p: p / 2.13, d: graine * 1.7 + 1.1 },
        { a: 0.19, p: p / 4.31, d: graine * 2.9 + 2.3 }
    ];
    let h = 0, dh = 0, d2h = 0;
    for (const o of ondes) {
        const w = (2 * Math.PI) / o.p;
        h += o.a * Math.sin(w * x + o.d);
        dh += o.a * w * Math.cos(w * x + o.d);
        d2h -= o.a * w * w * Math.sin(w * x + o.d);
    }
    // La somme des amplitudes vaut 1 + 0,42 + 0,19 : on ramène le tout à
    // l'amplitude voulue, en pixels.
    const k = z.amplitude / 1.61;
    return { hauteur: SOL_MOYEN + k * h, pente: k * dh, courbure: k * d2h };
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

export function semerEtoile(x, monde, graine, rng) {
    const sol = relief(x, monde, graine);
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

export const GRAVITE = 1500;
export const GRAVITE_PLONGEE = 3400;
export const VX_MIN = 130;
export const VX_MAX = 620;
/**
 * LE FROTTEMENT DE L'AIR — faible, et c'est capital.
 *
 * TOUT LE JEU TIENT DANS UNE ASYMÉTRIE. Appuyer, c'est peser : on gagne
 * beaucoup dans une descente et l'on freine beaucoup dans une montée. Le bon
 * joueur appuie en descendant, relâche en montant, et surtout DÉCOLLE avant la
 * côte — il encaisse le gain et s'épargne le freinage. C'est là que la vitesse
 * se fabrique, nulle part ailleurs.
 *
 * Deux réglages ont donc été refaits après mesure. Un frottement d'air fort
 * rendait le vol perdant, et « appuyer sans arrêt » — qui ne décolle jamais —
 * battait le jeu parfait. Un plafond de vitesse trop haut, lui, écrasait toutes
 * les différences : sur les reliefs escarpés, ne rien faire valait presque
 * autant que bien jouer. On mesure, on corrige, on remesure.
 */
export const FROTTEMENT_AIR = 0.07;

export function pas(etat, dt, appuie, monde, graine) {
    const x = etat.x + etat.vx * dt;
    const sol = relief(x, monde, graine);
    const g = appuie ? GRAVITE_PLONGEE : GRAVITE;
    let { y, vy, vx, auSol } = etat;

    if (auSol) {
        // La gravité projetée sur la pente : descendre accélère, monter freine.
        // La pente est sans unité, la gravité en pixels par seconde carrée : le
        // produit est bien une accélération.
        vx += -sol.pente * g * dt;
        // Un frottement, sinon la vitesse part à l'infini au bout de trois
        // descentes et le jeu devient injouable.
        vx -= vx * 0.55 * dt;
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
        if (!appuie && quitteLeSol(sol.courbure, vx, g)) auSol = false;
    } else {
        vy -= g * dt;
        y += vy * dt;
        vx -= vx * FROTTEMENT_AIR * dt;
        if (y <= sol.hauteur) {
            y = sol.hauteur;
            auSol = true;
            // À L'ATTERRISSAGE DANS UNE DESCENTE, une partie de la chute se
            // convertit en avance : c'est ce qui récompense le bon moment, et
            // c'est tout le jeu. Retomber sur une montée, au contraire, casse.
            if (sol.pente < 0) vx += Math.min(260, -vy * (-sol.pente) * 0.75);
            else vx *= 0.6;
        }
    }
    vx = Math.max(VX_MIN, Math.min(VX_MAX, vx));
    return { x, y, vx, vy, auSol };
}

/** L'état de départ : posé au sol, à vitesse de croisière. */
export const etatInitial = (monde, graine) => ({
    x: 0, y: relief(0, monde, graine).hauteur, vx: 190, vy: 0, auSol: true
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
