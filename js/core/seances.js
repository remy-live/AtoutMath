// LES SÉANCES — « ce parcours, à cette classe, ce jour-là ».
//
// Rémy : « dans mon interface, je fais mes parcours, mais j'ai aussi mes
// classes avec mes élèves. Je peux associer une classe à un parcours avec un
// code ou non et les élèves de cette classe ont accès au parcours mais il
// faudrait que le dernier en date soit facilement accessible. Sur LaboMEP, on
// se retrouve parfois avec beaucoup de parcours, on est perdu. »
//
// POURQUOI ON SE PERD, ET CE QUE CE MODULE CHANGE.
//
// Ce n'est pas le nombre de parcours : c'est qu'un même objet sert à deux
// choses. Chaque fois qu'on donne un parcours à une classe, une ligne de plus
// s'ajoute à la liste des parcours. Deux classes, trois séances, et l'on a six
// lignes pour deux idées. À Noël on cherche.
//
// On sépare donc ce qui n'a rien à voir :
//
//   · UN PARCOURS est un MODÈLE. Ce qu'on construit, ce qui resservira l'an
//     prochain, ce qu'on retouche. Il vit dans la bibliothèque du professeur.
//   · UNE SÉANCE est un ACTE. Ce parcours-là, donné à cette classe-là, ce
//     jour-là. Elle ne se retouche pas : on en donne une autre.
//
// Un parcours donné à quatre classes fait UNE ligne de bibliothèque et quatre
// séances. La bibliothèque ne grossit donc qu'avec les idées du professeur,
// jamais avec son emploi du temps.
//
// ET LA SÉANCE PORTE UNE COPIE DU PARCOURS, pas une référence.
//
// C'est le choix le moins évident du module, et le plus important. Retoucher un
// parcours ne doit RIEN changer aux séances déjà données : les élèves ont
// travaillé sur ce qu'ils ont eu sous les yeux, et un bilan qui se met à
// désigner d'autres exercices que ceux qui ont été faits ne veut plus rien
// dire. La copie coûte quelques kilo-octets et achète que le passé ne bouge
// plus.

import { shortId } from './ids.js';
import { normalizePath } from './path.js';

/**
 * L'ÉTAT D'UNE SÉANCE, et il n'y en a que trois.
 *
 *   'a_venir' — datée plus tard : les élèves la voient arriver, sans l'ouvrir.
 *   'en_cours' — c'est le travail du moment, celui qui s'affiche en grand.
 *   'close'    — le professeur a dit que c'était fini. La note ne bouge plus.
 *
 * CLORE NE VERROUILLE PAS. Une séance close reste ouverte à l'entraînement —
 * sans quoi l'élève absent ce jour-là ne pourrait jamais la faire, et celui qui
 * veut réviser non plus. Ce qui se ferme, c'est la fenêtre NOTÉE. D'où la règle
 * qui vaut pour tout le reste de l'application : on peut toujours retravailler,
 * on ne peut jamais rejouer sa note.
 */
export const ETATS = { A_VENIR: 'a_venir', EN_COURS: 'en_cours', CLOSE: 'close' };

/**
 * À QUI ON DONNE — trois portées, et une seule mécanique.
 *
 * Rémy : « comment j'attribue mon parcours à un niveau (mes 2 sixièmes) ou à
 * une classe ou à un groupe d'élèves ? »
 *
 *   'classe' — le cas ordinaire : toute la classe.
 *   'eleves' — un groupe dans la classe. C'est la différenciation : « ces
 *              huit-là refont les fractions pendant que les autres avancent ».
 *   Le NIVEAU n'est pas une portée : c'est un geste. Voir `donnerAuxClasses`.
 */
export const PORTEES = { CLASSE: 'classe', ELEVES: 'eleves' };

/**
 * Donner un parcours à une classe, ou à un groupe dans cette classe.
 *
 * @param {Object} classe   la classe visée
 * @param {Object} parcours le MODÈLE, tel qu'il est dans la bibliothèque
 * @param {Object} opts     { code, ouvreLe, titre, eleveIds, lotId }
 */
export function donnerSeance(classe, parcours, opts = {}) {
    const path = normalizePath(parcours, parcours && parcours.name);
    return {
        id: 's_' + shortId(10),
        classeId: classe && classe.id,
        classeNom: (classe && classe.nom) || '',
        // Le nom du parcours au moment où on l'a donné : le renommer ensuite ne
        // doit pas réécrire l'histoire de la classe.
        titre: opts.titre || path.name || 'Séance',
        pathId: path.id,
        // LA COPIE, et non la référence — voir l'en-tête du module.
        path,
        // Le code de partage, quand il y en a un. Il reste facultatif : dans une
        // classe rattachée, l'élève n'a rien à taper.
        code: opts.code || null,
        // LE GROUPE, quand la séance ne s'adresse pas à toute la classe. `null`
        // veut dire « tout le monde » — et non « personne » : c'est le cas
        // fréquent, il ne doit rien coûter à écrire.
        eleveIds: (opts.eleveIds && opts.eleveIds.length) ? [...opts.eleveIds] : null,
        // LE LOT : quand un seul geste a créé plusieurs séances — « à mes deux
        // sixièmes ». Elles restent distinctes (on ne les a pas à la même
        // heure, on ne les clôture pas ensemble), mais on peut les renommer ou
        // les retirer d'un coup, parce qu'elles viennent de la même intention.
        lotId: opts.lotId || null,
        donneeLe: opts.donneeLe || Date.now(),
        ouvreLe: opts.ouvreLe || null,
        closeLe: null,
        // Les mots que le professeur ajoute à un élève PENDANT la séance.
        // Rémy : « je ne peux taper une phrase pour chaque élève, mais pourquoi
        // pas personnaliser quand je peux pendant la séance. » D'où un mot par
        // élève, ajouté au fil de l'eau, jamais un formulaire de fin d'heure.
        mots: {}
    };
}

/**
 * DONNER LE MÊME PARCOURS À PLUSIEURS CLASSES — un geste, plusieurs séances.
 *
 * Rémy : « comment j'attribue mon parcours à un niveau (mes 2 sixièmes) ? »
 *
 * UNE SÉANCE PAR CLASSE, ET NON UNE SÉANCE POUR DEUX. C'est le choix qui
 * demande le plus d'explication, et il vient de l'usage : on n'a pas ses deux
 * sixièmes à la même heure, on ne clôt donc pas leur séance en même temps ; et
 * un tableau de quarante-six lignes mêlant deux classes ne se balaie plus — or
 * balayer est tout ce qu'on fait d'un tableau de classe.
 *
 * Ce qui est commun, c'est le GESTE, pas l'objet. D'où le lot : les séances
 * nées ensemble le savent, et se renomment ou se retirent ensemble.
 */
export function donnerAuxClasses(classes, parcours, opts = {}) {
    const lotId = (classes || []).length > 1 ? 'lot_' + shortId(8) : null;
    return (classes || []).map(c => donnerSeance(c, parcours, { ...opts, lotId }));
}

/** Les classes d'un niveau — « mes deux sixièmes ». */
export function classesDuNiveau(classes, niveau) {
    return (classes || []).filter(c => c.niveau === niveau);
}

/** Les niveaux pour lesquels le professeur a au moins une classe. */
export function niveauxDe(classes) {
    return [...new Set((classes || []).map(c => c.niveau).filter(Boolean))].sort();
}

/** Les séances nées du même geste. */
export function memeLot(seances, lotId) {
    return lotId ? (seances || []).filter(s => s.lotId === lotId) : [];
}

/**
 * CETTE SÉANCE S'ADRESSE-T-ELLE À CET ÉLÈVE ?
 *
 * Sans groupe, elle s'adresse à toute la classe. C'est le cas fréquent, et il
 * doit rester le plus simple à écrire — d'où `eleveIds` à `null` plutôt qu'une
 * liste de trente identifiants qu'il faudrait tenir à jour à chaque
 * inscription.
 */
export function concerne(seance, eleveId) {
    if (!seance) return false;
    if (!seance.eleveIds) return true;
    return seance.eleveIds.includes(eleveId);
}

/** Les élèves d'une classe que cette séance concerne. */
export function elevesDe(seance, classe) {
    const tous = (classe && classe.eleves) || [];
    return tous.filter(e => concerne(seance, e.id));
}

/**
 * LE RATTRAPAGE — le geste qui manque le plus après une séance.
 *
 * « Ceux qui ont raté refont ça pendant que les autres avancent. » Les élèves
 * sont déjà désignés par leur résultat ; il ne reste qu'à choisir le parcours.
 * On ne prend pas ceux qui n'ont RIEN fait : leur problème n'est pas la notion,
 * c'est qu'ils n'ont pas travaillé, et leur donner un rattrapage sur un
 * chapitre qu'ils n'ont pas ouvert n'a aucun sens.
 *
 * @param {Array} bilans les élèves du bilan de classe (voir core/bilan.js)
 * @param {number} seuil le taux en dessous duquel on rattrape
 */
export function aRattraper(bilans, seuil = 0.6) {
    return (bilans || [])
        .filter(b => b.questions > 0 && b.reussite < seuil)
        .map(b => b.id);
}

/** L'état d'une séance à un instant donné. */
export function etatSeance(seance, maintenant = Date.now()) {
    if (!seance) return null;
    if (seance.closeLe && maintenant >= seance.closeLe) return ETATS.CLOSE;
    if (seance.ouvreLe && maintenant < seance.ouvreLe) return ETATS.A_VENIR;
    return ETATS.EN_COURS;
}

/**
 * CLORE UNE SÉANCE — le professeur décide de la fin.
 *
 * Rémy : « je pourrai pendant la séance (vers la fin) envoyer un message au
 * serveur pour dire que c'est fini et cela fait un bilan […]. En gros je décide
 * de la fin. »
 *
 * ON HORODATE, ON N'INTERROMPT PAS. La clôture ne coupe pas trente écrans à la
 * seconde : elle pose une frontière dans le temps, et la note compte ce qui a
 * été répondu avant. Comme les notes sont recalculées à la lecture et jamais
 * stockées, une réponse qui arrive en retard — une tablette qui avait perdu le
 * réseau — se range toute seule du bon côté de l'heure. Deux calculs du même
 * bilan donnent donc toujours le même résultat, quel que soit l'ordre d'arrivée.
 */
export function clore(seance, quand = Date.now()) {
    return { ...seance, closeLe: quand };
}

/** Rouvrir une séance close par erreur — la fin de l'heure se décide vite. */
export function rouvrir(seance) {
    return { ...seance, closeLe: null };
}

/** Le mot que le professeur ajoute à un élève, pendant la séance. */
export function poserMot(seance, eleveId, texte) {
    const mots = { ...(seance.mots || {}) };
    const propre = String(texte == null ? '' : texte).trim();
    if (propre) mots[eleveId] = propre;
    else delete mots[eleveId];
    return { ...seance, mots };
}

/**
 * LES SÉANCES D'UNE CLASSE, LA PLUS RÉCENTE D'ABORD.
 *
 * C'est l'ordre de lecture du professeur : ce qu'il vient de donner, puis ce
 * qui précède. L'inverse obligerait à faire défiler toute l'année pour trouver
 * ce qu'on a fait ce matin.
 */
export function seancesDe(seances, classeId) {
    return (seances || [])
        .filter(s => s.classeId === classeId)
        .sort((a, b) => (b.donneeLe || 0) - (a.donneeLe || 0));
}

/**
 * LA SÉANCE DU MOMENT — celle que l'élève voit en grand, et rien d'autre.
 *
 * Rémy : « il faudrait que le dernier en date soit facilement accessible ». Ce
 * n'est pas « accessible » : c'est TOUT CE QU'IL Y A. Une liste, même courte,
 * oblige à choisir ; à choisir, on se trompe, et l'élève qui se trompe travaille
 * sagement la mauvaise chose.
 *
 * Les précédentes restent là, derrière un lien discret : un élève doit pouvoir
 * refaire un entraînement. Mais elles ne se disputent jamais l'écran avec le
 * travail à faire.
 *
 * UNE SÉANCE À VENIR N'EST PAS LA SÉANCE DU MOMENT, même si c'est la plus
 * récente : elle n'existe pas encore pour l'élève.
 */
export function seanceDuMoment(seances, classeId, maintenant = Date.now()) {
    const liste = seancesDe(seances, classeId);
    return liste.find(s => etatSeance(s, maintenant) === ETATS.EN_COURS)
        || liste.find(s => etatSeance(s, maintenant) === ETATS.CLOSE)
        || null;
}

/**
 * CE QUI DESCEND À L'ARCHIVE, TOUT SEUL.
 *
 * Une séance close depuis plus de `jours` ne se dispute plus la place. C'est le
 * remède au désordre de LaboMEP, et il tient en une ligne : personne ne range,
 * donc le rangement ne doit rien demander à personne. Rien n'est supprimé —
 * l'archive se rouvre d'un clic.
 */
export function archivees(seances, { jours = 21, maintenant = Date.now() } = {}) {
    const limite = maintenant - jours * 86400000;
    return (seances || []).filter(s => s.closeLe && s.closeLe < limite);
}

export function vivantes(seances, opts = {}) {
    const vieilles = new Set(archivees(seances, opts).map(s => s.id));
    return (seances || []).filter(s => !vieilles.has(s.id));
}

/**
 * LA NOTE COMPTE-T-ELLE CETTE RÉPONSE ?
 *
 * Tout ce qui précède la clôture compte, et rien après. C'est la seule règle,
 * et elle s'applique à un horodatage — donc elle donne le même résultat que la
 * réponse soit arrivée à l'heure ou trois jours plus tard.
 */
export function comptePourLaNote(seance, ts) {
    if (!seance) return false;
    if (seance.ouvreLe && ts < seance.ouvreLe) return false;
    if (seance.closeLe && ts > seance.closeLe) return false;
    return true;
}

/** Ce qu'on dit de l'état d'une séance, en une ligne. */
export function direSeance(seance, maintenant = Date.now()) {
    const etat = etatSeance(seance, maintenant);
    if (etat === ETATS.A_VENIR) {
        const d = new Date(seance.ouvreLe);
        return `S'ouvre le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} `
            + `à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (etat === ETATS.CLOSE) {
        const d = new Date(seance.closeLe);
        return `Close le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} `
            + '— reste ouverte à l\'entraînement';
    }
    return 'En cours';
}
