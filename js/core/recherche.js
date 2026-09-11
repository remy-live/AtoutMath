// LA RECHERCHE D'EXERCICES — trouver sans savoir où c'est rangé.
//
// Le catalogue est rangé par domaine, et c'est très bien pour explorer. Mais
// quand on cherche « les fractions » ou « le jeu de pizza », on ne veut pas
// descendre trois dossiers : on veut taper trois lettres et voir la liste se
// resserrer. C'est ce que fait ce module.
//
// Trois exigences, et elles viennent toutes de l'usage réel :
//
//   SANS ACCENT.       On tape « geometrie » au clavier d'un téléphone, sans
//                      s'arrêter pour chercher l'accent. « Géométrie » doit
//                      sortir. Idem « eleve », « decimaux », « peripherie ».
//   PLUSIEURS MOTS.    « fraction 6e » doit croiser les deux critères, pas
//                      chercher la chaîne « fraction 6e » telle quelle.
//   CLASSÉ.            Taper « pi » doit proposer « La Pizzeria » avant un
//                      exercice dont le domaine contient « pi » quelque part.
//                      Une liste de suggestions non classée est une liste
//                      qu'on relit en entier — donc inutile.
//
// Le module ne connaît pas le catalogue : il reçoit des FICHES, du texte pur.
// C'est ce qui permet de le tester sans rien importer d'autre.

/** Minuscules, sans accents ni signes : la forme sous laquelle on compare. */
export function normaliser(texte) {
    return String(texte ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // les diacritiques décomposés
        .toLowerCase()
        .replace(/[’']/g, ' ')               // « l'école » se cherche par « ecole »
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Les mots d'une requête, normalisés, sans doublon ni vide. */
export function motsDe(requete) {
    const n = normaliser(requete);
    return n ? [...new Set(n.split(' '))] : [];
}

// Le barème. Un mot trouvé DANS LE TITRE vaut plus que le même mot trouvé
// dans le domaine, et un titre qui COMMENCE par le mot vaut plus qu'un titre
// qui le contient au milieu. C'est ce qui met « Pizzeria » devant tout le
// reste quand on tape « piz ».
const POINTS = {
    titreDebut: 100,
    titreMot: 80,
    titreDedans: 55,
    chemin: 40,
    niveau: 34,
    motCle: 26,
    // La CONSIGNE de l'exercice, en dernier recours. On tape « pizza » pour
    // trouver « La Pizzeria », « rapporteur » pour trouver Angle Master,
    // « damier » pour les dames : ces mots-là ne sont dans aucun titre, mais
    // ils sont dans le texte qui décrit l'exercice. Score volontairement bas :
    // une consigne parle de beaucoup de choses, elle ne doit jamais passer
    // devant un titre.
    texte: 10,
    // DEUX MOTS DE LA MÊME FAMILLE (voir `memeRacine`), et deux poids, parce
    // qu'une racine ne vaut pas la même chose selon où on la trouve.
    //
    // SUR LE CHEMIN, c'est une classification : taper « geometrie » quand le
    // dossier s'appelle « Géométrique » doit remonter tout le dossier, devant
    // une fiche dont la consigne mentionne le mot en passant.
    //
    // DANS LE TITRE, c'est une approximation, et elle passe DERRIÈRE un mot
    // réellement écrit. Le contraire s'est produit : l'exercice « Symétrique
    // par Rapport à Quoi ? » remontait devant Angle Master sur la recherche
    // « rapporteur », parce que « rapport » partage sept lettres avec lui
    // tandis qu'Angle Master ne porte le mot que dans sa consigne. Une
    // approximation qui devance un mot écrit noir sur blanc, c'est une
    // recherche qui se trompe de réponse.
    racineChemin: 18,
    racineTitre: 8
};

// Combien de lettres communes font une famille. Six, parce que « geometrie »
// et « geometrique » en partagent huit alors que « peri-mètre » et
// « péri-ode » n'en partagent que quatre.
const RACINE = 6;

/**
 * Deux mots de la même famille ?
 *
 * On tape « geometrie », le dossier s'appelle « Géométrique » : les deux mots
 * divergent à la neuvième lettre, et la recherche ne trouve rien. Personne ne
 * devrait avoir à deviner la terminaison exacte. Même histoire pour
 * « decimal » / « décimaux », « mesure » / « mesures ».
 */
function memeRacine(a, b) {
    if (a.length < RACINE || b.length < RACINE) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i >= RACINE;
}

/** Le meilleur score d'UN mot sur UNE fiche — 0 si le mot ne s'y trouve pas. */
function scoreMot(fiche, mot) {
    const titre = fiche._titre;
    if (titre.startsWith(mot)) return POINTS.titreDebut;
    if (titre.split(' ').some(m => m.startsWith(mot))) return POINTS.titreMot;
    if (titre.includes(mot)) return POINTS.titreDedans;
    if (fiche._chemin.some(c => c.includes(mot))) return POINTS.chemin;
    if (fiche._niveaux.some(n => n.includes(mot))) return POINTS.niveau;
    if (fiche._motsCles.some(k => k.includes(mot))) return POINTS.motCle;
    if (fiche._texte.includes(mot)) return POINTS.texte;
    if (fiche._chemin.some(c => c.split(' ').some(m => memeRacine(m, mot)))) return POINTS.racineChemin;
    if (titre.split(' ').some(m => memeRacine(m, mot))) return POINTS.racineTitre;
    return 0;
}

/** Prépare une fiche : la normalisation se fait UNE fois, pas à chaque frappe. */
export function preparer(fiche) {
    return {
        ...fiche,
        _titre: normaliser(fiche.titre),
        _chemin: (fiche.chemin || []).map(normaliser),
        _niveaux: (fiche.niveaux || []).map(normaliser),
        _motsCles: (fiche.motsCles || []).map(normaliser),
        _texte: normaliser(fiche.texte || '')
    };
}

/**
 * Les fiches qui répondent à la requête, les meilleures d'abord.
 *
 * TOUS les mots doivent trouver leur place : « fraction 6e » ne renvoie que ce
 * qui est à la fois fraction et sixième. Un mot qui ne s'accroche nulle part
 * écarte la fiche — c'est ce qui fait qu'ajouter un mot RESSERRE la liste, ce
 * que tout le monde attend d'une recherche.
 */
export function chercher(fiches, requete, { max = 8 } = {}) {
    const mots = motsDe(requete);
    if (!mots.length) return [];

    const out = [];
    for (const fiche of fiches) {
        const f = fiche._titre !== undefined ? fiche : preparer(fiche);
        let total = 0;
        let manque = false;
        for (const mot of mots) {
            const s = scoreMot(f, mot);
            if (!s) { manque = true; break; }
            total += s;
        }
        if (manque) continue;
        // À score égal, le titre le plus COURT gagne : il est plus précis.
        // « Fractions » avant « Addition de Fractions » quand on tape « frac ».
        out.push({ fiche, score: total - f._titre.length * 0.01 });
    }
    out.sort((a, b) => b.score - a.score || a.fiche.titre.localeCompare(b.fiche.titre));
    return out.slice(0, max);
}

/** Une fiche répond-elle à la requête ? (le filtre du catalogue, même règle) */
export function correspond(fiche, requete) {
    const mots = motsDe(requete);
    if (!mots.length) return true;
    const f = fiche._titre !== undefined ? fiche : preparer(fiche);
    return mots.every(m => scoreMot(f, m) > 0);
}

/**
 * Découpe un titre pour SURLIGNER ce qui a été tapé.
 *
 * Renvoie des morceaux `{ texte, fort }` dans l'ordre : l'affichage n'a plus
 * qu'à mettre les `fort` en gras. La comparaison se fait sur la forme
 * normalisée, mais les morceaux rendus sont le titre d'ORIGINE — accents
 * compris. Un surlignage qui renverrait le texte sans accents afficherait
 * « Geometrie » à l'écran, ce qui donne l'air d'un bogue.
 */
export function decouper(titre, requete) {
    const source = String(titre ?? '');
    const mots = motsDe(requete);
    if (!mots.length) return [{ texte: source, fort: false }];

    // On normalise CARACTÈRE PAR CARACTÈRE pour garder la correspondance des
    // positions entre la forme comparée et la forme affichée.
    const plat = [];
    const origine = [];
    for (let i = 0; i < source.length; i++) {
        const n = normaliser(source[i]);
        if (!n) continue;                  // espace, apostrophe, ponctuation
        for (const c of n) { plat.push(c); origine.push(i); }
    }
    const aplat = plat.join('');

    const marques = new Array(source.length).fill(false);
    for (const mot of mots) {
        let depuis = 0, p;
        while ((p = aplat.indexOf(mot, depuis)) !== -1) {
            for (let k = p; k < p + mot.length; k++) marques[origine[k]] = true;
            depuis = p + 1;
        }
    }

    const morceaux = [];
    for (let i = 0; i < source.length; i++) {
        const fort = marques[i];
        if (morceaux.length && morceaux[morceaux.length - 1].fort === fort) {
            morceaux[morceaux.length - 1].texte += source[i];
        } else {
            morceaux.push({ texte: source[i], fort });
        }
    }
    return morceaux;
}
