// LE POUSSEUR — un sokoban, et il se fabrique à l'envers.
//
// Rémy : « J'aimerai […] un jeu façon sokoban. Il faut que ce soit progressif. »
//
// LA RÈGLE EST MINUSCULE ET LE JEU EST IMPITOYABLE. Le pousseur avance d'une
// case ; s'il y a une caisse devant lui et du vide derrière elle, il la pousse.
// Il ne TIRE jamais. C'est cette absence-là qui fait tout : une caisse poussée
// dans un coin n'en ressortira plus, et la partie est perdue sans que rien ne
// le dise. Apprendre à voir un coup IRRÉVERSIBLE avant de le jouer, c'est
// exactement la leçon des grenouilles — mais ici, il faut la voir plusieurs
// coups à l'avance.
//
// ON NE FABRIQUE PAS UN SOKOBAN EN POSANT DES CAISSES AU HASARD. Neuf fois sur
// dix la grille est insoluble, et rien ne le dit avant d'avoir tout essayé. On
// part donc de la fin : les caisses SUR leurs cibles, c'est-à-dire de la
// position gagnante, et l'on remonte le temps. Le mouvement inverse d'une
// poussée est une TRACTION — le pousseur recule et tire la caisse derrière lui.
// Toute position atteinte ainsi est donc, par construction, résoluble : il
// suffit de rejouer la suite à l'endroit.
//
// ET LA DIFFICULTÉ TOMBE DANS LA MAIN. Comme on remonte par un parcours en
// largeur, on connaît la distance de chaque position à la position gagnante :
// c'est le nombre MINIMUM de poussées pour finir. Choisir un départ à quinze
// poussées de la fin, c'est fabriquer un niveau à quinze poussées — mesuré, pas
// estimé.
//
// LA POSITION DU POUSSEUR NE COMPTE PAS, SA ZONE OUI. Deux positions qui ne
// diffèrent que par l'endroit exact où se tient le pousseur, sans qu'aucune
// caisse ait bougé, sont la MÊME position de jeu : il peut passer de l'une à
// l'autre en marchant. On range donc chaque position sous la plus petite case
// de la zone où il peut se promener. Sans cette réduction, l'exploration
// compterait dix fois les mêmes états et n'irait jamais assez loin.
//
// Module pur : ni DOM, ni hasard propre.

/** Ce qu'une case peut être. Le sol et le but sont tous deux praticables. */
export const MUR = 0;
export const SOL = 1;
export const BUT = 2;

// CINQUANTE PALIERS, MESURÉS EN POUSSÉES MINIMUM.
//
// Rémy : « Il faut au moins 50 niveaux ». Il y en avait six, et l'on touchait
// le plafond en une récréation : le jeu s'arrêtait de monter alors qu'il
// restait tout à apprendre.
//
// DEUX CHOSES FONT LA DIFFICULTÉ, ET ELLES NE COÛTENT PAS PAREIL.
//
//  · LA TAILLE DE L'ENTREPÔT ET LE NOMBRE DE CAISSES décident du coût de
//    FABRICATION : `creerPousseur` explore toutes les positions atteignables
//    pour démontrer le minimum, et cet espace grandit comme le nombre de
//    façons de poser les caisses. Cinq caisses sur un huit par huit, c'est
//    déjà cent mille positions ; six, c'est presque un million, et le
//    navigateur se fige pendant qu'on attend son entrepôt. Ces deux-là
//    plafonnent donc.
//  · LA PROFONDEUR — combien de poussées au minimum — ne coûte RIEN de plus :
//    la table est déjà calculée, on y choisit simplement une position de
//    départ plus loin du but. C'est elle qui porte la montée jusqu'au bout.
//
// Et quand un entrepôt ne peut pas être aussi profond que demandé, on garde le
// plus profond trouvé : le palier ne ment jamais sur ce qu'il propose, il
// donne ce qu'il a.

/**
 * Les huit tranches du parcours : caisses, sol creusé, côté de l'entrepôt.
 *
 * MESURÉ, PAS DEVINÉ. Chaque combinaison a été chronométrée et sa profondeur
 * relevée : cinq caisses sur vingt-quatre cases de sol donnent une trentaine
 * de poussées en quatre dixièmes de seconde, six caisses en donnent autant
 * mais coûtent trois fois plus, et quarante cases de sol demandent une minute
 * entière — c'est la borne au-delà de laquelle le navigateur se fige en
 * attendant son entrepôt. Le parcours s'arrête donc là où la démonstration
 * reste instantanée.
 */
const TRANCHES_POUSSEUR = [
    { jusqua: 4, caisses: 2, sol: 12, taille: 5 },
    { jusqua: 8, caisses: 2, sol: 14, taille: 6 },
    { jusqua: 14, caisses: 3, sol: 16, taille: 6 },
    { jusqua: 20, caisses: 3, sol: 18, taille: 7 },
    { jusqua: 28, caisses: 4, sol: 20, taille: 7 },
    { jusqua: 36, caisses: 4, sol: 22, taille: 8 },
    { jusqua: 44, caisses: 5, sol: 22, taille: 8 },
    { jusqua: 50, caisses: 5, sol: 24, taille: 8 }
];

/** Le palier numéro n, calculé plutôt qu'écrit cinquante fois. */
function palierPousseur(n) {
    const t = TRANCHES_POUSSEUR.find(x => n <= x.jusqua) || TRANCHES_POUSSEUR[TRANCHES_POUSSEUR.length - 1];
    // La profondeur visée monte doucement et plafonne à ce qu'un entrepôt de
    // cette taille peut porter. Au-delà, `creerPousseur` garde le plus profond
    // qu'il a trouvé : le palier donne ce qu'il a, il ne promet rien de faux.
    const min = Math.min(30, 3 + Math.round((n - 1) * 0.58));
    const nom = n === 1 ? 'Niveau 1 — pour comprendre'
        : n === 9 ? 'Niveau 9 — trois caisses'
            : n === 21 ? 'Niveau 21 — quatre caisses'
                : n === 37 ? 'Niveau 37 — cinq caisses'
                    : n === 45 ? 'Niveau 45 — il faut vraiment chercher'
                        : n === 50 ? 'Niveau 50 — expert' : `Niveau ${n}`;
    return { id: n, label: nom, min, max: min + 6, caisses: t.caisses, sol: t.sol, taille: t.taille };
}

export const NIVEAUX_POUSSEUR = Array.from({ length: 50 }, (_, i) => palierPousseur(i + 1));

export const niveauPousseurDe = (n) =>
    NIVEAUX_POUSSEUR.find(x => x.id === n) || NIVEAUX_POUSSEUR[0];

const DIRS = [{ dx: 0, dy: -1, nom: 'haut' }, { dx: 1, dy: 0, nom: 'droite' },
    { dx: 0, dy: 1, nom: 'bas' }, { dx: -1, dy: 0, nom: 'gauche' }];
export const DIRECTIONS = DIRS;

/**
 * LA ZONE OÙ LE POUSSEUR PEUT ALLER, sans rien pousser.
 *
 * Rendue comme un tableau de booléens, plus sa plus petite case — c'est elle
 * qui sert d'étiquette à la position tout entière.
 */
export function zone(plan, caisses, depart) {
    const { l, h, cases } = plan;
    const bloque = new Set(caisses);
    const vu = new Array(l * h).fill(false);
    if (bloque.has(depart) || cases[depart] === MUR) return { vu, min: depart };
    vu[depart] = true;
    let file = [depart], min = depart;
    while (file.length) {
        const suivante = [];
        for (const i of file) {
            const x = i % l, y = Math.floor(i / l);
            for (const d of DIRS) {
                const nx = x + d.dx, ny = y + d.dy;
                if (nx < 0 || ny < 0 || nx >= l || ny >= h) continue;
                const j = ny * l + nx;
                if (vu[j] || cases[j] === MUR || bloque.has(j)) continue;
                vu[j] = true;
                if (j < min) min = j;
                suivante.push(j);
            }
        }
        file = suivante;
    }
    return { vu, min };
}

/** L'étiquette d'une position : les caisses, puis la zone du pousseur. */
export const cleEtat = (caisses, zoneMin) =>
    `${[...caisses].sort((a, b) => a - b).join(',')}|${zoneMin}`;

/** Gagné quand chaque caisse est sur un but. */
export const estRange = (plan, caisses) =>
    caisses.every(c => plan.cases[c] === BUT);

/**
 * LES POUSSÉES POSSIBLES depuis une position.
 *
 * Le pousseur doit pouvoir ATTEINDRE la case d'où l'on pousse — c'est là que
 * sert la zone — et la case derrière la caisse doit être libre.
 */
export function pousseesPossibles(plan, caisses, pousseur) {
    const { l, h, cases } = plan;
    const z = zone(plan, caisses, pousseur);
    const bloque = new Set(caisses);
    const coups = [];
    caisses.forEach((c, k) => {
        const x = c % l, y = Math.floor(c / l);
        DIRS.forEach((d, di) => {
            // Le pousseur se place à l'opposé du sens de la poussée.
            const px = x - d.dx, py = y - d.dy;
            const ax = x + d.dx, ay = y + d.dy;
            if (px < 0 || py < 0 || px >= l || py >= h) return;
            if (ax < 0 || ay < 0 || ax >= l || ay >= h) return;
            const p = py * l + px, a = ay * l + ax;
            if (!z.vu[p]) return;
            if (cases[a] === MUR || bloque.has(a)) return;
            coups.push({ k, de: c, vers: a, depuis: p, dir: di });
        });
    });
    return coups;
}

/** La poussée jouée : de nouvelles caisses, et le pousseur sur l'ancienne case. */
export function pousser(caisses, coup) {
    const suite = caisses.slice();
    suite[coup.k] = coup.vers;
    return { caisses: suite, pousseur: coup.de };
}

/**
 * LES TRACTIONS POSSIBLES — le mouvement inverse, celui qui fabrique le jeu.
 *
 * Le pousseur est en P, la caisse juste devant lui en P+u. Tirer, c'est reculer
 * en P−u en emmenant la caisse en P. Il faut donc que P−u soit praticable et
 * vide, et que le pousseur puisse ATTEINDRE P.
 */
function tractionsPossibles(plan, caisses, pousseurMin) {
    const { l, h, cases } = plan;
    const z = zone(plan, caisses, pousseurMin);
    const bloque = new Set(caisses);
    const coups = [];
    caisses.forEach((c, k) => {
        const x = c % l, y = Math.floor(c / l);
        for (const d of DIRS) {
            // La caisse est en `c` ; le pousseur se met en c−d, recule en c−2d.
            const px = x - d.dx, py = y - d.dy;
            const rx = x - 2 * d.dx, ry = y - 2 * d.dy;
            if (px < 0 || py < 0 || px >= l || py >= h) continue;
            if (rx < 0 || ry < 0 || rx >= l || ry >= h) continue;
            const p = py * l + px, r = ry * l + rx;
            if (cases[p] === MUR || bloque.has(p) || !z.vu[p]) continue;
            if (cases[r] === MUR || bloque.has(r)) continue;
            const suite = caisses.slice();
            suite[k] = p;
            coups.push({ caisses: suite, pousseur: r });
        }
    });
    return coups;
}

/**
 * TOUTES LES POSITIONS RÉSOLUBLES, ET LEUR DISTANCE À LA VICTOIRE.
 *
 * Un parcours en largeur à REBOURS, depuis la position gagnante. Chaque
 * position rencontrée est résoluble par construction, et sa profondeur est le
 * nombre minimum de poussées pour finir.
 */
export function explorerPousseur(plan, buts, depart, plafond = 120000) {
    const dist = new Map();
    const memoire = new Map();
    const ranger = (caisses, pousseur) => {
        const z = zone(plan, caisses, pousseur);
        return { cle: cleEtat(caisses, z.min), min: z.min };
    };

    let file = [];
    // La position gagnante : une caisse sur chaque but. Le pousseur peut être
    // n'importe où — on essaie toutes les cases libres, et chacune donne une
    // zone différente, donc une position de départ différente pour le retour.
    const libres = [];
    for (let i = 0; i < plan.cases.length; i++) {
        if (plan.cases[i] !== MUR && !buts.includes(i)) libres.push(i);
    }
    for (const p of libres) {
        const r = ranger(buts, p);
        if (dist.has(r.cle)) continue;
        dist.set(r.cle, 0);
        memoire.set(r.cle, { caisses: buts.slice(), pousseur: r.min });
        file.push({ caisses: buts.slice(), pousseur: r.min, cle: r.cle });
    }

    let d = 0;
    while (file.length) {
        d++;
        const suivante = [];
        for (const ici of file) {
            for (const t of tractionsPossibles(plan, ici.caisses, ici.pousseur)) {
                const r = ranger(t.caisses, t.pousseur);
                if (dist.has(r.cle)) continue;
                if (dist.size >= plafond) return { dist, memoire, maximum: d - 1 };
                dist.set(r.cle, d);
                memoire.set(r.cle, { caisses: t.caisses, pousseur: r.min });
                suivante.push({ caisses: t.caisses, pousseur: r.min, cle: r.cle });
            }
        }
        file = suivante;
    }
    void depart;
    return { dist, memoire, maximum: d - 1 };
}

/** Combien de poussées il reste au minimum, ou `null` si la position est perdue. */
export function pousseesRestantes(plan, table, caisses, pousseur) {
    const z = zone(plan, caisses, pousseur);
    const v = table.dist.get(cleEtat(caisses, z.min));
    return v === undefined ? null : v;
}

/**
 * LA POSITION EST-ELLE PERDUE ?
 *
 * C'est le service que le papier ne rend pas. Une caisse poussée dans un coin
 * ne bougera plus jamais, et le jeu continue pourtant de proposer des coups :
 * on peut s'acharner un quart d'heure sur une partie finie depuis le troisième
 * coup. La table le sait, elle : une position absente de la table n'est pas
 * résoluble.
 */
export const estPerdue = (plan, table, caisses, pousseur) =>
    pousseesRestantes(plan, table, caisses, pousseur) === null;

/** La prochaine poussée du plus court chemin. */
export function prochainePoussee(plan, table, caisses, pousseur) {
    const ici = pousseesRestantes(plan, table, caisses, pousseur);
    if (ici === null || ici === 0) return null;
    for (const c of pousseesPossibles(plan, caisses, pousseur)) {
        const suite = pousser(caisses, c);
        if (pousseesRestantes(plan, table, suite.caisses, suite.pousseur) === ici - 1) return c;
    }
    return null;
}

/**
 * LE CHEMIN À PIED du pousseur, d'une case à une autre, sans rien bouger.
 *
 * Rendu comme une suite de directions : c'est ce qui permet d'ANIMER le
 * déplacement au lieu de téléporter le personnage, et c'est ce qui rend
 * lisible ce qui vient de se passer.
 */
export function cheminAPied(plan, caisses, de, vers) {
    const { l, h, cases } = plan;
    const bloque = new Set(caisses);
    const vu = new Map([[de, null]]);
    let file = [de];
    while (file.length) {
        const suivante = [];
        for (const i of file) {
            if (i === vers) {
                const pas = [];
                let j = vers;
                while (vu.get(j) !== null) { pas.push(vu.get(j).dir); j = vu.get(j).de; }
                return pas.reverse();
            }
            const x = i % l, y = Math.floor(i / l);
            DIRS.forEach((d, di) => {
                const nx = x + d.dx, ny = y + d.dy;
                if (nx < 0 || ny < 0 || nx >= l || ny >= h) return;
                const j = ny * l + nx;
                if (vu.has(j) || cases[j] === MUR || bloque.has(j)) return;
                vu.set(j, { de: i, dir: di });
                suivante.push(j);
            });
        }
        file = suivante;
    }
    return null;
}

// --- La fabrication ---------------------------------------------------------------

/**
 * UNE SALLE CREUSÉE AU HASARD, mais d'un seul tenant.
 *
 * On part de la pierre pleine et l'on creuse par une marche aléatoire : la
 * salle est connexe par construction, et elle a la forme irrégulière des vrais
 * sokobans plutôt que celle d'un rectangle. Le bord reste toujours en mur —
 * sans quoi une caisse poussée dehors n'aurait aucun sens.
 */
function creuser(rng, taille, cases) {
    const l = taille, h = taille;
    const plan = new Array(l * h).fill(MUR);
    let x = Math.floor(l / 2), y = Math.floor(h / 2);
    plan[y * l + x] = SOL;
    let creusees = 1;
    let garde = 0;
    while (creusees < cases && garde++ < 600) {
        const d = rng.pick(DIRS);
        const nx = x + d.dx, ny = y + d.dy;
        // On garde une ceinture de murs tout autour.
        if (nx < 1 || ny < 1 || nx >= l - 1 || ny >= h - 1) continue;
        x = nx; y = ny;
        if (plan[y * l + x] === MUR) { plan[y * l + x] = SOL; creusees++; }
    }
    return { l, h, cases: plan, creusees };
}

/**
 * Un niveau prêt à jouer.
 *
 * @param {{niveau?: number, rng: object, essais?: number}} opts
 * @returns {{niveau: number, plan: object, buts: number[], caisses: number[],
 *            pousseur: number, mini: number, table: object}|null}
 */
export function creerPousseur({ niveau = 1, rng, essais = null }) {
    const n = niveauPousseurDe(niveau);
    // COMBIEN D'ESSAIS : autant qu'on peut s'en payer. Chaque essai explore
    // tout l'espace des positions ; sur les petits entrepôts c'est quelques
    // millisecondes et l'on peut se permettre d'en jeter quarante, sur les
    // gros c'est un demi-tiers de seconde et douze suffisent — sans quoi un
    // palier qui n'atteint jamais sa profondeur ferait attendre six secondes.
    const combien = essais || (n.caisses >= 5 ? 12 : n.caisses >= 4 ? 24 : 40);
    let meilleur = null;
    for (let essai = 0; essai < combien; essai++) {
        // Assez de sol pour les caisses, le pousseur, et de la place pour manœuvrer.
        // COMBIEN DE SOL ON CREUSE : c'est LA mesure de la difficulté, et
        // elle était liée au seul nombre de caisses. Or c'est le sol qui fait
        // la profondeur — plus il y a de chemin, plus il faut de poussées pour
        // ranger — et c'est lui qu'il faut pouvoir régler seul, sans ajouter
        // une caisse à chaque palier.
        const plan = creuser(rng, n.taille, n.sol || (n.caisses * 4 + 6));
        const sols = [];
        for (let i = 0; i < plan.cases.length; i++) if (plan.cases[i] === SOL) sols.push(i);
        if (sols.length < n.caisses * 3 + 2) continue;

        const buts = rng.shuffle(sols.slice()).slice(0, n.caisses);
        buts.forEach(i => { plan.cases[i] = BUT; });

        const table = explorerPousseur(plan, buts);
        if (table.maximum < 1) continue;
        const vise = Math.min(n.max, table.maximum);
        const candidats = [];
        table.dist.forEach((d, cle) => { if (d === vise) candidats.push(cle); });
        if (!candidats.length) continue;
        const pos = table.memoire.get(rng.pick(candidats));
        // UNE POSITION DE DÉPART OÙ TOUT EST DÉJÀ RANGÉ N'EST PAS UN NIVEAU.
        if (estRange(plan, pos.caisses)) continue;
        const jeu = {
            niveau: n.id, plan, buts,
            caisses: pos.caisses.slice(), pousseur: pos.pousseur,
            mini: vise, table
        };
        if (!meilleur || jeu.mini > meilleur.mini) meilleur = jeu;
        if (jeu.mini >= n.min) return jeu;
    }
    return meilleur;
}

/** De quoi juger une partie. */
export function qualitePousseur(mini, poussees) {
    return {
        mini, poussees,
        detours: Math.max(0, poussees - mini),
        parfait: poussees === mini
    };
}
