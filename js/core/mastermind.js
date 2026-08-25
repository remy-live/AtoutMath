// LE MASTERMIND — un code, et ce qu'on peut en déduire.
//
// Rémy : « Et un master mind ».
//
// LE JEU TIENT EN UNE RÈGLE ET UN COMPTE. On propose une suite de couleurs ;
// on répond par deux nombres : combien sont BIEN PLACÉES, et combien sont de la
// bonne couleur mais MAL PLACÉES. Rien d'autre. Tout le reste est déduction.
//
// DEUX NOMBRES, PAS DES PIONS NOIRS ET BLANCS. Le jeu du commerce répond par
// des petites chevilles, et la moitié des joueurs ne sait jamais si la cheville
// blanche veut dire « bonne couleur » ou « bonne place ». Deux colonnes
// nommées suppriment la question, et c'est ainsi qu'on l'imprime dans les
// revues.
//
// UNE COULEUR PORTE SON INITIALE. C'est la règle de la maison — la couleur
// ajoute du confort, jamais l'information —, et ici elle est vitale : une fiche
// photocopiée en noir et blanc doit rester jouable, et six gris ne se
// distinguent pas.
//
// ATTENTION AU COMPTE DES MAL PLACÉES quand une couleur paraît deux fois :
// c'est LA subtilité de ce jeu, et la faute d'implémentation classique. Un
// jeton du secret ne peut servir qu'une fois. Si le secret est R B B V et
// l'essai B B R R : un B bien placé ; il reste { R, B, V } dans le secret et
// { B, R } dans l'essai — donc deux mal placés, et non trois.
//
// Module pur : ni DOM, ni hasard propre.

/**
 * LES COULEURS, AVEC LEUR INITIALE. Elles sont toutes distinctes à la lecture
 * (R, B, V, J, O, M, N, C) : c'est cette lettre qu'on écrit sur le papier, et
 * la pastille colorée n'est là que pour aller plus vite à l'écran.
 */
export const COULEURS = [
    { id: 'R', nom: 'rouge', hex: '#e53e3e' },
    { id: 'B', nom: 'bleu', hex: '#3182ce' },
    { id: 'V', nom: 'vert', hex: '#2f855a' },
    { id: 'J', nom: 'jaune', hex: '#d69e2e' },
    { id: 'O', nom: 'orange', hex: '#dd6b20' },
    { id: 'M', nom: 'mauve', hex: '#805ad5' },
    { id: 'N', nom: 'noir', hex: '#2d3748' },
    { id: 'C', nom: 'ciel', hex: '#0bc5ea' }
];

export const palette = (n) => COULEURS.slice(0, Math.max(2, Math.min(COULEURS.length, n)));

/**
 * LES DEUX NOMBRES : bien placés, mal placés.
 *
 * On retire d'abord les bien placés des DEUX côtés, puis on apparie ce qui
 * reste couleur par couleur, chaque jeton du secret ne servant qu'une fois.
 * C'est cet appariement qui rend le compte juste quand une couleur se répète.
 */
export function indices(secret, essai) {
    let places = 0;
    const resteS = [], resteE = [];
    for (let i = 0; i < secret.length; i++) {
        if (secret[i] === essai[i]) places++;
        else { resteS.push(secret[i]); resteE.push(essai[i]); }
    }
    const dispo = new Map();
    resteS.forEach(c => dispo.set(c, (dispo.get(c) || 0) + 1));
    let presents = 0;
    resteE.forEach(c => {
        const n = dispo.get(c) || 0;
        if (n > 0) { presents++; dispo.set(c, n - 1); }
    });
    return { places, presents };
}

/** Tous les codes possibles, avec ou sans répétition de couleur. */
export function tousLesCodes(couleurs, longueur, repetitions = true) {
    const ids = couleurs.map(c => c.id ?? c);
    let codes = [[]];
    for (let i = 0; i < longueur; i++) {
        const suite = [];
        codes.forEach(c => ids.forEach(id => {
            if (!repetitions && c.includes(id)) return;
            suite.push([...c, id]);
        }));
        codes = suite;
    }
    return codes;
}

/** Un code respecte-t-il tout ce qu'on sait déjà ? */
export const compatible = (code, lignes) =>
    lignes.every(l => {
        const i = indices(code, l.code);
        return i.places === l.places && i.presents === l.presents;
    });

/** Les codes encore possibles, au vu des lignes déjà jouées. */
export const compatibles = (codes, lignes) => codes.filter(c => compatible(c, lignes));

/**
 * LES CASES DONT LA COULEUR EST DÉJÀ CERTAINE.
 *
 * Si tous les codes encore possibles portent la même couleur en position i,
 * alors cette case est DÉMONTRÉE — même si le joueur ne l'a pas vu. C'est le
 * contenu logique du jeu, et c'est exactement ce qu'un élève rate : il continue
 * à essayer au hasard alors que trois cases sur quatre sont déjà prouvées.
 */
export function certitudes(candidats) {
    if (!candidats.length) return [];
    return candidats[0].map((c, i) => (candidats.every(k => k[i] === c) ? c : null));
}

/** Le code est trouvé quand tout est bien placé. */
export const estResoluMastermind = (secret, essai) =>
    indices(secret, essai).places === secret.length;

// --- Le jeu à l'écran ---------------------------------------------------------

/** Les formats proposés, du bac à sable au vrai casse-tête. */
export const FORMATS = {
    // QUATRE CASES PARTOUT SAUF AU SOMMET, et c'est la PALETTE qui fait la
    // difficulté. Un format à trois cases et quatre couleurs ne compte que
    // soixante-quatre codes : sur le papier, deux lignes suffisaient à le
    // déterminer, parfois une seule, et une énigme d'une ligne n'est pas une
    // énigme. Quatre cases donnent un plateau de même forme dans les trois
    // réglages — l'élève ne réapprend pas à lire la grille en changeant de
    // niveau.
    facile: { id: 'facile', label: '4 cases, 4 couleurs — pour découvrir', longueur: 4, nbCouleurs: 4 },
    moyen: { id: 'moyen', label: '4 cases, 6 couleurs — le jeu classique', longueur: 4, nbCouleurs: 6 },
    difficile: { id: 'difficile', label: '5 cases, 8 couleurs — le vrai casse-tête', longueur: 5, nbCouleurs: 8 }
};

/**
 * Une partie : un secret, sa palette, et de quoi compter les essais.
 * @param {{format?: string, repetitions?: boolean, rng: object}} opts
 */
export function creerMastermind({ format = 'moyen', repetitions = true, rng }) {
    const f = FORMATS[format] || FORMATS.moyen;
    const couleurs = palette(f.nbCouleurs);
    const codes = tousLesCodes(couleurs, f.longueur, repetitions);
    return {
        format: f.id,
        longueur: f.longueur,
        couleurs,
        repetitions,
        secret: rng.pick(codes),
        // Le nombre d'essais raisonnable : cinq pour trois cases, huit pour
        // quatre, dix pour cinq. Au-delà, ce n'est plus une déduction, c'est un
        // balayage.
        essaisMax: { 3: 5, 4: 8, 5: 10 }[f.longueur] || 8
    };
}

// --- Le jeu sur le papier -----------------------------------------------------

/**
 * LA GRILLE DE DÉDUCTION — le mastermind qu'on peut IMPRIMER.
 *
 * Une feuille ne répond pas : on ne peut pas y jouer coup par coup. Ce qu'on y
 * met, c'est la PARTIE DÉJÀ JOUÉE — des essais et leurs deux nombres — et l'on
 * demande le code. C'est alors un pur exercice de logique, comme un logigramme,
 * et c'est sous cette forme que les revues le publient.
 *
 * DEUX GARANTIES, ET LES DEUX COMPTENT :
 *   · UNE SEULE SOLUTION. Sans elle, deux élèves rendent deux réponses justes
 *     et différentes, et la correction devient impossible.
 *   · AUCUNE LIGNE INUTILE. On retire une à une celles dont la disparition
 *     laisse encore le code unique. Une ligne qui n'apprend rien fait chercher
 *     pour rien, et fait douter de celles qui servent.
 */
export function creerDeduction(opts) {
    // UNE GRILLE DE DEUX LIGNES SE DEVINE, ELLE NE SE DÉDUIT PAS. On retire
    // donc, et l'on retire encore — mais l'on retire une grille trop maigre au
    // lieu de la publier. `essais` bornes la boucle : à défaut, on rend la
    // meilleure trouvée, jamais rien.
    const { minLignes = 3, essais = 40 } = opts || {};
    let meilleure = null;
    for (let i = 0; i < essais; i++) {
        const g = uneDeduction(opts);
        if (!g) continue;
        if (g.lignes.length >= minLignes) return g;
        if (!meilleure || g.lignes.length > meilleure.lignes.length) meilleure = g;
    }
    return meilleure;
}

function uneDeduction({ format = 'moyen', repetitions = true, rng, maxLignes = 8 }) {
    const f = FORMATS[format] || FORMATS.moyen;
    const couleurs = palette(f.nbCouleurs);
    const codes = tousLesCodes(couleurs, f.longueur, repetitions);
    const secret = rng.pick(codes);
    const cleS = secret.join('');

    // On joue comme un bon joueur : chaque essai est un code ENCORE POSSIBLE.
    // Un essai tiré au hasard dans tout l'espace apprendrait moins et donnerait
    // des grilles de douze lignes.
    let candidats = codes;
    const lignes = [];
    while (candidats.length > 1 && lignes.length < maxLignes) {
        // Jamais le secret lui-même : la ligne donnerait la réponse.
        const autres = candidats.filter(c => c.join('') !== cleS);
        if (!autres.length) break;
        const essai = rng.pick(autres);
        const { places, presents } = indices(secret, essai);
        lignes.push({ code: essai, places, presents });
        candidats = candidats.filter(c => compatible(c, [lignes[lignes.length - 1]]));
    }
    if (candidats.length !== 1) return null;

    // L'ÉLAGAGE. On repart de la fin : les dernières lignes sont les plus
    // précises, donc les plus susceptibles de rendre les premières inutiles.
    const gardees = lignes.slice();
    for (let i = gardees.length - 1; i >= 0; i--) {
        const sans = gardees.filter((_, k) => k !== i);
        if (sans.length && compatibles(codes, sans).length === 1) gardees.splice(i, 1);
    }
    return {
        format: f.id, longueur: f.longueur, couleurs, repetitions,
        secret, lignes: gardees, candidats: codes.length
    };
}

/** Combien de codes restent possibles après les `n` premières lignes. */
export function resteApres(g, n) {
    const codes = tousLesCodes(g.couleurs, g.longueur, g.repetitions);
    return compatibles(codes, g.lignes.slice(0, n)).length;
}

/** De quoi écrire un corrigé : le code, et ce que chaque ligne élimine. */
export function qualiteMastermind(g) {
    const codes = tousLesCodes(g.couleurs, g.longueur, g.repetitions);
    let reste = codes.length;
    const etapes = g.lignes.map((l, i) => {
        const apres = compatibles(codes, g.lignes.slice(0, i + 1)).length;
        const e = { code: l.code.join(''), places: l.places, presents: l.presents, avant: reste, apres };
        reste = apres;
        return e;
    });
    return { secret: g.secret.join(''), lignes: g.lignes.length, depart: codes.length, etapes };
}
