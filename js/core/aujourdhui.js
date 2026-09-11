// L'ÉCRAN D'ARRIVÉE DE L'ÉLÈVE : UNE SEULE CHOSE À FAIRE.
//
// Rémy : « l'écran d'accueil d'AtoutMath […] pour pas faire peur avec tout ce
// qu'on peut y lire, que ce soit simple. Par exemple Duolingo est rassurant. »
//
// CE QUI RASSURE CHEZ DUOLINGO N'EST PAS LE DESSIN, C'EST L'ABSENCE DE CHOIX.
// On ouvre, il y a un bouton, on appuie. Notre accueil demandait neuf décisions
// avant la première question : bascule « Clic / Arbre », menu « Tous les
// niveaux », champ de recherche, onglets « Domaines / Chapitres », deux rangées
// de filtres, puis soixante cartes blanches identiques — et par-dessus, une
// modale à congédier. Rien de tout cela n'est inutile ; tout cela est
// prématuré.
//
// CE MODULE NE DÉCIDE QUE D'UNE CHOSE : la SEULE action qu'on propose. Trois
// cas, dans cet ordre, et l'ordre est un choix pédagogique :
//
//   1. LE PARCOURS DU PROFESSEUR. S'il y en a un et qu'il n'est pas fini, c'est
//      lui — le travail demandé passe avant tout le reste, y compris avant les
//      erreurs à revoir. C'est le professeur qui décide de la séance.
//   2. LES ERREURS À REVOIR. Deux au moins : une seule ne fait pas une
//      révision, et proposer « revoir 1 question » à chaque connexion
//      transforme un carnet en reproche.
//   3. DÉCOUVRIR. Sinon on propose un exercice, et un seul. « Choisis » n'est
//      pas une consigne quand il y a soixante possibilités.
//
// LE RESTE NE DISPARAÎT PAS, IL PASSE DERRIÈRE. Le catalogue, le carnet et la
// carte du parcours deviennent trois raccourcis nommés, avec leur compte : on
// y va parce qu'on l'a décidé, pas parce qu'on est tombé dessus.
//
// Module pur : ni DOM, ni horloge propre, ni journal. On lui passe des faits.

import { conseilDuJour } from './accueil.js';

/** Après cette heure, on ne dit plus « Bonjour ». */
const SOIR = 18;

/** Au-delà, ce n'est plus une révision, c'est une punition. */
export const MAX_REVISION = 10;

/** En dessous, une erreur isolée ne fait pas une séance de révision. */
export const MIN_REVISION = 2;

/** Ce qu'on compte comme « ces jours-ci » pour raconter la dernière séance. */
export const FENETRE_RECENTE = 3 * 86400000;

export function salutation(maintenant) {
    const h = new Date(maintenant).getHours();
    return h >= SOIR ? 'Bonsoir !' : 'Bonjour !';
}

/**
 * L'ÉTAT D'UN PARCOURS ASSIGNÉ, vu de l'accueil.
 *
 * On ne compte QUE le travail : un jeu de récompense n'est pas une étape à
 * faire, c'est ce qu'on gagne. Compter les deux ensemble annoncerait « 2 sur
 * 4 » à un élève qui a fini les deux exercices du devoir — et lui ferait
 * croire qu'il lui reste la moitié du chemin.
 */
export function etatParcours(parcours) {
    if (!parcours || !Array.isArray(parcours.steps) || !parcours.steps.length) return null;
    const faits = new Set(parcours.completed || []);
    const travail = parcours.steps.filter(s => !s.bonus);
    if (!travail.length) return null;
    const restants = travail.filter(s => !faits.has(s.stepId));
    return {
        nom: parcours.name || 'Parcours du professeur',
        total: travail.length,
        faites: travail.length - restants.length,
        fini: restants.length === 0,
        prochain: restants[0] || null
    };
}

/** Les erreurs encore ouvertes, dans l'ordre où on les revisitera. */
export function erreursOuvertes(erreurs) {
    return (erreurs || []).filter(e => e && !e.corrected);
}

/**
 * CE QU'ON A FAIT CES DERNIERS JOURS, en une phrase.
 *
 * On raconte la dernière séance, pas la moyenne générale : « 18 bonnes
 * réponses sur 22 » se reconnaît, « 74 % de réussite » est un bulletin.
 */
export function bilanRecent(tentatives, maintenant) {
    const recentes = (tentatives || []).filter(t => t && t.ts > maintenant - FENETRE_RECENTE);
    if (recentes.length < 5) return null;
    const justes = recentes.filter(t => t.correct).length;
    return { total: recentes.length, justes };
}

/**
 * LA PHRASE SOUS LA SALUTATION. Une, jamais deux.
 *
 * Elle dit d'abord ce que l'élève a fait — c'est de lui qu'on parle —, et à
 * défaut le conseil du jour. Le premier jour, elle explique le seul geste qu'il
 * faut connaître, parce qu'il n'y a encore rien à raconter.
 */
export function phraseDuJour({ maintenant, premiere, tentatives }) {
    if (premiere) {
        return 'Le robot peut faire un exercice devant toi avant que tu essaies, '
            + 'et le bouton d\'indice t\'aide sans jamais donner la réponse.';
    }
    const bilan = bilanRecent(tentatives, maintenant);
    if (bilan) {
        return `Ces derniers jours : ${bilan.justes} bonne${bilan.justes > 1 ? 's' : ''} `
            + `réponse${bilan.justes > 1 ? 's' : ''} sur ${bilan.total}.`;
    }
    return conseilDuJour(maintenant);
}

/**
 * LA SEULE ACTION PROPOSÉE.
 *
 * `null` n'arrive que si l'on n'a strictement rien à offrir — ni parcours, ni
 * erreurs, ni le moindre exercice au catalogue. Dans tous les autres cas il y a
 * un bouton, et c'est le point : un écran d'accueil sans action est un écran
 * qui renvoie l'élève à son propre choix.
 */
export function actionDuJour({ parcours, erreurs, suggestions = [], seance = null }) {
    // LA SÉANCE DU PROFESSEUR PASSE AVANT TOUT LE RESTE, et ce n'est pas
    // discutable. Un élève qui arrive le mardi matin a UNE chose à faire :
    // celle qu'on lui a donnée. Lui proposer d'abord une révision de son carnet
    // ou une découverte du catalogue, c'est le laisser travailler sagement la
    // mauvaise chose — et le professeur découvrira le lendemain que la moitié
    // de la classe a fait autre chose.
    //
    // ELLE DISPARAÎT QUAND ELLE EST FINIE : la carte est une CHOSE À FAIRE, et
    // un travail terminé n'en est plus une. Elle redescend alors dans les
    // raccourcis, où l'on peut la refaire.
    if (seance && !seance.fini) {
        return {
            genre: 'seance',
            titre: seance.commence ? 'Reprends ta séance' : 'Ta séance du jour',
            sous: seance.classeNom ? `${seance.titre} · ${seance.classeNom}` : seance.titre,
            bouton: seance.commence ? 'Continuer' : 'Commencer',
            faites: seance.faites, total: seance.total,
            // LE MOT DU PROFESSEUR VOYAGE AVEC LA CARTE. Rémy voulait pouvoir
            // écrire un mot à un élève pendant la séance ; le lui montrer
            // ailleurs qu'à l'endroit où il clique, c'est le lui cacher.
            mot: seance.mot || ''
        };
    }

    const p = etatParcours(parcours);
    if (p && !p.fini) {
        return {
            genre: 'parcours',
            titre: p.faites ? 'Continue ton parcours' : 'Commence ton parcours',
            sous: p.prochain && p.prochain.titre
                ? `${p.nom} · ${p.prochain.titre}`
                : p.nom,
            bouton: p.faites ? 'Continuer' : 'Commencer',
            faites: p.faites, total: p.total
        };
    }

    const ouvertes = erreursOuvertes(erreurs);
    if (ouvertes.length >= MIN_REVISION) {
        const combien = Math.min(MAX_REVISION, ouvertes.length);
        return {
            genre: 'revision',
            titre: 'On reprend deux ou trois choses ?',
            sous: `${ouvertes.length} question${ouvertes.length > 1 ? 's' : ''} `
                + 'de ton carnet t\'ont résisté.',
            bouton: `Réviser ${combien} question${combien > 1 ? 's' : ''}`,
            questions: combien
        };
    }

    const exo = suggestions[0];
    if (!exo) return null;
    return {
        genre: 'decouverte',
        // LE PARCOURS FINI SE DIT, sinon l'élève qui vient de terminer son
        // devoir voit le même écran que celui qui n'en a jamais eu.
        titre: p && p.fini ? 'Parcours terminé — on continue ?' : 'On commence ?',
        sous: exo.title || '',
        bouton: 'C\'est parti',
        exoId: exo.id
    };
}

/** Ce qu'une carte d'action rend inutile juste en dessous d'elle. */
// La séance EST le parcours chargé : sa carte et la tuile « Mon parcours »
// diraient le même chiffre, pour le même travail, deux fois.
const TUILE_DE_LA_CARTE = { parcours: 'parcours', revision: 'erreurs', seance: 'parcours' };

/**
 * LES TROIS RACCOURCIS, avec leur compte.
 *
 * Un raccourci sans chiffre est une porte fermée : « Mes erreurs » ne donne pas
 * envie, « Mes erreurs · 3 à revoir » si. Celui qui n'a rien derrière lui n'est
 * pas rendu — un carnet vide ne mérite pas une tuile.
 *
 * UNE TUILE NE RÉPÈTE JAMAIS LA CARTE POSÉE AU-DESSUS D'ELLE. Rémy : « est-ce
 * que les étoiles, la notification une erreur à revoir et le profil font
 * doublons ? » Les étoiles et le profil, non — l'un est le chiffre, l'autre la
 * page qui l'explique. Mais nous avions bel et bien mis deux fois la même
 * chose : quand la carte propose « On reprend deux ou trois choses ? · 3
 * questions de ton carnet t'ont résisté », la tuile « Mes erreurs · 3 à
 * revoir » collée dessous dit le même chiffre, pour le même endroit, en plus
 * petit. Idem pour le parcours, dont l'anneau de la carte affiche déjà
 * « 2/4 ». Le raccourci existe pour ce qu'on ne propose PAS ; ce qu'on propose
 * a déjà son bouton.
 */
export function raccourcisDuJour({
    parcours, erreurs, nbExercices = 0, action = null, seance = null
}) {
    const out = [];
    const dejaDit = action ? TUILE_DE_LA_CARTE[action.genre] : null;
    // LA SÉANCE FINIE GARDE SA TUILE. C'est la seule façon de la refaire — et
    // c'est aussi ce qui dit à l'élève, d'un coup d'œil, qu'il a fini le
    // travail donné. « Mon parcours · 2 sur 4 » ne le disait pas : on ne savait
    // pas de quel parcours il s'agissait.
    if (seance && dejaDit !== 'parcours') {
        out.push({
            id: 'seance', icone: '📗', titre: 'Ma séance',
            sous: seance.fini ? 'Terminée — bravo' : `${seance.faites} sur ${seance.total}`
        });
    }
    const p = etatParcours(parcours);
    if (p && dejaDit !== 'parcours' && !seance) {
        out.push({
            id: 'parcours', icone: '🗺️', titre: 'Mon parcours',
            sous: p.fini ? 'Terminé — bravo' : `${p.faites} sur ${p.total}`
        });
    }
    const ouvertes = erreursOuvertes(erreurs);
    if (ouvertes.length && dejaDit !== 'erreurs') {
        out.push({
            id: 'erreurs', icone: '📓', titre: 'Mes erreurs',
            sous: `${ouvertes.length} à revoir`
        });
    }
    // LA TUILE « EXPLORER » NE SERT QUE SI ELLE A DE LA COMPAGNIE. Seule, elle
    // double mot pour mot le bouton « Explorer tous les exercices » posé juste
    // dessous : deux portes côte à côte vers la même pièce, c'est une de trop.
    if (out.length) {
        out.push({
            id: 'catalogue', icone: '🧭', titre: 'Explorer',
            sous: nbExercices ? `${nbExercices} exercices` : 'Tout le catalogue'
        });
    }
    return out;
}

/** L'écran entier, décidé d'un coup. */
export function planDuJour(faits) {
    const {
        maintenant = Date.now(), premiere = false, parcours = null,
        erreurs = [], tentatives = [], suggestions = [], nbExercices = 0,
        seance = null
    } = faits || {};
    const action = actionDuJour({ parcours, erreurs, suggestions, seance });
    return {
        salut: premiere ? 'Bienvenue !' : salutation(maintenant),
        phrase: phraseDuJour({ maintenant, premiere, tentatives }),
        action,
        raccourcis: raccourcisDuJour({ parcours, erreurs, nbExercices, action, seance })
    };
}
