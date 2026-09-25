// NOMMER UN PARCOURS TOUT SEUL, tant que personne ne l'a nommé.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUE MESURE L'AUDIT. Deux cycles « Nouveau parcours » et deux exercices
// chacun, et le tiroir « Mes parcours » affiche DEUX LIGNES STRICTEMENT
// IDENTIQUES : même nom, même sous-titre — « aujourd'hui · 2 exercices ·
// 20 questions ». Rien ne dit lequel est l'essai de mardi et lequel est la
// séance de jeudi. Au bout d'une semaine il y en a huit.
//
// LE NOM PAR DÉFAUT EST LE VRAI COUPABLE. « Nouveau parcours » décrit l'ÉTAT du
// parcours — il vient d'être créé — et non son CONTENU. Or l'état change à la
// seconde qui suit, le contenu reste. Un nom qui décrit ce qu'on ne retrouvera
// jamais ne sert à personne.
//
// ON NE DEMANDE PAS AU PROFESSEUR DE NOMMER AVANT DE COMMENCER. C'est la
// tentation, et c'est une mauvaise idée : au moment où l'on crée un parcours,
// on ne sait pas encore ce qu'on va y mettre. On nomme donc APRÈS, d'après ce
// qui est dedans, et le professeur corrige s'il veut — le champ est là, juste
// au-dessus.
//
// CE N'EST PAS UN TITRE, C'EST UN REPÈRE. « Fractions — 3 exercices » ne
// remplace pas « Devoir du mardi » ; il remplace « Nouveau parcours », ce qui
// est un progrès beaucoup plus modeste et beaucoup plus utile.

/** Les noms qu'on se permet d'écraser : ceux que personne n'a choisis. */
export const NOMS_PAR_DEFAUT = ['Nouveau parcours', 'Mon Parcours', 'Mon parcours', ''];

/**
 * LA FORME DES NOMS QUE NOUS FABRIQUONS — « Fractions — 3 exercices ».
 *
 * Elle sert à les reconnaître, et c'est indispensable : sans cela le nom se
 * FIGE sur le premier exercice. Mesuré : un parcours de deux exercices
 * s'appelait « Fractions — 1 exercice », parce que le premier ajout avait déjà
 * posé un nom, lequel n'était plus un défaut et ne se remettait donc plus à
 * jour. Un nom qui annonce un exercice pour six est pire que « Nouveau
 * parcours » : il ment au lieu de se taire.
 *
 * Reconnaître par la FORME plutôt que retenir ce qu'on a proposé évite de
 * garder un état de plus à tenir d'accord avec le parcours — et un parcours
 * rouvert demain, dans une autre session, est reconnu de la même façon.
 */
const FORME_PROPOSEE = /^(?:.+ — )?\d+ exercices?$/;

/**
 * Ce nom a-t-il été donné par quelqu'un ?
 *
 * On ne touche JAMAIS à un nom écrit à la main, même s'il est moche, même s'il
 * est vide de sens. Renommer le travail de quelqu'un sans le lui demander est
 * le genre de service qu'on ne rend pas.
 *
 * Un nom que NOUS avons fabriqué ne compte pas comme donné : il doit suivre le
 * contenu tant que le professeur ne l'a pas repris à son compte.
 */
export function nomDonne(nom) {
    const n = String(nom || '').trim();
    if (NOMS_PAR_DEFAUT.includes(n)) return false;
    return !FORME_PROPOSEE.test(n);
}

/**
 * LE THÈME COMMUN À CES EXERCICES, s'il y en a un.
 *
 * On prend le chapitre — ou à défaut le domaine — que la MAJORITÉ des exercices
 * partagent. La majorité, et non le premier : un parcours qui commence par un
 * jeu d'échauffement et continue sur six fractions parle de fractions.
 *
 * @param {Array} etiquettes une liste de listes : les thèmes de chaque exercice
 * @returns {string} le thème dominant, ou ''
 */
export function themeDominant(etiquettes) {
    const compte = new Map();
    (etiquettes || []).forEach(liste => {
        // Un exercice qui porte trois chapitres ne pèse pas trois fois : chacun
        // de ses thèmes compte pour un tiers, sinon l'exercice le plus étiqueté
        // décide pour tous les autres.
        const uniques = [...new Set((liste || []).filter(Boolean))];
        if (!uniques.length) return;
        uniques.forEach(t => compte.set(t, (compte.get(t) || 0) + 1 / uniques.length));
    });
    if (!compte.size) return '';
    const total = (etiquettes || []).filter(l => l && l.length).length;
    // À égalité, l'ordre alphabétique décide : deux parcours identiques doivent
    // recevoir le même nom, quelle que soit la façon dont on les a construits.
    const classement = [...compte.entries()]
        .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]), 'fr'));
    const [meilleur, poids] = classement[0];
    // UN THÈME À ÉGALITÉ AVEC UN AUTRE N'EST PAS LE THÈME DU PARCOURS.
    //
    // Mesuré en donnant ce nom aux séances reçues par code : un parcours de
    // DEUX exercices — addition de relatifs et Pythagore — s'appelait
    // « Multiplications — 2 exercices ». Chacun apportait son chapitre, chacun
    // pesait la moitié, et la règle du « au moins la moitié » couronnait celui
    // que l'ordre alphabétique sortait en premier. Le départage alphabétique
    // sert à rendre le nom REPRODUCTIBLE, pas à trancher un débat qui n'a pas
    // de vainqueur : un nom faux est pire qu'un nom vague, et « 2 exercices »
    // ne ment pas.
    if (classement[1] && classement[1][1] === poids) return '';
    // MOINS DE LA MOITIÉ, CE N'EST PAS UN THÈME NON PLUS. Un parcours qui
    // pioche partout n'a pas de sujet : lui en inventer un serait mentir sur
    // son contenu.
    return (total && poids / total >= 0.5) ? meilleur : '';
}

/**
 * LE NOM PROPOSÉ POUR CE PARCOURS.
 *
 * DEUX ÉTAGES, ET LE SECOND SAUVE LES PETITS PARCOURS. Deux exercices qui ne
 * partagent pas leur chapitre ne se départagent pas — voir `themeDominant` —,
 * et l'on retombait sur « 2 exercices » alors qu'ils appartiennent tous deux
 * à « Espace et géométrie ». Le domaine est plus large que le chapitre : il
 * dit moins, mais il dit vrai, et c'est exactement ce qu'on veut d'un repère.
 *
 * @param {object} parcours       { name, steps }
 * @param {Function} themesDe     (exerciseId) => string[] — les chapitres
 * @param {Function} [largeDe]    (exerciseId) => string[] — le domaine, en secours
 * @returns {string} le nom à poser, ou '' s'il n'y a rien à proposer
 */
export function nomPropose(parcours, themesDe, largeDe) {
    const p = parcours || {};
    if (nomDonne(p.name)) return '';           // quelqu'un l'a nommé : on se tait
    const etapes = (p.steps || []).filter(s => s && s.exerciseId);
    if (!etapes.length) return '';             // rien dedans : rien à dire

    const theme = themeDominant(etapes.map(s => themesDe(s.exerciseId) || []))
        || (typeof largeDe === 'function'
            ? themeDominant(etapes.map(s => largeDe(s.exerciseId) || [])) : '');
    const n = etapes.length;
    const combien = `${n} exercice${n > 1 ? 's' : ''}`;
    return theme ? `${theme} — ${combien}` : combien;
}

/**
 * LES THÈMES D'UN EXERCICE : son chapitre, ou à défaut son domaine.
 *
 * Elle vivait en lambda dans le constructeur de parcours, et c'est LÀ qu'était
 * le défaut — parce qu'un parcours n'est pas toujours construit là. Un élève
 * qui arrive par un code court reçoit un parcours fabriqué par
 * `core/shortcodes.js`, et celui-ci nommait la séance en COLLANT BOUT À BOUT
 * les titres de tous ses exercices :
 *
 *     « Segment, Droite ou Demi-droite ? + Code la figure »
 *
 * Rémy, capture à l'appui : « ne mets pas toute la liste des exercices en haut
 * […] ça risque d'être long s'il y a beaucoup de code ». Il a raison bien
 * au-delà de deux : sa séance d'essai en compte trente-cinq, et ce nom-là
 * ferait quatre lignes en haut de l'écran d'un élève de sixième.
 *
 * La règle existait déjà et elle est bonne : « Nombres et calculs — 35
 * exercices ». Elle ne vivait simplement qu'à un seul endroit.
 *
 * @param {Object} exo           l'entrée de catalogue
 * @param {Function} chapitresDe (exo) => [{ nom }] — voir core/chapitres.js
 */
export function themesDExercice(exo, chapitresDe) {
    if (!exo) return [];
    const chaps = (typeof chapitresDe === 'function' ? chapitresDe(exo) : [])
        .map(c => (c && c.nom) || '').filter(Boolean);
    return chaps.length ? chaps : domaineDExercice(exo);
}

/**
 * LE DOMAINE D'UN EXERCICE — « Nombres et calculs », « Espace et géométrie ».
 *
 * Il vit dans `tags.chemin[0]`, et non dans un champ `domain`, qui n'existe
 * pas : mesuré sur un exercice du catalogue. Il sert de SECOURS quand les
 * chapitres ne se départagent pas — voir `nomPropose`.
 */
export function domaineDExercice(exo) {
    const chemin = (exo && exo.tags && exo.tags.chemin) || [];
    return chemin.length ? [chemin[0]] : [];
}
