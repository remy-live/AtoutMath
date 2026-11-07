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
        // L'ÉNIGME D'OUVERTURE EST LA PLUS CÉLÈBRE DE TOUTES : quatre litres
        // avec un bidon de cinq et un de trois.
        //
        // RÉMY, 29 octobre : « Tu as mis aussi l'énigme comment faire 4 litres
        // avec un seau de 3 et un seau de 5 litres ». Elle y était — et elle
        // sortait UNE FOIS SUR DOUZE, mesuré sur soixante tirages. Pour
        // n'importe quelle autre, ce serait bien ; pour celle-là, non : c'est
        // celle que l'élève a peut-être déjà entendue, et c'est surtout celle
        // qui montre les trois gestes en six coups — remplir le 5, le verser
        // dans le 3, il reste 2 ; vider le 3, y mettre les 2 ; remplir le 5,
        // compléter le 3 avec 1, il reste 4.
        //
        // ON N'ÉCRIT PAS SA SOLUTION POUR AUTANT : le nombre de gestes reste
        // calculé par le parcours en largeur, comme pour toutes les autres.
        ouverture: { caps: [5, 3], cible: 4 },
        // Les paires sont PREMIÈRES ENTRE ELLES : le PGCD vaut 1, donc toute
        // cible entière est atteignable, et l'élève n'a jamais à se demander
        // si l'énigme a une solution. Les frontières viendront au niveau 2.
        paires: [[5, 3], [7, 4], [8, 3], [7, 5], [9, 4], [5, 2]]
    },
    2: {
        nom: '2 — Deux bidons, et la cible se mérite',
        famille: 'robinet',
        // DEUX DE CES FAMILLES NE PORTAIENT AUCUNE ÉNIGME, et personne ne
        // l'avait vu : avec 9 L et 6 L on ne mesure que des multiples de 3,
        // donc la seule cible possible est 3 L — et elle s'obtient en DEUX
        // gestes, sous le seuil. Idem pour 12 L et 8 L. Elles figuraient dans
        // la liste, n'étaient jamais servies, et faisaient croire à six
        // familles là où il n'y en avait que quatre : une feuille de six
        // blocs devait donc en répéter. Remplacées, et une garde compte
        // maintenant les énigmes de chaque famille.
        //
        // Les capacités restent sous douze litres : un bidon se dessine à
        // hauteur de sa capacité, et quinze litres font 416 px sur un
        // téléphone — la moitié de l'écran pour un seul bidon.
        paires: [[8, 6], [10, 4], [12, 9], [10, 6], [10, 8], [12, 10], [12, 2], [10, 2]]
    },
    3: {
        nom: '3 — Partager, sans robinet',
        famille: 'partage',
        // Le classique : huit litres dans le grand, et il faut en faire deux
        // fois quatre. Rien n'entre, rien ne sort.
        //
        // HUIT FAMILLES, PAS CINQ : une feuille de six blocs n'en avait que
        // cinq à se partager et devait en répéter une. Les trois ajoutées
        // vérifient la même condition que les autres — le petit et le moyen
        // réunis contiennent au moins le grand, sinon le grand ne se vide
        // jamais et le jeu se bloque.
        triples: [
            [8, 5, 3], [10, 7, 3], [12, 7, 5], [10, 6, 4],
            [12, 8, 5], [9, 5, 4], [11, 7, 4], [12, 9, 5]
        ]
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
export function tirerEnigme(rng, niveau = 1, rang = 0, dejaVues = []) {
    const n = NIVEAUX[niveau] ? niveau : 1;
    const def = NIVEAUX[n];
    const famille = def.famille;

    // LA PREMIÈRE ÉNIGME EST CELLE QU'ON RACONTE. Elle est servie telle quelle
    // au rang zéro ; la rotation habituelle reprend au rang suivant.
    if (rang === 0 && def.ouverture) {
        const { caps, cible } = def.ouverture;
        const route = resoudre(caps, cible, famille);
        return {
            caps: caps.slice(), famille, cible, minimum: route.length,
            depart: depart(caps, famille), pgcd: pgcd(caps[0], caps[1])
        };
    }
    const liste = famille === 'partage' ? def.triples : def.paires;

    // ── DEUX FOIS LA MÊME ÉNIGME SUR UNE FEUILLE ───────────────────────────
    //
    // La feuille tire UNE GRAINE PAR BLOC. Tourner sur le rang ne suffit donc
    // pas : deux blocs dont les tirages diffèrent du bon écart retombent sur
    // la même paire ET sur la même cible. Mesuré sur deux cents feuilles de
    // quatre énigmes : 82 % en portaient deux fois la même quantité, et
    // « 5/3 → 4 » apparaissait DEUX FOIS sur la même page.
    //
    // `dejaVues` PORTE CE QUE LA FEUILLE A DÉJÀ POSÉ, par le canal
    // `themesExclus` que les fiches tiennent ouvert depuis les logigrammes.
    // Chaque entrée dit les bidons ET la quantité : « 5-3:4 ». On s'en sert
    // deux fois — pour ne pas redessiner les mêmes bidons, et pour ne pas
    // redemander la même quantité, qui sont deux gênes distinctes. La seconde
    // était déjà connue : « il faut 1 L » sortait deux fois sur une feuille,
    // avec des bidons pourtant différents.
    const paireVues = new Set(dejaVues.map(x => String(x).split(':')[0]));
    const cibleVues = new Set(dejaVues.map(x => String(x).split(':')[1]).filter(Boolean));

    // LE CHOIX DES BIDONS ET CELUI DE LA CIBLE NE SONT PAS SÉPARABLES : des
    // bidons dont aucune quantité ne demande trois gestes ne doivent pas être
    // choisis du tout. On les cherchait séparément, et le filet se rappelait
    // alors lui-même avec le rang suivant — ce qui RECOMMENÇAIT LE MÊME CHOIX
    // et débordait la pile. L'épreuve de feuille l'a attrapé dès sa première
    // exécution ; aucune n'avait jamais parcouru la liste entière.
    const ciblesDe = (c) => mesurables(c, famille)
        .filter(v => v > 0 && !c.includes(v))
        .map(cible => ({ cible, coups: (resoudre(c, cible, famille) || []).length }))
        .filter(x => x.coups >= 3);

    const debut = (rng.int(0, liste.length - 1) + rang) % liste.length;
    let iPaire = -1, candidats = [];
    // Deux tours : au premier on saute les bidons que la feuille a déjà posés,
    // au second on ne saute plus rien — une énigme sort toujours.
    for (let tour = 0; tour < 2 && iPaire < 0; tour++) {
        for (let k = 0; k < liste.length; k++) {
            const j = (debut + k) % liste.length;
            if (tour === 0 && paireVues.has(liste[j].join('-'))) continue;
            const c = ciblesDe(liste[j]);
            if (!c.length) continue;
            iPaire = j; candidats = c; break;
        }
    }
    // Un niveau dont AUCUNE famille de bidons ne porte d'énigme est une erreur
    // de définition, pas un accident de tirage : on le dit tout haut plutôt
    // que de rendre une énigme fausse. Les épreuves parcourent les trois
    // niveaux, donc cette ligne ne se voit jamais en classe.
    if (iPaire < 0) throw new Error(`niveau ${n} : aucune énigme possible`);
    const caps = liste[iPaire].slice();

    // LA CIBLE NE SE TIRE PAS AU SORT NON PLUS : elle découle des bidons et du
    // rang, puis on avance jusqu'à une quantité que la feuille n'a pas encore
    // demandée. Si toutes l'ont été — une feuille longue finit par épuiser les
    // cinq ou six quantités mesurables —, on garde celle du rang plutôt que de
    // rendre une énigme impossible : les bidons, eux, diffèrent.
    const base = (iPaire + rang) % candidats.length;
    let choisi = candidats[base];
    for (let k = 0; k < candidats.length; k++) {
        const c = candidats[(base + k) % candidats.length];
        if (!cibleVues.has(String(c.cible))) { choisi = c; break; }
    }
    return {
        caps, famille, cible: choisi.cible, minimum: choisi.coups,
        depart: depart(caps, famille),
        pgcd: famille === 'robinet' ? pgcd(caps[0], caps[1]) : 0
    };
}
