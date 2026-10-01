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
import { identiteDeParcours } from './shortcodes.js';

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
        // L'IDENTITÉ DU TRAVAIL, PAS CELLE DE L'ATELIER.
        //
        // On écrivait ici `path.id`, l'identifiant que le parcours porte dans
        // la bibliothèque du professeur. L'élève, lui, reçoit un CODE — et le
        // code ne transporte aucun identifiant : il en dérive un de son
        // contenu. Les deux côtés désignaient donc le même travail par deux
        // noms, et le bilan de la séance ne retenait aucun des travaux de la
        // classe. Mesuré : « runs retenus : [] » pour des élèves qui avaient
        // pourtant tout fait.
        //
        // `identiteDeParcours` est LA définition, celle-là même dont le code se
        // sert (core/shortcodes.js). Deux appareils, deux chemins, un seul nom.
        pathId: identiteDeParcours(path),
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
        // RETIRÉE DE L'ÉCRAN DES ÉLÈVES, mais gardée — voir `retirer`.
        retireeLe: null,
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

/**
 * COMPLÉTER UNE SÉANCE EN COURS — ce qu'on peut y ajouter, et ce qu'on refuse.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « si je me rends compte qu'une séance est trop courte ou que les
 * élèves vont trop vite, puis-je la compléter ? »
 *
 * CE QU'ON A MESURÉ AVANT D'ÉCRIRE UNE LIGNE (`tools/seanceQuiChange.mjs`) :
 * il complétait déjà, et cela n'arrivait nulle part.
 *
 *     le professeur donne « Séance du lundi », 2 exercices
 *     Tom ouvre son poste               → 2 étapes
 *     le professeur complète : 3 exercices
 *     Tom recharge                      → 2 étapes   ← et pour toujours
 *     Emma, qui ouvre après             → 3 étapes
 *
 * Deux élèves de la même classe, la même séance, un contenu différent, et
 * rien ne le dit. La séance de l'élève n'était écrite QU'UNE FOIS, sous
 * l'identifiant de son assignation, et jamais relue ensuite.
 *
 * ET L'EN-TÊTE DE CE MODULE DIT POURTANT : « Retoucher un parcours ne doit
 * RIEN changer aux séances déjà données ». Les deux ne se contredisent pas,
 * et c'est tout l'objet de cette fonction : COMPLÉTER N'EST PAS RÉÉCRIRE.
 *
 *   · AJOUTER À LA FIN ne trahit personne. Ce que l'élève a déjà fait reste
 *     à la même place, sous le même numéro d'étape, et son avancement
 *     continue de se rattacher. Le bilan gagne une colonne ; il ne ment pas.
 *   · RETIRER, DÉPLACER OU RERÉGLER une étape déjà donnée, si. Un élève a
 *     travaillé sur ce qu'il avait sous les yeux, et un bilan qui désigne
 *     d'autres exercices que ceux qui ont été faits ne veut plus rien dire.
 *     Pour enlever un exercice à une classe qui bute, il y a la dispense
 *     (`/teacher/override`, mode `retire`), qui ne touche pas au parcours.
 *
 * D'OÙ LA RÈGLE, EN UNE PHRASE : le parcours neuf doit COMMENCER par la
 * séance telle qu'elle a été donnée. S'il en diffère autrement que par des
 * étapes en plus à la fin, on ne touche à rien.
 *
 * UNE SÉANCE CLOSE NE BOUGE JAMAIS, même par une addition : la note est
 * arrêtée, et lui ajouter un exercice ferait baisser tout le monde.
 *
 * @param {object} seance   la séance telle que l'élève l'a
 * @param {object} parcours le parcours tel qu'il est maintenant
 * @param {number} [maintenant]
 * @returns {{etapes: Array, titre: string}|null} les étapes à ajouter, ou
 *          `null` quand on ne complète pas — et le `null` est le cas courant.
 */
export function complementDeSeance(seance, parcours, maintenant = Date.now()) {
    if (!seance || !parcours) return null;
    if (etatSeance(seance, maintenant) === ETATS.CLOSE) return null;
    if (estRetiree(seance)) return null;

    const avant = ((seance.path || {}).steps) || [];
    const apres = (normalizePath(parcours, parcours.name).steps) || [];
    if (apres.length <= avant.length) return null;

    // LE PRÉFIXE DOIT ÊTRE LE MÊME, étape par étape. On compare le CONTENU et
    // non `stepId` : un parcours réenregistré garde ses identifiants, mais un
    // parcours réimporté ou reconstruit en refabrique — et refuser alors un
    // ajout parfaitement légitime serait un défaut invisible, du genre qui se
    // diagnostique « ça ne marche jamais chez moi ».
    for (let i = 0; i < avant.length; i++) {
        if (!memeEtape(avant[i], apres[i])) return null;
    }
    return { etapes: apres.slice(avant.length), titre: parcours.name || seance.titre || '' };
}

/**
 * DEUX ÉTAPES SONT-ELLES LA MÊME ?
 *
 * On met `stepId` de côté (voir ci-dessus) et l'on compare tout le reste —
 * l'exercice, les réglages, le nombre de questions, le quota. Changer le
 * quota d'une étape déjà donnée N'EST PAS un complément : un élève l'a peut-
 * être déjà validée sous l'ancien, et le bilan en compterait deux versions.
 */
function memeEtape(a, b) {
    if (!a || !b) return false;
    if (a.exerciseId !== b.exerciseId) return false;
    const sansId = (s) => {
        const { stepId, ...reste } = s;
        // Les clés triées : deux objets identiques écrits dans un ordre
        // différent — ce qui arrive après un aller-retour JSON — ne doivent
        // pas passer pour deux étapes distinctes.
        return JSON.stringify(reste, Object.keys(reste).sort());
    };
    return sansId(a) === sansId(b);
}

/**
 * LA SÉANCE COMPLÉTÉE, sans toucher à son identité.
 *
 * `pathId` NE CHANGE PAS, et c'est la ligne qui fait tout tenir. L'avancement
 * de l'élève est retenu par `pathId` et par des numéros d'étape de la forme
 * `${pathId}_s${i}` (voir `state.setStudentPath` et `computeAssignedPath`).
 * Recalculer l'identité sur le nouveau contenu rendrait orphelin tout ce que
 * l'élève a déjà fait : il repartirait de zéro sur la carte, son travail
 * resté au journal sous un nom que plus personne ne lit. Les étapes ajoutées
 * arrivent à la fin, donc les numéros 0 à n−1 ne bougent pas.
 */
export function completerSeance(seance, etapes) {
    if (!seance || !etapes || !etapes.length) return seance;
    const path = { ...(seance.path || {}) };
    path.steps = [...(path.steps || []), ...etapes];
    return {
        ...seance,
        path,
        // L'HEURE DU COMPLÉMENT, pour que l'écran de l'élève puisse dire
        // « ton professeur vient d'ajouter 2 exercices » plutôt que de les
        // faire apparaître en silence au milieu de l'heure.
        completeeLe: Date.now(),
        complementN: ((seance.complementN || 0) + etapes.length)
    };
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
    return (seances || []).filter(s => !vieilles.has(s.id) && !estRetiree(s));
}

/**
 * RETIRER UNE SÉANCE — ce qui remplace la suppression.
 *
 * Le panneau du parcours met une CASE À COCHER devant chaque classe : cocher
 * donne, décocher retire. C'est le bon geste, et c'est aussi un geste qu'on
 * fait par mégarde — une case, ça se décoche d'un clic de trop.
 *
 * ON NE SUPPRIME DONC JAMAIS UNE SÉANCE OÙ QUELQU'UN A TRAVAILLÉ. Vingt-six
 * élèves ont passé une heure dessus ; leur bilan ne doit pas dépendre de la
 * précision d'un clic. La séance retirée disparaît de l'écran des élèves —
 * c'est ce qu'on voulait — mais son bilan reste consultable, et `remettre` la
 * rend en un clic. Une séance que PERSONNE n'a ouverte, elle, se supprime pour
 * de bon : il n'y a rien à protéger, et la garder encombrerait pour rien.
 */
export function retirer(seance, quand = Date.now()) {
    return seance ? { ...seance, retireeLe: quand } : seance;
}

/** Remettre une séance retirée sous les yeux des élèves. */
export function remettre(seance) {
    return seance ? { ...seance, retireeLe: null } : seance;
}

export const estRetiree = (s) => !!(s && s.retireeLe);

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
