// LE SHIKAKU — découper une grille en rectangles d'aire donnée.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre, avec une capture d'écran : « Tu pourrais me créer ce jeu
// là ». Une grille 7 × 6, des rectangles de couleur déjà posés, des cases
// grises encore libres, un chronomètre.
//
// LA RÈGLE, en une phrase : découper TOUTE la grille en rectangles, chacun
// contenant exactement UN nombre, et ce nombre est l'AIRE du rectangle.
// Aucun chevauchement, aucune case laissée dehors.
//
// ── POURQUOI C'EST DES MATHÉMATIQUES, ET PAS SEULEMENT UN JEU ───────────────
//
// Pour poser le rectangle d'un 12, il faut savoir en combien de façons 12
// s'écrit comme produit de deux facteurs — 1 × 12, 2 × 6, 3 × 4 — c'est-à-dire
// connaître ses DIVISEURS. Puis choisir laquelle tient à cet endroit. Un
// nombre premier n'a qu'une forme (1 × p) : c'est une case offerte, et l'élève
// le découvre tout seul au bout de trois grilles. Diviseurs, décomposition en
// produit, aire du rectangle : trois notions de sixième dans un seul geste.
//
// ── COMMENT ON FABRIQUE UNE GRILLE ──────────────────────────────────────────
//
// À L'ENVERS, et c'est la seule façon sûre : on découpe d'abord, on numérote
// ensuite. Partir de nombres et chercher un découpage qui marche demanderait
// de résoudre le problème ; partir du découpage le donne.
//
// LA DÉCOUPE EST « À LA GUILLOTINE » : on coupe le rectangle entier en deux,
// puis chaque moitié, et ainsi de suite. Tout ce qu'on obtient est donc un
// rectangle, toujours, sans vérification. Ce procédé ne produit pas TOUS les
// pavages possibles — un moulin à quatre pales ne se coupe pas d'un trait —
// mais il en produit des milliers, et aucun d'eux n'est faux.
//
// LA SOLUTION EST UNIQUE, et c'est la promesse centrale : un élève ne doit
// jamais poser un découpage cohérent et s'entendre dire qu'il est faux. On
// compte donc les solutions avec un solveur ; tant qu'il y en a plusieurs, on
// recommence avec une autre découpe. Et s'il le faut, un filet : couper le
// plus grand rectangle en deux CONTRAINT la grille, et le cas limite — que
// des cases d'aire 1 — est unique par construction. La boucle finit toujours.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.shikaku';

/**
 * LES FORMATS, du plus petit au plus grand.
 *
 * La capture de Rémy montre un 7 × 6 — c'est le format « classique » ici. On
 * en met un plus petit avant (la règle s'apprend en quatre rectangles) et deux
 * plus grands après.
 *
 * ILS NE SONT PAS CARRÉS, et c'est voulu : dans une grille carrée, un 12 se
 * pose aussi bien couché que debout, et l'on ne regarde plus les bords. Un
 * rectangle oblige à compter la place qui reste.
 */
export const FORMATS = {
    // `max` EST L'AIRE LA PLUS GRANDE QU'ON S'AUTORISE sur ce format, en
    // difficulté maximale. Douze sur le format classique, parce que c'est le
    // nombre que montre la capture de Rémy — et parce que 12 est le plus petit
    // qui ait trois décompositions (1 × 12, 2 × 6, 3 × 4) : c'est lui qui fait
    // vraiment chercher.
    decouverte: { lignes: 5, colonnes: 5, max: 6, nom: 'Découverte — 5 × 5' },
    classique: { lignes: 6, colonnes: 7, max: 12, nom: 'Classique — 6 × 7' },
    grand: { lignes: 8, colonnes: 9, max: 15, nom: 'Grand — 8 × 9' },
    geant: { lignes: 10, colonnes: 10, max: 20, nom: 'Géant — 10 × 10' }
};

/**
 * L'AIRE DES RECTANGLES EST LE VRAI LEVIER DE DIFFICULTÉ.
 *
 * Un 2 ou un 3 n'a qu'une forme possible : on le pose sans réfléchir. Un 12
 * en a trois — 1 × 12, 2 × 6, 3 × 4 —, et c'est là que l'exercice commence.
 * Monter en difficulté, c'est donc faire GRANDIR les rectangles, pas en
 * ajouter.
 *
 * TROIS CHIFFRES, et le premier jet s'est trompé sur les trois. `plafond` est
 * la part de l'aire maximale du format qu'on s'autorise ; `plancher` est
 * l'aire au-dessous de laquelle on ne coupe plus — sans lui, la découpe
 * descendait jusqu'à la case seule et les grilles sortaient pavées de « 1 »
 * (mesuré : 362 cases seules sur douze grilles « difficile ») ; `part` est la
 * probabilité de s'ARRÊTER dès que l'aire tient sous le plafond, donc de
 * garder le rectangle le plus grand possible.
 */
const DIFFICULTES = {
    facile: { plafond: 0.6, plancher: 2, part: 0.5, difficulte: 1 },
    moyen: { plafond: 0.85, plancher: 2, part: 0.65, difficulte: 2 },
    difficile: { plafond: 1, plancher: 3, part: 0.8, difficulte: 3 }
};

// --- La découpe --------------------------------------------------------------

const aireDe = (r) => (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1);

/**
 * Coupe un rectangle en deux, encore et encore, jusqu'à ce qu'on s'arrête.
 *
 * ON NE S'ARRÊTE JAMAIS SUR UNE AIRE TROP GRANDE : le plafond est une
 * promesse faite à l'élève (« aucun nombre au-dessus de 9 »), pas un vœu.
 * Au-dessous, c'est le tirage qui décide — et c'est lui qui donne à deux
 * grilles du même réglage des allures différentes.
 */
function couper(rng, rec, plafond, plancher, part, dehors) {
    const h = rec.r1 - rec.r0 + 1;
    const w = rec.c1 - rec.c0 + 1;
    const aire = h * w;

    // OÙ PEUT-ON COUPER SANS FABRIQUER UN MORCEAU TROP PETIT ?
    //
    // C'est la question que le premier jet ne posait pas, et c'est elle qui
    // décide de tout. Couper une bande de largeur w à la k-ième ligne donne
    // (k+1) × w d'un côté, (h−1−k) × w de l'autre : pour que les deux tiennent
    // le plancher, il faut au moins `m` lignes de chaque côté. En deçà, ce
    // sens est interdit — et si les deux le sont, le rectangle part tel quel.
    const places = (long, large) => {
        const m = Math.ceil(plancher / large);
        return long >= 2 * m ? [m - 1, long - 1 - m] : null;
    };
    const sens = [];
    const ph = places(h, w); if (ph) sens.push(['h', ph]);
    const pv = places(w, h); if (pv) sens.push(['v', pv]);
    if (!sens.length) { dehors.push(rec); return; }
    // Sous le plafond, on s'arrête souvent : c'est ce qui garde les grands
    // rectangles, donc la recherche de diviseurs.
    if (aire <= plafond && rng.next() < part) { dehors.push(rec); return; }

    // ON COUPE PLUTÔT DANS LE SENS LE PLUS LONG. Sans cela, un 2 × 9 se coupe
    // en deux 1 × 9 : deux barres d'aire 9, qui ne sont ni jolies ni
    // intéressantes — un 9 qui ne peut être QUE 1 × 9 ne fait pas chercher.
    const [s, [lo, hi]] = sens.length === 1 ? sens[0]
        : (rng.next() < (h > w ? 0.75 : h < w ? 0.25 : 0.5)
            ? (ph ? sens[0] : sens[sens.length - 1])
            : (pv ? sens[sens.length - 1] : sens[0]));
    if (s === 'h') {
        const k = rec.r0 + rng.int(lo, hi);
        couper(rng, { ...rec, r1: k }, plafond, plancher, part, dehors);
        couper(rng, { ...rec, r0: k + 1 }, plafond, plancher, part, dehors);
    } else {
        const k = rec.c0 + rng.int(lo, hi);
        couper(rng, { ...rec, c1: k }, plafond, plancher, part, dehors);
        couper(rng, { ...rec, c0: k + 1 }, plafond, plancher, part, dehors);
    }
}

/**
 * Un pavage complet de la grille, en rectangles.
 *
 * LES CASES SEULES SONT COMPTÉES, et c'est le seul défaut de forme qu'on
 * surveille : un « 1 » ne demande rien, il désigne sa propre case. Une ou
 * deux par grille passent — elles servent même de point de départ ; une
 * grille qui en est pleine n'est plus un exercice.
 */
function pavage(rng, lignes, colonnes, plafond, plancher, part) {
    const dehors = [];
    couper(rng, { r0: 0, c0: 0, r1: lignes - 1, c1: colonnes - 1 },
        plafond, plancher, part, dehors);
    return dehors;
}

/**
 * OÙ S'ÉCRIT LE NOMBRE : dans une case quelconque de son rectangle.
 *
 * C'est ce que montre la capture de Rémy — le 5 est en haut de sa barre, un 9
 * au coin bas-droit de son carré. Le poser toujours en haut à gauche
 * donnerait un repère qui n'est pas dans la règle du jeu, et l'élève
 * s'habituerait à lire les coins au lieu de compter les cases.
 */
function placerLesNombres(rng, rects) {
    return rects.map((rec) => {
        const h = rec.r1 - rec.r0 + 1;
        const w = rec.c1 - rec.c0 + 1;
        return {
            r: rec.r0 + rng.int(0, h - 1),
            c: rec.c0 + rng.int(0, w - 1),
            n: h * w
        };
    });
}

// --- Le solveur, qui ne sert qu'à compter ------------------------------------

/**
 * TOUS LES RECTANGLES POSSIBLES POUR UN NOMBRE DONNÉ.
 *
 * Un rectangle convient s'il a la bonne aire, s'il contient SON nombre, et
 * s'il n'en contient AUCUN AUTRE — deux nombres dans un même rectangle est
 * précisément ce que la règle interdit.
 */
function candidatsDe(lignes, colonnes, indices, i) {
    const moi = indices[i];
    const possibles = [];
    for (let h = 1; h <= moi.n; h++) {
        if (moi.n % h) continue;
        const w = moi.n / h;
        if (h > lignes || w > colonnes) continue;
        // Le coin haut-gauche doit laisser le nombre dedans.
        for (let r0 = Math.max(0, moi.r - h + 1); r0 <= Math.min(moi.r, lignes - h); r0++) {
            for (let c0 = Math.max(0, moi.c - w + 1); c0 <= Math.min(moi.c, colonnes - w); c0++) {
                const r1 = r0 + h - 1, c1 = c0 + w - 1;
                let seul = true;
                for (let j = 0; j < indices.length && seul; j++) {
                    if (j === i) continue;
                    const a = indices[j];
                    if (a.r >= r0 && a.r <= r1 && a.c >= c0 && a.c <= c1) seul = false;
                }
                if (seul) possibles.push({ r0, c0, r1, c1 });
            }
        }
    }
    return possibles;
}

/**
 * Combien de découpages complets existe-t-il ? On s'arrête dès `limite`.
 *
 * ON CHOISIT TOUJOURS LE NOMBRE LE PLUS CONTRAINT — celui à qui il reste le
 * moins de rectangles possibles. C'est ce qui fait tenir le compte en
 * quelques millisecondes là où un parcours dans l'ordre mettrait des
 * secondes : la même idée que « commence par les cases où un seul chiffre est
 * encore possible », appliquée à la machine.
 */
export function compterSolutions(lignes, colonnes, indices, limite = 2) {
    const candidats = indices.map((_, i) => candidatsDe(lignes, colonnes, indices, i));
    // Un nombre sans aucun rectangle possible : la grille n'a pas de solution.
    if (candidats.some(l => !l.length)) return 0;

    const pris = Array.from({ length: lignes }, () => Array(colonnes).fill(-1));
    const fait = new Array(indices.length).fill(false);
    let trouvees = 0;

    const libre = (rec) => {
        for (let r = rec.r0; r <= rec.r1; r++) {
            for (let c = rec.c0; c <= rec.c1; c++) if (pris[r][c] !== -1) return false;
        }
        return true;
    };
    const marquer = (rec, v) => {
        for (let r = rec.r0; r <= rec.r1; r++) {
            for (let c = rec.c0; c <= rec.c1; c++) pris[r][c] = v;
        }
    };

    const explorer = (restants) => {
        if (trouvees >= limite) return;
        if (!restants) { trouvees++; return; }
        // Le plus contraint d'abord.
        let choisi = -1, moins = Infinity, liste = null;
        for (let i = 0; i < indices.length; i++) {
            if (fait[i]) continue;
            const ok = candidats[i].filter(libre);
            if (ok.length < moins) { moins = ok.length; choisi = i; liste = ok; }
            // Zéro possibilité : cette branche est morte, inutile de chercher
            // mieux.
            if (!moins) break;
        }
        if (!liste || !liste.length) return;
        fait[choisi] = true;
        for (const rec of liste) {
            if (!libre(rec)) continue;
            marquer(rec, choisi);
            explorer(restants - 1);
            marquer(rec, -1);
            if (trouvees >= limite) break;
        }
        fait[choisi] = false;
    };

    explorer(indices.length);
    return trouvees;
}

/**
 * LE FILET : couper le plus grand rectangle en deux, jusqu'à l'unicité.
 *
 * Il ne sert presque jamais — quarante tirages trouvent une grille unique
 * dans l'immense majorité des cas. Mais « presque jamais » n'est pas
 * « jamais », et une grille à deux solutions compterait faux un élève qui a
 * raison. Chaque coupe AJOUTE une contrainte ; au bout, toutes les cases
 * valent 1 et la grille est unique par construction. La boucle termine.
 */
function rendreUnique(rng, lignes, colonnes, rects) {
    let courant = rects.slice();
    for (let garde = 0; garde < lignes * colonnes; garde++) {
        const indices = placerLesNombres(rng, courant);
        if (compterSolutions(lignes, colonnes, indices, 2) === 1) return { rects: courant, indices };
        const i = courant.reduce((best, r, k) =>
            (aireDe(r) > aireDe(courant[best]) ? k : best), 0);
        const grosse = courant[i];
        if (aireDe(grosse) <= 1) break;
        const morceaux = [];
        // UNE SEULE COUPE, LA PLUS FINE POSSIBLE : plafond 1 et plancher 1
        // veulent dire « coupe tant que tu peux ». C'est le filet, pas le
        // tirage ordinaire — on ne cherche plus à faire joli, on cherche à
        // contraindre.
        couper(rng, grosse, 1, 1, 1, morceaux);
        courant = courant.slice(0, i).concat(morceaux, courant.slice(i + 1));
    }
    // Toutes les cases seules : unique, laid, et introuvable en pratique.
    const indices = placerLesNombres(rng, courant);
    return { rects: courant, indices };
}

// --- Le générateur -----------------------------------------------------------

/** Le découpage attendu, écrit d'une seule chaîne — voir l'activité. */
export const ecrireDecoupage = (rects) =>
    'k' + rects.map(r => `${r.r0}.${r.c0}.${r.r1}.${r.c1}`).join(';');

export const shikakuGenerator = {
    id: 'logique.shikaku',
    label: 'Shikaku',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille de la grille', default: 'classique',
            aide: 'La grille de la capture est un 6 × 7. La plus petite sert à comprendre la '
                + 'règle : quatre ou cinq rectangles, et c\'est fini.',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            // (Le « ? » dit ce que le réglage CHANGE, en deux phrases. Le
            // pourquoi — un 2 n'a qu'une forme, un 12 en a trois, et c'est la
            // recherche des diviseurs qui est l'exercice — appartient à ce
            // commentaire-ci.)
            aide: 'Elle change la TAILLE des rectangles, pas leur nombre. Un petit n\'a qu\'une '
                + 'forme possible ; un grand en a plusieurs, et il faut les chercher.',
            options: [
                { value: 'facile', label: 'Facile — beaucoup de petits rectangles' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile — de grands rectangles' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const format = FORMATS[p.format] || FORMATS.classique;
        const reglage = DIFFICULTES[p.difficulte] || DIFFICULTES.facile;
        const { lignes, colonnes } = format;
        const plafond = Math.max(4, Math.round(format.max * reglage.plafond));
        const plancher = reglage.plancher;

        // ── TROUVER UNE GRILLE À SOLUTION UNIQUE ───────────────────────────
        //
        // DEUX BOUCLES, ET LA SECONDE EST CELLE QUI MANQUAIT. Le pavage décide
        // des FORMES ; la position des nombres décide, elle, de ce qu'on peut
        // déduire — déplacer un 6 d'une case suffit à rendre unique une grille
        // qui ne l'était pas. Essayer huit positions sur un même pavage coûte
        // moins qu'un pavage neuf, et rapporte davantage.
        //
        // MESURÉ, ET C'EST CONTRE L'INTUITION : ce sont les grilles aux PETITS
        // rectangles qui peinent le plus à être uniques. Quatre cases avec deux
        // « 2 » se découpent dans les deux sens — deux dominos debout ou deux
        // dominos couchés —, et rien ne tranche. Un grand rectangle, lui, est
        // coincé par les bords. Le réglage « facile » est donc le plus coûteux
        // à engendrer, et il fallait l'apprendre à cette boucle : sur un 8 × 9,
        // quarante pavages d'un seul essai échouaient tous et l'on tombait dans
        // le filet, qui rendait une grille de 37 cases seules.
        let trouve = null;
        for (let essai = 0; essai < 60 && !trouve; essai++) {
            const rects = pavage(rng, lignes, colonnes, plafond, plancher, reglage.part);
            if (rects.length < 4) continue;
            for (let pose = 0; pose < 8 && !trouve; pose++) {
                const indices = placerLesNombres(rng, rects);
                if (compterSolutions(lignes, colonnes, indices, 2) === 1) {
                    trouve = { rects, indices };
                }
            }
        }
        if (!trouve) {
            trouve = rendreUnique(rng, lignes, colonnes,
                pavage(rng, lignes, colonnes, plafond, plancher, reglage.part));
        }

        // ORDRE DE LECTURE : de haut en bas, de gauche à droite. Il fixe le
        // numéro de chaque rectangle, donc l'écriture de la réponse — deux
        // découpages identiques doivent s'écrire pareil.
        const ordre = trouve.indices
            .map((ind, k) => ({ ind, rec: trouve.rects[k] }))
            .sort((a, b) => (a.rec.r0 - b.rec.r0) || (a.rec.c0 - b.rec.c0));
        const rects = ordre.map(o => o.rec);
        const indices = ordre.map(o => o.ind);

        const aireMax = Math.max(...indices.map(i => i.n));
        const consigne = 'Découpe toute la grille en rectangles : un seul nombre dans chacun, '
            + 'et ce nombre est son nombre de cases.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.shikaku',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: consigne,
                html: `<div class="game-question sk-consigne">${consigne}</div>`
            },
            answer: ecrireDecoupage(rects),
            hints: [
                'COMMENCE PAR LES NOMBRES PREMIERS — 2, 3, 5, 7, 11, 13. Ils n\'ont qu\'une '
                    + 'forme possible : une seule ligne ou une seule colonne de cases.',
                'Pour chaque nombre, cherche en combien de façons il s\'écrit « longueur × '
                    + 'largeur ». 12, c\'est 1 × 12, 2 × 6 ou 3 × 4 — et les bords de la grille '
                    + 'en éliminent souvent deux.',
                'Une case que personne ne peut atteindre appartient forcément au seul nombre '
                    + 'qui la touche : regarde les coins.'
            ],
            explanation: 'Chaque rectangle contient un seul nombre, et ce nombre est son aire : '
                + 'longueur × largeur. Toute la grille est couverte, sans chevauchement.',
            difficulty: reglage.difficulte + (format.lignes >= 8 ? 1 : 0),
            meta: {
                lignes, colonnes,
                // `indices` : les nombres écrits dans la grille, avec leur case.
                // `solution` : le rectangle de chacun, dans le même ordre.
                indices, solution: rects,
                aireMax, format: p.format || 'classique',
                difficulte: p.difficulte || 'facile',
                // CE QUI FAIT L'EXERCICE : les décompositions à chercher. Le
                // robot et l'indice s'en servent, et le bilan aussi.
                texteLecon: `Les nombres de cette grille vont jusqu'à ${aireMax} : `
                    + 'pour chacun, cherche toutes les façons de l\'écrire comme un produit '
                    + 'de deux facteurs.'
            }
        });
    }
};

export default shikakuGenerator;
