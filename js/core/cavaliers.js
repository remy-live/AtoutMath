// L'ÉNIGME DES CAVALIERS — échanger quatre cavaliers sur un damier 3 × 3.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 31 octobre, avec la photo d'un livre d'énigmes : « j'aimeri bien aussi
// cette enigme ». La légende disait : « Sixteen moves is the minimum. Note that
// the knights have to move around in a cycle in the same direction. »
//
// C'est le PROBLÈME DE GUARINI, posé en 1512 : deux cavaliers d'une couleur et
// deux de l'autre aux quatre coins d'un damier 3 × 3, et il faut les échanger.
//
// ── CE QU'IL Y A DERRIÈRE, ET POURQUOI CETTE ÉNIGME VAUT LA PEINE ──────────
//
// La case du milieu ne sert à RIEN : aucun saut de cavalier n'y mène ni n'en
// part. Restent huit cases, et voici ce qu'on découvre en les reliant par les
// sauts possibles — chaque case en a exactement deux :
//
//        0 1 2            0 ─ 5 ─ 6 ─ 1
//        3 . 5     →      │           │        … et les deux bouts se
//        6 7 8            7 ─ 2 ─ 3 ─ 8        rejoignent : c'est UN CYCLE.
//
// LES HUIT CASES FORMENT UN SEUL COLLIER. Les cavaliers y sont des perles :
// ils tournent, et ils ne peuvent JAMAIS se dépasser — pour échanger deux
// paires placées en alternance, il faut donc faire tourner tout le monde d'un
// quart de tour. Quatre cavaliers × quatre pas = seize coups, et c'est le
// minimum. C'est un raisonnement de graphe, fait avec les mains.
//
// ON NE DIT PAS CELA À L'ÉLÈVE AVANT QU'IL CHERCHE. Le collier est la chute,
// pas la consigne : l'indice le plus fort le lui montre, et la leçon le nomme.
//
// ── CE FICHIER NE CONNAÎT NI LE DOM NI L'ÉCRAN ─────────────────────────────
//
// Il décrit le damier, dit quels sauts sont permis, et sait résoudre en
// parcours en largeur. L'écran déplace, la fiche imprime, l'épreuve compte.

/**
 * LES DAMIERS, et ils ne racontent pas la même chose.
 *
 *   · `guarini` — le classique, 3 × 3, quatre cavaliers aux quatre coins. Le
 *     milieu est mort, les huit cases restantes font un cycle, seize coups.
 *   · `duo` — le même damier avec DEUX cavaliers seulement, l'un en face de
 *     l'autre. Beaucoup plus court, et c'est exprès : on y rencontre le
 *     collier sans avoir à tenir quatre pièces en tête.
 *   · `bande` — 3 × 4, quatre cavaliers. Le milieu n'est plus mort et le
 *     graphe n'est plus un simple cycle : les cavaliers peuvent enfin se
 *     croiser, et la stratégie du collier ne suffit plus.
 */
export const NIVEAUX = {
    1: {
        nom: '1 — Deux cavaliers, pour comprendre le tour',
        colonnes: 3, lignes: 3, mortes: [4],
        depart: { A: [0], B: [8] },
        arrivee: { A: [8], B: [0] }
    },
    2: {
        nom: '2 — Les quatre cavaliers (l\'énigme de 1512)',
        colonnes: 3, lignes: 3, mortes: [4],
        // `mortes` NE REND PAS LA CASE MORTE : elle l'est déjà, par la géométrie
        // du saut. Depuis le centre d'un 3 × 3, les huit sauts du cavalier
        // tombent tous hors du damier. Mesuré en essayant de faire tomber
        // l'épreuve de l'anneau en retirant ce [4] : elle est restée verte,
        // parce que le défaut remis n'en était pas un.
        //
        // Le champ sert donc au DESSIN — la case hachurée de l'écran, le gris
        // foncé de la fiche — et à dire tout haut une vérité qu'on mettrait
        // sinon trois minutes à retrouver.
        //
        // Les deux blancs en haut, les deux noirs en bas : c'est la figure du
        // livre, et c'est elle qu'on raconte.
        depart: { A: [0, 2], B: [6, 8] },
        arrivee: { A: [6, 8], B: [0, 2] }
    },
    3: {
        nom: '3 — Sur un damier plus large',
        colonnes: 4, lignes: 3, mortes: [],
        depart: { A: [0, 3], B: [8, 11] },
        arrivee: { A: [8, 11], B: [0, 3] }
    }
};

/** Les huit sauts du cavalier, en (colonne, ligne). */
const SAUTS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

/**
 * LE GRAPHE DU DAMIER : pour chaque case, celles qu'un cavalier atteint.
 *
 * Les cases mortes ne sont ni une arrivée ni un départ — on les retire des
 * deux côtés, sinon un cavalier pourrait « passer par » une case qui n'existe
 * pas, ce qui n'a pas de sens au cavalier mais en aurait pour un lecteur
 * distrait du code.
 */
export function graphe(def) {
    const { colonnes, lignes } = def;
    const mortes = new Set(def.mortes || []);
    const n = colonnes * lignes;
    const voisins = [];
    for (let k = 0; k < n; k++) {
        if (mortes.has(k)) { voisins.push([]); continue; }
        const c = k % colonnes, l = Math.floor(k / colonnes);
        const liste = [];
        for (const [dc, dl] of SAUTS) {
            const c2 = c + dc, l2 = l + dl;
            if (c2 < 0 || c2 >= colonnes || l2 < 0 || l2 >= lignes) continue;
            const k2 = l2 * colonnes + c2;
            if (!mortes.has(k2)) liste.push(k2);
        }
        voisins.push(liste);
    }
    return voisins;
}

/**
 * LE COLLIER, QUAND IL Y EN A UN.
 *
 * Rend l'ordre des cases le long du cycle quand le graphe des cases vivantes
 * EST un cycle simple, et null sinon. C'est ce qui permet à l'écran de dessiner
 * l'anneau — la chute de l'énigme — sans la recalculer à la main, et à
 * l'épreuve de vérifier que le damier du niveau 2 est bien celui du livre.
 */
export function collier(def) {
    const voisins = graphe(def);
    const vivantes = voisins.map((v, k) => (v.length ? k : -1)).filter(k => k >= 0);
    if (!vivantes.length) return null;
    // Un cycle simple : chaque case vivante a exactement deux voisins.
    if (!vivantes.every(k => voisins[k].length === 2)) return null;
    const ordre = [vivantes[0]];
    let precedent = -1, ici = vivantes[0];
    for (let i = 1; i < vivantes.length; i++) {
        const suivant = voisins[ici].find(k => k !== precedent);
        if (suivant === undefined) return null;
        precedent = ici; ici = suivant;
        if (ordre.includes(ici)) return null;      // on se recoupe : pas un cycle
        ordre.push(ici);
    }
    // Et la boucle se ferme sur son point de départ.
    return voisins[ici].includes(ordre[0]) ? ordre : null;
}

/** L'état de départ : la case de chaque cavalier, ou null si elle est vide. */
export function depart(def) {
    const cases = new Array(def.colonnes * def.lignes).fill(null);
    for (const [couleur, places] of Object.entries(def.depart)) {
        for (const k of places) cases[k] = couleur;
    }
    return cases;
}

/** L'arrivée demandée, dans la même forme. */
export function arrivee(def) {
    const cases = new Array(def.colonnes * def.lignes).fill(null);
    for (const [couleur, places] of Object.entries(def.arrivee)) {
        for (const k of places) cases[k] = couleur;
    }
    return cases;
}

/** C'est gagné quand chaque case porte la couleur demandée. */
export const estArrive = (cases, but) => cases.every((c, k) => c === but[k]);

/** Les coups possibles depuis cet état : { de, vers }. */
export function coups(cases, voisins) {
    const out = [];
    for (let k = 0; k < cases.length; k++) {
        if (!cases[k]) continue;
        for (const k2 of voisins[k]) {
            if (cases[k2] === null) out.push({ de: k, vers: k2 });
        }
    }
    return out;
}

/** Ce que donne un coup. On ne vérifie pas : `coups` ne propose que du permis. */
export function jouer(cases, de, vers) {
    const suite = cases.slice();
    suite[vers] = suite[de];
    suite[de] = null;
    return suite;
}

/**
 * LA PLUS COURTE SUITE DE COUPS, par parcours en largeur.
 *
 * Les états sont peu nombreux — au plus quelques milliers — et c'est ce qui
 * permet de GARANTIR qu'une énigme servie a une solution, et d'annoncer son
 * minimum sans l'écrire à la main. Le livre dit seize ; on le VÉRIFIE.
 */
export function resoudre(def) {
    const voisins = graphe(def);
    const debut = depart(def);
    const but = arrivee(def);
    if (estArrive(debut, but)) return [];
    const cle = (c) => c.map(x => x || '.').join('');
    const vus = new Set([cle(debut)]);
    let file = [{ cases: debut, chemin: [] }];
    for (let profondeur = 0; profondeur < 60 && file.length; profondeur++) {
        const suivante = [];
        for (const { cases, chemin } of file) {
            for (const c of coups(cases, voisins)) {
                const apres = jouer(cases, c.de, c.vers);
                const k = cle(apres);
                if (vus.has(k)) continue;
                vus.add(k);
                const route = chemin.concat([c]);
                if (estArrive(apres, but)) return route;
                suivante.push({ cases: apres, chemin: route });
            }
        }
        file = suivante;
    }
    return null;
}

/**
 * UN QUART DE TOUR DU DAMIER, dans le sens des aiguilles.
 *
 * POURQUOI C'EST LÀ. Une feuille de deux blocs montrait DEUX FOIS exactement la
 * même figure — vu sur l'image, pas dans un compteur : le niveau 2 n'a qu'une
 * énigme, et c'est voulu, c'est celle de 1512. Mais deux blocs identiques sur
 * une page ne se font qu'une fois.
 *
 * ON NE CHANGE PAS L'ÉNIGME, ON LA TOURNE. Les cavaliers passent des deux
 * rangées du haut et du bas aux deux colonnes de gauche et de droite : la main
 * cherche autrement, le raisonnement est le même, et le nombre de coups ne
 * bouge pas — ce qu'une épreuve vérifie, plutôt que de le supposer.
 */
function tournerIndice(k, colonnes, lignes) {
    const c = k % colonnes, l = Math.floor(k / colonnes);
    // (c, l) → (lignes-1-l, c) : un quart de tour dans le sens des aiguilles,
    // et l'on ne l'applique qu'aux damiers carrés — tourner un 3 × 4 en
    // changerait la forme.
    return c * colonnes + (lignes - 1 - l);
}

function tourner(cases, colonnes, lignes) {
    const out = new Array(cases.length).fill(null);
    for (let k = 0; k < cases.length; k++) {
        out[tournerIndice(k, colonnes, lignes)] = cases[k];
    }
    return out;
}

/** L'énigme d'un niveau, avec son minimum calculé. */
export function tirerEnigme(niveau = 2, rang = 0) {
    const n = NIVEAUX[niveau] ? niveau : 2;
    const def = NIVEAUX[n];
    const route = resoudre(def);
    let d = depart(def), a = arrivee(def), m = (def.mortes || []).slice();
    let sol = (route || []).map(c => ({ ...c }));
    // Un damier qui n'est pas carré ne se tourne pas sans changer de forme.
    const quarts = def.colonnes === def.lignes ? ((rang % 4) + 4) % 4 : 0;
    for (let i = 0; i < quarts; i++) {
        const marque = new Array(d.length).fill(null);
        m.forEach(k => { marque[k] = 'X'; });
        d = tourner(d, def.colonnes, def.lignes);
        a = tourner(a, def.colonnes, def.lignes);
        m = tourner(marque, def.colonnes, def.lignes)
            .map((v, k) => (v ? k : -1)).filter(k => k >= 0);
        // LA SOLUTION TOURNE AVEC LE DAMIER.
        //
        // ET CE N'EST PAS NÉCESSAIRE AUJOURD'HUI, mesuré : la solution NON
        // tournée arrive au but sur les quatre orientations. La raison est
        // jolie — un quart de tour renvoie le collier sur lui-même, et la
        // solution ne fait que déplacer les cavaliers le long du collier. On
        // la garde quand même, parce qu'elle est le geste JUSTE : le jour où
        // l'on ajoutera un damier dont le graphe n'a pas cette symétrie, le
        // corrigé serait faux sans elle — et un corrigé faux est pire que pas
        // de corrigé, le professeur le croit. L'épreuve, elle, attrape bien
        // une rotation fausse : vu tomber.
        sol = sol.map(c => ({
            de: tournerIndice(c.de, def.colonnes, def.lignes),
            vers: tournerIndice(c.vers, def.colonnes, def.lignes)
        }));
    }
    return {
        niveau: n, nom: def.nom,
        colonnes: def.colonnes, lignes: def.lignes,
        mortes: m,
        depart: d, arrivee: a,
        collier: collier(def),
        minimum: route ? route.length : null,
        solution: sol
    };
}
