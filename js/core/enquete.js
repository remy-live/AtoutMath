// L'ENQUÊTE — le noyau : une scène, des indices, et UNE seule solution.
//
// Rémy : « Connais tu aussi le jeu murdoku » puis « ne l'appelle pas comme cela ».
//
// Le Murdoku est un jeu de Manuel Garand, déposé, avec ses grilles et ses
// illustrations : on ne le copie pas. Le MÉCANISME, lui, appartient à la
// famille des grilles de déduction, qui est vieille comme les mathématiques
// récréatives — une bijection à retrouver sous contraintes. C'est ce mécanisme
// qu'on reprend, avec un décor de collège et un objet égaré plutôt qu'un
// meurtre : trente élèves de quatrième, ce n'est pas le public d'un roman noir.
//
// CE QUE L'ÉLÈVE APPREND ICI, et qu'aucun exercice de calcul ne lui demande :
//
//   · se repérer dans un quadrillage — rangée, colonne, coordonnées ;
//   · les quatre directions, et ce que « au nord de » veut dire quand on n'a
//     pas de boussole sous les yeux ;
//   · la distance de déplacement (deux cases à droite, une en bas : trois) ;
//   · et surtout DÉDUIRE : tirer d'un ensemble d'énoncés vrais la seule
//     configuration qui les satisfasse tous. C'est un raisonnement, pas une
//     recherche ; on ne l'obtient jamais en essayant plus vite.
//
// LA RÈGLE, EN DEUX PHRASES. Chaque personnage occupe une case, et il n'y en a
// qu'un par rangée et qu'un par colonne. Celui qui se retrouve dans le même
// lieu que l'objet égaré est celui qui l'a emporté.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA GARANTIE QUI FAIT TOUT LE RESTE : UNE SEULE SOLUTION.
//
// Une grille à deux solutions est pire qu'inutile : l'élève trouve une réponse
// juste, le logiciel la refuse, et il apprend que son raisonnement ne vaut
// rien. C'est exactement le contraire de ce qu'on veut lui enseigner.
//
// On ne s'en remet donc pas à la vraisemblance. On ÉNUMÈRE. Le nombre de
// placements possibles est n! × n! — 36 à trois personnages, 576 à quatre,
// 14 400 à cinq —, c'est-à-dire assez peu pour les compter tous, à chaque
// grille fabriquée, et vérifier qu'un seul survit aux indices. La grille n'est
// rendue que si ce compte vaut exactement un.
//
// ET ON EN RETIRE LE PLUS POSSIBLE. Un indice qui ne sert à rien n'est pas
// neutre : il allonge la lecture, il dilue l'attention, et il fait croire à
// l'élève qu'il a raté quelque chose. Après avoir atteint l'unicité, on essaie
// donc d'ôter chaque indice à son tour : s'il en reste une seule solution sans
// lui, il part.

import { makeRng } from './ids.js';

// ─────────────────────────────────────────────────────────── LES SCÈNES ─────
//
// Les lieux sont dessinés à la main, et pas tirés au sort. Un découpage
// aléatoire donne des « pièces » de une case ou en forme d'escalier, dont on ne
// peut rien dire en français : « Léa est dans le lieu C » n'apprend rien à
// personne. Un couloir qui traverse, une cour dans un coin, une salle carrée :
// voilà des choses qu'on peut nommer, et donc dont on peut parler.
//
// Chaque scène donne : la taille, le plan des lieux (une lettre par case), le
// nom de chaque lettre, et les repères — meubles ou objets fixes dont les
// indices peuvent parler.

export const SCENES = [
    {
        id: 'recre3',
        taille: 3,
        titre: 'La récréation',
        objet: 'le ballon',
        histoire: 'Le ballon du gymnase a disparu pendant la récréation.',
        plan: [
            'CCP',
            'CCP',
            'HHP'
        ],
        lieux: { C: 'la cour', P: 'le préau', H: 'le hall' },
        reperes: [{ case: [1, 1], nom: 'le marronnier' }]
    },
    {
        id: 'college4',
        taille: 4,
        titre: 'Le bâtiment B',
        objet: 'la trousse',
        histoire: 'Une trousse a été oubliée — puis emportée — entre deux cours.',
        plan: [
            'MMCC',
            'MMCC',
            'LLLD',
            'LLLD'
        ],
        lieux: { M: 'la salle de maths', C: 'le CDI', L: 'le couloir', D: 'le bureau' },
        reperes: [{ case: [0, 0], nom: 'le tableau' }, { case: [3, 3], nom: 'la photocopieuse' }]
    },
    {
        id: 'cantine5',
        taille: 5,
        titre: 'L\'heure du déjeuner',
        objet: 'le carnet',
        histoire: 'Le carnet de correspondance de quelqu\'un a disparu à midi.',
        plan: [
            'RRRCC',
            'RRRCC',
            'HHHHH',
            'GGGSS',
            'GGGSS'
        ],
        lieux: {
            R: 'le réfectoire', C: 'la cuisine', H: 'le hall',
            G: 'le gymnase', S: 'les vestiaires'
        },
        reperes: [
            { case: [0, 0], nom: 'le distributeur d\'eau' },
            { case: [2, 2], nom: 'l\'horloge' },
            { case: [4, 4], nom: 'le banc' }
        ]
    }
];

/** Les prénoms des personnages. Mixtes, courants, et sans homonymie sonore. */
const PRENOMS = ['Léa', 'Malik', 'Chloé', 'Ismaël', 'Jade', 'Théo', 'Anaïs', 'Noé'];

/**
 * « DE LE TABLEAU » NE SE DIT PAS.
 *
 * Les repères et les lieux portent leur article — « le tableau », « la
 * photocopieuse », « l'horloge », « les vestiaires » —, parce qu'on en a besoin
 * partout ailleurs. Reste à les contracter quand ils suivent « de », faute de
 * quoi l'énoncé dit « plus près de le tableau » : une faute d'école dans un
 * logiciel d'école, et c'est l'élève qui la lit.
 */
export function deL(nom) {
    const t = String(nom || '');
    if (/^les /i.test(t)) return 'des ' + t.slice(4);
    if (/^le /i.test(t)) return 'du ' + t.slice(3);
    if (/^la /i.test(t)) return 'de ' + t;
    if (/^l'/i.test(t) || /^l\u2019/.test(t)) return 'de ' + t;
    return 'de ' + t;
}

// ────────────────────────────────────────────── LA GÉOMÉTRIE DE LA SCÈNE ────

export const NORD = 'nord';
export const SUD = 'sud';
export const EST = 'est';
export const OUEST = 'ouest';

/**
 * LE NORD EST EN HAUT, ET C'EST UNE CONVENTION QU'ON ÉCRIT.
 *
 * Sur une carte, le nord est en haut ; dans un tableau, la rangée 1 est en
 * haut. Les deux coïncident, mais un élève qui pense « nord = vers le haut de
 * MA feuille » se trompera le jour où le plan est tourné. On affiche donc une
 * rose des vents à côté de la grille, et ici on s'en tient à : nord = rangée
 * plus petite.
 */
export function estDansLaDirection(a, b, dir) {
    if (dir === NORD) return a.r < b.r;
    if (dir === SUD) return a.r > b.r;
    if (dir === OUEST) return a.c < b.c;
    if (dir === EST) return a.c > b.c;
    return false;
}

/** La distance de déplacement : on ne marche pas en diagonale dans un couloir. */
export function distance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

export function sontVoisins(a, b) {
    return distance(a, b) === 1;
}

export function estAuBord(a, taille) {
    return a.r === 0 || a.c === 0 || a.r === taille - 1 || a.c === taille - 1;
}

/** La lettre du lieu d'une case. */
export function lieuDe(scene, cell) {
    return scene.plan[cell.r][cell.c];
}

// ───────────────────────────────────────────────────── LES PLACEMENTS ───────

/**
 * UN PLACEMENT EST UN COUPLE DE PERMUTATIONS.
 *
 * « Un personnage par rangée et un par colonne » veut dire exactement ceci :
 * les rangées occupées sont toutes différentes, les colonnes aussi. Le
 * personnage k est donc en (rangées[k], colonnes[k]) où les deux listes sont
 * des permutations de 0…n-1. C'est la forme la plus courte, et c'est surtout
 * celle qui rend l'énumération triviale — donc la garantie d'unicité possible.
 *
 * @returns {{r:number,c:number}[]} une case par personnage
 */
export function placementDe(rangees, colonnes) {
    return rangees.map((r, k) => ({ r, c: colonnes[k] }));
}

/** Toutes les permutations de 0…n-1. n ≤ 5 : au plus 120. */
export function permutations(n) {
    if (n <= 0) return [[]];
    const out = [];
    const cour = [];
    const pris = new Array(n).fill(false);
    (function creuser() {
        if (cour.length === n) { out.push([...cour]); return; }
        for (let i = 0; i < n; i++) {
            if (pris[i]) continue;
            pris[i] = true; cour.push(i);
            creuser();
            cour.pop(); pris[i] = false;
        }
    })();
    return out;
}

/**
 * TOUS LES PLACEMENTS POSSIBLES, ÉNUMÉRÉS.
 *
 * n! × n' : 36 à trois personnages, 576 à quatre, 14 400 à cinq. On ne fabrique
 * la liste qu'une fois par taille et on la garde — elle ne dépend que de n, et
 * la fabriquer à chaque appel coûterait cher pendant la minimisation, qui teste
 * les indices un par un.
 */
const memoire = new Map();

export function tousLesPlacements(n) {
    if (memoire.has(n)) return memoire.get(n);
    const perms = permutations(n);
    const out = [];
    for (const rangees of perms) {
        for (const colonnes of perms) {
            out.push(placementDe(rangees, colonnes));
        }
    }
    memoire.set(n, out);
    return out;
}

// ─────────────────────────────────────────────────────── LES INDICES ────────
//
// Chaque indice sait deux choses, et uniquement deux : TESTER un placement, et
// se DIRE en français. Rien d'autre — pas de mise en page, pas de couleur. Un
// indice qui saurait s'afficher serait un indice qu'on ne peut plus imprimer
// autrement, et cette grille a vocation à sortir sur papier.

/** « au nord », mais « à l'est ». La suite est collée par `dePrenom`. */
const VERS = {
    nord: 'au nord', sud: 'au sud',
    est: "à l'est", ouest: "à l'ouest"
};

/**
 * « DE ISMAËL » NE SE DIT PAS DAVANTAGE.
 *
 * Deux des huit prénoms commencent par une voyelle — Ismaël, Anaïs — et
 * l'élision n'est pas une coéquetterie : c'est la règle que le même élève
 * apprend en français le même trimestre. Un énoncé de mathématiques n'a pas
 * le droit de l'enfreindre sous prétexte qu'il parle d'autre chose.
 */
export function dePrenom(nom) {
    const t = String(nom || '');
    return /^[aeiou\u00e9\u00e8\u00ea\u00e0\u00e2\u00ee\u00ef\u00f4\u00f6\u00fb\u00fc\u00e4h]/i.test(t) ? "d'" + t : 'de ' + t;
}

const FABRIQUES = {
    direction: (i, sc) => ({
        teste: (p) => estDansLaDirection(p[i.a], p[i.b], i.dir),
        // « au ouest », « au est » : deux fautes que la machine ne voit pas et
        // que l'élève lit. L'article se contracte devant une consonne, s'élide
        // devant une voyelle — et « nord » et « sud » ne sont pas dans le même
        // cas que « est » et « ouest ».
        dit: (noms) => `${noms[i.a]} est ${VERS[i.dir]} ${dePrenom(noms[i.b])}.`,
        parle: [i.a, i.b]
    }),
    voisin: (i) => ({
        teste: (p) => sontVoisins(p[i.a], p[i.b]),
        dit: (noms) => `${noms[i.a]} est juste à côté ${dePrenom(noms[i.b])} `
            + '(par un côté, pas en diagonale).',
        parle: [i.a, i.b]
    }),
    pasVoisin: (i) => ({
        teste: (p) => !sontVoisins(p[i.a], p[i.b]),
        dit: (noms) => `${noms[i.a]} n'est pas à côté ${dePrenom(noms[i.b])}.`,
        parle: [i.a, i.b]
    }),
    ecart: (i) => ({
        teste: (p) => distance(p[i.a], p[i.b]) === i.d,
        dit: (noms) => `Il faut exactement ${i.d} pas pour aller ${dePrenom(noms[i.a])} `
            + `à ${noms[i.b]} (sans couper en diagonale).`,
        parle: [i.a, i.b]
    }),
    dansLieu: (i, sc) => ({
        teste: (p) => lieuDe(sc, p[i.a]) === i.lieu,
        dit: (noms) => `${noms[i.a]} est dans ${sc.lieux[i.lieu]}.`,
        parle: [i.a]
    }),
    pasDansLieu: (i, sc) => ({
        teste: (p) => lieuDe(sc, p[i.a]) !== i.lieu,
        dit: (noms) => `${noms[i.a]} n'est pas dans ${sc.lieux[i.lieu]}.`,
        parle: [i.a]
    }),
    memeLieu: (i, sc) => ({
        teste: (p) => lieuDe(sc, p[i.a]) === lieuDe(sc, p[i.b]),
        dit: (noms) => `${noms[i.a]} et ${noms[i.b]} sont dans le même lieu.`,
        parle: [i.a, i.b]
    }),
    pasMemeLieu: (i, sc) => ({
        teste: (p) => lieuDe(sc, p[i.a]) !== lieuDe(sc, p[i.b]),
        dit: (noms) => `${noms[i.a]} et ${noms[i.b]} ne sont pas dans le même lieu.`,
        parle: [i.a, i.b]
    }),
    pres: (i, sc) => ({
        teste: (p) => sontVoisins(p[i.a], { r: i.repere[0], c: i.repere[1] }),
        dit: (noms) => `${noms[i.a]} est juste à côté ${deL(i.nom)}.`,
        parle: [i.a]
    }),
    bord: (i, sc) => ({
        teste: (p) => estAuBord(p[i.a], sc.taille) === i.oui,
        dit: (noms) => i.oui
            ? `${noms[i.a]} est contre un mur (une case du bord).`
            : `${noms[i.a]} n'est contre aucun mur.`,
        parle: [i.a]
    }),
    plusPres: (i, sc) => ({
        teste: (p) => distance(p[i.a], { r: i.repere[0], c: i.repere[1] })
            < distance(p[i.b], { r: i.repere[0], c: i.repere[1] }),
        dit: (noms) => `${noms[i.a]} est plus près ${deL(i.nom)} que ${noms[i.b]}.`,
        parle: [i.a, i.b]
    })
};

/** Donne à un indice brut ses deux capacités : tester, et se dire. */
export function armer(brut, scene) {
    const f = FABRIQUES[brut.type];
    if (!f) throw new Error('indice inconnu : ' + brut.type);
    return { ...brut, ...f(brut, scene) };
}

// ──────────────────────────────────────────────── FABRIQUER UNE ÉNIGME ──────

/** Tous les indices VRAIS qu'on peut énoncer sur ce placement-là. */
function indicesVraisPour(scene, solution, nb, rng, lieuInterdit = null) {
    const bruts = [];
    const n = nb;
    for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
            if (a === b) continue;
            for (const dir of [NORD, SUD, EST, OUEST]) {
                if (estDansLaDirection(solution[a], solution[b], dir)) {
                    bruts.push({ type: 'direction', a, b, dir });
                }
            }
            if (a < b) {
                const d = distance(solution[a], solution[b]);
                bruts.push(d === 1 ? { type: 'voisin', a, b } : { type: 'pasVoisin', a, b });
                if (d >= 2) bruts.push({ type: 'ecart', a, b, d });
                const meme = lieuDe(scene, solution[a]) === lieuDe(scene, solution[b]);
                bruts.push({ type: meme ? 'memeLieu' : 'pasMemeLieu', a, b });
            }
        }
        // ON N'ÉNONCE JAMAIS « X EST DANS <le lieu de l'objet> ».
        //
        // Ce serait un indice vrai, minimal, et il donnerait la réponse en une
        // ligne : l'objet est dans les vestiaires, quelqu'un est dans les
        // vestiaires, l'enquête est close avant d'avoir commencé. Mesuré sur la
        // scène à cinq, où il est sorti dès la première grille tirée.
        //
        // Les autres lieux, eux, restent énonçables : c'est par élimination que
        // l'élève doit arriver au dernier.
        if (lieuDe(scene, solution[a]) !== lieuInterdit) {
            bruts.push({ type: 'dansLieu', a, lieu: lieuDe(scene, solution[a]) });
        }
        bruts.push({ type: 'bord', a, oui: estAuBord(solution[a], scene.taille) });
        for (const lettre of Object.keys(scene.lieux)) {
            // NI « X N'EST PAS DANS <le lieu de l'objet> » NON PLUS.
            //
            // Pris séparément c'est un indice honnête. Mis bout à bout, c'est la
            // réponse : sur la scène à trois, « Léa n'est pas dans le préau » et
            // « Malik n'est pas dans le préau » désignent Jade sans qu'on ait
            // placé personne. Mesuré : c'est exactement ce qui est sorti de la
            // première grille ouverte par un code dicté.
            //
            // AUCUN INDICE NE PARLE DONC DU LIEU DE L'OBJET, dans un sens ni
            // dans l'autre. Le coupable ne s'obtient qu'en plaçant tout le
            // monde, puis en lisant le plan — les deux temps du jeu.
            if (lettre === lieuInterdit) continue;
            if (lettre !== lieuDe(scene, solution[a])) {
                bruts.push({ type: 'pasDansLieu', a, lieu: lettre });
            }
        }
        for (const rep of scene.reperes) {
            if (sontVoisins(solution[a], { r: rep.case[0], c: rep.case[1] })) {
                bruts.push({ type: 'pres', a, repere: rep.case, nom: rep.nom });
            }
            for (let b = 0; b < n; b++) {
                if (a === b) continue;
                const da = distance(solution[a], { r: rep.case[0], c: rep.case[1] });
                const db = distance(solution[b], { r: rep.case[0], c: rep.case[1] });
                if (da < db) bruts.push({ type: 'plusPres', a, b, repere: rep.case, nom: rep.nom });
            }
        }
    }
    return rng.shuffle(bruts).map(b => armer(b, scene));
}

/** Combien de placements survivent à cette liste d'indices. S'arrête à `assez`. */
export function compterSolutions(scene, indices, nbPersonnages, assez = 2) {
    const tous = tousLesPlacements(nbPersonnages);
    let n = 0;
    for (const p of tous) {
        let bon = true;
        for (const i of indices) {
            if (!i.teste(p)) { bon = false; break; }
        }
        if (bon && ++n >= assez) return n;
    }
    return n;
}

/** Les placements qui survivent — utilisé par l'aide, jamais par la fabrique. */
export function solutionsPossibles(scene, indices, nbPersonnages, filtre = null) {
    return tousLesPlacements(nbPersonnages).filter(p => {
        if (filtre && !filtre(p)) return false;
        return indices.every(i => i.teste(p));
    });
}

/**
 * FABRIQUER UNE ÉNIGME QUI A UNE SEULE SOLUTION.
 *
 * On empile des indices vrais jusqu'à ce qu'il n'en reste qu'une, puis on
 * retire tout ce qui ne servait pas. La boucle d'ajout s'arrête forcément :
 * la liste des indices vrais contient de quoi désigner chaque personnage
 * individuellement (« X est dans tel lieu », « X est au nord de Y », …).
 *
 * ON N'ACCEPTE QUE SI UN SEUL PERSONNAGE PARTAGE LE LIEU DE L'OBJET. Sans
 * cela, la question finale — « qui l'a emporté ? » — aurait deux réponses
 * justes, et l'on retomberait dans le défaut qu'on vient de fermer.
 */
export function genererEnquete(options = {}) {
    const rng = options.rng || makeRng(options.seed);
    const scene = options.scene
        || SCENES.find(s => s.id === options.sceneId)
        || SCENES[Math.min(SCENES.length - 1, Math.max(0, (Number(options.niveau) || 1) - 1))];
    const n = scene.taille;
    const noms = rng.shuffle(PRENOMS).slice(0, n);

    // On réessaie tant que la scène tirée ne se prête pas à une question
    // unique. En pratique une ou deux tentatives suffisent ; la borne est là
    // pour qu'un jour de malchance ne fige pas l'écran.
    for (let essai = 0; essai < 60; essai++) {
        const rangees = rng.shuffle([...Array(n).keys()]);
        const colonnes = rng.shuffle([...Array(n).keys()]);
        const solution = placementDe(rangees, colonnes);

        // L'objet est posé dans un lieu occupé par UN SEUL personnage.
        const parLieu = {};
        solution.forEach((cell, k) => {
            const L = lieuDe(scene, cell);
            (parLieu[L] = parLieu[L] || []).push(k);
        });
        const seuls = Object.keys(parLieu).filter(L => parLieu[L].length === 1);
        if (!seuls.length) continue;
        const lieuDeLObjet = rng.pick(seuls);
        const coupable = parLieu[lieuDeLObjet][0];

        // On empile jusqu'à l'unicité…
        const reserve = indicesVraisPour(scene, solution, n, rng, lieuDeLObjet);
        const gardes = [];
        for (const candidat of reserve) {
            gardes.push(candidat);
            if (compterSolutions(scene, gardes, n) === 1) break;
        }
        if (compterSolutions(scene, gardes, n) !== 1) continue;

        // …puis on retire tout ce qui ne sert pas. On part de la fin : les
        // derniers ajoutés sont les plus spécifiques, donc les plus souvent
        // redondants avec l'effet cumulé des premiers.
        const minimal = [...gardes];
        for (let k = minimal.length - 1; k >= 0; k--) {
            const sans = minimal.filter((_, j) => j !== k);
            if (compterSolutions(scene, sans, n) === 1) minimal.splice(k, 1);
        }

        return {
            scene,
            noms,
            solution,
            indices: rng.shuffle(minimal),
            lieuDeLObjet,
            coupable,
            objet: scene.objet,
            histoire: scene.histoire
        };
    }
    throw new Error('aucune enquête n\'a pu être fabriquée pour cette scène');
}

// ───────────────────────────────────────────────────────── CORRIGER ─────────

/**
 * @param {object} enquete
 * @param {Array<{r:number,c:number}|null>} saisie  une case par personnage
 * @returns {{complet:boolean, juste:boolean, fautes:number[], reglesCassees:string[]}}
 */
export function verifierSaisie(enquete, saisie) {
    const n = enquete.noms.length;
    const complet = saisie.length === n && saisie.every(c => c && Number.isInteger(c.r));
    const fautes = [];
    for (let k = 0; k < n; k++) {
        const c = saisie[k];
        if (!c) continue;
        if (c.r !== enquete.solution[k].r || c.c !== enquete.solution[k].c) fautes.push(k);
    }
    // LES DEUX RÈGLES DE BASE SE DISENT À PART. « Tu as mis deux personnes dans
    // la même rangée » est une remarque qu'on peut faire AVANT de savoir si le
    // reste est juste, et c'est celle qui sert le plus : c'est l'erreur qu'on
    // fait en plaçant vite, et elle se voit sans rien déduire.
    const reglesCassees = [];
    const rangees = saisie.filter(Boolean).map(c => c.r);
    const colonnes = saisie.filter(Boolean).map(c => c.c);
    if (new Set(rangees).size !== rangees.length) {
        reglesCassees.push('Deux personnes sont dans la même rangée.');
    }
    if (new Set(colonnes).size !== colonnes.length) {
        reglesCassees.push('Deux personnes sont dans la même colonne.');
    }
    return { complet, juste: complet && !fautes.length && !reglesCassees.length,
             fautes, reglesCassees };
}

/** Les indices que la saisie actuelle contredit déjà. */
export function indicesContredits(enquete, saisie) {
    const place = saisie.every(c => c && Number.isInteger(c.r));
    if (!place) return [];
    return enquete.indices
        .map((ind, k) => (ind.teste(saisie) ? -1 : k))
        .filter(k => k >= 0);
}

/**
 * L'AIDE DONNE LA DÉDUCTION SUIVANTE, PAS LA RÉPONSE.
 *
 * Trois degrés, dans cet ordre, et l'on s'arrête au premier qui s'applique :
 *
 *   1. la saisie casse une règle de base — on le dit, sans parler des indices ;
 *   2. la saisie contredit un indice — on nomme lequel, et rien de plus ;
 *   3. tout est cohérent mais incomplet — on cherche un personnage dont la
 *      place est DÉJÀ forcée par ce qui est posé, et on nomme l'indice qui
 *      parle de lui. L'élève garde la déduction ; on ne lui rend que le fil.
 *
 * Le troisième degré s'obtient par énumération : on garde les placements
 * compatibles avec ce que l'élève a posé et avec tous les indices ; si tous
 * mettent un même personnage au même endroit, sa place est forcée.
 */
export function prochaineDeduction(enquete, saisie) {
    const n = enquete.noms.length;
    const v = verifierSaisie(enquete, saisie);
    if (v.reglesCassees.length) {
        return { degre: 'regle', texte: v.reglesCassees[0]
            + ' Rappelle-toi : un seul personnage par rangée, un seul par colonne.' };
    }

    const poses = [];
    for (let k = 0; k < n; k++) {
        if (saisie[k] && Number.isInteger(saisie[k].r)) poses.push(k);
    }

    // Un indice contredit par ce qui est DÉJÀ posé ? On ne teste que les
    // indices dont tous les personnages sont placés : les autres ne peuvent
    // rien contredire encore.
    for (let k = 0; k < enquete.indices.length; k++) {
        const ind = enquete.indices[k];
        if (!ind.parle.every(p => poses.includes(p))) continue;
        if (!ind.teste(saisie)) {
            return { degre: 'contredit', indice: k,
                texte: `L'indice n° ${k + 1} n'est pas respecté par ce que tu as posé. `
                    + 'Relis-le, et regarde ces deux personnages-là.' };
        }
    }

    if (v.juste) return { degre: 'fini', texte: 'Tout est en place. Qui a emport\u00e9 l\'objet ?' };

    // LES PLACEMENTS ENCORE POSSIBLES, COMPTE TENU DE CE QUI EST POS\u00c9.
    // On n'y applique PAS les indices : c'est justement le r\u00f4le de la recherche
    // qui suit que de trouver lesquels suffisent.
    const base = tousLesPlacements(n).filter(
        (p) => poses.every(k => p[k].r === saisie[k].r && p[k].c === saisie[k].c));
    if (!base.length) {
        return { degre: 'impossible',
            texte: 'Aucune grille ne peut plus contenir ce que tu as pos\u00e9 : une de tes cases '
                + 'est \u00e0 reprendre. Recompte les rang\u00e9es et les colonnes d\u00e9j\u00e0 occup\u00e9es.' };
    }

    // POUR CHAQUE INDICE, LA LISTE DES PLACEMENTS QU'IL LAISSE PASSER. On la
    // calcule une fois : la recherche ci-dessous croise ces listes des dizaines
    // de fois, et les recalculer \u00e0 chaque croisement co\u00fbterait cent fois plus.
    const masques = enquete.indices.map(ind => base.map(p => ind.teste(p)));

    /** Le personnage que ce paquet d'indices place tout seul, ou -1. */
    const forceParQui = (paquet) => {
        let cible = null;
        for (let x = 0; x < base.length; x++) {
            let ok = true;
            for (const j of paquet) { if (!masques[j][x]) { ok = false; break; } }
            if (!ok) continue;
            if (cible === null) { cible = base[x].map(c => ({ ...c })); continue; }
            for (let k = 0; k < n; k++) {
                if (cible[k] && (cible[k].r !== base[x][k].r || cible[k].c !== base[x][k].c)) {
                    cible[k] = null;
                }
            }
        }
        if (!cible) return -1;
        for (let k = 0; k < n; k++) {
            if (!poses.includes(k) && cible[k]) return k;
        }
        return -1;
    };

    // ON CHERCHE LE PAS LE PLUS COURT, ET C'EST TOUTE LA DIFF\u00c9RENCE.
    //
    // Avec TOUS les indices, chaque personnage est forc\u00e9 — l'\u00e9nigme n'a qu'une
    // solution, c'est la d\u00e9finition. Une aide qui r\u00e9pondrait « la place de Malik
    // est d\u00e9cid\u00e9e » ne dirait donc rien de plus que « cette grille se r\u00e9sout » :
    // vrai, et parfaitement inutile.
    //
    // Ce qu'un \u00e9l\u00e8ve bloqu\u00e9 veut savoir, c'est PAR QUOI COMMENCER. On cherche
    // donc le plus petit paquet d'indices qui suffise \u00e0 placer quelqu'un : un
    // seul indice d'abord, puis deux, puis trois. Au-del\u00e0, la d\u00e9duction n'est
    // plus \u00ab\u00a0suivante\u00a0\u00bb, elle est le probl\u00e8me entier.
    const m = enquete.indices.length;
    for (let taille = 1; taille <= Math.min(4, m); taille++) {
        const paquet = [];
        const creuser = (depuis) => {
            if (paquet.length === taille) {
                const k = forceParQui(paquet);
                return k >= 0 ? { k, paquet: [...paquet] } : null;
            }
            for (let j = depuis; j < m; j++) {
                paquet.push(j);
                const t = creuser(j + 1);
                paquet.pop();
                if (t) return t;
            }
            return null;
        };
        const trouve = creuser(0);
        if (!trouve) continue;
        const nums = trouve.paquet.map(j => 'n\u00b0 ' + (j + 1));
        const liste = nums.length === 1
            ? "L'indice " + nums[0]
            : 'Les indices ' + nums.slice(0, -1).join(', ') + ' et ' + nums[nums.length - 1];
        return {
            degre: 'force', personnage: trouve.k, indices: trouve.paquet,
            indice: trouve.paquet[0],
            texte: `${liste} ${nums.length === 1 ? 'suffit' : 'suffisent'} \u00e0 placer `
                + `${enquete.noms[trouve.k]}. Relis-${nums.length === 1 ? 'le' : 'les'} `
                + '\u2014 la case est d\u00e9j\u00e0 d\u00e9cid\u00e9e, sans rien deviner.'
        };
    }
    // RIEN N'EST FORCÉ EN QUATRE INDICES : ON MONTRE QUAND MÊME PAR OÙ COMMENCER.
    //
    // « Il faut tout croiser » est une réponse exacte et sans aucun usage : c'est
    // ce que l'élève savait déjà en cliquant. Or il reste toujours quelque chose
    // à dire — un indice qui, À LUI SEUL, ne laisse plus que deux ou trois cases
    // à quelqu'un. C'est le geste du logigramme : on n'écrit pas où la personne
    // est, on barre là où elle ne peut pas être. On désigne donc le couple
    // (indice, personnage) qui barre le plus.
    let mieux = null;
    for (let k = 0; k < n; k++) {
        if (poses.includes(k)) continue;
        // Ce que cette personne pourrait occuper SANS aucun indice : c'est à
        // cela qu'un indice doit être comparé pour qu'on puisse dire qu'il
        // « barre » quelque chose.
        const libre = new Set();
        for (let x = 0; x < base.length; x++) libre.add(base[x][k].r * 100 + base[x][k].c);
        for (let j = 0; j < m; j++) {
            if (!enquete.indices[j].parle.includes(k)) continue;
            const cases = new Set();
            for (let x = 0; x < base.length; x++) {
                if (masques[j][x]) cases.add(base[x][k].r * 100 + base[x][k].c);
            }
            if (!cases.size) continue;
            if (cases.size >= libre.size) continue;   // cet indice ne barre rien pour lui
            if (!mieux || cases.size < mieux.combien) {
                mieux = { k, j, combien: cases.size };
            }
        }
    }
    if (mieux) {
        return { degre: 'restreint', personnage: mieux.k, indice: mieux.j,
            texte: `Rien ne se place encore d'un coup. Mais l'indice n\u00b0 ${mieux.j + 1} `
                + `ne laisse d\u00e9j\u00e0 que ${mieux.combien} case${mieux.combien > 1 ? 's' : ''} `
                + `possible${mieux.combien > 1 ? 's' : ''} \u00e0 ${enquete.noms[mieux.k]} : `
                + 'barre toutes les autres, et reprends les indices avec \u00e7a en t\u00eate.' };
    }
    return { degre: 'continuer',
        texte: 'Aucun indice ne suffit \u00e0 lui seul : il faut les croiser. Prends deux indices '
            + 'qui parlent du m\u00eame personnage et regarde ce qui reste possible pour lui.' };
}

/** Les phrases des indices, prêtes à lire ou à imprimer. */
export function phrasesDesIndices(enquete) {
    return enquete.indices.map(i => i.dit(enquete.noms));
}

/** La question posée à la fin. */
export function laQuestion(enquete) {
    // PAS DE PARTICIPE PASSÉ ICI, ET C'EST VOULU. « On l'a retrouvé » s'accorde
    // avec l'objet — retrouvé, retrouvée, retrouvés —, ce qui obligerait à
    // porter le genre de chaque objet dans les scènes et à ne jamais l'oublier.
    // La tournure ci-dessous n'accorde rien : elle est juste pour tous.
    return `${enquete.histoire} On sait maintenant que ${enquete.objet} se trouvait dans `
        + `${enquete.scene.lieux[enquete.lieuDeLObjet]}. Qui était seul là-bas ?`;
}
