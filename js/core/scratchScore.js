// Notation d'un tracé : est-ce que le chat a bien repassé la figure ?
//
// On ne compare PAS les scripts. Un carré obtenu par quatre répétitions et un
// carré obtenu par huit blocs à la main sont le même carré : c'est la
// géométrie qu'on évalue. Le niveau peut ajouter une exigence sur le code
// (« utilise une boucle »), mais c'est une condition supplémentaire, pas le
// critère principal.
//
// Deux mesures complémentaires, et il faut les deux :
//   - COUVERTURE : quelle part de la figure a été repassée ? Sans elle, on
//     validerait un élève qui ne trace qu'un seul côté du carré.
//   - PROPRETÉ : quelle part du tracé tombe SUR la figure ? Sans elle, on
//     validerait un élève qui gribouille toute la page — la figure serait
//     couverte, techniquement.

/** Distance en pixels sous laquelle un point est considéré « sur le trait ». */
export const TOLERANCE = 12;

/** Découpe une polyligne en points espacés d'au plus `pas` pixels. */
export function echantillonner(polyligne, pas = 6) {
    const pts = [];
    for (let i = 0; i < polyligne.length - 1; i++) {
        const a = polyligne[i], b = polyligne[i + 1];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(1, Math.ceil(d / pas));
        for (let k = 0; k < n; k++) {
            pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
        }
    }
    const dernier = polyligne[polyligne.length - 1];
    if (dernier) pts.push({ x: dernier.x, y: dernier.y });
    return pts;
}

/** Distance d'un point au segment [a, b]. */
export function distancePointSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const long2 = dx * dx + dy * dy;
    if (long2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / long2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance d'un point au plus proche segment d'un ensemble de polylignes. */
export function distanceAuxTraits(p, polylignes) {
    let min = Infinity;
    for (const ligne of polylignes) {
        for (let i = 0; i < ligne.length - 1; i++) {
            const d = distancePointSegment(p, ligne[i], ligne[i + 1]);
            if (d < min) min = d;
            if (min === 0) return 0;
        }
    }
    return min;
}

/**
 * Compare le tracé de l'élève à la figure demandée.
 *
 * @param {Array<Array<{x,y}>>} trace   ce que le chat a dessiné
 * @param {Array<Array<{x,y}>>} figure  la figure fantôme à repasser
 * @param {Object} [opts] `{ tolerance, seuilCouverture, seuilProprete }`
 * @returns {{ couverture:number, proprete:number, reussi:boolean,
 *             manquants:Array, bavures:Array }} taux entre 0 et 1
 */
export function comparerTrace(trace, figure, opts = {}) {
    const tol = opts.tolerance ?? TOLERANCE;
    const seuilC = opts.seuilCouverture ?? 0.95;
    const seuilP = opts.seuilProprete ?? 0.9;

    const utiles = (trace || []).filter(t => t && t.length > 1);
    const cibles = (figure || []).filter(t => t && t.length > 1);
    if (!cibles.length) return { couverture: 0, proprete: 0, reussi: false, manquants: [], bavures: [] };

    // Couverture : chaque point de la figure a-t-il été repassé ?
    const ptsFigure = cibles.flatMap(l => echantillonner(l));
    const manquants = ptsFigure.filter(p => distanceAuxTraits(p, utiles) > tol);
    const couverture = 1 - manquants.length / ptsFigure.length;

    // Propreté : chaque point tracé tombe-t-il sur la figure ?
    const ptsTrace = utiles.flatMap(l => echantillonner(l));
    const bavures = ptsTrace.filter(p => distanceAuxTraits(p, cibles) > tol);
    // Rien de tracé : le tracé est « propre » au sens strict, mais annoncer
    // 100 % de propreté pour une page blanche n'aurait aucun sens.
    const proprete = ptsTrace.length ? 1 - bavures.length / ptsTrace.length : 0;

    return {
        couverture, proprete,
        reussi: couverture >= seuilC && proprete >= seuilP,
        manquants, bavures
    };
}

/**
 * Traduit une comparaison ratée en phrase utile.
 *
 * Un « faux » sec n'apprend rien : ce qu'il faut dire à l'élève, c'est CE QUI
 * manque. On regarde d'abord la page blanche, puis l'oubli du stylo, puis les
 * deux taux — dans cet ordre, parce que c'est l'ordre des causes les plus
 * fréquentes.
 */
export function diagnostiquer(resultat, contexte = {}) {
    const { couverture, proprete } = resultat;
    if (contexte.rienTrace) {
        return contexte.styloOublie
            ? "Le chat s'est bien déplacé, mais son stylo était levé : il n'a rien écrit. Pose le stylo avant de le faire avancer."
            : "Le chat n'a rien tracé. Fais-le avancer, stylo posé.";
    }
    if (couverture < 0.35) {
        return "Il manque presque tout le tracé : le chat ne fait qu'un bout du chemin. Regarde combien de côtés a la figure.";
    }
    if (couverture < seuilProche(resultat) && proprete >= 0.85) {
        const part = Math.round(couverture * 100);
        return `Tu as repassé ${part} % de la figure : le chemin est bon, mais il s'arrête trop tôt. Il manque un ou plusieurs côtés.`;
    }
    if (proprete < 0.6) {
        return "Le chat sort beaucoup du tracé : ses angles ne sont pas les bons. Vérifie de combien de degrés il tourne.";
    }
    if (proprete < 0.9) {
        return "Presque ! Le chat déborde un peu : c'est la longueur d'un côté ou un angle qui n'est pas tout à fait juste.";
    }
    return "La figure n'est pas tout à fait repassée. Compare les côtés un par un.";
}

function seuilProche(r) { return r.seuilCouverture ?? 0.95; }

/**
 * Vérifie les exigences de code d'un niveau (« utilise une boucle », « pas
 * plus de 6 blocs »). Renvoie la première exigence non tenue, ou null.
 */
export function verifierExigences(script, exigences, outils) {
    if (!exigences) return null;
    if (exigences.boucle && !outils.contientBoucle(script)) {
        return "Le tracé est juste, mais on te demande d'utiliser une boucle « répéter » : écris le côté UNE fois, et répète.";
    }
    if (exigences.imbrication && outils.profondeurBoucles(script) < exigences.imbrication) {
        return `Le tracé est juste, mais il faut ${exigences.imbrication} boucles imbriquées : une boucle qui répète une autre boucle.`;
    }
    if (exigences.maxBlocs && outils.compterBlocs(script) > exigences.maxBlocs) {
        return `Le tracé est juste, mais il te faut ${outils.compterBlocs(script)} blocs alors que ${exigences.maxBlocs} suffisent. Cherche ce qui se répète.`;
    }
    return null;
}
