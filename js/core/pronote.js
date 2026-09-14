// LA PASSERELLE VERS PRONOTE — coller la liste, recopier la colonne.
//
// Rémy : « est-ce que quand j'aurai tout en ligne […] je pourrais faire une
// liaison de l'un à l'autre pour récupérer directement les notes sans devoir
// les saisir ? »
//
// PAS D'API, ET IL FAUT LE DIRE. Index Éducation ouvre des services web à des
// logiciels PARTENAIRES, sous convention passée par l'établissement : ce n'est
// pas quelque chose qu'un enseignant branche seul. Ce module ne prétend donc
// pas parler à PRONOTE. Il fait la seule chose qui marche vraiment et qui ne
// dépend de personne : produire une COLONNE que l'on colle dans la grille de
// notes, d'un seul geste.
//
// TOUT LE PROBLÈME EST L'ORDRE DES LIGNES, ET RIEN D'AUTRE. Une note décalée
// d'une ligne est pire que pas de note du tout : elle est fausse, elle est
// silencieuse, et elle concerne deux élèves à la fois. Rémy : « pour PRONOTE
// on peut trier par nom, du coup si on trie [pareil] ça va le faire aussi. »
// C'est exact, et c'est la stratégie retenue — les deux côtés triés par nom se
// correspondent ligne à ligne.
//
// MAIS ON NE PARIE PAS LÀ-DESSUS EN AVEUGLE. Deux tris « alphabétiques » ne
// s'accordent pas toujours : les accents, les particules, les noms composés,
// les majuscules se rangent différemment d'un logiciel à l'autre. On produit
// donc TOUJOURS deux sorties — la colonne seule, à coller, et la même liste
// avec les noms en regard, à relire. Le professeur vérifie le premier et le
// dernier nom en trois secondes, et le décalage devient impossible à ne pas
// voir.
//
// UN ABSENT REÇOIT UNE CASE VIDE, PAS UN ZÉRO. Un zéro est un jugement :
// « il a composé et il a tout faux ». Une case vide est un fait : « il n'a rien
// fait ». Écrire l'un pour l'autre serait une faute, et elle se propagerait
// dans la moyenne sans que personne ne la voie.

import { normaliser } from './classes.js';

/**
 * Les étiquettes que les exports mettent en tête de colonne. La ligne doit
 * valoir EXACTEMENT l'une d'elles : voir `lireListe`, où un préfixe suffisait
 * et faisait disparaître un élève nommé « Nomain ».
 */
const EN_TETES = new Set([
    'nom', 'noms', 'eleve', 'eleves', 'nom prenom', 'prenom nom', 'nom et prenom',
    'nom de l eleve', 'liste', 'liste des eleves', 'nom complet', 'identite'
]);

/**
 * LIRE UNE LISTE COLLÉE, quel que soit le format du copier-coller.
 *
 * Un export de PRONOTE, un tableur, une sélection dans une page : on reçoit
 * des lignes, parfois avec des colonnes en trop (classe, identifiant, date de
 * naissance), parfois une ligne d'en-tête. On garde ce qui ressemble à un nom
 * et l'on dit ce qu'on a écarté — un import silencieux qui perd trois élèves
 * est exactement ce qu'on ne veut pas.
 *
 * @returns {{ eleves: string[], ignorees: string[] }}
 */
export function lireListe(texte) {
    const lignes = String(texte || '').split(/\r?\n/);
    const eleves = [];
    const ignorees = [];
    const vus = new Set();

    for (const brute of lignes) {
        const ligne = brute.trim();
        if (!ligne) continue;

        // La première colonne d'un tableur suffit : les suivantes portent la
        // classe, un identifiant, une date — jamais le nom.
        let nom = ligne.split(/\t|;/)[0].trim();
        // « Dupont, Léa » — la virgule sépare le nom du prénom dans beaucoup
        // d'exports. On la remplace par une espace plutôt que de couper : le
        // prénom fait partie du nom qu'on affiche.
        nom = nom.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
        // Les guillemets d'un CSV.
        nom = nom.replace(/^"(.*)"$/, '$1').trim();

        if (!nom) continue;
        // UNE LIGNE D'EN-TÊTE N'EST PAS UN ÉLÈVE, MAIS UN ÉLÈVE N'EST PAS UN
        // EN-TÊTE NON PLUS.
        //
        // Mon premier filtre testait un PRÉFIXE : « nom », « élève », « liste »
        // en début de ligne. Il écartait donc « Nomain Théo », et l'aurait fait
        // sans un mot — un élève qui disparaît de la colonne, et toutes les
        // notes suivantes décalées d'un cran. On exige maintenant que la ligne
        // ENTIÈRE soit une étiquette, ce qu'aucun nom d'élève ne peut être.
        if (eleves.length === 0 && EN_TETES.has(normaliser(nom))) {
            ignorees.push(ligne);
            continue;
        }
        // Un nom contient au moins une lettre. Une ligne de chiffres est un
        // numéro de page ou un total.
        if (!/\p{L}/u.test(nom)) { ignorees.push(ligne); continue; }

        const cle = normaliser(nom);
        if (vus.has(cle)) { ignorees.push(ligne); continue; }
        vus.add(cle);
        eleves.push(nom);
    }
    return { eleves, ignorees };
}

/**
 * L'ORDRE, ET IL EST LE MÊME PARTOUT DANS L'APPLICATION.
 *
 * On reprend exactement `elevesTries` : normalisation des accents et des
 * majuscules, puis comparaison française. Deux endroits qui trient
 * différemment finiraient par se contredire, et c'est précisément le genre
 * d'écart qui produit une colonne décalée.
 */
export function parNom(a, b) {
    return normaliser(a).localeCompare(normaliser(b), 'fr');
}

/** Arrondi à un nombre de décimales, sans le 0,30000000000000004 du flottant. */
const arrondir = (x, d) => {
    const k = Math.pow(10, d);
    return Math.round(x * k) / k;
};

/**
 * LA NOTE D'UN ÉLÈVE, et ce qu'elle ne dit pas.
 *
 * C'est le taux de réussite ramené sur le barème. Simple, et c'est voulu :
 * toute formule plus savante serait une décision pédagogique déguisée en
 * calcul, et elle appartient au professeur.
 *
 * ON N'INVENTE AUCUNE PÉNALITÉ DE QUANTITÉ. Un élève qui répond juste à trois
 * questions sur trente sort à 20/20, et c'est mathématiquement exact. C'est
 * aussi trompeur — d'où `questions`, rendu à côté de la note et affiché dans
 * la liste de contrôle. Le professeur voit « 20 sur 3 questions » et tranche.
 * Corriger cela en douce dans la formule cacherait le problème au lieu de le
 * montrer.
 */
export function noteDe(bilan, { sur = 20, decimales = 1 } = {}) {
    if (!bilan || !bilan.questions) return null;
    return arrondir((bilan.reussite || 0) * sur, Math.max(0, decimales | 0));
}

/**
 * LA COLONNE, PRÊTE À COLLER.
 *
 * @param {Array} bilans   les bilans d'élèves ({ nom, questions, reussite })
 * @param {Array} liste    les noms de la classe, dans l'ordre voulu ; si l'on
 *                         n'en donne pas, on prend ceux des bilans triés par nom
 * @returns {{ lignes: Array, absents: number, sansListe: string[] }}
 */
export function colonne(bilans, liste = null, options = {}) {
    const parCle = new Map();
    (bilans || []).forEach(b => { if (b && b.nom) parCle.set(normaliser(b.nom), b); });

    const noms = (liste && liste.length ? [...liste] : (bilans || []).map(b => b.nom))
        .filter(Boolean).sort(parNom);

    let absents = 0;
    const lignes = noms.map(nom => {
        const b = parCle.get(normaliser(nom));
        const note = b ? noteDe(b, options) : null;
        if (note === null) absents += 1;
        return {
            nom,
            note,
            questions: (b && b.questions) || 0,
            // On garde la trace de ce qui manque : un élève de la liste qu'on
            // n'a jamais vu travailler, et un élève qui a travaillé sans être
            // dans la liste, ne se soignent pas de la même façon.
            inconnu: !b
        };
    });

    // CEUX QUI ONT TRAVAILLÉ SANS ÊTRE DANS LA LISTE. Un prénom mal orthographié
    // à l'inscription, un élève arrivé en cours d'année : sans ce compte, sa
    // note disparaîtrait sans un mot.
    const dansLaListe = new Set(noms.map(normaliser));
    const sansListe = (bilans || [])
        .filter(b => b && b.nom && b.questions && !dansLaListe.has(normaliser(b.nom)))
        .map(b => b.nom);

    return { lignes, absents, sansListe };
}

/** La colonne seule, une note par ligne — c'est CELA qu'on colle dans PRONOTE. */
export function enColonne(lignes) {
    return (lignes || []).map(l => (l.note === null ? '' : String(l.note).replace('.', ','))).join('\n');
}

/**
 * LA MÊME LISTE AVEC LES NOMS, pour relire avant de coller.
 *
 * Séparée par des tabulations : collée dans un tableur elle se range en
 * colonnes toute seule, et c'est le format qu'un export de notes attend.
 */
export function enTableau(lignes) {
    const entete = 'Nom\tNote\tQuestions';
    const corps = (lignes || []).map(l =>
        `${l.nom}\t${l.note === null ? '' : String(l.note).replace('.', ',')}\t${l.questions || ''}`);
    return [entete, ...corps].join('\n');
}

/**
 * CE QU'IL FAUT VÉRIFIER AVANT DE COLLER, dit en une phrase.
 *
 * Pas un message de confort : le décalage d'une ligne est la seule faute grave
 * possible ici, et elle ne se voit pas dans PRONOTE une fois collée. On donne
 * donc les deux bornes — le premier et le dernier nom —, qui suffisent à
 * l'attraper.
 */
export function aVerifier(lignes) {
    const n = (lignes || []).length;
    if (!n) return 'Aucun élève dans la liste.';
    const premier = lignes[0].nom;
    const dernier = lignes[n - 1].nom;
    return `${n} lignes, de « ${premier} » à « ${dernier} ». `
        + 'Dans PRONOTE, trie par nom et vérifie que ces deux-là sont bien '
        + 'en première et en dernière position avant de coller.';
}
