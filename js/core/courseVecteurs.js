// LA COURSE DE VECTEURS — « Vector Racer », le jeu de course sur papier
// quadrillé, demandé par Rémy.
//
// LA RÈGLE TIENT EN UNE PHRASE, et c'est ce qui en fait un bon jeu de classe :
// la voiture garde sa vitesse d'un tour sur l'autre, et l'on ne choisit que
// comment la CHANGER — d'une case au plus, en x comme en y. Neuf choix par
// tour, pas un de plus.
//
// Ce qu'on apprend en y jouant, aucune leçon ne le donne aussi vite :
//
//   • un vecteur, c'est un déplacement : deux nombres, pas un point ;
//   • on ADDITIONNE les vecteurs — position + vitesse, vitesse + accélération ;
//   • une vitesse ne s'arrête pas parce qu'on lâche la touche : il faut
//     freiner AVANT le virage, donc anticiper ;
//   • les nombres relatifs servent à quelque chose : aller à gauche, c'est
//     vx négatif, et « accélérer de −1 » quand on recule, c'est aller plus
//     vite.
//
// LE PLATEAU. Une piste dessinée sur la grille : `#` hors-piste, `.` piste,
// `D` la zone de départ, `A` la ligne d'arrivée. Les pistes sont écrites à la
// main plutôt que tirées au sort — un circuit doit être BEAU et jouable, et
// les tests vérifient qu'un chemin existe vraiment sur chacun.
//
// LA SORTIE DE PISTE. Le trajet d'un tour est un SEGMENT, pas un saut : à 4
// cases par tour, on traverse quatre cases, et il suffit qu'une seule soit
// hors-piste pour sortir. C'est ce qui rend les grandes vitesses dangereuses,
// et donc intéressantes.
//
// Module pur : ni DOM, ni hasard propre.

/** Les neuf façons de changer sa vitesse : −1, 0 ou +1 sur chaque axe. */
export const ACCELERATIONS = [];
for (let ay = -1; ay <= 1; ay++) for (let ax = -1; ax <= 1; ax++) ACCELERATIONS.push({ ax, ay });

// PLAFOND DE VITESSE. Sans lui, l'espace des états est infini et la recherche
// du meilleur chemin ne s'arrête jamais. Cinq cases par tour, c'est déjà plus
// que ce qu'aucune piste ne pardonne.
export const VITESSE_MAX = 5;

// --- Les pistes --------------------------------------------------------------

const DESSINS = {
    echauffement: [
        '####################',
        '#DDD...............#',
        '#DDD...............#',
        '#DDD...............#',
        '#..................#',
        '#..................#',
        '###########........#',
        '###########........#',
        '###########........#',
        '###########.AAA....#',
        '###########.AAA....#',
        '####################'
    ],
    chicane: [
        '######################',
        '#DDD..............####',
        '#DDD..............####',
        '#DDD..............####',
        '#.................####',
        '##############....####',
        '##############....####',
        '##############....####',
        '####..............####',
        '####..............####',
        '####....##############',
        '####....##############',
        '####AAA.##############',
        '####AAA.##############',
        '######################'
    ],
    circuit: [
        '########################',
        '#DDD..................##',
        '#DDD..................##',
        '#DDD..................##',
        '####################..##',
        '####################..##',
        '####################..##',
        '####################..##',
        '#.....................##',
        '#.....................##',
        '#..#####################',
        '#..#####################',
        '#AAA####################',
        '#AAA####################',
        '########################'
    ]
};

export const PISTES = [
    {
        id: 'echauffement', nom: 'L\'Échauffement', dessin: DESSINS.echauffement,
        // L'AIDE NE DIT PAS « À DROITE » : sur un téléphone tenu droit, la
        // piste est transposée et le virage n'est plus du même côté.
        aide: 'Une longue ligne droite, puis un seul virage. Prends de la vitesse — mais '
            + 'souviens-toi qu\'il faudra freiner AVANT de tourner, jamais dedans.'
    },
    {
        id: 'chicane', nom: 'La Chicane', dessin: DESSINS.chicane,
        aide: 'Deux virages en sens contraire. Entre les deux, la piste est large : c\'est là '
            + 'qu\'on rattrape la vitesse perdue.'
    },
    {
        id: 'circuit', nom: 'Le Grand Tour', dessin: DESSINS.circuit,
        aide: 'Trois virages et un couloir étroit. Ici, arriver vite ne sert à rien : '
            + 'il faut arriver PLACÉ.'
    }
];

export const pisteParId = (id) => PISTES.find(p => p.id === id) || PISTES[0];

/**
 * LA MÊME PISTE, COUCHÉE SUR L'AUTRE FLANC.
 *
 * Sur un téléphone tenu droit, une piste de vingt cases de large tient dans
 * trois cent cinquante pixels : seize pixels par case, et la moitié de l'écran
 * reste vide au-dessus. On ne fait pas TOURNER LE DESSIN — la voiture irait
 * vers le bas quand le robot dit « à droite », et tout le vocabulaire du jeu
 * mentirait. On transpose les DONNÉES : la piste échange ses lignes et ses
 * colonnes, la droite reste la droite, et le circuit se dresse.
 *
 * Une transposition est un miroir selon la diagonale : elle ne change ni les
 * longueurs, ni les virages, ni le nombre de tours du meilleur parcours.
 */
export function transposer(dessin) {
    const h = dessin.length;
    const l = Math.max(...dessin.map(r => r.length));
    const out = [];
    for (let x = 0; x < l; x++) {
        let ligne = '';
        for (let y = 0; y < h; y++) ligne += dessin[y][x] || '#';
        out.push(ligne);
    }
    return out;
}

/**
 * Décode un dessin en piste utilisable.
 * @param {Object|string} def
 * @param {{debout?: boolean}} [opts] - `debout` transpose la piste pour un
 *   écran plus haut que large.
 * @returns {{id, nom, aide, largeur, hauteur, sol: Set<string>, depart, arrivee}}
 *   `sol` contient toutes les cases praticables, arrivée comprise.
 */
export function lirePiste(def, opts = {}) {
    const d = typeof def === 'string' ? pisteParId(def) : def;
    const lignes = opts.debout ? transposer(d.dessin) : d.dessin;
    const sol = new Set();
    const depart = [];
    const arrivee = [];
    lignes.forEach((ligne, y) => {
        [...ligne].forEach((c, x) => {
            if (c === '#') return;
            sol.add(`${x},${y}`);
            if (c === 'D') depart.push({ x, y });
            if (c === 'A') arrivee.push({ x, y });
        });
    });
    return {
        id: d.id, nom: d.nom, aide: d.aide, debout: !!opts.debout,
        largeur: Math.max(...lignes.map(l => l.length)), hauteur: lignes.length,
        sol, depart, arrivee,
        arriveeSet: new Set(arrivee.map(c => `${c.x},${c.y}`))
    };
}

export const surPiste = (piste, x, y) => piste.sol.has(`${x},${y}`);
export const surArrivee = (piste, x, y) => piste.arriveeSet.has(`${x},${y}`);

/**
 * TOUTES LES CASES QUE LE SEGMENT TRAVERSE, départ compris, arrivée comprise.
 *
 * On ne peut pas se contenter des extrémités : à vitesse 4, la voiture passe
 * par-dessus trois cases intermédiaires, et sauter par-dessus un mur serait
 * la seule façon de tricher. C'est un tracé « supercouverture » — toute case
 * effleurée compte —, volontairement sévère : sur du papier quadrillé, un
 * trait qui mord le bord du virage est une sortie de piste.
 */
export function casesTraversees(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const pas = Math.max(Math.abs(dx), Math.abs(dy));
    if (pas === 0) return [{ x: x0, y: y0 }];
    const vues = new Set();
    const liste = [];
    // Deux fois plus d'échantillons que de cases : un demi-pas ne saute
    // jamais un coin.
    for (let i = 0; i <= pas * 2; i++) {
        const t = i / (pas * 2);
        const x = Math.round(x0 + dx * t);
        const y = Math.round(y0 + dy * t);
        const cle = `${x},${y}`;
        if (!vues.has(cle)) { vues.add(cle); liste.push({ x, y }); }
    }
    return liste;
}

// --- L'état d'une voiture ----------------------------------------------------

/**
 * @param {Object} piste
 * @param {number} [rang] - quelle case de départ (pour deux voitures)
 */
export function etatDepart(piste, rang = 0) {
    const c = piste.depart[Math.min(rang, piste.depart.length - 1)] || { x: 1, y: 1 };
    return {
        x: c.x, y: c.y, vx: 0, vy: 0,
        tours: 0, sorties: 0, fini: false,
        trace: [{ x: c.x, y: c.y }]
    };
}

/**
 * CE QUE DONNERAIT CHACUNE DES NEUF ACCÉLÉRATIONS.
 *
 * Calculé d'avance et rendu à l'écran sous forme de neuf points : l'élève
 * choisit une ARRIVÉE, pas une flèche abstraite, et voit du même coup que les
 * neuf points forment un carré qui se déplace avec la vitesse. C'est le
 * dessin de la règle.
 */
export function coupsPossibles(piste, etat) {
    return ACCELERATIONS.map(({ ax, ay }) => {
        const vx = etat.vx + ax, vy = etat.vy + ay;
        const trop = Math.abs(vx) > VITESSE_MAX || Math.abs(vy) > VITESSE_MAX;
        const x = etat.x + vx, y = etat.y + vy;
        const chemin = casesTraversees(etat.x, etat.y, x, y);
        // On s'arrête à la PREMIÈRE case d'arrivée rencontrée : franchir la
        // ligne termine la course, ce qui se passe au-delà ne compte plus.
        let arrive = false, sort = false;
        for (const c of chemin) {
            if (surArrivee(piste, c.x, c.y)) { arrive = true; break; }
            if (!surPiste(piste, c.x, c.y)) { sort = true; break; }
        }
        return { ax, ay, vx, vy, x, y, arrive, valide: !trop && !sort, trop, sort };
    });
}

/**
 * Joue une accélération. Une sortie de piste ne tue pas : elle repose la
 * voiture à l'arrêt sur sa dernière case valable, et compte une sortie. Sur du
 * papier, c'est la règle la plus répandue — et c'est la seule qui laisse
 * l'élève réessayer plutôt que de recommencer.
 */
export function jouer(piste, etat, ax, ay) {
    const coup = coupsPossibles(piste, etat).find(c => c.ax === ax && c.ay === ay);
    if (!coup) return etat;
    const suite = { ...etat, tours: etat.tours + 1, trace: [...etat.trace] };
    if (coup.arrive) {
        suite.x = coup.x; suite.y = coup.y; suite.vx = coup.vx; suite.vy = coup.vy;
        suite.trace.push({ x: coup.x, y: coup.y });
        suite.fini = true;
        return suite;
    }
    if (!coup.valide) {
        suite.sorties = etat.sorties + 1;
        suite.vx = 0; suite.vy = 0;
        suite.sortiPar = { x: coup.x, y: coup.y };
        return suite;
    }
    suite.x = coup.x; suite.y = coup.y; suite.vx = coup.vx; suite.vy = coup.vy;
    suite.trace.push({ x: coup.x, y: coup.y });
    suite.sortiPar = null;
    return suite;
}

// --- Le meilleur chemin ------------------------------------------------------

const cleEtat = (x, y, vx, vy) => `${x},${y},${vx},${vy}`;

/**
 * LE PLUS COURT CHEMIN, en nombre de tours, depuis l'état donné.
 *
 * Un parcours en largeur sur (position, vitesse) : l'état d'une voiture, ce
 * n'est pas où elle est, c'est où elle est ET à quelle allure — deux voitures
 * au même endroit n'ont pas les mêmes suites possibles si l'une lance et
 * l'autre freine. C'est exactement ce que le jeu doit faire comprendre, et
 * c'est aussi ce qui rend la recherche exacte.
 *
 * Sert à trois choses : dire le record théorique d'une piste, souffler le coup
 * suivant à qui bloque, et faire rouler le robot.
 *
 * @returns {{longueur:number, coups:Array<{ax,ay}>}|null} null si la piste est
 *   sans issue depuis là.
 */
export function cheminOptimal(piste, etat, limite = 60000) {
    const depart = cleEtat(etat.x, etat.y, etat.vx, etat.vy);
    const vus = new Map([[depart, null]]);
    let file = [{ x: etat.x, y: etat.y, vx: etat.vx, vy: etat.vy }];
    let vusCount = 1;

    while (file.length && vusCount < limite) {
        const suivante = [];
        for (const e of file) {
            const cle = cleEtat(e.x, e.y, e.vx, e.vy);
            for (const coup of coupsPossibles(piste, e)) {
                if (coup.arrive) {
                    // On remonte la piste des parents jusqu'au départ.
                    const coups = [{ ax: coup.ax, ay: coup.ay }];
                    let c = cle;
                    while (c !== depart) {
                        const p = vus.get(c);
                        coups.unshift({ ax: p.ax, ay: p.ay });
                        c = p.de;
                    }
                    return { longueur: coups.length, coups };
                }
                if (!coup.valide) continue;
                const k = cleEtat(coup.x, coup.y, coup.vx, coup.vy);
                if (vus.has(k)) continue;
                vus.set(k, { de: cle, ax: coup.ax, ay: coup.ay });
                vusCount++;
                suivante.push({ x: coup.x, y: coup.y, vx: coup.vx, vy: coup.vy });
            }
        }
        file = suivante;
    }
    return null;
}

/**
 * Le coup que jouerait un bon pilote — avec, au besoin, un grain de sable.
 *
 * `mou` (0 à 1) est la part de tours où le robot accepte un coup qui rallonge
 * sa course d'un tour. Un robot toujours optimal gagne toujours, et un jeu
 * qu'on ne peut pas gagner ne se joue pas deux fois.
 */
export function conseil(piste, etat, { mou = 0, rng = null } = {}) {
    const best = cheminOptimal(piste, etat);
    if (!best) {
        // Sans issue : on freine, c'est encore ce qui rouvre le plus de portes.
        const arret = coupsPossibles(piste, etat)
            .filter(c => c.valide)
            .sort((a, b) => (Math.abs(a.vx) + Math.abs(a.vy)) - (Math.abs(b.vx) + Math.abs(b.vy)));
        return arret[0] ? { ax: arret[0].ax, ay: arret[0].ay } : { ax: 0, ay: 0 };
    }
    const parfait = best.coups[0];
    if (!mou || !rng || !rng.bool(mou)) return parfait;

    // Un coup « presque bon » : valide, et qui ne coûte qu'un tour de plus.
    const presque = coupsPossibles(piste, etat).filter(c => {
        if (!c.valide || c.arrive) return false;
        if (c.ax === parfait.ax && c.ay === parfait.ay) return false;
        const suite = cheminOptimal(piste, { x: c.x, y: c.y, vx: c.vx, vy: c.vy });
        return suite && suite.longueur <= best.longueur;
    });
    if (!presque.length) return parfait;
    const c = rng.pick(presque);
    return { ax: c.ax, ay: c.ay };
}

/**
 * Ce qu'on dit à l'élève qui demande de l'aide : le coup, et POURQUOI.
 * Nommer « freine » ou « tourne » vaut mieux que désigner un point.
 */
export function expliquerCoup(etat, coup) {
    const plusVite = Math.abs(etat.vx + coup.ax) + Math.abs(etat.vy + coup.ay)
        > Math.abs(etat.vx) + Math.abs(etat.vy);
    const mots = [];
    if (coup.ax) mots.push(coup.ax > 0 ? 'pousse vers la droite' : 'pousse vers la gauche');
    if (coup.ay) mots.push(coup.ay > 0 ? 'pousse vers le bas' : 'pousse vers le haut');
    const geste = mots.length ? mots.join(' et ') : 'ne touche à rien, garde ta vitesse';
    return `Vitesse (${etat.vx} ; ${etat.vy}) — ${geste}. `
        + `Nouvelle vitesse : (${etat.vx + coup.ax} ; ${etat.vy + coup.ay}), `
        + `${plusVite ? 'tu accélères' : 'tu ralentis ou tu tournes'}.`;
}
