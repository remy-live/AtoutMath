// LA PIZZA — mettre le même dénominateur, et le VOIR.
//
// « Recouvre les deux tiers de champignons et le quart de sauce tomate. »
// Deux fractions, deux dénominateurs différents : on ne peut pas les poser sur
// la même pizza tant qu'on ne les a pas ramenées au même découpage. Le PPCM de
// 3 et 4, c'est 12 — et la pizza arrive coupée en douze parts. Alors seulement
// les deux tiers deviennent huit parts, et le quart trois parts.
//
// C'EST LE POINT DE TOUT L'EXERCICE. Le dénominateur commun n'est pas une
// recette qu'on applique avant d'additionner : c'est le seul découpage où les
// deux fractions se comptent en même chose. Ici l'élève ne l'écrit pas, il le
// mange — il compte des parts de pizza, et le nombre qu'il trouve EST le
// numérateur de la fraction équivalente.
//
// Ce module ne connaît ni le SVG ni les ingrédients dessinés : il tient les
// nombres, tire des commandes qui TIENNENT sur une pizza, et juge une garniture.

/** Plus grand commun diviseur, par soustractions successives d'Euclide. */
export function pgcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
}

export function ppcm(a, b) {
    return Math.abs(a * b) / pgcd(a, b);
}

/** Le découpage commun à toute une liste de dénominateurs. */
export function ppcmListe(liste) {
    return liste.reduce((m, d) => ppcm(m, d), 1);
}

/** La fraction sous sa forme la plus simple. */
export function simplifier(num, den) {
    const g = pgcd(num, den);
    return { num: num / g, den: den / g };
}

/** Combien de parts, sur une pizza coupée en `parts`, représente num/den ? */
export function enParts(num, den, parts) {
    return num * (parts / den);
}

// --- Les ingrédients ------------------------------------------------------------
//
// Ils vivent ici parce que la COMMANDE les nomme : le noyau doit pouvoir tirer
// une commande complète, testable, sans rien demander à l'affichage. Le dessin
// de chacun, lui, reste dans le jeu.

export const INGREDIENTS = [
    { id: 'tomate', nom: 'sauce tomate', teinte: '#dc2626' },
    { id: 'champignons', nom: 'champignons', teinte: '#a8896a' },
    { id: 'olives', nom: 'olives', teinte: '#4c1d95' },
    { id: 'jambon', nom: 'jambon', teinte: '#f472b6' },
    { id: 'poivron', nom: 'poivron', teinte: '#16a34a' },
    { id: 'ananas', nom: 'ananas', teinte: '#eab308' }
];

// --- La commande ------------------------------------------------------------------

const NOMS_FRACTION = {
    2: ['la moitié'], 3: ['le tiers', 'les deux tiers'],
    4: ['le quart', null, 'les trois quarts'],
    5: ['le cinquième', 'les deux cinquièmes', 'les trois cinquièmes', 'les quatre cinquièmes'],
    6: ['le sixième', null, null, null, 'les cinq sixièmes'],
    8: ['le huitième', null, 'les trois huitièmes', null, 'les cinq huitièmes', null, 'les sept huitièmes']
};

/**
 * « de champignons », mais « d'olives ».
 *
 * Une commande se lit à voix haute en classe : « la moitié de olives » écorche
 * l'oreille et détourne l'attention du nombre, qui est le seul sujet.
 */
export function complement(nom) {
    return /^[aeiouyâàéèêîïôöûü]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
}

/** « 1 part », « 8 parts » : l'accord se fait, y compris dans les verdicts. */
export function parts(n) {
    return `${n} part${n > 1 ? 's' : ''}`;
}

/** Dit une fraction comme on la commanderait à voix haute. */
export function direFraction(num, den) {
    const table = NOMS_FRACTION[den];
    const mot = table && table[num - 1];
    if (mot) return mot;
    return `${num} ${den}ᵉ${num > 1 ? 's' : ''}`;
}

/**
 * Tire une commande qui TIENT sur une pizza.
 *
 * Deux contraintes, et elles ne sont pas décoratives :
 *  · la somme des fractions ne dépasse pas 1 — sinon la commande est
 *    impossible, et l'élève cherche une erreur qui n'est pas la sienne ;
 *  · chaque fraction est IRRÉDUCTIBLE. Demander « deux quarts » apprendrait à
 *    ne pas simplifier, et le PPCM tomberait faux pour la mauvaise raison.
 *
 * On garde la meilleure des tentatives : à contraintes égales, une pizza
 * presque entièrement garnie est plus jolie et laisse moins de place au hasard
 * qu'une pizza aux trois quarts nue.
 */
export function tirerCommande({ rng, nbFractions = 2, denominateurs = [2, 3, 4, 6], essais = 200 } = {}) {
    const alea = rng || { next: Math.random };
    const pick = (arr) => arr[Math.floor(alea.next() * arr.length)];
    let meilleure = null;

    for (let e = 0; e < essais; e++) {
        // Des dénominateurs DISTINCTS : deux fractions de même dénominateur ne
        // demanderaient aucune mise au même dénominateur.
        const dispo = denominateurs.slice();
        const dens = [];
        while (dens.length < nbFractions && dispo.length) {
            dens.push(dispo.splice(Math.floor(alea.next() * dispo.length), 1)[0]);
        }
        if (dens.length < nbFractions) continue;

        const parts = ppcmListe(dens);
        if (parts > 24) continue;      // au-delà, les parts ne se comptent plus

        const fractions = [];
        let somme = 0;
        for (const den of dens) {
            const choix = [];
            for (let n = 1; n < den; n++) if (pgcd(n, den) === 1) choix.push(n);
            const num = pick(choix);
            somme += num / den;
            fractions.push({ num, den });
        }
        if (somme > 1 + 1e-9) continue;

        // Des ingrédients tous différents, dans un ordre tiré au sort.
        const bac = INGREDIENTS.slice();
        fractions.forEach(f => {
            const i = Math.floor(alea.next() * bac.length);
            f.ingredient = bac.splice(i, 1)[0].id;
        });

        const cible = {};
        fractions.forEach(f => { cible[f.ingredient] = enParts(f.num, f.den, parts); });
        const posees = Object.values(cible).reduce((s, n) => s + n, 0);
        const candidat = { fractions, parts, cible, nature: parts - posees, dens };
        if (!meilleure || candidat.nature < meilleure.nature) meilleure = candidat;
        if (meilleure.nature === 0) break;
    }
    return meilleure;
}

// --- Le jugement ------------------------------------------------------------------

/**
 * Compare une garniture à la commande.
 *
 * `garniture` : un tableau d'une case par part, contenant l'identifiant d'un
 * ingrédient ou `null`. Le jugement porte sur le NOMBRE de parts de chaque
 * ingrédient, pas sur lesquelles : sur une pizza, huit parts de champignons
 * sont huit parts de champignons, où qu'elles soient. Exiger des parts
 * contiguës ajouterait une règle qui n'est pas de la mathématique.
 */
export function verifier(commande, garniture) {
    const compte = {};
    garniture.forEach(g => { if (g) compte[g] = (compte[g] || 0) + 1; });

    const detail = commande.fractions.map(f => {
        const attendu = commande.cible[f.ingredient];
        const pose = compte[f.ingredient] || 0;
        return {
            ingredient: f.ingredient, num: f.num, den: f.den,
            attendu, pose, ecart: pose - attendu, ok: pose === attendu
        };
    });

    // Un ingrédient qui n'était pas commandé : c'est une erreur à part entière,
    // et elle ne se dirait pas avec les mots d'un compte qui tombe faux.
    const intrus = Object.keys(compte).filter(id => !(id in commande.cible));
    const nature = garniture.filter(g => !g).length;

    return {
        ok: detail.every(d => d.ok) && !intrus.length,
        detail, intrus,
        nature, natureAttendu: commande.nature
    };
}

/** L'explication d'un compte qui tombe faux, en mots d'élève. */
export function expliquer(commande, d) {
    const facteur = commande.parts / d.den;
    return `${direFraction(d.num, d.den)} de ${commande.parts} parts, c'est `
        + `${d.num} × ${facteur} = ${parts(d.attendu)} — tu en as garni ${d.pose}.`;
}
