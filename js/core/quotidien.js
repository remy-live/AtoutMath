// CE QU'ON DIT À L'ÉLÈVE CHAQUE JOUR — et pourquoi ce n'est pas un tirage au sort.
//
// Rémy : « On pourrait avoir une liste de blagues mathématiques très courtes,
// une liste de citations, une liste de conseils […] et une série de petites
// énigmes très courtes qu'on pourrait suggérer chaque jour. Une centaine de
// chaque ce serait bien. »
//
// TROIS RÈGLES, ET ELLES COMPTENT PLUS QUE LE CONTENU.
//
//   1. LE MÊME TOUTE LA JOURNÉE. Un élève qui recharge la page et voit une
//      autre blague comprend en trois secondes qu'il est devant une machine à
//      sous, et il tire jusqu'à en trouver une drôle. La phrase du jour doit
//      être LA phrase du jour : elle ne dépend que de la date.
//
//   2. RIEN NE SE RÉPÈTE TANT QUE LA LISTE N'EST PAS ÉPUISÉE. Un tirage au
//      hasard sur cent entrées redonne la même au bout d'une dizaine de jours
//      (c'est le paradoxe des anniversaires), et l'élève conclut qu'il n'y en a
//      que dix.
//
//      UNE SEULE PERMUTATION, PARCOURUE EN BOUCLE. La première version en
//      tirait une NOUVELLE à chaque cycle, pour que la deuxième année ne soit
//      pas la copie de la première — et c'était un défaut, pas une qualité :
//      à cheval sur deux cycles, une entrée pouvait revenir à quelques jours
//      d'intervalle, précisément ce qu'on voulait éviter. Le test l'a attrapé
//      (80 entrées distinctes sur 100 jours quand on commence en cours de
//      cycle).
//
//      Avec une permutation fixe répétée, la garantie devient EXACTE et plus
//      forte : toute fenêtre de n jours consécutifs — pas seulement celles qui
//      commencent à un cycle — contient chaque entrée une fois et une seule.
//      Le prix est que l'ordre se répète d'une année sur l'autre ; à cent
//      entrées, cela veut dire qu'un élève retrouverait la blague du 14 mars
//      l'année suivante, et il aura changé de classe.
//
//   3. CHACUN LA SIENNE, SI ON LE DEMANDE. Deux élèves côte à côte qui lisent
//      la même blague, c'est bien : ils en parlent. Deux élèves qui voient la
//      même énigme, c'est moins bien : le premier donne la réponse au second.
//      Le décalage par graine permet de choisir, genre par genre.
//
// Aucun DOM, aucun stockage, aucune horloge cachée : on passe la date, on
// reçoit une entrée. C'est ce qui rend la chose testable — et un tirage qui se
// répète ne se voit qu'au bout de trois semaines d'usage réel.

/** Les quatre genres. L'ordre est celui du panneau de gestion. */
export const GENRES = ['conseil', 'blague', 'citation', 'enigme'];

export const LIBELLES_GENRE = {
    conseil: 'Conseils',
    blague: 'Blagues',
    citation: 'Citations',
    enigme: 'Énigmes'
};

const JOUR_MS = 86400000;

/**
 * Le numéro du jour civil, en UTC.
 *
 * EN UTC, ET C'EST VOLONTAIRE. L'heure locale ferait changer la phrase du jour
 * à des instants différents selon le fuseau — et surtout, elle la ferait
 * changer DEUX FOIS lors du passage à l'heure d'hiver.
 */
export function numeroDeJour(maintenant = Date.now()) {
    const d = new Date(maintenant);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR_MS);
}

/**
 * Un générateur pseudo-aléatoire minuscule, ensemencé — le même que partout
 * ailleurs dans le projet : une graine, une suite reproductible.
 */
function suite(graine) {
    let x = (graine >>> 0) || 1;
    return () => {
        x ^= x << 13; x >>>= 0;
        x ^= x >> 17;
        x ^= x << 5; x >>>= 0;
        return x / 4294967296;
    };
}

/**
 * Une permutation de 0…n-1, reproductible pour une graine donnée.
 *
 * C'est elle qui garantit la règle 2 : à l'intérieur d'un cycle, chaque rang
 * sort une fois et une seule.
 */
export function permutation(n, graine) {
    const ordre = Array.from({ length: Math.max(0, n) }, (_, i) => i);
    const rnd = suite(graine + 1);
    for (let i = ordre.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    }
    return ordre;
}

/**
 * Le rang de l'entrée du jour dans une liste de `n`.
 *
 * @param {number} n          combien d'entrées
 * @param {number} jour       le numéro de jour (voir `numeroDeJour`)
 * @param {number} [decalage] pour donner une entrée différente à chaque élève
 *                            ou à chaque genre — voir la règle 3
 */
export function rangDuJour(n, jour, decalage = 0) {
    if (!Number.isFinite(n) || n <= 0) return -1;
    const j = Math.floor(jour) + Math.floor(decalage || 0);
    // Le modulo de JavaScript rend un reste NÉGATIF pour un nombre négatif : on
    // le ramène dans [0, n[, sinon une date antérieure à 1970 — ou un décalage
    // négatif — sort du tableau.
    const dans = ((j % n) + n) % n;
    // LA MÊME PERMUTATION POUR TOUJOURS. C'est elle qui donne la garantie
    // exacte : n jours consécutifs, où qu'ils commencent, parcourent la liste
    // entière. La graine dépend de la LONGUEUR, ce qui suffit à donner un ordre
    // différent à chaque genre sans les désynchroniser d'une année sur l'autre.
    return permutation(n, n * 2654435761 % 2147483647)[dans];
}

/**
 * L'entrée du jour d'une liste.
 *
 * @returns l'entrée, ou `null` si la liste est vide — un écran d'accueil ne
 *          doit pas se casser parce qu'un genre a été vidé.
 */
export function duJour(liste, { maintenant = Date.now(), decalage = 0 } = {}) {
    const l = Array.isArray(liste) ? liste : [];
    const r = rangDuJour(l.length, numeroDeJour(maintenant), decalage);
    return r < 0 ? null : l[r];
}

/**
 * LE DÉCALAGE PROPRE À UN ÉLÈVE. Deux élèves de la même classe ne doivent pas
 * recevoir la même énigme le même jour — le premier donnerait la réponse au
 * second, et il n'y aurait plus d'énigme pour personne.
 *
 * On dérive un entier stable de son identifiant : le même élève garde son
 * décalage d'un jour à l'autre, donc il ne repasse pas deux fois sur la même
 * entrée en changeant d'appareil.
 */
export function decalagePour(identifiant) {
    const s = String(identifiant ?? '');
    if (!s) return 0;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0) % 9973;      // un premier, pour ne pas aligner les cycles
}

/**
 * Les `combien` prochains jours d'un genre — l'aperçu du panneau de gestion.
 * C'est ce qui permet de VÉRIFIER la règle 2 d'un coup d'œil au lieu de la
 * croire sur parole.
 */
export function prochains(liste, combien, { maintenant = Date.now(), decalage = 0 } = {}) {
    const l = Array.isArray(liste) ? liste : [];
    const jour = numeroDeJour(maintenant);
    const out = [];
    for (let i = 0; i < Math.max(0, combien); i++) {
        const r = rangDuJour(l.length, jour + i, decalage);
        if (r >= 0) out.push({ dans: i, entree: l[r], rang: r });
    }
    return out;
}
