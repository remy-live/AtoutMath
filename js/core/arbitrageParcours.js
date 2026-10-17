// QUI A RAISON, DU SERVEUR OU DE CETTE MACHINE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « sur mon ordi de boulot et mon ordi personnel, le parcours que j'ai
// modifié sur mon ordi perso n'est pas à jour sur mon ordi de boulot pourtant
// c'est sur mon compte ».
//
// CE N'EST PAS LE MÊME DÉFAUT QUE CELUI D'IL Y A TROIS SEMAINES, et c'est pour
// cela qu'il a survécu. Le premier était « le parcours n'arrive pas sur une
// machine qui ne l'a jamais vu » — corrigé en appelant `ramenerLaBibliotheque`
// au démarrage. Celui-ci est « il arrive une fois, et plus jamais » :
// `ramenerLaBibliotheque` sautait purement et simplement les identifiants
// qu'elle connaissait déjà (`if (connus.has(brut.id)) continue;`).
//
// MESURÉ sur `tools/deuxPostes.mjs` : le parcours passe à trois étapes au
// collège, le serveur les a bien — et le Mac, qui en avait déjà une copie à
// deux étapes, reste à deux. Indéfiniment.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CE SAUT EXISTAIT, ET CE QU'IL PROTÉGEAIT VRAIMENT.
//
// Son commentaire disait : « On n'écrase JAMAIS un parcours local du même
// identifiant : celui qu'on a sous la main peut contenir des retouches qui ne
// sont pas encore parties. En cas de doute, on garde les deux et c'est le
// professeur qui tranche. » La crainte est juste. La phrase, elle, était
// fausse sur deux points : on ne gardait pas les deux, et il n'y avait aucun
// doute à lever — on gardait le local, toujours, sans regarder.
//
// OR LE DOUTE SE LÈVE. Cette machine sait ce qu'elle a échangé en dernier avec
// le serveur : `parcoursServeur.js` garde, par identifiant, l'empreinte de ce
// qui est parti (ou de ce qui est descendu). Trois valeurs suffisent alors :
//
//   · CE QU'ON A ICI,
//   · CE QU'A LE SERVEUR,
//   · CE QU'ON SAVAIT DU SERVEUR la dernière fois.
//
// Si ce qu'on a ici est exactement ce qu'on savait du serveur, alors PERSONNE
// n'a retouché sur cette machine : la différence vient d'ailleurs, et c'est le
// serveur qui a raison. Si ce qu'on a ici en diffère, c'est NOUS qui avons
// retouché sans que ce soit encore parti : on garde, et la montée suivante
// s'en charge.
//
// AUCUNE HORLOGE N'INTERVIENT, et c'est volontaire. Comparer la date du Mac à
// celle du poste du collège, c'est comparer deux montres qu'on n'a jamais
// réglées ensemble — et une machine en retard d'une minute écraserait
// tranquillement le travail de l'autre. On ne compare que des EMPREINTES DE
// CONTENU, qui n'ont pas d'heure.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUE CETTE RÈGLE NE SAIT PAS FAIRE, ET QUI EST ASSUMÉ.
//
// Si les DEUX machines ont retouché le même parcours sans se parler entre
// temps, celle qui monte en dernier gagne, et l'autre retouche est perdue.
// C'est déjà le contrat de ce module — « on monte sans demander », « un
// parcours étant écrasé par sa propre version la plus récente » —, et le
// résoudre demanderait de fabriquer un doublon, c'est-à-dire d'infliger un
// choix à chaque démarrage pour un cas qui demande de travailler hors ligne
// sur deux machines à la fois. On l'écrit ici plutôt que de le découvrir.

import { cheminDeLEntree } from './entreeParcours.js';
import { empreinte } from './empreinteParcours.js';

/**
 * LA FORME QUE LE SERVEUR RANGE — et la seule qu'on ait le droit de comparer.
 *
 * `monterUnParcours` déballe l'enveloppe avant d'envoyer : le serveur reçoit
 * le PARCOURS, avec l'identifiant et le nom de l'enveloppe. Le `folderId` et
 * le `timestamp`, eux, ne partent pas — ce sont des choix de rangement propres
 * à chaque machine.
 *
 * COMPARER DEUX FORMES DIFFÉRENTES REND « DIFFÉRENT » À TOUS LES COUPS, et une
 * règle qui dit toujours « ça a changé » ne décide de rien. On passe donc les
 * deux côtés par cette fonction avant de les comparer, quel que soit l'état
 * dans lequel ils arrivent — elle ne fait rien sur ce qui est déjà déballé.
 */
export function formeEnvoyee(entree) {
    if (!entree || typeof entree !== 'object') return null;
    const dedans = cheminDeLEntree(entree) || entree;
    return { ...dedans, id: entree.id, name: entree.name || dedans.name };
}

/** L'empreinte de ce que le serveur a (ou aurait) pour cette entrée. */
export const sceauDeParcours = (entree) => {
    const forme = formeEnvoyee(entree);
    return forme ? empreinte(forme) : null;
};

/**
 * QUI GAGNE, POUR UN PARCOURS PRÉSENT DES DEUX CÔTÉS.
 *
 * @param {object} o
 * @param {object} o.local    l'entrée de `state.teacherPaths`
 * @param {object} o.serveur  ce que `/teacher/paths` rend pour cet identifiant
 * @param {string} [o.connu]  l'empreinte du dernier échange, si on l'a
 * @returns {'rien'|'serveur'|'local'}
 *   · `rien`    — les deux disent la même chose ;
 *   · `serveur` — il a bougé ailleurs, et rien n'a bougé ici : on le prend ;
 *   · `local`   — une retouche d'ici n'est pas encore partie : on la garde.
 */
export function quiGagne({ local, serveur, connu } = {}) {
    const ici = sceauDeParcours(local);
    const laBas = sceauDeParcours(serveur);
    if (ici === null || laBas === null) return 'rien';
    if (ici === laBas) return 'rien';

    // PAS DE SOUVENIR : ON PREND LE SERVEUR, ET CE N'EST PAS UN PARI.
    //
    // Le souvenir manque dans deux cas, et aucun ne plaide pour le local :
    //
    //   · la machine vient d'être mise à jour vers cette version. Jusqu'ici,
    //     toute retouche locale PARTAIT au démarrage suivant — l'ancienne
    //     empreinte changeait avec le contenu, et la montée suivait. Si les
    //     deux côtés diffèrent aujourd'hui, c'est donc que le serveur a reçu
    //     quelque chose d'AILLEURS. C'est très exactement le cas de Rémy ;
    //   · le stockage du navigateur a été vidé. Alors la bibliothèque locale
    //     l'a été aussi, et il n'y a pas de copie locale à défendre.
    if (connu === undefined || connu === null) return 'serveur';
    return connu === ici ? 'serveur' : 'local';
}

/**
 * CE QU'ON ÉCRIT LOCALEMENT QUAND LE SERVEUR GAGNE.
 *
 * LE DOSSIER ET LA DATE RESTENT CEUX D'ICI, et ce n'est pas un détail : le
 * serveur ne reçoit pas le `folderId` (voir `formeEnvoyee`). Prendre le sien —
 * c'est-à-dire aucun — renverrait à la racine un parcours que le professeur
 * avait rangé dans « Sixièmes » sur ce poste, à chaque démarrage, sans qu'il
 * comprenne pourquoi son classement se défait.
 *
 * @param {object} locale    l'entrée actuelle, pour son rangement
 * @param {object} fraiche   l'entrée reconstruite depuis le serveur
 */
export function fondreDansLeLocal(locale, fraiche) {
    return {
        ...fraiche,
        folderId: (locale && locale.folderId) || fraiche.folderId || 'root',
        timestamp: Date.now()
    };
}
