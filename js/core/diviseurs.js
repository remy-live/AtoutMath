// LE CHASSEUR DE DIVISEURS — les règles, sans une ligne de DOM.
//
// Rémy : « je pense à un jeu un peu futuriste pour travailler la décomposition
// et la divisibilité, où il y a des nombres qui arrivent et on peut tirer des
// diviseurs dessus. Exemple 30 : on peut tirer 6, du coup ça se transforme en
// 5, et on ne peut capturer que les nombres premiers. »
//
// C'est exactement la décomposition en facteurs premiers, jouée à l'envers :
// on ne l'écrit pas, on la FAIT. 60 tombe ; je tire 4, il devient 15 ; je tire
// 3, il devient 5 ; 5 est premier, je le capture. J'ai écrit 60 = 4 × 3 × 5
// sans le savoir — et la partie enregistre ce chemin, ce qui permet de le
// relire à la fin.
//
// DEUX RÈGLES, ET ELLES SUFFISENT :
//   · tirer d sur n exige que d DIVISE n (et 1 < d < n) : n devient n / d ;
//   · un nombre PREMIER se capture, et lui seul — c'est le seul moyen de le
//     faire disparaître, donc il faut avoir tout décomposé.
// Un tir qui ne divise pas est une faute : c'est là qu'on apprend, et c'est
// pour cela qu'elle coûte quelque chose.

/** Un nombre est-il premier ? (les cibles vont jusqu'à quelques centaines) */
export function estPremier(n) {
    if (!Number.isInteger(n) || n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
    return true;
}

/** Les diviseurs stricts d'un nombre : ni 1, ni lui-même. */
export function diviseursStricts(n) {
    const out = [];
    for (let d = 2; d <= n / 2; d++) if (n % d === 0) out.push(d);
    return out;
}

/** La décomposition en facteurs premiers, pour la correction et le score. */
export function facteursPremiers(n) {
    const out = [];
    let r = Math.max(1, Math.floor(n));
    for (let d = 2; d * d <= r; d++) {
        while (r % d === 0) { out.push(d); r /= d; }
    }
    if (r > 1) out.push(r);
    return out;
}

/** « 60 = 2 × 2 × 3 × 5 » — la phrase qu'on lit à la fin. */
export function ecrireDecomposition(n) {
    const f = facteursPremiers(n);
    return f.length <= 1 ? `${n} est premier` : `${n} = ${f.join(' × ')}`;
}

// --- Les difficultés ----------------------------------------------------------
//
// Ce qui change n'est PAS la vitesse — c'est la matière. Au premier niveau, les
// cibles se décomposent avec les critères de divisibilité qu'on vient
// d'apprendre (2, 3, 5) ; au dernier, il faut chercher un facteur 7, 11 ou 13,
// ce qu'aucun critère ne donne.

export const NIVEAUX = {
    facile: {
        label: 'Les tables — facteurs 2, 3 et 5',
        premiers: [2, 3, 5],
        facteursMax: 3,
        chute: 26000
    },
    moyen: {
        label: 'Jusqu\'à 7 — les critères ne suffisent plus',
        premiers: [2, 3, 5, 7],
        facteursMax: 3,
        chute: 22000
    },
    difficile: {
        label: 'Jusqu\'à 13 — il faut chercher',
        premiers: [2, 3, 5, 7, 11, 13],
        facteursMax: 4,
        chute: 18000
    }
};

/**
 * Une cible : un nombre fabriqué en multipliant des premiers du niveau.
 *
 * On le FABRIQUE plutôt que de le tirer au hasard et de vérifier : c'est la
 * seule façon de garantir qu'il se décompose avec les facteurs annoncés — un
 * 91 dans un niveau « facteurs 2, 3 et 5 » serait indestructible, et l'élève
 * n'aurait aucun moyen de savoir pourquoi.
 */
export function tirerCible(rng, niveau = 'facile', rang = 0) {
    const cfg = NIVEAUX[niveau] || NIVEAUX.facile;
    // Le nombre de facteurs monte avec la vague : un nombre premier tout seul
    // au début (on le capture directement, on apprend le geste), puis deux,
    // puis trois.
    const combien = Math.min(cfg.facteursMax, 1 + Math.floor(rang / 3));
    let n = 1;
    const f = [];
    for (let i = 0; i < combien; i++) {
        const p = rng.pick(cfg.premiers);
        // On borne : au-delà de quelques centaines, la lecture devient pénible
        // et le calcul n'apprend plus rien de neuf.
        if (n * p > 400) break;
        n *= p; f.push(p);
    }
    if (n < 2) { n = rng.pick(cfg.premiers); f.push(n); }
    return { valeur: n, facteurs: f.sort((a, b) => a - b) };
}

// --- Le tir --------------------------------------------------------------------

/**
 * Tirer `d` sur `n`.
 *
 * @returns {{ok:boolean, reste:?number, capture:boolean, raison:string, message:string}}
 */
export function tirer(n, d) {
    const cible = Number(n), obus = Number(d);
    if (!Number.isInteger(obus) || obus < 2) {
        return { ok: false, reste: null, capture: false, raison: 'trop-petit',
            message: 'On tire un diviseur d\'au moins 2 : tirer 1 ne changerait rien.' };
    }
    if (obus === cible) {
        // Se tirer dessus soi-même, c'est la CAPTURE — et elle n'est permise
        // que sur un nombre premier. Sur 30, « tirer 30 » reviendrait à sauter
        // toute la décomposition.
        if (estPremier(cible)) {
            return { ok: true, reste: 0, capture: true, raison: 'capture',
                message: `${cible} est premier : capturé.` };
        }
        return { ok: false, reste: null, capture: false, raison: 'pas-premier',
            message: `${cible} n'est pas premier — on ne capture que les premiers. `
                + 'Décompose-le d\'abord.' };
    }
    if (obus > cible) {
        return { ok: false, reste: null, capture: false, raison: 'trop-grand',
            message: `${obus} est plus grand que ${cible} : il ne peut pas le diviser.` };
    }
    if (cible % obus !== 0) {
        return { ok: false, reste: null, capture: false, raison: 'ne-divise-pas',
            message: `${obus} ne divise pas ${cible} : il reste ${cible % obus}.` };
    }
    const reste = cible / obus;
    return {
        ok: true, reste, capture: false, raison: 'divise',
        message: `${cible} ÷ ${obus} = ${reste}.`
            + (estPremier(reste) ? ` ${reste} est premier : tu peux le capturer.` : '')
    };
}

/** Peut-on encore faire quelque chose de ce nombre ? */
export function coupsPossibles(n) {
    if (estPremier(n)) return [n];
    return diviseursStricts(n);
}

// --- Le score --------------------------------------------------------------------
//
// On paie ce qui coûte du travail. Un tir juste vaut peu ; une CAPTURE vaut le
// nombre de facteurs qu'il a fallu enlever, parce que c'est la décomposition
// entière qu'on vient de faire. Et un nombre décomposé SANS FAUTE vaut double :
// c'est la différence entre chercher et essayer au hasard.

export const POINTS = { tir: 5, capture: 20, parFacteur: 10, sansFaute: 2 };

export function pointsDeCapture(depart, coups, fautes) {
    const facteurs = facteursPremiers(depart).length;
    const base = POINTS.capture + facteurs * POINTS.parFacteur;
    return fautes === 0 ? base * POINTS.sansFaute : base;
}

/**
 * L'ÉTAT D'UNE PARTIE — sans aucune notion de pixels ni de temps.
 *
 * Les cibles portent leur valeur, leur valeur de départ et le chemin parcouru ;
 * l'écran ajoute leur position. C'est ce qui permet de tout tester sans
 * navigateur.
 */
export function creerPartie(options = {}) {
    return {
        niveau: NIVEAUX[options.niveau] ? options.niveau : 'facile',
        boucliers: options.boucliers || 3,
        score: 0,
        vague: 0,
        cibles: [],
        // Ce qu'on a décomposé jusqu'ici : sert au bilan de fin de partie.
        journal: [],
        finie: false,
        prochainId: 1
    };
}

/** Ajouter une cible à la partie. */
export function ajouterCible(p, rng, rang) {
    const { valeur } = tirerCible(rng, p.niveau, rang === undefined ? p.vague : rang);
    p.cibles.push({
        id: p.prochainId++, valeur, depart: valeur,
        chemin: [], fautes: 0
    });
    return p.cibles[p.cibles.length - 1];
}

/**
 * Tirer sur une cible de la partie. Rend le résultat ET met la partie à jour.
 *
 * Une faute coûte un bouclier : sans cela, on tire tous les nombres l'un après
 * l'autre jusqu'à ce que ça marche, et le jeu n'enseigne plus rien.
 */
export function tirerSur(p, id, d) {
    const c = p.cibles.find(x => x.id === id);
    if (!c || p.finie) return { ok: false, raison: 'absente', message: '', cible: null };
    const r = tirer(c.valeur, d);
    if (!r.ok) {
        c.fautes++;
        p.boucliers--;
        if (p.boucliers <= 0) { p.boucliers = 0; p.finie = true; }
        return { ...r, cible: c };
    }
    c.chemin.push(Number(d));
    if (r.capture) {
        const gagne = pointsDeCapture(c.depart, c.chemin, c.fautes);
        p.score += gagne;
        p.journal.push({ depart: c.depart, chemin: [...c.chemin], fautes: c.fautes, points: gagne });
        p.cibles = p.cibles.filter(x => x.id !== id);
        return { ...r, cible: c, points: gagne };
    }
    c.valeur = r.reste;
    p.score += POINTS.tir;
    return { ...r, cible: c, points: POINTS.tir };
}

/** Une cible qui atteint le sol : elle coûte un bouclier et s'en va. */
export function perdreCible(p, id) {
    const c = p.cibles.find(x => x.id === id);
    if (!c) return null;
    p.cibles = p.cibles.filter(x => x.id !== id);
    p.boucliers--;
    if (p.boucliers <= 0) { p.boucliers = 0; p.finie = true; }
    return c;
}

/** Le bilan : ce qu'on a décomposé, écrit comme au tableau. */
export function bilan(p) {
    return p.journal.map(e => ({
        texte: `${e.depart} = ${facteursPremiers(e.depart).join(' × ')}`,
        chemin: `${e.depart} → ${e.chemin.join(' → ')}`,
        fautes: e.fautes, points: e.points
    }));
}
