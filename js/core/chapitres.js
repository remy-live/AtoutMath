// Le classement des exercices par chapitre.
//
// TROIS ÉTATS, ET NON DEUX. Une case du tableau vaut :
//
//   'oui'     — le professeur l'a confirmée ;
//   'propose' — personne ne l'a touchée, mais l'exercice travaille une des
//               compétences du chapitre : c'est une PROPOSITION ;
//   'non'     — soit rien ne rapproche l'exercice du chapitre, soit le
//               professeur a explicitement retiré la proposition.
//
// La proposition n'attend pas d'être confirmée pour servir. Un classement qui
// ne vaudrait qu'une fois les cent lignes cochées ne servirait à rien le
// premier soir — donc `chapitresDe` retient les proposées comme les
// confirmées, et le tableau ne sert qu'à corriger ce que la déduction rate.
// Confirmer, ici, veut dire « je l'ai relu », pas « je l'active ».
//
// CE QUE LE PROFESSEUR A DIT NE SE PERD PAS. Le fichier ne retient que ses
// décisions — `{ exoId: { chapId: true|false } }` — jamais les propositions.
// Ainsi, ajouter une compétence à un chapitre l'an prochain fait apparaître de
// nouvelles propositions sans effacer une seule de ses corrections.

import { CHAPITRES } from '../data/chapitres.js';
import { CLASSEMENT_LIVRE } from '../data/classementParDefaut.js';
import { matchSkills } from '../data/skills.js';
import { exercices, skillsOf } from '../data/catalog.js';

const CLE = 'mathbox-chapitres';

// --- Les chapitres ----------------------------------------------------------

/** Les compétences d'un chapitre, motifs `*` résolus. */
export function competencesDuChapitre(chap) {
    if (!chap || !Array.isArray(chap.skills)) return [];
    const vues = new Set();
    chap.skills.forEach(motif => matchSkills(motif).forEach(id => vues.add(id)));
    return [...vues];
}

/** Les chapitres d'un niveau, dans l'ordre du fichier. */
export function chapitresDuNiveau(niveau) {
    return niveau ? CHAPITRES.filter(c => c.niveau === niveau) : [...CHAPITRES];
}

export function getChapitre(id) {
    return CHAPITRES.find(c => c.id === id) || null;
}

// --- Ce que le professeur a décidé ------------------------------------------

function lireLocal() {
    try {
        const brut = localStorage.getItem(CLE);
        const lu = brut ? JSON.parse(brut) : null;
        return (lu && typeof lu === 'object') ? lu : {};
    } catch (e) {
        return {};
    }
}

/**
 * Le classement en vigueur : `{ exoId: { chapId: bool } }`.
 *
 * DEUX COUCHES, ET LA LOCALE PAR-DESSUS. Celle du dépôt vaut pour tout le
 * monde, sur n'importe quel navigateur, sans rien à importer ; celle du poste
 * ne garde que ce que le professeur a changé depuis. La fusion se fait case
 * par case, et non exercice par exercice : cocher une seule case ne doit pas
 * effacer les six autres que le dépôt donnait à ce même exercice.
 */
export function getClassement() {
    const fusion = {};
    for (const source of [CLASSEMENT_LIVRE, lireLocal()]) {
        Object.entries(source || {}).forEach(([exoId, cases]) => {
            fusion[exoId] = { ...(fusion[exoId] || {}), ...cases };
        });
    }
    return fusion;
}

/** Ce que ce poste a décidé, sans la couche du dépôt — c'est ce qui s'exporte. */
export function classementLocal() {
    return lireLocal();
}

export function saveClassement(classement) {
    try {
        localStorage.setItem(CLE, JSON.stringify(classement || {}));
    } catch (e) { /* mode privé : le classement ne survivra pas, tant pis */ }
    document.dispatchEvent(new CustomEvent('chapitres_updated'));
}

// --- L'état d'une case ------------------------------------------------------

/**
 * L'exercice travaille-t-il une compétence de ce chapitre ?
 * C'est la seule source des propositions — rien d'autre n'est deviné.
 */
export function proposePar(exo, chap) {
    const duChapitre = competencesDuChapitre(chap);
    if (!duChapitre.length) return false;
    const deLExercice = skillsOf(exo);
    return deLExercice.some(id => duChapitre.includes(id));
}

/** @returns {'oui'|'propose'|'non'} */
export function etatCase(exo, chap, classement = getClassement()) {
    const dit = classement[exo.id] && classement[exo.id][chap.id];
    if (dit === true) return 'oui';
    if (dit === false) return 'non';
    return proposePar(exo, chap) ? 'propose' : 'non';
}

/**
 * Un clic. Confirmer une proposition, ajouter un chapitre, ou retirer ce qui
 * était mis — trois gestes, un seul bouton, et le classement rendu est neuf
 * (rien n'est modifié sur place : l'appelant décide quand enregistrer).
 */
export function basculer(exo, chap, classement = getClassement()) {
    const suivant = { ...classement, [exo.id]: { ...(classement[exo.id] || {}) } };
    if (etatCase(exo, chap, classement) !== 'oui') {
        suivant[exo.id][chap.id] = true;
    } else if (proposePar(exo, chap)) {
        // Retirer une proposition, c'est une décision : elle s'écrit, sinon
        // elle reviendrait au prochain chargement.
        suivant[exo.id][chap.id] = false;
    } else {
        // Retirer un ajout manuel ne laisse rien à dire : on efface la ligne
        // plutôt que d'enregistrer un « non » que la déduction donnait déjà.
        delete suivant[exo.id][chap.id];
    }
    if (!Object.keys(suivant[exo.id]).length) delete suivant[exo.id];
    return suivant;
}

/** Confirmer d'un coup toutes les propositions d'un chapitre. */
export function confirmerLeChapitre(chap, liste = exercices, classement = getClassement()) {
    const suivant = { ...classement };
    liste.forEach(exo => {
        if (etatCase(exo, chap, classement) !== 'propose') return;
        suivant[exo.id] = { ...(suivant[exo.id] || {}), [chap.id]: true };
    });
    return suivant;
}

// --- Lire le classement -----------------------------------------------------

/** Les chapitres d'un exercice — confirmés ET proposés, car les deux servent. */
export function chapitresDe(exo, classement = getClassement()) {
    return CHAPITRES.filter(c => etatCase(exo, c, classement) !== 'non');
}

/** Les exercices d'un chapitre, dans l'ordre du catalogue. */
export function exercicesDuChapitre(chapId, liste = exercices, classement = getClassement()) {
    const chap = getChapitre(chapId);
    if (!chap) return [];
    return liste.filter(exo => etatCase(exo, chap, classement) !== 'non');
}

/**
 * De quoi remplir l'en-tête du tableau : ce qui reste à relire, et ce qui
 * n'est rangé nulle part. Les deux chiffres disent au professeur où il en est.
 */
export function resume(niveau, liste = exercices, classement = getClassement()) {
    const chaps = chapitresDuNiveau(niveau);
    let proposes = 0, confirmes = 0;
    const orphelins = [];
    liste.forEach(exo => {
        let range = false;
        chaps.forEach(chap => {
            const etat = etatCase(exo, chap, classement);
            if (etat === 'propose') { proposes++; range = true; }
            if (etat === 'oui') { confirmes++; range = true; }
        });
        if (!range && !exo.horsProgression) orphelins.push(exo.id);
    });
    return { proposes, confirmes, orphelins, chapitresVides: chaps.filter(c => !competencesDuChapitre(c).length).map(c => c.id) };
}
