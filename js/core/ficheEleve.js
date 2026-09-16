// LA FICHE D'UN ÉLÈVE, PENDANT L'HEURE — pas son bilan.
//
// Rémy : « dans le direct, il faut aussi pouvoir cliquer sur l'élève, voir où
// il en est, rendre facultatif un exercice. En fait s'il bloque il risque de
// passer trop de temps. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE N'EST PAS LE BILAN, ET C'EST TOUTE LA DIFFÉRENCE. Le bilan répond à
// « qu'est-ce que je reprends lundi » ; il se lit assis, au calme, sur des
// semaines. Cette fiche-ci répond à « qu'est-ce que je fais pour lui, là,
// maintenant » — debout, entre deux rangs, en dix secondes. Tout ce qui ne sert
// pas cette décision-là encombre.
//
// TROIS CHOSES, DONC, ET DANS CET ORDRE :
//
//   · OÙ IL EN EST — l'étape, sur combien, et laquelle. C'est ce qu'on regarde
//     en premier parce que c'est ce dont on parle en arrivant près de lui.
//   · CE QU'IL A FAIT — les étapes déjà passées, réussies ou non. Une étape
//     ratée qu'on croit réussie fait dire « continue » à un élève qui devrait
//     revenir en arrière.
//   · DEPUIS COMBIEN DE TEMPS IL N'A RIEN VALIDÉ. C'est le seul chiffre qui
//     distingue celui qui avance lentement de celui qui est planté — et c'est
//     exactement la question de Rémy : « il risque de passer trop de temps ».
//
// ET UN GESTE QUI N'EXISTAIT PAS AU BON GRAIN. Le serveur sait depuis toujours
// dispenser UN élève d'UN exercice (`overrides.student_id`) ; l'écran ne
// l'offrait que pour la classe entière. Dispenser trente élèves parce qu'un
// seul coince, c'est retirer la question à vingt-neuf. La fiche est l'endroit
// où le bon grain devient évident : on y est déjà, on a cliqué sur LUI.

import { vigilanceDe } from './vigilance.js';
import { depuisCombien } from './avancement.js';

/**
 * L'ÉTAT D'UNE ÉTAPE, VU DE LA FICHE.
 *
 * `detailEtapes` du noyau d'avancement dit, pour chaque étape CLOSE, si elle a
 * été réussie. Les suivantes n'ont pas encore d'histoire — mais il faut les
 * montrer quand même : « étape 3 sur 5 » ne veut rien dire si l'on ne voit pas
 * les cinq cases.
 */
export const ETATS = {
    REUSSIE: 'reussie',
    RATEE: 'ratee',
    EN_COURS: 'en-cours',
    A_VENIR: 'a-venir'
};

/**
 * CE QUE MONTRE LA FICHE, À PARTIR D'UNE LIGNE DU DIRECT.
 *
 * On ne demande rien de plus au serveur : `/teacher/live` envoie déjà
 * l'avancement projeté de chaque élève. Une route de plus pour la même
 * information serait une seconde vérité à tenir d'accord avec la première.
 *
 * @param {object} eleve      une ligne de `vue.direct.eleves`
 * @param {number} maintenant l'heure du serveur, en SECONDES
 * @param {object} [opts]     { enPause } — une classe en pause ne « bloque » pas
 */
export function ficheDeLEleve(eleve, maintenant, opts = {}) {
    const e = eleve || {};
    const av = e.avancement || null;
    const v = vigilanceDe(e, maintenant, opts);

    return {
        id: e.id || null,
        prenom: e.prenom || '',
        ecarte: !!e.ecarte,
        // L'EXERCICE SUR LEQUEL IL EST, parce que c'est celui qu'on va
        // éventuellement lui laisser tomber. Sans lui, le bouton n'a pas d'objet.
        exercice: e.exo || null,
        parcours: (av && av.pathName) || e.parcours || '',
        ou: ouEnEstIl(av),
        etapes: lesEtapes(av),
        question: laQuestion(av),
        silence: v.silence,
        silenceDit: v.silence >= 60 ? depuisCombien(v.silence) : '',
        etat: v.etat,
        // TROP LONGTEMPS SUR LA MÊME CHOSE : la question de Rémy, en un booléen.
        //
        // ON LIT L'ÉTAT DE LA VIGILANCE, PAS LE SILENCE BRUT — et c'est un essai
        // qui l'a imposé. Comparer les secondes au seuil moi-même ignorait tout
        // ce que `vigilanceDe` sait déjà : qu'une classe en pause ne bloque
        // personne (le professeur parle au tableau, c'est le but), qu'un élève
        // parti n'est pas planté, qu'un élève qui a fini n'a plus rien à valider.
        // Un second calcul du même jugement finit toujours par le rendre
        // autrement.
        trop: v.etat === 'bloque',
        fini: !!(av && av.etat === 'fini'),
        commence: !!av
    };
}

/** « Étape 3 sur 5 — Le Serpent Littéral », ou ce qu'on peut en dire. */
function ouEnEstIl(av) {
    if (!av) return 'Pas commencé';
    if (av.etat === 'fini') return 'A terminé';
    if (av.etat === 'abandonne') return 'A quitté en cours de route';
    const ec = av.etapeEnCours;
    if (!ec) return `${av.faites} étape${av.faites > 1 ? 's' : ''} sur ${av.etapes}`;
    // `rang` compte les étapes CLOSES : la courante est donc la suivante.
    const rang = (Number(ec.rang) || 0) + 1;
    const titre = ec.titre ? ` — ${ec.titre}` : '';
    return `Étape ${rang} sur ${av.etapes}${titre}`;
}

/**
 * LES ÉTAPES, UNE PAR UNE, AVEC LEUR SORT.
 *
 * UNE ÉTAPE RATÉE NE SE DISTINGUE PAS D'UNE RÉUSSIE SUR UNE BARRE, et c'est
 * précisément ce qu'il faut voir : dire « continue » à un élève qui vient de
 * rater l'étape d'avant, c'est l'enfoncer.
 */
function lesEtapes(av) {
    if (!av || !av.etapes) return [];
    const detail = Array.isArray(av.detailEtapes) ? av.detailEtapes : [];
    const enCours = av.etapeEnCours ? (Number(av.etapeEnCours.rang) || 0) : -1;
    return Array.from({ length: av.etapes }, (_, i) => {
        if (i < detail.length) {
            return { rang: i + 1, etat: detail[i] ? ETATS.REUSSIE : ETATS.RATEE };
        }
        if (i === enCours) {
            return { rang: i + 1, etat: ETATS.EN_COURS,
                titre: (av.etapeEnCours && av.etapeEnCours.titre) || '' };
        }
        return { rang: i + 1, etat: ETATS.A_VENIR };
    });
}

/** « 4e question sur 8 · 3 justes » — ce qu'il est en train de faire. */
function laQuestion(av) {
    const ec = av && av.etapeEnCours;
    if (!ec) return '';
    const posees = Number(ec.posees) || 0;
    const prevues = Number(ec.prevues) || 0;
    const justes = Number(ec.justes) || 0;
    if (!posees && !prevues) return '';
    const combien = prevues ? `${posees} question${posees > 1 ? 's' : ''} sur ${prevues}`
        : `${posees} question${posees > 1 ? 's' : ''}`;
    return `${combien} · ${justes} juste${justes > 1 ? 's' : ''}`;
}

/**
 * CE QU'ON PEUT FAIRE POUR LUI, ET CE QU'ON NE PEUT PAS.
 *
 * ON NE PROPOSE PAS UN GESTE QUI N'AURAIT PAS D'OBJET. « Laisse tomber cet
 * exercice » sans exercice en cours ne dispense de rien ; « lui souffler un
 * coup de pouce » à quelqu'un qui n'a pas commencé souffle dans le vide. Un
 * bouton grisé fait au moins savoir que le geste existe ; un bouton qui ne fait
 * rien fait douter de tout l'écran.
 */
export function gestesPossibles(fiche) {
    const f = fiche || {};
    return {
        mot: !!f.id,
        indice: !!f.id && !!f.exercice,
        debloquer: !!f.id && !!f.exercice,
        // ROUVRIR L'ACCÈS D'UN ÉLÈVE MIS DE CÔTÉ se fait depuis sa fiche aussi :
        // c'est là qu'on se pose la question, en le voyant à l'arrêt.
        rouvrir: !!f.id && f.ecarte
    };
}

/**
 * POURQUOI ON PROPOSERAIT DE LE DISPENSER — en une phrase, ou rien.
 *
 * Le bouton existe toujours ; la phrase n'apparaît que quand la situation la
 * justifie. C'est la différence entre un outil et un conseil : Rémy décide, on
 * ne décide pas pour lui, mais on lui dit ce qu'on a vu.
 */
export function pourquoiDebloquer(fiche) {
    const f = fiche || {};
    if (!f.exercice || !f.trop) return '';
    return `Bloqué depuis ${f.silenceDit} sur le même exercice.`;
}
