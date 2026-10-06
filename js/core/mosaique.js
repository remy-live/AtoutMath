// LA MOSAÏQUE DES TRANSFORMATIONS — et pourquoi elle se CONSTRUIT par elles.
//
// (Le nom « pavage » était déjà pris : `core/generators/pavage.js` porte depuis
// longtemps l'autre exercice de Rémy sur les pavages — « par rapport à QUOI ces
// deux pièces sont-elles symétriques ? ». Ce module-ci bâtit la grande mosaïque
// numérotée de sa fiche, celle où l'on demande l'IMAGE d'une pièce.)
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en envoyant la photo de sa fiche : « je sais que l'on a déjà un
// exercice sur les transformations mais tu pourrais refaire ce pavage et poser
// différentes questions et si l'élève se trompe, lui compter faux mais aussi
// montrer la transformation ».
//
// Sa fiche : une mosaïque de quinze pièces numérotées, des sommets nommés
// A, B, C…, et un tableau à remplir — « Pièce 5 · Symétrie axiale d'axe (GJ) ·
// Image : ? ». L'élève lit la transformation, l'applique de tête, et donne le
// NUMÉRO de la pièce où elle tombe.
//
// CE QUE CET EXERCICE TRAVAILLE, et que le quadrillage ne travaille pas :
// l'élève ne TRACE rien, il LIT une transformation et la suit. C'est une autre
// compétence, et elle est plus difficile — il faut tenir dans sa tête une
// figure, un centre et un sens à la fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA DÉCISION QUI TIENT TOUT : ON NE DEVINE PAS UN PAVAGE, ON LE CONSTRUIT PAR
// SES TRANSFORMATIONS.
//
// On aurait pu dessiner une mosaïque, puis CHERCHER après coup quelles pièces
// sont images les unes des autres. C'est la façon de faire qui se trompe : une
// recherche peut rater une relation, ou pire en inventer une qui ne tient que
// par une coïncidence de forme — deux pièces identiques posées au bon endroit
// sans que la transformation annoncée les relie vraiment.
//
// On fait donc l'inverse. On part d'une pièce, on lui applique une
// transformation qu'on a CHOISIE, et si l'image tombe sur des cases libres, on
// la garde — en notant la relation. Chaque question du tableau est donc une
// relation qu'on a écrite soi-même, pas une relation qu'on espère avoir trouvée.
//
// Et l'on vérifie quand même (`verifierPavage`) : c'est bon marché, et une
// construction juste qui se croit juste n'est pas une construction vérifiée.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE REPÈRE, ET POURQUOI LES CASES SONT À DEMI-ENTIÈRES.
//
// La case (i, j) occupe le carré [i, i+1] × [j, j+1]. Ses SOMMETS sont donc à
// coordonnées entières — ce sont eux qu'on nomme A, B, C, parce que c'est d'eux
// que parle l'énoncé : « l'axe (GJ) », « le centre G ».
//
// Une case est représentée par son CENTRE, (i + 0,5 ; j + 0,5). Ce n'est pas un
// détail d'écriture : c'est ce qui permet d'appliquer `core/transformations.js`
// TEL QUEL. Une symétrie d'axe x = 4 envoie le centre 2,5 sur 5,5, qui est
// encore un centre de case. Si l'on avait rangé le coin bas-gauche, la même
// symétrie l'aurait envoyé sur 5,5 — qui n'est plus un coin, et il aurait fallu
// un « −1 » quelque part, écrit à la main, à chaque transformation.
//
// Le module est pur : ni DOM, ni dessin. Il rend des cases et des relations ;
// c'est l'écran qui les peint.

import {
    imageFigure, memeFigure, cleFigure, decrire, nommerAxe, ecrireDemi, SENS
} from './transformations.js';
import { makeRng } from './ids.js';

/**
 * LES FORMES DE DÉPART.
 *
 * Des tétrominos et des pentominos, parce qu'ils se reconnaissent d'un coup
 * d'œil et qu'une pièce de trois cases donne des mosaïques qui se ressemblent
 * toutes. Écrits en cases relatives, coin bas-gauche à (0, 0).
 *
 * ON ÉCARTE LE CARRÉ 2×2 : il est invariant par toutes les transformations du
 * carré, donc son image par un quart de tour lui ressemble trait pour trait.
 * Une pièce dont la forme ne dit rien du geste n'apprend rien à l'élève.
 */
export const FORMES = {
    L: [[0, 0], [0, 1], [0, 2], [1, 0]],
    J: [[1, 0], [1, 1], [1, 2], [0, 0]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[0, 0], [1, 0], [1, 1], [2, 1]],
    Z: [[1, 0], [2, 0], [0, 1], [1, 1]],
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    U: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    Y: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]]
};

/** La clé d'une case, pour les ensembles. Les centres sont à demi-entiers. */
export const cleCase = (c) => `${c.x},${c.y}`;

/** La case dont le coin bas-gauche est (i, j), désignée par son centre. */
export const caseEn = (i, j) => ({ x: i + 0.5, y: j + 0.5 });

/** Les cases d'une forme posée en (i, j). */
export function poserForme(nom, i, j) {
    return FORMES[nom].map(([dx, dy]) => caseEn(i + dx, j + dy));
}

// ─── Les sommets nommés ───────────────────────────────────────────────────────

/**
 * LE NOM D'UN SOMMET, DANS L'ORDRE DE LECTURE.
 *
 * Sur la fiche de Rémy, A, B, C… se suivent de gauche à droite et de haut en
 * bas, comme on lit. Ce n'est pas de l'esthétique : un élève qui cherche le
 * point G doit pouvoir le TROUVER sans parcourir toute la figure, et c'est
 * l'ordre de lecture qui le lui permet.
 *
 * VINGT-SIX LETTRES, PAS DAVANTAGE. Au-delà on écrirait A₁, et une figure qui
 * demande vingt-sept points nommés est une figure trop chargée pour être lue.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function nommerSommets(sommets) {
    // De haut en bas (y décroissant à l'écran, donc y croissant ici inversé),
    // puis de gauche à droite.
    const tries = [...sommets].sort((a, b) => (b.y - a.y) || (a.x - b.x));
    return tries.map((s, i) => ({ ...s, nom: ALPHABET[i] || `A${i - 25}` }));
}

// ─── Dire une transformation avec les noms des sommets ────────────────────────

/**
 * L'ÉNONCÉ, ÉCRIT COMME SUR LA FICHE.
 *
 * `core/transformations.js` sait déjà décrire une transformation — mais en
 * coordonnées (« l'axe vertical x = 4 »), ce qui est juste et ne ressemble pas
 * à ce qu'un professeur écrit. Ici l'axe s'appelle (GJ), le centre s'appelle G,
 * et le vecteur s'appelle GD. C'est le même objet, dit dans la langue de la
 * classe.
 *
 * @param {Object} t la transformation, avec ses points nommés
 * @returns {string} « la symétrie d'axe (GJ) », « la translation de vecteur GD »…
 */
export function direTransformation(t) {
    if (t.genre === 'axiale') return `la symétrie d'axe (${t.nomAxe})`;
    if (t.genre === 'centrale') return `la symétrie de centre ${t.nomCentre}`;
    if (t.genre === 'translation') return `la translation de vecteur ${t.nomVecteur}`;
    if (t.genre === 'rotation') {
        const demi = (((t.quarts % 4) + 4) % 4) === 2;
        if (demi) return `la rotation de centre ${t.nomCentre} et d'angle 180°`;
        // « et de ${direLeSens(…)} » donnait « et de LE sens direct » : direLeSens
        // rend déjà l'article. On prend le mot seul — et c'est exactement la
        // formule de la fiche de Rémy, « d'angle 90° de sens indirect ».
        return `la rotation de centre ${t.nomCentre}, d'angle 90° et de sens ${SENS[((t.quarts % 4) + 4) % 4].nom}`;
    }
    return decrire(t);
}

/** La même, mais sans les noms : le repli quand un point n'est pas nommé. */
export function direSansNoms(t) {
    if (t.genre === 'axiale') return `la symétrie d'axe ${nommerAxe(t.axe)}`;
    if (t.genre === 'centrale') return `la symétrie de centre (${ecrireDemi(t.centre.x)} ; ${ecrireDemi(t.centre.y)})`;
    return decrire(t);
}

// ─── La construction ──────────────────────────────────────────────────────────

/**
 * LES TRANSFORMATIONS QU'ON S'AUTORISE, construites sur des sommets ENTIERS.
 *
 * Toutes envoient un centre de case sur un centre de case — c'est la condition
 * pour que l'image soit encore une pièce du pavage, et elle se vérifie :
 *
 *   · symétrie d'axe vertical x = a, a entier        → x' = 2a − x  ✓
 *   · symétrie d'axe horizontal y = a                → idem          ✓
 *   · symétrie de centre (a, b), a et b entiers      → ✓
 *   · rotation d'un quart de tour autour de (a, b)   → x' = a − (y − b) ✓
 *   · translation d'un vecteur à composantes entières → ✓
 *
 * ON N'OFFRE PAS LES AXES OBLIQUES. Ils existent dans
 * `core/transformations.js` et ils sont justes ; mais sur une mosaïque de
 * pièces irrégulières, une symétrie à 45° donne une image qu'aucun élève ne
 * suit de tête — et l'exercice deviendrait un exercice de patience.
 */
function poolDeTransformations(boite, rng) {
    const out = [];
    const { x0, x1, y0, y1 } = boite;
    for (let a = x0 + 1; a <= x1 - 1; a++) out.push({ genre: 'axiale', axe: { type: 'v', a } });
    for (let a = y0 + 1; a <= y1 - 1; a++) out.push({ genre: 'axiale', axe: { type: 'h', a } });
    for (let a = x0 + 1; a <= x1 - 1; a++) {
        for (let b = y0 + 1; b <= y1 - 1; b++) {
            out.push({ genre: 'centrale', centre: { x: a, y: b } });
            out.push({ genre: 'rotation', centre: { x: a, y: b }, quarts: 1 });
            out.push({ genre: 'rotation', centre: { x: a, y: b }, quarts: 3 });
        }
    }
    for (const dx of [-4, -3, -2, 2, 3, 4]) out.push({ genre: 'translation', vecteur: { x: dx, y: 0 } });
    for (const dy of [-4, -3, -2, 2, 3, 4]) out.push({ genre: 'translation', vecteur: { x: 0, y: dy } });
    for (const dx of [-3, -2, 2, 3]) {
        for (const dy of [-3, -2, 2, 3]) out.push({ genre: 'translation', vecteur: { x: dx, y: dy } });
    }
    return rng.shuffle(out);
}

/**
 * CONSTRUIT UN PAVAGE.
 *
 * @param {Object} options
 *   `graine`   le grain de hasard — un même grain donne toujours le même pavage
 *   `largeur`, `hauteur`  la boîte, en cases
 *   `pieces`   combien de pièces viser
 * @returns {null|{cases, pieces, sommets, relations, boite}} null si la pousse
 *   n'a rien donné de propre : l'appelant relance avec un autre grain.
 */
export function construireMosaique({ graine = 'pav', largeur = 10, hauteur = 8, pieces = 15 } = {}) {
    const rng = makeRng(graine);
    const boite = { x0: 0, x1: largeur, y0: 0, y1: hauteur };
    const pool = poolDeTransformations(boite, rng);

    const occupe = new Map();          // clé de case → numéro de pièce
    const liste = [];                  // les pièces, dans l'ordre de pose
    const relations = [];

    const libre = (cases) => cases.every(c =>
        c.x > boite.x0 && c.x < boite.x1 && c.y > boite.y0 && c.y < boite.y1
        && !occupe.has(cleCase(c)));

    const poser = (cases, venantDe = null, transfo = null) => {
        const n = liste.length + 1;
        const piece = { n, cases: cases.map(c => ({ ...c })) };
        liste.push(piece);
        cases.forEach(c => occupe.set(cleCase(c), n));
        if (venantDe) relations.push({ depuis: venantDe.n, vers: n, t: transfo });
        return piece;
    };

    /**
     * POSER, ET DÉFAIRE SI ÇA FAIT UN TROU.
     *
     * MESURÉ : la règle « pas de trou » appliquée à la FIN refusait soixante
     * mosaïques sur soixante. C'est normal et ce n'est pas un défaut de la
     * règle : quinze pièces de quatre ou cinq cases remplissent presque une
     * boîte de quatre-vingts, et une pousse irrégulière finit forcément par
     * enfermer une case. Une règle qu'on applique trop tard ne sélectionne
     * pas, elle rejette.
     *
     * On la vérifie donc à chaque pose. C'est quatre-vingts cases à inonder,
     * soit quelques microsecondes, et la mosaïque est alors sans trou PAR
     * CONSTRUCTION — comme ses relations.
     */
    const poserSansTrou = (cases, venantDe = null, transfo = null) => {
        const piece = poser(cases, venantDe, transfo);
        if (!aUnTrou(occupe, boite)) return piece;
        liste.pop();
        cases.forEach(c => occupe.delete(cleCase(c)));
        if (venantDe) relations.pop();
        return null;
    };

    // La première pièce, posée au hasard dans le quart bas-gauche : la pousse
    // a alors de la place dans toutes les directions.
    const nomsFormes = Object.keys(FORMES);
    const premiere = nomsFormes[rng.int(0, nomsFormes.length - 1)];
    const depart = poserForme(premiere, rng.int(1, Math.max(1, largeur - 5)), rng.int(1, Math.max(1, hauteur - 5)));
    if (!libre(depart)) return null;
    poser(depart);

    // ── La pousse ───────────────────────────────────────────────────────────
    //
    // À chaque tour on essaie de faire naître une pièce d'une autre par une
    // transformation. Quand plus aucune ne passe, on SÈME une forme nouvelle
    // contre ce qui existe déjà : c'est ce qui donne à la mosaïque des pièces
    // de plusieurs familles, comme sur la fiche de Rémy, au lieu de quinze
    // copies de la même.
    let sansProgres = 0;
    while (liste.length < pieces && sansProgres < 400) {
        const source = liste[rng.int(0, liste.length - 1)];
        const t = pool[rng.int(0, pool.length - 1)];
        const image = imageFigure(source.cases, t);
        if (memeFigure(image, source.cases) || !libre(image)) {
            sansProgres++;
            if (sansProgres % 80 === 0) {
                const sem = semerContre(liste, occupe, libre, rng, nomsFormes, boite);
                if (sem && poserSansTrou(sem)) sansProgres = 0;
            }
            continue;
        }
        if (!poserSansTrou(image, source, t)) { sansProgres++; continue; }
        sansProgres = 0;
    }

    if (liste.length < 6) return null;
    if (relations.length < 5) return null;
    // D'UN SEUL TENANT. Une pièce posée loin des autres par une translation
    // donne une mosaïque en archipel : l'élève ne sait plus s'il regarde une
    // figure ou deux, et les pièces isolées n'ont pas de voisines à comparer.
    if (!dUnSeulTenant(occupe)) return null;
    // ET ASSEZ DENSE. Une mosaïque pleine de découpes profondes se lit mal ;
    // celle de Rémy est franchement compacte. On mesure sur sa propre boîte,
    // pas sur celle qu'on lui avait offerte : une mosaïque petite mais pleine
    // est bonne.
    if (densite(occupe) < 0.62) return null;
    // La mosaïque est sans trou par construction ; on le redit quand même, pour
    // que la règle ne puisse pas disparaître avec la ligne qui l'applique.
    if (aUnTrou(occupe, boite)) return null;

    // ON NE GARDE QUE LES RELATIONS DISABLES. Une relation dont l'axe ou le
    // centre ne tombe sur aucun coin de la mosaïque est parfaitement juste —
    // mais on ne peut pas en faire un énoncé que l'élève sache lire, et une
    // question qu'on ne peut pas poser n'est pas une question.
    const { sommets: bruts, gardees } = sommetsUtiles(relations, occupe);
    const sommets = nommerSommets(bruts);
    const nommes = new Map(sommets.map(s => [`${s.x},${s.y}`, s.nom]));
    gardees.forEach(r => habillerDeNoms(r.t, nommes));
    if (gardees.length < 5) return null;

    return { boite, pieces: liste, relations: gardees, sommets };
}

/** Sème une forme neuve contre la mosaïque existante, pour relancer la pousse. */
function semerContre(liste, occupe, libre, rng, nomsFormes, boite) {
    for (let essai = 0; essai < 60; essai++) {
        const nom = nomsFormes[rng.int(0, nomsFormes.length - 1)];
        const i = rng.int(boite.x0, boite.x1 - 1);
        const j = rng.int(boite.y0, boite.y1 - 1);
        const cases = poserForme(nom, i, j);
        if (!libre(cases)) continue;
        // Elle doit TOUCHER la mosaïque : une pièce isolée ferait une île.
        const touche = cases.some(c => [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .some(([dx, dy]) => occupe.has(cleCase({ x: c.x + dx, y: c.y + dy }))));
        if (touche) return cases;
    }
    return null;
}

/** La mosaïque est-elle en un seul morceau ? (quatre voisins, pas les coins) */
function dUnSeulTenant(occupe) {
    const cles = [...occupe.keys()];
    if (!cles.length) return false;
    const vues = new Set([cles[0]]);
    const file = [cles[0]];
    while (file.length) {
        const [x, y] = file.pop().split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = `${x + dx},${y + dy}`;
            if (occupe.has(k) && !vues.has(k)) { vues.add(k); file.push(k); }
        }
    }
    return vues.size === cles.length;
}

/** La part de sa propre boîte que la mosaïque occupe vraiment. */
function densite(occupe) {
    const xs = [], ys = [];
    for (const cle of occupe.keys()) {
        const [x, y] = cle.split(',').map(Number);
        xs.push(x); ys.push(y);
    }
    const l = Math.max(...xs) - Math.min(...xs) + 1;
    const h = Math.max(...ys) - Math.min(...ys) + 1;
    return occupe.size / (l * h);
}

/** Y a-t-il une case vide entièrement entourée par la mosaïque ? */
function aUnTrou(occupe, boite) {
    const dedans = (c) => c.x > boite.x0 && c.x < boite.x1 && c.y > boite.y0 && c.y < boite.y1;
    const vues = new Set();
    // On inonde depuis l'extérieur : tout vide atteint n'est pas un trou.
    const file = [];
    for (let i = boite.x0; i < boite.x1; i++) {
        for (const j of [boite.y0, boite.y1 - 1]) file.push(caseEn(i, j));
    }
    for (let j = boite.y0; j < boite.y1; j++) {
        for (const i of [boite.x0, boite.x1 - 1]) file.push(caseEn(i, j));
    }
    while (file.length) {
        const c = file.pop();
        const k = cleCase(c);
        if (!dedans(c) || vues.has(k) || occupe.has(k)) continue;
        vues.add(k);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) file.push({ x: c.x + dx, y: c.y + dy });
    }
    for (let i = boite.x0; i < boite.x1; i++) {
        for (let j = boite.y0; j < boite.y1; j++) {
            const c = caseEn(i, j);
            const k = cleCase(c);
            if (!occupe.has(k) && !vues.has(k)) return true;
        }
    }
    return false;
}

/**
 * LES SOMMETS DONT LES ÉNONCÉS ONT BESOIN — et pourquoi ils se choisissent SUR
 * la mosaïque.
 *
 * Première version : pour nommer l'axe horizontal y = 5, on posait deux points
 * en (0, 5) et (1, 5). C'est juste — deux points distincts définissent bien la
 * droite — et c'était inutilisable : ces deux points tombent au BORD GAUCHE de
 * la boîte, souvent à côté de la mosaïque, et l'élève cherche sur le dessin un
 * point C qui ne touche rien.
 *
 * Sur la fiche de Rémy, A, B, C… sont des COINS DE PIÈCES. On fait pareil : on
 * ne nomme que des sommets du quadrillage qui touchent au moins une case de la
 * mosaïque, et pour un axe on prend les DEUX PLUS ÉLOIGNÉS — un axe nommé par
 * deux points voisins se lit mal, et l'élève doute de sa direction.
 */
function sommetsUtiles(relations, occupe) {
    // Les coins de toutes les cases occupées : les seuls points qu'on peut
    // montrer du doigt sur le dessin.
    const surLaFigure = new Set();
    for (const cle of occupe.keys()) {
        const [cx, cy] = cle.split(',').map(Number);
        for (const dx of [-0.5, 0.5]) {
            for (const dy of [-0.5, 0.5]) surLaFigure.add(`${cx + dx},${cy + dy}`);
        }
    }
    const estSurLaFigure = (x, y) => surLaFigure.has(`${x},${y}`);

    const vus = new Map();
    const noter = (x, y) => { vus.set(`${x},${y}`, { x, y }); return { x, y }; };

    /** Les deux points les plus éloignés de l'axe, pris sur la figure. */
    const deuxSurLAxe = (axe) => {
        const dessus = [];
        for (const cle of surLaFigure) {
            const [x, y] = cle.split(',').map(Number);
            if (axe.type === 'v' && x === axe.a) dessus.push({ x, y });
            if (axe.type === 'h' && y === axe.a) dessus.push({ x, y });
        }
        if (dessus.length < 2) return null;
        dessus.sort((p, q) => (axe.type === 'v' ? p.y - q.y : p.x - q.x));
        return [dessus[0], dessus[dessus.length - 1]];
    };

    /** Deux points de la figure séparés EXACTEMENT par le vecteur. */
    const deuxSurLeVecteur = (v) => {
        for (const cle of surLaFigure) {
            const [x, y] = cle.split(',').map(Number);
            if (estSurLaFigure(x + v.x, y + v.y)) return [{ x, y }, { x: x + v.x, y: y + v.y }];
        }
        return null;
    };

    const gardees = [];
    for (const rel of relations) {
        const t = rel.t;
        if (t.genre === 'centrale' || t.genre === 'rotation') {
            // UN CENTRE DOIT ÊTRE SUR LA FIGURE lui aussi : un centre dans le
            // vide est un point que l'élève ne sait pas placer.
            if (!estSurLaFigure(t.centre.x, t.centre.y)) continue;
            noter(t.centre.x, t.centre.y);
            gardees.push(rel);
            continue;
        }
        if (t.genre === 'axiale') {
            const deux = deuxSurLAxe(t.axe);
            if (!deux) continue;
            t.pointsAxe = deux.map(p => noter(p.x, p.y));
            gardees.push(rel);
            continue;
        }
        if (t.genre === 'translation') {
            const deux = deuxSurLeVecteur(t.vecteur);
            if (!deux) continue;
            t.pointsVecteur = deux.map(p => noter(p.x, p.y));
            gardees.push(rel);
        }
    }
    return { sommets: [...vus.values()], gardees };
}

/** Colle les noms de sommets sur une transformation, pour que l'énoncé se dise. */
function habillerDeNoms(t, nommes) {
    const nom = (x, y) => nommes.get(`${x},${y}`) || null;
    if (t.genre === 'centrale' || t.genre === 'rotation') t.nomCentre = nom(t.centre.x, t.centre.y);
    if (t.genre === 'axiale' && t.pointsAxe) {
        const [a, b] = t.pointsAxe.map(p => nom(p.x, p.y));
        t.nomAxe = a && b ? `${a}${b}` : null;
    }
    if (t.genre === 'translation' && t.pointsVecteur) {
        const [a, b] = t.pointsVecteur.map(p => nom(p.x, p.y));
        t.nomVecteur = a && b ? `${a}${b}` : null;
    }
}

// ─── La vérification ──────────────────────────────────────────────────────────

/**
 * RELIT LE PAVAGE, ET N'A PAS CONFIANCE.
 *
 * La construction est juste PAR CONSTRUCTION — c'est tout l'intérêt de
 * construire par les transformations plutôt que de les chercher après coup.
 * Mais une construction juste qui se croit juste n'est pas une construction
 * vérifiée, et celle-ci coûte quelques millisecondes.
 *
 * @returns {string[]} les reproches. Vide, le pavage est bon.
 */
export function verifierMosaique(pavage) {
    const dits = [];
    if (!pavage) return ['pavage absent'];
    const { pieces, relations } = pavage;

    const parNumero = new Map(pieces.map(p => [p.n, p]));
    const vues = new Map();
    for (const p of pieces) {
        if (!p.cases.length) dits.push(`la pièce ${p.n} n'a aucune case`);
        for (const c of p.cases) {
            const k = cleCase(c);
            if (vues.has(k)) dits.push(`les pièces ${vues.get(k)} et ${p.n} se chevauchent en ${k}`);
            vues.set(k, p.n);
            if (!Number.isInteger(c.x - 0.5) || !Number.isInteger(c.y - 0.5)) {
                dits.push(`la pièce ${p.n} a une case hors du quadrillage : ${k}`);
            }
        }
    }

    for (const r of relations) {
        const a = parNumero.get(r.depuis), b = parNumero.get(r.vers);
        if (!a || !b) { dits.push(`relation vers une pièce inconnue : ${r.depuis} → ${r.vers}`); continue; }
        const image = imageFigure(a.cases, r.t);
        if (!memeFigure(image, b.cases)) {
            dits.push(`${direTransformation(r.t)} n'envoie PAS la pièce ${r.depuis} sur la pièce ${r.vers}`);
        }
        // UNE QUESTION DOIT AVOIR UNE SEULE RÉPONSE. Si l'image coïncidait avec
        // deux pièces — ce qui ne peut arriver que si deux pièces occupent les
        // mêmes cases —, l'élève aurait raison en donnant l'autre.
        const autres = pieces.filter(p => p.n !== b.n && memeFigure(imageFigure(a.cases, r.t), p.cases));
        if (autres.length) dits.push(`la pièce ${r.depuis} a deux images par ${direTransformation(r.t)}`);
        // ET L'ÉNONCÉ DOIT ÊTRE DISABLE : un axe sans nom donnerait « l'axe (null) ».
        if (r.t.genre === 'axiale' && !r.t.nomAxe) dits.push(`l'axe de la relation ${r.depuis} → ${r.vers} n'a pas de nom`);
        if ((r.t.genre === 'centrale' || r.t.genre === 'rotation') && !r.t.nomCentre) {
            dits.push(`le centre de la relation ${r.depuis} → ${r.vers} n'a pas de nom`);
        }
        if (r.t.genre === 'translation' && !r.t.nomVecteur) {
            dits.push(`le vecteur de la relation ${r.depuis} → ${r.vers} n'a pas de nom`);
        }
    }
    return dits;
}

/** La clé d'un pavage, pour ne pas reposer deux fois le même à un élève. */
export function cleMosaique(pavage) {
    return (pavage.pieces || []).map(p => cleFigure(p.cases)).sort().join('|');
}
