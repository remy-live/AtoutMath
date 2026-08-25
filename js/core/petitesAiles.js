// LES PETITES AILES — glisser sur les collines, et n'avaler que ce qu'il faut.
//
// Rémy : « J'adorerai le jeu Tiny Wings sur iPhone. »
//
// CE QUI FAIT TINY WINGS, ce n'est ni le graphisme ni l'oiseau : c'est UNE
// TOUCHE et une idée. On appuie pour plonger, on relâche pour planer ; plonger
// dans une descente donne de la vitesse, et cette vitesse renvoie en l'air au
// creux suivant. Tout le plaisir est là — sentir le moment où il faut appuyer.
// On garde donc exactement cela, et rien d'autre.
//
// ET IL FALLAIT QUE CE SOIT DES MATHS SANS CASSER LE GESTE. Poser une question
// au clavier arrêterait le vol : c'est un jeu à une seule touche, il doit le
// rester. Alors la question est DANS le décor — des nombres flottent au-dessus
// des collines, une règle est annoncée (« les multiples de 7 »), et l'on avale
// ceux qui la vérifient. Décider en une fraction de seconde si 63 est un
// multiple de 7 est exactement l'automatisme qu'on veut installer ; c'est la
// même mécanique que les portes de calcul de Nova, mais sans jamais lever le
// pouce.
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

export const ZONES = [
    { id: 1, nom: 'Les dunes', amplitude: 105, periode: 620, cadeaux: 0.9 },
    { id: 2, nom: 'Les collines', amplitude: 140, periode: 540, cadeaux: 1 },
    { id: 3, nom: 'Les crêtes', amplitude: 170, periode: 470, cadeaux: 1.1 },
    { id: 4, nom: 'La montagne', amplitude: 200, periode: 410, cadeaux: 1.2 }
];

export const zoneDe = (distance) =>
    ZONES[Math.min(ZONES.length - 1, Math.floor(distance / 3000))];


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
export function relief(x, zone, graine = 0) {
    const z = zone || ZONES[0];
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
 * LES RÈGLES DU MOMENT — ce qu'il faut avaler, et ce qu'il faut éviter.
 *
 * Chacune sait dire d'un nombre s'il convient, et surtout POURQUOI il ne
 * convient pas : un jeu d'arcade qui se contente de faire perdre n'apprend
 * rien. La phrase courte est celle qui s'affiche en vol ; l'explication ne sert
 * qu'au moment où l'on rate.
 */
export const REGLES = [
    {
        id: 'multiples', titre: (n) => `les multiples de ${n}`,
        parametres: [3, 4, 6, 7, 8, 9],
        convient: (v, n) => v % n === 0,
        pourquoi: (v, n) => `${v} n'est pas un multiple de ${n} : ${n} × ${Math.floor(v / n)} `
            + `= ${n * Math.floor(v / n)}, et il reste ${v % n}.`,
        tirer: (rng, n) => (rng.bool(0.5)
            ? n * rng.int(2, 12)
            : n * rng.int(2, 12) + rng.pick([-2, -1, 1, 2].filter(d => d % n !== 0)))
    },
    {
        id: 'pairs', titre: () => 'les nombres PAIRS',
        parametres: [0],
        convient: (v) => v % 2 === 0,
        pourquoi: (v) => `${v} est impair : il se termine par ${v % 10}, et un nombre pair `
            + 'se termine par 0, 2, 4, 6 ou 8.',
        tirer: (rng) => rng.int(10, 99)
    },
    {
        id: 'plusGrand', titre: (n) => `les nombres plus grands que ${n}`,
        parametres: [40, 50, 60, 100],
        convient: (v, n) => v > n,
        pourquoi: (v, n) => `${v} n'est pas plus grand que ${n}.`,
        tirer: (rng, n) => rng.int(Math.max(1, n - 30), n + 30)
    },
    {
        id: 'carres', titre: () => 'les carrés parfaits',
        parametres: [0],
        convient: (v) => Number.isInteger(Math.sqrt(v)),
        pourquoi: (v) => {
            const r = Math.floor(Math.sqrt(v));
            return `${v} n'est le carré de personne : ${r} × ${r} = ${r * r} et `
                + `${r + 1} × ${r + 1} = ${(r + 1) * (r + 1)}.`;
        },
        tirer: (rng) => (rng.bool(0.5)
            ? rng.int(2, 12) ** 2
            : rng.int(2, 12) ** 2 + rng.pick([-3, -2, -1, 1, 2, 3]))
    },
    {
        id: 'diviseurs', titre: (n) => `les diviseurs de ${n}`,
        parametres: [24, 36, 48, 60],
        convient: (v, n) => v > 0 && n % v === 0,
        pourquoi: (v, n) => `${n} ne se divise pas par ${v} : il reste ${n % v}.`,
        tirer: (rng, n) => {
            const vrais = [];
            for (let d = 2; d <= n; d++) if (n % d === 0) vrais.push(d);
            return rng.bool(0.5) ? rng.pick(vrais) : rng.int(2, Math.min(n, 30));
        }
    }
];

export const regleDe = (id) => REGLES.find(r => r.id === id) || REGLES[0];

/** Une consigne tirée au sort : la règle, son paramètre, et sa phrase. */
export function tirerConsigne(rng, exclure = null) {
    const choix = REGLES.filter(r => r.id !== exclure);
    const r = rng.pick(choix.length ? choix : REGLES);
    const n = rng.pick(r.parametres);
    return { id: r.id, n, titre: r.titre(n) };
}

/** Le nombre convient-il à la consigne ? */
export const convient = (consigne, valeur) =>
    regleDe(consigne.id).convient(valeur, consigne.n);

/** Pourquoi il ne convenait pas — la phrase qu'on lit après avoir raté. */
export const pourquoiPas = (consigne, valeur) =>
    regleDe(consigne.id).pourquoi(valeur, consigne.n);

/**
 * UNE VOLÉE DE NOMBRES, dont on garantit qu'elle en contient des bons.
 *
 * Une volée sans aucun bon nombre est une punition : le joueur ne peut rien
 * marquer et croit qu'il joue mal. On en impose donc au moins un tiers.
 */
export function tirerVolee(rng, consigne, combien) {
    const r = regleDe(consigne.id);
    const nombres = [];
    let garde = 0;
    while (nombres.length < combien && garde++ < combien * 40) {
        const v = r.tirer(rng, consigne.n);
        if (v === null || v === undefined || v < 0) continue;
        nombres.push(v);
    }
    // On force le quota de bons nombres en remplaçant ceux qui manquent.
    const voulus = Math.max(1, Math.ceil(combien / 3));
    let bons = nombres.filter(v => r.convient(v, consigne.n)).length;
    for (let i = 0; i < nombres.length && bons < voulus; i++) {
        if (r.convient(nombres[i], consigne.n)) continue;
        for (let essai = 0; essai < 60; essai++) {
            const v = r.tirer(rng, consigne.n);
            if (r.convient(v, consigne.n)) { nombres[i] = v; bons++; break; }
        }
    }
    return nombres;
}

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

export function pas(etat, dt, appuie, zone, graine) {
    const x = etat.x + etat.vx * dt;
    const sol = relief(x, zone, graine);
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
export const etatInitial = (zone, graine) => ({
    x: 0, y: relief(0, zone, graine).hauteur, vx: 190, vy: 0, auSol: true
});

/** De quoi juger une partie. */
export function qualiteAiles(distance, bons, rates) {
    const total = bons + rates;
    return {
        distance: Math.round(distance),
        bons, rates,
        taux: total ? Math.round((bons / total) * 100) : 100
    };
}
