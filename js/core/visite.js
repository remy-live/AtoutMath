// LA VISITE GUIDÉE — ce qu'elle sème pour avoir quelque chose à montrer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY a tranché, devant la maquette : « Ça ouvre le VRAI écran ». La visite
// ne montre donc pas des images du logiciel, elle l'ouvre — l'atelier, la
// fiche, le code, l'écran de l'élève, le tableau de la classe, la préparation
// d'une tablette.
//
// OR UN VRAI ÉCRAN VIDE NE MONTRE RIEN. L'atelier d'un visiteur n'a aucun
// parcours, son écran d'élève n'a aucune étape, son tableau de classe n'a
// aucun élève. On ouvrirait six écrans gris pour dire « voilà ce que ça fait »,
// ce qui est exactement l'inverse d'une démonstration. Il faut donc semer — et
// c'est tout l'objet de ce fichier.
//
// ── CE QUE LA VISITE N'INVENTE PAS ──────────────────────────────────────────
//
// Les classes, les élèves et leurs journaux existaient déjà : `demoClasses.js`
// les fabrique depuis que Rémy a demandé « des classes fictives avec des élèves
// fictifs (5 classes) ». On les reprend telles quelles, et c'est volontaire :
// deux jeux de démonstration qui dérivent l'un de l'autre, c'est une correction
// faite d'un côté qui manque de l'autre, et personne ne s'en aperçoit avant de
// montrer le logiciel à quelqu'un.
//
// CE QUI EST ÉCRIT ICI, C'EST CE QUI MANQUAIT : la séance d'une heure qu'un
// professeur aurait préparée, et le journal de CET appareil — celui qui remplit
// l'écran de l'élève et « Mes progrès ».
//
// ── ET RIEN DE TOUT CELA NE TOUCHE AUX VRAIES DONNÉES ───────────────────────
//
// La visite s'ouvre sur `?visite=1`, et `index.html` remplace alors
// `localStorage` par un tiroir préfixé, et `IndexedDB` par une base à elle —
// le même mécanisme, déjà éprouvé, que le poste élève. Tout ce qui est semé
// ici vit dans ce tiroir, et la sortie le vide. Sans cela, un visiteur
// déposerait un parcours de démonstration dans la bibliothèque du professeur,
// et des réussites qu'aucun élève n'a obtenues dans son carnet.

import { EventTypes } from './journal.js';
import { makePath, makeStep } from './path.js';
import { defaultPolicy } from './policy.js';

/**
 * LA SÉANCE QUE LA VISITE MONTRE — une heure de cours, dans l'ordre.
 *
 * CE QUI A GUIDÉ LE CHOIX, et ce n'est pas « les plus beaux » :
 *
 *   · ELLE RESSEMBLE À UNE VRAIE HEURE. Un échauffement de calcul mental, deux
 *     notions au programme, un jeu pour finir. Un parcours de démonstration
 *     fait de six exercices sans lien ne montre pas comment on travaille ; il
 *     montre qu'on sait empiler.
 *   · TROIS DE SES QUATRE ÉTAPES S'IMPRIMENT. L'étape suivante de la visite est
 *     la fiche : si la séance ne s'imprimait pas, il n'y aurait rien à ouvrir.
 *   · ET ELLE TIENT EN QUATORZE QUESTIONS. Un visiteur qui veut l'essayer doit
 *     pouvoir aller au bout ; une séance de quarante questions se referme.
 */
export const ETAPES_DE_LA_SEANCE = [
    { exerciseId: 'calc-add', nbItems: 5 },
    { exerciseId: 'frac-lire', nbItems: 4 },
    { exerciseId: 'geo-angles-manquants', nbItems: 4 },
    { exerciseId: 'logi-pentaminos', nbItems: 1 }
];

/** Le nom lu partout : sur la carte du parcours, sur la fiche, dans le code. */
export const NOM_DE_LA_SEANCE = 'Séance du jeudi — fractions et angles';

/**
 * LE PARCOURS DE LA VISITE, tel que l'atelier le recevra.
 *
 * ── IL EST RÉGLÉ D'USINE, ET C'EST UNE CONTRAINTE, PAS UN GOÛT ────────────
 *
 * Le premier jet le posait en mode APPRENTISSAGE, avec des seuils de réussite
 * choisis : c'est ce qu'un professeur prépare le plus souvent. MESURÉ à
 * l'étape 3 de la visite — celle du code dicté —, l'écran répondait « PAS DE
 * CODE À DICTER : ce parcours ne tient pas en quelques lettres », juste
 * au-dessous d'une bande qui promettait « des lettres à dire à voix haute ».
 * La démonstration se contredisait elle-même.
 *
 * `raisonsDuCodeLong` dit pourquoi, et c'est juste : une chaîne de quelques
 * lettres ne sait pas transporter des réglages qui ne sont pas ceux d'usine.
 * Réglé d'usine et avec ses nombres de questions, le même parcours donne
 * `ATK-5-LFX-4-VMU-4-NSW-1` — un code qu'on dicte vraiment.
 *
 * LE NOMBRE DE QUESTIONS RESTE, LUI : il voyage dans le code court, et c'est
 * ce que l'étape 1 montre qu'on règle.
 */
export function parcoursDeLaVisite() {
    const steps = ETAPES_DE_LA_SEANCE.map((e, i) => ({
        ...makeStep(e.exerciseId, {}, { nbItems: e.nbItems }),
        // UN IDENTIFIANT STABLE, et ce n'est pas de la coquetterie : le fil de
        // la séance retient l'étape où l'on en est par son `stepId`. Tiré au
        // hasard, il changerait à chaque ouverture de la visite, et l'avancement
        // semé plus bas ne désignerait plus rien.
        stepId: `visite_s${i}`
    }));
    const p = makePath(NOM_DE_LA_SEANCE, steps, defaultPolicy());
    p.id = 'path_visite';
    return p;
}

/**
 * LE JOURNAL DE L'APPAREIL — de quoi que « Mes progrès » ait quelque chose à
 * dire, et que l'écran de l'élève ne soit pas tout gris.
 *
 * ON N'ÉCRIT PAS DES BILANS, ON ÉCRIT DES TENTATIVES. Tout le reste — la
 * maîtrise, le carnet d'erreurs, les phrases de conseil — est recalculé par le
 * code ordinaire à partir d'elles. C'est la règle de `demoClasses.js`, et elle
 * vaut ici pour la même raison : si une phrase de bilan est mal tournée dans la
 * visite, elle l'est aussi devant une vraie classe, et l'on veut le voir.
 *
 * LES COMPÉTENCES SONT VRAIES, prises au catalogue. Une compétence inventée
 * n'apparaîtrait sous aucun libellé, et le bilan afficherait une ligne sans
 * nom — ce qui ressemble à un défaut, parce que c'en est un.
 *
 * TROIS NIVEAUX DIFFÉRENTS, EXPRÈS : une notion tenue, une notion fragile, une
 * notion ratée. Un bilan où tout est vert ne montre pas à quoi sert un bilan.
 */
export const TRAVAIL_DE_LA_VISITE = [
    {
        skillId: 'num.add.entiers', reussies: 9, ratees: 1,
        question: '48 + 27', donne: '65', attendu: '75',
        meprise: 'La retenue a été oubliée.',
        exerciceId: 'calc-add', exerciceTitre: 'Additions Mystères'
    },
    {
        skillId: 'num.frac.sens', reussies: 5, ratees: 4,
        question: 'Quelle fraction est coloriée ?', donne: '3/4', attendu: '3/8',
        meprise: 'Les parts non coloriées ont été comptées au dénominateur.',
        exerciceId: 'frac-lire', exerciceTitre: 'Lis la Fraction'
    },
    {
        skillId: 'geo.angles.relations', reussies: 2, ratees: 6,
        question: 'Combien mesure l\'angle vert ?', donne: '58°', attendu: '122°',
        meprise: 'Les angles supplémentaires ont été lus comme égaux.',
        exerciceId: 'geo-angles-manquants', exerciceTitre: 'La Valeur Manquante'
    }
];

/**
 * LES TENTATIVES À ÉCRIRE — DES ÉVÉNEMENTS DE JOURNAL, PAS DES APPELS.
 *
 * ON NE PASSE PAS PAR `recordAttempt`, ET C'EST LA DATE QUI L'INTERDIT. Cette
 * méthode-là horodate à l'instant où on l'appelle : les trente-sept tentatives
 * tomberaient toutes dans la même seconde, et l'écran qui annonce « par
 * compétence et DANS LE TEMPS » montrerait un point. `merge` accepte des
 * événements déjà datés — c'est par là que passent aussi les journaux des
 * élèves de démonstration, pour exactement la même raison.
 *
 * `synced` EST POSÉ PAR `merge` : rien de ce que la visite écrit ne cherchera
 * jamais à partir vers un serveur. C'était la condition pour oser semer un
 * journal sans compte.
 *
 * `maintenant` est passé plutôt que lu : une épreuve doit pouvoir fixer
 * l'heure, et deux appels du même instant doivent donner le même journal.
 */
export function tentativesDeLaVisite(maintenant = Date.now()) {
    const JOUR = 86400000;
    const evts = [];
    let n = 0;
    const poser = (ts, payload) => {
        // L'IDENTIFIANT EST DÉRIVÉ, PAS TIRÉ : `merge` écarte ce qu'il connaît
        // déjà, et c'est ce qui rend la semence rejouable. Une visite rouverte
        // deux fois dans le même tiroir ne doublerait pas son journal.
        evts.push({ id: `visite_${n++}`, type: EventTypes.ATTEMPT, ts, payload });
    };
    TRAVAIL_DE_LA_VISITE.forEach((t, rang) => {
        const base = maintenant - (TRAVAIL_DE_LA_VISITE.length - rang) * JOUR;
        const commun = {
            runId: null, stepId: null,
            exerciseId: t.exerciceId, exerciseTitle: t.exerciceTitre,
            generatorId: null, activityId: null, skillId: t.skillId,
            questionText: t.question, attemptIndex: 0, hintsUsed: 0, partiel: false
        };
        for (let i = 0; i < t.reussies; i++) {
            poser(base + i * 90000, {
                ...commun, itemSeed: `visite_${rang}_ok_${i}`,
                given: t.attendu, expected: t.attendu, correct: true,
                msElapsed: 7000 + i * 300, misconception: null, explanation: '', points: 10
            });
        }
        for (let i = 0; i < t.ratees; i++) {
            poser(base + (t.reussies + i) * 90000, {
                ...commun, itemSeed: `visite_${rang}_ko_${i}`,
                given: t.donne, expected: t.attendu, correct: false,
                msElapsed: 12000 + i * 400, misconception: t.meprise,
                explanation: '', points: 0
            });
        }
    });
    return evts;
}
