// L'ÉLÈVE ET SA CLASSE — le maillon qui manquait à toute la chaîne.
//
// Le professeur construit un parcours, le donne à ses classes, et récupère un
// bilan. Entre les deux, il manquait le geste le plus simple : QUE L'ÉLÈVE VOIE
// SON TRAVAIL. `seanceDuMoment` était écrite et testée depuis des semaines, et
// aucun écran ne l'appelait — le professeur donnait dans le vide.
//
// LE RATTACHEMENT, ET POURQUOI IL N'Y A PAS DE MOT DE PASSE.
//
// Rémy, sur l'identité des élèves : prénom.nom, sans mot de passe. C'est le
// bon choix, et ce n'est pas de la paresse. Un mot de passe de sixième se perd
// la deuxième semaine, se prête à son voisin, et se redemande au professeur au
// milieu du cours — trois minutes perdues à chaque fois, pour protéger un
// journal d'exercices de mathématiques. Ce qu'on protège ici tient en une
// phrase : personne ne doit pouvoir travailler à la place d'un autre PAR
// ACCIDENT. Un nom choisi dans la liste de sa classe y suffit.
//
// CE QUI EST STOCKÉ, ET OÙ. Le lien est posé sur le PROFIL de l'appareil —
// `{ profileId → { classeId, eleveId } }` — et non dans le profil lui-même :
// une famille qui partage la tablette a deux profils, chacun dans sa classe,
// et rien ne se mélange. Le lien est une donnée d'appareil, pas d'élève.
//
// CE MODULE NE CONNAÎT PAS LE DOM et ne lit rien : on lui passe les classes,
// les séances et la table des liens, il répond. C'est ce qui permet de tester
// « la séance qu'Emma doit voir mardi à 10 h » sans ouvrir un navigateur.

import { normaliser } from './classes.js';
import { seancesDe, etatSeance, estRetiree, concerne, ETATS } from './seances.js';

/**
 * LA CLÉ D'UN ÉLÈVE — « emma.durand ».
 *
 * Sans accent, sans majuscule, sans espace : c'est ce qu'un élève de sixième
 * tape sans se tromper, et c'est ce qu'on peut comparer sans surprise. « Émma
 * DURAND », « emma durand » et « Emma.Durand » donnent la même clé — donc la
 * même élève, ce qui est bien le but.
 *
 * Le prénom composé garde son trait d'union (« jean-luc.martin ») : le retirer
 * ferait deux mots, et l'on ne saurait plus où commence le nom.
 */
export function cleEleve(nom) {
    return normaliser(nom)
        // LE POINT ET LE SOULIGNÉ SONT DES ESPACES. L'élève tape « emma.durand »
        // parce que c'est ce qu'il a sous les yeux ; le professeur a écrit
        // « Emma Durand » dans sa liste. Les deux doivent donner la même clé,
        // sinon l'élève qui recopie exactement son identifiant est le seul à ne
        // pas se retrouver.
        .replace(/[._]+/g, ' ')
        .replace(/[^a-z0-9- ]/g, '')
        .trim().replace(/\s+/g, '.');
}

/**
 * LES ÉLÈVES QUI RÉPONDENT À CE QU'ON A TAPÉ.
 *
 * On accepte les deux écritures — « Emma Durand » et « emma.durand » — parce
 * que l'élève tape ce qu'il a sous les yeux, pas ce que le code préfère. Et
 * l'on rend une LISTE, jamais un résultat unique : deux Emma Durand dans deux
 * classes, ça existe, et choisir à leur place mettrait l'une dans la classe de
 * l'autre. L'écran demandera laquelle.
 *
 * @returns {Array<{classe:Object, eleve:Object}>}
 */
export function candidats(classes, saisie) {
    const cle = cleEleve(saisie);
    if (!cle) return [];
    const out = [];
    for (const classe of classes || []) {
        for (const eleve of classe.eleves || []) {
            if (cleEleve(eleve.nom) === cle) out.push({ classe, eleve });
        }
    }
    return out;
}

/**
 * CE QUI RESSEMBLE À CE QU'ON A TAPÉ — pour aider avant de se tromper.
 *
 * Un élève qui tape « emma » n'a pas encore fini d'écrire ; lui répondre
 * « inconnue » serait faux. On propose donc ce qui commence pareil, et il
 * choisit. Au-delà d'une poignée, on ne propose plus rien : une liste de trente
 * noms n'aide personne, et l'élève ferait mieux de continuer à taper.
 */
export function suggestions(classes, saisie, max = 6) {
    const debut = cleEleve(saisie);
    if (debut.length < 2) return [];
    const out = [];
    for (const classe of classes || []) {
        for (const eleve of classe.eleves || []) {
            const cle = cleEleve(eleve.nom);
            if (cle !== debut && cle.startsWith(debut)) out.push({ classe, eleve });
            if (out.length > max) return [];
        }
    }
    return out;
}

/** Poser le lien : ce profil-ci est cet élève-là, dans cette classe-là. */
export function rattacher(liens, profileId, classe, eleve) {
    if (!profileId || !classe || !eleve) return liens || {};
    return {
        ...(liens || {}),
        [profileId]: {
            classeId: classe.id, eleveId: eleve.id,
            // LE NOM EST RECOPIÉ, et ce n'est pas un doublon inutile : il
            // permet de dire « Tu es rattaché à Emma Durand, 5ᵉ B » même quand
            // la classe n'est pas sur cet appareil — le cas de l'élève qui
            // travaille chez lui.
            nom: eleve.nom, classeNom: classe.nom, niveau: classe.niveau || '',
            le: Date.now()
        }
    };
}

/** Défaire le lien — on s'est trompé de nom, ou l'on change de classe. */
export function detacher(liens, profileId) {
    const copie = { ...(liens || {}) };
    delete copie[profileId];
    return copie;
}

export function rattachementDe(liens, profileId) {
    return (liens && profileId && liens[profileId]) || null;
}

/**
 * RETROUVER L'ÉLÈVE DERRIÈRE LE LIEN — ou dire qu'il n'y est plus.
 *
 * Un élève change de classe en janvier, une classe est effacée, un fichier est
 * réimporté : le lien peut désigner quelqu'un qui n'existe plus. On rend alors
 * `null` plutôt qu'un objet à moitié vide, et l'écran propose de se rattacher
 * de nouveau — ce qui est la seule chose à faire.
 */
export function retrouver(classes, lien) {
    if (!lien) return null;
    const classe = (classes || []).find(c => c.id === lien.classeId);
    if (!classe) return null;
    const eleve = (classe.eleves || []).find(e => e.id === lien.eleveId);
    return eleve ? { classe, eleve } : null;
}

/**
 * LES SÉANCES QUI S'ADRESSENT À CET ÉLÈVE, la plus récente d'abord.
 *
 * Trois filtres, et chacun répare une façon de montrer à un élève un travail
 * qui n'est pas le sien : la classe, le GROUPE — une séance donnée à huit
 * élèves ne regarde pas les vingt autres —, et le retrait par le professeur.
 * Les séances à venir sont écartées : elles n'existent pas encore.
 */
export function mesSeances(seances, lien, maintenant = Date.now()) {
    if (!lien) return [];
    return seancesDe(seances, lien.classeId)
        .filter(s => !estRetiree(s)
            && concerne(s, lien.eleveId)
            && etatSeance(s, maintenant) !== ETATS.A_VENIR);
}

/**
 * LA SÉANCE DU MOMENT — celle que l'élève voit en grand, et rien d'autre.
 *
 * Rémy : « il faudrait que le dernier en date soit facilement accessible ». Ce
 * n'est pas « accessible » : c'est TOUT CE QU'IL Y A. Une liste, même courte,
 * oblige à choisir ; à choisir on se trompe, et l'élève qui se trompe travaille
 * sagement la mauvaise chose.
 *
 * UNE SÉANCE CLOSE RESTE PROPOSÉE quand il n'y en a pas d'autre : clore ferme
 * la fenêtre notée, pas l'exercice. L'élève absent ce jour-là doit pouvoir la
 * faire, et celui qui veut réviser aussi.
 */
export function maSeance(seances, lien, maintenant = Date.now()) {
    const liste = mesSeances(seances, lien, maintenant);
    return liste.find(s => etatSeance(s, maintenant) === ETATS.EN_COURS)
        || liste[0] || null;
}

/** Le mot que le professeur a écrit à CET élève sur CETTE séance. */
export function monMot(seance, lien) {
    if (!seance || !lien) return '';
    return (seance.mots && seance.mots[lien.eleveId]) || '';
}

/**
 * CE QU'IL Y A À DIRE DE MA SÉANCE, décidé ici et peint ailleurs.
 *
 * L'AVANCEMENT VIENT DU PARCOURS CHARGÉ, pas de la séance : c'est le même
 * compteur que « Mon parcours », et deux compteurs qui disent deux chiffres
 * pour le même travail, c'est un de trop. Tant que l'élève n'a pas ouvert la
 * séance, le parcours chargé est un autre (ou aucun) et l'on affiche 0 — ce
 * qui est vrai.
 *
 * @param {Object} seance     la séance du moment (ou null)
 * @param {Object} lien       le rattachement
 * @param {Object} [parcours] le parcours chargé côté élève : { id, completed }
 */
export function etatDeMaSeance(seance, lien, parcours = null, maintenant = Date.now()) {
    if (!seance || !lien) return null;
    const etapes = ((seance.path && seance.path.steps) || []);
    const total = etapes.length;
    const memeParcours = !!(parcours && seance.path && parcours.id === seance.path.id);
    const faites = memeParcours
        ? etapes.filter(s => (parcours.completed || []).includes(s.stepId)).length : 0;
    const etat = etatSeance(seance, maintenant);
    return {
        seance,
        titre: seance.titre || (seance.path && seance.path.name) || 'Séance',
        classeNom: seance.classeNom || lien.classeNom || '',
        etat, close: etat === ETATS.CLOSE,
        total, faites, fini: total > 0 && faites >= total,
        commence: faites > 0,
        mot: monMot(seance, lien)
    };
}
