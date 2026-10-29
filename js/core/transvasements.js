// LES TRANSVASEMENTS — mesurer quatre litres avec un bidon de cinq et un de trois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « j'aime bien les transvasements […] il faudra faire du
// drag drop plutôt ». Le geste est donc UN SEUL : on prend un bidon et on le
// penche — sur un autre bidon pour verser, sur le robinet pour le remplir, sur
// l'évier pour le vider. C'est ce qu'on fait vraiment avec ses mains.
//
// ── CE QUE L'ÉLÈVE DÉCOUVRE EN VERSANT ─────────────────────────────────────
//
// Avec un bidon de 5 L et un de 3 L, on obtient 1, 2, 3, 4 et 5 litres — tout.
// Avec un de 4 L et un de 6 L, on n'obtiendra JAMAIS 3 litres, et l'on peut
// verser une heure. La frontière a un nom : **ce qu'on peut mesurer, ce sont
// exactement les multiples du PGCD des deux bidons**. L'élève ne l'apprend pas
// ici, il le rencontre — et ce sera du quatrième quand on le lui nommera.
//
// ON NE SERT DONC QUE DES ÉNIGMES RÉSOLUBLES, et cela se vérifie : chaque
// grille tirée est parcourue en largeur avant d'être servie, et l'on garde le
// nombre de coups de la plus courte solution. Un élève qui cherche ce qui
// n'existe pas n'apprend rien, il abandonne.
//
// ── CE FICHIER NE CONNAÎT NI LE DOM NI L'ÉCRAN ─────────────────────────────
//
// Il tire une énigme, dit si un geste est permis, et sait résoudre. L'écran
// verse, la fiche imprime, l'épreuve compte.

/** Le plus grand commun diviseur, par soustractions d'Euclide. */
export function pgcd(a, b) {
    let x = Math.abs(a), y = Math.abs(b);
    while (y) { const t = y; y = x % y; x = t; }
    return x;
}

/**
 * LES TROIS FAMILLES D'ÉNIGMES, et elles ne travaillent pas la même chose.
 *
 *   · `robinet` — deux bidons, un robinet, un évier. On peut remplir et vider
 *     à volonté : ce qui est atteignable est exactement l'ensemble des
 *     multiples du PGCD. C'est la version qu'on connaît tous.
 *   · `partage` — trois bidons, PAS de robinet, et tout le liquide est là au
 *     départ. Rien ne se perd : la somme reste constante, et c'est une
 *     contrainte d'un autre genre — on partage au lieu de mesurer.
 */
export const FAMILLES = { robinet: 'robinet', partage: 'partage' };

export const NIVEAUX = {
    1: {
        nom: '1 — Deux bidons et un robinet',
        famille: 'robinet',
        // Les paires sont PREMIÈRES ENTRE ELLES : le PGCD vaut 1, donc toute
        // cible entière est atteignable, et l'élève n'a jamais à se demander
        // si l'énigme a une solution. Les frontières viendront au niveau 2.
        paires: [[5, 3], [7, 4], [8, 3], [7, 5], [9, 4], [5, 2]]
    },
    2: {
        nom: '2 — Deux bidons, et la cible se mérite',
        famille: 'robinet',
        paires: [[9, 6], [8, 6], [12, 8], [10, 4], [12, 9], [10, 6]]
    },
    3: {
        nom: '3 — Partager, sans robinet',
        famille: 'partage',
        // Le classique : huit litres dans le grand, et il faut en faire deux
        // fois quatre. Rien n'entre, rien ne sort.
        triples: [[8, 5, 3], [10, 7, 3], [12, 7, 5], [10, 6, 4], [12, 8, 5]]
    }
};

/** L'état de départ d'une énigme : tout vide, ou le grand bidon plein. */
export function depart(caps, famille) {
    return famille === 'partage'
        ? caps.map((_, i) => (i === 0 ? caps[0] : 0))
        : caps.map(() => 0);
}

/**
 * LES GESTES POSSIBLES DEPUIS UN ÉTAT.
 *
 * Chacun rend `{ quoi, de, vers, etat }`. `quoi` vaut 'verser', 'remplir' ou
 * 'vider' — c'est exactement ce que l'écran propose au doigt, et rien d'autre
 * n'est jouable.
 */
export function gestes(etat, caps, famille) {
    const out = [];
    const n = caps.length;
    for (let i = 0; i < n; i++) {
        if (famille === 'robinet') {
            if (etat[i] < caps[i]) {
                const e = etat.slice(); e[i] = caps[i];
                out.push({ quoi: 'remplir', de: i, vers: -1, etat: e });
            }
            if (etat[i] > 0) {
                const e = etat.slice(); e[i] = 0;
                out.push({ quoi: 'vider', de: i, vers: -1, etat: e });
            }
        }
        for (let j = 0; j < n; j++) {
            if (i === j || etat[i] === 0 || etat[j] === caps[j]) continue;
            // ON VERSE JUSQU'À CE QUE L'UN SOIT VIDE OU L'AUTRE PLEIN, et c'est
            // toute la règle du jeu : il n'y a pas de demi-mesure, donc pas
            // d'estimation. C'est ce qui en fait un exercice d'arithmétique et
            // non d'adresse.
            const passe = Math.min(etat[i], caps[j] - etat[j]);
            const e = etat.slice();
            e[i] -= passe; e[j] += passe;
            out.push({ quoi: 'verser', de: i, vers: j, etat: e });
        }
    }
    return out;
}

/** Ce que donne un geste, ou null s'il n'est pas permis. */
export function appliquer(etat, caps, famille, quoi, de, vers) {
    const g = gestes(etat, caps, famille)
        .find(x => x.quoi === quoi && x.de === de && (quoi !== 'verser' || x.vers === vers));
    return g ? g.etat : null;
}

/** La cible est-elle atteinte ? Un bidon, n'importe lequel, la contient. */
export const atteint = (etat, cible) => etat.some(v => v === cible);

/**
 * LA PLUS COURTE SUITE DE GESTES, par parcours en largeur.
 *
 * On explore les états, pas les coups : il y en a au plus (a+1)(b+1), soit
 * quelques dizaines. C'est ce qui permet de GARANTIR qu'une énigme servie a
 * une solution, et de dire à l'élève en combien de coups elle se fait.
 */
export function resoudre(caps, cible, famille) {
    const debut = depart(caps, famille);
    if (atteint(debut, cible)) return [];
    const vus = new Set([debut.join(',')]);
    let file = [{ etat: debut, chemin: [] }];
    for (let profondeur = 0; profondeur < 40 && file.length; profondeur++) {
        const suivante = [];
        for (const { etat, chemin } of file) {
            for (const g of gestes(etat, caps, famille)) {
                const k = g.etat.join(',');
                if (vus.has(k)) continue;
                vus.add(k);
                const route = chemin.concat([g]);
                if (atteint(g.etat, cible)) return route;
                suivante.push({ etat: g.etat, chemin: route });
            }
        }
        file = suivante;
    }
    return null;
}

/** Toutes les quantités qu'on peut mesurer avec ces bidons. */
export function mesurables(caps, famille) {
    const out = new Set();
    const vus = new Set();
    let file = [depart(caps, famille)];
    vus.add(file[0].join(','));
    while (file.length) {
        const suivante = [];
        for (const etat of file) {
            etat.forEach(v => out.add(v));
            for (const g of gestes(etat, caps, famille)) {
                const k = g.etat.join(',');
                if (vus.has(k)) continue;
                vus.add(k);
                suivante.push(g.etat);
            }
        }
        file = suivante;
    }
    return [...out].sort((a, b) => a - b);
}

/**
 * UNE ÉNIGME RÉSOLUBLE, et le nombre de coups de sa plus courte solution.
 *
 * ON NE SERT JAMAIS UNE CIBLE TROP FACILE : la capacité d'un bidon s'obtient
 * en le remplissant, donc ce n'est pas une énigme. Et l'on écarte ce qui se
 * fait en moins de trois gestes, sans quoi le niveau 1 se résout avant d'avoir
 * compris la règle.
 */
export function tirerEnigme(rng, niveau = 1, rang = 0) {
    const n = NIVEAUX[niveau] ? niveau : 1;
    const def = NIVEAUX[n];
    const famille = def.famille;
    const liste = famille === 'partage' ? def.triples : def.paires;
    // ON TOURNE SUR LE RANG DE L'ÉNIGME, pas seulement sur le hasard. Mesuré
    // sur la fiche imprimée : deux énigmes tirées au sort sur une liste de six
    // donnaient DEUX FOIS « 5 L et 2 L » côte à côte, et une feuille qui pose
    // deux fois la même question ne se fait qu'une fois. Même correction que
    // pour les scénarios de La Traversée.
    const caps = liste[(rng.int(0, liste.length - 1) + rang) % liste.length].slice();

    const possibles = mesurables(caps, famille)
        .filter(v => v > 0 && !caps.includes(v));
    const candidats = [];
    for (const cible of possibles) {
        const route = resoudre(caps, cible, famille);
        if (route && route.length >= 3) candidats.push({ cible, coups: route.length });
    }
    // Le filet : une famille de capacités dont aucune cible ne tient la route
    // se redemande plutôt que de servir un écran impossible.
    if (!candidats.length) return tirerEnigme(rng, n, rang + 1);
    // LA CIBLE TOURNE AUSSI SUR LE RANG : tirée au sort seule, elle sortait
    // deux fois « il faut 1 L » sur la même feuille, avec des bidons pourtant
    // différents. Deux fois la même question se fait une fois.
    const choisi = candidats[(rng.int(0, candidats.length - 1) + rang) % candidats.length];
    return {
        caps, famille, cible: choisi.cible, minimum: choisi.coups,
        depart: depart(caps, famille),
        pgcd: famille === 'robinet' ? pgcd(caps[0], caps[1]) : 0
    };
}
