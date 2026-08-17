// LES ARPENTEURS — un jeu à deux sur la table de Pythagore.
//
// Un terrain quadrillé. À chaque tour, un nombre tombe : 36. Le joueur doit
// clôturer un rectangle de 36 cases — 6 × 6, 4 × 9, 3 × 12 — n'importe où sur
// ce qui reste libre. Celui qui ne peut plus poser a perdu.
//
// Ce qu'on y travaille n'est pas « combien font 6 × 6 » mais la question
// inverse, celle qu'on ne pose presque jamais : QUELLES multiplications font
// 36 ? Un élève qui ne connaît que 6 × 6 aura besoin d'un carré de six de côté
// et se retrouvera coincé bien avant celui qui voit aussi 4 × 9 et 3 × 12. La
// richesse des décompositions devient un avantage tactique — c'est-à-dire une
// raison de les connaître.
//
// Deuxième idée, plus discrète : à la fin, il reste des trous. Une bande de 5
// cases de large ne peut plus accueillir 36 même si la surface libre est
// grande. On apprend là, sans un mot de leçon, qu'une aire ne suffit pas à
// décrire une forme.

export const VIDE = 0;

/**
 * Toutes les façons d'écrire n comme un produit de deux facteurs.
 *
 * Les facteurs ne sont PAS bornés par la table : 36 vaut aussi 3 × 12, et
 * c'est exactement ce qui fait la richesse du jeu — le nombre vient de la
 * table de Pythagore, la forme non. Seul le terrain limite (`maxCote`).
 *
 * `minCote` vaut 2 par défaut : une bande d'UNE case de large est toujours
 * disponible tant qu'il reste une ligne libre, et elle transformerait la fin
 * de partie en remplissage mécanique où plus aucune décomposition ne se
 * cherche. Le réglage existe quand même, pour les parties longues.
 */
export function decompositions(n, maxCote = 30, minCote = 2) {
    const out = [];
    for (let a = minCote; a * a <= n; a++) {
        if (n % a) continue;
        const b = n / a;
        if (a <= maxCote && b <= maxCote && b >= minCote) out.push([a, b]);
    }
    return out;
}

/** Les nombres jouables : ceux de la table, sans doublon, du plus petit au plus grand. */
export function nombresDeLaTable(max = 10) {
    const vus = new Set();
    for (let a = 2; a <= max; a++) for (let b = a; b <= max; b++) vus.add(a * b);
    return [...vus].sort((x, y) => x - y);
}

export function creerPartie({ cols = 26, rows = 18, table = 10, minCote = 2, joueurs = 2 } = {}) {
    return {
        cols, rows, table, minCote,
        // Le plus grand côté possible : celui du terrain. Une parcelle plus
        // longue que le pré ne se clôture pas.
        max: Math.max(cols, rows),
        cases: new Array(cols * rows).fill(VIDE),
        joueur: 1,
        // SEUL OU À DEUX. En solo, le tour ne change jamais de main : on
        // clôture jusqu'à ce que plus rien ne rentre, et la partie se juge à la
        // surface conquise. C'est le même jeu, et il devient jouable sans
        // partenaire — ce qu'un exercice de classe doit pouvoir être.
        joueurs: joueurs === 1 ? 1 : 2,
        // Un JOKER par joueur : le droit de refuser UNE fois le nombre tiré.
        // Sans lui, un tirage malheureux décide seul de la partie, alors que
        // tout le jeu consiste à garder des formes possibles.
        jokers: { 1: 1, 2: 1 },
        cible: null,
        tour: 0,
        perdant: null,
        parcelles: []
    };
}

export const idx = (e, x, y) => y * e.cols + x;

/** Le rectangle tient-il, et ne mord-il sur rien ? */
export function libre(e, x, y, w, h) {
    if (w < 1 || h < 1) return false;
    if (x < 0 || y < 0 || x + w > e.cols || y + h > e.rows) return false;
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if (e.cases[idx(e, x + i, y + j)] !== VIDE) return false;
        }
    }
    return true;
}

/**
 * Existe-t-il UNE place pour un rectangle d'aire n ?
 * On essaie chaque décomposition dans les deux orientations, à chaque position.
 * Le terrain fait au plus 30 × 20 et n a moins de cinq décompositions : le
 * balayage complet est instantané, et il est exact — ce qui compte, puisque
 * c'est lui qui décide qu'un joueur a perdu.
 */
export function placementPossible(e, n) {
    for (const [a, b] of formes(e, n)) {
        for (const [w, h] of (a === b ? [[a, b]] : [[a, b], [b, a]])) {
            for (let y = 0; y + h <= e.rows; y++) {
                for (let x = 0; x + w <= e.cols; x++) {
                    if (libre(e, x, y, w, h)) return { x, y, w, h };
                }
            }
        }
    }
    return null;
}

/** Les formes légales pour ce nombre SUR CE TERRAIN. */
export function formes(e, n) {
    return decompositions(n, Math.max(e.cols, e.rows), e.minCote);
}

/** Les nombres de la table encore posables sur ce terrain. */
export function ciblesPossibles(e) {
    return nombresDeLaTable(e.table).filter(n => placementPossible(e, n));
}

/**
 * Tire le nombre du tour.
 *
 * On ne tire QUE parmi les nombres encore posables. Sans cette précaution, un
 * joueur perdrait parce que la machine a sorti 81 quand il ne restait qu'une
 * bande de six : une défaite qu'aucune décision n'aurait pu éviter. La règle
 * de l'élève est respectée à la lettre — « le dernier qui ne peut pas poser a
 * perdu » — mais la défaite vient alors de la place qu'on a laissée, pas du
 * tirage.
 */
export function tirerCible(e, rng) {
    const possibles = ciblesPossibles(e);
    if (!possibles.length) {
        e.cible = null;
        e.perdant = e.joueur;
        return null;
    }
    e.cible = rng ? rng.pick(possibles) : possibles[Math.floor(Math.random() * possibles.length)];
    return e.cible;
}

/**
 * LE JOKER : refuser une fois le nombre tiré, et en tirer un autre.
 *
 * Le tirage ne sort déjà que des nombres posables, donc on ne perd jamais sur
 * un coup impossible. Mais on peut recevoir 81 quand la seule place de 81
 * ruine le terrain : le joker rend au joueur la décision, une fois par partie.
 * Il ne sert à rien s'il n'existe qu'un seul nombre posable — on le lui dit
 * plutôt que de le lui consommer.
 *
 * @returns {{ok:boolean, cible:?number, raison:?string}}
 */
export function utiliserJoker(e, rng) {
    if (e.perdant) return { ok: false, cible: e.cible, raison: 'finie' };
    if (!e.jokers[e.joueur]) return { ok: false, cible: e.cible, raison: 'epuise' };
    const autres = ciblesPossibles(e).filter(n => n !== e.cible);
    if (!autres.length) return { ok: false, cible: e.cible, raison: 'seul-possible' };
    e.jokers[e.joueur]--;
    e.cible = rng ? rng.pick(autres) : autres[Math.floor(Math.random() * autres.length)];
    return { ok: true, cible: e.cible, raison: null };
}

/**
 * Pose une parcelle. Renvoie le compte rendu du coup — et surtout, quand il est
 * refusé, POURQUOI : c'est le seul retour dont l'élève puisse tirer quelque
 * chose (« tu as tracé 5 × 7 = 35, il en fallait 36 »).
 */
export function poser(e, x, y, w, h) {
    if (e.perdant) return { ok: false, raison: 'finie' };
    const aire = w * h;
    if (w < e.minCote || h < e.minCote) {
        return { ok: false, raison: 'trop-mince', aire, message: `Une parcelle doit faire au moins ${e.minCote} cases de large.` };
    }
    if (aire !== e.cible) {
        return { ok: false, raison: 'aire', aire, message: `Ta parcelle fait ${w} × ${h} = ${aire}. Il en fallait ${e.cible}.` };
    }
    if (!libre(e, x, y, w, h)) {
        return { ok: false, raison: 'occupe', aire, message: 'Cette parcelle sort du terrain ou mord sur une parcelle déjà clôturée.' };
    }

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) e.cases[idx(e, x + i, y + j)] = e.joueur;
    }
    const parcelle = { joueur: e.joueur, x, y, w, h, aire, tour: e.tour };
    e.parcelles.push(parcelle);
    e.tour++;
    // En solo, la main ne change pas : il n'y a personne à qui la passer.
    if (e.joueurs === 2) e.joueur = e.joueur === 1 ? 2 : 1;
    return { ok: true, parcelle, message: `${w} × ${h} = ${aire}` };
}

/** Les cases encore libres. */
export function restant(e) {
    return e.cases.reduce((s, c) => s + (c === VIDE ? 1 : 0), 0);
}

export function score(e, joueur) {
    return e.cases.reduce((s, c) => s + (c === joueur ? 1 : 0), 0);
}

/**
 * Le conseil du tour : TOUTES les décompositions, et rien d'autre.
 *
 * Désigner la meilleure case supposerait de savoir laquelle abîme le moins le
 * terrain — c'est le cœur du jeu, et le donner reviendrait à jouer à la place
 * de l'élève. Énumérer les formes, en revanche, c'est lui rendre ce qu'il
 * devrait déjà savoir : que 36 ne se réduit pas à 6 × 6.
 */
export function conseil(e) {
    if (!e.cible) return '';
    const liste2 = formes(e, e.cible);
    if (!liste2.length) return '';
    const liste = liste2.map(([a, b]) => `${a} × ${b}`).join(', ');
    return liste2.length === 1
        ? `${e.cible} ne s'écrit que d'une façon : ${liste}. Tu n'as pas le choix de la forme, seulement de la place.`
        : `${e.cible} s'écrit de ${liste2.length} façons : ${liste}. Choisis celle qui abîme le moins le terrain.`;
}

/**
 * L'ADVERSAIRE DE LA MACHINE — Rémy : « j'aimerais bien pouvoir jouer contre
 * l'ordinateur ».
 *
 * Le jeu se joue à deux, et à deux seulement : la version solo mesure une
 * surface, elle ne fait pas jouer. Or un élève seul devant l'écran n'a
 * personne — et c'est précisément lui qu'on veut faire travailler.
 *
 * CE QUE LA MACHINE CHERCHE. Pas la plus grande parcelle : elles font toutes
 * exactement l'aire tirée. Ce qui se joue, c'est ce qu'on LAISSE — une
 * parcelle collée au bord ou à une clôture existante ne coupe pas le terrain
 * en deux, alors qu'une parcelle posée au milieu crée deux bandes trop
 * étroites pour rien. On note donc chaque placement par son CONTACT : le
 * nombre de côtés de cases qui touchent un bord du terrain ou une parcelle
 * déjà posée. C'est le raisonnement qu'on veut voir chez l'élève, et il est
 * assez simple pour qu'il puisse le rattraper.
 *
 * TROIS FORCES. « Débutant » joue au hasard parmi les coups valables — on peut
 * le battre en réfléchissant, ce qui est le but. « Normal » prend le meilleur
 * contact, avec un peu de désordre pour ne pas être prévisible. « Fort » prend
 * toujours le meilleur.
 */
export function contact(e, x, y, w, h) {
    let n = 0;
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const cx = x + i, cy = y + j;
            // Un côté ne compte que s'il regarde VERS L'EXTÉRIEUR de la
            // parcelle : les côtés intérieurs sont les mêmes pour tous les
            // placements de même forme et ne départageraient rien.
            const bords = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (const [dx, dy] of bords) {
                const vx = cx + dx, vy = cy + dy;
                const dedans = vx >= x && vx < x + w && vy >= y && vy < y + h;
                if (dedans) continue;
                const horsTerrain = vx < 0 || vy < 0 || vx >= e.cols || vy >= e.rows;
                if (horsTerrain || e.cases[idx(e, vx, vy)] !== VIDE) n++;
            }
        }
    }
    return n;
}

/** Tous les placements valables pour l'aire visée, notés par leur contact. */
export function placements(e, n) {
    const out = [];
    for (const [a, b] of formes(e, n)) {
        for (const [w, h] of (a === b ? [[a, b]] : [[a, b], [b, a]])) {
            for (let y = 0; y + h <= e.rows; y++) {
                for (let x = 0; x + w <= e.cols; x++) {
                    if (!libre(e, x, y, w, h)) continue;
                    const c = contact(e, x, y, w, h);
                    // LA QUALITÉ, PAS LE CONTACT BRUT. Une bande 2 × 18 a
                    // quarante côtés à offrir et un carré 6 × 6 seulement
                    // vingt-quatre : à contact égal, le contact brut choisirait
                    // toujours la bande — celle qui coupe le terrain en deux.
                    // On rapporte donc le contact au périmètre : c'est la part
                    // de la clôture qui s'appuie sur quelque chose.
                    out.push({ x, y, w, h, contact: c, qualite: c / (2 * (w + h)) });
                }
            }
        }
    }
    return out;
}

/**
 * Le coup de la machine, ou `null` si elle ne peut pas jouer.
 *
 * @param {Object} e     - la partie
 * @param {Object} rng   - le tirage ensemencé
 * @param {'debutant'|'normal'|'fort'} [force]
 */
export function coupOrdinateur(e, rng, force = 'normal') {
    if (!e.cible) return null;
    const choix = placements(e, e.cible);
    if (!choix.length) return null;
    if (force === 'debutant') return rng.pick(choix);
    const meilleur = Math.max(...choix.map(c => c.qualite));
    // « Normal » accepte un peu moins bien : cela suffit à varier ses parties
    // sans qu'il joue mal.
    const seuil = force === 'fort' ? meilleur - 1e-9 : meilleur - 0.12;
    const bons = choix.filter(c => c.qualite >= seuil);
    return rng.pick(bons);
}

/**
 * La machine doit-elle brûler son joker ?
 *
 * Seulement quand le nombre tiré ne se pose NULLE PART correctement : sa
 * meilleure place laisse la moitié de sa clôture en l'air, alors qu'un autre
 * nombre se logerait proprement. On compare des qualités, jamais des tailles —
 * sinon la machine dépenserait son joker à chaque tour pour obtenir un plus
 * gros nombre, ce qui n'est pas ce que le joker sert à faire.
 */
export function jokerUtile(e, rng) {
    if (!e.jokers[e.joueur] || !e.cible) return false;
    const ici = placements(e, e.cible);
    if (!ici.length) return true;
    const meilleurIci = Math.max(...ici.map(c => c.qualite));
    // Une place déjà correcte ne se refuse pas.
    if (meilleurIci >= 0.45) return false;
    const autres = ciblesPossibles(e).filter(n => n !== e.cible);
    if (!autres.length) return false;
    const ailleurs = Math.max(...autres.map(n => {
        const p = placements(e, n);
        return p.length ? Math.max(...p.map(c => c.qualite)) : 0;
    }));
    return ailleurs - meilleurIci >= 0.3;
}
