// LE PONT ET LA LAMPE — le chemin le moins CHER, et non le chemin qui existe.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 4 novembre : « Oui super et il faut que ce soit joli ».
//
// L'ÉNIGME. Des personnes doivent traverser un pont, la nuit. Elles n'ont
// qu'une lampe, le pont ne supporte que deux personnes à la fois, et qui
// traverse doit porter la lampe — donc quelqu'un doit toujours la RAPPORTER.
// Chacune marche à sa vitesse ; deux qui traversent ensemble vont au rythme de
// la plus lente. Combien de minutes au minimum pour que tout le monde soit de
// l'autre côté ?
//
// ── CE QUE ÇA TRAVAILLE, ET QUI N'EXISTE NULLE PART AILLEURS ICI ───────────
//
//   · LE COÛT D'UN GROUPE EST LE MAXIMUM, PAS LA SOMME. Deux qui traversent
//     ensemble ne mettent pas 5 + 10 minutes, ils en mettent 10. C'est une
//     idée qu'aucun autre exercice du logiciel ne rencontre, et elle se
//     retrouve partout ensuite — un chantier avance au rythme de son poste le
//     plus lent, pas de la somme de ses postes.
//   · LA BONNE IDÉE EST CONTRE-INTUITIVE. La stratégie qui vient toute seule —
//     « le plus rapide fait la navette » — coûte 19 minutes sur l'énigme
//     classique. La solution en coûte 17, et elle demande de faire traverser
//     LES DEUX PLUS LENTS ENSEMBLE, pour ne payer leur lenteur qu'une fois.
//     Un élève qui trouve cela a compris quelque chose ; il n'a pas appliqué
//     une recette.
//   · ON COMPARE DEUX STRATÉGIES AVEC DES NOMBRES. 19 contre 17 : ce n'est
//     plus « juste ou faux », c'est « mieux ou moins bien », et il faut le
//     prouver.
//
// ── LA DIFFÉRENCE AVEC LA TRAVERSÉE, QUI EST LA RAISON DE L'AJOUTER ────────
//
// `core/generators/traversee.js` — le loup, la chèvre et le chou — demande
// « un chemin EXISTE-T-IL ? ». Celui-ci demande « quel est le chemin le moins
// CHER ? ». Même famille : on explore un graphe d'états, chaque situation est
// un sommet, chaque traversée une arête. Mais on passe de réussir à optimiser,
// et c'est une marche de plus.
//
// ── ET LE MINIMUM SE DÉMONTRE, IL NE SE RECOPIE PAS ────────────────────────
//
// Le « 17 minutes » des livres n'est pas écrit en dur : il est calculé. Les
// arêtes ont des coûts différents, donc un parcours en largeur ne suffit pas —
// il rendrait le chemin le plus COURT en nombre de traversées, qui n'est pas
// le moins cher. On prend Dijkstra, sur 2ⁿ × 2 états : cent vingt-huit états
// pour six personnes, instantané.
//
// C'est la même règle que partout ici : on ne sert pas une énigme dont on n'a
// pas vérifié soi-même la réponse. Un objectif recopié faux donnerait tort à
// un élève qui a raison.

/** Le pont ne porte jamais plus de deux personnes à la fois. */
export const PLACES = 2;

/**
 * L'ÉTAT, EN UN NOMBRE : qui est encore à gauche, et de quel côté est la lampe.
 *
 * Le masque porte un bit par personne — bit allumé, elle est encore du côté du
 * départ. `lampe` vaut 0 à gauche, 1 à droite. L'arrivée est donc l'état 0
 * avec la lampe à droite : plus personne du côté du départ.
 *
 * ON CODE L'ÉTAT EN ENTIER plutôt qu'en objet pour pouvoir s'en servir comme
 * clé sans le sérialiser à chaque tour. Avec six personnes il y a cent
 * vingt-huit états ; avec un objet et un `JSON.stringify` par visite, on
 * passerait l'essentiel du temps à écrire du texte.
 */
const clef = (masque, lampe) => masque * 2 + lampe;

/** Les paires (et les solos) qu'on peut faire traverser depuis un côté. */
function departsPossibles(presents) {
    const sorties = [];
    for (let i = 0; i < presents.length; i++) {
        sorties.push([presents[i]]);
        for (let j = i + 1; j < presents.length; j++) sorties.push([presents[i], presents[j]]);
    }
    return sorties;
}

/**
 * LE MEILLEUR CHEMIN, ET SON COÛT.
 *
 * @param {number[]} temps  les minutes de chacun, dans l'ordre
 * @returns {{minutes:number, trajets:Array<{qui:number[], vers:'droite'|'gauche',
 *            minutes:number}>}|null} `null` s'il n'y a aucune solution — ce qui
 *   n'arrive qu'avec zéro personne, mais une fonction qui répond `null` plutôt
 *   que de rendre un chemin vide se lit mieux à l'appel.
 */
export function meilleurChemin(temps) {
    const n = (temps || []).length;
    if (!n) return null;
    const tous = (1 << n) - 1;
    const depart = clef(tous, 0);
    const arrivee = clef(0, 1);

    // DIJKSTRA, ET NON UN PARCOURS EN LARGEUR. Les arêtes n'ont pas toutes le
    // même prix : la plus courte en nombre de traversées n'est pas la moins
    // chère en minutes. Sur l'énigme classique, le chemin à cinq traversées
    // coûte 17 minutes, et un autre chemin à cinq traversées en coûte 19.
    const cout = new Map([[depart, 0]]);
    const venant = new Map();
    // LA FILE EST UN SIMPLE TABLEAU QU'ON TRIE : cent vingt-huit états au
    // maximum. Un tas binaire serait plus savant et pas plus rapide, et il
    // faudrait le relire un jour.
    const file = [[0, depart]];

    while (file.length) {
        file.sort((a, b) => a[0] - b[0]);
        const [prix, etat] = file.shift();
        if (etat === arrivee) break;
        if (prix > (cout.get(etat) ?? Infinity)) continue;
        const masque = Math.floor(etat / 2);
        const lampe = etat % 2;
        // LA LAMPE DÉCIDE QUI PEUT PARTIR : on ne traverse pas sans elle. Les
        // candidats sont donc ceux qui sont du même côté qu'elle.
        const presents = [];
        for (let i = 0; i < n; i++) {
            const aGauche = (masque >> i) & 1;
            if (aGauche === (lampe === 0 ? 1 : 0)) presents.push(i);
        }
        for (const groupe of departsPossibles(presents)) {
            // LE COÛT D'UN GROUPE EST LE MAXIMUM. C'est toute l'énigme.
            const minutes = Math.max(...groupe.map(i => temps[i]));
            let suivant = masque;
            for (const i of groupe) suivant ^= (1 << i);
            const k = clef(suivant, lampe === 0 ? 1 : 0);
            const total = prix + minutes;
            if (total < (cout.get(k) ?? Infinity)) {
                cout.set(k, total);
                venant.set(k, { de: etat, qui: groupe, minutes,
                    vers: lampe === 0 ? 'droite' : 'gauche' });
                file.push([total, k]);
            }
        }
    }

    if (!cout.has(arrivee)) return null;
    const trajets = [];
    for (let k = arrivee; k !== depart;) {
        const pas = venant.get(k);
        trajets.unshift({ qui: pas.qui.slice(), vers: pas.vers, minutes: pas.minutes });
        k = pas.de;
    }
    return { minutes: cout.get(arrivee), trajets };
}

/**
 * LA STRATÉGIE QUI VIENT TOUTE SEULE — le plus rapide fait la navette.
 *
 * ELLE N'EST PAS LÀ POUR ÊTRE JOUÉE, elle est là pour être COMPARÉE. C'est
 * elle que l'élève essaie en premier, et c'est en voyant 19 là où le minimum
 * est 17 qu'il cherche autre chose. Sans ce nombre, « 17 minutes » est un
 * objectif tombé du ciel ; avec lui, c'est un écart à combler.
 *
 * Elle est toujours valable — elle amène bien tout le monde de l'autre côté —,
 * mais elle n'est pas toujours la meilleure, et c'est précisément le sujet.
 */
export function strategieNavette(temps) {
    const restants = [...(temps || [])].sort((a, b) => a - b);
    if (restants.length <= 2) return restants.length ? Math.max(...restants) : 0;
    const rapide = restants[0];
    let total = 0;
    // Le plus rapide accompagne chacun des autres, puis revient le chercher.
    for (let i = restants.length - 1; i >= 1; i--) {
        total += restants[i];                    // il traverse avec le suivant
        if (i > 1) total += rapide;              // puis le rapide rapporte la lampe
    }
    return total;
}

/**
 * LES PALIERS, ET POURQUOI IL EN FAUT TROIS.
 *
 * LE PREMIER NE PIÈGE PERSONNE. À trois personnes, la stratégie de la navette
 * EST la meilleure : on y apprend la règle — la lampe revient, le groupe va au
 * rythme du plus lent — sans avoir encore à la remettre en cause. Un palier
 * qui enseigne la règle et la contredit dans la même minute n'enseigne ni
 * l'une ni l'autre.
 *
 * LE DEUXIÈME EST L'ÉNIGME DES LIVRES, 1, 2, 5 et 10 — celle où la navette
 * coûte 19 et le minimum 17. C'est le palier qui apprend quelque chose.
 *
 * LE TROISIÈME TIRE SES VITESSES, et `enigmeDuPont` refuse celles où la
 * navette est déjà optimale : servir au troisième palier une énigme sans
 * piège, c'est dire à l'élève que la leçon du deuxième était un accident.
 */
export const PALIERS = {
    1: { nom: 'Trois marcheurs', temps: [1, 2, 5] },
    2: { nom: 'L\'énigme des quatre', temps: [1, 2, 5, 10] },
    3: { nom: 'Cinq marcheurs', temps: null, combien: 5 }
};

/** Des prénoms courts, qui tiennent sous une silhouette. */
export const MARCHEURS = ['Léa', 'Tom', 'Zoé', 'Noé', 'Mia', 'Sam'];

/**
 * UNE ÉNIGME COMPLÈTE : les marcheurs, le minimum, et ce que coûte la navette.
 *
 * @param {number} palier  1, 2 ou 3
 * @param {{int:(a:number,b:number)=>number}} rng
 */
export function enigmeDuPont(palier, rng) {
    const p = PALIERS[palier] || PALIERS[2];
    let temps = p.temps;
    if (!temps) {
        // ON TIRE JUSQU'À CE QUE L'ÉNIGME AIT UN PIÈGE, et l'on borne les
        // essais : un tirage qui ne trouve pas doit rendre quelque chose de
        // jouable plutôt que de tourner. Le repli est l'énigme des livres,
        // augmentée d'un marcheur — elle, on sait qu'elle piège.
        for (let essai = 0; essai < 60; essai++) {
            const t = Array.from({ length: p.combien },
                () => rng.int(1, 12)).sort((a, z) => a - z);
            const best = meilleurChemin(t);
            if (best && best.minutes < strategieNavette(t)) { temps = t; break; }
        }
        if (!temps) temps = [1, 2, 5, 8, 10];
    }
    const best = meilleurChemin(temps);
    return {
        nom: p.nom,
        temps,
        marcheurs: temps.map((m, i) => ({ nom: MARCHEURS[i], minutes: m })),
        minutes: best.minutes,
        trajets: best.trajets,
        navette: strategieNavette(temps)
    };
}

/**
 * CE QU'UN TRAJET SE DIT EN FRANÇAIS — pour l'indice, le corrigé et le papier.
 *
 * « Léa et Tom passent ensemble (2 min) », « Léa rapporte la lampe (1 min) ».
 * LE VERBE CHANGE AVEC LE SENS : on ne « passe » pas en revenant, on RAPPORTE
 * la lampe — et c'est le geste que l'élève oublie, donc c'est celui qu'il faut
 * nommer.
 */
export function direLeTrajet(trajet, marcheurs) {
    const noms = trajet.qui.map(i => marcheurs[i].nom);
    const qui = noms.length === 2 ? `${noms[0]} et ${noms[1]}` : noms[0];
    const quoi = trajet.vers === 'droite'
        ? (noms.length === 2 ? 'passent ensemble' : 'passe')
        : 'rapporte la lampe';
    return `${qui} ${quoi} (${trajet.minutes} min)`;
}
