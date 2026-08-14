// SKWEEK — le noyau : le sol, le personnage, les ennemis, les tirs.
//
// Le jeu : un sol de dalles, un personnage qui les peint en marchant dessus,
// des ennemis qui le poursuivent, et un tir pour s'en débarrasser un moment.
// Le niveau est fini quand tout ce qui devait être peint l'est.
//
// DEUX FAÇONS DE FINIR UN NIVEAU, et c'est là que sont les mathématiques :
//
//  · « TOUT » — on peint chaque dalle. Le score est une proportion d'aire, et
//    ces niveaux servent à apprendre la manette : on ne demande rien d'autre
//    que de couvrir le sol.
//  · « TRIER » — chaque dalle porte un nombre, et l'on ne doit peindre QUE
//    celles qui vérifient la règle : les multiples de sept, les fractions
//    égales à un demi, les résultats supérieurs à cinquante. Marcher sur une
//    mauvaise dalle la salit — et la tache reste, jusqu'à la fin du niveau.
//
// C'est cette dernière propriété qui distingue Skweek du reste du catalogue.
// Un Ninja tranche et le nombre disparaît ; ici l'erreur demeure sous les
// yeux, comptée, visible dans le décor. On ne peut pas l'oublier.
//
// LA RÉGION À PEINDRE EST TOUJOURS D'UN SEUL TENANT. Sans cette garantie, un
// niveau « trier » serait injouable au sans-faute : il faudrait traverser des
// mauvaises dalles pour atteindre les bonnes, et le jeu punirait ce qu'il n'a
// pas rendu évitable. Le tirage la vérifie avant de rendre le niveau.
//
// Le noyau ne connaît ni canvas ni horloge. Les positions sont en CASES
// (flottantes), le temps en secondes : le jeu (games/skweek.js) dessine et
// cadence, les tests avancent la partie pas à pas sans navigateur.

// --- Les constantes du mouvement ---------------------------------------------

export const VITESSE = 4.2;          // cases par seconde
export const VITESSE_ENNEMI = 2.3;
export const VITESSE_TIR = 11;
export const RAYON = 0.34;           // le personnage, en cases
export const RAYON_ENNEMI = 0.32;
export const RENAISSANCE = 3.2;      // secondes avant qu'un ennemi revienne
export const INVULNERABLE = 1.4;     // secondes de grâce après un contact

// --- Les règles de tri ---------------------------------------------------------
//
// Chacune sait tirer un nombre ET dire s'il convient. Les deux vivent
// ensemble : une règle dont le test serait écrit ailleurs finirait par ne plus
// correspondre à ce que la consigne annonce.

// CHAQUE RÈGLE SAIT CONSTRUIRE LES DEUX CÔTÉS, elle ne les tire pas au hasard
// en espérant tomber juste. La première version tirait un nombre jusqu'à ce
// qu'il tombe du bon côté, deux cents fois, puis abandonnait en gardant le
// dernier venu — et la dalle changeait alors de camp en silence. Une dalle qui
// bascule, c'est la région connexe qui se troue, donc un niveau impossible à
// finir sans faute, et rien pour le signaler. « forcer » rend la garantie
// structurelle : on demande un nombre qui convient, on en obtient un.
export const REGLES = {
    'multiples': {
        id: 'multiples', label: 'Les multiples',
        dit: (p) => `Peins seulement les multiples de ${p.de}.`,
        parametres: (rng) => ({ de: rng.pick([3, 4, 6, 7, 8, 9]) }),
        forcer: (rng, p, veut) => (veut
            ? rng.int(1, 12) * p.de
            : rng.int(1, 12) * p.de + rng.int(1, p.de - 1)),
        convient: (n, p) => n % p.de === 0
    },
    'pairs': {
        id: 'pairs', label: 'Pairs ou impairs',
        dit: (p) => `Peins seulement les nombres ${p.pair ? 'PAIRS' : 'IMPAIRS'}.`,
        parametres: (rng) => ({ pair: rng.bool() }),
        // On veut un pair quand la règle demande les pairs, un impair sinon —
        // et l'inverse pour les pièges.
        forcer: (rng, p, veut) => rng.int(1, 49) * 2 + ((p.pair === veut) ? 0 : 1),
        convient: (n, p) => (n % 2 === 0) === p.pair
    },
    'plusGrand': {
        id: 'plusGrand', label: 'Plus grand que',
        dit: (p) => `Peins seulement les nombres plus grands que ${p.seuil}.`,
        parametres: (rng) => ({ seuil: rng.pick([20, 30, 50, 75, 100]) }),
        forcer: (rng, p, veut) => (veut
            ? rng.int(p.seuil + 1, p.seuil + 40)
            : rng.int(Math.max(1, p.seuil - 40), p.seuil)),
        convient: (n, p) => n > p.seuil
    },
    'sommeEgale': {
        id: 'sommeEgale', label: 'Les additions qui font',
        dit: (p) => `Peins seulement les calculs qui font ${p.but}.`,
        parametres: (rng) => ({ but: rng.pick([10, 12, 15, 20, 25]) }),
        // La dalle porte un CALCUL : c'est le texte qu'on lit, et « convient »
        // relit la valeur, jamais l'étiquette.
        forcer: (rng, p, veut) => {
            const total = veut ? p.but
                : Math.max(2, p.but + rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]));
            const a = rng.int(1, total - 1);
            return { valeur: total, texte: `${a}+${total - a}` };
        },
        convient: (n, p) => n === p.but
    },
    'moitie': {
        id: 'moitie', label: 'Les fractions égales à un demi',
        dit: () => 'Peins seulement les fractions égales à ½.',
        parametres: () => ({}),
        forcer: (rng, p, veut) => {
            if (veut) {
                // Toutes les écritures d'un demi : 1/2, 2/4, 3/6, 4/8, 5/10, 6/12.
                const k = rng.int(1, 6);
                return { valeur: 0.5, texte: `${k}/${2 * k}` };
            }
            // Un piège : même famille de dénominateurs, mais jamais la moitié.
            const den = rng.int(3, 12);
            let num = rng.int(1, den - 1);
            if (num * 2 === den) num = num === 1 ? 2 : num - 1;
            return { valeur: num / den, texte: `${num}/${den}` };
        },
        convient: (v) => Math.abs(v - 0.5) < 1e-9
    },
    'tableDe': {
        id: 'tableDe', label: 'Les produits d\'une table',
        dit: (p) => `Peins seulement les résultats de la table de ${p.de}.`,
        parametres: (rng) => ({ de: rng.pick([4, 6, 7, 8, 9]) }),
        forcer: (rng, p, veut) => {
            if (veut) return p.de * rng.int(2, 10);
            // Un voisin du bon résultat : c'est plus dur, et plus utile, qu'un
            // nombre tiré n'importe où.
            const n = p.de * rng.int(2, 10) + rng.pick([-2, -1, 1, 2]);
            return (n % p.de === 0 && n / p.de >= 2 && n / p.de <= 10) ? n + 1 : Math.max(1, n);
        },
        convient: (n, p) => n % p.de === 0 && n / p.de >= 2 && n / p.de <= 10
    }
};

/** La liste des règles, dans un ordre stable — pour un menu, ou un test. */
export const NOMS_REGLES = Object.keys(REGLES);

// --- La progression ------------------------------------------------------------
//
// Les trois premiers niveaux ne demandent que de couvrir le sol : on apprend
// la manette, le tir, la fuite. Le tri n'arrive qu'ensuite, quand se déplacer
// ne coûte plus d'attention.

export const NIVEAUX = [
    { but: 'tout', cols: 11, lignes: 9, trous: 6, ennemis: 1, titre: 'Le sol à couvrir' },
    { but: 'tout', cols: 13, lignes: 10, trous: 12, ennemis: 2, titre: 'Attention aux trous' },
    { but: 'tout', cols: 15, lignes: 11, trous: 20, ennemis: 3, titre: 'Ça se bouscule' },
    { but: 'trier', cols: 11, lignes: 9, trous: 4, ennemis: 1, titre: 'Ne peins que ce qu\'il faut' },
    { but: 'trier', cols: 13, lignes: 10, trous: 8, ennemis: 2, titre: 'Trier sous la menace' },
    { but: 'trier', cols: 15, lignes: 11, trous: 12, ennemis: 3, titre: 'Le grand tri' }
];

// --- Le sol ---------------------------------------------------------------------

export const VIDE = 0;      // un trou : on tombe, les tirs s'y perdent
export const SOL = 1;

const cle = (x, y) => `${x},${y}`;
const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Les cases atteignables depuis (x, y) en suivant `praticable`. */
function region(cols, lignes, depart, praticable) {
    const vus = new Set([cle(depart.x, depart.y)]);
    const pile = [depart];
    while (pile.length) {
        const c = pile.pop();
        for (const [dx, dy] of VOISINS) {
            const nx = c.x + dx, ny = c.y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= lignes) continue;
            if (vus.has(cle(nx, ny)) || !praticable(nx, ny)) continue;
            vus.add(cle(nx, ny));
            pile.push({ x: nx, y: ny });
        }
    }
    return vus;
}

/**
 * Creuse des trous SANS jamais couper le sol en deux.
 *
 * Un trou posé au hasard peut isoler un coin, et l'on demanderait alors de
 * peindre des dalles qu'aucun chemin n'atteint. On creuse donc un trou à la
 * fois, et l'on rebouche aussitôt celui qui casse la connexité.
 */
function creuser(cols, lignes, combien, rng, depart) {
    const sol = new Array(cols * lignes).fill(SOL);
    const libre = (x, y) => sol[y * cols + x] === SOL;
    let poses = 0;
    for (let essai = 0; essai < combien * 40 && poses < combien; essai++) {
        const x = rng.int(0, cols - 1), y = rng.int(0, lignes - 1);
        if ((x === depart.x && y === depart.y) || !libre(x, y)) continue;
        sol[y * cols + x] = VIDE;
        const atteintes = region(cols, lignes, depart, libre);
        const total = sol.filter(v => v === SOL).length;
        if (atteintes.size === total) poses++;
        else sol[y * cols + x] = SOL;          // ce trou coupait le sol : on rebouche
    }
    return sol;
}

/**
 * Choisit les dalles À PEINDRE d'un niveau de tri, en un seul tenant.
 *
 * On part du départ et l'on étend une tache en s'accrochant à ce qui est déjà
 * pris : la région est connexe par construction, donc traversable sans jamais
 * poser le pied sur une dalle interdite.
 */
function tacheConnexe(cols, lignes, sol, depart, combien, rng) {
    const libre = (x, y) => sol[y * cols + x] === SOL;
    const dedans = new Set([cle(depart.x, depart.y)]);
    const bord = [depart];
    while (dedans.size < combien && bord.length) {
        const i = rng.int(0, bord.length - 1);
        const c = bord[i];
        const ouverts = VOISINS
            .map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
            .filter(n => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < lignes
                && libre(n.x, n.y) && !dedans.has(cle(n.x, n.y)));
        if (!ouverts.length) { bord.splice(i, 1); continue; }
        const n = ouverts[rng.int(0, ouverts.length - 1)];
        dedans.add(cle(n.x, n.y));
        bord.push(n);
    }
    return dedans;
}

/**
 * Un niveau complet, prêt à jouer.
 *
 * @param {Object} o
 * @param {number} o.niveau  - le rang dans NIVEAUX (1 = le premier)
 * @param {Object} o.rng     - le tirage du projet, pour des niveaux rejouables
 * @param {string} [o.regle] - forcer une règle de tri (sinon tirée au sort)
 */
export function creerNiveau({ niveau = 1, rng, regle = null } = {}) {
    const n = NIVEAUX[Math.max(0, Math.min(NIVEAUX.length - 1, niveau - 1))];
    const depart = { x: Math.floor(n.cols / 2), y: Math.floor(n.lignes / 2) };
    const sol = creuser(n.cols, n.lignes, n.trous, rng, depart);
    const praticables = [];
    for (let y = 0; y < n.lignes; y++) {
        for (let x = 0; x < n.cols; x++) if (sol[y * n.cols + x] === SOL) praticables.push({ x, y });
    }

    // Le tri : une règle, une tache connexe, et un nombre par dalle.
    let R = null, params = {}, aPeindre = null;
    if (n.but === 'trier') {
        const nom = REGLES[regle] ? regle : rng.pick(NOMS_REGLES);
        R = REGLES[nom];
        params = R.parametres(rng);
        // Un peu moins de la moitié du sol : assez pour que le tri compte,
        // assez peu pour qu'il reste de la place où se tromper.
        aPeindre = tacheConnexe(n.cols, n.lignes, sol, depart,
            Math.max(4, Math.round(praticables.length * 0.42)), rng);
    }

    const dalles = praticables.map(({ x, y }) => {
        if (n.but === 'tout') return { x, y, bonne: true, etat: 'nu', texte: '', valeur: null };
        // C'EST LA TACHE QUI DÉCIDE, et la règle qui obéit : on demande un
        // nombre du côté voulu, on en obtient un. La dalle ne peut donc pas
        // changer de camp, et la région à peindre reste d'un seul tenant.
        const bonne = aPeindre.has(cle(x, y));
        const tire = R.forcer(rng, params, bonne);
        const valeur = typeof tire === 'object' ? tire.valeur : tire;
        const texte = typeof tire === 'object' ? tire.texte : String(tire);
        return { x, y, bonne, etat: 'nu', texte, valeur };
    });

    // Les ennemis démarrent LOIN : apparaître sur le personnage lui coûterait
    // une vie avant qu'il ait touché une touche.
    const loin = praticables
        .filter(c => Math.abs(c.x - depart.x) + Math.abs(c.y - depart.y) >= 4);
    const ennemis = [];
    for (let k = 0; k < n.ennemis; k++) {
        const c = (loin.length ? loin : praticables)[rng.int(0, (loin.length || praticables.length) - 1)];
        ennemis.push({
            x: c.x + 0.5, y: c.y + 0.5,
            vx: rng.bool() ? VITESSE_ENNEMI : -VITESSE_ENNEMI,
            vy: rng.bool() ? VITESSE_ENNEMI : -VITESSE_ENNEMI,
            vivant: true, repousse: 0
        });
    }

    const etat = {
        cols: n.cols, lignes: n.lignes, sol, dalles,
        niveau, but: n.but, titre: n.titre,
        regle: R ? { id: R.id, params, dit: R.dit(params) } : null,
        depart,
        heros: { x: depart.x + 0.5, y: depart.y + 0.5, regard: { x: 1, y: 0 }, grace: 0 },
        ennemis, tirs: [],
        aFaire: dalles.filter(d => d.bonne).length,
        peintes: 0, salies: 0, fini: false, perdu: false
    };
    // La dalle de départ est peinte tout de suite : sinon le compteur affiche
    // « 0 peinte » alors qu'on est déjà debout dessus.
    peindreSous(etat);
    return etat;
}

// --- Les accès au sol -----------------------------------------------------------

export const dalleEn = (e, x, y) => (x < 0 || y < 0 || x >= e.cols || y >= e.lignes
    ? null : e.dalles.find(d => d.x === x && d.y === y) || null);

export const praticable = (e, x, y) => x >= 0 && y >= 0 && x < e.cols && y < e.lignes
    && e.sol[y * e.cols + x] === SOL;

/** La case sous un point. */
export const caseDe = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

/**
 * Peint la dalle sous le personnage.
 *
 * UNE DALLE SE PEINT D'UN COUP, ENTIÈREMENT, dès que le centre y entre. Le
 * personnage se déplace librement — c'est ce qui permet de viser — mais la
 * peinture, elle, reste calée sur la grille : sinon l'aire couverte devient
 * floue et « 37 cases sur 96 » ne veut plus rien dire.
 */
export function peindreSous(e) {
    const c = caseDe(e.heros);
    const d = dalleEn(e, c.x, c.y);
    if (!d || d.etat !== 'nu') return null;
    if (d.bonne) { d.etat = 'peinte'; e.peintes++; }
    else { d.etat = 'salie'; e.salies++; }
    if (e.peintes >= e.aFaire) e.fini = true;
    return d;
}

// --- Le mouvement ----------------------------------------------------------------

/** Un cercle en (x, y) touche-t-il un trou ou un bord ? */
function bloque(e, x, y, r) {
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        const cx = Math.floor(x + dx), cy = Math.floor(y + dy);
        if (!praticable(e, cx, cy)) return true;
    }
    return false;
}

/**
 * Avance le personnage d'un pas de temps.
 *
 * `dir` est la poussée du pad, normalisée par l'appelant ou non : on la
 * normalise ici, faute de quoi une diagonale irait 41 % plus vite que les
 * quatre directions — le vieux défaut des jeux à huit directions.
 */
export function bougerHeros(e, dir, dt) {
    const n = Math.hypot(dir.x || 0, dir.y || 0);
    if (n > 0.001) {
        const ux = dir.x / n, uy = dir.y / n;
        e.heros.regard = { x: ux, y: uy };
        // Les deux axes séparément : glisser le long d'un trou vaut mieux que
        // s'y coller, et un coin ne doit jamais happer le personnage.
        const nx = e.heros.x + ux * VITESSE * dt;
        if (!bloque(e, nx, e.heros.y, RAYON)) e.heros.x = nx;
        const ny = e.heros.y + uy * VITESSE * dt;
        if (!bloque(e, e.heros.x, ny, RAYON)) e.heros.y = ny;
        peindreSous(e);
    }
    if (e.heros.grace > 0) e.heros.grace = Math.max(0, e.heros.grace - dt);
    return e;
}

/** Un tir part du personnage, dans la direction où il regarde. */
export function tirer(e) {
    // Un seul tir en vol : autrement on balaye l'écran sans viser, et le
    // bouton ne demande plus rien.
    if (e.tirs.length || e.fini || e.perdu) return null;
    const t = {
        x: e.heros.x, y: e.heros.y,
        vx: e.heros.regard.x * VITESSE_TIR, vy: e.heros.regard.y * VITESSE_TIR
    };
    e.tirs.push(t);
    return t;
}

/** Les tirs avancent, meurent au mur, et assomment ce qu'ils touchent. */
export function bougerTirs(e, dt) {
    const touches = [];
    e.tirs = e.tirs.filter(t => {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        const c = caseDe(t);
        if (!praticable(e, c.x, c.y)) return false;
        for (const m of e.ennemis) {
            if (!m.vivant) continue;
            if (Math.hypot(m.x - t.x, m.y - t.y) < RAYON_ENNEMI + 0.12) {
                m.vivant = false;
                m.repousse = RENAISSANCE;
                touches.push(m);
                return false;
            }
        }
        return true;
    });
    return touches;
}

/**
 * Les ennemis avancent, rebondissent sur les trous, et reviennent après avoir
 * été touchés — loin du personnage, sinon leur retour serait une punition.
 */
export function bougerEnnemis(e, dt, rng) {
    for (const m of e.ennemis) {
        if (!m.vivant) {
            m.repousse -= dt;
            if (m.repousse > 0) continue;
            const loin = e.dalles.filter(d =>
                Math.abs(d.x + 0.5 - e.heros.x) + Math.abs(d.y + 0.5 - e.heros.y) >= 5);
            const c = (loin.length ? loin : e.dalles)[rng ? rng.int(0, (loin.length || e.dalles.length) - 1) : 0];
            m.x = c.x + 0.5; m.y = c.y + 0.5; m.vivant = true;
            continue;
        }
        const nx = m.x + m.vx * dt;
        if (bloque(e, nx, m.y, RAYON_ENNEMI)) m.vx = -m.vx; else m.x = nx;
        const ny = m.y + m.vy * dt;
        if (bloque(e, m.x, ny, RAYON_ENNEMI)) m.vy = -m.vy; else m.y = ny;
    }
}

/**
 * Le contact. Rend vrai si le personnage vient d'être touché — au jeu de
 * décider ce que ça coûte.
 */
export function contact(e) {
    if (e.heros.grace > 0 || e.fini || e.perdu) return false;
    for (const m of e.ennemis) {
        if (!m.vivant) continue;
        if (Math.hypot(m.x - e.heros.x, m.y - e.heros.y) < RAYON + RAYON_ENNEMI) {
            e.heros.x = e.depart.x + 0.5;
            e.heros.y = e.depart.y + 0.5;
            e.heros.grace = INVULNERABLE;
            return true;
        }
    }
    return false;
}

/** Ce qu'affiche le compteur : peintes, à faire, taches, et le pourcentage. */
export function compte(e) {
    return {
        peintes: e.peintes, aFaire: e.aFaire, salies: e.salies,
        pourcentage: e.aFaire ? Math.round((e.peintes / e.aFaire) * 100) : 100
    };
}
