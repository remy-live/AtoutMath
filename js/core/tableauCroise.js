// LE TABLEAU À DOUBLE ENTRÉE — la règle, les énoncés, et ce qui se démontre.
//
// Rémy est parti d'une fiche : « Voilà un tableau concernant les élèves du
// collège. Complète les valeurs manquantes. » Avec, sous le tableau, l'astuce
// qui EST la méthode : « Essaie à chaque fois de trouver la ligne ou la colonne
// où il ne manque qu'une seule information. »
//
// CETTE ASTUCE N'EST PAS UN CONSEIL, C'EST LA DÉFINITION DE L'EXERCICE. Un
// tableau croisé se remplit par PROPAGATION : on cherche une ligne ou une
// colonne à un seul trou, on la boucle, et ce nouveau nombre en ouvre d'autres.
// Un tableau où aucune ligne n'a un seul trou ne se remplit plus par ce
// raisonnement-là — il faudrait poser un système, ce qui n'est pas le
// programme. Le générateur ne perce donc JAMAIS un trou sans vérifier que le
// tableau reste résoluble de proche en proche : c'est `resoudre` qui l'atteste,
// pas une intuition sur le nombre de trous.
//
// LA STRUCTURE EST UNIFORME, et c'est ce qui rend le solveur court. Un tableau
// de R lignes et C colonnes s'écrit en (R+1) × (C+1) : la dernière colonne
// porte les totaux de ligne, la dernière ligne les totaux de colonne, et le
// coin porte le total général. Alors la règle est la MÊME partout :
//   · dans chacune des R+1 lignes, les C premières cases font la dernière ;
//   · dans chacune des C+1 colonnes, les R premières font la dernière.
// La ligne des totaux et la colonne des totaux ne sont pas des cas
// particuliers : ce sont une ligne et une colonne comme les autres.

import { makeRng } from './ids.js';

export const ASTUCE = 'Cherche à chaque fois la ligne ou la colonne où il ne manque '
    + 'QU\'UNE SEULE information : celle-là, tu peux la boucler. Le nombre que tu viens '
    + 'd\'écrire en ouvre alors d\'autres. On n\'a jamais besoin de deviner.';

export const CONSIGNE = 'Complète les cases vides du tableau. ' + ASTUCE;

/**
 * LES ÉNONCÉS. Rémy : « fais plein de types d'énoncé, un peu rigolo pour
 * certains mais toujours correct ».
 *
 * « TOUJOURS CORRECT » EST LA CONTRAINTE FORTE, et elle porte sur trois choses
 * qu'un énoncé amusant rate facilement :
 *   · les deux entrées doivent vraiment CLASSER la même population, sans
 *     recouvrement ni oubli — sinon les totaux ne veulent rien dire ;
 *   · les ordres de grandeur doivent être crédibles : quatre cents élèves dans
 *     un collège, pas quatre cents potirons dans un jardin ;
 *   · le total général doit se dire en français correct (« en tout, 400
 *     élèves »), parce que c'est la phrase que l'élève relira.
 * Chaque énoncé porte donc ses propres bornes de tirage.
 */
/**
 * LES TROIS PHRASES D'UN ÉNONCÉ — pour le mode où le tableau part VIDE.
 *
 * Rémy : « j'aimerais bien aussi des exercices où on a un énoncé, le tableau
 * est vide et il faut remplir puis calculer et remplir. » C'est un autre
 * exercice, et un plus dur : avant de calculer quoi que ce soit, il faut
 * comprendre CHAQUE phrase et savoir dans quelle case elle va. C'est
 * exactement le geste qu'un élève rate en évaluation — il calcule très bien,
 * mais il a rangé le nombre dans la mauvaise case.
 *
 * TROIS FORMES, ET TROIS SEULEMENT, parce qu'une case n'a que trois natures :
 * elle croise une ligne et une colonne, elle totalise une ligne, ou elle
 * totalise une colonne. On les fabrique donc ici, une fois, à partir de deux
 * morceaux que chaque énoncé fournit :
 *   · `nom` : ce que compte une LIGNE — « demi-pensionnaires », « crêpes
 *     réussies », « kg de tomates » ;
 *   · `ou`  : le complément que pose une COLONNE — « en 6ᵉ », « le lundi »,
 *     « à la confiture ».
 * Le reste est commun, et c'est ce qui garantit que les dix-neuf énoncés
 * parlent la même langue.
 *
 * `extra` permet de récrire une forme quand l'assemblage sonne faux : les
 * chaussettes veulent « 6 chaussettes blanches dépareillées » et non
 * « 6 chaussettes dépareillées blanches ». Un cas, une ligne, et l'on ne tord
 * pas la règle générale pour lui.
 */
function phrases(nom, ou, unite, extra = {}) {
    return {
        croise: (v, l, c) => `${v} ${nom(l)} ${ou(c)}`,
        ligne: (v, l) => `au total, ${v} ${nom(l)}`,
        colonne: (v, c) => `au total, ${v} ${unite} ${ou(c)}`,
        total: (v) => `en tout, ${v} ${unite}`,
        ...extra
    };
}

export const ENONCES = [
    {
        id: 'college', titre: 'Les élèves du collège',
        phrase: 'Voilà un tableau concernant les élèves du collège.',
        lignes: ['D.P.', 'Externes'], colonnes: ['6ᵉ', '5ᵉ', '4ᵉ', '3ᵉ'],
        unite: 'élèves', mini: 25, maxi: 70,
        dit: phrases(l => l === 'D.P.' ? 'demi-pensionnaires' : 'externes', c => `en ${c}`, 'élèves')
    },
    {
        id: 'boulangerie', titre: 'La boulangerie du coin',
        phrase: 'Le boulanger a noté ce qu\'il a vendu chaque matin de la semaine.',
        lignes: ['Croissants', 'Pains au chocolat', 'Chouquettes', 'Baguettes'],
        colonnes: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'],
        unite: 'viennoiseries', mini: 12, maxi: 60,
        dit: phrases(l => l.toLowerCase(), c => `le ${c.toLowerCase()}`, 'viennoiseries')
    },
    {
        id: 'refuge', titre: 'Le refuge pour animaux',
        phrase: 'Le refuge a compté ses pensionnaires.',
        lignes: ['Chats', 'Chiens', 'Lapins'], colonnes: ['Mâles', 'Femelles'],
        unite: 'animaux', mini: 6, maxi: 40,
        dit: phrases(l => l.toLowerCase(), c => c.toLowerCase(), 'animaux')
    },
    {
        id: 'cdi', titre: 'Les livres du CDI',
        phrase: 'La documentaliste a rangé les livres du CDI.',
        lignes: ['Romans', 'BD', 'Documentaires'],
        colonnes: ['Empruntés', 'Sur les rayons'],
        unite: 'livres', mini: 20, maxi: 120,
        dit: phrases(l => (l === 'BD' ? 'BD' : l.toLowerCase()),
            c => (c === 'Empruntés' ? 'en emprunt' : 'sur les rayons'), 'livres')
    },
    {
        id: 'potager', titre: 'Le potager du collège',
        phrase: 'Le club jardinage a pesé sa récolte, en kilogrammes.',
        lignes: ['Tomates', 'Courgettes', 'Haricots'],
        colonnes: ['Juin', 'Juillet', 'Août'],
        unite: 'kilogrammes', mini: 3, maxi: 25,
        dit: phrases(l => `kg de ${l.toLowerCase()}`, c => `en ${c.toLowerCase()}`, 'kilogrammes')
    },
    {
        // Rigolo, et pourtant irréprochable : chaque excuse a été entendue une
        // fois, dans une classe et une seule. Les deux entrées classent bien la
        // même population — les excuses de l'année.
        id: 'excuses', titre: 'Les excuses pour un devoir non fait',
        phrase: 'Le professeur a noté, toute l\'année, les excuses qu\'on lui a servies. '
            + 'Chaque excuse a été comptée une fois.',
        lignes: ['« Le chien l\'a mangé »', '« J\'ai oublié mon cahier »', '« J\'étais malade »'],
        colonnes: ['6ᵉ', '5ᵉ', '4ᵉ'],
        unite: 'excuses', mini: 2, maxi: 18,
        dit: phrases(l => `fois ${l}`, c => `en ${c}`, 'excuses')
    },
    {
        id: 'crepes', titre: 'Les crêpes de la Chandeleur',
        phrase: 'On a fait des crêpes. Certaines sont retombées dans la poêle, '
            + 'les autres au plafond. On a tout noté.',
        lignes: ['Réussies', 'Ratées'],
        colonnes: ['Sucre', 'Confiture', 'Chocolat'],
        unite: 'crêpes', mini: 4, maxi: 30,
        dit: phrases(l => `crêpes ${l.toLowerCase()}`,
            c => ({ Sucre: 'au sucre', Confiture: 'à la confiture', Chocolat: 'au chocolat' })[c], 'crêpes')
    },
    {
        id: 'infirmerie', titre: 'Le cahier de l\'infirmerie',
        phrase: 'L\'infirmière a compté les passages de la semaine.',
        lignes: ['Mal de tête', 'Mal au ventre', 'Genou écorché', 'Doigt coincé'],
        colonnes: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'],
        unite: 'passages', mini: 5, maxi: 45,
        dit: phrases(l => `passages pour « ${l.toLowerCase()} »`, c => `le ${c.toLowerCase()}`, 'passages')
    },
    {
        id: 'tri', titre: 'Le tri des déchets',
        phrase: 'Le collège a pesé ce qu\'il a trié, en kilogrammes.',
        lignes: ['Papier', 'Verre', 'Plastique', 'Métal'],
        colonnes: ['Septembre', 'Octobre', 'Novembre', 'Décembre'],
        unite: 'kilogrammes', mini: 8, maxi: 60,
        dit: phrases(l => `kg de ${l.toLowerCase()}`, c => `en ${c.toLowerCase()}`, 'kilogrammes')
    },
    {
        id: 'robotique', titre: 'Le club robotique',
        phrase: 'Le club a présenté ses robots au concours.',
        lignes: ['Robots qui roulent', 'Robots qui marchent'],
        colonnes: ['6ᵉ', '5ᵉ', '4ᵉ', '3ᵉ'],
        unite: 'robots', mini: 2, maxi: 14,
        dit: phrases(l => l.toLowerCase(), c => `en ${c}`, 'robots')
    },
    {
        // Rigolo mais rigoureux : une chaussette est soit dépareillée, soit
        // appariée ; elle est d'une seule couleur. Rien ne se recoupe.
        id: 'chaussettes', titre: 'Les chaussettes du gymnase',
        phrase: 'À la fin de l\'année, on a vidé le bac des objets trouvés du gymnase.',
        lignes: ['Dépareillées', 'Par paires'],
        colonnes: ['Blanches', 'Noires', 'À rayures'],
        unite: 'chaussettes', mini: 3, maxi: 26,
        dit: phrases(l => `chaussettes ${l.toLowerCase()}`,
            c => (c === 'À rayures' ? 'à rayures' : c.toLowerCase()), 'chaussettes', {
            // « 6 chaussettes dépareillées blanches » se lit de travers :
            // en français la couleur vient avant l'état.
            croise: (v, l, c) => `${v} chaussettes ${c === 'À rayures' ? 'à rayures' : c.toLowerCase()} `
                + (l === 'Dépareillées' ? 'dépareillées' : 'rangées par paires')
        })
    },
    {
        id: 'cantine', titre: 'Les desserts de la cantine',
        phrase: 'La cantine a servi ses desserts cette semaine.',
        lignes: ['Yaourt', 'Fruit', 'Gâteau', 'Compote'],
        colonnes: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'],
        unite: 'desserts', mini: 20, maxi: 90,
        dit: phrases(l => ({ Yaourt: 'yaourts', Fruit: 'fruits', 'Gâteau': 'gâteaux', Compote: 'compotes' })[l],
            c => `le ${c.toLowerCase()}`, 'desserts')
    },
    {
        id: 'tournoi', titre: 'Le tournoi d\'échecs',
        phrase: 'Chaque partie du tournoi s\'est terminée d\'une seule façon.',
        lignes: ['Gagnées', 'Nulles', 'Perdues'],
        colonnes: ['Équipe A', 'Équipe B', 'Équipe C', 'Équipe D'],
        unite: 'parties', mini: 2, maxi: 16,
        dit: phrases(l => `parties ${l.toLowerCase()}`, c => `pour l'${c.replace('Équipe', 'équipe')}`, 'parties')
    },
    {
        id: 'bus', titre: 'Les cars de ramassage',
        phrase: 'Le collège a compté les élèves qui prennent le car.',
        lignes: ['Car du matin', 'Car du soir'],
        colonnes: ['Ligne 1', 'Ligne 2', 'Ligne 3'],
        unite: 'élèves', mini: 12, maxi: 55,
        dit: phrases(l => `élèves dans le ${l.toLowerCase()}`, c => `sur la ${c.toLowerCase()}`, 'élèves')
    },
    {
        id: 'ferme', titre: 'La ferme pédagogique',
        phrase: 'La ferme du village a compté ses animaux, enclos par enclos.',
        lignes: ['Poules', 'Chèvres', 'Moutons', 'Lapins'],
        colonnes: ['Enclos 1', 'Enclos 2', 'Enclos 3', 'Enclos 4'],
        unite: 'animaux', mini: 3, maxi: 22,
        dit: phrases(l => l.toLowerCase(), c => `dans l'${c.toLowerCase()}`, 'animaux')
    },
    {
        id: 'course', titre: 'Le cross du collège',
        phrase: 'On a compté les coureurs arrivés dans chaque tranche horaire.',
        lignes: ['Filles', 'Garçons'],
        colonnes: ['Moins de 15 min', 'De 15 à 20 min', 'Plus de 20 min'],
        unite: 'coureurs', mini: 8, maxi: 45,
        dit: phrases(l => l.toLowerCase(), c => ({ 'Moins de 15 min': 'en moins de 15 min',
            'De 15 à 20 min': 'entre 15 et 20 min', 'Plus de 20 min': 'en plus de 20 min' })[c], 'coureurs')
    },
    {
        // Rigolo et rigoureux : un chausson est d'une pointure et d'une seule,
        // et il est soit rendu, soit encore au vestiaire.
        id: 'chaussons', titre: 'Les chaussons du gymnase',
        phrase: 'Le gymnase a fait l\'inventaire de ses chaussons de gym.',
        lignes: ['Rendus', 'Encore au vestiaire', 'Troués'],
        colonnes: ['Pointure 36', 'Pointure 38', 'Pointure 40', 'Pointure 42'],
        unite: 'chaussons', mini: 2, maxi: 24,
        dit: phrases(l => (l === 'Encore au vestiaire' ? 'chaussons encore au vestiaire' : `chaussons ${l.toLowerCase()}`),
            c => `en ${c.toLowerCase()}`, 'chaussons')
    },
    {
        id: 'kermesse', titre: 'Les lots de la kermesse',
        phrase: 'La kermesse a distribué ses lots au fil de la journée.',
        lignes: ['Peluches', 'Bonbons', 'Ballons'],
        colonnes: ['Matin', 'Midi', 'Après-midi', 'Soir'],
        unite: 'lots', mini: 6, maxi: 50,
        dit: phrases(l => l.toLowerCase(), c => ({ Matin: 'le matin', Midi: 'à midi',
            'Après-midi': 'l\'après-midi', Soir: 'le soir' })[c], 'lots')
    },
    {
        id: 'bibliobus', titre: 'La grande énigme des parapluies',
        phrase: 'Après trois jours de pluie, l\'accueil a classé les parapluies oubliés. '
            + 'Chacun n\'a été compté qu\'une fois, le jour où il est arrivé.',
        lignes: ['Cassés', 'En bon état'],
        colonnes: ['Lundi', 'Mardi', 'Mercredi'],
        unite: 'parapluies', mini: 2, maxi: 20,
        dit: phrases(l => (l === 'Cassés' ? 'parapluies cassés' : 'parapluies en bon état'),
            c => `le ${c.toLowerCase()}`, 'parapluies')
    }
];

/**
 * LES PALIERS. La difficulté ne tient pas aux calculs — ce sont des additions
 * et des soustractions — mais au nombre de TOURS de propagation qu'il faut
 * faire, et à la taille du tableau qu'il faut balayer pour trouver la prochaine
 * ligne à un seul trou.
 *
 * ON NE PEUT PAS CACHER PLUS DE R + C + 1 CASES, JAMAIS. Ce n'est pas une
 * limite du générateur, c'est de l'arithmétique : un tableau de R lignes et C
 * colonnes est ENTIÈREMENT déterminé par ses R × C cases intérieures, et il en
 * compte (R+1) × (C+1) = R×C + R + C + 1 en tout. Il n'y a donc que R + C + 1
 * cases « en trop » — les totaux — et cacher la moindre case au-delà laisserait
 * moins de nombres que d'inconnues. Plusieurs tableaux différents répondraient
 * alors, et l'exercice n'aurait plus de réponse.
 *
 * Le générateur ATTEINT ce maximum : sur un tableau 3 × 4, il cache bien huit
 * cases sur vingt. Pour rendre l'exercice plus difficile, il faut donc agrandir
 * le tableau, pas percer davantage — c'est ce que fait le dernier palier.
 */
export const PALIERS = {
    decouverte: {
        label: 'Petit tableau, peu de trous — avec la calculatrice',
        lignes: 2, colonnes: 3, trous: 4, calculatrice: true
    },
    facile: {
        label: 'Comme sur la fiche — 2 lignes, 4 colonnes',
        lignes: 2, colonnes: 4, trous: 7, calculatrice: true
    },
    moyen: {
        label: '3 lignes, 4 colonnes — tous les totaux cachés',
        lignes: 3, colonnes: 4, trous: 8, calculatrice: true
    },
    difficile: {
        // La calculatrice s'éteint ici, et le tableau grandit : les deux seuls
        // leviers qui restent une fois qu'on cache déjà tout ce qu'on peut.
        label: '4 lignes, 4 colonnes — sans calculatrice',
        lignes: 4, colonnes: 4, trous: 9, calculatrice: false
    }
};

/** Le maximum démontrable de cases cachées : les totaux, et rien de plus. */
export const trousMaximum = (R, C) => R + C + 1;

// --- Le tableau ---------------------------------------------------------------

export const estTotalLigne = (t, r) => r === t.lignes.length;
export const estTotalColonne = (t, c) => c === t.colonnes.length;
export const cle = (r, c) => `${r},${c}`;

/** Le tableau complet, totaux compris, en (R+1) × (C+1). */
function completer(interieur, R, C) {
    const M = [];
    for (let r = 0; r < R; r++) {
        const ligne = [...interieur[r]];
        ligne.push(ligne.reduce((a, b) => a + b, 0));
        M.push(ligne);
    }
    const bas = [];
    for (let c = 0; c <= C; c++) {
        let s = 0;
        for (let r = 0; r < R; r++) s += M[r][c];
        bas.push(s);
    }
    M.push(bas);
    return M;
}

/**
 * RÉSOUDRE PAR PROPAGATION, exactement comme l'astuce de la fiche le dit.
 *
 * On ne pose aucun système : on cherche une ligne ou une colonne où il ne
 * manque qu'une case, on la remplit, et on recommence. C'est aussi le juge de
 * la génération — un tableau que cette fonction n'achève pas est un tableau
 * qu'un élève de sixième ne peut pas finir non plus.
 *
 * @returns {{complet: boolean, valeurs: Array, etapes: Array}} les étapes sont
 * l'ordre dans lequel les cases s'ouvrent : c'est ce qu'on montre en aide.
 */
export function resoudre(M, connus, R, C) {
    const v = M.map((ligne, r) => ligne.map((n, c) => (connus.has(cle(r, c)) ? n : null)));
    const etapes = [];
    let bouge = true;
    while (bouge) {
        bouge = false;
        // Les R+1 lignes : les C premières cases font la dernière.
        for (let r = 0; r <= R; r++) {
            const trou = deduireLigne(v[r], C);
            if (trou !== null) {
                v[r][trou.i] = trou.valeur;
                etapes.push({ r, c: trou.i, valeur: trou.valeur, sens: 'ligne', indice: r });
                bouge = true;
            }
        }
        // Les C+1 colonnes : les R premières font la dernière.
        for (let c = 0; c <= C; c++) {
            const colonne = v.map(ligne => ligne[c]);
            const trou = deduireLigne(colonne, R);
            if (trou !== null) {
                v[trou.i][c] = trou.valeur;
                etapes.push({ r: trou.i, c, valeur: trou.valeur, sens: 'colonne', indice: c });
                bouge = true;
            }
        }
    }
    const complet = v.every(ligne => ligne.every(n => n !== null));
    return { complet, valeurs: v, etapes };
}

/**
 * Une ligne de n+1 cases dont les n premières font la dernière : s'il n'y
 * manque QU'UNE case, on la trouve. Sinon on ne devine pas.
 */
function deduireLigne(cases, n) {
    let manquants = [];
    for (let i = 0; i <= n; i++) if (cases[i] === null) manquants.push(i);
    if (manquants.length !== 1) return null;
    const i = manquants[0];
    let somme = 0;
    for (let k = 0; k < n; k++) if (k !== i) somme += cases[k];
    // Le trou est dans le total : on additionne. Il est dans le corps : on
    // soustrait le reste du total. Ce sont les deux gestes de l'exercice.
    return { i, valeur: i === n ? somme : cases[n] - somme };
}

/**
 * Un tableau à compléter.
 *
 * ON PERCE LES TROUS UN PAR UN, EN VÉRIFIANT À CHAQUE FOIS. Tirer d'emblée dix
 * cases au hasard donnerait un tableau insoluble une fois sur deux — et
 * l'élève, lui, n'a aucun moyen de savoir que c'est le tableau qui est fautif.
 * On perce donc un trou, on relance le solveur, et on remet la case si elle ne
 * se retrouve plus. Ce qui sort est résoluble PAR CONSTRUCTION.
 */
export function genererTableau({ rng = makeRng(1), palier = 'facile', enonce = null, tour = null, depart = 'tableau' } = {}) {
    const P = PALIERS[palier] || PALIERS.facile;
    // Un énoncé qui a au moins assez de libellés pour ce palier.
    const possibles = ENONCES.filter(e => e.lignes.length >= P.lignes && e.colonnes.length >= P.colonnes);
    const pioche = possibles.length ? possibles : ENONCES;
    // SUR UNE FEUILLE, LES ÉNONCÉS NE DOIVENT PAS SE RÉPÉTER. Tirés
    // indépendamment, huit contextes pour six blocs donnent souvent un doublon,
    // et parfois trois blocs identiques : la feuille a l'air bâclée alors que le
    // tirage est correct. Quand l'appelant sait quel numéro de bloc il fabrique
    // (`tour`), on PARCOURT la liste au lieu de tirer.
    //
    // ET LE DÉPART N'EST PAS TIRÉ AU SORT, volontairement. Chaque bloc de la
    // feuille a son propre générateur aléatoire : un décalage tiré serait
    // différent d'un bloc à l'autre et détruirait justement la rotation qu'on
    // cherche — essayé, mesuré, quatre blocs identiques sur six. L'ordre des
    // contextes est donc le même d'une feuille à l'autre ; ce sont les NOMBRES
    // qui changent, et c'est ce qui compte. Une page variée vaut mieux qu'un
    // ordre imprévisible.
    const E = (enonce && ENONCES.find(e => e.id === enonce))
        || (Number.isInteger(tour) ? pioche[tour % pioche.length] : rng.pick(pioche));
    const R = Math.min(P.lignes, E.lignes.length);
    const C = Math.min(P.colonnes, E.colonnes.length);

    const interieur = [];
    for (let r = 0; r < R; r++) {
        const ligne = [];
        for (let c = 0; c < C; c++) ligne.push(rng.int(E.mini, E.maxi));
        interieur.push(ligne);
    }
    const M = completer(interieur, R, C);

    // Toutes les cases sont connues, puis on en retire tant qu'on peut.
    const connus = new Set();
    for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) connus.add(cle(r, c));
    // PLUSIEURS PASSES, et pas une seule. Une case qu'on n'a pas pu retirer au
    // premier tour peut devenir retirable une fois qu'une AUTRE case est
    // partie — l'ordre compte. Un seul balayage laissait deux ou trois trous
    // sur la table, et le palier « difficile » ressemblait au palier « moyen ».
    let perces = 0;
    let encore = true;
    while (encore && perces < P.trous) {
        encore = false;
        for (const k of rng.shuffle([...connus])) {
            if (perces >= P.trous) break;
            connus.delete(k);
            if (resoudre(M, connus, R, C).complet) { perces++; encore = true; }
            else connus.add(k);
        }
    }

    const bilan = resoudre(M, connus, R, C);
    const t = {
        enonce: E.id, titre: E.titre, phrase: E.phrase, unite: E.unite,
        lignes: E.lignes.slice(0, R), colonnes: E.colonnes.slice(0, C),
        R, C,
        valeurs: M,
        connus: [...connus],
        // OÙ SONT LES DONNÉES : dans le tableau, ou dans l'énoncé ?
        //
        // C'est le même tableau, la même garantie de résolubilité, le même
        // solveur — seule change la place des nombres donnés. En mode
        // « énoncé », les cases connues ne sont pas écrites : elles sont DITES,
        // et c'est à l'élève de les ranger avant de calculer le reste.
        depart: depart === 'enonce' ? 'enonce' : 'tableau',
        trous: (R + 1) * (C + 1) - connus.size,
        // L'ordre dans lequel les cases s'ouvrent : l'aide s'en sert pour
        // désigner la PROCHAINE ligne à boucler, jamais la case à écrire.
        etapes: bilan.etapes,
        calculatrice: P.calculatrice,
        palier
    };
    if (t.depart === 'enonce') t.donnees = faitsDeLEnonce(t, E, rng);
    return t;
}

/**
 * LES PHRASES DE L'ÉNONCÉ, une par case donnée.
 *
 * ELLES SONT MÉLANGÉES, et ce n'est pas une coquetterie : données dans l'ordre
 * de lecture du tableau, elles se recopieraient de haut en bas sans qu'on ait
 * jamais à comprendre où va quoi — c'est-à-dire sans faire l'exercice. C'est
 * le rangement qui est le travail ici.
 */
function faitsDeLEnonce(t, E, rng) {
    const dit = E.dit;
    const faits = t.connus.map((k) => {
        const [r, c] = k.split(',').map(Number);
        const v = t.valeurs[r][c];
        const ligneTotale = estTotalLigne(t, r), colonneTotale = estTotalColonne(t, c);
        const phrase = (ligneTotale && colonneTotale) ? dit.total(v)
            : colonneTotale ? dit.ligne(v, t.lignes[r])
                : ligneTotale ? dit.colonne(v, t.colonnes[c])
                    : dit.croise(v, t.lignes[r], t.colonnes[c]);
        return { r, c, valeur: v, phrase };
    });
    return rng.shuffle(faits);
}

/** Le fait de l'énoncé qui va dans cette case, s'il y en a un. */
export const faitDe = (t, r, c) => (t.donnees || []).find(d => d.r === r && d.c === c) || null;

/**
 * La case est-elle DÉJÀ ÉCRITE dans le tableau ?
 *
 * En mode « énoncé », aucune ne l'est : les cases connues sont dites, pas
 * écrites, et l'élève doit toutes les remplir. La distinction compte pour
 * l'affichage ; le solveur, lui, continue de raisonner sur `connus`, qui reste
 * l'ensemble mathématiquement donné.
 */
export const estDonnee = (t, r, c) => t.depart !== 'enonce' && t.connus.includes(cle(r, c));

/** La case est-elle donnée quelque part — dans le tableau ou dans l'énoncé ? */
export const estConnue = (t, r, c) => t.connus.includes(cle(r, c));

/** La consigne, qui n'est pas la même selon d'où viennent les nombres. */
export function consigneDe(t) {
    return t && t.depart === 'enonce'
        ? 'Reporte d\'abord les informations de l\'énoncé dans le tableau, puis complète-le. '
            + ASTUCE
        : CONSIGNE;
}

/** Le total général, pour la phrase d'énoncé : « en tout, 400 élèves ». */
export const totalGeneral = (t) => t.valeurs[t.R][t.C];

/**
 * La prochaine ligne (ou colonne) où il ne manque qu'une case, vu l'état de la
 * copie de l'élève. C'est l'aide : on désigne la LIGNE, pas la réponse.
 */
export function prochaineLigne(t, saisies) {
    // EN MODE « ÉNONCÉ », RIEN N'EST ÉCRIT AU DÉPART. Partir de `connus`
    // reviendrait à conseiller une ligne en tenant pour acquis des nombres que
    // l'élève n'a pas encore reportés — l'aide désignerait une ligne qui, sur
    // sa feuille, en a encore trois de vides.
    const connus = new Set(t.depart === 'enonce' ? [] : t.connus);
    Object.entries(saisies || {}).forEach(([k, v]) => {
        const [r, c] = k.split(',').map(Number);
        if (Number(v) === t.valeurs[r][c]) connus.add(k);
    });
    for (let r = 0; r <= t.R; r++) {
        const manquants = compterManquants(t, connus, r, null);
        if (manquants.length === 1) return { sens: 'ligne', indice: r, case: manquants[0] };
    }
    for (let c = 0; c <= t.C; c++) {
        const manquants = compterManquants(t, connus, null, c);
        if (manquants.length === 1) return { sens: 'colonne', indice: c, case: manquants[0] };
    }
    return null;
}

function compterManquants(t, connus, r, c) {
    const out = [];
    if (r !== null) { for (let k = 0; k <= t.C; k++) if (!connus.has(cle(r, k))) out.push([r, k]); }
    else { for (let k = 0; k <= t.R; k++) if (!connus.has(cle(k, c))) out.push([k, c]); }
    return out;
}

/** Le nom d'une ligne ou d'une colonne, tel qu'on le dit à l'élève. */
export function nomDeLigne(t, r) { return estTotalLigne(t, r) ? 'la ligne « Total »' : `la ligne « ${t.lignes[r]} »`; }
export function nomDeColonne(t, c) { return estTotalColonne(t, c) ? 'la colonne « Total »' : `la colonne « ${t.colonnes[c]} »`; }

/** Le conseil écrit : il désigne la ligne à boucler, jamais le nombre. */
export function conseil(t, saisies) {
    // LE REPORT AVANT LE CALCUL. Tant qu'une phrase de l'énoncé n'est pas
    // rangée, il n'y a rien à déduire : conseiller une ligne à ce moment-là
    // enverrait l'élève chercher un raisonnement là où il manque une lecture.
    if (t.depart === 'enonce') {
        const reste = (t.donnees || []).find(d => Number((saisies || {})[cle(d.r, d.c)]) !== d.valeur);
        if (reste) {
            return `Reprends l'énoncé : « ${reste.phrase} ». Cherche la ligne et la colonne `
                + 'qui se croisent là, et écris le nombre dans cette case.';
        }
    }
    const suite = prochaineLigne(t, saisies);
    if (!suite) return 'Tout est rempli — vérifie que chaque ligne et chaque colonne tombe bien sur son total.';
    const ou = suite.sens === 'ligne' ? nomDeLigne(t, suite.indice) : nomDeColonne(t, suite.indice);
    return `Regarde ${ou} : il n'y manque qu'une seule case. Additionne ce que tu y as déjà `
        + (suite.case[suite.sens === 'ligne' ? 1 : 0] === (suite.sens === 'ligne' ? t.C : t.R)
            ? 'et tu obtiens le total.'
            : 'et retire-le du total.');
}
